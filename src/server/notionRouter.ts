import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export interface NotionRouterOptions {
  verifyFirebaseIdToken: (idToken: string) => Promise<{ uid: string; email?: string }>;
  fetchUserInteractions?: (idToken: string, uid: string) => Promise<any[]>;
}

interface EncryptedPayload {
  iv: string;
  tag: string;
  ciphertext: string;
}

interface StoredNotionConnection {
  userId: string;
  encryptedAccessToken: EncryptedPayload;
  workspaceName: string;
  workspaceIcon?: string;
  botId?: string;
  destinationPageId?: string;
  destinationPageTitle?: string;
  connectedAt: string;
  updatedAt: string;
}

interface StoredExportRecord {
  id: string;
  userId: string;
  reflectionId: string;
  notionPageId: string;
  notionPageUrl: string;
  destinationPageId?: string;
  destinationPageTitle?: string;
  exportedAt: string;
}

// 1. Configuration variables
const NOTION_API_VERSION = '2022-06-28';
const NOTION_CLIENT_ID = process.env.NOTION_CLIENT_ID || '';
const NOTION_CLIENT_SECRET = process.env.NOTION_CLIENT_SECRET || '';
const NOTION_REDIRECT_URI =
  process.env.NOTION_REDIRECT_URI || 'https://mindledger.ai.studio/api/integrations/notion/callback';

// 2. Encryption Key Derivation (AES-256-GCM)
function getEncryptionKey(): Buffer {
  const secret = process.env.NOTION_ENCRYPTION_KEY;
  if (secret) {
    // If it's a 32-byte base64 string, decode directly; otherwise SHA-256 hash it
    try {
      const buf = Buffer.from(secret, 'base64');
      if (buf.length === 32) return buf;
    } catch {}
    return crypto.createHash('sha256').update(secret).digest();
  }
  const fallback =
    process.env.NOTION_CLIENT_SECRET ||
    process.env.GEMINI_API_KEY ||
    'mindledger-secure-notion-encryption-key-256';
  return crypto.createHash('sha256').update(fallback).digest();
}

function encryptToken(plainText: string): EncryptedPayload {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');
  return {
    iv: iv.toString('hex'),
    tag,
    ciphertext: encrypted,
  };
}

function decryptToken(payload: EncryptedPayload): string {
  if (!payload || !payload.iv || !payload.tag || !payload.ciphertext) {
    throw new Error('Malformed encrypted payload structure.');
  }
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    getEncryptionKey(),
    Buffer.from(payload.iv, 'hex')
  );
  decipher.setAuthTag(Buffer.from(payload.tag, 'hex'));
  let decrypted = decipher.update(payload.ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// Sealed handoff helpers for resilient multi-instance client handoff
export function sealHandoffPayload(data: any): string {
  const json = JSON.stringify(data);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(json, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64url');
}

export function unsealHandoffPayload(sealed: string): any | null {
  try {
    const packed = Buffer.from(sealed, 'base64url');
    if (packed.length < 28) return null;
    const iv = packed.subarray(0, 12);
    const tag = packed.subarray(12, 28);
    const ciphertext = packed.subarray(28);
    const decipher = crypto.createDecipheriv('aes-256-gcm', getEncryptionKey(), iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
    return JSON.parse(decrypted);
  } catch {
    return null;
  }
}

// 3. Server-side Persistence Layer
// Persists to a protected JSON vault on disk to survive server reloads, with in-memory fast caching
const DATA_DIR = path.resolve(process.cwd(), '.vault');
const VAULT_FILE = path.join(DATA_DIR, 'notion-vault.json');

interface VaultSchema {
  connections: Record<string, StoredNotionConnection>;
  exports: Record<string, StoredExportRecord[]>;
}

let vaultData: VaultSchema = { connections: {}, exports: {} };

try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (fs.existsSync(VAULT_FILE)) {
    const raw = fs.readFileSync(VAULT_FILE, 'utf-8');
    vaultData = JSON.parse(raw);
  }
} catch (err) {
  console.warn('Could not read notion vault, initializing empty store:', err);
  vaultData = { connections: {}, exports: {} };
}

function saveVault() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(VAULT_FILE, JSON.stringify(vaultData, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save notion vault to disk:', err);
  }
}

// Load Firebase configuration safely for server-side durable storage
let firebaseConfig: {
  projectId?: string;
  apiKey?: string;
  firestoreDatabaseId?: string;
} = {};

try {
  const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  }
} catch (e) {
  // Graceful fallback if config file is not readable
}

// 4. Firestore Production Storage Helpers (Durable multi-instance storage for Cloud Run)
async function syncConnectionToFirestore(
  userId: string,
  connection: StoredNotionConnection,
  idToken: string
): Promise<void> {
  try {
    const projectId = firebaseConfig.projectId;
    if (!projectId || !idToken) return;
    const databaseId = firebaseConfig.firestoreDatabaseId || '(default)';
    const apiKey = firebaseConfig.apiKey || process.env.VITE_FIREBASE_API_KEY || '';

    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/users/${encodeURIComponent(
      userId
    )}/integrations/notion${apiKey ? `?key=${apiKey}` : ''}`;

    const body = {
      fields: {
        userId: { stringValue: userId },
        workspaceName: { stringValue: connection.workspaceName || 'My Notion Workspace' },
        workspaceIcon: { stringValue: connection.workspaceIcon || '' },
        botId: { stringValue: connection.botId || '' },
        destinationPageId: { stringValue: connection.destinationPageId || '' },
        destinationPageTitle: { stringValue: connection.destinationPageTitle || '' },
        connectedAt: { stringValue: connection.connectedAt },
        updatedAt: { stringValue: connection.updatedAt },
        encryptedAccessToken: {
          mapValue: {
            fields: {
              iv: { stringValue: connection.encryptedAccessToken.iv },
              tag: { stringValue: connection.encryptedAccessToken.tag },
              ciphertext: { stringValue: connection.encryptedAccessToken.ciphertext },
            },
          },
        },
      },
    };

    await fetch(url, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.warn('Could not sync Notion connection to Firestore:', err);
  }
}

async function fetchConnectionFromFirestore(
  userId: string,
  idToken: string
): Promise<StoredNotionConnection | null> {
  try {
    const projectId = firebaseConfig.projectId;
    if (!projectId || !idToken) return null;
    const databaseId = firebaseConfig.firestoreDatabaseId || '(default)';
    const apiKey = firebaseConfig.apiKey || process.env.VITE_FIREBASE_API_KEY || '';

    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/users/${encodeURIComponent(
      userId
    )}/integrations/notion${apiKey ? `?key=${apiKey}` : ''}`;

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) return null;
    const data = await res.json();
    const fields = data.fields;
    if (!fields || !fields.encryptedAccessToken?.mapValue?.fields) return null;

    const encFields = fields.encryptedAccessToken.mapValue.fields;
    const connection: StoredNotionConnection = {
      userId,
      workspaceName: fields.workspaceName?.stringValue || 'My Notion Workspace',
      workspaceIcon: fields.workspaceIcon?.stringValue || undefined,
      botId: fields.botId?.stringValue || undefined,
      destinationPageId: fields.destinationPageId?.stringValue || undefined,
      destinationPageTitle: fields.destinationPageTitle?.stringValue || undefined,
      connectedAt: fields.connectedAt?.stringValue || new Date().toISOString(),
      updatedAt: fields.updatedAt?.stringValue || new Date().toISOString(),
      encryptedAccessToken: {
        iv: encFields.iv?.stringValue || '',
        tag: encFields.tag?.stringValue || '',
        ciphertext: encFields.ciphertext?.stringValue || '',
      },
    };
    return connection;
  } catch (err) {
    console.warn('Could not fetch Notion connection from Firestore:', err);
    return null;
  }
}

async function deleteConnectionFromFirestore(userId: string, idToken: string): Promise<void> {
  try {
    const projectId = firebaseConfig.projectId;
    if (!projectId || !idToken) return;
    const databaseId = firebaseConfig.firestoreDatabaseId || '(default)';
    const apiKey = firebaseConfig.apiKey || process.env.VITE_FIREBASE_API_KEY || '';

    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/users/${encodeURIComponent(
      userId
    )}/integrations/notion${apiKey ? `?key=${apiKey}` : ''}`;

    await fetch(url, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
    });
  } catch (err) {
    console.warn('Could not delete Notion connection from Firestore:', err);
  }
}

async function syncExportToFirestore(
  userId: string,
  exportRecord: StoredExportRecord,
  idToken: string
): Promise<void> {
  try {
    const projectId = firebaseConfig.projectId;
    if (!projectId || !idToken) return;
    const databaseId = firebaseConfig.firestoreDatabaseId || '(default)';
    const apiKey = firebaseConfig.apiKey || process.env.VITE_FIREBASE_API_KEY || '';

    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/users/${encodeURIComponent(
      userId
    )}/notion_exports/${encodeURIComponent(exportRecord.id)}${apiKey ? `?key=${apiKey}` : ''}`;

    const body = {
      fields: {
        id: { stringValue: exportRecord.id },
        reflectionId: { stringValue: exportRecord.reflectionId },
        notionPageId: { stringValue: exportRecord.notionPageId },
        notionPageUrl: { stringValue: exportRecord.notionPageUrl },
        destinationPageId: { stringValue: exportRecord.destinationPageId },
        destinationPageTitle: { stringValue: exportRecord.destinationPageTitle || '' },
        exportedAt: { stringValue: exportRecord.exportedAt },
      },
    };

    await fetch(url, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.warn('Could not sync Notion export record to Firestore:', err);
  }
}

async function getEffectiveConnection(
  userId: string,
  idToken?: string
): Promise<StoredNotionConnection | null> {
  // 1. Authoritatively fetch from Firestore when idToken is available
  if (idToken) {
    const fromFirestore = await fetchConnectionFromFirestore(userId, idToken);
    if (fromFirestore) {
      vaultData.connections[userId] = fromFirestore;
      saveVault();
      return fromFirestore;
    }
  }

  // 2. Fallback to local vault cache (e.g. for local dev or if Firestore read was null/failed)
  const conn = vaultData.connections[userId];
  if (conn && idToken) {
    // Sync local cached connection back to Firestore
    syncConnectionToFirestore(userId, conn, idToken).catch(() => {});
  }
  return conn || null;
}

// 5. Stateless OAuth State Protection (Single-use, Cryptographic, 10-minute expiry, multi-instance safe)
export interface OAuthStatePayload {
  uid: string;
  exp: number;
  nonce: string;
}

export function createStatelessOAuthState(uid: string): string {
  const payload: OAuthStatePayload = {
    uid,
    exp: Date.now() + 10 * 60 * 1000, // 10 minutes maximum
    nonce: crypto.randomBytes(16).toString('hex'),
  };
  const json = JSON.stringify(payload);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(json, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64url');
}

// In-memory cache of recently consumed nonces to prevent replay within expiration window
const consumedNonces = new Map<string, number>();

// Evict expired nonces every 2 minutes
setInterval(() => {
  const now = Date.now();
  for (const [nonce, exp] of consumedNonces.entries()) {
    if (now > exp) {
      consumedNonces.delete(nonce);
    }
  }
}, 2 * 60 * 1000);

export function verifyStatelessOAuthState(stateString: string): OAuthStatePayload | null {
  try {
    if (!stateString || typeof stateString !== 'string') return null;
    const packed = Buffer.from(stateString, 'base64url');
    if (packed.length < 28) return null;

    const iv = packed.subarray(0, 12);
    const tag = packed.subarray(12, 28);
    const ciphertext = packed.subarray(28);

    const decipher = crypto.createDecipheriv('aes-256-gcm', getEncryptionKey(), iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');

    const payload: OAuthStatePayload = JSON.parse(decrypted);
    if (!payload.uid || typeof payload.uid !== 'string') return null;
    if (!payload.exp || typeof payload.exp !== 'number' || Date.now() > payload.exp) return null;
    if (!payload.nonce || typeof payload.nonce !== 'string') return null;

    // Check replay
    if (consumedNonces.has(payload.nonce)) {
      console.warn('OAuth state replay rejected for nonce:', payload.nonce);
      return null;
    }

    // Mark consumed until expiration + 1 min buffer
    consumedNonces.set(payload.nonce, payload.exp + 60 * 1000);

    return payload;
  } catch (err) {
    console.warn('Failed to verify stateless OAuth state:', err);
    return null;
  }
}

// Helper: Escape HTML for OAuth callback pages
function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Minimal HTML response for successful OAuth completion
function renderMinimalSuccessHtml(targetOrigin: string, handoff: string = ''): string {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>MindLedger — Notion Connected</title>
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        background: #0b0f19;
        color: #f8fafc;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        margin: 0;
        padding: 24px;
        box-sizing: border-box;
      }
      .card {
        background: #131b2e;
        border: 1px solid #1e293b;
        border-radius: 16px;
        padding: 32px;
        max-width: 400px;
        width: 100%;
        text-align: center;
        box-shadow: 0 10px 25px rgba(0,0,0,0.3);
      }
      .icon { font-size: 40px; margin-bottom: 12px; }
      h1 { font-size: 19px; font-weight: 600; margin: 0 0 8px 0; color: #10b981; }
      p { font-size: 14px; color: #94a3b8; line-height: 1.5; margin: 0 0 20px 0; }
      .btn {
        display: inline-block;
        background: #1e293b;
        border: 1px solid #334155;
        color: #f8fafc;
        padding: 10px 20px;
        border-radius: 8px;
        font-weight: 500;
        font-size: 13px;
        text-decoration: none;
        cursor: pointer;
        transition: background 0.2s;
      }
      .btn:hover { background: #334155; }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="icon">✨</div>
      <h1>Notion connected successfully</h1>
      <p>You can close this window.</p>
      <div style="display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;">
        <button type="button" class="btn" onclick="window.close()">Close Window</button>
        <a id="return-link" href="/" class="btn" style="display: none;">Return to MindLedger</a>
      </div>
    </div>
    <script>
      (function() {
        var configuredOrigin = ${JSON.stringify(targetOrigin)};
        var handoffToken = ${JSON.stringify(handoff)};
        var origin = configuredOrigin;
        try {
          if (window.location && window.location.origin && window.location.origin !== 'null') {
            origin = window.location.origin;
          }
        } catch (e) {}

        var payload = {
          type: "mindledger:notion-oauth-success",
          handoff: handoffToken || undefined
        };

        if (window.opener && !window.opener.closed) {
          try {
            window.opener.postMessage(payload, origin);
          } catch (e) {}
          try {
            window.opener.postMessage(payload, configuredOrigin);
          } catch (e) {}
          try {
            window.opener.postMessage(payload, "*");
          } catch (e) {}
          setTimeout(function() {
            window.close();
          }, 400);
        } else {
          var link = document.getElementById('return-link');
          if (link) link.style.display = 'inline-block';
        }
      })();
    </script>
  </body>
</html>`;
}

// Minimal HTML response for OAuth failure
function renderMinimalFailureHtml(safeError: string, targetOrigin: string): string {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Notion connection failed</title>
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        background: #0b0f19;
        color: #f8fafc;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        margin: 0;
        padding: 24px;
        box-sizing: border-box;
      }
      .card {
        background: #131b2e;
        border: 1px solid #1e293b;
        border-radius: 16px;
        padding: 32px;
        max-width: 400px;
        width: 100%;
        text-align: center;
        box-shadow: 0 10px 25px rgba(0,0,0,0.3);
      }
      .icon { font-size: 40px; margin-bottom: 12px; }
      h1 { font-size: 19px; font-weight: 600; margin: 0 0 8px 0; color: #fb7185; }
      p { font-size: 14px; color: #94a3b8; line-height: 1.5; margin: 0 0 20px 0; }
      .btn {
        display: inline-block;
        background: #1e293b;
        border: 1px solid #334155;
        color: #f8fafc;
        padding: 10px 20px;
        border-radius: 8px;
        font-weight: 500;
        font-size: 13px;
        text-decoration: none;
        cursor: pointer;
        transition: background 0.2s;
      }
      .btn:hover { background: #334155; }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="icon">⚠️</div>
      <h1>Notion connection failed</h1>
      <p>${escapeHtml(safeError)}</p>
      <div style="display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;">
        <button type="button" class="btn" onclick="window.close()">Close Window</button>
        <a id="return-link" href="/" class="btn" style="display: none;">Return to MindLedger</a>
      </div>
    </div>
    <script>
      (function() {
        var configuredOrigin = ${JSON.stringify(targetOrigin)};
        var origin = configuredOrigin;
        try {
          if (window.location && window.location.origin && window.location.origin !== 'null') {
            origin = window.location.origin;
          }
        } catch (e) {}

        var safeMsg = ${JSON.stringify(safeError)};
        if (window.opener && !window.opener.closed) {
          try {
            window.opener.postMessage({ type: "mindledger:notion-oauth-error", error: safeMsg }, origin);
          } catch (e) {}
          try {
            window.opener.postMessage({ type: "mindledger:notion-oauth-error", error: safeMsg }, configuredOrigin);
          } catch (e) {}
          try {
            window.opener.postMessage({ type: "mindledger:notion-oauth-error", error: safeMsg }, "*");
          } catch (e) {}
          setTimeout(function() {
            window.close();
          }, 1800);
        } else {
          var link = document.getElementById('return-link');
          if (link) link.style.display = 'inline-block';
        }
      })();
    </script>
  </body>
</html>`;
}

/**
 * Direct standalone handler for GET /api/integrations/notion/callback
 * Validates OAuth state, exchanges code for access token, stores credentials, and returns ONLY minimal HTML
 */
export async function handleNotionOAuthCallback(req: Request, res: Response): Promise<void> {
  const { code, state, error, error_description, format } = req.query;
  const wantsJson = format === 'json' || req.headers.accept?.includes('application/json');

  const targetOrigin = (() => {
    try {
      if (process.env.NOTION_REDIRECT_URI) {
        return new URL(process.env.NOTION_REDIRECT_URI).origin;
      }
    } catch {}
    return 'https://mindledger.ai.studio';
  })();

  const sendFailure = (status: number, safeMsg: string) => {
    res.setHeader('Content-Type', wantsJson ? 'application/json' : 'text/html; charset=utf-8');
    if (wantsJson) {
      res.status(status).json({ success: false, error: safeMsg });
      return;
    }
    res.status(status).send(renderMinimalFailureHtml(safeMsg, targetOrigin));
  };

  // 1. Handle OAuth denial / error parameter from Notion
  if (error) {
    sendFailure(200, 'Notion authorization was cancelled or denied.');
    return;
  }

  // 2. Validate state presence
  if (!state || typeof state !== 'string') {
    sendFailure(400, 'The authorization request is missing a valid security state.');
    return;
  }

  // 3. Verify cryptographic state (anti-CSRF & user binding, single-use, multi-instance stateless)
  const statePayload = verifyStatelessOAuthState(state);
  if (!statePayload) {
    sendFailure(400, 'The authorization state has expired or is invalid. Please try again.');
    return;
  }

  const boundUserId = statePayload.uid;
  const usedRedirectUri = NOTION_REDIRECT_URI;

  // Extract delegated ID token if present in session cookie to sync immediately to Firestore
  let delegatedIdToken: string | undefined;
  try {
    const rawCookie = req.headers.cookie || '';
    const match = rawCookie.match(/(?:^|;\s*)__ml_notion_oauth=([^;]+)/);
    if (match && match[1]) {
      const cookiePacked = Buffer.from(match[1], 'base64url');
      if (cookiePacked.length >= 28) {
        const cIv = cookiePacked.subarray(0, 12);
        const cTag = cookiePacked.subarray(12, 28);
        const cCipher = cookiePacked.subarray(28);
        const cDecipher = crypto.createDecipheriv('aes-256-gcm', getEncryptionKey(), cIv);
        cDecipher.setAuthTag(cTag);
        const cDecrypted = Buffer.concat([cDecipher.update(cCipher), cDecipher.final()]).toString('utf8');
        const cData = JSON.parse(cDecrypted);
        if (cData.uid === boundUserId && Date.now() <= cData.exp && typeof cData.idToken === 'string') {
          delegatedIdToken = cData.idToken;
        }
      }
    }
  } catch {}

  // Clear session cookie immediately
  try {
    res.clearCookie('__ml_notion_oauth', { path: '/api/integrations/notion' });
  } catch {}

  // 4. Validate code presence
  if (!code || typeof code !== 'string') {
    sendFailure(400, 'Notion did not return an authorization code.');
    return;
  }

  // 5. Exchange authorization code for token securely on server
  try {
    const basicAuth = Buffer.from(`${NOTION_CLIENT_ID}:${NOTION_CLIENT_SECRET}`).toString('base64');
    const tokenResponse = await fetch('https://api.notion.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basicAuth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: usedRedirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      console.error('Notion token exchange failure status:', tokenResponse.status);
      sendFailure(502, 'Failed to complete authorization exchange with Notion.');
      return;
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    const workspaceName = tokenData.workspace_name || 'My Notion Workspace';
    const workspaceIcon = tokenData.workspace_icon || null;
    const botId = tokenData.bot_id || null;

    if (!accessToken) {
      sendFailure(502, 'Notion did not return a valid access token.');
      return;
    }

    // 6. Encrypt token before persisting
    const encryptedToken = encryptToken(accessToken);
    const now = new Date().toISOString();

    const existingConn = vaultData.connections[boundUserId];

    const newConn: StoredNotionConnection = {
      userId: boundUserId,
      encryptedAccessToken: encryptedToken,
      workspaceName,
      workspaceIcon,
      botId,
      destinationPageId: existingConn?.destinationPageId,
      destinationPageTitle: existingConn?.destinationPageTitle,
      connectedAt: existingConn?.connectedAt || now,
      updatedAt: now,
    };

    // Update local cache
    vaultData.connections[boundUserId] = newConn;
    saveVault();

    // If delegated token was available from secure session cookie, sync to Firestore immediately
    if (delegatedIdToken) {
      await syncConnectionToFirestore(boundUserId, newConn, delegatedIdToken);
    }

    // Seal encrypted handoff payload for resilient multi-instance client handoff
    const handoff = sealHandoffPayload({
      uid: boundUserId,
      connection: newConn,
      timestamp: Date.now(),
    });

    // 7. Return minimal success completion response
    res.setHeader('Content-Type', wantsJson ? 'application/json' : 'text/html; charset=utf-8');
    if (wantsJson) {
      res.json({ success: true, workspaceName, handoff });
      return;
    }
    res.send(renderMinimalSuccessHtml(targetOrigin, handoff));
  } catch (err: any) {
    console.error('Error handling Notion callback:', err);
    sendFailure(500, 'An unexpected server error occurred while connecting Notion.');
  }
}

// Helper: Chunk text into <= maxLen strings to respect Notion's 2000-char block limit
function chunkText(text: string, maxLen = 1800): string[] {
  if (!text) return [];
  if (text.length <= maxLen) return [text];
  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= maxLen) {
      chunks.push(remaining);
      break;
    }
    // Find closest natural break (newline or sentence end)
    let breakIdx = remaining.lastIndexOf('\n', maxLen);
    if (breakIdx === -1 || breakIdx < maxLen / 2) {
      breakIdx = remaining.lastIndexOf('. ', maxLen);
    }
    if (breakIdx === -1 || breakIdx < maxLen / 2) {
      breakIdx = maxLen;
    } else {
      breakIdx += 1;
    }
    chunks.push(remaining.slice(0, breakIdx).trim());
    remaining = remaining.slice(breakIdx).trim();
  }
  return chunks.filter(Boolean);
}

// Helper: Extract page title from Notion Search response
function extractNotionPageTitle(page: any): string {
  if (page.properties) {
    for (const key of Object.keys(page.properties)) {
      const prop = page.properties[key];
      if (prop.type === 'title' && Array.isArray(prop.title) && prop.title.length > 0) {
        const titleText = prop.title.map((t: any) => t.plain_text || t.text?.content || '').join('').trim();
        if (titleText) return titleText;
      }
    }
  }
  // Fallback for sub-page objects
  return 'Untitled Page';
}

export function createNotionRouter(options: NotionRouterOptions): Router {
  const router = Router();
  const { verifyFirebaseIdToken, fetchUserInteractions } = options;

  // Middleware: Extract and verify Firebase Auth token
  const requireAuth = async (req: Request, res: Response, next: () => void) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or malformed Authorization header.' });
      }
      const idToken = authHeader.split('Bearer ')[1]?.trim();
      if (!idToken) {
        return res.status(401).json({ error: 'Authentication token is required.' });
      }
      const authResult = await verifyFirebaseIdToken(idToken);
      (req as any).verifiedUser = authResult;
      (req as any).firebaseIdToken = idToken;
      next();
    } catch (err: any) {
      return res.status(401).json({ error: err?.message || 'Authentication failed.' });
    }
  };

  /**
   * GET /api/integrations/notion/connect
   * Initiates OAuth 2.0 flow: generates cryptographic state bound to authenticated user
   */
  router.get('/connect', requireAuth, (req: Request, res: Response) => {
    const user = (req as any).verifiedUser;
    const isConfigured = Boolean(NOTION_CLIENT_ID && NOTION_CLIENT_SECRET);

    if (!isConfigured) {
      return res.status(503).json({
        error:
          'Notion integration is not yet configured. Please set NOTION_CLIENT_ID and NOTION_CLIENT_SECRET in the app environment.',
        configured: false,
      });
    }

    // Generate stateless cryptographic state bound to authenticated user
    const state = createStatelessOAuthState(user.uid);

    // Set encrypted delegation cookie for seamless direct Firestore write on /callback
    const idToken = (req as any).firebaseIdToken;
    if (idToken) {
      try {
        const sessionPayload = JSON.stringify({
          uid: user.uid,
          idToken,
          exp: Date.now() + 10 * 60 * 1000,
        });
        const iv = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
        const encrypted = Buffer.concat([cipher.update(sessionPayload, 'utf8'), cipher.final()]);
        const tag = cipher.getAuthTag();
        const cookieVal = Buffer.concat([iv, tag, encrypted]).toString('base64url');

        res.cookie('__ml_notion_oauth', cookieVal, {
          httpOnly: true,
          secure: true,
          sameSite: 'lax',
          maxAge: 10 * 60 * 1000,
          path: '/api/integrations/notion',
        });
      } catch (e) {
        console.warn('Could not set OAuth session cookie:', e);
      }
    }

    // Public connection authorization URL
    const notionAuthUrl = `https://api.notion.com/v1/oauth/authorize?client_id=${encodeURIComponent(
      NOTION_CLIENT_ID
    )}&response_type=code&owner=user&redirect_uri=${encodeURIComponent(
      NOTION_REDIRECT_URI
    )}&state=${encodeURIComponent(state)}`;

    return res.json({
      url: notionAuthUrl,
      state,
      configured: true,
    });
  });

  /**
   * GET /api/integrations/notion/callback
   * OAuth 2.0 Callback: validates state, exchanges code for access token, encrypts, and responds via minimal popup HTML
   */
  router.get('/callback', handleNotionOAuthCallback);

  /**
   * POST /api/integrations/notion/sync
   * Finalizes durable Firestore persistence and caching via sealed multi-instance handoff
   */
  router.post('/sync', requireAuth, async (req: Request, res: Response) => {
    const user = (req as any).verifiedUser;
    const idToken = (req as any).firebaseIdToken;
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const { handoff } = body;

    if (!handoff || typeof handoff !== 'string') {
      const conn = await getEffectiveConnection(user.uid, idToken);
      return res.json({ success: Boolean(conn), connected: Boolean(conn) });
    }

    const unsealed = unsealHandoffPayload(handoff);
    if (!unsealed || unsealed.uid !== user.uid) {
      return res.status(400).json({ error: 'Invalid or expired sync handoff token.' });
    }

    if (Date.now() - (unsealed.timestamp || 0) > 10 * 60 * 1000) {
      return res.status(400).json({ error: 'Sync handoff token has expired.' });
    }

    const conn: StoredNotionConnection = unsealed.connection;
    if (!conn || !conn.encryptedAccessToken) {
      return res.status(400).json({ error: 'Malformed connection payload.' });
    }

    // Persist durably to Firestore with the authenticated user's ID token
    await syncConnectionToFirestore(user.uid, conn, idToken);

    // Update local cache
    vaultData.connections[user.uid] = conn;
    saveVault();

    return res.json({
      success: true,
      workspaceName: conn.workspaceName,
      destinationPageId: conn.destinationPageId,
      destinationPageTitle: conn.destinationPageTitle,
    });
  });

  /**
   * GET /api/integrations/notion/status
   * Checks current connection status and destination for authenticated user (Never exposes raw tokens!)
   */
  router.get('/status', requireAuth, async (req: Request, res: Response) => {
    const user = (req as any).verifiedUser;
    const idToken = (req as any).firebaseIdToken;
    const isConfigured = Boolean(NOTION_CLIENT_ID && NOTION_CLIENT_SECRET);
    const conn = await getEffectiveConnection(user.uid, idToken);

    return res.json({
      connected: Boolean(conn && conn.encryptedAccessToken),
      configured: isConfigured,
      workspaceName: conn?.workspaceName,
      workspaceIcon: conn?.workspaceIcon,
      destinationPageId: conn?.destinationPageId,
      destinationPageTitle: conn?.destinationPageTitle,
      connectedAt: conn?.connectedAt,
    });
  });

  /**
   * GET /api/integrations/notion/pages
   * Fetches accessible Notion pages for destination selection
   */
  router.get('/pages', requireAuth, async (req: Request, res: Response) => {
    const user = (req as any).verifiedUser;
    const idToken = (req as any).firebaseIdToken;
    const conn = await getEffectiveConnection(user.uid, idToken);

    if (!conn || !conn.encryptedAccessToken) {
      return res.status(400).json({ error: 'Notion is not connected for this account.' });
    }

    try {
      const accessToken = decryptToken(conn.encryptedAccessToken);
      const searchRes = await fetch('https://api.notion.com/v1/search', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Notion-Version': NOTION_API_VERSION,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filter: {
            value: 'page',
            property: 'object',
          },
          page_size: 50,
          sort: {
            direction: 'descending',
            timestamp: 'last_edited_time',
          },
        }),
      });

      if (searchRes.status === 401) {
        // Notion access token was revoked in workspace
        delete vaultData.connections[user.uid];
        saveVault();
        if (idToken) {
          deleteConnectionFromFirestore(user.uid, idToken).catch(() => {});
        }
        return res.status(401).json({
          error: 'Your Notion connection has expired or was revoked. Please reconnect Notion.',
          reauthRequired: true,
        });
      }

      if (!searchRes.ok) {
        const errText = await searchRes.text();
        console.error('Notion search error status:', searchRes.status, errText.slice(0, 100));
        return res.status(502).json({ error: 'Failed to retrieve pages from Notion.' });
      }

      const searchData = await searchRes.json();
      const results = searchData.results || [];

      const pages = results.map((page: any) => ({
        id: page.id,
        title: extractNotionPageTitle(page),
        url: page.url,
        icon: page.icon?.emoji || page.icon?.external?.url || null,
        lastEditedTime: page.last_edited_time,
        parentType: page.parent?.type,
      }));

      return res.json({ pages });
    } catch (err: any) {
      console.error('Error querying Notion search:', err?.message);
      return res.status(500).json({ error: 'Failed to query Notion pages.' });
    }
  });

  /**
   * POST /api/integrations/notion/destination
   * Updates the selected destination page ID and Title for the user
   */
  router.post('/destination', requireAuth, async (req: Request, res: Response) => {
    const user = (req as any).verifiedUser;
    const idToken = (req as any).firebaseIdToken;
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const { pageId, pageTitle } = body;

    if (!pageId || typeof pageId !== 'string') {
      return res.status(400).json({ error: 'Valid Notion page ID is required.' });
    }

    const conn = await getEffectiveConnection(user.uid, idToken);
    if (!conn) {
      return res.status(400).json({ error: 'Notion is not connected for this account.' });
    }

    conn.destinationPageId = pageId.trim();
    conn.destinationPageTitle = (pageTitle || 'Untitled Page').trim();
    conn.updatedAt = new Date().toISOString();
    vaultData.connections[user.uid] = conn;
    saveVault();

    if (idToken) {
      syncConnectionToFirestore(user.uid, conn, idToken).catch(() => {});
    }

    return res.json({
      success: true,
      destinationPageId: conn.destinationPageId,
      destinationPageTitle: conn.destinationPageTitle,
    });
  });

  /**
   * POST /api/integrations/notion/export
   * Exports a structured reflection page to Notion with full evidence-grounding separation
   */
  router.post('/export', requireAuth, async (req: Request, res: Response) => {
    const user = (req as any).verifiedUser;
    const idToken = (req as any).firebaseIdToken;
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const { reflectionId, destinationPageId, forceNew = false, reflectionData } = body;

    if (!reflectionId || typeof reflectionId !== 'string') {
      return res.status(400).json({ error: 'Reflection ID is required.' });
    }

    const conn = await getEffectiveConnection(user.uid, idToken);
    if (!conn || !conn.encryptedAccessToken) {
      return res.status(400).json({ error: 'Notion is not connected for this account.' });
    }

    const targetDestinationId = destinationPageId || conn.destinationPageId;
    if (!targetDestinationId) {
      return res.status(400).json({
        error: 'No destination page selected. Please choose a Notion destination page first.',
      });
    }

    // Check duplicate export protection
    const userExports = vaultData.exports[user.uid] || [];
    const existingExport = userExports.find((exp) => exp.reflectionId === reflectionId);

    if (existingExport && !forceNew) {
      return res.json({
        success: true,
        alreadyExported: true,
        pageId: existingExport.notionPageId,
        pageUrl: existingExport.notionPageUrl,
        message: 'This reflection was already saved to Notion.',
      });
    }

    // Retrieve reflection data securely
    let targetEntry = reflectionData;
    if (!targetEntry || targetEntry.id !== reflectionId) {
      // If not passed in body or mismatched, fetch from user's isolated store
      if (fetchUserInteractions) {
        try {
          const userInteractions = await fetchUserInteractions((req as any).firebaseIdToken, user.uid);
          targetEntry = userInteractions.find((e) => e.id === reflectionId);
        } catch (fetchErr) {
          console.warn('Could not fetch interaction via REST helper, checking passed payload:', fetchErr);
        }
      }
    }

    if (!targetEntry) {
      return res.status(404).json({ error: 'Reflection entry not found or unauthorized.' });
    }

    // Verify ownership
    if (targetEntry.userId && targetEntry.userId !== user.uid) {
      return res.status(403).json({ error: 'Unauthorized: Cross-user reflection export is forbidden.' });
    }

    try {
      const accessToken = decryptToken(conn.encryptedAccessToken);
      const titleText = targetEntry.title || 'Untitled MindLedger Reflection';
      const category = targetEntry.category || 'personal';
      const createdDate = new Date(targetEntry.createdAt || Date.now()).toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });

      // Construct rich Notion Blocks
      const blocks: any[] = [];

      // 1. Header Metadata Callout
      let metaContent = `📅 Date: ${createdDate} | 🏷️ Category: ${category.toUpperCase()}`;
      if (targetEntry.location?.placeName) {
        metaContent += ` | 📍 Location: ${targetEntry.location.placeName}`;
      }
      blocks.push({
        object: 'block',
        type: 'callout',
        callout: {
          icon: { type: 'emoji', emoji: '🧠' },
          rich_text: [{ type: 'text', text: { content: metaContent } }],
        },
      });

      blocks.push({ object: 'block', type: 'divider', divider: {} });

      // 2. Executive Synthesis (AI Generated - clearly labeled)
      if (targetEntry.summary) {
        blocks.push({
          object: 'block',
          type: 'heading_2',
          heading_2: {
            rich_text: [{ type: 'text', text: { content: 'Executive Synthesis (Gemini AI)' } }],
          },
        });
        const summaryChunks = chunkText(targetEntry.summary);
        for (const chunk of summaryChunks) {
          blocks.push({
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: [{ type: 'text', text: { content: chunk } }],
            },
          });
        }
      }

      // 3. Core Insights & Patterns
      if (Array.isArray(targetEntry.keyInsights) && targetEntry.keyInsights.length > 0) {
        blocks.push({
          object: 'block',
          type: 'heading_2',
          heading_2: {
            rich_text: [{ type: 'text', text: { content: 'Core Insights & Themes' } }],
          },
        });
        for (const insight of targetEntry.keyInsights.slice(0, 10)) {
          const insightChunks = chunkText(String(insight));
          for (const chunk of insightChunks) {
            blocks.push({
              object: 'block',
              type: 'bulleted_list_item',
              bulleted_list_item: {
                rich_text: [{ type: 'text', text: { content: chunk } }],
              },
            });
          }
        }
      }

      // 4. Actionable Steps & Milestones
      if (Array.isArray(targetEntry.actionItems) && targetEntry.actionItems.length > 0) {
        blocks.push({
          object: 'block',
          type: 'heading_2',
          heading_2: {
            rich_text: [{ type: 'text', text: { content: 'Action Items & Next Steps' } }],
          },
        });
        for (const item of targetEntry.actionItems.slice(0, 10)) {
          const itemChunks = chunkText(String(item));
          for (const chunk of itemChunks) {
            blocks.push({
              object: 'block',
              type: 'to_do',
              to_do: {
                rich_text: [{ type: 'text', text: { content: chunk } }],
                checked: false,
              },
            });
          }
        }
      }

      // 5. Attached Location Details (if present)
      if (targetEntry.location) {
        blocks.push({
          object: 'block',
          type: 'heading_2',
          heading_2: {
            rich_text: [{ type: 'text', text: { content: 'Reflection Setting & Location' } }],
          },
        });
        const locDetails = [
          `Place: ${targetEntry.location.placeName}`,
          targetEntry.location.formattedAddress ? `Address: ${targetEntry.location.formattedAddress}` : null,
          `Coordinates: ${targetEntry.location.latitude.toFixed(4)}, ${targetEntry.location.longitude.toFixed(4)}`,
        ]
          .filter(Boolean)
          .join('\n');

        blocks.push({
          object: 'block',
          type: 'callout',
          callout: {
            icon: { type: 'emoji', emoji: '📍' },
            rich_text: [{ type: 'text', text: { content: locDetails } }],
          },
        });
      }

      // 6. Original User Reflection Dialogue
      if (Array.isArray(targetEntry.messages) && targetEntry.messages.length > 0) {
        blocks.push({
          object: 'block',
          type: 'heading_2',
          heading_2: {
            rich_text: [{ type: 'text', text: { content: 'Original Reflection Dialogue' } }],
          },
        });

        // Add dialogue entries (up to 30 messages to keep blocks comfortably under 90)
        for (const msg of targetEntry.messages.slice(0, 30)) {
          const isUser = msg.role === 'user';
          const speakerPrefix = isUser ? '👤 You: ' : '✨ Gemini: ';
          const fullMsgText = `${speakerPrefix}${msg.content}`;
          const chunks = chunkText(fullMsgText);

          for (const chunk of chunks) {
            blocks.push({
              object: 'block',
              type: isUser ? 'paragraph' : 'quote',
              [isUser ? 'paragraph' : 'quote']: {
                rich_text: [{ type: 'text', text: { content: chunk } }],
              },
            });
          }
        }
      }

      // 7. Footer Attribution
      blocks.push({ object: 'block', type: 'divider', divider: {} });
      blocks.push({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [
            {
              type: 'text',
              text: {
                content:
                  'Exported securely from MindLedger • Personal Memory & Grounded Reflection Vault',
              },
            },
          ],
        },
      });

      // Notion page creation payload
      const notionPagePayload = {
        parent: { page_id: targetDestinationId },
        icon: { type: 'emoji', emoji: '🧠' },
        properties: {
          title: {
            title: [
              {
                type: 'text',
                text: { content: titleText },
              },
            ],
          },
        },
        children: blocks.slice(0, 95), // Safeguard within 100 block Notion limit
      };

      const pageRes = await fetch('https://api.notion.com/v1/pages', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Notion-Version': NOTION_API_VERSION,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(notionPagePayload),
      });

      if (!pageRes.ok) {
        const errText = await pageRes.text();
        console.error('Notion page creation error status:', pageRes.status, errText.slice(0, 150));
        let userMsg = 'Failed to create Notion page.';
        if (pageRes.status === 404) {
          userMsg =
            'Selected destination page was not found or is not accessible. Please ensure you shared the destination page with the MindLedger integration in Notion.';
        } else if (pageRes.status === 401) {
          userMsg = 'Notion authorization was revoked. Please reconnect.';
        }
        return res.status(pageRes.status).json({ error: userMsg, details: errText.slice(0, 200) });
      }

      const createdPage = await pageRes.json();
      const pageId = createdPage.id;
      const pageUrl = createdPage.url;

      // Record export in user export store
      if (!vaultData.exports[user.uid]) {
        vaultData.exports[user.uid] = [];
      }
      const exportRecord: StoredExportRecord = {
        id: `export_${Date.now()}`,
        userId: user.uid,
        reflectionId,
        notionPageId: pageId,
        notionPageUrl: pageUrl,
        destinationPageId: targetDestinationId,
        destinationPageTitle: conn.destinationPageTitle,
        exportedAt: new Date().toISOString(),
      };
      // Upsert
      const existingIdx = vaultData.exports[user.uid].findIndex((e) => e.reflectionId === reflectionId);
      if (existingIdx >= 0) {
        vaultData.exports[user.uid][existingIdx] = exportRecord;
      } else {
        vaultData.exports[user.uid].push(exportRecord);
      }
      saveVault();

      if (idToken) {
        syncExportToFirestore(user.uid, exportRecord, idToken).catch(() => {});
      }

      return res.json({
        success: true,
        pageId,
        pageUrl,
        isUpdate: Boolean(existingExport),
      });
    } catch (err: any) {
      console.error('Exception during Notion export:', err?.message);
      return res.status(500).json({ error: 'Failed to export reflection to Notion: ' + err?.message });
    }
  });

  /**
   * POST /api/integrations/notion/disconnect
   * Removes stored credentials and disconnects user from Notion
   */
  router.post('/disconnect', requireAuth, (req: Request, res: Response) => {
    const user = (req as any).verifiedUser;
    const idToken = (req as any).firebaseIdToken;
    delete vaultData.connections[user.uid];
    saveVault();

    if (idToken) {
      deleteConnectionFromFirestore(user.uid, idToken).catch(() => {});
    }

    return res.json({
      success: true,
      message: 'Notion integration disconnected securely.',
    });
  });

  return router;
}

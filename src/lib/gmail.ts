import type { User } from 'firebase/auth';
import type {
  GmailIntegrationStatus,
  GmailMessageSummary,
  GmailMessageDetail,
  GmailAnalysisResult,
} from '../types';

/**
 * Retrieve current Gmail integration status for authenticated user
 */
export async function getGmailStatus(user: User): Promise<GmailIntegrationStatus> {
  if (!user) throw new Error('Authentication required.');
  console.log('[MILESTONE] GMAIL_STATUS_REQUEST_STARTED');
  const idToken = await user.getIdToken();

  const res = await fetch('/api/integrations/gmail/status', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error('Failed to retrieve Gmail integration status.');
  }

  const data = await res.json();
  if (data.connected) {
    console.log('[MILESTONE] GMAIL_STATUS_RESPONSE_CONNECTED');
  }
  return data;
}

/**
 * Initiate Gmail OAuth connection flow
 */
export async function initiateGmailConnect(
  user: User
): Promise<{ url: string; state: string; configured: boolean }> {
  if (!user) throw new Error('Authentication required.');
  const idToken = await user.getIdToken();

  const res = await fetch('/api/integrations/gmail/connect', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to initiate Gmail authorization.');
  }

  return data;
}

/**
 * Sync handoff token from OAuth callback
 */
export async function syncGmailHandoff(user: User, handoff: string): Promise<any> {
  if (!user) throw new Error('Authentication required.');
  const idToken = await user.getIdToken();

  const res = await fetch('/api/integrations/gmail/sync', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ handoff }),
  });

  return res.json();
}

/**
 * Open Gmail OAuth popup and listen for postMessage response
 */
export function openGmailConnectPopup(
  authUrl: string,
  onSuccess: (handoff?: string) => void,
  onError: (error: string) => void,
  onPopupClosedWithoutMessage?: () => void
): Window | null {
  const width = 600;
  const height = 750;
  const left = window.screenX + (window.outerWidth - width) / 2;
  const top = window.screenY + (window.outerHeight - height) / 2;

  let popup: Window | null = null;
  let isSettled = false;
  let checkClosedInterval: any = null;

  const cleanup = () => {
    window.removeEventListener('message', messageHandler);
    window.removeEventListener('focus', handleWindowFocus);
    if (checkClosedInterval) {
      clearInterval(checkClosedInterval);
      checkClosedInterval = null;
    }
  };

  const messageHandler = (event: MessageEvent) => {
    // Security 1: Verify event origin matches the MindLedger application
    const appOrigin = window.location.origin;
    const prodOrigin = 'https://mindledger.ai.studio';
    const isAllowedSource =
      event.origin === appOrigin ||
      event.origin === prodOrigin ||
      (popup && event.source === popup);

    if (!isAllowedSource) return;
    if (!event.data || typeof event.data !== 'object') return;

    // Accept ONLY the designated message types
    if (
      event.data.type === 'mindledger:gmail-oauth-success' ||
      event.data.type === 'GMAIL_AUTH_SUCCESS'
    ) {
      console.log('[MILESTONE] GMAIL_POSTMESSAGE_RECEIVED');
      isSettled = true;
      cleanup();
      try {
        if (popup && !popup.closed) popup.close();
      } catch (e) {}
      onSuccess(typeof event.data.handoff === 'string' ? event.data.handoff : undefined);
    } else if (
      event.data.type === 'mindledger:gmail-oauth-error' ||
      event.data.type === 'GMAIL_AUTH_ERROR'
    ) {
      isSettled = true;
      cleanup();
      try {
        if (popup && !popup.closed) popup.close();
      } catch (e) {}
      const safeError =
        typeof event.data.error === 'string' && event.data.error.trim().length > 0
          ? event.data.error
          : 'Gmail connection failed. Please try again.';
      onError(safeError);
    }
  };

  const handleWindowFocus = () => {
    // Single lightweight check when focus returns to the main window
    if (popup && popup.closed && !isSettled) {
      isSettled = true;
      cleanup();
      onPopupClosedWithoutMessage?.();
    }
  };

  // Step 1: Register listeners BEFORE opening popup
  window.addEventListener('message', messageHandler);
  window.addEventListener('focus', handleWindowFocus);

  // Step 2: Open popup
  try {
    popup = window.open(
      authUrl,
      'gmail_oauth_bridge',
      `width=${width},height=${height},left=${left},top=${top},status=no,toolbar=no,menubar=no`
    );
  } catch (err) {
    console.warn('Popup open error:', err);
  }

  // If popup is blocked by browser, do NOT navigate the main window.
  // Instead, inform the user with instructions to allow popups so state is preserved.
  if (!popup || popup.closed || typeof popup.closed === 'undefined') {
    cleanup();
    onError('Popup was blocked by your browser. Please allow popups for MindLedger and try again.');
    return null;
  }

  // Step 3: Lightweight check interval to clean up listener when user manually closes popup
  checkClosedInterval = setInterval(() => {
    if (popup && popup.closed) {
      if (!isSettled) {
        isSettled = true;
        cleanup();
        onPopupClosedWithoutMessage?.();
      } else {
        cleanup();
      }
    }
  }, 1000);

  return popup;
}

export const initiateGmailOAuth = openGmailConnectPopup;

/**
 * Fetch list of recent Gmail messages (minimal metadata)
 */
export async function fetchGmailMessages(
  user: User,
  query?: string
): Promise<GmailMessageSummary[]> {
  if (!user) throw new Error('Authentication required.');
  const idToken = await user.getIdToken();

  const url = `/api/integrations/gmail/messages${query ? `?q=${encodeURIComponent(query)}` : ''}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to retrieve emails from Gmail.');
  }

  return data.messages || [];
}

/**
 * Fetch detail of single message
 */
export async function fetchGmailMessageDetail(
  user: User,
  messageId: string
): Promise<GmailMessageDetail> {
  if (!user) throw new Error('Authentication required.');
  const idToken = await user.getIdToken();

  const res = await fetch(`/api/integrations/gmail/messages/${encodeURIComponent(messageId)}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to fetch email details.');
  }

  return data;
}

/**
 * Trigger server-side grounded Gemini analysis of selected email
 */
export async function analyzeGmailMessage(
  user: User,
  messageId: string
): Promise<GmailAnalysisResult> {
  if (!user) throw new Error('Authentication required.');
  const idToken = await user.getIdToken();

  const res = await fetch('/api/integrations/gmail/analyze', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messageId }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to analyze email with Gemini.');
  }

  return data;
}

/**
 * Disconnect Gmail integration and remove credentials
 */
export async function disconnectGmail(user: User): Promise<{ success: boolean; message: string }> {
  if (!user) throw new Error('Authentication required.');
  const idToken = await user.getIdToken();

  const res = await fetch('/api/integrations/gmail/disconnect', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to disconnect Gmail account.');
  }

  return data;
}

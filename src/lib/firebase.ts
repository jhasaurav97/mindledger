import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDocs,
  getDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import type { InteractionEntry, UserProfile, MemoryNode, MemoryRelationship, MemoryGraphData, DecisionRecord } from '../types';
import { stripUndefined } from '../utils/sanitize';

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || undefined);

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

/**
 * Detect mobile browsers (Android, iOS Safari, mobile Chrome, iPadOS)
 */
export function isMobileBrowser(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }
  const ua = navigator.userAgent || '';
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(ua);
  const isIPadOS = navigator.maxTouchPoints > 1 && /Macintosh/i.test(ua);
  return isMobileUA || isIPadOS;
}

/**
 * Persist / update profile doc in Firestore under isolated user document
 */
async function syncUserProfile(user: User): Promise<void> {
  try {
    const userRef = doc(db, 'users', user.uid);
    await setDoc(
      userRef,
      stripUndefined({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        lastLoginAt: new Date().toISOString(),
        updatedAt: serverTimestamp(),
      }),
      { merge: true }
    );
  } catch (err) {
    console.error('Failed to sync user profile document:', err);
  }
}

let redirectAuthPromise: Promise<User | null> | null = null;
let lastRedirectError: string | null = null;

export function getLastRedirectError(): string | null {
  return lastRedirectError;
}

/**
 * Process any pending redirect auth result during app initialization.
 * Guarded with a strict timeout so cross-origin iframe storage blocks in Chrome/Safari
 * can never hang the application in a permanent loading state.
 */
export async function handleRedirectAuth(): Promise<User | null> {
  if (redirectAuthPromise) {
    return redirectAuthPromise;
  }

  redirectAuthPromise = (async () => {
    try {
      lastRedirectError = null;

      // 2500ms safety timeout race: prevents infinite hanging if the __/auth/iframe
      // is blocked by third-party cookie/partitioned storage restrictions
      const timeoutPromise = new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), 2500);
      });

      const redirectPromise = (async () => {
        try {
          const result = await getRedirectResult(auth);
          if (result && result.user) {
            await syncUserProfile(result.user);
            return result.user;
          }
          return null;
        } catch (err: any) {
          throw err;
        }
      })();

      const userOrNull = await Promise.race([redirectPromise, timeoutPromise]);
      return userOrNull;
    } catch (error: any) {
      console.warn('Redirect auth handler noticed:', error);
      // Safe cancellations
      if (
        error?.code === 'auth/redirect-cancelled-by-user' ||
        error?.code === 'auth/popup-closed-by-user' ||
        error?.code === 'auth/cancelled-popup-request'
      ) {
        return null;
      }
      lastRedirectError = error?.message || 'Authentication encountered an error during redirect.';
      return null;
    }
  })();

  return redirectAuthPromise;
}

let isSigningIn = false;

/**
 * Sign in with Google using resilient popup-first flow with redirect fallback:
 * - Direct in-page popup flow is used for both desktop and mobile viewports (including 375x667 DevTools emulation)
 *   to avoid cross-origin iframe storage deadlock and full page reloads.
 * - If popup is strictly blocked by the browser (auth/popup-blocked), gracefully falls back to signInWithRedirect.
 * - Preserves session persistence, prompt: 'select_account', and profile synchronization.
 */
export async function signInWithGoogle(): Promise<User | null> {
  if (isSigningIn) {
    console.warn('Google sign-in is already in progress. Ignoring duplicate trigger.');
    return null;
  }
  isSigningIn = true;

  try {
    try {
      // Primary: signInWithPopup provides seamless authentication without page reload
      // and without cross-origin iframe storage partitioning issues
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      await syncUserProfile(user);
      return user;
    } catch (popupError: any) {
      // If popup was blocked by aggressive browser popup blocker, fall back to redirect
      if (popupError?.code === 'auth/popup-blocked') {
        console.warn('Popup was blocked by browser. Falling back to signInWithRedirect.');
        await signInWithRedirect(auth, googleProvider);
        return null;
      }
      // Re-throw user cancellations and other standard errors
      throw popupError;
    }
  } catch (error) {
    throw error;
  } finally {
    isSigningIn = false;
  }
}

/**
 * Sign out
 */
export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

/**
 * Listen to auth state changes
 */
export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

/**
 * Save or update an interaction entry in Firestore under /users/{userId}/interactions/{interactionId}
 */
export async function saveInteractionEntry(
  userId: string,
  entry: InteractionEntry
): Promise<void> {
  if (!userId) throw new Error('User ID is required to save interaction');
  if (!entry.id) throw new Error('Interaction ID is required');

  const docRef = doc(db, 'users', userId, 'interactions', entry.id);
  const sanitized = stripUndefined({
    ...entry,
    userId,
    updatedAt: new Date().toISOString(),
  });

  await setDoc(docRef, sanitized, { merge: true });
}

/**
 * Delete an interaction entry from Firestore
 * Validates active authenticated session and ownership
 */
export async function deleteInteractionEntry(
  userId: string,
  entryId: string
): Promise<void> {
  const currentAuthUser = auth.currentUser;
  if (!currentAuthUser) {
    throw new Error('Authentication required: You must be signed in to delete an entry.');
  }

  if (currentAuthUser.uid !== userId) {
    throw new Error('Unauthorized: You can only delete your own reflections.');
  }

  if (!entryId || typeof entryId !== 'string') {
    throw new Error('Invalid entry identifier specified for deletion.');
  }

  const docRef = doc(db, 'users', userId, 'interactions', entryId);
  await deleteDoc(docRef);
}

/**
 * Subscribe to the real-time list of interaction entries for a user
 */
export function subscribeToUserInteractions(
  userId: string,
  onData: (entries: InteractionEntry[]) => void,
  onError?: (err: Error) => void
) {
  if (!userId) {
    onData([]);
    return () => {};
  }

  const collRef = collection(db, 'users', userId, 'interactions');
  const q = query(collRef, orderBy('updatedAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const entries: InteractionEntry[] = [];
      snapshot.forEach((docSnap) => {
        entries.push(docSnap.data() as InteractionEntry);
      });
      onData(entries);
    },
    (err) => {
      console.error('Error fetching interactions:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Save or update a single Memory Node
 */
export async function saveMemoryNode(
  userId: string,
  node: MemoryNode
): Promise<void> {
  if (!userId) throw new Error('User ID is required');
  if (!node.id) throw new Error('Node ID is required');

  const docRef = doc(db, 'users', userId, 'memory_nodes', node.id);
  const sanitized = stripUndefined({
    ...node,
    userId,
    updatedAt: new Date().toISOString(),
  });

  await setDoc(docRef, sanitized, { merge: true });
}

/**
 * Delete a Memory Node and any connected relationships
 */
export async function deleteMemoryNode(
  userId: string,
  nodeId: string,
  existingRelationships: MemoryRelationship[] = []
): Promise<void> {
  const currentAuthUser = auth.currentUser;
  if (!currentAuthUser || currentAuthUser.uid !== userId) {
    throw new Error('Unauthorized: You can only delete your own memory nodes.');
  }

  const batch = writeBatch(db);
  const nodeRef = doc(db, 'users', userId, 'memory_nodes', nodeId);
  batch.delete(nodeRef);

  // Delete relationships referencing this node
  const relatedRels = existingRelationships.filter(
    (r) => r.sourceNodeId === nodeId || r.targetNodeId === nodeId
  );
  for (const rel of relatedRels) {
    const relRef = doc(db, 'users', userId, 'memory_relationships', rel.id);
    batch.delete(relRef);
  }

  await batch.commit();
}

/**
 * Update memory node status (e.g. archive / active / completed)
 */
export async function updateMemoryNodeStatus(
  userId: string,
  nodeId: string,
  status: MemoryNode['status']
): Promise<void> {
  const currentAuthUser = auth.currentUser;
  if (!currentAuthUser || currentAuthUser.uid !== userId) {
    throw new Error('Unauthorized');
  }

  const docRef = doc(db, 'users', userId, 'memory_nodes', nodeId);
  await setDoc(
    docRef,
    stripUndefined({
      status,
      updatedAt: new Date().toISOString(),
    }),
    { merge: true }
  );
}

/**
 * Batch save extracted memory nodes and relationships to Firestore
 */
export async function saveMemoryGraphBatch(
  userId: string,
  nodes: MemoryNode[],
  relationships: MemoryRelationship[]
): Promise<void> {
  const currentAuthUser = auth.currentUser;
  if (!currentAuthUser || currentAuthUser.uid !== userId) {
    throw new Error('Unauthorized: Cannot write memory graph for another user.');
  }

  if (nodes.length === 0 && relationships.length === 0) return;

  const batch = writeBatch(db);

  for (const node of nodes) {
    const nodeRef = doc(db, 'users', userId, 'memory_nodes', node.id);
    batch.set(
      nodeRef,
      stripUndefined({
        ...node,
        userId,
        updatedAt: node.updatedAt || new Date().toISOString(),
      }),
      { merge: true }
    );
  }

  for (const rel of relationships) {
    const relRef = doc(db, 'users', userId, 'memory_relationships', rel.id);
    batch.set(
      relRef,
      stripUndefined({
        ...rel,
        userId,
      }),
      { merge: true }
    );
  }

  await batch.commit();
}

/**
 * Subscribe to the authenticated user's Memory Graph (Nodes & Relationships)
 */
export function subscribeToUserMemoryGraph(
  userId: string,
  onData: (data: MemoryGraphData) => void,
  onError?: (err: Error) => void
) {
  if (!userId) {
    onData({ nodes: [], relationships: [] });
    return () => {};
  }

  const nodesColl = collection(db, 'users', userId, 'memory_nodes');
  const relsColl = collection(db, 'users', userId, 'memory_relationships');

  let currentNodes: MemoryNode[] = [];
  let currentRels: MemoryRelationship[] = [];

  const unsubNodes = onSnapshot(
    nodesColl,
    (snapshot) => {
      const nodes: MemoryNode[] = [];
      snapshot.forEach((docSnap) => {
        nodes.push(docSnap.data() as MemoryNode);
      });
      currentNodes = nodes;
      onData({ nodes: currentNodes, relationships: currentRels });
    },
    (err) => {
      console.error('Error listening to memory nodes:', err);
      if (onError) onError(err);
    }
  );

  const unsubRels = onSnapshot(
    relsColl,
    (snapshot) => {
      const rels: MemoryRelationship[] = [];
      snapshot.forEach((docSnap) => {
        rels.push(docSnap.data() as MemoryRelationship);
      });
      currentRels = rels;
      onData({ nodes: currentNodes, relationships: currentRels });
    },
    (err) => {
      console.error('Error listening to memory relationships:', err);
      if (onError) onError(err);
    }
  );

  return () => {
    unsubNodes();
    unsubRels();
  };
}

/**
 * Save or update a Decision Record in user's isolated Firestore subcollection
 */
export async function saveDecisionRecord(
  userId: string,
  record: DecisionRecord
): Promise<void> {
  const currentAuthUser = auth.currentUser;
  if (!currentAuthUser) {
    throw new Error('Authentication required: You must be signed in to save a decision.');
  }

  if (currentAuthUser.uid !== userId) {
    throw new Error('Unauthorized: You can only save decisions to your own account.');
  }

  if (!record.id) {
    throw new Error('Decision record identifier is required.');
  }

  const docRef = doc(db, 'users', userId, 'decisions', record.id);
  const sanitized = stripUndefined({
    ...record,
    userId,
    updatedAt: new Date().toISOString(),
  });

  await setDoc(docRef, sanitized, { merge: true });
}

/**
 * Delete a Decision Record from user's isolated Firestore partition.
 * NOTE: Preserves source journal entries without modifying or deleting them.
 */
export async function deleteDecisionRecord(
  userId: string,
  decisionId: string
): Promise<void> {
  const currentAuthUser = auth.currentUser;
  if (!currentAuthUser) {
    throw new Error('Authentication required: You must be signed in to delete a decision.');
  }

  if (currentAuthUser.uid !== userId) {
    throw new Error('Unauthorized: You can only delete your own decisions.');
  }

  if (!decisionId || typeof decisionId !== 'string') {
    throw new Error('Invalid decision identifier specified for deletion.');
  }

  const docRef = doc(db, 'users', userId, 'decisions', decisionId);
  await deleteDoc(docRef);
}

/**
 * Subscribe to the real-time list of saved decisions for a user
 */
export function subscribeToUserDecisions(
  userId: string,
  onData: (decisions: DecisionRecord[]) => void,
  onError?: (err: Error) => void
) {
  if (!userId) {
    onData([]);
    return () => {};
  }

  const collRef = collection(db, 'users', userId, 'decisions');
  const q = query(collRef, orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const decisions: DecisionRecord[] = [];
      snapshot.forEach((docSnap) => {
        decisions.push(docSnap.data() as DecisionRecord);
      });
      onData(decisions);
    },
    (err) => {
      console.error('Error fetching decisions:', err);
      if (onError) onError(err);
    }
  );
}



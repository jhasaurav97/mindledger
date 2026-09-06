import type { User } from 'firebase/auth';
import type {
  NotionIntegrationStatus,
  NotionDestinationPage,
  NotionExportResponse,
  InteractionEntry,
} from '../types';

/**
 * Fetch current Notion integration status for authenticated user
 */
export async function getNotionStatus(user: User): Promise<NotionIntegrationStatus> {
  if (!user) throw new Error('Authentication required.');
  const idToken = await user.getIdToken();

  const res = await fetch('/api/integrations/notion/status', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error('Failed to retrieve Notion connection status.');
  }

  return res.json();
}

/**
 * Initiate Notion OAuth connection flow
 */
export async function initiateNotionConnect(
  user: User
): Promise<{ url: string; state: string; configured: boolean }> {
  if (!user) throw new Error('Authentication required.');
  const idToken = await user.getIdToken();

  const res = await fetch('/api/integrations/notion/connect', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to start Notion authorization.');
  }

  return data;
}

/**
 * Open Notion OAuth popup and listen for secure postMessage response from callback
 */
export function openNotionConnectPopup(
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
  try {
    popup = window.open(
      authUrl,
      'notion_oauth_bridge',
      `width=${width},height=${height},left=${left},top=${top},status=no,toolbar=no,menubar=no`
    );
  } catch (err) {
    console.warn('Popup attempt error:', err);
  }

  // Graceful fallback to current-window OAuth flow if popup blockers prevent popup
  if (!popup || popup.closed || typeof popup.closed === 'undefined') {
    window.location.href = authUrl;
    return null;
  }

  let isSettled = false;

  const cleanup = () => {
    window.removeEventListener('message', messageHandler);
    window.removeEventListener('focus', handleWindowFocus);
    if (checkClosedInterval) {
      clearInterval(checkClosedInterval);
    }
  };

  const messageHandler = (event: MessageEvent) => {
    // Security 1: Verify event origin or source window matches the MindLedger application
    const appOrigin = window.location.origin;
    const prodOrigin = 'https://mindledger.ai.studio';
    const isAllowedSource =
      event.origin === appOrigin ||
      event.origin === prodOrigin ||
      (popup && event.source === popup);

    if (!isAllowedSource) {
      return;
    }

    // Security 2: Validate event.data structure
    if (!event.data || typeof event.data !== 'object') return;

    // Security 3: Validate event.data.type before acting (never accept credentials or tokens from message)
    if (
      event.data.type === 'mindledger:notion-oauth-success' ||
      event.data.type === 'NOTION_AUTH_SUCCESS'
    ) {
      isSettled = true;
      cleanup();
      try {
        if (popup && !popup.closed) popup.close();
      } catch (e) {}
      onSuccess(typeof event.data.handoff === 'string' ? event.data.handoff : undefined);
    } else if (
      event.data.type === 'mindledger:notion-oauth-error' ||
      event.data.type === 'NOTION_AUTH_ERROR'
    ) {
      isSettled = true;
      cleanup();
      try {
        if (popup && !popup.closed) popup.close();
      } catch (e) {}
      const safeError =
        typeof event.data.error === 'string' && event.data.error.trim().length > 0
          ? event.data.error
          : 'Notion connection failed.';
      onError(safeError);
    }
  };

  window.addEventListener('message', messageHandler);

  // If popup closes without sending a success/error message:
  // Perform lightweight status check when focus returns to the main window
  const handleWindowFocus = () => {
    if (popup && popup.closed && !isSettled) {
      isSettled = true;
      cleanup();
      onPopupClosedWithoutMessage?.();
    }
  };
  window.addEventListener('focus', handleWindowFocus);

  // Lightweight check interval to clean up listener when user manually closes popup
  const checkClosedInterval = setInterval(() => {
    if (popup.closed) {
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

/**
 * Fetch accessible Notion pages for destination selection
 */
export async function fetchNotionPages(user: User): Promise<NotionDestinationPage[]> {
  if (!user) throw new Error('Authentication required.');
  const idToken = await user.getIdToken();

  const res = await fetch('/api/integrations/notion/pages', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to fetch Notion pages.');
  }

  return data.pages || [];
}

/**
 * Save selected Notion destination page
 */
export async function saveNotionDestination(
  user: User,
  pageId: string,
  pageTitle: string
): Promise<{ destinationPageId: string; destinationPageTitle: string }> {
  if (!user) throw new Error('Authentication required.');
  const idToken = await user.getIdToken();

  const res = await fetch('/api/integrations/notion/destination', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ pageId, pageTitle }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to save destination page.');
  }

  return data;
}

/**
 * Export reflection to Notion
 */
export async function exportToNotion(
  user: User,
  options: {
    reflectionId: string;
    reflectionData?: InteractionEntry;
    destinationPageId?: string;
    forceNew?: boolean;
  }
): Promise<NotionExportResponse> {
  if (!user) throw new Error('Authentication required.');
  const idToken = await user.getIdToken();

  const res = await fetch('/api/integrations/notion/export', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(options),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to export reflection to Notion.');
  }

  return data;
}

/**
 * Disconnect user Notion integration and remove credentials
 */
export async function disconnectNotion(user: User): Promise<void> {
  if (!user) throw new Error('Authentication required.');
  const idToken = await user.getIdToken();

  const res = await fetch('/api/integrations/notion/disconnect', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to disconnect Notion.');
  }
}

/**
 * Complete durable persistence of Notion connection using sealed multi-instance handoff token
 */
export async function syncNotionHandoff(
  user: User,
  handoff: string
): Promise<{ success: boolean; workspaceName?: string }> {
  if (!user) throw new Error('Authentication required.');
  const idToken = await user.getIdToken();

  const res = await fetch('/api/integrations/notion/sync', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ handoff }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to finalize Notion synchronization.');
  }

  return res.json();
}

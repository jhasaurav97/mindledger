import React, { useState, useEffect } from 'react';
import {
  ExternalLink,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Unlink,
  FileText,
  Search,
  BookOpen,
  ArrowRight,
  Shield,
  Layers,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import type { NotionIntegrationStatus, NotionDestinationPage } from '../types';
import {
  getNotionStatus,
  initiateNotionConnect,
  openNotionConnectPopup,
  fetchNotionPages,
  saveNotionDestination,
  disconnectNotion,
  syncNotionHandoff,
} from '../lib/notion';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';

interface NotionSettingsModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange?: (status: NotionIntegrationStatus) => void;
}

export const NotionSettingsModal: React.FC<NotionSettingsModalProps> = ({
  user,
  isOpen,
  onClose,
  onStatusChange,
}) => {
  const [status, setStatus] = useState<NotionIntegrationStatus | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [connectSuccessMsg, setConnectSuccessMsg] = useState<string | null>(null);

  // Destination pages state
  const [pages, setPages] = useState<NotionDestinationPage[]>([]);
  const [isLoadingPages, setIsLoadingPages] = useState(false);
  const [pagesError, setPagesError] = useState<string | null>(null);
  const [pageSearchQuery, setPageSearchQuery] = useState('');
  const [selectedPageId, setSelectedPageId] = useState<string>('');
  const [isSavingDestination, setIsSavingDestination] = useState(false);
  const [isSelectingDestination, setIsSelectingDestination] = useState(false);

  // Disconnect confirmation state
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);

  // Load status on open
  useEffect(() => {
    if (isOpen && user) {
      loadStatus();
    } else {
      setConnectError(null);
      setConnectSuccessMsg(null);
      setIsSelectingDestination(false);
      setShowDisconnectConfirm(false);
    }
  }, [isOpen, user?.uid]);

  const loadStatus = async () => {
    if (!user) return;
    setIsLoadingStatus(true);
    setConnectError(null);
    try {
      const data = await getNotionStatus(user);
      setStatus(data);
      if (data.destinationPageId) {
        setSelectedPageId(data.destinationPageId);
      }
      onStatusChange?.(data);
    } catch (err: any) {
      console.error('Failed to load Notion status:', err);
      setConnectError(err?.message || 'Could not load Notion connection status.');
    } finally {
      setIsLoadingStatus(false);
    }
  };

  const handleStartConnect = async () => {
    if (!user) return;
    setIsConnecting(true);
    setConnectError(null);
    setConnectSuccessMsg(null);

    try {
      const { url } = await initiateNotionConnect(user);

      openNotionConnectPopup(
        url,
        // On success:
        async (handoff?: string) => {
          if (handoff && user) {
            try {
              await syncNotionHandoff(user, handoff);
            } catch (syncErr) {
              console.warn('Post-oauth handoff sync notice:', syncErr);
            }
          }
          setIsConnecting(false);
          setConnectSuccessMsg('Notion connected successfully!');
          await loadStatus();
          await handleLoadPages();
        },
        // On error:
        (error) => {
          setIsConnecting(false);
          setConnectError(error);
        },
        // On popup closed without explicit message (lightweight single status refresh on return):
        async () => {
          if (!user) return;
          try {
            const data = await getNotionStatus(user);
            if (data.connected) {
              setStatus(data);
              setConnectSuccessMsg('Notion connected successfully!');
              onStatusChange?.(data);
              await handleLoadPages();
            } else {
              setConnectError('Authorization window closed before completing.');
            }
          } catch {
            setConnectError('Authorization window closed before completing.');
          } finally {
            setIsConnecting(false);
          }
        }
      );
    } catch (err: any) {
      setIsConnecting(false);
      setConnectError(err?.message || 'Failed to start Notion authorization.');
    }
  };

  const handleLoadPages = async () => {
    if (!user) return;
    setIsLoadingPages(true);
    setPagesError(null);
    setIsSelectingDestination(true);

    try {
      const fetched = await fetchNotionPages(user);
      setPages(fetched);
      if (fetched.length > 0 && !selectedPageId) {
        setSelectedPageId(fetched[0].id);
      }
    } catch (err: any) {
      console.error('Failed to load pages:', err);
      setPagesError(err?.message || 'Could not list accessible Notion pages.');
    } finally {
      setIsLoadingPages(false);
    }
  };

  const handleSaveDestination = async () => {
    if (!user || !selectedPageId) return;
    setIsSavingDestination(true);
    setPagesError(null);

    try {
      const selectedPage = pages.find((p) => p.id === selectedPageId);
      const pageTitle = selectedPage?.title || 'Selected Destination Page';
      await saveNotionDestination(user, selectedPageId, pageTitle);
      await loadStatus();
      setIsSelectingDestination(false);
      setConnectSuccessMsg(`Destination set to "${pageTitle}".`);
    } catch (err: any) {
      setPagesError(err?.message || 'Failed to set destination page.');
    } finally {
      setIsSavingDestination(false);
    }
  };

  const handleDisconnect = async () => {
    if (!user) return;
    setIsDisconnecting(true);
    setConnectError(null);

    try {
      await disconnectNotion(user);
      setStatus(null);
      setPages([]);
      setSelectedPageId('');
      setIsSelectingDestination(false);
      setShowDisconnectConfirm(false);
      setConnectSuccessMsg('Notion disconnected and credentials cleared securely.');
      await loadStatus();
    } catch (err: any) {
      setConnectError(err?.message || 'Failed to disconnect Notion.');
    } finally {
      setIsDisconnecting(false);
    }
  };

  const filteredPages = pages.filter((p) =>
    p.title.toLowerCase().includes(pageSearchQuery.toLowerCase().trim())
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title="Notion Knowledge Bridge"
      description="Export your reflections into structured Notion knowledge pages."
      icon={
        <div className="w-5 h-5 rounded-md bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center font-bold text-xs">
          N
        </div>
      }
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
            <Shield className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>OAuth 2.0 • AES-256 Encrypted</span>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Status Alerts */}
        {connectError && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-start gap-2 text-xs text-rose-800 dark:text-rose-200">
            <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold">Connection Notice:</span> {connectError}
            </div>
          </div>
        )}

        {connectSuccessMsg && (
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 flex items-start gap-2 text-xs text-emerald-800 dark:text-emerald-200">
            <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{connectSuccessMsg}</div>
          </div>
        )}

        {/* Loading Spinner */}
        {isLoadingStatus ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
            <p className="text-xs text-slate-500">Checking Notion connection status...</p>
          </div>
        ) : !status?.connected ? (
          /* Disconnected State */
          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 shadow-xs border border-slate-200 dark:border-slate-700 flex items-center justify-center mx-auto text-slate-900 dark:text-white font-bold text-xl">
                N
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Connect Your Notion Workspace
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                  Turn journal dialogues into permanent, structured knowledge pages in Notion with executive summaries, action checklists, and evidence grounding.
                </p>
              </div>

              {/* Status Badge */}
              <div className="pt-2">
                <Badge variant="default" className="text-xs">
                  Disconnected
                </Badge>
              </div>

              {/* Primary Connect Button */}
              <div className="pt-3">
                <Button
                  id="connect-notion-btn"
                  variant="primary"
                  size="md"
                  onClick={handleStartConnect}
                  isLoading={isConnecting}
                  className="w-full sm:w-auto shadow-xs"
                >
                  {isConnecting ? 'Connecting in Popup...' : 'Connect Notion'}
                </Button>
              </div>
            </div>

            {/* Security Guarantee Box */}
            <div className="p-4 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/70 dark:border-indigo-900/40 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-950 dark:text-indigo-200">
                <Shield className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Zero-Exposure Security Standard</span>
              </div>
              <ul className="text-[11px] text-indigo-900/80 dark:text-indigo-300/80 space-y-1 list-disc list-inside leading-relaxed">
                <li>Uses Notion Public Connection OAuth 2.0 with cryptographic state validation.</li>
                <li>Access tokens are AES-256-GCM encrypted server-side and never exposed to the client.</li>
                <li>Exports occur only when you click "Save to Notion" — never automatically.</li>
                <li>Strictly user-isolated: your Notion connection is bound only to your UID.</li>
              </ul>
            </div>
          </div>
        ) : (
          /* Connected State */
          <div className="space-y-5">
            {/* Active Workspace Card */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-bold text-base text-slate-800 dark:text-slate-100">
                  {status.workspaceIcon ? (
                    <span className="text-lg">{status.workspaceIcon}</span>
                  ) : (
                    'N'
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {status.workspaceName || 'Notion Workspace'}
                    </h4>
                    <Badge variant="emerald" className="text-[10px] py-0.5">
                      Connected
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                    Authorized on{' '}
                    {status.connectedAt ? new Date(status.connectedAt).toLocaleDateString() : 'Active session'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDisconnectConfirm(true)}
                  className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40 border-rose-200 dark:border-rose-900/50 text-xs"
                  leftIcon={<Unlink className="w-3.5 h-3.5" />}
                >
                  Disconnect
                </Button>
              </div>
            </div>

            {/* Disconnect confirmation dialog */}
            {showDisconnectConfirm && (
              <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 space-y-3">
                <div className="text-xs font-bold text-rose-900 dark:text-rose-200">
                  Disconnect Notion Workspace?
                </div>
                <p className="text-xs text-rose-800 dark:text-rose-300 leading-relaxed">
                  This will remove your encrypted Notion credentials from the server. You can reconnect anytime. Your exported Notion pages will remain untouched in your Notion workspace.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    id="confirm-disconnect-notion-btn"
                    variant="destructive"
                    size="sm"
                    onClick={handleDisconnect}
                    isLoading={isDisconnecting}
                  >
                    Yes, Disconnect
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDisconnectConfirm(false)}
                    disabled={isDisconnecting}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Destination Configuration */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <Layers className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Default Destination Page</span>
                </div>
                {!isSelectingDestination && (
                  <button
                    type="button"
                    onClick={handleLoadPages}
                    className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 cursor-pointer"
                  >
                    {status.destinationPageId ? 'Change Destination' : 'Select Destination'}
                  </button>
                )}
              </div>

              {!isSelectingDestination ? (
                /* Display current destination */
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                  {status.destinationPageId ? (
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center shrink-0">
                        <FileText className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                          {status.destinationPageTitle || 'Configured Page'}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono truncate">
                          ID: {status.destinationPageId}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>No destination page chosen yet. Click "Select Destination" to pick where exported reflections will be created.</span>
                    </div>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLoadPages}
                    className="shrink-0 text-xs"
                  >
                    {status.destinationPageId ? 'Change' : 'Choose Page'}
                  </Button>
                </div>
              ) : (
                /* Destination Selection Drawer */
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      Accessible Notion Pages
                    </span>
                    <button
                      type="button"
                      onClick={handleLoadPages}
                      disabled={isLoadingPages}
                      className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                      title="Refresh pages list"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isLoadingPages ? 'animate-spin' : ''}`} />
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    Select the Notion page under which new reflection sub-pages will be created. (Note: Only pages you shared with the MindLedger integration during OAuth are listed).
                  </p>

                  {/* Search input */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search accessible pages..."
                      value={pageSearchQuery}
                      onChange={(e) => setPageSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  {pagesError && (
                    <p className="text-xs text-rose-600 dark:text-rose-400">{pagesError}</p>
                  )}

                  {isLoadingPages ? (
                    <div className="py-6 flex items-center justify-center gap-2 text-xs text-slate-400">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Retrieving pages from Notion...</span>
                    </div>
                  ) : filteredPages.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400">
                      {pages.length === 0
                        ? 'No accessible pages found. Please ensure you granted access to at least one page in your Notion workspace.'
                        : 'No pages matching your search.'}
                    </div>
                  ) : (
                    <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                      {filteredPages.map((p) => {
                        const isSelected = selectedPageId === p.id;
                        return (
                          <div
                            key={p.id}
                            onClick={() => setSelectedPageId(p.id)}
                            className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-700 text-indigo-950 dark:text-indigo-100 font-semibold'
                                : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <span className="text-sm shrink-0">{p.icon || '📄'}</span>
                              <span className="truncate">{p.title}</span>
                            </div>
                            {isSelected && (
                              <CheckCircle className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsSelectingDestination(false)}
                      disabled={isSavingDestination}
                    >
                      Cancel
                    </Button>
                    <Button
                      id="save-destination-btn"
                      variant="primary"
                      size="sm"
                      onClick={handleSaveDestination}
                      isLoading={isSavingDestination}
                      disabled={!selectedPageId}
                    >
                      Save Destination
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* How to use info */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-1">
              <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-amber-500" />
                <span>How to Save Reflections to Notion</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Click the <strong className="text-slate-800 dark:text-slate-200">"Save to Notion"</strong> button on any active reflection in the Canvas, on executive summary insights, or in the Past Entries archive. MindLedger will create a clean, structured Notion page under your designated destination.
              </p>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

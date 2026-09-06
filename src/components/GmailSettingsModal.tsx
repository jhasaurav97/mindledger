import React, { useState, useEffect } from 'react';
import {
  Mail,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Unlink,
  Search,
  Sparkles,
  ArrowRight,
  Shield,
  Clock,
  Calendar,
  AlertCircle,
  Scale,
  BookOpen,
  ChevronRight,
  Check,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import type {
  GmailIntegrationStatus,
  GmailMessageSummary,
  GmailMessageDetail,
  GmailAnalysisResult,
  InteractionEntry,
} from '../types';
import {
  getGmailStatus,
  initiateGmailConnect,
  openGmailConnectPopup,
  syncGmailHandoff,
  fetchGmailMessages,
  fetchGmailMessageDetail,
  analyzeGmailMessage,
  disconnectGmail,
} from '../lib/gmail';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';

interface GmailSettingsModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange?: (status: GmailIntegrationStatus) => void;
  onCreateReflection?: (draft: Partial<InteractionEntry>) => void;
  onUseInDecisionLab?: (context: { question: string; context: string; criteria: string[] }) => void;
}

export const GmailSettingsModal: React.FC<GmailSettingsModalProps> = ({
  user,
  isOpen,
  onClose,
  onStatusChange,
  onCreateReflection,
  onUseInDecisionLab,
}) => {
  const [status, setStatus] = useState<GmailIntegrationStatus | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [connectSuccessMsg, setConnectSuccessMsg] = useState<string | null>(null);

  // Email Selection State
  const [messages, setMessages] = useState<GmailMessageSummary[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [selectedMessageDetail, setSelectedMessageDetail] = useState<GmailMessageDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<GmailAnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Disconnect confirmation state
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);

  // Active sub-tab when connected
  const [activeTab, setActiveTab] = useState<'messages' | 'analysis'>('messages');

  // Load status when modal opens
  useEffect(() => {
    if (isOpen && user) {
      loadStatus();
    } else {
      setConnectError(null);
      setConnectSuccessMsg(null);
      setShowDisconnectConfirm(false);
      setAnalysisError(null);
    }
  }, [isOpen, user?.uid]);

  const loadStatus = async () => {
    if (!user) return;
    setIsLoadingStatus(true);
    setConnectError(null);
    try {
      const data = await getGmailStatus(user);
      setStatus(data);
      onStatusChange?.(data);

      if (data.connected) {
        console.log('[MILESTONE] GMAIL_UI_CONNECTED');
        loadMessages();
      }
    } catch (err: any) {
      console.error('Failed to load Gmail status:', err);
      setConnectError(err?.message || 'Could not retrieve Gmail connection status.');
    } finally {
      setIsLoadingStatus(false);
    }
  };

  const loadMessages = async (query?: string) => {
    if (!user) return;
    setIsLoadingMessages(true);
    setMessagesError(null);
    try {
      const list = await fetchGmailMessages(user, query || searchQuery);
      setMessages(list);
    } catch (err: any) {
      console.error('Failed to load Gmail messages:', err);
      setMessagesError(err?.message || 'Could not load emails from Gmail.');
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const handleStartConnect = async () => {
    if (!user) return;
    console.log('[MILESTONE] GMAIL_OAUTH_CONNECT_STARTED');
    setIsConnecting(true);
    setConnectError(null);
    setConnectSuccessMsg(null);

    try {
      const { url } = await initiateGmailConnect(user);

      openGmailConnectPopup(
        url,
        async (handoff?: string) => {
          setIsConnecting(false);
          setConnectError(null);
          setConnectSuccessMsg('Gmail connected successfully!');
          if (handoff && user) {
            try {
              await syncGmailHandoff(user, handoff);
            } catch (e) {
              console.warn('Handoff sync error:', e);
            }
          }
          await loadStatus();
        },
        (errorMsg: string) => {
          setIsConnecting(false);
          setConnectError(errorMsg);
        },
        async () => {
          // Closed without postMessage: perform one lightweight status refresh
          if (!user) {
            setIsConnecting(false);
            return;
          }
          try {
            const data = await getGmailStatus(user);
            if (data.connected) {
              console.log('[MILESTONE] GMAIL_UI_CONNECTED');
              setStatus(data);
              setConnectSuccessMsg('Gmail connected successfully!');
              onStatusChange?.(data);
              loadMessages();
            }
          } catch (e) {
            console.warn('Fallback status check error:', e);
          } finally {
            setIsConnecting(false);
          }
        }
      );
    } catch (err: any) {
      setIsConnecting(false);
      setConnectError(err?.message || 'Failed to start Gmail connection.');
    }
  };

  const handleSelectMessage = async (msg: GmailMessageSummary) => {
    setSelectedMessageId(msg.id);
    setAnalysisResult(null);
    setAnalysisError(null);
    setIsLoadingDetail(true);

    try {
      if (!user) return;
      const detail = await fetchGmailMessageDetail(user, msg.id);
      setSelectedMessageDetail(detail);
    } catch (err: any) {
      setAnalysisError(err?.message || 'Failed to fetch email details.');
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleAnalyzeSelectedEmail = async () => {
    if (!user || !selectedMessageId) return;
    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const result = await analyzeGmailMessage(user, selectedMessageId);
      setAnalysisResult(result);
      setActiveTab('analysis');
    } catch (err: any) {
      console.error('Email analysis failed:', err);
      setAnalysisError(err?.message || 'Failed to analyze email with Gemini.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDisconnect = async () => {
    if (!user) return;
    setIsDisconnecting(true);
    try {
      await disconnectGmail(user);
      setStatus({ connected: false, configured: true });
      setMessages([]);
      setSelectedMessageId(null);
      setSelectedMessageDetail(null);
      setAnalysisResult(null);
      setShowDisconnectConfirm(false);
      setConnectSuccessMsg('Gmail account has been disconnected.');
      onStatusChange?.({ connected: false, configured: true });
    } catch (err: any) {
      setConnectError(err?.message || 'Failed to disconnect Gmail.');
    } finally {
      setIsDisconnecting(false);
    }
  };

  // Convert analysis to Reflection draft
  const handleCreateReflection = () => {
    if (!analysisResult) return;
    const { sourceEmail, mindledgerAnalysis } = analysisResult;

    const actionItemsFormatted =
      mindledgerAnalysis.actionItems.length > 0
        ? `\n\n### Action Items\n${mindledgerAnalysis.actionItems.map((item) => `- [ ] ${item}`).join('\n')}`
        : '';

    const deadlinesFormatted =
      mindledgerAnalysis.deadlines.length > 0 &&
      !mindledgerAnalysis.deadlines.some((d) => d.toLowerCase().includes('none'))
        ? `\n\n### Deadlines & Timing\n${mindledgerAnalysis.deadlines.map((d) => `- ⏳ **${d}**`).join('\n')}`
        : '';

    const opportunitiesFormatted =
      mindledgerAnalysis.opportunities.length > 0
        ? `\n\n### Strategic Opportunities\n${mindledgerAnalysis.opportunities.map((o) => `- 💡 ${o}`).join('\n')}`
        : '';

    const factsFormatted =
      sourceEmail.relevantFacts.length > 0
        ? `\n\n### Grounded Facts from Email\n${sourceEmail.relevantFacts.map((f) => `- ${f}`).join('\n')}`
        : '';

    const content = `> **Source: Gmail Email**\n> **From:** ${sourceEmail.sender}\n> **Subject:** ${sourceEmail.subject}\n> **Date:** ${sourceEmail.date}\n\n### Executive Summary\n${mindledgerAnalysis.summary}${factsFormatted}${actionItemsFormatted}${deadlinesFormatted}${opportunitiesFormatted}\n\n### Suggested Next Step\n${mindledgerAnalysis.suggestedNextStep}`;

    const draft: Partial<InteractionEntry> = {
      title: `Email Reflection: ${sourceEmail.subject.slice(0, 50)}`,
      category: 'work',
      tags: ['gmail', 'email-intelligence', 'action-items'],
      messages: [
        {
          id: `gmail-source-${Date.now()}`,
          role: 'user',
          content,
          timestamp: new Date().toISOString(),
        },
      ],
      summary: mindledgerAnalysis.summary,
      actionItems: mindledgerAnalysis.actionItems,
      keyInsights: mindledgerAnalysis.opportunities,
    };

    onCreateReflection?.(draft);
    onClose();
  };

  // Convert analysis to Decision Lab context
  const handleUseInDecisionLab = () => {
    if (!analysisResult) return;
    const { sourceEmail, mindledgerAnalysis } = analysisResult;

    const question = `How should I proceed regarding: "${sourceEmail.subject}"?`;
    const context = `[EXTERNAL CONTEXT: Gmail Email]
Sender: ${sourceEmail.sender}
Date: ${sourceEmail.date}
Subject: ${sourceEmail.subject}

Email Summary:
${mindledgerAnalysis.summary}

Key Facts:
${sourceEmail.relevantFacts.map((f) => `- ${f}`).join('\n')}

Stated Risks / Constraints:
${mindledgerAnalysis.risks.map((r) => `- ${r}`).join('\n')}

Unknowns to Verify:
${mindledgerAnalysis.unknowns.map((u) => `- ${u}`).join('\n')}

Stated Deadlines:
${mindledgerAnalysis.deadlines.join(', ')}`;

    const criteria = [
      'Alignment with core priorities',
      'Timely resolution within deadlines',
      'Risk minimization',
    ];

    onUseInDecisionLab?.({
      question,
      context,
      criteria,
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="3xl"
      title={
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-red-500/10 dark:bg-red-500/20 text-red-600 dark:text-red-400 flex items-center justify-center font-bold text-sm">
            <Mail className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Gmail Intelligence Bridge
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Explicit, user-authorized email reflection & grounded decision synthesis
            </p>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Security & Scope Banner */}
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-xs">
          <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-slate-600 dark:text-slate-300 space-y-0.5">
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              Least Privilege & Privacy Guarantee:
            </span>{' '}
            MindLedger requests only{' '}
            <code className="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-mono text-[11px]">
              gmail.readonly
            </code>
            . No automatic inbox synchronization. No background reading. You choose exactly which
            email to inspect. Credentials are encrypted with AES-256-GCM.
          </div>
        </div>

        {/* Notifications & Error Alerts */}
        {connectError && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{connectError}</span>
          </div>
        )}

        {connectSuccessMsg && (
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{connectSuccessMsg}</span>
          </div>
        )}

        {/* Loading status state */}
        {isLoadingStatus ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-500 dark:text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
            <span className="text-xs font-medium">Checking Gmail authorization status...</span>
          </div>
        ) : !status?.connected ? (
          /* NOT CONNECTED STATE */
          <div className="p-6 rounded-2xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 text-center space-y-4 shadow-xs">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200/80 dark:border-red-800/60 flex items-center justify-center text-red-600 dark:text-red-400 shadow-2xs">
              <Mail className="w-7 h-7" />
            </div>

            <div className="max-w-md mx-auto space-y-1">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Connect your Gmail Account
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Seamlessly bring selected email communications into your MindLedger reflection canvas
                or Decision Lab. Extract grounded action items, commitments, and strategic
                perspectives with Gemini 3.6.
              </p>
            </div>

            <div className="pt-2">
              <Button
                variant="primary"
                onClick={handleStartConnect}
                isLoading={isConnecting}
                leftIcon={<Mail className="w-4 h-4" />}
                className="bg-red-600 hover:bg-red-700 active:bg-red-800 text-white shadow-xs px-5 py-2 text-xs font-semibold"
              >
                {isConnecting ? 'Authorizing with Google...' : 'Connect Gmail'}
              </Button>
            </div>
          </div>
        ) : (
          /* CONNECTED STATE */
          <div className="space-y-4">
            {/* Account Card Header */}
            <div className="p-4 rounded-xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200/80 dark:border-red-800/60 text-red-600 dark:text-red-400 flex items-center justify-center">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {status.emailAddress || 'Connected Google Account'}
                    </span>
                    <Badge variant="emerald" icon={<CheckCircle className="w-3 h-3 text-emerald-500" />}>
                      Active Bridge
                    </Badge>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                    <span>Read-Only</span>
                    <span>•</span>
                    <span>No Background Sync</span>
                    {status.connectedAt && (
                      <>
                        <span>•</span>
                        <span>Connected {new Date(status.connectedAt).toLocaleDateString()}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => loadMessages()}
                  disabled={isLoadingMessages}
                  className="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Refresh emails"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingMessages ? 'animate-spin' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={() => setShowDisconnectConfirm(true)}
                  className="text-xs text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:underline px-2 py-1 font-medium transition-colors cursor-pointer"
                >
                  Disconnect
                </button>
              </div>
            </div>

            {/* Disconnect Confirmation Alert */}
            {showDisconnectConfirm && (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-rose-800 dark:text-rose-300">
                  <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  <span>Disconnect Gmail Intelligence Bridge?</span>
                </div>
                <p className="text-[11px] text-rose-700 dark:text-rose-400 leading-relaxed">
                  Stored access and refresh credentials will be permanently erased. Existing
                  reflections and decisions created in MindLedger will remain completely untouched.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDisconnect}
                    isLoading={isDisconnecting}
                    leftIcon={<Unlink className="w-3.5 h-3.5" />}
                  >
                    Confirm Disconnect
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowDisconnectConfirm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Sub-tabs: Recent Emails vs Grounded Analysis */}
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
              <button
                type="button"
                onClick={() => setActiveTab('messages')}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  activeTab === 'messages'
                    ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Recent Emails
              </button>
              {analysisResult && (
                <button
                  type="button"
                  onClick={() => setActiveTab('analysis')}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
                    activeTab === 'analysis'
                      ? 'bg-amber-500 text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Grounded Analysis</span>
                </button>
              )}
            </div>

            {/* TAB 1: EMAIL SELECTION */}
            {activeTab === 'messages' && (
              <div className="space-y-3">
                {/* Search Bar */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search recent emails (e.g. project deadline, subject:meeting)..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && loadMessages(searchQuery)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => loadMessages(searchQuery)}
                    isLoading={isLoadingMessages}
                  >
                    Search
                  </Button>
                </div>

                {messagesError && (
                  <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>{messagesError}</span>
                  </div>
                )}

                {/* Email List */}
                <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                  {isLoadingMessages ? (
                    <div className="py-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-slate-500" />
                      <span>Loading recent emails from Gmail...</span>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400">
                      No emails found. Try a different query or refresh.
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isSelected = selectedMessageId === msg.id;
                      return (
                        <div
                          key={msg.id}
                          onClick={() => handleSelectMessage(msg)}
                          className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-400 dark:border-indigo-600 shadow-2xs'
                              : 'bg-white dark:bg-[#131b2e] border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                                  {msg.subject || '(No Subject)'}
                                </span>
                                {isSelected && (
                                  <Badge variant="indigo">
                                    Selected
                                  </Badge>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                From: {msg.sender}
                              </div>
                            </div>
                            <span className="text-[10px] text-slate-400 shrink-0">
                              {msg.date ? new Date(msg.date).toLocaleDateString() : ''}
                            </span>
                          </div>
                          {msg.snippet && (
                            <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-1 mt-1 font-normal">
                              {msg.snippet}
                            </p>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Selected Message Inspection & Analyze Trigger */}
                {selectedMessageId && (
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0c1220] border border-slate-200 dark:border-slate-800 space-y-3 animate-in fade-in duration-100">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Selected for Analysis
                        </span>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                          {selectedMessageDetail?.subject || 'Email Details'}
                        </h4>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          From: {selectedMessageDetail?.sender}
                        </div>
                      </div>

                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleAnalyzeSelectedEmail}
                        isLoading={isAnalyzing}
                        leftIcon={<Sparkles className="w-3.5 h-3.5 text-amber-300" />}
                        className="bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white shadow-xs font-semibold"
                      >
                        {isAnalyzing ? 'Analyzing with Gemini...' : 'Analyze with MindLedger'}
                      </Button>
                    </div>

                    {analysisError && (
                      <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>{analysisError}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: GROUNDED GEMINI ANALYSIS VIEW */}
            {activeTab === 'analysis' && analysisResult && (
              <div className="space-y-4 animate-in fade-in duration-150">
                {/* Epistemic Boundary Notice */}
                <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 text-[11px] text-amber-800 dark:text-amber-300">
                  <div className="flex items-center gap-1.5 font-medium">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>
                      Grounded Synthesis • Model: {analysisResult.modelUsed || 'gemini-3.6-flash'}
                    </span>
                  </div>
                  <span className="text-[10px] text-amber-700 dark:text-amber-400">
                    Facts are strictly separated from inferences
                  </span>
                </div>

                {/* Section A: SOURCE EMAIL FACTS (Ground Truth) */}
                <div className="p-4 rounded-xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 space-y-2.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span>Source Email Data (Ground Truth)</span>
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {analysisResult.sourceEmail.date}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {analysisResult.sourceEmail.subject}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      From: {analysisResult.sourceEmail.sender}
                    </div>
                  </div>

                  {analysisResult.sourceEmail.relevantFacts.length > 0 && (
                    <div className="pt-1.5 space-y-1 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                        Extracted Facts:
                      </span>
                      <ul className="space-y-1">
                        {analysisResult.sourceEmail.relevantFacts.map((fact, idx) => (
                          <li
                            key={idx}
                            className="text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2"
                          >
                            <span className="text-indigo-500 font-bold">•</span>
                            <span>{fact}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Section B: MINDLEDGER ANALYSIS (Gemini Inferences) */}
                <div className="p-4 rounded-xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 space-y-3.5 shadow-2xs">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>MindLedger Analytical Synthesis</span>
                  </div>

                  {/* Summary */}
                  <div>
                    <h5 className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Summary
                    </h5>
                    <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed mt-0.5">
                      {analysisResult.mindledgerAnalysis.summary}
                    </p>
                  </div>

                  {/* Action Items */}
                  {analysisResult.mindledgerAnalysis.actionItems.length > 0 && (
                    <div>
                      <h5 className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Action Items</span>
                      </h5>
                      <div className="mt-1 space-y-1">
                        {analysisResult.mindledgerAnalysis.actionItems.map((item, idx) => (
                          <div
                            key={idx}
                            className="text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2 bg-slate-50 dark:bg-slate-800/40 p-1.5 rounded-lg"
                          >
                            <input
                              type="checkbox"
                              defaultChecked={false}
                              className="mt-0.5 rounded border-slate-300 text-indigo-600"
                            />
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Deadlines & Opportunities Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {/* Deadlines */}
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 space-y-1">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                        <Clock className="w-3 h-3" />
                        <span>Deadlines / Timing</span>
                      </div>
                      <div className="text-xs text-slate-700 dark:text-slate-300 space-y-0.5">
                        {analysisResult.mindledgerAnalysis.deadlines.map((d, idx) => (
                          <div key={idx} className="font-medium">
                            {d}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Opportunities */}
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 space-y-1">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3" />
                        <span>Opportunities</span>
                      </div>
                      <div className="text-xs text-slate-700 dark:text-slate-300 space-y-0.5">
                        {analysisResult.mindledgerAnalysis.opportunities.map((o, idx) => (
                          <div key={idx}>• {o}</div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Risks & Unknowns */}
                  {(analysisResult.mindledgerAnalysis.risks.length > 0 ||
                    analysisResult.mindledgerAnalysis.unknowns.length > 0) && (
                    <div className="p-3 rounded-xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-900/40 space-y-1">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                        <AlertCircle className="w-3 h-3" />
                        <span>Risks & Unknowns</span>
                      </div>
                      <div className="text-xs text-slate-700 dark:text-slate-300 space-y-0.5">
                        {analysisResult.mindledgerAnalysis.risks.map((r, idx) => (
                          <div key={idx}>⚠️ {r}</div>
                        ))}
                        {analysisResult.mindledgerAnalysis.unknowns.map((u, idx) => (
                          <div key={idx} className="text-slate-500 dark:text-slate-400">
                            ❓ {u}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Suggested Next Step */}
                  <div className="p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900/50 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                      Suggested Next Step
                    </span>
                    <p className="text-xs text-indigo-950 dark:text-indigo-200 font-medium">
                      {analysisResult.mindledgerAnalysis.suggestedNextStep}
                    </p>
                  </div>
                </div>

                {/* Product Actions Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('messages')}
                    className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer"
                  >
                    ← Select another email
                  </button>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleUseInDecisionLab}
                      leftIcon={<Scale className="w-3.5 h-3.5 text-amber-500" />}
                    >
                      Use in Decision Lab
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleCreateReflection}
                      leftIcon={<BookOpen className="w-3.5 h-3.5 text-amber-300" />}
                      className="bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white shadow-xs font-semibold"
                    >
                      Create Reflection
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};

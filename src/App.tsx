import React, { useState, useEffect } from 'react';
import type { User } from 'firebase/auth';
import { onAuthChange, deleteInteractionEntry, subscribeToUserInteractions, handleRedirectAuth } from './lib/firebase';
import type { InteractionEntry, ActiveView } from './types';
import { Navbar } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { EntryEditor } from './components/EntryEditor';
import { HistoryView } from './components/HistoryView';
import { AskJournalView } from './components/AskJournalView';
import { MemoryGraphView } from './components/MemoryGraphView';
import { DecisionLabView } from './components/DecisionLabView';
import { SummaryModal } from './components/SummaryModal';
import { PrivacySecurityModal } from './components/PrivacySecurityModal';
import { NotionSettingsModal } from './components/NotionSettingsModal';
import { GmailSettingsModal } from './components/GmailSettingsModal';
import { PrivacyPolicyPage } from './components/legal/PrivacyPolicyPage';
import { TermsOfServicePage } from './components/legal/TermsOfServicePage';

const normalizePath = (path: string) => {
  const clean = path.toLowerCase().replace(/\/+$/, '');
  return clean === '' ? '/' : clean;
};

export default function App() {
  const [currentPath, setCurrentPath] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return normalizePath(window.location.pathname);
    }
    return '/';
  });

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(normalizePath(window.location.pathname));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleNavigate = (path: string) => {
    if (typeof window !== 'undefined') {
      const normalized = normalizePath(path);
      if (normalized !== currentPath) {
        window.history.pushState({}, '', path);
        setCurrentPath(normalized);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeView, setActiveView] = useState<ActiveView>('editor');
  const [entries, setEntries] = useState<InteractionEntry[]>([]);
  const [currentEntry, setCurrentEntry] = useState<InteractionEntry | null>(null);

  // Modals
  const [summaryModalEntry, setSummaryModalEntry] = useState<InteractionEntry | null>(null);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [isNotionModalOpen, setIsNotionModalOpen] = useState(false);
  const [isGmailModalOpen, setIsGmailModalOpen] = useState(false);

  // Decision Lab initial context (e.g. from Gmail Bridge)
  const [decisionLabInitialContext, setDecisionLabInitialContext] = useState<{
    question: string;
    context: string;
    criteria?: string[];
  } | null>(null);

  // Subscribe to Firebase Auth State and process any pending redirect sign-in
  useEffect(() => {
    let isMounted = true;

    // Listen to continuous auth state changes (authoritative Firebase session listener)
    const unsubscribe = onAuthChange((currentUser) => {
      if (isMounted) {
        setUser(currentUser);
        setAuthLoading(false);
      }
    });

    // Process redirect sign-in result concurrently (if returning from redirect fallback)
    handleRedirectAuth()
      .then((redirectUser) => {
        if (redirectUser && isMounted) {
          setUser(redirectUser);
          setAuthLoading(false);
        }
      })
      .catch((err) => {
        console.warn('Notice from redirect auth verification:', err);
      });

    // Guaranteed safety timer to ensure the app never remains stuck on "Initializing secure session..."
    const fallbackTimer = setTimeout(() => {
      if (isMounted) {
        setAuthLoading(false);
      }
    }, 2000);

    return () => {
      isMounted = false;
      clearTimeout(fallbackTimer);
      unsubscribe();
    };
  }, []);

  // Real-time Firestore subscription to user-isolated interactions
  useEffect(() => {
    if (!user) {
      setEntries([]);
      setCurrentEntry(null);
      return;
    }

    const unsubscribe = subscribeToUserInteractions(
      user.uid,
      (fetchedEntries) => {
        setEntries(fetchedEntries);
        // If current entry exists in updated list, sync it
        if (currentEntry) {
          const matching = fetchedEntries.find((e) => e.id === currentEntry.id);
          if (matching) {
            setCurrentEntry(matching);
          }
        }
      },
      (err) => {
        console.error('Real-time subscription error:', err);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  // Handlers
  const handleNewEntry = () => {
    setCurrentEntry(null);
    setActiveView('editor');
  };

  const handleSelectEntry = (entry: InteractionEntry) => {
    setCurrentEntry(entry);
    setActiveView('editor');
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!user) throw new Error('You must be signed in to delete an entry.');
    
    // Optimistically update local state for immediate UI feedback and count sync
    const previousEntries = [...entries];
    setEntries((prev) => prev.filter((e) => e.id !== entryId));
    if (currentEntry?.id === entryId) {
      setCurrentEntry(null);
    }

    try {
      await deleteInteractionEntry(user.uid, entryId);
    } catch (err) {
      console.error('Delete error:', err);
      // Rollback on failure
      setEntries(previousEntries);
      throw err;
    }
  };

  const handleOpenSummary = (entry: InteractionEntry) => {
    setSummaryModalEntry(entry);
    setIsSummaryModalOpen(true);
  };

  // Gmail Bridge Handlers
  const handleCreateReflectionFromGmail = (draft: Partial<InteractionEntry>) => {
    const newEntry: InteractionEntry = {
      id: `entry_gmail_${Date.now()}`,
      userId: user?.uid || '',
      title: draft.title || 'Email Reflection',
      category: draft.category || 'work',
      tags: draft.tags || ['gmail'],
      messages: draft.messages || [],
      summary: draft.summary,
      actionItems: draft.actionItems,
      keyInsights: draft.keyInsights,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setCurrentEntry(newEntry);
    setActiveView('editor');
  };

  const handleUseInDecisionLabFromGmail = (context: {
    question: string;
    context: string;
    criteria: string[];
  }) => {
    setDecisionLabInitialContext(context);
    setActiveView('decision_lab');
  };

  // Public standalone legal routes - accessible immediately without authentication or loading block
  if (currentPath === '/privacy') {
    return <PrivacyPolicyPage onNavigate={handleNavigate} user={user} />;
  }

  if (currentPath === '/terms') {
    return <TermsOfServicePage onNavigate={handleNavigate} user={user} />;
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#f5f7fb] dark:bg-[#0b0f19] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Initializing secure session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f7fb] dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 flex flex-col selection:bg-amber-500/20 selection:text-amber-900 dark:selection:text-amber-200 transition-colors overflow-x-hidden">
      <Navbar
        user={user}
        activeView={activeView}
        setActiveView={setActiveView}
        onNewEntry={handleNewEntry}
        entryCount={entries.length}
        onOpenPrivacyModal={() => setIsPrivacyModalOpen(true)}
        onOpenNotionModal={() => setIsNotionModalOpen(true)}
        onOpenGmailModal={() => setIsGmailModalOpen(true)}
        onNavigate={handleNavigate}
      />

      <main className="flex-1">
        {!user ? (
          <LandingPage
            onOpenPrivacyModal={() => setIsPrivacyModalOpen(true)}
            onNavigate={handleNavigate}
          />
        ) : activeView === 'editor' ? (
          <EntryEditor
            userId={user.uid}
            user={user}
            currentEntry={currentEntry}
            onEntrySaved={(saved) => setCurrentEntry(saved)}
            onDeleteEntry={handleDeleteEntry}
            onOpenSummaryModal={handleOpenSummary}
            onOpenNotionSettings={() => setIsNotionModalOpen(true)}
          />
        ) : activeView === 'history' ? (
          <HistoryView
            user={user}
            entries={entries}
            onSelectEntry={handleSelectEntry}
            onDeleteEntry={handleDeleteEntry}
            onOpenSummaryModal={handleOpenSummary}
            onNewEntry={handleNewEntry}
            onOpenNotionSettings={() => setIsNotionModalOpen(true)}
            onEntryUpdated={(updated) => {
              setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
              if (currentEntry?.id === updated.id) setCurrentEntry(updated);
            }}
          />
        ) : activeView === 'memory_graph' ? (
          <MemoryGraphView
            user={user}
            entries={entries}
            onSelectEntry={handleSelectEntry}
            onNewEntry={handleNewEntry}
          />
        ) : activeView === 'decision_lab' ? (
          <DecisionLabView
            user={user}
            entries={entries}
            onSelectEntry={handleSelectEntry}
            onNewEntry={handleNewEntry}
            initialContext={decisionLabInitialContext}
          />
        ) : (
          <AskJournalView
            user={user}
            entries={entries}
            onSelectEntry={handleSelectEntry}
            onNewEntry={handleNewEntry}
          />
        )}
      </main>

      {/* Summary Modal */}
      <SummaryModal
        user={user}
        entry={summaryModalEntry}
        isOpen={isSummaryModalOpen}
        onClose={() => setIsSummaryModalOpen(false)}
        onResume={handleSelectEntry}
        onOpenNotionSettings={() => setIsNotionModalOpen(true)}
        onEntryUpdated={(updated) => {
          setSummaryModalEntry(updated);
          setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
          if (currentEntry?.id === updated.id) setCurrentEntry(updated);
        }}
      />

      {/* Privacy & Security Modal */}
      <PrivacySecurityModal
        isOpen={isPrivacyModalOpen}
        onClose={() => setIsPrivacyModalOpen(false)}
        onNavigate={handleNavigate}
      />

      {/* Notion Knowledge Bridge Modal */}
      <NotionSettingsModal
        user={user}
        isOpen={isNotionModalOpen}
        onClose={() => setIsNotionModalOpen(false)}
      />

      {/* Gmail Intelligence Bridge Modal */}
      <GmailSettingsModal
        user={user}
        isOpen={isGmailModalOpen}
        onClose={() => setIsGmailModalOpen(false)}
        onCreateReflection={handleCreateReflectionFromGmail}
        onUseInDecisionLab={handleUseInDecisionLabFromGmail}
      />
    </div>
  );
}

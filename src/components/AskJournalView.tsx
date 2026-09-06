import React, { useState } from 'react';
import {
  Sparkles,
  Search,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
  Calendar,
  Tag,
  RefreshCw,
  Clock,
  ChevronRight,
  MessageSquare
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { User } from 'firebase/auth';
import type { InteractionEntry, AskJournalResponse, JournalCitation } from '../types';

interface AskJournalViewProps {
  user: User;
  entries: InteractionEntry[];
  onSelectEntry: (entry: InteractionEntry) => void;
  onNewEntry: () => void;
}

const SUGGESTED_QUESTIONS = [
  'What goals have I mentioned recently?',
  'What problems keep appearing in my reflections?',
  'What decisions have I been thinking about?',
  'What progress or wins have I made?',
  'What habits or routines have I been exploring?',
  'What emotions or recurring themes seem most prominent?',
];

export const AskJournalView: React.FC<AskJournalViewProps> = ({
  user,
  entries,
  onSelectEntry,
  onNewEntry,
}) => {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<AskJournalResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastAskedQuestion, setLastAskedQuestion] = useState<string>('');

  const handleAskQuestion = async (queryText?: string) => {
    const textToAsk = (queryText !== undefined ? queryText : question).trim();
    if (!textToAsk || loading) return;

    setLoading(true);
    setError(null);
    setLastAskedQuestion(textToAsk);

    try {
      // Obtain fresh Firebase Auth ID Token for server-side verification
      const idToken = await user.getIdToken();

      const res = await fetch('/api/journal/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          question: textToAsk,
          entries: entries,
          cachedEntries: entries,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData?.error || `Request failed with status ${res.status}`);
      }

      const data: AskJournalResponse = await res.json();
      setResponse(data);
    } catch (err: any) {
      console.error('Ask My Journal error:', err);
      setError(err?.message || 'Failed to query your journal. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCitation = (citation: JournalCitation) => {
    const matchingEntry = entries.find((e) => e.id === citation.id);
    if (matchingEntry) {
      onSelectEntry(matchingEntry);
    }
  };

  return (
    <div id="ask-journal-view" className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-200 dark:border-slate-800/90 p-6 sm:p-8 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-100/40 dark:bg-amber-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Grounded Personal Memory</span>
            </div>
            <h1 id="ask-journal-title" className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Ask My Journal
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
              Query your authentic reflections with natural language. Gemini synthesizes evidence exclusively from your private Firestore entries and never invents memories.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300">
              <BookOpen className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>
                <strong className="text-slate-900 dark:text-slate-100 font-semibold">{entries.length}</strong>{' '}
                {entries.length === 1 ? 'Reflection' : 'Reflections'} in Archive
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 text-xs text-emerald-800 dark:text-emerald-300 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Isolated to Your Account</span>
            </div>
          </div>
        </div>

        {/* Question Input Form */}
        <form
          id="ask-journal-form"
          onSubmit={(e) => {
            e.preventDefault();
            handleAskQuestion();
          }}
          className="mt-6 space-y-3"
        >
          <div className="relative flex items-center">
            <input
              id="ask-journal-input"
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask a question about your reflections, goals, decisions, or themes..."
              disabled={loading}
              maxLength={1000}
              className="w-full pl-12 pr-32 py-4 text-sm sm:text-base bg-slate-50 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 text-slate-900 dark:text-slate-100 shadow-inner"
            />
            <Search className="w-5 h-5 text-slate-400 dark:text-slate-500 absolute left-4 pointer-events-none" />

            <button
              id="ask-journal-submit-btn"
              type="submit"
              disabled={!question.trim() || loading}
              className="absolute right-2 px-4 py-2.5 bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold rounded-lg shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Synthesizing...</span>
                </>
              ) : (
                <>
                  <span>Ask</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500 px-1">
            <span>Press Enter to ask</span>
            <span>{question.length}/1,000 characters</span>
          </div>
        </form>

        {/* Suggested Queries */}
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Suggested questions:</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_QUESTIONS.map((q, idx) => (
              <button
                key={idx}
                id={`suggested-question-${idx}`}
                type="button"
                onClick={() => {
                  setQuestion(q);
                  handleAskQuestion(q);
                }}
                disabled={loading}
                className="text-xs text-left px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-amber-950/50 hover:text-amber-900 dark:hover:text-amber-200 hover:border-amber-300 dark:hover:border-amber-700/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div
          id="ask-journal-loading-state"
          className="bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-200 dark:border-slate-800/90 p-8 sm:p-12 shadow-xs text-center space-y-4 animate-in fade-in duration-200"
        >
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto animate-pulse">
            <Sparkles className="w-6 h-6 animate-spin" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Reviewing Your Journal Entries</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Synthesizing private reflections from Firestore and verifying grounding with Gemini...
            </p>
          </div>
          <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
            <span>Server-authenticated data boundary active</span>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div
          id="ask-journal-error-state"
          className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-2xl p-6 shadow-xs flex items-start gap-4"
        >
          <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div className="flex-1 space-y-2">
            <h4 className="text-sm font-bold text-rose-900 dark:text-rose-200">Query Failed</h4>
            <p className="text-xs text-rose-800 dark:text-rose-300 leading-relaxed">{error}</p>
            <button
              id="ask-journal-retry-btn"
              onClick={() => handleAskQuestion(lastAskedQuestion)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Question</span>
            </button>
          </div>
        </div>
      )}

      {/* Response Display */}
      {response && !loading && !error && (
        <div
          id="ask-journal-response-card"
          className="bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-200 dark:border-slate-800/90 p-6 sm:p-8 shadow-xs space-y-6 animate-in fade-in duration-200"
        >
          {/* Status Badge & Meta */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              {response.hasSufficientEvidence ? (
                <span
                  id="evidence-grounded-badge"
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 text-xs font-semibold"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Evidence Grounded in Reflections</span>
                </span>
              ) : (
                <span
                  id="insufficient-evidence-badge"
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 text-xs font-semibold"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>Insufficient Evidence in Journal</span>
                </span>
              )}

              <span className="text-xs text-slate-500 dark:text-slate-400">
                Analyzed {response.entriesAnalyzedCount}{' '}
                {response.entriesAnalyzedCount === 1 ? 'entry' : 'entries'}
              </span>
            </div>

            {response.modelUsed && (
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                {response.modelUsed}
              </span>
            )}
          </div>

          {/* User Question Echo */}
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 flex items-start gap-3">
            <MessageSquare className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0 mt-0.5" />
            <div className="text-xs font-medium">
              <span className="font-bold text-slate-900 dark:text-slate-100">Question: </span>"{lastAskedQuestion}"
            </div>
          </div>

          {/* AI Grounded Synthesis */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Grounded Journal Synthesis
            </h3>
            <div
              id="ask-journal-answer"
              className="prose prose-sm prose-slate dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 leading-relaxed bg-amber-50/20 dark:bg-amber-950/20 p-5 rounded-xl border border-amber-100/80 dark:border-amber-900/40"
            >
              <ReactMarkdown>{response.answer}</ReactMarkdown>
            </div>
          </div>

          {/* Referenced Journal Entries / Citations */}
          {response.citations && response.citations.length > 0 && (
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>Referenced Entries in Evidence Base</span>
                </h4>
                <span className="text-xs text-slate-400 dark:text-slate-500">Click to open reflection</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {response.citations.map((citation) => (
                  <button
                    key={citation.id}
                    id={`citation-card-${citation.id}`}
                    onClick={() => handleSelectCitation(citation)}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-amber-300 dark:hover:border-amber-600/60 hover:bg-amber-50/50 dark:hover:bg-amber-950/30 bg-slate-50/50 dark:bg-slate-800/40 transition-all text-left flex items-start justify-between group cursor-pointer"
                  >
                    <div className="space-y-1 min-w-0 pr-2">
                      <div className="font-semibold text-xs text-slate-900 dark:text-slate-100 group-hover:text-amber-900 dark:group-hover:text-amber-300 truncate">
                        {citation.title}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span className="capitalize px-1.5 py-0.2 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium">
                          {citation.category}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                          {new Date(citation.createdAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-amber-600 dark:group-hover:text-amber-400 shrink-0 self-center transition-transform group-hover:translate-x-0.5" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Prompt if 0 entries in account */}
          {entries.length === 0 && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl flex items-center justify-between gap-4">
              <div className="text-xs text-amber-800 dark:text-amber-200">
                You haven't saved any reflections in your journal yet. Start writing to unlock full journal memory insights!
              </div>
              <button
                id="write-first-entry-btn"
                onClick={onNewEntry}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shrink-0 cursor-pointer shadow-xs"
              >
                Write Reflection
              </button>
            </div>
          )}
        </div>
      )}

      {/* Initial Empty State (When no question has been asked yet) */}
      {!response && !loading && !error && (
        <div
          id="ask-journal-empty-intro"
          className="bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-200 dark:border-slate-800/90 p-8 sm:p-10 shadow-xs text-center space-y-6"
        >
          <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto shadow-xs">
            <BookOpen className="w-7 h-7" />
          </div>

          <div className="space-y-2 max-w-lg mx-auto">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">How "Ask My Journal" Works</h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              MindLedger indexes your private reflection history securely. When you ask a question, our server authenticates your session, gathers relevant entries from your Firestore archive, and prompts Gemini to provide a synthesis supported strictly by your documented thoughts.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left max-w-3xl mx-auto pt-2">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-slate-100">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Zero Cross-User Leaks</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">
                Strict server-verified UID boundaries guarantee queries only touch your personal data.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-slate-100">
                <CheckCircle2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Evidence-Grounded</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">
                Never hallucinates memories. If evidence is missing, the assistant clearly informs you.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-slate-100">
                <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Model Resilience</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">
                Backed by Gemini 3.6 Flash with automated 4-tier model fallback for maximum uptime.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

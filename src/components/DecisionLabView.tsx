import React, { useState, useEffect, useMemo } from 'react';
import type { User } from 'firebase/auth';
import {
  Scale,
  Sparkles,
  RefreshCw,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  HelpCircle,
  Compass,
  Zap,
  Target,
  FileText,
  Save,
  Check,
  X,
  ExternalLink,
  ChevronRight,
  ListFilter,
  Info,
  Layers,
  Edit3,
  Bookmark,
  Share2,
} from 'lucide-react';
import type {
  InteractionEntry,
  DecisionOptionInput,
  DecisionAnalysisResult,
  DecisionRecord,
  AnalyzeDecisionResponse,
} from '../types';
import {
  saveDecisionRecord,
  deleteDecisionRecord,
  subscribeToUserDecisions,
} from '../lib/firebase';

interface DecisionLabViewProps {
  user: User | null;
  entries: InteractionEntry[];
  onSelectEntry: (entry: InteractionEntry) => void;
  onNewEntry: () => void;
  initialContext?: { question: string; context: string; criteria?: string[] } | null;
}

const PRESET_EXAMPLES = [
  {
    title: 'Career: Early-Stage Startup vs Enterprise',
    question: 'Should I join an early-stage AI startup as Lead Engineer or stay at my stable Enterprise role?',
    context: 'The startup offers 15% lower base salary but significant equity and fast pace. Enterprise offers great stability, 401k match, and predictable 40-hour weeks. I have 6 months of living expenses saved and want to maximize long-term learning.',
    options: [
      { id: 'opt_1', label: 'Join the Early-Stage AI Startup', description: 'Higher ownership, learning curve, equity upside, lower immediate cash and higher risk.' },
      { id: 'opt_2', label: 'Stay at Current Enterprise Company', description: 'Financial predictability, stable hours, mentorship opportunities, slower trajectory.' },
    ],
    criteria: ['Learning velocity', 'Financial runway safety', 'Ownership & autonomy', 'Stress & burnout risk'],
  },
  {
    title: 'Relocation: Move to Tech Hub vs Remote in Hometown',
    question: 'Should I relocate to a major tech hub or continue working remotely from my hometown?',
    context: 'Moving to San Francisco would increase rent by 80% but expand in-person networking and founder connections. Staying in my hometown keeps living costs low and keeps me close to my family and community.',
    options: [
      { id: 'opt_1', label: 'Relocate to San Francisco Tech Hub', description: 'Serendipitous networking, tech density, higher cost of living, separation from hometown network.' },
      { id: 'opt_2', label: 'Stay Remote in Hometown', description: 'Substantial savings, closer to family, lower stress, requires intentional travel for networking.' },
    ],
    criteria: ['Career trajectory & serendipity', 'Quality of life & family proximity', 'Financial savings rate'],
  },
  {
    title: 'Product Strategy: Launch MVP Now vs Polish First',
    question: 'Should we release our MVP to beta testers now or spend another 4 weeks polishing edge cases?',
    context: 'The core journaling feature works reliably. However, the onboarding flow and secondary settings are rudimentary. We have 40 waitlist signups eager to try.',
    options: [
      { id: 'opt_1', label: 'Launch Beta MVP Immediately', description: 'Rapid feedback loop from real users, early validation, risk of rough impressions.' },
      { id: 'opt_2', label: 'Polish for 4 Weeks Before Release', description: 'Smoother onboarding, higher polish, risk of delayed learning and wasted effort on wrong features.' },
    ],
    criteria: ['Speed of user feedback', 'First impression impact', 'Team momentum & focus'],
  },
];

const PRESET_CRITERIA_SUGGESTIONS = [
  'Financial Sustainability',
  'Long-Term Learning & Growth',
  'Autonomy & Ownership',
  'Work-Life Balance & Health',
  'Execution Risk',
  'Alignment with Personal Values',
  'Reversibility of Decision',
];

export const DecisionLabView: React.FC<DecisionLabViewProps> = ({
  user,
  entries,
  onSelectEntry,
  onNewEntry,
  initialContext,
}) => {
  // Form State
  const [question, setQuestion] = useState('');
  const [context, setContext] = useState('');
  const [options, setOptions] = useState<DecisionOptionInput[]>([
    { id: 'opt_1', label: 'Option A', description: '' },
    { id: 'opt_2', label: 'Option B', description: '' },
  ]);
  const [criteria, setCriteria] = useState<string[]>([
    'Long-Term Learning & Growth',
    'Financial Sustainability',
    'Alignment with Personal Values',
  ]);
  const [newCriteriaText, setNewCriteriaText] = useState('');
  const [useJournalEvidence, setUseJournalEvidence] = useState(true);

  // Prepopulate from initialContext (e.g. Gmail bridge)
  useEffect(() => {
    if (initialContext) {
      if (initialContext.question) setQuestion(initialContext.question);
      if (initialContext.context) setContext(initialContext.context);
      if (initialContext.criteria && initialContext.criteria.length > 0) {
        setCriteria(initialContext.criteria);
      }
    }
  }, [initialContext]);

  // Analysis Result State
  const [analysisResult, setAnalysisResult] = useState<DecisionAnalysisResult | null>(null);
  const [analysisSourceEntryIds, setAnalysisSourceEntryIds] = useState<string[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Persistence State
  const [savedDecisions, setSavedDecisions] = useState<DecisionRecord[]>([]);
  const [currentDecisionId, setCurrentDecisionId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'workspace' | 'history'>('workspace');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // 1. Subscribe to Saved Decisions from Firestore
  useEffect(() => {
    if (!user) {
      setSavedDecisions([]);
      return;
    }

    const unsubscribe = subscribeToUserDecisions(
      user.uid,
      (records) => {
        setSavedDecisions(records);
      },
      (err) => {
        console.error('Error fetching decisions:', err);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Handle Preset Selection
  const handleSelectPreset = (preset: (typeof PRESET_EXAMPLES)[0]) => {
    setQuestion(preset.question);
    setContext(preset.context);
    setOptions(preset.options.map((o) => ({ ...o })));
    setCriteria([...preset.criteria]);
    setAnalysisResult(null);
    setCurrentDecisionId(null);
    setErrorMsg(null);
  };

  // Add & Remove Option
  const handleAddOption = () => {
    if (options.length >= 6) return;
    const nextIdx = options.length + 1;
    const nextId = `opt_${nextIdx}`;
    const nextLabel = `Option ${String.fromCharCode(65 + options.length)}`;
    setOptions([...options, { id: nextId, label: nextLabel, description: '' }]);
  };

  const handleRemoveOption = (idToRemove: string) => {
    if (options.length <= 2) return;
    setOptions(options.filter((o) => o.id !== idToRemove));
  };

  const handleUpdateOption = (id: string, field: 'label' | 'description', value: string) => {
    setOptions(
      options.map((o) => (o.id === id ? { ...o, [field]: value } : o))
    );
  };

  // Add & Remove Criteria
  const handleAddCriteria = () => {
    const trimmed = newCriteriaText.trim();
    if (!trimmed) return;
    if (criteria.includes(trimmed)) {
      setNewCriteriaText('');
      return;
    }
    if (criteria.length >= 10) return;
    setCriteria([...criteria, trimmed]);
    setNewCriteriaText('');
  };

  const handleRemoveCriteria = (itemToRemove: string) => {
    setCriteria(criteria.filter((c) => c !== itemToRemove));
  };

  const handleTogglePresetCriteria = (item: string) => {
    if (criteria.includes(item)) {
      setCriteria(criteria.filter((c) => c !== item));
    } else {
      if (criteria.length < 10) {
        setCriteria([...criteria, item]);
      }
    }
  };

  // Trigger Decision Analysis
  const handleAnalyzeDecision = async () => {
    if (!user) {
      setErrorMsg('Please sign in with your Google account to run Decision Lab.');
      return;
    }

    if (!question.trim()) {
      setErrorMsg('Please specify your decision question.');
      return;
    }

    const invalidOptions = options.some((o) => !o.label.trim());
    if (invalidOptions) {
      setErrorMsg('All options must have a non-empty name.');
      return;
    }

    setAnalyzing(true);
    setErrorMsg(null);
    setSaveSuccessMsg(null);
    setAnalysisStep('Verifying user identity & preparing decision boundaries...');

    try {
      const idToken = await user.getIdToken(true);
      setAnalysisStep('Evaluating options against criteria with Gemini 3.6 Flash...');

      const response = await fetch('/api/decision-lab/analyze', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: question.trim(),
          context: context.trim(),
          options,
          criteria,
          useJournalEvidence,
          entries,
          cachedEntries: entries,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Analysis request failed with status ${response.status}`);
      }

      setAnalysisStep('Synthesizing structured trade-offs and risks...');
      const data: AnalyzeDecisionResponse = await response.json();

      setAnalysisResult(data.analysis);
      setAnalysisSourceEntryIds(data.sourceEntryIds || []);
      setCurrentDecisionId(null); // Fresh analysis not yet saved
    } catch (err: any) {
      console.error('Error analyzing decision:', err);
      setErrorMsg(err?.message || 'Failed to complete decision analysis. Please try again.');
    } finally {
      setAnalyzing(false);
      setAnalysisStep('');
    }
  };

  // Save Decision Record to Firestore
  const handleSaveDecision = async () => {
    if (!user || !analysisResult) return;

    setIsSaving(true);
    setSaveSuccessMsg(null);
    setErrorMsg(null);

    try {
      const recordId = currentDecisionId || `decision_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const nowIso = new Date().toISOString();

      const record: DecisionRecord = {
        id: recordId,
        userId: user.uid,
        question: question.trim(),
        context: context.trim(),
        options,
        criteria,
        useJournalEvidence,
        analysis: analysisResult,
        sourceEntryIds: analysisSourceEntryIds,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      await saveDecisionRecord(user.uid, record);
      setCurrentDecisionId(recordId);
      setSaveSuccessMsg('Decision analysis successfully saved to your private MindLedger.');
      setTimeout(() => setSaveSuccessMsg(null), 5000);
    } catch (err: any) {
      console.error('Error saving decision:', err);
      setErrorMsg(err?.message || 'Failed to save decision record.');
    } finally {
      setIsSaving(false);
    }
  };

  // Reopen Saved Decision
  const handleReopenSavedDecision = (record: DecisionRecord) => {
    setQuestion(record.question);
    setContext(record.context || '');
    setOptions(record.options.map((o) => ({ ...o })));
    setCriteria([...record.criteria]);
    setUseJournalEvidence(Boolean(record.useJournalEvidence));
    setAnalysisResult(record.analysis);
    setAnalysisSourceEntryIds(record.sourceEntryIds || []);
    setCurrentDecisionId(record.id);
    setActiveTab('workspace');
  };

  // Delete Saved Decision
  const handleDeleteDecision = async (decisionId: string) => {
    if (!user) return;
    try {
      await deleteDecisionRecord(user.uid, decisionId);
      setDeleteConfirmId(null);
      if (currentDecisionId === decisionId) {
        setCurrentDecisionId(null);
      }
    } catch (err: any) {
      console.error('Error deleting decision:', err);
    }
  };

  // Reset to New Analysis
  const handleResetNewDecision = () => {
    setQuestion('');
    setContext('');
    setOptions([
      { id: 'opt_1', label: 'Option A', description: '' },
      { id: 'opt_2', label: 'Option B', description: '' },
    ]);
    setCriteria([
      'Long-Term Learning & Growth',
      'Financial Sustainability',
      'Alignment with Personal Values',
    ]);
    setAnalysisResult(null);
    setCurrentDecisionId(null);
    setErrorMsg(null);
    setSaveSuccessMsg(null);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Banner & Mode Switcher */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-center justify-center text-amber-700 dark:text-amber-400">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Decision Lab</h1>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                Evidence-Grounded Support
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Turn real-life decisions into transparent trade-off analyses grounded in your personal journal history.
            </p>
          </div>
        </div>

        {/* Workspace vs Saved Decisions Tabs */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium">
            <button
              id="tab-decision-workspace-btn"
              onClick={() => setActiveTab('workspace')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                activeTab === 'workspace'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Scale className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Decision Workspace</span>
            </button>
            <button
              id="tab-decision-history-btn"
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span>Saved Decisions ({savedDecisions.length})</span>
            </button>
          </div>

          {activeTab === 'workspace' && (
            <button
              id="new-decision-btn"
              onClick={handleResetNewDecision}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer border border-transparent dark:border-slate-700"
              title="Start a fresh decision"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Decision</span>
            </button>
          )}
        </div>
      </div>

      {/* Global Alerts */}
      {errorMsg && (
        <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-300 text-sm rounded-xl p-4 flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-700 dark:text-rose-400 hover:text-rose-900 dark:hover:text-rose-200 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {saveSuccessMsg && (
        <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300 text-sm rounded-xl p-4 flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{saveSuccessMsg}</span>
          </div>
          <button onClick={() => setSaveSuccessMsg(null)} className="text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-emerald-200 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* VIEW: Saved Decisions History */}
      {activeTab === 'history' ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Your Saved Decisions</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Review and revisit past decision analyses saved in your isolated Firestore partition.
              </p>
            </div>
            <button
              onClick={() => setActiveTab('workspace')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors cursor-pointer"
            >
              <span>Back to Workspace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {savedDecisions.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-center justify-center text-amber-700 dark:text-amber-400 mx-auto">
                <Bookmark className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">No Saved Decisions Yet</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                Analyze a decision in the workspace, then click "Save Decision" to persist it for future reference.
              </p>
              <button
                onClick={() => setActiveTab('workspace')}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 transition-colors shadow-xs cursor-pointer"
              >
                Go to Decision Workspace
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {savedDecisions.map((record) => (
                <div
                  key={record.id}
                  id={`saved-decision-card-${record.id}`}
                  className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2e] hover:border-amber-300 dark:hover:border-amber-600/50 hover:shadow-xs transition-all space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(record.createdAt).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                      {record.useJournalEvidence && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">
                          Journal Grounded
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 line-clamp-2">{record.question}</h3>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {record.options.map((opt) => (
                        <span
                          key={opt.id}
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                        >
                          {opt.label}
                        </span>
                      ))}
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 italic">
                      "{record.analysis?.summary || 'Analysis summary available.'}"
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <button
                      onClick={() => handleReopenSavedDecision(record)}
                      className="flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 cursor-pointer"
                    >
                      <span>Reopen Analysis</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => setDeleteConfirmId(record.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                      title="Delete decision record"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Delete Confirmation Modal/Prompt */}
                  {deleteConfirmId === record.id && (
                    <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg space-y-2 text-xs text-rose-900 dark:text-rose-300 animate-fadeIn">
                      <p className="font-semibold">Delete this saved decision?</p>
                      <p className="text-[11px] text-rose-700 dark:text-rose-400">
                        This removes the decision record. Your source reflections will remain untouched.
                      </p>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => handleDeleteDecision(record.id)}
                          className="px-2.5 py-1 bg-rose-600 text-white rounded-md text-[11px] font-semibold hover:bg-rose-700 cursor-pointer"
                        >
                          Confirm Delete
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-rose-300 dark:border-rose-800 rounded-md text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* VIEW: Active Decision Workspace */
        <div className="space-y-6">
          {/* Quick Start Presets (only show if no result yet or user wants to try) */}
          {!analysisResult && (
            <div className="bg-gradient-to-r from-amber-50/70 to-indigo-50/70 dark:from-amber-950/20 dark:to-indigo-950/20 border border-amber-200/80 dark:border-amber-900/40 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  Try an Example Decision Prompt:
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {PRESET_EXAMPLES.map((preset, idx) => (
                  <button
                    key={idx}
                    id={`preset-example-${idx}`}
                    onClick={() => handleSelectPreset(preset)}
                    className="text-xs font-medium px-3 py-1.5 rounded-xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-700 hover:border-amber-400 dark:hover:border-amber-500 hover:bg-amber-50/50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-all cursor-pointer shadow-2xs text-left"
                  >
                    {preset.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* If analysis result exists, show Results Dashboard with edit toolbar */}
          {analysisResult ? (
            <div className="space-y-6 animate-fadeIn">
              {/* Results Action Bar */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">Decision Analysis Ready</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                    {analysisResult.confidenceRating || 'Confidence Evaluated'}
                  </span>
                  {currentDecisionId && (
                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                      Saved
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    id="save-decision-btn"
                    onClick={handleSaveDecision}
                    disabled={isSaving}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 transition-colors shadow-xs cursor-pointer disabled:bg-slate-400"
                  >
                    {isSaving ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : currentDecisionId ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Save className="w-3.5 h-3.5 text-amber-400" />
                    )}
                    <span>{isSaving ? 'Saving...' : currentDecisionId ? 'Update Saved' : 'Save Decision'}</span>
                  </button>

                  <button
                    id="edit-decision-btn"
                    onClick={() => setAnalysisResult(null)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Inputs & Re-run</span>
                  </button>
                </div>
              </div>

              {/* High-Impact Domain Professional Disclaimer (if flagged) */}
              {analysisResult.professionalDisclaimer && (
                <div className="bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-300 dark:border-amber-800 rounded-2xl p-5 text-amber-950 dark:text-amber-300 space-y-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                    <h4 className="text-sm font-bold">Important Professional Consideration Notice</h4>
                  </div>
                  <p className="text-xs leading-relaxed text-amber-900 dark:text-amber-300">
                    {analysisResult.professionalDisclaimer}
                  </p>
                </div>
              )}

              {/* Core Question & Summary Header */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs space-y-3">
                <div className="space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                    Decision Crossroads
                  </span>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{question}</h2>
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                  {analysisResult.summary}
                </p>
              </div>

              {/* Recommendation & Immediate Next Step */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="md:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 p-6 shadow-xs space-y-3 bg-gradient-to-br from-emerald-50/40 to-white dark:from-emerald-950/20 dark:to-slate-900">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Target className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      Qualified Recommendation
                    </span>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                      {analysisResult.confidenceRating}
                    </span>
                  </div>
                  <p className="text-sm text-slate-900 dark:text-slate-100 leading-relaxed font-medium">
                    {analysisResult.recommendation}
                  </p>
                </div>

                <div className="md:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-indigo-200 dark:border-indigo-800/60 p-6 shadow-xs space-y-3 bg-gradient-to-br from-indigo-50/40 to-white dark:from-indigo-950/20 dark:to-slate-900">
                  <span className="text-xs font-bold text-indigo-800 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    Suggested Concrete Next Step
                  </span>
                  <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed">
                    {analysisResult.nextStep}
                  </p>
                </div>
              </div>

              {/* Side-by-Side Option Comparison */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Structured Option Comparison</h3>
                  <span className="text-xs text-slate-500 dark:text-slate-400">{analysisResult.optionComparison.length} Options Evaluated</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {analysisResult.optionComparison.map((opt) => (
                    <div
                      key={opt.optionId}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 space-y-4 flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">{opt.optionLabel}</h4>
                          {opt.viabilityScore && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                              Viability: {opt.viabilityScore}
                            </span>
                          )}
                        </div>

                        {/* Pros */}
                        <div className="space-y-1.5">
                          <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                            <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> Pros
                          </span>
                          <ul className="space-y-1 text-xs text-slate-700 dark:text-slate-300">
                            {opt.pros.map((p, i) => (
                              <li key={i} className="flex items-start gap-1.5">
                                <span className="text-emerald-500 font-bold">•</span>
                                <span>{p}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Cons */}
                        <div className="space-y-1.5 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                          <span className="text-[11px] font-bold text-rose-800 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1">
                            <X className="w-3 h-3 text-rose-600 dark:text-rose-400" /> Cons & Costs
                          </span>
                          <ul className="space-y-1 text-xs text-slate-700 dark:text-slate-300">
                            {opt.cons.map((c, i) => (
                              <li key={i} className="flex items-start gap-1.5">
                                <span className="text-rose-500 font-bold">•</span>
                                <span>{c}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Deep Dive: Risks, Trade-offs, & Unknowns */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Trade-offs */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-3">
                  <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                    <Scale className="w-4 h-4" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">Core Trade-offs</h4>
                  </div>
                  <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    {analysisResult.tradeoffs.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 p-2 rounded-lg bg-amber-50/40 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40">
                        <span className="text-amber-600 dark:text-amber-400 font-bold">⇄</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Specific Risks */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-3">
                  <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400">
                    <AlertCircle className="w-4 h-4" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">Specific Risks</h4>
                  </div>
                  <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    {analysisResult.risks.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 p-2 rounded-lg bg-rose-50/40 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40">
                        <span className="text-rose-600 dark:text-rose-400 font-bold">!</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Unknowns / Missing Information */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-3">
                  <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
                    <HelpCircle className="w-4 h-4" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">Key Unknowns & Gaps</h4>
                  </div>
                  <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    {analysisResult.uncertainties.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 p-2 rounded-lg bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40">
                        <span className="text-indigo-600 dark:text-indigo-400 font-bold">?</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Evidence Grounding & Epistemic Boundary Distinction Section */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs space-y-5">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Epistemic Boundary: Facts, Evidence, Assumptions & AI Reasoning
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Decision Lab strictly separates what you provided, what your journal proves, what is assumed, and what Gemini deduced.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  {/* Facts from User */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2">
                    <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-slate-900 dark:bg-slate-100"></span>
                      Facts Supplied by You
                    </span>
                    <ul className="space-y-1.5 text-slate-700 dark:text-slate-300">
                      {analysisResult.factsFromUser.map((fact, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-slate-400">•</span>
                          <span>{fact}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Assumptions */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2">
                    <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      Explicit Assumptions Made
                    </span>
                    <ul className="space-y-1.5 text-slate-700 dark:text-slate-300">
                      {analysisResult.assumptions.map((asm, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-amber-500">•</span>
                          <span>{asm}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Journal Evidence Citations (if present) */}
                {analysisResult.journalEvidence && analysisResult.journalEvidence.length > 0 && (
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                    <span className="font-bold text-xs text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      Evidence from My Journal ({analysisResult.journalEvidence.length} citations)
                    </span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {analysisResult.journalEvidence.map((ev, i) => {
                        const matchedEntry = entries.find((e) => e.id === ev.entryId);
                        return (
                          <div
                            key={i}
                            className="p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 space-y-2 flex flex-col justify-between"
                          >
                            <div className="space-y-1">
                              <span className="font-semibold text-slate-900 dark:text-slate-100 text-xs block">
                                {ev.entryTitle}
                              </span>
                              <p className="text-[11px] text-slate-600 dark:text-slate-400 italic">
                                "{ev.relevantQuoteOrFinding}"
                              </p>
                            </div>
                            {matchedEntry && (
                              <button
                                id={`open-journal-citation-${ev.entryId}`}
                                onClick={() => onSelectEntry(matchedEntry)}
                                className="pt-2 flex items-center gap-1 text-[11px] font-semibold text-indigo-700 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 cursor-pointer"
                              >
                                <span>Open in Reflection Canvas</span>
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Gemini Reasoning Narrative */}
                <div className="p-4 rounded-xl bg-indigo-50/30 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                  <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    Gemini Analytical Reasoning
                  </span>
                  <p className="leading-relaxed text-slate-600 dark:text-slate-400">
                    {analysisResult.geminiReasoning}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* Input Form: Step-by-Step Structured Decision Builder */
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs space-y-6">
              <div className="space-y-1 pb-4 border-b border-slate-100 dark:border-slate-800">
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Define Your Decision Workspace</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Provide your options and priorities. Decision Lab evaluates real trade-offs rather than prescribing certainty.
                </p>
              </div>

              {/* 1. Decision Question */}
              <div className="space-y-1.5">
                <label htmlFor="decision-question-input" className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  1. Decision Question <span className="text-rose-500">*</span>
                </label>
                <input
                  id="decision-question-input"
                  type="text"
                  placeholder="e.g., Should I accept the senior role at Startup X or stay at Enterprise Y?"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  className="w-full text-sm p-3 bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:bg-white dark:focus:bg-slate-800 transition-all font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>

              {/* 2. Context & Background */}
              <div className="space-y-1.5">
                <label htmlFor="decision-context-input" className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  2. Background Context & Constraints
                </label>
                <textarea
                  id="decision-context-input"
                  rows={3}
                  placeholder="Describe your current situation, time limits, financial buffer, emotional state, or non-negotiables..."
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  className="w-full text-xs p-3 bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:bg-white dark:focus:bg-slate-800 transition-all text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 leading-relaxed"
                />
              </div>

              {/* 3. Options to Compare */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    3. Options to Compare ({options.length} options)
                  </label>
                  {options.length < 6 && (
                    <button
                      id="add-option-btn"
                      onClick={handleAddOption}
                      className="flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Another Option</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {options.map((opt, idx) => (
                    <div
                      key={opt.id}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 space-y-2 relative"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                          Option {String.fromCharCode(65 + idx)}
                        </span>
                        {options.length > 2 && (
                          <button
                            id={`remove-option-btn-${opt.id}`}
                            onClick={() => handleRemoveOption(opt.id)}
                            className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-1 rounded-md cursor-pointer"
                            title="Remove option"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <input
                        id={`option-input-${opt.id}`}
                        type="text"
                        placeholder={`Name of Option ${String.fromCharCode(65 + idx)}`}
                        value={opt.label}
                        onChange={(e) => handleUpdateOption(opt.id, 'label', e.target.value)}
                        className="w-full text-xs p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500 font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                      />

                      <input
                        type="text"
                        placeholder="Brief summary / nuances (optional)"
                        value={opt.description || ''}
                        onChange={(e) => handleUpdateOption(opt.id, 'description', e.target.value)}
                        className="w-full text-[11px] p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500 text-slate-600 dark:text-slate-300 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* 4. Decision Criteria & Priorities */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  4. Evaluation Criteria & Values ({criteria.length} selected)
                </label>

                {/* Selected Criteria Tags */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {criteria.map((c) => (
                    <span
                      key={c}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-100 dark:bg-amber-950/50 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60"
                    >
                      <span>{c}</span>
                      <button
                        onClick={() => handleRemoveCriteria(c)}
                        className="text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-200 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>

                {/* Add Custom Criteria */}
                <div className="flex items-center gap-2">
                  <input
                    id="criteria-input"
                    type="text"
                    placeholder="Add custom criterion (e.g. Relocation tolerance)..."
                    value={newCriteriaText}
                    onChange={(e) => setNewCriteriaText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCriteria();
                      }
                    }}
                    className="flex-1 text-xs p-2 bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                  <button
                    id="add-criteria-btn"
                    onClick={handleAddCriteria}
                    className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer border border-transparent dark:border-slate-700"
                  >
                    Add
                  </button>
                </div>

                {/* Suggested criteria chips */}
                <div className="space-y-1 pt-1">
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">Quick suggestions:</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {PRESET_CRITERIA_SUGGESTIONS.map((presetItem) => {
                      const isSelected = criteria.includes(presetItem);
                      return (
                        <button
                          key={presetItem}
                          onClick={() => handleTogglePresetCriteria(presetItem)}
                          className={`text-[11px] px-2 py-0.5 rounded-md border transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-300 font-bold'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                          }`}
                        >
                          {isSelected ? '✓ ' : '+ '}
                          {presetItem}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 5. Journal Evidence Toggle */}
              <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">Ground Analysis in My Journal</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/50 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">
                      {entries.length} reflections available
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    When enabled, Decision Lab analyzes relevant patterns, past decisions, and values recorded in your private journal reflections.
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    id="use-journal-evidence-toggle"
                    type="checkbox"
                    checked={useJournalEvidence}
                    onChange={(e) => setUseJournalEvidence(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 dark:after:border-slate-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                </label>
              </div>

              {/* In-Progress Loading Banner */}
              {analyzing && (
                <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl p-4 space-y-2 animate-fadeIn">
                  <div className="flex items-center justify-between text-xs font-semibold text-amber-950 dark:text-amber-200">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 text-amber-600 dark:text-amber-400 animate-spin" />
                      <span>{analysisStep}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Button */}
              <div className="pt-2">
                <button
                  id="analyze-decision-btn"
                  onClick={handleAnalyzeDecision}
                  disabled={analyzing || !question.trim()}
                  className="w-full py-3.5 rounded-xl font-bold text-sm text-white bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:cursor-not-allowed shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Scale className="w-4 h-4" />
                  <span>{analyzing ? 'Analyzing Trade-offs & Risks...' : 'Analyze Decision'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

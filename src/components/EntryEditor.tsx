import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Sparkles,
  RefreshCw,
  FileText,
  Brain,
  Lightbulb,
  HelpCircle,
  ListTodo,
  AlertTriangle,
  Check,
  Share2,
  Tag,
  Clock,
  Trash2,
  ChevronRight,
  Info,
  MapPin,
  X,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { InteractionEntry, ChatMessage, ReflectionMode, ReflectionLocation } from '../types';
import { saveInteractionEntry } from '../lib/firebase';
import { stripUndefined } from '../utils/sanitize';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { LocationPickerModal } from './LocationPickerModal';
import { SaveToNotionButton } from './SaveToNotionButton';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import type { User } from 'firebase/auth';

interface EntryEditorProps {
  userId: string;
  user?: User | null;
  currentEntry: InteractionEntry | null;
  onEntrySaved: (entry: InteractionEntry) => void;
  onDeleteEntry: (entryId: string) => Promise<void> | void;
  onOpenSummaryModal: (entry: InteractionEntry) => void;
  onOpenNotionSettings?: () => void;
}

const CATEGORIES: Array<{ id: InteractionEntry['category']; label: string; color: string }> = [
  { id: 'personal', label: 'Personal', color: 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/60' },
  { id: 'mindfulness', label: 'Mindfulness', color: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60' },
  { id: 'work', label: 'Work & Career', color: 'bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800/60' },
  { id: 'creative', label: 'Creative', color: 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60' },
  { id: 'learning', label: 'Learning', color: 'bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/60' },
];

const MODES: Array<{ id: ReflectionMode; label: string; mobileLabel: string; icon: any; desc: string }> = [
  { id: 'reflect', label: 'Deep Reflection', mobileLabel: 'Reflect', icon: Brain, desc: 'Empathetic feedback & mindful synthesis' },
  { id: 'brainstorm', label: 'Brainstorming', mobileLabel: 'Brainstorm', icon: Lightbulb, desc: 'Creative angles & lateral thinking' },
  { id: 'socratic', label: 'Socratic Inquiry', mobileLabel: 'Socratic', icon: HelpCircle, desc: 'Challenging & introspective questions' },
  { id: 'action_plan', label: 'Action Plan', mobileLabel: 'Actions', icon: ListTodo, desc: 'Micro-steps & structured milestones' },
];

export const EntryEditor: React.FC<EntryEditorProps> = ({
  userId,
  user,
  currentEntry,
  onEntrySaved,
  onDeleteEntry,
  onOpenSummaryModal,
  onOpenNotionSettings,
}) => {
  const [title, setTitle] = useState(currentEntry?.title || '');
  const [category, setCategory] = useState<InteractionEntry['category']>(
    currentEntry?.category || 'personal'
  );
  const [mode, setMode] = useState<ReflectionMode>('reflect');
  const [messages, setMessages] = useState<ChatMessage[]>(currentEntry?.messages || []);
  const [inputText, setInputText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);
  const [prompts, setPrompts] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(currentEntry?.tags || []);
  const [copySuccess, setCopySuccess] = useState(false);
  const [modelUsedInfo, setModelUsedInfo] = useState<string | null>(null);

  // Location-Aware Reflections state
  const [location, setLocation] = useState<ReflectionLocation | null>(
    currentEntry?.location || null
  );
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  // Deletion modal state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync state when currentEntry changes
  useEffect(() => {
    if (currentEntry) {
      setTitle(currentEntry.title || '');
      setCategory(currentEntry.category || 'personal');
      setMessages(currentEntry.messages || []);
      setTags(currentEntry.tags || []);
      setLocation(currentEntry.location || null);
    } else {
      setTitle('');
      setCategory('personal');
      setMessages([]);
      setTags([]);
      setLocation(null);
    }
    setSaveStatus('idle');
    setSaveErrorMessage(null);
  }, [currentEntry?.id]);

  // Fetch dynamic prompts
  useEffect(() => {
    fetch('/api/gemini/prompts')
      .then((res) => res.json())
      .then((data) => {
        if (data.prompts && Array.isArray(data.prompts)) {
          setPrompts(data.prompts.map((p: any) => p.text));
        }
      })
      .catch(() => {
        setPrompts([
          'What is one situation currently taking up mental bandwidth?',
          'What went well today that I want to acknowledge and build on?',
          'What is an honest emotion I have been putting off feeling?',
          'If I solved my biggest obstacle this month, what would my day look like?',
        ]);
      });
  }, []);

  // Scroll to bottom of conversation
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  // Auto-save helper with strict validation and error handling
  const persistEntry = async (
    updatedMessages: ChatMessage[],
    updatedTitle?: string,
    extraFields: Partial<InteractionEntry> = {}
  ): Promise<InteractionEntry | null> => {
    if (!userId) return null;

    setSaveStatus('saving');
    setSaveErrorMessage(null);

    const now = new Date().toISOString();
    const activeId = currentEntry?.id || `entry_${Date.now()}`;
    const autoTitle =
      updatedTitle ||
      title ||
      (updatedMessages[0]
        ? updatedMessages[0].content.slice(0, 45) + '...'
        : 'Untitled Reflection');

    const entryToSave: InteractionEntry = stripUndefined({
      id: activeId,
      userId,
      title: autoTitle,
      category,
      tags,
      messages: updatedMessages,
      summary: currentEntry?.summary,
      keyInsights: currentEntry?.keyInsights,
      actionItems: currentEntry?.actionItems,
      location: extraFields.location !== undefined ? extraFields.location : location,
      createdAt: currentEntry?.createdAt || now,
      updatedAt: now,
      ...extraFields,
    });

    try {
      await saveInteractionEntry(userId, entryToSave);
      setSaveStatus('saved');
      onEntrySaved(entryToSave);
      setTimeout(() => setSaveStatus('idle'), 3000);
      return entryToSave;
    } catch (err: any) {
      console.error('Failed to persist interaction to Firestore:', err);
      setSaveStatus('error');
      setSaveErrorMessage(
        err?.message || 'Database write rejected. Check Firestore security permissions.'
      );
      return null;
    }
  };

  // Location Handlers
  const handleLocationConfirmed = async (newLocation: ReflectionLocation | null) => {
    setLocation(newLocation);
    await persistEntry(messages, title, { location: newLocation });
  };

  const handleRemoveLocation = async () => {
    setLocation(null);
    await persistEntry(messages, title, { location: null });
  };

  // Handle submitting user reflection & conversing with Gemini
  const handleSubmitPrompt = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isGenerating) return;

    const userPrompt = inputText.trim();
    const now = new Date().toISOString();

    const userMessage: ChatMessage = {
      id: `msg_user_${Date.now()}`,
      role: 'user',
      content: userPrompt,
      timestamp: now,
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputText('');
    setIsGenerating(true);

    // Initial save of user message to guarantee no lost input
    await persistEntry(newMessages);

    try {
      const response = await fetch('/api/gemini/reflect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          mode,
          category,
          location: location
            ? {
                placeName: location.placeName,
                formattedAddress: location.formattedAddress,
              }
            : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server responded with status ${response.status}`);
      }

      const data = await response.json();
      const modelMessage: ChatMessage = {
        id: `msg_model_${Date.now()}`,
        role: 'model',
        content: data.reply,
        timestamp: new Date().toISOString(),
      };

      const finalMessages = [...newMessages, modelMessage];
      setMessages(finalMessages);
      setModelUsedInfo(data.modelUsed || 'Gemini 3.6 Flash');

      // Guaranteed transaction persistence of both input & reply
      await persistEntry(finalMessages);
    } catch (err: any) {
      console.error('Gemini Reflection API error:', err);
      // Append an error message or keep input accessible
      const errorMessage: ChatMessage = {
        id: `msg_err_${Date.now()}`,
        role: 'model',
        content: `**Notice:** Unable to complete generation with Gemini fallback ladder (${err?.message || 'Network error'}). Please try again or check your connection.`,
        timestamp: new Date().toISOString(),
      };
      setMessages([...newMessages, errorMessage]);
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle synthesis & summarization
  const handleSummarize = async () => {
    if (messages.length === 0 || isSummarizing) return;

    setIsSummarizing(true);
    try {
      const response = await fetch('/api/gemini/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages,
          existingTitle: title,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to summarize conversation.');
      }

      const data = await response.json();
      const newTitle = data.suggestedTitle || title;
      if (!title) setTitle(newTitle);

      const saved = await persistEntry(messages, newTitle, {
        summary: data.summary,
        keyInsights: data.keyInsights || [],
        actionItems: data.actionItems || [],
      });

      if (saved) {
        onOpenSummaryModal(saved);
      }
    } catch (err: any) {
      console.error('Summarize error:', err);
      setSaveErrorMessage('Failed to generate summary: ' + err.message);
    } finally {
      setIsSummarizing(false);
    }
  };

  // Add tag
  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const cleaned = tagInput.trim().toLowerCase().replace(/^#/, '');
      if (!tags.includes(cleaned)) {
        const newTags = [...tags, cleaned];
        setTags(newTags);
        persistEntry(messages, title, { tags: newTags });
      }
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    const newTags = tags.filter((t) => t !== tagToRemove);
    setTags(newTags);
    persistEntry(messages, title, { tags: newTags });
  };

  const copyToClipboard = () => {
    const transcript = messages
      .map((m) => `${m.role === 'model' ? 'Gemini' : 'Me'} (${new Date(m.timestamp).toLocaleTimeString()}):\n${m.content}`)
      .join('\n\n---\n\n');
    navigator.clipboard.writeText(transcript);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-5">
      {/* Top Header Card: Title, Category, Status */}
      <div className="bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-200/90 dark:border-slate-800/90 p-5 sm:p-6 shadow-xs space-y-4">
        {/* Title Input & Save Status Badge */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex-1">
            <input
              id="entry-title-input"
              type="text"
              placeholder="Title your journal reflection..."
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (messages.length > 0) {
                  persistEntry(messages, e.target.value);
                }
              }}
              className="w-full text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none bg-transparent tracking-tight"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Save Status Badge */}
            {saveStatus === 'saving' && (
              <Badge variant="amber" icon={<RefreshCw className="w-3 h-3 animate-spin text-amber-600 dark:text-amber-400" />}>
                Saving to Firestore...
              </Badge>
            )}
            {saveStatus === 'saved' && (
              <Badge variant="emerald" icon={<Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />}>
                Synced
              </Badge>
            )}
            {saveStatus === 'idle' && (
              <Badge variant="default" icon={<Clock className="w-3 h-3 text-slate-400" />}>
                {messages.length > 0 ? 'Saved' : 'Draft'}
              </Badge>
            )}
            {saveStatus === 'error' && (
              <Badge variant="rose" icon={<AlertTriangle className="w-3 h-3 text-rose-600 dark:text-rose-400" />}>
                Save Failed
              </Badge>
            )}
          </div>
        </div>

        {/* Action Row: Category, Location, Quick Actions */}
        <div className="flex items-center justify-between gap-3 flex-wrap pt-3 border-t border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Category selection */}
            <select
              id="entry-category-select"
              value={category}
              onChange={(e) => {
                const newCat = e.target.value as InteractionEntry['category'];
                setCategory(newCat);
                if (messages.length > 0) {
                  persistEntry(messages, title, { category: newCat });
                }
              }}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer focus:outline-none transition-colors"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>

            {/* Location Badge / Add Location Control */}
            {location ? (
              <div
                id="active-location-badge"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/60 text-indigo-900 dark:text-indigo-200 text-xs font-medium"
              >
                <MapPin className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span className="font-semibold truncate max-w-[130px] sm:max-w-[200px]">
                  {location.placeName}
                </span>
                {location.formattedAddress && (
                  <span className="text-slate-500 dark:text-slate-400 text-[11px] truncate max-w-[150px] hidden md:inline">
                    • {location.formattedAddress}
                  </span>
                )}
                <button
                  type="button"
                  id="view-location-map-btn"
                  onClick={() => setIsLocationModalOpen(true)}
                  className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 underline ml-1 cursor-pointer font-medium"
                  title="View on map or edit place"
                >
                  Map
                </button>
                <button
                  type="button"
                  id="remove-location-badge-btn"
                  onClick={handleRemoveLocation}
                  className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 ml-1 p-0.5 rounded cursor-pointer transition-colors"
                  title="Remove location from this reflection"
                  aria-label="Remove location"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <Button
                id="add-location-btn"
                variant="outline"
                size="sm"
                onClick={() => setIsLocationModalOpen(true)}
                leftIcon={<MapPin className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />}
                title="Attach an optional place or setting to this reflection"
              >
                Add Location
              </Button>
            )}
          </div>

          {/* Quick Actions (Summarize, Save to Notion, Share, Delete) */}
          {messages.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <Button
                id="summarize-btn"
                variant="amber"
                size="sm"
                onClick={handleSummarize}
                isLoading={isSummarizing}
                leftIcon={<Sparkles className="w-3.5 h-3.5 text-amber-200" />}
                title="Synthesize conversation into key insights and executive summary"
              >
                {isSummarizing ? 'Synthesizing...' : 'Summarize & Insights'}
              </Button>

              {currentEntry && (
                <SaveToNotionButton
                  user={user || null}
                  entry={currentEntry}
                  onOpenNotionSettings={onOpenNotionSettings || (() => {})}
                  onEntryUpdated={onEntrySaved}
                />
              )}

              <button
                type="button"
                id="copy-transcript-btn"
                onClick={copyToClipboard}
                className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Copy transcript"
              >
                {copySuccess ? <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : <Share2 className="w-4 h-4" />}
              </button>

              {currentEntry?.id && (
                <button
                  type="button"
                  id="delete-current-entry-btn"
                  onClick={() => {
                    setDeleteErrorMessage(null);
                    setIsDeleteDialogOpen(true);
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                  title="Delete reflection"
                  aria-label="Delete reflection"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Tags bar */}
        <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-slate-100 dark:border-slate-800/80">
          <Tag className="w-3.5 h-3.5 text-slate-400" />
          {tags.map((t) => (
            <Badge key={t} variant="default" className="gap-1">
              #{t}
              <button
                type="button"
                onClick={() => removeTag(t)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 ml-0.5 cursor-pointer font-bold"
              >
                ×
              </button>
            </Badge>
          ))}
          <input
            type="text"
            placeholder="Add tag and press Enter..."
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleAddTag}
            className="text-xs bg-transparent focus:outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 text-slate-700 dark:text-slate-200 min-w-[140px]"
          />
        </div>
      </div>

      {/* Save Error Banner with Retry */}
      {saveStatus === 'error' && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-200 text-xs sm:text-sm flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>{saveErrorMessage || 'Firestore write was rejected.'}</span>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => persistEntry(messages, title)}
          >
            Retry Save
          </Button>
        </div>
      )}

      {/* Mode Selector - Streamlined Segmented Rail */}
      <div className="bg-white dark:bg-[#131b2e] rounded-xl border border-slate-200/80 dark:border-slate-800/80 p-2 sm:p-2.5 shadow-2xs space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center flex-wrap sm:flex-nowrap gap-1.5 sm:overflow-x-auto scrollbar-none py-0.5 w-full">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider pl-0.5 pr-1 shrink-0">
              Persona:
            </span>
            {MODES.map((m) => {
              const Icon = m.icon;
              const isSelected = mode === m.id;
              return (
                <button
                  key={m.id}
                  id={`mode-btn-${m.id}`}
                  type="button"
                  onClick={() => setMode(m.id)}
                  className={`inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                    isSelected
                      ? 'bg-slate-900 dark:bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200/70 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                  title={m.desc}
                >
                  <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-300' : 'text-slate-500 dark:text-slate-400'}`} />
                  <span className="hidden sm:inline">{m.label}</span>
                  <span className="sm:hidden">{m.mobileLabel}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 px-1">
          <Info className="w-3 h-3 text-slate-400 shrink-0" />
          <span>{MODES.find((m) => m.id === mode)?.desc}</span>
        </div>
      </div>

      {/* Conversation / Reflection Stream */}
      <div className="space-y-4 min-h-[220px]">
        {messages.length === 0 ? (
          <div className="bg-white dark:bg-[#131b2e] rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 flex items-center justify-center mx-auto">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">What's on your mind today?</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
                Write freely. Gemini will reflect back your thoughts, uncover deeper themes, and help you brainstorm next steps.
              </p>
            </div>

            {/* Inspiration Prompt Pills */}
            <div className="pt-2">
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-2">Try one of these reflective starters:</div>
              <div className="flex flex-wrap gap-2 justify-center max-w-2xl mx-auto">
                {prompts.slice(0, 4).map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setInputText(p);
                    }}
                    className="text-xs bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-full text-left transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <span>{p}</span>
                    <ChevronRight className="w-3 h-3 text-slate-400" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg, idx) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id || idx}
                  className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div className="w-8 h-8 rounded-xl bg-slate-900 dark:bg-[#1a233a] text-amber-300 flex items-center justify-center shrink-0 mt-1 shadow-xs border border-transparent dark:border-slate-700">
                      <Sparkles className="w-4 h-4" />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] sm:max-w-[78%] rounded-2xl p-4 sm:p-5 shadow-xs ${
                      isUser
                        ? 'bg-slate-900 dark:bg-indigo-600 text-white rounded-br-xs'
                        : 'bg-white dark:bg-[#131b2e] text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800/90 rounded-bl-xs'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4 mb-2 pb-1.5 border-b border-white/10 dark:border-slate-800">
                      <span className={`text-[11px] font-semibold ${isUser ? 'text-slate-300 dark:text-indigo-100' : 'text-slate-600 dark:text-slate-400'}`}>
                        {isUser ? 'Your Journal Reflection' : 'Gemini 3.6 Flash Reflection'}
                      </span>
                      <span className={`text-[10px] ${isUser ? 'text-slate-400 dark:text-indigo-200' : 'text-slate-400 dark:text-slate-400'}`}>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className={`prose prose-sm dark:prose-invert max-w-none ${isUser ? 'text-slate-100 font-serif-journal text-base leading-relaxed' : 'text-slate-800 dark:text-slate-200'}`}>
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  </div>

                  {isUser && (
                    <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0 mt-1 font-semibold text-xs border border-transparent dark:border-slate-700">
                      You
                    </div>
                  )}
                </div>
              );
            })}

            {isGenerating && (
              <div className="flex gap-3 justify-start items-center">
                <div className="w-8 h-8 rounded-xl bg-slate-900 dark:bg-[#1a233a] text-amber-300 flex items-center justify-center shrink-0 shadow-xs border border-transparent dark:border-slate-700">
                  <Sparkles className="w-4 h-4 animate-spin" />
                </div>
                <div className="bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 rounded-2xl rounded-bl-xs p-4 text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2 shadow-xs">
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-bounce" />
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-bounce [animation-delay:0.2s]" />
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-bounce [animation-delay:0.4s]" />
                  <span className="font-medium text-slate-700 dark:text-slate-300">Gemini is synthesizing insights...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input / Reflection Composer Box */}
      <div className="sticky bottom-4 z-20 bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-300 dark:border-slate-700/80 shadow-md p-3 sm:p-4 focus-within:border-slate-800 dark:focus-within:border-indigo-400 transition-colors">
        <form onSubmit={handleSubmitPrompt} className="space-y-3">
          <textarea
            id="journal-input-textarea"
            rows={3}
            placeholder={
              messages.length === 0
                ? "Write your entry, thoughts, or reflections here (e.g. 'I felt overwhelmed by the deadline today, but noticed a new pattern...')..."
                : "Respond to Gemini, continue the reflection, or ask for a specific brainstorm..."
            }
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleSubmitPrompt();
              }
            }}
            className="w-full text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none resize-none bg-transparent font-serif-journal text-base"
          />

          <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex-wrap">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="hidden sm:inline">Press <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[10px] text-slate-600 dark:text-slate-300">Ctrl/⌘+Enter</kbd> to submit</span>
              {modelUsedInfo && (
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  Model: {modelUsedInfo}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                id="submit-reflection-btn"
                type="submit"
                variant="primary"
                size="md"
                disabled={!inputText.trim() || isGenerating}
                isLoading={isGenerating}
                leftIcon={!isGenerating ? <Send className="w-3.5 h-3.5 text-amber-300" /> : undefined}
              >
                {messages.length === 0 ? 'Start Reflection' : 'Send to Gemini'}
              </Button>
            </div>
          </div>
        </form>
      </div>

      {/* In-app Deletion Confirmation Dialog */}
      <DeleteConfirmModal
        isOpen={isDeleteDialogOpen}
        title="Delete Reflection"
        entryTitle={title || 'Untitled Reflection'}
        isDeleting={isDeleting}
        errorMessage={deleteErrorMessage}
        onCancel={() => {
          if (!isDeleting) {
            setIsDeleteDialogOpen(false);
            setDeleteErrorMessage(null);
          }
        }}
        onConfirm={async () => {
          if (!currentEntry?.id) return;
          setIsDeleting(true);
          setDeleteErrorMessage(null);
          try {
            await onDeleteEntry(currentEntry.id);
            setIsDeleteDialogOpen(false);
          } catch (err: any) {
            console.error('Failed to delete reflection:', err);
            setDeleteErrorMessage(
              err?.message || 'Failed to delete reflection from Firestore. Please check your connection.'
            );
          } finally {
            setIsDeleting(false);
          }
        }}
      />

      {/* Location Picker Modal */}
      <LocationPickerModal
        isOpen={isLocationModalOpen}
        initialLocation={location}
        onConfirm={handleLocationConfirmed}
        onClose={() => setIsLocationModalOpen(false)}
      />
    </div>
  );
};

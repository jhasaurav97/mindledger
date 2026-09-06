import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Calendar,
  MessageSquare,
  Sparkles,
  Trash2,
  ArrowRight,
  Download,
  BookOpen,
  Tag,
  Clock,
  Layers,
  CheckCircle2,
  FileText,
  MapPin,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import type { InteractionEntry } from '../types';
import { SaveToNotionButton } from './SaveToNotionButton';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';

interface HistoryViewProps {
  user?: User | null;
  entries: InteractionEntry[];
  onSelectEntry: (entry: InteractionEntry) => void;
  onDeleteEntry: (entryId: string) => Promise<void> | void;
  onOpenSummaryModal: (entry: InteractionEntry) => void;
  onNewEntry: () => void;
  onOpenNotionSettings?: () => void;
  onEntryUpdated?: (entry: InteractionEntry) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  user,
  entries,
  onSelectEntry,
  onDeleteEntry,
  onOpenSummaryModal,
  onNewEntry,
  onOpenNotionSettings,
  onEntryUpdated,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');

  // Deletion modal state
  const [entryToDelete, setEntryToDelete] = useState<InteractionEntry | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState<string | null>(null);

  // Collect all unique tags
  const allTags = useMemo(() => {
    const tagsSet = new Set<string>();
    entries.forEach((e) => {
      e.tags?.forEach((t) => tagsSet.add(t));
    });
    return Array.from(tagsSet);
  }, [entries]);

  // Filter entries
  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      const matchesCategory =
        selectedCategory === 'all' || entry.category === selectedCategory;

      const matchesTag =
        selectedTag === 'all' || (entry.tags && entry.tags.includes(selectedTag));

      const query = searchQuery.toLowerCase().trim();
      if (!query) return matchesCategory && matchesTag;

      const titleMatch = (entry.title || '').toLowerCase().includes(query);
      const summaryMatch = (entry.summary || '').toLowerCase().includes(query);
      const messageMatch = (entry.messages || []).some((m) =>
        m.content.toLowerCase().includes(query)
      );
      const tagMatch = (entry.tags || []).some((t) => t.toLowerCase().includes(query));

      return matchesCategory && matchesTag && (titleMatch || summaryMatch || messageMatch || tagMatch);
    });
  }, [entries, searchQuery, selectedCategory, selectedTag]);

  // Export all entries as JSON backup
  const exportAllAsJSON = () => {
    const blob = new Blob([JSON.stringify(entries, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reflections_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case 'mindfulness':
        return 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60';
      case 'work':
        return 'bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800/60';
      case 'creative':
        return 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60';
      case 'learning':
        return 'bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/60';
      case 'personal':
      default:
        return 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/60';
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Top Header & Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Your Reflection Archive</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            All your conversations and insights safely isolated in Firestore.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {entries.length > 0 && (
            <Button
              id="export-archive-btn"
              variant="outline"
              size="sm"
              onClick={exportAllAsJSON}
              leftIcon={<Download className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />}
            >
              Export JSON
            </Button>
          )}

          <Button
            id="new-reflection-btn"
            variant="primary"
            size="sm"
            onClick={onNewEntry}
            leftIcon={<BookOpen className="w-3.5 h-3.5 text-amber-300" />}
          >
            Write New Reflection
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-200 dark:border-slate-800/90 p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="history-search-input"
              type="text"
              placeholder="Search past thoughts, summaries, and transcripts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-slate-800 dark:focus:border-indigo-400 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
            <select
              id="category-filter-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 cursor-pointer focus:outline-none w-full sm:w-auto"
            >
              <option value="all">All Categories</option>
              <option value="personal">Personal</option>
              <option value="mindfulness">Mindfulness</option>
              <option value="work">Work & Career</option>
              <option value="creative">Creative</option>
              <option value="learning">Learning</option>
            </select>

            {allTags.length > 0 && (
              <select
                id="tag-filter-select"
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value)}
                className="text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 cursor-pointer focus:outline-none w-full sm:w-auto"
              >
                <option value="all">All Tags</option>
                {allTags.map((tag) => (
                  <option key={tag} value={tag}>
                    #{tag}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Entries List */}
      {filteredEntries.length === 0 ? (
        <div className="bg-white dark:bg-[#131b2e] rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
              {entries.length === 0 ? 'No reflections recorded yet' : 'No matching reflections found'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
              {entries.length === 0
                ? 'Start your first conversation with Gemini to explore your thoughts and generate insights.'
                : 'Try clearing your search query or adjusting your category filter.'}
            </p>
          </div>
          {entries.length === 0 && (
            <button
              onClick={onNewEntry}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-500 text-white text-xs font-medium shadow-xs cursor-pointer transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Begin First Reflection</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredEntries.map((entry) => {
            const userMsgCount = (entry.messages || []).filter((m) => m.role === 'user').length;
            const modelMsgCount = (entry.messages || []).filter((m) => m.role === 'model').length;
            const previewText =
              entry.summary ||
              (entry.messages && entry.messages[0] ? entry.messages[0].content : 'No content');

            return (
              <div
                key={entry.id}
                className="bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-200 dark:border-slate-800/90 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Top tags & date */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                      className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${getCategoryBadgeClass(
                        entry.category
                      )}`}
                    >
                      {entry.category.toUpperCase()}
                    </span>

                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(entry.updatedAt || entry.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Title */}
                  <h3
                    onClick={() => onSelectEntry(entry)}
                    className="text-base font-semibold text-slate-900 dark:text-slate-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors cursor-pointer line-clamp-1"
                  >
                    {entry.title || 'Untitled Reflection'}
                  </h3>

                  {/* Attached Location Badge if present */}
                  {entry.location && (
                    <div className="flex items-center gap-1.5 mt-1 text-[11px] text-indigo-700 dark:text-indigo-300 font-medium">
                      <MapPin className="w-3 h-3 text-indigo-500 shrink-0" />
                      <span className="truncate max-w-[200px]">{entry.location.placeName}</span>
                      {entry.location.formattedAddress && (
                        <span className="text-slate-400 dark:text-slate-500 font-normal truncate hidden sm:inline">
                          • {entry.location.formattedAddress}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Snippet / Summary */}
                  <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 font-serif-journal line-clamp-3 leading-relaxed">
                    {previewText}
                  </p>

                  {/* Tags */}
                  {entry.tags && entry.tags.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap mt-3">
                      {entry.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                    <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                    <span>{userMsgCount + modelMsgCount} turns</span>
                    {entry.summary && (
                      <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded text-[10px] font-medium border border-emerald-200 dark:border-emerald-800/60">
                        <Sparkles className="w-2.5 h-2.5" /> Synthesized
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {entry.summary && (
                      <button
                        onClick={() => onOpenSummaryModal(entry)}
                        className="text-xs font-medium text-amber-700 dark:text-amber-300 hover:text-amber-800 dark:hover:text-amber-200 bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900/50 px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-800/60 transition-colors cursor-pointer"
                        title="View Executive Summary & Insights"
                      >
                        Insights
                      </button>
                    )}

                    <SaveToNotionButton
                      user={user || null}
                      entry={entry}
                      onOpenNotionSettings={onOpenNotionSettings || (() => {})}
                      onEntryUpdated={onEntryUpdated}
                    />

                    <button
                      onClick={() => onSelectEntry(entry)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-3 py-1 rounded-lg transition-colors cursor-pointer"
                    >
                      <span>Resume</span>
                      <ArrowRight className="w-3 h-3 text-slate-600 dark:text-slate-400" />
                    </button>

                    <button
                      id={`delete-entry-${entry.id}`}
                      onClick={() => {
                        setDeleteErrorMessage(null);
                        setEntryToDelete(entry);
                      }}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                      title="Delete reflection"
                      aria-label={`Delete ${entry.title || 'reflection'}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* In-app Deletion Confirmation Dialog */}
      <DeleteConfirmModal
        isOpen={Boolean(entryToDelete)}
        title="Delete Reflection"
        entryTitle={entryToDelete?.title || 'Untitled Reflection'}
        isDeleting={isDeleting}
        errorMessage={deleteErrorMessage}
        onCancel={() => {
          if (!isDeleting) {
            setEntryToDelete(null);
            setDeleteErrorMessage(null);
          }
        }}
        onConfirm={async () => {
          if (!entryToDelete) return;
          setIsDeleting(true);
          setDeleteErrorMessage(null);
          try {
            await onDeleteEntry(entryToDelete.id);
            setEntryToDelete(null);
          } catch (err: any) {
            console.error('Failed to delete interaction entry:', err);
            setDeleteErrorMessage(
              err?.message || 'Failed to delete reflection from Firestore. Please verify your connection.'
            );
          } finally {
            setIsDeleting(false);
          }
        }}
      />
    </div>
  );
};

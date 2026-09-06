import React, { useState } from 'react';
import { ExternalLink, Check, RefreshCw, AlertCircle } from 'lucide-react';
import type { User } from 'firebase/auth';
import type { InteractionEntry } from '../types';
import { exportToNotion, getNotionStatus } from '../lib/notion';
import { saveInteractionEntry } from '../lib/firebase';
import { Button } from './ui/Button';

interface SaveToNotionButtonProps {
  user: User | null;
  entry: InteractionEntry | null;
  onOpenNotionSettings: () => void;
  onEntryUpdated?: (entry: InteractionEntry) => void;
  variant?: 'sm' | 'md' | 'compact';
  className?: string;
}

export const SaveToNotionButton: React.FC<SaveToNotionButtonProps> = ({
  user,
  entry,
  onOpenNotionSettings,
  onEntryUpdated,
  variant = 'sm',
  className = '',
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  if (!entry || !entry.id) return null;

  const hasExported = Boolean(entry.notionExport?.pageUrl);

  const handleExport = async (e?: React.MouseEvent, forceNew = false) => {
    e?.stopPropagation();
    if (!user) return;

    setErrorMessage(null);
    setIsExporting(true);

    try {
      // 1. Verify connection status first
      const status = await getNotionStatus(user);
      if (!status.connected) {
        setIsExporting(false);
        onOpenNotionSettings();
        return;
      }

      if (!status.destinationPageId) {
        setIsExporting(false);
        onOpenNotionSettings();
        return;
      }

      // 2. Perform export
      const result = await exportToNotion(user, {
        reflectionId: entry.id,
        reflectionData: entry,
        destinationPageId: status.destinationPageId,
        forceNew,
      });

      if (result.success && result.pageUrl) {
        setJustSaved(true);
        setTimeout(() => setJustSaved(false), 4000);

        // Update entry with Notion export metadata
        const updatedEntry: InteractionEntry = {
          ...entry,
          notionExport: {
            pageId: result.pageId,
            pageUrl: result.pageUrl,
            exportedAt: new Date().toISOString(),
          },
        };

        await saveInteractionEntry(user.uid, updatedEntry);
        onEntryUpdated?.(updatedEntry);
      }
    } catch (err: any) {
      console.error('Notion export error:', err);
      setErrorMessage(err?.message || 'Failed to export reflection to Notion.');
    } finally {
      setIsExporting(false);
    }
  };

  if (hasExported) {
    return (
      <div className={`inline-flex items-center gap-1.5 ${className}`}>
        {/* Open in Notion link */}
        <a
          href={entry.notionExport!.pageUrl}
          target="_blank"
          rel="noopener noreferrer"
          id={`open-notion-${entry.id}`}
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors border border-slate-200 dark:border-slate-700 shadow-2xs"
          title="Open this reflection page in Notion"
        >
          <span className="font-bold text-[11px] text-slate-900 dark:text-white">N</span>
          <span>Open in Notion</span>
          <ExternalLink className="w-3 h-3 text-slate-500" />
        </a>

        {/* Option to re-sync or update */}
        <button
          type="button"
          onClick={(e) => handleExport(e, true)}
          disabled={isExporting}
          className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          title="Re-export / Update Notion Page"
          aria-label="Re-export to Notion"
        >
          <RefreshCw className={`w-3 h-3 ${isExporting ? 'animate-spin text-amber-500' : ''}`} />
        </button>
      </div>
    );
  }

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <Button
        id={`save-notion-${entry.id}`}
        variant="outline"
        size={variant === 'md' ? 'md' : 'sm'}
        onClick={(e) => handleExport(e)}
        isLoading={isExporting}
        leftIcon={
          justSaved ? (
            <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <span className="font-bold text-xs text-slate-900 dark:text-white">N</span>
          )
        }
        className="text-xs shadow-2xs border-slate-200 dark:border-slate-700"
        title="Export this reflection to your connected Notion workspace"
      >
        {isExporting
          ? 'Saving to Notion...'
          : justSaved
          ? 'Saved to Notion!'
          : 'Save to Notion'}
      </Button>

      {errorMessage && (
        <div
          onClick={() => setErrorMessage(null)}
          className="absolute left-0 -top-8 whitespace-nowrap bg-rose-900 text-rose-100 text-[11px] px-2 py-1 rounded-md shadow-md flex items-center gap-1 z-30 cursor-pointer animate-in fade-in"
        >
          <AlertCircle className="w-3 h-3 text-rose-300" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};

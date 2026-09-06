import React from 'react';
import { Sparkles, CheckCircle, ArrowRight, Lightbulb, Target } from 'lucide-react';
import type { User } from 'firebase/auth';
import type { InteractionEntry } from '../types';
import { SaveToNotionButton } from './SaveToNotionButton';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';

interface SummaryModalProps {
  user?: User | null;
  entry: InteractionEntry | null;
  isOpen: boolean;
  onClose: () => void;
  onResume: (entry: InteractionEntry) => void;
  onOpenNotionSettings?: () => void;
  onEntryUpdated?: (entry: InteractionEntry) => void;
}

export const SummaryModal: React.FC<SummaryModalProps> = ({
  user,
  entry,
  isOpen,
  onClose,
  onResume,
  onOpenNotionSettings,
  onEntryUpdated,
}) => {
  if (!entry) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      icon={<Sparkles className="w-4 h-4 text-amber-600" />}
      title="Gemini Reflection Synthesis"
      description={entry.title || 'Untitled Reflection'}
      footer={
        <div className="flex items-center justify-between w-full">
          <div>
            <SaveToNotionButton
              user={user || null}
              entry={entry}
              onOpenNotionSettings={onOpenNotionSettings || (() => {})}
              onEntryUpdated={onEntryUpdated}
            />
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                onClose();
                onResume(entry);
              }}
              rightIcon={<ArrowRight className="w-3.5 h-3.5 text-amber-300" />}
            >
              Continue in Canvas
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Executive Summary */}
        {entry.summary && (
          <div className="bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40 rounded-xl p-4.5 space-y-1.5 shadow-2xs">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 dark:text-amber-300">
              <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Executive Summary</span>
            </div>
            <p className="text-xs sm:text-sm text-amber-950 dark:text-amber-100 font-serif-journal leading-relaxed">
              {entry.summary}
            </p>
          </div>
        )}

        {/* Key Insights */}
        {entry.keyInsights && entry.keyInsights.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              <Lightbulb className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Core Insights & Patterns</span>
            </div>
            <div className="grid gap-2">
              {entry.keyInsights.map((insight, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200"
                >
                  <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{insight}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Items */}
        {entry.actionItems && entry.actionItems.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              <Target className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
              <span>Actionable Steps & Milestones</span>
            </div>
            <div className="grid gap-2">
              {entry.actionItems.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 p-3 rounded-xl bg-sky-50/60 dark:bg-sky-950/30 border border-sky-200/70 dark:border-sky-900/40 text-xs text-sky-950 dark:text-sky-200"
                >
                  <div className="w-4 h-4 rounded-full bg-sky-200 dark:bg-sky-900/80 text-sky-800 dark:text-sky-300 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    {idx + 1}
                  </div>
                  <span className="leading-relaxed font-medium">{item}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Transcript Metadata */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <span>Category:</span>
            <Badge variant="default" className="capitalize">{entry.category}</Badge>
          </div>
          <span>Recorded: {new Date(entry.createdAt).toLocaleDateString()}</span>
        </div>
      </div>
    </Modal>
  );
};

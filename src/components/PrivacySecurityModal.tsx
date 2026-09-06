import React from 'react';
import { ShieldCheck, Lock, Database, Key } from 'lucide-react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';

interface PrivacySecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (path: string) => void;
}

export const PrivacySecurityModal: React.FC<PrivacySecurityModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      icon={<ShieldCheck className="w-4 h-4 text-emerald-700" />}
      title="Security & Isolation Architecture"
      description="How your journal reflections and credentials remain protected"
      footer={
        <div className="w-full flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
            <a
              href="/privacy"
              onClick={(e) => {
                if (onNavigate) {
                  e.preventDefault();
                  onClose();
                  onNavigate('/privacy');
                }
              }}
              className="text-amber-600 dark:text-amber-400 hover:underline font-medium"
            >
              Full Privacy Policy
            </a>
            <span>•</span>
            <a
              href="/terms"
              onClick={(e) => {
                if (onNavigate) {
                  e.preventDefault();
                  onClose();
                  onNavigate('/terms');
                }
              }}
              className="text-amber-600 dark:text-amber-400 hover:underline font-medium"
            >
              Terms of Service
            </a>
          </div>
          <Button variant="primary" size="sm" onClick={onClose}>
            Got it
          </Button>
        </div>
      }
    >
      <div className="space-y-4 text-xs text-slate-700 dark:text-slate-300">
        <div className="p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 text-emerald-950 dark:text-emerald-300 space-y-2">
          <div className="flex items-center gap-2 font-bold text-xs">
            <Lock className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
            <span>Owner-Bound Firestore Isolation</span>
          </div>
          <p className="leading-relaxed">
            Every journal entry is stored directly under <code className="bg-emerald-100/80 dark:bg-emerald-900/60 px-1.5 py-0.5 rounded font-mono text-[11px]">/users/{'{userId}'}/interactions/{'{interactionId}'}</code>.
            Deployed Firestore Security Rules explicitly verify <code className="bg-emerald-100/80 dark:bg-emerald-900/60 px-1.5 py-0.5 rounded font-mono text-[11px]">request.auth.uid == userId</code>, ensuring no user can read or write another user&apos;s data.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-slate-100">
              <Key className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Zero Password Storage</span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-[11px]">
              Authentication is outsourced securely to Google Identity / Firebase Authentication. Passwords are never collected, hashed, or stored.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-slate-100">
              <Database className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
              <span>Server-Side Secret Isolation</span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-[11px]">
              Gemini API calls are proxied through the server backend. API keys and service credentials never touch the client browser bundle.
            </p>
          </div>
        </div>

        {/* Rules snippet */}
        <div className="space-y-1.5 pt-1">
          <div className="font-semibold text-slate-800 dark:text-slate-200 text-xs">Active Firestore Security Rules:</div>
          <pre className="p-3.5 bg-slate-900 dark:bg-slate-950 text-amber-300 rounded-xl font-mono text-[11px] overflow-x-auto leading-relaxed border border-slate-800 dark:border-slate-800/80">
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;

      match /interactions/{interactionId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
    match /{document=**} {
      allow read, write: if false;
    }
  }
}`}
          </pre>
        </div>
      </div>
    </Modal>
  );
};

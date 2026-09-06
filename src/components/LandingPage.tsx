import React, { useState, useEffect } from 'react';
import { Sparkles, Shield, Lock, Brain, Compass, BookOpen, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { signInWithGoogle, isMobileBrowser, getLastRedirectError } from '../lib/firebase';

interface LandingPageProps {
  onOpenPrivacyModal: () => void;
  onNavigate?: (path: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onOpenPrivacyModal, onNavigate }) => {
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const redirectErr = getLastRedirectError();
    if (redirectErr) {
      setAuthError(redirectErr);
    }
  }, []);

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    if (onNavigate) {
      e.preventDefault();
      onNavigate(path);
    }
  };

  const handleSignIn = async () => {
    setLoading(true);
    setAuthError(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error('Sign-in notification:', err);
      // Suppress alert banner if user intentionally closed the account picker popup
      if (
        err?.code !== 'auth/popup-closed-by-user' &&
        err?.code !== 'auth/cancelled-popup-request'
      ) {
        setAuthError(
          err?.message || 'Authentication encountered an error. Please try again.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col justify-between py-12 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
      {/* Top Banner / Welcome */}
      <div className="text-center max-w-3xl mx-auto pt-6 pb-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 text-xs font-medium mb-6">
          <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          <span>User-Authenticated AI Journal & Reflection Engine</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-slate-900 dark:text-slate-100 leading-tight">
          Reflect deeper, think clearer with your private{' '}
          <span className="text-amber-600 dark:text-amber-400 font-serif-journal italic font-normal">Gemini companion</span>
        </h1>

        <p className="mt-5 text-lg text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl mx-auto">
          Capture multi-turn thoughts, explore Socratic inquiry, brainstorm creative horizons, and distill key insights—securely isolated in your personal Firestore database.
        </p>

        {/* Error notification if any */}
        {authError && (
          <div className="mt-6 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-200 text-sm flex items-start gap-3 max-w-xl mx-auto text-left">
            <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-medium">Authentication Notice</div>
              <div className="text-xs text-rose-700 dark:text-rose-300 mt-0.5">{authError}</div>
            </div>
          </div>
        )}

        {/* Sign In CTA */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            id="google-signin-btn"
            onClick={handleSignIn}
            disabled={loading}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white font-medium text-base shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.17 0 9.99 0 12s.45 3.83 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
            )}
            <span>{loading ? 'Authenticating with Google...' : 'Continue with Google Sign-In'}</span>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
          </button>

          <div className="flex items-center gap-3 text-xs">
            <button
              id="learn-security-btn"
              onClick={onOpenPrivacyModal}
              className="font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 underline underline-offset-4 px-2 py-1 cursor-pointer"
            >
              Security Guarantees
            </button>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <a
              href="/privacy"
              onClick={(e) => handleLinkClick(e, '/privacy')}
              className="font-medium text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 underline underline-offset-4 px-2 py-1"
            >
              Privacy Policy
            </a>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <a
              href="/terms"
              onClick={(e) => handleLinkClick(e, '/terms')}
              className="font-medium text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 underline underline-offset-4 px-2 py-1"
            >
              Terms of Service
            </a>
          </div>
        </div>

        <div className="mt-4 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center gap-2">
          <Lock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Zero passwords stored • Firebase Auth • Strictly owner-bound Firestore isolation</span>
        </div>
      </div>

      {/* Feature Pillar Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-8">
        <div className="bg-white dark:bg-[#131b2e] p-6 rounded-2xl border border-slate-200/90 dark:border-slate-800/90 shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 flex items-center justify-center mb-4">
              <Brain className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Multi-Turn Gemini Dialogue</h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Engage in rich, contextual reflections with Gemini 3.6 Flash. Select between Deep Reflection, Lateral Brainstorming, Socratic Inquiry, and Action Planning.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>Resilient automated model fallback</span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#131b2e] p-6 rounded-2xl border border-slate-200/90 dark:border-slate-800/90 shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 flex items-center justify-center mb-4">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Isolated Firestore Security</h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Every journal entry, message, and summary is stored directly under <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-slate-800 dark:text-slate-200">/users/{'{uid}'}/interactions</code> with strict owner-bound rules.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Zero cross-user data leakage</span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#131b2e] p-6 rounded-2xl border border-slate-200/90 dark:border-slate-800/90 shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-950/50 text-sky-800 dark:text-sky-300 flex items-center justify-center mb-4">
              <Compass className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Synthesized Insights & History</h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Instantly synthesize complex multi-turn conversations into concise takeaways, actionable goals, and structured takeaways with searchable recall.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
            <span>Real-time cloud synchronization</span>
          </div>
        </div>
      </div>

      {/* Footer / Credential info & Public Legal Links */}
      <footer className="py-8 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-slate-400" />
          <span>MindLedger • Powered by Google Cloud & Gemini</span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-medium">
          <a
            href="/privacy"
            onClick={(e) => handleLinkClick(e, '/privacy')}
            className="text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 underline underline-offset-4 transition-colors"
          >
            Privacy Policy
          </a>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <a
            href="/terms"
            onClick={(e) => handleLinkClick(e, '/terms')}
            className="text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 underline underline-offset-4 transition-colors"
          >
            Terms of Service
          </a>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <button
            type="button"
            onClick={onOpenPrivacyModal}
            className="text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 underline underline-offset-4 transition-colors cursor-pointer"
          >
            Security Architecture
          </button>
        </div>
      </footer>
    </div>
  );
};

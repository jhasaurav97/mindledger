import React from 'react';
import { Sparkles, ArrowLeft, Sun, Moon, Shield, FileText, CheckCircle2 } from 'lucide-react';
import { useTheme } from '../../lib/theme';
import type { User } from 'firebase/auth';

interface LegalLayoutProps {
  title: string;
  subtitle: string;
  effectiveDate: string;
  lastUpdated: string;
  activeDoc: 'privacy' | 'terms';
  onNavigate: (path: string) => void;
  user: User | null;
  children: React.ReactNode;
}

export const LegalLayout: React.FC<LegalLayoutProps> = ({
  title,
  subtitle,
  effectiveDate,
  lastUpdated,
  activeDoc,
  onNavigate,
  user,
  children,
}) => {
  const { theme, toggleTheme } = useTheme();

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    e.preventDefault();
    onNavigate(path);
  };

  return (
    <div className="min-h-screen bg-[#f5f7fb] dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 flex flex-col selection:bg-amber-500/20 selection:text-amber-900 dark:selection:text-amber-200 transition-colors">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#0e1322]/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 shadow-2xs transition-colors">
        <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <a
              href="/"
              onClick={(e) => handleLinkClick(e, '/')}
              className="flex items-center gap-2 group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded-lg p-1"
              title="Return to MindLedger Home"
            >
              <div className="w-8 h-8 rounded-lg bg-slate-900 dark:bg-indigo-600 flex items-center justify-center text-white shadow-2xs group-hover:scale-105 transition-transform">
                <Sparkles className="w-4 h-4 text-amber-300" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-slate-900 dark:text-slate-100 tracking-tight text-base leading-tight">
                  MindLedger
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                  Legal Information
                </span>
              </div>
            </a>

            <div className="hidden sm:block h-5 w-px bg-slate-200 dark:bg-slate-800" />

            {/* Document Switcher Tabs */}
            <nav className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900/80 p-1 rounded-xl border border-slate-200/60 dark:border-slate-800/60 text-xs font-medium">
              <a
                href="/privacy"
                onClick={(e) => handleLinkClick(e, '/privacy')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  activeDoc === 'privacy'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Shield className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Privacy Policy</span>
              </a>
              <a
                href="/terms"
                onClick={(e) => handleLinkClick(e, '/terms')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  activeDoc === 'terms'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Terms of Service</span>
              </a>
            </nav>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Theme Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/70 border border-slate-200/60 dark:border-slate-800/60 transition-colors cursor-pointer"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-600" />
              )}
            </button>

            {/* Return to App Button */}
            <a
              href="/"
              onClick={(e) => handleLinkClick(e, '/')}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white text-xs font-medium shadow-2xs transition-all cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{user ? 'Back to Journal' : 'Back to MindLedger'}</span>
            </a>
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <section className="bg-white dark:bg-[#0e1322] border-b border-slate-200/80 dark:border-slate-800/80 py-10 sm:py-14 px-4 sm:px-6 lg:px-8 transition-colors">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium mb-4">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Public Legal Disclosure • No Authentication Required</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100 leading-tight">
            {title}
          </h1>
          <p className="mt-3 text-base sm:text-lg text-slate-600 dark:text-slate-400 leading-relaxed max-w-3xl">
            {subtitle}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div>
              <span className="font-semibold text-slate-700 dark:text-slate-300">Effective Date:</span> {effectiveDate}
            </div>
            <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
            <div>
              <span className="font-semibold text-slate-700 dark:text-slate-300">Last Revised:</span> {lastUpdated}
            </div>
            <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
            <div>
              <span className="font-semibold text-slate-700 dark:text-slate-300">Applicable Application:</span> MindLedger (Web)
            </div>
          </div>
        </div>
      </section>

      {/* Main Document Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-200/90 dark:border-slate-800/90 shadow-xs p-6 sm:p-10 transition-colors">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#0e1322]/80 py-8 px-4 sm:px-6 lg:px-8 text-xs text-slate-500 dark:text-slate-400 transition-colors">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span className="font-semibold text-slate-800 dark:text-slate-200">MindLedger</span>
            <span>• Personal Intelligence & Reflection Workspace</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-medium">
            <a
              href="/"
              onClick={(e) => handleLinkClick(e, '/')}
              className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
            >
              Application Home
            </a>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <a
              href="/privacy"
              onClick={(e) => handleLinkClick(e, '/privacy')}
              className={`transition-colors ${
                activeDoc === 'privacy'
                  ? 'text-amber-600 dark:text-amber-400 font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Privacy Policy
            </a>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <a
              href="/terms"
              onClick={(e) => handleLinkClick(e, '/terms')}
              className={`transition-colors ${
                activeDoc === 'terms'
                  ? 'text-amber-600 dark:text-amber-400 font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Terms of Service
            </a>
          </div>
        </div>

        <div className="max-w-4xl mx-auto mt-4 text-[11px] text-center sm:text-left text-slate-400 dark:text-slate-500">
          MindLedger processes reflection data in owner-isolated partitions. Google Workspace and Gmail data access operates on an explicit, user-authorized, on-demand basis under Google API Services User Data Policy requirements.
        </div>
      </footer>
    </div>
  );
};

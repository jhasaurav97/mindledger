import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  LogOut,
  PlusCircle,
  BookOpen,
  ShieldCheck,
  Shield,
  History,
  UserCheck,
  Network,
  Scale,
  ChevronDown,
  Sun,
  Moon,
  Mail,
  Menu,
  X,
  Layers,
  ExternalLink,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import type { ActiveView } from '../types';
import { signOut } from '../lib/firebase';
import { useTheme } from '../lib/theme';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';

interface NavbarProps {
  user: User | null;
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  onNewEntry: () => void;
  entryCount: number;
  onOpenPrivacyModal: () => void;
  onOpenNotionModal?: () => void;
  onOpenGmailModal?: () => void;
  onNavigate?: (path: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  activeView,
  setActiveView,
  onNewEntry,
  entryCount,
  onOpenPrivacyModal,
  onOpenNotionModal,
  onOpenGmailModal,
  onNavigate,
}) => {
  const { theme, toggleTheme } = useTheme();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  const profileRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (profileRef.current && !profileRef.current.contains(target)) {
        setIsProfileOpen(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(target)) {
        setIsMoreMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile drawer on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileDrawerOpen(false);
        setIsProfileOpen(false);
        setIsMoreMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const navItems = [
    {
      id: 'nav-editor-btn',
      view: 'editor' as ActiveView,
      label: 'Reflection',
      shortLabel: 'Reflect',
      fullLabel: 'Reflection',
      icon: BookOpen,
    },
    {
      id: 'nav-history-btn',
      view: 'history' as ActiveView,
      label: 'Past Entries',
      shortLabel: 'Entries',
      fullLabel: 'Past Entries',
      icon: History,
      badge: entryCount > 0 ? entryCount : undefined,
    },
    {
      id: 'nav-ask-journal-btn',
      view: 'ask_journal' as ActiveView,
      label: 'Ask Journal',
      shortLabel: 'Ask',
      fullLabel: 'Ask Journal',
      icon: Sparkles,
      iconColor: 'text-amber-500 dark:text-amber-400',
    },
    {
      id: 'nav-memory-graph-btn',
      view: 'memory_graph' as ActiveView,
      label: 'Memory Graph',
      shortLabel: 'Graph',
      fullLabel: 'Memory Graph',
      icon: Network,
      iconColor: 'text-indigo-500 dark:text-indigo-400',
    },
    {
      id: 'nav-decision-lab-btn',
      view: 'decision_lab' as ActiveView,
      label: 'Decision Lab',
      shortLabel: 'Decisions',
      fullLabel: 'Decision Lab',
      icon: Scale,
      iconColor: 'text-amber-500 dark:text-amber-400',
    },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#0e1322]/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 shadow-2xs transition-colors w-full">
      <div className="w-full max-w-7xl mx-auto px-2.5 sm:px-4 lg:px-6 h-15 flex items-center justify-between gap-1.5 sm:gap-2 md:gap-3">
        {/* Left: Brand Logo & Title */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-slate-900 dark:bg-indigo-600 flex items-center justify-center text-white shadow-2xs">
            <Sparkles className="w-4 h-4 text-amber-300" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-900 dark:text-slate-100 tracking-tight text-base sm:text-lg">MindLedger</span>
            <span className="hidden xl:inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              Gemini 3.6
            </span>
          </div>
        </div>

        {/* Center: Primary Core Navigation Rail (Hidden on Mobile <768px, Visible md+) */}
        {user && (
          <nav aria-label="Core Navigation" className="hidden md:flex items-center justify-center shrink-0">
            <div className="flex items-center p-1 rounded-xl bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/60 gap-0.5 lg:gap-1 shadow-2xs">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeView === item.view;
                return (
                  <button
                    key={item.id}
                    id={item.id}
                    type="button"
                    onClick={() => setActiveView(item.view)}
                    className={`inline-flex items-center gap-1.5 px-2.5 lg:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap select-none shrink-0 ${
                      isActive
                        ? 'bg-white dark:bg-[#131b2e] text-slate-900 dark:text-slate-100 shadow-xs border border-slate-200/60 dark:border-slate-700'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-slate-900 dark:text-slate-100' : item.iconColor || 'text-slate-500 dark:text-slate-400'}`} />
                    {/* Compact label on 768px-1100px, Full label on 1100px+ */}
                    <span className="inline lg:hidden xl:inline">{item.fullLabel}</span>
                    <span className="hidden lg:inline xl:hidden">{item.shortLabel}</span>
                    {typeof item.badge === 'number' && (
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold shrink-0 ${
                          isActive
                            ? 'bg-slate-900 text-amber-300 dark:bg-amber-400/20 dark:text-amber-300'
                            : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </nav>
        )}

        {/* Right side: Actions, Integrations, Appearance & Profile */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {user ? (
            <>
              {/* Primary "New Entry" Action */}
              <Button
                id="header-new-entry-btn"
                variant="amber"
                size="sm"
                onClick={onNewEntry}
                leftIcon={<PlusCircle className="w-3.5 h-3.5" />}
                className="shadow-xs px-2 sm:px-2.5 py-1.5 text-xs font-semibold shrink-0"
              >
                <span>New Entry</span>
              </Button>

              {/* 1. LARGE DESKTOP (≥1366px): Direct Integration & Theme Controls */}
              <div className="hidden 2xl:flex items-center gap-1.5 shrink-0">
                {/* Gmail Intelligence Bridge Button */}
                {onOpenGmailModal && (
                  <button
                    id="gmail-nav-btn"
                    type="button"
                    onClick={onOpenGmailModal}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer shadow-2xs shrink-0"
                    title="Configure Gmail Intelligence Bridge"
                  >
                    <Mail className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    <span>Gmail</span>
                  </button>
                )}

                {/* Notion Knowledge Bridge Button */}
                {onOpenNotionModal && (
                  <button
                    id="notion-nav-btn"
                    type="button"
                    onClick={onOpenNotionModal}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer shadow-2xs shrink-0"
                    title="Configure Notion Knowledge Bridge"
                  >
                    <span className="font-bold text-[11px] text-slate-900 dark:text-white shrink-0">N</span>
                    <span>Notion</span>
                  </button>
                )}

                {/* Security Vault Indicator */}
                <button
                  id="privacy-badge-btn"
                  type="button"
                  onClick={onOpenPrivacyModal}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors cursor-pointer shrink-0"
                  title="Firestore User-Isolated Security Architecture"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Vault</span>
                </button>
              </div>

              {/* 2. MEDIUM WIDTH (768px – 1365px): Clean "More / Integrations" Menu */}
              <div className="hidden md:block 2xl:hidden relative" ref={moreMenuRef}>
                <button
                  type="button"
                  id="navbar-more-menu-btn"
                  onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer shadow-2xs ${
                    isMoreMenuOpen
                      ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700'
                  }`}
                  aria-expanded={isMoreMenuOpen}
                  aria-haspopup="true"
                  title="Integrations and Tools"
                >
                  <Layers className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
                  <span>Tools</span>
                  <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isMoreMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* More Menu Dropdown */}
                {isMoreMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#131b2e] rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800/80">
                      Bridges & Tools
                    </div>

                    {onOpenGmailModal && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsMoreMenuOpen(false);
                          onOpenGmailModal();
                        }}
                        className="w-full px-3 py-2 text-left text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center gap-2.5 transition-colors cursor-pointer"
                      >
                        <div className="w-5 h-5 rounded-md bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                          <Mail className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium">Gmail Bridge</span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500">Read-only context</span>
                        </div>
                      </button>
                    )}

                    {onOpenNotionModal && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsMoreMenuOpen(false);
                          onOpenNotionModal();
                        }}
                        className="w-full px-3 py-2 text-left text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center gap-2.5 transition-colors cursor-pointer"
                      >
                        <div className="w-5 h-5 rounded-md bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center font-bold text-xs shrink-0">
                          N
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium">Notion Bridge</span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500">Export reflection</span>
                        </div>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setIsMoreMenuOpen(false);
                        onOpenPrivacyModal();
                      }}
                      className="w-full px-3 py-2 text-left text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <div className="w-5 h-5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <ShieldCheck className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium">Security Vault</span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">Owner-isolated rules</span>
                      </div>
                    </button>
                  </div>
                )}
              </div>

              {/* Direct Theme / Appearance Toggle Button (Always visible on Desktop ≥768px) */}
              <button
                type="button"
                id="header-theme-toggle-btn"
                onClick={toggleTheme}
                className="hidden sm:inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer shadow-2xs shrink-0"
                title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
                aria-label={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
              >
                {theme === 'dark' ? (
                  <Sun className="w-4 h-4 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4 text-indigo-500" />
                )}
              </button>

              {/* Profile Avatar & Dropdown Menu */}
              <div className="relative" ref={profileRef}>
                <button
                  type="button"
                  id="user-profile-menu-btn"
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center gap-1.5 p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-slate-700 shrink-0"
                  aria-expanded={isProfileOpen}
                  aria-haspopup="true"
                  title="User Profile & Settings"
                >
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'User'}
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shadow-2xs"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-900 dark:bg-indigo-600 text-amber-300 flex items-center justify-center font-bold text-xs shadow-2xs">
                      {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
                    </div>
                  )}
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Profile Dropdown Menu */}
                {isProfileOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-[#131b2e] rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-800">
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                        {user.displayName || 'Journal Reflector'}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {user.email}
                      </div>
                      <div className="mt-2 flex items-center gap-1.5">
                        <Badge variant="emerald" icon={<ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />}>
                          Owner-Bound Vault
                        </Badge>
                      </div>
                    </div>

                    {/* Theme Mode Toggle Inside Dropdown */}
                    <div className="px-3.5 py-2 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                        {theme === 'dark' ? (
                          <Moon className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        ) : (
                          <Sun className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        )}
                        <span>Appearance</span>
                      </div>
                      <button
                        type="button"
                        id="theme-toggle-btn"
                        onClick={toggleTheme}
                        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer border border-slate-200/80 dark:border-slate-700"
                        aria-label={`Switch theme to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                      >
                        {theme === 'dark' ? (
                          <>
                            <Moon className="w-3 h-3 text-indigo-400" />
                            <span>Dark</span>
                          </>
                        ) : (
                          <>
                            <Sun className="w-3 h-3 text-amber-500" />
                            <span>Light</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="py-1">
                      {onOpenNotionModal && (
                        <button
                          type="button"
                          id="notion-dropdown-btn"
                          onClick={() => {
                            setIsProfileOpen(false);
                            onOpenNotionModal();
                          }}
                          className="w-full px-3.5 py-2 text-left text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center gap-2 transition-colors cursor-pointer"
                        >
                          <div className="w-4 h-4 rounded bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center font-bold text-[10px] shrink-0">
                            N
                          </div>
                          <span>Notion Knowledge Bridge</span>
                        </button>
                      )}

                      {onOpenGmailModal && (
                        <button
                          type="button"
                          id="gmail-dropdown-btn"
                          onClick={() => {
                            setIsProfileOpen(false);
                            onOpenGmailModal();
                          }}
                          className="w-full px-3.5 py-2 text-left text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center gap-2 transition-colors cursor-pointer"
                        >
                          <div className="w-4 h-4 rounded bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center font-bold text-[10px] shrink-0">
                            <Mail className="w-3 h-3" />
                          </div>
                          <span>Gmail Intelligence Bridge</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setIsProfileOpen(false);
                          onOpenPrivacyModal();
                        }}
                        className="w-full px-3.5 py-2 text-left text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span>Security & Isolation Details</span>
                      </button>

                      <a
                        href="/privacy"
                        onClick={(e) => {
                          if (onNavigate) {
                            e.preventDefault();
                            setIsProfileOpen(false);
                            onNavigate('/privacy');
                          }
                        }}
                        className="w-full px-3.5 py-2 text-left text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span>Privacy Policy</span>
                      </a>

                      <a
                        href="/terms"
                        onClick={(e) => {
                          if (onNavigate) {
                            e.preventDefault();
                            setIsProfileOpen(false);
                            onNavigate('/terms');
                          }
                        }}
                        className="w-full px-3.5 py-2 text-left text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <BookOpen className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        <span>Terms of Service</span>
                      </a>

                      <div className="px-3.5 py-1.5 text-[11px] text-slate-400 dark:text-slate-500 flex items-center justify-between">
                        <span>AI Engine</span>
                        <span className="font-semibold text-slate-600 dark:text-slate-400">Gemini 3.6 Flash</span>
                      </div>
                    </div>

                    <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
                      <button
                        id="sign-out-btn"
                        type="button"
                        onClick={() => {
                          setIsProfileOpen(false);
                          signOut();
                        }}
                        className="w-full px-3.5 py-2 text-left text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile Hamburger Drawer Button (Visible on <768px) */}
              <button
                type="button"
                id="mobile-drawer-toggle-btn"
                onClick={() => setIsMobileDrawerOpen(!isMobileDrawerOpen)}
                className="md:hidden inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer shrink-0"
                aria-label="Open Navigation Drawer"
                aria-expanded={isMobileDrawerOpen}
              >
                {isMobileDrawerOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-slate-400" />
                <span>Guest mode</span>
              </div>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <a
                href="/privacy"
                onClick={(e) => {
                  if (onNavigate) {
                    e.preventDefault();
                    onNavigate('/privacy');
                  }
                }}
                className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
              >
                Privacy
              </a>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <a
                href="/terms"
                onClick={(e) => {
                  if (onNavigate) {
                    e.preventDefault();
                    onNavigate('/terms');
                  }
                }}
                className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
              >
                Terms
              </a>
            </div>
          )}
        </div>
      </div>

      {/* 3. MOBILE RESPONSIVE DRAWER (<768px): Structured into CORE, INTEGRATIONS, and ACCOUNT */}
      {user && isMobileDrawerOpen && (
        <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white/98 dark:bg-[#0e1322]/98 backdrop-blur-lg px-4 py-4 space-y-4 max-h-[85vh] overflow-y-auto animate-in slide-in-from-top-2 duration-150">
          {/* Section: Core Navigation */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 px-1">
              Core
            </div>
            <div className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeView === item.view;
                return (
                  <button
                    key={`mobile-${item.id}`}
                    type="button"
                    onClick={() => {
                      setActiveView(item.view);
                      setIsMobileDrawerOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-amber-500/10 dark:bg-amber-400/15 text-amber-700 dark:text-amber-300 border border-amber-300/40 dark:border-amber-500/30'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-amber-600 dark:text-amber-400' : item.iconColor || 'text-slate-500'}`} />
                      <span>{item.fullLabel}</span>
                    </div>
                    {typeof item.badge === 'number' && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section: Integrations */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 px-1">
              Integrations
            </div>
            <div className="space-y-1">
              {onOpenGmailModal && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileDrawerOpen(false);
                    onOpenGmailModal();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <div className="w-5 h-5 rounded-md bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                    <Mail className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 text-left">
                    <div>Gmail Intelligence Bridge</div>
                    <div className="text-[10px] font-normal text-slate-400">On-demand email reflection</div>
                  </div>
                </button>
              )}

              {onOpenNotionModal && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileDrawerOpen(false);
                    onOpenNotionModal();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <div className="w-5 h-5 rounded-md bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center font-bold text-xs shrink-0">
                    N
                  </div>
                  <div className="flex-1 text-left">
                    <div>Notion Knowledge Bridge</div>
                    <div className="text-[10px] font-normal text-slate-400">Export reflection to workspace</div>
                  </div>
                </button>
              )}
            </div>
          </div>

          {/* Section: Account & Appearance */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 px-1">
              Account
            </div>

            {/* Appearance Row */}
            <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                {theme === 'dark' ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
                <span>Appearance</span>
              </div>
              <button
                type="button"
                onClick={toggleTheme}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-2xs"
              >
                {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
              </button>
            </div>

            {/* Security / Privacy Details */}
            <button
              type="button"
              onClick={() => {
                setIsMobileDrawerOpen(false);
                onOpenPrivacyModal();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Security Vault Details</span>
            </button>

            {/* Legal Links */}
            <div className="flex items-center gap-3 px-3 py-1 text-xs text-slate-500">
              <a
                href="/privacy"
                onClick={(e) => {
                  if (onNavigate) {
                    e.preventDefault();
                    setIsMobileDrawerOpen(false);
                    onNavigate('/privacy');
                  }
                }}
                className="hover:text-amber-600 transition-colors flex items-center gap-1"
              >
                <span>Privacy</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <span>•</span>
              <a
                href="/terms"
                onClick={(e) => {
                  if (onNavigate) {
                    e.preventDefault();
                    setIsMobileDrawerOpen(false);
                    onNavigate('/terms');
                  }
                }}
                className="hover:text-amber-600 transition-colors flex items-center gap-1"
              >
                <span>Terms</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* User Details & Sign Out */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between px-1">
              <div className="flex items-center gap-2 overflow-hidden">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="" className="w-7 h-7 rounded-lg object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-7 h-7 rounded-lg bg-slate-900 dark:bg-indigo-600 text-amber-300 flex items-center justify-center font-bold text-xs">
                    {user.displayName?.charAt(0) || 'U'}
                  </div>
                )}
                <div className="truncate text-xs">
                  <div className="font-bold truncate text-slate-900 dark:text-slate-100">{user.displayName || 'User'}</div>
                  <div className="text-[10px] text-slate-500 truncate">{user.email}</div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsMobileDrawerOpen(false);
                  signOut();
                }}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors flex items-center gap-1"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

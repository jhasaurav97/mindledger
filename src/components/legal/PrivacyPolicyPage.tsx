import React, { useEffect } from 'react';
import {
  Shield,
  Lock,
  Database,
  Mail,
  FileText,
  MapPin,
  Brain,
  Trash2,
  Key,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Clock,
  UserCheck,
  Compass,
  Unlink,
  Server,
  Share2,
} from 'lucide-react';
import { LegalLayout } from './LegalLayout';
import type { User } from 'firebase/auth';

interface PrivacyPolicyPageProps {
  onNavigate: (path: string) => void;
  user: User | null;
}

export const PrivacyPolicyPage: React.FC<PrivacyPolicyPageProps> = ({ onNavigate, user }) => {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    document.title = 'Privacy Policy • MindLedger';
  }, []);

  return (
    <LegalLayout
      title="Privacy Policy"
      subtitle="How MindLedger collects, processes, protects, and stores your reflection data, external integrations, and personal workspace."
      effectiveDate="March 1, 2026"
      lastUpdated="March 5, 2026"
      activeDoc="privacy"
      onNavigate={onNavigate}
      user={user}
    >
      {/* High-Level Summary Card */}
      <div className="mb-8 p-4 sm:p-6 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/90 dark:border-amber-800/60 text-slate-800 dark:text-slate-200">
        <div className="flex items-center gap-2 font-semibold text-sm sm:text-base text-amber-950 dark:text-amber-200 mb-3">
          <Shield className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
          <span>Core Privacy Principles at a Glance</span>
        </div>
        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed mb-4">
          MindLedger is built on strict data isolation, explicit user consent, and least-privilege architecture. Here is a summary of how your data is handled:
        </p>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-slate-700 dark:text-slate-300">
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <span><strong>No Sale of Data:</strong> We do not sell, rent, monetize, or trade your personal data, journal entries, or external context.</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <span><strong>UID-Isolated Database:</strong> All reflections are stored in Google Cloud Firestore under owner-bound paths (<code className="font-mono bg-amber-100/60 dark:bg-amber-900/40 px-1 py-0.5 rounded">/users/{'{uid}'}</code>).</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <span><strong>No Password Handling:</strong> Identity is authenticated entirely via Google Sign-In with Firebase Authentication.</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <span><strong>On-Demand Gmail Access:</strong> Gmail connects only upon explicit authorization with <code className="font-mono bg-amber-100/60 dark:bg-amber-900/40 px-1 py-0.5 rounded">gmail.readonly</code>. No continuous mailbox sync.</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <span><strong>User-Directed Notion Export:</strong> Notes are only exported to Notion when you explicitly click &ldquo;Save to Notion&rdquo; for a specific entry.</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <span><strong>Server-Encrypted OAuth Tokens:</strong> All integration tokens are encrypted at rest on our server runtime and never exposed to the browser.</span>
          </li>
        </ul>
      </div>

      {/* Table of Contents */}
      <div className="mb-10 pb-6 border-b border-slate-200 dark:border-slate-800">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
          Document Sections
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <a href="#section-purpose" className="text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 flex items-center gap-1.5">
            <span className="text-slate-400 font-mono">01.</span> MindLedger Purpose & Functionality
          </a>
          <a href="#section-information-collected" className="text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 flex items-center gap-1.5">
            <span className="text-slate-400 font-mono">02.</span> Categories of Information We Collect
          </a>
          <a href="#section-gemini-ai" className="text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 flex items-center gap-1.5">
            <span className="text-slate-400 font-mono">03.</span> Gemini AI Processing & Grounding
          </a>
          <a href="#section-gmail-integration" className="text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 flex items-center gap-1.5">
            <span className="text-slate-400 font-mono">04.</span> Gmail Integration & Data Handling
          </a>
          <a href="#section-notion-maps" className="text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 flex items-center gap-1.5">
            <span className="text-slate-400 font-mono">05.</span> Notion Knowledge Bridge & Google Maps
          </a>
          <a href="#section-google-limited-use" className="text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 flex items-center gap-1.5">
            <span className="text-slate-400 font-mono">06.</span> Google API User Data & Limited Use Policy
          </a>
          <a href="#section-storage-security" className="text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 flex items-center gap-1.5">
            <span className="text-slate-400 font-mono">07.</span> Data Storage, Firestore Isolation & Security
          </a>
          <a href="#section-deletion-control" className="text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 flex items-center gap-1.5">
            <span className="text-slate-400 font-mono">08.</span> User Control, Disconnection & Data Deletion
          </a>
          <a href="#section-no-sale" className="text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 flex items-center gap-1.5">
            <span className="text-slate-400 font-mono">09.</span> Absolute Prohibition on Sale of Personal Data
          </a>
          <a href="#section-contact" className="text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 flex items-center gap-1.5">
            <span className="text-slate-400 font-mono">10.</span> Contact & Inquiries
          </a>
        </div>
      </div>

      {/* Content Body */}
      <div className="space-y-12 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
        {/* Section 1 */}
        <section id="section-purpose" className="scroll-mt-24 space-y-3">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span className="text-amber-600 dark:text-amber-400 font-mono text-sm">01.</span>
            MindLedger Purpose & Functionality
          </h2>
          <p>
            MindLedger is a private personal intelligence and reflective journaling workspace. It is designed to help individuals document their thoughts, analyze complex life dilemmas, explore patterns across their personal history, and synthesize actionable clarity through structured dialogues supported by Google Gemini artificial intelligence.
          </p>
          <p>
            MindLedger provides the following core features:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
            <li>
              <strong>Socratic Reflection Editor:</strong> A rich markdown editor where users record personal entries, thoughts, and feelings, and engage in multi-turn reflective dialogues with Gemini.
            </li>
            <li>
              <strong>Personal Memory Graph:</strong> An automated cognitive mapping system that extracts structured memory nodes (Goals, Themes, Challenges, Decisions, Actions, Wins, and Habits) strictly from the authenticated user&apos;s authorized journal entries.
            </li>
            <li>
              <strong>Decision Lab:</strong> A structured framework for evaluating tough dilemmas by organizing dilemma context, candidate options, evaluation criteria, pros, cons, trade-offs, uncertainties, and next steps.
            </li>
            <li>
              <strong>Ask My Journal:</strong> An evidence-grounded search and synthesis tool that answers user queries based solely on the authenticated user&apos;s authorized journal history.
            </li>
            <li>
              <strong>Gmail Intelligence Bridge:</strong> An optional, user-initiated tool to analyze specific selected emails from the user&apos;s Gmail inbox into actionable reflections or decision dilemmas.
            </li>
            <li>
              <strong>Notion Knowledge Bridge:</strong> An optional, user-initiated export mechanism to save individual structured reflections to a user-selected Notion database.
            </li>
          </ul>
        </section>

        {/* Section 2 */}
        <section id="section-information-collected" className="scroll-mt-24 space-y-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span className="text-amber-600 dark:text-amber-400 font-mono text-sm">02.</span>
            Categories of Information We Collect
          </h2>
          <p>
            MindLedger operates on strict data minimization. We only collect and store data that is directly necessary to provide the features you actively use:
          </p>

          <div className="space-y-3">
            {/* Account & Identity */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
              <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2 text-xs sm:text-sm">
                <UserCheck className="w-4 h-4 text-indigo-500 shrink-0" />
                <span>Firebase & Google Sign-In Identity Information</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                When you sign in to MindLedger, authentication is handled by Firebase Authentication via Google Sign-In. We receive your unique Google User Identifier (UID), email address, display name, and avatar profile photo URL. <strong>MindLedger never collects, processes, or stores account passwords.</strong> Your UID serves as the sole cryptographic identity boundary separating your data from all other users.
              </p>
            </div>

            {/* Journal Content */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
              <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2 text-xs sm:text-sm">
                <FileText className="w-4 h-4 text-amber-500 shrink-0" />
                <span>User-Created Journal & Reflection Content</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                We store the text, reflections, notes, multi-turn AI chat messages, prompt inputs, titles, user-assigned categories, custom tags, and creation/update timestamps that you explicitly compose inside the editor. This content is stored exclusively within your user-specific database path in Google Cloud Firestore.
              </p>
            </div>

            {/* Memory Graph Data */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
              <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2 text-xs sm:text-sm">
                <Brain className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Memory Graph Data</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                The Memory Graph stores structured cognitive nodes derived from your reflections. Supported node types are: <strong>Goal</strong>, <strong>Theme</strong>, <strong>Challenge</strong>, <strong>Decision</strong>, <strong>Action</strong>, <strong>Win</strong>, and <strong>Habit</strong>. Each node retains references to the specific journal entry IDs from which it was extracted. Memory Graph data is strictly bound to your authenticated Firebase UID, is derived only from your authorized entries, and can be viewed, modified, or cleared through entry deletion.
              </p>
            </div>

            {/* Decision Lab Data */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
              <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2 text-xs sm:text-sm">
                <Compass className="w-4 h-4 text-sky-500 shrink-0" />
                <span>Decision Lab Data</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                When you evaluate decisions in Decision Lab, we store structured frameworks comprising dilemma context, evaluated options, criteria, pros, cons, trade-offs, identified uncertainties, AI recommendations, and next action steps. Decision records are stored only within your private Firestore partition.
              </p>
            </div>

            {/* Optional Location */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
              <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2 text-xs sm:text-sm">
                <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
                <span>Optional Location Data</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Attaching location to an entry is <strong>100% voluntary and user-initiated</strong>. Location information is collected only if you explicitly choose to attach a place by clicking &ldquo;Use Current Location&rdquo; or searching for an address/place in the entry editor. When attached, we store only the place name, formatted address, and latitude/longitude coordinates with that specific journal entry. <strong>MindLedger never tracks your location continuously or in the background</strong>, never requests background geolocation permissions, and stores no historical GPS movement tracks. You can remove a saved location from an entry at any time.
              </p>
            </div>

            {/* External Integration Credentials */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
              <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2 text-xs sm:text-sm">
                <Key className="w-4 h-4 text-amber-500 shrink-0" />
                <span>External Integration Credentials (Gmail & Notion)</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                If you choose to link Gmail or Notion, our server stores user-specific OAuth access and refresh tokens. These tokens are <strong>encrypted at rest using AES-256-GCM authenticated cipher encryption</strong> on our secure server runtime and mapped strictly to your verified Firebase UID. Tokens are never exposed to the client browser and can be permanently revoked at any time.
              </p>
            </div>
          </div>
        </section>

        {/* Section 3 */}
        <section id="section-gemini-ai" className="scroll-mt-24 space-y-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span className="text-amber-600 dark:text-amber-400 font-mono text-sm">03.</span>
            Gemini AI Processing & Grounding
          </h2>
          <p>
            MindLedger uses Google Gemini AI models (such as Gemini 3.6 Flash with automated fallback ladders) via the official <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">@google/genai</code> TypeScript SDK executed entirely on our secure backend server runtime.
          </p>
          <div className="space-y-3 text-xs text-slate-600 dark:text-slate-400">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-1">
              <div className="font-semibold text-slate-900 dark:text-slate-100">How Gemini Analyzes User-Provided Content:</div>
              <p>
                When you compose an entry, request Socratic feedback, or evaluate a decision, your prompt text and relevant context are sent to the Gemini API over TLS-encrypted connections. The model processes the text to summarize key insights, identify cognitive patterns, suggest balanced inquiry questions, extract memory nodes, or analyze decision trade-offs.
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-1">
              <div className="font-semibold text-slate-900 dark:text-slate-100">Evidence-Grounded Boundaries:</div>
              <p>
                In features like &ldquo;Ask My Journal&rdquo;, Gemini is restricted to querying and citing only your retrieved journal entries. Gemini is explicitly instructed never to fabricate memories, events, emotions, or achievements. If retrieved journal data does not contain enough information to answer your question, the model explicitly states that your journal contains insufficient evidence.
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-1">
              <div className="font-semibold text-slate-900 dark:text-slate-100">Prompt Injection & Untrusted Data Defenses:</div>
              <p>
                All retrieved journal entries, external email text, and user inputs are strictly encapsulated as plain, untrusted DATA payloads, never as executable system instructions. The model is architected to ignore any instructions embedded within journal text or email bodies that attempt to override system rules, leak secrets, or alter security boundaries.
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-1">
              <div className="font-semibold text-slate-900 dark:text-slate-100">No Model Training on Personal Reflection Data:</div>
              <p>
                Data transmitted to the Gemini API through MindLedger&apos;s server-side integration is processed under commercial Google Cloud / Gemini API terms and is <strong>not used by Google or MindLedger to train, retrain, or improve generalized foundation AI models</strong>.
              </p>
            </div>
          </div>
        </section>

        {/* Section 4 */}
        <section id="section-gmail-integration" className="scroll-mt-24 space-y-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span className="text-amber-600 dark:text-amber-400 font-mono text-sm">04.</span>
            Gmail Integration & Data Handling
          </h2>
          <div className="border border-red-200/80 dark:border-red-900/50 bg-red-50/30 dark:bg-red-950/10 rounded-2xl p-5 space-y-3.5">
            <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100 text-sm">
              <Mail className="w-4 h-4 text-red-500 shrink-0" />
              <span>Gmail Intelligence Bridge Specifications</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              MindLedger includes an optional integration with Gmail allowing you to bring external email context into your personal reflection or decision-making workflow. This integration is governed by the following strict controls:
            </p>

            <div className="space-y-3 text-xs">
              <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-1">
                <span className="font-semibold text-slate-900 dark:text-slate-100">1. Explicit User Authorization:</span>
                <p className="text-slate-600 dark:text-slate-400">
                  Gmail is never accessed automatically. Connection requires an explicit user action clicking &ldquo;Connect Gmail&rdquo;, completing the Google OAuth consent screen, and approving access.
                </p>
              </div>

              <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-1">
                <span className="font-semibold text-slate-900 dark:text-slate-100">2. Exact Requested Scope:</span>
                <p className="text-slate-600 dark:text-slate-400">
                  MindLedger requests only the least-privileged read-only scope:{' '}
                  <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-amber-700 dark:text-amber-300">
                    https://www.googleapis.com/auth/gmail.readonly
                  </code>
                  . MindLedger cannot send emails, compose drafts, delete messages, modify labels, or adjust email settings.
                </p>
              </div>

              <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-1">
                <span className="font-semibold text-slate-900 dark:text-slate-100">3. On-Demand Access (No Continuous Synchronization):</span>
                <p className="text-slate-600 dark:text-slate-400">
                  MindLedger does <strong>NOT</strong> perform automatic background mailbox monitoring, continuous synchronization, or bulk mailbox harvesting. The backend accesses Gmail exclusively when you actively open the bridge to view message headers or explicitly select an email.
                </p>
              </div>

              <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-1">
                <span className="font-semibold text-slate-900 dark:text-slate-100">4. What Gmail Data is Retrieved When You Select an Email:</span>
                <p className="text-slate-600 dark:text-slate-400">
                  When you explicitly select an email for analysis, our server fetches only that specific message&apos;s metadata:
                </p>
                <ul className="list-disc pl-5 mt-1 space-y-0.5 text-slate-600 dark:text-slate-400">
                  <li>Message identifier (id and threadId)</li>
                  <li>Sender name and address (From header)</li>
                  <li>Recipient address (To header)</li>
                  <li>Subject line (Subject header)</li>
                  <li>Timestamp (Date header)</li>
                  <li>Email snippet and plain-text body content of that individual message</li>
                </ul>
                <p className="text-slate-600 dark:text-slate-400 mt-1">
                  Full email bodies are <strong>not stored permanently as a mailbox archive</strong>. If you choose to convert an email analysis into a Reflection or Decision, only the resulting structured text you confirm saving is stored in your Firestore reflections.
                </p>
              </div>

              <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-1">
                <span className="font-semibold text-slate-900 dark:text-slate-100">5. One-Click Disconnection:</span>
                <p className="text-slate-600 dark:text-slate-400">
                  You can disconnect Gmail at any time by opening the Gmail Bridge settings modal and clicking &ldquo;Disconnect&rdquo;. Disconnecting immediately deletes your encrypted OAuth tokens from our backend database. Disconnecting does not delete any journal reflections you previously saved.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 5 */}
        <section id="section-notion-maps" className="scroll-mt-24 space-y-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span className="text-amber-600 dark:text-amber-400 font-mono text-sm">05.</span>
            Notion Knowledge Bridge & Google Maps
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* Notion */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-2">
              <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Share2 className="w-4 h-4 text-amber-500 shrink-0" />
                <span>Notion Knowledge Bridge</span>
              </div>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                The Notion integration operates exclusively upon explicit user authorization via Notion Public Connection OAuth 2.0.
              </p>
              <ul className="list-disc pl-4 space-y-1 text-slate-600 dark:text-slate-400">
                <li><strong>User-Initiated Export Only:</strong> MindLedger never exports entries automatically. An export occurs solely when you click &ldquo;Save to Notion&rdquo; for a specific reflection.</li>
                <li><strong>Exported Content:</strong> Formatted page including reflection title, date, category, location (if present), original reflection, AI summary, key insights, and decision context.</li>
                <li><strong>Disconnection:</strong> You can disconnect Notion at any time via the Notion Settings modal, which permanently purges your Notion access tokens from our server.</li>
              </ul>
            </div>

            {/* Maps */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-2">
              <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
                <span>Google Maps Platform</span>
              </div>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Used strictly to resolve place searches into addresses/coordinates and render static map previews when you explicitly select a place.
              </p>
              <ul className="list-disc pl-4 space-y-1 text-slate-600 dark:text-slate-400">
                <li>Never used for background location monitoring or continuous tracking.</li>
                <li>Maps failures do not impede journal writing or editing.</li>
                <li>Locations attached to entries can be edited or deleted at any time.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Section 6 - Google Limited Use Requirement */}
        <section id="section-google-limited-use" className="scroll-mt-24 space-y-4">
          <div className="p-5 sm:p-6 rounded-2xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200/90 dark:border-blue-800/70 text-slate-800 dark:text-slate-200">
            <h2 className="text-base sm:text-lg font-bold text-blue-950 dark:text-blue-300 flex items-center gap-2 mb-2">
              <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>06. Google API Services User Data Policy & Limited Use Disclosure</span>
            </h2>
            <p className="text-xs sm:text-sm leading-relaxed text-blue-950 dark:text-blue-200 mb-4 font-medium">
              MindLedger&apos;s use and transfer to any other app of information received from Google APIs adheres to the{' '}
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                target="_blank"
                rel="noreferrer noopener"
                className="underline underline-offset-2 hover:text-blue-700 dark:hover:text-blue-100 inline-flex items-center gap-1 font-semibold"
              >
                Google API Services User Data Policy
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              , including the Limited Use requirements.
            </p>
            <div className="space-y-2 text-xs text-blue-900/90 dark:text-blue-200/90 leading-relaxed">
              <p className="font-semibold text-blue-950 dark:text-blue-200">
                Specifically, with respect to Google user data received via Google APIs (including Gmail):
              </p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>
                  <strong>Prominent User-Facing Feature Restriction:</strong> We only use access to read Google user data to provide user-facing features that are prominent in the MindLedger user interface (specifically, on-demand email analysis, reflection synthesis, and decision dilemma extraction requested directly by you).
                </li>
                <li>
                  <strong>No Unauthorized Transfer:</strong> We do not transfer Google user data to third parties unless necessary to provide or improve these user-facing features, comply with applicable law, or as part of a merger or acquisition with explicit affirmative user consent.
                </li>
                <li>
                  <strong>Prohibition on Advertising:</strong> We do not use or transfer Google user data for serving advertisements, including personalized, re-targeted, or interest-based advertising.
                </li>
                <li>
                  <strong>Prohibition on Human Reading:</strong> We do not allow humans to read Google user data unless we have obtained your affirmative agreement for specific messages, doing so is strictly necessary for security purposes (such as investigating abuse or a security bug), it is required to comply with applicable law, or the data has been aggregated and anonymized for internal operations.
                </li>
                <li>
                  <strong>Prohibition on Generalized AI Model Training:</strong> We do not use Google user data to train, fine-tune, or develop generalized machine learning or artificial intelligence models.
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Section 7 */}
        <section id="section-storage-security" className="scroll-mt-24 space-y-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span className="text-amber-600 dark:text-amber-400 font-mono text-sm">07.</span>
            Data Storage, Firestore Isolation & Security Architecture
          </h2>
          <p>
            We implement layered defense-in-depth technical and operational safeguards to protect your personal reflections and credentials:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* Owner-Bound Firestore */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
              <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Database className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Cloud Firestore UID Isolation</span>
              </div>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                All personal journal entries and interactions are stored under the path <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">/users/{'{userId}'}/interactions/{'{interactionId}'}</code>. Cloud Firestore Security Rules enforce strict ownership validation:
              </p>
              <div className="p-2 rounded bg-slate-100 dark:bg-slate-800/80 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                allow read, write: if request.auth != null &amp;&amp; request.auth.uid == userId;
              </div>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                No user can query, read, update, or delete another user&apos;s reflections. Unauthenticated requests are rejected at the database perimeter.
              </p>
            </div>

            {/* AES-256-GCM Token Encryption */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
              <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>Server-Side Token Encryption at Rest</span>
              </div>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                OAuth access tokens and refresh tokens for Gmail and Notion are encrypted at rest using authenticated <strong>AES-256-GCM cipher encryption</strong> before being stored in server persistence. Encryption keys are managed server-side via Google Cloud Secret Manager and environment injection.
              </p>
            </div>

            {/* Zero Secrets in Browser */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
              <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Server className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
                <span>Zero Secret Exposure to the Browser</span>
              </div>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Google OAuth Client Secrets, Notion Client Secrets, and Google Gemini API keys reside exclusively on the server runtime. <strong>No client secrets or API keys are ever bundled into client-side JavaScript, frontend HTML, or localStorage.</strong>
              </p>
            </div>

            {/* Realistic Security Disclosures */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
              <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span>Realistic Security Safeguards</span>
              </div>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                We employ TLS in transit, authenticated token encryption at rest, owner-bound database rules, and automated rate-limiting. However, no internet transmission or digital storage system is 100% infallible. <strong>We do not claim impossible, impenetrable, or absolute security.</strong>
              </p>
            </div>
          </div>
        </section>

        {/* Section 8 */}
        <section id="section-deletion-control" className="scroll-mt-24 space-y-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span className="text-amber-600 dark:text-amber-400 font-mono text-sm">08.</span>
            User Control, Disconnection & Data Deletion
          </h2>
          <p>
            We believe you should have direct control over your personal reflection data. We support the following concrete controls based on features that actually exist in the application:
          </p>

          <div className="space-y-3 text-xs">
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
              <Trash2 className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-semibold text-slate-900 dark:text-slate-100">Permanent Journal Entry Deletion</div>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  You can permanently delete any journal entry at any time by clicking the trash can icon in the journal list or entry header. This directly executes a <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">deleteDoc</code> operation on Cloud Firestore, permanently erasing the reflection, user notes, and attached location data from your database partition.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
              <Unlink className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-semibold text-slate-900 dark:text-slate-100">Disconnecting Integrations & Token Purging</div>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  You can disconnect Gmail or Notion at any time with a single click inside their respective settings modals (&ldquo;Disconnect Gmail&rdquo; or &ldquo;Disconnect Notion&rdquo;). Disconnecting immediately removes and purges all stored access and refresh tokens from our server-side database. Disconnecting does not delete your journal entries.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
              <MapPin className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-semibold text-slate-900 dark:text-slate-100">Location Removal</div>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  If you previously attached a location to a journal entry, you can remove it simply by editing the entry, clicking the remove location button, and saving.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
              <Clock className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-semibold text-slate-900 dark:text-slate-100">Data Retention Lifecycles</div>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  Your reflections, memory graph nodes, and decision frameworks remain in your isolated Cloud Firestore account partition for as long as you maintain your account or until you delete them. Temporary operational server request logs are rotated and deleted periodically.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 9 */}
        <section id="section-no-sale" className="scroll-mt-24 space-y-3">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span className="text-amber-600 dark:text-amber-400 font-mono text-sm">09.</span>
            Absolute Prohibition on Sale of Personal Data
          </h2>
          <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 leading-relaxed space-y-2">
            <p className="font-semibold text-slate-900 dark:text-slate-100">
              MindLedger does NOT sell personal information:
            </p>
            <p>
              We do not sell, rent, monetize, release, disclose, disseminate, make available, transfer, or otherwise communicate personal data, reflection logs, email content, or integration credentials to any third party, data broker, or commercial aggregator for monetary or other valuable consideration.
            </p>
          </div>
        </section>

        {/* Section 10 */}
        <section id="section-contact" className="scroll-mt-24 space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span className="text-amber-600 dark:text-amber-400 font-mono text-sm">10.</span>
            Contact & Inquiries
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            If you have questions about this Privacy Policy, wish to inquire about your data, or need assistance regarding your MindLedger workspace, please contact us:
          </p>
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs space-y-1.5">
            <div className="font-semibold text-slate-900 dark:text-slate-100">MindLedger Privacy & Security Support</div>
            <div className="text-slate-600 dark:text-slate-400">
              Inquiries & Privacy Requests:{' '}
              <a href="mailto:jhasaurav593@gmail.com" className="text-amber-600 dark:text-amber-400 underline font-mono">
                jhasaurav593@gmail.com
              </a>
            </div>
            <div className="text-slate-500 dark:text-slate-400 text-[11px] pt-1">
              For security disclosures or integration compliance questions, please include &ldquo;MindLedger Privacy Inquiry&rdquo; in your email subject line.
            </div>
          </div>
        </section>
      </div>
    </LegalLayout>
  );
};

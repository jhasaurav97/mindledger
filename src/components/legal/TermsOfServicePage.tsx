import React, { useEffect } from 'react';
import {
  FileText,
  AlertTriangle,
  Scale,
  Brain,
  ShieldCheck,
  CheckCircle2,
  Lock,
  ExternalLink,
  HelpCircle,
  Clock,
  User,
} from 'lucide-react';
import { LegalLayout } from './LegalLayout';
import type { User as FirebaseUser } from 'firebase/auth';

interface TermsOfServicePageProps {
  onNavigate: (path: string) => void;
  user: FirebaseUser | null;
}

export const TermsOfServicePage: React.FC<TermsOfServicePageProps> = ({ onNavigate, user }) => {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    document.title = 'Terms of Service • MindLedger';
  }, []);

  return (
    <LegalLayout
      title="Terms of Service"
      subtitle="The contractual terms governing your use of the MindLedger application, AI features, and optional integrations."
      effectiveDate="March 1, 2026"
      lastUpdated="March 5, 2026"
      activeDoc="terms"
      onNavigate={onNavigate}
      user={user}
    >
      {/* Quick Important Notice Box */}
      <div className="mb-8 p-4 sm:p-5 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 text-slate-800 dark:text-slate-200">
        <div className="flex items-center gap-2 font-semibold text-sm text-slate-900 dark:text-slate-100 mb-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <span>Key Usage Conditions & Disclaimers</span>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          MindLedger is a personal reflective tool powered by artificial intelligence. MindLedger does not provide medical, mental health, legal, investment, or financial advice. Gemini AI responses are computational aids intended to support personal inquiry and critical thinking—not authoritative guidance.
        </p>
      </div>

      {/* Table of Contents */}
      <div className="mb-10 pb-6 border-b border-slate-200 dark:border-slate-800">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
          Document Sections
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <a href="#section-acceptance" className="text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 flex items-center gap-1.5">
            <span className="text-slate-400 font-mono">01.</span> Acceptance of Terms
          </a>
          <a href="#section-description" className="text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 flex items-center gap-1.5">
            <span className="text-slate-400 font-mono">02.</span> Description of Service
          </a>
          <a href="#section-accounts" className="text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 flex items-center gap-1.5">
            <span className="text-slate-400 font-mono">03.</span> User Accounts & Authentication
          </a>
          <a href="#section-acceptable-use" className="text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 flex items-center gap-1.5">
            <span className="text-slate-400 font-mono">04.</span> Acceptable Use & Conduct
          </a>
          <a href="#section-ai-disclaimer" className="text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 flex items-center gap-1.5">
            <span className="text-slate-400 font-mono">05.</span> AI Capabilities & Limitations
          </a>
          <a href="#section-content-rights" className="text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 flex items-center gap-1.5">
            <span className="text-slate-400 font-mono">06.</span> User Content & Intellectual Property
          </a>
          <a href="#section-integrations-terms" className="text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 flex items-center gap-1.5">
            <span className="text-slate-400 font-mono">07.</span> Third-Party Integrations
          </a>
          <a href="#section-service-warranties" className="text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 flex items-center gap-1.5">
            <span className="text-slate-400 font-mono">08.</span> Disclaimers of Warranties
          </a>
          <a href="#section-liability" className="text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 flex items-center gap-1.5">
            <span className="text-slate-400 font-mono">09.</span> Limitation of Liability
          </a>
          <a href="#section-termination" className="text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 flex items-center gap-1.5">
            <span className="text-slate-400 font-mono">10.</span> Termination & Suspension
          </a>
          <a href="#section-governing-law" className="text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 flex items-center gap-1.5">
            <span className="text-slate-400 font-mono">11.</span> Governing Law & Jurisdiction
          </a>
          <a href="#section-terms-changes" className="text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 flex items-center gap-1.5">
            <span className="text-slate-400 font-mono">12.</span> Changes & Contact Information
          </a>
        </div>
      </div>

      {/* Terms Body */}
      <div className="space-y-10 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
        {/* Section 1 */}
        <section id="section-acceptance" className="scroll-mt-24 space-y-3">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span className="text-amber-600 dark:text-amber-400 font-mono text-sm">01.</span>
            Acceptance of Terms
          </h2>
          <p>
            Welcome to MindLedger. By accessing, browsing, registering for, or using the MindLedger web application (&ldquo;Service&rdquo;), you agree to be legally bound by these Terms of Service (&ldquo;Terms&rdquo;) and our Privacy Policy. If you do not agree to these Terms, you must immediately discontinue your use of the Service.
          </p>
          <p>
            If you are using MindLedger on behalf of an entity, organization, or company, you represent and warrant that you have authority to bind that entity to these Terms.
          </p>
        </section>

        {/* Section 2 */}
        <section id="section-description" className="scroll-mt-24 space-y-3">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span className="text-amber-600 dark:text-amber-400 font-mono text-sm">02.</span>
            Description of the Service
          </h2>
          <p>
            MindLedger provides a cloud-hosted software workspace for multi-turn reflective journaling, AI-assisted contemplation, personal memory graph synthesis, and decision analysis. Key capabilities include:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs text-slate-600 dark:text-slate-400">
            <li><strong>Reflective Journaling:</strong> Structured multi-turn writing accompanied by conversational Gemini AI assistance.</li>
            <li><strong>Ask My Journal:</strong> Natural-language question answering grounded exclusively in your authenticated journal entries.</li>
            <li><strong>Personal Memory Graph:</strong> AI-derived extraction of cognitive themes, goals, habits, challenges, and relationships.</li>
            <li><strong>Decision Lab:</strong> Systematic evaluation of questions, options, criteria, pros, cons, and trade-offs.</li>
            <li><strong>Knowledge & Intelligence Bridges:</strong> Optional user-authorized connections to Notion (for exporting reflections) and Gmail (for on-demand email analysis).</li>
          </ul>
        </section>

        {/* Section 3 */}
        <section id="section-accounts" className="scroll-mt-24 space-y-3">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span className="text-amber-600 dark:text-amber-400 font-mono text-sm">03.</span>
            User Accounts & Authentication
          </h2>
          <p>
            To access personalized features, you must authenticate using a supported Google Account via Firebase Authentication.
          </p>
          <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
            <p>
              • <strong>Account Security:</strong> You are responsible for maintaining the confidentiality and security of your Google credentials and device access. Any activity originating from your authenticated session is your responsibility.
            </p>
            <p>
              • <strong>Accurate Information:</strong> You agree not to impersonate another individual or create fraudulent accounts.
            </p>
            <p>
              • <strong>Breach Notification:</strong> You agree to immediately notify us if you suspect any unauthorized access to your account or any breach of security.
            </p>
          </div>
        </section>

        {/* Section 4 */}
        <section id="section-acceptable-use" className="scroll-mt-24 space-y-3">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span className="text-amber-600 dark:text-amber-400 font-mono text-sm">04.</span>
            Acceptable Use & Conduct
          </h2>
          <p>
            You agree to use MindLedger exclusively in compliance with all applicable local, national, and international laws. You agree NOT to:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
            <li>Engage in, facilitate, or promote illegal acts, harassment, hate speech, or defamation.</li>
            <li>Attempt to probe, scan, or test the vulnerability of the system or network, or breach security or authentication measures.</li>
            <li>Reverse engineer, decompile, disassemble, or extract source code or underlying trade secrets of the Service.</li>
            <li>Attempt to access data, reflections, or credentials belonging to any other user.</li>
            <li>Submit malicious inputs, automated scripts, worms, viruses, or prompt injection payloads intended to subvert the AI model&apos;s safeguards or hijack underlying infrastructure.</li>
            <li>Impose an unreasonable or disproportionately large load on our servers, APIs, or database quotas.</li>
          </ul>
        </section>

        {/* Section 5 */}
        <section id="section-ai-disclaimer" className="scroll-mt-24 space-y-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span className="text-amber-600 dark:text-amber-400 font-mono text-sm">05.</span>
            AI Capabilities, Limitations & Epistemic Boundaries
          </h2>
          <div className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 text-xs text-slate-800 dark:text-slate-200 space-y-2">
            <div className="font-semibold text-amber-900 dark:text-amber-300 flex items-center gap-2">
              <Brain className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>Computational Nature of AI Insights</span>
            </div>
            <p className="leading-relaxed">
              MindLedger integrates Google Gemini generative artificial intelligence models to synthesize text, propose reflective questions, extract structured decision factors, and generate memory nodes. <strong>Generative AI responses are probabilistic outputs and may occasionally be inaccurate, incomplete, biased, or speculative.</strong>
            </p>
          </div>

          <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
            <p>
              • <strong>No Professional Advice:</strong> The Service does NOT constitute, and must not be used as a substitute for, licensed psychological counseling, mental health therapy, medical diagnosis, legal advice, tax advice, or financial planning. Always consult a qualified professional before making critical real-world health, legal, or financial decisions.
            </p>
            <p>
              • <strong>Human in the Loop:</strong> You are solely responsible for reviewing, verifying, and exercising your own independent human judgment regarding any insight, action item, or summary suggested by the AI.
            </p>
          </div>
        </section>

        {/* Section 6 */}
        <section id="section-content-rights" className="scroll-mt-24 space-y-3">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span className="text-amber-600 dark:text-amber-400 font-mono text-sm">06.</span>
            User Content & Intellectual Property
          </h2>
          <div className="space-y-3 text-xs text-slate-600 dark:text-slate-400">
            <div>
              <strong className="text-slate-900 dark:text-slate-100">Ownership of Your Content:</strong> You retain full copyright and ownership of all journal text, reflections, notes, decisions, and personal inputs you submit to MindLedger (&ldquo;User Content&rdquo;).
            </div>
            <div>
              <strong className="text-slate-900 dark:text-slate-100">Limited License to Operate:</strong> To provide the Service, you grant MindLedger a limited, non-exclusive, worldwide, royalty-free license solely to host, store, transfer, display, process, and analyze your User Content through the Google Cloud infrastructure and Gemini AI APIs as necessary to deliver the features you request. We do NOT claim ownership of your thoughts.
            </div>
            <div>
              <strong className="text-slate-900 dark:text-slate-100">MindLedger Intellectual Property:</strong> All software, algorithms, user interfaces, branding, visual designs, logos, and documentation related to MindLedger are the exclusive intellectual property of MindLedger and its licensors. You may not copy or redistribute any part of our platform without prior written permission.
            </div>
          </div>
        </section>

        {/* Section 7 */}
        <section id="section-integrations-terms" className="scroll-mt-24 space-y-3">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span className="text-amber-600 dark:text-amber-400 font-mono text-sm">07.</span>
            Third-Party Integrations & Services
          </h2>
          <p>
            MindLedger facilitates optional connections to third-party services including Google Workspace (Gmail), Notion, and Google Maps Platform.
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
            <li>Your use of third-party platforms is governed by their respective terms of service and privacy policies.</li>
            <li>We are not liable or responsible for outages, rate-limiting, modifications, service terminations, or data policies enforced by third-party providers.</li>
            <li>You may revoke integration authorizations at any time within MindLedger or via your account management settings with the respective third party.</li>
            <li>Third-party data obtained through APIs (such as Gmail emails) is treated as external, untrusted input.</li>
          </ul>
        </section>

        {/* Section 8 */}
        <section id="section-service-warranties" className="scroll-mt-24 space-y-3">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span className="text-amber-600 dark:text-amber-400 font-mono text-sm">08.</span>
            Disclaimers of Warranties
          </h2>
          <p className="text-xs uppercase font-semibold text-slate-600 dark:text-slate-400">
            Please read this section carefully as it limits our contractual warranties.
          </p>
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-2 leading-relaxed">
            <p>
              THE SERVICE IS PROVIDED ON AN &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; BASIS WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT.
            </p>
            <p>
              MINDLEDGER DOES NOT WARRANT THAT: (A) THE SERVICE WILL MEET YOUR REQUIREMENTS; (B) THE SERVICE WILL BE UNINTERRUPTED, TIMELY, SECURE, OR ERROR-FREE; (C) THE RESULTS THAT MAY BE OBTAINED FROM THE USE OF THE SERVICE OR GEMINI AI WILL BE ACCURATE, COMPLETE, OR RELIABLE; OR (D) ANY DEFECTS IN THE SOFTWARE WILL BE CORRECTED.
            </p>
          </div>
        </section>

        {/* Section 9 */}
        <section id="section-liability" className="scroll-mt-24 space-y-3">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span className="text-amber-600 dark:text-amber-400 font-mono text-sm">09.</span>
            Limitation of Liability
          </h2>
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-2 leading-relaxed">
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL MINDLEDGER, ITS OPERATORS, DIRECTORS, AFFILIATES, OR LICENSORS BE LIABLE FOR ANY INDIRECT, PUNITIVE, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR EXEMPLARY DAMAGES, INCLUDING WITHOUT LIMITATION DAMAGES FOR LOSS OF PROFITS, GOODWILL, USE, DATA, OR OTHER INTANGIBLE LOSSES, ARISING OUT OF OR RELATING TO THE USE OF, OR INABILITY TO USE, THIS SERVICE.
            </p>
            <p>
              UNDER NO CIRCUMSTANCES WILL MINDLEDGER BE RESPONSIBLE FOR ANY DAMAGE, LOSS, OR INJURY RESULTING FROM HACKING, TAMPERING, OR OTHER UNAUTHORIZED ACCESS OR USE OF THE SERVICE OR YOUR ACCOUNT.
            </p>
            <p>
              TO THE EXTENT PERMITTED BY LAW, MINDLEDGER&apos;S TOTAL AGGREGATE LIABILITY FOR ANY CLAIMS UNDER THESE TERMS SHALL NOT EXCEED THE AMOUNT PAID BY YOU TO MINDLEDGER IN THE TWELVE (12) MONTHS PRECEDING THE EVENT GIVING RISE TO LIABILITY, OR FIFTY UNITED STATES DOLLARS ($50.00 USD), WHICHEVER IS GREATER.
            </p>
          </div>
        </section>

        {/* Section 10 */}
        <section id="section-termination" className="scroll-mt-24 space-y-3">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span className="text-amber-600 dark:text-amber-400 font-mono text-sm">10.</span>
            Termination & Suspension
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            We reserve the right to suspend or terminate your access to the Service at any time, with or without notice, if we believe you have violated these Terms, engaged in abuse, attempted to compromise security, or if continuing to provide the Service poses legal or technical risk.
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            You may stop using the Service at any time. You may delete individual reflections or disconnect integrations through the user interface controls.
          </p>
        </section>

        {/* Section 11 */}
        <section id="section-governing-law" className="scroll-mt-24 space-y-3">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span className="text-amber-600 dark:text-amber-400 font-mono text-sm">11.</span>
            Governing Law & Dispute Resolution
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            These Terms shall be governed and construed in accordance with the laws of{' '}
            <span className="font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
              [Jurisdiction / Governing Law Placeholder - e.g., State/Country of Operation]
            </span>
            , without regard to its conflict of law provisions. Any dispute, claim, or controversy arising out of or relating to these Terms or the breach, termination, enforcement, interpretation, or validity thereof shall be resolved in the courts located within said jurisdiction.
          </p>
        </section>

        {/* Section 12 */}
        <section id="section-terms-changes" className="scroll-mt-24 space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span className="text-amber-600 dark:text-amber-400 font-mono text-sm">12.</span>
            Modifications to Terms & Inquiries
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            We reserve the right to update or modify these Terms at any time by posting the revised version on this page and updating the &ldquo;Last Revised&rdquo; date. Your continued use of the Service following any changes constitutes your binding acceptance of the updated Terms.
          </p>
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
            <div className="font-semibold text-slate-900 dark:text-slate-100">MindLedger Legal Operations</div>
            <div className="text-slate-600 dark:text-slate-400">
              Email:{' '}
              <a href="mailto:jhasaurav593@gmail.com" className="text-amber-600 dark:text-amber-400 underline font-mono">
                jhasaurav593@gmail.com
              </a>
            </div>
            <div className="text-slate-500 dark:text-slate-400 text-[11px] pt-1">
              General legal inquiries, intellectual property notices, or compliance questions may be directed to our legal operations address.
            </div>
          </div>
        </section>
      </div>
    </LegalLayout>
  );
};

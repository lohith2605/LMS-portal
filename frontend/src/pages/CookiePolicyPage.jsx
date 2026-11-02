import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Cookie,
  ShieldCheck,
  Lock,
  Palette,
  BarChart3,
  SlidersHorizontal,
  ArrowLeft,
  ExternalLink,
  Info,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import AuthModal from '../components/AuthModal';
import { useCookieConsent } from '../context/CookieConsentContext';
import { CATEGORY_DETAILS } from '../utils/cookieConsent';

export default function CookiePolicyPage() {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authRole, setAuthRole] = useState('student');
  const { openPreferences, consent } = useCookieConsent();

  const handleOpenAuth = (role = 'student') => {
    setAuthRole(role === 'instructor' ? 'instructor' : 'student');
    setAuthModalOpen(true);
  };

  const lastUpdated = 'November 2, 2026';

  const sections = [
    { id: 'overview', title: '1. What Are Cookies & Storage?' },
    { id: 'essential', title: '2. Strictly Essential Cookies' },
    { id: 'preferences', title: '3. Preferences & Display' },
    { id: 'analytics', title: '4. Analytics & Performance' },
    { id: 'marketing', title: '5. Marketing & Third Parties' },
    { id: 'managing', title: '6. Managing Your Choices' },
    { id: 'browser-controls', title: '7. Browser-Level Controls' },
  ];

  return (
    <div className="min-h-screen bg-page text-primary flex flex-col font-sans antialiased">
      <Navbar onOpenAuth={handleOpenAuth} />

      <main className="flex-1 pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-[1200px] mx-auto w-full">
        {/* Breadcrumb / Back Link */}
        <div className="mb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-secondary hover:text-primary transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Back to LearnSpace Home</span>
          </Link>
        </div>

        {/* Header */}
        <div className="border-b border-border-subtle pb-8 mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cobalt-soft text-cobalt text-xs font-bold uppercase tracking-wider mb-3">
            <Cookie size={13} strokeWidth={2} />
            <span>Cookies & Web Storage</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-primary tracking-tight">
            Cookie Policy
          </h1>
          <p className="text-sm text-secondary mt-2 max-w-2xl leading-relaxed">
            This Cookie Policy explains how LearnSpace utilizes cookies, local storage, and session tokens to provide a secure and consistent educational platform.
          </p>

          <div className="flex flex-wrap items-center gap-4 mt-4 text-xs text-tertiary">
            <span>Last Updated: {lastUpdated}</span>
            <span>&bull;</span>
            <span>Policy Version: 1.0.0</span>
            <span>&bull;</span>
            <button
              type="button"
              onClick={openPreferences}
              className="inline-flex items-center gap-1.5 text-cobalt hover:text-cobalt-hover font-bold underline underline-offset-2 cursor-pointer"
            >
              <SlidersHorizontal size={13} />
              <span>Open Cookie Settings</span>
            </button>
          </div>
        </div>

        {/* Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
          {/* Table of Contents */}
          <aside className="lg:col-span-1 hidden lg:block">
            <div className="sticky top-24 bg-surface border border-border-subtle rounded-2xl p-4 shadow-xs space-y-4">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-secondary mb-3 px-2">
                  Policy Sections
                </h2>
                <nav className="space-y-1">
                  {sections.map((sec) => (
                    <a
                      key={sec.id}
                      href={`#${sec.id}`}
                      className="block px-2.5 py-1.5 rounded-lg text-xs font-medium text-secondary hover:text-primary hover:bg-surface-subtle transition-colors truncate"
                    >
                      {sec.title}
                    </a>
                  ))}
                </nav>
              </div>

              {/* Quick Preferences Callout */}
              <div className="pt-3 border-t border-border-subtle">
                <span className="text-[11px] font-bold text-primary block mb-1">
                  Current Status:
                </span>
                <span className="inline-block text-[11px] font-semibold text-secondary mb-2">
                  {consent ? `Preferences saved (${consent.status})` : 'No decision saved yet'}
                </span>
                <button
                  type="button"
                  onClick={openPreferences}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-cobalt hover:bg-cobalt-hover text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
                >
                  <SlidersHorizontal size={12} />
                  <span>Customize Settings</span>
                </button>
              </div>
            </div>
          </aside>

          {/* Legal Body */}
          <div className="lg:col-span-3 space-y-10 text-sm leading-relaxed text-secondary">
            {/* Section 1: Overview */}
            <section id="overview" className="scroll-mt-28 bg-surface border border-border-subtle rounded-3xl p-6 sm:p-8 shadow-xs">
              <h2 className="text-lg font-bold text-primary mb-3 flex items-center gap-2">
                <Info size={18} className="text-cobalt" />
                1. What Are Cookies & Web Storage Technologies?
              </h2>
              <p>
                Cookies are small text files placed on your computer or mobile device when you browse websites. Web storage technologies (such as <code>localStorage</code> and <code>sessionStorage</code>) allow web applications to store data directly within your browser.
              </p>
              <p className="mt-3">
                At LearnSpace, we prioritize privacy-by-design. We use these technologies primarily to maintain cryptographic session security (so you remain safely signed in) and to respect your explicit interface choices.
              </p>
            </section>

            {/* Section 2: Essential Cookies */}
            <section id="essential" className="scroll-mt-28 bg-surface border border-border-subtle rounded-3xl p-6 sm:p-8 shadow-xs">
              <div className="flex items-center justify-between gap-2 mb-3">
                <h2 className="text-lg font-bold text-primary flex items-center gap-2">
                  <Lock size={18} className="text-emerald-600" />
                  2. Strictly Essential Cookies & Tokens
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-accent-sage-pale text-accent-sage-dark uppercase tracking-wider">
                  Always Active
                </span>
              </div>
              <p>
                Strictly essential cookies cannot be switched off because our educational platform cannot function securely without them. They are set in response to actions made by you, such as logging in, managing account sessions, and completing assignments.
              </p>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-xs border border-border-subtle rounded-xl overflow-hidden">
                  <thead className="bg-surface-subtle border-b border-border-subtle text-primary font-bold">
                    <tr>
                      <th className="p-3">Identifier</th>
                      <th className="p-3">Provider</th>
                      <th className="p-3">Duration</th>
                      <th className="p-3">Purpose</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {CATEGORY_DETAILS.essential.cookiesList.map((c, i) => (
                      <tr key={i} className="hover:bg-surface-subtle/40 transition-colors">
                        <td className="p-3 font-mono font-bold text-primary">{c.name}</td>
                        <td className="p-3">{c.provider}</td>
                        <td className="p-3 whitespace-nowrap">{c.duration}</td>
                        <td className="p-3">{c.purpose}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 p-3 bg-surface-subtle rounded-xl border border-border-subtle text-xs">
                <strong>Authentication Security:</strong> Our authentication token (<code>jwt</code>) is transmitted with the <code>HttpOnly</code> attribute, preventing client-side JavaScript access and providing defense against cross-site scripting (XSS) attacks.
              </div>
            </section>

            {/* Section 3: Preferences */}
            <section id="preferences" className="scroll-mt-28 bg-surface border border-border-subtle rounded-3xl p-6 sm:p-8 shadow-xs">
              <h2 className="text-lg font-bold text-primary mb-3 flex items-center gap-2">
                <Palette size={18} className="text-accent-blue-dark" />
                3. Preferences & Display Settings
              </h2>
              <p>
                Preferences cookies and storage entries allow LearnSpace to remember your display choices, such as whether you prefer light mode or dark mode, and whether you collapsed the navigation sidebar to maximize screen space for course content.
              </p>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-xs border border-border-subtle rounded-xl overflow-hidden">
                  <thead className="bg-surface-subtle border-b border-border-subtle text-primary font-bold">
                    <tr>
                      <th className="p-3">Identifier</th>
                      <th className="p-3">Storage Type</th>
                      <th className="p-3">Purpose</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {CATEGORY_DETAILS.preferences.cookiesList.map((c, i) => (
                      <tr key={i} className="hover:bg-surface-subtle/40 transition-colors">
                        <td className="p-3 font-mono font-bold text-primary">{c.name}</td>
                        <td className="p-3">{c.type}</td>
                        <td className="p-3">{c.purpose}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Section 4: Analytics */}
            <section id="analytics" className="scroll-mt-28 bg-surface border border-border-subtle rounded-3xl p-6 sm:p-8 shadow-xs">
              <h2 className="text-lg font-bold text-primary mb-3 flex items-center gap-2">
                <BarChart3 size={18} className="text-cobalt" />
                4. Analytics & Performance Monitoring
              </h2>
              <p>
                These tools allow us to count visits and traffic sources so we can measure and improve platform performance. They help us understand which course lessons are most engaging and optimize page responsiveness.
              </p>
              <div className="mt-3 p-3.5 bg-surface-subtle rounded-2xl border border-border-subtle text-xs space-y-1">
                <span className="font-bold text-primary block">Active Tracking Status:</span>
                <p>
                  LearnSpace currently operates <strong>without external third-party tracking scripts</strong> (e.g. Google Analytics or tracking pixels). This category remains disabled unless you explicitly opt in, and any future measurement scripts will honor your consent.
                </p>
              </div>
            </section>

            {/* Section 5: Marketing */}
            <section id="marketing" className="scroll-mt-28 bg-surface border border-border-subtle rounded-3xl p-6 sm:p-8 shadow-xs">
              <h2 className="text-lg font-bold text-primary mb-3 flex items-center gap-2">
                <ShieldCheck size={18} className="text-accent-sage-dark" />
                5. Marketing, Advertising & Third Parties
              </h2>
              <p>
                LearnSpace is dedicated to education. We <strong>do not sell user data</strong>, do not host advertisements, and do not embed behavioral tracking pixels from social media platforms or advertising brokers.
              </p>
            </section>

            {/* Section 6: Managing Your Choices */}
            <section id="managing" className="scroll-mt-28 bg-surface border border-border-subtle rounded-3xl p-6 sm:p-8 shadow-xs">
              <h2 className="text-lg font-bold text-primary mb-3 flex items-center gap-2">
                <SlidersHorizontal size={18} className="text-cobalt" />
                6. Managing Your Cookie Choices
              </h2>
              <p>
                You can review, modify, or withdraw your cookie consent choices at any time directly through our interactive preferences tool:
              </p>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={openPreferences}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cobalt hover:bg-cobalt-hover text-white text-xs font-bold shadow-sm shadow-cobalt/25 hover-lift btn-press cursor-pointer transition-all"
                >
                  <SlidersHorizontal size={14} />
                  <span>Open Cookie Preferences Dialog</span>
                </button>
              </div>
              <p className="mt-4 text-xs text-tertiary">
                Withdrawing consent disables optional storage immediately. Strictly essential authentication cookies will continue to operate so you can stay logged into your courses.
              </p>
            </section>

            {/* Section 7: Browser-Level Controls */}
            <section id="browser-controls" className="scroll-mt-28 bg-surface border border-border-subtle rounded-3xl p-6 sm:p-8 shadow-xs">
              <h2 className="text-lg font-bold text-primary mb-3 flex items-center gap-2">
                <ExternalLink size={18} className="text-secondary" />
                7. Browser-Level Controls
              </h2>
              <p>
                In addition to our preferences panel, most modern web browsers allow you to control cookie settings through their preferences. Note that blocking all cookies (including essential cookies) via your browser settings may prevent you from logging in or using LearnSpace:
              </p>
              <ul className="list-disc pl-5 space-y-1 mt-3 text-xs">
                <li><strong>Google Chrome:</strong> Settings &rarr; Privacy and security &rarr; Cookies and other site data.</li>
                <li><strong>Mozilla Firefox:</strong> Settings &rarr; Privacy & Security &rarr; Cookies and Site Data.</li>
                <li><strong>Apple Safari:</strong> Preferences &rarr; Privacy &rarr; Manage Website Data.</li>
                <li><strong>Microsoft Edge:</strong> Settings &rarr; Cookies and site permissions &rarr; Manage and delete cookies and site data.</li>
              </ul>
            </section>
          </div>
        </div>
      </main>

      <Footer onOpenAuth={handleOpenAuth} />

      {authModalOpen && (
        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          defaultRole={authRole}
        />
      )}
    </div>
  );
}


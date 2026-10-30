import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Sparkles } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';
import BrandLogo from '../components/ui/BrandLogo';

export default function AuthLayout({
  children,
  eyebrow = 'LEARNING PORTAL',
  headline = 'Your next breakthrough starts here.',
  description = 'Return to your courses, continue building practical skills, and keep your learning journey moving forward.',
  highlights = [],
  quote = 'Learn with purpose. Progress with confidence.',
  panelBadge = 'Platform',
  formTitle,
  formSubtitle,
  backLink = '/',
  backLabel = 'Back to Home'
}) {
  return (
    <div className="min-h-screen bg-page text-primary font-sans antialiased selection:bg-cobalt-soft selection:text-cobalt">
      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-screen">
        
        {/* ========================================================= */}
        {/* LEFT PANEL: LearnSpace Brand Experience (~46-48%)         */}
        {/* ========================================================= */}
        <aside className="hidden lg:flex lg:col-span-5 xl:col-span-5 bg-page border-r border-border-subtle flex-col justify-between p-8 xl:p-12 relative overflow-hidden">
          
          {/* Subtle architectural background accents */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-cobalt-light/50 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-cobalt-soft/40 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

          {/* Top Brand & Navigation Header */}
          <div className="relative z-10 flex items-center justify-between">
            <BrandLogo
              to="/"
              size="md"
              badge={
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cobalt-soft text-cobalt border border-cobalt-border">
                  {panelBadge}
                </span>
              }
              ariaLabel="LearnSpace Home"
            />

            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Link
                to={backLink}
                className="text-xs font-semibold text-secondary hover:text-primary transition-colors inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border-subtle bg-surface/80 hover:bg-surface shadow-2xs backdrop-blur-xs"
              >
                <ArrowLeft size={13} />
                <span>{backLabel}</span>
              </Link>
            </div>
          </div>

          {/* Middle Story & Highlights Section */}
          <div className="relative z-10 my-auto py-8 max-w-md">
            {/* Eyebrow */}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface border border-border-subtle text-[11px] font-bold tracking-wider uppercase text-cobalt mb-5 shadow-2xs">
              <Sparkles size={12} className="text-cobalt" />
              <span>{eyebrow}</span>
            </div>

            {/* Headline */}
            <h1 className="text-3xl xl:text-[34px] font-extrabold tracking-tight text-primary leading-[1.2] mb-4">
              {headline}
            </h1>

            {/* Supporting Text */}
            <p className="text-sm text-secondary leading-relaxed mb-8">
              {description}
            </p>

            {/* Custom Feature Highlights / Steps */}
            {highlights && highlights.length > 0 && (
              <div className="space-y-3.5">
                {highlights.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={idx}
                      className="p-3.5 rounded-2xl bg-surface/90 border border-border-subtle shadow-2xs flex items-start gap-3.5 transition-all hover:bg-surface hover:border-border-medium"
                    >
                      {Icon && (
                        <div className="w-9 h-9 rounded-xl bg-cobalt-soft text-cobalt flex items-center justify-center shrink-0 border border-cobalt-border">
                          <Icon size={18} />
                        </div>
                      )}
                      <div>
                        <h2 className="text-xs font-bold text-primary leading-tight mb-0.5">
                          {item.title}
                        </h2>
                        <p className="text-[12px] text-secondary leading-normal">
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Bottom Brand Credibility Footer */}
          <div className="relative z-10 pt-6 border-t border-border-subtle/80 flex flex-col gap-2">
            <p className="text-xs font-medium text-primary italic">
              "{quote}"
            </p>
            <div className="flex items-center justify-between text-[11px] text-tertiary">
              <div className="flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-emerald-600" />
                <span>Encrypted Session • Role-Based Security</span>
              </div>
              <span>v2.1</span>
            </div>
          </div>
        </aside>

        {/* ========================================================= */}
        {/* RIGHT PANEL: Form Container (~52-54%)                     */}
        {/* ========================================================= */}
        <main className="col-span-1 lg:col-span-7 xl:col-span-7 bg-surface flex flex-col justify-between min-h-screen p-5 sm:p-8 lg:p-10 xl:p-12 overflow-y-auto">
          
          {/* Mobile Top Header (hidden on desktop) */}
          <div className="flex lg:hidden items-center justify-between pb-6 border-b border-border-subtle">
            <BrandLogo
              to="/"
              size="sm"
              ariaLabel="LearnSpace Home"
            />

            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Link
                to={backLink}
                className="text-xs font-semibold text-secondary hover:text-primary inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border-subtle bg-surface-subtle"
              >
                <ArrowLeft size={12} />
                <span>{backLabel}</span>
              </Link>
            </div>
          </div>

          {/* Center Form Wrapper */}
          <div className="w-full max-w-[420px] mx-auto my-auto py-6 sm:py-8">
            {formTitle && (
              <div className="mb-6">
                <h2 className="text-2xl sm:text-[26px] font-extrabold tracking-tight text-primary">
                  {formTitle}
                </h2>
                {formSubtitle && (
                  <p className="text-xs sm:text-sm text-secondary mt-1.5 leading-relaxed">
                    {formSubtitle}
                  </p>
                )}
              </div>
            )}

            {children}
          </div>

          {/* Subdued Bottom Form Footer */}
          <footer className="pt-6 border-t border-border-subtle text-[11px] text-tertiary flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
            <span>© 2026 LearnSpace Platform. All rights reserved.</span>
            <div className="flex items-center gap-3">
              <span className="hover:text-primary cursor-pointer">Security</span>
              <span>•</span>
              <span className="hover:text-primary cursor-pointer">Terms</span>
              <span>•</span>
              <span className="hover:text-primary cursor-pointer">Privacy</span>
            </div>
          </footer>
        </main>

      </div>
    </div>
  );
}

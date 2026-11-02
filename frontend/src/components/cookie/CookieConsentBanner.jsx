import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, SlidersHorizontal, Check, X } from 'lucide-react';
import { useCookieConsent } from '../../context/CookieConsentContext';

export default function CookieConsentBanner() {
  const {
    isBannerOpen,
    acceptAll,
    rejectOptional,
    openPreferences,
  } = useCookieConsent();

  if (!isBannerOpen) return null;

  return (
    <aside
      aria-label="Cookie Consent"
      role="region"
      className="fixed bottom-0 inset-x-0 z-50 p-3 sm:p-5 pointer-events-none animate-slide-up"
    >
      <div className="max-w-4xl mx-auto pointer-events-auto bg-surface border border-border-subtle rounded-2xl shadow-elevated p-4 sm:p-6 text-primary transition-all duration-200">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6">
          {/* Content Column */}
          <div className="flex items-start gap-3.5 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-cobalt-soft text-cobalt flex items-center justify-center shrink-0 mt-0.5">
              <ShieldCheck size={20} strokeWidth={2} aria-hidden="true" />
            </div>

            <div className="space-y-1.5 flex-1">
              <h2 className="text-sm sm:text-base font-bold text-primary tracking-tight">
                Your privacy matters
              </h2>
              <p className="text-xs sm:text-[13px] text-secondary leading-relaxed">
                We use essential cookies to keep LearnSpace secure and working properly. With your permission, we may also use optional cookies to understand how our learning platform is used and improve your experience.
              </p>
              <div className="flex items-center gap-3 text-xs pt-0.5">
                <Link
                  to="/cookies"
                  className="text-cobalt hover:text-cobalt-hover font-semibold underline underline-offset-2 transition-colors"
                >
                  Cookie Policy
                </Link>
                <span className="text-tertiary" aria-hidden="true">&bull;</span>
                <Link
                  to="/privacy"
                  className="text-cobalt hover:text-cobalt-hover font-semibold underline underline-offset-2 transition-colors"
                >
                  Privacy Policy
                </Link>
              </div>
            </div>
          </div>

          {/* Actions Column: Accept All, Reject Optional, Customize */}
          <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-stretch sm:items-center gap-2 sm:gap-2.5 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-border-subtle">
            {/* Reject Optional - Clear, visible, equal standing */}
            <button
              type="button"
              onClick={rejectOptional}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-border-subtle bg-surface hover:bg-surface-subtle text-primary text-xs font-semibold hover-lift btn-press transition-all cursor-pointer shadow-2xs"
            >
              <X size={14} strokeWidth={2} aria-hidden="true" />
              <span>Reject Optional</span>
            </button>

            {/* Customize Preferences */}
            <button
              type="button"
              onClick={openPreferences}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-border-subtle bg-surface hover:bg-surface-subtle text-secondary hover:text-primary text-xs font-semibold hover-lift btn-press transition-all cursor-pointer shadow-2xs"
            >
              <SlidersHorizontal size={14} strokeWidth={2} aria-hidden="true" />
              <span>Customize Preferences</span>
            </button>

            {/* Accept All - Cobalt Blue Primary */}
            <button
              type="button"
              onClick={acceptAll}
              className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-cobalt hover:bg-cobalt-hover active:bg-cobalt-pressed text-white text-xs font-bold hover-lift btn-press transition-all cursor-pointer shadow-sm shadow-cobalt/25"
            >
              <Check size={14} strokeWidth={2.5} aria-hidden="true" />
              <span>Accept All</span>
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}


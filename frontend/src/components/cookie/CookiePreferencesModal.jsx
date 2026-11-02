import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  ShieldCheck,
  Lock,
  Palette,
  BarChart3,
  Megaphone,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useCookieConsent } from '../../context/CookieConsentContext';
import { CATEGORY_DETAILS, COOKIE_CATEGORIES } from '../../utils/cookieConsent';

export default function CookiePreferencesModal() {
  const {
    isPreferencesOpen,
    closePreferences,
    consent,
    acceptAll,
    rejectOptional,
    saveCustomPreferences,
  } = useCookieConsent();

  // Local draft state for toggles
  const [preferencesState, setPreferencesState] = useState({
    preferences: false,
    analytics: false,
    marketing: false,
  });

  // Track expanded category details accordion
  const [expandedCategory, setExpandedCategory] = useState(null);

  const modalRef = useRef(null);
  const closeButtonRef = useRef(null);

  // Sync draft state from current saved consent whenever modal opens
  useEffect(() => {
    if (isPreferencesOpen) {
      setPreferencesState({
        preferences: Boolean(consent?.categories?.preferences),
        analytics: Boolean(consent?.categories?.analytics),
        marketing: Boolean(consent?.categories?.marketing),
      });
      // Focus close button on open
      setTimeout(() => {
        closeButtonRef.current?.focus();
      }, 50);
    }
  }, [isPreferencesOpen, consent]);

  // Keyboard navigation: Escape key closes modal without saving
  useEffect(() => {
    if (!isPreferencesOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closePreferences();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPreferencesOpen, closePreferences]);

  if (!isPreferencesOpen) return null;

  const handleToggle = (category) => {
    if (category === COOKIE_CATEGORIES.ESSENTIAL) return; // Invariable
    setPreferencesState((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const handleSaveDraft = () => {
    saveCustomPreferences(preferencesState);
  };

  const toggleAccordion = (catId) => {
    setExpandedCategory((prev) => (prev === catId ? null : catId));
  };

  const getCategoryIcon = (id) => {
    switch (id) {
      case COOKIE_CATEGORIES.ESSENTIAL:
        return Lock;
      case COOKIE_CATEGORIES.PREFERENCES:
        return Palette;
      case COOKIE_CATEGORIES.ANALYTICS:
        return BarChart3;
      case COOKIE_CATEGORIES.MARKETING:
        return Megaphone;
      default:
        return ShieldCheck;
    }
  };

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          closePreferences();
        }
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cookie-preferences-title"
        aria-describedby="cookie-preferences-desc"
        className="w-full max-w-2xl bg-surface border border-border-subtle rounded-3xl shadow-modal text-primary max-h-[90vh] flex flex-col overflow-hidden animate-scale-up"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-border-subtle shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cobalt-soft text-cobalt flex items-center justify-center shrink-0">
              <ShieldCheck size={20} strokeWidth={2} aria-hidden="true" />
            </div>
            <div>
              <h2
                id="cookie-preferences-title"
                className="text-base sm:text-lg font-bold text-primary tracking-tight"
              >
                Cookie Preferences
              </h2>
              <p id="cookie-preferences-desc" className="text-xs text-secondary mt-0.5">
                Customize how cookies and local storage are utilized on LearnSpace.
              </p>
            </div>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={closePreferences}
            aria-label="Close cookie preferences dialog"
            className="p-2 rounded-xl text-secondary hover:text-primary hover:bg-surface-subtle transition-colors cursor-pointer"
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
          <p className="text-xs sm:text-[13px] text-secondary leading-relaxed bg-surface-subtle/70 p-3.5 rounded-2xl border border-border-subtle">
            LearnSpace respects your privacy. You can adjust your consent settings for each category below. Essential cookies cannot be turned off as they are technically necessary to provide secure authentication, session management, and core services.
          </p>

          {/* Categories List */}
          <div className="space-y-3">
            {Object.values(CATEGORY_DETAILS).map((cat) => {
              const Icon = getCategoryIcon(cat.id);
              const isEssential = cat.required;
              const isChecked = isEssential ? true : Boolean(preferencesState[cat.id]);
              const isExpanded = expandedCategory === cat.id;

              return (
                <div
                  key={cat.id}
                  className="rounded-2xl border border-border-subtle bg-surface p-4 transition-all shadow-2xs hover:border-border-medium"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-surface-subtle border border-border-subtle flex items-center justify-center text-secondary shrink-0 mt-0.5">
                        <Icon size={16} strokeWidth={1.75} aria-hidden="true" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-xs sm:text-sm font-bold text-primary">
                            {cat.name}
                          </h3>
                          {isEssential && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-accent-sage-pale text-accent-sage-dark uppercase tracking-wider">
                              Always Active
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-secondary mt-1 leading-relaxed">
                          {cat.shortDescription}
                        </p>
                      </div>
                    </div>

                    {/* Toggle Switch */}
                    <div className="shrink-0 pt-0.5">
                      {isEssential ? (
                        <div
                          aria-label="Essential cookies cannot be disabled"
                          className="w-11 h-6 rounded-full bg-accent-sage-pale text-accent-sage-dark flex items-center justify-end px-1.5 cursor-not-allowed opacity-90"
                        >
                          <div className="w-4 h-4 rounded-full bg-white shadow-xs flex items-center justify-center text-[10px] text-accent-sage-dark font-bold">
                            ✓
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          role="switch"
                          aria-checked={isChecked}
                          aria-label={`Enable ${cat.name}`}
                          onClick={() => handleToggle(cat.id)}
                          className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer focus:outline-none focus:ring-2 focus:ring-cobalt focus:ring-offset-2 ${
                            isChecked ? 'bg-cobalt' : 'bg-surface-subtle border border-border-subtle'
                          }`}
                        >
                          <span
                            className={`block w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                              isChecked ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Accordion Trigger for Detailed Cookie Breakdown */}
                  <div className="mt-3 pt-3 border-t border-border-subtle/60 flex items-center justify-between text-xs">
                    <button
                      type="button"
                      onClick={() => toggleAccordion(cat.id)}
                      className="text-secondary hover:text-primary font-medium inline-flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <span>{isExpanded ? 'Hide cookie details' : 'View cookie details'}</span>
                      {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>
                    <span className="text-tertiary text-[11px]">
                      {cat.cookiesList.length} {cat.cookiesList.length === 1 ? 'entry' : 'entries'}
                    </span>
                  </div>

                  {/* Expandable Cookie Details Table */}
                  {isExpanded && (
                    <div className="mt-3 space-y-2 pt-1 animate-fade-in">
                      <p className="text-xs text-secondary leading-relaxed mb-2">
                        {cat.longDescription}
                      </p>
                      <div className="space-y-2">
                        {cat.cookiesList.map((c, i) => (
                          <div
                            key={i}
                            className="bg-surface-subtle p-2.5 rounded-xl border border-border-subtle/80 text-xs space-y-0.5"
                          >
                            <div className="flex items-center justify-between font-mono font-bold text-primary text-[11px]">
                              <span>{c.name}</span>
                              <span className="text-[10px] font-sans font-medium text-tertiary">
                                {c.duration}
                              </span>
                            </div>
                            <div className="text-[11px] text-tertiary flex items-center justify-between">
                              <span>Provider: {c.provider}</span>
                              <span>Type: {c.type}</span>
                            </div>
                            <p className="text-secondary text-[11px] pt-1">
                              {c.purpose}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-border-subtle bg-surface-subtle/50 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={rejectOptional}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-border-subtle bg-surface hover:bg-surface-subtle text-primary text-xs font-semibold hover-lift btn-press transition-all cursor-pointer shadow-2xs"
          >
            Reject All Optional
          </button>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleSaveDraft}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-border-subtle bg-surface hover:bg-surface-subtle text-primary text-xs font-semibold hover-lift btn-press transition-all cursor-pointer shadow-2xs"
            >
              Save Preferences
            </button>

            <button
              type="button"
              onClick={acceptAll}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-cobalt hover:bg-cobalt-hover active:bg-cobalt-pressed text-white text-xs font-bold hover-lift btn-press transition-all cursor-pointer shadow-sm shadow-cobalt/25"
            >
              <Check size={14} strokeWidth={2.5} aria-hidden="true" />
              <span>Accept All</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


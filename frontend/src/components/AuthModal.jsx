import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, ArrowRight, Sparkles } from 'lucide-react';

export default function AuthModal({ isOpen, mode = 'register', courseContext = null, onClose }) {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (email.trim() && email.includes('@')) {
      setSubmitted(true);
    }
  };

  const getTitle = () => {
    if (courseContext) return `Interest Registered: ${courseContext.title}`;
    if (mode === 'login') return 'Student & Instructor Sign In';
    if (mode === 'instructor') return 'Instructor Partner Program';
    return 'Get Early Platform Access';
  };

  const getDescription = () => {
    if (courseContext) {
      return `Enrollment for ${courseContext.title} opens shortly for the upcoming term. Leave your email to receive syllabus updates and priority enrollment notice.`;
    }
    if (mode === 'login') {
      return 'The LearnSpace authentication portal is currently in private preview with our founding cohort. Enter your email to request portal invitation credentials.';
    }
    if (mode === 'instructor') {
      return 'We are onboarding educators and practitioners to build structured curricula. Tell us your email to receive our curriculum guidelines and instructor toolkit.';
    }
    return 'Join our upcoming learning cohort. Early members receive course preview access, direct instructor Q&A sessions, and tuition waivers.';
  };

  return (
    <div
      className="fixed inset-0 bg-primary/45 backdrop-blur-xs flex items-center justify-center p-4 z-[1000] animate-[modalFadeIn_200ms_ease-out]"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="bg-white rounded-2xl md:rounded-3xl border border-border-subtle shadow-preview w-full max-w-[560px] max-h-[90vh] overflow-y-auto p-6 sm:p-8 relative animate-[modalSlideUp_240ms_cubic-bezier(0.16,1,0.3,1)]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-accent-blue-dark mb-1.5">
              <Sparkles size={13} aria-hidden="true" />
              <span>Cohort Preview</span>
            </div>
            <h2 id="auth-modal-title" className="text-xl font-bold text-primary leading-snug">
              {getTitle()}
            </h2>
          </div>
          <button
            type="button"
            className="w-9 h-9 p-0 rounded-xl inline-flex items-center justify-center border border-border-subtle bg-surface-subtle text-secondary hover:text-primary transition-all cursor-pointer"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        <p className="text-sm text-secondary leading-relaxed mb-6">
          {getDescription()}
        </p>

        {submitted ? (
          <div className="p-5 bg-accent-sage-pale rounded-xl border border-[#A8B5A0]/40 text-center">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-accent-sage text-white mb-2.5">
              <CheckCircle2 size={22} />
            </div>
            <h4 className="text-base font-bold text-primary mb-1">
              Invitation Request Received
            </h4>
            <p className="text-xs text-accent-sage-dark">
              We've registered <strong>{email}</strong>. You'll receive notification as soon as the portal opens for this cohort.
            </p>
            <button
              type="button"
              className="mt-4 inline-flex items-center justify-center gap-2 px-4.5 py-2.5 text-sm font-semibold rounded-xl bg-surface text-primary border border-border-subtle hover:bg-surface-subtle hover:border-border-medium transition-all cursor-pointer"
              onClick={onClose}
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label
                htmlFor="auth-email-input"
                className="block text-xs font-semibold text-primary mb-1.5"
              >
                Your Email Address
              </label>
              <input
                id="auth-email-input"
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-3 rounded-xl border border-border-subtle bg-surface-subtle text-sm text-primary transition-all focus:outline-none focus:bg-surface focus:border-cobalt focus:ring-2 focus:ring-focus-ring/30 focus:shadow-sm placeholder:text-tertiary"
              />
            </div>

            <div className="flex justify-end gap-2.5 mt-2">
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 px-4.5 py-2.5 text-sm font-semibold rounded-xl bg-surface text-primary border border-border-subtle hover:bg-surface-subtle hover:border-border-medium transition-all cursor-pointer"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 px-4.5 py-2.5 text-sm font-semibold rounded-xl bg-cobalt text-white hover:bg-cobalt-hover active:bg-cobalt-pressed shadow-sm shadow-cobalt/20 hover:shadow-card transition-all cursor-pointer"
              >
                <span>Request Early Access</span>
                <ArrowRight size={14} aria-hidden="true" />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

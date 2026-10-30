import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Mail,
  Send,
  CheckCircle2,
  AlertCircle,
  Clock,
  MapPin,
  MessageSquare,
  ArrowLeft,
  Loader2,
  HelpCircle,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import AuthModal from '../components/AuthModal';
import { contactService } from '../services/api';
import { CONTACT_INFO } from '../config/socialLinks';

export default function ContactPage() {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authRole, setAuthRole] = useState('student');

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });

  const [loading, setLoading] = useState(false);
  const [successInfo, setSuccessInfo] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  const handleOpenAuth = (role = 'student') => {
    setAuthRole(role === 'instructor' ? 'instructor' : 'student');
    setAuthModalOpen(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errorMessage) setErrorMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessInfo(null);

    // Frontend validation
    const trimmedName = formData.name.trim();
    const trimmedEmail = formData.email.trim();
    const trimmedSubject = formData.subject.trim();
    const trimmedMessage = formData.message.trim();

    if (trimmedName.length < 2) {
      setErrorMessage('Please enter your full name (at least 2 characters).');
      return;
    }

    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setErrorMessage('Please provide a valid email address.');
      return;
    }

    if (trimmedSubject.length < 3) {
      setErrorMessage('Subject must be at least 3 characters long.');
      return;
    }

    if (trimmedMessage.length < 10) {
      setErrorMessage('Message must be at least 10 characters long.');
      return;
    }

    setLoading(true);

    try {
      const response = await contactService.submitMessage({
        name: trimmedName,
        email: trimmedEmail,
        subject: trimmedSubject,
        message: trimmedMessage,
      });

      if (response && response.success) {
        setSuccessInfo({
          ticketId: response.ticketId,
          message: response.message || 'Your inquiry has been successfully submitted.',
        });
        setFormData({
          name: '',
          email: '',
          subject: '',
          message: '',
        });
      }
    } catch (err) {
      setErrorMessage(
        err.normalizedMessage ||
          err.response?.data?.error ||
          'Failed to send your message. Please verify your connection and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-page text-primary flex flex-col font-sans antialiased">
      <Navbar onOpenAuth={handleOpenAuth} />

      <main className="flex-1 pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-[1200px] mx-auto w-full">
        {/* Back Link */}
        <div className="mb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-secondary hover:text-primary transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Back to LearnSpace Home</span>
          </Link>
        </div>

        {/* Page Header */}
        <div className="border-b border-border-subtle pb-8 mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-blue-pale text-accent-blue-dark text-xs font-bold uppercase tracking-wider mb-3">
            <Mail size={13} strokeWidth={1.75} />
            <span>Help & Support Channels</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-primary tracking-tight">
            Contact Support & Inquiries
          </h1>
          <p className="text-sm text-secondary mt-2 max-w-2xl leading-relaxed">
            Have questions about course enrollments, platform features, or instructor onboarding? Send our support team a direct message.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Left Column: Support Info & FAQ */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-surface border border-border-subtle rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
              <h2 className="text-base font-bold text-primary">Direct Contact Channels</h2>

              <div className="space-y-4 text-xs">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-accent-blue-pale text-accent-blue-dark flex items-center justify-center shrink-0 mt-0.5">
                    <Mail size={16} strokeWidth={1.75} />
                  </div>
                  <div>
                    <span className="font-bold text-primary block">Official Support Email</span>
                    <a
                      href={`mailto:${CONTACT_INFO.supportEmail}`}
                      className="text-secondary hover:text-primary hover:underline"
                    >
                      {CONTACT_INFO.supportEmail}
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-accent-sage-pale text-accent-sage-dark flex items-center justify-center shrink-0 mt-0.5">
                    <Clock size={16} strokeWidth={1.75} />
                  </div>
                  <div>
                    <span className="font-bold text-primary block">Support Hours</span>
                    <span className="text-secondary">{CONTACT_INFO.hours}</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-surface-subtle text-secondary flex items-center justify-center shrink-0 mt-0.5 border border-border-subtle">
                    <MapPin size={16} strokeWidth={1.75} />
                  </div>
                  <div>
                    <span className="font-bold text-primary block">Platform Network</span>
                    <span className="text-secondary">{CONTACT_INFO.location}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Tips */}
            <div className="bg-surface-subtle border border-border-subtle rounded-3xl p-6 shadow-xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-primary mb-2 flex items-center gap-1.5">
                <HelpCircle size={14} className="text-accent-blue-dark" />
                Frequently Asked
              </h3>
              <ul className="text-xs text-secondary space-y-2 mt-3 list-disc pl-4">
                <li>
                  <strong>Certificate Inquiries:</strong> Digital certificates are automatically generated upon scoring &ge; 70% across required coursework.
                </li>
                <li>
                  <strong>Instructor Verification:</strong> Educator applications are reviewed by system administrators within 2 business days.
                </li>
              </ul>
            </div>
          </div>

          {/* Right Column: Contact Form */}
          <div className="lg:col-span-7">
            <div className="bg-surface border border-border-subtle rounded-3xl p-6 sm:p-8 shadow-xs">
              <h2 className="text-base sm:text-lg font-bold text-primary mb-1">
                Send a Message
              </h2>
              <p className="text-xs text-secondary mb-6">
                Fill in the details below and our team will get back to you via email.
              </p>

              {/* Feedback Alert Banners */}
              {errorMessage && (
                <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5 animate-[shake_0.2s_ease-in-out]">
                  <AlertCircle size={16} className="shrink-0 text-rose-600" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {successInfo && (
                <div className="mb-6 p-5 rounded-2xl bg-accent-sage-pale border border-[#A8B5A0]/40 text-accent-sage-dark text-xs space-y-1">
                  <div className="flex items-center gap-2 font-bold text-emerald-800">
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                    <span>Message Received Successfully</span>
                  </div>
                  <p>{successInfo.message}</p>
                  {successInfo.ticketId && (
                    <p className="text-[11px] font-mono text-secondary pt-1">
                      Tracking Reference ID: {successInfo.ticketId}
                    </p>
                  )}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="contact-name"
                      className="block text-xs font-semibold text-primary mb-1.5"
                    >
                      Your Full Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="contact-name"
                      name="name"
                      type="text"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="e.g. Jane Doe"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border-subtle bg-surface-subtle text-xs text-primary transition-all focus:outline-none focus:bg-surface focus:border-primary"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="contact-email"
                      className="block text-xs font-semibold text-primary mb-1.5"
                    >
                      Your Email Address <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="contact-email"
                      name="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="e.g. jane@example.com"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border-subtle bg-surface-subtle text-xs text-primary transition-all focus:outline-none focus:bg-surface focus:border-primary"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="contact-subject"
                    className="block text-xs font-semibold text-primary mb-1.5"
                  >
                    Subject <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="contact-subject"
                    name="subject"
                    type="text"
                    required
                    value={formData.subject}
                    onChange={handleChange}
                    placeholder="e.g. Question regarding Machine Learning course certificate"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border-subtle bg-surface-subtle text-xs text-primary transition-all focus:outline-none focus:bg-surface focus:border-primary"
                  />
                </div>

                <div>
                  <label
                    htmlFor="contact-message"
                    className="block text-xs font-semibold text-primary mb-1.5"
                  >
                    Message <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    id="contact-message"
                    name="message"
                    rows={5}
                    required
                    value={formData.message}
                    onChange={handleChange}
                    placeholder="Provide detailed information regarding your inquiry..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border-subtle bg-surface-subtle text-xs text-primary transition-all focus:outline-none focus:bg-surface focus:border-primary resize-y"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-neutral-800 transition-all cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>Submitting Message...</span>
                      </>
                    ) : (
                      <>
                        <Send size={14} />
                        <span>Send Message</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>

      <Footer onOpenAuth={handleOpenAuth} />

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialRole={authRole}
      />
    </div>
  );
}

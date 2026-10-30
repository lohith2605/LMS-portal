import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  ShieldCheck,
  BookOpen,
  GraduationCap,
  Award,
  AlertCircle,
  HelpCircle,
  Clock,
  ArrowLeft,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import AuthModal from '../components/AuthModal';

export default function TermsPage() {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authRole, setAuthRole] = useState('student');

  const handleOpenAuth = (role = 'student') => {
    setAuthRole(role === 'instructor' ? 'instructor' : 'student');
    setAuthModalOpen(true);
  };

  const lastUpdated = 'October 29, 2026';

  const sections = [
    { id: 'acceptance', title: '1. Acceptance of Terms', icon: ShieldCheck },
    { id: 'accounts', title: '2. User Accounts & Responsibilities', icon: BookOpen },
    { id: 'roles', title: '3. Student & Instructor Responsibilities', icon: GraduationCap },
    { id: 'ip', title: '4. Course Content & Intellectual Property', icon: FileText },
    { id: 'enrollment', title: '5. Enrollment & Progress Tracking', icon: Clock },
    { id: 'assessments', title: '6. Assignments, Quizzes & Certificates', icon: Award },
    { id: 'acceptable-use', title: '7. Acceptable Use & Prohibited Activities', icon: AlertCircle },
    { id: 'termination', title: '8. Account Suspension & Termination', icon: AlertCircle },
    { id: 'contact', title: '9. Questions & Contact Information', icon: HelpCircle },
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

        {/* Page Header */}
        <div className="border-b border-border-subtle pb-8 mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-blue-pale text-accent-blue-dark text-xs font-bold uppercase tracking-wider mb-3">
            <FileText size={13} strokeWidth={1.75} />
            <span>Legal Documentation</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-primary tracking-tight">
            Terms and Conditions
          </h1>
          <p className="text-sm text-secondary mt-2 max-w-2xl leading-relaxed">
            Please read these terms and conditions carefully before using the LearnSpace Learning Management System.
          </p>
          <div className="flex items-center gap-4 mt-4 text-xs text-tertiary">
            <span>Last Updated: {lastUpdated}</span>
            <span>&bull;</span>
            <span>Effective Immediately</span>
          </div>
        </div>

        {/* Two-Column Grid: Sticky Table of Contents & Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
          {/* Sidebar Nav */}
          <aside className="lg:col-span-1 hidden lg:block">
            <div className="sticky top-24 bg-surface border border-border-subtle rounded-2xl p-4 shadow-xs">
              <h2 className="text-xs font-bold uppercase tracking-wider text-secondary mb-3 px-2">
                Table of Contents
              </h2>
              <nav className="space-y-1">
                {sections.map((section) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className="block px-2.5 py-1.5 rounded-lg text-xs font-medium text-secondary hover:text-primary hover:bg-surface-subtle transition-colors truncate"
                  >
                    {section.title}
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          {/* Main Legal Content */}
          <div className="lg:col-span-3 space-y-10 text-sm leading-relaxed text-secondary">
            {/* Section 1 */}
            <section id="acceptance" className="scroll-mt-28 bg-surface border border-border-subtle rounded-3xl p-6 sm:p-8 shadow-xs">
              <h2 className="text-lg font-bold text-primary mb-3 flex items-center gap-2">
                <ShieldCheck size={18} className="text-accent-blue-dark" />
                1. Acceptance of Terms
              </h2>
              <p>
                By registering for an account, accessing, or utilizing the LearnSpace Learning Management System (&ldquo;Platform&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;), you acknowledge that you have read, understood, and agree to be legally bound by these Terms and Conditions and our Privacy Policy.
              </p>
              <p className="mt-3">
                If you do not agree with any part of these terms, you must refrain from creating an account and immediately discontinue your use of the Platform.
              </p>
            </section>

            {/* Section 2 */}
            <section id="accounts" className="scroll-mt-28 bg-surface border border-border-subtle rounded-3xl p-6 sm:p-8 shadow-xs">
              <h2 className="text-lg font-bold text-primary mb-3 flex items-center gap-2">
                <BookOpen size={18} className="text-accent-blue-dark" />
                2. User Accounts & Responsibilities
              </h2>
              <ul className="list-disc pl-5 space-y-2 mt-2">
                <li>
                  <strong>Eligibility:</strong> You must be at least 13 years of age or possess parental/guardian consent to establish an account on LearnSpace.
                </li>
                <li>
                  <strong>Account Credential Security:</strong> You are solely responsible for maintaining the confidentiality of your authentication credentials, session cookies, and passwords. You agree to notify our support team immediately upon discovering unauthorized access.
                </li>
                <li>
                  <strong>Accurate Information:</strong> Users must provide verifiable, accurate details during registration and profile updates, including a valid email address required for account verification and certificate delivery.
                </li>
              </ul>
            </section>

            {/* Section 3 */}
            <section id="roles" className="scroll-mt-28 bg-surface border border-border-subtle rounded-3xl p-6 sm:p-8 shadow-xs">
              <h2 className="text-lg font-bold text-primary mb-3 flex items-center gap-2">
                <GraduationCap size={18} className="text-accent-sage-dark" />
                3. Student & Instructor Responsibilities
              </h2>
              <div className="space-y-3 mt-2">
                <div className="p-3.5 rounded-xl bg-surface-subtle border border-border-subtle">
                  <h3 className="text-xs font-bold text-primary uppercase tracking-wide">For Students</h3>
                  <p className="text-xs mt-1">
                    Learners agree to complete coursework, quizzes, and project submissions honestly. Plagiarism, impersonation, or submitting materials generated without proper authorization is strictly prohibited.
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-surface-subtle border border-border-subtle">
                  <h3 className="text-xs font-bold text-primary uppercase tracking-wide">For Instructors</h3>
                  <p className="text-xs mt-1">
                    Instructors are responsible for delivering accurate, high-quality course curricula, grading student assignments equitably within published deadlines, and maintaining respectful, constructive communications in discussion channels.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 4 */}
            <section id="ip" className="scroll-mt-28 bg-surface border border-border-subtle rounded-3xl p-6 sm:p-8 shadow-xs">
              <h2 className="text-lg font-bold text-primary mb-3 flex items-center gap-2">
                <FileText size={18} className="text-accent-blue-dark" />
                4. Course Content & Intellectual Property
              </h2>
              <p>
                All educational materials, video lessons, syllabi, coding exercises, quizzes, and multimedia assets published on LearnSpace remain the intellectual property of LearnSpace or their respective contributing instructors.
              </p>
              <p className="mt-3">
                Enrolled learners are granted a personal, revocable, non-exclusive, non-transferable license to view and interact with course materials solely for personal learning. You may not reproduce, resell, scrape, broadcast, or redistribute course contents without express written consent.
              </p>
            </section>

            {/* Section 5 */}
            <section id="enrollment" className="scroll-mt-28 bg-surface border border-border-subtle rounded-3xl p-6 sm:p-8 shadow-xs">
              <h2 className="text-lg font-bold text-primary mb-3 flex items-center gap-2">
                <Clock size={18} className="text-accent-blue-dark" />
                5. Course Enrollment & Progress Tracking
              </h2>
              <p>
                Enrollment grants access to course lessons, lecture materials, and discussion boards for the duration specified by the course catalog. The Platform logs lesson completion and module progression automatically to calculate accurate course completion percentages.
              </p>
            </section>

            {/* Section 6 */}
            <section id="assessments" className="scroll-mt-28 bg-surface border border-border-subtle rounded-3xl p-6 sm:p-8 shadow-xs">
              <h2 className="text-lg font-bold text-primary mb-3 flex items-center gap-2">
                <Award size={18} className="text-accent-sage-dark" />
                6. Assignments, Assessments & Verified Certificates
              </h2>
              <p>
                To qualify for a digital certificate of completion, students must achieve the minimum passing grade set by the instructor across all mandatory assignments, quizzes, and course modules.
              </p>
              <p className="mt-3">
                Certificates generated through LearnSpace bear a unique verification identifier and timestamp. Any attempt to alter, forge, or falsely claim a certificate invalidates the credential.
              </p>
            </section>

            {/* Section 7 */}
            <section id="acceptable-use" className="scroll-mt-28 bg-surface border border-border-subtle rounded-3xl p-6 sm:p-8 shadow-xs">
              <h2 className="text-lg font-bold text-primary mb-3 flex items-center gap-2">
                <AlertCircle size={18} className="text-rose-600" />
                7. Acceptable Use & Prohibited Activities
              </h2>
              <p>When utilizing LearnSpace, users agree NOT to:</p>
              <ul className="list-disc pl-5 space-y-1.5 mt-2 text-xs">
                <li>Upload malicious files, viruses, malware, or executables through assignment or profile upload forms.</li>
                <li>Harass, abuse, defame, or intimidate other students, instructors, or platform administrators.</li>
                <li>Attempt to bypass authentication mechanisms, rate limiters, or access unauthorized user data.</li>
                <li>Submit spam messages through public course review or contact channels.</li>
              </ul>
            </section>

            {/* Section 8 */}
            <section id="termination" className="scroll-mt-28 bg-surface border border-border-subtle rounded-3xl p-6 sm:p-8 shadow-xs">
              <h2 className="text-lg font-bold text-primary mb-3 flex items-center gap-2">
                <AlertCircle size={18} className="text-amber-600" />
                8. Account Suspension & Termination
              </h2>
              <p>
                We reserve the right to suspend or terminate accounts that breach these Terms, engage in fraudulent behavior, or compromise platform integrity. Users may request account deactivation at any time by contacting support.
              </p>
            </section>

            {/* Section 9 */}
            <section id="contact" className="scroll-mt-28 bg-surface border border-border-subtle rounded-3xl p-6 sm:p-8 shadow-xs">
              <h2 className="text-lg font-bold text-primary mb-3 flex items-center gap-2">
                <HelpCircle size={18} className="text-accent-blue-dark" />
                9. Questions & Contact Information
              </h2>
              <p>
                If you have questions, feedback, or concerns regarding these Terms and Conditions, please reach out through our official contact channels:
              </p>
              <div className="mt-4 p-4 rounded-xl bg-surface-subtle border border-border-subtle flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div>
                  <p className="font-bold text-primary">LearnSpace Support Team</p>
                  <p className="text-secondary">Official Inquiries: support@learnspace.io</p>
                </div>
                <Link
                  to="/contact"
                  className="px-4 py-2 rounded-xl bg-primary text-white font-semibold hover:bg-neutral-800 transition-colors"
                >
                  Contact Support Page
                </Link>
              </div>
            </section>
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

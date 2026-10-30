import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Lock,
  Database,
  Eye,
  Camera,
  Award,
  Bell,
  Trash2,
  Mail,
  ArrowLeft,
  FileCheck,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import AuthModal from '../components/AuthModal';

export default function PrivacyPage() {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authRole, setAuthRole] = useState('student');

  const handleOpenAuth = (role = 'student') => {
    setAuthRole(role === 'instructor' ? 'instructor' : 'student');
    setAuthModalOpen(true);
  };

  const lastUpdated = 'October 29, 2026';

  const sections = [
    { id: 'collection', title: '1. Information We Collect' },
    { id: 'avatars', title: '2. Profile Pictures & Cloud Storage' },
    { id: 'learning-data', title: '3. Learning Records & Submissions' },
    { id: 'usage', title: '4. How We Use Information' },
    { id: 'protection', title: '5. Data Security & Storage' },
    { id: 'sharing', title: '6. Data Sharing & Disclosure' },
    { id: 'rights', title: '7. Your Privacy Rights & Retention' },
    { id: 'contact', title: '8. Contact Data Privacy Officer' },
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-sage-pale text-accent-sage-dark text-xs font-bold uppercase tracking-wider mb-3">
            <Lock size={13} strokeWidth={1.75} />
            <span>Privacy & Data Protection</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-primary tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-sm text-secondary mt-2 max-w-2xl leading-relaxed">
            LearnSpace is committed to safeguarding your personal data and ensuring transparent educational data processing practices.
          </p>
          <div className="flex items-center gap-4 mt-4 text-xs text-tertiary">
            <span>Last Updated: {lastUpdated}</span>
            <span>&bull;</span>
            <span>Compliance: Privacy by Design</span>
          </div>
        </div>

        {/* Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
          {/* Table of Contents */}
          <aside className="lg:col-span-1 hidden lg:block">
            <div className="sticky top-24 bg-surface border border-border-subtle rounded-2xl p-4 shadow-xs">
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
          </aside>

          {/* Legal Body */}
          <div className="lg:col-span-3 space-y-10 text-sm leading-relaxed text-secondary">
            {/* Section 1 */}
            <section id="collection" className="scroll-mt-28 bg-surface border border-border-subtle rounded-3xl p-6 sm:p-8 shadow-xs">
              <h2 className="text-lg font-bold text-primary mb-3 flex items-center gap-2">
                <Database size={18} className="text-accent-blue-dark" />
                1. Information We Collect
              </h2>
              <p>
                When you create an account or interact with LearnSpace, we collect personal information strictly necessary to provide an authentic learning experience:
              </p>
              <ul className="list-disc pl-5 space-y-2 mt-3 text-xs">
                <li>
                  <strong>Account Details:</strong> Full name, verified email address, role (Student, Instructor, Administrator), and cryptographically salted password hashes.
                </li>
                <li>
                  <strong>Enrollment & Progress:</strong> Courses in which you enroll, lessons completed, time spent, quiz attempts, and overall completion percentages.
                </li>
                <li>
                  <strong>Interactive Content:</strong> Course reviews and star ratings, questions submitted in course discussion threads, and direct support inquiries.
                </li>
                <li>
                  <strong>Technical Data:</strong> IP address, device browser type, and secure HttpOnly cookie tokens used solely for maintaining your authenticated session.
                </li>
              </ul>
            </section>

            {/* Section 2 */}
            <section id="avatars" className="scroll-mt-28 bg-surface border border-border-subtle rounded-3xl p-6 sm:p-8 shadow-xs">
              <h2 className="text-lg font-bold text-primary mb-3 flex items-center gap-2">
                <Camera size={18} className="text-accent-sage-dark" />
                2. Profile Pictures & Cloud Storage
              </h2>
              <p>
                Users have the optional ability to upload a personalized profile picture. Profile images are validated for permissible formats (JPG, JPEG, PNG, WebP) and processed securely via Cloudinary.
              </p>
              <p className="mt-2 text-xs">
                When you replace or remove your profile picture, the previous cloud asset is purged from active cloud storage, and your account reverts to standard system initials. We do not use profile images for automated facial recognition or external marketing.
              </p>
            </section>

            {/* Section 3 */}
            <section id="learning-data" className="scroll-mt-28 bg-surface border border-border-subtle rounded-3xl p-6 sm:p-8 shadow-xs">
              <h2 className="text-lg font-bold text-primary mb-3 flex items-center gap-2">
                <Award size={18} className="text-accent-blue-dark" />
                3. Learning Records, Submissions & Certificates
              </h2>
              <p>
                Student assignment submissions (including attached PDF documents, code files, or image uploads) are stored securely and accessible only to the enrolled student and the authorized course instructor.
              </p>
              <p className="mt-2 text-xs">
                Certificates generated upon successful course completion record your name, course title, completion date, and a cryptographic verification code so employers and institutions can authenticate your credential.
              </p>
            </section>

            {/* Section 4 */}
            <section id="usage" className="scroll-mt-28 bg-surface border border-border-subtle rounded-3xl p-6 sm:p-8 shadow-xs">
              <h2 className="text-lg font-bold text-primary mb-3 flex items-center gap-2">
                <Eye size={18} className="text-accent-sage-dark" />
                4. How We Use Your Information
              </h2>
              <ul className="list-disc pl-5 space-y-1.5 mt-2 text-xs">
                <li>To authenticate your identity and provide role-specific dashboards.</li>
                <li>To dispatch critical course notifications and assignment deadline reminders.</li>
                <li>To calculate aggregate course statistics and learner progress milestones.</li>
                <li>To detect and protect against fraud, malicious uploads, and platform abuse.</li>
              </ul>
            </section>

            {/* Section 5 */}
            <section id="protection" className="scroll-mt-28 bg-surface border border-border-subtle rounded-3xl p-6 sm:p-8 shadow-xs">
              <h2 className="text-lg font-bold text-primary mb-3 flex items-center gap-2">
                <ShieldCheck size={18} className="text-accent-blue-dark" />
                5. Data Security & Storage
              </h2>
              <p>
                We employ industry-standard organizational and technical safeguards:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 text-xs">
                <div className="p-3 bg-surface-subtle rounded-xl border border-border-subtle">
                  <span className="font-bold text-primary block">HttpOnly Cookie Tokens</span>
                  <span className="text-tertiary">Prevents cross-site scripting (XSS) credential theft.</span>
                </div>
                <div className="p-3 bg-surface-subtle rounded-xl border border-border-subtle">
                  <span className="font-bold text-primary block">Bcrypt Password Hashing</span>
                  <span className="text-tertiary">Ensures passwords can never be read in plain text.</span>
                </div>
                <div className="p-3 bg-surface-subtle rounded-xl border border-border-subtle">
                  <span className="font-bold text-primary block">Encrypted Transit (SSL/TLS)</span>
                  <span className="text-tertiary">All browser-server communication is encrypted in transit.</span>
                </div>
                <div className="p-3 bg-surface-subtle rounded-xl border border-border-subtle">
                  <span className="font-bold text-primary block">Magic Byte Verification</span>
                  <span className="text-tertiary">Ensures uploaded files match their declared MIME types.</span>
                </div>
              </div>
            </section>

            {/* Section 6 */}
            <section id="sharing" className="scroll-mt-28 bg-surface border border-border-subtle rounded-3xl p-6 sm:p-8 shadow-xs">
              <h2 className="text-lg font-bold text-primary mb-3 flex items-center gap-2">
                <Lock size={18} className="text-accent-blue-dark" />
                6. Data Sharing & Third Parties
              </h2>
              <p>
                LearnSpace will <strong>never sell, lease, or monetize</strong> your personal information to third-party data brokers or advertisers. Data is shared strictly with essential infrastructure service providers (e.g., MongoDB database hosting and Cloudinary media delivery) bound by strict confidentiality covenants.
              </p>
            </section>

            {/* Section 7 */}
            <section id="rights" className="scroll-mt-28 bg-surface border border-border-subtle rounded-3xl p-6 sm:p-8 shadow-xs">
              <h2 className="text-lg font-bold text-primary mb-3 flex items-center gap-2">
                <Trash2 size={18} className="text-rose-600" />
                7. Your Privacy Rights & Data Retention
              </h2>
              <p>
                You retain complete control over your personal learning data:
              </p>
              <ul className="list-disc pl-5 space-y-1 mt-2 text-xs">
                <li>You may update your profile details and change password at any time.</li>
                <li>You may remove your profile picture anytime to restore the default avatar.</li>
                <li>You may request complete export or deletion of your student account and records by emailing support.</li>
              </ul>
            </section>

            {/* Section 8 */}
            <section id="contact" className="scroll-mt-28 bg-surface border border-border-subtle rounded-3xl p-6 sm:p-8 shadow-xs">
              <h2 className="text-lg font-bold text-primary mb-3 flex items-center gap-2">
                <Mail size={18} className="text-accent-blue-dark" />
                8. Contact Data Privacy Officer
              </h2>
              <p>
                For data access requests, privacy concerns, or questions regarding our processing practices, please reach out to our team:
              </p>
              <div className="mt-4 p-4 rounded-xl bg-surface-subtle border border-border-subtle flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div>
                  <p className="font-bold text-primary">Privacy & Compliance Desk</p>
                  <p className="text-secondary">Direct Email: support@learnspace.io</p>
                </div>
                <Link
                  to="/contact"
                  className="px-4 py-2 rounded-xl bg-primary text-white font-semibold hover:bg-neutral-800 transition-colors"
                >
                  Visit Contact Page
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

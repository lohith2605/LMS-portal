import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Mail, Clock } from 'lucide-react';
import BrandLogo from './ui/BrandLogo';
import { SocialIcon } from './ui/SocialIcons';
import { SOCIAL_LINKS, CONTACT_INFO } from '../config/socialLinks';

const CURRENT_YEAR = new Date().getFullYear();

export default function Footer({ onOpenAuth, brandName = 'LearnSpace' }) {
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  const scrollToSection = (e, sectionId) => {
    if (!isHomePage) return; // Allow normal link navigation when not on home page
    e.preventDefault();
    const element = document.getElementById(sectionId);
    if (element) {
      const navOffset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - navOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }
  };

  return (
    <footer
      className="bg-surface border-t border-border-subtle pt-14 md:pt-16 pb-10 text-primary transition-colors duration-200"
      aria-label="Platform Footer"
    >
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 w-full">
        {/* Main Footer Multi-Column Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-10 pb-12 border-b border-border-subtle">
          {/* Column 1: Brand & About (Spans 4 columns on large screens) */}
          <div className="sm:col-span-2 lg:col-span-4 flex flex-col gap-4">
            <div>
              <BrandLogo
                to="/"
                size="sm"
                brandName={brandName}
                ariaLabel={`${brandName} Home`}
              />
            </div>
            <p className="text-xs text-secondary leading-relaxed max-w-sm">
              LearnSpace is a full-stack learning platform helping students and instructors access structured courses, interactive assignments, assessments, and verified completion credentials.
            </p>

            {/* Social Media Channels */}
            <div className="pt-2">
              <div className="mb-2.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-secondary">
                  Connect With Us
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap" role="list" aria-label="Social media links">
                {SOCIAL_LINKS.map((social) => {
                  const isConfigured = Boolean(social.url);

                  if (isConfigured) {
                    return (
                      <a
                        key={social.id}
                        href={social.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={`${social.name}: ${social.handle || social.name}`}
                        aria-label={`${social.ariaLabel}${social.handle ? ` (${social.handle})` : ''}`}
                        className="group relative w-8 h-8 rounded-xl bg-surface-subtle border border-border-subtle flex items-center justify-center text-secondary hover:text-primary hover:border-primary/40 hover:bg-surface-elevated transition-all shadow-2xs hover-lift focus:outline-none focus:ring-2 focus:ring-accent"
                      >
                        <SocialIcon platform={social.id} size={15} />
                        {social.handle && (
                          <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-150 bg-neutral-900 text-white text-[10px] font-medium py-0.5 px-2 rounded-md whitespace-nowrap shadow-md z-20">
                            {social.handle}
                          </span>
                        )}
                      </a>
                    );
                  }

                  // Non-configured placeholder link (inactive, informative)
                  return (
                    <button
                      key={social.id}
                      type="button"
                      disabled
                      title={`${social.name}: ${social.placeholderNote || 'Official handle pending configuration'}`}
                      aria-label={`${social.name} (Official link pending configuration)`}
                      className="w-8 h-8 rounded-xl bg-surface-subtle/40 border border-border-subtle/50 flex items-center justify-center text-tertiary cursor-not-allowed opacity-60"
                    >
                      <SocialIcon platform={social.id} size={15} />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Column 2: Quick Navigation (Spans 2 columns) */}
          <div className="lg:col-span-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-4">
              Explore
            </h4>
            <ul className="list-none flex flex-col gap-2.5 p-0 m-0">
              <li>
                <Link
                  to="/#courses"
                  onClick={(e) => scrollToSection(e, 'courses')}
                  className="text-xs text-secondary hover:text-primary transition-colors cursor-pointer"
                >
                  Browse Courses
                </Link>
              </li>
              <li>
                <Link
                  to="/#categories"
                  onClick={(e) => scrollToSection(e, 'categories')}
                  className="text-xs text-secondary hover:text-primary transition-colors cursor-pointer"
                >
                  Course Categories
                </Link>
              </li>
              <li>
                <Link
                  to="/#journey"
                  onClick={(e) => scrollToSection(e, 'journey')}
                  className="text-xs text-secondary hover:text-primary transition-colors cursor-pointer"
                >
                  Learning Journey
                </Link>
              </li>
              <li>
                <Link
                  to="/#features"
                  onClick={(e) => scrollToSection(e, 'features')}
                  className="text-xs text-secondary hover:text-primary transition-colors cursor-pointer"
                >
                  Platform Features
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Platform Access & Educators (Spans 3 columns) */}
          <div className="lg:col-span-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-4">
              Access & Portals
            </h4>
            <ul className="list-none flex flex-col gap-2.5 p-0 m-0">
              <li>
                <button
                  type="button"
                  onClick={() => onOpenAuth ? onOpenAuth('login') : null}
                  className="text-xs text-secondary hover:text-primary transition-colors bg-transparent border-none p-0 text-left cursor-pointer"
                >
                  Student Login
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenAuth ? onOpenAuth('register') : null}
                  className="text-xs text-secondary hover:text-primary transition-colors bg-transparent border-none p-0 text-left cursor-pointer"
                >
                  Student Registration
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenAuth ? onOpenAuth('instructor') : null}
                  className="text-xs text-secondary hover:text-primary transition-colors bg-transparent border-none p-0 text-left cursor-pointer"
                >
                  Instructor Cohort Access
                </button>
              </li>
              <li>
                <span className="inline-flex items-center gap-1.5 text-xs text-tertiary cursor-default">
                  System Status: Operational
                </span>
              </li>
            </ul>
          </div>

          {/* Column 4: Legal & Contact (Spans 3 columns) */}
          <div className="lg:col-span-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-4">
              Legal & Support
            </h4>
            <ul className="list-none flex flex-col gap-2.5 p-0 m-0">
              <li>
                <Link
                  to="/terms"
                  className="text-xs text-secondary hover:text-primary transition-colors cursor-pointer inline-flex items-center gap-1"
                >
                  <span>Terms and Conditions</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/privacy"
                  className="text-xs text-secondary hover:text-primary transition-colors cursor-pointer inline-flex items-center gap-1"
                >
                  <span>Privacy Policy</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/contact"
                  className="text-xs text-secondary hover:text-primary transition-colors cursor-pointer inline-flex items-center gap-1"
                >
                  <span>Contact Support Team</span>
                </Link>
              </li>
              <li className="pt-2 border-t border-border-subtle/60 text-xs text-tertiary space-y-1">
                <div className="flex items-center gap-1.5">
                  <Mail size={13} className="text-secondary shrink-0" />
                  <a
                    href={`mailto:${CONTACT_INFO.supportEmail}`}
                    className="hover:text-primary transition-colors truncate"
                  >
                    {CONTACT_INFO.supportEmail}
                  </a>
                </div>
                <div className="flex items-center gap-1.5 text-[11px]">
                  <Clock size={12} className="shrink-0" />
                  <span>Mon – Fri &bull; 9 AM – 6 PM UTC</span>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Utility Bar: Copyright & Compliance */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-tertiary gap-4">
          <div className="text-center sm:text-left">
            &copy; {CURRENT_YEAR} {brandName}. All rights reserved. Built for structured, verified learning.
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <Link to="/terms" className="hover:text-primary transition-colors">
              Terms
            </Link>
            <span>&bull;</span>
            <Link to="/privacy" className="hover:text-primary transition-colors">
              Privacy
            </Link>
            <span>&bull;</span>
            <Link to="/contact" className="hover:text-primary transition-colors">
              Contact
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

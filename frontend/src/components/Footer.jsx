import React from 'react';

const CURRENT_YEAR = new Date().getFullYear();

export default function Footer({ onOpenAuth, brandName = 'LearnSpace' }) {
  const scrollToSection = (e, sectionId) => {
    e.preventDefault();
    const element = document.getElementById(sectionId);
    if (element) {
      const navOffset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - navOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  return (
    <footer className="bg-page border-t border-border-subtle pt-14 md:pt-16 pb-12" aria-label="Page Footer">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 w-full">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr] gap-8 md:gap-10 mb-12">
          {/* Brand Info */}
          <div className="sm:col-span-2 lg:col-span-1 flex flex-col gap-4 max-w-full lg:max-w-[320px]">
            <div className="flex items-center gap-2 text-base font-bold text-primary">
              <span className="w-7 h-7 bg-primary text-white rounded-lg flex items-center justify-center text-[13px] font-extrabold tracking-tighter shadow-xs" aria-hidden="true">
                L
              </span>
              <span>{brandName}</span>
            </div>
            <p className="text-xs text-secondary leading-relaxed">
              A modern learning management system bringing students, instructors, structured courses, assignments, and certificates together in one thoughtfully designed platform.
            </p>
          </div>

          {/* Navigation Links */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-4">Navigation</h4>
            <ul className="list-none flex flex-col gap-3">
              <li>
                <button
                  type="button"
                  className="text-xs text-secondary hover:text-primary transition-colors bg-transparent border-none p-0 text-left cursor-pointer"
                  onClick={(e) => scrollToSection(e, 'courses')}
                >
                  Explore Courses
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="text-xs text-secondary hover:text-primary transition-colors bg-transparent border-none p-0 text-left cursor-pointer"
                  onClick={(e) => scrollToSection(e, 'categories')}
                >
                  Categories
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="text-xs text-secondary hover:text-primary transition-colors bg-transparent border-none p-0 text-left cursor-pointer"
                  onClick={(e) => scrollToSection(e, 'journey')}
                >
                  How It Works
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="text-xs text-secondary hover:text-primary transition-colors bg-transparent border-none p-0 text-left cursor-pointer"
                  onClick={(e) => scrollToSection(e, 'features')}
                >
                  Platform Features
                </button>
              </li>
            </ul>
          </div>

          {/* For Educators */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-4">Educators</h4>
            <ul className="list-none flex flex-col gap-3">
              <li>
                <button
                  type="button"
                  className="text-xs text-secondary hover:text-primary transition-colors bg-transparent border-none p-0 text-left cursor-pointer"
                  onClick={(e) => scrollToSection(e, 'instructors')}
                >
                  For Instructors
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="text-xs text-secondary hover:text-primary transition-colors bg-transparent border-none p-0 text-left cursor-pointer"
                  onClick={() => onOpenAuth('instructor')}
                >
                  Instructor Cohort Access
                </button>
              </li>
              <li>
                <span className="inline-flex items-center gap-1.5 text-xs text-tertiary cursor-default">
                  Curriculum Guidelines (Coming Soon)
                </span>
              </li>
            </ul>
          </div>

          {/* Access & Account */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-4">Platform Access</h4>
            <ul className="list-none flex flex-col gap-3">
              <li>
                <button
                  type="button"
                  className="text-xs text-secondary hover:text-primary transition-colors bg-transparent border-none p-0 text-left cursor-pointer"
                  onClick={() => onOpenAuth('login')}
                >
                  Student Log In
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="text-xs text-secondary hover:text-primary transition-colors bg-transparent border-none p-0 text-left cursor-pointer"
                  onClick={() => onOpenAuth('register')}
                >
                  Get Started / Early Access
                </button>
              </li>
              <li>
                <span className="inline-flex items-center gap-1.5 text-xs text-tertiary cursor-default">
                  System Status: Operational
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom copyright & attribution */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pt-8 border-t border-border-subtle text-xs text-tertiary gap-4">
          <div>
            © {CURRENT_YEAR} {brandName}. Built for structured, measurable learning.
          </div>
          <div className="flex items-center gap-3">
            <span>Light Theme First</span>
            <span>•</span>
            <span>WCAG Accessible</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

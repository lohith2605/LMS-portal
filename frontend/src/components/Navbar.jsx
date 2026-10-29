import React, { useState, useEffect } from 'react';
import { Menu, X, ArrowUpRight, LogOut, LayoutDashboard, ShieldCheck } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import ThemeToggle from './ThemeToggle';

export default function Navbar({ onOpenAuth, brandName = 'LearnSpace' }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const getDashboardPath = () => {
    if (!user) return '/dashboard';
    if (user.role === 'admin') return '/admin/dashboard';
    if (user.role === 'instructor') return '/instructor/dashboard';
    return '/student/dashboard';
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  const handleNavClick = (e, targetId) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    const element = document.getElementById(targetId);
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
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-150 border-b ${
        isScrolled
          ? 'bg-surface/95 border-border-medium shadow-xs backdrop-blur-md'
          : 'bg-page/90 border-border-subtle backdrop-blur-md'
      }`}
    >
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 h-[72px] flex items-center justify-between">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-3 no-underline text-primary font-bold text-lg tracking-tight" aria-label={`${brandName} Home`}>
          <div className="w-8 h-8 bg-primary text-white rounded-lg flex items-center justify-center text-[15px] font-extrabold tracking-tighter shadow-xs" aria-hidden="true">L</div>
          <span>{brandName}</span>
          <span className="text-[11px] font-semibold uppercase tracking-wider px-[7px] py-[2px] rounded-full bg-accent-sage-pale text-accent-sage-dark">Platform</span>
        </Link>

        {/* Desktop Nav Items */}
        <nav aria-label="Main Navigation">
          <ul className="hidden md:flex items-center gap-8 list-none">
            <li>
              <a
                href="#courses"
                className="text-sm font-medium text-secondary hover:text-primary transition-colors py-1.5 focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-4 rounded-xs"
                onClick={(e) => handleNavClick(e, 'courses')}
              >
                Explore Courses
              </a>
            </li>
            <li>
              <a
                href="#categories"
                className="text-sm font-medium text-secondary hover:text-primary transition-colors py-1.5 focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-4 rounded-xs"
                onClick={(e) => handleNavClick(e, 'categories')}
              >
                Categories
              </a>
            </li>
            <li>
              <a
                href="#journey"
                className="text-sm font-medium text-secondary hover:text-primary transition-colors py-1.5 focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-4 rounded-xs"
                onClick={(e) => handleNavClick(e, 'journey')}
              >
                How It Works
              </a>
            </li>
            <li>
              <a
                href="#instructors"
                className="text-sm font-medium text-secondary hover:text-primary transition-colors py-1.5 focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-4 rounded-xs"
                onClick={(e) => handleNavClick(e, 'instructors')}
              >
                For Instructors
              </a>
            </li>
          </ul>
        </nav>

        {/* Action CTAs */}
        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />

          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <Link
                to={getDashboardPath()}
                className="inline-flex items-center gap-1.5 text-xs font-semibold bg-primary text-white hover:bg-[#2b2b2b] px-3.5 py-2 rounded-xl shadow-xs transition-all"
              >
                <LayoutDashboard size={14} />
                <span>Dashboard</span>
              </Link>
              <button
                type="button"
                onClick={logout}
                title="Log Out"
                className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-secondary hover:text-primary border border-border-subtle bg-surface px-2.5 py-2 rounded-xl transition-all cursor-pointer"
              >
                <LogOut size={13} />
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700 bg-rose-50/90 hover:bg-rose-100 border border-rose-200/90 px-3 py-2 rounded-xl transition-all cursor-pointer shadow-xs"
                onClick={() => navigate('/login?role=admin')}
              >
                <ShieldCheck size={14} className="text-rose-600" />
                <span>Admin Login</span>
              </button>
              <button
                type="button"
                className="hidden md:inline-flex text-sm font-semibold text-secondary hover:text-primary hover:bg-black/5 px-3.5 py-2 rounded-xl transition-all cursor-pointer"
                onClick={() => (onOpenAuth ? onOpenAuth('login') : navigate('/login'))}
              >
                Log In
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1 text-sm font-semibold bg-primary text-white hover:bg-[#2b2b2b] hover:-translate-y-0.5 px-4.5 py-2.25 rounded-xl shadow-sm transition-all cursor-pointer"
                onClick={() => (onOpenAuth ? onOpenAuth('register') : navigate('/register'))}
              >
                <span>Get Started</span>
                <ArrowUpRight size={15} aria-hidden="true" />
              </button>
            </>
          )}

          {/* Mobile hamburger button */}
          <button
            type="button"
            className="flex md:hidden w-10 h-10 items-center justify-center rounded-xl text-primary border border-border-subtle bg-surface hover:bg-surface-subtle transition-colors cursor-pointer"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Accessible Mobile Drawer */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 top-[72px] bg-black/30 backdrop-blur-xs z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
          role="presentation"
        >
          <div
            className="absolute top-0 inset-x-0 bg-surface border-b border-border-subtle px-6 pt-6 pb-8 shadow-elevated animate-[drawerSlide_220ms_cubic-bezier(0.16,1,0.3,1)]"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Mobile Navigation"
          >
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-border-subtle">
              <span className="text-xs font-bold uppercase tracking-wider text-secondary">Appearance</span>
              <ThemeToggle showLabel />
            </div>

            <ul className="flex flex-col gap-4 list-none mb-6">
              <li>
                <a
                  href="#courses"
                  className="text-base font-medium text-primary block py-2 border-b border-border-subtle"
                  onClick={(e) => handleNavClick(e, 'courses')}
                >
                  Explore Courses
                </a>
              </li>
              <li>
                <a
                  href="#categories"
                  className="text-base font-medium text-primary block py-2 border-b border-border-subtle"
                  onClick={(e) => handleNavClick(e, 'categories')}
                >
                  Categories
                </a>
              </li>
              <li>
                <a
                  href="#journey"
                  className="text-base font-medium text-primary block py-2 border-b border-border-subtle"
                  onClick={(e) => handleNavClick(e, 'journey')}
                >
                  How It Works
                </a>
              </li>
              <li>
                <a
                  href="#instructors"
                  className="text-base font-medium text-primary block py-2 border-b border-border-subtle"
                  onClick={(e) => handleNavClick(e, 'instructors')}
                >
                  For Instructors
                </a>
              </li>
            </ul>

            <div className="flex flex-col gap-3">
              {isAuthenticated ? (
                <>
                  <Link
                    to={getDashboardPath()}
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full py-2.5 px-4 text-sm font-semibold rounded-xl bg-primary text-white hover:bg-[#2b2b2b] shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <LayoutDashboard size={16} />
                    <span>Go to Dashboard</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      logout();
                    }}
                    className="w-full py-2.5 px-4 text-sm font-semibold rounded-xl bg-surface text-rose-700 border border-rose-200 hover:bg-rose-50 shadow-xs transition-all text-center cursor-pointer"
                  >
                    Log Out
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="w-full py-2.5 px-4 text-sm font-semibold rounded-xl bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100 shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      navigate('/login?role=admin');
                    }}
                  >
                    <ShieldCheck size={16} className="text-rose-600" />
                    <span>Admin Login</span>
                  </button>
                  <button
                    type="button"
                    className="w-full py-2.5 px-4 text-sm font-semibold rounded-xl bg-surface text-primary border border-border-subtle hover:bg-surface-subtle shadow-xs transition-all text-center cursor-pointer"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      if (onOpenAuth) onOpenAuth('login');
                      else navigate('/login');
                    }}
                  >
                    Log In
                  </button>
                  <button
                    type="button"
                    className="w-full py-2.5 px-4 text-sm font-semibold rounded-xl bg-primary text-white hover:bg-[#2b2b2b] shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      if (onOpenAuth) onOpenAuth('register');
                      else navigate('/register');
                    }}
                  >
                    <span>Get Started</span>
                    <ArrowUpRight size={16} aria-hidden="true" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Menu, X, ArrowUpRight, LogOut, LayoutDashboard, ShieldCheck } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import ThemeToggle from './ThemeToggle';
import BrandLogo from './ui/BrandLogo';

export default function Navbar({ onOpenAuth, brandName = 'LearnSpace' }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false);
  const [_clickCount, setClickCount] = useState(0);
  const clickTimestampsRef = useRef([]);
  const resetTimerRef = useRef(null);
  const adminMenuRef = useRef(null);
  const firstMenuItemRef = useRef(null);

  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const getDashboardPath = () => {
    if (!user) return '/dashboard';
    if (user.role === 'admin') return '/admin/dashboard';
    if (user.role === 'instructor') return '/instructor/dashboard';
    return '/student/dashboard';
  };

  const [activeSection, setActiveSection] = useState('courses');
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, top: 0, width: 0, height: 0, opacity: 0 });
  const navItemRefs = useRef({});
  const isManualScrollRef = useRef(false);
  const scrollTimerRef = useRef(null);

  const navItems = [
    { id: 'courses', label: 'Explore Courses' },
    { id: 'categories', label: 'Categories' },
    { id: 'journey', label: 'How It Works' },
    { id: 'instructors', label: 'For Instructors' },
  ];

  // Update sliding indicator position based on active item DOM bounding box
  const updateIndicator = useCallback(() => {
    const activeEl = navItemRefs.current[activeSection];
    if (activeEl) {
      setIndicatorStyle({
        left: activeEl.offsetLeft,
        top: activeEl.offsetTop,
        width: activeEl.offsetWidth,
        height: activeEl.offsetHeight,
        opacity: 1,
      });
    } else {
      setIndicatorStyle((prev) => ({ ...prev, opacity: 0 }));
    }
  }, [activeSection]);

  useEffect(() => {
    // Initial mount and section updates
    updateIndicator();
  }, [updateIndicator]);

  useEffect(() => {
    window.addEventListener('resize', updateIndicator);
    return () => window.removeEventListener('resize', updateIndicator);
  }, [updateIndicator]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 15);

      // Avoid intermediate scroll updates during smooth programmatic scrolling
      if (isManualScrollRef.current) return;

      const scrollPos = window.scrollY + 140;
      let current = '';

      for (const item of navItems) {
        const element = document.getElementById(item.id);
        if (element) {
          const top = element.offsetTop;
          const height = element.offsetHeight;
          if (scrollPos >= top && scrollPos < top + height) {
            current = item.id;
            break;
          }
        }
      }

      if (current && current !== activeSection) {
        setActiveSection(current);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [activeSection]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, []);

  // Close mobile drawer and admin menu on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (mobileMenuOpen) setMobileMenuOpen(false);
        if (isAdminMenuOpen) {
          setIsAdminMenuOpen(false);
          adminMenuRef.current?.querySelector('a')?.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen, isAdminMenuOpen]);

  // Close admin menu when clicking outside
  useEffect(() => {
    if (!isAdminMenuOpen) return;

    const handleClickOutside = (e) => {
      if (adminMenuRef.current && !adminMenuRef.current.contains(e.target)) {
        setIsAdminMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isAdminMenuOpen]);

  // Close admin menu and reset click state when route changes
  useEffect(() => {
    setIsAdminMenuOpen(false);
    setClickCount(0);
    clickTimestampsRef.current = [];
  }, [location.pathname, location.search]);

  // Auto-focus first menu item for keyboard accessibility when opened
  useEffect(() => {
    if (isAdminMenuOpen && firstMenuItemRef.current) {
      firstMenuItemRef.current.focus();
    }
  }, [isAdminMenuOpen]);

  const handleLogoClick = (e) => {
    // If admin menu is already open, clicking the logo closes it
    if (isAdminMenuOpen) {
      setIsAdminMenuOpen(false);
      setClickCount(0);
      clickTimestampsRef.current = [];
      return;
    }

    const now = Date.now();
    // Keep only timestamps within rolling 3-second (3000ms) window
    const recentClicks = clickTimestampsRef.current.filter((t) => now - t < 3000);
    recentClicks.push(now);
    clickTimestampsRef.current = recentClicks;
    setClickCount(recentClicks.length);

    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
    }

    if (recentClicks.length >= 5) {
      // 5 clicks within 3 seconds reached: prevent default navigation and reveal admin menu
      if (e && e.preventDefault) {
        e.preventDefault();
      }
      if (mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
      setIsAdminMenuOpen(true);
      setClickCount(0);
      clickTimestampsRef.current = [];
      resetTimerRef.current = null;
    } else {
      // Set timer to reset sequence after the 3-second window expires
      const timeRemaining = Math.max(0, 3000 - (now - recentClicks[0]));
      resetTimerRef.current = setTimeout(() => {
        setClickCount(0);
        clickTimestampsRef.current = [];
        resetTimerRef.current = null;
      }, timeRemaining);
    }
  };

  const handleLogoKeyDown = (e) => {
    if (e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      handleLogoClick(e);
    }
  };

  const handleAdminLoginSelect = () => {
    setIsAdminMenuOpen(false);
    navigate('/admin/login');
  };

  const handleNavClick = (e, targetId) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    setActiveSection(targetId);

    // Lock scrollspy detection to prevent bouncing/flickering across sections during smooth scrolling
    isManualScrollRef.current = true;
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = setTimeout(() => {
      isManualScrollRef.current = false;
    }, 850);

    const element = document.getElementById(targetId);
    if (element) {
      const navOffset = 76;
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
      className={`fixed top-0 left-0 right-0 z-50 w-full transition-all duration-200 border-b ${
        isScrolled
          ? 'bg-surface/95 border-border-medium shadow-xs backdrop-blur-md'
          : 'bg-page/90 border-border-subtle backdrop-blur-md'
      }`}
    >
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 h-[72px] flex items-center justify-between">
        {/* Brand with Discreet Admin Trigger */}
        <div className="relative inline-flex items-center" ref={adminMenuRef}>
          <BrandLogo
            to="/"
            size="md"
            brandName={brandName}
            badge="Platform"
            ariaLabel={`${brandName} Home`}
            onClick={handleLogoClick}
            onKeyDown={handleLogoKeyDown}
            ariaExpanded={isAdminMenuOpen}
            ariaHasPopup="menu"
          />

          {/* Discreet Admin Login Dropdown Menu */}
          {isAdminMenuOpen && (
            <div
              role="menu"
              aria-label="Admin Access"
              className="absolute left-0 top-full mt-2.5 z-50 w-52 p-1.5 rounded-2xl bg-surface border border-border-subtle shadow-elevated animate-[modalFadeIn_150ms_ease-out] backdrop-blur-md"
            >
              <div className="px-3 py-1.5 mb-1 border-b border-border-subtle flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-secondary">
                  Restricted Access
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-cobalt animate-pulse" />
              </div>
              <button
                ref={firstMenuItemRef}
                type="button"
                role="menuitem"
                onClick={handleAdminLoginSelect}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl text-primary hover:bg-cobalt-soft hover:text-cobalt active:bg-cobalt/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-cobalt focus-visible:bg-cobalt-soft focus-visible:text-cobalt transition-colors cursor-pointer text-left"
              >
                <div className="w-6 h-6 rounded-lg bg-cobalt-soft text-cobalt flex items-center justify-center shrink-0 border border-cobalt-border/30">
                  <ShieldCheck size={14} className="text-cobalt" aria-hidden="true" />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold leading-tight">Admin Login</span>
                  <span className="text-[10px] text-secondary font-normal">Platform governance</span>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Desktop Nav Items with Silky-Smooth Gliding Indicator */}
        <nav aria-label="Main Navigation">
          <ul className="hidden md:flex items-center list-none p-1 rounded-full bg-surface-subtle/80 border border-border-subtle/70 backdrop-blur-xs relative select-none">
            {/* Smooth Gliding Active Pill Indicator */}
            <div
              className="absolute rounded-full bg-accent-subtle border border-accent/35 shadow-2xs pointer-events-none transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
              style={{
                left: `${indicatorStyle.left}px`,
                top: `${indicatorStyle.top}px`,
                width: `${indicatorStyle.width}px`,
                height: `${indicatorStyle.height}px`,
                opacity: indicatorStyle.opacity,
              }}
              aria-hidden="true"
            />

            {navItems.map((item) => {
              const isActive = activeSection === item.id;
              return (
                <li
                  key={item.id}
                  ref={(el) => {
                    navItemRefs.current[item.id] = el;
                  }}
                  className="relative z-10"
                >
                  <a
                    href={`#${item.id}`}
                    onClick={(e) => handleNavClick(e, item.id)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`inline-flex items-center justify-center text-xs font-semibold px-4 py-1.5 rounded-full transition-colors duration-250 cursor-pointer ${
                      isActive
                        ? 'text-accent'
                        : 'text-secondary hover:text-primary hover:bg-surface-subtle/50'
                    }`}
                  >
                    <span>{item.label}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Action CTAs */}
        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />

          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <Link
                to={getDashboardPath()}
                className="inline-flex items-center gap-1.5 text-xs font-semibold bg-cobalt text-white hover:bg-cobalt-hover active:bg-cobalt-pressed px-3.5 py-2 rounded-xl shadow-xs transition-all"
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
                className="hidden md:inline-flex text-sm font-semibold text-secondary hover:text-primary hover:bg-black/5 px-3.5 py-2 rounded-xl transition-all cursor-pointer"
                onClick={() => (onOpenAuth ? onOpenAuth('login') : navigate('/login'))}
              >
                Log In
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1 text-sm font-semibold bg-cobalt text-white hover:bg-cobalt-hover active:bg-cobalt-pressed hover:-translate-y-0.5 px-4.5 py-2.25 rounded-xl shadow-sm shadow-cobalt/20 transition-all cursor-pointer"
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

            <ul className="flex flex-col gap-2 list-none mb-6">
              {navItems.map((item) => {
                const isActive = activeSection === item.id;
                return (
                  <li key={item.id}>
                    <a
                      href={`#${item.id}`}
                      onClick={(e) => handleNavClick(e, item.id)}
                      className={`flex items-center justify-between text-sm font-semibold px-3.5 py-2.5 rounded-xl border transition-all ${
                        isActive
                          ? 'bg-accent-subtle text-accent border-accent/30'
                          : 'text-primary hover:text-primary hover:bg-surface-subtle border-transparent'
                      }`}
                    >
                      <span>{item.label}</span>
                      {isActive && (
                        <span className="w-1.5 h-1.5 rounded-full bg-accent animate-live-pulse" />
                      )}
                    </a>
                  </li>
                );
              })}
            </ul>

            <div className="flex flex-col gap-3">
              {isAuthenticated ? (
                <>
                  <Link
                    to={getDashboardPath()}
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full py-2.5 px-4 text-sm font-semibold rounded-xl bg-cobalt text-white hover:bg-cobalt-hover active:bg-cobalt-pressed shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
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
                    className="w-full py-2.5 px-4 text-sm font-semibold rounded-xl bg-cobalt text-white hover:bg-cobalt-hover active:bg-cobalt-pressed shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      if (onOpenAuth) onOpenAuth('register');
                      else navigate('/register');
                    }}
                  >
                    <span>Get Started</span>
                    <ArrowUpRight size={16} aria-hidden="true" />
                  </button>

                  <div className="pt-2 text-center border-t border-border-subtle/50">
                    <Link
                      to="/admin/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="inline-flex items-center gap-1.5 text-xs text-secondary hover:text-cobalt transition-colors"
                    >
                      <ShieldCheck size={13} className="text-cobalt" aria-hidden="true" />
                      <span>Admin Portal</span>
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

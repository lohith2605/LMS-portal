import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ScrollToTop
 *
 * Automatically resets window and container scroll positions to top
 * whenever the user navigates to a different route across the LMS platform.
 *
 * Guarantees that legal pages (Terms, Cookies, Privacy), public pages,
 * and authenticated routes always start at the top when navigated to from
 * footers, navbars, or links elsewhere on the site.
 *
 * Honors intentional in-page anchor links (e.g., #courses, #acceptance)
 * and preserves scroll state during modal interactions, course player
 * lesson browsing, and dashboard tab switching.
 */
export default function ScrollToTop() {
  const location = useLocation();
  const prevPathnameRef = useRef(null);

  // Set browser scroll restoration to manual so the browser does not
  // asynchronously restore previous scroll coordinates on client-side route changes.
  useEffect(() => {
    if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  useEffect(() => {
    const isDifferentRoute =
      prevPathnameRef.current !== null && prevPathnameRef.current !== location.pathname;
    const isInitialMount = prevPathnameRef.current === null;
    prevPathnameRef.current = location.pathname;

    // Only reset scroll when navigating to a different route or on initial mount
    if (!isDifferentRoute && !isInitialMount) {
      return;
    }

    // Do not interfere with intentional in-page anchor navigation (e.g. /#courses or /terms#acceptance)
    if (location.hash) {
      const targetId = location.hash.replace('#', '');
      const targetElement = document.getElementById(targetId);
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth' });
      }
      return;
    }

    // Standard route navigation: scroll window, document, and scrollable layout containers to top
    const resetScroll = () => {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'instant',
      });

      if (document.documentElement) {
        document.documentElement.scrollTop = 0;
      }
      if (document.body) {
        document.body.scrollTop = 0;
      }

      // Check whether any pages use separate scrollable containers (e.g. AuthLayout, CoursePlayer)
      const scrollableContainers = document.querySelectorAll(
        'main.overflow-y-auto, main.overflow-auto, [data-scrollable="true"]'
      );
      scrollableContainers.forEach((container) => {
        container.scrollTop = 0;
      });
    };

    // Execute immediately
    resetScroll();

    // Also execute on the next animation frame to guarantee proper position after DOM rendering
    const rafId = requestAnimationFrame(resetScroll);

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [location.pathname, location.hash]);

  return null;
}

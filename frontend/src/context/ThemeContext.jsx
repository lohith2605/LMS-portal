import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ThemeContext } from './themeContextInstance';
import { isCategoryAllowed, onConsentChange } from '../utils/cookieConsent';

const STORAGE_KEY = 'learnspace-theme';

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'light' || saved === 'dark') return saved;
      if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    } catch {
      // Fallback in case of storage restrictions
    }
    return 'light';
  });

  const applyTheme = useCallback((newTheme) => {
    const validTheme = newTheme === 'dark' ? 'dark' : 'light';
    setThemeState(validTheme);
    try {
      if (isCategoryAllowed('preferences')) {
        localStorage.setItem(STORAGE_KEY, validTheme);
      }
    } catch {
      // ignore
    }
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', validTheme);
      document.documentElement.style.colorScheme = validTheme;
      document.documentElement.classList.toggle('dark', validTheme === 'dark');
    }
  }, []);

  const toggleTheme = useCallback(() => {
    applyTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, applyTheme]);

  useEffect(() => {
    // Synchronize document attributes on mount
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.style.colorScheme = theme;
    document.documentElement.classList.toggle('dark', theme === 'dark');

    // Listen for OS system theme changes if user hasn't explicitly set a preference
    const mediaQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
    const handleSystemThemeChange = (e) => {
      try {
        if (!localStorage.getItem(STORAGE_KEY)) {
          applyTheme(e.matches ? 'dark' : 'light');
        }
      } catch {
        // ignore
      }
    };

    if (mediaQuery?.addEventListener) {
      mediaQuery.addEventListener('change', handleSystemThemeChange);
      return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
    }
  }, [theme, applyTheme]);

  // Listen for consent change: if preferences are rejected, clean up saved theme key from storage
  useEffect(() => {
    const unsubscribe = onConsentChange((consent) => {
      if (consent && !consent.categories?.preferences) {
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch {
          // ignore
        }
      }
    });
    return unsubscribe;
  }, []);

  const value = useMemo(
    () => ({
      theme,
      isDark: theme === 'dark',
      toggleTheme,
      setTheme: applyTheme,
    }),
    [theme, toggleTheme, applyTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

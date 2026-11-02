import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  getStoredConsent,
  acceptAll,
  rejectOptional,
  saveCustomPreferences,
  onConsentChange,
  COOKIE_CATEGORIES,
} from '../utils/cookieConsent';

const CookieConsentContext = createContext(null);

export function CookieConsentProvider({ children }) {
  const [consent, setConsent] = useState(() => getStoredConsent());
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [isBannerOpen, setIsBannerOpen] = useState(false);

  // Synchronize state and determine initial banner visibility on mount
  useEffect(() => {
    const current = getStoredConsent();
    setConsent(current);
    if (!current) {
      setIsBannerOpen(true);
    }

    // Subscribe to any consent updates (e.g. from other tabs or programmatic calls)
    const unsubscribe = onConsentChange((updatedConsent) => {
      setConsent(updatedConsent);
      if (updatedConsent) {
        setIsBannerOpen(false);
      }
    });

    return unsubscribe;
  }, []);

  const handleAcceptAll = useCallback(() => {
    const newConsent = acceptAll();
    setConsent(newConsent);
    setIsBannerOpen(false);
    setIsPreferencesOpen(false);
  }, []);

  const handleRejectOptional = useCallback(() => {
    const newConsent = rejectOptional();
    setConsent(newConsent);
    setIsBannerOpen(false);
    setIsPreferencesOpen(false);
  }, []);

  const handleSaveCustom = useCallback((categories) => {
    const newConsent = saveCustomPreferences(categories);
    setConsent(newConsent);
    setIsBannerOpen(false);
    setIsPreferencesOpen(false);
  }, []);

  const openPreferences = useCallback(() => {
    setIsPreferencesOpen(true);
  }, []);

  const closePreferences = useCallback(() => {
    setIsPreferencesOpen(false);
  }, []);

  const value = useMemo(
    () => ({
      consent,
      hasConsented: Boolean(consent),
      isBannerOpen,
      isPreferencesOpen,
      openPreferences,
      closePreferences,
      acceptAll: handleAcceptAll,
      rejectOptional: handleRejectOptional,
      saveCustomPreferences: handleSaveCustom,
      categories: COOKIE_CATEGORIES,
    }),
    [
      consent,
      isBannerOpen,
      isPreferencesOpen,
      openPreferences,
      closePreferences,
      handleAcceptAll,
      handleRejectOptional,
      handleSaveCustom,
    ],
  );

  return (
    <CookieConsentContext.Provider value={value}>
      {children}
    </CookieConsentContext.Provider>
  );
}

export function useCookieConsent() {
  const context = useContext(CookieConsentContext);
  if (!context) {
    throw new Error('useCookieConsent must be used within a CookieConsentProvider');
  }
  return context;
}

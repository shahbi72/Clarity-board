'use client'

import * as React from 'react'
import {
  DEFAULT_LANGUAGE,
  isLanguageCode,
  LANGUAGE_STORAGE_KEY,
  type LanguageCode,
} from '@/lib/language'

interface LanguageContextValue {
  language: LanguageCode
  setLanguage: (language: LanguageCode) => void
}

const LanguageContext = React.createContext<LanguageContextValue | undefined>(undefined)

function applyDocumentLanguage(language: LanguageCode) {
  document.documentElement.lang = language
  document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr'
}

function readStoredLanguage(): LanguageCode {
  try {
    const value = window.localStorage.getItem(LANGUAGE_STORAGE_KEY)
    return isLanguageCode(value) ? value : DEFAULT_LANGUAGE
  } catch {
    return DEFAULT_LANGUAGE
  }
}

function persistLanguage(language: LanguageCode) {
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
  } catch {
    // Ignore write failures (e.g. privacy mode); preference still applies for current session.
  }
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = React.useState<LanguageCode>(DEFAULT_LANGUAGE)

  React.useEffect(() => {
    const initialLanguage = readStoredLanguage()
    setLanguageState(initialLanguage)
    applyDocumentLanguage(initialLanguage)
  }, [])

  const setLanguage = React.useCallback((nextLanguage: LanguageCode) => {
    setLanguageState(nextLanguage)
    applyDocumentLanguage(nextLanguage)
    persistLanguage(nextLanguage)
  }, [])

  const value = React.useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage,
    }),
    [language, setLanguage]
  )

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguagePreference(): LanguageContextValue {
  const context = React.useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguagePreference must be used within a LanguageProvider')
  }

  return context
}

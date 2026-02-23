'use client'

import * as React from 'react'
import { NextIntlClientProvider, type AbstractIntlMessages } from 'next-intl'
import arMessages from '@/messages/ar.json'
import deMessages from '@/messages/de.json'
import enMessages from '@/messages/en.json'
import trMessages from '@/messages/tr.json'
import {
  DEFAULT_LANGUAGE,
  getLanguageDirection,
  isLanguageCode,
  LANGUAGE_COOKIE_KEY,
  LANGUAGE_STORAGE_KEY,
  type LanguageCode,
} from '@/lib/language'

interface LanguageContextValue {
  language: LanguageCode
  setLanguage: (language: LanguageCode) => void
  t: (key: string) => string
}

const LanguageContext = React.createContext<LanguageContextValue | undefined>(undefined)

const LANGUAGE_MESSAGES: Record<LanguageCode, AbstractIntlMessages> = {
  en: enMessages,
  tr: trMessages,
  de: deMessages,
  ar: arMessages,
}

function translateMessage(messages: AbstractIntlMessages, key: string): string {
  if (!key) return ''

  const resolved = key.split('.').reduce<unknown>((current, part) => {
    if (!current || typeof current !== 'object') return null
    return (current as Record<string, unknown>)[part]
  }, messages)

  return typeof resolved === 'string' ? resolved : key
}

function applyDocumentLanguage(language: LanguageCode) {
  document.documentElement.lang = language
  document.documentElement.dir = getLanguageDirection(language)
}

function readStoredLanguage(): LanguageCode | null {
  try {
    const value = window.localStorage.getItem(LANGUAGE_STORAGE_KEY)
    return isLanguageCode(value) ? value : null
  } catch {
    return null
  }
}

function readLanguageFromDocument(): LanguageCode {
  if (typeof document === 'undefined') return DEFAULT_LANGUAGE
  const value = document.documentElement.lang || null
  return isLanguageCode(value) ? value : DEFAULT_LANGUAGE
}

function readInitialLanguage(): LanguageCode {
  const storedLanguage = readStoredLanguage()
  if (storedLanguage) {
    return storedLanguage
  }

  return readLanguageFromDocument()
}

function persistLanguageCookie(language: LanguageCode) {
  try {
    document.cookie = `${LANGUAGE_COOKIE_KEY}=${language}; path=/; max-age=31536000; samesite=lax`
  } catch {
    // Ignore cookie write failures in restricted environments.
  }
}

function persistLanguage(language: LanguageCode) {
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
  } catch {
    // Ignore write failures (e.g. privacy mode); preference still applies for current session.
  }

  persistLanguageCookie(language)
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = React.useState<LanguageCode>(DEFAULT_LANGUAGE)
  const messages = React.useMemo(() => LANGUAGE_MESSAGES[language], [language])

  React.useEffect(() => {
    const initialLanguage = readInitialLanguage()
    setLanguageState(initialLanguage)
    applyDocumentLanguage(initialLanguage)
    persistLanguageCookie(initialLanguage)
  }, [])

  const setLanguage = React.useCallback((nextLanguage: LanguageCode) => {
    setLanguageState(nextLanguage)
    applyDocumentLanguage(nextLanguage)
    persistLanguage(nextLanguage)
  }, [])

  const t = React.useCallback(
    (key: string) => {
      return translateMessage(messages, key)
    },
    [messages]
  )

  const value = React.useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage,
      t,
    }),
    [language, setLanguage, t]
  )

  return (
    <LanguageContext.Provider value={value}>
      <NextIntlClientProvider locale={language} messages={messages}>
        {children}
      </NextIntlClientProvider>
    </LanguageContext.Provider>
  )
}

export function useLanguagePreference(): LanguageContextValue {
  const context = React.useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguagePreference must be used within a LanguageProvider')
  }

  return context
}

export function useI18n(): Pick<LanguageContextValue, 'language' | 't'> {
  const { language, t } = useLanguagePreference()
  return { language, t }
}

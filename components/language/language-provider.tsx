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

async function persistLanguageToProfile(language: LanguageCode): Promise<void> {
  try {
    await fetch('/api/profile', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ language }),
    })
  } catch {
    // Ignore API/network failures; UI state remains responsive.
  }
}

type LanguageProviderProps = {
  children: React.ReactNode
  initialLanguage?: LanguageCode
}

export function LanguageProvider({
  children,
  initialLanguage = DEFAULT_LANGUAGE,
}: LanguageProviderProps) {
  const [language, setLanguageState] = React.useState<LanguageCode>(initialLanguage)
  const messages = React.useMemo(() => LANGUAGE_MESSAGES[language], [language])

  React.useEffect(() => {
    setLanguageState(initialLanguage)
  }, [initialLanguage])

  React.useEffect(() => {
    applyDocumentLanguage(language)
    persistLanguage(language)
  }, [language])

  const setLanguage = React.useCallback((nextLanguage: LanguageCode) => {
    setLanguageState(nextLanguage)
    void persistLanguageToProfile(nextLanguage)
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

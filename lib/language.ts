export const LANGUAGE_STORAGE_KEY = 'clarityboard.language'
export const LANGUAGE_COOKIE_KEY = 'clarityboard.locale'

export const LANGUAGE_OPTIONS = [
  { code: 'en', label: 'English' },
  { code: 'tr', label: 'Turkish' },
  { code: 'de', label: 'German' },
  { code: 'ar', label: 'Arabic' },
] as const

export type LanguageCode = (typeof LANGUAGE_OPTIONS)[number]['code']

export const DEFAULT_LANGUAGE: LanguageCode = 'en'

export function isLanguageCode(value: string | null): value is LanguageCode {
  return LANGUAGE_OPTIONS.some((option) => option.code === value)
}

export function getLanguageDirection(language: LanguageCode): 'ltr' | 'rtl' {
  return language === 'ar' ? 'rtl' : 'ltr'
}

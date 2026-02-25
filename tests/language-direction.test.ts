import { describe, expect, it } from 'vitest'
import { getLanguageDirection } from '@/lib/language'

describe('getLanguageDirection', () => {
  it('returns rtl for Arabic', () => {
    expect(getLanguageDirection('ar')).toBe('rtl')
  })

  it('returns ltr for non-Arabic locales', () => {
    expect(getLanguageDirection('en')).toBe('ltr')
    expect(getLanguageDirection('de')).toBe('ltr')
    expect(getLanguageDirection('tr')).toBe('ltr')
  })
})

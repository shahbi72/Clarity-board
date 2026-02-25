import { DEFAULT_LANGUAGE, isLanguageCode, type LanguageCode } from '@/lib/language'

export const COMPANY_SIZE_OPTIONS = [
  { value: '1-10', label: '1-10' },
  { value: '11-50', label: '11-50' },
  { value: '51-200', label: '51-200' },
  { value: '201-500', label: '201-500' },
  { value: '500+', label: '500+' },
] as const

export type CompanySize = (typeof COMPANY_SIZE_OPTIONS)[number]['value']

export type ProfileRecordShape = {
  first_name: string | null
  last_name: string | null
  company_name: string | null
  company_size: string | null
  language: string | null
}

export interface UserProfile {
  firstName: string
  lastName: string
  companyName: string
  companySize: CompanySize | ''
  language: LanguageCode
}

export interface ProfileUpdateInput {
  firstName?: string | null
  lastName?: string | null
  companyName?: string | null
  companySize?: string | null
  language?: string | null
}

const PROFILE_TEXT_MAX_LENGTH = 120

function toNormalizedString(value: string | null | undefined): string {
  if (!value) return ''
  return value.trim()
}

function normalizeTextField(value: string | null | undefined): string | null {
  const normalized = toNormalizedString(value)
  if (!normalized) return null
  return normalized.slice(0, PROFILE_TEXT_MAX_LENGTH)
}

export function isCompanySize(value: string | null | undefined): value is CompanySize {
  return COMPANY_SIZE_OPTIONS.some((option) => option.value === value)
}

export function normalizeLanguage(value: string | null | undefined): LanguageCode {
  const language = value ?? null
  return isLanguageCode(language) ? language : DEFAULT_LANGUAGE
}

export function toUserProfile(record: ProfileRecordShape | null | undefined): UserProfile {
  const firstName = toNormalizedString(record?.first_name)
  const lastName = toNormalizedString(record?.last_name)
  const companyName = toNormalizedString(record?.company_name)
  const companySize = isCompanySize(record?.company_size) ? record.company_size : ''
  const language = normalizeLanguage(record?.language)

  return {
    firstName,
    lastName,
    companyName,
    companySize,
    language,
  }
}

export function isProfileComplete(
  profile:
    | Pick<UserProfile, 'firstName' | 'lastName' | 'companyName' | 'companySize' | 'language'>
    | ProfileRecordShape
    | null
    | undefined
): boolean {
  if (!profile) return false

  const normalized =
    'first_name' in profile
      ? toUserProfile(profile)
      : {
          firstName: toNormalizedString(profile.firstName),
          lastName: toNormalizedString(profile.lastName),
          companyName: toNormalizedString(profile.companyName),
          companySize: profile.companySize,
          language: normalizeLanguage(profile.language),
        }

  return Boolean(
    normalized.firstName &&
      normalized.lastName &&
      normalized.companyName &&
      normalized.companySize &&
      isCompanySize(normalized.companySize) &&
      isLanguageCode(normalized.language)
  )
}

export function normalizeProfileUpdate(input: ProfileUpdateInput): {
  first_name?: string | null
  last_name?: string | null
  company_name?: string | null
  company_size?: CompanySize | null
  language?: LanguageCode
} {
  const payload: {
    first_name?: string | null
    last_name?: string | null
    company_name?: string | null
    company_size?: CompanySize | null
    language?: LanguageCode
  } = {}

  if ('firstName' in input) {
    payload.first_name = normalizeTextField(input.firstName)
  }
  if ('lastName' in input) {
    payload.last_name = normalizeTextField(input.lastName)
  }
  if ('companyName' in input) {
    payload.company_name = normalizeTextField(input.companyName)
  }
  if ('companySize' in input) {
    payload.company_size = isCompanySize(input.companySize) ? input.companySize : null
  }
  if ('language' in input) {
    payload.language = normalizeLanguage(input.language)
  }

  return payload
}

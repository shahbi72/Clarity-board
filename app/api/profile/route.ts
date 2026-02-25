import { NextResponse } from 'next/server'
import { isLanguageCode } from '@/lib/language'
import { isCompanySize, type ProfileUpdateInput } from '@/lib/profile'
import { getErrorMessage, HttpError } from '@/lib/server/http-error'
import { getCurrentProfile, updateCurrentProfile } from '@/lib/server/profile'

export const dynamic = 'force-dynamic'

function parseOptionalStringField(
  source: Record<string, unknown>,
  key: string
): string | null | undefined {
  if (!(key in source)) return undefined
  const value = source[key]
  if (value === null) return null
  if (typeof value !== 'string') {
    throw new HttpError(400, `Invalid "${key}" value.`)
  }
  return value
}

function parsePatchBody(body: unknown): ProfileUpdateInput {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new HttpError(400, 'Invalid profile payload.')
  }

  const input = body as Record<string, unknown>
  const update: ProfileUpdateInput = {}

  const firstName = parseOptionalStringField(input, 'firstName')
  if (firstName !== undefined) update.firstName = firstName

  const lastName = parseOptionalStringField(input, 'lastName')
  if (lastName !== undefined) update.lastName = lastName

  const companyName = parseOptionalStringField(input, 'companyName')
  if (companyName !== undefined) update.companyName = companyName

  const companySize = parseOptionalStringField(input, 'companySize')
  if (companySize !== undefined) {
    if (companySize !== null && !isCompanySize(companySize)) {
      throw new HttpError(400, 'Invalid company size.')
    }
    update.companySize = companySize
  }

  const language = parseOptionalStringField(input, 'language')
  if (language !== undefined) {
    if (language !== null && !isLanguageCode(language)) {
      throw new HttpError(400, 'Invalid language.')
    }
    update.language = language
  }

  if (Object.keys(update).length === 0) {
    throw new HttpError(400, 'No profile fields were provided.')
  }

  return update
}

export async function GET() {
  try {
    const result = await getCurrentProfile()
    return NextResponse.json({
      profile: result.profile,
      email: result.user.email ?? '',
      isComplete: result.isComplete,
    })
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500
    return NextResponse.json({ error: getErrorMessage(error) }, { status })
  }
}

export async function PATCH(request: Request) {
  try {
    const payload = parsePatchBody(await request.json())
    const result = await updateCurrentProfile(payload)
    return NextResponse.json({
      profile: result.profile,
      email: result.user.email ?? '',
      isComplete: result.isComplete,
    })
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500
    return NextResponse.json({ error: getErrorMessage(error) }, { status })
  }
}

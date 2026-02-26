import { NextResponse } from 'next/server'
import { getErrorMessage, HttpError } from '@/lib/server/http-error'
import { ensureProfileInitializedForCurrentUser } from '@/lib/server/profile'

export async function POST() {
  try {
    await ensureProfileInitializedForCurrentUser()
    return NextResponse.json({ success: true })
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500
    return NextResponse.json({ error: getErrorMessage(error) }, { status })
  }
}

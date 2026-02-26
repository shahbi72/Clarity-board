import { NextResponse } from 'next/server'
import { requireAdminApiAccess } from '@/lib/server/admin'
import { listAdminUsers } from '@/lib/server/admin-users'
import { getErrorMessage, HttpError } from '@/lib/server/http-error'

export async function GET() {
  try {
    await requireAdminApiAccess()
    const users = await listAdminUsers()
    return NextResponse.json({ users })
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500
    return NextResponse.json({ error: getErrorMessage(error) }, { status })
  }
}

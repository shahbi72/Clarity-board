import { redirect } from 'next/navigation'
import { HttpError } from '@/lib/server/http-error'
import { getSupabaseServerClient, isSupabaseAuthConfigured } from '@/lib/supabase/server'

const ADMIN_ROLE = 'admin'

type ProfileRoleResult = {
  userId: string
  role: string | null
}

export async function getCurrentUserRole(): Promise<ProfileRoleResult> {
  if (!isSupabaseAuthConfigured()) {
    throw new HttpError(500, 'Supabase auth configuration is required.')
  }

  const supabase = await getSupabaseServerClient()
  if (!supabase) {
    throw new HttpError(500, 'Authentication provider is unavailable.')
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    throw new HttpError(401, 'Authentication required.')
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle<{ role: string | null }>()

  if (profileError) {
    throw new HttpError(500, profileError.message)
  }

  return {
    userId: user.id,
    role: profile?.role ?? null,
  }
}

export async function requireAdminApiAccess(): Promise<{ userId: string }> {
  const profile = await getCurrentUserRole()
  if (profile.role !== ADMIN_ROLE) {
    throw new HttpError(403, 'Admin access required.')
  }

  return { userId: profile.userId }
}

export async function requireAdminPageAccess(redirectPath = '/dashboard'): Promise<{ userId: string }> {
  try {
    const profile = await getCurrentUserRole()
    if (profile.role !== ADMIN_ROLE) {
      redirect(redirectPath)
    }

    return { userId: profile.userId }
  } catch {
    redirect(redirectPath)
  }
}

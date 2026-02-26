import type { PostgrestError, SupabaseClient, User } from '@supabase/supabase-js'
import {
  isProfileComplete,
  normalizeProfileUpdate,
  toUserProfile,
  type ProfileRecordShape,
  type ProfileUpdateInput,
  type UserProfile,
} from '@/lib/profile'
import { HttpError } from '@/lib/server/http-error'
import { getSupabaseServerClient, isSupabaseAuthConfigured } from '@/lib/supabase/server'

export type ProfileResult = {
  user: User
  profile: UserProfile
  isComplete: boolean
}

type ProfileRow = ProfileRecordShape & { user_id: string }

function isNoRowsError(error: PostgrestError | null): boolean {
  return Boolean(error && error.code === 'PGRST116')
}

async function requireSupabaseClient(): Promise<SupabaseClient> {
  if (!isSupabaseAuthConfigured()) {
    throw new HttpError(500, 'Supabase auth is not configured.')
  }

  const supabase = await getSupabaseServerClient()
  if (!supabase) {
    throw new HttpError(500, 'Supabase auth is unavailable.')
  }

  return supabase
}

async function requireAuthenticatedUser(supabase: SupabaseClient): Promise<User> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    throw new HttpError(401, 'Authentication required.')
  }

  return user
}

export async function ensureProfileInitializedForCurrentUser(): Promise<void> {
  const supabase = await requireSupabaseClient()
  const user = await requireAuthenticatedUser(supabase)

  const { error } = await supabase.from('profiles').upsert(
    {
      user_id: user.id,
      role: 'user',
    },
    {
      onConflict: 'user_id',
      ignoreDuplicates: true,
    }
  )

  if (error) {
    throw new HttpError(500, error.message)
  }
}

async function readProfileRow(
  supabase: SupabaseClient,
  userId: string
): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('user_id, first_name, last_name, company_name, company_size, language')
    .eq('user_id', userId)
    .maybeSingle<ProfileRow>()

  if (error && !isNoRowsError(error)) {
    throw new HttpError(500, error.message)
  }

  return data ?? null
}

export async function getCurrentProfile(): Promise<ProfileResult> {
  const supabase = await requireSupabaseClient()
  const user = await requireAuthenticatedUser(supabase)
  const row = await readProfileRow(supabase, user.id)

  const profile = toUserProfile(row)
  return {
    user,
    profile,
    isComplete: isProfileComplete(profile),
  }
}

export async function updateCurrentProfile(update: ProfileUpdateInput): Promise<ProfileResult> {
  const supabase = await requireSupabaseClient()
  const user = await requireAuthenticatedUser(supabase)
  const normalizedUpdate = normalizeProfileUpdate(update)

  const payload: Partial<ProfileRow> & { user_id: string } = {
    user_id: user.id,
    ...normalizedUpdate,
  }

  const { data, error } = await supabase
    .from('profiles')
    .upsert(payload, { onConflict: 'user_id' })
    .select('user_id, first_name, last_name, company_name, company_size, language')
    .single<ProfileRow>()

  if (error) {
    throw new HttpError(500, error.message)
  }

  const profile = toUserProfile(data)
  return {
    user,
    profile,
    isComplete: isProfileComplete(profile),
  }
}

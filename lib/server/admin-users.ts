import { HttpError } from '@/lib/server/http-error'
import { getSupabaseServiceRoleClient } from '@/lib/supabase/admin'

export type AdminUserListItem = {
  userId: string
  firstName: string | null
  lastName: string | null
  companyName: string | null
  companySize: string | null
  language: string | null
  role: string
  createdAt: string
  updatedAt: string
}

type ProfileRow = {
  user_id: string
  first_name: string | null
  last_name: string | null
  company_name: string | null
  company_size: string | null
  language: string | null
  role: string | null
  created_at: string
  updated_at: string
}

export async function listAdminUsers(): Promise<AdminUserListItem[]> {
  const supabase = getSupabaseServiceRoleClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('user_id, first_name, last_name, company_name, company_size, language, role, created_at, updated_at')
    .order('created_at', { ascending: false })

  if (error) {
    throw new HttpError(500, error.message)
  }

  return ((data as ProfileRow[] | null) ?? []).map((row) => ({
    userId: row.user_id,
    firstName: row.first_name,
    lastName: row.last_name,
    companyName: row.company_name,
    companySize: row.company_size,
    language: row.language,
    role: row.role?.trim() || 'user',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))
}

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let serviceRoleClient: SupabaseClient | null = null

function getSupabaseServiceRoleConfig() {
  const supabaseUrl = process.env.SUPABASE_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? ''

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase service role is not configured.')
  }

  return { supabaseUrl, serviceRoleKey }
}

export function getSupabaseServiceRoleClient(): SupabaseClient {
  if (serviceRoleClient) {
    return serviceRoleClient
  }

  const { supabaseUrl, serviceRoleKey } = getSupabaseServiceRoleConfig()
  serviceRoleClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  return serviceRoleClient
}

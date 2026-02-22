import { createServerClient, type CookieOptions } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { getSupabaseConfig, isSupabaseAuthConfigured } from '@/lib/supabase/config'

export async function getSupabaseServerClient(): Promise<SupabaseClient | null> {
  if (!isSupabaseAuthConfigured()) {
    return null
  }

  const cookieStore = await cookies()
  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig()

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch {
          // No-op when called from a read-only context.
        }
      },
    },
  })
}

export { isSupabaseAuthConfigured }

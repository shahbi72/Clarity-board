'use client'

import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseConfig, isSupabaseAuthConfigured } from '@/lib/supabase/config'

let browserClient: SupabaseClient | null = null

export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (!isSupabaseAuthConfigured()) {
    return null
  }

  if (!browserClient) {
    const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig()
    browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey)
  }

  return browserClient
}

export function isSupabaseBrowserAuthConfigured(): boolean {
  return isSupabaseAuthConfigured()
}

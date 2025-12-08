import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'

export function createClient(): SupabaseClient<Database> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      '@supabase/ssr: Your project\'s URL and API key are required to create a Supabase client!\n' +
      'Check your Supabase project\'s API settings to find these values\n' +
      'https://supabase.com/dashboard/project/_/settings/api'
    )
  }

  return createBrowserClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      auth: {
        // Keep session alive even when app is not focused
        persistSession: true,
        // Disable auto-refresh when tab is hidden (prevents disconnects)
        autoRefreshToken: true,
        // Detect session in URL for OAuth flows
        detectSessionInUrl: true,
        // Store session in localStorage (more persistent than sessionStorage)
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      },
    }
  )
}

// Server-side authentication utilities
import { createClient } from '@/lib/supabase/server'
import type { UserRole } from '@/types/auth.types'

/**
 * Get current session (server-side only)
 */
export async function getCurrentSession() {
  const supabase = await createClient()

  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return null
  }

  const firebaseUid = session.user.id

  // Check Developer
  const { data: developer, error: devError } = await supabase
    .from('developer')
    .select('*')
    .eq('firebase_uid', firebaseUid)
    .single()

  if (developer && !devError) {
    return { user: developer as any, role: 'Developer' as UserRole }
  }

  // Check Admin
  const { data: admin, error: adminError } = await supabase
    .from('admin')
    .select('*, enterprise:enterprise_id(*)')
    .eq('firebase_uid', firebaseUid)
    .eq('is_active', true)
    .single()

  if (admin && !adminError) {
    return {
      user: admin as any,
      role: 'Admin' as UserRole,
      enterprise: (admin as any).enterprise
    }
  }

  return null
}

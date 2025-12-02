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

  const email = session.user.email

  if (!email) {
    return null
  }

  // Check Super Admin
  const { data: superAdmin, error: superAdminError } = await supabase
    .from('super_admin')
    .select('*')
    .eq('email', email)
    .single()

  if (superAdmin && !superAdminError) {
    return { user: superAdmin as any, role: 'Developer' as UserRole }
  }

  // Check Admin
  const { data: admin, error: adminError } = await supabase
    .from('admin')
    .select('*, enterprise!admin_id(*)')
    .eq('email', email)
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

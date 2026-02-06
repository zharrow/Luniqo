'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

/**
 * Supprime définitivement le compte d'un Owner et toutes ses données associées
 * - Enterprise (cascade vers nurseries, rooms, sessions, etc.)
 * - Profile
 * - Auth user
 */
export async function deleteOwnerAccount(ownerId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    // Vérifier que l'utilisateur connecté est bien le owner
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.id !== ownerId) {
      return { success: false, error: 'Non autorisé' }
    }

    // Vérifier que c'est bien un Owner
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', ownerId)
      .single() as { data: { role: string } | null }

    if (!profile || profile.role !== 'Owner') {
      return { success: false, error: 'Seuls les propriétaires peuvent supprimer leur compte' }
    }

    // Créer un client admin pour supprimer le user auth
    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // 1. Supprimer l'enterprise (cascade supprimera nurseries, rooms, sessions, etc.)
    const { error: enterpriseError } = await supabase
      .from('enterprise')
      .delete()
      .eq('owner_id', ownerId)

    if (enterpriseError) {
      console.error('Erreur suppression enterprise:', enterpriseError)
      // Continuer même si pas d'entreprise (owner sans enterprise)
    }

    // 2. Supprimer le profile
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', ownerId)

    if (profileError) {
      console.error('Erreur suppression profile:', profileError)
      return { success: false, error: 'Erreur lors de la suppression du profil' }
    }

    // 3. Supprimer le user auth via admin client
    const { error: authError } = await adminClient.auth.admin.deleteUser(ownerId)

    if (authError) {
      console.error('Erreur suppression auth user:', authError)
      return { success: false, error: 'Erreur lors de la suppression du compte d\'authentification' }
    }

    return { success: true }
  } catch (error) {
    console.error('Erreur deleteOwnerAccount:', error)
    return { success: false, error: 'Une erreur inattendue est survenue' }
  }
}

import { createClient } from '@/lib/supabase/client'

/**
 * Default task categories for new enterprises
 * These categories are created automatically when a new enterprise is set up
 */
export const DEFAULT_TASK_CATEGORIES = [
  { name: 'Sols', color: '#84cc16', description: 'Nettoyage des sols et revêtements' },
  { name: 'Hygiène', color: '#b5ead7', description: 'Désinfection et hygiène des surfaces' },
  { name: 'Sanitaires', color: '#5a9dc9', description: 'Entretien des sanitaires et toilettes' },
  { name: 'Entretien', color: '#f4c2c2', description: 'Entretien général des locaux' },
  { name: 'Vitres', color: '#c6def1', description: 'Nettoyage des vitres et miroirs' },
  { name: 'Cuisine', color: '#ffe5b4', description: 'Nettoyage de la cuisine et équipements' },
  { name: 'Extérieur', color: '#a8e6cf', description: 'Entretien des espaces extérieurs' },
  { name: 'Gestion', color: '#e2cff4', description: 'Tâches administratives et inventaire' }
]

/**
 * Create default task categories for an enterprise
 * @param enterpriseId - The enterprise ID to create categories for
 * @returns Array of created categories
 */
export async function createDefaultCategories(enterpriseId: string) {
  const supabase: any = createClient()

  const categories = DEFAULT_TASK_CATEGORIES.map(cat => ({
    name: cat.name,
    color: cat.color,
    enterprise_id: enterpriseId,
    is_active: true
  }))

  const { data, error } = await supabase
    .from('task_category')
    .insert(categories)
    .select()

  if (error) {
    console.error('Error creating default categories:', error)
    throw error
  }

  return data
}

/**
 * Check if an enterprise has any task categories
 * @param enterpriseId - The enterprise ID to check
 * @returns True if the enterprise has categories, false otherwise
 */
export async function hasCategories(enterpriseId: string): Promise<boolean> {
  const supabase: any = createClient()

  const { count, error } = await supabase
    .from('task_category')
    .select('*', { count: 'exact', head: true })
    .eq('enterprise_id', enterpriseId)

  if (error) {
    console.error('Error checking for categories:', error)
    return false
  }

  return (count || 0) > 0
}

/**
 * Ensure an enterprise has default categories
 * Creates them if they don't exist
 * @param enterpriseId - The enterprise ID
 * @returns Array of categories (newly created or existing)
 */
export async function ensureDefaultCategories(enterpriseId: string) {
  const exists = await hasCategories(enterpriseId)

  if (!exists) {
    console.log(`Creating default categories for enterprise ${enterpriseId}`)
    return await createDefaultCategories(enterpriseId)
  }

  // Return existing categories
  const supabase: any = createClient()
  const { data } = await supabase
    .from('task_category')
    .select('*')
    .eq('enterprise_id', enterpriseId)
    .order('name')

  return data || []
}

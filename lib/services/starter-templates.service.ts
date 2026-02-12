/**
 * Service pour appliquer les templates de démarrage
 *
 * Ce service gère la création en masse des pièces, catégories de tâches
 * et tâches pré-définies pour les nouvelles crèches.
 */

import { createClient } from '@/lib/supabase/client'
import {
  getStarterPackById,
  DEFAULT_SECTIONS,
  DEFAULT_TASK_CATEGORIES,
  DEFAULT_TASKS
} from '@/lib/constants/starter-templates'

export interface ApplyTemplateResult {
  success: boolean
  sectionsCreated: number
  roomsCreated: number
  categoriesCreated: number
  tasksCreated: number
  error?: string
}

export const starterTemplatesService = {
  /**
   * Applique un pack de démarrage complet à une nouvelle crèche
   *
   * @param packId - ID du pack à appliquer ('micro-creche', 'creche-collective', 'minimal')
   * @param nurseryId - ID de la nursery (pour les pièces)
   * @param enterpriseId - ID de l'enterprise (pour les tâches/catégories)
   */
  async applyStarterPack(
    packId: string,
    nurseryId: string,
    enterpriseId: string
  ): Promise<ApplyTemplateResult> {
    const pack = getStarterPackById(packId)

    if (!pack) {
      return {
        success: false,
        sectionsCreated: 0,
        roomsCreated: 0,
        categoriesCreated: 0,
        tasksCreated: 0,
        error: `Pack "${packId}" non trouvé`
      }
    }

    const supabase = createClient()
    let sectionsCreated = 0
    let roomsCreated = 0
    let categoriesCreated = 0
    let tasksCreated = 0

    try {
      // 1. Créer les sections (liées à la nursery)
      if (pack.sections.length > 0) {
        // Vérifier les sections existantes
        const { data: existingSections } = await supabase
          .from('section')
          .select('name')
          .eq('nursery_id', nurseryId)

        const existingSectionNames = new Set(existingSections?.map((s: any) => s.name) || [])

        // Filtrer les sections qui n'existent pas encore
        const sectionsToCreate = pack.sections.filter(
          section => !existingSectionNames.has(section.name)
        )

        if (sectionsToCreate.length > 0) {
          const sectionsToInsert = sectionsToCreate.map(section => ({
            nursery_id: nurseryId,
            name: section.name,
            code: section.code,
            age_min_months: section.age_min_months,
            age_max_months: section.age_max_months,
            capacity: section.capacity,
            color_hex: section.color_hex,
            display_order: section.display_order,
            is_active: true
          }))

          const { data: createdSections, error: sectionsError } = await supabase
            .from('section')
            .insert(sectionsToInsert as any)
            .select('id')

          if (sectionsError) {
            console.error('Erreur création sections:', sectionsError)
            throw new Error(`Erreur lors de la création des sections: ${sectionsError.message}`)
          }

          sectionsCreated = createdSections?.length || 0
        }
      }

      // 3. Créer les pièces (liées à la nursery)
      if (pack.rooms.length > 0) {
        const roomsToInsert = pack.rooms.map(room => ({
          nursery_id: nurseryId,
          name: room.name,
          description: room.description,
          display_order: room.display_order,
          is_active: true
        }))

        const { data: createdRooms, error: roomsError } = await supabase
          .from('room')
          .insert(roomsToInsert as any)
          .select('id')

        if (roomsError) {
          console.error('Erreur création pièces:', roomsError)
          throw new Error(`Erreur lors de la création des pièces: ${roomsError.message}`)
        }

        roomsCreated = createdRooms?.length || 0
      }

      // 4. Vérifier si des catégories existent déjà pour cette enterprise
      const { data: existingCategories } = await supabase
        .from('task_category')
        .select('id, name')
        .eq('enterprise_id', enterpriseId) as { data: { id: string; name: string }[] | null }

      // Créer un map des catégories existantes
      const existingCategoryMap = new Map<string, string>()
      existingCategories?.forEach(cat => {
        existingCategoryMap.set(cat.name, cat.id)
      })

      // Filtrer les catégories qui n'existent pas encore
      const categoriesToCreate = pack.categories.filter(
        cat => !existingCategoryMap.has(cat.name)
      )

      // 5. Créer les nouvelles catégories (liées à l'enterprise)
      if (categoriesToCreate.length > 0) {
        const categoriesInsert = categoriesToCreate.map(cat => ({
          enterprise_id: enterpriseId,
          name: cat.name,
          color: cat.color,
          is_active: true
        }))

        const { data: createdCategories, error: categoriesError } = await supabase
          .from('task_category')
          .insert(categoriesInsert as any)
          .select('id, name') as { data: { id: string; name: string }[] | null; error: any }

        if (categoriesError) {
          console.error('Erreur création catégories:', categoriesError)
          throw new Error(`Erreur lors de la création des catégories: ${categoriesError.message}`)
        }

        // Ajouter les nouvelles catégories au map
        createdCategories?.forEach(cat => {
          existingCategoryMap.set(cat.name, cat.id)
        })

        categoriesCreated = createdCategories?.length || 0
      }

      // 6. Vérifier si des tâches existent déjà pour cette enterprise
      const { data: existingTasks } = await supabase
        .from('task_template')
        .select('name')
        .eq('enterprise_id', enterpriseId) as { data: { name: string }[] | null }

      const existingTaskNames = new Set(existingTasks?.map(t => t.name) || [])

      // Filtrer les tâches qui n'existent pas encore
      const tasksToCreate = pack.tasks.filter(
        task => !existingTaskNames.has(task.name)
      )

      // 7. Créer les nouvelles tâches (liées à l'enterprise via category)
      if (tasksToCreate.length > 0) {
        const tasksInsert = tasksToCreate
          .map(task => {
            const categoryId = existingCategoryMap.get(task.category)
            if (!categoryId) {
              console.warn(`Catégorie "${task.category}" non trouvée pour la tâche "${task.name}"`)
              return null
            }
            return {
              enterprise_id: enterpriseId,
              name: task.name,
              description: task.description || `Tâche de ${task.category.toLowerCase()}`,
              estimated_duration: task.estimated_duration,
              category_id: categoryId,
              is_active: true
            }
          })
          .filter(Boolean) // Enlever les null

        if (tasksInsert.length > 0) {
          const { data: createdTasks, error: tasksError } = await supabase
            .from('task_template')
            .insert(tasksInsert as any)
            .select('id')

          if (tasksError) {
            console.error('Erreur création tâches:', tasksError)
            throw new Error(`Erreur lors de la création des tâches: ${tasksError.message}`)
          }

          tasksCreated = createdTasks?.length || 0
        }
      }

      return {
        success: true,
        sectionsCreated,
        roomsCreated,
        categoriesCreated,
        tasksCreated
      }

    } catch (error: any) {
      console.error('Erreur application pack starter:', error)
      return {
        success: false,
        sectionsCreated,
        roomsCreated,
        categoriesCreated,
        tasksCreated,
        error: error.message || 'Une erreur est survenue'
      }
    }
  },

  /**
   * Applique uniquement les catégories et tâches par défaut
   * (utile pour les packs sans pièces ou ajout ultérieur)
   */
  async applyDefaultTasksOnly(enterpriseId: string): Promise<ApplyTemplateResult> {
    const supabase = createClient()
    let categoriesCreated = 0
    let tasksCreated = 0

    try {
      // Vérifier les catégories existantes
      const { data: existingCategories } = await supabase
        .from('task_category')
        .select('id, name')
        .eq('enterprise_id', enterpriseId) as { data: { id: string; name: string }[] | null }

      const existingCategoryMap = new Map<string, string>()
      existingCategories?.forEach(cat => {
        existingCategoryMap.set(cat.name, cat.id)
      })

      // Créer les catégories manquantes
      const categoriesToCreate = DEFAULT_TASK_CATEGORIES.filter(
        cat => !existingCategoryMap.has(cat.name)
      )

      if (categoriesToCreate.length > 0) {
        const categoriesInsert = categoriesToCreate.map(cat => ({
          enterprise_id: enterpriseId,
          name: cat.name,
          color: cat.color,
          is_active: true
        }))

        const { data: createdCategories, error: categoriesError } = await supabase
          .from('task_category')
          .insert(categoriesInsert as any)
          .select('id, name') as { data: { id: string; name: string }[] | null; error: any }

        if (categoriesError) throw categoriesError

        createdCategories?.forEach(cat => {
          existingCategoryMap.set(cat.name, cat.id)
        })

        categoriesCreated = createdCategories?.length || 0
      }

      // Vérifier les tâches existantes
      const { data: existingTasks } = await supabase
        .from('task_template')
        .select('name')
        .eq('enterprise_id', enterpriseId) as { data: { name: string }[] | null }

      const existingTaskNames = new Set(existingTasks?.map(t => t.name) || [])

      // Créer les tâches manquantes
      const tasksToCreate = DEFAULT_TASKS.filter(
        task => !existingTaskNames.has(task.name)
      )

      if (tasksToCreate.length > 0) {
        const tasksInsert = tasksToCreate
          .map(task => {
            const categoryId = existingCategoryMap.get(task.category)
            if (!categoryId) return null
            return {
              enterprise_id: enterpriseId,
              name: task.name,
              description: task.description || `Tâche de ${task.category.toLowerCase()}`,
              estimated_duration: task.estimated_duration,
              category_id: categoryId,
              is_active: true
            }
          })
          .filter(Boolean)

        if (tasksInsert.length > 0) {
          const { data: createdTasks, error: tasksError } = await supabase
            .from('task_template')
            .insert(tasksInsert as any)
            .select('id')

          if (tasksError) throw tasksError
          tasksCreated = createdTasks?.length || 0
        }
      }

      return {
        success: true,
        sectionsCreated: 0,
        roomsCreated: 0,
        categoriesCreated,
        tasksCreated
      }

    } catch (error: any) {
      console.error('Erreur application tâches par défaut:', error)
      return {
        success: false,
        sectionsCreated: 0,
        roomsCreated: 0,
        categoriesCreated,
        tasksCreated,
        error: error.message || 'Une erreur est survenue'
      }
    }
  },

  /**
   * Applique uniquement les pièces d'un pack à une nursery
   */
  async applyRoomsOnly(packId: string, nurseryId: string): Promise<ApplyTemplateResult> {
    const pack = getStarterPackById(packId)

    if (!pack) {
      return {
        success: false,
        sectionsCreated: 0,
        roomsCreated: 0,
        categoriesCreated: 0,
        tasksCreated: 0,
        error: `Pack "${packId}" non trouvé`
      }
    }

    if (pack.rooms.length === 0) {
      return {
        success: true,
        sectionsCreated: 0,
        roomsCreated: 0,
        categoriesCreated: 0,
        tasksCreated: 0
      }
    }

    const supabase = createClient()

    try {
      const roomsToInsert = pack.rooms.map(room => ({
        nursery_id: nurseryId,
        name: room.name,
        description: room.description,
        display_order: room.display_order,
        is_active: true
      }))

      const { data: createdRooms, error: roomsError } = await supabase
        .from('room')
        .insert(roomsToInsert as any)
        .select('id')

      if (roomsError) throw roomsError

      return {
        success: true,
        sectionsCreated: 0,
        roomsCreated: createdRooms?.length || 0,
        categoriesCreated: 0,
        tasksCreated: 0
      }

    } catch (error: any) {
      console.error('Erreur application pièces:', error)
      return {
        success: false,
        sectionsCreated: 0,
        roomsCreated: 0,
        categoriesCreated: 0,
        tasksCreated: 0,
        error: error.message || 'Une erreur est survenue'
      }
    }
  }
}

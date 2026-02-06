/**
 * Templates de démarrage pour les nouvelles crèches
 *
 * Ces templates permettent aux nouveaux owners de démarrer rapidement
 * avec des pièces et tâches pré-configurées typiques d'une crèche.
 */

// ====================================
// Types
// ====================================

export interface StarterRoom {
  name: string
  description: string
  display_order: number
}

export interface StarterTaskCategory {
  name: string
  color: string
}

export interface StarterTask {
  name: string
  category: string // Référence au nom de la catégorie
  estimated_duration: number // en minutes
  description?: string
}

export interface StarterPack {
  id: string
  name: string
  description: string
  icon: string
  rooms: StarterRoom[]
  categories: StarterTaskCategory[]
  tasks: StarterTask[]
}

// ====================================
// Catégories de tâches (partagées entre tous les packs)
// ====================================

export const DEFAULT_TASK_CATEGORIES: StarterTaskCategory[] = [
  { name: 'Sols', color: '#84cc16' },        // Lime
  { name: 'Hygiène', color: '#b5ead7' },     // Mint (HACCP green)
  { name: 'Sanitaires', color: '#5a9dc9' },  // Blue
  { name: 'Entretien', color: '#f4c2c2' },   // Pink
  { name: 'Vitres', color: '#c6def1' },      // Sky blue
  { name: 'Cuisine', color: '#ffe5b4' },     // Peach
  { name: 'Extérieur', color: '#a8e6cf' },   // Light green
  { name: 'Linge', color: '#e2cff4' },       // Lavender
]

// ====================================
// Tâches de nettoyage courantes
// ====================================

export const DEFAULT_TASKS: StarterTask[] = [
  // Sols
  { name: 'Aspirer les sols', category: 'Sols', estimated_duration: 15 },
  { name: 'Laver les sols', category: 'Sols', estimated_duration: 20 },
  { name: 'Nettoyer les tapis', category: 'Sols', estimated_duration: 30 },

  // Hygiène
  { name: 'Désinfecter les surfaces', category: 'Hygiène', estimated_duration: 10 },
  { name: 'Désinfecter les jouets', category: 'Hygiène', estimated_duration: 45 },
  { name: 'Désinfecter les tables à langer', category: 'Hygiène', estimated_duration: 15 },
  { name: 'Désinfecter les chaises hautes', category: 'Hygiène', estimated_duration: 20 },
  { name: 'Nettoyer les tapis d\'éveil', category: 'Hygiène', estimated_duration: 30 },
  { name: 'Désinfecter les poignées de porte', category: 'Hygiène', estimated_duration: 10 },
  { name: 'Nettoyer les lits et berceaux', category: 'Hygiène', estimated_duration: 25 },

  // Sanitaires
  { name: 'Nettoyer les toilettes', category: 'Sanitaires', estimated_duration: 15 },
  { name: 'Nettoyer les lavabos', category: 'Sanitaires', estimated_duration: 10 },
  { name: 'Nettoyer les pots', category: 'Sanitaires', estimated_duration: 10 },
  { name: 'Réapprovisionner (savon, papier)', category: 'Sanitaires', estimated_duration: 5 },
  { name: 'Désinfecter les matelas à langer', category: 'Sanitaires', estimated_duration: 15 },

  // Entretien
  { name: 'Vider les poubelles', category: 'Entretien', estimated_duration: 5 },
  { name: 'Dépoussiérer les meubles', category: 'Entretien', estimated_duration: 20 },
  { name: 'Nettoyer les étagères', category: 'Entretien', estimated_duration: 15 },
  { name: 'Nettoyer les radiateurs', category: 'Entretien', estimated_duration: 20 },
  { name: 'Nettoyer les plinthes', category: 'Entretien', estimated_duration: 25 },

  // Vitres
  { name: 'Nettoyer les vitres', category: 'Vitres', estimated_duration: 30 },
  { name: 'Nettoyer les miroirs', category: 'Vitres', estimated_duration: 15 },
  { name: 'Nettoyer les portes vitrées', category: 'Vitres', estimated_duration: 20 },

  // Cuisine
  { name: 'Nettoyer le réfrigérateur', category: 'Cuisine', estimated_duration: 45 },
  { name: 'Nettoyer le four/micro-ondes', category: 'Cuisine', estimated_duration: 30 },
  { name: 'Désinfecter les plans de travail', category: 'Cuisine', estimated_duration: 15 },
  { name: 'Nettoyer l\'évier', category: 'Cuisine', estimated_duration: 10 },
  { name: 'Nettoyer la vaisselle', category: 'Cuisine', estimated_duration: 30 },
  { name: 'Nettoyer les placards', category: 'Cuisine', estimated_duration: 20 },

  // Extérieur
  { name: 'Balayer la cour', category: 'Extérieur', estimated_duration: 20 },
  { name: 'Nettoyer les jeux extérieurs', category: 'Extérieur', estimated_duration: 30 },
  { name: 'Ranger le matériel extérieur', category: 'Extérieur', estimated_duration: 15 },
  { name: 'Vider les poubelles extérieures', category: 'Extérieur', estimated_duration: 5 },

  // Linge
  { name: 'Laver le linge', category: 'Linge', estimated_duration: 10 },
  { name: 'Sécher le linge', category: 'Linge', estimated_duration: 10 },
  { name: 'Plier et ranger le linge', category: 'Linge', estimated_duration: 20 },
  { name: 'Changer les draps/bavoirs', category: 'Linge', estimated_duration: 15 },
]

// ====================================
// Packs de démarrage
// ====================================

/**
 * Pack Micro-crèche (10-12 places)
 * Structure typique d'une petite structure
 */
export const MICRO_CRECHE_PACK: StarterPack = {
  id: 'micro-creche',
  name: 'Micro-crèche',
  description: '6 pièces essentielles pour une structure de 10-12 places',
  icon: '🏠',
  rooms: [
    { name: 'Espace de vie', description: 'Salle principale (jeux, repas, activités)', display_order: 1 },
    { name: 'Espace repos', description: 'Zone de sieste avec lits', display_order: 2 },
    { name: 'Espace change', description: 'Zone de change et sanitaires', display_order: 3 },
    { name: 'Cuisine', description: 'Préparation des repas', display_order: 4 },
    { name: 'Entrée', description: 'Accueil des familles', display_order: 5 },
    { name: 'Buanderie', description: 'Linge et rangement', display_order: 6 },
  ],
  categories: DEFAULT_TASK_CATEGORIES,
  tasks: DEFAULT_TASKS,
}

/**
 * Pack Crèche collective (20-60 places)
 * Structure plus grande avec sections par âge
 */
export const CRECHE_COLLECTIVE_PACK: StarterPack = {
  id: 'creche-collective',
  name: 'Crèche collective',
  description: '10 pièces pour une structure multi-sections',
  icon: '🏫',
  rooms: [
    { name: 'Section Bébés', description: 'Espace dédié aux 0-12 mois', display_order: 1 },
    { name: 'Section Moyens', description: 'Espace dédié aux 12-24 mois', display_order: 2 },
    { name: 'Section Grands', description: 'Espace dédié aux 24-36 mois', display_order: 3 },
    { name: 'Salle de repos Bébés', description: 'Dortoir des tout-petits', display_order: 4 },
    { name: 'Salle de repos Grands', description: 'Dortoir des plus grands', display_order: 5 },
    { name: 'Salle d\'activités', description: 'Activités motrices et artistiques', display_order: 6 },
    { name: 'Réfectoire', description: 'Salle des repas', display_order: 7 },
    { name: 'Cuisine', description: 'Préparation des repas', display_order: 8 },
    { name: 'Sanitaires enfants', description: 'Toilettes et change', display_order: 9 },
    { name: 'Sanitaires adultes', description: 'Toilettes du personnel', display_order: 10 },
    { name: 'Entrée/Accueil', description: 'Hall d\'accueil des familles', display_order: 11 },
    { name: 'Bureau', description: 'Administration', display_order: 12 },
    { name: 'Buanderie', description: 'Linge et rangement', display_order: 13 },
    { name: 'Cour extérieure', description: 'Espace de jeux extérieur', display_order: 14 },
  ],
  categories: DEFAULT_TASK_CATEGORIES,
  tasks: DEFAULT_TASKS,
}

/**
 * Pack Minimaliste
 * Pour ceux qui veulent personnaliser eux-mêmes
 */
export const MINIMAL_PACK: StarterPack = {
  id: 'minimal',
  name: 'Pack minimal',
  description: 'Catégories de tâches uniquement, créez vos pièces vous-même',
  icon: '📝',
  rooms: [], // Pas de pièces pré-définies
  categories: DEFAULT_TASK_CATEGORIES,
  tasks: DEFAULT_TASKS,
}

// ====================================
// Export tous les packs disponibles
// ====================================

export const STARTER_PACKS: StarterPack[] = [
  MICRO_CRECHE_PACK,
  CRECHE_COLLECTIVE_PACK,
  MINIMAL_PACK,
]

/**
 * Récupère un pack par son ID
 */
export function getStarterPackById(id: string): StarterPack | undefined {
  return STARTER_PACKS.find(pack => pack.id === id)
}

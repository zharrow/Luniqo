/**
 * Equipment Catalog for HACCP Module
 *
 * Pre-defined equipment for French childcare facilities (crèches).
 * Used for autocomplete suggestions when adding equipment.
 */

export interface CatalogEquipment {
  id: string
  name: string
  category: string
  emoji: string
  equipment_type: string
  default_location: string
  default_maintenance_frequency: 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly' | 'Yearly'
  requires_temperature_control: boolean
  target_temperature_min?: number | null
  target_temperature_max?: number | null
  description?: string
  brand?: string | null
}

export interface EquipmentCategory {
  id: string
  name: string
  emoji: string
  description: string
}

export const EQUIPMENT_CATEGORIES: EquipmentCategory[] = [
  { id: 'refrigeration', name: 'Réfrigération', emoji: '❄️', description: 'Réfrigérateurs, congélateurs, chambres froides' },
  { id: 'cuisson', name: 'Cuisson', emoji: '🔥', description: 'Fours, plaques, micro-ondes' },
  { id: 'preparation', name: 'Préparation', emoji: '🥣', description: 'Mixeurs, robots, ustensiles' },
  { id: 'biberonnerie', name: 'Biberonnerie', emoji: '🍼', description: 'Chauffe-biberons, stérilisateurs' },
  { id: 'temperature', name: 'Contrôle température', emoji: '🌡️', description: 'Thermomètres, sondes' },
  { id: 'lavage', name: 'Lavage & Nettoyage', emoji: '🧽', description: 'Lave-vaisselle, éviers' },
  { id: 'stockage', name: 'Stockage', emoji: '🗄️', description: 'Armoires, étagères, conteneurs' },
  { id: 'ventilation', name: 'Ventilation', emoji: '💨', description: 'Hottes, VMC, extracteurs' },
]

export const EQUIPMENT_CATALOG: CatalogEquipment[] = [
  // ========== RÉFRIGÉRATION ==========
  // Réfrigérateurs
  {
    id: 'frigo_cuisine_1',
    name: 'Réfrigérateur cuisine principal',
    category: 'Réfrigération',
    emoji: '❄️',
    equipment_type: 'Réfrigérateur',
    default_location: 'Cuisine',
    default_maintenance_frequency: 'Monthly',
    requires_temperature_control: true,
    target_temperature_min: 0,
    target_temperature_max: 4,
    description: 'Réfrigérateur principal pour stockage des denrées alimentaires'
  },
  {
    id: 'frigo_cuisine_2',
    name: 'Réfrigérateur cuisine secondaire',
    category: 'Réfrigération',
    emoji: '❄️',
    equipment_type: 'Réfrigérateur',
    default_location: 'Cuisine',
    default_maintenance_frequency: 'Monthly',
    requires_temperature_control: true,
    target_temperature_min: 0,
    target_temperature_max: 4,
    description: 'Réfrigérateur d\'appoint cuisine'
  },
  {
    id: 'frigo_lait',
    name: 'Réfrigérateur laits infantiles',
    category: 'Réfrigération',
    emoji: '🍼',
    equipment_type: 'Réfrigérateur',
    default_location: 'Biberonnerie',
    default_maintenance_frequency: 'Monthly',
    requires_temperature_control: true,
    target_temperature_min: 0,
    target_temperature_max: 4,
    description: 'Réfrigérateur dédié aux laits infantiles et biberons préparés'
  },
  {
    id: 'frigo_medical',
    name: 'Réfrigérateur médicaments',
    category: 'Réfrigération',
    emoji: '💊',
    equipment_type: 'Réfrigérateur médical',
    default_location: 'Infirmerie',
    default_maintenance_frequency: 'Monthly',
    requires_temperature_control: true,
    target_temperature_min: 2,
    target_temperature_max: 8,
    description: 'Réfrigérateur pour médicaments nécessitant le froid'
  },

  // Congélateurs
  {
    id: 'congelateur_1',
    name: 'Congélateur principal',
    category: 'Réfrigération',
    emoji: '🧊',
    equipment_type: 'Congélateur',
    default_location: 'Cuisine',
    default_maintenance_frequency: 'Monthly',
    requires_temperature_control: true,
    target_temperature_min: -24,
    target_temperature_max: -18,
    description: 'Congélateur pour stockage des produits surgelés'
  },
  {
    id: 'congelateur_coffre',
    name: 'Congélateur coffre',
    category: 'Réfrigération',
    emoji: '🧊',
    equipment_type: 'Congélateur coffre',
    default_location: 'Réserve',
    default_maintenance_frequency: 'Monthly',
    requires_temperature_control: true,
    target_temperature_min: -24,
    target_temperature_max: -18,
    description: 'Congélateur coffre pour grande capacité de stockage'
  },

  // Chambres froides
  {
    id: 'chambre_froide_positive',
    name: 'Chambre froide positive',
    category: 'Réfrigération',
    emoji: '🚪',
    equipment_type: 'Chambre froide',
    default_location: 'Cuisine',
    default_maintenance_frequency: 'Monthly',
    requires_temperature_control: true,
    target_temperature_min: 0,
    target_temperature_max: 4,
    description: 'Chambre froide positive pour produits frais'
  },
  {
    id: 'chambre_froide_negative',
    name: 'Chambre froide négative',
    category: 'Réfrigération',
    emoji: '🚪',
    equipment_type: 'Chambre froide',
    default_location: 'Cuisine',
    default_maintenance_frequency: 'Monthly',
    requires_temperature_control: true,
    target_temperature_min: -24,
    target_temperature_max: -18,
    description: 'Chambre froide négative pour surgelés'
  },

  // ========== CUISSON ==========
  // Fours
  {
    id: 'four_convection',
    name: 'Four à convection',
    category: 'Cuisson',
    emoji: '🔥',
    equipment_type: 'Four',
    default_location: 'Cuisine',
    default_maintenance_frequency: 'Monthly',
    requires_temperature_control: false,
    description: 'Four professionnel à convection pour cuisson des repas'
  },
  {
    id: 'four_mixte',
    name: 'Four mixte vapeur/convection',
    category: 'Cuisson',
    emoji: '🔥',
    equipment_type: 'Four mixte',
    default_location: 'Cuisine',
    default_maintenance_frequency: 'Monthly',
    requires_temperature_control: false,
    description: 'Four combiné vapeur et convection pour cuisson saine'
  },
  {
    id: 'four_micro_ondes_1',
    name: 'Micro-ondes cuisine',
    category: 'Cuisson',
    emoji: '📻',
    equipment_type: 'Micro-ondes',
    default_location: 'Cuisine',
    default_maintenance_frequency: 'Monthly',
    requires_temperature_control: false,
    description: 'Micro-ondes pour réchauffage rapide'
  },
  {
    id: 'four_micro_ondes_2',
    name: 'Micro-ondes biberonnerie',
    category: 'Cuisson',
    emoji: '📻',
    equipment_type: 'Micro-ondes',
    default_location: 'Biberonnerie',
    default_maintenance_frequency: 'Monthly',
    requires_temperature_control: false,
    description: 'Micro-ondes dédié à la biberonnerie'
  },

  // Plaques
  {
    id: 'plaque_induction',
    name: 'Plaque à induction',
    category: 'Cuisson',
    emoji: '🍳',
    equipment_type: 'Plaque de cuisson',
    default_location: 'Cuisine',
    default_maintenance_frequency: 'Monthly',
    requires_temperature_control: false,
    description: 'Plaque de cuisson à induction professionnelle'
  },
  {
    id: 'plaque_gaz',
    name: 'Plaque au gaz',
    category: 'Cuisson',
    emoji: '🍳',
    equipment_type: 'Plaque de cuisson',
    default_location: 'Cuisine',
    default_maintenance_frequency: 'Yearly',
    requires_temperature_control: false,
    description: 'Plaque de cuisson au gaz - vérification annuelle obligatoire'
  },
  {
    id: 'plaque_vitroceramique',
    name: 'Plaque vitrocéramique',
    category: 'Cuisson',
    emoji: '🍳',
    equipment_type: 'Plaque de cuisson',
    default_location: 'Cuisine',
    default_maintenance_frequency: 'Monthly',
    requires_temperature_control: false,
    description: 'Plaque de cuisson vitrocéramique'
  },

  // Autres équipements de cuisson
  {
    id: 'bain_marie',
    name: 'Bain-marie',
    category: 'Cuisson',
    emoji: '♨️',
    equipment_type: 'Bain-marie',
    default_location: 'Cuisine',
    default_maintenance_frequency: 'Monthly',
    requires_temperature_control: true,
    target_temperature_min: 63,
    target_temperature_max: 90,
    description: 'Bain-marie pour maintien au chaud des repas'
  },
  {
    id: 'chauffe_plat',
    name: 'Chauffe-plat',
    category: 'Cuisson',
    emoji: '🍽️',
    equipment_type: 'Chauffe-plat',
    default_location: 'Salle de repas',
    default_maintenance_frequency: 'Monthly',
    requires_temperature_control: true,
    target_temperature_min: 63,
    target_temperature_max: 70,
    description: 'Chauffe-plat pour service des repas'
  },

  // ========== PRÉPARATION ==========
  {
    id: 'mixeur_plongeant',
    name: 'Mixeur plongeant',
    category: 'Préparation',
    emoji: '🥣',
    equipment_type: 'Mixeur',
    default_location: 'Cuisine',
    default_maintenance_frequency: 'Monthly',
    requires_temperature_control: false,
    description: 'Mixeur plongeant pour purées et soupes'
  },
  {
    id: 'blender',
    name: 'Blender professionnel',
    category: 'Préparation',
    emoji: '🥤',
    equipment_type: 'Blender',
    default_location: 'Cuisine',
    default_maintenance_frequency: 'Monthly',
    requires_temperature_control: false,
    description: 'Blender pour smoothies et compotes'
  },
  {
    id: 'robot_cuisine',
    name: 'Robot de cuisine',
    category: 'Préparation',
    emoji: '🤖',
    equipment_type: 'Robot culinaire',
    default_location: 'Cuisine',
    default_maintenance_frequency: 'Monthly',
    requires_temperature_control: false,
    description: 'Robot multifonction pour préparation des repas'
  },
  {
    id: 'coupe_legumes',
    name: 'Coupe-légumes professionnel',
    category: 'Préparation',
    emoji: '🥕',
    equipment_type: 'Coupe-légumes',
    default_location: 'Cuisine',
    default_maintenance_frequency: 'Monthly',
    requires_temperature_control: false,
    description: 'Coupe-légumes électrique professionnel'
  },
  {
    id: 'trancheuse',
    name: 'Trancheuse',
    category: 'Préparation',
    emoji: '🔪',
    equipment_type: 'Trancheuse',
    default_location: 'Cuisine',
    default_maintenance_frequency: 'Monthly',
    requires_temperature_control: false,
    description: 'Trancheuse pour jambon et fromage'
  },
  {
    id: 'balance_cuisine',
    name: 'Balance de cuisine',
    category: 'Préparation',
    emoji: '⚖️',
    equipment_type: 'Balance',
    default_location: 'Cuisine',
    default_maintenance_frequency: 'Yearly',
    requires_temperature_control: false,
    description: 'Balance de précision pour dosage des ingrédients'
  },

  // ========== BIBERONNERIE ==========
  {
    id: 'chauffe_biberon_1',
    name: 'Chauffe-biberon n°1',
    category: 'Biberonnerie',
    emoji: '🍼',
    equipment_type: 'Chauffe-biberon',
    default_location: 'Biberonnerie',
    default_maintenance_frequency: 'Weekly',
    requires_temperature_control: true,
    target_temperature_min: 35,
    target_temperature_max: 40,
    description: 'Chauffe-biberon électrique'
  },
  {
    id: 'chauffe_biberon_2',
    name: 'Chauffe-biberon n°2',
    category: 'Biberonnerie',
    emoji: '🍼',
    equipment_type: 'Chauffe-biberon',
    default_location: 'Biberonnerie',
    default_maintenance_frequency: 'Weekly',
    requires_temperature_control: true,
    target_temperature_min: 35,
    target_temperature_max: 40,
    description: 'Chauffe-biberon électrique de secours'
  },
  {
    id: 'chauffe_biberon_bain_marie',
    name: 'Chauffe-biberon bain-marie',
    category: 'Biberonnerie',
    emoji: '🍼',
    equipment_type: 'Chauffe-biberon',
    default_location: 'Biberonnerie',
    default_maintenance_frequency: 'Weekly',
    requires_temperature_control: true,
    target_temperature_min: 35,
    target_temperature_max: 40,
    description: 'Chauffe-biberon au bain-marie collectif'
  },
  {
    id: 'sterilisateur_electrique',
    name: 'Stérilisateur électrique',
    category: 'Biberonnerie',
    emoji: '🧴',
    equipment_type: 'Stérilisateur',
    default_location: 'Biberonnerie',
    default_maintenance_frequency: 'Weekly',
    requires_temperature_control: false,
    description: 'Stérilisateur électrique à vapeur pour biberons et tétines'
  },
  {
    id: 'sterilisateur_micro_ondes',
    name: 'Stérilisateur micro-ondes',
    category: 'Biberonnerie',
    emoji: '🧴',
    equipment_type: 'Stérilisateur',
    default_location: 'Biberonnerie',
    default_maintenance_frequency: 'Weekly',
    requires_temperature_control: false,
    description: 'Stérilisateur pour micro-ondes'
  },
  {
    id: 'sterilisateur_uv',
    name: 'Stérilisateur UV',
    category: 'Biberonnerie',
    emoji: '🧴',
    equipment_type: 'Stérilisateur UV',
    default_location: 'Biberonnerie',
    default_maintenance_frequency: 'Monthly',
    requires_temperature_control: false,
    description: 'Stérilisateur à rayons UV pour biberons et jouets'
  },
  {
    id: 'preparateur_biberon',
    name: 'Préparateur de biberons',
    category: 'Biberonnerie',
    emoji: '🍼',
    equipment_type: 'Préparateur',
    default_location: 'Biberonnerie',
    default_maintenance_frequency: 'Weekly',
    requires_temperature_control: true,
    target_temperature_min: 37,
    target_temperature_max: 40,
    description: 'Machine de préparation automatique de biberons'
  },
  {
    id: 'fontaine_eau',
    name: 'Fontaine à eau filtrée',
    category: 'Biberonnerie',
    emoji: '💧',
    equipment_type: 'Fontaine à eau',
    default_location: 'Biberonnerie',
    default_maintenance_frequency: 'Monthly',
    requires_temperature_control: false,
    description: 'Fontaine à eau filtrée pour préparation des biberons'
  },

  // ========== CONTRÔLE TEMPÉRATURE ==========
  {
    id: 'thermometre_frigo_1',
    name: 'Thermomètre réfrigérateur cuisine',
    category: 'Contrôle température',
    emoji: '🌡️',
    equipment_type: 'Thermomètre',
    default_location: 'Cuisine',
    default_maintenance_frequency: 'Yearly',
    requires_temperature_control: false,
    description: 'Thermomètre digital pour contrôle réfrigérateur'
  },
  {
    id: 'thermometre_frigo_2',
    name: 'Thermomètre réfrigérateur laits',
    category: 'Contrôle température',
    emoji: '🌡️',
    equipment_type: 'Thermomètre',
    default_location: 'Biberonnerie',
    default_maintenance_frequency: 'Yearly',
    requires_temperature_control: false,
    description: 'Thermomètre digital pour réfrigérateur laits infantiles'
  },
  {
    id: 'thermometre_congelateur',
    name: 'Thermomètre congélateur',
    category: 'Contrôle température',
    emoji: '🌡️',
    equipment_type: 'Thermomètre',
    default_location: 'Cuisine',
    default_maintenance_frequency: 'Yearly',
    requires_temperature_control: false,
    description: 'Thermomètre digital pour contrôle congélateur'
  },
  {
    id: 'thermometre_sonde',
    name: 'Thermomètre sonde alimentaire',
    category: 'Contrôle température',
    emoji: '🌡️',
    equipment_type: 'Thermomètre sonde',
    default_location: 'Cuisine',
    default_maintenance_frequency: 'Yearly',
    requires_temperature_control: false,
    description: 'Sonde de température pour contrôle des plats'
  },
  {
    id: 'thermometre_infrarouge',
    name: 'Thermomètre infrarouge',
    category: 'Contrôle température',
    emoji: '🔫',
    equipment_type: 'Thermomètre infrarouge',
    default_location: 'Cuisine',
    default_maintenance_frequency: 'Yearly',
    requires_temperature_control: false,
    description: 'Thermomètre infrarouge sans contact'
  },
  {
    id: 'enregistreur_temperature',
    name: 'Enregistreur de température',
    category: 'Contrôle température',
    emoji: '📊',
    equipment_type: 'Enregistreur',
    default_location: 'Cuisine',
    default_maintenance_frequency: 'Yearly',
    requires_temperature_control: false,
    description: 'Enregistreur automatique de température avec historique'
  },
  {
    id: 'hygrometre',
    name: 'Hygromètre',
    category: 'Contrôle température',
    emoji: '💧',
    equipment_type: 'Hygromètre',
    default_location: 'Réserve',
    default_maintenance_frequency: 'Yearly',
    requires_temperature_control: false,
    description: 'Mesure de l\'humidité dans les zones de stockage'
  },

  // ========== LAVAGE & NETTOYAGE ==========
  {
    id: 'lave_vaisselle_pro',
    name: 'Lave-vaisselle professionnel',
    category: 'Lavage & Nettoyage',
    emoji: '🍽️',
    equipment_type: 'Lave-vaisselle',
    default_location: 'Cuisine',
    default_maintenance_frequency: 'Monthly',
    requires_temperature_control: true,
    target_temperature_min: 60,
    target_temperature_max: 85,
    description: 'Lave-vaisselle professionnel haute température'
  },
  {
    id: 'lave_vaisselle_biberons',
    name: 'Lave-vaisselle biberonnerie',
    category: 'Lavage & Nettoyage',
    emoji: '🍼',
    equipment_type: 'Lave-vaisselle',
    default_location: 'Biberonnerie',
    default_maintenance_frequency: 'Monthly',
    requires_temperature_control: true,
    target_temperature_min: 60,
    target_temperature_max: 85,
    description: 'Lave-vaisselle dédié aux biberons et accessoires'
  },
  {
    id: 'evier_cuisine_1',
    name: 'Évier cuisine n°1',
    category: 'Lavage & Nettoyage',
    emoji: '🚰',
    equipment_type: 'Évier',
    default_location: 'Cuisine',
    default_maintenance_frequency: 'Monthly',
    requires_temperature_control: false,
    description: 'Évier principal de préparation'
  },
  {
    id: 'evier_cuisine_2',
    name: 'Évier cuisine n°2',
    category: 'Lavage & Nettoyage',
    emoji: '🚰',
    equipment_type: 'Évier',
    default_location: 'Cuisine',
    default_maintenance_frequency: 'Monthly',
    requires_temperature_control: false,
    description: 'Évier secondaire / plonge'
  },
  {
    id: 'evier_biberonnerie',
    name: 'Évier biberonnerie',
    category: 'Lavage & Nettoyage',
    emoji: '🚰',
    equipment_type: 'Évier',
    default_location: 'Biberonnerie',
    default_maintenance_frequency: 'Monthly',
    requires_temperature_control: false,
    description: 'Évier dédié à la préparation des biberons'
  },
  {
    id: 'lave_mains',
    name: 'Lave-mains',
    category: 'Lavage & Nettoyage',
    emoji: '🧼',
    equipment_type: 'Lave-mains',
    default_location: 'Cuisine',
    default_maintenance_frequency: 'Monthly',
    requires_temperature_control: false,
    description: 'Poste de lavage des mains obligatoire'
  },
  {
    id: 'distributeur_savon',
    name: 'Distributeur de savon',
    category: 'Lavage & Nettoyage',
    emoji: '🧴',
    equipment_type: 'Distributeur',
    default_location: 'Cuisine',
    default_maintenance_frequency: 'Weekly',
    requires_temperature_control: false,
    description: 'Distributeur automatique de savon'
  },
  {
    id: 'distributeur_essuie_mains',
    name: 'Distributeur essuie-mains',
    category: 'Lavage & Nettoyage',
    emoji: '🧻',
    equipment_type: 'Distributeur',
    default_location: 'Cuisine',
    default_maintenance_frequency: 'Weekly',
    requires_temperature_control: false,
    description: 'Distributeur d\'essuie-mains à usage unique'
  },
  {
    id: 'poubelle_haccp',
    name: 'Poubelle HACCP à pédale',
    category: 'Lavage & Nettoyage',
    emoji: '🗑️',
    equipment_type: 'Poubelle',
    default_location: 'Cuisine',
    default_maintenance_frequency: 'Daily',
    requires_temperature_control: false,
    description: 'Poubelle à ouverture non manuelle conforme HACCP'
  },

  // ========== STOCKAGE ==========
  {
    id: 'armoire_epicerie',
    name: 'Armoire épicerie sèche',
    category: 'Stockage',
    emoji: '🗄️',
    equipment_type: 'Armoire',
    default_location: 'Réserve',
    default_maintenance_frequency: 'Monthly',
    requires_temperature_control: false,
    description: 'Armoire de stockage pour produits secs'
  },
  {
    id: 'etagere_inox_1',
    name: 'Étagère inox n°1',
    category: 'Stockage',
    emoji: '📦',
    equipment_type: 'Étagère',
    default_location: 'Réserve',
    default_maintenance_frequency: 'Monthly',
    requires_temperature_control: false,
    description: 'Étagère en inox pour stockage alimentaire'
  },
  {
    id: 'etagere_inox_2',
    name: 'Étagère inox n°2',
    category: 'Stockage',
    emoji: '📦',
    equipment_type: 'Étagère',
    default_location: 'Cuisine',
    default_maintenance_frequency: 'Monthly',
    requires_temperature_control: false,
    description: 'Étagère en inox pour ustensiles et matériel'
  },
  {
    id: 'armoire_produits_entretien',
    name: 'Armoire produits d\'entretien',
    category: 'Stockage',
    emoji: '🧹',
    equipment_type: 'Armoire sécurisée',
    default_location: 'Local technique',
    default_maintenance_frequency: 'Monthly',
    requires_temperature_control: false,
    description: 'Armoire fermée à clé pour produits d\'entretien'
  },
  {
    id: 'chariot_service',
    name: 'Chariot de service',
    category: 'Stockage',
    emoji: '🛒',
    equipment_type: 'Chariot',
    default_location: 'Cuisine',
    default_maintenance_frequency: 'Monthly',
    requires_temperature_control: false,
    description: 'Chariot de service pour distribution des repas'
  },
  {
    id: 'chariot_isotherme',
    name: 'Chariot isotherme',
    category: 'Stockage',
    emoji: '🛒',
    equipment_type: 'Chariot isotherme',
    default_location: 'Cuisine',
    default_maintenance_frequency: 'Monthly',
    requires_temperature_control: true,
    target_temperature_min: 63,
    target_temperature_max: 70,
    description: 'Chariot isotherme pour maintien au chaud des repas'
  },
  {
    id: 'bacs_gastronormes',
    name: 'Bacs gastronormes',
    category: 'Stockage',
    emoji: '📦',
    equipment_type: 'Bacs GN',
    default_location: 'Cuisine',
    default_maintenance_frequency: 'Monthly',
    requires_temperature_control: false,
    description: 'Ensemble de bacs gastronormes pour préparation et stockage'
  },

  // ========== VENTILATION ==========
  {
    id: 'hotte_aspirante',
    name: 'Hotte aspirante',
    category: 'Ventilation',
    emoji: '💨',
    equipment_type: 'Hotte',
    default_location: 'Cuisine',
    default_maintenance_frequency: 'Monthly',
    requires_temperature_control: false,
    description: 'Hotte aspirante professionnelle avec filtres'
  },
  {
    id: 'vmc',
    name: 'VMC cuisine',
    category: 'Ventilation',
    emoji: '🌀',
    equipment_type: 'VMC',
    default_location: 'Cuisine',
    default_maintenance_frequency: 'Quarterly',
    requires_temperature_control: false,
    description: 'Ventilation mécanique contrôlée'
  },
  {
    id: 'extracteur',
    name: 'Extracteur d\'air',
    category: 'Ventilation',
    emoji: '🌀',
    equipment_type: 'Extracteur',
    default_location: 'Cuisine',
    default_maintenance_frequency: 'Quarterly',
    requires_temperature_control: false,
    description: 'Extracteur d\'air pour évacuation des vapeurs'
  },
  {
    id: 'climatisation',
    name: 'Climatisation cuisine',
    category: 'Ventilation',
    emoji: '❄️',
    equipment_type: 'Climatisation',
    default_location: 'Cuisine',
    default_maintenance_frequency: 'Yearly',
    requires_temperature_control: false,
    description: 'Système de climatisation pour maintien température cuisine'
  },
]

/**
 * Search equipment by name (case-insensitive, partial match)
 */
export function searchEquipment(query: string): CatalogEquipment[] {
  if (!query || query.length < 2) return []

  const normalizedQuery = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

  return EQUIPMENT_CATALOG.filter(equipment => {
    const normalizedName = equipment.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    const normalizedType = equipment.equipment_type.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    return normalizedName.includes(normalizedQuery) || normalizedType.includes(normalizedQuery)
  })
}

/**
 * Get equipment by category
 */
export function getEquipmentByCategory(categoryName: string): CatalogEquipment[] {
  return EQUIPMENT_CATALOG.filter(equipment => equipment.category === categoryName)
}

/**
 * Get category emoji by category name
 */
export function getEquipmentCategoryEmoji(categoryName: string): string {
  const category = EQUIPMENT_CATEGORIES.find(c => c.name === categoryName)
  return category?.emoji || '🔧'
}

/**
 * Get all equipment requiring temperature control
 */
export function getTemperatureControlledEquipment(): CatalogEquipment[] {
  return EQUIPMENT_CATALOG.filter(equipment => equipment.requires_temperature_control)
}

/**
 * Get equipment by location
 */
export function getEquipmentByLocation(location: string): CatalogEquipment[] {
  return EQUIPMENT_CATALOG.filter(equipment =>
    equipment.default_location.toLowerCase() === location.toLowerCase()
  )
}

/**
 * Get unique locations from catalog
 */
export function getEquipmentLocations(): string[] {
  const locations = new Set(EQUIPMENT_CATALOG.map(e => e.default_location))
  return Array.from(locations).sort()
}

/**
 * Get unique equipment types from catalog
 */
export function getEquipmentTypes(): string[] {
  const types = new Set(EQUIPMENT_CATALOG.map(e => e.equipment_type))
  return Array.from(types).sort()
}

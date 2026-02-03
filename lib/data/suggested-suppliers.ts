// ==========================================================================
// Suggested Suppliers - Pre-registered suppliers for quick creation
// ==========================================================================
// These are common suppliers used by French nurseries (crèches).
// Users can select one to auto-fill the form, then customize with
// their local store details (address, phone, contact name).
// ==========================================================================

export interface SuggestedSupplier {
  name: string
  category: SupplierCategory
  description: string
  website?: string
  /** Default phone (service client national) */
  phone?: string
  /** Default email */
  email?: string
}

export type SupplierCategory =
  | 'grande_surface'
  | 'restauration_collective'
  | 'grossiste'
  | 'bio_local'
  | 'specialise'

export const SUPPLIER_CATEGORIES: Record<SupplierCategory, { label: string; color: string; bgColor: string }> = {
  grande_surface: {
    label: 'Grandes surfaces',
    color: '#2563eb',
    bgColor: '#dbeafe',
  },
  restauration_collective: {
    label: 'Restauration collective',
    color: '#d97706',
    bgColor: '#fef3c7',
  },
  grossiste: {
    label: 'Grossistes alimentaires',
    color: '#7c3aed',
    bgColor: '#ede9fe',
  },
  bio_local: {
    label: 'Bio & circuits courts',
    color: '#16a34a',
    bgColor: '#dcfce7',
  },
  specialise: {
    label: 'Spécialisés petite enfance',
    color: '#db2777',
    bgColor: '#fce7f3',
  },
}

export const SUGGESTED_SUPPLIERS: SuggestedSupplier[] = [
  // --- Grandes surfaces ---
  {
    name: 'Carrefour',
    category: 'grande_surface',
    description: 'Hypermarché & supermarché - Produits alimentaires généraux',
    website: 'carrefour.fr',
  },
  {
    name: 'Leclerc',
    category: 'grande_surface',
    description: 'Hypermarché - Large choix de produits alimentaires',
    website: 'leclerc.fr',
  },
  {
    name: 'Auchan',
    category: 'grande_surface',
    description: 'Hypermarché & supermarché',
    website: 'auchan.fr',
  },
  {
    name: 'Intermarché',
    category: 'grande_surface',
    description: 'Supermarché - Les Mousquetaires',
    website: 'intermarche.com',
  },
  {
    name: 'Lidl',
    category: 'grande_surface',
    description: 'Supermarché discount',
    website: 'lidl.fr',
  },
  {
    name: 'Aldi',
    category: 'grande_surface',
    description: 'Supermarché discount',
    website: 'aldi.fr',
  },
  {
    name: 'Super U / U Express',
    category: 'grande_surface',
    description: 'Supermarché - Système U',
    website: 'coursesu.com',
  },
  {
    name: 'Monoprix',
    category: 'grande_surface',
    description: 'Supermarché urbain - Produits premium',
    website: 'monoprix.fr',
  },
  {
    name: 'Casino / Franprix',
    category: 'grande_surface',
    description: 'Supermarché de proximité',
    website: 'casino.fr',
  },
  {
    name: 'Grand Frais',
    category: 'grande_surface',
    description: 'Produits frais - Fruits, légumes, crèmerie',
    website: 'grandfrais.com',
  },
  {
    name: 'Picard',
    category: 'grande_surface',
    description: 'Surgelés - Plats préparés et produits surgelés',
    website: 'picard.fr',
  },

  // --- Restauration collective ---
  {
    name: 'Sodexo',
    category: 'restauration_collective',
    description: 'Restauration collective - Repas livrés pour crèches et collectivités',
    phone: '01 71 25 25 25',
    website: 'sodexo.com',
  },
  {
    name: 'Elior Group',
    category: 'restauration_collective',
    description: 'Restauration collective - Solutions de restauration',
    website: 'eliorgroup.com',
  },
  {
    name: 'Compass Group (Scolarest)',
    category: 'restauration_collective',
    description: 'Restauration scolaire et petite enfance',
    website: 'compass-group.fr',
  },
  {
    name: 'API Restauration',
    category: 'restauration_collective',
    description: 'Restauration collective régionale - Cuisine sur place ou livrée',
    website: 'api-restauration.com',
  },
  {
    name: 'Ansamble (Elior)',
    category: 'restauration_collective',
    description: 'Restauration collective - Repas cuisinés et livrés',
    website: 'ansamble.fr',
  },
  {
    name: 'Mille et Un Repas',
    category: 'restauration_collective',
    description: 'Restauration collective responsable - Cuisine maison',
    website: 'mille-et-un-repas.fr',
  },
  {
    name: 'Convivio (ex-Dupont Restauration)',
    category: 'restauration_collective',
    description: 'Restauration collective - Nord et national',
    website: 'convivio.fr',
  },

  // --- Grossistes alimentaires ---
  {
    name: 'METRO',
    category: 'grossiste',
    description: 'Grossiste alimentaire professionnel - Cash & carry',
    website: 'metro.fr',
  },
  {
    name: 'Promocash',
    category: 'grossiste',
    description: 'Grossiste alimentaire professionnel',
    website: 'promocash.com',
  },
  {
    name: 'Transgourmet',
    category: 'grossiste',
    description: 'Distributeur alimentaire pour professionnels',
    website: 'transgourmet.fr',
  },
  {
    name: 'Brake France (Sysco)',
    category: 'grossiste',
    description: 'Livraison de produits alimentaires pour collectivités',
    website: 'brake.fr',
  },
  {
    name: 'Pomona',
    category: 'grossiste',
    description: 'Distributeur de produits frais pour la restauration',
    website: 'pomona.fr',
  },

  // --- Bio & circuits courts ---
  {
    name: 'Biocoop',
    category: 'bio_local',
    description: 'Coopérative bio - Produits biologiques et locaux',
    website: 'biocoop.fr',
  },
  {
    name: 'La Vie Claire',
    category: 'bio_local',
    description: 'Magasin bio - Produits biologiques',
    website: 'lavieclaire.com',
  },
  {
    name: 'Naturalia',
    category: 'bio_local',
    description: 'Magasin bio urbain',
    website: 'naturalia.fr',
  },
  {
    name: 'Bio c\' Bon',
    category: 'bio_local',
    description: 'Supermarché bio de proximité',
    website: 'bio-c-bon.eu',
  },
  {
    name: 'AMAP locale',
    category: 'bio_local',
    description: 'Association pour le Maintien de l\'Agriculture Paysanne - Paniers de légumes locaux',
  },
  {
    name: 'Producteur local / Maraîcher',
    category: 'bio_local',
    description: 'Producteur local de fruits et légumes - Circuit court',
  },
  {
    name: 'Ferme locale',
    category: 'bio_local',
    description: 'Ferme locale - Produits laitiers, oeufs, viande',
  },

  // --- Spécialisés petite enfance ---
  {
    name: 'Les Bocaux de Mamie',
    category: 'specialise',
    description: 'Repas bio frais pour crèches - Recettes adaptées de 4 mois à 3 ans, livraison France entière',
    phone: '09 80 80 10 32',
    email: 'contact@lesbocauxdemamie.fr',
    website: 'lesbocauxdemamie.fr',
  },
  {
    name: 'Babybio',
    category: 'specialise',
    description: 'Alimentation bio pour bébés et jeunes enfants',
    website: 'babybio.fr',
  },
  {
    name: 'Hipp Biologique',
    category: 'specialise',
    description: 'Alimentation infantile biologique',
    website: 'hipp.fr',
  },
  {
    name: 'Blédina',
    category: 'specialise',
    description: 'Alimentation infantile - Groupe Danone',
    website: 'bledina.com',
  },
  {
    name: 'Nestlé Bébé (Guigoz / Nidal)',
    category: 'specialise',
    description: 'Laits infantiles et alimentation bébé',
    website: 'nestle-bebe.fr',
  },
  {
    name: 'Holle',
    category: 'specialise',
    description: 'Alimentation infantile bio Demeter',
    website: 'holle.ch',
  },
  {
    name: 'Good Goût',
    category: 'specialise',
    description: 'Alimentation bio pour enfants - Recettes maison',
    website: 'goodgout.fr',
  },
  {
    name: 'Yooji',
    category: 'specialise',
    description: 'Portions surgelées bio pour bébés - Fait en France',
    website: 'yooji.fr',
  },
]

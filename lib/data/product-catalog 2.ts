/**
 * Product Catalog for HACCP Module
 *
 * Pre-defined products for French childcare facilities (crèches).
 * Used for autocomplete suggestions when adding products.
 */

export interface CatalogProduct {
  id: string
  name: string
  category: string
  emoji: string
  allergens: string | null
  shelf_life_days: number | null
  storage_conditions: string | null
}

export interface ProductCategory {
  id: string
  name: string
  emoji: string
}

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  { id: 'fruits', name: 'Fruits', emoji: '🍎' },
  { id: 'legumes', name: 'Légumes', emoji: '🥕' },
  { id: 'laitiers', name: 'Produits laitiers', emoji: '🥛' },
  { id: 'viandes', name: 'Viandes & Volailles', emoji: '🍗' },
  { id: 'poissons', name: 'Poissons & Fruits de mer', emoji: '🐟' },
  { id: 'cereales', name: 'Céréales & Féculents', emoji: '🍞' },
  { id: 'oeufs', name: 'Oeufs', emoji: '🥚' },
  { id: 'boissons', name: 'Boissons', emoji: '🧃' },
  { id: 'surgeles', name: 'Surgelés', emoji: '❄️' },
  { id: 'epicerie', name: 'Épicerie', emoji: '🫙' },
]

export const PRODUCT_CATALOG: CatalogProduct[] = [
  // ========== FRUITS ==========
  { id: 'banane', name: 'Banane', category: 'Fruits', emoji: '🍌', allergens: null, shelf_life_days: 5, storage_conditions: 'Température ambiante, à l\'abri de la lumière' },
  { id: 'pomme', name: 'Pomme', category: 'Fruits', emoji: '🍎', allergens: null, shelf_life_days: 14, storage_conditions: 'Réfrigéré 4°C ou température ambiante' },
  { id: 'poire', name: 'Poire', category: 'Fruits', emoji: '🍐', allergens: null, shelf_life_days: 7, storage_conditions: 'Réfrigéré 4°C' },
  { id: 'orange', name: 'Orange', category: 'Fruits', emoji: '🍊', allergens: null, shelf_life_days: 14, storage_conditions: 'Réfrigéré 4°C' },
  { id: 'clementine', name: 'Clémentine', category: 'Fruits', emoji: '🍊', allergens: null, shelf_life_days: 10, storage_conditions: 'Réfrigéré 4°C' },
  { id: 'fraise', name: 'Fraise', category: 'Fruits', emoji: '🍓', allergens: null, shelf_life_days: 3, storage_conditions: 'Réfrigéré 4°C' },
  { id: 'raisin', name: 'Raisin', category: 'Fruits', emoji: '🍇', allergens: null, shelf_life_days: 7, storage_conditions: 'Réfrigéré 4°C' },
  { id: 'peche', name: 'Pêche', category: 'Fruits', emoji: '🍑', allergens: null, shelf_life_days: 5, storage_conditions: 'Réfrigéré 4°C' },
  { id: 'abricot', name: 'Abricot', category: 'Fruits', emoji: '🍑', allergens: null, shelf_life_days: 5, storage_conditions: 'Réfrigéré 4°C' },
  { id: 'compote_pomme', name: 'Compote de pomme', category: 'Fruits', emoji: '🍎', allergens: null, shelf_life_days: 5, storage_conditions: 'Réfrigéré 4°C après ouverture' },
  { id: 'compote_multifruit', name: 'Compote multifruits', category: 'Fruits', emoji: '🍎', allergens: null, shelf_life_days: 5, storage_conditions: 'Réfrigéré 4°C après ouverture' },

  // ========== LÉGUMES ==========
  { id: 'carotte', name: 'Carotte', category: 'Légumes', emoji: '🥕', allergens: null, shelf_life_days: 14, storage_conditions: 'Réfrigéré 4°C' },
  { id: 'courgette', name: 'Courgette', category: 'Légumes', emoji: '🥒', allergens: null, shelf_life_days: 7, storage_conditions: 'Réfrigéré 4°C' },
  { id: 'haricots_verts', name: 'Haricots verts', category: 'Légumes', emoji: '🫛', allergens: null, shelf_life_days: 5, storage_conditions: 'Réfrigéré 4°C' },
  { id: 'petits_pois', name: 'Petits pois', category: 'Légumes', emoji: '🫛', allergens: null, shelf_life_days: 3, storage_conditions: 'Réfrigéré 4°C' },
  { id: 'epinards', name: 'Épinards', category: 'Légumes', emoji: '🥬', allergens: null, shelf_life_days: 3, storage_conditions: 'Réfrigéré 4°C' },
  { id: 'brocoli', name: 'Brocoli', category: 'Légumes', emoji: '🥦', allergens: null, shelf_life_days: 5, storage_conditions: 'Réfrigéré 4°C' },
  { id: 'chou_fleur', name: 'Chou-fleur', category: 'Légumes', emoji: '🥦', allergens: null, shelf_life_days: 7, storage_conditions: 'Réfrigéré 4°C' },
  { id: 'pomme_de_terre', name: 'Pomme de terre', category: 'Légumes', emoji: '🥔', allergens: null, shelf_life_days: 21, storage_conditions: 'Endroit frais, sec et sombre' },
  { id: 'patate_douce', name: 'Patate douce', category: 'Légumes', emoji: '🍠', allergens: null, shelf_life_days: 14, storage_conditions: 'Endroit frais et sec' },
  { id: 'tomate', name: 'Tomate', category: 'Légumes', emoji: '🍅', allergens: null, shelf_life_days: 7, storage_conditions: 'Température ambiante' },
  { id: 'concombre', name: 'Concombre', category: 'Légumes', emoji: '🥒', allergens: null, shelf_life_days: 7, storage_conditions: 'Réfrigéré 4°C' },
  { id: 'poireau', name: 'Poireau', category: 'Légumes', emoji: '🥬', allergens: null, shelf_life_days: 10, storage_conditions: 'Réfrigéré 4°C' },
  { id: 'potiron', name: 'Potiron', category: 'Légumes', emoji: '🎃', allergens: null, shelf_life_days: 30, storage_conditions: 'Endroit frais et sec' },

  // ========== PRODUITS LAITIERS ==========
  { id: 'lait_entier', name: 'Lait entier', category: 'Produits laitiers', emoji: '🥛', allergens: 'Lactose', shelf_life_days: 7, storage_conditions: 'Réfrigéré 4°C' },
  { id: 'lait_demi_ecreme', name: 'Lait demi-écrémé', category: 'Produits laitiers', emoji: '🥛', allergens: 'Lactose', shelf_life_days: 7, storage_conditions: 'Réfrigéré 4°C' },
  { id: 'lait_infantile', name: 'Lait infantile 1er âge', category: 'Produits laitiers', emoji: '🍼', allergens: 'Lactose', shelf_life_days: 30, storage_conditions: 'Endroit frais et sec, réfrigéré après ouverture' },
  { id: 'lait_croissance', name: 'Lait de croissance', category: 'Produits laitiers', emoji: '🍼', allergens: 'Lactose', shelf_life_days: 30, storage_conditions: 'Endroit frais et sec, réfrigéré après ouverture' },
  { id: 'yaourt_nature', name: 'Yaourt nature', category: 'Produits laitiers', emoji: '🥛', allergens: 'Lactose', shelf_life_days: 21, storage_conditions: 'Réfrigéré 4°C' },
  { id: 'yaourt_fruits', name: 'Yaourt aux fruits', category: 'Produits laitiers', emoji: '🥛', allergens: 'Lactose', shelf_life_days: 21, storage_conditions: 'Réfrigéré 4°C' },
  { id: 'fromage_blanc', name: 'Fromage blanc', category: 'Produits laitiers', emoji: '🥛', allergens: 'Lactose', shelf_life_days: 14, storage_conditions: 'Réfrigéré 4°C' },
  { id: 'petit_suisse', name: 'Petit-suisse', category: 'Produits laitiers', emoji: '🥛', allergens: 'Lactose', shelf_life_days: 21, storage_conditions: 'Réfrigéré 4°C' },
  { id: 'beurre', name: 'Beurre', category: 'Produits laitiers', emoji: '🧈', allergens: 'Lactose', shelf_life_days: 30, storage_conditions: 'Réfrigéré 4°C' },
  { id: 'creme_fraiche', name: 'Crème fraîche', category: 'Produits laitiers', emoji: '🥛', allergens: 'Lactose', shelf_life_days: 14, storage_conditions: 'Réfrigéré 4°C' },
  { id: 'gruyere_rape', name: 'Gruyère râpé', category: 'Produits laitiers', emoji: '🧀', allergens: 'Lactose', shelf_life_days: 30, storage_conditions: 'Réfrigéré 4°C' },
  { id: 'emmental', name: 'Emmental', category: 'Produits laitiers', emoji: '🧀', allergens: 'Lactose', shelf_life_days: 30, storage_conditions: 'Réfrigéré 4°C' },

  // ========== VIANDES & VOLAILLES ==========
  { id: 'poulet', name: 'Poulet', category: 'Viandes & Volailles', emoji: '🍗', allergens: null, shelf_life_days: 3, storage_conditions: 'Réfrigéré 4°C' },
  { id: 'dinde', name: 'Dinde', category: 'Viandes & Volailles', emoji: '🍗', allergens: null, shelf_life_days: 3, storage_conditions: 'Réfrigéré 4°C' },
  { id: 'boeuf_hache', name: 'Bœuf haché', category: 'Viandes & Volailles', emoji: '🥩', allergens: null, shelf_life_days: 2, storage_conditions: 'Réfrigéré 4°C' },
  { id: 'veau', name: 'Veau', category: 'Viandes & Volailles', emoji: '🥩', allergens: null, shelf_life_days: 3, storage_conditions: 'Réfrigéré 4°C' },
  { id: 'jambon_blanc', name: 'Jambon blanc', category: 'Viandes & Volailles', emoji: '🥓', allergens: null, shelf_life_days: 5, storage_conditions: 'Réfrigéré 4°C' },

  // ========== POISSONS ==========
  { id: 'cabillaud', name: 'Cabillaud', category: 'Poissons & Fruits de mer', emoji: '🐟', allergens: 'Poisson', shelf_life_days: 2, storage_conditions: 'Réfrigéré 2°C' },
  { id: 'saumon', name: 'Saumon', category: 'Poissons & Fruits de mer', emoji: '🐟', allergens: 'Poisson', shelf_life_days: 2, storage_conditions: 'Réfrigéré 2°C' },
  { id: 'colin', name: 'Colin', category: 'Poissons & Fruits de mer', emoji: '🐟', allergens: 'Poisson', shelf_life_days: 2, storage_conditions: 'Réfrigéré 2°C' },
  { id: 'sole', name: 'Sole', category: 'Poissons & Fruits de mer', emoji: '🐟', allergens: 'Poisson', shelf_life_days: 2, storage_conditions: 'Réfrigéré 2°C' },

  // ========== OEUFS ==========
  { id: 'oeufs', name: 'Œufs', category: 'Oeufs', emoji: '🥚', allergens: 'Œuf', shelf_life_days: 28, storage_conditions: 'Réfrigéré 4°C' },

  // ========== CÉRÉALES & FÉCULENTS ==========
  { id: 'pates', name: 'Pâtes', category: 'Céréales & Féculents', emoji: '🍝', allergens: 'Gluten', shelf_life_days: 365, storage_conditions: 'Endroit frais et sec' },
  { id: 'riz', name: 'Riz', category: 'Céréales & Féculents', emoji: '🍚', allergens: null, shelf_life_days: 365, storage_conditions: 'Endroit frais et sec' },
  { id: 'semoule', name: 'Semoule', category: 'Céréales & Féculents', emoji: '🌾', allergens: 'Gluten', shelf_life_days: 365, storage_conditions: 'Endroit frais et sec' },
  { id: 'pain', name: 'Pain', category: 'Céréales & Féculents', emoji: '🍞', allergens: 'Gluten', shelf_life_days: 3, storage_conditions: 'Température ambiante' },
  { id: 'pain_de_mie', name: 'Pain de mie', category: 'Céréales & Féculents', emoji: '🍞', allergens: 'Gluten', shelf_life_days: 7, storage_conditions: 'Température ambiante' },
  { id: 'cereales_bebe', name: 'Céréales bébé', category: 'Céréales & Féculents', emoji: '🥣', allergens: 'Gluten', shelf_life_days: 90, storage_conditions: 'Endroit frais et sec' },
  { id: 'farine', name: 'Farine', category: 'Céréales & Féculents', emoji: '🌾', allergens: 'Gluten', shelf_life_days: 180, storage_conditions: 'Endroit frais et sec' },

  // ========== BOISSONS ==========
  { id: 'eau', name: 'Eau', category: 'Boissons', emoji: '💧', allergens: null, shelf_life_days: 365, storage_conditions: 'Température ambiante' },
  { id: 'jus_orange', name: 'Jus d\'orange', category: 'Boissons', emoji: '🧃', allergens: null, shelf_life_days: 7, storage_conditions: 'Réfrigéré 4°C après ouverture' },
  { id: 'jus_pomme', name: 'Jus de pomme', category: 'Boissons', emoji: '🧃', allergens: null, shelf_life_days: 7, storage_conditions: 'Réfrigéré 4°C après ouverture' },

  // ========== SURGELÉS ==========
  { id: 'legumes_surgeles', name: 'Légumes surgelés', category: 'Surgelés', emoji: '❄️', allergens: null, shelf_life_days: 180, storage_conditions: 'Congélateur -18°C' },
  { id: 'poisson_surgele', name: 'Poisson surgelé', category: 'Surgelés', emoji: '❄️', allergens: 'Poisson', shelf_life_days: 180, storage_conditions: 'Congélateur -18°C' },
  { id: 'viande_surgelee', name: 'Viande surgelée', category: 'Surgelés', emoji: '❄️', allergens: null, shelf_life_days: 180, storage_conditions: 'Congélateur -18°C' },

  // ========== ÉPICERIE ==========
  { id: 'huile_olive', name: 'Huile d\'olive', category: 'Épicerie', emoji: '🫒', allergens: null, shelf_life_days: 365, storage_conditions: 'Température ambiante, à l\'abri de la lumière' },
  { id: 'huile_tournesol', name: 'Huile de tournesol', category: 'Épicerie', emoji: '🌻', allergens: null, shelf_life_days: 365, storage_conditions: 'Température ambiante, à l\'abri de la lumière' },
  { id: 'sucre', name: 'Sucre', category: 'Épicerie', emoji: '🧂', allergens: null, shelf_life_days: 730, storage_conditions: 'Endroit frais et sec' },
  { id: 'sel', name: 'Sel', category: 'Épicerie', emoji: '🧂', allergens: null, shelf_life_days: 730, storage_conditions: 'Endroit frais et sec' },
  { id: 'confiture', name: 'Confiture', category: 'Épicerie', emoji: '🍓', allergens: null, shelf_life_days: 30, storage_conditions: 'Réfrigéré 4°C après ouverture' },
  { id: 'miel', name: 'Miel', category: 'Épicerie', emoji: '🍯', allergens: null, shelf_life_days: 730, storage_conditions: 'Température ambiante' },
]

/**
 * Search products by name (case-insensitive, partial match)
 */
export function searchProducts(query: string): CatalogProduct[] {
  if (!query || query.length < 2) return []

  const normalizedQuery = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

  return PRODUCT_CATALOG.filter(product => {
    const normalizedName = product.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    return normalizedName.includes(normalizedQuery)
  })
}

/**
 * Get products by category
 */
export function getProductsByCategory(categoryName: string): CatalogProduct[] {
  return PRODUCT_CATALOG.filter(product => product.category === categoryName)
}

/**
 * Get category emoji by category name
 */
export function getCategoryEmoji(categoryName: string): string {
  const category = PRODUCT_CATEGORIES.find(c => c.name === categoryName)
  return category?.emoji || '📦'
}

/**
 * Product Lookup Service
 *
 * Hybrid approach:
 * 1. Check local catalog for verified product info (name, brand, allergens)
 * 2. Always call Open Food Facts to enrich with image, quantity, etc.
 * 3. Merge both sources: catalog data takes priority, OFF fills the gaps
 */

import { findProductByBarcode, getInfantMilkProducts, searchProducts, type CatalogProduct } from '@/lib/data/product-catalog'

export interface ProductLookupResult {
  barcode: string
  name: string
  brand: string | null
  category: string | null
  allergens: string | null
  image_url: string | null
  quantity: string | null
  emoji?: string
  source: 'catalog' | 'openfoodfacts' | 'hybrid'
}

// Legacy type alias for backwards compatibility
export type OpenFoodFactsProduct = ProductLookupResult

// Mapping Open Food Facts allergen tags to French labels
const ALLERGEN_MAP: Record<string, string> = {
  'en:milk': 'Lactose',
  'en:gluten': 'Gluten',
  'en:eggs': 'Oeuf',
  'en:fish': 'Poisson',
  'en:soybeans': 'Soja',
  'en:nuts': 'Fruits à coque',
  'en:peanuts': 'Arachide',
  'en:celery': 'Céleri',
  'en:mustard': 'Moutarde',
  'en:sesame-seeds': 'Sésame',
  'en:sulphur-dioxide-and-sulphites': 'Sulfites',
  'en:lupin': 'Lupin',
  'en:molluscs': 'Mollusques',
  'en:crustaceans': 'Crustacés',
}

// Mapping Open Food Facts category tags to local catalog categories
const CATEGORY_MAP: Record<string, string> = {
  'en:dairy': 'Produits laitiers',
  'en:milks': 'Produits laitiers',
  'en:cheeses': 'Produits laitiers',
  'en:yogurts': 'Produits laitiers',
  'en:fruits': 'Fruits',
  'en:fresh-fruits': 'Fruits',
  'en:vegetables': 'Légumes',
  'en:fresh-vegetables': 'Légumes',
  'en:meats': 'Viandes & Volailles',
  'en:poultries': 'Viandes & Volailles',
  'en:fishes': 'Poissons & Fruits de mer',
  'en:seafood': 'Poissons & Fruits de mer',
  'en:cereals': 'Céréales & Féculents',
  'en:breads': 'Céréales & Féculents',
  'en:pastas': 'Céréales & Féculents',
  'en:rices': 'Céréales & Féculents',
  'en:beverages': 'Boissons',
  'en:waters': 'Boissons',
  'en:juices': 'Boissons',
  'en:frozen-foods': 'Surgelés',
  'en:frozen': 'Surgelés',
  'en:eggs': 'Oeufs',
  'en:baby-milks': 'Laits infantiles',
  'en:infant-formulas': 'Laits infantiles',
}

function parseAllergens(allergenTags: string[] | undefined): string | null {
  if (!allergenTags || allergenTags.length === 0) return null

  const mapped = allergenTags
    .map(tag => ALLERGEN_MAP[tag])
    .filter(Boolean)

  return mapped.length > 0 ? mapped.join(', ') : null
}

function parseCategory(categoryTags: string[] | undefined): string | null {
  if (!categoryTags || categoryTags.length === 0) return null

  for (const tag of categoryTags) {
    const mapped = CATEGORY_MAP[tag]
    if (mapped) return mapped
  }

  return null
}

/**
 * Convert CatalogProduct to ProductLookupResult
 */
function catalogToResult(product: CatalogProduct): ProductLookupResult {
  return {
    barcode: product.barcode || '',
    name: product.name,
    brand: product.brand || null,
    category: product.category,
    allergens: product.allergens,
    image_url: null,
    quantity: null,
    emoji: product.emoji,
    source: 'catalog',
  }
}

interface OpenFoodFactsData {
  name: string | null
  brand: string | null
  category: string | null
  allergens: string | null
  image_url: string | null
  quantity: string | null
}

/**
 * Fetch data from Open Food Facts API
 */
async function fetchOpenFoodFacts(barcode: string): Promise<OpenFoodFactsData | null> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5000)

  try {
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`,
      {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Luniqo/1.0 (HACCP childcare management)',
        },
      }
    )

    if (!response.ok) return null

    const data = await response.json()

    if (data.status !== 1 || !data.product) return null

    const product = data.product

    return {
      name: product.product_name_fr || product.product_name || null,
      brand: product.brands || null,
      category: parseCategory(product.categories_tags),
      allergens: parseAllergens(product.allergens_tags),
      image_url: product.image_front_small_url || product.image_front_url || product.image_url || null,
      quantity: product.quantity || null,
    }
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Main lookup function - enriches catalog data with Open Food Facts
 *
 * Strategy:
 * 1. Check local catalog for verified product data
 * 2. Fetch Open Food Facts for additional info (image, quantity)
 * 3. Merge: catalog data takes priority, OFF fills missing fields
 */
export async function lookupBarcode(barcode: string): Promise<ProductLookupResult | null> {
  // Check local catalog
  const catalogProduct = findProductByBarcode(barcode)

  // Fetch from Open Food Facts (always, for enrichment)
  const offData = await fetchOpenFoodFacts(barcode)

  // If we have catalog data, use it as base and enrich with OFF
  if (catalogProduct) {
    return {
      barcode,
      name: catalogProduct.name,
      brand: catalogProduct.brand || offData?.brand || null,
      category: catalogProduct.category,
      allergens: catalogProduct.allergens || offData?.allergens || null,
      image_url: offData?.image_url || null,
      quantity: offData?.quantity || null,
      emoji: catalogProduct.emoji,
      source: offData ? 'hybrid' : 'catalog',
    }
  }

  // If no catalog data but OFF found something
  if (offData && offData.name) {
    return {
      barcode,
      name: offData.name,
      brand: offData.brand,
      category: offData.category,
      allergens: offData.allergens,
      image_url: offData.image_url,
      quantity: offData.quantity,
      source: 'openfoodfacts',
    }
  }

  // Nothing found
  return null
}

/**
 * Search catalog by name (for autocomplete/search features)
 */
export function searchCatalogProducts(query: string): ProductLookupResult[] {
  const products = searchProducts(query)
  return products.map(catalogToResult)
}

/**
 * Get all infant milk products from catalog (for dropdown selection)
 */
export function getInfantMilkCatalog(): ProductLookupResult[] {
  const products = getInfantMilkProducts()
  return products.map(catalogToResult)
}

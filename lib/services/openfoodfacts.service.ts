/**
 * Open Food Facts API Service
 * Looks up food products by barcode (EAN-13, EAN-8, UPC)
 * Free API, no authentication required
 */

export interface OpenFoodFactsProduct {
  barcode: string
  name: string
  brand: string | null
  category: string | null
  allergens: string | null
  image_url: string | null
  quantity: string | null
}

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

export async function lookupBarcode(barcode: string): Promise<OpenFoodFactsProduct | null> {
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

    const name = product.product_name_fr || product.product_name || null
    if (!name) return null

    return {
      barcode,
      name,
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

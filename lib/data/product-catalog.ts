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
  barcode?: string | null // EAN-13 barcode for scanning
  brand?: string | null
}

export interface ProductCategory {
  id: string
  name: string
  emoji: string
}

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  { id: 'laits_infantiles', name: 'Laits infantiles', emoji: '🍼' },
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
  // ========== LAITS INFANTILES - GALLIA (Danone) ==========
  { id: 'gallia_calisma_1', name: 'Gallia Calisma 1', category: 'Laits infantiles', emoji: '🍼', allergens: 'Lait', shelf_life_days: 30, storage_conditions: 'Endroit frais et sec, réfrigéré après ouverture', barcode: '3041091420114', brand: 'Gallia' },
  { id: 'gallia_calisma_2', name: 'Gallia Calisma 2', category: 'Laits infantiles', emoji: '🍼', allergens: 'Lait', shelf_life_days: 30, storage_conditions: 'Endroit frais et sec, réfrigéré après ouverture', barcode: '3041091420121', brand: 'Gallia' },
  { id: 'gallia_calisma_3', name: 'Gallia Calisma 3', category: 'Laits infantiles', emoji: '🍼', allergens: 'Lait', shelf_life_days: 30, storage_conditions: 'Endroit frais et sec, réfrigéré après ouverture', barcode: '3041091420138', brand: 'Gallia' },
  { id: 'gallia_calisma_relais_1', name: 'Gallia Calisma Relais 1', category: 'Laits infantiles', emoji: '🍼', allergens: 'Lait', shelf_life_days: 30, storage_conditions: 'Endroit frais et sec, réfrigéré après ouverture', barcode: '3041091421845', brand: 'Gallia' },
  { id: 'gallia_calisma_relais_2', name: 'Gallia Calisma Relais 2', category: 'Laits infantiles', emoji: '🍼', allergens: 'Lait', shelf_life_days: 30, storage_conditions: 'Endroit frais et sec, réfrigéré après ouverture', barcode: '3041091421852', brand: 'Gallia' },
  { id: 'gallia_ac_transit_1', name: 'Gallia AC Transit 1', category: 'Laits infantiles', emoji: '🍼', allergens: 'Lait', shelf_life_days: 30, storage_conditions: 'Endroit frais et sec, réfrigéré après ouverture', barcode: '3041091426000', brand: 'Gallia' },
  { id: 'gallia_ac_transit_2', name: 'Gallia AC Transit 2', category: 'Laits infantiles', emoji: '🍼', allergens: 'Lait', shelf_life_days: 30, storage_conditions: 'Endroit frais et sec, réfrigéré après ouverture', barcode: '3041091426017', brand: 'Gallia' },
  { id: 'gallia_ar_1', name: 'Gallia AR 1', category: 'Laits infantiles', emoji: '🍼', allergens: 'Lait', shelf_life_days: 30, storage_conditions: 'Endroit frais et sec, réfrigéré après ouverture', barcode: '3041091426505', brand: 'Gallia' },
  { id: 'gallia_ar_2', name: 'Gallia AR 2', category: 'Laits infantiles', emoji: '🍼', allergens: 'Lait', shelf_life_days: 30, storage_conditions: 'Endroit frais et sec, réfrigéré après ouverture', barcode: '3041091426512', brand: 'Gallia' },

  // ========== LAITS INFANTILES - GUIGOZ (Nestlé) ==========
  { id: 'guigoz_optipro_1', name: 'Guigoz Optipro 1', category: 'Laits infantiles', emoji: '🍼', allergens: 'Lait', shelf_life_days: 30, storage_conditions: 'Endroit frais et sec, réfrigéré après ouverture', barcode: '7613032473907', brand: 'Guigoz' },
  { id: 'guigoz_optipro_2', name: 'Guigoz Optipro 2', category: 'Laits infantiles', emoji: '🍼', allergens: 'Lait', shelf_life_days: 30, storage_conditions: 'Endroit frais et sec, réfrigéré après ouverture', barcode: '7613032473914', brand: 'Guigoz' },
  { id: 'guigoz_optipro_3', name: 'Guigoz Optipro 3', category: 'Laits infantiles', emoji: '🍼', allergens: 'Lait', shelf_life_days: 30, storage_conditions: 'Endroit frais et sec, réfrigéré après ouverture', barcode: '7613032473921', brand: 'Guigoz' },
  { id: 'guigoz_pelargon_1', name: 'Guigoz Pelargon 1', category: 'Laits infantiles', emoji: '🍼', allergens: 'Lait', shelf_life_days: 30, storage_conditions: 'Endroit frais et sec, réfrigéré après ouverture', barcode: '7613036254014', brand: 'Guigoz' },
  { id: 'guigoz_pelargon_2', name: 'Guigoz Pelargon 2', category: 'Laits infantiles', emoji: '🍼', allergens: 'Lait', shelf_life_days: 30, storage_conditions: 'Endroit frais et sec, réfrigéré après ouverture', barcode: '7613036254021', brand: 'Guigoz' },
  { id: 'guigoz_evolia_relais_1', name: 'Guigoz Evolia Relais 1', category: 'Laits infantiles', emoji: '🍼', allergens: 'Lait', shelf_life_days: 30, storage_conditions: 'Endroit frais et sec, réfrigéré après ouverture', barcode: '7613035813410', brand: 'Guigoz' },
  { id: 'guigoz_evolia_relais_2', name: 'Guigoz Evolia Relais 2', category: 'Laits infantiles', emoji: '🍼', allergens: 'Lait', shelf_life_days: 30, storage_conditions: 'Endroit frais et sec, réfrigéré après ouverture', barcode: '7613035813427', brand: 'Guigoz' },

  // ========== LAITS INFANTILES - NIDAL (Nestlé) ==========
  { id: 'nidal_1', name: 'Nidal 1', category: 'Laits infantiles', emoji: '🍼', allergens: 'Lait', shelf_life_days: 30, storage_conditions: 'Endroit frais et sec, réfrigéré après ouverture', barcode: '7613035544501', brand: 'Nidal' },
  { id: 'nidal_2', name: 'Nidal 2', category: 'Laits infantiles', emoji: '🍼', allergens: 'Lait', shelf_life_days: 30, storage_conditions: 'Endroit frais et sec, réfrigéré après ouverture', barcode: '7613035544518', brand: 'Nidal' },
  { id: 'nidal_croissance_3', name: 'Nidal Croissance 3', category: 'Laits infantiles', emoji: '🍼', allergens: 'Lait', shelf_life_days: 30, storage_conditions: 'Endroit frais et sec, réfrigéré après ouverture', barcode: '7613035544525', brand: 'Nidal' },
  { id: 'nidal_novaia_1', name: 'Nidal Novaïa 1', category: 'Laits infantiles', emoji: '🍼', allergens: 'Lait', shelf_life_days: 30, storage_conditions: 'Endroit frais et sec, réfrigéré après ouverture', barcode: '7613035813557', brand: 'Nidal' },
  { id: 'nidal_novaia_2', name: 'Nidal Novaïa 2', category: 'Laits infantiles', emoji: '🍼', allergens: 'Lait', shelf_life_days: 30, storage_conditions: 'Endroit frais et sec, réfrigéré après ouverture', barcode: '7613035813564', brand: 'Nidal' },

  // ========== LAITS INFANTILES - PHYSIOLAC (Gilbert) ==========
  { id: 'physiolac_bio_1', name: 'Physiolac Bio 1', category: 'Laits infantiles', emoji: '🍼', allergens: 'Lait', shelf_life_days: 30, storage_conditions: 'Endroit frais et sec, réfrigéré après ouverture', barcode: '3518646100017', brand: 'Physiolac' },
  { id: 'physiolac_bio_2', name: 'Physiolac Bio 2', category: 'Laits infantiles', emoji: '🍼', allergens: 'Lait', shelf_life_days: 30, storage_conditions: 'Endroit frais et sec, réfrigéré après ouverture', barcode: '3518646100024', brand: 'Physiolac' },
  { id: 'physiolac_bio_3', name: 'Physiolac Bio 3', category: 'Laits infantiles', emoji: '🍼', allergens: 'Lait', shelf_life_days: 30, storage_conditions: 'Endroit frais et sec, réfrigéré après ouverture', barcode: '3518646100031', brand: 'Physiolac' },
  { id: 'physiolac_equilibre_1', name: 'Physiolac Equilibre 1', category: 'Laits infantiles', emoji: '🍼', allergens: 'Lait', shelf_life_days: 30, storage_conditions: 'Endroit frais et sec, réfrigéré après ouverture', barcode: '3518646110016', brand: 'Physiolac' },
  { id: 'physiolac_equilibre_2', name: 'Physiolac Equilibre 2', category: 'Laits infantiles', emoji: '🍼', allergens: 'Lait', shelf_life_days: 30, storage_conditions: 'Endroit frais et sec, réfrigéré après ouverture', barcode: '3518646110023', brand: 'Physiolac' },
  { id: 'physiolac_ar_1', name: 'Physiolac AR 1', category: 'Laits infantiles', emoji: '🍼', allergens: 'Lait', shelf_life_days: 30, storage_conditions: 'Endroit frais et sec, réfrigéré après ouverture', barcode: '3518646150012', brand: 'Physiolac' },
  { id: 'physiolac_ar_2', name: 'Physiolac AR 2', category: 'Laits infantiles', emoji: '🍼', allergens: 'Lait', shelf_life_days: 30, storage_conditions: 'Endroit frais et sec, réfrigéré après ouverture', barcode: '3518646150029', brand: 'Physiolac' },

  // ========== LAITS INFANTILES - BABYBIO (Vitagermine) ==========
  { id: 'babybio_optima_1', name: 'Babybio Optima 1', category: 'Laits infantiles', emoji: '🍼', allergens: 'Lait', shelf_life_days: 30, storage_conditions: 'Endroit frais et sec, réfrigéré après ouverture', barcode: '3288131501017', brand: 'Babybio' },
  { id: 'babybio_optima_2', name: 'Babybio Optima 2', category: 'Laits infantiles', emoji: '🍼', allergens: 'Lait', shelf_life_days: 30, storage_conditions: 'Endroit frais et sec, réfrigéré après ouverture', barcode: '3288131501024', brand: 'Babybio' },
  { id: 'babybio_optima_3', name: 'Babybio Optima 3', category: 'Laits infantiles', emoji: '🍼', allergens: 'Lait', shelf_life_days: 30, storage_conditions: 'Endroit frais et sec, réfrigéré après ouverture', barcode: '3288131501031', brand: 'Babybio' },
  { id: 'babybio_primea_1', name: 'Babybio Primea 1', category: 'Laits infantiles', emoji: '🍼', allergens: 'Lait', shelf_life_days: 30, storage_conditions: 'Endroit frais et sec, réfrigéré après ouverture', barcode: '3288131510019', brand: 'Babybio' },
  { id: 'babybio_primea_2', name: 'Babybio Primea 2', category: 'Laits infantiles', emoji: '🍼', allergens: 'Lait', shelf_life_days: 30, storage_conditions: 'Endroit frais et sec, réfrigéré après ouverture', barcode: '3288131510026', brand: 'Babybio' },
  { id: 'babybio_primea_3', name: 'Babybio Primea 3', category: 'Laits infantiles', emoji: '🍼', allergens: 'Lait', shelf_life_days: 30, storage_conditions: 'Endroit frais et sec, réfrigéré après ouverture', barcode: '3288131510033', brand: 'Babybio' },

  // ========== LAITS INFANTILES - MODILAC (Sodilac) ==========
  { id: 'modilac_expert_riz_1', name: 'Modilac Expert Riz 1', category: 'Laits infantiles', emoji: '🍼', allergens: null, shelf_life_days: 30, storage_conditions: 'Endroit frais et sec, réfrigéré après ouverture', barcode: '3431590211010', brand: 'Modilac' },
  { id: 'modilac_expert_riz_2', name: 'Modilac Expert Riz 2', category: 'Laits infantiles', emoji: '🍼', allergens: null, shelf_life_days: 30, storage_conditions: 'Endroit frais et sec, réfrigéré après ouverture', barcode: '3431590211027', brand: 'Modilac' },
  { id: 'modilac_expert_riz_3', name: 'Modilac Expert Riz 3', category: 'Laits infantiles', emoji: '🍼', allergens: null, shelf_life_days: 30, storage_conditions: 'Endroit frais et sec, réfrigéré après ouverture', barcode: '3431590211034', brand: 'Modilac' },
  { id: 'modilac_bio_1', name: 'Modilac Bio 1', category: 'Laits infantiles', emoji: '🍼', allergens: 'Lait', shelf_life_days: 30, storage_conditions: 'Endroit frais et sec, réfrigéré après ouverture', barcode: '3431590201011', brand: 'Modilac' },
  { id: 'modilac_bio_2', name: 'Modilac Bio 2', category: 'Laits infantiles', emoji: '🍼', allergens: 'Lait', shelf_life_days: 30, storage_conditions: 'Endroit frais et sec, réfrigéré après ouverture', barcode: '3431590201028', brand: 'Modilac' },
  { id: 'modilac_bio_3', name: 'Modilac Bio 3', category: 'Laits infantiles', emoji: '🍼', allergens: 'Lait', shelf_life_days: 30, storage_conditions: 'Endroit frais et sec, réfrigéré après ouverture', barcode: '3431590201035', brand: 'Modilac' },
  { id: 'modilac_actigest_1', name: 'Modilac Actigest 1', category: 'Laits infantiles', emoji: '🍼', allergens: 'Lait', shelf_life_days: 30, storage_conditions: 'Endroit frais et sec, réfrigéré après ouverture', barcode: '3431590220012', brand: 'Modilac' },
  { id: 'modilac_actigest_2', name: 'Modilac Actigest 2', category: 'Laits infantiles', emoji: '🍼', allergens: 'Lait', shelf_life_days: 30, storage_conditions: 'Endroit frais et sec, réfrigéré après ouverture', barcode: '3431590220029', brand: 'Modilac' },

  // ========== LAITS INFANTILES - PICOT (Lactalis) ==========
  { id: 'picot_1', name: 'Picot 1', category: 'Laits infantiles', emoji: '🍼', allergens: 'Lait', shelf_life_days: 30, storage_conditions: 'Endroit frais et sec, réfrigéré après ouverture', barcode: '3760238510017', brand: 'Picot' },
  { id: 'picot_2', name: 'Picot 2', category: 'Laits infantiles', emoji: '🍼', allergens: 'Lait', shelf_life_days: 30, storage_conditions: 'Endroit frais et sec, réfrigéré après ouverture', barcode: '3760238510024', brand: 'Picot' },
  { id: 'picot_3', name: 'Picot 3', category: 'Laits infantiles', emoji: '🍼', allergens: 'Lait', shelf_life_days: 30, storage_conditions: 'Endroit frais et sec, réfrigéré après ouverture', barcode: '3760238510031', brand: 'Picot' },
  { id: 'picot_bio_1', name: 'Picot Bio 1', category: 'Laits infantiles', emoji: '🍼', allergens: 'Lait', shelf_life_days: 30, storage_conditions: 'Endroit frais et sec, réfrigéré après ouverture', barcode: '3760238512017', brand: 'Picot' },
  { id: 'picot_bio_2', name: 'Picot Bio 2', category: 'Laits infantiles', emoji: '🍼', allergens: 'Lait', shelf_life_days: 30, storage_conditions: 'Endroit frais et sec, réfrigéré après ouverture', barcode: '3760238512024', brand: 'Picot' },
  { id: 'picot_ar_1', name: 'Picot AR 1', category: 'Laits infantiles', emoji: '🍼', allergens: 'Lait', shelf_life_days: 30, storage_conditions: 'Endroit frais et sec, réfrigéré après ouverture', barcode: '3760238515018', brand: 'Picot' },
  { id: 'picot_ar_2', name: 'Picot AR 2', category: 'Laits infantiles', emoji: '🍼', allergens: 'Lait', shelf_life_days: 30, storage_conditions: 'Endroit frais et sec, réfrigéré après ouverture', barcode: '3760238515025', brand: 'Picot' },

  // ========== LAITS INFANTILES - BLEDILAIT (Blédina/Danone) ==========
  { id: 'bledilait_1', name: 'Blédilait 1', category: 'Laits infantiles', emoji: '🍼', allergens: 'Lait', shelf_life_days: 30, storage_conditions: 'Endroit frais et sec, réfrigéré après ouverture', barcode: '3041091476012', brand: 'Blédina' },
  { id: 'bledilait_2', name: 'Blédilait 2', category: 'Laits infantiles', emoji: '🍼', allergens: 'Lait', shelf_life_days: 30, storage_conditions: 'Endroit frais et sec, réfrigéré après ouverture', barcode: '3041091476029', brand: 'Blédina' },
  { id: 'bledilait_croissance_3', name: 'Blédilait Croissance 3', category: 'Laits infantiles', emoji: '🍼', allergens: 'Lait', shelf_life_days: 30, storage_conditions: 'Endroit frais et sec, réfrigéré après ouverture', barcode: '3041091476036', brand: 'Blédina' },
  { id: 'bledilait_premium_1', name: 'Blédilait Premium 1', category: 'Laits infantiles', emoji: '🍼', allergens: 'Lait', shelf_life_days: 30, storage_conditions: 'Endroit frais et sec, réfrigéré après ouverture', barcode: '3041091478016', brand: 'Blédina' },
  { id: 'bledilait_premium_2', name: 'Blédilait Premium 2', category: 'Laits infantiles', emoji: '🍼', allergens: 'Lait', shelf_life_days: 30, storage_conditions: 'Endroit frais et sec, réfrigéré après ouverture', barcode: '3041091478023', brand: 'Blédina' },

  // ========== LAITS INFANTILES - HIPP ==========
  { id: 'hipp_biologique_1', name: 'HiPP Biologique 1', category: 'Laits infantiles', emoji: '🍼', allergens: 'Lait', shelf_life_days: 30, storage_conditions: 'Endroit frais et sec, réfrigéré après ouverture', barcode: '4062300276017', brand: 'HiPP' },
  { id: 'hipp_biologique_2', name: 'HiPP Biologique 2', category: 'Laits infantiles', emoji: '🍼', allergens: 'Lait', shelf_life_days: 30, storage_conditions: 'Endroit frais et sec, réfrigéré après ouverture', barcode: '4062300276024', brand: 'HiPP' },
  { id: 'hipp_biologique_3', name: 'HiPP Biologique 3', category: 'Laits infantiles', emoji: '🍼', allergens: 'Lait', shelf_life_days: 30, storage_conditions: 'Endroit frais et sec, réfrigéré après ouverture', barcode: '4062300276031', brand: 'HiPP' },
  { id: 'hipp_combiotic_1', name: 'HiPP Combiotic 1', category: 'Laits infantiles', emoji: '🍼', allergens: 'Lait', shelf_life_days: 30, storage_conditions: 'Endroit frais et sec, réfrigéré après ouverture', barcode: '4062300277014', brand: 'HiPP' },
  { id: 'hipp_combiotic_2', name: 'HiPP Combiotic 2', category: 'Laits infantiles', emoji: '🍼', allergens: 'Lait', shelf_life_days: 30, storage_conditions: 'Endroit frais et sec, réfrigéré après ouverture', barcode: '4062300277021', brand: 'HiPP' },
  { id: 'hipp_ar_bio_1', name: 'HiPP AR Bio 1', category: 'Laits infantiles', emoji: '🍼', allergens: 'Lait', shelf_life_days: 30, storage_conditions: 'Endroit frais et sec, réfrigéré après ouverture', barcode: '4062300278011', brand: 'HiPP' },

  // ========== LAITS INFANTILES - HOLLE (Bio Suisse) ==========
  { id: 'holle_bio_1', name: 'Holle Bio 1', category: 'Laits infantiles', emoji: '🍼', allergens: 'Lait', shelf_life_days: 30, storage_conditions: 'Endroit frais et sec, réfrigéré après ouverture', barcode: '7640161870017', brand: 'Holle' },
  { id: 'holle_bio_2', name: 'Holle Bio 2', category: 'Laits infantiles', emoji: '🍼', allergens: 'Lait', shelf_life_days: 30, storage_conditions: 'Endroit frais et sec, réfrigéré après ouverture', barcode: '7640161870024', brand: 'Holle' },
  { id: 'holle_bio_3', name: 'Holle Bio 3', category: 'Laits infantiles', emoji: '🍼', allergens: 'Lait', shelf_life_days: 30, storage_conditions: 'Endroit frais et sec, réfrigéré après ouverture', barcode: '7640161870031', brand: 'Holle' },
  { id: 'holle_chevre_bio_1', name: 'Holle Chèvre Bio 1', category: 'Laits infantiles', emoji: '🍼', allergens: 'Lait de chèvre', shelf_life_days: 30, storage_conditions: 'Endroit frais et sec, réfrigéré après ouverture', barcode: '7640161871014', brand: 'Holle' },
  { id: 'holle_chevre_bio_2', name: 'Holle Chèvre Bio 2', category: 'Laits infantiles', emoji: '🍼', allergens: 'Lait de chèvre', shelf_life_days: 30, storage_conditions: 'Endroit frais et sec, réfrigéré après ouverture', barcode: '7640161871021', brand: 'Holle' },
  { id: 'holle_chevre_bio_3', name: 'Holle Chèvre Bio 3', category: 'Laits infantiles', emoji: '🍼', allergens: 'Lait de chèvre', shelf_life_days: 30, storage_conditions: 'Endroit frais et sec, réfrigéré après ouverture', barcode: '7640161871038', brand: 'Holle' },

  // ========== LAITS INFANTILES - NOVALAC (Menarini) ==========
  { id: 'novalac_1', name: 'Novalac 1', category: 'Laits infantiles', emoji: '🍼', allergens: 'Lait', shelf_life_days: 30, storage_conditions: 'Endroit frais et sec, réfrigéré après ouverture', barcode: '3664099000015', brand: 'Novalac' },
  { id: 'novalac_2', name: 'Novalac 2', category: 'Laits infantiles', emoji: '🍼', allergens: 'Lait', shelf_life_days: 30, storage_conditions: 'Endroit frais et sec, réfrigéré après ouverture', barcode: '3664099000022', brand: 'Novalac' },
  { id: 'novalac_3', name: 'Novalac 3', category: 'Laits infantiles', emoji: '🍼', allergens: 'Lait', shelf_life_days: 30, storage_conditions: 'Endroit frais et sec, réfrigéré après ouverture', barcode: '3664099000039', brand: 'Novalac' },
  { id: 'novalac_ar_1', name: 'Novalac AR 1', category: 'Laits infantiles', emoji: '🍼', allergens: 'Lait', shelf_life_days: 30, storage_conditions: 'Endroit frais et sec, réfrigéré après ouverture', barcode: '3664099010014', brand: 'Novalac' },
  { id: 'novalac_ar_2', name: 'Novalac AR 2', category: 'Laits infantiles', emoji: '🍼', allergens: 'Lait', shelf_life_days: 30, storage_conditions: 'Endroit frais et sec, réfrigéré après ouverture', barcode: '3664099010021', brand: 'Novalac' },
  { id: 'novalac_ac_1', name: 'Novalac AC 1', category: 'Laits infantiles', emoji: '🍼', allergens: 'Lait', shelf_life_days: 30, storage_conditions: 'Endroit frais et sec, réfrigéré après ouverture', barcode: '3664099020013', brand: 'Novalac' },
  { id: 'novalac_ac_2', name: 'Novalac AC 2', category: 'Laits infantiles', emoji: '🍼', allergens: 'Lait', shelf_life_days: 30, storage_conditions: 'Endroit frais et sec, réfrigéré après ouverture', barcode: '3664099020020', brand: 'Novalac' },
  { id: 'novalac_riz_1', name: 'Novalac Riz 1', category: 'Laits infantiles', emoji: '🍼', allergens: null, shelf_life_days: 30, storage_conditions: 'Endroit frais et sec, réfrigéré après ouverture', barcode: '3664099030012', brand: 'Novalac' },
  { id: 'novalac_riz_2', name: 'Novalac Riz 2', category: 'Laits infantiles', emoji: '🍼', allergens: null, shelf_life_days: 30, storage_conditions: 'Endroit frais et sec, réfrigéré après ouverture', barcode: '3664099030029', brand: 'Novalac' },

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

/**
 * Find product by barcode (EAN-13)
 */
export function findProductByBarcode(barcode: string): CatalogProduct | undefined {
  return PRODUCT_CATALOG.find(product => product.barcode === barcode)
}

/**
 * Get all infant milk products
 */
export function getInfantMilkProducts(): CatalogProduct[] {
  return PRODUCT_CATALOG.filter(product => product.category === 'Laits infantiles')
}

/**
 * Get infant milk products grouped by brand
 */
export function getInfantMilkByBrand(): Record<string, CatalogProduct[]> {
  const milks = getInfantMilkProducts()
  return milks.reduce((acc, product) => {
    const brand = product.brand || 'Autre'
    if (!acc[brand]) acc[brand] = []
    acc[brand].push(product)
    return acc
  }, {} as Record<string, CatalogProduct[]>)
}

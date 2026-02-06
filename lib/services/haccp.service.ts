/**
 * HACCP Service
 *
 * Manages all HACCP (food safety) operations:
 * - Children (with allergens)
 * - Meals (breakfast, lunch, snack)
 * - Products (with allergens and expiry)
 * - Suppliers
 * - Batches (product reception)
 * - Temperatures (checkpoints)
 * - Equipment (maintenance)
 * - Non-compliance (incidents)
 * - Documents (compliance docs)
 */

import { createClient } from '@/lib/supabase/client'

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type MealType = 'Breakfast' | 'Lunch' | 'Snack'
export type CheckpointType = 'Reception' | 'Holding' | 'Service' | 'Storage'
export type ComplianceType = 'Product' | 'Temperature' | 'Hygiene' | 'Other'
export type ComplianceStatus = 'Open' | 'Corrected' | 'Closed'
export type DocumentCategory = 'Temperatures' | 'Cleaning' | 'Training' | 'Compliance' | 'Other'

// Note: Child types have been moved to child.service.ts (Core module)
// HACCP module consumes child data but doesn't manage it

// Suppliers
export interface Supplier {
  id: string
  nursery_id: string
  name: string
  contact_name: string | null
  phone: string | null
  email: string | null
  address: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateSupplierInput {
  name: string
  contact_name?: string
  phone?: string
  email?: string
  address?: string
}

export interface UpdateSupplierInput {
  name?: string
  contact_name?: string
  phone?: string
  email?: string
  address?: string
  is_active?: boolean
}

// Products
export interface Product {
  id: string
  nursery_id: string
  supplier_id: string
  name: string
  category: string | null
  allergens: string | null
  shelf_life_days: number | null
  storage_conditions: string | null
  barcode: string | null
  brand: string | null
  image_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  supplier?: Supplier
}

export interface CreateProductInput {
  supplier_id: string
  name: string
  category?: string
  allergens?: string
  shelf_life_days?: number
  storage_conditions?: string
  barcode?: string
  brand?: string
  image_url?: string
}

export interface UpdateProductInput {
  supplier_id?: string
  name?: string
  category?: string
  allergens?: string
  shelf_life_days?: number
  storage_conditions?: string
  barcode?: string
  brand?: string
  image_url?: string
  is_active?: boolean
}

// Meals
export interface Meal {
  id: string
  nursery_id: string
  date: string
  type: MealType
  menu: string | null
  allergens_present: string | null
  responsible_id: string
  is_validated: boolean
  created_at: string
  updated_at: string
}

export interface CreateMealInput {
  date: string
  type: MealType
  menu?: string
  allergens_present?: string
  responsible_id: string
}

export interface UpdateMealInput {
  date?: string
  type?: MealType
  menu?: string
  allergens_present?: string
  responsible_id?: string
  is_validated?: boolean
}

// Batches
export type BatchStatus = 'sealed' | 'opened' | 'consumed' | 'expired' | 'discarded'

export interface Batch {
  id: string
  nursery_id: string
  product_id: string
  batch_number: string | null
  reception_date: string
  expiry_date: string | null
  opened_at: string | null
  status: BatchStatus
  quantity: number | null
  received_by_id: string
  created_at: string
  updated_at: string
  product?: Product
}

export interface CreateBatchInput {
  product_id: string
  batch_number?: string
  reception_date: string
  expiry_date?: string
  quantity?: number
  received_by_id: string
}

// Temperatures
export interface Temperature {
  id: string
  nursery_id: string
  meal_id: string | null
  batch_id: string | null
  checkpoint_type: CheckpointType
  temperature_value: number
  measured_at: string
  measured_by_id: string
  notes: string | null
  is_compliant: boolean
  created_at: string
  updated_at: string
  batch?: Batch
  meal?: Meal
}

export interface CreateTemperatureInput {
  meal_id?: string
  batch_id?: string
  checkpoint_type: CheckpointType
  temperature_value: number
  measured_at: string
  measured_by_id: string
  notes?: string
  is_compliant: boolean
}

// Meal Items (composition d'un repas)
export interface MealItem {
  id: string
  meal_id: string
  product_id: string
  batch_id: string | null
  quantity: number | null
  unit: string | null
  notes: string | null
  created_at: string
  product?: Product
  batch?: Batch
}

export interface CreateMealItemInput {
  product_id: string
  batch_id?: string
  quantity?: number
  unit?: string
  notes?: string
}

// Product Allergens (allergènes structurés)
export interface ProductAllergen {
  id: string
  product_id: string
  allergy_id: string
  created_at: string
  allergy?: Allergy
}

export interface Allergy {
  id: string
  name: string
  description: string | null
  icon: string | null
  severity: string
  is_common: boolean
  display_order: number
  created_at: string
}

// Menu Templates
export interface MenuTemplate {
  id: string
  nursery_id: string
  name: string
  description: string | null
  meal_type: MealType
  is_active: boolean
  created_at: string
  updated_at: string
  items?: MenuTemplateItem[]
}

export interface MenuTemplateItem {
  id: string
  template_id: string
  product_id: string
  quantity: number | null
  unit: string | null
  notes: string | null
  display_order: number
  created_at: string
  product?: Product
}

export interface CreateMenuTemplateInput {
  name: string
  description?: string
  meal_type: MealType
}

export interface CreateMenuTemplateItemInput {
  product_id: string
  quantity?: number
  unit?: string
  notes?: string
  display_order?: number
}

// Computed meal allergens
export interface MealAllergenInfo {
  allergy_id: string
  allergy_name: string
  allergy_icon: string | null
  severity: string
  from_product_id: string
  from_product_name: string
}

// Non-Compliance
export interface NonCompliance {
  id: string
  nursery_id: string
  type: ComplianceType
  description: string
  discovered_at: string
  discovered_by_id: string
  corrective_action: string | null
  status: ComplianceStatus
  closed_at: string | null
  created_at: string
  updated_at: string
}

export interface CreateNonComplianceInput {
  type: ComplianceType
  description: string
  discovered_at: string
  discovered_by_id: string
  corrective_action?: string
}

export interface UpdateNonComplianceInput {
  type?: ComplianceType
  description?: string
  corrective_action?: string
  status?: ComplianceStatus
  closed_at?: string
}

// Equipment
export interface Equipment {
  id: string
  nursery_id: string
  name: string
  category: string | null
  last_maintenance_date: string | null
  next_maintenance_date: string | null
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateEquipmentInput {
  name: string
  category?: string
  last_maintenance_date?: string
  next_maintenance_date?: string
  notes?: string
}

export interface UpdateEquipmentInput {
  name?: string
  category?: string
  last_maintenance_date?: string
  next_maintenance_date?: string
  notes?: string
  is_active?: boolean
}

// Documents
export interface Document {
  id: string
  nursery_id: string
  title: string
  category: DocumentCategory
  file_key: string
  uploaded_by_id: string
  uploaded_at: string
  created_at: string
  updated_at: string
}

export interface CreateDocumentInput {
  title: string
  category: DocumentCategory
  file_key: string
  uploaded_by_id: string
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class HaccpService {
  private supabase: any

  constructor() {
    this.supabase = createClient()
  }

  // ==========================================================================
  // SUPPLIERS
  // ==========================================================================

  async getSuppliers(nurseryId: string): Promise<Supplier[]> {
    const { data, error } = await this.supabase
      .from('supplier')
      .select('*')
      .eq('nursery_id', nurseryId)
      .order('name', { ascending: true })

    if (error) throw error
    return (data as any[]) || []
  }

  async getActiveSuppliers(nurseryId: string): Promise<Supplier[]> {
    const { data, error } = await this.supabase
      .from('supplier')
      .select('*')
      .eq('nursery_id', nurseryId)
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (error) throw error
    return (data as any[]) || []
  }

  async createSupplier(nurseryId: string, input: CreateSupplierInput): Promise<Supplier> {
    const { data, error } = await this.supabase
      .from('supplier')
      .insert({
        nursery_id: nurseryId,
        ...input,
        is_active: true
      })
      .select()
      .single()

    if (error) throw error
    return data as any
  }

  async updateSupplier(id: string, nurseryId: string, input: UpdateSupplierInput): Promise<Supplier> {
    const { data, error } = await this.supabase
      .from('supplier')
      .update(input)
      .eq('id', id)
      .eq('nursery_id', nurseryId)
      .select()
      .single()

    if (error) throw error
    return data as any
  }

  async deactivateSupplier(id: string, nurseryId: string): Promise<void> {
    const { error } = await this.supabase
      .from('supplier')
      .update({ is_active: false })
      .eq('id', id)
      .eq('nursery_id', nurseryId)

    if (error) throw error
  }

  async deleteSupplier(id: string, nurseryId: string): Promise<void> {
    const { error } = await this.supabase
      .from('supplier')
      .delete()
      .eq('id', id)
      .eq('nursery_id', nurseryId)

    if (error) throw error
  }

  // ==========================================================================
  // PRODUCTS
  // ==========================================================================

  async getProducts(nurseryId: string): Promise<Product[]> {
    const { data, error } = await this.supabase
      .from('product')
      .select('*, supplier(*)')
      .eq('nursery_id', nurseryId)
      .order('name', { ascending: true })

    if (error) throw error
    return (data as any[]) || []
  }

  async getActiveProducts(nurseryId: string): Promise<Product[]> {
    const { data, error } = await this.supabase
      .from('product')
      .select('*, supplier(*)')
      .eq('nursery_id', nurseryId)
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (error) throw error
    return (data as any[]) || []
  }

  async createProduct(nurseryId: string, input: CreateProductInput): Promise<Product> {
    const { data, error } = await this.supabase
      .from('product')
      .insert({
        nursery_id: nurseryId,
        ...input,
        is_active: true
      })
      .select()
      .single()

    if (error) throw error
    return data as any
  }

  async updateProduct(id: string, nurseryId: string, input: UpdateProductInput): Promise<Product> {
    const { data, error } = await this.supabase
      .from('product')
      .update(input)
      .eq('id', id)
      .eq('nursery_id', nurseryId)
      .select()
      .single()

    if (error) throw error
    return data as any
  }

  async deleteProduct(id: string, nurseryId: string): Promise<void> {
    const { error } = await this.supabase
      .from('product')
      .delete()
      .eq('id', id)
      .eq('nursery_id', nurseryId)

    if (error) throw error
  }

  async deleteProductWithCascade(id: string, nurseryId: string): Promise<void> {
    // Supprimer d'abord les éléments liés qui ont ON DELETE RESTRICT

    // 1. Supprimer les meal_items liés (si la table existe)
    await this.supabase
      .from('meal_item')
      .delete()
      .eq('product_id', id)

    // 2. Supprimer les menu_template_items liés (si la table existe)
    await this.supabase
      .from('menu_template_item')
      .delete()
      .eq('product_id', id)

    // 3. Supprimer les product_allergens liés
    await this.supabase
      .from('product_allergen')
      .delete()
      .eq('product_id', id)

    // 4. Supprimer les batches liés (normalement CASCADE mais on le fait explicitement)
    await this.supabase
      .from('batch')
      .delete()
      .eq('product_id', id)

    // 5. Enfin, supprimer le produit
    const { error } = await this.supabase
      .from('product')
      .delete()
      .eq('id', id)
      .eq('nursery_id', nurseryId)

    if (error) throw error
  }

  async getProductByBarcode(nurseryId: string, barcode: string): Promise<Product | null> {
    const { data, error } = await this.supabase
      .from('product')
      .select('*, supplier(*)')
      .eq('nursery_id', nurseryId)
      .eq('barcode', barcode)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }
    return data as any
  }

  // ==========================================================================
  // MEALS
  // ==========================================================================

  async getMeals(nurseryId: string, startDate?: string, endDate?: string): Promise<Meal[]> {
    let query = this.supabase
      .from('meal')
      .select('*')
      .eq('nursery_id', nurseryId)

    if (startDate) query = query.gte('date', startDate)
    if (endDate) query = query.lte('date', endDate)

    const { data, error } = await query.order('date', { ascending: false })

    if (error) throw error
    return (data as any[]) || []
  }

  async getMealsByDate(nurseryId: string, startDate: string, endDate?: string): Promise<Meal[]> {
    let query = this.supabase
      .from('meal')
      .select('*')
      .eq('nursery_id', nurseryId)
      .gte('date', startDate)

    if (endDate) {
      query = query.lte('date', endDate)
    }

    const { data, error } = await query.order('type', { ascending: true })

    if (error) throw error
    return (data as any[]) || []
  }

  async recordMealServings(servings: Array<{
    meal_id: string
    child_id: string
    portion_size: string
    comments: string | null
    recorded_by_id: string
  }>): Promise<void> {
    const { error } = await this.supabase
      .from('child_meal_record')
      .insert(servings)

    if (error) throw error
  }

  async recordTemperatures(temperatures: Array<{
    meal_id: string
    checkpoint: string
    temperature: number
    compliant: boolean
    notes: string | null
    checked_by_id: string
    checked_at: string
  }>): Promise<void> {
    const records = temperatures.map(t => ({
      meal_id: t.meal_id,
      checkpoint_type: t.checkpoint,
      temperature_value: t.temperature,
      is_compliant: t.compliant,
      notes: t.notes,
      measured_by_id: t.checked_by_id,
      measured_at: t.checked_at
    }))

    const { error } = await this.supabase
      .from('temperature_check')
      .insert(records)

    if (error) throw error
  }

  async createMeal(nurseryId: string, input: CreateMealInput): Promise<Meal> {
    const { data, error } = await this.supabase
      .from('meal')
      .insert({
        nursery_id: nurseryId,
        ...input,
        is_validated: false
      })
      .select()
      .single()

    if (error) throw error
    return data as any
  }

  async updateMeal(id: string, nurseryId: string, input: UpdateMealInput): Promise<Meal> {
    const { data, error } = await this.supabase
      .from('meal')
      .update(input)
      .eq('id', id)
      .eq('nursery_id', nurseryId)
      .select()
      .single()

    if (error) throw error
    return data as any
  }

  async deleteMeal(id: string, nurseryId: string): Promise<void> {
    const { error } = await this.supabase
      .from('meal')
      .delete()
      .eq('id', id)
      .eq('nursery_id', nurseryId)

    if (error) throw error
  }

  // ==========================================================================
  // BATCHES
  // ==========================================================================

  async getBatches(nurseryId: string): Promise<Batch[]> {
    const { data, error } = await this.supabase
      .from('batch')
      .select('*, product(*, supplier(*))')
      .eq('nursery_id', nurseryId)
      .order('reception_date', { ascending: false })

    if (error) throw error
    return (data as any[]) || []
  }

  async createBatch(nurseryId: string, input: CreateBatchInput): Promise<Batch> {
    const { data, error } = await this.supabase
      .from('batch')
      .insert({
        nursery_id: nurseryId,
        product_id: input.product_id,
        batch_code: input.batch_number || null,
        reception_date: input.reception_date,
        expiry_date: input.expiry_date || null,
        received_quantity: input.quantity ?? null,
        received_by_id: input.received_by_id || null,
        status: 'sealed'
      })
      .select()
      .single()

    if (error) throw error
    return data as any
  }

  async getBatchesByProduct(nurseryId: string, productId: string): Promise<Batch[]> {
    const { data, error } = await this.supabase
      .from('batch')
      .select('*, product(*, supplier(*))')
      .eq('nursery_id', nurseryId)
      .eq('product_id', productId)
      .order('reception_date', { ascending: false })

    if (error) throw error
    return (data as any[]) || []
  }

  async getActiveBatchesByProduct(nurseryId: string, productId: string): Promise<Batch[]> {
    const { data, error } = await this.supabase
      .from('batch')
      .select('*, product(*, supplier(*))')
      .eq('nursery_id', nurseryId)
      .eq('product_id', productId)
      .in('status', ['sealed', 'opened'])
      .order('expiry_date', { ascending: true })

    if (error) throw error
    return (data as any[]) || []
  }

  async getBatchHistory(nurseryId: string): Promise<Batch[]> {
    const { data, error } = await this.supabase
      .from('batch')
      .select('*, product(*, supplier(*))')
      .eq('nursery_id', nurseryId)
      .in('status', ['consumed', 'discarded', 'expired'])
      .order('updated_at', { ascending: false })
      .limit(100)

    if (error) throw error
    return (data as any[]) || []
  }

  async getActiveBatches(nurseryId: string): Promise<Batch[]> {
    const { data, error } = await this.supabase
      .from('batch')
      .select('*, product(*, supplier(*))')
      .eq('nursery_id', nurseryId)
      .in('status', ['sealed', 'opened'])
      .order('expiry_date', { ascending: true })

    if (error) throw error
    return (data as any[]) || []
  }

  async getExpiringBatches(nurseryId: string, daysAhead: number = 3): Promise<Batch[]> {
    const today = new Date()
    const futureDate = new Date()
    futureDate.setDate(today.getDate() + daysAhead)
    const futureDateStr = futureDate.toISOString().split('T')[0]

    const { data, error } = await this.supabase
      .from('batch')
      .select('*, product(*, supplier(*))')
      .eq('nursery_id', nurseryId)
      .in('status', ['sealed', 'opened'])
      .not('expiry_date', 'is', null)
      .lte('expiry_date', futureDateStr)
      .order('expiry_date', { ascending: true })

    if (error) throw error
    return (data as any[]) || []
  }

  async markBatchOpened(id: string, nurseryId: string): Promise<Batch> {
    const { data, error } = await this.supabase
      .from('batch')
      .update({
        opened_at: new Date().toISOString(),
        status: 'opened',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('nursery_id', nurseryId)
      .select()
      .single()

    if (error) throw error
    return data as any
  }

  async updateBatchStatus(id: string, nurseryId: string, status: BatchStatus): Promise<Batch> {
    const { data, error } = await this.supabase
      .from('batch')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('nursery_id', nurseryId)
      .select()
      .single()

    if (error) throw error
    return data as any
  }

  async deleteBatch(id: string, nurseryId: string): Promise<void> {
    const { error } = await this.supabase
      .from('batch')
      .delete()
      .eq('id', id)
      .eq('nursery_id', nurseryId)

    if (error) throw error
  }

  // ==========================================================================
  // TEMPERATURES
  // ==========================================================================

  async getTemperatures(nurseryId: string, startDate?: string, endDate?: string): Promise<Temperature[]> {
    let query = this.supabase
      .from('temperature_check')
      .select('*')
      .eq('nursery_id', nurseryId)

    if (startDate) query = query.gte('measured_at', startDate)
    if (endDate) query = query.lte('measured_at', endDate)

    const { data, error } = await query.order('measured_at', { ascending: false })

    if (error) throw error
    return (data as any[]) || []
  }

  async createTemperature(nurseryId: string, input: CreateTemperatureInput): Promise<Temperature> {
    const { data, error } = await this.supabase
      .from('temperature_check')
      .insert({
        nursery_id: nurseryId,
        ...input
      })
      .select()
      .single()

    if (error) throw error
    return data as any
  }

  // ==========================================================================
  // NON-COMPLIANCE
  // ==========================================================================

  async getNonCompliances(nurseryId: string): Promise<NonCompliance[]> {
    const { data, error } = await this.supabase
      .from('haccp_incident')
      .select('*')
      .eq('nursery_id', nurseryId)
      .order('discovered_at', { ascending: false })

    if (error) throw error
    return (data as any[]) || []
  }

  async createNonCompliance(nurseryId: string, input: CreateNonComplianceInput): Promise<NonCompliance> {
    const { data, error } = await this.supabase
      .from('haccp_incident')
      .insert({
        nursery_id: nurseryId,
        ...input,
        status: 'Open'
      })
      .select()
      .single()

    if (error) throw error
    return data as any
  }

  async updateNonCompliance(id: string, nurseryId: string, input: UpdateNonComplianceInput): Promise<NonCompliance> {
    const { data, error } = await this.supabase
      .from('haccp_incident')
      .update(input)
      .eq('id', id)
      .eq('nursery_id', nurseryId)
      .select()
      .single()

    if (error) throw error
    return data as any
  }

  // ==========================================================================
  // EQUIPMENT
  // ==========================================================================

  async getEquipment(nurseryId: string): Promise<Equipment[]> {
    const { data, error } = await this.supabase
      .from('equipment')
      .select('*')
      .eq('nursery_id', nurseryId)
      .order('name', { ascending: true })

    if (error) throw error
    return (data as any[]) || []
  }

  async createEquipment(nurseryId: string, input: CreateEquipmentInput): Promise<Equipment> {
    const { data, error } = await this.supabase
      .from('equipment')
      .insert({
        nursery_id: nurseryId,
        ...input,
        is_active: true
      })
      .select()
      .single()

    if (error) throw error
    return data as any
  }

  async updateEquipment(id: string, nurseryId: string, input: UpdateEquipmentInput): Promise<Equipment> {
    const { data, error } = await this.supabase
      .from('equipment')
      .update(input)
      .eq('id', id)
      .eq('nursery_id', nurseryId)
      .select()
      .single()

    if (error) throw error
    return data as any
  }

  // ==========================================================================
  // DOCUMENTS
  // ==========================================================================

  async getDocuments(nurseryId: string): Promise<Document[]> {
    const { data, error } = await this.supabase
      .from('document')
      .select('*')
      .eq('nursery_id', nurseryId)
      .order('uploaded_at', { ascending: false })

    if (error) throw error
    return (data as any[]) || []
  }

  async createDocument(nurseryId: string, input: CreateDocumentInput): Promise<Document> {
    const { data, error } = await this.supabase
      .from('document')
      .insert({
        nursery_id: nurseryId,
        ...input
      })
      .select()
      .single()

    if (error) throw error
    return data as any
  }

  async deleteDocument(id: string, nurseryId: string): Promise<void> {
    const { error } = await this.supabase
      .from('document')
      .delete()
      .eq('id', id)
      .eq('nursery_id', nurseryId)

    if (error) throw error
  }

  // ==========================================================================
  // STATS & ANALYTICS
  // ==========================================================================

  async getHaccpStats(nurseryId: string): Promise<{
    totalChildren: number
    activeChildren: number
    totalProducts: number
    totalSuppliers: number
    openNonCompliances: number
    todayMeals: number
  }> {
    const today = new Date().toISOString().split('T')[0]

    const [
      { count: totalChildren },
      { count: activeChildren },
      { count: totalProducts },
      { count: totalSuppliers },
      { count: openNonCompliances },
      { count: todayMeals }
    ] = await Promise.all([
      this.supabase.from('child').select('*', { count: 'exact', head: true }).eq('nursery_id', nurseryId),
      this.supabase.from('child').select('*', { count: 'exact', head: true }).eq('nursery_id', nurseryId).eq('is_active', true),
      this.supabase.from('product').select('*', { count: 'exact', head: true }).eq('nursery_id', nurseryId).eq('is_active', true),
      this.supabase.from('supplier').select('*', { count: 'exact', head: true }).eq('nursery_id', nurseryId).eq('is_active', true),
      this.supabase.from('haccp_incident').select('*', { count: 'exact', head: true }).eq('nursery_id', nurseryId).eq('status', 'Open'),
      this.supabase.from('meal').select('*', { count: 'exact', head: true }).eq('nursery_id', nurseryId).eq('date', today)
    ])

    return {
      totalChildren: totalChildren || 0,
      activeChildren: activeChildren || 0,
      totalProducts: totalProducts || 0,
      totalSuppliers: totalSuppliers || 0,
      openNonCompliances: openNonCompliances || 0,
      todayMeals: todayMeals || 0
    }
  }

  // ==========================================================================
  // ALLERGIES (Reference table)
  // ==========================================================================

  async getAllergies(): Promise<Allergy[]> {
    const { data, error } = await this.supabase
      .from('allergy')
      .select('*')
      .order('display_order', { ascending: true })

    if (error) throw error
    return (data as any[]) || []
  }

  // ==========================================================================
  // MEAL ITEMS (Composition d'un repas)
  // ==========================================================================

  async getMealItems(mealId: string): Promise<MealItem[]> {
    const { data, error } = await this.supabase
      .from('meal_item')
      .select('*, product(*, supplier(*)), batch(*)')
      .eq('meal_id', mealId)

    if (error) throw error
    return (data as any[]) || []
  }

  async addMealItem(mealId: string, input: CreateMealItemInput): Promise<MealItem> {
    const { data, error } = await this.supabase
      .from('meal_item')
      .insert({
        meal_id: mealId,
        ...input
      })
      .select('*, product(*, supplier(*)), batch(*)')
      .single()

    if (error) throw error
    return data as any
  }

  async updateMealItem(id: string, input: Partial<CreateMealItemInput>): Promise<MealItem> {
    const { data, error } = await this.supabase
      .from('meal_item')
      .update(input)
      .eq('id', id)
      .select('*, product(*, supplier(*)), batch(*)')
      .single()

    if (error) throw error
    return data as any
  }

  async removeMealItem(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('meal_item')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  async setMealItems(mealId: string, items: CreateMealItemInput[]): Promise<MealItem[]> {
    // Delete existing items
    await this.supabase
      .from('meal_item')
      .delete()
      .eq('meal_id', mealId)

    if (items.length === 0) return []

    // Insert new items
    const { data, error } = await this.supabase
      .from('meal_item')
      .insert(items.map(item => ({ meal_id: mealId, ...item })))
      .select('*, product(*, supplier(*)), batch(*)')

    if (error) throw error
    return (data as any[]) || []
  }

  // Get computed allergens for a meal based on its products
  async getMealComputedAllergens(mealId: string): Promise<MealAllergenInfo[]> {
    const { data, error } = await this.supabase
      .rpc('get_meal_allergens', { p_meal_id: mealId })

    if (error) throw error
    return (data as any[]) || []
  }

  // Get meal with items and computed allergens
  async getMealWithItems(mealId: string): Promise<Meal & { items: MealItem[], computed_allergens: MealAllergenInfo[] }> {
    const [meal, items, allergens] = await Promise.all([
      this.supabase.from('meal').select('*').eq('id', mealId).single(),
      this.getMealItems(mealId),
      this.getMealComputedAllergens(mealId)
    ])

    if (meal.error) throw meal.error

    return {
      ...(meal.data as any),
      items,
      computed_allergens: allergens
    }
  }

  // ==========================================================================
  // PRODUCT ALLERGENS (Allergènes structurés)
  // ==========================================================================

  async getProductAllergens(productId: string): Promise<ProductAllergen[]> {
    const { data, error } = await this.supabase
      .from('product_allergen')
      .select('*, allergy(*)')
      .eq('product_id', productId)

    if (error) throw error
    return (data as any[]) || []
  }

  async setProductAllergens(productId: string, allergyIds: string[]): Promise<void> {
    // Delete existing
    await this.supabase
      .from('product_allergen')
      .delete()
      .eq('product_id', productId)

    if (allergyIds.length === 0) return

    // Insert new
    const { error } = await this.supabase
      .from('product_allergen')
      .insert(allergyIds.map(allergyId => ({
        product_id: productId,
        allergy_id: allergyId
      })))

    if (error) throw error
  }

  async addProductAllergen(productId: string, allergyId: string): Promise<void> {
    const { error } = await this.supabase
      .from('product_allergen')
      .insert({ product_id: productId, allergy_id: allergyId })

    if (error && error.code !== '23505') throw error // Ignore duplicate
  }

  async removeProductAllergen(productId: string, allergyId: string): Promise<void> {
    const { error } = await this.supabase
      .from('product_allergen')
      .delete()
      .eq('product_id', productId)
      .eq('allergy_id', allergyId)

    if (error) throw error
  }

  // Get products with their structured allergens
  async getProductsWithAllergens(nurseryId: string): Promise<(Product & { product_allergens: ProductAllergen[] })[]> {
    const { data, error } = await this.supabase
      .from('product')
      .select('*, supplier(*), product_allergen(*, allergy(*))')
      .eq('nursery_id', nurseryId)
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (error) throw error
    return (data as any[]) || []
  }

  // ==========================================================================
  // MENU TEMPLATES
  // ==========================================================================

  async getMenuTemplates(nurseryId: string): Promise<MenuTemplate[]> {
    const { data, error } = await this.supabase
      .from('menu_template')
      .select('*, menu_template_item(*, product(*))')
      .eq('nursery_id', nurseryId)
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (error) throw error
    return (data as any[]).map(t => ({
      ...t,
      items: t.menu_template_item || []
    })) || []
  }

  async getMenuTemplatesByType(nurseryId: string, mealType: MealType): Promise<MenuTemplate[]> {
    const { data, error } = await this.supabase
      .from('menu_template')
      .select('*, menu_template_item(*, product(*))')
      .eq('nursery_id', nurseryId)
      .eq('meal_type', mealType)
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (error) throw error
    return (data as any[]).map(t => ({
      ...t,
      items: t.menu_template_item || []
    })) || []
  }

  async createMenuTemplate(nurseryId: string, input: CreateMenuTemplateInput): Promise<MenuTemplate> {
    const { data, error } = await this.supabase
      .from('menu_template')
      .insert({
        nursery_id: nurseryId,
        ...input,
        is_active: true
      })
      .select()
      .single()

    if (error) throw error
    return data as any
  }

  async updateMenuTemplate(id: string, nurseryId: string, input: Partial<CreateMenuTemplateInput>): Promise<MenuTemplate> {
    const { data, error } = await this.supabase
      .from('menu_template')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('nursery_id', nurseryId)
      .select()
      .single()

    if (error) throw error
    return data as any
  }

  async deleteMenuTemplate(id: string, nurseryId: string): Promise<void> {
    const { error } = await this.supabase
      .from('menu_template')
      .update({ is_active: false })
      .eq('id', id)
      .eq('nursery_id', nurseryId)

    if (error) throw error
  }

  async setMenuTemplateItems(templateId: string, items: CreateMenuTemplateItemInput[]): Promise<MenuTemplateItem[]> {
    // Delete existing
    await this.supabase
      .from('menu_template_item')
      .delete()
      .eq('template_id', templateId)

    if (items.length === 0) return []

    // Insert new
    const { data, error } = await this.supabase
      .from('menu_template_item')
      .insert(items.map((item, index) => ({
        template_id: templateId,
        ...item,
        display_order: item.display_order ?? index
      })))
      .select('*, product(*)')

    if (error) throw error
    return (data as any[]) || []
  }

  // Apply a menu template to a meal (creates meal items from template)
  async applyMenuTemplateToMeal(mealId: string, templateId: string): Promise<MealItem[]> {
    // Get template items
    const { data: templateItems, error: fetchError } = await this.supabase
      .from('menu_template_item')
      .select('*')
      .eq('template_id', templateId)

    if (fetchError) throw fetchError

    // Convert to meal items
    const mealItemInputs: CreateMealItemInput[] = (templateItems || []).map((ti: any) => ({
      product_id: ti.product_id,
      quantity: ti.quantity,
      unit: ti.unit,
      notes: ti.notes
    }))

    return this.setMealItems(mealId, mealItemInputs)
  }

  // ==========================================================================
  // TEMPERATURES WITH BATCH LINKING
  // ==========================================================================

  async getTemperaturesWithBatches(nurseryId: string, startDate?: string, endDate?: string): Promise<Temperature[]> {
    let query = this.supabase
      .from('temperature_check')
      .select('*, batch(*, product(*)), meal(*)')
      .eq('nursery_id', nurseryId)

    if (startDate) query = query.gte('measured_at', startDate)
    if (endDate) query = query.lte('measured_at', endDate)

    const { data, error } = await query.order('measured_at', { ascending: false })

    if (error) throw error
    return (data as any[]) || []
  }

  async createTemperatureWithBatch(nurseryId: string, input: CreateTemperatureInput): Promise<Temperature> {
    const { data, error } = await this.supabase
      .from('temperature_check')
      .insert({
        nursery_id: nurseryId,
        ...input
      })
      .select('*, batch(*, product(*)), meal(*)')
      .single()

    if (error) throw error
    return data as any
  }
}

export const haccpService = new HaccpService()

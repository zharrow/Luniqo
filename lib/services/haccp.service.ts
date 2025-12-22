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

export type Section = 'Babies' | 'Toddlers' | 'Preschoolers'
export type MealType = 'Breakfast' | 'Lunch' | 'Snack'
export type CheckpointType = 'Reception' | 'Holding' | 'Service' | 'Storage'
export type ComplianceType = 'Product' | 'Temperature' | 'Hygiene' | 'Other'
export type ComplianceStatus = 'Open' | 'Corrected' | 'Closed'
export type DocumentCategory = 'Temperatures' | 'Cleaning' | 'Training' | 'Compliance' | 'Other'

// Children
export interface Child {
  id: string
  nursery_id: string
  first_name: string
  last_name: string
  birth_date: string
  section: Section
  allergies: string | null
  specific_diet: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateChildInput {
  first_name: string
  last_name: string
  birth_date: string
  section: Section
  allergies?: string
  specific_diet?: string
}

export interface UpdateChildInput {
  first_name?: string
  last_name?: string
  birth_date?: string
  section?: Section
  allergies?: string
  specific_diet?: string
  is_active?: boolean
}

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
}

export interface UpdateProductInput {
  supplier_id?: string
  name?: string
  category?: string
  allergens?: string
  shelf_life_days?: number
  storage_conditions?: string
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
export interface Batch {
  id: string
  nursery_id: string
  product_id: string
  batch_number: string | null
  reception_date: string
  expiry_date: string | null
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
  checkpoint_type: CheckpointType
  temperature_value: number
  measured_at: string
  measured_by_id: string
  notes: string | null
  is_compliant: boolean
  created_at: string
  updated_at: string
}

export interface CreateTemperatureInput {
  meal_id?: string
  checkpoint_type: CheckpointType
  temperature_value: number
  measured_at: string
  measured_by_id: string
  notes?: string
  is_compliant: boolean
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
  // CHILDREN
  // ==========================================================================

  async getChildren(nurseryId: string): Promise<Child[]> {
    const { data, error } = await this.supabase
      .from('child')
      .select('*')
      .eq('nursery_id', nurseryId)
      .order('last_name', { ascending: true })

    if (error) throw error
    return (data as any[]) || []
  }

  async getActiveChildren(nurseryId: string): Promise<Child[]> {
    const { data, error } = await this.supabase
      .from('child')
      .select('*')
      .eq('nursery_id', nurseryId)
      .eq('is_active', true)
      .order('last_name', { ascending: true })

    if (error) throw error
    return (data as any[]) || []
  }

  async getChildById(id: string, nurseryId: string): Promise<Child | null> {
    const { data, error } = await this.supabase
      .from('child')
      .select('*')
      .eq('id', id)
      .eq('nursery_id', nurseryId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }
    return data as any
  }

  async createChild(nurseryId: string, input: CreateChildInput): Promise<Child> {
    const { data, error } = await this.supabase
      .from('child')
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

  async updateChild(id: string, nurseryId: string, input: UpdateChildInput): Promise<Child> {
    const { data, error } = await this.supabase
      .from('child')
      .update(input)
      .eq('id', id)
      .eq('nursery_id', nurseryId)
      .select()
      .single()

    if (error) throw error
    return data as any
  }

  async deleteChild(id: string, nurseryId: string): Promise<void> {
    const { error } = await this.supabase
      .from('child')
      .update({ is_active: false })
      .eq('id', id)
      .eq('nursery_id', nurseryId)

    if (error) throw error
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

  async deleteSupplier(id: string, nurseryId: string): Promise<void> {
    const { error } = await this.supabase
      .from('supplier')
      .update({ is_active: false })
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
      .update({ is_active: false })
      .eq('id', id)
      .eq('nursery_id', nurseryId)

    if (error) throw error
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
        ...input
      })
      .select()
      .single()

    if (error) throw error
    return data as any
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
}

export const haccpService = new HaccpService()

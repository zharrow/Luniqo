/**
 * 🌱 Seed Data Script for Luniqo App (Next.js + Supabase)
 * Updated for Unified Profiles Architecture (2025-12-07)
 *
 * This script populates the database with test data for development.
 * It creates users via Supabase Auth and lets the trigger create profiles.
 *
 * Run with:
 *   npx ts-node scripts/seed.ts
 *
 * Or via npm:
 *   npm run seed
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import * as bcrypt from 'bcryptjs'

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables!')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// Use service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Helper to hash PIN codes with bcrypt
function hashPin(pin: string): string {
  return bcrypt.hashSync(pin, 10)
}

// Generate username like "Marie D", "Marie Du", etc.
function generateUsername(firstName: string, lastName: string, suffix = 1): string {
  return `${firstName} ${lastName.substring(0, suffix).toUpperCase()}`
}

async function clearDatabase() {
  console.log('🧹 Clearing existing data...')

  // Delete in reverse dependency order
  const tables = [
    'notification',
    'message',
    'support_conversation',
    'child_meal_record',
    'document',
    'haccp_incident',
    'food_area_cleaning',
    'equipment',
    'batch',
    'temperature_check',
    'meal',
    'product',
    'supplier',
    'child',
    'session_export',
    'task_completion',
    'daily_cleaning_session',
    'assigned_task',
    'task_template',
    'employee_room_access',
    'room',
    'enterprise',
    'profiles'
  ]

  for (const table of tables) {
    const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000')
    if (error && error.code !== 'PGRST116') {
      console.warn(`⚠️  Warning deleting ${table}:`, error.message)
    }
  }

  // Delete auth users
  console.log('🔐 Clearing auth users...')
  const { data: authUsers } = await supabase.auth.admin.listUsers()
  if (authUsers?.users) {
    for (const user of authUsers.users) {
      await supabase.auth.admin.deleteUser(user.id)
    }
    console.log(`   Deleted ${authUsers.users.length} auth user(s)`)
  }

  console.log('✅ Database cleared')
}

async function seedDeveloper() {
  console.log('👨‍💻 Creating developer...')

  // Create auth user with Developer role
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: 'dev@luniqo.fr',
    password: 'admin123',
    email_confirm: true,
    user_metadata: {
      role: 'Developer',
      first_name: 'Admin',
      last_name: 'Dev'
    }
  })

  if (authError) throw authError

  console.log(`✅ Created developer: dev@luniqo.fr`)
  return authData.user
}

async function seedOwnersAndEnterprises() {
  console.log('👔 Creating owners and enterprises...')

  const owners = [
    { email: 'admin@petitspas.fr', first_name: 'Marie', last_name: 'Dubois', enterprise_name: 'Crèche Les Petits Pas' },
    { email: 'admin@leslucioles.fr', first_name: 'Jean', last_name: 'Martin', enterprise_name: 'Micro-Crèche Les Lucioles' }
  ]

  const createdOwners = []
  const createdEnterprises = []

  for (const owner of owners) {
    // Create auth user with Owner role
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: owner.email,
      password: 'admin123',
      email_confirm: true,
      user_metadata: {
        role: 'Owner',
        first_name: owner.first_name,
        last_name: owner.last_name
      }
    })

    if (authError) throw authError

    // Get the profile created by the trigger
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single()

    if (profileError) throw profileError

    createdOwners.push(profile)

    // Create enterprise for this owner
    const { data: enterprise, error: enterpriseError } = await supabase
      .from('enterprise')
      .insert({
        owner_id: authData.user.id,
        name: owner.enterprise_name,
        legal_form: 'SARL',
        siret: Math.random().toString().slice(2, 16)
      })
      .select()
      .single()

    if (enterpriseError) throw enterpriseError

    createdEnterprises.push(enterprise)
    console.log(`   ✅ Owner: ${owner.email} -> ${owner.enterprise_name}`)
  }

  console.log(`✅ Created ${createdOwners.length} owner(s) with enterprises`)
  return { owners: createdOwners, enterprises: createdEnterprises }
}

async function seedRooms(enterpriseId: string) {
  console.log('🏠 Creating rooms...')

  const rooms = [
    { name: 'Salle de jeu', description: 'Grande salle de jeu principale', display_order: 1 },
    { name: 'Salle de repos', description: 'Espace calme pour la sieste', display_order: 2 },
    { name: 'Salle d\'éveil', description: 'Activités sensorielles', display_order: 3 },
    { name: 'Cuisine', description: 'Préparation des repas', display_order: 4 },
    { name: 'Sanitaires', description: 'Toilettes et change', display_order: 5 },
    { name: 'Entrée', description: 'Hall d\'accueil', display_order: 6 }
  ].map(r => ({ ...r, enterprise_id: enterpriseId, is_active: true }))

  const { data, error } = await supabase
    .from('room')
    .insert(rooms)
    .select()

  if (error) throw error
  console.log(`✅ Created ${data.length} room(s)`)
  return data
}

async function seedTasks(enterpriseId: string) {
  console.log('📋 Creating task templates...')

  const tasks = [
    // Sols
    { name: 'Aspirer les sols', category: 'Sols', estimated_duration: 15 },
    { name: 'Laver les sols', category: 'Sols', estimated_duration: 20 },
    { name: 'Shampouiner la moquette', category: 'Sols', estimated_duration: 90 },
    { name: 'Décaper les sols', category: 'Sols', estimated_duration: 60 },

    // Hygiène
    { name: 'Désinfecter les surfaces', category: 'Hygiène', estimated_duration: 10 },
    { name: 'Désinfecter les jouets', category: 'Hygiène', estimated_duration: 45 },
    { name: 'Désinfecter les tables à langer', category: 'Hygiène', estimated_duration: 15 },
    { name: 'Désinfecter les chaises hautes', category: 'Hygiène', estimated_duration: 20 },
    { name: 'Nettoyer les tapis d\'éveil', category: 'Hygiène', estimated_duration: 30 },

    // Sanitaires
    { name: 'Nettoyer les sanitaires', category: 'Sanitaires', estimated_duration: 15 },
    { name: 'Désinfecter les toilettes enfants', category: 'Sanitaires', estimated_duration: 10 },
    { name: 'Nettoyer les lavabos', category: 'Sanitaires', estimated_duration: 10 },
    { name: 'Réapprovisionner les sanitaires', category: 'Sanitaires', estimated_duration: 5 },

    // Entretien
    { name: 'Vider les poubelles', category: 'Entretien', estimated_duration: 5 },
    { name: 'Nettoyer les climatiseurs', category: 'Entretien', estimated_duration: 60 },
    { name: 'Dépoussiérer les meubles', category: 'Entretien', estimated_duration: 20 },
    { name: 'Nettoyer les portes et poignées', category: 'Entretien', estimated_duration: 15 },
    { name: 'Nettoyer les plinthes', category: 'Entretien', estimated_duration: 25 },

    // Vitres
    { name: 'Nettoyer les vitres', category: 'Vitres', estimated_duration: 30 },
    { name: 'Nettoyer les miroirs', category: 'Vitres', estimated_duration: 15 },

    // Cuisine
    { name: 'Nettoyer le réfrigérateur', category: 'Cuisine', estimated_duration: 45 },
    { name: 'Nettoyer le four', category: 'Cuisine', estimated_duration: 60 },
    { name: 'Désinfecter les plans de travail', category: 'Cuisine', estimated_duration: 15 },
    { name: 'Nettoyer la vaisselle', category: 'Cuisine', estimated_duration: 30 },

    // Extérieur
    { name: 'Balayer la cour', category: 'Extérieur', estimated_duration: 20 },
    { name: 'Nettoyer les jeux extérieurs', category: 'Extérieur', estimated_duration: 30 },

    // Gestion
    { name: 'Inventaire produits', category: 'Gestion', estimated_duration: 120 },
    { name: 'Vérifier les stocks de nettoyage', category: 'Gestion', estimated_duration: 15 }
  ].map(t => ({
    ...t,
    enterprise_id: enterpriseId,
    description: `Tâche de ${t.category.toLowerCase()}`,
    is_active: true
  }))

  const { data, error } = await supabase
    .from('task_template')
    .insert(tasks)
    .select()

  if (error) throw error
  console.log(`✅ Created ${data.length} task template(s)`)
  return data
}

async function seedEmployees(enterpriseId: string, ownerId: string, roomIds: string[]) {
  console.log('👥 Creating employees...')

  const employees = [
    { first_name: 'Sophie', last_name: 'Bernard', email: 'sophie@example.com', pin: '1234' },
    { first_name: 'Lucas', last_name: 'Petit', email: 'lucas@example.com', pin: '2345' }
  ]

  const createdEmployees = []

  for (const employee of employees) {
    // Create auth user with Employee role
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: employee.email,
      password: 'password123',
      email_confirm: true,
      user_metadata: {
        role: 'Employee',
        first_name: employee.first_name,
        last_name: employee.last_name,
        enterprise_id: enterpriseId,
        created_by_id: ownerId
      }
    })

    if (authError) throw authError

    // Generate username and set PIN on the profile
    const username = generateUsername(employee.first_name, employee.last_name)
    const pinHash = hashPin(employee.pin)

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        username: username,
        pin_hash: pinHash
      })
      .eq('id', authData.user.id)

    if (updateError) throw updateError

    // Get the updated profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single()

    if (profileError) throw profileError

    createdEmployees.push(profile)
    console.log(`   ✅ Employee: ${employee.email} (PIN: ${employee.pin}, Username: ${username})`)
  }

  console.log(`✅ Created ${createdEmployees.length} employee(s)`)

  // Assign rooms to employees
  const employeeRoomAccess = createdEmployees.flatMap(employee =>
    roomIds.slice(0, Math.floor(Math.random() * 3) + 2).map(roomId => ({
      employee_id: employee.id,
      room_id: roomId
    }))
  )

  const { error: roomError } = await supabase
    .from('employee_room_access')
    .insert(employeeRoomAccess)

  if (roomError) throw roomError
  console.log(`✅ Created ${employeeRoomAccess.length} employee-room access assignment(s)`)

  return createdEmployees
}

async function seedChildren(enterpriseId: string) {
  console.log('👶 Creating children...')

  const children = [
    { first_name: 'Louis', last_name: 'Dupont', birth_date: '2022-03-15', section: 'Babies', allergies: null },
    { first_name: 'Chloé', last_name: 'Martin', birth_date: '2021-08-22', section: 'Toddlers', allergies: 'Lactose' },
    { first_name: 'Hugo', last_name: 'Bernard', birth_date: '2020-11-10', section: 'Preschoolers', allergies: null },
    { first_name: 'Manon', last_name: 'Petit', birth_date: '2022-01-05', section: 'Babies', allergies: 'Arachides, Oeufs' },
    { first_name: 'Noah', last_name: 'Roux', birth_date: '2021-06-18', section: 'Toddlers', allergies: null }
  ].map(c => ({ ...c, enterprise_id: enterpriseId, is_active: true }))

  const { data, error } = await supabase
    .from('child')
    .insert(children)
    .select()

  if (error) throw error
  console.log(`✅ Created ${data.length} child(ren)`)
  return data
}

async function seedSuppliers(enterpriseId: string) {
  console.log('🏪 Creating suppliers...')

  const suppliers = [
    { name: 'Bio Fruits & Légumes', contact_name: 'Pierre Durand', phone: '0123456789', email: 'contact@biofruits.fr', haccp_certified: true },
    { name: 'Laiterie Régionale', contact_name: 'Marie Legrand', phone: '0234567890', email: 'info@laiterie.fr', haccp_certified: true },
    { name: 'Boucherie du Marché', contact_name: 'Jean Moreau', phone: '0345678901', email: 'boucher@marche.fr', haccp_certified: false }
  ].map(s => ({ ...s, enterprise_id: enterpriseId }))

  const { data, error } = await supabase
    .from('supplier')
    .insert(suppliers)
    .select()

  if (error) throw error
  console.log(`✅ Created ${data.length} supplier(s)`)
  return data
}

async function seedProducts(enterpriseId: string, supplierIds: string[]) {
  console.log('🥦 Creating products...')

  const today = new Date()

  const products = [
    { name: 'Lait entier Bio', category: 'Produits laitiers', allergens: 'Lactose', stock_unit: 'L', current_stock: 10.5, expiry_days: 7 },
    { name: 'Yaourt nature', category: 'Produits laitiers', allergens: 'Lactose', stock_unit: 'kg', current_stock: 5.0, expiry_days: 21 },
    { name: 'Carottes Bio', category: 'Légumes', allergens: null, stock_unit: 'kg', current_stock: 15.0, expiry_days: 10 },
    { name: 'Pommes Golden', category: 'Fruits', allergens: null, stock_unit: 'kg', current_stock: 8.5, expiry_days: 14 },
    { name: 'Poulet fermier', category: 'Viandes', allergens: null, stock_unit: 'kg', current_stock: 3.5, expiry_days: 3 },
    { name: 'Pâtes complètes', category: 'Féculents', allergens: 'Gluten', stock_unit: 'kg', current_stock: 20.0, expiry_days: 365 },
    { name: 'Compote de pommes', category: 'Desserts', allergens: null, stock_unit: 'kg', current_stock: 12.0, expiry_days: 90 }
  ].map(p => {
    const expiryDate = new Date(today)
    expiryDate.setDate(expiryDate.getDate() + p.expiry_days)

    return {
      name: p.name,
      category: p.category,
      allergens: p.allergens,
      stock_unit: p.stock_unit,
      current_stock: p.current_stock,
      expiry_date: expiryDate.toISOString().split('T')[0],
      enterprise_id: enterpriseId,
      supplier_id: supplierIds[Math.floor(Math.random() * supplierIds.length)]
    }
  })

  const { data, error } = await supabase
    .from('product')
    .insert(products)
    .select()

  if (error) throw error
  console.log(`✅ Created ${data.length} product(s)`)
  return data
}

async function main() {
  console.log('🌱 Starting database seeding...\n')
  console.log('📌 Using Unified Profiles Architecture\n')

  try {
    // Clear existing data
    await clearDatabase()

    // Seed base data
    const developer = await seedDeveloper()
    const { owners, enterprises } = await seedOwnersAndEnterprises()

    // Seed for first enterprise
    const enterprise1 = enterprises[0]
    const owner1 = owners[0]

    const rooms = await seedRooms(enterprise1.id)
    const tasks = await seedTasks(enterprise1.id)
    const employees = await seedEmployees(enterprise1.id, owner1.id, rooms.map((r: any) => r.id))

    // HACCP data
    const children = await seedChildren(enterprise1.id)
    const suppliers = await seedSuppliers(enterprise1.id)
    const products = await seedProducts(enterprise1.id, suppliers.map((s: any) => s.id))

    console.log('\n✨ Database seeding completed successfully!\n')
    console.log('📊 Summary:')
    console.log(`   • 1 developer`)
    console.log(`   • ${owners.length} owner(s)`)
    console.log(`   • ${enterprises.length} enterprise(s)`)
    console.log(`   • ${rooms.length} room(s)`)
    console.log(`   • ${tasks.length} task template(s)`)
    console.log(`   • ${employees.length} employee(s)`)
    console.log(`   • ${children.length} child(ren)`)
    console.log(`   • ${suppliers.length} supplier(s)`)
    console.log(`   • ${products.length} product(s)`)
    console.log('\n🔑 Test Credentials:')
    console.log('   Developer: dev@luniqo.fr / admin123')
    console.log('   Owner: admin@petitspas.fr / admin123')
    console.log('   Owner: admin@leslucioles.fr / admin123')
    console.log('   Employee (dashboard): sophie@example.com / password123')
    console.log('   Employee (tablet): Sophie B / 1234')
    console.log('   Employee (tablet): Lucas P / 2345')

  } catch (error) {
    console.error('\n❌ Error seeding database:', error)
    process.exit(1)
  }
}

main()

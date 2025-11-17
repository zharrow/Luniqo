/**
 * 🌱 Seed Data Script for cLean App (Next.js + Supabase)
 *
 * This script populates the database with test data for development.
 *
 * Run with:
 *   npx ts-node scripts/seed.ts
 *
 * Or add to package.json:
 *   "seed": "ts-node scripts/seed.ts"
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import * as crypto from 'crypto'

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

// Helper to hash PIN codes (simple SHA256 for now)
function hashPin(pin: string): string {
  return crypto.createHash('sha256').update(pin).digest('hex')
}

async function clearDatabase() {
  console.log('🧹 Clearing existing data...')

  // Delete in reverse dependency order
  const tables = [
    'notification',
    'message',
    'conversation',
    'meal_children',
    'document',
    'non_compliance',
    'cleaning_haccp',
    'equipment',
    'batch',
    'temperature',
    'meal',
    'product',
    'supplier',
    'child',
    'export',
    'cleaning_log',
    'cleaning_session',
    'assigned_task',
    'task_template',
    'user_rooms',
    'user',
    'room',
    'enterprise',
    'admin',
    'developer'
  ]

  for (const table of tables) {
    const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000')
    if (error && error.code !== 'PGRST116') {
      console.warn(`⚠️  Warning deleting ${table}:`, error.message)
    }
  }

  console.log('✅ Database cleared')
}

async function seedDevelopers() {
  console.log('👨‍💻 Creating developers...')

  const developers = [
    {
      email: 'dev@clean-app.com',
      password_hash: hashPin('admin123'), // In real app, use proper bcrypt
      firebase_uid: null
    }
  ]

  const { data, error } = await supabase
    .from('developer')
    .insert(developers)
    .select()

  if (error) throw error
  console.log(`✅ Created ${data.length} developer(s)`)
  return data
}

async function seedAdminsAndEnterprises() {
  console.log('👔 Creating admins and enterprises...')

  // Create admins
  const admins = [
    {
      email: 'admin@petitspas.fr',
      password_hash: hashPin('admin123'),
      firebase_uid: null,
      first_name: 'Marie',
      last_name: 'Dubois',
      is_active: true
    },
    {
      email: 'admin@leslucioles.fr',
      password_hash: hashPin('admin123'),
      firebase_uid: null,
      first_name: 'Jean',
      last_name: 'Martin',
      is_active: true
    }
  ]

  const { data: adminData, error: adminError } = await supabase
    .from('admin')
    .insert(admins)
    .select()

  if (adminError) throw adminError
  console.log(`✅ Created ${adminData.length} admin(s)`)

  // Create enterprises
  const enterprises = [
    {
      admin_id: adminData[0].id,
      name: 'Crèche Les Petits Pas',
      legal_form: 'SARL',
      siret: '12345678901234',
      logo_url: null
    },
    {
      admin_id: adminData[1].id,
      name: 'Micro-Crèche Les Lucioles',
      legal_form: 'Entreprise individuelle',
      siret: '98765432109876',
      logo_url: null
    }
  ]

  const { data: enterpriseData, error: enterpriseError } = await supabase
    .from('enterprise')
    .insert(enterprises)
    .select()

  if (enterpriseError) throw enterpriseError
  console.log(`✅ Created ${enterpriseData.length} enterprise(s)`)

  return { admins: adminData, enterprises: enterpriseData }
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
    { name: 'Aspirer les sols', type: 'DAILY', category: 'Sols', estimated_duration: 15 },
    { name: 'Laver les sols', type: 'DAILY', category: 'Sols', estimated_duration: 20 },
    { name: 'Désinfecter les surfaces', type: 'DAILY', category: 'Hygiène', estimated_duration: 10 },
    { name: 'Nettoyer les sanitaires', type: 'DAILY', category: 'Sanitaires', estimated_duration: 15 },
    { name: 'Vider les poubelles', type: 'DAILY', category: 'Entretien', estimated_duration: 5 },
    { name: 'Nettoyer les vitres', type: 'WEEKLY', category: 'Vitres', estimated_duration: 30 },
    { name: 'Désinfecter les jouets', type: 'WEEKLY', category: 'Hygiène', estimated_duration: 45 },
    { name: 'Nettoyer les climatiseurs', type: 'MONTHLY', category: 'Entretien', estimated_duration: 60 },
    { name: 'Shampouiner la moquette', type: 'MONTHLY', category: 'Sols', estimated_duration: 90 },
    { name: 'Inventaire produits', type: 'OCCASIONAL', category: 'Gestion', estimated_duration: 120 }
  ].map(t => ({
    ...t,
    enterprise_id: enterpriseId,
    description: `Tâche de ${t.category.toLowerCase()}`,
    default_duration: t.estimated_duration,
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

async function seedUsers(enterpriseId: string, adminId: string, roomIds: string[]) {
  console.log('👥 Creating users (employees)...')

  const users = [
    { first_name: 'Sophie', last_name: 'Bernard', email: 'sophie@example.com', pin: '1234' },
    { first_name: 'Lucas', last_name: 'Petit', email: 'lucas@example.com', pin: '2345' },
    { first_name: 'Emma', last_name: 'Moreau', email: 'emma@example.com', pin: '3456' },
    { first_name: 'Léa', last_name: 'Roux', email: 'lea@example.com', pin: '4567' },
    { first_name: 'Thomas', last_name: 'Leroy', email: 'thomas@example.com', pin: '5678' }
  ].map(u => ({
    ...u,
    enterprise_id: enterpriseId,
    created_by_id: adminId,
    pin_code: hashPin(u.pin),
    is_active: true
  }))

  const { data, error } = await supabase
    .from('user')
    .insert(users.map(({ pin, ...u }) => u))
    .select()

  if (error) throw error
  console.log(`✅ Created ${data.length} user(s)`)

  // Assign rooms to users
  const userRooms = data.flatMap(user =>
    roomIds.slice(0, Math.floor(Math.random() * 3) + 2).map(roomId => ({
      user_id: user.id,
      room_id: roomId
    }))
  )

  const { error: roomError } = await supabase
    .from('user_rooms')
    .insert(userRooms)

  if (roomError) throw roomError
  console.log(`✅ Created ${userRooms.length} user-room assignment(s)`)

  return data
}

async function seedAssignedTasks(enterpriseId: string, roomIds: string[], taskIds: string[], userIds: string[]) {
  console.log('🔗 Assigning tasks to rooms...')

  const assignedTasks = roomIds.flatMap(roomId =>
    taskIds.slice(0, 5).map(taskId => ({
      enterprise_id: enterpriseId,
      room_id: roomId,
      task_template_id: taskId,
      default_performer_id: userIds[Math.floor(Math.random() * userIds.length)],
      is_active: true
    }))
  )

  const { data, error } = await supabase
    .from('assigned_task')
    .insert(assignedTasks)
    .select()

  if (error) throw error
  console.log(`✅ Created ${data.length} assigned task(s)`)
  return data
}

async function seedCleaningSessions(enterpriseId: string) {
  console.log('📅 Creating cleaning sessions...')

  const sessions = []
  const today = new Date()

  // Create sessions for last 7 days
  for (let i = 0; i < 7; i++) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)

    sessions.push({
      enterprise_id: enterpriseId,
      date: date.toISOString().split('T')[0],
      status: i === 0 ? 'EN_COURS' : (i % 3 === 0 ? 'INCOMPLETE' : 'COMPLETEE')
    })
  }

  const { data, error } = await supabase
    .from('cleaning_session')
    .insert(sessions)
    .select()

  if (error) throw error
  console.log(`✅ Created ${data.length} cleaning session(s)`)
  return data
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
    { name: 'Bio Fruits & Légumes', contact_name: 'Pierre Durand', phone: '0123456789', email: 'contact@biofruits.fr' },
    { name: 'Laiterie Régionale', contact_name: 'Marie Legrand', phone: '0234567890', email: 'info@laiterie.fr' },
    { name: 'Boucherie du Marché', contact_name: 'Jean Moreau', phone: '0345678901', email: 'boucher@marche.fr' }
  ].map(s => ({ ...s, enterprise_id: enterpriseId, is_active: true }))

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

  const products = [
    { name: 'Lait entier Bio', category: 'Produits laitiers', allergens: 'Lactose', shelf_life_days: 7 },
    { name: 'Yaourt nature', category: 'Produits laitiers', allergens: 'Lactose', shelf_life_days: 21 },
    { name: 'Carottes Bio', category: 'Légumes', allergens: null, shelf_life_days: 10 },
    { name: 'Pommes Golden', category: 'Fruits', allergens: null, shelf_life_days: 14 },
    { name: 'Poulet fermier', category: 'Viandes', allergens: null, shelf_life_days: 3 },
    { name: 'Pâtes complètes', category: 'Féculents', allergens: 'Gluten', shelf_life_days: 365 },
    { name: 'Compote de pommes', category: 'Desserts', allergens: null, shelf_life_days: 90 }
  ].map(p => ({
    ...p,
    enterprise_id: enterpriseId,
    supplier_id: supplierIds[Math.floor(Math.random() * supplierIds.length)],
    is_active: true
  }))

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

  try {
    // Clear existing data
    await clearDatabase()

    // Seed base data
    const developers = await seedDevelopers()
    const { admins, enterprises } = await seedAdminsAndEnterprises()

    // Seed for first enterprise
    const enterprise1 = enterprises[0]
    const admin1 = admins[0]

    const rooms = await seedRooms(enterprise1.id)
    const tasks = await seedTasks(enterprise1.id)
    const users = await seedUsers(enterprise1.id, admin1.id, rooms.map(r => r.id))

    await seedAssignedTasks(
      enterprise1.id,
      rooms.map(r => r.id),
      tasks.map(t => t.id),
      users.map(u => u.id)
    )

    const sessions = await seedCleaningSessions(enterprise1.id)

    // HACCP data
    const children = await seedChildren(enterprise1.id)
    const suppliers = await seedSuppliers(enterprise1.id)
    const products = await seedProducts(enterprise1.id, suppliers.map(s => s.id))

    console.log('\n✨ Database seeding completed successfully!\n')
    console.log('📊 Summary:')
    console.log(`   • ${developers.length} developer(s)`)
    console.log(`   • ${admins.length} admin(s)`)
    console.log(`   • ${enterprises.length} enterprise(s)`)
    console.log(`   • ${rooms.length} room(s)`)
    console.log(`   • ${tasks.length} task template(s)`)
    console.log(`   • ${users.length} user(s)`)
    console.log(`   • ${sessions.length} cleaning session(s)`)
    console.log(`   • ${children.length} child(ren)`)
    console.log(`   • ${suppliers.length} supplier(s)`)
    console.log(`   • ${products.length} product(s)`)
    console.log('\n🔑 Test Credentials:')
    console.log('   Admin: admin@petitspas.fr / admin123')
    console.log('   User PIN: 1234, 2345, 3456, 4567, 5678')

  } catch (error) {
    console.error('\n❌ Error seeding database:', error)
    process.exit(1)
  }
}

main()

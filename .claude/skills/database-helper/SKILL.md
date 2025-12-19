---
name: database-helper
description: Aide avec les requêtes Supabase, relations entre tables, et patterns de données pour l'application Luniqo. Utilise quand tu travailles avec la base de données, crées des queries, ou débogues des problèmes de données.
allowed-tools: Read, Grep, Glob
---

# Luniqo Database Helper

Assistant spécialisé pour les opérations de base de données Supabase dans l'application Luniqo. Connaissance approfondie du schéma (25+ tables) et des patterns d'architecture multi-tenant.

## Architecture de la base de données

### Tables principales (User System)

**Unified Profiles Architecture**:
```sql
-- Unified user table (Developer, Owner, Employee)
profiles (
  id UUID PRIMARY KEY,              -- Référence auth.users(id)
  role user_type NOT NULL,          -- 'Developer' | 'Owner' | 'Employee'
  email VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  username VARCHAR(100) UNIQUE,     -- Employee only (auto-generated)
  pin_hash VARCHAR(255),            -- Employee only (bcrypt)
  enterprise_id UUID,               -- Foreign key pour Employees
  created_by_id UUID,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)

-- Childcare facilities
enterprise (
  id UUID PRIMARY KEY,
  owner_id UUID UNIQUE NOT NULL,    -- Référence profiles(id) where role='Owner'
  name VARCHAR(255) NOT NULL,
  address TEXT,
  phone VARCHAR(20),
  email VARCHAR(255),
  logo_url TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)

-- Employee room access (many-to-many)
employee_room_access (
  employee_id UUID,                 -- Référence profiles(id) where role='Employee'
  room_id UUID,
  created_at TIMESTAMPTZ,
  PRIMARY KEY (employee_id, room_id)
)
```

### Relations critiques à connaître

**1. Owner ↔ Enterprise** (1:1 via `enterprise.owner_id`)
```typescript
// ✅ Récupérer l'enterprise d'un Owner
const { data: enterprise } = await supabase
  .from('enterprise')
  .select('*')
  .eq('owner_id', profileId)
  .single()

// ❌ FAUX - profiles n'a pas enterprise_id pour Owners
const { data } = await supabase
  .from('profiles')
  .select('*, enterprise!enterprise_id(*)')
  .eq('role', 'Owner')
```

**2. Employee ↔ Enterprise** (N:1 via `profiles.enterprise_id`)
```typescript
// ✅ Récupérer tous les employés d'une crèche
const { data: employees } = await supabase
  .from('profiles')
  .select('*')
  .eq('role', 'Employee')
  .eq('enterprise_id', enterpriseId)

// ✅ Récupérer l'enterprise d'un employé
const { data: employee } = await supabase
  .from('profiles')
  .select('*, enterprise(*)')
  .eq('id', employeeId)
  .single()
```

**3. Employee ↔ Room** (N:N via `employee_room_access`)
```typescript
// ✅ Récupérer les salles accessibles par un employé
const { data: rooms } = await supabase
  .from('employee_room_access')
  .select('room(*)')
  .eq('employee_id', employeeId)

// ✅ Récupérer les employés ayant accès à une salle
const { data: employees } = await supabase
  .from('employee_room_access')
  .select('profiles(*)')
  .eq('room_id', roomId)
```

### Tables du module Luniqo (Nettoyage)

```sql
-- Rooms
room (
  id UUID PRIMARY KEY,
  enterprise_id UUID NOT NULL,      -- ⚠️ TOUJOURS FILTRER!
  name VARCHAR(100) NOT NULL,
  room_type room_type_enum,         -- 'BABY' | 'TODDLER' | 'PRESCHOOL' | 'COMMON' | 'STAFF' | 'KITCHEN'
  surface_area DECIMAL(6,2),
  max_capacity INTEGER,
  description TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)

-- Task templates
task_template (
  id UUID PRIMARY KEY,
  enterprise_id UUID NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  frequency frequency_enum,         -- 'DAILY' | 'WEEKLY' | 'MONTHLY'
  estimated_duration_minutes INTEGER,
  category task_category_enum,      -- 'CLEANING' | 'DISINFECTION' | 'MAINTENANCE' | 'INSPECTION'
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)

-- Assigned tasks (template → room)
assigned_task (
  id UUID PRIMARY KEY,
  enterprise_id UUID NOT NULL,
  room_id UUID NOT NULL,
  task_template_id UUID NOT NULL,
  days_of_week INTEGER[],           -- Array [0-6] (0=Dimanche, 1=Lundi, ...)
  time_of_day time_of_day_enum,     -- 'MORNING' | 'AFTERNOON' | 'EVENING'
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ
)

-- Cleaning sessions
daily_cleaning_session (
  id UUID PRIMARY KEY,
  enterprise_id UUID NOT NULL,
  session_date DATE NOT NULL,
  status session_status_enum,       -- 'EN_COURS' | 'COMPLETEE'
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)

-- Task completions
task_completion (
  id UUID PRIMARY KEY,
  enterprise_id UUID NOT NULL,
  session_id UUID NOT NULL,
  assigned_task_id UUID NOT NULL,
  employee_id UUID NOT NULL,        -- Référence profiles(id)
  completed_at TIMESTAMPTZ NOT NULL,
  notes TEXT,
  photo_url TEXT
)
```

### Tables HACCP (Food Safety)

```sql
child, meal, child_meal_record, temperature_check, product, supplier,
batch, equipment, food_area_cleaning, haccp_incident, document
```

### Tables Communication

```sql
support_conversation, message, notification
```

## Patterns de requêtes courants

### 1. Filtrage multi-tenant (CRITIQUE!)

**RÈGLE D'OR**: TOUJOURS filtrer par `enterprise_id` (sauf pour Developers en analytics)

```typescript
// ✅ Pattern sécurisé
const { data } = await supabase
  .from('room')
  .select('*')
  .eq('enterprise_id', session.enterprise.id)

// ❌ DANGEREUX - Fuite de données entre crèches
const { data } = await supabase.from('room').select('*')
```

### 2. Jointures avec relations

**Pattern Supabase**: Utiliser la notation `table_name(columns)`

```typescript
// ✅ Récupérer les tâches avec leurs templates
const { data: tasks } = await supabase
  .from('assigned_task')
  .select(`
    *,
    room(id, name, room_type),
    task_template(id, name, description, category)
  `)
  .eq('enterprise_id', enterpriseId)

// ✅ Récupérer les sessions avec leurs complétions
const { data: sessions } = await supabase
  .from('daily_cleaning_session')
  .select(`
    *,
    task_completion(
      *,
      assigned_task(
        *,
        room(name),
        task_template(name)
      ),
      employee:profiles(first_name, last_name)
    )
  `)
  .eq('enterprise_id', enterpriseId)
  .order('session_date', { ascending: false })
```

### 3. Insertion avec retour de données

```typescript
// ✅ Pattern avec .select() après insert
const { data: newRoom, error } = await supabase
  .from('room')
  .insert({
    enterprise_id: enterpriseId,
    name: 'Salle Bébés',
    room_type: 'BABY',
    surface_area: 25.5
  })
  .select()
  .single()

if (error) {
  console.error('Error:', error.message)
  return null
}
```

### 4. Update avec conditions

```typescript
// ✅ Update avec filtres multiples
const { error } = await supabase
  .from('assigned_task')
  .update({ is_active: false })
  .eq('enterprise_id', enterpriseId)
  .eq('room_id', roomId)

// ✅ Update d'un seul champ
const { error } = await supabase
  .from('daily_cleaning_session')
  .update({ status: 'COMPLETEE' })
  .eq('id', sessionId)
  .eq('enterprise_id', enterpriseId)
```

### 5. Delete avec protection enterprise

```typescript
// ✅ Delete sécurisé (double filtre)
const { error } = await supabase
  .from('task_template')
  .delete()
  .eq('id', templateId)
  .eq('enterprise_id', enterpriseId) // ⚠️ CRITIQUE!
```

### 6. Queries avec arrays (days_of_week)

```typescript
// ✅ Filtrer par jour de la semaine
const dayOfWeek = new Date().getDay() // 0-6

const { data: todayTasks } = await supabase
  .from('assigned_task')
  .select('*, task_template(*), room(*)')
  .eq('enterprise_id', enterpriseId)
  .contains('days_of_week', [dayOfWeek])
  .eq('is_active', true)
```

### 7. Aggregation et comptage

```typescript
// ✅ Compter les tâches complétées
const { count, error } = await supabase
  .from('task_completion')
  .select('*', { count: 'exact', head: true })
  .eq('enterprise_id', enterpriseId)
  .eq('session_id', sessionId)

// ✅ Statistiques avec plusieurs agrégations
const { data: stats } = await supabase.rpc('get_cleaning_stats', {
  p_enterprise_id: enterpriseId,
  p_start_date: startDate,
  p_end_date: endDate
})
```

### 8. Dates et timezone (CRITIQUE!)

**TOUJOURS utiliser les utilitaires locaux** (`lib/utils/date.ts`)

```typescript
import { formatDateLocal, getTodayLocal } from '@/lib/utils/date'

// ✅ Date du jour en timezone locale
const today = getTodayLocal() // "2025-12-19"

// ✅ Formater une Date en YYYY-MM-DD local
const dateString = formatDateLocal(new Date())

// ❌ DANGEREUX - Conversion UTC (cause des bugs de timezone)
const wrong = new Date().toISOString().split('T')[0]
```

## Choix du Supabase Client

### Client-side (use client)
```typescript
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()
// Utilise le anon key, respecte RLS
```

### Server-side (Server Components & Actions)
```typescript
import { createClient } from '@/lib/supabase/server'

const supabase = await createClient() // ⚠️ async!
// Utilise les cookies pour la session
```

### Service role (Admin operations)
```typescript
// ⚠️ UNIQUEMENT côté serveur!
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Bypass RLS
  { auth: { persistSession: false } }
)
```

## Debugging queries

### Activer les logs Supabase
```typescript
const { data, error } = await supabase
  .from('room')
  .select('*')
  .eq('enterprise_id', enterpriseId)

console.log('Query result:', { data, error })

if (error) {
  console.error('Error details:', {
    message: error.message,
    details: error.details,
    hint: error.hint,
    code: error.code
  })
}
```

### Vérifier les relations
```typescript
// Utiliser .explain() pour voir la query SQL générée
const query = supabase
  .from('assigned_task')
  .select('*, room(*), task_template(*)')
  .eq('enterprise_id', enterpriseId)

// @ts-ignore - explain() n'est pas dans les types
const explanation = await query.explain()
console.log(explanation)
```

## Migrations et schéma

**Fichiers de schéma**:
- `supabase/migrations/00_schema.sql` - Schéma complet (25+ tables)
- `supabase/migrations/01_dev_permissions.sql` - RLS désactivée (dev only)
- `scripts/seed.ts` - Script de seed avec données de test

**Commandes utiles**:
```bash
npm run seed        # Seed la base avec données de test
npm run db:reset    # Reset et reseed complet
```

## Ressources

- Schéma complet: `supabase/migrations/00_schema.sql`
- Types générés: `types/database.types.ts`
- Service utils: `lib/services/*.service.ts`
- Documentation Supabase: https://supabase.com/docs/guides/database

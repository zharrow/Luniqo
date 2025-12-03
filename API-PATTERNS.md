# API-PATTERNS.md

Guide des patterns de requêtes Supabase pour **Luniqo**. Ce document contient tous les patterns réutilisables pour interagir avec la base de données.

**Dernière mise à jour**: 2025-11-19

---

## 📋 Table des matières

1. [Configuration de base](#configuration-de-base)
2. [Patterns CRUD](#patterns-crud)
3. [Relations et jointures](#relations-et-jointures)
4. [Filtrage et recherche](#filtrage-et-recherche)
5. [Pagination](#pagination)
6. [Gestion des erreurs](#gestion-des-erreurs)
7. [Upload de fichiers](#upload-de-fichiers)
8. [Patterns par module](#patterns-par-module)

---

## Configuration de base

### Import du client Supabase

```typescript
// Dans un Client Component ('use client')
import { createClient } from '@/lib/supabase/client'
const supabase = createClient()

// Dans un Server Component ou Server Action
import { createClient } from '@/lib/supabase/server'
const supabase = await createClient() // Note: async call
```

### Obtenir la session utilisateur

```typescript
import { useAuth } from '@/lib/contexts/AuthContext'

const { session, isLoading, enterprise } = useAuth()

// session.user.id        → ID de l'utilisateur
// session.role           → 'Developer' | 'Admin' | 'User'
// session.enterprise.id  → ID de l'entreprise (Admin/User uniquement)
```

---

## Patterns CRUD

### CREATE - Créer une entrée

```typescript
// ✅ Pattern standard avec enterprise_id
const createRoom = async (name: string, description: string) => {
  const { data, error } = await supabase
    .from('room')
    .insert({
      name,
      description,
      enterprise_id: session.enterprise.id, // TOUJOURS filtrer par enterprise
      is_active: true
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating room:', error)
    return { success: false, error: error.message }
  }

  return { success: true, data }
}

// ✅ Créer plusieurs entrées
const createMultiple = async (items: Array<{ name: string }>) => {
  const { data, error } = await supabase
    .from('room')
    .insert(items.map(item => ({
      ...item,
      enterprise_id: session.enterprise.id
    })))
    .select()

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, data }
}
```

### READ - Lire des données

```typescript
// ✅ Récupérer toutes les entrées d'une entreprise
const getRooms = async () => {
  const { data, error } = await supabase
    .from('room')
    .select('*')
    .eq('enterprise_id', session.enterprise.id)
    .eq('is_active', true)
    .order('display_order', { ascending: true })

  if (error) {
    console.error('Error fetching rooms:', error)
    return []
  }

  return data
}

// ✅ Récupérer une entrée par ID
const getRoomById = async (id: string) => {
  const { data, error } = await supabase
    .from('room')
    .select('*')
    .eq('id', id)
    .eq('enterprise_id', session.enterprise.id)
    .single()

  if (error) {
    console.error('Error fetching room:', error)
    return null
  }

  return data
}

// ✅ Compter les entrées
const countRooms = async () => {
  const { count, error } = await supabase
    .from('room')
    .select('*', { count: 'exact', head: true })
    .eq('enterprise_id', session.enterprise.id)
    .eq('is_active', true)

  return count || 0
}
```

### UPDATE - Mettre à jour

```typescript
// ✅ Mettre à jour une entrée
const updateRoom = async (id: string, updates: Partial<Room>) => {
  const { data, error } = await supabase
    .from('room')
    .update(updates)
    .eq('id', id)
    .eq('enterprise_id', session.enterprise.id) // Sécurité: vérifier l'appartenance
    .select()
    .single()

  if (error) {
    console.error('Error updating room:', error)
    return { success: false, error: error.message }
  }

  return { success: true, data }
}

// ✅ Mise à jour conditionnelle
const toggleRoomStatus = async (id: string) => {
  // D'abord récupérer l'état actuel
  const { data: room } = await supabase
    .from('room')
    .select('is_active')
    .eq('id', id)
    .eq('enterprise_id', session.enterprise.id)
    .single()

  if (!room) return { success: false, error: 'Room not found' }

  // Puis inverser
  const { error } = await supabase
    .from('room')
    .update({ is_active: !room.is_active })
    .eq('id', id)
    .eq('enterprise_id', session.enterprise.id)

  return { success: !error, error: error?.message }
}
```

### DELETE - Supprimer

```typescript
// ✅ Soft delete (désactivation)
const softDeleteRoom = async (id: string) => {
  const { error } = await supabase
    .from('room')
    .update({ is_active: false })
    .eq('id', id)
    .eq('enterprise_id', session.enterprise.id)

  return { success: !error, error: error?.message }
}

// ✅ Hard delete (suppression définitive)
const deleteRoom = async (id: string) => {
  const { error } = await supabase
    .from('room')
    .delete()
    .eq('id', id)
    .eq('enterprise_id', session.enterprise.id)

  return { success: !error, error: error?.message }
}
```

---

## Relations et jointures

### Admin → Enterprise (1:1)

```typescript
// ✅ CORRECT: Récupérer l'entreprise d'un admin
const getAdminWithEnterprise = async (adminId: string) => {
  // Méthode 1: Deux requêtes séparées (recommandé)
  const { data: admin } = await supabase
    .from('admin')
    .select('*')
    .eq('id', adminId)
    .single()

  const { data: enterprise } = await supabase
    .from('enterprise')
    .select('*')
    .eq('admin_id', adminId)
    .single()

  return { admin, enterprise }
}

// ❌ INCORRECT: admin.enterprise_id n'existe pas
// const { data } = await supabase
//   .from('admin')
//   .select('*, enterprise!enterprise_id(*)')
```

### User → Rooms (Many-to-Many)

```typescript
// ✅ Récupérer les pièces accessibles par un utilisateur
const getUserRooms = async (userId: string) => {
  const { data, error } = await supabase
    .from('user_rooms')
    .select(`
      room_id,
      room:room_id (
        id,
        name,
        description,
        image_key
      )
    `)
    .eq('user_id', userId)

  if (error) return []

  return data.map(item => item.room)
}

// ✅ Ajouter accès d'un user à une room
const grantRoomAccess = async (userId: string, roomId: string) => {
  const { error } = await supabase
    .from('user_rooms')
    .insert({ user_id: userId, room_id: roomId })

  return { success: !error }
}

// ✅ Retirer accès d'un user à une room
const revokeRoomAccess = async (userId: string, roomId: string) => {
  const { error } = await supabase
    .from('user_rooms')
    .delete()
    .eq('user_id', userId)
    .eq('room_id', roomId)

  return { success: !error }
}
```

### Session → Logs (1:N avec jointures)

```typescript
// ✅ Récupérer une session avec tous ses logs
const getSessionWithLogs = async (sessionId: string) => {
  const { data, error } = await supabase
    .from('cleaning_session')
    .select(`
      *,
      logs:cleaning_log (
        id,
        status,
        note,
        performed_at,
        performed_by:performed_by_id (
          id,
          first_name,
          last_name
        ),
        task:assigned_task_id (
          id,
          task_template:task_template_id (
            name,
            description
          )
        )
      )
    `)
    .eq('id', sessionId)
    .eq('enterprise_id', session.enterprise.id)
    .single()

  return data
}
```

### Meal → Children (Many-to-Many avec données pivot)

```typescript
// ✅ Récupérer un repas avec les enfants
const getMealWithChildren = async (mealId: string) => {
  const { data: meal } = await supabase
    .from('meal')
    .select(`
      *,
      meal_children (
        portion,
        observations,
        child:child_id (
          id,
          first_name,
          last_name,
          section
        )
      )
    `)
    .eq('id', mealId)
    .eq('enterprise_id', session.enterprise.id)
    .single()

  return meal
}

// ✅ Associer un enfant à un repas
const addChildToMeal = async (
  mealId: string,
  childId: string,
  portion: string,
  observations?: string
) => {
  const { error } = await supabase
    .from('meal_children')
    .insert({
      meal_id: mealId,
      child_id: childId,
      portion,
      observations
    })

  return { success: !error }
}
```

---

## Filtrage et recherche

### Recherche texte

```typescript
// ✅ Recherche case-insensitive sur plusieurs colonnes
const searchRooms = async (query: string) => {
  const { data } = await supabase
    .from('room')
    .select('*')
    .eq('enterprise_id', session.enterprise.id)
    .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
    .eq('is_active', true)

  return data || []
}

// ✅ Recherche avec plusieurs filtres
const searchUsers = async (filters: {
  query?: string
  isActive?: boolean
  roomId?: string
}) => {
  let query = supabase
    .from('user')
    .select('*')
    .eq('enterprise_id', session.enterprise.id)

  if (filters.query) {
    query = query.or(
      `first_name.ilike.%${filters.query}%,last_name.ilike.%${filters.query}%,email.ilike.%${filters.query}%`
    )
  }

  if (filters.isActive !== undefined) {
    query = query.eq('is_active', filters.isActive)
  }

  if (filters.roomId) {
    // Sous-requête pour filtrer par room
    const { data: userRooms } = await supabase
      .from('user_rooms')
      .select('user_id')
      .eq('room_id', filters.roomId)

    const userIds = userRooms?.map(ur => ur.user_id) || []
    query = query.in('id', userIds)
  }

  const { data } = await query
  return data || []
}
```

### Filtrage par dates

```typescript
// ✅ Filtrer par plage de dates
const getSessionsByDateRange = async (startDate: string, endDate: string) => {
  const { data } = await supabase
    .from('cleaning_session')
    .select('*')
    .eq('enterprise_id', session.enterprise.id)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: false })

  return data || []
}

// ✅ Récupérer la session du jour
const getTodaySession = async () => {
  const today = new Date().toISOString().split('T')[0]

  const { data } = await supabase
    .from('cleaning_session')
    .select('*')
    .eq('enterprise_id', session.enterprise.id)
    .eq('date', today)
    .single()

  return data
}
```

### Filtrage par ENUM

```typescript
// ✅ Filtrer par statut
const getSessionsByStatus = async (status: 'EN_COURS' | 'COMPLETEE' | 'INCOMPLETE') => {
  const { data } = await supabase
    .from('cleaning_session')
    .select('*')
    .eq('enterprise_id', session.enterprise.id)
    .eq('status', status)
    .order('date', { ascending: false })

  return data || []
}

// ✅ Filtrer par plusieurs statuts
const getOpenNonCompliances = async () => {
  const { data } = await supabase
    .from('non_compliance')
    .select('*')
    .eq('enterprise_id', session.enterprise.id)
    .in('status', ['Open', 'Corrected'])
    .order('report_date', { ascending: false })

  return data || []
}
```

---

## Pagination

### Pattern de pagination

```typescript
// ✅ Pagination avec offset et limit
const getPaginatedRooms = async (page: number, pageSize: number = 10) => {
  const from = page * pageSize
  const to = from + pageSize - 1

  const { data, error, count } = await supabase
    .from('room')
    .select('*', { count: 'exact' })
    .eq('enterprise_id', session.enterprise.id)
    .eq('is_active', true)
    .order('name')
    .range(from, to)

  return {
    data: data || [],
    totalPages: count ? Math.ceil(count / pageSize) : 0,
    totalItems: count || 0,
    currentPage: page
  }
}

// ✅ Infinite scroll (load more)
const loadMoreRooms = async (lastId: string, limit: number = 20) => {
  const { data } = await supabase
    .from('room')
    .select('*')
    .eq('enterprise_id', session.enterprise.id)
    .gt('created_at', lastId) // Utiliser created_at comme cursor
    .order('created_at')
    .limit(limit)

  return data || []
}
```

---

## Gestion des erreurs

### Pattern de gestion d'erreurs

```typescript
// ✅ Gestion complète des erreurs
const createRoomSafe = async (name: string) => {
  try {
    // Validation côté client
    if (!name || name.trim().length === 0) {
      return {
        success: false,
        error: 'Le nom de la pièce est requis'
      }
    }

    // Vérifier si existe déjà
    const { data: existing } = await supabase
      .from('room')
      .select('id')
      .eq('enterprise_id', session.enterprise.id)
      .eq('name', name.trim())
      .single()

    if (existing) {
      return {
        success: false,
        error: 'Une pièce avec ce nom existe déjà'
      }
    }

    // Créer
    const { data, error } = await supabase
      .from('room')
      .insert({
        name: name.trim(),
        enterprise_id: session.enterprise.id
      })
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return {
        success: false,
        error: 'Erreur lors de la création de la pièce'
      }
    }

    return { success: true, data }
  } catch (err) {
    console.error('Unexpected error:', err)
    return {
      success: false,
      error: 'Une erreur inattendue est survenue'
    }
  }
}
```

### Codes d'erreur Supabase courants

```typescript
// Mapping des codes d'erreur
const getErrorMessage = (error: any): string => {
  if (!error) return 'Erreur inconnue'

  // Violation de contrainte unique
  if (error.code === '23505') {
    return 'Cette entrée existe déjà'
  }

  // Foreign key violation
  if (error.code === '23503') {
    return 'Référence invalide'
  }

  // RLS policy violation
  if (error.code === '42501') {
    return 'Accès non autorisé'
  }

  // Not null violation
  if (error.code === '23502') {
    return 'Champ requis manquant'
  }

  return error.message || 'Erreur de base de données'
}
```

---

## Upload de fichiers

### Upload d'images (logos, photos)

```typescript
// ✅ Upload d'image avec Supabase Storage
const uploadImage = async (file: File, bucket: string = 'images') => {
  try {
    // Validation
    if (!file.type.startsWith('image/')) {
      return { success: false, error: 'Le fichier doit être une image' }
    }

    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return { success: false, error: 'L\'image ne doit pas dépasser 5MB' }
    }

    // Générer un nom unique
    const fileExt = file.name.split('.').pop()
    const fileName = `${session.enterprise.id}/${Date.now()}.${fileExt}`

    // Upload
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      console.error('Upload error:', error)
      return { success: false, error: 'Erreur lors de l\'upload' }
    }

    // Récupérer l'URL publique
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName)

    return { success: true, url: publicUrl, path: fileName }
  } catch (err) {
    console.error('Upload error:', err)
    return { success: false, error: 'Erreur lors de l\'upload' }
  }
}

// ✅ Supprimer une image
const deleteImage = async (path: string, bucket: string = 'images') => {
  const { error } = await supabase.storage
    .from(bucket)
    .remove([path])

  return { success: !error }
}

// ✅ Mettre à jour le logo d'une entreprise
const updateEnterpriseLogo = async (file: File) => {
  // Upload la nouvelle image
  const { success, url, path } = await uploadImage(file, 'logos')
  if (!success) return { success: false }

  // Supprimer l'ancien logo si existe
  const { data: enterprise } = await supabase
    .from('enterprise')
    .select('logo_url')
    .eq('admin_id', session.user.id)
    .single()

  if (enterprise?.logo_url) {
    // Extraire le path de l'URL
    const oldPath = enterprise.logo_url.split('/').slice(-2).join('/')
    await deleteImage(oldPath, 'logos')
  }

  // Mettre à jour l'entreprise
  const { error } = await supabase
    .from('enterprise')
    .update({ logo_url: url })
    .eq('admin_id', session.user.id)

  return { success: !error, url }
}
```

---

## Patterns par module

### Module User System

```typescript
// ✅ Créer un admin (Developer seulement)
const createAdmin = async (
  email: string,
  password: string,
  firstName: string,
  lastName: string
) => {
  // 1. Créer l'utilisateur dans Supabase Auth
  const { data: authUser, error: authError } = await supabase.auth.signUp({
    email,
    password
  })

  if (authError) return { success: false, error: authError.message }

  // 2. Créer l'entrée admin
  const { data: admin, error: adminError } = await supabase
    .from('admin')
    .insert({
      email,
      first_name: firstName,
      last_name: lastName,
      firebase_uid: authUser.user?.id,
      created_by_id: session.user.id // Developer ID
    })
    .select()
    .single()

  if (adminError) return { success: false, error: adminError.message }

  return { success: true, data: admin }
}

// ✅ Créer un employé (avec PIN)
const createUser = async (
  firstName: string,
  lastName: string,
  pin: string,
  roomIds: string[]
) => {
  // 1. Hasher le PIN
  const hashedPin = await hashPin(pin)

  // 2. Créer l'utilisateur
  const { data: user, error } = await supabase
    .from('user')
    .insert({
      first_name: firstName,
      last_name: lastName,
      pin_code: hashedPin,
      enterprise_id: session.enterprise.id,
      created_by_id: session.user.id
    })
    .select()
    .single()

  if (error) return { success: false, error: error.message }

  // 3. Associer aux pièces
  const userRooms = roomIds.map(roomId => ({
    user_id: user.id,
    room_id: roomId
  }))

  await supabase.from('user_rooms').insert(userRooms)

  return { success: true, data: user }
}
```

### Module Luniqo (Cleaning)

```typescript
// ✅ Créer/récupérer la session du jour
const getOrCreateTodaySession = async () => {
  const today = new Date().toISOString().split('T')[0]

  // Essayer de récupérer
  let { data: session } = await supabase
    .from('cleaning_session')
    .select('*')
    .eq('enterprise_id', session.enterprise.id)
    .eq('date', today)
    .single()

  // Créer si n'existe pas
  if (!session) {
    const { data: newSession } = await supabase
      .from('cleaning_session')
      .insert({
        enterprise_id: session.enterprise.id,
        date: today,
        status: 'EN_COURS'
      })
      .select()
      .single()

    session = newSession
  }

  return session
}

// ✅ Enregistrer une tâche effectuée
const logTask = async (
  sessionId: string,
  assignedTaskId: string,
  performedById: string,
  status: 'FAIT' | 'PARTIEL' | 'REPORTE' | 'IMPOSSIBLE',
  note?: string
) => {
  const { data, error } = await supabase
    .from('cleaning_log')
    .insert({
      session_id: sessionId,
      assigned_task_id: assignedTaskId,
      performed_by_id: performedById,
      recorded_by_id: session.user.id,
      status,
      note,
      performed_at: new Date().toISOString()
    })
    .select()
    .single()

  return { success: !error, data }
}
```

### Module HACCP

```typescript
// ✅ Enregistrer une température
const recordTemperature = async (
  mealId: string,
  checkpoint: 'Reception' | 'Holding' | 'Service' | 'Storage',
  temperature: number,
  observations?: string
) => {
  // Vérifier conformité (exemple: Service doit être > 63°C)
  const isCompliant = checkpoint === 'Service' ? temperature > 63 : true

  const { data, error } = await supabase
    .from('temperature')
    .insert({
      meal_id: mealId,
      checkpoint,
      temperature,
      is_compliant: isCompliant,
      observations,
      control_date: new Date().toISOString(),
      responsible_id: session.user.id
    })
    .select()
    .single()

  return { success: !error, data }
}

// ✅ Créer une non-conformité
const createNonCompliance = async (
  type: 'Product' | 'Temperature' | 'Hygiene' | 'Other',
  description: string,
  correctiveAction?: string
) => {
  const { data, error } = await supabase
    .from('non_compliance')
    .insert({
      enterprise_id: session.enterprise.id,
      type,
      description,
      corrective_action: correctiveAction,
      status: 'Open',
      report_date: new Date().toISOString(),
      responsible_id: session.user.id
    })
    .select()
    .single()

  return { success: !error, data }
}
```

---

## Transactions et opérations complexes

Supabase ne supporte pas les transactions SQL directement, mais voici des patterns pour gérer la cohérence :

```typescript
// ✅ Pattern "rollback manuel"
const createMealWithTemperatures = async (mealData: any, temperatures: any[]) => {
  // 1. Créer le repas
  const { data: meal, error: mealError } = await supabase
    .from('meal')
    .insert({
      ...mealData,
      enterprise_id: session.enterprise.id
    })
    .select()
    .single()

  if (mealError) {
    return { success: false, error: 'Erreur création repas' }
  }

  // 2. Créer les températures
  const temperatureRecords = temperatures.map(t => ({
    ...t,
    meal_id: meal.id
  }))

  const { error: tempError } = await supabase
    .from('temperature')
    .insert(temperatureRecords)

  // 3. Si erreur sur températures, supprimer le repas (rollback)
  if (tempError) {
    await supabase.from('meal').delete().eq('id', meal.id)
    return { success: false, error: 'Erreur création températures' }
  }

  return { success: true, data: meal }
}
```

---

## Best Practices

### ✅ À faire

1. **Toujours filtrer par `enterprise_id`** (sauf Developer)
2. **Toujours gérer les erreurs** avec try/catch
3. **Valider côté client** avant d'envoyer à Supabase
4. **Utiliser `.single()`** quand on attend une seule ligne
5. **Utiliser `.select()`** après INSERT/UPDATE pour récupérer les données
6. **Typer les retours** avec TypeScript
7. **Logger les erreurs** avec console.error

### ❌ À éviter

1. ❌ Oublier le filtre `enterprise_id`
2. ❌ Ne pas gérer les erreurs
3. ❌ Utiliser `.single()` sur une requête qui peut retourner 0 résultat
4. ❌ Faire des requêtes N+1 (utiliser les jointures)
5. ❌ Exposer les erreurs Supabase brutes à l'utilisateur
6. ❌ Oublier de vérifier `session` avant les requêtes

---

**Note**: Ce document sera mis à jour au fur et à mesure que de nouveaux patterns émergent.

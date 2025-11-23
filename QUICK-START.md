# QUICK-START.md

Guides rapides étape par étape pour les tâches courantes dans **cLean**.

**Dernière mise à jour**: 2025-11-19

---

## 📋 Table des matières

1. [Créer une nouvelle page liste](#créer-une-nouvelle-page-liste)
2. [Créer une page détail](#créer-une-page-détail)
3. [Ajouter un modal de formulaire](#ajouter-un-modal-de-formulaire)
4. [Ajouter une route dans la sidebar](#ajouter-une-route-dans-la-sidebar)
5. [Créer une nouvelle table Supabase](#créer-une-nouvelle-table-supabase)
6. [Ajouter une notification](#ajouter-une-notification)
7. [Implémenter une recherche](#implémenter-une-recherche)
8. [Gérer l'upload d'images](#gérer-lupload-dimages)

---

## Créer une nouvelle page liste

### Checklist rapide
- [ ] Créer le fichier page.tsx
- [ ] Ajouter 'use client' en haut
- [ ] Protéger avec useRequireAuth
- [ ] Créer le state pour les données
- [ ] Charger les données avec filtrage enterprise_id
- [ ] Ajouter loading state
- [ ] Ajouter empty state
- [ ] Afficher les données en grid
- [ ] Ajouter bouton de création

### Code template

```tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import EmptyState from '@/components/ui/EmptyState'
import { PlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'

// 1. Définir l'interface de vos données
interface MyItem {
  id: string
  name: string
  description: string
  is_active: boolean
  created_at: string
}

export default function MyItemsPage() {
  const router = useRouter()
  const { session, isLoading: authLoading } = useAuth()
  const [items, setItems] = useState<MyItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState<string | null>(null)

  // 2. Protection de la page
  useEffect(() => {
    if (!authLoading && (!session || session.role !== 'Admin')) {
      router.push('/login')
    }
  }, [authLoading, session, router])

  // 3. Charger les données au montage
  useEffect(() => {
    if (session?.enterprise?.id) {
      loadItems()
    }
  }, [session])

  // 4. Fonction de chargement
  const loadItems = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('my_table') // 🔄 Changer le nom de la table
        .select('*')
        .eq('enterprise_id', session!.enterprise!.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) throw error

      setItems(data as MyItem[])
    } catch (err: any) {
      console.error('Error loading items:', err)
      setError('Erreur lors du chargement des données')
    } finally {
      setIsLoading(false)
    }
  }

  // 5. Filtrage côté client
  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // 6. Loading state
  if (authLoading || isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner />
        </div>
      </DashboardLayout>
    )
  }

  // 7. Render
  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Mes Items</h1>
            <p className="text-gray-600 mt-1">
              Gérez vos items ici
            </p>
          </div>
          <Button onClick={() => router.push('/dashboard/items/create')}>
            <PlusIcon className="w-4 h-4 mr-2" />
            Créer
          </Button>
        </div>

        {/* Message d'erreur */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <p className="text-red-700">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Barre de recherche */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Liste */}
        {filteredItems.length === 0 ? (
          <EmptyState
            icon={PlusIcon}
            title="Aucun item"
            description={searchQuery ? "Aucun résultat pour cette recherche" : "Commencez par créer votre premier item"}
            action={
              !searchQuery ? (
                <Button onClick={() => router.push('/dashboard/items/create')}>
                  <PlusIcon className="w-4 h-4 mr-2" />
                  Créer un item
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((item) => (
              <Card
                key={item.id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => router.push(`/dashboard/items/${item.id}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{item.name}</CardTitle>
                    <Badge variant={item.is_active ? 'success' : 'neutral'}>
                      {item.is_active ? 'Actif' : 'Inactif'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 text-sm line-clamp-2">
                    {item.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
```

---

## Créer une page détail

### Checklist rapide
- [ ] Créer `[id]/page.tsx`
- [ ] Récupérer l'ID depuis les params
- [ ] Charger les données de l'item
- [ ] Ajouter boutons d'actions (Modifier, Supprimer)
- [ ] Gérer la suppression avec confirmation
- [ ] Gérer la redirection après suppression

### Code template

```tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/lib/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { PencilIcon, TrashIcon, ArrowLeftIcon } from '@heroicons/react/24/outline'

interface MyItem {
  id: string
  name: string
  description: string
  is_active: boolean
  created_at: string
}

export default function ItemDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { session } = useAuth()
  const [item, setItem] = useState<MyItem | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (params.id && session?.enterprise?.id) {
      loadItem()
    }
  }, [params.id, session])

  const loadItem = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('my_table')
        .select('*')
        .eq('id', params.id as string)
        .eq('enterprise_id', session!.enterprise!.id)
        .single()

      if (error) throw error

      setItem(data as MyItem)
    } catch (err) {
      console.error('Error loading item:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet item ?')) {
      return
    }

    setIsDeleting(true)

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('my_table')
        .delete()
        .eq('id', item!.id)
        .eq('enterprise_id', session!.enterprise!.id)

      if (error) throw error

      router.push('/dashboard/items')
    } catch (err) {
      console.error('Error deleting item:', err)
      alert('Erreur lors de la suppression')
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner />
        </div>
      </DashboardLayout>
    )
  }

  if (!item) {
    return (
      <DashboardLayout>
        <Card>
          <CardContent className="pt-6">
            <p className="text-gray-600">Item introuvable</p>
            <Button onClick={() => router.push('/dashboard/items')} className="mt-4">
              <ArrowLeftIcon className="w-4 h-4 mr-2" />
              Retour à la liste
            </Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard/items')}
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Retour
          </Button>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => router.push(`/dashboard/items/${item.id}/edit`)}
            >
              <PencilIcon className="w-4 h-4 mr-2" />
              Modifier
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              <TrashIcon className="w-4 h-4 mr-2" />
              {isDeleting ? 'Suppression...' : 'Supprimer'}
            </Button>
          </div>
        </div>

        {/* Détails */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl">{item.name}</CardTitle>
              <Badge variant={item.is_active ? 'success' : 'neutral'}>
                {item.is_active ? 'Actif' : 'Inactif'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Description</label>
              <p className="text-gray-800 mt-1">{item.description}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Date de création</label>
              <p className="text-gray-800 mt-1">
                {new Date(item.created_at).toLocaleDateString('fr-FR')}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
```

---

## Ajouter un modal de formulaire

### Checklist rapide
- [ ] Installer dialog si pas déjà fait: `npx shadcn@latest add dialog`
- [ ] Créer le state pour show/hide
- [ ] Créer le state pour le formulaire
- [ ] Gérer la soumission
- [ ] Gérer la fermeture

### Code template

```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useState } from 'react'

// Dans votre composant
const [showCreateModal, setShowCreateModal] = useState(false)
const [formData, setFormData] = useState({
  name: '',
  description: ''
})
const [isSaving, setIsSaving] = useState(false)

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  setIsSaving(true)

  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('my_table')
      .insert({
        ...formData,
        enterprise_id: session!.enterprise!.id
      })
      .select()
      .single()

    if (error) throw error

    // Fermer le modal
    setShowCreateModal(false)

    // Réinitialiser le formulaire
    setFormData({ name: '', description: '' })

    // Recharger les données
    await loadItems()

    // Message de succès
    alert('Item créé avec succès !')
  } catch (err) {
    console.error('Error creating item:', err)
    alert('Erreur lors de la création')
  } finally {
    setIsSaving(false)
  }
}

// JSX du modal
<Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Créer un nouvel item</DialogTitle>
    </DialogHeader>

    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium">
          Nom <span className="text-red-500">*</span>
        </label>
        <Input
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Nom de l'item"
        />
      </div>

      <div>
        <label className="text-sm font-medium">Description</label>
        <Input
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Description"
        />
      </div>

      <div className="flex gap-2 justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => setShowCreateModal(false)}
          disabled={isSaving}
        >
          Annuler
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? 'Création...' : 'Créer'}
        </Button>
      </div>
    </form>
  </DialogContent>
</Dialog>
```

---

## Ajouter une route dans la sidebar

### Étapes

1. **Ouvrir** `components/layout/AppSidebar.tsx`

2. **Ajouter l'import de l'icône** :
```tsx
import { MyIcon } from '@heroicons/react/24/outline'
```

3. **Ajouter la route dans le bon tableau** :
```tsx
// Pour la navigation principale (Admin)
const mainNavigation: NavItem[] = [
  { name: 'Tableau de bord', href: '/dashboard', icon: HomeIcon, roles: ['Admin'] },
  { name: 'Pièces', href: '/dashboard/rooms', icon: BuildingOfficeIcon, roles: ['Admin'] },
  { name: 'Mes Items', href: '/dashboard/items', icon: MyIcon, roles: ['Admin'] }, // 🆕 Nouvelle route
  // ...
]

// OU pour la navigation opérations
const operationsNavigation: NavItem[] = [
  // ...
  { name: 'Mes Items', href: '/dashboard/items', icon: MyIcon, roles: ['Admin'] }, // 🆕
]

// OU pour la communication
const communicationNavigation: NavItem[] = [
  // ...
]
```

4. **C'est tout !** La route apparaîtra automatiquement dans la sidebar.

---

## Créer une nouvelle table Supabase

### Étapes

1. **Ouvrir Supabase SQL Editor**

2. **Créer la table** :
```sql
CREATE TABLE my_table (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  enterprise_id UUID NOT NULL REFERENCES enterprise(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX idx_my_table_enterprise_id ON my_table(enterprise_id);

-- Trigger pour updated_at
CREATE TRIGGER update_my_table_updated_at
BEFORE UPDATE ON my_table
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE my_table ENABLE ROW LEVEL SECURITY;

-- Commenter la table
COMMENT ON TABLE my_table IS 'Description de ma table';
```

3. **Mettre à jour le schéma local** :
   - Copier le SQL dans `supabase/migrations/XX_my_table.sql`

4. **Générer les types TypeScript** (si nécessaire) :
```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/database.types.ts
```

---

## Ajouter une notification

### Utiliser le système de notifications existant

```typescript
import { messagingService } from '@/lib/services/messaging.service'

// Créer une notification
const sendNotification = async () => {
  await messagingService.createNotification({
    recipient_type: 'Admin',
    recipient_id: session.user.id,
    title: 'Nouvelle notification',
    content: 'Le contenu de votre notification',
    type: 'info', // 'info' | 'warning' | 'error' | 'success'
    priority: 'Info', // 'Info' | 'Warning' | 'Critical'
    enterprise_id: session.enterprise.id
  })
}
```

---

## Implémenter une recherche

### Pattern de recherche en temps réel

```tsx
const [searchQuery, setSearchQuery] = useState('')

// Filtrage côté client (petit dataset)
const filteredItems = items.filter(item =>
  item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
  item.description?.toLowerCase().includes(searchQuery.toLowerCase())
)

// OU filtrage côté serveur (grand dataset)
const searchItems = async (query: string) => {
  const { data } = await supabase
    .from('my_table')
    .select('*')
    .eq('enterprise_id', session.enterprise.id)
    .or(`name.ilike.%${query}%,description.ilike.%${query}%`)

  return data || []
}

// Debounce pour éviter trop de requêtes
import { useDebounce } from 'use-debounce'

const [debouncedQuery] = useDebounce(searchQuery, 500)

useEffect(() => {
  if (debouncedQuery) {
    searchItems(debouncedQuery)
  }
}, [debouncedQuery])
```

---

## Gérer l'upload d'images

### Pattern upload complet

```tsx
import { useState } from 'react'

const [selectedFile, setSelectedFile] = useState<File | null>(null)
const [uploading, setUploading] = useState(false)
const [imageUrl, setImageUrl] = useState<string | null>(null)

const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  if (e.target.files && e.target.files[0]) {
    const file = e.target.files[0]

    // Validation
    if (!file.type.startsWith('image/')) {
      alert('Le fichier doit être une image')
      return
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB
      alert('L\'image ne doit pas dépasser 5MB')
      return
    }

    setSelectedFile(file)
  }
}

const uploadImage = async () => {
  if (!selectedFile) return

  setUploading(true)

  try {
    const supabase = createClient()

    // Générer un nom unique
    const fileExt = selectedFile.name.split('.').pop()
    const fileName = `${session.enterprise.id}/${Date.now()}.${fileExt}`

    // Upload
    const { data, error } = await supabase.storage
      .from('images')
      .upload(fileName, selectedFile)

    if (error) throw error

    // Récupérer l'URL publique
    const { data: { publicUrl } } = supabase.storage
      .from('images')
      .getPublicUrl(fileName)

    setImageUrl(publicUrl)

    // Sauvegarder l'URL dans votre table
    await supabase
      .from('my_table')
      .update({ image_url: publicUrl })
      .eq('id', itemId)

    alert('Image uploadée avec succès !')
  } catch (err) {
    console.error('Error uploading image:', err)
    alert('Erreur lors de l\'upload')
  } finally {
    setUploading(false)
  }
}

// JSX
<div>
  <input
    type="file"
    accept="image/*"
    onChange={handleFileChange}
    className="hidden"
    id="file-upload"
  />
  <label htmlFor="file-upload" className="cursor-pointer">
    <Button type="button" asChild>
      <span>Choisir une image</span>
    </Button>
  </label>

  {selectedFile && (
    <div className="mt-2">
      <p className="text-sm text-gray-600">{selectedFile.name}</p>
      <Button onClick={uploadImage} disabled={uploading}>
        {uploading ? 'Upload...' : 'Uploader'}
      </Button>
    </div>
  )}

  {imageUrl && (
    <img src={imageUrl} alt="Preview" className="mt-2 max-w-xs rounded" />
  )}
</div>
```

---

## Checklist générale avant chaque commit

- [ ] Build réussit (`npm run build`)
- [ ] Pas d'erreurs TypeScript
- [ ] Toutes les requêtes filtrent par `enterprise_id`
- [ ] Loading states ajoutés
- [ ] Empty states ajoutés
- [ ] Messages d'erreur gérés
- [ ] Responsive testé (mobile, tablette, desktop)
- [ ] Composants shadcn/ui utilisés
- [ ] Palette de couleurs pastel respectée
- [ ] Protection par rôle en place

---

**Astuce** : Garder ce fichier ouvert pendant le développement pour référence rapide !

# DESIGN-SYSTEM.md

Guide complet du design system de **cLean** - Application de gestion de crèches avec traçabilité HACCP.

**Dernière mise à jour**: 2025-12-02

---

## 📋 Table des matières

1. [Palette de couleurs](#palette-de-couleurs)
2. [Typographie](#typographie)
3. [Composants shadcn/ui](#composants-shadcnui)
4. [Composants customs](#composants-customs)
5. [Layouts](#layouts)
6. [Patterns d'interface](#patterns-dinterface)
7. [Responsive Design](#responsive-design)
8. [Iconographie](#iconographie)

---

## Palette de couleurs

### 🎨 Système de couleurs par MODULE

Le design system utilise une palette **pastel douce** étendue avec **codes couleurs par module** pour une meilleure reconnaissance visuelle et navigation intuitive.

#### Couleurs système (base)

```css
/* Palette système définie dans app/globals.css */

--primary: #5a9dc9;        /* Bleu pastel - Propreté, sérénité */
--secondary: #f4c2c2;      /* Rose pastel - Chaleur, petite enfance */
--accent: #ffe5b4;         /* Jaune pastel - Actions positives */
--success: #b5ead7;        /* Mint pastel - Conformité HACCP */
--danger: #f87171;         /* Rouge doux - Alertes */
--warning: #fbbf24;        /* Orange/jaune - Attention */
--neutral: #9ca3af;        /* Gris neutre */
```

#### 🧩 Couleurs par module (nouvelle palette)

Chaque module de l'application a sa propre identité visuelle pour faciliter la navigation :

```css
/* ===== MODULE CLEAN (Nettoyage) ===== */
--clean-primary: #5a9dc9;      /* Bleu clair */
--clean-light: #e3f2fd;        /* Bleu très pâle */
--clean-dark: #2c5f7f;         /* Bleu foncé */

/* ===== MODULE HACCP (Traçabilité alimentaire) ===== */
--haccp-primary: #81c995;      /* Vert menthe */
--haccp-light: #e8f5e9;        /* Vert très pâle */
--haccp-dark: #4a8f5a;         /* Vert foncé */

/* ===== MODULE COMMUNICATION (Messages) ===== */
--communication-primary: #64b5d1; /* Turquoise doux */
--communication-light: #e0f7fa;   /* Turquoise pâle */
--communication-dark: #3a7a8f;    /* Turquoise foncé */

/* ===== MODULE USERS (Employés/RH) ===== */
--users-primary: #f4a5a5;      /* Rose pastel */
--users-light: #fce4ec;        /* Rose très pâle */
--users-dark: #c66b6b;         /* Rose foncé */

/* ===== MODULE SETTINGS (Paramètres) ===== */
--settings-primary: #b39ddb;   /* Violet lavande */
--settings-light: #f3e5f5;     /* Violet très pâle */
--settings-dark: #7e57a3;      /* Violet foncé */

/* ===== MODULE CALENDAR (Calendrier/Planning) ===== */
--calendar-primary: #ffab91;   /* Pêche pastel */
--calendar-light: #fff3e0;     /* Pêche très pâle */
--calendar-dark: #d97557;      /* Pêche foncé */

/* ===== MODULE TASKS (Tâches/Checklist) ===== */
--tasks-primary: #aed581;      /* Lime pastel */
--tasks-light: #f1f8e9;        /* Lime très pâle */
--tasks-dark: #7da453;         /* Lime foncé */

/* ===== MODULE ANALYTICS (Statistiques) ===== */
--analytics-primary: #9fa8da;  /* Indigo pastel */
--analytics-light: #e8eaf6;    /* Indigo très pâle */
--analytics-dark: #6870a0;     /* Indigo foncé */
```

### Classes Tailwind correspondantes

```tsx
// === Couleurs système ===
bg-primary-100    // Très clair
bg-primary-500    // Normal
bg-primary-700    // Foncé

// === Couleurs par module (utilisez directement les hex) ===
// Module Clean
className="bg-[#e3f2fd] text-[#2c5f7f] border-[#5a9dc9]"

// Module HACCP
className="bg-[#e8f5e9] text-[#4a8f5a] border-[#81c995]"

// Module Communication
className="bg-[#e0f7fa] text-[#3a7a8f] border-[#64b5d1]"

// Module Users
className="bg-[#fce4ec] text-[#c66b6b] border-[#f4a5a5]"

// Module Settings
className="bg-[#f3e5f5] text-[#7e57a3] border-[#b39ddb]"

// Module Calendar
className="bg-[#fff3e0] text-[#d97557] border-[#ffab91]"

// Module Tasks
className="bg-[#f1f8e9] text-[#7da453] border-[#aed581]"

// Module Analytics
className="bg-[#e8eaf6] text-[#6870a0] border-[#9fa8da]"
```

### 🎯 Guide d'utilisation des couleurs

**Quand utiliser quelle couleur ?**

| Module | Couleur | Usage |
|--------|---------|-------|
| **Clean** | Bleu | Pages nettoyage, sessions, pièces |
| **HACCP** | Vert | Traçabilité, repas, températures |
| **Communication** | Turquoise | Messages, notifications |
| **Users** | Rose | Employés, gestion RH |
| **Settings** | Violet | Paramètres, profil admin |
| **Calendar** | Pêche | Calendrier, planning |
| **Tasks** | Lime | Tâches, checklist |
| **Analytics** | Indigo | Stats, dashboard developer |

### Exemples visuels

```tsx
// Card avec bordure colorée (module Clean)
<Card className="border-l-4 border-l-[#5a9dc9] bg-gradient-to-br from-[#e3f2fd] to-white">
  <CardHeader>
    <BuildingOfficeIcon className="w-6 h-6 text-[#2c5f7f]" />
    <CardTitle>Nettoyage</CardTitle>
  </CardHeader>
</Card>

// Card avec bordure colorée (module HACCP)
<Card className="border-l-4 border-l-[#81c995] bg-gradient-to-br from-[#e8f5e9] to-white">
  <CardHeader>
    <BeakerIcon className="w-6 h-6 text-[#4a8f5a]" />
    <CardTitle>HACCP</CardTitle>
  </CardHeader>
</Card>

// Badge avec couleur module
<Badge className="bg-[#e3f2fd] text-[#2c5f7f] border border-[#5a9dc9]">
  Clean
</Badge>

<Badge className="bg-[#e8f5e9] text-[#4a8f5a] border border-[#81c995]">
  HACCP
</Badge>
```

### Gradients signature cLean

```tsx
// Gradient principal (bleu - module Clean)
className="bg-gradient-to-r from-[#5a9dc9] to-[#2c5f7f]"

// Gradient HACCP (vert)
className="bg-gradient-to-r from-[#81c995] to-[#4a8f5a]"

// Gradient texte
className="bg-gradient-to-r from-[#5a9dc9] to-[#2c5f7f] bg-clip-text text-transparent"

// Gradient card hover avec couleur module
className="hover:bg-gradient-to-br from-[#e3f2fd] to-white"
```

---

## Typographie

### Font principale

**Plus Jakarta Sans** - Google Fonts

```tsx
// Utilisée pour le logo et les titres importants
style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
```

### Hiérarchie des titres

```tsx
// Page title (h1)
<h1 className="text-3xl font-bold text-gray-800">Titre principal</h1>

// Section title (h2)
<h2 className="text-xl font-semibold text-gray-800">Section</h2>

// Subsection title (h3)
<h3 className="text-lg font-medium text-gray-700">Sous-section</h3>

// Card title
<CardTitle className="text-xl font-semibold">Titre carte</CardTitle>

// Description
<CardDescription>Description de la carte</CardDescription>
```

---

## Composants shadcn/ui

Tous les composants shadcn/ui sont dans `components/ui/`. Voici les composants disponibles et comment les utiliser.

### Button

**Fichier**: `components/ui/button.tsx`

```tsx
import { Button } from '@/components/ui/button'

// Variants disponibles
<Button variant="default">Défaut</Button>
<Button variant="destructive">Supprimer</Button>
<Button variant="outline">Outline</Button>
<Button variant="secondary">Secondaire</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="link">Lien</Button>

// Sizes
<Button size="sm">Petit</Button>
<Button size="default">Normal</Button>
<Button size="lg">Grand</Button>
<Button size="icon">Icône seule</Button>

// Avec icône
<Button className="gap-2">
  <PlusIcon className="w-4 h-4" />
  Ajouter
</Button>
```

### Card

**Fichier**: `components/ui/card.tsx`

```tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

<Card>
  <CardHeader>
    <div className="flex items-center gap-2">
      <IconComponent className="w-5 h-5 text-primary-500" />
      <CardTitle>Titre de la carte</CardTitle>
    </div>
    <CardDescription>
      Description optionnelle de la carte
    </CardDescription>
  </CardHeader>
  <CardContent>
    {/* Contenu de la carte */}
  </CardContent>
</Card>
```

### Badge

**Fichier**: `components/ui/badge.tsx`

Composant badge modernisé avec variants étendus.

```tsx
import { Badge } from '@/components/ui/badge'
import { CountBadge } from '@/components/ui/badge'

// Variants disponibles
<Badge variant="default">Défaut</Badge>
<Badge variant="primary">Primary</Badge>
<Badge variant="secondary">Secondary</Badge>
<Badge variant="destructive">Destructive</Badge>
<Badge variant="danger">Danger</Badge>
<Badge variant="success">Succès</Badge>
<Badge variant="warning">Avertissement</Badge>
<Badge variant="neutral">Neutre</Badge>
<Badge variant="outline">Outline</Badge>

// Sizes
<Badge size="sm">Petit</Badge>
<Badge size="md">Moyen</Badge>
<Badge size="lg">Grand</Badge>

// Badge avec compteur (notifications)
<CountBadge count={5} />
```

### Input

**Fichier**: `components/ui/input.tsx`

```tsx
import { Input } from '@/components/ui/input'

<div className="space-y-2">
  <label htmlFor="email" className="text-sm font-medium">
    Email
  </label>
  <Input
    id="email"
    type="email"
    placeholder="votre@email.com"
    value={formData.email}
    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
  />
</div>
```

### Select

**Fichier**: `components/ui/select.tsx`

⚠️ **Important**: Ne jamais utiliser `value=""` pour un SelectItem. Utiliser `"none"` à la place.

```tsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

<Select
  value={formData.type || 'none'}
  onValueChange={(value) => setFormData({
    ...formData,
    type: value === 'none' ? '' : value
  })}
>
  <SelectTrigger>
    <SelectValue placeholder="Sélectionnez un type" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="none">Non renseigné</SelectItem>
    <SelectItem value="option1">Option 1</SelectItem>
    <SelectItem value="option2">Option 2</SelectItem>
  </SelectContent>
</Select>
```

### Avatar

**Fichier**: `components/ui/avatar.tsx`

```tsx
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

// Avec image
<Avatar>
  <AvatarImage src="/avatars/user.jpg" alt="User" />
  <AvatarFallback>JD</AvatarFallback>
</Avatar>

// Avec initiales et gradient
<Avatar className="h-24 w-24 border-4 border-primary-100">
  <AvatarFallback className="bg-gradient-to-br from-primary-400 to-primary-600 text-white text-2xl font-bold">
    FL
  </AvatarFallback>
</Avatar>
```

### Separator

**Fichier**: `components/ui/separator.tsx`

```tsx
import { Separator } from '@/components/ui/separator'

<Separator />
<Separator orientation="vertical" />
```

### Table

**Fichier**: `components/ui/table.tsx`

```tsx
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Nom</TableHead>
      <TableHead>Email</TableHead>
      <TableHead>Actions</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {items.map((item) => (
      <TableRow key={item.id}>
        <TableCell>{item.name}</TableCell>
        <TableCell>{item.email}</TableCell>
        <TableCell>
          <Button size="sm">Modifier</Button>
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

### Sidebar

**Fichier**: `components/ui/sidebar.tsx`

Le système de sidebar utilise les composants shadcn/ui sidebar.

```tsx
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarInset,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger
} from '@/components/ui/sidebar'

// Voir AppSidebar.tsx pour un exemple complet d'utilisation
```

### Autres composants disponibles

```tsx
// Checkbox
import { Checkbox } from '@/components/ui/checkbox'

// Dropdown Menu
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

// Popover
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

// Sheet (drawer)
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'

// Tooltip
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

// Skeleton (loading state)
import { Skeleton } from '@/components/ui/skeleton'

// Calendar
import { Calendar } from '@/components/ui/calendar'
```

---

## Composants customs

### LoadingSpinner

**Fichier**: `components/ui/LoadingSpinner.tsx`

```tsx
import LoadingSpinner from '@/components/ui/LoadingSpinner'

// Dans une page
if (isLoading) {
  return (
    <div className="flex items-center justify-center py-12">
      <LoadingSpinner />
    </div>
  )
}
```

### EmptyState

**Fichier**: `components/ui/EmptyState.tsx`

```tsx
import EmptyState from '@/components/ui/EmptyState'

<EmptyState
  icon={InboxIcon}
  title="Aucune donnée"
  description="Il n'y a pas encore de données à afficher."
  action={
    <Button onClick={handleCreate}>
      <PlusIcon className="w-4 h-4 mr-2" />
      Créer
    </Button>
  }
/>
```

---

## Layouts

### DashboardLayout (Admin)

**Fichier**: `components/layout/DashboardLayout.tsx`

Layout principal pour les admins avec sidebar et header.

```tsx
import DashboardLayout from '@/components/layout/DashboardLayout'

export default function MyPage() {
  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Ma page</h1>
        {/* Contenu */}
      </div>
    </DashboardLayout>
  )
}
```

**Composants inclus**:
- `AppSidebar` - Sidebar avec navigation
- `Header` - Header avec notifications, user menu, theme toggle
- Système de protection par rôle intégré

### DeveloperLayout

**Fichier**: `components/layout/DeveloperLayout.tsx`

Layout pour le developer avec sidebar spécifique.

```tsx
import DeveloperLayout from '@/components/layout/DeveloperLayout'

export default function AnalyticsPage() {
  return (
    <DeveloperLayout>
      <h1 className="text-3xl font-bold">Analytics</h1>
      {/* Contenu */}
    </DeveloperLayout>
  )
}
```

### AppSidebar

**Fichier**: `components/layout/AppSidebar.tsx`

Sidebar principale pour les admins. Configure la navigation par sections.

**Pattern de navigation**:
```typescript
const mainNavigation: NavItem[] = [
  { name: 'Tableau de bord', href: '/dashboard', icon: HomeIcon, roles: ['Admin'] },
  { name: 'Pièces', href: '/dashboard/rooms', icon: BuildingOfficeIcon, roles: ['Admin'] },
  // ...
]
```

**Logique isActive importante**:
```typescript
// Pour /dashboard, vérifier uniquement l'égalité exacte
// Pour éviter que /dashboard soit actif sur /dashboard/profil
const isActive = item.href === '/dashboard'
  ? pathname === '/dashboard'
  : pathname === item.href || pathname?.startsWith(item.href + '/')
```

### Header

**Fichier**: `components/layout/Header.tsx`

Header avec notifications, user menu, et theme toggle.

**Features**:
- Badge notifications avec compteur
- User menu avec avatar et initiales
- Theme toggle (dark/light)
- Dropdown menu avec "Mon profil" et "Déconnexion"

---

## Patterns d'interface

### Pattern: Page avec données filtrables

```tsx
'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/contexts/AuthContext'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import EmptyState from '@/components/ui/EmptyState'

export default function MyListPage() {
  const { session } = useAuth()
  const [items, setItems] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadItems()
  }, [])

  const loadItems = async () => {
    setIsLoading(true)
    // Charger les données
    setIsLoading(false)
  }

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Titre</h1>
            <p className="text-gray-600 mt-1">Description</p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <PlusIcon className="w-4 h-4 mr-2" />
            Créer
          </Button>
        </div>

        {/* Filtres */}
        <Card>
          <CardContent className="pt-6">
            <Input
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-md"
            />
          </CardContent>
        </Card>

        {/* Liste */}
        {filteredItems.length === 0 ? (
          <EmptyState
            title="Aucun résultat"
            description="Aucun élément trouvé."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((item) => (
              <Card key={item.id}>
                <CardHeader>
                  <CardTitle>{item.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Contenu carte */}
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

### Pattern: Page profil avec mode édition

Voir `app/(dashboard)/dashboard/profil/page.tsx` pour un exemple complet.

**Structure**:
1. Avatar avec initiales en haut
2. Badges de statut (rôle, entreprise)
3. Bouton "Modifier" qui active le mode édition
4. Cards organisées par sections (Infos perso, Entreprise, Sécurité)
5. Messages de succès/erreur avec icônes
6. Boutons "Enregistrer" / "Annuler" en mode édition

### Pattern: Modal/Dialog de création

```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

const [showCreateModal, setShowCreateModal] = useState(false)
const [formData, setFormData] = useState({ name: '', description: '' })

<Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Créer un élément</DialogTitle>
    </DialogHeader>
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium">Nom</label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
      </div>
      <Button type="submit">Créer</Button>
    </form>
  </DialogContent>
</Dialog>
```

### Pattern: Cartes statistiques (KPIs)

```tsx
import { Card, CardContent } from '@/components/ui/card'

<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
  <Card>
    <CardContent className="pt-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">Total</p>
          <p className="text-3xl font-bold text-gray-800">125</p>
        </div>
        <div className="p-3 bg-primary-100 rounded-full">
          <IconComponent className="w-6 h-6 text-primary-600" />
        </div>
      </div>
    </CardContent>
  </Card>
</div>
```

---

## Responsive Design

### Breakpoints Tailwind

```css
sm: 640px   /* Mobile landscape */
md: 768px   /* Tablet */
lg: 1024px  /* Desktop */
xl: 1280px  /* Large desktop */
2xl: 1536px /* XL desktop */
```

### Pattern responsive commun

```tsx
// Grid responsive
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

// Flex responsive
<div className="flex flex-col md:flex-row gap-4">

// Padding responsive
<div className="p-4 md:p-6 lg:p-8">

// Text responsive
<h1 className="text-2xl md:text-3xl lg:text-4xl font-bold">

// Hide on mobile
<div className="hidden md:block">Desktop only</div>

// Hide on desktop
<div className="block md:hidden">Mobile only</div>
```

### Interface tablette

Pour l'interface tablette (`/tablet/*`), utiliser de **grands boutons tactiles** :

```tsx
// Classe custom pour mode tablette
<button className="tablet-mode">Grand bouton</button>

// Défini dans globals.css
.tablet-mode {
  @apply text-2xl py-6 px-8 rounded-2xl shadow-lg;
}
```

---

## Iconographie

### Heroicons v2

Le projet utilise **Heroicons v2** (outline style).

```tsx
import {
  HomeIcon,
  UserIcon,
  BuildingOfficeIcon,
  ClipboardDocumentListIcon,
  // ... autres icônes
} from '@heroicons/react/24/outline'

// Utilisation
<HomeIcon className="w-5 h-5 text-primary-500" />
```

### Tailles d'icônes standard

```tsx
// Petite (inline avec texte)
<Icon className="w-4 h-4" />

// Normale (navigation, boutons)
<Icon className="w-5 h-5" />

// Grande (cards, headers)
<Icon className="w-6 h-6" />

// Très grande (avatars, illustrations)
<Icon className="w-12 h-12" />
```

---

## Animations et transitions

### Framer Motion

Le projet utilise **Framer Motion** pour les animations.

```tsx
import { motion, AnimatePresence } from 'framer-motion'

// Bouton avec hover
<motion.button
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.95 }}
  className="btn-primary"
>
  Cliquer
</motion.button>

// Apparition avec fade
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -20 }}
>
  Contenu
</motion.div>

// Liste animée
<AnimatePresence>
  {items.map((item) => (
    <motion.div
      key={item.id}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {item.name}
    </motion.div>
  ))}
</AnimatePresence>
```

---

## Messages et feedback utilisateur

### Messages de succès/erreur

```tsx
{error && (
  <Card className="border-red-200 bg-red-50">
    <CardContent className="pt-6">
      <div className="flex items-start gap-3">
        <XCircleIcon className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <p className="font-semibold text-red-900">Erreur</p>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      </div>
    </CardContent>
  </Card>
)}

{success && (
  <Card className="border-green-200 bg-green-50">
    <CardContent className="pt-6">
      <div className="flex items-start gap-3">
        <CheckCircleIcon className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <p className="font-semibold text-green-900">Succès</p>
          <p className="text-sm text-green-700">{success}</p>
        </div>
      </div>
    </CardContent>
  </Card>
)}
```

### Loading states

```tsx
// Spinner de chargement
<LoadingSpinner />

// Skeleton pour liste
<div className="space-y-4">
  {[1, 2, 3].map((i) => (
    <Skeleton key={i} className="h-20 w-full" />
  ))}
</div>

// Bouton en chargement
<Button disabled={isLoading}>
  {isLoading ? 'Chargement...' : 'Enregistrer'}
</Button>
```

---

## Best Practices

### ✅ À faire

1. **Toujours utiliser les composants shadcn/ui** quand disponibles
2. **Respecter la palette de couleurs pastel**
3. **Utiliser des gradients pour les éléments importants** (CTA, titres)
4. **Ajouter des icônes** pour une meilleure lisibilité
5. **Prévoir des états vides** (EmptyState)
6. **Afficher des messages de feedback** (succès/erreur)
7. **Responsive first** - toujours tester sur mobile
8. **Utiliser le système de grid** pour les listes

### ❌ À éviter

1. ❌ Ne pas utiliser `value=""` dans SelectItem (utiliser `"none"`)
2. ❌ Ne pas oublier le filtre `enterprise_id` dans les requêtes
3. ❌ Ne pas créer de composants custom si shadcn/ui existe
4. ❌ Ne pas utiliser des couleurs hors palette
5. ❌ Ne pas oublier les états de chargement
6. ❌ Ne pas oublier la protection par rôle (`useRequireAuth`)

---

## Exemples de pages complètes

### Page simple (liste)

Voir: `app/(dashboard)/dashboard/rooms/page.tsx`

### Page complexe (détail avec actions)

Voir: `app/(dashboard)/dashboard/sessions/[id]/page.tsx`

### Page profil

Voir: `app/(dashboard)/dashboard/profil/page.tsx`

### Page login moderne

Voir: `app/(auth)/login/page.tsx`

---

## Checklist nouvelle page

Quand tu crées une nouvelle page, vérifie :

- [ ] Import de `DashboardLayout` ou `DeveloperLayout`
- [ ] Protection par rôle avec `useAuth()` ou `useRequireAuth()`
- [ ] Filtre `enterprise_id` dans toutes les requêtes Supabase
- [ ] État de chargement (`isLoading` + `LoadingSpinner`)
- [ ] État vide (`EmptyState`)
- [ ] Messages succès/erreur
- [ ] Responsive (grid avec breakpoints md/lg)
- [ ] Icônes Heroicons
- [ ] Couleurs de la palette pastel
- [ ] Composants shadcn/ui (Card, Button, Badge, etc.)

---

**📌 Notes importantes**:
- Ce design system est évolutif, tu peux ajouter de nouveaux patterns si besoin
- Toujours privilégier la cohérence avec l'existant
- Le design doit rester **doux et rassurant** (univers petite enfance)

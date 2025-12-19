---
name: design-system-enforcer
description: Assure le respect du design system "Douceur Professionnelle" de Luniqo avec palette pastel, composants shadcn/ui, et patterns UI cohérents. Utilise quand tu crées des interfaces, composants, ou révises le design.
allowed-tools: Read, Grep, Glob
---

# Luniqo Design System Enforcer

Gardien du design system "Douceur Professionnelle" de Luniqo - Une application de gestion de crèche avec une identité visuelle douce, professionnelle et rassurante.

## Identité visuelle

### Logo & Mascotte
- **Logo**: Bébé mascotte avec la lettre "L" (Luniqo)
- **Fichier**: `/public/luniqo-logo.svg`
- **Usage**: Header, écran de connexion, emails
- **Alternative**: `/public/luniqo-icon.svg` pour favicons

### Palette de couleurs pastel

**Couleurs principales**:
```typescript
// Modules Luniqo (Nettoyage)
'users': '#E8D5E8',      // Lavande - Équipe/Users
'rooms': '#FFE5D9',      // Pêche - Salles
'tasks': '#E5F4D7',      // Lime - Tâches
'communication': '#D4EEF2', // Turquoise - Messages
'haccp': '#B5EAD7',      // Mint - HACCP & Conformité
'settings': '#E8E1F5',   // Violet - Paramètres
'analytics': '#D9E4F5',  // Indigo - Analytics
'calendar': '#FFE5D9'    // Pêche - Calendrier
```

**Couleurs sémantiques**:
```typescript
// Success, Warning, Error
success: '#B5EAD7',   // Mint
warning: '#FFE5B4',   // Jaune pastel
error: '#FFB4B4',     // Rouge pastel
info: '#D4EEF2'       // Turquoise
```

**Configuration Tailwind** (`app/globals.css`):
```css
@theme {
  --color-primary: #5a9dc9;
  --color-secondary: #f4c2c2;
  --color-accent: #ffe5b4;
  --color-success: #b5ead7;
  --color-warning: #ffe5b4;
  --color-error: #ffb4b4;

  /* Module colors */
  --color-module-users: #E8D5E8;
  --color-module-rooms: #FFE5D9;
  --color-module-tasks: #E5F4D7;
  /* ... */
}
```

## Composants shadcn/ui obligatoires

**RÈGLE**: TOUJOURS utiliser les composants shadcn/ui au lieu de HTML brut.

### ✅ Composants disponibles

**Formulaires**:
- `Button` - Boutons avec variants (default, outline, ghost, destructive)
- `Input` - Champs texte
- `Select` - Sélecteurs (⚠️ Jamais `value=""`, utiliser `value="none"`)
- `Textarea` - Zone de texte multiligne
- `Checkbox` - Cases à cocher
- `Switch` - Interrupteurs
- `Label` - Labels de formulaire

**Layout**:
- `Card`, `CardHeader`, `CardTitle`, `CardContent` - Cartes
- `Separator` - Séparateurs visuels
- `ScrollArea` - Zone défilante personnalisée

**Feedback**:
- `Badge` - Pastilles de statut
- `Alert`, `AlertDescription` - Alertes (success, warning, error)
- `Dialog` - Modales
- `Popover` - Popovers
- `Tooltip` - Info-bulles

**Navigation**:
- `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` - Onglets

### Patterns de composants

#### 1. Card (Container de base)
```tsx
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

// ✅ Pattern standard
<Card className="bg-module-rooms">
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <BuildingOfficeIcon className="h-5 w-5" />
      Salles
    </CardTitle>
  </CardHeader>
  <CardContent>
    {/* Contenu */}
  </CardContent>
</Card>

// ❌ HTML brut
<div className="rounded-lg border p-4">
  <h3 className="font-semibold">Salles</h3>
  {/* ... */}
</div>
```

#### 2. Button (Actions)
```tsx
import { Button } from '@/components/ui/button'

// ✅ Variants disponibles
<Button variant="default">Enregistrer</Button>
<Button variant="outline">Annuler</Button>
<Button variant="ghost">Fermer</Button>
<Button variant="destructive">Supprimer</Button>

// ✅ Avec icône
<Button className="flex items-center gap-2">
  <PlusIcon className="h-4 w-4" />
  Ajouter
</Button>

// ❌ HTML brut
<button className="bg-primary text-white px-4 py-2 rounded">
  Enregistrer
</button>
```

#### 3. Select (⚠️ Pattern spécial)
```tsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

// ✅ Pattern correct (jamais value="")
<Select
  value={roomType || "none"}
  onValueChange={(value) => setRoomType(value === "none" ? "" : value)}
>
  <SelectTrigger>
    <SelectValue placeholder="Sélectionner un type" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="none">-- Aucun --</SelectItem>
    <SelectItem value="BABY">Bébés</SelectItem>
    <SelectItem value="TODDLER">Moyens</SelectItem>
  </SelectContent>
</Select>

// ❌ ERREUR - value="" cause un bug
<Select value={roomType || ""}>
```

#### 4. Badge (Statuts)
```tsx
import { Badge } from '@/components/ui/badge'

// ✅ Variants disponibles
<Badge variant="default">Actif</Badge>
<Badge variant="success">Complété</Badge>
<Badge variant="warning">En cours</Badge>
<Badge variant="error">Erreur</Badge>
<Badge variant="outline">Brouillon</Badge>

// ✅ Avec couleur personnalisée
<Badge className="bg-module-haccp text-gray-800">
  HACCP
</Badge>
```

#### 5. Input avec Label
```tsx
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// ✅ Pattern standard
<div className="space-y-2">
  <Label htmlFor="room-name">Nom de la salle</Label>
  <Input
    id="room-name"
    type="text"
    placeholder="Ex: Salle des Bébés"
    value={name}
    onChange={(e) => setName(e.target.value)}
  />
</div>
```

## Iconographie (Heroicons)

**TOUJOURS utiliser Heroicons** (`@heroicons/react/24/outline` ou `/24/solid`)

```tsx
import {
  BuildingOfficeIcon,
  UserGroupIcon,
  ClipboardDocumentListIcon,
  ChatBubbleLeftRightIcon,
  ShieldCheckIcon,
  Cog6ToothIcon,
  ChartBarIcon,
  CalendarIcon,
  HomeIcon,
  PlusIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'

// ✅ Usage avec taille standard
<UserGroupIcon className="h-5 w-5 text-gray-600" />

// ✅ Icône dans titre de Card
<CardTitle className="flex items-center gap-2">
  <BuildingOfficeIcon className="h-5 w-5" />
  Salles
</CardTitle>

// ✅ Icône dans Button
<Button className="flex items-center gap-2">
  <PlusIcon className="h-4 w-4" />
  Ajouter
</Button>
```

**Mapping Module → Icône**:
```typescript
const moduleIcons = {
  users: UserGroupIcon,
  rooms: BuildingOfficeIcon,
  tasks: ClipboardDocumentListIcon,
  communication: ChatBubbleLeftRightIcon,
  haccp: ShieldCheckIcon,
  settings: Cog6ToothIcon,
  analytics: ChartBarIcon,
  calendar: CalendarIcon
}
```

## Layouts & Responsive Design

### Grid Pattern (Mobile-first)
```tsx
// ✅ Pattern responsive standard
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {items.map(item => (
    <Card key={item.id}>...</Card>
  ))}
</div>

// Mobile: 1 colonne
// Tablet: 2 colonnes
// Desktop: 3 colonnes
```

### Spacing (Tailwind)
```tsx
// ✅ Spacing cohérent
<div className="space-y-4">      {/* Vertical spacing entre enfants */}
  <Card>...</Card>
  <Card>...</Card>
</div>

<div className="flex items-center gap-2">  {/* Horizontal gap */}
  <Icon />
  <span>Texte</span>
</div>

// Padding: p-4, p-6, p-8
// Margin: m-4, m-6, m-8
// Gap: gap-2, gap-4, gap-6
```

### Container & Max Width
```tsx
// ✅ Container centralisé avec max-width
<div className="max-w-7xl mx-auto p-6">
  {/* Contenu de la page */}
</div>

// Variants:
// max-w-4xl - Pages étroites (formulaires)
// max-w-7xl - Pages larges (dashboards)
```

## Patterns UI spécifiques Luniqo

### 1. Dashboard Module Cards
```tsx
// ✅ Pattern pour modules du dashboard
<Link href="/owner/rooms">
  <Card className="bg-module-rooms hover:shadow-lg transition-shadow cursor-pointer">
    <CardHeader>
      <CardTitle className="flex items-center gap-2 text-gray-800">
        <BuildingOfficeIcon className="h-5 w-5" />
        Salles
      </CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-3xl font-bold text-gray-900">{roomCount}</p>
      <p className="text-sm text-gray-600">salles actives</p>
    </CardContent>
  </Card>
</Link>
```

### 2. Empty State
```tsx
import { EmptyState } from '@/components/shared/EmptyState'

// ✅ État vide standard
<EmptyState
  icon={BuildingOfficeIcon}
  title="Aucune salle"
  description="Commencez par créer votre première salle."
  action={
    <Button onClick={handleCreate}>
      <PlusIcon className="h-4 w-4 mr-2" />
      Créer une salle
    </Button>
  }
/>
```

### 3. Loading State
```tsx
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

// ✅ Chargement
if (isLoading) {
  return <LoadingSpinner />
}
```

### 4. Success/Error Messages
```tsx
// ✅ Message de succès (Card avec bg vert)
{showSuccess && (
  <Card className="bg-success/20 border-success">
    <CardContent className="pt-6">
      <div className="flex items-center gap-2 text-green-800">
        <CheckIcon className="h-5 w-5" />
        <p>Salle créée avec succès!</p>
      </div>
    </CardContent>
  </Card>
)}

// ✅ Message d'erreur (Card avec bg rouge)
{error && (
  <Card className="bg-error/20 border-error">
    <CardContent className="pt-6">
      <div className="flex items-center gap-2 text-red-800">
        <XMarkIcon className="h-5 w-5" />
        <p>{error}</p>
      </div>
    </CardContent>
  </Card>
)}
```

### 5. Sidebar Navigation (AppSidebar)
```tsx
// ✅ Pattern de navigation avec couleurs modules
const menuItems = [
  {
    href: '/owner/dashboard',
    icon: HomeIcon,
    label: 'Dashboard',
    bgColor: 'bg-white'
  },
  {
    href: '/owner/rooms',
    icon: BuildingOfficeIcon,
    label: 'Salles',
    bgColor: 'bg-module-rooms'
  },
  // ...
]
```

## Typography

### Font Stack
```css
font-family: var(--font-geist-sans), system-ui, sans-serif;
```

### Hiérarchie des titres
```tsx
// Page title
<h1 className="text-3xl font-bold text-gray-900">Gestion des Salles</h1>

// Section title
<h2 className="text-2xl font-semibold text-gray-800">Statistiques</h2>

// Card title (utiliser CardTitle)
<CardTitle className="text-lg font-semibold">Détails</CardTitle>

// Label
<Label className="text-sm font-medium text-gray-700">Nom</Label>

// Body text
<p className="text-gray-600">Texte descriptif...</p>
```

## Checklist de conformité

Avant de finaliser un composant:

- [ ] Utilise des composants shadcn/ui (pas de HTML brut)
- [ ] Palette pastel appliquée (`bg-module-*` ou couleurs custom)
- [ ] Iconographie Heroicons cohérente
- [ ] Responsive design (grid mobile-first)
- [ ] Spacing cohérent (space-y-4, gap-4, etc.)
- [ ] Loading state implémenté (`LoadingSpinner`)
- [ ] Empty state implémenté (`EmptyState`)
- [ ] Messages success/error avec Cards colorées
- [ ] Typography hiérarchisée
- [ ] Pas de `value=""` dans les Select (utiliser `"none"`)
- [ ] Transitions douces (hover:shadow-lg, transition-*)

## Ressources

- Design system complet: `DESIGN-SYSTEM.md`
- Composants shadcn: `components/ui/*`
- Composants partagés: `components/shared/*`
- Config Tailwind: `app/globals.css`
- Heroicons: https://heroicons.com

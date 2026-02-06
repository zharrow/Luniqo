# 📦 Composants Réutilisables - Luniqo

Ce document liste tous les composants réutilisables disponibles dans l'application Luniqo.

**Date de création**: 2026-01-14
**Dernière mise à jour**: 2026-01-14

---

## 📑 Table des Matières

1. [UI Components (shadcn/ui)](#ui-components-shadcnui)
2. [Analytics Components](#analytics-components)
3. [Layout Components](#layout-components)
4. [Shared Components](#shared-components)
5. [Dashboard Components](#dashboard-components)
6. [Form Components](#form-components)

---

## UI Components (shadcn/ui)

Composants de base du design system, issus de shadcn/ui.

**Localisation**: `components/ui/`

### Affichage de Données

- **Badge** - Petits badges colorés pour statuts et catégories
- **Card** - Conteneur avec bordures arrondies et ombre
- **Table** - Tableau HTML standard avec styles
- **DataTable** - Tableau avancé avec tri et pagination (shadcn)
- **Skeleton** - Placeholder animé pendant le chargement

### États et Messages

- **EmptyState** - Message affiché quand aucune donnée n'est disponible
- **LoadingSpinner** - Icône de chargement animée
- **Confetti** - Animation de confettis pour célébrations

### Formulaires

- **Input** - Champ de saisie texte
- **Textarea** - Champ de saisie multi-lignes
- **Select** - Menu déroulant de sélection
- **Checkbox** - Case à cocher
- **Switch** - Interrupteur on/off
- **Label** - Étiquette pour champs de formulaire
- **Calendar** - Sélecteur de date avec calendrier

### Navigation

- **Button** - Bouton avec variantes (default, outline, ghost, destructive)
- **Breadcrumb** - Fil d'Ariane de navigation
- **Tabs** - Onglets de navigation
- **Sidebar** - Barre latérale de navigation (shadcn)
- **Separator** - Ligne de séparation horizontale/verticale

### Overlays

- **Popover** - Bulle contextuelle
- **Tooltip** - Info-bulle au survol
- **DropdownMenu** - Menu déroulant contextuel
- **Sheet** - Panneau latéral qui slide

### Spéciaux

- **Avatar** - Photo de profil circulaire avec fallback
- **BentoGrid** - Grille moderne avec disposition asymétrique
- **CardGrid** - Grille responsive de cartes
- **CompactList** - Liste compacte avec actions
- **KanbanBoard** - Tableau Kanban drag & drop
- **AnimatedGradientText** - Texte avec gradient animé
- **ShineBorder** - Bordure avec effet de brillance animé
- **Chart** - Wrapper pour graphiques (Recharts)

---

## Analytics Components

Composants spécialisés pour les dashboards et analytics (Phase 7).

**Localisation**: `components/analytics/`

### Charts (`components/analytics/charts/`)

- **LineChart** - Graphique en lignes pour tendances temporelles
- **BarChart** - Graphique en barres (vertical/horizontal, stacked)
- **PieChart** - Graphique circulaire (pie/donut)
- **AreaChart** - Graphique en aires (stacked disponible)
- **GaugeChart** - Jauge semi-circulaire pour pourcentages
- **FunnelChart** - Entonnoir de conversion avec taux
- **HeatMap** - Carte de chaleur avec gradient de couleurs

### Metrics (`components/analytics/metrics/`)

- **KPICard** - Carte KPI avec valeur, tendance et sparkline
- **TrendIndicator** - Indicateur de tendance (flèche haut/bas)
- **MetricComparison** - Comparaison entre deux périodes
- **ProgressBar** - Barre de progression avec pourcentage

### Tables (`components/analytics/tables/`)

- **DataTable** - Tableau complet avec tri, recherche, pagination
- **AgingTable** - Tableau spécialisé pour analyse d'ancienneté (invoices)
- **RankingList** - Liste de classement Top N avec médailles

### Exports (`components/analytics/exports/`)

- **ExportButton** - Bouton d'export multi-format (PDF/Excel/CSV)

### Dashboard (`components/analytics/dashboard/`)

- **DashboardGrid** - Grille responsive pour widgets (1-4 colonnes)
- **WidgetCard** - Conteneur de widget avec actions (remove, refresh, expand)
- **WidgetPicker** - Modal de sélection de widgets

---

## Layout Components

Composants de structure et navigation de l'application.

**Localisation**: `components/layout/`

- **Header** - En-tête principal avec logo, nursery selector, notifications
- **AppSidebar** - Barre latérale Owner avec navigation modules
- **EmployeeSidebar** - Barre latérale Employee avec navigation simplifiée
- **DeveloperSidebar** - Barre latérale Developer avec outils admin
- **DashboardLayout** - Layout complet (Header + Sidebar + Content)
- **NurserySelector** - Dropdown de sélection de crèche (multi-site)
- **Sidebar** - Composant Sidebar générique de base

---

## Shared Components

Composants partagés entre différents modules.

**Localisation**: `components/shared/`

- **AvatarSelector** - Sélecteur d'avatar avec upload d'image
- **DeleteConfirmationDialog** - Modal de confirmation de suppression
- **FormDialog** - Modal générique avec formulaire
- **LoadingScreen** - Écran de chargement plein écran
- **ModuleCard** - Carte de module avec icône et description
- **NotificationModal** - Modal de notifications avec liste
- **PageBreadcrumb** - Fil d'Ariane pour navigation de page
- **PhotoUpload** - Upload de photo avec preview et crop

---

## Dashboard Components

Composants spécifiques aux dashboards Owner/Employee.

**Localisation**: `components/dashboard/`

- **CalendarWidget** - Widget calendrier compact pour dashboard
- **StatsCard** - Carte statistique avec icône et valeur

---

## Form Components

Composants spécialisés pour formulaires complexes.

**Localisation**: `components/forms/`

- **EnterpriseSetupForm** - Formulaire de création d'enterprise (2 étapes)
- **NurseryForm** - Formulaire de création/édition de crèche

---

## 🎨 Design System

### Palette de Couleurs

Tous les composants utilisent la palette "Douceur Professionnelle":

```typescript
const colors = {
  blue: '#5a9dc9',      // Primary - Cleanliness, serenity
  pink: '#f4c2c2',      // Secondary - Warmth, childcare
  peach: '#ffe5b4',     // Accent - Positive actions
  mint: '#b5ead7',      // Success - HACCP compliance
  lavender: '#e0b0ff',  // Info - Neutral information
  lime: '#d4f1a5',      // Light green - Growth, health
  turquoise: '#a0d8d8', // Communication - Messaging
}
```

### Variantes des Composants

La plupart des composants supportent plusieurs variantes:

**Button, Badge**:
- `default` - Style principal
- `outline` - Bordure uniquement
- `ghost` - Transparent
- `destructive` - Action dangereuse (rouge)
- `secondary` - Style secondaire

**Sizes**:
- `sm` - Petit
- `md` / `default` - Normal
- `lg` - Grand

### States

Tous les composants gèrent ces states:
- `loading` - État de chargement
- `disabled` - État désactivé
- `error` - État d'erreur
- Empty state avec message personnalisé

---

## 📖 Usage

### Import Simple

```typescript
// UI Components
import { Button, Card, Input, Badge } from '@/components/ui'

// Analytics Components (avec index.ts)
import { LineChart, KPICard, DataTable } from '@/components/analytics'

// Layout Components
import { Header, AppSidebar } from '@/components/layout'

// Shared Components
import { LoadingScreen, ModuleCard } from '@/components/shared'
```

### Exemple d'Utilisation

```typescript
// KPICard avec trend
<KPICard
  title="Taux d'occupation"
  value="85"
  unit="%"
  trend={5.2}
  trendLabel="vs mois dernier"
  color="mint"
  sparklineData={[{value: 80}, {value: 82}, {value: 85}]}
/>

// DataTable avec recherche et pagination
<DataTable
  data={children}
  columns={[
    { key: 'name', header: 'Nom', sortable: true },
    { key: 'age', header: 'Âge', sortable: true },
  ]}
  searchable
  pagination
  pageSize={10}
/>

// ExportButton multi-format
<ExportButton
  formats={['pdf', 'excel', 'csv']}
  onExport={async (format) => {
    await exportReport(format)
  }}
/>
```

---

## 🔍 Pour en Savoir Plus

Pour connaître les props exactes et l'API d'un composant:

1. **Lire le fichier source** dans `components/`
2. **Consulter les types TypeScript** exportés (interfaces `*Props`)
3. **Voir les exemples** dans les pages existantes

**Exemple**:
```typescript
// Voir components/analytics/metrics/KPICard.tsx
export interface KPICardProps {
  title: string
  value: string | number
  unit?: string
  icon?: React.ReactNode
  trend?: number
  trendLabel?: string
  reverseColors?: boolean
  sparklineData?: Array<{ value: number }>
  color?: 'blue' | 'pink' | 'mint' | 'peach' | 'lavender' | 'lime' | 'turquoise'
  loading?: boolean
}
```

---

## 📝 Notes Importantes

### Responsive Design

Tous les composants sont **mobile-first** et responsive:
```typescript
// Grid responsive automatique
<DashboardGrid columns={3}> {/* 1 col mobile, 2 col tablet, 3 col desktop */}
```

### TypeScript

Tous les composants sont **typés strictement**:
- Props interfaces exportées
- Generics pour composants réutilisables (`DataTable<T>`)
- Types d'événements corrects

### Accessibility

Les composants suivent les bonnes pratiques:
- Attributs ARIA appropriés
- Navigation au clavier
- Contraste de couleurs respecté

### Performance

Optimisations intégrées:
- `'use client'` uniquement quand nécessaire
- Lazy loading des graphiques
- Pagination automatique des tables
- Cache des widgets dashboard

---

**Total**: 70+ composants réutilisables disponibles

Pour ajouter un nouveau composant, suivre le pattern existant et créer les exports appropriés dans les fichiers `index.ts`.

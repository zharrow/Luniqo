# Design System v2 - "Modernité Organique"

**Date de création** : 2025-12-09
**Basé sur** : Page HACCP de référence (exemple parfait du design)

---

## 🎨 Philosophie Centrale

### **"Interface Vivante" - Les 3 Piliers**

1. **Éviter la Monotonie** 🌈
   - VARIER les couleurs sur une même page
   - Chaque module a son identité colorée
   - Interface organique et vivante

2. **Ombres Colorées = Identité** ✨
   - Ombres qui reprennent la couleur du module
   - Profondeur subtile et moderne
   - Signature visuelle du design

3. **Micro-interactions Ludiques** 🎭
   - Rotation, scale, glissements
   - Animations fluides (300ms)
   - Interface qui réagit

---

## 📐 Anatomie Parfaite d'une Carte Moderne

Le composant `ModuleCard` intègre **7 éléments essentiels** :

### 1. **Bordure Colorée Fine** (20% opacity)

```tsx
border: `1px solid ${colors.primary}33` // 33 = 20% opacity en hex
```

**Pourquoi ?**
- Identité visuelle subtile sans être invasive
- S'harmonise avec le gradient de fond
- Plus élégant qu'une bordure grise générique

### 2. **Gradient Pastel en Fond** (60% opacity)

```tsx
<div
  className="absolute inset-0 opacity-60"
  style={{ background: `linear-gradient(to bottom right, ${colors.light}, white)` }}
/>
```

**Exemples de couleurs :**
- Clean (bleu) : `#f8fbfd → white`
- HACCP (vert) : `#f1f9f3 → white`
- Users (rose) : `#fef6f7 → white`
- Tasks (lime) : `#f9fcf5 → white`

**Pourquoi ?**
- Ajoute de la profondeur sans surcharger
- Fond blanc pur = trop plat
- Gradient subtil = modernité

### 3. **Ombre COLORÉE au Hover** (25% opacity)

```tsx
// État initial : pas d'ombre
boxShadow: `0 0 0 0 ${colors.shadow}`

// Au hover : ombre colorée douce
onMouseEnter={(e) => {
  e.currentTarget.style.boxShadow = `0 16px 48px -12px ${colors.shadow}`
}}
```

**Décomposition de l'ombre :**
- `0` : décalage horizontal (centré)
- `16px` : décalage vertical (vers le bas)
- `48px` : blur radius (flou important = doux)
- `-12px` : spread négatif (concentre l'ombre)
- `rgba(..., 0.25)` : opacité 25% (très subtil)

**Exemples de couleurs d'ombres :**
- Bleu : `rgba(90,157,201,0.25)`
- Vert : `rgba(129,201,149,0.25)`
- Rose : `rgba(244,165,165,0.25)`
- Lime : `rgba(174,213,129,0.25)`

**Pourquoi ?**
- ❌ Ombres grises = trop corporate, manque de personnalité
- ✅ Ombres colorées = moderne, identité forte, profondeur organique

### 4. **Icône avec Badge Coloré + Animation**

```tsx
<div
  className="inline-flex items-center justify-center w-10 h-10 rounded-2xl mb-3 
             group-hover:scale-105 group-hover:rotate-2 
             transition-all duration-300"
  style={{
    background: `linear-gradient(to bottom right, ${colors.primary}1A, ${colors.primary}0D)`
  }}
>
  <div style={{ color: colors.dark }} className="w-5 h-5">
    {icon}
  </div>
</div>
```

**Caractéristiques :**
- Badge `rounded-2xl` (pas `rounded-full`)
- Gradient très subtil (10% → 5% opacity)
- Animation au hover : `scale-105` + `rotate-2`
- Transition fluide : `duration-300`

### 5. **Chevron Animé** (apparaît au hover)

```tsx
<div
  className="mt-3 w-8 h-8 rounded-full flex items-center justify-center 
             opacity-0 -translate-x-2 
             group-hover:opacity-100 group-hover:translate-x-0 
             transition-all duration-300"
  style={{ backgroundColor: `${colors.primary}14` }}
>
  <svg className="w-4 h-4" style={{ color: colors.primary }}>
    {/* Chevron right */}
  </svg>
</div>
```

**Animation :**
- État initial : `opacity-0`, décalé de `-8px` à gauche
- Au hover : `opacity-100`, position normale
- Glissement fluide avec `transition-all duration-300`

### 6. **Effet Flottant**

```tsx
hover:-translate-y-1 // Lève la carte de 4px
```

**Combiné avec l'ombre colorée** :
- Au hover : carte monte + ombre apparaît
- Effet de profondeur et légèreté

### 7. **Status Indicator avec Pulse** (optionnel)

```tsx
<div className="absolute bottom-5 right-5 flex items-center gap-2 
                opacity-0 group-hover:opacity-100 transition-opacity duration-300">
  <div className="relative">
    <div className="w-2 h-2 rounded-full bg-green-500"></div>
    <div className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-75"></div>
  </div>
  <span className="text-xs text-gray-500 font-medium">Disponible</span>
</div>
```

---

## 🎨 Règle d'Or : Diversité de Couleurs

### ❌ **Mauvaise Pratique : Monotonie**

```tsx
// Page avec toutes les cartes de la même couleur
<ModuleCard module="haccp" title="Enfants" />       // Vert
<ModuleCard module="haccp" title="Repas" />         // Vert
<ModuleCard module="haccp" title="Produits" />      // Vert
<ModuleCard module="haccp" title="Fournisseurs" />  // Vert
```

**Résultat** : Interface monotone, ennuyeuse, manque de vie ❌

### ✅ **Bonne Pratique : Diversité**

```tsx
// Page HACCP avec couleurs variées (EXEMPLE PARFAIT)
<ModuleCard module="users" title="Enfants" />           // Rose pastel
<ModuleCard module="calendar" title="Repas" />          // Pêche pastel
<ModuleCard module="tasks" title="Produits" />          // Lime pastel
<ModuleCard module="communication" title="Fournisseurs" /> // Turquoise
<ModuleCard module="haccp" title="Températures" />      // Vert menthe
<ModuleCard module="settings" title="Équipements" />    // Violet lavande
<ModuleCard module="analytics" title="Documents" />     // Indigo pastel
<ModuleCard module="users" title="Non-conformités" />   // Rose (alertes)
```

**Résultat** : Interface vivante, colorée, organique, moderne ✅

---

## 🎨 Palette de Couleurs par Module

| Module | Primary | Light (fond) | Shadow (hover) | Usage |
|--------|---------|--------------|----------------|-------|
| **clean** | `#5a9dc9` | `#f8fbfd` | `rgba(90,157,201,0.25)` | Nettoyage, sessions, pièces |
| **haccp** | `#81c995` | `#f1f9f3` | `rgba(129,201,149,0.25)` | Traçabilité, températures |
| **users** | `#f4a5a5` | `#fef6f7` | `rgba(244,165,165,0.25)` | Enfants, RH, alertes |
| **tasks** | `#aed581` | `#f9fcf5` | `rgba(174,213,129,0.25)` | Tâches, produits |
| **calendar** | `#ffab91` | `#fffaf8` | `rgba(255,171,145,0.25)` | Repas, planning |
| **settings** | `#b39ddb` | `#faf8fc` | `rgba(179,157,219,0.25)` | Équipements, paramètres |
| **communication** | `#64b5d1` | `#e0f7fa` | `rgba(100,181,209,0.25)` | Messages, fournisseurs |
| **analytics** | `#9fa8da` | `#e8eaf6` | `rgba(159,168,218,0.25)` | Documents, stats |

---

## 📦 Composant ModuleCard - API

### Props

```typescript
interface ModuleCardProps {
  module: 'clean' | 'haccp' | 'users' | 'tasks' | 'calendar' | 'settings' | 'communication' | 'analytics'
  href: string
  icon: ReactNode // Heroicon component
  title: string
  description: string
  status?: { label: string; active: boolean } // Optionnel
  chevron?: boolean // Par défaut : true
  size?: 'sm' | 'md' | 'lg' // Par défaut : 'md'
}
```

### Exemples d'utilisation

```tsx
import { ModuleCard } from '@/components/shared/ModuleCard'
import { UserGroupIcon, CalendarIcon, BeakerIcon } from '@heroicons/react/24/outline'

// Carte normale
<ModuleCard
  module="users"
  href="/owner/haccp/children"
  icon={<UserGroupIcon className="w-5 h-5" strokeWidth={1.5} />}
  title="Enfants"
  description="Gestion des enfants inscrits"
/>

// Carte avec status indicator
<ModuleCard
  module="clean"
  href="/owner/sessions"
  icon={<ClipboardDocumentCheckIcon className="w-5 h-5" strokeWidth={1.5} />}
  title="Nouvelle session"
  description="Démarrer une session"
  status={{ label: 'Disponible', active: true }}
/>

// Carte sans chevron (plus sobre)
<ModuleCard
  module="haccp"
  href="/owner/haccp/temperatures"
  icon={<BeakerIcon className="w-5 h-5" strokeWidth={1.5} />}
  title="Contrôle température"
  description="Enregistrer"
  chevron={false}
/>

// Grande carte (pour actions principales)
<ModuleCard
  module="calendar"
  href="/owner/haccp/meals"
  icon={<CalendarIcon className="w-5 h-5" strokeWidth={1.5} />}
  title="Nouveau repas"
  description="Planifier un repas"
  size="lg"
/>
```

---

## 📐 Layouts Standards

### Grille 4 colonnes (recommandé)

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
  <ModuleCard module="users" {...props} />
  <ModuleCard module="calendar" {...props} />
  <ModuleCard module="tasks" {...props} />
  <ModuleCard module="haccp" {...props} />
</div>
```

### Grille 3 colonnes

```tsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
  <ModuleCard module="clean" {...props} />
  <ModuleCard module="users" {...props} />
  <ModuleCard module="communication" {...props} />
</div>
```

### Grille 2 colonnes

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
  <ModuleCard module="settings" {...props} />
  <ModuleCard module="analytics" {...props} />
</div>
```

---

## ✅ Ce qu'il faut TOUJOURS faire

### 1. **Varier les couleurs**
Sur une même page, utilisez des modules de couleurs différents pour une interface vivante.

### 2. **Ombres colorées**
```tsx
// ✅ CORRECT
hover:shadow-[0_16px_48px_-12px_rgba(90,157,201,0.25)]

// ❌ INCORRECT
hover:shadow-lg  // Ombre grise = trop corporate
```

### 3. **Bordures colorées**
```tsx
// ✅ CORRECT
border: `1px solid ${colors.primary}33` // 20% opacity

// ❌ INCORRECT
border border-gray-200  // Bordure grise = perd l'identité
```

### 4. **Gradients pastels**
```tsx
// ✅ CORRECT
background: `linear-gradient(to bottom right, ${colors.light}, white)`
opacity: 0.6

// ❌ INCORRECT
bg-white  // Trop plat, manque de profondeur
```

### 5. **Micro-animations**
```tsx
// ✅ CORRECT
group-hover:scale-105 group-hover:rotate-2
transition-all duration-300

// ❌ INCORRECT
duration-100  // Trop rapide, effet saccadé
```

### 6. **Effet flottant**
```tsx
// ✅ CORRECT
hover:-translate-y-1

// Combiné avec ombre colorée = effet de profondeur parfait
```

---

## 🚫 Ce qu'il faut ÉVITER

### ❌ 1. **Monotonie de couleur**
Ne JAMAIS utiliser une seule couleur pour toute une page.

### ❌ 2. **Ombres grises**
```tsx
// ❌ MAUVAIS
shadow-lg  // Ombre grise = trop corporate, manque de personnalité
```

### ❌ 3. **Bordures grises uniquement**
```tsx
// ❌ MAUVAIS
border-gray-200  // Perd l'identité du module
```

### ❌ 4. **Fond blanc pur sans gradient**
```tsx
// ❌ MAUVAIS
<Card className="bg-white">  // Trop plat
```

### ❌ 5. **Rectangles pour icônes**
```tsx
// ❌ MAUVAIS - Trop anguleux
rounded-xl

// ✅ CORRECT - Plus doux
rounded-2xl
```

### ❌ 6. **Animations trop rapides**
```tsx
// ❌ MAUVAIS
duration-100  // Effet saccadé

// ✅ CORRECT
duration-300  // Fluide
```

### ❌ 7. **Pas d'animations**
Interface statique = morte, pas moderne.

---

## 📊 Comparatif Avant / Après

### ❌ Avant (Design System Incorrect)

```tsx
// Carte avec bordure grise, ombre grise, fond blanc pur
<Card className="bg-white border border-gray-200 hover:shadow-lg">
  <CardContent className="p-6">
    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-rose-100 to-pink-200">
      <Icon />
    </div>
    <h3 className="text-gray-900">Titre</h3>
    <p className="text-gray-600">Description</p>
  </CardContent>
</Card>
```

**Problèmes** :
- ❌ Ombre grise générique
- ❌ Bordure grise = perd l'identité
- ❌ Pas de gradient de fond = plat
- ❌ Pas d'animations micro

### ✅ Après (Design System Correct)

```tsx
<ModuleCard
  module="users"
  href="/owner/haccp/children"
  icon={<UserGroupIcon className="w-5 h-5" strokeWidth={1.5} />}
  title="Enfants"
  description="Gestion des enfants inscrits"
/>
```

**Avantages** :
- ✅ Ombre rose colorée au hover
- ✅ Bordure rose à 20% opacity
- ✅ Gradient pastel rose en fond
- ✅ Icône avec animation (scale + rotate)
- ✅ Chevron animé
- ✅ Effet flottant

---

## 🎯 Page de Référence : `/owner/haccp`

La page HACCP est **l'exemple parfait** du design system :

**Caractéristiques** :
- ✅ 8 couleurs différentes pour 8 modules
- ✅ Ombres colorées variées au hover
- ✅ Bordures colorées à 20% opacity
- ✅ Gradients pastels en fond
- ✅ Animations micro-interactions
- ✅ Interface vivante et organique

**Voir le code** : `app/(owner)/owner/haccp/page.tsx`

---

## 📝 Checklist de Migration

Quand vous migrez une page vers le nouveau design system :

- [ ] Remplacer les cartes custom par `ModuleCard`
- [ ] Varier les couleurs (pas une seule couleur)
- [ ] Vérifier les ombres colorées au hover
- [ ] Vérifier les bordures colorées (20% opacity)
- [ ] Vérifier les gradients pastels en fond
- [ ] Vérifier les animations (scale, rotate, chevron)
- [ ] Vérifier l'effet flottant au hover
- [ ] Transitions à 300ms minimum
- [ ] Grilles simples (2/3/4 colonnes)

---

**Dernière mise à jour** : 2025-12-09
**Statut** : ✅ Document corrigé - Basé sur la page HACCP de référence
**Composant** : `ModuleCard` dans `components/shared/ModuleCard.tsx`

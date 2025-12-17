# DESIGN-SYSTEM.md

Guide complet du design system de **Luniqo** - Application de gestion de crèches avec traçabilité HACCP.

**Dernière mise à jour**: 2025-12-09 - **Évolution du style "Douceur Professionnelle"** ⭐

---

## 📋 Table des matières

1. [Palette de couleurs](#palette-de-couleurs)
2. [Style "Douceur Professionnelle"](#style-douceur-professionnelle) ⭐ **NOUVEAU**
3. [Typographie](#typographie)
4. [Composants shadcn/ui](#composants-shadcnui)
5. [Composants customs](#composants-customs)
6. [Layouts](#layouts)
7. [Patterns d'interface](#patterns-dinterface)
8. [Responsive Design](#responsive-design)
9. [Iconographie](#iconographie)

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

### Gradients signature Luniqo

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

## Style "Douceur Professionnelle"

⭐ **Design system Luniqo 2025** - Style minimaliste, moderne et chaleureux adapté à l'univers de la petite enfance.

### 🎨 Philosophie du design

Le style "Douceur Professionnelle" combine :
- ✨ **Minimalisme élégant** (inspiration Apple, Arc Browser)
- 🎨 **Chaleur pastel organique** - Utilise **toute la palette de couleurs** pour éviter la monotonie
- 💎 **Profondeur subtile** (ombres douces colorées, effet flottant)
- 🎯 **Micro-interactions ludiques** (rotation, scale, animations)
- 🌈 **Diversité visuelle** - Chaque module a sa propre identité colorée

### 🎨 Principe clé : **Éviter la monotonie**

**❌ Problème identifié** : Utiliser une seule couleur (ex: vert menthe pour tout HACCP) rend l'interface monotone et moins engageante.

**✅ Solution appliquée** : Attribuer des couleurs variées de la palette pastel à chaque module pour créer une interface **organique et vivante**.

**Exemple concret (page HACCP)** :
- ❌ **Avant** : Toutes les cartes en vert menthe → monotone
- ✅ **Après** : Enfants (rose) + Repas (pêche) + Produits (lime) + Fournisseurs (turquoise) + Températures (vert) + Équipements (violet) + Documents (indigo) + Non-conformités (rose) → **interface vivante et colorée**

### 📐 Anatomie d'une carte moderne

```tsx
<a
  href="/dashboard/action"
  className="relative rounded-3xl p-6 bg-white hover:-translate-y-1 hover:shadow-[0_16px_48px_-12px_rgba(90,157,201,0.25)] transition-all duration-300 group overflow-hidden border border-[#5a9dc9]/20"
>
  {/* 1. Gradient pastel doux en fond */}
  <div className="absolute inset-0 bg-gradient-to-br from-[#f8fbfd] to-white opacity-60"></div>

  <div className="relative z-10 flex items-start justify-between">
    <div className="flex-1">
      {/* 2. Icône avec badge coloré et animation */}
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-[#5a9dc9]/10 to-[#5a9dc9]/5 mb-4 group-hover:scale-105 group-hover:rotate-2 transition-all duration-300">
        <IconComponent className="w-6 h-6 text-[#5a9dc9]" strokeWidth={1.5} />
      </div>

      {/* 3. Contenu textuel */}
      <div>
        <h3 className="font-semibold text-lg text-gray-900 mb-1 tracking-tight">
          Titre action
        </h3>
        <p className="text-sm text-gray-600">
          Description de l'action
        </p>
      </div>
    </div>

    {/* 4. Chevron animé (apparaît au hover) */}
    <div className="mt-3 w-8 h-8 rounded-full bg-[#5a9dc9]/8 flex items-center justify-center opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
      <svg className="w-4 h-4 text-[#5a9dc9]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </div>
  </div>

  {/* 5. Status indicator avec pulse (optionnel) */}
  <div className="absolute bottom-5 right-5 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
    <div className="relative">
      <div className="w-2 h-2 rounded-full bg-green-500"></div>
      <div className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-75"></div>
    </div>
    <span className="text-xs text-gray-500 font-medium">Disponible</span>
  </div>
</a>
```

### 🎯 Les 5 éléments clés

#### 1. **Bordure colorée fine (opacité 20%)**

```tsx
// Bordure tout autour avec la couleur du module
border border-[#5a9dc9]/20  // Bleu Clean (20% opacity)
border border-[#81c995]/20  // Vert HACCP
border border-[#f4a5a5]/20  // Rose Users
border border-[#aed581]/20  // Lime Tasks
```

**Pourquoi ?**
- Plus élégant qu'une bordure gauche épaisse
- Identité visuelle subtile sans être invasive
- S'harmonise avec les gradients pastels

#### 2. **Ombres colorées au hover**

```tsx
// Ombre douce qui reprend la couleur du module
hover:shadow-[0_16px_48px_-12px_rgba(90,157,201,0.25)]  // Bleu
hover:shadow-[0_16px_48px_-12px_rgba(129,201,149,0.25)] // Vert
hover:shadow-[0_16px_48px_-12px_rgba(244,165,165,0.25)] // Rose
```

**Décomposition de l'ombre :**
- `0_16px` : décalage vertical (vers le bas)
- `48px` : blur radius (flou important = doux)
- `-12px` : spread (négatif pour concentrer)
- `rgba(..., 0.25)` : opacité 25% (très subtil)

#### 3. **Animations au hover**

```tsx
// Carte qui "flotte"
hover:-translate-y-1        // Lève la carte de 4px
transition-all duration-300 // Transition douce

// Icône qui tourne et grandit
group-hover:scale-105 group-hover:rotate-2  // +5% taille, 2° rotation
transition-all duration-300

// Chevron qui glisse
opacity-0 -translate-x-2                    // État initial (invisible, décalé)
group-hover:opacity-100 group-hover:translate-x-0  // Au hover (visible, position normale)
```

#### 4. **Gradients pastels en fond**

```tsx
// Gradient très doux en arrière-plan (opacity 60%)
<div className="absolute inset-0 bg-gradient-to-br from-[#f8fbfd] to-white opacity-60"></div>

// Variations par module
from-[#f8fbfd] to-white  // Clean (bleu très pâle)
from-[#f1f9f3] to-white  // HACCP (vert très pâle)
from-[#fef6f7] to-white  // Users (rose très pâle)
from-[#f9fcf5] to-white  // Tasks (lime très pâle)
```

#### 5. **Rondeurs généreuses**

```tsx
rounded-3xl  // 24px border-radius (vs rounded-xl = 12px)
```

**Effet :** Plus doux, plus "cocon", moins corporate.

### 📦 Composant ModuleCard (Déjà implémenté ✅)

**Fichier** : `components/shared/ModuleCard.tsx`

Le composant `ModuleCard` standardise toutes les cartes de l'application avec le style "Douceur Professionnelle" :

```tsx
// components/shared/ModuleCard.tsx
import { ReactNode } from 'react'

interface ModuleCardProps {
  module: 'clean' | 'haccp' | 'users' | 'tasks' | 'calendar' | 'settings' | 'communication' | 'analytics'
  href: string
  icon: ReactNode
  title: string
  description: string
  status?: { label: string; active: boolean }
  chevron?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const moduleColors = {
  clean: { primary: '#5a9dc9', light: '#f8fbfd', dark: '#2c5f7f', shadow: 'rgba(90,157,201,0.25)' },
  haccp: { primary: '#81c995', light: '#f1f9f3', dark: '#4a8f5a', shadow: 'rgba(129,201,149,0.25)' },
  users: { primary: '#f4a5a5', light: '#fef6f7', dark: '#c66b6b', shadow: 'rgba(244,165,165,0.25)' },
  tasks: { primary: '#aed581', light: '#f9fcf5', dark: '#7da453', shadow: 'rgba(174,213,129,0.25)' },
  calendar: { primary: '#ffab91', light: '#fffaf8', dark: '#d97557', shadow: 'rgba(255,171,145,0.25)' },
  settings: { primary: '#b39ddb', light: '#faf8fc', dark: '#7e57a3', shadow: 'rgba(179,157,219,0.25)' },
  communication: { primary: '#64b5d1', light: '#e0f7fa', dark: '#3a7a8f', shadow: 'rgba(100,181,209,0.25)' },
  analytics: { primary: '#9fa8da', light: '#e8eaf6', dark: '#6870a0', shadow: 'rgba(159,168,218,0.25)' }
}

export function ModuleCard({
  module,
  href,
  icon,
  title,
  description,
  status,
  chevron = true,
  size = 'md'
}: ModuleCardProps) {
  const colors = moduleColors[module]
  const padding = size === 'lg' ? 'p-6' : 'p-5'
  const iconSize = size === 'lg' ? 'w-12 h-12' : 'w-10 h-10'

  return (
    <a
      href={href}
      className={`relative rounded-3xl ${padding} bg-white hover:-translate-y-1 transition-all duration-300 group overflow-hidden`}
      style={{
        border: `1px solid ${colors.primary}33`, // 33 = 20% opacity en hex
        boxShadow: `0 0 0 0 ${colors.shadow}` // Initial shadow
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = `0 16px 48px -12px ${colors.shadow}`
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = `0 0 0 0 ${colors.shadow}`
      }}
    >
      {/* Gradient fond */}
      <div
        className="absolute inset-0 opacity-60"
        style={{ background: `linear-gradient(to bottom right, ${colors.light}, white)` }}
      />

      <div className="relative z-10 flex items-start justify-between">
        <div className="flex-1">
          {/* Icône */}
          <div
            className={`inline-flex items-center justify-center ${iconSize} rounded-2xl mb-3 group-hover:scale-105 group-hover:rotate-2 transition-all duration-300`}
            style={{
              background: `linear-gradient(to bottom right, ${colors.primary}1A, ${colors.primary}0D)`
            }}
          >
            <div style={{ color: colors.dark }}>
              {icon}
            </div>
          </div>

          {/* Texte */}
          <div>
            <h3 className={`font-semibold text-gray-900 mb-0.5 tracking-tight ${size === 'lg' ? 'text-lg' : 'text-base'}`}>
              {title}
            </h3>
            <p className="text-xs text-gray-600">{description}</p>
          </div>
        </div>

        {/* Chevron optionnel */}
        {chevron && (
          <div
            className="mt-3 w-8 h-8 rounded-full flex items-center justify-center opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300"
            style={{ backgroundColor: `${colors.primary}14` }}
          >
            <svg className="w-4 h-4" style={{ color: colors.primary }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        )}
      </div>

      {/* Status indicator optionnel */}
      {status && (
        <div className="absolute bottom-5 right-5 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="relative">
            <div className={`w-2 h-2 rounded-full ${status.active ? 'bg-green-500' : 'bg-gray-400'}`}></div>
            {status.active && (
              <div className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-75"></div>
            )}
          </div>
          <span className="text-xs text-gray-500 font-medium">{status.label}</span>
        </div>
      )}
    </a>
  )
}
```

### 🎯 Utilisation du composant ModuleCard

**Exemple d'utilisation** (Dashboard Owner) :

```tsx
import { ModuleCard } from '@/components/shared/ModuleCard'
import { ClipboardDocumentCheckIcon, BeakerIcon, UserGroupIcon } from '@heroicons/react/24/outline'

// Dans votre page
<div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
  {/* Grande carte principale - double largeur */}
  <div className="col-span-2">
    <ModuleCard
      module="clean"
      href="/owner/sessions"
      icon={<ClipboardDocumentCheckIcon className="w-6 h-6" strokeWidth={1.5} />}
      title="Nouvelle session"
      description="Démarrer une session de nettoyage"
      status={{ label: 'Disponible', active: true }}
      size="lg"
    />
  </div>

  {/* Cartes normales avec couleurs variées */}
  <ModuleCard
    module="haccp"
    href="/owner/haccp"
    icon={<BeakerIcon className="w-5 h-5" strokeWidth={1.5} />}
    title="HACCP"
    description="Traçabilité"
  />

  <ModuleCard
    module="users"
    href="/owner/users"
    icon={<UserGroupIcon className="w-5 h-5" strokeWidth={1.5} />}
    title="Employés"
    description="Gérer"
  />

  <ModuleCard
    module="tasks"
    href="/owner/tasks"
    icon={<ClipboardDocumentListIcon className="w-5 h-5" strokeWidth={1.5} />}
    title="Tâches"
    description="Gérer"
  />
</div>
```

### 🎨 Règle d'attribution des couleurs

**Pour éviter la monotonie, variez les couleurs des cartes selon le contexte :**

| Contexte | Couleur recommandée | Module |
|----------|---------------------|---------|
| Nettoyage, sessions, pièces | Bleu clair | `clean` |
| HACCP, températures, conformité | Vert menthe | `haccp` |
| Employés, RH, alertes | Rose pastel | `users` |
| Tâches, checklist | Lime pastel | `tasks` |
| Repas, planning, calendrier | Pêche pastel | `calendar` |
| Paramètres, équipements | Violet lavande | `settings` |
| Messages, fournisseurs | Turquoise | `communication` |
| Stats, analytics, documents | Indigo pastel | `analytics` |

**💡 Conseil** : Sur une même page avec plusieurs cartes, **variez les couleurs** pour créer une interface vivante et organique !

### 🎨 Variantes de design

#### Carte sans chevron (plus sobre)

```tsx
<ModuleCard chevron={false} {...props} />
```

#### Carte avec bordure plus marquée (hover)

```tsx
// Ajouter une classe custom
className="hover:border-[#5a9dc9]/40"  // Passe de 20% à 40% au hover
```

#### Carte avec effet glow (plus moderne)

```tsx
// Ajouter après le gradient de fond
<div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
  <div
    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] rounded-full blur-3xl"
    style={{ backgroundColor: `${colors.primary}33` }}
  />
</div>
```

### 📋 Patterns d'application du style

#### Pattern 1 : Page avec grille de modules (Actions rapides)

**Utilisation** : Dashboard, pages principales avec accès rapide

```tsx
<div className="mb-8">
  <h2 className="text-xl font-semibold mb-4">Actions rapides</h2>
  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
    {/* Action principale (double largeur) */}
    <div className="col-span-2">
      <ModuleCard module="clean" {...props} size="lg" />
    </div>

    {/* Actions secondaires avec couleurs variées */}
    <ModuleCard module="haccp" {...props} />
    <ModuleCard module="users" {...props} />
    <ModuleCard module="tasks" {...props} />
    <ModuleCard module="calendar" {...props} />
  </div>
</div>
```

#### Pattern 2 : Page thématique avec cartes du même thème

**Utilisation** : Pages HACCP, pages de sous-modules

```tsx
// ❌ ÉVITER : Toutes les cartes de la même couleur
<ModuleCard module="haccp" /> // Vert
<ModuleCard module="haccp" /> // Vert - MONOTONE !
<ModuleCard module="haccp" /> // Vert

// ✅ PRÉFÉRER : Varier les couleurs par sous-module
<ModuleCard module="users" title="Enfants" />      // Rose
<ModuleCard module="calendar" title="Repas" />     // Pêche
<ModuleCard module="tasks" title="Produits" />     // Lime
<ModuleCard module="communication" title="Fournisseurs" /> // Turquoise
<ModuleCard module="haccp" title="Températures" /> // Vert
<ModuleCard module="settings" title="Équipements" /> // Violet
```

#### Pattern 3 : Liste avec items cliquables

**Pour les listes d'items** (pièces, sessions, employés), créer un composant similaire :

```tsx
// Créer un composant ItemCard basé sur ModuleCard
<a
  href={item.href}
  className="relative rounded-3xl p-5 bg-white hover:-translate-y-1 transition-all duration-300 group overflow-hidden"
  style={{
    border: `1px solid ${colors.primary}33`,
    boxShadow: `0 0 0 0 ${colors.shadow}`
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.boxShadow = `0 16px 48px -12px ${colors.shadow}`
  }}
>
  {/* Contenu de l'item */}
</a>
```

### ✅ Checklist pour appliquer ce style

Quand vous créez une nouvelle carte/module :

- [ ] **Bordure colorée fine** : `border border-[COULEUR]/20`
- [ ] **Ombre colorée au hover** : `hover:shadow-[0_16px_48px_-12px_rgba(...,0.25)]`
- [ ] **Effet flottant** : `hover:-translate-y-1`
- [ ] **Rondeurs généreuses** : `rounded-3xl`
- [ ] **Gradient pastel en fond** : `bg-gradient-to-br from-[COULEUR_LIGHT] to-white opacity-60`
- [ ] **Icône avec badge animé** : `group-hover:scale-105 group-hover:rotate-2`
- [ ] **Transitions fluides** : `transition-all duration-300`
- [ ] **Chevron animé (optionnel)** : Apparaît au hover avec `translate-x`
- [ ] **Status indicator (optionnel)** : Avec animation `ping` pour l'état actif
- [ ] **⭐ NOUVEAU : Varier les couleurs** : Utiliser différents modules de couleur pour éviter la monotonie

### 🚫 Erreurs à éviter

❌ **Ne pas faire :**
- **Monotonie de couleur** : Utiliser la même couleur pour toutes les cartes d'une page (ex: tout en vert)
- Bordure gauche épaisse (`border-l-4`) - trop "lourd"
- Bordure grise générique (`border-gray-200`) - perd l'identité du module
- Ligne colorée en haut uniquement - crée un déséquilibre visuel
- Ombres noires dures (`shadow-lg`) - trop brutal
- Animations trop rapides (`duration-100`) - effet saccadé
- Bordures trop opaques (`/50` ou plus) - trop visible

✅ **À faire :**
- **Varier les couleurs** : Utiliser toute la palette pour une interface vivante et organique
- Bordure fine colorée tout autour (`border-[COULEUR]/20`)
- Ombres colorées douces au hover (qui reprennent la couleur de la carte)
- Animations à `duration-300` minimum
- Gradients pastels en fond avec `opacity-60`
- Micro-rotations subtiles (`rotate-2`)

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
2. **Appliquer le style "Douceur Professionnelle"** pour toutes les nouvelles cartes/modules (voir section dédiée)
3. **Respecter la palette de couleurs pastel** avec bordures colorées à 20% d'opacité
4. **Utiliser des gradients pastels** en fond de carte avec `opacity-60`
5. **Ajouter des micro-animations** (scale, rotate au hover) pour la ludification
6. **Ajouter des icônes** pour une meilleure lisibilité
7. **Prévoir des états vides** (EmptyState)
8. **Afficher des messages de feedback** (succès/erreur)
9. **Responsive first** - toujours tester sur mobile
10. **Utiliser le système de grid** pour les listes
11. **Ombres colorées au hover** qui reprennent la couleur du module

### ❌ À éviter

1. ❌ **Ne pas créer d'interfaces monochromes** - Varier les couleurs pour éviter la monotonie
2. ❌ Ne pas utiliser `value=""` dans SelectItem (utiliser `"none"`)
3. ❌ Ne pas oublier le filtre `enterprise_id` dans les requêtes
4. ❌ Ne pas créer de composants custom si shadcn/ui existe
5. ❌ Ne pas utiliser des couleurs hors palette
6. ❌ Ne pas oublier les états de chargement
7. ❌ Ne pas oublier la protection par rôle (`useRequireAuth`)
8. ❌ **Ne pas utiliser de bordures gauche épaisses** (`border-l-4`) - préférer les bordures fines tout autour
9. ❌ **Ne pas utiliser d'ombres noires dures** (`shadow-lg`) - préférer les ombres colorées douces
10. ❌ **Ne pas créer d'animations trop rapides** (`duration-100`) - minimum `duration-300`
11. ❌ **Ne pas utiliser `rounded-xl`** pour les cartes - préférer `rounded-3xl` (plus doux)

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

**🎨 Design & Style**
- [ ] **Appliquer le style "Douceur Professionnelle"** (voir section dédiée ci-dessus)
- [ ] **⭐ Varier les couleurs** des cartes pour éviter la monotonie (utiliser toute la palette pastel)
- [ ] Utiliser le composant `ModuleCard` quand possible
- [ ] Bordures colorées fines (`border-[COULEUR]/20`)
- [ ] Ombres colorées au hover (reprenant la couleur de la carte)
- [ ] Gradients pastels en fond
- [ ] Micro-animations (scale, rotate)
- [ ] `rounded-3xl` pour les cartes
- [ ] Composants shadcn/ui (Card, Button, Badge, etc.)
- [ ] Icônes Heroicons
- [ ] Couleurs de la palette pastel

**⚙️ Technique & Sécurité**
- [ ] Import de `DashboardLayout` ou `DeveloperLayout`
- [ ] Protection par rôle avec `useAuth()` ou `useRequireAuth()`
- [ ] Filtre `enterprise_id` dans toutes les requêtes Supabase
- [ ] État de chargement (`isLoading` + `LoadingSpinner`)
- [ ] État vide (`EmptyState`)
- [ ] Messages succès/erreur

**📱 UX & Responsive**
- [ ] Responsive (grid avec breakpoints md/lg)
- [ ] Tests sur mobile/tablette/desktop
- [ ] Touch targets suffisants (minimum 44x44px)
- [ ] Navigation claire et intuitive

---

**📌 Notes importantes**:
- Ce design system est évolutif, tu peux ajouter de nouveaux patterns si besoin
- Toujours privilégier la cohérence avec l'existant
- Le design doit rester **doux et rassurant** (univers petite enfance)
- ⭐ **Style "Douceur Professionnelle"** = référence pour toutes les nouvelles cartes/modules
- Priorité : minimalisme élégant + chaleur pastel + micro-animations ludiques

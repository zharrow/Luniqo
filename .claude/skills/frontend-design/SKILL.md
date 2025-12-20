---
name: frontend-design
description: Crée des interfaces frontend distinctives de qualité production avec haute qualité de design. Utilise quand l'utilisateur demande de construire des composants web, des pages ou des applications. Génère du code créatif et poli qui évite l'esthétique générique d'IA.
---

# Frontend Design Skill - Luniqo "Modernité Organique"

Skill pour créer des **interfaces frontend distinctives de qualité production** avec le design system Luniqo v2 "Modernité Organique". Cette skill fournit des formules précises et des règles chirurgicales pour des designs cohérents.

## Les 3 Piliers Fondamentaux (OBLIGATOIRES)

### 1. 🌈 Éviter la Monotonie
**Règle d'or** : VARIER les couleurs sur une même page pour créer une interface vivante et organique.

❌ **INTERDIT** : Toutes les cartes de la même couleur
✅ **OBLIGATOIRE** : Au moins 3-4 couleurs de modules différents par page

### 2. ✨ Ombres Colorées
**Règle d'or** : Les ombres reprennent la couleur du module = signature visuelle moderne.

❌ **INTERDIT** : `shadow-lg` ou ombres grises génériques
✅ **OBLIGATOIRE** : Ombre colorée au format `0 16px 48px -12px rgba(R,G,B,0.25)`

### 3. 🎭 Micro-interactions
**Règle d'or** : Animations ludiques et fluides (300ms minimum).

❌ **INTERDIT** : `duration-100` (saccadé), pas d'animations
✅ **OBLIGATOIRE** : `duration-300` minimum, effets scale/rotate/translate

## Formules Chirurgicales (À COPIER EXACTEMENT)

### Ombre Colorée (Hover)
```tsx
// Au hover uniquement via JavaScript
onMouseEnter={(e) => {
  e.currentTarget.style.boxShadow = '0 16px 48px -12px rgba(R,G,B,0.25)'
}}
onMouseLeave={(e) => {
  e.currentTarget.style.boxShadow = '0 0 0 0 rgba(0,0,0,0)'
}}
```

### Bordure Colorée (20% opacity)
```tsx
style={{ borderColor: colors.primary + '33' }}
// ou pour valeur fixe
style={{ borderColor: '#f4a5a533' }}
```

### Gradient Pastel (Fond de carte)
```tsx
style={{
  background: 'linear-gradient(to bottom right, ${colors.light}, white)'
}}
```

### Badge Icône Animé
```tsx
className="rounded-2xl flex items-center justify-center shadow-md
           group-hover:scale-110 group-hover:rotate-3 transition-all duration-300"
```

### Effet Flottant (Carte)
```tsx
className="hover:-translate-y-1 transition-all duration-300"
```

### Boutons au Hover (Pattern propre)
```tsx
// Conteneur avec opacity-0 par défaut
<div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
  <button className="size-8 rounded-lg hover:bg-gray-100 transition-colors">
    <PencilIcon className="w-4 h-4 text-gray-600" />
  </button>
  <button className="size-8 rounded-lg hover:bg-red-50 transition-colors">
    <TrashIcon className="w-4 h-4 text-red-600" />
  </button>
</div>
```

## Palette de Couleurs Modules (8 couleurs fixes)

**IMPORTANT** : Utiliser CES couleurs exactes, ne PAS inventer d'autres couleurs.

```typescript
const moduleColors = {
  clean: {
    primary: '#5a9dc9',
    light: '#e3f2fd',
    shadow: 'rgba(90,157,201,0.25)'
  },
  haccp: {
    primary: '#81c995',
    light: '#e8f5e9',
    shadow: 'rgba(129,201,149,0.25)'
  },
  users: {
    primary: '#f4a5a5',
    light: '#fef6f7',
    shadow: 'rgba(244,165,165,0.25)'
  },
  tasks: {
    primary: '#aed581',
    light: '#f1f8e9',
    shadow: 'rgba(174,213,129,0.25)'
  },
  calendar: {
    primary: '#ffab91',
    light: '#fff3e0',
    shadow: 'rgba(255,171,145,0.25)'
  },
  settings: {
    primary: '#b39ddb',
    light: '#f3e5f5',
    shadow: 'rgba(179,157,219,0.25)'
  },
  communication: {
    primary: '#64b5d1',
    light: '#e0f7fa',
    shadow: 'rgba(100,181,209,0.25)'
  },
  analytics: {
    primary: '#9fa8da',
    light: '#e8eaf6',
    shadow: 'rgba(159,168,218,0.25)'
  }
}
```

## Standards de Design (Valeurs Exactes)

### Border Radius
- **Cartes** : `rounded-3xl`
- **Badges icônes** : `rounded-2xl`
- **Boutons** : `rounded-lg`
- ❌ **ÉVITER** : `rounded-xl` (trop anguleux)

### Animations (Timing)
- **Standard** : `duration-300` (fluide et agréable)
- **Court** : `duration-200` (transitions rapides)
- ❌ **INTERDIT** : `duration-100` (saccadé)
- ❌ **INTERDIT** : `duration-500+` (trop lent)

### Spacing (Grilles)
- **Gap standard** : `gap-3` (0.75rem) ou `gap-4` (1rem)
- **Gap large** : `gap-6` (1.5rem)

### Grilles Asymétriques (12 colonnes)
```tsx
// ✅ Layout organique avec variation
<div className="grid grid-cols-12 gap-3">
  <Card className="col-span-12 md:col-span-6">Featured</Card>
  <Card className="col-span-12 md:col-span-3">Small</Card>
  <Card className="col-span-12 md:col-span-3">Small</Card>
  <Card className="col-span-12 md:col-span-4">Medium</Card>
  <Card className="col-span-12 md:col-span-4">Medium</Card>
  <Card className="col-span-12 md:col-span-4">Medium</Card>
</div>
```

## Ce qu'il faut ABSOLUMENT Éviter

### ❌ Erreurs Fatales

1. **Monotonie de couleur**
   - Toutes les cartes de la même couleur = interface morte

2. **Ombres grises**
   - `shadow-lg` sans couleur = trop corporate

3. **Bordures grises**
   - `border-gray-200` = perd l'identité du module

4. **Pas de gradients**
   - `bg-white` pur = trop plat

5. **Animations rapides**
   - `duration-100` = effet saccadé

6. **Interface statique**
   - Pas d'animations = interface morte

## Objectif principal

Construire des interfaces **mémorables et distinctives** qui évitent les clichés de design d'IA générique. Chaque interface doit avoir une **direction esthétique claire** et intentionnelle.

## Patterns de Code Réutilisables

### Pattern 1: Carte de Module (Standard)
```tsx
<div
  className="group relative rounded-3xl p-5 bg-white border
             hover:-translate-y-1 transition-all duration-300 cursor-pointer"
  style={{
    borderColor: '#f4a5a533', // 20% opacity
    background: 'linear-gradient(to bottom right, #fef6f7, white)'
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.boxShadow = '0 16px 48px -12px rgba(244,165,165,0.25)'
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.boxShadow = '0 0 0 0 rgba(0,0,0,0)'
  }}
>
  {/* Badge icône */}
  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#f4a5a5] to-[#c66b6b]
                  flex items-center justify-center shadow-md
                  group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
    <Icon className="w-6 h-6 text-white" strokeWidth={2} />
  </div>

  {/* Contenu */}
  <h3 className="font-semibold text-gray-900 mt-3">{title}</h3>
  <p className="text-sm text-gray-600">{description}</p>
</div>
```

### Pattern 2: Liste avec Ombres Colorées Variées
```tsx
// Définir les couleurs en dehors du render
const itemColors = [
  { primary: '#f4a5a5', light: '#fef6f7', shadow: 'rgba(244,165,165,0.25)' },
  { primary: '#ffab91', light: '#fff3e0', shadow: 'rgba(255,171,145,0.25)' },
  { primary: '#aed581', light: '#f1f8e9', shadow: 'rgba(174,213,129,0.25)' },
  // ... 8 couleurs au total
]

const getItemColor = (index: number) => itemColors[index % itemColors.length]

// Dans le render
{items.map((item, index) => {
  const colors = getItemColor(index)
  return (
    <div
      key={item.id}
      className="p-4 rounded-3xl bg-white border hover:-translate-y-1 transition-all duration-300"
      style={{
        borderColor: colors.primary + '33',
        background: `linear-gradient(to bottom right, ${colors.light}, white)`
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = `0 16px 48px -12px ${colors.shadow}`
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 0 0 0 rgba(0,0,0,0)'
      }}
    >
      {/* Contenu */}
    </div>
  )
})}
```

### Pattern 3: En-tête de Page Moderne
```tsx
<div className="relative mb-6 p-6 rounded-3xl bg-white border overflow-hidden
                group hover:-translate-y-1 transition-all duration-300"
  style={{
    borderColor: '#aed58133',
    background: 'linear-gradient(to bottom right, #f1f8e9, white)'
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.boxShadow = '0 16px 48px -12px rgba(174,213,129,0.25)'
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.boxShadow = '0 0 0 0 rgba(174,213,129,0.25)'
  }}
>
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-3">
      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#aed581] to-[#81c78a]
                      flex items-center justify-center shadow-md
                      group-hover:scale-105 group-hover:rotate-2 transition-all duration-300">
        <Icon className="w-6 h-6 text-white" strokeWidth={1.5} />
      </div>
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Titre de Page</h1>
        <p className="text-sm text-gray-600">Description</p>
      </div>
    </div>
    <Button>Action</Button>
  </div>
</div>
```

### Pattern 4: Grille Bento Asymétrique
```tsx
// Layout compact pour réduire le scroll (exemple: 6 items sur 2 lignes)
<div className="grid grid-cols-12 gap-3">
  {/* Ligne 1: 1 featured (6 col) + 2 small (3 col chacune) */}
  <Card className="col-span-12 md:col-span-6">Featured Item</Card>
  <Card className="col-span-12 md:col-span-3">Small 1</Card>
  <Card className="col-span-12 md:col-span-3">Small 2</Card>

  {/* Ligne 2: 3 medium (4 col chacune) */}
  <Card className="col-span-12 md:col-span-4">Medium 1</Card>
  <Card className="col-span-12 md:col-span-4">Medium 2</Card>
  <Card className="col-span-12 md:col-span-4">Medium 3</Card>
</div>
```

## Checklist de Design Chirurgical

Avant de finaliser une interface, vérifier OBLIGATOIREMENT :

### Couleurs
- [ ] ✅ Au moins 3-4 couleurs de modules différents utilisées
- [ ] ✅ Palette strictement limitée aux 8 couleurs modules
- [ ] ❌ Aucune ombre grise (`shadow-lg`, `shadow-md` sans couleur)
- [ ] ❌ Aucune bordure grise (`border-gray-200`)

### Animations
- [ ] ✅ Toutes les transitions sont `duration-300` minimum
- [ ] ✅ Effets hover présents (scale, rotate, translate)
- [ ] ✅ Boutons d'action apparaissent au hover (`opacity-0 group-hover:opacity-100`)
- [ ] ❌ Pas de `duration-100` (saccadé)

### Ombres & Bordures
- [ ] ✅ Ombres colorées au format exact `0 16px 48px -12px rgba(R,G,B,0.25)`
- [ ] ✅ Bordures colorées à 20% opacity (`#COLOR33`)
- [ ] ✅ Gradients pastels en fond (`linear-gradient(to bottom right, ${light}, white)`)

### Layout
- [ ] ✅ Grille 12 colonnes avec variation (pas de grille rigide 3 ou 4 colonnes)
- [ ] ✅ Border radius `rounded-3xl` pour cartes
- [ ] ✅ Gap `gap-3` ou `gap-4` (pas trop grand)

### Micro-interactions
- [ ] ✅ Icônes avec `group-hover:scale-110 group-hover:rotate-3`
- [ ] ✅ Cartes avec `hover:-translate-y-1`
- [ ] ✅ Footer CTA apparaît au hover (`opacity-0 group-hover:opacity-100`)

## Workflow de Design Rapide

### Étape 1 : Choix des Couleurs (30 secondes)
1. Identifier le nombre d'éléments à afficher
2. Sélectionner 3-8 couleurs modules différentes
3. Les alterner de manière organique (éviter les patterns répétitifs)

### Étape 2 : Structure de Base (1-2 minutes)
1. Définir le layout (grille 12 colonnes asymétrique)
2. Appliquer les formules de base :   - Bordures : `borderColor: colors.primary + '33'`
   - Gradients : `background: linear-gradient(to bottom right, ${colors.light}, white)`
   - Border radius : `rounded-3xl`

### Étape 3 : Micro-interactions (1 minute)
1. Ajouter les handlers d'ombre au hover (copier-coller le pattern)
2. Ajouter les effets sur badges icônes (`group-hover:scale-110 group-hover:rotate-3`)
3. Ajouter l'effet flottant sur cartes (`hover:-translate-y-1`)
4. Rendre les boutons d'action visibles au hover (`opacity-0 group-hover:opacity-100`)

### Étape 4 : Vérification Finale (30 secondes)
1. Checker la checklist chirurgicale ci-dessus
2. S'assurer qu'aucune erreur fatale n'est présente
3. Vérifier la variété des couleurs

## Contexte Luniqo

**Direction esthétique** : Organique + Néomorphisme léger
**Audience** : Professionnels de la petite enfance
**Ton** : Doux, professionnel, rassurant
**Stack** : Next.js 15, Tailwind CSS v4, shadcn/ui

### Typographie Fixe
```css
font-family: var(--font-geist-sans), system-ui, sans-serif;

h1: text-3xl font-bold
h2: text-2xl font-semibold
h3: text-lg font-semibold
body: text-base (14px)
small: text-sm (12px)
```

---

## Note Finale

**Philosophie** : Cette skill fournit des règles chirurgicales pour créer des interfaces Luniqo cohérentes et modernes.

**Priorité absolue** : Respecter les 3 piliers fondamentaux (variété de couleurs, ombres colorées, micro-interactions) et utiliser les formules exactes fournies.

**En cas de doute** : Toujours consulter la checklist chirurgicale et les patterns réutilisables ci-dessus.

**Référence** : Voir `/app/design-system/page.tsx` pour des exemples visuels complets du design system.

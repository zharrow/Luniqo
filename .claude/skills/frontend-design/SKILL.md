---
name: frontend-design
description: Crée des interfaces frontend distinctives de qualité production avec haute qualité de design. Utilise quand l'utilisateur demande de construire des composants web, des pages ou des applications. Génère du code créatif et poli qui évite l'esthétique générique d'IA.
---

# Frontend Design Skill

Skill pour créer des **interfaces frontend distinctives de qualité production** qui rejettent les patterns de design formulaïques. L'accent est mis sur la délibération esthétique avant l'implémentation.

**Adapté pour Luniqo**: Cette skill respecte le design system "Douceur Professionnelle" tout en encourageant la créativité dans les limites de la charte graphique.

## Objectif principal

Construire des interfaces **mémorables et distinctives** qui évitent les clichés de design d'IA générique. Chaque interface doit avoir une **direction esthétique claire** et intentionnelle.

## Principes de design clés

### 1. Décisions stratégiques (Avant de coder)

**Questions à se poser**:
- **Objectif**: Quel est le but de cette interface? (Vente, productivité, jeu, éducation?)
- **Audience**: Qui l'utilisera? (Professionnels de crèche, parents, enfants?)
- **Ton**: Quelle émotion doit-elle transmettre? (Sérénité, confiance, efficacité?)
- **Contraintes techniques**: Quel framework? Quelles limitations?

**Pour Luniqo**:
- **Objectif**: Productivité et conformité HACCP pour crèches
- **Audience**: Professionnels de la petite enfance
- **Ton**: Doux, professionnel, rassurant ("Douceur Professionnelle")
- **Contraintes**: Next.js 15, Tailwind CSS v4, shadcn/ui, palette pastel fixe

### 2. Choisir une direction esthétique claire

**Options possibles** (choisir UNE direction):
- **Minimaliste** - Épuré, white space généreux, typographie élégante
- **Maximaliste** - Riche en couleurs, textures, éléments visuels
- **Rétro-futuriste** - Nostalgie + modernité
- **Brutaliste** - Brut, géométrique, contrastes forts
- **Organique** - Formes fluides, courbes, naturel
- **Néomorphisme** - Relief subtil, ombres douces
- **Glassmorphisme** - Effets de verre, transparence, flou

**Direction Luniqo** (pré-définie):
- **Style**: Organique + Néomorphisme léger
- **Caractéristiques**: Palette pastel, coins arrondis, ombres douces, icônes rondes, transitions fluides
- **Atmosphère**: Douceur, sérénité, professionnalisme

### 3. Priorités esthétiques

#### A. Typographie

**✅ Faire**:
- Choisir des polices **belles, uniques et intéressantes**
- Créer une hiérarchie claire (3-4 niveaux max)
- Utiliser des tailles généreuses pour les titres
- Jouer avec le poids (weight) et l'espacement (tracking)

**❌ Éviter**:
- Polices par défaut sans réflexion (Arial, Times New Roman)
- Trop de polices différentes (>2-3)
- Hiérarchie confuse
- Texte illisible (contraste faible, taille trop petite)

**Luniqo**:
```css
/* Font stack */
font-family: var(--font-geist-sans), system-ui, sans-serif;

/* Hiérarchie */
h1: text-3xl font-bold (pages)
h2: text-2xl font-semibold (sections)
h3: text-lg font-semibold (cards)
body: text-base (14px)
small: text-sm (12px)
```

#### B. Couleurs

**✅ Faire**:
- Utiliser des couleurs **dominantes** avec des accents percutants
- Créer des contrastes intentionnels
- Appliquer la théorie des couleurs (complémentaires, triadiques, monochromes)
- Utiliser la couleur pour guider l'attention

**❌ Éviter**:
- Palettes timides et indécises
- Gradients clichés (bleu-violet, rose-orange)
- Trop de couleurs vives simultanément
- Manque de contraste (accessibilité)

**Luniqo** (palette fixe):
```css
/* Couleurs pastel par module */
users: #E8D5E8 (lavande)
rooms: #FFE5D9 (pêche)
tasks: #E5F4D7 (lime)
communication: #D4EEF2 (turquoise)
haccp: #B5EAD7 (mint)
settings: #E8E1F5 (violet)
analytics: #D9E4F5 (indigo)

/* Sémantiques */
success: #B5EAD7
warning: #FFE5B4
error: #FFB4B4
```

**Créativité dans les limites**:
- Combiner plusieurs couleurs modules pour richesse visuelle
- Utiliser des opacités variées (bg-module-rooms/20, /40, /60)
- Gradients subtils entre couleurs adjacentes
- Ombres colorées (shadow-module-haccp)

#### C. Mouvement & Animation

**✅ Faire**:
- Créer des **moments à fort impact** (chargements orchestrés, transitions de page)
- Animer de manière cohérente (même easing, même durée)
- Utiliser l'animation pour guider l'attention
- Microinteractions intentionnelles (hover, focus, click)

**❌ Éviter**:
- Animations dispersées sans cohérence
- Trop d'animations simultanées (distraction)
- Animations lentes (>300ms pour la plupart)
- Mouvements qui causent le mal de mer

**Luniqo**:
```tsx
// ✅ Transitions douces
className="transition-all duration-200 hover:shadow-lg hover:scale-[1.02]"

// ✅ Animation d'entrée orchestrée
<div className="animate-fade-in stagger-delay-100">
  {items.map((item, i) => (
    <Card style={{ animationDelay: `${i * 100}ms` }}>...</Card>
  ))}
</div>

// ✅ Loading avec personnalité
<div className="animate-bounce">
  <img src="/luniqo-icon.svg" alt="Loading..." />
</div>
```

#### D. Composition & Layout

**✅ Faire**:
- Utiliser des **layouts inattendus** (asymétrie, grilles brisées)
- Créer de la profondeur (z-index, ombres, overlaps)
- Jouer avec l'espace blanc (breathing room)
- Guider l'œil avec la composition

**❌ Éviter**:
- Grilles rigides et prévisibles sans variation
- Tout centrer par défaut
- Manque d'espace blanc (claustrophobie)
- Layouts génériques de template

**Luniqo**:
```tsx
// ✅ Grid créative avec tailles variées
<div className="grid grid-cols-12 gap-4">
  <Card className="col-span-12 md:col-span-8">Featured</Card>
  <Card className="col-span-12 md:col-span-4">Sidebar</Card>
  <Card className="col-span-12 md:col-span-4">Small 1</Card>
  <Card className="col-span-12 md:col-span-4">Small 2</Card>
  <Card className="col-span-12 md:col-span-4">Small 3</Card>
</div>

// ✅ Asymétrie intentionnelle
<div className="flex items-start gap-6">
  <div className="w-2/3">{/* Main content */}</div>
  <div className="w-1/3 sticky top-4">{/* Sidebar */}</div>
</div>
```

#### E. Détails & Texture

**✅ Faire**:
- Superposer textures, gradients, effets contextuels
- Ajouter des détails subtils (grain, bruit, motifs)
- Créer de l'atmosphère avec les détails
- Peaufiner les micro-interactions

**❌ Éviter**:
- Surfaces plates sans profondeur
- Éléments visuels sans intention
- Trop de texture (surcharge visuelle)

**Luniqo**:
```tsx
// ✅ Profondeur avec ombres subtiles
className="bg-white shadow-sm hover:shadow-md transition-shadow"

// ✅ Gradient subtil pour ambiance
className="bg-gradient-to-br from-module-rooms to-module-rooms/50"

// ✅ Border colorée pour accent
className="border-l-4 border-module-haccp"

// ✅ Motif de fond (optionnel)
style={{ backgroundImage: 'url(/patterns/dots.svg)' }}
```

## Contraintes critiques

### ❌ Éviter l'esthétique d'IA générique

**Patterns problématiques à ÉVITER**:

1. **Typographie clichée**:
   - ❌ Inter/Roboto/Sans-serif par défaut sans réflexion
   - ❌ Poppins pour "tout" (surutilisée)

2. **Gradients clichés**:
   - ❌ Bleu → Violet (trop vu)
   - ❌ Rose → Orange (Instagram clone)
   - ❌ Gradients trop saturés

3. **Layouts prévisibles**:
   - ❌ Grid 3 colonnes stricte partout
   - ❌ Header + Hero + 3 Features + Footer
   - ❌ Tout centré verticalement/horizontalement

4. **Composants cookie-cutter**:
   - ❌ Cards blanches avec shadow-md partout
   - ❌ Boutons bleus arrondis sans personnalité
   - ❌ Icons outline sans variation

**✅ Pour Luniqo, éviter**:
- Copier des templates génériques de dashboard
- Utiliser des couleurs vives non-pastel
- Ignorer la palette définie
- Créer des interfaces "corporate" froides

## Workflow de design

### Étape 1: Stratégie (Avant de coder)
1. Identifier le but, l'audience, le ton
2. Choisir UNE direction esthétique claire
3. Esquisser mentalement la hiérarchie visuelle
4. Prioriser ce qui rend l'interface mémorable

### Étape 2: Fondations
1. Typographie (hiérarchie, tailles, poids)
2. Couleurs (dominantes, accents, sémantiques)
3. Spacing (cohérent, généreux)
4. Layout (grid system, breakpoints)

### Étape 3: Composants
1. Créer les composants de base (Button, Card, Input)
2. Ajouter les états (hover, focus, active, disabled)
3. Peaufiner les détails (ombres, borders, transitions)
4. Tester la cohérence visuelle

### Étape 4: Composition
1. Assembler les composants en layouts
2. Créer des contrastes intentionnels (taille, couleur, poids)
3. Guider l'œil avec la hiérarchie
4. Ajouter des moments à fort impact (animations, transitions)

### Étape 5: Polish
1. Microinteractions (hover, focus)
2. Loading states (spinners personnalisés)
3. Empty states (illustrations, messages encourageants)
4. Error states (messages utiles, design rassurant)

## Exemples de créativité dans Luniqo

### Exemple 1: Dashboard Module Cards

**Générique** ❌:
```tsx
<div className="grid grid-cols-3 gap-4">
  <Card>
    <h3>Salles</h3>
    <p>12</p>
  </Card>
  {/* Répétition monotone... */}
</div>
```

**Distinctif** ✅:
```tsx
<div className="grid grid-cols-12 gap-4">
  {/* Featured card - Large */}
  <Card className="col-span-12 md:col-span-8 bg-gradient-to-br from-module-rooms to-module-tasks p-8">
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">12 Salles</h2>
        <p className="text-gray-700">3 nettoyages en cours</p>
      </div>
      <BuildingOfficeIcon className="h-16 w-16 text-gray-800 opacity-20" />
    </div>
  </Card>

  {/* Sidebar stats - Stacked */}
  <div className="col-span-12 md:col-span-4 space-y-4">
    <Card className="bg-module-tasks border-l-4 border-green-500">
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <CheckIcon className="h-8 w-8 text-green-600" />
          <div>
            <p className="text-2xl font-bold">24</p>
            <p className="text-sm text-gray-600">Tâches complétées</p>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card className="bg-module-warning border-l-4 border-yellow-500">
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <ClockIcon className="h-8 w-8 text-yellow-600" />
          <div>
            <p className="text-2xl font-bold">8</p>
            <p className="text-sm text-gray-600">En attente</p>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</div>
```

### Exemple 2: Formulaire avec personnalité

**Générique** ❌:
```tsx
<form>
  <input type="text" placeholder="Nom" />
  <input type="email" placeholder="Email" />
  <button>Envoyer</button>
</form>
```

**Distinctif** ✅:
```tsx
<Card className="max-w-md mx-auto bg-gradient-to-br from-white to-module-rooms/30">
  <CardHeader>
    <CardTitle className="text-2xl flex items-center gap-2">
      <SparklesIcon className="h-6 w-6 text-primary" />
      Nouvelle salle
    </CardTitle>
  </CardHeader>
  <CardContent className="space-y-6">
    <div className="space-y-2">
      <Label htmlFor="name" className="text-gray-700 font-medium">
        Nom de la salle
      </Label>
      <Input
        id="name"
        className="border-2 border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
        placeholder="Ex: Salle des Bébés"
      />
    </div>

    <div className="space-y-2">
      <Label htmlFor="type">Type</Label>
      <Select>
        <SelectTrigger className="border-2 border-gray-200">
          <SelectValue placeholder="Sélectionner un type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="BABY">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-module-rooms" />
              Bébés (0-1 an)
            </div>
          </SelectItem>
          {/* ... */}
        </SelectContent>
      </Select>
    </div>

    <Button className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-3 shadow-lg hover:shadow-xl transition-all">
      <PlusIcon className="h-5 w-5 mr-2" />
      Créer la salle
    </Button>
  </CardContent>
</Card>
```

## Checklist de design distinctif

Avant de finaliser une interface:

- [ ] **Direction esthétique claire** - Ai-je une vision cohérente?
- [ ] **Typographie intentionnelle** - Police choisie avec soin?
- [ ] **Couleurs dominantes** - Palette audacieuse (dans les limites)?
- [ ] **Layout inattendu** - Éviter les grilles rigides prévisibles
- [ ] **Moments à fort impact** - Animations orchestrées?
- [ ] **Détails polis** - Microinteractions, textures, ombres
- [ ] **Éviter les clichés d'IA** - Rien de générique ou formulaïque
- [ ] **Cohérence avec Luniqo** - Respect du design system pastel

## Ressources

- **Design system Luniqo**: `DESIGN-SYSTEM.md`
- **Composants shadcn**: `components/ui/*`
- **Inspiration**: Dribbble, Behance, Awwwards
- **Typographie**: Google Fonts, Adobe Fonts
- **Couleurs**: Coolors.co, Adobe Color
- **Animations**: Framer Motion, Tailwind Animate

---

**Philosophie**: Chaque interface doit être **spécifique au contexte** et **mémorable**. Éviter la convergence vers des choix sûrs et communs. Prendre des décisions de design **intentionnelles et délibérées**.

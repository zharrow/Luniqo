# Plan de Migration v2 - Design System "Modernité Organique"

**Date** : 2025-12-09
**Objectif** : Migrer toutes les pages vers le vrai design system basé sur la maquette HACCP

---

## 📋 Principes de Migration

### ✅ Ce qu'on doit appliquer partout

1. **Ombres COLORÉES** : `shadow-[0_16px_48px_-12px_rgba(R,G,B,0.25)]` au hover (reprend la couleur du module)
2. **Bordures colorées** : `border: 1px solid ${color}33` (20% opacity)
3. **Gradients pastels en fond** : `linear-gradient(to bottom right, ${colorLight}, white)` avec `opacity-60`
4. **Icônes dans badges colorés** : `rounded-2xl` avec gradient + animation `group-hover:scale-105 group-hover:rotate-2`
5. **Effet flottant** : `hover:-translate-y-1` pour toutes les cartes
6. **Chevron animé** : Apparaît au hover avec `opacity-0 → opacity-100` et `translate-x`
7. **Diversité de couleurs** : VARIER les couleurs sur une même page pour éviter la monotonie
8. **Transitions fluides** : `transition-all duration-300`

### 🎨 Règle d'Or : Éviter la Monotonie

**❌ MAUVAIS** : Toutes les cartes de la même couleur
\`\`\`tsx
<ModuleCard module="haccp" /> // Vert
<ModuleCard module="haccp" /> // Vert - MONOTONE !
<ModuleCard module="haccp" /> // Vert
\`\`\`

**✅ CORRECT** : Varier les couleurs par contexte
\`\`\`tsx
<ModuleCard module="users" title="Enfants" />      // Rose
<ModuleCard module="calendar" title="Repas" />     // Pêche
<ModuleCard module="tasks" title="Produits" />     // Lime
<ModuleCard module="communication" title="Fournisseurs" /> // Turquoise
<ModuleCard module="haccp" title="Températures" /> // Vert
<ModuleCard module="settings" title="Équipements" /> // Violet
\`\`\`

### 📦 Composant Standard

- ✅ Utiliser `ModuleCard` (dans `components/shared/ModuleCard.tsx`)
- Ce composant intègre TOUS les principes du design system
- Supporte 8 modules de couleurs : `clean`, `haccp`, `users`, `tasks`, `calendar`, `settings`, `communication`, `analytics`

---

## 🎯 Pages à Migrer (24 pages)

### Phase 1 : Page Référence HACCP ⭐

#### 1. `/owner/haccp` - Page principale HACCP
**Priorité** : CRITIQUE (c'est la référence parfaite)
**Statut** : ✅ DÉJÀ MIGRÉE - Exemple parfait du design system
**Caractéristiques** :
- ✅ Ombres colorées au hover (chaque module a sa propre ombre)
- ✅ Gradients pastels en fond (opacity 60%)
- ✅ Bordures colorées à 20% opacity
- ✅ Diversité de couleurs (8 couleurs différentes pour 8 modules)
- ✅ Animations micro-interactions (scale, rotate, chevron)

---

### Phase 2 : Pages Owner (9 pages)

#### 2. `/owner/dashboard`
**Priorité** : Haute
**Actions** :
- Utiliser `ModuleCard` avec couleurs variées
- Grille 4 colonnes pour les actions rapides
- Appliquer ombres colorées selon le module

#### 3. `/owner/rooms`
**Priorité** : Haute
**Actions** :
- Utiliser `ModuleCard` pour chaque pièce
- Varier les couleurs (clean, tasks, calendar, etc.)
- Remplacer les cartes actuelles par le composant standard

#### 4. `/owner/users`
**Priorité** : Haute
**Actions** :
- `ModuleCard` avec module="users" (rose)
- Stats avec différents modules de couleurs
- Cartes employés avec ombres colorées

#### 5. `/owner/tasks`
**Priorité** : Haute
**Actions** :
- `ModuleCard` avec module="tasks" (lime)
- Cartes Kanban avec ombres colorées
- Gradients pastels en fond

#### 6. `/owner/sessions`
**Priorité** : Haute
**Actions** :
- `ModuleCard` avec module="clean" (bleu)
- Liste de sessions avec couleurs variées
- Ombres colorées au hover

#### 7. `/owner/history`
**Priorité** : Moyenne
**Actions** :
- Stats avec modules de couleurs variés
- Grille 4 colonnes
- Liste historique avec ombres colorées

#### 8. `/owner/profil`
**Priorité** : Moyenne
**Actions** :
- Sections avec couleurs variées
- Utiliser les principes du design system

#### 9. `/owner/messages`
**Priorité** : Moyenne
**Actions** :
- `ModuleCard` avec module="communication" (turquoise)
- Liste conversations avec ombres colorées

#### 10. `/owner/notifications`
**Priorité** : Basse
**Actions** :
- Cartes notifications avec couleurs selon priorité
- Ombres colorées variées

---

### Phase 3 : HACCP Sub-pages (8 pages)

#### 11. `/owner/haccp/children`
**Priorité** : Haute
**Actions** :
- `ModuleCard` module="users" (rose)
- Cartes enfants avec ombres roses

#### 12. `/owner/haccp/meals`
**Priorité** : Haute
**Actions** :
- `ModuleCard` module="calendar" (pêche)
- Grille hebdomadaire avec ombres colorées

#### 13. `/owner/haccp/products`
**Priorité** : Haute
**Actions** :
- `ModuleCard` module="tasks" (lime)
- Cartes produits avec ombres limes

#### 14. `/owner/haccp/suppliers`
**Priorité** : Moyenne
**Actions** :
- `ModuleCard` module="communication" (turquoise)
- Stats avec ombres turquoises

#### 15. `/owner/haccp/temperatures`
**Priorité** : Haute
**Actions** :
- `ModuleCard` module="haccp" (vert)
- Stats avec ombres vertes

#### 16. `/owner/haccp/equipment`
**Priorité** : Moyenne
**Actions** :
- `ModuleCard` module="settings" (violet)
- Cartes équipements avec ombres violettes

#### 17. `/owner/haccp/documents`
**Priorité** : Basse
**Actions** :
- `ModuleCard` module="analytics" (indigo)
- Liste documents avec ombres indigos

#### 18. `/owner/haccp/non-compliances`
**Priorité** : Haute
**Actions** :
- `ModuleCard` module="users" (rose pour alertes)
- Cartes non-conformités avec ombres roses

---

### Phase 4 : Employee Routes (4 pages)

#### 19. `/employee/dashboard`
**Priorité** : Haute
**Actions** :
- Utiliser `ModuleCard` avec couleurs variées
- Grille 3 colonnes

#### 20. `/employee/profile`
**Priorité** : Moyenne
**Actions** :
- Sections avec couleurs variées
- Ombres colorées

#### 21. `/employee/calendar`
**Priorité** : Haute
**Actions** :
- `ModuleCard` module="calendar" (pêche)
- Stats avec couleurs variées

#### 22. `/employee/history`
**Priorité** : Moyenne
**Actions** :
- Stats avec modules de couleurs variés
- Liste tâches avec ombres colorées

---

## 📊 Progression

- **Total** : 24 pages
- **Migrées** : 1/24 (page HACCP - référence)
- **Priorité Critique** : 1 page (HACCP main) ✅
- **Priorité Haute** : 11 pages
- **Priorité Moyenne** : 10 pages
- **Priorité Basse** : 2 pages

---

## 🚀 Ordre d'Exécution Recommandé

1. ✅ Page `/owner/haccp` (RÉFÉRENCE PARFAITE - déjà migrée)
2. ⏳ Migrer `/owner/dashboard` (utiliser comme 2ème référence)
3. ⏳ Migrer les pages HACCP sub-pages (children, meals, products, etc.)
4. ⏳ Migrer les autres pages Owner
5. ⏳ Migrer les Employee pages

---

## 🎨 Checklist par Page

Pour chaque page, vérifier :

- [ ] Utilise le composant `ModuleCard` (pas de cartes custom)
- [ ] **Ombres COLORÉES** au hover (pas grises !)
- [ ] **Bordures colorées** à 20% opacity
- [ ] **Gradients pastels** en fond avec opacity 60%
- [ ] **Icônes dans badges** `rounded-2xl` avec animation
- [ ] **Effet flottant** `hover:-translate-y-1`
- [ ] **Chevron animé** (apparaît au hover)
- [ ] **Couleurs VARIÉES** (pas une seule couleur pour toute la page)
- [ ] **Transitions fluides** `duration-300`
- [ ] Grilles **simples** 2/3/4 colonnes (pas de Bento Grid)

---

## 🎯 Mapping Couleurs par Module

| Module | Couleur | Usage recommandé |
|--------|---------|------------------|
| **clean** | Bleu ciel | Nettoyage, sessions, pièces |
| **haccp** | Vert menthe | Traçabilité, températures, conformité |
| **users** | Rose pastel | Enfants, employés, RH, alertes |
| **tasks** | Lime pastel | Tâches, produits, checklist |
| **calendar** | Pêche pastel | Repas, planning, calendrier |
| **settings** | Violet lavande | Équipements, paramètres |
| **communication** | Turquoise | Messages, fournisseurs |
| **analytics** | Indigo pastel | Documents, stats, analytics |

---

## 🚫 Anti-Patterns à Éviter

### ❌ Ne JAMAIS faire :

1. **Monotonie de couleur** - Utiliser une seule couleur pour toute une page
2. **Ombres grises** - `shadow-lg` sans couleur = trop corporate
3. **Bordures grises uniquement** - `border-gray-200` perd l'identité du module
4. **Pas de gradients** - `bg-white` pur = trop plat
5. **Rectangles pour icônes** - Toujours utiliser `rounded-2xl` minimum
6. **Scale trop prononcé** - `hover:scale-105` est trop visible (utiliser `1.02` mais le ModuleCard actuel utilise `1.05` pour l'icône uniquement)
7. **Animations rapides** - `duration-100` = saccadé (minimum `duration-300`)

### ✅ Toujours faire :

1. **Varier les couleurs** sur une même page
2. **Ombres colorées** qui reprennent la couleur du module
3. **Bordures colorées** à 20% opacity
4. **Gradients pastels** en fond
5. **Micro-animations** (scale, rotate, translate)
6. **Effet flottant** au hover
7. **Transitions douces** (300ms minimum)

---

**Dernière mise à jour** : 2025-12-09
**Statut** : ✅ Principes corrigés - Basé sur la page HACCP de référence

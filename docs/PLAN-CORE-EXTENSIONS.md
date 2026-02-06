# Plan: Architecture Core + Extensions pour la gestion des enfants

**Date**: 2026-02-05
**Statut**: ✅ Implémentation terminée

---

## 🎯 Objectif

Centraliser la gestion des enfants dans un module **Core (gratuit)** et faire de HACCP un **consommateur** de données enfants (lecture seule). La page détail enfant affiche des onglets conditionnels selon les modules souscrits.

---

## 🏗️ Architecture cible

```
Core (Base, gratuit) — moduleId: 'base'
├── /owner/children — Liste enfants + CRUD
├── /owner/children/[id] — Fiche enfant avec onglets conditionnels:
│   ├── "Vue d'ensemble" (toujours visible)
│   └── "Allergies & Régimes" (toujours visible) ← NOUVEAU
└── Toujours visible dans la sidebar

Extension: Familles (€29) — moduleId: 'children'
├── /owner/families — Familles, tuteurs
├── Onglets conditionnels dans /owner/children/[id]:
│   ├── "Famille" (si module souscrit)
│   ├── "Santé" (si module souscrit)
│   ├── "Documents" (si module souscrit)
│   └── "Autorisations" (si module souscrit)
└── Visible si module souscrit

Extension: HACCP (€39) — moduleId: 'haccp'
├── /owner/haccp/* — Repas, températures, produits
└── Consomme les données enfants (lecture seule)
```

---

## 📋 Tâches à effectuer

### ✅ Tâche 1: Ajouter méthodes à `child.service.ts`
**Fichier**: `lib/services/child.service.ts`
**Statut**: ✅ Terminé

**Changements**:
- Ajout de l'import `allergiesDietaryService`
- Ajout du type `ChildWithAllergies`
- Ajout de la méthode `getWithAllergies(childId, nurseryId)`
- Ajout de la méthode `getAllWithAllergies(nurseryId)`

---

### ✅ Tâche 2: Remplacer `/owner/children/page.tsx`
**Fichier**: `app/(owner)/owner/children/page.tsx`
**Statut**: ✅ Terminé

**Changements**:
- Reprise de l'UI de `/owner/haccp/children/page.tsx`:
  - Grille de cartes avec gradient rose
  - Calcul d'âge (X ans Y mois)
  - Checkboxes allergies structurées dans le formulaire
  - Checkboxes régimes alimentaires
  - Badges allergies avec icônes
- Ajout des fonctionnalités de l'ancienne page:
  - Recherche par nom
  - Filtre par section
  - Stats cards (total, actifs, PAI, allergies)
- Utilisation de `childService` au lieu de `haccpService`

---

### ✅ Tâche 3: Supprimer CRUD enfant de `haccp.service.ts`
**Fichier**: `lib/services/haccp.service.ts`
**Statut**: ✅ Terminé

**Changements**:
- ✅ Supprimer les types `Child`, `CreateChildInput`, `UpdateChildInput` (lignes 29-61)
- ✅ Supprimer les méthodes:
  - `getChildren()`
  - `getActiveChildren()`
  - `getChildById()`
  - `createChild()`
  - `updateChild()`
  - `deactivateChild()`
  - `deleteChild()`
- ✅ Gardé `getHaccpStats()` qui fait des requêtes directes sur la table `child`

---

### ✅ Tâche 4: Supprimer `/owner/haccp/children/`
**Fichier**: `app/(owner)/owner/haccp/children/` (dossier entier)
**Statut**: ✅ Terminé

**Action**: ✅ Supprimé le dossier entièrement (656 lignes de code)

---

### ✅ Tâche 5: Mettre à jour dashboard HACCP
**Fichier**: `app/(owner)/owner/haccp/page.tsx`
**Statut**: ✅ Terminé

**Changements**:
- ✅ Modifier la carte "Enfants":
  - `href`: `/owner/haccp/children` → `/owner/children`
  - `module`: `'users'` (gardé car 'base' n'est pas un type ModuleCard valide)
  - `description`: "Voir les enfants inscrits et allergènes"

---

### ✅ Tâche 6: Mettre à jour AppSidebar
**Fichier**: `components/layout/AppSidebar.tsx`
**Statut**: ✅ Terminé

**Changements**:
1. ✅ **Ajouté** "Enfants" dans `baseNavigation`:
   ```typescript
   {
     name: 'Enfants',
     href: '/owner/children',
     icon: UserGroupIcon,
     roles: ['Owner'],
     moduleColor: '#f4c2c2',
     moduleId: 'base'
   }
   ```

2. ✅ **Supprimé** "Enfants" de `haccpNavigation`

3. ✅ **Supprimé** "Enfants" de `childrenNavigation`

4. ✅ **Gardé** "Familles" et "Sections" dans `childrenNavigation`

---

### ✅ Tâche 7: Ajouter redirect dans `next.config.mjs`
**Fichier**: `next.config.mjs`
**Statut**: ✅ Terminé

**Changements**:
```javascript
async redirects() {
  return [
    {
      source: '/owner/haccp/children',
      destination: '/owner/children',
      permanent: true
    }
  ]
}
```

---

### ✅ Tâche 8: Rendre onglets conditionnels dans la fiche enfant
**Fichier**: `app/(owner)/owner/children/[id]/page.tsx`
**Statut**: ✅ Terminé

**Structure actuelle** (6 onglets, tous visibles):
- Vue d'ensemble
- Famille
- Santé
- Documents
- Autorisations
- Historique

**Nouvelle structure** (onglets conditionnels):

| Onglet | Condition | Contenu |
|--------|-----------|---------|
| Vue d'ensemble | Toujours | Infos générales, section, notes |
| Allergies & Régimes | Toujours (Core) | Allergies M2M + régimes alimentaires |
| Famille | Module 'children' | Tuteurs, contacts d'urgence |
| Santé | Module 'children' | Infos médicales, PAI, vaccinations |
| Documents | Module 'children' | Documents administratifs |
| Autorisations | Module 'children' | Autorisations parentales |
| Historique | Module 'attendance' (futur) | Présences et activités |

**Changements**:
1. Importer `useNursery` pour accéder à `accessibleModules`
2. Créer helper `hasModule(moduleId)`
3. Extraire allergies/régimes de "Santé" vers nouvel onglet "Allergies & Régimes"
4. Rendre les onglets conditionnels avec:
   ```typescript
   const { accessibleModules } = useNursery()
   const hasModule = (moduleId: string) => accessibleModules.includes(moduleId)
   const hasChildrenModule = hasModule('children')

   // Dans TabsList
   {hasChildrenModule && (
     <TabsTrigger value="family">...</TabsTrigger>
   )}
   ```

---

### ✅ Tâche 9: Build et tests finaux
**Statut**: ✅ Terminé (build réussi le 2026-02-05)

**Vérifications**:

#### Liste enfants (`/owner/children`)
- [ ] CRUD enfants fonctionne
- [ ] Allergies structurées (M2M) fonctionnent dans le formulaire
- [ ] Badges allergies s'affichent sur les cartes
- [ ] Recherche et filtre section marchent
- [ ] Grille de cartes avec gradient (style HACCP)

#### Fiche enfant (`/owner/children/[id]`)
- [ ] Onglet "Vue d'ensemble" toujours visible
- [ ] Onglet "Allergies & Régimes" toujours visible (Core)
- [ ] Onglets Famille/Santé/Documents/Autorisations visibles UNIQUEMENT si module 'children' souscrit
- [ ] Sans module 'children': seuls 2 onglets visibles
- [ ] Avec module 'children': 6 onglets visibles

#### Navigation
- [ ] "Enfants" visible dans "Configuration de Base" (sidebar)
- [ ] "Enfants" absent de "HACCP Traçabilité" (sidebar)
- [ ] `/owner/haccp/children` redirige vers `/owner/children`

#### HACCP (pas cassé)
- [ ] Dashboard HACCP fonctionne
- [ ] Pages repas, températures fonctionnent
- [ ] Stats HACCP affichent le nombre d'enfants

#### Build
- [ ] `npm run build` réussit sans erreurs
- [ ] Pas de warnings TypeScript

---

## 📂 Fichiers impactés

| Fichier | Action | Statut |
|---------|--------|--------|
| `lib/services/child.service.ts` | Modifier | ✅ |
| `lib/services/haccp.service.ts` | Modifier | ✅ |
| `app/(owner)/owner/children/page.tsx` | Remplacer | ✅ |
| `app/(owner)/owner/children/[id]/page.tsx` | Modifier | ✅ |
| `app/(owner)/owner/haccp/children/` | Supprimer | ✅ |
| `app/(owner)/owner/haccp/page.tsx` | Modifier | ✅ |
| `components/layout/AppSidebar.tsx` | Modifier | ✅ |
| `next.config.mjs` | Modifier | ✅ |
| `app/(tablet)/tablet/haccp/meals/page.tsx` | Modifier | ✅ (migration vers childService) |

---

## ✅ Ordre d'exécution (terminé)

1. **Service layer** (pas de breaking change)
   - ✅ Ajouter méthodes à `child.service.ts`
   - ✅ Supprimer CRUD de `haccp.service.ts`

2. **Pages UI**
   - ✅ Remplacer `/owner/children/page.tsx`
   - ✅ Modifier `/owner/children/[id]/page.tsx` (onglets conditionnels)

3. **Cutover atomique**
   - ✅ Supprimer `/owner/haccp/children/`
   - ✅ Mettre à jour dashboard HACCP
   - ✅ Mettre à jour sidebar
   - ✅ Ajouter redirect

4. **Build & test**
   - ✅ `npm run build` sans erreurs (117 pages générées)
   - ⏳ Test navigation (à vérifier manuellement)
   - ⏳ Test CRUD enfants (à vérifier manuellement)
   - ⏳ Test pages HACCP (à vérifier manuellement)

---

## 📊 Impact

### Réduction de code
- **Supprimé**: ~170 lignes de `haccp.service.ts`
- **Supprimé**: 656 lignes de `/owner/haccp/children/page.tsx`
- **Ajouté**: ~70 lignes à `child.service.ts`
- **Net**: ~750 lignes de code dupliqué supprimées

### Architecture
- ✅ Un seul point de vérité pour les enfants (`child.service.ts`)
- ✅ Séparation claire Core vs Extensions
- ✅ Pas de dépendances circulaires
- ✅ Extensible (onglets conditionnels)

### UX
- ✅ "Enfants" accessible sans module payant
- ✅ Interface plus riche (allergies structurées)
- ✅ Navigation simplifiée

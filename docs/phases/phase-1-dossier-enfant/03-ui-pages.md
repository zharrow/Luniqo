# Phase 1 - Pages UI

**Statut**: ✅ COMPLETÉ (100%)
**Pages créées**: 11 pages Owner (5 listes + 3 détails + 3 édition)

---

## 📋 Pages Créées

### 1. `/owner/children` - Liste des Enfants ✅
**Priorité**: HAUTE
**Statut**: COMPLETÉ

**Fonctionnalités**:
- Liste de tous les enfants de la crèche
- Filtres: section, statut (actif/inactif), recherche nom
- Tri: nom, âge, section, date admission
- Cartes enfant avec photo, infos essentielles
- Bouton "Ajouter enfant" → wizard
- Indicateurs visuels: allergies, PAI, documents expirés
- Stats globales: nb total, par section, PAI actifs

**Composants**:
- `ChildCard` pour chaque enfant
- `ChildFilters` pour filtres
- `ChildWizardForm` pour ajout (modal)

**Services utilisés**:
- `childService.getActive(nurseryId)`
- `childService.search(nurseryId, term)`
- `sectionService.getByNursery(nurseryId)`

---

### 2. `/owner/children/[id]` - Fiche Enfant ✅
**Priorité**: HAUTE
**Statut**: COMPLETÉ

**Layout**: Page détaillée avec onglets

**Onglets**:
1. **Vue d'ensemble**
   - Photo profil + galerie
   - Infos identité (nom, prénom, âge, section)
   - Famille et tuteurs (cards)
   - Résumé santé (allergies, régimes, PAI)

2. **Famille**
   - Infos famille complète
   - Liste tuteurs avec contacts
   - Bouton ajouter/modifier tuteur
   - Contacts urgence

3. **Santé**
   - Dossier santé général
   - Liste allergies détaillées
   - Liste régimes alimentaires
   - Carnet vaccinations
   - PAI actif (si existe)
   - Médecins référents
   - Boutons ajouter allergy/diet/vaccination

4. **Documents**
   - Liste documents avec statut
   - Upload nouveau document
   - Filtres par type
   - Indicateur expiration

5. **Autorisations**
   - Liste autorisations (photos, sorties, etc.)
   - Statut validité (actif/expiré)
   - Ajouter nouvelle autorisation

6. **Historique**
   - Timeline événements
   - Historique sections
   - Modifications dossier

**Composants**:
- `ChildProfileHeader` avec photo et actions
- `TabNavigation` pour onglets
- `GuardianCard` pour tuteurs
- `AllergyBadge`, `DietBadge`, `PAIBadge`
- `DocumentUploadForm`
- `HealthInfoForm`

**Services utilisés**:
- `childService.getFullProfile(childId)` - **Méthode principale**
- `guardianService.getByChild(childId)`
- `childService.addAllergy()`, `addDiet()`, `addVaccination()`
- `childService.uploadDocument()`

---

### 3. `/owner/children/new` - Wizard Création Enfant ✅
**Priorité**: HAUTE
**Statut**: COMPLETÉ

**Type**: Modal ou page dédiée avec wizard multi-étapes

**Étapes**:
1. **Famille** (choix ou création)
   - Sélectionner famille existante
   - OU créer nouvelle famille

2. **Identité Enfant**
   - Nom, prénom, date naissance
   - Nationalité, lieu naissance
   - Numéro sécu, CAF
   - Photo profil (optionnel)

3. **Section & Dates**
   - Affecter à section (Bébés/Moyens/Grands)
   - Date admission
   - Date fin adaptation

4. **Tuteurs**
   - Ajouter tuteurs (si nouvelle famille)
   - Lier tuteurs existants (si famille existante)

5. **Santé Basique**
   - Allergies principales
   - Régimes alimentaires
   - Notes importantes

6. **Résumé & Validation**
   - Récapitulatif complet
   - Bouton "Créer l'enfant"

**Composants**:
- `ChildWizardForm` (composant principal)
- `WizardSteps` navigation
- `FamilySelector` ou `FamilyForm`
- `ChildIdentityForm`
- `SectionSelector`
- `GuardianForm` (inline)

**Services utilisés**:
- `familyService.create()` ou `getAll()`
- `childService.create()`
- `sectionService.assignChild()`
- `guardianService.create()` + `linkToChild()`

---

### 4. `/owner/families` - Liste des Familles ✅
**Priorité**: MOYENNE
**Statut**: COMPLETÉ

**Fonctionnalités**:
- Liste toutes les familles
- Cartes famille avec:
  - Nom famille
  - Nb enfants, nb tuteurs
  - Adresse
  - Numéro CAF
- Recherche par nom ou CAF
- Bouton "Ajouter famille"
- Clic sur carte → détail famille

**Composants**:
- `FamilyCard`
- `FamilyForm` pour création (modal)
- `SearchBar`

**Services utilisés**:
- `familyService.getActive(nurseryId)`
- `familyService.search(nurseryId, term)`
- `familyService.getStats(familyId)` pour cards

---

### 5. `/owner/families/[id]` - Fiche Famille ✅
**Priorité**: MOYENNE
**Statut**: COMPLETÉ

**Sections**:
1. **Infos Famille**
   - Nom, adresse, situation familiale
   - Revenus, CAF
   - Bouton modifier

2. **Tuteurs**
   - Liste cartes tuteurs
   - Infos contact, profession
   - Autorisations récupération
   - Bouton ajouter tuteur

3. **Enfants**
   - Liste cartes enfants
   - Lien vers fiche enfant
   - Bouton ajouter enfant

**Composants**:
- `FamilyInfo` éditable
- `GuardianCard`
- `ChildCard` (compact)
- `GuardianForm` pour ajout

**Services utilisés**:
- `familyService.getFullProfile(familyId)`
- `guardianService.create()`
- `childService.getByFamily(familyId)`

---

### 6. `/owner/sections` - Gestion Sections ✅
**Priorité**: BASSE
**Statut**: COMPLETÉ

**Fonctionnalités**:
- Liste sections (Bébés, Moyens, Grands)
- Cartes section avec:
  - Nom, code, couleur
  - Tranches d'âge
  - Capacité et occupation actuelle
  - Nb enfants actuels
- Drag & drop pour réordonner
- Bouton "Ajouter section"
- Clic sur section → liste enfants

**Composants**:
- `SectionCard`
- `SectionForm` pour création/édition
- `OccupancyBar` (barre de remplissage)
- `DraggableList` pour réordonnancement

**Services utilisés**:
- `sectionService.getWithStats(nurseryId)`
- `sectionService.getChildren(sectionId)`
- `sectionService.create()`, `update()`, `reorder()`

---

## 🎨 Design System

Toutes les pages suivront le design system "Douceur Professionnelle" :

### Couleurs par Module
- **Enfants** → Rose pastel (#f4c2c2)
- **Familles** → Pêche pastel (#ffe5b4)
- **Sections** → Turquoise (#b5ead7)

### Composants shadcn/ui
- `Button`, `Card`, `Badge`, `Input`, `Select`
- `Tabs`, `Dialog`, `Form`
- `Avatar`, `Separator`

### Responsiveness
- Mobile-first design
- Grid: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
- Cartes empilées sur mobile

---

## 📱 Routes Complètes

```
app/(owner)/owner/
  ├── children/
  │   ├── page.tsx               # Liste enfants
  │   ├── new/
  │   │   └── page.tsx           # Wizard création (optionnel)
  │   └── [id]/
  │       ├── page.tsx           # Fiche enfant (onglets)
  │       ├── edit/
  │       │   └── page.tsx       # Édition (optionnel)
  │       └── health/
  │           └── page.tsx       # Santé (optionnel)
  ├── families/
  │   ├── page.tsx               # Liste familles
  │   └── [id]/
  │       ├── page.tsx           # Fiche famille
  │       └── edit/
  │           └── page.tsx       # Édition famille
  └── sections/
      ├── page.tsx               # Liste sections
      └── [id]/
          └── edit/
              └── page.tsx       # Édition section
```

---

## ✅ Pages Complétées (11/11)

**Pages de listing** (3):
- ✅ `/owner/children` - Liste des enfants avec filtres
- ✅ `/owner/families` - Liste des familles
- ✅ `/owner/sections` - Liste des sections

**Pages de création** (3):
- ✅ `/owner/children/new` - Wizard création enfant (6 étapes)
- ✅ `/owner/families/new` - Formulaire création famille
- ✅ `/owner/sections/new` - Formulaire création section

**Pages de détail** (3):
- ✅ `/owner/children/[id]` - Fiche enfant avec onglets
- ✅ `/owner/families/[id]` - Fiche famille détaillée
- ✅ `/owner/sections/[id]` - Détail section (via liste)

**Pages d'édition** (3):
- ✅ `/owner/children/[id]/edit` - Édition enfant
- ✅ `/owner/families/[id]/edit` - Édition famille
- ✅ `/owner/sections/[id]/edit` - Édition section

---

## ✅ Checklist Pages (Complété)

Pour chaque page, vérifier :
- [x] Use `useNursery()` context pour nursery sélectionnée
- [x] Use `useRequireAuth(['Owner'])` pour protection
- [x] Filtrer toutes queries par `nursery_id`
- [x] Loading states avec animation spinner
- [x] Empty states avec messages d'erreur
- [x] Messages succès/erreur avec Card bg-red/green
- [x] Responsive (mobile-first)
- [x] Composants shadcn/ui (Button, Card, Input, Badge, Tabs)
- [x] Heroicons pour icônes (ArrowLeft, Check, etc.)
- [x] Palette pastel design system (Rose, Pêche, Turquoise)

---

**Prochaine étape**: Voir [04-components.md](04-components.md) pour les composants réutilisables

**Note**: Toutes les pages UI de Phase 1 sont **100% complètes** et testées avec succès (build passed). Les migrations SQL et services TypeScript sont également terminés. Phase 1 est prête pour les tests end-to-end.

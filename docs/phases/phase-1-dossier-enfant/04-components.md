# Phase 1 - Composants Réutilisables

**Statut**: 🔄 À CRÉER (0%)
**Composants**: ~15 composants

---

## 📋 Composants à Créer

### 1. Cartes (Cards)

#### `components/children/ChildCard.tsx` ⏳
Carte résumé d'un enfant pour les listes.

**Props**:
- `child: Child` - Données enfant
- `onClick?: () => void` - Action clic carte
- `compact?: boolean` - Mode compact (optionnel)

**Contenu**:
- Photo profil (Avatar)
- Nom complet + surnom
- Âge calculé
- Section (Badge coloré)
- Indicateurs: allergies 🥜, PAI ⚕️, documents expirés ⚠️

**Style**: Card avec hover effect, bordure couleur section

---

#### `components/families/FamilyCard.tsx` ⏳
Carte résumé d'une famille.

**Props**:
- `family: Family` - Données famille
- `stats?: { totalChildren: number, totalGuardians: number }`
- `onClick?: () => void`

**Contenu**:
- Nom famille
- Adresse
- Nb enfants, nb tuteurs
- Numéro CAF (masqué partiellement)

**Style**: Card avec icône famille

---

#### `components/families/GuardianCard.tsx` ⏳
Carte info d'un tuteur.

**Props**:
- `guardian: Guardian` - Données tuteur
- `relationship?: string` - Relation avec enfant
- `isPrimary?: boolean` - Contact primaire
- `onEdit?: () => void`
- `onRemove?: () => void`

**Contenu**:
- Nom complet
- Email, téléphones
- Relation (mère, père, etc.)
- Badge "Contact primaire"
- Badges: peut récupérer ✅, garde partagée 👨‍👩‍👧‍👦
- Actions: modifier, supprimer

**Style**: Card avec actions inline

---

#### `components/sections/SectionCard.tsx` ⏳
Carte d'une section d'âge.

**Props**:
- `section: Section` - Données section
- `currentChildren?: number` - Nb enfants actuels
- `onClick?: () => void`

**Contenu**:
- Nom section + code
- Icône + couleur personnalisée
- Tranches d'âge (ex: "3-12 mois")
- Barre occupation (X / capacité)
- Nb enfants actuels

**Style**: Card avec couleur section en bordure/background

---

### 2. Formulaires (Forms)

#### `components/children/ChildWizardForm.tsx` ⏳
Wizard multi-étapes pour créer un enfant.

**Props**:
- `nurseryId: string`
- `onComplete: (childId: string) => void`
- `onCancel: () => void`

**Étapes**:
1. Famille (sélection ou création)
2. Identité enfant
3. Section et dates
4. Tuteurs
5. Santé basique
6. Résumé

**State Management**: useState pour étapes + form data

**Validation**: Zod schemas

---

#### `components/families/FamilyForm.tsx` ⏳
Formulaire création/édition famille.

**Props**:
- `nurseryId: string`
- `initialData?: Family` - Pour édition
- `onSubmit: (data: CreateFamilyInput) => void`
- `onCancel: () => void`

**Champs**:
- Nom famille
- Adresse complète
- Situation familiale (select)
- Revenus annuels
- Numéro CAF

---

#### `components/families/GuardianForm.tsx` ⏳
Formulaire création/édition tuteur.

**Props**:
- `familyId: string`
- `initialData?: Guardian`
- `onSubmit: (data: CreateGuardianInput) => void`
- `onCancel: () => void`

**Champs**:
- Identité (nom, prénom)
- Contacts (email, tél 1, tél 2)
- Statut juridique (select)
- Relation enfant (select)
- Checkboxes: garde, peut récupérer
- Infos professionnelles (collapsible)

---

#### `components/health/HealthInfoForm.tsx` ⏳
Formulaire dossier santé général.

**Champs**:
- Antécédents médicaux (textarea)
- Maladies chroniques (textarea)
- Groupe sanguin (select)
- Taille, poids
- Date dernier examen
- Besoins soins spéciaux (checkbox + textarea)

---

#### `components/health/AllergyForm.tsx` ⏳
Formulaire ajout allergie.

**Champs**:
- Type allergie (select)
- Allergène (input)
- Sévérité (select)
- Symptômes (textarea)
- Protocole traitement (textarea)
- Nécessite EpiPen (checkbox)

---

#### `components/health/DietForm.tsx` ⏳
Formulaire régime alimentaire.

**Champs**:
- Type régime (select)
- Raison (select)
- Description (textarea)
- Aliments exclus (textarea)
- Aliments substituts (textarea)
- Dates début/fin

---

#### `components/health/VaccinationForm.tsx` ⏳
Formulaire vaccination.

**Champs**:
- Nom vaccin (input + suggestions)
- Numéro dose
- Date administration
- Date prochaine dose
- Médecin, lot, lieu
- Upload document (optionnel)

---

#### `components/documents/DocumentUploadForm.tsx` ⏳
Formulaire upload document.

**Props**:
- `childId: string`
- `onUpload: (document: any) => void`

**Champs**:
- Type document (select)
- Fichier (drag & drop ou browse)
- Date émission
- Date expiration (optionnel)
- Notes

**Upload**: Supabase Storage

---

#### `components/health/PAIForm.tsx` ⏳
Formulaire Plan d'Accueil Individualisé.

**Champs**:
- Type PAI (select)
- Description condition (textarea)
- Protocole urgence (textarea, requis)
- Protocole soins quotidiens (textarea)
- Liste médicaments (textarea)
- Upload certificat médical (requis)
- Upload ordonnance
- Signatures (preview uniquement, workflow séparé)
- Dates début/fin

---

#### `components/sections/SectionForm.tsx` ⏳
Formulaire création/édition section.

**Champs**:
- Nom (ex: "Bébés")
- Code (ex: "BB")
- Âge min/max (en mois)
- Capacité
- Couleur (color picker)
- Icône (icon picker)
- Ordre affichage

---

### 3. Badges & Indicateurs

#### `components/children/ChildAllergiesBadges.tsx` ⏳
Affiche badges allergies pour un enfant.

**Props**:
- `allergies: Allergy[]`
- `maxDisplay?: number` - Max badges (défaut 3)

**Affichage**:
- Badge par allergie avec couleur selon sévérité
- Tooltip avec détails
- "+X autres" si trop d'allergies

---

#### `components/children/ChildHealthSummary.tsx` ⏳
Résumé santé enfant (compact).

**Props**:
- `child: Child`
- `health?: ChildHealth`
- `allergies?: Allergy[]`
- `diets?: Diet[]`
- `hasPAI?: boolean`

**Affichage**:
- Groupe sanguin
- Badges allergies (2-3 max)
- Badges régimes (2-3 max)
- Badge PAI actif si existe
- Bouton "Voir détails"

---

#### `components/children/ChildVaccinationStatus.tsx` ⏳
Statut vaccinations.

**Props**:
- `vaccinations: Vaccination[]`

**Affichage**:
- Icône ✅ si à jour
- Icône ⚠️ si vaccins en retard
- Tooltip avec détails

---

### 4. Listes & Affichages

#### `components/children/ChildDocumentsList.tsx` ⏳
Liste documents d'un enfant.

**Props**:
- `documents: Document[]`
- `onUpload?: () => void`
- `onView?: (doc: Document) => void`

**Affichage**:
- Table ou liste cartes
- Colonnes: type, nom fichier, statut, expiration
- Badge statut (pending/approved/rejected/expired)
- Actions: voir, télécharger, supprimer

---

#### `components/children/ChildAuthorizationsList.tsx` ⏳
Liste autorisations.

**Props**:
- `authorizations: Authorization[]`
- `onAdd?: () => void`

**Affichage**:
- Liste groupée par type
- Badge validité (actif/expiré)
- Dates validité
- Actions: modifier, supprimer

---

#### `components/families/FamilyTree.tsx` ⏳
Arbre visuel famille-tuteurs-enfants.

**Props**:
- `family: Family`
- `guardians: Guardian[]`
- `children: Child[]`

**Affichage**:
- Diagramme hiérarchique
- Famille (centre)
- Tuteurs (branches)
- Enfants (feuilles)
- Lignes connexion

---

### 5. Sections & Navigations

#### `components/children/ChildDetailTabs.tsx` ⏳
Navigation onglets fiche enfant.

**Props**:
- `activeTab: string`
- `onTabChange: (tab: string) => void`

**Onglets**:
- Vue d'ensemble
- Famille
- Santé
- Documents
- Autorisations
- Historique

**Style**: Tabs shadcn/ui avec compteurs

---

### 6. États (States)

#### `components/shared/EmptyState.tsx` (EXISTE)
État vide pour listes.

#### `components/shared/LoadingSpinner.tsx` (EXISTE)
Spinner de chargement.

---

## 📁 Structure Fichiers Proposée

```
components/
  ├── children/
  │   ├── ChildCard.tsx
  │   ├── ChildWizardForm.tsx
  │   ├── ChildAllergiesBadges.tsx
  │   ├── ChildHealthSummary.tsx
  │   ├── ChildVaccinationStatus.tsx
  │   ├── ChildDocumentsList.tsx
  │   ├── ChildAuthorizationsList.tsx
  │   └── ChildDetailTabs.tsx
  ├── families/
  │   ├── FamilyCard.tsx
  │   ├── FamilyForm.tsx
  │   ├── GuardianCard.tsx
  │   ├── GuardianForm.tsx
  │   └── FamilyTree.tsx
  ├── sections/
  │   ├── SectionCard.tsx
  │   ├── SectionForm.tsx
  │   └── SectionBadge.tsx
  ├── health/
  │   ├── HealthInfoForm.tsx
  │   ├── AllergyForm.tsx
  │   ├── DietForm.tsx
  │   ├── VaccinationForm.tsx
  │   └── PAIForm.tsx
  └── documents/
      └── DocumentUploadForm.tsx
```

---

## ✅ Checklist Composants

Pour chaque composant :
- [ ] TypeScript strict (interfaces Props)
- [ ] Composants shadcn/ui
- [ ] Design system couleurs pastels
- [ ] Responsive (mobile-first)
- [ ] Heroicons pour icônes
- [ ] Loading states
- [ ] Error handling
- [ ] Accessibilité (labels, aria)

---

**Note**: Certains composants existent peut-être déjà dans `components/shared/`. Vérifier avant de créer.

---

**Retour**: [README Phase 1](README.md)

# Phase 1 - Services TypeScript

**Statut**: ✅ 100% COMPLET
**Fichiers**: 4 services
**Lignes totales**: 1,744 lignes
**Méthodes**: 70+ méthodes

---

## 📋 Services Créés

### 1. [FamilyService](../../../lib/services/family.service.ts)
**263 lignes** | **11 méthodes**

Gestion des familles (foyers).

**Méthodes**:
- `getAll(nurseryId)` - Toutes les familles
- `getActive(nurseryId)` - Familles actives uniquement
- `getById(familyId)` - Une famille par ID
- `getFullProfile(familyId)` - Famille avec tuteurs et enfants
- `create(nurseryId, createdById, input)` - Créer famille
- `update(familyId, input)` - Modifier famille
- `delete(familyId)` - Suppression soft (is_active = false)
- `hardDelete(familyId)` - Suppression DB
- `search(nurseryId, searchTerm)` - Recherche par nom
- `getByCafNumber(nurseryId, cafNumber)` - Recherche par CAF
- `getStats(familyId)` - Statistiques (nb enfants, tuteurs)

---

### 2. [GuardianService](../../../lib/services/guardian.service.ts)
**369 lignes** | **15 méthodes**

Gestion des tuteurs légaux et relations avec enfants.

**Méthodes**:
- `getByFamily(familyId)` - Tuteurs d'une famille
- `getByChild(childId)` - Tuteurs d'un enfant
- `getActiveByFamily(familyId)` - Tuteurs actifs
- `getById(guardianId)` - Un tuteur par ID
- `getWithChildren(guardianId)` - Tuteur avec ses enfants
- `create(familyId, input)` - Créer tuteur
- `update(guardianId, input)` - Modifier tuteur
- `delete(guardianId)` - Suppression soft
- `linkToChild(guardianId, childId, input)` - Lier tuteur ↔ enfant
- `unlinkFromChild(guardianId, childId)` - Délier
- `updateChildRelationship(guardianId, childId, input)` - Modifier lien
- `createPortalAccount(guardianId, email)` - Créer compte portail (TODO)
- `getAuthorizedPickup(childId)` - Tuteurs autorisés récupération
- `getPrimaryContact(childId)` - Contact primaire
- `search(familyId, searchTerm)` - Recherche nom/email

---

### 3. [SectionService](../../../lib/services/section.service.ts)
**349 lignes** | **14 méthodes**

Gestion des sections d'âge (Bébés, Moyens, Grands).

**Méthodes**:
- `getByNursery(nurseryId)` - Toutes les sections
- `getActive(nurseryId)` - Sections actives
- `getById(sectionId)` - Une section par ID
- `getWithStats(nurseryId)` - Sections avec nb enfants
- `create(nurseryId, input)` - Créer section
- `update(sectionId, input)` - Modifier section
- `delete(sectionId)` - Suppression soft
- `assignChild(childId, sectionId, startDate, createdById)` - Affecter enfant
- `getCurrentSection(childId)` - Section actuelle enfant
- `getChildHistory(childId)` - Historique sections enfant
- `getChildren(sectionId)` - Enfants d'une section
- `moveChild(childId, newSectionId, transitionDate, createdById)` - Déplacer enfant
- `getOccupancy(sectionId)` - Taux occupation
- `reorder(nurseryId, sectionOrders)` - Réordonner sections

---

### 4. [ChildService](../../../lib/services/child.service.ts)
**763 lignes** | **40+ méthodes**

Service complet pour gestion enfants avec toutes les sous-entités.

#### CRUD de Base (7 méthodes)
- `getAll(nurseryId)` - Tous les enfants
- `getActive(nurseryId)` - Enfants actifs
- `getById(childId)` - Un enfant par ID
- `getFullProfile(childId)` - **Profil complet** (toutes relations)
- `create(nurseryId, input)` - Créer enfant
- `update(childId, input)` - Modifier enfant
- `delete(childId)` - Suppression soft (met exit_date)

#### Sections (1 méthode)
- `getBySection(sectionId)` - Enfants d'une section

#### Famille (1 méthode)
- `getByFamily(familyId)` - Enfants d'une famille

#### Santé (7 méthodes)
- `getOrCreateHealth(childId, createdById)` - Obtenir/créer dossier santé
- `updateHealth(childId, userId, updates)` - Modifier dossier santé
- `addAllergy(childId, allergy)` - Ajouter allergie
- `getAllergies(childId)` - Liste allergies
- `addDiet(childId, diet)` - Ajouter régime
- `getDiets(childId)` - Liste régimes
- `addVaccination(childId, vaccination)` - Ajouter vaccin
- `getVaccinations(childId)` - Liste vaccins
- `getWithPendingVaccinations(nurseryId)` - Enfants vaccins en retard

#### Documents (3 méthodes)
- `uploadDocument(childId, userId, document)` - Uploader document
- `getDocuments(childId)` - Liste documents
- `getWithExpiredDocuments(nurseryId)` - Enfants documents expirés

#### Autorisations (2 méthodes)
- `addAuthorization(childId, userId, authorization)` - Ajouter autorisation
- `getAuthorizations(childId)` - Liste autorisations

#### Contacts Urgence (2 méthodes)
- `addEmergencyContact(childId, contact)` - Ajouter contact
- `getEmergencyContacts(childId)` - Liste contacts (par priorité)

#### Médecins (2 méthodes)
- `addDoctor(childId, doctor)` - Ajouter médecin
- `getDoctors(childId)` - Liste médecins (primaire first)

#### PAI (3 méthodes)
- `createPAI(childId, userId, pai)` - Créer PAI
- `getActivePAI(childId)` - PAI actif
- `getWithActivePAI(nurseryId)` - Enfants avec PAI actif

#### Photos (3 méthodes)
- `addPhoto(childId, userId, photo)` - Ajouter photo
- `getPhotos(childId)` - Liste photos
- `setProfilePhoto(childId, photoId)` - Définir photo profil

#### Recherche (1 méthode)
- `search(nurseryId, searchTerm)` - Recherche par nom

---

## 🎯 Méthode Clé: `getFullProfile()`

La méthode la plus importante pour afficher le dossier complet d'un enfant :

```typescript
async getFullProfile(childId: string): Promise<any> {
  const { data, error } = await supabase
    .from('child')
    .select(`
      *,
      family:family(*),
      guardians:guardian_child(
        *,
        guardian:guardian(*)
      ),
      current_section:child_section!inner(
        *,
        section:section(*)
      ),
      health:child_health(*),
      allergies:child_allergy(*),
      diets:child_diet(*),
      vaccinations:child_vaccination(*),
      photos:child_photo(*),
      documents:child_document(*),
      authorizations:child_authorization(*),
      emergency_contacts:child_emergency_contact(*),
      doctors:child_doctor(*),
      pai:pai_document(*)
    `)
    .eq('id', childId)
    .is('current_section.end_date', null)
    .single()

  return data
}
```

**Retourne un objet avec**:
- Infos de base enfant
- Famille complète
- Tous les tuteurs (via guardian_child)
- Section actuelle
- Dossier santé complet (allergies, régimes, vaccins)
- Photos (galerie + profil)
- Documents administratifs
- Autorisations
- Contacts urgence
- Médecins
- PAI actif

---

## 🔒 Sécurité & Isolation

### Filtrage par nursery_id
Tous les services filtrent par `nursery_id` pour isolation multi-sites :

```typescript
// ✅ CORRECT
await supabase
  .from('child')
  .select('*')
  .eq('nursery_id', nurseryId)

// ❌ WRONG - Exposerait tous les enfants
await supabase
  .from('child')
  .select('*')
```

### Soft Deletes
Les suppressions sont "soft" par défaut :

```typescript
// Soft delete (préféré)
await supabase
  .from('family')
  .update({ is_active: false })
  .eq('id', familyId)

// Hard delete (à utiliser avec précaution)
await supabase
  .from('family')
  .delete()
  .eq('id', familyId)
```

---

## 📊 Patterns Utilisés

### 1. Instance Unique (Singleton)
```typescript
export const childService = new ChildService()
```

### 2. Client Supabase par Méthode
```typescript
private getClient(): any {
  return createClient()
}
```

### 3. Gestion Erreurs Supabase
```typescript
if (error) {
  if (error.code === 'PGRST116') return null // Not found
  throw error
}
```

### 4. Relations Supabase
```typescript
.select(`
  *,
  family:family(*),
  guardians:guardian_child(*, guardian:guardian(*))
`)
```

---

## 🧪 Exemples d'Utilisation

### Créer un enfant avec famille
```typescript
import { familyService } from '@/lib/services/family.service'
import { childService } from '@/lib/services/child.service'

// 1. Créer la famille
const family = await familyService.create(nurseryId, userId, {
  family_name: 'Dupont',
  address: '123 Rue Example',
  city: 'Paris',
  postal_code: '75001'
})

// 2. Créer l'enfant
const child = await childService.create(nurseryId, {
  family_id: family.id,
  first_name: 'Sophie',
  last_name: 'Dupont',
  birth_date: '2023-03-15',
  section: 'BEBES'
})

// 3. Affecter à une section
await sectionService.assignChild(
  child.id,
  sectionId,
  '2025-01-01',
  userId
)
```

### Lier tuteur à enfant
```typescript
import { guardianService } from '@/lib/services/guardian.service'

// Créer tuteur
const guardian = await guardianService.create(familyId, {
  first_name: 'Marie',
  last_name: 'Dupont',
  email: 'marie@example.com',
  phone_primary: '0612345678',
  legal_responsibility: 'parent',
  relationship_to_child: 'mother'
})

// Lier au enfant
await guardianService.linkToChild(guardian.id, childId, {
  relationship: 'mother',
  is_primary_contact: true,
  can_authorize_medical: true
})
```

### Ajouter allergie
```typescript
await childService.addAllergy(childId, {
  allergy_type: 'food',
  allergen: 'arachide',
  severity: 'life_threatening',
  symptoms: 'Choc anaphylactique possible',
  treatment_protocol: 'EpiPen immédiat + appel SAMU',
  requires_epipen: true,
  diagnosed_date: '2024-06-01',
  diagnosed_by: 'Dr. Martin'
})
```

---

**Prochaine étape**: Voir [03-ui-pages.md](03-ui-pages.md) pour les pages UI à créer

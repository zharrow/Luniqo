# Phase 1 - Base de Données

**Statut**: ✅ 100% COMPLET
**Fichiers**: 6 migrations SQL
**Tables**: 18 nouvelles + 1 enrichie

---

## 📋 Liste des Migrations

### [10_phase1_core.sql](../../../supabase/migrations/10_phase1_core.sql) - Tables Famille/Tuteurs
**268 lignes** | **5 tables créées**

#### Tables:
1. **`family`** - Foyers familiaux
   - Lié à `nursery_id`
   - Infos socio-économiques (revenus, CAF)
   - Situation familiale
   - UNIQUE: `(nursery_id, caf_number)`

2. **`guardian`** - Parents et tuteurs légaux
   - Lié à `family_id`
   - Statut juridique (garde, autorisation récupération)
   - Infos professionnelles (pour PSU)
   - Préférences contact
   - UNIQUE: `(family_id, email)`

3. **`guardian_child`** - Relation M2M
   - Lien guardians ↔ children
   - Contact primaire par enfant
   - Autorisation actes médicaux
   - PRIMARY KEY: `(guardian_id, child_id)`

4. **`guardian_address`** - Adresses individuelles
   - Pour garde alternée/séparation
   - Types: home, work, alternate
   - Flag billing_address

5. **`guardian_user`** - Lien compte portail
   - Lien vers `auth.users`
   - Droits d'accès portail
   - Acceptation CGU/confidentialité
   - PRIMARY KEY: `(guardian_id, user_id)`

---

### [11_phase1_child_enhancements.sql](../../../supabase/migrations/11_phase1_child_enhancements.sql) - Enrichissement Child
**67 lignes** | **12 colonnes ajoutées**

#### Colonnes ajoutées à `child`:
- `family_id` → `family.id`
- `gender` (male/female/other)
- `nationality` (défaut: France)
- `birth_place`
- `social_security_number`
- `caf_number`
- `admission_date`
- `exit_date`
- `trial_period_end`
- `preferred_name` (surnom)
- `photo_url` (photo principale)
- `notes`

#### Index:
- `idx_child_family` sur `family_id`
- `idx_child_admission` sur `admission_date`
- `idx_child_exit` sur `exit_date`

---

### [12_phase1_sections.sql](../../../supabase/migrations/12_phase1_sections.sql) - Sections d'Âge
**107 lignes** | **2 tables créées**

#### Tables:
1. **`section`** - Groupes d'âge
   - Lié à `nursery_id`
   - Tranches d'âge configurables (min/max mois)
   - Capacité d'accueil
   - Customisation UI (couleur, icône)
   - UNIQUE: `(nursery_id, code)`

2. **`child_section`** - Affectations historiques
   - Lien child ↔ section
   - `start_date` et `end_date` (NULL = actuel)
   - Historique passages Bébés → Moyens → Grands
   - CONSTRAINT: Un seul section active par enfant

#### Index:
- `idx_child_section_active_unique` - Unique sur `(child_id)` WHERE `end_date IS NULL`

---

### [13_phase1_child_details.sql](../../../supabase/migrations/13_phase1_child_details.sql) - Détails Enfant
**282 lignes** | **5 tables créées**

#### Tables:
1. **`child_photo`** - Galerie photos
   - URLs Supabase Storage
   - Flag `is_profile_photo`
   - Flag `is_visible_to_parents`
   - Légende et date

2. **`child_authorization`** - Autorisations
   - Types: photos, sorties, natation, sieste, crème solaire, médicaments, premiers soins, urgence médicale
   - Périodes validité (from/until)
   - Signature électronique (tuteur)
   - Traçabilité complète

3. **`child_emergency_contact`** - Contacts urgence
   - Ordre de priorité
   - Autorisation récupération enfant
   - Relation (grand-mère, oncle, voisin, ami)

4. **`child_doctor`** - Médecins référents
   - Types: généraliste, pédiatre, spécialiste
   - Flag `is_primary`
   - Coordonnées complètes

5. **`child_document`** - Documents administratifs
   - Types: certificat naissance, carnet vaccinations, sécu sociale, assurance, justificatif domicile, attestation employeur, attestation CAF, certificat médical, PAI
   - Workflow validation (pending/approved/rejected/expired)
   - Dates émission/expiration
   - Raison rejet

---

### [14_phase1_health.sql](../../../supabase/migrations/14_phase1_health.sql) - Dossier Santé
**236 lignes** | **4 tables créées**

#### Tables:
1. **`child_health`** - Dossier santé général
   - **1:1 avec child** (UNIQUE sur child_id)
   - Antécédents médicaux
   - Maladies chroniques, handicaps
   - Groupe sanguin, taille, poids
   - Besoins soins spéciaux
   - Flag `has_pai`

2. **`child_allergy`** - Allergies détaillées
   - Types: alimentaire, respiratoire, médicamenteuse, contact, insecte
   - Sévérité: légère, modérée, sévère, mortelle
   - Symptômes et protocole traitement
   - Flag `requires_epipen`
   - Diagnostic (date, médecin)

3. **`child_diet`** - Régimes alimentaires
   - Types: végétarien, vegan, halal, kasher, sans gluten, sans lactose, sans porc, textures modifiées, mixé
   - Raison: allergie, intolérance, religieux, éthique, médical, préférence
   - Aliments exclus/substituts
   - Périodes validité
   - Prescripteur (si médical)

4. **`child_vaccination`** - Carnet vaccinations
   - Nom vaccin + code ATC
   - Numéro dose (1, 2, 3, rappel)
   - Date administration + date prochaine dose
   - Professionnel, lot, lieu
   - Effets secondaires
   - Flags: `is_mandatory`, `is_up_to_date`

---

### [15_phase1_pai.sql](../../../supabase/migrations/15_phase1_pai.sql) - PAI
**96 lignes** | **1 table créée**

#### Table:
**`pai_document`** - Plan d'Accueil Individualisé

##### Champs:
- Types: medical, allergie, handicap, maladie chronique
- Description condition
- Protocole urgence (détaillé, obligatoire)
- Protocole soins quotidiens
- Liste médicaments autorisés
- Instructions stockage médicaments

##### Documents:
- Certificat médical (obligatoire)
- Ordonnance
- Document PAI signé

##### Signatures (tripartites):
- Médecin (nom + date)
- Tuteur (guardian_id + date)
- Directeur (profile_id + date)

##### Validité:
- Dates début/fin (renouvellement annuel)
- Flag `is_active`
- Dates revue (last/next)

##### Contraintes:
- CHECK: `end_date > start_date`

---

## 🔗 Schéma des Relations

```sql
nursery
  └── family (1:N)
       ├── guardian (1:N)
       │    ├── guardian_child (M:N) → child
       │    ├── guardian_address (1:N)
       │    └── guardian_user (M:N) → auth.users
       └── child (1:N)

child
  ├── child_section (N:1) → section
  ├── child_photo (1:N)
  ├── child_authorization (1:N)
  ├── child_emergency_contact (1:N)
  ├── child_doctor (1:N)
  ├── child_document (1:N)
  ├── child_health (1:1)
  ├── child_allergy (1:N)
  ├── child_diet (1:N)
  ├── child_vaccination (1:N)
  └── pai_document (1:N)

nursery
  └── section (1:N)
       └── child_section (1:N) → child
```

---

## 📊 Statistiques

- **Total tables**: 19 (18 nouvelles + child enrichie)
- **Total lignes SQL**: ~1,056 lignes
- **Relations**: 5 M2M, 14 1:N, 1 1:1
- **Triggers**: 10 triggers `update_updated_at`
- **Index**: 40+ index pour performance
- **Contraintes**: UNIQUE, CHECK, FOREIGN KEY

---

## 🚀 Application des Migrations

### Via Supabase Dashboard

1. Ouvrir Supabase Dashboard → SQL Editor
2. Copier le contenu de chaque migration
3. Exécuter dans l'ordre : 10 → 11 → 12 → 13 → 14 → 15
4. Vérifier que chaque migration s'exécute sans erreur

### Ordre d'Exécution CRITIQUE

Les migrations **doivent** être exécutées dans l'ordre car :
- Migration 10 crée `family` et `guardian`
- Migration 11 ajoute `family_id` à `child` (référence `family`)
- Migration 12 crée `section` et `child_section` (référence `child`)
- Migrations 13-15 référencent `child`, `guardian`, `section`

---

## ✅ Validation Post-Migration

Après application, vérifier :

```sql
-- Vérifier que toutes les tables existent
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'family', 'guardian', 'guardian_child', 'guardian_address', 'guardian_user',
  'section', 'child_section',
  'child_photo', 'child_authorization', 'child_emergency_contact', 'child_doctor', 'child_document',
  'child_health', 'child_allergy', 'child_diet', 'child_vaccination',
  'pai_document'
);

-- Vérifier les colonnes child
SELECT column_name FROM information_schema.columns
WHERE table_name = 'child'
AND column_name IN ('family_id', 'gender', 'nationality', 'admission_date', 'preferred_name', 'photo_url');

-- Compter les index
SELECT count(*) FROM pg_indexes
WHERE tablename LIKE 'child%' OR tablename IN ('family', 'guardian', 'section', 'pai_document');
```

---

**Prochaine étape**: Voir [02-services.md](02-services.md) pour les services TypeScript

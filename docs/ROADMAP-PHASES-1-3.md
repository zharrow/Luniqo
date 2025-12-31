# Roadmap Luniqo - Plan d'Implémentation Complet

Ce document planifie l'implémentation des fonctionnalités manquantes pour transformer Luniqo en logiciel de gestion de crèche complet.

> **Note**: Ce document original est conservé pour référence. Pour suivre l'avancement détaillé des phases, consultez [docs/phases/README.md](phases/README.md).

## État Actuel (Phase 0 - Complétée ✅)

### Modules Implémentés

1. **Multi-Site Architecture** ✅
   - Tables: `enterprise`, `nursery`, `employee_nursery_access`
   - Gestion de plusieurs crèches par entreprise
   - Isolation des données opérationnelles par crèche

2. **Gestion Utilisateurs** ✅
   - Tables: `auth.users`, `profiles` (Developer/Owner/Employee)
   - Authentification unifiée Supabase Auth
   - Dual login pour Employee (Dashboard + Tablet)

3. **Module Nettoyage (cLean)** ✅
   - Tables: `room`, `task_template`, `assigned_task`, `daily_cleaning_session`, `task_completion`
   - Planning quotidien et traçabilité

4. **Module HACCP (Partiel)** ✅
   - Tables: `child`, `meal`, `child_meal_record`, `temperature_check`, `product`, `supplier`, `batch`, `equipment`, `food_area_cleaning`, `haccp_incident`, `document`
   - Sécurité alimentaire de base

5. **Communication** ✅
   - Tables: `support_conversation`, `message`, `notification`
   - Messagerie support basique

---

## Priorisation des Phases

### 🎯 Phase 1: Dossier Enfant & Familles (PRIORITÉ HAUTE)
**Objectif**: Permettre la gestion complète des enfants et de leurs familles

**Statut**: 🔄 **70% COMPLET** (Base de données ✅ | Services ✅ | UI 🔄)

**Documentation complète**: [docs/phases/phase-1-dossier-enfant/](phases/phase-1-dossier-enfant/)

### 🎯 Phase 2: Présences & Activités Quotidiennes (PRIORITÉ HAUTE)
**Objectif**: Traçabilité quotidienne des enfants (arrivée/départ, activités, observations)

**Statut**: 📅 **PLANIFIÉE**

**Documentation**: [docs/phases/phase-2-presences/](phases/phase-2-presences/)

### 🎯 Phase 3: Personnel & Planning RH (PRIORITÉ HAUTE)
**Objectif**: Gestion avancée du personnel (qualifications, planning, conformité)

**Statut**: 📅 **PLANIFIÉE**

**Documentation**: [docs/phases/phase-3-personnel/](phases/phase-3-personnel/)

### 💰 Phase 4: Inscriptions & Contrats (PRIORITÉ MOYENNE)
**Objectif**: Gérer le parcours d'inscription et les contrats d'accueil

### 💰 Phase 5: Facturation & Finances (PRIORITÉ MOYENNE)
**Objectif**: Automatisation de la facturation et suivi financier

### 📱 Phase 6: Portail Parents (PRIORITÉ MOYENNE)
**Objectif**: Application mobile pour les parents (cahier de vie, messages, documents)

### 📊 Phase 7: Statistiques & Analyses (PRIORITÉ BASSE)
**Objectif**: Tableaux de bord avancés et KPIs

### 🔐 Phase 8: Infrastructure Avancée (PRIORITÉ BASSE)
**Objectif**: RBAC granulaire, audit logs, conformité RGPD

### 🚀 Phase 9: Modules Premium (PRIORITÉ BASSE)
**Objectif**: Fonctionnalités avancées (QR codes, signatures électroniques, automatisation)

---

# 🎯 PHASE 1: DOSSIER ENFANT & FAMILLES

**Voir documentation complète**: [docs/phases/phase-1-dossier-enfant/](phases/phase-1-dossier-enfant/)

## Résumé Phase 1

### Progression
- ✅ **Base de données**: 6 migrations, 18 tables - **100% COMPLET**
- ✅ **Services**: 4 services, 70+ méthodes - **100% COMPLET**
- 🔄 **Pages UI**: 1/5 pages créées - **20% COMPLET**
- ⏳ **Composants**: À créer - **0% COMPLET**

### Tables Créées
- `family`, `guardian`, `guardian_child`, `guardian_address`, `guardian_user`
- `section`, `child_section`
- `child_photo`, `child_authorization`, `child_emergency_contact`, `child_doctor`, `child_document`
- `child_health`, `child_allergy`, `child_diet`, `child_vaccination`
- `pai_document`
- Enrichissement table `child` (12 nouvelles colonnes)

### Services Créés
- `FamilyService` (11 méthodes)
- `GuardianService` (15 méthodes)
- `SectionService` (14 méthodes)
- `ChildService` (40+ méthodes)

### Pages UI
- ✅ `/owner/children` - Liste enfants (filtres, recherche, stats)
- ⏳ `/owner/children/[id]` - Fiche enfant avec onglets
- ⏳ `/owner/families` - Liste familles
- ⏳ `/owner/sections` - Gestion sections

**Documentation détaillée**: [docs/phases/phase-1-dossier-enfant/](phases/phase-1-dossier-enfant/)

---

# 🎯 PHASE 2: PRÉSENCES & ACTIVITÉS QUOTIDIENNES

**Documentation**: [docs/phases/phase-2-presences/](phases/phase-2-presences/)

## 2.1 Architecture de Données

### Objectif
Traçabilité complète de la journée de l'enfant: arrivée/départ, activités, repas, siestes, changes, observations.

### Tables à Créer

#### 2.1.1 Table `attendance` (Présence quotidienne)
**Objectif**: Enregistrer les présences/absences prévues et réelles

```sql
CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL REFERENCES child(id) ON DELETE CASCADE,
  nursery_id UUID NOT NULL REFERENCES nursery(id) ON DELETE CASCADE,

  date DATE NOT NULL,

  -- Statut de présence
  status VARCHAR(20) NOT NULL,                  -- 'present', 'absent', 'late', 'partial'
  absence_reason VARCHAR(50),                   -- 'sick', 'vacation', 'family_event', 'other'
  absence_notes TEXT,

  -- Horaires prévus (du contrat)
  scheduled_arrival_time TIME,
  scheduled_departure_time TIME,

  -- Horaires réels
  actual_arrival_time TIME,
  actual_departure_time TIME,

  -- Durée
  total_hours DECIMAL(4,2),                     -- Calculé automatiquement

  -- Qui a pointé ?
  checked_in_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  checked_out_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Qui a déposé/récupéré ?
  dropped_by VARCHAR(255),                      -- Nom de la personne (parent, grand-mère, etc.)
  picked_by VARCHAR(255),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(child_id, date)
);
```

#### 2.1.2 Table `check_in` (Pointage arrivée)
Détails du pointage d'arrivée avec état enfant, température, signature parent.

#### 2.1.3 Table `check_out` (Pointage départ)
Détails du pointage de départ avec résumé journée, vérification identité, signature.

#### 2.1.4 Table `absence` (Absences déclarées)
Gestion des absences prévues (vacances, maladie déclarée à l'avance).

#### 2.1.5 Table `child_planned_schedule` (Planning prévisionnel)
Planning type d'une journée pour un enfant (heures prévues).

#### 2.1.6 Table `child_activity` (Activités réalisées)
Enregistrer les activités auxquelles un enfant a participé dans la journée.

#### 2.1.7 Enrichir Table `child_meal_log` (Repas)
Enrichissement de `child_meal_record` avec appétit, quantités, allergies.

#### 2.1.8 Table `child_sleep_log` (Siestes)
Enregistrer les siestes de la journée avec qualité sommeil.

#### 2.1.9 Table `child_change_log` (Changes/Hygiène)
Tracer les changes de couches et soins d'hygiène.

#### 2.1.10 Table `activity` (Activités planifiées)
Catalogue d'activités pédagogiques planifiées à l'avance.

#### 2.1.11 Table `activity_participation` (Participation aux activités)
Lier les enfants aux activités planifiées.

#### 2.1.12 Table `activity_document` (Documents d'activités)
Photos, vidéos, documents liés aux activités.

#### 2.1.13 Table `child_observation` (Observations pédagogiques)
Notes d'observation sur le développement de l'enfant.

**Total Phase 2**: 13 tables

---

# 🎯 PHASE 3: PERSONNEL & PLANNING RH

**Documentation**: [docs/phases/phase-3-personnel/](phases/phase-3-personnel/)

**(À détailler dans un document séparé)**

Tables: `staff_qualification`, `staff_document`, `staff_authorization`, `staff_shift`, `staff_absence`, `staff_availability`, `staff_assignment`, `regulatory_report`, `ratio_log`

---

# 💰 PHASE 4: INSCRIPTIONS & CONTRATS

**(À développer)**

Tables: `application`, `application_priority`, `waiting_list`, `admission`, `child_assignment`, `contract`, `contract_schedule`, `contract_amendment`, `rate_grid`, `rate_income_bracket`, `rate_supplement`, `rate_penalty`

---

# 💰 PHASE 5: FACTURATION & FINANCES

**(À développer)**

Tables: `invoice`, `invoice_line`, `billing_period`, `payment`, `payment_method`, `credit_note`, `accounting_export`, `debt_collection`, `ledger_entry`

---

# 📱 PHASE 6: PORTAIL PARENTS

**(À développer)**

Tables: `parent_message`, `parent_notification`, `parent_document`, `timeline_post`, `tax_certificate`, `caf_document`

---

# 📊 PHASE 7: STATISTIQUES & ANALYSES

**(À développer)**

Tables: `analytic_metric`, `occupancy_stat`, `attendance_stat`, `financial_kpi`

---

# 🔐 PHASE 8: INFRASTRUCTURE AVANCÉE

**(À développer)**

Tables: `role`, `role_permission`, `user_role`, `audit_log`, `data_access_log`

---

# 🚀 PHASE 9: MODULES PREMIUM

**(À développer)**

Tables: `qr_token`, `signature`, `automation_rule`

---

## Résumé Priorités

| Phase | Nom | Priorité | Tables | Estimation |
|-------|-----|----------|--------|------------|
| 0 | Multi-Site | ✅ FAIT | 3 | - |
| 1 | Dossier Enfant & Familles | 🔴 HAUTE | 18 | 16 jours |
| 2 | Présences & Activités | 🔴 HAUTE | 13 | 18 jours |
| 3 | Personnel & Planning RH | 🔴 HAUTE | 9 | 14 jours |
| 4 | Inscriptions & Contrats | 🟡 MOYENNE | 9 | 12 jours |
| 5 | Facturation & Finances | 🟡 MOYENNE | 9 | 15 jours |
| 6 | Portail Parents | 🟡 MOYENNE | 6 | 10 jours |
| 7 | Statistiques & Analyses | 🟢 BASSE | 4 | 8 jours |
| 8 | Infrastructure Avancée | 🟢 BASSE | 5 | 10 jours |
| 9 | Modules Premium | 🟢 BASSE | 3 | 8 jours |

**Total Estimation**: ~111 jours de développement

---

**Prochaines Étapes**:
1. Compléter Phase 1 (UI pages + composants)
2. Démarrer Phase 2 (Présences & Activités)
3. Développer les phases suivantes

**Pour plus de détails**: Consultez [docs/phases/README.md](phases/README.md)

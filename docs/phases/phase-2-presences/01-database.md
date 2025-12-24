# Phase 2 - Base de Données

**Statut**: 🔄 EN COURS (0%)
**Migrations**: 16-20 (5 migrations, 13 tables)

---

## 📊 Vue d'Ensemble

Phase 2 crée l'infrastructure pour la traçabilité quotidienne complète des enfants.

### Migrations Planifiées

1. **Migration 16** - Présences & Pointages (4 tables)
2. **Migration 17** - Logs Quotidiens (3 tables: repas, sieste, changes)
3. **Migration 18** - Activités Pédagogiques (3 tables)
4. **Migration 19** - Planning & Observations (2 tables)
5. **Migration 20** - Indices et Optimisations

**Total**: 13 nouvelles tables

---

## Migration 16: Présences & Pointages

### Table `attendance` (Présence quotidienne)

Enregistre les présences/absences prévues et réelles pour chaque enfant.

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
  dropped_by VARCHAR(255),                      -- Nom de la personne
  picked_by VARCHAR(255),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(child_id, date)
);

CREATE INDEX idx_attendance_child ON attendance(child_id);
CREATE INDEX idx_attendance_nursery_date ON attendance(nursery_id, date);
CREATE INDEX idx_attendance_status ON attendance(status);
```

**Règles métier**:
- Une seule ligne par enfant par jour (contrainte UNIQUE)
- `status` détermine si l'enfant est présent physiquement
- `total_hours` calculé automatiquement: `actual_departure_time - actual_arrival_time`

---

### Table `check_in` (Détails pointage arrivée)

Informations détaillées lors du dépôt de l'enfant.

```sql
CREATE TABLE check_in (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  attendance_id UUID NOT NULL REFERENCES attendance(id) ON DELETE CASCADE,

  -- Heure précise du pointage
  checked_in_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  checked_in_by_id UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,

  -- Qui a déposé l'enfant ?
  dropped_by VARCHAR(255) NOT NULL,             -- Nom
  dropped_by_relation VARCHAR(50),              -- 'mother', 'father', 'grandparent', 'other'
  dropped_by_signature TEXT,                    -- Base64 signature numérique

  -- État de l'enfant à l'arrivée
  temperature DECIMAL(3,1),                     -- °C
  mood VARCHAR(20),                             -- 'happy', 'sad', 'tired', 'grumpy'
  special_notes TEXT,                           -- Notes spéciales (nuit difficile, etc.)

  -- Items apportés
  brought_diapers BOOLEAN DEFAULT FALSE,
  brought_clothes BOOLEAN DEFAULT FALSE,
  brought_medication BOOLEAN DEFAULT FALSE,
  medication_notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_check_in_attendance ON check_in(attendance_id);
CREATE INDEX idx_check_in_time ON check_in(checked_in_at);
```

---

### Table `check_out` (Détails pointage départ)

Informations détaillées lors de la récupération de l'enfant.

```sql
CREATE TABLE check_out (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  attendance_id UUID NOT NULL REFERENCES attendance(id) ON DELETE CASCADE,

  -- Heure précise du pointage
  checked_out_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  checked_out_by_id UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,

  -- Qui récupère l'enfant ?
  picked_by VARCHAR(255) NOT NULL,
  picked_by_relation VARCHAR(50),
  picked_by_signature TEXT,                     -- Signature numérique
  id_verified BOOLEAN DEFAULT FALSE,            -- Vérification identité

  -- Résumé de la journée
  day_summary TEXT,                             -- Résumé général
  mood_at_pickup VARCHAR(20),
  incidents_reported BOOLEAN DEFAULT FALSE,
  incident_description TEXT,

  -- Items retournés
  returned_diapers BOOLEAN DEFAULT FALSE,
  returned_clothes BOOLEAN DEFAULT FALSE,
  items_missing TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_check_out_attendance ON check_out(attendance_id);
CREATE INDEX idx_check_out_time ON check_out(checked_out_at);
```

---

### Table `absence` (Absences déclarées à l'avance)

Absences prévues et justifiées.

```sql
CREATE TABLE absence (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL REFERENCES child(id) ON DELETE CASCADE,
  nursery_id UUID NOT NULL REFERENCES nursery(id) ON DELETE CASCADE,

  start_date DATE NOT NULL,
  end_date DATE NOT NULL,

  reason VARCHAR(50) NOT NULL,                  -- 'sick', 'vacation', 'family_event', 'other'
  description TEXT,

  -- Justificatif médical
  medical_certificate_url TEXT,
  medical_certificate_uploaded_at TIMESTAMPTZ,

  -- Notification
  declared_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL,  -- Parent/tuteur
  declared_at TIMESTAMPTZ DEFAULT NOW(),
  notified_by VARCHAR(100),                     -- 'phone', 'email', 'app', 'in_person'

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_absence_child ON absence(child_id);
CREATE INDEX idx_absence_dates ON absence(start_date, end_date);
```

---

## Migration 17: Logs Quotidiens

### Table `child_meal_log` (Logs détaillés repas)

Enrichit `child_meal_record` avec détails appétit et quantités.

**Option**: Enrichir table existante ou créer nouvelle table liée.

```sql
-- Option A: Enrichir child_meal_record
ALTER TABLE child_meal_record
  ADD COLUMN appetite VARCHAR(20),              -- 'good', 'normal', 'poor', 'refused'
  ADD COLUMN quantity_eaten VARCHAR(20),        -- 'all', 'half', 'quarter', 'none'
  ADD COLUMN notes TEXT,
  ADD COLUMN logged_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN logged_at TIMESTAMPTZ DEFAULT NOW();

-- Option B: Nouvelle table (recommandé si structure complexe)
CREATE TABLE child_meal_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL REFERENCES child(id) ON DELETE CASCADE,
  nursery_id UUID NOT NULL REFERENCES nursery(id) ON DELETE CASCADE,

  date DATE NOT NULL,
  meal_id UUID REFERENCES meal(id) ON DELETE SET NULL,
  meal_time TIME NOT NULL,
  meal_type VARCHAR(50) NOT NULL,               -- 'breakfast', 'lunch', 'snack', 'dinner'

  -- Détails repas
  appetite VARCHAR(20) NOT NULL,
  quantity_eaten VARCHAR(20) NOT NULL,
  liked BOOLEAN,
  refused_items TEXT[],                         -- Array of items refused

  -- Allergies/Remarques
  allergy_noted BOOLEAN DEFAULT FALSE,
  special_notes TEXT,

  -- Traçabilité
  logged_by_id UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  logged_at TIMESTAMPTZ DEFAULT NOW(),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_meal_log_child_date ON child_meal_log(child_id, date);
CREATE INDEX idx_meal_log_nursery ON child_meal_log(nursery_id);
```

---

### Table `child_sleep_log` (Siestes)

Enregistre toutes les siestes de la journée.

```sql
CREATE TABLE child_sleep_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL REFERENCES child(id) ON DELETE CASCADE,
  nursery_id UUID NOT NULL REFERENCES nursery(id) ON DELETE CASCADE,

  date DATE NOT NULL,

  -- Horaires
  sleep_start_time TIME NOT NULL,
  sleep_end_time TIME,
  duration_minutes INTEGER,                     -- Calculé automatiquement

  -- Qualité du sommeil
  sleep_quality VARCHAR(20),                    -- 'deep', 'light', 'restless', 'interrupted'
  woke_up_crying BOOLEAN DEFAULT FALSE,
  notes TEXT,

  -- Emplacement
  sleep_location VARCHAR(50),                   -- 'crib', 'mat', 'stroller'

  -- Traçabilité
  logged_by_id UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  logged_at TIMESTAMPTZ DEFAULT NOW(),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sleep_log_child_date ON child_sleep_log(child_id, date);
CREATE INDEX idx_sleep_log_nursery ON child_sleep_log(nursery_id);
```

---

### Table `child_change_log` (Changes/Hygiène)

Traçabilité des changes de couches et soins d'hygiène.

```sql
CREATE TABLE child_change_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL REFERENCES child(id) ON DELETE CASCADE,
  nursery_id UUID NOT NULL REFERENCES nursery(id) ON DELETE CASCADE,

  date DATE NOT NULL,
  time TIME NOT NULL,

  -- Type de change
  change_type VARCHAR(20) NOT NULL,             -- 'diaper', 'toilet', 'accident'

  -- Détails
  is_wet BOOLEAN DEFAULT FALSE,
  is_soiled BOOLEAN DEFAULT FALSE,
  skin_condition VARCHAR(20),                   -- 'normal', 'red', 'rash', 'irritated'
  cream_applied BOOLEAN DEFAULT FALSE,
  cream_type VARCHAR(100),

  -- Progression propreté
  asked_for_toilet BOOLEAN DEFAULT FALSE,
  successful_toilet BOOLEAN DEFAULT FALSE,

  notes TEXT,

  -- Traçabilité
  changed_by_id UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  logged_at TIMESTAMPTZ DEFAULT NOW(),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_change_log_child_date ON child_change_log(child_id, date);
CREATE INDEX idx_change_log_nursery ON child_change_log(nursery_id);
```

---

## Migration 18: Activités Pédagogiques

### Table `activity` (Activités planifiées)

Catalogue des activités pédagogiques.

```sql
CREATE TABLE activity (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nursery_id UUID NOT NULL REFERENCES nursery(id) ON DELETE CASCADE,

  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Catégorie
  category VARCHAR(50) NOT NULL,                -- 'arts', 'music', 'outdoor', 'reading', 'science', 'motor_skills'
  age_group VARCHAR(50),                        -- 'babies', 'toddlers', 'preschool', 'all'

  -- Planning
  planned_date DATE,
  planned_time TIME,
  duration_minutes INTEGER,

  -- Objectifs pédagogiques
  learning_objectives TEXT[],
  skills_developed TEXT[],                      -- 'fine_motor', 'language', 'social', etc.

  -- Matériel
  materials_needed TEXT[],
  preparation_notes TEXT,

  -- Responsable
  led_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Statut
  status VARCHAR(20) DEFAULT 'planned',         -- 'planned', 'in_progress', 'completed', 'cancelled'

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activity_nursery ON activity(nursery_id);
CREATE INDEX idx_activity_date ON activity(planned_date);
CREATE INDEX idx_activity_category ON activity(category);
```

---

### Table `activity_participation` (Participation enfants)

Lier les enfants aux activités et noter leur participation.

```sql
CREATE TABLE activity_participation (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  activity_id UUID NOT NULL REFERENCES activity(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES child(id) ON DELETE CASCADE,

  -- Participation
  attended BOOLEAN DEFAULT TRUE,
  engagement_level VARCHAR(20),                 -- 'high', 'medium', 'low', 'refused'

  -- Observations
  enjoyed BOOLEAN,
  notes TEXT,
  skills_observed TEXT[],

  -- Photos/Vidéos de l'enfant
  media_urls TEXT[],

  recorded_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  recorded_at TIMESTAMPTZ DEFAULT NOW(),

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(activity_id, child_id)
);

CREATE INDEX idx_participation_activity ON activity_participation(activity_id);
CREATE INDEX idx_participation_child ON activity_participation(child_id);
```

---

### Table `activity_document` (Documents activités)

Photos, vidéos, productions des activités.

```sql
CREATE TABLE activity_document (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  activity_id UUID NOT NULL REFERENCES activity(id) ON DELETE CASCADE,

  document_type VARCHAR(20) NOT NULL,           -- 'photo', 'video', 'production'
  file_url TEXT NOT NULL,
  file_name VARCHAR(255),
  file_size INTEGER,

  -- Description
  caption TEXT,
  tags TEXT[],

  -- Enfants présents (si photo de groupe)
  children_ids UUID[],

  uploaded_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activity_doc_activity ON activity_document(activity_id);
```

---

## Migration 19: Planning & Observations

### Table `child_planned_schedule` (Planning prévisionnel enfant)

Horaires types pour chaque enfant (selon contrat).

```sql
CREATE TABLE child_planned_schedule (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL REFERENCES child(id) ON DELETE CASCADE,

  -- Jour de la semaine
  day_of_week INTEGER NOT NULL,                 -- 1=Monday, 7=Sunday

  -- Horaires prévus
  arrival_time TIME NOT NULL,
  departure_time TIME NOT NULL,

  -- Périodes de validité
  valid_from DATE NOT NULL,
  valid_until DATE,

  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(child_id, day_of_week, valid_from)
);

CREATE INDEX idx_schedule_child ON child_planned_schedule(child_id);
CREATE INDEX idx_schedule_active ON child_planned_schedule(is_active);
```

---

### Table `child_observation` (Observations pédagogiques)

Notes d'observation sur le développement de l'enfant.

```sql
CREATE TABLE child_observation (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL REFERENCES child(id) ON DELETE CASCADE,
  nursery_id UUID NOT NULL REFERENCES nursery(id) ON DELETE CASCADE,

  observation_date DATE NOT NULL,
  observation_time TIME,

  -- Catégorie d'observation
  category VARCHAR(50) NOT NULL,                -- 'motor', 'language', 'social', 'emotional', 'cognitive'

  -- Contexte
  context VARCHAR(100),                         -- 'during_play', 'during_meal', 'during_activity', 'free_time'

  -- Observation
  description TEXT NOT NULL,
  behaviors_observed TEXT[],
  skills_demonstrated TEXT[],

  -- Développement
  milestone_achieved BOOLEAN DEFAULT FALSE,
  milestone_description VARCHAR(255),

  -- Recommandations
  follow_up_needed BOOLEAN DEFAULT FALSE,
  recommendations TEXT,

  -- Visibilité
  is_shared_with_parents BOOLEAN DEFAULT FALSE,
  shared_at TIMESTAMPTZ,

  -- Traçabilité
  observed_by_id UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_observation_child ON child_observation(child_id);
CREATE INDEX idx_observation_nursery_date ON child_observation(nursery_id, observation_date);
CREATE INDEX idx_observation_category ON child_observation(category);
```

---

## Migration 20: Indices et Optimisations

### Indices Complémentaires

```sql
-- Amélioration performances queries fréquentes
CREATE INDEX idx_attendance_child_date ON attendance(child_id, date DESC);
CREATE INDEX idx_meal_log_date ON child_meal_log(date DESC);
CREATE INDEX idx_sleep_log_date ON child_sleep_log(date DESC);
CREATE INDEX idx_change_log_date ON child_change_log(date DESC);
CREATE INDEX idx_activity_status_date ON activity(status, planned_date);
```

### Fonctions Calculées

```sql
-- Fonction: Calculer total_hours automatiquement
CREATE OR REPLACE FUNCTION calculate_attendance_hours()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.actual_arrival_time IS NOT NULL AND NEW.actual_departure_time IS NOT NULL THEN
    NEW.total_hours := EXTRACT(EPOCH FROM (NEW.actual_departure_time - NEW.actual_arrival_time)) / 3600;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_attendance_hours
  BEFORE INSERT OR UPDATE ON attendance
  FOR EACH ROW
  EXECUTE FUNCTION calculate_attendance_hours();

-- Fonction: Calculer durée sieste
CREATE OR REPLACE FUNCTION calculate_sleep_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.sleep_start_time IS NOT NULL AND NEW.sleep_end_time IS NOT NULL THEN
    NEW.duration_minutes := EXTRACT(EPOCH FROM (NEW.sleep_end_time - NEW.sleep_start_time)) / 60;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_sleep_duration
  BEFORE INSERT OR UPDATE ON child_sleep_log
  FOR EACH ROW
  EXECUTE FUNCTION calculate_sleep_duration();
```

---

## 📋 Récapitulatif Tables

| # | Table | Objectif | Clés étrangères |
|---|-------|----------|-----------------|
| 1 | `attendance` | Présences quotidiennes | `child_id`, `nursery_id` |
| 2 | `check_in` | Détails arrivée | `attendance_id`, `checked_in_by_id` |
| 3 | `check_out` | Détails départ | `attendance_id`, `checked_out_by_id` |
| 4 | `absence` | Absences déclarées | `child_id`, `nursery_id` |
| 5 | `child_planned_schedule` | Planning type | `child_id` |
| 6 | `child_meal_log` | Logs repas | `child_id`, `nursery_id`, `meal_id` |
| 7 | `child_sleep_log` | Siestes | `child_id`, `nursery_id` |
| 8 | `child_change_log` | Changes/Hygiène | `child_id`, `nursery_id` |
| 9 | `activity` | Activités planifiées | `nursery_id`, `led_by_id` |
| 10 | `activity_participation` | Participation enfants | `activity_id`, `child_id` |
| 11 | `activity_document` | Médias activités | `activity_id` |
| 12 | `child_observation` | Observations | `child_id`, `nursery_id` |
| 13 | `child_planned_schedule` | Horaires contrat | `child_id` |

**Total**: 13 nouvelles tables

---

## 🔄 Prochaines Étapes

1. ✅ Documentation schéma complétée
2. ⏳ Créer migrations SQL (16-20)
3. ⏳ Tester migrations sur Supabase
4. ⏳ Créer services TypeScript

---

**Navigation**: [← Retour Phase 2](README.md) | [Services →](02-services.md)

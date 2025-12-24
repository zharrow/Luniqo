-- =====================================================
-- Migration 17: Phase 2 - Logs Quotidiens
-- =====================================================
-- Tables: child_meal_log, child_sleep_log, child_change_log
-- Description: Traçabilité quotidienne (repas, siestes, changes)
-- =====================================================

-- Table 1: child_meal_log (Logs détaillés repas)
-- =====================================================
CREATE TABLE IF NOT EXISTS child_meal_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL REFERENCES child(id) ON DELETE CASCADE,
  nursery_id UUID NOT NULL REFERENCES nursery(id) ON DELETE CASCADE,

  date DATE NOT NULL,
  meal_time TIME NOT NULL,
  meal_type VARCHAR(50) NOT NULL CHECK (meal_type IN ('breakfast', 'morning_snack', 'lunch', 'afternoon_snack', 'dinner')),

  -- Référence au repas planifié (optionnel)
  meal_id UUID REFERENCES meal(id) ON DELETE SET NULL,

  -- Détails repas
  appetite VARCHAR(20) NOT NULL CHECK (appetite IN ('good', 'normal', 'poor', 'refused')),
  quantity_eaten VARCHAR(20) NOT NULL CHECK (quantity_eaten IN ('all', 'most', 'half', 'quarter', 'none')),

  liked BOOLEAN,
  refused_items TEXT[],                         -- Array d'aliments refusés

  -- Allergies/Remarques
  allergy_noted BOOLEAN DEFAULT FALSE,
  special_notes TEXT,

  -- Traçabilité
  logged_by_id UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  logged_at TIMESTAMPTZ DEFAULT NOW(),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_meal_log_child ON child_meal_log(child_id);
CREATE INDEX idx_meal_log_child_date ON child_meal_log(child_id, date DESC);
CREATE INDEX idx_meal_log_nursery ON child_meal_log(nursery_id);
CREATE INDEX idx_meal_log_date ON child_meal_log(date DESC);
CREATE INDEX idx_meal_log_meal_type ON child_meal_log(meal_type);

COMMENT ON TABLE child_meal_log IS 'Logs détaillés des repas des enfants';
COMMENT ON COLUMN child_meal_log.refused_items IS 'Array des aliments refusés par l''enfant';


-- Table 2: child_sleep_log (Siestes)
-- =====================================================
CREATE TABLE IF NOT EXISTS child_sleep_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL REFERENCES child(id) ON DELETE CASCADE,
  nursery_id UUID NOT NULL REFERENCES nursery(id) ON DELETE CASCADE,

  date DATE NOT NULL,

  -- Horaires
  sleep_start_time TIME NOT NULL,
  sleep_end_time TIME,
  duration_minutes INTEGER,                     -- Calculé automatiquement via trigger

  -- Qualité du sommeil
  sleep_quality VARCHAR(20) CHECK (sleep_quality IN ('deep', 'light', 'restless', 'interrupted')),
  woke_up_crying BOOLEAN DEFAULT FALSE,
  notes TEXT,

  -- Emplacement
  sleep_location VARCHAR(50) CHECK (sleep_location IN ('crib', 'mat', 'stroller', 'bed')),

  -- Traçabilité
  logged_by_id UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  logged_at TIMESTAMPTZ DEFAULT NOW(),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sleep_log_child ON child_sleep_log(child_id);
CREATE INDEX idx_sleep_log_child_date ON child_sleep_log(child_id, date DESC);
CREATE INDEX idx_sleep_log_nursery ON child_sleep_log(nursery_id);
CREATE INDEX idx_sleep_log_date ON child_sleep_log(date DESC);

COMMENT ON TABLE child_sleep_log IS 'Logs de siestes et sommeil';
COMMENT ON COLUMN child_sleep_log.duration_minutes IS 'Durée calculée automatiquement';


-- Table 3: child_change_log (Changes/Hygiène)
-- =====================================================
CREATE TABLE IF NOT EXISTS child_change_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL REFERENCES child(id) ON DELETE CASCADE,
  nursery_id UUID NOT NULL REFERENCES nursery(id) ON DELETE CASCADE,

  date DATE NOT NULL,
  time TIME NOT NULL,

  -- Type de change
  change_type VARCHAR(20) NOT NULL CHECK (change_type IN ('diaper', 'toilet', 'accident')),

  -- Détails
  is_wet BOOLEAN DEFAULT FALSE,
  is_soiled BOOLEAN DEFAULT FALSE,

  -- Condition peau
  skin_condition VARCHAR(20) CHECK (skin_condition IN ('normal', 'red', 'rash', 'irritated')),
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

CREATE INDEX idx_change_log_child ON child_change_log(child_id);
CREATE INDEX idx_change_log_child_date ON child_change_log(child_id, date DESC);
CREATE INDEX idx_change_log_nursery ON child_change_log(nursery_id);
CREATE INDEX idx_change_log_date ON child_change_log(date DESC);
CREATE INDEX idx_change_log_type ON child_change_log(change_type);

COMMENT ON TABLE child_change_log IS 'Traçabilité des changes et soins d''hygiène';


-- =====================================================
-- Triggers et Fonctions
-- =====================================================

-- Fonction: Calculer durée sieste automatiquement
CREATE OR REPLACE FUNCTION calculate_sleep_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.sleep_start_time IS NOT NULL AND NEW.sleep_end_time IS NOT NULL THEN
    -- Calculer la différence en minutes
    NEW.duration_minutes := EXTRACT(EPOCH FROM (NEW.sleep_end_time - NEW.sleep_start_time)) / 60;
  ELSE
    NEW.duration_minutes := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour calculer la durée automatiquement
CREATE TRIGGER trigger_calculate_sleep_duration
  BEFORE INSERT OR UPDATE ON child_sleep_log
  FOR EACH ROW
  EXECUTE FUNCTION calculate_sleep_duration();

COMMENT ON FUNCTION calculate_sleep_duration IS 'Calcule automatiquement duration_minutes = sleep_end_time - sleep_start_time';


-- =====================================================
-- Row Level Security (RLS)
-- =====================================================
-- Désactivé pour développement (activé en production)

-- ALTER TABLE child_meal_log ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE child_sleep_log ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE child_change_log ENABLE ROW LEVEL SECURITY;


-- =====================================================
-- Fin Migration 17
-- =====================================================

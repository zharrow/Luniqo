-- =====================================================
-- Migration 19: Phase 2 - Planning & Observations
-- =====================================================
-- Tables: child_planned_schedule, child_observation
-- Description: Planning type enfants et observations pédagogiques
-- =====================================================

-- Table 1: child_planned_schedule (Planning prévisionnel enfant)
-- =====================================================
CREATE TABLE IF NOT EXISTS child_planned_schedule (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL REFERENCES child(id) ON DELETE CASCADE,

  -- Jour de la semaine (1 = Lundi, 7 = Dimanche)
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),

  -- Horaires prévus
  arrival_time TIME NOT NULL,
  departure_time TIME NOT NULL,

  -- Périodes de validité
  valid_from DATE NOT NULL,
  valid_until DATE,

  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Contrainte: un seul planning par enfant par jour de semaine par période
  CONSTRAINT unique_child_schedule UNIQUE(child_id, day_of_week, valid_from),

  -- Contrainte: departure >= arrival
  CONSTRAINT valid_schedule_times CHECK (departure_time > arrival_time)
);

CREATE INDEX idx_schedule_child ON child_planned_schedule(child_id);
CREATE INDEX idx_schedule_active ON child_planned_schedule(is_active);
CREATE INDEX idx_schedule_day ON child_planned_schedule(day_of_week);
CREATE INDEX idx_schedule_validity ON child_planned_schedule(valid_from, valid_until);

COMMENT ON TABLE child_planned_schedule IS 'Horaires types hebdomadaires pour chaque enfant (selon contrat)';
COMMENT ON COLUMN child_planned_schedule.day_of_week IS '1=Lundi, 2=Mardi, ..., 7=Dimanche';


-- Table 2: child_observation (Observations pédagogiques)
-- =====================================================
CREATE TABLE IF NOT EXISTS child_observation (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL REFERENCES child(id) ON DELETE CASCADE,
  nursery_id UUID NOT NULL REFERENCES nursery(id) ON DELETE CASCADE,

  observation_date DATE NOT NULL,
  observation_time TIME,

  -- Catégorie d'observation
  category VARCHAR(50) NOT NULL CHECK (category IN (
    'motor',                                    -- Motricité
    'language',                                 -- Langage
    'social',                                   -- Interactions sociales
    'emotional',                                -- Émotionnel
    'cognitive',                                -- Cognitif
    'autonomy',                                 -- Autonomie
    'creativity'                                -- Créativité
  )),

  -- Contexte
  context VARCHAR(100) CHECK (context IN (
    'during_play',
    'during_meal',
    'during_activity',
    'free_time',
    'outdoor',
    'naptime',
    'arrival',
    'departure'
  )),

  -- Observation
  description TEXT NOT NULL,
  behaviors_observed TEXT[],                    -- Array des comportements
  skills_demonstrated TEXT[],                   -- Array des compétences

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
CREATE INDEX idx_observation_nursery ON child_observation(nursery_id);
CREATE INDEX idx_observation_nursery_date ON child_observation(nursery_id, observation_date DESC);
CREATE INDEX idx_observation_category ON child_observation(category);
CREATE INDEX idx_observation_date ON child_observation(observation_date DESC);
CREATE INDEX idx_observation_milestone ON child_observation(milestone_achieved) WHERE milestone_achieved = TRUE;
CREATE INDEX idx_observation_shared ON child_observation(is_shared_with_parents);

COMMENT ON TABLE child_observation IS 'Observations pédagogiques sur le développement des enfants';
COMMENT ON COLUMN child_observation.category IS 'Domaine de développement observé';
COMMENT ON COLUMN child_observation.behaviors_observed IS 'Array des comportements observés';
COMMENT ON COLUMN child_observation.skills_demonstrated IS 'Array des compétences démontrées';


-- =====================================================
-- Triggers et Fonctions
-- =====================================================

-- Trigger pour updated_at sur child_planned_schedule
CREATE TRIGGER trigger_schedule_updated_at
  BEFORE UPDATE ON child_planned_schedule
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Trigger pour updated_at sur child_observation
CREATE TRIGGER trigger_observation_updated_at
  BEFORE UPDATE ON child_observation
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();


-- =====================================================
-- Row Level Security (RLS)
-- =====================================================
-- Désactivé pour développement (activé en production)

-- ALTER TABLE child_planned_schedule ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE child_observation ENABLE ROW LEVEL SECURITY;


-- =====================================================
-- Fin Migration 19
-- =====================================================

-- =====================================================
-- Migration 18: Phase 2 - Activités Pédagogiques
-- =====================================================
-- Tables: activity, activity_participation, activity_document
-- Description: Planification et traçabilité des activités pédagogiques
-- =====================================================

-- Table 1: activity (Activités planifiées)
-- =====================================================
CREATE TABLE IF NOT EXISTS activity (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nursery_id UUID NOT NULL REFERENCES nursery(id) ON DELETE CASCADE,

  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Catégorie
  category VARCHAR(50) NOT NULL CHECK (category IN (
    'arts',
    'music',
    'outdoor',
    'reading',
    'science',
    'motor_skills',
    'sensory',
    'language',
    'social',
    'cooking'
  )),

  age_group VARCHAR(50) CHECK (age_group IN ('babies', 'toddlers', 'preschool', 'all')),

  -- Planning
  planned_date DATE,
  planned_time TIME,
  duration_minutes INTEGER,

  -- Objectifs pédagogiques
  learning_objectives TEXT[],                   -- Array des objectifs
  skills_developed TEXT[],                      -- 'fine_motor', 'language', 'social', etc.

  -- Matériel
  materials_needed TEXT[],
  preparation_notes TEXT,

  -- Responsable
  led_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Statut
  status VARCHAR(20) DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activity_nursery ON activity(nursery_id);
CREATE INDEX idx_activity_date ON activity(planned_date);
CREATE INDEX idx_activity_category ON activity(category);
CREATE INDEX idx_activity_status ON activity(status);
CREATE INDEX idx_activity_age_group ON activity(age_group);
CREATE INDEX idx_activity_status_date ON activity(status, planned_date);

COMMENT ON TABLE activity IS 'Catalogue des activités pédagogiques planifiées';
COMMENT ON COLUMN activity.learning_objectives IS 'Array des objectifs pédagogiques';
COMMENT ON COLUMN activity.skills_developed IS 'Array des compétences développées';


-- Table 2: activity_participation (Participation enfants)
-- =====================================================
CREATE TABLE IF NOT EXISTS activity_participation (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  activity_id UUID NOT NULL REFERENCES activity(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES child(id) ON DELETE CASCADE,

  -- Participation
  attended BOOLEAN DEFAULT TRUE,
  engagement_level VARCHAR(20) CHECK (engagement_level IN ('high', 'medium', 'low', 'refused')),

  -- Observations
  enjoyed BOOLEAN,
  notes TEXT,
  skills_observed TEXT[],                       -- Compétences observées

  -- Photos/Vidéos de l'enfant
  media_urls TEXT[],

  recorded_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  recorded_at TIMESTAMPTZ DEFAULT NOW(),

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Contrainte: un enfant ne peut participer qu'une fois à une activité
  CONSTRAINT unique_activity_child UNIQUE(activity_id, child_id)
);

CREATE INDEX idx_participation_activity ON activity_participation(activity_id);
CREATE INDEX idx_participation_child ON activity_participation(child_id);
CREATE INDEX idx_participation_engagement ON activity_participation(engagement_level);

COMMENT ON TABLE activity_participation IS 'Participation des enfants aux activités';
COMMENT ON COLUMN activity_participation.skills_observed IS 'Array des compétences observées durant l''activité';


-- Table 3: activity_document (Documents activités)
-- =====================================================
CREATE TABLE IF NOT EXISTS activity_document (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  activity_id UUID NOT NULL REFERENCES activity(id) ON DELETE CASCADE,

  document_type VARCHAR(20) NOT NULL CHECK (document_type IN ('photo', 'video', 'production', 'document')),
  file_url TEXT NOT NULL,
  file_name VARCHAR(255),
  file_size INTEGER,                            -- En bytes

  -- Description
  caption TEXT,
  tags TEXT[],                                  -- Tags pour recherche

  -- Enfants présents (si photo de groupe)
  children_ids UUID[],

  uploaded_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activity_doc_activity ON activity_document(activity_id);
CREATE INDEX idx_activity_doc_type ON activity_document(document_type);

COMMENT ON TABLE activity_document IS 'Photos, vidéos et documents liés aux activités';
COMMENT ON COLUMN activity_document.children_ids IS 'Array des IDs d''enfants présents sur le média';


-- =====================================================
-- Triggers et Fonctions
-- =====================================================

-- Trigger pour updated_at sur activity
CREATE TRIGGER trigger_activity_updated_at
  BEFORE UPDATE ON activity
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();


-- =====================================================
-- Row Level Security (RLS)
-- =====================================================
-- Désactivé pour développement (activé en production)

-- ALTER TABLE activity ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE activity_participation ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE activity_document ENABLE ROW LEVEL SECURITY;


-- =====================================================
-- Fin Migration 18
-- =====================================================

-- =============================================
-- Phase 6: Portail Parents - Timeline & Commentaires
-- Migration 48: Tables timeline_post, parent_comment
-- =============================================

-- =============================================
-- ENUMS
-- =============================================

-- Type de publication timeline
CREATE TYPE timeline_post_type AS ENUM (
  'activity',
  'meal',
  'nap',
  'photo',
  'video',
  'milestone',
  'observation',
  'artwork',
  'mood',
  'health_note'
);

-- Humeur de l'enfant
CREATE TYPE child_mood_type AS ENUM (
  'happy',
  'calm',
  'tired',
  'cranky',
  'excited',
  'sad',
  'playful',
  'sleepy'
);

-- =============================================
-- TABLE: timeline_post
-- =============================================

CREATE TABLE timeline_post (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL REFERENCES child(id) ON DELETE CASCADE,
  nursery_id UUID NOT NULL REFERENCES nursery(id) ON DELETE CASCADE,

  -- Date et heure
  post_date DATE NOT NULL DEFAULT CURRENT_DATE,
  post_time TIME DEFAULT CURRENT_TIME,

  -- Type de publication
  post_type timeline_post_type NOT NULL,

  -- Contenu
  title VARCHAR(255),
  content TEXT NOT NULL,

  -- Médias (Supabase Storage URLs)
  media_urls TEXT[] DEFAULT '{}',
  media_types VARCHAR(20)[] DEFAULT '{}',  -- ['image', 'video', ...]

  -- Humeur/État enfant
  child_mood child_mood_type,
  child_mood_emoji VARCHAR(10),

  -- Activité liée (si type = 'activity')
  activity_id UUID REFERENCES activity(id) ON DELETE SET NULL,

  -- Visibilité
  is_visible_to_parents BOOLEAN DEFAULT TRUE,
  published_at TIMESTAMPTZ,

  -- Réactions parents (JSONB array)
  -- Format: [{"guardian_id": "uuid", "emoji": "❤️", "timestamp": "ISO8601"}, ...]
  parent_reactions JSONB DEFAULT '[]'::jsonb,
  parent_comments_count INTEGER DEFAULT 0,

  -- Auteur (employé qui a publié)
  created_by_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX idx_timeline_post_child ON timeline_post(child_id);
CREATE INDEX idx_timeline_post_nursery ON timeline_post(nursery_id);
CREATE INDEX idx_timeline_post_date ON timeline_post(post_date DESC);
CREATE INDEX idx_timeline_post_type ON timeline_post(post_type);
CREATE INDEX idx_timeline_post_visible ON timeline_post(is_visible_to_parents);
CREATE INDEX idx_timeline_post_created_by ON timeline_post(created_by_id);

-- Index GIN pour recherche dans JSONB (réactions)
CREATE INDEX idx_timeline_post_reactions ON timeline_post USING gin(parent_reactions);

-- =============================================
-- TABLE: parent_comment
-- =============================================

CREATE TABLE parent_comment (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timeline_post_id UUID NOT NULL REFERENCES timeline_post(id) ON DELETE CASCADE,
  guardian_id UUID NOT NULL REFERENCES guardian(id) ON DELETE CASCADE,

  -- Contenu
  comment_text TEXT NOT NULL,

  -- Modération (optionnel)
  is_approved BOOLEAN DEFAULT TRUE,
  approved_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX idx_parent_comment_post ON parent_comment(timeline_post_id);
CREATE INDEX idx_parent_comment_guardian ON parent_comment(guardian_id);
CREATE INDEX idx_parent_comment_approved ON parent_comment(is_approved);
CREATE INDEX idx_parent_comment_created ON parent_comment(created_at DESC);

-- =============================================
-- FONCTIONS
-- =============================================

-- Fonction : Mettre à jour compteur commentaires
CREATE OR REPLACE FUNCTION update_timeline_post_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE timeline_post
    SET parent_comments_count = parent_comments_count + 1
    WHERE id = NEW.timeline_post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE timeline_post
    SET parent_comments_count = parent_comments_count - 1
    WHERE id = OLD.timeline_post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger : Compteur commentaires
CREATE TRIGGER trigger_update_comments_count
AFTER INSERT OR DELETE ON parent_comment
FOR EACH ROW
EXECUTE FUNCTION update_timeline_post_comments_count();

-- =============================================
-- TRIGGERS: updated_at
-- =============================================

CREATE TRIGGER update_timeline_post_updated_at
BEFORE UPDATE ON timeline_post
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_parent_comment_updated_at
BEFORE UPDATE ON parent_comment
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- COMMENTAIRES
-- =============================================

COMMENT ON TABLE timeline_post IS 'Publications du cahier de vie quotidien (activités, photos, observations)';
COMMENT ON TABLE parent_comment IS 'Commentaires des parents sur les posts de la timeline';

COMMENT ON COLUMN timeline_post.parent_reactions IS 'Array JSONB de réactions parents: [{"guardian_id": "uuid", "emoji": "❤️", "timestamp": "ISO8601"}]';
COMMENT ON COLUMN timeline_post.is_visible_to_parents IS 'Si FALSE, post en brouillon (non publié aux parents)';
COMMENT ON COLUMN timeline_post.media_urls IS 'URLs des photos/vidéos (Supabase Storage)';

COMMENT ON COLUMN parent_comment.is_approved IS 'Modération optionnelle par Owner (si activée)';

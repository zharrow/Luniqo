-- =====================================================
-- PHASE 4: INSCRIPTIONS & CONTRATS
-- Migration 29: Waiting List
-- =====================================================
-- Created: 2025-12-29
-- Description: Gestion de la liste d'attente avec positions et priorités

-- =====================================================
-- TABLE: waiting_list (Liste d'attente)
-- =====================================================

CREATE TABLE waiting_list (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL UNIQUE REFERENCES application(id) ON DELETE CASCADE,
  nursery_id UUID NOT NULL REFERENCES nursery(id) ON DELETE CASCADE,

  position INTEGER NOT NULL,                    -- Position dans la liste
  total_priority_score INTEGER DEFAULT 0,       -- Score total de priorité

  added_to_list_date DATE DEFAULT CURRENT_DATE,

  -- Notifications
  notified_of_spot_available BOOLEAN DEFAULT FALSE,
  notified_at TIMESTAMPTZ,

  -- Réponse famille
  family_response VARCHAR(20),                  -- 'accepted', 'declined', 'no_response'
  response_deadline DATE,

  -- Statut
  status VARCHAR(20) DEFAULT 'active',          -- 'active', 'offered', 'accepted', 'declined', 'expired', 'removed'

  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_waiting_list_nursery ON waiting_list(nursery_id);
CREATE INDEX idx_waiting_list_application ON waiting_list(application_id);
CREATE INDEX idx_waiting_list_position ON waiting_list(position);
CREATE INDEX idx_waiting_list_status ON waiting_list(status);
CREATE INDEX idx_waiting_list_priority_score ON waiting_list(total_priority_score DESC);

-- Unique position per nursery (position doit être unique par crèche)
CREATE UNIQUE INDEX idx_waiting_list_unique_position ON waiting_list(nursery_id, position) WHERE status = 'active';

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function: Calculate total priority score for an application
CREATE OR REPLACE FUNCTION calculate_application_priority_score(p_application_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_total_score INTEGER;
BEGIN
  SELECT COALESCE(SUM(priority_score), 0)
  INTO v_total_score
  FROM application_priority
  WHERE application_id = p_application_id
    AND verified = TRUE;

  RETURN v_total_score;
END;
$$;

-- Function: Recalculate waiting list positions for a nursery
CREATE OR REPLACE FUNCTION recalculate_waiting_list_positions(p_nursery_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_waiting_list_entry RECORD;
  v_new_position INTEGER := 1;
BEGIN
  -- Sort by priority score (descending), then by added_to_list_date (ascending)
  FOR v_waiting_list_entry IN
    SELECT id
    FROM waiting_list
    WHERE nursery_id = p_nursery_id
      AND status = 'active'
    ORDER BY total_priority_score DESC, added_to_list_date ASC
  LOOP
    UPDATE waiting_list
    SET position = v_new_position,
        updated_at = NOW()
    WHERE id = v_waiting_list_entry.id;

    v_new_position := v_new_position + 1;
  END LOOP;
END;
$$;

-- Function: Add application to waiting list
CREATE OR REPLACE FUNCTION add_to_waiting_list(p_application_id UUID, p_nursery_id UUID)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_waiting_list_id UUID;
  v_priority_score INTEGER;
  v_max_position INTEGER;
BEGIN
  -- Calculate total priority score
  v_priority_score := calculate_application_priority_score(p_application_id);

  -- Get max position
  SELECT COALESCE(MAX(position), 0) + 1
  INTO v_max_position
  FROM waiting_list
  WHERE nursery_id = p_nursery_id
    AND status = 'active';

  -- Create waiting list entry
  INSERT INTO waiting_list (
    application_id,
    nursery_id,
    position,
    total_priority_score,
    added_to_list_date,
    status
  )
  VALUES (
    p_application_id,
    p_nursery_id,
    v_max_position,
    v_priority_score,
    CURRENT_DATE,
    'active'
  )
  RETURNING id INTO v_waiting_list_id;

  -- Update application status
  UPDATE application
  SET status = 'waiting_list'
  WHERE id = p_application_id;

  -- Recalculate positions
  PERFORM recalculate_waiting_list_positions(p_nursery_id);

  RETURN v_waiting_list_id;
END;
$$;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger: updated_at pour waiting_list
CREATE TRIGGER update_waiting_list_updated_at
  BEFORE UPDATE ON waiting_list
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Trigger: Auto-recalculate positions when priority score changes
CREATE OR REPLACE FUNCTION trigger_recalculate_positions()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.total_priority_score != NEW.total_priority_score THEN
    PERFORM recalculate_waiting_list_positions(NEW.nursery_id);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER recalculate_positions_on_priority_change
  AFTER UPDATE ON waiting_list
  FOR EACH ROW
  WHEN (OLD.total_priority_score IS DISTINCT FROM NEW.total_priority_score)
  EXECUTE FUNCTION trigger_recalculate_positions();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE waiting_list IS 'Liste d''attente des demandes d''inscription avec positions et priorités';
COMMENT ON COLUMN waiting_list.position IS 'Position dans la liste (1 = premier, auto-calculée selon priorités)';
COMMENT ON COLUMN waiting_list.total_priority_score IS 'Score total cumulé de toutes les priorités';
COMMENT ON COLUMN waiting_list.status IS 'active, offered (place proposée), accepted, declined, expired, removed';
COMMENT ON COLUMN waiting_list.family_response IS 'Réponse de la famille: accepted, declined, no_response';

COMMENT ON FUNCTION calculate_application_priority_score IS 'Calcule le score total de priorité pour une demande (somme des priorités vérifiées)';
COMMENT ON FUNCTION recalculate_waiting_list_positions IS 'Recalcule toutes les positions de la liste d''attente selon scores et dates';
COMMENT ON FUNCTION add_to_waiting_list IS 'Ajoute une demande à la liste d''attente et recalcule les positions';

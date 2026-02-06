-- =============================================
-- Phase 6: Portail Parents - Documents Partagés
-- Migration 50: Tables parent_document_share, document_acknowledgment
-- =============================================

-- =============================================
-- ENUMS
-- =============================================

-- Scope de partage
CREATE TYPE document_share_scope AS ENUM (
  'all_families',
  'specific_families',
  'specific_child'
);

-- Type de document
CREATE TYPE parent_document_type AS ENUM (
  'menu',
  'calendar',
  'regulation',
  'invoice',
  'certificate',
  'report',
  'photo_album',
  'announcement',
  'consent_form',
  'contract',
  'newsletter',
  'activity_report'
);

-- =============================================
-- TABLE: parent_document_share
-- =============================================

CREATE TABLE parent_document_share (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nursery_id UUID NOT NULL REFERENCES nursery(id) ON DELETE CASCADE,

  -- Destinataires
  share_scope document_share_scope NOT NULL,

  -- Si share_scope = 'specific_families'
  family_ids UUID[] DEFAULT '{}',

  -- Si share_scope = 'specific_child'
  child_id UUID REFERENCES child(id) ON DELETE CASCADE,

  -- Document
  document_type parent_document_type NOT NULL,
  document_title VARCHAR(255) NOT NULL,
  document_description TEXT,

  -- Fichier (Supabase Storage)
  file_url TEXT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_size INTEGER,  -- en bytes
  mime_type VARCHAR(50),

  -- Validité
  valid_from DATE,
  valid_until DATE,

  -- Téléchargements et confirmations
  download_count INTEGER DEFAULT 0,
  requires_acknowledgment BOOLEAN DEFAULT FALSE,  -- Si TRUE, parents doivent confirmer lecture

  -- Publication
  is_published BOOLEAN DEFAULT TRUE,
  published_at TIMESTAMPTZ,
  published_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX idx_parent_document_share_nursery ON parent_document_share(nursery_id);
CREATE INDEX idx_parent_document_share_child ON parent_document_share(child_id);
CREATE INDEX idx_parent_document_share_type ON parent_document_share(document_type);
CREATE INDEX idx_parent_document_share_scope ON parent_document_share(share_scope);
CREATE INDEX idx_parent_document_share_published ON parent_document_share(is_published);
CREATE INDEX idx_parent_document_share_valid_until ON parent_document_share(valid_until);
CREATE INDEX idx_parent_document_share_published_by ON parent_document_share(published_by_id);

-- Index GIN pour recherche dans array (family_ids)
CREATE INDEX idx_parent_document_share_family_ids ON parent_document_share USING gin(family_ids);

-- =============================================
-- TABLE: document_acknowledgment
-- =============================================

CREATE TABLE document_acknowledgment (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_share_id UUID NOT NULL REFERENCES parent_document_share(id) ON DELETE CASCADE,
  guardian_id UUID NOT NULL REFERENCES guardian(id) ON DELETE CASCADE,

  -- Confirmation lecture
  acknowledged_at TIMESTAMPTZ DEFAULT NOW(),

  -- Téléchargements
  downloaded BOOLEAN DEFAULT FALSE,
  download_count INTEGER DEFAULT 0,
  last_downloaded_at TIMESTAMPTZ,

  UNIQUE(document_share_id, guardian_id)
);

-- Index pour performance
CREATE INDEX idx_document_acknowledgment_document ON document_acknowledgment(document_share_id);
CREATE INDEX idx_document_acknowledgment_guardian ON document_acknowledgment(guardian_id);
CREATE INDEX idx_document_acknowledgment_acknowledged ON document_acknowledgment(acknowledged_at);
CREATE INDEX idx_document_acknowledgment_downloaded ON document_acknowledgment(downloaded);

-- =============================================
-- FONCTIONS
-- =============================================

-- Fonction : Enregistrer téléchargement document
CREATE OR REPLACE FUNCTION record_document_download(
  p_document_id UUID,
  p_guardian_id UUID
)
RETURNS VOID AS $$
BEGIN
  -- Insérer ou mettre à jour l'acknowledgment
  INSERT INTO document_acknowledgment (document_share_id, guardian_id, downloaded, download_count, last_downloaded_at)
  VALUES (p_document_id, p_guardian_id, TRUE, 1, NOW())
  ON CONFLICT (document_share_id, guardian_id)
  DO UPDATE SET
    downloaded = TRUE,
    download_count = document_acknowledgment.download_count + 1,
    last_downloaded_at = NOW();

  -- Incrémenter compteur global de téléchargements
  UPDATE parent_document_share
  SET download_count = download_count + 1
  WHERE id = p_document_id;
END;
$$ LANGUAGE plpgsql;

-- Fonction : Confirmer lecture document
CREATE OR REPLACE FUNCTION acknowledge_document(
  p_document_id UUID,
  p_guardian_id UUID
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO document_acknowledgment (document_share_id, guardian_id, acknowledged_at)
  VALUES (p_document_id, p_guardian_id, NOW())
  ON CONFLICT (document_share_id, guardian_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Fonction : Obtenir documents non confirmés pour un parent
CREATE OR REPLACE FUNCTION get_unacknowledged_documents(p_guardian_id UUID)
RETURNS TABLE (
  document_id UUID,
  document_title VARCHAR(255),
  document_type parent_document_type,
  published_at TIMESTAMPTZ,
  requires_acknowledgment BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pds.id,
    pds.document_title,
    pds.document_type,
    pds.published_at,
    pds.requires_acknowledgment
  FROM parent_document_share pds
  LEFT JOIN document_acknowledgment da
    ON da.document_share_id = pds.id AND da.guardian_id = p_guardian_id
  WHERE pds.is_published = TRUE
    AND pds.requires_acknowledgment = TRUE
    AND da.id IS NULL
  ORDER BY pds.published_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Fonction : Obtenir statistiques de lecture pour un document
CREATE OR REPLACE FUNCTION get_document_read_stats(p_document_id UUID)
RETURNS TABLE (
  total_recipients INTEGER,
  acknowledged_count INTEGER,
  downloaded_count INTEGER,
  acknowledgment_rate NUMERIC(5,2)
) AS $$
DECLARE
  total_count INTEGER;
  ack_count INTEGER;
  dl_count INTEGER;
BEGIN
  -- Compter le nombre total de destinataires potentiels
  -- Note: Simplification - en production, il faudrait calculer selon le share_scope
  SELECT
    COUNT(DISTINCT da.guardian_id)::INTEGER,
    COUNT(DISTINCT CASE WHEN da.acknowledged_at IS NOT NULL THEN da.guardian_id END)::INTEGER,
    COUNT(DISTINCT CASE WHEN da.downloaded = TRUE THEN da.guardian_id END)::INTEGER
  INTO total_count, ack_count, dl_count
  FROM document_acknowledgment da
  WHERE da.document_share_id = p_document_id;

  -- Calculer taux de confirmation
  IF total_count > 0 THEN
    RETURN QUERY SELECT
      total_count,
      ack_count,
      dl_count,
      ROUND((ack_count::NUMERIC / total_count::NUMERIC) * 100, 2) AS acknowledgment_rate;
  ELSE
    RETURN QUERY SELECT 0, 0, 0, 0.00::NUMERIC(5,2);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- CONTRAINTES DE VALIDATION
-- =============================================

-- Contrainte : Si share_scope = 'specific_child', child_id doit être rempli
ALTER TABLE parent_document_share ADD CONSTRAINT check_child_id_when_specific_child
CHECK (
  (share_scope = 'specific_child' AND child_id IS NOT NULL) OR
  (share_scope != 'specific_child')
);

-- Contrainte : Si share_scope = 'specific_families', family_ids doit avoir au moins 1 ID
ALTER TABLE parent_document_share ADD CONSTRAINT check_family_ids_when_specific_families
CHECK (
  (share_scope = 'specific_families' AND array_length(family_ids, 1) > 0) OR
  (share_scope != 'specific_families')
);

-- Contrainte : file_size doit être positif
ALTER TABLE parent_document_share ADD CONSTRAINT check_file_size_positive
CHECK (file_size IS NULL OR file_size > 0);

-- Contrainte : download_count doit être >= 0
ALTER TABLE parent_document_share ADD CONSTRAINT check_download_count_non_negative
CHECK (download_count >= 0);

ALTER TABLE document_acknowledgment ADD CONSTRAINT check_ack_download_count_non_negative
CHECK (download_count >= 0);

-- =============================================
-- COMMENTAIRES
-- =============================================

COMMENT ON TABLE parent_document_share IS 'Documents partagés avec les parents (menus, règlements, factures, etc.)';
COMMENT ON TABLE document_acknowledgment IS 'Confirmations de lecture et téléchargements de documents par les parents';

COMMENT ON COLUMN parent_document_share.share_scope IS 'Portée du partage: all_families, specific_families, ou specific_child';
COMMENT ON COLUMN parent_document_share.family_ids IS 'IDs des familles (si share_scope = specific_families)';
COMMENT ON COLUMN parent_document_share.requires_acknowledgment IS 'Si TRUE, parents doivent confirmer avoir lu';
COMMENT ON COLUMN parent_document_share.valid_until IS 'Date d\'expiration (ex: menu mensuel valide jusqu\'à fin du mois)';

COMMENT ON COLUMN document_acknowledgment.acknowledged_at IS 'Date de confirmation de lecture';
COMMENT ON COLUMN document_acknowledgment.download_count IS 'Nombre de fois que le parent a téléchargé ce document';

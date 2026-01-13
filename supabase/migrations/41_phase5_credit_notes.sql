-- =============================================
-- Migration: Phase 5 - Credit Notes (Avoirs)
-- Description: Gestion des avoirs (remboursements, corrections)
-- Author: Claude Code
-- Date: 2026-01-13
-- =============================================

-- =============================================
-- ENUMS
-- =============================================

-- Raisons d'émission d'avoir
CREATE TYPE credit_note_reason AS ENUM (
  'overpayment',           -- Trop-perçu
  'error',                 -- Erreur de facturation
  'absence_refund',        -- Remboursement absence
  'contract_cancellation', -- Résiliation contrat
  'goodwill',              -- Geste commercial
  'adjustment',            -- Ajustement
  'duplicate',             -- Facture en double
  'other'                  -- Autre raison
);

-- Statuts d'avoir
CREATE TYPE credit_note_status AS ENUM (
  'issued',    -- Émis (créé)
  'applied',   -- Appliqué sur facture
  'refunded'   -- Remboursé à la famille
);

-- =============================================
-- TABLE: credit_note
-- =============================================

CREATE TABLE credit_note (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nursery_id UUID NOT NULL REFERENCES nursery(id) ON DELETE CASCADE,
  family_id UUID NOT NULL REFERENCES family(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES invoice(id) ON DELETE SET NULL,  -- Facture d'origine (optionnel)

  -- Numérotation
  credit_note_number VARCHAR(50) NOT NULL UNIQUE,  -- Format: {NURSERY}-CN-{YYYYMM}{SEQ}

  -- Dates
  credit_note_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Montant
  amount DECIMAL(10,2) NOT NULL,                   -- Montant de l'avoir (positif)

  -- Raison
  reason credit_note_reason NOT NULL,
  description TEXT NOT NULL,                       -- Description détaillée

  -- Application
  applied_to_invoice_id UUID REFERENCES invoice(id) ON DELETE SET NULL,  -- Facture sur laquelle l'avoir est appliqué
  applied_date DATE,                               -- Date d'application

  -- Statut
  status credit_note_status NOT NULL DEFAULT 'issued',

  -- Documents
  credit_note_pdf_url TEXT,                        -- PDF avoir généré

  -- Notes
  notes TEXT,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Contraintes
  CONSTRAINT credit_note_amount_positive CHECK (amount > 0),
  CONSTRAINT credit_note_applied_check CHECK (
    (status = 'applied' AND applied_to_invoice_id IS NOT NULL AND applied_date IS NOT NULL) OR
    (status != 'applied')
  )
);

-- Commentaires
COMMENT ON TABLE credit_note IS 'Avoirs émis aux familles (remboursements, corrections de factures)';
COMMENT ON COLUMN credit_note.credit_note_number IS 'Numéro unique (Format: NURSERY-CN-YYYYMMSEQ)';
COMMENT ON COLUMN credit_note.amount IS 'Montant de l''avoir (toujours positif)';
COMMENT ON COLUMN credit_note.reason IS 'Raison: overpayment, error, absence_refund, contract_cancellation, goodwill, adjustment, duplicate, other';
COMMENT ON COLUMN credit_note.invoice_id IS 'Facture d''origine ayant causé l''avoir (optionnel)';
COMMENT ON COLUMN credit_note.applied_to_invoice_id IS 'Facture sur laquelle l''avoir est déduit';
COMMENT ON COLUMN credit_note.status IS 'Statut: issued, applied, refunded';

-- Index
CREATE INDEX idx_credit_note_nursery ON credit_note(nursery_id);
CREATE INDEX idx_credit_note_family ON credit_note(family_id);
CREATE INDEX idx_credit_note_invoice ON credit_note(invoice_id);
CREATE INDEX idx_credit_note_applied_invoice ON credit_note(applied_to_invoice_id);
CREATE INDEX idx_credit_note_status ON credit_note(status);
CREATE INDEX idx_credit_note_date ON credit_note(credit_note_date);
CREATE INDEX idx_credit_note_number ON credit_note(credit_note_number);
CREATE INDEX idx_credit_note_reason ON credit_note(reason);

-- =============================================
-- TRIGGER: Update credit_note.updated_at
-- =============================================

CREATE OR REPLACE FUNCTION update_credit_note_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER credit_note_updated_at_trigger
  BEFORE UPDATE ON credit_note
  FOR EACH ROW
  EXECUTE FUNCTION update_credit_note_updated_at();

-- =============================================
-- TRIGGER: Apply credit note to invoice
-- =============================================

CREATE OR REPLACE FUNCTION apply_credit_note_to_invoice()
RETURNS TRIGGER AS $$
DECLARE
  v_invoice_total DECIMAL(10,2);
  v_current_discount DECIMAL(10,2);
BEGIN
  -- Si l'avoir est appliqué à une facture
  IF NEW.status = 'applied' AND NEW.applied_to_invoice_id IS NOT NULL THEN

    -- Récupérer le total de la facture
    SELECT total_amount, discount_amount
    INTO v_invoice_total, v_current_discount
    FROM invoice
    WHERE id = NEW.applied_to_invoice_id;

    -- Vérifier que l'avoir ne dépasse pas le montant de la facture
    IF NEW.amount > (v_invoice_total - v_current_discount) THEN
      RAISE EXCEPTION 'Credit note amount (%) exceeds invoice remaining amount (%)',
        NEW.amount, (v_invoice_total - v_current_discount);
    END IF;

    -- Appliquer l'avoir comme remise sur la facture
    UPDATE invoice
    SET
      discount_amount = discount_amount + NEW.amount,
      total_amount = subtotal + tax_amount - (discount_amount + NEW.amount),
      updated_at = NOW()
    WHERE id = NEW.applied_to_invoice_id;

    -- Enregistrer la date d'application
    IF NEW.applied_date IS NULL THEN
      NEW.applied_date = CURRENT_DATE;
    END IF;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER credit_note_apply_to_invoice_trigger
  BEFORE INSERT OR UPDATE ON credit_note
  FOR EACH ROW
  WHEN (NEW.status = 'applied' AND NEW.applied_to_invoice_id IS NOT NULL)
  EXECUTE FUNCTION apply_credit_note_to_invoice();

-- =============================================
-- TRIGGER: Mark invoice as credited when credit note issued
-- =============================================

CREATE OR REPLACE FUNCTION mark_invoice_credited()
RETURNS TRIGGER AS $$
BEGIN
  -- Si l'avoir concerne une facture d'origine (pas une application sur future facture)
  IF NEW.invoice_id IS NOT NULL AND NEW.status = 'issued' THEN

    -- Vérifier si le montant de l'avoir couvre toute la facture
    DECLARE
      v_invoice_total DECIMAL(10,2);
    BEGIN
      SELECT total_amount INTO v_invoice_total
      FROM invoice
      WHERE id = NEW.invoice_id;

      -- Si l'avoir couvre 100% de la facture, marquer comme 'credited'
      IF NEW.amount >= v_invoice_total THEN
        UPDATE invoice
        SET
          status = 'credited',
          updated_at = NOW()
        WHERE id = NEW.invoice_id;
      END IF;
    END;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER credit_note_mark_invoice_credited_trigger
  AFTER INSERT ON credit_note
  FOR EACH ROW
  WHEN (NEW.invoice_id IS NOT NULL)
  EXECUTE FUNCTION mark_invoice_credited();

-- =============================================
-- FUNCTION: Generate credit note number
-- =============================================

CREATE OR REPLACE FUNCTION generate_credit_note_number(
  p_nursery_id UUID,
  p_credit_note_date DATE DEFAULT CURRENT_DATE
)
RETURNS VARCHAR AS $$
DECLARE
  v_nursery_code VARCHAR(10);
  v_year_month VARCHAR(6);
  v_sequence INTEGER;
  v_credit_note_number VARCHAR(50);
BEGIN
  -- Récupérer le code de la crèche
  SELECT COALESCE(
    UPPER(SUBSTRING(name FROM 1 FOR 3)) || LPAD(id::TEXT FROM 1 FOR 3, 3, '0'),
    'NUR' || LPAD(id::TEXT FROM 1 FOR 3, 3, '0')
  )
  INTO v_nursery_code
  FROM nursery
  WHERE id = p_nursery_id;

  -- Format année-mois (YYYYMM)
  v_year_month = TO_CHAR(p_credit_note_date, 'YYYYMM');

  -- Trouver le prochain numéro de séquence
  SELECT COALESCE(MAX(
    CAST(
      SUBSTRING(credit_note_number FROM LENGTH(v_nursery_code || '-CN-' || v_year_month) + 1)
      AS INTEGER
    )
  ), 0) + 1
  INTO v_sequence
  FROM credit_note
  WHERE nursery_id = p_nursery_id
    AND credit_note_number LIKE v_nursery_code || '-CN-' || v_year_month || '%';

  -- Générer le numéro: {NURSERY}-CN-{YYYYMM}{SEQ}
  v_credit_note_number = v_nursery_code || '-CN-' || v_year_month || LPAD(v_sequence::TEXT, 2, '0');

  RETURN v_credit_note_number;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_credit_note_number IS 'Génère un numéro d''avoir unique au format {NURSERY}-CN-{YYYYMM}{SEQ}';

-- =============================================
-- FUNCTION: Create credit note from invoice
-- =============================================

CREATE OR REPLACE FUNCTION create_credit_note_from_invoice(
  p_invoice_id UUID,
  p_amount DECIMAL,
  p_reason credit_note_reason,
  p_description TEXT,
  p_created_by_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_credit_note_id UUID;
  v_nursery_id UUID;
  v_family_id UUID;
  v_invoice_total DECIMAL(10,2);
  v_credit_note_number VARCHAR(50);
BEGIN
  -- Récupérer les infos de la facture
  SELECT nursery_id, family_id, total_amount
  INTO v_nursery_id, v_family_id, v_invoice_total
  FROM invoice
  WHERE id = p_invoice_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice % not found', p_invoice_id;
  END IF;

  -- Vérifier que le montant de l'avoir ne dépasse pas la facture
  IF p_amount > v_invoice_total THEN
    RAISE EXCEPTION 'Credit note amount (%) cannot exceed invoice total (%)', p_amount, v_invoice_total;
  END IF;

  -- Générer le numéro d'avoir
  v_credit_note_number = generate_credit_note_number(v_nursery_id);

  -- Créer l'avoir
  INSERT INTO credit_note (
    nursery_id,
    family_id,
    invoice_id,
    credit_note_number,
    credit_note_date,
    amount,
    reason,
    description,
    status,
    created_by_id
  ) VALUES (
    v_nursery_id,
    v_family_id,
    p_invoice_id,
    v_credit_note_number,
    CURRENT_DATE,
    p_amount,
    p_reason,
    p_description,
    'issued',
    p_created_by_id
  )
  RETURNING id INTO v_credit_note_id;

  RETURN v_credit_note_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_credit_note_from_invoice IS 'Crée un avoir à partir d''une facture';

-- =============================================
-- FUNCTION: Apply credit note to invoice
-- =============================================

CREATE OR REPLACE FUNCTION apply_credit_note(
  p_credit_note_id UUID,
  p_target_invoice_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_credit_note_amount DECIMAL(10,2);
  v_current_status credit_note_status;
BEGIN
  -- Récupérer le montant et statut de l'avoir
  SELECT amount, status
  INTO v_credit_note_amount, v_current_status
  FROM credit_note
  WHERE id = p_credit_note_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Credit note % not found', p_credit_note_id;
  END IF;

  -- Vérifier que l'avoir n'est pas déjà appliqué ou remboursé
  IF v_current_status != 'issued' THEN
    RAISE EXCEPTION 'Credit note % is already % and cannot be applied', p_credit_note_id, v_current_status;
  END IF;

  -- Appliquer l'avoir sur la facture cible
  UPDATE credit_note
  SET
    applied_to_invoice_id = p_target_invoice_id,
    applied_date = CURRENT_DATE,
    status = 'applied',
    updated_at = NOW()
  WHERE id = p_credit_note_id;

END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION apply_credit_note IS 'Applique un avoir sur une facture (déduction)';

-- =============================================
-- VIEW: credit_note_summary
-- =============================================

CREATE OR REPLACE VIEW credit_note_summary AS
SELECT
  cn.id,
  cn.credit_note_number,
  cn.nursery_id,
  n.name AS nursery_name,
  cn.family_id,
  f.family_name,
  cn.invoice_id,
  origin_inv.invoice_number AS origin_invoice_number,
  cn.applied_to_invoice_id,
  applied_inv.invoice_number AS applied_invoice_number,
  cn.credit_note_date,
  cn.amount,
  cn.reason,
  cn.description,
  cn.status,
  cn.applied_date,
  COALESCE(creator.first_name || ' ' || creator.last_name, 'Système') AS created_by,
  cn.created_at
FROM credit_note cn
JOIN nursery n ON cn.nursery_id = n.id
JOIN family f ON cn.family_id = f.id
LEFT JOIN invoice origin_inv ON cn.invoice_id = origin_inv.id
LEFT JOIN invoice applied_inv ON cn.applied_to_invoice_id = applied_inv.id
LEFT JOIN profiles creator ON cn.created_by_id = creator.id;

COMMENT ON VIEW credit_note_summary IS 'Vue résumé des avoirs avec informations complètes';

-- =============================================
-- End of Migration
-- =============================================

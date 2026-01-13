-- =============================================
-- Migration: Phase 5 - Billing Periods (Périodes de facturation)
-- Description: Gestion des cycles mensuels de facturation
-- Author: Claude Code
-- Date: 2026-01-13
-- =============================================

-- =============================================
-- ENUMS
-- =============================================

-- Statuts de période de facturation
CREATE TYPE billing_period_status AS ENUM (
  'open',        -- Ouverte (en cours)
  'closed',      -- Fermée (plus de modifications)
  'invoiced',    -- Factures générées
  'finalized'    -- Finalisée (comptabilisée)
);

-- =============================================
-- TABLE: billing_period
-- =============================================

CREATE TABLE billing_period (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nursery_id UUID NOT NULL REFERENCES nursery(id) ON DELETE CASCADE,

  -- Période
  period_name VARCHAR(100) NOT NULL,               -- Ex: "Janvier 2026"
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Statut
  status billing_period_status NOT NULL DEFAULT 'open',

  -- Statistiques (mises à jour automatiquement)
  total_invoices INTEGER NOT NULL DEFAULT 0,
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,   -- Montant total facturé
  total_paid DECIMAL(12,2) NOT NULL DEFAULT 0,     -- Montant total payé
  total_outstanding DECIMAL(12,2) NOT NULL DEFAULT 0, -- Reste à encaisser

  -- Dates clés
  invoices_generated_at TIMESTAMPTZ,               -- Date génération des factures
  invoices_sent_at TIMESTAMPTZ,                    -- Date envoi des factures
  period_closed_at TIMESTAMPTZ,                    -- Date clôture période
  period_finalized_at TIMESTAMPTZ,                 -- Date finalisation

  -- Notes
  notes TEXT,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Contraintes
  CONSTRAINT billing_period_dates_check CHECK (period_end >= period_start),
  CONSTRAINT billing_period_amounts_positive CHECK (
    total_invoices >= 0 AND
    total_amount >= 0 AND
    total_paid >= 0 AND
    total_outstanding >= 0
  ),
  CONSTRAINT billing_period_outstanding_check CHECK (total_outstanding = total_amount - total_paid)
);

-- Commentaires
COMMENT ON TABLE billing_period IS 'Périodes de facturation mensuelles pour organiser et suivre les cycles de facturation';
COMMENT ON COLUMN billing_period.period_name IS 'Nom lisible de la période (ex: "Janvier 2026")';
COMMENT ON COLUMN billing_period.status IS 'Statut: open, closed, invoiced, finalized';
COMMENT ON COLUMN billing_period.total_outstanding IS 'Reste à encaisser (total_amount - total_paid)';

-- Index
CREATE INDEX idx_billing_period_nursery ON billing_period(nursery_id);
CREATE INDEX idx_billing_period_dates ON billing_period(period_start, period_end);
CREATE INDEX idx_billing_period_status ON billing_period(status);
CREATE INDEX idx_billing_period_name ON billing_period(nursery_id, period_name);

-- Index unique pour éviter les périodes qui se chevauchent
CREATE UNIQUE INDEX idx_billing_period_unique_dates
  ON billing_period(nursery_id, period_start, period_end);

-- =============================================
-- TRIGGER: Update billing_period.updated_at
-- =============================================

CREATE OR REPLACE FUNCTION update_billing_period_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER billing_period_updated_at_trigger
  BEFORE UPDATE ON billing_period
  FOR EACH ROW
  EXECUTE FUNCTION update_billing_period_updated_at();

-- =============================================
-- TRIGGER: Auto-calculate billing_period totals
-- =============================================

CREATE OR REPLACE FUNCTION calculate_billing_period_totals()
RETURNS TRIGGER AS $$
BEGIN
  -- Vérifier que total_outstanding = total_amount - total_paid
  NEW.total_outstanding = NEW.total_amount - NEW.total_paid;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER billing_period_calculate_totals_trigger
  BEFORE INSERT OR UPDATE ON billing_period
  FOR EACH ROW
  EXECUTE FUNCTION calculate_billing_period_totals();

-- =============================================
-- TRIGGER: Update period timestamps on status change
-- =============================================

CREATE OR REPLACE FUNCTION update_billing_period_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  -- Mettre à jour les timestamps selon le changement de statut
  IF NEW.status = 'invoiced' AND OLD.status != 'invoiced' THEN
    NEW.invoices_generated_at = NOW();
  END IF;

  IF NEW.status = 'closed' AND OLD.status != 'closed' THEN
    NEW.period_closed_at = NOW();
  END IF;

  IF NEW.status = 'finalized' AND OLD.status != 'finalized' THEN
    NEW.period_finalized_at = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER billing_period_timestamps_trigger
  BEFORE UPDATE ON billing_period
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION update_billing_period_timestamps();

-- =============================================
-- FUNCTION: Get current billing period
-- =============================================

CREATE OR REPLACE FUNCTION get_current_billing_period(
  p_nursery_id UUID,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  id UUID,
  period_name VARCHAR,
  period_start DATE,
  period_end DATE,
  status billing_period_status,
  total_invoices INTEGER,
  total_amount DECIMAL,
  total_paid DECIMAL,
  total_outstanding DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    bp.id,
    bp.period_name,
    bp.period_start,
    bp.period_end,
    bp.status,
    bp.total_invoices,
    bp.total_amount,
    bp.total_paid,
    bp.total_outstanding
  FROM billing_period bp
  WHERE bp.nursery_id = p_nursery_id
    AND p_date BETWEEN bp.period_start AND bp.period_end
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_current_billing_period IS 'Retourne la période de facturation en cours pour une date donnée';

-- =============================================
-- FUNCTION: Create billing period for month
-- =============================================

CREATE OR REPLACE FUNCTION create_monthly_billing_period(
  p_nursery_id UUID,
  p_month DATE
)
RETURNS UUID AS $$
DECLARE
  v_period_id UUID;
  v_period_name VARCHAR;
  v_period_start DATE;
  v_period_end DATE;
BEGIN
  -- Premier jour du mois
  v_period_start = DATE_TRUNC('month', p_month)::DATE;

  -- Dernier jour du mois
  v_period_end = (DATE_TRUNC('month', p_month) + INTERVAL '1 month - 1 day')::DATE;

  -- Nom de la période (ex: "Janvier 2026")
  v_period_name = TO_CHAR(p_month, 'TMMonth YYYY');

  -- Vérifier si la période existe déjà
  SELECT id INTO v_period_id
  FROM billing_period
  WHERE nursery_id = p_nursery_id
    AND period_start = v_period_start
    AND period_end = v_period_end;

  -- Si elle n'existe pas, la créer
  IF v_period_id IS NULL THEN
    INSERT INTO billing_period (
      nursery_id,
      period_name,
      period_start,
      period_end,
      status
    ) VALUES (
      p_nursery_id,
      v_period_name,
      v_period_start,
      v_period_end,
      'open'
    )
    RETURNING id INTO v_period_id;
  END IF;

  RETURN v_period_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_monthly_billing_period IS 'Crée une période de facturation pour un mois donné (ou retourne l''existante)';

-- =============================================
-- FUNCTION: Update billing period statistics
-- =============================================

CREATE OR REPLACE FUNCTION update_billing_period_stats(p_period_id UUID)
RETURNS VOID AS $$
DECLARE
  v_nursery_id UUID;
  v_period_start DATE;
  v_period_end DATE;
BEGIN
  -- Récupérer les infos de la période
  SELECT nursery_id, period_start, period_end
  INTO v_nursery_id, v_period_start, v_period_end
  FROM billing_period
  WHERE id = p_period_id;

  -- Mettre à jour les statistiques
  UPDATE billing_period bp
  SET
    total_invoices = (
      SELECT COUNT(*)
      FROM invoice i
      WHERE i.nursery_id = v_nursery_id
        AND i.billing_period_start >= v_period_start
        AND i.billing_period_end <= v_period_end
    ),
    total_amount = COALESCE((
      SELECT SUM(total_amount)
      FROM invoice i
      WHERE i.nursery_id = v_nursery_id
        AND i.billing_period_start >= v_period_start
        AND i.billing_period_end <= v_period_end
        AND i.status NOT IN ('cancelled', 'credited')
    ), 0),
    total_paid = COALESCE((
      SELECT SUM(paid_amount)
      FROM invoice i
      WHERE i.nursery_id = v_nursery_id
        AND i.billing_period_start >= v_period_start
        AND i.billing_period_end <= v_period_end
        AND i.status NOT IN ('cancelled', 'credited')
    ), 0)
  WHERE bp.id = p_period_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_billing_period_stats IS 'Met à jour les statistiques d''une période de facturation (nb factures, montants)';

-- =============================================
-- FUNCTION: Close billing period
-- =============================================

CREATE OR REPLACE FUNCTION close_billing_period(
  p_period_id UUID,
  p_closed_by_id UUID
)
RETURNS VOID AS $$
BEGIN
  -- Mettre à jour les statistiques avant clôture
  PERFORM update_billing_period_stats(p_period_id);

  -- Fermer la période
  UPDATE billing_period
  SET
    status = 'closed',
    period_closed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_period_id
    AND status = 'open';

  -- Vérifier que la période a bien été fermée
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Billing period % cannot be closed (already closed or not found)', p_period_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION close_billing_period IS 'Ferme une période de facturation (plus de modifications possibles)';

-- =============================================
-- VIEW: billing_period_summary
-- =============================================

CREATE OR REPLACE VIEW billing_period_summary AS
SELECT
  bp.id,
  bp.nursery_id,
  n.name AS nursery_name,
  bp.period_name,
  bp.period_start,
  bp.period_end,
  bp.status,
  bp.total_invoices,
  bp.total_amount,
  bp.total_paid,
  bp.total_outstanding,
  -- Taux de paiement
  CASE
    WHEN bp.total_amount > 0 THEN ROUND((bp.total_paid / bp.total_amount) * 100, 2)
    ELSE 0
  END AS payment_rate_percent,
  -- Nombre de factures par statut
  (SELECT COUNT(*) FROM invoice i
   WHERE i.nursery_id = bp.nursery_id
     AND i.billing_period_start >= bp.period_start
     AND i.billing_period_end <= bp.period_end
     AND i.status = 'paid') AS invoices_paid,
  (SELECT COUNT(*) FROM invoice i
   WHERE i.nursery_id = bp.nursery_id
     AND i.billing_period_start >= bp.period_start
     AND i.billing_period_end <= bp.period_end
     AND i.status = 'overdue') AS invoices_overdue,
  bp.invoices_generated_at,
  bp.invoices_sent_at,
  bp.period_closed_at,
  bp.created_at,
  bp.updated_at
FROM billing_period bp
JOIN nursery n ON bp.nursery_id = n.id;

COMMENT ON VIEW billing_period_summary IS 'Vue résumé des périodes de facturation avec statistiques détaillées';

-- =============================================
-- End of Migration
-- =============================================

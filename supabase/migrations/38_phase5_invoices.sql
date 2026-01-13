-- =============================================
-- Migration: Phase 5 - Invoices (Factures)
-- Description: Tables pour la gestion des factures
-- Author: Claude Code
-- Date: 2026-01-13
-- =============================================

-- =============================================
-- ENUMS
-- =============================================

-- Statuts de facture
CREATE TYPE invoice_status AS ENUM (
  'draft',           -- Brouillon (en cours de création)
  'sent',            -- Envoyée à la famille
  'paid',            -- Payée intégralement
  'partially_paid',  -- Payée partiellement
  'overdue',         -- En retard de paiement
  'cancelled',       -- Annulée
  'credited'         -- Avoir émis
);

-- Types de ligne de facture
CREATE TYPE invoice_line_type AS ENUM (
  'childcare',       -- Accueil régulier
  'meal',            -- Repas
  'extra_hours',     -- Heures supplémentaires
  'supply_fee',      -- Frais de fournitures
  'late_pickup',     -- Pénalité retard
  'penalty',         -- Pénalité
  'adjustment',      -- Ajustement
  'discount',        -- Remise
  'other'            -- Autre
);

-- =============================================
-- TABLE: invoice
-- =============================================

CREATE TABLE invoice (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nursery_id UUID NOT NULL REFERENCES nursery(id) ON DELETE CASCADE,
  family_id UUID NOT NULL REFERENCES family(id) ON DELETE CASCADE,
  contract_id UUID REFERENCES contract(id) ON DELETE SET NULL,

  -- Numérotation
  invoice_number VARCHAR(50) NOT NULL UNIQUE,       -- Format: {NURSERY}-INV-{YYYYMM}{SEQ}

  -- Dates
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,                           -- Date d'échéance

  -- Période facturée
  billing_period_start DATE NOT NULL,
  billing_period_end DATE NOT NULL,

  -- Montants (en euros)
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,        -- Sous-total HT (ou TTC si exonéré TVA)
  tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0,      -- Montant TVA (généralement 0 pour crèches)
  discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0, -- Remises éventuelles
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,    -- Montant total à payer

  -- Participation CAF (système PSU français)
  caf_participation DECIMAL(10,2) NOT NULL DEFAULT 0, -- Part prise en charge par CAF
  family_share DECIMAL(10,2) NOT NULL DEFAULT 0,      -- Part à charge de la famille

  -- Statut
  status invoice_status NOT NULL DEFAULT 'draft',

  -- Paiement
  paid_amount DECIMAL(10,2) NOT NULL DEFAULT 0,     -- Montant déjà payé
  remaining_amount DECIMAL(10,2),                   -- Reste à payer (calculé)
  paid_date DATE,                                   -- Date du paiement complet

  -- Documents
  invoice_pdf_url TEXT,                             -- URL du PDF généré (Supabase Storage)

  -- Notes
  notes TEXT,
  payment_instructions TEXT,                        -- Instructions de paiement spécifiques

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Contraintes
  CONSTRAINT invoice_dates_check CHECK (due_date >= invoice_date),
  CONSTRAINT invoice_period_check CHECK (billing_period_end >= billing_period_start),
  CONSTRAINT invoice_amounts_positive CHECK (
    subtotal >= 0 AND
    tax_amount >= 0 AND
    discount_amount >= 0 AND
    total_amount >= 0 AND
    caf_participation >= 0 AND
    family_share >= 0 AND
    paid_amount >= 0
  ),
  CONSTRAINT invoice_family_share_check CHECK (family_share = total_amount - caf_participation)
);

-- Commentaires
COMMENT ON TABLE invoice IS 'Factures émises aux familles pour l''accueil en crèche';
COMMENT ON COLUMN invoice.invoice_number IS 'Numéro unique de facture (Format: NURSERY-INV-YYYYMMSEQ)';
COMMENT ON COLUMN invoice.caf_participation IS 'Part prise en charge par la CAF (système PSU français)';
COMMENT ON COLUMN invoice.family_share IS 'Part restant à charge de la famille';
COMMENT ON COLUMN invoice.status IS 'Statut: draft, sent, paid, partially_paid, overdue, cancelled, credited';

-- Index
CREATE INDEX idx_invoice_nursery ON invoice(nursery_id);
CREATE INDEX idx_invoice_family ON invoice(family_id);
CREATE INDEX idx_invoice_contract ON invoice(contract_id);
CREATE INDEX idx_invoice_status ON invoice(status);
CREATE INDEX idx_invoice_date ON invoice(invoice_date);
CREATE INDEX idx_invoice_due_date ON invoice(due_date);
CREATE INDEX idx_invoice_number ON invoice(invoice_number);
CREATE INDEX idx_invoice_period ON invoice(billing_period_start, billing_period_end);

-- Index pour les factures impayées (requête fréquente)
CREATE INDEX idx_invoice_overdue ON invoice(nursery_id, status, due_date)
  WHERE status IN ('sent', 'partially_paid', 'overdue') AND remaining_amount > 0;

-- =============================================
-- TABLE: invoice_line
-- =============================================

CREATE TABLE invoice_line (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES invoice(id) ON DELETE CASCADE,

  line_number INTEGER NOT NULL,                     -- Ordre d'affichage (1, 2, 3...)

  -- Description
  description VARCHAR(255) NOT NULL,                -- Ex: "Accueil régulier - Janvier 2026"
  item_type invoice_line_type NOT NULL DEFAULT 'childcare',

  -- Quantité
  quantity DECIMAL(10,2) NOT NULL DEFAULT 1,        -- Nb heures, nb jours, etc.
  unit VARCHAR(20) NOT NULL DEFAULT 'hour',         -- 'hour', 'day', 'month', 'meal', 'unit'

  -- Prix
  unit_price DECIMAL(8,2) NOT NULL DEFAULT 0,       -- Prix unitaire
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,        -- Sous-total ligne (quantity × unit_price)

  -- TVA (généralement 0% pour crèches)
  tax_rate DECIMAL(5,2) NOT NULL DEFAULT 0,         -- Taux TVA en %
  tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0,      -- Montant TVA

  -- Total
  total DECIMAL(10,2) NOT NULL DEFAULT 0,           -- Total ligne TTC

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Contraintes
  CONSTRAINT invoice_line_amounts_positive CHECK (
    quantity >= 0 AND
    unit_price >= 0 AND
    subtotal >= 0 AND
    tax_rate >= 0 AND
    tax_amount >= 0 AND
    total >= 0
  ),
  CONSTRAINT invoice_line_subtotal_check CHECK (subtotal = quantity * unit_price),
  CONSTRAINT invoice_line_total_check CHECK (total = subtotal + tax_amount),
  CONSTRAINT invoice_line_number_positive CHECK (line_number > 0)
);

-- Commentaires
COMMENT ON TABLE invoice_line IS 'Lignes de détail des factures (postes facturés)';
COMMENT ON COLUMN invoice_line.line_number IS 'Numéro d''ordre pour l''affichage (1, 2, 3...)';
COMMENT ON COLUMN invoice_line.item_type IS 'Type: childcare, meal, extra_hours, supply_fee, late_pickup, penalty, adjustment, discount, other';
COMMENT ON COLUMN invoice_line.unit IS 'Unité: hour, day, month, meal, unit';
COMMENT ON COLUMN invoice_line.tax_rate IS 'Taux TVA en % (généralement 0% pour crèches - exonération)';

-- Index
CREATE INDEX idx_invoice_line_invoice ON invoice_line(invoice_id);
CREATE INDEX idx_invoice_line_type ON invoice_line(item_type);
CREATE INDEX idx_invoice_line_number ON invoice_line(invoice_id, line_number);

-- Index unique pour éviter les doublons de numéro de ligne
CREATE UNIQUE INDEX idx_invoice_line_unique_number ON invoice_line(invoice_id, line_number);

-- =============================================
-- TRIGGER: Update invoice.updated_at
-- =============================================

CREATE OR REPLACE FUNCTION update_invoice_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER invoice_updated_at_trigger
  BEFORE UPDATE ON invoice
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_updated_at();

-- =============================================
-- TRIGGER: Auto-calculate invoice totals
-- =============================================

CREATE OR REPLACE FUNCTION calculate_invoice_totals()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculer remaining_amount
  NEW.remaining_amount = NEW.total_amount - NEW.paid_amount;

  -- Vérifier que family_share = total_amount - caf_participation
  IF NEW.family_share != (NEW.total_amount - NEW.caf_participation) THEN
    RAISE EXCEPTION 'family_share must equal total_amount - caf_participation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER invoice_calculate_totals_trigger
  BEFORE INSERT OR UPDATE ON invoice
  FOR EACH ROW
  EXECUTE FUNCTION calculate_invoice_totals();

-- =============================================
-- TRIGGER: Auto-update invoice status based on payment
-- =============================================

CREATE OR REPLACE FUNCTION update_invoice_status_on_payment()
RETURNS TRIGGER AS $$
BEGIN
  -- Si totalement payé
  IF NEW.remaining_amount <= 0 THEN
    NEW.status = 'paid';
    IF NEW.paid_date IS NULL THEN
      NEW.paid_date = CURRENT_DATE;
    END IF;
  -- Si partiellement payé
  ELSIF NEW.paid_amount > 0 AND NEW.remaining_amount > 0 THEN
    NEW.status = 'partially_paid';
  -- Si impayé après échéance
  ELSIF NEW.due_date < CURRENT_DATE AND NEW.remaining_amount > 0 THEN
    NEW.status = 'overdue';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER invoice_update_status_trigger
  BEFORE INSERT OR UPDATE ON invoice
  FOR EACH ROW
  WHEN (NEW.status NOT IN ('cancelled', 'credited'))
  EXECUTE FUNCTION update_invoice_status_on_payment();

-- =============================================
-- FUNCTION: Generate invoice number
-- =============================================

CREATE OR REPLACE FUNCTION generate_invoice_number(
  p_nursery_id UUID,
  p_invoice_date DATE DEFAULT CURRENT_DATE
)
RETURNS VARCHAR AS $$
DECLARE
  v_nursery_code VARCHAR(10);
  v_year_month VARCHAR(6);
  v_sequence INTEGER;
  v_invoice_number VARCHAR(50);
BEGIN
  -- Récupérer le code de la crèche (ex: "LUN001")
  SELECT COALESCE(
    UPPER(SUBSTRING(name FROM 1 FOR 3)) || LPAD(id::TEXT FROM 1 FOR 3, 3, '0'),
    'NUR' || LPAD(id::TEXT FROM 1 FOR 3, 3, '0')
  )
  INTO v_nursery_code
  FROM nursery
  WHERE id = p_nursery_id;

  -- Format année-mois (YYYYMM)
  v_year_month = TO_CHAR(p_invoice_date, 'YYYYMM');

  -- Trouver le prochain numéro de séquence pour ce mois
  SELECT COALESCE(MAX(
    CAST(
      SUBSTRING(invoice_number FROM LENGTH(v_nursery_code || '-INV-' || v_year_month) + 1)
      AS INTEGER
    )
  ), 0) + 1
  INTO v_sequence
  FROM invoice
  WHERE nursery_id = p_nursery_id
    AND invoice_number LIKE v_nursery_code || '-INV-' || v_year_month || '%';

  -- Générer le numéro complet: {NURSERY}-INV-{YYYYMM}{SEQ}
  -- Ex: LUN001-INV-20260101
  v_invoice_number = v_nursery_code || '-INV-' || v_year_month || LPAD(v_sequence::TEXT, 2, '0');

  RETURN v_invoice_number;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_invoice_number IS 'Génère un numéro de facture unique au format {NURSERY}-INV-{YYYYMM}{SEQ}';

-- =============================================
-- FUNCTION: Get invoice summary
-- =============================================

CREATE OR REPLACE FUNCTION get_invoice_summary(p_invoice_id UUID)
RETURNS TABLE(
  invoice_id UUID,
  invoice_number VARCHAR,
  family_name VARCHAR,
  total_amount DECIMAL,
  paid_amount DECIMAL,
  remaining_amount DECIMAL,
  status invoice_status,
  line_count INTEGER,
  due_date DATE,
  days_overdue INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.id,
    i.invoice_number,
    f.family_name,
    i.total_amount,
    i.paid_amount,
    i.remaining_amount,
    i.status,
    COUNT(il.id)::INTEGER AS line_count,
    i.due_date,
    CASE
      WHEN i.due_date < CURRENT_DATE THEN (CURRENT_DATE - i.due_date)
      ELSE 0
    END AS days_overdue
  FROM invoice i
  JOIN family f ON i.family_id = f.id
  LEFT JOIN invoice_line il ON i.id = il.invoice_id
  WHERE i.id = p_invoice_id
  GROUP BY i.id, f.family_name;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_invoice_summary IS 'Retourne un résumé complet d''une facture avec statistiques';

-- =============================================
-- End of Migration
-- =============================================

-- =============================================
-- Migration: Phase 5 - Debt Collection (Relances impayés)
-- Description: Gestion des relances automatiques et manuelles
-- Author: Claude Code
-- Date: 2026-01-13
-- =============================================

-- =============================================
-- ENUMS
-- =============================================

-- Types de relance
CREATE TYPE reminder_type AS ENUM (
  'first_reminder',   -- 1ère relance (J+7)
  'second_reminder',  -- 2e relance (J+15)
  'final_notice',     -- Mise en demeure (J+30)
  'legal_action'      -- Action en justice (J+45+)
);

-- Méthodes de relance
CREATE TYPE reminder_method AS ENUM (
  'email',        -- Email
  'postal_mail',  -- Courrier postal
  'phone',        -- Téléphone
  'sms',          -- SMS
  'in_person'     -- En personne
);

-- Statuts de relance
CREATE TYPE debt_collection_status AS ENUM (
  'pending',           -- En attente d'envoi
  'sent',              -- Envoyée
  'acknowledged',      -- Accusée réception
  'payment_received',  -- Paiement reçu
  'escalated',         -- Escaladée
  'legal',             -- Contentieux juridique
  'cancelled'          -- Annulée
);

-- =============================================
-- TABLE: debt_collection
-- =============================================

CREATE TABLE debt_collection (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES invoice(id) ON DELETE CASCADE,
  family_id UUID NOT NULL REFERENCES family(id) ON DELETE CASCADE,
  nursery_id UUID NOT NULL REFERENCES nursery(id) ON DELETE CASCADE,

  -- Type et méthode
  reminder_type reminder_type NOT NULL,
  reminder_date DATE NOT NULL DEFAULT CURRENT_DATE,
  days_overdue INTEGER NOT NULL,                   -- Nb jours de retard au moment de la relance

  -- Montant dû
  amount_due DECIMAL(10,2) NOT NULL,               -- Montant dû au moment de la relance

  -- Communication
  reminder_method reminder_method,                 -- Méthode utilisée
  reminder_sent BOOLEAN NOT NULL DEFAULT FALSE,
  reminder_sent_at TIMESTAMPTZ,
  email_sent_to VARCHAR(255),                      -- Email du destinataire
  postal_address TEXT,                             -- Adresse postale

  -- Documents
  reminder_document_url TEXT,                      -- PDF lettre de relance

  -- Réponse famille
  family_response TEXT,                            -- Réponse de la famille
  family_response_date DATE,
  payment_plan_proposed BOOLEAN NOT NULL DEFAULT FALSE,
  payment_plan_details TEXT,                       -- Détails du plan d'échelonnement
  payment_plan_accepted BOOLEAN,
  payment_plan_document_url TEXT,

  -- Statut
  status debt_collection_status NOT NULL DEFAULT 'pending',

  -- Notes
  notes TEXT,
  internal_notes TEXT,                             -- Notes internes (non visibles famille)

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Contraintes
  CONSTRAINT debt_collection_amount_positive CHECK (amount_due > 0),
  CONSTRAINT debt_collection_days_positive CHECK (days_overdue >= 0),
  CONSTRAINT debt_collection_sent_check CHECK (
    (reminder_sent = TRUE AND reminder_sent_at IS NOT NULL) OR
    (reminder_sent = FALSE)
  )
);

-- Commentaires
COMMENT ON TABLE debt_collection IS 'Relances pour factures impayées (gestion recouvrement)';
COMMENT ON COLUMN debt_collection.reminder_type IS 'Type: first_reminder, second_reminder, final_notice, legal_action';
COMMENT ON COLUMN debt_collection.days_overdue IS 'Nombre de jours de retard au moment de la relance';
COMMENT ON COLUMN debt_collection.reminder_method IS 'Méthode: email, postal_mail, phone, sms, in_person';
COMMENT ON COLUMN debt_collection.payment_plan_proposed IS 'Plan de paiement échelonné proposé';
COMMENT ON COLUMN debt_collection.status IS 'Statut: pending, sent, acknowledged, payment_received, escalated, legal, cancelled';

-- Index
CREATE INDEX idx_debt_collection_invoice ON debt_collection(invoice_id);
CREATE INDEX idx_debt_collection_family ON debt_collection(family_id);
CREATE INDEX idx_debt_collection_nursery ON debt_collection(nursery_id);
CREATE INDEX idx_debt_collection_date ON debt_collection(reminder_date);
CREATE INDEX idx_debt_collection_type ON debt_collection(reminder_type);
CREATE INDEX idx_debt_collection_status ON debt_collection(status);
CREATE INDEX idx_debt_collection_sent ON debt_collection(reminder_sent, reminder_sent_at);

-- Index pour les relances en attente d'envoi
CREATE INDEX idx_debt_collection_pending ON debt_collection(nursery_id, status)
  WHERE status = 'pending';

-- =============================================
-- TRIGGER: Update debt_collection.updated_at
-- =============================================

CREATE OR REPLACE FUNCTION update_debt_collection_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER debt_collection_updated_at_trigger
  BEFORE UPDATE ON debt_collection
  FOR EACH ROW
  EXECUTE FUNCTION update_debt_collection_updated_at();

-- =============================================
-- TRIGGER: Auto-set reminder_sent_at when sent
-- =============================================

CREATE OR REPLACE FUNCTION set_reminder_sent_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  -- Si on marque comme envoyée et que reminder_sent_at n'est pas défini
  IF NEW.reminder_sent = TRUE AND NEW.reminder_sent_at IS NULL THEN
    NEW.reminder_sent_at = NOW();
  END IF;

  -- Si on marque comme envoyée, changer le statut
  IF NEW.reminder_sent = TRUE AND NEW.status = 'pending' THEN
    NEW.status = 'sent';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER debt_collection_set_sent_timestamp_trigger
  BEFORE INSERT OR UPDATE ON debt_collection
  FOR EACH ROW
  WHEN (NEW.reminder_sent = TRUE)
  EXECUTE FUNCTION set_reminder_sent_timestamp();

-- =============================================
-- FUNCTION: Get overdue invoices for reminders
-- =============================================

CREATE OR REPLACE FUNCTION get_overdue_invoices_for_reminders(
  p_nursery_id UUID,
  p_current_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  invoice_id UUID,
  invoice_number VARCHAR,
  family_id UUID,
  family_name VARCHAR,
  due_date DATE,
  days_overdue INTEGER,
  remaining_amount DECIMAL,
  last_reminder_type reminder_type,
  last_reminder_date DATE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.id,
    i.invoice_number,
    i.family_id,
    f.family_name,
    i.due_date,
    (p_current_date - i.due_date) AS days_overdue,
    i.remaining_amount,
    (SELECT dc.reminder_type
     FROM debt_collection dc
     WHERE dc.invoice_id = i.id
     ORDER BY dc.reminder_date DESC, dc.created_at DESC
     LIMIT 1) AS last_reminder_type,
    (SELECT dc.reminder_date
     FROM debt_collection dc
     WHERE dc.invoice_id = i.id
     ORDER BY dc.reminder_date DESC, dc.created_at DESC
     LIMIT 1) AS last_reminder_date
  FROM invoice i
  JOIN family f ON i.family_id = f.id
  WHERE i.nursery_id = p_nursery_id
    AND i.status IN ('sent', 'partially_paid', 'overdue')
    AND i.remaining_amount > 0
    AND i.due_date < p_current_date
  ORDER BY (p_current_date - i.due_date) DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_overdue_invoices_for_reminders IS 'Retourne les factures impayées nécessitant une relance';

-- =============================================
-- FUNCTION: Create automatic reminder
-- =============================================

CREATE OR REPLACE FUNCTION create_automatic_reminder(
  p_invoice_id UUID,
  p_reminder_type reminder_type,
  p_created_by_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_reminder_id UUID;
  v_nursery_id UUID;
  v_family_id UUID;
  v_amount_due DECIMAL(10,2);
  v_days_overdue INTEGER;
  v_family_email VARCHAR(255);
BEGIN
  -- Récupérer les infos de la facture
  SELECT
    i.nursery_id,
    i.family_id,
    i.remaining_amount,
    (CURRENT_DATE - i.due_date) AS days_overdue
  INTO v_nursery_id, v_family_id, v_amount_due, v_days_overdue
  FROM invoice i
  WHERE i.id = p_invoice_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice % not found', p_invoice_id;
  END IF;

  -- Récupérer l'email de la famille (guardian principal)
  SELECT g.email INTO v_family_email
  FROM guardian g
  WHERE g.family_id = v_family_id
    AND g.is_primary = TRUE
  LIMIT 1;

  -- Créer la relance
  INSERT INTO debt_collection (
    invoice_id,
    family_id,
    nursery_id,
    reminder_type,
    reminder_date,
    days_overdue,
    amount_due,
    reminder_method,
    email_sent_to,
    status,
    created_by_id
  ) VALUES (
    p_invoice_id,
    v_family_id,
    v_nursery_id,
    p_reminder_type,
    CURRENT_DATE,
    v_days_overdue,
    v_amount_due,
    'email',
    v_family_email,
    'pending',
    p_created_by_id
  )
  RETURNING id INTO v_reminder_id;

  RETURN v_reminder_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_automatic_reminder IS 'Crée une relance automatique pour une facture impayée';

-- =============================================
-- FUNCTION: Process automatic reminders (Cron job)
-- =============================================

CREATE OR REPLACE FUNCTION process_automatic_reminders(p_nursery_id UUID)
RETURNS TABLE(
  reminder_id UUID,
  invoice_id UUID,
  reminder_type reminder_type,
  days_overdue INTEGER
) AS $$
DECLARE
  v_invoice RECORD;
  v_last_reminder RECORD;
  v_days_overdue INTEGER;
  v_reminder_type reminder_type;
  v_reminder_id UUID;
BEGIN
  -- Pour chaque facture impayée
  FOR v_invoice IN
    SELECT * FROM get_overdue_invoices_for_reminders(p_nursery_id)
  LOOP
    v_days_overdue = v_invoice.days_overdue;
    v_last_reminder = ROW(v_invoice.last_reminder_type, v_invoice.last_reminder_date);

    -- Déterminer le type de relance selon le nombre de jours de retard
    IF v_days_overdue >= 45 AND (v_last_reminder.last_reminder_type IS NULL OR v_last_reminder.last_reminder_type != 'legal_action') THEN
      v_reminder_type = 'legal_action';
    ELSIF v_days_overdue >= 30 AND (v_last_reminder.last_reminder_type IS NULL OR v_last_reminder.last_reminder_type NOT IN ('final_notice', 'legal_action')) THEN
      v_reminder_type = 'final_notice';
    ELSIF v_days_overdue >= 15 AND (v_last_reminder.last_reminder_type IS NULL OR v_last_reminder.last_reminder_type = 'first_reminder') THEN
      v_reminder_type = 'second_reminder';
    ELSIF v_days_overdue >= 7 AND v_last_reminder.last_reminder_type IS NULL THEN
      v_reminder_type = 'first_reminder';
    ELSE
      CONTINUE; -- Pas de relance à créer pour cette facture
    END IF;

    -- Vérifier qu'on n'a pas déjà créé cette relance aujourd'hui
    IF NOT EXISTS (
      SELECT 1 FROM debt_collection
      WHERE invoice_id = v_invoice.invoice_id
        AND reminder_type = v_reminder_type
        AND reminder_date = CURRENT_DATE
    ) THEN
      -- Créer la relance
      v_reminder_id = create_automatic_reminder(v_invoice.invoice_id, v_reminder_type);

      RETURN QUERY SELECT v_reminder_id, v_invoice.invoice_id, v_reminder_type, v_days_overdue;
    END IF;

  END LOOP;

END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION process_automatic_reminders IS 'Traite les relances automatiques pour toutes les factures impayées (à exécuter quotidiennement via cron)';

-- =============================================
-- FUNCTION: Mark invoice paid from reminder
-- =============================================

CREATE OR REPLACE FUNCTION mark_reminder_paid(p_reminder_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE debt_collection
  SET
    status = 'payment_received',
    updated_at = NOW()
  WHERE id = p_reminder_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION mark_reminder_paid IS 'Marque une relance comme payée (paiement reçu)';

-- =============================================
-- VIEW: debt_collection_summary
-- =============================================

CREATE OR REPLACE VIEW debt_collection_summary AS
SELECT
  dc.id,
  dc.nursery_id,
  n.name AS nursery_name,
  dc.family_id,
  f.family_name,
  dc.invoice_id,
  i.invoice_number,
  i.due_date AS invoice_due_date,
  dc.reminder_type,
  dc.reminder_date,
  dc.days_overdue,
  dc.amount_due,
  dc.reminder_method,
  dc.reminder_sent,
  dc.reminder_sent_at,
  dc.status,
  dc.payment_plan_proposed,
  dc.payment_plan_accepted,
  COALESCE(creator.first_name || ' ' || creator.last_name, 'Système automatique') AS created_by,
  dc.created_at
FROM debt_collection dc
JOIN nursery n ON dc.nursery_id = n.id
JOIN family f ON dc.family_id = f.id
JOIN invoice i ON dc.invoice_id = i.id
LEFT JOIN profiles creator ON dc.created_by_id = creator.id;

COMMENT ON VIEW debt_collection_summary IS 'Vue résumé des relances avec informations complètes';

-- =============================================
-- End of Migration
-- =============================================

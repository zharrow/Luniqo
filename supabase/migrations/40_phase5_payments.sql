-- =============================================
-- Migration: Phase 5 - Payments (Paiements)
-- Description: Gestion des paiements et moyens de paiement
-- Author: Claude Code
-- Date: 2026-01-13
-- =============================================

-- =============================================
-- ENUMS
-- =============================================

-- Types de moyen de paiement
CREATE TYPE payment_method_type AS ENUM (
  'bank_transfer',   -- Virement bancaire
  'direct_debit',    -- Prélèvement automatique SEPA
  'check',           -- Chèque
  'cash',            -- Espèces
  'credit_card',     -- Carte bancaire
  'stripe',          -- Paiement en ligne Stripe
  'paypal',          -- PayPal
  'other'            -- Autre
);

-- Statuts de paiement
CREATE TYPE payment_status AS ENUM (
  'received',   -- Reçu (en attente de validation)
  'validated',  -- Validé et comptabilisé
  'rejected',   -- Rejeté (chèque sans provision, etc.)
  'refunded'    -- Remboursé
);

-- =============================================
-- TABLE: payment_method
-- =============================================

CREATE TABLE payment_method (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID NOT NULL REFERENCES family(id) ON DELETE CASCADE,

  -- Type
  method_type payment_method_type NOT NULL,

  -- Informations bancaires (pour virement/prélèvement)
  bank_name VARCHAR(255),
  iban VARCHAR(34),                                 -- IBAN normalisé (sans espaces)
  bic VARCHAR(11),                                  -- BIC/SWIFT
  account_holder_name VARCHAR(255),

  -- Mandat SEPA (pour prélèvement automatique)
  sepa_mandate_reference VARCHAR(50),              -- RUM (Référence Unique de Mandat)
  sepa_mandate_signed_date DATE,
  sepa_mandate_document_url TEXT,                  -- PDF mandat signé

  -- Statut
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,       -- Moyen de paiement par défaut

  -- Vérification
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  verified_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Notes
  notes TEXT,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Contraintes
  CONSTRAINT payment_method_iban_format CHECK (
    method_type NOT IN ('bank_transfer', 'direct_debit') OR
    (iban IS NOT NULL AND LENGTH(iban) BETWEEN 15 AND 34)
  ),
  CONSTRAINT payment_method_sepa_mandate CHECK (
    method_type != 'direct_debit' OR
    (sepa_mandate_reference IS NOT NULL AND sepa_mandate_signed_date IS NOT NULL)
  )
);

-- Commentaires
COMMENT ON TABLE payment_method IS 'Moyens de paiement des familles';
COMMENT ON COLUMN payment_method.method_type IS 'Type: bank_transfer, direct_debit, check, cash, credit_card, stripe, paypal, other';
COMMENT ON COLUMN payment_method.iban IS 'IBAN sans espaces (15-34 caractères)';
COMMENT ON COLUMN payment_method.sepa_mandate_reference IS 'RUM (Référence Unique de Mandat SEPA)';
COMMENT ON COLUMN payment_method.is_default IS 'Moyen de paiement par défaut pour la famille';

-- Index
CREATE INDEX idx_payment_method_family ON payment_method(family_id);
CREATE INDEX idx_payment_method_type ON payment_method(method_type);
CREATE INDEX idx_payment_method_active ON payment_method(is_active);
CREATE INDEX idx_payment_method_default ON payment_method(family_id, is_default) WHERE is_default = TRUE;

-- Index unique: une seule méthode par défaut par famille
CREATE UNIQUE INDEX idx_payment_method_unique_default
  ON payment_method(family_id)
  WHERE is_default = TRUE;

-- =============================================
-- TABLE: payment
-- =============================================

CREATE TABLE payment (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nursery_id UUID NOT NULL REFERENCES nursery(id) ON DELETE CASCADE,
  family_id UUID NOT NULL REFERENCES family(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES invoice(id) ON DELETE SET NULL,
  payment_method_id UUID REFERENCES payment_method(id) ON DELETE SET NULL,

  -- Numérotation
  payment_number VARCHAR(50) NOT NULL UNIQUE,      -- Format: {NURSERY}-PAY-{YYYYMM}{SEQ}

  -- Montant
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount DECIMAL(10,2) NOT NULL,                   -- Montant payé (positif = encaissement, négatif = remboursement)

  -- Références externes
  transaction_reference VARCHAR(255),              -- Référence banque / Stripe / PayPal
  check_number VARCHAR(50),                        -- Numéro de chèque (si applicable)
  bank_statement_reference VARCHAR(100),           -- Référence relevé bancaire

  -- Statut
  status payment_status NOT NULL DEFAULT 'received',

  -- Validation
  validated_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  validated_at TIMESTAMPTZ,
  rejection_reason TEXT,

  -- Notes
  notes TEXT,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recorded_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Contraintes
  CONSTRAINT payment_amount_not_zero CHECK (amount != 0)
);

-- Commentaires
COMMENT ON TABLE payment IS 'Enregistrement des paiements reçus des familles';
COMMENT ON COLUMN payment.payment_number IS 'Numéro unique (Format: NURSERY-PAY-YYYYMMSEQ)';
COMMENT ON COLUMN payment.amount IS 'Montant (positif = encaissement, négatif = remboursement)';
COMMENT ON COLUMN payment.transaction_reference IS 'Référence externe (banque, Stripe, PayPal)';
COMMENT ON COLUMN payment.status IS 'Statut: received, validated, rejected, refunded';

-- Index
CREATE INDEX idx_payment_nursery ON payment(nursery_id);
CREATE INDEX idx_payment_family ON payment(family_id);
CREATE INDEX idx_payment_invoice ON payment(invoice_id);
CREATE INDEX idx_payment_method ON payment(payment_method_id);
CREATE INDEX idx_payment_date ON payment(payment_date);
CREATE INDEX idx_payment_status ON payment(status);
CREATE INDEX idx_payment_number ON payment(payment_number);

-- =============================================
-- TRIGGER: Update payment_method.updated_at
-- =============================================

CREATE OR REPLACE FUNCTION update_payment_method_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payment_method_updated_at_trigger
  BEFORE UPDATE ON payment_method
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_method_updated_at();

-- =============================================
-- TRIGGER: Update payment.updated_at
-- =============================================

CREATE OR REPLACE FUNCTION update_payment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payment_updated_at_trigger
  BEFORE UPDATE ON payment
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_updated_at();

-- =============================================
-- TRIGGER: Ensure only one default payment method per family
-- =============================================

CREATE OR REPLACE FUNCTION ensure_one_default_payment_method()
RETURNS TRIGGER AS $$
BEGIN
  -- Si on définit cette méthode comme défaut
  IF NEW.is_default = TRUE THEN
    -- Désactiver toutes les autres méthodes par défaut de cette famille
    UPDATE payment_method
    SET is_default = FALSE
    WHERE family_id = NEW.family_id
      AND id != NEW.id
      AND is_default = TRUE;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payment_method_ensure_one_default_trigger
  BEFORE INSERT OR UPDATE ON payment_method
  FOR EACH ROW
  WHEN (NEW.is_default = TRUE)
  EXECUTE FUNCTION ensure_one_default_payment_method();

-- =============================================
-- TRIGGER: Update invoice paid_amount when payment is created/updated
-- =============================================

CREATE OR REPLACE FUNCTION update_invoice_on_payment()
RETURNS TRIGGER AS $$
DECLARE
  v_old_amount DECIMAL(10,2) := 0;
  v_new_amount DECIMAL(10,2) := 0;
BEGIN
  -- Déterminer les montants anciens et nouveaux
  IF TG_OP = 'INSERT' THEN
    v_new_amount = NEW.amount;
  ELSIF TG_OP = 'UPDATE' THEN
    v_old_amount = OLD.amount;
    v_new_amount = NEW.amount;
  ELSIF TG_OP = 'DELETE' THEN
    v_old_amount = OLD.amount;
  END IF;

  -- Mettre à jour la facture associée (si elle existe)
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') AND NEW.invoice_id IS NOT NULL THEN
    UPDATE invoice
    SET paid_amount = paid_amount - v_old_amount + v_new_amount
    WHERE id = NEW.invoice_id;
  ELSIF TG_OP = 'DELETE' AND OLD.invoice_id IS NOT NULL THEN
    UPDATE invoice
    SET paid_amount = paid_amount - v_old_amount
    WHERE id = OLD.invoice_id;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payment_update_invoice_trigger
  AFTER INSERT OR UPDATE OR DELETE ON payment
  FOR EACH ROW
  WHEN (
    (TG_OP = 'INSERT' AND NEW.invoice_id IS NOT NULL AND NEW.status = 'validated') OR
    (TG_OP = 'UPDATE' AND (NEW.invoice_id IS NOT NULL OR OLD.invoice_id IS NOT NULL) AND NEW.status = 'validated') OR
    (TG_OP = 'DELETE' AND OLD.invoice_id IS NOT NULL AND OLD.status = 'validated')
  )
  EXECUTE FUNCTION update_invoice_on_payment();

-- =============================================
-- FUNCTION: Generate payment number
-- =============================================

CREATE OR REPLACE FUNCTION generate_payment_number(
  p_nursery_id UUID,
  p_payment_date DATE DEFAULT CURRENT_DATE
)
RETURNS VARCHAR AS $$
DECLARE
  v_nursery_code VARCHAR(10);
  v_year_month VARCHAR(6);
  v_sequence INTEGER;
  v_payment_number VARCHAR(50);
BEGIN
  -- Récupérer le code de la crèche
  SELECT COALESCE(
    UPPER(SUBSTRING(name FROM 1 FOR 3)) || LPAD(SUBSTRING(id::TEXT FROM 1 FOR 3), 3, '0'),
    'NUR' || LPAD(SUBSTRING(id::TEXT FROM 1 FOR 3), 3, '0')
  )
  INTO v_nursery_code
  FROM nursery
  WHERE id = p_nursery_id;

  -- Format année-mois (YYYYMM)
  v_year_month = TO_CHAR(p_payment_date, 'YYYYMM');

  -- Trouver le prochain numéro de séquence
  SELECT COALESCE(MAX(
    CAST(
      SUBSTRING(payment_number FROM LENGTH(v_nursery_code || '-PAY-' || v_year_month) + 1)
      AS INTEGER
    )
  ), 0) + 1
  INTO v_sequence
  FROM payment
  WHERE nursery_id = p_nursery_id
    AND payment_number LIKE v_nursery_code || '-PAY-' || v_year_month || '%';

  -- Générer le numéro: {NURSERY}-PAY-{YYYYMM}{SEQ}
  v_payment_number = v_nursery_code || '-PAY-' || v_year_month || LPAD(v_sequence::TEXT, 2, '0');

  RETURN v_payment_number;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_payment_number IS 'Génère un numéro de paiement unique au format {NURSERY}-PAY-{YYYYMM}{SEQ}';

-- =============================================
-- FUNCTION: Validate IBAN
-- =============================================

CREATE OR REPLACE FUNCTION validate_iban(p_iban VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
  v_iban VARCHAR;
  v_country_code VARCHAR(2);
  v_check_digits VARCHAR(2);
BEGIN
  -- Supprimer les espaces et convertir en majuscules
  v_iban = UPPER(REPLACE(p_iban, ' ', ''));

  -- Vérifier la longueur (15-34 caractères)
  IF LENGTH(v_iban) < 15 OR LENGTH(v_iban) > 34 THEN
    RETURN FALSE;
  END IF;

  -- Extraire le code pays et les chiffres de contrôle
  v_country_code = SUBSTRING(v_iban FROM 1 FOR 2);
  v_check_digits = SUBSTRING(v_iban FROM 3 FOR 2);

  -- Vérifier que le code pays est composé de 2 lettres
  IF v_country_code !~ '^[A-Z]{2}$' THEN
    RETURN FALSE;
  END IF;

  -- Vérifier que les chiffres de contrôle sont numériques
  IF v_check_digits !~ '^[0-9]{2}$' THEN
    RETURN FALSE;
  END IF;

  -- Note: La validation complète du modulo 97 nécessiterait plus de logique
  -- Pour l'instant, on fait une validation basique du format
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION validate_iban IS 'Valide le format d''un IBAN (validation basique)';

-- =============================================
-- FUNCTION: Get family payment history
-- =============================================

CREATE OR REPLACE FUNCTION get_family_payment_history(
  p_family_id UUID,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE(
  payment_id UUID,
  payment_number VARCHAR,
  payment_date DATE,
  amount DECIMAL,
  method_type payment_method_type,
  invoice_number VARCHAR,
  status payment_status,
  recorded_by VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.payment_number,
    p.payment_date,
    p.amount,
    pm.method_type,
    i.invoice_number,
    p.status,
    COALESCE(pr.first_name || ' ' || pr.last_name, 'Système') AS recorded_by
  FROM payment p
  LEFT JOIN payment_method pm ON p.payment_method_id = pm.id
  LEFT JOIN invoice i ON p.invoice_id = i.id
  LEFT JOIN profiles pr ON p.recorded_by_id = pr.id
  WHERE p.family_id = p_family_id
  ORDER BY p.payment_date DESC, p.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_family_payment_history IS 'Retourne l''historique des paiements d''une famille';

-- =============================================
-- VIEW: payment_summary
-- =============================================

CREATE OR REPLACE VIEW payment_summary AS
SELECT
  p.id,
  p.payment_number,
  p.nursery_id,
  n.name AS nursery_name,
  p.family_id,
  f.family_name,
  p.invoice_id,
  i.invoice_number,
  p.payment_date,
  p.amount,
  pm.method_type,
  p.status,
  p.transaction_reference,
  p.validated_at,
  COALESCE(validator.first_name || ' ' || validator.last_name, NULL) AS validated_by,
  p.created_at
FROM payment p
JOIN nursery n ON p.nursery_id = n.id
JOIN family f ON p.family_id = f.id
LEFT JOIN invoice i ON p.invoice_id = i.id
LEFT JOIN payment_method pm ON p.payment_method_id = pm.id
LEFT JOIN profiles validator ON p.validated_by_id = validator.id;

COMMENT ON VIEW payment_summary IS 'Vue résumé des paiements avec informations complètes';

-- =============================================
-- End of Migration
-- =============================================

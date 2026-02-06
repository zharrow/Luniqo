-- =============================================
-- Phase 6: Portail Parents - Certificats Fiscaux & Documents CAF
-- Migration 51: Tables tax_certificate, caf_document
-- =============================================

-- =============================================
-- ENUMS
-- =============================================

-- Statut certificat fiscal
CREATE TYPE tax_certificate_status AS ENUM (
  'draft',
  'issued',
  'sent',
  'downloaded'
);

-- Type de document CAF
CREATE TYPE caf_document_type AS ENUM (
  'attendance_certificate',
  'payment_proof',
  'contract_copy',
  'tariff_justification',
  'monthly_statement'
);

-- Statut document CAF
CREATE TYPE caf_document_status AS ENUM (
  'generated',
  'sent_to_family',
  'sent_to_caf',
  'validated'
);

-- =============================================
-- TABLE: tax_certificate
-- =============================================

CREATE TABLE tax_certificate (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nursery_id UUID NOT NULL REFERENCES nursery(id) ON DELETE CASCADE,
  family_id UUID NOT NULL REFERENCES family(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES child(id) ON DELETE CASCADE,

  -- Année fiscale
  certificate_year INTEGER NOT NULL,

  -- Numéro unique certificat
  certificate_number VARCHAR(50) UNIQUE NOT NULL,

  -- Montants (en euros)
  total_paid_amount DECIMAL(10,2) NOT NULL,           -- Total payé par famille dans l'année
  caf_participation_amount DECIMAL(10,2) DEFAULT 0,   -- Part prise en charge par CAF
  deductible_amount DECIMAL(10,2) NOT NULL,           -- Montant déductible fiscalement

  -- Crédit d'impôt (50% des frais de garde, plafonné)
  tax_credit_amount DECIMAL(10,2),                    -- 50% du déductible (max 2300€/enfant en 2025)

  -- Période
  period_start DATE NOT NULL,                         -- 1er janvier
  period_end DATE NOT NULL,                           -- 31 décembre

  -- Document PDF
  certificate_pdf_url TEXT,                           -- URL PDF généré (Supabase Storage)

  -- Signature directeur/rice
  signed_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  signature_date DATE,
  director_signature_url TEXT,                        -- URL signature numérisée

  -- Statut
  status tax_certificate_status DEFAULT 'draft',

  -- Dates importantes
  issued_date DATE,
  sent_to_family_at TIMESTAMPTZ,

  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- Index pour performance
CREATE INDEX idx_tax_certificate_nursery ON tax_certificate(nursery_id);
CREATE INDEX idx_tax_certificate_family ON tax_certificate(family_id);
CREATE INDEX idx_tax_certificate_child ON tax_certificate(child_id);
CREATE INDEX idx_tax_certificate_year ON tax_certificate(certificate_year);
CREATE INDEX idx_tax_certificate_status ON tax_certificate(status);
CREATE INDEX idx_tax_certificate_number ON tax_certificate(certificate_number);
CREATE INDEX idx_tax_certificate_signed_by ON tax_certificate(signed_by_id);

-- =============================================
-- TABLE: caf_document
-- =============================================

CREATE TABLE caf_document (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nursery_id UUID NOT NULL REFERENCES nursery(id) ON DELETE CASCADE,
  family_id UUID NOT NULL REFERENCES family(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES child(id) ON DELETE CASCADE,

  -- Type de document CAF
  document_type caf_document_type NOT NULL,

  -- Mois concerné (format: premier jour du mois)
  month DATE NOT NULL,

  -- Document généré
  document_url TEXT NOT NULL,                         -- PDF généré (Supabase Storage)
  document_number VARCHAR(50) UNIQUE,

  -- Données structurées du document (JSONB)
  -- Exemple pour 'attendance_certificate':
  -- {
  --   "contracted_hours": 120,
  --   "actual_hours": 115,
  --   "absence_days": 2,
  --   "hourly_rate": 5.50,
  --   "total_amount": 632.50
  -- }
  document_data JSONB,

  -- Statut
  status caf_document_status DEFAULT 'generated',

  -- Dates
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  sent_to_family_at TIMESTAMPTZ,
  sent_to_caf_at TIMESTAMPTZ,
  validated_at TIMESTAMPTZ,

  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- Index pour performance
CREATE INDEX idx_caf_document_nursery ON caf_document(nursery_id);
CREATE INDEX idx_caf_document_family ON caf_document(family_id);
CREATE INDEX idx_caf_document_child ON caf_document(child_id);
CREATE INDEX idx_caf_document_type ON caf_document(document_type);
CREATE INDEX idx_caf_document_month ON caf_document(month);
CREATE INDEX idx_caf_document_status ON caf_document(status);
CREATE INDEX idx_caf_document_number ON caf_document(document_number);

-- Index GIN pour recherche dans JSONB
CREATE INDEX idx_caf_document_data ON caf_document USING gin(document_data);

-- =============================================
-- FONCTIONS
-- =============================================

-- Fonction : Générer numéro de certificat fiscal unique
CREATE OR REPLACE FUNCTION generate_tax_certificate_number(
  p_nursery_id UUID,
  p_year INTEGER
)
RETURNS VARCHAR(50) AS $$
DECLARE
  nursery_code VARCHAR(10);
  sequence_num INTEGER;
  certificate_num VARCHAR(50);
BEGIN
  -- Récupérer code crèche (ex: LUN001)
  SELECT COALESCE(code, 'NUR' || LPAD(nursery_id::TEXT, 3, '0'))
  INTO nursery_code
  FROM nursery
  WHERE id = p_nursery_id;

  -- Obtenir le prochain numéro de séquence pour cette année
  SELECT COALESCE(MAX(
    CASE
      WHEN certificate_number ~ (nursery_code || '-TAX-' || p_year::TEXT || '[0-9]+')
      THEN SUBSTRING(certificate_number FROM (LENGTH(nursery_code) + LENGTH('-TAX-') + LENGTH(p_year::TEXT) + 1))::INTEGER
      ELSE 0
    END
  ), 0) + 1
  INTO sequence_num
  FROM tax_certificate
  WHERE nursery_id = p_nursery_id AND certificate_year = p_year;

  -- Format: {NURSERY_CODE}-TAX-{YEAR}{SEQUENCE}
  -- Exemple: LUN001-TAX-202501
  certificate_num := nursery_code || '-TAX-' || p_year::TEXT || LPAD(sequence_num::TEXT, 2, '0');

  RETURN certificate_num;
END;
$$ LANGUAGE plpgsql;

-- Fonction : Générer numéro de document CAF unique
CREATE OR REPLACE FUNCTION generate_caf_document_number(
  p_nursery_id UUID,
  p_month DATE,
  p_document_type caf_document_type
)
RETURNS VARCHAR(50) AS $$
DECLARE
  nursery_code VARCHAR(10);
  year_month VARCHAR(6);
  type_code VARCHAR(5);
  sequence_num INTEGER;
  document_num VARCHAR(50);
BEGIN
  -- Récupérer code crèche
  SELECT COALESCE(code, 'NUR' || LPAD(nursery_id::TEXT, 3, '0'))
  INTO nursery_code
  FROM nursery
  WHERE id = p_nursery_id;

  -- Format année-mois: YYYYMM
  year_month := TO_CHAR(p_month, 'YYYYMM');

  -- Code type document
  type_code := CASE p_document_type
    WHEN 'attendance_certificate' THEN 'ATT'
    WHEN 'payment_proof' THEN 'PAY'
    WHEN 'contract_copy' THEN 'CON'
    WHEN 'tariff_justification' THEN 'TAR'
    WHEN 'monthly_statement' THEN 'STA'
    ELSE 'DOC'
  END;

  -- Obtenir le prochain numéro de séquence
  SELECT COALESCE(MAX(
    CASE
      WHEN document_number ~ (nursery_code || '-CAF-' || type_code || '-' || year_month || '[0-9]+')
      THEN SUBSTRING(document_number FROM (LENGTH(nursery_code || '-CAF-' || type_code || '-' || year_month) + 1))::INTEGER
      ELSE 0
    END
  ), 0) + 1
  INTO sequence_num
  FROM caf_document
  WHERE nursery_id = p_nursery_id
    AND DATE_TRUNC('month', month) = DATE_TRUNC('month', p_month)
    AND document_type = p_document_type;

  -- Format: {NURSERY_CODE}-CAF-{TYPE}-{YYYYMM}{SEQ}
  -- Exemple: LUN001-CAF-ATT-20250101
  document_num := nursery_code || '-CAF-' || type_code || '-' || year_month || LPAD(sequence_num::TEXT, 2, '0');

  RETURN document_num;
END;
$$ LANGUAGE plpgsql;

-- Fonction : Calculer crédit d'impôt (50% plafonné)
CREATE OR REPLACE FUNCTION calculate_tax_credit(
  deductible_amount DECIMAL(10,2),
  certificate_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER
)
RETURNS DECIMAL(10,2) AS $$
DECLARE
  tax_credit DECIMAL(10,2);
  ceiling DECIMAL(10,2);
BEGIN
  -- Plafond crédit d'impôt par enfant (mis à jour annuellement)
  -- 2025: 2300€/enfant (à ajuster selon réglementation)
  ceiling := 2300.00;

  -- Crédit = 50% du déductible, plafonné
  tax_credit := LEAST(deductible_amount * 0.50, ceiling);

  RETURN ROUND(tax_credit, 2);
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- TRIGGERS
-- =============================================

-- Trigger : Auto-générer numéro certificat fiscal
CREATE OR REPLACE FUNCTION auto_generate_tax_certificate_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.certificate_number IS NULL OR NEW.certificate_number = '' THEN
    NEW.certificate_number := generate_tax_certificate_number(NEW.nursery_id, NEW.certificate_year);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_tax_certificate_number
BEFORE INSERT ON tax_certificate
FOR EACH ROW
EXECUTE FUNCTION auto_generate_tax_certificate_number();

-- Trigger : Auto-générer numéro document CAF
CREATE OR REPLACE FUNCTION auto_generate_caf_document_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.document_number IS NULL OR NEW.document_number = '' THEN
    NEW.document_number := generate_caf_document_number(NEW.nursery_id, NEW.month, NEW.document_type);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_caf_document_number
BEFORE INSERT ON caf_document
FOR EACH ROW
EXECUTE FUNCTION auto_generate_caf_document_number();

-- Trigger : Auto-calculer crédit d'impôt
CREATE OR REPLACE FUNCTION auto_calculate_tax_credit()
RETURNS TRIGGER AS $$
BEGIN
  NEW.tax_credit_amount := calculate_tax_credit(NEW.deductible_amount, NEW.certificate_year);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_calculate_tax_credit
BEFORE INSERT OR UPDATE OF deductible_amount ON tax_certificate
FOR EACH ROW
EXECUTE FUNCTION auto_calculate_tax_credit();

-- Trigger : updated_at
CREATE TRIGGER update_tax_certificate_updated_at
BEFORE UPDATE ON tax_certificate
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- CONTRAINTES
-- =============================================

-- Contrainte : Année valide (entre 2020 et année en cours + 1)
ALTER TABLE tax_certificate ADD CONSTRAINT check_certificate_year_valid
CHECK (certificate_year >= 2020 AND certificate_year <= EXTRACT(YEAR FROM CURRENT_DATE) + 1);

-- Contrainte : Montants positifs
ALTER TABLE tax_certificate ADD CONSTRAINT check_amounts_positive
CHECK (
  total_paid_amount >= 0 AND
  caf_participation_amount >= 0 AND
  deductible_amount >= 0 AND
  (tax_credit_amount IS NULL OR tax_credit_amount >= 0)
);

-- Contrainte : Période cohérente (1er janvier au 31 décembre)
ALTER TABLE tax_certificate ADD CONSTRAINT check_period_valid
CHECK (period_start <= period_end);

-- Contrainte : Mois valide (premier jour du mois)
ALTER TABLE caf_document ADD CONSTRAINT check_month_first_day
CHECK (EXTRACT(DAY FROM month) = 1);

-- =============================================
-- COMMENTAIRES
-- =============================================

COMMENT ON TABLE tax_certificate IS 'Attestations fiscales annuelles pour déclaration impôts des parents';
COMMENT ON TABLE caf_document IS 'Documents mensuels pour la CAF (attestations présence, justificatifs paiement)';

COMMENT ON COLUMN tax_certificate.deductible_amount IS 'Montant déductible fiscalement = total_paid - caf_participation';
COMMENT ON COLUMN tax_certificate.tax_credit_amount IS 'Crédit d\'impôt = 50% du déductible (plafonné 2300€/enfant)';
COMMENT ON COLUMN tax_certificate.certificate_number IS 'Numéro unique format: {NURSERY_CODE}-TAX-{YEAR}{SEQ}';

COMMENT ON COLUMN caf_document.document_data IS 'Données structurées JSON (heures, tarifs, montants selon type)';
COMMENT ON COLUMN caf_document.month IS 'Mois concerné (toujours le 1er jour du mois)';
COMMENT ON COLUMN caf_document.document_number IS 'Numéro unique format: {NURSERY_CODE}-CAF-{TYPE}-{YYYYMM}{SEQ}';

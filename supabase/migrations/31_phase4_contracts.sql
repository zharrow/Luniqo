-- =====================================================
-- PHASE 4: INSCRIPTIONS & CONTRATS
-- Migration 31: Contracts, Schedules & Amendments
-- =====================================================
-- Created: 2025-12-29
-- Description: Contrats d'accueil, horaires contractuels et avenants

-- =====================================================
-- TABLE: contract (Contrats d'accueil)
-- =====================================================

CREATE TABLE contract (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nursery_id UUID NOT NULL REFERENCES nursery(id) ON DELETE CASCADE,
  family_id UUID NOT NULL REFERENCES family(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES child(id) ON DELETE CASCADE,

  contract_number VARCHAR(50) UNIQUE NOT NULL,  -- Numéro unique du contrat

  -- Type de contrat
  contract_type VARCHAR(50) NOT NULL,           -- 'regular', 'occasional', 'emergency', 'short_term'

  -- Période
  start_date DATE NOT NULL,
  end_date DATE,                                -- NULL = CDI, sinon CDD

  -- Horaires type (hebdomadaire)
  weekly_hours DECIMAL(5,2),                    -- Nombre d'heures/semaine prévues

  -- Tarification
  rate_type VARCHAR(50) NOT NULL,               -- 'psu', 'paje', 'private', 'company_sponsored'
  hourly_rate DECIMAL(6,2),                     -- Tarif horaire
  monthly_rate DECIMAL(8,2),                    -- Forfait mensuel (si applicable)

  -- Facturation
  billing_frequency VARCHAR(20) DEFAULT 'monthly',  -- 'monthly', 'quarterly', 'annual'
  billing_day_of_month INTEGER DEFAULT 1,

  -- Signatures
  signed_by_guardian_id UUID REFERENCES guardian(id) ON DELETE SET NULL,
  guardian_signature_date DATE,
  guardian_signature_url TEXT,

  signed_by_director_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  director_signature_date DATE,
  director_signature_url TEXT,

  -- Document contrat
  contract_document_url TEXT,                   -- PDF contrat signé (Supabase Storage)

  -- Statut
  status VARCHAR(20) DEFAULT 'draft',           -- 'draft', 'pending_signature', 'active', 'suspended', 'terminated'

  -- Résiliation
  termination_date DATE,
  termination_reason VARCHAR(50),               -- 'end_of_term', 'family_request', 'nursery_request', 'child_age_limit', 'breach'
  termination_notice_date DATE,                 -- Date préavis

  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- =====================================================
-- TABLE: contract_schedule (Horaires contractuels)
-- =====================================================

CREATE TABLE contract_schedule (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id UUID NOT NULL REFERENCES contract(id) ON DELETE CASCADE,

  day_of_week INTEGER NOT NULL,                 -- 0 = Dimanche, 1 = Lundi, ..., 6 = Samedi
  CHECK (day_of_week >= 0 AND day_of_week <= 6),

  is_present BOOLEAN DEFAULT TRUE,              -- Enfant présent ce jour ?

  arrival_time TIME,
  departure_time TIME,

  daily_hours DECIMAL(4,2),                     -- Heures prévues ce jour

  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLE: contract_amendment (Avenants au contrat)
-- =====================================================

CREATE TABLE contract_amendment (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id UUID NOT NULL REFERENCES contract(id) ON DELETE CASCADE,

  amendment_number INTEGER NOT NULL,            -- Numéro avenant (1, 2, 3...)
  amendment_type VARCHAR(50) NOT NULL,          -- Type de modification
  -- Types: 'schedule_change', 'rate_change', 'hours_change', 'suspension', 'reactivation'

  effective_date DATE NOT NULL,                 -- Date d'effet

  -- Modifications
  changes_description TEXT NOT NULL,            -- Description des changements

  -- Nouveaux horaires (si changement planning)
  new_weekly_hours DECIMAL(5,2),
  new_schedule JSONB,                           -- Nouvel emploi du temps (JSON)

  -- Nouveau tarif (si changement tarif)
  new_hourly_rate DECIMAL(6,2),
  new_monthly_rate DECIMAL(8,2),

  -- Signatures
  signed_by_guardian_id UUID REFERENCES guardian(id) ON DELETE SET NULL,
  guardian_signature_date DATE,
  guardian_signature_url TEXT,

  signed_by_director_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  director_signature_date DATE,
  director_signature_url TEXT,

  -- Document avenant
  amendment_document_url TEXT,                  -- PDF avenant signé

  status VARCHAR(20) DEFAULT 'draft',           -- 'draft', 'pending_signature', 'active', 'cancelled'

  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Contract indexes
CREATE INDEX idx_contract_nursery ON contract(nursery_id);
CREATE INDEX idx_contract_family ON contract(family_id);
CREATE INDEX idx_contract_child ON contract(child_id);
CREATE INDEX idx_contract_status ON contract(status);
CREATE INDEX idx_contract_dates ON contract(start_date, end_date);
CREATE INDEX idx_contract_number ON contract(contract_number);
CREATE INDEX idx_contract_type ON contract(contract_type);
CREATE INDEX idx_contract_rate_type ON contract(rate_type);

-- Contract schedule indexes
CREATE INDEX idx_contract_schedule_contract ON contract_schedule(contract_id);
CREATE INDEX idx_contract_schedule_day ON contract_schedule(day_of_week);

-- Contract amendment indexes
CREATE INDEX idx_contract_amendment_contract ON contract_amendment(contract_id);
CREATE INDEX idx_contract_amendment_effective_date ON contract_amendment(effective_date);
CREATE INDEX idx_contract_amendment_status ON contract_amendment(status);

-- Unique: One schedule entry per day per contract
CREATE UNIQUE INDEX idx_contract_schedule_unique_day ON contract_schedule(contract_id, day_of_week);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function: Generate unique contract number
CREATE OR REPLACE FUNCTION generate_contract_number(p_nursery_id UUID, p_year INTEGER DEFAULT NULL)
RETURNS VARCHAR(50)
LANGUAGE plpgsql
AS $$
DECLARE
  v_year INTEGER;
  v_count INTEGER;
  v_contract_number VARCHAR(50);
  v_nursery_code VARCHAR(10);
BEGIN
  -- Default to current year
  v_year := COALESCE(p_year, EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER);

  -- Get nursery code (first 3 letters of nursery name, uppercase)
  SELECT UPPER(LEFT(name, 3))
  INTO v_nursery_code
  FROM nursery
  WHERE id = p_nursery_id;

  -- Count contracts for this nursery this year
  SELECT COUNT(*) + 1
  INTO v_count
  FROM contract
  WHERE nursery_id = p_nursery_id
    AND EXTRACT(YEAR FROM created_at) = v_year;

  -- Format: NUR-2025-0001
  v_contract_number := v_nursery_code || '-' || v_year || '-' || LPAD(v_count::TEXT, 4, '0');

  RETURN v_contract_number;
END;
$$;

-- Function: Calculate total weekly hours from schedule
CREATE OR REPLACE FUNCTION calculate_weekly_hours_from_schedule(p_contract_id UUID)
RETURNS DECIMAL(5,2)
LANGUAGE plpgsql
AS $$
DECLARE
  v_total_hours DECIMAL(5,2);
BEGIN
  SELECT COALESCE(SUM(daily_hours), 0)
  INTO v_total_hours
  FROM contract_schedule
  WHERE contract_id = p_contract_id
    AND is_present = TRUE;

  RETURN v_total_hours;
END;
$$;

-- Function: Calculate daily hours from time range
CREATE OR REPLACE FUNCTION calculate_daily_hours(p_arrival_time TIME, p_departure_time TIME)
RETURNS DECIMAL(4,2)
LANGUAGE plpgsql
AS $$
DECLARE
  v_hours DECIMAL(4,2);
BEGIN
  IF p_arrival_time IS NULL OR p_departure_time IS NULL THEN
    RETURN 0;
  END IF;

  -- Calculate hours difference
  v_hours := EXTRACT(EPOCH FROM (p_departure_time - p_arrival_time)) / 3600;

  RETURN ROUND(v_hours, 2);
END;
$$;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger: updated_at pour contract
CREATE TRIGGER update_contract_updated_at
  BEFORE UPDATE ON contract
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Trigger: updated_at pour contract_schedule
CREATE TRIGGER update_contract_schedule_updated_at
  BEFORE UPDATE ON contract_schedule
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Trigger: updated_at pour contract_amendment
CREATE TRIGGER update_contract_amendment_updated_at
  BEFORE UPDATE ON contract_amendment
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Trigger: Auto-calculate daily_hours when times change
CREATE OR REPLACE FUNCTION trigger_calculate_daily_hours()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.arrival_time IS NOT NULL AND NEW.departure_time IS NOT NULL AND NEW.is_present = TRUE THEN
    NEW.daily_hours := calculate_daily_hours(NEW.arrival_time, NEW.departure_time);
  ELSE
    NEW.daily_hours := 0;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER calculate_daily_hours_on_schedule
  BEFORE INSERT OR UPDATE ON contract_schedule
  FOR EACH ROW
  EXECUTE FUNCTION trigger_calculate_daily_hours();

-- Trigger: Auto-update contract weekly_hours when schedule changes
CREATE OR REPLACE FUNCTION trigger_update_contract_weekly_hours()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE contract
  SET weekly_hours = calculate_weekly_hours_from_schedule(COALESCE(NEW.contract_id, OLD.contract_id)),
      updated_at = NOW()
  WHERE id = COALESCE(NEW.contract_id, OLD.contract_id);

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER update_contract_weekly_hours_on_schedule_change
  AFTER INSERT OR UPDATE OR DELETE ON contract_schedule
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_contract_weekly_hours();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE contract IS 'Contrats d''accueil signés avec les familles';
COMMENT ON TABLE contract_schedule IS 'Horaires hebdomadaires contractuels (un enregistrement par jour de semaine)';
COMMENT ON TABLE contract_amendment IS 'Avenants aux contrats (modifications en cours)';

COMMENT ON COLUMN contract.contract_type IS 'regular (régulier), occasional (occasionnel), emergency (urgence), short_term (court terme)';
COMMENT ON COLUMN contract.rate_type IS 'psu (Prestation de Service Unique), paje (PAJE), private (privé), company_sponsored (financé entreprise)';
COMMENT ON COLUMN contract.status IS 'draft (brouillon), pending_signature (en attente signature), active (actif), suspended (suspendu), terminated (résilié)';
COMMENT ON COLUMN contract.termination_reason IS 'end_of_term, family_request, nursery_request, child_age_limit, breach (rupture)';

COMMENT ON COLUMN contract_schedule.day_of_week IS '0 = Dimanche, 1 = Lundi, 2 = Mardi, 3 = Mercredi, 4 = Jeudi, 5 = Vendredi, 6 = Samedi';
COMMENT ON COLUMN contract_schedule.daily_hours IS 'Heures quotidiennes (calculées automatiquement depuis arrival_time et departure_time)';

COMMENT ON COLUMN contract_amendment.amendment_type IS 'schedule_change, rate_change, hours_change, suspension, reactivation';

COMMENT ON FUNCTION generate_contract_number IS 'Génère un numéro de contrat unique au format NUR-2025-0001';
COMMENT ON FUNCTION calculate_weekly_hours_from_schedule IS 'Calcule le total d''heures hebdomadaires à partir des horaires contractuels';
COMMENT ON FUNCTION calculate_daily_hours IS 'Calcule les heures quotidiennes à partir d''une plage horaire';

-- =====================================================
-- PHASE 4: INSCRIPTIONS & CONTRATS
-- Migration 32: Rate Grids & Income Brackets
-- =====================================================
-- Created: 2025-12-29
-- Description: Grilles tarifaires et tranches de revenus (PSU, PAJE, privé)

-- =====================================================
-- TABLE: rate_grid (Grilles tarifaires)
-- =====================================================

CREATE TABLE rate_grid (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nursery_id UUID NOT NULL REFERENCES nursery(id) ON DELETE CASCADE,

  grid_name VARCHAR(255) NOT NULL,              -- Nom de la grille (ex: "PSU 2025", "Tarif Privé")
  grid_type VARCHAR(50) NOT NULL,               -- 'psu', 'paje', 'private', 'company'

  -- Validité
  valid_from DATE NOT NULL,
  valid_until DATE,                             -- NULL = grille active indéfiniment

  -- Paramètres PSU (si applicable)
  psu_base_rate DECIMAL(6,2),                   -- Taux horaire de base PSU (fixé par CAF)
  psu_caf_participation_rate DECIMAL(5,4),      -- % pris en charge par CAF (ex: 0.5000 = 50%)

  -- Paramètres PAJE
  paje_hourly_ceiling DECIMAL(6,2),             -- Plafond horaire PAJE

  is_active BOOLEAN DEFAULT TRUE,
  is_default BOOLEAN DEFAULT FALSE,             -- Grille par défaut

  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- =====================================================
-- TABLE: rate_income_bracket (Tranches de revenus)
-- =====================================================

CREATE TABLE rate_income_bracket (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rate_grid_id UUID NOT NULL REFERENCES rate_grid(id) ON DELETE CASCADE,

  bracket_name VARCHAR(100),                    -- Nom de la tranche (ex: "Tranche A", "Revenus faibles")

  -- Tranches de revenus annuels (en euros)
  income_min DECIMAL(10,2) NOT NULL,            -- Revenu minimum (€)
  income_max DECIMAL(10,2),                     -- Revenu maximum (€), NULL = illimité

  -- Tarif appliqué
  hourly_rate DECIMAL(6,2) NOT NULL,            -- Tarif horaire pour cette tranche

  -- Coefficient PSU (si applicable)
  psu_coefficient DECIMAL(6,4),                 -- Coefficient multiplicateur PSU

  display_order INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Rate grid indexes
CREATE INDEX idx_rate_grid_nursery ON rate_grid(nursery_id);
CREATE INDEX idx_rate_grid_type ON rate_grid(grid_type);
CREATE INDEX idx_rate_grid_dates ON rate_grid(valid_from, valid_until);
CREATE INDEX idx_rate_grid_active ON rate_grid(is_active);
CREATE INDEX idx_rate_grid_default ON rate_grid(is_default) WHERE is_default = TRUE;

-- Rate income bracket indexes
CREATE INDEX idx_rate_income_bracket_grid ON rate_income_bracket(rate_grid_id);
CREATE INDEX idx_rate_income_bracket_income ON rate_income_bracket(income_min, income_max);
CREATE INDEX idx_rate_income_bracket_order ON rate_income_bracket(display_order);

-- Unique: Only one default grid per nursery and type
CREATE UNIQUE INDEX idx_rate_grid_unique_default ON rate_grid(nursery_id, grid_type, is_default)
  WHERE is_default = TRUE;

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function: Find rate for a given income
CREATE OR REPLACE FUNCTION find_rate_for_income(
  p_rate_grid_id UUID,
  p_annual_income DECIMAL(10,2)
)
RETURNS DECIMAL(6,2)
LANGUAGE plpgsql
AS $$
DECLARE
  v_hourly_rate DECIMAL(6,2);
BEGIN
  SELECT hourly_rate
  INTO v_hourly_rate
  FROM rate_income_bracket
  WHERE rate_grid_id = p_rate_grid_id
    AND p_annual_income >= income_min
    AND (income_max IS NULL OR p_annual_income <= income_max)
  ORDER BY income_min DESC
  LIMIT 1;

  IF v_hourly_rate IS NULL THEN
    RAISE EXCEPTION 'No matching income bracket found for income: %', p_annual_income;
  END IF;

  RETURN v_hourly_rate;
END;
$$;

-- Function: Get active rate grid for nursery by type
CREATE OR REPLACE FUNCTION get_active_rate_grid(
  p_nursery_id UUID,
  p_grid_type VARCHAR(50),
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_rate_grid_id UUID;
BEGIN
  -- Try to find default active grid
  SELECT id
  INTO v_rate_grid_id
  FROM rate_grid
  WHERE nursery_id = p_nursery_id
    AND grid_type = p_grid_type
    AND is_active = TRUE
    AND is_default = TRUE
    AND valid_from <= p_date
    AND (valid_until IS NULL OR valid_until >= p_date)
  LIMIT 1;

  -- If no default, find any active grid
  IF v_rate_grid_id IS NULL THEN
    SELECT id
    INTO v_rate_grid_id
    FROM rate_grid
    WHERE nursery_id = p_nursery_id
      AND grid_type = p_grid_type
      AND is_active = TRUE
      AND valid_from <= p_date
      AND (valid_until IS NULL OR valid_until >= p_date)
    ORDER BY valid_from DESC
    LIMIT 1;
  END IF;

  IF v_rate_grid_id IS NULL THEN
    RAISE EXCEPTION 'No active rate grid found for nursery % and type %', p_nursery_id, p_grid_type;
  END IF;

  RETURN v_rate_grid_id;
END;
$$;

-- Function: Calculate PSU rate with CAF participation
CREATE OR REPLACE FUNCTION calculate_psu_rate_with_caf(
  p_base_rate DECIMAL(6,2),
  p_caf_participation_rate DECIMAL(5,4),
  p_coefficient DECIMAL(6,4) DEFAULT 1.0
)
RETURNS TABLE (
  total_rate DECIMAL(6,2),
  caf_portion DECIMAL(6,2),
  family_portion DECIMAL(6,2)
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_total DECIMAL(6,2);
  v_caf DECIMAL(6,2);
  v_family DECIMAL(6,2);
BEGIN
  -- Total rate = base rate * coefficient
  v_total := ROUND(p_base_rate * p_coefficient, 2);

  -- CAF portion
  v_caf := ROUND(v_total * p_caf_participation_rate, 2);

  -- Family portion
  v_family := v_total - v_caf;

  RETURN QUERY SELECT v_total, v_caf, v_family;
END;
$$;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger: updated_at pour rate_grid
CREATE TRIGGER update_rate_grid_updated_at
  BEFORE UPDATE ON rate_grid
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Trigger: updated_at pour rate_income_bracket
CREATE TRIGGER update_rate_income_bracket_updated_at
  BEFORE UPDATE ON rate_income_bracket
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Trigger: Prevent overlapping income brackets
CREATE OR REPLACE FUNCTION prevent_overlapping_income_brackets()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_overlap_count INTEGER;
BEGIN
  -- Check for overlapping brackets in the same grid
  SELECT COUNT(*)
  INTO v_overlap_count
  FROM rate_income_bracket
  WHERE rate_grid_id = NEW.rate_grid_id
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID)
    AND (
      -- New bracket starts within existing bracket
      (NEW.income_min >= income_min AND (income_max IS NULL OR NEW.income_min <= income_max))
      OR
      -- New bracket ends within existing bracket
      (NEW.income_max IS NOT NULL AND NEW.income_max >= income_min AND (income_max IS NULL OR NEW.income_max <= income_max))
      OR
      -- New bracket completely contains existing bracket
      (NEW.income_min <= income_min AND (NEW.income_max IS NULL OR (income_max IS NOT NULL AND NEW.income_max >= income_max)))
    );

  IF v_overlap_count > 0 THEN
    RAISE EXCEPTION 'Income bracket overlaps with existing bracket in the same rate grid';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER check_income_bracket_overlap
  BEFORE INSERT OR UPDATE ON rate_income_bracket
  FOR EACH ROW
  EXECUTE FUNCTION prevent_overlapping_income_brackets();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE rate_grid IS 'Grilles tarifaires (PSU, PAJE, privé, entreprise)';
COMMENT ON TABLE rate_income_bracket IS 'Tranches de revenus avec tarifs associés';

COMMENT ON COLUMN rate_grid.grid_type IS 'psu (Prestation de Service Unique), paje (PAJE), private (privé), company (entreprise)';
COMMENT ON COLUMN rate_grid.psu_base_rate IS 'Taux horaire de base PSU fixé par la CAF';
COMMENT ON COLUMN rate_grid.psu_caf_participation_rate IS 'Pourcentage pris en charge par la CAF (0.50 = 50%)';
COMMENT ON COLUMN rate_grid.paje_hourly_ceiling IS 'Plafond horaire PAJE (montant maximum remboursable)';

COMMENT ON COLUMN rate_income_bracket.income_min IS 'Revenu annuel minimum de la tranche (en euros)';
COMMENT ON COLUMN rate_income_bracket.income_max IS 'Revenu annuel maximum de la tranche (NULL = illimité)';
COMMENT ON COLUMN rate_income_bracket.psu_coefficient IS 'Coefficient multiplicateur PSU appliqué au taux de base';

COMMENT ON FUNCTION find_rate_for_income IS 'Trouve le tarif horaire applicable pour un revenu donné dans une grille';
COMMENT ON FUNCTION get_active_rate_grid IS 'Récupère la grille tarifaire active pour une crèche et un type donnés';
COMMENT ON FUNCTION calculate_psu_rate_with_caf IS 'Calcule le tarif PSU avec répartition CAF/Famille';

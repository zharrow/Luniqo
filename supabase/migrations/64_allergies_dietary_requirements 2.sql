-- Migration 64: Allergies and Dietary Requirements as structured tables
-- This replaces free-text fields with proper reference tables and M2M relationships
-- for better data consistency and meal distribution tracking

-- ============================================================================
-- ALLERGY TABLE (Predefined allergens following EU regulation)
-- ============================================================================
CREATE TABLE IF NOT EXISTS allergy (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  icon VARCHAR(50), -- Emoji or icon name for UI
  severity VARCHAR(20) DEFAULT 'moderate', -- mild, moderate, severe
  is_common BOOLEAN DEFAULT TRUE, -- Show in quick selection
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert common allergens (14 major allergens per EU regulation 1169/2011)
INSERT INTO allergy (name, description, icon, severity, is_common, display_order) VALUES
  ('Gluten', 'Blé, seigle, orge, avoine, épeautre, kamut', '🌾', 'severe', TRUE, 1),
  ('Crustacés', 'Crevettes, crabes, homards, langoustines', '🦐', 'severe', TRUE, 2),
  ('Œufs', 'Œufs et produits à base d''œufs', '🥚', 'moderate', TRUE, 3),
  ('Poissons', 'Tous types de poissons', '🐟', 'severe', TRUE, 4),
  ('Arachides', 'Cacahuètes et produits dérivés', '🥜', 'severe', TRUE, 5),
  ('Soja', 'Fèves de soja et produits dérivés', '🫘', 'moderate', TRUE, 6),
  ('Lait', 'Lait et produits laitiers (lactose)', '🥛', 'moderate', TRUE, 7),
  ('Fruits à coque', 'Amandes, noisettes, noix, noix de cajou, etc.', '🌰', 'severe', TRUE, 8),
  ('Céleri', 'Céleri et produits à base de céleri', '🥬', 'moderate', TRUE, 9),
  ('Moutarde', 'Graines de moutarde et produits dérivés', '🟡', 'moderate', TRUE, 10),
  ('Sésame', 'Graines de sésame et produits dérivés', '⚪', 'moderate', TRUE, 11),
  ('Sulfites', 'Anhydride sulfureux et sulfites (> 10mg/kg)', '🧪', 'mild', TRUE, 12),
  ('Lupin', 'Graines de lupin et produits dérivés', '🌸', 'moderate', FALSE, 13),
  ('Mollusques', 'Moules, huîtres, escargots, calmars', '🐚', 'severe', FALSE, 14)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- DIETARY_REQUIREMENT TABLE (Common dietary restrictions)
-- ============================================================================
CREATE TABLE IF NOT EXISTS dietary_requirement (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  icon VARCHAR(50),
  category VARCHAR(50), -- religious, health, ethical, preference
  is_common BOOLEAN DEFAULT TRUE,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert common dietary requirements
INSERT INTO dietary_requirement (name, description, icon, category, is_common, display_order) VALUES
  ('Végétarien', 'Pas de viande ni poisson', '🥗', 'ethical', TRUE, 1),
  ('Végétalien', 'Aucun produit d''origine animale', '🌱', 'ethical', TRUE, 2),
  ('Sans porc', 'Pas de porc ni dérivés', '🚫🐷', 'religious', TRUE, 3),
  ('Halal', 'Alimentation conforme aux règles islamiques', '☪️', 'religious', TRUE, 4),
  ('Casher', 'Alimentation conforme aux règles juives', '✡️', 'religious', TRUE, 5),
  ('Sans gluten', 'Éviction totale du gluten (maladie cœliaque)', '🌾❌', 'health', TRUE, 6),
  ('Sans lactose', 'Éviction du lactose (intolérance)', '🥛❌', 'health', TRUE, 7),
  ('Texture modifiée', 'Alimentation mixée ou hachée', '🥣', 'health', FALSE, 8),
  ('Pauvre en sel', 'Régime hyposodé', '🧂❌', 'health', FALSE, 9),
  ('Sans sucre ajouté', 'Pas de sucres ajoutés', '🍬❌', 'health', FALSE, 10)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- CHILD_ALLERGY M2M TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS child_allergy (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL REFERENCES child(id) ON DELETE CASCADE,
  allergy_id UUID NOT NULL REFERENCES allergy(id) ON DELETE CASCADE,
  severity VARCHAR(20), -- Override default severity if needed
  notes TEXT, -- Specific notes for this child's allergy
  confirmed_by_doctor BOOLEAN DEFAULT FALSE,
  diagnosis_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(child_id, allergy_id)
);

-- Index for quick lookup
CREATE INDEX IF NOT EXISTS idx_child_allergy_child_id ON child_allergy(child_id);
CREATE INDEX IF NOT EXISTS idx_child_allergy_allergy_id ON child_allergy(allergy_id);

-- ============================================================================
-- CHILD_DIETARY_REQUIREMENT M2M TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS child_dietary_requirement (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL REFERENCES child(id) ON DELETE CASCADE,
  dietary_requirement_id UUID NOT NULL REFERENCES dietary_requirement(id) ON DELETE CASCADE,
  notes TEXT, -- Specific notes
  start_date DATE, -- When this requirement started
  end_date DATE, -- NULL if permanent, date if temporary
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(child_id, dietary_requirement_id)
);

-- Index for quick lookup
CREATE INDEX IF NOT EXISTS idx_child_dietary_child_id ON child_dietary_requirement(child_id);
CREATE INDEX IF NOT EXISTS idx_child_dietary_req_id ON child_dietary_requirement(dietary_requirement_id);

-- ============================================================================
-- MEAL_ALLERGEN M2M TABLE (allergens present in a meal)
-- ============================================================================
CREATE TABLE IF NOT EXISTS meal_allergen (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meal_id UUID NOT NULL REFERENCES meal(id) ON DELETE CASCADE,
  allergy_id UUID NOT NULL REFERENCES allergy(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(meal_id, allergy_id)
);

CREATE INDEX IF NOT EXISTS idx_meal_allergen_meal_id ON meal_allergen(meal_id);
CREATE INDEX IF NOT EXISTS idx_meal_allergen_allergy_id ON meal_allergen(allergy_id);

-- ============================================================================
-- DISABLE RLS FOR DEVELOPMENT
-- ============================================================================
ALTER TABLE allergy DISABLE ROW LEVEL SECURITY;
ALTER TABLE dietary_requirement DISABLE ROW LEVEL SECURITY;
ALTER TABLE child_allergy DISABLE ROW LEVEL SECURITY;
ALTER TABLE child_dietary_requirement DISABLE ROW LEVEL SECURITY;
ALTER TABLE meal_allergen DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- HELPFUL VIEWS (Optional - can be skipped if causing issues)
-- ============================================================================

-- Note: These views are optional convenience views.
-- The application uses direct queries instead.
-- Uncomment below if you want to use them.

/*
-- View: Children with their allergies (aggregated)
CREATE OR REPLACE VIEW child_allergies_view AS
SELECT
  c.id AS child_id,
  c.first_name,
  c.last_name,
  c.nursery_id,
  COALESCE(
    json_agg(
      json_build_object(
        'id', a.id,
        'name', a.name,
        'icon', a.icon,
        'severity', COALESCE(ca.severity, a.severity)
      )
    ) FILTER (WHERE a.id IS NOT NULL),
    '[]'::json
  ) AS allergies
FROM child c
LEFT JOIN child_allergy ca ON c.id = ca.child_id
LEFT JOIN allergy a ON ca.allergy_id = a.id
GROUP BY c.id, c.first_name, c.last_name, c.nursery_id;

-- View: Children with their dietary requirements (aggregated)
CREATE OR REPLACE VIEW child_dietary_view AS
SELECT
  c.id AS child_id,
  c.first_name,
  c.last_name,
  c.nursery_id,
  COALESCE(
    json_agg(
      json_build_object(
        'id', dr.id,
        'name', dr.name,
        'icon', dr.icon,
        'category', dr.category
      )
    ) FILTER (WHERE dr.id IS NOT NULL),
    '[]'::json
  ) AS dietary_requirements
FROM child c
LEFT JOIN child_dietary_requirement cdr ON c.id = cdr.child_id
  AND (cdr.end_date IS NULL OR cdr.end_date > CURRENT_DATE)
LEFT JOIN dietary_requirement dr ON cdr.dietary_requirement_id = dr.id
GROUP BY c.id, c.first_name, c.last_name, c.nursery_id;
*/

-- ============================================================================
-- COMMENT
-- ============================================================================
COMMENT ON TABLE allergy IS 'Predefined allergens based on EU regulation 1169/2011';
COMMENT ON TABLE dietary_requirement IS 'Predefined dietary restrictions (religious, health, ethical)';
COMMENT ON TABLE child_allergy IS 'M2M: Links children to their allergies';
COMMENT ON TABLE child_dietary_requirement IS 'M2M: Links children to their dietary requirements';
COMMENT ON TABLE meal_allergen IS 'M2M: Links meals to allergens present in them';

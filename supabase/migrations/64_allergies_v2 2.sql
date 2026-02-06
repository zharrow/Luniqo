-- Migration 64 v2: Allergies and Dietary Requirements
-- Version qui supprime et recrée les tables si elles existent avec un mauvais schéma

-- ============================================================================
-- STEP 1: DROP EXISTING TABLES IF THEY HAVE WRONG SCHEMA
-- ============================================================================
DROP TABLE IF EXISTS child_allergy CASCADE;
DROP TABLE IF EXISTS child_dietary_requirement CASCADE;
DROP TABLE IF EXISTS meal_allergen CASCADE;
DROP TABLE IF EXISTS allergy CASCADE;
DROP TABLE IF EXISTS dietary_requirement CASCADE;

-- ============================================================================
-- STEP 2: CREATE ALLERGY TABLE
-- ============================================================================
CREATE TABLE allergy (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  icon VARCHAR(50),
  severity VARCHAR(20) DEFAULT 'moderate',
  is_common BOOLEAN DEFAULT TRUE,
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
  ('Mollusques', 'Moules, huîtres, escargots, calmars', '🐚', 'severe', FALSE, 14);

-- ============================================================================
-- STEP 3: CREATE DIETARY_REQUIREMENT TABLE
-- ============================================================================
CREATE TABLE dietary_requirement (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  icon VARCHAR(50),
  category VARCHAR(50),
  is_common BOOLEAN DEFAULT TRUE,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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
  ('Sans sucre ajouté', 'Pas de sucres ajoutés', '🍬❌', 'health', FALSE, 10);

-- ============================================================================
-- STEP 4: CREATE CHILD_ALLERGY M2M TABLE
-- ============================================================================
CREATE TABLE child_allergy (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL REFERENCES child(id) ON DELETE CASCADE,
  allergy_id UUID NOT NULL REFERENCES allergy(id) ON DELETE CASCADE,
  severity VARCHAR(20),
  notes TEXT,
  confirmed_by_doctor BOOLEAN DEFAULT FALSE,
  diagnosis_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(child_id, allergy_id)
);

CREATE INDEX idx_child_allergy_child_id ON child_allergy(child_id);
CREATE INDEX idx_child_allergy_allergy_id ON child_allergy(allergy_id);

-- ============================================================================
-- STEP 5: CREATE CHILD_DIETARY_REQUIREMENT M2M TABLE
-- ============================================================================
CREATE TABLE child_dietary_requirement (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL REFERENCES child(id) ON DELETE CASCADE,
  dietary_requirement_id UUID NOT NULL REFERENCES dietary_requirement(id) ON DELETE CASCADE,
  notes TEXT,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(child_id, dietary_requirement_id)
);

CREATE INDEX idx_child_dietary_child_id ON child_dietary_requirement(child_id);
CREATE INDEX idx_child_dietary_req_id ON child_dietary_requirement(dietary_requirement_id);

-- ============================================================================
-- STEP 6: DISABLE RLS FOR DEVELOPMENT
-- ============================================================================
ALTER TABLE allergy DISABLE ROW LEVEL SECURITY;
ALTER TABLE dietary_requirement DISABLE ROW LEVEL SECURITY;
ALTER TABLE child_allergy DISABLE ROW LEVEL SECURITY;
ALTER TABLE child_dietary_requirement DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Check that allergy_id column exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'child_allergy' AND column_name = 'allergy_id'
  ) THEN
    RAISE EXCEPTION 'child_allergy.allergy_id column was not created!';
  END IF;

  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE 'Tables created: allergy, dietary_requirement, child_allergy, child_dietary_requirement';
END $$;

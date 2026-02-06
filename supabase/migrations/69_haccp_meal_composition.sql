-- Migration 69: HACCP Meal Composition System
-- Links meals to products/batches for complete traceability
-- Links temperatures to batches for reception control

-- ============================================================================
-- STEP 1: MEAL ITEMS (Composition d'un repas)
-- ============================================================================
CREATE TABLE IF NOT EXISTS meal_item (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meal_id UUID NOT NULL REFERENCES meal(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES product(id) ON DELETE RESTRICT,
  batch_id UUID REFERENCES batch(id) ON DELETE SET NULL,
  quantity DECIMAL(10,2),
  unit VARCHAR(20), -- kg, g, L, pièce, portion
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(meal_id, product_id, batch_id)
);

CREATE INDEX idx_meal_item_meal_id ON meal_item(meal_id);
CREATE INDEX idx_meal_item_product_id ON meal_item(product_id);
CREATE INDEX idx_meal_item_batch_id ON meal_item(batch_id);

-- ============================================================================
-- STEP 2: PRODUCT ALLERGENS (Allergènes structurés par produit)
-- ============================================================================
CREATE TABLE IF NOT EXISTS product_allergen (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES product(id) ON DELETE CASCADE,
  allergy_id UUID NOT NULL REFERENCES allergy(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, allergy_id)
);

CREATE INDEX idx_product_allergen_product_id ON product_allergen(product_id);
CREATE INDEX idx_product_allergen_allergy_id ON product_allergen(allergy_id);

-- ============================================================================
-- STEP 3: ADD BATCH_ID TO TEMPERATURE_CHECK (Lien température → lot)
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'temperature_check' AND column_name = 'batch_id'
  ) THEN
    ALTER TABLE temperature_check ADD COLUMN batch_id UUID REFERENCES batch(id) ON DELETE SET NULL;
    CREATE INDEX idx_temperature_check_batch_id ON temperature_check(batch_id);
  END IF;
END $$;

-- ============================================================================
-- STEP 4: MENU TEMPLATES (Menus types réutilisables)
-- ============================================================================
CREATE TABLE IF NOT EXISTS menu_template (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nursery_id UUID NOT NULL REFERENCES nursery(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  meal_type VARCHAR(20) NOT NULL, -- Breakfast, Lunch, Snack
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_menu_template_nursery_id ON menu_template(nursery_id);

-- ============================================================================
-- STEP 5: MENU TEMPLATE ITEMS (Composition d'un menu type)
-- ============================================================================
CREATE TABLE IF NOT EXISTS menu_template_item (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID NOT NULL REFERENCES menu_template(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES product(id) ON DELETE RESTRICT,
  quantity DECIMAL(10,2),
  unit VARCHAR(20),
  notes TEXT,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(template_id, product_id)
);

CREATE INDEX idx_menu_template_item_template_id ON menu_template_item(template_id);

-- ============================================================================
-- STEP 6: COMPUTED ALLERGENS VIEW (Pour afficher les allergènes d'un repas)
-- ============================================================================
CREATE OR REPLACE VIEW meal_computed_allergens AS
SELECT
  m.id AS meal_id,
  m.nursery_id,
  m.date,
  m.type AS meal_type,
  COALESCE(
    STRING_AGG(DISTINCT a.name, ', ' ORDER BY a.name),
    ''
  ) AS computed_allergens,
  ARRAY_AGG(DISTINCT a.id) FILTER (WHERE a.id IS NOT NULL) AS allergen_ids
FROM meal m
LEFT JOIN meal_item mi ON mi.meal_id = m.id
LEFT JOIN product p ON p.id = mi.product_id
LEFT JOIN product_allergen pa ON pa.product_id = p.id
LEFT JOIN allergy a ON a.id = pa.allergy_id
GROUP BY m.id, m.nursery_id, m.date, m.type;

-- ============================================================================
-- STEP 7: FUNCTION TO GET MEAL ALLERGENS
-- ============================================================================
CREATE OR REPLACE FUNCTION get_meal_allergens(p_meal_id UUID)
RETURNS TABLE (
  allergy_id UUID,
  allergy_name VARCHAR,
  allergy_icon VARCHAR,
  severity VARCHAR,
  from_product_id UUID,
  from_product_name VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    a.id AS allergy_id,
    a.name AS allergy_name,
    a.icon AS allergy_icon,
    a.severity,
    p.id AS from_product_id,
    p.name AS from_product_name
  FROM meal_item mi
  JOIN product p ON p.id = mi.product_id
  JOIN product_allergen pa ON pa.product_id = p.id
  JOIN allergy a ON a.id = pa.allergy_id
  WHERE mi.meal_id = p_meal_id
  ORDER BY a.name;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 8: FUNCTION TO CHECK CHILD ALLERGY CONFLICTS
-- ============================================================================
CREATE OR REPLACE FUNCTION check_meal_child_allergy_conflicts(
  p_meal_id UUID,
  p_child_id UUID
)
RETURNS TABLE (
  has_conflict BOOLEAN,
  conflicting_allergens TEXT[],
  conflicting_products TEXT[]
) AS $$
DECLARE
  v_conflicts RECORD;
BEGIN
  SELECT
    COUNT(*) > 0 AS has_conflict,
    ARRAY_AGG(DISTINCT a.name) AS allergens,
    ARRAY_AGG(DISTINCT p.name) AS products
  INTO v_conflicts
  FROM meal_item mi
  JOIN product p ON p.id = mi.product_id
  JOIN product_allergen pa ON pa.product_id = p.id
  JOIN allergy a ON a.id = pa.allergy_id
  JOIN child_allergy ca ON ca.allergy_id = a.id AND ca.child_id = p_child_id
  WHERE mi.meal_id = p_meal_id;

  RETURN QUERY SELECT
    v_conflicts.has_conflict,
    v_conflicts.allergens,
    v_conflicts.products;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 9: DISABLE RLS FOR DEVELOPMENT
-- ============================================================================
ALTER TABLE meal_item DISABLE ROW LEVEL SECURITY;
ALTER TABLE product_allergen DISABLE ROW LEVEL SECURITY;
ALTER TABLE menu_template DISABLE ROW LEVEL SECURITY;
ALTER TABLE menu_template_item DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'meal_item') THEN
    RAISE EXCEPTION 'meal_item table was not created!';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'product_allergen') THEN
    RAISE EXCEPTION 'product_allergen table was not created!';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'temperature_check' AND column_name = 'batch_id') THEN
    RAISE EXCEPTION 'temperature_check.batch_id column was not created!';
  END IF;

  RAISE NOTICE '✅ Migration 69 completed successfully!';
  RAISE NOTICE 'Tables created: meal_item, product_allergen, menu_template, menu_template_item';
  RAISE NOTICE 'Columns added: temperature_check.batch_id';
  RAISE NOTICE 'Views created: meal_computed_allergens';
  RAISE NOTICE 'Functions created: get_meal_allergens, check_meal_child_allergy_conflicts';
END $$;

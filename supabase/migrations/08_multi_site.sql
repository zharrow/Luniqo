-- =====================================================
-- Migration 08: Architecture Multi-Site
-- =====================================================
-- Description: Transform single-site (1 Owner = 1 Enterprise)
--              to multi-site (1 Owner = 1 Enterprise = N Nurseries)
-- Date: 2025-12-22
-- =====================================================

-- ========================================
-- STEP 1: Create nursery table
-- ========================================
CREATE TABLE nursery (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  enterprise_id UUID NOT NULL REFERENCES enterprise(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  city VARCHAR(100),
  postal_code VARCHAR(10),
  phone VARCHAR(20),
  email VARCHAR(150),
  capacity INTEGER, -- Maximum number of children
  is_default BOOLEAN DEFAULT FALSE, -- First nursery created
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraint: Only one default nursery per enterprise
  CONSTRAINT unique_default_per_enterprise UNIQUE (enterprise_id, is_default)
    DEFERRABLE INITIALLY DEFERRED
);

-- Index for performance
CREATE INDEX idx_nursery_enterprise_id ON nursery(enterprise_id);
CREATE INDEX idx_nursery_is_active ON nursery(is_active);
CREATE INDEX idx_nursery_is_default ON nursery(is_default) WHERE is_default = TRUE;

COMMENT ON TABLE nursery IS 'Physical childcare establishments (crèches) - multiple nurseries per enterprise';
COMMENT ON COLUMN nursery.is_default IS 'First nursery created for an enterprise (used for data migration)';
COMMENT ON COLUMN nursery.capacity IS 'Maximum number of children that can be enrolled';

-- ========================================
-- STEP 2: Create employee_nursery_access table
-- ========================================
CREATE TABLE employee_nursery_access (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  nursery_id UUID NOT NULL REFERENCES nursery(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint: one employee can't be assigned to same nursery twice
  UNIQUE(employee_id, nursery_id)
);

CREATE INDEX idx_employee_nursery_access_employee ON employee_nursery_access(employee_id);
CREATE INDEX idx_employee_nursery_access_nursery ON employee_nursery_access(nursery_id);

COMMENT ON TABLE employee_nursery_access IS 'Many-to-many relationship: employees can work at multiple nurseries';

-- ========================================
-- STEP 3: Add primary_nursery_id to profiles
-- ========================================
ALTER TABLE profiles ADD COLUMN primary_nursery_id UUID REFERENCES nursery(id) ON DELETE SET NULL;

CREATE INDEX idx_profiles_primary_nursery ON profiles(primary_nursery_id);

COMMENT ON COLUMN profiles.primary_nursery_id IS 'Primary nursery for employees (their default location)';

-- ========================================
-- STEP 4: Add nursery_id to operational tables (NULLABLE for migration)
-- ========================================

-- Cleaning module
ALTER TABLE room ADD COLUMN nursery_id UUID REFERENCES nursery(id) ON DELETE CASCADE;
ALTER TABLE daily_cleaning_session ADD COLUMN nursery_id UUID REFERENCES nursery(id) ON DELETE CASCADE;

-- HACCP module
ALTER TABLE child ADD COLUMN nursery_id UUID REFERENCES nursery(id) ON DELETE CASCADE;
ALTER TABLE meal ADD COLUMN nursery_id UUID REFERENCES nursery(id) ON DELETE CASCADE;
ALTER TABLE temperature_check ADD COLUMN nursery_id UUID REFERENCES nursery(id) ON DELETE CASCADE;
ALTER TABLE equipment ADD COLUMN nursery_id UUID REFERENCES nursery(id) ON DELETE CASCADE;
ALTER TABLE food_area_cleaning ADD COLUMN nursery_id UUID REFERENCES nursery(id) ON DELETE CASCADE;
ALTER TABLE haccp_incident ADD COLUMN nursery_id UUID REFERENCES nursery(id) ON DELETE CASCADE;
ALTER TABLE document ADD COLUMN nursery_id UUID REFERENCES nursery(id) ON DELETE CASCADE;
ALTER TABLE supplier ADD COLUMN nursery_id UUID REFERENCES nursery(id) ON DELETE CASCADE;
ALTER TABLE product ADD COLUMN nursery_id UUID REFERENCES nursery(id) ON DELETE CASCADE;
ALTER TABLE batch ADD COLUMN nursery_id UUID REFERENCES nursery(id) ON DELETE CASCADE;

COMMENT ON COLUMN room.nursery_id IS 'Rooms belong to a specific nursery';
COMMENT ON COLUMN child.nursery_id IS 'Children are enrolled at a specific nursery';
COMMENT ON COLUMN meal.nursery_id IS 'Meals are prepared at a specific nursery';

-- ========================================
-- STEP 5: Create default nursery for each existing enterprise
-- ========================================

-- Only create default nursery for enterprises that have data
INSERT INTO nursery (enterprise_id, name, is_default, is_active)
SELECT DISTINCT
  e.id,
  e.name || ' - Site Principal',
  TRUE,
  TRUE
FROM enterprise e
WHERE EXISTS (
  -- Check if enterprise has any operational data
  SELECT 1 FROM room WHERE enterprise_id = e.id
  UNION ALL
  SELECT 1 FROM child WHERE enterprise_id = e.id
  UNION ALL
  SELECT 1 FROM daily_cleaning_session WHERE enterprise_id = e.id
);

-- ========================================
-- STEP 6: Migrate all operational data to default nursery
-- ========================================

-- Cleaning module
UPDATE room r
SET nursery_id = n.id
FROM nursery n
WHERE n.enterprise_id = r.enterprise_id
  AND n.is_default = TRUE;

UPDATE daily_cleaning_session dcs
SET nursery_id = n.id
FROM nursery n
WHERE n.enterprise_id = dcs.enterprise_id
  AND n.is_default = TRUE;

-- HACCP module
UPDATE child c
SET nursery_id = n.id
FROM nursery n
WHERE n.enterprise_id = c.enterprise_id
  AND n.is_default = TRUE;

UPDATE meal m
SET nursery_id = n.id
FROM nursery n
WHERE n.enterprise_id = m.enterprise_id
  AND n.is_default = TRUE;

UPDATE temperature_check tc
SET nursery_id = n.id
FROM nursery n
WHERE n.enterprise_id = tc.enterprise_id
  AND n.is_default = TRUE;

UPDATE equipment eq
SET nursery_id = n.id
FROM nursery n
WHERE n.enterprise_id = eq.enterprise_id
  AND n.is_default = TRUE;

UPDATE food_area_cleaning fac
SET nursery_id = n.id
FROM nursery n
WHERE n.enterprise_id = fac.enterprise_id
  AND n.is_default = TRUE;

UPDATE haccp_incident hi
SET nursery_id = n.id
FROM nursery n
WHERE n.enterprise_id = hi.enterprise_id
  AND n.is_default = TRUE;

UPDATE document d
SET nursery_id = n.id
FROM nursery n
WHERE n.enterprise_id = d.enterprise_id
  AND n.is_default = TRUE;

UPDATE supplier s
SET nursery_id = n.id
FROM nursery n
WHERE n.enterprise_id = s.enterprise_id
  AND n.is_default = TRUE;

UPDATE product p
SET nursery_id = n.id
FROM nursery n
WHERE n.enterprise_id = p.enterprise_id
  AND n.is_default = TRUE;

UPDATE batch b
SET nursery_id = n.id
FROM nursery n
WHERE n.enterprise_id = b.enterprise_id
  AND n.is_default = TRUE;

-- ========================================
-- STEP 7: Make nursery_id NOT NULL
-- ========================================

ALTER TABLE room ALTER COLUMN nursery_id SET NOT NULL;
ALTER TABLE daily_cleaning_session ALTER COLUMN nursery_id SET NOT NULL;
ALTER TABLE child ALTER COLUMN nursery_id SET NOT NULL;
ALTER TABLE meal ALTER COLUMN nursery_id SET NOT NULL;
ALTER TABLE temperature_check ALTER COLUMN nursery_id SET NOT NULL;
ALTER TABLE equipment ALTER COLUMN nursery_id SET NOT NULL;
ALTER TABLE food_area_cleaning ALTER COLUMN nursery_id SET NOT NULL;
ALTER TABLE haccp_incident ALTER COLUMN nursery_id SET NOT NULL;
ALTER TABLE document ALTER COLUMN nursery_id SET NOT NULL;
ALTER TABLE supplier ALTER COLUMN nursery_id SET NOT NULL;
ALTER TABLE product ALTER COLUMN nursery_id SET NOT NULL;
ALTER TABLE batch ALTER COLUMN nursery_id SET NOT NULL;

-- ========================================
-- STEP 8: Create indexes on nursery_id foreign keys
-- ========================================

CREATE INDEX idx_room_nursery ON room(nursery_id);
CREATE INDEX idx_daily_cleaning_session_nursery ON daily_cleaning_session(nursery_id);
CREATE INDEX idx_child_nursery ON child(nursery_id);
CREATE INDEX idx_meal_nursery ON meal(nursery_id);
CREATE INDEX idx_temperature_check_nursery ON temperature_check(nursery_id);
CREATE INDEX idx_equipment_nursery ON equipment(nursery_id);
CREATE INDEX idx_food_area_cleaning_nursery ON food_area_cleaning(nursery_id);
CREATE INDEX idx_haccp_incident_nursery ON haccp_incident(nursery_id);
CREATE INDEX idx_document_nursery ON document(nursery_id);
CREATE INDEX idx_supplier_nursery ON supplier(nursery_id);
CREATE INDEX idx_product_nursery ON product(nursery_id);
CREATE INDEX idx_batch_nursery ON batch(nursery_id);

-- ========================================
-- STEP 9: Drop enterprise_id from operational tables
-- ========================================
-- Note: We drop enterprise_id since nursery already references enterprise
-- This ensures data is filtered by nursery (not enterprise) for better isolation

ALTER TABLE room DROP COLUMN enterprise_id;
ALTER TABLE daily_cleaning_session DROP COLUMN enterprise_id;
ALTER TABLE child DROP COLUMN enterprise_id;
ALTER TABLE meal DROP COLUMN enterprise_id;
ALTER TABLE temperature_check DROP COLUMN enterprise_id;
ALTER TABLE equipment DROP COLUMN enterprise_id;
ALTER TABLE food_area_cleaning DROP COLUMN enterprise_id;
ALTER TABLE haccp_incident DROP COLUMN enterprise_id;
ALTER TABLE document DROP COLUMN enterprise_id;
ALTER TABLE supplier DROP COLUMN enterprise_id;
ALTER TABLE product DROP COLUMN enterprise_id;
ALTER TABLE batch DROP COLUMN enterprise_id;

-- ========================================
-- STEP 10: Keep enterprise_id on shared resources (task templates, categories)
-- ========================================
-- Note: task_template and task_category remain at enterprise level
-- These are shared across all nurseries of the same enterprise

-- No changes needed for:
-- - task_template (already has enterprise_id)
-- - task_category (already has enterprise_id)

COMMENT ON COLUMN task_template.enterprise_id IS 'Task templates are shared across all nurseries of an enterprise';
COMMENT ON COLUMN task_category.enterprise_id IS 'Task categories are shared across all nurseries of an enterprise';

-- ========================================
-- STEP 11: Migrate employees to default nursery
-- ========================================
-- Assign all existing employees to the default nursery of their enterprise

INSERT INTO employee_nursery_access (employee_id, nursery_id)
SELECT
  p.id as employee_id,
  n.id as nursery_id
FROM profiles p
INNER JOIN nursery n ON n.enterprise_id = p.enterprise_id
WHERE p.role = 'Employee'
  AND p.is_active = TRUE
  AND n.is_default = TRUE;

-- Set primary nursery for employees
UPDATE profiles p
SET primary_nursery_id = n.id
FROM nursery n
WHERE p.role = 'Employee'
  AND p.enterprise_id = n.enterprise_id
  AND n.is_default = TRUE;

-- ========================================
-- SUMMARY
-- ========================================
-- ✅ Created nursery table (physical establishments)
-- ✅ Created employee_nursery_access (multi-site employee assignment)
-- ✅ Added primary_nursery_id to profiles
-- ✅ Migrated all operational data to default nurseries
-- ✅ Dropped enterprise_id from operational tables (now use nursery_id)
-- ✅ Kept enterprise_id on shared resources (task_template, task_category)
-- ✅ Created indexes for performance
-- ✅ Assigned employees to their enterprise's default nursery

-- NEXT STEPS (Frontend):
-- 1. Create NurseryContext for nursery selection
-- 2. Create NurserySelector component (dropdown in header)
-- 3. Update all services to use nurseryId instead of enterpriseId
-- 4. Update EnterpriseSetupForm to create first nursery
-- 5. Create /owner/nurseries page for nursery management
-- 6. Update all Owner pages to use selectedNursery from context

-- Migration 72: Child Meal Item Record
-- Tracks which specific food items each child ate during a meal
-- Provides granular HACCP traceability at the child-product level

CREATE TABLE IF NOT EXISTS child_meal_item_record (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_meal_record_id UUID NOT NULL REFERENCES child_meal_record(id) ON DELETE CASCADE,
  meal_item_id UUID NOT NULL REFERENCES meal_item(id) ON DELETE CASCADE,
  eaten BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(child_meal_record_id, meal_item_id)
);

CREATE INDEX idx_cmir_child_meal_record ON child_meal_item_record(child_meal_record_id);
CREATE INDEX idx_cmir_meal_item ON child_meal_item_record(meal_item_id);

ALTER TABLE child_meal_item_record DISABLE ROW LEVEL SECURITY;

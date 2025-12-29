-- =====================================================
-- PHASE 4: INSCRIPTIONS & CONTRATS
-- Migration 33: Additional Performance Indexes
-- =====================================================
-- Created: 2025-12-29
-- Description: Index supplémentaires pour optimiser les requêtes fréquentes

-- =====================================================
-- COMPOSITE INDEXES (Performance optimization)
-- =====================================================

-- Application: Recherche par statut + nursery + date
CREATE INDEX idx_application_nursery_status_date ON application(nursery_id, status, application_date DESC);

-- Application: Recherche par date souhaitée + statut
CREATE INDEX idx_application_start_date_status ON application(desired_start_date, status)
  WHERE status IN ('received', 'under_review', 'waiting_list');

-- Waiting list: Active entries sorted by position
CREATE INDEX idx_waiting_list_active_position ON waiting_list(nursery_id, position)
  WHERE status = 'active';

-- Waiting list: Pending responses
CREATE INDEX idx_waiting_list_pending_response ON waiting_list(nursery_id, notified_at)
  WHERE notified_of_spot_available = TRUE AND family_response IS NULL;

-- Admission: Active admissions by start date
CREATE INDEX idx_admission_active_start ON admission(nursery_id, start_date)
  WHERE status IN ('pending', 'active');

-- Contract: Active contracts by family
CREATE INDEX idx_contract_family_active ON contract(family_id, status)
  WHERE status = 'active';

-- Contract: Expiring contracts (end_date approaching)
CREATE INDEX idx_contract_expiring ON contract(nursery_id, end_date)
  WHERE end_date IS NOT NULL AND status = 'active';

-- Contract amendment: Active amendments by contract
CREATE INDEX idx_contract_amendment_contract_active ON contract_amendment(contract_id, effective_date DESC)
  WHERE status IN ('pending_signature', 'active');

-- =====================================================
-- COVERING INDEXES (Avoid table lookups)
-- =====================================================

-- Application list with key fields
CREATE INDEX idx_application_list_covering ON application(
  nursery_id, status, application_date DESC
)
INCLUDE (child_first_name, child_last_name, parent1_email, desired_start_date);

-- Waiting list with application details
CREATE INDEX idx_waiting_list_covering ON waiting_list(
  nursery_id, position
)
INCLUDE (application_id, total_priority_score, added_to_list_date, status);

-- Contract list with key fields
CREATE INDEX idx_contract_list_covering ON contract(
  nursery_id, status, created_at DESC
)
INCLUDE (contract_number, child_id, family_id, contract_type, start_date, end_date);

-- =====================================================
-- PARTIAL INDEXES (Filter specific conditions)
-- =====================================================

-- Only draft contracts (for editing)
CREATE INDEX idx_contract_draft ON contract(nursery_id, created_at DESC)
  WHERE status = 'draft';

-- Only pending signature contracts
CREATE INDEX idx_contract_pending_signature ON contract(nursery_id, created_at DESC)
  WHERE status = 'pending_signature';

-- Only verified priorities
CREATE INDEX idx_application_priority_verified ON application_priority(application_id)
  WHERE verified = TRUE;

-- Active rate grids only
CREATE INDEX idx_rate_grid_active_valid ON rate_grid(nursery_id, grid_type, valid_from DESC)
  WHERE is_active = TRUE;

-- =====================================================
-- STATISTICS UPDATE
-- =====================================================

-- Manually update statistics for better query planning
ANALYZE application;
ANALYZE application_priority;
ANALYZE waiting_list;
ANALYZE admission;
ANALYZE contract;
ANALYZE contract_schedule;
ANALYZE contract_amendment;
ANALYZE rate_grid;
ANALYZE rate_income_bracket;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON INDEX idx_application_nursery_status_date IS 'Optimize queries filtering applications by nursery, status, and date';
COMMENT ON INDEX idx_waiting_list_active_position IS 'Optimize waiting list queries for active entries sorted by position';
COMMENT ON INDEX idx_contract_family_active IS 'Optimize queries fetching active contracts for a family';
COMMENT ON INDEX idx_contract_expiring IS 'Quickly find contracts approaching end date';

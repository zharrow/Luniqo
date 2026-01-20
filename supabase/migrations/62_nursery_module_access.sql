-- =====================================================================================
-- MIGRATION 62: NURSERY MODULE ACCESS
-- =====================================================================================
-- Description: Granularité des modules par crèche (pas par entreprise)
-- Chaque crèche peut avoir ses propres abonnements aux modules
-- Date: 2026-01-20
-- =====================================================================================

-- =====================================================================================
-- 1. AJOUTER LES MODULES MANQUANTS
-- =====================================================================================

-- Module Phase 7: Statistiques & Analyses
INSERT INTO module (id, name, description, category, price_monthly, icon_name, is_free, is_active, display_order)
VALUES (
  'analytics',
  'Statistiques & Analyses',
  'Tableaux de bord analytiques avec KPIs, graphiques interactifs, rapports personnalisés et insights automatiques',
  'analytics',
  49.00,
  'ChartBarIcon',
  false,
  true,
  9
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_monthly = EXCLUDED.price_monthly,
  display_order = EXCLUDED.display_order;

-- =====================================================================================
-- 2. TABLE: nursery_module_access
-- =====================================================================================
-- Permissions d'accès aux modules PAR CRÈCHE (granularité fine)
CREATE TABLE IF NOT EXISTS nursery_module_access (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nursery_id UUID NOT NULL REFERENCES nursery(id) ON DELETE CASCADE,
    module_id VARCHAR(50) NOT NULL REFERENCES module(id) ON DELETE CASCADE,
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    granted_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(nursery_id, module_id)
);

-- =====================================================================================
-- 3. TABLE: nursery_module_access_request
-- =====================================================================================
-- Demandes d'accès aux modules par crèche
CREATE TABLE IF NOT EXISTS nursery_module_access_request (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nursery_id UUID NOT NULL REFERENCES nursery(id) ON DELETE CASCADE,
    module_id VARCHAR(50) NOT NULL REFERENCES module(id) ON DELETE CASCADE,
    requested_by_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    message TEXT,
    reviewed_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================================
-- 4. INDEXES
-- =====================================================================================
CREATE INDEX IF NOT EXISTS idx_nursery_module_access_nursery ON nursery_module_access(nursery_id);
CREATE INDEX IF NOT EXISTS idx_nursery_module_access_module ON nursery_module_access(module_id);
CREATE INDEX IF NOT EXISTS idx_nursery_module_access_active ON nursery_module_access(nursery_id, is_active) WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_nursery_module_request_nursery ON nursery_module_access_request(nursery_id);
CREATE INDEX IF NOT EXISTS idx_nursery_module_request_status ON nursery_module_access_request(status);
CREATE INDEX IF NOT EXISTS idx_nursery_module_request_pending ON nursery_module_access_request(status) WHERE status = 'pending';

-- =====================================================================================
-- 5. TRIGGERS
-- =====================================================================================
-- Trigger pour updated_at
CREATE TRIGGER update_nursery_module_access_updated_at
    BEFORE UPDATE ON nursery_module_access
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_nursery_module_request_updated_at
    BEFORE UPDATE ON nursery_module_access_request
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================================================
-- 6. MIGRATION DES DONNÉES EXISTANTES
-- =====================================================================================
-- Migrer les accès entreprise vers toutes leurs crèches
INSERT INTO nursery_module_access (nursery_id, module_id, granted_at, granted_by_id, expires_at, is_active)
SELECT
    n.id as nursery_id,
    ema.module_id,
    ema.granted_at,
    ema.granted_by_id,
    ema.expires_at,
    ema.is_active
FROM enterprise_module_access ema
JOIN nursery n ON n.enterprise_id = ema.enterprise_id
ON CONFLICT (nursery_id, module_id) DO NOTHING;

-- Accorder le module 'base' gratuit à toutes les crèches existantes
INSERT INTO nursery_module_access (nursery_id, module_id, is_active)
SELECT id, 'base', true
FROM nursery
WHERE is_active = TRUE
ON CONFLICT (nursery_id, module_id) DO NOTHING;

-- =====================================================================================
-- 7. COMMENTAIRES
-- =====================================================================================
COMMENT ON TABLE nursery_module_access IS 'Permissions d''accès aux modules par crèche - chaque crèche a ses propres abonnements';
COMMENT ON TABLE nursery_module_access_request IS 'Demandes d''accès aux modules par crèche';
COMMENT ON COLUMN nursery_module_access.expires_at IS 'Date d''expiration optionnelle pour les abonnements temporaires';
COMMENT ON COLUMN nursery_module_access.notes IS 'Notes internes sur l''abonnement (promo, accord spécial, etc.)';

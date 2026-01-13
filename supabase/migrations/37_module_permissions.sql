-- ================================================
-- MIGRATION 10: MODULE PERMISSIONS SYSTEM
-- ================================================
-- Description: Système de permissions modulaire pour contrôler l'accès aux fonctionnalités
-- Date: 2026-01-05
-- Author: Claude Code

-- ================================================
-- TABLE: module
-- ================================================
-- Catalogue des modules disponibles dans l'application
CREATE TABLE module (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50),
    price_monthly DECIMAL(10, 2) NOT NULL,
    icon_name VARCHAR(50),
    is_free BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    display_order INT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- TABLE: enterprise_module_access
-- ================================================
-- Table de liaison M2M entre enterprises et modules (permissions)
CREATE TABLE enterprise_module_access (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enterprise_id UUID NOT NULL REFERENCES enterprise(id) ON DELETE CASCADE,
    module_id VARCHAR(50) NOT NULL REFERENCES module(id) ON DELETE CASCADE,
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    granted_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(enterprise_id, module_id)
);

-- ================================================
-- TABLE: module_access_request
-- ================================================
-- Demandes d'accès aux modules par les Owners
CREATE TABLE module_access_request (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enterprise_id UUID NOT NULL REFERENCES enterprise(id) ON DELETE CASCADE,
    module_id VARCHAR(50) NOT NULL REFERENCES module(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected'
    message TEXT,
    reviewed_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- INDEXES
-- ================================================
CREATE INDEX idx_enterprise_module_access_enterprise ON enterprise_module_access(enterprise_id);
CREATE INDEX idx_enterprise_module_access_module ON enterprise_module_access(module_id);
CREATE INDEX idx_module_access_request_enterprise ON module_access_request(enterprise_id);
CREATE INDEX idx_module_access_request_status ON module_access_request(status);

-- ================================================
-- TRIGGERS
-- ================================================
-- Trigger pour updated_at sur module
CREATE TRIGGER update_module_updated_at
    BEFORE UPDATE ON module
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour updated_at sur module_access_request
CREATE TRIGGER update_module_access_request_updated_at
    BEFORE UPDATE ON module_access_request
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- SEED DATA: Les 9 modules
-- ================================================

-- Module gratuit (toujours actif)
INSERT INTO module (id, name, description, category, price_monthly, icon_name, is_free, is_active, display_order) VALUES
('base', 'Configuration de Base', 'Gestion des crèches, profil, utilisateurs et configuration initiale de votre établissement', 'main', 0.00, 'Cog6ToothIcon', true, true, 0);

-- Modules payants (features existantes)
INSERT INTO module (id, name, description, category, price_monthly, icon_name, is_free, is_active, display_order) VALUES
('cleaning', 'Nettoyage', 'Gestion complète des pièces, tâches de nettoyage, sessions quotidiennes et historique détaillé', 'operations', 29.00, 'SparklesIcon', false, true, 1),
('haccp', 'HACCP Traçabilité', 'Suivi HACCP complet : enfants, repas, températures, produits, équipements et conformité alimentaire', 'operations', 39.00, 'BeakerIcon', false, true, 2),
('children', 'Enfants & Familles', 'Gestion des dossiers enfants, familles, contacts, sections et informations administratives', 'main', 29.00, 'UserGroupIcon', false, true, 3),
('attendance', 'Présences & Activités', 'Suivi des présences quotidiennes, activités, observations et rapports pour les parents', 'daily_activities', 39.00, 'CalendarDaysIcon', false, true, 4),
('staff', 'Personnel & Planning RH', 'Gestion du personnel, qualifications, planning, absences et conformité réglementaire (ratios)', 'staff_planning', 49.00, 'BriefcaseIcon', false, true, 5),
('enrollment', 'Inscriptions & Contrats', 'Candidatures, liste d''attente, admissions, contrats d''accueil et grilles tarifaires (PSU, PAJE)', 'enrollment', 39.00, 'ClipboardDocumentCheckIcon', false, true, 6);

-- Modules futurs (Phase 5-6)
INSERT INTO module (id, name, description, category, price_monthly, icon_name, is_free, is_active, display_order) VALUES
('billing', 'Facturation & Finances', 'Facturation automatique, suivi des paiements, relances et exports comptables', 'billing', 59.00, 'CurrencyEuroIcon', false, true, 7),
('parent_portal', 'Portail Parents', 'Application mobile pour parents avec suivi en temps réel, photos quotidiennes et messagerie', 'communication', 29.00, 'DevicePhoneMobileIcon', false, true, 8);

-- ================================================
-- ACCORDER MODULE 'base' À TOUTES LES ENTERPRISES
-- ================================================
-- Toutes les enterprises existantes reçoivent le module gratuit 'base'
INSERT INTO enterprise_module_access (enterprise_id, module_id, is_active)
SELECT id, 'base', true
FROM enterprise
ON CONFLICT (enterprise_id, module_id) DO NOTHING;

-- ================================================
-- COMMENTAIRES
-- ================================================
COMMENT ON TABLE module IS 'Catalogue des modules disponibles dans l''application Luniqo';
COMMENT ON TABLE enterprise_module_access IS 'Permissions d''accès aux modules par enterprise (M2M)';
COMMENT ON TABLE module_access_request IS 'Demandes d''accès aux modules par les Owners';

COMMENT ON COLUMN module.is_free IS 'Module gratuit (ex: base), toujours accordé aux nouvelles enterprises';
COMMENT ON COLUMN module.is_active IS 'Module actif et visible dans le catalogue';
COMMENT ON COLUMN enterprise_module_access.expires_at IS 'Date d''expiration optionnelle pour les abonnements temporaires';
COMMENT ON COLUMN module_access_request.status IS 'Statut de la demande: pending, approved, rejected';

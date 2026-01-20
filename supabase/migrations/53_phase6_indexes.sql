-- =============================================
-- Phase 6: Portail Parents - Index de Performance
-- Migration 53: Index additionnels pour optimisation
-- =============================================

-- =============================================
-- INDEX COMPOSITES POUR QUERIES FRÉQUENTES
-- =============================================

-- Timeline posts par enfant et date (query la plus fréquente)
CREATE INDEX IF NOT EXISTS idx_timeline_post_child_date
ON timeline_post(child_id, post_date DESC, is_visible_to_parents);

-- Timeline posts par crèche et visibilité
CREATE INDEX IF NOT EXISTS idx_timeline_post_nursery_visible
ON timeline_post(nursery_id, is_visible_to_parents, post_date DESC);

-- Timeline posts non publiés (brouillons)
CREATE INDEX IF NOT EXISTS idx_timeline_post_drafts
ON timeline_post(nursery_id, is_visible_to_parents)
WHERE is_visible_to_parents = FALSE;

-- Commentaires par post (tri chronologique)
CREATE INDEX IF NOT EXISTS idx_parent_comment_post_created
ON parent_comment(timeline_post_id, created_at DESC);

-- Commentaires en attente de modération
CREATE INDEX IF NOT EXISTS idx_parent_comment_pending_approval
ON parent_comment(is_approved, created_at DESC)
WHERE is_approved = FALSE;

-- =============================================
-- INDEX MESSAGING
-- =============================================

-- Messages par conversation (family + employé)
CREATE INDEX IF NOT EXISTS idx_parent_message_conversation
ON parent_message(family_id, sender_employee_id, created_at DESC)
WHERE sender_employee_id IS NOT NULL;

-- Messages non lus par destinataire (guardian)
CREATE INDEX IF NOT EXISTS idx_parent_message_unread_guardian
ON parent_message(recipient_guardian_id, is_read, created_at DESC)
WHERE recipient_guardian_id IS NOT NULL AND is_read = FALSE;

-- Messages non lus par destinataire (employee)
CREATE INDEX IF NOT EXISTS idx_parent_message_unread_employee
ON parent_message(recipient_employee_id, is_read, created_at DESC)
WHERE recipient_employee_id IS NOT NULL AND is_read = FALSE;

-- Messages urgents non lus
CREATE INDEX IF NOT EXISTS idx_parent_message_urgent
ON parent_message(nursery_id, priority, is_read, created_at DESC)
WHERE priority IN ('high', 'urgent') AND is_read = FALSE;

-- =============================================
-- INDEX NOTIFICATIONS
-- =============================================

-- Notifications non lues par guardian (query très fréquente)
CREATE INDEX IF NOT EXISTS idx_parent_notification_unread
ON parent_notification(guardian_id, is_read, created_at DESC)
WHERE is_read = FALSE;

-- Notifications par type et guardian
CREATE INDEX IF NOT EXISTS idx_parent_notification_type_guardian
ON parent_notification(guardian_id, notification_type, created_at DESC);

-- Notifications push en échec (pour retry)
CREATE INDEX IF NOT EXISTS idx_parent_notification_push_failed
ON parent_notification(push_sent, created_at)
WHERE push_sent = FALSE AND push_error IS NOT NULL;

-- Notifications liées à un enfant
CREATE INDEX IF NOT EXISTS idx_parent_notification_child
ON parent_notification(related_child_id, created_at DESC)
WHERE related_child_id IS NOT NULL;

-- =============================================
-- INDEX DOCUMENTS
-- =============================================

-- Documents publiés par crèche
CREATE INDEX IF NOT EXISTS idx_document_share_published_nursery
ON parent_document_share(nursery_id, is_published, published_at DESC)
WHERE is_published = TRUE;

-- Documents nécessitant confirmation
CREATE INDEX IF NOT EXISTS idx_document_share_requires_ack
ON parent_document_share(nursery_id, requires_acknowledgment, published_at DESC)
WHERE requires_acknowledgment = TRUE;

-- Documents expirés (index simple - filtrage fait en query)
CREATE INDEX IF NOT EXISTS idx_document_share_expired
ON parent_document_share(valid_until);

-- Documents par famille (via array family_ids)
-- Note: Utilise l'index GIN déjà créé dans migration 50

-- Acknowledgments par guardian (statistiques)
CREATE INDEX IF NOT EXISTS idx_document_ack_guardian_date
ON document_acknowledgment(guardian_id, acknowledged_at DESC);

-- Documents non confirmés (pour rappels)
CREATE INDEX IF NOT EXISTS idx_document_ack_not_downloaded
ON document_acknowledgment(document_share_id, downloaded)
WHERE downloaded = FALSE;

-- =============================================
-- INDEX CERTIFICATS
-- =============================================

-- Certificats fiscaux par famille et année
CREATE INDEX IF NOT EXISTS idx_tax_certificate_family_year
ON tax_certificate(family_id, certificate_year DESC, status);

-- Certificats fiscaux par enfant
CREATE INDEX IF NOT EXISTS idx_tax_certificate_child_year
ON tax_certificate(child_id, certificate_year DESC);

-- Certificats en brouillon (non émis)
CREATE INDEX IF NOT EXISTS idx_tax_certificate_drafts
ON tax_certificate(nursery_id, status, certificate_year)
WHERE status = 'draft';

-- Certificats émis non envoyés
CREATE INDEX IF NOT EXISTS idx_tax_certificate_issued_not_sent
ON tax_certificate(nursery_id, status, issued_date DESC)
WHERE status = 'issued';

-- =============================================
-- INDEX DOCUMENTS CAF
-- =============================================

-- Documents CAF par famille et mois
CREATE INDEX IF NOT EXISTS idx_caf_document_family_month
ON caf_document(family_id, month DESC, document_type);

-- Documents CAF par enfant et type
CREATE INDEX IF NOT EXISTS idx_caf_document_child_type
ON caf_document(child_id, document_type, month DESC);

-- Documents CAF en attente d'envoi
CREATE INDEX IF NOT EXISTS idx_caf_document_pending
ON caf_document(nursery_id, status, month DESC)
WHERE status = 'generated';

-- =============================================
-- INDEX PARTITIONNÉS PAR DATE (Performance pour archives)
-- =============================================
-- NOTE: Index temporels avec CURRENT_DATE non supportés (fonctions non-immuables)
-- Utiliser les index normaux existants avec filtrage en query
-- Ou créer manuellement des index partiels avec dates fixes si besoin

-- =============================================
-- INDEX POUR STATISTIQUES & ANALYTICS
-- =============================================

-- Activité des parents (pour analytics)
CREATE INDEX IF NOT EXISTS idx_guardian_user_activity
ON guardian_user(last_app_access DESC, push_notifications_enabled);

-- Engagement timeline (posts avec réactions)
CREATE INDEX IF NOT EXISTS idx_timeline_post_engagement
ON timeline_post(nursery_id, parent_comments_count DESC, post_date DESC)
WHERE is_visible_to_parents = TRUE AND parent_comments_count > 0;

-- Documents populaires (téléchargements)
CREATE INDEX IF NOT EXISTS idx_document_share_popular
ON parent_document_share(nursery_id, download_count DESC, published_at DESC)
WHERE is_published = TRUE;

-- =============================================
-- VACUUM ANALYZE (Optimisation)
-- =============================================

-- Analyser les nouvelles tables pour optimiser le query planner
ANALYZE timeline_post;
ANALYZE parent_comment;
ANALYZE parent_message;
ANALYZE parent_notification;
ANALYZE parent_document_share;
ANALYZE document_acknowledgment;
ANALYZE tax_certificate;
ANALYZE caf_document;
ANALYZE guardian_user;

-- =============================================
-- COMMENTAIRES
-- =============================================

COMMENT ON INDEX idx_timeline_post_child_date IS 'Index composite pour query timeline par enfant (très fréquent)';
COMMENT ON INDEX idx_parent_message_unread_guardian IS 'Index partiel pour messages non lus (réduit taille index)';
COMMENT ON INDEX idx_parent_notification_unread IS 'Index partiel pour notifications non lues (query la plus fréquente)';
COMMENT ON INDEX idx_document_share_requires_ack IS 'Index partiel pour documents nécessitant confirmation';

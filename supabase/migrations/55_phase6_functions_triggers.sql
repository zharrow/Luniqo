-- =============================================
-- Phase 6: Portail Parents - Fonctions & Triggers
-- Migration 55: Automatisations et fonctions utilitaires
-- =============================================

-- =============================================
-- TRIGGERS: Auto-Notifications
-- =============================================

-- Trigger : Créer notification quand nouveau post timeline publié
CREATE OR REPLACE FUNCTION notify_guardians_new_post()
RETURNS TRIGGER AS $$
DECLARE
  guardian_record RECORD;
BEGIN
  -- Uniquement si le post est publié (is_visible_to_parents = TRUE)
  IF NEW.is_visible_to_parents = TRUE AND (OLD IS NULL OR OLD.is_visible_to_parents = FALSE) THEN
    -- Pour chaque guardian de l'enfant
    FOR guardian_record IN
      SELECT g.id, c.first_name || ' ' || c.last_name AS child_name
      FROM guardian_child gc
      JOIN guardian g ON g.id = gc.guardian_id
      JOIN child c ON c.id = gc.child_id
      WHERE gc.child_id = NEW.child_id
        AND gc.is_active = TRUE
        AND g.is_active = TRUE
    LOOP
      -- Créer notification
      INSERT INTO parent_notification (
        guardian_id,
        notification_type,
        title,
        body,
        action_url,
        related_child_id,
        related_post_id
      ) VALUES (
        guardian_record.id,
        'new_post',
        'Nouvelle publication',
        'Une nouvelle publication pour ' || guardian_record.child_name || ' : ' || COALESCE(NEW.title, LEFT(NEW.content, 50)),
        '/portal/timeline/' || NEW.id,
        NEW.child_id,
        NEW.id
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_guardians_new_post
AFTER INSERT OR UPDATE OF is_visible_to_parents ON timeline_post
FOR EACH ROW
EXECUTE FUNCTION notify_guardians_new_post();

-- Trigger : Créer notification quand nouveau commentaire
CREATE OR REPLACE FUNCTION notify_employee_new_comment()
RETURNS TRIGGER AS $$
DECLARE
  post_record RECORD;
BEGIN
  -- Récupérer infos du post
  SELECT tp.*, p.id AS employee_id
  INTO post_record
  FROM timeline_post tp
  LEFT JOIN profiles p ON p.id = tp.created_by_id
  WHERE tp.id = NEW.timeline_post_id;

  -- Notifier l'employé qui a créé le post (si différent)
  IF post_record.created_by_id IS NOT NULL THEN
    -- Note: Pour notification employé, on utiliserait une table différente
    -- Ici on pourrait créer une entry dans 'notification' table existante
    NULL; -- Placeholder - à implémenter selon besoins
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_employee_new_comment
AFTER INSERT ON parent_comment
FOR EACH ROW
EXECUTE FUNCTION notify_employee_new_comment();

-- Trigger : Créer notification quand nouveau message reçu
CREATE OR REPLACE FUNCTION notify_message_recipient()
RETURNS TRIGGER AS $$
BEGIN
  -- Si message envoyé à un guardian
  IF NEW.recipient_guardian_id IS NOT NULL THEN
    INSERT INTO parent_notification (
      guardian_id,
      notification_type,
      title,
      body,
      action_url,
      related_message_id
    ) VALUES (
      NEW.recipient_guardian_id,
      'new_message',
      'Nouveau message',
      COALESCE(NEW.subject, LEFT(NEW.message_text, 100)),
      '/portal/messages/' || NEW.id,
      NEW.id
    );
  END IF;

  -- Si message envoyé à un employé
  IF NEW.recipient_employee_id IS NOT NULL THEN
    -- Notifier employé via table notification (non parent_notification)
    NULL; -- Placeholder
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_message_recipient
AFTER INSERT ON parent_message
FOR EACH ROW
EXECUTE FUNCTION notify_message_recipient();

-- Trigger : Créer notification quand nouveau document partagé
CREATE OR REPLACE FUNCTION notify_document_shared()
RETURNS TRIGGER AS $$
DECLARE
  guardian_record RECORD;
  family_record RECORD;
BEGIN
  -- Uniquement si le document est publié
  IF NEW.is_published = TRUE AND (OLD IS NULL OR OLD.is_published = FALSE) THEN
    -- Selon le scope de partage
    IF NEW.share_scope = 'all_families' THEN
      -- Notifier tous les guardians de la crèche
      FOR guardian_record IN
        SELECT DISTINCT g.id
        FROM guardian g
        JOIN family f ON f.id = g.family_id
        JOIN child c ON c.family_id = f.id
        WHERE c.nursery_id = NEW.nursery_id
          AND g.is_active = TRUE
      LOOP
        INSERT INTO parent_notification (
          guardian_id,
          notification_type,
          title,
          body,
          action_url,
          related_document_id
        ) VALUES (
          guardian_record.id,
          'document_uploaded',
          'Nouveau document disponible',
          NEW.document_title,
          '/portal/documents/' || NEW.id,
          NEW.id
        );
      END LOOP;

    ELSIF NEW.share_scope = 'specific_families' THEN
      -- Notifier guardians des familles spécifiées
      FOR guardian_record IN
        SELECT DISTINCT g.id
        FROM guardian g
        WHERE g.family_id = ANY(NEW.family_ids)
          AND g.is_active = TRUE
      LOOP
        INSERT INTO parent_notification (
          guardian_id,
          notification_type,
          title,
          body,
          action_url,
          related_document_id
        ) VALUES (
          guardian_record.id,
          'document_uploaded',
          'Nouveau document disponible',
          NEW.document_title,
          '/portal/documents/' || NEW.id,
          NEW.id
        );
      END LOOP;

    ELSIF NEW.share_scope = 'specific_child' THEN
      -- Notifier guardians de l'enfant spécifié
      FOR guardian_record IN
        SELECT g.id
        FROM guardian_child gc
        JOIN guardian g ON g.id = gc.guardian_id
        WHERE gc.child_id = NEW.child_id
          AND g.is_active = TRUE
      LOOP
        INSERT INTO parent_notification (
          guardian_id,
          notification_type,
          title,
          body,
          action_url,
          related_child_id,
          related_document_id
        ) VALUES (
          guardian_record.id,
          'document_uploaded',
          'Nouveau document disponible',
          NEW.document_title,
          '/portal/documents/' || NEW.id,
          NEW.child_id,
          NEW.id
        );
      END LOOP;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_document_shared
AFTER INSERT OR UPDATE OF is_published ON parent_document_share
FOR EACH ROW
EXECUTE FUNCTION notify_document_shared();

-- =============================================
-- FONCTIONS UTILITAIRES
-- =============================================

-- Fonction : Obtenir dashboard data pour un guardian
CREATE OR REPLACE FUNCTION get_parent_dashboard(p_guardian_id UUID)
RETURNS JSON AS $$
DECLARE
  dashboard_data JSON;
BEGIN
  SELECT json_build_object(
    'unread_messages', (
      SELECT COUNT(*)::INTEGER
      FROM parent_message
      WHERE recipient_guardian_id = p_guardian_id AND is_read = FALSE
    ),
    'unread_notifications', (
      SELECT COUNT(*)::INTEGER
      FROM parent_notification
      WHERE guardian_id = p_guardian_id AND is_read = FALSE
    ),
    'recent_posts_count', (
      SELECT COUNT(*)::INTEGER
      FROM timeline_post tp
      JOIN guardian_child gc ON gc.child_id = tp.child_id
      WHERE gc.guardian_id = p_guardian_id
        AND tp.is_visible_to_parents = TRUE
        AND tp.created_at >= CURRENT_DATE - INTERVAL '7 days'
    ),
    'pending_documents', (
      SELECT COUNT(*)::INTEGER
      FROM parent_document_share pds
      LEFT JOIN document_acknowledgment da
        ON da.document_share_id = pds.id AND da.guardian_id = p_guardian_id
      WHERE pds.requires_acknowledgment = TRUE
        AND pds.is_published = TRUE
        AND da.id IS NULL
    ),
    'children', (
      SELECT json_agg(json_build_object(
        'id', c.id,
        'first_name', c.first_name,
        'last_name', c.last_name,
        'photo_url', c.photo_url,
        'recent_posts_count', (
          SELECT COUNT(*)::INTEGER
          FROM timeline_post tp
          WHERE tp.child_id = c.id
            AND tp.is_visible_to_parents = TRUE
            AND tp.created_at >= CURRENT_DATE - INTERVAL '7 days'
        )
      ))
      FROM guardian_child gc
      JOIN child c ON c.id = gc.child_id
      WHERE gc.guardian_id = p_guardian_id AND gc.is_active = TRUE
    )
  ) INTO dashboard_data;

  RETURN dashboard_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction : Obtenir statistiques engagement timeline pour une crèche
CREATE OR REPLACE FUNCTION get_timeline_engagement_stats(p_nursery_id UUID, p_period_days INTEGER DEFAULT 30)
RETURNS JSON AS $$
DECLARE
  stats_data JSON;
BEGIN
  SELECT json_build_object(
    'total_posts', (
      SELECT COUNT(*)::INTEGER
      FROM timeline_post
      WHERE nursery_id = p_nursery_id
        AND created_at >= CURRENT_DATE - (p_period_days || ' days')::INTERVAL
    ),
    'posts_with_reactions', (
      SELECT COUNT(*)::INTEGER
      FROM timeline_post
      WHERE nursery_id = p_nursery_id
        AND created_at >= CURRENT_DATE - (p_period_days || ' days')::INTERVAL
        AND jsonb_array_length(parent_reactions) > 0
    ),
    'posts_with_comments', (
      SELECT COUNT(*)::INTEGER
      FROM timeline_post
      WHERE nursery_id = p_nursery_id
        AND created_at >= CURRENT_DATE - (p_period_days || ' days')::INTERVAL
        AND parent_comments_count > 0
    ),
    'total_comments', (
      SELECT COUNT(*)::INTEGER
      FROM parent_comment pc
      JOIN timeline_post tp ON tp.id = pc.timeline_post_id
      WHERE tp.nursery_id = p_nursery_id
        AND pc.created_at >= CURRENT_DATE - (p_period_days || ' days')::INTERVAL
    ),
    'total_reactions', (
      SELECT SUM(jsonb_array_length(parent_reactions))::INTEGER
      FROM timeline_post
      WHERE nursery_id = p_nursery_id
        AND created_at >= CURRENT_DATE - (p_period_days || ' days')::INTERVAL
    ),
    'avg_reactions_per_post', (
      SELECT ROUND(AVG(jsonb_array_length(parent_reactions)), 2)
      FROM timeline_post
      WHERE nursery_id = p_nursery_id
        AND created_at >= CURRENT_DATE - (p_period_days || ' days')::INTERVAL
    )
  ) INTO stats_data;

  RETURN stats_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction : Obtenir statistiques documents partagés
CREATE OR REPLACE FUNCTION get_document_sharing_stats(p_nursery_id UUID, p_period_days INTEGER DEFAULT 30)
RETURNS JSON AS $$
DECLARE
  stats_data JSON;
BEGIN
  SELECT json_build_object(
    'total_documents', (
      SELECT COUNT(*)::INTEGER
      FROM parent_document_share
      WHERE nursery_id = p_nursery_id
        AND created_at >= CURRENT_DATE - (p_period_days || ' days')::INTERVAL
    ),
    'documents_requiring_ack', (
      SELECT COUNT(*)::INTEGER
      FROM parent_document_share
      WHERE nursery_id = p_nursery_id
        AND requires_acknowledgment = TRUE
        AND created_at >= CURRENT_DATE - (p_period_days || ' days')::INTERVAL
    ),
    'total_downloads', (
      SELECT SUM(download_count)::INTEGER
      FROM parent_document_share
      WHERE nursery_id = p_nursery_id
        AND created_at >= CURRENT_DATE - (p_period_days || ' days')::INTERVAL
    ),
    'avg_downloads_per_document', (
      SELECT ROUND(AVG(download_count), 2)
      FROM parent_document_share
      WHERE nursery_id = p_nursery_id
        AND created_at >= CURRENT_DATE - (p_period_days || ' days')::INTERVAL
    )
  ) INTO stats_data;

  RETURN stats_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction : Nettoyer anciennes notifications (maintenance)
CREATE OR REPLACE FUNCTION cleanup_old_notifications(p_days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Supprimer notifications lues de plus de X jours
  DELETE FROM parent_notification
  WHERE is_read = TRUE
    AND read_at < CURRENT_DATE - (p_days_to_keep || ' days')::INTERVAL;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Fonction : Envoyer rappel pour documents non confirmés
CREATE OR REPLACE FUNCTION send_document_acknowledgment_reminders(p_nursery_id UUID)
RETURNS INTEGER AS $$
DECLARE
  reminder_count INTEGER := 0;
  doc_record RECORD;
  guardian_record RECORD;
BEGIN
  -- Pour chaque document nécessitant confirmation publié depuis plus de 7 jours
  FOR doc_record IN
    SELECT id, document_title
    FROM parent_document_share
    WHERE nursery_id = p_nursery_id
      AND requires_acknowledgment = TRUE
      AND is_published = TRUE
      AND published_at < CURRENT_DATE - INTERVAL '7 days'
  LOOP
    -- Pour chaque guardian n'ayant pas encore confirmé
    FOR guardian_record IN
      SELECT g.id
      FROM guardian g
      JOIN family f ON f.id = g.family_id
      JOIN child c ON c.family_id = f.id
      LEFT JOIN document_acknowledgment da
        ON da.document_share_id = doc_record.id AND da.guardian_id = g.id
      WHERE c.nursery_id = p_nursery_id
        AND g.is_active = TRUE
        AND da.id IS NULL
    LOOP
      -- Créer notification de rappel
      INSERT INTO parent_notification (
        guardian_id,
        notification_type,
        title,
        body,
        action_url,
        related_document_id
      ) VALUES (
        guardian_record.id,
        'document_uploaded',
        'Rappel : Document à confirmer',
        'Le document "' || doc_record.document_title || '" nécessite votre confirmation de lecture',
        '/portal/documents/' || doc_record.id,
        doc_record.id
      );

      reminder_count := reminder_count + 1;
    END LOOP;
  END LOOP;

  RETURN reminder_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- COMMENTAIRES
-- =============================================

COMMENT ON FUNCTION notify_guardians_new_post() IS 'Trigger: Créer notifications automatiques quand nouveau post publié';
COMMENT ON FUNCTION notify_message_recipient() IS 'Trigger: Créer notification quand nouveau message reçu';
COMMENT ON FUNCTION notify_document_shared() IS 'Trigger: Créer notifications quand document partagé (selon scope)';

COMMENT ON FUNCTION get_parent_dashboard(UUID) IS 'Retourne données dashboard parent (compteurs, enfants, posts récents)';
COMMENT ON FUNCTION get_timeline_engagement_stats(UUID, INTEGER) IS 'Statistiques d\'engagement timeline (posts, réactions, commentaires)';
COMMENT ON FUNCTION get_document_sharing_stats(UUID, INTEGER) IS 'Statistiques partage documents (téléchargements, confirmations)';

COMMENT ON FUNCTION cleanup_old_notifications(INTEGER) IS 'Maintenance: Supprimer anciennes notifications lues (cron daily)';
COMMENT ON FUNCTION send_document_acknowledgment_reminders(UUID) IS 'Envoyer rappels pour documents non confirmés (cron weekly)';

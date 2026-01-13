-- =============================================
-- Phase 6: Portail Parents - Messagerie & Notifications
-- Migration 49: Tables parent_message, parent_notification
-- =============================================

-- =============================================
-- ENUMS
-- =============================================

-- Catégorie de message
CREATE TYPE parent_message_category AS ENUM (
  'general',
  'absence_notification',
  'urgent',
  'administrative',
  'inquiry',
  'feedback'
);

-- Priorité message
CREATE TYPE message_priority AS ENUM (
  'low',
  'normal',
  'high',
  'urgent'
);

-- Type de notification
CREATE TYPE parent_notification_type AS ENUM (
  'new_post',
  'new_message',
  'invoice_available',
  'payment_reminder',
  'document_uploaded',
  'authorization_expiring',
  'announcement',
  'contract_reminder',
  'absence_confirmation'
);

-- =============================================
-- TABLE: parent_message
-- =============================================

CREATE TABLE parent_message (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID NOT NULL REFERENCES family(id) ON DELETE CASCADE,
  nursery_id UUID NOT NULL REFERENCES nursery(id) ON DELETE CASCADE,

  -- Participants (sender et recipient)
  -- Si parent envoie: sender_guardian_id rempli, sender_employee_id NULL
  -- Si employé envoie: sender_employee_id rempli, sender_guardian_id NULL
  sender_guardian_id UUID REFERENCES guardian(id) ON DELETE SET NULL,
  sender_employee_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  recipient_guardian_id UUID REFERENCES guardian(id) ON DELETE SET NULL,
  recipient_employee_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Contenu
  subject VARCHAR(255),
  message_text TEXT NOT NULL,

  -- Pièces jointes (Supabase Storage)
  attachments_urls TEXT[] DEFAULT '{}',
  attachments_names TEXT[] DEFAULT '{}',

  -- Statut lecture
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,

  -- Type et priorité
  message_category parent_message_category DEFAULT 'general',
  priority message_priority DEFAULT 'normal',

  -- Fil de conversation (reply)
  reply_to_message_id UUID REFERENCES parent_message(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX idx_parent_message_family ON parent_message(family_id);
CREATE INDEX idx_parent_message_nursery ON parent_message(nursery_id);
CREATE INDEX idx_parent_message_sender_guardian ON parent_message(sender_guardian_id);
CREATE INDEX idx_parent_message_sender_employee ON parent_message(sender_employee_id);
CREATE INDEX idx_parent_message_recipient_guardian ON parent_message(recipient_guardian_id);
CREATE INDEX idx_parent_message_recipient_employee ON parent_message(recipient_employee_id);
CREATE INDEX idx_parent_message_read ON parent_message(is_read);
CREATE INDEX idx_parent_message_created ON parent_message(created_at DESC);
CREATE INDEX idx_parent_message_category ON parent_message(message_category);
CREATE INDEX idx_parent_message_priority ON parent_message(priority);
CREATE INDEX idx_parent_message_reply ON parent_message(reply_to_message_id);

-- =============================================
-- TABLE: parent_notification
-- =============================================

CREATE TABLE parent_notification (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  guardian_id UUID NOT NULL REFERENCES guardian(id) ON DELETE CASCADE,

  -- Type et contenu
  notification_type parent_notification_type NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,

  -- Lien action (deeplink dans l'app)
  action_url TEXT,
  related_child_id UUID REFERENCES child(id) ON DELETE SET NULL,
  related_post_id UUID REFERENCES timeline_post(id) ON DELETE SET NULL,
  related_message_id UUID REFERENCES parent_message(id) ON DELETE SET NULL,
  related_invoice_id UUID REFERENCES invoice(id) ON DELETE SET NULL,
  related_document_id UUID REFERENCES parent_document_share(id) ON DELETE SET NULL,

  -- Statut lecture
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,

  -- Push notification
  push_sent BOOLEAN DEFAULT FALSE,
  push_sent_at TIMESTAMPTZ,
  push_error TEXT,  -- Erreur si échec envoi push

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX idx_parent_notification_guardian ON parent_notification(guardian_id);
CREATE INDEX idx_parent_notification_type ON parent_notification(notification_type);
CREATE INDEX idx_parent_notification_read ON parent_notification(is_read);
CREATE INDEX idx_parent_notification_push_sent ON parent_notification(push_sent);
CREATE INDEX idx_parent_notification_created ON parent_notification(created_at DESC);
CREATE INDEX idx_parent_notification_child ON parent_notification(related_child_id);

-- =============================================
-- FONCTIONS
-- =============================================

-- Fonction : Marquer message comme lu
CREATE OR REPLACE FUNCTION mark_message_as_read(message_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE parent_message
  SET is_read = TRUE, read_at = NOW()
  WHERE id = message_id AND is_read = FALSE;
END;
$$ LANGUAGE plpgsql;

-- Fonction : Marquer notification comme lue
CREATE OR REPLACE FUNCTION mark_notification_as_read(notification_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE parent_notification
  SET is_read = TRUE, read_at = NOW()
  WHERE id = notification_id AND is_read = FALSE;
END;
$$ LANGUAGE plpgsql;

-- Fonction : Marquer toutes les notifications d'un parent comme lues
CREATE OR REPLACE FUNCTION mark_all_notifications_read(p_guardian_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE parent_notification
  SET is_read = TRUE, read_at = NOW()
  WHERE guardian_id = p_guardian_id AND is_read = FALSE;
END;
$$ LANGUAGE plpgsql;

-- Fonction : Compter messages non lus pour un guardian
CREATE OR REPLACE FUNCTION get_unread_messages_count(p_guardian_id UUID)
RETURNS INTEGER AS $$
DECLARE
  unread_count INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER INTO unread_count
  FROM parent_message
  WHERE recipient_guardian_id = p_guardian_id AND is_read = FALSE;

  RETURN unread_count;
END;
$$ LANGUAGE plpgsql;

-- Fonction : Compter notifications non lues pour un guardian
CREATE OR REPLACE FUNCTION get_unread_notifications_count(p_guardian_id UUID)
RETURNS INTEGER AS $$
DECLARE
  unread_count INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER INTO unread_count
  FROM parent_notification
  WHERE guardian_id = p_guardian_id AND is_read = FALSE;

  RETURN unread_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- CONTRAINTES DE VALIDATION
-- =============================================

-- Contrainte : Un message doit avoir au moins un sender
ALTER TABLE parent_message ADD CONSTRAINT check_message_has_sender
CHECK (
  (sender_guardian_id IS NOT NULL AND sender_employee_id IS NULL) OR
  (sender_employee_id IS NOT NULL AND sender_guardian_id IS NULL)
);

-- Contrainte : Un message doit avoir au moins un recipient
ALTER TABLE parent_message ADD CONSTRAINT check_message_has_recipient
CHECK (
  (recipient_guardian_id IS NOT NULL) OR
  (recipient_employee_id IS NOT NULL)
);

-- =============================================
-- COMMENTAIRES
-- =============================================

COMMENT ON TABLE parent_message IS 'Messages privés entre parents et crèche (bidirectionnel)';
COMMENT ON TABLE parent_notification IS 'Notifications push pour l\'application mobile parents';

COMMENT ON COLUMN parent_message.sender_guardian_id IS 'Si rempli, message envoyé par un parent';
COMMENT ON COLUMN parent_message.sender_employee_id IS 'Si rempli, message envoyé par un employé';
COMMENT ON COLUMN parent_message.reply_to_message_id IS 'Si rempli, ce message est une réponse à un autre';

COMMENT ON COLUMN parent_notification.action_url IS 'Deeplink pour navigation dans l\'app (ex: /portal/timeline/123)';
COMMENT ON COLUMN parent_notification.push_sent IS 'TRUE si notification push envoyée (FCM/APNS)';
COMMENT ON COLUMN parent_notification.push_error IS 'Message d\'erreur si envoi push échoué';

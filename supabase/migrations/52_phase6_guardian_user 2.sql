-- =============================================
-- Phase 6: Portail Parents - Extension Guardian User
-- Migration 52: ALTER guardian_user pour app mobile
-- =============================================

-- =============================================
-- COLONNES APP MOBILE
-- =============================================

-- Langue de l'application
ALTER TABLE guardian_user
ADD COLUMN IF NOT EXISTS app_language VARCHAR(10) DEFAULT 'fr';

-- Préférences notifications
ALTER TABLE guardian_user
ADD COLUMN IF NOT EXISTS push_notifications_enabled BOOLEAN DEFAULT TRUE;

ALTER TABLE guardian_user
ADD COLUMN IF NOT EXISTS email_notifications_enabled BOOLEAN DEFAULT TRUE;

ALTER TABLE guardian_user
ADD COLUMN IF NOT EXISTS sms_notifications_enabled BOOLEAN DEFAULT FALSE;

-- Tokens push notifications
ALTER TABLE guardian_user
ADD COLUMN IF NOT EXISTS fcm_token VARCHAR(255);  -- Firebase Cloud Messaging (Android)

ALTER TABLE guardian_user
ADD COLUMN IF NOT EXISTS apns_token VARCHAR(255); -- Apple Push Notification Service (iOS)

ALTER TABLE guardian_user
ADD COLUMN IF NOT EXISTS push_token_updated_at TIMESTAMPTZ;

-- Activité app
ALTER TABLE guardian_user
ADD COLUMN IF NOT EXISTS last_app_access TIMESTAMPTZ;

ALTER TABLE guardian_user
ADD COLUMN IF NOT EXISTS app_version VARCHAR(20);

ALTER TABLE guardian_user
ADD COLUMN IF NOT EXISTS device_type VARCHAR(20);  -- 'ios', 'android', 'web'

ALTER TABLE guardian_user
ADD COLUMN IF NOT EXISTS device_model VARCHAR(100);

-- Préférences affichage
ALTER TABLE guardian_user
ADD COLUMN IF NOT EXISTS theme_preference VARCHAR(20) DEFAULT 'light';  -- 'light', 'dark', 'auto'

ALTER TABLE guardian_user
ADD COLUMN IF NOT EXISTS notifications_sound_enabled BOOLEAN DEFAULT TRUE;

ALTER TABLE guardian_user
ADD COLUMN IF NOT EXISTS notifications_vibration_enabled BOOLEAN DEFAULT TRUE;

-- =============================================
-- INDEX
-- =============================================

CREATE INDEX IF NOT EXISTS idx_guardian_user_fcm_token ON guardian_user(fcm_token) WHERE fcm_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_guardian_user_apns_token ON guardian_user(apns_token) WHERE apns_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_guardian_user_push_enabled ON guardian_user(push_notifications_enabled) WHERE push_notifications_enabled = TRUE;
CREATE INDEX IF NOT EXISTS idx_guardian_user_last_access ON guardian_user(last_app_access DESC);

-- =============================================
-- FONCTIONS
-- =============================================

-- Fonction : Enregistrer token push notification
CREATE OR REPLACE FUNCTION register_push_token(
  p_guardian_user_id UUID,
  p_token VARCHAR(255),
  p_platform VARCHAR(10)  -- 'ios' ou 'android'
)
RETURNS VOID AS $$
BEGIN
  IF p_platform = 'ios' THEN
    UPDATE guardian_user
    SET
      apns_token = p_token,
      push_token_updated_at = NOW(),
      device_type = 'ios'
    WHERE id = p_guardian_user_id;
  ELSIF p_platform = 'android' THEN
    UPDATE guardian_user
    SET
      fcm_token = p_token,
      push_token_updated_at = NOW(),
      device_type = 'android'
    WHERE id = p_guardian_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Fonction : Mettre à jour last_app_access
CREATE OR REPLACE FUNCTION update_last_app_access(p_guardian_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE guardian_user
  SET last_app_access = NOW()
  WHERE id = p_guardian_user_id;
END;
$$ LANGUAGE plpgsql;

-- Fonction : Obtenir guardians avec push activé
CREATE OR REPLACE FUNCTION get_guardians_with_push_enabled()
RETURNS TABLE (
  guardian_user_id UUID,
  guardian_id UUID,
  fcm_token VARCHAR(255),
  apns_token VARCHAR(255),
  device_type VARCHAR(20)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    gu.id,
    gu.guardian_id,
    gu.fcm_token,
    gu.apns_token,
    gu.device_type
  FROM guardian_user gu
  WHERE gu.push_notifications_enabled = TRUE
    AND gu.is_active = TRUE
    AND (gu.fcm_token IS NOT NULL OR gu.apns_token IS NOT NULL);
END;
$$ LANGUAGE plpgsql;

-- Fonction : Désactiver toutes les notifications pour un guardian
CREATE OR REPLACE FUNCTION disable_all_notifications(p_guardian_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE guardian_user
  SET
    push_notifications_enabled = FALSE,
    email_notifications_enabled = FALSE,
    sms_notifications_enabled = FALSE,
    notifications_sound_enabled = FALSE,
    notifications_vibration_enabled = FALSE
  WHERE id = p_guardian_user_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- CONTRAINTES
-- =============================================

-- Contrainte : Langue valide
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_app_language_valid'
  ) THEN
    ALTER TABLE guardian_user
    ADD CONSTRAINT check_app_language_valid
    CHECK (app_language IN ('fr', 'en', 'es', 'de', 'it', 'pt'));
  END IF;
END $$;

-- Contrainte : Theme valide
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_theme_valid'
  ) THEN
    ALTER TABLE guardian_user
    ADD CONSTRAINT check_theme_valid
    CHECK (theme_preference IN ('light', 'dark', 'auto'));
  END IF;
END $$;

-- Contrainte : Device type valide
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_device_type_valid'
  ) THEN
    ALTER TABLE guardian_user
    ADD CONSTRAINT check_device_type_valid
    CHECK (device_type IS NULL OR device_type IN ('ios', 'android', 'web'));
  END IF;
END $$;

-- =============================================
-- COMMENTAIRES
-- =============================================

COMMENT ON COLUMN guardian_user.app_language IS 'Langue de l''application (fr, en, es, de, it, pt)';
COMMENT ON COLUMN guardian_user.push_notifications_enabled IS 'Activer/désactiver notifications push';
COMMENT ON COLUMN guardian_user.fcm_token IS 'Firebase Cloud Messaging token (Android)';
COMMENT ON COLUMN guardian_user.apns_token IS 'Apple Push Notification Service token (iOS)';
COMMENT ON COLUMN guardian_user.last_app_access IS 'Dernière connexion à l''app mobile';
COMMENT ON COLUMN guardian_user.app_version IS 'Version de l''app installée (ex: 1.0.5)';
COMMENT ON COLUMN guardian_user.device_type IS 'Type d''appareil (ios, android, web)';
COMMENT ON COLUMN guardian_user.theme_preference IS 'Thème préféré (light, dark, auto)';

-- =============================================
-- DONNÉES PAR DÉFAUT
-- =============================================

-- Mettre à jour les guardians existants avec valeurs par défaut
UPDATE guardian_user
SET
  app_language = COALESCE(app_language, 'fr'),
  push_notifications_enabled = COALESCE(push_notifications_enabled, TRUE),
  email_notifications_enabled = COALESCE(email_notifications_enabled, TRUE),
  sms_notifications_enabled = COALESCE(sms_notifications_enabled, FALSE),
  theme_preference = COALESCE(theme_preference, 'light'),
  notifications_sound_enabled = COALESCE(notifications_sound_enabled, TRUE),
  notifications_vibration_enabled = COALESCE(notifications_vibration_enabled, TRUE)
WHERE
  app_language IS NULL OR
  push_notifications_enabled IS NULL OR
  email_notifications_enabled IS NULL;

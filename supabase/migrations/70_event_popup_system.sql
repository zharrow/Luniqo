-- ============================================================================
-- EVENT POPUP SYSTEM
-- Tables for managing event-based popups (welcome, seasonal, promotional)
-- Version: 1.0 (2026-02-10)
-- ============================================================================

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Type of popup event
CREATE TYPE popup_event_type AS ENUM (
  'first_login_after_setup',   -- Welcome after enterprise creation
  'seasonal_valentine',         -- Valentine's Day
  'seasonal_christmas',         -- Christmas
  'seasonal_new_year',          -- New Year
  'promotional',                -- Generic promo
  'announcement'                -- Product announcements
);

-- Visual theme for the popup
CREATE TYPE popup_theme AS ENUM (
  'neutral',       -- Default blue/primary
  'valentine',     -- Rose/pink with hearts
  'christmas',     -- Red/green festive
  'celebration',   -- Confetti, festive (welcome)
  'warning',       -- Orange/yellow for alerts
  'success'        -- Green for achievements
);

-- ============================================================================
-- POPUP EVENTS TABLE (event definitions)
-- ============================================================================
CREATE TABLE popup_event (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Event identification
  event_key VARCHAR(100) UNIQUE NOT NULL,  -- Unique key e.g., 'valentine_2026'
  event_type popup_event_type NOT NULL,

  -- Display content
  title VARCHAR(255) NOT NULL,
  description TEXT,
  image_url TEXT,                          -- Optional hero image URL
  emoji VARCHAR(10),                       -- Optional emoji (e.g., "💝")

  -- Theme and styling
  theme popup_theme DEFAULT 'neutral',
  custom_styles JSONB,                     -- Optional custom CSS overrides

  -- Call to action
  cta_label VARCHAR(100),                  -- Button text e.g., "Commencer"
  cta_url VARCHAR(500),                    -- Optional link to navigate to

  -- Promo code (for seasonal/promotional events)
  promo_code VARCHAR(50),
  promo_description VARCHAR(255),          -- e.g., "-10% sur un module"

  -- Targeting
  target_roles user_role[],                -- Empty array = all roles
  target_enterprise_ids UUID[],            -- Empty array = all enterprises

  -- Scheduling
  start_date TIMESTAMP WITH TIME ZONE,     -- When to start showing (null = immediate)
  end_date TIMESTAMP WITH TIME ZONE,       -- When to stop showing (null = forever)

  -- Behavior
  dismissible BOOLEAN DEFAULT TRUE,        -- Can user close it?
  show_dont_show_again BOOLEAN DEFAULT TRUE, -- Show "Ne plus afficher" checkbox?
  priority INT DEFAULT 0,                  -- Higher = shown first if multiple popups
  max_views INT DEFAULT 1,                 -- Max times to show (null = unlimited)

  -- Metadata
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- USER POPUP VIEWS TABLE (tracking per user)
-- ============================================================================
CREATE TABLE user_popup_view (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  popup_event_id UUID NOT NULL REFERENCES popup_event(id) ON DELETE CASCADE,

  -- View tracking
  view_count INT DEFAULT 1,
  first_viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- User actions
  dismissed_at TIMESTAMP WITH TIME ZONE,    -- When user clicked close
  dont_show_again BOOLEAN DEFAULT FALSE,    -- User opted out
  cta_clicked_at TIMESTAMP WITH TIME ZONE,  -- If user clicked CTA button
  promo_copied_at TIMESTAMP WITH TIME ZONE, -- If user copied promo code

  UNIQUE(user_id, popup_event_id)
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX idx_popup_event_active ON popup_event(is_active, start_date, end_date);
CREATE INDEX idx_popup_event_type ON popup_event(event_type);
CREATE INDEX idx_popup_event_key ON popup_event(event_key);
CREATE INDEX idx_user_popup_view_user ON user_popup_view(user_id);
CREATE INDEX idx_user_popup_view_popup ON user_popup_view(popup_event_id);
CREATE INDEX idx_user_popup_view_dismissed ON user_popup_view(user_id, dont_show_again);

-- ============================================================================
-- TRIGGER: Auto-update timestamp
-- ============================================================================
CREATE OR REPLACE FUNCTION update_popup_event_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER popup_event_updated
  BEFORE UPDATE ON popup_event
  FOR EACH ROW
  EXECUTE FUNCTION update_popup_event_timestamp();

-- ============================================================================
-- SEED DATA: Welcome Event (first login after setup)
-- ============================================================================
INSERT INTO popup_event (
  event_key,
  event_type,
  title,
  description,
  emoji,
  theme,
  cta_label,
  target_roles,
  show_dont_show_again,
  priority,
  max_views
) VALUES (
  'welcome_after_setup',
  'first_login_after_setup',
  'Bienvenue sur Luniqo !',
  'Votre espace est maintenant configuré. Commencez par créer vos salles et vos tâches de nettoyage pour organiser votre quotidien.',
  '🎉',
  'celebration',
  'C''est parti !',
  ARRAY['Owner']::user_role[],
  FALSE,  -- Don't show "don't show again" for welcome
  100,    -- High priority
  1       -- Show only once
);

-- ============================================================================
-- SEED DATA: Valentine's Day 2026 Event (example)
-- ============================================================================
INSERT INTO popup_event (
  event_key,
  event_type,
  title,
  description,
  emoji,
  theme,
  promo_code,
  promo_description,
  cta_label,
  target_roles,
  start_date,
  end_date,
  show_dont_show_again,
  priority,
  max_views
) VALUES (
  'valentine_2026',
  'seasonal_valentine',
  'Joyeuse Saint Valentin !',
  'Pour célébrer l''amour du travail bien fait, profitez de -10% sur le module de votre choix.',
  '💝',
  'valentine',
  'LOVE2026',
  '-10% sur un module au choix',
  'Voir les modules',
  ARRAY['Owner']::user_role[],
  '2026-02-01 00:00:00+01',
  '2026-02-14 23:59:59+01',
  TRUE,
  50,
  1
);

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE popup_event IS 'Event-triggered popup definitions (welcome, seasonal, promo)';
COMMENT ON TABLE user_popup_view IS 'Tracks which popups each user has seen/dismissed';
COMMENT ON COLUMN popup_event.event_key IS 'Unique identifier for the event (e.g., valentine_2026)';
COMMENT ON COLUMN popup_event.target_roles IS 'Array of roles that can see this popup. Empty = all roles';
COMMENT ON COLUMN popup_event.max_views IS 'Maximum number of times to show this popup. 1 = show once';
COMMENT ON COLUMN user_popup_view.dont_show_again IS 'User checked "Ne plus afficher" checkbox';

-- =====================================================================================
-- MIGRATION 65: STRIPE INTEGRATION
-- =====================================================================================
-- Description: Tables et colonnes pour l'intégration Stripe (abonnements modules + paiements)
-- Architecture: Stripe Checkout (hosted) pour minimiser la charge PCI
-- Date: 2026-01-26
-- =====================================================================================

-- =====================================================================================
-- 1. ENUMS
-- =====================================================================================

CREATE TYPE stripe_subscription_status AS ENUM (
  'active',
  'past_due',
  'canceled',
  'incomplete',
  'incomplete_expired',
  'trialing',
  'unpaid',
  'paused'
);

CREATE TYPE stripe_checkout_status AS ENUM (
  'open',
  'complete',
  'expired'
);

-- =====================================================================================
-- 2. TABLE: stripe_customer
-- =====================================================================================
-- Mapping 1:1 Enterprise → Stripe Customer
CREATE TABLE stripe_customer (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  enterprise_id UUID NOT NULL REFERENCES enterprise(id) ON DELETE CASCADE,
  stripe_customer_id VARCHAR(255) NOT NULL UNIQUE,
  stripe_email VARCHAR(255),
  stripe_name VARCHAR(255),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(enterprise_id)
);

COMMENT ON TABLE stripe_customer IS 'Mapping 1:1 entre Enterprise et Stripe Customer';
COMMENT ON COLUMN stripe_customer.stripe_customer_id IS 'ID Stripe (cus_xxx)';

CREATE INDEX idx_stripe_customer_enterprise ON stripe_customer(enterprise_id);
CREATE INDEX idx_stripe_customer_stripe_id ON stripe_customer(stripe_customer_id);

-- =====================================================================================
-- 3. TABLE: stripe_subscription
-- =====================================================================================
-- Abonnements Stripe actifs pour une enterprise
CREATE TABLE stripe_subscription (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  enterprise_id UUID NOT NULL REFERENCES enterprise(id) ON DELETE CASCADE,
  stripe_customer_id UUID NOT NULL REFERENCES stripe_customer(id) ON DELETE CASCADE,
  stripe_subscription_id VARCHAR(255) NOT NULL UNIQUE,
  status stripe_subscription_status NOT NULL DEFAULT 'incomplete',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  canceled_at TIMESTAMPTZ,
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE stripe_subscription IS 'Abonnements Stripe des enterprises';
COMMENT ON COLUMN stripe_subscription.stripe_subscription_id IS 'ID Stripe (sub_xxx)';
COMMENT ON COLUMN stripe_subscription.cancel_at_period_end IS 'Si true, annulation en fin de période';

CREATE INDEX idx_stripe_subscription_enterprise ON stripe_subscription(enterprise_id);
CREATE INDEX idx_stripe_subscription_stripe_id ON stripe_subscription(stripe_subscription_id);
CREATE INDEX idx_stripe_subscription_status ON stripe_subscription(status);
CREATE INDEX idx_stripe_subscription_active ON stripe_subscription(enterprise_id, status) WHERE status = 'active';

-- =====================================================================================
-- 4. TABLE: stripe_subscription_item
-- =====================================================================================
-- Items d'abonnement (1 par module souscrit par nursery)
CREATE TABLE stripe_subscription_item (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stripe_subscription_id UUID NOT NULL REFERENCES stripe_subscription(id) ON DELETE CASCADE,
  nursery_id UUID NOT NULL REFERENCES nursery(id) ON DELETE CASCADE,
  module_id VARCHAR(50) NOT NULL REFERENCES module(id) ON DELETE CASCADE,
  stripe_subscription_item_id VARCHAR(255) NOT NULL UNIQUE,
  stripe_price_id VARCHAR(255) NOT NULL,
  quantity INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(stripe_subscription_id, nursery_id, module_id)
);

COMMENT ON TABLE stripe_subscription_item IS 'Items d''abonnement Stripe (1 par module par crèche)';
COMMENT ON COLUMN stripe_subscription_item.stripe_subscription_item_id IS 'ID Stripe (si_xxx)';

CREATE INDEX idx_stripe_sub_item_subscription ON stripe_subscription_item(stripe_subscription_id);
CREATE INDEX idx_stripe_sub_item_nursery ON stripe_subscription_item(nursery_id);
CREATE INDEX idx_stripe_sub_item_module ON stripe_subscription_item(module_id);

-- =====================================================================================
-- 5. TABLE: stripe_checkout_session
-- =====================================================================================
-- Sessions de paiement Stripe en cours
CREATE TABLE stripe_checkout_session (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  enterprise_id UUID NOT NULL REFERENCES enterprise(id) ON DELETE CASCADE,
  stripe_session_id VARCHAR(255) NOT NULL UNIQUE,
  stripe_customer_id VARCHAR(255),
  mode VARCHAR(20) NOT NULL CHECK (mode IN ('subscription', 'payment')),
  status stripe_checkout_status NOT NULL DEFAULT 'open',
  url TEXT,
  success_url TEXT,
  cancel_url TEXT,
  amount_total INTEGER,
  currency VARCHAR(3) DEFAULT 'eur',
  metadata JSONB DEFAULT '{}',
  expires_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE stripe_checkout_session IS 'Sessions Stripe Checkout en cours ou terminées';
COMMENT ON COLUMN stripe_checkout_session.stripe_session_id IS 'ID Stripe (cs_xxx)';
COMMENT ON COLUMN stripe_checkout_session.mode IS 'subscription (abonnements) ou payment (paiement ponctuel)';

CREATE INDEX idx_stripe_checkout_enterprise ON stripe_checkout_session(enterprise_id);
CREATE INDEX idx_stripe_checkout_stripe_id ON stripe_checkout_session(stripe_session_id);
CREATE INDEX idx_stripe_checkout_status ON stripe_checkout_session(status);

-- =====================================================================================
-- 6. TABLE: stripe_webhook_event
-- =====================================================================================
-- Events Stripe traités (pour idempotence et audit)
CREATE TABLE stripe_webhook_event (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stripe_event_id VARCHAR(255) NOT NULL UNIQUE,
  event_type VARCHAR(100) NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  processing_error TEXT,
  payload JSONB,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE stripe_webhook_event IS 'Events Stripe traités pour idempotence et audit';
COMMENT ON COLUMN stripe_webhook_event.stripe_event_id IS 'ID Stripe (evt_xxx) - clé d''idempotence';

CREATE INDEX idx_stripe_webhook_event_stripe_id ON stripe_webhook_event(stripe_event_id);
CREATE INDEX idx_stripe_webhook_event_type ON stripe_webhook_event(event_type);
CREATE INDEX idx_stripe_webhook_event_processed ON stripe_webhook_event(processed);

-- =====================================================================================
-- 7. ALTER TABLE: module - Ajouter colonnes Stripe Price
-- =====================================================================================
ALTER TABLE module ADD COLUMN IF NOT EXISTS stripe_price_id VARCHAR(255);
ALTER TABLE module ADD COLUMN IF NOT EXISTS stripe_price_id_annual VARCHAR(255);

COMMENT ON COLUMN module.stripe_price_id IS 'ID prix Stripe mensuel (price_xxx)';
COMMENT ON COLUMN module.stripe_price_id_annual IS 'ID prix Stripe annuel (price_xxx)';

-- =====================================================================================
-- 8. ALTER TABLE: payment - Ajouter stripe_payment_intent_id
-- =====================================================================================
ALTER TABLE payment ADD COLUMN IF NOT EXISTS stripe_payment_intent_id VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_payment_stripe_pi ON payment(stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL;

COMMENT ON COLUMN payment.stripe_payment_intent_id IS 'ID Stripe PaymentIntent (pi_xxx)';

-- =====================================================================================
-- 9. ALTER TABLE: payment_method - Ajouter colonnes Stripe
-- =====================================================================================
ALTER TABLE payment_method ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);
ALTER TABLE payment_method ADD COLUMN IF NOT EXISTS stripe_payment_method_id VARCHAR(255);

COMMENT ON COLUMN payment_method.stripe_customer_id IS 'ID Stripe Customer (cus_xxx) pour familles';
COMMENT ON COLUMN payment_method.stripe_payment_method_id IS 'ID Stripe PaymentMethod (pm_xxx)';

-- =====================================================================================
-- 10. TRIGGERS: updated_at
-- =====================================================================================

CREATE TRIGGER update_stripe_customer_updated_at
  BEFORE UPDATE ON stripe_customer
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stripe_subscription_updated_at
  BEFORE UPDATE ON stripe_subscription
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stripe_subscription_item_updated_at
  BEFORE UPDATE ON stripe_subscription_item
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================================================
-- 11. FUNCTION: Cleanup expired checkout sessions (optional cron)
-- =====================================================================================

CREATE OR REPLACE FUNCTION cleanup_expired_checkout_sessions()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE stripe_checkout_session
  SET status = 'expired'
  WHERE status = 'open'
    AND expires_at IS NOT NULL
    AND expires_at < NOW();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_expired_checkout_sessions IS 'Marque les sessions checkout expirées - peut être appelé via cron';

-- =====================================================================================
-- End of Migration
-- =====================================================================================

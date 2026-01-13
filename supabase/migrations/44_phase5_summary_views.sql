-- =============================================
-- Migration: Phase 5 - Summary Views (Vues récapitulatives)
-- Description: Vues globales pour dashboard financier
-- Author: Claude Code
-- Date: 2026-01-13
-- =============================================

-- =============================================
-- VIEW: financial_dashboard
-- =============================================

CREATE OR REPLACE VIEW financial_dashboard AS
SELECT
  n.id AS nursery_id,
  n.name AS nursery_name,

  -- Factures
  COUNT(DISTINCT i.id) AS total_invoices,
  COUNT(DISTINCT i.id) FILTER (WHERE i.status = 'sent') AS invoices_sent,
  COUNT(DISTINCT i.id) FILTER (WHERE i.status = 'paid') AS invoices_paid,
  COUNT(DISTINCT i.id) FILTER (WHERE i.status = 'overdue') AS invoices_overdue,

  -- Montants
  COALESCE(SUM(i.total_amount) FILTER (WHERE i.status NOT IN ('cancelled', 'credited')), 0) AS total_billed,
  COALESCE(SUM(i.paid_amount) FILTER (WHERE i.status NOT IN ('cancelled', 'credited')), 0) AS total_collected,
  COALESCE(SUM(i.remaining_amount) FILTER (WHERE i.status IN ('sent', 'partially_paid', 'overdue')), 0) AS total_outstanding,

  -- Taux de paiement
  CASE
    WHEN SUM(i.total_amount) FILTER (WHERE i.status NOT IN ('cancelled', 'credited')) > 0 THEN
      ROUND((SUM(i.paid_amount) FILTER (WHERE i.status NOT IN ('cancelled', 'credited')) /
             SUM(i.total_amount) FILTER (WHERE i.status NOT IN ('cancelled', 'credited'))) * 100, 2)
    ELSE 0
  END AS payment_rate_percent,

  -- Paiements
  COUNT(DISTINCT p.id) AS total_payments,
  COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'validated'), 0) AS total_payments_amount,

  -- Avoirs
  COUNT(DISTINCT cn.id) AS total_credit_notes,
  COALESCE(SUM(cn.amount), 0) AS total_credit_notes_amount,

  -- Relances
  COUNT(DISTINCT dc.id) AS total_reminders,
  COUNT(DISTINCT dc.id) FILTER (WHERE dc.status = 'pending') AS reminders_pending,

  -- Période actuelle (mois en cours)
  DATE_TRUNC('month', CURRENT_DATE)::DATE AS current_period_start,
  (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::DATE AS current_period_end

FROM nursery n
LEFT JOIN invoice i ON n.id = i.nursery_id
LEFT JOIN payment p ON n.id = p.nursery_id
LEFT JOIN credit_note cn ON n.id = cn.nursery_id
LEFT JOIN debt_collection dc ON n.id = dc.nursery_id
GROUP BY n.id, n.name;

COMMENT ON VIEW financial_dashboard IS 'Vue dashboard financier global par crèche';

-- =============================================
-- VIEW: monthly_revenue_report
-- =============================================

CREATE OR REPLACE VIEW monthly_revenue_report AS
SELECT
  i.nursery_id,
  n.name AS nursery_name,
  DATE_TRUNC('month', i.billing_period_start)::DATE AS month,
  TO_CHAR(i.billing_period_start, 'TMMonth YYYY') AS month_name,

  -- Factures
  COUNT(i.id) AS invoices_count,
  COALESCE(SUM(i.total_amount), 0) AS revenue,
  COALESCE(SUM(i.paid_amount), 0) AS collected,
  COALESCE(SUM(i.remaining_amount), 0) AS outstanding,

  -- Part CAF vs Famille
  COALESCE(SUM(i.caf_participation), 0) AS caf_share,
  COALESCE(SUM(i.family_share), 0) AS family_share,

  -- Taux de paiement
  CASE
    WHEN SUM(i.total_amount) > 0 THEN
      ROUND((SUM(i.paid_amount) / SUM(i.total_amount)) * 100, 2)
    ELSE 0
  END AS payment_rate

FROM invoice i
JOIN nursery n ON i.nursery_id = n.id
WHERE i.status NOT IN ('cancelled', 'credited')
GROUP BY i.nursery_id, n.name, DATE_TRUNC('month', i.billing_period_start), TO_CHAR(i.billing_period_start, 'TMMonth YYYY')
ORDER BY i.nursery_id, month DESC;

COMMENT ON VIEW monthly_revenue_report IS 'Rapport mensuel du chiffre d''affaires par crèche';

-- =============================================
-- VIEW: family_financial_status
-- =============================================

CREATE OR REPLACE VIEW family_financial_status AS
SELECT
  f.id AS family_id,
  f.family_name,
  f.enterprise_id,

  -- Factures
  COUNT(DISTINCT i.id) AS total_invoices,
  COALESCE(SUM(i.total_amount) FILTER (WHERE i.status NOT IN ('cancelled', 'credited')), 0) AS total_billed,
  COALESCE(SUM(i.paid_amount) FILTER (WHERE i.status NOT IN ('cancelled', 'credited')), 0) AS total_paid,
  COALESCE(SUM(i.remaining_amount) FILTER (WHERE i.status IN ('sent', 'partially_paid', 'overdue')), 0) AS balance_due,

  -- Factures impayées
  COUNT(DISTINCT i.id) FILTER (WHERE i.status = 'overdue') AS overdue_invoices,
  COALESCE(SUM(i.remaining_amount) FILTER (WHERE i.status = 'overdue'), 0) AS overdue_amount,

  -- Dernière facture
  MAX(i.invoice_date) AS last_invoice_date,

  -- Dernier paiement
  MAX(p.payment_date) AS last_payment_date,
  (
    SELECT p2.amount
    FROM payment p2
    WHERE p2.family_id = f.id
    ORDER BY p2.payment_date DESC, p2.created_at DESC
    LIMIT 1
  ) AS last_payment_amount,

  -- Relances
  COUNT(DISTINCT dc.id) AS total_reminders,
  MAX(dc.reminder_date) AS last_reminder_date,
  (
    SELECT dc2.reminder_type
    FROM debt_collection dc2
    WHERE dc2.family_id = f.id
    ORDER BY dc2.reminder_date DESC, dc2.created_at DESC
    LIMIT 1
  ) AS last_reminder_type,

  -- Moyens de paiement
  (
    SELECT pm.method_type
    FROM payment_method pm
    WHERE pm.family_id = f.id AND pm.is_default = TRUE
    LIMIT 1
  ) AS default_payment_method

FROM family f
LEFT JOIN invoice i ON f.id = i.family_id
LEFT JOIN payment p ON f.id = p.family_id
LEFT JOIN debt_collection dc ON f.id = dc.family_id
GROUP BY f.id, f.family_name, f.enterprise_id;

COMMENT ON VIEW family_financial_status IS 'Statut financier global par famille (solde, impayés, historique)';

-- =============================================
-- VIEW: invoice_aging_report
-- =============================================

CREATE OR REPLACE VIEW invoice_aging_report AS
SELECT
  i.id AS invoice_id,
  i.invoice_number,
  i.nursery_id,
  n.name AS nursery_name,
  i.family_id,
  f.family_name,
  i.invoice_date,
  i.due_date,
  i.total_amount,
  i.paid_amount,
  i.remaining_amount,
  i.status,

  -- Âge de la facture
  (CURRENT_DATE - i.due_date) AS days_overdue,

  -- Classification par âge
  CASE
    WHEN i.due_date >= CURRENT_DATE THEN 'current'
    WHEN (CURRENT_DATE - i.due_date) BETWEEN 1 AND 30 THEN '1-30_days'
    WHEN (CURRENT_DATE - i.due_date) BETWEEN 31 AND 60 THEN '31-60_days'
    WHEN (CURRENT_DATE - i.due_date) BETWEEN 61 AND 90 THEN '61-90_days'
    WHEN (CURRENT_DATE - i.due_date) > 90 THEN 'over_90_days'
  END AS aging_bucket,

  -- Dernière relance
  (
    SELECT dc.reminder_type
    FROM debt_collection dc
    WHERE dc.invoice_id = i.id
    ORDER BY dc.reminder_date DESC
    LIMIT 1
  ) AS last_reminder_type,

  (
    SELECT dc.reminder_date
    FROM debt_collection dc
    WHERE dc.invoice_id = i.id
    ORDER BY dc.reminder_date DESC
    LIMIT 1
  ) AS last_reminder_date

FROM invoice i
JOIN nursery n ON i.nursery_id = n.id
JOIN family f ON i.family_id = f.id
WHERE i.status IN ('sent', 'partially_paid', 'overdue')
  AND i.remaining_amount > 0
ORDER BY days_overdue DESC, i.remaining_amount DESC;

COMMENT ON VIEW invoice_aging_report IS 'Rapport d''ancienneté des factures impayées (aging)';

-- =============================================
-- VIEW: payment_method_usage
-- =============================================

CREATE OR REPLACE VIEW payment_method_usage AS
SELECT
  pm.method_type,
  COUNT(DISTINCT pm.id) AS families_count,
  COUNT(DISTINCT p.id) AS payments_count,
  COALESCE(SUM(p.amount), 0) AS total_amount,
  AVG(p.amount) AS avg_payment_amount
FROM payment_method pm
LEFT JOIN payment p ON pm.id = p.payment_method_id AND p.status = 'validated'
GROUP BY pm.method_type
ORDER BY total_amount DESC;

COMMENT ON VIEW payment_method_usage IS 'Utilisation des moyens de paiement (statistiques)';

-- =============================================
-- FUNCTION: Get financial KPIs for period
-- =============================================

CREATE OR REPLACE FUNCTION get_financial_kpis(
  p_nursery_id UUID,
  p_period_start DATE,
  p_period_end DATE
)
RETURNS TABLE(
  kpi_name VARCHAR,
  kpi_value DECIMAL,
  kpi_unit VARCHAR
) AS $$
BEGIN
  RETURN QUERY

  -- Chiffre d'affaires
  SELECT
    'revenue'::VARCHAR,
    COALESCE(SUM(i.total_amount), 0),
    'EUR'::VARCHAR
  FROM invoice i
  WHERE i.nursery_id = p_nursery_id
    AND i.billing_period_start >= p_period_start
    AND i.billing_period_end <= p_period_end
    AND i.status NOT IN ('cancelled', 'credited')

  UNION ALL

  -- Encaissements
  SELECT
    'collections'::VARCHAR,
    COALESCE(SUM(p.amount), 0),
    'EUR'::VARCHAR
  FROM payment p
  WHERE p.nursery_id = p_nursery_id
    AND p.payment_date BETWEEN p_period_start AND p_period_end
    AND p.status = 'validated'

  UNION ALL

  -- Impayés
  SELECT
    'outstanding'::VARCHAR,
    COALESCE(SUM(i.remaining_amount), 0),
    'EUR'::VARCHAR
  FROM invoice i
  WHERE i.nursery_id = p_nursery_id
    AND i.status IN ('sent', 'partially_paid', 'overdue')
    AND i.remaining_amount > 0

  UNION ALL

  -- Taux de paiement
  SELECT
    'payment_rate'::VARCHAR,
    CASE
      WHEN SUM(i.total_amount) > 0 THEN
        ROUND((SUM(i.paid_amount) / SUM(i.total_amount)) * 100, 2)
      ELSE 0
    END,
    '%'::VARCHAR
  FROM invoice i
  WHERE i.nursery_id = p_nursery_id
    AND i.billing_period_start >= p_period_start
    AND i.billing_period_end <= p_period_end
    AND i.status NOT IN ('cancelled', 'credited')

  UNION ALL

  -- Nombre de familles facturées
  SELECT
    'families_billed'::VARCHAR,
    COUNT(DISTINCT i.family_id)::DECIMAL,
    'count'::VARCHAR
  FROM invoice i
  WHERE i.nursery_id = p_nursery_id
    AND i.billing_period_start >= p_period_start
    AND i.billing_period_end <= p_period_end
    AND i.status NOT IN ('cancelled', 'credited')

  UNION ALL

  -- Montant moyen par facture
  SELECT
    'avg_invoice_amount'::VARCHAR,
    COALESCE(AVG(i.total_amount), 0),
    'EUR'::VARCHAR
  FROM invoice i
  WHERE i.nursery_id = p_nursery_id
    AND i.billing_period_start >= p_period_start
    AND i.billing_period_end <= p_period_end
    AND i.status NOT IN ('cancelled', 'credited');

END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_financial_kpis IS 'Retourne les KPIs financiers pour une période donnée';

-- =============================================
-- End of Migration
-- =============================================

-- =============================================
-- Migration: Phase 5 - Accounting (Comptabilité)
-- Description: Exports comptables et écritures (FEC, etc.)
-- Author: Claude Code
-- Date: 2026-01-13
-- =============================================

-- =============================================
-- ENUMS
-- =============================================

-- Formats d'export comptable
CREATE TYPE accounting_export_format AS ENUM (
  'fec',         -- FEC (Fichier des Écritures Comptables) - Obligatoire France
  'csv',         -- CSV générique
  'excel',       -- Excel
  'sage',        -- Sage Compta
  'cegid',       -- Cegid
  'ebp',         -- EBP Compta
  'quickbooks',  -- QuickBooks
  'custom'       -- Format personnalisé
);

-- Types d'écriture comptable
CREATE TYPE ledger_entry_type AS ENUM (
  'invoice',      -- Facturation
  'payment',      -- Encaissement
  'credit_note',  -- Avoir
  'expense',      -- Dépense
  'adjustment',   -- Ajustement
  'opening',      -- À nouveau
  'closing'       -- Clôture
);

-- =============================================
-- TABLE: accounting_export
-- =============================================

CREATE TABLE accounting_export (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nursery_id UUID NOT NULL REFERENCES nursery(id) ON DELETE CASCADE,

  -- Export
  export_date DATE NOT NULL DEFAULT CURRENT_DATE,
  export_format accounting_export_format NOT NULL,

  -- Période exportée
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Fichier généré
  file_url TEXT NOT NULL,                          -- URL Supabase Storage
  file_name VARCHAR(255) NOT NULL,
  file_size INTEGER,                               -- Taille en octets
  mime_type VARCHAR(50),

  -- Statistiques
  records_count INTEGER NOT NULL DEFAULT 0,        -- Nombre d'écritures exportées
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,   -- Montant total

  -- Qui a exporté
  exported_by_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Notes
  notes TEXT,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Contraintes
  CONSTRAINT accounting_export_dates_check CHECK (period_end >= period_start),
  CONSTRAINT accounting_export_records_positive CHECK (records_count >= 0),
  CONSTRAINT accounting_export_size_positive CHECK (file_size IS NULL OR file_size > 0)
);

-- Commentaires
COMMENT ON TABLE accounting_export IS 'Historique des exports comptables vers logiciels externes';
COMMENT ON COLUMN accounting_export.export_format IS 'Format: fec, csv, excel, sage, cegid, ebp, quickbooks, custom';
COMMENT ON COLUMN accounting_export.file_url IS 'URL du fichier exporté (Supabase Storage)';
COMMENT ON COLUMN accounting_export.records_count IS 'Nombre d''écritures comptables exportées';

-- Index
CREATE INDEX idx_accounting_export_nursery ON accounting_export(nursery_id);
CREATE INDEX idx_accounting_export_date ON accounting_export(export_date);
CREATE INDEX idx_accounting_export_period ON accounting_export(period_start, period_end);
CREATE INDEX idx_accounting_export_format ON accounting_export(export_format);
CREATE INDEX idx_accounting_export_exported_by ON accounting_export(exported_by_id);

-- =============================================
-- TABLE: ledger_entry
-- =============================================

CREATE TABLE ledger_entry (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nursery_id UUID NOT NULL REFERENCES nursery(id) ON DELETE CASCADE,

  -- Date et type
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  entry_type ledger_entry_type NOT NULL,

  -- Références sources
  invoice_id UUID REFERENCES invoice(id) ON DELETE SET NULL,
  payment_id UUID REFERENCES payment(id) ON DELETE SET NULL,
  credit_note_id UUID REFERENCES credit_note(id) ON DELETE SET NULL,

  -- Comptabilité (plan comptable français)
  account_code VARCHAR(20) NOT NULL,              -- Code compte (ex: "706000", "411000")
  account_name VARCHAR(255),                      -- Nom du compte

  -- Journal comptable
  journal_code VARCHAR(10),                       -- Code journal (ex: "VE", "BA", "OD")
  journal_name VARCHAR(100),                      -- Nom journal (ex: "Ventes", "Banque")

  -- Pièce comptable
  piece_reference VARCHAR(50),                    -- Référence pièce (n° facture, paiement, etc.)
  piece_date DATE,

  -- Montants
  debit DECIMAL(10,2) NOT NULL DEFAULT 0,         -- Montant débit
  credit DECIMAL(10,2) NOT NULL DEFAULT 0,        -- Montant crédit

  -- Description
  description TEXT NOT NULL,                      -- Libellé écriture

  -- Lettrage (rapprochement)
  lettering_code VARCHAR(10),                     -- Code lettrage (ex: "AA", "AB")
  lettered_date DATE,                             -- Date lettrage

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Contraintes
  CONSTRAINT ledger_entry_amounts_check CHECK (
    (debit > 0 AND credit = 0) OR
    (credit > 0 AND debit = 0)
  )
);

-- Commentaires
COMMENT ON TABLE ledger_entry IS 'Écritures comptables (journal, grand livre)';
COMMENT ON COLUMN ledger_entry.entry_type IS 'Type: invoice, payment, credit_note, expense, adjustment, opening, closing';
COMMENT ON COLUMN ledger_entry.account_code IS 'Code compte comptable (plan comptable français)';
COMMENT ON COLUMN ledger_entry.journal_code IS 'Code journal comptable (VE=Ventes, BA=Banque, OD=Opérations diverses)';
COMMENT ON COLUMN ledger_entry.debit IS 'Montant débit (doit être > 0 si crédit = 0)';
COMMENT ON COLUMN ledger_entry.credit IS 'Montant crédit (doit être > 0 si débit = 0)';
COMMENT ON COLUMN ledger_entry.lettering_code IS 'Code lettrage pour rapprochement (ex: AA, AB, AC...)';

-- Index
CREATE INDEX idx_ledger_entry_nursery ON ledger_entry(nursery_id);
CREATE INDEX idx_ledger_entry_date ON ledger_entry(entry_date);
CREATE INDEX idx_ledger_entry_type ON ledger_entry(entry_type);
CREATE INDEX idx_ledger_entry_account ON ledger_entry(account_code);
CREATE INDEX idx_ledger_entry_journal ON ledger_entry(journal_code);
CREATE INDEX idx_ledger_entry_invoice ON ledger_entry(invoice_id);
CREATE INDEX idx_ledger_entry_payment ON ledger_entry(payment_id);
CREATE INDEX idx_ledger_entry_credit_note ON ledger_entry(credit_note_id);
CREATE INDEX idx_ledger_entry_lettering ON ledger_entry(lettering_code) WHERE lettering_code IS NOT NULL;

-- =============================================
-- FUNCTION: Generate FEC export
-- =============================================

CREATE OR REPLACE FUNCTION generate_fec_export(
  p_nursery_id UUID,
  p_year INTEGER
)
RETURNS TEXT AS $$
DECLARE
  v_line TEXT;
  v_output TEXT := '';
  v_entry RECORD;
  v_siren VARCHAR(14) := '00000000000000'; -- À remplacer par le SIREN réel
BEGIN
  -- Header FEC (séparateur pipe |)
  v_output := 'JournalCode|JournalLib|EcritureNum|EcritureDate|CompteNum|CompteLib|CompAuxNum|CompAuxLib|PieceRef|PieceDate|EcritureLib|Debit|Credit|EcritureLet|DateLet|ValidDate|Montantdevise|Idevise' || E'\n';

  -- Pour chaque écriture de l'année
  FOR v_entry IN
    SELECT
      COALESCE(le.journal_code, 'VE') AS journal_code,
      COALESCE(le.journal_name, 'Ventes') AS journal_lib,
      COALESCE(le.piece_reference, le.id::TEXT) AS ecriture_num,
      TO_CHAR(le.entry_date, 'YYYYMMDD') AS ecriture_date,
      le.account_code AS compte_num,
      COALESCE(le.account_name, 'Compte ' || le.account_code) AS compte_lib,
      '' AS comp_aux_num,
      '' AS comp_aux_lib,
      COALESCE(le.piece_reference, '') AS piece_ref,
      COALESCE(TO_CHAR(le.piece_date, 'YYYYMMDD'), '') AS piece_date,
      SUBSTRING(le.description FROM 1 FOR 100) AS ecriture_lib,
      REPLACE(le.debit::TEXT, '.', ',') AS debit,
      REPLACE(le.credit::TEXT, '.', ',') AS credit,
      COALESCE(le.lettering_code, '') AS ecriture_let,
      COALESCE(TO_CHAR(le.lettered_date, 'YYYYMMDD'), '') AS date_let,
      TO_CHAR(le.created_at, 'YYYYMMDD') AS valid_date,
      '' AS montant_devise,
      'EUR' AS idevise
    FROM ledger_entry le
    WHERE le.nursery_id = p_nursery_id
      AND EXTRACT(YEAR FROM le.entry_date) = p_year
    ORDER BY le.entry_date, le.journal_code, le.id
  LOOP
    v_line := v_entry.journal_code || '|' ||
              v_entry.journal_lib || '|' ||
              v_entry.ecriture_num || '|' ||
              v_entry.ecriture_date || '|' ||
              v_entry.compte_num || '|' ||
              v_entry.compte_lib || '|' ||
              v_entry.comp_aux_num || '|' ||
              v_entry.comp_aux_lib || '|' ||
              v_entry.piece_ref || '|' ||
              v_entry.piece_date || '|' ||
              v_entry.ecriture_lib || '|' ||
              v_entry.debit || '|' ||
              v_entry.credit || '|' ||
              v_entry.ecriture_let || '|' ||
              v_entry.date_let || '|' ||
              v_entry.valid_date || '|' ||
              v_entry.montant_devise || '|' ||
              v_entry.idevise;

    v_output := v_output || v_line || E'\n';
  END LOOP;

  RETURN v_output;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_fec_export IS 'Génère un export FEC (Fichier des Écritures Comptables) pour une année donnée';

-- =============================================
-- FUNCTION: Create ledger entries from invoice
-- =============================================

CREATE OR REPLACE FUNCTION create_ledger_entries_from_invoice(p_invoice_id UUID)
RETURNS VOID AS $$
DECLARE
  v_invoice RECORD;
  v_nursery_id UUID;
BEGIN
  -- Récupérer les infos de la facture
  SELECT
    i.id,
    i.nursery_id,
    i.invoice_number,
    i.invoice_date,
    i.total_amount,
    i.family_id,
    f.family_name
  INTO v_invoice
  FROM invoice i
  JOIN family f ON i.family_id = f.id
  WHERE i.id = p_invoice_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice % not found', p_invoice_id;
  END IF;

  v_nursery_id = v_invoice.nursery_id;

  -- Écriture 1: Débit compte client (411xxx)
  INSERT INTO ledger_entry (
    nursery_id,
    entry_date,
    entry_type,
    invoice_id,
    account_code,
    account_name,
    journal_code,
    journal_name,
    piece_reference,
    piece_date,
    description,
    debit,
    credit
  ) VALUES (
    v_nursery_id,
    v_invoice.invoice_date,
    'invoice',
    v_invoice.id,
    '411' || SUBSTRING(v_invoice.family_id::TEXT FROM 1 FOR 3), -- Compte client
    'Client - ' || v_invoice.family_name,
    'VE',
    'Ventes',
    v_invoice.invoice_number,
    v_invoice.invoice_date,
    'Facture ' || v_invoice.invoice_number || ' - ' || v_invoice.family_name,
    v_invoice.total_amount,
    0
  );

  -- Écriture 2: Crédit compte produit (706xxx - Prestations de services)
  INSERT INTO ledger_entry (
    nursery_id,
    entry_date,
    entry_type,
    invoice_id,
    account_code,
    account_name,
    journal_code,
    journal_name,
    piece_reference,
    piece_date,
    description,
    debit,
    credit
  ) VALUES (
    v_nursery_id,
    v_invoice.invoice_date,
    'invoice',
    v_invoice.id,
    '706000', -- Prestations de services (garde d'enfants)
    'Prestations de services - Garde d''enfants',
    'VE',
    'Ventes',
    v_invoice.invoice_number,
    v_invoice.invoice_date,
    'Facture ' || v_invoice.invoice_number || ' - ' || v_invoice.family_name,
    0,
    v_invoice.total_amount
  );

END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_ledger_entries_from_invoice IS 'Crée les écritures comptables automatiquement lors de la création d''une facture';

-- =============================================
-- FUNCTION: Create ledger entries from payment
-- =============================================

CREATE OR REPLACE FUNCTION create_ledger_entries_from_payment(p_payment_id UUID)
RETURNS VOID AS $$
DECLARE
  v_payment RECORD;
  v_invoice RECORD;
  v_nursery_id UUID;
  v_bank_account_code VARCHAR(20) := '512000'; -- Compte banque par défaut
BEGIN
  -- Récupérer les infos du paiement
  SELECT
    p.id,
    p.nursery_id,
    p.payment_number,
    p.payment_date,
    p.amount,
    p.invoice_id,
    p.family_id,
    f.family_name,
    pm.method_type
  INTO v_payment
  FROM payment p
  JOIN family f ON p.family_id = f.id
  LEFT JOIN payment_method pm ON p.payment_method_id = pm.id
  WHERE p.id = p_payment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment % not found', p_payment_id;
  END IF;

  v_nursery_id = v_payment.nursery_id;

  -- Déterminer le compte banque selon la méthode de paiement
  IF v_payment.method_type = 'cash' THEN
    v_bank_account_code = '530000'; -- Caisse
  ELSIF v_payment.method_type = 'check' THEN
    v_bank_account_code = '512000'; -- Banque
  ELSIF v_payment.method_type IN ('bank_transfer', 'direct_debit', 'stripe') THEN
    v_bank_account_code = '512000'; -- Banque
  END IF;

  -- Récupérer la facture associée si elle existe
  IF v_payment.invoice_id IS NOT NULL THEN
    SELECT invoice_number, family_id INTO v_invoice
    FROM invoice
    WHERE id = v_payment.invoice_id;
  END IF;

  -- Écriture 1: Débit compte banque/caisse
  INSERT INTO ledger_entry (
    nursery_id,
    entry_date,
    entry_type,
    payment_id,
    invoice_id,
    account_code,
    account_name,
    journal_code,
    journal_name,
    piece_reference,
    piece_date,
    description,
    debit,
    credit
  ) VALUES (
    v_nursery_id,
    v_payment.payment_date,
    'payment',
    v_payment.id,
    v_payment.invoice_id,
    v_bank_account_code,
    CASE WHEN v_payment.method_type = 'cash' THEN 'Caisse' ELSE 'Banque' END,
    'BA',
    'Banque',
    v_payment.payment_number,
    v_payment.payment_date,
    'Paiement ' || v_payment.payment_number || ' - ' || v_payment.family_name,
    v_payment.amount,
    0
  );

  -- Écriture 2: Crédit compte client
  INSERT INTO ledger_entry (
    nursery_id,
    entry_date,
    entry_type,
    payment_id,
    invoice_id,
    account_code,
    account_name,
    journal_code,
    journal_name,
    piece_reference,
    piece_date,
    description,
    debit,
    credit
  ) VALUES (
    v_nursery_id,
    v_payment.payment_date,
    'payment',
    v_payment.id,
    v_payment.invoice_id,
    '411' || SUBSTRING(v_payment.family_id::TEXT FROM 1 FOR 3),
    'Client - ' || v_payment.family_name,
    'BA',
    'Banque',
    v_payment.payment_number,
    v_payment.payment_date,
    'Paiement ' || v_payment.payment_number || ' - ' || v_payment.family_name,
    0,
    v_payment.amount
  );

END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_ledger_entries_from_payment IS 'Crée les écritures comptables automatiquement lors de l''enregistrement d''un paiement';

-- =============================================
-- VIEW: ledger_balance
-- =============================================

CREATE OR REPLACE VIEW ledger_balance AS
SELECT
  nursery_id,
  account_code,
  account_name,
  SUM(debit) AS total_debit,
  SUM(credit) AS total_credit,
  SUM(debit) - SUM(credit) AS balance
FROM ledger_entry
GROUP BY nursery_id, account_code, account_name;

COMMENT ON VIEW ledger_balance IS 'Balance des comptes comptables (soldes par compte)';

-- =============================================
-- VIEW: accounting_export_summary
-- =============================================

CREATE OR REPLACE VIEW accounting_export_summary AS
SELECT
  ae.id,
  ae.nursery_id,
  n.name AS nursery_name,
  ae.export_date,
  ae.export_format,
  ae.period_start,
  ae.period_end,
  ae.file_name,
  ae.file_url,
  ae.records_count,
  ae.total_amount,
  COALESCE(exporter.first_name || ' ' || exporter.last_name, 'Système') AS exported_by,
  ae.created_at
FROM accounting_export ae
JOIN nursery n ON ae.nursery_id = n.id
LEFT JOIN profiles exporter ON ae.exported_by_id = exporter.id;

COMMENT ON VIEW accounting_export_summary IS 'Vue résumé des exports comptables';

-- =============================================
-- End of Migration
-- =============================================

-- =====================================================
-- Migration 16: Phase 2 - Présences & Pointages
-- =====================================================
-- Tables: attendance, check_in, check_out, absence
-- Description: Système de pointage arrivée/départ et gestion des absences
-- =====================================================

-- Table 1: attendance (Présences quotidiennes)
-- =====================================================
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL REFERENCES child(id) ON DELETE CASCADE,
  nursery_id UUID NOT NULL REFERENCES nursery(id) ON DELETE CASCADE,

  date DATE NOT NULL,

  -- Statut de présence
  status VARCHAR(20) NOT NULL CHECK (status IN ('present', 'absent', 'late', 'partial')),
  absence_reason VARCHAR(50) CHECK (absence_reason IN ('sick', 'vacation', 'family_event', 'other')),
  absence_notes TEXT,

  -- Horaires prévus (du contrat)
  scheduled_arrival_time TIME,
  scheduled_departure_time TIME,

  -- Horaires réels
  actual_arrival_time TIME,
  actual_departure_time TIME,

  -- Durée calculée automatiquement via trigger
  total_hours DECIMAL(4,2),

  -- Traçabilité des pointages
  checked_in_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  checked_out_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Personnes qui déposent/récupèrent
  dropped_by VARCHAR(255),
  picked_by VARCHAR(255),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Contrainte: une seule ligne par enfant par jour
  CONSTRAINT unique_child_date UNIQUE(child_id, date)
);

-- Indices pour performances
CREATE INDEX idx_attendance_child ON attendance(child_id);
CREATE INDEX idx_attendance_nursery_date ON attendance(nursery_id, date);
CREATE INDEX idx_attendance_status ON attendance(status);
CREATE INDEX idx_attendance_child_date ON attendance(child_id, date DESC);

-- Commentaires
COMMENT ON TABLE attendance IS 'Présences quotidiennes des enfants';
COMMENT ON COLUMN attendance.status IS 'present, absent, late, partial';
COMMENT ON COLUMN attendance.total_hours IS 'Durée calculée automatiquement';


-- Table 2: check_in (Détails pointage arrivée)
-- =====================================================
CREATE TABLE IF NOT EXISTS check_in (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  attendance_id UUID NOT NULL REFERENCES attendance(id) ON DELETE CASCADE,

  -- Heure précise du pointage
  checked_in_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  checked_in_by_id UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,

  -- Qui a déposé l'enfant ?
  dropped_by VARCHAR(255) NOT NULL,
  dropped_by_relation VARCHAR(50) CHECK (dropped_by_relation IN ('mother', 'father', 'grandparent', 'other')),
  dropped_by_signature TEXT,

  -- État de l'enfant à l'arrivée
  temperature DECIMAL(3,1),
  mood VARCHAR(20) CHECK (mood IN ('happy', 'sad', 'tired', 'grumpy', 'neutral')),
  special_notes TEXT,

  -- Items apportés
  brought_diapers BOOLEAN DEFAULT FALSE,
  brought_clothes BOOLEAN DEFAULT FALSE,
  brought_medication BOOLEAN DEFAULT FALSE,
  medication_notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_check_in_attendance ON check_in(attendance_id);
CREATE INDEX idx_check_in_time ON check_in(checked_in_at);

COMMENT ON TABLE check_in IS 'Détails du pointage d''arrivée de l''enfant';


-- Table 3: check_out (Détails pointage départ)
-- =====================================================
CREATE TABLE IF NOT EXISTS check_out (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  attendance_id UUID NOT NULL REFERENCES attendance(id) ON DELETE CASCADE,

  -- Heure précise du pointage
  checked_out_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  checked_out_by_id UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,

  -- Qui récupère l'enfant ?
  picked_by VARCHAR(255) NOT NULL,
  picked_by_relation VARCHAR(50) CHECK (picked_by_relation IN ('mother', 'father', 'grandparent', 'authorized_person', 'other')),
  picked_by_signature TEXT,
  id_verified BOOLEAN DEFAULT FALSE,

  -- Résumé de la journée
  day_summary TEXT,
  mood_at_pickup VARCHAR(20) CHECK (mood_at_pickup IN ('happy', 'sad', 'tired', 'grumpy', 'neutral')),
  incidents_reported BOOLEAN DEFAULT FALSE,
  incident_description TEXT,

  -- Items retournés
  returned_diapers BOOLEAN DEFAULT FALSE,
  returned_clothes BOOLEAN DEFAULT FALSE,
  items_missing TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_check_out_attendance ON check_out(attendance_id);
CREATE INDEX idx_check_out_time ON check_out(checked_out_at);

COMMENT ON TABLE check_out IS 'Détails du pointage de départ de l''enfant';


-- Table 4: absence (Absences déclarées à l'avance)
-- =====================================================
CREATE TABLE IF NOT EXISTS absence (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL REFERENCES child(id) ON DELETE CASCADE,
  nursery_id UUID NOT NULL REFERENCES nursery(id) ON DELETE CASCADE,

  start_date DATE NOT NULL,
  end_date DATE NOT NULL,

  reason VARCHAR(50) NOT NULL CHECK (reason IN ('sick', 'vacation', 'family_event', 'medical_appointment', 'other')),
  description TEXT,

  -- Justificatif médical
  medical_certificate_url TEXT,
  medical_certificate_uploaded_at TIMESTAMPTZ,

  -- Notification
  declared_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  declared_at TIMESTAMPTZ DEFAULT NOW(),
  notified_by VARCHAR(100) CHECK (notified_by IN ('phone', 'email', 'app', 'in_person')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Contrainte: end_date >= start_date
  CONSTRAINT valid_absence_dates CHECK (end_date >= start_date)
);

CREATE INDEX idx_absence_child ON absence(child_id);
CREATE INDEX idx_absence_nursery ON absence(nursery_id);
CREATE INDEX idx_absence_dates ON absence(start_date, end_date);
CREATE INDEX idx_absence_reason ON absence(reason);

COMMENT ON TABLE absence IS 'Absences déclarées à l''avance';


-- =====================================================
-- Triggers et Fonctions
-- =====================================================

-- Fonction: Calculer total_hours automatiquement
CREATE OR REPLACE FUNCTION calculate_attendance_hours()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.actual_arrival_time IS NOT NULL AND NEW.actual_departure_time IS NOT NULL THEN
    -- Calculer la différence en heures (format décimal)
    NEW.total_hours := EXTRACT(EPOCH FROM (NEW.actual_departure_time - NEW.actual_arrival_time)) / 3600;
  ELSE
    NEW.total_hours := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour calculer les heures automatiquement
CREATE TRIGGER trigger_calculate_attendance_hours
  BEFORE INSERT OR UPDATE ON attendance
  FOR EACH ROW
  EXECUTE FUNCTION calculate_attendance_hours();

COMMENT ON FUNCTION calculate_attendance_hours IS 'Calcule automatiquement total_hours = actual_departure_time - actual_arrival_time';


-- Fonction: Mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers pour updated_at
CREATE TRIGGER trigger_attendance_updated_at
  BEFORE UPDATE ON attendance
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_absence_updated_at
  BEFORE UPDATE ON absence
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();


-- =====================================================
-- Row Level Security (RLS)
-- =====================================================
-- Désactivé pour développement (activé en production)

-- ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE check_in ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE check_out ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE absence ENABLE ROW LEVEL SECURITY;


-- =====================================================
-- Fin Migration 16
-- =====================================================

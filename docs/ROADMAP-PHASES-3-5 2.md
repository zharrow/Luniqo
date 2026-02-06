# Roadmap Luniqo - Phases 3 à 9 (Détail Complet)

Ce document complète le ROADMAP.md principal avec le détail exhaustif des phases 3 à 5.

---

# 🎯 PHASE 3: PERSONNEL & PLANNING RH

## 3.1 Architecture de Données

### Objectif
Gestion avancée du personnel au-delà des fonctionnalités de base : qualifications professionnelles, documents RH, planning shifts, congés, disponibilités, et conformité réglementaire (taux d'encadrement).

### Tables à Créer

#### 3.1.1 Table `staff_qualification` (Qualifications professionnelles)
**Objectif**: Tracer les diplômes, certifications et qualifications du personnel

```sql
CREATE TABLE staff_qualification (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  qualification_type VARCHAR(50) NOT NULL,      -- Type de qualification
  -- Types: 'diploma', 'certification', 'training', 'first_aid', 'cpr',
  --        'food_safety', 'child_protection', 'management'

  qualification_name VARCHAR(255) NOT NULL,     -- Nom du diplôme/certification
  -- Ex: 'CAP Petite Enfance', 'Auxiliaire de puériculture',
  --     'EJE', 'PSC1', 'HACCP', 'Directeur d'établissement'

  issuing_organization VARCHAR(255),            -- Organisme émetteur
  issue_date DATE NOT NULL,                     -- Date d'obtention
  expiry_date DATE,                             -- Date d'expiration (si applicable)

  certificate_number VARCHAR(100),              -- Numéro du certificat
  document_url TEXT,                            -- Scan du diplôme/certificat (Supabase Storage)

  -- Équivalence niveau
  qualification_level VARCHAR(20),              -- 'CAP', 'BEP', 'BAC', 'BAC+2', 'BAC+3', 'BAC+5'

  -- Statut
  is_verified BOOLEAN DEFAULT FALSE,            -- Vérifié par direction
  verified_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,

  is_active BOOLEAN DEFAULT TRUE,               -- Toujours valide

  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_staff_qualification_employee ON staff_qualification(employee_id);
CREATE INDEX idx_staff_qualification_type ON staff_qualification(qualification_type);
CREATE INDEX idx_staff_qualification_expiry ON staff_qualification(expiry_date);
CREATE INDEX idx_staff_qualification_active ON staff_qualification(is_active);
```

**Qualifications critiques pour crèches françaises**:
- CAP Accompagnant Éducatif Petite Enfance (CAP AEPE)
- Auxiliaire de puériculture (AP)
- Éducateur de Jeunes Enfants (EJE)
- Infirmier/Infirmière puéricultrice
- PSC1 (Premiers Secours Civiques niveau 1)
- Formation HACCP

---

#### 3.1.2 Table `staff_document` (Documents RH)
**Objectif**: Stocker tous les documents RH obligatoires

```sql
CREATE TABLE staff_document (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  document_type VARCHAR(50) NOT NULL,           -- Type de document
  -- Types: 'id_card', 'resume', 'work_permit', 'social_security', 'rib',
  --        'criminal_record', 'medical_certificate', 'contract', 'amendment',
  --        'performance_review', 'warning_letter', 'termination_letter'

  file_url TEXT NOT NULL,                       -- URL Supabase Storage
  file_name VARCHAR(255) NOT NULL,
  file_size INTEGER,
  mime_type VARCHAR(50),

  issue_date DATE,                              -- Date d'émission
  expiry_date DATE,                             -- Date d'expiration (si applicable)

  -- Statut
  status VARCHAR(20) DEFAULT 'pending',         -- 'pending', 'approved', 'rejected', 'expired'
  reviewed_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,

  -- Sensibilité
  is_confidential BOOLEAN DEFAULT TRUE,         -- Document confidentiel (RH uniquement)

  uploaded_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_staff_document_employee ON staff_document(employee_id);
CREATE INDEX idx_staff_document_type ON staff_document(document_type);
CREATE INDEX idx_staff_document_status ON staff_document(status);
CREATE INDEX idx_staff_document_expiry ON staff_document(expiry_date);
```

**Documents obligatoires en France**:
- Extrait de casier judiciaire (bulletin n°3)
- Certificat médical d'aptitude
- Diplômes et certifications
- Contrat de travail
- Attestation d'assurance responsabilité civile

---

#### 3.1.3 Table `staff_authorization` (Autorisations et habilitations)
**Objectif**: Gérer les autorisations spécifiques du personnel

```sql
CREATE TABLE staff_authorization (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  nursery_id UUID NOT NULL REFERENCES nursery(id) ON DELETE CASCADE,

  authorization_type VARCHAR(50) NOT NULL,      -- Type d'autorisation
  -- Types: 'administer_medication', 'first_aid', 'emergency_response',
  --        'open_facility', 'close_facility', 'handle_cash',
  --        'access_confidential', 'supervise_staff', 'sign_documents'

  granted_date DATE NOT NULL,
  expiry_date DATE,                             -- NULL = pas d'expiration

  granted_by_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  revoked BOOLEAN DEFAULT FALSE,
  revoked_date DATE,
  revoked_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  revocation_reason TEXT,

  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_staff_authorization_employee ON staff_authorization(employee_id);
CREATE INDEX idx_staff_authorization_nursery ON staff_authorization(nursery_id);
CREATE INDEX idx_staff_authorization_type ON staff_authorization(authorization_type);
CREATE INDEX idx_staff_authorization_revoked ON staff_authorization(revoked);
```

---

#### 3.1.4 Table `staff_shift` (Shifts / Plannings horaires)
**Objectif**: Planifier les shifts de travail du personnel

```sql
CREATE TABLE staff_shift (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  nursery_id UUID NOT NULL REFERENCES nursery(id) ON DELETE CASCADE,

  shift_date DATE NOT NULL,

  start_time TIME NOT NULL,
  end_time TIME NOT NULL,

  -- Pause déjeuner
  break_start_time TIME,
  break_end_time TIME,
  break_duration_minutes INTEGER DEFAULT 0,

  -- Durée effective
  total_hours DECIMAL(4,2),                     -- Calculé automatiquement

  -- Type de shift
  shift_type VARCHAR(20),                       -- 'regular', 'overtime', 'on_call', 'night', 'weekend'

  -- Affectation
  assigned_room_id UUID REFERENCES room(id) ON DELETE SET NULL,
  assigned_section_id UUID REFERENCES section(id) ON DELETE SET NULL,
  role_during_shift VARCHAR(50),                -- 'lead', 'assistant', 'floater', 'support'

  -- Statut
  status VARCHAR(20) DEFAULT 'scheduled',       -- 'scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'

  -- Temps réel (pointage)
  actual_start_time TIMESTAMPTZ,
  actual_end_time TIMESTAMPTZ,
  actual_hours DECIMAL(4,2),

  -- Notes
  notes TEXT,
  cancellation_reason TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE INDEX idx_staff_shift_employee ON staff_shift(employee_id);
CREATE INDEX idx_staff_shift_nursery ON staff_shift(nursery_id);
CREATE INDEX idx_staff_shift_date ON staff_shift(shift_date);
CREATE INDEX idx_staff_shift_status ON staff_shift(status);
CREATE INDEX idx_staff_shift_room ON staff_shift(assigned_room_id);
```

---

#### 3.1.5 Table `staff_absence` (Congés et absences)
**Objectif**: Gérer les congés, arrêts maladie, absences

```sql
CREATE TABLE staff_absence (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  nursery_id UUID NOT NULL REFERENCES nursery(id) ON DELETE CASCADE,

  absence_type VARCHAR(50) NOT NULL,            -- Type d'absence
  -- Types: 'vacation', 'sick_leave', 'maternity_leave', 'paternity_leave',
  --        'unpaid_leave', 'training', 'family_emergency', 'bereavement',
  --        'work_accident', 'childcare', 'medical_appointment'

  start_date DATE NOT NULL,
  end_date DATE NOT NULL,

  -- Durée
  total_days INTEGER,                           -- Nombre de jours ouvrés
  is_partial_day BOOLEAN DEFAULT FALSE,         -- Absence partielle
  partial_hours DECIMAL(4,2),

  -- Justificatif
  justification_required BOOLEAN DEFAULT FALSE,
  justification_document_url TEXT,              -- Certificat médical, etc.
  justification_status VARCHAR(20),             -- 'pending', 'received', 'valid', 'invalid'

  -- Statut demande
  status VARCHAR(20) DEFAULT 'pending',         -- 'pending', 'approved', 'rejected', 'cancelled'
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,

  -- Remplacement
  replaced_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  replacement_notes TEXT,

  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_staff_absence_employee ON staff_absence(employee_id);
CREATE INDEX idx_staff_absence_nursery ON staff_absence(nursery_id);
CREATE INDEX idx_staff_absence_dates ON staff_absence(start_date, end_date);
CREATE INDEX idx_staff_absence_status ON staff_absence(status);
CREATE INDEX idx_staff_absence_type ON staff_absence(absence_type);
```

---

#### 3.1.6 Table `staff_availability` (Disponibilités)
**Objectif**: Gérer les disponibilités et préférences horaires du personnel

```sql
CREATE TABLE staff_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  nursery_id UUID NOT NULL REFERENCES nursery(id) ON DELETE CASCADE,

  -- Période de validité
  valid_from DATE NOT NULL,
  valid_until DATE,                             -- NULL = jusqu'à nouvel ordre

  -- Jour de la semaine
  day_of_week INTEGER NOT NULL,                 -- 0 = Dimanche, 1 = Lundi, ..., 6 = Samedi

  -- Disponibilité
  is_available BOOLEAN DEFAULT TRUE,
  available_start_time TIME,
  available_end_time TIME,

  -- Préférence
  preference VARCHAR(20),                       -- 'preferred', 'available', 'unavailable', 'if_needed'

  -- Contraintes
  max_hours_per_day DECIMAL(4,2),
  max_hours_per_week DECIMAL(5,2),

  notes TEXT,                                   -- Contraintes personnelles

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_staff_availability_employee ON staff_availability(employee_id);
CREATE INDEX idx_staff_availability_nursery ON staff_availability(nursery_id);
CREATE INDEX idx_staff_availability_day ON staff_availability(day_of_week);
CREATE INDEX idx_staff_availability_dates ON staff_availability(valid_from, valid_until);
```

---

#### 3.1.7 Table `staff_assignment` (Affectations salles/sections)
**Objectif**: Historique des affectations du personnel aux salles/sections

```sql
CREATE TABLE staff_assignment (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  nursery_id UUID NOT NULL REFERENCES nursery(id) ON DELETE CASCADE,

  -- Affectation
  assignment_type VARCHAR(20) NOT NULL,         -- 'room', 'section', 'floater'
  room_id UUID REFERENCES room(id) ON DELETE SET NULL,
  section_id UUID REFERENCES section(id) ON DELETE SET NULL,

  -- Rôle
  role VARCHAR(50),                             -- 'lead_educator', 'assistant', 'floater', 'manager'

  -- Période
  start_date DATE NOT NULL,
  end_date DATE,                                -- NULL = affectation en cours

  -- Statut
  is_primary_assignment BOOLEAN DEFAULT TRUE,   -- Affectation principale

  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE INDEX idx_staff_assignment_employee ON staff_assignment(employee_id);
CREATE INDEX idx_staff_assignment_nursery ON staff_assignment(nursery_id);
CREATE INDEX idx_staff_assignment_room ON staff_assignment(room_id);
CREATE INDEX idx_staff_assignment_section ON staff_assignment(section_id);
CREATE INDEX idx_staff_assignment_dates ON staff_assignment(start_date, end_date);
```

---

#### 3.1.8 Table `regulatory_report` (Rapports de conformité réglementaire)
**Objectif**: Générer et stocker les rapports de conformité (taux d'encadrement, etc.)

```sql
CREATE TABLE regulatory_report (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nursery_id UUID NOT NULL REFERENCES nursery(id) ON DELETE CASCADE,

  report_type VARCHAR(50) NOT NULL,             -- Type de rapport
  -- Types: 'daily_ratio', 'qualification_check', 'inspection_preparation',
  --        'monthly_summary', 'incident_report', 'safety_compliance'

  report_date DATE NOT NULL,
  report_period_start DATE,
  report_period_end DATE,

  -- Statut de conformité
  compliance_status VARCHAR(20) NOT NULL,       -- 'compliant', 'non_compliant', 'warning', 'under_review'

  -- Données du rapport (JSON)
  report_data JSONB,                            -- Données structurées du rapport

  -- Fichier généré
  report_file_url TEXT,                         -- PDF généré (Supabase Storage)

  -- Notes et actions
  notes TEXT,
  corrective_actions_required TEXT,
  corrective_actions_taken TEXT,

  -- Qui a généré/vérifié
  generated_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  verified_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_regulatory_report_nursery ON regulatory_report(nursery_id);
CREATE INDEX idx_regulatory_report_type ON regulatory_report(report_type);
CREATE INDEX idx_regulatory_report_date ON regulatory_report(report_date);
CREATE INDEX idx_regulatory_report_status ON regulatory_report(compliance_status);
```

---

#### 3.1.9 Table `ratio_log` (Logs taux d'encadrement)
**Objectif**: Tracer en temps réel le respect des taux d'encadrement réglementaires

```sql
CREATE TABLE ratio_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nursery_id UUID NOT NULL REFERENCES nursery(id) ON DELETE CASCADE,
  room_id UUID REFERENCES room(id) ON DELETE SET NULL,
  section_id UUID REFERENCES section(id) ON DELETE SET NULL,

  log_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  log_hour INTEGER NOT NULL,                    -- Heure de la journée (0-23)

  -- Nombre d'enfants présents
  children_present INTEGER NOT NULL,
  children_under_18_months INTEGER DEFAULT 0,   -- Bébés (ratio 1:5)
  children_over_18_months INTEGER DEFAULT 0,    -- Grands (ratio 1:8)

  -- Personnel présent
  staff_present INTEGER NOT NULL,
  qualified_staff_present INTEGER DEFAULT 0,    -- Personnels qualifiés (EJE, AP, etc.)

  -- Ratios calculés
  actual_ratio DECIMAL(5,2),                    -- Ratio réel enfants/personnel
  required_ratio DECIMAL(5,2),                  -- Ratio réglementaire requis

  -- Conformité
  is_compliant BOOLEAN NOT NULL,
  non_compliance_severity VARCHAR(20),          -- 'minor', 'moderate', 'critical'

  -- Actions prises
  alert_triggered BOOLEAN DEFAULT FALSE,
  alert_sent_to TEXT[],                         -- Array d'IDs employés alertés
  action_taken TEXT,

  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ratio_log_nursery ON ratio_log(nursery_id);
CREATE INDEX idx_ratio_log_date ON ratio_log(log_date);
CREATE INDEX idx_ratio_log_timestamp ON ratio_log(log_timestamp);
CREATE INDEX idx_ratio_log_compliant ON ratio_log(is_compliant);
CREATE INDEX idx_ratio_log_room ON ratio_log(room_id);
```

**Règles de taux d'encadrement en France**:
- **Enfants < 18 mois**: 1 adulte pour 5 enfants (ratio 1:5)
- **Enfants ≥ 18 mois**: 1 adulte pour 8 enfants (ratio 1:8)
- Au moins **50% du personnel** doit être qualifié (EJE, AP, Infirmière, etc.)

---

## 3.2 Relations et Flux de Données

### Schéma des Relations

```
profiles (Employee) ──┬──> staff_qualification (1:N)
                      ├──> staff_document (1:N)
                      ├──> staff_authorization (1:N)
                      ├──> staff_shift (1:N)
                      ├──> staff_absence (1:N)
                      ├──> staff_availability (1:N)
                      └──> staff_assignment (1:N)

nursery ──┬──> staff_shift (1:N)
          ├──> staff_absence (1:N)
          ├──> staff_assignment (1:N)
          ├──> regulatory_report (1:N)
          └──> ratio_log (1:N)

room ──> staff_shift (1:N)
room ──> staff_assignment (1:N)
room ──> ratio_log (1:N)

section ──> staff_shift (1:N)
section ──> staff_assignment (1:N)
section ──> ratio_log (1:N)
```

### Flux de Gestion RH

**1. Onboarding Employé:**
1. Owner crée profil Employee → `profiles`
2. Upload documents obligatoires → `staff_document` (casier, diplômes, contrat)
3. Saisie qualifications → `staff_qualification` (CAP AEPE, PSC1, etc.)
4. Attribution autorisations → `staff_authorization`
5. Affectation salle/section → `staff_assignment`
6. Saisie disponibilités → `staff_availability`

**2. Planning Hebdomadaire:**
1. Owner crée shifts semaine → `staff_shift` (création manuelle ou automatique)
2. Employés voient leur planning sur `/employee/calendar`
3. Système vérifie ratio enfants/personnel en temps réel → `ratio_log`
4. Alerte si non-conformité → `regulatory_report`

**3. Gestion Absences:**
1. Employee demande congé → `staff_absence` (status = 'pending')
2. Owner approuve/rejette → `staff_absence` (status = 'approved' ou 'rejected')
3. Si approuvé, système marque shifts concernés comme nécessitant remplacement
4. Owner assigne remplaçant → `staff_absence.replaced_by_id`

**4. Conformité Réglementaire:**
1. Système calcule ratio enfants/personnel chaque heure → `ratio_log`
2. Si ratio non-conforme → Alerte temps réel + `ratio_log.is_compliant = false`
3. Génération rapport quotidien → `regulatory_report` (type = 'daily_ratio')
4. Génération rapport mensuel → `regulatory_report` (type = 'monthly_summary')

---

## 3.3 Services TypeScript à Créer

```typescript
// lib/services/staff-hr.service.ts
export class StaffHRService {
  // Qualifications
  async addQualification(employeeId: string, data: CreateQualificationInput): Promise<Qualification>
  async getQualifications(employeeId: string): Promise<Qualification[]>
  async getExpiredQualifications(nurseryId: string): Promise<Qualification[]>
  async verifyQualification(qualificationId: string, verifiedById: string): Promise<void>

  // Documents
  async uploadDocument(employeeId: string, file: File, type: string): Promise<StaffDocument>
  async getDocuments(employeeId: string): Promise<StaffDocument[]>
  async getExpiredDocuments(nurseryId: string): Promise<StaffDocument[]>
  async approveDocument(documentId: string, approvedById: string): Promise<void>

  // Autorisations
  async grantAuthorization(employeeId: string, data: GrantAuthorizationInput): Promise<Authorization>
  async revokeAuthorization(authorizationId: string, revokedById: string, reason: string): Promise<void>
  async getAuthorizations(employeeId: string): Promise<Authorization[]>
}

// lib/services/staff-planning.service.ts
export class StaffPlanningService {
  // Shifts
  async createShift(data: CreateShiftInput): Promise<Shift>
  async createWeeklyShifts(nurseryId: string, weekStart: Date, template: ShiftTemplate): Promise<Shift[]>
  async getShiftsByDate(nurseryId: string, date: Date): Promise<Shift[]>
  async getShiftsByEmployee(employeeId: string, startDate: Date, endDate: Date): Promise<Shift[]>
  async updateShift(shiftId: string, data: UpdateShiftInput): Promise<Shift>
  async cancelShift(shiftId: string, reason: string): Promise<void>
  async clockIn(shiftId: string): Promise<void>  // Pointage arrivée
  async clockOut(shiftId: string): Promise<void> // Pointage départ

  // Absences
  async requestAbsence(employeeId: string, data: AbsenceRequestInput): Promise<Absence>
  async approveAbsence(absenceId: string, approvedById: string): Promise<void>
  async rejectAbsence(absenceId: string, rejectedById: string, reason: string): Promise<void>
  async getUpcomingAbsences(nurseryId: string): Promise<Absence[]>
  async findReplacement(absenceId: string): Promise<Employee[]>  // Suggère remplaçants disponibles

  // Disponibilités
  async setAvailability(employeeId: string, data: SetAvailabilityInput): Promise<Availability>
  async getAvailability(employeeId: string): Promise<Availability[]>
  async getAvailableStaff(nurseryId: string, date: Date, timeRange: TimeRange): Promise<Employee[]>

  // Affectations
  async assignToRoom(employeeId: string, roomId: string, role: string, startDate: Date): Promise<Assignment>
  async getAssignments(employeeId: string): Promise<Assignment[]>
  async endAssignment(assignmentId: string, endDate: Date): Promise<void>
}

// lib/services/compliance.service.ts
export class ComplianceService {
  // Ratio enfants/personnel
  async calculateRatio(nurseryId: string, roomId?: string): Promise<RatioCalculation>
  async logRatio(nurseryId: string): Promise<RatioLog>  // Log du ratio actuel
  async checkCompliance(nurseryId: string): Promise<ComplianceStatus>
  async getRatioHistory(nurseryId: string, date: Date): Promise<RatioLog[]>
  async getRatioAlerts(nurseryId: string, date: Date): Promise<RatioLog[]>  // Ratios non-conformes

  // Rapports réglementaires
  async generateDailyReport(nurseryId: string, date: Date): Promise<RegulatoryReport>
  async generateMonthlyReport(nurseryId: string, month: Date): Promise<RegulatoryReport>
  async getReports(nurseryId: string, type?: string): Promise<RegulatoryReport[]>
  async verifyReport(reportId: string, verifiedById: string): Promise<void>

  // Qualifications du personnel
  async checkQualificationCompliance(nurseryId: string): Promise<QualificationComplianceReport>
  async getQualifiedStaffPercentage(nurseryId: string): Promise<number>  // Doit être >= 50%
}
```

---

## 3.4 Pages UI à Créer

### Routes Propriétaire (Owner)

```
/owner/staff                        - Liste du personnel (avec filtres par nursery, rôle, statut)
/owner/staff/[id]                   - Fiche employé détaillée (onglets: Profil, Qualifications, Documents, Shifts, Absences)
/owner/staff/[id]/qualifications    - Gestion qualifications
/owner/staff/[id]/documents         - Gestion documents RH
/owner/staff/[id]/shifts            - Historique shifts
/owner/staff/[id]/absences          - Historique absences

/owner/planning                     - Planning hebdomadaire du personnel (vue calendrier)
/owner/planning/shifts/new          - Création shift individuel
/owner/planning/shifts/bulk         - Création shifts en masse (template hebdo)
/owner/planning/shifts/[id]/edit    - Édition shift

/owner/absences                     - Gestion des demandes d'absence (à approuver)
/owner/absences/requests            - Demandes en attente
/owner/absences/calendar            - Calendrier des absences
/owner/absences/replacement         - Interface recherche remplaçants

/owner/compliance                   - Dashboard conformité réglementaire
/owner/compliance/ratios            - Suivi taux d'encadrement temps réel
/owner/compliance/ratios/history    - Historique ratios
/owner/compliance/reports           - Rapports réglementaires générés
/owner/compliance/qualifications    - Suivi qualifications du personnel
```

### Routes Employé (Employee)

```
/employee/profile                   - Profil (avec qualifications, documents)
/employee/calendar                  - Calendrier personnel (shifts, absences)
/employee/absences                  - Demander un congé
/employee/absences/history          - Historique de mes absences
/employee/availability              - Gérer mes disponibilités
/employee/documents                 - Mes documents RH (lecture seule)
```

### Composants Réutilisables

```typescript
// components/staff/StaffCard.tsx
// components/staff/StaffQualificationsList.tsx
// components/staff/StaffDocumentsList.tsx
// components/staff/StaffAvailabilityCalendar.tsx

// components/planning/WeeklyScheduleGrid.tsx      (Planning hebdo grille)
// components/planning/ShiftCard.tsx
// components/planning/ShiftForm.tsx
// components/planning/EmployeeShiftCalendar.tsx   (Calendrier individuel)
// components/planning/ReplacementFinder.tsx       (Recherche remplaçants disponibles)

// components/absences/AbsenceRequestForm.tsx
// components/absences/AbsenceApprovalCard.tsx
// components/absences/AbsencesCalendar.tsx

// components/compliance/RatioGauge.tsx            (Gauge ratio temps réel)
// components/compliance/RatioChart.tsx            (Graphique historique)
// components/compliance/ComplianceAlert.tsx       (Alerte non-conformité)
// components/compliance/RegulatoryReportCard.tsx
// components/compliance/QualificationStatusBar.tsx (% personnel qualifié)
```

---

## 3.5 Migrations SQL

```
migrations/
  30_phase3_qualifications.sql      - staff_qualification, staff_authorization
  31_phase3_documents.sql           - staff_document
  32_phase3_planning.sql            - staff_shift, staff_absence, staff_availability
  33_phase3_assignments.sql         - staff_assignment
  34_phase3_compliance.sql          - regulatory_report, ratio_log
  35_phase3_indexes.sql             - Index de performance
  36_phase3_rls.sql                 - Row Level Security
  37_phase3_functions.sql           - Fonctions (calcul ratios, alertes)
  38_phase3_triggers.sql            - Triggers (auto-log ratios, alertes temps réel)
```

---

## 3.6 Complexité et Estimation

- **Migrations SQL**: 2 jours (9 tables + triggers complexes pour ratios)
- **Services**: 4 jours (staff-hr, planning, compliance)
- **Pages Owner**: 4 jours (planning, absences, compliance)
- **Pages Employee**: 2 jours (calendar, absences)
- **Composants UI**: 3 jours (grilles planning, calendriers, gauges)
- **Logique Compliance**: 3 jours (calcul ratios temps réel, alertes, rapports)
- **Tests & Debug**: 2 jours

**Total Phase 3**: ~20 jours de développement (augmenté car logique compliance complexe)

### Risques Identifiés

1. **Calcul ratio temps réel**: Performance critique, nécessité d'optimiser les queries
2. **Alertes automatiques**: Système de notifications push si ratio non-conforme
3. **Gestion remplacements**: Algorithme suggérant remplaçants optimaux (disponibilité + qualifications)
4. **Conformité légale**: Bien respecter la réglementation française (PMI, décrets, normes EAJE)
5. **Planning automatique**: Génération intelligente des shifts (optionnel mais très demandé)

---

# 💰 PHASE 4: INSCRIPTIONS & CONTRATS

## 4.1 Architecture de Données

### Objectif
Gérer le parcours complet d'inscription : demandes, liste d'attente, admission, contrats d'accueil avec horaires et tarification.

### Tables à Créer

#### 4.1.1 Table `application` (Demandes d'inscription)
**Objectif**: Gérer les demandes de pré-inscription

```sql
CREATE TABLE application (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nursery_id UUID NOT NULL REFERENCES nursery(id) ON DELETE CASCADE,

  -- Informations enfant (temporaires avant création Child)
  child_first_name VARCHAR(100) NOT NULL,
  child_last_name VARCHAR(100) NOT NULL,
  child_birth_date DATE NOT NULL,
  child_gender VARCHAR(10),

  -- Informations famille (temporaires avant création Family)
  parent1_first_name VARCHAR(100) NOT NULL,
  parent1_last_name VARCHAR(100) NOT NULL,
  parent1_email VARCHAR(255) NOT NULL,
  parent1_phone VARCHAR(20) NOT NULL,

  parent2_first_name VARCHAR(100),
  parent2_last_name VARCHAR(100),
  parent2_email VARCHAR(255),
  parent2_phone VARCHAR(20),

  address TEXT,
  postal_code VARCHAR(10),
  city VARCHAR(255),

  -- Demande
  desired_start_date DATE NOT NULL,
  desired_contract_type VARCHAR(50),            -- 'regular', 'occasional', 'emergency'
  desired_schedule TEXT,                        -- Description horaires souhaités

  -- Motivation
  motivation_letter TEXT,
  special_needs TEXT,                           -- Besoins spéciaux

  -- Statut
  status VARCHAR(20) DEFAULT 'received',        -- 'received', 'under_review', 'accepted', 'rejected', 'waiting_list', 'cancelled'
  application_date DATE DEFAULT CURRENT_DATE,

  reviewed_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,

  -- Documents attachés (avant dossier complet)
  documents_urls TEXT[],

  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_application_nursery ON application(nursery_id);
CREATE INDEX idx_application_status ON application(status);
CREATE INDEX idx_application_date ON application(application_date);
CREATE INDEX idx_application_start_date ON application(desired_start_date);
```

---

#### 4.1.2 Table `application_priority` (Critères de priorisation)
**Objectif**: Attribuer des priorités aux demandes selon critères

```sql
CREATE TABLE application_priority (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL REFERENCES application(id) ON DELETE CASCADE,

  priority_type VARCHAR(50) NOT NULL,           -- Type de priorité
  -- Types: 'sibling', 'single_parent', 'special_needs', 'employee_child',
  --        'local_resident', 'low_income', 'military', 'manual_override'

  priority_score INTEGER DEFAULT 0,             -- Score numérique (cumul)

  evidence_document_url TEXT,                   -- Document justificatif
  verified BOOLEAN DEFAULT FALSE,
  verified_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,

  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_application_priority_application ON application_priority(application_id);
CREATE INDEX idx_application_priority_type ON application_priority(priority_type);
```

---

#### 4.1.3 Table `waiting_list` (Liste d'attente)
**Objectif**: Gérer la file d'attente avec position et priorités

```sql
CREATE TABLE waiting_list (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL UNIQUE REFERENCES application(id) ON DELETE CASCADE,
  nursery_id UUID NOT NULL REFERENCES nursery(id) ON DELETE CASCADE,

  position INTEGER NOT NULL,                    -- Position dans la liste
  total_priority_score INTEGER DEFAULT 0,       -- Score total de priorité

  added_to_list_date DATE DEFAULT CURRENT_DATE,

  -- Notifications
  notified_of_spot_available BOOLEAN DEFAULT FALSE,
  notified_at TIMESTAMPTZ,

  -- Réponse famille
  family_response VARCHAR(20),                  -- 'accepted', 'declined', 'no_response'
  response_deadline DATE,

  -- Statut
  status VARCHAR(20) DEFAULT 'active',          -- 'active', 'offered', 'accepted', 'declined', 'expired', 'removed'

  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_waiting_list_nursery ON waiting_list(nursery_id);
CREATE INDEX idx_waiting_list_application ON waiting_list(application_id);
CREATE INDEX idx_waiting_list_position ON waiting_list(position);
CREATE INDEX idx_waiting_list_status ON waiting_list(status);
```

---

#### 4.1.4 Table `admission` (Admission)
**Objectif**: Passage de demande → admission effective

```sql
CREATE TABLE admission (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL UNIQUE REFERENCES application(id) ON DELETE CASCADE,
  nursery_id UUID NOT NULL REFERENCES nursery(id) ON DELETE CASCADE,
  child_id UUID UNIQUE REFERENCES child(id) ON DELETE SET NULL,  -- Créé lors de l'admission
  family_id UUID REFERENCES family(id) ON DELETE SET NULL,

  admission_date DATE NOT NULL DEFAULT CURRENT_DATE,
  start_date DATE NOT NULL,                     -- Date d'entrée en crèche

  -- Affectation initiale
  section_id UUID REFERENCES section(id) ON DELETE SET NULL,
  room_id UUID REFERENCES room(id) ON DELETE SET NULL,

  -- Adaptation
  trial_period_weeks INTEGER DEFAULT 2,         -- Période d'adaptation
  trial_period_end DATE,

  -- Statut
  status VARCHAR(20) DEFAULT 'pending',         -- 'pending', 'active', 'completed', 'cancelled'

  -- Traçabilité
  admitted_by_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_admission_nursery ON admission(nursery_id);
CREATE INDEX idx_admission_application ON admission(application_id);
CREATE INDEX idx_admission_child ON admission(child_id);
CREATE INDEX idx_admission_status ON admission(status);
CREATE INDEX idx_admission_start_date ON admission(start_date);
```

---

#### 4.1.5 Table `contract` (Contrats d'accueil)
**Objectif**: Contrats signés avec les familles

```sql
CREATE TABLE contract (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nursery_id UUID NOT NULL REFERENCES nursery(id) ON DELETE CASCADE,
  family_id UUID NOT NULL REFERENCES family(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES child(id) ON DELETE CASCADE,

  contract_number VARCHAR(50) UNIQUE NOT NULL,  -- Numéro unique du contrat

  -- Type de contrat
  contract_type VARCHAR(50) NOT NULL,           -- 'regular', 'occasional', 'emergency', 'short_term'

  -- Période
  start_date DATE NOT NULL,
  end_date DATE,                                -- NULL = CDI, sinon CDD

  -- Horaires type (hebdomadaire)
  weekly_hours DECIMAL(5,2),                    -- Nombre d'heures/semaine prévues

  -- Tarification
  rate_type VARCHAR(50) NOT NULL,               -- 'psu', 'paje', 'private', 'company_sponsored'
  hourly_rate DECIMAL(6,2),                     -- Tarif horaire
  monthly_rate DECIMAL(8,2),                    -- Forfait mensuel (si applicable)

  -- Facturation
  billing_frequency VARCHAR(20) DEFAULT 'monthly',  -- 'monthly', 'quarterly', 'annual'
  billing_day_of_month INTEGER DEFAULT 1,

  -- Signatures
  signed_by_guardian_id UUID REFERENCES guardian(id) ON DELETE SET NULL,
  guardian_signature_date DATE,
  guardian_signature_url TEXT,

  signed_by_director_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  director_signature_date DATE,
  director_signature_url TEXT,

  -- Document contrat
  contract_document_url TEXT NOT NULL,          -- PDF contrat signé (Supabase Storage)

  -- Statut
  status VARCHAR(20) DEFAULT 'draft',           -- 'draft', 'pending_signature', 'active', 'suspended', 'terminated'

  -- Résiliation
  termination_date DATE,
  termination_reason VARCHAR(50),               -- 'end_of_term', 'family_request', 'nursery_request', 'child_age_limit', 'breach'
  termination_notice_date DATE,                 -- Date préavis

  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE INDEX idx_contract_nursery ON contract(nursery_id);
CREATE INDEX idx_contract_family ON contract(family_id);
CREATE INDEX idx_contract_child ON contract(child_id);
CREATE INDEX idx_contract_status ON contract(status);
CREATE INDEX idx_contract_dates ON contract(start_date, end_date);
CREATE INDEX idx_contract_number ON contract(contract_number);
```

---

#### 4.1.6 Table `contract_schedule` (Horaires contractuels)
**Objectif**: Horaires hebdomadaires prévus au contrat

```sql
CREATE TABLE contract_schedule (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id UUID NOT NULL REFERENCES contract(id) ON DELETE CASCADE,

  day_of_week INTEGER NOT NULL,                 -- 0 = Dimanche, 1 = Lundi, ..., 6 = Samedi

  is_present BOOLEAN DEFAULT TRUE,              -- Enfant présent ce jour ?

  arrival_time TIME,
  departure_time TIME,

  daily_hours DECIMAL(4,2),                     -- Heures prévues ce jour

  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_contract_schedule_contract ON contract_schedule(contract_id);
CREATE INDEX idx_contract_schedule_day ON contract_schedule(day_of_week);
```

---

#### 4.1.7 Table `contract_amendment` (Avenants au contrat)
**Objectif**: Modifications du contrat en cours

```sql
CREATE TABLE contract_amendment (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id UUID NOT NULL REFERENCES contract(id) ON DELETE CASCADE,

  amendment_number INTEGER NOT NULL,            -- Numéro avenant (1, 2, 3...)
  amendment_type VARCHAR(50) NOT NULL,          -- Type de modification
  -- Types: 'schedule_change', 'rate_change', 'hours_change', 'suspension', 'reactivation'

  effective_date DATE NOT NULL,                 -- Date d'effet

  -- Modifications
  changes_description TEXT NOT NULL,            -- Description des changements

  -- Nouveaux horaires (si changement planning)
  new_weekly_hours DECIMAL(5,2),
  new_schedule JSONB,                           -- Nouvel emploi du temps (JSON)

  -- Nouveau tarif (si changement tarif)
  new_hourly_rate DECIMAL(6,2),
  new_monthly_rate DECIMAL(8,2),

  -- Signatures
  signed_by_guardian_id UUID REFERENCES guardian(id) ON DELETE SET NULL,
  guardian_signature_date DATE,
  guardian_signature_url TEXT,

  signed_by_director_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  director_signature_date DATE,
  director_signature_url TEXT,

  -- Document avenant
  amendment_document_url TEXT,                  -- PDF avenant signé

  status VARCHAR(20) DEFAULT 'draft',           -- 'draft', 'pending_signature', 'active', 'cancelled'

  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE INDEX idx_contract_amendment_contract ON contract_amendment(contract_id);
CREATE INDEX idx_contract_amendment_effective_date ON contract_amendment(effective_date);
CREATE INDEX idx_contract_amendment_status ON contract_amendment(status);
```

---

#### 4.1.8 Table `rate_grid` (Grilles tarifaires)
**Objectif**: Définir les grilles de tarifs (PSU, PAJE, privé)

```sql
CREATE TABLE rate_grid (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nursery_id UUID NOT NULL REFERENCES nursery(id) ON DELETE CASCADE,

  grid_name VARCHAR(255) NOT NULL,              -- Nom de la grille (ex: "PSU 2025", "Tarif Privé")
  grid_type VARCHAR(50) NOT NULL,               -- 'psu', 'paje', 'private', 'company'

  -- Validité
  valid_from DATE NOT NULL,
  valid_until DATE,                             -- NULL = grille active indéfiniment

  -- Paramètres PSU (si applicable)
  psu_base_rate DECIMAL(6,2),                   -- Taux horaire de base PSU (fixé par CAF)
  psu_caf_participation_rate DECIMAL(5,4),      -- % pris en charge par CAF

  -- Paramètres PAJE
  paje_hourly_ceiling DECIMAL(6,2),             -- Plafond horaire PAJE

  is_active BOOLEAN DEFAULT TRUE,
  is_default BOOLEAN DEFAULT FALSE,             -- Grille par défaut

  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE INDEX idx_rate_grid_nursery ON rate_grid(nursery_id);
CREATE INDEX idx_rate_grid_type ON rate_grid(grid_type);
CREATE INDEX idx_rate_grid_dates ON rate_grid(valid_from, valid_until);
CREATE INDEX idx_rate_grid_active ON rate_grid(is_active);
```

---

#### 4.1.9 Table `rate_income_bracket` (Tranches de revenus)
**Objectif**: Barème tarifaire selon revenus pour PSU

```sql
CREATE TABLE rate_income_bracket (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rate_grid_id UUID NOT NULL REFERENCES rate_grid(id) ON DELETE CASCADE,

  bracket_name VARCHAR(100),                    -- Nom de la tranche (ex: "Tranche A")

  -- Tranches de revenus annuels
  income_min DECIMAL(10,2) NOT NULL,            -- Revenu minimum (€)
  income_max DECIMAL(10,2),                     -- Revenu maximum (€), NULL = illimité

  -- Tarif appliqué
  hourly_rate DECIMAL(6,2) NOT NULL,            -- Tarif horaire pour cette tranche

  -- Coefficient PSU (si applicable)
  psu_coefficient DECIMAL(6,4),                 -- Coefficient multiplicateur PSU

  display_order INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rate_income_bracket_grid ON rate_income_bracket(rate_grid_id);
CREATE INDEX idx_rate_income_bracket_income ON rate_income_bracket(income_min, income_max);
```

---

## 4.2 Relations et Flux de Données

### Schéma des Relations

```
application ──┬──> application_priority (1:N)
              ├──> waiting_list (1:1)
              └──> admission (1:1) ──┬──> child (1:1)
                                      └──> family (N:1)

contract ──┬──> contract_schedule (1:N)
           ├──> contract_amendment (1:N)
           ├──> family (N:1)
           ├──> child (N:1)
           └──> rate_grid (N:1)

rate_grid ──> rate_income_bracket (1:N)

nursery ──┬──> application (1:N)
          ├──> rate_grid (1:N)
          └──> contract (1:N)
```

### Flux d'Inscription Complet

**1. Demande de pré-inscription:**
1. Parent remplit formulaire en ligne → `application` créé (status = 'received')
2. Système attribue priorités automatiques → `application_priority` (fratrie détectée, etc.)
3. Owner examine demande → Accepte, rejette, ou ajoute à liste d'attente

**2. Liste d'attente:**
1. Demande acceptée mais pas de place → `waiting_list` créé
2. Système calcule position selon priorités cumulées
3. Quand place se libère → Notification famille (email/SMS)
4. Famille répond → `waiting_list.family_response` = 'accepted' ou 'declined'

**3. Admission:**
1. Place confirmée → `admission` créé
2. Système crée automatiquement `family` et `child` à partir de l'`application`
3. Owner complète dossier enfant (santé, documents, autorisations)
4. Affectation section/salle → `child_section`, `room`

**4. Contrat:**
1. Owner crée contrat → `contract` (status = 'draft')
2. Saisie horaires hebdomadaires → `contract_schedule` (un par jour de semaine)
3. Application grille tarifaire selon revenus famille → `rate_income_bracket`
4. Génération PDF contrat → `contract.contract_document_url`
5. Signatures (parent + directeur) → `contract` (status = 'active')

**5. Avenant:**
1. Modification en cours de contrat → `contract_amendment` créé
2. Nouvelles conditions saisies
3. Signatures → Avenant actif
4. Application des nouvelles conditions à partir de `effective_date`

---

## 4.3 Services TypeScript à Créer

```typescript
// lib/services/application.service.ts
export class ApplicationService {
  async create(nurseryId: string, data: CreateApplicationInput): Promise<Application>
  async getByNursery(nurseryId: string, filters?: ApplicationFilters): Promise<Application[]>
  async getById(applicationId: string): Promise<Application>
  async update(applicationId: string, data: UpdateApplicationInput): Promise<Application>
  async review(applicationId: string, decision: 'accept' | 'reject' | 'waiting_list', reviewedById: string): Promise<void>

  // Priorités
  async addPriority(applicationId: string, type: string, evidence?: File): Promise<Priority>
  async calculateTotalPriority(applicationId: string): Promise<number>
}

// lib/services/waiting-list.service.ts
export class WaitingListService {
  async add(applicationId: string): Promise<WaitingList>
  async getByNursery(nurseryId: string): Promise<WaitingList[]>  // Trié par position
  async recalculatePositions(nurseryId: string): Promise<void>   // Recalcul positions selon priorités
  async notifyNextInLine(nurseryId: string): Promise<void>       // Notifie 1er de la liste
  async recordResponse(waitingListId: string, response: 'accepted' | 'declined'): Promise<void>
  async remove(waitingListId: string, reason: string): Promise<void>
}

// lib/services/admission.service.ts
export class AdmissionService {
  async admit(applicationId: string, data: AdmitInput): Promise<Admission>
  async createFamilyAndChild(admissionId: string): Promise<{ family: Family, child: Child }>
  async assignSection(admissionId: string, sectionId: string): Promise<void>
  async complete(admissionId: string): Promise<void>  // Finalise l'admission
}

// lib/services/contract.service.ts
export class ContractService {
  async create(familyId: string, childId: string, data: CreateContractInput): Promise<Contract>
  async generateContractNumber(nurseryId: string): Promise<string>
  async getByFamily(familyId: string): Promise<Contract[]>
  async getByChild(childId: string): Promise<Contract[]>
  async getActiveContracts(nurseryId: string): Promise<Contract[]>

  // Horaires
  async setSchedule(contractId: string, schedule: ScheduleInput[]): Promise<void>
  async getSchedule(contractId: string): Promise<ContractSchedule[]>

  // Tarification
  async calculateRate(familyIncome: number, rateGridId: string): Promise<number>
  async applyRateGrid(contractId: string, rateGridId: string): Promise<void>

  // Signatures
  async generateContractPDF(contractId: string): Promise<string>  // Retourne URL PDF
  async signByGuardian(contractId: string, guardianId: string, signature: File): Promise<void>
  async signByDirector(contractId: string, directorId: string, signature: File): Promise<void>
  async activate(contractId: string): Promise<void>

  // Avenants
  async createAmendment(contractId: string, data: CreateAmendmentInput): Promise<Amendment>
  async getAmendments(contractId: string): Promise<Amendment[]>

  // Résiliation
  async terminate(contractId: string, reason: string, terminationDate: Date): Promise<void>
  async suspend(contractId: string, reason: string): Promise<void>
  async reactivate(contractId: string): Promise<void>
}

// lib/services/rate-grid.service.ts
export class RateGridService {
  async create(nurseryId: string, data: CreateRateGridInput): Promise<RateGrid>
  async getByNursery(nurseryId: string): Promise<RateGrid[]>
  async getActiveGrid(nurseryId: string, type: string): Promise<RateGrid>
  async addIncomeBracket(rateGridId: string, data: IncomeBracketInput): Promise<IncomeBracket>
  async calculateRateForIncome(rateGridId: string, income: number): Promise<number>
}
```

---

## 4.4 Pages UI à Créer

### Routes Propriétaire (Owner)

```
/owner/applications                 - Liste des demandes d'inscription
/owner/applications/new             - Formulaire nouvelle demande (saisie manuelle)
/owner/applications/[id]            - Détail demande
/owner/applications/[id]/review     - Examiner demande (accepter/rejeter/liste attente)

/owner/waiting-list                 - Liste d'attente (avec positions et priorités)
/owner/waiting-list/manage          - Gérer positions (drag & drop)

/owner/admissions                   - Admissions en cours
/owner/admissions/[id]              - Processus d'admission (wizard)
/owner/admissions/[id]/complete     - Finaliser admission

/owner/contracts                    - Liste des contrats (avec filtres)
/owner/contracts/new                - Création contrat (wizard multi-étapes)
/owner/contracts/[id]               - Détail contrat (onglets: Infos, Horaires, Tarif, Avenants, Documents)
/owner/contracts/[id]/edit          - Édition contrat
/owner/contracts/[id]/schedule      - Édition horaires
/owner/contracts/[id]/amendment     - Créer avenant
/owner/contracts/[id]/terminate     - Résilier contrat

/owner/rate-grids                   - Gestion grilles tarifaires
/owner/rate-grids/new               - Créer grille tarifaire
/owner/rate-grids/[id]              - Détail grille (avec tranches de revenus)
/owner/rate-grids/[id]/edit         - Édition grille
```

### Composants Réutilisables

```typescript
// components/applications/ApplicationCard.tsx
// components/applications/ApplicationForm.tsx
// components/applications/ApplicationReviewPanel.tsx
// components/applications/PriorityBadges.tsx

// components/waiting-list/WaitingListTable.tsx
// components/waiting-list/PositionDragDropList.tsx

// components/admissions/AdmissionWizard.tsx     (Multi-étapes)
// components/admissions/AdmissionProgress.tsx

// components/contracts/ContractCard.tsx
// components/contracts/ContractForm.tsx
// components/contracts/ContractScheduleEditor.tsx   (Éditeur horaires hebdo)
// components/contracts/RateCalculator.tsx           (Calculateur tarif selon revenus)
// components/contracts/ContractPDFViewer.tsx
// components/contracts/SignaturePanel.tsx           (Capture signature électronique)
// components/contracts/AmendmentForm.tsx
// components/contracts/AmendmentsList.tsx

// components/rate-grids/RateGridCard.tsx
// components/rate-grids/RateGridForm.tsx
// components/rate-grids/IncomeBracketTable.tsx
// components/rate-grids/IncomeBracketForm.tsx
```

---

## 4.5 Migrations SQL

```
migrations/
  40_phase4_applications.sql        - application, application_priority
  41_phase4_waiting_list.sql        - waiting_list
  42_phase4_admissions.sql          - admission
  43_phase4_contracts.sql           - contract, contract_schedule, contract_amendment
  44_phase4_rate_grids.sql          - rate_grid, rate_income_bracket
  45_phase4_indexes.sql             - Index de performance
  46_phase4_rls.sql                 - Row Level Security
  47_phase4_functions.sql           - Fonctions (calcul priorités, tarifs, génération numéros contrat)
  48_phase4_triggers.sql            - Triggers (auto-recalcul positions waiting list)
```

---

## 4.6 Complexité et Estimation

- **Migrations SQL**: 2 jours (9 tables + fonctions calcul tarifs)
- **Services**: 3 jours (application, waiting-list, admission, contract, rate-grid)
- **Pages Owner**: 5 jours (applications, liste attente, contrats, grilles tarifaires)
- **Composants UI**: 3 jours (wizards, éditeur horaires, signatures électroniques)
- **Génération PDF**: 2 jours (templates contrats, avenants)
- **Tests & Debug**: 2 jours

**Total Phase 4**: ~17 jours de développement

### Risques Identifiés

1. **Calcul priorités**: Algorithme complexe, pondération des critères
2. **Liste d'attente dynamique**: Gestion positions en temps réel, notifications
3. **Génération contrats**: Templates PDF conformes à la réglementation française
4. **Signatures électroniques**: Validité juridique, stockage sécurisé
5. **Calcul tarifs PSU**: Formule complexe selon revenus, taux CAF, coefficient famille

---

# 💰 PHASE 5: FACTURATION & FINANCES

## 5.1 Architecture de Données

### Objectif
Automatiser la facturation mensuelle, gérer les paiements, relances impayés, exports comptables et suivi financier.

### Tables à Créer

#### 5.1.1 Table `invoice` (Factures)
**Objectif**: Factures émises aux familles

```sql
CREATE TABLE invoice (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nursery_id UUID NOT NULL REFERENCES nursery(id) ON DELETE CASCADE,
  family_id UUID NOT NULL REFERENCES family(id) ON DELETE CASCADE,
  contract_id UUID REFERENCES contract(id) ON DELETE SET NULL,

  invoice_number VARCHAR(50) UNIQUE NOT NULL,   -- Numéro unique facture
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,                       -- Date échéance

  -- Période facturée
  billing_period_start DATE NOT NULL,
  billing_period_end DATE NOT NULL,

  -- Montants (en euros)
  subtotal DECIMAL(10,2) NOT NULL,              -- Sous-total HT (ou TTC si exonéré TVA)
  tax_amount DECIMAL(10,2) DEFAULT 0,           -- Montant TVA
  discount_amount DECIMAL(10,2) DEFAULT 0,      -- Remises
  total_amount DECIMAL(10,2) NOT NULL,          -- Montant total TTC

  -- Aide CAF (si applicable)
  caf_participation DECIMAL(10,2) DEFAULT 0,    -- Part CAF
  family_share DECIMAL(10,2) NOT NULL,          -- Part famille (à payer)

  -- Statut
  status VARCHAR(20) DEFAULT 'draft',           -- 'draft', 'sent', 'paid', 'partially_paid', 'overdue', 'cancelled', 'credited'

  -- Paiement
  paid_amount DECIMAL(10,2) DEFAULT 0,
  remaining_amount DECIMAL(10,2),               -- Reste à payer
  paid_date DATE,

  -- Documents
  invoice_pdf_url TEXT,                         -- PDF facture (Supabase Storage)

  -- Notes
  notes TEXT,
  payment_instructions TEXT,                    -- Instructions de paiement

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE INDEX idx_invoice_nursery ON invoice(nursery_id);
CREATE INDEX idx_invoice_family ON invoice(family_id);
CREATE INDEX idx_invoice_contract ON invoice(contract_id);
CREATE INDEX idx_invoice_status ON invoice(status);
CREATE INDEX idx_invoice_date ON invoice(invoice_date);
CREATE INDEX idx_invoice_due_date ON invoice(due_date);
CREATE INDEX idx_invoice_number ON invoice(invoice_number);
```

---

#### 5.1.2 Table `invoice_line` (Lignes de facture)
**Objectif**: Détail des lignes de facturation

```sql
CREATE TABLE invoice_line (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES invoice(id) ON DELETE CASCADE,

  line_number INTEGER NOT NULL,                 -- Ordre d'affichage

  -- Description
  description VARCHAR(255) NOT NULL,            -- Ex: "Accueil régulier - Octobre 2025"
  item_type VARCHAR(50),                        -- 'childcare', 'meal', 'extra_hours', 'supply_fee', 'late_pickup', 'penalty'

  -- Quantité
  quantity DECIMAL(10,2) NOT NULL,              -- Nb heures, nb jours, etc.
  unit VARCHAR(20),                             -- 'hour', 'day', 'month', 'meal', 'unit'

  -- Prix
  unit_price DECIMAL(8,2) NOT NULL,             -- Prix unitaire
  subtotal DECIMAL(10,2) NOT NULL,              -- Sous-total ligne

  -- TVA
  tax_rate DECIMAL(5,2) DEFAULT 0,              -- Taux TVA (0% si exonéré)
  tax_amount DECIMAL(10,2) DEFAULT 0,

  -- Total ligne
  total DECIMAL(10,2) NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invoice_line_invoice ON invoice_line(invoice_id);
CREATE INDEX idx_invoice_line_type ON invoice_line(item_type);
```

---

#### 5.1.3 Table `billing_period` (Périodes de facturation)
**Objectif**: Gérer les cycles de facturation

```sql
CREATE TABLE billing_period (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nursery_id UUID NOT NULL REFERENCES nursery(id) ON DELETE CASCADE,

  period_name VARCHAR(100) NOT NULL,            -- Ex: "Octobre 2025"
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Statut
  status VARCHAR(20) DEFAULT 'open',            -- 'open', 'closed', 'invoiced', 'finalized'

  -- Stats
  total_invoices INTEGER DEFAULT 0,
  total_amount DECIMAL(12,2) DEFAULT 0,
  total_paid DECIMAL(12,2) DEFAULT 0,
  total_outstanding DECIMAL(12,2) DEFAULT 0,

  -- Dates clés
  invoices_generated_at TIMESTAMPTZ,
  invoices_sent_at TIMESTAMPTZ,
  period_closed_at TIMESTAMPTZ,

  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_billing_period_nursery ON billing_period(nursery_id);
CREATE INDEX idx_billing_period_dates ON billing_period(period_start, period_end);
CREATE INDEX idx_billing_period_status ON billing_period(status);
```

---

#### 5.1.4 Table `payment` (Paiements)
**Objectif**: Enregistrer les paiements reçus

```sql
CREATE TABLE payment (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nursery_id UUID NOT NULL REFERENCES nursery(id) ON DELETE CASCADE,
  family_id UUID NOT NULL REFERENCES family(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES invoice(id) ON DELETE SET NULL,

  payment_number VARCHAR(50) UNIQUE NOT NULL,   -- Numéro unique paiement
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,

  amount DECIMAL(10,2) NOT NULL,                -- Montant payé

  payment_method_id UUID REFERENCES payment_method(id) ON DELETE SET NULL,

  -- Références externes
  transaction_reference VARCHAR(255),           -- Référence banque / Stripe / PayPal
  check_number VARCHAR(50),                     -- Numéro chèque (si applicable)

  -- Statut
  status VARCHAR(20) DEFAULT 'received',        -- 'received', 'validated', 'rejected', 'refunded'

  -- Validation
  validated_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  validated_at TIMESTAMPTZ,

  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  recorded_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE INDEX idx_payment_nursery ON payment(nursery_id);
CREATE INDEX idx_payment_family ON payment(family_id);
CREATE INDEX idx_payment_invoice ON payment(invoice_id);
CREATE INDEX idx_payment_date ON payment(payment_date);
CREATE INDEX idx_payment_status ON payment(status);
```

---

#### 5.1.5 Table `payment_method` (Moyens de paiement)
**Objectif**: Définir les moyens de paiement acceptés

```sql
CREATE TABLE payment_method (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID NOT NULL REFERENCES family(id) ON DELETE CASCADE,

  method_type VARCHAR(50) NOT NULL,             -- Type de paiement
  -- Types: 'bank_transfer', 'direct_debit', 'check', 'cash', 'credit_card', 'stripe', 'paypal'

  -- Informations bancaires (si prélèvement)
  bank_name VARCHAR(255),
  iban VARCHAR(34),
  bic VARCHAR(11),
  account_holder_name VARCHAR(255),

  -- Mandat SEPA (si prélèvement)
  sepa_mandate_reference VARCHAR(50),
  sepa_mandate_signed_date DATE,

  -- Statut
  is_active BOOLEAN DEFAULT TRUE,
  is_default BOOLEAN DEFAULT FALSE,             -- Moyen de paiement par défaut

  verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMPTZ,

  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payment_method_family ON payment_method(family_id);
CREATE INDEX idx_payment_method_type ON payment_method(method_type);
CREATE INDEX idx_payment_method_active ON payment_method(is_active);
```

---

#### 5.1.6 Table `credit_note` (Avoirs)
**Objectif**: Gérer les avoirs (remboursements, corrections)

```sql
CREATE TABLE credit_note (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nursery_id UUID NOT NULL REFERENCES nursery(id) ON DELETE CASCADE,
  family_id UUID NOT NULL REFERENCES family(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES invoice(id) ON DELETE SET NULL,  -- Facture d'origine

  credit_note_number VARCHAR(50) UNIQUE NOT NULL,
  credit_note_date DATE NOT NULL DEFAULT CURRENT_DATE,

  amount DECIMAL(10,2) NOT NULL,                -- Montant avoir

  reason VARCHAR(50) NOT NULL,                  -- Raison
  -- Raisons: 'overpayment', 'error', 'absence_refund', 'contract_cancellation', 'goodwill'

  description TEXT,

  -- Utilisation
  applied_to_invoice_id UUID REFERENCES invoice(id) ON DELETE SET NULL,  -- Déduit de quelle facture
  applied_date DATE,

  status VARCHAR(20) DEFAULT 'issued',          -- 'issued', 'applied', 'refunded'

  -- Document
  credit_note_pdf_url TEXT,

  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE INDEX idx_credit_note_nursery ON credit_note(nursery_id);
CREATE INDEX idx_credit_note_family ON credit_note(family_id);
CREATE INDEX idx_credit_note_invoice ON credit_note(invoice_id);
CREATE INDEX idx_credit_note_status ON credit_note(status);
```

---

#### 5.1.7 Table `accounting_export` (Exports comptables)
**Objectif**: Historique des exports vers logiciel comptable

```sql
CREATE TABLE accounting_export (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nursery_id UUID NOT NULL REFERENCES nursery(id) ON DELETE CASCADE,

  export_date DATE NOT NULL DEFAULT CURRENT_DATE,
  export_format VARCHAR(50) NOT NULL,           -- Format export
  -- Formats: 'fec', 'csv', 'excel', 'sage', 'cegid', 'ebp', 'quickbooks'

  -- Période exportée
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Fichier généré
  file_url TEXT NOT NULL,                       -- URL fichier export (Supabase Storage)
  file_name VARCHAR(255) NOT NULL,
  file_size INTEGER,

  -- Stats
  records_count INTEGER DEFAULT 0,              -- Nombre d'écritures
  total_amount DECIMAL(12,2) DEFAULT 0,

  -- Qui a exporté
  exported_by_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_accounting_export_nursery ON accounting_export(nursery_id);
CREATE INDEX idx_accounting_export_date ON accounting_export(export_date);
CREATE INDEX idx_accounting_export_period ON accounting_export(period_start, period_end);
```

---

#### 5.1.8 Table `debt_collection` (Relances impayés)
**Objectif**: Gérer les relances pour factures impayées

```sql
CREATE TABLE debt_collection (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES invoice(id) ON DELETE CASCADE,
  family_id UUID NOT NULL REFERENCES family(id) ON DELETE CASCADE,

  reminder_type VARCHAR(50) NOT NULL,           -- Type de relance
  -- Types: 'first_reminder', 'second_reminder', 'final_notice', 'legal_action'

  reminder_date DATE NOT NULL DEFAULT CURRENT_DATE,
  days_overdue INTEGER NOT NULL,                -- Nombre de jours de retard

  amount_due DECIMAL(10,2) NOT NULL,            -- Montant dû au moment de la relance

  -- Communication
  reminder_method VARCHAR(20),                  -- 'email', 'postal_mail', 'phone', 'sms'
  reminder_sent BOOLEAN DEFAULT FALSE,
  reminder_sent_at TIMESTAMPTZ,

  -- Document relance
  reminder_document_url TEXT,                   -- PDF lettre de relance

  -- Réponse famille
  family_response TEXT,
  payment_plan_proposed BOOLEAN DEFAULT FALSE,
  payment_plan_details TEXT,

  -- Statut
  status VARCHAR(20) DEFAULT 'sent',            -- 'sent', 'acknowledged', 'payment_received', 'escalated', 'legal'

  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE INDEX idx_debt_collection_invoice ON debt_collection(invoice_id);
CREATE INDEX idx_debt_collection_family ON debt_collection(family_id);
CREATE INDEX idx_debt_collection_date ON debt_collection(reminder_date);
CREATE INDEX idx_debt_collection_type ON debt_collection(reminder_type);
CREATE INDEX idx_debt_collection_status ON debt_collection(status);
```

---

#### 5.1.9 Table `ledger_entry` (Écritures comptables)
**Objectif**: Journal des écritures comptables (optionnel, pour comptabilité intégrée)

```sql
CREATE TABLE ledger_entry (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nursery_id UUID NOT NULL REFERENCES nursery(id) ON DELETE CASCADE,

  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  entry_type VARCHAR(50) NOT NULL,              -- 'invoice', 'payment', 'credit_note', 'expense', 'adjustment'

  -- Références
  invoice_id UUID REFERENCES invoice(id) ON DELETE SET NULL,
  payment_id UUID REFERENCES payment(id) ON DELETE SET NULL,
  credit_note_id UUID REFERENCES credit_note(id) ON DELETE SET NULL,

  -- Comptabilité
  account_code VARCHAR(20) NOT NULL,            -- Code compte comptable (ex: "706000")
  account_name VARCHAR(255),                    -- Nom du compte

  debit DECIMAL(10,2) DEFAULT 0,                -- Montant débit
  credit DECIMAL(10,2) DEFAULT 0,               -- Montant crédit

  description TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE INDEX idx_ledger_entry_nursery ON ledger_entry(nursery_id);
CREATE INDEX idx_ledger_entry_date ON ledger_entry(entry_date);
CREATE INDEX idx_ledger_entry_type ON ledger_entry(entry_type);
CREATE INDEX idx_ledger_entry_account ON ledger_entry(account_code);
```

---

## 5.2 Relations et Flux de Données

### Schéma des Relations

```
invoice ──┬──> invoice_line (1:N)
          ├──> payment (1:N)
          ├──> credit_note (1:N)
          ├──> debt_collection (1:N)
          ├──> ledger_entry (1:N)
          ├──> family (N:1)
          └──> contract (N:1)

family ──┬──> invoice (1:N)
         ├──> payment (1:N)
         └──> payment_method (1:N)

billing_period ──> nursery (N:1)

payment ──> payment_method (N:1)

nursery ──┬──> invoice (1:N)
          ├──> billing_period (1:N)
          └──> accounting_export (1:N)
```

### Flux de Facturation Mensuelle

**1. Génération factures (automatique):**
1. Fin de mois → Système crée `billing_period` pour le mois écoulé
2. Pour chaque contrat actif:
   - Récupère horaires contractuels → `contract_schedule`
   - Récupère présences réelles → `attendance`
   - Calcule heures facturables (avec heures sup/dépassements)
   - Applique tarif selon grille → `rate_grid` + `rate_income_bracket`
   - Crée `invoice` (status = 'draft')
   - Crée lignes détaillées → `invoice_line` (accueil, repas, suppléments, etc.)
   - Calcule part CAF / part famille
3. Génération PDF facture → `invoice.invoice_pdf_url`
4. `invoice.status` passe à 'sent'
5. Envoi email aux familles avec PDF

**2. Enregistrement paiements:**
1. Famille paie (virement, prélèvement, chèque, etc.)
2. Owner enregistre paiement → `payment` créé
3. Paiement lié à facture → `payment.invoice_id`
4. Système met à jour `invoice.paid_amount` et `invoice.remaining_amount`
5. Si `remaining_amount = 0` → `invoice.status` = 'paid'

**3. Gestion impayés:**
1. Chaque jour, système détecte factures impayées après échéance
2. `invoice.status` passe à 'overdue'
3. Selon nombre de jours de retard:
   - J+7: 1ère relance automatique → `debt_collection` (type = 'first_reminder')
   - J+15: 2e relance → `debt_collection` (type = 'second_reminder')
   - J+30: Mise en demeure → `debt_collection` (type = 'final_notice')
4. Emails et courriers automatiques

**4. Avoirs:**
1. Si erreur ou trop-perçu → Owner crée `credit_note`
2. Avoir peut être:
   - Déduit d'une facture future → `credit_note.applied_to_invoice_id`
   - Remboursé à la famille
3. Génération PDF avoir

**5. Export comptable:**
1. Owner exporte période → Choix format (FEC, CSV, Sage, etc.)
2. Système génère fichier avec toutes les écritures → `accounting_export`
3. Fichier téléchargeable pour import dans logiciel comptable

---

## 5.3 Services TypeScript à Créer

```typescript
// lib/services/invoicing.service.ts
export class InvoicingService {
  // Génération factures
  async generateMonthlyInvoices(nurseryId: string, month: Date): Promise<Invoice[]>
  async generateInvoice(contractId: string, periodStart: Date, periodEnd: Date): Promise<Invoice>
  async calculateInvoiceAmount(contractId: string, attendances: Attendance[]): Promise<InvoiceCalculation>

  // CRUD factures
  async getByFamily(familyId: string): Promise<Invoice[]>
  async getByNursery(nurseryId: string, filters?: InvoiceFilters): Promise<Invoice[]>
  async getOverdueInvoices(nurseryId: string): Promise<Invoice[]>
  async updateInvoice(invoiceId: string, data: UpdateInvoiceInput): Promise<Invoice>
  async cancelInvoice(invoiceId: string, reason: string): Promise<void>

  // Génération PDF
  async generateInvoicePDF(invoiceId: string): Promise<string>  // Retourne URL PDF
  async sendInvoiceByEmail(invoiceId: string): Promise<void>

  // Lignes de facture
  async addInvoiceLine(invoiceId: string, line: InvoiceLineInput): Promise<InvoiceLine>
  async updateInvoiceLine(lineId: string, data: UpdateInvoiceLineInput): Promise<InvoiceLine>
  async deleteInvoiceLine(lineId: string): Promise<void>
}

// lib/services/payment.service.ts
export class PaymentService {
  // Enregistrement paiements
  async recordPayment(invoiceId: string, data: RecordPaymentInput): Promise<Payment>
  async getByFamily(familyId: string): Promise<Payment[]>
  async getByInvoice(invoiceId: string): Promise<Payment[]>
  async validatePayment(paymentId: string, validatedById: string): Promise<void>
  async refundPayment(paymentId: string, reason: string): Promise<void>

  // Moyens de paiement
  async addPaymentMethod(familyId: string, data: PaymentMethodInput): Promise<PaymentMethod>
  async getPaymentMethods(familyId: string): Promise<PaymentMethod[]>
  async setDefaultPaymentMethod(methodId: string): Promise<void>
  async verifyIBAN(iban: string): Promise<boolean>
}

// lib/services/billing-period.service.ts
export class BillingPeriodService {
  async create(nurseryId: string, periodStart: Date, periodEnd: Date): Promise<BillingPeriod>
  async getByNursery(nurseryId: string): Promise<BillingPeriod[]>
  async getCurrentPeriod(nurseryId: string): Promise<BillingPeriod>
  async closePeriod(periodId: string): Promise<void>
  async finalizePeriod(periodId: string): Promise<void>
  async getStats(periodId: string): Promise<BillingPeriodStats>
}

// lib/services/credit-note.service.ts
export class CreditNoteService {
  async create(invoiceId: string, amount: number, reason: string): Promise<CreditNote>
  async getByFamily(familyId: string): Promise<CreditNote[]>
  async applyToInvoice(creditNoteId: string, invoiceId: string): Promise<void>
  async generateCreditNotePDF(creditNoteId: string): Promise<string>
}

// lib/services/debt-collection.service.ts
export class DebtCollectionService {
  async sendReminder(invoiceId: string, reminderType: string): Promise<DebtCollection>
  async getReminders(invoiceId: string): Promise<DebtCollection[]>
  async getPendingReminders(nurseryId: string): Promise<DebtCollection[]>
  async processAutomaticReminders(nurseryId: string): Promise<void>  // Relances automatiques
  async proposePaymentPlan(reminderId: string, plan: PaymentPlanInput): Promise<void>
}

// lib/services/accounting-export.service.ts
export class AccountingExportService {
  async export(nurseryId: string, format: string, periodStart: Date, periodEnd: Date): Promise<AccountingExport>
  async getExports(nurseryId: string): Promise<AccountingExport[]>
  async generateFEC(nurseryId: string, year: number): Promise<string>  // Format FEC obligatoire en France
  async generateCSV(nurseryId: string, periodStart: Date, periodEnd: Date): Promise<string>
}

// lib/services/ledger.service.ts
export class LedgerService {
  async createEntry(nurseryId: string, entry: LedgerEntryInput): Promise<LedgerEntry>
  async getEntries(nurseryId: string, filters?: LedgerFilters): Promise<LedgerEntry[]>
  async getBalance(nurseryId: string, accountCode: string): Promise<number>
  async getTrialBalance(nurseryId: string, date: Date): Promise<TrialBalance>
}
```

---

## 5.4 Pages UI à Créer

### Routes Propriétaire (Owner)

```
/owner/invoicing                    - Dashboard facturation (stats, impayés, actions)
/owner/invoicing/invoices           - Liste factures (avec filtres)
/owner/invoicing/invoices/generate  - Générer factures mensuelles
/owner/invoicing/invoices/[id]      - Détail facture (avec lignes, paiements)
/owner/invoicing/invoices/[id]/edit - Édition facture
/owner/invoicing/invoices/[id]/send - Envoyer facture

/owner/invoicing/payments           - Liste paiements reçus
/owner/invoicing/payments/new       - Enregistrer paiement
/owner/invoicing/payments/[id]      - Détail paiement

/owner/invoicing/overdue            - Factures impayées (avec relances)
/owner/invoicing/reminders          - Gestion relances
/owner/invoicing/reminders/send     - Envoyer relance manuelle

/owner/invoicing/credit-notes       - Liste avoirs
/owner/invoicing/credit-notes/new   - Créer avoir

/owner/invoicing/periods            - Périodes de facturation
/owner/invoicing/periods/[id]       - Détail période (stats, factures)

/owner/invoicing/exports            - Exports comptables
/owner/invoicing/exports/new        - Nouvel export (choix format, période)

/owner/invoicing/reports            - Rapports financiers (CA, encaissements, taux paiement)
```

### Routes Famille (Portal Parents - Phase 6)

```
/portal/invoices                    - Mes factures
/portal/invoices/[id]               - Détail facture (PDF téléchargeable)
/portal/payments                    - Mes paiements
/portal/payment-methods             - Mes moyens de paiement
/portal/payment-methods/add         - Ajouter moyen paiement
```

### Composants Réutilisables

```typescript
// components/invoicing/InvoiceCard.tsx
// components/invoicing/InvoiceForm.tsx
// components/invoicing/InvoiceLineEditor.tsx
// components/invoicing/InvoicePDFViewer.tsx
// components/invoicing/InvoiceStatusBadge.tsx
// components/invoicing/InvoiceStats.tsx

// components/payments/PaymentCard.tsx
// components/payments/PaymentForm.tsx
// components/payments/PaymentMethodCard.tsx
// components/payments/PaymentMethodForm.tsx
// components/payments/IBANInput.tsx                (Validation IBAN)

// components/invoicing/CreditNoteCard.tsx
// components/invoicing/CreditNoteForm.tsx

// components/debt-collection/ReminderCard.tsx
// components/debt-collection/ReminderTimeline.tsx   (Historique relances)
// components/debt-collection/OverdueAlert.tsx
// components/debt-collection/PaymentPlanForm.tsx

// components/accounting/BillingPeriodCard.tsx
// components/accounting/ExportFormatSelector.tsx
// components/accounting/FinancialReportChart.tsx
// components/accounting/RevenueChart.tsx
// components/accounting/PaymentRateGauge.tsx         (Taux de paiement)
```

---

## 5.5 Migrations SQL

```
migrations/
  50_phase5_invoices.sql            - invoice, invoice_line
  51_phase5_payments.sql            - payment, payment_method
  52_phase5_billing_periods.sql     - billing_period
  53_phase5_credit_notes.sql        - credit_note
  54_phase5_debt_collection.sql     - debt_collection
  55_phase5_accounting.sql          - accounting_export, ledger_entry
  56_phase5_indexes.sql             - Index de performance
  57_phase5_rls.sql                 - Row Level Security
  58_phase5_functions.sql           - Fonctions (calcul facturation, relances automatiques)
  59_phase5_triggers.sql            - Triggers (mise à jour statuts, alertes)
```

---

## 5.6 Complexité et Estimation

- **Migrations SQL**: 2 jours (9 tables + logique calculs)
- **Services**: 4 jours (invoicing, payment, billing-period, debt-collection, accounting-export)
- **Pages Owner**: 5 jours (dashboard, factures, paiements, relances, exports)
- **Composants UI**: 3 jours (éditeur factures, PDF viewers, graphiques financiers)
- **Génération PDF**: 2 jours (templates factures, avoirs, relances)
- **Intégrations**: 3 jours (Stripe API pour paiements en ligne, génération FEC)
- **Tests & Debug**: 3 jours

**Total Phase 5**: ~22 jours de développement

### Risques Identifiés

1. **Calcul facturation**: Logique complexe (horaires contractuels vs réels, heures supplémentaires, tarifs PSU, part CAF)
2. **Génération PDF**: Templates conformes (mentions légales, TVA, numérotation)
3. **Export FEC**: Format très strict imposé par l'administration fiscale française
4. **Paiements en ligne**: Intégration Stripe/PayPal (PCI DSS compliance)
5. **Relances automatiques**: Éviter spam, respecter RGPD, gérer cas particuliers

---

**(Les Phases 6-9 continuent dans le message suivant...)**

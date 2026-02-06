# DATABASE.md - Schéma de Base de Données Luniqo

> **Document de référence** - Ce fichier documente l'ensemble du schéma de base de données de l'application Luniqo.
> Dernière mise à jour : 2026-01-20

## Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Diagramme Mermaid](#diagramme-mermaid)
3. [Tables par Module](#tables-par-module)
4. [Types ENUM](#types-enum)
5. [Fonctions SQL](#fonctions-sql)

---

## Vue d'ensemble

La base de données Luniqo est organisée en **8 modules fonctionnels** correspondant aux phases de développement :

| Phase | Module | Tables | Description |
|-------|--------|--------|-------------|
| 0 | **Core** | 6 | Enterprise, Profiles, Nursery, Modules |
| 1 | **Enfants & Familles** | 11 | Familles, Guardians, Enfants, PAI |
| 2 | **Présences & Activités** | 12 | Attendance, Logs quotidiens, Activités |
| 3 | **Personnel & Planning RH** | 7 | Qualifications, Planning, Compliance |
| 4 | **Inscriptions & Contrats** | 6 | Applications, Contrats, Grilles tarifaires |
| 5 | **Facturation & Finances** | 9 | Factures, Paiements, Comptabilité |
| 6 | **Portail Parents** | 8 | Timeline, Messagerie, Documents |
| 7 | **Statistiques & Analyses** | 6 | KPIs, Rapports, Dashboard widgets |
| - | **Luniqo (Nettoyage)** | 4 | Rooms, Tasks, Sessions |
| - | **HACCP** | 3 | Dishes, Temperature logs |

**Total : ~72 tables**

---

## Diagramme Mermaid

```mermaid
erDiagram
    %% ==========================================
    %% CORE - Enterprise & Users
    %% ==========================================
    enterprise {
        uuid id PK
        uuid owner_id FK
        varchar name
        varchar address
        varchar city
        varchar postal_code
        varchar phone
        varchar email
        varchar siret
        boolean is_active
        timestamptz created_at
        timestamptz updated_at
    }

    profiles {
        uuid id PK
        user_type role
        varchar email
        varchar first_name
        varchar last_name
        varchar username
        varchar pin_hash
        varchar avatar_url
        uuid enterprise_id FK
        uuid primary_nursery_id FK
        uuid created_by_id FK
        boolean is_active
        timestamptz created_at
        timestamptz updated_at
    }

    nursery {
        uuid id PK
        uuid enterprise_id FK
        varchar name
        varchar address
        varchar city
        varchar postal_code
        varchar phone
        varchar email
        integer capacity
        boolean is_default
        boolean is_active
        timestamptz created_at
        timestamptz updated_at
    }

    employee_nursery_access {
        uuid id PK
        uuid employee_id FK
        uuid nursery_id FK
        timestamptz granted_at
        boolean is_active
    }

    %% ==========================================
    %% MODULES & PERMISSIONS
    %% ==========================================
    module {
        varchar id PK
        varchar name
        text description
        varchar category
        decimal price_monthly
        varchar icon_name
        boolean is_free
        boolean is_active
        integer display_order
        timestamptz created_at
        timestamptz updated_at
    }

    nursery_module_access {
        uuid id PK
        uuid nursery_id FK
        varchar module_id FK
        timestamptz granted_at
        uuid granted_by_id FK
        timestamptz expires_at
        boolean is_active
        text notes
        timestamptz created_at
        timestamptz updated_at
    }

    nursery_module_access_request {
        uuid id PK
        uuid nursery_id FK
        varchar module_id FK
        uuid requested_by_id FK
        varchar status
        text message
        uuid reviewed_by_id FK
        timestamptz reviewed_at
        text rejection_reason
        timestamptz created_at
        timestamptz updated_at
    }

    %% ==========================================
    %% PHASE 1 - ENFANTS & FAMILLES
    %% ==========================================
    family {
        uuid id PK
        uuid nursery_id FK
        varchar family_code
        varchar primary_email
        varchar primary_phone
        text address
        varchar city
        varchar postal_code
        text notes
        boolean is_active
        timestamptz created_at
        timestamptz updated_at
    }

    guardian {
        uuid id PK
        uuid family_id FK
        varchar first_name
        varchar last_name
        varchar email
        varchar phone
        varchar phone_secondary
        guardian_type guardian_type
        varchar profession
        varchar employer
        boolean is_primary_contact
        boolean is_authorized_pickup
        boolean is_emergency_contact
        boolean is_active
        timestamptz created_at
        timestamptz updated_at
    }

    guardian_child {
        uuid id PK
        uuid guardian_id FK
        uuid child_id FK
        guardian_relationship relationship
        boolean is_primary_guardian
        boolean is_authorized_pickup
        boolean can_receive_reports
        timestamptz created_at
    }

    guardian_address {
        uuid id PK
        uuid guardian_id FK
        address_type address_type
        text address
        varchar city
        varchar postal_code
        varchar country
        boolean is_primary
        timestamptz created_at
        timestamptz updated_at
    }

    guardian_user {
        uuid id PK
        uuid guardian_id FK
        uuid user_id FK
        varchar email
        varchar password_hash
        boolean is_active
        timestamptz last_login
        varchar app_language
        boolean push_notifications_enabled
        boolean email_notifications_enabled
        boolean sms_notifications_enabled
        varchar fcm_token
        varchar apns_token
        timestamptz push_token_updated_at
        timestamptz last_app_access
        varchar app_version
        varchar device_type
        varchar device_model
        varchar theme_preference
        boolean notifications_sound_enabled
        boolean notifications_vibration_enabled
        timestamptz created_at
        timestamptz updated_at
    }

    child {
        uuid id PK
        uuid nursery_id FK
        uuid family_id FK
        uuid section_id FK
        varchar first_name
        varchar last_name
        date birth_date
        gender gender
        varchar photo_url
        child_status status
        date enrollment_date
        date exit_date
        text allergies
        text medical_notes
        text dietary_restrictions
        boolean has_pai
        boolean is_active
        timestamptz created_at
        timestamptz updated_at
    }

    section {
        uuid id PK
        uuid nursery_id FK
        varchar name
        integer min_age_months
        integer max_age_months
        integer capacity
        varchar color
        text description
        boolean is_active
        timestamptz created_at
        timestamptz updated_at
    }

    child_health {
        uuid id PK
        uuid child_id FK
        varchar blood_type
        text chronic_conditions
        text current_medications
        text vaccination_status
        date last_medical_visit
        varchar pediatrician_name
        varchar pediatrician_phone
        text emergency_instructions
        timestamptz created_at
        timestamptz updated_at
    }

    pai {
        uuid id PK
        uuid child_id FK
        varchar pai_type
        text condition_description
        text symptoms
        text triggers
        pai_severity severity
        date start_date
        date end_date
        date review_date
        pai_status status
        varchar doctor_name
        varchar doctor_phone
        text doctor_notes
        text special_instructions
        boolean requires_medication
        boolean requires_training
        uuid created_by_id FK
        uuid validated_by_id FK
        timestamptz validated_at
        timestamptz created_at
        timestamptz updated_at
    }

    pai_medication {
        uuid id PK
        uuid pai_id FK
        varchar medication_name
        varchar dosage
        varchar administration_route
        varchar frequency
        text instructions
        boolean requires_prescription
        date prescription_expiry
        varchar storage_instructions
        boolean is_active
        timestamptz created_at
        timestamptz updated_at
    }

    pai_action_plan {
        uuid id PK
        uuid pai_id FK
        varchar trigger_symptom
        text action_steps
        varchar urgency_level
        boolean call_emergency
        boolean call_parents
        boolean call_doctor
        text additional_notes
        integer display_order
        timestamptz created_at
        timestamptz updated_at
    }

    %% ==========================================
    %% PHASE 2 - PRESENCES & ACTIVITES
    %% ==========================================
    attendance {
        uuid id PK
        uuid child_id FK
        uuid nursery_id FK
        date attendance_date
        attendance_status status
        time scheduled_arrival
        time scheduled_departure
        text notes
        timestamptz created_at
        timestamptz updated_at
    }

    check_in {
        uuid id PK
        uuid attendance_id FK
        timestamptz check_in_time
        uuid checked_in_by FK
        uuid dropped_off_by FK
        varchar drop_off_person_name
        text morning_notes
        text health_notes
        decimal temperature
        boolean has_medication
        timestamptz created_at
    }

    check_out {
        uuid id PK
        uuid attendance_id FK
        timestamptz check_out_time
        uuid checked_out_by FK
        uuid picked_up_by FK
        varchar pickup_person_name
        text afternoon_notes
        text activity_summary
        boolean authorization_verified
        timestamptz created_at
    }

    absence {
        uuid id PK
        uuid child_id FK
        uuid nursery_id FK
        date start_date
        date end_date
        absence_type absence_type
        absence_reason reason
        text notes
        boolean is_planned
        boolean is_justified
        varchar justification_document_url
        uuid reported_by_id FK
        timestamptz created_at
        timestamptz updated_at
    }

    child_meal_log {
        uuid id PK
        uuid attendance_id FK
        uuid child_id FK
        meal_type meal_type
        time meal_time
        meal_quantity quantity_eaten
        boolean ate_well
        text notes
        uuid logged_by_id FK
        timestamptz created_at
    }

    child_sleep_log {
        uuid id PK
        uuid attendance_id FK
        uuid child_id FK
        timestamptz sleep_start
        timestamptz sleep_end
        integer duration_minutes
        sleep_quality quality
        text notes
        uuid logged_by_id FK
        timestamptz created_at
    }

    child_change_log {
        uuid id PK
        uuid attendance_id FK
        uuid child_id FK
        timestamptz change_time
        change_type change_type
        text notes
        uuid logged_by_id FK
        timestamptz created_at
    }

    activity {
        uuid id PK
        uuid nursery_id FK
        uuid section_id FK
        varchar name
        text description
        activity_type activity_type
        varchar color
        integer duration_minutes
        integer min_age_months
        integer max_age_months
        boolean is_active
        timestamptz created_at
        timestamptz updated_at
    }

    activity_participation {
        uuid id PK
        uuid activity_id FK
        uuid child_id FK
        uuid attendance_id FK
        date participation_date
        timestamptz start_time
        timestamptz end_time
        participation_level participation_level
        text notes
        uuid logged_by_id FK
        timestamptz created_at
    }

    activity_document {
        uuid id PK
        uuid activity_participation_id FK
        document_type document_type
        varchar file_url
        varchar file_name
        varchar mime_type
        integer file_size
        boolean is_shareable
        timestamptz created_at
    }

    child_planned_schedule {
        uuid id PK
        uuid child_id FK
        uuid contract_id FK
        day_of_week day_of_week
        time arrival_time
        time departure_time
        boolean is_active
        date effective_from
        date effective_until
        timestamptz created_at
        timestamptz updated_at
    }

    child_observation {
        uuid id PK
        uuid child_id FK
        uuid attendance_id FK
        uuid observer_id FK
        observation_type observation_type
        text content
        boolean is_shared_with_parents
        timestamptz created_at
        timestamptz updated_at
    }

    %% ==========================================
    %% PHASE 3 - PERSONNEL & PLANNING RH
    %% ==========================================
    qualification_type {
        uuid id PK
        varchar name
        varchar code
        text description
        boolean is_required_for_ratio
        boolean is_active
        timestamptz created_at
        timestamptz updated_at
    }

    employee_qualification {
        uuid id PK
        uuid employee_id FK
        uuid qualification_type_id FK
        varchar qualification_name
        varchar institution
        date obtained_date
        date expiry_date
        varchar document_url
        qualification_status status
        timestamptz created_at
        timestamptz updated_at
    }

    employee_document {
        uuid id PK
        uuid employee_id FK
        employee_document_type document_type
        varchar document_name
        varchar file_url
        date issue_date
        date expiry_date
        employee_document_status status
        text notes
        uuid uploaded_by_id FK
        timestamptz created_at
        timestamptz updated_at
    }

    employee_schedule {
        uuid id PK
        uuid employee_id FK
        uuid nursery_id FK
        date schedule_date
        time start_time
        time end_time
        decimal planned_hours
        decimal actual_hours
        schedule_status status
        text notes
        timestamptz created_at
        timestamptz updated_at
    }

    employee_absence {
        uuid id PK
        uuid employee_id FK
        uuid nursery_id FK
        date start_date
        date end_date
        employee_absence_type absence_type
        employee_absence_status status
        text reason
        varchar document_url
        uuid approved_by_id FK
        timestamptz approved_at
        timestamptz created_at
        timestamptz updated_at
    }

    section_assignment {
        uuid id PK
        uuid employee_id FK
        uuid section_id FK
        uuid nursery_id FK
        date assignment_date
        time start_time
        time end_time
        assignment_role role
        boolean is_primary
        timestamptz created_at
        timestamptz updated_at
    }

    staffing_compliance_check {
        uuid id PK
        uuid nursery_id FK
        uuid section_id FK
        date check_date
        time check_time
        integer children_present
        integer staff_present
        integer qualified_staff_present
        decimal required_ratio
        decimal actual_ratio
        boolean is_compliant
        text notes
        uuid checked_by_id FK
        timestamptz created_at
    }

    %% ==========================================
    %% PHASE 4 - INSCRIPTIONS & CONTRATS
    %% ==========================================
    application {
        uuid id PK
        uuid nursery_id FK
        uuid family_id FK
        varchar child_first_name
        varchar child_last_name
        date child_birth_date
        date desired_start_date
        application_status status
        application_type application_type
        text parent_notes
        text admin_notes
        uuid processed_by_id FK
        timestamptz processed_at
        timestamptz created_at
        timestamptz updated_at
    }

    waiting_list_entry {
        uuid id PK
        uuid application_id FK
        uuid nursery_id FK
        integer position
        integer priority_score
        date desired_start_date
        text flexibility_notes
        waiting_list_status status
        timestamptz created_at
        timestamptz updated_at
    }

    admission {
        uuid id PK
        uuid application_id FK
        uuid child_id FK
        uuid nursery_id FK
        date admission_date
        date adaptation_start_date
        date adaptation_end_date
        admission_status status
        text notes
        uuid admitted_by_id FK
        timestamptz created_at
        timestamptz updated_at
    }

    contract {
        uuid id PK
        uuid child_id FK
        uuid family_id FK
        uuid nursery_id FK
        varchar contract_number
        contract_type contract_type
        contract_status status
        date start_date
        date end_date
        decimal monthly_base_amount
        decimal hourly_rate
        integer contracted_hours_per_week
        integer contracted_days_per_week
        text schedule_details
        decimal caf_participation
        decimal employer_participation
        decimal family_participation
        uuid rate_grid_id FK
        text special_conditions
        uuid signed_by_id FK
        timestamptz signed_at
        timestamptz created_at
        timestamptz updated_at
    }

    rate_grid {
        uuid id PK
        uuid nursery_id FK
        varchar name
        rate_grid_type grid_type
        integer year
        boolean is_active
        boolean is_default
        text description
        timestamptz created_at
        timestamptz updated_at
    }

    rate_grid_tier {
        uuid id PK
        uuid rate_grid_id FK
        decimal income_min
        decimal income_max
        decimal hourly_rate
        decimal daily_rate
        decimal monthly_rate
        integer display_order
        timestamptz created_at
        timestamptz updated_at
    }

    %% ==========================================
    %% PHASE 5 - FACTURATION & FINANCES
    %% ==========================================
    invoice {
        uuid id PK
        uuid contract_id FK
        uuid family_id FK
        uuid nursery_id FK
        uuid billing_period_id FK
        varchar invoice_number
        date invoice_date
        date due_date
        invoice_status status
        decimal subtotal
        decimal tax_amount
        decimal total_amount
        decimal amount_paid
        decimal amount_due
        text notes
        varchar pdf_url
        uuid created_by_id FK
        timestamptz sent_at
        timestamptz paid_at
        timestamptz created_at
        timestamptz updated_at
    }

    invoice_line {
        uuid id PK
        uuid invoice_id FK
        varchar description
        invoice_line_type line_type
        integer quantity
        varchar unit
        decimal unit_price
        decimal total_price
        decimal tax_rate
        integer display_order
        timestamptz created_at
    }

    billing_period {
        uuid id PK
        uuid nursery_id FK
        varchar name
        date start_date
        date end_date
        billing_period_status status
        timestamptz closed_at
        uuid closed_by_id FK
        timestamptz created_at
        timestamptz updated_at
    }

    payment_method {
        uuid id PK
        uuid family_id FK
        payment_method_type method_type
        boolean is_default
        varchar holder_name
        varchar bank_name
        varchar iban
        varchar bic
        boolean is_active
        timestamptz created_at
        timestamptz updated_at
    }

    payment {
        uuid id PK
        uuid invoice_id FK
        uuid payment_method_id FK
        uuid family_id FK
        uuid nursery_id FK
        decimal amount
        date payment_date
        payment_status status
        varchar transaction_reference
        text notes
        uuid recorded_by_id FK
        timestamptz created_at
        timestamptz updated_at
    }

    credit_note {
        uuid id PK
        uuid invoice_id FK
        uuid nursery_id FK
        varchar credit_note_number
        date credit_date
        decimal amount
        credit_note_reason reason
        text description
        credit_note_status status
        uuid created_by_id FK
        timestamptz created_at
        timestamptz updated_at
    }

    debt_collection {
        uuid id PK
        uuid invoice_id FK
        uuid family_id FK
        uuid nursery_id FK
        debt_collection_status status
        integer reminder_count
        timestamptz last_reminder_date
        timestamptz next_reminder_date
        text notes
        uuid assigned_to_id FK
        timestamptz created_at
        timestamptz updated_at
    }

    accounting_export {
        uuid id PK
        uuid nursery_id FK
        uuid billing_period_id FK
        accounting_export_format format
        date export_date
        varchar file_url
        accounting_export_status status
        integer records_count
        uuid exported_by_id FK
        timestamptz created_at
    }

    ledger_entry {
        uuid id PK
        uuid nursery_id FK
        uuid billing_period_id FK
        date entry_date
        ledger_entry_type entry_type
        varchar account_code
        varchar description
        decimal debit_amount
        decimal credit_amount
        uuid related_invoice_id FK
        uuid related_payment_id FK
        uuid related_credit_note_id FK
        timestamptz created_at
    }

    %% ==========================================
    %% PHASE 6 - PORTAIL PARENTS
    %% ==========================================
    timeline_post {
        uuid id PK
        uuid nursery_id FK
        uuid section_id FK
        uuid child_id FK
        uuid author_id FK
        timeline_post_type post_type
        varchar title
        text content
        text media_urls
        text media_types
        boolean is_pinned
        timeline_visibility visibility
        integer likes_count
        integer comments_count
        timestamptz published_at
        timestamptz created_at
        timestamptz updated_at
    }

    parent_comment {
        uuid id PK
        uuid post_id FK
        uuid guardian_id FK
        text content
        boolean is_edited
        timestamptz created_at
        timestamptz updated_at
    }

    parent_message {
        uuid id PK
        uuid family_id FK
        uuid nursery_id FK
        uuid sender_guardian_id FK
        uuid sender_employee_id FK
        uuid recipient_guardian_id FK
        uuid recipient_employee_id FK
        varchar subject
        text message_text
        text attachments_urls
        text attachments_names
        boolean is_read
        timestamptz read_at
        parent_message_category message_category
        message_priority priority
        uuid reply_to_message_id FK
        timestamptz created_at
    }

    parent_notification {
        uuid id PK
        uuid guardian_id FK
        parent_notification_type notification_type
        varchar title
        text body
        text action_url
        uuid related_child_id FK
        uuid related_post_id FK
        uuid related_message_id FK
        uuid related_invoice_id FK
        uuid related_document_id FK
        boolean is_read
        timestamptz read_at
        boolean push_sent
        timestamptz push_sent_at
        text push_error
        timestamptz created_at
    }

    parent_document_share {
        uuid id PK
        uuid nursery_id FK
        document_share_scope share_scope
        uuid family_ids
        uuid child_id FK
        parent_document_type document_type
        varchar document_title
        text document_description
        text file_url
        varchar file_name
        integer file_size
        varchar mime_type
        date valid_from
        date valid_until
        integer download_count
        boolean requires_acknowledgment
        boolean is_published
        timestamptz published_at
        uuid published_by_id FK
        timestamptz created_at
    }

    document_acknowledgment {
        uuid id PK
        uuid document_share_id FK
        uuid guardian_id FK
        timestamptz acknowledged_at
        boolean downloaded
        integer download_count
        timestamptz last_downloaded_at
    }

    tax_certificate {
        uuid id PK
        uuid nursery_id FK
        uuid family_id FK
        uuid child_id FK
        integer certificate_year
        varchar certificate_number
        decimal total_paid_amount
        decimal caf_participation_amount
        decimal deductible_amount
        decimal tax_credit_amount
        date period_start
        date period_end
        text certificate_pdf_url
        uuid signed_by_id FK
        date signature_date
        text director_signature_url
        tax_certificate_status status
        date issued_date
        timestamptz sent_to_family_at
        text notes
        timestamptz created_at
        timestamptz updated_at
        uuid created_by_id FK
    }

    caf_document {
        uuid id PK
        uuid nursery_id FK
        uuid family_id FK
        uuid child_id FK
        caf_document_type document_type
        date month
        text document_url
        varchar document_number
        jsonb document_data
        caf_document_status status
        timestamptz generated_at
        timestamptz sent_to_family_at
        timestamptz sent_to_caf_at
        timestamptz validated_at
        text notes
        timestamptz created_at
        uuid created_by_id FK
    }

    %% ==========================================
    %% PHASE 7 - STATISTIQUES & ANALYSES
    %% ==========================================
    metric_snapshot {
        uuid id PK
        uuid nursery_id FK
        date snapshot_date
        metric_type metric_type
        varchar metric_name
        decimal metric_value
        varchar metric_unit
        jsonb metadata
        decimal previous_value
        decimal change_percentage
        boolean is_anomaly
        metric_frequency frequency
        timestamptz created_at
    }

    custom_report {
        uuid id PK
        uuid nursery_id FK
        uuid created_by_id FK
        varchar name
        text description
        report_type report_type
        jsonb config
        boolean schedule_enabled
        report_schedule_frequency schedule_frequency
        integer schedule_day_of_week
        integer schedule_day_of_month
        time schedule_time
        timestamptz next_execution_date
        report_format default_format
        boolean auto_send_email
        text recipient_emails
        boolean is_template
        boolean is_shared
        timestamptz last_executed_at
        integer execution_count
        timestamptz created_at
        timestamptz updated_at
    }

    report_execution_log {
        uuid id PK
        uuid report_id FK
        uuid executed_by_id FK
        report_execution_status execution_status
        timestamptz started_at
        timestamptz completed_at
        integer duration_ms
        report_format output_format
        text output_url
        integer row_count
        text error_message
        text error_stack
        timestamptz created_at
    }

    dashboard_template {
        uuid id PK
        varchar name
        text description
        varchar category
        jsonb widgets_config
        boolean is_default
        integer usage_count
        timestamptz created_at
        timestamptz updated_at
    }

    dashboard_widget {
        uuid id PK
        uuid owner_id FK
        uuid nursery_id FK
        widget_type widget_type
        varchar title
        text description
        jsonb data_config
        integer position_x
        integer position_y
        integer width
        integer height
        widget_size size_preset
        varchar color_scheme
        boolean show_legend
        boolean show_grid
        boolean show_tooltip
        widget_refresh_frequency refresh_frequency
        timestamptz last_refreshed_at
        jsonb cached_data
        timestamptz cache_expires_at
        boolean is_visible
        integer display_order
        timestamptz created_at
        timestamptz updated_at
    }

    analytics_event {
        uuid id PK
        uuid nursery_id FK
        uuid triggered_by_id FK
        analytics_event_category category
        varchar event_type
        event_severity severity
        varchar title
        text description
        jsonb event_data
        uuid related_child_id FK
        uuid related_staff_id FK
        uuid related_invoice_id FK
        uuid related_contract_id FK
        boolean is_anomaly
        decimal anomaly_score
        boolean is_resolved
        timestamptz resolved_at
        uuid resolved_by_id FK
        boolean notification_sent
        timestamptz notification_sent_at
        timestamptz event_timestamp
        timestamptz created_at
    }

    %% ==========================================
    %% LUNIQO - NETTOYAGE
    %% ==========================================
    room {
        uuid id PK
        uuid nursery_id FK
        varchar name
        varchar code
        text description
        boolean is_active
        integer display_order
        timestamptz created_at
        timestamptz updated_at
    }

    task_category {
        uuid id PK
        uuid enterprise_id FK
        varchar name
        varchar color
        text description
        boolean is_active
        integer display_order
        timestamptz created_at
        timestamptz updated_at
    }

    task {
        uuid id PK
        uuid enterprise_id FK
        uuid category_id FK
        varchar name
        text description
        task_frequency frequency
        boolean is_active
        integer display_order
        timestamptz created_at
        timestamptz updated_at
    }

    cleaning_session {
        uuid id PK
        uuid nursery_id FK
        uuid room_id FK
        uuid employee_id FK
        date session_date
        cleaning_session_status status
        timestamptz started_at
        timestamptz completed_at
        text notes
        timestamptz created_at
        timestamptz updated_at
    }

    %% ==========================================
    %% HACCP
    %% ==========================================
    haccp_dish {
        uuid id PK
        uuid nursery_id FK
        varchar name
        varchar category
        text description
        text allergens
        boolean is_active
        timestamptz created_at
        timestamptz updated_at
    }

    haccp_child_selection {
        uuid id PK
        uuid child_id FK
        uuid dish_id FK
        date selection_date
        text notes
        uuid selected_by_id FK
        timestamptz created_at
    }

    haccp_temperature_log {
        uuid id PK
        uuid nursery_id FK
        varchar equipment_name
        decimal temperature
        timestamptz logged_at
        uuid logged_by_id FK
        boolean is_compliant
        text notes
        timestamptz created_at
    }

    haccp_incident {
        uuid id PK
        uuid nursery_id FK
        varchar incident_type
        haccp_severity severity
        text description
        date incident_date
        text corrective_actions
        uuid reported_by_id FK
        haccp_incident_status status
        timestamptz resolved_at
        uuid resolved_by_id FK
        timestamptz created_at
        timestamptz updated_at
    }

    %% ==========================================
    %% RELATIONS
    %% ==========================================

    %% Core relations
    enterprise ||--|| profiles : "owner_id"
    enterprise ||--o{ nursery : "enterprise_id"
    profiles }o--|| enterprise : "enterprise_id"
    profiles }o--|| nursery : "primary_nursery_id"
    employee_nursery_access }o--|| profiles : "employee_id"
    employee_nursery_access }o--|| nursery : "nursery_id"

    %% Module permissions
    nursery_module_access }o--|| nursery : "nursery_id"
    nursery_module_access }o--|| module : "module_id"
    nursery_module_access_request }o--|| nursery : "nursery_id"
    nursery_module_access_request }o--|| module : "module_id"

    %% Family relations
    family }o--|| nursery : "nursery_id"
    guardian }o--|| family : "family_id"
    guardian_child }o--|| guardian : "guardian_id"
    guardian_child }o--|| child : "child_id"
    guardian_address }o--|| guardian : "guardian_id"
    guardian_user ||--|| guardian : "guardian_id"

    %% Child relations
    child }o--|| nursery : "nursery_id"
    child }o--|| family : "family_id"
    child }o--|| section : "section_id"
    section }o--|| nursery : "nursery_id"
    child_health ||--|| child : "child_id"
    pai }o--|| child : "child_id"
    pai_medication }o--|| pai : "pai_id"
    pai_action_plan }o--|| pai : "pai_id"

    %% Attendance relations
    attendance }o--|| child : "child_id"
    attendance }o--|| nursery : "nursery_id"
    check_in ||--|| attendance : "attendance_id"
    check_out ||--|| attendance : "attendance_id"
    absence }o--|| child : "child_id"
    child_meal_log }o--|| attendance : "attendance_id"
    child_sleep_log }o--|| attendance : "attendance_id"
    child_change_log }o--|| attendance : "attendance_id"

    %% Activity relations
    activity }o--|| nursery : "nursery_id"
    activity }o--|| section : "section_id"
    activity_participation }o--|| activity : "activity_id"
    activity_participation }o--|| child : "child_id"
    activity_document }o--|| activity_participation : "activity_participation_id"
    child_observation }o--|| child : "child_id"

    %% Staff relations
    employee_qualification }o--|| profiles : "employee_id"
    employee_qualification }o--|| qualification_type : "qualification_type_id"
    employee_document }o--|| profiles : "employee_id"
    employee_schedule }o--|| profiles : "employee_id"
    employee_schedule }o--|| nursery : "nursery_id"
    employee_absence }o--|| profiles : "employee_id"
    section_assignment }o--|| profiles : "employee_id"
    section_assignment }o--|| section : "section_id"
    staffing_compliance_check }o--|| nursery : "nursery_id"
    staffing_compliance_check }o--|| section : "section_id"

    %% Enrollment relations
    application }o--|| nursery : "nursery_id"
    application }o--|| family : "family_id"
    waiting_list_entry }o--|| application : "application_id"
    admission }o--|| application : "application_id"
    admission }o--|| child : "child_id"
    contract }o--|| child : "child_id"
    contract }o--|| family : "family_id"
    contract }o--|| nursery : "nursery_id"
    contract }o--|| rate_grid : "rate_grid_id"
    rate_grid }o--|| nursery : "nursery_id"
    rate_grid_tier }o--|| rate_grid : "rate_grid_id"

    %% Billing relations
    invoice }o--|| contract : "contract_id"
    invoice }o--|| family : "family_id"
    invoice }o--|| billing_period : "billing_period_id"
    invoice_line }o--|| invoice : "invoice_id"
    billing_period }o--|| nursery : "nursery_id"
    payment_method }o--|| family : "family_id"
    payment }o--|| invoice : "invoice_id"
    payment }o--|| payment_method : "payment_method_id"
    credit_note }o--|| invoice : "invoice_id"
    debt_collection }o--|| invoice : "invoice_id"
    accounting_export }o--|| nursery : "nursery_id"
    accounting_export }o--|| billing_period : "billing_period_id"
    ledger_entry }o--|| nursery : "nursery_id"

    %% Parent portal relations
    timeline_post }o--|| nursery : "nursery_id"
    timeline_post }o--|| section : "section_id"
    timeline_post }o--|| child : "child_id"
    parent_comment }o--|| timeline_post : "post_id"
    parent_comment }o--|| guardian : "guardian_id"
    parent_message }o--|| family : "family_id"
    parent_notification }o--|| guardian : "guardian_id"
    parent_document_share }o--|| nursery : "nursery_id"
    document_acknowledgment }o--|| parent_document_share : "document_share_id"
    document_acknowledgment }o--|| guardian : "guardian_id"
    tax_certificate }o--|| nursery : "nursery_id"
    tax_certificate }o--|| family : "family_id"
    tax_certificate }o--|| child : "child_id"
    caf_document }o--|| nursery : "nursery_id"
    caf_document }o--|| family : "family_id"
    caf_document }o--|| child : "child_id"

    %% Analytics relations
    metric_snapshot }o--|| nursery : "nursery_id"
    custom_report }o--|| nursery : "nursery_id"
    report_execution_log }o--|| custom_report : "report_id"
    dashboard_widget }o--|| profiles : "owner_id"
    dashboard_widget }o--|| nursery : "nursery_id"
    analytics_event }o--|| nursery : "nursery_id"

    %% Cleaning relations
    room }o--|| nursery : "nursery_id"
    task_category }o--|| enterprise : "enterprise_id"
    task }o--|| enterprise : "enterprise_id"
    task }o--|| task_category : "category_id"
    cleaning_session }o--|| nursery : "nursery_id"
    cleaning_session }o--|| room : "room_id"
    cleaning_session }o--|| profiles : "employee_id"

    %% HACCP relations
    haccp_dish }o--|| nursery : "nursery_id"
    haccp_child_selection }o--|| child : "child_id"
    haccp_child_selection }o--|| haccp_dish : "dish_id"
    haccp_temperature_log }o--|| nursery : "nursery_id"
    haccp_incident }o--|| nursery : "nursery_id"
```

---

## Tables par Module

### Module Core (Phase 0)

| Table | Description | Clés étrangères |
|-------|-------------|-----------------|
| `enterprise` | Compte commercial (entreprise) | `owner_id` → profiles |
| `profiles` | Utilisateurs unifiés (Developer, Owner, Employee) | `enterprise_id` → enterprise, `primary_nursery_id` → nursery |
| `nursery` | Établissement physique (crèche) | `enterprise_id` → enterprise |
| `employee_nursery_access` | Accès employé aux crèches (M2M) | `employee_id` → profiles, `nursery_id` → nursery |
| `module` | Catalogue des modules disponibles | - |
| `nursery_module_access` | Permissions modules par crèche | `nursery_id` → nursery, `module_id` → module |
| `nursery_module_access_request` | Demandes d'accès modules | `nursery_id` → nursery, `module_id` → module |

### Module Enfants & Familles (Phase 1)

| Table | Description | Clés étrangères |
|-------|-------------|-----------------|
| `family` | Dossier famille | `nursery_id` → nursery |
| `guardian` | Parent/tuteur | `family_id` → family |
| `guardian_child` | Liaison guardian-enfant (M2M) | `guardian_id` → guardian, `child_id` → child |
| `guardian_address` | Adresses des parents | `guardian_id` → guardian |
| `guardian_user` | Compte utilisateur parent (app mobile) | `guardian_id` → guardian |
| `child` | Dossier enfant | `nursery_id`, `family_id`, `section_id` |
| `section` | Section/groupe d'âge | `nursery_id` → nursery |
| `child_health` | Informations santé enfant | `child_id` → child |
| `pai` | Projet d'Accueil Individualisé | `child_id` → child |
| `pai_medication` | Médicaments PAI | `pai_id` → pai |
| `pai_action_plan` | Plan d'action PAI | `pai_id` → pai |

### Module Présences & Activités (Phase 2)

| Table | Description | Clés étrangères |
|-------|-------------|-----------------|
| `attendance` | Présence journalière | `child_id`, `nursery_id` |
| `check_in` | Pointage arrivée | `attendance_id` → attendance |
| `check_out` | Pointage départ | `attendance_id` → attendance |
| `absence` | Absences planifiées/signalées | `child_id`, `nursery_id` |
| `child_meal_log` | Log repas | `attendance_id`, `child_id` |
| `child_sleep_log` | Log sieste | `attendance_id`, `child_id` |
| `child_change_log` | Log changes | `attendance_id`, `child_id` |
| `activity` | Activités disponibles | `nursery_id`, `section_id` |
| `activity_participation` | Participation aux activités | `activity_id`, `child_id` |
| `activity_document` | Documents/photos activités | `activity_participation_id` |
| `child_planned_schedule` | Planning prévu enfant | `child_id`, `contract_id` |
| `child_observation` | Observations pédagogiques | `child_id`, `attendance_id` |

### Module Personnel & Planning RH (Phase 3)

| Table | Description | Clés étrangères |
|-------|-------------|-----------------|
| `qualification_type` | Types de qualifications | - |
| `employee_qualification` | Qualifications employés | `employee_id`, `qualification_type_id` |
| `employee_document` | Documents employés (contrats, etc.) | `employee_id` |
| `employee_schedule` | Planning horaires | `employee_id`, `nursery_id` |
| `employee_absence` | Absences employés | `employee_id`, `nursery_id` |
| `section_assignment` | Affectations aux sections | `employee_id`, `section_id` |
| `staffing_compliance_check` | Contrôles ratios | `nursery_id`, `section_id` |

### Module Inscriptions & Contrats (Phase 4)

| Table | Description | Clés étrangères |
|-------|-------------|-----------------|
| `application` | Candidatures/demandes | `nursery_id`, `family_id` |
| `waiting_list_entry` | Liste d'attente | `application_id`, `nursery_id` |
| `admission` | Admissions | `application_id`, `child_id` |
| `contract` | Contrats d'accueil | `child_id`, `family_id`, `nursery_id`, `rate_grid_id` |
| `rate_grid` | Grilles tarifaires | `nursery_id` |
| `rate_grid_tier` | Paliers tarifaires | `rate_grid_id` |

### Module Facturation & Finances (Phase 5)

| Table | Description | Clés étrangères |
|-------|-------------|-----------------|
| `invoice` | Factures | `contract_id`, `family_id`, `billing_period_id` |
| `invoice_line` | Lignes de facture | `invoice_id` |
| `billing_period` | Périodes de facturation | `nursery_id` |
| `payment_method` | Moyens de paiement | `family_id` |
| `payment` | Paiements | `invoice_id`, `payment_method_id` |
| `credit_note` | Avoirs | `invoice_id` |
| `debt_collection` | Recouvrement créances | `invoice_id`, `family_id` |
| `accounting_export` | Exports comptables | `nursery_id`, `billing_period_id` |
| `ledger_entry` | Écritures comptables | `nursery_id`, `billing_period_id` |

### Module Portail Parents (Phase 6)

| Table | Description | Clés étrangères |
|-------|-------------|-----------------|
| `timeline_post` | Posts timeline | `nursery_id`, `section_id`, `child_id` |
| `parent_comment` | Commentaires parents | `post_id`, `guardian_id` |
| `parent_message` | Messages privés | `family_id`, `nursery_id` |
| `parent_notification` | Notifications push | `guardian_id` |
| `parent_document_share` | Documents partagés | `nursery_id`, `child_id` |
| `document_acknowledgment` | Accusés de réception | `document_share_id`, `guardian_id` |
| `tax_certificate` | Attestations fiscales | `nursery_id`, `family_id`, `child_id` |
| `caf_document` | Documents CAF | `nursery_id`, `family_id`, `child_id` |

### Module Statistiques & Analyses (Phase 7)

| Table | Description | Clés étrangères |
|-------|-------------|-----------------|
| `metric_snapshot` | Snapshots KPIs quotidiens | `nursery_id` |
| `custom_report` | Rapports personnalisés | `nursery_id`, `created_by_id` |
| `report_execution_log` | Logs d'exécution rapports | `report_id`, `executed_by_id` |
| `dashboard_template` | Templates de dashboard | - |
| `dashboard_widget` | Widgets dashboard | `owner_id`, `nursery_id` |
| `analytics_event` | Événements analytiques | `nursery_id`, `triggered_by_id` |

### Module Luniqo (Nettoyage)

| Table | Description | Clés étrangères |
|-------|-------------|-----------------|
| `room` | Pièces à nettoyer | `nursery_id` |
| `task_category` | Catégories de tâches | `enterprise_id` |
| `task` | Tâches de nettoyage | `enterprise_id`, `category_id` |
| `cleaning_session` | Sessions de nettoyage | `nursery_id`, `room_id`, `employee_id` |

### Module HACCP

| Table | Description | Clés étrangères |
|-------|-------------|-----------------|
| `haccp_dish` | Plats HACCP | `nursery_id` |
| `haccp_child_selection` | Sélection plats enfants | `child_id`, `dish_id` |
| `haccp_temperature_log` | Relevés températures | `nursery_id` |
| `haccp_incident` | Incidents HACCP | `nursery_id` |

---

## Types ENUM

### Core

```sql
-- Rôles utilisateurs
CREATE TYPE user_type AS ENUM ('Developer', 'Owner', 'Employee');
```

### Phase 1 - Enfants & Familles

```sql
CREATE TYPE guardian_type AS ENUM ('mother', 'father', 'legal_guardian', 'other');
CREATE TYPE guardian_relationship AS ENUM ('parent', 'grandparent', 'sibling', 'other_family', 'nanny', 'other');
CREATE TYPE address_type AS ENUM ('home', 'work', 'other');
CREATE TYPE gender AS ENUM ('male', 'female', 'other');
CREATE TYPE child_status AS ENUM ('active', 'adaptation', 'suspended', 'departed');
CREATE TYPE pai_severity AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE pai_status AS ENUM ('draft', 'pending_validation', 'active', 'expired', 'archived');
```

### Phase 2 - Présences & Activités

```sql
CREATE TYPE attendance_status AS ENUM ('expected', 'present', 'absent', 'late', 'early_departure');
CREATE TYPE absence_type AS ENUM ('sick', 'vacation', 'family', 'other');
CREATE TYPE absence_reason AS ENUM ('illness', 'medical_appointment', 'family_event', 'vacation', 'other');
CREATE TYPE meal_type AS ENUM ('breakfast', 'morning_snack', 'lunch', 'afternoon_snack', 'dinner');
CREATE TYPE meal_quantity AS ENUM ('nothing', 'little', 'half', 'most', 'all');
CREATE TYPE sleep_quality AS ENUM ('poor', 'fair', 'good', 'excellent');
CREATE TYPE change_type AS ENUM ('diaper', 'potty', 'toilet', 'accident');
CREATE TYPE activity_type AS ENUM ('motor', 'sensory', 'creative', 'cognitive', 'social', 'outdoor', 'music', 'reading', 'other');
CREATE TYPE participation_level AS ENUM ('not_interested', 'observed', 'participated', 'very_engaged');
CREATE TYPE document_type AS ENUM ('photo', 'video', 'drawing', 'other');
CREATE TYPE day_of_week AS ENUM ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday');
CREATE TYPE observation_type AS ENUM ('developmental', 'behavioral', 'health', 'achievement', 'general');
```

### Phase 3 - Personnel & Planning RH

```sql
CREATE TYPE qualification_status AS ENUM ('valid', 'expired', 'pending_renewal');
CREATE TYPE employee_document_type AS ENUM ('contract', 'diploma', 'certificate', 'id', 'medical', 'other');
CREATE TYPE employee_document_status AS ENUM ('valid', 'expiring_soon', 'expired');
CREATE TYPE schedule_status AS ENUM ('planned', 'confirmed', 'modified', 'cancelled');
CREATE TYPE employee_absence_type AS ENUM ('sick', 'vacation', 'personal', 'training', 'maternity', 'other');
CREATE TYPE employee_absence_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');
CREATE TYPE assignment_role AS ENUM ('primary', 'support', 'float');
```

### Phase 4 - Inscriptions & Contrats

```sql
CREATE TYPE application_status AS ENUM ('pending', 'under_review', 'waitlisted', 'accepted', 'rejected', 'withdrawn');
CREATE TYPE application_type AS ENUM ('new_enrollment', 'sibling', 'transfer', 'temporary');
CREATE TYPE waiting_list_status AS ENUM ('active', 'offered', 'accepted', 'declined', 'expired');
CREATE TYPE admission_status AS ENUM ('pending_documents', 'adaptation', 'active', 'completed', 'cancelled');
CREATE TYPE contract_type AS ENUM ('psu', 'paje', 'cmg', 'private', 'occasional');
CREATE TYPE contract_status AS ENUM ('draft', 'pending_signature', 'active', 'suspended', 'terminated', 'expired');
CREATE TYPE rate_grid_type AS ENUM ('psu', 'paje', 'custom');
```

### Phase 5 - Facturation & Finances

```sql
CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'paid', 'partial', 'overdue', 'cancelled', 'refunded');
CREATE TYPE invoice_line_type AS ENUM ('care', 'meals', 'activities', 'supplies', 'late_fee', 'discount', 'other');
CREATE TYPE billing_period_status AS ENUM ('open', 'closed', 'archived');
CREATE TYPE payment_method_type AS ENUM ('bank_transfer', 'direct_debit', 'check', 'cash', 'card', 'cesu');
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
CREATE TYPE credit_note_reason AS ENUM ('absence', 'error', 'commercial_gesture', 'other');
CREATE TYPE credit_note_status AS ENUM ('draft', 'issued', 'applied', 'cancelled');
CREATE TYPE debt_collection_status AS ENUM ('monitoring', 'reminder_1', 'reminder_2', 'reminder_3', 'legal', 'resolved', 'written_off');
CREATE TYPE accounting_export_format AS ENUM ('csv', 'xml', 'fec', 'sage', 'cegid');
CREATE TYPE accounting_export_status AS ENUM ('pending', 'completed', 'failed');
CREATE TYPE ledger_entry_type AS ENUM ('invoice', 'payment', 'credit_note', 'adjustment');
```

### Phase 6 - Portail Parents

```sql
CREATE TYPE timeline_post_type AS ENUM ('photo', 'video', 'activity_report', 'announcement', 'daily_summary', 'milestone');
CREATE TYPE timeline_visibility AS ENUM ('public', 'section', 'child_only');
CREATE TYPE parent_message_category AS ENUM ('general', 'absence_notification', 'urgent', 'administrative', 'inquiry', 'feedback');
CREATE TYPE message_priority AS ENUM ('low', 'normal', 'high', 'urgent');
CREATE TYPE parent_notification_type AS ENUM ('new_post', 'new_message', 'invoice_available', 'payment_reminder', 'document_uploaded', 'authorization_expiring', 'announcement', 'contract_reminder', 'absence_confirmation');
CREATE TYPE document_share_scope AS ENUM ('all_families', 'specific_families', 'specific_child');
CREATE TYPE parent_document_type AS ENUM ('menu', 'calendar', 'regulation', 'invoice', 'certificate', 'report', 'photo_album', 'announcement', 'consent_form', 'contract', 'newsletter', 'activity_report');
CREATE TYPE tax_certificate_status AS ENUM ('draft', 'issued', 'sent', 'downloaded');
CREATE TYPE caf_document_type AS ENUM ('attendance_certificate', 'payment_proof', 'contract_copy', 'tariff_justification', 'monthly_statement');
CREATE TYPE caf_document_status AS ENUM ('generated', 'sent_to_family', 'sent_to_caf', 'validated');
```

### Phase 7 - Statistiques & Analyses

```sql
CREATE TYPE metric_type AS ENUM ('OCCUPATION', 'FINANCIAL', 'STAFF', 'HACCP', 'PARENT_ENGAGEMENT');
CREATE TYPE metric_frequency AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY');
CREATE TYPE report_type AS ENUM ('FINANCIAL', 'OCCUPANCY', 'STAFF', 'HACCP', 'CHILDREN', 'PARENT_ENGAGEMENT', 'CUSTOM');
CREATE TYPE report_format AS ENUM ('PDF', 'EXCEL', 'CSV', 'JSON');
CREATE TYPE report_schedule_frequency AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'MANUAL');
CREATE TYPE report_execution_status AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');
CREATE TYPE widget_type AS ENUM ('KPI_CARD', 'LINE_CHART', 'BAR_CHART', 'PIE_CHART', 'AREA_CHART', 'GAUGE_CHART', 'FUNNEL_CHART', 'HEATMAP', 'DATA_TABLE', 'RANKING_LIST');
CREATE TYPE widget_size AS ENUM ('SMALL', 'MEDIUM', 'LARGE', 'XLARGE');
CREATE TYPE widget_refresh_frequency AS ENUM ('REALTIME', 'FAST', 'NORMAL', 'SLOW', 'MANUAL');
CREATE TYPE analytics_event_category AS ENUM ('ENROLLMENT', 'FINANCIAL', 'STAFF', 'HACCP', 'OCCUPANCY', 'PARENT_ENGAGEMENT', 'CONTRACT', 'SYSTEM');
CREATE TYPE event_severity AS ENUM ('INFO', 'WARNING', 'CRITICAL', 'SUCCESS');
```

### Luniqo & HACCP

```sql
CREATE TYPE task_frequency AS ENUM ('daily', 'weekly', 'monthly');
CREATE TYPE cleaning_session_status AS ENUM ('en_cours', 'completee');
CREATE TYPE haccp_severity AS ENUM ('minor', 'major', 'critical');
CREATE TYPE haccp_incident_status AS ENUM ('open', 'investigating', 'resolved', 'closed');
```

---

## Fonctions SQL

### Fonctions utilitaires

```sql
-- Mise à jour automatique de updated_at
CREATE FUNCTION update_updated_at_column() RETURNS TRIGGER;

-- Calcul pourcentage de changement
CREATE FUNCTION calculate_change_percentage(current DECIMAL, previous DECIMAL) RETURNS DECIMAL;

-- Détection d'anomalie métrique
CREATE FUNCTION detect_metric_anomaly(nursery_id UUID, metric_name VARCHAR, current_value DECIMAL, current_date DATE) RETURNS BOOLEAN;
```

### Fonctions Phase 5 (Facturation)

```sql
-- Génération numéro facture
CREATE FUNCTION generate_invoice_number(nursery_id UUID) RETURNS VARCHAR;

-- Calcul totaux facture
CREATE FUNCTION calculate_invoice_totals(invoice_id UUID) RETURNS VOID;
```

### Fonctions Phase 6 (Portail Parents)

```sql
-- Marquer message/notification comme lu
CREATE FUNCTION mark_message_as_read(message_id UUID) RETURNS VOID;
CREATE FUNCTION mark_notification_as_read(notification_id UUID) RETURNS VOID;
CREATE FUNCTION mark_all_notifications_read(guardian_id UUID) RETURNS VOID;

-- Compteurs non lus
CREATE FUNCTION get_unread_messages_count(guardian_id UUID) RETURNS INTEGER;
CREATE FUNCTION get_unread_notifications_count(guardian_id UUID) RETURNS INTEGER;

-- Documents
CREATE FUNCTION record_document_download(document_id UUID, guardian_id UUID) RETURNS VOID;
CREATE FUNCTION acknowledge_document(document_id UUID, guardian_id UUID) RETURNS VOID;
CREATE FUNCTION get_unacknowledged_documents(guardian_id UUID) RETURNS TABLE;
CREATE FUNCTION get_document_read_stats(document_id UUID) RETURNS TABLE;

-- Certificats
CREATE FUNCTION generate_tax_certificate_number(nursery_id UUID, year INTEGER) RETURNS VARCHAR;
CREATE FUNCTION generate_caf_document_number(nursery_id UUID, month DATE, doc_type caf_document_type) RETURNS VARCHAR;
CREATE FUNCTION calculate_tax_credit(deductible_amount DECIMAL, year INTEGER) RETURNS DECIMAL;

-- Push notifications
CREATE FUNCTION register_push_token(guardian_user_id UUID, token VARCHAR, platform VARCHAR) RETURNS VOID;
CREATE FUNCTION update_last_app_access(guardian_user_id UUID) RETURNS VOID;
CREATE FUNCTION get_guardians_with_push_enabled() RETURNS TABLE;
CREATE FUNCTION disable_all_notifications(guardian_user_id UUID) RETURNS VOID;
```

### Fonctions Phase 7 (Analytics)

```sql
-- Rapports
CREATE FUNCTION calculate_next_execution_date(frequency report_schedule_frequency, day_of_week INT, day_of_month INT, time TIME, from_date TIMESTAMPTZ) RETURNS TIMESTAMPTZ;

-- Dashboard
CREATE FUNCTION get_default_dashboard_widgets(owner_id UUID, nursery_id UUID) RETURNS TABLE;
CREATE FUNCTION create_default_dashboard(owner_id UUID, nursery_id UUID) RETURNS VOID;
CREATE FUNCTION is_widget_cache_expired(widget_id UUID) RETURNS BOOLEAN;
CREATE FUNCTION update_widget_cache(widget_id UUID, cached_data JSONB, ttl_minutes INT) RETURNS VOID;

-- Événements
CREATE FUNCTION create_analytics_event(...) RETURNS UUID;
CREATE FUNCTION resolve_analytics_event(event_id UUID, resolved_by_id UUID) RETURNS VOID;
CREATE FUNCTION get_unresolved_events_count(nursery_id UUID) RETURNS TABLE;
CREATE FUNCTION get_recent_anomalies(nursery_id UUID, days INT, limit INT) RETURNS TABLE;
CREATE FUNCTION get_event_timeline(nursery_id UUID, start_date DATE, end_date DATE, category analytics_event_category) RETURNS TABLE;
```

---

## Notes d'architecture

### Isolation des données

- **Niveau Enterprise** : task_category, task, profiles (employés partagés)
- **Niveau Nursery** : Toutes les données opérationnelles (rooms, sessions, attendance, HACCP, etc.)

### Relations clés

1. **Enterprise → Nursery** : 1:N (multi-site)
2. **Nursery → Module** : N:M via `nursery_module_access`
3. **Family → Guardian** : 1:N
4. **Family → Child** : 1:N
5. **Guardian → Child** : N:M via `guardian_child`
6. **Child → Attendance** : 1:N (par jour)
7. **Contract → Invoice** : 1:N

### Conventions de nommage

- Tables : `snake_case` singulier
- Colonnes FK : `{table}_id`
- Colonnes timestamp : `*_at`
- Colonnes date : `*_date`
- Booléens : `is_*`, `has_*`, `requires_*`
- ENUMs : `{table}_{field}` ou nom descriptif

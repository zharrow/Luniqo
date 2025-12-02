-- ============================================================================
-- cLean + HACCP Database Schema for Supabase
-- Complete migration from PostgreSQL (FastAPI) to Supabase
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE session_status AS ENUM ('EN_COURS', 'COMPLETEE', 'INCOMPLETE');
CREATE TYPE log_status AS ENUM ('FAIT', 'PARTIEL', 'REPORTE', 'IMPOSSIBLE');
CREATE TYPE meal_type AS ENUM ('Breakfast', 'Lunch', 'Snack');
CREATE TYPE checkpoint_type AS ENUM ('Reception', 'Holding', 'Service', 'Storage');
CREATE TYPE section_type AS ENUM ('Babies', 'Toddlers', 'Preschoolers');
CREATE TYPE compliance_type AS ENUM ('Product', 'Temperature', 'Hygiene', 'Other');
CREATE TYPE compliance_status AS ENUM ('Open', 'Corrected', 'Closed');
CREATE TYPE user_type AS ENUM ('Developer', 'Admin', 'User');
CREATE TYPE message_status AS ENUM ('Sent', 'Delivered', 'Read');
CREATE TYPE notification_priority AS ENUM ('Info', 'Warning', 'Critical');
CREATE TYPE notification_status AS ENUM ('Unread', 'Read', 'Archived');
CREATE TYPE cleaning_frequency AS ENUM ('Daily', 'Weekly', 'Monthly');
CREATE TYPE document_category AS ENUM ('Temperatures', 'Cleaning', 'Training', 'Compliance', 'Other');

-- ============================================================================
-- USER SYSTEM TABLES
-- ============================================================================

-- Super Admin table (Platform administrator)
CREATE TABLE super_admin (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    firebase_uid VARCHAR(255) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admin table (Daycare manager)
CREATE TABLE admin (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    firebase_uid VARCHAR(255) UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_by_id UUID REFERENCES super_admin(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enterprise table (Daycare/micro-daycare)
CREATE TABLE enterprise (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID UNIQUE NOT NULL REFERENCES admin(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    logo_url TEXT,
    legal_form VARCHAR(100),
    siret VARCHAR(14),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Employee table (Childcare staff)
CREATE TABLE employee (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    pin_code VARCHAR(255) NOT NULL, -- Hashed PIN
    enterprise_id UUID NOT NULL REFERENCES enterprise(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT TRUE,
    created_by_id UUID REFERENCES admin(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- CLEAN MODULE TABLES
-- ============================================================================

-- Room table
CREATE TABLE room (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enterprise_id UUID NOT NULL REFERENCES enterprise(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    display_order INT,
    image_key VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Employee-Room access (Many-to-Many)
CREATE TABLE employee_room_access (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employee(id) ON DELETE CASCADE,
    room_id UUID NOT NULL REFERENCES room(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(employee_id, room_id)
);

-- Task template
CREATE TABLE task_template (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enterprise_id UUID NOT NULL REFERENCES enterprise(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    default_duration INT,
    estimated_duration INT,
    category VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Assigned task
CREATE TABLE assigned_task (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID REFERENCES room(id) ON DELETE SET NULL,
    task_template_id UUID REFERENCES task_template(id) ON DELETE SET NULL,
    default_performer_id UUID REFERENCES employee(id) ON DELETE SET NULL,
    frequency JSONB,
    suggested_time TIME,
    expected_duration INT,
    order_in_room INT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Daily cleaning session
CREATE TABLE daily_cleaning_session (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enterprise_id UUID NOT NULL REFERENCES enterprise(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status session_status DEFAULT 'EN_COURS',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(enterprise_id, date)
);

-- Task completion log
CREATE TABLE task_completion (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES daily_cleaning_session(id) ON DELETE CASCADE,
    assigned_task_id UUID REFERENCES assigned_task(id) ON DELETE SET NULL,
    performed_by_id UUID REFERENCES employee(id) ON DELETE SET NULL,
    recorded_by_id UUID REFERENCES employee(id) ON DELETE SET NULL,
    status log_status NOT NULL,
    note TEXT,
    photo_urls JSONB,
    performed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Session export
CREATE TABLE session_export (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES daily_cleaning_session(id) ON DELETE SET NULL,
    pdf_url VARCHAR(500),
    zip_url VARCHAR(500),
    exported_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- HACCP MODULE TABLES
-- ============================================================================

-- Child table
CREATE TABLE child (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enterprise_id UUID NOT NULL REFERENCES enterprise(id) ON DELETE CASCADE,
    last_name VARCHAR(100) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    birth_date DATE NOT NULL,
    section section_type NOT NULL,
    allergies TEXT,
    specific_diet TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Supplier table
CREATE TABLE supplier (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enterprise_id UUID NOT NULL REFERENCES enterprise(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    contact_name VARCHAR(150),
    phone VARCHAR(50),
    email VARCHAR(150),
    address TEXT,
    haccp_certified BOOLEAN DEFAULT FALSE,
    validation_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Product table
CREATE TABLE product (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enterprise_id UUID NOT NULL REFERENCES enterprise(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    category VARCHAR(100),
    allergens TEXT,
    stock_unit VARCHAR(20),
    current_stock DECIMAL(10,2),
    expiry_date DATE,
    supplier_id UUID REFERENCES supplier(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Batch table
CREATE TABLE batch (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES product(id) ON DELETE CASCADE,
    batch_code VARCHAR(100) NOT NULL,
    reception_date DATE NOT NULL,
    received_quantity DECIMAL(10,2),
    reception_temperature DECIMAL(5,2),
    is_compliant BOOLEAN DEFAULT TRUE,
    observations TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Meal table
CREATE TABLE meal (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enterprise_id UUID NOT NULL REFERENCES enterprise(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    meal_type meal_type NOT NULL,
    description TEXT,
    supplier_id UUID REFERENCES supplier(id) ON DELETE SET NULL,
    batch_id UUID REFERENCES batch(id) ON DELETE SET NULL,
    responsible_id UUID REFERENCES employee(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Temperature check table
CREATE TABLE temperature_check (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    meal_id UUID NOT NULL REFERENCES meal(id) ON DELETE CASCADE,
    checkpoint checkpoint_type NOT NULL,
    temperature DECIMAL(5,2) NOT NULL,
    is_compliant BOOLEAN DEFAULT TRUE,
    observations TEXT,
    control_date TIMESTAMP WITH TIME ZONE NOT NULL,
    responsible_id UUID REFERENCES employee(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Child meal record table
CREATE TABLE child_meal_record (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    meal_id UUID NOT NULL REFERENCES meal(id) ON DELETE CASCADE,
    child_id UUID NOT NULL REFERENCES child(id) ON DELETE CASCADE,
    portion VARCHAR(50),
    observations TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(meal_id, child_id)
);

-- Equipment table
CREATE TABLE equipment (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enterprise_id UUID NOT NULL REFERENCES enterprise(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50),
    last_control_date DATE,
    target_temperature DECIMAL(5,2),
    is_compliant BOOLEAN DEFAULT TRUE,
    observations TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Food area cleaning table
CREATE TABLE food_area_cleaning (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enterprise_id UUID NOT NULL REFERENCES enterprise(id) ON DELETE CASCADE,
    zone VARCHAR(100) NOT NULL,
    product_used VARCHAR(100),
    frequency cleaning_frequency NOT NULL,
    cleaning_date TIMESTAMP WITH TIME ZONE NOT NULL,
    responsible_id UUID REFERENCES employee(id) ON DELETE SET NULL,
    observations TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- HACCP incident table
CREATE TABLE haccp_incident (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enterprise_id UUID NOT NULL REFERENCES enterprise(id) ON DELETE CASCADE,
    type compliance_type NOT NULL,
    description TEXT NOT NULL,
    report_date TIMESTAMP WITH TIME ZONE NOT NULL,
    corrective_action TEXT,
    status compliance_status DEFAULT 'Open',
    responsible_id UUID REFERENCES employee(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Document table
CREATE TABLE document (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enterprise_id UUID NOT NULL REFERENCES enterprise(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    category document_category NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    creation_date DATE NOT NULL,
    retention_period VARCHAR(50),
    responsible_id UUID REFERENCES employee(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- COMMUNICATION MODULE TABLES
-- ============================================================================

-- Support conversation table
CREATE TABLE support_conversation (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID NOT NULL REFERENCES admin(id) ON DELETE CASCADE,
    super_admin_id UUID NOT NULL REFERENCES super_admin(id) ON DELETE CASCADE,
    last_message_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(admin_id, super_admin_id)
);

-- Message table
CREATE TABLE message (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES support_conversation(id) ON DELETE CASCADE,
    sender_type user_type NOT NULL,
    sender_id UUID NOT NULL,
    recipient_type user_type NOT NULL,
    recipient_id UUID NOT NULL,
    content TEXT NOT NULL,
    status message_status DEFAULT 'Sent',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE
);

-- Notification table
CREATE TABLE notification (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enterprise_id UUID REFERENCES enterprise(id) ON DELETE CASCADE,
    recipient_type user_type NOT NULL,
    recipient_id UUID,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    type VARCHAR(100),
    priority notification_priority DEFAULT 'Info',
    status notification_status DEFAULT 'Unread',
    resource_type VARCHAR(50),
    resource_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- User system indexes
CREATE INDEX idx_admin_firebase_uid ON admin(firebase_uid);
CREATE INDEX idx_super_admin_firebase_uid ON super_admin(firebase_uid);
CREATE INDEX idx_enterprise_admin_id ON enterprise(admin_id);
CREATE INDEX idx_employee_enterprise_id ON employee(enterprise_id);
CREATE INDEX idx_employee_room_access_employee_id ON employee_room_access(employee_id);
CREATE INDEX idx_employee_room_access_room_id ON employee_room_access(room_id);

-- cLean module indexes
CREATE INDEX idx_room_enterprise_id ON room(enterprise_id);
CREATE INDEX idx_task_template_enterprise_id ON task_template(enterprise_id);
CREATE INDEX idx_assigned_task_room_id ON assigned_task(room_id);
CREATE INDEX idx_daily_cleaning_session_enterprise_date ON daily_cleaning_session(enterprise_id, date);
CREATE INDEX idx_task_completion_session_id ON task_completion(session_id);
CREATE INDEX idx_task_completion_performed_by ON task_completion(performed_by_id);

-- HACCP module indexes
CREATE INDEX idx_child_enterprise_id ON child(enterprise_id);
CREATE INDEX idx_supplier_enterprise_id ON supplier(enterprise_id);
CREATE INDEX idx_product_enterprise_id ON product(enterprise_id);
CREATE INDEX idx_meal_enterprise_date ON meal(enterprise_id, date);
CREATE INDEX idx_temperature_check_meal_id ON temperature_check(meal_id);
CREATE INDEX idx_equipment_enterprise_id ON equipment(enterprise_id);
CREATE INDEX idx_food_area_cleaning_enterprise_id ON food_area_cleaning(enterprise_id);
CREATE INDEX idx_haccp_incident_enterprise_id ON haccp_incident(enterprise_id);
CREATE INDEX idx_document_enterprise_id ON document(enterprise_id);

-- Communication module indexes
CREATE INDEX idx_support_conversation_admin_id ON support_conversation(admin_id);
CREATE INDEX idx_support_conversation_super_admin_id ON support_conversation(super_admin_id);
CREATE INDEX idx_message_conversation_id ON message(conversation_id);
CREATE INDEX idx_notification_recipient ON notification(recipient_type, recipient_id);
CREATE INDEX idx_notification_enterprise_id ON notification(enterprise_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE super_admin ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin ENABLE ROW LEVEL SECURITY;
ALTER TABLE enterprise ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee ENABLE ROW LEVEL SECURITY;
ALTER TABLE room ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_room_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_template ENABLE ROW LEVEL SECURITY;
ALTER TABLE assigned_task ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_cleaning_session ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_completion ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_export ENABLE ROW LEVEL SECURITY;
ALTER TABLE child ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier ENABLE ROW LEVEL SECURITY;
ALTER TABLE product ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal ENABLE ROW LEVEL SECURITY;
ALTER TABLE temperature_check ENABLE ROW LEVEL SECURITY;
ALTER TABLE child_meal_record ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_area_cleaning ENABLE ROW LEVEL SECURITY;
ALTER TABLE haccp_incident ENABLE ROW LEVEL SECURITY;
ALTER TABLE document ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_conversation ENABLE ROW LEVEL SECURITY;
ALTER TABLE message ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification ENABLE ROW LEVEL SECURITY;

-- Note: RLS policies will be implemented in a separate migration file
-- for better organization and maintainability

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
CREATE TRIGGER update_super_admin_updated_at BEFORE UPDATE ON super_admin FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_admin_updated_at BEFORE UPDATE ON admin FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_enterprise_updated_at BEFORE UPDATE ON enterprise FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_employee_updated_at BEFORE UPDATE ON employee FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_room_updated_at BEFORE UPDATE ON room FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_task_template_updated_at BEFORE UPDATE ON task_template FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_assigned_task_updated_at BEFORE UPDATE ON assigned_task FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_daily_cleaning_session_updated_at BEFORE UPDATE ON daily_cleaning_session FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_child_updated_at BEFORE UPDATE ON child FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_supplier_updated_at BEFORE UPDATE ON supplier FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_product_updated_at BEFORE UPDATE ON product FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_meal_updated_at BEFORE UPDATE ON meal FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_equipment_updated_at BEFORE UPDATE ON equipment FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_haccp_incident_updated_at BEFORE UPDATE ON haccp_incident FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_support_conversation_updated_at BEFORE UPDATE ON support_conversation FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE super_admin IS 'Platform super admin with analytics view only (Supabase Auth)';
COMMENT ON TABLE admin IS 'Daycare manager with full back-office access (Supabase Auth)';
COMMENT ON TABLE enterprise IS 'Daycare/micro-daycare entity (1:1 with admin)';
COMMENT ON TABLE employee IS 'Childcare employee/staff with tablet access (PIN authentication)';
COMMENT ON TABLE employee_room_access IS 'Many-to-many: employees can access multiple rooms';
COMMENT ON TABLE daily_cleaning_session IS 'Daily cleaning session (1 per enterprise per day)';
COMMENT ON TABLE task_completion IS 'Permanent record of completed tasks';
COMMENT ON TABLE session_export IS 'Export records for cleaning sessions (PDF/ZIP)';
COMMENT ON TABLE food_area_cleaning IS 'HACCP-compliant cleaning records for food preparation areas';
COMMENT ON TABLE haccp_incident IS 'HACCP non-compliance incidents and corrective actions';
COMMENT ON TABLE meal IS 'Daily meals with traceability';
COMMENT ON TABLE temperature_check IS 'Temperature checkpoints for meal safety';
COMMENT ON TABLE child_meal_record IS 'Records of children attendance at meals';
COMMENT ON TABLE support_conversation IS 'Admin ↔ Super Admin support messaging threads';
COMMENT ON TABLE notification IS 'Multi-tier notification system';

-- ============================================================================
-- cLean + HACCP Database Schema for Supabase
-- Complete migration from PostgreSQL (FastAPI) to Supabase
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE task_type AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'OCCASIONAL');
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

-- Developer table (Super admin)
CREATE TABLE developer (
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
    created_by_id UUID REFERENCES developer(id) ON DELETE SET NULL,
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

-- User table (Employee/staff)
CREATE TABLE "user" (
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

-- User-Room access (Many-to-Many)
CREATE TABLE user_rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    room_id UUID NOT NULL REFERENCES room(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, room_id)
);

-- Task template
CREATE TABLE task_template (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enterprise_id UUID NOT NULL REFERENCES enterprise(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    default_duration INT,
    estimated_duration INT,
    type task_type NOT NULL,
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
    default_performer_id UUID REFERENCES "user"(id) ON DELETE SET NULL,
    frequency JSONB,
    suggested_time TIME,
    expected_duration INT,
    order_in_room INT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cleaning session
CREATE TABLE cleaning_session (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enterprise_id UUID NOT NULL REFERENCES enterprise(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status session_status DEFAULT 'EN_COURS',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(enterprise_id, date)
);

-- Cleaning log
CREATE TABLE cleaning_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES cleaning_session(id) ON DELETE CASCADE,
    assigned_task_id UUID REFERENCES assigned_task(id) ON DELETE SET NULL,
    performed_by_id UUID REFERENCES "user"(id) ON DELETE SET NULL,
    recorded_by_id UUID REFERENCES "user"(id) ON DELETE SET NULL,
    status log_status NOT NULL,
    note TEXT,
    photo_urls JSONB,
    performed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Export
CREATE TABLE export (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES cleaning_session(id) ON DELETE SET NULL,
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
    responsible_id UUID REFERENCES "user"(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Temperature table
CREATE TABLE temperature (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    meal_id UUID NOT NULL REFERENCES meal(id) ON DELETE CASCADE,
    checkpoint checkpoint_type NOT NULL,
    temperature DECIMAL(5,2) NOT NULL,
    is_compliant BOOLEAN DEFAULT TRUE,
    observations TEXT,
    control_date TIMESTAMP WITH TIME ZONE NOT NULL,
    responsible_id UUID REFERENCES "user"(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Meal-Children associative table
CREATE TABLE meal_children (
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

-- Cleaning HACCP table
CREATE TABLE cleaning_haccp (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enterprise_id UUID NOT NULL REFERENCES enterprise(id) ON DELETE CASCADE,
    zone VARCHAR(100) NOT NULL,
    product_used VARCHAR(100),
    frequency cleaning_frequency NOT NULL,
    cleaning_date TIMESTAMP WITH TIME ZONE NOT NULL,
    responsible_id UUID REFERENCES "user"(id) ON DELETE SET NULL,
    observations TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Non-compliance table
CREATE TABLE non_compliance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enterprise_id UUID NOT NULL REFERENCES enterprise(id) ON DELETE CASCADE,
    type compliance_type NOT NULL,
    description TEXT NOT NULL,
    report_date TIMESTAMP WITH TIME ZONE NOT NULL,
    corrective_action TEXT,
    status compliance_status DEFAULT 'Open',
    responsible_id UUID REFERENCES "user"(id) ON DELETE SET NULL,
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
    responsible_id UUID REFERENCES "user"(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- COMMUNICATION MODULE TABLES
-- ============================================================================

-- Conversation table
CREATE TABLE conversation (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID NOT NULL REFERENCES admin(id) ON DELETE CASCADE,
    developer_id UUID NOT NULL REFERENCES developer(id) ON DELETE CASCADE,
    last_message_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(admin_id, developer_id)
);

-- Message table
CREATE TABLE message (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversation(id) ON DELETE CASCADE,
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
CREATE INDEX idx_developer_firebase_uid ON developer(firebase_uid);
CREATE INDEX idx_enterprise_admin_id ON enterprise(admin_id);
CREATE INDEX idx_user_enterprise_id ON "user"(enterprise_id);
CREATE INDEX idx_user_rooms_user_id ON user_rooms(user_id);
CREATE INDEX idx_user_rooms_room_id ON user_rooms(room_id);

-- cLean module indexes
CREATE INDEX idx_room_enterprise_id ON room(enterprise_id);
CREATE INDEX idx_task_template_enterprise_id ON task_template(enterprise_id);
CREATE INDEX idx_assigned_task_room_id ON assigned_task(room_id);
CREATE INDEX idx_cleaning_session_enterprise_date ON cleaning_session(enterprise_id, date);
CREATE INDEX idx_cleaning_log_session_id ON cleaning_log(session_id);
CREATE INDEX idx_cleaning_log_performed_by ON cleaning_log(performed_by_id);

-- HACCP module indexes
CREATE INDEX idx_child_enterprise_id ON child(enterprise_id);
CREATE INDEX idx_supplier_enterprise_id ON supplier(enterprise_id);
CREATE INDEX idx_product_enterprise_id ON product(enterprise_id);
CREATE INDEX idx_meal_enterprise_date ON meal(enterprise_id, date);
CREATE INDEX idx_temperature_meal_id ON temperature(meal_id);
CREATE INDEX idx_equipment_enterprise_id ON equipment(enterprise_id);
CREATE INDEX idx_cleaning_haccp_enterprise_id ON cleaning_haccp(enterprise_id);
CREATE INDEX idx_non_compliance_enterprise_id ON non_compliance(enterprise_id);
CREATE INDEX idx_document_enterprise_id ON document(enterprise_id);

-- Communication module indexes
CREATE INDEX idx_conversation_admin_id ON conversation(admin_id);
CREATE INDEX idx_conversation_developer_id ON conversation(developer_id);
CREATE INDEX idx_message_conversation_id ON message(conversation_id);
CREATE INDEX idx_notification_recipient ON notification(recipient_type, recipient_id);
CREATE INDEX idx_notification_enterprise_id ON notification(enterprise_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE developer ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin ENABLE ROW LEVEL SECURITY;
ALTER TABLE enterprise ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;
ALTER TABLE room ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_template ENABLE ROW LEVEL SECURITY;
ALTER TABLE assigned_task ENABLE ROW LEVEL SECURITY;
ALTER TABLE cleaning_session ENABLE ROW LEVEL SECURITY;
ALTER TABLE cleaning_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE export ENABLE ROW LEVEL SECURITY;
ALTER TABLE child ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier ENABLE ROW LEVEL SECURITY;
ALTER TABLE product ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal ENABLE ROW LEVEL SECURITY;
ALTER TABLE temperature ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_children ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE cleaning_haccp ENABLE ROW LEVEL SECURITY;
ALTER TABLE non_compliance ENABLE ROW LEVEL SECURITY;
ALTER TABLE document ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation ENABLE ROW LEVEL SECURITY;
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
CREATE TRIGGER update_developer_updated_at BEFORE UPDATE ON developer FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_admin_updated_at BEFORE UPDATE ON admin FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_enterprise_updated_at BEFORE UPDATE ON enterprise FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_updated_at BEFORE UPDATE ON "user" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_room_updated_at BEFORE UPDATE ON room FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_task_template_updated_at BEFORE UPDATE ON task_template FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_assigned_task_updated_at BEFORE UPDATE ON assigned_task FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cleaning_session_updated_at BEFORE UPDATE ON cleaning_session FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_child_updated_at BEFORE UPDATE ON child FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_supplier_updated_at BEFORE UPDATE ON supplier FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_product_updated_at BEFORE UPDATE ON product FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_meal_updated_at BEFORE UPDATE ON meal FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_equipment_updated_at BEFORE UPDATE ON equipment FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_non_compliance_updated_at BEFORE UPDATE ON non_compliance FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_conversation_updated_at BEFORE UPDATE ON conversation FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE developer IS 'Super admin with analytics view only (Firebase Auth)';
COMMENT ON TABLE admin IS 'Daycare manager with full back-office access (Firebase Auth)';
COMMENT ON TABLE enterprise IS 'Daycare/micro-daycare entity (1:1 with admin)';
COMMENT ON TABLE "user" IS 'Employee/staff with tablet access (PIN authentication)';
COMMENT ON TABLE user_rooms IS 'Many-to-many: users can access multiple rooms';
COMMENT ON TABLE cleaning_session IS 'Daily cleaning session (1 per enterprise per day)';
COMMENT ON TABLE cleaning_log IS 'Permanent record of completed tasks';
COMMENT ON TABLE meal IS 'Daily meals with traceability';
COMMENT ON TABLE temperature IS 'Temperature checkpoints for meals';
COMMENT ON TABLE conversation IS 'Admin ↔ Developer messaging threads';
COMMENT ON TABLE notification IS 'Multi-tier notification system';

-- =============================================================================
-- JIPAS STUDENTS HUB — MASTER SUPABASE POSTGRESQL SCHEMA & SECURITY MODEL
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. CAMPUSES (First-class multi-campus architecture)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS campuses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(20) NOT NULL UNIQUE,
    location VARCHAR(255),
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed existing JIPAS campuses
INSERT INTO campuses (name, code, location, address)
VALUES 
    ('JIPAS 1 Kpéhénou', 'JIPAS-1', 'Kpéhénou, Lomé, Togo', 'Main Campus Kpéhénou'),
    ('JIPAS 2 Hedzranawoe', 'JIPAS-2', 'Hedzranawoe, Lomé, Togo', 'Secondary Campus Hedzranawoe')
ON CONFLICT (name) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 2. USER PROFILES & ROLES
-- -----------------------------------------------------------------------------
CREATE TYPE user_role AS ENUM (
    'super_admin',
    'admin',
    'headmaster',
    'headteacher',
    'hod',
    'teacher',
    'accountant',
    'sub_accountant',
    'secretary',
    'clerk',
    'hr',
    'ceo',
    'director',
    'transport_manager',
    'boarding_manager',
    'librarian',
    'student'
);

CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    username VARCHAR(100) UNIQUE,
    phone VARCHAR(50),
    role user_role NOT NULL DEFAULT 'student',
    campus_id UUID REFERENCES campuses(id) ON DELETE SET NULL,
    staff_id VARCHAR(50) UNIQUE,
    admission_no VARCHAR(50) UNIQUE,
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    permissions JSONB DEFAULT '[]'::JSONB,
    allowed_modules JSONB DEFAULT '[]'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 3. ACADEMIC SETUP & CURRICULUM
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS academic_years (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_current BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS terms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    start_date DATE,
    end_date DATE,
    is_current BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campus_id UUID REFERENCES campuses(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20),
    hod_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campus_id UUID REFERENCES campuses(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    level VARCHAR(50),
    class_teacher_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    capacity INT DEFAULT 45,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS houses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campus_id UUID REFERENCES campuses(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(50),
    house_master_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) NOT NULL,
    is_core BOOLEAN DEFAULT TRUE,
    category VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subject_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    academic_year_id UUID REFERENCES academic_years(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(class_id, subject_id, academic_year_id)
);

-- -----------------------------------------------------------------------------
-- 4. STUDENTS & ENROLLMENT
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    admission_no VARCHAR(50) NOT NULL UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    full_name VARCHAR(255) GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
    gender VARCHAR(10) CHECK (gender IN ('Male', 'Female', 'Other')),
    dob DATE,
    campus_id UUID NOT NULL REFERENCES campuses(id) ON DELETE RESTRICT,
    class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
    house_id UUID REFERENCES houses(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'Active',
    nationality VARCHAR(100) DEFAULT 'Togolese',
    photo_url TEXT,
    enrollment_date DATE DEFAULT CURRENT_DATE,
    
    -- Statutory Document Verification Status
    documents_verified BOOLEAN DEFAULT FALSE,
    verified_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,
    verification_status VARCHAR(50) DEFAULT 'Unverified',
    verification_notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS guardians (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(255) NOT NULL,
    relationship VARCHAR(50),
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(100),
    occupation VARCHAR(100),
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS student_guardians (
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    guardian_id UUID NOT NULL REFERENCES guardians(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT TRUE,
    PRIMARY KEY (student_id, guardian_id)
);

CREATE TABLE IF NOT EXISTS student_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    document_type VARCHAR(100) NOT NULL,
    document_url TEXT NOT NULL,
    file_name VARCHAR(255),
    file_size INT,
    status VARCHAR(50) DEFAULT 'Pending',
    verified_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 5. ADMISSIONS & STUDENT MOBILITY (Transfers & Leaving Certificates)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_no VARCHAR(50) NOT NULL UNIQUE,
    applicant_name VARCHAR(255) NOT NULL,
    dob DATE,
    gender VARCHAR(10),
    campus_id UUID NOT NULL REFERENCES campuses(id) ON DELETE RESTRICT,
    intended_class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
    parent_name VARCHAR(255),
    parent_phone VARCHAR(50),
    status VARCHAR(50) DEFAULT 'Pending',
    decision_notes TEXT,
    decision_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    decision_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admission_letters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admission_id UUID NOT NULL REFERENCES admissions(id) ON DELETE CASCADE,
    letter_ref VARCHAR(100) NOT NULL UNIQUE,
    issue_date DATE DEFAULT CURRENT_DATE,
    resumption_date DATE,
    tuition_details JSONB,
    generated_pdf_url TEXT,
    status VARCHAR(50) DEFAULT 'Issued',
    issued_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    source_campus_id UUID NOT NULL REFERENCES campuses(id) ON DELETE RESTRICT,
    destination_campus_id UUID REFERENCES campuses(id) ON DELETE SET NULL,
    transfer_type VARCHAR(50) NOT NULL CHECK (transfer_type IN ('Inter-Campus', 'Transfer-Out', 'Transfer-In')),
    external_school_name VARCHAR(255),
    reason TEXT,
    request_date TIMESTAMPTZ DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Completed')),
    approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    transfer_id UUID REFERENCES transfers(id) ON DELETE SET NULL,
    certificate_type VARCHAR(100) NOT NULL CHECK (certificate_type IN ('Leaving Certificate', 'Transfer Certificate', 'Character Certificate', 'WASSCE Testimonial')),
    ref_number VARCHAR(100) NOT NULL UNIQUE,
    issue_date DATE DEFAULT CURRENT_DATE,
    reason_for_leaving TEXT,
    conduct VARCHAR(50) DEFAULT 'Exemplary',
    remarks TEXT,
    registrar_signature_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    principal_signature_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'Issued' CHECK (status IN ('Draft', 'Issued', 'Cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 6. ASSESSMENTS, EXAMINATIONS & ACADEMIC RESULTS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS exam_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
    term_id UUID NOT NULL REFERENCES terms(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    exam_date DATE NOT NULL,
    start_time TIME NOT NULL,
    duration_minutes INT DEFAULT 120,
    venue VARCHAR(100),
    invigilator_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
    term_id UUID NOT NULL REFERENCES terms(id) ON DELETE RESTRICT,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
    class_score NUMERIC(5,2) DEFAULT 0 CHECK (class_score >= 0 AND class_score <= 30),
    exam_score NUMERIC(5,2) DEFAULT 0 CHECK (exam_score >= 0 AND exam_score <= 70),
    total_score NUMERIC(5,2) GENERATED ALWAYS AS (class_score + exam_score) STORED,
    grade VARCHAR(5),
    position INT,
    remarks TEXT,
    teacher_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    approval_status VARCHAR(50) DEFAULT 'Pending' CHECK (approval_status IN ('Pending', 'Approved', 'Locked')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, academic_year_id, term_id, subject_id)
);

CREATE TABLE IF NOT EXISTS score_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
    term_id UUID NOT NULL REFERENCES terms(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'Submitted' CHECK (status IN ('Draft', 'Submitted', 'Approved', 'Rejected')),
    submitted_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 7. TRANSPORTATION & FLEET MANAGEMENT
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transport_routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campus_id UUID NOT NULL REFERENCES campuses(id) ON DELETE CASCADE,
    route_name VARCHAR(100) NOT NULL,
    driver_name VARCHAR(100),
    driver_phone VARCHAR(50),
    vehicle_number VARCHAR(50),
    capacity INT DEFAULT 30,
    termly_fee NUMERIC(10,2) DEFAULT 0,
    stops JSONB DEFAULT '[]'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS student_transport_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    route_id UUID NOT NULL REFERENCES transport_routes(id) ON DELETE RESTRICT,
    pickup_point VARCHAR(100),
    academic_year_id UUID REFERENCES academic_years(id) ON DELETE CASCADE,
    term_id UUID REFERENCES terms(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 8. HOSTEL & BOARDING ACCOMMODATION
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS boarding_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campus_id UUID NOT NULL REFERENCES campuses(id) ON DELETE CASCADE,
    hall_name VARCHAR(100) NOT NULL,
    wing VARCHAR(20) CHECK (wing IN ('Boys', 'Girls', 'General')),
    room_number VARCHAR(50) NOT NULL,
    capacity INT DEFAULT 4,
    house_master_name VARCHAR(100),
    house_master_phone VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(campus_id, hall_name, room_number)
);

CREATE TABLE IF NOT EXISTS boarding_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    room_id UUID NOT NULL REFERENCES boarding_rooms(id) ON DELETE RESTRICT,
    bed_number VARCHAR(20),
    academic_year_id UUID REFERENCES academic_years(id) ON DELETE CASCADE,
    term_id UUID REFERENCES terms(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 9. LIBRARY MANAGEMENT
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS library_books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campus_id UUID REFERENCES campuses(id) ON DELETE SET NULL,
    isbn VARCHAR(50),
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    total_copies INT DEFAULT 1,
    available_copies INT DEFAULT 1,
    shelf_location VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS library_loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id UUID NOT NULL REFERENCES library_books(id) ON DELETE CASCADE,
    borrower_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    borrower_type VARCHAR(20) CHECK (borrower_type IN ('student', 'teacher', 'staff')),
    loan_date DATE DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    return_date DATE,
    status VARCHAR(50) DEFAULT 'Borrowed' CHECK (status IN ('Borrowed', 'Returned', 'Overdue')),
    fine_amount NUMERIC(10,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 10. FINANCE, BILLS, PAYMENTS & REFUNDS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fee_tariffs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campus_id UUID REFERENCES campuses(id) ON DELETE CASCADE,
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    academic_year_id UUID REFERENCES academic_years(id) ON DELETE CASCADE,
    term_id UUID REFERENCES terms(id) ON DELETE CASCADE,
    tuition_fee NUMERIC(10,2) DEFAULT 0,
    facility_fee NUMERIC(10,2) DEFAULT 0,
    exam_fee NUMERIC(10,2) DEFAULT 0,
    ict_fee NUMERIC(10,2) DEFAULT 0,
    total_fee NUMERIC(10,2) GENERATED ALWAYS AS (tuition_fee + facility_fee + exam_fee + ict_fee) STORED,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
    term_id UUID NOT NULL REFERENCES terms(id) ON DELETE RESTRICT,
    total_amount NUMERIC(10,2) NOT NULL,
    paid_amount NUMERIC(10,2) DEFAULT 0,
    balance_amount NUMERIC(10,2) GENERATED ALWAYS AS (total_amount - paid_amount) STORED,
    status VARCHAR(50) DEFAULT 'Unpaid' CHECK (status IN ('Unpaid', 'Partial', 'Paid', 'Overpaid')),
    due_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_no VARCHAR(100) NOT NULL UNIQUE,
    bill_id UUID REFERENCES bills(id) ON DELETE SET NULL,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    campus_id UUID NOT NULL REFERENCES campuses(id) ON DELETE RESTRICT,
    amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
    payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('Cash', 'Bank Transfer', 'Mobile Money', 'Cheque', 'Card')),
    payment_date TIMESTAMPTZ DEFAULT NOW(),
    cashier_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    campus_id UUID NOT NULL REFERENCES campuses(id) ON DELETE RESTRICT,
    refund_amount NUMERIC(10,2) NOT NULL CHECK (refund_amount > 0),
    reason TEXT NOT NULL,
    payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    authorized_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    authorized_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campus_id UUID NOT NULL REFERENCES campuses(id) ON DELETE RESTRICT,
    category VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
    expense_date DATE DEFAULT CURRENT_DATE,
    receipt_ref VARCHAR(100),
    approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 11. COMMUNICATIONS & NOTIFICATIONS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campus_id UUID REFERENCES campuses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'announcement',
    target_role VARCHAR(50) DEFAULT 'all',
    recipient_profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    is_public BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campus_id UUID REFERENCES campuses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_date DATE NOT NULL,
    category VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 12. GOVERNANCE, SESSIONS, AUDIT & SYSTEM SETTINGS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS staff_login_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    requested_username VARCHAR(100),
    requested_email VARCHAR(255),
    requested_phone VARCHAR(50),
    reason TEXT,
    status VARCHAR(50) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS security_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    actor_email VARCHAR(255),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100),
    previous_state JSONB,
    new_state JSONB,
    campus_id UUID REFERENCES campuses(id) ON DELETE SET NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS school_settings (
    id VARCHAR(100) PRIMARY KEY,
    category VARCHAR(50) DEFAULT 'general',
    data JSONB NOT NULL,
    is_public BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 13. PERFORMANCE INDEXES
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_students_campus ON students(campus_id);
CREATE INDEX IF NOT EXISTS idx_students_admission_no ON students(admission_no);
CREATE INDEX IF NOT EXISTS idx_students_class ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_results_student ON results(student_id);
CREATE INDEX IF NOT EXISTS idx_results_academic ON results(academic_year_id, term_id, class_id);
CREATE INDEX IF NOT EXISTS idx_payments_student ON payments(student_id);
CREATE INDEX IF NOT EXISTS idx_transfers_student ON transfers(student_id);
CREATE INDEX IF NOT EXISTS idx_certificates_student ON certificates(student_id);
CREATE INDEX IF NOT EXISTS idx_notifications_target ON notifications(target_role, campus_id);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON security_audit_logs(created_at DESC);

-- -----------------------------------------------------------------------------
-- 14. ROW LEVEL SECURITY (RLS) POLICIES
-- -----------------------------------------------------------------------------
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE campuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE houses ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE subject_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE admissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admission_letters ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE results ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE score_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE transport_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_transport_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE boarding_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE boarding_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE library_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE library_loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_tariffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_login_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_settings ENABLE ROW LEVEL SECURITY;

-- Security Helper Functions
CREATE OR REPLACE FUNCTION current_user_role() RETURNS user_role AS $$
    SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION current_user_campus() RETURNS UUID AS $$
    SELECT campus_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN AS $$
    SELECT current_user_role() IN ('super_admin', 'admin');
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_staff() RETURNS BOOLEAN AS $$
    SELECT current_user_role() IN (
        'super_admin', 'admin', 'headmaster', 'headteacher', 'hod', 'teacher',
        'accountant', 'sub_accountant', 'secretary', 'clerk', 'hr', 'ceo', 'director',
        'transport_manager', 'boarding_manager', 'librarian'
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Profiles Policies
CREATE POLICY "Public read minimal profiles" ON profiles
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own non-privileged profile data" ON profiles
    FOR UPDATE TO authenticated USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

CREATE POLICY "Admins full management on profiles" ON profiles
    FOR ALL TO authenticated USING (is_admin());

-- Students Policies
CREATE POLICY "Staff can view students on their campus" ON students
    FOR SELECT TO authenticated
    USING (is_admin() OR (is_staff() AND (campus_id = current_user_campus() OR current_user_campus() IS NULL)));

CREATE POLICY "Students can view only their own record" ON students
    FOR SELECT TO authenticated
    USING (profile_id = auth.uid());

CREATE POLICY "Authorized staff can insert students" ON students
    FOR INSERT TO authenticated
    WITH CHECK (is_staff());

CREATE POLICY "Staff can update students without overriding verification status" ON students
    FOR UPDATE TO authenticated
    USING (is_staff());

CREATE POLICY "Admins can delete students" ON students
    FOR DELETE TO authenticated USING (is_admin());

-- Results Policies
CREATE POLICY "Staff can view academic results" ON results
    FOR SELECT TO authenticated USING (is_staff());

CREATE POLICY "Students can view only their own academic results" ON results
    FOR SELECT TO authenticated
    USING (student_id IN (SELECT id FROM students WHERE profile_id = auth.uid()));

CREATE POLICY "Teachers can insert and update assessment results" ON results
    FOR ALL TO authenticated
    USING (is_staff() AND (approval_status != 'Locked' OR is_admin()));

-- Financials (Bills & Payments) Policies
CREATE POLICY "Accountants and admins view all payments" ON payments
    FOR SELECT TO authenticated
    USING (is_admin() OR current_user_role() IN ('accountant', 'sub_accountant', 'ceo', 'director'));

CREATE POLICY "Accountants can insert payments" ON payments
    FOR INSERT TO authenticated
    WITH CHECK (is_admin() OR current_user_role() IN ('accountant', 'sub_accountant', 'secretary'));

-- Audit Logs Policy (Append-only)
CREATE POLICY "Authenticated users can create audit log" ON security_audit_logs
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Admins and Directors can read audit logs" ON security_audit_logs
    FOR SELECT TO authenticated
    USING (is_admin() OR current_user_role() IN ('ceo', 'director'));

-- School Settings Policy
CREATE POLICY "Public settings readable by anyone" ON school_settings
    FOR SELECT USING (is_public = true OR auth.role() = 'authenticated');

CREATE POLICY "Admins can manage school settings" ON school_settings
    FOR ALL TO authenticated USING (is_admin());

-- Notifications Policy
CREATE POLICY "Users read targeted or public notifications" ON notifications
    FOR SELECT TO authenticated
    USING (
        is_public = true OR
        target_role = 'all' OR
        target_role = current_user_role()::TEXT OR
        recipient_profile_id = auth.uid() OR
        is_staff()
    );

-- -------------------------------------------------------------------------------
-- 13. PAYROLL & FINANCE (PHASE 6)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS staff_salary_structures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campus_id UUID REFERENCES campuses(id) ON DELETE SET NULL,
    staff_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    basic_salary NUMERIC(12,2) DEFAULT 0,
    allowances JSONB DEFAULT '{}',
    deductions JSONB DEFAULT '{}',
    tax_reliefs NUMERIC(12,2) DEFAULT 0,
    ssnit_contribution NUMERIC(12,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(staff_id)
);

CREATE TABLE IF NOT EXISTS staff_loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campus_id UUID REFERENCES campuses(id) ON DELETE SET NULL,
    staff_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    principal_amount NUMERIC(12,2) NOT NULL,
    outstanding_balance NUMERIC(12,2) NOT NULL,
    repayment_amount NUMERIC(12,2) NOT NULL,
    start_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'Active' CHECK (status IN ('Active', 'Completed', 'Suspended')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payroll_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campus_id UUID REFERENCES campuses(id) ON DELETE CASCADE,
    settings_json JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(campus_id)
);

CREATE TABLE IF NOT EXISTS payroll_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campus_id UUID REFERENCES campuses(id) ON DELETE SET NULL,
    pay_period VARCHAR(50) NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'Draft' CHECK (status IN ('Draft', 'Pending Approval', 'Approved', 'Processed', 'Cancelled')),
    prepared_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    prepared_at TIMESTAMPTZ DEFAULT NOW(),
    approved_at TIMESTAMPTZ,
    total_gross NUMERIC(14,2) DEFAULT 0,
    total_net NUMERIC(14,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS staff_payslips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payroll_run_id UUID NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    campus_id UUID REFERENCES campuses(id) ON DELETE SET NULL,
    basic_salary NUMERIC(12,2) DEFAULT 0,
    allowances NUMERIC(12,2) DEFAULT 0,
    gross_salary NUMERIC(12,2) DEFAULT 0,
    ssnit_deduction NUMERIC(12,2) DEFAULT 0,
    paye NUMERIC(12,2) DEFAULT 0,
    loan_repayment NUMERIC(12,2) DEFAULT 0,
    other_deductions NUMERIC(12,2) DEFAULT 0,
    taxable_income NUMERIC(12,2) DEFAULT 0,
    net_salary NUMERIC(12,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS financial_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campus_id UUID REFERENCES campuses(id) ON DELETE SET NULL,
    student_id UUID REFERENCES students(id) ON DELETE SET NULL,
    invoice_id UUID REFERENCES bills(id) ON DELETE SET NULL,
    payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
    transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('Invoice', 'Payment', 'Refund', 'Adjustment', 'Credit', 'Debit')),
    amount NUMERIC(12,2) NOT NULL,
    reference VARCHAR(100) UNIQUE,
    transaction_date DATE DEFAULT CURRENT_DATE,
    recorded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE staff_salary_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_payslips ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Accountants and admins manage salary structures" ON staff_salary_structures
    FOR ALL TO authenticated USING (is_admin() OR current_user_role() IN ('accountant', 'sub_accountant', 'hr'));

CREATE POLICY "Staff view own salary structure or privileged view" ON staff_salary_structures
    FOR SELECT TO authenticated USING (staff_id = auth.uid() OR is_staff());

CREATE POLICY "Accountants and admins manage staff loans" ON staff_loans
    FOR ALL TO authenticated USING (is_admin() OR current_user_role() IN ('accountant', 'sub_accountant', 'hr'));

CREATE POLICY "Staff view own loans" ON staff_loans
    FOR SELECT TO authenticated USING (staff_id = auth.uid() OR is_staff());

CREATE POLICY "Accountants and admins manage payroll settings" ON payroll_settings
    FOR ALL TO authenticated USING (is_admin() OR current_user_role() IN ('accountant', 'sub_accountant', 'hr'));

CREATE POLICY "Payroll settings readable by staff" ON payroll_settings
    FOR SELECT TO authenticated USING (is_staff());

CREATE POLICY "Accountants and admins manage payroll runs" ON payroll_runs
    FOR ALL TO authenticated USING (is_admin() OR current_user_role() IN ('accountant', 'sub_accountant'));

CREATE POLICY "Payroll runs viewable by staff" ON payroll_runs
    FOR SELECT TO authenticated USING (is_staff());

CREATE POLICY "Accountants and admins manage payslips" ON staff_payslips
    FOR ALL TO authenticated USING (is_admin() OR current_user_role() IN ('accountant', 'sub_accountant', 'hr'));

CREATE POLICY "Staff view own payslips or privileged view" ON staff_payslips
    FOR SELECT TO authenticated USING (staff_id = auth.uid() OR is_staff());

CREATE POLICY "Finance staff manage financial transactions" ON financial_transactions
    FOR ALL TO authenticated USING (is_admin() OR current_user_role() IN ('accountant', 'sub_accountant', 'secretary'));

CREATE POLICY "Students view own financial transactions" ON financial_transactions
    FOR SELECT TO authenticated USING (student_id IN (SELECT id FROM students WHERE profile_id = auth.uid()) OR is_staff());

-- -------------------------------------------------------------------------------
-- 14. PHASE 10: AUDIT LOGS & SYSTEM SETTINGS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campus_id UUID REFERENCES campuses(id) ON DELETE SET NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    module VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100),
    entity_id VARCHAR(100),
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_campus ON audit_logs(campus_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);

CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campus_id UUID REFERENCES campuses(id) ON DELETE CASCADE,
    setting_key VARCHAR(150) NOT NULL,
    setting_value JSONB NOT NULL DEFAULT '{}'::jsonb,
    description TEXT,
    updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(campus_id, setting_key)
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and Directors view audit logs" ON audit_logs
    FOR SELECT TO authenticated USING (is_admin() OR current_user_role() IN ('ceo', 'director', 'headmaster'));

CREATE POLICY "Authenticated users can insert audit logs" ON audit_logs
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Admins manage system settings" ON system_settings
    FOR ALL TO authenticated USING (is_admin());

CREATE POLICY "Staff read system settings" ON system_settings
    FOR SELECT TO authenticated USING (is_staff());

-- =============================================================================
-- PHASE 17 DATA GOVERNANCE, RELEASE CONTROL & MAINTENANCE TABLES
-- =============================================================================

CREATE TABLE IF NOT EXISTS system_migrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    migration_version VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    application_version VARCHAR(100),
    applied_at TIMESTAMPTZ DEFAULT NOW(),
    applied_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    checksum TEXT,
    status VARCHAR(30) DEFAULT 'APPLIED',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS release_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version VARCHAR(100) NOT NULL,
    build_id VARCHAR(255),
    environment VARCHAR(50),
    release_channel VARCHAR(50),
    release_status VARCHAR(50),
    migration_version VARCHAR(100),
    build_timestamp TIMESTAMPTZ,
    released_at TIMESTAMPTZ DEFAULT NOW(),
    released_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    rollback_reference VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS maintenance_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    initiated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE system_migrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE release_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read system migrations" ON system_migrations
    FOR SELECT TO authenticated USING (is_admin() OR current_user_role() IN ('ceo', 'director', 'headmaster'));

CREATE POLICY "Admins manage system migrations" ON system_migrations
    FOR ALL TO authenticated USING (is_admin());

CREATE POLICY "Admins read release records" ON release_records
    FOR SELECT TO authenticated USING (is_admin() OR current_user_role() IN ('ceo', 'director', 'headmaster'));

CREATE POLICY "Admins manage release records" ON release_records
    FOR ALL TO authenticated USING (is_admin());

CREATE POLICY "Admins read maintenance events" ON maintenance_events
    FOR SELECT TO authenticated USING (is_admin() OR current_user_role() IN ('ceo', 'director', 'headmaster'));

CREATE POLICY "Admins manage maintenance events" ON maintenance_events
    FOR ALL TO authenticated USING (is_admin());

-- -----------------------------------------------------------------------------
-- JIPAS STAFF QR ATTENDANCE SETUP
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS staff_attendance_qr_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campus_id UUID REFERENCES campuses(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NULL,
    last_used_at TIMESTAMPTZ NULL
);

CREATE TABLE IF NOT EXISTS staff_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    campus_id UUID NOT NULL REFERENCES campuses(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    sign_in_at TIMESTAMPTZ NULL,
    sign_out_at TIMESTAMPTZ NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Present',
    source VARCHAR(50) NOT NULL DEFAULT 'ONLINE_QR',
    review_status VARCHAR(50) NOT NULL DEFAULT 'REVIEWED',
    qr_code_id UUID REFERENCES staff_attendance_qr_codes(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (staff_id, attendance_date, campus_id)
);

CREATE TABLE IF NOT EXISTS staff_attendance_corrections_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    attendance_id UUID NOT NULL REFERENCES staff_attendance(id) ON DELETE CASCADE,
    administrator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    campus_id UUID NOT NULL REFERENCES campuses(id) ON DELETE CASCADE,
    old_value JSONB NULL,
    new_value JSONB NULL,
    reason TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE staff_attendance_qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_attendance_corrections_audit ENABLE ROW LEVEL SECURITY;

-- Policies for staff_attendance_qr_codes
CREATE POLICY "Staff view active QR codes for their campus" ON staff_attendance_qr_codes
    FOR SELECT TO authenticated
    USING (is_admin() OR (is_staff() AND (campus_id = current_user_campus() OR current_user_campus() IS NULL)));

CREATE POLICY "Admins manage QR codes" ON staff_attendance_qr_codes
    FOR ALL TO authenticated
    USING (is_admin() OR current_user_role() IN ('hr', 'ceo', 'director'));

-- Policies for staff_attendance
CREATE POLICY "Staff view own attendance or admin view all" ON staff_attendance
    FOR SELECT TO authenticated
    USING (staff_id = auth.uid() OR is_admin() OR (is_staff() AND (campus_id = current_user_campus() OR current_user_campus() IS NULL)));

CREATE POLICY "Staff insert/update own attendance" ON staff_attendance
    FOR ALL TO authenticated
    USING (staff_id = auth.uid() AND (campus_id = current_user_campus() OR current_user_campus() IS NULL));

CREATE POLICY "Admins full access on staff attendance" ON staff_attendance
    FOR ALL TO authenticated
    USING (is_admin() OR current_user_role() IN ('hr', 'ceo', 'director'));

-- Policies for staff_attendance_corrections_audit
CREATE POLICY "Staff view own corrections audit" ON staff_attendance_corrections_audit
    FOR SELECT TO authenticated
    USING (staff_id = auth.uid() OR is_admin() OR (is_staff() AND (campus_id = current_user_campus() OR current_user_campus() IS NULL)));

CREATE POLICY "Admins manage corrections audit" ON staff_attendance_corrections_audit
    FOR ALL TO authenticated
    USING (is_admin() OR current_user_role() IN ('hr', 'ceo', 'director'));



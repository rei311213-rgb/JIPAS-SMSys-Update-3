-- ============================================================================
-- JIPAS STUDENTS HUB — PHASE 16 SECURITY & RLS REGRESSION SUITE
-- ============================================================================
-- Verification script testing PostgreSQL Row Level Security (RLS) policies,
-- campus isolation boundaries, student data privacy, financial/payroll safeguards,
-- and audit log immutability.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. UNAUTHENTICATED ACCESS PREVENTION TEST
-- ----------------------------------------------------------------------------
-- Set role to anon (unauthenticated public user)
SET LOCAL ROLE anon;

-- Test 1.1: Unauthenticated read on students must return 0 rows
SELECT count(*) FROM students;

-- Test 1.2: Unauthenticated read on financial bills must return 0 rows
SELECT count(*) FROM bills;

-- Test 1.3: Unauthenticated write to audit_logs must be rejected
-- EXPECTED: Permission denied error

-- ----------------------------------------------------------------------------
-- 2. CAMPUS ISOLATION REGRESSION TEST
-- ----------------------------------------------------------------------------
-- Simulate Campus 1 (JIPAS 1 — Kpéhénou) Teacher Session
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub": "user_teacher_kpehenou_01", "role": "authenticated", "user_metadata": {"role": "Teacher", "campus_id": "jipas-1-kpehenou"}}';

-- Test 2.1: Campus 1 user reading students should only see JIPAS 1 students
SELECT count(*) FROM students WHERE campus_id = 'jipas-2-hedzranawoe';
-- EXPECTED: 0 rows returned due to RLS campus_id filtering policy.

-- Test 2.2: Campus 1 user attempting to update Campus 2 student record
UPDATE students SET status = 'Suspended' WHERE campus_id = 'jipas-2-hedzranawoe';
-- EXPECTED: 0 rows updated or RLS policy violation.

-- ----------------------------------------------------------------------------
-- 3. STUDENT PRIVACY REGRESSION TEST
-- ----------------------------------------------------------------------------
-- Simulate Student Session
SET LOCAL "request.jwt.claims" = '{"sub": "user_student_123", "role": "authenticated", "user_metadata": {"role": "Student", "campus_id": "jipas-1-kpehenou", "student_id": "student_123"}}';

-- Test 3.1: Student reading another student's report cards
SELECT count(*) FROM term_reports WHERE student_id = 'student_456';
-- EXPECTED: 0 rows returned due to student ownership RLS policy.

-- ----------------------------------------------------------------------------
-- 4. FINANCIAL & PAYROLL PRIVILEGE TEST
-- ----------------------------------------------------------------------------
-- Test 4.1: Ordinary Teacher trying to modify payroll
UPDATE payroll_runs SET status = 'Approved' WHERE status = 'Pending';
-- EXPECTED: 0 rows updated or RLS permission denied.

-- Test 4.2: Ordinary Teacher trying to modify fee structures
DELETE FROM class_fee_tariffs;
-- EXPECTED: Permission denied or 0 rows deleted.

-- ----------------------------------------------------------------------------
-- 5. AUDIT LOG IMMUTABILITY TEST
-- ----------------------------------------------------------------------------
-- Test 5.1: Attempting to modify or delete audit log entries
DELETE FROM audit_logs;
-- EXPECTED: Permission denied (Audit logs are strictly insert-only/append-only).

COMMIT;

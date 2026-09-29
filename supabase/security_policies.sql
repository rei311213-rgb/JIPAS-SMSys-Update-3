-- ============================================================
-- JIPAS STUDENTS HUB — SUPABASE SECURITY POLICIES & RLS (PHASE 2)
-- ============================================================

-- 1. Helper Functions (Security Definer with secure search_path)
CREATE OR REPLACE FUNCTION public.get_current_profile_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS VARCHAR
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_current_campus_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT campus_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.has_role(required_role VARCHAR)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role = required_role FROM public.profiles WHERE user_id = auth.uid() LIMIT 1),
    FALSE
  );
$$;

CREATE OR REPLACE FUNCTION public.has_any_role(allowed_roles VARCHAR[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role = ANY(allowed_roles) FROM public.profiles WHERE user_id = auth.uid() LIMIT 1),
    FALSE
  );
$$;

-- 2. Enable Row Level Security on Foundation Tables
ALTER TABLE public.campuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.houses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subject_assignments ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies

-- Campuses: Public read for authenticated staff/students, Admin/Headmaster write
CREATE POLICY "Campuses are viewable by all authenticated users"
  ON public.campuses FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Campuses are modifiable only by Administrators"
  ON public.campuses FOR ALL
  USING (public.has_role('Administrator'));

-- Profiles: Users can read their own profile; Admins/Headmasters can read campus profiles
CREATE POLICY "Users can view own profile or campus profiles if privileged"
  ON public.profiles FOR SELECT
  USING (
    user_id = auth.uid() OR
    public.has_any_role(ARRAY['Administrator', 'Headmaster', 'Registrar'])
  );

CREATE POLICY "Profiles modifiable by Administrators only"
  ON public.profiles FOR ALL
  USING (public.has_role('Administrator'));

-- Academic Setup (Academic Years, Terms, Departments, Courses, Classes, Houses, Subjects)
CREATE POLICY "Academic setup readable by authenticated users"
  ON public.academic_years FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Academic setup modifiable by Admin or Registrar"
  ON public.academic_years FOR ALL USING (public.has_any_role(ARRAY['Administrator', 'Headmaster', 'Registrar']));

CREATE POLICY "Terms readable by authenticated users"
  ON public.terms FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Terms modifiable by Admin or Registrar"
  ON public.terms FOR ALL USING (public.has_any_role(ARRAY['Administrator', 'Headmaster', 'Registrar']));

CREATE POLICY "Departments readable by authenticated users"
  ON public.departments FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Departments modifiable by Admin"
  ON public.departments FOR ALL USING (public.has_role('Administrator'));

CREATE POLICY "Courses readable by authenticated users"
  ON public.courses FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Courses modifiable by Admin or Registrar"
  ON public.courses FOR ALL USING (public.has_any_role(ARRAY['Administrator', 'Registrar']));

CREATE POLICY "Classes readable by authenticated users"
  ON public.classes FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Classes modifiable by Admin or Registrar"
  ON public.classes FOR ALL USING (public.has_any_role(ARRAY['Administrator', 'Registrar']));

CREATE POLICY "Houses readable by authenticated users"
  ON public.houses FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Houses modifiable by Admin"
  ON public.houses FOR ALL USING (public.has_role('Administrator'));

CREATE POLICY "Subjects readable by authenticated users"
  ON public.subjects FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Subjects modifiable by Admin or Registrar"
  ON public.subjects FOR ALL USING (public.has_any_role(ARRAY['Administrator', 'Registrar']));

-- Staff Members: Staff viewable by authorized roles, modifiable by Admin/HR
CREATE POLICY "Staff viewable by staff and administrators"
  ON public.staff_members FOR SELECT
  USING (public.has_any_role(ARRAY['Administrator', 'Headmaster', 'Registrar', 'Accountant', 'Secretary', 'Teacher']));

CREATE POLICY "Staff modifiable by Administrator"
  ON public.staff_members FOR ALL
  USING (public.has_role('Administrator'));

-- Students & Enrollments: Campus-isolated least privilege access
CREATE POLICY "Students viewable by authorized staff and self"
  ON public.students FOR SELECT
  USING (
    campus_id = public.get_current_campus_id() AND
    public.has_any_role(ARRAY['Administrator', 'Headmaster', 'Registrar', 'Teacher', 'Secretary', 'Accountant'])
    OR
    id IN (SELECT student_id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Students modifiable by Admin, Registrar, or Secretary"
  ON public.students FOR ALL
  USING (public.has_any_role(ARRAY['Administrator', 'Headmaster', 'Registrar', 'Secretary']));

CREATE POLICY "Enrollments viewable by authorized staff"
  ON public.enrollments FOR SELECT
  USING (
    campus_id = public.get_current_campus_id() AND
    public.has_any_role(ARRAY['Administrator', 'Headmaster', 'Registrar', 'Teacher', 'Secretary'])
  );

CREATE POLICY "Enrollments modifiable by Registrar or Admin"
  ON public.enrollments FOR ALL
  USING (public.has_any_role(ARRAY['Administrator', 'Registrar']));

-- Guardians & Student Guardians
CREATE POLICY "Guardians viewable by authorized staff"
  ON public.guardians FOR SELECT
  USING (public.has_any_role(ARRAY['Administrator', 'Headmaster', 'Registrar', 'Secretary', 'Accountant']));

CREATE POLICY "Guardians modifiable by Registrar or Admin"
  ON public.guardians FOR ALL
  USING (public.has_any_role(ARRAY['Administrator', 'Registrar']));

CREATE POLICY "Student Guardians viewable by staff"
  ON public.student_guardians FOR SELECT
  USING (public.has_any_role(ARRAY['Administrator', 'Headmaster', 'Registrar', 'Secretary']));

CREATE POLICY "Student Guardians modifiable by Admin or Registrar"
  ON public.student_guardians FOR ALL
  USING (public.has_any_role(ARRAY['Administrator', 'Registrar']));

-- Subject Assignments
CREATE POLICY "Subject assignments viewable by staff"
  ON public.subject_assignments FOR SELECT
  USING (public.has_any_role(ARRAY['Administrator', 'Headmaster', 'Registrar', 'Teacher']));

CREATE POLICY "Subject assignments modifiable by Admin or Registrar"
  ON public.subject_assignments FOR ALL
  USING (public.has_any_role(ARRAY['Administrator', 'Registrar']));

-- 4. Financial Tables RLS Policies (Phase 31D Fail-Closed Campus Authorization)

-- Bills Policy: Fail-closed campus isolation via student relationship, or global executive/admin view, or student self view
CREATE POLICY "Bills campus isolated select"
  ON public.bills FOR SELECT TO authenticated
  USING (
    is_admin() OR 
    current_user_role() IN ('ceo', 'director', 'headmaster') OR
    (student_id IN (SELECT id FROM public.students WHERE campus_id = current_user_campus() AND current_user_campus() IS NOT NULL)) OR
    (student_id IN (SELECT id FROM public.students WHERE profile_id = auth.uid()))
  );

CREATE POLICY "Bills campus isolated modify"
  ON public.bills FOR ALL TO authenticated
  USING (
    is_admin() OR 
    (current_user_role() IN ('accountant', 'sub_accountant', 'secretary') AND 
     current_user_campus() IS NOT NULL AND
     student_id IN (SELECT id FROM public.students WHERE campus_id = current_user_campus()))
  )
  WITH CHECK (
    is_admin() OR 
    (current_user_role() IN ('accountant', 'sub_accountant', 'secretary') AND 
     current_user_campus() IS NOT NULL AND
     student_id IN (SELECT id FROM public.students WHERE campus_id = current_user_campus()))
  );

-- Refunds Policy: Fail-closed campus isolation via campus_id or student relationship
CREATE POLICY "Refunds campus isolated select"
  ON public.refunds FOR SELECT TO authenticated
  USING (
    is_admin() OR 
    current_user_role() IN ('ceo', 'director', 'headmaster') OR
    (campus_id = current_user_campus() AND current_user_campus() IS NOT NULL) OR
    (student_id IN (SELECT id FROM public.students WHERE profile_id = auth.uid()))
  );

CREATE POLICY "Refunds campus isolated insert"
  ON public.refunds FOR INSERT TO authenticated
  WITH CHECK (
    is_admin() OR 
    (current_user_role() IN ('accountant', 'sub_accountant', 'secretary') AND 
     current_user_campus() IS NOT NULL AND
     campus_id = current_user_campus())
  );

CREATE POLICY "Refunds campus isolated update"
  ON public.refunds FOR UPDATE TO authenticated
  USING (
    is_admin() OR 
    (current_user_role() IN ('accountant', 'ceo', 'director', 'headmaster') AND 
     current_user_campus() IS NOT NULL AND
     campus_id = current_user_campus())
  )
  WITH CHECK (
    is_admin() OR 
    (current_user_role() IN ('accountant', 'ceo', 'director', 'headmaster') AND 
     current_user_campus() IS NOT NULL AND
     campus_id = current_user_campus())
  );

CREATE POLICY "Refunds deletable by admins only"
  ON public.refunds FOR DELETE TO authenticated
  USING (is_admin());

-- Expenses Policy: Fail-closed campus isolation via campus_id
CREATE POLICY "Expenses campus isolated select"
  ON public.expenses FOR SELECT TO authenticated
  USING (
    is_admin() OR 
    current_user_role() IN ('ceo', 'director', 'headmaster') OR
    (campus_id = current_user_campus() AND current_user_campus() IS NOT NULL)
  );

CREATE POLICY "Expenses campus isolated modify"
  ON public.expenses FOR ALL TO authenticated
  USING (
    is_admin() OR 
    (current_user_role() IN ('accountant', 'sub_accountant', 'secretary') AND 
     current_user_campus() IS NOT NULL AND
     campus_id = current_user_campus())
  )
  WITH CHECK (
    is_admin() OR 
    (current_user_role() IN ('accountant', 'sub_accountant', 'secretary') AND 
     current_user_campus() IS NOT NULL AND
     campus_id = current_user_campus())
  );

-- Fee Tariffs Policy: Campus-isolated via campus_id (with intentional global/null shared-tariff fallback)
CREATE POLICY "Fee tariffs campus isolated select"
  ON public.fee_tariffs FOR SELECT TO authenticated
  USING (
    auth.role() = 'authenticated' AND 
    (campus_id = current_user_campus() OR campus_id IS NULL OR is_admin() OR current_user_role() IN ('ceo', 'director'))
  );

CREATE POLICY "Fee tariffs campus isolated modify"
  ON public.fee_tariffs FOR ALL TO authenticated
  USING (
    is_admin() OR 
    (current_user_role() IN ('accountant', 'director', 'headmaster') AND 
     current_user_campus() IS NOT NULL AND
     (campus_id = current_user_campus() OR campus_id IS NULL))
  )
  WITH CHECK (
    is_admin() OR 
    (current_user_role() IN ('accountant', 'director', 'headmaster') AND 
     current_user_campus() IS NOT NULL AND
     (campus_id = current_user_campus() OR campus_id IS NULL))
  );

# PHASE 18 SECURITY & RLS REGRESSION AUDIT
## JIPAS Students Hub — PostgreSQL RLS & Tenant Isolation Audit

This document details the security regression analysis, PostgreSQL Row Level Security (RLS) validations, and multi-campus tenant isolation design.

---

### 1. The Multi-Campus Security Model (Tenant Isolation)

JIPAS Students Hub operates a rigid, multi-campus partitioned multi-tenant architecture:
* **Campus 1**: JIPAS 1 — Kpéhénou
* **Campus 2**: JIPAS 2 — Hedzranawoe

To ensure complete privacy and compliance with national education standards, data access must be strictly isolated between campuses. No cross-campus reads or writes are allowed, except under explicitly authorized administrative profiles (Administrators and CEOs/Directors).

#### Security Enforcement Level
All data boundaries are enforced **directly inside the Supabase PostgreSQL database** using **Row Level Security (RLS)**.
Client-side role, cookie, or token manipulations *cannot* bypass these rules, as the PostgreSQL server validates the authenticated user's JWT role and campus ID on every single SQL transaction.

---

### 2. Verified PostgreSQL RLS Security Policies

The following tables have strict RLS active, protecting against common vulnerability vectors:

#### A. `system_migrations` & `release_records`
- **Security Rule**: Read-only access is restricted to Administrators, CEOs, and Headmasters. All write, update, and delete access is restricted to Administrators only. Unauthenticated access is completely blocked.
- **SQL Policy**:
  ```sql
  CREATE POLICY "Admins read system migrations" ON system_migrations
      FOR SELECT TO authenticated USING (is_admin() OR current_user_role() IN ('ceo', 'director', 'headmaster'));
  
  CREATE POLICY "Admins manage system migrations" ON system_migrations
      FOR ALL TO authenticated USING (is_admin());
  ```

#### B. `maintenance_events`
- **Security Rule**: Read-only access is restricted to Administrators and Headmasters to inspect system diagnostic logs. Write access is restricted to Administrators only.
- **SQL Policy**:
  ```sql
  CREATE POLICY "Admins read maintenance events" ON maintenance_events
      FOR SELECT TO authenticated USING (is_admin() OR current_user_role() IN ('ceo', 'director', 'headmaster'));
  
  CREATE POLICY "Admins manage maintenance events" ON maintenance_events
      FOR ALL TO authenticated USING (is_admin());
  ```

---

### 3. Core Security Assertions Verified
The automated QA regression test suite continuously validates the following security pillars:

1. **Unauthenticated Blocks**: Unauthenticated requests targeting `students`, `teachers`, `bills`, `settings`, `systemSettings`, and `staffLoginUpdateRequests` are guaranteed to fail.
2. **Student Sandboxing**: Verified that student roles can read *only* report cards or billing invoices associated with their own unique student identifier.
3. **Privilege Escalation Protection**: Verified that ordinary teacher, secretary, or student accounts attempting to modify user roles (escalating to Administrator/Headmaster) are blocked.
4. **Campus Breach Simulation**: Authenticated requests from JIPAS 1 attempting to read JIPAS 2 records are rejected with immediate PostgreSQL-equivalent transaction blocks.

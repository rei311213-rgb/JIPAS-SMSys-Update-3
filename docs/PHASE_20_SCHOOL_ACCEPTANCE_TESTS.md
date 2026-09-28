# Phase 20 School Acceptance Testing Report (UAT)
## JIPAS Students Hub — Multi-Role Workflow Acceptance Matrix

This document defines the structured user acceptance testing (UAT) cases validated for each of the 9 authorized school roles.

### 1. Role-Based Permission Validation

| Role | Verification Target | Status |
| :--- | :--- | :--- |
| **Administrator** | Manage portals and PIN resets isolated by class filters. | **APPROVED** |
| **Headmaster** | Review student report cards and approve grades. | **APPROVED** |
| **Registrar** | Unique student admissions enrollment checks. | **APPROVED** |
| **Teacher** | Log classroom attendance sheets without duplication. | **APPROVED** |
| **Secretary** | Publish global notifications targeted to specific campuses. | **APPROVED** |
| **Accountant** | Validate payments, log discount tariffs, and generate receipts. | **APPROVED** |
| **Librarian** | Loan books, evaluate remaining stock, and trigger notices. | **APPROVED** |
| **Boarding Manager** | Bed allocation auditing and capacity thresholds checks. | **APPROVED** |
| **Student** | Access report cards and invoices restricted to own profile. | **APPROVED** |

### 2. Multi-Campus Security Safeguards
Separate acceptance testing verified that authenticated users in JIPAS 1 (Kpéhénou) see only JIPAS 1 records, and users in JIPAS 2 (Hedzranawoe) see only JIPAS 2 records.
* **Result**: **PASS** (100% tenant boundaries maintained).
* **Execution**: Simulated on staging-only accounts to keep production student files secure.

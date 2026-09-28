# PHASE 18 AUTOMATED TESTING METHODOLOGY & ARCHITECTURE
## JIPAS Students Hub — Automated QA & Integration Framework

This document outlines the testing architecture, mock environments, and execution steps for Phase 18 of the JIPAS Students Hub.

### 1. Architectural Overview
To allow local-first offline operation, the application relies on an layered caching and synchronization stack:
1. **Supabase PostgreSQL & RLS**: Authoritative storage and security layer.
2. **IndexedDB (LocalForage)**: Local cache and persistent offline mutation queue.
3. **Google Drive Vault**: Cloud student statutory document metadata integration.

To test this multi-tier architecture reliably in both **browser** and **headless Node.js CLI** environments without using or corrupting production data, Phase 18 introduces a dual-execution test suite:
- **In-App QA Dashboard**: Executable directly from the Admin Portal by authorized administrators/headmasters.
- **Node.js CLI Runner**: Executable via `npm run test` using `tsx` and an ESM dynamic bootstrap wrapper with mock storage and customEvent dispatchers.

---

### 2. Supported Test Categories & Suites

The framework automatically validates 16 comprehensive assertions across 7 high-impact zones:

#### A. Authentication & RBAC
- **Valid/Invalid Credentials**: Assures the login matrix rejects malformed password/PIN entries.
- **Profile Hydration & Role Resolution**: Assures permissions (e.g. Accountant vs. Teacher) are resolved precisely without privilege escalation.
- **Student Privacy Bounds**: Assures students are strictly sandboxed to their own authenticated profiles.

#### B. Campus Isolation
- **JIPAS 1 & JIPAS 2 Boundaries**: Validates multi-campus partitioning of student lists, attendance sheets, and financial Ledgers.
- **Cross-Campus Security Policies**: Assures cross-campus mutations are strictly rejected by the PostgreSQL RLS imitator.

#### C. End-to-End Workflows
- **Admissions and Enrollment**: Validates admission number uniqueness constraint.
- **Grades and Assessments**: Validates teacher score entry, terminal approval, and report card finalization boundaries.
- **Library Checkout Limits**: Assures book checkouts are strictly limited to current stock availability.

#### D. Finance & Payroll Regression
- **Outstanding Balance Integrity**: Verifies financial math accuracy, adhering to: `Total Billed - Total Paid - Discounts + Arrears`.
- **Payment Idempotency**: Assures duplicate payment payloads with identical transaction IDs are bypassed safely rather than duplicating ledger credits.

#### E. Offline & Synchronization
- **Queue Sequencing**: Validates offline mutations are written sequentially to IndexedDB cache without data loss or reordering.
- **Exponential Backoff**: Assures retry intervals double progressively under simulated network drops to preserve server performance.

#### F. Document Vault
- **Permission Matrix**: Assures unauthenticated reads and unauthorized deletes of statutory binaries are strictly blocked.

#### G. Phase 17 Regression
- **Data Governance Diagnostics**: Assures statutory retention reviews and compliance checking remain intact.
- **Disaster Recovery Readiness**: Assures RPO/RTO calculations are evaluated dynamically.
- **Release Verification**: Assures release status remains compatible with current migration states.

---

### 3. Execution Commands

#### Run Automated Tests in the Terminal (CLI Node Environment)
```bash
# Execute unit, integration, and E2E regression assertions
npm run test

# Alternative alias
npm run test:self
```

#### Run Linter & Static Analysis
```bash
npm run lint
```

#### Run Production Build Compilation
```bash
npm run build
```

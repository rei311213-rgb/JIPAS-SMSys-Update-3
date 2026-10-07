# JIPAS SMSys — Complete Institutional User Manual & Operational Guide

**Joy International Primary / Junior / Senior High & Adult School Management System**  
*Comprehensive Technical & Field Operations Manual (v2.6 Production Release)*

---

## 📖 Table of Contents
1. [System Architecture & Multi-Role Access](#1-system-architecture--multi-role-access)
2. [Portal Navigation & Role Guide](#2-portal-navigation--role-guide)
   - [A. Administrator & CEO Portal](#a-administrator--ceo-portal)
   - [B. Accountant & Bursar Portal](#b-accountant--bursar-portal)
   - [C. Secretary & Cashier Portal](#c-secretary--cashier-portal)
   - [D. Teacher & Form Master Portal](#d-teacher--form-master-portal)
   - [E. Student & Parent Portal](#e-student--parent-portal)
3. [Financial Management & Multi-Receipt Engine](#3-financial-management--multi-receipt-engine)
   - [4-on-A4 Quadruplicate Receipt Printing](#4-on-a4-quadruplicate-receipt-printing)
   - [Batch Multi-Student Roster Printing](#batch-multi-student-roster-printing)
   - [Sequential Audit Chaining & Anti-Tamper Verification](#sequential-audit-chaining--anti-tamper-verification)
4. [Continuous Assessment (CA) & Master Broadsheet](#4-continuous-assessment-ca--master-broadsheet)
5. [WhatsApp & SMS Parent Dispatch Center](#5-whatsapp--sms-parent-dispatch-center)
6. [Student & Staff PVC QR ID Cards & Gate Kiosk Terminal](#6-student--staff-pvc-qr-id-cards--gate-kiosk-terminal)
7. [School Canteen Point-of-Sale (POS) & Meal Wallet](#7-school-canteen-point-of-sale-pos--meal-wallet)
8. [End-of-Term Financial Closure & Arrears Roll-Over](#8-end-of-term-financial-closure--arrears-roll-over)
9. [MINESEC Compliance & Regional Delegation Returns](#9-minesec-compliance--regional-delegation-returns)
10. [Perimeter Security (WAF), Backups & Disaster Recovery](#10-perimeter-security-waf-backups--disaster-recovery)

---

## 1. System Architecture & Multi-Role Access

JIPAS SMSys is built with strict **Role-Based Access Control (RBAC)** ensuring administrative isolation, audit trail immutability, and campus multi-tenancy.

### Supported User Roles:
* **`admin` / `super_admin`**: Full institutional control, security firewall configuration, staff management, and system disaster recovery.
* **`accountant` / `sub_accountant`**: Fee reconciliation, tuition ledger audits, payroll batches, and End-of-Term ledger balancing.
* **`secretary` / `clerk`**: Student admission, tuition fee collection desk, 4-on-A4 receipt issuing, and daily cash handover.
* **`teacher` / `hod`**: Attendance recording, Continuous Assessment (CA) marks entry, exam report sheets, and personal timetable.
* **`headmaster` / `director` / `ceo`**: Executive financial approvals, ministerial reporting, broadsheet endorsements, and governance audits.
* **`student` / `parent`**: View academic transcripts, check tuition balance, perform Mobile Money checkout, and monitor meal card wallet.

---

## 2. Portal Navigation & Role Guide

### A. Administrator & CEO Portal
* **System Settings (`system_settings`)**: Configure school name, logo, currency (`CFA`), regional delegation registration, and academic term calendar.
* **Staff Management (`teachers`)**: Register employees, assign subject quotas, and process monthly faculty payroll batches.
* **Launch & Hardware Gate (`launch_control`)**: Monitor SSL/TLS certificates, test WAF penetration probes, configure database snapshot retention, and calibrate physical 4-on-A4 printers.

### B. Accountant & Bursar Portal
* **Fee Collection & Audit Logs (`AuditPaymentLogs`)**: Multi-select payment logs, print batch receipts (4-on-A4), and export financial summaries to Excel/CSV.
* **Departmental Financial Summary (`departmental_financial_summary`)**: Real-time revenue vs. institutional expense analysis by academic division.
* **Payroll Processing (`payroll`)**: Compute base salary, overtime allowances, CNPS deductions, loan advances, and generate printable staff payslips.

### C. Secretary & Cashier Portal
* **Student Registration (`student_enroll`)**: Register new pupils with matricule generation, guardian contact details, and class allocation.
* **Fee Collection Desk (`fee_collection`)**: Instant cash/MoMo payment entry, real-time balance computation, and immediate 4-on-A4 receipt printing.
* **Daily Handover (`secretary_handover`)**: End-of-shift cash drawer balancing and official handover voucher signoff to the bursar.

### D. Teacher & Form Master Portal
* **Daily Roll-Call (`AttendanceManager`)**: Record morning attendance with present, absent, late, or excused statuses.
* **CA Gradebook (`ContinuousAssessmentGradebook`)**: Enter sequence test marks (15%), mid-term practicals (20%), and final exams (50%). Automatically calculates 20-point GPAs and class ranks.

### E. Student & Parent Portal
* **Self-Service Checkout (`parent_momo_checkout`)**: Pay fees directly via MTN Mobile Money (*126#) or Orange Money (#150#) with instant USSD push approval.
* **Digital Receipt Vault**: Download official 4-on-A4 vouchers for all past fee payments.
* **Canteen Meal Wallet**: Check remaining meal balance and review cafeteria transaction history.

---

## 3. Financial Management & Multi-Receipt Engine

### 4-on-A4 Quadruplicate Receipt Printing
When printing a single payment voucher, the system generates **4 official copies** arranged in a $2 \times 2$ grid on 1 single standard A4 sheet:
1. **Top-Left**: Copie Élève / Parent (Student Copy)
2. **Top-Right**: Copie Caisse / Comptabilité (Treasury / Finance Copy)
3. **Bottom-Left**: Copie Administration (School Admin Copy)
4. **Bottom-Right**: Copie Audit & Contrôle (Internal Audit Copy)

* **Cutting Guides**: High-contrast dashed lines (`border: 1px dashed #334155`) with visual scissor icons (`✂ Découper ici / Cut here`) allow cashiers to easily separate vouchers after printing.
* **Printer Setting**: Set Paper Size to **"A4"** and Margins to **"Default"** or **"None"**.

### Batch Multi-Student Roster Printing
* When printing receipts for an entire class (e.g. 28 students), the system automatically chunks vouchers into groups of 4 per page, requiring only 7 sheets instead of 28 separate pages (75% paper savings).

### Sequential Audit Chaining & Anti-Tamper Verification
* Every receipt receives a unique serial number (`REC-2025-0001`) with cryptographic verification hashes.
* Voided or corrected transactions are permanently preserved in the immutable financial audit log.

---

## 4. Continuous Assessment (CA) & Master Broadsheet

* **Access**: Examination Management > **Continuous Assessment (CA) Gradebook**
* **Weighted Grading Formula**:
  $$\text{Final Mark (/20)} = (\text{Seq 1} \times 0.15) + (\text{Seq 2} \times 0.15) + (\text{Mid-Term} \times 0.20) + (\text{Exam} \times 0.50)$$
* **Automated Class Ranking**: Evaluates student GPAs and ranks students from Rank 1 (Major de Promotion) to lowest with automatic tie-breaking.
* **Broadsheet Export**: 1-click printable master class broadsheet with pass rates, class average, and pedagogical remarks.

---

## 5. WhatsApp & SMS Parent Dispatch Center

* **Access**: Notifications & SMS > **WhatsApp & SMS Fee Dispatch**
* **Capabilities**:
  - **Payment Receipts**: Automatically generates a formatted WhatsApp receipt payload with receipt number, amount paid, and remaining balance.
  - **Overdue Fee Reminders**: Filter students with outstanding balances and dispatch polite bilingual reminders (FR/EN) directly to parents' mobile devices.
  - **One-Click Dispatch**: Uses direct `https://wa.me/` links without requiring third-party SMS API fees.

---

## 6. Student & Staff PVC QR ID Cards & Gate Kiosk Terminal

* **Access**: Student Management > **PVC QR ID Cards & Gate Terminal**
* **8-on-A4 PVC Cards Studio**:
  - Formatted to standard CR80 ISO dimensions ($85.6\text{ mm} \times 53.98\text{ mm}$).
  - Contains student photo, matricule, class, blood group, emergency parent phone, and dynamic verification QR code.
* **Gate Kiosk Scanner**:
  - Uses standard USB barcode scanners or laptop webcams at the school entrance.
  - Scans student badges upon arrival and logs morning timestamps with instant parent notification.

---

## 7. School Canteen Point-of-Sale (POS) & Meal Wallet

* **Access**: School Resources & Amenities > **Canteen POS & Meal Cards**
* **Touch POS Interface**:
  - Visual cafeteria menu categories: **Meals** (Riz au Poulet, Ndolè), **Snacks** (Beignets, Sandwiches), and **Drinks** (Bissap, Mineral Water).
* **Cashless Tap-to-Pay**:
  - Select items $\to$ Scan student ID badge $\to$ Instant meal balance deduction with automated receipt logging.
* **Card Recharging**:
  - Parents can top up meal allowances at the accounts desk or via mobile money.

---

## 8. End-of-Term Financial Closure & Arrears Roll-Over

* **Access**: Fee Management > **End-of-Term Closure & Roll-Over**
* **Audit Seal**:
  - Seals financial books for Term 1, 2, or 3 to prevent retroactive tampering after audit completion.
  - Generates the official **MINESEC Form 42-B Certificate of Financial Finalization**.
* **Automated Arrears Roll-Over**:
  - Automatically transfers outstanding balances from the closed term into next term’s student invoices.

---

## 9. MINESEC Compliance & Regional Delegation Returns

* **Access**: System Setting > **MINESEC Compliance & Statistics**
* **Tableau Statistique Ministériel (Form 12)**:
  - Enrollment distributions broken down by gender, age, cycle, and section (Francophone/Anglophone).
  - Calculates the official **Gender Parity Index (GPI)** ($GPI = \text{Girls} / \text{Boys}$).
  - Computes Teacher-to-Student pedagogical ratios and fee recovery percentages for regional inspectors.

---

## 10. Perimeter Security (WAF), Backups & Disaster Recovery

* **Web Application Firewall (WAF)**:
  - Active in `server.ts` inspecting queries for SQL Injection (`UNION SELECT`, `' OR 1=1`), XSS scripts, and automated scanner bots (`sqlmap`, `nikto`).
* **Automated Database Snapshots**:
  - Retention engine maintains 24 hourly, 7 daily, 4 weekly, and 12 monthly snapshots.
  - Every snapshot is hashed with a cryptographic SHA-256 integrity digest.
* **Point-In-Time-Recovery (PITR) Drill**:
  - Live dry-run simulator verifying 100% data recovery with zero variance across student, billing, and attendance datasets.
* **Offline Resilience**:
  - Service Workers and IndexedDB cache allow secretaries and teachers to continue full operations during internet outages, syncing automatically upon reconnection.

---
*Manual compiled and verified for JIPAS SMSys production deployment.*

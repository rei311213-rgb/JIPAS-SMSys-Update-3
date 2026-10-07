import React, { useState } from 'react';
import {
  BookOpen,
  Download,
  Printer,
  X,
  FileText,
  Check,
  Sparkles,
  Shield,
  Layers,
  Search,
  Copy,
  ExternalLink,
  HelpCircle,
  FileCode,
  Eye
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const FULL_MANUAL_TEXT = `# JIPAS SMSys — Complete Institutional User Manual & Operational Guide

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
* **\`admin\` / \`super_admin\`**: Full institutional control, security firewall configuration, staff management, and system disaster recovery.
* **\`accountant\` / \`sub_accountant\`**: Fee reconciliation, tuition ledger audits, payroll batches, and End-of-Term ledger balancing.
* **\`secretary\` / \`clerk\`**: Student admission, tuition fee collection desk, 4-on-A4 receipt issuing, and daily cash handover.
* **\`teacher\` / \`hod\`**: Attendance recording, Continuous Assessment (CA) marks entry, exam report sheets, and personal timetable.
* **\`headmaster\` / \`director\` / \`ceo\`**: Executive financial approvals, ministerial reporting, broadsheet endorsements, and governance audits.
* **\`student\` / \`parent\`**: View academic transcripts, check tuition balance, perform Mobile Money checkout, and monitor meal card wallet.

---

## 2. Portal Navigation & Role Guide

### A. Administrator & CEO Portal
* **System Settings (\`system_settings\`)**: Configure school name, logo, currency (\`CFA\`), regional delegation registration, and academic term calendar.
* **Staff Management (\`teachers\`)**: Register employees, assign subject quotas, and process monthly faculty payroll batches.
* **Launch & Hardware Gate (\`launch_control\`)**: Monitor SSL/TLS certificates, test WAF penetration probes, configure database snapshot retention, and calibrate physical 4-on-A4 printers.

### B. Accountant & Bursar Portal
* **Fee Collection & Audit Logs (\`AuditPaymentLogs\`)**: Multi-select payment logs, print batch receipts (4-on-A4), and export financial summaries to Excel/CSV.
* **Departmental Financial Summary (\`departmental_financial_summary\`)**: Real-time revenue vs. institutional expense analysis by academic division.
* **Payroll Processing (\`payroll\`)**: Compute base salary, overtime allowances, CNPS deductions, loan advances, and generate printable staff payslips.

### C. Secretary & Cashier Portal
* **Student Registration (\`student_enroll\`)**: Register new pupils with matricule generation, guardian contact details, and class allocation.
* **Fee Collection Desk (\`fee_collection\`)**: Instant cash/MoMo payment entry, real-time balance computation, and immediate 4-on-A4 receipt printing.
* **Daily Handover (\`secretary_handover\`)**: End-of-shift cash drawer balancing and official handover voucher signoff to the bursar.

### D. Teacher & Form Master Portal
* **Daily Roll-Call (\`AttendanceManager\`)**: Record morning attendance with present, absent, late, or excused statuses.
* **CA Gradebook (\`ContinuousAssessmentGradebook\`)**: Enter sequence test marks (15%), mid-term practicals (20%), and final exams (50%). Automatically calculates 20-point GPAs and class ranks.

### E. Student & Parent Portal
* **Self-Service Checkout (\`parent_momo_checkout\`)**: Pay fees directly via MTN Mobile Money (*126#) or Orange Money (#150#) with instant USSD push approval.
* **Digital Receipt Vault**: Download official 4-on-A4 vouchers for all past fee payments.
* **Canteen Meal Wallet**: Check remaining meal balance and review cafeteria transaction history.

---

## 3. Financial Management & Multi-Receipt Engine

### 4-on-A4 Quadruplicate Receipt Printing
When printing a single payment voucher, the system generates **4 official copies** arranged in a 2x2 grid on 1 single standard A4 sheet:
1. **Top-Left**: Copie Élève / Parent (Student Copy)
2. **Top-Right**: Copie Caisse / Comptabilité (Treasury / Finance Copy)
3. **Bottom-Left**: Copie Administration (School Admin Copy)
4. **Bottom-Right**: Copie Audit & Contrôle (Internal Audit Copy)

* **Cutting Guides**: High-contrast dashed lines (\`border: 1px dashed #334155\`) with visual scissor icons (\`✂ Découper ici / Cut here\`) allow cashiers to easily separate vouchers after printing.
* **Printer Setting**: Set Paper Size to **"A4"** and Margins to **"Default"** or **"None"**.

### Batch Multi-Student Roster Printing
* When printing receipts for an entire class (e.g. 28 students), the system automatically chunks vouchers into groups of 4 per page, requiring only 7 sheets instead of 28 separate pages (75% paper savings).

### Sequential Audit Chaining & Anti-Tamper Verification
* Every receipt receives a unique serial number (\`REC-2025-0001\`) with cryptographic verification hashes.
* Voided or corrected transactions are permanently preserved in the immutable financial audit log.

---

## 4. Continuous Assessment (CA) & Master Broadsheet

* **Access**: Examination Management > **Continuous Assessment (CA) Gradebook**
* **Weighted Grading Formula**:
  Final Mark (/20) = (Seq 1 * 0.15) + (Seq 2 * 0.15) + (Mid-Term * 0.20) + (Exam * 0.50)
* **Automated Class Ranking**: Evaluates student GPAs and ranks students from Rank 1 (Major de Promotion) to lowest with automatic tie-breaking.
* **Broadsheet Export**: 1-click printable master class broadsheet with pass rates, class average, and pedagogical remarks.

---

## 5. WhatsApp & SMS Parent Dispatch Center

* **Access**: Notifications & SMS > **WhatsApp & SMS Fee Dispatch**
* **Capabilities**:
  - **Payment Receipts**: Automatically generates a formatted WhatsApp receipt payload with receipt number, amount paid, and remaining balance.
  - **Overdue Fee Reminders**: Filter students with outstanding balances and dispatch polite bilingual reminders (FR/EN) directly to parents' mobile devices.
  - **One-Click Dispatch**: Uses direct \`https://wa.me/\` links without requiring third-party SMS API fees.

---

## 6. Student & Staff PVC QR ID Cards & Gate Kiosk Terminal

* **Access**: Student Management > **PVC QR ID Cards & Gate Terminal**
* **8-on-A4 PVC Cards Studio**:
  - Formatted to standard CR80 ISO dimensions (85.6 mm x 53.98 mm).
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
  - Select items -> Scan student ID badge -> Instant meal balance deduction with automated receipt logging.
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
  - Calculates the official **Gender Parity Index (GPI)** (GPI = Girls / Boys).
  - Computes Teacher-to-Student pedagogical ratios and fee recovery percentages for regional inspectors.

---

## 10. Perimeter Security (WAF), Backups & Disaster Recovery

* **Web Application Firewall (WAF)**:
  - Active in \`server.ts\` inspecting queries for SQL Injection (\`UNION SELECT\`, \`' OR 1=1\`), XSS scripts, and automated scanner bots (\`sqlmap\`, \`nikto\`).
* **Automated Database Snapshots**:
  - Retention engine maintains 24 hourly, 7 daily, 4 weekly, and 12 monthly snapshots.
  - Every snapshot is hashed with a cryptographic SHA-256 integrity digest.
* **Point-In-Time-Recovery (PITR) Drill**:
  - Live dry-run simulator verifying 100% data recovery with zero variance across student, billing, and attendance datasets.
* **Offline Resilience**:
  - Service Workers and IndexedDB cache allow secretaries and teachers to continue full operations during internet outages, syncing automatically upon reconnection.

---
*Manual compiled and verified for JIPAS SMSys production deployment.*
`;

export default function UserManualModal({ isOpen, onClose }: Props) {
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'guide' | 'full' | 'raw'>('guide');
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const triggerBlobDownload = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setDownloadSuccess(filename);
    setTimeout(() => setDownloadSuccess(null), 4000);
  };

  const handleDownloadMarkdown = () => {
    fetch('/USER_MANUAL.md')
      .then(res => {
        if (!res.ok) throw new Error('Network error');
        return res.text();
      })
      .then(text => triggerBlobDownload(text, 'JIPAS_SMSys_User_Manual_v2.6.md', 'text/markdown'))
      .catch(() => triggerBlobDownload(FULL_MANUAL_TEXT, 'JIPAS_SMSys_User_Manual_v2.6.md', 'text/markdown'));
  };

  const handleDownloadText = () => {
    triggerBlobDownload(FULL_MANUAL_TEXT, 'JIPAS_SMSys_User_Manual_v2.6.txt', 'text/plain');
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(FULL_MANUAL_TEXT).then(() => {
      setDownloadSuccess('Copied to clipboard!');
      setTimeout(() => setDownloadSuccess(null), 3000);
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto print:p-0 print:bg-white">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-5xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:border-none">
        
        {/* Header (Hidden on print) */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-5 sm:p-6 text-white flex flex-wrap items-center justify-between gap-4 border-b border-indigo-800/40 print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-indigo-300 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-amber-400" />
                OFFICIAL INSTITUTIONAL DOCUMENTATION
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white">JIPAS SMSys Operations &amp; User Manual (v2.6)</h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Download Markdown */}
            <button
              onClick={handleDownloadMarkdown}
              id="manual-download-md-btn"
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95"
              title="Download as Markdown (.md) for offline viewing or GitHub"
            >
              <Download className="w-4 h-4" />
              <span>Download (.md)</span>
            </button>

            {/* Download Text */}
            <button
              onClick={handleDownloadText}
              id="manual-download-txt-btn"
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              title="Download as Plain Text (.txt)"
            >
              <FileText className="w-3.5 h-3.5 text-slate-300" />
              <span>Text (.txt)</span>
            </button>

            {/* Copy All */}
            <button
              onClick={handleCopyToClipboard}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              title="Copy entire manual text to clipboard"
            >
              <Copy className="w-3.5 h-3.5 text-slate-300" />
              <span className="hidden sm:inline">Copy</span>
            </button>

            {/* Print / PDF */}
            <button
              onClick={() => window.print()}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
              title="Print directly or save as PDF via your browser print dialog"
            >
              <Printer className="w-4 h-4" />
              <span>Print / PDF</span>
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Success Alert Banner */}
        {downloadSuccess && (
          <div className="bg-emerald-500 text-white text-xs font-bold px-4 py-2.5 flex items-center justify-center gap-2 animate-in fade-in print:hidden">
            <Check className="w-4 h-4" />
            <span>Success: {downloadSuccess}</span>
          </div>
        )}

        {/* Sub-nav Tabs (Hidden on print) */}
        <div className="bg-slate-100 dark:bg-slate-800/80 px-6 py-2.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 print:hidden">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab('guide')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'guide'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Interactive Guide &amp; Key Procedures
            </button>
            <button
              onClick={() => setActiveTab('full')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'full'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Full Manual Reader (10 Chapters)
            </button>
            <button
              onClick={() => setActiveTab('raw')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'raw'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Raw Markdown
            </button>
          </div>

          <div className="text-[11px] text-slate-500 font-mono hidden sm:inline">
            File: <b>USER_MANUAL.md</b> (v2.6)
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans flex-1">
          
          {/* TAB 1: INTERACTIVE GUIDE */}
          {activeTab === 'guide' && (
            <div className="space-y-6">
              {/* Quick Start Feature Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 space-y-1">
                  <div className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Chapter 3</div>
                  <div className="font-bold text-slate-900 dark:text-white text-sm">4-on-A4 Quadruplicate Receipts</div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    Prints Student, Finance, Admin, and Audit copies on 1 A4 page with cutting scissor guides.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 space-y-1">
                  <div className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Chapter 5</div>
                  <div className="font-bold text-slate-900 dark:text-white text-sm">WhatsApp &amp; SMS Dispatch</div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    Automated parent fee receipts and bilingual overdue payment reminders directly via <span className="font-mono">wa.me</span>.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/40 space-y-1">
                  <div className="text-[10px] font-black uppercase tracking-wider text-sky-600 dark:text-sky-400">Chapter 4</div>
                  <div className="font-bold text-slate-900 dark:text-white text-sm">Continuous Assessment (CA)</div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    Sequences (15%), Practicals (20%), and Exam (50%) with automatic 20-point GPAs and master class broadsheet.
                  </p>
                </div>
              </div>

              {/* Step-by-step procedures */}
              <div className="space-y-4 pt-2">
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 pb-2 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Step-by-Step Operator Procedures</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                    <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-black">1</span>
                      <span>How to Print 4-on-A4 Receipts</span>
                    </h4>
                    <ol className="list-decimal list-inside space-y-1 text-slate-600 dark:text-slate-400 text-[11px] pl-1">
                      <li>Open <b>Secretary Portal &gt; Fee Collection Desk</b> or <b>Accountant Portal &gt; Audit Logs</b>.</li>
                      <li>Click <b>"Print Receipt (4-on-A4)"</b> on any transaction, or select multiple rows for <b>"Batch Print"</b>.</li>
                      <li>In print setup, select <b>A4</b> paper and <b>"Default"</b> margins.</li>
                      <li>Cut along the dashed guide lines (<span className="font-mono">✂ Découper ici</span>).</li>
                    </ol>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                    <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-black">2</span>
                      <span>How to Dispatch WhatsApp Messages</span>
                    </h4>
                    <ol className="list-decimal list-inside space-y-1 text-slate-600 dark:text-slate-400 text-[11px] pl-1">
                      <li>Go to <b>Notifications &amp; SMS &gt; WhatsApp &amp; SMS Fee Dispatch</b>.</li>
                      <li>Filter students by class or debt range.</li>
                      <li>Click <b>"Broadcast WhatsApp"</b> or click <b>"Send WhatsApp"</b> on an individual student row.</li>
                      <li>Confirms receipt delivery with zero third-party gateway fees.</li>
                    </ol>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                    <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center text-[10px] font-black">3</span>
                      <span>How to Print 8-on-A4 PVC ID Cards</span>
                    </h4>
                    <ol className="list-decimal list-inside space-y-1 text-slate-600 dark:text-slate-400 text-[11px] pl-1">
                      <li>Go to <b>Student Management &gt; PVC QR ID Cards &amp; Gate Terminal</b>.</li>
                      <li>Select your class filter.</li>
                      <li>Click <b>"Print 8-on-A4 ID Sheet"</b> on standard card stock paper.</li>
                      <li>Cards conform strictly to ISO CR80 standards (85.6 mm × 53.98 mm).</li>
                    </ol>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                    <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px] font-black">4</span>
                      <span>How to Finalize Term &amp; Roll Over Arrears</span>
                    </h4>
                    <ol className="list-decimal list-inside space-y-1 text-slate-600 dark:text-slate-400 text-[11px] pl-1">
                      <li>Open <b>Fee Management &gt; End-of-Term Closure &amp; Roll-Over</b>.</li>
                      <li>Click <b>"Finalize &amp; Lock Term"</b> to lock records against retroactive changes.</li>
                      <li>Generate the official <b>MINESEC Form 42-B</b> certificate.</li>
                      <li>Click <b>"Execute Arrears Roll-Over"</b> to carry forward unpaid balances.</li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: FULL MANUAL READER */}
          {activeTab === 'full' && (
            <div className="space-y-6">
              <div className="bg-slate-900 text-slate-100 p-6 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h1 className="text-lg font-black text-white">JIPAS SMSys User Manual (v2.6)</h1>
                    <p className="text-slate-400 text-xs">Joy International Primary / Junior / Senior High &amp; Adult School</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 font-mono text-[10px] border border-indigo-400/30">
                    Production v2.6
                  </span>
                </div>

                <div className="space-y-4 text-xs leading-relaxed">
                  <div className="p-3 bg-slate-800/60 rounded-xl">
                    <h3 className="font-bold text-amber-300 mb-1">1. System Architecture &amp; Multi-Role Access</h3>
                    <p className="text-slate-300 text-[11px]">
                      Implements strict Role-Based Access Control (RBAC) across 6 authorized roles: <code className="text-indigo-300">admin</code>, <code className="text-indigo-300">accountant</code>, <code className="text-indigo-300">secretary</code>, <code className="text-indigo-300">teacher</code>, <code className="text-indigo-300">headmaster/ceo</code>, and <code className="text-indigo-300">student/parent</code>.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-800/60 rounded-xl">
                    <h3 className="font-bold text-amber-300 mb-1">2. Multi-Receipt Engine (4-on-A4 Quadruplicate)</h3>
                    <p className="text-slate-300 text-[11px]">
                      Generates 4 distinct, legally-audited payment vouchers on a single standard A4 sheet in a 2x2 grid: Student Copy (Top-Left), Treasury Copy (Top-Right), Admin Copy (Bottom-Left), and Audit Copy (Bottom-Right). Includes high-contrast cutting guides.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-800/60 rounded-xl">
                    <h3 className="font-bold text-amber-300 mb-1">3. Continuous Assessment &amp; Broadsheet</h3>
                    <p className="text-slate-300 text-[11px]">
                      Computes weighted Cameroonian MINESEC grading formula: Sequences (15% + 15%), Mid-Term (20%), and Exam (50%) out of 20 points. Auto-generates class rankings and master broadsheet.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-800/60 rounded-xl">
                    <h3 className="font-bold text-amber-300 mb-1">4. Perimeter Security (WAF) &amp; Backups</h3>
                    <p className="text-slate-300 text-[11px]">
                      Web Application Firewall blocks SQLi, XSS, and bot scanners. Multi-tier backup rotation maintains 24 hourly, 7 daily, 4 weekly, and 12 monthly snapshots with SHA-256 integrity verification.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: RAW MARKDOWN */}
          {activeTab === 'raw' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] text-slate-500">USER_MANUAL.md (Raw Content)</span>
                <button
                  onClick={handleCopyToClipboard}
                  className="px-2.5 py-1 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3 h-3" />
                  <span>Copy Raw</span>
                </button>
              </div>
              <textarea
                readOnly
                value={FULL_MANUAL_TEXT}
                className="w-full h-96 p-4 rounded-2xl bg-slate-900 text-slate-200 font-mono text-[11px] border border-slate-800 focus:outline-none select-all"
              />
            </div>
          )}

        </div>

        {/* Footer (Hidden on print) */}
        <div className="p-4 sm:p-5 bg-slate-100 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs print:hidden">
          <div className="flex items-center gap-2 text-slate-500 text-[11px]">
            <HelpCircle className="w-4 h-4 text-indigo-500 shrink-0" />
            <span>Also accessible in your project root at <b className="font-mono text-slate-700 dark:text-slate-300">USER_MANUAL.md</b> and on GitHub.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadMarkdown}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .md</span>
            </button>
            <button
              onClick={() => window.print()}
              className="px-3.5 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

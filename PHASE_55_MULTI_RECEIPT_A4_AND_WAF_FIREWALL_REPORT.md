# JIPAS SMSys — Phase 55 Multi-Receipt A4 Layout & WAF Firewall Defense Report

## 1. Executive Summary
Phase 55 resolves critical operational requirements for institutional production deployment:
1. **Multi-Receipt Print Engine (4 Receipts per A4 Page)**: Re-engineered physical printing layout to render exactly 4 standardized receipt vouchers per standard A4 sheet (210mm × 297mm). Eliminates paper waste by supporting both:
   - **Quadruplicate Single Receipt**: 4 copies (Student Copy, Finance Copy, School Admin Copy, Audit Archive) on 1 single A4 paper.
   - **Batch Multi-Student Receipts**: 4 distinct student payment vouchers per A4 paper arranged in a calibrated 2×2 grid with cutting guides and automatic page breaks every 4th receipt.
2. **Unified Batch Print Feature**: Implemented and activated across **Secretary Portal**, **Accountant Portal** (`AuditPaymentLogs`), **Admin Portal** (`FeeManager`), and the **Receipt Generation Dashboard**.
3. **Web Application Firewall (WAF) & Perimeter Defense**: Deployed an active perimeter threat detection and mitigation layer in `server.ts` and `src/services/firewallService.ts`, accompanied by a dedicated **Firewall Defense Center** in the Admin Portal.

---

## 2. Multi-Receipt A4 Layout Architecture

### A. Dimensions & Calibrated Geometry
- **Sheet Dimensions**: Standard ISO A4 (210mm width × 297mm height).
- **Voucher Dimensions**: ~101mm width × ~141mm height per receipt quadrant.
- **Grid Layout**: 2 Columns × 2 Rows (`display: grid; grid-template-columns: 101mm 101mm; grid-template-rows: 141mm 141mm; gap: 2mm`).
- **Margins & Safe Zone**: Outer printable padding of 4mm ensures no text clipping on standard desktop and office inkjet/laser printers.
- **Cutting Guides**: High-contrast dashed borders (`border: 1px dashed #334155;`) with visual scissor icons (`✂ Découper ici / Cut here`) allow cashiers to easily separate vouchers after printing.

### B. Quadruplicate Single Receipt Mode
When printing a single transaction receipt on an A4 printer, the system formats 4 official copies on the single sheet:
1. **Top-Left**: Copie Élève / Parent (Student / Parent Copy)
2. **Top-Right**: Copie Caisse / Comptabilité (Finance & Treasury Copy)
3. **Bottom-Left**: Copie Administration (School Administration Copy)
4. **Bottom-Right**: Copie Audit & Contrôle (Internal Audit / Archives Copy)

### C. Batch Multi-Receipt Mode (4 Students per Sheet)
When multiple student payments are selected for batch printing:
- The system partitions the selection into chunks of 4.
- Each group of 4 prints cleanly on 1 A4 page.
- CSS `page-break-after: always` is enforced on every 4th item.
- For example, a class batch of 28 receipts prints on exactly 7 A4 pages instead of 28 separate pages, reducing institutional paper consumption by 75%.

---

## 3. Portals Integration Matrix

| Portal | Component | Feature | Capabilities |
|---|---|---|---|
| **Secretary Portal** | `SecretaryPortal.tsx` | Fee Collection Desk | Multi-select transactions, batch print button with count indicator, 4-on-A4 interactive modal preview. |
| **Accountant Portal** | `AuditPaymentLogs.tsx` | Audit Payment Logs | Multi-select payment logs, batch print button `Batch Print Receipts (4 on A4)`, CSV export, delete protection. |
| **Admin Portal** | `FeeManager.tsx` | Payments Directory | Multi-select payments table, batch print button with instant 4-on-A4 modal preview, serial chain audit. |
| **All Portals** | `ReceiptGenerationDashboard.tsx` | Receipt Dashboard | Print Queue selection & direct batch print via `BatchReceiptPrintModal`, A4 2×2 grid preview, French/English dictionary. |

---

## 4. Web Application Firewall (WAF) & Security Shield

### A. Threat Detection Engine (`server.ts`)
1. **SQL Injection (SQLi) Filter**: Inspects query strings and request bodies against malicious patterns (`UNION SELECT`, `OR 1=1`, `DROP TABLE`, inline comments `--`, `/*`).
2. **Cross-Site Scripting (XSS) Shield**: Sanitizes and blocks `<script>`, `javascript:`, `onerror=`, `eval()`, and embedded iframe vectors.
3. **Path Traversal & LFI Filter**: Detects directory escape patterns (`../`, `..\`, `/etc/passwd`, `/proc/self`).
4. **Malicious Scanner Bot Mitigation**: Blocks known vulnerability scanners and automated scraping user-agents (`sqlmap`, `nikto`, `wpscan`, `acunetix`, `dirbuster`, `nmap`).
5. **Dynamic Rate Limiting**: Enforces strict burst throttling (200 requests / 15 mins) with temporary IP quarantine for repeated probing.

### B. Threat Management API
- `GET /api/firewall/status`: Returns live firewall health, total filtered requests, blocked threat counters, and quarantined IPs.
- `GET /api/firewall/incidents`: Delivers forensic stream of intercepted attacks with timestamps, IPs, endpoints, and signatures.
- `POST /api/firewall/test-probe`: Enables safe simulated probe execution (SQLi, XSS, Traversal, Bot) for administrator defense verification.
- `POST /api/firewall/unban`: Allows authorized administrators to release quarantined IPs.

### C. Admin Firewall Defense Center (`FirewallDefensePanel.tsx`)
- Integrated into `SecurityAuditLogsManager.tsx` and accessible directly via Admin Portal menu (`WAF Firewall & Threat Shield`).
- Displays live security dashboard with gauge metrics, active rule toggles, interactive testing triggers, and one-click incident CSV export.

---

## 5. Production Readiness Assessment & Recommendations

### App Capabilities & Production Status
- **Architecture**: Complete full-stack React SPA (Vite + TypeScript + Tailwind CSS) with Express backend (`server.ts`) and optional Firestore/IndexedDB local sync.
- **Portals**: Admin, Accountant, Secretary, Teacher, Student, and Parent portals with strict Role-Based Access Control (RBAC).
- **Financial Integrity**: Authoritative ledger arithmetic, anti-duplicate idempotency, immutable receipts, and serial chaining.
- **Physical Output**: Verified 4-on-1 A4 receipt printing and single A6 slip compatibility.

### Deployment Recommendations for Real-Life Use
1. **SSL/TLS Termination**: Ensure production deployment (e.g. Vercel, Railway, or on-premise VPS) enforces HTTPS with valid certificates.
2. **Environment Variables**: Configure `GEMINI_API_KEY` for AI features and Firestore environment variables if using remote cloud sync.
3. **Database Backups**: Utilize the built-in IndexedDB / JSON backup and restore panel (`BackupRecoveryManager`) to take scheduled local snapshots.
4. **Printer Configuration**: For 4-on-1 receipt printing on desktop printers, ensure print dialog margins are set to **"Default"** or **"None"** and paper size is set to **"A4"**.

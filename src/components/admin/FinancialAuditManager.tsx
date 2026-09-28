import { useState, useMemo } from 'react';
import { getSchoolLogo } from '../common/JIPASLogo';
import { 
  FinancialAuditReport,
  Student,
  StudentBill,
  PaymentRecord,
  SchoolExpenseRecord,
  SecretaryDailySummary,
  User
} from '../../types';
import { 
  getStoredFinancialAudits, 
  saveStoredFinancialAudits,
  getStoredExpenses,
  getStoredSecretarySummaries,
  getStoredPayrollRuns
} from '../../services/storageService';
import { 
  ShieldCheck, 
  DollarSign, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  FileText, 
  Printer, 
  Download, 
  RefreshCw, 
  Search, 
  Eye, 
  X, 
  Calendar,
  Layers,
  Sparkles,
  TrendingUp,
  Receipt,
  Users
} from 'lucide-react';

interface FinancialAuditManagerProps {
  currentUser?: User;
  students: Student[];
  bills: StudentBill[];
  payments: PaymentRecord[];
  onClose?: () => void;
}

export default function FinancialAuditManager({
  currentUser,
  students,
  bills,
  payments,
  onClose
}: FinancialAuditManagerProps) {
  const [audits, setAudits] = useState<FinancialAuditReport[]>(() => getStoredFinancialAudits());
  const [expenses] = useState<SchoolExpenseRecord[]>(() => getStoredExpenses());
  const [secretarySummaries] = useState<SecretaryDailySummary[]>(() => getStoredSecretarySummaries());
  const [payrollRuns] = useState(() => getStoredPayrollRuns());
  
  const [selectedAuditForView, setSelectedAuditForView] = useState<FinancialAuditReport | null>(null);
  const [auditNotes, setAuditNotes] = useState('');
  const [auditorName, setAuditorName] = useState(currentUser?.name || 'School Administrator / Lead Internal Auditor');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // 1. Core Financial Calculations
  const totalBilled = useMemo(() => {
    return bills.reduce((sum, b) => sum + b.amount, 0);
  }, [bills]);

  const totalCollected = useMemo(() => {
    return payments.filter(p => p.status === 'Completed').reduce((sum, p) => sum + p.amount, 0);
  }, [payments]);

  const totalExpenses = useMemo(() => {
    return expenses.filter(e => e.status !== 'Void').reduce((sum, e) => sum + e.amount, 0);
  }, [expenses]);

  const totalPayrollDisbursed = useMemo(() => {
    return payrollRuns.filter(r => r.status === 'Disbursed' || r.status === 'Approved').reduce((sum, r) => sum + r.totalNetPay, 0);
  }, [payrollRuns]);

  const totalUncollectedArrears = Math.max(0, totalBilled - totalCollected);
  const netSurplusDeficit = totalCollected - (totalExpenses + totalPayrollDisbursed);

  // 2. Automated Anomaly Detection
  const discrepancies = useMemo(() => {
    const list: string[] = [];

    // Check unreconciled secretary summaries
    const unreconciledSummaries = secretarySummaries.filter(s => !s.isReconciled);
    if (unreconciledSummaries.length > 0) {
      const pendingSum = unreconciledSummaries.reduce((sum, s) => sum + s.netCashOnHand, 0);
      list.push(`Flag: ${unreconciledSummaries.length} Secretarial daily cash handovers (CFA ${(pendingSum ?? 0).toFixed(2)}) remain unreconciled by the main Bursary.`);
    }

    // Check unapproved expenses
    const pendingExpenses = expenses.filter(e => e.status === 'Pending');
    if (pendingExpenses.length > 0) {
      const pendingExpSum = pendingExpenses.reduce((sum, e) => sum + e.amount, 0);
      list.push(`Warning: ${pendingExpenses.length} Expense vouchers totaling CFA ${(pendingExpSum ?? 0).toFixed(2)} are pending administrative authorization.`);
    }

    // Check high fee arrears
    const highArrearsStudents = students.filter(s => {
      const bSum = bills.filter(b => b.studentId === s.id).reduce((sum, b) => sum + b.amount, 0);
      const pSum = payments.filter(p => p.studentId === s.id && p.status === 'Completed').reduce((sum, p) => sum + p.amount, 0);
      return (bSum - pSum) > 1000;
    });
    if (highArrearsStudents.length > 0) {
      list.push(`Risk Notice: ${highArrearsStudents.length} students have critical fee arrears exceeding CFA 1,000.00.`);
    }

    // Check collection rate
    if (totalBilled > 0) {
      const rate = (totalCollected / totalBilled) * 100;
      if (rate < 70) {
        list.push(`Alert: Overall fee collection rate is currently at ${(rate ?? 0).toFixed(1)}% (below recommended 85% operating threshold).`);
      }
    }

    if (list.length === 0) {
      list.push('No critical anomalies detected. Institutional accounts and transaction trails are balanced and compliant.');
    }

    return list;
  }, [secretarySummaries, expenses, students, bills, payments, totalBilled, totalCollected]);

  // Handle Run and Certify New Audit
  const handleGenerateAudit = () => {
    const auditId = `AUD-${new Date().getFullYear()}-${(audits.length + 101).toString().padStart(4, '0')}`;
    const newAudit: FinancialAuditReport = {
      id: `aud-${Date.now()}`,
      auditDate: new Date().toISOString().split('T')[0],
      academicYear: '2025-2026',
      term: 'Third Term',
      totalBilled,
      totalCollected,
      totalExpenses,
      totalPayroll: totalPayrollDisbursed,
      netSurplus: netSurplusDeficit,
      discrepancies,
      auditedBy: auditorName.trim(),
      auditStatus: discrepancies.length > 1 && discrepancies[0].startsWith('Flag') ? 'Requires Action' : 'Balanced',
      notes: auditNotes.trim() || 'Comprehensive institutional financial balance audit certified by School Administration.',
      createdAt: new Date().toISOString()
    };

    const updated = [newAudit, ...audits];
    setAudits(updated);
    saveStoredFinancialAudits(updated);
    setSelectedAuditForView(newAudit);
    showToast(`Financial Audit ${auditId} successfully certified and archived.`);
  };

  const handlePrintAuditReport = (report: FinancialAuditReport) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const logoSrc = getSchoolLogo();
    const absoluteLogoSrc = logoSrc.startsWith('http') || logoSrc.startsWith('data:') 
      ? logoSrc 
      : window.location.origin + (logoSrc.startsWith('/') ? '' : '/') + logoSrc;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Institutional Financial Audit Report - ${report.id}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: #0f172a; max-width: 800px; margin: 0 auto; }
            .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 24px; }
            .school-logo { width: 50px; height: 50px; object-fit: contain; margin-bottom: 8px; }
            .school-name { font-size: 24px; font-weight: 900; text-transform: uppercase; margin: 0; color: #0f172a; }
            .sub { font-size: 12px; color: #64748b; margin-top: 4px; }
            .badge { display: inline-block; background: #0f172a; color: white; padding: 4px 14px; font-size: 12px; font-weight: bold; border-radius: 4px; margin-top: 10px; }
            .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; font-size: 13px; }
            .meta-box { border: 1px solid #cbd5e1; padding: 10px 14px; border-radius: 8px; }
            .meta-label { font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: bold; }
            .meta-val { font-size: 14px; font-weight: bold; margin-top: 2px; }
            .ledger-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px; }
            .ledger-table th, .ledger-table td { border: 1px solid #cbd5e1; padding: 10px 12px; }
            .ledger-table th { background: #f1f5f9; text-align: left; font-weight: bold; }
            .surplus-box { background: #f8fafc; border: 2px solid #0f172a; padding: 18px; border-radius: 8px; text-align: center; margin-bottom: 24px; }
            .surplus-val { font-size: 28px; font-weight: 900; color: ${report.netSurplus >= 0 ? '#059669' : '#e11d48'}; }
            .discrepancy-list { background: #fff1f2; border: 1px solid #fecdd3; padding: 14px 18px; border-radius: 8px; margin-bottom: 24px; font-size: 12px; }
            .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 50px; font-size: 12px; }
            .sig-line { border-top: 1px solid #0f172a; padding-top: 6px; text-align: center; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="${absoluteLogoSrc}" alt="School Crest" class="school-logo" />
            <h1 class="school-name">JIPAS Educational Complex</h1>
            <p class="sub">Official Internal Audit & Financial Examination Board • 01 BP. 2364 • Lomé — Togo</p>
            <div class="badge">OFFICIAL FINANCIAL AUDIT CERTIFICATION REPORT</div>
          </div>

          <div class="meta-grid">
            <div class="meta-box">
              <div class="meta-label">Audit Date</div>
              <div class="meta-val">${report.auditDate}</div>
            </div>
            <div class="meta-box">
              <div class="meta-label">Academic Period</div>
              <div class="meta-val">${report.academicYear} • ${report.term}</div>
            </div>
            <div class="meta-box">
              <div class="meta-label">Lead Auditor</div>
              <div class="meta-val">${report.auditedBy}</div>
            </div>
            <div class="meta-box">
              <div class="meta-label">Audit Determination Status</div>
              <div class="meta-val">${report.auditStatus.toUpperCase()}</div>
            </div>
          </div>

          <table class="ledger-table">
            <thead>
              <tr>
                <th>Financial Item</th>
                <th>Category</th>
                <th style="text-align: right;">Amount (CFA)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Total Student Fee Invoices Generated</td>
                <td>Gross Revenue Billing</td>
                <td style="text-align: right; font-weight: bold;">CFA {(report.totalBilled ?? 0).toFixed(2)}</td>
              </tr>
              <tr>
                <td>Total Fee Collections Received (Desk + MoMo + Bank)</td>
                <td>Actual Operating Inflow</td>
                <td style="text-align: right; font-weight: bold; color: #059669;">CFA {(report.totalCollected ?? 0).toFixed(2)}</td>
              </tr>
              <tr>
                <td>Total Institutional Operating Expenditures</td>
                <td>Supplies, Utilities & Repairs</td>
                <td style="text-align: right; font-weight: bold; color: #e11d48;">CFA ${ (report.totalExpenses ?? 0).toFixed(2) }</td>
              </tr>
              <tr>
                <td>Total Faculty & Staff Payroll Disbursements</td>
                <td>Staff Salaries & Pension</td>
                <td style="text-align: right; font-weight: bold; color: #e11d48;">CFA ${ (report.totalPayroll ?? 0).toFixed(2) }</td>
              </tr>
            </tbody>
          </table>

          <div class="surplus-box">
            <div style="font-size: 11px; text-transform: uppercase; font-weight: bold; color: #64748b;">Net Operating Surplus / Deficit</div>
            <div class="surplus-val">CFA ${ (report.netSurplus ?? 0).toFixed(2) }</div>
            <div style="font-size: 12px; font-weight: bold; margin-top: 4px; color: #475569;">
              Collection Coverage: ${ ((report.totalCollected / Math.max(1, report.totalBilled)) * 100).toFixed(1) }%
            </div>
          </div>

          <div class="discrepancy-list">
            <div style="font-weight: bold; text-transform: uppercase; font-size: 11px; margin-bottom: 6px; color: #9f1239;">
              Audit Findings & Anomaly Disclosures:
            </div>
            <ul style="margin: 0; padding-left: 18px;">
              ${report.discrepancies.map(d => `<li style="margin-bottom: 4px;">${d}</li>`).join('')}
            </ul>
          </div>

          <div style="font-size: 12px; margin-bottom: 20px;">
            <strong>Auditor Notes:</strong> ${report.notes || 'Accounts reviewed and verified compliant.'}
          </div>

          <div class="signatures">
            <div>
              <div style="height: 40px;"></div>
              <div class="sig-line">Audited & Certified By<br><span style="font-weight: normal; font-size: 11px;">${report.auditedBy}</span></div>
            </div>
            <div>
              <div style="height: 40px;"></div>
              <div class="sig-line">School Principal / Board Chairman<br><span style="font-weight: normal; font-size: 11px;">JIPAS Governance Council</span></div>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  return (
    <div className="space-y-6 text-slate-900 animate-fade-in">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs font-bold border border-slate-700 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <span className="text-xs font-black tracking-wider uppercase text-emerald-600">
              Institutional Governance & Compliance
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900">
            Financial Records Audit & Reconciliation
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Audit student tuition billings, fee collections, operational expenditures, staff payroll disbursements, and secretarial cash handovers with verifiable compliance certifications.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* Live Financial Breakdown & Health Matrix */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Gross Fee Billings</span>
            <FileText className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            CFA {totalBilled.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-slate-400 mt-1">{bills.length} student bill lines generated</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-emerald-200/80 shadow-xs flex flex-col justify-between bg-emerald-50/20">
          <div className="flex items-center justify-between text-emerald-700 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Fee Inflows Collected</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700 font-mono">
            CFA {totalCollected.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-emerald-700 mt-1">
            {((totalCollected / Math.max(1, totalBilled)) * 100).toFixed(1)}% recovery rate
          </span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-rose-200/80 shadow-xs flex flex-col justify-between bg-rose-50/20">
          <div className="flex items-center justify-between text-rose-700 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Expenses & Payroll</span>
            <Receipt className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-700 font-mono">
            CFA {(totalExpenses + totalPayrollDisbursed).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-rose-600 mt-1">
            Expenses: CFA {(totalExpenses ?? 0).toFixed(0)} • Payroll: CFA {(totalPayrollDisbursed ?? 0).toFixed(0)}
          </span>
        </div>

        <div className={`p-5 rounded-3xl border shadow-xs flex flex-col justify-between ${
          netSurplusDeficit >= 0 
            ? 'bg-blue-50/60 border-blue-200/80 text-blue-900' 
            : 'bg-rose-50/60 border-rose-200/80 text-rose-900'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Net Operating Balance</span>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black font-mono">
            CFA {netSurplusDeficit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] font-bold mt-1">
            {netSurplusDeficit >= 0 ? 'Operating Surplus' : 'Operating Deficit'}
          </span>
        </div>
      </div>

      {/* Discrepancies & Anomaly Check Box */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h3 className="font-black text-sm text-slate-900">
              Automated Audit Findings & Risk Verification
            </h3>
          </div>
          <span className="text-[10px] font-extrabold uppercase bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-full">
            Real-Time Anomaly Scanner
          </span>
        </div>

        <div className="space-y-2">
          {discrepancies.map((disc, idx) => (
            <div 
              key={idx} 
              className={`p-3.5 rounded-2xl border text-xs font-medium flex items-start gap-2.5 ${
                disc.startsWith('Flag') || disc.startsWith('Warning') || disc.startsWith('Alert')
                  ? 'bg-amber-50/80 border-amber-200/90 text-amber-900'
                  : 'bg-emerald-50/80 border-emerald-200/90 text-emerald-900'
              }`}
            >
              <div className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 shrink-0" />
              <span>{disc}</span>
            </div>
          ))}
        </div>

        {/* Audit Certification Action */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="w-full sm:w-auto flex-1">
            <input
              type="text"
              value={auditNotes}
              onChange={(e) => setAuditNotes(e.target.value)}
              placeholder="Enter auditor findings, sign-off remarks, or certification notes..."
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white"
            />
          </div>

          <button
            onClick={handleGenerateAudit}
            id="btn-certify-new-audit"
            className="w-full sm:w-auto px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all shrink-0"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Certify & Save Official Audit</span>
          </button>
        </div>
      </div>

      {/* Audit History Ledger */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-black text-xs uppercase tracking-wider text-slate-700">
            Certified Financial Audit Archive ({audits.length})
          </h3>
          <span className="text-[11px] text-slate-400">Official institutional audit reports</span>
        </div>

        <div className="divide-y divide-slate-100 text-xs">
          {audits.map(aud => (
            <div key={aud.id} className="p-4 sm:p-5 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-black text-slate-900">{aud.id}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    aud.auditStatus === 'Balanced' 
                      ? 'bg-emerald-100 text-emerald-800' 
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {aud.auditStatus}
                  </span>
                  <span className="text-slate-400">•</span>
                  <span className="text-slate-600 font-medium">{aud.auditDate}</span>
                </div>
                <div className="text-[11px] text-slate-500">
                  Audited by: <strong>{aud.auditedBy}</strong> • Net Balance: <strong className={aud.netSurplus >= 0 ? 'text-emerald-700' : 'text-rose-700'}>CFA {(aud.netSurplus ?? 0).toFixed(2)}</strong>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePrintAuditReport(aud)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl flex items-center gap-1.5 cursor-pointer text-xs"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-500" />
                  <span>Print Report</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

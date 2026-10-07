import React, { useState, useMemo } from 'react';
import {
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Printer,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Calendar,
  Layers,
  Coins,
  Users,
  Check
} from 'lucide-react';
import { Student, StudentBill, PaymentRecord } from '../../types';
import {
  calculateTermFinancials,
  finalizeAndLockTerm,
  executeArrearsRollOver,
  listTermClosures,
  TermClosureSummary
} from '../../services/termClosureService';

interface Props {
  students: Student[];
  bills: StudentBill[];
  payments: PaymentRecord[];
  currentUser: any;
}

export default function TermClosureRollOverWizard({
  students,
  bills,
  payments,
  currentUser
}: Props) {
  const [selectedAcademicYear, setSelectedAcademicYear] = useState('2025/2026');
  const [selectedTerm, setSelectedTerm] = useState('First Term');
  const [nextTerm, setNextTerm] = useState('Second Term');
  const [isRollOverSuccess, setIsRollOverSuccess] = useState<string | null>(null);
  const [showPrintCertificate, setShowPrintCertificate] = useState(false);

  const summary = useMemo(() => {
    return calculateTermFinancials(selectedAcademicYear, selectedTerm, students, bills, payments);
  }, [selectedAcademicYear, selectedTerm, students, bills, payments]);

  const [activeClosure, setActiveClosure] = useState<TermClosureSummary>(summary);

  const handleLockTerm = () => {
    if (!confirm(`Are you sure you want to officially LOCK and FINALISE financial records for ${selectedTerm} (${selectedAcademicYear})? Post-closure payment modifications will be sealed.`)) {
      return;
    }
    const locked = finalizeAndLockTerm(
      selectedAcademicYear,
      selectedTerm,
      currentUser?.name || currentUser?.username || 'Chief Accountant / Headmaster',
      summary
    );
    setActiveClosure(locked);
    setShowPrintCertificate(true);
  };

  const handleExecuteRollOver = () => {
    if (!confirm(`Execute automated arrears roll-over from ${selectedTerm} into ${nextTerm}? Unpaid student balances will be carried forward.`)) {
      return;
    }
    const res = executeArrearsRollOver(selectedTerm, nextTerm, selectedAcademicYear, {
      'Form 1': 45000,
      'Form 2': 45000,
      'Form 3': 50000,
      'Form 4': 50000,
      'Form 5': 60000,
      'Lower Sixth': 65000,
      'Upper Sixth': 70000
    });
    setIsRollOverSuccess(`Successfully rolled over ${res.totalArrearsRolled.toLocaleString()} CFA in arrears across ${res.rolledCount} student accounts into ${nextTerm}!`);
    setTimeout(() => setIsRollOverSuccess(null), 6000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-indigo-800/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold tracking-wide">
              <Lock className="w-3.5 h-3.5 text-indigo-400" />
              <span>OPTION A — FINANCIAL CLOSURE & LEDGER ROLL-OVER WIZARD</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              End-of-Term Ledger Finalization & Arrears Roll-Over
            </h1>
            <p className="text-sm text-indigo-200/80 max-w-2xl">
              Officially seal past-term ledgers with immutable cryptographic certificates and roll forward unpaid student balances into the next term.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {activeClosure.isLocked ? (
              <div className="bg-emerald-500/20 border border-emerald-400/40 px-4 py-2 rounded-2xl flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-black text-emerald-300 uppercase tracking-wider">Term Locked & Certified</span>
              </div>
            ) : (
              <div className="bg-amber-500/20 border border-amber-400/40 px-4 py-2 rounded-2xl flex items-center gap-2">
                <Unlock className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-black text-amber-300 uppercase tracking-wider">Ledger Open for Balancing</span>
              </div>
            )}
          </div>
        </div>

        {/* Period Selector Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-6 border-t border-indigo-800/50">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-indigo-200/70 mb-1">Academic Year</label>
            <select
              value={selectedAcademicYear}
              onChange={e => setSelectedAcademicYear(e.target.value)}
              className="w-full bg-slate-800/90 border border-slate-700 text-white rounded-xl p-2.5 text-xs font-bold"
            >
              <option value="2025/2026">2025/2026 Academic Year</option>
              <option value="2024/2025">2024/2025 Academic Year</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-indigo-200/70 mb-1">Term to Finalize</label>
            <select
              value={selectedTerm}
              onChange={e => setSelectedTerm(e.target.value)}
              className="w-full bg-slate-800/90 border border-slate-700 text-white rounded-xl p-2.5 text-xs font-bold"
            >
              <option value="First Term">First Term (Trimestre 1)</option>
              <option value="Second Term">Second Term (Trimestre 2)</option>
              <option value="Third Term">Third Term (Trimestre 3)</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-indigo-200/70 mb-1">Target Next Term (Roll-Over)</label>
            <select
              value={nextTerm}
              onChange={e => setNextTerm(e.target.value)}
              className="w-full bg-slate-800/90 border border-slate-700 text-white rounded-xl p-2.5 text-xs font-bold"
            >
              <option value="Second Term">Second Term (Trimestre 2)</option>
              <option value="Third Term">Third Term (Trimestre 3)</option>
              <option value="First Term Next Year">Next Academic Year</option>
            </select>
          </div>
        </div>
      </div>

      {isRollOverSuccess && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-2xl text-xs font-bold text-emerald-800 dark:text-emerald-200 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{isRollOverSuccess}</span>
        </div>
      )}

      {/* Financial Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="text-xs font-bold text-slate-500">Total Billed Tuition</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {summary.totalBilledAmount.toLocaleString()} <span className="text-xs font-bold text-slate-400">CFA</span>
          </div>
          <div className="text-[11px] text-slate-400">{summary.totalStudents} Active Students Billed</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="text-xs font-bold text-slate-500">Total Realized Revenue</div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {summary.totalCollectedAmount.toLocaleString()} <span className="text-xs font-bold text-slate-400">CFA</span>
          </div>
          <div className="text-[11px] text-emerald-600 font-bold">
            {summary.collectionRatePercent}% Collection Efficiency
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="text-xs font-bold text-slate-500">Outstanding Arrears (Debts)</div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
            {summary.totalOutstandingArrears.toLocaleString()} <span className="text-xs font-bold text-slate-400">CFA</span>
          </div>
          <div className="text-[11px] text-rose-500 font-bold">
            {summary.partiallyPaidCount + summary.unpaidCount} Accounts In Arrears
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="text-xs font-bold text-slate-500">Payment Clearance Ratio</div>
          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
            {summary.fullyPaidCount} <span className="text-xs font-bold text-slate-400">/ {summary.totalStudents}</span>
          </div>
          <div className="text-[11px] text-indigo-500 font-bold">100% Cleared Accounts</div>
        </div>
      </div>

      {/* Action Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Step 1: Finalize & Lock Term */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-indigo-600">Step 1 — Audit Closure</span>
              {activeClosure.isLocked ? (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 text-[10px] font-black">CERTIFIED</span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 text-[10px] font-black">AWAITING LOCK</span>
              )}
            </div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">Official Ledger Finalization & Seal</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Generates the formal Certificate of Financial Finalization for internal auditors and Ministry of Secondary Education (MINESEC) inspectors.
            </p>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-3">
            <button
              onClick={handleLockTerm}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-indigo-600/20"
            >
              <Lock className="w-4 h-4" />
              <span>Finalize & Lock {selectedTerm}</span>
            </button>

            <button
              onClick={() => setShowPrintCertificate(!showPrintCertificate)}
              className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>{showPrintCertificate ? 'Hide Certificate' : 'Preview Certificate'}</span>
            </button>
          </div>
        </div>

        {/* Step 2: Automated Arrears Roll-Over */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-600">Step 2 — Roll-Over</span>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200 text-[10px] font-black">AUTOMATED</span>
            </div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">Arrears Roll-Over to {nextTerm}</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Carries over all unpaid student arrears from {selectedTerm} directly into the {nextTerm} billing schedule, creating consolidated student invoices.
            </p>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={handleExecuteRollOver}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-600/20"
            >
              <ArrowRight className="w-4 h-4" />
              <span>Execute Arrears Roll-Over into {nextTerm}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Printable Certificate Modal / Preview */}
      {showPrintCertificate && (
        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl space-y-6 animate-in fade-in">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-4 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">MINESEC OFFICIAL FORM 42-B</div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">CERTIFICAT FINANCIER DE FIN DE TRIMESTRE</h2>
            </div>
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl flex items-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Official Certificate</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs font-mono bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl">
            <div><b>Academic Period:</b> {selectedAcademicYear} — {selectedTerm}</div>
            <div><b>Certificate Serial:</b> {activeClosure.certificateNo || 'CERT-PENDING-SIGNATURE'}</div>
            <div><b>Total Enrolled Students:</b> {summary.totalStudents}</div>
            <div><b>Recovery Rate:</b> {summary.collectionRatePercent}%</div>
            <div><b>Total Billed:</b> {summary.totalBilledAmount.toLocaleString()} CFA</div>
            <div><b>Total Encashment:</b> {summary.totalCollectedAmount.toLocaleString()} CFA</div>
          </div>

          <div className="grid grid-cols-2 gap-8 pt-8 border-t border-slate-200 dark:border-slate-800 text-center text-xs">
            <div className="space-y-12">
              <div className="font-bold text-slate-600 dark:text-slate-400">L'Intendant / Comptable Central</div>
              <div className="border-b border-slate-400 max-w-[200px] mx-auto" />
              <div className="text-[10px] text-slate-400">Signature & Cachet Caisse</div>
            </div>

            <div className="space-y-12">
              <div className="font-bold text-slate-600 dark:text-slate-400">Le Chef d'Établissement (Principal)</div>
              <div className="border-b border-slate-400 max-w-[200px] mx-auto" />
              <div className="text-[10px] text-slate-400">Signature & Sceau de l'Établissement</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

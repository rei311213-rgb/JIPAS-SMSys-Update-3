import React, { useState, useMemo, useEffect } from 'react';
import { 
  ShieldCheck, AlertTriangle, CheckCircle2, RefreshCw, 
  Search, Filter, Download, Printer, FileText, ChevronRight, 
  DollarSign, Scale, ArrowUpRight, ArrowDownRight, Users, 
  Layers, Building, HelpCircle, Eye, X, AlertOctagon, CheckSquare, 
  ShieldAlert, Clock, Sparkles, Database, FileSpreadsheet
} from 'lucide-react';
import { 
  FinancialReconciliationReport, 
  FinancialExceptionItem, 
  FinancialDiscrepancyType, 
  DiscrepancySeverity,
  ExternalEvidenceStatus,
  User,
  Student,
  StudentBill,
  PaymentRecord
} from '../../types';
import { 
  runFinancialReconciliationAudit, 
  getStoredReconciliationReports 
} from '../../services/financialReconciliationService';
import { formatCurrency } from '../../utils/financeUtils';
import JIPASLogo from '../common/JIPASLogo';
import { Campus } from '../../lib/campusUtils';

interface FinancialReconciliationDashboardProps {
  currentUser?: User;
  students?: Student[];
  bills?: StudentBill[];
  payments?: PaymentRecord[];
  onClose?: () => void;
}

export default function FinancialReconciliationDashboard({
  currentUser,
  students,
  bills,
  payments,
  onClose
}: FinancialReconciliationDashboardProps) {
  // Scoping filters
  const [selectedCampus, setSelectedCampus] = useState<Campus | 'All'>('All');
  const [selectedYear, setSelectedYear] = useState<string>('All');
  const [selectedTerm, setSelectedTerm] = useState<string>('All');
  
  // UI filter controls
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected exception for deep drill-down
  const [selectedException, setSelectedException] = useState<FinancialExceptionItem | null>(null);
  const [isAuditing, setIsAuditing] = useState<boolean>(false);
  const [auditReport, setAuditReport] = useState<FinancialReconciliationReport | null>(null);

  // Run audit on mount or filter change
  const triggerAudit = () => {
    setIsAuditing(true);
    // Asynchronous wrap to allow UI responsiveness
    setTimeout(() => {
      const report = runFinancialReconciliationAudit({
        campus: selectedCampus,
        academicYear: selectedYear,
        term: selectedTerm,
        reviewerName: currentUser?.name || 'Authorized Lead Auditor',
        reviewerRole: currentUser?.role?.toUpperCase() || 'FINANCIAL AUDITOR',
        students,
        bills,
        payments
      });
      setAuditReport(report);
      setIsAuditing(false);
    }, 150);
  };

  useEffect(() => {
    triggerAudit();
  }, [selectedCampus, selectedYear, selectedTerm]);

  // Filtered exceptions for display
  const filteredExceptions = useMemo(() => {
    if (!auditReport) return [];
    return auditReport.exceptions.filter(exc => {
      // Category filter
      if (categoryFilter !== 'ALL' && exc.category !== categoryFilter) return false;
      // Severity filter
      if (severityFilter !== 'ALL' && exc.severity !== severityFilter) return false;
      // Verification status filter
      if (statusFilter !== 'ALL' && exc.verificationStatus !== statusFilter) return false;
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesRef = exc.studentRef?.toLowerCase().includes(q) || false;
        const matchesName = exc.studentName?.toLowerCase().includes(q) || false;
        const matchesAdm = exc.admissionNo?.toLowerCase().includes(q) || false;
        const matchesDesc = exc.description.toLowerCase().includes(q);
        const matchesTx = exc.transactionRefs.some(t => t.toLowerCase().includes(q));
        if (!matchesRef && !matchesName && !matchesAdm && !matchesDesc && !matchesTx) return false;
      }
      return true;
    });
  }, [auditReport, categoryFilter, severityFilter, statusFilter, searchQuery]);

  // CSV Export
  const handleExportCSV = () => {
    if (!auditReport) return;
    const headers = ['Exception ID', 'Student / Account', 'Admission No', 'Campus', 'Period', 'Category', 'Severity', 'Expected (CFA)', 'Recorded (CFA)', 'Variance (CFA)', 'Verification Status', 'Transaction Refs', 'Recommended Investigation'];
    const rows = auditReport.exceptions.map(e => [
      `"${e.id}"`,
      `"${e.studentName || e.studentRef || 'N/A'}"`,
      `"${e.admissionNo || 'N/A'}"`,
      `"${e.campus}"`,
      `"${e.academicPeriod}"`,
      `"${e.category}"`,
      `"${e.severity}"`,
      e.expectedAmount,
      e.recordedAmount,
      e.variance,
      `"${e.verificationStatus}"`,
      `"${e.transactionRefs.join(', ')}"`,
      `"${e.recommendedInvestigation.replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `JIPAS_Financial_Reconciliation_${auditReport.reconciliationDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // JSON Export for full machine audit
  const handleExportJSON = () => {
    if (!auditReport) return;
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(auditReport, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', dataStr);
    link.setAttribute('download', `JIPAS_Financial_Reconciliation_${auditReport.reconciliationDate}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print view
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12 print:p-0 print:space-y-4">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-white shadow-xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 print:border-none print:shadow-none print:bg-white print:text-black">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 print:hidden">
            <Scale className="w-8 h-8 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Phase 30 • Authoritative
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/30">
                Non-Destructive • Read-Only
              </span>
            </div>
            <h1 className="text-2xl font-black text-white mt-1 flex items-center gap-2 print:text-black">
              Financial Reconciliation & Exception Detection
            </h1>
            <p className="text-xs text-slate-400 mt-0.5 print:text-slate-600">
              Cross-ledger mathematical verification across student bills, payment transactions, bank deposits, secretary cash handovers, and executive dashboards.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5 print:hidden">
          <button
            type="button"
            onClick={triggerAudit}
            disabled={isAuditing}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-indigo-600/20 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isAuditing ? 'animate-spin' : ''}`} />
            {isAuditing ? 'Reconciling...' : 'Run Audit'}
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            CSV
          </button>

          <button
            type="button"
            onClick={handleExportJSON}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-blue-400" />
            JSON
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-slate-300" />
            Print
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Audit Scope and Reviewer Strip */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <Building className="w-4 h-4 text-indigo-600" />
            Campus:
          </div>
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            {(['All', 'JIPAS 1', 'JIPAS 2'] as const).map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setSelectedCampus(c)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  selectedCampus === c 
                    ? 'bg-indigo-600 text-white shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {c === 'All' ? 'All Campuses' : c}
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-slate-200 hidden md:block" />

          {/* Academic Year Filter */}
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span>Year:</span>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(e.target.value)}
              className="px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none"
            >
              <option value="All">All Years</option>
              <option value="2025-2026">2025-2026</option>
              <option value="2024-2025">2024-2025</option>
              <option value="2026-2027">2026-2027</option>
            </select>
          </div>

          {/* Term Filter */}
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span>Term:</span>
            <select
              value={selectedTerm}
              onChange={e => setSelectedTerm(e.target.value)}
              className="px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none"
            >
              <option value="All">All Terms</option>
              <option value="First Term">First Term</option>
              <option value="Second Term">Second Term</option>
              <option value="Third Term">Third Term</option>
            </select>
          </div>
        </div>

        {/* Reviewer & Safety Info */}
        <div className="flex items-center gap-4 text-xs">
          <div className="text-right">
            <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">Auditor / Reviewer</span>
            <span className="font-bold text-slate-800">{auditReport?.reviewerName || currentUser?.name || 'Bursary Lead'}</span>
            <span className="text-[10px] text-indigo-600 ml-1 font-semibold">({auditReport?.reviewerRole || 'Auditor'})</span>
          </div>
          <div className="h-8 w-px bg-slate-200" />
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 font-bold text-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Immutable Trail</span>
          </div>
        </div>
      </div>

      {/* KPI Summary Cards Grid (9 Metrics) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
        {/* 1. Total Posted Charges */}
        <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Total Posted Charges</span>
          <h3 className="text-xl font-black text-slate-900 font-mono mt-1">
            {formatCurrency(auditReport?.totalPostedCharges || 0)}
          </h3>
          <p className="text-[10px] text-slate-500 mt-0.5">Assigned tuition & mandatory fees</p>
        </div>

        {/* 2. Total Valid Collections */}
        <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm">
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 block">Total Valid Collections</span>
          <h3 className="text-xl font-black text-emerald-700 font-mono mt-1">
            {formatCurrency(auditReport?.totalValidCollections || 0)}
          </h3>
          <p className="text-[10px] text-emerald-600/80 mt-0.5">Verified non-reversed payments</p>
        </div>

        {/* 3. Total Outstanding Balances */}
        <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm">
          <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 block">Outstanding Balances</span>
          <h3 className="text-xl font-black text-amber-700 font-mono mt-1">
            {formatCurrency(auditReport?.totalOutstandingBalances || 0)}
          </h3>
          <p className="text-[10px] text-slate-500 mt-0.5">Remaining uncollected tuition</p>
        </div>

        {/* 4. Unallocated Payments & Credits */}
        <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm">
          <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 block">Unallocated & Credits</span>
          <h3 className="text-xl font-black text-indigo-700 font-mono mt-1">
            {formatCurrency((auditReport?.unallocatedPaymentsAmount || 0) + (auditReport?.unexplainedCreditsAmount || 0))}
          </h3>
          <p className="text-[10px] text-slate-500 mt-0.5">Orphan receipts & surplus credits</p>
        </div>

        {/* 5. Reversals & Refunds */}
        <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm">
          <span className="text-[10px] font-black uppercase tracking-wider text-purple-600 block">Reversals & Refunds</span>
          <h3 className="text-xl font-black text-purple-700 font-mono mt-1">
            {formatCurrency((auditReport?.reversedPaymentsAmount || 0) + (auditReport?.totalRefundsAmount || 0))}
          </h3>
          <p className="text-[10px] text-slate-500 mt-0.5">Voided fees & voucher claims</p>
        </div>

        {/* 6. Accounts Reconciled */}
        <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Accounts Reconciled</span>
          <h3 className="text-xl font-black text-slate-900 font-mono mt-1">
            {auditReport?.totalAccountsReconciled || 0}
          </h3>
          <p className="text-[10px] text-slate-500 mt-0.5">Bills & payment items audited</p>
        </div>

        {/* 7. Discrepancies Count */}
        <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm">
          <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 block">Exceptions Flagged</span>
          <h3 className="text-xl font-black text-rose-700 font-mono mt-1">
            {auditReport?.totalDiscrepanciesCount || 0}
          </h3>
          <p className="text-[10px] text-rose-600/80 mt-0.5">Require bursary investigation</p>
        </div>

        {/* 8. Unresolved Variance Exposure */}
        <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm">
          <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 block">Variance Exposure</span>
          <h3 className="text-xl font-black text-rose-700 font-mono mt-1">
            {formatCurrency(auditReport?.unresolvedDiscrepanciesAmount || 0)}
          </h3>
          <p className="text-[10px] text-slate-500 mt-0.5">Cumulative mathematical gap</p>
        </div>

        {/* 9. Overall Audit Status */}
        <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm xl:col-span-2 flex flex-col justify-between">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Audit Certification</span>
          <div className="flex items-center gap-3 my-1">
            {auditReport?.status === 'Clean' ? (
              <div className="flex items-center gap-2 px-3 py-1 bg-emerald-100 text-emerald-800 rounded-xl text-xs font-black">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                CLEAN • PERFECT RECONCILIATION
              </div>
            ) : auditReport?.status === 'Discrepancies Detected' ? (
              <div className="flex items-center gap-2 px-3 py-1 bg-rose-100 text-rose-800 rounded-xl text-xs font-black">
                <AlertOctagon className="w-4 h-4 text-rose-600" />
                EXCEPTIONS DETECTED
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1 bg-amber-100 text-amber-800 rounded-xl text-xs font-black">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                UNDER INVESTIGATION
              </div>
            )}
            <span className="text-xs text-slate-500 font-mono">
              Audit ID: {auditReport?.id}
            </span>
          </div>
          <p className="text-[10px] text-slate-400">Run: {auditReport?.createdAt ? new Date(auditReport.createdAt).toLocaleString() : 'N/A'}</p>
        </div>
      </div>

      {/* Cross-System Dashboard Reconciliation Status Strip */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
              Cross-Dashboard Reconciliation Alignment
            </h4>
          </div>
          <span className="text-[11px] text-slate-500">
            Verifying that aggregate metrics across portals reconcile directly to ledger transaction rows.
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Accountant Dashboard */}
          <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase text-slate-400 block">Accountant Portal</span>
              <span className="text-xs font-bold text-slate-800">Fee Ledger vs Bill Payments</span>
            </div>
            {auditReport?.dashboardReconciliations.accountantDashboardReconciled ? (
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md text-[10px] font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                Aligned (0.00)
              </span>
            ) : (
              <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded-md text-[10px] font-bold flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-rose-600" />
                Variance: {formatCurrency(auditReport?.dashboardReconciliations.accountantVariance || 0)}
              </span>
            )}
          </div>

          {/* Secretary Daily Summaries */}
          <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase text-slate-400 block">Secretary Portal</span>
              <span className="text-xs font-bold text-slate-800">Cash Collections vs Handover</span>
            </div>
            {auditReport?.dashboardReconciliations.secretaryDashboardReconciled ? (
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md text-[10px] font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                Reconciled
              </span>
            ) : (
              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md text-[10px] font-bold flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-amber-600" />
                Unreconciled Handover
              </span>
            )}
          </div>

          {/* CEO Executive Revenue */}
          <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase text-slate-400 block">CEO Executive Portal</span>
              <span className="text-xs font-bold text-slate-800">Executive Revenue vs Valid Payments</span>
            </div>
            {auditReport?.dashboardReconciliations.ceoDashboardReconciled ? (
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md text-[10px] font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                Aligned (0.00)
              </span>
            ) : (
              <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded-md text-[10px] font-bold flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-rose-600" />
                Variance: {formatCurrency(auditReport?.dashboardReconciliations.ceoVariance || 0)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Exception Filter & Search Toolbar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search student, admission #, ref..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none"
            >
              <option value="ALL">All Categories ({auditReport?.exceptions.length || 0})</option>
              <option value="DUPLICATE_RECEIPT">Duplicate Receipts</option>
              <option value="DUPLICATE_PAYMENT">Duplicate Payments</option>
              <option value="BALANCE_MISMATCH">Balance Mismatch</option>
              <option value="UNALLOCATED_PAYMENT">Unallocated Payments</option>
              <option value="UNEXPLAINED_CREDIT">Unexplained Credits</option>
              <option value="UNVERIFIED_EXTERNAL_EVIDENCE">Unverified External Evidence</option>
              <option value="TARIFF_DEVIATION">Tariff Deviation</option>
              <option value="PERIOD_INCONSISTENCY">Period Inconsistency</option>
              <option value="EXPENSE_VARIANCE">Expense Variance</option>
              <option value="PAYROLL_VARIANCE">Payroll Variance</option>
              <option value="DASHBOARD_VARIANCE">Dashboard Variance</option>
            </select>

            {/* Severity Filter */}
            <select
              value={severityFilter}
              onChange={e => setSeverityFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none"
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical Only</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none"
            >
              <option value="ALL">All Evidence Statuses</option>
              <option value="VERIFIED">Verified</option>
              <option value="NOT VERIFIED">NOT VERIFIED</option>
              <option value="SUSPECTED_DUPLICATE">Suspected Duplicate</option>
              <option value="MATHEMATICAL_ERROR">Mathematical Error</option>
            </select>
          </div>
        </div>

        {/* Count badge */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
          <span>
            Showing <strong className="text-slate-800 font-mono">{filteredExceptions.length}</strong> of{' '}
            <strong className="text-slate-800 font-mono">{auditReport?.exceptions.length || 0}</strong> exceptions
          </span>
          <span className="text-[11px] text-slate-400">
            Click any row to open the complete investigation dossier and counterfoil drill-down.
          </span>
        </div>
      </div>

      {/* Exception Records Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-900 text-white uppercase text-[10px] font-bold tracking-wider">
              <tr>
                <th className="p-3.5">Severity</th>
                <th className="p-3.5">Category</th>
                <th className="p-3.5">Student / Account</th>
                <th className="p-3.5">Campus / Period</th>
                <th className="p-3.5 text-right">Expected</th>
                <th className="p-3.5 text-right">Recorded</th>
                <th className="p-3.5 text-right">Variance</th>
                <th className="p-3.5 text-center">Evidence Status</th>
                <th className="p-3.5">Transaction References</th>
                <th className="p-3.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredExceptions.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-12 text-center text-slate-400">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-700">No Discrepancies Found in Selected Scope</p>
                    <p className="text-xs text-slate-400 mt-1">All charges, payments, and balances reconcile cleanly against transaction ledgers.</p>
                  </td>
                </tr>
              ) : (
                filteredExceptions.map(exc => {
                  const isPositive = exc.variance > 0;
                  const isNegative = exc.variance < 0;

                  return (
                    <tr 
                      key={exc.id} 
                      onClick={() => setSelectedException(exc)}
                      className="hover:bg-indigo-50/40 transition cursor-pointer"
                    >
                      {/* Severity */}
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          exc.severity === 'CRITICAL' ? 'bg-rose-100 text-rose-700 border border-rose-200' :
                          exc.severity === 'HIGH' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                          exc.severity === 'MEDIUM' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {exc.severity}
                        </span>
                      </td>

                      {/* Category */}
                      <td className="p-3.5 font-bold text-slate-800">
                        {exc.category.replace(/_/g, ' ')}
                      </td>

                      {/* Student / Account */}
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900">{exc.studentName || exc.studentRef || 'System / Batch'}</div>
                        {exc.admissionNo && (
                          <div className="text-[10px] text-slate-400 font-mono">{exc.admissionNo}</div>
                        )}
                      </td>

                      {/* Campus / Period */}
                      <td className="p-3.5 text-slate-600">
                        <div className="font-semibold text-slate-800">{exc.campus}</div>
                        <div className="text-[10px] text-slate-400">{exc.academicPeriod}</div>
                      </td>

                      {/* Expected */}
                      <td className="p-3.5 text-right font-mono text-slate-700">
                        {formatCurrency(exc.expectedAmount)}
                      </td>

                      {/* Recorded */}
                      <td className="p-3.5 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(exc.recordedAmount)}
                      </td>

                      {/* Variance */}
                      <td className="p-3.5 text-right font-mono font-black">
                        <span className={
                          isPositive ? 'text-rose-600' :
                          isNegative ? 'text-amber-600' :
                          'text-slate-400'
                        }>
                          {isPositive ? '+' : ''}{formatCurrency(exc.variance)}
                        </span>
                      </td>

                      {/* Evidence Status */}
                      <td className="p-3.5 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          exc.verificationStatus === 'NOT VERIFIED' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                          exc.verificationStatus === 'SUSPECTED_DUPLICATE' ? 'bg-rose-100 text-rose-800 border border-rose-300' :
                          exc.verificationStatus === 'MATHEMATICAL_ERROR' ? 'bg-purple-100 text-purple-800 border border-purple-300' :
                          'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        }`}>
                          {exc.verificationStatus}
                        </span>
                      </td>

                      {/* Transaction References */}
                      <td className="p-3.5">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {exc.transactionRefs.map((ref, idx) => (
                            <span 
                              key={idx} 
                              className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-mono border border-slate-200"
                            >
                              {ref}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Action */}
                      <td className="p-3.5 text-center">
                        <button
                          type="button"
                          className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition flex items-center gap-1 mx-auto cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Audit
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drill-down Investigation Modal */}
      {selectedException && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  selectedException.severity === 'CRITICAL' ? 'bg-rose-100 text-rose-600' :
                  selectedException.severity === 'HIGH' ? 'bg-amber-100 text-amber-600' :
                  'bg-indigo-100 text-indigo-600'
                }`}>
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      Exception #{selectedException.id}
                    </span>
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                      selectedException.verificationStatus === 'NOT VERIFIED' ? 'bg-amber-100 text-amber-800' :
                      'bg-rose-100 text-rose-800'
                    }`}>
                      {selectedException.verificationStatus}
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-slate-900 mt-1">
                    {selectedException.category.replace(/_/g, ' ')}
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedException(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Summary Detail Box */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-black text-slate-400 block">Account / Student</span>
                    <span className="font-bold text-slate-800">{selectedException.studentName || selectedException.studentRef || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-black text-slate-400 block">Admission Number</span>
                    <span className="font-mono text-slate-700">{selectedException.admissionNo || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-black text-slate-400 block">Campus</span>
                    <span className="font-bold text-slate-800">{selectedException.campus}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-black text-slate-400 block">Academic Period</span>
                    <span className="text-slate-700">{selectedException.academicPeriod}</span>
                  </div>
                </div>

                <div className="h-px bg-slate-200" />

                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-black text-slate-400 block">Expected Ledger Amount</span>
                    <span className="font-mono text-base font-bold text-slate-900">{formatCurrency(selectedException.expectedAmount)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-black text-slate-400 block">Recorded Amount</span>
                    <span className="font-mono text-base font-bold text-slate-900">{formatCurrency(selectedException.recordedAmount)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-black text-slate-400 block">Mathematical Variance</span>
                    <span className={`font-mono text-base font-black ${
                      selectedException.variance !== 0 ? 'text-rose-600' : 'text-slate-600'
                    }`}>
                      {selectedException.variance > 0 ? '+' : ''}{formatCurrency(selectedException.variance)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-1">
                  Discrepancy Description
                </h4>
                <p className="text-sm font-medium text-slate-800 bg-rose-50/60 border border-rose-100 p-3.5 rounded-xl">
                  {selectedException.description}
                </p>
              </div>

              {/* Transaction References */}
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-1.5">
                  Supporting Transaction References
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedException.transactionRefs.map((ref, idx) => (
                    <span 
                      key={idx}
                      className="px-2.5 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 font-mono text-xs rounded-lg font-bold"
                    >
                      Ref: {ref}
                    </span>
                  ))}
                </div>
              </div>

              {/* Recommended Bursary Investigation */}
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                <div className="flex items-center gap-2 mb-1.5 text-amber-900 font-black text-xs uppercase tracking-wider">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  Recommended Audit Action
                </div>
                <p className="text-xs text-amber-800 leading-relaxed">
                  {selectedException.recommendedInvestigation}
                </p>
              </div>

              {/* Safety & Non-destructive Assurance */}
              <div className="p-3.5 bg-slate-100 rounded-xl text-[11px] text-slate-500 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Audit Integrity Guarantee:</strong> This reconciliation tool is strictly read-only. No balances, payments, or records have been altered. Any required adjustments must follow the formal administrative ledger workflow.
                </span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-mono">
                Detected at: {new Date(selectedException.detectedAt).toLocaleString()}
              </span>
              <button
                type="button"
                onClick={() => setSelectedException(null)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

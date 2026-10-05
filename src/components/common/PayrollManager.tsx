import React, { useState, useEffect, useMemo } from 'react';
import { 
  DollarSign, Calculator, FileText, Plus, Search, Filter, 
  Printer, Download, CheckCircle2, AlertTriangle, ArrowUpRight, 
  ArrowDownRight, Users, CreditCard, Landmark, Settings, 
  Calendar, Clock, ShieldCheck, Sparkles, RefreshCw, ChevronRight, 
  Trash2, Edit3, Eye, Send, Check, X, Building, Award, HelpCircle,
  PieChart as LucidePieChart
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, 
  CartesianGrid, PieChart as RechartsPieChart, Pie, Cell, Legend 
} from 'recharts';
import { addMoney, subtractMoney } from '../../utils/financeUtils';
import { 
  StaffSalaryStructure, 
  PayrollRun, 
  StaffPayslipItem, 
  StaffLoanAdvance, 
  PayrollSettingsConfig,
  Teacher,
  NotificationItem
} from '../../types';
import { 
  getStoredPayrollSettings, 
  savePayrollSettings, 
  getStoredSalaryStructures, 
  saveSalaryStructure, 
  deleteSalaryStructure,
  getStoredPayrollRuns, 
  savePayrollRun, 
  deletePayrollRun, 
  getStoredStaffLoans, 
  saveStaffLoan, 
  generateMonthlyPayrollRun,
  syncTeachersToSalaryStructures,
  subscribePayrollRuns,
  subscribeSalaryStructures,
  subscribeStaffLoans
} from '../../services/payrollService';
import JIPASLogo from './JIPASLogo';

interface PayrollManagerProps {
  teachers?: Teacher[];
  userRole?: 'admin' | 'accountant' | 'Admin' | 'Accountant';
  currentUserRole?: string;
  userName?: string;
  initialSubTab?: 'dashboard' | 'run' | 'structures' | 'payslips' | 'loans' | 'bank-advice' | 'settings';
  onNavigate?: (module: string) => void;
  onAddNotification?: (notif: NotificationItem) => void;
}

export default function PayrollManager({
  teachers = [],
  userRole = 'accountant',
  currentUserRole,
  userName = 'Grace Tetteh (Bursar)',
  initialSubTab = 'dashboard',
  onNavigate,
  onAddNotification
}: PayrollManagerProps) {
  // Navigation subtabs
  const [activeTab, setActiveTab] = useState<'dashboard' | 'run' | 'structures' | 'payslips' | 'loans' | 'bank-advice' | 'settings'>(initialSubTab);

  // Core Data States
  const [payrollSettings, setPayrollSettings] = useState<PayrollSettingsConfig>(() => getStoredPayrollSettings());
  const [salaryStructures, setSalaryStructures] = useState<StaffSalaryStructure[]>(() => {
    const existing = getStoredSalaryStructures();
    return syncTeachersToSalaryStructures(teachers, existing);
  });
  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>(() => getStoredPayrollRuns());
  const [staffLoans, setStaffLoans] = useState<StaffLoanAdvance[]>(() => getStoredStaffLoans());

  // Realtime Subscriptions
  useEffect(() => {
    const unsubRuns = subscribePayrollRuns((runs) => setPayrollRuns(runs));
    const unsubStructs = subscribeSalaryStructures((structs) => {
      setSalaryStructures(syncTeachersToSalaryStructures(teachers, structs));
    });
    const unsubLoans = subscribeStaffLoans((loans) => setStaffLoans(loans));

    return () => {
      unsubRuns();
      unsubStructs();
      unsubLoans();
    };
  }, [teachers]);

  // Active Selected Batch
  const [selectedRunId, setSelectedRunId] = useState<string>(() => payrollRuns[0]?.id || '');
  const activePayrollRun = useMemo(() => {
    return payrollRuns.find(r => r.id === selectedRunId) || payrollRuns[0] || null;
  }, [payrollRuns, selectedRunId]);

  // Selected Payslip for HD Modal / Printing
  const [activePayslip, setActivePayslip] = useState<StaffPayslipItem | null>(null);
  const [isBatchPrintMode, setIsBatchPrintMode] = useState<boolean>(false);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDept, setFilterDept] = useState('All');
  const [filterType, setFilterType] = useState('All');

  // Modals
  const [showNewRunModal, setShowNewRunModal] = useState(false);
  const [newRunMonth, setNewRunMonth] = useState('October 2026');
  const [newRunAcademicYear, setNewRunAcademicYear] = useState('2025/2026');
  const [newRunTerm, setNewRunTerm] = useState('Third Term');

  const [showStructureModal, setShowStructureModal] = useState(false);
  const [editingStructure, setEditingStructure] = useState<StaffSalaryStructure | null>(null);

  const [showLoanModal, setShowLoanModal] = useState(false);
  const [editingLoan, setEditingLoan] = useState<StaffLoanAdvance | null>(null);

  const [showEditPayslipModal, setShowEditPayslipModal] = useState(false);
  const [editingPayslip, setEditingPayslip] = useState<StaffPayslipItem | null>(null);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // -------------------------------------------------------------
  // Calculations & Analytics Data
  // -------------------------------------------------------------
  const analytics = useMemo(() => {
    const latestRun = activePayrollRun;
    const totalMonthlyGross = latestRun ? latestRun.totalGrossPay || 0 : 0;
    const totalNetPayout = latestRun ? latestRun.totalNetPayout || 0 : 0;
    const totalPensionCombined = latestRun ? addMoney(latestRun.totalPensionEmployee || 0, latestRun.totalPensionEmployer || 0) : 0;
    const totalPAYETax = latestRun ? latestRun.totalPAYETax || 0 : 0;
    const totalAllowances = latestRun ? latestRun.totalAllowances || 0 : 0;
    const activeStaffCount = salaryStructures.filter(s => s.isActive).length;
    const avgSalary = activeStaffCount > 0 ? (totalMonthlyGross / activeStaffCount) : 0;

    // Department breakdown
    const deptMap: Record<string, { gross: number; net: number; count: number }> = {};
    if (latestRun && latestRun.payslips) {
      latestRun.payslips.forEach(ps => {
        const d = ps.department || 'Other';
        if (!deptMap[d]) {
          deptMap[d] = { gross: 0, net: 0, count: 0 };
        }
        deptMap[d].gross = addMoney(deptMap[d].gross, ps.grossEarnings || 0);
        deptMap[d].net = addMoney(deptMap[d].net, ps.netSalary || 0);
        deptMap[d].count += 1;
      });
    }

    const deptChartData = Object.keys(deptMap).map(k => ({
      name: k.length > 15 ? k.substring(0, 15) + '...' : k,
      gross: Math.round(deptMap[k].gross),
      net: Math.round(deptMap[k].net),
      count: deptMap[k].count
    }));

    const salaryDistributionPie = [
      { name: 'Net Take-Home Pay', value: totalNetPayout, color: '#10b981' },
      { name: 'Pension & Tier 2', value: totalPensionCombined, color: '#3b82f6' },
      { name: 'PAYE Income Tax', value: totalPAYETax, color: '#f59e0b' },
      { name: 'Welfare & Loans', value: latestRun ? (latestRun.totalWelfare + latestRun.totalLoanDeductions) : 0, color: '#ec4899' }
    ].filter(item => item.value > 0);

    return {
      totalMonthlyGross,
      totalNetPayout,
      totalPensionCombined,
      totalPAYETax,
      totalAllowances,
      activeStaffCount,
      avgSalary,
      deptChartData,
      salaryDistributionPie
    };
  }, [activePayrollRun, salaryStructures]);

  // -------------------------------------------------------------
  // Batch Operations
  // -------------------------------------------------------------
  const handleCreatePayrollRun = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRunMonth.trim()) return;

    // Check if run already exists for this month
    const existing = payrollRuns.find(r => r.month.toLowerCase() === newRunMonth.toLowerCase());
    if (existing) {
      triggerToast(`A payroll batch for ${newRunMonth} already exists.`);
      return;
    }

    const newRun = generateMonthlyPayrollRun(
      newRunMonth,
      newRunAcademicYear,
      newRunTerm,
      userName,
      salaryStructures,
      staffLoans,
      payrollSettings
    );

    await savePayrollRun(newRun);
    setSelectedRunId(newRun.id);
    setShowNewRunModal(false);
    triggerToast(`Successfully compiled ${newRunMonth} payroll schedule for ${newRun.totalStaff} staff members.`);
  };

  const handleApproveBatch = async (run: PayrollRun) => {
    const updated: PayrollRun = {
      ...run,
      status: 'Approved',
      approvedAt: new Date().toISOString().split('T')[0],
      approvedBy: userName,
      payslips: run.payslips.map(ps => ({ ...ps, status: 'Approved' }))
    };
    await savePayrollRun(updated);
    triggerToast(`Batch ${run.batchNumber} has been officially approved.`);
  };

  const handleDisburseBatch = async (run: PayrollRun) => {
    const updated: PayrollRun = {
      ...run,
      status: 'Disbursed',
      disbursedAt: new Date().toISOString().split('T')[0],
      disbursedBy: userName,
      payslips: run.payslips.map(ps => ({ 
        ...ps, 
        status: 'Paid', 
        paidAt: new Date().toISOString().split('T')[0],
        paidBy: userName 
      }))
    };

    // Also update staff loan balances
    const updatedLoans = staffLoans.map(l => {
      const matchDeduction = run.payslips.find(ps => ps.staffId === l.staffId && ps.deductions.loanRepayment > 0);
      if (matchDeduction && l.status === 'Active') {
        const deduct = matchDeduction.deductions.loanRepayment;
        const newRepaid = l.amountRepaid + deduct;
        const newBal = Math.max(0, l.principalAmount - newRepaid);
        const newMonthsRemaining = Math.max(0, l.monthsRemaining - 1);
        return {
          ...l,
          amountRepaid: newRepaid,
          remainingBalance: newBal,
          monthsRemaining: newMonthsRemaining,
          status: newBal === 0 ? ('Paid Off' as const) : ('Active' as const)
        };
      }
      return l;
    });

    for (const l of updatedLoans) {
      await saveStaffLoan(l);
    }

    await savePayrollRun(updated);
    triggerToast(`Batch ${run.batchNumber} marked as disbursed! Loan repayments deducted.`);
  };

  const handleDeleteRun = async (runId: string) => {
    const runToDelete = payrollRuns.find(r => r.id === runId);
    if (!runToDelete) return;

    if ((runToDelete.status === 'Approved' || runToDelete.status === 'Disbursed') && userRole !== 'admin') {
      alert(`Security Policy: Batch ${runToDelete.batchNumber} has already been ${runToDelete.status.toLowerCase()} and cannot be deleted by non-administrators.`);
      return;
    }

    if (window.confirm(`Are you sure you want to delete payroll batch ${runToDelete.batchNumber}? This action is logged.`)) {
      await deletePayrollRun(runId);
      const remaining = payrollRuns.filter(r => r.id !== runId);
      if (remaining.length > 0) {
        setSelectedRunId(remaining[0].id);
      }
      triggerToast(`Payroll batch ${runToDelete.batchNumber} deleted successfully.`);
    }
  };

  // -------------------------------------------------------------
  // Salary Structure Form Save
  // -------------------------------------------------------------
  const handleSaveSalaryStructure = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStructure) return;

    await saveSalaryStructure(editingStructure);
    setShowStructureModal(false);
    setEditingStructure(null);
    triggerToast(`Salary structure for ${editingStructure.staffName} updated.`);
  };

  // -------------------------------------------------------------
  // Staff Loan Save
  // -------------------------------------------------------------
  const handleSaveLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLoan) return;

    await saveStaffLoan(editingLoan);
    setShowLoanModal(false);
    setEditingLoan(null);
    triggerToast(`Staff loan record for ${editingLoan.staffName} saved.`);
  };

  // -------------------------------------------------------------
  // Individual Payslip Update
  // -------------------------------------------------------------
  const handleSavePayslip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPayslip || !activePayrollRun) return;

    const updatedPayslips = activePayrollRun.payslips.map(ps => 
      ps.id === editingPayslip.id ? editingPayslip : ps
    );

    // Recalculate totals
    const totalBasicSalary = addMoney(...updatedPayslips.map(p => p.basicSalary || 0));
    const totalAllowances = addMoney(...updatedPayslips.map(p => p.totalAllowances || 0));
    const totalGrossPay = addMoney(...updatedPayslips.map(p => p.grossEarnings || 0));
    const totalPensionEmployee = addMoney(...updatedPayslips.map(p => p.deductions?.pensionEmployee || 0));
    const totalPensionEmployer = addMoney(...updatedPayslips.map(p => p.employerContribution?.pensionEmployer || 0));
    const totalPAYETax = addMoney(...updatedPayslips.map(p => p.deductions?.payeTax || 0));
    const totalWelfare = addMoney(...updatedPayslips.map(p => p.deductions?.welfareFund || 0));
    const totalLoanDeductions = addMoney(...updatedPayslips.map(p => p.deductions?.loanRepayment || 0));
    const totalDeductions = addMoney(...updatedPayslips.map(p => p.totalDeductions || 0));
    const totalNetPayout = addMoney(...updatedPayslips.map(p => p.netSalary || 0));

    const updatedRun: PayrollRun = {
      ...activePayrollRun,
      totalBasicSalary,
      totalAllowances,
      totalGrossPay,
      totalPensionEmployee,
      totalPensionEmployer,
      totalPAYETax,
      totalWelfare,
      totalLoanDeductions,
      totalDeductions,
      totalNetPayout,
      payslips: updatedPayslips
    };

    await savePayrollRun(updatedRun);
    setShowEditPayslipModal(false);
    setEditingPayslip(null);
    triggerToast(`Payslip adjustments for ${editingPayslip.staffName} saved.`);
  };

  // Filtered Structures
  const filteredStructures = useMemo(() => {
    return salaryStructures.filter(s => {
      const matchQuery = s.staffName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.designation.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.bankName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchDept = filterDept === 'All' || s.department === filterDept;
      const matchType = filterType === 'All' || s.staffType === filterType;
      return matchQuery && matchDept && matchType;
    });
  }, [salaryStructures, searchQuery, filterDept, filterType]);

  // Unique departments
  const departmentsList = useMemo(() => {
    const set = new Set(salaryStructures.map(s => s.department));
    return ['All', ...Array.from(set)];
  }, [salaryStructures]);

  return (
    <div className="space-y-6 animate-fade-in text-slate-800">
      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-slide-up text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-[#0d1b3e] via-[#122b62] to-[#1e3a8a] text-white p-6 rounded-3xl shadow-xl border border-blue-900/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="space-y-2 z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-400/30 shadow-inner">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-black tracking-tight text-white">
                  Institutional Payroll & Compensation System
                </h2>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-400/30 uppercase tracking-wider">
                  Automated PAYE & Pension
                </span>
              </div>
              <p className="text-xs text-blue-200 mt-0.5">
                Comprehensive staff remuneration engine, monthly batch scheduler, progressive statutory tax deductions & HD payslip generator.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5 z-10">
          <button
            onClick={() => setShowNewRunModal(true)}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-700/30 transition-all cursor-pointer hover:scale-[1.02] active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Run Monthly Payroll</span>
          </button>

          <button
            onClick={() => {
              const struct: StaffSalaryStructure = {
                id: `sal-${Date.now()}`,
                staffId: `staff-${Date.now()}`,
                staffName: '',
                staffType: 'Teaching',
                designation: 'Instructor / Teacher',
                department: 'Senior High School',
                bankName: 'GCB Bank PLC',
                accountNumber: '',
                accountName: '',
                pensionNumber: '',
                tinNumber: '',
                basicSalary: 2500,
                allowances: {
                  responsibility: 0,
                  transport: 150,
                  housing: 200,
                  utilityHardship: 80,
                  overtime: 0,
                  bonus: 0,
                  other: 0
                },
                paymentMethod: 'Bank Transfer',
                isActive: true
              };
              setEditingStructure(struct);
              setShowStructureModal(true);
            }}
            className="flex items-center gap-2 bg-blue-700/60 hover:bg-blue-600 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl border border-blue-400/30 transition-all cursor-pointer"
          >
            <Users className="w-4 h-4" />
            <span>Add Staff Salary</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs Bar */}
      <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-1.5 overflow-x-auto custom-scrollbar text-xs font-bold">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all cursor-pointer shrink-0 ${
            activeTab === 'dashboard'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Payroll Dashboard & KPIs</span>
        </button>

        <button
          onClick={() => setActiveTab('run')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all cursor-pointer shrink-0 ${
            activeTab === 'run'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Monthly Payroll Run ({payrollRuns.length})</span>
          {activePayrollRun && activePayrollRun.status === 'Draft' && (
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('structures')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all cursor-pointer shrink-0 ${
            activeTab === 'structures'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Staff Remuneration Tiers ({salaryStructures.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('payslips')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all cursor-pointer shrink-0 ${
            activeTab === 'payslips'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Official HD Payslips</span>
        </button>

        <button
          onClick={() => setActiveTab('loans')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all cursor-pointer shrink-0 ${
            activeTab === 'loans'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Staff Loans & Advances ({staffLoans.filter(l => l.status === 'Active').length})</span>
        </button>

        <button
          onClick={() => setActiveTab('bank-advice')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all cursor-pointer shrink-0 ${
            activeTab === 'bank-advice'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Landmark className="w-4 h-4" />
          <span>Bank Advice & MoMo List</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all cursor-pointer shrink-0 ${
            activeTab === 'settings'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Tax & Pension Rates</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 1. DASHBOARD & ANALYTICS TAB */}
      {/* ========================================================================= */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Top 4 KPI Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Monthly Gross</span>
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                  {analytics.totalMonthlyGross.toLocaleString('en-US', { minimumFractionDigits: 2 })} {payrollSettings.currencySymbol}
                </div>
                <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5 font-medium">
                  <span className="text-blue-600 font-bold">{activePayrollRun?.month || 'Current Month'}</span>
                  <span>• {analytics.activeStaffCount} active staff</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Net Take-Home</span>
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <Award className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-emerald-600 font-mono tracking-tight">
                  {analytics.totalNetPayout.toLocaleString('en-US', { minimumFractionDigits: 2 })} {payrollSettings.currencySymbol}
                </div>
                <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5 font-medium">
                  <span className="text-emerald-700 font-bold">Net Salary Outflow</span>
                  <span>({Math.round((analytics.totalNetPayout / (analytics.totalMonthlyGross || 1)) * 100)}% of gross)</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Statutory Deductions</span>
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-amber-600 font-mono tracking-tight">
                  {(analytics.totalPensionCombined + analytics.totalPAYETax).toLocaleString('en-US', { minimumFractionDigits: 2 })} {payrollSettings.currencySymbol}
                </div>
                <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5 font-medium">
                  <span>Pension: <strong>{(analytics.totalPensionCombined ?? 0).toFixed(0)}</strong></span>
                  <span>•</span>
                  <span>PAYE: <strong>{(analytics.totalPAYETax ?? 0).toFixed(0)}</strong></span>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Staff Allowances</span>
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                  <CreditCard className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-purple-600 font-mono tracking-tight">
                  {analytics.totalAllowances.toLocaleString('en-US', { minimumFractionDigits: 2 })} {payrollSettings.currencySymbol}
                </div>
                <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5 font-medium">
                  <span>Transport, Housing & Resp.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Department Breakdown Bar Chart */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                    <BarChart className="w-4 h-4 text-blue-600" />
                    Salary Outflow by Faculty & Department
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">Gross vs Net distribution for active departments</p>
                </div>
                <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                  {activePayrollRun?.month || 'Current Run'}
                </span>
              </div>

              <div className="h-64 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.deptChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', border: 'none', fontSize: '12px' }}
                      formatter={(val: any) => [`${Number(val).toLocaleString()} ${payrollSettings.currencySymbol}`, '']}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    <Bar dataKey="gross" name="Gross Remuneration" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="net" name="Net Disbursed" fill="#10b981" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Payroll Distribution Pie Chart */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
              <div>
                <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                  <LucidePieChart className="w-4 h-4 text-emerald-600" />
                  Monthly Outflow Allocation
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Net take-home vs taxes and statutory funds</p>
              </div>

              <div className="h-48 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={analytics.salaryDistributionPie}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {analytics.salaryDistributionPie.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', border: 'none', fontSize: '12px' }}
                      formatter={(val: any) => [`${Number(val).toLocaleString()} ${payrollSettings.currencySymbol}`, '']}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs">
                {analytics.salaryDistributionPie.map(item => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-slate-600 font-medium">{item.name}</span>
                    </div>
                    <span className="font-mono font-bold text-slate-900">
                      {item.value.toLocaleString('en-US', { minimumFractionDigits: 0 })} {payrollSettings.currencySymbol}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Jump Modules Bento */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div 
              onClick={() => setActiveTab('run')}
              className="bg-gradient-to-br from-blue-50 to-indigo-50/50 p-5 rounded-2xl border border-blue-100 hover:border-blue-400 transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md">
                  <Calendar className="w-5 h-5" />
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
              </div>
              <div className="mt-4">
                <h4 className="font-black text-slate-900 text-sm">Monthly Batch Engine</h4>
                <p className="text-xs text-slate-500 mt-1">Review active batch, execute approvals & disburse salaries.</p>
              </div>
            </div>

            <div 
              onClick={() => setActiveTab('payslips')}
              className="bg-gradient-to-br from-emerald-50 to-teal-50/50 p-5 rounded-2xl border border-emerald-100 hover:border-emerald-400 transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
                  <FileText className="w-5 h-5" />
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
              </div>
              <div className="mt-4">
                <h4 className="font-black text-slate-900 text-sm">Official HD Payslips</h4>
                <p className="text-xs text-slate-500 mt-1">Generate, view, print & PDF export individual staff payslips.</p>
              </div>
            </div>

            <div 
              onClick={() => setActiveTab('bank-advice')}
              className="bg-gradient-to-br from-amber-50 to-orange-50/50 p-5 rounded-2xl border border-amber-100 hover:border-amber-400 transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-md">
                  <Landmark className="w-5 h-5" />
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 group-hover:translate-x-1 transition-all" />
              </div>
              <div className="mt-4">
                <h4 className="font-black text-slate-900 text-sm">Bank Schedule & MoMo Advice</h4>
                <p className="text-xs text-slate-500 mt-1">Export bank upload tables, account rosters & mobile payments.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. MONTHLY PAYROLL RUN & BATCH PROCESSING TAB */}
      {/* ========================================================================= */}
      {activeTab === 'run' && (
        <div className="space-y-6">
          {/* Active Batch Selector & Action Toolbar */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-xs font-bold text-slate-600">Select Payroll Month:</label>
              <select
                value={selectedRunId}
                onChange={(e) => setSelectedRunId(e.target.value)}
                className="px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                {payrollRuns.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.month} ({r.batchNumber}) - {r.status}
                  </option>
                ))}
              </select>

              {activePayrollRun && (
                <span className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold uppercase tracking-wide ${
                  activePayrollRun.status === 'Disbursed'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : activePayrollRun.status === 'Approved'
                    ? 'bg-blue-100 text-blue-800 border border-blue-300'
                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}>
                  {activePayrollRun.status}
                </span>
              )}
            </div>

            {/* Batch Level Actions */}
            {activePayrollRun && (
              <div className="flex flex-wrap items-center gap-2">
                {activePayrollRun.status === 'Draft' && (
                  <button
                    onClick={() => handleApproveBatch(activePayrollRun)}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Approve Batch</span>
                  </button>
                )}

                {activePayrollRun.status === 'Approved' && (
                  <button
                    onClick={() => handleDisburseBatch(activePayrollRun)}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Award className="w-4 h-4" />
                    <span>Disburse Salaries (Mark All Paid)</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setIsBatchPrintMode(true);
                    setTimeout(() => window.print(), 300);
                  }}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Master Broadsheet</span>
                </button>

                <button
                  onClick={() => handleDeleteRun(activePayrollRun.id)}
                  title="Delete this batch"
                  className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Active Batch Summary Banner */}
          {activePayrollRun ? (
            <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-4">
                <div>
                  <div className="text-base font-black text-white flex items-center gap-2">
                    <span>{activePayrollRun.month} Master Compensation Schedule</span>
                    <span className="text-xs font-mono text-slate-400">({activePayrollRun.batchNumber})</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Compiled by {activePayrollRun.createdBy} • Academic Year: {activePayrollRun.academicYear} • {activePayrollRun.term}
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-xs text-slate-400 uppercase font-semibold">Total Net Payable</span>
                  <div className="text-2xl font-black text-emerald-400 font-mono">
                    {activePayrollRun.totalNetPayout.toLocaleString('en-US', { minimumFractionDigits: 2 })} {payrollSettings.currencySymbol}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
                <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/60">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Staff</span>
                  <span className="text-white font-mono font-bold text-sm mt-0.5 block">{activePayrollRun.totalStaff} Faculty</span>
                </div>
                <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/60">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Basic Salaries</span>
                  <span className="text-white font-mono font-bold text-sm mt-0.5 block">{activePayrollRun.totalBasicSalary.toLocaleString()}</span>
                </div>
                <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/60">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Allowances</span>
                  <span className="text-purple-300 font-mono font-bold text-sm mt-0.5 block">+{activePayrollRun.totalAllowances.toLocaleString()}</span>
                </div>
                <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/60">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Pension (Employee)</span>
                  <span className="text-rose-300 font-mono font-bold text-sm mt-0.5 block">-{(activePayrollRun.totalPensionEmployee ?? 0).toFixed(0)}</span>
                </div>
                <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/60">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">PAYE Tax</span>
                  <span className="text-rose-300 font-mono font-bold text-sm mt-0.5 block">-{(activePayrollRun.totalPAYETax ?? 0).toFixed(0)}</span>
                </div>
                <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/60">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Deductions</span>
                  <span className="text-amber-400 font-mono font-bold text-sm mt-0.5 block">-{activePayrollRun.totalDeductions.toLocaleString()}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 space-y-3">
              <Calculator className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="font-bold text-slate-700">No Payroll Batch Selected</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">Create a new payroll run using the button above to compile monthly staff salaries.</p>
            </div>
          )}

          {/* Payslips Table for Active Batch */}
          {activePayrollRun && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-5">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  Staff Remuneration Roster ({activePayrollRun.payslips.length} Employees)
                </h3>
                
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Filter staff name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="px-3 py-1.5 border border-slate-300 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-y border-slate-200 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-3">Voucher No</th>
                      <th className="py-3 px-3">Staff Name & Designation</th>
                      <th className="py-3 px-3">Department</th>
                      <th className="py-3 px-3 text-right">Basic ({payrollSettings.currencySymbol})</th>
                      <th className="py-3 px-3 text-right">Allowances</th>
                      <th className="py-3 px-3 text-right">Gross Pay</th>
                      <th className="py-3 px-3 text-right">Pension (5.5%)</th>
                      <th className="py-3 px-3 text-right">PAYE Tax</th>
                      <th className="py-3 px-3 text-right">Loans/Welfare</th>
                      <th className="py-3 px-3 text-right font-black text-emerald-700">Net Pay</th>
                      <th className="py-3 px-3 text-center">Status</th>
                      <th className="py-3 px-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activePayrollRun.payslips
                      .filter(ps => ps.staffName.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map(ps => (
                        <tr key={ps.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3 font-mono text-slate-500 font-bold text-[11px] whitespace-nowrap">
                            {ps.voucherNo}
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-bold text-slate-900">{ps.staffName}</div>
                            <div className="text-[10px] text-slate-500">{ps.designation}</div>
                          </td>
                          <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold">
                              {ps.department}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-medium">
                            {ps.basicSalary.toLocaleString()}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-purple-600 font-medium">
                            +{ps.totalAllowances.toLocaleString()}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                            {ps.grossEarnings.toLocaleString()}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-slate-600">
                            -{(ps.deductions.pensionEmployee ?? 0).toFixed(2)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-slate-600">
                            -{(ps.deductions.payeTax ?? 0).toFixed(2)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-amber-700">
                            -{((ps.deductions.loanRepayment ?? 0) + (ps.deductions.welfareFund ?? 0)).toFixed(2)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-black text-emerald-600 text-sm whitespace-nowrap">
                            {ps.netSalary.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              ps.status === 'Paid'
                                ? 'bg-emerald-100 text-emerald-800'
                                : ps.status === 'Approved'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {ps.status}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => setActivePayslip(ps)}
                                title="View & Print Official Payslip"
                                className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  setEditingPayslip(ps);
                                  setShowEditPayslipModal(true);
                                }}
                                title="Adjust Allowances & Penalties"
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. STAFF REMUNERATION TIERS & MASTER DIRECTORY TAB */}
      {/* ========================================================================= */}
      {activeTab === 'structures' && (
        <div className="space-y-6">
          {/* Filter Toolbar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search staff, designation or bank..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <select
                value={filterDept}
                onChange={(e) => setFilterDept(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-xl bg-white font-bold"
              >
                {departmentsList.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>

              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-xl bg-white font-bold"
              >
                <option value="All">All Staff Types</option>
                <option value="Teaching">Teaching Faculty</option>
                <option value="Administrative">Administrative</option>
                <option value="Support">Support Staff</option>
              </select>
            </div>

            <button
              onClick={() => {
                const refreshed = syncTeachersToSalaryStructures(teachers, salaryStructures);
                setSalaryStructures(refreshed);
                triggerToast('Faculty roster synchronized with salary structures.');
              }}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Sync from Faculty Directory</span>
            </button>
          </div>

          {/* Salary Structures Cards / Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStructures.map(s => {
              const totalAllow = 
                (s.allowances.responsibility || 0) +
                (s.allowances.transport || 0) +
                (s.allowances.housing || 0) +
                (s.allowances.utilityHardship || 0) +
                (s.allowances.overtime || 0) +
                (s.allowances.bonus || 0) +
                (s.allowances.other || 0);
              const estGross = s.basicSalary + totalAllow;

              return (
                <div key={s.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4 hover:border-blue-400 transition-all">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-extrabold text-sm text-slate-900">{s.staffName}</h4>
                        <p className="text-xs text-blue-600 font-semibold">{s.designation}</p>
                        <span className="inline-block text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded mt-1">
                          {s.department} • {s.staffType}
                        </span>
                      </div>
                      <span className={`w-2.5 h-2.5 rounded-full ${s.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`} title={s.isActive ? 'Active Staff' : 'Inactive'} />
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Basic Monthly:</span>
                        <strong className="font-mono text-slate-900">{s.basicSalary.toLocaleString()} {payrollSettings.currencySymbol}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Total Allowances:</span>
                        <strong className="font-mono text-purple-600">+{totalAllow.toLocaleString()} {payrollSettings.currencySymbol}</strong>
                      </div>
                      <div className="flex justify-between border-t border-slate-200 pt-1 font-bold">
                        <span className="text-slate-700">Estimated Gross:</span>
                        <strong className="font-mono text-emerald-600">{estGross.toLocaleString()} {payrollSettings.currencySymbol}</strong>
                      </div>
                    </div>

                    <div className="space-y-1 text-[11px] text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <Landmark className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{s.bankName} • Acc: <strong className="font-mono">{s.accountNumber || 'N/A'}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Pension: <strong className="font-mono">{s.pensionNumber || 'N/A'}</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-xs font-bold">
                    <button
                      onClick={() => {
                        setEditingStructure(s);
                        setShowStructureModal(true);
                      }}
                      className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit Structure</span>
                    </button>

                    <button
                      onClick={async () => {
                        if (window.confirm(`Delete salary structure for ${s.staffName}?`)) {
                          await deleteSalaryStructure(s.id);
                          triggerToast('Salary structure removed.');
                        }
                      }}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. OFFICIAL HD PAYSLIPS TAB */}
      {/* ========================================================================= */}
      {activeTab === 'payslips' && (
        <div className="space-y-6">
          {/* Selector & Actions */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600" />
                Select Staff Payslip to Preview & Export
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Official encrypted institutional compensation slip with full itemized earnings and tax breakdown
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setIsBatchPrintMode(true);
                  setTimeout(() => window.print(), 300);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-2 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Batch Print All Month Payslips</span>
              </button>
            </div>
          </div>

          {/* Payslips Selector Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {activePayrollRun?.payslips.map(ps => (
              <div 
                key={ps.id}
                onClick={() => setActivePayslip(ps)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                  activePayslip?.id === ps.id
                    ? 'bg-blue-50/80 border-blue-500 ring-2 ring-blue-500/20 shadow-md'
                    : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-sm'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-slate-400">{ps.voucherNo}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                      ps.status === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {ps.status}
                    </span>
                  </div>
                  <h4 className="font-extrabold text-xs text-slate-900 leading-snug">{ps.staffName}</h4>
                  <p className="text-[11px] text-slate-500">{ps.designation}</p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">Net Take-Home:</span>
                  <strong className="font-mono text-emerald-600 text-xs">
                    {ps.netSalary.toLocaleString('en-US', { minimumFractionDigits: 2 })} {payrollSettings.currencySymbol}
                  </strong>
                </div>
              </div>
            ))}
          </div>

          {/* Active Payslip HD View Preview */}
          {activePayslip && (
            <div className="bg-white p-8 rounded-3xl border-2 border-slate-200 shadow-xl space-y-6 max-w-3xl mx-auto print:shadow-none print:border-none print:p-0">
              {/* Institutional Header */}
              <div className="flex items-start justify-between border-b-2 border-slate-900 pb-5">
                <div className="flex items-center gap-3">
                  <JIPASLogo size="md" />
                  <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase">JIPAS ACADEMY</h2>
                    <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Official Staff Compensation & Tax Deduction Advice</p>
                    <p className="text-[10px] text-slate-500">01 BP. 2364 • Kpéhénou N°1 Behind T-Oil Filling Station, and Hedzranawoe 4th Corner after Radio Maria, Lomé — Togo • Tel: (00228) 22 60 21 38 / 99 47 38 23 / 90 83 60 48 • joyjipas2002@gmail.com</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-mono font-bold text-slate-500">VOUCHER NO</div>
                  <div className="text-sm font-mono font-black text-slate-900">{activePayslip.voucherNo}</div>
                  <div className="text-[10px] text-emerald-700 font-bold mt-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block">
                    PAY PERIOD: {activePayslip.month.toUpperCase()}
                  </div>
                </div>
              </div>

              {/* Staff Bio Meta Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Employee Name</span>
                  <strong className="text-slate-900 block">{activePayslip.staffName}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Designation</span>
                  <span className="text-slate-700 block font-semibold">{activePayslip.designation}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Department</span>
                  <span className="text-slate-700 block font-semibold">{activePayslip.department}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Payment Method</span>
                  <span className="text-blue-700 font-bold block">{activePayslip.paymentMethod}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Bank & Account</span>
                  <span className="font-mono text-slate-800 block">{activePayslip.bankName} - {activePayslip.accountNumber || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Pension Number</span>
                  <span className="font-mono text-slate-800 block">{activePayslip.pensionNumber || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">TIN Number</span>
                  <span className="font-mono text-slate-800 block">{activePayslip.tinNumber || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Pay Date</span>
                  <span className="font-mono text-slate-800 block">{activePayslip.paymentDate}</span>
                </div>
              </div>

              {/* Earnings & Deductions Double Column Table */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
                {/* Earnings Side */}
                <div className="space-y-2">
                  <div className="bg-blue-900 text-white font-black px-3.5 py-2 rounded-xl text-xs uppercase tracking-wider flex justify-between">
                    <span>EARNINGS & ALLOWANCES</span>
                    <span>AMOUNT ({payrollSettings.currencySymbol})</span>
                  </div>
                  <div className="divide-y divide-slate-100 bg-slate-50/50 rounded-xl p-3 border border-slate-200 space-y-1.5">
                    <div className="flex justify-between py-1 font-semibold text-slate-800">
                      <span>Basic Monthly Salary:</span>
                      <span className="font-mono font-bold">{activePayslip.basicSalary.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                    {activePayslip.allowances.responsibility > 0 && (
                      <div className="flex justify-between py-1 text-slate-600">
                        <span>Responsibility Allowance:</span>
                        <span className="font-mono">+{(activePayslip.allowances.responsibility ?? 0).toFixed(2)}</span>
                      </div>
                    )}
                    {activePayslip.allowances.transport > 0 && (
                      <div className="flex justify-between py-1 text-slate-600">
                        <span>Transport Allowance:</span>
                        <span className="font-mono">+{(activePayslip.allowances.transport ?? 0).toFixed(2)}</span>
                      </div>
                    )}
                    {activePayslip.allowances.housing > 0 && (
                      <div className="flex justify-between py-1 text-slate-600">
                        <span>Housing / Rent Allowance:</span>
                        <span className="font-mono">+{(activePayslip.allowances.housing ?? 0).toFixed(2)}</span>
                      </div>
                    )}
                    {activePayslip.allowances.utilityHardship > 0 && (
                      <div className="flex justify-between py-1 text-slate-600">
                        <span>Utility & Hardship:</span>
                        <span className="font-mono">+{(activePayslip.allowances.utilityHardship ?? 0).toFixed(2)}</span>
                      </div>
                    )}
                    {activePayslip.allowances.overtime > 0 && (
                      <div className="flex justify-between py-1 text-slate-600">
                        <span>Extra Teaching / Overtime:</span>
                        <span className="font-mono">+{(activePayslip.allowances.overtime ?? 0).toFixed(2)}</span>
                      </div>
                    )}
                    {activePayslip.allowances.bonus > 0 && (
                      <div className="flex justify-between py-1 text-slate-600">
                        <span>Special Performance Bonus:</span>
                        <span className="font-mono">+{(activePayslip.allowances.bonus ?? 0).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 font-black text-slate-900 border-t-2 border-slate-300">
                      <span>TOTAL GROSS EARNINGS:</span>
                      <span className="font-mono text-blue-700">{activePayslip.grossEarnings.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>

                {/* Deductions Side */}
                <div className="space-y-2">
                  <div className="bg-rose-900 text-white font-black px-3.5 py-2 rounded-xl text-xs uppercase tracking-wider flex justify-between">
                    <span>STATUTORY DEDUCTIONS</span>
                    <span>AMOUNT ({payrollSettings.currencySymbol})</span>
                  </div>
                  <div className="divide-y divide-slate-100 bg-slate-50/50 rounded-xl p-3 border border-slate-200 space-y-1.5">
                    <div className="flex justify-between py-1 text-slate-700 font-semibold">
                      <span>Pension Employee ({payrollSettings.pensionEmployeeRate}%):</span>
                      <span className="font-mono font-bold text-rose-600">-{(activePayslip.deductions.pensionEmployee ?? 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-1 text-slate-700 font-semibold">
                      <span>PAYE Income Tax:</span>
                      <span className="font-mono font-bold text-rose-600">-{(activePayslip.deductions.payeTax ?? 0).toFixed(2)}</span>
                    </div>
                    {activePayslip.deductions.welfareFund > 0 && (
                      <div className="flex justify-between py-1 text-slate-600">
                        <span>Staff Welfare Fund:</span>
                        <span className="font-mono">-{(activePayslip.deductions.welfareFund ?? 0).toFixed(2)}</span>
                      </div>
                    )}
                    {activePayslip.deductions.loanRepayment > 0 && (
                      <div className="flex justify-between py-1 text-slate-600">
                        <span>Staff Advance / Loan Recovery:</span>
                        <span className="font-mono">-{(activePayslip.deductions.loanRepayment ?? 0).toFixed(2)}</span>
                      </div>
                    )}
                    {activePayslip.deductions.absenteeismPenalty > 0 && (
                      <div className="flex justify-between py-1 text-rose-600">
                        <span>Unexcused Lateness/Absenteeism:</span>
                        <span className="font-mono">-{(activePayslip.deductions.absenteeismPenalty ?? 0).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 font-black text-slate-900 border-t-2 border-slate-300">
                      <span>TOTAL DEDUCTIONS:</span>
                      <span className="font-mono text-rose-700">-{activePayslip.totalDeductions.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Net Pay Highlight Banner */}
              <div className="bg-emerald-50 border-2 border-emerald-500/50 p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <span className="text-xs uppercase font-extrabold text-emerald-800 tracking-wider">NET TAKE-HOME SALARY PAYABLE</span>
                  <div className="text-xs text-emerald-700 font-medium">Credited to beneficiary account • Certified for disbursement</div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-emerald-800 font-mono">
                  {activePayslip.netSalary.toLocaleString('en-US', { minimumFractionDigits: 2 })} {payrollSettings.currencySymbol}
                </div>
              </div>

              {/* Employer Contributions Note */}
              <div className="text-[11px] text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200 flex justify-between">
                <span>Employer Statutory Contributions (Not Deducted):</span>
                <span>Pension 13.0%: <strong className="font-mono text-slate-700">{(activePayslip.employerContribution.pensionEmployer ?? 0).toFixed(2)}</strong> • Tier 2 (5%): <strong className="font-mono text-slate-700">{(activePayslip.employerContribution.tier2Fund ?? 0).toFixed(2)}</strong></span>
              </div>

              {/* Signatures & Authentication Stamp */}
              <div className="pt-6 border-t-2 border-slate-200 grid grid-cols-2 sm:grid-cols-3 gap-6 text-center text-xs">
                <div className="space-y-4">
                  <div className="h-10 flex items-end justify-center">
                    <span className="font-signature text-base text-blue-900">Grace Tetteh</span>
                  </div>
                  <div className="border-t border-slate-400 pt-1 font-bold text-slate-700">
                    {payrollSettings.schoolSignatoryTitle}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="h-10 flex items-end justify-center">
                    <span className="font-signature text-base text-blue-900">Marcus Prosper</span>
                  </div>
                  <div className="border-t border-slate-400 pt-1 font-bold text-slate-700">
                    {payrollSettings.headmasterSignatoryTitle}
                  </div>
                </div>

                <div className="space-y-4 col-span-2 sm:col-span-1">
                  <div className="h-10 flex items-center justify-center">
                    <span className="text-[10px] font-mono font-bold text-emerald-700 border border-emerald-400 bg-emerald-50 px-2 py-0.5 rounded">
                      DIGITALLY CERTIFIED
                    </span>
                  </div>
                  <div className="border-t border-slate-400 pt-1 font-bold text-slate-700">
                    Employee Signature
                  </div>
                </div>
              </div>

              <p className="text-[9px] text-center text-slate-400 italic pt-2">
                {payrollSettings.payslipFooterNote}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. STAFF LOANS & ADVANCES TAB */}
      {/* ========================================================================= */}
      {activeTab === 'loans' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-amber-600" />
                Staff Loans & Salary Advances Ledger
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Automatic monthly recovery directly integrated with payroll batch runs
              </p>
            </div>

            <button
              onClick={() => {
                const newLoan: StaffLoanAdvance = {
                  id: `loan-${Date.now()}`,
                  staffId: salaryStructures[0]?.staffId || 't-1',
                  staffName: salaryStructures[0]?.staffName || '',
                  staffType: 'Teaching',
                  loanType: 'Salary Advance',
                  principalAmount: 1000,
                  monthlyDeduction: 250,
                  amountRepaid: 0,
                  remainingBalance: 1000,
                  durationMonths: 4,
                  monthsRemaining: 4,
                  startDate: new Date().toISOString().split('T')[0],
                  expectedEndDate: new Date(Date.now() + 120 * 86400000).toISOString().split('T')[0],
                  status: 'Active',
                  approvedBy: userName,
                  reason: 'Staff emergency personal advance'
                };
                setEditingLoan(newLoan);
                setShowLoanModal(true);
              }}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Record New Staff Loan</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {staffLoans.map(l => (
              <div key={l.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4 hover:border-amber-400 transition-all">
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-900">{l.staffName}</h4>
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        {l.loanType}
                      </span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      l.status === 'Paid Off' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {l.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 italic">"{l.reason}"</p>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Principal:</span>
                      <strong className="font-mono text-slate-900">{l.principalAmount.toLocaleString()} {payrollSettings.currencySymbol}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Monthly Deduction:</span>
                      <strong className="font-mono text-amber-700">-{l.monthlyDeduction.toLocaleString()} {payrollSettings.currencySymbol}/mo</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Amount Repaid:</span>
                      <span className="font-mono text-emerald-600 font-bold">{l.amountRepaid.toLocaleString()} {payrollSettings.currencySymbol}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-200 pt-1 font-bold">
                      <span className="text-slate-700">Remaining Balance:</span>
                      <strong className="font-mono text-rose-600">{l.remainingBalance.toLocaleString()} {payrollSettings.currencySymbol}</strong>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>Repayment Progress</span>
                      <span>{Math.round((l.amountRepaid / (l.principalAmount || 1)) * 100)}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500 rounded-full transition-all"
                        style={{ width: `${Math.min(100, Math.round((l.amountRepaid / (l.principalAmount || 1)) * 100))}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold">
                  <span className="text-[10px] text-slate-400">{l.monthsRemaining} months remaining</span>
                  <button
                    onClick={() => {
                      setEditingLoan(l);
                      setShowLoanModal(true);
                    }}
                    className="text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Loan</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. BANK PAYMENT ADVICE & MOMO DISBURSEMENT LIST TAB */}
      {/* ========================================================================= */}
      {activeTab === 'bank-advice' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                <Landmark className="w-4 h-4 text-blue-600" />
                Bank Remittance & Mobile Money Advice Schedule
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Export clean batch file for corporate bank electronic fund transfers (ACH / GIP) or MoMo bulk disbursement
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (!activePayrollRun) return;
                  const headers = ['Beneficiary Name,Staff Type,Bank Name,Account Number / Phone,Pension,Net Salary,Payment Method,Narration\n'];
                  const rows = activePayrollRun.payslips.map(ps => 
                    `"${ps.staffName}","${ps.staffType}","${ps.bankName}","${ps.accountNumber}","${ps.pensionNumber}",${ps.netSalary},"${ps.paymentMethod}","${activePayrollRun.month} Staff Salary"`
                  );
                  const csv = headers.concat(rows).join('\n');
                  const blob = new Blob([csv], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `JIPAS-Payroll-Bank-Advice-${activePayrollRun.month.replace(/\s+/g, '-')}.csv`;
                  a.click();
                  triggerToast('Bank advice schedule downloaded.');
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Export Bank CSV Schedule</span>
              </button>
            </div>
          </div>

          {/* Advice Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-5">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-y border-slate-200 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-3">#</th>
                    <th className="py-3 px-3">Beneficiary Name</th>
                    <th className="py-3 px-3">Bank / Provider</th>
                    <th className="py-3 px-3">Account No / MoMo Phone</th>
                    <th className="py-3 px-3">Pension TIN</th>
                    <th className="py-3 px-3 text-right font-black text-emerald-700">Net Payable ({payrollSettings.currencySymbol})</th>
                    <th className="py-3 px-3">Method</th>
                    <th className="py-3 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {activePayrollRun?.payslips.map((ps, index) => (
                    <tr key={ps.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-3 text-slate-400 font-mono">{index + 1}</td>
                      <td className="py-3 px-3 font-bold text-slate-900">{ps.staffName}</td>
                      <td className="py-3 px-3 text-slate-700">{ps.bankName}</td>
                      <td className="py-3 px-3 font-mono font-bold text-blue-600">{ps.accountNumber || 'N/A'}</td>
                      <td className="py-3 px-3 font-mono text-slate-500">{ps.pensionNumber || 'N/A'}</td>
                      <td className="py-3 px-3 text-right font-mono font-black text-emerald-600 text-sm">
                        {ps.netSalary.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold">
                          {ps.paymentMethod}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          ps.status === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {ps.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. TAX & Pension RATES SETTINGS TAB */}
      {/* ========================================================================= */}
      {activeTab === 'settings' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6 max-w-3xl">
          <div>
            <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
              <Settings className="w-5 h-5 text-blue-600" />
              Statutory Tax, Pension & Policy Configuration
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure national social security percentages, welfare deductions, default paydays & payslip certified signatories
            </p>
          </div>

          <form 
            onSubmit={async (e) => {
              e.preventDefault();
              await savePayrollSettings(payrollSettings);
              triggerToast('Payroll settings saved successfully.');
            }}
            className="space-y-4 text-xs font-bold"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-700 mb-1">Currency Symbol</label>
                <input
                  type="text"
                  value={payrollSettings.currencySymbol}
                  onChange={(e) => setPayrollSettings({ ...payrollSettings, currencySymbol: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1">Default Payday of Month</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={payrollSettings.defaultPayDay}
                  onChange={(e) => setPayrollSettings({ ...payrollSettings, defaultPayDay: parseInt(e.target.value, 10) || 25 })}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1">Pension Employee Contribution Rate (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={payrollSettings.pensionEmployeeRate}
                  onChange={(e) => setPayrollSettings({ ...payrollSettings, pensionEmployeeRate: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-mono text-rose-600"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1">Pension Employer Contribution Rate (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={payrollSettings.pensionEmployerRate}
                  onChange={(e) => setPayrollSettings({ ...payrollSettings, pensionEmployerRate: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-mono text-blue-600"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1">Staff Welfare Fund Deduction ({payrollSettings.currencySymbol})</label>
                <input
                  type="number"
                  value={payrollSettings.defaultWelfareDeduction}
                  onChange={(e) => setPayrollSettings({ ...payrollSettings, defaultWelfareDeduction: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1">Daily Absenteeism Penalty Rate ({payrollSettings.currencySymbol})</label>
                <input
                  type="number"
                  value={payrollSettings.dailyAbsenteeismRate}
                  onChange={(e) => setPayrollSettings({ ...payrollSettings, dailyAbsenteeismRate: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-slate-700 mb-1">Bursar / Finance Signatory Designation</label>
                <input
                  type="text"
                  value={payrollSettings.schoolSignatoryTitle}
                  onChange={(e) => setPayrollSettings({ ...payrollSettings, schoolSignatoryTitle: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1">Headmaster Signatory Designation</label>
                <input
                  type="text"
                  value={payrollSettings.headmasterSignatoryTitle}
                  onChange={(e) => setPayrollSettings({ ...payrollSettings, headmasterSignatoryTitle: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl"
                />
              </div>
            </div>

            <div className="pt-2">
              <label className="block text-slate-700 mb-1">Payslip Footer Disclaimer</label>
              <textarea
                rows={2}
                value={payrollSettings.payslipFooterNote}
                onChange={(e) => setPayrollSettings({ ...payrollSettings, payslipFooterNote: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl"
              />
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="submit"
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md transition-all cursor-pointer"
              >
                Save Settings
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: RUN NEW MONTHLY PAYROLL */}
      {/* ========================================================================= */}
      {showNewRunModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-slate-200 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-600" />
                Compile New Monthly Payroll Batch
              </h3>
              <button onClick={() => setShowNewRunModal(false)} className="text-slate-400 font-bold hover:text-slate-600 cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleCreatePayrollRun} className="space-y-4 text-xs font-bold">
              <div>
                <label className="block text-slate-700 mb-1">Payroll Month & Year *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. October 2026 or November 2026"
                  value={newRunMonth}
                  onChange={(e) => setNewRunMonth(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1">Academic Year</label>
                  <input
                    type="text"
                    value={newRunAcademicYear}
                    onChange={(e) => setNewRunAcademicYear(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1">Term</label>
                  <select
                    value={newRunTerm}
                    onChange={(e) => setNewRunTerm(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white"
                  >
                    <option value="First Term">First Term</option>
                    <option value="Second Term">Second Term</option>
                    <option value="Third Term">Third Term</option>
                  </select>
                </div>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl text-emerald-900 space-y-1">
                <div className="font-extrabold flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>Automatic Computation Engine</span>
                </div>
                <p className="text-[11px] font-normal leading-relaxed">
                  Compiles all <strong>{salaryStructures.filter(s => s.isActive).length} active faculty & staff structures</strong>, applying Pension 5.5%, progressive PAYE tax, and active loan deductions.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewRunModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md cursor-pointer"
                >
                  Compile & Save Batch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT SALARY STRUCTURE */}
      {/* ========================================================================= */}
      {showStructureModal && editingStructure && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full p-6 border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                Configure Staff Remuneration Tier
              </h3>
              <button onClick={() => setShowStructureModal(false)} className="text-slate-400 font-bold hover:text-slate-600 cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSaveSalaryStructure} className="space-y-4 text-xs font-bold">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1">Staff Full Name *</label>
                  <input
                    type="text"
                    required
                    value={editingStructure.staffName}
                    onChange={(e) => setEditingStructure({ ...editingStructure, staffName: e.target.value })}
                    placeholder="e.g. Mr. Emmanuel Owusu"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 mb-1">Designation *</label>
                  <input
                    type="text"
                    required
                    value={editingStructure.designation}
                    onChange={(e) => setEditingStructure({ ...editingStructure, designation: e.target.value })}
                    placeholder="e.g. Senior Science Master"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 mb-1">Department</label>
                  <select
                    value={editingStructure.department}
                    onChange={(e) => setEditingStructure({ ...editingStructure, department: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white"
                  >
                    <option value="Senior High School">Senior High School</option>
                    <option value="Junior High School">Junior High School</option>
                    <option value="Primary School">Primary School</option>
                    <option value="Administration & Finance">Administration & Finance</option>
                    <option value="Executive Leadership">Executive Leadership</option>
                    <option value="Support & Maintenance">Support & Maintenance</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 mb-1">Staff Category</label>
                  <select
                    value={editingStructure.staffType}
                    onChange={(e) => setEditingStructure({ ...editingStructure, staffType: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white"
                  >
                    <option value="Teaching">Teaching Faculty</option>
                    <option value="Administrative">Administrative</option>
                    <option value="Support">Support & Maintenance</option>
                    <option value="Non-Teaching">Non-Teaching Staff</option>
                    <option value="Cook">Cook & Kitchen Staff</option>
                    <option value="Cleaner">Cleaner & Sanitation</option>
                    <option value="Security">Security Officer</option>
                    <option value="Driver">Transport Driver</option>
                    <option value="Librarian">Librarian</option>
                    <option value="Nurse">School Nurse</option>
                    <option value="Lab Assistant">Lab Assistant</option>
                    <option value="Handyman">Handyman / Maintenance</option>
                    <option value="Others">Others</option>
                  </select>
                </div>
              </div>

              {/* Basic Salary */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-slate-800 font-black text-sm">Basic Monthly Salary ({payrollSettings.currencySymbol}) *</label>
                  <input
                    type="number"
                    min="100"
                    step="10"
                    required
                    value={editingStructure.basicSalary}
                    onChange={(e) => setEditingStructure({ ...editingStructure, basicSalary: parseFloat(e.target.value) || 0 })}
                    className="w-40 px-3.5 py-2 border-2 border-blue-400 rounded-xl font-mono font-black text-sm text-right bg-white"
                  />
                </div>

                {/* Individual Allowances */}
                <div className="pt-2 border-t border-slate-200">
                  <span className="text-[11px] text-slate-500 uppercase font-bold block mb-2">Itemized Allowances ({payrollSettings.currencySymbol})</span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Responsibility</span>
                      <input
                        type="number"
                        min="0"
                        value={editingStructure.allowances.responsibility}
                        onChange={(e) => setEditingStructure({
                          ...editingStructure,
                          allowances: { ...editingStructure.allowances, responsibility: parseFloat(e.target.value) || 0 }
                        })}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono"
                      />
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 block">Transport</span>
                      <input
                        type="number"
                        min="0"
                        value={editingStructure.allowances.transport}
                        onChange={(e) => setEditingStructure({
                          ...editingStructure,
                          allowances: { ...editingStructure.allowances, transport: parseFloat(e.target.value) || 0 }
                        })}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono"
                      />
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 block">Housing / Rent</span>
                      <input
                        type="number"
                        min="0"
                        value={editingStructure.allowances.housing}
                        onChange={(e) => setEditingStructure({
                          ...editingStructure,
                          allowances: { ...editingStructure.allowances, housing: parseFloat(e.target.value) || 0 }
                        })}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono"
                      />
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 block">Utility / Hardship</span>
                      <input
                        type="number"
                        min="0"
                        value={editingStructure.allowances.utilityHardship}
                        onChange={(e) => setEditingStructure({
                          ...editingStructure,
                          allowances: { ...editingStructure.allowances, utilityHardship: parseFloat(e.target.value) || 0 }
                        })}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono"
                      />
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 block">Overtime / Extra</span>
                      <input
                        type="number"
                        min="0"
                        value={editingStructure.allowances.overtime}
                        onChange={(e) => setEditingStructure({
                          ...editingStructure,
                          allowances: { ...editingStructure.allowances, overtime: parseFloat(e.target.value) || 0 }
                        })}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono"
                      />
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 block">Bonus / Special</span>
                      <input
                        type="number"
                        min="0"
                        value={editingStructure.allowances.bonus}
                        onChange={(e) => setEditingStructure({
                          ...editingStructure,
                          allowances: { ...editingStructure.allowances, bonus: parseFloat(e.target.value) || 0 }
                        })}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Bank & Tax Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1">Bank Name / Network</label>
                  <input
                    type="text"
                    value={editingStructure.bankName}
                    onChange={(e) => setEditingStructure({ ...editingStructure, bankName: e.target.value })}
                    placeholder="e.g. GCB Bank or MTN MoMo"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 mb-1">Account / Phone No</label>
                  <input
                    type="text"
                    value={editingStructure.accountNumber}
                    onChange={(e) => setEditingStructure({ ...editingStructure, accountNumber: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 mb-1">Payment Method</label>
                  <select
                    value={editingStructure.paymentMethod}
                    onChange={(e) => setEditingStructure({ ...editingStructure, paymentMethod: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white"
                  >
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Mobile Money">Mobile Money</option>
                    <option value="Cash">Cash</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 mb-1">Pension Number</label>
                  <input
                    type="text"
                    value={editingStructure.pensionNumber}
                    onChange={(e) => setEditingStructure({ ...editingStructure, pensionNumber: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 mb-1">TIN / Tax Number</label>
                  <input
                    type="text"
                    value={editingStructure.tinNumber}
                    onChange={(e) => setEditingStructure({ ...editingStructure, tinNumber: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-mono"
                  />
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="structActive"
                    checked={editingStructure.isActive}
                    onChange={(e) => setEditingStructure({ ...editingStructure, isActive: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600"
                  />
                  <label htmlFor="structActive" className="text-slate-800 cursor-pointer">Active in Payroll</label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowStructureModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md cursor-pointer"
                >
                  Save Salary Structure
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: RECORD / EDIT STAFF LOAN */}
      {/* ========================================================================= */}
      {showLoanModal && editingLoan && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-slate-200 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-amber-600" />
                Staff Loan & Salary Advance
              </h3>
              <button onClick={() => setShowLoanModal(false)} className="text-slate-400 font-bold hover:text-slate-600 cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSaveLoan} className="space-y-3.5 text-xs font-bold">
              <div>
                <label className="block text-slate-700 mb-1">Staff Member *</label>
                <select
                  value={editingLoan.staffId}
                  onChange={(e) => {
                    const found = salaryStructures.find(s => s.staffId === e.target.value);
                    setEditingLoan({
                      ...editingLoan,
                      staffId: e.target.value,
                      staffName: found?.staffName || ''
                    });
                  }}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white"
                >
                  {salaryStructures.map(s => (
                    <option key={s.id} value={s.staffId}>
                      {s.staffName} ({s.designation})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1">Loan Type</label>
                  <select
                    value={editingLoan.loanType}
                    onChange={(e) => setEditingLoan({ ...editingLoan, loanType: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white"
                  >
                    <option value="Salary Advance">Salary Advance</option>
                    <option value="Emergency Staff Loan">Emergency Staff Loan</option>
                    <option value="Vehicle / Equipment Loan">Vehicle / Equipment Loan</option>
                    <option value="Welfare Relief Loan">Welfare Relief Loan</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 mb-1">Principal Amount ({payrollSettings.currencySymbol}) *</label>
                  <input
                    type="number"
                    min="50"
                    step="10"
                    required
                    value={editingLoan.principalAmount}
                    onChange={(e) => {
                      const p = parseFloat(e.target.value) || 0;
                      const bal = Math.max(0, p - editingLoan.amountRepaid);
                      setEditingLoan({ ...editingLoan, principalAmount: p, remainingBalance: bal });
                    }}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 mb-1">Monthly Deduction *</label>
                  <input
                    type="number"
                    min="10"
                    step="10"
                    required
                    value={editingLoan.monthlyDeduction}
                    onChange={(e) => setEditingLoan({ ...editingLoan, monthlyDeduction: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-mono text-amber-700"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 mb-1">Duration (Months)</label>
                  <input
                    type="number"
                    min="1"
                    value={editingLoan.durationMonths}
                    onChange={(e) => setEditingLoan({ ...editingLoan, durationMonths: parseInt(e.target.value, 10) || 1, monthsRemaining: parseInt(e.target.value, 10) || 1 })}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 mb-1">Loan Purpose / Reason</label>
                <textarea
                  rows={2}
                  value={editingLoan.reason}
                  onChange={(e) => setEditingLoan({ ...editingLoan, reason: e.target.value })}
                  placeholder="e.g. Medical emergency assistance or accommodation advance"
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowLoanModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold shadow-md cursor-pointer"
                >
                  Save Loan Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDIT INDIVIDUAL PAYSLIP ADJUSTMENTS */}
      {/* ========================================================================= */}
      {showEditPayslipModal && editingPayslip && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-blue-600" />
                  Adjust Payslip: {editingPayslip.staffName}
                </h3>
                <p className="text-xs text-slate-500 font-normal mt-0.5">{editingPayslip.voucherNo} • {editingPayslip.month}</p>
              </div>
              <button onClick={() => setShowEditPayslipModal(false)} className="text-slate-400 font-bold hover:text-slate-600 cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSavePayslip} className="space-y-4 text-xs font-bold">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-700">Basic Monthly:</span>
                  <span className="font-mono font-bold text-slate-900">{editingPayslip.basicSalary.toLocaleString()} {payrollSettings.currencySymbol}</span>
                </div>
              </div>

              {/* Adjust Allowances */}
              <div>
                <span className="text-[11px] text-slate-600 uppercase font-extrabold block mb-2">Adjust Allowances ({payrollSettings.currencySymbol})</span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Responsibility</span>
                    <input
                      type="number"
                      min="0"
                      value={editingPayslip.allowances.responsibility}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        const newAllow = { ...editingPayslip.allowances, responsibility: val };
                        const totAllow = (Object.values(newAllow) as (number | undefined)[]).reduce((a: number, b) => a + (Number(b) || 0), 0);
                        const gross = editingPayslip.basicSalary + totAllow;
                        const pension = Math.round(editingPayslip.basicSalary * (payrollSettings.pensionEmployeeRate / 100) * 100) / 100;
                        const taxInc = Math.max(0, gross - pension);
                        const tax = Math.round(taxInc * 0.075 * 100) / 100;
                        const totDed = pension + tax + editingPayslip.deductions.welfareFund + editingPayslip.deductions.loanRepayment + editingPayslip.deductions.absenteeismPenalty;
                        const net = Math.round((gross - totDed) * 100) / 100;
                        setEditingPayslip({
                          ...editingPayslip,
                          allowances: newAllow,
                          totalAllowances: totAllow,
                          grossEarnings: gross,
                          deductions: { ...editingPayslip.deductions, pensionEmployee: pension, payeTax: tax },
                          totalDeductions: totDed,
                          netSalary: net
                        });
                      }}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono"
                    />
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 block">Overtime / Extra Hours</span>
                    <input
                      type="number"
                      min="0"
                      value={editingPayslip.allowances.overtime}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        const newAllow = { ...editingPayslip.allowances, overtime: val };
                        const totAllow = (Object.values(newAllow) as (number | undefined)[]).reduce((a: number, b) => a + (Number(b) || 0), 0);
                        const gross = editingPayslip.basicSalary + totAllow;
                        const pension = Math.round(editingPayslip.basicSalary * (payrollSettings.pensionEmployeeRate / 100) * 100) / 100;
                        const taxInc = Math.max(0, gross - pension);
                        const tax = Math.round(taxInc * 0.075 * 100) / 100;
                        const totDed = pension + tax + editingPayslip.deductions.welfareFund + editingPayslip.deductions.loanRepayment + editingPayslip.deductions.absenteeismPenalty;
                        const net = Math.round((gross - totDed) * 100) / 100;
                        setEditingPayslip({
                          ...editingPayslip,
                          allowances: newAllow,
                          totalAllowances: totAllow,
                          grossEarnings: gross,
                          deductions: { ...editingPayslip.deductions, pensionEmployee: pension, payeTax: tax },
                          totalDeductions: totDed,
                          netSalary: net
                        });
                      }}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono"
                    />
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 block">Performance Bonus</span>
                    <input
                      type="number"
                      min="0"
                      value={editingPayslip.allowances.bonus}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        const newAllow = { ...editingPayslip.allowances, bonus: val };
                        const totAllow = (Object.values(newAllow) as (number | undefined)[]).reduce((a: number, b) => a + (Number(b) || 0), 0);
                        const gross = editingPayslip.basicSalary + totAllow;
                        const pension = Math.round(editingPayslip.basicSalary * (payrollSettings.pensionEmployeeRate / 100) * 100) / 100;
                        const taxInc = Math.max(0, gross - pension);
                        const tax = Math.round(taxInc * 0.075 * 100) / 100;
                        const totDed = pension + tax + editingPayslip.deductions.welfareFund + editingPayslip.deductions.loanRepayment + editingPayslip.deductions.absenteeismPenalty;
                        const net = Math.round((gross - totDed) * 100) / 100;
                        setEditingPayslip({
                          ...editingPayslip,
                          allowances: newAllow,
                          totalAllowances: totAllow,
                          grossEarnings: gross,
                          deductions: { ...editingPayslip.deductions, pensionEmployee: pension, payeTax: tax },
                          totalDeductions: totDed,
                          netSalary: net
                        });
                      }}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono"
                    />
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 block">Other Allowance</span>
                    <input
                      type="number"
                      min="0"
                      value={editingPayslip.allowances.other}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        const newAllow = { ...editingPayslip.allowances, other: val };
                        const totAllow = (Object.values(newAllow) as (number | undefined)[]).reduce((a: number, b) => a + (Number(b) || 0), 0);
                        const gross = editingPayslip.basicSalary + totAllow;
                        const pension = Math.round(editingPayslip.basicSalary * (payrollSettings.pensionEmployeeRate / 100) * 100) / 100;
                        const taxInc = Math.max(0, gross - pension);
                        const tax = Math.round(taxInc * 0.075 * 100) / 100;
                        const totDed = pension + tax + editingPayslip.deductions.welfareFund + editingPayslip.deductions.loanRepayment + editingPayslip.deductions.absenteeismPenalty;
                        const net = Math.round((gross - totDed) * 100) / 100;
                        setEditingPayslip({
                          ...editingPayslip,
                          allowances: newAllow,
                          totalAllowances: totAllow,
                          grossEarnings: gross,
                          deductions: { ...editingPayslip.deductions, pensionEmployee: pension, payeTax: tax },
                          totalDeductions: totDed,
                          netSalary: net
                        });
                      }}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Adjust Deductions */}
              <div>
                <span className="text-[11px] text-slate-600 uppercase font-extrabold block mb-2">Adjust Manual Penalties / Deductions</span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Absenteeism / Lateness</span>
                    <input
                      type="number"
                      min="0"
                      value={editingPayslip.deductions.absenteeismPenalty}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        const newDed = { ...editingPayslip.deductions, absenteeismPenalty: val };
                        const totDed = (Object.values(newDed) as (number | undefined)[]).reduce((a: number, b) => a + (Number(b) || 0), 0);
                        const grossNum = Number(editingPayslip.grossEarnings) || 0;
                        const net = Math.round((grossNum - totDed) * 100) / 100;
                        setEditingPayslip({
                          ...editingPayslip,
                          deductions: newDed,
                          totalDeductions: totDed,
                          netSalary: net
                        });
                      }}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono text-rose-600"
                    />
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 block">Other Custom Deduction</span>
                    <input
                      type="number"
                      min="0"
                      value={editingPayslip.deductions.other}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        const newDed = { ...editingPayslip.deductions, other: val };
                        const totDed = (Object.values(newDed) as (number | undefined)[]).reduce((a: number, b) => a + (Number(b) || 0), 0);
                        const grossNum = Number(editingPayslip.grossEarnings) || 0;
                        const net = Math.round((grossNum - totDed) * 100) / 100;
                        setEditingPayslip({
                          ...editingPayslip,
                          deductions: newDed,
                          totalDeductions: totDed,
                          netSalary: net
                        });
                      }}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono text-rose-600"
                    />
                  </div>
                </div>
              </div>

              {/* Net Result Preview */}
              <div className="bg-emerald-50 border border-emerald-300 p-3.5 rounded-xl flex justify-between items-center text-xs">
                <span className="font-bold text-emerald-900">Calculated Net Salary:</span>
                <span className="font-mono font-black text-emerald-700 text-base">
                  {editingPayslip.netSalary.toLocaleString('en-US', { minimumFractionDigits: 2 })} {payrollSettings.currencySymbol}
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditPayslipModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md cursor-pointer"
                >
                  Apply & Recalculate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* BATCH PRINT BROADSHEET MODAL (PRINT MEDIA VIEW) */}
      {/* ========================================================================= */}
      {isBatchPrintMode && activePayrollRun && (
        <div className="fixed inset-0 bg-white z-50 p-8 overflow-y-auto space-y-6">
          <div className="flex justify-between items-center print:hidden border-b pb-4">
            <div className="flex items-center gap-2">
              <span className="font-black text-slate-900 text-lg">Master Payroll Broadsheet Preview</span>
              <span className="text-xs bg-slate-100 px-2 py-0.5 rounded font-mono font-bold text-slate-600">{activePayrollRun.batchNumber}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Document</span>
              </button>
              <button
                onClick={() => setIsBatchPrintMode(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
              <div className="flex items-center gap-3">
                <JIPASLogo size="md" />
                <div>
                  <h1 className="text-xl font-black text-slate-900 uppercase">JIPAS ACADEMY</h1>
                  <p className="text-xs font-bold text-slate-600 uppercase">Official Master Staff Remuneration Broadsheet</p>
                  <p className="text-[10px] text-slate-500">Month: {activePayrollRun.month} • Academic Year: {activePayrollRun.academicYear} • {activePayrollRun.term}</p>
                </div>
              </div>
              <div className="text-right text-xs">
                <div className="font-mono font-bold text-slate-700">BATCH: {activePayrollRun.batchNumber}</div>
                <div className="text-[10px] text-slate-500">Date: {activePayrollRun.createdAt}</div>
                <div className="text-sm font-black text-emerald-700 font-mono mt-1">
                  Net: {activePayrollRun.totalNetPayout.toLocaleString('en-US', { minimumFractionDigits: 2 })} {payrollSettings.currencySymbol}
                </div>
              </div>
            </div>

            <table className="w-full text-left text-xs border border-slate-300">
              <thead className="bg-slate-100 font-bold border-b border-slate-300 uppercase text-[9px]">
                <tr>
                  <th className="p-2 border-r">#</th>
                  <th className="p-2 border-r">Staff Name</th>
                  <th className="p-2 border-r">Designation & Dept</th>
                  <th className="p-2 border-r text-right">Basic</th>
                  <th className="p-2 border-r text-right">Allowances</th>
                  <th className="p-2 border-r text-right">Gross</th>
                  <th className="p-2 border-r text-right">Pension 5.5%</th>
                  <th className="p-2 border-r text-right">PAYE Tax</th>
                  <th className="p-2 border-r text-right">Loans/Welf</th>
                  <th className="p-2 border-r text-right font-black">Net Pay</th>
                  <th className="p-2 border-r">Bank & Account</th>
                  <th className="p-2 text-center">Sign</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-[11px]">
                {activePayrollRun.payslips.map((ps, idx) => (
                  <tr key={ps.id}>
                    <td className="p-2 border-r font-mono">{idx + 1}</td>
                    <td className="p-2 border-r font-bold">{ps.staffName}</td>
                    <td className="p-2 border-r text-slate-600">{ps.designation} ({ps.department})</td>
                    <td className="p-2 border-r text-right font-mono">{ps.basicSalary.toLocaleString()}</td>
                    <td className="p-2 border-r text-right font-mono">+{ps.totalAllowances.toLocaleString()}</td>
                    <td className="p-2 border-r text-right font-mono font-bold">{ps.grossEarnings.toLocaleString()}</td>
                    <td className="p-2 border-r text-right font-mono text-rose-700">-{(ps.deductions.pensionEmployee ?? 0).toFixed(2)}</td>
                    <td className="p-2 border-r text-right font-mono text-rose-700">-{(ps.deductions.payeTax ?? 0).toFixed(2)}</td>
                    <td className="p-2 border-r text-right font-mono text-amber-700">-{((ps.deductions.loanRepayment ?? 0) + (ps.deductions.welfareFund ?? 0)).toFixed(2)}</td>
                    <td className="p-2 border-r text-right font-mono font-black text-emerald-800">{ps.netSalary.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <td className="p-2 border-r font-mono text-[10px]">{ps.bankName} - {ps.accountNumber}</td>
                    <td className="p-2 text-center text-slate-300 font-signature text-xs">Signed</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100 font-black border-t-2 border-slate-400 text-xs">
                <tr>
                  <td colSpan={3} className="p-2 border-r">TOTALS ({activePayrollRun.totalStaff} STAFF):</td>
                  <td className="p-2 border-r text-right font-mono">{activePayrollRun.totalBasicSalary.toLocaleString()}</td>
                  <td className="p-2 border-r text-right font-mono">+{activePayrollRun.totalAllowances.toLocaleString()}</td>
                  <td className="p-2 border-r text-right font-mono">{activePayrollRun.totalGrossPay.toLocaleString()}</td>
                  <td className="p-2 border-r text-right font-mono text-rose-700">-{(activePayrollRun.totalPensionEmployee ?? 0).toFixed(2)}</td>
                  <td className="p-2 border-r text-right font-mono text-rose-700">-{(activePayrollRun.totalPAYETax ?? 0).toFixed(2)}</td>
                  <td className="p-2 border-r text-right font-mono text-amber-700">-{((activePayrollRun.totalLoanDeductions ?? 0) + (activePayrollRun.totalWelfare ?? 0)).toFixed(2)}</td>
                  <td className="p-2 border-r text-right font-mono text-emerald-900">{activePayrollRun.totalNetPayout.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  <td colSpan={2} className="p-2 text-center text-emerald-800 font-mono uppercase">CERTIFIED MASTER RUN</td>
                </tr>
              </tfoot>
            </table>

            <div className="pt-8 grid grid-cols-2 gap-12 text-center text-xs">
              <div className="border-t border-slate-400 pt-2">
                <span className="font-bold text-slate-800 block">{payrollSettings.schoolSignatoryTitle}</span>
                <span className="text-slate-500 text-[10px]">Prepared & Verified</span>
              </div>
              <div className="border-t border-slate-400 pt-2">
                <span className="font-bold text-slate-800 block">{payrollSettings.headmasterSignatoryTitle}</span>
                <span className="text-slate-500 text-[10px]">Approved for Payment</span>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

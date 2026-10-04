import React, { useState, useMemo, FormEvent } from 'react';
import { 
  SchoolExpenseRecord, 
  User 
} from '../../types';
import { 
  getStoredExpenses, 
  saveStoredExpenses 
} from '../../services/storageService';
import { addMoney, formatCurrency, formatMoneyForPrint } from '../../utils/financeUtils';
import { 
  DollarSign, 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  Download, 
  Printer, 
  FileText, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  X, 
  Trash2, 
  Edit3, 
  Eye, 
  Sparkles,
  ArrowUpRight,
  TrendingDown,
  Building2,
  Receipt,
  CreditCard,
  Layers,
  User as UserIcon,
  Tag,
  Wallet
} from 'lucide-react';

interface ExpenseManagerProps {
  currentUser?: User;
  canApprove?: boolean;
  canAdd?: boolean;
  canDelete?: boolean;
  highlightRecorder?: string;
  onRefreshStats?: () => void;
}

const EXPENSE_CATEGORIES = [
  'Utilities & Water',
  'Electricity & Power',
  'Teaching & Lab Supplies',
  'Stationery & Printing',
  'Repairs & Maintenance',
  'Staff Welfare & Refreshment',
  'Sanitation & Cleaning',
  'Transport & Fuel',
  'Examination Materials',
  'ICT & Software Licenses',
  'Boarding & Kitchen Supplies',
  'Administrative / Petty Cash',
  'Sports & Extra-Curricular',
  'Other'
];

const PAYMENT_METHODS = [
  'Cash',
  'Mobile Money',
  'Bank Transfer',
  'Cheque',
  'Petty Cash'
];

const DEPARTMENTS = [
  'General Operations',
  'Academic Faculty',
  'Primary School',
  'Junior High School',
  'Pre School',
  'Accounts & Finance',
  'Secretarial Desk',
  'Estate & Infrastructure',
  'Health & Sanitation',
  'Administration'
];

export default function ExpenseManager({
  currentUser,
  canApprove = true,
  canAdd = true,
  canDelete = true,
  highlightRecorder,
  onRefreshStats
}: ExpenseManagerProps) {
  const [expenses, setExpenses] = useState<SchoolExpenseRecord[]>(() => getStoredExpenses());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedMethod, setSelectedMethod] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedRecorder, setSelectedRecorder] = useState(highlightRecorder || 'All');

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedExpenseForView, setSelectedExpenseForView] = useState<SchoolExpenseRecord | null>(null);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);

  // Form State
  const [formCategory, setFormCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formPaymentMethod, setFormPaymentMethod] = useState(PAYMENT_METHODS[0]);
  const [formVendorPayee, setFormVendorPayee] = useState('');
  const [formDepartment, setFormDepartment] = useState(DEPARTMENTS[0]);
  const [formReferenceNo, setFormReferenceNo] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formDate, setFormDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleOpenAdd = () => {
    setEditingExpenseId(null);
    setFormCategory(EXPENSE_CATEGORIES[0]);
    setFormTitle('');
    setFormDescription('');
    setFormAmount('');
    setFormPaymentMethod(currentUser?.role === 'secretary' ? 'Petty Cash' : PAYMENT_METHODS[0]);
    setFormVendorPayee('');
    setFormDepartment(currentUser?.role === 'secretary' ? 'Secretarial Desk' : DEPARTMENTS[0]);
    setFormReferenceNo('');
    setFormNotes('');
    setFormDate(new Date().toISOString().split('T')[0]);
    setShowAddModal(true);
  };

  const handleOpenEdit = (exp: SchoolExpenseRecord) => {
    setEditingExpenseId(exp.id);
    setFormCategory(exp.category);
    setFormTitle(exp.title);
    setFormDescription(exp.description || '');
    setFormAmount(exp.amount.toString());
    setFormPaymentMethod(exp.paymentMethod);
    setFormVendorPayee(exp.vendorPayee);
    setFormDepartment(exp.department || DEPARTMENTS[0]);
    setFormReferenceNo(exp.referenceNo || '');
    setFormNotes(exp.notes || '');
    setFormDate(exp.date);
    setShowAddModal(true);
  };

  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(formAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('Please enter a valid expense amount greater than 0.');
      return;
    }
    if (!formTitle.trim() || !formVendorPayee.trim()) {
      alert('Please provide an expense title and vendor/payee.');
      return;
    }

    const currentUserName = currentUser?.name || 'Authorized Officer';
    const currentUserRole = currentUser?.role || 'accountant';

    let updatedList: SchoolExpenseRecord[];

    if (editingExpenseId) {
      updatedList = expenses.map(exp => {
        if (exp.id === editingExpenseId) {
          return {
            ...exp,
            date: formDate,
            category: formCategory,
            title: formTitle.trim(),
            description: formDescription.trim(),
            amount: amountNum,
            paymentMethod: formPaymentMethod,
            vendorPayee: formVendorPayee.trim(),
            department: formDepartment,
            referenceNo: formReferenceNo.trim(),
            notes: formNotes.trim()
          };
        }
        return exp;
      });
      showToast('Expense voucher successfully updated.');
    } else {
      const voucherNo = `VCH-${new Date().getFullYear()}-${(expenses.length + 101).toString().padStart(4, '0')}`;
      const newExp: SchoolExpenseRecord = {
        id: `exp-${Date.now()}`,
        voucherNo,
        date: formDate,
        category: formCategory,
        title: formTitle.trim(),
        description: formDescription.trim(),
        amount: amountNum,
        paymentMethod: formPaymentMethod,
        vendorPayee: formVendorPayee.trim(),
        department: formDepartment,
        recordedBy: `${currentUserName} (${currentUserRole.replace('_', ' ').toUpperCase()})`,
        recorderRole: currentUserRole,
        approvedBy: currentUserRole === 'admin' ? currentUserName : (canApprove ? currentUserName : undefined),
        status: currentUserRole === 'admin' || canApprove ? 'Approved' : 'Pending',
        referenceNo: formReferenceNo.trim() || `REF-${Date.now().toString().slice(-6)}`,
        academicYear: '2025-2026',
        term: 'Third Term',
        notes: formNotes.trim(),
        createdAt: new Date().toISOString()
      };
      updatedList = [newExp, ...expenses];
      showToast(`Expense voucher ${voucherNo} logged successfully.`);
    }

    setExpenses(updatedList);
    saveStoredExpenses(updatedList);
    setShowAddModal(false);
    if (onRefreshStats) onRefreshStats();
  };

  const handleApprove = (expId: string) => {
    const updated = expenses.map(exp => {
      if (exp.id === expId) {
        return {
          ...exp,
          status: 'Approved' as const,
          approvedBy: currentUser?.name || 'Administrator'
        };
      }
      return exp;
    });
    setExpenses(updated);
    saveStoredExpenses(updated);
    showToast('Expense voucher approved.');
    if (onRefreshStats) onRefreshStats();
  };

  const handleDelete = (expId: string) => {
    if (!window.confirm('Are you sure you want to delete this expense voucher record?')) return;
    const updated = expenses.filter(e => e.id !== expId);
    setExpenses(updated);
    saveStoredExpenses(updated);
    showToast('Expense voucher removed.');
    if (onRefreshStats) onRefreshStats();
  };

  // Filtered List
  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => {
      const matchesSearch = 
        exp.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exp.voucherNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exp.vendorPayee.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (exp.referenceNo && exp.referenceNo.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (exp.recordedBy && exp.recordedBy.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesCat = selectedCategory === 'All' || exp.category === selectedCategory;
      const matchesMethod = selectedMethod === 'All' || exp.paymentMethod === selectedMethod;
      const matchesStatus = selectedStatus === 'All' || exp.status === selectedStatus;
      const matchesRecorder = selectedRecorder === 'All' || 
        (selectedRecorder === 'secretary' && exp.recorderRole === 'secretary') ||
        (selectedRecorder === 'accountant' && (exp.recorderRole === 'accountant' || exp.recorderRole === 'sub_accountant')) ||
        (selectedRecorder === 'admin' && exp.recorderRole === 'admin');

      return matchesSearch && matchesCat && matchesMethod && matchesStatus && matchesRecorder;
    });
  }, [expenses, searchTerm, selectedCategory, selectedMethod, selectedStatus, selectedRecorder]);

  // Aggregate Metrics
  const totalExpenditure = useMemo(() => {
    return addMoney(...expenses.map(e => (e.status !== 'Void' ? e.amount || 0 : 0)));
  }, [expenses]);

  const secretaryExpenditure = useMemo(() => {
    return addMoney(...expenses.filter(e => e.recorderRole === 'secretary' && e.status !== 'Void').map(e => e.amount || 0));
  }, [expenses]);

  const pettyCashTotal = useMemo(() => {
    return addMoney(...expenses.filter(e => e.paymentMethod === 'Petty Cash' && e.status !== 'Void').map(e => e.amount || 0));
  }, [expenses]);

  const approvedExpenditure = useMemo(() => {
    return addMoney(...expenses.filter(e => e.status === 'Approved').map(e => e.amount || 0));
  }, [expenses]);

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['Voucher No', 'Date', 'Category', 'Title', 'Amount (CFA)', 'Payment Method', 'Vendor / Payee', 'Department', 'Recorded By', 'Status', 'Reference No'];
    const rows = filteredExpenses.map(exp => [
      exp.voucherNo,
      exp.date,
      `"${exp.category}"`,
      `"${exp.title.replace(/"/g, '""')}"`,
      (exp.amount ?? 0).toFixed(2),
      exp.paymentMethod,
      `"${exp.vendorPayee.replace(/"/g, '""')}"`,
      exp.department || '',
      `"${exp.recordedBy}"`,
      exp.status,
      exp.referenceNo || ''
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `jipas_expenditures_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintVoucher = (exp: SchoolExpenseRecord) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Payment Voucher - ${exp.voucherNo}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: #1e293b; }
            .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 24px; }
            .header h1 { margin: 0; font-size: 24px; text-transform: uppercase; color: #0f172a; }
            .header p { margin: 4px 0 0 0; font-size: 13px; color: #64748b; }
            .badge { display: inline-block; padding: 4px 12px; background: #e2e8f0; font-weight: bold; font-size: 12px; border-radius: 4px; margin-top: 8px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; font-size: 14px; }
            .box { border: 1px solid #cbd5e1; padding: 12px 16px; border-radius: 8px; }
            .box-title { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: bold; margin-bottom: 4px; }
            .box-value { font-size: 15px; font-weight: 600; color: #0f172a; }
            .amount-box { background: #f8fafc; border: 2px dashed #0f172a; padding: 20px; text-align: center; margin: 24px 0; border-radius: 8px; }
            .amount-val { font-size: 32px; font-weight: 900; color: #0f172a; }
            .signatures { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px; margin-top: 60px; font-size: 12px; text-align: center; }
            .sig-line { border-top: 1px solid #0f172a; padding-top: 6px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>JOY INTERNATIONAL SCHOOL (JIPAS)</h1>
            <p>01 BP. 2364 • Kpéhénou N°1 Behind T-Oil Feeling Station, and Hedzranawoe 4th Corner after Radio Maria, Lomé — Togo • Tel: (00228) 22 60 21 38 / 99 47 38 23 / 90 83 60 48 • joyjipas2002@gmail.com</p>
            <div class="badge">OFFICIAL DISBURSEMENT / EXPENDITURE VOUCHER</div>
          </div>

          <div class="grid">
            <div class="box">
              <div class="box-title">Voucher Number</div>
              <div class="box-value">${exp.voucherNo}</div>
            </div>
            <div class="box">
              <div class="box-title">Transaction Date</div>
              <div class="box-value">${exp.date}</div>
            </div>
            <div class="box">
              <div class="box-title">Expense Category</div>
              <div class="box-value">${exp.category}</div>
            </div>
            <div class="box">
              <div class="box-title">Department Allocation</div>
              <div class="box-value">${exp.department || 'General'}</div>
            </div>
            <div class="box">
              <div class="box-title">Payee / Vendor</div>
              <div class="box-value">${exp.vendorPayee}</div>
            </div>
            <div class="box">
              <div class="box-title">Payment Method & Ref</div>
              <div class="box-value">${exp.paymentMethod} (${exp.referenceNo || 'N/A'})</div>
            </div>
          </div>

          <div class="box" style="margin-bottom: 24px;">
            <div class="box-title">Purpose / Description</div>
            <div class="box-value">${exp.title}</div>
            ${exp.description ? `<p style="margin: 8px 0 0 0; font-size: 13px; color: #475569;">${exp.description}</p>` : ''}
          </div>

          <div class="amount-box">
            <div style="font-size: 13px; text-transform: uppercase; font-weight: bold; color: #64748b; margin-bottom: 6px;">Total Amount Paid</div>
            <div class="amount-val">${formatMoneyForPrint(exp.amount ?? 0)}</div>
            <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Status: <strong>${exp.status.toUpperCase()}</strong></div>
          </div>

          <div class="signatures">
            <div>
              <div style="height: 40px;"></div>
              <div class="sig-line">Prepared By<br><span style="font-weight: normal; font-size: 11px;">${exp.recordedBy}</span></div>
            </div>
            <div>
              <div style="height: 40px;"></div>
              <div class="sig-line">Authorized / Approved By<br><span style="font-weight: normal; font-size: 11px;">${exp.approvedBy || 'Bursar / Accountant'}</span></div>
            </div>
            <div>
              <div style="height: 40px;"></div>
              <div class="sig-line">Received By (Payee Signature)<br><span style="font-weight: normal; font-size: 11px;">${exp.vendorPayee}</span></div>
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
    <div className="space-y-6 animate-fade-in text-slate-900">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs font-bold border border-slate-700 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header & Metric Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                <Receipt className="w-5 h-5" />
              </div>
              <span className="text-xs font-black tracking-wider uppercase text-rose-600">
                Accounts & Institutional Finance
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
              Expenditure & Expense Management
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
              Track, categorize, and approve all institutional operating costs, supplies, utilities, repairs, and petty cash disbursements with verifiable audit vouchers.
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <button
              onClick={handleExportCSV}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span>Export CSV</span>
            </button>
            {canAdd && (
              <button
                onClick={handleOpenAdd}
                id="btn-log-new-expense"
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-rose-600/20"
              >
                <Plus className="w-4 h-4" />
                <span>Log New Expense</span>
              </button>
            )}
          </div>
        </div>

        {/* 4 Key Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 border-t border-slate-100">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">Total Expenditures</span>
              <DollarSign className="w-4 h-4 text-rose-500" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-900">
              {formatCurrency(totalExpenditure)}
            </div>
            <span className="text-[10px] text-slate-500 mt-1">{expenses.length} total logged vouchers</span>
          </div>

          <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200/60 flex flex-col justify-between">
            <div className="flex items-center justify-between text-emerald-700 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">Approved Costs</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-900">
              {formatCurrency(approvedExpenditure)}
            </div>
            <span className="text-[10px] text-emerald-700 mt-1">Reconciled in financial records</span>
          </div>

          <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200/60 flex flex-col justify-between">
            <div className="flex items-center justify-between text-amber-700 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">Petty Cash Outlay</span>
              <Wallet className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-amber-900">
              {formatCurrency(pettyCashTotal)}
            </div>
            <span className="text-[10px] text-amber-700 mt-1">Direct cash & minor desk expenses</span>
          </div>

          <div className="p-4 bg-blue-50/60 rounded-2xl border border-blue-200/60 flex flex-col justify-between">
            <div className="flex items-center justify-between text-blue-700 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">Secretary Desk Outlay</span>
              <Layers className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-blue-900">
              {formatCurrency(secretaryExpenditure)}
            </div>
            <span className="text-[10px] text-blue-700 mt-1">Front desk operational expenses</span>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative w-full md:w-80">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search voucher, title, payee, staff..."
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Filter Selects */}
          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 sm:pb-0">
            {/* Category */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white shrink-0"
            >
              <option value="All">All Categories</option>
              {EXPENSE_CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            {/* Payment Method */}
            <select
              value={selectedMethod}
              onChange={(e) => setSelectedMethod(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white shrink-0"
            >
              <option value="All">All Methods</option>
              {PAYMENT_METHODS.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>

            {/* Recorder Role Filter */}
            <select
              value={selectedRecorder}
              onChange={(e) => setSelectedRecorder(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white shrink-0"
            >
              <option value="All">All Staff Recorders</option>
              <option value="accountant">Accountants & Bursars</option>
              <option value="secretary">Secretary Desk</option>
              <option value="admin">Administrator</option>
            </select>

            {/* Status */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white shrink-0"
            >
              <option value="All">All Statuses</option>
              <option value="Approved">Approved</option>
              <option value="Pending">Pending</option>
              <option value="Paid">Paid</option>
              <option value="Reconciled">Reconciled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase text-slate-700">
              Expenditure Records ({filteredExpenses.length})
            </span>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            Showing filtered disbursement vouchers
          </span>
        </div>

        {filteredExpenses.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto">
              <Receipt className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-black text-slate-800">No Expense Records Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchTerm || selectedCategory !== 'All' 
                ? 'No expenditure items match your filter criteria. Try adjusting your search query.'
                : 'No expenses have been recorded yet. Click "Log New Expense" to record institutional costs.'}
            </p>
            {canAdd && (
              <button
                onClick={handleOpenAdd}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold cursor-pointer inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Log First Expense
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-3.5 px-4">Voucher No</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Expense Title & Category</th>
                  <th className="py-3.5 px-4">Payee / Vendor</th>
                  <th className="py-3.5 px-4">Payment Method</th>
                  <th className="py-3.5 px-4 text-right">Amount (CFA)</th>
                  <th className="py-3.5 px-4">Recorded By</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {exp.voucherNo}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                      {exp.date}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{exp.title}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded-md">
                          <Tag className="w-2.5 h-2.5 text-slate-400" />
                          {exp.category}
                        </span>
                        {exp.department && (
                          <span className="text-[10px] text-slate-500">
                            • {exp.department}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      {exp.vendorPayee}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        exp.paymentMethod === 'Petty Cash' 
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : exp.paymentMethod === 'Mobile Money'
                          ? 'bg-yellow-50 text-yellow-800 border border-yellow-200'
                          : exp.paymentMethod === 'Bank Transfer'
                          ? 'bg-blue-50 text-blue-800 border border-blue-200'
                          : 'bg-slate-100 text-slate-800 border border-slate-200'
                      }`}>
                        {exp.paymentMethod}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-rose-700 font-mono text-sm">
                      {formatCurrency(exp.amount ?? 0)}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-[11px] font-bold text-slate-800">{exp.recordedBy}</div>
                      {exp.recorderRole === 'secretary' && (
                        <span className="text-[9px] font-extrabold uppercase text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                          Secretary Desk
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        exp.status === 'Approved' || exp.status === 'Paid'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : exp.status === 'Pending'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}>
                        {exp.status === 'Approved' ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <Clock className="w-3 h-3 text-amber-600" />}
                        {exp.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {canApprove && exp.status === 'Pending' && (
                          <button
                            onClick={() => handleApprove(exp.id)}
                            title="Approve Expense Voucher"
                            className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
                          >
                            Approve
                          </button>
                        )}
                        <button
                          onClick={() => handlePrintVoucher(exp)}
                          title="Print Payment Voucher"
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5 text-slate-600" />
                        </button>
                        <button
                          onClick={() => setSelectedExpenseForView(exp)}
                          title="View Details"
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-600" />
                        </button>
                        {canAdd && (
                          <button
                            onClick={() => handleOpenEdit(exp)}
                            title="Edit Record"
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(exp.id)}
                            title="Delete Record"
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* MODAL: Log / Edit Expense Voucher                             */}
      {/* ------------------------------------------------------------- */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 animate-scale-in text-slate-900 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">
                    {editingExpenseId ? 'Edit Expenditure Voucher' : 'Log Institutional Expenditure'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Official accounting record for school operating expense
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Expense Date *</label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:bg-white focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category *</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold focus:bg-white"
                  >
                    {EXPENSE_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Expense Title / Item Description *</label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Science Lab Reagents & Microscope Slides"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold focus:bg-white focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Amount (CFA) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-rose-300 rounded-xl font-mono font-black text-rose-700 text-sm focus:bg-white focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Payment Method *</label>
                  <select
                    value={formPaymentMethod}
                    onChange={(e) => setFormPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold focus:bg-white"
                  >
                    {PAYMENT_METHODS.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Vendor / Payee Name *</label>
                  <input
                    type="text"
                    required
                    value={formVendorPayee}
                    onChange={(e) => setFormVendorPayee(e.target.value)}
                    placeholder="e.g. Accra City Lab Supplies Ltd"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold focus:bg-white focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Department Allocation</label>
                  <select
                    value={formDepartment}
                    onChange={(e) => setFormDepartment(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold focus:bg-white"
                  >
                    {DEPARTMENTS.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Cheque / MoMo / Invoice Ref No</label>
                  <input
                    type="text"
                    value={formReferenceNo}
                    onChange={(e) => setFormReferenceNo(e.target.value)}
                    placeholder="e.g. CHQ-99120 or MOM-8841"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Officer Logging Expense</label>
                  <input
                    type="text"
                    disabled
                    value={`${currentUser?.name || 'Officer'} (${currentUser?.role || 'Staff'})`}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl font-bold text-slate-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Detailed Description & Notes</label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Additional justification, receipt itemization, or approval notes..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:bg-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="btn-save-expense-voucher"
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow-md shadow-rose-600/20 cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{editingExpenseId ? 'Save Changes' : 'Record Expense Voucher'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: View Expense Details                                   */}
      {/* ------------------------------------------------------------- */}
      {selectedExpenseForView && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-scale-in text-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <span className="font-mono font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-200">
                  {selectedExpenseForView.voucherNo}
                </span>
                <span className="text-xs font-bold text-slate-500">Voucher Details</span>
              </div>
              <button
                onClick={() => setSelectedExpenseForView(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">Expense Title</span>
                <h4 className="text-base font-black text-slate-900">{selectedExpenseForView.title}</h4>
                {selectedExpenseForView.description && (
                  <p className="text-slate-600 mt-1">{selectedExpenseForView.description}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Amount Paid</span>
                  <span className="text-lg font-black text-rose-600 font-mono">
                    {formatCurrency(selectedExpenseForView.amount ?? 0)}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Payment Method</span>
                  <span className="font-bold text-slate-800">{selectedExpenseForView.paymentMethod}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Payee / Vendor</span>
                  <span className="font-bold text-slate-800">{selectedExpenseForView.vendorPayee}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Transaction Date</span>
                  <span className="font-bold text-slate-800">{selectedExpenseForView.date}</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Recorded By:</span>
                  <span className="font-bold text-slate-800">{selectedExpenseForView.recordedBy}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Department:</span>
                  <span className="font-bold text-slate-800">{selectedExpenseForView.department || 'General'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Reference Code:</span>
                  <span className="font-mono font-bold text-slate-800">{selectedExpenseForView.referenceNo || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Approval Status:</span>
                  <span className="font-bold text-emerald-700">{selectedExpenseForView.status}</span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  onClick={() => {
                    handlePrintVoucher(selectedExpenseForView);
                  }}
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Official Voucher
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

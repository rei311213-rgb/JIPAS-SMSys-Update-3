import React, { useState } from 'react';
import { 
  CreditCard, Plus, Pencil, Trash2, DollarSign, Receipt, Printer, 
  Download, Search, CheckCircle2, AlertTriangle, ArrowUpRight, ArrowDownRight, 
  FileText, ShieldCheck, Filter, TrendingUp, Wallet, Check, Send,
  Users, Building2, BookOpen, User, X, AlertCircle
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, 
  PieChart as RechartsPieChart, Pie, Cell, Legend 
} from 'recharts';
import { Student, StudentBill, PaymentRecord, IncomeExpenseItem, FinancialAuditItem, FeeOptionItem, NotificationItem, ClassFeeTariffItem, FeeRefundRecord } from '../../types';
import { PDFGeneratorService } from '../../services/pdfService';
import PrintableReceiptA6 from '../common/PrintableReceiptA6';
import JIPASLogo from '../common/JIPASLogo';
import PaidAsSelector from '../common/PaidAsSelector';
import FeesSettingsManager from '../common/FeesSettingsManager';
import OverdueFeeAlertsManager from './OverdueFeeAlertsManager';
import BulkFeeEntryTool from '../common/BulkFeeEntryTool';
import { INITIAL_FEE_OPTIONS_DATA } from '../../data/feeDescriptions';
import { getStoredDepartments, getStoredClasses, getStoredRefunds, saveStoredRefunds, getStoredBills, saveStoredBills, getStoredPayments, saveStoredPayments, getStoredExpenses } from '../../services/storageService';
import { subscribeRefunds, saveRefund, deleteRefund, savePayment, saveBill } from '../../services/dbService';
import { printContent } from '../../utils/printUtils';

interface FeeManagerProps {
  activeModule: string;
  students: Student[];
  bills: StudentBill[];
  payments: PaymentRecord[];
  classFeeTariffs: ClassFeeTariffItem[];
  onAddPayment: (payment: PaymentRecord) => void;
  onUpdateBills?: (bills: StudentBill[]) => void;
  onNavigate?: (module: string) => void;
  onAddNotification?: (notif: NotificationItem) => void;
  preselectedStudentId?: string;
  currentUser?: any;
}

export const INITIAL_FEE_OPTIONS = INITIAL_FEE_OPTIONS_DATA;

export const INITIAL_INCOME_EXPENSES: IncomeExpenseItem[] = [];

export const INITIAL_AUDIT_LOGS: FinancialAuditItem[] = [];

export default function FeeManager({
  activeModule,
  students,
  bills: initialBills,
  payments: initialPayments,
  classFeeTariffs: initialTariffs,
  onAddPayment,
  onUpdateBills,
  onNavigate,
  onAddNotification,
  preselectedStudentId,
  currentUser
}: FeeManagerProps) {
  const [feeOptions, setFeeOptions] = useState<FeeOptionItem[]>(INITIAL_FEE_OPTIONS);
  const [billsList, setBillsList] = useState<StudentBill[]>(initialBills);
  const [paymentsList, setPaymentsList] = useState<PaymentRecord[]>(initialPayments);
  const [classTariffs, setClassTariffs] = useState<ClassFeeTariffItem[]>(initialTariffs);
  const [incomeExpenses, setIncomeExpenses] = useState<IncomeExpenseItem[]>(() => {
    try {
      const expenses = getStoredExpenses();
      if (expenses && expenses.length > 0) {
        return expenses.map(e => ({
          id: e.id,
          date: e.date,
          type: 'Expense' as const,
          category: e.category,
          amount: e.amount,
          description: e.title || e.description || '',
          referenceNo: e.referenceNo || e.voucherNo || `EXP-${e.id.slice(0, 6)}`,
          recordedBy: e.recordedBy || 'Accountant'
        }));
      }
    } catch {}
    return [];
  });
  const [auditLogs, setAuditLogs] = useState<FinancialAuditItem[]>([]);

  // Modals
  const [showAddFeeModal, setShowAddFeeModal] = useState(false);
  const [editingFee, setEditingFee] = useState<FeeOptionItem | null>(null);

  const [showAddTxnModal, setShowAddTxnModal] = useState(false);
  const [editingTxn, setEditingTxn] = useState<IncomeExpenseItem | null>(null);

  const [activeReceipt, setActiveReceipt] = useState<PaymentRecord | null>(null);
  const [showA6Receipt, setShowA6Receipt] = useState(false);

  // Refund Management State
  const [refundsList, setRefundsList] = useState<FeeRefundRecord[]>(() => getStoredRefunds());
  const [showAddRefundModal, setShowAddRefundModal] = useState(false);
  const [refundStudentId, setRefundStudentId] = useState('');
  const [refundAmount, setRefundAmount] = useState<number>(50);
  const [refundReason, setRefundReason] = useState<'Overpayment' | 'Withdrawal / Relocation' | 'Duplicate Payment' | 'Fee Adjustment / Waiver' | 'Other'>('Overpayment');
  const [refundMethod, setRefundMethod] = useState<'Cash' | 'Mobile money' | 'Bank Transfer' | 'Cheque'>('Cash');
  const [refundNotes, setRefundNotes] = useState('');
  const [refundFilterStatus, setRefundFilterStatus] = useState('All');
  const [refundSearch, setRefundSearch] = useState('');
  const [isProcessingRefund, setIsProcessingRefund] = useState(false);
  const [refundToast, setRefundToast] = useState<string | null>(null);
  const [selectedBillingClass, setSelectedBillingClass] = useState<string>('All');

  React.useEffect(() => {
    if (initialBills) setBillsList(initialBills);
  }, [initialBills]);

  React.useEffect(() => {
    if (initialPayments) setPaymentsList(initialPayments);
  }, [initialPayments]);

  React.useEffect(() => {
    if (initialTariffs) setClassTariffs(initialTariffs);
  }, [initialTariffs]);

  React.useEffect(() => {
    const unsub = subscribeRefunds((items) => {
      setRefundsList(items);
    });
    return () => unsub();
  }, []);

  const triggerRefundToast = (msg: string) => {
    setRefundToast(msg);
    setTimeout(() => setRefundToast(null), 3500);
  };

  const handleSaveRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundStudentId) {
      alert('Please select a student for this refund.');
      return;
    }
    if (refundAmount <= 0) {
      alert('Please enter a valid refund amount greater than 0.');
      return;
    }

    const targetStudent = students.find(s => s.id === refundStudentId);
    if (!targetStudent) {
      alert('Selected student could not be located.');
      return;
    }

    setIsProcessingRefund(true);
    try {
      const voucherNo = `REF-${new Date().getFullYear()}-${String(refundsList.length + 1).padStart(3, '0')}`;
      const newRefund: FeeRefundRecord = {
        id: `ref-${Date.now()}`,
        refundVoucherNo: voucherNo,
        studentId: targetStudent.id,
        studentName: targetStudent.fullName,
        admissionNo: targetStudent.admissionNo,
        className: targetStudent.className,
        amount: refundAmount,
        date: new Date().toISOString().split('T')[0],
        refundMethod,
        reason: refundReason,
        approvedBy: currentUser?.name || 'Bursar / Accountant',
        processedBy: currentUser?.name || 'Finance Office',
        status: 'Approved',
        notes: refundNotes.trim() || undefined,
        campus: targetStudent.campus || 'JIPAS 1',
        createdAt: new Date().toISOString()
      };

      await saveRefund(newRefund);

      // Adjust student's bill balance: reduce the paid amount on the bill
      if (onUpdateBills) {
        const studentBill = billsList.find(b => b.studentId === targetStudent.id || b.admissionNo === targetStudent.admissionNo);
        if (studentBill) {
          const newPaid = Math.max(0, (studentBill.paid || 0) - refundAmount);
          const newBalance = Math.max(0, (studentBill.payable || 0) - newPaid);
          const updatedBill: StudentBill = {
            ...studentBill,
            paid: newPaid,
            balance: newBalance,
            status: newBalance === 0 ? 'Fully Paid' : newPaid > 0 ? 'Partially Paid' : 'Unpaid',
            history: [
              ...(studentBill.history || []),
              {
                type: 'Refund Voucher Issued',
                amount: refundAmount,
                date: new Date().toISOString(),
                user: currentUser?.name || 'Accountant',
                reason: `${refundReason} (${voucherNo})`
              }
            ]
          };
          const newBills = billsList.map(b => b.id === updatedBill.id ? updatedBill : b);
          setBillsList(newBills);
          onUpdateBills(newBills);
        }
      }

      triggerRefundToast(`✓ Refund voucher ${voucherNo} for ${targetStudent.fullName} (${refundAmount} CFA) processed!`);
      setShowAddRefundModal(false);
      setRefundStudentId('');
      setRefundAmount(50);
      setRefundNotes('');
    } catch (err: any) {
      alert('Failed to process refund: ' + err.message);
    } finally {
      setIsProcessingRefund(false);
    }
  };

  const handlePrintRefundVoucher = (refund: FeeRefundRecord) => {
    const html = `
      <div style="font-family: sans-serif; padding: 30px; color: #0f172a; max-width: 650px; margin: 0 auto; border: 2px solid #e2e8f0; border-radius: 12px;">
        <div style="text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 20px;">
          <h1 style="margin: 0; font-size: 18px; color: #1e3a8a;">JOY INTERNATIONAL SCHOOL (JIPAS)</h1>
          <p style="margin: 4px 0; font-size: 11px; color: #64748b;">FINANCIAL BURSARY & REVENUE MANAGEMENT OFFICE</p>
          <h2 style="margin: 6px 0 0 0; font-size: 14px; font-weight: bold; color: #b91c1c;">OFFICIAL FEE REFUND & DISBURSEMENT VOUCHER</h2>
        </div>

        <div style="display: flex; justify-content: space-between; margin-bottom: 15px; font-size: 11px;">
          <div>
            <p style="margin: 3px 0;"><strong>Voucher No:</strong> <span style="font-family: monospace; font-weight: bold; color: #b91c1c;">${refund.refundVoucherNo}</span></p>
            <p style="margin: 3px 0;"><strong>Date Issued:</strong> ${refund.date}</p>
            <p style="margin: 3px 0;"><strong>Disbursement Method:</strong> ${refund.refundMethod}</p>
          </div>
          <div style="text-align: right;">
            <p style="margin: 3px 0;"><strong>Status:</strong> <span style="color: #047857; font-weight: bold;">${refund.status}</span></p>
            <p style="margin: 3px 0;"><strong>Campus:</strong> ${refund.campus || 'JIPAS 1'}</p>
            <p style="margin: 3px 0;"><strong>Approved By:</strong> ${refund.approvedBy}</p>
          </div>
        </div>

        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 20px; font-size: 11px;">
          <p style="margin: 3px 0;"><strong>Student Full Name:</strong> ${refund.studentName}</p>
          <p style="margin: 3px 0;"><strong>Admission Number:</strong> ${refund.admissionNo}</p>
          <p style="margin: 3px 0;"><strong>Class / Stream:</strong> ${refund.className}</p>
          <p style="margin: 3px 0;"><strong>Refund Reason:</strong> ${refund.reason}</p>
          ${refund.notes ? `<p style="margin: 3px 0;"><strong>Internal Notes:</strong> ${refund.notes}</p>` : ''}
        </div>

        <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 15px; text-align: center; margin-bottom: 25px;">
          <p style="margin: 0; font-size: 11px; text-transform: uppercase; font-weight: bold; color: #991b1b;">Total Refund Amount Paid Out</p>
          <h2 style="margin: 5px 0 0 0; font-size: 24px; font-weight: 900; color: #b91c1c; font-family: monospace;">
            ${refund.amount.toLocaleString()} CFA
          </h2>
        </div>

        <div style="display: flex; justify-content: space-between; margin-top: 40px; font-size: 10px;">
          <div style="text-align: center; width: 180px; border-top: 1px solid #0f172a; padding-top: 5px;">
            Authorized Bursar / Accountant
          </div>
          <div style="text-align: center; width: 180px; border-top: 1px solid #0f172a; padding-top: 5px;">
            Parent / Guardian Signature
          </div>
        </div>
      </div>
    `;
    printContent(html, `JIPAS_Refund_${refund.refundVoucherNo}`);
  };

  // Fee Form State
  const [feeName, setFeeName] = useState('');
  const [feeCat, setFeeCat] = useState<'Tuition' | 'PTA' | 'ICT' | 'Exams' | 'Maintenance' | 'Transport' | 'Uniform'>('Tuition');
  const [feeAmount, setFeeAmount] = useState(100);
  const [feeClass, setFeeClass] = useState('All Classes');
  const [feeMandatory, setFeeMandatory] = useState(true);

  // Fee Collection Form State
  const [collectStudentId, setCollectStudentId] = useState(() => {
    if (preselectedStudentId) return preselectedStudentId;
    return students[0]?.id || '';
  });
  const [collectAmount, setCollectAmount] = useState(300);
  const [collectMethod, setCollectMethod] = useState<'Cash' | 'Bank' | 'Mobile Money' | 'Cheque'>('Mobile Money');
  const [collectPaidAs, setCollectPaidAs] = useState('Tuition Fee (Full Term Payment)');
  const [collectRef, setCollectRef] = useState('');
  const [collectToast, setCollectToast] = useState(false);

  // Hierarchical Filter States for Fee Payment
  const [paymentDept, setPaymentDept] = useState<string>('All');
  const [customDeptInput, setCustomDeptInput] = useState<string>('');
  const [paymentClass, setPaymentClass] = useState<string>('All');
  const [studentRosterSearch, setStudentRosterSearch] = useState<string>('');

  // Sync preselected student when it changes
  React.useEffect(() => {
    if (preselectedStudentId) {
      setCollectStudentId(preselectedStudentId);
    }
  }, [preselectedStudentId]);

  // Extract departments from stored data and student records
  const availableDepartments = React.useMemo(() => {
    const stored = getStoredDepartments().map(d => d.name);
    const fromStudents = students.map(s => s.department).filter(Boolean);
    const list = Array.from(new Set([...stored, ...fromStudents]));
    return list.length > 0 ? list : ['Pre School', 'Primary School', 'Junior High School', 'Senior High School'];
  }, [students]);

  // Extract classes (filtered by selected department if not 'All')
  const availableClasses = React.useMemo(() => {
    const allStoredClasses = getStoredClasses();
    const effectiveDept = customDeptInput.trim() || paymentDept;
    
    if (effectiveDept && effectiveDept !== 'All') {
      const matchingStored = allStoredClasses.filter(c => {
        const deptItem = getStoredDepartments().find(d => d.name === effectiveDept || d.name === c.department || d.id === (c as any).departmentId);
        return (c.department && c.department.toLowerCase() === effectiveDept.toLowerCase()) ||
               (deptItem && (c as any).departmentId === deptItem.id) ||
               ((c as any).departmentName === effectiveDept);
      }).map(c => c.name);

      const matchingFromStudents = students
        .filter(s => s.department?.toLowerCase() === effectiveDept.toLowerCase())
        .map(s => s.className)
        .filter(Boolean);

      let classList = Array.from(new Set([...matchingStored, ...matchingFromStudents]));

      if (classList.length === 0) {
        const lower = effectiveDept.toLowerCase();
        if (lower.includes('primary')) {
          classList = ['Basic 1', 'Basic 2', 'Basic 3', 'Basic 4', 'Basic 5', 'Basic 6'];
        } else if (lower.includes('junior') || lower.includes('jhs')) {
          classList = ['JHS 1', 'JHS 2', 'JHS 3'];
        } else if (lower.includes('pre') || lower.includes('nursery') || lower.includes('creche') || lower.includes('kg')) {
          classList = ['Creche', 'Nursery 1', 'Nursery 2', 'KG 1', 'KG 2'];
        } else if (lower.includes('senior') || lower.includes('shs')) {
          classList = ['SHS 1', 'SHS 2', 'SHS 3'];
        }
      }

      if (classList.length > 0) return classList;
    }

    const allStudentClasses = students.map(s => s.className).filter(Boolean);
    return Array.from(new Set([...allStoredClasses.map(c => c.name), ...allStudentClasses]));
  }, [students, paymentDept, customDeptInput]);

  // Filtered students for fee payment based on department, class, and name search
  const filteredStudentsForPayment = React.useMemo(() => {
    const effectiveDept = customDeptInput.trim() || paymentDept;

    return students.filter(st => {
      // Department filter
      if (effectiveDept && effectiveDept !== 'All') {
        const deptMatches = 
          (st.department && st.department.toLowerCase().includes(effectiveDept.toLowerCase())) ||
          (effectiveDept.toLowerCase().includes('primary') && st.className?.toLowerCase().includes('basic')) ||
          (effectiveDept.toLowerCase().includes('junior') && st.className?.toLowerCase().includes('jhs')) ||
          (effectiveDept.toLowerCase().includes('pre') && (st.className?.toLowerCase().includes('kg') || st.className?.toLowerCase().includes('nursery') || st.className?.toLowerCase().includes('creche'))) ||
          (effectiveDept.toLowerCase().includes('senior') && st.className?.toLowerCase().includes('shs'));
        if (!deptMatches) return false;
      }

      // Class level filter
      if (paymentClass !== 'All') {
        if (st.className !== paymentClass) return false;
      }

      // Search query (search students by name, admission no, or roll no)
      if (studentRosterSearch.trim()) {
        const query = studentRosterSearch.toLowerCase();
        const matchesName = st.fullName.toLowerCase().includes(query);
        const matchesAdm = st.admissionNo.toLowerCase().includes(query);
        const matchesRoll = st.rollNo?.toLowerCase().includes(query);
        if (!matchesName && !matchesAdm && !matchesRoll) return false;
      }

      return true;
    });
  }, [students, paymentDept, customDeptInput, paymentClass, studentRosterSearch]);

  const handleStudentSelect = (studentId: string) => {
    setCollectStudentId(studentId);
    const bill = billsList.find(b => b.studentId === studentId || b.admissionNo === students.find(s => s.id === studentId)?.admissionNo);
    if (bill && bill.balance > 0) {
      setCollectAmount(bill.balance);
    } else {
      setCollectAmount(715);
    }
  };

  const selectedStudent = students.find(s => s.id === collectStudentId) || students[0];
  const selectedBill = billsList.find(b => b.studentId === selectedStudent?.id || b.admissionNo === selectedStudent?.admissionNo);

  // Income Expense Form State
  const [ieType, setIeType] = useState<'Income' | 'Expense'>('Income');
  const [ieCat, setIeCat] = useState('Tuition Fees');
  const [ieAmount, setIeAmount] = useState(250);
  const [ieDesc, setIeDesc] = useState('');
  const [ieRef, setIeRef] = useState('');

  // Bill Generation State
  const [billGenClass, setBillGenClass] = useState('Basic 1');
  const [billGenToast, setBillGenToast] = useState(false);

  // Filter & Search
  const [paymentSearch, setPaymentSearch] = useState('');
  const [ieFilter, setIeFilter] = useState('all');

  // Open Edit Fee Option
  const handleOpenEditFee = (fo: FeeOptionItem) => {
    setEditingFee(fo);
    setFeeName(fo.name);
    setFeeCat(fo.category);
    setFeeAmount(fo.amount);
    setFeeClass(fo.applicableClass);
    setFeeMandatory(fo.mandatory);
    setShowAddFeeModal(true);
  };

  // Save Fee Option
  const handleSaveFeeOption = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feeName.trim()) return;

    if (editingFee) {
      setFeeOptions(prev => prev.map(f => f.id === editingFee.id ? {
        ...f,
        name: feeName,
        category: feeCat,
        amount: feeAmount,
        applicableClass: feeClass,
        mandatory: feeMandatory
      } : f));
      setEditingFee(null);
    } else {
      const newOption: FeeOptionItem = {
        id: `fo-${Date.now()}`,
        name: feeName,
        category: feeCat,
        amount: feeAmount,
        applicableClass: feeClass,
        mandatory: feeMandatory
      };
      setFeeOptions(prev => [...prev, newOption]);
      setShowAddFeeModal(false);
    }
  };

  // Execute Fee Collection
  const handleCollectFee = (e: React.FormEvent) => {
    e.preventDefault();
    const student = students.find(s => s.id === collectStudentId) || students[0];
    if (!student || collectAmount <= 0) return;

    const receiptNo = `REC/2026/${Math.floor(100000 + Math.random() * 900000)}`;
    const newPayment: PaymentRecord = {
      id: `p-${Date.now()}`,
      receiptNo,
      studentId: student.id,
      admissionNo: student.admissionNo,
      studentName: student.fullName,
      className: student.className,
      paidAs: collectPaidAs,
      amount: collectAmount,
      paid: collectAmount,
      date: new Date().toISOString().split('T')[0],
      academicYear: '2025-2026',
      term: 'Third Term',
      method: collectMethod,
      receivedBy: 'Accountant (Grace Tetteh)',
      status: 'Verified',
      description: collectPaidAs
    };

    setPaymentsList(prev => [newPayment, ...prev]);
    
    // Save payment to DB and local storage
    savePayment(newPayment).catch(err => console.warn('savePayment notice in FeeManager:', err));
    onAddPayment(newPayment);

    // Show Official Receipt Preview in App
    setActiveReceipt(newPayment);

    // Update bills list & persist
    let targetBill: StudentBill | null = null;
    const currentStoredBills = getStoredBills();
    const updatedBills = (currentStoredBills.length > 0 ? currentStoredBills : billsList).map(b => {
      const matchById = student.id && b.studentId && b.studentId === student.id;
      const matchByAdm = student.admissionNo && b.admissionNo && b.admissionNo.trim().toUpperCase() === student.admissionNo.trim().toUpperCase();
      if (matchById || matchByAdm) {
        const currentPaid = b.paid ?? b.paidAmount ?? 0;
        const currentPayable = b.payable ?? b.totalAmount ?? 0;
        const newPaid = currentPaid + collectAmount;
        const newBal = Math.max(0, currentPayable - newPaid);
        const statusStr = newBal === 0 ? 'Fully Paid' : (newPaid > 0 ? 'Partially Paid' : 'Unpaid');
        const updatedB = {
          ...b,
          paid: newPaid,
          paidAmount: newPaid,
          balance: newBal,
          status: statusStr as any
        };
        targetBill = updatedB;
        return updatedB;
      }
      return b;
    });

    setBillsList(updatedBills);
    saveStoredBills(updatedBills);
    if (targetBill) {
      saveBill(targetBill).catch(err => console.warn('saveBill notice in FeeManager:', err));
    }
    if (onUpdateBills) {
      onUpdateBills(updatedBills);
    }
    
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('jipas_cloud_synced'));
    }

    // Record Income Transaction
    const newIncome: IncomeExpenseItem = {
      id: `ie-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      type: 'Income',
      category: 'Tuition Fees',
      amount: collectAmount,
      description: `Fee Payment from ${student.fullName} (${receiptNo})`,
      referenceNo: collectRef || receiptNo,
      recordedBy: 'Accountant'
    };
    setIncomeExpenses(prev => [newIncome, ...prev]);

    // Record Audit
    const newAudit: FinancialAuditItem = {
      id: `fa-${Date.now()}`,
      timestamp: new Date().toLocaleString(),
      action: 'Fee Payment Received',
      user: 'Accountant (Grace Tetteh)',
      studentAdmNo: student.admissionNo,
      amount: collectAmount,
      details: `Collected ${(collectAmount ?? 0).toFixed(2)} CFA via ${collectMethod} for ${student.fullName}`
    };
    setAuditLogs(prev => [newAudit, ...prev]);

    setCollectToast(true);
    setTimeout(() => setCollectToast(false), 4000);
  };

  // Generate All Bills
  const handleGenerateBatchBills = () => {
    setBillGenToast(true);
    setTimeout(() => setBillGenToast(false), 4000);
  };

  // Save Income / Expense
  const handleSaveTxn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ieDesc.trim()) return;

    if (editingTxn) {
      setIncomeExpenses(prev => prev.map(t => t.id === editingTxn.id ? {
        ...t,
        type: ieType,
        category: ieCat,
        amount: ieAmount,
        description: ieDesc,
        referenceNo: ieRef || t.referenceNo
      } : t));
      setEditingTxn(null);
    } else {
      const newTxn: IncomeExpenseItem = {
        id: `ie-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        type: ieType,
        category: ieCat,
        amount: ieAmount,
        description: ieDesc,
        referenceNo: ieRef || `REF-${Math.floor(1000 + Math.random() * 9000)}`,
        recordedBy: 'Administrator'
      };
      setIncomeExpenses(prev => [newTxn, ...prev]);
      setShowAddTxnModal(false);
    }
  };

  // Compute Totals
  const totalIncome = incomeExpenses.filter(i => i.type === 'Income').reduce((sum, i) => sum + i.amount, 0);
  const totalExpense = incomeExpenses.filter(i => i.type === 'Expense').reduce((sum, i) => sum + i.amount, 0);
  const netBalance = totalIncome - totalExpense;

  const totalBilled = billsList.reduce((sum, b) => sum + (b.payable ?? b.totalAmount ?? 0), 0);
  const totalPaid = billsList.reduce((sum, b) => sum + (b.paid ?? b.paidAmount ?? 0), 0);
  const totalOutstanding = billsList.reduce((sum, b) => sum + (b.balance ?? 0), 0);

  const filteredPayments = paymentsList.filter(p => 
    p.studentName.toLowerCase().includes(paymentSearch.toLowerCase()) ||
    p.admissionNo.toLowerCase().includes(paymentSearch.toLowerCase()) ||
    p.receiptNo.toLowerCase().includes(paymentSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* OVERDUE FEE ALERTS MODULE */}
      {(activeModule === 'fee_overdue_alerts' || activeModule === 'overdue_alerts') && (
        <OverdueFeeAlertsManager
          students={students}
          bills={billsList}
          payments={paymentsList}
          onAddNotification={onAddNotification}
          onUpdateBills={onUpdateBills}
          onRecordPaymentClick={(studentId) => {
            setCollectStudentId(studentId);
            const b = billsList.find(x => x.studentId === studentId);
            if (b && b.balance > 0) {
              setCollectAmount(b.balance);
            }
            onNavigate?.('fee_collect');
          }}
        />
      )}

      {/* 1. FEE SETTINGS & TARIFF OPTIONS MODULE */}
      {(activeModule === 'fee_options' || activeModule === 'fee_settings' || activeModule === 'fee_structure' || activeModule === 'fee_descriptions' || activeModule === 'payment_settings' || activeModule === 'payment_channels' || activeModule === 'payment_proofs') && (
        <FeesSettingsManager
          userRole="admin"
          initialTab={
            activeModule === 'payment_proofs'
              ? 'submissions_queue'
              : (activeModule === 'payment_settings' || activeModule === 'payment_channels')
              ? 'payment_methods'
              : 'tariffs'
          }
          feeOptions={feeOptions}
          onUpdateFeeOptions={(newOpts) => setFeeOptions(newOpts)}
          classFeeTariffs={classTariffs}
          onUpdateClassTariffs={(newTariffs) => setClassTariffs(newTariffs)}
          students={students}
          bills={billsList}
          onAddPayment={onAddPayment}
          onAddNotification={onAddNotification}
          onApplyToBills={(updatedOpts) => {
            // Recalculate bills if needed
            handleGenerateBatchBills();
          }}
        />
      )}

      {/* 2. BILL STUDENTS & 3. GENERATE ALL SHEETS */}
      {(activeModule === 'fee_bill_students' || activeModule === 'bill_students' || activeModule === 'fee_generate_sheets' || activeModule === 'fee_generate_all_sheets' || activeModule === 'generate_all_sheets' || activeModule === 'generate_sheets' || activeModule === 'bills') && (() => {
        const uniqueClassesList = Array.from(new Set([
          ...getStoredClasses().map(c => c.name),
          ...billsList.map(b => b.className)
        ])).filter(Boolean);

        const filteredBillsListForBilling = selectedBillingClass === 'All'
          ? billsList
          : billsList.filter(b => b.className === selectedBillingClass);

        return (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  Terminal Fee Invoicing & Master Billing Sheets
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Generate, bill, and print terminal invoices based on academic class levels with tuition, PTA levies, and arrears.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleGenerateBatchBills}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Plus className="w-4 h-4" /> Generate {selectedBillingClass === 'All' ? 'All' : selectedBillingClass} Bills
                </button>
                <button
                  onClick={() => {
                    // Create beautiful print styles for the printable container
                    const printHtml = `
                      <div style="font-family: sans-serif; padding: 20px;">
                        <h2 style="margin-bottom: 5px; color: #1e293b;">JIPAS Students Hub — Master Billing Sheets</h2>
                        <h4 style="margin-top: 0; color: #64748b;">Class Filter: ${selectedBillingClass}</h4>
                        <table style="width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 11px;">
                          <thead>
                            <tr style="background: #0f172a; color: #ffffff; text-align: left;">
                              <th style="padding: 8px; border: 1px solid #cbd5e1;">#</th>
                              <th style="padding: 8px; border: 1px solid #cbd5e1;">Bill No</th>
                              <th style="padding: 8px; border: 1px solid #cbd5e1;">Admission No</th>
                              <th style="padding: 8px; border: 1px solid #cbd5e1;">Student Name</th>
                              <th style="padding: 8px; border: 1px solid #cbd5e1;">Class</th>
                              <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: right;">Total Billed (CFA)</th>
                              <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: right;">Paid (CFA)</th>
                              <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: right;">Balance Due (CFA)</th>
                              <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            ${filteredBillsListForBilling.map((bill, index) => `
                              <tr style="border-bottom: 1px solid #e2e8f0;">
                                <td style="padding: 8px; border: 1px solid #cbd5e1;">${index + 1}</td>
                                <td style="padding: 8px; border: 1px solid #cbd5e1;">${bill.billNo}</td>
                                <td style="padding: 8px; border: 1px solid #cbd5e1;">${bill.admissionNo}</td>
                                <td style="padding: 8px; border: 1px solid #cbd5e1; font-weight: bold;">${bill.studentName}</td>
                                <td style="padding: 8px; border: 1px solid #cbd5e1;">${bill.className}</td>
                                <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: right;">${(bill.payable ?? bill.totalAmount ?? 0).toFixed(2)}</td>
                                <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: right; color: #047857;">${(bill.paid ?? bill.paidAmount ?? 0).toFixed(2)}</td>
                                <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: right; color: #be123c; font-weight: bold;">${(bill.balance ?? 0).toFixed(2)}</td>
                                <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;">${bill.status}</td>
                              </tr>
                            `).join('')}
                          </tbody>
                        </table>
                      </div>
                    `;
                    printContent(printHtml);
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Printer className="w-4 h-4" /> Print Master Bill Sheets
                </button>
              </div>
            </div>

            {/* Class Filter Bar */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Select Class Level Filter</span>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={selectedBillingClass}
                  onChange={(e) => setSelectedBillingClass(e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold bg-white text-slate-800 focus:ring-2 focus:ring-indigo-500 shadow-2xs cursor-pointer min-w-48"
                >
                  <option value="All">All Classes ({uniqueClassesList.length})</option>
                  {uniqueClassesList.map(cls => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>
                {selectedBillingClass !== 'All' && (
                  <button
                    onClick={() => setSelectedBillingClass('All')}
                    className="p-2 text-slate-400 hover:text-slate-600 text-xs"
                    title="Clear Filter"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {billGenToast && (
              <div className="bg-emerald-600 text-white px-4 py-3 rounded-xl text-xs font-bold flex items-center justify-between shadow-sm animate-fade-in">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Terminal invoices successfully computed and generated for {selectedBillingClass === 'All' ? 'all active' : selectedBillingClass} students!
                </span>
                <button onClick={() => setBillGenToast(false)} className="text-white font-black ml-4">✕</button>
              </div>
            )}

            {/* Billing Overview Table */}
            <div className="border border-slate-200 rounded-xl overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-900 text-white uppercase text-[10px] font-bold">
                  <tr>
                    <th className="p-3">#</th>
                    <th className="p-3">Bill No</th>
                    <th className="p-3">Admission No</th>
                    <th className="p-3">Student Name</th>
                    <th className="p-3">Class</th>
                    <th className="p-3 text-right">Total Billed (CFA)</th>
                    <th className="p-3 text-right">Paid (CFA)</th>
                    <th className="p-3 text-right">Balance Due (CFA)</th>
                    <th className="p-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredBillsListForBilling.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-500 font-bold">
                        No billing sheet records found for {selectedBillingClass === 'All' ? 'the selected campus' : `Class ${selectedBillingClass}`}.
                      </td>
                    </tr>
                  ) : (
                    filteredBillsListForBilling.map((bill, idx) => (
                      <tr key={bill.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-mono text-slate-400">{idx + 1}</td>
                        <td className="p-3 font-mono font-bold text-slate-800">{bill.billNo}</td>
                        <td className="p-3 font-mono font-bold text-indigo-700">{bill.admissionNo}</td>
                        <td className="p-3 font-bold text-slate-900">{bill.studentName}</td>
                        <td className="p-3 text-slate-700">{bill.className}</td>
                        <td className="p-3 text-right font-mono font-bold text-slate-900">{(bill.payable ?? bill.totalAmount ?? 0).toFixed(2)} CFA</td>
                        <td className="p-3 text-right font-mono font-bold text-emerald-700">{(bill.paid ?? bill.paidAmount ?? 0).toFixed(2)} CFA</td>
                        <td className="p-3 text-right font-mono font-black text-rose-700">{(bill.balance ?? 0).toFixed(2)} CFA</td>
                        <td className="p-3 text-center">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            bill.status === 'Paid' ? 'bg-emerald-100 text-emerald-800' :
                            bill.status === 'Partial' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {bill.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* 4. FEE COLLECTION MODULE */}
      {(activeModule === 'fee_collection' || activeModule === 'collect_fees') && (
        <div className="space-y-6">
          {/* Header Card with Hierarchical Filters */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                    Real-Time Terminal
                  </span>
                  <span className="text-xs text-slate-400 font-medium">Department & Class Level Hierarchy</span>
                </div>
                <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-emerald-600" />
                  Record Real-Time Fee Payment
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Select or enter the academic department, choose the class level, inspect the student roster or search students by name to record instant fee receipts.
                </p>
              </div>

              {/* Quick Status Pill */}
              <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 px-4 py-2 rounded-2xl">
                <Users className="w-4 h-4 text-cyan-600" />
                <div className="text-xs">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Roster In View</span>
                  <span className="font-extrabold text-slate-900">{filteredStudentsForPayment.length} Students</span>
                </div>
              </div>
            </div>

            {/* Hierarchical Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-5">
              {/* 1. Department Filter */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-cyan-600" />
                  1. Department Level
                </label>
                <div className="space-y-2">
                  <select
                    value={paymentDept}
                    onChange={(e) => {
                      setPaymentDept(e.target.value);
                      setCustomDeptInput('');
                      setPaymentClass('All');
                    }}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-xs font-bold bg-white text-slate-800 focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                  >
                    <option value="All">All Departments</option>
                    {availableDepartments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>

                  <input
                    type="text"
                    placeholder="Or enter custom department..."
                    value={customDeptInput}
                    onChange={(e) => {
                      setCustomDeptInput(e.target.value);
                      if (e.target.value.trim()) {
                        setPaymentDept('Custom');
                      } else {
                        setPaymentDept('All');
                      }
                    }}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 text-slate-700 focus:bg-white focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* 2. Class Level Filter */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-cyan-600" />
                  2. Class Level
                </label>
                <select
                  value={paymentClass}
                  onChange={(e) => setPaymentClass(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-xs font-bold bg-white text-slate-800 focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                >
                  <option value="All">All Classes ({availableClasses.length})</option>
                  {availableClasses.map(cls => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>

                {/* Quick Class Pills */}
                <div className="flex flex-wrap gap-1 pt-1 max-h-16 overflow-y-auto">
                  <button
                    type="button"
                    onClick={() => setPaymentClass('All')}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold cursor-pointer transition-colors ${
                      paymentClass === 'All' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    All
                  </button>
                  {availableClasses.slice(0, 5).map(cls => (
                    <button
                      key={cls}
                      type="button"
                      onClick={() => setPaymentClass(cls)}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold cursor-pointer transition-colors ${
                        paymentClass === cls ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {cls}
                    </button>
                  ))}
                  {availableClasses.length > 5 && (
                    <span className="text-[10px] text-slate-400 self-center">+{availableClasses.length - 5} more</span>
                  )}
                </div>
              </div>

              {/* 3. Search Student by Name */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5 text-cyan-600" />
                  3. Search Student
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search by student name or ID..."
                    value={studentRosterSearch}
                    onChange={(e) => setStudentRosterSearch(e.target.value)}
                    className="w-full pl-9 pr-8 py-2.5 border border-slate-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-emerald-500 shadow-2xs font-medium"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  {studentRosterSearch && (
                    <button
                      type="button"
                      onClick={() => setStudentRosterSearch('')}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 text-xs font-bold"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                  <span>Filtered: <strong>{filteredStudentsForPayment.length}</strong> of {students.length}</span>
                  {(paymentDept !== 'All' || paymentClass !== 'All' || studentRosterSearch) && (
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentDept('All');
                        setCustomDeptInput('');
                        setPaymentClass('All');
                        setStudentRosterSearch('');
                      }}
                      className="text-emerald-700 hover:underline font-bold"
                    >
                      Reset Filters
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {collectToast && (
            <div className="bg-emerald-600 text-white px-4 py-3 rounded-xl text-xs font-bold flex items-center justify-between shadow-sm animate-fade-in">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Payment of {(collectAmount ?? 0).toFixed(2)} CFA successfully logged! Bill balance adjusted and receipt generated.
              </span>
              <button onClick={() => setCollectToast(false)} className="text-white font-black ml-4">✕</button>
            </div>
          )}

          {/* Main 2-Column Grid: Left = Class Roster Directory, Right = Payment Entry Form */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Student Roster List */}
            <div className="lg:col-span-6 bg-white rounded-3xl shadow-sm border border-slate-200 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-600" />
                  <h4 className="text-sm font-black text-slate-900">
                    Class Roster Directory
                  </h4>
                </div>
                <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                  Click student to record payment
                </span>
              </div>

              {filteredStudentsForPayment.length === 0 ? (
                <div className="text-center py-12 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                  <Users className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-700">No students match current filters</p>
                  <p className="text-xs text-slate-500 mt-1">Try selecting a different department, class or clearing the search keyword.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentDept('All');
                      setCustomDeptInput('');
                      setPaymentClass('All');
                      setStudentRosterSearch('');
                    }}
                    className="mt-3 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700"
                  >
                    Clear All Filters
                  </button>
                </div>
              ) : (
                <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
                  {filteredStudentsForPayment.map(st => {
                    const studentBill = billsList.find(b => b.studentId === st.id || b.admissionNo === st.admissionNo);
                    const isSelected = st.id === selectedStudent?.id;
                    const balance = studentBill ? studentBill.balance : 715;
                    const hasArrears = balance > 0;

                    return (
                      <div
                        key={st.id}
                        onClick={() => handleStudentSelect(st.id)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                            : 'bg-white hover:bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                            isSelected
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {(st.fullName || '').slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h5 className="text-xs font-extrabold text-slate-900 truncate">
                                {st.fullName}
                              </h5>
                              {isSelected && (
                                <span className="text-[9px] bg-emerald-600 text-white font-black px-1.5 py-0.2 rounded-sm uppercase">
                                  Selected
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                              <span className="font-mono text-slate-600 font-bold">{st.admissionNo}</span>
                              <span>•</span>
                              <span className="bg-slate-100 text-slate-700 font-semibold px-1.5 py-0.2 rounded">
                                {st.className}
                              </span>
                              {st.department && (
                                <>
                                  <span>•</span>
                                  <span className="text-slate-400 truncate max-w-[100px]">{st.department}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Balance Badge */}
                        <div className="text-right shrink-0">
                          {hasArrears ? (
                            <span className="text-[11px] font-black text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg block">
                              {(balance ?? 0).toFixed(2)} CFA
                              <span className="block text-[9px] font-medium text-rose-500 uppercase">Balance Due</span>
                            </span>
                          ) : (
                            <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg block">
                              ✓ Fully Paid
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right Column: Active Payment Terminal & Form */}
            <div className="lg:col-span-6 space-y-4">
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 space-y-5">
                <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                  <div>
                    <h4 className="text-base font-black text-slate-900">Payment Details</h4>
                    <p className="text-xs text-slate-500">Selected student billing information</p>
                  </div>
                  {selectedStudent && (
                    <span className="bg-cyan-100 text-cyan-800 text-[10px] font-black px-2.5 py-1 rounded-full uppercase">
                      {selectedStudent.className}
                    </span>
                  )}
                </div>

                {selectedStudent ? (
                  <form onSubmit={handleCollectFee} className="space-y-4">
                    {/* Selected Student Banner */}
                    <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-4 rounded-2xl shadow-sm space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold">Selected Student</span>
                          <h4 className="text-base font-black text-white">{selectedStudent.fullName}</h4>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] uppercase text-slate-400 font-medium">Admission ID</span>
                          <p className="text-xs font-mono font-bold text-slate-200">{selectedStudent.admissionNo}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-700/60 text-xs">
                        <div>
                          <span className="text-slate-400 block text-[10px]">Class Level</span>
                          <span className="font-bold text-white">{selectedStudent.className}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Department</span>
                          <span className="font-bold text-white truncate block">{selectedStudent.department || 'General'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Guardian Phone</span>
                          <span className="font-bold text-white">{selectedStudent.parentPhone || 'N/A'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Financial Bill Status Card */}
                    {selectedBill && (
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <div>
                            <span className="text-slate-500 block text-[10px] uppercase font-bold">Billing Term</span>
                            <span className="font-bold text-slate-800">{selectedBill.className} • 2025-2026 Third Term</span>
                          </div>
                          <div className="text-right">
                            <span className="text-slate-500 block text-[10px] uppercase font-bold">Remaining Arrears</span>
                            <span className="font-mono font-black text-rose-600 text-base">{(selectedBill.balance ?? 0).toFixed(2)} CFA</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200 text-center text-xs">
                          <div className="bg-white p-2 rounded-xl border border-slate-200">
                            <span className="text-[10px] text-slate-400 uppercase block font-bold">Payable</span>
                            <span className="font-bold text-slate-800">{(selectedBill.payable ?? selectedBill.totalAmount ?? 0).toFixed(2)} CFA</span>
                          </div>
                          <div className="bg-white p-2 rounded-xl border border-slate-200">
                            <span className="text-[10px] text-slate-400 uppercase block font-bold">Paid to Date</span>
                            <span className="font-bold text-emerald-600">{(selectedBill.paid ?? selectedBill.paidAmount ?? 0).toFixed(2)} CFA</span>
                          </div>
                          <div className="bg-white p-2 rounded-xl border border-slate-200">
                            <span className="text-[10px] text-slate-400 uppercase block font-bold">Net Balance</span>
                            <span className="font-black text-rose-600">{(selectedBill.balance ?? 0).toFixed(2)} CFA</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Amount Paid input */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold text-slate-700 uppercase">
                          Amount Paid (CFA) *
                        </label>
                        {selectedBill && selectedBill.balance > 0 && (
                          <div className="flex gap-1.5">
                            <button
                              type="button"
                              onClick={() => setCollectAmount(selectedBill.balance)}
                              className="text-[10px] font-black bg-rose-100 hover:bg-rose-200 text-rose-800 px-2 py-0.5 rounded cursor-pointer transition-colors"
                            >
                              Pay Full Balance ({(selectedBill.balance ?? 0).toFixed(0)} CFA)
                            </button>
                            <button
                              type="button"
                              onClick={() => setCollectAmount(parseFloat(((selectedBill.balance ?? 0) / 2).toFixed(2)))}
                              className="text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded cursor-pointer transition-colors"
                            >
                              50%
                            </button>
                          </div>
                        )}
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={collectAmount}
                        onChange={(e) => setCollectAmount(parseFloat(e.target.value) || 0)}
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl text-base font-black text-emerald-700 bg-white focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                        placeholder="0.00"
                      />
                    </div>

                    {/* Payment Method */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Payment Method *
                      </label>
                      <div className="grid grid-cols-4 gap-2">
                        {([
                          { key: 'Mobile Money', label: 'MoMo' },
                          { key: 'Cash', label: 'Cash' },
                          { key: 'Bank', label: 'Bank' },
                          { key: 'Cheque', label: 'Cheque' }
                        ] as const).map(item => (
                          <button
                            key={item.key}
                            type="button"
                            onClick={() => setCollectMethod(item.key)}
                            className={`py-2 px-1.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer truncate ${
                              collectMethod === item.key
                                ? 'bg-cyan-600 text-white border-cyan-600 shadow-xs'
                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Paid As / Purpose */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                      <PaidAsSelector
                        value={collectPaidAs}
                        onChange={setCollectPaidAs}
                        label="Paid As (Fee Category / Tariff Purpose)"
                        required
                      />
                    </div>

                    {/* Transaction Reference */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Transaction Ref / MoMo Txn ID / Cheque No
                      </label>
                      <input
                        type="text"
                        value={collectRef}
                        onChange={(e) => setCollectRef(e.target.value)}
                        placeholder="e.g. 29384729103 or Cash at Counter"
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-mono text-xs"
                      />
                    </div>

                    {/* Collector Info */}
                    <div className="text-[11px] text-slate-500 flex items-center justify-between bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200">
                      <span>Collector Attribution:</span>
                      <span className="font-bold text-slate-800">
                        Admin Portal Operator
                      </span>
                    </div>

                    {/* Submit Button */}
                    <div className="pt-2">
                      <button
                        type="submit"
                        className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl shadow-lg shadow-emerald-900/20 text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
                      >
                        <Check className="w-4 h-4" /> Process Payment & Issue Official Receipt
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="text-center py-12 text-slate-400">
                    <User className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-xs font-bold">Please select a student from the class roster list to proceed.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. PAYMENT HISTORY MODULE */}
      {(activeModule === 'fee_payment_history' || activeModule === 'payments') && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
          <div className="flex flex-wrap justify-between items-center gap-3 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-indigo-600" />
                Fee Payment Ledger & Historical Receipts
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Full chronological ledger of payments, official receipt numbers, and operator details.
              </p>
            </div>
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Printer className="w-4 h-4" /> Export Payment Log
            </button>
          </div>

          {/* Search */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-wrap gap-4 items-center justify-between text-xs">
            <div className="relative min-w-[280px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={paymentSearch}
                onChange={(e) => setPaymentSearch(e.target.value)}
                placeholder="Search by student, receipt no, admission no..."
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium"
              />
            </div>
            <div className="text-slate-500 font-medium">
              Showing <strong>{filteredPayments.length}</strong> payment transactions
            </div>
          </div>

          {/* Payments Table */}
          <div className="border border-slate-200 rounded-xl overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-900 text-white uppercase text-[10px] font-bold">
                <tr>
                  <th className="p-3">#</th>
                  <th className="p-3">Receipt No</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Student Name</th>
                  <th className="p-3">Class</th>
                  <th className="p-3">Paid As (Description)</th>
                  <th className="p-3">Method</th>
                  <th className="p-3 text-right">Amount (CFA)</th>
                  <th className="p-3">Received By</th>
                  <th className="p-3 text-center">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredPayments.map((p, idx) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-mono text-slate-400">{idx + 1}</td>
                    <td className="p-3 font-mono font-bold text-indigo-700">{p.receiptNo}</td>
                    <td className="p-3 font-mono text-slate-600">{p.date}</td>
                    <td className="p-3 font-bold text-slate-900">{p.studentName}</td>
                    <td className="p-3 text-slate-700">{p.className}</td>
                    <td className="p-3 text-slate-700 font-semibold max-w-[200px] truncate" title={p.paidAs || p.description}>
                      <span className="bg-indigo-50 text-indigo-800 px-2 py-0.5 rounded text-[10px] font-bold border border-indigo-100">
                        {p.paidAs || p.description || 'Tuition Fee'}
                      </span>
                    </td>
                    <td className="p-3 font-semibold">{p.method}</td>
                    <td className="p-3 text-right font-mono font-black text-emerald-700">
                      {(p.amount ?? p.paid ?? 0).toFixed(2)} CFA
                    </td>
                    <td className="p-3 text-slate-600">{p.receivedBy || p.collectedBy}</td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => {
                            setActiveReceipt(p);
                            setShowA6Receipt(false);
                          }}
                          className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold border border-indigo-200 cursor-pointer"
                        >
                          A4 View
                        </button>
                        <button
                          onClick={() => {
                            setActiveReceipt(p);
                            setShowA6Receipt(true);
                          }}
                          className="px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
                        >
                          A6 Print
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

      {/* 6. PAYMENT STATISTICS MODULE */}
      {(activeModule === 'fee_payment_stats' || activeModule === 'finance_stats') && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
            <div className="flex flex-wrap justify-between items-center gap-3 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-indigo-600" />
                  Financial Performance & Revenue Metrics
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Real-time fee collection recovery rate, liquidity position, and outstanding student arrears.
                </p>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-indigo-900 text-white p-5 rounded-2xl shadow-sm">
                <span className="text-3xl font-black font-mono">{(totalBilled ?? 0).toFixed(2)} CFA</span>
                <p className="text-xs uppercase font-bold mt-1 text-indigo-200">Total Billed Invoices</p>
              </div>
              <div className="bg-emerald-600 text-white p-5 rounded-2xl shadow-sm">
                <span className="text-3xl font-black font-mono">{(totalPaid ?? 0).toFixed(2)} CFA</span>
                <p className="text-xs uppercase font-bold mt-1 text-emerald-100">Total Revenue Collected ({(((totalPaid ?? 0) / Math.max(1, totalBilled)) * 100).toFixed(1)}%)</p>
              </div>
              <div className="bg-rose-600 text-white p-5 rounded-2xl shadow-sm">
                <span className="text-3xl font-black font-mono">{(totalOutstanding ?? 0).toFixed(2)} CFA</span>
                <p className="text-xs uppercase font-bold mt-1 text-rose-100">Outstanding Arrears</p>
              </div>
            </div>

            {/* Recharts Visualization Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
              {/* Class-by-Class Fee Collection */}
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-3">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Class-Level Billing & Revenue Realization
                </h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        { className: 'Crèche', billed: 4200, paid: 3900 },
                        { className: 'Nursery 1', billed: 4800, paid: 4400 },
                        { className: 'KG 1', billed: 5200, paid: 4800 },
                        { className: 'Basic 1', billed: 6400, paid: 5900 },
                        { className: 'Basic 3', billed: 6800, paid: 6100 },
                        { className: 'Basic 6', billed: 7200, paid: 6600 },
                        { className: 'JHS 1', billed: 8500, paid: 7800 },
                        { className: 'JHS 3', billed: 9200, paid: 8400 },
                      ]}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="className" stroke="#64748b" fontSize={10} tickLine={false} />
                      <YAxis stroke="#64748b" fontSize={10} tickLine={false} tickFormatter={(v) => `${v/1000}k CFA`} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', borderRadius: '10px', color: '#fff', fontSize: '11px', fontWeight: 'bold' }}
                        formatter={(val: any) => [`${Number(val).toLocaleString()} CFA`, '']}
                      />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                      <Bar dataKey="billed" name="Billed (CFA)" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="paid" name="Collected (CFA)" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Settlement Status Distribution */}
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-3">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Payment Status Proportion
                </h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={[
                          { name: 'Fully Paid (100%)', value: 142, fill: '#10b981' },
                          { name: 'Partially Paid (>50%)', value: 38, fill: '#f59e0b' },
                          { name: 'Arrears / Unpaid (<50%)', value: 15, fill: '#ef4444' },
                        ]}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        innerRadius={45}
                        paddingAngle={4}
                        dataKey="value"
                        label={({ name, percent }) => `${name.split(' ')[0]} (${(percent * 100).toFixed(0)}%)`}
                      >
                        <Cell fill="#10b981" />
                        <Cell fill="#f59e0b" />
                        <Cell fill="#ef4444" />
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', borderRadius: '10px', color: '#fff', fontSize: '11px', fontWeight: 'bold' }}
                        formatter={(val: any) => [`${val} Students`, '']}
                      />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. INCOME & EXPENSES MODULE */}
      {(activeModule === 'fee_income_expenses' || activeModule === 'fee_income_expense' || activeModule === 'income_expenses' || activeModule === 'income_expense') && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
          <div className="flex flex-wrap justify-between items-center gap-3 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <Wallet className="w-5 h-5 text-indigo-600" />
                Institutional Income & Expense Cashbook
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Record institutional operating expenses, utility payments, maintenance costs, and non-tuition revenues.
              </p>
            </div>
            <button
              onClick={() => {
                setEditingTxn(null);
                setIeType('Income');
                setIeCat('Tuition Fees');
                setIeAmount(200);
                setIeDesc('');
                setIeRef('');
                setShowAddTxnModal(true);
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4" /> Record Cashbook Entry
            </button>
          </div>

          {/* Quick summary banner */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
              <span className="text-xs uppercase font-bold text-emerald-800 block">Total Inflow (Income)</span>
              <span className="text-2xl font-black text-emerald-700 font-mono">{(totalIncome ?? 0).toFixed(2)} CFA</span>
            </div>
            <div className="p-4 bg-rose-50 rounded-xl border border-rose-200">
              <span className="text-xs uppercase font-bold text-rose-800 block">Total Outflow (Expenses)</span>
              <span className="text-2xl font-black text-rose-700 font-mono">{(totalExpense ?? 0).toFixed(2)} CFA</span>
            </div>
            <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-200">
              <span className="text-xs uppercase font-bold text-indigo-800 block">Net Liquidity Balance</span>
              <span className="text-2xl font-black text-indigo-700 font-mono">{(netBalance ?? 0).toFixed(2)} CFA</span>
            </div>
          </div>

          {/* Cashbook Table */}
          <div className="border border-slate-200 rounded-xl overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-900 text-white uppercase text-[10px] font-bold">
                <tr>
                  <th className="p-3">#</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Description</th>
                  <th className="p-3">Reference No</th>
                  <th className="p-3 text-right">Amount (CFA)</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {incomeExpenses.length > 0 ? (
                  incomeExpenses.map((txn, idx) => (
                    <tr key={txn.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-mono text-slate-400">{idx + 1}</td>
                      <td className="p-3 font-mono text-slate-600">{txn.date}</td>
                      <td className="p-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center w-fit gap-1 ${
                          txn.type === 'Income' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {txn.type === 'Income' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                          {txn.type}
                        </span>
                      </td>
                      <td className="p-3 font-semibold text-slate-900">{txn.category}</td>
                      <td className="p-3 text-slate-700 max-w-xs truncate">{txn.description}</td>
                      <td className="p-3 font-mono text-slate-500">{txn.referenceNo}</td>
                      <td className={`p-3 text-right font-mono font-bold ${
                        txn.type === 'Income' ? 'text-emerald-700' : 'text-rose-700'
                      }`}>
                        {(txn.amount ?? 0).toFixed(2)} CFA
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => setIncomeExpenses(prev => prev.filter(t => t.id !== txn.id))}
                          className="p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                          title="Delete Entry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400 text-xs">
                      No income/expense records logged yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 8. AUDIT ACTIVITY MODULE */}
      {(activeModule === 'fee_audit_activity' || activeModule === 'fee_audit' || activeModule === 'audit_activity' || activeModule === 'audit') && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
          <div className="flex justify-between items-center pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                Financial Audit Trail & Tamper Log
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Immutable chronological log of all cash flows, billing adjustments, and bursar ledger operations.
              </p>
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-900 text-white uppercase text-[10px] font-bold">
                <tr>
                  <th className="p-3">#</th>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Action Event</th>
                  <th className="p-3">Operator</th>
                  <th className="p-3">Target Student / Entity</th>
                  <th className="p-3 text-right">Value (CFA)</th>
                  <th className="p-3">Log Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {auditLogs.map((log, idx) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-mono text-slate-400">{idx + 1}</td>
                    <td className="p-3 font-mono text-slate-600">{log.timestamp}</td>
                    <td className="p-3 font-bold text-slate-900">{log.action}</td>
                    <td className="p-3 font-semibold text-indigo-700">{log.user}</td>
                    <td className="p-3 font-mono text-slate-700">{log.studentAdmNo}</td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900">{(log.amount ?? 0).toFixed(2)} CFA</td>
                    <td className="p-3 text-slate-600 max-w-sm truncate">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* RECEIPT PREVIEW MODAL */}
      {activeReceipt && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 space-y-4">
            <div className="text-center border-b-2 border-dashed border-slate-300 pb-4 flex flex-col items-center">
              <JIPASLogo size="sm" className="mb-2" />
              <h3 className="font-black text-lg text-slate-900 leading-tight">JIPAS</h3>
              <p className="text-[10px] text-slate-500">Official Bursary & School Fees Receipt • Est. 1990</p>
              <div className="font-mono font-bold text-xs text-indigo-700 mt-1">Receipt No: {activeReceipt.receiptNo}</div>
            </div>

            <div className="space-y-2 text-xs font-medium">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Date:</span>
                <span className="font-bold">{activeReceipt.date}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Student Name:</span>
                <span className="font-bold text-slate-900">{activeReceipt.studentName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Admission No:</span>
                <span className="font-mono font-bold">{activeReceipt.admissionNo}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Class:</span>
                <span className="font-bold">{activeReceipt.className}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Paid As (Description):</span>
                <span className="font-bold text-slate-800 text-right max-w-[220px]">{activeReceipt.paidAs || activeReceipt.description || 'Tuition Fees'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Payment Method:</span>
                <span className="font-bold text-indigo-700">{activeReceipt.method}</span>
              </div>
              <div className="flex justify-between py-2 border-b-2 border-slate-900 text-sm">
                <span className="font-black text-slate-900">Amount Paid:</span>
                <span className="font-mono font-black text-emerald-700">{(activeReceipt.amount ?? activeReceipt.paid ?? 0).toFixed(2)} CFA</span>
              </div>
              <div className="flex justify-between py-1 text-slate-500 text-[10px]">
                <span>Received By:</span>
                <span className="font-semibold text-slate-700">{activeReceipt.receivedBy}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 print:hidden">
              <button 
                onClick={() => {
                  if (activeReceipt) {
                    const student = students.find(s => s.id === activeReceipt.studentId) || 
                                   students.find(s => s.admissionNo === activeReceipt.admissionNo);
                    if (student) PDFGeneratorService.generateFeeReceipt(activeReceipt, student);
                  }
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> Official PDF
              </button>
              <button
                onClick={() => setShowA6Receipt(true)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" /> View A6 Format
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" /> Print Receipt
              </button>
              <button
                onClick={() => setActiveReceipt(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT FEE OPTION MODAL */}
      {(showAddFeeModal || editingFee) && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-indigo-600" />
                {editingFee ? 'Edit Fee Tariff Item' : 'Add Fee Tariff Item'}
              </h3>
              <button onClick={() => { setShowAddFeeModal(false); setEditingFee(null); }} className="text-slate-400 font-bold">✕</button>
            </div>

            <form onSubmit={handleSaveFeeOption} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Fee Item Name *</label>
                <input
                  type="text"
                  required
                  value={feeName}
                  onChange={(e) => setFeeName(e.target.value)}
                  placeholder="e.g. Tuition Fee (Primary)"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={feeCat}
                    onChange={(e) => setFeeCat(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-semibold bg-white"
                  >
                    <option value="Tuition">Tuition</option>
                    <option value="PTA">PTA</option>
                    <option value="ICT">ICT</option>
                    <option value="Exams">Exams</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Transport">Transport</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Amount (CFA) *</label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    value={feeAmount}
                    onChange={(e) => setFeeAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Applicable Classes</label>
                <input
                  type="text"
                  value={feeClass}
                  onChange={(e) => setFeeClass(e.target.value)}
                  placeholder="All Classes or Primary School (All)"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setShowAddFeeModal(false); setEditingFee(null); }}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-sm"
                >
                  Save Fee Tariff
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECORD CASHBOOK ENTRY MODAL */}
      {(showAddTxnModal || editingTxn) && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Wallet className="w-5 h-5 text-indigo-600" />
                {editingTxn ? 'Edit Cashbook Transaction' : 'Record Cashbook Transaction'}
              </h3>
              <button onClick={() => { setShowAddTxnModal(false); setEditingTxn(null); }} className="text-slate-400 font-bold">✕</button>
            </div>

            <form onSubmit={handleSaveTxn} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Transaction Type</label>
                  <select
                    value={ieType}
                    onChange={(e) => setIeType(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-bold bg-white"
                  >
                    <option value="Income">Income (Inflow)</option>
                    <option value="Expense">Expense (Outflow)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Amount (CFA) *</label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    value={ieAmount}
                    onChange={(e) => setIeAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Category</label>
                <input
                  type="text"
                  value={ieCat}
                  onChange={(e) => setIeCat(e.target.value)}
                  placeholder="e.g. Utilities, Maintenance, PTA, Teaching Supplies"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description *</label>
                <textarea
                  required
                  rows={2}
                  value={ieDesc}
                  onChange={(e) => setIeDesc(e.target.value)}
                  placeholder="Enter transaction narrative..."
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Reference / Invoice No</label>
                <input
                  type="text"
                  value={ieRef}
                  onChange={(e) => setIeRef(e.target.value)}
                  placeholder="e.g. INV-9901"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setShowAddTxnModal(false); setEditingTxn(null); }}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-sm"
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REFUND MANAGEMENT MODULE */}
      {(activeModule === 'fee_refunds' || activeModule === 'refunds') && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
          {/* Toast */}
          {refundToast && (
            <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-slate-700 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              {refundToast}
            </div>
          )}

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-rose-600">Financial Treasury & Adjustments</span>
              <h3 className="text-lg font-black text-slate-900">Fee Refunds & Credit Reconciliations</h3>
              <p className="text-xs text-slate-500">Process overpayment refunds, withdrawal reimbursements, and credit adjustments</p>
            </div>

            <button
              onClick={() => setShowAddRefundModal(true)}
              className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Issue Refund Voucher
            </button>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl">
              <p className="text-[10px] font-black uppercase tracking-wider text-rose-700">Total Refunded</p>
              <h4 className="text-2xl font-black text-rose-900 mt-1 font-mono">
                {refundsList.reduce((acc, r) => acc + (r.amount || 0), 0).toLocaleString()} CFA
              </h4>
              <p className="text-[11px] text-rose-600 mt-0.5">{refundsList.length} Total Vouchers Issued</p>
            </div>

            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl">
              <p className="text-[10px] font-black uppercase tracking-wider text-emerald-700">Approved & Disbursed</p>
              <h4 className="text-2xl font-black text-emerald-900 mt-1 font-mono">
                {refundsList.filter(r => r.status === 'Approved' || r.status === 'Completed').length} Completed
              </h4>
              <p className="text-[11px] text-emerald-600 mt-0.5">Fully certified by Bursar</p>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl">
              <p className="text-[10px] font-black uppercase tracking-wider text-blue-700">Average Refund</p>
              <h4 className="text-2xl font-black text-blue-900 mt-1 font-mono">
                {refundsList.length > 0 
                  ? Math.round(refundsList.reduce((acc, r) => acc + (r.amount || 0), 0) / refundsList.length).toLocaleString()
                  : 0} CFA
              </h4>
              <p className="text-[11px] text-blue-600 mt-0.5">Per voucher claim</p>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={refundSearch}
                onChange={(e) => setRefundSearch(e.target.value)}
                placeholder="Search refund by student, admission no, voucher..."
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <select
              value={refundFilterStatus}
              onChange={(e) => setRefundFilterStatus(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none"
            >
              <option value="All">All Statuses</option>
              <option value="Approved">Approved</option>
              <option value="Completed">Completed</option>
              <option value="Pending">Pending</option>
            </select>
          </div>

          {/* Table */}
          {refundsList.length === 0 ? (
            <div className="p-12 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <Receipt className="w-10 h-10 mx-auto mb-2 opacity-30 text-rose-500" />
              <p className="text-xs font-bold text-slate-700">No refund vouchers issued</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Click "Issue Refund Voucher" to record overpayment or relocation reimbursements.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-500">
                    <th className="p-3">Voucher No</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Student Name</th>
                    <th className="p-3">Adm No</th>
                    <th className="p-3">Reason</th>
                    <th className="p-3">Method</th>
                    <th className="p-3 text-right">Refund Amount</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {refundsList
                    .filter(r => {
                      const matchSearch = !refundSearch || 
                        r.studentName.toLowerCase().includes(refundSearch.toLowerCase()) ||
                        r.admissionNo.toLowerCase().includes(refundSearch.toLowerCase()) ||
                        r.refundVoucherNo.toLowerCase().includes(refundSearch.toLowerCase());
                      const matchStatus = refundFilterStatus === 'All' || r.status === refundFilterStatus;
                      return matchSearch && matchStatus;
                    })
                    .map(refund => (
                      <tr key={refund.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-mono font-bold text-rose-600">{refund.refundVoucherNo}</td>
                        <td className="p-3 text-slate-500">{refund.date}</td>
                        <td className="p-3 font-bold text-slate-900">{refund.studentName}</td>
                        <td className="p-3 font-mono text-slate-500">{refund.admissionNo}</td>
                        <td className="p-3 text-slate-700">{refund.reason}</td>
                        <td className="p-3 text-slate-600">{refund.refundMethod}</td>
                        <td className="p-3 text-right font-black font-mono text-rose-700 text-sm">
                          {refund.amount.toLocaleString()} CFA
                        </td>
                        <td className="p-3 text-center">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            {refund.status}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => handlePrintRefundVoucher(refund)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs flex items-center gap-1 ml-auto cursor-pointer shadow-2xs"
                            title="Print Official Refund Voucher"
                          >
                            <Printer className="w-3.5 h-3.5" /> Voucher
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ISSUE REFUND MODAL */}
      {showAddRefundModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-slate-900 text-base">Issue Fee Refund Voucher</h3>
                <p className="text-xs text-slate-400">Record cash/MoMo/bank refund and adjust student ledger</p>
              </div>
              <button 
                onClick={() => setShowAddRefundModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRefund} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Select Student *</label>
                <select
                  required
                  value={refundStudentId}
                  onChange={(e) => {
                    const sid = e.target.value;
                    setRefundStudentId(sid);
                    const b = billsList.find(bill => bill.studentId === sid);
                    if (b && b.paid > 0) {
                      // default refund amount suggestion
                      setRefundAmount(Math.min(b.paid, 100));
                    }
                  }}
                  className="w-full p-2.5 border border-slate-300 rounded-xl bg-white font-semibold outline-none"
                >
                  <option value="">-- Choose student from directory --</option>
                  {students.map(s => {
                    const b = billsList.find(bill => bill.studentId === s.id);
                    return (
                      <option key={s.id} value={s.id}>
                        {s.fullName} ({s.admissionNo} • {s.className}) — Paid: {b?.paid ?? 0} CFA
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Refund Amount (CFA) *</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(Number(e.target.value))}
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-bold font-mono outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Payment Method</label>
                  <select
                    value={refundMethod}
                    onChange={(e) => setRefundMethod(e.target.value as any)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl bg-white font-bold outline-none"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Mobile money">Mobile Money</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cheque">Bank Cheque</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Reason for Refund *</label>
                <select
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value as any)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl bg-white font-bold outline-none"
                >
                  <option value="Overpayment">Overpayment on Term Bill</option>
                  <option value="Withdrawal / Relocation">Student Relocation / School Transfer</option>
                  <option value="Duplicate Payment">Duplicate Payment Correction</option>
                  <option value="Fee Adjustment / Waiver">Fee Waiver / Scholarship Credit</option>
                  <option value="Other">Other Institutional Reason</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Internal Reference / Explanation Notes</label>
                <textarea
                  rows={2}
                  value={refundNotes}
                  onChange={(e) => setRefundNotes(e.target.value)}
                  placeholder="e.g. Approved by Headmaster following parent relocation letter..."
                  className="w-full p-2.5 border border-slate-300 rounded-xl outline-none"
                />
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-[11px]">
                <p className="font-bold flex items-center gap-1.5 mb-0.5">
                  <AlertCircle className="w-4 h-4 text-amber-600" /> Ledger Impact Notice
                </p>
                <p>
                  Approving this refund will generate an official immutable refund voucher and adjust the student's bill paid balance automatically.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddRefundModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessingRefund}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  {isProcessingRefund ? 'Processing...' : 'Issue & Disburse Refund'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeModule === 'fee_bulk_entry' && (
        <BulkFeeEntryTool
          students={students}
          currentUser={currentUser || { name: 'Administrator', role: 'admin' } as any}
          onClose={() => onNavigate?.('dashboard')}
        />
      )}

      {showA6Receipt && activeReceipt && (() => {
        const student = students.find(s => s.id === activeReceipt.studentId || s.admissionNo === activeReceipt.admissionNo);
        const bill = billsList.find(b => b.studentId === activeReceipt.studentId || b.admissionNo === activeReceipt.admissionNo);
        if (!student) return null;
        return (
          <PrintableReceiptA6
            receipt={activeReceipt}
            student={student}
            bill={bill}
            onClose={() => setShowA6Receipt(false)}
          />
        );
      })()}
    </div>
  );
}

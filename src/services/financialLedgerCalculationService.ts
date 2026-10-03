/**
 * JIPAS SMSYS AUTHORITATIVE FINANCIAL LEDGER CALCULATION ENGINE (PHASE 45)
 * Single authoritative source of truth for student fee balances, ledger reconciliation,
 * payment aggregation, and cross-dashboard financial metrics.
 * 
 * Invariants Enforced:
 * 1. OUTSTANDING = POSTED_CHARGES - VALID_COLLECTIONS - APPROVED_CREDITS + VALID_REFUNDS + OTHER_DEBITS - OTHER_CREDITS
 * 2. Voided, Rejected, or Failed payments NEVER reduce outstanding balances.
 * 3. Successful payments reduce balance exactly once (idempotent deduplication).
 * 4. Stale cached bill totals are reconciled with authoritative payment receipts.
 */

import { StudentBill, PaymentRecord, FeeRefundRecord } from '../types';
import { addMoney, subtractMoney, calculateBillBalance, getPaymentStatus } from '../utils/financeUtils';

export interface StudentLedgerSummary {
  studentId: string;
  studentName?: string;
  admissionNo?: string;
  postedCharges: number;
  validCollections: number;
  approvedCredits: number;
  validRefunds: number;
  arrears: number;
  discount: number;
  outstandingBalance: number;
  paymentStatus: 'Fully Paid' | 'Partially Paid' | 'Unpaid' | 'Overpaid';
  validPaymentRecordsCount: number;
}

export interface CampusFinancialSummary {
  campus: string;
  academicYear: string;
  term: string;
  totalPostedCharges: number;
  totalValidCollections: number;
  totalOutstandingBalances: number;
  totalRefundsAmount: number;
  collectionEfficiency: number;
  totalStudentsBilled: number;
  totalValidPaymentsCount: number;
}

/**
 * Filters and deduplicates valid, non-voided payment records.
 */
export function getValidPayments(payments: PaymentRecord[] = []): PaymentRecord[] {
  const seenIds = new Set<string>();
  const seenReceipts = new Set<string>();
  const valid: PaymentRecord[] = [];

  payments.forEach(p => {
    if (!p) return;
    const isVoided = p.status === 'Voided' || (p as any).isVoided === true || p.status === 'Failed' || p.status === 'Rejected';
    if (isVoided) return;

    // Deduplicate identical payment ID
    if (p.id) {
      if (seenIds.has(p.id)) return;
      seenIds.add(p.id);
    }

    // Deduplicate receipt number if present
    if (p.receiptNo && p.receiptNo.trim().length > 0) {
      const receiptKey = p.receiptNo.trim().toUpperCase();
      if (seenReceipts.has(receiptKey)) return;
      seenReceipts.add(receiptKey);
    }

    valid.push(p);
  });

  return valid;
}

/**
 * Helper to check if a bill is active and valid (not voided).
 */
export function isBillValid(bill: StudentBill): boolean {
  if (!bill) return false;
  if (bill.isVoided === true) return false;
  const st = (bill.status || '').toUpperCase();
  if (st === 'VOIDED') return false;
  return true;
}

/**
 * Filters active valid non-voided bills.
 */
export function getValidBills(bills: StudentBill[] = []): StudentBill[] {
  return (bills || []).filter(isBillValid);
}

/**
 * Calculates the authoritative financial ledger summary for a single student.
 */
export function calculateStudentLedger(
  studentIdOrAdm: string,
  bills: StudentBill[] = [],
  payments: PaymentRecord[] = [],
  refunds: FeeRefundRecord[] = []
): StudentLedgerSummary {
  const key = (studentIdOrAdm || '').trim().toLowerCase();

  // 1. Locate student's valid active bill(s)
  const studentBills = getValidBills(bills).filter(b => 
    (b.studentId && b.studentId.trim().toLowerCase() === key) ||
    (b.admissionNo && b.admissionNo.trim().toLowerCase() === key)
  );

  const postedCharges = addMoney(...studentBills.map(b => b.payable ?? b.subTotal ?? 0));
  const arrears = addMoney(...studentBills.map(b => b.arrears ?? 0));
  const discount = addMoney(...studentBills.map(b => b.discount ?? 0));

  // 2. Locate student's valid payments
  const validPayments = getValidPayments(payments).filter(p => 
    (p.studentId && p.studentId.trim().toLowerCase() === key) ||
    (p.admissionNo && p.admissionNo.trim().toLowerCase() === key)
  );

  const validCollections = addMoney(...validPayments.map(p => p.paid ?? p.amount ?? 0));

  // 3. Locate approved refunds
  const studentRefunds = (refunds || []).filter(r => 
    (r.status === 'Approved' || r.status === 'Completed') &&
    ((r.studentId && r.studentId.trim().toLowerCase() === key) ||
     (r.admissionNo && r.admissionNo.trim().toLowerCase() === key))
  );
  const validRefunds = addMoney(...studentRefunds.map(r => r.amount ?? 0));

  // 4. Calculate authoritative outstanding balance
  const outstandingBalance = calculateBillBalance(
    addMoney(postedCharges, validRefunds),
    validCollections,
    discount,
    arrears
  );

  const paymentStatus = getPaymentStatus(outstandingBalance, validCollections);

  return {
    studentId: studentBills[0]?.studentId || key,
    studentName: studentBills[0]?.studentName,
    admissionNo: studentBills[0]?.admissionNo,
    postedCharges,
    validCollections,
    approvedCredits: 0,
    validRefunds,
    arrears,
    discount,
    outstandingBalance,
    paymentStatus,
    validPaymentRecordsCount: validPayments.length
  };
}

/**
 * Re-synchronizes a StudentBill with authoritative payment records.
 * Solves the defect where bill.paid remains 0 or stale while payment records exist.
 */
export function syncBillWithPayments(
  bill: StudentBill,
  payments: PaymentRecord[] = []
): StudentBill {
  if (!bill) return bill;

  const studentKeyById = (bill.studentId || '').trim().toLowerCase();
  const studentKeyByAdm = (bill.admissionNo || '').trim().toLowerCase();

  const matchingPayments = getValidPayments(payments).filter(p => {
    const pId = (p.studentId || '').trim().toLowerCase();
    const pAdm = (p.admissionNo || '').trim().toLowerCase();
    const matchStudent = (studentKeyById && pId === studentKeyById) ||
                         (studentKeyByAdm && pAdm === studentKeyByAdm) ||
                         (studentKeyById && pAdm === studentKeyById);
    if (!matchStudent) return false;

    // Period match if both specify
    if (bill.academicYear && p.academicYear && bill.academicYear !== p.academicYear) return false;
    if (bill.term && p.term && bill.term !== p.term) return false;

    return true;
  });

  const sumValidPaid = addMoney(...matchingPayments.map(p => p.paid ?? p.amount ?? 0));
  const payable = bill.payable ?? bill.subTotal ?? 0;
  const balance = calculateBillBalance(payable, sumValidPaid, bill.discount, bill.arrears);
  const status = getPaymentStatus(balance, sumValidPaid);

  return {
    ...bill,
    paid: sumValidPaid,
    balance,
    status
  };
}

/**
 * Synchronizes an array of bills with authoritative payment records.
 */
export function syncAllBillsWithPayments(
  bills: StudentBill[] = [],
  payments: PaymentRecord[] = []
): StudentBill[] {
  return bills.map(bill => syncBillWithPayments(bill, payments));
}

/**
 * Calculates authoritative financial summary across a campus and period scope.
 */
export function calculateCampusFinancialSummary(options: {
  campus?: string;
  academicYear?: string;
  term?: string;
  bills?: StudentBill[];
  payments?: PaymentRecord[];
  refunds?: FeeRefundRecord[];
}): CampusFinancialSummary {
  const campus = options.campus || 'All';
  const academicYear = options.academicYear || 'All';
  const term = options.term || 'All';

  let filteredBills = getValidBills(options.bills || []);
  let filteredPayments = options.payments || [];
  let filteredRefunds = options.refunds || [];

  if (campus !== 'All') {
    filteredBills = filteredBills.filter(b => !b.campus || b.campus === campus);
    filteredPayments = filteredPayments.filter(p => !(p as any).campus || (p as any).campus === campus);
    filteredRefunds = filteredRefunds.filter(r => !(r as any).campus || (r as any).campus === campus);
  }

  if (academicYear !== 'All') {
    filteredBills = filteredBills.filter(b => !b.academicYear || b.academicYear === academicYear);
    filteredPayments = filteredPayments.filter(p => !p.academicYear || p.academicYear === academicYear);
  }

  if (term !== 'All') {
    filteredBills = filteredBills.filter(b => !b.term || b.term === term);
    filteredPayments = filteredPayments.filter(p => !p.term || p.term === term);
  }

  // Reconcile bills with valid payments
  const reconciledBills = syncAllBillsWithPayments(filteredBills, filteredPayments);
  const validPayments = getValidPayments(filteredPayments);

  const totalPostedCharges = addMoney(...reconciledBills.map(b => b.payable ?? b.subTotal ?? 0));
  const totalValidCollections = addMoney(...validPayments.map(p => p.paid ?? p.amount ?? 0));
  const totalOutstandingBalances = addMoney(...reconciledBills.map(b => b.balance ?? 0));
  const totalRefundsAmount = addMoney(
    ...filteredRefunds.filter(r => r.status === 'Approved' || r.status === 'Completed').map(r => r.amount ?? 0)
  );

  const collectionEfficiency = totalPostedCharges > 0 
    ? Math.round((totalValidCollections / totalPostedCharges) * 100) 
    : 0;

  return {
    campus,
    academicYear,
    term,
    totalPostedCharges,
    totalValidCollections,
    totalOutstandingBalances,
    totalRefundsAmount,
    collectionEfficiency,
    totalStudentsBilled: reconciledBills.length,
    totalValidPaymentsCount: validPayments.length
  };
}

/**
 * Invariant Assertion Helper:
 * Asserts that Outstanding = PostedCharges - ValidCollections.
 */
export function assertStudentFinancialInvariant(
  postedCharges: number,
  validCollections: number,
  expectedBalance: number,
  discount: number = 0,
  arrears: number = 0
): { valid: boolean; calculatedBalance: number; error?: string } {
  const calculated = calculateBillBalance(postedCharges, validCollections, discount, arrears);
  const isValid = Math.abs(calculated - expectedBalance) < 0.001;

  if (!isValid) {
    return {
      valid: false,
      calculatedBalance: calculated,
      error: `Financial invariant violation: ${postedCharges} - ${validCollections} (discount: ${discount}, arrears: ${arrears}) = ${calculated}, expected ${expectedBalance}`
    };
  }

  return { valid: true, calculatedBalance: calculated };
}

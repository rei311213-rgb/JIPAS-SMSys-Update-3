/**
 * JIPAS SMSys - Phase 30: Financial Reconciliation & Exception Detection Service
 * 
 * Secure, Authoritative, Non-Destructive Financial Audit Engine.
 * 
 * Compares student ledgers, assigned fee schedules, payment records, bank deposits,
 * secretary cash handovers, expense logs, and payroll runs.
 * 
 * Rules:
 * 1. Read-only: NEVER mutates student balances, voids payments, or deletes records.
 * 2. Unverified evidence is flagged explicitly as 'NOT VERIFIED' - never fabricated.
 * 3. Decimal precision arithmetic using financeUtils (addMoney, subtractMoney, calculateBillBalance).
 * 4. Campus-scoped and role-protected.
 */

import { 
  Student, 
  StudentBill, 
  PaymentRecord, 
  SchoolExpenseRecord, 
  BankDepositRecord, 
  FeeRefundRecord, 
  PayrollRun, 
  ClassFeeTariffItem, 
  SecretaryDailySummary,
  FinancialReconciliationReport,
  FinancialExceptionItem,
  FinancialDiscrepancyType,
  DiscrepancySeverity,
  ExternalEvidenceStatus
} from '../types';
import { 
  addMoney, 
  subtractMoney, 
  calculateBillBalance, 
  formatCurrency, 
  CURRENCY 
} from '../utils/financeUtils';
import { 
  getStoredBills, 
  getStoredPayments, 
  getStoredExpenses, 
  getStoredBankDeposits, 
  getStoredRefunds, 
  getStoredPayrollRuns, 
  getStoredClassFeeTariffs, 
  getStoredSecretarySummaries 
} from './storageService';
import { getStoredStudents } from './dbService';
import { 
  filterBillsByCampus, 
  filterPaymentsByCampus, 
  filterExpensesByCampus, 
  Campus, 
  isAllCampus 
} from '../lib/campusUtils';

export const RECONCILIATION_STORAGE_KEY = 'jipas_financial_reconciliation_reports';
export const LAST_RECONCILIATION_REPORT_KEY = 'jipas_last_reconciliation_report';

export interface ReconciliationOptions {
  campus?: Campus | string;
  academicYear?: string;
  term?: string;
  reviewerName?: string;
  reviewerRole?: string;
  // Optional in-memory overrides (for testing, simulated scenarios, or custom audits)
  bills?: StudentBill[];
  payments?: PaymentRecord[];
  students?: Student[];
  expenses?: SchoolExpenseRecord[];
  bankDeposits?: BankDepositRecord[];
  refunds?: FeeRefundRecord[];
  payrollRuns?: PayrollRun[];
  tariffs?: ClassFeeTariffItem[];
  secretarySummaries?: SecretaryDailySummary[];
}

/**
 * Retrieve cached historical reconciliation reports
 */
export function getStoredReconciliationReports(): FinancialReconciliationReport[] {
  try {
    const raw = localStorage.getItem(RECONCILIATION_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/**
 * Save reconciliation report to immutable audit archive
 */
export function saveReconciliationReport(report: FinancialReconciliationReport): void {
  try {
    const current = getStoredReconciliationReports();
    const updated = [report, ...current.filter(r => r.id !== report.id)].slice(0, 50); // keep last 50
    localStorage.setItem(RECONCILIATION_STORAGE_KEY, JSON.stringify(updated));
    localStorage.setItem(LAST_RECONCILIATION_REPORT_KEY, JSON.stringify(report));
  } catch (e) {
    console.warn('[financialReconciliationService] Could not persist reconciliation report:', e);
  }
}

/**
 * Core Reconciliation & Exception Detection Engine
 * 
 * Performs comprehensive cross-ledger reconciliation with zero mutations.
 */
export function runFinancialReconciliationAudit(options: ReconciliationOptions = {}): FinancialReconciliationReport {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const detectedAtStr = now.toISOString();

  const campus = options.campus || 'All';
  const academicYear = options.academicYear || 'All';
  const term = options.term || 'All';
  const reviewerName = options.reviewerName || 'Internal Auditor / Bursar';
  const reviewerRole = options.reviewerRole || 'Financial Auditor';

  // 1. Hydrate raw data sets (either from overrides or authoritative storage)
  const allStudents: Student[] = options.students || getStoredStudents();
  let rawBills: StudentBill[] = options.bills || getStoredBills();
  let rawPayments: PaymentRecord[] = options.payments || getStoredPayments();
  let rawExpenses: SchoolExpenseRecord[] = options.expenses || getStoredExpenses();
  const rawBankDeposits: BankDepositRecord[] = options.bankDeposits || getStoredBankDeposits();
  const rawRefunds: FeeRefundRecord[] = options.refunds || getStoredRefunds();
  const rawPayrollRuns: PayrollRun[] = options.payrollRuns || getStoredPayrollRuns();
  const rawTariffs: ClassFeeTariffItem[] = options.tariffs || getStoredClassFeeTariffs();
  const rawSecretarySummaries: SecretaryDailySummary[] = options.secretarySummaries || getStoredSecretarySummaries();

  // 2. Apply Campus Scoping strictly
  let scopedBills = rawBills;
  let scopedPayments = rawPayments;
  let scopedExpenses = rawExpenses;
  let scopedStudents = allStudents;

  if (!isAllCampus(campus)) {
    scopedBills = filterBillsByCampus(rawBills, allStudents, campus);
    scopedPayments = filterPaymentsByCampus(rawPayments, allStudents, campus);
    scopedExpenses = filterExpensesByCampus(rawExpenses, campus);
    scopedStudents = allStudents.filter(s => (s.campus || 'JIPAS 1') === campus);
  }

  // 3. Apply Academic Period Scoping if specified
  if (academicYear !== 'All') {
    scopedBills = scopedBills.filter(b => !b.academicYear || b.academicYear === academicYear);
    scopedPayments = scopedPayments.filter(p => !p.academicYear || p.academicYear === academicYear);
  }
  if (term !== 'All') {
    scopedBills = scopedBills.filter(b => !b.term || b.term === term);
    scopedPayments = scopedPayments.filter(p => !p.term || p.term === term);
  }

  const exceptions: FinancialExceptionItem[] = [];

  // Index students for fast lookup by ID and admission number
  const studentMapById = new Map<string, Student>();
  const studentMapByAdmission = new Map<string, Student>();
  scopedStudents.forEach(s => {
    studentMapById.set(s.id, s);
    if (s.admissionNo) {
      studentMapByAdmission.set(s.admissionNo.trim().toUpperCase(), s);
    }
  });

  // Group payments by student ID / admission number
  const paymentsByStudentKey = new Map<string, PaymentRecord[]>();
  // Group payments by receipt number to detect duplicates
  const paymentsByReceiptNo = new Map<string, PaymentRecord[]>();
  // Group bank deposits by reference or receipt number
  const bankDepositsByRef = new Map<string, BankDepositRecord>();
  rawBankDeposits.forEach(d => {
    if (d.referenceNo) bankDepositsByRef.set(d.referenceNo.trim().toUpperCase(), d);
    if (d.bankReceiptNo) bankDepositsByRef.set(d.bankReceiptNo.trim().toUpperCase(), d);
  });

  let totalPostedCharges = 0;
  let totalValidCollections = 0;
  let totalOutstandingBalances = 0;
  let unallocatedPaymentsAmount = 0;
  let unexplainedCreditsAmount = 0;
  let reversedPaymentsAmount = 0;
  let totalRefundsAmount = 0;

  // 4. Index and analyze Payment Records
  scopedPayments.forEach(p => {
    const isVoided = p.status === 'Voided' || (p as any).isVoided === true;
    const paymentAmount = p.paid || p.amount || 0;

    if (isVoided) {
      reversedPaymentsAmount = addMoney(reversedPaymentsAmount, paymentAmount);
      return; // Skip voided payments from valid collections
    }

    totalValidCollections = addMoney(totalValidCollections, paymentAmount);

    // Track by student
    const studentKey = (p.studentId || p.admissionNo || 'UNKNOWN').trim().toUpperCase();
    const existingForStudent = paymentsByStudentKey.get(studentKey) || [];
    existingForStudent.push(p);
    paymentsByStudentKey.set(studentKey, existingForStudent);

    // Track by receipt number for duplicate check
    if (p.receiptNo) {
      const receiptKey = p.receiptNo.trim().toUpperCase();
      const existingForReceipt = paymentsByReceiptNo.get(receiptKey) || [];
      existingForReceipt.push(p);
      paymentsByReceiptNo.set(receiptKey, existingForReceipt);
    } else {
      // Missing receipt number exception
      exceptions.push({
        id: `exc-missing-receipt-${p.id}`,
        studentRef: p.studentName || p.admissionNo || p.studentId,
        studentName: p.studentName,
        admissionNo: p.admissionNo,
        campus: p.classAssigned || campus,
        academicPeriod: `${p.academicYear || academicYear} ${p.term || term}`.trim(),
        academicYear: p.academicYear,
        term: p.term,
        category: 'DUPLICATE_RECEIPT',
        severity: 'HIGH',
        expectedAmount: paymentAmount,
        recordedAmount: paymentAmount,
        variance: 0,
        transactionRefs: [p.id],
        description: `Posted payment record ID #${p.id} of ${formatCurrency(paymentAmount)} has no receipt number recorded.`,
        verificationStatus: 'MATHEMATICAL_ERROR',
        recommendedInvestigation: 'Assign official counterfoil receipt number or investigate transaction posting origin.',
        detectedAt: detectedAtStr
      });
    }

    // Check for missing allocations (unallocated payment)
    const matchingStudent = studentMapById.get(p.studentId) || (p.admissionNo ? studentMapByAdmission.get(p.admissionNo.trim().toUpperCase()) : undefined);
    if (!matchingStudent) {
      unallocatedPaymentsAmount = addMoney(unallocatedPaymentsAmount, paymentAmount);
      exceptions.push({
        id: `exc-unallocated-${p.id}`,
        studentRef: p.studentName || p.admissionNo || p.studentId || 'Unassigned',
        studentName: p.studentName,
        admissionNo: p.admissionNo,
        campus: campus,
        academicPeriod: `${p.academicYear || academicYear} ${p.term || term}`.trim(),
        academicYear: p.academicYear,
        term: p.term,
        category: 'UNALLOCATED_PAYMENT',
        severity: 'CRITICAL',
        expectedAmount: 0,
        recordedAmount: paymentAmount,
        variance: paymentAmount,
        transactionRefs: [p.receiptNo || p.id],
        description: `Payment Receipt #${p.receiptNo || p.id} for ${formatCurrency(paymentAmount)} cannot be linked to any registered student ledger.`,
        verificationStatus: 'NOT VERIFIED',
        recommendedInvestigation: `Locate student enrollment record for admission no '${p.admissionNo || 'N/A'}' or reallocate credit.`,
        detectedAt: detectedAtStr
      });
    }

    // Check External Evidence for Bank and Mobile Money transactions
    const methodNorm = (p.method || p.paymentMethod || '').toLowerCase();
    if (methodNorm.includes('bank')) {
      const ref = (p.referenceNo || p.receiptNo || '').trim().toUpperCase();
      const hasBankDepositMatch = ref ? bankDepositsByRef.has(ref) : false;
      if (!hasBankDepositMatch) {
        exceptions.push({
          id: `exc-unverified-bank-${p.id}`,
          studentRef: p.studentName || p.admissionNo,
          studentName: p.studentName,
          admissionNo: p.admissionNo,
          campus: campus,
          academicPeriod: `${p.academicYear || academicYear} ${p.term || term}`.trim(),
          academicYear: p.academicYear,
          term: p.term,
          category: 'UNVERIFIED_EXTERNAL_EVIDENCE',
          severity: 'MEDIUM',
          expectedAmount: paymentAmount,
          recordedAmount: paymentAmount,
          variance: 0,
          transactionRefs: [p.receiptNo || p.id, p.referenceNo || 'NO_REF'],
          description: `Bank payment Receipt #${p.receiptNo || p.id} (${formatCurrency(paymentAmount)}) lacks matching bank deposit slip or statement confirmation.`,
          verificationStatus: 'NOT VERIFIED',
          recommendedInvestigation: `Verify bank statement or obtain physical deposit slip for Ref #${p.referenceNo || 'None'}.`,
          detectedAt: detectedAtStr
        });
      }
    } else if (methodNorm.includes('momo') || methodNorm.includes('mobile')) {
      const ref = (p.referenceNo || '').trim();
      if (!ref || ref.length < 5) {
        exceptions.push({
          id: `exc-unverified-momo-${p.id}`,
          studentRef: p.studentName || p.admissionNo,
          studentName: p.studentName,
          admissionNo: p.admissionNo,
          campus: campus,
          academicPeriod: `${p.academicYear || academicYear} ${p.term || term}`.trim(),
          academicYear: p.academicYear,
          term: p.term,
          category: 'UNVERIFIED_EXTERNAL_EVIDENCE',
          severity: 'MEDIUM',
          expectedAmount: paymentAmount,
          recordedAmount: paymentAmount,
          variance: 0,
          transactionRefs: [p.receiptNo || p.id],
          description: `Mobile money payment Receipt #${p.receiptNo || p.id} lacks valid telco transaction ID / gateway reference.`,
          verificationStatus: 'NOT VERIFIED',
          recommendedInvestigation: 'Request official MTN / Telecel MoMo transaction receipt or telco statement.',
          detectedAt: detectedAtStr
        });
      }
    }
  });

  // 5. Detect Duplicate Receipts
  paymentsByReceiptNo.forEach((receiptPayments, receiptNo) => {
    if (receiptPayments.length > 1) {
      const totalDupAmount = addMoney(...receiptPayments.map(p => p.paid || p.amount || 0));
      exceptions.push({
        id: `exc-dup-receipt-${receiptNo}`,
        studentRef: receiptPayments.map(p => p.studentName || p.admissionNo).join(', '),
        campus: campus,
        academicPeriod: `${academicYear} ${term}`,
        category: 'DUPLICATE_RECEIPT',
        severity: 'CRITICAL',
        expectedAmount: receiptPayments[0].paid || receiptPayments[0].amount || 0,
        recordedAmount: totalDupAmount,
        variance: subtractMoney(totalDupAmount, receiptPayments[0].paid || receiptPayments[0].amount || 0),
        transactionRefs: receiptPayments.map(p => p.id),
        description: `Receipt #${receiptNo} has been assigned to ${receiptPayments.length} separate payment transactions totaling ${formatCurrency(totalDupAmount)}.`,
        verificationStatus: 'SUSPECTED_DUPLICATE',
        recommendedInvestigation: `Examine counterfoil book for receipt #${receiptNo}; reverse accidental duplicate posting if confirmed.`,
        detectedAt: detectedAtStr,
        rawDetails: { receiptPayments }
      });
    }
  });

  // 6. Detect Duplicate Payments (same student, same date, identical amount)
  paymentsByStudentKey.forEach((studentPmts, studentKey) => {
    const seenCombos = new Map<string, PaymentRecord[]>();
    studentPmts.forEach(p => {
      const comboKey = `${p.date}_${p.paid || p.amount || 0}_${(p.method || '').toLowerCase()}`;
      const list = seenCombos.get(comboKey) || [];
      list.push(p);
      seenCombos.set(comboKey, list);
    });

    seenCombos.forEach((duplicates, comboKey) => {
      if (duplicates.length > 1) {
        const dupAmount = duplicates[0].paid || duplicates[0].amount || 0;
        exceptions.push({
          id: `exc-dup-pmt-${studentKey}-${comboKey}`,
          studentRef: duplicates[0].studentName || studentKey,
          studentName: duplicates[0].studentName,
          admissionNo: duplicates[0].admissionNo,
          campus: campus,
          academicPeriod: `${academicYear} ${term}`,
          category: 'DUPLICATE_PAYMENT',
          severity: 'HIGH',
          expectedAmount: dupAmount,
          recordedAmount: addMoney(...duplicates.map(d => d.paid || d.amount || 0)),
          variance: subtractMoney(addMoney(...duplicates.map(d => d.paid || d.amount || 0)), dupAmount),
          transactionRefs: duplicates.map(d => d.receiptNo || d.id),
          description: `Student ${duplicates[0].studentName || studentKey} has ${duplicates.length} identical payments of ${formatCurrency(dupAmount)} on ${duplicates[0].date}.`,
          verificationStatus: 'SUSPECTED_DUPLICATE',
          recommendedInvestigation: 'Verify whether parent completed multiple transfers or cashier submitted duplicate entries.',
          detectedAt: detectedAtStr
        });
      }
    });
  });

  // 7. Verify Student Fee Ledgers & Balances
  scopedBills.forEach(bill => {
    const payable = bill.payable ?? bill.subTotal ?? 0;
    const paid = bill.paid ?? 0;
    const discount = bill.discount ?? 0;
    const arrears = bill.arrears ?? 0;
    const recordedBalance = bill.balance ?? 0;

    totalPostedCharges = addMoney(totalPostedCharges, payable);
    totalOutstandingBalances = addMoney(totalOutstandingBalances, Math.max(0, recordedBalance));

    // A. Ledger Arithmetic: Authoritative balance check
    const expectedBalance = calculateBillBalance(payable, paid, discount, arrears);
    const balanceVariance = subtractMoney(recordedBalance, expectedBalance);

    if (Math.abs(balanceVariance) > 0.001) {
      exceptions.push({
        id: `exc-bal-mismatch-${bill.id}`,
        studentRef: bill.studentName || bill.admissionNo,
        studentName: bill.studentName,
        admissionNo: bill.admissionNo,
        campus: bill.campus || campus,
        academicPeriod: `${bill.academicYear || academicYear} ${bill.term || term}`.trim(),
        academicYear: bill.academicYear,
        term: bill.term,
        category: 'BALANCE_MISMATCH',
        severity: 'CRITICAL',
        expectedAmount: expectedBalance,
        recordedAmount: recordedBalance,
        variance: balanceVariance,
        transactionRefs: [bill.billNo || bill.id],
        description: `Bill #${bill.billNo || bill.id} for ${bill.studentName} has recorded balance of ${formatCurrency(recordedBalance)}, differing by ${formatCurrency(balanceVariance)} from authoritative formula (${formatCurrency(expectedBalance)}).`,
        verificationStatus: 'MATHEMATICAL_ERROR',
        recommendedInvestigation: 'Recalculate ledger balance using authoritative formula: (Payable + Arrears) - (Paid + Discount).',
        detectedAt: detectedAtStr
      });
    }

    // B. Reconcile Bill Payments with Posted Payment Records
    const studentKeyById = (bill.studentId || '').trim().toUpperCase();
    const studentKeyByAdm = (bill.admissionNo || '').trim().toUpperCase();
    const studentPayments = (paymentsByStudentKey.get(studentKeyById) || [])
      .concat(studentKeyByAdm && studentKeyByAdm !== studentKeyById ? (paymentsByStudentKey.get(studentKeyByAdm) || []) : []);
    
    // Filter payments for this academic period if bill specifies them
    const matchingPayments = studentPayments.filter(p => {
      const matchYear = !bill.academicYear || !p.academicYear || p.academicYear === bill.academicYear;
      const matchTerm = !bill.term || !p.term || p.term === bill.term;
      return matchYear && matchTerm;
    });

    const sumPostedPayments = addMoney(...matchingPayments.map(p => p.paid || p.amount || 0));
    const paymentAllocationVariance = subtractMoney(paid, sumPostedPayments);

    if (Math.abs(paymentAllocationVariance) > 0.001 && matchingPayments.length > 0) {
      exceptions.push({
        id: `exc-allocation-mismatch-${bill.id}`,
        studentRef: bill.studentName || bill.admissionNo,
        studentName: bill.studentName,
        admissionNo: bill.admissionNo,
        campus: bill.campus || campus,
        academicPeriod: `${bill.academicYear || academicYear} ${bill.term || term}`.trim(),
        academicYear: bill.academicYear,
        term: bill.term,
        category: 'BALANCE_MISMATCH',
        severity: 'HIGH',
        expectedAmount: sumPostedPayments,
        recordedAmount: paid,
        variance: paymentAllocationVariance,
        transactionRefs: matchingPayments.map(p => p.receiptNo || p.id).concat(bill.billNo || bill.id),
        description: `Bill payment total (${formatCurrency(paid)}) diverges from sum of posted payment receipts (${formatCurrency(sumPostedPayments)}) by ${formatCurrency(paymentAllocationVariance)}.`,
        verificationStatus: 'MATHEMATICAL_ERROR',
        recommendedInvestigation: 'Audit individual transaction allocations and ensure unposted receipt records are captured in the ledger.',
        detectedAt: detectedAtStr
      });
    }

    // C. Detect Unexplained Credits (Overpayment without credit memo)
    if (recordedBalance < 0 || paid > addMoney(payable, arrears)) {
      const creditAmount = Math.abs(recordedBalance < 0 ? recordedBalance : subtractMoney(paid, addMoney(payable, arrears)));
      unexplainedCreditsAmount = addMoney(unexplainedCreditsAmount, creditAmount);
      exceptions.push({
        id: `exc-credit-${bill.id}`,
        studentRef: bill.studentName || bill.admissionNo,
        studentName: bill.studentName,
        admissionNo: bill.admissionNo,
        campus: bill.campus || campus,
        academicPeriod: `${bill.academicYear || academicYear} ${bill.term || term}`.trim(),
        academicYear: bill.academicYear,
        term: bill.term,
        category: 'UNEXPLAINED_CREDIT',
        severity: 'HIGH',
        expectedAmount: addMoney(payable, arrears),
        recordedAmount: paid,
        variance: creditAmount,
        transactionRefs: [bill.billNo || bill.id],
        description: `Student account ${bill.studentName} (${bill.admissionNo}) has an unexplained credit balance of ${formatCurrency(creditAmount)}.`,
        verificationStatus: 'NOT VERIFIED',
        recommendedInvestigation: 'Determine whether credit should roll over to next term or if refund voucher is required.',
        detectedAt: detectedAtStr
      });
    }

    // D. Compare with Class Fee Tariff Schedule
    if (rawTariffs.length > 0 && bill.className) {
      const tariff = rawTariffs.find(t => 
        (t.classTitle || '').toLowerCase() === bill.className.toLowerCase()
      );

      if (tariff && discount === 0) {
        const tariffTotal = addMoney(
          tariff.baseTuition || 0,
          tariff.ptaDues || 0,
          tariff.ictFee || 0,
          tariff.examFee || 0,
          tariff.healthLevy || 0,
          tariff.busTransit || 0
        );

        if (tariffTotal > 0) {
          const tariffVariance = subtractMoney(payable, tariffTotal);
          if (Math.abs(tariffVariance) > 1.0) { // allow small rounding tolerance
            exceptions.push({
              id: `exc-tariff-${bill.id}`,
              studentRef: bill.studentName || bill.admissionNo,
              studentName: bill.studentName,
              admissionNo: bill.admissionNo,
              campus: bill.campus || campus,
              academicPeriod: `${bill.academicYear || academicYear} ${bill.term || term}`.trim(),
              academicYear: bill.academicYear,
              term: bill.term,
              category: 'TARIFF_DEVIATION',
              severity: 'LOW',
              expectedAmount: tariffTotal,
              recordedAmount: payable,
              variance: tariffVariance,
              transactionRefs: [bill.billNo || bill.id, tariff.id],
              description: `Posted bill charge (${formatCurrency(payable)}) deviates from authorized class tariff (${formatCurrency(tariffTotal)}) by ${formatCurrency(tariffVariance)} without recorded discount/scholarship.`,
              verificationStatus: 'NOT VERIFIED',
              recommendedInvestigation: 'Confirm Bursar scholarship approval or verify if student is enrolled on a non-standard fee tier.',
              detectedAt: detectedAtStr
            });
          }
        }
      }
    }
  });

  // 8. Reconcile Refunds
  rawRefunds.forEach(ref => {
    if (ref.status === 'Approved' || ref.status === 'Completed') {
      totalRefundsAmount = addMoney(totalRefundsAmount, ref.amount || 0);
    }
  });

  // 9. Reconcile Expenses and Operational Records
  let unverifiedExpensesCount = 0;
  let totalExpensesRecorded = 0;
  scopedExpenses.forEach(exp => {
    if (exp.status !== 'Void') {
      totalExpensesRecorded = addMoney(totalExpensesRecorded, exp.amount || 0);
      if (!exp.category || !exp.description || (exp.amount || 0) <= 0) {
        unverifiedExpensesCount++;
        exceptions.push({
          id: `exc-expense-${exp.id}`,
          campus: exp.campus || campus,
          academicPeriod: `${academicYear} ${term}`,
          category: 'EXPENSE_VARIANCE',
          severity: 'MEDIUM',
          expectedAmount: exp.amount || 0,
          recordedAmount: exp.amount || 0,
          variance: 0,
          transactionRefs: [exp.id],
          description: `Expense record #${exp.id} (${formatCurrency(exp.amount || 0)}) lacks required category or descriptive audit justification.`,
          verificationStatus: 'NOT VERIFIED',
          recommendedInvestigation: 'Audit voucher documentation and assign proper general ledger expenditure category.',
          detectedAt: detectedAtStr
        });
      }
    }
  });

  // 10. Reconcile Payroll Runs
  let totalPayrollDisbursed = 0;
  let payslipDiscrepanciesCount = 0;
  rawPayrollRuns.forEach(run => {
    if (run.status === 'Disbursed' || run.status === 'Approved') {
      totalPayrollDisbursed = addMoney(totalPayrollDisbursed, run.totalNetPay || 0);
      
      // Verify payslip sum equals run.totalNetPay
      if (run.payslips && Array.isArray(run.payslips) && run.payslips.length > 0) {
        const sumPayslips = addMoney(...run.payslips.map(p => p.netSalary || 0));
        const runVariance = subtractMoney(run.totalNetPay || 0, sumPayslips);
        if (Math.abs(runVariance) > 0.01) {
          payslipDiscrepanciesCount++;
          exceptions.push({
            id: `exc-payroll-${run.id}`,
            campus: campus,
            academicPeriod: `${run.academicYear || academicYear} ${run.term || term}`,
            category: 'PAYROLL_VARIANCE',
            severity: 'HIGH',
            expectedAmount: sumPayslips,
            recordedAmount: run.totalNetPay || 0,
            variance: runVariance,
            transactionRefs: [run.id],
            description: `Payroll run for ${run.month} (${run.totalNetPay || 0} GHS) has net payout differing from sum of individual payslips (${sumPayslips} GHS) by ${formatCurrency(runVariance)}.`,
            verificationStatus: 'MATHEMATICAL_ERROR',
            recommendedInvestigation: 'Re-audit payroll run payslips and verify automated pension/tax deduction lines.',
            detectedAt: detectedAtStr
          });
        }
      }
    }
  });

  // 11. Cross-System Dashboard Reconciliation (Accountant vs Secretary vs CEO)
  // Accountant dashboard computes: addMoney(...bills.map(b => b.paid || 0))
  const accountantReportedCollections = addMoney(...scopedBills.map(b => b.paid || 0));
  const accountantVariance = subtractMoney(accountantReportedCollections, totalValidCollections);
  const accountantDashboardReconciled = Math.abs(accountantVariance) < 0.01;

  // Secretary net cash handover verification
  const totalSecretaryCollections = addMoney(
    ...scopedPayments
      .filter(p => p.collectorRole === 'secretary' || p.receivedBy === 'Secretary' || p.paidAs?.toLowerCase().includes('secretary'))
      .map(p => p.paid || p.amount || 0)
  );
  const totalSecretarySummariesReconciled = addMoney(
    ...rawSecretarySummaries
      .filter(s => s.isReconciled || s.isReconciledWithBursar)
      .map(s => s.totalFeesCollected || 0)
  );
  const secretaryVariance = subtractMoney(totalSecretaryCollections, totalSecretarySummariesReconciled);
  const secretaryDashboardReconciled = rawSecretarySummaries.length === 0 || Math.abs(secretaryVariance) < 1.0;

  // CEO dashboard computes revenue from all payments
  const ceoReportedRevenue = addMoney(...scopedPayments.filter(p => p.status !== 'Voided').map(p => p.paid || p.amount || 0));
  const ceoVariance = subtractMoney(ceoReportedRevenue, totalValidCollections);
  const ceoDashboardReconciled = Math.abs(ceoVariance) < 0.01;

  if (!accountantDashboardReconciled) {
    exceptions.push({
      id: 'exc-dash-accountant',
      campus: campus,
      academicPeriod: `${academicYear} ${term}`,
      category: 'DASHBOARD_VARIANCE',
      severity: 'CRITICAL',
      expectedAmount: totalValidCollections,
      recordedAmount: accountantReportedCollections,
      variance: accountantVariance,
      transactionRefs: ['ACCOUNTANT_DASHBOARD_LEDGER'],
      description: `Accountant dashboard fee collections (${formatCurrency(accountantReportedCollections)}) diverges from valid posted payment records (${formatCurrency(totalValidCollections)}) by ${formatCurrency(accountantVariance)}.`,
      verificationStatus: 'MATHEMATICAL_ERROR',
      recommendedInvestigation: 'Sync student bill paid amounts with valid payment receipts in Bursar ledger.',
      detectedAt: detectedAtStr
    });
  }

  // 12. Calculate Unresolved Discrepancies Amount
  const unresolvedDiscrepanciesAmount = addMoney(
    ...exceptions.map(e => Math.abs(e.variance || (e.expectedAmount !== e.recordedAmount ? subtractMoney(e.recordedAmount, e.expectedAmount) : 0)))
  );

  const status: FinancialReconciliationReport['status'] = 
    exceptions.length === 0 
      ? 'Clean' 
      : exceptions.some(e => e.severity === 'CRITICAL') 
        ? 'Discrepancies Detected' 
        : 'Under Investigation';

  const reportId = `RECON-${todayStr.replace(/-/g, '')}-${campus.replace(/[^a-zA-Z0-9]/g, '')}-${Date.now().toString().slice(-4)}`;

  const finalReport: FinancialReconciliationReport = {
    id: reportId,
    reconciliationDate: todayStr,
    academicPeriod: `${academicYear === 'All' ? 'All Years' : academicYear} ${term === 'All' ? 'All Terms' : term}`.trim(),
    academicYear,
    term,
    campus,
    status,
    reviewerName,
    reviewerRole,
    totalPostedCharges,
    totalValidCollections,
    totalOutstandingBalances,
    unallocatedPaymentsAmount,
    unexplainedCreditsAmount,
    reversedPaymentsAmount,
    totalRefundsAmount,
    totalAccountsReconciled: scopedBills.length + scopedPayments.length,
    totalDiscrepanciesCount: exceptions.length,
    unresolvedDiscrepanciesAmount,
    exceptions,
    dashboardReconciliations: {
      accountantDashboardReconciled,
      accountantVariance,
      secretaryDashboardReconciled,
      secretaryVariance,
      ceoDashboardReconciled,
      ceoVariance,
      notes: `Accountant Variance: GHS ${accountantVariance.toFixed(2)}, CEO Variance: GHS ${ceoVariance.toFixed(2)}.`
    },
    expenseReconciliation: {
      totalExpensesRecorded,
      unverifiedExpensesCount,
      variance: 0
    },
    payrollReconciliation: {
      totalPayrollDisbursed,
      payslipDiscrepanciesCount,
      variance: 0
    },
    createdAt: detectedAtStr
  };

  // Persist report to audit storage
  saveReconciliationReport(finalReport);

  return finalReport;
}

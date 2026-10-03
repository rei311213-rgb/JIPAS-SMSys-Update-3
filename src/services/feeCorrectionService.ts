/**
 * JIPAS SMSys - AUTHORITATIVE FEE CORRECTION & VOID SERVICE (PHASE 51)
 * 
 * Provides auditable, controlled, role-authorized fee correction and void workflows.
 * Core Financial Invariant: Financial corrections must reverse or correct the effect of
 * an incorrect entry without destroying the original audit history.
 */

import { 
  StudentBill, 
  PaymentRecord, 
  FeeCorrectionRecord, 
  CorrectionReasonCode 
} from '../types';
import { 
  getStoredBills, 
  saveStoredBills, 
  getStoredStudents, 
  getStoredPayments, 
  getStoredFeeCorrections, 
  saveStoredFeeCorrections 
} from './storageService';
import { recordChangeEvent } from './changeAuditService';
import { 
  calculateBillBalance, 
  getPaymentStatus, 
  addMoney, 
  subtractMoney 
} from '../utils/financeUtils';
import { 
  calculateStudentLedger, 
  syncBillWithPayments, 
  assertStudentFinancialInvariant,
  isBillValid
} from './financialLedgerCalculationService';

export interface CorrectionRequestOptions {
  actor: string;
  role: string;
  campusId?: string;
  reasonCode: CorrectionReasonCode;
  reasonText: string;
  idempotencyKey?: string;
  baseRevision?: number;
}

export interface CorrectAmountOptions extends CorrectionRequestOptions {
  billId: string;
  newAmount: number;
}

export interface VoidFeeOptions extends CorrectionRequestOptions {
  billId: string;
}

export interface CorrectStudentOptions extends CorrectionRequestOptions {
  billId: string;
  destinationStudentId: string;
}

export interface CorrectItemOptions extends CorrectionRequestOptions {
  billId: string;
  newFeeItemName: string;
  newAmount?: number;
  items?: { name: string; amount: number }[];
}

export interface CorrectTermOptions extends CorrectionRequestOptions {
  billId: string;
  newTerm: string;
}

export interface CorrectDuplicateOptions extends CorrectionRequestOptions {
  validBillId: string;
  duplicateBillId: string;
}

/**
 * Validates whether an actor role is authorized to perform fee corrections / voids.
 */
export function isAuthorizedForCorrection(role: string): boolean {
  if (!role) return false;
  const normalized = role.toLowerCase().trim();
  const allowed = ['super_admin', 'admin', 'accountant', 'headmaster', 'bursar'];
  return allowed.includes(normalized);
}

/**
 * Validates request options (authorization, campus isolation, reason text requirement).
 */
function validateCorrectionRequest(
  options: CorrectionRequestOptions,
  targetCampus?: string
): void {
  // 1. RBAC check
  if (!isAuthorizedForCorrection(options.role)) {
    throw new Error(`UNAUTHORIZED: User role '${options.role}' does not have permission to correct or void financial records.`);
  }

  // 2. Campus Isolation check
  if (options.campusId && targetCampus && targetCampus !== 'All' && options.campusId !== 'All') {
    if (options.campusId !== targetCampus && options.role.toLowerCase() !== 'super_admin') {
      throw new Error(`ACCESS_DENIED: Campus isolation violation. Cannot modify financial record belonging to campus '${targetCampus}' from campus '${options.campusId}'.`);
    }
  }

  // 3. Reason check
  if (!options.reasonCode) {
    throw new Error('INVALID_REASON: Reason code is required for fee corrections.');
  }

  if (options.reasonCode === 'OTHER') {
    if (!options.reasonText || options.reasonText.trim().length < 3) {
      throw new Error("INVALID_REASON: Explanation text is required when reason code is 'OTHER'.");
    }
  }
}

/**
 * Helper to retrieve existing fee correction history records.
 */
export function getFeeCorrectionLogs(filter?: { billId?: string; studentId?: string }): FeeCorrectionRecord[] {
  const logs = getStoredFeeCorrections();
  if (!filter) return logs;

  return logs.filter(log => {
    if (filter.billId && log.originalBillId !== filter.billId && log.replacementBillId !== filter.billId) {
      return false;
    }
    if (filter.studentId && log.originalStudentId !== filter.studentId && log.correctedStudentId !== filter.studentId) {
      return false;
    }
    return true;
  });
}

/**
 * 1. CORRECT FEE AMOUNT
 */
export function correctFeeAmount(options: CorrectAmountOptions): { bill: StudentBill; correction: FeeCorrectionRecord } {
  const bills = getStoredBills();
  const billIndex = bills.findIndex(b => b.id === options.billId);

  if (billIndex === -1) {
    throw new Error(`FEE_NOT_FOUND: Bill ID '${options.billId}' does not exist.`);
  }

  const bill = bills[billIndex];
  validateCorrectionRequest(options, bill.campus);

  if (bill.isVoided || (bill.status || '').toUpperCase() === 'VOIDED') {
    throw new Error(`INVALID_STATE: Cannot adjust amount on a voided fee record.`);
  }

  if (options.baseRevision !== undefined && bill.revision !== undefined && bill.revision > options.baseRevision) {
    throw new Error(`CONCURRENCY_CONFLICT: Financial record has been modified by another concurrent user. Please refresh and retry.`);
  }

  if (options.newAmount < 0) {
    throw new Error(`INVALID_AMOUNT: Fee amount cannot be negative.`);
  }

  const originalAmount = bill.payable ?? bill.subTotal ?? 0;
  const correctionId = `CORR-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  const timestamp = new Date().toISOString();

  // Update bill items and subtotal/payable
  const primaryItemName = bill.items && bill.items.length > 0 ? bill.items[0].name : 'Tuition & Fees';
  const updatedItems = [{ name: primaryItemName, amount: options.newAmount }];
  const newSubTotal = options.newAmount;
  const newPayable = options.newAmount;

  // Recalculate balance using authoritative formula
  const payments = getStoredPayments();
  const syncedBill = syncBillWithPayments({
    ...bill,
    items: updatedItems,
    subTotal: newSubTotal,
    payable: newPayable,
    status: 'Corrected',
    isCorrected: true,
    revision: (bill.revision || 1) + 1,
    updatedAt: timestamp,
    history: [
      ...(bill.history || []),
      {
        type: 'FEE_AMOUNT_CORRECTED',
        amount: options.newAmount,
        originalAmount,
        date: timestamp,
        user: options.actor,
        reason: options.reasonText || options.reasonCode
      }
    ]
  }, payments);

  // Assert financial invariant
  const inv = assertStudentFinancialInvariant(
    syncedBill.payable,
    syncedBill.paid,
    syncedBill.balance,
    syncedBill.discount,
    syncedBill.arrears
  );

  if (!inv.valid) {
    throw new Error(`RECONCILIATION_FAILED: Correction could not be completed because financial reconciliation failed: ${inv.error}`);
  }

  // Save updated bills
  bills[billIndex] = syncedBill;
  saveStoredBills(bills);

  // Record audit and correction log
  const correctionRecord: FeeCorrectionRecord = {
    id: correctionId,
    originalBillId: bill.id,
    originalStudentId: bill.studentId,
    originalAmount,
    correctedAmount: options.newAmount,
    action: 'CORRECT_AMOUNT',
    reasonCode: options.reasonCode,
    reasonText: options.reasonText || `Corrected fee amount from ${originalAmount} CFA to ${options.newAmount} CFA`,
    actorId: options.actor,
    actorRole: options.role,
    campusId: bill.campus || options.campusId || 'JIPAS 1',
    timestamp,
    previousStatus: bill.status,
    newStatus: syncedBill.status,
    idempotencyKey: options.idempotencyKey,
    baseRevision: bill.revision
  };

  const logs = getStoredFeeCorrections();
  saveStoredFeeCorrections([correctionRecord, ...logs]);

  recordChangeEvent(
    'GOVERNANCE_CHECK_EXECUTED',
    options.actor,
    `Fee Amount Corrected for Bill #${bill.billNo || bill.id} (${bill.studentName}): ${originalAmount} CFA -> ${options.newAmount} CFA. Reason: ${options.reasonText || options.reasonCode}`,
    'SUCCESS'
  );

  return { bill: syncedBill, correction: correctionRecord };
}

/**
 * 2. VOID INCORRECT FEE
 */
export function voidFee(options: VoidFeeOptions): { bill: StudentBill; correction: FeeCorrectionRecord } {
  const bills = getStoredBills();
  const billIndex = bills.findIndex(b => b.id === options.billId);

  if (billIndex === -1) {
    throw new Error(`FEE_NOT_FOUND: Bill ID '${options.billId}' does not exist.`);
  }

  const bill = bills[billIndex];
  validateCorrectionRequest(options, bill.campus);

  if (bill.isVoided || (bill.status || '').toUpperCase() === 'VOIDED') {
    throw new Error(`INVALID_STATE: Bill ID '${options.billId}' is already voided.`);
  }

  if (options.baseRevision !== undefined && bill.revision !== undefined && bill.revision > options.baseRevision) {
    throw new Error(`CONCURRENCY_CONFLICT: Financial record has been modified by another concurrent user. Please refresh and retry.`);
  }

  const originalAmount = bill.payable ?? bill.subTotal ?? 0;
  const correctionId = `CORR-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  const timestamp = new Date().toISOString();

  // Mark bill as voided
  const voidedBill: StudentBill = {
    ...bill,
    status: 'Voided',
    isVoided: true,
    voidedAt: timestamp,
    voidedBy: options.actor,
    voidReason: options.reasonText || options.reasonCode,
    correctionId,
    revision: (bill.revision || 1) + 1,
    updatedAt: timestamp,
    history: [
      ...(bill.history || []),
      {
        type: 'FEE_VOIDED',
        amount: originalAmount,
        date: timestamp,
        user: options.actor,
        reason: options.reasonText || options.reasonCode
      }
    ]
  };

  bills[billIndex] = voidedBill;
  saveStoredBills(bills);

  // Record correction log
  const correctionRecord: FeeCorrectionRecord = {
    id: correctionId,
    originalBillId: bill.id,
    originalStudentId: bill.studentId,
    originalAmount,
    correctedAmount: 0,
    action: 'VOID',
    reasonCode: options.reasonCode,
    reasonText: options.reasonText || `Voided fee entry of ${originalAmount} CFA`,
    actorId: options.actor,
    actorRole: options.role,
    campusId: bill.campus || options.campusId || 'JIPAS 1',
    timestamp,
    previousStatus: bill.status,
    newStatus: 'Voided',
    idempotencyKey: options.idempotencyKey,
    baseRevision: bill.revision
  };

  const logs = getStoredFeeCorrections();
  saveStoredFeeCorrections([correctionRecord, ...logs]);

  recordChangeEvent(
    'GOVERNANCE_CHECK_EXECUTED',
    options.actor,
    `Fee Voided for Bill #${bill.billNo || bill.id} (${bill.studentName}): ${originalAmount} CFA voided. Reason: ${options.reasonText || options.reasonCode}`,
    'SUCCESS'
  );

  return { bill: voidedBill, correction: correctionRecord };
}

/**
 * 3. CORRECT WRONG-STUDENT FEE
 */
export function correctFeeStudent(options: CorrectStudentOptions): { 
  originalBill: StudentBill; 
  replacementBill: StudentBill; 
  correction: FeeCorrectionRecord 
} {
  const bills = getStoredBills();
  const billIndex = bills.findIndex(b => b.id === options.billId);

  if (billIndex === -1) {
    throw new Error(`FEE_NOT_FOUND: Bill ID '${options.billId}' does not exist.`);
  }

  const originalBill = bills[billIndex];
  validateCorrectionRequest(options, originalBill.campus);

  const students = getStoredStudents();
  const destStudent = students.find(s => s.id === options.destinationStudentId || s.admissionNo === options.destinationStudentId);

  if (!destStudent) {
    throw new Error(`DESTINATION_STUDENT_NOT_FOUND: Destination student ID '${options.destinationStudentId}' does not exist.`);
  }

  if (destStudent.id === originalBill.studentId) {
    throw new Error(`INVALID_DESTINATION: Destination student is identical to current student.`);
  }

  const originalAmount = originalBill.payable ?? originalBill.subTotal ?? 0;
  const correctionId = `CORR-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  const timestamp = new Date().toISOString();

  // 1. Mark original bill voided
  const voidedOriginal: StudentBill = {
    ...originalBill,
    status: 'Voided',
    isVoided: true,
    voidedAt: timestamp,
    voidedBy: options.actor,
    voidReason: `Reassigned to ${destStudent.fullName} (${destStudent.admissionNo}): ${options.reasonText || options.reasonCode}`,
    correctionId,
    revision: (originalBill.revision || 1) + 1,
    updatedAt: timestamp,
    history: [
      ...(originalBill.history || []),
      {
        type: 'FEE_REASSIGNED_WRONG_STUDENT',
        destinationStudent: destStudent.fullName,
        date: timestamp,
        user: options.actor,
        reason: options.reasonText || options.reasonCode
      }
    ]
  };

  // 2. Create replacement bill for destination student
  const replacementBillNo = `BILL-${destStudent.admissionNo.replace(/[\/\s]/g, '-')}-${Date.now().toString().slice(-4)}`;
  const replacementBill: StudentBill = {
    id: `bill-corr-${destStudent.id}-${Date.now()}`,
    billNo: replacementBillNo,
    studentId: destStudent.id,
    studentName: destStudent.fullName,
    admissionNo: destStudent.admissionNo,
    className: destStudent.className,
    academicYear: originalBill.academicYear,
    term: originalBill.term,
    campus: destStudent.campus || originalBill.campus,
    items: originalBill.items ? [...originalBill.items] : [{ name: 'Tuition Fee', amount: originalAmount }],
    subTotal: originalBill.subTotal,
    arrears: 0,
    discount: 0,
    payable: originalAmount,
    paid: 0,
    balance: originalAmount,
    status: 'Unpaid',
    originalBillId: originalBill.id,
    originalStudentId: originalBill.studentId,
    correctionId,
    correctionReference: `Reassigned from ${originalBill.studentName} (${originalBill.admissionNo})`,
    revision: 1,
    dateIssued: timestamp.split('T')[0],
    updatedAt: timestamp,
    history: [
      {
        type: 'CORRECTION_REPLACEMENT_CREATED',
        originalBillId: originalBill.id,
        originalStudent: originalBill.studentName,
        date: timestamp,
        user: options.actor,
        reason: options.reasonText || options.reasonCode
      }
    ]
  };

  // Sync replacement with payments if any exist
  const payments = getStoredPayments();
  const syncedReplacement = syncBillWithPayments(replacementBill, payments);

  bills[billIndex] = voidedOriginal;
  bills.unshift(syncedReplacement);
  saveStoredBills(bills);

  // Record correction log
  const correctionRecord: FeeCorrectionRecord = {
    id: correctionId,
    originalBillId: originalBill.id,
    replacementBillId: syncedReplacement.id,
    originalStudentId: originalBill.studentId,
    correctedStudentId: destStudent.id,
    originalAmount,
    correctedAmount: originalAmount,
    action: 'CORRECT_STUDENT',
    reasonCode: options.reasonCode,
    reasonText: options.reasonText || `Reassigned fee from ${originalBill.studentName} to ${destStudent.fullName}`,
    actorId: options.actor,
    actorRole: options.role,
    campusId: originalBill.campus || options.campusId || 'JIPAS 1',
    timestamp,
    previousStatus: originalBill.status,
    newStatus: 'Voided',
    idempotencyKey: options.idempotencyKey,
    baseRevision: originalBill.revision
  };

  const logs = getStoredFeeCorrections();
  saveStoredFeeCorrections([correctionRecord, ...logs]);

  recordChangeEvent(
    'GOVERNANCE_CHECK_EXECUTED',
    options.actor,
    `Fee Reassigned from Student ${originalBill.studentName} (${originalBill.admissionNo}) to ${destStudent.fullName} (${destStudent.admissionNo}). Reason: ${options.reasonText || options.reasonCode}`,
    'SUCCESS'
  );

  return { originalBill: voidedOriginal, replacementBill: syncedReplacement, correction: correctionRecord };
}

/**
 * 4. CORRECT WRONG FEE ITEM
 */
export function correctFeeItem(options: CorrectItemOptions): { bill: StudentBill; correction: FeeCorrectionRecord } {
  const bills = getStoredBills();
  const billIndex = bills.findIndex(b => b.id === options.billId);

  if (billIndex === -1) {
    throw new Error(`FEE_NOT_FOUND: Bill ID '${options.billId}' does not exist.`);
  }

  const bill = bills[billIndex];
  validateCorrectionRequest(options, bill.campus);

  if (bill.isVoided || (bill.status || '').toUpperCase() === 'VOIDED') {
    throw new Error(`INVALID_STATE: Cannot correct item on a voided fee record.`);
  }

  const originalFeeItem = bill.items && bill.items.length > 0 ? bill.items[0].name : 'Fee Item';
  const originalAmount = bill.payable ?? bill.subTotal ?? 0;
  const newAmount = options.newAmount !== undefined ? options.newAmount : originalAmount;
  const correctionId = `CORR-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  const timestamp = new Date().toISOString();

  const updatedItems = options.items || [{ name: options.newFeeItemName, amount: newAmount }];

  const payments = getStoredPayments();
  const syncedBill = syncBillWithPayments({
    ...bill,
    items: updatedItems,
    subTotal: newAmount,
    payable: newAmount,
    status: 'Corrected',
    isCorrected: true,
    revision: (bill.revision || 1) + 1,
    updatedAt: timestamp,
    history: [
      ...(bill.history || []),
      {
        type: 'FEE_ITEM_CORRECTED',
        originalItem: originalFeeItem,
        newItem: options.newFeeItemName,
        date: timestamp,
        user: options.actor,
        reason: options.reasonText || options.reasonCode
      }
    ]
  }, payments);

  bills[billIndex] = syncedBill;
  saveStoredBills(bills);

  const correctionRecord: FeeCorrectionRecord = {
    id: correctionId,
    originalBillId: bill.id,
    originalStudentId: bill.studentId,
    originalAmount,
    correctedAmount: newAmount,
    originalFeeItem,
    correctedFeeItem: options.newFeeItemName,
    action: 'CORRECT_FEE_ITEM',
    reasonCode: options.reasonCode,
    reasonText: options.reasonText || `Corrected fee item from '${originalFeeItem}' to '${options.newFeeItemName}'`,
    actorId: options.actor,
    actorRole: options.role,
    campusId: bill.campus || options.campusId || 'JIPAS 1',
    timestamp,
    previousStatus: bill.status,
    newStatus: syncedBill.status,
    idempotencyKey: options.idempotencyKey,
    baseRevision: bill.revision
  };

  const logs = getStoredFeeCorrections();
  saveStoredFeeCorrections([correctionRecord, ...logs]);

  recordChangeEvent(
    'GOVERNANCE_CHECK_EXECUTED',
    options.actor,
    `Fee Item Corrected for Bill #${bill.billNo || bill.id}: '${originalFeeItem}' -> '${options.newFeeItemName}'. Reason: ${options.reasonText || options.reasonCode}`,
    'SUCCESS'
  );

  return { bill: syncedBill, correction: correctionRecord };
}

/**
 * 5. CORRECT WRONG ACADEMIC TERM
 */
export function correctFeeTerm(options: CorrectTermOptions): {
  originalBill: StudentBill;
  replacementBill: StudentBill;
  correction: FeeCorrectionRecord;
} {
  const bills = getStoredBills();
  const billIndex = bills.findIndex(b => b.id === options.billId);

  if (billIndex === -1) {
    throw new Error(`FEE_NOT_FOUND: Bill ID '${options.billId}' does not exist.`);
  }

  const originalBill = bills[billIndex];
  validateCorrectionRequest(options, originalBill.campus);

  const originalTerm = originalBill.term;
  const originalAmount = originalBill.payable ?? originalBill.subTotal ?? 0;
  const correctionId = `CORR-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  const timestamp = new Date().toISOString();

  // 1. Mark original bill voided
  const voidedOriginal: StudentBill = {
    ...originalBill,
    status: 'Voided',
    isVoided: true,
    voidedAt: timestamp,
    voidedBy: options.actor,
    voidReason: `Term corrected to ${options.newTerm}: ${options.reasonText || options.reasonCode}`,
    correctionId,
    revision: (originalBill.revision || 1) + 1,
    updatedAt: timestamp,
    history: [
      ...(originalBill.history || []),
      {
        type: 'FEE_TERM_REASSIGNED',
        originalTerm,
        newTerm: options.newTerm,
        date: timestamp,
        user: options.actor,
        reason: options.reasonText || options.reasonCode
      }
    ]
  };

  // 2. Create replacement bill in new term
  const replacementBill: StudentBill = {
    ...originalBill,
    id: `bill-term-${originalBill.studentId}-${Date.now()}`,
    billNo: `BILL-${(originalBill.admissionNo || 'STU').replace(/[\/\s]/g, '-')}-${Date.now().toString().slice(-4)}`,
    term: options.newTerm,
    status: 'Unpaid',
    isVoided: false,
    originalBillId: originalBill.id,
    correctionId,
    revision: 1,
    dateIssued: timestamp.split('T')[0],
    updatedAt: timestamp,
    history: [
      {
        type: 'CORRECTION_TERM_REPLACEMENT_CREATED',
        originalBillId: originalBill.id,
        originalTerm,
        date: timestamp,
        user: options.actor,
        reason: options.reasonText || options.reasonCode
      }
    ]
  };

  const payments = getStoredPayments();
  const syncedReplacement = syncBillWithPayments(replacementBill, payments);

  bills[billIndex] = voidedOriginal;
  bills.unshift(syncedReplacement);
  saveStoredBills(bills);

  const correctionRecord: FeeCorrectionRecord = {
    id: correctionId,
    originalBillId: originalBill.id,
    replacementBillId: syncedReplacement.id,
    originalStudentId: originalBill.studentId,
    originalAmount,
    correctedAmount: originalAmount,
    originalTerm,
    correctedTerm: options.newTerm,
    action: 'CORRECT_TERM',
    reasonCode: options.reasonCode,
    reasonText: options.reasonText || `Corrected fee term from '${originalTerm}' to '${options.newTerm}'`,
    actorId: options.actor,
    actorRole: options.role,
    campusId: originalBill.campus || options.campusId || 'JIPAS 1',
    timestamp,
    previousStatus: originalBill.status,
    newStatus: 'Voided',
    idempotencyKey: options.idempotencyKey,
    baseRevision: originalBill.revision
  };

  const logs = getStoredFeeCorrections();
  saveStoredFeeCorrections([correctionRecord, ...logs]);

  recordChangeEvent(
    'GOVERNANCE_CHECK_EXECUTED',
    options.actor,
    `Fee Term Corrected for Bill #${originalBill.billNo || originalBill.id}: '${originalTerm}' -> '${options.newTerm}'. Reason: ${options.reasonText || options.reasonCode}`,
    'SUCCESS'
  );

  return { originalBill: voidedOriginal, replacementBill: syncedReplacement, correction: correctionRecord };
}

/**
 * 6. CORRECT DUPLICATE FEE
 */
export function correctDuplicateFee(options: CorrectDuplicateOptions): {
  validBill: StudentBill;
  voidedBill: StudentBill;
  correction: FeeCorrectionRecord;
} {
  const bills = getStoredBills();
  const validIndex = bills.findIndex(b => b.id === options.validBillId);
  const dupIndex = bills.findIndex(b => b.id === options.duplicateBillId);

  if (validIndex === -1 || dupIndex === -1) {
    throw new Error(`FEE_NOT_FOUND: Valid or duplicate bill ID does not exist.`);
  }

  const validBill = bills[validIndex];
  const duplicateBill = bills[dupIndex];
  validateCorrectionRequest(options, duplicateBill.campus);

  const originalAmount = duplicateBill.payable ?? duplicateBill.subTotal ?? 0;
  const correctionId = `CORR-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  const timestamp = new Date().toISOString();

  // Void duplicate bill
  const voidedDuplicate: StudentBill = {
    ...duplicateBill,
    status: 'Voided',
    isVoided: true,
    voidedAt: timestamp,
    voidedBy: options.actor,
    voidReason: `Voided duplicate fee entry (Valid bill #${validBill.billNo || validBill.id}): ${options.reasonText || options.reasonCode}`,
    correctionId,
    revision: (duplicateBill.revision || 1) + 1,
    updatedAt: timestamp,
    history: [
      ...(duplicateBill.history || []),
      {
        type: 'FEE_DUPLICATE_VOIDED',
        validBillId: validBill.id,
        date: timestamp,
        user: options.actor,
        reason: options.reasonText || options.reasonCode
      }
    ]
  };

  bills[dupIndex] = voidedDuplicate;
  saveStoredBills(bills);

  const correctionRecord: FeeCorrectionRecord = {
    id: correctionId,
    originalBillId: duplicateBill.id,
    replacementBillId: validBill.id,
    originalStudentId: duplicateBill.studentId,
    originalAmount,
    correctedAmount: 0,
    action: 'CORRECT_DUPLICATE',
    reasonCode: options.reasonCode,
    reasonText: options.reasonText || `Voided duplicate fee entry #${duplicateBill.billNo || duplicateBill.id}`,
    actorId: options.actor,
    actorRole: options.role,
    campusId: duplicateBill.campus || options.campusId || 'JIPAS 1',
    timestamp,
    previousStatus: duplicateBill.status,
    newStatus: 'Voided',
    idempotencyKey: options.idempotencyKey,
    baseRevision: duplicateBill.revision
  };

  const logs = getStoredFeeCorrections();
  saveStoredFeeCorrections([correctionRecord, ...logs]);

  recordChangeEvent(
    'GOVERNANCE_CHECK_EXECUTED',
    options.actor,
    `Duplicate Fee Voided for Bill #${duplicateBill.billNo || duplicateBill.id} (${duplicateBill.studentName}). Reason: ${options.reasonText || options.reasonCode}`,
    'SUCCESS'
  );

  return { validBill, voidedBill: voidedDuplicate, correction: correctionRecord };
}

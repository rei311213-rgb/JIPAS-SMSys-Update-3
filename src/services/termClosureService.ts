/**
 * TERM CLOSURE & ARREARS ROLL-OVER SERVICE (OPTION A)
 * Authoritative financial end-of-term ledger finalization, past-period immutability lock,
 * and automated student arrears roll-over into subsequent academic terms.
 */

import { Student, StudentBill, PaymentRecord } from '../types';
import { getStoredBills, saveStoredBills, getStoredPayments } from './storageService';

export interface TermClosureSummary {
  academicYear: string;
  term: string;
  totalStudents: number;
  totalBilledAmount: number;
  totalCollectedAmount: number;
  totalOutstandingArrears: number;
  collectionRatePercent: number;
  fullyPaidCount: number;
  partiallyPaidCount: number;
  unpaidCount: number;
  closedAt?: string;
  closedBy?: string;
  certificateNo?: string;
  isLocked: boolean;
}

export interface ArrearsRollOverItem {
  studentId: string;
  admissionNo: string;
  studentName: string;
  className: string;
  previousBalance: number;
  nextTermTuition: number;
  newCombinedPayable: number;
  status: 'PENDING' | 'ROLLED_OVER' | 'SKIPPED';
}

const STORAGE_KEY_TERM_CLOSURES = 'jipas_term_closures_v1';

export function listTermClosures(): TermClosureSummary[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TERM_CLOSURES);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to read term closures:', e);
  }
  return [];
}

export function saveTermClosures(closures: TermClosureSummary[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_TERM_CLOSURES, JSON.stringify(closures));
  } catch (e) {
    console.error('Failed to save term closures:', e);
  }
}

export function calculateTermFinancials(
  academicYear: string,
  term: string,
  students: Student[],
  bills: StudentBill[],
  payments: PaymentRecord[]
): TermClosureSummary {
  const termBills = bills.filter(b => (!b.isVoided) && (b.academicYear === academicYear && b.term === term));
  const termPayments = payments.filter(p => p.academicYear === academicYear && p.term === term);

  let totalBilled = 0;
  let totalPaid = 0;
  let totalBalance = 0;
  let fullyPaid = 0;
  let partialPaid = 0;
  let unpaid = 0;

  termBills.forEach(b => {
    const payable = Number(b.payable || 0);
    const paid = Number(b.paid || 0);
    const balance = Number(b.balance || Math.max(0, payable - paid));

    totalBilled += payable;
    totalPaid += paid;
    totalBalance += balance;

    if (balance <= 0 && payable > 0) {
      fullyPaid++;
    } else if (paid > 0 && balance > 0) {
      partialPaid++;
    } else {
      unpaid++;
    }
  });

  const collectionRate = totalBilled > 0 ? Math.round((totalPaid / totalBilled) * 1000) / 10 : 100;
  const closures = listTermClosures();
  const existingClosure = closures.find(c => c.academicYear === academicYear && c.term === term);

  return {
    academicYear,
    term,
    totalStudents: termBills.length || students.length,
    totalBilledAmount: totalBilled,
    totalCollectedAmount: totalPaid,
    totalOutstandingArrears: totalBalance,
    collectionRatePercent: collectionRate,
    fullyPaidCount: fullyPaid,
    partiallyPaidCount: partialPaid,
    unpaidCount: unpaid,
    closedAt: existingClosure?.closedAt,
    closedBy: existingClosure?.closedBy,
    certificateNo: existingClosure?.certificateNo,
    isLocked: Boolean(existingClosure?.isLocked)
  };
}

export function finalizeAndLockTerm(
  academicYear: string,
  term: string,
  closedBy: string,
  summary: TermClosureSummary
): TermClosureSummary {
  const certificateNo = `CERT-FIN-${academicYear.replace(/[^0-9]/g, '')}-${term.slice(0, 1).toUpperCase()}-${Date.now().toString().slice(-6)}`;
  const closureRecord: TermClosureSummary = {
    ...summary,
    closedAt: new Date().toISOString(),
    closedBy,
    certificateNo,
    isLocked: true
  };

  const closures = listTermClosures().filter(c => !(c.academicYear === academicYear && c.term === term));
  closures.unshift(closureRecord);
  saveTermClosures(closures);

  // Dispatch lock event
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('jipas_term_locked', { detail: closureRecord }));
  }

  return closureRecord;
}

export function executeArrearsRollOver(
  fromTerm: string,
  toTerm: string,
  academicYear: string,
  nextTermTuitionByClass: Record<string, number>
): { rolledCount: number; totalArrearsRolled: number } {
  const allBills = getStoredBills();
  const fromBills = allBills.filter(b => b.academicYear === academicYear && b.term === fromTerm && !b.isVoided);

  let rolledCount = 0;
  let totalArrearsRolled = 0;

  const nextTermBills: StudentBill[] = [];

  fromBills.forEach(oldBill => {
    const outstanding = Number(oldBill.balance || 0);
    const standardTuition = nextTermTuitionByClass[oldBill.className] || 45000;
    const newPayable = standardTuition + outstanding;

    // Check if next term bill already exists
    const existingNext = allBills.find(b => b.studentId === oldBill.studentId && b.academicYear === academicYear && b.term === toTerm);

    if (existingNext) {
      existingNext.arrears = outstanding;
      existingNext.payable = (existingNext.subTotal || standardTuition) + outstanding;
      existingNext.balance = Math.max(0, existingNext.payable - (existingNext.paid || 0));
    } else {
      const newBill: StudentBill = {
        id: `bill-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        studentId: oldBill.studentId,
        studentName: oldBill.studentName,
        admissionNo: oldBill.admissionNo,
        className: oldBill.className,
        academicYear,
        term: toTerm,
        billNo: `BILL-${Date.now().toString().slice(-6)}`,
        items: [
          { name: `Tuition Fee (${toTerm})`, amount: standardTuition },
          ...(outstanding > 0 ? [{ name: `Carried Arrears from ${fromTerm}`, amount: outstanding }] : [])
        ],
        subTotal: standardTuition,
        arrears: outstanding,
        discount: 0,
        payable: newPayable,
        paid: 0,
        balance: newPayable,
        status: 'Unpaid'
      };
      nextTermBills.push(newBill);
    }

    if (outstanding > 0) {
      rolledCount++;
      totalArrearsRolled += outstanding;
    }
  });

  saveStoredBills([...allBills, ...nextTermBills]);
  return { rolledCount, totalArrearsRolled };
}

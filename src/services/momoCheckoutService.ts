/**
 * PARENT & STUDENT MOBILE MONEY CHECKOUT SERVICE (OPTION 2)
 * Simulated USSD push checkout for MTN Mobile Money & Orange Money Cameroon,
 * automatic ledger balance clearance, and immediate digital receipt issuance.
 */

import { Student, StudentBill, PaymentRecord } from '../types';
import { generateNextReceiptSerialNumber } from './receiptSerialService';
import { getStoredBills, saveStoredBills, getStoredPayments, saveStoredPayments } from './storageService';

export interface MomoCheckoutRequest {
  student: Student;
  bill?: StudentBill;
  amount: number;
  provider: 'MTN_MOMO' | 'ORANGE_MONEY' | 'VISA_CARD';
  phoneNumber: string;
  payerName: string;
  description?: string;
}

export interface MomoCheckoutResponse {
  success: boolean;
  transactionRef: string;
  receiptNo: string;
  paymentRecord: PaymentRecord;
  message: string;
}

export async function processSelfServiceMomoPayment(
  req: MomoCheckoutRequest
): Promise<MomoCheckoutResponse> {
  // Simulate network latency for USSD push
  await new Promise(resolve => setTimeout(resolve, 800));

  const academicYear = req.bill?.academicYear || req.student.academicYear || '2025/2026';
  const term = req.bill?.term || req.student.term || 'First Term';
  const receiptNo = generateNextReceiptSerialNumber({ academicYear });
  const transactionRef = `${req.provider}-${Date.now().toString().slice(-8)}`;

  const paymentRecord: PaymentRecord = {
    id: `pay-momo-${Date.now()}`,
    receiptNo,
    referenceNo: transactionRef,
    studentId: req.student.id,
    studentName: req.student.fullName,
    admissionNo: req.student.admissionNo,
    className: req.student.className,
    date: new Date().toISOString().split('T')[0],
    academicYear,
    term,
    amount: req.amount,
    paid: req.amount,
    payable: req.bill?.payable ?? req.amount,
    balance: Math.max(0, (req.bill?.balance ?? req.amount) - req.amount),
    method: req.provider === 'MTN_MOMO' ? 'MTN Mobile Money' : req.provider === 'ORANGE_MONEY' ? 'Orange Money' : 'Credit Card',
    paymentMethod: req.provider === 'MTN_MOMO' ? 'MTN Mobile Money' : req.provider === 'ORANGE_MONEY' ? 'Orange Money' : 'Credit Card',
    paidAs: req.description || 'School Fees Parent Self-Service Payment',
    receivedBy: `Self-Service App (${req.provider})`,
    collectedBy: `Self-Service App (${req.provider})`,
    status: 'Confirmed',
    notes: `Payer: ${req.payerName} (${req.phoneNumber}) - USSD Confirmed`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // 1. Save payment record
  const existingPayments = getStoredPayments();
  saveStoredPayments([paymentRecord, ...existingPayments]);

  // 2. Clear / deduct bill balance
  const allBills = getStoredBills();
  const updatedBills: StudentBill[] = allBills.map(b => {
    if (b.studentId === req.student.id || (req.student.admissionNo && b.admissionNo === req.student.admissionNo)) {
      const newPaid = (b.paid ?? 0) + req.amount;
      const payable = b.payable ?? 0;
      const newBalance = Math.max(0, payable - newPaid);
      const newStatus: StudentBill['status'] = newBalance === 0 ? 'Fully Paid' : 'Partially Paid';
      return {
        ...b,
        paid: newPaid,
        balance: newBalance,
        status: newStatus,
        updatedAt: new Date().toISOString()
      };
    }
    return b;
  });
  saveStoredBills(updatedBills);

  // 3. Dispatch global sync event
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('jipas_fee_payment_recorded', { detail: paymentRecord }));
    window.dispatchEvent(new CustomEvent('jipas_cloud_synced', { detail: { type: 'MOMO_PAYMENT', paymentRecord } }));
  }

  return {
    success: true,
    transactionRef,
    receiptNo,
    paymentRecord,
    message: `Payment of ${req.amount.toLocaleString()} CFA via ${req.provider} confirmed! Official Receipt ${receiptNo} issued.`
  };
}

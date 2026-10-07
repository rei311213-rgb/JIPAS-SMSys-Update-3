/**
 * JIPAS Online Mobile Money & Card Payment Gateway Service
 * Simulates and processes real-world West African & Global payment channels:
 * - T-Money (Togocom Togo)
 * - Moov Money / Flooz (Moov Togo / Benin)
 * - MTN Mobile Money (Ghana / Côte d'Ivoire)
 * - Orange Money (Senegal / Mali / Côte d'Ivoire)
 * - Visa / Mastercard Online Checkout
 */

import { PaymentRecord, Student, StudentBill } from '../types';
import { saveStoredPayments, getStoredPayments, saveStoredBills, getStoredBills } from './storageService';
import { generateNextReceiptSerialNumber } from './receiptSerialService';

export type PaymentChannelType = 'TMONEY' | 'FLOOZ' | 'MTN_MOMO' | 'ORANGE_MONEY' | 'VISA_MASTERCARD';

export interface OnlinePaymentRequest {
  student: Student;
  bill?: StudentBill;
  amount: number;
  channel: PaymentChannelType;
  phoneOrCardNumber: string;
  payerName: string;
  payerEmail?: string;
  description: string;
  term?: string;
  academicYear?: string;
}

export interface OnlinePaymentResponse {
  success: boolean;
  transactionRef: string;
  receiptNo: string;
  paymentRecord?: PaymentRecord;
  message: string;
  channel: PaymentChannelType;
  timestamp: string;
}

export const PAYMENT_CHANNELS: {
  id: PaymentChannelType;
  name: string;
  provider: string;
  logoColor: string;
  countryBadge: string;
  currency: string;
}[] = [
  {
    id: 'TMONEY',
    name: 'T-Money',
    provider: 'Togocom',
    logoColor: 'from-amber-500 to-yellow-600',
    countryBadge: '🇹🇬 Togo',
    currency: 'CFA'
  },
  {
    id: 'FLOOZ',
    name: 'Moov Money (Flooz)',
    provider: 'Moov Africa',
    logoColor: 'from-blue-600 to-indigo-700',
    countryBadge: '🇹🇬 / 🇧🇯 West Africa',
    currency: 'CFA'
  },
  {
    id: 'MTN_MOMO',
    name: 'MTN Mobile Money',
    provider: 'MTN Group',
    logoColor: 'from-yellow-400 to-amber-500',
    countryBadge: '🇬🇭 Ghana / 🇨🇮 CI',
    currency: 'GHS / CFA'
  },
  {
    id: 'ORANGE_MONEY',
    name: 'Orange Money',
    provider: 'Orange Africa',
    logoColor: 'from-orange-500 to-amber-600',
    countryBadge: '🇨🇮 / 🇸🇳 UEMOA',
    currency: 'CFA'
  },
  {
    id: 'VISA_MASTERCARD',
    name: 'Credit / Debit Card',
    provider: 'Visa & Mastercard',
    logoColor: 'from-slate-800 to-slate-950',
    countryBadge: '🌐 Worldwide',
    currency: 'CFA / USD'
  }
];

export async function processOnlineFeePayment(
  req: OnlinePaymentRequest
): Promise<OnlinePaymentResponse> {
  // Simulate network processing latency
  await new Promise(resolve => setTimeout(resolve, 1800));

  const amountVal = Math.max(0, Number(req.amount) || 0);
  if (amountVal <= 0) {
    return {
      success: false,
      transactionRef: `FAIL-${Date.now()}`,
      receiptNo: '',
      message: 'Payment amount must be greater than 0 CFA.',
      channel: req.channel,
      timestamp: new Date().toISOString()
    };
  }

  const dateStr = new Date().toISOString().split('T')[0];
  const academicYear = req.academicYear || req.bill?.academicYear || '2025-2026';
  const term = req.term || req.bill?.term || 'First Term';

  // Generate authoritative serial number
  const receiptNo = generateNextReceiptSerialNumber({ academicYear });
  const transactionRef = `MOMO-${req.channel}-${Date.now().toString().slice(-8)}`;

  const paymentRecord: PaymentRecord = {
    id: `pay-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    receiptNo,
    referenceNo: transactionRef,
    studentId: req.student.id,
    studentName: req.student.fullName || (req.student as any).name || 'Student',
    admissionNo: req.student.admissionNo,
    className: req.student.className || (req.student as any).class || 'Assigned Class',
    date: dateStr,
    academicYear,
    term,
    amount: amountVal,
    paid: amountVal,
    payable: req.bill?.payable ?? amountVal,
    balance: Math.max(0, (req.bill?.balance ?? amountVal) - amountVal),
    method: req.channel === 'VISA_MASTERCARD' ? 'Credit Card Online' : `${req.channel} Mobile Money`,
    paymentMethod: req.channel === 'VISA_MASTERCARD' ? 'Credit Card Online' : `${req.channel} Mobile Money`,
    paidAs: req.description || 'School Fees Online Payment',
    receivedBy: `Online Gateway (${req.channel})`,
    collectedBy: `Online Gateway (${req.channel})`,
    status: 'Confirmed',
    notes: `Payer: ${req.payerName} (${req.phoneOrCardNumber})`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // Persist into stored payments
  const storedPayments = getStoredPayments();
  saveStoredPayments([paymentRecord, ...storedPayments]);

  // Update associated student bill
  const allBills = getStoredBills();
  const updatedBills: StudentBill[] = allBills.map(b => {
    if (b.studentId === req.student.id || (req.student.admissionNo && b.admissionNo === req.student.admissionNo)) {
      const newPaid = (b.paid ?? 0) + amountVal;
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

  // Dispatch cloud sync event
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('jipas_cloud_synced', {
      detail: { type: 'ONLINE_PAYMENT_PROCESSED', paymentRecord }
    }));
  }

  return {
    success: true,
    transactionRef,
    receiptNo,
    paymentRecord,
    message: `Payment of ${amountVal.toLocaleString()} CFA via ${req.channel} was successfully verified and recorded.`,
    channel: req.channel,
    timestamp: new Date().toISOString()
  };
}

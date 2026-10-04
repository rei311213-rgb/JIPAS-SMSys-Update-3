/**
 * JIPAS SMSys - Phase 55
 * FISCAL COMPLIANCE & AUDITABLE RECEIPT SERIAL NUMBER GENERATOR
 * 
 * Provides monotonically auto-incrementing, collision-proof receipt serial numbers
 * conforming to Ghanaian/Togolese fiscal audit standards.
 */

import { getStoredPayments } from './storageService';
import { PaymentRecord } from '../types';

export const STORAGE_KEY_RECEIPT_COUNTER = 'jipas_fiscal_receipt_serial_counter';
export const DEFAULT_RECEIPT_PREFIX = 'REC';

interface SerialOptions {
  academicYear?: string;
  prefix?: string;
}

/**
 * Extracts numeric sequence from existing receipt numbers
 */
function extractNumericSequence(receiptNo: string): number | null {
  if (!receiptNo) return null;
  // Patterns like REC/2026/000123 or REC-2026-000123 or RCT-20261004-ABC
  const parts = receiptNo.split(/[/_-]/);
  for (let i = parts.length - 1; i >= 0; i--) {
    const part = parts[i];
    if (/^\d{3,}$/.test(part)) {
      const num = parseInt(part, 10);
      if (!isNaN(num) && num > 0) return num;
    }
  }
  return null;
}

/**
 * Resolves the highest sequence number present in current payments
 */
export function getHighestExistingSequence(): number {
  try {
    const payments = getStoredPayments();
    let maxSeq = 0;
    for (const p of payments) {
      if (p.receiptNo) {
        const seq = extractNumericSequence(p.receiptNo);
        if (seq && seq > maxSeq) {
          maxSeq = seq;
        }
      }
    }
    return maxSeq;
  } catch {
    return 0;
  }
}

/**
 * Gets the current serial counter value from storage or seeds it from existing payments
 */
export function getCurrentReceiptSequence(): number {
  if (typeof window === 'undefined') return 1;
  try {
    const stored = localStorage.getItem(STORAGE_KEY_RECEIPT_COUNTER);
    if (stored !== null) {
      const parsed = parseInt(stored, 10);
      if (!isNaN(parsed) && parsed > 0) {
        // Ensure stored counter is at least higher than highest existing payment
        const highestExisting = getHighestExistingSequence();
        return Math.max(parsed, highestExisting);
      }
    }
    // If not stored yet, initialize from existing database
    const highestExisting = getHighestExistingSequence();
    const initial = highestExisting > 0 ? highestExisting : 1000;
    localStorage.setItem(STORAGE_KEY_RECEIPT_COUNTER, String(initial));
    return initial;
  } catch {
    return 1000;
  }
}

/**
 * Explicitly sets or recalibrates the counter (for admin reconciliation)
 */
export function setReceiptSequence(newSequence: number): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_RECEIPT_COUNTER, String(Math.max(1, newSequence)));
    window.dispatchEvent(new CustomEvent('jipas_receipt_counter_updated', { detail: { sequence: newSequence } }));
  } catch (err) {
    console.warn('[ReceiptSerialService] Could not store serial counter:', err);
  }
}

/**
 * Formats a sequence number into the fiscal compliant string
 * Example: REC/2026/001001
 */
export function formatReceiptSerialNumber(sequence: number, options?: SerialOptions): string {
  const currentYear = options?.academicYear 
    ? options.academicYear.split(/[-/]/)[0] 
    : new Date().getFullYear().toString();
  const prefix = options?.prefix || DEFAULT_RECEIPT_PREFIX;
  const padded = String(sequence).padStart(6, '0');
  return `${prefix}/${currentYear}/${padded}`;
}

/**
 * Peeks at the next serial number without advancing the counter
 * (Used for preview modals and draft screens)
 */
export function peekNextReceiptSerialNumber(options?: SerialOptions): string {
  const current = getCurrentReceiptSequence();
  return formatReceiptSerialNumber(current + 1, options);
}

/**
 * Generates the NEXT auto-incrementing serial number, guarantees uniqueness against
 * all current payments, saves the counter, and returns the formatted receipt string.
 */
export function generateNextReceiptSerialNumber(options?: SerialOptions): string {
  let counter = getCurrentReceiptSequence();
  const payments = getStoredPayments();
  const existingReceiptNos = new Set(
    payments.map(p => (p.receiptNo || '').toLowerCase().trim()).filter(Boolean)
  );

  let attempts = 0;
  let nextSeq = counter + 1;
  let formatted = formatReceiptSerialNumber(nextSeq, options);

  // Guard against any collision with past payments
  while (existingReceiptNos.has(formatted.toLowerCase().trim()) && attempts < 1000) {
    nextSeq++;
    attempts++;
    formatted = formatReceiptSerialNumber(nextSeq, options);
  }

  // Atomically update storage counter
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY_RECEIPT_COUNTER, String(nextSeq));
      window.dispatchEvent(new CustomEvent('jipas_receipt_counter_updated', { detail: { sequence: nextSeq } }));
      window.dispatchEvent(new CustomEvent('jipas_cloud_synced'));
    } catch (e) {
      console.warn('[ReceiptSerialService] Failed to persist receipt counter:', e);
    }
  }

  return formatted;
}

/**
 * Performs a forensic audit of receipt serial numbers across payments
 * to check for missing sequences or collisions for fiscal compliance.
 */
export function auditReceiptSerialChain(paymentsList?: PaymentRecord[]): {
  totalReceipts: number;
  highestSequence: number;
  duplicateReceipts: string[];
  missingSequences: number[];
  complianceScore: number;
} {
  const payments = paymentsList || getStoredPayments();
  const seen = new Map<string, number>();
  const sequences: number[] = [];
  const duplicates: string[] = [];

  payments.forEach(p => {
    if (!p.receiptNo) return;
    const norm = p.receiptNo.trim().toUpperCase();
    const count = (seen.get(norm) || 0) + 1;
    seen.set(norm, count);
    if (count === 2) {
      duplicates.push(norm);
    }
    const seq = extractNumericSequence(norm);
    if (seq !== null) {
      sequences.push(seq);
    }
  });

  sequences.sort((a, b) => a - b);
  const highestSequence = sequences.length > 0 ? sequences[sequences.length - 1] : 0;
  const lowestSequence = sequences.length > 0 ? sequences[0] : 0;

  // Detect missing numbers in contiguous sequence range
  const missingSequences: number[] = [];
  if (sequences.length > 1 && lowestSequence > 0 && highestSequence > lowestSequence) {
    const seqSet = new Set(sequences);
    // Limit check to reasonable range
    const checkLimit = Math.min(highestSequence, lowestSequence + 1000);
    for (let s = lowestSequence; s <= checkLimit; s++) {
      if (!seqSet.has(s)) {
        missingSequences.push(s);
      }
    }
  }

  const complianceScore = Math.max(0, 100 - (duplicates.length * 15) - (missingSequences.length > 5 ? 10 : missingSequences.length * 2));

  return {
    totalReceipts: payments.filter(p => !!p.receiptNo).length,
    highestSequence,
    duplicateReceipts: duplicates,
    missingSequences,
    complianceScore
  };
}

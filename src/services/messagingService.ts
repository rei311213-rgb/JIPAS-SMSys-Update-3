/**
 * JIPAS School Messaging & Automated Parent Alert Service
 * Generates direct WhatsApp dispatch links and SMS templates for:
 * 1. Instant Payment Receipts
 * 2. Overdue Fee Balance Reminders
 * 3. Daily Attendance Absence Alerts
 * 4. Terminal Report Release Broadcasts
 */

import { PaymentRecord, Student, StudentBill } from '../types';
import { getStoredSettings } from './storageService';

export interface WhatsAppMessagePayload {
  recipientPhone: string;
  recipientName: string;
  message: string;
  whatsappUrl: string;
}

// Clean phone number format for WhatsApp (e.g. removes spaces, dashes, prepends country code if missing)
export function sanitizePhoneNumber(phone: string, defaultCountryCode: string = '228'): string {
  if (!phone) return '';
  let cleaned = phone.replace(/[^0-9+]/g, '');
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  } else if (cleaned.startsWith('00')) {
    cleaned = cleaned.substring(2);
  } else if (cleaned.length === 8) {
    // Standard Togo/Benin 8-digit mobile number
    cleaned = defaultCountryCode + cleaned;
  }
  return cleaned;
}

/**
 * Generates a WhatsApp dispatch payload for an official fee payment receipt
 */
export function generatePaymentReceiptWhatsApp(
  payment: PaymentRecord,
  student: Student,
  bill?: StudentBill,
  language: 'FR' | 'EN' = 'FR'
): WhatsAppMessagePayload {
  const settings = getStoredSettings();
  const schoolName = settings.schoolName || "JOY INTERNATIONAL SCHOOL (JIPAS)";
  const phone = student.parentPhone || (student as any).guardianPhone || (student as any).phone || '';
  const cleanPhone = sanitizePhoneNumber(phone);
  const amount = Number(payment.paid ?? payment.amount ?? 0).toLocaleString();
  const balance = Number(payment.balance ?? bill?.balance ?? 0).toLocaleString();
  const date = payment.date || new Date().toISOString().split('T')[0];

  let message = '';

  if (language === 'FR') {
    message = `*REÇU DE PAIEMENT OFFICIEL — ${schoolName}*\n\n` +
      `Bonjour Chers Parents de *${student.fullName || (student as any).name}* (Matricule: ${student.admissionNo || 'N/A'}),\n\n` +
      `Nous confirmons la bonne réception de votre versement pour les frais scolaires :\n` +
      `📄 *N° de Reçu :* ${payment.receiptNo}\n` +
      `📅 *Date :* ${date}\n` +
      `💵 *Montant Versé :* ${amount} CFA\n` +
      `📌 *Motif :* ${payment.paidAs || payment.notes || 'Frais de Scolarité'}\n` +
      `💳 *Mode :* ${payment.paymentMethod || payment.method || 'Espèces'}\n` +
      `⚖️ *Solde Restant :* ${balance} CFA\n` +
      `🏛️ *Reçu par :* ${payment.receivedBy || payment.collectedBy || 'Caisse Centrale'}\n\n` +
      `Merci pour votre confiance.\n` +
      `_Direction des Finances JIPAS — Lomé, Togo_`;
  } else {
    message = `*OFFICIAL PAYMENT RECEIPT — ${schoolName}*\n\n` +
      `Dear Parent / Guardian of *${student.fullName || (student as any).name}* (Adm No: ${student.admissionNo || 'N/A'}),\n\n` +
      `We acknowledge with thanks the receipt of your school fee payment:\n` +
      `📄 *Receipt No:* ${payment.receiptNo}\n` +
      `📅 *Date:* ${date}\n` +
      `💵 *Amount Paid:* ${amount} CFA\n` +
      `📌 *Description:* ${payment.paidAs || payment.notes || 'Tuition Fees'}\n` +
      `💳 *Payment Method:* ${payment.paymentMethod || payment.method || 'Cash'}\n` +
      `⚖️ *Remaining Balance:* ${balance} CFA\n` +
      `🏛️ *Received By:* ${payment.receivedBy || payment.collectedBy || 'Finance Desk'}\n\n` +
      `Thank you for your cooperation.\n` +
      `_JIPAS Finance Administration_`;
  }

  const encoded = encodeURIComponent(message);
  const whatsappUrl = cleanPhone 
    ? `https://wa.me/${cleanPhone}?text=${encoded}`
    : `https://wa.me/?text=${encoded}`;

  return {
    recipientPhone: phone,
    recipientName: student.parentName || (student as any).guardianName || 'Parent / Guardian',
    message,
    whatsappUrl
  };
}

/**
 * Generates an Overdue Fee Reminder alert for WhatsApp
 */
export function generateOverdueFeeReminderWhatsApp(
  student: Student,
  outstandingBalance: number,
  dueDate?: string,
  language: 'FR' | 'EN' = 'FR'
): WhatsAppMessagePayload {
  const settings = getStoredSettings();
  const schoolName = settings.schoolName || "JOY INTERNATIONAL SCHOOL (JIPAS)";
  const phone = student.parentPhone || (student as any).guardianPhone || (student as any).phone || '';
  const cleanPhone = sanitizePhoneNumber(phone);
  const formattedBalance = outstandingBalance.toLocaleString();

  let message = '';
  if (language === 'FR') {
    message = `*RAPPEL IMPORTANT DE SCOLARITÉ — ${schoolName}*\n\n` +
      `Chers Parents de *${student.fullName || (student as any).name}* (${student.className || (student as any).class}),\n\n` +
      `Nous vous informons qu'un solde de frais scolaires reste impayé sur le compte de votre enfant :\n` +
      `💰 *Arriéré Restant :* ${formattedBalance} CFA\n` +
      (dueDate ? `⏰ *Date Limite Souhaitée :* ${dueDate}\n` : '') +
      `\nNous vous prions de bien vouloir régulariser ce montant à la caisse de l'établissement ou par Mobile Money afin d'assurer la continuité des cours et l'accès aux examens.\n\n` +
      `Pour toute question, contactez notre secrétariat au ${settings.phone || '(00228) 22 60 21 38'}.\n` +
      `_La Direction JIPAS_`;
  } else {
    message = `*IMPORTANT FEE BALANCE REMINDER — ${schoolName}*\n\n` +
      `Dear Parent / Guardian of *${student.fullName || (student as any).name}* (${student.className || (student as any).class}),\n\n` +
      `This is a gentle reminder regarding the outstanding school fee balance for your child:\n` +
      `💰 *Outstanding Balance:* ${formattedBalance} CFA\n` +
      (dueDate ? `⏰ *Due Date:* ${dueDate}\n` : '') +
      `\nPlease kindly settle this balance at the accounts desk or via Mobile Money to guarantee uninterrupted classes and examination clearance.\n\n` +
      `Contact Secretariat: ${settings.phone || '(00228) 22 60 21 38'}.\n` +
      `_JIPAS Administration_`;
  }

  const encoded = encodeURIComponent(message);
  const whatsappUrl = cleanPhone 
    ? `https://wa.me/${cleanPhone}?text=${encoded}`
    : `https://wa.me/?text=${encoded}`;

  return {
    recipientPhone: phone,
    recipientName: student.parentName || (student as any).guardianName || 'Parent / Guardian',
    message,
    whatsappUrl
  };
}

/**
 * Generates an Attendance Absence Alert for Parents
 */
export function generateAbsenceAlertWhatsApp(
  student: Student,
  dateStr: string,
  language: 'FR' | 'EN' = 'FR'
): WhatsAppMessagePayload {
  const settings = getStoredSettings();
  const schoolName = settings.schoolName || "JOY INTERNATIONAL SCHOOL (JIPAS)";
  const phone = student.parentPhone || (student as any).guardianPhone || (student as any).phone || '';
  const cleanPhone = sanitizePhoneNumber(phone);

  let message = '';
  if (language === 'FR') {
    message = `*AVIS D'ABSENCE — ${schoolName}*\n\n` +
      `Bonjour Chers Parents,\n` +
      `Nous constatons l'absence de votre enfant *${student.fullName || (student as any).name}* (Classe: ${student.className || (student as any).class}) aujourd'hui le *${dateStr}*.\n\n` +
      `Si cette absence est justifiée (santé, urgence familiale), merci de bien vouloir informer la vie scolaire au ${settings.phone || '(00228) 22 60 21 38'}.\n\n` +
      `_Service de Discipline JIPAS_`;
  } else {
    message = `*ABSENCE NOTIFICATION — ${schoolName}*\n\n` +
      `Dear Parent / Guardian,\n` +
      `Your ward *${student.fullName || (student as any).name}* (Class: ${student.className || (student as any).class}) was recorded absent today, *${dateStr}*.\n\n` +
      `If this absence is due to illness or emergency, kindly notify the administration at ${settings.phone || '(00228) 22 60 21 38'}.\n\n` +
      `_JIPAS Attendance Desk_`;
  }

  const encoded = encodeURIComponent(message);
  const whatsappUrl = cleanPhone 
    ? `https://wa.me/${cleanPhone}?text=${encoded}`
    : `https://wa.me/?text=${encoded}`;

  return {
    recipientPhone: phone,
    recipientName: student.parentName || (student as any).guardianName || 'Parent / Guardian',
    message,
    whatsappUrl
  };
}

/**
 * Open WhatsApp dispatch in a safe new window or direct navigation
 */
export function dispatchWhatsAppMessage(payload: WhatsAppMessagePayload): void {
  if (typeof window !== 'undefined') {
    window.open(payload.whatsappUrl, '_blank', 'noopener,noreferrer');
  }
}

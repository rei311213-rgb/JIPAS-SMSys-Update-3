/**
 * JIPAS Educational Complex - Excel (.xlsx) Report Export Engine
 * 
 * Provides automated, formatted .xlsx spreadsheet downloads for:
 * 1. Enrolled Student Lists & Biodata
 * 2. Financial Payment Receipts & Ledger Records
 * 3. Teaching Faculty & Staff Records
 * 4. Custom Generic Datasets
 */

import * as XLSX from 'xlsx';
import { Student, PaymentRecord, Teacher, StudentBill } from '../types';

/**
 * Exports Student Directory to formatted .xlsx file
 */
export function exportStudentsToExcel(students: Student[], fileNamePrefix: string = 'JIPAS_Student_Directory'): void {
  const exportData = students.map((s, idx) => ({
    '#': idx + 1,
    'Admission No': s.admissionNo,
    'Full Name': s.fullName,
    'Gender': s.gender || 'N/A',
    'Class / Level': s.className,
    'Department': s.department || 'N/A',
    'Campus': s.campus || 'JIPAS 1',
    'Date of Birth': s.dob || 'N/A',
    'Nationality': s.nationality || 'Ghanaian',
    'Guardian Name': s.parentName || 'N/A',
    'Guardian Phone': s.parentPhone || 'N/A',
    'Academic Year': s.academicYear || '2026-2027',
    'Status': s.status || 'Active',
    'Enrollment Date': s.enrollmentDate || s.admissionDate || 'N/A'
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  
  // Auto-set column widths for clean readability
  const colWidths = [
    { wch: 5 },  // #
    { wch: 18 }, // Admission No
    { wch: 28 }, // Full Name
    { wch: 10 }, // Gender
    { wch: 15 }, // Class
    { wch: 22 }, // Department
    { wch: 12 }, // Campus
    { wch: 14 }, // DOB
    { wch: 14 }, // Nationality
    { wch: 24 }, // Guardian Name
    { wch: 16 }, // Guardian Phone
    { wch: 14 }, // Academic Year
    { wch: 12 }, // Status
    { wch: 14 }  // Enrollment Date
  ];
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Enrolled Students');

  const dateStr = new Date().toISOString().split('T')[0];
  XLSX.writeFile(workbook, `${fileNamePrefix}_${dateStr}.xlsx`);
}

/**
 * Exports Payment & Bursary Receipts Records to formatted .xlsx file
 */
export function exportPaymentsToExcel(payments: PaymentRecord[], fileNamePrefix: string = 'JIPAS_Payment_Ledger'): void {
  const exportData = payments.map((p, idx) => ({
    '#': idx + 1,
    'Receipt No': p.receiptNo || p.id,
    'Date Paid': p.date || 'N/A',
    'Student Name': p.studentName,
    'Admission No': p.admissionNo,
    'Class': p.className || 'N/A',
    'Amount Paid': Number(p.amount || p.paid || 0),
    'Payment Channel': p.paymentMethod || 'Cash',
    'Reference / Txn ID': p.referenceNo || 'N/A',
    'Term / Period': p.term || 'Current Term',
    'Academic Year': p.academicYear || '2026-2027',
    'Bursar / Cashier': p.receivedBy || 'Bursary',
    'Status': p.status || 'Active'
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);

  const colWidths = [
    { wch: 5 },  // #
    { wch: 20 }, // Receipt No
    { wch: 14 }, // Date
    { wch: 26 }, // Student Name
    { wch: 18 }, // Admission No
    { wch: 14 }, // Class
    { wch: 15 }, // Amount
    { wch: 18 }, // Payment Channel
    { wch: 22 }, // Reference No
    { wch: 14 }, // Term
    { wch: 14 }, // Academic Year
    { wch: 20 }, // Cashier
    { wch: 12 }  // Status
  ];
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Payment Records');

  const dateStr = new Date().toISOString().split('T')[0];
  XLSX.writeFile(workbook, `${fileNamePrefix}_${dateStr}.xlsx`);
}

/**
 * Exports Teaching & Administrative Staff Directory to formatted .xlsx file
 */
export function exportStaffToExcel(teachers: Teacher[], fileNamePrefix: string = 'JIPAS_Staff_Directory'): void {
  const exportData = teachers.map((t, idx) => ({
    '#': idx + 1,
    'Staff ID': t.staffId || t.id,
    'Full Name': t.name,
    'Gender': t.gender || 'N/A',
    'Designation': t.designation || 'Faculty Member',
    'Assigned Rank': t.rank || 'N/A',
    'Department': t.department || 'N/A',
    'Phone Contact': t.phone,
    'Email Address': t.email || 'N/A',
    'NTC License No': t.ntcLicenseNo || 'N/A',
    'Academic Quals': t.academicQualification || 'N/A',
    'Classes Taught': Array.isArray(t.classesTaught) ? t.classesTaught.join(', ') : (t.classesTaught || 'N/A'),
    'Subjects Taught': Array.isArray(t.subjectsTaught) ? t.subjectsTaught.join(', ') : (t.subjectsTaught || 'N/A'),
    'Campus': t.campus || 'JIPAS 1',
    'Employment Date': t.dateOfEmployment || 'N/A',
    'Probation Status': t.probationStatus || 'Confirmed'
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);

  const colWidths = [
    { wch: 5 },  // #
    { wch: 18 }, // Staff ID
    { wch: 26 }, // Full Name
    { wch: 10 }, // Gender
    { wch: 20 }, // Designation
    { wch: 22 }, // Rank
    { wch: 22 }, // Department
    { wch: 16 }, // Phone
    { wch: 26 }, // Email
    { wch: 20 }, // NTC License
    { wch: 24 }, // Quals
    { wch: 20 }, // Classes Taught
    { wch: 24 }, // Subjects Taught
    { wch: 12 }, // Campus
    { wch: 16 }, // Employment Date
    { wch: 16 }  // Probation Status
  ];
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Staff Directory');

  const dateStr = new Date().toISOString().split('T')[0];
  XLSX.writeFile(workbook, `${fileNamePrefix}_${dateStr}.xlsx`);
}

/**
 * Generic Excel Exporter for any tabular data
 */
export function exportGenericToExcel<T extends Record<string, any>>(
  data: T[], 
  sheetName: string = 'Report', 
  fileNamePrefix: string = 'JIPAS_Report'
): void {
  if (!data || data.length === 0) return;

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  const dateStr = new Date().toISOString().split('T')[0];
  XLSX.writeFile(workbook, `${fileNamePrefix}_${dateStr}.xlsx`);
}

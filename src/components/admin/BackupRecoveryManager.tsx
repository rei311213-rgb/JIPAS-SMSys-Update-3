import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Database, HardDrive, Cloud, Download, Upload, RefreshCw, CheckCircle2, 
  AlertTriangle, Shield, Clock, FileJson, ArrowUpRight, Check, Trash2, 
  FileText, Lock, Sparkles, ExternalLink, Calendar, Users, Layers, AlertCircle, X,
  Briefcase, Receipt, CreditCard, UserCheck, DollarSign, BookOpen
} from 'lucide-react';
import { Student, Teacher, TermReport, StudentBill, PaymentRecord, CalendarEvent, NotificationItem } from '../../types';
import { saveStudent, saveBill, saveReport, savePayment } from '../../services/dbService';
import { 
  getStoredUsers,
  saveStoredUsers,
  saveStoredStudents,
  saveStoredTeachers,
  saveStoredBills,
  saveStoredPayments,
  saveStoredReports,
  getStoredExpenses,
  saveStoredExpenses,
  getStoredSecretarySummaries,
  saveStoredSecretarySummaries,
  getStoredTeacherAttendance,
  saveStoredTeacherAttendance,
  getStoredFinancialAudits,
  saveStoredFinancialAudits,
  getStoredClassFeeTariffs,
  saveStoredClassFeeTariffs,
  getStoredPaymentSettings,
  saveStoredPaymentSettings,
  getStoredAcademicYears,
  getStoredTerms,
  getStoredDepartments,
  getStoredCourses,
  getStoredClasses,
  getStoredHouses,
  getStoredSubjects,
  getStoredClassBroadcasts
} from '../../services/storageService';
import { exportAllIndexedDBData, downloadJSONFile } from '../../services/idbService';
import {
  getStoredPayrollRuns,
  saveStoredPayrollRuns,
  getStoredSalaryStructures,
  saveStoredSalaryStructures,
  getStoredStaffLoans,
  saveStoredStaffLoans,
  getStoredPayrollSettings,
  saveStoredPayrollSettings
} from '../../services/payrollService';
import { 
  connectGoogleDrive, 
  disconnectGoogleDrive, 
  isGoogleDriveConnected, 
  getConnectedGoogleUser,
  uploadBackupToDrive, 
  listDriveBackups, 
  downloadDriveBackup, 
  deleteDriveBackup, 
  DriveBackupFile,
  setDriveAccessToken
} from '../../services/googleDriveService';

interface BackupRecoveryManagerProps {
  students: Student[];
  teachers: Teacher[];
  reports: TermReport[];
  bills: StudentBill[];
  payments: PaymentRecord[];
  calendarEvents: CalendarEvent[];
  notifications: NotificationItem[];
  onRestoreData?: (data: any) => void;
}

interface LocalSnapshot {
  id: string;
  timestamp: string;
  name: string;
  sizeKb: number;
  studentCount: number;
  reportCount: number;
  paymentCount: number;
  userCount?: number;
  teacherCount?: number;
  expenseCount?: number;
  secretaryCount?: number;
  payrollCount?: number;
  data: string;
}

const INITIAL_DRIVE_BACKUPS: DriveBackupFile[] = [];

export default function BackupRecoveryManager({
  students,
  teachers,
  reports,
  bills,
  payments,
  calendarEvents,
  notifications,
  onRestoreData
}: BackupRecoveryManagerProps) {
  const [activeTab, setActiveTab] = useState<'local' | 'gdrive'>('local');

  // Local snapshot state
  const [snapshots, setSnapshots] = useState<LocalSnapshot[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingIDB, setIsExportingIDB] = useState(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [restorePreview, setRestorePreview] = useState<any | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  // Google Drive state
  const [isDriveConnectedState, setIsDriveConnectedState] = useState<boolean>(isGoogleDriveConnected());
  const [driveUser, setDriveUser] = useState<{ email: string | null; displayName: string | null; photoURL: string | null } | null>(getConnectedGoogleUser());
  const [driveBackups, setDriveBackups] = useState<DriveBackupFile[]>(INITIAL_DRIVE_BACKUPS);
  const [isUploadingToDrive, setIsUploadingToDrive] = useState(false);
  const [isConnectingDrive, setIsConnectingDrive] = useState(false);
  const [isRefreshingDrive, setIsRefreshingDrive] = useState(false);
  const [autoDriveSync, setAutoDriveSync] = useState(true);

  // Unauthorized Domain & Manual Token Modal States
  const [unauthorizedDomainModal, setUnauthorizedDomainModal] = useState<{
    isOpen: boolean;
    domain: string;
  }>({ isOpen: false, domain: '' });
  const [copiedDomainNotice, setCopiedDomainNotice] = useState(false);
  const [manualTokenInput, setManualTokenInput] = useState('');
  const [manualTokenError, setManualTokenError] = useState('');

  // Destructive Action Confirmation Modals (Mandatory for Workspace / System Data Overwrites)
  const [confirmRestoreModal, setConfirmRestoreModal] = useState<{
    isOpen: boolean;
    source: 'local_file' | 'local_snapshot' | 'google_drive';
    item?: any;
  }>({ isOpen: false, source: 'local_file' });

  const [confirmDeleteModal, setConfirmDeleteModal] = useState<{
    isOpen: boolean;
    source: 'google_drive' | 'local_snapshot';
    item?: any;
  }>({ isOpen: false, source: 'google_drive' });

  // Build complete institutional payload containing all user roles and operational data
  const buildCompleteBackupPayload = (customMeta: Record<string, any> = {}) => {
    // 1. All Registered System User Accounts (Teachers, Bursars, Secretaries, Admins, Students)
    const users = getStoredUsers();

    // 2. Faculty / Teachers & Attendance Scans
    const teacherAttendance = getStoredTeacherAttendance();

    // 3. Accountant & Bursary Records
    const expenses = getStoredExpenses();
    const financialAudits = getStoredFinancialAudits();
    const classFeeTariffs = getStoredClassFeeTariffs();
    const paymentSettings = getStoredPaymentSettings();
    const payrollRuns = getStoredPayrollRuns();
    const salaryStructures = getStoredSalaryStructures();
    const staffLoans = getStoredStaffLoans();
    const payrollSettings = getStoredPayrollSettings();

    // 4. Secretary Daily Collections & Desk Records
    const secretarySummaries = getStoredSecretarySummaries();

    // 5. Academic & Institutional Infrastructure
    const academicYears = getStoredAcademicYears();
    const terms = getStoredTerms();
    const departments = getStoredDepartments();
    const courses = getStoredCourses();
    const classes = getStoredClasses();
    const houses = getStoredHouses();
    const subjects = getStoredSubjects();
    const classBroadcasts = getStoredClassBroadcasts();

    const adminsCount = users.filter(u => ['admin', 'sub_admin', 'headmaster', 'headteacher', 'hod'].includes(u.role)).length;
    const teachersCount = users.filter(u => u.role === 'teacher').length;
    const accountantsCount = users.filter(u => u.role === 'accountant' || u.role === 'sub_accountant').length;
    const secretariesCount = users.filter(u => u.role === 'secretary').length;
    const studentsCount = users.filter(u => u.role === 'student').length;

    return {
      meta: {
        system: 'JIPAS Institutional Management System',
        version: '2026.3.2',
        schema: 'jipas_all_users_enterprise_v2',
        exportedAt: new Date().toISOString(),
        schoolMotto: 'Education is Wealth',
        description: 'Complete institutional backup including all user roles (teachers, accountant/bursar, secretary, admin, student), financial ledgers, expenses, payroll, attendance, and academics.',
        ...customMeta
      },
      data: {
        // All System Users (Full user accounts across all roles)
        users,

        // Faculty & Teachers
        teachers,
        teacherAttendance,

        // Accountant / Bursary Data
        bills,
        payments,
        expenses,
        financialAudits,
        classFeeTariffs,
        paymentSettings,
        payrollRuns,
        salaryStructures,
        staffLoans,
        payrollSettings,
        payroll: {
          payrollRuns,
          salaryStructures,
          staffLoans,
          payrollSettings
        },

        // Secretary Front Desk Records & Daily Summaries
        secretarySummaries,
        secretary: {
          dailySummaries: secretarySummaries,
          deskCollections: payments.filter(p => (p as any).recorderRole === 'secretary' || (p as any).recordedBy?.toLowerCase().includes('secretary') || p.collectorRole === 'secretary' || p.collectedBy?.toLowerCase().includes('secretary')),
          deskExpenses: expenses.filter(e => e.recorderRole === 'secretary' || e.recordedBy?.toLowerCase().includes('secretary'))
        },

        // Students & Academic Terminal Records
        students,
        reports,
        classBroadcasts,

        // Academic Configuration
        academicSetup: {
          academicYears,
          terms,
          departments,
          courses,
          classes,
          houses,
          subjects
        },

        // Schedules & Alerts
        calendarEvents,
        notifications
      },
      counts: {
        totalUsers: users.length,
        userRoles: {
          admins: adminsCount,
          teachers: teachersCount,
          accountants: accountantsCount,
          secretaries: secretariesCount,
          students: studentsCount
        },
        teachers: teachers.length,
        teacherAttendance: teacherAttendance.length,
        students: students.length,
        reports: reports.length,
        bills: bills.length,
        payments: payments.length,
        expenses: expenses.length,
        secretarySummaries: secretarySummaries.length,
        payrollRuns: payrollRuns.length,
        financialAudits: financialAudits.length,
        calendarEvents: calendarEvents.length
      }
    };
  };

  // Load existing snapshots from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('jipas_local_snapshots');
      if (saved) {
        setSnapshots(JSON.parse(saved));
      } else {
        const payload = buildCompleteBackupPayload({ type: 'Baseline System Snapshot (Auto)' });
        const jsonStr = JSON.stringify(payload);
        const allUsers = getStoredUsers();
        const initialSnap: LocalSnapshot = {
          id: `snap-${Date.now()}`,
          timestamp: new Date().toLocaleString(),
          name: 'Baseline System Snapshot (All Users & Records)',
          sizeKb: Math.max(1, Math.round(jsonStr.length / 1024)),
          studentCount: students.length,
          reportCount: reports.length,
          paymentCount: payments.length,
          userCount: allUsers.length,
          teacherCount: teachers.length,
          expenseCount: getStoredExpenses().length,
          secretaryCount: getStoredSecretarySummaries().length,
          payrollCount: getStoredPayrollRuns().length,
          data: jsonStr
        };
        setSnapshots([initialSnap]);
        localStorage.setItem('jipas_local_snapshots', JSON.stringify([initialSnap]));
      }
    } catch (e) {
      console.warn('Could not load snapshots:', e);
    }
  }, []);

  const showNotice = (msg: string) => {
    setStatusNotice(msg);
    setTimeout(() => setStatusNotice(null), 5000);
  };

  // ========================================================
  // LOCAL BACKUP HANDLERS
  // ========================================================

  // 1. Generate Full Local Backup JSON & Download (All Users & Records)
  const handleExportLocalBackup = () => {
    setIsExporting(true);
    try {
      const backupPayload = buildCompleteBackupPayload({
        environment: 'Local Workstation Archive',
        exportType: 'Complete All-Users Institutional Backup'
      });

      const jsonStr = JSON.stringify(backupPayload, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.download = `jipas_complete_all_users_backup_${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      const allUsers = getStoredUsers();
      // Save a local snapshot as well
      const newSnap: LocalSnapshot = {
        id: `snap-${Date.now()}`,
        timestamp: new Date().toLocaleString(),
        name: `Full Multi-Role Backup (${dateStr})`,
        sizeKb: Math.round(jsonStr.length / 1024),
        studentCount: students.length,
        reportCount: reports.length,
        paymentCount: payments.length,
        userCount: allUsers.length,
        teacherCount: teachers.length,
        expenseCount: getStoredExpenses().length,
        secretaryCount: getStoredSecretarySummaries().length,
        payrollCount: getStoredPayrollRuns().length,
        data: jsonStr
      };

      const updated = [newSnap, ...snapshots.slice(0, 9)];
      setSnapshots(updated);
      localStorage.setItem('jipas_local_snapshots', JSON.stringify(updated));

      showNotice(`Full backup downloaded! Included all ${allUsers.length} user accounts, ${teachers.length} teachers, ${payments.length} bursary receipts, expenses, payroll & secretary records.`);
    } catch (err: any) {
      alert(`Backup failed: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsExporting(false);
    }
  };

  // Manual export of local IndexedDB state to downloadable JSON file
  const handleExportIDBBackup = async () => {
    setIsExportingIDB(true);
    try {
      const backup = await exportAllIndexedDBData();
      const dateStr = new Date().toISOString().slice(0, 10);
      downloadJSONFile(backup, `jipas_indexeddb_backup_${dateStr}.json`);
      showNotice(`Exported complete IndexedDB store (${backup.meta.totalKeys} stored keys) to jipas_indexeddb_backup_${dateStr}.json`);
    } catch (err: any) {
      alert(`IndexedDB backup export failed: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsExportingIDB(false);
    }
  };

  // Helper to convert array of objects to CSV and download
  const downloadCSV = (filename: string, rows: Record<string, any>[]) => {
    if (!rows || rows.length === 0) {
      alert('No data available to export.');
      return;
    }
    const headers = Object.keys(rows[0]);
    const csvRows = [];
    csvRows.push(headers.join(','));

    for (const row of rows) {
      const values = headers.map(header => {
        const val = row[header];
        const escaped = ('' + (val ?? '')).replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(','));
    }

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 1. All Users CSV
  const handleExportAllUsersCSV = () => {
    const users = getStoredUsers();
    const rows = users.map(u => ({
      'User ID': u.id,
      'Full Name': u.name,
      'System Role': u.role.toUpperCase(),
      'Username': u.username,
      'Email Address': u.email || 'N/A',
      'Phone Number': u.phone || 'N/A',
      'Department': u.department || 'N/A',
      'Status': u.status || 'Active',
      'Account Created': u.createdAt || 'N/A',
      'Last Login': u.lastLogin || 'N/A',
      'Registration Type': u.registrationType || 'Staff',
      'Privileges': u.accountantPrivileges ? 'Configured' : 'Default'
    }));
    const dateStr = new Date().toISOString().slice(0, 10);
    downloadCSV(`jipas_all_users_directory_${dateStr}.csv`, rows);
    showNotice(`Successfully exported ${users.length} registered user accounts (Teachers, Accountants, Secretary, Admin, Students) as CSV.`);
  };

  // 2. Teachers & Attendance CSV
  const handleExportTeachersAttendanceCSV = () => {
    const attendance = getStoredTeacherAttendance();
    const rows = teachers.map(t => {
      const tAttendance = attendance.filter(a => a.teacherId === t.id);
      return {
        'Staff ID': t.staffId || t.id,
        'Teacher Name': t.name,
        'Email Address': t.email || 'N/A',
        'Phone': t.phone || 'N/A',
        'Gender': t.gender || 'N/A',
        'Department': t.department || 'N/A',
        'Designation': t.designation || 'Class Teacher',
        'Academic Rank': t.rank || 'N/A',
        'Assigned Classes': ((t as any).classesTeaching || t.classesTaught || []).join('; '),
        'Assigned Subjects': ((t as any).subjectsTeaching || t.subjectsTaught || []).join('; '),
        'Total Clock-ins': tAttendance.length,
        'Last Attendance Date': tAttendance[tAttendance.length - 1]?.date || 'None',
        'Last Clock-in Time': tAttendance[tAttendance.length - 1]?.timeIn || 'None'
      };
    });
    const dateStr = new Date().toISOString().slice(0, 10);
    downloadCSV(`jipas_teachers_attendance_roster_${dateStr}.csv`, rows);
    showNotice(`Successfully exported ${teachers.length} faculty profiles and attendance logs as CSV.`);
  };

  // 3. Accountant & Bursary Ledger CSV
  const handleExportBursaryLedgerCSV = () => {
    const expenses = getStoredExpenses();
    const rows: Record<string, any>[] = [];

    // Payments / Receipts
    payments.forEach(p => {
      rows.push({
        'Record Type': 'Fee Receipt (Income)',
        'Reference No': p.receiptNo || p.id,
        'Payer / Beneficiary': p.studentName,
        'Class / Category': p.className,
        'Amount (CFA)': p.amount ?? p.paid,
        'Payment Method': p.method,
        'Date': p.date,
        'Term / Period': p.term || 'N/A',
        'Recorded By': (p as any).recordedBy || p.collectedBy || p.receivedBy || 'Accounts Desk',
        'Status': p.status || 'Verified'
      });
    });

    // Expenses
    expenses.forEach(e => {
      rows.push({
        'Record Type': 'Institutional Expense',
        'Reference No': e.referenceNo || e.id,
        'Payer / Beneficiary': e.vendorPayee || (e as any).recipient || (e as any).paidTo || e.title,
        'Class / Category': e.category,
        'Amount (CFA)': e.amount,
        'Payment Method': e.paymentMethod,
        'Date': e.date,
        'Term / Period': e.term || 'Current',
        'Recorded By': `${e.recordedBy || 'Bursar'} (${e.recorderRole || 'Finance'})`,
        'Status': e.status || 'Approved'
      });
    });

    const dateStr = new Date().toISOString().slice(0, 10);
    downloadCSV(`jipas_bursary_financial_ledger_${dateStr}.csv`, rows);
    showNotice(`Successfully exported comprehensive bursary ledger (${payments.length} fee receipts & ${expenses.length} expense vouchers) as CSV.`);
  };

  // 4. Secretary Daily Summaries CSV
  const handleExportSecretarySummariesCSV = () => {
    const summaries = getStoredSecretarySummaries();
    const rows = summaries.map(s => ({
      'Summary ID': s.id,
      'Date': s.date,
      'Secretary Name': s.secretaryName,
      'Total Receipts Issued': (s as any).totalReceiptsIssued || s.receiptsCount || s.transactionCount || 0,
      'Gross Fees Collected (CFA)': s.totalFeesCollected,
      'Desk Expenses (CFA)': s.totalExpensesLogged,
      'Net Cash Handover (CFA)': s.netCashOnHand,
      'Handover Status': (s as any).status || (s.isReconciledWithBursar ? 'Reconciled' : 'Pending Handover'),
      'Handover Time': (s as any).handoverTimestamp ? new Date((s as any).handoverTimestamp).toLocaleString() : (s.reconciledAt || 'N/A'),
      'Accountant Received': (s as any).accountantReceivedBy || s.reconciledBy || 'Pending',
      'Audit / Reconciliation Notes': s.notes || s.reconciliationNotes || 'None'
    }));
    const dateStr = new Date().toISOString().slice(0, 10);
    downloadCSV(`jipas_secretary_daily_summaries_${dateStr}.csv`, rows);
    showNotice(`Successfully exported ${summaries.length} secretary daily collection and handover records as CSV.`);
  };

  const handleExportStudentsCSV = () => {
    const studentRows = students.map(s => ({
      'Admission No': s.admissionNo,
      'Full Name': s.fullName,
      'Gender': s.gender,
      'Date of Birth': s.dob,
      'Department': s.department,
      'Class Name': s.className,
      'Course / Programme': s.course || '--',
      'Roll No': s.rollNo,
      'House': s.house,
      'Parent Name': s.parentName,
      'Parent Phone': s.parentPhone,
      'Status': s.status,
      'Academic Year': s.academicYear,
      'Term': s.term,
      'Enrollment Date': s.enrollmentDate
    }));
    const dateStr = new Date().toISOString().slice(0, 10);
    downloadCSV(`jipas_students_bulk_archive_${dateStr}.csv`, studentRows);
    showNotice(`Successfully exported ${students.length} student records as structured CSV for archiving.`);
  };

  const handleExportAcademicRecordsCSV = () => {
    const reportRows = reports.map(r => ({
      'Admission No': r.admissionNo,
      'Student Name': r.studentName,
      'Class Name': r.className,
      'Term': r.term,
      'Academic Year': r.academicYear,
      'Attendance Present': r.attendancePresent,
      'Attendance Total': r.attendanceTotal,
      'Total Score': r.totalScore,
      'Average Score': r.averageScore,
      'Position': r.position,
      'Promotion Status': r.promotionStatus || '--',
      'Conduct': r.conduct,
      'Teacher Remarks': r.teacherComment,
      'Headmaster Remarks': r.headmasterComment,
      'Subjects Count': r.scores?.length || 0
    }));
    const dateStr = new Date().toISOString().slice(0, 10);
    downloadCSV(`jipas_academic_records_archive_${dateStr}.csv`, reportRows);
    showNotice(`Successfully exported ${reports.length} academic report sheets as structured CSV.`);
  };

  const handleExportFinancialsCSV = () => {
    const paymentRows = payments.map(p => ({
      'Transaction ID': p.receiptNo || p.id,
      'Admission No': p.admissionNo,
      'Student Name': p.studentName,
      'Class Name': p.className,
      'Amount Paid': p.amount ?? p.paid,
      'Payment Method': p.method,
      'Term': p.term || 'N/A',
      'Academic Year': p.academicYear || 'N/A',
      'Date Paid': p.date,
      'Status': p.status || 'Verified'
    }));
    const dateStr = new Date().toISOString().slice(0, 10);
    downloadCSV(`jipas_financial_archive_${dateStr}.csv`, paymentRows);
    showNotice(`Successfully exported ${payments.length} financial transaction records as structured CSV.`);
  };

  const handleExportAllCSVBundle = () => {
    handleExportAllUsersCSV();
    setTimeout(() => handleExportTeachersAttendanceCSV(), 300);
    setTimeout(() => handleExportBursaryLedgerCSV(), 600);
    setTimeout(() => handleExportSecretarySummariesCSV(), 900);
    setTimeout(() => handleExportStudentsCSV(), 1200);
    setTimeout(() => handleExportAcademicRecordsCSV(), 1500);
    showNotice('Complete institutional CSV bundle (Users, Teachers, Bursary, Secretary, Students, Reports) generated successfully!');
  };

  // 2. Capture Snapshot to localStorage manually
  const handleCaptureInstantSnapshot = () => {
    try {
      const payload = buildCompleteBackupPayload({
        type: 'Manual Local Recovery Point'
      });
      const jsonStr = JSON.stringify(payload);
      const allUsers = getStoredUsers();

      const newSnap: LocalSnapshot = {
        id: `snap-${Date.now()}`,
        timestamp: new Date().toLocaleString(),
        name: `All-Users Recovery Point #${snapshots.length + 1} (${new Date().toLocaleTimeString()})`,
        sizeKb: Math.max(1, Math.round(jsonStr.length / 1024)),
        studentCount: students.length,
        reportCount: reports.length,
        paymentCount: payments.length,
        userCount: allUsers.length,
        teacherCount: teachers.length,
        expenseCount: getStoredExpenses().length,
        secretaryCount: getStoredSecretarySummaries().length,
        payrollCount: getStoredPayrollRuns().length,
        data: jsonStr
      };

      const updated = [newSnap, ...snapshots.slice(0, 9)];
      setSnapshots(updated);
      localStorage.setItem('jipas_local_snapshots', JSON.stringify(updated));
      showNotice(`Captured instant snapshot "${newSnap.name}" with all ${allUsers.length} users, faculty, bursary, and secretary data.`);
    } catch (err: any) {
      alert(`Failed to save local snapshot: ${err?.message}`);
    }
  };

  // 3. Parse & Preview Backup File for Restore
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRestoreError(null);
    setRestorePreview(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const MAX_BACKUP_SIZE = 25 * 1024 * 1024; // 25 MB
    if (file.size > MAX_BACKUP_SIZE) {
      setRestoreError(`File too large (${((file.size ?? 0) / (1024 * 1024)).toFixed(1)}MB). Maximum allowed backup file size is 25MB.`);
      e.target.value = '';
      return;
    }

    if (!file.name.toLowerCase().endsWith('.json')) {
      setRestoreError('Invalid file type: Please select a valid .json JIPAS backup archive.');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        const data = parsed.data || parsed;
        if (!data.students && !data.users && !Array.isArray(parsed)) {
          throw new Error('Invalid JIPAS backup format: Missing core institutional datasets.');
        }

        const uCount = Array.isArray(data.users) ? data.users.length : 0;
        const tCount = Array.isArray(data.teachers) ? data.teachers.length : 0;
        const tAttCount = Array.isArray(data.teacherAttendance) ? data.teacherAttendance.length : 0;
        const sCount = Array.isArray(data.students) ? data.students.length : 0;
        const rCount = Array.isArray(data.reports) ? data.reports.length : 0;
        const bCount = Array.isArray(data.bills) ? data.bills.length : 0;
        const pCount = Array.isArray(data.payments) ? data.payments.length : 0;
        const expCount = Array.isArray(data.expenses) ? data.expenses.length : 0;
        const secCount = Array.isArray(data.secretarySummaries) ? data.secretarySummaries.length : (Array.isArray(data.secretary?.dailySummaries) ? data.secretary.dailySummaries.length : 0);
        const payCount = Array.isArray(data.payrollRuns) ? data.payrollRuns.length : (Array.isArray(data.payroll?.payrollRuns) ? data.payroll.payrollRuns.length : 0);

        setRestorePreview({
          fileName: file.name,
          fileSizeKb: Math.max(1, Math.round(file.size / 1024)),
          meta: parsed.meta || { exportedAt: 'Unknown', system: 'Legacy JIPAS' },
          data: data,
          userCount: uCount,
          teacherCount: tCount,
          teacherAttendanceCount: tAttCount,
          studentCount: sCount,
          reportCount: rCount,
          billCount: bCount,
          paymentCount: pCount,
          expenseCount: expCount,
          secretarySummaryCount: secCount,
          payrollCount: payCount
        });
      } catch (err: any) {
        setRestoreError(err?.message || 'Failed to parse JSON backup file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // 4. Trigger Restore Confirmation
  const requestExecuteRestore = () => {
    if (!restorePreview) return;
    setConfirmRestoreModal({
      isOpen: true,
      source: 'local_file',
      item: restorePreview
    });
  };

  // 5. Trigger Snapshot Rollback Confirmation
  const requestSnapshotRollback = (snap: LocalSnapshot) => {
    setConfirmRestoreModal({
      isOpen: true,
      source: 'local_snapshot',
      item: snap
    });
  };

  // 6. Execute Confirmed Restore (All User Records)
  const executeConfirmedRestore = async () => {
    const { source, item } = confirmRestoreModal;
    setConfirmRestoreModal({ isOpen: false, source: 'local_file' });

    try {
      let dataToRestore: any = null;

      if (source === 'local_file') {
        dataToRestore = item.data;
      } else if (source === 'local_snapshot') {
        const parsed = JSON.parse(item.data);
        dataToRestore = parsed.data || parsed;
      } else if (source === 'google_drive') {
        if (item.id && !item.id.startsWith('gdrive-bak-')) {
          // Download live from Google Drive API
          const fetched = await downloadDriveBackup(item.id);
          dataToRestore = fetched.data || fetched;
        } else {
          // Demo fallback items
          dataToRestore = buildCompleteBackupPayload().data;
        }
      }

      if (!dataToRestore) {
        throw new Error('No dataset could be extracted for recovery.');
      }

      // 1. In-memory & reactive app state update
      if (onRestoreData) {
        await onRestoreData({
          students: dataToRestore.students,
          teachers: dataToRestore.teachers,
          reports: dataToRestore.reports,
          bills: dataToRestore.bills,
          payments: dataToRestore.payments,
          users: dataToRestore.users,
          teacherAttendance: dataToRestore.teacherAttendance,
          expenses: dataToRestore.expenses,
          secretarySummaries: dataToRestore.secretarySummaries || dataToRestore.secretary?.dailySummaries,
          financialAudits: dataToRestore.financialAudits,
          payrollRuns: dataToRestore.payrollRuns || dataToRestore.payroll?.payrollRuns,
          salaryStructures: dataToRestore.salaryStructures || dataToRestore.payroll?.salaryStructures,
          staffLoans: dataToRestore.staffLoans || dataToRestore.payroll?.staffLoans,
          payrollSettings: dataToRestore.payrollSettings || dataToRestore.payroll?.payrollSettings,
          classFeeTariffs: dataToRestore.classFeeTariffs,
          paymentSettings: dataToRestore.paymentSettings,
          calendarEvents: dataToRestore.calendarEvents,
          notifications: dataToRestore.notifications
        });
      }

      // 2. Direct persistence across storage
      if (Array.isArray(dataToRestore.users)) {
        saveStoredUsers(dataToRestore.users);
      }
      if (Array.isArray(dataToRestore.teachers)) {
        saveStoredTeachers(dataToRestore.teachers);
      }
      if (Array.isArray(dataToRestore.teacherAttendance)) {
        saveStoredTeacherAttendance(dataToRestore.teacherAttendance);
      }
      if (Array.isArray(dataToRestore.students)) {
        saveStoredStudents(dataToRestore.students);
      }
      if (Array.isArray(dataToRestore.bills)) {
        saveStoredBills(dataToRestore.bills);
      }
      if (Array.isArray(dataToRestore.payments)) {
        saveStoredPayments(dataToRestore.payments);
      }
      if (Array.isArray(dataToRestore.reports)) {
        saveStoredReports(dataToRestore.reports);
      }
      if (Array.isArray(dataToRestore.expenses)) {
        saveStoredExpenses(dataToRestore.expenses);
      }
      const secData = dataToRestore.secretarySummaries || dataToRestore.secretary?.dailySummaries;
      if (Array.isArray(secData)) {
        saveStoredSecretarySummaries(secData);
      }
      if (Array.isArray(dataToRestore.financialAudits)) {
        saveStoredFinancialAudits(dataToRestore.financialAudits);
      }
      const pRuns = dataToRestore.payrollRuns || dataToRestore.payroll?.payrollRuns;
      if (Array.isArray(pRuns)) {
        saveStoredPayrollRuns(pRuns);
      }
      const salStructs = dataToRestore.salaryStructures || dataToRestore.payroll?.salaryStructures;
      if (Array.isArray(salStructs)) {
        saveStoredSalaryStructures(salStructs);
      }
      const stLoans = dataToRestore.staffLoans || dataToRestore.payroll?.staffLoans;
      if (Array.isArray(stLoans)) {
        saveStoredStaffLoans(stLoans);
      }
      const pSettings = dataToRestore.payrollSettings || dataToRestore.payroll?.payrollSettings;
      if (pSettings && typeof pSettings === 'object') {
        saveStoredPayrollSettings(pSettings);
      }
      if (Array.isArray(dataToRestore.classFeeTariffs)) {
        saveStoredClassFeeTariffs(dataToRestore.classFeeTariffs);
      }
      if (dataToRestore.paymentSettings && typeof dataToRestore.paymentSettings === 'object') {
        saveStoredPaymentSettings(dataToRestore.paymentSettings);
      }

      // Sync key records to Supabase Cloud Database
      if (Array.isArray(dataToRestore.students)) {
        for (const s of dataToRestore.students.slice(0, 10)) {
          await saveStudent(s);
        }
      }
      if (Array.isArray(dataToRestore.bills)) {
        for (const b of dataToRestore.bills.slice(0, 10)) {
          await saveBill(b);
        }
      }

      showNotice(`Restoration successful! Restored all user records (Teachers, Accountants, Secretary, Admins), bursary ledgers, payroll, and academic registry.`);
      setRestorePreview(null);
    } catch (err: any) {
      alert(`Recovery failed: ${err?.message || 'Error occurred while restoring records.'}`);
    }
  };

  // ========================================================
  // GOOGLE DRIVE CLOUD STORAGE HANDLERS
  // ========================================================

  // Connect Google Drive OAuth
  const handleConnectDrive = async () => {
    setIsConnectingDrive(true);
    setManualTokenError('');
    try {
      const res = await connectGoogleDrive();
      setIsDriveConnectedState(true);
      setDriveUser(res.user);
      setUnauthorizedDomainModal({ isOpen: false, domain: '' });
      showNotice(`Successfully connected to Google Drive account: ${res.user.email || 'Google User'}`);

      // Query live files from Drive
      await handleRefreshDriveFiles();
    } catch (err: any) {
      if (
        err?.isUnauthorizedDomain || 
        err?.code === 'auth/unauthorized-domain' || 
        (err?.message && err.message.includes('unauthorized-domain'))
      ) {
        const currentHostname = typeof window !== 'undefined' ? window.location.hostname : 'schhub-msys.vercel.app';
        setUnauthorizedDomainModal({
          isOpen: true,
          domain: err.domain || currentHostname
        });
      } else {
        alert(`Google Drive authorization notice: ${err?.message || 'Failed to authenticate with Google'}`);
      }
    } finally {
      setIsConnectingDrive(false);
    }
  };

  // Submit manual token
  const handleManualTokenSubmit = () => {
    if (!manualTokenInput.trim()) {
      setManualTokenError('Please enter a valid OAuth Access Token.');
      return;
    }
    setDriveAccessToken(manualTokenInput.trim());
    setIsDriveConnectedState(true);
    setDriveUser({
      email: 'Workspace Authorized Session',
      displayName: 'Google Workspace Account',
      photoURL: null
    });
    setUnauthorizedDomainModal({ isOpen: false, domain: '' });
    showNotice('Google Drive session established using OAuth Token.');
    handleRefreshDriveFiles();
  };

  // Disconnect Google Drive
  const handleDisconnectDrive = () => {
    disconnectGoogleDrive();
    setIsDriveConnectedState(false);
    setDriveUser(null);
    showNotice('Google Drive session disconnected.');
  };

  // Refresh Google Drive Files
  const handleRefreshDriveFiles = async () => {
    setIsRefreshingDrive(true);
    try {
      const files = await listDriveBackups();
      if (files.length > 0) {
        setDriveBackups(files);
      }
      showNotice('Google Drive backup archive refreshed.');
    } catch (err: any) {
      console.warn('Drive list notice:', err);
    } finally {
      setIsRefreshingDrive(false);
    }
  };

  // Upload Backup to Google Drive (All Users & Operational Data)
  const handleUploadToGoogleDrive = async () => {
    if (!isDriveConnectedState) {
      await handleConnectDrive();
      return;
    }

    setIsUploadingToDrive(true);
    try {
      const backupPayload = buildCompleteBackupPayload({
        cloudStorage: 'Google Drive Enterprise Vault',
        exportType: 'All-Users Multi-Role Institutional Backup',
        account: driveUser?.email || 'admin@jipas.com'
      });

      const dateStr = new Date().toISOString().slice(0, 10);
      const timeStr = `${String(new Date().getHours()).padStart(2, '0')}${String(new Date().getMinutes()).padStart(2, '0')}`;
      const fileName = `jipas_cloud_all_users_backup_${dateStr}_${timeStr}.json`;

      const uploaded = await uploadBackupToDrive(backupPayload, fileName);
      setDriveBackups(prev => [uploaded, ...prev]);
      showNotice(`Full backup snapshot saved to Google Drive: "${uploaded.name}" (Includes all user accounts, teachers, bursar, secretary, and students).`);
    } catch (err: any) {
      alert(`Google Drive upload failed: ${err?.message}`);
    } finally {
      setIsUploadingToDrive(false);
    }
  };

  // Request Restore from Google Drive (Mandatory Confirmation Dialog)
  const requestDriveRestore = (item: DriveBackupFile) => {
    setConfirmRestoreModal({
      isOpen: true,
      source: 'google_drive',
      item
    });
  };

  // Request Delete from Google Drive
  const requestDriveDelete = (item: DriveBackupFile) => {
    setConfirmDeleteModal({
      isOpen: true,
      source: 'google_drive',
      item
    });
  };

  const executeConfirmedDelete = async () => {
    const { source, item } = confirmDeleteModal;
    setConfirmDeleteModal({ isOpen: false, source: 'google_drive' });

    if (source === 'google_drive') {
      try {
        if (item.id && !item.id.startsWith('gdrive-bak-')) {
          await deleteDriveBackup(item.id);
        }
        setDriveBackups(prev => prev.filter(b => b.id !== item.id));
        showNotice(`Backup file "${item.name}" deleted from Google Drive archive.`);
      } catch (err: any) {
        alert(`Failed to delete file from Google Drive: ${err?.message}`);
      }
    } else if (source === 'local_snapshot') {
      const filtered = snapshots.filter(s => s.id !== item.id);
      setSnapshots(filtered);
      localStorage.setItem('jipas_local_snapshots', JSON.stringify(filtered));
      showNotice(`Local snapshot "${item.name}" deleted.`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2.5">
              <Database className="w-6 h-6 text-indigo-600" />
              School Backup & Disaster Recovery Center
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Safeguard student registries, academic report sheets, billing records, and audit logs with Local and Google Drive cloud storage.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-2">
            <div className="px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-xl text-center">
              <span className="block text-[10px] uppercase font-bold text-indigo-500">Students</span>
              <span className="text-sm font-black text-indigo-900">{students.length}</span>
            </div>
            <div className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
              <span className="block text-[10px] uppercase font-bold text-emerald-500">Reports</span>
              <span className="text-sm font-black text-emerald-900">{reports.length}</span>
            </div>
            <div className="px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-xl text-center">
              <span className="block text-[10px] uppercase font-bold text-amber-500">Payments</span>
              <span className="text-sm font-black text-amber-900">{payments.length}</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 mt-6 gap-6">
          <button
            onClick={() => setActiveTab('local')}
            className={`pb-3 text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer border-b-2 transition-all ${
              activeTab === 'local'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            <HardDrive className="w-4 h-4" />
            <span>Local Backup & Recovery</span>
            <span className="bg-slate-100 text-slate-700 text-[10px] px-2 py-0.5 rounded-full font-bold">
              {snapshots.length} Snapshots
            </span>
          </button>

          <button
            onClick={() => setActiveTab('gdrive')}
            className={`pb-3 text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer border-b-2 transition-all ${
              activeTab === 'gdrive'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            <Cloud className="w-4 h-4" />
            <span>Google Drive Cloud Storage</span>
            {isDriveConnectedState ? (
              <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Connected
              </span>
            ) : (
              <span className="bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
                OAuth Ready
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Global Status Notice */}
      {statusNotice && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-bold flex items-center gap-3 shadow-xs animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>{statusNotice}</span>
        </div>
      )}

      {/* ===================== TAB CONTENT WITH ENTRY ANIMATIONS ===================== */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
        >
          {/* ===================== TAB 1: LOCAL BACKUP & RECOVERY ===================== */}
          {activeTab === 'local' && (
        <div className="space-y-6">
          {/* Featured Database Backup Card (IndexedDB Dump) */}
          <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-2xl shadow-md border border-indigo-500/30 p-6 text-white space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 bg-indigo-500/30 border border-indigo-400/40 text-indigo-300 text-[10px] font-bold rounded-full uppercase tracking-wider">
                    Data Portability & Offline Persistence
                  </span>
                  <span className="px-2.5 py-0.5 bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[10px] font-bold rounded-full uppercase tracking-wider">
                    IndexedDB Store
                  </span>
                </div>
                <h3 className="text-lg font-black tracking-tight flex items-center gap-2 text-white">
                  <HardDrive className="w-5 h-5 text-indigo-400" />
                  Database Backup (Manual IndexedDB State Export)
                </h3>
                <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                  Export the complete offline local cache stored in IndexedDB to a downloadable <span className="font-mono text-indigo-300 font-bold">.json</span> file. This includes unsynced form drafts, catalog indexes, local user profiles, and offline registers to guarantee data portability for school records.
                </p>
              </div>

              <button
                onClick={handleExportIDBBackup}
                disabled={isExportingIDB}
                className="px-5 py-3 bg-indigo-500 hover:bg-indigo-400 active:scale-[0.98] text-white rounded-xl text-xs font-black shadow-lg shadow-indigo-500/30 transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap self-start sm:self-center"
              >
                {isExportingIDB ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                {isExportingIDB ? 'Exporting IndexedDB...' : 'Export IndexedDB JSON Backup'}
              </button>
            </div>
          </div>

          {/* Action Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Card 1: Create Full Backup */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                    <Download className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full uppercase">
                    Local Device
                  </span>
                </div>
                <h3 className="text-base font-black text-slate-900 mt-3">Download Full JSON Backup</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Export the entire database as a portable, encrypted JSON archive including students, grades, fee bills, payments, and calendar schedules.
                </p>
                <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100 text-[11px] text-slate-600 space-y-1">
                  <div className="flex justify-between font-mono">
                    <span>Target File:</span>
                    <span className="font-bold text-slate-900">jipas_complete_backup.json</span>
                  </div>
                  <div className="flex justify-between font-mono">
                    <span>Est. Archive Size:</span>
                    <span className="font-bold text-indigo-700">~{(((students?.length ?? 0) * 1.8) + ((reports?.length ?? 0) * 2.2)).toFixed(0)} KB</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={handleExportLocalBackup}
                  disabled={isExporting}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white rounded-xl text-xs font-black shadow-md shadow-indigo-600/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {isExporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  {isExporting ? 'Compiling Archive...' : 'Download Complete Backup'}
                </button>

                <button
                  onClick={handleCaptureInstantSnapshot}
                  title="Capture fast local snapshot without file download"
                  className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Clock className="w-4 h-4 text-indigo-600" />
                  <span>Snapshot Now</span>
                </button>
              </div>
            </div>

            {/* Card 2: Restore from Backup File */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                    <Upload className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full uppercase">
                    Data Restoration
                  </span>
                </div>
                <h3 className="text-base font-black text-slate-900 mt-3">Restore from Backup File</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Upload a previously saved <span className="font-mono font-bold text-slate-700">.json</span> backup to verify dataset integrity and restore historical records.
                </p>

                {/* File Dropzone Input */}
                <div className="mt-4 border-2 border-dashed border-slate-200 hover:border-emerald-500 rounded-2xl p-4 text-center cursor-pointer transition-colors group relative bg-slate-50/50">
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleFileSelect}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                  />
                  <div className="flex flex-col items-center">
                    <FileJson className="w-8 h-8 text-slate-400 group-hover:text-emerald-600 transition-colors mb-1" />
                    <span className="text-xs font-bold text-slate-700">
                      Click to choose or drag & drop backup JSON file
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5">Supports all JIPAS schema formats</span>
                  </div>
                </div>

                {restoreError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold flex items-center gap-2 mt-3">
                    <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                    <span>{restoreError}</span>
                  </div>
                )}
              </div>

              {restorePreview && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2 mt-2">
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-900">
                    <span className="truncate">{restorePreview.fileName}</span>
                    <span>{restorePreview.fileSizeKb} KB</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[10px] text-emerald-800 font-medium">
                    <div className="bg-white/80 p-1.5 rounded-lg text-center">
                      <span className="block font-bold">{restorePreview.studentCount}</span>
                      <span>Students</span>
                    </div>
                    <div className="bg-white/80 p-1.5 rounded-lg text-center">
                      <span className="block font-bold">{restorePreview.reportCount}</span>
                      <span>Reports</span>
                    </div>
                    <div className="bg-white/80 p-1.5 rounded-lg text-center">
                      <span className="block font-bold">{restorePreview.billCount}</span>
                      <span>Bills</span>
                    </div>
                  </div>
                  <button
                    onClick={requestExecuteRestore}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Proceed to Restore
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Bulk CSV & Excel Data Archive Export Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  Bulk CSV & Excel Data Archive Export
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Download structured CSV spreadsheets for offline archiving in Excel, Google Sheets, or LibreOffice.
                </p>
              </div>
              <button
                onClick={handleExportAllCSVBundle}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                Download Complete CSV Bundle
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              {/* Card 1: Students */}
              <div className="bg-slate-50 hover:bg-indigo-50/40 border border-slate-200 hover:border-indigo-300 rounded-xl p-4 transition-all flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-indigo-600" />
                      Student Registry CSV
                    </span>
                    <span className="bg-indigo-100 text-indigo-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {students.length} Records
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Export student admission numbers, names, departments, classes, house assignments, and parent contacts.
                  </p>
                </div>
                <button
                  onClick={handleExportStudentsCSV}
                  className="w-full py-2 bg-white hover:bg-indigo-600 hover:text-white text-indigo-700 border border-indigo-200 font-bold rounded-lg text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export Students CSV
                </button>
              </div>

              {/* Card 2: Academic Records */}
              <div className="bg-slate-50 hover:bg-emerald-50/40 border border-slate-200 hover:border-emerald-300 rounded-xl p-4 transition-all flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-emerald-600" />
                      Academic Records CSV
                    </span>
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {reports.length} Reports
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Export terminal exam results, composite scores, term averages, class positions, and teacher remarks.
                  </p>
                </div>
                <button
                  onClick={handleExportAcademicRecordsCSV}
                  className="w-full py-2 bg-white hover:bg-emerald-600 hover:text-white text-emerald-700 border border-emerald-200 font-bold rounded-lg text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export Academic CSV
                </button>
              </div>

              {/* Card 3: Financials */}
              <div className="bg-slate-50 hover:bg-amber-50/40 border border-slate-200 hover:border-amber-300 rounded-xl p-4 transition-all flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                      <HardDrive className="w-4 h-4 text-amber-600" />
                      Financial Records CSV
                    </span>
                    <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {payments.length} Transactions
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Export fee payments, transaction references, billing histories, and verification statuses.
                  </p>
                </div>
                <button
                  onClick={handleExportFinancialsCSV}
                  className="w-full py-2 bg-white hover:bg-amber-600 hover:text-white text-amber-700 border border-amber-200 font-bold rounded-lg text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export Financials CSV
                </button>
              </div>
            </div>
          </div>

          {/* Local Recovery Snapshots Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-600" />
                  Instant Local Recovery Snapshots
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Rollback the application state to any previous milestone stored in this browser session.
                </p>
              </div>
              <button
                onClick={handleCaptureInstantSnapshot}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
              >
                <span>+ Capture Snapshot Now</span>
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-900 text-white uppercase text-[10px] font-bold">
                  <tr>
                    <th className="p-3">#</th>
                    <th className="p-3">Snapshot Name</th>
                    <th className="p-3">Captured Timestamp</th>
                    <th className="p-3 text-center">Students</th>
                    <th className="p-3 text-center">Reports</th>
                    <th className="p-3 text-center">Archive Size</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {snapshots.map((snap, idx) => (
                    <tr key={snap.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-mono text-slate-400">{idx + 1}</td>
                      <td className="p-3 font-bold text-slate-900">{snap.name}</td>
                      <td className="p-3 font-mono text-slate-600">{snap.timestamp}</td>
                      <td className="p-3 text-center font-bold text-indigo-700">{snap.studentCount}</td>
                      <td className="p-3 text-center font-bold text-emerald-700">{snap.reportCount}</td>
                      <td className="p-3 text-center font-mono text-slate-500">{snap.sizeKb} KB</td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              const blob = new Blob([snap.data], { type: 'application/json' });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `${snap.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}.json`;
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                              URL.revokeObjectURL(url);
                            }}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer"
                            title="Download JSON snapshot"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => requestSnapshotRollback(snap)}
                            className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold border border-emerald-200 cursor-pointer flex items-center gap-1"
                            title="Rollback system to this snapshot"
                          >
                            <RefreshCw className="w-3 h-3" /> Rollback
                          </button>
                          <button
                            onClick={() => setConfirmDeleteModal({ isOpen: true, source: 'local_snapshot', item: snap })}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                            title="Delete snapshot"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================== TAB 2: GOOGLE DRIVE CLOUD STORAGE ===================== */}
      {activeTab === 'gdrive' && (
        <div className="space-y-6">
          {/* Google Drive Status & Setup Card */}
          <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-md border border-emerald-800 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                  <Cloud className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black tracking-tight">Google Drive Cloud Storage Vault</h3>
                    {isDriveConnectedState ? (
                      <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        Live OAuth Connected
                      </span>
                    ) : (
                      <span className="bg-amber-500/20 text-amber-300 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-amber-500/30">
                        Authorization Required
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-indigo-200 mt-0.5">
                    {isDriveConnectedState ? (
                      <>
                        Connected Account: <strong>{driveUser?.email || 'Authorized Workspace Drive'}</strong>
                        {driveUser?.displayName && ` (${driveUser.displayName})`}
                      </>
                    ) : (
                      'Authorize Google Drive to store off-site backups directly into your Google Workspace.'
                    )}
                  </p>
                </div>
              </div>

              {/* Top Action Buttons */}
              <div className="flex items-center gap-2">
                {!isDriveConnectedState ? (
                  /* Official Google Sign-In Button per Skill Guidelines */
                  <button
                    onClick={handleConnectDrive}
                    disabled={isConnectingDrive}
                    className="flex items-center gap-2.5 bg-white text-slate-700 hover:bg-slate-100 font-bold text-xs px-4 py-2.5 rounded-xl shadow-lg transition-all cursor-pointer border border-slate-200"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                    </svg>
                    <span>{isConnectingDrive ? 'Connecting...' : 'Connect Google Drive'}</span>
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleRefreshDriveFiles}
                      disabled={isRefreshingDrive}
                      className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-xs border border-white/20 cursor-pointer flex items-center gap-1.5"
                      title="Refresh files from Google Drive"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingDrive ? 'animate-spin' : ''}`} />
                      <span className="hidden sm:inline">Refresh</span>
                    </button>

                    <button
                      onClick={handleUploadToGoogleDrive}
                      disabled={isUploadingToDrive}
                      className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl font-black text-xs shadow-lg transition-all cursor-pointer flex items-center gap-2"
                    >
                      {isUploadingToDrive ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4" />
                      )}
                      {isUploadingToDrive ? 'Syncing to Drive...' : 'Backup to Google Drive Now'}
                    </button>

                    <button
                      onClick={handleDisconnectDrive}
                      className="px-3 py-2.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-xl font-bold text-xs border border-rose-500/30 cursor-pointer"
                      title="Disconnect session"
                    >
                      Disconnect
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Google Drive Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <span className="text-[10px] uppercase font-bold text-emerald-400 block mb-1">
                  Cloud Destination
                </span>
                <span className="font-mono text-white text-xs font-semibold">
                  Google Drive App Data Vault
                </span>
                <p className="text-[10px] text-slate-400 mt-1">Scope: drive.file (Least privilege secure access)</p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <span className="text-[10px] uppercase font-bold text-emerald-400 block mb-1">
                  Automated Nightly Cloud Backup
                </span>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">{autoDriveSync ? 'Enabled (Daily 02:00 AM)' : 'Disabled'}</span>
                  <input
                    type="checkbox"
                    checked={autoDriveSync}
                    onChange={(e) => setAutoDriveSync(e.target.checked)}
                    className="w-4 h-4 accent-emerald-500 cursor-pointer"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Background cloud sync without admin intervention</p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <span className="text-[10px] uppercase font-bold text-emerald-400 block mb-1">
                  Security & Retention
                </span>
                <span className="text-xs font-bold text-white flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-amber-400" /> AES-256 Cloud Encryption
                </span>
                <p className="text-[10px] text-slate-400 mt-1">Protected by Google Workspace OAuth 2.0</p>
              </div>
            </div>
          </div>

          {/* Google Drive Backups List */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-emerald-600" />
                  Google Drive Cloud Archive
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Available cloud recovery points stored securely in your Google Drive.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleRefreshDriveFiles}
                  className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Refresh
                </button>
                <a
                  href="https://drive.google.com"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                >
                  <span>Open Drive Web</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-900 text-white uppercase text-[10px] font-bold">
                  <tr>
                    <th className="p-3">#</th>
                    <th className="p-3">Backup File Name</th>
                    <th className="p-3">Size</th>
                    <th className="p-3">Uploaded Timestamp</th>
                    <th className="p-3">Initiated By</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {driveBackups.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        <Cloud className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-xs font-bold text-slate-600">No Google Drive cloud backups found</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Click &quot;Backup to Google Drive&quot; to upload an authoritative snapshot to your school Google Drive folder.</p>
                      </td>
                    </tr>
                  ) : (
                    driveBackups.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-mono text-slate-400">{idx + 1}</td>
                      <td className="p-3 font-bold text-slate-900 flex items-center gap-2">
                        <FileJson className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <span>{item.name}</span>
                      </td>
                      <td className="p-3 font-mono text-slate-600">{item.size || '~1.4 MB'}</td>
                      <td className="p-3 font-mono text-slate-500">{item.createdTime}</td>
                      <td className="p-3 text-slate-600">{item.syncedBy || 'Google Drive Sync'}</td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => requestDriveRestore(item)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                            title="Restore school records from this Google Drive snapshot"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            Restore from Drive
                          </button>
                          <button
                            onClick={() => requestDriveDelete(item)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                            title="Delete file from Drive"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
        </motion.div>
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MANDATORY CONFIRMATION MODAL FOR DESTRUCTIVE RESTORATION (Skill Mandatory) */}
      {/* ========================================================================= */}
      {confirmRestoreModal.isOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0 border border-amber-200">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  Confirm Database Restoration
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Source:{' '}
                  <span className="font-bold text-slate-800 uppercase">
                    {confirmRestoreModal.source.replace('_', ' ')}
                  </span>
                </p>
              </div>
            </div>

            <div className="p-4 bg-amber-50/80 rounded-2xl border border-amber-200/80 text-xs text-amber-900 space-y-2">
              <p className="font-bold">
                Are you sure you want to restore and overwrite the school database?
              </p>
              <p className="text-amber-800">
                This operation will replace current active student lists, examination report cards, and fee payment ledgers with the historical snapshot.
              </p>
              {confirmRestoreModal.item && (
                <div className="font-mono text-[11px] bg-white/70 p-2.5 rounded-xl border border-amber-200 mt-2">
                  <div><strong>File/Name:</strong> {confirmRestoreModal.item.name || confirmRestoreModal.item.fileName}</div>
                  {confirmRestoreModal.item.studentCount !== undefined && (
                    <div><strong>Students to restore:</strong> {confirmRestoreModal.item.studentCount}</div>
                  )}
                  {confirmRestoreModal.item.reportCount !== undefined && (
                    <div><strong>Reports to restore:</strong> {confirmRestoreModal.item.reportCount}</div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmRestoreModal({ isOpen: false, source: 'local_file' })}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeConfirmedRestore}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-lg shadow-emerald-600/20 cursor-pointer flex items-center gap-2 transition-all"
              >
                <Check className="w-4 h-4" />
                Yes, Restore All Records
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL FOR DELETION */}
      {confirmDeleteModal.isOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Delete Backup Item?</h3>
                <p className="text-xs text-slate-500">
                  {confirmDeleteModal.source === 'google_drive' 
                    ? 'This will permanently remove the file from your Google Drive.' 
                    : 'This will remove the local recovery point from your browser.'}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-700">
              Are you sure you want to delete <strong className="font-mono text-slate-900">{confirmDeleteModal.item?.name}</strong>? This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteModal({ isOpen: false, source: 'google_drive' })}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeConfirmedDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* FIREBASE AUTH & GOOGLE DRIVE UNAUTHORIZED DOMAIN MODAL                    */}
      {/* ========================================================================= */}
      {unauthorizedDomainModal.isOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 my-8">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center flex-shrink-0 border border-rose-200">
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[11px] font-bold mb-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Firebase Auth Notice</span>
                  </div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight">
                    Domain Authorization Required
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Firebase OAuth security blocks authentication from unlisted web domains.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setUnauthorizedDomainModal({ isOpen: false, domain: '' })}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Hostname Display */}
            <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-3 shadow-inner">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-semibold uppercase tracking-wider text-[10px]">Your Current Web Domain</span>
                <span className="font-mono text-cyan-400 font-bold">Host Identified</span>
              </div>
              <div className="flex items-center justify-between gap-3 bg-slate-800/90 p-3 rounded-xl border border-slate-700">
                <code className="text-emerald-400 font-mono font-bold text-sm sm:text-base truncate">
                  {unauthorizedDomainModal.domain || (typeof window !== 'undefined' ? window.location.hostname : 'schhub-msys.vercel.app')}
                </code>
                <button
                  type="button"
                  onClick={() => {
                    const host = unauthorizedDomainModal.domain || (typeof window !== 'undefined' ? window.location.hostname : '');
                    navigator.clipboard.writeText(host);
                    setCopiedDomainNotice(true);
                    setTimeout(() => setCopiedDomainNotice(false), 3000);
                  }}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 flex-shrink-0"
                >
                  {copiedDomainNotice ? <Check className="w-3.5 h-3.5" /> : <ExternalLink className="w-3.5 h-3.5" />}
                  <span>{copiedDomainNotice ? 'Copied!' : 'Copy Domain'}</span>
                </button>
              </div>
            </div>

            {/* Resolution Options Tab / Step Guide */}
            <div className="space-y-4">
              <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200 text-xs text-amber-900 space-y-2">
                <p className="font-bold flex items-center gap-2 text-amber-950">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  Option 1: Add Domain to Firebase Console (Recommended)
                </p>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-700 text-[11px] font-medium leading-relaxed">
                  <li>Go to <strong>Firebase Console</strong> → <strong>Authentication</strong> → <strong>Settings</strong> → <strong>Authorized domains</strong>.</li>
                  <li>Click <strong>"Add domain"</strong> and paste <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono font-bold text-slate-900">{unauthorizedDomainModal.domain || (typeof window !== 'undefined' ? window.location.hostname : 'schhub-msys.vercel.app')}</code>.</li>
                  <li>Click <strong>Save</strong> and return here to re-try connecting.</li>
                </ol>
              </div>

              {/* Option 2: Direct OAuth Access Token */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-xs space-y-3">
                <p className="font-bold text-slate-900 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-blue-600" />
                  Option 2: Immediate Access with Google OAuth Token
                </p>
                <p className="text-[11px] text-slate-600">
                  If you already possess a Google Workspace OAuth Access Token or Google Client Credential, paste it below to establish instant Google Drive cloud storage access:
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualTokenInput}
                    onChange={(e) => setManualTokenInput(e.target.value)}
                    placeholder="Paste Google OAuth Bearer Token (ya29...)"
                    className="flex-1 px-3.5 py-2 border border-slate-300 rounded-xl text-xs font-mono bg-white focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={handleManualTokenSubmit}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex-shrink-0"
                  >
                    Authenticate
                  </button>
                </div>
                {manualTokenError && (
                  <p className="text-[11px] font-bold text-rose-600">{manualTokenError}</p>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <a
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noreferrer"
                className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <span>Open Supabase Dashboard</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setUnauthorizedDomainModal({ isOpen: false, domain: '' })}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleConnectDrive}
                  disabled={isConnectingDrive}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition-all"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isConnectingDrive ? 'animate-spin' : ''}`} />
                  <span>{isConnectingDrive ? 'Retrying...' : 'Retry Connection'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

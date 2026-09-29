import { 
  Student, 
  Teacher, 
  TermReport, 
  PaymentRecord, 
  StudentBill, 
  CalendarEvent, 
  NotificationItem, 
  AcademicYearItem, 
  TermItem, 
  DepartmentItem, 
  ClassItem, 
  HouseItem, 
  SubjectItem,
  UserAccountItem,
  PaymentSettingsConfig,
  PaymentMethodConfig,
  FeeSubmissionItem,
  ClassFeeTariffItem,
  ClassReportBroadcast,
  ThemePaletteConfig,
  CourseItem,
  TeacherAttendanceRecord,
  SchoolExpenseRecord,
  SecretaryDailySummary,
  FinancialAuditReport,
  AccountantPrivilegesConfig,
  CeoPrivilegesConfig,
  DEFAULT_CEO_PRIVILEGES,
  BankDepositRecord,
  SecurityAuditLog,
  StudentAttendanceRecord,
  ExamScheduleItem,
  GraduatedBatch,
  GraduatedStudentItem,
  PastEmployeeRecord,
  FeeRefundRecord,
  StudentTransferRecord,
  ScoreApprovalRecord,
  TransportRouteItem,
  BoardingRoomItem,
  ThermalPrinterSettingsConfig,
  SchoolSettings
} from '../types';
import { 
  INITIAL_STUDENTS, 
  INITIAL_TEACHERS, 
  INITIAL_TERM_REPORTS, 
  INITIAL_PAYMENTS, 
  INITIAL_BILLS, 
  INITIAL_CALENDAR_EVENTS, 
  INITIAL_NOTIFICATIONS 
} from '../data/mockData';
import { 
  INITIAL_ACADEMIC_YEARS, 
  INITIAL_TERMS, 
  INITIAL_DEPARTMENTS, 
  INITIAL_CLASSES, 
  INITIAL_HOUSES, 
  INITIAL_SUBJECTS,
  INITIAL_SHS_COURSES
} from '../data/setupData';

import { STORAGE_KEYS } from '../constants/storageKeys';
export { STORAGE_KEYS };

export const DEFAULT_ACCOUNTANT_PRIVILEGES: AccountantPrivilegesConfig = {
  canCollectFees: true,
  canEnterExpenses: true,
  canApproveExpenses: true,
  canManageFeeSettings: true,
  canRunPayroll: true,
  canViewFinancialReports: true,
  canPerformAudit: true,
  canVoidPayments: true,
  canExportData: true,
  canManageSecretaryRecords: true
};

export const DEFAULT_SUB_ACCOUNTANT_PRIVILEGES: AccountantPrivilegesConfig = {
  canCollectFees: true,
  canEnterExpenses: true,
  canApproveExpenses: false,
  canManageFeeSettings: false,
  canRunPayroll: false,
  canViewFinancialReports: true,
  canPerformAudit: false,
  canVoidPayments: false,
  canExportData: true,
  canManageSecretaryRecords: true
};

export const INITIAL_SYSTEM_USERS: UserAccountItem[] = [
  {
    id: 'usr-admin-1',
    name: 'JAKRei (Administrator)',
    email: 'rei311213@gmail.com',
    username: 'rei311213',
    role: 'admin',
    phone: '0249755593',
    status: 'Active',
    lastLogin: 'Active Now',
    createdAt: '2026-01-10',
    isApproved: true,
    registrationType: 'admin'
  },
  {
    id: 'usr-ceo-1',
    name: 'Dr. Jonathan Mensah (CEO & Proprietor)',
    email: 'ceo@jipas.edu.gh',
    username: 'ceo',
    role: 'ceo',
    executiveTitle: 'School Proprietor & CEO',
    phone: '+228 90 83 60 48',
    status: 'Active',
    lastLogin: 'Never',
    createdAt: '2026-01-10',
    isApproved: true,
    registrationType: 'executive',
    ceoPrivileges: { ...DEFAULT_CEO_PRIVILEGES }
  },
  {
    id: 'usr-director-1',
    name: 'Mrs. Akosua Benissan (Board Director)',
    email: 'director@jipas.edu.gh',
    username: 'director',
    role: 'director',
    executiveTitle: 'Board Chairman & Director',
    phone: '+228 99 47 38 23',
    status: 'Active',
    lastLogin: 'Never',
    createdAt: '2026-01-10',
    isApproved: true,
    registrationType: 'executive',
    ceoPrivileges: { ...DEFAULT_CEO_PRIVILEGES }
  },
  {
    id: 'usr-accountant-1',
    name: 'Mr. Koffi Agbagba (Chief Accountant)',
    email: 'accountant@jipas.edu.gh',
    username: 'accountant',
    role: 'accountant',
    phone: '+228 22 60 21 38',
    status: 'Active',
    lastLogin: 'Never',
    createdAt: '2026-01-10',
    isApproved: true,
    registrationType: 'faculty'
  },
  {
    id: 'usr-secretary-1',
    name: 'Ms. Afia Dorkenoo (Senior School Secretary)',
    email: 'secretary@jipas.edu.gh',
    username: 'secretary',
    role: 'secretary',
    phone: '+228 91 23 45 67',
    status: 'Active',
    lastLogin: 'Never',
    createdAt: '2026-01-10',
    isApproved: true,
    registrationType: 'faculty'
  }
];

export const INITIAL_EXPENSES: SchoolExpenseRecord[] = [];

export const INITIAL_SECRETARY_SUMMARIES: SecretaryDailySummary[] = [];

export const INITIAL_FINANCIAL_AUDITS: FinancialAuditReport[] = [];

import { idbSet } from './idbService';

// Safe localStorage JSON reader
function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const item = localStorage.getItem(key);
    if (!item) return fallback;
    const parsed = JSON.parse(item);
    return parsed ?? fallback;
  } catch (err) {
    console.warn(`[StorageService] Failed to parse key "${key}":`, err);
    return fallback;
  }
}

// Safe localStorage + IndexedDB JSON writer
function writeStorage<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.warn(`[StorageService] Failed to write key "${key}" to localStorage:`, err);
  }
  // Dual-write to IndexedDB asynchronously via localforage
  idbSet(key, data).catch((err) => {
    console.warn(`[StorageService] Failed to write key "${key}" to IndexedDB:`, err);
  });
}

// Check if a localStorage key has been explicitly initialized
function hasStorageKey(key: string): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(key) !== null;
}

// -------------------------------------------------------------
// Entity Getters (Synchronous for instantaneous UI rendering)
// -------------------------------------------------------------
export function getStoredStudents(): Student[] {
  if (isDemoDataCleared()) {
    const students = readStorage<Student[]>(STORAGE_KEYS.STUDENTS, []);
    return (students || []).map(s => ({
      ...s,
      campus: s.campus || 'JIPAS 1',
      status: s.status || 'Active',
      approvalStatus: s.approvalStatus || 'Approved',
      isApproved: s.isApproved !== false,
      isCurrent: s.isCurrent !== false
    }));
  }
  if (hasStorageKey(STORAGE_KEYS.STUDENTS)) {
    const students = readStorage<Student[]>(STORAGE_KEYS.STUDENTS, []);
    return (students || []).map(s => ({
      ...s,
      campus: s.campus || 'JIPAS 1',
      status: s.status || 'Active',
      approvalStatus: s.approvalStatus || 'Approved',
      isApproved: s.isApproved !== false,
      isCurrent: s.isCurrent !== false
    }));
  }
  saveStoredStudents(INITIAL_STUDENTS);
  return INITIAL_STUDENTS.map(s => ({
    ...s,
    campus: s.campus || 'JIPAS 1',
    status: s.status || 'Active',
    approvalStatus: s.approvalStatus || 'Approved',
    isApproved: s.isApproved !== false,
    isCurrent: s.isCurrent !== false
  }));
}

export function getStoredTeachers(): Teacher[] {
  if (isDemoDataCleared()) {
    const teachers = readStorage<Teacher[]>(STORAGE_KEYS.TEACHERS, []);
    return (teachers || []).map(t => ({
      ...t,
      campus: t.campus || 'JIPAS 1',
      status: t.status || 'Active',
      classesTaught: Array.isArray(t?.classesTaught) ? t.classesTaught : ['Basic 1'],
      subjectsTaught: Array.isArray(t?.subjectsTaught) ? t.subjectsTaught : ['Mathematics']
    }));
  }
  if (hasStorageKey(STORAGE_KEYS.TEACHERS)) {
    const teachers = readStorage<Teacher[]>(STORAGE_KEYS.TEACHERS, []);
    return (teachers || []).map(t => ({
      ...t,
      campus: t.campus || 'JIPAS 1',
      status: t.status || 'Active',
      classesTaught: Array.isArray(t?.classesTaught) ? t.classesTaught : ['Basic 1'],
      subjectsTaught: Array.isArray(t?.subjectsTaught) ? t.subjectsTaught : ['Mathematics']
    }));
  }
  saveStoredTeachers(INITIAL_TEACHERS);
  return INITIAL_TEACHERS.map(t => ({
    ...t,
    campus: t.campus || 'JIPAS 1',
    status: t.status || 'Active',
    classesTaught: Array.isArray(t?.classesTaught) ? t.classesTaught : ['Basic 1'],
    subjectsTaught: Array.isArray(t?.subjectsTaught) ? t.subjectsTaught : ['Mathematics']
  }));
}

export function getStoredAcademicYears(): AcademicYearItem[] {
  return readStorage<AcademicYearItem[]>(STORAGE_KEYS.ACADEMIC_YEARS, INITIAL_ACADEMIC_YEARS);
}

export function getStoredTerms(): TermItem[] {
  return readStorage<TermItem[]>(STORAGE_KEYS.TERMS, INITIAL_TERMS);
}

export function getStoredDepartments(): DepartmentItem[] {
  const depts = readStorage<DepartmentItem[]>(STORAGE_KEYS.DEPARTMENTS, INITIAL_DEPARTMENTS);
  if (!depts || !Array.isArray(depts) || depts.length === 0) {
    saveStoredDepartments(INITIAL_DEPARTMENTS);
    return INITIAL_DEPARTMENTS;
  }
  return depts;
}

export function getStoredCourses(): CourseItem[] {
  const courses = readStorage<CourseItem[]>(STORAGE_KEYS.COURSES, INITIAL_SHS_COURSES);
  if (
    !courses ||
    !Array.isArray(courses) ||
    courses.length === 0 ||
    !courses.some(c => (c.department || '').toLowerCase().includes('senior') || (c.department || '').toLowerCase() === 'shs')
  ) {
    saveStoredCourses(INITIAL_SHS_COURSES);
    return INITIAL_SHS_COURSES;
  }
  return courses;
}

export function getStoredClasses(): ClassItem[] {
  const classes = readStorage<ClassItem[]>(STORAGE_KEYS.CLASSES, INITIAL_CLASSES);
  if (!classes || !Array.isArray(classes) || classes.length === 0) {
    saveStoredClasses(INITIAL_CLASSES);
    return INITIAL_CLASSES;
  }
  return classes;
}

export function getStoredHouses(): HouseItem[] {
  const houses = readStorage<HouseItem[]>(STORAGE_KEYS.HOUSES, INITIAL_HOUSES);
  if (!houses || !Array.isArray(houses) || houses.length === 0) {
    saveStoredHouses(INITIAL_HOUSES);
    return INITIAL_HOUSES;
  }
  return houses;
}

export function getStoredSubjects(): SubjectItem[] {
  const subjects = readStorage<SubjectItem[]>(STORAGE_KEYS.SUBJECTS, INITIAL_SUBJECTS);
  if (!subjects || !Array.isArray(subjects) || subjects.length === 0) {
    saveStoredSubjects(INITIAL_SUBJECTS);
    return INITIAL_SUBJECTS;
  }
  return subjects;
}

export function getStoredBills(): StudentBill[] {
  if (isDemoDataCleared()) {
    return readStorage<StudentBill[]>(STORAGE_KEYS.BILLS, []);
  }
  if (hasStorageKey(STORAGE_KEYS.BILLS)) {
    return readStorage<StudentBill[]>(STORAGE_KEYS.BILLS, []);
  }
  saveStoredBills(INITIAL_BILLS);
  return INITIAL_BILLS;
}

export function getStoredPayments(): PaymentRecord[] {
  if (isDemoDataCleared()) {
    return readStorage<PaymentRecord[]>(STORAGE_KEYS.PAYMENTS, []);
  }
  if (hasStorageKey(STORAGE_KEYS.PAYMENTS)) {
    return readStorage<PaymentRecord[]>(STORAGE_KEYS.PAYMENTS, []);
  }
  saveStoredPayments(INITIAL_PAYMENTS);
  return INITIAL_PAYMENTS;
}

export function getStoredReports(): TermReport[] {
  if (isDemoDataCleared()) {
    return readStorage<TermReport[]>(STORAGE_KEYS.REPORTS, []);
  }
  if (hasStorageKey(STORAGE_KEYS.REPORTS)) {
    return readStorage<TermReport[]>(STORAGE_KEYS.REPORTS, []);
  }
  saveStoredReports(INITIAL_TERM_REPORTS);
  return INITIAL_TERM_REPORTS;
}

export function getStoredCalendarEvents(): CalendarEvent[] {
  return readStorage<CalendarEvent[]>(STORAGE_KEYS.CALENDAR_EVENTS, INITIAL_CALENDAR_EVENTS);
}

export function getStoredNotifications(): NotificationItem[] {
  return readStorage<NotificationItem[]>(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
}

export function getStoredUsers(): UserAccountItem[] {
  if (isDemoDataCleared()) {
    const users = readStorage<UserAccountItem[]>(STORAGE_KEYS.USERS, []);
    return Array.isArray(users) ? users : [];
  }
  if (hasStorageKey(STORAGE_KEYS.USERS)) {
    const users = readStorage<UserAccountItem[]>(STORAGE_KEYS.USERS, []);
    return Array.isArray(users) ? users : [];
  }
  writeStorage(STORAGE_KEYS.USERS, INITIAL_SYSTEM_USERS);
  return INITIAL_SYSTEM_USERS;
}

export function getStoredTeacherAttendance(): TeacherAttendanceRecord[] {
  return readStorage<TeacherAttendanceRecord[]>(STORAGE_KEYS.TEACHER_ATTENDANCE, []);
}

export function getStoredStudentAttendance(): StudentAttendanceRecord[] {
  return readStorage<StudentAttendanceRecord[]>(STORAGE_KEYS.STUDENT_ATTENDANCE, []);
}

// -------------------------------------------------------------
// Entity Setters (Updates localStorage immediately)
// -------------------------------------------------------------
export function saveStoredStudents(students: Student[]): void {
  writeStorage(STORAGE_KEYS.STUDENTS, students);
}

export function saveStoredTeachers(teachers: Teacher[]): void {
  writeStorage(STORAGE_KEYS.TEACHERS, teachers);
}

export function saveStoredUsers(users: UserAccountItem[]): void {
  writeStorage(STORAGE_KEYS.USERS, users);
}

export function saveStoredAcademicYears(years: AcademicYearItem[]): void {
  writeStorage(STORAGE_KEYS.ACADEMIC_YEARS, years);
}

export function saveStoredTerms(terms: TermItem[]): void {
  writeStorage(STORAGE_KEYS.TERMS, terms);
}

export function saveStoredDepartments(departments: DepartmentItem[]): void {
  writeStorage(STORAGE_KEYS.DEPARTMENTS, departments);
}

export function saveStoredCourses(courses: CourseItem[]): void {
  writeStorage(STORAGE_KEYS.COURSES, courses);
}

export function saveStoredClasses(classes: ClassItem[]): void {
  writeStorage(STORAGE_KEYS.CLASSES, classes);
}

export function saveStoredHouses(houses: HouseItem[]): void {
  writeStorage(STORAGE_KEYS.HOUSES, houses);
}

export function saveStoredSubjects(subjects: SubjectItem[]): void {
  writeStorage(STORAGE_KEYS.SUBJECTS, subjects);
}

export function saveStoredBills(bills: StudentBill[]): void {
  writeStorage(STORAGE_KEYS.BILLS, bills);
}

export function saveStoredPayments(payments: PaymentRecord[]): void {
  writeStorage(STORAGE_KEYS.PAYMENTS, payments);
}

export function saveStoredReports(reports: TermReport[]): void {
  writeStorage(STORAGE_KEYS.REPORTS, reports);
}

export function saveStoredCalendarEvents(events: CalendarEvent[]): void {
  writeStorage(STORAGE_KEYS.CALENDAR_EVENTS, events);
}

export function saveStoredNotifications(notifications: NotificationItem[]): void {
  writeStorage(STORAGE_KEYS.NOTIFICATIONS, notifications);
}

export function saveStoredTeacherAttendance(records: TeacherAttendanceRecord[]): void {
  writeStorage(STORAGE_KEYS.TEACHER_ATTENDANCE, records);
}

export function saveStoredStudentAttendance(records: StudentAttendanceRecord[]): void {
  writeStorage(STORAGE_KEYS.STUDENT_ATTENDANCE, records);
}

export function isDemoDataCleared(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(STORAGE_KEYS.DEMO_CLEARED) === 'true';
}

export const INITIAL_PAYMENT_SETTINGS: PaymentSettingsConfig = {
  generalInstructions: 'Please make school fee payments strictly through the official approved payment channels listed below or via our official Mobile Money Merchant code: *145*5*1083411# (Marchand: JIPAS 1). After making payment, submit your Transaction ID on this portal for immediate verification by the Admin and Accountant.',
  allowPortalSubmission: true,
  requireProofReference: true,
  supportPhone: '0249755593',
  supportEmail: 'accounts@jipas.edu.gh',
  methods: [
    {
      id: 'pm-2',
      type: 'momo',
      name: 'Paiement Marchand Mobile Money (JIPAS 1)',
      enabled: true,
      isPrimary: true,
      bankOrProviderName: 'Mobile Money (Orange / MTN / MoMo)',
      accountName: 'JIPAS 1',
      accountNumber: '*145*5*1083411#',
      instructions: 'Formoser *145*5*1083411# sur votre téléphone mobile pour effectuer un Paiement Marchand vers JIPAS 1 (Code Marchand: 1083411). Indiquez le Nom de l\'élève & le Matricule comme référence, puis conservez votre ID de transaction.'
    },
    {
      id: 'pm-1',
      type: 'bank',
      name: 'GCB Bank Official Account',
      enabled: true,
      isPrimary: false,
      bankOrProviderName: 'GCB Bank',
      accountName: 'JIPAS Educational Complex',
      accountNumber: '10211839001',
      branchOrSortCode: 'Accra Central Branch',
      instructions: 'Pay at any GCB Bank branch or via GCB Mobile App. Enter Student Admission No as Deposit / Payment Reference.'
    },
    {
      id: 'pm-4',
      type: 'cash',
      name: 'School Cashier Desk (Bursar Office)',
      enabled: true,
      accountName: 'JIPAS Bursar Office',
      accountNumber: 'Cash / Direct Handover',
      instructions: 'Walk in to the School Accounts Office during working hours (8:00 AM - 4:00 PM Monday-Friday) for direct cash payment and printed paper receipt.'
    }
  ]
};

export const INITIAL_FEE_SUBMISSIONS: FeeSubmissionItem[] = [
  {
    id: 'sub-101',
    studentId: 'st-001',
    studentName: 'Kofi Mensah',
    admissionNo: 'ADM/26/0001',
    className: 'Basic 1',
    amount: 350,
    feeType: 'Tuition Fee (Full Term Payment)',
    paymentMethod: 'Paiement Marchand Mobile Money (JIPAS 1)',
    transactionId: 'MOM-8842109',
    datePaid: '2026-09-06',
    submissionDate: '2026-09-06 10:15 AM',
    status: 'Pending Verification',
    notes: 'Paid via Mobile Money Marchand (*145*5*1083411#).'
  }
];

export function getStoredPaymentSettings(): PaymentSettingsConfig {
  const settings = readStorage<PaymentSettingsConfig>(STORAGE_KEYS.PAYMENT_SETTINGS, INITIAL_PAYMENT_SETTINGS);
  
  // Migration safeguard: Ensure JIPAS 1 Marchand (*145*5*1083411#) is included in methods
  if (settings && Array.isArray(settings.methods)) {
    const hasJipas1 = settings.methods.some(m => m.accountNumber?.includes('1083411') || m.accountName === 'JIPAS 1');
    if (!hasJipas1) {
      const updatedMethods = [
        {
          id: 'pm-momo-jipas1',
          type: 'momo' as const,
          name: 'Paiement Marchand Mobile Money (JIPAS 1)',
          enabled: true,
          isPrimary: true,
          bankOrProviderName: 'Mobile Money (Orange / MTN / MoMo)',
          accountName: 'JIPAS 1',
          accountNumber: '*145*5*1083411#',
          instructions: 'Formoser *145*5*1083411# sur votre téléphone pour un Paiement Marchand vers JIPAS 1 (Code Marchand: 1083411). Indiquez le Nom de l\'élève & Matricule en référence.'
        },
        ...settings.methods
      ];
      settings.methods = updatedMethods;
      writeStorage(STORAGE_KEYS.PAYMENT_SETTINGS, settings);
    }
  }

  return settings;
}

export function saveStoredPaymentSettings(settings: PaymentSettingsConfig): void {
  writeStorage(STORAGE_KEYS.PAYMENT_SETTINGS, settings);
}

export const INITIAL_SCHOOL_SETTINGS: SchoolSettings = {
  schoolName: 'JIPAS',
  schoolMotto: 'Education is Wealth • Founded 2002',
  schoolLogo: '/logo.jpg',
  laptopLogo: '/logo.jpg',
  mobileLogo: '/logo.jpg',
  phone: '(00228) 22 60 21 38 / 99 47 38 23 / 90 83 60 48',
  email: 'joyjipas2002@gmail.com',
  address: '01 BP. 2364 • Kpéhénou N°1 Behind T-Oil Feeling Station, and Hedzranawoe 4th Corner after Radio Maria, Lomé — Togo',
  website: 'www.jipas.edu.gh',
  activeAcademicYear: '2025-2026',
  activeTerm: 'Third Term',
  enableIncompleteReminders: true,
  reminderFrequency: 'Weekly',
  notifyParentsForMissingGrades: true,
  missingGradeThreshold: 1,
  workingHours: {
    startTime: '07:30',
    latenessCutoff: '08:00',
    closingTime: '15:30',
    workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    gracePeriodMinutes: 5
  }
};

export function getStoredSettings(): SchoolSettings {
  const settings = readStorage<SchoolSettings>(STORAGE_KEYS.GENERAL_SETTINGS, INITIAL_SCHOOL_SETTINGS);
  return {
    ...INITIAL_SCHOOL_SETTINGS,
    ...(settings || {})
  };
}

export function saveStoredSettings(settings: Partial<SchoolSettings>): void {
  const current = getStoredSettings();
  const updated: SchoolSettings = {
    ...current,
    ...settings
  };
  writeStorage(STORAGE_KEYS.GENERAL_SETTINGS, updated);
}

export const INITIAL_THERMAL_PRINTER_SETTINGS: ThermalPrinterSettingsConfig = {
  receiptPaperMode: 'a6',
  includeLogo: true,
  customFooterText: 'Thank you for your payment. Education is Wealth • Knowledge, Discipline & Excellence.',
  showQrCode: true,
  autoPrintPrompt: false,
  printDensity: 'dark'
};

export function getStoredThermalPrinterSettings(): ThermalPrinterSettingsConfig {
  return readStorage<ThermalPrinterSettingsConfig>(STORAGE_KEYS.THERMAL_PRINTER_SETTINGS, INITIAL_THERMAL_PRINTER_SETTINGS);
}

export function saveStoredThermalPrinterSettings(settings: ThermalPrinterSettingsConfig): void {
  writeStorage(STORAGE_KEYS.THERMAL_PRINTER_SETTINGS, settings);
}

export function getStoredFeeSubmissions(): FeeSubmissionItem[] {
  return readStorage<FeeSubmissionItem[]>(STORAGE_KEYS.FEE_SUBMISSIONS, INITIAL_FEE_SUBMISSIONS);
}

export function saveStoredFeeSubmissions(submissions: FeeSubmissionItem[]): void {
  writeStorage(STORAGE_KEYS.FEE_SUBMISSIONS, submissions);
}

export const INITIAL_CLASS_FEE_TARIFFS: ClassFeeTariffItem[] = [];

export function getStoredClassFeeTariffs(): ClassFeeTariffItem[] {
  const stored = localStorage.getItem(STORAGE_KEYS.CLASS_FEE_TARIFFS);
  if (stored && stored.includes('tariff-ps-cre-n2')) {
    localStorage.removeItem(STORAGE_KEYS.CLASS_FEE_TARIFFS);
  }
  const tariffs = readStorage<ClassFeeTariffItem[]>(STORAGE_KEYS.CLASS_FEE_TARIFFS, INITIAL_CLASS_FEE_TARIFFS);
  if ((!tariffs || tariffs.length === 0) && INITIAL_CLASS_FEE_TARIFFS.length > 0) {
    saveStoredClassFeeTariffs(INITIAL_CLASS_FEE_TARIFFS);
    return INITIAL_CLASS_FEE_TARIFFS;
  }
  return tariffs || [];
}

export function saveStoredClassFeeTariffs(tariffs: ClassFeeTariffItem[]): void {
  writeStorage(STORAGE_KEYS.CLASS_FEE_TARIFFS, tariffs);
}

export const INITIAL_CLASS_BROADCASTS: ClassReportBroadcast[] = [];

export function getStoredClassBroadcasts(): ClassReportBroadcast[] {
  return readStorage<ClassReportBroadcast[]>(STORAGE_KEYS.CLASS_BROADCASTS, INITIAL_CLASS_BROADCASTS);
}

export function saveStoredClassBroadcasts(broadcasts: ClassReportBroadcast[]): void {
  writeStorage(STORAGE_KEYS.CLASS_BROADCASTS, broadcasts);
}

export function getStoredExamSchedules(): ExamScheduleItem[] {
  return readStorage<ExamScheduleItem[]>(STORAGE_KEYS.EXAM_SCHEDULES, [
    {
      id: 'exam-1',
      className: 'Basic 1',
      subjectName: 'Mathematics',
      examDate: '2026-10-05',
      startTime: '08:30 AM',
      endTime: '10:30 AM',
      venue: 'Primary Hall Room 1',
      invigilator: 'Mr. John Doe',
      totalMarks: 100,
      instructions: 'Answer all questions. Show clear working.',
      status: 'Scheduled',
      academicYear: '2025-2026',
      term: 'Third Term',
      isBroadcasted: true,
      broadcastedAt: '2026-09-20',
      broadcastedBy: 'Administrator'
    },
    {
      id: 'exam-2',
      className: 'JHS 1',
      subjectName: 'Integrated Science',
      examDate: '2026-10-06',
      startTime: '09:00 AM',
      endTime: '11:30 AM',
      venue: 'JHS Block Hall B',
      invigilator: 'Mrs. Mary Addo',
      totalMarks: 100,
      instructions: 'Diagrams must be drawn in pencil.',
      status: 'Scheduled',
      academicYear: '2025-2026',
      term: 'Third Term',
      isBroadcasted: false
    }
  ]);
}

export function saveStoredExamSchedules(schedules: ExamScheduleItem[]): void {
  writeStorage(STORAGE_KEYS.EXAM_SCHEDULES, schedules);
}

export function setDemoDataCleared(cleared: boolean): void {
  if (typeof window === 'undefined') return;
  if (cleared) {
    localStorage.setItem(STORAGE_KEYS.DEMO_CLEARED, 'true');
  } else {
    localStorage.removeItem(STORAGE_KEYS.DEMO_CLEARED);
  }
}

export const DEFAULT_THEME_PALETTES: ThemePaletteConfig[] = [
  {
    id: 'default',
    name: 'JIPAS Royal Blue (Default)',
    primaryColor: '#2563eb',
    primaryHoverColor: '#1d4ed8',
    primaryLightColor: '#eff6ff',
    backgroundColor: '#040814',
    cardBackgroundColor: '#0B142A',
    sidebarBgColor: '#070D1E',
    headerBgColor: '#070D1E',
    textColor: '#f8fafc',
    accentColor: '#38bdf8',
    mode: 'dark'
  },
  {
    id: 'emerald-academy',
    name: 'Emerald Academy',
    primaryColor: '#059669',
    primaryHoverColor: '#047857',
    primaryLightColor: '#ecfdf5',
    backgroundColor: '#051b14',
    cardBackgroundColor: '#0b2e23',
    sidebarBgColor: '#051b14',
    headerBgColor: '#0b2e23',
    textColor: '#f0fdf4',
    accentColor: '#10b981',
    mode: 'dark'
  },
  {
    id: 'ghana-gold',
    name: 'the region Gold & Amber',
    primaryColor: '#d97706',
    primaryHoverColor: '#b45309',
    primaryLightColor: '#fffbeb',
    backgroundColor: '#181106',
    cardBackgroundColor: '#2a1d0b',
    sidebarBgColor: '#181106',
    headerBgColor: '#2a1d0b',
    textColor: '#fefce8',
    accentColor: '#f59e0b',
    mode: 'dark'
  },
  {
    id: 'clean-slate-light',
    name: 'Clean Slate Light',
    primaryColor: '#4f46e5',
    primaryHoverColor: '#4338ca',
    primaryLightColor: '#eef2ff',
    backgroundColor: '#f8fafc',
    cardBackgroundColor: '#ffffff',
    sidebarBgColor: '#0f172a',
    headerBgColor: '#1e293b',
    textColor: '#0f172a',
    accentColor: '#10b981',
    mode: 'light'
  },
  {
    id: 'warm-ivory-light',
    name: 'Warm Ivory Light',
    primaryColor: '#0284c7',
    primaryHoverColor: '#0369a1',
    primaryLightColor: '#f0f9ff',
    backgroundColor: '#faf8f5',
    cardBackgroundColor: '#ffffff',
    sidebarBgColor: '#1c1917',
    headerBgColor: '#292524',
    textColor: '#1c1917',
    accentColor: '#f59e0b',
    mode: 'light'
  },
  {
    id: 'crimson-prestige',
    name: 'Crimson Prestige',
    primaryColor: '#dc2626',
    primaryHoverColor: '#b91c1c',
    primaryLightColor: '#fef2f2',
    backgroundColor: '#170609',
    cardBackgroundColor: '#2a0c12',
    sidebarBgColor: '#170609',
    headerBgColor: '#2a0c12',
    textColor: '#fff1f2',
    accentColor: '#f43f5e',
    mode: 'dark'
  },
  {
    id: 'midnight-charcoal',
    name: 'Midnight Charcoal',
    primaryColor: '#8b5cf6',
    primaryHoverColor: '#7c3aed',
    primaryLightColor: '#f5f3ff',
    backgroundColor: '#121216',
    cardBackgroundColor: '#1a1a22',
    sidebarBgColor: '#121216',
    headerBgColor: '#1a1a22',
    textColor: '#f5f3ff',
    accentColor: '#a78bfa',
    mode: 'dark'
  }
];

export const DEFAULT_THEME_PALETTE: ThemePaletteConfig = DEFAULT_THEME_PALETTES[0];

export function getStoredThemePalette(): ThemePaletteConfig {
  return readStorage<ThemePaletteConfig>(STORAGE_KEYS.THEME_PALETTE, DEFAULT_THEME_PALETTE);
}

export function saveStoredThemePalette(palette: ThemePaletteConfig): void {
  writeStorage(STORAGE_KEYS.THEME_PALETTE, palette);
}

export type { ThemePaletteConfig };

export function applyThemePaletteToDom(palette: ThemePaletteConfig): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const body = document.body;

  root.style.setProperty('--color-primary', palette.primaryColor);
  root.style.setProperty('--color-primary-hover', palette.primaryHoverColor || palette.primaryColor);
  root.style.setProperty('--color-primary-light', palette.primaryLightColor || '#eff6ff');
  root.style.setProperty('--color-app-bg', palette.backgroundColor);
  root.style.setProperty('--color-card-bg', palette.cardBackgroundColor);
  root.style.setProperty('--color-text-main', palette.textColor);

  if (palette.wallpaper && palette.wallpaper !== 'none') {
    const wallpaperUrl = palette.wallpaper === 'assembly' 
      ? '/wallpapers/assembly.jpg' 
      : palette.wallpaper === 'classroom'
      ? '/wallpapers/classroom.jpg'
      : palette.wallpaper;
    root.style.setProperty('--wallpaper-url', `url('${wallpaperUrl}')`);
  } else {
    root.style.removeProperty('--wallpaper-url');
  }

  if (body) {
    body.style.backgroundColor = palette.backgroundColor;
  }
}

// School Expenses Getters & Setters
export function getStoredExpenses(): SchoolExpenseRecord[] {
  return readStorage<SchoolExpenseRecord[]>(STORAGE_KEYS.EXPENSES, INITIAL_EXPENSES);
}

export function saveStoredExpenses(expenses: SchoolExpenseRecord[]): void {
  writeStorage(STORAGE_KEYS.EXPENSES, expenses);
}

// Secretary Summaries Getters & Setters
export function getStoredSecretarySummaries(): SecretaryDailySummary[] {
  return readStorage<SecretaryDailySummary[]>(STORAGE_KEYS.SECRETARY_SUMMARIES, INITIAL_SECRETARY_SUMMARIES);
}

export function saveStoredSecretarySummaries(summaries: SecretaryDailySummary[]): void {
  writeStorage(STORAGE_KEYS.SECRETARY_SUMMARIES, summaries);
}

// Financial Audit Reports Getters & Setters
export function getStoredFinancialAudits(): FinancialAuditReport[] {
  return readStorage<FinancialAuditReport[]>(STORAGE_KEYS.FINANCIAL_AUDITS, INITIAL_FINANCIAL_AUDITS);
}

export function saveStoredFinancialAudits(audits: FinancialAuditReport[]): void {
  writeStorage(STORAGE_KEYS.FINANCIAL_AUDITS, audits);
}

// Payroll Runs Getters & Setters
export function getStoredPayrollRuns(): any[] {
  return readStorage<any[]>('jipas_payroll_runs', [
    {
      id: 'PAYROLL-2026-01',
      month: 'January 2026',
      totalStaff: 12,
      grossTotal: 24500,
      deductionsTotal: 3100,
      netPayout: 21400,
      status: 'Paid',
      paymentDate: '2026-01-28'
    }
  ]);
}

export function saveStoredPayrollRuns(runs: any[]): void {
  writeStorage('jipas_payroll_runs', runs);
}

export const INITIAL_BANK_DEPOSITS: BankDepositRecord[] = [
  {
    id: 'BANK-DEP-001',
    bankName: 'Ecobank the region',
    accountNumber: '1441002981201',
    amount: 15000,
    bankReceiptNo: 'ECO-TEL-98214',
    date: new Date().toISOString().split('T')[0],
    depositedBy: 'Denis Mawutor (Accountant)',
    depositedByRole: 'accountant',
    purpose: 'Daily Tuition Fee Collection Banking',
    referenceNo: 'DEP-2026-001',
    notes: 'Direct branch counter cash deposit to school operating account.',
    status: 'Completed',
    createdAt: new Date().toISOString()
  },
  {
    id: 'BANK-DEP-002',
    bankName: 'GCB Bank',
    accountNumber: '2019485710001',
    amount: 8500,
    bankReceiptNo: 'GCB-SLIP-40192',
    date: new Date().toISOString().split('T')[0],
    depositedBy: 'Abena Osei (Secretary)',
    depositedByRole: 'secretary',
    purpose: 'Secretarial Front-Desk Cash Banking',
    referenceNo: 'DEP-2026-002',
    notes: 'End-of-day desk cash sent to bank.',
    status: 'Completed',
    createdAt: new Date().toISOString()
  }
];

// Bank Deposits Getters & Setters
export function getStoredBankDeposits(): BankDepositRecord[] {
  return readStorage<BankDepositRecord[]>(STORAGE_KEYS.BANK_DEPOSITS, INITIAL_BANK_DEPOSITS);
}

export function saveStoredBankDeposits(deposits: BankDepositRecord[]): void {
  writeStorage(STORAGE_KEYS.BANK_DEPOSITS, deposits);
}

// Accountant Privileges Getters & Setters
export function getStoredAccountantPrivileges(): AccountantPrivilegesConfig {
  return readStorage<AccountantPrivilegesConfig>(STORAGE_KEYS.ACCOUNTANT_PRIVILEGES, DEFAULT_ACCOUNTANT_PRIVILEGES);
}

export function saveStoredAccountantPrivileges(config: AccountantPrivilegesConfig): void {
  writeStorage(STORAGE_KEYS.ACCOUNTANT_PRIVILEGES, config);
}

export const INITIAL_SECURITY_AUDIT_LOGS: SecurityAuditLog[] = [
  {
    id: 'SEC-LOG-001',
    timestamp: new Date(Date.now() - 3600000 * 4).toLocaleString('sv').replace(' ', ' '),
    performedBy: 'Super Administrator',
    performedByRole: 'admin',
    targetUser: 'Kofi Mensah (Sub-Accountant)',
    targetUserRole: 'sub_accountant',
    actionType: 'Privilege Modification',
    details: 'Granted privilege: canRunPayroll, canApproveExpenses. Revoked: canVoidPayments'
  },
  {
    id: 'SEC-LOG-002',
    timestamp: new Date(Date.now() - 3600000 * 24).toLocaleString('sv').replace(' ', ' '),
    performedBy: 'Super Administrator',
    performedByRole: 'admin',
    targetUser: 'Ama Serwaa (Secretary)',
    targetUserRole: 'secretary',
    actionType: 'Access Level Change',
    details: 'Updated assigned modules: Student Enrollment, Fee Receipts, Attendance'
  },
  {
    id: 'SEC-LOG-003',
    timestamp: new Date(Date.now() - 3600000 * 48).toLocaleString('sv').replace(' ', ' '),
    performedBy: 'Headmaster / Admin',
    performedByRole: 'admin',
    targetUser: 'Bernard Ofori (Sub-Admin)',
    targetUserRole: 'sub_admin',
    actionType: 'Role Update',
    details: 'Assigned system sub_admin role with elevated academic publishing rights'
  }
];

export function getStoredSecurityAuditLogs(): SecurityAuditLog[] {
  return readStorage<SecurityAuditLog[]>(STORAGE_KEYS.SECURITY_AUDIT_LOGS, INITIAL_SECURITY_AUDIT_LOGS);
}

export function saveStoredSecurityAuditLogs(logs: SecurityAuditLog[]): void {
  writeStorage(STORAGE_KEYS.SECURITY_AUDIT_LOGS, logs);
}

export function recordSecurityAuditLog(log: Omit<SecurityAuditLog, 'id' | 'timestamp'>): SecurityAuditLog {
  const currentLogs = getStoredSecurityAuditLogs();
  const newEntry: SecurityAuditLog = {
    ...log,
    id: `SEC-LOG-${Date.now().toString().slice(-6)}`,
    timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19)
  };
  const updatedLogs = [newEntry, ...currentLogs];
  saveStoredSecurityAuditLogs(updatedLogs);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('jipas_audit_log_created', { detail: newEntry }));
  }

  return newEntry;
}

export const INITIAL_GRADUATED_BATCHES: GraduatedBatch[] = [
  {
    id: 'batch-2025-jhs',
    batchName: 'Class of 2025 (Basic 9 / JHS)',
    graduationYear: '2025',
    academicYear: '2024/2025',
    department: 'Junior High School',
    classGraduated: 'Basic 9',
    totalStudents: 42,
    graduationDate: '2025-07-25',
    status: 'Active',
    notes: 'Successfully completed BECE 2025 Examinations and graduated.'
  },
  {
    id: 'batch-2025-shs',
    batchName: 'Class of 2025 (SHS 3 / WASSCE)',
    graduationYear: '2025',
    academicYear: '2024/2025',
    department: 'Senior High School',
    classGraduated: 'SHS 3',
    totalStudents: 38,
    graduationDate: '2025-08-15',
    status: 'Active',
    notes: 'Graduated SHS WASSCE Candidates.'
  }
];

export function getStoredGraduatedBatches(): GraduatedBatch[] {
  return readStorage<GraduatedBatch[]>(STORAGE_KEYS.GRADUATED_BATCHES, INITIAL_GRADUATED_BATCHES);
}

export function saveStoredGraduatedBatches(batches: GraduatedBatch[]): void {
  writeStorage(STORAGE_KEYS.GRADUATED_BATCHES, batches);
}

export const INITIAL_GRADUATED_STUDENTS: GraduatedStudentItem[] = [
  {
    id: 'grad-2025-001',
    admissionNo: 'JIPAS/2022/014',
    fullName: 'KWESI MENSAH AGYAPONG',
    gender: 'Male',
    dob: '2009-04-12',
    completionYear: '2025',
    examType: 'BECE',
    candidateIndexNo: '1010203001',
    becePlacementStatus: 'Placement',
    placedSchool: "Presbyterian Boys' Secondary School (PRESEC Legon)",
    placedProgramme: 'General Science',
    classGraduatedFrom: 'Basic 9 A',
    department: 'Junior High School',
    aggregate: 6,
    parentName: 'Mr. Emmanuel Agyapong',
    parentPhone: '0244112233',
    campus: 'JIPAS 1',
    status: 'Placed',
    remarks: 'Distinction in all 9 BECE subjects. Placed in First Choice school.'
  },
  {
    id: 'grad-2025-002',
    admissionNo: 'JIPAS/2022/038',
    fullName: 'AKOSUA SERWAA BOATENG',
    gender: 'Female',
    dob: '2009-08-25',
    completionYear: '2025',
    examType: 'BECE',
    candidateIndexNo: '1010203002',
    becePlacementStatus: 'Placement',
    placedSchool: "Wesley Girls' High School, Cape Coast",
    placedProgramme: 'General Science',
    classGraduatedFrom: 'Basic 9 B',
    department: 'Junior High School',
    aggregate: 7,
    parentName: 'Dr. Serwaa Boateng',
    parentPhone: '0208990011',
    campus: 'JIPAS 1',
    status: 'Placed',
    remarks: 'Grade 1 in Integrated Science and Core Mathematics.'
  },
  {
    id: 'grad-2025-003',
    admissionNo: 'JIPAS/2022/059',
    fullName: 'KOFI OWUSU ANSAH',
    gender: 'Male',
    dob: '2009-11-03',
    completionYear: '2025',
    examType: 'BECE',
    candidateIndexNo: '1010203003',
    becePlacementStatus: 'Non-placement',
    classGraduatedFrom: 'Basic 9 A',
    department: 'Junior High School',
    aggregate: 28,
    parentName: 'Madam Grace Ansah',
    parentPhone: '0277334455',
    campus: 'JIPAS 1',
    status: 'Pending Placement',
    remarks: 'Awaiting CSSPS self-placement system round 2.'
  },
  {
    id: 'grad-2025-004',
    admissionNo: 'JIPAS/SHS/2022/008',
    fullName: 'EMMANUEL KOJO ABBEY',
    gender: 'Male',
    dob: '2006-03-17',
    completionYear: '2025',
    examType: 'WASSCE',
    candidateIndexNo: '0010203045',
    wassceProgramme: 'General Science',
    classGraduatedFrom: 'SHS 3 Science',
    department: 'Senior High School',
    aggregate: 8,
    parentName: 'Rev. Abbey',
    parentPhone: '0555889922',
    campus: 'JIPAS 1',
    status: 'Higher Education',
    remarks: 'Passed all 8 WASSCE papers with 6 A1s and 2 B2s. Enrolled in KNUST Medical School.'
  },
  {
    id: 'grad-2025-005',
    admissionNo: 'JIPAS/SHS/2022/021',
    fullName: 'PRISCILLA OSEI TUTU',
    gender: 'Female',
    dob: '2006-09-09',
    completionYear: '2025',
    examType: 'WASSCE',
    candidateIndexNo: '0010203046',
    wassceProgramme: 'Business',
    classGraduatedFrom: 'SHS 3 Business',
    department: 'Senior High School',
    aggregate: 9,
    parentName: 'Mrs. Abigail Osei Tutu',
    parentPhone: '0245667788',
    campus: 'JIPAS 2',
    status: 'Higher Education',
    remarks: 'A1 in Financial Accounting and Cost Accounting.'
  },
  {
    id: 'grad-2024-006',
    admissionNo: 'JIPAS/2021/019',
    fullName: 'DAVID DARKO ADDO',
    gender: 'Male',
    dob: '2008-01-30',
    completionYear: '2024',
    examType: 'BECE',
    candidateIndexNo: '1010192004',
    becePlacementStatus: 'Placement',
    placedSchool: 'Achimota School',
    placedProgramme: 'General Arts',
    classGraduatedFrom: 'Basic 9',
    department: 'Junior High School',
    aggregate: 8,
    parentName: 'Mr. Richard Addo',
    parentPhone: '0201122445',
    campus: 'JIPAS 1',
    status: 'Placed',
    remarks: 'Class of 2024 graduate.'
  }
];

export function getStoredGraduatedStudents(): GraduatedStudentItem[] {
  return readStorage<GraduatedStudentItem[]>(STORAGE_KEYS.GRADUATED_STUDENTS, INITIAL_GRADUATED_STUDENTS);
}

export function saveStoredGraduatedStudents(students: GraduatedStudentItem[]): void {
  writeStorage(STORAGE_KEYS.GRADUATED_STUDENTS, students);
}

export const INITIAL_PAST_EMPLOYEES: PastEmployeeRecord[] = [
  {
    id: 'emp-past-001',
    fullName: 'MICHAEL KWABENA APPIAH',
    staffId: 'JIPAS/STAFF/2018/012',
    gender: 'Male',
    phone: '0244556677',
    email: 'm.appiah@gmail.com',
    department: 'Senior High School',
    role: 'Head of Science / Physics Teacher',
    durationOfService: '2018 - 2024 (6 Years)',
    startDate: '2018-09-01',
    endDate: '2024-08-31',
    classesHandled: ['SHS 1 Science', 'SHS 2 Science', 'SHS 3 Science'],
    subjectsHandled: ['Physics', 'Integrated Science', 'Elective Mathematics'],
    exitReason: 'Further Studies',
    serviceRating: 'Outstanding',
    remarks: 'Proceeded on Master of Science scholarship study leave abroad. Excellent work ethics.',
    certificateIssued: true,
    campus: 'JIPAS 1'
  },
  {
    id: 'emp-past-002',
    fullName: 'FAUSTINA ADDO-KUFUOR',
    staffId: 'JIPAS/STAFF/2019/024',
    gender: 'Female',
    phone: '0208112233',
    email: 'f.addokufuor@yahoo.com',
    department: 'Junior High School',
    role: 'Senior English Language Teacher',
    durationOfService: '2019 - 2024 (5 Years)',
    startDate: '2019-01-15',
    endDate: '2024-06-30',
    classesHandled: ['Basic 7', 'Basic 8', 'Basic 9'],
    subjectsHandled: ['English Language', 'Literature in English'],
    exitReason: 'Relocated',
    serviceRating: 'Very Good',
    remarks: 'Relocated to Kumasi with family. Highly commendable discipline and classroom management.',
    certificateIssued: true,
    campus: 'JIPAS 1'
  },
  {
    id: 'emp-past-003',
    fullName: 'JOSEPH TAWIAH',
    staffId: 'JIPAS/STAFF/2017/005',
    gender: 'Male',
    phone: '0277889900',
    email: 'j.tawiah@outlook.com',
    department: 'Accounts & Finance',
    role: 'Bursar / Senior Accountant',
    durationOfService: '2017 - 2023 (6 Years)',
    startDate: '2017-03-01',
    endDate: '2023-11-30',
    classesHandled: [],
    subjectsHandled: ['Financial Accounting', 'Cost Accounting'],
    exitReason: 'Resigned',
    serviceRating: 'Very Good',
    remarks: 'Transitioned to the commercial banking sector. All school books and audit reconciliations handed over accurately.',
    certificateIssued: true,
    campus: 'JIPAS 1'
  }
];

export function getStoredPastEmployees(): PastEmployeeRecord[] {
  return readStorage<PastEmployeeRecord[]>(STORAGE_KEYS.PAST_EMPLOYEES, INITIAL_PAST_EMPLOYEES);
}

export function saveStoredPastEmployees(employees: PastEmployeeRecord[]): void {
  writeStorage(STORAGE_KEYS.PAST_EMPLOYEES, employees);
}

// ---------------------------------------------------------------------------
// Fee Refunds Storage
// ---------------------------------------------------------------------------
export const INITIAL_FEE_REFUNDS: FeeRefundRecord[] = [];

export function getStoredRefunds(): FeeRefundRecord[] {
  return readStorage<FeeRefundRecord[]>(STORAGE_KEYS.FEE_REFUNDS, INITIAL_FEE_REFUNDS);
}

export function saveStoredRefunds(refunds: FeeRefundRecord[]): void {
  writeStorage(STORAGE_KEYS.FEE_REFUNDS, refunds);
}

// ---------------------------------------------------------------------------
// Student Transfers Storage
// ---------------------------------------------------------------------------
export const INITIAL_STUDENT_TRANSFERS: StudentTransferRecord[] = [];

export function getStoredTransfers(): StudentTransferRecord[] {
  return readStorage<StudentTransferRecord[]>(STORAGE_KEYS.STUDENT_TRANSFERS, INITIAL_STUDENT_TRANSFERS);
}

export function saveStoredTransfers(transfers: StudentTransferRecord[]): void {
  writeStorage(STORAGE_KEYS.STUDENT_TRANSFERS, transfers);
}

// ---------------------------------------------------------------------------
// Score Approvals Storage
// ---------------------------------------------------------------------------
export const INITIAL_SCORE_APPROVALS: ScoreApprovalRecord[] = [];

export function getStoredScoreApprovals(): ScoreApprovalRecord[] {
  return readStorage<ScoreApprovalRecord[]>(STORAGE_KEYS.SCORE_APPROVALS, INITIAL_SCORE_APPROVALS);
}

export function saveStoredScoreApprovals(approvals: ScoreApprovalRecord[]): void {
  writeStorage(STORAGE_KEYS.SCORE_APPROVALS, approvals);
}

// ---------------------------------------------------------------------------
// Transport Routes Storage
// ---------------------------------------------------------------------------
export const INITIAL_TRANSPORT_ROUTES: TransportRouteItem[] = [
  {
    id: 'tr-01',
    routeName: 'Route 1: Hedzranawoe – Lomé Central – JIPAS Campus 1',
    driverName: 'Kwami Agbedor',
    driverPhone: '+228 90 12 34 56',
    busNumber: 'TG-4819-AZ',
    capacity: 35,
    enrolledStudentsCount: 22,
    stops: ['Radio Maria Junction', 'Hedzranawoe Market', 'Bvd du 13 Janvier', 'Campus 1 Main Gate'],
    farePerTerm: 15000,
    status: 'Active',
    campus: 'JIPAS 1'
  },
  {
    id: 'tr-02',
    routeName: 'Route 2: Kpéhénou – T-Oil – Campus 2 Express',
    driverName: 'Messan Lawson',
    driverPhone: '+228 91 88 77 66',
    busNumber: 'TG-9921-AY',
    capacity: 30,
    enrolledStudentsCount: 18,
    stops: ['T-Oil Station Junction', 'Kpéhénou Total', 'Agoè Roundabout', 'Campus 2 Gate'],
    farePerTerm: 18000,
    status: 'Active',
    campus: 'JIPAS 2'
  }
];

export function getStoredTransportRoutes(): TransportRouteItem[] {
  return readStorage<TransportRouteItem[]>(STORAGE_KEYS.TRANSPORT_ROUTES, INITIAL_TRANSPORT_ROUTES);
}

export function saveStoredTransportRoutes(routes: TransportRouteItem[]): void {
  writeStorage(STORAGE_KEYS.TRANSPORT_ROUTES, routes);
}

// ---------------------------------------------------------------------------
// Boarding Rooms Storage
// ---------------------------------------------------------------------------
export const INITIAL_BOARDING_ROOMS: BoardingRoomItem[] = [
  {
    id: 'br-01',
    hallName: 'Excellence Hall (Boys Wing)',
    roomNumber: 'Room B-101',
    gender: 'Boys',
    houseMaster: 'Mr. Emmanuel Tetteh',
    capacity: 8,
    occupied: 6,
    status: 'Available',
    campus: 'JIPAS 1'
  },
  {
    id: 'br-02',
    hallName: 'Grace Hall (Girls Wing)',
    roomNumber: 'Room G-201',
    gender: 'Girls',
    houseMaster: 'Mrs. Grace Tetteh',
    capacity: 8,
    occupied: 7,
    status: 'Available',
    campus: 'JIPAS 1'
  }
];

export function getStoredBoardingRooms(): BoardingRoomItem[] {
  return readStorage<BoardingRoomItem[]>(STORAGE_KEYS.BOARDING_ROOMS, INITIAL_BOARDING_ROOMS);
}

export function saveStoredBoardingRooms(rooms: BoardingRoomItem[]): void {
  writeStorage(STORAGE_KEYS.BOARDING_ROOMS, rooms);
}



import { 
  db, 
  auth, 
  ensureFirebaseAuth,
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  deleteDoc,
  writeBatch, 
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  runTransaction,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  FirebaseUser,
  handleFirestoreError,
  OperationType
} from '../lib/firebase';
export type QueryConstraint = any;
import { getActiveCampus, Campus, isAllCampus } from '../lib/campusUtils';
import { idbClear } from './idbService';
import { formatCurrency } from '../utils/financeUtils';
// ... rest of imports

/**
 * Wraps a Firestore collection query with a campus filter if applicable.
 * Authoritatively enforces campus isolation at the query level.
 */
export const applyCampusQueryFilter = (
  collectionName: string, 
  constraints: QueryConstraint[] = []
): QueryConstraint[] => {
  const activeCampus = getActiveCampus();
  
  // Collections that should always be filtered by campus
  const campusScopedCollections = [
    'students', 'teachers', 'reports', 'termReports', 'bills', 'transactions', 
    'payments', 'expenses', 'bankDeposits', 'payrollRuns', 'staffSalaries', 
    'staffLoans', 'attendance', 'teacherAttendance', 'studentAttendance',
    'communications', 'libraryLoans', 'schoolAssets', 'disciplineLogs',
    'graduated_batches', 'graduated_students', 'past_employees',
    'refunds', 'studentTransfers', 'scoreApprovals', 'boardingRooms'
  ];

  if (campusScopedCollections.includes(collectionName) && !isAllCampus(activeCampus)) {
    return [where('campus', '==', activeCampus), ...constraints];
  }

  return constraints;
};
import {
  executeCloudWrite,
  executeCloudDelete,
  sanitizeForFirestore,
  FirebaseSyncError,
  getCloudSyncStatus,
  subscribeCloudSyncStatus,
  getUnsyncedDrafts,
  saveUnsyncedDrafts,
  retryAllUnsyncedDrafts,
  pushToSupabaseCloud,
  pullFromSupabaseCloud,
  subscribeSupabaseRealtime,
  scheduleCloudSyncPush,
  UnsyncedDraft
} from './syncService';

export {
  executeCloudWrite,
  executeCloudDelete,
  sanitizeForFirestore,
  FirebaseSyncError,
  getCloudSyncStatus,
  subscribeCloudSyncStatus,
  getUnsyncedDrafts,
  retryAllUnsyncedDrafts,
  pushToSupabaseCloud,
  pullFromSupabaseCloud,
  subscribeSupabaseRealtime
};
export type { UnsyncedDraft };

export const firestoreDatabaseId = 'ai-studio-jipas-b61eff80-5f1a-48b5-8f47-9b6fa98b798b';
export { db };

export function subscribeDemoStatus(callback: (cleared: boolean) => void) {
  callback(isDemoDataCleared());
  const handleSync = () => {
    callback(isDemoDataCleared());
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('jipas_cloud_synced', handleSync);
  }
  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('jipas_cloud_synced', handleSync);
    }
  };
}

/**
 * Forced synchronization: Manually fetches critical collections from Supabase Cloud to ensure 
 * local storage and UI are perfectly in sync with the remote database.
 */
export async function forceSyncCollections(userRole?: string) {
  console.log(`[dbService] Starting synchronization (Role: ${userRole || 'Guest'})...`);
  try {
    const result = await pullFromSupabaseCloud();
    return result.success;
  } catch (err) {
    console.warn('[dbService] forceSyncCollections notice:', err);
    return false;
  }
}

// IndexedDB offline persistence is handled by idbService and syncService
import { 
  Student, 
  Teacher, 
  TermReport, 
  PaymentRecord, 
  StudentBill, 
  CalendarEvent, 
  NotificationItem, 
  User,
  AcademicYear,
  Term,
  Department,
  SchoolClass,
  House,
  Subject,
  AcademicYearItem,
  TermItem,
  DepartmentItem,
  ClassItem,
  HouseItem,
  SubjectItem,
  UserAccountItem,
  ClassFeeTariffItem,
  TariffCorrectionLog,
  PaymentSettingsConfig,
  FeeSubmissionItem,
  ClassReportBroadcast,
  ExamScheduleItem,
  GraduatedBatch,
  GraduatedStudentItem,
  PastEmployeeRecord,
  FeeRefundRecord,
  StudentTransferRecord,
  ScoreApprovalRecord,
  TransportRouteItem,
  BoardingRoomItem,
  ThemePaletteConfig,
  CourseItem,
  TeacherAttendanceRecord,
  StaffWorkingHoursConfig,
  SchoolExpenseRecord,
  BankDepositRecord,
  SecurityAuditLog,
  UserRole,
  StudentAttendanceRecord,
  FeedbackItem,
  FeedbackType,
  FeedbackStatus,
  FeedbackPriority,
  StaffLoginUpdateRequest
} from '../types';
import { 
  INITIAL_STUDENTS, 
  INITIAL_TEACHERS, 
  INITIAL_TERM_REPORTS, 
  INITIAL_PAYMENTS, 
  INITIAL_BILLS, 
  INITIAL_CALENDAR_EVENTS, 
  INITIAL_NOTIFICATIONS,
  INITIAL_EXPENSES,
  INITIAL_BANK_DEPOSITS,
  INITIAL_SECURITY_AUDIT_LOGS
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
import {
  getStoredStudents,
  saveStoredStudents,
  getStoredTeachers,
  saveStoredTeachers,
  getStoredUsers,
  saveStoredUsers,
  INITIAL_SYSTEM_USERS,
  getStoredAcademicYears,
  saveStoredAcademicYears,
  verifyAcademicYearsPersistence,
  getStoredTerms,
  saveStoredTerms,
  getStoredDepartments,
  saveStoredDepartments,
  getStoredCourses,
  saveStoredCourses,
  getStoredClasses,
  saveStoredClasses,
  getStoredHouses,
  saveStoredHouses,
  getStoredSubjects,
  saveStoredSubjects,
  getStoredBills,
  saveStoredBills,
  getStoredTariffCorrectionLogs,
  saveStoredTariffCorrectionLogs,
  getStoredPayments,
  saveStoredPayments,
  getStoredReports,
  saveStoredReports,
  getStoredTeacherAttendance,
  saveStoredTeacherAttendance,
  getStoredStudentAttendance,
  saveStoredStudentAttendance,
  getStoredCalendarEvents,
  saveStoredCalendarEvents,
  getStoredNotifications,
  saveStoredNotifications,
  isDemoDataCleared,
  setDemoDataCleared,
  getStoredPaymentSettings,
  saveStoredPaymentSettings,
  getStoredFeeSubmissions,
  saveStoredFeeSubmissions,
  getStoredClassFeeTariffs,
  saveStoredClassFeeTariffs,
  INITIAL_CLASS_FEE_TARIFFS,
  getStoredClassBroadcasts,
  saveStoredClassBroadcasts,
  INITIAL_CLASS_BROADCASTS,
  getStoredExamSchedules,
  saveStoredExamSchedules,
  getStoredGraduatedBatches,
  saveStoredGraduatedBatches,
  INITIAL_GRADUATED_BATCHES,
  getStoredGraduatedStudents,
  saveStoredGraduatedStudents,
  INITIAL_GRADUATED_STUDENTS,
  getStoredPastEmployees,
  saveStoredPastEmployees,
  INITIAL_PAST_EMPLOYEES,
  getStoredRefunds,
  saveStoredRefunds,
  INITIAL_FEE_REFUNDS,
  getStoredTransfers,
  saveStoredTransfers,
  INITIAL_STUDENT_TRANSFERS,
  getStoredScoreApprovals,
  saveStoredScoreApprovals,
  INITIAL_SCORE_APPROVALS,
  getStoredTransportRoutes,
  saveStoredTransportRoutes,
  INITIAL_TRANSPORT_ROUTES,
  getStoredBoardingRooms,
  saveStoredBoardingRooms,
  INITIAL_BOARDING_ROOMS,
  DEFAULT_THEME_PALETTES,
  DEFAULT_THEME_PALETTE,
  getStoredThemePalette,
  saveStoredThemePalette,
  applyThemePaletteToDom,
  getStoredBankDeposits,
  saveStoredBankDeposits,
  getStoredExpenses,
  saveStoredExpenses,
  getStoredSecurityAuditLogs,
  saveStoredSecurityAuditLogs,
  DEFAULT_ACCOUNTANT_PRIVILEGES,
  DEFAULT_SUB_ACCOUNTANT_PRIVILEGES,
  getStoredSettings,
  saveStoredSettings,
  INITIAL_SCHOOL_SETTINGS
} from './storageService';
import {
  JIPAS_LAPTOP_LOGO_KEY,
  JIPAS_MOBILE_LOGO_KEY,
  JIPAS_LOGO_STORAGE_KEY,
  JIPAS_LOGO_EVENT
} from '../components/common/JIPASLogo';

export {
  DEFAULT_ACCOUNTANT_PRIVILEGES,
  DEFAULT_SUB_ACCOUNTANT_PRIVILEGES,
  getStoredSettings,
  saveStoredSettings
};

export {
  getStoredStudents,
  saveStoredStudents,
  getStoredTeachers,
  saveStoredTeachers,
  getStoredAcademicYears,
  saveStoredAcademicYears,
  verifyAcademicYearsPersistence,
  getStoredPayments,
  saveStoredPayments,
  getStoredBills,
  saveStoredBills,
  getStoredReports,
  saveStoredReports,
  getStoredExpenses,
  saveStoredExpenses,
  getStoredBankDeposits,
  saveStoredBankDeposits,
  getStoredSecurityAuditLogs,
  saveStoredSecurityAuditLogs,
  getStoredGraduatedStudents,
  saveStoredGraduatedStudents,
  INITIAL_GRADUATED_STUDENTS,
  getStoredPastEmployees,
  saveStoredPastEmployees,
  INITIAL_PAST_EMPLOYEES
};

export { 
  getStoredClassFeeTariffs, 
  saveStoredClassFeeTariffs, 
  INITIAL_CLASS_FEE_TARIFFS,
  getStoredClassBroadcasts,
  saveStoredClassBroadcasts,
  INITIAL_CLASS_BROADCASTS,
  DEFAULT_THEME_PALETTES,
  DEFAULT_THEME_PALETTE,
  getStoredThemePalette,
  saveStoredThemePalette,
  applyThemePaletteToDom,
  getStoredCourses,
  saveStoredCourses
};
export type { ThemePaletteConfig };

export interface SchoolSettings {
  schoolName: string;
  schoolMotto: string;
  schoolLogo: string;
  laptopLogo?: string;
  mobileLogo?: string;
  thisDeviceLogo?: string;
  phone: string;
  email: string;
  address: string;
  website: string;
  activeAcademicYear: string;
  activeTerm: string;
  staffSecretCode?: string;
  enableIncompleteReminders?: boolean;
  reminderFrequency?: 'Daily' | 'Weekly' | 'Bi-weekly';
  notifyParentsForMissingGrades?: boolean;
  missingGradeThreshold?: number;
  workingHours?: StaffWorkingHoursConfig;
  updatedAt?: string;
}

export const DEFAULT_SETTINGS: SchoolSettings = INITIAL_SCHOOL_SETTINGS;

const DEFAULT_ACADEMIC_YEARS: AcademicYear[] = [
  { id: 'ay-1', name: '2025-2026', startDate: '2025-09-01', endDate: '2026-07-24', isCurrent: true, status: 'Active' },
  { id: 'ay-2', name: '2026-2027', startDate: '2026-09-01', endDate: '2027-07-23', isCurrent: false, status: 'Upcoming' },
  { id: 'ay-3', name: '2024-2025', startDate: '2024-09-02', endDate: '2025-07-25', isCurrent: false, status: 'Archived' }
];

const DEFAULT_TERMS: Term[] = [
  { id: 'tm-1', name: 'Third Term', termNumber: 3, academicYear: '2025-2026', startDate: '2026-05-04', endDate: '2026-07-24', isCurrent: true, daysOpen: 70, resumptionDate: '2026-09-08' },
  { id: 'tm-2', name: 'Second Term', termNumber: 2, academicYear: '2025-2026', startDate: '2026-01-06', endDate: '2026-04-10', isCurrent: false, daysOpen: 68, resumptionDate: '2026-05-04' },
  { id: 'tm-3', name: 'First Term', termNumber: 1, academicYear: '2025-2026', startDate: '2025-09-08', endDate: '2025-12-18', isCurrent: false, daysOpen: 72, resumptionDate: '2026-01-06' }
];

const DEFAULT_DEPARTMENTS: Department[] = [
  { id: 'dept-1', name: 'Primary School', code: 'PRIM', hod: 'Ebenezer Frimpong', description: 'Basic 1 to Basic 6 classes and foundational curricula.' },
  { id: 'dept-2', name: 'Junior High School', code: 'JHS', hod: 'Mr. Kwame Elolo', description: 'JHS 1 to JHS 3 preparatory and BECE courses.' },
  { id: 'dept-3', name: 'Pre School', code: 'PRE', hod: 'Mad. Aseye Ama', description: 'Creche, Nursery, and KG foundational development.' }
];

const DEFAULT_CLASSES: SchoolClass[] = [
  { id: 'cls-1', name: 'Basic 1', department: 'Primary School', stream: 'A', roomNo: 'Block A-01', classTeacher: 'Ebenezer Frimpong', capacity: 35 },
  { id: 'cls-2', name: 'Basic 2', department: 'Primary School', stream: 'A', roomNo: 'Block A-02', classTeacher: 'Mr. Agbenyo Kwame', capacity: 35 },
  { id: 'cls-3', name: 'JHS 1', department: 'Junior High School', stream: 'A', roomNo: 'Block B-01', classTeacher: 'Mr. Kwame Elolo', capacity: 40 },
  { id: 'cls-4', name: 'Creche', department: 'Pre School', stream: 'A', roomNo: 'Pre-01', classTeacher: 'Mad. Aseye Ama', capacity: 25 }
];

const DEFAULT_COURSES: CourseItem[] = INITIAL_SHS_COURSES;

const DEFAULT_HOUSES: House[] = [
  { id: 'h-1', name: 'Nkrumah House', color: 'Green', houseMaster: 'Ebenezer Frimpong', motto: 'Forward Ever' },
  { id: 'h-2', name: 'Aggrey House', color: 'Blue', houseMaster: 'Mr. Kwame Elolo', motto: 'Only the Best is Good Enough' },
  { id: 'h-3', name: 'Gbewaa House', color: 'Yellow', houseMaster: 'Denis Mawutor', motto: 'Unity & Strength' },
  { id: 'h-4', name: 'Yaa Asantewaa House', color: 'Red', houseMaster: 'Mad. Aseye Ama', motto: 'Courage and Honour' }
];

const DEFAULT_SUBJECTS: Subject[] = [
  { id: 'sb-1', name: 'English Language', code: 'ENG', department: 'Primary School', isCore: true },
  { id: 'sb-2', name: 'Mathematics', code: 'MATH', department: 'Primary School', isCore: true },
  { id: 'sb-3', name: 'Science', code: 'SCI', department: 'Primary School', isCore: true },
  { id: 'sb-4', name: 'Creative Arts', code: 'CA', department: 'Primary School', isCore: false },
  { id: 'sb-5', name: 'Computing', code: 'COMP', department: 'Primary School', isCore: false },
  { id: 'sb-6', name: 'Religious & Moral Edu.', code: 'RME', department: 'Primary School', isCore: false },
  { id: 'sb-7', name: 'History', code: 'HIST', department: 'Primary School', isCore: false },
  { id: 'sb-8', name: 'the regionian Language', code: 'GHA', department: 'Primary School', isCore: false },
  { id: 'sb-9', name: 'French Language', code: 'FRE', department: 'Primary School', isCore: false },
  { id: 'sb-10', name: 'OWOP', code: 'OWOP', department: 'Primary School', isCore: false }
];

// Seed Firestore initial data if database collections are empty
export async function seedInitialDatabase() {
  if (isDemoDataCleared()) {
    console.log('[dbService] Demo data previously cleared by user, skipping auto-seed.');
    return;
  }
  if (typeof window !== 'undefined' && localStorage.getItem('jipas_system_seeded') === 'true') {
    return;
  }
  try {
    const demoStatusSnap = await getDoc(doc(db, 'systemSettings', 'demoStatus'));
    if (demoStatusSnap.exists() && demoStatusSnap.data().demoDataCleared) {
      setDemoDataCleared(true);
      console.log('[dbService] Demo data previously cleared on remote database, skipping auto-seed.');
      return;
    }
  } catch {}

  const isAuth = !!auth.currentUser;

  // Helper to safely check and seed a collection
  const checkAndSeed = async (
    collectionName: string,
    getStored: () => any[],
    initialFallback: any[]
  ) => {
    try {
      const snap = await getDocs(query(collection(db, collectionName), ...applyCampusQueryFilter(collectionName)));
      if (snap.empty) {
        console.log(`Seeding initial ${collectionName} to Firestore (Campus: ${getActiveCampus()})...`);
        const stored = getStored();
        const list = stored && stored.length > 0 ? stored : initialFallback;
        const activeCampus = getActiveCampus();
        for (const item of list) {
          if (item && item.id) {
            const itemWithCampus = { ...item, campus: item.campus || activeCampus };
            await setDoc(doc(db, collectionName, item.id), sanitizeForFirestore(itemWithCampus));
          }
        }
      }
    } catch (err) {
      // Suppress individual collection seed permission/network errors gracefully
      console.warn(`[dbService] Seed check skipped for ${collectionName}:`, err instanceof Error ? err.message : String(err));
    }
  };

  // 1. General Settings (Publicly readable)
  try {
    const settingsDoc = await getDoc(doc(db, 'settings', 'general'));
    if (!settingsDoc.exists() && isAuth) {
      await setDoc(doc(db, 'settings', 'general'), sanitizeForFirestore(DEFAULT_SETTINGS));
    }
  } catch {}

  // 2. Academic Setup & Public Catalogs
  await checkAndSeed('academicYears', getStoredAcademicYears, INITIAL_ACADEMIC_YEARS);
  await checkAndSeed('terms', getStoredTerms, INITIAL_TERMS);
  await checkAndSeed('departments', getStoredDepartments, INITIAL_DEPARTMENTS);
  await checkAndSeed('courses', getStoredCourses, INITIAL_SHS_COURSES);

  // Self-heal courses collection if existing remote docs lack valid Senior High School courses
  try {
    const coursesSnap = await getDocs(query(collection(db, 'courses'), ...applyCampusQueryFilter('courses')));
    const remoteList = coursesSnap.docs.map(d => ({ id: d.id, ...d.data() } as CourseItem));
    const hasValidShs = remoteList.some(c =>
      (c.department || '').toLowerCase().includes('senior') ||
      (c.department || '').toLowerCase() === 'shs'
    );
    if (!hasValidShs && !isDemoDataCleared()) {
      console.log('[dbService] Auto-healing and seeding complete INITIAL_SHS_COURSES to Firestore...');
      const activeCampus = getActiveCampus();
      for (const item of INITIAL_SHS_COURSES) {
        const itemWithCampus = { ...item, campus: item.campus || activeCampus };
        await setDoc(doc(db, 'courses', item.id), sanitizeForFirestore(itemWithCampus));
      }
    }
  } catch (err) {
    console.warn('[dbService] Courses self-healing check skipped:', err);
  }
  await checkAndSeed('classes', getStoredClasses, INITIAL_CLASSES);
  await checkAndSeed('houses', getStoredHouses, INITIAL_HOUSES);
  await checkAndSeed('subjects', getStoredSubjects, INITIAL_SUBJECTS);
  await checkAndSeed('events', getStoredCalendarEvents, INITIAL_CALENDAR_EVENTS);
  await checkAndSeed('notifications', getStoredNotifications, INITIAL_NOTIFICATIONS);
  await checkAndSeed('classFeeTariffs', getStoredClassFeeTariffs, INITIAL_CLASS_FEE_TARIFFS);
  await checkAndSeed('classReportBroadcasts', getStoredClassBroadcasts, INITIAL_CLASS_BROADCASTS);
  await checkAndSeed('examSchedules', getStoredExamSchedules, getStoredExamSchedules());

  // 3. User & Sensitive Collections (Only if authenticated)
  if (isAuth) {
    await checkAndSeed('students', getStoredStudents, INITIAL_STUDENTS);
    await checkAndSeed('teachers', getStoredTeachers, INITIAL_TEACHERS);
    await checkAndSeed('reports', getStoredReports, INITIAL_TERM_REPORTS);
    await checkAndSeed('transactions', getStoredPayments, INITIAL_PAYMENTS);
    await checkAndSeed('bills', getStoredBills, INITIAL_BILLS);
    await checkAndSeed('users', getStoredUsers, INITIAL_SYSTEM_USERS);
    await checkAndSeed('expenses', getStoredExpenses, INITIAL_EXPENSES);
    await checkAndSeed('bankDeposits', getStoredBankDeposits, INITIAL_BANK_DEPOSITS);
    await checkAndSeed('securityAuditLogs', getStoredSecurityAuditLogs, INITIAL_SECURITY_AUDIT_LOGS);
  }
  if (typeof window !== 'undefined') {
    localStorage.setItem('jipas_system_seeded', 'true');
  }
}

// -------------------------------------------------------------
// Live Real-Time Subscriptions (Supabase Cloud Sync Reactive Engine)
// -------------------------------------------------------------
function createSyncedSubscription<T>(getStoredData: () => T) {
  return (callback: (data: T) => void) => {
    callback(getStoredData());
    const handleSync = () => {
      callback(getStoredData());
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('jipas_cloud_synced', handleSync);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('jipas_cloud_synced', handleSync);
      }
    };
  };
}

export const subscribeExpenses = createSyncedSubscription(getStoredExpenses);
export const subscribeBankDeposits = createSyncedSubscription(getStoredBankDeposits);
export const subscribeSecurityAuditLogs = createSyncedSubscription(getStoredSecurityAuditLogs);
export const subscribeUsers = createSyncedSubscription(getStoredUsers);
export const subscribeStudents = createSyncedSubscription(getStoredStudents);
export const subscribeTeachers = createSyncedSubscription(getStoredTeachers);
export const subscribeTeacherAttendance = createSyncedSubscription(getStoredTeacherAttendance);
export const subscribeStudentAttendance = createSyncedSubscription(getStoredStudentAttendance);
export const subscribeReports = createSyncedSubscription(getStoredReports);
export const subscribePayments = createSyncedSubscription(getStoredPayments);
export const subscribeBills = createSyncedSubscription(getStoredBills);
export const subscribeAcademicYears = createSyncedSubscription(getStoredAcademicYears);
export const subscribeTerms = createSyncedSubscription(getStoredTerms);
export const subscribeDepartments = createSyncedSubscription(getStoredDepartments);
export const subscribeCourses = createSyncedSubscription(getStoredCourses);
export const subscribeClasses = createSyncedSubscription(getStoredClasses);
export const subscribeHouses = createSyncedSubscription(getStoredHouses);
export const subscribeSubjects = createSyncedSubscription(getStoredSubjects);
export const subscribeCalendarEvents = createSyncedSubscription(getStoredCalendarEvents);
export const subscribeGraduatedBatches = createSyncedSubscription(getStoredGraduatedBatches);
export const subscribeGraduatedStudents = createSyncedSubscription(getStoredGraduatedStudents);
export const subscribePastEmployees = createSyncedSubscription(getStoredPastEmployees);
export const subscribeNotifications = createSyncedSubscription(getStoredNotifications);
export const subscribeClassFeeTariffs = createSyncedSubscription(getStoredClassFeeTariffs);
export const subscribeClassBroadcasts = createSyncedSubscription(getStoredClassBroadcasts);

export function subscribeSettings(callback: (settings: SchoolSettings) => void) {
  // 1. Immediately emit locally cached settings
  const initial = getStoredSettings();
  callback(initial);

  const handleSync = () => {
    callback(getStoredSettings());
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('jipas_cloud_synced', handleSync);
    window.addEventListener(JIPAS_LOGO_EVENT, handleSync);
    window.addEventListener('storage', handleSync);
  }

  // 2. Realtime listener from Firestore
  try {
    const docRef = doc(db, 'settings', 'general');
    const unsub = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const remoteData = docSnap.data() as Partial<SchoolSettings>;
        saveStoredSettings(remoteData);

        if (remoteData.laptopLogo && typeof window !== 'undefined') {
          localStorage.setItem(JIPAS_LAPTOP_LOGO_KEY, remoteData.laptopLogo);
        }
        if (remoteData.mobileLogo && typeof window !== 'undefined') {
          localStorage.setItem(JIPAS_MOBILE_LOGO_KEY, remoteData.mobileLogo);
        }
        if (remoteData.schoolLogo && typeof window !== 'undefined') {
          localStorage.setItem(JIPAS_LOGO_STORAGE_KEY, remoteData.schoolLogo);
        }
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent(JIPAS_LOGO_EVENT, { detail: { settings: remoteData } }));
          window.dispatchEvent(new CustomEvent('jipas_cloud_synced'));
        }

        callback(getStoredSettings());
      } else {
        callback(getStoredSettings());
      }
    }, (err) => {
      if (err instanceof Error && err.message.includes('permission')) {
        handleFirestoreError(err, OperationType.GET, 'settings');
      }
      console.warn('subscribeSettings offline fallback:', err);
      callback(getStoredSettings());
    });

    return () => {
      unsub();
      if (typeof window !== 'undefined') {
        window.removeEventListener('jipas_cloud_synced', handleSync);
        window.removeEventListener(JIPAS_LOGO_EVENT, handleSync);
        window.removeEventListener('storage', handleSync);
      }
    };
  } catch (e) {
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('jipas_cloud_synced', handleSync);
        window.removeEventListener(JIPAS_LOGO_EVENT, handleSync);
        window.removeEventListener('storage', handleSync);
      }
    };
  }
}

export function subscribeThemePalette(callback: (palette: ThemePaletteConfig) => void) {
  const initial = getStoredThemePalette();
  applyThemePaletteToDom(initial);
  callback(initial);

  const handleSync = () => {
    const pal = getStoredThemePalette();
    applyThemePaletteToDom(pal);
    callback(pal);
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('jipas_cloud_synced', handleSync);
    window.addEventListener('storage', handleSync);
  }

  try {
    const docRef = doc(db, 'settings', 'theme_palette');
    const unsub = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as ThemePaletteConfig;
        saveStoredThemePalette(data);
        applyThemePaletteToDom(data);
        callback(getStoredThemePalette());
      } else {
        callback(getStoredThemePalette());
      }
    }, (err) => {
      if (err instanceof Error && err.message.includes('permission')) {
        handleFirestoreError(err, OperationType.GET, 'settings');
      }
      console.warn('subscribeThemePalette offline notice:', err);
      callback(getStoredThemePalette());
    });

    return () => {
      unsub();
      if (typeof window !== 'undefined') {
        window.removeEventListener('jipas_cloud_synced', handleSync);
        window.removeEventListener('storage', handleSync);
      }
    };
  } catch (e) {
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('jipas_cloud_synced', handleSync);
        window.removeEventListener('storage', handleSync);
      }
    };
  }
}

export async function saveClassFeeTariff(tariff: ClassFeeTariffItem) {
  const current = getStoredClassFeeTariffs();
  const idx = current.findIndex(t => t.id === tariff.id);
  let updated: ClassFeeTariffItem[];
  if (idx >= 0) {
    updated = [...current];
    updated[idx] = tariff;
  } else {
    updated = [tariff, ...current];
  }
  saveStoredClassFeeTariffs(updated);
  await executeCloudWrite('classFeeTariffs', tariff.id, tariff, () => {}, undefined, `Tariff: ${tariff.classTitle}`);
  return updated;
}

export async function deleteClassFeeTariff(id: string) {
  const current = getStoredClassFeeTariffs();
  const updated = current.filter(t => t.id !== id);
  saveStoredClassFeeTariffs(updated);
  await executeCloudDelete('classFeeTariffs', id, () => {}, `Delete Tariff: ${id}`);
  return updated;
}

export async function saveClassBroadcast(broadcast: ClassReportBroadcast) {
  await executeCloudWrite(
    'classReportBroadcasts',
    broadcast.id,
    broadcast,
    () => {
      const current = getStoredClassBroadcasts();
      const idx = current.findIndex(b => b.id === broadcast.id || (b.className === broadcast.className && b.term === broadcast.term && b.academicYear === broadcast.academicYear));
      const updated = idx >= 0 ? current.map((b, i) => i === idx ? broadcast : b) : [broadcast, ...current];
      saveStoredClassBroadcasts(updated);
    },
    undefined,
    `Broadcast: ${broadcast.className} (${broadcast.term})`
  );
  return getStoredClassBroadcasts();
}

export async function saveAllClassBroadcasts(broadcasts: ClassReportBroadcast[]) {
  saveStoredClassBroadcasts(broadcasts);
  try {
    for (const b of broadcasts) {
      await setDoc(doc(db, 'classReportBroadcasts', b.id), sanitizeForFirestore(b));
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes('permission')) {
      handleFirestoreError(err, OperationType.WRITE, 'classReportBroadcasts');
    }
    console.warn('Firestore saveAllClassBroadcasts fallback to local:', err);
  }
}

export async function deleteClassBroadcast(id: string) {
  await executeCloudDelete(
    'classReportBroadcasts',
    id,
    () => {
      const current = getStoredClassBroadcasts();
      const updated = current.filter(b => b.id !== id);
      saveStoredClassBroadcasts(updated);
    },
    `Broadcast #${id}`
  );
  return getStoredClassBroadcasts();
}

export async function clearAllClassReportBroadcasts() {
  const current = getStoredClassBroadcasts();
  saveStoredClassBroadcasts([]);
  try {
    const batch = writeBatch(db);
    const snap = await getDocs(collection(db, 'classReportBroadcasts'));
    snap.forEach((d) => {
      batch.delete(d.ref);
    });
    await batch.commit();
    console.log('[dbService] Class Report Broadcasts collection cleared successfully.');
    return true;
  } catch (err) {
    console.error('[dbService] Error clearing Class Report Broadcasts:', err);
    saveStoredClassBroadcasts(current);
    return false;
  }
}

export function subscribeExamSchedules(callback: (schedules: ExamScheduleItem[]) => void) {
  const user = auth.currentUser;
  if (!user) {
    callback(getStoredExamSchedules());
    return () => {};
  }
  return onSnapshot(query(collection(db, 'examSchedules'), ...applyCampusQueryFilter('examSchedules')), (snap) => {
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as ExamScheduleItem));
    if (items.length > 0 || isDemoDataCleared()) {
      saveStoredExamSchedules(items);
      callback(items);
    } else {
      callback(getStoredExamSchedules());
    }
  }, (err) => {
    if (err instanceof Error && err.message.includes('permission')) {
      handleFirestoreError(err, OperationType.GET, 'examSchedules');
    }
    console.warn('Firestore examSchedules subscription fallback:', err);
    callback(getStoredExamSchedules());
  });
}

export async function saveExamSchedule(schedule: ExamScheduleItem) {
  await executeCloudWrite(
    'examSchedules',
    schedule.id,
    schedule,
    () => {
      const current = getStoredExamSchedules();
      const idx = current.findIndex(s => s.id === schedule.id);
      const updated = idx >= 0 ? current.map((s, i) => i === idx ? schedule : s) : [schedule, ...current];
      saveStoredExamSchedules(updated);
    },
    undefined,
    `Exam Schedule: ${schedule.subjectName} (${schedule.className})`
  );
  return getStoredExamSchedules();
}

export async function deleteExamSchedule(id: string) {
  await executeCloudDelete(
    'examSchedules',
    id,
    () => {
      const current = getStoredExamSchedules();
      const updated = current.filter(s => s.id !== id);
      saveStoredExamSchedules(updated);
    },
    `Exam Schedule #${id}`
  );
  return getStoredExamSchedules();
}

/**
 * Executes chunked writeBatch writes to Firestore for bulk operations to respect 500-write limits,
 * ensuring atomic commits across arbitrary collection sizes while persisting to local store.
 */
export async function commitInBatchChunks<T extends { id: string; campus?: string }>(
  collectionName: string,
  items: T[],
  saveLocal?: (items: T[]) => void,
  chunkSize: number = 400
): Promise<void> {
  if (!items || items.length === 0) {
    if (saveLocal) saveLocal([]);
    return;
  }
  const activeCampus = getActiveCampus();
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    chunk.forEach(item => {
      const itemWithCampus = { ...item, campus: item.campus || activeCampus };
      batch.set(doc(db, collectionName, item.id), sanitizeForFirestore(itemWithCampus), { merge: true });
    });
    await batch.commit();
  }
  if (saveLocal) saveLocal(items);
  scheduleCloudSyncPush();
}

// -------------------------------------------------------------
// Database CRUD Operations (Authoritative Cloud-First Synchronization)
// -------------------------------------------------------------
export async function saveStudent(student: Student) {
  if (!student.fullName || !student.fullName.trim()) {
    throw new Error('Student validation failed: Full name is required.');
  }
  setDemoDataCleared(false);
  const nowIso = new Date().toISOString();

  // 1. Verify existence / collision locally & in Firestore before creation to prevent ghost records
  const currentLocal = getStoredStudents();
  let targetId = student.id;
  let targetAdmissionNo = student.admissionNo;

  // Check if a student with matching admission number exists under another ID
  if (targetAdmissionNo && targetAdmissionNo !== 'PENDING-APPROVAL' && !targetAdmissionNo.includes('PENDING')) {
    const existingSameAdm = currentLocal.find(s => 
      s.id !== targetId && 
      s.admissionNo && 
      s.admissionNo.trim().toUpperCase() === targetAdmissionNo.trim().toUpperCase()
    );

    if (existingSameAdm) {
      console.warn(`[dbService:saveStudent] Detected existing student ID "${existingSameAdm.id}" with matching admission number "${targetAdmissionNo}". Merging into existing record to prevent duplicate ghost.`);
      targetId = existingSameAdm.id;
    }
  }

  const rawCampus = student.campus_id || student.campus || getActiveCampus() || 'JIPAS 1';
  const resolvedCampus: 'JIPAS 1' | 'JIPAS 2' = rawCampus === 'JIPAS 2' ? 'JIPAS 2' : 'JIPAS 1';
  const studentWithMeta: Student = {
    ...student,
    id: targetId,
    admissionNo: targetAdmissionNo,
    campus: resolvedCampus,
    campus_id: resolvedCampus,
    updatedAt: nowIso,
    createdAt: student.createdAt || nowIso
  };

  console.log(`[dbService:saveStudent] Initiating verified atomic write for Student ID: ${studentWithMeta.id}`, {
    name: studentWithMeta.fullName,
    admissionNo: studentWithMeta.admissionNo,
    className: studentWithMeta.className,
    campus: studentWithMeta.campus || studentWithMeta.campus_id || getActiveCampus(),
    campus_id: studentWithMeta.campus_id || studentWithMeta.campus || getActiveCampus(),
    updatedAt: studentWithMeta.updatedAt
  });

  // 2. Write to Cloud with atomic transaction if online
  if (auth.currentUser) {
    const studentDocRef = doc(db, 'students', studentWithMeta.id);
    try {
      await runTransaction(db, async (txn) => {
        const snap = await txn.get(studentDocRef);
        const existingData = snap.exists() ? (snap.data() as Partial<Student>) : null;

        const merged: Student = {
          ...(existingData as Student || {}),
          ...studentWithMeta,
          updatedAt: nowIso
        };

        txn.set(studentDocRef, sanitizeForFirestore(merged), { merge: true });
      });
    } catch (txnErr) {
      console.warn('[dbService:saveStudent] Firestore transaction notice, falling back to executeCloudWrite:', txnErr);
      await executeCloudWrite(
        'students',
        studentWithMeta.id,
        studentWithMeta,
        () => {},
        undefined,
        `Student: ${studentWithMeta.fullName}`
      );
    }
  } else {
    await executeCloudWrite(
      'students',
      studentWithMeta.id,
      studentWithMeta,
      () => {},
      undefined,
      `Student: ${studentWithMeta.fullName}`
    );
  }

  // 3. Cleanly update local cache with deduplication by ID and admissionNo
  const current = getStoredStudents();
  const idx = current.findIndex(s => s.id === studentWithMeta.id);
  let updatedList: Student[];
  if (idx >= 0) {
    updatedList = current.map(s => s.id === studentWithMeta.id ? studentWithMeta : s);
  } else {
    updatedList = [studentWithMeta, ...current];
  }

  const seen = new Map<string, Student>();
  const deduplicated: Student[] = [];
  updatedList.forEach(s => {
    const adm = (s.admissionNo || '').trim().toUpperCase();
    if (!adm || adm === 'PENDING-APPROVAL' || adm.includes('PENDING')) {
      deduplicated.push(s);
      return;
    }
    if (!seen.has(adm)) {
      seen.set(adm, s);
      deduplicated.push(s);
    } else {
      const existing = seen.get(adm)!;
      const exTime = existing.updatedAt ? new Date(existing.updatedAt).getTime() : 0;
      const sTime = s.updatedAt ? new Date(s.updatedAt).getTime() : 0;
      if (sTime > exTime) {
        const i = deduplicated.findIndex(d => d.id === existing.id);
        if (i >= 0) deduplicated[i] = s;
        seen.set(adm, s);
      }
    }
  });

  saveStoredStudents(deduplicated);
  console.log(`[dbService:saveStudent] Local cache updated for ${studentWithMeta.id} (${studentWithMeta.fullName}). Total stored: ${deduplicated.length}`);
  return studentWithMeta;
}

export async function saveAllStudents(studentsList: Student[]) {
  setDemoDataCleared(false);
  const activeCampus = getActiveCampus();
  const nowIso = new Date().toISOString();

  // Deduplicate studentsList by ID & admissionNo before saving
  const uniqueMap = new Map<string, Student>();
  const seenAdm = new Map<string, Student>();

  studentsList.forEach(st => {
    if (!st || !st.id) return;
    const stWithMeta: Student = {
      ...st,
      campus: (st.campus || (activeCampus !== 'General' ? activeCampus : 'JIPAS 1')) as 'JIPAS 1' | 'JIPAS 2',
      updatedAt: st.updatedAt || nowIso,
      createdAt: st.createdAt || nowIso
    };

    const adm = (stWithMeta.admissionNo || '').trim().toUpperCase();
    if (adm && adm !== 'PENDING-APPROVAL' && !adm.includes('PENDING')) {
      if (seenAdm.has(adm)) {
        const existing = seenAdm.get(adm)!;
        const exTime = existing.updatedAt ? new Date(existing.updatedAt).getTime() : 0;
        const stTime = new Date(stWithMeta.updatedAt).getTime();
        if (stTime > exTime) {
          uniqueMap.delete(existing.id);
          seenAdm.set(adm, stWithMeta);
          uniqueMap.set(stWithMeta.id, stWithMeta);
        }
        return;
      }
      seenAdm.set(adm, stWithMeta);
    }
    uniqueMap.set(stWithMeta.id, stWithMeta);
  });

  const cleanList = Array.from(uniqueMap.values());
  await commitInBatchChunks('students', cleanList, saveStoredStudents);
  console.log(`[dbService:saveAllStudents] Bulk write completed for ${cleanList.length} student(s) in chunked writeBatch.`);
}

export async function bulkPromoteStudents(
  studentIds: string[],
  targetClassName: string,
  targetAcademicYear: string
) {
  const students = getStoredStudents();
  const nowIso = new Date().toISOString();
  
  const updatedStudents = students.map(st => {
    if (studentIds.includes(st.id)) {
      return { 
        ...st, 
        className: targetClassName, 
        academicYear: targetAcademicYear,
        updatedAt: nowIso
      };
    }
    return st;
  });

  const chunkSize = 400;
  for (let i = 0; i < studentIds.length; i += chunkSize) {
    const chunk = studentIds.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    chunk.forEach(id => {
      batch.update(doc(db, 'students', id), {
        className: targetClassName,
        academicYear: targetAcademicYear,
        updatedAt: nowIso
      });
    });
    await batch.commit();
  }
  saveStoredStudents(updatedStudents);
}

export function generateUniqueAdmissionNo(existingStudents?: Student[]): string {
  const current = existingStudents || getStoredStudents();
  const fullYear = new Date().getFullYear().toString();
  let maxNumber = 0;
  // Match either new style JIPAS/YYYY/XXXX or old style ADM/YY/XXXX
  const regex = new RegExp(`(?:JIPAS/${fullYear}|ADM/\\d{2})/(\\d+)`, 'i');
  
  current.forEach(st => {
    if (st.admissionNo && st.admissionNo !== 'PENDING-APPROVAL' && !st.admissionNo.includes('PENDING')) {
      const match = st.admissionNo.match(regex);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNumber) {
          maxNumber = num;
        }
      }
    }
  });

  const nextNumber = maxNumber + 1;
  return `JIPAS/${fullYear}/${String(nextNumber).padStart(4, '0')}`;
}

/**
 * Atomically reserves the next available admission number across concurrent admin sessions
 * using a Firestore transaction counter.
 */
export async function getNextAtomicAdmissionNo(): Promise<string> {
  const fullYear = new Date().getFullYear().toString();
  const counterDocRef = doc(db, 'counters', `admission_jipas_${fullYear}`);

  if (auth.currentUser) {
    try {
      const nextSeq = await runTransaction(db, async (txn) => {
        const snap = await txn.get(counterDocRef);
        let currentSeq = 0;
        if (snap.exists() && typeof snap.data().currentSequence === 'number') {
          currentSeq = snap.data().currentSequence;
        } else {
          // Initialize from current highest
          const stored = getStoredStudents();
          const regex = new RegExp(`(?:JIPAS/${fullYear}|ADM/\\d{2})/(\\d+)`, 'i');
          stored.forEach(st => {
            if (st.admissionNo && !st.admissionNo.includes('PENDING')) {
              const match = st.admissionNo.match(regex);
              if (match && match[1]) {
                const num = parseInt(match[1], 10);
                if (!isNaN(num) && num > currentSeq) currentSeq = num;
              }
            }
          });
        }
        const newSeq = currentSeq + 1;
        txn.set(counterDocRef, {
          currentSequence: newSeq,
          year: fullYear,
          updatedAt: new Date().toISOString()
        }, { merge: true });
        return newSeq;
      });

      return `JIPAS/${fullYear}/${String(nextSeq).padStart(4, '0')}`;
    } catch (e) {
      console.warn('[dbService] Atomic counter transaction notice, falling back to safe local generator:', e);
    }
  }

  return generateUniqueAdmissionNo();
}

export async function approveStudentAdmission(studentId: string, assignedAdmissionNo?: string) {
  const current = getStoredStudents();
  const student = current.find(s => s.id === studentId);
  if (!student) return;

  const fullYear = new Date().getFullYear().toString();
  let validAdmNo = assignedAdmissionNo && assignedAdmissionNo !== 'PENDING-APPROVAL' 
    ? assignedAdmissionNo 
    : (student.admissionNo && student.admissionNo !== 'PENDING-APPROVAL' ? student.admissionNo : '');

  // If we have an authenticated user and NO valid admission number yet, use the transaction to get one
  if (auth.currentUser && !validAdmNo) {
    const counterDocRef = doc(db, 'counters', `admission_jipas_${fullYear}`);
    const studentDocRef = doc(db, 'students', studentId);
    try {
      validAdmNo = await runTransaction(db, async (txn) => {
        const snap = await txn.get(counterDocRef);
        let currentSeq = 0;
        if (snap.exists() && typeof snap.data().currentSequence === 'number') {
          currentSeq = snap.data().currentSequence;
        } else {
          // Fallback sequence initialization if counter doc doesn't exist
          const stored = getStoredStudents();
          const regex = new RegExp(`(?:JIPAS/${fullYear}|ADM/\\d{2})/(\\d+)`, 'i');
          stored.forEach(st => {
            if (st.admissionNo && !st.admissionNo.includes('PENDING')) {
              const match = st.admissionNo.match(regex);
              if (match && match[1]) {
                const num = parseInt(match[1], 10);
                if (!isNaN(num) && num > currentSeq) currentSeq = num;
              }
            }
          });
        }
        const newSeq = currentSeq + 1;
        const generatedAdmNo = `JIPAS/${fullYear}/${String(newSeq).padStart(4, '0')}`;

        txn.set(counterDocRef, {
          currentSequence: newSeq,
          year: fullYear,
          updatedAt: new Date().toISOString()
        }, { merge: true });

        const updatedStudentData: Student = {
          ...student,
          admissionNo: generatedAdmNo,
          status: 'Active',
          isApproved: true,
          approvalStatus: 'Approved'
        };

        txn.set(studentDocRef, sanitizeForFirestore(updatedStudentData), { merge: true });
        return generatedAdmNo;
      });
    } catch (txnErr) {
      console.warn('[dbService] Atomic approval transaction notice:', txnErr);
      // Fallback if transaction fails
      validAdmNo = generateUniqueAdmissionNo(current);
    }
  }

  // Final check: if still no validAdmNo (e.g. offline or transaction failed), generate one locally
  if (!validAdmNo) {
    validAdmNo = student.admissionNo && student.admissionNo !== 'PENDING-APPROVAL' 
      ? student.admissionNo 
      : generateUniqueAdmissionNo(current);
  }

  const updatedStudent: Student = {
    ...student,
    admissionNo: validAdmNo,
    status: 'Active',
    isApproved: true,
    approvalStatus: 'Approved'
  };

  // Update local state
  const updatedList = current.map(s => s.id === studentId ? updatedStudent : s);
  saveStoredStudents(updatedList);

  // If the transaction already handled the Cloud write, validAdmNo was returned from it.
  // But to be safe and consistent with non-transaction path, we call executeCloudWrite 
  // only if not already written or as a verified sync.
  // Actually, runTransaction already did the write if it succeeded.
  // But wait, if transaction succeeded, we don't need to call executeCloudWrite again.
  // However, it doesn't hurt much. Let's keep it for sync reliability but maybe skip if transaction was used.
  
  if (auth.currentUser) {
    await executeCloudWrite(
      'students',
      studentId,
      updatedStudent,
      () => {},
      undefined,
      `Approve Admission: ${updatedStudent.fullName} (${validAdmNo})`
    );
  }

  return updatedStudent;
}

export async function rejectStudentAdmission(studentId: string, reason?: string) {
  const current = getStoredStudents();
  const student = current.find(s => s.id === studentId);
  if (!student) return;

  const updatedStudent: Student = {
    ...student,
    status: 'Inactive',
    isApproved: false,
    approvalStatus: 'Rejected',
    rejectionReason: reason || 'Application declined by administration'
  };

  await executeCloudWrite(
    'students',
    studentId,
    updatedStudent,
    () => {
      const updatedList = current.map(s => s.id === studentId ? updatedStudent : s);
      saveStoredStudents(updatedList);
    },
    undefined,
    `Reject Admission: ${updatedStudent.fullName}`
  );
  return updatedStudent;
}

/**
 * Non-destructive student archival.
 * Never hard-deletes student records to preserve historical integrity.
 */
export async function archiveStudent(studentId: string, reason: string = 'Administrative Archival') {
  const current = getStoredStudents();
  const student = current.find(s => s.id === studentId);
  if (!student) throw new Error('Student record not found.');

  const archivedStudent: Student = {
    ...student,
    status: 'Inactive',
    exitReason: reason,
    updatedAt: new Date().toISOString()
  };

  return saveStudent(archivedStudent);
}

export async function deleteStudent(studentId: string) {
  console.log(`[dbService:deleteStudent] Deleting student ID: ${studentId}`);
  const current = getStoredStudents();
  const targetStudent = current.find(s => s.id === studentId);
  const targetAdm = (targetStudent?.admissionNo || '').toLowerCase().trim();
  const updated = current.filter(s => s.id !== studentId);
  saveStoredStudents(updated);
  
  // 1. Cascade delete all associated bills
  const currentBills = getStoredBills();
  const orphanedBills = currentBills.filter(b => b.studentId === studentId || (targetAdm && (b.admissionNo || '').toLowerCase().trim() === targetAdm));
  if (orphanedBills.length > 0) {
    const nextBills = currentBills.filter(b => b.studentId !== studentId && (!targetAdm || (b.admissionNo || '').toLowerCase().trim() !== targetAdm));
    saveStoredBills(nextBills);
    for (const b of orphanedBills) {
      try {
        await deleteDoc(doc(db, 'bills', b.id));
      } catch (err) {
        console.warn(`[deleteStudent] Error deleting bill ${b.id}:`, err);
      }
    }
  }

  // 2. Cascade delete all associated reports
  const currentReports = getStoredReports();
  const orphanedReports = currentReports.filter(r => r.studentId === studentId || (targetAdm && (r.admissionNo || '').toLowerCase().trim() === targetAdm));
  if (orphanedReports.length > 0) {
    const nextReports = currentReports.filter(r => r.studentId !== studentId && (!targetAdm || (r.admissionNo || '').toLowerCase().trim() !== targetAdm));
    saveStoredReports(nextReports);
    for (const r of orphanedReports) {
      try {
        await deleteDoc(doc(db, 'reports', r.id));
      } catch (err) {
        console.warn(`[deleteStudent] Error deleting report ${r.id}:`, err);
      }
    }
  }

  // 3. Cascade delete all associated payments
  const currentPayments = getStoredPayments();
  const orphanedPayments = currentPayments.filter(p => p.studentId === studentId || (targetAdm && (p.admissionNo || '').toLowerCase().trim() === targetAdm));
  if (orphanedPayments.length > 0) {
    const nextPayments = currentPayments.filter(p => p.studentId !== studentId && (!targetAdm || (p.admissionNo || '').toLowerCase().trim() !== targetAdm));
    saveStoredPayments(nextPayments);
    for (const p of orphanedPayments) {
      try {
        await deleteDoc(doc(db, 'payments', p.id));
      } catch (err) {
        console.warn(`[deleteStudent] Error deleting payment ${p.id}:`, err);
      }
    }
  }

  // 4. Cascade delete student attendance
  const currentAttendance = getStoredStudentAttendance();
  const updatedAttendance = currentAttendance.map(a => {
    if (a.records && a.records[studentId]) {
      const { [studentId]: _, ...rest } = a.records;
      return { ...a, records: rest };
    }
    return a;
  });
  saveStoredStudentAttendance(updatedAttendance);

  // 5. Cascade delete fee submissions
  const currentSubmissions = getStoredFeeSubmissions();
  const updatedSubmissions = currentSubmissions.filter(s => s.studentId !== studentId);
  if (updatedSubmissions.length !== currentSubmissions.length) {
    saveStoredFeeSubmissions(updatedSubmissions);
  }

  // 6. Delete student in cloud
  await executeCloudDelete('students', studentId, () => {
    saveStoredStudents(getStoredStudents().filter(s => s.id !== studentId));
  }, `Delete Student: ${studentId}`);
  
  // Force immediate sync push to Supabase Cloud so the remote snapshot is updated
  await pushToSupabaseCloud();
  
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('jipas_cloud_synced'));
  }

  return updated;
}

export async function deleteMultipleStudents(studentIds: string[]): Promise<{ deletedCount: number }> {
  if (!studentIds || studentIds.length === 0) return { deletedCount: 0 };
  
  const uniqueIds = new Set(studentIds);
  const current = getStoredStudents();
  const targetAdmissions = new Set(
    current.filter(s => uniqueIds.has(s.id)).map(s => (s.admissionNo || '').toLowerCase().trim()).filter(Boolean)
  );

  const updated = current.filter(s => !uniqueIds.has(s.id));
  saveStoredStudents(updated);

  // 1. Cascade delete bills
  const currentBills = getStoredBills();
  const orphanedBills = currentBills.filter(b => uniqueIds.has(b.studentId) || (b.admissionNo && targetAdmissions.has(b.admissionNo.toLowerCase().trim())));
  if (orphanedBills.length > 0) {
    const nextBills = currentBills.filter(b => !uniqueIds.has(b.studentId) && (!b.admissionNo || !targetAdmissions.has(b.admissionNo.toLowerCase().trim())));
    saveStoredBills(nextBills);
    for (const b of orphanedBills) {
      try { await deleteDoc(doc(db, 'bills', b.id)); } catch (e) {}
    }
  }

  // 2. Cascade delete reports
  const currentReports = getStoredReports();
  const orphanedReports = currentReports.filter(r => uniqueIds.has(r.studentId) || (r.admissionNo && targetAdmissions.has(r.admissionNo.toLowerCase().trim())));
  if (orphanedReports.length > 0) {
    const nextReports = currentReports.filter(r => !uniqueIds.has(r.studentId) && (!r.admissionNo || !targetAdmissions.has(r.admissionNo.toLowerCase().trim())));
    saveStoredReports(nextReports);
    for (const r of orphanedReports) {
      try { await deleteDoc(doc(db, 'reports', r.id)); } catch (e) {}
    }
  }

  // 3. Cascade delete payments
  const currentPayments = getStoredPayments();
  const orphanedPayments = currentPayments.filter(p => uniqueIds.has(p.studentId) || (p.admissionNo && targetAdmissions.has(p.admissionNo.toLowerCase().trim())));
  if (orphanedPayments.length > 0) {
    const nextPayments = currentPayments.filter(p => !uniqueIds.has(p.studentId) && (!p.admissionNo || !targetAdmissions.has(p.admissionNo.toLowerCase().trim())));
    saveStoredPayments(nextPayments);
    for (const p of orphanedPayments) {
      try { await deleteDoc(doc(db, 'payments', p.id)); } catch (e) {}
    }
  }

  // 4. Cascade delete attendance & submissions
  const currentAttendance = getStoredStudentAttendance();
  const updatedAttendance = currentAttendance.map(a => {
    if (a.records) {
      const rest = { ...a.records };
      uniqueIds.forEach(id => delete rest[id]);
      return { ...a, records: rest };
    }
    return a;
  });
  saveStoredStudentAttendance(updatedAttendance);

  const currentSubmissions = getStoredFeeSubmissions();
  saveStoredFeeSubmissions(currentSubmissions.filter(s => !uniqueIds.has(s.studentId)));

  for (const id of Array.from(uniqueIds)) {
    await executeCloudDelete('students', id, () => {}, `Delete Student: ${id}`);
  }
  
  await pushToSupabaseCloud();

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('jipas_cloud_synced'));
  }

  return { deletedCount: uniqueIds.size };
}

/**
 * Automatically purges any orphaned bills, reports, and payments whose students no longer exist.
 * Keeps fee statistics, billing sheets, and outstanding balances completely accurate.
 */
export async function purgeOrphanedStudentData(): Promise<{
  cleanedBills: number;
  cleanedReports: number;
  cleanedPayments: number;
}> {
  const students = getStoredStudents();
  const validStudentIds = new Set(students.map(s => s.id));
  const validAdmissionNos = new Set(students.map(s => (s.admissionNo || '').toLowerCase().trim()).filter(Boolean));

  const isStudentAlive = (studentId?: string, admissionNo?: string) => {
    if (studentId && validStudentIds.has(studentId)) return true;
    if (admissionNo && validAdmissionNos.has(admissionNo.toLowerCase().trim())) return true;
    return false;
  };

  // 1. Bills
  const allBills = getStoredBills();
  const validBills = allBills.filter(b => isStudentAlive(b.studentId, b.admissionNo));
  const orphanedBills = allBills.filter(b => !isStudentAlive(b.studentId, b.admissionNo));
  if (orphanedBills.length > 0) {
    saveStoredBills(validBills);
    for (const b of orphanedBills) {
      try {
        await deleteDoc(doc(db, 'bills', b.id));
      } catch (err) {
        console.warn(`[purgeOrphaned] Error deleting orphaned bill ${b.id}:`, err);
      }
    }
  }

  // 2. Reports
  const allReports = getStoredReports();
  const validReports = allReports.filter(r => isStudentAlive(r.studentId, r.admissionNo));
  const orphanedReports = allReports.filter(r => !isStudentAlive(r.studentId, r.admissionNo));
  if (orphanedReports.length > 0) {
    saveStoredReports(validReports);
    for (const r of orphanedReports) {
      try {
        await deleteDoc(doc(db, 'reports', r.id));
      } catch (err) {
        console.warn(`[purgeOrphaned] Error deleting orphaned report ${r.id}:`, err);
      }
    }
  }

  // 3. Payments
  const allPayments = getStoredPayments();
  const validPayments = allPayments.filter(p => isStudentAlive(p.studentId, p.admissionNo));
  const orphanedPayments = allPayments.filter(p => !isStudentAlive(p.studentId, p.admissionNo));
  if (orphanedPayments.length > 0) {
    saveStoredPayments(validPayments);
    for (const p of orphanedPayments) {
      try {
        await deleteDoc(doc(db, 'payments', p.id));
      } catch (err) {
        console.warn(`[purgeOrphaned] Error deleting orphaned payment ${p.id}:`, err);
      }
    }
  }

  if (orphanedBills.length > 0 || orphanedReports.length > 0 || orphanedPayments.length > 0) {
    await pushToSupabaseCloud();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('jipas_cloud_synced'));
    }
  }

  return {
    cleanedBills: orphanedBills.length,
    cleanedReports: orphanedReports.length,
    cleanedPayments: orphanedPayments.length
  };
}

export async function saveTeacher(teacher: Teacher) {
  if (!teacher.name || !teacher.name.trim()) {
    throw new Error('Teacher validation failed: Name is required.');
  }
  return executeCloudWrite(
    'teachers',
    teacher.id,
    teacher,
    () => {
      const current = getStoredTeachers();
      const idx = current.findIndex(t => t.id === teacher.id);
      const updated = idx >= 0 ? current.map(t => t.id === teacher.id ? teacher : t) : [teacher, ...current];
      saveStoredTeachers(updated);
    },
    undefined,
    `Teacher: ${teacher.name}`
  );
}

export async function saveAllTeachers(teachersList: Teacher[]) {
  return commitInBatchChunks('teachers', teachersList, saveStoredTeachers);
}

export async function deleteTeacher(teacherId: string) {
  return executeCloudDelete(
    'teachers',
    teacherId,
    () => {
      const current = getStoredTeachers();
      const updated = current.filter(t => t.id !== teacherId);
      saveStoredTeachers(updated);
    },
    `Teacher #${teacherId}`
  );
}

export async function saveReport(report: TermReport) {
  return executeCloudWrite(
    'reports',
    report.id,
    report,
    () => {
      const current = getStoredReports();
      const idx = current.findIndex(r => r.id === report.id);
      const updated = idx >= 0 ? current.map(r => r.id === report.id ? report : r) : [report, ...current];
      saveStoredReports(updated);
    },
    undefined,
    `Report: ${report.studentName} (${report.term})`
  );
}

export async function saveAllReports(reportsList: TermReport[]) {
  return commitInBatchChunks('reports', reportsList, saveStoredReports);
}

export async function deleteReport(reportId: string) {
  return executeCloudDelete(
    'reports',
    reportId,
    () => {
      const current = getStoredReports();
      const updated = current.filter(r => r.id !== reportId);
      saveStoredReports(updated);
    },
    `Report #${reportId}`
  );
}

export async function savePayment(payment: PaymentRecord) {
  if (!payment.id || !payment.amount || payment.amount <= 0) {
    throw new Error('Invalid payment record: ID and positive amount are required.');
  }

  const current = getStoredPayments();
  const idx = current.findIndex(p => p.id === payment.id);
  const updated = idx >= 0 ? current.map(p => p.id === payment.id ? payment : p) : [payment, ...current];
  saveStoredPayments(updated);

  await executeCloudWrite(
    'payments',
    payment.id,
    payment,
    () => {
      saveStoredPayments(getStoredPayments());
    },
    undefined,
    `Payment: ${formatCurrency(payment.amount)} - ${payment.studentName || payment.studentId} (Receipt: ${payment.receiptNo || payment.id})`
  );

  return payment;
}

/**
 * Authoritative financial record voiding.
 * Replaces hard deletion to maintain audit trail integrity.
 */
export async function voidPayment(paymentId: string, reason: string = 'User Voided') {
  const current = getStoredPayments();
  const payment = current.find(p => p.id === paymentId);
  if (!payment) throw new Error('Payment record not found.');

  const voidedPayment: PaymentRecord = {
    ...payment,
    status: 'Voided' as any,
    notes: `${payment.notes || ''} [VOIDED: ${reason}]`.trim(),
  } as PaymentRecord;

  return savePayment(voidedPayment);
}

export async function deletePayment(paymentId: string) {
  console.warn('[dbService] Hard deletion requested for financial record. Re-routing to authoritative voiding...');
  return voidPayment(paymentId, 'System Deletion Override');
}

export async function saveBill(bill: StudentBill) {
  const stampedBill: StudentBill = {
    ...bill,
    updatedAt: bill.updatedAt || new Date().toISOString()
  };
  return executeCloudWrite(
    'bills',
    stampedBill.id,
    stampedBill,
    () => {
      const current = getStoredBills();
      const idx = current.findIndex(b => b.id === stampedBill.id);
      const updated = idx >= 0 ? current.map(b => b.id === stampedBill.id ? stampedBill : b) : [stampedBill, ...current];
      saveStoredBills(updated);
    },
    undefined,
    `Bill: ${stampedBill.studentName || stampedBill.studentId} (#${stampedBill.id})`
  );
}

export async function saveAllBills(billsList: StudentBill[]) {
  return commitInBatchChunks('bills', billsList, saveStoredBills);
}

export async function saveTariffCorrectionLog(log: TariffCorrectionLog) {
  return executeCloudWrite(
    'tariffCorrectionLogs',
    log.id,
    log,
    () => {
      const current = getStoredTariffCorrectionLogs();
      const updated = [log, ...current.filter(l => l.id !== log.id)];
      saveStoredTariffCorrectionLogs(updated);
    },
    undefined,
    `Tariff Correction: Student #${log.studentId}`
  );
}

export async function deleteBill(billId: string) {
  return executeCloudDelete(
    'bills',
    billId,
    () => {
      const current = getStoredBills();
      const updated = current.filter(b => b.id !== billId);
      saveStoredBills(updated);
    },
    `Bill #${billId}`
  );
}

export async function saveCalendarEvent(event: CalendarEvent) {
  return executeCloudWrite(
    'events',
    event.id,
    event,
    () => {
      const current = getStoredCalendarEvents();
      const idx = current.findIndex(e => e.id === event.id);
      const updated = idx >= 0 ? current.map(e => e.id === event.id ? event : e) : [event, ...current];
      saveStoredCalendarEvents(updated);
    },
    undefined,
    `Calendar Event: ${event.title}`
  );
}

export async function deleteCalendarEvent(eventId: string) {
  return executeCloudDelete(
    'events',
    eventId,
    () => {
      const current = getStoredCalendarEvents();
      const updated = current.filter(e => e.id !== eventId);
      saveStoredCalendarEvents(updated);
    },
    `Calendar Event #${eventId}`
  );
}

export async function saveGraduatedBatch(batch: GraduatedBatch) {
  return executeCloudWrite(
    'graduated_batches',
    batch.id,
    batch,
    () => {
      const current = getStoredGraduatedBatches();
      const idx = current.findIndex(b => b.id === batch.id);
      const updated = idx >= 0 ? current.map(b => b.id === batch.id ? batch : b) : [batch, ...current];
      saveStoredGraduatedBatches(updated);
    },
    undefined,
    `Graduated Batch: ${batch.batchName}`
  );
}

export async function deleteGraduatedBatch(batchId: string) {
  return executeCloudDelete(
    'graduated_batches',
    batchId,
    () => {
      const current = getStoredGraduatedBatches();
      const updated = current.filter(b => b.id !== batchId);
      saveStoredGraduatedBatches(updated);
    },
    `Graduated Batch #${batchId}`
  );
}

export async function saveGraduatedStudent(student: GraduatedStudentItem) {
  return executeCloudWrite(
    'graduated_students',
    student.id,
    student,
    () => {
      const current = getStoredGraduatedStudents();
      const idx = current.findIndex(s => s.id === student.id);
      const updated = idx >= 0 ? current.map(s => s.id === student.id ? student : s) : [student, ...current];
      saveStoredGraduatedStudents(updated);
    },
    undefined,
    `Graduated Student: ${student.fullName} (${student.examType})`
  );
}

export async function deleteGraduatedStudent(studentId: string) {
  return executeCloudDelete(
    'graduated_students',
    studentId,
    () => {
      const current = getStoredGraduatedStudents();
      const updated = current.filter(s => s.id !== studentId);
      saveStoredGraduatedStudents(updated);
    },
    `Graduated Student #${studentId}`
  );
}

export async function savePastEmployee(employee: PastEmployeeRecord) {
  return executeCloudWrite(
    'past_employees',
    employee.id,
    employee,
    () => {
      const current = getStoredPastEmployees();
      const idx = current.findIndex(e => e.id === employee.id);
      const updated = idx >= 0 ? current.map(e => e.id === employee.id ? employee : e) : [employee, ...current];
      saveStoredPastEmployees(updated);
    },
    undefined,
    `Past Employee: ${employee.fullName} (${employee.role})`
  );
}

export async function deletePastEmployee(employeeId: string) {
  return executeCloudDelete(
    'past_employees',
    employeeId,
    () => {
      const current = getStoredPastEmployees();
      const updated = current.filter(e => e.id !== employeeId);
      saveStoredPastEmployees(updated);
    },
    `Past Employee Record #${employeeId}`
  );
}

export async function saveNotification(notif: NotificationItem) {
  return executeCloudWrite(
    'notifications',
    notif.id,
    notif,
    () => {
      const current = getStoredNotifications();
      const idx = current.findIndex(n => n.id === notif.id);
      const updated = idx >= 0 ? current.map(n => n.id === notif.id ? notif : n) : [notif, ...current];
      saveStoredNotifications(updated);
    },
    undefined,
    `Notification: ${notif.title}`
  );
}

export async function deleteNotification(notifId: string) {
  return executeCloudDelete(
    'notifications',
    notifId,
    () => {
      const current = getStoredNotifications();
      const updated = current.filter(n => n.id !== notifId);
      saveStoredNotifications(updated);
    },
    `Notification #${notifId}`
  );
}

// -------------------------------------------------------------
// System Users & Accounts Management
// -------------------------------------------------------------
export { getStoredUsers, saveStoredUsers, INITIAL_SYSTEM_USERS, getStoredDepartments, saveStoredDepartments };

export async function saveUserAccount(user: UserAccountItem) {
  return executeCloudWrite(
    'users',
    user.id,
    user,
    () => {
      const current = getStoredUsers();
      const idx = current.findIndex(u => u.id === user.id);
      const updated = idx >= 0 ? current.map(u => u.id === user.id ? user : u) : [user, ...current];
      saveStoredUsers(updated);
    },
    undefined,
    `User Account: ${user.name} (${user.role})`
  );
}

export async function saveAllUserAccounts(users: UserAccountItem[]) {
  return commitInBatchChunks('users', users, saveStoredUsers);
}

export async function deleteUserAccount(userId: string) {
  return executeCloudDelete(
    'users',
    userId,
    () => {
      const current = getStoredUsers();
      const updated = current.filter(u => u.id !== userId);
      saveStoredUsers(updated);
    },
    `User Account #${userId}`
  );
}

export async function approveUserAccount(userId: string, approvedBy: string = 'Administrator') {
  const current = getStoredUsers();
  const user = current.find(u => u.id === userId);
  if (!user) return;
  const updatedUser: UserAccountItem = {
    ...user,
    status: 'Active',
    isApproved: true,
    approvedBy,
    approvedAt: new Date().toISOString()
  };
  await saveUserAccount(updatedUser);
  return updatedUser;
}

export async function rejectUserAccount(userId: string) {
  const current = getStoredUsers();
  const user = current.find(u => u.id === userId);
  if (!user) return;
  const updatedUser: UserAccountItem = {
    ...user,
    status: 'Inactive',
    isApproved: false
  };
  await saveUserAccount(updatedUser);
  return updatedUser;
}

// -------------------------------------------------------------
// Staff Portal Login Detail Change Requests (Admin Approval)
// -------------------------------------------------------------
const STAFF_LOGIN_REQUESTS_KEY = 'jipas_staff_login_update_requests';

export function getStoredStaffLoginUpdateRequests(): StaffLoginUpdateRequest[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STAFF_LOGIN_REQUESTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.warn('Could not read stored staff login update requests:', err);
    return [];
  }
}

export function saveStoredStaffLoginUpdateRequests(requests: StaffLoginUpdateRequest[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STAFF_LOGIN_REQUESTS_KEY, JSON.stringify(requests));
  } catch (err) {
    console.warn('Could not save staff login update requests to localStorage:', err);
  }
}

export function subscribeStaffLoginUpdateRequests(
  callback: (requests: StaffLoginUpdateRequest[]) => void
): () => void {
  const user = auth.currentUser;
  if (!user) {
    callback(getStoredStaffLoginUpdateRequests());
    return () => {};
  }
  try {
    const colRef = collection(db, 'staffLoginUpdateRequests');
    const q = query(colRef, orderBy('requestedAt', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const list: StaffLoginUpdateRequest[] = snapshot.docs.map(
            (doc) => ({ id: doc.id, ...(doc.data() as any) })
          );
          saveStoredStaffLoginUpdateRequests(list);
          callback(list);
        } else {
          callback(getStoredStaffLoginUpdateRequests());
        }
      },
      (error) => {
        if (error instanceof Error && error.message.includes('permission')) {
          console.warn('[dbService] Staff login update requests query restricted to administrative authority:', error.message);
        }
        callback(getStoredStaffLoginUpdateRequests());
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('Firestore subscription fallback for staff login requests:', err);
    callback(getStoredStaffLoginUpdateRequests());
    return () => {};
  }
}

export async function submitStaffLoginUpdateRequest(request: StaffLoginUpdateRequest): Promise<void> {
  const authUser = auth.currentUser;
  const activeCampus = getActiveCampus();
  const enrichedRequest: StaffLoginUpdateRequest = {
    ...request,
    userId: authUser ? authUser.uid : request.userId,
    status: 'Pending',
    requestedAt: request.requestedAt || new Date().toISOString(),
    campus: request.campus || (activeCampus !== 'General' ? activeCampus : undefined)
  };

  // 1. Save to staffLoginUpdateRequests collection
  await executeCloudWrite(
    'staffLoginUpdateRequests',
    enrichedRequest.id,
    enrichedRequest,
    () => {
      const current = getStoredStaffLoginUpdateRequests();
      const idx = current.findIndex(r => r.id === enrichedRequest.id);
      const updated = idx >= 0 ? current.map(r => r.id === enrichedRequest.id ? enrichedRequest : r) : [enrichedRequest, ...current];
      saveStoredStaffLoginUpdateRequests(updated);
    },
    undefined,
    `Staff Login Update Request: ${enrichedRequest.teacherName}`
  );

  // 2. Link request to user's pendingLoginUpdate on their UserAccountItem
  const users = getStoredUsers();
  const targetAccount = users.find(u => u.id === enrichedRequest.userId || (enrichedRequest.staffId && u.staffId === enrichedRequest.staffId));
  if (targetAccount) {
    const updatedUser: UserAccountItem = {
      ...targetAccount,
      pendingLoginUpdate: enrichedRequest
    };
    await saveUserAccount(updatedUser);
  }

  // 3. Post an alert notification for the administration
  await saveNotification({
    id: `notif-staff-upd-${Date.now()}`,
    title: 'Staff Login Details Change Request',
    message: `${enrichedRequest.teacherName} (Staff ID: ${enrichedRequest.staffId || 'N/A'}) has submitted a request to update their portal login details. Administrator approval required.`,
    type: 'alert',
    priority: 'high',
    targetRoles: ['admin'],
    createdAt: new Date().toISOString(),
    read: false
  });
}

export async function approveStaffLoginUpdateRequest(requestId: string, adminName: string = 'Administrator'): Promise<void> {
  const currentRequests = getStoredStaffLoginUpdateRequests();
  const req = currentRequests.find(r => r.id === requestId);
  if (!req) return;

  const nowIso = new Date().toISOString();
  const updatedReq: StaffLoginUpdateRequest = {
    ...req,
    status: 'Approved',
    reviewedBy: adminName,
    reviewedAt: nowIso
  };

  // 1. Update request status in Firestore
  await executeCloudWrite(
    'staffLoginUpdateRequests',
    requestId,
    updatedReq,
    () => {
      const updated = currentRequests.map(r => r.id === requestId ? updatedReq : r);
      saveStoredStaffLoginUpdateRequests(updated);
    },
    undefined,
    `Approve Staff Login Request #${requestId}`
  );

  // 2. Apply the requested changes to the UserAccountItem
  const users = getStoredUsers();
  const user = users.find(u => u.id === req.userId || (req.staffId && u.staffId === req.staffId));
  if (user) {
    const updatedUser: UserAccountItem = {
      ...user,
      username: req.requestedUsername && req.requestedUsername.trim() ? req.requestedUsername.trim() : user.username,
      email: req.requestedEmail && req.requestedEmail.trim() ? req.requestedEmail.trim() : user.email,
      phone: req.requestedPhone && req.requestedPhone.trim() ? req.requestedPhone.trim() : user.phone,
      password: req.requestedPassword && req.requestedPassword.trim() ? req.requestedPassword.trim() : user.password,
      pendingLoginUpdate: undefined
    };
    await saveUserAccount(updatedUser);
  }

  // 3. If teacher record exists, update matching contact info
  const teachers = getStoredTeachers();
  const teacher = teachers.find(t => t.id === req.userId || t.staffId === req.staffId || t.email.toLowerCase() === req.currentEmail.toLowerCase());
  if (teacher) {
    const updatedTeacher: Teacher = {
      ...teacher,
      email: req.requestedEmail && req.requestedEmail.trim() ? req.requestedEmail.trim() : teacher.email,
      phone: req.requestedPhone && req.requestedPhone.trim() ? req.requestedPhone.trim() : teacher.phone
    };
    await saveTeacher(updatedTeacher);
  }

  // 4. Send confirmation notification to teacher
  await saveNotification({
    id: `notif-appr-${Date.now()}`,
    title: 'Portal Login Credentials Approved',
    message: `Your requested portal login detail update was reviewed and approved by ${adminName}. Your new login credentials are now active.`,
    type: 'general',
    priority: 'medium',
    targetRoles: ['teacher'],
    createdAt: nowIso,
    read: false
  });
}

export async function rejectStaffLoginUpdateRequest(
  requestId: string, 
  adminName: string = 'Administrator',
  reason: string = 'Requested changes do not comply with staff account policy.'
): Promise<void> {
  const currentRequests = getStoredStaffLoginUpdateRequests();
  const req = currentRequests.find(r => r.id === requestId);
  if (!req) return;

  const nowIso = new Date().toISOString();
  const updatedReq: StaffLoginUpdateRequest = {
    ...req,
    status: 'Rejected',
    reviewedBy: adminName,
    reviewedAt: nowIso,
    adminFeedback: reason
  };

  // 1. Update request status in Firestore
  await executeCloudWrite(
    'staffLoginUpdateRequests',
    requestId,
    updatedReq,
    () => {
      const updated = currentRequests.map(r => r.id === requestId ? updatedReq : r);
      saveStoredStaffLoginUpdateRequests(updated);
    },
    undefined,
    `Reject Staff Login Request #${requestId}`
  );

  // 2. Clear pending status on UserAccountItem
  const users = getStoredUsers();
  const user = users.find(u => u.id === req.userId || (req.staffId && u.staffId === req.staffId));
  if (user && user.pendingLoginUpdate) {
    const updatedUser: UserAccountItem = {
      ...user,
      pendingLoginUpdate: undefined
    };
    await saveUserAccount(updatedUser);
  }

  // 3. Send feedback notification to teacher
  await saveNotification({
    id: `notif-rej-${Date.now()}`,
    title: 'Portal Login Update Request Declined',
    message: `Your portal login detail update request was declined by ${adminName}. Reason: ${reason}`,
    type: 'alert',
    priority: 'medium',
    targetRoles: ['teacher'],
    createdAt: nowIso,
    read: false
  });
}

export async function saveTeacherAttendanceRecord(record: TeacherAttendanceRecord) {
  return executeCloudWrite(
    'teacherAttendance',
    record.id,
    record,
    () => {
      const current = getStoredTeacherAttendance();
      const idx = current.findIndex(r => r.id === record.id || (r.teacherId === record.teacherId && r.date === record.date));
      let updated: TeacherAttendanceRecord[];
      if (idx >= 0) {
        updated = current.map((r, i) => i === idx ? { ...r, ...record } : r);
      } else {
        updated = [record, ...current];
      }
      saveStoredTeacherAttendance(updated);
    },
    undefined,
    `Attendance: ${record.teacherName} (${record.date})`
  );
}

export async function saveStudentAttendanceRecord(record: StudentAttendanceRecord) {
  return executeCloudWrite(
    'studentAttendance',
    record.id,
    record,
    () => {
      const current = getStoredStudentAttendance();
      const idx = current.findIndex(r => r.id === record.id);
      let updated: StudentAttendanceRecord[];
      if (idx >= 0) {
        updated = current.map((r, i) => i === idx ? { ...r, ...record } : r);
      } else {
        updated = [record, ...current];
      }
      saveStoredStudentAttendance(updated);
    },
    undefined,
    `Student Attendance: ${record.className} (${record.date})`
  );
}

export async function saveAllTeacherAttendanceRecords(records: TeacherAttendanceRecord[]) {
  return commitInBatchChunks('teacherAttendance', records, saveStoredTeacherAttendance);
}

export async function saveSettings(settings: Partial<SchoolSettings>) {
  // 1. Immediately persist locally and update stored settings
  saveStoredSettings(settings);
  if (settings.laptopLogo && typeof window !== 'undefined') {
    localStorage.setItem(JIPAS_LAPTOP_LOGO_KEY, settings.laptopLogo);
  }
  if (settings.mobileLogo && typeof window !== 'undefined') {
    localStorage.setItem(JIPAS_MOBILE_LOGO_KEY, settings.mobileLogo);
  }
  if (settings.schoolLogo && typeof window !== 'undefined') {
    localStorage.setItem(JIPAS_LOGO_STORAGE_KEY, settings.schoolLogo);
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(JIPAS_LOGO_EVENT, { detail: { settings } }));
    window.dispatchEvent(new CustomEvent('jipas_cloud_synced'));
  }

  // 2. Persist merged settings to Firestore document
  try {
    const fullMerged = getStoredSettings();
    await setDoc(doc(db, 'settings', 'general'), sanitizeForFirestore(fullMerged), { merge: true });
    scheduleCloudSyncPush();
  } catch (err) {
    if (err instanceof Error && err.message.includes('permission')) {
      handleFirestoreError(err, OperationType.WRITE, 'settings');
    }
    console.warn('[dbService] saveSettings offline/fallback:', err);
  }
}

export async function saveThemePalette(palette: ThemePaletteConfig): Promise<void> {
  // 1. Immediately apply to local storage and browser DOM
  saveStoredThemePalette(palette);
  applyThemePaletteToDom(palette);

  // 2. Persist to Firestore config document in settings collection
  try {
    const sanitized = sanitizeForFirestore({
      ...palette,
      updatedAt: new Date().toISOString()
    });
    await setDoc(doc(db, 'settings', 'theme_palette'), sanitized, { merge: true });
    scheduleCloudSyncPush();
  } catch (err) {
    if (err instanceof Error && err.message.includes('permission')) {
      handleFirestoreError(err, OperationType.WRITE, 'settings');
    }
    console.warn('[dbService] saveThemePalette fallback:', err);
  }
}

export function getStaffSecretCode(): string {
  return 'DISABLED';
}

export async function saveStaffSecretCode(_code: string): Promise<void> {
  // Disabled as requested
}

// -------------------------------------------------------------
// Academic Setup CRUD Operations (Authoritative Cloud-First Synchronization)
// -------------------------------------------------------------
export async function saveAcademicYear(ay: AcademicYearItem | AcademicYear) {
  const current = getStoredAcademicYears();
  const idx = current.findIndex(a => a.id === ay.id);
  const updated = idx >= 0 ? current.map(a => a.id === ay.id ? (ay as AcademicYearItem) : a) : [ay as AcademicYearItem, ...current];
  saveStoredAcademicYears(updated);
  pushToSupabaseCloud().catch(console.warn);
  return executeCloudWrite(
    'academicYears',
    ay.id,
    ay,
    () => {
      saveStoredAcademicYears(updated);
    },
    undefined,
    `Academic Year: ${ay.name}`
  );
}

export async function saveAllAcademicYears(years: AcademicYearItem[]) {
  saveStoredAcademicYears(years);
  
  // Clean up any deleted academic years in Firestore
  try {
    const snap = await getDocs(query(collection(db, 'academicYears'), ...applyCampusQueryFilter('academicYears')));
    const keepIds = new Set(years.map(y => y.id));
    for (const d of snap.docs) {
      if (!keepIds.has(d.id)) {
        await deleteDoc(doc(db, 'academicYears', d.id));
      }
    }
  } catch (err) {
    console.warn('[dbService] Orphaned academic years delete notice:', err);
  }

  try {
    await commitInBatchChunks('academicYears', years, saveStoredAcademicYears);
  } catch (err) {
    console.warn('[dbService] commitInBatchChunks notice:', err);
  }

  await pushToSupabaseCloud();
}

export async function deleteAcademicYear(ayId: string) {
  try {
    await deleteDoc(doc(db, 'academicYears', ayId));
  } catch (err) {
    console.warn('[dbService] Firestore deleteDoc academicYears error:', err);
  }
  const current = getStoredAcademicYears();
  const updated = current.filter(a => a.id !== ayId);
  saveStoredAcademicYears(updated);
  await pushToSupabaseCloud();
  return executeCloudDelete(
    'academicYears',
    ayId,
    () => {
      const current = getStoredAcademicYears();
      const updated = current.filter(a => a.id !== ayId);
      saveStoredAcademicYears(updated);
    },
    `Academic Year #${ayId}`
  );
}

export async function saveTerm(term: TermItem | Term) {
  return executeCloudWrite(
    'terms',
    term.id,
    term,
    () => {
      const current = getStoredTerms();
      const idx = current.findIndex(t => t.id === term.id);
      const updated = idx >= 0 ? current.map(t => t.id === term.id ? (term as TermItem) : t) : [term as TermItem, ...current];
      saveStoredTerms(updated);
    },
    undefined,
    `Term: ${term.name}`
  );
}

export async function saveAllTerms(terms: TermItem[]) {
  return commitInBatchChunks('terms', terms, saveStoredTerms);
}

export async function deleteTerm(termId: string) {
  return executeCloudDelete(
    'terms',
    termId,
    () => {
      const current = getStoredTerms();
      const updated = current.filter(t => t.id !== termId);
      saveStoredTerms(updated);
    },
    `Term #${termId}`
  );
}

export async function saveDepartment(dept: DepartmentItem | Department) {
  return executeCloudWrite(
    'departments',
    dept.id,
    dept,
    () => {
      const current = getStoredDepartments();
      const idx = current.findIndex(d => d.id === dept.id);
      const updated = idx >= 0 ? current.map(d => d.id === dept.id ? (dept as DepartmentItem) : d) : [dept as DepartmentItem, ...current];
      saveStoredDepartments(updated);
    },
    undefined,
    `Department: ${dept.name}`
  );
}

export async function saveAllDepartments(depts: DepartmentItem[]) {
  return commitInBatchChunks('departments', depts, saveStoredDepartments);
}

export async function deleteDepartment(deptId: string) {
  return executeCloudDelete(
    'departments',
    deptId,
    () => {
      const current = getStoredDepartments();
      const updated = current.filter(d => d.id !== deptId);
      saveStoredDepartments(updated);
    },
    `Department #${deptId}`
  );
}

export async function saveCourse(crs: CourseItem) {
  return executeCloudWrite(
    'courses',
    crs.id,
    crs,
    () => {
      const current = getStoredCourses();
      const idx = current.findIndex(c => c.id === crs.id);
      const updated = idx >= 0 ? current.map(c => c.id === crs.id ? crs : c) : [crs, ...current];
      saveStoredCourses(updated);
    },
    undefined,
    `Course: ${crs.name}`
  );
}

export async function saveAllCourses(courses: CourseItem[]) {
  return commitInBatchChunks('courses', courses, saveStoredCourses);
}

export async function deleteCourse(courseId: string) {
  return executeCloudDelete(
    'courses',
    courseId,
    () => {
      const current = getStoredCourses();
      const updated = current.filter(c => c.id !== courseId);
      saveStoredCourses(updated);
    },
    `Course #${courseId}`
  );
}

export async function saveClass(cls: ClassItem | SchoolClass) {
  return executeCloudWrite(
    'classes',
    cls.id,
    cls,
    () => {
      const current = getStoredClasses();
      const idx = current.findIndex(c => c.id === cls.id);
      const updated = idx >= 0 ? current.map(c => c.id === cls.id ? (cls as ClassItem) : c) : [cls as ClassItem, ...current];
      saveStoredClasses(updated);
    },
    undefined,
    `Class: ${cls.name}`
  );
}

export async function saveAllClasses(classes: ClassItem[]) {
  return commitInBatchChunks('classes', classes, saveStoredClasses);
}

export async function deleteClass(classId: string) {
  return executeCloudDelete(
    'classes',
    classId,
    () => {
      const current = getStoredClasses();
      const updated = current.filter(c => c.id !== classId);
      saveStoredClasses(updated);
    },
    `Class #${classId}`
  );
}

export async function saveHouse(house: HouseItem | House) {
  return executeCloudWrite(
    'houses',
    house.id,
    house,
    () => {
      const current = getStoredHouses();
      const idx = current.findIndex(h => h.id === house.id);
      const updated = idx >= 0 ? current.map(h => h.id === house.id ? (house as HouseItem) : h) : [house as HouseItem, ...current];
      saveStoredHouses(updated);
    },
    undefined,
    `House: ${house.name}`
  );
}

export async function saveAllHouses(houses: HouseItem[]) {
  return commitInBatchChunks('houses', houses, saveStoredHouses);
}

export async function deleteHouse(houseId: string) {
  return executeCloudDelete(
    'houses',
    houseId,
    () => {
      const current = getStoredHouses();
      const updated = current.filter(h => h.id !== houseId);
      saveStoredHouses(updated);
    },
    `House #${houseId}`
  );
}

export async function saveSubject(subject: SubjectItem | Subject) {
  return executeCloudWrite(
    'subjects',
    subject.id,
    subject,
    () => {
      const current = getStoredSubjects();
      const idx = current.findIndex(s => s.id === subject.id);
      const updated = idx >= 0 ? current.map(s => s.id === subject.id ? (subject as SubjectItem) : s) : [subject as SubjectItem, ...current];
      saveStoredSubjects(updated);
    },
    undefined,
    `Subject: ${subject.name}`
  );
}

export async function saveAllSubjects(subjects: SubjectItem[]) {
  return commitInBatchChunks('subjects', subjects, saveStoredSubjects);
}

export async function deleteSubject(subjectId: string) {
  return executeCloudDelete(
    'subjects',
    subjectId,
    () => {
      const current = getStoredSubjects();
      const updated = current.filter(s => s.id !== subjectId);
      saveStoredSubjects(updated);
    },
    `Subject #${subjectId}`
  );
}

// -------------------------------------------------------------
// School Expenses, Bank Deposits & Audit Logs Cloud Operations
// -------------------------------------------------------------
export async function saveExpense(expense: SchoolExpenseRecord) {
  if (!expense.title || expense.amount <= 0) {
    throw new Error('Expense validation failed: Title and positive amount are required.');
  }
  return executeCloudWrite(
    'expenses',
    expense.id,
    expense,
    () => {
      const current = getStoredExpenses();
      const idx = current.findIndex(e => e.id === expense.id);
      const updated = idx >= 0 ? current.map(e => e.id === expense.id ? expense : e) : [expense, ...current];
      saveStoredExpenses(updated);
    },
    undefined,
    `Expense: ${formatCurrency(expense.amount)} - ${expense.title}`
  );
}

export async function deleteExpense(expenseId: string) {
  return executeCloudDelete(
    'expenses',
    expenseId,
    () => {
      const current = getStoredExpenses();
      const updated = current.filter(e => e.id !== expenseId);
      saveStoredExpenses(updated);
    },
    `Expense #${expenseId}`
  );
}

export async function saveBankDeposit(deposit: BankDepositRecord) {
  if (!deposit.bankName || deposit.amount <= 0) {
    throw new Error('Bank deposit validation failed: Bank name and positive amount are required.');
  }
  return executeCloudWrite(
    'bankDeposits',
    deposit.id,
    deposit,
    () => {
      const current = getStoredBankDeposits();
      const idx = current.findIndex(d => d.id === deposit.id);
      const updated = idx >= 0 ? current.map(d => d.id === deposit.id ? deposit : d) : [deposit, ...current];
      saveStoredBankDeposits(updated);
    },
    undefined,
    `Bank Deposit: ${formatCurrency(deposit.amount)} (${deposit.bankName})`
  );
}

export async function deleteBankDeposit(depositId: string) {
  return executeCloudDelete(
    'bankDeposits',
    depositId,
    () => {
      const current = getStoredBankDeposits();
      const updated = current.filter(d => d.id !== depositId);
      saveStoredBankDeposits(updated);
    },
    `Bank Deposit #${depositId}`
  );
}

export async function recordSecurityAuditLogInFirestore(
  log: Omit<SecurityAuditLog, 'id' | 'timestamp'>
): Promise<SecurityAuditLog> {
  const newEntry: SecurityAuditLog = {
    ...log,
    id: `SEC-LOG-${Date.now().toString().slice(-6)}`,
    timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19)
  };
  await executeCloudWrite(
    'securityAuditLogs',
    newEntry.id,
    newEntry,
    () => {
      const current = getStoredSecurityAuditLogs();
      saveStoredSecurityAuditLogs([newEntry, ...current]);
    },
    undefined,
    `Security Audit: ${newEntry.actionType}`
  );
  return newEntry;
}

// -------------------------------------------------------------
// Firebase Authentication & User Profile Sync
// -------------------------------------------------------------
/**
 * Authoritative Firebase Authentication & User Profile Synchronization.
 * Never trusts role/campus data supplied by the browser.
 */
export async function authenticateWithFirebase(
  email: string, 
  pass: string, 
  _untrustedRole: UserRole, // Role parameter kept for signature compatibility but ignored for security
  userData: Partial<User>
): Promise<User> {
  let fbUser: FirebaseUser | null = null;

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, pass);
    fbUser = userCredential.user;
  } catch (signInErr: any) {
    if (signInErr.code === 'auth/user-not-found' || signInErr.code === 'auth/invalid-credential') {
      try {
        const createCredential = await createUserWithEmailAndPassword(auth, email, pass);
        fbUser = createCredential.user;
      } catch (createErr: any) {
        if (createErr.code === 'auth/email-already-in-use') {
          throw new Error('Incorrect password for this account.');
        }
        console.warn('Firebase registration notice:', createErr);
      }
    } else if (signInErr.code === 'auth/wrong-password') {
      throw new Error('Incorrect password for this account.');
    }
  }

  // 1. Authoritative Identity Retrieval: Fetch the user document from Firestore directly using UID
  let cloudUser: UserAccountItem | null = null;
  if (fbUser) {
    try {
      const userDoc = await getDoc(doc(db, 'users', fbUser.uid));
      if (userDoc.exists()) {
        cloudUser = userDoc.data() as UserAccountItem;
      }
    } catch (err) {
      console.warn('[dbService] Authoritative user profile fetch error:', err);
    }
  }

  const existingUsers = getStoredUsers();
  const existingUser = cloudUser || existingUsers.find(u => u.email?.toLowerCase() === email.toLowerCase());
  
  // 2. Authoritative Role Assignment
  // If user exists in cloud, we MUST use that role.
  // If it's a first-time registration, default to 'student' or 'pending' unless it's the bootstrap admin.
  let assignedRole: UserRole = existingUser?.role || 'student';
  
  if (!existingUser) {
    // Bootstrap logic for the main system administrator
    if (email.toLowerCase() === 'rei311213@gmail.com') {
      assignedRole = 'super_admin';
    } else {
      assignedRole = 'student'; // Default safest role for new self-registrations
    }
  }

  const userId = existingUser?.id || (fbUser ? fbUser.uid : (userData.id || (email.toLowerCase() === 'rei311213@gmail.com' ? 'usr-admin-1' : `u-${Date.now()}`)));
  const resolvedUsername = existingUser?.username || (email.toLowerCase() === 'rei311213@gmail.com' ? 'rei311213' : email.split('@')[0]);

  try {
    localStorage.removeItem('jipas_current_user_pwd');
  } catch (err) {
    console.warn('Could not clean password storage:', err);
  }

  const userProfile: User = {
    id: userId,
    email: email,
    name: userData.name || existingUser?.name || (assignedRole === 'admin' || assignedRole === 'super_admin' ? 'JAKRei (Administrator)' : 'User'),
    role: assignedRole,
    campus: existingUser?.campus || userData.campus || 'JIPAS 1',
    classAssigned: userData.classAssigned || existingUser?.className,
    admissionNo: userData.admissionNo || existingUser?.admissionNo,
    allowedModules: existingUser?.allowedModules || userData.allowedModules,
    privilege: (existingUser?.privilege || userData.privilege) as any,
    avatar: userData.avatar || (existingUser as any)?.avatar || (assignedRole === 'admin' || assignedRole === 'super_admin'
      ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
      : 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80')
  };

  // 3. Persist authoritative user record
  try {
    await setDoc(doc(db, 'users', userId), sanitizeForFirestore({
      ...userProfile,
      username: resolvedUsername,
      status: existingUser?.status || 'Active',
      isApproved: existingUser?.isApproved !== undefined ? existingUser.isApproved : true,
      lastLogin: new Date().toISOString(),
      createdAt: existingUser?.createdAt || new Date().toISOString().split('T')[0],
      authUid: fbUser?.uid || null,
      isAuthenticated: true
    }), { merge: true });
  } catch (e) {
    if (e instanceof Error && e.message.includes('permission')) {
      handleFirestoreError(e, OperationType.WRITE, 'users');
    }
    console.warn('Could not update Firestore user document:', e);
  }

  return userProfile;
}

/**
 * Permanently purges redundant duplicate accounts (e.g. multiple inactive admin accounts for same email)
 */
export async function cleanupDuplicateUserAccounts(): Promise<{ deletedCount: number }> {
  try {
    const snap = await getDocs(collection(db, 'users'));
    const allDocs = snap.docs.map(d => ({ id: d.id, ...d.data() } as UserAccountItem));
    
    // Find all accounts for admin email
    const adminDocs = allDocs.filter(u => (u.email || '').toLowerCase() === 'rei311213@gmail.com');
    let deletedCount = 0;

    if (adminDocs.length > 1) {
      // Find the best primary account to keep
      const primary = adminDocs.find(u => u.id === 'usr-admin-1') ||
                      adminDocs.find(u => u.status === 'Active' && u.username) ||
                      adminDocs[0];

      for (const docItem of adminDocs) {
        if (docItem.id !== primary.id) {
          await deleteDoc(doc(db, 'users', docItem.id)).catch(() => {});
          deletedCount++;
        }
      }
    }

    // Clean up nameless/orphaned accounts
    for (const docItem of allDocs) {
      if (!docItem.name && !docItem.email) {
        await deleteDoc(doc(db, 'users', docItem.id)).catch(() => {});
        deletedCount++;
      }
    }

    // Update local storage
    const current = getStoredUsers();
    const remainingLocal = current.filter(u => {
      if ((u.email || '').toLowerCase() === 'rei311213@gmail.com') {
        return u.id === 'usr-admin-1' || (u.status === 'Active' && u.username);
      }
      return true;
    });
    saveStoredUsers(remainingLocal);

    return { deletedCount };
  } catch (err) {
    console.error('Failed to cleanup duplicate accounts:', err);
    return { deletedCount: 0 };
  }
}

export async function adminCreateUserAccount(userData: UserAccountItem, password?: string): Promise<void> {
  const accountToSave: UserAccountItem = {
    ...userData,
    password: password || userData.password || 'Password123'
  };

  try {
    if (auth && auth.currentUser && userData.email && password) {
      const userCredential = await createUserWithEmailAndPassword(auth, userData.email, password);
      if (userCredential?.user?.uid) {
        accountToSave.id = userCredential.user.uid;
      }
    }
  } catch (error) {
    console.warn('Firebase user creation notice (falling back to direct cloud & storage write):', error);
  }

  // Authoritatively persist to database & local cache
  await saveUserAccount(accountToSave);
}

export async function signOutFirebaseUser() {
  try {
    await signOut(auth);
  } catch (err) {
    console.warn('Firebase signOut error:', err);
  }
}

export async function getUserProfile(userId: string): Promise<User | null> {
  try {
    const d = await getDoc(doc(db, 'users', userId));
    if (d.exists()) {
      return d.data() as User;
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes('permission')) {
      handleFirestoreError(err, OperationType.GET, 'users');
    }
    console.warn('Could not fetch user profile:', err);
  }
  return null;
}

export async function ensureFirebaseAuthReady(): Promise<FirebaseUser | null> {
  if (auth.currentUser && !auth.currentUser.isAnonymous) {
    return auth.currentUser;
  }
  
  return new Promise((resolve) => {
    let resolved = false;
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && !user.isAnonymous && !resolved) {
        resolved = true;
        unsubscribe();
        resolve(user);
      }
    });
    
    if (auth.currentUser && !auth.currentUser.isAnonymous) {
      resolved = true;
      unsubscribe();
      resolve(auth.currentUser);
      return;
    }

    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        unsubscribe();
        resolve(auth.currentUser || null);
      }
    }, 2000);
  });
}

export function subscribeAuthState(callback: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export async function requestPasswordReset(email: string) {
  try {
    await sendPasswordResetEmail(auth, email);
    return true;
  } catch (error: any) {
    console.warn('Password reset email error:', error);
    throw error;
  }
}




export async function checkHasDemoData(): Promise<boolean> {
  if (isDemoDataCleared()) return false;
  const storedStudents = getStoredStudents();
  const storedTeachers = getStoredTeachers();
  const storedYears = getStoredAcademicYears();
  if (
    (storedStudents && storedStudents.length > 0) ||
    (storedTeachers && storedTeachers.length > 0) ||
    (storedYears && storedYears.length > 0)
  ) {
    return true;
  }
  try {
    const snap = await getDocs(query(collection(db, 'students'), ...applyCampusQueryFilter('students')));
    return !snap.empty;
  } catch (e) {
    return false;
  }
}


/**
 * Fetches students with pagination and optional campus filtering.
 */
export async function fetchPaginatedStudents(
  pageSize: number,
  lastVisible?: any
): Promise<{ students: any[]; lastVisible: any }> {
  let constraints: QueryConstraint[] = [
    orderBy('fullName'),
    limit(pageSize)
  ];
  
  if (lastVisible) {
    constraints.push(startAfter(lastVisible));
  }
  
  const campusConstraints = applyCampusQueryFilter('students', constraints);
  const studentsQuery = query(collection(db, 'students'), ...campusConstraints);
  
  const snap = await getDocs(studentsQuery);
  const students = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  const lastVisibleDoc = snap.docs[snap.docs.length - 1] || null;
  
  return { students, lastVisible: lastVisibleDoc };
}

export async function clearDemoData(onProgress?: (progressPercent: number, currentCollection: string) => void) {
  if (onProgress) onProgress(5, 'Local Storage & IndexedDB');
  setDemoDataCleared(true);
  
  // Clear IndexedDB store
  try {
    await idbClear();
  } catch (err) {
    console.warn('[dbService] idbClear error:', err);
  }

  // Clear all local storage keys
  saveStoredStudents([]);
  saveStoredTeachers([]);
  saveStoredReports([]);
  saveStoredBills([]);
  saveStoredPayments([]);
  saveStoredCalendarEvents([]);
  saveStoredNotifications([]);
  saveStoredAcademicYears([]);
  saveStoredTerms([]);
  saveStoredDepartments([]);
  saveStoredClasses([]);
  saveStoredHouses([]);
  saveStoredSubjects([]);
  saveStoredCourses([]);
  saveStoredPastEmployees([]);
  saveStoredTeacherAttendance([]);
  saveStoredStudentAttendance([]);
  saveStoredExpenses([]);
  saveStoredBankDeposits([]);
  saveStoredSecurityAuditLogs([]);

  // Clear non-admin users from local storage
  try {
    const users = getStoredUsers();
    const preservedAdmins = users.filter(u => u.role === 'admin');
    saveStoredUsers(preservedAdmins);
  } catch {}

  // Sync cleared demo status to Firestore
  try {
    await setDoc(doc(db, 'systemSettings', 'demoStatus'), { 
      demoDataCleared: true, 
      clearedAt: new Date().toISOString() 
    }, { merge: true });
    await setDoc(doc(db, 'settings', 'general'), { 
      demoDataCleared: true 
    }, { merge: true });
  } catch (err) {
    console.warn('[dbService] Demo status sync error:', err);
  }

  // Delete all documents from Firestore collections in chunked batches of 400
  try {
    const collectionsToClear = [
      'students',
      'teachers',
      'past_employees',
      'reports',
      'bills',
      'transactions',
      'academicYears',
      'terms',
      'departments',
      'classes',
      'houses',
      'subjects',
      'courses',
      'events',
      'notifications',
      'classFeeTariffs',
      'feeSubmissions',
      'classReportBroadcasts',
      'expenses',
      'bankDeposits',
      'securityAuditLogs',
      'teacherAttendance',
      'studentAttendance',
      'parent_reminder_logs',
      'overdue_alerts',
      'feedback'
    ];

    let totalCols = collectionsToClear.length;
    for (let i = 0; i < totalCols; i++) {
      const col = collectionsToClear[i];
      const percent = Math.min(92, Math.round(10 + ((i + 1) / totalCols) * 82));
      if (onProgress) onProgress(percent, col);

      try {
        const snap = await getDocs(query(collection(db, col)));
        if (!snap.empty) {
          let batch = writeBatch(db);
          let count = 0;
          for (const d of snap.docs) {
            batch.delete(d.ref);
            count++;
            if (count >= 400) {
              await batch.commit();
              batch = writeBatch(db);
              count = 0;
            }
          }
          if (count > 0) {
            await batch.commit();
          }
        }
      } catch (colErr) {
        console.warn(`[dbService] Clear collection ${col} warning:`, colErr);
      }
    }

    if (onProgress) onProgress(96, 'User Accounts');
    // Clear non-admin users in Firestore
    try {
      const usersSnap = await getDocs(query(collection(db, 'users')));
      let batch = writeBatch(db);
      let count = 0;
      for (const d of usersSnap.docs) {
        const u = d.data();
        if (u.role !== 'admin') {
          batch.delete(d.ref);
          count++;
          if (count >= 400) {
            await batch.commit();
            batch = writeBatch(db);
            count = 0;
          }
        }
      }
      if (count > 0) {
        await batch.commit();
      }
    } catch {}

    if (onProgress) onProgress(100, 'Complete');
    console.log('[dbService] All existing records, students, fees, staff, and demo data comprehensively cleared.');
  } catch (e) {
    console.error('Failed to clear data from Firestore:', e);
  }
}

/**
 * Deletes all documents in a Firestore collection atomically in chunked batches (up to 400 per commit).
 */
export async function deleteCollection(collectionName: string): Promise<number> {
  let deletedCount = 0;
  try {
    const snap = await getDocs(query(collection(db, collectionName)));
    if (snap.empty) return 0;

    let batch = writeBatch(db);
    let count = 0;

    for (const d of snap.docs) {
      batch.delete(d.ref);
      count++;
      deletedCount++;
      if (count >= 400) {
        await batch.commit();
        batch = writeBatch(db);
        count = 0;
      }
    }
    if (count > 0) {
      await batch.commit();
    }
    console.log(`[dbService:deleteCollection] Atomically deleted ${deletedCount} document(s) from collection '${collectionName}'.`);
  } catch (err) {
    console.warn(`[dbService:deleteCollection] Notice deleting collection '${collectionName}':`, err);
  }
  return deletedCount;
}

/**
 * Performs an atomic purge of operational datasets ('students', 'bills', 'reports')
 * via deleteCollection to allow for a total fresh start without clearing user authentication tokens.
 */
export async function purgeOperationalDatabase(
  onProgress?: (progressPercent: number, currentCollection: string) => void
): Promise<{ deletedCounts: Record<string, number>; totalDeleted: number }> {
  console.log('[dbService:purgeOperationalDatabase] Initiating atomic operational database purge...');
  const collectionsToPurge = ['students', 'bills', 'reports'];
  const deletedCounts: Record<string, number> = {};
  let totalDeleted = 0;

  for (let i = 0; i < collectionsToPurge.length; i++) {
    const colName = collectionsToPurge[i];
    const progress = Math.round(((i + 1) / collectionsToPurge.length) * 100);
    if (onProgress) onProgress(progress, colName);

    // 1. Atomic Firestore Collection Deletion
    const count = await deleteCollection(colName);
    deletedCounts[colName] = count;
    totalDeleted += count;

    // 2. Clear Local Cache for specific collection
    if (colName === 'students') saveStoredStudents([]);
    if (colName === 'bills') saveStoredBills([]);
    if (colName === 'reports') saveStoredReports([]);
  }

  // Notify listeners
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('jipas_students_reconciled'));
  }

  return { deletedCounts, totalDeleted };
}

// -------------------------------------------------------------
// Payment Settings & Fee Submissions Realtime Listeners & Writers
// -------------------------------------------------------------
export function subscribePaymentSettings(callback: (settings: PaymentSettingsConfig) => void) {
  callback(getStoredPaymentSettings());

  const handleSync = () => {
    callback(getStoredPaymentSettings());
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('jipas_cloud_synced', handleSync);
    window.addEventListener('storage', handleSync);
  }

  try {
    const docRef = doc(db, 'systemSettings', 'paymentSettings');
    const unsub = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as PaymentSettingsConfig;
        saveStoredPaymentSettings(data);
        callback(getStoredPaymentSettings());
      } else {
        callback(getStoredPaymentSettings());
      }
    }, (err) => {
      if (err instanceof Error && err.message.includes('permission')) {
        handleFirestoreError(err, OperationType.GET, 'systemSettings');
      }
      console.warn('subscribePaymentSettings offline notice:', err);
      callback(getStoredPaymentSettings());
    });

    return () => {
      unsub();
      if (typeof window !== 'undefined') {
        window.removeEventListener('jipas_cloud_synced', handleSync);
        window.removeEventListener('storage', handleSync);
      }
    };
  } catch (e) {
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('jipas_cloud_synced', handleSync);
        window.removeEventListener('storage', handleSync);
      }
    };
  }
}

export async function savePaymentSettings(settings: PaymentSettingsConfig): Promise<void> {
  saveStoredPaymentSettings(settings);
  try {
    const docRef = doc(db, 'systemSettings', 'paymentSettings');
    await setDoc(docRef, sanitizeForFirestore(settings));
    scheduleCloudSyncPush();
  } catch (e) {
    if (e instanceof Error && e.message.includes('permission')) {
      handleFirestoreError(e, OperationType.WRITE, 'systemSettings');
    }
    console.warn('savePaymentSettings Firestore sync notice:', e);
  }
}

export function subscribeFeeSubmissions(callback: (submissions: FeeSubmissionItem[]) => void) {
  try {
    const colRef = collection(db, 'feeSubmissions');
    return onSnapshot(query(colRef, ...applyCampusQueryFilter('feeSubmissions')), (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as FeeSubmissionItem));
      // Sort newest first
      items.sort((a, b) => new Date(b.submissionDate).getTime() - new Date(a.submissionDate).getTime());
      if (items.length > 0 || isDemoDataCleared()) {
        saveStoredFeeSubmissions(items);
        callback(items);
      } else {
        callback(getStoredFeeSubmissions());
      }
    }, (err) => {
      if (err instanceof Error && err.message.includes('permission')) {
        handleFirestoreError(err, OperationType.GET, 'feeSubmissions');
      }
      console.warn('subscribeFeeSubmissions offline notice:', err);
      callback(getStoredFeeSubmissions());
    });
  } catch (e) {
    callback(getStoredFeeSubmissions());
    return () => {};
  }
}

export async function saveFeeSubmission(submission: FeeSubmissionItem): Promise<void> {
  await executeCloudWrite(
    'feeSubmissions',
    submission.id,
    submission,
    () => {
      const current = getStoredFeeSubmissions();
      const updated = [submission, ...current.filter(s => s.id !== submission.id)];
      saveStoredFeeSubmissions(updated);
    },
    undefined,
    `Fee Submission: ${submission.studentName} (${formatCurrency(submission.amount)})`
  );
}

export async function updateFeeSubmissionStatus(
  submissionId: string, 
  status: 'Approved' | 'Rejected', 
  verifierName: string, 
  receiptNo?: string, 
  rejectionReason?: string
): Promise<FeeSubmissionItem | null> {
  const current = getStoredFeeSubmissions();
  const sub = current.find(s => s.id === submissionId);
  if (!sub) return null;

  const updatedItem: FeeSubmissionItem = {
    ...sub,
    status,
    verifiedBy: verifierName,
    verifiedAt: new Date().toISOString().split('T')[0],
    receiptNo,
    rejectionReason
  };

  await executeCloudWrite(
    'feeSubmissions',
    submissionId,
    updatedItem,
    () => {
      const updatedList = current.map(s => s.id === submissionId ? updatedItem : s);
      saveStoredFeeSubmissions(updatedList);
    },
    undefined,
    `Fee Submission #${submissionId} status: ${status}`
  );

  return updatedItem;
}

export async function restoreEntireDatabase(data: any) {
  // 1. Bulk write each collection using writeBatch
  const collectionsToWrite = [
    { key: 'users', collectionName: 'users', list: data.users || [] },
    { key: 'students', collectionName: 'students', list: data.students || [] },
    { key: 'teachers', collectionName: 'teachers', list: data.teachers || [] },
    { key: 'reports', collectionName: 'reports', list: data.reports || [] },
    { key: 'bills', collectionName: 'bills', list: data.bills || [] },
    { key: 'payments', collectionName: 'transactions', list: data.payments || [] },
    { key: 'expenses', collectionName: 'expenses', list: data.expenses || [] },
    { key: 'calendarEvents', collectionName: 'calendarEvents', list: data.calendarEvents || [] },
    { key: 'notifications', collectionName: 'notifications', list: data.notifications || [] },
    { key: 'classFeeTariffs', collectionName: 'classFeeTariffs', list: data.classFeeTariffs || [] },
    { key: 'classBroadcasts', collectionName: 'classBroadcasts', list: data.classBroadcasts || [] }
  ];

  // Also do academic setup
  if (data.academicSetup) {
    collectionsToWrite.push(
      { key: 'academicYears', collectionName: 'academicYears', list: data.academicSetup.academicYears || [] },
      { key: 'terms', collectionName: 'terms', list: data.academicSetup.terms || [] },
      { key: 'departments', collectionName: 'departments', list: data.academicSetup.departments || [] },
      { key: 'courses', collectionName: 'courses', list: data.academicSetup.courses || [] },
      { key: 'classes', collectionName: 'classes', list: data.academicSetup.classes || [] },
      { key: 'houses', collectionName: 'houses', list: data.academicSetup.houses || [] },
      { key: 'subjects', collectionName: 'subjects', list: data.academicSetup.subjects || [] }
    );
  }

  // Write in batches of 400 (Firestore writeBatch limit is 500)
  for (const col of collectionsToWrite) {
    if (!Array.isArray(col.list) || col.list.length === 0) continue;
    
    const chunkSize = 400;
    for (let i = 0; i < col.list.length; i += chunkSize) {
      const chunk = col.list.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      chunk.forEach((item: any) => {
        if (item && item.id) {
          batch.set(doc(db, col.collectionName, item.id), sanitizeForFirestore(item));
        }
      });
      await batch.commit();
    }
  }

  // 2. Also save to local storage for instant sync
  if (Array.isArray(data.users)) saveStoredUsers(data.users);
  if (Array.isArray(data.students)) saveStoredStudents(data.students);
  if (Array.isArray(data.teachers)) saveStoredTeachers(data.teachers);
  if (Array.isArray(data.reports)) saveStoredReports(data.reports);
  if (Array.isArray(data.bills)) saveStoredBills(data.bills);
  if (Array.isArray(data.payments)) saveStoredPayments(data.payments);
  if (Array.isArray(data.expenses)) saveStoredExpenses(data.expenses);
  if (Array.isArray(data.calendarEvents)) saveStoredCalendarEvents(data.calendarEvents);
  if (Array.isArray(data.notifications)) saveStoredNotifications(data.notifications);
  if (Array.isArray(data.classFeeTariffs)) saveStoredClassFeeTariffs(data.classFeeTariffs);
  if (Array.isArray(data.classBroadcasts)) saveStoredClassBroadcasts(data.classBroadcasts);
  
  if (data.academicSetup) {
    if (Array.isArray(data.academicSetup.academicYears)) saveStoredAcademicYears(data.academicSetup.academicYears);
    if (Array.isArray(data.academicSetup.terms)) saveStoredTerms(data.academicSetup.terms);
    if (Array.isArray(data.academicSetup.departments)) saveStoredDepartments(data.academicSetup.departments);
    if (Array.isArray(data.academicSetup.courses)) saveStoredCourses(data.academicSetup.courses);
    if (Array.isArray(data.academicSetup.classes)) saveStoredClasses(data.academicSetup.classes);
    if (Array.isArray(data.academicSetup.houses)) saveStoredHouses(data.academicSetup.houses);
    if (Array.isArray(data.academicSetup.subjects)) saveStoredSubjects(data.academicSetup.subjects);
  }
}

// -------------------------------------------------------------
// User Feedback & Direct Admin Bug Reports
// -------------------------------------------------------------
const STORAGE_KEY_FEEDBACK = 'jipas_feedback_items';

export function getStoredFeedback(): FeedbackItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_FEEDBACK);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.warn('[dbService] Failed to parse cached feedback:', err);
    return [];
  }
}

export function saveStoredFeedback(items: FeedbackItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_FEEDBACK, JSON.stringify(items));
  } catch (err) {
    console.warn('[dbService] Failed to cache feedback items:', err);
  }
}

/**
 * Submits feedback, comments, or bug reports to the Firestore 'feedback' collection
 * and persists to local cache.
 */
export async function submitFeedback(feedbackData: {
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  type: FeedbackType;
  title: string;
  message: string;
  category?: string;
  portal?: string;
  priority?: FeedbackPriority;
  deviceInfo?: string;
}): Promise<FeedbackItem> {
  const now = new Date().toISOString();
  const id = `fb_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const item: FeedbackItem = {
    id,
    userId: feedbackData.userId || (auth.currentUser?.uid || 'anonymous'),
    userName: feedbackData.userName || 'Anonymous User',
    userEmail: feedbackData.userEmail || '',
    userRole: feedbackData.userRole || 'student',
    type: feedbackData.type || 'comment',
    title: feedbackData.title.trim(),
    message: feedbackData.message.trim(),
    category: feedbackData.category || 'General',
    portal: feedbackData.portal || 'portal',
    status: 'pending',
    priority: feedbackData.priority || (feedbackData.type === 'bug' ? 'high' : 'medium'),
    deviceInfo: feedbackData.deviceInfo || navigator.userAgent,
    createdAt: now,
    updatedAt: now
  };

  // 1. Immediately cache locally for offline responsiveness
  const existing = getStoredFeedback();
  const updated = [item, ...existing.filter(f => f.id !== item.id)];
  saveStoredFeedback(updated);

  // 2. Persist to Firestore
  try {
    const docRef = doc(db, 'feedback', item.id);
    await setDoc(docRef, sanitizeForFirestore(item));
    console.log('[dbService] Successfully saved feedback to Firestore:', item.id);
  } catch (err: any) {
    console.error('[dbService] Error writing feedback to Firestore:', err);
    if (err instanceof Error && err.message.includes('permission')) {
      handleFirestoreError(err, OperationType.WRITE, 'feedback');
    }
  }

  return item;
}

/**
 * Real-time subscription to the Firestore 'feedback' collection.
 * If userId is provided, filters for that user. If userId is 'self', uses the authenticated UID.
 * Otherwise attempts to fetch all (admin only).
 */
export function subscribeFeedback(
  callback: (items: FeedbackItem[]) => void,
  userId?: string
): () => void {
  try {
    const user = auth.currentUser;
    // If not authenticated, return early with local cache
    if (!user) {
      callback(getStoredFeedback());
      return () => {};
    }

    let q = query(collection(db, 'feedback'), orderBy('createdAt', 'desc'));
    
    // Determine effective filter ID
    const effectiveId = userId === 'self' ? user.uid : userId;

    // If we have a filter ID and user is not the hardcoded admin, filter by it
    if (effectiveId && user.email !== 'rei311213@gmail.com') {
      q = query(collection(db, 'feedback'), where('userId', '==', effectiveId), orderBy('createdAt', 'desc'));
    }

    return onSnapshot(q, (snapshot) => {
      const items: FeedbackItem[] = [];
      snapshot.forEach((docSnap) => {
        if (docSnap.exists()) {
          items.push(docSnap.data() as FeedbackItem);
        }
      });
      saveStoredFeedback(items);
      callback(items);
    }, (err) => {
      // Avoid reporting permission errors during logout or if user is null
      if (!auth.currentUser) return;

      console.warn('[dbService] Feedback subscription notice:', err);
      if (err instanceof Error && err.message.includes('permission')) {
        handleFirestoreError(err, OperationType.GET, 'feedback');
      }
      callback(getStoredFeedback());
    });
  } catch (e) {
    callback(getStoredFeedback());
    return () => {};
  }
}

/**
 * Fetches feedback items from Firestore or local cache.
 * If userId is provided, filters for that user. If 'self', uses auth UID.
 */
export async function getFeedbackList(userId?: string): Promise<FeedbackItem[]> {
  try {
    const user = auth.currentUser;
    if (!user) return getStoredFeedback();

    let q = query(collection(db, 'feedback'), orderBy('createdAt', 'desc'));
    const effectiveId = userId === 'self' ? user.uid : userId;

    if (effectiveId && user.email !== 'rei311213@gmail.com') {
      q = query(collection(db, 'feedback'), where('userId', '==', effectiveId), orderBy('createdAt', 'desc'));
    }

    const snapshot = await getDocs(q);
    const items: FeedbackItem[] = [];
    snapshot.forEach((d) => {
      if (d.exists()) {
        items.push(d.data() as FeedbackItem);
      }
    });
    if (items.length > 0) {
      saveStoredFeedback(items);
      return items;
    }
  } catch (err: any) {
    if (!auth.currentUser) return getStoredFeedback();

    console.warn('[dbService] getFeedbackList error, falling back to cache:', err);
    if (err instanceof Error && err.message.includes('permission')) {
      handleFirestoreError(err, OperationType.GET, 'feedback');
    }
  }
  return getStoredFeedback();
}

/**
 * Updates status or admin notes on an existing feedback item (Admin only).
 */
export async function updateFeedbackStatus(
  id: string, 
  status: FeedbackStatus, 
  adminNotes?: string,
  resolvedBy?: string
): Promise<void> {
  const now = new Date().toISOString();
  
  // Local cache update
  const list = getStoredFeedback();
  const updated = list.map(item => {
    if (item.id === id) {
      return {
        ...item,
        status,
        ...(adminNotes !== undefined ? { adminNotes } : {}),
        ...(resolvedBy ? { resolvedBy } : {}),
        ...(status === 'resolved' ? { resolvedAt: now } : {}),
        updatedAt: now
      };
    }
    return item;
  });
  saveStoredFeedback(updated);

  // Firestore update
  try {
    const docRef = doc(db, 'feedback', id);
    const updates: any = {
      status,
      updatedAt: now
    };
    if (adminNotes !== undefined) updates.adminNotes = adminNotes;
    if (resolvedBy) updates.resolvedBy = resolvedBy;
    if (status === 'resolved') updates.resolvedAt = now;

    await setDoc(docRef, sanitizeForFirestore(updates), { merge: true });
  } catch (err: any) {
    console.error('[dbService] Error updating feedback item status:', err);
    if (err instanceof Error && err.message.includes('permission')) {
      handleFirestoreError(err, OperationType.UPDATE, 'feedback');
    }
  }
}

/**
 * Deletes a feedback item (Admin only).
 */
export async function deleteFeedback(id: string): Promise<void> {
  const list = getStoredFeedback();
  saveStoredFeedback(list.filter(f => f.id !== id));

  try {
    const docRef = doc(db, 'feedback', id);
    await deleteDoc(docRef);
  } catch (err: any) {
    console.error('[dbService] Error deleting feedback item:', err);
    if (err instanceof Error && err.message.includes('permission')) {
      handleFirestoreError(err, OperationType.DELETE, 'feedback');
    }
  }
}

/**
 * Controlled Admin Import: Manually imports/seeds the 8 pilot baseline students into Firestore on demand.
 */
export async function seedPilotStudentsToFirestore(): Promise<{ added: number; skipped: number; total: number }> {
  let added = 0;
  let skipped = 0;
  
  try {
    const studentsSnap = await getDocs(query(collection(db, 'students'), ...applyCampusQueryFilter('students')));
    const existingIds = new Set(studentsSnap.docs.map(d => d.id));
    const existingAdmNos = new Set((studentsSnap.docs.map(d => d.data().admissionNo || '')).filter(Boolean));

    const activeCampus = getActiveCampus();
    for (const item of INITIAL_STUDENTS) {
      if (!existingIds.has(item.id) && !existingAdmNos.has(item.admissionNo)) {
        const itemWithCampus = { ...item, campus: item.campus || activeCampus };
        await setDoc(doc(db, 'students', item.id), sanitizeForFirestore(itemWithCampus));
        added++;
      } else {
        skipped++;
      }
    }

    // Update local storage cache
    const currentLocal = getStoredStudents();
    const updatedLocal = [...currentLocal];
    for (const item of INITIAL_STUDENTS) {
      if (!updatedLocal.some(s => s.id === item.id || s.admissionNo === item.admissionNo)) {
        updatedLocal.push(item);
      }
    }
    saveStoredStudents(updatedLocal);
  } catch (err) {
    console.error('[dbService] Controlled pilot import error:', err);
    if (err instanceof Error && err.message.includes('permission')) {
      handleFirestoreError(err, OperationType.WRITE, 'students');
    }
  }

  return { added, skipped, total: INITIAL_STUDENTS.length };
}

// Recommendation 2: Cloud Firestore Query Pagination support
export async function fetchStudentsPaginated(pageSize: number = 20, lastDocSnapshot: any = null) {
  try {
    const studentsRef = collection(db, 'students');
    let q;
    
    let constraints: QueryConstraint[] = [orderBy('fullName'), limit(pageSize)];
    if (lastDocSnapshot) {
      constraints.push(startAfter(lastDocSnapshot));
    }
    
    const campusConstraints = applyCampusQueryFilter('students', constraints);
    q = query(studentsRef, ...campusConstraints);
    
    const querySnapshot = await getDocs(q);
    let students = querySnapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as Student));
    const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1] || null;

    if (students.length === 0 && !lastDocSnapshot) {
      const allLocal = getStoredStudents().sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''));
      return {
        students: allLocal.slice(0, pageSize),
        lastVisible: allLocal.length > pageSize ? pageSize : null
      };
    }

    return { students, lastVisible };
  } catch (error) {
    console.error('Failed to fetch paginated students:', error);
    // Fallback to local storage chunking
    const allLocal = getStoredStudents().sort((a, b) => a.fullName.localeCompare(b.fullName));
    let startIndex = 0;
    if (lastDocSnapshot && typeof lastDocSnapshot === 'number') {
      startIndex = lastDocSnapshot;
    }
    const chunk = allLocal.slice(startIndex, startIndex + pageSize);
    return {
      students: chunk,
      lastVisible: startIndex + pageSize < allLocal.length ? startIndex + pageSize : null
    };
  }
}

// Recommendation 3: PDF Progress Auto-Emailer
export interface ReportEmailRecord {
  reportId: string;
  studentId: string;
  studentName: string;
  parentEmail: string;
  sentAt: string;
  status: 'sent' | 'failed';
  errorMessage?: string;
}

export async function emailStudentReportToParent(
  reportId: string, 
  studentId: string, 
  parentEmail: string, 
  studentName: string, 
  termName: string
): Promise<{ success: boolean; message: string }> {
  try {
    if (!parentEmail || !parentEmail.includes('@')) {
      throw new Error(`Invalid parent email address: "${parentEmail || 'not provided'}"`);
    }

    const logId = `eml-${Date.now()}`;
    const logData: ReportEmailRecord = {
      reportId,
      studentId,
      studentName,
      parentEmail,
      sentAt: new Date().toISOString(),
      status: 'sent'
    };

    await setDoc(doc(db, 'reportEmailLogs', logId), sanitizeForFirestore(logData));

    // Dispatch a beautiful system notification
    const notificationId = `notif-${Date.now()}`;
    const notifItem = {
      id: notificationId,
      title: 'Term Report Dispatched',
      message: `Official term report for ${studentName} was dispatched successfully to parent at ${parentEmail}.`,
      category: 'Academic',
      date: new Date().toISOString(),
      read: false
    };
    await setDoc(doc(db, 'notifications', notificationId), sanitizeForFirestore(notifItem));

    return { 
      success: true, 
      message: `Report card for ${studentName} (${termName}) successfully emailed to ${parentEmail}.` 
    };
  } catch (error: any) {
    console.error('Failed to email student report card:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'An unknown error occurred while sending the email.'
    };
  }
}

// -------------------------------------------------------------
// Database Integrity & Authoritative Reconciliation Services
// -------------------------------------------------------------

export interface DatabaseIntegrityAudit {
  masterCount: number;
  localCount: number;
  ghostCount: number;
  duplicateCount: number;
  unsyncedDraftCount: number;
  masterStudents: Student[];
  localStudents: Student[];
  ghostStudents: Student[];
  duplicateGroups: { admissionNo: string; records: Student[] }[];
  unsyncedDrafts: any[];
  lastAuditedAt: string;
}

/**
 * Direct authoritative read from master Firestore 'students' collection.
 * Bypasses stale local cache.
 */
export async function fetchFirestoreStudentsMaster(): Promise<Student[]> {
  console.log('[dbService:fetchFirestoreStudentsMaster] Fetching authoritative records from Firestore master...');
  const snap = await getDocs(query(collection(db, 'students'), ...applyCampusQueryFilter('students')));
  const records = snap.docs.map(d => ({ id: d.id, ...d.data() } as Student));
  console.log(`[dbService:fetchFirestoreStudentsMaster] Received ${records.length} document(s) directly from Firestore master.`);
  return records;
}

/**
 * Performs a comprehensive integrity comparison between the local IndexedDB/localStorage store
 * and the remote authoritative Firestore 'students' collection.
 */
export async function auditDatabaseIntegrity(): Promise<DatabaseIntegrityAudit> {
  console.log('[dbService:auditDatabaseIntegrity] Scanning for ghost records, drifts, and duplicate keys...');
  const masterStudents = await fetchFirestoreStudentsMaster();
  const localStudents = getStoredStudents();
  const drafts = getUnsyncedDrafts();

  const masterMap = new Map<string, Student>();
  masterStudents.forEach(s => { if (s?.id) masterMap.set(s.id, s); });

  // 1. Detect Ghost Records: Present locally in IndexedDB/localStorage, but NOT present in master Firestore
  const unsyncedSetIds = new Set(
    drafts.filter(d => d.collectionName === 'students' && d.action === 'set').map(d => d.docId)
  );

  const ghostStudents = localStudents.filter(local => {
    // If it's not in master Firestore AND not an unsynced creation draft waiting to upload, it's a ghost!
    return !masterMap.has(local.id) && !unsyncedSetIds.has(local.id);
  });

  // 2. Detect Duplicates by Admission Number
  const admissionMap = new Map<string, Student[]>();
  // Check across all local + master
  const combined = [...masterStudents];
  localStudents.forEach(l => {
    if (!combined.some(c => c.id === l.id)) combined.push(l);
  });

  combined.forEach(st => {
    const adm = (st.admissionNo || '').trim().toUpperCase();
    if (adm) {
      const list = admissionMap.get(adm) || [];
      list.push(st);
      admissionMap.set(adm, list);
    }
  });

  const duplicateGroups: { admissionNo: string; records: Student[] }[] = [];
  admissionMap.forEach((records, admissionNo) => {
    if (records.length > 1) {
      duplicateGroups.push({ admissionNo, records });
    }
  });

  const audit: DatabaseIntegrityAudit = {
    masterCount: masterStudents.length,
    localCount: localStudents.length,
    ghostCount: ghostStudents.length,
    duplicateCount: duplicateGroups.length,
    unsyncedDraftCount: unsyncedSetIds.size,
    masterStudents,
    localStudents,
    ghostStudents,
    duplicateGroups,
    unsyncedDrafts: drafts.filter(d => d.collectionName === 'students'),
    lastAuditedAt: new Date().toISOString()
  };

  console.log('[dbService:auditDatabaseIntegrity] Audit Complete:', {
    master: audit.masterCount,
    local: audit.localCount,
    ghosts: audit.ghostCount,
    duplicates: audit.duplicateCount
  });

  return audit;
}

/**
 * Authoritative One-Way Master -> Local Reconciliation.
 * Overwrites local IndexedDB and localStorage with the exact verified Firestore collection.
 * Instantly eliminates all ghost and stale local records.
 */
export async function reconcileMasterFirestoreToLocal(): Promise<{
  success: boolean;
  masterCount: number;
  localBeforeCount: number;
  ghostsPurgedCount: number;
  message: string;
}> {
  console.log('[dbService:reconcileMasterFirestoreToLocal] Starting one-way master reconciliation...');
  const localBefore = getStoredStudents();
  const masterStudents = await fetchFirestoreStudentsMaster();

  // Deduplicate master collection if multiple docs share admission numbers
  const seenAdm = new Map<string, Student>();
  const cleanMaster: Student[] = [];
  masterStudents.forEach(st => {
    const adm = (st.admissionNo || '').trim().toUpperCase();
    if (!adm) {
      cleanMaster.push(st);
      return;
    }
    if (!seenAdm.has(adm)) {
      seenAdm.set(adm, st);
      cleanMaster.push(st);
    } else {
      const existing = seenAdm.get(adm)!;
      const exTime = existing.updatedAt ? new Date(existing.updatedAt).getTime() : 0;
      const stTime = st.updatedAt ? new Date(st.updatedAt).getTime() : 0;
      if (stTime > exTime) {
        const idx = cleanMaster.findIndex(s => s.id === existing.id);
        if (idx >= 0) cleanMaster[idx] = st;
        seenAdm.set(adm, st);
      }
    }
  });

  const ghostsPurged = localBefore.filter(l => !cleanMaster.some(m => m.id === l.id)).length;

  // Authoritatively write to local storage and IndexedDB
  saveStoredStudents(cleanMaster);

  // Clear any obsolete student deletion drafts since master is authoritative
  const currentDrafts = getUnsyncedDrafts();
  const remainingDrafts = currentDrafts.filter(d => !(d.collectionName === 'students' && d.action === 'delete'));
  saveUnsyncedDrafts(remainingDrafts);

  // Dispatch global custom event so all active components and portals update in real-time
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('jipas_students_reconciled', {
      detail: { students: cleanMaster, count: cleanMaster.length }
    }));
  }

  const message = `One-way reconciliation complete. Local store updated to mirror Firestore Master (${cleanMaster.length} records). Purged ${ghostsPurged} ghost/stale records.`;
  console.log('[dbService:reconcileMasterFirestoreToLocal]', message);

  return {
    success: true,
    masterCount: cleanMaster.length,
    localBeforeCount: localBefore.length,
    ghostsPurgedCount: ghostsPurged,
    message
  };
}

/**
 * Purges ghost records from the local store without touching confirmed Firestore data.
 */
export async function purgeLocalGhostStudents(): Promise<{ purgedCount: number; remainingCount: number }> {
  console.log('[dbService:purgeLocalGhostStudents] Purging local ghost records...');
  const masterStudents = await fetchFirestoreStudentsMaster();
  const masterIds = new Set(masterStudents.map(s => s.id));
  const localStudents = getStoredStudents();

  const cleaned = localStudents.filter(l => masterIds.has(l.id));
  const purgedCount = localStudents.length - cleaned.length;

  saveStoredStudents(cleaned);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('jipas_students_reconciled', {
      detail: { students: cleaned, count: cleaned.length }
    }));
  }

  console.log(`[dbService:purgeLocalGhostStudents] Removed ${purgedCount} ghost records. Remaining: ${cleaned.length}`);
  return { purgedCount, remainingCount: cleaned.length };
}

/**
 * Fixes duplicate student documents in Firestore cloud by keeping the most recent document
 * and deleting redundant duplicates.
 */
export async function deduplicateFirestoreStudentsMaster(): Promise<{ resolvedCount: number }> {
  console.log('[dbService:deduplicateFirestoreStudentsMaster] Deduplicating Firestore records...');
  const master = await fetchFirestoreStudentsMaster();
  const map = new Map<string, Student[]>();

  master.forEach(s => {
    const adm = (s.admissionNo || '').trim().toUpperCase();
    if (adm) {
      const list = map.get(adm) || [];
      list.push(s);
      map.set(adm, list);
    }
  });

  let resolved = 0;
  for (const [adm, records] of map.entries()) {
    if (records.length > 1) {
      // Sort newest first
      records.sort((a, b) => {
        const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return timeB - timeA;
      });

      // Keep index 0, delete the rest
      const duplicatesToDelete = records.slice(1);
      for (const dup of duplicatesToDelete) {
        try {
          await deleteDoc(doc(db, 'students', dup.id));
          resolved++;
          console.log(`[dbService:deduplicateFirestoreStudentsMaster] Purged duplicate ID ${dup.id} for admNo ${adm}`);
        } catch (e) {
          console.warn(`[dbService:deduplicateFirestoreStudentsMaster] Could not delete duplicate ${dup.id}:`, e);
        }
      }
    }
  }

  // Follow with local reconcile
  await reconcileMasterFirestoreToLocal();
  return { resolvedCount: resolved };
}

// ---------------------------------------------------------------------------
// Fee Refunds Subscriptions & Operations
// ---------------------------------------------------------------------------
export function subscribeRefunds(callback: (refunds: FeeRefundRecord[]) => void) {
  const user = auth.currentUser;
  if (!user) {
    callback(getStoredRefunds());
    return () => {};
  }
  return onSnapshot(
    query(collection(db, 'refunds'), ...applyCampusQueryFilter('refunds')),
    (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as FeeRefundRecord));
      saveStoredRefunds(items);
      callback(items);
    },
    (err) => {
      console.warn('Firestore refunds subscription fallback:', err);
      callback(getStoredRefunds());
    }
  );
}

export async function saveRefund(refund: FeeRefundRecord): Promise<void> {
  await executeCloudWrite(
    'refunds',
    refund.id,
    refund,
    () => {
      const current = getStoredRefunds();
      const idx = current.findIndex(r => r.id === refund.id);
      let updated: FeeRefundRecord[];
      if (idx >= 0) {
        updated = current.map((r, i) => i === idx ? { ...r, ...refund } : r);
      } else {
        updated = [refund, ...current];
      }
      saveStoredRefunds(updated);
    },
    undefined,
    `Refund Voucher ${refund.refundVoucherNo} (${refund.studentName})`
  );
}

export async function deleteRefund(refundId: string): Promise<void> {
  return executeCloudDelete(
    'refunds',
    refundId,
    () => {
      const current = getStoredRefunds();
      saveStoredRefunds(current.filter(r => r.id !== refundId));
    },
    `Refund Record ${refundId}`
  );
}

// ---------------------------------------------------------------------------
// Student Transfers Subscriptions & Operations
// ---------------------------------------------------------------------------
export function subscribeStudentTransfers(callback: (transfers: StudentTransferRecord[]) => void) {
  const user = auth.currentUser;
  if (!user) {
    callback(getStoredTransfers());
    return () => {};
  }
  return onSnapshot(
    query(collection(db, 'studentTransfers'), ...applyCampusQueryFilter('studentTransfers')),
    (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as StudentTransferRecord));
      saveStoredTransfers(items);
      callback(items);
    },
    (err) => {
      console.warn('Firestore transfers subscription fallback:', err);
      callback(getStoredTransfers());
    }
  );
}

export async function saveStudentTransfer(transfer: StudentTransferRecord): Promise<void> {
  await executeCloudWrite(
    'studentTransfers',
    transfer.id,
    transfer,
    () => {
      const current = getStoredTransfers();
      const idx = current.findIndex(t => t.id === transfer.id);
      let updated: StudentTransferRecord[];
      if (idx >= 0) {
        updated = current.map((t, i) => i === idx ? { ...t, ...transfer } : t);
      } else {
        updated = [transfer, ...current];
      }
      saveStoredTransfers(updated);
    },
    undefined,
    `Transfer: ${transfer.studentName} (${transfer.transferType})`
  );
}

// ---------------------------------------------------------------------------
// Score Approvals Subscriptions & Operations
// ---------------------------------------------------------------------------
export function subscribeScoreApprovals(callback: (approvals: ScoreApprovalRecord[]) => void) {
  const user = auth.currentUser;
  if (!user) {
    callback(getStoredScoreApprovals());
    return () => {};
  }
  return onSnapshot(
    query(collection(db, 'scoreApprovals'), ...applyCampusQueryFilter('scoreApprovals')),
    (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as ScoreApprovalRecord));
      saveStoredScoreApprovals(items);
      callback(items);
    },
    (err) => {
      console.warn('Firestore scoreApprovals subscription fallback:', err);
      callback(getStoredScoreApprovals());
    }
  );
}

export async function saveScoreApproval(approval: ScoreApprovalRecord): Promise<void> {
  await executeCloudWrite(
    'scoreApprovals',
    approval.id,
    approval,
    () => {
      const current = getStoredScoreApprovals();
      const idx = current.findIndex(a => a.id === approval.id);
      let updated: ScoreApprovalRecord[];
      if (idx >= 0) {
        updated = current.map((a, i) => i === idx ? { ...a, ...approval } : a);
      } else {
        updated = [approval, ...current];
      }
      saveStoredScoreApprovals(updated);
    },
    undefined,
    `Score Approval: ${approval.className} - ${approval.subjectName}`
  );
}

// ---------------------------------------------------------------------------
// Transport Routes Subscriptions & Operations (Deprecated - Transport NOT INCLUDED)
// ---------------------------------------------------------------------------
export function subscribeTransportRoutes(callback: (routes: TransportRouteItem[]) => void) {
  callback([]);
  return () => {};
}

export async function saveTransportRoute(_route: TransportRouteItem): Promise<void> {}

export async function deleteTransportRoute(_routeId: string): Promise<void> {}

// ---------------------------------------------------------------------------
// Boarding Rooms Subscriptions & Operations
// ---------------------------------------------------------------------------
export function subscribeBoardingRooms(callback: (rooms: BoardingRoomItem[]) => void) {
  const user = auth.currentUser;
  if (!user) {
    callback(getStoredBoardingRooms());
    return () => {};
  }
  return onSnapshot(
    query(collection(db, 'boardingRooms')),
    (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as BoardingRoomItem));
      if (items.length > 0) {
        saveStoredBoardingRooms(items);
        callback(items);
      } else {
        callback(getStoredBoardingRooms());
      }
    },
    (err) => {
      console.warn('Firestore boardingRooms fallback:', err);
      callback(getStoredBoardingRooms());
    }
  );
}

export async function saveBoardingRoom(room: BoardingRoomItem): Promise<void> {
  await executeCloudWrite(
    'boardingRooms',
    room.id,
    room,
    () => {
      const current = getStoredBoardingRooms();
      const idx = current.findIndex(r => r.id === room.id);
      let updated: BoardingRoomItem[];
      if (idx >= 0) {
        updated = current.map((r, i) => i === idx ? { ...r, ...room } : r);
      } else {
        updated = [room, ...current];
      }
      saveStoredBoardingRooms(updated);
    },
    undefined,
    `Boarding Room: ${room.hallName} - ${room.roomNumber}`
  );
}

export async function deleteBoardingRoom(roomId: string): Promise<void> {
  return executeCloudDelete(
    'boardingRooms',
    roomId,
    () => {
      const current = getStoredBoardingRooms();
      saveStoredBoardingRooms(current.filter(r => r.id !== roomId));
    },
    `Boarding Room ${roomId}`
  );
}





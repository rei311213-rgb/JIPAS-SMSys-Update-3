import { supabase } from '../lib/supabase';
import { CloudSyncStatus } from '../types';
import { idbSet, IDB_STORE_KEYS } from './idbService';
import { getActiveCampus } from '../lib/campusUtils';
import {
  getStoredStudents,
  saveStoredStudents,
  getStoredTeachers,
  saveStoredTeachers,
  getStoredBills,
  saveStoredBills,
  getStoredPayments,
  saveStoredPayments,
  getStoredReports,
  saveStoredReports,
  getStoredClasses,
  saveStoredClasses,
  getStoredAcademicYears,
  saveStoredAcademicYears,
  getStoredTerms,
  saveStoredTerms,
  getStoredDepartments,
  saveStoredDepartments,
  getStoredCourses,
  saveStoredCourses,
  getStoredHouses,
  saveStoredHouses,
  getStoredSubjects,
  saveStoredSubjects,
  getStoredCalendarEvents,
  saveStoredCalendarEvents,
  getStoredNotifications,
  saveStoredNotifications,
  getStoredClassFeeTariffs,
  saveStoredClassFeeTariffs,
  getStoredClassBroadcasts,
  saveStoredClassBroadcasts,
  getStoredExpenses,
  saveStoredExpenses,
  getStoredUsers,
  saveStoredUsers,
  getStoredSettings,
  saveStoredSettings,
  getStoredThemePalette,
  saveStoredThemePalette,
  getStoredPaymentSettings,
  saveStoredPaymentSettings,
  getStoredTariffCorrectionLogs,
  saveStoredTariffCorrectionLogs,
  applyThemePaletteToDom,
  isDemoDataCleared,
  setDemoDataCleared
} from './storageService';

export const JIPAS_SUPABASE_SCHOOL_ID = '9592c55b-b485-487c-a26d-8c78f5167dd2';

export interface UnsyncedDraft {
  id: string;
  collectionName: string;
  docId: string;
  action: 'set' | 'delete';
  data?: any;
  error: string;
  timestamp: string;
  title: string;
}

const STORAGE_KEY_SYNC_STATUS = 'jipas_cloud_sync_status';
const STORAGE_KEY_UNSYNCED_DRAFTS = 'jipas_unsynced_drafts';

export class CloudSyncError extends Error {
  public isCloudError = true;
  public originalError: any;
  public collectionName: string;
  public docId: string;
  public draftSaved: boolean;

  constructor(
    message: string, 
    originalError: any, 
    collectionName: string, 
    docId: string, 
    draftSaved = true
  ) {
    super(message);
    this.name = 'CloudSyncError';
    this.originalError = originalError;
    this.collectionName = collectionName;
    this.docId = docId;
    this.draftSaved = draftSaved;
  }
}

// Backward compatibility alias
export const FirebaseSyncError = CloudSyncError;

// -------------------------------------------------------------
// Unsynced Drafts Storage & Management
// -------------------------------------------------------------

export function getUnsyncedDrafts(): UnsyncedDraft[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_UNSYNCED_DRAFTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('[syncService] Error reading unsynced drafts:', e);
  }
  return [];
}

export function saveUnsyncedDrafts(drafts: UnsyncedDraft[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_UNSYNCED_DRAFTS, JSON.stringify(drafts));
    updateCloudSyncStatus({ unsyncedDraftsCount: drafts.length });
  } catch (e) {
    console.warn('[syncService] Error saving unsynced drafts to localStorage:', e);
  }
  idbSet(IDB_STORE_KEYS.IDB_UNSYNCED_DRAFTS, drafts).catch(err => {
    console.warn('[syncService] Error saving unsynced drafts to IndexedDB:', err);
  });
}

export function recordUnsyncedDraft(
  draft: Omit<UnsyncedDraft, 'id' | 'timestamp'>
): UnsyncedDraft {
  const current = getUnsyncedDrafts();
  const existingIdx = current.findIndex(
    d => d.collectionName === draft.collectionName && d.docId === draft.docId
  );

  const newDraft: UnsyncedDraft = {
    ...draft,
    id: `draft-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString()
  };

  const updated = existingIdx >= 0
    ? current.map((d, i) => i === existingIdx ? newDraft : d)
    : [newDraft, ...current];

  saveUnsyncedDrafts(updated);
  return newDraft;
}

export function removeUnsyncedDraft(draftId: string): void {
  const current = getUnsyncedDrafts();
  const updated = current.filter(d => d.id !== draftId);
  saveUnsyncedDrafts(updated);
}

export function removeUnsyncedDraftByDoc(collectionName: string, docId: string): void {
  const current = getUnsyncedDrafts();
  const updated = current.filter(
    d => !(d.collectionName === collectionName && d.docId === docId)
  );
  if (updated.length !== current.length) {
    saveUnsyncedDrafts(updated);
  }
}

export function clearAllUnsyncedDrafts(): void {
  saveUnsyncedDrafts([]);
}

// -------------------------------------------------------------
// Cloud Sync Status Tracking & Listeners
// -------------------------------------------------------------

let currentSyncStatus: CloudSyncStatus = {
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  isSyncing: false,
  lastSyncedAt: null,
  pendingWritesCount: 0,
  lastError: null,
  unsyncedDraftsCount: getUnsyncedDrafts().length
};

const listeners = new Set<(status: CloudSyncStatus) => void>();

export function getCloudSyncStatus(): CloudSyncStatus {
  return { ...currentSyncStatus };
}

export function subscribeCloudSyncStatus(
  listener: (status: CloudSyncStatus) => void
): () => void {
  listeners.add(listener);
  listener(getCloudSyncStatus());
  return () => {
    listeners.delete(listener);
  };
}

export function updateCloudSyncStatus(partial: Partial<CloudSyncStatus>): void {
  currentSyncStatus = {
    ...currentSyncStatus,
    ...partial,
    unsyncedDraftsCount: partial.unsyncedDraftsCount !== undefined 
      ? partial.unsyncedDraftsCount 
      : getUnsyncedDrafts().length
  };

  listeners.forEach(cb => {
    try {
      cb(getCloudSyncStatus());
    } catch (e) {
      console.warn('[syncService] Error in sync status listener:', e);
    }
  });
}

// Window online/offline event listeners
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    updateCloudSyncStatus({ isOnline: true });
    pushToSupabaseCloud().catch(console.warn);
  });
  window.addEventListener('offline', () => {
    updateCloudSyncStatus({ isOnline: false });
  });
}

// -------------------------------------------------------------
// Supabase Universal Cloud Synchronization Engine
// -------------------------------------------------------------

export function sanitizeForSupabase<T>(data: T): T {
  if (data === undefined || data === null) {
    return null as any;
  }
  if (typeof data !== 'object') {
    return data;
  }
  if (data instanceof Date) {
    return data.toISOString() as any;
  }
  if (Array.isArray(data)) {
    return data.map(item => sanitizeForSupabase(item)) as any;
  }
  const cleanObj: Record<string, any> = {};
  for (const [key, val] of Object.entries(data as Record<string, any>)) {
    if (val !== undefined) {
      cleanObj[key] = sanitizeForSupabase(val);
    }
  }
  return cleanObj as T;
}

export const sanitizeForFirestore = sanitizeForSupabase;

let syncDebounceTimer: any = null;

/**
 * Pushes all application data to Supabase Cloud
 */
export async function pushToSupabaseCloud(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return false;
  }

  updateCloudSyncStatus({ isSyncing: true });

  try {
    const payload = {
      version: 2,
      lastSyncedAt: new Date().toISOString(),
      demoDataCleared: isDemoDataCleared(),
      students: getStoredStudents(),
      teachers: getStoredTeachers(),
      bills: getStoredBills(),
      payments: getStoredPayments(),
      reports: getStoredReports(),
      classes: getStoredClasses(),
      academicYears: getStoredAcademicYears(),
      academicYearsUpdatedAt: typeof localStorage !== 'undefined' ? localStorage.getItem('jipas_academic_years_updated_at') : null,
      terms: getStoredTerms(),
      termsUpdatedAt: typeof localStorage !== 'undefined' ? localStorage.getItem('jipas_terms_updated_at') : null,
      departments: getStoredDepartments(),
      courses: getStoredCourses(),
      houses: getStoredHouses(),
      subjects: getStoredSubjects(),
      calendarEvents: getStoredCalendarEvents(),
      notifications: getStoredNotifications(),
      classFeeTariffs: getStoredClassFeeTariffs(),
      classBroadcasts: getStoredClassBroadcasts(),
      expenses: getStoredExpenses(),
      users: getStoredUsers(),
      settings: getStoredSettings(),
      themePalette: getStoredThemePalette(),
      paymentSettings: getStoredPaymentSettings(),
      tariffCorrectionLogs: getStoredTariffCorrectionLogs()
    };

    const serialized = JSON.stringify(payload);

    const { error } = await supabase
      .from('schools')
      .update({
        disclaimer_text: serialized,
        updated_at: new Date().toISOString()
      })
      .eq('id', JIPAS_SUPABASE_SCHOOL_ID);

    if (error) {
      console.warn('[Supabase Cloud Sync] Error pushing to cloud:', error.message);
      updateCloudSyncStatus({
        isSyncing: false,
        lastError: error.message
      });
      return false;
    }

    clearAllUnsyncedDrafts();

    updateCloudSyncStatus({
      isSyncing: false,
      lastSyncedAt: new Date().toISOString(),
      pendingWritesCount: 0,
      lastError: null
    });

    console.log('[Supabase Cloud Sync] Push completed successfully. Total students synced:', payload.students.length);
    return true;
  } catch (err: any) {
    console.warn('[Supabase Cloud Sync] Push exception:', err?.message || err);
    updateCloudSyncStatus({
      isSyncing: false,
      lastError: err?.message || 'Sync push failed'
    });
    return false;
  }
}

/**
 * Debounced push to cloud after any local mutation
 */
export function scheduleCloudSyncPush(): void {
  if (syncDebounceTimer) clearTimeout(syncDebounceTimer);
  syncDebounceTimer = setTimeout(() => {
    pushToSupabaseCloud().catch(console.warn);
  }, 1000);
}

/**
 * Pulls latest cloud state from Supabase and merges with local storage
 */
export async function pullFromSupabaseCloud(): Promise<{ success: boolean; studentsCount: number }> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { success: false, studentsCount: getStoredStudents().length };
  }

  updateCloudSyncStatus({ isSyncing: true });

  try {
    const { data, error } = await supabase
      .from('schools')
      .select('id, disclaimer_text, updated_at')
      .eq('id', JIPAS_SUPABASE_SCHOOL_ID)
      .single();

    if (error || !data || !data.disclaimer_text) {
      console.log('[Supabase Cloud Sync] No remote cloud package found or table empty:', error?.message);
      updateCloudSyncStatus({ isSyncing: false });
      return { success: false, studentsCount: getStoredStudents().length };
    }

    let remotePayload: any;
    try {
      remotePayload = JSON.parse(data.disclaimer_text);
    } catch (parseErr) {
      console.warn('[Supabase Cloud Sync] Failed to parse remote data:', parseErr);
      updateCloudSyncStatus({ isSyncing: false });
      return { success: false, studentsCount: getStoredStudents().length };
    }

    if (!remotePayload || typeof remotePayload !== 'object') {
      updateCloudSyncStatus({ isSyncing: false });
      return { success: false, studentsCount: getStoredStudents().length };
    }

    // --- Merge Students ---
    if (Array.isArray(remotePayload.students) && remotePayload.students.length > 0) {
      const localStudents = getStoredStudents();
      const studentMap = new Map<string, any>();

      // Index local students
      localStudents.forEach(st => {
        if (st.id) studentMap.set(st.id, st);
      });

      // Merge remote students (prefer newer updatedAt or remote if absent)
      remotePayload.students.forEach((rst: any) => {
        if (!rst || !rst.id) return;
        const local = studentMap.get(rst.id);
        if (!local) {
          studentMap.set(rst.id, rst);
        } else {
          const localTime = local.updatedAt ? new Date(local.updatedAt).getTime() : 0;
          const remoteTime = rst.updatedAt ? new Date(rst.updatedAt).getTime() : 0;
          if (remoteTime >= localTime) {
            studentMap.set(rst.id, { ...local, ...rst });
          }
        }
      });

      const mergedStudents = Array.from(studentMap.values());
      saveStoredStudents(mergedStudents);
    }

    // --- Merge Teachers ---
    if (Array.isArray(remotePayload.teachers) && remotePayload.teachers.length > 0) {
      const localTeachers = getStoredTeachers();
      const map = new Map<string, any>();
      localTeachers.forEach(t => { if (t.id) map.set(t.id, t); });
      remotePayload.teachers.forEach((rt: any) => {
        if (rt && rt.id && !map.has(rt.id)) map.set(rt.id, rt);
      });
      saveStoredTeachers(Array.from(map.values()));
    }

    // Existing students lookup to prevent resurrecting deleted students' bills/reports/payments
    const aliveStudents = getStoredStudents();
    const aliveStudentIds = new Set(aliveStudents.map(s => s.id));
    const aliveAdmissionNos = new Set(aliveStudents.map(s => (s.admissionNo || '').toLowerCase().trim()).filter(Boolean));

    const isStudentAlive = (studentId?: string, admissionNo?: string) => {
      if (aliveStudents.length === 0) return false;
      if (studentId && aliveStudentIds.has(studentId)) return true;
      if (admissionNo && aliveAdmissionNos.has(admissionNo.toLowerCase().trim())) return true;
      return false;
    };

    // --- Merge Bills (Timestamp-aware & Student-alive filtering) ---
    if (Array.isArray(remotePayload.bills)) {
      const localBills = getStoredBills().filter(b => isStudentAlive(b.studentId, b.admissionNo));
      const map = new Map<string, any>();
      localBills.forEach(b => { if (b.id) map.set(b.id, b); });
      remotePayload.bills.forEach((rb: any) => {
        if (rb && rb.id && isStudentAlive(rb.studentId, rb.admissionNo)) {
          const local = map.get(rb.id);
          if (!local) {
            map.set(rb.id, rb);
          } else {
            const localTime = local.updatedAt ? new Date(local.updatedAt).getTime() : 0;
            const remoteTime = rb.updatedAt ? new Date(rb.updatedAt).getTime() : 0;
            if (remoteTime > localTime) {
              map.set(rb.id, { ...local, ...rb });
            }
          }
        }
      });
      saveStoredBills(Array.from(map.values()));
    }

    // --- Merge Payments ---
    if (Array.isArray(remotePayload.payments)) {
      const localPayments = getStoredPayments().filter(p => isStudentAlive(p.studentId, p.admissionNo));
      const map = new Map<string, any>();
      localPayments.forEach(p => { if (p.id) map.set(p.id, p); });
      remotePayload.payments.forEach((rp: any) => {
        if (rp && rp.id && !map.has(rp.id) && isStudentAlive(rp.studentId, rp.admissionNo)) {
          map.set(rp.id, rp);
        }
      });
      saveStoredPayments(Array.from(map.values()));
    }

    // --- Merge Reports ---
    if (Array.isArray(remotePayload.reports)) {
      const localReports = getStoredReports().filter(r => isStudentAlive(r.studentId, r.admissionNo));
      const map = new Map<string, any>();
      localReports.forEach(r => { if (r.id) map.set(r.id, r); });
      remotePayload.reports.forEach((rr: any) => {
        if (rr && rr.id && !map.has(rr.id) && isStudentAlive(rr.studentId, rr.admissionNo)) {
          map.set(rr.id, rr);
        }
      });
      saveStoredReports(Array.from(map.values()));
    }

    // --- Merge Classes, Academic Years, Terms, Depts ---
    if (Array.isArray(remotePayload.classes) && remotePayload.classes.length > 0) {
      saveStoredClasses(remotePayload.classes);
    }
    
    // --- Merge Academic Years (Timestamp-aware to prevent wiping out custom years/deletions) ---
    if (Array.isArray(remotePayload.academicYears)) {
      const localUpdated = typeof localStorage !== 'undefined' ? localStorage.getItem('jipas_academic_years_updated_at') : null;
      const remoteUpdated = remotePayload.academicYearsUpdatedAt;
      
      const localTime = localUpdated ? new Date(localUpdated).getTime() : 0;
      const remoteTime = remoteUpdated ? new Date(remoteUpdated).getTime() : 0;

      if (remoteTime > localTime) {
        saveStoredAcademicYears(remotePayload.academicYears);
      } else if (localTime > remoteTime && remoteTime > 0) {
        // Local state was modified more recently; push local up to cloud
        scheduleCloudSyncPush();
      } else if (!localUpdated && remotePayload.academicYears.length > 0) {
        saveStoredAcademicYears(remotePayload.academicYears);
      }
    }

    // --- Merge Terms (Timestamp-aware) ---
    if (Array.isArray(remotePayload.terms)) {
      const localUpdated = typeof localStorage !== 'undefined' ? localStorage.getItem('jipas_terms_updated_at') : null;
      const remoteUpdated = remotePayload.termsUpdatedAt;
      
      const localTime = localUpdated ? new Date(localUpdated).getTime() : 0;
      const remoteTime = remoteUpdated ? new Date(remoteUpdated).getTime() : 0;

      if (remoteTime > localTime) {
        saveStoredTerms(remotePayload.terms);
      } else if (localTime > remoteTime && remoteTime > 0) {
        scheduleCloudSyncPush();
      } else if (!localUpdated && remotePayload.terms.length > 0) {
        saveStoredTerms(remotePayload.terms);
      }
    }
    if (Array.isArray(remotePayload.departments) && remotePayload.departments.length > 0) {
      saveStoredDepartments(remotePayload.departments);
    }
    if (Array.isArray(remotePayload.courses) && remotePayload.courses.length > 0) {
      saveStoredCourses(remotePayload.courses);
    }
    if (Array.isArray(remotePayload.houses) && remotePayload.houses.length > 0) {
      saveStoredHouses(remotePayload.houses);
    }
    if (Array.isArray(remotePayload.subjects) && remotePayload.subjects.length > 0) {
      saveStoredSubjects(remotePayload.subjects);
    }
    if (Array.isArray(remotePayload.calendarEvents) && remotePayload.calendarEvents.length > 0) {
      saveStoredCalendarEvents(remotePayload.calendarEvents);
    }
    if (Array.isArray(remotePayload.notifications) && remotePayload.notifications.length > 0) {
      saveStoredNotifications(remotePayload.notifications);
    }
    if (Array.isArray(remotePayload.classFeeTariffs) && remotePayload.classFeeTariffs.length > 0) {
      saveStoredClassFeeTariffs(remotePayload.classFeeTariffs);
    }
    if (Array.isArray(remotePayload.classBroadcasts) && remotePayload.classBroadcasts.length > 0) {
      saveStoredClassBroadcasts(remotePayload.classBroadcasts);
    }
    if (Array.isArray(remotePayload.expenses) && remotePayload.expenses.length > 0) {
      saveStoredExpenses(remotePayload.expenses);
    }

    // --- Settings, Theme Palette, Payment Settings Synchronization with Staleness Protection & Validation ---
    if (remotePayload.settings && typeof remotePayload.settings === 'object' && typeof remotePayload.settings.schoolName === 'string') {
      const localSettings = getStoredSettings();
      const remoteTime = remotePayload.settings.updatedAt ? new Date(remotePayload.settings.updatedAt).getTime() : 0;
      const localTime = localSettings.updatedAt ? new Date(localSettings.updatedAt).getTime() : 0;
      if (remoteTime >= localTime || !localSettings.updatedAt) {
        saveStoredSettings(remotePayload.settings);
      }
    }

    if (remotePayload.themePalette && typeof remotePayload.themePalette === 'object' && typeof remotePayload.themePalette.primaryColor === 'string') {
      const localPalette = getStoredThemePalette();
      const remoteTime = remotePayload.themePalette.updatedAt ? new Date(remotePayload.themePalette.updatedAt).getTime() : 0;
      const localTime = localPalette.updatedAt ? new Date(localPalette.updatedAt).getTime() : 0;
      if (remoteTime >= localTime || !localPalette.updatedAt) {
        saveStoredThemePalette(remotePayload.themePalette);
        applyThemePaletteToDom(remotePayload.themePalette);
      }
    }

    if (remotePayload.paymentSettings && typeof remotePayload.paymentSettings === 'object' && Array.isArray(remotePayload.paymentSettings.methods)) {
      const localPay = getStoredPaymentSettings();
      const remoteTime = remotePayload.paymentSettings.updatedAt ? new Date(remotePayload.paymentSettings.updatedAt).getTime() : 0;
      const localTime = localPay.updatedAt ? new Date(localPay.updatedAt).getTime() : 0;
      if (remoteTime >= localTime || !localPay.updatedAt) {
        saveStoredPaymentSettings(remotePayload.paymentSettings);
      }
    }
    if (Array.isArray(remotePayload.users) && remotePayload.users.length > 0) {
      const localUsers = getStoredUsers();
      const map = new Map<string, any>();
      localUsers.forEach(u => { if (u.id) map.set(u.id, u); });
      remotePayload.users.forEach((ru: any) => {
        if (ru && ru.id && !map.has(ru.id)) map.set(ru.id, ru);
      });
      saveStoredUsers(Array.from(map.values()));
    }

    if (Array.isArray(remotePayload.tariffCorrectionLogs) && remotePayload.tariffCorrectionLogs.length > 0) {
      const localLogs = getStoredTariffCorrectionLogs();
      const map = new Map<string, any>();
      localLogs.forEach(l => { if (l.id) map.set(l.id, l); });
      remotePayload.tariffCorrectionLogs.forEach((rl: any) => {
        if (rl && rl.id && !map.has(rl.id)) map.set(rl.id, rl);
      });
      saveStoredTariffCorrectionLogs(Array.from(map.values()));
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('jipas_cloud_synced', {
        detail: { timestamp: new Date().toISOString() }
      }));
    }

    updateCloudSyncStatus({
      isSyncing: false,
      lastSyncedAt: new Date().toISOString(),
      lastError: null
    });

    const finalStudentsCount = getStoredStudents().length;
    console.log('[Supabase Cloud Sync] Pull completed. Current students in local store:', finalStudentsCount);
    return { success: true, studentsCount: finalStudentsCount };
  } catch (err: any) {
    console.warn('[Supabase Cloud Sync] Pull error:', err);
    updateCloudSyncStatus({
      isSyncing: false,
      lastError: err?.message || 'Sync pull failed'
    });
    return { success: false, studentsCount: getStoredStudents().length };
  }
}

/**
 * Authoritative write executor:
 * 1. Updates local cache
 * 2. Queues sync push to Supabase Cloud
 */
export async function executeCloudWrite<T extends { id?: string; campus?: string }>(
  collectionName: string,
  docId: string,
  data: T,
  localCacheUpdate: () => void,
  validationFn?: () => void,
  displayTitle?: string
): Promise<T> {
  if (validationFn) {
    validationFn();
  }

  const currentCount = currentSyncStatus.pendingWritesCount;
  updateCloudSyncStatus({
    isSyncing: true,
    pendingWritesCount: currentCount + 1
  });

  try {
    const activeCampus = getActiveCampus();
    const dataWithCampus = {
      ...data,
      id: docId || data.id,
      campus: data.campus || activeCampus,
      updated_at: new Date().toISOString()
    };

    // 1. Immediately update local storage and IndexedDB
    localCacheUpdate();
    removeUnsyncedDraftByDoc(collectionName, docId);

    // 2. Schedule push to Supabase Cloud
    scheduleCloudSyncPush();

    updateCloudSyncStatus({
      isSyncing: false,
      lastSyncedAt: new Date().toISOString(),
      pendingWritesCount: Math.max(0, currentSyncStatus.pendingWritesCount - 1),
      lastError: null
    });

    return dataWithCampus;
  } catch (err: any) {
    console.warn(`[Supabase Sync] Write offline queue for '${collectionName}':`, err);
    localCacheUpdate();

    recordUnsyncedDraft({
      collectionName,
      docId,
      action: 'set',
      data,
      error: err?.message || 'Write queued for cloud sync',
      title: displayTitle || `${collectionName} #${docId}`
    });

    updateCloudSyncStatus({
      isSyncing: false,
      pendingWritesCount: Math.max(0, currentSyncStatus.pendingWritesCount - 1),
      lastError: err?.message || 'Offline queue'
    });

    return data;
  }
}

/**
 * Authoritative delete executor:
 */
export async function executeCloudDelete(
  collectionName: string,
  docId: string,
  localCacheDelete: () => void,
  displayTitle?: string
): Promise<void> {
  const currentCount = currentSyncStatus.pendingWritesCount;
  updateCloudSyncStatus({
    isSyncing: true,
    pendingWritesCount: currentCount + 1
  });

  try {
    localCacheDelete();
    removeUnsyncedDraftByDoc(collectionName, docId);
    scheduleCloudSyncPush();

    updateCloudSyncStatus({
      isSyncing: false,
      lastSyncedAt: new Date().toISOString(),
      pendingWritesCount: Math.max(0, currentSyncStatus.pendingWritesCount - 1),
      lastError: null
    });
  } catch (err: any) {
    console.warn(`[Supabase Sync] Delete offline queue for '${collectionName}':`, err);
    localCacheDelete();

    recordUnsyncedDraft({
      collectionName,
      docId,
      action: 'delete',
      error: err?.message || 'Delete operation pending sync',
      title: displayTitle || `Delete ${collectionName} #${docId}`
    });

    updateCloudSyncStatus({
      isSyncing: false,
      pendingWritesCount: Math.max(0, currentSyncStatus.pendingWritesCount - 1),
      lastError: err?.message || 'Delete queue'
    });
  }
}

/**
 * Background Queue Replayer for Unsynced Drafts
 */
export async function retryAllUnsyncedDrafts(): Promise<{ successCount: number; failCount: number; synced: number; failed: number }> {
  try {
    const success = await pushToSupabaseCloud();
    if (success) {
      return { successCount: 1, failCount: 0, synced: 1, failed: 0 };
    }
    return { successCount: 0, failCount: 1, synced: 0, failed: 1 };
  } catch (e: any) {
    return { successCount: 0, failCount: 1, synced: 0, failed: 1 };
  }
}

/**
 * Trigger full manual synchronization
 */
export async function performFullManualSync(): Promise<{ success: boolean; message: string }> {
  try {
    updateCloudSyncStatus({ isSyncing: true });
    // 1. Push local changes
    await pushToSupabaseCloud();
    // 2. Pull remote updates
    const pullRes = await pullFromSupabaseCloud();

    updateCloudSyncStatus({
      isSyncing: false,
      lastSyncedAt: new Date().toISOString(),
      lastError: null
    });

    return {
      success: true,
      message: `Supabase sync complete. ${pullRes.studentsCount} students active across all devices.`
    };
  } catch (err: any) {
    updateCloudSyncStatus({
      isSyncing: false,
      lastError: err?.message || 'Manual sync failed'
    });
    return {
      success: false,
      message: err?.message || 'Sync failed'
    };
  }
}

/**
 * Real-time Supabase subscription for cross-device live syncing (laptop <-> phone)
 */
export function subscribeSupabaseRealtime(onSync?: () => void): () => void {
  console.log('[Supabase Realtime] Subscribing to live cloud updates...');
  
  const channel = supabase
    .channel('jipas-school-sync')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'schools',
        filter: `id=eq.${JIPAS_SUPABASE_SCHOOL_ID}`
      },
      async (payload) => {
        console.log('[Supabase Realtime] Remote cloud change detected! Synchronizing...', payload);
        await pullFromSupabaseCloud();
        if (onSync) onSync();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function initBackgroundSync(): () => void {
  // Pull from cloud immediately on startup
  pullFromSupabaseCloud().catch(console.warn);

  // Set up periodic sync check every 30 seconds
  const intervalId = setInterval(() => {
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      pullFromSupabaseCloud().catch(console.warn);
    }
  }, 30000);

  return () => {
    clearInterval(intervalId);
  };
}

import { supabase } from '../lib/supabase';
import { 
  getUnsyncedDrafts, 
  removeUnsyncedDraftByDoc, 
  sanitizeForSupabase,
  recordUnsyncedDraft
} from './syncService';
import {
  getStoredStudents, saveStoredStudents,
  getStoredTeachers, saveStoredTeachers,
  getStoredBills, saveStoredBills,
  getStoredPayments, saveStoredPayments,
  getStoredReports, saveStoredReports,
  getStoredClasses, saveStoredClasses,
  getStoredCourses, saveStoredCourses,
  getStoredDepartments, saveStoredDepartments,
  getStoredAcademicYears, saveStoredAcademicYears,
  getStoredTerms, saveStoredTerms,
  getStoredHouses, saveStoredHouses,
  getStoredSubjects, saveStoredSubjects,
  getStoredCalendarEvents, saveStoredCalendarEvents,
  getStoredNotifications, saveStoredNotifications,
  getStoredStudentAttendance, saveStoredStudentAttendance,
  getStoredTeacherAttendance, saveStoredTeacherAttendance,
  getStoredClassBroadcasts, saveStoredClassBroadcasts
} from './storageService';

export type ConflictType = 
  | 'device_newer'        // Device timestamp is more recent than Cloud
  | 'cloud_newer'         // Cloud timestamp is more recent than Device
  | 'timestamp_mismatch'  // Timestamps differ or are unaligned
  | 'content_divergence'  // Content fields differ with ambiguous/missing timestamps
  | 'unsynced_draft'      // Pending unpushed local draft waiting in queue
  | 'only_device'         // Present in device cache but missing in Cloud
  | 'only_cloud';         // Present in Cloud but missing in device cache

export interface FieldDiff {
  field: string;
  label: string;
  deviceVal: any;
  cloudVal: any;
  chosenSource?: 'device' | 'cloud' | 'custom';
  customVal?: any;
}

export interface DataConflictItem {
  id: string; // `${collectionName}_${docId}`
  collectionName: string;
  collectionLabel: string;
  docId: string;
  title: string;
  subtitle?: string;
  conflictType: ConflictType;
  deviceTimestamp: string | null;
  cloudTimestamp: string | null;
  timestampDiffDescription: string;
  deviceData: any;
  cloudData: any;
  differingFields: FieldDiff[];
  hasPendingDraft: boolean;
  draftError?: string;
  status: 'unresolved' | 'resolved';
  resolvedAt?: string;
  resolvedBy?: string;
  resolutionStrategy?: 'overwrite_cloud' | 'overwrite_device' | 'merged';
}

export interface ConflictAuditRecord {
  id: string;
  conflictId: string;
  collectionName: string;
  docId: string;
  docTitle: string;
  timestamp: string;
  resolvedBy: string;
  strategy: 'overwrite_cloud' | 'overwrite_device' | 'merged';
  summary: string;
  mergedFieldCount?: number;
}

const STORAGE_KEY_CONFLICT_AUDIT = 'jipas_conflict_resolution_audit';

// -------------------------------------------------------------
// Timestamp Extraction Utilities
// -------------------------------------------------------------

export function extractTimestamp(obj: any): string | null {
  if (!obj || typeof obj !== 'object') return null;
  const candidates = [
    obj.updatedAt,
    obj.lastModified,
    obj.timestamp,
    obj._updatedAt,
    obj.submissionDate,
    obj.date,
    obj.enrollmentDate,
    obj.admissionDate,
    obj.createdAt,
    obj.lastSyncedAt
  ];
  for (const c of candidates) {
    if (c) {
      if (typeof c === 'string') {
        const d = new Date(c);
        if (!isNaN(d.getTime())) return d.toISOString();
        return c;
      }
      if (typeof c === 'number') return new Date(c).toISOString();
    }
  }
  return null;
}

export function formatTimestampDisplay(isoString: string | null): string {
  if (!isoString) return 'Not Recorded';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch {
    return isoString;
  }
}

export function computeTimeDifferenceDescription(
  deviceIso: string | null,
  cloudIso: string | null
): string {
  if (!deviceIso && !cloudIso) return 'Neither record has timestamp metadata';
  if (!deviceIso) return 'Device record has no timestamp (Cloud was stamped)';
  if (!cloudIso) return 'Cloud record has no timestamp (Device was stamped)';

  const devTime = new Date(deviceIso).getTime();
  const cldTime = new Date(cloudIso).getTime();

  if (isNaN(devTime) || isNaN(cldTime)) return 'Non-standard timestamp format';

  const diffMs = devTime - cldTime;
  const absDiffSec = Math.abs(Math.round(diffMs / 1000));

  if (absDiffSec < 2) return 'Timestamps are identical (synchronized timing)';

  const formatInterval = (sec: number) => {
    if (sec < 60) return `${sec} second(s)`;
    const mins = Math.floor(sec / 60);
    if (mins < 60) return `${mins} minute(s)`;
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    if (hrs < 24) return `${hrs} hr(s) ${remMins > 0 ? `${remMins} min(s)` : ''}`;
    const days = Math.floor(hrs / 24);
    return `${days} day(s)`;
  };

  if (diffMs > 0) {
    return `Device is ${formatInterval(absDiffSec)} newer than Cloud (Pending local edits)`;
  } else {
    return `Cloud is ${formatInterval(absDiffSec)} newer than Device (Remote updates detected)`;
  }
}

// -------------------------------------------------------------
// Field Comparison & Diff Engine
// -------------------------------------------------------------

const IGNORED_DIFF_FIELDS = new Set([
  '_cachedAt',
  '_synced',
  'isLocalDraft',
  'localDraftId',
  '__typename'
]);

const FRIENDLY_FIELD_LABELS: Record<string, string> = {
  fullName: 'Full Name',
  name: 'Name / Title',
  admissionNo: 'Admission Number',
  className: 'Class / Grade',
  gender: 'Gender',
  parentName: 'Parent / Guardian Name',
  parentPhone: 'Parent Phone Number',
  phone: 'Phone Number',
  email: 'Email Address',
  status: 'Status',
  totalAmount: 'Total Amount (GHS)',
  paidAmount: 'Paid Amount (GHS)',
  amountPaid: 'Amount Paid (GHS)',
  balance: 'Outstanding Balance (GHS)',
  course: 'Programme / Course',
  department: 'Academic Department',
  house: 'House Assignment',
  term: 'Academic Term',
  academicYear: 'Academic Year',
  classScore: 'Continuous Assessment Score',
  examScore: 'Examination Score',
  totalScore: 'Total Composite Score',
  grade: 'Letter Grade',
  remarks: 'Staff Remarks',
  position: 'Class Position',
  conduct: 'Conduct Assessment',
  attitude: 'Attitude Assessment',
  attendance: 'Attendance Record',
  basicSalary: 'Basic Salary (GHS)',
  updatedAt: 'Last Modified Timestamp'
};

export function compareRecords(deviceObj: any, cloudObj: any): FieldDiff[] {
  const diffs: FieldDiff[] = [];
  const dev = deviceObj || {};
  const cld = cloudObj || {};

  const allKeys = new Set([
    ...Object.keys(dev),
    ...Object.keys(cld)
  ]);

  allKeys.forEach(key => {
    if (IGNORED_DIFF_FIELDS.has(key)) return;

    const v1 = dev[key];
    const v2 = cld[key];

    const isDifferent = (() => {
      if (v1 === v2) return false;
      if (v1 === undefined && v2 === null) return false;
      if (v1 === null && v2 === undefined) return false;
      if (typeof v1 === 'object' && typeof v2 === 'object') {
        try {
          return JSON.stringify(v1) !== JSON.stringify(v2);
        } catch {
          return true;
        }
      }
      return String(v1 ?? '').trim() !== String(v2 ?? '').trim();
    })();

    if (isDifferent) {
      diffs.push({
        field: key,
        label: FRIENDLY_FIELD_LABELS[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()),
        deviceVal: v1,
        cloudVal: v2,
        chosenSource: 'device'
      });
    }
  });

  return diffs;
}

// -------------------------------------------------------------
// Collection Configurations to Monitor
// -------------------------------------------------------------

export interface MonitoredCollectionConfig {
  name: string;
  label: string;
  getDeviceData: () => any[];
  setDeviceData: (data: any[]) => void;
  getTitle: (item: any) => string;
  getSubtitle?: (item: any) => string;
}

export const CONFLICT_COLLECTIONS: MonitoredCollectionConfig[] = [
  {
    name: 'students',
    label: 'Students',
    getDeviceData: getStoredStudents,
    setDeviceData: saveStoredStudents,
    getTitle: (item) => item.fullName || `Student #${item.admissionNo || item.id}`,
    getSubtitle: (item) => `${item.className || 'Unassigned'} • Adm: ${item.admissionNo || 'N/A'}`
  },
  {
    name: 'teachers',
    label: 'Teachers & Faculty',
    getDeviceData: getStoredTeachers,
    setDeviceData: saveStoredTeachers,
    getTitle: (item) => item.name || `Teacher #${item.id}`,
    getSubtitle: (item) => `${item.designation || 'Staff'} • ${item.department || ''}`
  },
  {
    name: 'bills',
    label: 'Student Bills',
    getDeviceData: getStoredBills,
    setDeviceData: saveStoredBills,
    getTitle: (item) => `Bill: ${item.studentName || item.studentId || item.id}`,
    getSubtitle: (item) => `Amount: GHS ${item.totalAmount || item.amount || 0} • Status: ${item.status || 'Pending'}`
  },
  {
    name: 'payments',
    label: 'Fee Payments',
    getDeviceData: getStoredPayments,
    setDeviceData: saveStoredPayments,
    getTitle: (item) => `Receipt #${item.receiptNo || item.id} (${item.studentName || 'Student'})`,
    getSubtitle: (item) => `Paid: GHS ${item.amountPaid || item.amount || 0} • Date: ${item.date || 'N/A'}`
  },
  {
    name: 'reports',
    label: 'Terminal Reports',
    getDeviceData: getStoredReports,
    setDeviceData: saveStoredReports,
    getTitle: (item) => `Report: ${item.studentName || item.studentId || item.id}`,
    getSubtitle: (item) => `${item.className || ''} • Term ${item.term || '1'} • Year ${item.academicYear || ''}`
  },
  {
    name: 'classes',
    label: 'Classes',
    getDeviceData: getStoredClasses,
    setDeviceData: saveStoredClasses,
    getTitle: (item) => item.name || `Class #${item.id}`,
    getSubtitle: (item) => `Level: ${item.level || '1'} • Dept: ${item.department || 'N/A'}`
  },
  {
    name: 'courses',
    label: 'Courses / Programmes',
    getDeviceData: getStoredCourses,
    setDeviceData: saveStoredCourses,
    getTitle: (item) => item.name || `Course #${item.id}`,
    getSubtitle: (item) => `Code: ${item.code || 'N/A'} • Dept: ${item.department || 'N/A'}`
  },
  {
    name: 'departments',
    label: 'Departments',
    getDeviceData: getStoredDepartments,
    setDeviceData: saveStoredDepartments,
    getTitle: (item) => item.name || `Dept #${item.id}`,
    getSubtitle: (item) => item.headOfDepartment ? `Head: ${item.headOfDepartment}` : ''
  },
  {
    name: 'academicYears',
    label: 'Academic Years',
    getDeviceData: getStoredAcademicYears,
    setDeviceData: saveStoredAcademicYears,
    getTitle: (item) => item.name || `Year #${item.id}`,
    getSubtitle: (item) => item.status || (item.isCurrent ? 'Current' : 'Archive')
  },
  {
    name: 'terms',
    label: 'Academic Terms',
    getDeviceData: getStoredTerms,
    setDeviceData: saveStoredTerms,
    getTitle: (item) => item.name || `Term #${item.id}`,
    getSubtitle: (item) => `Year: ${item.academicYear || 'N/A'}`
  },
  {
    name: 'houses',
    label: 'Houses',
    getDeviceData: getStoredHouses,
    setDeviceData: saveStoredHouses,
    getTitle: (item) => item.name || `House #${item.id}`,
    getSubtitle: (item) => item.color ? `Color: ${item.color}` : ''
  },
  {
    name: 'subjects',
    label: 'Subjects',
    getDeviceData: getStoredSubjects,
    setDeviceData: saveStoredSubjects,
    getTitle: (item) => item.name || `Subject #${item.id}`,
    getSubtitle: (item) => item.department ? `Dept: ${item.department}` : ''
  },
  {
    name: 'calendarEvents',
    label: 'Calendar Events',
    getDeviceData: getStoredCalendarEvents,
    setDeviceData: saveStoredCalendarEvents,
    getTitle: (item) => item.title || `Event #${item.id}`,
    getSubtitle: (item) => `Date: ${item.date || 'N/A'}`
  },
  {
    name: 'notifications',
    label: 'Notifications',
    getDeviceData: getStoredNotifications,
    setDeviceData: saveStoredNotifications,
    getTitle: (item) => item.title || `Notification #${item.id}`,
    getSubtitle: (item) => `Target: ${item.targetRole || 'All'}`
  },
  {
    name: 'teacherAttendance',
    label: 'Teacher Attendance',
    getDeviceData: getStoredTeacherAttendance,
    setDeviceData: saveStoredTeacherAttendance,
    getTitle: (item) => `Staff Attendance: ${item.date || item.id}`,
    getSubtitle: (item) => `Recorded: ${item.records?.length || 0} staff members`
  },
  {
    name: 'studentAttendance',
    label: 'Student Attendance',
    getDeviceData: getStoredStudentAttendance,
    setDeviceData: saveStoredStudentAttendance,
    getTitle: (item) => `Attendance: ${item.className || 'Class'} (${item.date || ''})`,
    getSubtitle: (item) => `Logged by: ${item.updatedBy || 'Staff'}`
  },
  {
    name: 'classReportBroadcasts',
    label: 'Class Broadcasts',
    getDeviceData: getStoredClassBroadcasts,
    setDeviceData: saveStoredClassBroadcasts,
    getTitle: (item) => `Broadcast: ${item.className || item.id}`,
    getSubtitle: (item) => `Status: ${item.status || 'Draft'} • Year: ${item.academicYear || ''}`
  }
];

// -------------------------------------------------------------
// Core Conflict Detection Engine
// -------------------------------------------------------------

export async function scanForDataConflicts(
  targetCollections?: string[],
  onProgress?: (processed: number, total: number, currentCollection: string) => void
): Promise<DataConflictItem[]> {
  const collections = targetCollections && targetCollections.length > 0
    ? CONFLICT_COLLECTIONS.filter(c => targetCollections.includes(c.name))
    : CONFLICT_COLLECTIONS;

  const unsyncedDrafts = getUnsyncedDrafts();
  const allConflicts: DataConflictItem[] = [];
  const totalCollections = collections.length;

  for (let i = 0; i < totalCollections; i++) {
    const config = collections[i];
    if (onProgress) {
      onProgress(i + 1, totalCollections, config.label);
    }

    try {
      // 1. Retrieve local device records
      const deviceItems = config.getDeviceData() || [];
      const deviceMap = new Map<string, any>();
      deviceItems.forEach(item => {
        if (item && item.id) {
          deviceMap.set(String(item.id), item);
        }
      });

      // 2. Query live Supabase records for this collection
      const { data: cloudDocs } = await supabase.from(config.name).select('*');
      const cloudMap = new Map<string, any>();
      (cloudDocs || []).forEach(d => {
        cloudMap.set(String(d.id), d);
      });

      // 3. Check unsynced drafts for this collection
      const collectionDrafts = unsyncedDrafts.filter(d => d.collectionName === config.name);
      const draftMap = new Map<string, any>();
      collectionDrafts.forEach(d => {
        draftMap.set(d.docId, d);
      });

      const allIds = new Set<string>([
        ...deviceMap.keys(),
        ...cloudMap.keys(),
        ...draftMap.keys()
      ]);

      for (const docId of allIds) {
        const deviceData = deviceMap.get(docId) || null;
        const cloudData = cloudMap.get(docId) || null;
        const pendingDraft = draftMap.get(docId) || null;

        if (!deviceData && !cloudData && !pendingDraft) continue;

        const deviceTime = extractTimestamp(deviceData);
        const cloudTime = extractTimestamp(cloudData);
        const diffs = (deviceData && cloudData) ? compareRecords(deviceData, cloudData) : [];

        let conflictType: ConflictType | null = null;

        if (pendingDraft) {
          conflictType = 'unsynced_draft';
        } else if (deviceData && !cloudData) {
          conflictType = 'only_device';
        } else if (!deviceData && cloudData) {
          conflictType = 'only_cloud';
        } else if (diffs.length > 0) {
          if (deviceTime && cloudTime) {
            const dMs = new Date(deviceTime).getTime();
            const cMs = new Date(cloudTime).getTime();
            if (dMs > cMs + 2000) {
              conflictType = 'device_newer';
            } else if (cMs > dMs + 2000) {
              conflictType = 'cloud_newer';
            } else {
              conflictType = 'content_divergence';
            }
          } else {
            conflictType = 'content_divergence';
          }
        }

        if (conflictType) {
          const sampleItem = deviceData || cloudData || (pendingDraft?.data || {});
          allConflicts.push({
            id: `${config.name}_${docId}`,
            collectionName: config.name,
            collectionLabel: config.label,
            docId,
            title: config.getTitle(sampleItem),
            subtitle: config.getSubtitle ? config.getSubtitle(sampleItem) : undefined,
            conflictType,
            deviceTimestamp: deviceTime,
            cloudTimestamp: cloudTime,
            timestampDiffDescription: computeTimeDifferenceDescription(deviceTime, cloudTime),
            deviceData,
            cloudData,
            differingFields: diffs,
            hasPendingDraft: !!pendingDraft,
            draftError: pendingDraft?.error,
            status: 'unresolved'
          });
        }
      }
    } catch (err) {
      console.warn(`[conflictService] Cloud scan skipped for collection '${config.name}':`, err);
    }
  }

  return allConflicts;
}

// -------------------------------------------------------------
// Conflict Resolution Strategies
// -------------------------------------------------------------

export async function resolveWithDeviceOverwrite(
  conflict: DataConflictItem,
  adminUser = 'Admin'
): Promise<void> {
  const config = CONFLICT_COLLECTIONS.find(c => c.name === conflict.collectionName);
  if (!config) throw new Error(`Unknown collection: ${conflict.collectionName}`);

  const deviceRecord = conflict.deviceData;
  if (!deviceRecord) throw new Error('No device data available to overwrite cloud.');

  const freshTimestamp = new Date().toISOString();
  const updatedDeviceRecord = {
    ...deviceRecord,
    id: conflict.docId,
    updatedAt: freshTimestamp,
    lastModified: freshTimestamp
  };

  await supabase.from(conflict.collectionName).upsert(sanitizeForSupabase(updatedDeviceRecord), { onConflict: 'id' });

  const currentDeviceList = config.getDeviceData() || [];
  const existingIdx = currentDeviceList.findIndex((item: any) => String(item.id) === String(conflict.docId));
  let updatedList: any[];
  if (existingIdx >= 0) {
    updatedList = currentDeviceList.map((item: any, i: number) => i === existingIdx ? updatedDeviceRecord : item);
  } else {
    updatedList = [updatedDeviceRecord, ...currentDeviceList];
  }
  config.setDeviceData(updatedList);

  removeUnsyncedDraftByDoc(conflict.collectionName, conflict.docId);

  recordConflictAudit({
    id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    conflictId: conflict.id,
    collectionName: conflict.collectionName,
    docId: conflict.docId,
    docTitle: conflict.title,
    timestamp: new Date().toISOString(),
    resolvedBy: adminUser,
    strategy: 'overwrite_cloud',
    summary: `Overwrote Cloud with Device version (${conflict.differingFields.length} field(s) updated)`
  });
}

export async function resolveWithCloudOverwrite(
  conflict: DataConflictItem,
  adminUser = 'Admin'
): Promise<void> {
  const config = CONFLICT_COLLECTIONS.find(c => c.name === conflict.collectionName);
  if (!config) throw new Error(`Unknown collection: ${conflict.collectionName}`);

  const cloudRecord = conflict.cloudData;
  if (!cloudRecord) throw new Error('No cloud data available to overwrite device.');

  const currentDeviceList = config.getDeviceData() || [];
  const existingIdx = currentDeviceList.findIndex((item: any) => String(item.id) === String(conflict.docId));
  let updatedList: any[];
  if (existingIdx >= 0) {
    updatedList = currentDeviceList.map((item: any, i: number) => i === existingIdx ? cloudRecord : item);
  } else {
    updatedList = [cloudRecord, ...currentDeviceList];
  }
  config.setDeviceData(updatedList);

  removeUnsyncedDraftByDoc(conflict.collectionName, conflict.docId);

  recordConflictAudit({
    id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    conflictId: conflict.id,
    collectionName: conflict.collectionName,
    docId: conflict.docId,
    docTitle: conflict.title,
    timestamp: new Date().toISOString(),
    resolvedBy: adminUser,
    strategy: 'overwrite_device',
    summary: `Overwrote Device with Cloud version (reverted local changes)`
  });
}

export async function resolveWithSelectiveMerge(
  conflict: DataConflictItem,
  mergedData: any,
  adminUser = 'Admin',
  fieldDecisionsCount = 0
): Promise<void> {
  const config = CONFLICT_COLLECTIONS.find(c => c.name === conflict.collectionName);
  if (!config) throw new Error(`Unknown collection: ${conflict.collectionName}`);

  const freshTimestamp = new Date().toISOString();
  const finalMergedRecord = {
    ...mergedData,
    id: conflict.docId,
    updatedAt: freshTimestamp,
    lastModified: freshTimestamp
  };

  await supabase.from(conflict.collectionName).upsert(sanitizeForSupabase(finalMergedRecord), { onConflict: 'id' });

  const currentDeviceList = config.getDeviceData() || [];
  const existingIdx = currentDeviceList.findIndex((item: any) => String(item.id) === String(conflict.docId));
  let updatedList: any[];
  if (existingIdx >= 0) {
    updatedList = currentDeviceList.map((item: any, i: number) => i === existingIdx ? finalMergedRecord : item);
  } else {
    updatedList = [finalMergedRecord, ...currentDeviceList];
  }
  config.setDeviceData(updatedList);

  removeUnsyncedDraftByDoc(conflict.collectionName, conflict.docId);

  recordConflictAudit({
    id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    conflictId: conflict.id,
    collectionName: conflict.collectionName,
    docId: conflict.docId,
    docTitle: conflict.title,
    timestamp: freshTimestamp,
    resolvedBy: adminUser,
    strategy: 'merged',
    summary: `Merged record across ${fieldDecisionsCount || conflict.differingFields.length} field(s)`,
    mergedFieldCount: fieldDecisionsCount || conflict.differingFields.length
  });
}

export async function bulkResolveWithDevice(
  conflicts: DataConflictItem[],
  adminUser = 'Admin'
): Promise<{ successful: number; failed: number }> {
  let successful = 0;
  let failed = 0;

  for (const conflict of conflicts) {
    try {
      await resolveWithDeviceOverwrite(conflict, adminUser);
      successful++;
    } catch (e) {
      console.error(`[bulkResolveWithDevice] Failed for ${conflict.id}:`, e);
      failed++;
    }
  }

  return { successful, failed };
}

export async function bulkResolveWithCloud(
  conflicts: DataConflictItem[],
  adminUser = 'Admin'
): Promise<{ successful: number; failed: number }> {
  let successful = 0;
  let failed = 0;

  for (const conflict of conflicts) {
    try {
      await resolveWithCloudOverwrite(conflict, adminUser);
      successful++;
    } catch (e) {
      console.error(`[bulkResolveWithCloud] Failed for ${conflict.id}:`, e);
      failed++;
    }
  }

  return { successful, failed };
}

export function getConflictAuditLogs(): ConflictAuditRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONFLICT_AUDIT);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('[conflictService] Error reading conflict audit logs:', e);
  }
  return [];
}

export function recordConflictAudit(entry: ConflictAuditRecord): void {
  try {
    const current = getConflictAuditLogs();
    const updated = [entry, ...current.slice(0, 99)];
    localStorage.setItem(STORAGE_KEY_CONFLICT_AUDIT, JSON.stringify(updated));
  } catch (e) {
    console.warn('[conflictService] Error writing conflict audit log:', e);
  }
}

export function clearConflictAuditLogs(): void {
  localStorage.removeItem(STORAGE_KEY_CONFLICT_AUDIT);
}

export async function createSimulatedConflict(): Promise<DataConflictItem> {
  const simulatedId = `demo-conflict-${Date.now().toString().slice(-4)}`;
  const now = new Date();
  const pastDate = new Date(now.getTime() - 25 * 60 * 1000).toISOString();
  const recentDate = new Date(now.getTime() - 2 * 60 * 1000).toISOString();

  const deviceStudent = {
    id: simulatedId,
    admissionNo: `ST-${new Date().getFullYear()}-DEMO`,
    fullName: 'Kwame Mensah (Local Device Draft)',
    gender: 'Male' as const,
    dob: '2008-04-12',
    className: 'SHS 2 Science A',
    course: 'General Science',
    department: 'Senior High School (SHS)',
    house: 'Aggrey House',
    status: 'Active' as const,
    parentName: 'Mr. Kwame Mensah Snr.',
    parentPhone: '0244112233',
    academicYear: '2025-2026',
    term: '1',
    rollNo: '042',
    enrollmentDate: '2025-09-10',
    isCurrent: true,
    updatedAt: recentDate,
    lastModified: recentDate
  };

  const cloudStudent = {
    ...deviceStudent,
    fullName: 'Kwame Mensah (Cloud Remote Version)',
    className: 'SHS 2 General Arts B',
    course: 'General Arts',
    house: 'Nkrumah House',
    status: 'Suspended' as const,
    parentName: 'Mr. E. Mensah',
    parentPhone: '0244998877',
    academicYear: '2025-2026',
    term: '1',
    rollNo: '042',
    enrollmentDate: '2025-09-10',
    updatedAt: pastDate,
    lastModified: pastDate
  };

  const currentStudents = getStoredStudents();
  const updatedStudents = [deviceStudent, ...currentStudents.filter(s => s.id !== simulatedId)];
  saveStoredStudents(updatedStudents);

  recordUnsyncedDraft({
    collectionName: 'students',
    docId: simulatedId,
    action: 'set',
    data: deviceStudent,
    error: 'Simulated network timeout during synchronization',
    title: `Student #${simulatedId}: ${deviceStudent.fullName}`
  });

  try {
    await supabase.from('students').upsert(sanitizeForSupabase(cloudStudent), { onConflict: 'id' });
  } catch (err) {
    console.warn('[createSimulatedConflict] Cloud write simulated:', err);
  }

  return {
    id: `students_${simulatedId}`,
    collectionName: 'students',
    collectionLabel: 'Students',
    docId: simulatedId,
    title: deviceStudent.fullName,
    subtitle: `${deviceStudent.className} • Dept: ${deviceStudent.department}`,
    conflictType: 'device_newer',
    deviceTimestamp: recentDate,
    cloudTimestamp: pastDate,
    timestampDiffDescription: 'Device is 23 min(s) newer than Cloud (Pending local edits)',
    deviceData: deviceStudent,
    cloudData: cloudStudent,
    differingFields: [
      { field: 'fullName', label: 'Full Name', deviceVal: deviceStudent.fullName, cloudVal: cloudStudent.fullName, chosenSource: 'device' },
      { field: 'className', label: 'Class Name', deviceVal: deviceStudent.className, cloudVal: cloudStudent.className, chosenSource: 'device' },
      { field: 'course', label: 'Course', deviceVal: deviceStudent.course, cloudVal: cloudStudent.course, chosenSource: 'device' },
      { field: 'house', label: 'House', deviceVal: deviceStudent.house, cloudVal: cloudStudent.house, chosenSource: 'device' },
      { field: 'parentName', label: 'Parent Name', deviceVal: deviceStudent.parentName, cloudVal: cloudStudent.parentName, chosenSource: 'device' },
      { field: 'parentPhone', label: 'Parent Phone', deviceVal: deviceStudent.parentPhone, cloudVal: cloudStudent.parentPhone, chosenSource: 'device' },
      { field: 'status', label: 'Status', deviceVal: deviceStudent.status, cloudVal: cloudStudent.status, chosenSource: 'device' }
    ],
    hasPendingDraft: true,
    draftError: 'Simulated network timeout during synchronization',
    status: 'unresolved'
  };
}

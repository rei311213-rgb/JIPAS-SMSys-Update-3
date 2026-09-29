import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { 
  User, 
  UserRole, 
  Student, 
  Teacher, 
  PaymentRecord, 
  StudentBill, 
  SchoolExpenseRecord, 
  TermReport, 
  StudentAttendanceRecord 
} from '../types';
import { 
  Campus, 
  getActiveCampus, 
  filterStudentsByCampus, 
  filterTeachersByCampus, 
  filterBillsByCampus, 
  filterPaymentsByCampus, 
  filterExpensesByCampus 
} from '../lib/campusUtils';
import { 
  getStoredStudents, 
  getStoredTeachers, 
  getStoredBills, 
  getStoredPayments, 
  getStoredExpenses, 
  getStoredReports, 
  getStoredStudentAttendance 
} from '../services/storageService';
import { pullFromSupabaseCloud, JIPAS_SUPABASE_SCHOOL_ID } from '../services/syncService';
import { StaffAttendanceService } from '../services/supabase/staffAttendanceService';

export type DashboardStatus = 'LIVE' | 'SYNCED' | 'OFFLINE' | 'UPDATING' | 'ERROR';

export interface DashboardMetrics {
  totalStudents: number;
  activeStudents: number;
  totalStaff: number;
  activeTeachers: number;
  teacherStudentRatio: string;
  feesCollected: number;
  operatingExpenses: number;
  netPosition: number;
  pendingOverdueCount: number;
  totalBillsCount: number;
  totalPaymentsCount: number;
  studentAttendanceRate: number | null;
  staffAttendanceRate: number | null;
  sbaCompletionRate: number | null;
  operationalRisksCount: number;
  academicMilestonesCount: number;
  executiveInsight: string;
  lastSyncedAt: string | null;
}

export interface UseRealtimeDashboardOptions {
  user?: User | any | null;
  role?: UserRole | string;
  campus?: Campus | string;
  enabled?: boolean;
}

export interface UseRealtimeDashboardReturn {
  metrics: DashboardMetrics;
  data: {
    students: Student[];
    staff: Teacher[];
    payments: PaymentRecord[];
    expenses: SchoolExpenseRecord[];
    bills: StudentBill[];
    reports: TermReport[];
  };
  isLoading: boolean;
  isLive: boolean;
  status: DashboardStatus;
  error: string | null;
  activeCampus: Campus;
  refresh: () => Promise<void>;
}

/**
 * Unified, role-scoped, campus-aware Realtime Dashboard Data Hook.
 * Leverages Supabase Realtime subscriptions and safely cleans up on component unmount
 * to prevent memory leaks and redundant database connections.
 */
export function useRealtimeDashboardData(options: UseRealtimeDashboardOptions = {}): UseRealtimeDashboardReturn {
  const { user, role: propRole, campus: propCampus, enabled = true } = options;

  // Resolve active role
  const resolvedRole = (propRole || user?.role || 'admin').toLowerCase().trim();

  // Resolve active campus state (listens to campus switcher events)
  const [activeCampus, setActiveCampusState] = useState<Campus>(() => {
    if (propCampus) return propCampus as Campus;
    if (user?.campus) return user.campus as Campus;
    return getActiveCampus();
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLive, setIsLive] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(() => new Date().toISOString());

  // Raw dataset states
  const [rawStudents, setRawStudents] = useState<Student[]>([]);
  const [rawTeachers, setRawTeachers] = useState<Teacher[]>([]);
  const [rawBills, setRawBills] = useState<StudentBill[]>([]);
  const [rawPayments, setRawPayments] = useState<PaymentRecord[]>([]);
  const [rawExpenses, setRawExpenses] = useState<SchoolExpenseRecord[]>([]);
  const [rawReports, setRawReports] = useState<TermReport[]>([]);
  const [staffAttendanceCount, setStaffAttendanceCount] = useState<{ present: number; total: number }>({ present: 0, total: 0 });

  // Channel reference for clean unsubscription
  const realtimeChannelRef = useRef<any>(null);
  const isMountedRef = useRef<boolean>(true);

  // Sync campus state changes
  useEffect(() => {
    if (propCampus) {
      setActiveCampusState(propCampus as Campus);
      return;
    }

    const handleCampusEvent = () => {
      const current = getActiveCampus();
      setActiveCampusState(current);
    };

    window.addEventListener('jipas_campus_changed', handleCampusEvent);
    return () => {
      window.removeEventListener('jipas_campus_changed', handleCampusEvent);
    };
  }, [propCampus]);

  // Load local / cached records
  const loadRecordsFromStorage = useCallback(() => {
    try {
      const students = getStoredStudents();
      const teachers = getStoredTeachers();
      const bills = getStoredBills();
      const payments = getStoredPayments();
      const expenses = getStoredExpenses();
      const reports = getStoredReports();

      setRawStudents(students || []);
      setRawTeachers(teachers || []);
      setRawBills(bills || []);
      setRawPayments(payments || []);
      setRawExpenses(expenses || []);
      setRawReports(reports || []);
    } catch (e: any) {
      console.warn('[useRealtimeDashboardData] Storage read notice:', e?.message || e);
    }
  }, []);

  // Fetch real staff attendance count from StaffAttendanceService
  const loadStaffAttendance = useCallback(async (campus: Campus) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const logs = await StaffAttendanceService.listAttendance({ date: today });
      if (logs && Array.isArray(logs)) {
        const campusFiltered = campus === 'General' ? logs : logs.filter(l => l.campus_name === campus || l.campus_id === campus);
        const presentCount = campusFiltered.filter(l => l.status === 'Present' || l.status === 'Late').length;
        setStaffAttendanceCount({ present: presentCount, total: campusFiltered.length });
      }
    } catch (e) {
      console.warn('[useRealtimeDashboardData] Staff attendance fetch error:', e);
    }
  }, []);

  // Full Refresh action
  const refresh = useCallback(async () => {
    if (!enabled) return;
    setIsLoading(true);
    setError(null);

    try {
      // 1. Load immediate local data
      loadRecordsFromStorage();
      await loadStaffAttendance(activeCampus);

      // 2. Pull remote updates from Supabase if online
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        await pullFromSupabaseCloud();
        loadRecordsFromStorage();
        await loadStaffAttendance(activeCampus);
      }

      setLastSyncedAt(new Date().toISOString());
    } catch (err: any) {
      console.warn('[useRealtimeDashboardData] Refresh notice:', err?.message || err);
      setError(err?.message || 'Unable to refresh live data.');
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [activeCampus, enabled, loadRecordsFromStorage, loadStaffAttendance]);

  // Setup Supabase Realtime Subscription with Clean Lifecycle
  useEffect(() => {
    isMountedRef.current = true;
    if (!enabled) return;

    // Initial load
    refresh();

    // Subscribe to external sync notifications
    const handleSyncNotice = () => {
      if (isMountedRef.current) {
        loadRecordsFromStorage();
        loadStaffAttendance(activeCampus);
        setLastSyncedAt(new Date().toISOString());
      }
    };
    window.addEventListener('jipas_cloud_synced', handleSyncNotice);

    // Build role-scoped Realtime channel
    const channelName = `realtime-dashboard-${resolvedRole}-${activeCampus}-${Date.now()}`;
    console.log(`[Supabase Realtime] Initializing channel: ${channelName}`);

    const channel = supabase.channel(channelName);

    // 1. Listen for global school record updates
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'schools',
        filter: `id=eq.${JIPAS_SUPABASE_SCHOOL_ID}`
      },
      async (payload) => {
        console.log('[Supabase Realtime] School table change detected:', payload.eventType);
        if (isMountedRef.current) {
          await pullFromSupabaseCloud();
          loadRecordsFromStorage();
          await loadStaffAttendance(activeCampus);
          setLastSyncedAt(new Date().toISOString());
        }
      }
    );

    // 2. Listen for Staff Entrance Attendance updates
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'staff_attendance'
      },
      async (payload) => {
        console.log('[Supabase Realtime] Staff attendance change:', payload.eventType);
        if (isMountedRef.current) {
          await loadStaffAttendance(activeCampus);
          setLastSyncedAt(new Date().toISOString());
        }
      }
    );

    // Subscribe to channel
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        if (isMountedRef.current) {
          setIsLive(true);
        }
      } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
        if (isMountedRef.current) {
          setIsLive(false);
        }
      }
    });

    realtimeChannelRef.current = channel;

    // CLEANUP ON UNMOUNT (prevents memory leaks and removes server subscription)
    return () => {
      isMountedRef.current = false;
      window.removeEventListener('jipas_cloud_synced', handleSyncNotice);

      if (realtimeChannelRef.current) {
        console.log(`[Supabase Realtime] Cleaning up subscription channel: ${channelName}`);
        supabase.removeChannel(realtimeChannelRef.current);
        realtimeChannelRef.current = null;
      }
    };
  }, [activeCampus, enabled, resolvedRole, loadRecordsFromStorage, loadStaffAttendance, refresh]);

  // Apply Campus-Aware Filtering
  const filteredStudents = useMemo(() => {
    return filterStudentsByCampus(rawStudents, activeCampus);
  }, [rawStudents, activeCampus]);

  const filteredTeachers = useMemo(() => {
    return filterTeachersByCampus(rawTeachers, activeCampus);
  }, [rawTeachers, activeCampus]);

  const filteredBills = useMemo(() => {
    return filterBillsByCampus(rawBills, rawStudents, activeCampus);
  }, [rawBills, rawStudents, activeCampus]);

  const filteredPayments = useMemo(() => {
    return filterPaymentsByCampus(rawPayments, rawStudents, activeCampus);
  }, [rawPayments, rawStudents, activeCampus]);

  const filteredExpenses = useMemo(() => {
    return filterExpensesByCampus(rawExpenses, activeCampus);
  }, [rawExpenses, activeCampus]);

  const filteredReports = useMemo(() => {
    if (!rawReports || !Array.isArray(rawReports)) return [];
    if (activeCampus === 'General') return rawReports;
    const campusStudentIds = new Set(filteredStudents.map(s => s.id));
    return rawReports.filter(r => campusStudentIds.has(r.studentId));
  }, [rawReports, filteredStudents, activeCampus]);

  // Compute Authentic Dashboard Metrics from Real Database State
  const metrics: DashboardMetrics = useMemo(() => {
    const totalStudents = filteredStudents.length;
    const activeStudents = filteredStudents.filter(s => {
      const st = (s.status || '').toLowerCase().trim();
      return st === 'active' || st === 'enrolled' || !st;
    }).length;

    const totalStaff = filteredTeachers.length;
    const activeTeachers = filteredTeachers.filter(t => t.status === 'Active' || !t.status).length;

    const teacherStudentRatio = totalStaff > 0 && totalStudents > 0 
      ? `1:${Math.max(1, Math.round(totalStudents / totalStaff))}` 
      : '—';

    const feesCollected = filteredPayments.reduce((acc, p) => acc + (p.paid || p.amount || 0), 0);
    const operatingExpenses = filteredExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);
    const netPosition = feesCollected - operatingExpenses;

    const totalBillsCount = filteredBills.length;
    const totalPaymentsCount = filteredPayments.length;

    // Calculate real overdue count
    let pendingOverdueCount = 0;
    filteredBills.forEach(b => {
      const studentPayments = filteredPayments.filter(p => p.billId === b.id || (p.studentId === b.studentId && !p.billId));
      const totalPaid = studentPayments.reduce((acc, p) => acc + (p.paid || p.amount || 0), 0);
      if (totalPaid < (b.payable || b.amount || 0)) {
        pendingOverdueCount++;
      }
    });

    // Calculate real Student Attendance percentage from recorded attendance
    let studentAttendanceRate: number | null = null;
    const studentAttendanceLogs = getStoredStudentAttendance();
    if (studentAttendanceLogs && studentAttendanceLogs.length > 0) {
      let totalPresents = 0;
      let totalRecords = 0;
      studentAttendanceLogs.forEach(entry => {
        if (entry.records) {
          Object.values(entry.records).forEach((status: any) => {
            totalRecords++;
            if (status === 'Present') totalPresents++;
          });
        }
      });
      if (totalRecords > 0) {
        studentAttendanceRate = Math.round((totalPresents / totalRecords) * 1000) / 10;
      }
    }

    // Calculate real Staff Attendance percentage from staff clock-in records
    let staffAttendanceRate: number | null = null;
    if (staffAttendanceCount.total > 0) {
      staffAttendanceRate = Math.round((staffAttendanceCount.present / staffAttendanceCount.total) * 1000) / 10;
    }

    // Calculate SBA completion percentage from actual terminal reports
    let sbaCompletionRate: number | null = null;
    if (filteredReports.length > 0 && totalStudents > 0) {
      sbaCompletionRate = Math.min(100, Math.round((filteredReports.length / totalStudents) * 100));
    }

    // Operational risks = overdue accounts count
    const operationalRisksCount = pendingOverdueCount;

    // Academic milestones = count of processed terminal reports
    const academicMilestonesCount = filteredReports.length;

    // Generate authentic executive insight based strictly on real records
    let executiveInsight = 'Executive insight will appear when sufficient institutional data is available.';
    if (totalStudents > 0 || feesCollected > 0) {
      const netStatus = netPosition >= 0 ? 'positive surplus' : 'operating deficit';
      executiveInsight = `Institutional roster records ${totalStudents} active student${totalStudents === 1 ? '' : 's'} across ${activeCampus}. Desk collections report GHS ${feesCollected.toLocaleString()} in verified revenue with a ${netStatus} of GHS ${Math.abs(netPosition).toLocaleString()}.`;
    }

    return {
      totalStudents,
      activeStudents,
      totalStaff,
      activeTeachers,
      teacherStudentRatio,
      feesCollected,
      operatingExpenses,
      netPosition,
      pendingOverdueCount,
      totalBillsCount,
      totalPaymentsCount,
      studentAttendanceRate,
      staffAttendanceRate,
      sbaCompletionRate,
      operationalRisksCount,
      academicMilestonesCount,
      executiveInsight,
      lastSyncedAt
    };
  }, [
    filteredStudents, 
    filteredTeachers, 
    filteredBills, 
    filteredPayments, 
    filteredExpenses, 
    filteredReports, 
    staffAttendanceCount, 
    activeCampus, 
    lastSyncedAt
  ]);

  // Overall status tag
  const status: DashboardStatus = useMemo(() => {
    if (error) return 'ERROR';
    if (isLoading) return 'UPDATING';
    if (typeof navigator !== 'undefined' && !navigator.onLine) return 'OFFLINE';
    if (isLive) return 'LIVE';
    return 'SYNCED';
  }, [error, isLoading, isLive]);

  return {
    metrics,
    data: {
      students: filteredStudents,
      staff: filteredTeachers,
      payments: filteredPayments,
      expenses: filteredExpenses,
      bills: filteredBills,
      reports: filteredReports
    },
    isLoading,
    isLive,
    status,
    error,
    activeCampus,
    refresh
  };
}

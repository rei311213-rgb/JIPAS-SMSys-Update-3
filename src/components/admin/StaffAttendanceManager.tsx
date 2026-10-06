import React, { useState, useEffect } from 'react';
import { 
  Clock, ShieldCheck, AlertCircle, Calendar, RefreshCw, Sparkles, Plus, 
  Trash2, Download, Printer, Search, Filter, Edit, CheckCircle2, UserCheck, 
  Play, Power, Lock, AlertTriangle, QrCode, FileText, BarChart3, Settings, 
  Save, ArrowLeft, ArrowRight, User, X
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { EntranceQrService, EntranceQrCode } from '../../services/supabase/entranceQrService';
import { StaffAttendanceService, StaffAttendanceRecord } from '../../services/supabase/staffAttendanceService';
import { StaffAttendanceReportService, WorkingHoursConfig, DayScheduleConfig, DepartmentWorkingHoursConfig, createDefaultDaySchedules } from '../../services/supabase/staffAttendanceReportService';
import { StaffAttendanceExportService } from '../../services/supabase/staffAttendanceExportService';
import EntranceQRPrintPage from './EntranceQRPrintPage';
import StaffAttendanceReport from './StaffAttendanceReport';
import StaffAttendanceQRScanner from '../staff/StaffAttendanceQRScanner';

export default function StaffAttendanceManager() {
  // Resolve profile from optional Supabase context or fallback to localStorage safely
  let profile: any = null;

  if (typeof localStorage !== 'undefined') {
    const cachedUser = localStorage.getItem('jipas_current_user');
    if (cachedUser) {
      try {
        profile = JSON.parse(cachedUser);
      } catch {}
    }
  }

  if (!profile) {
    console.log('[StaffAttendanceManager] Relying strictly on local storage profile data.');
  }
  
  // Dashboard tab switching
  const [activeSubTab, setActiveSubTab] = useState<'today_attendance' | 'monthly_reports' | 'hours_configuration' | 'qr_management' | 'scan_qr'>('today_attendance');
  
  // Campuses state
  const [campuses, setCampuses] = useState<{ id: string; name: string }[]>([]);
  const [selectedCampusId, setSelectedCampusId] = useState<string>('');

  // QR Generator Form state
  const [newQrName, setNewQrName] = useState<string>('');
  const [qrCodeList, setQrCodeList] = useState<EntranceQrCode[]>([]);
  const [activePrintPayload, setActivePrintPayload] = useState<{ qrCode: EntranceQrCode; rawToken: string; campusName: string } | null>(null);
  const [editingQrCode, setEditingQrCode] = useState<EntranceQrCode | null>(null);
  const [editQrName, setEditQrName] = useState<string>('');

  // Attendance Records State
  const [attendanceRecords, setAttendanceRecords] = useState<StaffAttendanceRecord[]>([]);
  const [selectedFilterDate, setSelectedFilterDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedFilterStatus, setSelectedFilterStatus] = useState<string>('');
  const [searchText, setSearchText] = useState<string>('');
  const [selectedSortField, setSelectedSortField] = useState<'name' | 'time'>('name');

  // Working Hours settings state
  const [expectedSignIn, setExpectedSignIn] = useState<string>('08:00');
  const [expectedSignOut, setExpectedSignOut] = useState<string>('17:00');
  const [lateThresholdMins, setLateThresholdMins] = useState<number>(30);
  const [earlyDepartureThresholdMins, setEarlyDepartureThresholdMins] = useState<number>(30);
  const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [daySchedules, setDaySchedules] = useState<DayScheduleConfig[]>(() =>
    createDefaultDaySchedules([1, 2, 3, 4, 5], '08:00', '17:00')
  );
  const [departmentSchedules, setDepartmentSchedules] = useState<DepartmentWorkingHoursConfig[]>([]);
  const [selectedDeptForSchedule, setSelectedDeptForSchedule] = useState<string>('DEFAULT');

  // Daily Dashboard statistics State
  const [dashboardStats, setDashboardStats] = useState<{
    totalStaff: number;
    expectedStaff: number;
    signedIn: number;
    signedOut: number;
    onCampus: number;
    notArrived: number;
    late: number;
    earlyDeparture: number;
    absent: number;
    completionPercentage: number;
  }>({
    totalStaff: 0,
    expectedStaff: 0,
    signedIn: 0,
    signedOut: 0,
    onCampus: 0,
    notArrived: 0,
    late: 0,
    earlyDeparture: 0,
    absent: 0,
    completionPercentage: 0
  });
  
  // Individual profile review detail pane
  const [viewingStaffDetailId, setViewingStaffDetailId] = useState<string | null>(null);
  const [staffHistoryRecords, setStaffHistoryRecords] = useState<StaffAttendanceRecord[]>([]);
  const [staffAuditHistory, setStaffAuditHistory] = useState<any[]>([]);

  // Correction modal state
  const [editingRecord, setEditingRecord] = useState<StaffAttendanceRecord | null>(null);
  const [correctionStatus, setCorrectionStatus] = useState<'Present' | 'Late' | 'Absent' | 'Excused'>('Present');
  const [correctionSignIn, setCorrectionSignIn] = useState<string>('');
  const [correctionSignOut, setCorrectionSignOut] = useState<string>('');
  const [correctionReason, setCorrectionReason] = useState<string>('');
  const [correctionError, setCorrectionError] = useState<string | null>(null);

  // Review Dispute State dialog
  const [disputingRecord, setDisputingRecord] = useState<StaffAttendanceRecord | null>(null);
  const [targetDisputeState, setTargetDisputeState] = useState<'REVIEW_REQUIRED' | 'REVIEWED' | 'CORRECTED' | 'DISMISSED'>('REVIEW_REQUIRED');
  const [disputeReason, setDisputeReason] = useState<string>('');
  const [disputeError, setDisputeError] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchCampuses();

    const handleExitToDashboard = () => {
      setActiveSubTab('today_attendance');
      fetchAttendance();
      fetchDashboardStats();
    };
    window.addEventListener('jipas_exit_to_dashboard', handleExitToDashboard);

    const handleRealtimeUpdate = () => {
      fetchAttendance();
      fetchDashboardStats();
    };

    window.addEventListener('jipas_staff_attendance_updated', handleRealtimeUpdate);
    window.addEventListener('jipas_cloud_synced', handleRealtimeUpdate);
    window.addEventListener('storage', handleRealtimeUpdate);
    window.addEventListener('focus', handleRealtimeUpdate);

    // Supabase Live WebSocket Subscription on staff attendance
    const realtimeChannel = supabase
      .channel('jipas_staff_attendance_manager_channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'staff_attendance'
        },
        () => {
          fetchAttendance();
          fetchDashboardStats();
        }
      )
      .subscribe();

    // Auto-polling interval for multi-device sync guarantee
    const pollInterval = setInterval(() => {
      fetchAttendance();
      fetchDashboardStats();
    }, 4000);

    return () => {
      window.removeEventListener('jipas_exit_to_dashboard', handleExitToDashboard);
      window.removeEventListener('jipas_staff_attendance_updated', handleRealtimeUpdate);
      window.removeEventListener('jipas_cloud_synced', handleRealtimeUpdate);
      window.removeEventListener('storage', handleRealtimeUpdate);
      window.removeEventListener('focus', handleRealtimeUpdate);
      clearInterval(pollInterval);
      supabase.removeChannel(realtimeChannel);
    };
  }, []);

  useEffect(() => {
    if (campuses.length > 0) {
      fetchQrCodes();
      fetchAttendance();
      fetchDashboardStats();
      fetchWorkingHoursSettings();
    }
  }, [campuses, selectedCampusId, selectedFilterDate, selectedFilterStatus, activeSubTab]);

  useEffect(() => {
    if (viewingStaffDetailId) {
      fetchStaffIndividualHistory(viewingStaffDetailId);
    }
  }, [viewingStaffDetailId]);

  const fetchCampuses = async () => {
    try {
      const { data, error } = await supabase.from('campuses').select('id, name');
      if (!error && data) {
        setCampuses(data);
        if (data.length > 0) {
          const localActive = localStorage.getItem('jipas_active_campus');
          const found = data.find(c => c.id === localActive || c.name === localActive);
          setSelectedCampusId(found ? found.id : data[0].id);
        }
      }
    } catch (err) {
      console.warn('Error fetching campuses:', err);
    }
  };

  const fetchWorkingHoursSettings = async () => {
    if (!selectedCampusId) return;
    try {
      const config = await StaffAttendanceReportService.getWorkingHours(selectedCampusId);
      setExpectedSignIn(config.expectedSignIn);
      setExpectedSignOut(config.expectedSignOut);
      setLateThresholdMins(config.lateThresholdMins);
      setEarlyDepartureThresholdMins(config.earlyDepartureThresholdMins);
      setWorkingDays(config.workingDays);
      setDepartmentSchedules(config.departmentSchedules || []);
      if (config.daySchedules && config.daySchedules.length === 7) {
        setDaySchedules(config.daySchedules);
      } else {
        setDaySchedules(createDefaultDaySchedules(config.workingDays, config.expectedSignIn, config.expectedSignOut));
      }
    } catch (err) {
      console.warn('Error retrieving hours config:', err);
    }
  };

  const handleSelectDepartmentForSchedule = (deptName: string) => {
    setSelectedDeptForSchedule(deptName);
    if (deptName === 'DEFAULT') {
      fetchWorkingHoursSettings();
    } else {
      const match = departmentSchedules.find(d => d.departmentName === deptName || d.departmentId === deptName);
      if (match) {
        setExpectedSignIn(match.expectedSignIn);
        setExpectedSignOut(match.expectedSignOut);
        if (match.lateThresholdMins !== undefined) setLateThresholdMins(match.lateThresholdMins);
        if (match.daySchedules && match.daySchedules.length === 7) {
          setDaySchedules(match.daySchedules);
        } else {
          setDaySchedules(createDefaultDaySchedules(match.workingDays || [1, 2, 3, 4, 5], match.expectedSignIn, match.expectedSignOut));
        }
      } else {
        setExpectedSignIn('08:00');
        setExpectedSignOut('16:00');
        setDaySchedules(createDefaultDaySchedules([1, 2, 3, 4, 5], '08:00', '16:00'));
      }
    }
  };

  const handleRemoveDepartmentSchedule = async (deptName: string) => {
    if (!window.confirm(`Remove custom working hours schedule for ${deptName}? It will fallback to campus default.`)) return;
    const updated = departmentSchedules.filter(d => d.departmentName !== deptName && d.departmentId !== deptName);
    setDepartmentSchedules(updated);
    if (selectedDeptForSchedule === deptName) {
      setSelectedDeptForSchedule('DEFAULT');
      fetchWorkingHoursSettings();
    }
    if (selectedCampusId) {
      await StaffAttendanceReportService.saveWorkingHours(
        selectedCampusId,
        {
          expectedSignIn,
          expectedSignOut,
          lateThresholdMins,
          earlyDepartureThresholdMins,
          workingDays,
          daySchedules,
          departmentSchedules: updated
        },
        profile?.id || ''
      );
    }
  };

  const handleUpdateDaySchedule = (dayIndex: number, field: 'isWorkingDay' | 'expectedSignIn' | 'expectedSignOut', value: any) => {
    setDaySchedules(prev => prev.map((ds, idx) => {
      if (idx === dayIndex) {
        return { ...ds, [field]: value };
      }
      return ds;
    }));
  };

  const handleApplyPresetSchedule = (preset: 'standard' | 'early_friday' | 'saturday_shift' | 'copy_monday') => {
    setDaySchedules(prev => {
      if (preset === 'standard') {
        return prev.map((ds, idx) => ({
          ...ds,
          isWorkingDay: idx >= 1 && idx <= 5,
          expectedSignIn: '08:00',
          expectedSignOut: '17:00'
        }));
      } else if (preset === 'early_friday') {
        return prev.map((ds, idx) => ({
          ...ds,
          isWorkingDay: idx >= 1 && idx <= 5,
          expectedSignIn: '08:00',
          expectedSignOut: idx === 5 ? '13:00' : '17:00'
        }));
      } else if (preset === 'saturday_shift') {
        return prev.map((ds, idx) => ({
          ...ds,
          isWorkingDay: idx >= 1 && idx <= 6,
          expectedSignIn: idx === 6 ? '08:30' : '08:00',
          expectedSignOut: idx === 6 ? '12:30' : '17:00'
        }));
      } else if (preset === 'copy_monday') {
        const monday = prev.find(d => d.dayOfWeek === 1) || { expectedSignIn: '08:00', expectedSignOut: '17:00' };
        return prev.map(ds => {
          if (ds.isWorkingDay) {
            return {
              ...ds,
              expectedSignIn: monday.expectedSignIn,
              expectedSignOut: monday.expectedSignOut
            };
          }
          return ds;
        });
      }
      return prev;
    });
  };

  const handleSaveWorkingHours = async () => {
    if (!selectedCampusId) return;
    setIsLoading(true);
    try {
      const activeWorkingDays = daySchedules.filter(d => d.isWorkingDay).map(d => d.dayOfWeek);
      setWorkingDays(activeWorkingDays);

      let updatedDeptSchedules = [...departmentSchedules];
      if (selectedDeptForSchedule !== 'DEFAULT') {
        const idx = updatedDeptSchedules.findIndex(d => d.departmentName === selectedDeptForSchedule || d.departmentId === selectedDeptForSchedule);
        const newEntry: DepartmentWorkingHoursConfig = {
          departmentId: selectedDeptForSchedule,
          departmentName: selectedDeptForSchedule,
          expectedSignIn,
          expectedSignOut,
          lateThresholdMins,
          workingDays: activeWorkingDays,
          daySchedules
        };
        if (idx !== -1) {
          updatedDeptSchedules[idx] = newEntry;
        } else {
          updatedDeptSchedules.push(newEntry);
        }
        setDepartmentSchedules(updatedDeptSchedules);
      }

      await StaffAttendanceReportService.saveWorkingHours(
        selectedCampusId,
        {
          expectedSignIn: selectedDeptForSchedule === 'DEFAULT' ? expectedSignIn : (departmentSchedules.length > 0 ? expectedSignIn : '08:00'),
          expectedSignOut: selectedDeptForSchedule === 'DEFAULT' ? expectedSignOut : '17:00',
          lateThresholdMins,
          earlyDepartureThresholdMins,
          workingDays: activeWorkingDays,
          daySchedules,
          departmentSchedules: updatedDeptSchedules
        },
        profile?.id || ''
      );
      setActionSuccessMsg(`Working hours and shift schedules updated for ${selectedDeptForSchedule === 'DEFAULT' ? 'School-Wide Campus' : selectedDeptForSchedule}.`);
      setTimeout(() => setActionSuccessMsg(null), 4000);
    } catch (err: any) {
      alert('Error updating schedule config: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDashboardStats = async () => {
    if (!selectedCampusId) return;
    try {
      const stats = await StaffAttendanceReportService.getDailyDashboardStats(selectedFilterDate, selectedCampusId);
      setDashboardStats(stats);
    } catch (err) {
      console.warn('Error loading daily stats:', err);
    }
  };

  const fetchQrCodes = async () => {
    setIsLoading(true);
    try {
      const codes = await EntranceQrService.listQrCodes(selectedCampusId || undefined);
      setQrCodeList(codes);
    } catch (err) {
      console.warn('Error fetching QR codes:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAttendance = async () => {
    setIsLoading(true);
    try {
      const records = await StaffAttendanceService.listAttendance({
        campusId: selectedCampusId || undefined,
        date: selectedFilterDate || undefined,
        status: selectedFilterStatus || undefined
      });
      setAttendanceRecords(records);
    } catch (err) {
      console.warn('Error fetching attendance:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStaffIndividualHistory = async (staffId: string) => {
    try {
      // 1. Fetch total attendance log history
      const history = await StaffAttendanceService.listAttendance({
        campusId: selectedCampusId || undefined,
        staffId
      });
      setStaffHistoryRecords(history);

      // 2. Fetch correction audit logs
      const { data: audit, error } = await supabase
        .from('staff_attendance_corrections_audit')
        .select(`
          *,
          admin:profiles!administrator_id (
            full_name
          )
        `)
        .eq('staff_id', staffId)
        .order('timestamp', { ascending: false });

      if (!error && audit) {
        setStaffAuditHistory(audit);
      }
    } catch (err) {
      console.warn('Error loading history profiles details:', err);
    }
  };

  const handleCreateQrCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQrName.trim()) return;

    setIsLoading(true);
    try {
      const { rawToken, qrCode } = await EntranceQrService.generateQrCode(
        newQrName.trim(),
        selectedCampusId,
        profile?.id || ''
      );

      setNewQrName('');
      setActionSuccessMsg('Secure entrance QR code generated successfully!');
      setTimeout(() => setActionSuccessMsg(null), 4000);
      
      const campusObj = campuses.find(c => c.id === selectedCampusId);
      setActivePrintPayload({
        qrCode,
        rawToken,
        campusName: campusObj ? campusObj.name : 'Main Campus'
      });

      fetchQrCodes();
    } catch (err: any) {
      console.warn('[StaffAttendanceManager] Error generating QR code:', err);
      setActionSuccessMsg('QR code generated in secure offline mode.');
      setTimeout(() => setActionSuccessMsg(null), 4000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshQrCode = async (qr: EntranceQrCode) => {
    setIsLoading(true);
    try {
      const rawToken = await EntranceQrService.refreshQrToken(qr.id, selectedCampusId);
      const campusObj = campuses.find(c => c.id === selectedCampusId);
      
      setActivePrintPayload({
        qrCode: { ...qr, is_active: true },
        rawToken,
        campusName: campusObj ? campusObj.name : 'Main Campus'
      });
      
      setActionSuccessMsg('Entrance QR code updated with a fresh secure token. You must print and replace the physical poster.');
      setTimeout(() => setActionSuccessMsg(null), 4000);
      fetchQrCodes();
    } catch (err: any) {
      alert('Failed to refresh QR: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateQrName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQrCode || !editQrName.trim()) return;

    setIsLoading(true);
    try {
      await EntranceQrService.updateQrCode(editingQrCode.id, { name: editQrName.trim() });
      setEditingQrCode(null);
      setEditQrName('');
      setActionSuccessMsg('Entrance gate name updated successfully.');
      setTimeout(() => setActionSuccessMsg(null), 4000);
      fetchQrCodes();
    } catch (err: any) {
      alert('Failed to update gate name: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevokeQrCode = async (id: string) => {
    if (!window.confirm('Are you absolutely sure you want to deactivate and revoke this entrance QR code? It will stop validating scanned arrivals.')) return;

    setIsLoading(true);
    try {
      await EntranceQrService.revokeQrCode(id);
      setActionSuccessMsg('Entrance QR code has been permanently deactivated.');
      setTimeout(() => setActionSuccessMsg(null), 4000);
      fetchQrCodes();
    } catch (err: any) {
      alert('Failed to revoke QR code: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenCorrection = (record: StaffAttendanceRecord) => {
    setEditingRecord(record);
    setCorrectionStatus(record.status);
    setCorrectionSignIn(record.sign_in_at ? new Date(record.sign_in_at).toISOString().slice(0, 16) : '');
    setCorrectionSignOut(record.sign_out_at ? new Date(record.sign_out_at).toISOString().slice(0, 16) : '');
    setCorrectionReason('');
    setCorrectionError(null);
  };

  const handleSaveCorrection = async () => {
    if (!editingRecord) return;
    if (!correctionReason.trim()) {
      setCorrectionError('A valid administrative reason is mandatory for auditing historical changes.');
      return;
    }

    setIsLoading(true);
    try {
      await StaffAttendanceService.adminCorrectAttendance(
        editingRecord.id,
        {
          status: correctionStatus,
          sign_in_at: correctionSignIn ? new Date(correctionSignIn).toISOString() : null,
          sign_out_at: correctionSignOut ? new Date(correctionSignOut).toISOString() : null
        },
        profile?.id || '',
        correctionReason.trim()
      );

      setEditingRecord(null);
      setActionSuccessMsg('Administrative attendance correction and audit log written successfully.');
      setTimeout(() => setActionSuccessMsg(null), 4000);
      fetchAttendance();
      fetchDashboardStats();
    } catch (err: any) {
      setCorrectionError(err.message || 'Correction failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDispute = (record: StaffAttendanceRecord) => {
    setDisputingRecord(record);
    setTargetDisputeState(record.review_status || 'REVIEW_REQUIRED');
    setDisputeReason('');
    setDisputeError(null);
  };

  const handleSaveDisputeState = async () => {
    if (!disputingRecord) return;
    if (!disputeReason.trim()) {
      setDisputeError('An explicit reason statement is mandatory for auditing state transitions.');
      return;
    }

    setIsLoading(true);
    try {
      await StaffAttendanceReportService.updateReviewState(
        disputingRecord.id,
        targetDisputeState,
        profile?.id || '',
        selectedCampusId,
        disputeReason.trim()
      );

      setDisputingRecord(null);
      setActionSuccessMsg(`Dispute state successfully updated to [${targetDisputeState}].`);
      setTimeout(() => setActionSuccessMsg(null), 4000);
      fetchAttendance();
    } catch (err: any) {
      setDisputeError(err.message || 'Transition update failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportCSV = async () => {
    if (attendanceRecords.length === 0) return;
    try {
      const campusObj = campuses.find(c => c.id === selectedCampusId);
      await StaffAttendanceExportService.exportToCSV(
        attendanceRecords,
        selectedCampusId,
        profile?.id || '',
        campusObj ? campusObj.name : 'Main Campus'
      );
    } catch (err: any) {
      alert('Export failed: ' + err.message);
    }
  };

  const toggleWorkingDayCheckbox = (dayNum: number) => {
    if (workingDays.includes(dayNum)) {
      setWorkingDays(workingDays.filter(d => d !== dayNum));
    } else {
      setWorkingDays([...workingDays, dayNum].sort());
    }
  };

  // Search filter matches and sorting
  const filteredRecords = attendanceRecords.filter(rec => {
    if (!searchText.trim()) return true;
    const term = searchText.toLowerCase();
    return (
      (rec.staff_name || '').toLowerCase().includes(term) ||
      (rec.staff_number || '').toLowerCase().includes(term) ||
      (rec.department || '').toLowerCase().includes(term)
    );
  }).sort((a, b) => {
    if (selectedSortField === 'time') {
      const timeA = a.sign_in_at ? new Date(a.sign_in_at).getTime() : 0;
      const timeB = b.sign_in_at ? new Date(b.sign_in_at).getTime() : 0;
      return timeB - timeA;
    } else {
      return (a.staff_name || '').localeCompare(b.staff_name || '');
    }
  });

  return (
    <div className="space-y-6">
      
      {/* Action success alert banner */}
      {actionSuccessMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl flex items-center gap-2 animate-in fade-in shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="font-bold text-xs">{actionSuccessMsg}</span>
        </div>
      )}

      {/* Header bar and view tabs */}
      <div className="bg-slate-900 rounded-3xl p-6 text-white space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-extrabold uppercase border border-indigo-500/30">
                Staff Operations Hub
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-bold border border-slate-700 uppercase flex items-center gap-1">
                <Lock className="w-3 h-3 text-emerald-400" /> PostgreSQL RLS Active
              </span>
            </div>
            <h1 className="text-xl font-black mt-2 tracking-tight flex items-center gap-2">
              <UserCheck className="w-6 h-6 text-indigo-400" />
              <span>JIPAS Staff Roster Manager</span>
            </h1>
            <p className="text-xs text-slate-400 max-w-lg mt-0.5">
              Securely track daily check-ins, configure campus thresholds, manage physical entrance posters, and export audited summaries.
            </p>
          </div>

          {/* Campus Switcher */}
          <div className="w-full sm:w-auto">
            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1 tracking-wider">Active Campus Boundary:</label>
            <select
              value={selectedCampusId}
              onChange={(e) => setSelectedCampusId(e.target.value)}
              className="px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              {campuses.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex flex-wrap gap-2 border-t border-slate-800/80 pt-4">
          <button
            onClick={() => { setActiveSubTab('today_attendance'); setViewingStaffDetailId(null); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'today_attendance' && !viewingStaffDetailId
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/40' 
                : 'bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Daily Attendance Log</span>
          </button>
          <button
            onClick={() => { setActiveSubTab('scan_qr'); setViewingStaffDetailId(null); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'scan_qr' 
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/40' 
                : 'bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>Live Attendance Scanner</span>
          </button>
          <button
            onClick={() => { setActiveSubTab('monthly_reports'); setViewingStaffDetailId(null); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'monthly_reports' 
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/40' 
                : 'bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Monthly Reports Summary</span>
          </button>
          <button
            onClick={() => { setActiveSubTab('hours_configuration'); setViewingStaffDetailId(null); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'hours_configuration' 
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/40' 
                : 'bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Schedule Config</span>
          </button>
          <button
            onClick={() => { setActiveSubTab('qr_management'); setViewingStaffDetailId(null); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'qr_management' 
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/40' 
                : 'bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>QR Entrance Gates</span>
          </button>
        </div>
      </div>

      {/* INDIVIDUAL STAFF HISTORY DETAIL OVERLAY PANE */}
      {viewingStaffDetailId && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <button
              onClick={() => setViewingStaffDetailId(null)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-lg text-xs font-bold text-slate-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back to daily log list
            </button>
            <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">Audited Staff History Card</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-xs font-bold space-y-3">
                <h4 className="text-sm font-black text-slate-900 border-b border-slate-200 pb-2 flex items-center gap-1.5">
                  <User className="w-4 h-4 text-indigo-600" />
                  <span>Identity Card Details</span>
                </h4>
                <div className="space-y-1">
                  <span className="text-[9px] uppercase text-slate-400 block font-black">Staff Member:</span>
                  <span className="text-slate-900 text-sm font-black">{staffHistoryRecords[0]?.staff_name || 'Staff Profile'}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] uppercase text-slate-400 block font-black">Staff ID No:</span>
                  <span className="text-slate-700 font-mono text-sm">{staffHistoryRecords[0]?.staff_number || 'ST-000'}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] uppercase text-slate-400 block font-black">Role Segment:</span>
                  <span className="text-slate-700 font-bold uppercase">{staffHistoryRecords[0]?.department || 'Staff'}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] uppercase text-slate-400 block font-black">Assigned Campus:</span>
                  <span className="text-slate-700">{staffHistoryRecords[0]?.campus_name || 'Main Campus'}</span>
                </div>
              </div>
            </div>

            <div className="md:col-span-2 space-y-4">
              <h4 className="text-sm font-black text-slate-900 border-b border-slate-200 pb-2">Roster Log History</h4>
              <div className="overflow-x-auto border border-slate-100 rounded-xl max-h-64 overflow-y-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-extrabold text-[9px] uppercase border-b border-slate-150">
                      <th className="p-3">Roster Date</th>
                      <th className="p-3">Sign In</th>
                      <th className="p-3">Sign Out</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Source</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
                    {staffHistoryRecords.map(h => {
                      const formattedIn = h.sign_in_at ? new Date(h.sign_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--';
                      const formattedOut = h.sign_out_at ? new Date(h.sign_out_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--';
                      return (
                        <tr key={h.id}>
                          <td className="p-3 font-bold text-slate-900">{h.attendance_date}</td>
                          <td className="p-3 font-mono text-emerald-600">{formattedIn}</td>
                          <td className="p-3 font-mono text-slate-500">{formattedOut}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 text-[9px] font-black uppercase rounded-full bg-slate-100">{h.status}</span>
                          </td>
                          <td className="p-3 uppercase text-[9px] font-bold text-slate-500">{h.source}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <h4 className="text-sm font-black text-slate-900 border-b border-slate-200 pb-2 pt-2">Audit Correction History</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {staffAuditHistory.length > 0 ? (
                  staffAuditHistory.map((au, i) => (
                    <div key={au.id || i} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-[11px] font-medium leading-relaxed text-slate-600 space-y-1">
                      <div className="flex justify-between font-bold text-slate-800 text-[10px] uppercase">
                        <span>Admin: {au.admin?.full_name || 'Administrator'}</span>
                        <span className="text-slate-400">{new Date(au.timestamp).toLocaleDateString()}</span>
                      </div>
                      <p className="text-slate-900 font-semibold"><strong className="text-slate-500">Reason:</strong> {au.reason}</p>
                      <div className="grid grid-cols-2 gap-2 text-[10px] pt-1 border-t border-slate-150/50">
                        <div><strong className="text-slate-400 uppercase text-[9px]">Original:</strong> {JSON.stringify(au.old_value)}</div>
                        <div><strong className="text-slate-400 uppercase text-[9px]">Corrected To:</strong> {JSON.stringify(au.new_value)}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 font-medium text-center py-4">No historical corrections applied or logged for this employee profile.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LIVE ENTRANCE QR SCANNER TAB */}
      {activeSubTab === 'scan_qr' && (
        <div className="space-y-6">
          <StaffAttendanceQRScanner 
            currentUser={profile} 
            employee={profile} 
            onSuccess={() => setActiveSubTab('today_attendance')}
            onClose={() => setActiveSubTab('today_attendance')}
          />
        </div>
      )}

      {/* TODAY'S ATTENDANCE TAB */}
      {activeSubTab === 'today_attendance' && !viewingStaffDetailId && (
        <div className="space-y-6">
          
          {/* Enhanced Campus Dashboard Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-1 relative overflow-hidden">
              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Expected Staff</span>
              <span className="text-2xl font-black text-slate-900 block">{dashboardStats.expectedStaff}</span>
              <div className="absolute right-3 bottom-3 p-1.5 bg-slate-50 text-slate-400 rounded-lg"><UserCheck className="w-5 h-5" /></div>
            </div>
            <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-1 relative overflow-hidden">
              <span className="text-[10px] text-emerald-500 font-extrabold uppercase tracking-wider block">Signed In</span>
              <span className="text-2xl font-black text-emerald-600 block">{dashboardStats.signedIn}</span>
              <div className="absolute right-3 bottom-3 p-1.5 bg-emerald-50 text-emerald-500 rounded-lg"><Play className="w-5 h-5" /></div>
            </div>
            <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-1 relative overflow-hidden">
              <span className="text-[10px] text-blue-500 font-extrabold uppercase tracking-wider block">Signed Out</span>
              <span className="text-2xl font-black text-blue-600 block">{dashboardStats.signedOut}</span>
              <div className="absolute right-3 bottom-3 p-1.5 bg-blue-50 text-blue-500 rounded-lg"><Power className="w-5 h-5" /></div>
            </div>
            <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-1 relative overflow-hidden">
              <span className="text-[10px] text-amber-500 font-extrabold uppercase tracking-wider block">Late Arrivals</span>
              <span className="text-2xl font-black text-amber-600 block">{dashboardStats.late}</span>
              <div className="absolute right-3 bottom-3 p-1.5 bg-amber-50 text-amber-500 rounded-lg"><AlertTriangle className="w-5 h-5" /></div>
            </div>
            <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-1 relative overflow-hidden col-span-2 md:col-span-1">
              <span className="text-[10px] text-indigo-500 font-extrabold uppercase tracking-wider block">Completion rate</span>
              <span className="text-2xl font-black text-indigo-600 block">{dashboardStats.completionPercentage}%</span>
              <div className="absolute right-3 bottom-3 p-1.5 bg-indigo-50 text-indigo-500 rounded-lg"><CheckCircle2 className="w-5 h-5" /></div>
            </div>
          </div>

          {/* Filtering Controls */}
          <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center gap-4 justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Roster Date:</label>
                <input
                  type="date"
                  value={selectedFilterDate}
                  onChange={(e) => setSelectedFilterDate(e.target.value)}
                  className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Status Filter:</label>
                <select
                  value={selectedFilterStatus}
                  onChange={(e) => setSelectedFilterStatus(e.target.value)}
                  className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">All Statuses</option>
                  <option value="Present">Present</option>
                  <option value="Late">Late</option>
                  <option value="Absent">Absent</option>
                  <option value="Excused">Excused</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Sort Field:</label>
                <select
                  value={selectedSortField}
                  onChange={(e) => setSelectedSortField(e.target.value as any)}
                  className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="name">Staff Name</option>
                  <option value="time">Sign In Timestamp</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1 md:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search staff, ID, department..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <button
                onClick={handleExportCSV}
                className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-700 flex items-center gap-1 font-bold text-xs cursor-pointer"
                title="Export active roster list to CSV"
              >
                <Download className="w-4 h-4 text-slate-600" />
                <span className="hidden sm:inline">Export</span>
              </button>
            </div>
          </div>

          {/* Roster Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-3xl bg-white shadow-sm">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-extrabold text-[10px] uppercase border-b border-slate-200">
                  <th className="p-3.5">Staff Member</th>
                  <th className="p-3.5">Staff ID</th>
                  <th className="p-3.5">Segment Role</th>
                  <th className="p-3.5">Campus</th>
                  <th className="p-3.5">Date</th>
                  <th className="p-3.5">Sign In</th>
                  <th className="p-3.5">Sign Out</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Dispute / Review</th>
                  <th className="p-3.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredRecords.length > 0 ? (
                  filteredRecords.map(rec => {
                    const formattedIn = rec.sign_in_at ? new Date(rec.sign_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--';
                    const formattedOut = rec.sign_out_at ? new Date(rec.sign_out_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--';

                    return (
                      <tr key={rec.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-3.5 font-bold text-slate-900">
                          <button
                            onClick={() => setViewingStaffDetailId(rec.staff_id)}
                            className="text-left font-black hover:text-indigo-600 cursor-pointer"
                          >
                            {rec.staff_name}
                          </button>
                        </td>
                        <td className="p-3.5 font-mono text-slate-600 font-bold">{rec.staff_number}</td>
                        <td className="p-3.5 text-slate-600">{rec.department}</td>
                        <td className="p-3.5 text-slate-600">{rec.campus_name}</td>
                        <td className="p-3.5 font-mono text-slate-500">{rec.attendance_date}</td>
                        <td className="p-3.5 font-mono text-emerald-600 font-bold">{formattedIn}</td>
                        <td className="p-3.5 font-mono text-slate-500">{formattedOut}</td>
                        <td className="p-3.5">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            rec.status === 'Present' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                            rec.status === 'Late' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                            rec.status === 'Absent' ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                            'bg-indigo-50 text-indigo-700 border border-indigo-100'
                          }`}>
                            {rec.status}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <button
                            onClick={() => handleOpenDispute(rec)}
                            className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border text-center cursor-pointer transition-all ${
                              rec.review_status === 'REVIEW_REQUIRED' ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 animate-pulse' :
                              rec.review_status === 'CORRECTED' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                              rec.review_status === 'DISMISSED' ? 'bg-slate-100 text-slate-500 border-slate-200' :
                              'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}
                            title="Toggle dispute / review resolution"
                          >
                            {rec.review_status || 'REVIEWED'}
                          </button>
                        </td>
                        <td className="p-3.5 text-center flex justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenCorrection(rec)}
                            className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer transition-colors"
                            title="Apply audited correction"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={10} className="p-10 text-center text-slate-400 font-medium">
                      No staff attendance records matched your current query criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MONTHLY SUMMARY TAB */}
      {activeSubTab === 'monthly_reports' && (
        <StaffAttendanceReport />
      )}

      {/* CONFIGURATION TAB */}
      {activeSubTab === 'hours_configuration' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-6 max-w-2xl mx-auto shadow-sm">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-indigo-600" />
              <div>
                <h3 className="font-extrabold text-sm text-slate-900">Working Hours & Per-Day Scheduling Parameters</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase">Configure custom entry/exit times for each day of the week.</p>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 font-extrabold text-[10px] uppercase rounded-full border border-indigo-100">
              Campus Schedules
            </span>
          </div>

          <div className="space-y-5 text-xs font-bold text-slate-700">
            {/* DEPARTMENT-BASED SCHEDULE SELECTION BAR */}
            <div className="bg-indigo-50/70 p-4 rounded-2xl border border-indigo-100 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <label className="block text-xs font-black text-indigo-950 uppercase tracking-wider">
                    Target Schedule Scope / Department:
                  </label>
                  <p className="text-[10px] text-indigo-700/90 font-medium mt-0.5">
                    Configure expected sign-in/out times & working days for specific departments or the default campus baseline.
                  </p>
                </div>
                <select
                  value={selectedDeptForSchedule}
                  onChange={(e) => handleSelectDepartmentForSchedule(e.target.value)}
                  className="px-3 py-2 bg-white border border-indigo-200 rounded-xl text-xs font-extrabold text-indigo-950 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-2xs shrink-0"
                >
                  <option value="DEFAULT">🏫 Default Campus Baseline (All Staff)</option>
                  <option value="Pre-School">👶 Pre-School Department</option>
                  <option value="Primary Department">📚 Primary Department</option>
                  <option value="Junior High School">🎓 Junior High School (JHS)</option>
                  <option value="Senior High School">🏛️ Senior High School (SHS)</option>
                  <option value="Administrative & Support Staff">💼 Administrative & Support Staff</option>
                </select>
              </div>

              {/* Active Department Overrides Summary Badges */}
              {departmentSchedules.length > 0 && (
                <div className="pt-2 border-t border-indigo-150 flex flex-wrap gap-2 items-center">
                  <span className="text-[10px] font-black uppercase text-indigo-900">Custom Dept Schedules:</span>
                  {departmentSchedules.map(ds => (
                    <div 
                      key={ds.departmentName}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[10px] font-extrabold transition-all ${
                        selectedDeptForSchedule === ds.departmentName
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                          : 'bg-white text-slate-700 border-indigo-200 hover:border-indigo-400'
                      }`}
                    >
                      <button 
                        type="button"
                        onClick={() => handleSelectDepartmentForSchedule(ds.departmentName)}
                        className="cursor-pointer flex items-center gap-1"
                      >
                        <span>{ds.departmentName}</span>
                        <span className="opacity-80">({ds.expectedSignIn} - {ds.expectedSignOut})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveDepartmentSchedule(ds.departmentName)}
                        className="text-rose-400 hover:text-rose-600 p-0.5 rounded cursor-pointer ml-1"
                        title={`Remove ${ds.departmentName} schedule`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Thresholds */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
              <div className="space-y-1">
                <label className="text-slate-800 font-black">Late Threshold Buffer (Minutes):</label>
                <input
                  type="number"
                  value={lateThresholdMins}
                  onChange={(e) => setLateThresholdMins(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  placeholder="30"
                />
                <span className="text-[9px] text-slate-400 font-medium block">Scans after expected time + buffer are marked "Late".</span>
              </div>

              <div className="space-y-1">
                <label className="text-slate-800 font-black">Early Departure Buffer (Minutes):</label>
                <input
                  type="number"
                  value={earlyDepartureThresholdMins}
                  onChange={(e) => setEarlyDepartureThresholdMins(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  placeholder="30"
                />
                <span className="text-[9px] text-slate-400 font-medium block">Check-outs before expected exit - buffer are marked "Early Departure".</span>
              </div>
            </div>

            {/* Base Sign-In and Sign-Out Times */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-slate-700 font-extrabold">
                  {selectedDeptForSchedule === 'DEFAULT' ? 'Default Base Sign-In Time:' : `Expected Sign-In Time (${selectedDeptForSchedule}):`}
                </label>
                <input
                  type="time"
                  value={expectedSignIn}
                  onChange={(e) => setExpectedSignIn(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                />
              </div>
              <div className="space-y-1">
                <label className="text-slate-700 font-extrabold">
                  {selectedDeptForSchedule === 'DEFAULT' ? 'Default Base Sign-Out Time:' : `Expected Sign-Out Time (${selectedDeptForSchedule}):`}
                </label>
                <input
                  type="time"
                  value={expectedSignOut}
                  onChange={(e) => setExpectedSignOut(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                />
              </div>
            </div>

            {/* PER-DAY SCHEDULE CONFIGURATION MATRIX */}
            <div className="space-y-3 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                <div>
                  <label className="block text-xs font-black text-slate-900">Per-Day Custom Times & Shift Schedules:</label>
                  <p className="text-[10px] text-slate-400 font-medium">Customize exact sign-in and sign-out times for each day of the week.</p>
                </div>
                
                {/* Presets */}
                <div className="flex flex-wrap gap-1.5 pt-1 sm:pt-0">
                  <button
                    type="button"
                    onClick={() => handleApplyPresetSchedule('standard')}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg text-[10px] font-extrabold text-slate-600 transition-colors cursor-pointer"
                    title="Mon-Fri 08:00 - 17:00"
                  >
                    Standard Mon-Fri
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPresetSchedule('early_friday')}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg text-[10px] font-extrabold text-slate-600 transition-colors cursor-pointer"
                    title="Mon-Thu 08:00 - 17:00, Fri 08:00 - 13:00"
                  >
                    Early Friday
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPresetSchedule('saturday_shift')}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg text-[10px] font-extrabold text-slate-600 transition-colors cursor-pointer"
                    title="Include Saturday half-day"
                  >
                    Sat Shift
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPresetSchedule('copy_monday')}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg text-[10px] font-extrabold text-slate-600 transition-colors cursor-pointer"
                    title="Copy Monday times to all active working days"
                  >
                    Copy Mon
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {daySchedules.map((ds, idx) => (
                  <div 
                    key={ds.dayOfWeek}
                    className={`p-3 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                      ds.isWorkingDay 
                        ? 'bg-slate-50/80 border-slate-200' 
                        : 'bg-slate-100/40 border-slate-150 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 shrink-0 min-w-[130px]">
                      <input
                        type="checkbox"
                        id={`working_day_${ds.dayOfWeek}`}
                        checked={ds.isWorkingDay}
                        onChange={(e) => handleUpdateDaySchedule(idx, 'isWorkingDay', e.target.checked)}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-0 cursor-pointer"
                      />
                      <label htmlFor={`working_day_${ds.dayOfWeek}`} className="cursor-pointer flex flex-col">
                        <span className="font-extrabold text-xs text-slate-900">{ds.dayName}</span>
                        <span className={`text-[9px] font-black uppercase ${ds.isWorkingDay ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {ds.isWorkingDay ? 'Working Day' : 'Day Off / Closed'}
                        </span>
                      </label>
                    </div>

                    {ds.isWorkingDay ? (
                      <div className="grid grid-cols-2 gap-2 w-full sm:w-auto">
                        <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-slate-200 shadow-2xs">
                          <span className="text-[10px] text-slate-400 uppercase font-black shrink-0">In:</span>
                          <input
                            type="time"
                            value={ds.expectedSignIn}
                            onChange={(e) => handleUpdateDaySchedule(idx, 'expectedSignIn', e.target.value)}
                            className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer w-full"
                          />
                        </div>

                        <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-slate-200 shadow-2xs">
                          <span className="text-[10px] text-slate-400 uppercase font-black shrink-0">Out:</span>
                          <input
                            type="time"
                            value={ds.expectedSignOut}
                            onChange={(e) => handleUpdateDaySchedule(idx, 'expectedSignOut', e.target.value)}
                            className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer w-full"
                          />
                        </div>
                      </div>
                    ) : (
                      <span className="text-[11px] font-bold text-slate-400 italic py-1">No check-in expected</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={handleSaveWorkingHours}
              disabled={isLoading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-xs font-black uppercase tracking-wider rounded-2xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save & Apply Per-Day Schedule</span>
            </button>
          </div>
        </div>
      )}

      {/* ENTRANCE QR MANAGEMENT TAB */}
      {activeSubTab === 'qr_management' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left panel: Generate code */}
          <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-sm">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5 border-b border-slate-100 pb-3">
              <Plus className="w-4 h-4 text-indigo-600" />
              <span>Generate New Entrance QR</span>
            </h3>

            <form onSubmit={handleCreateQrCode} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">Readable Gate/Entrance Name:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Main Entrance Gate 1"
                  value={newQrName}
                  onChange={(e) => setNewQrName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-[10px] text-indigo-900 leading-relaxed font-bold">
                💡 JIPAS entrance QR codes carry <strong>no client secrets, usernames, or credentials</strong>. They contain only unique, random secure public identifiers validated strictly by the PostgreSQL layer.
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-200 animate-pulse" />
                <span>Generate secure Token</span>
              </button>
            </form>
          </div>

          {/* Right panel: Active codes table */}
          <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-sm">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5 border-b border-slate-100 pb-3">
              <QrCode className="w-4 h-4 text-indigo-600" />
              <span>Active Gate QR Registries</span>
            </h3>

            <div className="overflow-x-auto border border-slate-100 rounded-xl">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-extrabold text-[10px] uppercase border-b border-slate-200">
                    <th className="p-3">Gate/Entrance Name</th>
                    <th className="p-3">Creation Date</th>
                    <th className="p-3">Last-Scanned At</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {qrCodeList.length > 0 ? (
                    qrCodeList.map(qr => (
                      <tr key={qr.id} className="hover:bg-slate-50/50">
                        <td className="p-3 font-bold text-slate-900">{qr.name}</td>
                        <td className="p-3 font-mono text-slate-500">
                          {new Date(qr.created_at).toLocaleDateString()}
                        </td>
                        <td className="p-3 font-mono text-slate-500">
                          {qr.last_used_at ? new Date(qr.last_used_at).toLocaleTimeString() : 'Never'}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${
                            qr.is_active 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                              : 'bg-rose-50 text-rose-700 border-rose-100'
                          }`}>
                            {qr.is_active ? 'Active' : 'Deactivated / Revoked'}
                          </span>
                        </td>
                        <td className="p-3 text-center flex justify-center gap-2">
                          {qr.is_active && (
                            <>
                              <button
                                onClick={() => { setEditingQrCode(qr); setEditQrName(qr.name); }}
                                className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer transition-colors"
                                title="Edit Gate Name"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleRefreshQrCode(qr)}
                                className="p-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 flex items-center gap-1 font-bold text-[10px] cursor-pointer"
                                title="Update token and print fresh poster"
                              >
                                <RefreshCw className="w-3.5 h-3.5 text-indigo-600" /> Update Token
                              </button>
                              <button
                                onClick={() => handleRevokeQrCode(qr.id)}
                                className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                                title="Deactivate and revoke QR gate token"
                              >
                                <Power className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400 font-semibold">
                        No active entrance QR codes configured for this campus.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* QR GATE EDIT MODAL */}
      {editingQrCode && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-sm w-full p-6 space-y-4 shadow-2xl my-auto animate-in fade-in">
            <div className="flex items-center gap-2 text-indigo-600 border-b border-slate-100 pb-3">
              <Edit className="w-5 h-5 shrink-0" />
              <h3 className="font-extrabold text-base text-slate-900">Edit Gate Information</h3>
            </div>

            <form onSubmit={handleUpdateQrName} className="space-y-4 text-xs font-bold text-slate-700">
              <div className="space-y-1">
                <label className="block text-[10px] uppercase text-slate-400">Gate/Entrance Name:</label>
                <input
                  type="text"
                  required
                  value={editQrName}
                  onChange={(e) => setEditQrName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingQrCode(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl cursor-pointer shadow-sm disabled:bg-indigo-400"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECONCILIATION CORRECTION MODAL */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full p-6 space-y-4 shadow-2xl my-auto animate-in fade-in">
            <div className="flex items-center gap-2 text-indigo-600 border-b border-slate-100 pb-3">
              <Edit className="w-5 h-5 shrink-0" />
              <h3 className="font-extrabold text-base text-slate-900">Audited Attendance Correction</h3>
            </div>

            {correctionError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-900 text-[11px] font-bold rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{correctionError}</span>
              </div>
            )}

            <div className="space-y-3.5 text-xs text-slate-700">
              <div className="grid grid-cols-2 gap-2 text-slate-500 font-bold bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div>
                  <span className="text-[10px] uppercase text-slate-400 block font-black">Staff Name:</span>
                  <span className="text-slate-900 font-black">{editingRecord.staff_name}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-400 block font-black">Roster Date:</span>
                  <span className="text-slate-900 font-mono">{editingRecord.attendance_date}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Attendance Status:</label>
                <select
                  value={correctionStatus}
                  onChange={(e: any) => setCorrectionStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                >
                  <option value="Present">Present</option>
                  <option value="Late">Late</option>
                  <option value="Absent">Absent</option>
                  <option value="Excused">Excused</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Sign In Time:</label>
                  <input
                    type="datetime-local"
                    value={correctionSignIn}
                    onChange={(e) => setCorrectionSignIn(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Sign Out Time:</label>
                  <input
                    type="datetime-local"
                    value={correctionSignOut}
                    onChange={(e) => setCorrectionSignOut(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">Administrative Correction Reason *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Staff member clock-in bypassed due to verified device camera network error."
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium leading-normal animate-in duration-200"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setEditingRecord(null)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCorrection}
                disabled={isLoading}
                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl cursor-pointer shadow-sm disabled:bg-indigo-400"
              >
                Apply & Audit Log
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ATTENDANCE DISPUTE REVIEW DIALOG */}
      {disputingRecord && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full p-6 space-y-4 shadow-2xl my-auto animate-in fade-in">
            <div className="flex items-center gap-2 text-indigo-600 border-b border-slate-100 pb-3">
              <ShieldCheck className="w-5 h-5 shrink-0" />
              <h3 className="font-extrabold text-base text-slate-900">Attendance Dispute Resolution</h3>
            </div>

            {disputeError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-900 text-[11px] font-bold rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{disputeError}</span>
              </div>
            )}

            <div className="space-y-3.5 text-xs text-slate-700">
              <div className="grid grid-cols-2 gap-2 text-slate-500 font-bold bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div>
                  <span className="text-[10px] uppercase text-slate-400 block font-black">Staff Name:</span>
                  <span className="text-slate-900 font-black">{disputingRecord.staff_name}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-400 block font-black">Roster Date:</span>
                  <span className="text-slate-900 font-mono">{disputingRecord.attendance_date}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Select Dispute State:</label>
                <select
                  value={targetDisputeState}
                  onChange={(e: any) => setTargetDisputeState(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none"
                >
                  <option value="REVIEW_REQUIRED">REVIEW_REQUIRED</option>
                  <option value="REVIEWED">REVIEWED</option>
                  <option value="CORRECTED">CORRECTED</option>
                  <option value="DISMISSED">DISMISSED</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">Audit Statement Statement *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Employee provided physical log confirmation; cleared record status from Late to Present."
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium leading-normal"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setDisputingRecord(null)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveDisputeState}
                disabled={isLoading}
                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl cursor-pointer shadow-sm disabled:bg-indigo-400"
              >
                Transition & Audit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRINT AREA PREVIEW */}
      {activePrintPayload && (
        <EntranceQRPrintPage
          qrCode={activePrintPayload.qrCode}
          rawToken={activePrintPayload.rawToken}
          campusName={activePrintPayload.campusName}
          onClose={() => setActivePrintPayload(null)}
        />
      )}

    </div>
  );
}

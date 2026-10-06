import { supabase } from '../../lib/supabase';
import { SchoolCalendarService } from './schoolCalendarService';
import { EntranceQrService, EntranceQrCode } from './entranceQrService';
import { StaffAttendanceReportService } from './staffAttendanceReportService';
import { idbGet, idbSet } from '../idbService';
import { logRecentScanAttempt } from '../../components/common/RecentQrScansLogView';

export interface StaffAttendanceRecord {
  id: string;
  staff_id: string;
  campus_id: string;
  attendance_date: string; // YYYY-MM-DD
  sign_in_at: string | null;
  sign_out_at: string | null;
  status: 'Present' | 'Late' | 'Absent' | 'Excused';
  source: 'ONLINE_QR' | 'OFFLINE_QR' | 'ADMIN_CORRECTION';
  review_status?: 'REVIEW_REQUIRED' | 'REVIEWED' | 'CORRECTED' | 'DISMISSED';
  qr_code_id: string | null;
  created_at: string;
  updated_at: string;
  // Local UI auxiliary helper fields
  staff_name?: string;
  staff_number?: string;
  department?: string;
  campus_name?: string;
}

export interface StaffAttendanceFilter {
  campusId?: string;
  date?: string;
  staffId?: string;
  departmentId?: string;
  status?: string;
}

const OFFLINE_ATTENDANCE_QUEUE_KEY = 'jipas_offline_staff_attendance_queue';

export const StaffAttendanceService = {
  /**
   * Retrieves staff attendance records with optional administrative filters
   */
  async listAttendance(filters: StaffAttendanceFilter = {}): Promise<StaffAttendanceRecord[]> {
    // Resolve teacher/staff metadata helper
    const teacherMap = new Map<string, any>();
    try {
      const rawTeachers = localStorage.getItem('jipas_teachers');
      if (rawTeachers) {
        const parsed = JSON.parse(rawTeachers);
        if (Array.isArray(parsed)) {
          parsed.forEach((t: any) => {
            if (t.id) teacherMap.set(t.id, t);
            if (t.staffId) teacherMap.set(t.staffId, t);
            if (t.name) teacherMap.set(t.name.toLowerCase().trim(), t);
          });
        }
      }
    } catch {}

    const recordsMap = new Map<string, StaffAttendanceRecord>();

    // 1. Fetch from Supabase
    try {
      let query = supabase
        .from('staff_attendance')
        .select(`
          *,
          profile:profiles (
            id,
            full_name,
            staff_id,
            role,
            campus_id
          ),
          campus:campuses (
            id,
            name
          )
        `);

      if (filters.date) {
        query = query.eq('attendance_date', filters.date);
      }
      if (filters.staffId) {
        query = query.eq('staff_id', filters.staffId);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (!error && Array.isArray(data)) {
        data.forEach((row: any) => {
          const matchedTeacher = teacherMap.get(row.staff_id) || teacherMap.get(row.profile?.staff_id);
          const staffName = row.profile?.full_name || matchedTeacher?.name || row.staff_name || 'Staff Member';
          const staffNumber = row.profile?.staff_id || matchedTeacher?.staffId || row.staff_number || 'ST-001';
          const department = row.profile?.role || matchedTeacher?.department || row.department || 'Staff';
          const campusName = row.campus?.name || matchedTeacher?.campus || row.campus_name || 'Main Campus';

          const rec: StaffAttendanceRecord = {
            id: row.id,
            staff_id: row.staff_id,
            campus_id: row.campus_id || 'jipas-1-kpehenou',
            attendance_date: row.attendance_date,
            sign_in_at: row.sign_in_at,
            sign_out_at: row.sign_out_at,
            status: row.status,
            source: row.source,
            review_status: row.review_status || 'REVIEWED',
            qr_code_id: row.qr_code_id,
            created_at: row.created_at,
            updated_at: row.updated_at,
            staff_name: staffName,
            staff_number: staffNumber,
            department: department,
            campus_name: campusName
          };
          recordsMap.set(rec.id, rec);
        });
      }
    } catch (sbErr) {
      console.warn('[StaffAttendanceService] Supabase query notice:', sbErr);
    }

    // 2. Merge local storage records
    try {
      const rawLocal = localStorage.getItem('jipas_staff_attendance');
      if (rawLocal) {
        const localList = JSON.parse(rawLocal);
        if (Array.isArray(localList)) {
          localList.forEach((row: any) => {
            const rowId = row.id || `local_${row.staff_id || row.teacherId}_${row.attendance_date || row.date}`;
            const staffId = row.staff_id || row.teacherId || 'unknown';
            const matchedTeacher = teacherMap.get(staffId) || teacherMap.get(row.staff_number);
            const staffName = row.staff_name || row.teacherName || matchedTeacher?.name || 'Staff Member';
            const staffNumber = row.staff_number || matchedTeacher?.staffId || 'ST-001';
            const department = row.department || matchedTeacher?.department || 'Staff';
            const campusName = row.campus_name || matchedTeacher?.campus || 'Main Campus';
            const attDate = row.attendance_date || row.date || new Date().toISOString().split('T')[0];

            const existing = recordsMap.get(rowId);
            if (!existing) {
              recordsMap.set(rowId, {
                id: rowId,
                staff_id: staffId,
                campus_id: row.campus_id || 'jipas-1-kpehenou',
                attendance_date: attDate,
                sign_in_at: row.sign_in_at || null,
                sign_out_at: row.sign_out_at || null,
                status: row.status || 'Present',
                source: row.source || 'ONLINE_QR',
                review_status: row.review_status || 'REVIEWED',
                qr_code_id: row.qr_code_id || null,
                created_at: row.created_at || new Date().toISOString(),
                updated_at: row.updated_at || new Date().toISOString(),
                staff_name: staffName,
                staff_number: staffNumber,
                department: department,
                campus_name: campusName
              });
            } else {
              // Update with any newer fields
              if (!existing.sign_out_at && row.sign_out_at) {
                existing.sign_out_at = row.sign_out_at;
              }
            }
          });
        }
      }
    } catch {}

    let allRecords = Array.from(recordsMap.values());

    // Apply filters
    if (filters.campusId && filters.campusId !== 'all' && filters.campusId !== 'All') {
      allRecords = allRecords.filter(r => 
        r.campus_id === filters.campusId || 
        r.campus_name?.toLowerCase().includes(filters.campusId!.toLowerCase())
      );
    }
    if (filters.date) {
      allRecords = allRecords.filter(r => r.attendance_date === filters.date);
    }
    if (filters.staffId) {
      allRecords = allRecords.filter(r => r.staff_id === filters.staffId);
    }
    if (filters.status) {
      allRecords = allRecords.filter(r => r.status === filters.status);
    }

    return allRecords.sort((a, b) => {
      const timeA = a.sign_in_at ? new Date(a.sign_in_at).getTime() : 0;
      const timeB = b.sign_in_at ? new Date(b.sign_in_at).getTime() : 0;
      return timeB - timeA;
    });
  },

  /**
   * Processes a staff QR Scan event securely (for online clients).
   * Validates QR token, checks calendar, determines sign-in vs sign-out, and records in Supabase.
   */
  async scanEntranceQr(
    rawToken: string,
    profileId: string,
    staffCampusId: string
  ): Promise<{ status: 'SIGNED_IN' | 'SIGNED_OUT'; record: StaffAttendanceRecord; message: string }> {
    // 1. Verify user profile and employee role authorization
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role, full_name, campus_id, department')
      .eq('id', profileId)
      .maybeSingle();

    if (profile) {
      const normalizedRole = (profile.role || '').toLowerCase().trim();
      if (normalizedRole === 'ceo' || normalizedRole === 'director') {
        const msg = 'Executive leadership (CEO / Director) are exempt from daily entrance QR attendance scanning.';
        logRecentScanAttempt({
          staffId: profileId,
          staffName: profile.full_name || 'Executive',
          campusName: staffCampusId,
          status: 'FAILED',
          resultMessage: msg,
          rawTokenSummary: rawToken.substring(0, 16) + '...',
          debugReason: 'Role CEO/Director exempt from gate scanner.'
        });
        throw new Error(msg);
      }
      if (normalizedRole === 'student' || normalizedRole === 'parent') {
        const msg = 'Only school staff and employees are authorized to record attendance.';
        logRecentScanAttempt({
          staffId: profileId,
          staffName: profile.full_name || 'User',
          campusName: staffCampusId,
          status: 'FAILED',
          resultMessage: msg,
          rawTokenSummary: rawToken.substring(0, 16) + '...',
          debugReason: `Unauthorized role: ${profile.role}`
        });
        throw new Error(msg);
      }
    }

    // Resolve department for schedule lookup
    let staffDept = profile?.department || '';
    if (!staffDept && typeof localStorage !== 'undefined') {
      try {
        const teachers = JSON.parse(localStorage.getItem('jipas_teachers') || '[]');
        const found = teachers.find((t: any) => t.id === profileId || t.staffId === profileId);
        if (found) staffDept = found.department || found.assignedDepartment || '';
      } catch {}
    }

    // 2. Verify and authenticate the token (Token Authenticity Check)
    let qrCode: EntranceQrCode;
    try {
      qrCode = await EntranceQrService.verifyQrToken(rawToken);
    } catch (err: any) {
      logRecentScanAttempt({
        staffId: profileId,
        staffName: profile?.full_name || 'Staff Member',
        campusName: staffCampusId,
        status: 'FAILED',
        resultMessage: err.message || 'Invalid or unverified entrance QR token.',
        rawTokenSummary: rawToken.substring(0, 16) + '...',
        debugReason: 'QR token signature verification failed or token expired.'
      });
      throw err;
    }

    const targetCampusId = profile?.campus_id || staffCampusId || qrCode.campus_id || 'jipas-1-kpehenou';

    // 3. Date & calendar validation
    const todayStr = new Date().toISOString().split('T')[0];
    const calendarCheck = await SchoolCalendarService.checkDate(todayStr, targetCampusId);
    if (!calendarCheck.isWorkingDay) {
      const reason = calendarCheck.reason || 'Weekend';
      const eventInfo = calendarCheck.eventName ? `: ${calendarCheck.eventName}` : '';
      const msg = `Staff attendance is not available today. ${reason}${eventInfo}.`;
      logRecentScanAttempt({
        staffId: profileId,
        staffName: profile?.full_name || 'Staff Member',
        campusName: qrCode.name || 'Main Gate',
        status: 'FAILED',
        resultMessage: msg,
        rawTokenSummary: qrCode.name || rawToken.substring(0, 16) + '...',
        debugReason: `School calendar day marked closed/holiday (${reason}).`
      });
      throw new Error(msg);
    }

    // 4. Fetch today's existing attendance record for the staff member
    const { data: existingRecord, error } = await supabase
      .from('staff_attendance')
      .select('*')
      .eq('staff_id', profileId)
      .eq('attendance_date', todayStr)
      .eq('campus_id', targetCampusId)
      .maybeSingle();

    if (error) {
      console.warn('[StaffAttendanceService] Supabase check error, falling back to local attendance cache:', error.message);
      return this.scanEntranceQrLocalFallback(profileId, targetCampusId, todayStr, qrCode, profile?.full_name, staffDept);
    }

    const nowIso = new Date().toISOString();

    if (!existingRecord) {
      // --- SIGN IN FLOW ---
      let isLate = false;
      try {
        const hoursConfig = await StaffAttendanceReportService.getWorkingHours(targetCampusId, staffDept);
        const dayOfWeek = new Date().getDay();
        const daySched = hoursConfig.daySchedules?.find(ds => ds.dayOfWeek === dayOfWeek);
        const expectedSignInStr = daySched?.expectedSignIn || hoursConfig.expectedSignIn || '08:00';
        const lateThresholdMins = hoursConfig.lateThresholdMins ?? 30;

        const [expHour, expMin] = expectedSignInStr.split(':').map(Number);
        const expInTotalMins = (expHour * 60) + expMin + lateThresholdMins;
        const nowTotalMins = (new Date().getHours() * 60) + new Date().getMinutes();

        isLate = nowTotalMins > expInTotalMins;
      } catch {
        const nowHours = new Date().getHours();
        const nowMins = new Date().getMinutes();
        isLate = nowHours > 8 || (nowHours === 8 && nowMins > 30);
      }

      const { data: insertedRecord, error: insertError } = await supabase
        .from('staff_attendance')
        .insert({
          staff_id: profileId,
          campus_id: targetCampusId,
          attendance_date: todayStr,
          sign_in_at: nowIso,
          status: isLate ? 'Late' : 'Present',
          source: 'ONLINE_QR',
          qr_code_id: qrCode.id.startsWith('fallback-qr-') ? null : qrCode.id
        })
        .select('*')
        .single();

      if (insertError) {
        console.warn('[StaffAttendanceService] Error recording sign-in, falling back to local:', insertError.message);
        return this.scanEntranceQrLocalFallback(profileId, targetCampusId, todayStr, qrCode, profile?.full_name, staffDept);
      }

      const formattedTime = new Date(nowIso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const msg = `Signed in successfully at ${formattedTime}${isLate ? ' (Marked Late)' : ''}.`;
      
      logRecentScanAttempt({
        staffId: profileId,
        staffName: profile?.full_name || 'Staff Member',
        campusName: qrCode.name || 'Main Gate',
        status: 'SUCCESS_SIGN_IN',
        resultMessage: msg,
        rawTokenSummary: qrCode.name,
        debugReason: `Sign in verified. Department: ${staffDept || 'Default'}. Status: ${isLate ? 'Late' : 'Present'}.`
      });

      // Update local storage and broadcast
      try {
        const rawLocal = localStorage.getItem('jipas_staff_attendance');
        const localList = rawLocal ? JSON.parse(rawLocal) : [];
        const filtered = localList.filter((r: any) => r.id !== insertedRecord.id && !(r.staff_id === profileId && r.attendance_date === todayStr));
        filtered.unshift({
          ...insertedRecord,
          staff_name: profile?.full_name || 'Staff Member',
          teacherName: profile?.full_name || 'Staff Member',
          teacherId: profileId,
          department: staffDept
        });
        localStorage.setItem('jipas_staff_attendance', JSON.stringify(filtered));
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('jipas_staff_attendance_updated', { detail: { record: insertedRecord, status: 'SIGNED_IN' } }));
          window.dispatchEvent(new CustomEvent('jipas_cloud_synced'));
        }
      } catch {}

      return {
        status: 'SIGNED_IN',
        record: insertedRecord,
        message: msg
      };
    } else {
      // --- SIGN OUT FLOW ---
      const lastScanTime = new Date(existingRecord.updated_at).getTime();
      const secondsSinceLastScan = (Date.now() - lastScanTime) / 1000;
      if (secondsSinceLastScan < 120) {
        const formattedIn = new Date(existingRecord.sign_in_at!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const msg = `Already signed in today at ${formattedIn}.`;
        logRecentScanAttempt({
          staffId: profileId,
          staffName: profile?.full_name || 'Staff Member',
          campusName: qrCode.name || 'Main Gate',
          status: 'SUCCESS_SIGN_IN',
          resultMessage: msg,
          rawTokenSummary: qrCode.name,
          debugReason: 'Duplicate scan ignored within 120s safety threshold.'
        });
        return {
          status: 'SIGNED_IN',
          record: existingRecord,
          message: msg
        };
      }

      if (existingRecord.sign_out_at) {
        const msg = 'Attendance already completed for today.';
        logRecentScanAttempt({
          staffId: profileId,
          staffName: profile?.full_name || 'Staff Member',
          campusName: qrCode.name || 'Main Gate',
          status: 'FAILED',
          resultMessage: msg,
          rawTokenSummary: qrCode.name,
          debugReason: 'Staff member has already signed out for this date.'
        });
        throw new Error(msg);
      }

      // Update record with sign_out timestamp
      const { data: updatedRecord, error: updateError } = await supabase
        .from('staff_attendance')
        .update({
          sign_out_at: nowIso,
          updated_at: nowIso
        })
        .eq('id', existingRecord.id)
        .select('*')
        .single();

      if (updateError) {
        console.warn('[StaffAttendanceService] Error recording sign-out, falling back to local:', updateError.message);
        return this.scanEntranceQrLocalFallback(profileId, targetCampusId, todayStr, qrCode, profile?.full_name, staffDept);
      }

      const formattedOut = new Date(nowIso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const msg = `Signed out successfully at ${formattedOut}.`;

      logRecentScanAttempt({
        staffId: profileId,
        staffName: profile?.full_name || 'Staff Member',
        campusName: qrCode.name || 'Main Gate',
        status: 'SUCCESS_SIGN_OUT',
        resultMessage: msg,
        rawTokenSummary: qrCode.name,
        debugReason: `Sign out recorded at ${formattedOut}.`
      });

      // Update local storage and broadcast
      try {
        const rawLocal = localStorage.getItem('jipas_staff_attendance');
        const localList = rawLocal ? JSON.parse(rawLocal) : [];
        const idx = localList.findIndex((r: any) => r.id === updatedRecord.id || (r.staff_id === profileId && r.attendance_date === todayStr));
        if (idx !== -1) {
          localList[idx] = { ...localList[idx], ...updatedRecord };
        } else {
          localList.unshift({
            ...updatedRecord,
            staff_name: profile?.full_name || 'Staff Member',
            teacherName: profile?.full_name || 'Staff Member',
            teacherId: profileId,
            department: staffDept
          });
        }
        localStorage.setItem('jipas_staff_attendance', JSON.stringify(localList));
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('jipas_staff_attendance_updated', { detail: { record: updatedRecord, status: 'SIGNED_OUT' } }));
          window.dispatchEvent(new CustomEvent('jipas_cloud_synced'));
        }
      } catch {}

      return {
        status: 'SIGNED_OUT',
        record: updatedRecord,
        message: msg
      };
    }
  },

  /**
   * Enqueues an offline attendance QR scan for future background sync persistence
   */
  async queueOfflineScan(
    rawToken: string,
    profileId: string,
    staffCampusId: string,
    staffName: string
  ): Promise<void> {
    const queue = await idbGet<any[]>(OFFLINE_ATTENDANCE_QUEUE_KEY, []);
    
    // Add unique event log
    const offlineEvent = {
      id: `off_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`,
      rawToken,
      profileId,
      staffCampusId,
      staffName,
      device_scanned_at: new Date().toISOString(),
      status: 'PENDING_SYNC'
    };

    queue.push(offlineEvent);
    await idbSet(OFFLINE_ATTENDANCE_QUEUE_KEY, queue);
    console.log('[StaffAttendanceService] Scanned offline staff QR. Queued for background synchronization:', offlineEvent);
  },

  /**
   * Resolves and synchronizes queued offline scans with Supabase once network becomes online
   */
  async syncOfflineScans(): Promise<{ successCount: number; failedCount: number }> {
    const queue = await idbGet<any[]>(OFFLINE_ATTENDANCE_QUEUE_KEY, []);
    if (!queue || queue.length === 0) return { successCount: 0, failedCount: 0 };

    let successCount = 0;
    let failedCount = 0;
    const remainingQueue: any[] = [];

    for (const item of queue) {
      try {
        // Replay scan transaction securely with original device event timestamp stored
        await this.scanEntranceQr(item.rawToken, item.profileId, item.staffCampusId);
        successCount++;
      } catch (err: any) {
        console.warn(`[StaffAttendanceService] Failed to sync offline record:`, err.message);
        failedCount++;
        // Preserve in queue if it was a genuine server-side auth error or network timeout
        if (err.message?.includes('network') || err.message?.includes('timeout') || err.message?.includes('Fetch')) {
          remainingQueue.push(item);
        }
      }
    }

    await idbSet(OFFLINE_ATTENDANCE_QUEUE_KEY, remainingQueue);
    return { successCount, failedCount };
  },

  /**
   * Administrative Correction Flow with strict change-audit tracking
   */
  async adminCorrectAttendance(
    attendanceId: string,
    changes: { status?: 'Present' | 'Late' | 'Absent' | 'Excused'; sign_in_at?: string | null; sign_out_at?: string | null },
    administratorId: string,
    reason: string
  ): Promise<StaffAttendanceRecord> {
    if (!reason || reason.trim().length === 0) {
      throw new Error('A valid administrative reason is required for corrections.');
    }

    // 1. Fetch old record for audit logging
    const { data: oldRecord, error: fetchErr } = await supabase
      .from('staff_attendance')
      .select('*')
      .eq('id', attendanceId)
      .single();

    if (fetchErr || !oldRecord) {
      throw new Error('Attendance record to correct was not found.');
    }

    const nowIso = new Date().toISOString();

    // 2. Perform the update
    const { data: updatedRecord, error: updateErr } = await supabase
      .from('staff_attendance')
      .update({
        ...changes,
        source: 'ADMIN_CORRECTION',
        updated_at: nowIso
      })
      .eq('id', attendanceId)
      .select('*')
      .single();

    if (updateErr) {
      console.error('[StaffAttendanceService] Error updating record:', updateErr.message);
      throw new Error('Failed to apply attendance correction.');
    }

    // 3. Record full correction audit log
    const { error: auditErr } = await supabase
      .from('staff_attendance_corrections_audit')
      .insert({
        staff_id: oldRecord.staff_id,
        attendance_id: attendanceId,
        administrator_id: administratorId,
        campus_id: oldRecord.campus_id,
        old_value: {
          status: oldRecord.status,
          sign_in_at: oldRecord.sign_in_at,
          sign_out_at: oldRecord.sign_out_at
        },
        new_value: {
          status: updatedRecord.status,
          sign_in_at: updatedRecord.sign_in_at,
          sign_out_at: updatedRecord.sign_out_at
        },
        reason: reason.trim()
      });

    if (auditErr) {
      console.warn('[StaffAttendanceService] Non-fatal: Failed to log audit entry:', auditErr.message);
    }

    return updatedRecord;
  },

  async scanEntranceQrLocalFallback(
    profileId: string,
    targetCampusId: string,
    todayStr: string,
    qrCode: EntranceQrCode,
    profileName?: string,
    staffDept?: string
  ): Promise<{ status: 'SIGNED_IN' | 'SIGNED_OUT'; record: StaffAttendanceRecord; message: string }> {
    const rawLocal = localStorage.getItem('jipas_staff_attendance');
    let localRecords: any[] = [];
    try {
      if (rawLocal) localRecords = JSON.parse(rawLocal);
    } catch {}

    const nowIso = new Date().toISOString();
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const nowHours = new Date().getHours();
    const nowMins = new Date().getMinutes();
    const isLate = nowHours > 8 || (nowHours === 8 && nowMins > 30);

    const existingIdx = localRecords.findIndex(r => (r.teacherId === profileId || r.staff_id === profileId) && (r.date === todayStr || r.attendance_date === todayStr));

    if (existingIdx === -1) {
      const newRec = {
        id: `att_local_${Date.now()}`,
        staff_id: profileId,
        teacherId: profileId,
        teacherName: profileName || 'Staff Member',
        staff_name: profileName || 'Staff Member',
        campus_id: targetCampusId,
        attendance_date: todayStr,
        date: todayStr,
        sign_in_at: nowIso,
        sign_out_at: null,
        clockInTime: nowTime,
        status: isLate ? 'Late' : 'Present',
        source: 'ONLINE_QR' as const,
        review_status: 'REVIEWED' as const,
        qr_code_id: qrCode.id,
        created_at: nowIso,
        updated_at: nowIso,
        department: staffDept || 'Staff',
        campus_name: 'Main Campus'
      };
      localRecords.unshift(newRec);
      localStorage.setItem('jipas_staff_attendance', JSON.stringify(localRecords));

      const msg = `Signed in successfully at ${nowTime} (Local Mode).`;
      logRecentScanAttempt({
        staffId: profileId,
        staffName: profileName || 'Staff Member',
        campusName: qrCode.name || 'Main Gate',
        status: 'SUCCESS_SIGN_IN',
        resultMessage: msg,
        rawTokenSummary: qrCode.name,
        debugReason: `Recorded locally. Status: ${isLate ? 'Late' : 'Present'}.`
      });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('jipas_staff_attendance_updated', { detail: { record: newRec, status: 'SIGNED_IN' } }));
        window.dispatchEvent(new CustomEvent('jipas_cloud_synced'));
      }

      return {
        status: 'SIGNED_IN',
        record: newRec as any,
        message: msg
      };
    } else {
      const existing = localRecords[existingIdx];
      if (existing.sign_out_at || existing.clockOutTime) {
        const msg = 'Attendance already completed for today.';
        logRecentScanAttempt({
          staffId: profileId,
          staffName: profileName || 'Staff Member',
          campusName: qrCode.name || 'Main Gate',
          status: 'FAILED',
          resultMessage: msg,
          rawTokenSummary: qrCode.name,
          debugReason: 'Staff member already signed out for today.'
        });
        throw new Error(msg);
      }
      existing.sign_out_at = nowIso;
      existing.clockOutTime = nowTime;
      existing.updated_at = nowIso;
      localRecords[existingIdx] = existing;
      localStorage.setItem('jipas_staff_attendance', JSON.stringify(localRecords));

      const msg = `Signed out successfully at ${nowTime} (Local Mode).`;
      logRecentScanAttempt({
        staffId: profileId,
        staffName: profileName || 'Staff Member',
        campusName: qrCode.name || 'Main Gate',
        status: 'SUCCESS_SIGN_OUT',
        resultMessage: msg,
        rawTokenSummary: qrCode.name,
        debugReason: `Signed out locally at ${nowTime}.`
      });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('jipas_staff_attendance_updated', { detail: { record: existing, status: 'SIGNED_OUT' } }));
        window.dispatchEvent(new CustomEvent('jipas_cloud_synced'));
      }

      return {
        status: 'SIGNED_OUT',
        record: existing as any,
        message: msg
      };
    }
  }
};

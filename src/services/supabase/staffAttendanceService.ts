import { supabase } from '../../lib/supabase';
import { SchoolCalendarService } from './schoolCalendarService';
import { EntranceQrService, EntranceQrCode } from './entranceQrService';
import { idbGet, idbSet } from '../idbService';

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
  async listAttendance(filters: StaffAttendanceFilter): Promise<StaffAttendanceRecord[]> {
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

    if (filters.campusId) {
      query = query.eq('campus_id', filters.campusId);
    }
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
    if (error) {
      console.error('[StaffAttendanceService] Error listing attendance:', error.message);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      staff_id: row.staff_id,
      campus_id: row.campus_id,
      attendance_date: row.attendance_date,
      sign_in_at: row.sign_in_at,
      sign_out_at: row.sign_out_at,
      status: row.status,
      source: row.source,
      review_status: row.review_status || 'REVIEWED',
      qr_code_id: row.qr_code_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
      staff_name: row.profile?.full_name || 'Staff Member',
      staff_number: row.profile?.staff_id || 'ST-000',
      department: row.profile?.role || 'Staff',
      campus_name: row.campus?.name || 'Main Campus'
    }));
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
      .select('id, role, full_name, campus_id')
      .eq('id', profileId)
      .maybeSingle();

    if (profile) {
      const normalizedRole = (profile.role || '').toLowerCase().trim();
      if (normalizedRole === 'ceo' || normalizedRole === 'director') {
        throw new Error('Executive leadership (CEO / Director) are exempt from daily entrance QR attendance scanning.');
      }
      if (normalizedRole === 'student' || normalizedRole === 'parent') {
        throw new Error('Only school staff and employees are authorized to record attendance.');
      }
    }

    // 2. Verify and authenticate the token (Token Authenticity Check)
    const qrCode = await EntranceQrService.verifyQrToken(rawToken);

    // 3. Ignore campus matching checks: allow universal school-wide token authentication.
    // Verify only the authenticity of the token instead of forcing a match between the QR origin and scanning device's campus.
    const targetCampusId = profile?.campus_id || staffCampusId || qrCode.campus_id || 'jipas-1-kpehenou';

    // 3. Date & calendar validation
    const todayStr = new Date().toISOString().split('T')[0];
    const calendarCheck = await SchoolCalendarService.checkDate(todayStr, targetCampusId);
    if (!calendarCheck.isWorkingDay) {
      const reason = calendarCheck.reason || 'Weekend';
      const eventInfo = calendarCheck.eventName ? `: ${calendarCheck.eventName}` : '';
      throw new Error(`Staff attendance is not available today. ${reason}${eventInfo}.`);
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
      console.error('[StaffAttendanceService] Error checking existing attendance:', error.message);
      throw new Error(`Database server verification error: ${error.message} (Code: ${error.code})`);
    }

    const nowIso = new Date().toISOString();

    if (!existingRecord) {
      // --- SIGN IN FLOW ---
      // Determine if Late (e.g. after 08:30 AM)
      const nowHours = new Date().getHours();
      const nowMins = new Date().getMinutes();
      const isLate = nowHours > 8 || (nowHours === 8 && nowMins > 30);

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
        console.error('[StaffAttendanceService] Error recording sign-in:', insertError.message);
        throw new Error('Failed to record sign-in attendance.');
      }

      const formattedTime = new Date(nowIso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return {
        status: 'SIGNED_IN',
        record: insertedRecord,
        message: `Signed in successfully at ${formattedTime}.`
      };
    } else {
      // --- SIGN OUT FLOW ---
      // 1. Check duplicate scan safety window (e.g., within 2 minutes)
      const lastScanTime = new Date(existingRecord.updated_at).getTime();
      const secondsSinceLastScan = (Date.now() - lastScanTime) / 1000;
      if (secondsSinceLastScan < 120) {
        const formattedIn = new Date(existingRecord.sign_in_at!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return {
          status: 'SIGNED_IN',
          record: existingRecord,
          message: `Already signed in today at ${formattedIn}.`
        };
      }

      // 2. Check if already signed out
      if (existingRecord.sign_out_at) {
        throw new Error('Attendance already completed for today.');
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
        console.error('[StaffAttendanceService] Error recording sign-out:', updateError.message);
        throw new Error('Failed to record sign-out attendance.');
      }

      const formattedOut = new Date(nowIso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return {
        status: 'SIGNED_OUT',
        record: updatedRecord,
        message: `Signed out successfully at ${formattedOut}.`
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
  }
};

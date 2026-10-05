import { supabase } from '../../lib/supabase';
import { SchoolCalendarService } from './schoolCalendarService';
import { StaffAttendanceRecord, StaffAttendanceService } from './staffAttendanceService';

export type AttendanceStatusType =
  | 'NOT_ARRIVED'
  | 'SIGNED_IN'
  | 'SIGNED_OUT'
  | 'LATE'
  | 'EARLY_DEPARTURE'
  | 'ABSENT'
  | 'HOLIDAY'
  | 'WEEKEND'
  | 'EXCUSED';

export interface WorkingHoursConfig {
  expectedSignIn: string; // e.g. "08:00"
  expectedSignOut: string; // e.g. "17:00"
  lateThresholdMins: number; // e.g. 30
  earlyDepartureThresholdMins: number; // e.g. 30
  workingDays: number[]; // e.g. [1, 2, 3, 4, 5] (Monday to Friday)
}

export const DEFAULT_WORKING_HOURS: WorkingHoursConfig = {
  expectedSignIn: '08:00',
  expectedSignOut: '17:00',
  lateThresholdMins: 30,
  earlyDepartureThresholdMins: 30,
  workingDays: [1, 2, 3, 4, 5]
};

export const StaffAttendanceReportService = {
  /**
   * Fetches the working hours configuration for a given campus from system_settings table.
   * If not configured, returns DEFAULT_WORKING_HOURS.
   */
  async getWorkingHours(campusId: string): Promise<WorkingHoursConfig> {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('campus_id', campusId)
        .eq('setting_key', 'staff_attendance_hours')
        .maybeSingle();

      if (error) {
        console.warn('[StaffAttendanceReportService] Error fetching working hours settings:', error.message);
        return DEFAULT_WORKING_HOURS;
      }

      if (data && data.setting_value) {
        const val = data.setting_value as any;
        return {
          expectedSignIn: val.expected_signin_time || DEFAULT_WORKING_HOURS.expectedSignIn,
          expectedSignOut: val.expected_signout_time || DEFAULT_WORKING_HOURS.expectedSignOut,
          lateThresholdMins: typeof val.late_threshold_mins === 'number' ? val.late_threshold_mins : DEFAULT_WORKING_HOURS.lateThresholdMins,
          earlyDepartureThresholdMins: typeof val.early_departure_threshold_mins === 'number' ? val.early_departure_threshold_mins : DEFAULT_WORKING_HOURS.earlyDepartureThresholdMins,
          workingDays: Array.isArray(val.working_days) ? val.working_days : DEFAULT_WORKING_HOURS.workingDays
        };
      }
    } catch (err) {
      console.warn('[StaffAttendanceReportService] Exception in getWorkingHours:', err);
    }
    return DEFAULT_WORKING_HOURS;
  },

  /**
   * Saves or updates the working hours configuration for a given campus under system_settings table.
   */
  async saveWorkingHours(campusId: string, config: WorkingHoursConfig, actorId: string): Promise<void> {
    const payload = {
      expected_signin_time: config.expectedSignIn,
      expected_signout_time: config.expectedSignOut,
      late_threshold_mins: config.lateThresholdMins,
      early_departure_threshold_mins: config.earlyDepartureThresholdMins,
      working_days: config.workingDays
    };

    // Check if setting already exists
    const { data, error: selectErr } = await supabase
      .from('system_settings')
      .select('id')
      .eq('campus_id', campusId)
      .eq('setting_key', 'staff_attendance_hours')
      .maybeSingle();

    if (selectErr) {
      throw new Error('Failed to verify existing settings: ' + selectErr.message);
    }

    if (data) {
      const { error: updateErr } = await supabase
        .from('system_settings')
        .update({
          setting_value: payload,
          updated_by: actorId,
          updated_at: new Date().toISOString()
        })
        .eq('id', data.id);

      if (updateErr) {
        throw new Error('Failed to update system settings: ' + updateErr.message);
      }
    } else {
      const { error: insertErr } = await supabase
        .from('system_settings')
        .insert({
          campus_id: campusId,
          setting_key: 'staff_attendance_hours',
          setting_value: payload,
          description: 'Configured working hours and thresholds for staff attendance checks',
          updated_by: actorId
        });

      if (insertErr) {
        throw new Error('Failed to insert system settings: ' + insertErr.message);
      }
    }

    // Log the configuration audit change
    await supabase.from('audit_logs').insert({
      campus_id: campusId,
      user_id: actorId,
      action: 'SETTINGS_CONFIGURED',
      module: 'Staff Attendance',
      description: `Configured staff working hours: Sign-In=${config.expectedSignIn}, Sign-Out=${config.expectedSignOut}`,
      metadata: { config }
    });
  },

  /**
   * Calculates the highly authoritative status for a given daily attendance record and calendar constraints.
   */
  calculateStatus(
    record: StaffAttendanceRecord | null,
    calendarCheck: { isWorkingDay: boolean; reason?: string; eventName?: string },
    config: WorkingHoursConfig,
    dateStr: string
  ): AttendanceStatusType {
    // 1. If date is Holiday, return HOLIDAY
    if (calendarCheck.reason === 'Holiday' || calendarCheck.eventName) {
      return 'HOLIDAY';
    }

    // 2. If date is Weekend, return WEEKEND
    const dayOfWeek = new Date(dateStr).getDay();
    if (!calendarCheck.isWorkingDay && (dayOfWeek === 0 || dayOfWeek === 6)) {
      return 'WEEKEND';
    }

    // 3. If no calendar working day (e.g. school break), return HOLIDAY
    if (!calendarCheck.isWorkingDay) {
      return 'HOLIDAY';
    }

    // 4. If no attendance record exists
    if (!record) {
      // If it's a past date, it is considered ABSENT
      const todayStr = new Date().toISOString().split('T')[0];
      if (dateStr < todayStr) {
        return 'ABSENT';
      }
      return 'NOT_ARRIVED';
    }

    // 5. If marked as Excused
    if (record.status === 'Excused') {
      return 'EXCUSED';
    }

    // 6. If marked as Absent
    if (record.status === 'Absent') {
      return 'ABSENT';
    }

    // 7. Check Sign-In details
    if (record.sign_in_at) {
      const signInTime = new Date(record.sign_in_at);
      const [expInHour, expInMin] = config.expectedSignIn.split(':').map(Number);
      const expectedInDate = new Date(record.sign_in_at);
      expectedInDate.setHours(expInHour, expInMin, 0, 0);

      const delayMins = (signInTime.getTime() - expectedInDate.getTime()) / (1000 * 60);
      const isLate = delayMins > config.lateThresholdMins;

      // Check Sign-Out details
      if (record.sign_out_at) {
        const signOutTime = new Date(record.sign_out_at);
        const [expOutHour, expOutMin] = config.expectedSignOut.split(':').map(Number);
        const expectedOutDate = new Date(record.sign_out_at);
        expectedOutDate.setHours(expOutHour, expOutMin, 0, 0);

        const departureGapMins = (expectedOutDate.getTime() - signOutTime.getTime()) / (1000 * 60);
        const isEarlyDeparture = departureGapMins > config.earlyDepartureThresholdMins;

        if (isLate) return 'LATE';
        if (isEarlyDeparture) return 'EARLY_DEPARTURE';
        return 'SIGNED_OUT';
      }

      return isLate ? 'LATE' : 'SIGNED_IN';
    }

    return 'NOT_ARRIVED';
  },

  /**
   * Safe list logic to retrieve all non-student profiles for reporting/dashboards.
   */
  async listStaffProfiles(campusId?: string): Promise<any[]> {
    const profileMap = new Map<string, any>();

    // 1. Fetch from Supabase
    try {
      let query = supabase
        .from('profiles')
        .select('id, email, full_name, role, campus_id, staff_id, is_active')
        .neq('role', 'student');

      if (campusId && campusId !== 'all' && campusId !== 'All') {
        query = query.eq('campus_id', campusId);
      }

      const { data, error } = await query.order('full_name');
      if (!error && Array.isArray(data)) {
        data.forEach(p => profileMap.set(p.id, p));
      }
    } catch (err) {
      console.warn('[StaffAttendanceReportService] Error loading profiles:', err);
    }

    // 2. Merge local teachers and staff
    try {
      const rawTeachers = localStorage.getItem('jipas_teachers');
      if (rawTeachers) {
        const teachers = JSON.parse(rawTeachers);
        if (Array.isArray(teachers)) {
          teachers.forEach((t: any) => {
            const tId = t.id || t.staffId;
            if (tId && !profileMap.has(tId)) {
              profileMap.set(tId, {
                id: tId,
                email: t.email || `${t.name?.toLowerCase().replace(/\s+/g, '.')}@jipas.edu`,
                full_name: t.name || 'Staff Member',
                role: t.role || t.department || 'Teacher',
                campus_id: t.campusId || campusId || 'jipas-1-kpehenou',
                staff_id: t.staffId || 'ST-001',
                is_active: t.status !== 'Inactive'
              });
            }
          });
        }
      }
    } catch {}

    const allProfiles = Array.from(profileMap.values());
    if (campusId && campusId !== 'all' && campusId !== 'All') {
      return allProfiles.filter(p => p.campus_id === campusId || !p.campus_id || p.campus_id === 'Main');
    }
    return allProfiles;
  },

  /**
   * Generates aggregated operational dashboard statistics for the specified day and campus.
   */
  async getDailyDashboardStats(dateStr: string, campusId: string): Promise<{
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
  }> {
    // 1. Fetch config, profiles, and attendance records
    const config = await this.getWorkingHours(campusId);
    const profiles = await this.listStaffProfiles(campusId);
    const attendance = await StaffAttendanceService.listAttendance({
      campusId,
      date: dateStr
    });

    const calendarCheck = await SchoolCalendarService.checkDate(dateStr, campusId);

    let totalStaff = Math.max(profiles.length, attendance.length);
    let expectedStaff = calendarCheck.isWorkingDay ? Math.max(profiles.filter(p => p.is_active !== false).length, attendance.length) : 0;
    let signedIn = 0;
    let signedOut = 0;
    let onCampus = 0;
    let notArrived = 0;
    let late = 0;
    let earlyDeparture = 0;
    let absent = 0;

    const processedStaffIds = new Set<string>();

    for (const profile of profiles) {
      processedStaffIds.add(profile.id);
      const record = attendance.find(a => a.staff_id === profile.id || a.staff_name === profile.full_name) || null;
      const status = this.calculateStatus(record, calendarCheck, config, dateStr);

      if (status === 'SIGNED_IN') {
        signedIn++;
        onCampus++;
      } else if (status === 'SIGNED_OUT') {
        signedIn++;
        signedOut++;
      } else if (status === 'LATE') {
        signedIn++;
        late++;
        if (record && !record.sign_out_at) {
          onCampus++;
        } else if (record && record.sign_out_at) {
          signedOut++;
        }
      } else if (status === 'EARLY_DEPARTURE') {
        signedIn++;
        signedOut++;
        earlyDeparture++;
      } else if (status === 'ABSENT') {
        absent++;
      } else if (status === 'NOT_ARRIVED') {
        notArrived++;
      }
    }

    // Account for any attendance records for staff not explicitly in profiles list
    for (const att of attendance) {
      if (!processedStaffIds.has(att.staff_id)) {
        processedStaffIds.add(att.staff_id);
        if (att.sign_in_at) {
          signedIn++;
          if (att.status === 'Late') late++;
          if (att.sign_out_at) {
            signedOut++;
          } else {
            onCampus++;
          }
        }
      }
    }

    const completionCount = signedOut;
    const completionPercentage = expectedStaff > 0 ? Math.min(100, Math.round((completionCount / expectedStaff) * 100)) : (signedIn > 0 ? 100 : 0);

    return {
      totalStaff,
      expectedStaff: Math.max(expectedStaff, signedIn),
      signedIn,
      signedOut,
      onCampus,
      notArrived,
      late,
      earlyDeparture,
      absent,
      completionPercentage
    };
  },

  /**
   * Resolves, audits, and transitions the review/dispute state of an attendance record
   */
  async updateReviewState(
    attendanceId: string,
    state: 'REVIEW_REQUIRED' | 'REVIEWED' | 'CORRECTED' | 'DISMISSED',
    actorId: string,
    campusId: string,
    reason: string
  ): Promise<void> {
    if (!reason || reason.trim().length === 0) {
      throw new Error('A reason is mandatory for auditing review status transitions.');
    }

    // Retrieve old record for change auditing
    const { data: oldRecord, error: fetchErr } = await supabase
      .from('staff_attendance')
      .select('*')
      .eq('id', attendanceId)
      .single();

    if (fetchErr || !oldRecord) {
      throw new Error('Attendance record to transition was not found.');
    }

    const { error: updateErr } = await supabase
      .from('staff_attendance')
      .update({
        review_status: state,
        updated_at: new Date().toISOString()
      })
      .eq('id', attendanceId);

    if (updateErr) {
      throw new Error('Failed to update attendance review state: ' + updateErr.message);
    }

    // Log the state transition in the corrections audit trail table
    await supabase.from('staff_attendance_corrections_audit').insert({
      staff_id: oldRecord.staff_id,
      attendance_id: attendanceId,
      administrator_id: actorId,
      campus_id: oldRecord.campus_id,
      old_value: { review_status: oldRecord.review_status || 'REVIEWED' },
      new_value: { review_status: state },
      reason: `Dispute/Review State changed to [${state}]: ${reason.trim()}`
    });

    // Also write to global audit_logs
    await supabase.from('audit_logs').insert({
      campus_id: campusId,
      user_id: actorId,
      action: 'ATTENDANCE_REVIEWED',
      module: 'Staff Attendance',
      description: `Dispute status for record ${attendanceId} changed to ${state}. Reason: ${reason}`,
      metadata: { attendanceId, state, reason }
    });
  }
};

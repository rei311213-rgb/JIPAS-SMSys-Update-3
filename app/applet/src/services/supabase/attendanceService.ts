import { supabase } from '@/src/lib/supabase';
import { StudentAttendanceRecord } from '@/src/types';

export const AttendanceService = {
  async listStudentAttendance(campusId?: string): Promise<StudentAttendanceRecord[]> {
    let query = supabase.from('attendance_records').select('*, students(full_name, admission_number), classes(name)');
    if (campusId && campusId !== 'All') {
      query = query.eq('campus_id', campusId);
    }
    const { data, error } = await query;
    if (error) {
      console.warn('[Supabase AttendanceService] listStudentAttendance notice:', error.message);
      return [];
    }

    const grouped: Record<string, StudentAttendanceRecord> = {};

    (data || []).forEach((row: any) => {
      const dateKey = row.attendance_date;
      const classId = row.class_id || 'general';
      const key = `${dateKey}_${classId}`;

      if (!grouped[key]) {
        grouped[key] = {
          id: `att_${key}`,
          date: dateKey,
          className: row.classes?.name || 'Class',
          records: {},
          updatedAt: row.updated_at || new Date().toISOString(),
          updatedBy: row.recorded_by || 'System'
        };
      }
      grouped[key].records[row.student_id] = row.status;
    });

    return Object.values(grouped);
  },

  async saveStudentAttendance(record: StudentAttendanceRecord, classId: string, campusId?: string): Promise<void> {
    const rows = Object.entries(record.records).map(([studentId, status]) => ({
      student_id: studentId,
      campus_id: campusId || null,
      class_id: classId,
      attendance_date: record.date,
      status: status,
      notes: record.updatedBy ? `Recorded by ${record.updatedBy}` : null,
      updated_at: new Date().toISOString()
    }));

    if (rows.length === 0) return;

    for (const row of rows) {
      const { error } = await supabase.from('attendance_records').upsert(row, {
        onConflict: 'student_id, attendance_date'
      });
      if (error) {
        console.warn('[Supabase AttendanceService] saveStudentAttendance row error:', error.message);
      }
    }
  }
};

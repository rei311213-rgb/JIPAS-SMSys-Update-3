import { supabase } from '@/src/lib/supabase';
import { ExamScheduleItem } from '@/src/types';

export const ExamService = {
  async listExamSchedules(campusId?: string): Promise<ExamScheduleItem[]> {
    let query = supabase.from('exam_schedules').select('*, subjects(name), classes(name), academic_years(name), terms(name)');
    const { data, error } = await query;
    if (error) {
      console.warn('[Supabase ExamService] listExamSchedules notice:', error.message);
      return [];
    }
    return (data || []).map((row: any) => ({
      id: row.id,
      academicYear: row.academic_years?.name || '2025-2026',
      term: row.terms?.name || 'Term 1',
      className: row.classes?.name || 'SHS 1 Science A',
      subjectName: row.subjects?.name || 'General Subject',
      examDate: row.exam_date || '2025-11-15',
      startTime: row.start_time || '09:00 AM',
      endTime: row.end_time || '11:00 AM',
      venue: row.venue || 'Main Exam Hall',
      invigilator: row.invigilator_id || 'Invigilator',
      totalMarks: row.total_marks || 100,
      instructions: row.instructions || '',
      status: (row.status || 'Scheduled') as ExamScheduleItem['status']
    }));
  },

  async saveExamSchedule(item: ExamScheduleItem): Promise<void> {
    const { error } = await supabase.from('exam_schedules').upsert({
      id: item.id,
      exam_date: item.examDate,
      start_time: item.startTime,
      end_time: item.endTime,
      venue: item.venue,
      total_marks: item.totalMarks,
      instructions: item.instructions,
      status: item.status
    }, { onConflict: 'id' });
    if (error) throw error;
  },

  async deleteExamSchedule(id: string): Promise<void> {
    const { error } = await supabase.from('exam_schedules').delete().eq('id', id);
    if (error) throw error;
  },

  async listResults(campusId?: string): Promise<any[]> {
    const { data, error } = await supabase.from('results').select('*, students(full_name, admission_number), subjects(name), classes(name)');
    if (error) {
      console.warn('[Supabase ExamService] listResults notice:', error.message);
      return [];
    }
    return (data || []).map((row: any) => ({
      id: row.id,
      studentId: row.student_id,
      studentName: row.students?.full_name || 'Student',
      admissionNo: row.students?.admission_number || '',
      subjectName: row.subjects?.name || '',
      classScore: row.class_score || 0,
      examScore: row.exam_score || 0,
      totalScore: row.total_score || 0,
      grade: row.grade || 'A',
      position: row.position || 1,
      remarks: row.remarks || '',
      approvalStatus: row.approval_status || 'Pending'
    }));
  },

  async saveResult(result: any): Promise<void> {
    const { error } = await supabase.from('results').upsert({
      id: result.id,
      student_id: result.studentId,
      class_score: result.classScore,
      exam_score: result.examScore,
      grade: result.grade,
      position: result.position,
      remarks: result.remarks,
      approval_status: result.approvalStatus || 'Pending',
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' });
    if (error) throw error;
  }
};

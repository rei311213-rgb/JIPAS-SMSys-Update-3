import { supabase } from '../../lib/supabase';
import { Student } from '../../types';

export const StudentService = {
  async listStudents(campusId?: string): Promise<Student[]> {
    let query = supabase.from('students').select('*');
    if (campusId && campusId !== 'All') {
      query = query.eq('campus_id', campusId);
    }
    const { data, error } = await query;
    if (error) {
      console.warn('[Supabase StudentService] listStudents notice:', error.message);
      return [];
    }
    return (data || []).map((row: any) => ({
      id: row.id,
      admissionNo: row.admission_number,
      fullName: row.full_name,
      gender: row.gender || 'Male',
      dob: row.dob || '2008-01-01',
      className: row.class_name || 'SHS 1 Science A',
      course: row.course || 'General Science',
      department: row.department || 'Senior High School',
      house: row.house || 'Aggrey House',
      status: row.status || 'Active',
      parentName: row.parent_name || 'Guardian',
      parentPhone: row.parent_phone || '0244000000',
      academicYear: row.academic_year || '2025-2026',
      term: row.term || '1',
      rollNo: row.roll_no || '001',
      enrollmentDate: row.enrollment_date || '2025-09-01',
      campus: row.campus_id || 'JIPAS 1 — Kpéhénou',
      isCurrent: row.is_current ?? true,
      updatedAt: row.updated_at
    }));
  },

  async getStudentById(id: string): Promise<Student | null> {
    const { data, error } = await supabase.from('students').select('*').eq('id', id).single();
    if (error || !data) return null;
    return {
      id: data.id,
      admissionNo: data.admission_number,
      fullName: data.full_name,
      gender: data.gender || 'Male',
      dob: data.dob || '2008-01-01',
      className: data.class_name || 'SHS 1 Science A',
      course: data.course || 'General Science',
      department: data.department || 'Senior High School',
      house: data.house || 'Aggrey House',
      status: data.status || 'Active',
      parentName: data.parent_name || 'Guardian',
      parentPhone: data.parent_phone || '0244000000',
      academicYear: data.academic_year || '2025-2026',
      term: data.term || '1',
      rollNo: data.roll_no || '001',
      enrollmentDate: data.enrollment_date || '2025-09-01',
      campus: data.campus_id || 'JIPAS 1 — Kpéhénou',
      isCurrent: data.is_current ?? true,
      updatedAt: data.updated_at
    };
  },

  async createStudent(student: Student): Promise<void> {
    const { error } = await supabase.from('students').upsert({
      id: student.id,
      admission_number: student.admissionNo,
      student_number: student.admissionNo,
      full_name: student.fullName,
      gender: student.gender,
      dob: student.dob,
      class_name: student.className,
      course: student.course,
      department: student.department,
      house: student.house,
      status: student.status,
      parent_name: student.parentName,
      parent_phone: student.parentPhone,
      academic_year: student.academicYear,
      term: student.term,
      roll_no: student.rollNo,
      enrollment_date: student.enrollmentDate,
      campus_id: student.campus || 'JIPAS 1 — Kpéhénou',
      is_current: student.isCurrent ?? true,
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' });
    if (error) throw error;
  },

  async updateStudent(student: Student): Promise<void> {
    await StudentService.createStudent(student);
  }
};

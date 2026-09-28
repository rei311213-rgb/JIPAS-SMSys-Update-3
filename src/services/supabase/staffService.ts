import { supabase } from '../../lib/supabase';
import { Teacher } from '../../types';

export const StaffService = {
  async listStaff(): Promise<Teacher[]> {
    const { data, error } = await supabase.from('staff_members').select('*');
    if (error) return [];
    return (data || []).map((row: any) => ({
      id: row.id,
      staffId: row.staff_number,
      name: row.full_name,
      email: row.email || 'staff@jipas.edu',
      phone: row.phone || '0244000000',
      gender: 'Male' as const,
      campus: 'JIPAS 1',
      status: 'Active',
      department: row.department_id || 'Academic Faculty',
      designation: row.designation || 'Teacher',
      academicQualification: 'B.Ed',
      professionalQualification: 'Licensed Teacher',
      rank: 'Senior Teacher',
      classesTaught: [],
      subjectsTaught: []
    }));
  },

  async createStaff(teacher: Teacher): Promise<void> {
    const { error } = await supabase.from('staff_members').upsert({
      id: teacher.id,
      full_name: teacher.name,
      staff_number: teacher.staffId,
      phone: teacher.phone,
      email: teacher.email,
      department_id: teacher.department,
      designation: teacher.designation,
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' });
    if (error) throw error;
  }
};

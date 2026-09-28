import { supabase } from '../../lib/supabase';

export interface GuardianRecord {
  id: string;
  fullName: string;
  relationship: string;
  phone: string;
  email?: string;
  occupation?: string;
  address?: string;
  isPrimary: boolean;
}

export const GuardianService = {
  async listGuardians(): Promise<GuardianRecord[]> {
    const { data, error } = await supabase.from('guardians').select('*');
    if (error) return [];
    return (data || []).map((row: any) => ({
      id: row.id,
      fullName: row.full_name,
      relationship: row.relationship,
      phone: row.phone,
      email: row.email,
      occupation: row.occupation,
      address: row.address,
      isPrimary: row.is_primary
    }));
  },

  async createGuardian(guardian: GuardianRecord): Promise<void> {
    const { error } = await supabase.from('guardians').upsert({
      id: guardian.id,
      full_name: guardian.fullName,
      relationship: guardian.relationship,
      phone: guardian.phone,
      email: guardian.email,
      occupation: guardian.occupation,
      address: guardian.address,
      is_primary: guardian.isPrimary,
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' });
    if (error) throw error;
  },

  async linkGuardianToStudent(studentId: string, guardianId: string, isPrimary = false): Promise<void> {
    const { error } = await supabase.from('student_guardians').upsert({
      student_id: studentId,
      guardian_id: guardianId,
      is_primary: isPrimary
    }, { onConflict: 'student_id, guardian_id' });
    if (error) throw error;
  }
};

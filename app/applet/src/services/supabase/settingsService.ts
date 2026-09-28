import { supabase } from '@/src/lib/supabase';

export const SettingsSupabaseService = {
  async getSchoolSettings(campusId?: string): Promise<any> {
    let query = supabase.from('school_settings').select('*');
    if (campusId && campusId !== 'All') {
      query = query.eq('campus_id', campusId);
    }
    const { data, error } = await query;
    if (error || !data || data.length === 0) {
      return {
        schoolName: 'JIPAS Students Hub',
        currency: 'GHS',
        academicYear: '2025-2026'
      };
    }
    return data[0];
  },

  async updateSchoolSettings(settings: any, campusId?: string): Promise<void> {
    const { error } = await supabase.from('school_settings').upsert({
      campus_id: campusId || null,
      school_name: settings.schoolName,
      currency: settings.currency,
      updated_at: new Date().toISOString()
    });
    if (error) throw error;
  },

  async getSystemSetting(key: string, campusId?: string): Promise<any> {
    let query = supabase.from('system_settings').select('setting_value').eq('setting_key', key);
    if (campusId && campusId !== 'All') {
      query = query.eq('campus_id', campusId);
    }
    const { data, error } = await query;
    if (error || !data || data.length === 0) return null;
    return data[0].setting_value;
  },

  async setSystemSetting(key: string, value: any, campusId?: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('system_settings').upsert({
      campus_id: campusId || null,
      setting_key: key,
      setting_value: value,
      updated_by: user?.id || null,
      updated_at: new Date().toISOString()
    }, { onConflict: 'campus_id, setting_key' });
    if (error) throw error;
  }
};

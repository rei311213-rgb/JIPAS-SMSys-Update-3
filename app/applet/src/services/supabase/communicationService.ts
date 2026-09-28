import { supabase } from '@/src/lib/supabase';

export const CommunicationSupabaseService = {
  async listCommunications(campusId?: string): Promise<any[]> {
    let query = supabase.from('notifications').select('*').order('created_at', { ascending: false });
    if (campusId && campusId !== 'All') {
      query = query.eq('campus_id', campusId);
    }
    const { data, error } = await query;
    if (error) {
      console.warn('[Supabase CommunicationService] listCommunications notice:', error.message);
      return [];
    }
    return (data || []).map((row: any) => ({
      id: row.id,
      title: row.title,
      message: row.message,
      type: row.type || 'announcement',
      targetRole: row.target_role || 'all',
      createdAt: row.created_at
    }));
  },

  async sendCommunication(item: { title: string; message: string; targetRole?: string; campusId?: string }): Promise<void> {
    const { error } = await supabase.from('notifications').insert({
      title: item.title,
      message: item.message,
      target_role: item.targetRole || 'all',
      campus_id: item.campusId || null,
      type: 'announcement'
    });
    if (error) throw error;
  }
};

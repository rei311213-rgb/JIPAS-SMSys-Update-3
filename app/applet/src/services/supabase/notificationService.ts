import { supabase } from '@/src/lib/supabase';
import { NotificationItem } from '@/src/types';

export const NotificationSupabaseService = {
  async listNotifications(campusId?: string): Promise<NotificationItem[]> {
    let query = supabase.from('notifications').select('*').order('created_at', { ascending: false });
    if (campusId && campusId !== 'All') {
      query = query.eq('campus_id', campusId);
    }
    const { data, error } = await query;
    if (error) {
      console.warn('[Supabase NotificationService] listNotifications notice:', error.message);
      return [];
    }
    return (data || []).map((row: any) => ({
      id: row.id,
      title: row.title,
      message: row.message,
      type: row.type || 'announcement',
      targetRole: row.target_role || 'all',
      date: row.created_at ? row.created_at.split('T')[0] : '2025-09-01'
    })) as unknown as NotificationItem[];
  },

  async createNotification(item: NotificationItem): Promise<void> {
    const { error } = await supabase.from('notifications').insert({
      id: item.id,
      title: item.title,
      message: item.message,
      type: item.type || 'announcement',
      target_role: item.targetRole || 'all',
      is_public: false
    });
    if (error) throw error;
  }
};

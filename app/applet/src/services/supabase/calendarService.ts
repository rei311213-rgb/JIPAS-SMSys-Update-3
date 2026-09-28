import { supabase } from '@/src/lib/supabase';
import { CalendarEvent } from '@/src/types';

export const CalendarSupabaseService = {
  async listEvents(campusId?: string): Promise<CalendarEvent[]> {
    let query = supabase.from('calendar_events').select('*').order('event_date', { ascending: true });
    if (campusId && campusId !== 'All') {
      query = query.eq('campus_id', campusId);
    }
    const { data, error } = await query;
    if (error) {
      console.warn('[Supabase CalendarService] listEvents notice:', error.message);
      return [];
    }
    return (data || []).map((row: any) => ({
      id: row.id,
      title: row.title,
      description: row.description || '',
      date: row.event_date || '2025-09-01',
      category: row.category || 'General',
      location: ''
    })) as unknown as CalendarEvent[];
  },

  async saveEvent(event: CalendarEvent): Promise<void> {
    const { error } = await supabase.from('calendar_events').upsert({
      id: event.id,
      title: event.title,
      description: event.description,
      event_date: event.date,
      category: event.category
    }, { onConflict: 'id' });
    if (error) throw error;
  },

  async deleteEvent(id: string): Promise<void> {
    const { error } = await supabase.from('calendar_events').delete().eq('id', id);
    if (error) throw error;
  }
};

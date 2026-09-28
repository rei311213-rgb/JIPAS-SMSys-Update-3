import { supabase } from '../../lib/supabase';

export interface CalendarDayCheckResult {
  isWorkingDay: boolean;
  reason?: string; // 'Weekend', 'Holiday', 'Break', etc.
  eventName?: string;
}

export const SchoolCalendarService = {
  /**
   * Evaluates whether a specific date is an active working/school day.
   * Checks for weekends (Saturday, Sunday) and configured school holidays/breaks in supabase.
   */
  async checkDate(dateStr: string, campusId?: string): Promise<CalendarDayCheckResult> {
    const date = new Date(dateStr);
    const dayOfWeek = date.getUTCDay();

    // 1. Check Weekends
    if (dayOfWeek === 0) {
      return { isWorkingDay: false, reason: 'Sunday' };
    }
    if (dayOfWeek === 6) {
      return { isWorkingDay: false, reason: 'Saturday' };
    }

    // 2. Query Supabase calendar_events for holidays or breaks
    try {
      let query = supabase
        .from('calendar_events')
        .select('*')
        .eq('event_date', dateStr);

      if (campusId) {
        query = query.or(`campus_id.eq.${campusId},campus_id.is.null`);
      }

      const { data, error } = await query;
      if (error) {
        console.warn('[SchoolCalendarService] Error fetching calendar events:', error.message);
      } else if (data && data.length > 0) {
        // Find if any event represents a non-working holiday or break
        const nonWorkingEvent = data.find(event => {
          const cat = (event.category || '').toLowerCase();
          return cat.includes('holiday') || cat.includes('break') || cat.includes('non-working') || cat.includes('closed');
        });

        if (nonWorkingEvent) {
          return {
            isWorkingDay: false,
            reason: 'Holiday',
            eventName: nonWorkingEvent.title
          };
        }
      }
    } catch (err) {
      console.warn('[SchoolCalendarService] Exception checking calendar events:', err);
    }

    return { isWorkingDay: true };
  }
};

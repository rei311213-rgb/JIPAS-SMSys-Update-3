import { supabase } from '@/src/lib/supabase';
import { BoardingRoomItem } from '@/src/types';

export const BoardingSupabaseService = {
  async listRooms(campusId?: string): Promise<BoardingRoomItem[]> {
    let query = supabase.from('boarding_rooms').select('*');
    if (campusId && campusId !== 'All') {
      query = query.eq('campus_id', campusId);
    }
    const { data, error } = await query;
    if (error) {
      console.warn('[Supabase BoardingService] listRooms notice:', error.message);
      return [];
    }
    return (data || []).map((row: any) => ({
      id: row.id,
      hallName: row.hall_name,
      roomNumber: row.room_number,
      gender: (row.wing === 'Boys' ? 'Boys' : row.wing === 'Girls' ? 'Girls' : 'Mixed') as BoardingRoomItem['gender'],
      houseMaster: row.house_master_name || 'House Master',
      capacity: row.capacity || 4,
      occupied: 0,
      status: 'Available',
      campus: row.campus_id
    }));
  },

  async saveRoom(room: BoardingRoomItem, campusId?: string): Promise<void> {
    const { error } = await supabase.from('boarding_rooms').upsert({
      id: room.id,
      campus_id: campusId || room.campus || null,
      hall_name: room.hallName,
      room_number: room.roomNumber,
      wing: room.gender === 'Boys' ? 'Boys' : room.gender === 'Girls' ? 'Girls' : 'General',
      capacity: room.capacity,
      house_master_name: room.houseMaster
    }, { onConflict: 'id' });
    if (error) throw error;
  },

  async deleteRoom(id: string): Promise<void> {
    const { error } = await supabase.from('boarding_rooms').delete().eq('id', id);
    if (error) throw error;
  },

  async listAssignments(): Promise<any[]> {
    const { data, error } = await supabase.from('boarding_assignments').select('*, students(full_name, admission_number), boarding_rooms(hall_name, room_number)');
    if (error) {
      console.warn('[Supabase BoardingService] listAssignments notice:', error.message);
      return [];
    }
    return (data || []).map((row: any) => ({
      id: row.id,
      studentId: row.student_id,
      studentName: row.students?.full_name || 'Student',
      admissionNo: row.students?.admission_number || '',
      roomId: row.room_id,
      roomName: `${row.boarding_rooms?.hall_name || ''} - Room ${row.boarding_rooms?.room_number || ''}`,
      bedNumber: row.bed_number || '1',
      isActive: row.is_active ?? true
    }));
  }
};

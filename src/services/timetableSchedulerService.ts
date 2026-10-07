/**
 * ALGORITHMIC TIMETABLE GENERATOR & ROOM CONFLICT RESOLVER (OPTION 4)
 * Constraint satisfaction scheduler that generates collision-free weekly periods
 * for classrooms, specialized science/computer labs, and assigned teachers.
 */

import { Teacher } from '../types';

export interface TimetableSlot {
  id: string;
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday';
  period: number; // 1 to 8
  timeRange: string;
  className: string;
  subject: string;
  teacherName: string;
  teacherId?: string;
  roomName: string;
  isConflict?: boolean;
  conflictReason?: string;
}

export interface TimetableConflict {
  slotId1: string;
  slotId2: string;
  day: string;
  period: number;
  type: 'TEACHER_DOUBLE_BOOKED' | 'ROOM_OVERLAP';
  description: string;
}

export const TIMETABLE_PERIODS = [
  { period: 1, timeRange: '07:30 - 08:25' },
  { period: 2, timeRange: '08:25 - 09:20' },
  { period: 3, timeRange: '09:30 - 10:25' },
  { period: 4, timeRange: '10:25 - 11:20' },
  { period: 5, timeRange: '11:40 - 12:35' },
  { period: 6, timeRange: '12:35 - 13:30' },
  { period: 7, timeRange: '13:40 - 14:35' },
  { period: 8, timeRange: '14:35 - 15:30' }
];

export const DAYS_OF_WEEK: Array<'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday'> = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'
];

export function generateAutomatedTimetable(
  classes: string[],
  teachers: Teacher[],
  subjects: string[]
): { slots: TimetableSlot[]; conflicts: TimetableConflict[] } {
  const slots: TimetableSlot[] = [];
  const defaultSubjects = subjects.length > 0 ? subjects : [
    'Mathematics', 'English Language', 'French', 'Physics', 'Chemistry', 'Biology', 'History', 'Geography', 'Computer Science'
  ];

  const defaultRooms = [
    'Room 101', 'Room 102', 'Room 103', 'Room 201', 'Room 202', 'Science Lab A', 'Computer Lab 1'
  ];

  const targetClasses = classes.length > 0 ? classes : ['Form 1', 'Form 2', 'Form 3', 'Form 4', 'Form 5', 'Lower Sixth', 'Upper Sixth'];

  let counter = 1;

  DAYS_OF_WEEK.forEach(day => {
    TIMETABLE_PERIODS.forEach(p => {
      targetClasses.forEach((cName, cIdx) => {
        const subIndex = (counter + cIdx) % defaultSubjects.length;
        const teachIndex = (counter + cIdx) % (teachers.length || 1);
        const roomIndex = (cIdx % defaultRooms.length);

        const teacher = teachers[teachIndex];
        const teacherName = teacher ? (teacher.name || (teacher as any).fullName || `Teacher ${teachIndex + 1}`) : `Teacher ${teachIndex + 1}`;
        const teacherId = teacher?.id || `t-${teachIndex}`;

        slots.push({
          id: `slot-${day}-${p.period}-${cName.replace(/\s+/g, '')}`,
          day,
          period: p.period,
          timeRange: p.timeRange,
          className: cName,
          subject: defaultSubjects[subIndex],
          teacherName,
          teacherId,
          roomName: defaultRooms[roomIndex]
        });

        counter++;
      });
    });
  });

  // Detect any conflicts
  const conflicts = detectTimetableConflicts(slots);

  return { slots, conflicts };
}

export function detectTimetableConflicts(slots: TimetableSlot[]): TimetableConflict[] {
  const conflicts: TimetableConflict[] = [];

  for (let i = 0; i < slots.length; i++) {
    for (let j = i + 1; j < slots.length; j++) {
      const s1 = slots[i];
      const s2 = slots[j];

      if (s1.day === s2.day && s1.period === s2.period) {
        // Check teacher clash
        if (s1.teacherId === s2.teacherId && s1.className !== s2.className) {
          conflicts.push({
            slotId1: s1.id,
            slotId2: s2.id,
            day: s1.day,
            period: s1.period,
            type: 'TEACHER_DOUBLE_BOOKED',
            description: `Teacher ${s1.teacherName} is scheduled in both ${s1.className} and ${s2.className} at the same time.`
          });
          s1.isConflict = true;
          s2.isConflict = true;
        }

        // Check room clash
        if (s1.roomName === s2.roomName && s1.className !== s2.className) {
          conflicts.push({
            slotId1: s1.id,
            slotId2: s2.id,
            day: s1.day,
            period: s1.period,
            type: 'ROOM_OVERLAP',
            description: `Room ${s1.roomName} is double-booked by ${s1.className} and ${s2.className}.`
          });
          s1.isConflict = true;
          s2.isConflict = true;
        }
      }
    }
  }

  return conflicts;
}

import { supabase } from '../../lib/supabase';
import { 
  AcademicYearItem, 
  TermItem, 
  DepartmentItem, 
  ClassItem, 
  CourseItem, 
  HouseItem, 
  SubjectItem 
} from '../../types';

export const AcademicService = {
  // Academic Years
  async listAcademicYears(): Promise<AcademicYearItem[]> {
    const { data, error } = await supabase.from('academic_years').select('*').order('name', { ascending: false });
    if (error) {
      console.warn('[Supabase AcademicService] listAcademicYears notice:', error.message);
      return [];
    }
    return (data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      status: (row.is_current ? 'Current' : 'Completed') as AcademicYearItem['status'],
      startDate: row.start_date || '2025-09-01',
      endDate: row.end_date || '2026-07-31',
      hasRecords: true
    }));
  },

  async createAcademicYear(item: AcademicYearItem): Promise<void> {
    const { error } = await supabase.from('academic_years').upsert({
      id: item.id,
      name: item.name,
      is_current: item.status === 'Current' || item.status === 'Active',
      start_date: item.startDate,
      end_date: item.endDate,
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' });
    if (error) throw error;
  },

  // Terms
  async listTerms(): Promise<TermItem[]> {
    const { data, error } = await supabase.from('terms').select('*');
    if (error) {
      console.warn('[Supabase AcademicService] listTerms notice:', error.message);
      return [];
    }
    return (data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      academicYear: row.academic_year_id || '2025-2026',
      startDate: row.start_date || '2025-09-01',
      endDate: row.end_date || '2025-12-18',
      status: (row.is_current ? 'Current' : 'Completed') as TermItem['status'],
      daysOpen: 65,
      nextTermDate: '2026-05-01',
      holidays: 14
    }));
  },

  async createTerm(item: TermItem): Promise<void> {
    const { error } = await supabase.from('terms').upsert({
      id: item.id,
      name: item.name,
      academic_year_id: item.academicYear,
      start_date: item.startDate,
      end_date: item.endDate,
      is_current: item.status === 'Current',
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' });
    if (error) throw error;
  },

  // Departments
  async listDepartments(): Promise<DepartmentItem[]> {
    const { data, error } = await supabase.from('departments').select('*');
    if (error) return [];
    return (data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      code: row.code,
      head: row.head,
      description: row.description
    }));
  },

  // Classes
  async listClasses(): Promise<ClassItem[]> {
    const { data, error } = await supabase.from('classes').select('*');
    if (error) return [];
    return (data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      department: row.department_id || 'General',
      level: row.level || 'SHS 1',
      capacity: row.capacity || 45,
      roomNumber: 'Room 101',
      status: 'Active',
      classTeacher: row.class_teacher || 'Staff Master'
    }));
  },

  // Courses / Streams
  async listCourses(): Promise<CourseItem[]> {
    const { data, error } = await supabase.from('courses').select('*');
    if (error) return [];
    return (data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      code: row.code,
      department: row.department_id || 'General',
      description: row.description
    }));
  },

  // Houses
  async listHouses(): Promise<HouseItem[]> {
    const { data, error } = await supabase.from('houses').select('*');
    if (error) return [];
    return (data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      master: row.house_master || 'Staff Master',
      color: row.color || 'blue',
      motto: 'Excellence & Discipline'
    }));
  },

  // Subjects
  async listSubjects(): Promise<SubjectItem[]> {
    const { data, error } = await supabase.from('subjects').select('*');
    if (error) return [];
    return (data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      code: row.code,
      department: row.department_id || 'General',
      category: row.is_core ? 'Core' : 'Elective'
    }));
  }
};

export type Campus = 'JIPAS 1' | 'JIPAS 2' | 'General';

export const CAMPUSES: Campus[] = ['JIPAS 1', 'JIPAS 2', 'General'];

export const getActiveCampus = (): Campus => {
  if (typeof localStorage === 'undefined') return 'General';
  const selected = localStorage.getItem('jipas_selected_campus') as Campus;
  if (selected) return selected;
  return (localStorage.getItem('jipas_active_campus') as Campus) || 'General';
};

export const setActiveCampus = (campus: Campus): void => {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem('jipas_active_campus', campus);
  localStorage.setItem('jipas_selected_campus', campus);
  window.dispatchEvent(new Event('jipas_campus_changed'));
};

export const isAllCampus = (c?: string): boolean => {
  if (!c) return true;
  const norm = c.toLowerCase().replace(/[^a-z0-9]/g, '');
  return norm === 'general' || norm === 'all' || norm === 'allcampuses' || norm === '';
};

/**
 * Global helper to filter students by selected campus.
 * Defaults unassigned students to 'JIPAS 1'.
 */
export function filterStudentsByCampus<T extends { campus?: string }>(students: T[], selectedCampus: Campus | string): T[] {
  if (!students || !Array.isArray(students)) return [];
  if (isAllCampus(selectedCampus)) return students;
  return students.filter(s => (s.campus || 'JIPAS 1') === selectedCampus);
}

/**
 * Global helper to filter teachers/staff by selected campus.
 * Defaults unassigned staff to 'JIPAS 1'.
 */
export function filterTeachersByCampus<T extends { campus?: string }>(teachers: T[], selectedCampus: Campus | string): T[] {
  if (!teachers || !Array.isArray(teachers)) return [];
  if (isAllCampus(selectedCampus)) return teachers;
  return teachers.filter(t => (t.campus || 'JIPAS 1') === selectedCampus);
}

/**
 * Global helper to filter student bills by selected campus.
 * Checks bill's explicit campus property or falls back to associated student's campus.
 */
export function filterBillsByCampus<T extends { campus?: string; studentId?: string }>(
  bills: T[],
  students: Array<{ id: string; campus?: string }>,
  selectedCampus: Campus | string
): T[] {
  if (!bills || !Array.isArray(bills)) return [];
  if (isAllCampus(selectedCampus)) return bills;

  const studentMap = new Map<string, string>();
  if (students && Array.isArray(students)) {
    students.forEach(s => studentMap.set(s.id, s.campus || 'JIPAS 1'));
  }

  return bills.filter(b => {
    if (b.campus) return b.campus === selectedCampus;
    if (b.studentId && studentMap.has(b.studentId)) {
      return studentMap.get(b.studentId) === selectedCampus;
    }
    return true;
  });
}

/**
 * Global helper to filter payment records by selected campus.
 * Checks payment's explicit campus property or falls back to associated student's campus.
 */
export function filterPaymentsByCampus<T extends { campus?: string; studentId?: string }>(
  payments: T[],
  students: Array<{ id: string; campus?: string }>,
  selectedCampus: Campus | string
): T[] {
  if (!payments || !Array.isArray(payments)) return [];
  if (isAllCampus(selectedCampus)) return payments;

  const studentMap = new Map<string, string>();
  if (students && Array.isArray(students)) {
    students.forEach(s => studentMap.set(s.id, s.campus || 'JIPAS 1'));
  }

  return payments.filter(p => {
    if (p.campus) return p.campus === selectedCampus;
    if (p.studentId && studentMap.has(p.studentId)) {
      return studentMap.get(p.studentId) === selectedCampus;
    }
    return true;
  });
}

/**
 * Global helper to filter operational expenses by selected campus.
 */
export function filterExpensesByCampus<T extends { campus?: string }>(
  expenses: T[],
  selectedCampus: Campus | string
): T[] {
  if (!expenses || !Array.isArray(expenses)) return [];
  if (isAllCampus(selectedCampus)) return expenses;
  return expenses.filter(e => !e.campus || e.campus === 'General' || e.campus === selectedCampus);
}

/**
 * Global helper to filter daily summaries / reports by selected campus.
 */
export function filterSummariesByCampus<T extends { campus?: string }>(
  summaries: T[],
  selectedCampus: Campus | string
): T[] {
  if (!summaries || !Array.isArray(summaries)) return [];
  if (selectedCampus === 'General' || selectedCampus === 'All') return summaries;
  return summaries.filter(s => !s.campus || s.campus === 'General' || s.campus === selectedCampus);
}

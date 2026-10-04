/**
 * JIPAS Educational Complex - Next Term Fees Billing Service
 * 
 * Provides:
 * 1. Next Term Bill setup by either Class or Department
 * 2. Individual student next term fees bill generation with arrears carryover
 * 3. Batch next term bill generation and calculation
 * 4. High-fidelity verification and printing helpers
 */

import { Student, StudentBill, NextTermBillSetup, NextTermFeeItem } from '../types';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { 
  getStoredStudents, 
  getStoredBills, 
  saveStoredBills, 
  getStoredSettings, 
  getStoredClasses,
  getStoredDepartments
} from './storageService';
import { saveAllBills } from './dbService';
import { normalizeClassName } from './billingService';

// Default bank & Mobile Money payment info for official notices
export const DEFAULT_NEXT_TERM_BANK_DETAILS = {
  bankName: 'Ecobank Togo / GCB Bank',
  accountNo: '001004523901 / 1041130004921',
  accountName: 'JOY INTERNATIONAL SCHOOL (JIPAS)',
  branch: 'Hedzranawoe / Lomé Main',
  momoCode: '489210 (JIPAS ACCOUNTS)'
};

// Initial default Next Term setups by Department
export const INITIAL_NEXT_TERM_SETUPS: NextTermBillSetup[] = [
  {
    id: 'setup-dept-preschool',
    targetType: 'department',
    targetName: 'Pre-School / Kindergarten',
    academicYear: '2026-2027',
    term: 'Second Term',
    resumptionDate: '12th January 2027',
    dueDate: '30th January 2027',
    notes: 'Please quote student admission number on all bank pay-in slips and Mobile Money transfers.',
    bankDetails: DEFAULT_NEXT_TERM_BANK_DETAILS,
    updatedAt: new Date().toISOString(),
    totalAmount: 680,
    items: [
      { id: 'item-ps-1', name: 'Tuition & Academic Instruction', amount: 420, category: 'tuition', defaultSelected: true },
      { id: 'item-ps-2', name: 'PTA Development Dues', amount: 50, category: 'pta', defaultSelected: true },
      { id: 'item-ps-3', name: 'Early Childhood ICT & Multimedia Lab', amount: 30, category: 'ict', defaultSelected: true },
      { id: 'item-ps-4', name: 'Printing, Worksheets & Continuous Assessment', amount: 30, category: 'exam', defaultSelected: true },
      { id: 'item-ps-5', name: 'Infirmary Health Levy & First Aid', amount: 25, category: 'health', defaultSelected: true },
      { id: 'item-ps-6', name: 'Sports, Playground & Games Levy', amount: 25, category: 'maintenance', defaultSelected: true },
      { id: 'item-ps-7', name: 'Optional Bus Transit / Shuttle', amount: 100, category: 'transit', isOptional: true, defaultSelected: false }
    ]
  },
  {
    id: 'setup-dept-primary',
    targetType: 'department',
    targetName: 'Primary School',
    academicYear: '2026-2027',
    term: 'Second Term',
    resumptionDate: '12th January 2027',
    dueDate: '30th January 2027',
    notes: 'Please quote student admission number on all bank pay-in slips and Mobile Money transfers.',
    bankDetails: DEFAULT_NEXT_TERM_BANK_DETAILS,
    updatedAt: new Date().toISOString(),
    totalAmount: 795,
    items: [
      { id: 'item-pr-1', name: 'Tuition & Academic Instruction', amount: 490, category: 'tuition', defaultSelected: true },
      { id: 'item-pr-2', name: 'PTA Development Dues', amount: 60, category: 'pta', defaultSelected: true },
      { id: 'item-pr-3', name: 'Computer Science & ICT Lab Levy', amount: 45, category: 'ict', defaultSelected: true },
      { id: 'item-pr-4', name: 'Terminal Examination & Stationery Levy', amount: 40, category: 'exam', defaultSelected: true },
      { id: 'item-pr-5', name: 'Infirmary Health & Clinic Levy', amount: 30, category: 'health', defaultSelected: true },
      { id: 'item-pr-6', name: 'Campus Facilities & Sports Levy', amount: 30, category: 'maintenance', defaultSelected: true },
      { id: 'item-pr-7', name: 'French & Bilingual Immersion Lab', amount: 100, category: 'custom', defaultSelected: true },
      { id: 'item-pr-8', name: 'Optional Bus Transit Service', amount: 120, category: 'transit', isOptional: true, defaultSelected: false }
    ]
  },
  {
    id: 'setup-dept-jhs',
    targetType: 'department',
    targetName: 'Junior High School',
    academicYear: '2026-2027',
    term: 'Second Term',
    resumptionDate: '12th January 2027',
    dueDate: '30th January 2027',
    notes: 'Please quote student admission number on all bank pay-in slips and Mobile Money transfers.',
    bankDetails: DEFAULT_NEXT_TERM_BANK_DETAILS,
    updatedAt: new Date().toISOString(),
    totalAmount: 940,
    items: [
      { id: 'item-jhs-1', name: 'Tuition & Academic Core Instruction', amount: 580, category: 'tuition', defaultSelected: true },
      { id: 'item-jhs-2', name: 'PTA Development Dues', amount: 70, category: 'pta', defaultSelected: true },
      { id: 'item-jhs-3', name: 'Science Laboratory & Practical Materials', amount: 60, category: 'custom', defaultSelected: true },
      { id: 'item-jhs-4', name: 'ICT Lab, Coding & Internet Levy', amount: 50, category: 'ict', defaultSelected: true },
      { id: 'item-jhs-5', name: 'Mock & Terminal Assessment Printing', amount: 50, category: 'exam', defaultSelected: true },
      { id: 'item-jhs-6', name: 'Infirmary Health & Clinic Levy', amount: 35, category: 'health', defaultSelected: true },
      { id: 'item-jhs-7', name: 'Sports, Culture & Extra-Curricular Levy', amount: 35, category: 'maintenance', defaultSelected: true },
      { id: 'item-jhs-8', name: 'Library & E-Learning Resource Fee', amount: 60, category: 'custom', defaultSelected: true },
      { id: 'item-jhs-9', name: 'Optional Bus Transit Route', amount: 150, category: 'transit', isOptional: true, defaultSelected: false }
    ]
  },
  {
    id: 'setup-class-jhs3',
    targetType: 'class',
    targetName: 'JHS 3',
    academicYear: '2026-2027',
    term: 'Second Term',
    resumptionDate: '12th January 2027',
    dueDate: '25th January 2027',
    notes: 'JHS 3 includes mandatory BECE candidate registration preparation and weekend extra classes.',
    bankDetails: DEFAULT_NEXT_TERM_BANK_DETAILS,
    updatedAt: new Date().toISOString(),
    totalAmount: 1150,
    items: [
      { id: 'item-jhs3-1', name: 'Tuition & Intensive Core Instruction', amount: 620, category: 'tuition', defaultSelected: true },
      { id: 'item-jhs3-2', name: 'PTA Development Dues', amount: 70, category: 'pta', defaultSelected: true },
      { id: 'item-jhs3-3', name: 'BECE Mock Exams & Standardized Papers', amount: 120, category: 'exam', defaultSelected: true },
      { id: 'item-jhs3-4', name: 'Science Lab & Practical Consumables', amount: 70, category: 'custom', defaultSelected: true },
      { id: 'item-jhs3-5', name: 'ICT Lab & Practical Exam Licensing', amount: 50, category: 'ict', defaultSelected: true },
      { id: 'item-jhs3-6', name: 'Saturday Extra Classes & Evening Prep', amount: 140, category: 'custom', defaultSelected: true },
      { id: 'item-jhs3-7', name: 'Infirmary Health & Clinic Levy', amount: 40, category: 'health', defaultSelected: true },
      { id: 'item-jhs3-8', name: 'Campus Facilities & Maintenance', amount: 40, category: 'maintenance', defaultSelected: true }
    ]
  },
  {
    id: 'setup-dept-shs',
    targetType: 'department',
    targetName: 'Senior High School',
    academicYear: '2026-2027',
    term: 'Second Term',
    resumptionDate: '12th January 2027',
    dueDate: '30th January 2027',
    notes: 'Senior High School term bills include specialized subject elective labs and practicals.',
    bankDetails: DEFAULT_NEXT_TERM_BANK_DETAILS,
    updatedAt: new Date().toISOString(),
    totalAmount: 1280,
    items: [
      { id: 'item-shs-1', name: 'Senior High Tuition & Instruction', amount: 750, category: 'tuition', defaultSelected: true },
      { id: 'item-shs-2', name: 'PTA Development Dues', amount: 80, category: 'pta', defaultSelected: true },
      { id: 'item-shs-3', name: 'Science & Computer Lab Practical Levy', amount: 100, category: 'custom', defaultSelected: true },
      { id: 'item-shs-4', name: 'ICT, Coding & Internet Connectivity', amount: 70, category: 'ict', defaultSelected: true },
      { id: 'item-shs-5', name: 'Terminal Examination & Assessment Fee', amount: 60, category: 'exam', defaultSelected: true },
      { id: 'item-shs-6', name: 'Health Infirmary & Medical Insurance Levy', amount: 40, category: 'health', defaultSelected: true },
      { id: 'item-shs-7', name: 'Sports, Clubs & Cultural Development', amount: 40, category: 'maintenance', defaultSelected: true },
      { id: 'item-shs-8', name: 'Academic Library & Digital Research', amount: 60, category: 'custom', defaultSelected: true },
      { id: 'item-shs-9', name: 'WASSCE Mock Series & Registration Prep', amount: 80, category: 'custom', defaultSelected: true }
    ]
  }
];

/**
 * Calculates next term name and academic year from current settings
 */
export function getNextTermInfo(currentTerm?: string, currentYear?: string): {
  nextTerm: string;
  nextAcademicYear: string;
} {
  const settings = getStoredSettings();
  const term = currentTerm || settings.activeTerm || 'First Term';
  const year = currentYear || settings.activeAcademicYear || '2026-2027';

  const normTerm = term.toLowerCase().trim();

  if (normTerm.includes('first') || normTerm === 'term 1' || normTerm === '1') {
    return { nextTerm: 'Second Term', nextAcademicYear: year };
  } else if (normTerm.includes('second') || normTerm === 'term 2' || normTerm === '2') {
    return { nextTerm: 'Third Term', nextAcademicYear: year };
  } else {
    // Third term -> advances to Next Academic Year First Term
    const parts = year.split(/[-/]/);
    if (parts.length === 2) {
      const y1 = parseInt(parts[0], 10);
      const y2 = parseInt(parts[1], 10);
      if (!isNaN(y1) && !isNaN(y2)) {
        return { nextTerm: 'First Term', nextAcademicYear: `${y1 + 1}-${y2 + 1}` };
      }
    }
    return { nextTerm: 'First Term', nextAcademicYear: '2027-2028' };
  }
}

/**
 * Retrieves all stored Next Term Bill Setups or seeds defaults
 */
export function getStoredNextTermSetups(): NextTermBillSetup[] {
  if (typeof window === 'undefined') return INITIAL_NEXT_TERM_SETUPS;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.NEXT_TERM_BILL_SETUPS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
    // Seed initial setups
    localStorage.setItem(STORAGE_KEYS.NEXT_TERM_BILL_SETUPS, JSON.stringify(INITIAL_NEXT_TERM_SETUPS));
    return INITIAL_NEXT_TERM_SETUPS;
  } catch (err) {
    console.warn('[NextTermBillingService] Error reading next term setups:', err);
    return INITIAL_NEXT_TERM_SETUPS;
  }
}

/**
 * Saves all next term setups to localStorage and dispatches sync event
 */
export function saveStoredNextTermSetups(setups: NextTermBillSetup[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.NEXT_TERM_BILL_SETUPS, JSON.stringify(setups));
    window.dispatchEvent(new CustomEvent('jipas_next_term_setups_updated'));
    window.dispatchEvent(new CustomEvent('jipas_cloud_synced'));
  } catch (err) {
    console.error('[NextTermBillingService] Error saving setups:', err);
  }
}

/**
 * Saves or updates an individual setup
 */
export function saveNextTermBillSetup(setup: NextTermBillSetup): NextTermBillSetup[] {
  const current = getStoredNextTermSetups();
  const existingIdx = current.findIndex(s => s.id === setup.id);
  let updated: NextTermBillSetup[];
  if (existingIdx >= 0) {
    updated = [...current];
    updated[existingIdx] = {
      ...setup,
      updatedAt: new Date().toISOString()
    };
  } else {
    updated = [
      ...current,
      {
        ...setup,
        id: setup.id || `setup-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        updatedAt: new Date().toISOString()
      }
    ];
  }
  saveStoredNextTermSetups(updated);
  return updated;
}

/**
 * Deletes a setup by ID
 */
export function deleteNextTermBillSetup(id: string): NextTermBillSetup[] {
  const current = getStoredNextTermSetups();
  const updated = current.filter(s => s.id !== id);
  saveStoredNextTermSetups(updated);
  return updated;
}

/**
 * Resolves the department of a given class name
 */
export function inferDepartmentForClass(className?: string): string {
  if (!className) return 'Primary School';
  const norm = className.toLowerCase();
  if (norm.includes('creche') || norm.includes('nursery') || norm.includes('kg') || norm.includes('kindergarten') || norm.includes('pre-school')) {
    return 'Pre-School / Kindergarten';
  }
  if (norm.includes('jhs') || norm.includes('junior')) {
    return 'Junior High School';
  }
  if (norm.includes('shs') || norm.includes('senior')) {
    return 'Senior High School';
  }
  return 'Primary School';
}

/**
 * Finds the best matching Next Term Bill Setup for a class or department
 * 1. Exact Class match
 * 2. Exact Department match
 * 3. Inferred Department match
 * 4. Fallback default
 */
export function findNextTermSetup(
  className?: string,
  department?: string,
  term?: string,
  academicYear?: string
): { setup: NextTermBillSetup; matchLevel: 'class' | 'department' | 'inferred' | 'fallback' } {
  const setups = getStoredNextTermSetups();
  const normClass = normalizeClassName(className);
  const targetDept = department || inferDepartmentForClass(className);
  const normDept = normalizeClassName(targetDept);

  // 1. Exact Class match
  if (normClass) {
    const classMatch = setups.find(s => 
      s.targetType === 'class' && 
      normalizeClassName(s.targetName) === normClass
    );
    if (classMatch) return { setup: classMatch, matchLevel: 'class' };
  }

  // 2. Exact Department match
  if (normDept) {
    const deptMatch = setups.find(s => 
      s.targetType === 'department' && 
      (normalizeClassName(s.targetName) === normDept || 
       normalizeClassName(s.targetName).includes(normDept) ||
       normDept.includes(normalizeClassName(s.targetName)))
    );
    if (deptMatch) return { setup: deptMatch, matchLevel: 'department' };
  }

  // 3. Inferred department based on class name
  const inferredDept = inferDepartmentForClass(className);
  const inferredMatch = setups.find(s => 
    s.targetType === 'department' && 
    normalizeClassName(s.targetName).includes(normalizeClassName(inferredDept))
  );
  if (inferredMatch) return { setup: inferredMatch, matchLevel: 'inferred' };

  // 4. Fallback to first available setup or default
  return { 
    setup: setups[0] || INITIAL_NEXT_TERM_SETUPS[1], 
    matchLevel: 'fallback' 
  };
}

/**
 * Computes the current term balance / arrears for a given student
 */
export function getStudentCurrentArrears(studentId: string, admissionNo?: string): {
  arrears: number;
  credit: number;
  currentBill?: StudentBill;
} {
  const bills = getStoredBills();
  const normAdm = (admissionNo || '').toLowerCase().trim();

  // Find latest active bill for this student
  const studentBills = bills.filter(b => 
    b.studentId === studentId || 
    (normAdm && (b.admissionNo || '').toLowerCase().trim() === normAdm)
  );

  if (studentBills.length === 0) {
    return { arrears: 0, credit: 0 };
  }

  // Sort by date / period or take the latest
  const latestBill = studentBills[studentBills.length - 1];
  const balance = Number(latestBill.balance ?? 0);

  if (balance > 0) {
    return { arrears: balance, credit: 0, currentBill: latestBill };
  } else if (balance < 0) {
    return { arrears: 0, credit: Math.abs(balance), currentBill: latestBill };
  }
  return { arrears: 0, credit: 0, currentBill: latestBill };
}

export interface PrepareNextTermBillParams {
  student: Student;
  setup?: NextTermBillSetup;
  academicYear?: string;
  term?: string;
  includeCurrentArrears?: boolean;
  manualArrears?: number;
  discount?: number;
  discountReason?: string;
  selectedItemIds?: string[];
  customItems?: { name: string; amount: number }[];
  billNo?: string;
}

/**
 * Calculates a complete StudentBill object for the Next Term
 */
export function prepareNextTermBillForStudent(params: PrepareNextTermBillParams): StudentBill {
  const { student, academicYear, term, includeCurrentArrears = true, manualArrears, discount = 0, selectedItemIds, customItems = [] } = params;
  
  const nextInfo = getNextTermInfo();
  const targetYear = academicYear || nextInfo.nextAcademicYear;
  const targetTerm = term || nextInfo.nextTerm;

  const resolved = params.setup 
    ? { setup: params.setup, matchLevel: 'class' as const } 
    : findNextTermSetup(student.className || (student as any).class, student.department, targetTerm, targetYear);
  
  const setup = resolved.setup;

  // Selected fee items
  const activeItems: { name: string; amount: number }[] = [];
  setup.items.forEach(it => {
    // If selectedItemIds is passed, use it; otherwise use defaultSelected
    const isSelected = selectedItemIds ? selectedItemIds.includes(it.id) : (it.defaultSelected ?? !it.isOptional);
    if (isSelected && Number(it.amount) > 0) {
      activeItems.push({ name: it.name, amount: Number(it.amount) });
    }
  });

  // Append any one-off custom items
  customItems.forEach(ci => {
    if (ci && Number(ci.amount) > 0) {
      activeItems.push({ name: ci.name, amount: Number(ci.amount) });
    }
  });

  const subTotal = activeItems.reduce((sum, item) => sum + item.amount, 0);

  // Calculate arrears
  let arrears = 0;
  if (manualArrears !== undefined) {
    arrears = Math.max(0, manualArrears);
  } else if (includeCurrentArrears) {
    const currentFin = getStudentCurrentArrears(student.id, student.admissionNo);
    arrears = currentFin.arrears;
  }

  const safeDiscount = Math.max(0, Number(discount) || 0);
  const payable = Math.max(0, subTotal + arrears - safeDiscount);
  const paid = 0;
  const balance = payable;
  const status: 'Fully Paid' | 'Partially Paid' | 'Unpaid' = 
    payable === 0 ? 'Fully Paid' : 'Unpaid';

  const cleanAdm = (student.admissionNo || student.id).replace(/[\/\s]/g, '-');
  const termShort = targetTerm.toLowerCase().includes('second') ? 'T2' : targetTerm.toLowerCase().includes('third') ? 'T3' : 'T1';
  const billNo = params.billNo || `BILL-NT-${targetYear.split(/[-/]/)[0]}-${termShort}-${cleanAdm}`;

  return {
    id: `bill-nextterm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    billNo,
    studentId: student.id,
    studentName: student.fullName || (student as any).name || 'Unknown Student',
    admissionNo: student.admissionNo || 'N/A',
    className: student.className || (student as any).class || 'General',
    academicYear: targetYear,
    term: targetTerm,
    items: activeItems,
    subTotal,
    arrears,
    discount: safeDiscount,
    payable,
    paid,
    balance,
    status
  };
}

/**
 * Saves a Next Term bill for an individual student
 */
export async function saveNextTermStudentBill(bill: StudentBill): Promise<StudentBill> {
  const existingBills = getStoredBills();
  // Check if a next term bill already exists for this student and period
  const index = existingBills.findIndex(b => 
    b.studentId === bill.studentId && 
    b.academicYear === bill.academicYear && 
    b.term === bill.term
  );

  let updatedList: StudentBill[];
  if (index >= 0) {
    updatedList = [...existingBills];
    updatedList[index] = { ...existingBills[index], ...bill };
  } else {
    updatedList = [...existingBills, bill];
  }

  saveStoredBills(updatedList);
  await saveAllBills(updatedList).catch(err => {
    console.warn('[NextTermBillingService] Cloud save warning:', err);
  });

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('jipas_next_term_bill_generated', { detail: { bill } }));
    window.dispatchEvent(new CustomEvent('jipas_cloud_synced'));
  }

  return bill;
}

/**
 * Generates Next Term bills in batch for all students in a target class, department, or entire school
 */
export async function batchGenerateNextTermBills(params: {
  targetType: 'class' | 'department' | 'all';
  targetName?: string;
  academicYear?: string;
  term?: string;
  includeCurrentArrears?: boolean;
}): Promise<{ count: number; bills: StudentBill[] }> {
  const students = getStoredStudents();
  const nextInfo = getNextTermInfo();
  const targetYear = params.academicYear || nextInfo.nextAcademicYear;
  const targetTerm = params.term || nextInfo.nextTerm;
  const includeArrears = params.includeCurrentArrears ?? true;

  // Filter students based on targetType
  let targetStudents = students.filter(s => (s.status as string) !== 'Inactive' && (s.status as string) !== 'Withdrawn' && s.status !== 'Graduated');

  if (params.targetType === 'class' && params.targetName) {
    const norm = normalizeClassName(params.targetName);
    targetStudents = targetStudents.filter(s => 
      normalizeClassName(s.className || (s as any).class) === norm
    );
  } else if (params.targetType === 'department' && params.targetName) {
    const normDept = normalizeClassName(params.targetName);
    targetStudents = targetStudents.filter(s => {
      const studentDept = normalizeClassName(s.department || inferDepartmentForClass(s.className || (s as any).class));
      return studentDept === normDept || studentDept.includes(normDept) || normDept.includes(studentDept);
    });
  }

  const generatedBills: StudentBill[] = [];

  for (const stu of targetStudents) {
    const bill = prepareNextTermBillForStudent({
      student: stu,
      academicYear: targetYear,
      term: targetTerm,
      includeCurrentArrears: includeArrears
    });
    generatedBills.push(bill);
  }

  // Merge into existing bills
  const existingBills = getStoredBills();
  const existingBillsMap = new Map<string, number>();
  existingBills.forEach((b, idx) => {
    const key = `${b.studentId}_${b.academicYear}_${b.term}`;
    existingBillsMap.set(key, idx);
  });

  const merged = [...existingBills];
  generatedBills.forEach(gb => {
    const key = `${gb.studentId}_${gb.academicYear}_${gb.term}`;
    if (existingBillsMap.has(key)) {
      const idx = existingBillsMap.get(key)!;
      merged[idx] = gb;
    } else {
      merged.push(gb);
    }
  });

  saveStoredBills(merged);
  await saveAllBills(merged).catch(console.warn);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('jipas_next_term_batch_generated', { detail: { count: generatedBills.length } }));
    window.dispatchEvent(new CustomEvent('jipas_cloud_synced'));
  }

  return { count: generatedBills.length, bills: merged };
}

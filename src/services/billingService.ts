import { Student, StudentBill, ClassFeeTariffItem, TariffCorrectionLog } from '../types';
import { getStoredClassFeeTariffs, getStoredFeeOptions, getStoredStudents, getStoredBills, saveStoredBills, getStoredTariffCorrectionLogs } from './storageService';
import { saveAllBills, saveTariffCorrectionLog } from './dbService';

/**
 * Normalizes class names for robust matching (e.g. "JHS 1" -> "jhs 1", "JHS" -> "jhs").
 */
export function normalizeClassName(name?: string): string {
  if (!name) return '';
  return name.toLowerCase().replace(/[\s\-_]+/g, ' ').trim();
}

/**
 * Finds the matching class fee tariff for a given student or class name.
 * Supports exact match, prefix/alias match (e.g. "JHS 1" matching "JHS"), and department-level fallback.
 */
export function findMatchingTariff(
  className?: string,
  department?: string,
  tariffs: ClassFeeTariffItem[] = getStoredClassFeeTariffs()
): ClassFeeTariffItem | null {
  if (!tariffs || tariffs.length === 0) return null;
  const normClass = normalizeClassName(className);
  const normDept = normalizeClassName(department);

  // 1. Exact class title match (e.g. "JHS 1" === "JHS 1")
  const exactMatch = tariffs.find(t => normalizeClassName(t.classTitle) === normClass);
  if (exactMatch) return exactMatch;

  // 2. Prefix / Category match (e.g. student is in "JHS 1", tariff is for "JHS" or "Junior High School")
  const prefixMatch = tariffs.find(t => {
    const tClass = normalizeClassName(t.classTitle);
    if (!tClass) return false;
    // e.g. "jhs 1".startsWith("jhs") or "jhs".startsWith("jhs 1")
    if (normClass.startsWith(tClass) || tClass.startsWith(normClass)) return true;
    // e.g. "jhs 1" & "jhs"
    if (normClass.includes('jhs') && tClass.includes('jhs')) return true;
    if ((normClass.includes('primary') || normClass.includes('class') || normClass.includes('basic')) && 
        (tClass.includes('primary') || tClass.includes('basic'))) return true;
    if ((normClass.includes('nursery') || normClass.includes('kg') || normClass.includes('creche')) && 
        (tClass.includes('pre-school') || tClass.includes('kindergarten') || tClass.includes('nursery') || tClass.includes('kg') || tClass.includes('creche'))) return true;
    if (normClass.includes('shs') && tClass.includes('shs')) return true;
    return false;
  });
  if (prefixMatch) return prefixMatch;

  // 3. Department match (e.g. department is "Junior High School", tariff dept is "Junior High School")
  if (normDept) {
    const deptMatch = tariffs.find(t => {
      const tDept = normalizeClassName(t.dept);
      return tDept && (tDept === normDept || normDept.includes(tDept) || tDept.includes(normDept));
    });
    if (deptMatch) return deptMatch;
  }

  // 4. If className matches tariff dept
  const classToDeptMatch = tariffs.find(t => {
    const tDept = normalizeClassName(t.dept);
    return tDept && (normClass.includes(tDept) || tDept.includes(normClass));
  });
  if (classToDeptMatch) return classToDeptMatch;

  return null;
}

/**
 * Builds itemized fee breakdown from a configured ClassFeeTariffItem.
 */
export function generateBillItemsFromTariff(tariff: ClassFeeTariffItem): {
  items: { name: string; amount: number }[];
  subTotal: number;
} {
  const items: { name: string; amount: number }[] = [];

  if (Number(tariff.baseTuition) > 0) {
    items.push({ name: 'Tuition Fee', amount: Number(tariff.baseTuition) });
  }
  if (Number(tariff.ptaDues) > 0) {
    items.push({ name: 'PTA Development Dues', amount: Number(tariff.ptaDues) });
  }
  if (Number(tariff.ictFee) > 0) {
    items.push({ name: 'ICT & Computer Lab Fee', amount: Number(tariff.ictFee) });
  }
  if (Number(tariff.examFee) > 0) {
    items.push({ name: 'Exam & Printing Fee', amount: Number(tariff.examFee) });
  }
  if (Number(tariff.healthLevy) > 0) {
    items.push({ name: 'Infirmary Health Levy', amount: Number(tariff.healthLevy) });
  }
  if (Number(tariff.busTransit) > 0) {
    items.push({ name: 'Optional Bus Transit', amount: Number(tariff.busTransit) });
  }
  if (Array.isArray(tariff.customBreakdown)) {
    tariff.customBreakdown.forEach(cb => {
      if (cb && Number(cb.amount) > 0) {
        items.push({ name: cb.label || 'Custom Fee', amount: Number(cb.amount) });
      }
    });
  }

  // If baseTuition is defined but items array is empty, include Tuition Fee
  if (items.length === 0 && Number(tariff.baseTuition) > 0) {
    items.push({ name: 'Tuition Fee', amount: Number(tariff.baseTuition) });
  }

  const subTotal = items.reduce((sum, it) => sum + it.amount, 0);
  return { items, subTotal };
}

/**
 * Calculates a complete, mathematically sound StudentBill for a student
 * matching their class tariff settings, preserving previous payment history.
 */
export function computeStudentBill(
  student: { id: string; fullName: string; admissionNo: string; className: string; department?: string; academicYear?: string; term?: string },
  tariffs: ClassFeeTariffItem[] = getStoredClassFeeTariffs(),
  existingBill?: Partial<StudentBill>
): StudentBill {
  const matchingTariff = findMatchingTariff(student.className, student.department, tariffs);
  let items: { name: string; amount: number }[] = [];
  let subTotal = 0;

  if (matchingTariff) {
    const tariffResult = generateBillItemsFromTariff(matchingTariff);
    items = tariffResult.items;
    subTotal = tariffResult.subTotal;
  }

  const feeOptions = getStoredFeeOptions();
  const matchingFeeOptions = feeOptions.filter(opt => {
    if (!opt.isActive) return false;
    const appClass = (opt.applicableClass || '').toLowerCase();
    const sClass = (student.className || '').toLowerCase();
    return appClass === 'all classes' || appClass === 'all' || appClass.includes(sClass) || sClass.includes(appClass);
  });

  if (matchingFeeOptions.length > 0) {
    if (subTotal === 0) {
      items = matchingFeeOptions.map(opt => ({ name: opt.name, amount: Number(opt.amount) || 0 }));
    } else {
      matchingFeeOptions.forEach(opt => {
        if (!items.some(it => it.name.toLowerCase() === opt.name.toLowerCase())) {
          items.push({ name: opt.name, amount: Number(opt.amount) || 0 });
        }
      });
    }
    subTotal = items.reduce((sum, it) => sum + it.amount, 0);
  }

  // If no tariff configured at all or total is 0 and no explicit tariff matched, use fallback standard items
  if (subTotal === 0 && (!matchingTariff || (Number(matchingTariff.baseTuition) === 0 && items.length === 0))) {
    items = [
      { name: 'Tuition Fee', amount: 350 },
      { name: 'Classes Fee', amount: 50 },
      { name: 'Bus-User Fee', amount: 200 },
      { name: 'Printing Fee', amount: 20 },
      { name: 'PTA Dues', amount: 50 },
      { name: 'Sports Levy', amount: 25 },
      { name: 'Clinic Levy', amount: 20 }
    ];
    subTotal = 715;
  }

  const paid = existingBill?.paid ?? existingBill?.paidAmount ?? 0;
  const arrears = existingBill?.arrears ?? 0;
  const discount = existingBill?.discount ?? 0;
  const payable = Math.max(0, subTotal + arrears - discount);
  const balance = Math.max(0, payable - paid);
  const status: 'Fully Paid' | 'Partially Paid' | 'Unpaid' | 'Overpaid' = 
    balance === 0 ? 'Fully Paid' : (paid > 0 ? 'Partially Paid' : 'Unpaid');

  return {
    id: existingBill?.id || `bill-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    billNo: existingBill?.billNo || `BILL-${(student.admissionNo || student.id).replace(/[\/\s]/g, '-')}`,
    studentId: student.id,
    studentName: student.fullName,
    admissionNo: student.admissionNo,
    className: student.className,
    academicYear: student.academicYear || existingBill?.academicYear || '2025-2026',
    term: student.term || existingBill?.term || 'Third Term',
    items,
    subTotal,
    arrears,
    discount,
    payable,
    paid,
    balance,
    status
  };
}

/**
 * Applies the entire fee tariff matrix to all active students in the school,
 * updating bills locally, in IndexedDB, in Firestore, and on Supabase Cloud.
 */
export async function applyTariffMatrixToAllBills(
  tariffs: ClassFeeTariffItem[] = getStoredClassFeeTariffs(),
  classFilter?: string
): Promise<{ updatedCount: number; bills: StudentBill[] }> {
  const students = getStoredStudents();
  const existingBills = getStoredBills();
  const existingBillsMap = new Map<string, StudentBill>();
  existingBills.forEach(b => {
    if (b.studentId) existingBillsMap.set(b.studentId, b);
    if (b.admissionNo) existingBillsMap.set((b.admissionNo || '').toLowerCase().trim(), b);
  });

  const targetStudents = classFilter && classFilter !== 'All'
    ? students.filter(s => s.className.toLowerCase() === classFilter.toLowerCase())
    : students;

  const newBills: StudentBill[] = targetStudents.map(student => {
    const existingBill = existingBillsMap.get(student.id) || existingBillsMap.get((student.admissionNo || '').toLowerCase().trim());
    return computeStudentBill(student, tariffs, existingBill);
  });

  // Preserve non-targeted bills if filtering by class
  const unaffectedBills = classFilter && classFilter !== 'All'
    ? existingBills.filter(b => !targetStudents.some(s => s.id === b.studentId || (s.admissionNo && s.admissionNo === b.admissionNo)))
    : [];

  const finalBills = [...unaffectedBills, ...newBills];
  saveStoredBills(finalBills);
  await saveAllBills(finalBills);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('jipas_cloud_synced'));
  }

  return { updatedCount: newBills.length, bills: finalBills };
}

export interface LogTariffCorrectionParams {
  studentId: string;
  originalTariff: {
    payable?: number;
    subTotal?: number;
    items?: Array<{ name: string; amount: number }>;
    [key: string]: any;
  } | number | string;
  correctedTariff: {
    payable?: number;
    subTotal?: number;
    items?: Array<{ name: string; amount: number }>;
    [key: string]: any;
  } | number | string;
  accountantId: string;
  accountantName?: string;
  studentName?: string;
  admissionNo?: string;
  className?: string;
  campus?: string;
}

/**
 * Lightweight logging mechanism in billingService to record 'tariff correction' events
 * in a dedicated collection, capturing student ID, original tariff, corrected tariff,
 * and the accountant's user ID for audit trails.
 */
export async function logTariffCorrection(params: LogTariffCorrectionParams): Promise<TariffCorrectionLog> {
  const logEntry: TariffCorrectionLog = {
    id: `TCL-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    studentId: params.studentId,
    studentName: params.studentName,
    admissionNo: params.admissionNo,
    className: params.className,
    originalTariff: params.originalTariff,
    correctedTariff: params.correctedTariff,
    accountantId: params.accountantId,
    accountantName: params.accountantName,
    timestamp: new Date().toISOString(),
    campus: params.campus || 'JIPAS 1'
  };

  await saveTariffCorrectionLog(logEntry);
  return logEntry;
}

/**
 * Retrieves all recorded tariff correction audit log entries.
 */
export function getTariffCorrectionLogs(): TariffCorrectionLog[] {
  return getStoredTariffCorrectionLogs();
}

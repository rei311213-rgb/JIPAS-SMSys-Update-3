import { Student, Teacher, StudentBill, PaymentRecord } from '../types';
import { recordSecurityAuditLog } from './storageService';

export interface GlobalSearchResultItem {
  id: string;
  title: string;
  subtitle: string;
  type: 'student' | 'teacher' | 'financial' | 'setting';
  categoryLabel: string;
  badgeText?: string;
  meta?: any;
  actionModuleId?: string;
  actionTab?: string;
}

export interface GlobalSearchResults {
  students: GlobalSearchResultItem[];
  teachers: GlobalSearchResultItem[];
  financial: GlobalSearchResultItem[];
  settings: GlobalSearchResultItem[];
  totalCount: number;
}

/**
 * Centralized Global Search Service across student, teacher, financial, and settings records.
 * Securely restricted to the authorized content matching the active user role/page.
 */
export const searchGlobalRecords = (
  query: string,
  data: {
    students?: Student[];
    teachers?: Teacher[];
    bills?: StudentBill[];
    payments?: PaymentRecord[];
    navGroups?: any[];
    classFeeTariffs?: any[];
    userRole?: 'admin' | 'accountant' | 'teacher' | 'secretary' | 'student';
  }
): GlobalSearchResults => {
  const q = query.trim().toLowerCase();
  
  if (!q) {
    return {
      students: [],
      teachers: [],
      financial: [],
      settings: [],
      totalCount: 0
    };
  }

  // Active hacking/injection monitoring system (WAF Sandbox)
  const isMalicious = (str: string): boolean => {
    const lower = str.toLowerCase();
    const maliciousPatterns = [
      '<script', 'javascript:', 'onerror=', 'onload=', 'eval(', 'alert(',
      'union select', 'or 1=1', "or '1'='1'", 'benchmark(', 'waitfor delay',
      '../', '..\\', '/etc/passwd', 'cmd.exe', '<img', 'select * from', 'drop table'
    ];
    return maliciousPatterns.some(p => lower.includes(p));
  };

  if (isMalicious(query)) {
    try {
      recordSecurityAuditLog({
        performedBy: 'System Firewall',
        performedByRole: 'WAF Guard',
        targetUser: 'Anonymous Search Input',
        targetUserRole: 'Network Endpoint',
        actionType: 'Access Violation Attempt',
        details: `Hacking attempt detected in Global Search. Query: "${(query || '').slice(0, 80)}" containing script or injection vectors was blocked.`
      });
    } catch (e) {
      console.warn('Could not record security audit log for blocked query:', e);
    }

    return {
      students: [],
      teachers: [],
      financial: [
        {
          id: 'sec-alert-block',
          title: '⚠️ Security Alert: Query Intercepted',
          subtitle: 'Our Web Application Firewall (WAF) detected scripting, SQL-injection, or file-traversal signatures in your input. This action has been logged in our Security Audit Ledger.',
          type: 'financial',
          categoryLabel: 'Security Incident',
          badgeText: 'BLOCKED'
        }
      ],
      settings: [],
      totalCount: 1
    };
  }

  const userRole = data.userRole || 'admin';

  // 1. Students Search
  const students = data.students || [];
  const matchedStudents: GlobalSearchResultItem[] = (userRole === 'admin' || userRole === 'accountant' || userRole === 'teacher' || userRole === 'secretary')
    ? students
        .filter(s =>
          s.fullName.toLowerCase().includes(q) ||
          s.admissionNo.toLowerCase().includes(q) ||
          s.className.toLowerCase().includes(q) ||
          s.department.toLowerCase().includes(q) ||
          s.parentName.toLowerCase().includes(q) ||
          s.parentPhone.toLowerCase().includes(q)
        )
        .slice(0, 8)
        .map(s => ({
          id: `student-${s.id}`,
          title: s.fullName,
          subtitle: `Adm: ${s.admissionNo} • Class: ${s.className} (${s.department}) • Parent: ${s.parentName} (${s.parentPhone})`,
          type: 'student',
          categoryLabel: 'Student Record',
          badgeText: s.status || 'Enrolled',
          meta: s,
          actionModuleId: 'student_enrolled',
          actionTab: 'students'
        }))
    : [];

  // 2. Teachers / Staff Search (Strictly restricted from Accountant, Secretary and Student)
  const teachers = data.teachers || [];
  const matchedTeachers: GlobalSearchResultItem[] = (userRole === 'admin' || userRole === 'teacher')
    ? teachers
        .filter(t =>
          t.name.toLowerCase().includes(q) ||
          (t.staffId && t.staffId.toLowerCase().includes(q)) ||
          (t.department && t.department.toLowerCase().includes(q)) ||
          t.phone.toLowerCase().includes(q) ||
          t.email.toLowerCase().includes(q) ||
          (t.subjectsTaught || []).some(sub => sub.toLowerCase().includes(q)) ||
          (t.classesTaught || []).some(c => c.toLowerCase().includes(q))
        )
        .slice(0, 8)
        .map(t => ({
          id: `teacher-${t.id}`,
          title: t.name,
          subtitle: `ID: ${t.staffId || 'Staff'} • Dept: ${t.department || 'General'} • Contact: ${t.phone} | ${t.email}`,
          type: 'teacher',
          categoryLabel: 'Faculty & Teacher',
          badgeText: (t.subjectsTaught || []).slice(0, 2).join(', ') || 'Faculty',
          meta: t,
          actionModuleId: 'teacher_profile',
          actionTab: 'teachers'
        }))
    : [];

  // 3. Financial Records Search (Strictly restricted from Teacher and Student)
  const bills = data.bills || [];
  const payments = data.payments || [];
  const tariffs = data.classFeeTariffs || [];

  const matchedBills: GlobalSearchResultItem[] = (userRole === 'admin' || userRole === 'accountant')
    ? bills
        .filter(b =>
          b.studentName.toLowerCase().includes(q) ||
          b.admissionNo.toLowerCase().includes(q) ||
          b.className.toLowerCase().includes(q) ||
          b.term.toLowerCase().includes(q) ||
          b.academicYear.toLowerCase().includes(q) ||
          b.items.some(it => it.name.toLowerCase().includes(q))
        )
        .slice(0, 5)
        .map(b => ({
          id: `bill-${b.id}`,
          title: `Student Invoice: ${b.studentName}`,
          subtitle: `Class: ${b.className} • Adm: ${b.admissionNo} • Term: ${b.term} • Outstanding: ${(b.balance || 0).toLocaleString()} CFA`,
          type: 'financial',
          categoryLabel: 'Financial Bill',
          badgeText: `${(b.payable || b.subTotal || 0).toLocaleString()} CFA`,
          meta: b,
          actionModuleId: 'fee_bill_students',
          actionTab: 'bills'
        }))
    : [];

  const matchedPayments: GlobalSearchResultItem[] = (userRole === 'admin' || userRole === 'accountant' || userRole === 'secretary')
    ? payments
        .filter(p =>
          p.receiptNo.toLowerCase().includes(q) ||
          p.studentName.toLowerCase().includes(q) ||
          p.admissionNo.toLowerCase().includes(q) ||
          p.method.toLowerCase().includes(q) ||
          (p.description && p.description.toLowerCase().includes(q))
        )
        .slice(0, 5)
        .map(p => ({
          id: `pay-${p.id}`,
          title: `Payment Receipt #${p.receiptNo}`,
          subtitle: `Student: ${p.studentName} (${p.admissionNo}) • Channel: ${p.method} • Date: ${p.date}`,
          type: 'financial',
          categoryLabel: 'Payment Receipt',
          badgeText: `${(p.paid || p.amount || 0).toLocaleString()} CFA`,
          meta: p,
          actionModuleId: 'fee_payment_history',
          actionTab: 'collections'
        }))
    : [];

  const matchedTariffs: GlobalSearchResultItem[] = (userRole === 'admin' || userRole === 'accountant')
    ? tariffs
        .filter(t =>
          t.classTitle.toLowerCase().includes(q) ||
          t.dept.toLowerCase().includes(q) ||
          (t.notes && t.notes.toLowerCase().includes(q))
        )
        .slice(0, 5)
        .map(t => ({
          id: `tariff-${t.id}`,
          title: `Fee Schedule: ${t.classTitle}`,
          subtitle: `Dept: ${t.dept} • Base: ${t.baseTuition.toLocaleString()} CFA • Notes: ${t.notes || 'N/A'}`,
          type: 'financial',
          categoryLabel: 'Class Fee Tariff',
          badgeText: 'Tariff',
          meta: t,
          actionModuleId: 'fee_options',
          actionTab: 'matrix'
        }))
    : [];

  const financialResults = [...matchedBills, ...matchedPayments, ...matchedTariffs].slice(0, 10);

  // 4. System Settings & Module Navigation Search (Strictly restricted to Admin only)
  const navGroups = data.navGroups || [];
  const matchedSettings: GlobalSearchResultItem[] = [];

  if (userRole === 'admin') {
    navGroups.forEach(group => {
      group.items?.forEach((item: any) => {
        if (
          item.label.toLowerCase().includes(q) ||
          group.title.toLowerCase().includes(q) ||
          item.id.toLowerCase().includes(q)
        ) {
          matchedSettings.push({
            id: `setting-${item.id}`,
            title: item.label,
            subtitle: `Module Category: ${group.title}`,
            type: 'setting',
            categoryLabel: 'System Setting',
            badgeText: group.title,
            actionModuleId: item.id,
            actionTab: 'fee-settings'
          });
        }
      });
    });
  }

  const totalCount =
    matchedStudents.length +
    matchedTeachers.length +
    financialResults.length +
    matchedSettings.length;

  return {
    students: matchedStudents,
    teachers: matchedTeachers,
    financial: financialResults,
    settings: matchedSettings,
    totalCount
  };
};

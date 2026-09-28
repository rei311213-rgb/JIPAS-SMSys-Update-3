import { StudentBill, Student, NotificationItem, DailyFeeAuditSummary } from '../types';

const AUDIT_STORAGE_KEY = 'jipas_daily_fee_audit_summary';
const LAST_AUDIT_DATE_KEY = 'jipas_last_daily_fee_audit_date';

/**
 * Formats current date as YYYY-MM-DD for daily milestone comparison
 */
export const getTodayDateKey = (): string => {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

/**
 * Formats full human-readable timestamp
 */
export const getFormattedTimestamp = (d: Date = new Date()): string => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/**
 * Checks if the automated daily audit has already run today
 */
export const isDailyAuditDueToday = (): boolean => {
  try {
    const lastRunDate = localStorage.getItem(LAST_AUDIT_DATE_KEY);
    const today = getTodayDateKey();
    return lastRunDate !== today;
  } catch {
    return true;
  }
};

/**
 * Retrieve cached summary of the most recent audit
 */
export const getStoredAuditSummary = (): DailyFeeAuditSummary | null => {
  try {
    const raw = localStorage.getItem(AUDIT_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DailyFeeAuditSummary;
  } catch {
    return null;
  }
};

/**
 * Core Automated Daily Task:
 * Scans all student bills, identifies accounts with overdue or outstanding balances,
 * assigns 'Action Required' status with severity weights, and dispatches a bursary alert.
 */
export const runDailyFeeAudit = (
  bills: StudentBill[],
  students: Student[],
  onUpdateBills?: (updatedBills: StudentBill[]) => void,
  onAddNotification?: (notif: NotificationItem) => void,
  options: { force?: boolean } = {}
): { updatedBills: StudentBill[]; summary: DailyFeeAuditSummary } => {
  const today = getTodayDateKey();
  const nowFormatted = getFormattedTimestamp();

  // Map students by ID and admission number for fast lookup
  const studentMap = new Map<string, Student>();
  students.forEach(s => {
    studentMap.set(s.id, s);
    if (s.admissionNo) studentMap.set(s.admissionNo, s);
  });

  let totalOverdue = 0;
  let criticalCount = 0;
  let moderateCount = 0;
  let warningCount = 0;
  const auditItems: DailyFeeAuditSummary['items'] = [];

  const updatedBills = bills.map(bill => {
    const student = studentMap.get(bill.studentId) || studentMap.get(bill.admissionNo);
    const hasBalance = bill.balance > 0;

    if (!hasBalance) {
      // Balance is clear - if it was previously flagged, resolve it
      if (bill.actionRequired) {
        return {
          ...bill,
          actionRequired: false,
          actionStatus: 'Resolved' as const,
          actionSeverity: undefined
        };
      }
      return bill;
    }

    // Has balance: compute severity and reason
    totalOverdue += bill.balance;

    let severity: 'Critical' | 'Moderate' | 'Warning' = 'Warning';
    if (bill.balance >= 300 || (bill.arrears && bill.arrears > 0)) {
      severity = 'Critical';
      criticalCount++;
    } else if (bill.balance >= 100) {
      severity = 'Moderate';
      moderateCount++;
    } else {
      severity = 'Warning';
      warningCount++;
    }

    let reason = `Overdue tuition balance of ${(bill.balance ?? 0).toFixed(2)} CFA requires immediate settlement.`;
    if (bill.arrears && bill.arrears > 0) {
      reason = `Accumulated arrears of ${(bill.arrears ?? 0).toFixed(2)} CFA + current term balance unpaid.`;
    }

    const itemSummary = {
      studentId: bill.studentId,
      studentName: bill.studentName,
      admissionNo: bill.admissionNo,
      className: bill.className,
      parentName: student?.parentName || 'Parent / Guardian',
      parentPhone: student?.parentPhone || 'No contact phone',
      balance: bill.balance,
      severity,
      reason,
      status: (bill.actionStatus || 'Pending Follow-up') as 'Pending Follow-up' | 'Contacted' | 'Promised' | 'Resolved',
      promisedDate: bill.promisedDate
    };

    auditItems.push(itemSummary);

    return {
      ...bill,
      actionRequired: true,
      actionSeverity: severity,
      actionRequiredReason: reason,
      actionRequiredDate: bill.actionRequiredDate || today,
      actionStatus: bill.actionStatus || 'Pending Follow-up'
    };
  });

  const summary: DailyFeeAuditSummary = {
    lastRunDate: today,
    lastRunTimestamp: nowFormatted,
    totalStudentsChecked: bills.length,
    flaggedCount: auditItems.length,
    totalOverdueAmount: totalOverdue,
    criticalCount,
    moderateCount,
    warningCount,
    items: auditItems
  };

  // Save to persistent localStorage
  try {
    localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(summary));
    localStorage.setItem(LAST_AUDIT_DATE_KEY, today);
  } catch (e) {
    console.warn('Could not persist fee audit summary:', e);
  }

  // Update bills in state if callback is provided
  if (onUpdateBills) {
    onUpdateBills(updatedBills);
  }

  // Send an automated bursary alert notification once per day
  if (onAddNotification && auditItems.length > 0) {
    const notifKey = `jipas_audit_notif_sent_${today}`;
    const alreadySent = localStorage.getItem(notifKey);

    if (!alreadySent || options.force) {
      const newNotif: NotificationItem = {
        id: `audit-notif-${Date.now()}`,
        title: `🚨 Daily Fee Audit: ${auditItems.length} Accounts Require Action`,
        message: `Automated daily fee audit completed on ${nowFormatted}. ${auditItems.length} students have overdue balances totaling ${(totalOverdue || 0).toFixed(2)} CFA (${criticalCount} Critical). Flagged for immediate accountant follow-up.`,
        recipientGroup: 'Bursar & Accounts',
        targetAudience: 'accountant',
        dateSent: nowFormatted,
        read: false,
        type: 'fee_alert'
      };

      onAddNotification(newNotif);
      try {
        localStorage.setItem(notifKey, 'true');
      } catch {
        // ignore
      }
    }

    // Automatically send individual push notifications to students or parents when their fees become overdue
    auditItems.forEach((item, index) => {
      const studentId = item.studentId;
      const studentNotifKey = `jipas_fee_overdue_student_notif_${studentId}_${today}`;
      const studentAlreadySent = localStorage.getItem(studentNotifKey);

      if (!studentAlreadySent || options.force) {
        const student = studentMap.get(studentId);
        const parentName = student?.parentName || item.parentName;
        const studentName = student?.fullName || item.studentName;
        
        const overdueNotif: NotificationItem = {
          id: `fee-overdue-student-notif-${studentId}-${Date.now()}-${index}`,
          title: `⚠️ Overdue Fee Notice: Balance of ${(item.balance ?? 0).toFixed(2)} CFA`,
          message: `Dear ${parentName}, this is a reminder from the Bursary Department. ${studentName}'s terminal bill has an outstanding balance of ${(item.balance ?? 0).toFixed(2)} CFA. Please ensure prompt payment to prevent any educational disruption.`,
          recipientGroup: studentName, // matches student.fullName exactly for StudentPortal filter
          targetAudience: 'Parents & Students',
          targetClass: item.className,
          dateSent: nowFormatted,
          read: false,
          type: 'fee_notice',
          priority: item.severity === 'Critical' ? 'High' : 'Normal'
        };

        onAddNotification(overdueNotif);
        try {
          localStorage.setItem(studentNotifKey, 'true');
        } catch {
          // ignore
        }
      }
    });
  }

  return { updatedBills, summary };
};

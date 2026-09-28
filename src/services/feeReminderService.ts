import { Student, StudentBill, NotificationItem } from '../types';

export interface FeeReminderItem {
  studentId: string;
  studentName: string;
  admissionNo: string;
  className: string;
  department: string;
  parentName: string;
  parentPhone: string;
  totalPayable: number;
  paid: number;
  balance: number;
  status: 'Unpaid' | 'Partially Paid';
  academicYear: string;
  term: string;
  dueDate: string;
  preformattedMessage: string;
  notificationTitle: string;
}

/**
 * Identifies all students with an 'Unpaid' or 'Partially Paid' balance status
 * and generates professional pre-formatted reminder notification messages.
 */
export function identifyStudentsForFeeReminder(
  students: Student[],
  bills: StudentBill[]
): FeeReminderItem[] {
  const overdueList: FeeReminderItem[] = [];

  bills.forEach(bill => {
    // Only target students with positive balance and 'Unpaid' or 'Partially Paid' status
    const isUnpaidOrPartial = 
      bill.status === 'Unpaid' || 
      bill.status === 'Partially Paid' || 
      bill.balance > 0;

    if (!isUnpaidOrPartial) return;

    const student = students.find(s => s.id === bill.studentId || s.admissionNo === bill.admissionNo);
    const parentName = student?.parentName || student?.guardianName || 'Parent / Guardian';
    const parentPhone = student?.parentPhone || 'N/A';
    const dept = student?.department || 'General';
    const studentName = bill.studentName || student?.name || 'Student';
    const admissionNo = bill.admissionNo || student?.admissionNo || 'N/A';
    const className = bill.className || student?.className || 'N/A';
    const year = bill.academicYear || '2025/2026';
    const term = bill.term || 'Term 1';
    const balance = bill.balance ?? (bill.payable - bill.paid);
    const paid = bill.paid ?? 0;
    const total = bill.payable ?? (paid + balance);
    const dueDate = bill.dueDate || 'End of Month';

    const statusType: 'Unpaid' | 'Partially Paid' = paid > 0 ? 'Partially Paid' : 'Unpaid';

    let preformattedMessage = '';
    let notificationTitle = '';

    if (statusType === 'Partially Paid') {
      notificationTitle = `Partial Fee Payment Notice: ${studentName} (${className})`;
      preformattedMessage = `Dear ${parentName}, thank you for your recent tuition payment of ${paid.toLocaleString()} CFA towards ${studentName}'s (${className}, ID: ${admissionNo}) fees. A remaining balance of ${balance.toLocaleString()} CFA is outstanding out of total ${total.toLocaleString()} CFA for ${year} (${term}). Kindly arrange settlement by ${dueDate} to complete clearance. - JIPAS Bursary & Accounts Office (Tel: +233 24 123 4567)`;
    } else {
      notificationTitle = `Outstanding Fee Reminder: ${studentName} (${className})`;
      preformattedMessage = `OFFICIAL FEE NOTICE: Dear ${parentName}, this is an urgent reminder from JIPAS Educational Complex that ${studentName} (${className}, ID: ${admissionNo}) has an unpaid tuition balance of ${balance.toLocaleString()} CFA for ${year} (${term}). Full fees payable: ${total.toLocaleString()} CFA. Please arrange settlement on or before ${dueDate} at the school bursary. Contact JIPAS Accounts Office for inquiries.`;
    }

    overdueList.push({
      studentId: bill.studentId,
      studentName,
      admissionNo,
      className,
      department: dept,
      parentName,
      parentPhone,
      totalPayable: total,
      paid,
      balance,
      status: statusType,
      academicYear: year,
      term,
      dueDate,
      preformattedMessage,
      notificationTitle
    });
  });

  // Sort by highest balance first
  return overdueList.sort((a, b) => b.balance - a.balance);
}

/**
 * Converts a FeeReminderItem into an in-app NotificationItem
 */
export function createNotificationFromReminder(reminder: FeeReminderItem): NotificationItem {
  return {
    id: `notif-fee-${reminder.studentId}-${Date.now()}`,
    title: reminder.notificationTitle,
    message: reminder.preformattedMessage,
    type: 'Fee Alert',
    recipientGroup: 'Parent & Student',
    targetAudience: 'Parents',
    targetClass: reminder.className,
    targetUserId: reminder.studentId,
    targetRole: 'parent',
    date: new Date().toISOString().slice(0, 10),
    dateSent: new Date().toLocaleDateString('en-GB'),
    read: false,
    sender: 'Accountant (Bursary)',
    sentBy: 'JIPAS Accounts Office',
    priority: reminder.status === 'Unpaid' ? 'High' : 'Medium',
    status: 'Sent'
  };
}

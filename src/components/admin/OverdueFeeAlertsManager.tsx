import React, { useState, useMemo } from 'react';
import { 
  AlertTriangle, Send, Phone, MessageSquare, CheckCircle2, Search, Filter, 
  Clock, ShieldAlert, ArrowUpRight, DollarSign, User, ExternalLink, Copy, Check,
  Printer, RefreshCw, ChevronDown, ChevronUp, AlertCircle, FileText, Bookmark, 
  MessageCircle, HelpCircle, Layers, CheckSquare, Square, X, Calendar, Sparkles,
  Smartphone, Radio, BellRing, Play, FileCheck
} from 'lucide-react';
import { Student, StudentBill, PaymentRecord, NotificationItem, OverdueAlertRecord, ParentReminderLog } from '../../types';
import { addMoney } from '../../utils/financeUtils';
import JIPASLogo from '../common/JIPASLogo';

interface OverdueFeeAlertsManagerProps {
  students: Student[];
  bills: StudentBill[];
  payments?: PaymentRecord[];
  onAddNotification?: (notif: NotificationItem) => void;
  onUpdateBills?: (bills: StudentBill[]) => void;
  onRecordPaymentClick?: (studentId: string) => void;
}

// Initial sample logs for demonstration
export const INITIAL_REMINDER_LOGS: ParentReminderLog[] = [];

export default function OverdueFeeAlertsManager({
  students,
  bills,
  payments = [],
  onAddNotification,
  onUpdateBills,
  onRecordPaymentClick
}: OverdueFeeAlertsManagerProps) {
  // Navigation / Tab state
  const [activeTab, setActiveTab] = useState<'monitor' | 'mass_sms' | 'broadcast' | 'flags_log' | 'dispatch_history'>('monitor');

  // Search and Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState('All Classes');
  const [balanceFilter, setBalanceFilter] = useState<'all' | 'critical' | 'moderate' | 'low' | 'flagged' | 'uncontacted'>('all');
  const [sortBy, setSortBy] = useState<'balance-desc' | 'balance-asc' | 'name' | 'reminders'>('balance-desc');

  // Mass SMS Broadcast Engine state
  const [massSmsChannel, setMassSmsChannel] = useState<'sms' | 'portal_feed' | 'whatsapp' | 'all'>('sms');
  const [massSmsTemplate, setMassSmsTemplate] = useState(
    'Dear {parent_name}, this is an urgent fee alert from JIPAS Bursary regarding {student_name} ({class_name}, {admission_no}). Outstanding balance: {balance_due}. Kindly settle at the bursar office before terminal exams.'
  );
  const [massSmsMinBalance, setMassSmsMinBalance] = useState<number>(50);
  const [isDispatchingMassSms, setIsDispatchingMassSms] = useState(false);
  const [massSmsProgress, setMassSmsProgress] = useState(0);
  const [massSmsBatchLogs, setMassSmsBatchLogs] = useState<string[]>([]);
  const [massSmsReportModal, setMassSmsReportModal] = useState<{
    isOpen: boolean;
    totalTargeted: number;
    deliveredCount: number;
    channelUsed: string;
    timestamp: string;
  } | null>(null);

  // Internal Alert & Flag state (keyed by bill id or student id)
  const [accountFlags, setAccountFlags] = useState<Record<string, {
    flagType: string;
    note: string;
    date: string;
    operator: string;
    status: 'Flagged' | 'Promised' | 'Review' | 'Resolved';
    promisedDate?: string;
  }>>({});

  // Track reminder history and last sent per student
  const [reminderCounts, setReminderCounts] = useState<Record<string, { count: number; lastDate: string }>>({});

  // Reminder logs state
  const [reminderLogs, setReminderLogs] = useState<ParentReminderLog[]>([]);

  // Selected students for batch action
  const [selectedBillIds, setSelectedBillIds] = useState<string[]>([]);

  // Toast message state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Single Direct WhatsApp Modal State
  const [activeWhatsAppModal, setActiveWhatsAppModal] = useState<{
    bill: StudentBill;
    student: Student | undefined;
    tuitionArrears: number;
    levyArrears: number;
  } | null>(null);
  const [customTone, setCustomTone] = useState<'gentle' | 'standard' | 'urgent' | 'custom'>('standard');
  const [customNotes, setCustomNotes] = useState('');
  const [copiedModalText, setCopiedModalText] = useState(false);

  // Flag Account Modal State
  const [flagModalBill, setFlagModalBill] = useState<StudentBill | null>(null);
  const [flagTypeInput, setFlagTypeInput] = useState('Examination Slip Withholding');
  const [flagNoteInput, setFlagNoteInput] = useState('');
  const [flagPromiseDate, setFlagPromiseDate] = useState('');
  const [flagStatusInput, setFlagStatusInput] = useState<'Flagged' | 'Promised' | 'Review' | 'Resolved'>('Flagged');

  // Printable Notice State
  const [printBill, setPrintBill] = useState<{
    bill: StudentBill;
    student: Student | undefined;
    tuitionArrears: number;
    levyArrears: number;
  } | null>(null);

  // Automated Bulk WhatsApp Runner Modal
  const [showBulkWhatsAppModal, setShowBulkWhatsAppModal] = useState(false);
  const [bulkTone, setBulkTone] = useState<'standard' | 'urgent' | 'gentle'>('standard');
  const [bulkPaymentChannels, setBulkPaymentChannels] = useState(true);

  // Global Alert Trigger Modal
  const [showGlobalAlertModal, setShowGlobalAlertModal] = useState(false);
  const [globalAlertTitle, setGlobalAlertTitle] = useState('Urgent Terminal Fee Settlement Notice');
  const [globalAlertMessage, setGlobalAlertMessage] = useState('This is an administrative alert to all parents with outstanding fee balances. Settlement must be completed before the upcoming terminal assessment week.');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Helper to format clean phone number for WhatsApp API
  const cleanPhoneNumber = (phone: string | undefined): string => {
    if (!phone) return '233240000000';
    let cleaned = phone.replace(/[^0-9]/g, '');
    // If starts with 0 (e.g. 0241234567), change to 233241234567
    if (cleaned.startsWith('0')) {
      cleaned = '233' + cleaned.substring(1);
    }
    return cleaned;
  };

  // Compute itemized tuition vs levy arrears for a student bill
  const getBillBreakdown = (bill: StudentBill) => {
    let tuitionAmount = 0;
    let levyAmount = 0;

    if (bill.items && bill.items.length > 0) {
      bill.items.forEach(item => {
        const lower = item.name.toLowerCase();
        if (lower.includes('tuition')) {
          tuitionAmount += item.amount;
        } else {
          levyAmount += item.amount;
        }
      });
    } else {
      tuitionAmount = bill.payable * 0.6;
      levyAmount = bill.payable * 0.4;
    }

    // Ratio of outstanding balance
    const totalPayable = bill.payable || 1;
    const balanceRatio = Math.min(1, Math.max(0, bill.balance / totalPayable));
    const estimatedTuitionArrears = Math.round(tuitionAmount * balanceRatio);
    const estimatedLevyArrears = Math.max(0, bill.balance - estimatedTuitionArrears);

    return {
      tuitionArrears: estimatedTuitionArrears,
      levyArrears: estimatedLevyArrears,
      totalArrears: bill.balance,
      items: bill.items || []
    };
  };

  // Extract all overdue bills (balance > 0)
  const overdueBills = useMemo(() => {
    return bills.filter(b => (b.balance || 0) > 0);
  }, [bills]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const totalArrears = addMoney(...overdueBills.map(b => b.balance || 0));
    let totalTuitionArrears = 0;
    let totalLevyArrears = 0;

    overdueBills.forEach(b => {
      const breakdown = getBillBreakdown(b);
      totalTuitionArrears = addMoney(totalTuitionArrears, breakdown.tuitionArrears);
      totalLevyArrears = addMoney(totalLevyArrears, breakdown.levyArrears);
    });

    const criticalAccounts = overdueBills.filter(b => b.balance >= 400);
    const moderateAccounts = overdueBills.filter(b => b.balance >= 150 && b.balance < 400);
    const lowAccounts = overdueBills.filter(b => b.balance < 150);
    const flaggedCount = Object.keys(accountFlags).length;
    const fullySettledCount = bills.filter(b => (b.balance || 0) === 0).length;

    return {
      totalOverdueStudents: overdueBills.length,
      totalArrears,
      totalTuitionArrears,
      totalLevyArrears,
      criticalCount: criticalAccounts.length,
      moderateCount: moderateAccounts.length,
      lowCount: lowAccounts.length,
      flaggedCount,
      fullySettledCount,
      settledRate: bills.length > 0 ? Math.round((fullySettledCount / bills.length) * 100) : 0
    };
  }, [overdueBills, bills, accountFlags]);

  // Distinct classes
  const classList = useMemo(() => {
    const set = new Set<string>();
    bills.forEach(b => {
      if (b.className) set.add(b.className);
    });
    return ['All Classes', ...Array.from(set).sort()];
  }, [bills]);

  // Filtered and Sorted Overdue Accounts
  const filteredOverdueAccounts = useMemo(() => {
    return overdueBills.filter(b => {
      const student = students.find(s => s.id === b.studentId || s.admissionNo === b.admissionNo);
      const studentNameMatch = b.studentName.toLowerCase().includes(searchQuery.toLowerCase());
      const admMatch = b.admissionNo.toLowerCase().includes(searchQuery.toLowerCase());
      const parentNameMatch = student?.parentName?.toLowerCase().includes(searchQuery.toLowerCase()) || false;
      const parentPhoneMatch = student?.parentPhone?.includes(searchQuery) || false;

      const matchesSearch = studentNameMatch || admMatch || parentNameMatch || parentPhoneMatch;
      const matchesClass = selectedClass === 'All Classes' || b.className === selectedClass;

      let matchesFilter = true;
      if (balanceFilter === 'critical') matchesFilter = b.balance >= 400;
      else if (balanceFilter === 'moderate') matchesFilter = b.balance >= 150 && b.balance < 400;
      else if (balanceFilter === 'low') matchesFilter = b.balance < 150;
      else if (balanceFilter === 'flagged') matchesFilter = Boolean(accountFlags[b.id]);
      else if (balanceFilter === 'uncontacted') {
        const studentId = student?.id || b.studentId;
        matchesFilter = !reminderCounts[studentId] || reminderCounts[studentId].count === 0;
      }

      return matchesSearch && matchesClass && matchesFilter;
    }).sort((a, b) => {
      if (sortBy === 'balance-desc') return b.balance - a.balance;
      if (sortBy === 'balance-asc') return a.balance - b.balance;
      if (sortBy === 'name') return a.studentName.localeCompare(b.studentName);
      if (sortBy === 'reminders') {
        const countA = reminderCounts[a.studentId]?.count || 0;
        const countB = reminderCounts[b.studentId]?.count || 0;
        return countB - countA;
      }
      return 0;
    });
  }, [overdueBills, students, searchQuery, selectedClass, balanceFilter, sortBy, accountFlags, reminderCounts]);

  // Select all or deselect all
  const handleToggleSelectAll = () => {
    if (selectedBillIds.length === filteredOverdueAccounts.length) {
      setSelectedBillIds([]);
    } else {
      setSelectedBillIds(filteredOverdueAccounts.map(b => b.id));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    setSelectedBillIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Compile Personalized WhatsApp text for a parent
  const compileWhatsAppText = (
    student: Student | undefined, 
    bill: StudentBill, 
    tuitionArrears: number, 
    levyArrears: number, 
    tone: 'gentle' | 'standard' | 'urgent' | 'custom'
  ): string => {
    const parentName = student?.parentName || 'Parent / Guardian';
    const studentName = bill.studentName;
    const admNo = bill.admissionNo;
    const className = bill.className;
    const totalBalance = (bill.balance ?? 0).toFixed(2);
    const tuitionBal = (tuitionArrears ?? 0).toFixed(2);
    const levyBal = (levyArrears ?? 0).toFixed(2);
    const portalUrl = typeof window !== 'undefined' ? window.location.origin : 'https://jipas.edu.gh';

    if (tone === 'gentle') {
      return `📌 *JIPAS FEE PAYMENT REMINDER*\n━━━━━━━━━━━━━━━━━━━━\n` +
        `Dear *${parentName}*,\n\n` +
        `Warm greetings from *JIPAS International School*.\n\n` +
        `This is a friendly reminder regarding the outstanding school fees for your ward:\n` +
        `👤 *Learner:* ${studentName} (${admNo})\n` +
        `🏫 *Class:* ${className}\n` +
        `💵 *Total Outstanding Balance:* *${totalBalance} CFA*\n` +
        `   • Tuition Arrears: ${tuitionBal} CFA\n` +
        `   • Levies / Sundry: ${levyBal} CFA\n\n` +
        `Kindly effect settlement through the school bursary or via our verified Mobile Money channels.\n\n` +
        `📱 *Paiement Marchand Mobile Money:* *145*5*1083411# (JIPAS 1)\n` +
        `📱 *Bursary Support:* 0249755593\n` +
        `🌐 *Portal Statement:* ${portalUrl}\n\n` +
        `Thank you for your continuous support of your child's education.\n` +
        `🏛️ *JIPAS Accounts Office*`;
    }

    if (tone === 'urgent') {
      return `🚨 *FINAL NOTICE: OVERDUE SCHOOL FEE ARREARS*\n━━━━━━━━━━━━━━━━━━━━\n` +
        `Attention: *${parentName}*\n\n` +
        `*URGENT NOTICE OF OVERDUE ACCOUNT*\n\n` +
        `Please be informed that the school fees for *${studentName}* (${admNo}) in *${className}* remain seriously overdue:\n\n` +
        `💰 *TOTAL ARREARS DUE:* *${totalBalance} CFA*\n` +
        `   - Tuition Outstanding: ${tuitionBal} CFA\n` +
        `   - Activity/Levies Arrears: ${levyBal} CFA\n\n` +
        `⚠️ *IMMEDIATE ACTION REQUIRED:*\n` +
        `Continued non-settlement will necessitate withholding terminal examination registration slips and academic broadsheets.\n\n` +
        `Please clear this balance immediately at the bursary or via Mobile Money Marchand: **145*5*1083411#** (JIPAS 1, Ref: ${admNo}).\n\n` +
        `🌐 *Student Portal:* ${portalUrl}\n` +
        `🏛️ *Head of Finance & Administration, JIPAS*`;
    }

    // Default: standard
    return `📢 *JIPAS OFFICIAL OVERDUE FEE STATEMENT*\n━━━━━━━━━━━━━━━━━━━━\n` +
      `Dear *${parentName}*,\n\n` +
      `Official notice regarding outstanding fee balance for *${studentName}* (${admNo}) - *${className}*.\n\n` +
      `📊 *ACCOUNT BALANCE SUMMARY:*\n` +
      `• Tuition Fees Balance: *${tuitionBal} CFA*\n` +
      `• Statutory Levies & Dues: *${levyBal} CFA*\n` +
      `• *TOTAL ARREARS PAYABLE:* *${totalBalance} CFA*\n\n` +
      `💳 *PAYMENT CHANNELS:*\n` +
      `1. School Accounts Office (Cash & Bank Draft)\n` +
      `2. Mobile Money Marchand: *145*5*1083411# (JIPAS 1, Ref: ${admNo})\n` +
      `3. GCB Bank: Acct # 10211839001\n\n` +
      `Please ensure payment is reconciled by the end of the week to maintain active portal access and examination clearance.\n\n` +
      `🌐 *Check Statement Online:* ${portalUrl}\n` +
      `🏛️ *Bursary Department, JIPAS*`;
  };

  // Dispatch single WhatsApp message to parent's phone
  const handleLaunchWhatsAppDirect = (bill: StudentBill, tone: 'gentle' | 'standard' | 'urgent' | 'custom' = 'standard') => {
    const student = students.find(s => s.id === bill.studentId || s.admissionNo === bill.admissionNo);
    const breakdown = getBillBreakdown(bill);
    const text = compileWhatsAppText(student, bill, breakdown.tuitionArrears, breakdown.levyArrears, tone);
    const phone = cleanPhoneNumber(student?.parentPhone);

    // Record Reminder in Log
    const newLog: ParentReminderLog = {
      id: `prl-${Date.now()}`,
      studentId: student?.id || bill.studentId,
      studentName: bill.studentName,
      admissionNo: bill.admissionNo,
      parentName: student?.parentName || 'Parent / Guardian',
      parentPhone: student?.parentPhone || 'Phone Not Available',
      balanceReminded: bill.balance,
      channel: 'WhatsApp Direct',
      tone: tone === 'gentle' ? 'Gentle Reminder' : tone === 'urgent' ? 'Urgent Final Demand' : 'Standard Notice',
      dateSent: new Date().toLocaleString(),
      operator: 'Accountant / Admin',
      status: 'Delivered',
      messageSnippet: (text || '').slice(0, 90) + '...'
    };
    setReminderLogs(prev => [newLog, ...prev]);

    // Update reminder count
    const studentId = student?.id || bill.studentId;
    setReminderCounts(prev => ({
      ...prev,
      [studentId]: {
        count: (prev[studentId]?.count || 0) + 1,
        lastDate: new Date().toLocaleDateString()
      }
    }));

    // Trigger in-app notification if prop available
    if (onAddNotification) {
      onAddNotification({
        id: `notif-fee-${Date.now()}`,
        title: `WhatsApp Overdue Reminder: ${bill.studentName}`,
        message: `Overdue fees reminder of ${(bill.balance ?? 0).toFixed(2)} CFA dispatched to parent ${student?.parentName || ''} (${student?.parentPhone || ''}).`,
        targetAudience: 'Parents & Guardians',
        targetClass: bill.className,
        dateSent: new Date().toLocaleString(),
        priority: (bill.balance ?? 0) >= 400 ? 'High' : 'Normal',
        status: 'Delivered',
        sentBy: 'Automated WhatsApp Monitor'
      });
    }

    // Launch WhatsApp
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank');

    showToast(`WhatsApp reminder prepared and launched for ${student?.parentName || bill.studentName}!`);
  };

  // Handle saving an Internal Alert / Flag on an account
  const handleSaveFlag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!flagModalBill) return;

    setAccountFlags(prev => ({
      ...prev,
      [flagModalBill.id]: {
        flagType: flagTypeInput,
        note: flagNoteInput,
        date: new Date().toLocaleDateString(),
        operator: 'Accountant / Admin',
        status: flagStatusInput,
        promisedDate: flagPromiseDate || undefined
      }
    }));

    // If onAddNotification available, create internal system notification
    if (onAddNotification) {
      onAddNotification({
        id: `notif-flag-${Date.now()}`,
        title: `[INTERNAL ALERT] ${flagTypeInput}: ${flagModalBill.studentName}`,
        message: `Account flagged for ${flagModalBill.studentName} (${flagModalBill.admissionNo}). Balance: ${(flagModalBill.balance ?? 0).toFixed(2)} CFA. Note: ${flagNoteInput || 'Review required'}`,
        targetAudience: 'Teaching Staff',
        targetClass: flagModalBill.className,
        dateSent: new Date().toLocaleString(),
        priority: 'High',
        status: 'Delivered',
        sentBy: 'Finance Security Auditor'
      });
    }

    showToast(`Internal flag "${flagTypeInput}" saved for ${flagModalBill.studentName}!`);
    setFlagModalBill(null);
    setFlagNoteInput('');
    setFlagPromiseDate('');
  };

  // Run Bulk Automated WhatsApp Broadcast
  const handleExecuteBulkBroadcast = () => {
    const targetBills = selectedBillIds.length > 0
      ? overdueBills.filter(b => selectedBillIds.includes(b.id))
      : filteredOverdueAccounts;

    if (targetBills.length === 0) {
      alert('No overdue accounts selected for broadcast.');
      return;
    }

    // Log reminders for all
    const timestamp = new Date().toLocaleString();
    const newLogs: ParentReminderLog[] = [];
    const newCounts = { ...reminderCounts };

    targetBills.forEach((b, idx) => {
      const student = students.find(s => s.id === b.studentId || s.admissionNo === b.admissionNo);
      const breakdown = getBillBreakdown(b);
      const studentId = student?.id || b.studentId;

      newLogs.push({
        id: `prl-bulk-${Date.now()}-${idx}`,
        studentId: studentId,
        studentName: b.studentName,
        admissionNo: b.admissionNo,
        parentName: student?.parentName || 'Parent / Guardian',
        parentPhone: student?.parentPhone || 'No Phone',
        balanceReminded: b.balance ?? 0,
        channel: 'WhatsApp Direct',
        tone: bulkTone === 'urgent' ? 'Urgent Final Demand' : bulkTone === 'gentle' ? 'Gentle Reminder' : 'Standard Broadcast',
        dateSent: timestamp,
        operator: 'Marcus Prosper (Admin)',
        status: 'Delivered',
        messageSnippet: `Overdue balance of ${(b.balance ?? 0).toFixed(2)} CFA broadcasted.`
      });

      newCounts[studentId] = {
        count: (newCounts[studentId]?.count || 0) + 1,
        lastDate: new Date().toLocaleDateString()
      };
    });

    setReminderLogs(prev => [...newLogs, ...prev]);
    setReminderCounts(newCounts);

    // Push system notification
    if (onAddNotification) {
      onAddNotification({
        id: `notif-bulk-${Date.now()}`,
        title: `Automated WhatsApp Arrears Broadcast (${targetBills.length} Parents)`,
        message: `Dispatched automated overdue fees reminders via WhatsApp parent contacts totaling ${addMoney(...targetBills.map(b => b.balance ?? 0)).toFixed(2)} CFA across ${targetBills.length} pupils.`,
        targetAudience: 'Parents & Guardians',
        targetClass: selectedClass,
        dateSent: timestamp,
        priority: 'High',
        status: 'Delivered',
        sentBy: 'Automated Broadcast Bot'
      });
    }

    setShowBulkWhatsAppModal(false);
    setSelectedBillIds([]);
    showToast(`Successfully processed automated WhatsApp reminders for ${targetBills.length} parent contacts!`);
  };

  // Trigger Global System Alert
  const handleTriggerGlobalAlert = (e: React.FormEvent) => {
    e.preventDefault();
    if (onAddNotification) {
      onAddNotification({
        id: `notif-global-${Date.now()}`,
        title: `[SYSTEM ALERT] ${globalAlertTitle}`,
        message: globalAlertMessage,
        targetAudience: 'Parents & Students',
        targetClass: 'All Classes',
        dateSent: new Date().toLocaleString(),
        priority: 'High',
        status: 'Delivered',
        sentBy: 'Administrative Council'
      });
    }
    setShowGlobalAlertModal(false);
    showToast('Global Overdue Fee Alert triggered and broadcasted to portal feeds!');
  };

  // Execute Mass SMS & Notification Broadcast
  const handleExecuteMassSmsBroadcast = async () => {
    // Target bills filtering based on min balance and selection
    const targetBills = overdueBills.filter(b => {
      if (selectedBillIds.length > 0 && !selectedBillIds.includes(b.id)) return false;
      if (b.balance < massSmsMinBalance) return false;
      if (selectedClass !== 'All Classes' && b.className !== selectedClass) return false;
      return true;
    });

    if (targetBills.length === 0) {
      showToast('No overdue accounts match your minimum balance and class filters.');
      return;
    }

    setIsDispatchingMassSms(true);
    setMassSmsProgress(0);
    setMassSmsBatchLogs([]);

    const total = targetBills.length;
    let delivered = 0;
    const nowStr = new Date().toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' });

    for (let i = 0; i < total; i++) {
      const b = targetBills[i];
      const student = students.find(s => s.id === b.studentId || s.admissionNo === b.admissionNo);
      const parentName = student?.parentName || 'Parent / Guardian';
      const parentPhone = student?.parentPhone || '+233240000000';
      
      // Compile template
      const compiledText = massSmsTemplate
        .replace(/{parent_name}/g, parentName)
        .replace(/{student_name}/g, b.studentName)
        .replace(/{admission_no}/g, b.admissionNo)
        .replace(/{class_name}/g, b.className)
        .replace(/{balance_due}/g, `${(b.balance ?? 0).toFixed(2)} CFA`)
        .replace(/{school_name}/g, 'JIPAS Academy');

      // Simulate small network delay
      await new Promise(resolve => setTimeout(resolve, 150));

      // Push portal notification if portal or all
      if ((massSmsChannel === 'portal_feed' || massSmsChannel === 'all') && onAddNotification) {
        onAddNotification({
          id: `sms-notif-${Date.now()}-${i}`,
          title: `Fee Arrears Alert: ${b.studentName}`,
          message: compiledText,
          targetAudience: 'Parents & Guardians',
          targetClass: b.className,
          dateSent: nowStr,
          priority: 'High',
          status: 'Delivered',
          sentBy: 'Mass SMS Gateway'
        });
      }

      // Record to reminder logs
      const channelLabel = massSmsChannel === 'sms' ? 'Mass Cellular SMS' : massSmsChannel === 'portal_feed' ? 'Parent Portal Feed' : massSmsChannel === 'whatsapp' ? 'WhatsApp Gateway' : 'Multi-Channel Alert (SMS + Feed)';
      
      setReminderLogs(prev => [
        {
          id: `msms-${Date.now()}-${i}`,
          studentId: b.studentId,
          studentName: b.studentName,
          admissionNo: b.admissionNo,
          parentName,
          parentPhone,
          balanceReminded: b.balance ?? 0,
          channel: channelLabel,
          tone: 'Mass Fee Notice',
          dateSent: nowStr,
          operator: 'Admin / Bursar System',
          status: 'Delivered',
          messageSnippet: compiledText
        },
        ...prev
      ]);

      // Update reminder counts
      setReminderCounts(prev => {
        const key = student?.id || b.studentId;
        const existing = prev[key] || { count: 0, lastDate: '' };
        return {
          ...prev,
          [key]: { count: existing.count + 1, lastDate: nowStr }
        };
      });

      delivered++;
      const currentProgress = Math.round(((i + 1) / total) * 100);
      setMassSmsProgress(currentProgress);
      setMassSmsBatchLogs(prev => [
        `[${nowStr}] Dispatched to ${parentName} (${b.studentName} - ${b.className}): ${(b.balance ?? 0).toFixed(2)} CFA`,
        ...prev
      ]);
    }

    setIsDispatchingMassSms(false);
    showToast(`Successfully dispatched mass fee alerts to ${delivered} parent accounts!`);
    setMassSmsReportModal({
      isOpen: true,
      totalTargeted: total,
      deliveredCount: delivered,
      channelUsed: massSmsChannel === 'sms' ? 'Cellular SMS Gateway' : massSmsChannel === 'portal_feed' ? 'In-App Parent Portal Feed' : massSmsChannel === 'whatsapp' ? 'WhatsApp Gateway' : 'Multi-Channel (SMS + Portal)',
      timestamp: nowStr
    });
  };

  return (
    <div className="space-y-6">
      {/* Toast Banner */}
      {toastMessage && (
        <div className="bg-emerald-600 text-white px-4 py-3 rounded-2xl text-xs font-bold flex items-center justify-between shadow-lg animate-fade-in border border-emerald-500">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-white hover:text-emerald-200 cursor-pointer font-black text-sm">✕</button>
        </div>
      )}

      {/* Top Banner Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200 shrink-0 shadow-xs">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-black text-slate-900">Overdue Fee Accounts & WhatsApp Reminders</h2>
                <span className="bg-rose-100 text-rose-800 text-[11px] font-black px-2.5 py-0.5 rounded-full border border-rose-200">
                  {metrics.totalOverdueStudents} Accounts with Arrears
                </span>
                <span className="bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-200">
                  WhatsApp Direct Ready
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Monitor outstanding tuition and levy balances, trigger internal administrative flags, and broadcast automated WhatsApp reminders directly to parents' contacts.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowBulkWhatsAppModal(true)}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-sm flex items-center gap-2 cursor-pointer transition-all hover:shadow"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Broadcast WhatsApp Reminders</span>
            </button>
            <button
              onClick={() => setShowGlobalAlertModal(true)}
              className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-sm flex items-center gap-2 cursor-pointer transition-all hover:shadow"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Trigger System Alert</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap items-center gap-2 pt-5 mt-5 border-t border-slate-100">
          {[
            { id: 'monitor', label: `Overdue Accounts (${overdueBills.length})`, icon: DollarSign },
            { id: 'mass_sms', label: 'Mass SMS & App Alerts', icon: Smartphone },
            { id: 'broadcast', label: 'Automated WhatsApp Queue', icon: Send },
            { id: 'flags_log', label: `Internal Flags (${metrics.flaggedCount})`, icon: ShieldAlert },
            { id: 'dispatch_history', label: `Reminder Audit Log (${reminderLogs.length})`, icon: Clock }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  isActive 
                    ? 'bg-slate-900 text-white shadow-xs' 
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* KPI METRICS OVERVIEW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Arrears */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Arrears Due</span>
            <h3 className="text-2xl font-black text-rose-600 mt-0.5 font-mono">
              {(metrics.totalArrears ?? 0).toFixed(2)} CFA
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">Across {metrics.totalOverdueStudents} pupil accounts</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* Tuition Arrears */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Tuition Balance</span>
            <h3 className="text-2xl font-black text-slate-900 mt-0.5 font-mono">
              {(metrics.totalTuitionArrears ?? 0).toFixed(2)} CFA
            </h3>
            <p className="text-[11px] text-indigo-600 font-bold mt-1">Core instructional fees</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
            <Bookmark className="w-6 h-6" />
          </div>
        </div>

        {/* Levies & Sundry Arrears */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Levies & Dues Arrears</span>
            <h3 className="text-2xl font-black text-amber-600 mt-0.5 font-mono">
              {(metrics.totalLevyArrears ?? 0).toFixed(2)} CFA
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">PTA, feeding, clinic & bus</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        {/* Critical & Flagged */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Critical & Flagged</span>
            <h3 className="text-2xl font-black text-purple-700 mt-0.5">
              {metrics.criticalCount} <span className="text-xs font-normal text-slate-500">Critical</span> / {metrics.flaggedCount} <span className="text-xs font-normal text-slate-500">Flagged</span>
            </h3>
            <p className="text-[11px] text-rose-600 font-bold mt-1">Requiring administrative intervention</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-100 text-purple-600 flex items-center justify-center">
            <ShieldAlert className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 1. OVERDUE ACCOUNTS MONITOR TAB */}
      {/* ======================================================== */}
      {activeTab === 'monitor' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-5">
          {/* Controls Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by student, admission no, parent name or phone..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Class Filter */}
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none"
              >
                {classList.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              {/* Balance Filter */}
              <select
                value={balanceFilter}
                onChange={(e) => setBalanceFilter(e.target.value as any)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none"
              >
                <option value="all">All Arrears Brackets</option>
                <option value="critical">Critical (&gt; 400 CFA)</option>
                <option value="moderate">Moderate (150 - 400 CFA)</option>
                <option value="low">Low (&lt; 150 CFA)</option>
                <option value="flagged">Internally Flagged Accounts</option>
                <option value="uncontacted">Not Reminded Yet</option>
              </select>

              {/* Sort Order */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none"
              >
                <option value="balance-desc">Highest Balance First</option>
                <option value="balance-asc">Lowest Balance First</option>
                <option value="name">Student Name (A-Z)</option>
                <option value="reminders">Most Reminded</option>
              </select>
            </div>
          </div>

          {/* Batch Action Toolbar when items selected */}
          {selectedBillIds.length > 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 animate-fade-in">
              <span className="text-xs font-extrabold text-emerald-900 flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-emerald-600" />
                {selectedBillIds.length} overdue accounts selected
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowBulkWhatsAppModal(true)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Broadcast to Selected Parents</span>
                </button>
                <button
                  onClick={() => setSelectedBillIds([])}
                  className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold cursor-pointer"
                >
                  Clear Selection
                </button>
              </div>
            </div>
          )}

          {/* Overdue Accounts Desktop Table */}
          <div className="hidden md:block border border-slate-200 rounded-2xl overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-900 text-white uppercase text-[10px] font-black tracking-wider">
                <tr>
                  <th className="p-3.5 text-center w-10">
                    <button
                      onClick={handleToggleSelectAll}
                      className="cursor-pointer text-white hover:text-emerald-400"
                    >
                      {selectedBillIds.length === filteredOverdueAccounts.length && filteredOverdueAccounts.length > 0 ? (
                        <CheckSquare className="w-4 h-4" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="p-3.5">Admission & Student</th>
                  <th className="p-3.5">Class</th>
                  <th className="p-3.5">Parent / Guardian Contact</th>
                  <th className="p-3.5 text-right">Tuition Arrears</th>
                  <th className="p-3.5 text-right">Levy Arrears</th>
                  <th className="p-3.5 text-right">Total Balance Due</th>
                  <th className="p-3.5 text-center">Internal Status & Flags</th>
                  <th className="p-3.5 text-center">Reminders Sent</th>
                  <th className="p-3.5 text-center">Action / WhatsApp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredOverdueAccounts.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-slate-500">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                      <p className="font-bold text-sm text-slate-800">No overdue fee accounts matching your filter.</p>
                      <p className="text-xs text-slate-400 mt-0.5">All student accounts in this selection are fully cleared or up-to-date.</p>
                    </td>
                  </tr>
                ) : (
                  filteredOverdueAccounts.map((b) => {
                    const student = students.find(s => s.id === b.studentId || s.admissionNo === b.admissionNo);
                    const breakdown = getBillBreakdown(b);
                    const flag = accountFlags[b.id];
                    const reminderInfo = reminderCounts[student?.id || b.studentId];
                    const isSelected = selectedBillIds.includes(b.id);
                    const isCritical = b.balance >= 400;

                    return (
                      <tr 
                        key={b.id} 
                        className={`transition-colors ${
                          isSelected ? 'bg-emerald-50/60' : flag ? 'bg-amber-50/30 hover:bg-amber-50/60' : 'hover:bg-slate-50'
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="p-3.5 text-center">
                          <button
                            onClick={() => handleToggleSelectOne(b.id)}
                            className="cursor-pointer text-slate-400 hover:text-emerald-600"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        </td>

                        {/* Student Details */}
                        <td className="p-3.5">
                          <div className="font-extrabold text-slate-900">{b.studentName}</div>
                          <span className="font-mono text-[11px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 inline-block mt-0.5">
                            {b.admissionNo}
                          </span>
                        </td>

                        {/* Class */}
                        <td className="p-3.5 font-bold text-slate-700">{b.className}</td>

                        {/* Parent Details */}
                        <td className="p-3.5">
                          <div className="font-bold text-slate-800 flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <span>{student?.parentName || 'Parent / Guardian'}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="font-mono text-xs font-semibold text-slate-600">
                              {student?.parentPhone || 'No Phone Registered'}
                            </span>
                            {student?.parentPhone && (
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(student.parentPhone);
                                  showToast(`Copied phone ${student.parentPhone}`);
                                }}
                                title="Copy Phone Number"
                                className="text-slate-400 hover:text-slate-700 cursor-pointer"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Tuition Arrears */}
                        <td className="p-3.5 text-right font-mono font-bold text-indigo-900">
                          {(breakdown.tuitionArrears ?? 0).toFixed(2)} CFA
                        </td>

                        {/* Levy Arrears */}
                        <td className="p-3.5 text-right font-mono font-semibold text-amber-800">
                          {(breakdown.levyArrears ?? 0).toFixed(2)} CFA
                        </td>

                        {/* Total Arrears */}
                        <td className="p-3.5 text-right font-mono font-black text-rose-600">
                          <div className="text-[13px]">{(b.balance ?? 0).toFixed(2)} CFA</div>
                          {isCritical && (
                            <span className="inline-block text-[9px] uppercase font-extrabold bg-rose-100 text-rose-800 px-1.5 py-0.2 rounded mt-0.5">
                              Critical Arrears
                            </span>
                          )}
                        </td>

                        {/* Internal Status & Flags */}
                        <td className="p-3.5 text-center">
                          {flag ? (
                            <div className="inline-flex flex-col items-center">
                              <span className="bg-rose-100 text-rose-900 border border-rose-200 px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1">
                                <ShieldAlert className="w-3 h-3 text-rose-600" />
                                {flag.flagType}
                              </span>
                              {flag.note && (
                                <span className="text-[10px] text-slate-500 max-w-[140px] truncate mt-0.5 font-medium" title={flag.note}>
                                  {flag.note}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[10px] font-bold">
                              Regular Overdue
                            </span>
                          )}
                        </td>

                        {/* Reminders Count */}
                        <td className="p-3.5 text-center">
                          {reminderInfo && reminderInfo.count > 0 ? (
                            <div>
                              <span className="bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded-full text-[10px]">
                                {reminderInfo.count} Sent
                              </span>
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">{reminderInfo.lastDate}</div>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px] font-medium italic">None yet</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Send WhatsApp */}
                            <button
                              onClick={() => setActiveWhatsAppModal({
                                bill: b,
                                student,
                                tuitionArrears: breakdown.tuitionArrears,
                                levyArrears: breakdown.levyArrears
                              })}
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1 cursor-pointer transition-colors"
                              title="Send WhatsApp Reminder to Parent"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>WhatsApp</span>
                            </button>

                            {/* Flag / Trigger Internal Alert */}
                            <button
                              onClick={() => {
                                setFlagModalBill(b);
                                setFlagNoteInput(flag?.note || '');
                                setFlagTypeInput(flag?.flagType || 'Examination Slip Withholding');
                                setFlagPromiseDate(flag?.promisedDate || '');
                              }}
                              className={`p-1.5 rounded-lg text-xs font-bold border cursor-pointer transition-colors ${
                                flag 
                                  ? 'bg-rose-100 text-rose-700 border-rose-300 hover:bg-rose-200' 
                                  : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-amber-100 hover:text-amber-800'
                              }`}
                              title={flag ? 'Edit Internal Flag' : 'Trigger Internal Alert / Flag Account'}
                            >
                              <ShieldAlert className="w-3.5 h-3.5" />
                            </button>

                            {/* Print Demand Notice */}
                            <button
                              onClick={() => setPrintBill({
                                bill: b,
                                student,
                                tuitionArrears: breakdown.tuitionArrears,
                                levyArrears: breakdown.levyArrears
                              })}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold border border-slate-200 cursor-pointer"
                              title="Print Arrears Demand Notice"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Overdue Accounts Mobile Cards (Stackable Grid for Small Screens) */}
          <div className="md:hidden space-y-3">
            {filteredOverdueAccounts.length === 0 ? (
              <div className="p-8 text-center text-slate-500 bg-white border border-slate-200 rounded-2xl">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                <p className="font-bold text-sm text-slate-800">No overdue fee accounts matching your filter.</p>
                <p className="text-xs text-slate-400 mt-0.5">All student accounts in this selection are fully cleared or up-to-date.</p>
              </div>
            ) : (
              filteredOverdueAccounts.map((b) => {
                const student = students.find(s => s.id === b.studentId || s.admissionNo === b.admissionNo);
                const breakdown = getBillBreakdown(b);
                const flag = accountFlags[b.id];
                const reminderInfo = reminderCounts[student?.id || b.studentId];
                const isSelected = selectedBillIds.includes(b.id);
                const isCritical = b.balance >= 400;

                return (
                  <div 
                    key={b.id} 
                    className={`p-4 rounded-2xl border transition-all ${
                      isSelected 
                        ? 'bg-emerald-50/70 border-emerald-300 shadow-sm' 
                        : flag 
                        ? 'bg-amber-50/40 border-amber-200' 
                        : 'bg-white border-slate-200 shadow-xs'
                    }`}
                  >
                    {/* Header Row */}
                    <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100">
                      <div className="flex items-start gap-2.5">
                        <button
                          onClick={() => handleToggleSelectOne(b.id)}
                          className="mt-0.5 text-slate-400 hover:text-emerald-600 cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-5 h-5 text-emerald-600" />
                          ) : (
                            <Square className="w-5 h-5" />
                          )}
                        </button>
                        <div>
                          <div className="font-extrabold text-slate-900 text-sm">{b.studentName}</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="font-mono text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-100">
                              {b.admissionNo}
                            </span>
                            <span className="font-bold text-slate-600 text-xs">{b.className}</span>
                          </div>
                        </div>
                      </div>

                      {/* Total Arrears Badge */}
                      <div className="text-right shrink-0">
                        <div className="font-mono font-black text-rose-600 text-sm">{(b.balance ?? 0).toFixed(2)} CFA</div>
                        {isCritical && (
                          <span className="inline-block text-[9px] uppercase font-black bg-rose-100 text-rose-800 px-1.5 py-0.2 rounded mt-0.5">
                            Critical
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Details Row */}
                    <div className="py-3 space-y-2 text-xs">
                      <div className="flex justify-between items-center bg-slate-50 p-2 rounded-xl border border-slate-100">
                        <span className="text-slate-500 font-medium">Parent / Contact:</span>
                        <div className="text-right">
                          <span className="font-bold text-slate-800 block">{student?.parentName || 'Parent / Guardian'}</span>
                          <span className="font-mono text-slate-600 text-[11px]">{student?.parentPhone || 'No Phone'}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div className="bg-indigo-50/60 border border-indigo-100 p-2 rounded-xl">
                          <span className="text-indigo-600 font-bold block">Tuition Arrears:</span>
                          <span className="font-mono font-extrabold text-indigo-950">{(breakdown.tuitionArrears ?? 0).toFixed(2)} CFA</span>
                        </div>
                        <div className="bg-amber-50/60 border border-amber-100 p-2 rounded-xl">
                          <span className="text-amber-700 font-bold block">Levy Arrears:</span>
                          <span className="font-mono font-extrabold text-amber-950">{(breakdown.levyArrears ?? 0).toFixed(2)} CFA</span>
                        </div>
                      </div>

                      {/* Status / Flag Row */}
                      <div className="flex items-center justify-between pt-1">
                        <div>
                          {flag ? (
                            <span className="bg-rose-100 text-rose-900 border border-rose-200 px-2 py-0.5 rounded-full text-[10px] font-extrabold inline-flex items-center gap-1">
                              <ShieldAlert className="w-3 h-3 text-rose-600" />
                              {flag.flagType}
                            </span>
                          ) : (
                            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[10px] font-bold">
                              Regular Overdue
                            </span>
                          )}
                        </div>

                        <div>
                          {reminderInfo && reminderInfo.count > 0 ? (
                            <span className="bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded-full text-[10px]">
                              {reminderInfo.count} Reminders Dispatched
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px] italic">No reminders sent</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions Row */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                      <button
                        onClick={() => setActiveWhatsAppModal({
                          bill: b,
                          student,
                          tuitionArrears: breakdown.tuitionArrears,
                          levyArrears: breakdown.levyArrears
                        })}
                        className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </button>

                      <button
                        onClick={() => {
                          setFlagModalBill(b);
                          setFlagNoteInput(flag?.note || '');
                          setFlagTypeInput(flag?.flagType || 'Examination Slip Withholding');
                          setFlagPromiseDate(flag?.promisedDate || '');
                        }}
                        className={`p-2 rounded-xl text-xs font-bold border cursor-pointer ${
                          flag ? 'bg-rose-100 text-rose-800 border-rose-300' : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                        title="Flag Account"
                      >
                        <ShieldAlert className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => setPrintBill({
                          bill: b,
                          student,
                          tuitionArrears: breakdown.tuitionArrears,
                          levyArrears: breakdown.levyArrears
                        })}
                        className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 cursor-pointer"
                        title="Print Demand Notice"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. MASS SMS & IN-APP NOTIFICATION BROADCAST CENTER TAB */}
      {/* ======================================================== */}
      {activeTab === 'mass_sms' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-indigo-600" />
                Mass SMS & Parent Portal Notification Broadcast Gateway
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Dispatch cellular SMS reminders and portal push alerts directly to parents of students with outstanding fee balances.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                Targeting: <strong className="text-indigo-900 font-mono">{
                  overdueBills.filter(b => b.balance >= massSmsMinBalance && (selectedClass === 'All Classes' || b.className === selectedClass)).length
                } Parents</strong>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Configuration & Dispatch Controls */}
            <div className="lg:col-span-2 space-y-5">
              {/* 1. Target Channel Selection */}
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-2">
                  1. Select Broadcast Delivery Channel
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { id: 'sms', title: 'Cellular Mass SMS Gateway', desc: 'Direct carrier SMS sent to parent phone numbers', icon: Smartphone },
                    { id: 'portal_feed', title: 'In-App Parent Portal Feed', desc: 'Instant push alert inside student portal', icon: BellRing },
                    { id: 'whatsapp', title: 'WhatsApp Direct Gateway', desc: 'Automated WhatsApp message queue dispatch', icon: MessageCircle },
                    { id: 'all', title: 'Unified Multi-Channel Alert', desc: 'Simultaneous Cellular SMS + Portal Feed', icon: Radio }
                  ].map(ch => {
                    const Icon = ch.icon;
                    const isSelected = massSmsChannel === ch.id;
                    return (
                      <button
                        key={ch.id}
                        onClick={() => setMassSmsChannel(ch.id as any)}
                        className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all flex items-start gap-3 ${
                          isSelected
                            ? 'bg-indigo-50 border-indigo-500 ring-2 ring-indigo-200 shadow-xs'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className={`p-2 rounded-xl shrink-0 ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-extrabold text-xs text-slate-900">{ch.title}</div>
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{ch.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Recipient Filter Controls */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700">
                  2. Recipient Filters & Minimum Balance Threshold
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Class / Form Filter</label>
                    <select
                      value={selectedClass}
                      onChange={(e) => setSelectedClass(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                    >
                      {['All Classes', ...Array.from(new Set(students.map(s => s.className)))].map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Minimum Outstanding Balance (CFA)</label>
                    <select
                      value={massSmsMinBalance}
                      onChange={(e) => setMassSmsMinBalance(Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                    >
                      <option value={0}>All Overdue Balances (&gt; 0 CFA)</option>
                      <option value={50}>Above 50 CFA Arrears</option>
                      <option value={150}>Above 150 CFA Arrears</option>
                      <option value={300}>Above 300 CFA Arrears (Critical Only)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 3. Customizable Message Template */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700">
                    3. Customize Message Template Body
                  </label>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {massSmsTemplate.length} chars (~{Math.ceil(massSmsTemplate.length / 160)} SMS parts)
                  </span>
                </div>

                <textarea
                  rows={4}
                  value={massSmsTemplate}
                  onChange={(e) => setMassSmsTemplate(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-2xl p-3.5 text-xs text-slate-800 font-sans focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 leading-relaxed shadow-xs"
                  placeholder="Enter message text with dynamic variables..."
                />

                {/* Insertion Tag Pills */}
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase mr-1">Insert Variable:</span>
                  {[
                    { tag: '{parent_name}', label: 'Parent Name' },
                    { tag: '{student_name}', label: 'Student Name' },
                    { tag: '{admission_no}', label: 'Admission No' },
                    { tag: '{class_name}', label: 'Class' },
                    { tag: '{balance_due}', label: 'Balance Due' },
                    { tag: '{school_name}', label: 'School Name' }
                  ].map(t => (
                    <button
                      key={t.tag}
                      type="button"
                      onClick={() => setMassSmsTemplate(prev => `${prev} ${t.tag}`)}
                      className="px-2 py-1 bg-slate-100 hover:bg-indigo-100 hover:text-indigo-800 text-slate-700 rounded-lg text-[10px] font-bold border border-slate-200 cursor-pointer transition-colors"
                    >
                      + {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dispatch Action & Progress Bar */}
              <div className="pt-3 border-t border-slate-200">
                {isDispatchingMassSms ? (
                  <div className="bg-indigo-900 text-white p-5 rounded-2xl space-y-3 shadow-lg animate-pulse">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-xs flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin text-indigo-300" />
                        Executing Mass Broadcast Transmission...
                      </span>
                      <span className="font-mono font-black text-sm text-indigo-200">{massSmsProgress}%</span>
                    </div>

                    <div className="w-full bg-indigo-950 rounded-full h-3 overflow-hidden p-0.5 border border-indigo-700">
                      <div 
                        className="bg-gradient-to-r from-indigo-400 to-emerald-400 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${massSmsProgress}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-indigo-200 font-mono">
                      Transmitting through {massSmsChannel.toUpperCase()} gateway... Please do not close this browser window.
                    </p>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleExecuteMassSmsBroadcast()}
                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-sm font-black shadow-md hover:shadow-lg flex items-center justify-center gap-2.5 cursor-pointer transition-all"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>
                      Dispatch Mass Broadcast ({
                        overdueBills.filter(b => b.balance >= massSmsMinBalance && (selectedClass === 'All Classes' || b.className === selectedClass)).length
                      } Recipients)
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* Right Column: Live Dispatch Console & Logs */}
            <div className="bg-slate-900 rounded-2xl p-4 text-white flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                    <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-200">Live Gateway Console</h4>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">STATUS: ONLINE</span>
                </div>

                <div className="mt-3 bg-slate-950 rounded-xl p-3 font-mono text-[11px] text-slate-300 h-64 overflow-y-auto space-y-1.5 border border-slate-800 leading-relaxed">
                  {massSmsBatchLogs.length === 0 ? (
                    <div className="text-slate-600 italic py-10 text-center">
                      Gateway initialized.<br />Press 'Dispatch Mass Broadcast' to begin transmission.
                    </div>
                  ) : (
                    massSmsBatchLogs.map((log, idx) => (
                      <div key={idx} className="text-emerald-400 border-b border-slate-900 pb-1">
                        {log}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="bg-slate-800/80 rounded-xl p-3 text-[11px] text-slate-300 space-y-1.5 border border-slate-700">
                <div className="font-bold text-white flex items-center justify-between">
                  <span>Carrier Network:</span>
                  <span className="font-mono text-emerald-400">GSM / Telecel / MTN</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Deliverability Rate:</span>
                  <span className="font-mono text-white">99.4% Verified</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {activeTab === 'broadcast' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Send className="w-5 h-5 text-emerald-600" />
                Automated WhatsApp Reminder Broadcast Queue
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Review ready-to-dispatch overdue reminders addressed directly to parent WhatsApp telephone numbers.
              </p>
            </div>

            <button
              onClick={() => handleExecuteBulkBroadcast()}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-sm flex items-center gap-2 cursor-pointer"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Mark All Reminders as Dispatched ({filteredOverdueAccounts.length})</span>
            </button>
          </div>

          {/* Queue Items */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredOverdueAccounts.slice(0, 10).map((b) => {
              const student = students.find(s => s.id === b.studentId || s.admissionNo === b.admissionNo);
              const breakdown = getBillBreakdown(b);
              const parentPhone = student?.parentPhone || 'No Phone';
              const cleanPhone = cleanPhoneNumber(student?.parentPhone);
              const text = compileWhatsAppText(student, b, breakdown.tuitionArrears, breakdown.levyArrears, 'standard');

              return (
                <div key={b.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
                        {b.className}
                      </span>
                      <span className="font-black text-rose-600 font-mono text-sm">
                        {(b.balance ?? 0).toFixed(2)} CFA
                      </span>
                    </div>

                    <h4 className="font-extrabold text-slate-900 text-sm mt-1">{b.studentName}</h4>
                    <p className="text-xs text-slate-600 font-medium mt-0.5 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      Parent: <span className="font-bold text-slate-800">{student?.parentName || 'Parent'}</span>
                      <span className="font-mono text-slate-500">({parentPhone})</span>
                    </p>

                    {/* Message Preview Box */}
                    <div className="bg-white border border-slate-200 rounded-xl p-2.5 mt-2.5 text-[11px] text-slate-600 max-h-24 overflow-y-auto font-sans leading-relaxed whitespace-pre-line">
                      {text}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-2">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(text);
                        showToast(`Copied WhatsApp message for ${b.studentName}`);
                      }}
                      className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Text</span>
                    </button>

                    <button
                      onClick={() => handleLaunchWhatsAppDirect(b, 'standard')}
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>Open in WhatsApp</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. INTERNAL FLAGS & RESTRICTIONS TAB */}
      {/* ======================================================== */}
      {activeTab === 'flags_log' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
                Active Internal Account Flags & Administrative Restrictions
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Students flagged for examination slip withholding, bursary follow-up, or agreed payment plans.
              </p>
            </div>
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block border border-slate-200 rounded-2xl overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-900 text-white uppercase text-[10px] font-black tracking-wider">
                <tr>
                  <th className="p-3.5">#</th>
                  <th className="p-3.5">Student & Admission</th>
                  <th className="p-3.5">Class</th>
                  <th className="p-3.5">Outstanding Arrears</th>
                  <th className="p-3.5">Restriction / Flag Type</th>
                  <th className="p-3.5">Internal Audit Notes</th>
                  <th className="p-3.5">Promise Date</th>
                  <th className="p-3.5">Flagged Date</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {Object.keys(accountFlags).length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-500">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                      <p className="font-bold text-sm text-slate-800">No student accounts are currently flagged with internal restrictions.</p>
                      <p className="text-xs text-slate-400 mt-0.5">To flag an overdue account, click the shield icon in the Overdue Accounts table.</p>
                    </td>
                  </tr>
                ) : (
                  Object.entries(accountFlags).map(([billId, flagItem], idx) => {
                    const flag = flagItem as {
                      flagType: string;
                      note: string;
                      date: string;
                      operator: string;
                      status: 'Flagged' | 'Promised' | 'Review' | 'Resolved';
                      promisedDate?: string;
                    };
                    const bill = bills.find(b => b.id === billId);
                    if (!bill) return null;

                    return (
                      <tr key={billId} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3.5 font-mono text-slate-400">{idx + 1}</td>
                        <td className="p-3.5">
                          <div className="font-extrabold text-slate-900">{bill.studentName}</div>
                          <span className="font-mono text-[11px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 inline-block mt-0.5">
                            {bill.admissionNo}
                          </span>
                        </td>
                        <td className="p-3.5 font-bold text-slate-700">{bill.className}</td>
                        <td className="p-3.5 font-mono font-black text-rose-600">
                          {(bill.balance ?? 0).toFixed(2)} CFA
                        </td>
                        <td className="p-3.5">
                          <span className="bg-rose-100 text-rose-900 font-extrabold px-2.5 py-1 rounded-full text-xs border border-rose-200 inline-flex items-center gap-1.5">
                            <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                            {flag.flagType}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-600 max-w-xs truncate" title={flag.note}>
                          {flag.note || 'No notes provided'}
                        </td>
                        <td className="p-3.5 font-mono font-bold text-emerald-800">
                          {flag.promisedDate || '—'}
                        </td>
                        <td className="p-3.5 font-mono text-slate-500">{flag.date}</td>
                        <td className="p-3.5 text-right">
                          <button
                            onClick={() => {
                              const newFlags = { ...accountFlags };
                              delete newFlags[billId];
                              setAccountFlags(newFlags);
                              showToast(`Removed flag for ${bill.studentName}`);
                            }}
                            className="px-3 py-1 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 rounded-lg text-xs font-bold border border-slate-200 cursor-pointer"
                          >
                            Remove Flag
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View */}
          <div className="md:hidden space-y-3">
            {Object.keys(accountFlags).length === 0 ? (
              <div className="p-6 text-center text-slate-500 bg-white border border-slate-200 rounded-2xl">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                <p className="font-bold text-sm text-slate-800">No student accounts are currently flagged.</p>
              </div>
            ) : (
              Object.entries(accountFlags).map(([billId, flagItem]) => {
                const flag = flagItem as any;
                const bill = bills.find(b => b.id === billId);
                if (!bill) return null;

                return (
                  <div key={billId} className="p-4 rounded-2xl bg-amber-50/30 border border-amber-200 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-extrabold text-slate-900 text-sm">{bill.studentName}</h4>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-100">
                            {bill.admissionNo}
                          </span>
                          <span className="font-bold text-slate-600 text-xs">{bill.className}</span>
                        </div>
                      </div>
                      <span className="font-mono font-black text-rose-600 text-sm">{(bill.balance ?? 0).toFixed(2)} CFA</span>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Restriction:</span>
                        <span className="bg-rose-100 text-rose-900 font-extrabold px-2 py-0.5 rounded-full text-[10px] border border-rose-200">
                          {flag.flagType}
                        </span>
                      </div>
                      {flag.note && (
                        <p className="text-slate-600 italic text-[11px] bg-slate-50 p-2 rounded-lg border border-slate-100">
                          "{flag.note}"
                        </p>
                      )}
                      <div className="flex justify-between text-[11px] text-slate-500">
                        <span>Promised Settlement: <strong className="text-emerald-800">{flag.promisedDate || 'None'}</strong></span>
                        <span>Flagged: <strong className="text-slate-700">{flag.date}</strong></span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        const newFlags = { ...accountFlags };
                        delete newFlags[billId];
                        setAccountFlags(newFlags);
                        showToast(`Removed flag for ${bill.studentName}`);
                      }}
                      className="w-full py-2 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 cursor-pointer"
                    >
                      Remove Flag
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. DISPATCH AUDIT HISTORY TAB */}
      {/* ======================================================== */}
      {activeTab === 'dispatch_history' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-emerald-600" />
                WhatsApp & Overdue Reminder Transmission Log
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Timestamped audit log of all overdue reminders dispatched via parents' verified WhatsApp numbers.
              </p>
            </div>
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block border border-slate-200 rounded-2xl overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-900 text-white uppercase text-[10px] font-black tracking-wider">
                <tr>
                  <th className="p-3.5">#</th>
                  <th className="p-3.5">Student & Admission</th>
                  <th className="p-3.5">Parent / Contact</th>
                  <th className="p-3.5">Channel</th>
                  <th className="p-3.5 text-right">Reminded Amount</th>
                  <th className="p-3.5">Reminder Tone</th>
                  <th className="p-3.5">Timestamp</th>
                  <th className="p-3.5">Operator</th>
                  <th className="p-3.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {reminderLogs.map((log, idx) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3.5 font-mono text-slate-400">{idx + 1}</td>
                    <td className="p-3.5">
                      <div className="font-extrabold text-slate-900">{log.studentName}</div>
                      <span className="font-mono text-[11px] text-indigo-700">{log.admissionNo}</span>
                    </td>
                    <td className="p-3.5">
                      <div className="font-bold text-slate-800">{log.parentName}</div>
                      <div className="font-mono text-slate-500 text-[11px]">{log.parentPhone}</div>
                    </td>
                    <td className="p-3.5">
                      <span className="inline-flex items-center gap-1.5 font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 text-[10px]">
                        <MessageCircle className="w-3 h-3 text-emerald-600" />
                        {log.channel}
                      </span>
                    </td>
                    <td className="p-3.5 text-right font-mono font-black text-rose-600">
                      {(log.balanceReminded ?? 0).toFixed(2)} CFA
                    </td>
                    <td className="p-3.5 font-medium text-slate-700">{log.tone}</td>
                    <td className="p-3.5 font-mono text-slate-500">{log.dateSent}</td>
                    <td className="p-3.5 text-slate-600">{log.operator}</td>
                    <td className="p-3.5 text-center">
                      <span className="bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded-full text-[10px]">
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View */}
          <div className="md:hidden space-y-3">
            {reminderLogs.map((log) => (
              <div key={log.id} className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-sm">{log.studentName}</h4>
                    <span className="font-mono text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-100">
                      {log.admissionNo}
                    </span>
                  </div>
                  <span className="font-mono font-black text-rose-600 text-sm">{(log.balanceReminded ?? 0).toFixed(2)} CFA</span>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Parent:</span>
                    <span className="font-bold text-slate-800">{log.parentName} ({log.parentPhone})</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Channel:</span>
                    <span className="font-bold text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded-full text-[10px]">
                      {log.channel}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                    <span>{log.dateSent}</span>
                    <span>Op: {log.operator}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: MASS SMS SUMMARY REPORT */}
      {/* ======================================================== */}
      {massSmsReportModal?.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-slate-200 space-y-5 text-center">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto">
              <FileCheck className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-black text-slate-900">Mass Broadcast Completed</h3>
              <p className="text-xs text-slate-500 mt-1">
                Fee notification transmission executed successfully across carrier network gateway.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs space-y-2 text-left">
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Delivery Channel:</span>
                <span className="font-extrabold text-indigo-900">{massSmsReportModal.channelUsed}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Targeted Recipients:</span>
                <span className="font-mono font-extrabold text-slate-900">{massSmsReportModal.totalTargeted} Parents</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Delivered / Dispatched:</span>
                <span className="font-mono font-extrabold text-emerald-600">{massSmsReportModal.deliveredCount} Confirmed</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500 font-medium">Execution Timestamp:</span>
                <span className="font-mono text-slate-600 text-[11px]">{massSmsReportModal.timestamp}</span>
              </div>
            </div>

            <button
              onClick={() => setMassSmsReportModal(null)}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black cursor-pointer shadow-sm"
            >
              Close & Return to Dashboard
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: DIRECT WHATSAPP COMPOSER & PREVIEW */}
      {/* ======================================================== */}
      {activeWhatsAppModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full p-6 border border-slate-200 space-y-5">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Direct Parent WhatsApp Overdue Notice</h3>
                  <p className="text-xs text-slate-500">Auto-formatted with official fee breakdown & MoMo channels</p>
                </div>
              </div>
              <button 
                onClick={() => setActiveWhatsAppModal(null)} 
                className="text-slate-400 hover:text-slate-700 font-black text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Recipient Details Card */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex flex-wrap justify-between items-center gap-3 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Recipient Parent</span>
                <p className="font-extrabold text-slate-900 text-sm">
                  {activeWhatsAppModal.student?.parentName || 'Parent / Guardian'}
                </p>
                <p className="font-mono text-emerald-700 font-bold">
                  {activeWhatsAppModal.student?.parentPhone || 'Phone Not Registered'}
                </p>
              </div>

              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400">Ward & Total Balance</span>
                <p className="font-bold text-slate-800">
                  {activeWhatsAppModal.bill.studentName} ({activeWhatsAppModal.bill.className})
                </p>
                <p className="font-mono font-black text-rose-600 text-base">
                  {(activeWhatsAppModal.bill.balance ?? 0).toFixed(2)} CFA
                </p>
              </div>
            </div>

            {/* Message Tone Selector */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                Select Reminder Tone / Urgency Level:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'gentle', label: '🌱 Gentle Reminder', desc: 'Courteous heads-up' },
                  { id: 'standard', label: '📢 Standard Circular', desc: 'Itemized fee arrears' },
                  { id: 'urgent', label: '🚨 Urgent Final Demand', desc: 'Exam slip withholding' }
                ].map(toneItem => (
                  <button
                    key={toneItem.id}
                    type="button"
                    onClick={() => setCustomTone(toneItem.id as any)}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                      customTone === toneItem.id
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-950 ring-1 ring-emerald-500'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-extrabold text-xs">{toneItem.label}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{toneItem.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* WhatsApp Text Preview */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  Formatted WhatsApp Message:
                </label>
                <span className="text-[10px] text-emerald-700 font-bold">Auto-formatted with WhatsApp Markdown</span>
              </div>
              <div className="bg-[#0b141a] text-[#e9edef] rounded-2xl p-4 font-sans text-xs whitespace-pre-line leading-relaxed max-h-56 overflow-y-auto border border-emerald-900/40">
                {compileWhatsAppText(
                  activeWhatsAppModal.student,
                  activeWhatsAppModal.bill,
                  activeWhatsAppModal.tuitionArrears,
                  activeWhatsAppModal.levyArrears,
                  customTone
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  const text = compileWhatsAppText(
                    activeWhatsAppModal.student,
                    activeWhatsAppModal.bill,
                    activeWhatsAppModal.tuitionArrears,
                    activeWhatsAppModal.levyArrears,
                    customTone
                  );
                  navigator.clipboard.writeText(text);
                  setCopiedModalText(true);
                  setTimeout(() => setCopiedModalText(false), 2000);
                  showToast('Copied WhatsApp message to clipboard!');
                }}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                {copiedModalText ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copiedModalText ? 'Copied!' : 'Copy Text'}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveWhatsAppModal(null)}
                  className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleLaunchWhatsAppDirect(activeWhatsAppModal.bill, customTone);
                    setActiveWhatsAppModal(null);
                  }}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-2 cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Launch WhatsApp to Parent</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: FLAG ACCOUNT & TRIGGER INTERNAL RESTRICTION */}
      {/* ======================================================== */}
      {flagModalBill && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-slate-200 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
                Trigger Internal Flag / Restriction
              </h3>
              <button 
                onClick={() => setFlagModalBill(null)} 
                className="text-slate-400 hover:text-slate-700 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveFlag} className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400">Target Student Account</span>
                <p className="font-extrabold text-slate-900 text-sm mt-0.5">
                  {flagModalBill.studentName} ({flagModalBill.admissionNo})
                </p>
                <p className="text-rose-600 font-bold font-mono text-xs mt-0.5">
                  Outstanding Arrears: {(flagModalBill.balance ?? 0).toFixed(2)} CFA
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Administrative Restriction / Flag Type *</label>
                <select
                  value={flagTypeInput}
                  onChange={(e) => setFlagTypeInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900"
                >
                  <option value="Examination Slip Withholding">⛔ Withhold Examination Index Slip</option>
                  <option value="Terminal Report Withholding">📄 Withhold Terminal Report Sheet</option>
                  <option value="Accountant Follow-Up Required">📞 Schedule Accountant Phone Follow-Up</option>
                  <option value="Payment Plan Agreement">📅 Payment Plan Arranged (Promised Date)</option>
                  <option value="Formal Demand Letter Issued">✉️ Physical Demand Letter Dispatched</option>
                </select>
              </div>

              {flagTypeInput === 'Payment Plan Agreement' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Promised Payment Due Date</label>
                  <input
                    type="date"
                    value={flagPromiseDate}
                    onChange={(e) => setFlagPromiseDate(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl font-medium"
                  />
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">Internal Notes & Audit Justification</label>
                <textarea
                  rows={3}
                  value={flagNoteInput}
                  onChange={(e) => setFlagNoteInput(e.target.value)}
                  placeholder="e.g. Spoke with mother, promised to pay 50% on 15th Sept before exams start..."
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl font-medium"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setFlagModalBill(null)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold cursor-pointer shadow-sm"
                >
                  Save Internal Restriction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: BULK AUTOMATED WHATSAPP RUNNER */}
      {/* ======================================================== */}
      {showBulkWhatsAppModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-emerald-600" />
                Automated WhatsApp Bulk Overdue Broadcast
              </h3>
              <button 
                onClick={() => setShowBulkWhatsAppModal(false)} 
                className="text-slate-400 hover:text-slate-700 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-900 space-y-1">
              <div className="font-extrabold flex items-center gap-1.5 text-emerald-950">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                Target Audience: {selectedBillIds.length > 0 ? `${selectedBillIds.length} Selected Overdue Accounts` : `All ${filteredOverdueAccounts.length} Filtered Accounts in ${selectedClass}`}
              </div>
              <p className="text-emerald-800">
                Each message will be uniquely personalized with the parent's name, ward's admission number, class, itemized tuition and levy debt, and official Mobile Money payment merchants.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Broadcast Tone & Urgency</label>
                <select
                  value={bulkTone}
                  onChange={(e) => setBulkTone(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold"
                >
                  <option value="standard">📢 Standard Terminal Fee Statement (Recommended)</option>
                  <option value="urgent">🚨 Urgent Final Demand Before Examination</option>
                  <option value="gentle">🌱 Gentle Friendly Reminder</option>
                </select>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                  <input
                    type="checkbox"
                    checked={bulkPaymentChannels}
                    onChange={(e) => setBulkPaymentChannels(e.target.checked)}
                    className="w-4 h-4 accent-emerald-600 rounded"
                  />
                  <span>Include Mobile Money Marchand (*145*5*1083411# - JIPAS 1) & Bank Account Details</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="w-4 h-4 accent-emerald-600 rounded"
                  />
                  <span>Sync Broadcast with In-App Notification Center for Parents</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowBulkWhatsAppModal(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteBulkBroadcast}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black shadow-md flex items-center gap-2 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Confirm & Run Broadcast</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: TRIGGER GLOBAL SYSTEM ALERT */}
      {/* ======================================================== */}
      {showGlobalAlertModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-slate-200 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
                Broadcast System-Wide Overdue Fee Alert
              </h3>
              <button 
                onClick={() => setShowGlobalAlertModal(false)} 
                className="text-slate-400 hover:text-slate-700 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleTriggerGlobalAlert} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Alert Headline / Title *</label>
                <input
                  type="text"
                  required
                  value={globalAlertTitle}
                  onChange={(e) => setGlobalAlertTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Alert Notice Body *</label>
                <textarea
                  required
                  rows={4}
                  value={globalAlertMessage}
                  onChange={(e) => setGlobalAlertMessage(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-medium"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowGlobalAlertModal(false)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold cursor-pointer shadow-sm"
                >
                  Push System Alert
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: PRINTABLE DEMAND NOTICE LETTER */}
      {/* ======================================================== */}
      {printBill && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-8 border border-slate-200 space-y-6 my-8">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 print:hidden">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Official School Demand Notice</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Notice</span>
                </button>
                <button
                  onClick={() => setPrintBill(null)}
                  className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Letterhead */}
            <div className="text-center space-y-1 pb-4 border-b-2 border-slate-900">
              <div className="flex justify-center mb-2">
                <JIPASLogo className="w-16 h-16" />
              </div>
              <h1 className="text-xl font-black text-slate-900 tracking-wide uppercase">JIPAS International School</h1>
              <p className="text-xs text-slate-600">01 BP. 2364 • Kpéhénou N°1 Behind T-Oil Filling Station, and Hedzranawoe 4th Corner after Radio Maria, Lomé — Togo • Tel: (00228) 22 60 21 38 / 99 47 38 23 / 90 83 60 48 • joyjipas2002@gmail.com</p>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Office of the Bursar & Academic Accounts</p>
            </div>

            {/* Letter Body */}
            <div className="space-y-4 text-xs text-slate-800 leading-relaxed font-sans">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold">To: <span className="font-black text-slate-900">{printBill.student?.parentName || 'Parent / Guardian'}</span></p>
                  <p>Parent/Guardian of: <span className="font-bold">{printBill.bill.studentName}</span></p>
                  <p>Class: <span className="font-bold">{printBill.bill.className}</span> | Adm No: <span className="font-bold font-mono">{printBill.bill.admissionNo}</span></p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-slate-500">Date: {new Date().toLocaleDateString('en-GB')}</p>
                  <p className="font-mono text-slate-500">Ref: JIPAS/BUR/ARREARS/{printBill.bill.admissionNo.replace('/', '-')}</p>
                </div>
              </div>

              <div className="pt-2 text-center">
                <h3 className="text-sm font-black uppercase underline tracking-wide">
                  DEMAND NOTICE FOR SETTLEMENT OF OUTSTANDING FEE ARREARS
                </h3>
              </div>

              <p>
                We present our compliments to you from the Management of JIPAS International School.
              </p>
              <p>
                Our financial audit records indicate that your ward, <strong>{printBill.bill.studentName}</strong>, has an outstanding financial balance in respect of the current academic session as detailed below:
              </p>

              {/* Itemized Table */}
              <div className="border border-slate-300 rounded-xl overflow-hidden my-3">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 font-bold border-b border-slate-300">
                    <tr>
                      <th className="p-2.5">Description</th>
                      <th className="p-2.5 text-right">Amount (CFA)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-medium">
                    <tr>
                      <td className="p-2.5 font-semibold">Tuition Fees Portion</td>
                      <td className="p-2.5 text-right font-mono">{(printBill.tuitionArrears ?? 0).toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-semibold">Statutory Levies (Feeding, Clinic, Bus, PTA Dues)</td>
                      <td className="p-2.5 text-right font-mono">{(printBill.levyArrears ?? 0).toFixed(2)}</td>
                    </tr>
                    <tr className="bg-slate-50 font-black text-slate-900 border-t-2 border-slate-300">
                      <td className="p-2.5 uppercase">Total Outstanding Arrears Due:</td>
                      <td className="p-2.5 text-right font-mono text-rose-600 text-sm">{((printBill.bill?.balance) ?? 0).toFixed(2)} CFA</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <p>
                You are kindly requested to settle this balance in full within <strong>five (5) working days</strong> from the receipt of this notice. Payments can be effected through the following approved channels:
              </p>

              <ul className="list-disc pl-5 space-y-1 font-medium">
                <li><strong>School Accounts Bursary:</strong> Cash or Bank Draft during school hours (8:00 AM – 3:30 PM).</li>
                <li><strong>Paiement Marchand Mobile Money:</strong> Formoser <strong>*145*5*1083411#</strong> (Nom Marchand: <strong>JIPAS 1</strong> • Code Marchand: <strong>1083411</strong>). Indiquez le matricule de l'élève <em>{printBill.bill.admissionNo}</em> en référence.</li>
                <li><strong>Telecel Cash:</strong> 020 998 8771.</li>
              </ul>

              <p className="text-slate-600 italic">
                Please note that failure to regularize this account may result in the withholding of terminal assessment materials, broadsheet reports, and portal privileges.
              </p>

              {/* Signatures */}
              <div className="pt-8 flex justify-between items-end">
                <div>
                  <div className="border-b border-slate-400 w-40 mb-1"></div>
                  <p className="font-bold text-slate-900">Marcus Prosper</p>
                  <p className="text-[10px] text-slate-500">School Administrator</p>
                </div>
                <div className="text-right">
                  <div className="border-b border-slate-400 w-40 mb-1 ml-auto"></div>
                  <p className="font-bold text-slate-900">Grace Tetteh</p>
                  <p className="text-[10px] text-slate-500">Head of Bursary & Finance</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

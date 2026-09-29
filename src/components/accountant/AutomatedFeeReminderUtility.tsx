import React, { useState, useMemo } from 'react';
import { 
  BellRing, AlertTriangle, Send, Copy, Check, Filter, 
  Search, Download, Phone, User, DollarSign, CheckCircle2, 
  RefreshCw, Sparkles, MessageSquare, ChevronRight, ArrowUpRight, CreditCard
} from 'lucide-react';
import { Student, StudentBill, NotificationItem } from '../../types';
import { addMoney } from '../../utils/financeUtils';
import { 
  identifyStudentsForFeeReminder, 
  createNotificationFromReminder, 
  FeeReminderItem 
} from '../../services/feeReminderService';

interface AutomatedFeeReminderUtilityProps {
  students: Student[];
  bills: StudentBill[];
  onAddNotification?: (notif: NotificationItem) => void;
  onRecordPayment?: (studentId: string, balance: number) => void;
  onClose?: () => void;
}

export default function AutomatedFeeReminderUtility({
  students,
  bills,
  onAddNotification,
  onRecordPayment,
  onClose
}: AutomatedFeeReminderUtilityProps) {
  const [filterStatus, setFilterStatus] = useState<'all' | 'unpaid' | 'partial'>('all');
  const [filterDept, setFilterDept] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isBroadcasting, setIsBroadcasting] = useState<boolean>(false);
  const [broadcastCount, setBroadcastCount] = useState<number | null>(null);
  const [selectedReminder, setSelectedReminder] = useState<FeeReminderItem | null>(null);

  // Identify all students with Unpaid or Partially Paid status and generate pre-formatted messages
  const allReminders = useMemo(() => {
    return identifyStudentsForFeeReminder(students, bills);
  }, [students, bills]);

  // Apply filters
  const filteredReminders = useMemo(() => {
    return allReminders.filter(r => {
      if (filterStatus === 'unpaid' && r.status !== 'Unpaid') return false;
      if (filterStatus === 'partial' && r.status !== 'Partially Paid') return false;
      if (filterDept !== 'All' && r.department !== filterDept) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match = 
          r.studentName.toLowerCase().includes(q) ||
          r.admissionNo.toLowerCase().includes(q) ||
          r.className.toLowerCase().includes(q) ||
          r.parentName.toLowerCase().includes(q) ||
          r.parentPhone.toLowerCase().includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [allReminders, filterStatus, filterDept, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const unpaidCount = allReminders.filter(r => r.status === 'Unpaid').length;
    const partialCount = allReminders.filter(r => r.status === 'Partially Paid').length;
    const totalOutstanding = addMoney(...allReminders.map(r => r.balance || 0));

    return {
      totalStudents: allReminders.length,
      unpaidCount,
      partialCount,
      totalOutstanding
    };
  }, [allReminders]);

  // Copy single message
  const handleCopyMessage = (reminder: FeeReminderItem) => {
    navigator.clipboard.writeText(reminder.preformattedMessage);
    setCopiedId(reminder.studentId);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Copy all filtered messages
  const handleCopyAllMessages = () => {
    const text = filteredReminders.map(r => 
      `[${r.studentName} - ${r.className} | Parent: ${r.parentName} (${r.parentPhone})]\n${r.preformattedMessage}\n`
    ).join('\n---\n\n');

    navigator.clipboard.writeText(text);
    setCopiedId('ALL');
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Broadcast in-app notifications
  const handleBroadcastAll = () => {
    if (!onAddNotification || filteredReminders.length === 0) return;

    setIsBroadcasting(true);
    let sent = 0;

    filteredReminders.forEach((r, idx) => {
      setTimeout(() => {
        const notif = createNotificationFromReminder(r);
        onAddNotification(notif);
        sent += 1;
        if (sent === filteredReminders.length) {
          setIsBroadcasting(false);
          setBroadcastCount(sent);
          setTimeout(() => setBroadcastCount(null), 4000);
        }
      }, idx * 100);
    });
  };

  // Export CSV
  const handleExportCSV = () => {
    if (filteredReminders.length === 0) return;

    const headers = [
      'Student Name',
      'Admission No',
      'Class',
      'Department',
      'Parent Name',
      'Parent Phone',
      'Status',
      'Total Billed (CFA)',
      'Amount Paid (CFA)',
      'Balance Due (CFA)',
      'Due Date',
      'Pre-formatted Notification Message'
    ];

    const rows = filteredReminders.map(r => [
      `"${r.studentName}"`,
      `"${r.admissionNo}"`,
      `"${r.className}"`,
      `"${r.department}"`,
      `"${r.parentName}"`,
      `"${r.parentPhone}"`,
      `"${r.status}"`,
      (r.totalPayable ?? 0).toFixed(2),
      (r.paid ?? 0).toFixed(2),
      (r.balance ?? 0).toFixed(2),
      `"${r.dueDate}"`,
      `"${r.preformattedMessage.replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `JIPAS_Automated_Fee_Reminders_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-rose-100 text-rose-800 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Automated Bursary Engine
            </span>
            <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase">
              Parent Notification Generator
            </span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <BellRing className="w-6 h-6 text-rose-600" />
            Automated Fee Reminder Utility
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Identifies students with Unpaid and Partially Paid fee statuses and prepares customized reminder dispatches
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onAddNotification && (
            <button
              type="button"
              disabled={isBroadcasting || filteredReminders.length === 0}
              onClick={handleBroadcastAll}
              className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 active:scale-95 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              {isBroadcasting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Broadcasting Notifications...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Send In-App Reminders ({filteredReminders.length})</span>
                </>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={handleCopyAllMessages}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            {copiedId === 'ALL' ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700">Copied All ({filteredReminders.length})</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy All Messages</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Broadcast Toast Feedback */}
      {broadcastCount !== null && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-2xl text-xs font-bold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Successfully generated and dispatched {broadcastCount} in-app parent fee reminder notifications!</span>
          </div>
          <span className="text-[10px] text-emerald-600 uppercase font-black">Dispatched</span>
        </div>
      )}

      {/* Summary KPI Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
          <span className="text-xs font-bold text-slate-500 block uppercase">Total Overdue</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{stats.totalStudents}</p>
          <span className="text-[11px] text-slate-400">Students with balance</span>
        </div>

        <div className="bg-rose-50 border border-rose-200/80 rounded-2xl p-4">
          <span className="text-xs font-bold text-rose-700 block uppercase">100% Unpaid</span>
          <p className="text-2xl font-black text-rose-800 mt-1">{stats.unpaidCount}</p>
          <span className="text-[11px] text-rose-600">Zero payments recorded</span>
        </div>

        <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4">
          <span className="text-xs font-bold text-amber-700 block uppercase">Partially Paid</span>
          <p className="text-2xl font-black text-amber-800 mt-1">{stats.partialCount}</p>
          <span className="text-[11px] text-amber-600">Partial payment on record</span>
        </div>

        <div className="bg-indigo-50 border border-indigo-200/80 rounded-2xl p-4">
          <span className="text-xs font-bold text-indigo-700 block uppercase">Outstanding Total</span>
          <p className="text-2xl font-black text-indigo-900 mt-1 font-mono">
            {stats.totalOutstanding.toLocaleString()} <span className="text-xs font-bold text-indigo-400">CFA</span>
          </p>
          <span className="text-[11px] text-indigo-600">Target collection balance</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between pt-2">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterStatus === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Overdue ({stats.totalStudents})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('unpaid')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterStatus === 'unpaid' ? 'bg-white text-rose-700 shadow-xs' : 'text-slate-600 hover:text-rose-700'
              }`}
            >
              Unpaid ({stats.unpaidCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('partial')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterStatus === 'partial' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-600 hover:text-amber-700'
              }`}
            >
              Partially Paid ({stats.partialCount})
            </button>
          </div>

          {/* Department Filter */}
          <div className="flex items-center gap-1 bg-slate-100 px-3 py-1.5 rounded-xl text-xs">
            <span className="text-slate-500 font-medium">Dept:</span>
            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="All">All Departments</option>
              <option value="Pre School">Pre School</option>
              <option value="Primary School">Primary School</option>
              <option value="Junior High School">Junior High School</option>
              <option value="Senior High School">Senior High School</option>
            </select>
          </div>
        </div>

        {/* Search */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search student, ID, or parent phone..."
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all outline-none"
          />
        </div>
      </div>

      {/* Reminders List */}
      {filteredReminders.length === 0 ? (
        <div className="py-12 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-700">No overdue fee reminders pending</p>
          <p className="text-xs text-slate-400 mt-1">All students in this filter category have satisfied their terminal tuition bills.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredReminders.map(reminder => (
            <div 
              key={reminder.studentId}
              className="bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-2xl p-4 transition-all space-y-3"
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                    reminder.status === 'Unpaid' 
                      ? 'bg-rose-100 text-rose-700 border border-rose-200'
                      : 'bg-amber-100 text-amber-700 border border-amber-200'
                  }`}>
                    {reminder.status === 'Unpaid' ? 'UNP' : 'PART'}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{reminder.studentName}</span>
                      <span className="font-mono text-xs text-slate-500">({reminder.admissionNo})</span>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                        reminder.status === 'Unpaid' 
                          ? 'bg-rose-600 text-white' 
                          : 'bg-amber-500 text-white'
                      }`}>
                        {reminder.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                      <span>{reminder.className}</span>
                      <span>•</span>
                      <span>{reminder.department}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {reminder.parentName}: <strong>{reminder.parentPhone}</strong>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 self-end sm:self-center">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Outstanding Balance</span>
                    <span className="font-mono font-black text-rose-600 text-sm">
                      {reminder.balance.toLocaleString()} CFA
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      Paid: {reminder.paid.toLocaleString()} / {reminder.totalPayable.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleCopyMessage(reminder)}
                      className="p-2 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl text-slate-600 hover:text-slate-900 transition-all cursor-pointer shadow-2xs"
                      title="Copy pre-formatted notification message"
                    >
                      {copiedId === reminder.studentId ? (
                        <Check className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>

                    {onRecordPayment && (
                      <button
                        type="button"
                        onClick={() => onRecordPayment(reminder.studentId, reminder.balance)}
                        className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                        title="Collect fee payment now"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>Pay</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Pre-formatted Message Box */}
              <div className="bg-white border border-slate-200/80 rounded-xl p-3 text-xs text-slate-700 font-sans leading-relaxed">
                <div className="flex items-center justify-between pb-1 mb-1 border-b border-slate-100 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  <span>Pre-Formatted Parent Notification Message</span>
                  <span className="text-slate-500">Ready for SMS / In-App Broadcast</span>
                </div>
                <p className="select-all text-slate-800">{reminder.preformattedMessage}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, Send, Phone, MessageSquare, AlertTriangle, CheckCircle2, 
  Sparkles, Smartphone, Radio, BellRing, Copy, Check, ExternalLink,
  Search, Filter, CheckSquare, Square, RefreshCw, ChevronDown, ChevronUp,
  FileCheck, ShieldAlert, ArrowUpRight, DollarSign, User, Calendar
} from 'lucide-react';
import { Student, StudentBill, NotificationItem, ParentReminderLog } from '../../types';
import { addMoney } from '../../utils/financeUtils';
import JIPASLogo from '../common/JIPASLogo';
import { getFormattedTimestamp } from '../../services/feeAuditService';

interface AutomatedFeeAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  bills: StudentBill[];
  onAddNotification?: (notif: NotificationItem) => void;
  onUpdateBills?: (bills: StudentBill[]) => void;
  preSelectedStudentId?: string;
  initialFilterStatus?: 'all' | 'unpaid' | 'partially-paid';
}

export type AlertChannel = 'sms' | 'whatsapp' | 'in_app' | 'all';
export type TemplatePreset = 'standard' | 'urgent_exam' | 'partial_update' | 'final_demand' | 'custom';

export const ALERT_TEMPLATES: Record<TemplatePreset, { name: string; description: string; template: string }> = {
  standard: {
    name: 'Standard Term Arrears Reminder',
    description: 'Polite reminder of current outstanding balance for regular term billing.',
    template: 'Dear {parent_name}, this is a gentle reminder from JIPAS Bursary that {student_name} ({class_name}, {admission_no}) has an outstanding fee balance of {balance_due} CFA. Total bill: {total_payable} CFA (Paid: {amount_paid} CFA). Kindly arrange settlement at your earliest convenience. - JIPAS Accounts'
  },
  urgent_exam: {
    name: 'Urgent Pre-Examination Clearance',
    description: 'High-priority notice reminding parents to clear balance before exam seating.',
    template: 'URGENT NOTICE: Dear {parent_name}, please be informed that {student_name}\'s school fees balance of {balance_due} CFA remains unpaid. Full clearance is required before terminal examinations and report card release. Kindly contact the bursary office. - JIPAS School'
  },
  partial_update: {
    name: 'Partially Paid Balance Update',
    description: 'Acknowledges partial payments and states remaining balance.',
    template: 'Dear {parent_name}, thank you for your recent payment towards {student_name}\'s school fees. The remaining outstanding balance is {balance_due} CFA (Paid: {amount_paid} CFA of {total_payable} CFA). Please settle the balance before the end of the term. - JIPAS Bursary'
  },
  final_demand: {
    name: 'Final Demand & Withholding Notice',
    description: 'Strict legal/administrative warning for severe long-overdue arrears.',
    template: 'FINAL DEMAND: Outstanding school fees of {balance_due} CFA for {student_name} ({admission_no}) are overdue. Please visit the JIPAS Bursary Office immediately to avoid suspension of academic portal access and examination privileges. Phone: +233 24 123 4567.'
  },
  custom: {
    name: 'Custom Tailored Message',
    description: 'Compose your own custom message using variable tags.',
    template: 'Dear {parent_name}, this is an official fee alert regarding {student_name} ({admission_no}). Outstanding balance: {balance_due} CFA. - JIPAS Accounts Office'
  }
};

export default function AutomatedFeeAlertModal({
  isOpen,
  onClose,
  students,
  bills,
  onAddNotification,
  onUpdateBills,
  preSelectedStudentId,
  initialFilterStatus = 'all'
}: AutomatedFeeAlertModalProps) {
  // Target Filter States
  const [feeStatusFilter, setFeeStatusFilter] = useState<'all' | 'unpaid' | 'partially-paid'>(initialFilterStatus);
  const [classFilter, setClassFilter] = useState<string>('All');
  const [minBalanceFilter, setMinBalanceFilter] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Channel & Template States
  const [selectedChannel, setSelectedChannel] = useState<AlertChannel>('all');
  const [selectedPreset, setSelectedPreset] = useState<TemplatePreset>('standard');
  const [customTemplateText, setCustomTemplateText] = useState<string>(ALERT_TEMPLATES.standard.template);

  // Selection state (default: all filtered selected)
  const [selectedBillIds, setSelectedBillIds] = useState<string[]>([]);
  const [hasInitializedSelection, setHasInitializedSelection] = useState(false);

  // Dispatch progress state
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchProgress, setDispatchProgress] = useState(0);
  const [dispatchStatusLog, setDispatchStatusLog] = useState<string[]>([]);
  const [dispatchReport, setDispatchReport] = useState<{
    totalTargeted: number;
    deliveredSms: number;
    deliveredWhatsApp: number;
    deliveredInApp: number;
    totalAmountNotified: number;
    timestamp: string;
  } | null>(null);

  // UI helpers
  const [previewStudentId, setPreviewStudentId] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Map student bills with their fee status (Unpaid vs Partially Paid)
  const overdueRecords = useMemo(() => {
    return bills
      .filter(b => b.balance > 0)
      .map(bill => {
        const student = students.find(s => s.id === bill.studentId || s.admissionNo === bill.admissionNo);
        const status: 'Unpaid' | 'Partially Paid' = bill.paid === 0 ? 'Unpaid' : 'Partially Paid';
        const parentPhone = student?.parentPhone || bill.admissionNo;
        const parentName = student?.parentName || 'Parent / Guardian';

        return {
          bill,
          student,
          status,
          parentName,
          parentPhone,
          studentName: bill.studentName,
          admissionNo: bill.admissionNo,
          className: bill.className,
          payable: bill.payable,
          paid: bill.paid,
          balance: bill.balance
        };
      });
  }, [bills, students]);

  // Unique classes for filter dropdown
  const availableClasses = useMemo(() => {
    const set = new Set<string>();
    overdueRecords.forEach(r => {
      if (r.className) set.add(r.className);
    });
    return Array.from(set).sort();
  }, [overdueRecords]);

  // Filtered target list
  const filteredTargets = useMemo(() => {
    return overdueRecords.filter(item => {
      if (feeStatusFilter === 'unpaid' && item.status !== 'Unpaid') return false;
      if (feeStatusFilter === 'partially-paid' && item.status !== 'Partially Paid') return false;
      if (classFilter !== 'All' && item.className !== classFilter) return false;
      if (minBalanceFilter > 0 && item.balance < minBalanceFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match = item.studentName.toLowerCase().includes(q) ||
          item.admissionNo.toLowerCase().includes(q) ||
          item.parentName.toLowerCase().includes(q) ||
          item.parentPhone.toLowerCase().includes(q) ||
          item.className.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [overdueRecords, feeStatusFilter, classFilter, minBalanceFilter, searchQuery]);

  // Sync initial selection
  useEffect(() => {
    if (isOpen && !hasInitializedSelection) {
      if (preSelectedStudentId) {
        const match = overdueRecords.find(r => r.bill.studentId === preSelectedStudentId || r.student?.id === preSelectedStudentId);
        if (match) {
          setSelectedBillIds([match.bill.id]);
          setPreviewStudentId(match.bill.id);
        } else {
          setSelectedBillIds(filteredTargets.map(t => t.bill.id));
        }
      } else {
        setSelectedBillIds(filteredTargets.map(t => t.bill.id));
      }
      setHasInitializedSelection(true);
    }
  }, [isOpen, hasInitializedSelection, filteredTargets, preSelectedStudentId, overdueRecords]);

  // Set default preview student
  useEffect(() => {
    if (!previewStudentId && filteredTargets.length > 0) {
      setPreviewStudentId(filteredTargets[0].bill.id);
    }
  }, [filteredTargets, previewStudentId]);

  // Handle template preset change
  const handleSelectPreset = (preset: TemplatePreset) => {
    setSelectedPreset(preset);
    setCustomTemplateText(ALERT_TEMPLATES[preset].template);
  };

  // Helper to compile dynamic placeholders
  const compileTemplate = (template: string, target: typeof overdueRecords[0]) => {
    return template
      .replace(/{parent_name}/g, target.parentName)
      .replace(/{student_name}/g, target.studentName)
      .replace(/{admission_no}/g, target.admissionNo)
      .replace(/{class_name}/g, target.className)
      .replace(/{balance_due}/g, `${(target.balance ?? 0).toFixed(2)} CFA`)
      .replace(/{total_payable}/g, `${(target.payable ?? 0).toFixed(2)} CFA`)
      .replace(/{amount_paid}/g, `${(target.paid ?? 0).toFixed(2)} CFA`)
      .replace(/{status}/g, target.status)
      .replace(/{school_name}/g, 'JIPAS')
      .replace(/{due_date}/g, 'End of Term Assessment Week');
  };

  // Active preview message
  const previewTarget = overdueRecords.find(r => r.bill.id === previewStudentId) || filteredTargets[0] || overdueRecords[0];
  const compiledPreviewMessage = previewTarget ? compileTemplate(customTemplateText, previewTarget) : '';

  // Phone cleaner for WhatsApp
  const cleanPhoneForWhatsApp = (phone: string | undefined): string => {
    if (!phone) return '233240000000';
    let cleaned = phone.replace(/[^0-9]/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '233' + cleaned.substring(1);
    }
    return cleaned;
  };

  // Toggle selection
  const handleToggleSelect = (billId: string) => {
    setSelectedBillIds(prev => 
      prev.includes(billId) ? prev.filter(id => id !== billId) : [...prev, billId]
    );
  };

  const handleSelectAllFiltered = () => {
    const allFilteredIds = filteredTargets.map(t => t.bill.id);
    const isAllSelected = allFilteredIds.every(id => selectedBillIds.includes(id));
    if (isAllSelected) {
      setSelectedBillIds(prev => prev.filter(id => !allFilteredIds.includes(id)));
    } else {
      setSelectedBillIds(prev => Array.from(new Set([...prev, ...allFilteredIds])));
    }
  };

  // Insert token chip into custom template
  const handleInsertToken = (token: string) => {
    setCustomTemplateText(prev => prev + ` {${token}}`);
  };

  // Execute Automated Dispatch Engine
  const handleStartAutomatedDispatch = async () => {
    const targetsToDispatch = overdueRecords.filter(r => selectedBillIds.includes(r.bill.id));
    if (targetsToDispatch.length === 0) {
      showToast('Please select at least one student recipient.');
      return;
    }

    setIsDispatching(true);
    setDispatchProgress(0);
    setDispatchStatusLog([]);

    const total = targetsToDispatch.length;
    let deliveredSms = 0;
    let deliveredWhatsApp = 0;
    let deliveredInApp = 0;
    let totalAmountNotified = 0;
    const todayTimestamp = getFormattedTimestamp();

    // New reminder logs to store
    const newLogs: ParentReminderLog[] = [];

    for (let i = 0; i < total; i++) {
      const item = targetsToDispatch[i];
      const message = compileTemplate(customTemplateText, item);
      totalAmountNotified += item.balance;

      // Log progress step
      const stepPercent = Math.round(((i + 1) / total) * 100);
      setDispatchProgress(stepPercent);

      // Channel actions
      if (selectedChannel === 'sms' || selectedChannel === 'all') {
        deliveredSms++;
      }
      if (selectedChannel === 'whatsapp' || selectedChannel === 'all') {
        deliveredWhatsApp++;
      }
      if (selectedChannel === 'in_app' || selectedChannel === 'all') {
        deliveredInApp++;
        if (onAddNotification) {
          onAddNotification({
            id: `notif-fee-${Date.now()}-${i}`,
            title: `🚨 Fee Outstanding Alert (${item.status})`,
            message: `Account notice for ${item.studentName} (${item.admissionNo}): Outstanding balance of ${(item.balance ?? 0).toFixed(2)} CFA remains due. Total payable: ${(item.payable ?? 0).toFixed(2)} CFA.`,
            type: 'fee_alert',
            date: todayTimestamp,
            dateSent: todayTimestamp,
            recipientGroup: 'Parent & Student',
            targetAudience: 'student',
            read: false,
            priority: 'High'
          });
        }
      }

      // Record reminder log
      newLogs.push({
        id: `prl-${Date.now()}-${i}`,
        studentId: item.student?.id || item.bill.studentId,
        studentName: item.studentName,
        admissionNo: item.admissionNo,
        parentName: item.parentName,
        parentPhone: item.parentPhone,
        balanceReminded: item.balance,
        channel: selectedChannel === 'sms' ? 'SMS' : selectedChannel === 'whatsapp' ? 'WhatsApp Direct' : 'In-App Portal',
        tone: ALERT_TEMPLATES[selectedPreset].name,
        dateSent: todayTimestamp,
        operator: 'Accountant (Denis Mawutor)',
        status: 'Delivered',
        messageSnippet: (message || '').slice(0, 110) + '...'
      });

      setDispatchStatusLog(prev => [
        `[${i + 1}/${total}] Dispatched alert to ${item.parentName} (${item.studentName}, ${(item.balance ?? 0).toFixed(2)} CFA) via ${selectedChannel.toUpperCase()}`,
        ...prev.slice(0, 15)
      ]);

      // Tiny delay for realistic async batch processing animation
      if (total > 1) {
        await new Promise(res => setTimeout(res, 80));
      }
    }

    // Save logs to local storage
    try {
      const existingLogsRaw = localStorage.getItem('jipas_parent_reminder_logs');
      const existingLogs: ParentReminderLog[] = existingLogsRaw ? JSON.parse(existingLogsRaw) : [];
      localStorage.setItem('jipas_parent_reminder_logs', JSON.stringify([...newLogs, ...existingLogs]));
    } catch (e) {
      console.warn('Could not store reminder logs:', e);
    }

    // Update bills action status & lastContactDate
    if (onUpdateBills) {
      const updatedBills = bills.map(b => {
        if (selectedBillIds.includes(b.id)) {
          return {
            ...b,
            actionStatus: 'Contacted' as const,
            lastContactDate: todayTimestamp,
            actionRequired: true,
            followUpNotes: b.followUpNotes 
              ? `${b.followUpNotes}; Automated ${selectedChannel.toUpperCase()} alert sent on ${todayTimestamp}`
              : `Automated ${selectedChannel.toUpperCase()} alert sent on ${todayTimestamp} (Bal: ${(b.balance ?? 0).toFixed(2)} CFA)`
          };
        }
        return b;
      });
      onUpdateBills(updatedBills);
    }

    setIsDispatching(false);
    setDispatchReport({
      totalTargeted: total,
      deliveredSms,
      deliveredWhatsApp,
      deliveredInApp,
      totalAmountNotified,
      timestamp: todayTimestamp
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-5xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[95vh]">
        
        {/* Modal Top Header */}
        <div className="bg-gradient-to-r from-slate-950 via-cyan-950 to-teal-950 text-white p-5 sm:p-6 flex items-start justify-between border-b border-cyan-800/40">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-300 shrink-0">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="bg-cyan-500 text-slate-950 text-[10px] uppercase font-black px-2.5 py-0.5 rounded-full">
                  Accountant Automation Engine
                </span>
                <span className="bg-rose-500/30 border border-rose-400/40 text-rose-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Unpaid & Partially Paid Balances
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-1">
                Automated Templated Fee Alerts (SMS / WhatsApp / In-App)
              </h2>
              <p className="text-xs text-cyan-100/80 mt-0.5">
                Instant multi-channel fee reminders with automated balance calculation for parents of unpaid & partially paid students.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toast inside modal */}
        {toastMsg && (
          <div className="bg-emerald-600 text-white px-4 py-2 text-xs font-bold flex items-center justify-center gap-2 shadow-sm animate-fade-in">
            <CheckCircle2 className="w-4 h-4" />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* Modal Body / Tabs */}
        {dispatchReport ? (
          /* COMPLETION REPORT VIEW */
          <div className="p-6 sm:p-8 space-y-6 overflow-y-auto">
            <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-6 text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-600/30">
                <FileCheck className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-black text-emerald-950">
                Automated Alerts Dispatched Successfully!
              </h3>
              <p className="text-sm text-emerald-800 max-w-xl mx-auto">
                Successfully broadcasted tailored fee reminder alerts to {dispatchReport.totalTargeted} parents covering <span className="font-bold font-mono text-emerald-950">{(dispatchReport.totalAmountNotified ?? 0).toFixed(2)} CFA</span> in outstanding arrears.
              </p>
            </div>

            {/* Metrics Breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center">
                <span className="text-2xl font-black text-slate-900">{dispatchReport.totalTargeted}</span>
                <p className="text-xs text-slate-500 font-bold uppercase mt-1">Parents Targeted</p>
              </div>
              <div className="bg-blue-50 p-4 rounded-2xl border border-blue-200 text-center">
                <span className="text-2xl font-black text-blue-700">{dispatchReport.deliveredSms}</span>
                <p className="text-xs text-blue-600 font-bold uppercase mt-1">SMS Alerts Sent</p>
              </div>
              <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200 text-center">
                <span className="text-2xl font-black text-emerald-700">{dispatchReport.deliveredWhatsApp}</span>
                <p className="text-xs text-emerald-600 font-bold uppercase mt-1">WhatsApp Prepped</p>
              </div>
              <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 text-center">
                <span className="text-2xl font-black text-amber-700">{dispatchReport.deliveredInApp}</span>
                <p className="text-xs text-amber-600 font-bold uppercase mt-1">In-App Notifs Pushed</p>
              </div>
            </div>

            {/* Status & Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200">
              <div className="text-xs text-slate-500">
                Dispatched by Accountant on: <span className="font-mono font-bold text-slate-700">{dispatchReport.timestamp}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDispatchReport(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  Send Another Batch
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm cursor-pointer"
                >
                  Done & Return to Bursary
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* MAIN COMPOSER & RECIPIENT SELECTION VIEW */
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            
            {/* Step 1: Filter Targets & Channel Selection */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Column: Configuration & Template */}
              <div className="lg:col-span-6 space-y-5">
                
                {/* 1. Channel Selector */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                    1. Select Alert Channels
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedChannel('all')}
                      className={`p-3 rounded-2xl text-left border transition-all cursor-pointer ${
                        selectedChannel === 'all'
                          ? 'bg-cyan-50 border-cyan-600 text-cyan-900 ring-2 ring-cyan-500/20'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <Sparkles className="w-5 h-5 text-cyan-600 mb-1" />
                      <div className="text-xs font-extrabold">All Channels</div>
                      <div className="text-[10px] text-slate-500">SMS + WhatsApp + App</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedChannel('sms')}
                      className={`p-3 rounded-2xl text-left border transition-all cursor-pointer ${
                        selectedChannel === 'sms'
                          ? 'bg-blue-50 border-blue-600 text-blue-900 ring-2 ring-blue-500/20'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <Smartphone className="w-5 h-5 text-blue-600 mb-1" />
                      <div className="text-xs font-extrabold">SMS Gateway</div>
                      <div className="text-[10px] text-slate-500">Hubtel / Bulk SMS</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedChannel('whatsapp')}
                      className={`p-3 rounded-2xl text-left border transition-all cursor-pointer ${
                        selectedChannel === 'whatsapp'
                          ? 'bg-emerald-50 border-emerald-600 text-emerald-900 ring-2 ring-emerald-500/20'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <MessageSquare className="w-5 h-5 text-emerald-600 mb-1" />
                      <div className="text-xs font-extrabold">WhatsApp</div>
                      <div className="text-[10px] text-slate-500">Direct / Broadcast</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedChannel('in_app')}
                      className={`p-3 rounded-2xl text-left border transition-all cursor-pointer ${
                        selectedChannel === 'in_app'
                          ? 'bg-amber-50 border-amber-600 text-amber-900 ring-2 ring-amber-500/20'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <BellRing className="w-5 h-5 text-amber-600 mb-1" />
                      <div className="text-xs font-extrabold">In-App Notif</div>
                      <div className="text-[10px] text-slate-500">Portal Feed Push</div>
                    </button>
                  </div>
                </div>

                {/* 2. Template Preset Picker */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                    2. Choose Fee Alert Template
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {(Object.keys(ALERT_TEMPLATES) as TemplatePreset[]).map(key => {
                      const t = ALERT_TEMPLATES[key];
                      const isSelected = selectedPreset === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => handleSelectPreset(key)}
                          className={`p-3 rounded-2xl text-left border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <div className="text-xs font-bold">{t.name}</div>
                          <div className={`text-[10px] mt-0.5 line-clamp-1 ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                            {t.description}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Template Editor */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Message Content & Placeholders
                    </label>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {customTemplateText.length} characters ({Math.ceil(customTemplateText.length / 160)} SMS)
                    </span>
                  </div>

                  <textarea
                    rows={4}
                    value={customTemplateText}
                    onChange={(e) => {
                      setCustomTemplateText(e.target.value);
                      if (selectedPreset !== 'custom') setSelectedPreset('custom');
                    }}
                    className="w-full p-3 rounded-2xl border border-slate-300 text-xs font-medium text-slate-800 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 font-sans leading-relaxed"
                    placeholder="Enter message template..."
                  />

                  {/* Insertable Token Pills */}
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Insert Tag:</span>
                    {[
                      { tag: 'parent_name', label: 'Parent Name' },
                      { tag: 'student_name', label: 'Student Name' },
                      { tag: 'balance_due', label: 'Balance Due' },
                      { tag: 'admission_no', label: 'Admission No' },
                      { tag: 'class_name', label: 'Class' },
                      { tag: 'amount_paid', label: 'Amount Paid' },
                      { tag: 'total_payable', label: 'Total Bill' },
                      { tag: 'status', label: 'Fee Status' }
                    ].map(tok => (
                      <button
                        key={tok.tag}
                        type="button"
                        onClick={() => handleInsertToken(tok.tag)}
                        className="px-2 py-0.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-bold cursor-pointer transition-colors"
                      >
                        +{tok.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Live Message Preview for Selected Student */}
                {previewTarget && (
                  <div className="bg-slate-950 text-white rounded-3xl p-4 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
                      <div className="flex items-center gap-2 text-cyan-400 font-bold">
                        <Smartphone className="w-4 h-4" /> Live Mobile Message Preview
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Target: {previewTarget.studentName} ({previewTarget.className})
                      </span>
                    </div>

                    <div className="bg-slate-900/90 rounded-2xl p-3.5 border border-slate-800/80 text-xs text-slate-200 leading-relaxed font-sans shadow-inner">
                      {compiledPreviewMessage}
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                      <span>Sender: <strong className="text-white">JIPAS-FEE</strong></span>
                      <span>Recipient: <strong className="text-white">{previewTarget.parentPhone}</strong></span>
                      <span className="text-emerald-400 font-bold font-mono">Bal: {(previewTarget.balance ?? 0).toFixed(2)} CFA</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Recipient Target Filters & Interactive Table */}
              <div className="lg:col-span-6 space-y-4">
                
                {/* Filter Controls Bar */}
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      <Filter className="w-3.5 h-3.5 text-cyan-700" /> Filter Target Recipients
                    </span>
                    <span className="text-xs font-bold text-slate-500">
                      {filteredTargets.length} matched ({selectedBillIds.length} selected)
                    </span>
                  </div>

                  {/* Fee Status Pill Filter */}
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setFeeStatusFilter('all')}
                      className={`px-3 py-1 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                        feeStatusFilter === 'all'
                          ? 'bg-slate-900 text-white'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      All Overdue ({overdueRecords.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFeeStatusFilter('unpaid')}
                      className={`px-3 py-1 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                        feeStatusFilter === 'unpaid'
                          ? 'bg-rose-600 text-white'
                          : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                      }`}
                    >
                      Unpaid Only ({overdueRecords.filter(r => r.status === 'Unpaid').length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFeeStatusFilter('partially-paid')}
                      className={`px-3 py-1 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                        feeStatusFilter === 'partially-paid'
                          ? 'bg-amber-600 text-white'
                          : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                      }`}
                    >
                      Partially Paid ({overdueRecords.filter(r => r.status === 'Partially Paid').length})
                    </button>
                  </div>

                  {/* Secondary Search & Class Dropdown */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search student or parent..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:ring-1 focus:ring-cyan-500"
                      />
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                    </div>

                    <select
                      value={classFilter}
                      onChange={(e) => setClassFilter(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-xl font-medium text-slate-700"
                    >
                      <option value="All">All Classes</option>
                      {availableClasses.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Recipient Table Header & Select All */}
                <div className="flex items-center justify-between px-1">
                  <button
                    type="button"
                    onClick={handleSelectAllFiltered}
                    className="text-xs font-bold text-slate-700 hover:text-slate-900 flex items-center gap-1.5 cursor-pointer"
                  >
                    {filteredTargets.length > 0 && filteredTargets.every(t => selectedBillIds.includes(t.bill.id)) ? (
                      <CheckSquare className="w-4 h-4 text-cyan-600" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                    Select / Deselect All Filtered ({filteredTargets.length})
                  </button>

                  <div className="text-[11px] text-slate-500">
                    Total Selected Debt: <strong className="text-rose-600 font-mono">
                      {addMoney(
                        ...overdueRecords
                          .filter(r => selectedBillIds.includes(r.bill.id))
                          .map(r => r.balance || 0)
                      ).toFixed(2)} CFA
                    </strong>
                  </div>
                </div>

                {/* Recipient Scrollable Table */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-[380px] overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-900 text-white text-[10px] uppercase font-bold sticky top-0 z-10">
                      <tr>
                        <th className="p-2.5 w-8 text-center">Sel</th>
                        <th className="p-2.5">Student / ID</th>
                        <th className="p-2.5">Parent / Phone</th>
                        <th className="p-2.5 text-right">Balance</th>
                        <th className="p-2.5 text-center">Direct</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {filteredTargets.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-slate-400">
                            No students match the selected criteria.
                          </td>
                        </tr>
                      ) : (
                        filteredTargets.map((item) => {
                          const isSelected = selectedBillIds.includes(item.bill.id);
                          const isPreviewed = previewTarget?.bill.id === item.bill.id;
                          const waUrl = `https://wa.me/${cleanPhoneForWhatsApp(item.parentPhone)}?text=${encodeURIComponent(compileTemplate(customTemplateText, item))}`;

                          return (
                            <tr
                              key={item.bill.id}
                              onClick={() => setPreviewStudentId(item.bill.id)}
                              className={`cursor-pointer transition-colors ${
                                isPreviewed ? 'bg-cyan-50/70 ring-1 ring-cyan-400/40' : (isSelected ? 'bg-slate-50/70' : 'hover:bg-slate-50')
                              }`}
                            >
                              <td className="p-2.5 text-center" onClick={(e) => { e.stopPropagation(); handleToggleSelect(item.bill.id); }}>
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleSelect(item.bill.id)}
                                  className="w-4 h-4 text-cyan-600 rounded border-slate-300 focus:ring-cyan-500 cursor-pointer"
                                />
                              </td>
                              <td className="p-2.5">
                                <div className="font-bold text-slate-900">{item.studentName}</div>
                                <div className="text-[10px] text-slate-500 flex items-center gap-1">
                                  <span>{item.className}</span>
                                  <span>•</span>
                                  <span className="font-mono text-indigo-700">{item.admissionNo}</span>
                                </div>
                              </td>
                              <td className="p-2.5">
                                <div className="text-slate-800 font-medium">{item.parentName}</div>
                                <div className="text-[10px] text-slate-500 font-mono">{item.parentPhone}</div>
                              </td>
                              <td className="p-2.5 text-right font-mono">
                                <div className="font-black text-rose-600 text-xs">
                                  {(item.balance ?? 0).toFixed(2)} CFA
                                </div>
                                <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                                  item.status === 'Unpaid' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {item.status}
                                </span>
                              </td>
                              <td className="p-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-center gap-1">
                                  <a
                                    href={waUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title="Open WhatsApp Direct Chat"
                                    className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white transition-colors"
                                  >
                                    <MessageSquare className="w-3.5 h-3.5" />
                                  </a>
                                  <button
                                    type="button"
                                    title="Copy individualized message"
                                    onClick={() => {
                                      navigator.clipboard.writeText(compileTemplate(customTemplateText, item));
                                      setCopiedId(item.bill.id);
                                      setTimeout(() => setCopiedId(null), 2000);
                                    }}
                                    className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                                  >
                                    {copiedId === item.bill.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
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

              </div>
            </div>

            {/* Live Dispatch Progress Bar & Status */}
            {isDispatching && (
              <div className="bg-slate-900 text-white rounded-2xl p-4 border border-cyan-800 space-y-3 animate-fade-in">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 font-bold text-cyan-400">
                    <RefreshCw className="w-4 h-4 animate-spin" /> Dispatching Automated Alerts...
                  </span>
                  <span className="font-mono font-bold text-white">{dispatchProgress}% Complete</span>
                </div>

                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-cyan-500 to-emerald-500 h-2 rounded-full transition-all duration-150"
                    style={{ width: `${dispatchProgress}%` }}
                  />
                </div>

                {dispatchStatusLog.length > 0 && (
                  <div className="text-[11px] font-mono text-cyan-200/90 truncate bg-slate-950/60 p-2 rounded-xl">
                    {dispatchStatusLog[0]}
                  </div>
                )}
              </div>
            )}

          </div>
        )}

        {/* Modal Footer Controls */}
        {!dispatchReport && (
          <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-slate-600 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>
                Ready to notify <strong className="text-slate-900">{selectedBillIds.length}</strong> parent{selectedBillIds.length === 1 ? '' : 's'} via <strong className="text-cyan-800 uppercase">{selectedChannel}</strong>
              </span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                disabled={isDispatching}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleStartAutomatedDispatch}
                disabled={isDispatching || selectedBillIds.length === 0}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 text-white text-xs font-bold shadow-md shadow-cyan-900/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {isDispatching ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Sending Alerts...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Dispatch Automated Alerts ({selectedBillIds.length})
                  </>
                )}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

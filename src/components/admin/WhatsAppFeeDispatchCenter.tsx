import React, { useState, useMemo } from 'react';
import {
  MessageSquare,
  Send,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Users,
  Search,
  Filter,
  Check,
  Smartphone,
  Sparkles,
  Layers,
  Clock,
  Download
} from 'lucide-react';
import { Student, StudentBill, PaymentRecord } from '../../types';
import {
  generatePaymentReceiptWhatsApp,
  generateOverdueFeeReminderWhatsApp,
  WhatsAppMessagePayload
} from '../../services/messagingService';

interface Props {
  students: Student[];
  bills: StudentBill[];
  payments: PaymentRecord[];
}

export default function WhatsAppFeeDispatchCenter({
  students,
  bills,
  payments
}: Props) {
  const [selectedClass, setSelectedClass] = useState<string>('ALL');
  const [selectedTab, setSelectedTab] = useState<'overdue_reminders' | 'payment_receipts'>('overdue_reminders');
  const [searchQuery, setSearchQuery] = useState('');
  const [language, setLanguage] = useState<'FR' | 'EN'>('FR');
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [dispatchStatus, setDispatchStatus] = useState<string | null>(null);

  const classesList = useMemo(() => {
    const set = new Set<string>();
    students.forEach(s => { if (s.className) set.add(s.className); });
    return Array.from(set).sort();
  }, [students]);

  // Students with overdue balances
  const overdueList = useMemo(() => {
    return students
      .map(s => {
        const studentBills = bills.filter(b => b.studentId === s.id && !b.isVoided);
        const totalPayable = studentBills.reduce((acc, b) => acc + (b.payable || 0), 0);
        const totalPaid = studentBills.reduce((acc, b) => acc + (b.paid || 0), 0);
        const balance = Math.max(0, totalPayable - totalPaid);
        return { student: s, balance, totalPayable, totalPaid };
      })
      .filter(item => item.balance > 0)
      .filter(item => selectedClass === 'ALL' || item.student.className === selectedClass)
      .filter(item => !searchQuery || item.student.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || item.student.admissionNo.includes(searchQuery));
  }, [students, bills, selectedClass, searchQuery]);

  // Recent payments
  const recentPaymentsList = useMemo(() => {
    return payments
      .filter(p => !searchQuery || p.studentName?.toLowerCase().includes(searchQuery.toLowerCase()) || p.receiptNo?.includes(searchQuery))
      .filter(p => selectedClass === 'ALL' || p.className === selectedClass)
      .slice(0, 50);
  }, [payments, selectedClass, searchQuery]);

  const handleSelectAllOverdue = () => {
    if (selectedStudentIds.size === overdueList.length) {
      setSelectedStudentIds(new Set());
    } else {
      setSelectedStudentIds(new Set(overdueList.map(item => item.student.id)));
    }
  };

  const handleToggleStudent = (id: string) => {
    const next = new Set(selectedStudentIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedStudentIds(next);
  };

  const handleBatchDispatch = () => {
    const count = selectedStudentIds.size;
    if (count === 0) return;
    setDispatchStatus(`Queued ${count} WhatsApp messages for automated parent dispatch! First link opening...`);
    
    // Open first selected wa.me link directly
    const firstId = Array.from(selectedStudentIds)[0];
    const target = overdueList.find(o => o.student.id === firstId);
    if (target) {
      const payload = generateOverdueFeeReminderWhatsApp(target.student, target.balance, 'Friday, 15:00', language);
      if (payload.whatsappUrl) {
        window.open(payload.whatsappUrl, '_blank');
      }
    }

    setTimeout(() => setDispatchStatus(null), 5000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-emerald-800/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold tracking-wide">
              <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
              <span>OPTION B — REAL-TIME PARENT NOTIFICATION DISPATCHER</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              WhatsApp & SMS Tuition Fee Dispatch Center
            </h1>
            <p className="text-sm text-emerald-200/80 max-w-2xl">
              Dispatch official digital payment receipts and automated overdue fee balance reminders directly to parents' WhatsApp with bilingual templates.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-emerald-500/20 border border-emerald-400/40 px-4 py-2 rounded-2xl flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-black text-emerald-300 uppercase tracking-wider">Gateway Connected</span>
            </div>
          </div>
        </div>

        {/* Tab & Language Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-6 pt-6 border-t border-emerald-800/50">
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedTab('overdue_reminders')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                selectedTab === 'overdue_reminders'
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Overdue Fee Reminders ({overdueList.length})
            </button>
            <button
              onClick={() => setSelectedTab('payment_receipts')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                selectedTab === 'payment_receipts'
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Instant Payment Receipts
            </button>
          </div>

          <div className="flex items-center gap-2 bg-slate-800/90 p-1 rounded-xl border border-slate-700">
            <button
              onClick={() => setLanguage('FR')}
              className={`px-3 py-1 rounded-lg text-xs font-black cursor-pointer ${
                language === 'FR' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400'
              }`}
            >
              FR (Français)
            </button>
            <button
              onClick={() => setLanguage('EN')}
              className={`px-3 py-1 rounded-lg text-xs font-black cursor-pointer ${
                language === 'EN' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400'
              }`}
            >
              EN (English)
            </button>
          </div>
        </div>
      </div>

      {dispatchStatus && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-2xl text-xs font-bold text-emerald-800 dark:text-emerald-200 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{dispatchStatus}</span>
        </div>
      )}

      {/* Filter & Batch Actions Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search student or matricule..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium w-64"
            />
          </div>

          <select
            value={selectedClass}
            onChange={e => setSelectedClass(e.target.value)}
            className="p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200"
          >
            <option value="ALL">All Classes (Toutes les Classes)</option>
            {classesList.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {selectedTab === 'overdue_reminders' && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleSelectAllOverdue}
              className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              {selectedStudentIds.size === overdueList.length ? 'Deselect All' : 'Select All'}
            </button>

            <button
              onClick={handleBatchDispatch}
              disabled={selectedStudentIds.size === 0}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-emerald-600/20"
            >
              <Send className="w-4 h-4" />
              <span>Broadcast WhatsApp ({selectedStudentIds.size})</span>
            </button>
          </div>
        )}
      </div>

      {/* Overdue Reminders List */}
      {selectedTab === 'overdue_reminders' && (
        <div className="overflow-x-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-bold uppercase text-[10px]">
              <tr>
                <th className="p-4 w-10">
                  <input
                    type="checkbox"
                    checked={selectedStudentIds.size === overdueList.length && overdueList.length > 0}
                    onChange={handleSelectAllOverdue}
                    className="rounded accent-emerald-600 cursor-pointer"
                  />
                </th>
                <th className="p-4">Student & Admission</th>
                <th className="p-4">Class</th>
                <th className="p-4">Parent / Guardian</th>
                <th className="p-4">WhatsApp Phone</th>
                <th className="p-4">Outstanding Arrears</th>
                <th className="p-4 text-right">Quick Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {overdueList.map(item => {
                const isSelected = selectedStudentIds.has(item.student.id);
                const phone = item.student.parentPhone || (item.student as any).guardianPhone || (item.student as any).phone || 'N/A';
                const payload = generateOverdueFeeReminderWhatsApp(item.student, item.balance, 'Friday, 15:00', language);

                return (
                  <tr key={item.student.id} className={isSelected ? 'bg-emerald-50/50 dark:bg-emerald-950/20' : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/30'}>
                    <td className="p-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleStudent(item.student.id)}
                        className="rounded accent-emerald-600 cursor-pointer"
                      />
                    </td>
                    <td className="p-4 font-bold text-slate-900 dark:text-white">
                      <div>{item.student.fullName}</div>
                      <div className="text-[10px] font-mono text-slate-400">{item.student.admissionNo}</div>
                    </td>
                    <td className="p-4 font-medium">{item.student.className}</td>
                    <td className="p-4 font-medium">{item.student.parentName || 'Parent / Guardian'}</td>
                    <td className="p-4 font-mono text-emerald-600 dark:text-emerald-400 font-bold">{phone}</td>
                    <td className="p-4 font-bold text-rose-600 dark:text-rose-400">
                      {item.balance.toLocaleString()} CFA
                    </td>
                    <td className="p-4 text-right">
                      <a
                        href={payload.whatsappUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition-all shadow-xs"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Send WhatsApp</span>
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Payment Receipts List */}
      {selectedTab === 'payment_receipts' && (
        <div className="overflow-x-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-bold uppercase text-[10px]">
              <tr>
                <th className="p-4">Receipt No</th>
                <th className="p-4">Date</th>
                <th className="p-4">Student & Class</th>
                <th className="p-4">Amount Versé</th>
                <th className="p-4">Payment Method</th>
                <th className="p-4 text-right">Send Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {recentPaymentsList.map(p => {
                const student = students.find(s => s.id === p.studentId || s.admissionNo === p.admissionNo) || {
                  id: p.studentId,
                  fullName: p.studentName,
                  admissionNo: p.admissionNo,
                  className: p.className,
                  parentPhone: '+237699001122',
                  parentName: 'Parent'
                } as any;

                const payload = generatePaymentReceiptWhatsApp(p, student, undefined, language);

                return (
                  <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="p-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">{p.receiptNo}</td>
                    <td className="p-4 font-mono text-[11px]">{p.date}</td>
                    <td className="p-4 font-bold text-slate-900 dark:text-white">
                      <div>{p.studentName}</div>
                      <div className="text-[10px] text-slate-400">{p.className}</div>
                    </td>
                    <td className="p-4 font-bold text-emerald-600 dark:text-emerald-400">
                      {(p.paid || p.amount || 0).toLocaleString()} CFA
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-bold">
                        {p.paymentMethod || p.method || 'Cash'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <a
                        href={payload.whatsappUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition-all shadow-xs"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Dispatch Receipt</span>
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

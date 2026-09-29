import React, { useState } from 'react';
import { 
  X, AlertTriangle, Phone, MessageSquare, Calendar, CheckCircle2, 
  DollarSign, Clock, Send, User, ShieldAlert, Sparkles, ExternalLink
} from 'lucide-react';
import { StudentBill, Student } from '../../types';

interface ActionRequiredFollowUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  bill: StudentBill | null;
  student?: Student | null;
  onUpdateStatus: (
    billId: string, 
    status: 'Pending Follow-up' | 'Contacted' | 'Promised' | 'Resolved', 
    notes?: string, 
    promisedDate?: string
  ) => void;
  onRecordPayment: (studentId: string) => void;
  onSendNotificationAlert?: (title: string, message: string, targetStudentId: string) => void;
}

export const ActionRequiredFollowUpModal: React.FC<ActionRequiredFollowUpModalProps> = ({
  isOpen,
  onClose,
  bill,
  student,
  onUpdateStatus,
  onRecordPayment,
  onSendNotificationAlert
}) => {
  const [selectedStatus, setSelectedStatus] = useState<'Pending Follow-up' | 'Contacted' | 'Promised' | 'Resolved'>(
    bill?.actionStatus || 'Contacted'
  );
  const [promisedDate, setPromisedDate] = useState(bill?.promisedDate || '');
  const [notes, setNotes] = useState(bill?.followUpNotes || '');
  const [customMessage, setCustomMessage] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');

  if (!isOpen || !bill) return null;

  const parentPhone = student?.parentPhone || bill.admissionNo;
  const parentName = student?.parentName || 'Parent/Guardian';

  // Default reminder message
  const defaultReminder = `Dear ${parentName}, this is an urgent fee notice from JIPAS School Bursary regarding ${bill.studentName} (${bill.className}, ${bill.admissionNo}). Outstanding balance: ${(bill.balance ?? 0).toFixed(2)} CFA. Please arrange payment at the school accounts office or via Mobile Money to avoid examination clearance restrictions. Thank you.`;

  const activeMessage = customMessage || defaultReminder;

  // WhatsApp web link
  const cleanPhone = parentPhone.replace(/[^0-9]/g, '');
  const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(activeMessage)}`;

  const handleSaveStatus = () => {
    onUpdateStatus(bill.id, selectedStatus, notes, promisedDate);
    setActionSuccess(`Status updated to "${selectedStatus}" successfully.`);
    setTimeout(() => {
      setActionSuccess('');
      onClose();
    }, 1200);
  };

  const handleSendPortalAlert = () => {
    if (onSendNotificationAlert) {
      onSendNotificationAlert(
        `🚨 Fee Overdue Notice: ${bill.studentName}`,
        `Outstanding school balance: ${(bill.balance ?? 0).toFixed(2)} CFA. Please contact Bursar office for immediate clearance.`,
        bill.studentId
      );
      setActionSuccess('Direct portal notification dispatched to student & parent account!');
      setTimeout(() => setActionSuccess(''), 2500);
    }
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(activeMessage);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-900 via-slate-900 to-rose-950 text-white p-6 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-rose-500/20 border border-rose-400/30 flex items-center justify-center text-rose-300">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full bg-rose-500 text-white">
                  Action Required
                </span>
                <span className="text-xs text-rose-200 font-medium">
                  Severity: {bill.actionSeverity || 'Critical'}
                </span>
              </div>
              <h3 className="text-lg font-black text-white mt-1">
                Overdue Fee Follow-up: {bill.studentName}
              </h3>
              <p className="text-xs text-rose-200/80">
                {bill.className} • Admission No: <span className="font-mono">{bill.admissionNo}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {actionSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              {actionSuccess}
            </div>
          )}

          {/* Quick Balance & Contact Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl">
              <span className="text-[10px] uppercase font-bold text-rose-600 block">Balance Overdue</span>
              <span className="text-xl font-black text-rose-700 font-mono">
                {(bill.balance ?? 0).toFixed(2)} CFA
              </span>
              <span className="text-[10px] text-rose-500 block mt-0.5">
                Paid: {(bill.paid ?? 0).toFixed(2)} of {(bill.payable ?? 0).toFixed(2)} CFA
              </span>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Parent / Guardian</span>
              <span className="text-sm font-bold text-slate-800 block truncate">{parentName}</span>
              <span className="text-xs font-mono text-slate-600 flex items-center gap-1 mt-0.5">
                <Phone className="w-3 h-3 text-indigo-600" />
                {parentPhone}
              </span>
            </div>

            <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl">
              <span className="text-[10px] uppercase font-bold text-indigo-600 block">Audit Flag Reason</span>
              <p className="text-xs font-medium text-indigo-900 line-clamp-2 mt-0.5">
                {bill.actionRequiredReason || 'Overdue fees flagged by daily automated audit.'}
              </p>
            </div>
          </div>

          {/* Quick Action Channels */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-2 uppercase tracking-wide">
              1-Click Fast Contact & Follow-up
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setSelectedStatus('Contacted')}
                className="flex items-center justify-center gap-1.5 p-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors cursor-pointer text-center"
              >
                <MessageSquare className="w-4 h-4" />
                WhatsApp Parent
              </a>

              <a
                href={`tel:${cleanPhone}`}
                onClick={() => setSelectedStatus('Contacted')}
                className="flex items-center justify-center gap-1.5 p-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors cursor-pointer text-center"
              >
                <Phone className="w-4 h-4" />
                Call Parent
              </a>

              <button
                type="button"
                onClick={handleSendPortalAlert}
                className="flex items-center justify-center gap-1.5 p-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition-colors cursor-pointer text-center"
              >
                <Send className="w-4 h-4" />
                Portal Notice
              </button>

              <button
                type="button"
                onClick={() => {
                  onRecordPayment(bill.studentId);
                  onClose();
                }}
                className="flex items-center justify-center gap-1.5 p-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-colors cursor-pointer text-center"
              >
                <DollarSign className="w-4 h-4" />
                Collect Payment
              </button>
            </div>
          </div>

          {/* Message Template / Custom SMS preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700">Message Template (SMS / WhatsApp)</label>
              <button
                type="button"
                onClick={handleCopyMessage}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer"
              >
                {isCopied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Sparkles className="w-3.5 h-3.5" />}
                {isCopied ? 'Copied!' : 'Copy Text'}
              </button>
            </div>
            <textarea
              rows={3}
              value={customMessage || defaultReminder}
              onChange={(e) => setCustomMessage(e.target.value)}
              className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-rose-500 font-mono text-slate-700"
            />
          </div>

          {/* Follow-up Status Update Form */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-4">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              Update Follow-up Outcome & Promise Date
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Current Action Status</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-800"
                >
                  <option value="Pending Follow-up">Pending Follow-up</option>
                  <option value="Contacted">Contacted (Parent Notified)</option>
                  <option value="Promised">Payment Promised</option>
                  <option value="Resolved">Resolved (Cleared)</option>
                </select>
              </div>

              {selectedStatus === 'Promised' && (
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Promised Payment Date</label>
                  <input
                    type="date"
                    value={promisedDate}
                    onChange={(e) => setPromisedDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-800"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Follow-up Notes / Parent Response</label>
              <input
                type="text"
                placeholder="e.g., Parent spoke with Bursar, promised 50% payment by Friday via MoMo..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-xs text-slate-800"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSaveStatus}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            Save Follow-up Record
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActionRequiredFollowUpModal;

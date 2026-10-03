import React, { useState } from 'react';
import { 
  X, 
  AlertTriangle, 
  ShieldCheck, 
  CheckCircle, 
  RefreshCw, 
  UserCheck, 
  FileText, 
  Clock, 
  Ban, 
  Coins,
  Calendar,
  Tag
} from 'lucide-react';
import { 
  PaymentRecord, 
  CorrectionReasonCode, 
  FeeCorrectionRecord 
} from '../../types';
import { 
  correctPaymentStudent, 
  correctPaymentAmount, 
  correctPaymentCategory, 
  correctPaymentAcademicPeriod, 
  voidPaymentRecord,
  getFeeCorrectionLogs 
} from '../../services/feeCorrectionService';
import { getStoredStudents } from '../../services/storageService';

interface PaymentCorrectionModalProps {
  payment: PaymentRecord;
  actor: string;
  role: string;
  campusId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PaymentCorrectionModal({
  payment,
  actor,
  role,
  campusId,
  onClose,
  onSuccess
}: PaymentCorrectionModalProps) {
  const [actionType, setActionType] = useState<'CORRECT_STUDENT' | 'CORRECT_AMOUNT' | 'CORRECT_CATEGORY' | 'CORRECT_PERIOD' | 'VOID_PAYMENT'>('CORRECT_AMOUNT');
  const [destinationStudentId, setDestinationStudentId] = useState<string>('');
  const [newAmount, setNewAmount] = useState<number>(payment.paid ?? payment.amount ?? 0);
  const [newPaidAs, setNewPaidAs] = useState<string>(payment.paidAs || payment.description || 'School Fees');
  const [newAcademicYear, setNewAcademicYear] = useState<string>(payment.academicYear || '2025-2026');
  const [newTerm, setNewTerm] = useState<string>(payment.term || 'First Term');
  const [reasonCode, setReasonCode] = useState<CorrectionReasonCode>('AMOUNT_TYPO');
  const [reasonText, setReasonText] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showConfirm, setShowConfirm] = useState<boolean>(false);

  const students = getStoredStudents().filter(s => s.id !== payment.studentId);
  const historyLogs = getFeeCorrectionLogs({ studentId: payment.studentId });

  const currentAmount = payment.paid ?? payment.amount ?? 0;

  const handleApplyCorrection = () => {
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      if (actionType === 'CORRECT_STUDENT') {
        if (!destinationStudentId) {
          throw new Error('DESTINATION_REQUIRED: Please select the destination student for this payment.');
        }
        correctPaymentStudent({
          actor,
          role,
          campusId,
          paymentId: payment.id,
          destinationStudentId,
          reasonCode,
          reasonText
        });
      } else if (actionType === 'CORRECT_AMOUNT') {
        if (isNaN(newAmount) || newAmount < 0) {
          throw new Error('INVALID_AMOUNT: Payment amount must be a positive number.');
        }
        correctPaymentAmount({
          actor,
          role,
          campusId,
          paymentId: payment.id,
          newAmount,
          reasonCode,
          reasonText
        });
      } else if (actionType === 'CORRECT_CATEGORY') {
        if (!newPaidAs.trim()) {
          throw new Error('CATEGORY_REQUIRED: Please enter the corrected fee category / narrative.');
        }
        correctPaymentCategory({
          actor,
          role,
          campusId,
          paymentId: payment.id,
          newPaidAs,
          reasonCode,
          reasonText
        });
      } else if (actionType === 'CORRECT_PERIOD') {
        correctPaymentAcademicPeriod({
          actor,
          role,
          campusId,
          paymentId: payment.id,
          newAcademicYear,
          newTerm,
          reasonCode,
          reasonText
        });
      } else if (actionType === 'VOID_PAYMENT') {
        voidPaymentRecord({
          actor,
          role,
          campusId,
          paymentId: payment.id,
          reasonCode,
          reasonText
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Payment correction failed. Ledger was not altered.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full p-6 text-slate-200 my-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Controlled Payment Correction
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-medium">
                  Authoritative
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Receipt #{payment.receiptNo} • Student: {payment.studentName} ({payment.admissionNo})
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Transaction Snapshot */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 mb-5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-slate-500 block">Receipt No</span>
            <span className="font-mono text-slate-200 font-semibold">{payment.receiptNo}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Current Amount</span>
            <span className="font-bold text-emerald-400">{currentAmount.toLocaleString()} CFA</span>
          </div>
          <div>
            <span className="text-slate-500 block">Academic Period</span>
            <span className="text-slate-200">{payment.academicYear || '2025-2026'} ({payment.term || 'First Term'})</span>
          </div>
          <div>
            <span className="text-slate-500 block">Fee Category</span>
            <span className="text-slate-200">{payment.paidAs || payment.description || 'School Fees'}</span>
          </div>
        </div>

        {/* Error Banner */}
        {errorMsg && (
          <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-3 text-xs text-rose-300">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Correction Blocked</p>
              <p>{errorMsg}</p>
            </div>
          </div>
        )}

        {/* Action Type Tabs */}
        <div className="mb-5">
          <label className="text-xs font-semibold text-slate-300 mb-2 block">
            Select Controlled Correction Action
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
            <button
              type="button"
              onClick={() => {
                setActionType('CORRECT_AMOUNT');
                setReasonCode('AMOUNT_TYPO');
              }}
              className={`p-2.5 rounded-xl border font-medium flex flex-col items-center gap-1 transition ${
                actionType === 'CORRECT_AMOUNT' 
                  ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300' 
                  : 'bg-slate-800/50 border-slate-700/60 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <Coins className="w-4 h-4" />
              <span>Correct Amount</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActionType('CORRECT_STUDENT');
                setReasonCode('WRONG_STUDENT_SELECTED');
              }}
              className={`p-2.5 rounded-xl border font-medium flex flex-col items-center gap-1 transition ${
                actionType === 'CORRECT_STUDENT' 
                  ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300' 
                  : 'bg-slate-800/50 border-slate-700/60 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>Wrong Student</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActionType('CORRECT_CATEGORY');
                setReasonCode('WRONG_FEE_ITEM');
              }}
              className={`p-2.5 rounded-xl border font-medium flex flex-col items-center gap-1 transition ${
                actionType === 'CORRECT_CATEGORY' 
                  ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300' 
                  : 'bg-slate-800/50 border-slate-700/60 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <Tag className="w-4 h-4" />
              <span>Category / Item</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActionType('CORRECT_PERIOD');
                setReasonCode('WRONG_TERM_ASSIGNED');
              }}
              className={`p-2.5 rounded-xl border font-medium flex flex-col items-center gap-1 transition ${
                actionType === 'CORRECT_PERIOD' 
                  ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300' 
                  : 'bg-slate-800/50 border-slate-700/60 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Year / Term</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActionType('VOID_PAYMENT');
                setReasonCode('DUPLICATE_PAYMENT');
              }}
              className={`p-2.5 rounded-xl border font-medium flex flex-col items-center gap-1 transition ${
                actionType === 'VOID_PAYMENT' 
                  ? 'bg-rose-600/20 border-rose-500 text-rose-300' 
                  : 'bg-slate-800/50 border-slate-700/60 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <Ban className="w-4 h-4" />
              <span>Void Record</span>
            </button>
          </div>
        </div>

        {/* Dynamic Fields */}
        <div className="space-y-4 mb-5 bg-slate-950/40 p-4 border border-slate-800/60 rounded-xl text-xs">
          {actionType === 'CORRECT_AMOUNT' && (
            <div>
              <label className="block text-slate-300 font-medium mb-1">
                New Corrected Payment Amount (CFA)
              </label>
              <input
                type="number"
                value={newAmount}
                onChange={e => setNewAmount(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                placeholder="Enter exact corrected amount"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Will update this payment transaction and recalculate the student's authoritative ledger balance.
              </p>
            </div>
          )}

          {actionType === 'CORRECT_STUDENT' && (
            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Select Rightful Destination Student
              </label>
              <select
                value={destinationStudentId}
                onChange={e => setDestinationStudentId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="">-- Select Student --</option>
                {students.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.fullName} ({s.admissionNo}) - {s.className}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-400 mt-1">
                Original payment will be marked voided and traceable. A replacement payment will be issued for Student B under a distinct receipt identity.
              </p>
            </div>
          )}

          {actionType === 'CORRECT_CATEGORY' && (
            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Correct Fee Category / Paid-As Description
              </label>
              <input
                type="text"
                value={newPaidAs}
                onChange={e => setNewPaidAs(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                placeholder="e.g. First Term School Fees"
              />
            </div>
          )}

          {actionType === 'CORRECT_PERIOD' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Academic Year
                </label>
                <input
                  type="text"
                  value={newAcademicYear}
                  onChange={e => setNewAcademicYear(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  placeholder="2026-2027"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Academic Term
                </label>
                <select
                  value={newTerm}
                  onChange={e => setNewTerm(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="First Term">First Term</option>
                  <option value="Second Term">Second Term</option>
                  <option value="Third Term">Third Term</option>
                </select>
              </div>
            </div>
          )}

          {actionType === 'VOID_PAYMENT' && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-300 text-xs">
              <p className="font-bold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Permanent Ledger Adjustment
              </p>
              <p className="mt-1">
                Voiding this payment removes {currentAmount.toLocaleString()} CFA from valid collections for {payment.studentName} and restores the unpaid balance.
              </p>
            </div>
          )}

          {/* Reason Selection */}
          <div className="pt-2 border-t border-slate-800">
            <label className="block text-slate-300 font-medium mb-1">
              Correction Reason Code <span className="text-rose-400">*</span>
            </label>
            <select
              value={reasonCode}
              onChange={e => setReasonCode(e.target.value as CorrectionReasonCode)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500 mb-2"
            >
              <option value="WRONG_AMOUNT">Wrong Amount / Data Entry Typo</option>
              <option value="WRONG_STUDENT_SELECTED">Wrong Student Selected</option>
              <option value="WRONG_FEE_ITEM">Wrong Fee Item / Paid-As Narrative</option>
              <option value="WRONG_ACADEMIC_YEAR">Wrong Academic Year Assigned</option>
              <option value="WRONG_TERM_ASSIGNED">Wrong Academic Term Assigned</option>
              <option value="DUPLICATE_PAYMENT">Duplicate Payment Record</option>
              <option value="DATA_ENTRY_ERROR">General Data Entry Error</option>
              <option value="OTHER">Other Reason (Detailed explanation required)</option>
            </select>

            <label className="block text-slate-300 font-medium mb-1">
              Detailed Explanation / Audit Note {reasonCode === 'OTHER' && <span className="text-rose-400">*</span>}
            </label>
            <textarea
              value={reasonText}
              onChange={e => setReasonText(e.target.value)}
              rows={2}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              placeholder="Provide context for audit log..."
            />
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Actor: <strong className="text-slate-300">{actor}</strong> ({role})</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleApplyCorrection}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                actionType === 'VOID_PAYMENT'
                  ? 'bg-rose-600 hover:bg-rose-500 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Apply Controlled Correction</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

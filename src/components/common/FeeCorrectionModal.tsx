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
  HelpCircle,
  Coins
} from 'lucide-react';
import { 
  StudentBill, 
  Student, 
  CorrectionReasonCode, 
  FeeCorrectionRecord 
} from '../../types';
import { 
  correctFeeAmount, 
  voidFee, 
  correctFeeStudent, 
  correctFeeItem, 
  correctFeeTerm, 
  getFeeCorrectionLogs 
} from '../../services/feeCorrectionService';
import { getStoredStudents } from '../../services/storageService';

interface FeeCorrectionModalProps {
  bill: StudentBill;
  actor: string;
  role: string;
  campusId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function FeeCorrectionModal({
  bill,
  actor,
  role,
  campusId,
  onClose,
  onSuccess
}: FeeCorrectionModalProps) {
  const [actionType, setActionType] = useState<'CORRECT_AMOUNT' | 'VOID' | 'CORRECT_STUDENT' | 'CORRECT_FEE_ITEM' | 'CORRECT_TERM'>('CORRECT_AMOUNT');
  const [newAmount, setNewAmount] = useState<number>(bill.payable ?? bill.subTotal ?? 0);
  const [destinationStudentId, setDestinationStudentId] = useState<string>('');
  const [newFeeItemName, setNewFeeItemName] = useState<string>(bill.items && bill.items.length > 0 ? bill.items[0].name : 'Tuition Fee');
  const [newTerm, setNewTerm] = useState<string>('Second Term');
  const [reasonCode, setReasonCode] = useState<CorrectionReasonCode>('WRONG_AMOUNT');
  const [reasonText, setReasonText] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showConfirm, setShowConfirm] = useState<boolean>(false);

  const students = getStoredStudents().filter(s => s.id !== bill.studentId);
  const historyLogs = getFeeCorrectionLogs({ billId: bill.id });

  const primaryItemName = bill.items && bill.items.length > 0 ? bill.items[0].name : 'Tuition Fee';
  const currentAmount = bill.payable ?? bill.subTotal ?? 0;

  const handleApplyCorrection = () => {
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      if (actionType === 'CORRECT_AMOUNT') {
        correctFeeAmount({
          actor,
          role,
          campusId,
          billId: bill.id,
          newAmount,
          reasonCode,
          reasonText,
          baseRevision: bill.revision
        });
      } else if (actionType === 'VOID') {
        voidFee({
          actor,
          role,
          campusId,
          billId: bill.id,
          reasonCode,
          reasonText,
          baseRevision: bill.revision
        });
      } else if (actionType === 'CORRECT_STUDENT') {
        if (!destinationStudentId) {
          throw new Error('DESTINATION_REQUIRED: Please select the destination student.');
        }
        correctFeeStudent({
          actor,
          role,
          campusId,
          billId: bill.id,
          destinationStudentId,
          reasonCode,
          reasonText,
          baseRevision: bill.revision
        });
      } else if (actionType === 'CORRECT_FEE_ITEM') {
        if (!newFeeItemName.trim()) {
          throw new Error('ITEM_NAME_REQUIRED: Please specify the new fee item description.');
        }
        correctFeeItem({
          actor,
          role,
          campusId,
          billId: bill.id,
          newFeeItemName,
          reasonCode,
          reasonText,
          baseRevision: bill.revision
        });
      } else if (actionType === 'CORRECT_TERM') {
        correctFeeTerm({
          actor,
          role,
          campusId,
          billId: bill.id,
          newTerm,
          reasonCode,
          reasonText,
          baseRevision: bill.revision
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Correction failed. No financial changes were applied.');
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
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Fee Correction & Void Center</h2>
              <p className="text-xs text-slate-400">
                Auditable Financial Reversal & Correction Engine • Bill #{bill.billNo || bill.id}
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Fee Details Card */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 mb-5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-slate-500 block font-medium">Student</span>
            <strong className="text-white truncate block">{bill.studentName}</strong>
            <span className="text-[10px] text-slate-400 font-mono">{bill.admissionNo}</span>
          </div>
          <div>
            <span className="text-slate-500 block font-medium">Fee Item</span>
            <strong className="text-indigo-300 truncate block">{primaryItemName}</strong>
            <span className="text-[10px] text-slate-400">{bill.term || 'First Term'}</span>
          </div>
          <div>
            <span className="text-slate-500 block font-medium">Charged Payable</span>
            <strong className="text-emerald-400 font-mono text-sm block">
              {(currentAmount ?? 0).toLocaleString()} CFA
            </strong>
          </div>
          <div>
            <span className="text-slate-500 block font-medium">Status</span>
            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase mt-0.5 ${
              bill.isVoided || bill.status === 'Voided' 
                ? 'bg-red-500/20 text-red-300 border border-red-500/30' 
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
            }`}>
              {bill.isVoided ? 'VOIDED' : bill.status}
            </span>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 mb-5">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold block">Correction Blocked</strong>
              <span>{errorMsg}</span>
            </div>
          </div>
        )}

        {!showConfirm ? (
          <div className="space-y-4">
            
            {/* Action Type Tabs */}
            <div>
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
                Select Correction Action
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <button
                  type="button"
                  onClick={() => { setActionType('CORRECT_AMOUNT'); setReasonCode('WRONG_AMOUNT'); }}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                    actionType === 'CORRECT_AMOUNT' 
                      ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' 
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Amount
                </button>
                <button
                  type="button"
                  onClick={() => { setActionType('VOID'); setReasonCode('DATA_ENTRY_ERROR'); }}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                    actionType === 'VOID' 
                      ? 'bg-rose-600 border-rose-500 text-white shadow-lg' 
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Void Fee
                </button>
                <button
                  type="button"
                  onClick={() => { setActionType('CORRECT_STUDENT'); setReasonCode('WRONG_STUDENT'); }}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                    actionType === 'CORRECT_STUDENT' 
                      ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' 
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Reassign Student
                </button>
                <button
                  type="button"
                  onClick={() => { setActionType('CORRECT_FEE_ITEM'); setReasonCode('WRONG_FEE_ITEM'); }}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                    actionType === 'CORRECT_FEE_ITEM' 
                      ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' 
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Fee Item
                </button>
                <button
                  type="button"
                  onClick={() => { setActionType('CORRECT_TERM'); setReasonCode('WRONG_ACADEMIC_TERM'); }}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                    actionType === 'CORRECT_TERM' 
                      ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' 
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Term
                </button>
              </div>
            </div>

            {/* Action Specific Fields */}
            {actionType === 'CORRECT_AMOUNT' && (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <label className="text-xs font-medium text-slate-300 block">
                  Corrected Fee Amount (CFA)
                </label>
                <div className="relative">
                  <Coins className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="number"
                    value={newAmount}
                    onChange={(e) => setNewAmount(Number(e.target.value))}
                    min={0}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 pl-9 pr-3 text-white font-mono text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  Current amount: <strong>{currentAmount.toLocaleString()} CFA</strong>. Balance will automatically recalculate.
                </p>
              </div>
            )}

            {actionType === 'VOID' && (
              <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/30 text-rose-200 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-rose-300">
                  <Ban className="w-4 h-4" /> Void Confirmation Impact
                </div>
                <p>
                  Voiding this fee record will mark it as <strong>VOIDED</strong>. It will no longer contribute to the student's active balance or revenue totals, but will remain visible in audit logs.
                </p>
              </div>
            )}

            {actionType === 'CORRECT_STUDENT' && (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <label className="text-xs font-medium text-slate-300 block">
                  Select Correct Destination Student
                </label>
                <select
                  value={destinationStudentId}
                  onChange={(e) => setDestinationStudentId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-white text-xs focus:outline-none focus:border-indigo-500"
                >
                  <option value="">-- Select Destination Student --</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.fullName} ({s.admissionNo}) — {s.className}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400">
                  This will void the charge on <strong>{bill.studentName}</strong> and issue the replacement fee to the destination student.
                </p>
              </div>
            )}

            {actionType === 'CORRECT_FEE_ITEM' && (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <label className="text-xs font-medium text-slate-300 block">
                  Corrected Fee Item Name
                </label>
                <input
                  type="text"
                  value={newFeeItemName}
                  onChange={(e) => setNewFeeItemName(e.target.value)}
                  placeholder="e.g. ICT Levy, Development Levy"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>
            )}

            {actionType === 'CORRECT_TERM' && (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <label className="text-xs font-medium text-slate-300 block">
                  Select Correct Academic Term
                </label>
                <select
                  value={newTerm}
                  onChange={(e) => setNewTerm(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-white text-xs focus:outline-none focus:border-indigo-500"
                >
                  <option value="First Term">First Term</option>
                  <option value="Second Term">Second Term</option>
                  <option value="Third Term">Third Term</option>
                </select>
                <p className="text-[11px] text-slate-400">
                  Original term ({bill.term || 'First Term'}) will be voided and replaced with {newTerm}.
                </p>
              </div>
            )}

            {/* Reason Code & Text */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Mandatory Correction Reason
                </label>
                <select
                  value={reasonCode}
                  onChange={(e) => setReasonCode(e.target.value as CorrectionReasonCode)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-white text-xs focus:outline-none focus:border-indigo-500"
                >
                  <option value="WRONG_AMOUNT">Wrong amount entered</option>
                  <option value="WRONG_STUDENT">Assigned to wrong student</option>
                  <option value="DUPLICATE_FEE">Duplicate fee entry</option>
                  <option value="WRONG_FEE_ITEM">Wrong fee item description</option>
                  <option value="WRONG_ACADEMIC_TERM">Wrong academic term</option>
                  <option value="INCORRECT_TARIFF">Incorrect tariff generated</option>
                  <option value="DATA_ENTRY_ERROR">Data entry error</option>
                  <option value="FEE_SHOULD_NOT_BE_CREATED">Fee should not have been created</option>
                  <option value="OTHER">Other (specify below)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Audit Explanation / Reason Text {reasonCode === 'OTHER' && <span className="text-rose-400">*</span>}
                </label>
                <textarea
                  value={reasonText}
                  onChange={(e) => setReasonText(e.target.value)}
                  placeholder="Provide explicit audit notes for this correction..."
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Correction History section if logs exist */}
            {historyLogs.length > 0 && (
              <div className="pt-3 border-t border-slate-800">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" /> Previous Correction History ({historyLogs.length})
                </span>
                <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1 text-[11px]">
                  {historyLogs.map(log => (
                    <div key={log.id} className="p-2 rounded-lg bg-slate-950 border border-slate-800 flex justify-between items-center text-slate-300">
                      <div>
                        <strong className="text-white block">{log.action} — {log.reasonCode}</strong>
                        <span className="text-slate-400">{log.reasonText}</span>
                      </div>
                      <div className="text-right text-[10px] text-slate-500">
                        <span>{new Date(log.timestamp).toLocaleDateString()}</span>
                        <span className="block">{log.actorId}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="py-2 px-4 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setShowConfirm(true)}
                className={`py-2 px-5 rounded-xl text-xs font-bold text-white shadow-lg transition-all ${
                  actionType === 'VOID' ? 'bg-rose-600 hover:bg-rose-500' : 'bg-indigo-600 hover:bg-indigo-500'
                }`}
              >
                Review Correction
              </button>
            </div>

          </div>
        ) : (
          /* Confirmation Step */
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-300">
                <AlertTriangle className="w-4 h-4" /> Confirm Financial Correction Impact
              </div>
              <ul className="list-disc pl-4 space-y-1 text-[11px]">
                <li>Original bill record will be preserved in audit history.</li>
                <li>Student's outstanding balance will be automatically recalculated.</li>
                <li>Audit entry will log actor: <strong>{actor} ({role})</strong>.</li>
              </ul>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Action:</span>
                <strong className="text-white font-mono">{actionType}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Reason Code:</span>
                <strong className="text-indigo-300">{reasonCode}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Audit Notes:</span>
                <strong className="text-slate-200">{reasonText || 'None provided'}</strong>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="py-2 px-4 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleApplyCorrection}
                className={`py-2 px-6 rounded-xl text-xs font-black text-white shadow-xl transition-all ${
                  actionType === 'VOID' ? 'bg-rose-600 hover:bg-rose-500' : 'bg-emerald-600 hover:bg-emerald-500'
                }`}
              >
                {isSubmitting ? 'Applying...' : actionType === 'VOID' ? 'CONFIRM VOID FEE' : 'CONFIRM CORRECTION'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

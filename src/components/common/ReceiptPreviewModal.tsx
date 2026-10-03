import React from 'react';
import { Check, X, ShieldAlert } from 'lucide-react';
import { formatCurrency } from '../../utils/financeUtils';
import { Student, PaymentRecord } from '../../types';

interface ReceiptPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  payment: Partial<PaymentRecord>;
  student: Partial<Student>;
}

export default function ReceiptPreviewModal({
  isOpen,
  onClose,
  onConfirm,
  payment,
  student
}: ReceiptPreviewModalProps) {
  if (!isOpen) return null;

  const studentName = student?.fullName || payment?.studentName || 'Student';
  const admissionNo = student?.admissionNo || payment?.admissionNo || 'N/A';
  const className = student?.className || payment?.className || 'N/A';
  
  const amount = payment?.paid ?? payment?.amount ?? 0;
  const method = payment?.method ?? 'Cash';
  const paidAs = payment?.paidAs ?? 'Tuition Fee';
  const academicYear = payment?.academicYear || '2026-2027';
  const term = payment?.term || 'First Term';

  const currentPayable = payment?.payable ?? 715;
  const currentPaidBefore = 0; // Readonly summary context
  const remainingBalance = Math.max(0, currentPayable - (currentPaidBefore + amount));

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-5 relative my-auto animate-fade-in">
        
        {/* Warning Indicator */}
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900">Review & Confirm Payment</h3>
            <p className="text-[10px] text-slate-400 uppercase font-bold">Intermediary Verification Summary</p>
          </div>
        </div>

        {/* Read-only Payment Breakdown */}
        <div className="space-y-3 bg-slate-50 p-4.5 rounded-2xl border border-slate-200/80">
          <div>
            <span className="text-[9px] font-black uppercase text-slate-400 block tracking-widest">Student Account</span>
            <span className="font-extrabold text-slate-800 text-sm block">{studentName}</span>
            <span className="text-xs font-mono font-medium text-slate-500 block mt-0.5">{admissionNo} • {className}</span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200/60 text-xs">
            <div>
              <span className="text-[9px] font-black uppercase text-slate-400 block">Fee Category / Purpose</span>
              <strong className="text-slate-800 font-semibold">{paidAs}</strong>
            </div>
            <div>
              <span className="text-[9px] font-black uppercase text-slate-400 block">Payment Method</span>
              <strong className="text-slate-800 font-semibold">{method}</strong>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200/60 text-xs">
            <div>
              <span className="text-[9px] font-black uppercase text-slate-400 block">Academic Period</span>
              <strong className="text-slate-800 font-semibold">{academicYear} ({term})</strong>
            </div>
            <div>
              <span className="text-[9px] font-black uppercase text-slate-400 block">Current Bill Payable</span>
              <strong className="text-slate-800 font-semibold font-mono">{formatCurrency(currentPayable)}</strong>
            </div>
          </div>

          {/* Large Amount Display */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase text-emerald-800 block">Amount to Collect</span>
              <h4 className="text-2xl font-black text-emerald-700 font-mono mt-0.5">
                {formatCurrency(amount)}
              </h4>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-black uppercase text-rose-800 block">Arrears Remaining</span>
              <h4 className="text-sm font-black text-rose-700 font-mono mt-0.5">
                {formatCurrency(remainingBalance)}
              </h4>
            </div>
          </div>
        </div>

        {/* Safety Notice */}
        <p className="text-[10.5px] text-slate-500 leading-relaxed text-center px-1">
          Once confirmed, this payment will be logged in the ledger, and an official parent receipt will be processed immediately.
        </p>

        {/* Modal Controls */}
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 font-extrabold text-xs rounded-xl cursor-pointer transition-all flex items-center justify-center gap-1"
          >
            <X className="w-3.5 h-3.5" />
            <span>Cancel</span>
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-xs rounded-xl cursor-pointer transition-all flex items-center justify-center gap-1 shadow-md shadow-emerald-950/20"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Confirm Payment</span>
          </button>
        </div>

      </div>
    </div>
  );
}

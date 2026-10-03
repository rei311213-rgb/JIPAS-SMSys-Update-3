import React, { useRef, useState } from 'react';
import { Check, X, ShieldAlert, Printer, QrCode } from 'lucide-react';
import { formatCurrency } from '../../utils/financeUtils';
import { printContent } from '../../utils/printUtils';
import { getStoredSettings } from '../../services/storageService';
import JIPASLogo from './JIPASLogo';
import ReceiptQRVerificationModal from './ReceiptQRVerificationModal';
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
  const receiptPrintRef = useRef<HTMLDivElement>(null);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const schoolSettings = getStoredSettings();

  if (!isOpen) return null;

  const studentName = student?.fullName || payment?.studentName || 'Student';
  const admissionNo = student?.admissionNo || payment?.admissionNo || 'N/A';
  const className = student?.className || payment?.className || 'N/A';
  
  const amount = payment?.paid ?? payment?.amount ?? 0;
  const method = payment?.method ?? 'Cash';
  const paidAs = payment?.paidAs ?? 'Tuition Fee';
  const academicYear = payment?.academicYear || schoolSettings.activeAcademicYear || '2026-2027';
  const term = payment?.term || schoolSettings.activeTerm || 'First Term';
  const receiptNo = payment?.receiptNo || `REC/${academicYear.split('-')[0]}/${Math.floor(100000 + Math.random() * 900000)}`;
  const receiptDate = payment?.date || new Date().toISOString().split('T')[0];

  const currentPayable = payment?.payable ?? 715;
  const currentPaidBefore = 0; // Readonly summary context
  const remainingBalance = Math.max(0, currentPayable - (currentPaidBefore + amount));

  const handlePrintReceipt = () => {
    if (receiptPrintRef.current) {
      printContent(receiptPrintRef.current.outerHTML, `JIPAS_Receipt_${receiptNo}`);
    } else {
      document.body.classList.add('print-a6-body');
      window.print();
      setTimeout(() => {
        document.body.classList.remove('print-a6-body');
      }, 1000);
    }
  };

  return (
    <>
      {/* ------------------------------------------------------------- */}
      {/* INTERACTIVE PREVIEW MODAL DIALOG (HIDDEN WHEN PRINTING)       */}
      {/* ------------------------------------------------------------- */}
      <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto print:hidden">
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-5 relative my-auto animate-fade-in">
          
          {/* Warning Indicator Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">Review & Confirm Payment</h3>
                <p className="text-[10px] text-slate-400 uppercase font-bold">Intermediary Verification Summary</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowQRScanner(true)}
              className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 active:scale-95 text-indigo-700 font-extrabold text-[10.5px] rounded-xl flex items-center gap-1 border border-indigo-200 transition-all cursor-pointer"
              title="Scan and verify printed payment receipt QR"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Verify QR</span>
            </button>
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
            Review the transaction details above before final confirmation or trigger an instant A6 print preview.
          </p>

          {/* Modal Controls with Print Receipt Button */}
          <div className="grid grid-cols-3 gap-2 pt-1">
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
              onClick={handlePrintReceipt}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-extrabold text-xs rounded-xl cursor-pointer transition-all flex items-center justify-center gap-1 shadow-md shadow-indigo-950/20"
              title="Print A6 Official Receipt"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Receipt</span>
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-xs rounded-xl cursor-pointer transition-all flex items-center justify-center gap-1 shadow-md shadow-emerald-950/20"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Confirm</span>
            </button>
          </div>

        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* EXPLICIT A6 PRINT CONTAINER USING print-a6-receipt-container  */}
      {/* ------------------------------------------------------------- */}
      <div style={{ position: 'fixed', left: '-9999px', top: '-9999px', width: '105mm' }} aria-hidden="true">
        <div ref={receiptPrintRef} className="print-a6-receipt-container font-sans text-black">
          {/* Header Block */}
          <div>
            <div className="flex items-start justify-between gap-2 border-b border-black pb-1">
              <div className="flex items-center gap-2">
                <JIPASLogo size="sm" className="shrink-0" rounded={true} />
                <div className="leading-tight">
                  <h1 className="text-[10px] font-black uppercase tracking-tight text-black">
                    {schoolSettings.schoolName || 'JOY INTERNATIONAL SCHOOL (JIPAS)'}
                  </h1>
                  <p className="text-[6px] text-black font-bold italic">
                    "{schoolSettings.schoolMotto || 'Education is Wealth • Knowledge, Discipline & Excellence'}"
                  </p>
                  <p className="text-[5.5px] text-black font-medium">
                    GES Accredited • Official Bursary Division
                  </p>
                  <p className="text-[5px] text-black font-normal">
                    {schoolSettings.address || '01 BP. 2364 • Lomé — Togo • Tel: (00228) 22 60 21 38'}
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="inline-block bg-black text-white text-[7px] font-black uppercase px-1 py-0.5 tracking-wide">
                  OFFICIAL RECEIPT
                </span>
                <div className="text-[6px] font-black text-black uppercase tracking-widest mt-0.5">
                  ORIGINAL COPY
                </div>
              </div>
            </div>

            {/* Metadata Banner */}
            <div className="bg-white px-1.5 py-0.5 my-1 border border-black flex justify-between items-center text-[7px] font-bold font-mono">
              <div>
                <span>Receipt No: </span>
                <span className="font-black text-black">{receiptNo}</span>
              </div>
              <div className="flex gap-2 text-black">
                <span>Date: <strong>{receiptDate}</strong></span>
              </div>
            </div>

            {/* Student Particulars Grid */}
            <div className="grid grid-cols-2 gap-1 text-[7.5px] bg-white border border-black p-1.5 mb-1">
              <div className="space-y-0.5">
                <div className="flex justify-between">
                  <span>Student Name:</span>
                  <strong className="text-black font-black truncate max-w-[100px]">{studentName}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Admission No:</span>
                  <strong className="text-black font-mono font-black">{admissionNo}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Class Level:</span>
                  <strong className="text-black truncate max-w-[100px]">{className}</strong>
                </div>
              </div>
              <div className="space-y-0.5 border-l border-black pl-1.5">
                <div className="flex justify-between">
                  <span>Academic Year:</span>
                  <strong className="text-black">{academicYear}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Term:</span>
                  <strong className="text-black">{term}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Payment Method:</span>
                  <strong className="text-black font-bold">{method}</strong>
                </div>
              </div>
            </div>

            {/* Fee Details Table */}
            <table className="w-full text-left text-[7.5px] border-collapse mb-1">
              <thead>
                <tr className="bg-black text-white text-[7px] uppercase font-bold tracking-wider">
                  <th className="p-0.5 border border-black">Particulars / Fee Purpose</th>
                  <th className="p-0.5 text-right border border-black">Amount (CFA)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black font-mono">
                <tr>
                  <td className="p-0.5 font-semibold font-sans">{paidAs}</td>
                  <td className="p-0.5 text-right font-bold">{amount.toLocaleString()} CFA</td>
                </tr>
                <tr className="bg-white font-bold text-black border-t border-black">
                  <td className="p-0.5 text-[7px] font-sans">Total Bill Payable</td>
                  <td className="p-0.5 text-right">{currentPayable.toLocaleString()} CFA</td>
                </tr>
                <tr className="bg-white font-black text-black text-[8px] border-t-2 border-black">
                  <td className="p-0.5 text-[7px] font-sans">Amount Paid This Txn</td>
                  <td className="p-0.5 text-right">{amount.toLocaleString()} CFA</td>
                </tr>
                <tr className="bg-white font-bold text-black">
                  <td className="p-0.5 text-[7px] font-sans">Remaining Balance</td>
                  <td className="p-0.5 text-right">{remainingBalance.toLocaleString()} CFA</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Verification and signature row */}
          <div>
            <div className="border-t border-black pt-1 flex items-center justify-between text-[6.5px]">
              <div>
                <p className="font-bold">Authorized Bursar / Cashier</p>
                <p className="text-[5.5px] italic text-black">Valid without physical stamp when barcode/system id present</p>
              </div>
              <div className="text-right">
                <span className="inline-block border border-black px-1.5 py-0.5 font-mono font-bold">
                  VERIFIED • OFFICIAL
                </span>
              </div>
            </div>
            <div className="text-center text-[5.5px] text-black border-t border-dashed border-black mt-1 pt-0.5 font-mono">
              Printed from JIPAS School Management Portal • {new Date().toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>

      {/* QR Code Authenticity Verification Scanner Modal */}
      <ReceiptQRVerificationModal
        isOpen={showQRScanner}
        onClose={() => setShowQRScanner(false)}
      />
    </>
  );
}

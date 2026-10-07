import React, { useState, useMemo } from 'react';
import {
  CreditCard,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Download,
  FileText,
  Printer,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Wallet,
  Clock
} from 'lucide-react';
import { Student, StudentBill, PaymentRecord } from '../../types';
import { processSelfServiceMomoPayment, MomoCheckoutResponse } from '../../services/momoCheckoutService';
import PrintableReceiptA6 from './PrintableReceiptA6';

interface Props {
  students: Student[];
  bills: StudentBill[];
  payments: PaymentRecord[];
  currentUser?: any;
}

export default function ParentMobilePaymentPortal({
  students,
  bills,
  payments,
  currentUser
}: Props) {
  const [selectedStudentId, setSelectedStudentId] = useState<string>(students[0]?.id || '');
  const [paymentAmount, setPaymentAmount] = useState<number>(25000);
  const [selectedProvider, setSelectedProvider] = useState<'MTN_MOMO' | 'ORANGE_MONEY' | 'VISA_CARD'>('MTN_MOMO');
  const [phoneNumber, setPhoneNumber] = useState<string>('677123456');
  const [payerName, setPayerName] = useState<string>('Mr. Eyong Tambe (Parent)');
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkoutResult, setCheckoutResult] = useState<MomoCheckoutResponse | null>(null);
  const [printablePayment, setPrintablePayment] = useState<PaymentRecord | null>(null);

  const currentStudent = useMemo(() => {
    return students.find(s => s.id === selectedStudentId) || students[0];
  }, [students, selectedStudentId]);

  const studentBills = useMemo(() => {
    if (!currentStudent) return [];
    return bills.filter(b => (b.studentId === currentStudent.id || b.admissionNo === currentStudent.admissionNo) && !b.isVoided);
  }, [bills, currentStudent]);

  const studentPayments = useMemo(() => {
    if (!currentStudent) return [];
    return payments.filter(p => p.studentId === currentStudent.id || p.admissionNo === currentStudent.admissionNo);
  }, [payments, currentStudent]);

  const totalPayable = studentBills.reduce((acc, b) => acc + (b.payable || 0), 0);
  const totalPaid = studentPayments.reduce((acc, p) => acc + (p.paid || p.amount || 0), 0);
  const totalBalance = Math.max(0, totalPayable - totalPaid);

  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStudent || paymentAmount <= 0) return;

    setIsProcessing(true);
    setCheckoutResult(null);

    try {
      const activeBill = studentBills[0];
      const res = await processSelfServiceMomoPayment({
        student: currentStudent,
        bill: activeBill,
        amount: paymentAmount,
        provider: selectedProvider,
        phoneNumber,
        payerName
      });
      setCheckoutResult(res);
      setPrintablePayment(res.paymentRecord);
    } catch (e: any) {
      alert(`Payment failed: ${e.message || 'USSD connection timed out'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-amber-800/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 text-xs font-bold tracking-wide">
              <Smartphone className="w-3.5 h-3.5 text-amber-400" />
              <span>OPTION 2 — PARENT MOBILE MONEY & ONLINE CHECKOUT</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Self-Service School Fee Checkout & Digital Receipts
            </h1>
            <p className="text-sm text-amber-200/80 max-w-2xl">
              Pay tuition fees instantly via MTN Mobile Money (*126#) or Orange Money (#150#) with immediate USSD push and instant official 4-on-A4 receipt vouchers.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-amber-500/20 border border-amber-400/40 px-4 py-2 rounded-2xl flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-xs font-black text-amber-300 uppercase tracking-wider">Mobile Checkout Gateway Active</span>
            </div>
          </div>
        </div>

        {/* Student Selector (For Parents with multiple children) */}
        {students.length > 1 && (
          <div className="mt-6 pt-6 border-t border-amber-800/50 flex flex-wrap items-center gap-3">
            <span className="text-xs font-bold text-amber-200/70">Select Student Account:</span>
            <select
              value={selectedStudentId}
              onChange={e => setSelectedStudentId(e.target.value)}
              className="bg-slate-800/90 border border-slate-700 text-white rounded-xl px-3 py-1.5 text-xs font-bold"
            >
              {students.slice(0, 15).map(s => (
                <option key={s.id} value={s.id}>{s.fullName} ({s.className} - {s.admissionNo})</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {checkoutResult && (
        <div className="p-6 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-3xl space-y-4 animate-in zoom-in-95">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-black text-emerald-900 dark:text-emerald-100">Payment Processed Successfully!</h3>
                <p className="text-xs text-emerald-700 dark:text-emerald-300">{checkoutResult.message}</p>
              </div>
            </div>

            <button
              onClick={() => setPrintablePayment(checkoutResult.paymentRecord)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Printer className="w-4 h-4" />
              <span>Print Official Receipt (4-on-A4)</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Grid: Balance Breakdown & Checkout Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Financial Statement Card */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-bold text-amber-600 uppercase">Student Account Status</span>
                <h3 className="text-base font-black text-slate-900 dark:text-white">{currentStudent?.fullName}</h3>
              </div>
              <span className="text-xs font-mono text-slate-400 font-bold">{currentStudent?.admissionNo}</span>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Total Billed Tuition:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{totalPayable.toLocaleString()} CFA</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Total Versé (Paid):</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{totalPaid.toLocaleString()} CFA</span>
              </div>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between text-sm">
                <span className="font-black text-slate-900 dark:text-white">Outstanding Balance:</span>
                <span className={`font-black ${totalBalance > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600'}`}>
                  {totalBalance.toLocaleString()} CFA
                </span>
              </div>
            </div>

            {totalBalance === 0 && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-800 dark:text-emerald-200 text-center">
                ✨ Tuition Fully Cleared for this Term!
              </div>
            )}
          </div>

          {/* Past Payment Slips */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Payment History & Past Receipts</h4>
            <div className="space-y-2">
              {studentPayments.slice(0, 4).map(p => (
                <div key={p.id} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">{(p.paid || p.amount || 0).toLocaleString()} CFA</div>
                    <div className="text-[10px] text-slate-400 font-mono">{p.receiptNo} • {p.date}</div>
                  </div>
                  <button
                    onClick={() => setPrintablePayment(p)}
                    className="px-2.5 py-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 rounded-lg text-[11px] font-bold cursor-pointer"
                  >
                    View Receipt
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Interactive MoMo / OM Checkout Form */}
        <div className="lg:col-span-7">
          <form onSubmit={handleProcessPayment} className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div>
              <span className="text-xs font-bold text-amber-600 uppercase">Express Checkout</span>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">Direct Mobile Money Settlement</h2>
            </div>

            {/* Provider Radios */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Choose Mobile Provider</label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedProvider('MTN_MOMO')}
                  className={`p-3.5 rounded-2xl border-2 text-center transition-all cursor-pointer ${
                    selectedProvider === 'MTN_MOMO'
                      ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-100 ring-2 ring-amber-400/20'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className="text-sm font-black text-amber-600">MTN MoMo</div>
                  <div className="text-[10px] text-slate-400">*126# USSD Push</div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedProvider('ORANGE_MONEY')}
                  className={`p-3.5 rounded-2xl border-2 text-center transition-all cursor-pointer ${
                    selectedProvider === 'ORANGE_MONEY'
                      ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/40 text-orange-900 dark:text-orange-100 ring-2 ring-orange-400/20'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className="text-sm font-black text-orange-600">Orange Money</div>
                  <div className="text-[10px] text-slate-400">#150# USSD Push</div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedProvider('VISA_CARD')}
                  className={`p-3.5 rounded-2xl border-2 text-center transition-all cursor-pointer ${
                    selectedProvider === 'VISA_CARD'
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-100 ring-2 ring-indigo-400/20'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className="text-sm font-black text-indigo-600">Credit Card</div>
                  <div className="text-[10px] text-slate-400">Visa / Mastercard</div>
                </button>
              </div>
            </div>

            {/* Amount Field */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Amount to Pay (Montant à Verser en CFA)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1000"
                  step="500"
                  value={paymentAmount}
                  onChange={e => setPaymentAmount(Number(e.target.value))}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base font-black text-slate-900 dark:text-white"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">CFA</span>
              </div>
              <div className="flex gap-2 mt-2">
                {[10000, 25000, 45000, totalBalance].filter(a => a > 0).map(amt => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setPaymentAmount(amt)}
                    className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-lg text-[11px] font-bold"
                  >
                    {amt === totalBalance ? 'Full Balance' : `${amt.toLocaleString()} CFA`}
                  </button>
                ))}
              </div>
            </div>

            {/* Mobile Phone Number */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Mobile Account Number (Numéro Téléphone)
              </label>
              <input
                type="text"
                value={phoneNumber}
                onChange={e => setPhoneNumber(e.target.value)}
                placeholder="677 12 34 56"
                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold font-mono"
              />
            </div>

            {/* Payer Full Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Payer Full Name (Nom du Parent / Payeur)
              </label>
              <input
                type="text"
                value={payerName}
                onChange={e => setPayerName(e.target.value)}
                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
              />
            </div>

            <button
              type="submit"
              disabled={isProcessing || paymentAmount <= 0}
              className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-sm rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Waiting for USSD Push Approval on Phone...</span>
                </>
              ) : (
                <>
                  <Smartphone className="w-4 h-4" />
                  <span>Send USSD Push & Confirm {paymentAmount.toLocaleString()} CFA</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Printable Receipt Modal */}
      {printablePayment && (
        <PrintableReceiptA6
          receipt={printablePayment}
          student={currentStudent}
          bill={studentBills[0]}
          onClose={() => setPrintablePayment(null)}
        />
      )}
    </div>
  );
}

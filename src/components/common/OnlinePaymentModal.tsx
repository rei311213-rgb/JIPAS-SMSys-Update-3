import React, { useState } from 'react';
import { 
  CreditCard, 
  Smartphone, 
  ShieldCheck, 
  CheckCircle2, 
  X, 
  Printer, 
  AlertCircle, 
  Coins, 
  Check, 
  ArrowRight, 
  Loader2,
  Lock,
  Download
} from 'lucide-react';
import { Student, StudentBill, PaymentRecord } from '../../types';
import { 
  PAYMENT_CHANNELS, 
  PaymentChannelType, 
  processOnlineFeePayment 
} from '../../services/paymentGatewayService';
import PrintableReceiptA6 from './PrintableReceiptA6';
import JIPASLogo from './JIPASLogo';

export interface OnlinePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student;
  bill?: StudentBill;
  onPaymentSuccess?: (payment: PaymentRecord) => void;
}

export const OnlinePaymentModal: React.FC<OnlinePaymentModalProps> = ({
  isOpen,
  onClose,
  student,
  bill,
  onPaymentSuccess
}) => {
  const [selectedChannel, setSelectedChannel] = useState<PaymentChannelType>('TMONEY');
  const [amount, setAmount] = useState<number>(bill?.balance || 25000);
  const [phoneNumber, setPhoneNumber] = useState<string>(student.parentPhone || student.phone || '');
  const [payerName, setPayerName] = useState<string>(student.parentName || student.guardianName || 'Parent / Guardian');
  const [cardNumber, setCardNumber] = useState<string>('4532 •••• •••• 8921');
  const [cardExpiry, setCardExpiry] = useState<string>('12/28');
  const [cardCvc, setCardCvc] = useState<string>('842');
  const [description, setDescription] = useState<string>('Frais Scolaires / Tuition Fees');

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [completedPayment, setCompletedPayment] = useState<PaymentRecord | null>(null);
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentChannelInfo = PAYMENT_CHANNELS.find(c => c.id === selectedChannel)!;

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsProcessing(true);

    try {
      const res = await processOnlineFeePayment({
        student,
        bill,
        amount,
        channel: selectedChannel,
        phoneOrCardNumber: selectedChannel === 'VISA_MASTERCARD' ? cardNumber : phoneNumber,
        payerName,
        description
      });

      if (res.success && res.paymentRecord) {
        setCompletedPayment(res.paymentRecord);
        onPaymentSuccess?.(res.paymentRecord);
      } else {
        setErrorMessage(res.message || 'Payment processing failed. Please try again.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Payment communication error.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl max-w-xl w-full p-6 text-slate-200 space-y-5 animate-scale-in">
          
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Online Fee Payment Gateway</h3>
                <p className="text-xs text-slate-400">Mobile Money & Card Checkout for {student.fullName || student.name}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 bg-rose-950/40 border border-rose-800 rounded-2xl flex items-center gap-2 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Success State */}
          {completedPayment ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto animate-bounce">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xl font-black text-white">Payment Successfully Recorded!</h4>
                <p className="text-xs text-slate-400">
                  Receipt <strong className="text-indigo-400 font-mono">#{completedPayment.receiptNo}</strong> has been generated and verified.
                </p>
              </div>

              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-left space-y-2 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500">Student:</span>
                  <span className="text-white font-bold">{student.fullName || student.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Amount Paid:</span>
                  <span className="text-emerald-400 font-bold">{Number(completedPayment.amount).toLocaleString()} CFA</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Remaining Balance:</span>
                  <span className="text-amber-400 font-bold">{Number(completedPayment.balance || 0).toLocaleString()} CFA</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Channel / Ref:</span>
                  <span className="text-slate-300 truncate max-w-[200px]">{completedPayment.referenceNo}</span>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPrintModal(true)}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-indigo-950/40"
                >
                  <Printer className="w-4 h-4" />
                  <span>View & Print Official Receipt (4 on A4)</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handlePaySubmit} className="space-y-4">
              
              {/* Payment Channel Selection */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Select Mobile Money / Card Provider
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {PAYMENT_CHANNELS.map((chan) => (
                    <button
                      key={chan.id}
                      type="button"
                      onClick={() => setSelectedChannel(chan.id)}
                      className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        selectedChannel === chan.id
                          ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-xs'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-black text-white">{chan.name}</span>
                        {selectedChannel === chan.id && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                      </div>
                      <div className="text-[9px] text-slate-500 font-medium">{chan.countryBadge}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount & Account Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400">Amount to Pay (CFA)</label>
                  <input
                    type="number"
                    min="500"
                    step="500"
                    required
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm font-bold text-emerald-400 focus:outline-hidden focus:border-indigo-500 font-mono"
                  />
                  {bill && (
                    <div className="text-[10px] text-slate-500">
                      Total Bill: <strong>{Number(bill.payable ?? bill.subTotal ?? 0).toLocaleString()} CFA</strong>
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400">Payer Full Name</label>
                  <input
                    type="text"
                    required
                    value={payerName}
                    onChange={(e) => setPayerName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-indigo-500 font-medium"
                  />
                </div>
              </div>

              {/* Channel-Specific Input */}
              {selectedChannel === 'VISA_MASTERCARD' ? (
                <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold">
                    <span>Card Information</span>
                    <Lock className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <input
                    type="text"
                    required
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    placeholder="Card Number (4532 •••• •••• ••••)"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-hidden focus:border-indigo-500"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      required
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      placeholder="MM/YY"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-hidden focus:border-indigo-500"
                    />
                    <input
                      type="password"
                      required
                      maxLength={4}
                      value={cardCvc}
                      onChange={(e) => setCardCvc(e.target.value)}
                      placeholder="CVC"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400">
                    {currentChannelInfo.name} Mobile Number (Togo / West Africa)
                  </label>
                  <div className="relative">
                    <Smartphone className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                    <input
                      type="tel"
                      required
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="e.g. 90 12 34 56 or +228 90 12 34 56"
                      className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500">
                    A USSD prompt will be dispatched to this mobile phone to authorize the transaction.
                  </p>
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-2 flex items-center justify-between border-t border-slate-800">
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>256-Bit SSL Encrypted</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isProcessing}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isProcessing || amount <= 0}
                    className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black text-xs rounded-xl flex items-center gap-2 shadow-md shadow-emerald-950/30 cursor-pointer transition-all active:scale-95"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Authorizing with {currentChannelInfo.name}...</span>
                      </>
                    ) : (
                      <>
                        <span>Pay {amount.toLocaleString()} CFA</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>

            </form>
          )}

        </div>
      </div>

      {/* Printable Receipt Modal if requested */}
      {showPrintModal && completedPayment && (
        <PrintableReceiptA6
          receipt={completedPayment}
          student={student}
          bill={bill}
          onClose={() => setShowPrintModal(false)}
        />
      )}
    </>
  );
};

export default OnlinePaymentModal;

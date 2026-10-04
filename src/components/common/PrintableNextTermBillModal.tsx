import React, { useRef } from 'react';
import { Printer, X, Download, ShieldCheck, Calendar, User, BookOpen, AlertCircle } from 'lucide-react';
import { StudentBill, NextTermBillSetup } from '../../types';
import JIPASLogo from './JIPASLogo';
import ReceiptQRCode from './ReceiptQRCode';
import { SCHOOL_CONTACT } from '../../constants/schoolInfo';
import { getStoredSettings } from '../../services/storageService';

interface PrintableNextTermBillModalProps {
  bill: StudentBill;
  setup?: NextTermBillSetup;
  resumptionDate?: string;
  dueDate?: string;
  guardianName?: string;
  guardianPhone?: string;
  onClose: () => void;
}

export default function PrintableNextTermBillModal({
  bill,
  setup,
  resumptionDate = '12th January 2027',
  dueDate = '30th January 2027',
  guardianName,
  guardianPhone,
  onClose
}: PrintableNextTermBillModalProps) {
  const settings = getStoredSettings();
  const currency = (settings as any).currency || (settings as any).currencySymbol || 'CFA';
  const billPrintRef = useRef<HTMLDivElement>(null);

  const bankInfo = setup?.bankDetails || {
    bankName: 'Ecobank Togo / GCB Bank',
    accountNo: '001004523901 / 1041130004921',
    accountName: 'JOY INTERNATIONAL SCHOOL (JIPAS)',
    branch: 'Hedzranawoe / Lomé Main',
    momoCode: '489210 (JIPAS ACCOUNTS)'
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Modal Top Action Bar (hidden in print) */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-600 rounded-xl">
              <Printer className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Official Next Term Fee Invoice Preview</h3>
              <p className="text-xs text-slate-400">Bill #{bill.billNo} • Ready for high-resolution printing</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
            >
              <Printer className="w-4 h-4" /> Print Next Term Bill
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl cursor-pointer transition-colors"
              title="Close Preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Printable Container */}
        <div className="p-6 sm:p-10 overflow-y-auto bg-slate-50 print:bg-white print:p-0 print:overflow-visible">
          <div 
            ref={billPrintRef} 
            className="bg-white p-8 sm:p-10 rounded-2xl shadow-sm border border-slate-200 max-w-3xl mx-auto print:border-none print:shadow-none print:p-4 print:max-w-none text-slate-800 font-sans"
          >
            {/* Header Section */}
            <div className="flex flex-col items-center text-center pb-5 border-b-2 border-slate-800">
              <JIPASLogo size="md" className="mb-2" />
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight uppercase">
                JOY INTERNATIONAL SCHOOL (JIPAS)
              </h1>
              <p className="text-xs font-semibold text-indigo-700 tracking-wider uppercase mt-0.5">
                Bilingual Educational Complex • Excellence, Integrity & Leadership
              </p>
              <p className="text-[11px] text-slate-500 max-w-xl mt-1 leading-snug">
                {SCHOOL_CONTACT.address} | Tel: {SCHOOL_CONTACT.tel} | Email: {SCHOOL_CONTACT.email}
              </p>
              <div className="mt-3 inline-block px-4 py-1 bg-slate-900 text-white rounded-full text-xs font-extrabold tracking-widest uppercase">
                OFFICIAL NEXT TERM FEES INVOICE & RESUMPTION BILL
              </div>
            </div>

            {/* Bill Meta & Student Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-5 border-b border-slate-200 text-xs">
              <div className="space-y-1.5 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                <div className="flex items-center gap-1.5 font-bold text-indigo-800 uppercase tracking-wider text-[10px] mb-1">
                  <User className="w-3.5 h-3.5" /> Student Details
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Student Name:</span>
                  <span className="font-black text-slate-900">{bill.studentName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Admission No:</span>
                  <span className="font-mono font-bold text-slate-900">{bill.admissionNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Current Class:</span>
                  <span className="font-bold text-slate-900">{bill.className}</span>
                </div>
                {guardianName && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Parent / Guardian:</span>
                    <span className="font-medium text-slate-800">{guardianName} {guardianPhone ? `(${guardianPhone})` : ''}</span>
                  </div>
                )}
              </div>

              <div className="space-y-1.5 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                <div className="flex items-center gap-1.5 font-bold text-indigo-800 uppercase tracking-wider text-[10px] mb-1">
                  <Calendar className="w-3.5 h-3.5" /> Billing & Resumption Period
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Bill Number:</span>
                  <span className="font-mono font-bold text-indigo-700">{bill.billNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Target Academic Year:</span>
                  <span className="font-bold text-slate-900">{bill.academicYear}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Target Term:</span>
                  <span className="font-bold text-slate-900">{bill.term}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Next Term Resumes:</span>
                  <span className="font-black text-emerald-700">{setup?.resumptionDate || resumptionDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Payment Deadline:</span>
                  <span className="font-black text-rose-700">{setup?.dueDate || dueDate}</span>
                </div>
              </div>
            </div>

            {/* Itemized Fee Breakdown Table */}
            <div className="my-5">
              <h4 className="text-xs font-black uppercase text-slate-800 mb-2 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                Next Term Approved Fee Schedule
              </h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 text-white uppercase text-[10px] font-bold">
                    <tr>
                      <th className="p-2.5 w-10 text-center">#</th>
                      <th className="p-2.5">Fee Description</th>
                      <th className="p-2.5 text-right w-36">Amount ({currency})</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {bill.items.map((item, idx) => (
                      <tr key={idx} className={idx % 2 === 1 ? 'bg-slate-50/50' : ''}>
                        <td className="p-2.5 text-center text-slate-400 font-mono">{idx + 1}</td>
                        <td className="p-2.5 text-slate-800 font-semibold">{item.name}</td>
                        <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                          {Number(item.amount).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                    {bill.items.length === 0 && (
                      <tr>
                        <td colSpan={3} className="p-4 text-center text-slate-400 italic">
                          No specific fee items listed. Base tuition applies.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot className="bg-slate-100/80 font-bold border-t border-slate-200 divide-y divide-slate-200 text-xs">
                    <tr>
                      <td colSpan={2} className="p-2.5 text-right text-slate-700 uppercase text-[11px]">
                        Next Term Fee Subtotal:
                      </td>
                      <td className="p-2.5 text-right font-mono text-slate-900 font-bold">
                        {currency} {Number(bill.subTotal).toFixed(2)}
                      </td>
                    </tr>
                    {Number(bill.arrears) > 0 && (
                      <tr className="text-rose-700 bg-rose-50/50">
                        <td colSpan={2} className="p-2.5 text-right uppercase text-[11px]">
                          Outstanding Arrears Brought Forward:
                        </td>
                        <td className="p-2.5 text-right font-mono font-black">
                          + {currency} {Number(bill.arrears).toFixed(2)}
                        </td>
                      </tr>
                    )}
                    {Number(bill.discount) > 0 && (
                      <tr className="text-emerald-700 bg-emerald-50/50">
                        <td colSpan={2} className="p-2.5 text-right uppercase text-[11px]">
                          Approved Scholarship / Discount:
                        </td>
                        <td className="p-2.5 text-right font-mono font-black">
                          - {currency} {Number(bill.discount).toFixed(2)}
                        </td>
                      </tr>
                    )}
                    <tr className="bg-slate-900 text-white font-black text-sm">
                      <td colSpan={2} className="p-3 text-right uppercase tracking-wider">
                        TOTAL NEXT TERM AMOUNT PAYABLE:
                      </td>
                      <td className="p-3 text-right font-mono text-base text-yellow-300">
                        {currency} {Number(bill.payable).toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Payment Channels & Bank Instructions */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 bg-indigo-50/60 rounded-xl border border-indigo-100 text-xs my-5">
              <div className="md:col-span-8 space-y-1.5">
                <h5 className="font-extrabold text-indigo-950 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-indigo-700" /> Official Payment Channels
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-700 mt-2">
                  <div className="bg-white p-2.5 rounded-lg border border-indigo-100">
                    <span className="font-bold text-slate-900 block">Bank Account:</span>
                    <span className="font-mono font-bold text-indigo-800">{bankInfo.bankName}</span>
                    <div className="font-mono text-slate-800">A/C: {bankInfo.accountNo}</div>
                    <div className="text-[10px] text-slate-500">Name: {bankInfo.accountName}</div>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-indigo-100">
                    <span className="font-bold text-slate-900 block">Mobile Money Pay:</span>
                    <span className="font-mono font-bold text-emerald-700">MTN MoMo / Flooz</span>
                    <div className="font-mono text-slate-800">Merchant Code: {bankInfo.momoCode}</div>
                    <div className="text-[10px] text-slate-500">Reference: Student Admission No</div>
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 italic mt-1">
                  * Note: All payments must be completed before or upon resumption. Present deposit slip or MoMo transaction ID at the accounts desk for formal receipting.
                </p>
              </div>

              {/* QR Verification Code */}
              <div className="md:col-span-4 flex flex-col items-center justify-center text-center p-2 bg-white rounded-xl border border-indigo-100">
                <ReceiptQRCode
                  receiptNo={bill.billNo || 'BILL-NT'}
                  studentName={bill.studentName}
                  admissionNo={bill.admissionNo}
                  amount={bill.payable}
                  date={new Date().toISOString().slice(0, 10)}
                  size={72}
                  showLabel={false}
                />
                <span className="text-[9px] font-bold text-slate-500 mt-1 uppercase tracking-tight">
                  Scan to Verify Bill Authenticity
                </span>
              </div>
            </div>

            {/* Authorized Signature & Stamps */}
            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-slate-200 text-center text-xs mt-4">
              <div>
                <div className="h-10 border-b border-dashed border-slate-400"></div>
                <span className="text-[10px] font-bold text-slate-600 uppercase block mt-1">School Accountant</span>
              </div>
              <div className="flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-full border-2 border-dashed border-indigo-400 flex items-center justify-center text-[8px] font-bold text-indigo-700 rotate-6 uppercase">
                  Official Stamp
                </div>
              </div>
              <div>
                <div className="h-10 border-b border-dashed border-slate-400"></div>
                <span className="text-[10px] font-bold text-slate-600 uppercase block mt-1">Head of School / Director</span>
              </div>
            </div>

            {/* Perforated Tear-off Slip for Parents / Bank */}
            <div className="mt-8 pt-4 border-t-2 border-dashed border-slate-400 text-xs">
              <div className="flex items-center justify-between text-[10px] text-slate-500 mb-2 font-mono">
                <span>✂ PLEASE TEAR OFF & PRESENT TO BANK TELLER OR SUBMIT TO ACCOUNTS OFFICE</span>
                <span>JIPAS NEXT TERM DEPOSIT SLIP</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-400 block text-[9px]">Student:</span>
                  <span className="font-bold text-slate-900">{bill.studentName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px]">Admission No:</span>
                  <span className="font-mono font-bold text-slate-900">{bill.admissionNo}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px]">Class / Term:</span>
                  <span className="font-bold text-slate-900">{bill.className} • {bill.term}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px]">Total Payable:</span>
                  <span className="font-mono font-black text-rose-700">{currency} {Number(bill.payable).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Actions */}
        <div className="px-6 py-3 bg-slate-100 border-t border-slate-200 flex justify-end gap-2 print:hidden">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 cursor-pointer transition-colors"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow cursor-pointer transition-all"
          >
            <Printer className="w-4 h-4" /> Print Next Term Bill
          </button>
        </div>
      </div>
    </div>
  );
}

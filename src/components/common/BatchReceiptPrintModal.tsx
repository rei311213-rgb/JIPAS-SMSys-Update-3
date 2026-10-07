import React, { useState, useMemo } from 'react';
import { 
  Printer, 
  X, 
  Globe, 
  FileCheck, 
  Coins, 
  Check, 
  ChevronRight, 
  Layers, 
  FileText, 
  AlertCircle,
  Eye,
  Trash2,
  Sparkles
} from 'lucide-react';
import { PaymentRecord, Student, StudentBill } from '../../types';
import { getStoredSettings } from '../../services/storageService';
import JIPASLogo from './JIPASLogo';
import ReceiptQRCode from './ReceiptQRCode';

// English Number to Words Converter
function numberToWordsEN(num: number): string {
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  if (num === 0) return 'Zero';
  
  const convertLessThanOneThousand = (n: number): string => {
    if (n < 20) return a[n];
    const digit = n % 10;
    if (n < 100) return b[Math.floor(n / 10)] + (digit ? '-' + a[digit] : '');
    const hundred = Math.floor(n / 100);
    const rest = n % 100;
    return a[hundred] + ' Hundred' + (rest ? ' and ' + convertLessThanOneThousand(rest) : '');
  };

  let numCopy = Math.round(num);
  let word = '';
  if (numCopy >= 1000000) {
    word += convertLessThanOneThousand(Math.floor(numCopy / 1000000)) + ' Million ';
    numCopy %= 1000000;
  }
  if (numCopy >= 1000) {
    word += convertLessThanOneThousand(Math.floor(numCopy / 1000)) + ' Thousand ';
    numCopy %= 1000;
  }
  if (numCopy > 0) word += convertLessThanOneThousand(numCopy);
  return word.trim() + ' CFA Only';
}

// French Number to Words Converter
function numberToWordsFR(num: number): string {
  const units = ['', 'Un', 'Deux', 'Trois', 'Quatre', 'Cinq', 'Six', 'Sept', 'Huit', 'Neuf', 'Dix', 'Onze', 'Douze', 'Treize', 'Quatorze', 'Quinze', 'Seize', 'Dix-Sept', 'Dix-Huit', 'Dix-Neuf'];
  const tens = ['', '', 'Vingt', 'Trente', 'Quarante', 'Cinquante', 'Soixante', 'Soixante-Dix', 'Quatre-Vingt', 'Quatre-Vingt-Dix'];
  if (num === 0) return 'Zéro';
  
  const convert = (n: number): string => {
    if (n < 20) return units[n];
    if (n < 100) {
      const ten = Math.floor(n / 10);
      const unit = n % 10;
      if (ten === 7) return 'Soixante' + (unit === 1 ? ' et Onze' : '-' + convert(10 + unit));
      if (ten === 9) return 'Quatre-Vingt' + '-' + convert(10 + unit);
      return tens[ten] + (unit === 1 ? ' et Un' : unit ? '-' + units[unit] : '');
    }
    if (n < 1000) {
      const hundred = Math.floor(n / 100);
      const rest = n % 100;
      const hundredStr = hundred === 1 ? 'Cent' : units[hundred] + ' Cent';
      return hundredStr + (rest ? ' ' + convert(rest) : '');
    }
    return '';
  };
  
  let numCopy = Math.round(num);
  let word = '';
  if (numCopy >= 1000000) {
    word += convert(Math.floor(numCopy / 1000000)) + ' Million ';
    numCopy %= 1000000;
  }
  if (numCopy >= 1000) {
    const thousands = Math.floor(numCopy / 1000);
    word += (thousands === 1 ? 'Mille' : convert(thousands) + ' Mille') + ' ';
    numCopy %= 1000;
  }
  if (numCopy > 0) word += convert(numCopy);
  return (word.trim() || 'Zéro') + ' Francs CFA Seulement';
}

export interface BatchReceiptPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPaymentIds: string[];
  payments: PaymentRecord[];
  students: Student[];
  bills?: StudentBill[];
  initialPaperMode?: 'a4_four_per_page' | 'a6_single';
}

export const BatchReceiptPrintModal: React.FC<BatchReceiptPrintModalProps> = ({
  isOpen,
  onClose,
  selectedPaymentIds,
  payments,
  students,
  bills = [],
  initialPaperMode = 'a4_four_per_page'
}) => {
  const [activeIds, setActiveIds] = useState<string[]>(selectedPaymentIds);
  const [paperMode, setPaperMode] = useState<'a4_four_per_page' | 'a6_single'>(initialPaperMode);
  const [language, setLanguage] = useState<'FR' | 'EN'>('FR');
  const [stampColor, setStampColor] = useState<'emerald' | 'blue' | 'none'>('emerald');
  const [copyTitle, setCopyTitle] = useState<string>('Copie Caisse / Parent');
  const [isPrinting, setIsPrinting] = useState(false);

  // Sync state if selectedPaymentIds changes
  React.useEffect(() => {
    setActiveIds(selectedPaymentIds);
  }, [selectedPaymentIds]);

  const schoolSettings = useMemo(() => getStoredSettings(), []);

  // Filter actual payment records
  const targetPayments = useMemo(() => {
    return payments.filter(p => activeIds.includes(p.id));
  }, [payments, activeIds]);

  // Aggregate metrics
  const totalAmount = useMemo(() => {
    return targetPayments.reduce((sum, p) => sum + Number(p.amount ?? p.paid ?? 0), 0);
  }, [targetPayments]);

  const pagesRequired = useMemo(() => {
    if (paperMode === 'a4_four_per_page') {
      return Math.ceil(targetPayments.length / 4);
    }
    return targetPayments.length;
  }, [targetPayments.length, paperMode]);

  if (!isOpen) return null;

  const toggleSelectAll = () => {
    if (activeIds.length === selectedPaymentIds.length) {
      setActiveIds([]);
    } else {
      setActiveIds(selectedPaymentIds);
    }
  };

  const toggleId = (id: string) => {
    setActiveIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handlePrint = () => {
    if (targetPayments.length === 0) return;
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 300);
  };

  const dict = {
    FR: {
      receiptTitle: 'Reçu Officiel de Caisse',
      receiptNo: 'N° de Reçu',
      date: 'Date de Caisse',
      studentName: 'Nom de l\'Élève',
      admissionNo: 'Matricule',
      classStream: 'Classe',
      academicYear: 'Année Acad.',
      term: 'Trimestre',
      paymentMethod: 'Mode',
      amountPaid: 'Montant Versé',
      balanceDue: 'Solde Restant',
      particulars: 'Libellé des Frais',
      amountInWords: 'Arrêté à la somme de',
      cashier: 'Caissier / Caisse',
      signature: 'Signature & Cachet',
      verified: 'VALIDÉ JIPAS',
      nonRefundable: 'N.B. Frais scolaires non remboursables.',
    },
    EN: {
      receiptTitle: 'Official Cash Receipt',
      receiptNo: 'Receipt No',
      date: 'Date',
      studentName: 'Student Name',
      admissionNo: 'Admission No',
      classStream: 'Class',
      academicYear: 'Academic Year',
      term: 'Term',
      paymentMethod: 'Method',
      amountPaid: 'Amount Paid',
      balanceDue: 'Balance Due',
      particulars: 'Particulars',
      amountInWords: 'Amount in Words',
      cashier: 'Cashier Desk',
      signature: 'Signature & Stamp',
      verified: 'JIPAS VERIFIED',
      nonRefundable: 'N.B. School fees paid are non-refundable.',
    }
  }[language];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto print:static print:bg-white print:p-0 print:m-0 print:block">
      
      {/* ------------------------------------------------------------- */}
      {/* DEDICATED PRINT ENGINE STYLESHEET                             */}
      {/* ------------------------------------------------------------- */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-batch-receipt-container, 
          #printable-batch-receipt-container * {
            visibility: visible !important;
          }
          #printable-batch-receipt-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 210mm !important;
            margin: 0 auto !important;
            padding: 0 !important;
            background: #ffffff !important;
            box-sizing: border-box !important;
          }

          /* A4 4-on-1 Layout: 2 Columns × 2 Rows */
          .batch-a4-page-grid {
            width: 210mm !important;
            height: 292mm !important;
            box-sizing: border-box !important;
            padding: 4mm 4mm !important;
            margin: 0 auto !important;
            display: grid !important;
            grid-template-columns: 101mm 101mm !important;
            grid-template-rows: 141mm 141mm !important;
            gap: 2mm !important;
            page-break-after: always !important;
            break-after: page !important;
            background: #ffffff !important;
          }

          /* Single Receipt Box within 4-on-1 A4 Grid */
          .batch-receipt-voucher {
            width: 101mm !important;
            height: 141mm !important;
            max-width: 101mm !important;
            max-height: 141mm !important;
            box-sizing: border-box !important;
            padding: 3.5mm 3.5mm !important;
            border: 1px dashed #334155 !important;
            background: #ffffff !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            overflow: hidden !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            position: relative !important;
          }

          /* A6 Single Mode */
          .batch-a6-single-page {
            width: 105mm !important;
            height: 148mm !important;
            box-sizing: border-box !important;
            padding: 4mm !important;
            margin: 0 auto !important;
            border: 1px dashed #334155 !important;
            page-break-after: always !important;
            break-after: page !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
          }

          /* Print color and text contrast enforcement */
          .batch-receipt-voucher *,
          .batch-a6-single-page * {
            color: #000000 !important;
            border-color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>

      {/* Screen Control Panel & Live Preview */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl max-w-5xl w-full flex flex-col max-h-[92vh] overflow-hidden print:hidden text-slate-200">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white tracking-tight">Batch Receipt Print Center</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-600 text-white uppercase tracking-wider">
                  Phase 55 Production
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Print multiple official fee payment receipts in a standardized 4-per-A4 paper layout or single A6 format.
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Controls & Layout Config */}
        <div className="p-5 border-b border-slate-800 bg-slate-900/80 grid grid-cols-1 md:grid-cols-4 gap-4">
          
          {/* Paper Format Selector */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              Paper & Layout Mode
            </label>
            <div className="grid grid-cols-2 gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setPaperMode('a4_four_per_page')}
                className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer text-center ${
                  paperMode === 'a4_four_per_page' 
                    ? 'bg-indigo-600 text-white shadow-xs' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                4 on 1 A4 (2×2)
              </button>
              <button
                type="button"
                onClick={() => setPaperMode('a6_single')}
                className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer text-center ${
                  paperMode === 'a6_single' 
                    ? 'bg-indigo-600 text-white shadow-xs' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Single A6 Slip
              </button>
            </div>
          </div>

          {/* Language Selector */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-slate-400" />
              Bilingual Language
            </label>
            <div className="grid grid-cols-2 gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setLanguage('FR')}
                className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer text-center ${
                  language === 'FR' 
                    ? 'bg-indigo-600 text-white shadow-xs' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Français (Togo)
              </button>
              <button
                type="button"
                onClick={() => setLanguage('EN')}
                className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer text-center ${
                  language === 'EN' 
                    ? 'bg-indigo-600 text-white shadow-xs' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                English Format
              </button>
            </div>
          </div>

          {/* Stamp Style */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5 text-slate-400" />
              Security Stamp
            </label>
            <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setStampColor('emerald')}
                className={`py-1 text-[11px] font-bold rounded-lg cursor-pointer ${
                  stampColor === 'emerald' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Emerald
              </button>
              <button
                type="button"
                onClick={() => setStampColor('blue')}
                className={`py-1 text-[11px] font-bold rounded-lg cursor-pointer ${
                  stampColor === 'blue' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Blue
              </button>
              <button
                type="button"
                onClick={() => setStampColor('none')}
                className={`py-1 text-[11px] font-bold rounded-lg cursor-pointer ${
                  stampColor === 'none' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                None
              </button>
            </div>
          </div>

          {/* Copy Designation Header */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              Copy Label
            </label>
            <input
              type="text"
              value={copyTitle}
              onChange={(e) => setCopyTitle(e.target.value)}
              placeholder="e.g. Copie Caisse"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-hidden focus:border-indigo-500"
            />
          </div>

        </div>

        {/* Content Body: Left Column Selection Table, Right Column Preview */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-800">
          
          {/* Left: Transaction Selection List (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col h-full overflow-hidden bg-slate-950/40">
            <div className="p-3 border-b border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={activeIds.length === selectedPaymentIds.length && selectedPaymentIds.length > 0}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded border-slate-700 text-indigo-600 cursor-pointer"
                />
                <span className="font-bold text-slate-300">
                  {activeIds.length} of {selectedPaymentIds.length} Selected
                </span>
              </div>
              <span className="font-mono font-bold text-emerald-400 text-xs">
                {totalAmount.toLocaleString()} CFA
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {targetPayments.length === 0 ? (
                <div className="p-8 text-center text-slate-500 space-y-2">
                  <AlertCircle className="w-8 h-8 mx-auto text-slate-600" />
                  <p className="text-xs">No receipts selected for batch printing.</p>
                </div>
              ) : (
                targetPayments.map((p, idx) => (
                  <div 
                    key={p.id}
                    onClick={() => toggleId(p.id)}
                    className="p-3 bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 rounded-2xl flex items-center justify-between gap-3 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={activeIds.includes(p.id)}
                        onChange={() => {}}
                        className="w-4 h-4 rounded border-slate-700 text-indigo-600 cursor-pointer"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] font-bold text-indigo-400">{p.receiptNo}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{p.date}</span>
                        </div>
                        <div className="font-bold text-xs text-white truncate max-w-[160px]">{p.studentName}</div>
                        <div className="text-[10px] text-slate-400">{p.className} • {p.admissionNo}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-extrabold text-xs text-emerald-400">
                        {Number(p.amount ?? p.paid ?? 0).toLocaleString()} CFA
                      </div>
                      <div className="text-[9px] text-slate-500 capitalize">{p.paymentMethod || p.method}</div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Metrics summary bar */}
            <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
              <div>
                Sheets Required: <strong className="text-white font-mono">{pagesRequired}</strong> {paperMode === 'a4_four_per_page' ? 'A4 Paper(s)' : 'A6 Slips'}
              </div>
              <div className="text-slate-400">
                {paperMode === 'a4_four_per_page' ? '4 receipts / page' : '1 receipt / page'}
              </div>
            </div>
          </div>

          {/* Right: Visual Preview (7 Cols) */}
          <div className="lg:col-span-7 flex flex-col h-full overflow-hidden bg-slate-900/40 p-4">
            <div className="flex items-center justify-between mb-3 text-xs">
              <span className="font-bold text-slate-300 flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-indigo-400" />
                Live Print Layout Preview (Sheet 1)
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                {paperMode === 'a4_four_per_page' ? 'A4 Paper (210mm × 297mm)' : 'A6 Slip (105mm × 148mm)'}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-950 p-4 rounded-2xl border border-slate-800 flex justify-center">
              {paperMode === 'a4_four_per_page' ? (
                /* Mock A4 2x2 Grid Sheet Preview */
                <div className="w-[360px] h-[508px] bg-white rounded-lg shadow-xl text-slate-900 p-2 grid grid-cols-2 grid-rows-2 gap-1.5 border border-slate-300 relative select-none">
                  {/* Render up to 4 mock receipts */}
                  {Array.from({ length: 4 }).map((_, slotIdx) => {
                    const receiptItem = targetPayments[slotIdx];
                    if (!receiptItem) {
                      return (
                        <div key={slotIdx} className="border border-dashed border-slate-200 rounded p-2 flex items-center justify-center text-slate-300 text-[9px] italic">
                          Empty Slot
                        </div>
                      );
                    }
                    const amt = Number(receiptItem.amount ?? receiptItem.paid ?? 0);
                    return (
                      <div key={slotIdx} className="border border-dashed border-slate-400 rounded p-1.5 flex flex-col justify-between text-[7px] leading-tight bg-slate-50/50">
                        <div>
                          <div className="flex justify-between items-center border-b border-slate-300 pb-0.5">
                            <span className="font-black text-[7.5px] uppercase truncate max-w-[100px]">JOY INT'L SCHOOL</span>
                            <span className="bg-slate-900 text-white font-black text-[5.5px] px-1 rounded-xs">REÇU DE CAISSE</span>
                          </div>
                          <div className="flex justify-between my-0.5 text-[6.5px] font-mono text-slate-600">
                            <span>N°: <strong className="text-blue-900">{receiptItem.receiptNo}</strong></span>
                            <span>{receiptItem.date}</span>
                          </div>
                          <div className="bg-white border border-slate-200 rounded p-1 space-y-0.5 my-0.5 text-[6.5px]">
                            <div className="truncate"><strong>Élève:</strong> {receiptItem.studentName}</div>
                            <div className="truncate"><strong>Matricule:</strong> {receiptItem.admissionNo} • {receiptItem.className}</div>
                          </div>
                          <div className="border border-slate-200 rounded p-0.5 bg-slate-100 flex justify-between font-bold text-[7px]">
                            <span>Montant Versé:</span>
                            <span className="font-mono text-emerald-800">{amt.toLocaleString()} CFA</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-slate-200 text-[5.5px] text-slate-500">
                          <span>✂ Découper ici</span>
                          <span className="font-bold text-slate-700">Cachet JIPAS</span>
                        </div>
                      </div>
                    );
                  })}
                  <div className="absolute top-1/2 left-0 right-0 border-b border-dashed border-slate-300 pointer-events-none" />
                  <div className="absolute left-1/2 top-0 bottom-0 border-r border-dashed border-slate-300 pointer-events-none" />
                </div>
              ) : (
                /* Mock A6 Single Slip Preview */
                <div className="w-[240px] h-[340px] bg-white rounded-lg shadow-xl text-slate-900 p-3 flex flex-col justify-between border border-slate-300 select-none text-[8px]">
                  {targetPayments[0] ? (
                    <>
                      <div>
                        <div className="flex justify-between items-center border-b border-slate-900 pb-1">
                          <div>
                            <span className="font-black text-[9px] uppercase block">JOY INT'L SCHOOL</span>
                            <span className="text-[6.5px] text-slate-500">BP 2364 Lomé Togo</span>
                          </div>
                          <span className="bg-slate-900 text-white font-black text-[7px] px-1.5 py-0.5 rounded-xs">REÇU A6</span>
                        </div>
                        <div className="flex justify-between my-1 font-mono text-[7.5px]">
                          <span>N°: <strong className="text-blue-800">{targetPayments[0].receiptNo}</strong></span>
                          <span>{targetPayments[0].date}</span>
                        </div>
                        <div className="bg-slate-50 border border-slate-200 rounded p-1.5 space-y-0.5 my-1 text-[7.5px]">
                          <div><strong>Nom:</strong> {targetPayments[0].studentName}</div>
                          <div><strong>Matricule:</strong> {targetPayments[0].admissionNo}</div>
                          <div><strong>Classe:</strong> {targetPayments[0].className}</div>
                        </div>
                        <div className="bg-emerald-50 border border-emerald-200 rounded p-1.5 flex justify-between font-bold text-[8px] text-emerald-950">
                          <span>Montant Versé:</span>
                          <span className="font-mono">{Number(targetPayments[0].amount ?? targetPayments[0].paid ?? 0).toLocaleString()} CFA</span>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-slate-200 flex justify-between text-[6.5px] text-slate-500">
                        <span>Reçu Officiel Sécurisé</span>
                        <span className="font-bold">Signature Caissier</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-full text-slate-400">Select receipts to preview</div>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Ready to render {targetPayments.length} receipts on {pagesRequired} {paperMode === 'a4_four_per_page' ? 'A4 page(s)' : 'slip(s)'}.</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 text-xs font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handlePrint}
              disabled={targetPayments.length === 0 || isPrinting}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-black flex items-center gap-2 shadow-lg shadow-indigo-950/30 cursor-pointer transition-all active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>
                {isPrinting ? 'Preparing Print...' : `Print ${targetPayments.length} Receipts (${paperMode === 'a4_four_per_page' ? '4 on A4' : 'A6'})`}
              </span>
            </button>
          </div>
        </div>

      </div>

      {/* ------------------------------------------------------------- */}
      {/* PHYSICAL PRINT TARGET CONTAINER                                */}
      {/* ------------------------------------------------------------- */}
      <div id="printable-batch-receipt-container" className="hidden print:block font-sans text-black">
        {paperMode === 'a4_four_per_page' ? (
          /* Group target payments in sets of 4 for clean A4 pages */
          Array.from({ length: Math.ceil(targetPayments.length / 4) }).map((_, pageIdx) => {
            const pagePayments = targetPayments.slice(pageIdx * 4, pageIdx * 4 + 4);
            return (
              <div key={pageIdx} className="batch-a4-page-grid">
                {pagePayments.map((p, receiptIdx) => {
                  const matchedBill = bills.find(b => b.studentId === p.studentId || (p.admissionNo && b.admissionNo === p.admissionNo));
                  const amountVal = Number(p.amount ?? p.paid ?? 0);
                  const arrearsVal = Number(p.arrears ?? matchedBill?.arrears ?? 0);
                  const balanceVal = Number(p.balance ?? matchedBill?.balance ?? 0);
                  const payableVal = Number(p.payable ?? matchedBill?.payable ?? (amountVal + balanceVal));
                  const amountInWords = language === 'FR' ? numberToWordsFR(amountVal) : numberToWordsEN(amountVal);
                  const termDisplay = p.term || matchedBill?.term || schoolSettings.activeTerm || 'First Term';
                  const yearDisplay = p.academicYear || matchedBill?.academicYear || schoolSettings.activeAcademicYear || '2025-2026';
                  const verificationHash = `JPS-${(p.receiptNo || '').slice(-6).toUpperCase()}-${(p.date || '').replace(/-/g, '')}-${amountVal}`;

                  return (
                    <div key={p.id} className="batch-receipt-voucher">
                      {/* Top Header */}
                      <div>
                        <div className="flex items-start justify-between gap-1.5 border-b border-black pb-1">
                          <div className="flex items-center gap-1.5">
                            <JIPASLogo size="sm" className="shrink-0" rounded={true} />
                            <div className="leading-tight">
                              <h1 className="text-[8.5px] font-black uppercase tracking-tight text-black">
                                {schoolSettings.schoolName || 'JOY INTERNATIONAL SCHOOL (JIPAS)'}
                              </h1>
                              <p className="text-[5.5px] text-black font-bold italic">
                                "{schoolSettings.schoolMotto || 'Knowledge, Discipline & Excellence'}"
                              </p>
                              <p className="text-[5px] text-black font-medium leading-none">
                                {schoolSettings.address ? `${schoolSettings.address}` : 'BP 2364 Lomé Togo'} • Tel: {schoolSettings.phone || '(00228) 22 60 21 38'}
                              </p>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="inline-block bg-black text-white text-[6.5px] font-black uppercase px-1 py-0.5 tracking-wide">
                              {dict.receiptTitle}
                            </span>
                            <div className="text-[5px] font-black text-black uppercase tracking-wider mt-0.5">
                              {copyTitle}
                            </div>
                          </div>
                        </div>

                        {/* Metadata Banner */}
                        <div className="bg-white px-1.5 py-0.5 my-1 border border-black flex justify-between items-center text-[6.5px] font-bold font-mono">
                          <div>
                            <span>{dict.receiptNo}: </span>
                            <span className="font-black text-black">{p.receiptNo}</span>
                          </div>
                          <div className="flex gap-2 text-black">
                            <span>{dict.date}: <strong>{p.date}</strong></span>
                            {p.referenceNo && (
                              <span>Ref: <strong>{(p.referenceNo || '').slice(-6).toUpperCase()}</strong></span>
                            )}
                          </div>
                        </div>

                        {/* Student Details Grid */}
                        <div className="grid grid-cols-2 gap-1 text-[7px] bg-white border border-black p-1 mb-1">
                          <div className="space-y-0.5">
                            <div className="flex justify-between">
                              <span>{dict.studentName}:</span>
                              <strong className="text-black font-black truncate max-w-[85px]">{p.studentName}</strong>
                            </div>
                            <div className="flex justify-between">
                              <span>{dict.admissionNo}:</span>
                              <strong className="text-black font-mono font-black">{p.admissionNo}</strong>
                            </div>
                            <div className="flex justify-between">
                              <span>{dict.classStream}:</span>
                              <strong className="text-black truncate max-w-[85px]">{p.className}</strong>
                            </div>
                          </div>
                          <div className="space-y-0.5 border-l border-black pl-1">
                            <div className="flex justify-between">
                              <span>{dict.academicYear}:</span>
                              <strong className="text-black">{yearDisplay}</strong>
                            </div>
                            <div className="flex justify-between">
                              <span>{dict.term}:</span>
                              <strong className="text-black">{termDisplay}</strong>
                            </div>
                            <div className="flex justify-between">
                              <span>{dict.paymentMethod}:</span>
                              <strong className="text-black font-bold">{p.paymentMethod || p.method}</strong>
                            </div>
                          </div>
                        </div>

                        {/* Fee Particulars Table */}
                        <table className="w-full text-left text-[6.5px] border-collapse mb-1">
                          <thead>
                            <tr className="bg-black text-white text-[6px] uppercase font-bold tracking-wider">
                              <th className="p-0.5 border border-black">{dict.particulars}</th>
                              <th className="p-0.5 text-right border border-black">{language === 'FR' ? 'Montant (CFA)' : 'Amount (CFA)'}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-black font-mono">
                            {arrearsVal > 0 && (
                              <tr className="text-black">
                                <td className="p-0.5 font-sans">Arriérés Antérieurs</td>
                                <td className="p-0.5 text-right">{arrearsVal.toLocaleString()} CFA</td>
                              </tr>
                            )}
                            <tr>
                              <td className="p-0.5 font-semibold font-sans truncate max-w-[110px]">
                                {p.notes || p.paidAs || (language === 'FR' ? 'Frais Scolaires' : 'School Fees')}
                              </td>
                              <td className="p-0.5 text-right font-bold">{(payableVal - arrearsVal).toLocaleString()} CFA</td>
                            </tr>
                            <tr className="bg-white font-bold text-black border-t border-black">
                              <td className="p-0.5 font-sans">Net à Payer (Total)</td>
                              <td className="p-0.5 text-right">{payableVal.toLocaleString()} CFA</td>
                            </tr>
                            <tr className="bg-white font-black text-black text-[7.5px] border-t-2 border-black">
                              <td className="p-0.5 font-sans">{dict.amountPaid}</td>
                              <td className="p-0.5 text-right font-mono font-black">{amountVal.toLocaleString()} CFA</td>
                            </tr>
                            <tr className="bg-white font-bold text-black">
                              <td className="p-0.5 font-sans">{dict.balanceDue}</td>
                              <td className="p-0.5 text-right">{balanceVal.toLocaleString()} CFA</td>
                            </tr>
                          </tbody>
                        </table>

                        {/* Amount in words */}
                        <div className="border border-black p-0.5 text-[5.5px] text-black leading-tight bg-white mb-1">
                          <span className="font-bold">{dict.amountInWords}: </span>
                          <span className="italic font-semibold">"{amountInWords}"</span>
                        </div>
                      </div>

                      {/* Bottom Footer: QR Code, Stamp & Signature */}
                      <div>
                        <div className="grid grid-cols-12 gap-1 border-t border-black pt-1 items-end">
                          <div className="col-span-4 flex items-center">
                            <ReceiptQRCode
                              receiptId={p.id}
                              receiptNo={p.receiptNo}
                              referenceNo={p.referenceNo}
                              studentName={p.studentName}
                              admissionNo={p.admissionNo}
                              amount={amountVal}
                              date={p.date}
                              size={36}
                              showLabel={false}
                            />
                          </div>
                          <div className="col-span-4 flex items-center justify-center">
                            {stampColor !== 'none' && (
                              <div className="w-9 h-9 rounded-full border border-black flex flex-col items-center justify-center text-center rotate-6 leading-none">
                                <span className="text-[3px] font-black">JOY INT'L</span>
                                <span className="text-[4px] font-black my-0.5">{dict.verified}</span>
                                <span className="text-[2.5px] font-mono">{(p.id || '').slice(0, 5).toUpperCase()}</span>
                              </div>
                            )}
                          </div>
                          <div className="col-span-4 text-right flex flex-col justify-end">
                            <span className="text-[5px] text-black font-semibold truncate">
                              {p.receivedBy || p.collectedBy || dict.cashier}
                            </span>
                            <div className="border-t border-dashed border-black mt-2 pt-0.5 text-[5px] text-black uppercase font-bold text-center">
                              {dict.signature}
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-between items-center text-[4.5px] text-black border-t border-black mt-0.5 pt-0.5 leading-none">
                          <span>{dict.nonRefundable}</span>
                          <span className="font-mono">{verificationHash}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })
        ) : (
          /* Single A6 Slip per page mode */
          targetPayments.map((p) => {
            const matchedBill = bills.find(b => b.studentId === p.studentId || (p.admissionNo && b.admissionNo === p.admissionNo));
            const amountVal = Number(p.amount ?? p.paid ?? 0);
            const arrearsVal = Number(p.arrears ?? matchedBill?.arrears ?? 0);
            const balanceVal = Number(p.balance ?? matchedBill?.balance ?? 0);
            const payableVal = Number(p.payable ?? matchedBill?.payable ?? (amountVal + balanceVal));
            const amountInWords = language === 'FR' ? numberToWordsFR(amountVal) : numberToWordsEN(amountVal);
            const termDisplay = p.term || matchedBill?.term || schoolSettings.activeTerm || 'First Term';
            const yearDisplay = p.academicYear || matchedBill?.academicYear || schoolSettings.activeAcademicYear || '2025-2026';
            const verificationHash = `JPS-${(p.receiptNo || '').slice(-6).toUpperCase()}-${(p.date || '').replace(/-/g, '')}-${amountVal}`;

            return (
              <div key={p.id} className="batch-a6-single-page">
                <div>
                  <div className="flex items-start justify-between gap-2 border-b border-black pb-1">
                    <div className="flex items-center gap-2">
                      <JIPASLogo size="sm" className="shrink-0" rounded={true} />
                      <div className="leading-tight">
                        <h1 className="text-[10px] font-black uppercase tracking-tight text-black">
                          {schoolSettings.schoolName || 'JOY INTERNATIONAL SCHOOL (JIPAS)'}
                        </h1>
                        <p className="text-[6px] text-black font-bold italic">
                          "{schoolSettings.schoolMotto || 'Knowledge, Discipline & Excellence'}"
                        </p>
                        <p className="text-[5.5px] text-black font-medium">
                          {schoolSettings.address ? `${schoolSettings.address}` : 'BP 2364 Lomé Togo'} • Tel: {schoolSettings.phone || '(00228) 22 60 21 38'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="inline-block bg-black text-white text-[7px] font-black uppercase px-1.5 py-0.5 tracking-wide">
                        {dict.receiptTitle}
                      </span>
                      <div className="text-[6px] font-black text-black uppercase tracking-widest mt-0.5">
                        {copyTitle}
                      </div>
                    </div>
                  </div>

                  <div className="bg-white px-2 py-0.5 my-1.5 border border-black flex justify-between items-center text-[7.5px] font-bold font-mono">
                    <div>
                      <span>{dict.receiptNo}: </span>
                      <span className="font-black text-black">{p.receiptNo}</span>
                    </div>
                    <div className="flex gap-2 text-black">
                      <span>{dict.date}: <strong>{p.date}</strong></span>
                      {p.referenceNo && (
                        <span>Ref: <strong>{(p.referenceNo || '').slice(-6).toUpperCase()}</strong></span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 text-[8px] bg-white border border-black p-1.5 mb-1.5">
                    <div className="space-y-0.5">
                      <div className="flex justify-between">
                        <span>{dict.studentName}:</span>
                        <strong className="text-black font-black truncate max-w-[100px]">{p.studentName}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>{dict.admissionNo}:</span>
                        <strong className="text-black font-mono font-black">{p.admissionNo}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>{dict.classStream}:</span>
                        <strong className="text-black truncate max-w-[100px]">{p.className}</strong>
                      </div>
                    </div>
                    <div className="space-y-0.5 border-l border-black pl-1.5">
                      <div className="flex justify-between">
                        <span>{dict.academicYear}:</span>
                        <strong className="text-black">{yearDisplay}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>{dict.term}:</span>
                        <strong className="text-black">{termDisplay}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>{dict.paymentMethod}:</span>
                        <strong className="text-black font-bold">{p.paymentMethod || p.method}</strong>
                      </div>
                    </div>
                  </div>

                  <table className="w-full text-left text-[7.5px] border-collapse mb-1.5">
                    <thead>
                      <tr className="bg-black text-white text-[7px] uppercase font-bold tracking-wider">
                        <th className="p-0.5 border border-black">{dict.particulars}</th>
                        <th className="p-0.5 text-right border border-black">{language === 'FR' ? 'Montant (CFA)' : 'Amount (CFA)'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black font-mono">
                      {arrearsVal > 0 && (
                        <tr className="text-black">
                          <td className="p-0.5 font-sans">Arriérés Antérieurs</td>
                          <td className="p-0.5 text-right">{arrearsVal.toLocaleString()} CFA</td>
                        </tr>
                      )}
                      <tr>
                        <td className="p-0.5 font-semibold font-sans">{p.notes || p.paidAs || 'Frais de Scolarité'}</td>
                        <td className="p-0.5 text-right font-bold">{(payableVal - arrearsVal).toLocaleString()} CFA</td>
                      </tr>
                      <tr className="bg-white font-bold text-black border-t border-black">
                        <td className="p-0.5 font-sans">Net à Payer</td>
                        <td className="p-0.5 text-right">{payableVal.toLocaleString()} CFA</td>
                      </tr>
                      <tr className="bg-white font-black text-black text-[8px] border-t-2 border-black">
                        <td className="p-0.5 font-sans">{dict.amountPaid}</td>
                        <td className="p-0.5 text-right font-mono font-black">{amountVal.toLocaleString()} CFA</td>
                      </tr>
                      <tr className="bg-white font-bold text-black">
                        <td className="p-0.5 font-sans">{dict.balanceDue}</td>
                        <td className="p-0.5 text-right">{balanceVal.toLocaleString()} CFA</td>
                      </tr>
                    </tbody>
                  </table>

                  <div className="border border-black p-1 text-[7px] text-black leading-tight bg-white mb-2">
                    <span className="font-bold">{dict.amountInWords}: </span>
                    <span className="italic font-semibold">"{amountInWords}"</span>
                  </div>
                </div>

                <div>
                  <div className="grid grid-cols-12 gap-1 border-t border-black pt-1.5 items-end">
                    <div className="col-span-4 flex items-center">
                      <ReceiptQRCode
                        receiptId={p.id}
                        receiptNo={p.receiptNo}
                        referenceNo={p.referenceNo}
                        studentName={p.studentName}
                        admissionNo={p.admissionNo}
                        amount={amountVal}
                        date={p.date}
                        size={44}
                        showLabel={false}
                      />
                    </div>
                    <div className="col-span-4 flex items-center justify-center">
                      {stampColor !== 'none' && (
                        <div className="w-11 h-11 rounded-full border border-black flex flex-col items-center justify-center text-center rotate-6 leading-none">
                          <span className="text-[3.5px] font-black">JOY INT'L</span>
                          <span className="text-[4.5px] font-black my-0.5">{dict.verified}</span>
                          <span className="text-[3px] font-mono">{(p.id || '').slice(0, 5).toUpperCase()}</span>
                        </div>
                      )}
                    </div>
                    <div className="col-span-4 text-right flex flex-col justify-end">
                      <span className="text-[6.5px] text-black font-semibold truncate">
                        {p.receivedBy || p.collectedBy || dict.cashier}
                      </span>
                      <div className="border-t border-dashed border-black mt-3 pt-1 text-[6.5px] text-black uppercase font-bold text-center">
                        {dict.signature}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-[5.5px] text-black border-t border-black mt-1 pt-0.5 leading-none">
                    <span>{dict.nonRefundable}</span>
                    <span className="font-mono">{verificationHash}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
};

export default BatchReceiptPrintModal;

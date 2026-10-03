import React, { useState, useEffect, useRef } from 'react';
import { 
  Printer, 
  Download, 
  X, 
  Globe, 
  Check, 
  CheckCircle, 
  FileText, 
  FileCheck, 
  Coins, 
  Lock, 
  User, 
  BookOpen, 
  ShieldCheck,
  Zap
} from 'lucide-react';
import { getStoredThermalPrinterSettings, getStoredSettings } from '../../services/storageService';
import { PaymentRecord, Student, StudentBill, ThermalPrinterSettingsConfig } from '../../types';
import JIPASLogo from './JIPASLogo';
import ReceiptQRCode from './ReceiptQRCode';
import { PDFGeneratorService } from '../../services/pdfService';
import { printContent } from '../../utils/printUtils';

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
  if (numCopy > 0) {
    word += convertLessThanOneThousand(numCopy);
  }
  return word.trim() + ' Ghana Cedis Only';
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
  if (numCopy > 0) {
    word += convert(numCopy);
  }
  return word.trim() + ' Cedis Ghana Seulement';
}

interface PrintableReceiptA6Props {
  receipt: PaymentRecord;
  student: Student;
  bill?: StudentBill;
  onClose: () => void;
}

export default function PrintableReceiptA6({ receipt, student, bill, onClose }: PrintableReceiptA6Props) {
  const [language, setLanguage] = useState<'FR' | 'EN'>('FR');
  const [copyType, setCopyType] = useState<'Original' | 'Duplicate' | 'Student' | 'Finance'>('Original');
  const [stampColor, setStampColor] = useState<'emerald' | 'blue' | 'none'>('emerald');
  const [isPrinting, setIsPrinting] = useState(false);
  const [thermalSettings, setThermalSettings] = useState<ThermalPrinterSettingsConfig>(getStoredThermalPrinterSettings());
  const [schoolSettings, setSchoolSettings] = useState(() => getStoredSettings());
  const printableAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleStorage = () => {
      setThermalSettings(getStoredThermalPrinterSettings());
      setSchoolSettings(getStoredSettings());
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener('jipas_cloud_synced', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('jipas_cloud_synced', handleStorage);
    };
  }, []);

  // Auto-print effect if specified by state/preferences
  useEffect(() => {
    // Standard receipt metadata check
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        triggerSilentPrint();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const triggerPrint = () => {
    setIsPrinting(true);
    // Add print utility classes to body to enforce strict layout
    document.body.classList.add('print-a6-body');
    setTimeout(() => {
      window.print();
      // Remove after printing dialog completes
      document.body.classList.remove('print-a6-body');
      setIsPrinting(false);
    }, 500);
  };

  const triggerSilentPrint = () => {
    if (!printableAreaRef.current) return;
    setIsPrinting(true);
    try {
      const html = printableAreaRef.current.innerHTML;
      printContent(html, `JIPAS_Receipt_${receipt.receiptNo}`);
    } catch (err) {
      console.error('[PrintableReceiptA6] Silent print failed:', err);
      triggerPrint(); // Fallback to standard print
    } finally {
      setIsPrinting(false);
    }
  };

  const handleDownloadPDF = () => {
    if (student) {
      PDFGeneratorService.generateFeeReceipt(receipt, student);
    }
  };

  const termDisplay = receipt.term || bill?.term || schoolSettings.activeTerm || 'First Term';
  const yearDisplay = receipt.academicYear || bill?.academicYear || schoolSettings.currentAcademicYear || '2025-2026';

  const amountPaidVal = Number(receipt.amount || receipt.paid || 0);
  const arrearsVal = Number(receipt.arrears ?? bill?.arrears ?? 0);
  const payableVal = Number(receipt.payable ?? bill?.payable ?? (amountPaidVal + (receipt.balance ?? 0)));
  const balanceVal = Number(receipt.balance ?? bill?.balance ?? 0);
  const discountVal = Number(receipt.discount ?? bill?.discount ?? 0);

  const amountInWords = language === 'FR' 
    ? numberToWordsFR(amountPaidVal) 
    : numberToWordsEN(amountPaidVal);

  const verificationHash = `JPS-${(receipt.receiptNo || '').slice(-6).toUpperCase()}-${receipt.date.replace(/-/g, '')}-${amountPaidVal}`;

  // Bilingual UI Dictionary
  const dict = {
    FR: {
      receiptTitle: 'Reçu Officiel de Caisse',
      originalCopy: 'Copie Originale',
      duplicateCopy: 'Duplicata',
      studentCopy: 'Copie Élève',
      financeCopy: 'Copie Comptabilité',
      receiptNo: 'N° de Reçu',
      date: 'Date de Caisse',
      refNo: 'Réf. Transaction',
      studentName: 'Nom de l\'Élève',
      admissionNo: 'Matricule',
      classStream: 'Classe / Section',
      academicYear: 'Année Académique',
      term: 'Trimestre / Semestre',
      paymentMethod: 'Mode de Règlement',
      collectedBy: 'Encaissé Par',
      particulars: 'Détails du Règlement',
      amountPaid: 'Montant Versé',
      currentBalance: 'Solde Restant',
      discount: 'Remise / Abattement',
      totalPayable: 'Net à Payer',
      previousArrears: 'Arriérés Précédents',
      amountInWords: 'Arrêté le présent reçu à la somme de',
      sealVerified: 'VALIDÉ ET ENREGISTRÉ',
      signatureLabel: 'Le Caissier / Signature',
      rulesNotice: 'N.B. Les frais scolaires versés ne sont pas remboursables.',
    },
    EN: {
      receiptTitle: 'Official Cash Receipt',
      originalCopy: 'Original Copy',
      duplicateCopy: 'Duplicate Copy',
      studentCopy: 'Student Copy',
      financeCopy: 'Finance Copy',
      receiptNo: 'Receipt No',
      date: 'Receipt Date',
      refNo: 'Ref. Number',
      studentName: 'Student Name',
      admissionNo: 'Admission No',
      classStream: 'Class & Section',
      academicYear: 'Academic Year',
      term: 'Term / Period',
      paymentMethod: 'Payment Mode',
      collectedBy: 'Received By',
      particulars: 'Payment Breakdown',
      amountPaid: 'Amount Paid',
      currentBalance: 'Outstanding Arrears',
      discount: 'Scholarship / Discount',
      totalPayable: 'Net Payable',
      previousArrears: 'Previous Arrears',
      amountInWords: 'Amount in words',
      sealVerified: 'VALIDATED & SECURED',
      signatureLabel: 'Cashier / Signature',
      rulesNotice: 'N.B. School fees paid are strictly non-refundable.',
    }
  }[language];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto print:static print:bg-white print:p-0 print:m-0 print:block">
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-a6-receipt, #printable-a6-receipt * {
            visibility: visible !important;
          }
          #printable-a6-receipt {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100mm !important;
            height: auto !important;
            margin: 0 !important;
            padding: 2mm !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
      
      {/* Settings Panel & Dialog Controls (Screen Only) */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl max-w-4xl w-full p-4 sm:p-6 flex flex-col md:flex-row gap-6 my-auto print:hidden print:border-none print:shadow-none print:p-0">
        
        {/* Customization Controls Panel */}
        <div className="w-full md:w-80 shrink-0 space-y-5 text-slate-300">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <FileCheck className="w-5 h-5 text-indigo-400" />
              <h2 className="text-base font-black text-white tracking-tight">Print Settings</h2>
            </div>
            <p className="text-[11px] text-slate-400">
              Customize the JIPAS receipt format before generating physical copies.
            </p>
          </div>

          {/* Bilingual Toggle */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
              <Globe className="w-3.5 h-3.5 text-slate-500" />
              Receipt Language
            </label>
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950 rounded-xl">
              <button
                type="button"
                onClick={() => setLanguage('FR')}
                className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  language === 'FR' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Français (Togo)
              </button>
              <button
                type="button"
                onClick={() => setLanguage('EN')}
                className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  language === 'EN' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                English Format
              </button>
            </div>
          </div>

          {/* Copy Type Toggle */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              Copy Designation
            </label>
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950 rounded-xl">
              {(['Original', 'Duplicate', 'Student', 'Finance'] as const).map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setCopyType(type)}
                  className={`py-1 px-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    copyType === type ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {type === 'Original' && 'Original'}
                  {type === 'Duplicate' && 'Duplicata'}
                  {type === 'Student' && 'Student Copy'}
                  {type === 'Finance' && 'Finance Copy'}
                </button>
              ))}
            </div>
          </div>

          {/* Stamp Style Toggle */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
              <Coins className="w-3.5 h-3.5 text-slate-500" />
              Security Stamp
            </label>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950 rounded-xl">
              <button
                type="button"
                onClick={() => setStampColor('emerald')}
                className={`py-1 px-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                  stampColor === 'emerald' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'text-slate-400 border border-transparent'
                }`}
              >
                Emerald
              </button>
              <button
                type="button"
                onClick={() => setStampColor('blue')}
                className={`py-1 px-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                  stampColor === 'blue' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40' : 'text-slate-400 border border-transparent'
                }`}
              >
                Royal Blue
              </button>
              <button
                type="button"
                onClick={() => setStampColor('none')}
                className={`py-1 px-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                  stampColor === 'none' ? 'bg-slate-800 text-slate-200' : 'text-slate-400'
                }`}
              >
                No Seal
              </button>
            </div>
          </div>

          {/* Guidelines info */}
          <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-2xl text-[10px] text-slate-400 leading-relaxed space-y-1.5">
            <div className="flex items-center gap-1 text-white font-bold">
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              <span>A6 Portrait Spec</span>
            </div>
            <p>
              Fits standard <strong>105mm × 148mm</strong> thermal or precut ticket slips. Ideal for rapid front desk delivery.
            </p>
            <p className="text-slate-500">
              Shortcut: press <kbd className="bg-slate-800 text-slate-300 px-1 py-0.5 rounded text-[9px] font-mono">Ctrl+P</kbd> or <kbd className="bg-slate-800 text-slate-300 px-1 py-0.5 rounded text-[9px] font-mono">⌘+P</kbd> to prompt physical print layout.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 space-y-2">
            <button
              type="button"
              onClick={triggerSilentPrint}
              disabled={isPrinting}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-indigo-950/20 active:scale-98 transition-all"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>Direct Silent Print</span>
            </button>
            <button
              type="button"
              onClick={triggerPrint}
              disabled={isPrinting}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-950/20 active:scale-98 transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>Standard Print (A6)</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadPDF}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer border border-slate-700 active:scale-98 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2 bg-transparent hover:bg-slate-800 text-slate-400 hover:text-slate-300 font-bold rounded-xl text-xs flex items-center justify-center gap-1 cursor-pointer transition-all"
            >
              <X className="w-3.5 h-3.5" />
              <span>Close View</span>
            </button>
          </div>
        </div>

        {/* Skeuomorphic A6 Portrait Screen Preview Frame */}
        <div className="flex-1 bg-slate-950 rounded-2xl p-4 sm:p-6 flex items-center justify-center border border-slate-800 min-h-[460px]">
          <div 
            ref={printableAreaRef}
            className="bg-white text-slate-950 w-[100mm] min-h-[142mm] p-3 shadow-2xl relative rounded-md border border-slate-200 select-none flex flex-col justify-between font-sans"
          >
            
            {/* Logo, Crest and Header Details */}
            <div>
              <div className="flex items-start justify-between gap-2 border-b border-slate-900 pb-1.5">
                <div className="flex items-center gap-2">
                  <JIPASLogo size="sm" className="shrink-0" rounded={true} />
                  <div className="leading-none">
                    <h1 className="text-[11px] font-black uppercase tracking-tight text-slate-950">
                      {schoolSettings.schoolName || 'JOY INTERNATIONAL SCHOOL (JIPAS)'}
                    </h1>
                    <p className="text-[7px] text-slate-500 font-bold italic mt-0.5">
                      "{schoolSettings.schoolMotto || 'Education is Wealth • Knowledge, Discipline & Excellence'}"
                    </p>
                    <p className="text-[6px] text-slate-400 font-medium scale-95 origin-left">
                      GES Accredited • Reg: GES/GAR/ED/2018/042
                    </p>
                    <p className="text-[5.5px] text-slate-400 font-normal leading-tight mt-0.5">
                      {schoolSettings.address ? `${schoolSettings.address} • Tel: ${schoolSettings.phone || '(00228) 22 60 21 38'}` : 'BP 2364 • Behind T-Oil, Lomé Togo • Tel: (00228) 22 60 21 38'}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="inline-block bg-slate-950 text-white text-[7px] font-black uppercase px-1.5 py-0.5 rounded-sm tracking-wide">
                    {dict.receiptTitle}
                  </span>
                  <div className="text-[6px] font-black text-indigo-700 uppercase tracking-widest mt-0.5">
                    {copyType === 'Original' && dict.originalCopy}
                    {copyType === 'Duplicate' && dict.duplicateCopy}
                    {copyType === 'Student' && dict.studentCopy}
                    {copyType === 'Finance' && dict.financeCopy}
                  </div>
                </div>
              </div>

              {/* Receipt metadata banner */}
              <div className="bg-slate-100 px-2 py-1 my-1.5 border border-slate-200 rounded flex justify-between items-center text-[7.5px] font-bold font-mono">
                <div>
                  <span className="text-slate-500">{dict.receiptNo}: </span>
                  <span className="text-blue-800">{receipt.receiptNo}</span>
                </div>
                <div className="flex gap-2 text-slate-600">
                  <span>{dict.date}: <strong className="text-slate-950">{receipt.date}</strong></span>
                  {receipt.referenceNo && (
                    <span>Ref: <strong className="text-slate-950">{(receipt.referenceNo || '').slice(-6).toUpperCase()}</strong></span>
                  )}
                </div>
              </div>

              {/* Student Particulars Grid */}
              <div className="grid grid-cols-2 gap-1.5 text-[8px] bg-slate-50 border border-slate-200 rounded p-1.5 mb-1.5">
                <div className="space-y-0.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">{dict.studentName}:</span>
                    <strong className="text-slate-950 font-bold truncate max-w-[100px]">{receipt.studentName}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">{dict.admissionNo}:</span>
                    <strong className="text-indigo-800 font-mono font-bold">{receipt.admissionNo}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">{dict.classStream}:</span>
                    <strong className="text-slate-800 truncate max-w-[100px]">{receipt.className}</strong>
                  </div>
                </div>
                <div className="space-y-0.5 border-l border-slate-200 pl-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">{dict.academicYear}:</span>
                    <strong className="text-slate-950">{yearDisplay}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">{dict.term}:</span>
                    <strong className="text-slate-950">{termDisplay}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">{dict.paymentMethod}:</span>
                    <strong className="text-emerald-700">{receipt.paymentMethod || receipt.method}</strong>
                  </div>
                </div>
              </div>

              {/* Structured Fees Particulars Table */}
              <table className="w-full text-left text-[8px] border-collapse mb-1.5">
                <thead>
                  <tr className="bg-slate-950 text-white text-[7.5px] uppercase font-bold tracking-wider">
                    <th className="p-1 border border-slate-950">{language === 'FR' ? 'Libellé' : 'Particulars'}</th>
                    <th className="p-1 text-right border border-slate-950">{language === 'FR' ? 'Montant (CFA)' : 'Amount (CFA)'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono">
                  {/* Detailed breakdown */}
                  {arrearsVal > 0 && (
                    <tr className="text-slate-600">
                      <td className="p-1 font-sans">{dict.previousArrears}</td>
                      <td className="p-1 text-right">{arrearsVal.toLocaleString()} CFA</td>
                    </tr>
                  )}
                  {discountVal > 0 && (
                    <tr className="text-rose-600">
                      <td className="p-1 font-sans">{dict.discount}</td>
                      <td className="p-1 text-right">-{discountVal.toLocaleString()} CFA</td>
                    </tr>
                  )}
                  <tr>
                    <td className="p-1 font-semibold text-slate-800 font-sans">{receipt.notes || receipt.paidAs || (language === 'FR' ? 'Frais de Scolarité' : 'Tuition & Academic Fees')}</td>
                    <td className="p-1 text-right font-bold text-slate-900">{(payableVal - arrearsVal + discountVal).toLocaleString()} CFA</td>
                  </tr>
                  
                  {/* Totals & Net summaries */}
                  <tr className="bg-slate-100 font-bold text-slate-900 border-t border-slate-900">
                    <td className="p-1 text-[7.5px] font-sans">{dict.totalPayable}</td>
                    <td className="p-1 text-right">{payableVal.toLocaleString()} CFA</td>
                  </tr>
                  <tr className="bg-emerald-50 font-black text-emerald-800 text-[8.5px] border-t-2 border-slate-900">
                    <td className="p-1 text-[7.5px] font-sans">{dict.amountPaid}</td>
                    <td className="p-1 text-right">{amountPaidVal.toLocaleString()} CFA</td>
                  </tr>
                  <tr className="bg-rose-50 font-bold text-rose-800">
                    <td className="p-1 text-[7.5px] font-sans">{dict.currentBalance}</td>
                    <td className="p-1 text-right">{balanceVal.toLocaleString()} CFA</td>
                  </tr>
                </tbody>
              </table>

              {/* Amount in words */}
              <div className="bg-slate-50 border border-slate-200 rounded p-1.5 text-[7px] text-slate-700 leading-normal mb-1.5">
                <span className="font-bold block text-[6.5px] text-slate-500 uppercase">{dict.amountInWords}:</span>
                <span className="font-semibold text-slate-950 italic">"{amountInWords}"</span>
              </div>
            </div>

            {/* Verification & Stamp / Receipt Footer Details */}
            <div>
              <div className="grid grid-cols-12 gap-1 border-t border-slate-200 pt-1.5">
                {/* Security and Verification Hash QR */}
                <div className="col-span-4 flex flex-col items-center justify-center text-center">
                  <div className="bg-white p-0.5 border border-slate-200 rounded">
                    {/* Embedded micro QR element matching props */}
                    <div className="w-14 h-14 flex items-center justify-center relative">
                      <ReceiptQRCode 
                        receiptId={receipt.id}
                        receiptNo={receipt.receiptNo}
                        referenceNo={receipt.referenceNo}
                        studentName={receipt.studentName}
                        admissionNo={receipt.admissionNo}
                        amount={amountPaidVal}
                        date={receipt.date}
                        size={56}
                        showLabel={false}
                      />
                    </div>
                  </div>
                </div>

                {/* Secure Stamp */}
                <div className="col-span-4 flex items-center justify-center relative overflow-hidden">
                  {stampColor !== 'none' && (
                    <div className={`border-2 ${
                      stampColor === 'emerald' ? 'border-emerald-600/60 text-emerald-700/80 bg-emerald-500/5' : 'border-blue-600/60 text-blue-700/80 bg-blue-500/5'
                    } rounded-full w-16 h-16 flex flex-col items-center justify-center text-center rotate-12 scale-90 border-double`}>
                      <span className="text-[4.5px] font-bold tracking-wider leading-none">JOY INT'L SCHOOL</span>
                      <span className="text-[6.5px] font-black leading-none my-0.5">{dict.sealVerified}</span>
                      <span className="text-[4px] font-mono leading-none tracking-tighter opacity-80">{verificationHash.slice(0, 14)}</span>
                    </div>
                  )}
                </div>

                {/* Sign-off Field */}
                <div className="col-span-4 text-right flex flex-col justify-end space-y-0.5">
                  <div className="text-[6px] text-slate-400 font-medium">
                    {dict.collectedBy}:
                  </div>
                  <strong className="text-[7px] text-slate-900 font-bold block truncate max-w-[85px]">
                    {receipt.receivedBy || receipt.collectedBy || 'Cashier Desk'}
                  </strong>
                  <div className="border-t border-dashed border-slate-300 mt-4 pt-1 text-[6.5px] text-slate-500 text-center uppercase font-bold">
                    {dict.signatureLabel}
                  </div>
                </div>
              </div>

              {/* Non-refundable Disclaimer */}
              <div className="flex items-center justify-between mt-1.5 border-t border-slate-100 pt-1 text-[6px] text-slate-400 font-medium leading-none">
                <span>{dict.rulesNotice}</span>
                <span className="font-mono text-[5.5px] scale-90 origin-right text-slate-300">{verificationHash}</span>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* ------------------------------------------------------------- */}
      {/* EXPLICIT PRINT-ONLY LAYOUT CONFORMING TO @PAGE A6             */}
      {/* ------------------------------------------------------------- */}
      <div className="hidden print:block print-a6-receipt-container font-sans text-black">
        
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
                  GES Accredited • Reg: GES/GAR/ED/2018/042
                </p>
                <p className="text-[5px] text-black font-normal">
                  {schoolSettings.address ? `${schoolSettings.address} • Tel: ${schoolSettings.phone || '(00228) 22 60 21 38'}` : 'BP 2364 • Behind T-Oil, Lomé Togo • Tel: (00228) 22 60 21 38'}
                </p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="inline-block bg-black text-white text-[7px] font-black uppercase px-1 py-0.5 tracking-wide">
                {dict.receiptTitle}
              </span>
              <div className="text-[6px] font-black text-black uppercase tracking-widest mt-0.5">
                {copyType === 'Original' && dict.originalCopy}
                {copyType === 'Duplicate' && dict.duplicateCopy}
                {copyType === 'Student' && dict.studentCopy}
                {copyType === 'Finance' && dict.financeCopy}
              </div>
            </div>
          </div>

          {/* Metadata Banner */}
          <div className="bg-white px-1.5 py-0.5 my-1 border border-black flex justify-between items-center text-[7px] font-bold font-mono">
            <div>
              <span>{dict.receiptNo}: </span>
              <span className="font-black text-black">{receipt.receiptNo}</span>
            </div>
            <div className="flex gap-2 text-black">
              <span>{dict.date}: <strong>{receipt.date}</strong></span>
              {receipt.referenceNo && (
                <span>Ref: <strong>{(receipt.referenceNo || '').slice(-6).toUpperCase()}</strong></span>
              )}
            </div>
          </div>

          {/* Student Particulars Grid */}
          <div className="grid grid-cols-2 gap-1 text-[7.5px] bg-white border border-black p-1.5 mb-1">
            <div className="space-y-0.5">
              <div className="flex justify-between">
                <span>{dict.studentName}:</span>
                <strong className="text-black font-black truncate max-w-[100px]">{receipt.studentName}</strong>
              </div>
              <div className="flex justify-between">
                <span>{dict.admissionNo}:</span>
                <strong className="text-black font-mono font-black">{receipt.admissionNo}</strong>
              </div>
              <div className="flex justify-between">
                <span>{dict.classStream}:</span>
                <strong className="text-black truncate max-w-[100px]">{receipt.className}</strong>
              </div>
            </div>
            <div className="space-y-0.5 border-l border-black pl-1.5">
              <div className="flex justify-between">
                <span>{dict.academicYear}:</span>
                <strong className="text-black">{receipt.academicYear || '2025/2026'}</strong>
              </div>
              <div className="flex justify-between">
                <span>{dict.term}:</span>
                <strong className="text-black">{receipt.term || 'First Term'}</strong>
              </div>
              <div className="flex justify-between">
                <span>{dict.paymentMethod}:</span>
                <strong className="text-black font-bold">{receipt.paymentMethod || receipt.method}</strong>
              </div>
            </div>
          </div>

          {/* Fee details Table */}
          <table className="w-full text-left text-[7.5px] border-collapse mb-1">
            <thead>
              <tr className="bg-black text-white text-[7px] uppercase font-bold tracking-wider">
                <th className="p-0.5 border border-black">{language === 'FR' ? 'Libellé' : 'Particulars'}</th>
                <th className="p-0.5 text-right border border-black">{language === 'FR' ? 'Montant (CFA)' : 'Amount (CFA)'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black font-mono">
              {arrearsVal > 0 && (
                <tr className="text-black">
                  <td className="p-0.5 font-sans">{dict.previousArrears}</td>
                  <td className="p-0.5 text-right">{arrearsVal.toLocaleString()} CFA</td>
                </tr>
              )}
              {discountVal > 0 && (
                <tr className="text-black">
                  <td className="p-0.5 font-sans">{dict.discount}</td>
                  <td className="p-0.5 text-right">-{discountVal.toLocaleString()} CFA</td>
                </tr>
              )}
              <tr>
                <td className="p-0.5 font-semibold font-sans">{receipt.notes || receipt.paidAs || (language === 'FR' ? 'Frais de Scolarité' : 'Tuition & Academic Fees')}</td>
                <td className="p-0.5 text-right font-bold">{(payableVal - arrearsVal + discountVal).toLocaleString()} CFA</td>
              </tr>
              
              <tr className="bg-white font-bold text-black border-t border-black">
                <td className="p-0.5 text-[7px] font-sans">{dict.totalPayable}</td>
                <td className="p-0.5 text-right">{payableVal.toLocaleString()} CFA</td>
              </tr>
              <tr className="bg-white font-black text-black text-[8px] border-t-2 border-black">
                <td className="p-0.5 text-[7px] font-sans">{dict.amountPaid}</td>
                <td className="p-0.5 text-right">{amountPaidVal.toLocaleString()} CFA</td>
              </tr>
              <tr className="bg-white font-bold text-black">
                <td className="p-0.5 text-[7px] font-sans">{dict.currentBalance}</td>
                <td className="p-0.5 text-right">{balanceVal.toLocaleString()} CFA</td>
              </tr>
            </tbody>
          </table>

          {/* Amount in words */}
          <div className="bg-white border border-black p-1 text-[7px] leading-tight mb-1">
            <span className="font-bold block text-[6.5px] uppercase">{dict.amountInWords}:</span>
            <span className="font-semibold italic">"{amountInWords}"</span>
          </div>
        </div>

        {/* Verification and signature row */}
        <div>
          <div className="grid grid-cols-12 gap-1 border-t border-black pt-1">
            {/* Embedded QR element */}
            <div className="col-span-4 flex flex-col items-center justify-center text-center">
              <div className="bg-white p-0.5 border border-black rounded">
                <div className="w-14 h-14 relative flex items-center justify-center">
                  <ReceiptQRCode 
                    receiptId={receipt.id}
                    receiptNo={receipt.receiptNo}
                    referenceNo={receipt.referenceNo}
                    studentName={receipt.studentName}
                    admissionNo={receipt.admissionNo}
                    amount={amountPaidVal}
                    date={receipt.date}
                    size={56}
                    showLabel={false}
                  />
                </div>
              </div>
            </div>

            {/* Seal / Watermark placeholder */}
            <div className="col-span-4 flex items-center justify-center relative overflow-hidden">
              {stampColor !== 'none' && (
                <div className="border border-black rounded-full w-14 h-14 flex flex-col items-center justify-center text-center rotate-12 scale-90 border-double">
                  <span className="text-[4px] font-bold tracking-wider leading-none">JOY INT'L SCHOOL</span>
                  <span className="text-[5.5px] font-black leading-none my-0.5">{dict.sealVerified}</span>
                  <span className="text-[4px] font-mono leading-none tracking-tighter opacity-80">{verificationHash.slice(0, 14)}</span>
                </div>
              )}
            </div>

            {/* Cashier Field */}
            <div className="col-span-4 text-right flex flex-col justify-end">
              <div className="text-[6px] text-black font-bold">
                {dict.collectedBy}:
              </div>
              <strong className="text-[7.5px] text-black font-black block truncate max-w-[85px]">
                {receipt.receivedBy || receipt.collectedBy || 'Cashier Desk'}
              </strong>
              <div className="border-t border-dashed border-black mt-3 pt-0.5 text-[6px] text-black text-center uppercase font-bold">
                {dict.signatureLabel}
              </div>
            </div>
          </div>

          {/* Non-refundable Disclaimer */}
          <div className="flex items-center justify-between mt-1 border-t border-black pt-0.5 text-[5.5px] text-black font-medium leading-none">
            <span>{dict.rulesNotice}</span>
            <span className="font-mono text-[5px] text-black">{verificationHash}</span>
          </div>
        </div>

      </div>

    </div>
  );
}

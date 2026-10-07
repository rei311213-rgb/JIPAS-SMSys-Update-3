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
  if (numCopy > 0) {
    word += convert(numCopy);
  }
  return word.trim() + ' Francs CFA Seulement';
}

interface PrintableReceiptA6Props {
  receipt: PaymentRecord;
  student: Student;
  bill?: StudentBill;
  onClose: () => void;
}

export default function PrintableReceiptA6({ receipt, student, bill, onClose }: PrintableReceiptA6Props) {
  const [paperMode, setPaperMode] = useState<'a4_four' | 'a6_single'>('a4_four');
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
  const yearDisplay = receipt.academicYear || bill?.academicYear || schoolSettings.activeAcademicYear || '2025-2026';

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
          #printable-a6-receipt, #printable-a6-receipt *,
          #printable-a4-quad-receipt, #printable-a4-quad-receipt * {
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
          #printable-a4-quad-receipt {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 210mm !important;
            height: 292mm !important;
            margin: 0 auto !important;
            padding: 4mm 4mm !important;
            box-sizing: border-box !important;
            display: grid !important;
            grid-template-columns: 101mm 101mm !important;
            grid-template-rows: 141mm 141mm !important;
            gap: 2mm !important;
            background: white !important;
            page-break-after: always !important;
            break-after: page !important;
          }
          .quad-receipt-voucher {
            width: 101mm !important;
            height: 141mm !important;
            max-width: 101mm !important;
            max-height: 141mm !important;
            box-sizing: border-box !important;
            padding: 3.5mm 3.5mm !important;
            border: 1px dashed #000000 !important;
            background: #ffffff !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            overflow: hidden !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .quad-receipt-voucher * {
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
      
      {/* Settings Panel & Dialog Controls (Screen Only) */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl max-w-4xl w-full p-4 sm:p-6 flex flex-col md:flex-row gap-6 my-auto print:hidden print:border-none print:shadow-none print:p-0">
        
        {/* Customization Controls Panel */}
        <div className="w-full md:w-80 shrink-0 space-y-4 text-slate-300">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <FileCheck className="w-5 h-5 text-indigo-400" />
              <h2 className="text-base font-black text-white tracking-tight">Print Settings</h2>
            </div>
            <p className="text-[11px] text-slate-400">
              Customize the JIPAS receipt format before generating physical copies.
            </p>
          </div>

          {/* Paper Format (A4 4-on-1 vs A6) */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-indigo-400 tracking-wider flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-indigo-400" />
              Paper & Print Layout
            </label>
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950 rounded-xl border border-indigo-900/40">
              <button
                type="button"
                onClick={() => setPaperMode('a4_four')}
                className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer text-center ${
                  paperMode === 'a4_four' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                4 on 1 A4 (Quad)
              </button>
              <button
                type="button"
                onClick={() => setPaperMode('a6_single')}
                className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer text-center ${
                  paperMode === 'a6_single' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Single A6 Slip
              </button>
            </div>
            <p className="text-[10px] text-slate-400">
              {paperMode === 'a4_four' ? 'Prints 4 official copies (Student, Finance, Admin, Audit) on 1 A4 paper.' : 'Prints 1 compact slip (105mm × 148mm).'}
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
              <table className="w-full text-left text-[8px] border-collapse mb-2">
                <thead>
                  <tr className="bg-slate-900 text-white text-[7px] uppercase font-bold tracking-wider">
                    <th className="p-1.5 border border-slate-900">{language === 'FR' ? 'Libellé' : 'Description / Item'}</th>
                    <th className="p-1.5 text-right border border-slate-900">{language === 'FR' ? 'Total' : 'Total Billed'}</th>
                    <th className="p-1.5 text-right border border-slate-900">{language === 'FR' ? 'Versé' : 'Paid'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono">
                   <tr>
                    <td className="p-1.5 font-semibold text-slate-800 font-sans">{receipt.notes || receipt.paidAs || (language === 'FR' ? 'Frais de Scolarité' : 'Tuition Fee')}</td>
                    <td className="p-1.5 text-right font-bold text-slate-900">{payableVal.toLocaleString()} CFA</td>
                    <td className="p-1.5 text-right font-bold text-emerald-700">{amountPaidVal.toLocaleString()} CFA</td>
                  </tr>
                  
                  {/* Totals & Net summaries */}
                  <tr className="bg-slate-50 font-bold text-slate-900 border-t border-slate-900">
                    <td colSpan={2} className="p-1.5 text-right">{language === 'FR' ? 'Net Reçu' : 'Net Amount Received:'}</td>
                    <td className="p-1.5 text-right text-emerald-700">{amountPaidVal.toLocaleString()} CFA</td>
                  </tr>
                  <tr className="bg-rose-50 font-black text-rose-800">
                    <td colSpan={2} className="p-1.5 text-right">{language === 'FR' ? 'Solde Restant' : 'Remaining Outstanding Balance:'}</td>
                    <td className="p-1.5 text-right">{balanceVal.toLocaleString()} CFA</td>
                  </tr>
                </tbody>
              </table>

              {/* Amount in words */}
              <div className="bg-slate-50 border border-slate-200 rounded p-1.5 text-[7px] text-slate-700 leading-normal mb-3">
                <span className="font-bold block text-[6.5px] text-slate-500 uppercase">{dict.amountInWords}:</span>
                <span className="font-semibold text-slate-950 italic">"{amountInWords}"</span>
              </div>
            </div>

            {/* Footer Section: QR, Stamp, Signature */}
            <div className="mt-auto border-t border-slate-200 pt-2">
              <div className="flex items-center justify-between gap-2">
                <div className="text-[7px] text-slate-500 italic max-w-[50%]">
                  Received with thanks from <strong>{student?.parentName || student?.guardianName || 'Parent'}</strong> on account of <strong>{receipt.studentName}</strong>.
                </div>
                {/* Embedded micro QR element matching screenshot */}
                <div className="border border-slate-200 p-0.5 rounded shadow-sm">
                  <ReceiptQRCode 
                    receiptId={receipt.id}
                    receiptNo={receipt.receiptNo}
                    referenceNo={receipt.referenceNo}
                    studentName={receipt.studentName}
                    admissionNo={receipt.admissionNo}
                    amount={amountPaidVal}
                    date={receipt.date}
                    size={50}
                    showLabel={false}
                  />
                  <div className="text-[5px] text-center font-bold mt-0.5">Scan to Verify</div>
                </div>
              </div>

              <div className="flex items-end justify-between mt-2">
                <div className="text-[7px] text-slate-500 font-bold border-t border-slate-300 w-28 pt-1 text-center">
                  AUTHORIZED BURSAR SIGNATURE & DATE
                </div>
                {/* Official Seal */}
                {stampColor !== 'none' && (
                  <div className={`border-2 ${stampColor === 'emerald' ? 'border-emerald-600' : 'border-blue-600'} rounded-full w-14 h-14 flex flex-col items-center justify-center text-center rotate-6 scale-90`}>
                    <span className="text-[4px] font-black uppercase text-slate-800">JOY INT'L SCHOOL</span>
                    <span className="text-[6px] font-black uppercase">{dict.sealVerified}</span>
                    <span className="text-[3px] font-mono">{receipt.date}</span>
                  </div>
                )}
              </div>
            </div>


          </div>
        </div>

      </div>

      {/* ------------------------------------------------------------- */}
      {/* EXPLICIT PRINT-ONLY LAYOUT CONFORMING TO PAPER MODE           */}
      {/* ------------------------------------------------------------- */}
      {paperMode === 'a4_four' ? (
        /* 4 COPIES ON 1 A4 PAPER (QUADRUPLICATE VOUCHER GRID) */
        <div id="printable-a4-quad-receipt" className="hidden print:grid font-sans text-black">
          {[
            { copyLabel: language === 'FR' ? 'Copie Élève / Parent' : 'Student / Parent Copy', badge: '1/4' },
            { copyLabel: language === 'FR' ? 'Copie Caisse / Comptabilité' : 'Finance & Treasury Copy', badge: '2/4' },
            { copyLabel: language === 'FR' ? 'Copie Administration' : 'School Admin Copy', badge: '3/4' },
            { copyLabel: language === 'FR' ? 'Copie Audit & Contrôle' : 'Internal Audit / Archive', badge: '4/4' }
          ].map((item, idx) => (
            <div key={idx} className="quad-receipt-voucher">
              {/* Header Block */}
              <div>
                <div className="flex items-start justify-between gap-1 border-b border-black pb-1">
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
                      {item.copyLabel}
                    </div>
                  </div>
                </div>

                {/* Metadata Banner */}
                <div className="bg-white px-1.5 py-0.5 my-1 border border-black flex justify-between items-center text-[6.5px] font-bold font-mono">
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
                <div className="grid grid-cols-2 gap-1 text-[7px] bg-white border border-black p-1 mb-1">
                  <div className="space-y-0.5">
                    <div className="flex justify-between">
                      <span>{dict.studentName}:</span>
                      <strong className="text-black font-black truncate max-w-[85px]">{receipt.studentName}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>{dict.admissionNo}:</span>
                      <strong className="text-black font-mono font-black">{receipt.admissionNo}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>{dict.classStream}:</span>
                      <strong className="text-black truncate max-w-[85px]">{receipt.className}</strong>
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
                      <strong className="text-black font-bold">{receipt.paymentMethod || receipt.method}</strong>
                    </div>
                  </div>
                </div>

                {/* Fee details Table */}
                <table className="w-full text-left text-[6.5px] border-collapse mb-1">
                  <thead>
                    <tr className="bg-black text-white text-[6px] uppercase font-bold tracking-wider">
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
                      <td className="p-0.5 font-semibold font-sans truncate max-w-[110px]">{receipt.notes || receipt.paidAs || (language === 'FR' ? 'Frais de Scolarité' : 'Tuition & Fees')}</td>
                      <td className="p-0.5 text-right font-bold">{(payableVal - arrearsVal + discountVal).toLocaleString()} CFA</td>
                    </tr>
                    
                    <tr className="bg-white font-bold text-black border-t border-black">
                      <td className="p-0.5 text-sans">{dict.totalPayable}</td>
                      <td className="p-0.5 text-right">{payableVal.toLocaleString()} CFA</td>
                    </tr>
                    <tr className="bg-white font-black text-black text-[7.5px] border-t-2 border-black">
                      <td className="p-0.5 text-sans">{dict.amountPaid}</td>
                      <td className="p-0.5 text-right font-mono font-black">{amountPaidVal.toLocaleString()} CFA</td>
                    </tr>
                    <tr className="bg-white font-bold text-black">
                      <td className="p-0.5 text-sans">{dict.currentBalance}</td>
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

              {/* Verification, QR & Signatures */}
              <div>
                <div className="grid grid-cols-12 gap-1 border-t border-black pt-1 items-end">
                  <div className="col-span-4 flex items-center">
                    <ReceiptQRCode 
                      receiptId={receipt.id}
                      receiptNo={receipt.receiptNo}
                      referenceNo={receipt.referenceNo}
                      studentName={receipt.studentName}
                      admissionNo={receipt.admissionNo}
                      amount={amountPaidVal}
                      date={receipt.date}
                      size={36}
                      showLabel={false}
                    />
                  </div>

                  <div className="col-span-4 flex items-center justify-center">
                    {stampColor !== 'none' && (
                      <div className="w-9 h-9 rounded-full border border-black flex flex-col items-center justify-center text-center rotate-6 leading-none">
                        <span className="text-[3px] font-black">JOY INT'L</span>
                        <span className="text-[4px] font-black my-0.5">{dict.sealVerified}</span>
                        <span className="text-[2.5px] font-mono">{(receipt.id || '').slice(0, 5).toUpperCase()}</span>
                      </div>
                    )}
                  </div>

                  <div className="col-span-4 text-right flex flex-col justify-end">
                    <span className="text-[5px] text-black font-semibold truncate">
                      {receipt.receivedBy || receipt.collectedBy || 'Cashier Desk'}
                    </span>
                    <div className="border-t border-dashed border-black mt-2 pt-0.5 text-[5px] text-black uppercase font-bold text-center">
                      {dict.signatureLabel}
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center text-[4.5px] text-black border-t border-black mt-0.5 pt-0.5 leading-none">
                  <span>{dict.rulesNotice}</span>
                  <span className="font-mono">{verificationHash}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* SINGLE A6 SLIP (105mm × 148mm) */
        <div id="printable-a6-receipt" className="hidden print:block print-a6-receipt-container font-sans text-black">
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
      )}

    </div>
  );
}

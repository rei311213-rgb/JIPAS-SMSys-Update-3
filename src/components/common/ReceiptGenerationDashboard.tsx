import React, { useState, useMemo, useEffect } from 'react';
import { 
  Printer, 
  Search, 
  Calendar, 
  User, 
  Check, 
  X, 
  Users, 
  Layers, 
  FileText, 
  CheckCircle2, 
  Eye, 
  Info, 
  SlidersHorizontal, 
  Coins, 
  ChevronRight, 
  ArrowRight,
  Trash2,
  ListPlus,
  ChevronUp,
  ChevronDown,
  Sparkles,
  ShieldCheck,
  QrCode,
  ExternalLink,
  Shield,
  Clock
} from 'lucide-react';
import { 
  getStoredPayments, 
  getStoredBills, 
  getStoredSettings,
  getStoredStudents,
  getStoredClasses
} from '../../services/storageService';
import { formatCurrency } from '../../utils/financeUtils';
import { PaymentRecord, Student, StudentBill } from '../../types';
import JIPASLogo from './JIPASLogo';
import ReceiptQRCode, { buildReceiptVerificationUrl } from './ReceiptQRCode';
import BatchReceiptPrintModal from './BatchReceiptPrintModal';
import { peekNextReceiptSerialNumber, auditReceiptSerialChain } from '../../services/receiptSerialService';

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
  return (word.trim() || 'Zéro') + ' Francs CFA Seulement';
}

export interface QueuedReceiptItem {
  id: string; // payment record id
  payment: PaymentRecord;
  batchLabel: string;
  queuedAt: string;
}

interface ReceiptGenerationDashboardProps {
  payments?: PaymentRecord[];
  bills?: StudentBill[];
  students?: Student[];
}

export default function ReceiptGenerationDashboard({ 
  payments: propPayments, 
  bills: propBills,
  students: propStudents 
}: ReceiptGenerationDashboardProps) {
  const [paymentsList, setPaymentsList] = useState<PaymentRecord[]>([]);
  const [billsList, setBillsList] = useState<StudentBill[]>([]);
  const [studentsList, setStudentsList] = useState<Student[]>([]);
  const [schoolSettings, setSchoolSettings] = useState(() => getStoredSettings());

  // Mode Selection: 'class' | 'daterange' | 'individual'
  const [filterMode, setFilterMode] = useState<'class' | 'daterange' | 'individual'>('class');
  
  // Filtering states
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7); // Default to last 7 days
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [studentSearchQuery, setStudentSearchQuery] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');

  // Selected payment record IDs for current view batch printing
  const [selectedReceiptIds, setSelectedReceiptIds] = useState<string[]>([]);

  // ===================== PRINT QUEUE STATE =====================
  const [printQueue, setPrintQueue] = useState<QueuedReceiptItem[]>([]);
  const [selectedQueueIds, setSelectedQueueIds] = useState<string[]>([]);
  const [isQueueExpanded, setIsQueueExpanded] = useState<boolean>(false);
  const [activePrintTarget, setActivePrintTarget] = useState<'direct' | 'queue'>('direct');
  const [queueToast, setQueueToast] = useState<string | null>(null);
  
  // Modal preview state
  const [previewReceipt, setPreviewReceipt] = useState<PaymentRecord | null>(null);
  const [previewLanguage, setPreviewLanguage] = useState<'FR' | 'EN'>('FR');
  const [previewCopyType, setPreviewCopyType] = useState<'Original' | 'Duplicate' | 'Student' | 'Finance'>('Original');
  
  // Batch Receipt Modal State (4-on-1 A4 or A6)
  const [batchModalPayments, setBatchModalPayments] = useState<string[]>([]);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  
  // Printing loading trigger
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    setPaymentsList(propPayments || getStoredPayments());
    setBillsList(propBills || getStoredBills());
    setStudentsList(propStudents || getStoredStudents());
    setSchoolSettings(getStoredSettings());

    const handleSync = () => {
      setPaymentsList(propPayments || getStoredPayments());
      setBillsList(propBills || getStoredBills());
      setStudentsList(propStudents || getStoredStudents());
      setSchoolSettings(getStoredSettings());
    };
    window.addEventListener('storage', handleSync);
    window.addEventListener('jipas_cloud_synced', handleSync);
    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('jipas_cloud_synced', handleSync);
    };
  }, [propPayments, propBills, propStudents]);

  const showToast = (msg: string) => {
    setQueueToast(msg);
    setTimeout(() => setQueueToast(null), 3500);
  };

  // Unique list of classes derived from payments, students, and stored classes
  const classesList = useMemo(() => {
    const classes = new Set<string>();
    paymentsList.forEach(p => {
      if (p.className) classes.add(p.className);
    });
    studentsList.forEach(s => {
      if (s.class) classes.add(s.class);
    });
    try {
      getStoredClasses().forEach(c => {
        if (c.name) classes.add(c.name);
      });
    } catch {}
    const arr = Array.from(classes).filter(Boolean).sort();
    if (arr.length > 0 && !selectedClass) {
      setSelectedClass(arr[0]);
    }
    return arr;
  }, [paymentsList, studentsList, selectedClass]);

  // Search match logic for individual student mode
  const searchableStudents = useMemo(() => {
    const q = studentSearchQuery.toLowerCase().trim();
    if (!q) return [];
    return studentsList.filter(s => 
      (s.fullName || s.name || '').toLowerCase().includes(q) ||
      (s.admissionNo || '').toLowerCase().includes(q)
    ).slice(0, 8);
  }, [studentsList, studentSearchQuery]);

  // Filtered payments list
  const filteredPayments = useMemo(() => {
    return paymentsList.filter(p => {
      const isVoid = p.status === 'Voided' || (p as any).isVoided === true;
      if (isVoid) return false;

      if (filterMode === 'class') {
        return p.className === selectedClass;
      } else if (filterMode === 'daterange') {
        if (!p.date) return false;
        return p.date >= startDate && p.date <= endDate;
      } else {
        return p.studentId === selectedStudentId || p.admissionNo === selectedStudentId;
      }
    });
  }, [paymentsList, filterMode, selectedClass, startDate, endDate, selectedStudentId]);

  // Serial Audit Metric
  const serialAudit = useMemo(() => {
    return auditReceiptSerialChain(paymentsList);
  }, [paymentsList]);

  const nextSerialPreview = useMemo(() => {
    return peekNextReceiptSerialNumber({ academicYear: schoolSettings.activeAcademicYear });
  }, [schoolSettings.activeAcademicYear]);

  const handleModeChange = (mode: 'class' | 'daterange' | 'individual') => {
    setFilterMode(mode);
    setSelectedReceiptIds([]);
    setSelectedStudentId('');
    setStudentSearchQuery('');
  };

  const handleToggleSelectAll = () => {
    if (selectedReceiptIds.length === filteredPayments.length) {
      setSelectedReceiptIds([]);
    } else {
      setSelectedReceiptIds(filteredPayments.map(p => p.id));
    }
  };

  const handleToggleReceiptSelection = (id: string) => {
    setSelectedReceiptIds(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id) 
        : [...prev, id]
    );
  };

  // ===================== PRINT QUEUE OPERATIONS =====================
  const getCurrentBatchLabel = (): string => {
    if (filterMode === 'class') {
      return `Class: ${selectedClass || 'General'}`;
    } else if (filterMode === 'daterange') {
      return `Date: ${startDate} to ${endDate}`;
    } else {
      const stu = studentsList.find(s => s.id === selectedStudentId || s.admissionNo === selectedStudentId);
      return `Student: ${stu?.fullName || selectedStudentId || 'Individual'}`;
    }
  };

  const handleAddSelectedToQueue = () => {
    const toAdd = filteredPayments.filter(p => selectedReceiptIds.includes(p.id));
    if (toAdd.length === 0) {
      showToast('Select one or more receipts first to add to the Print Queue.');
      return;
    }

    const batchLabel = getCurrentBatchLabel();
    const existingIds = new Set(printQueue.map(item => item.id));
    const nowIso = new Date().toISOString();

    const newItems: QueuedReceiptItem[] = [];
    toAdd.forEach(p => {
      if (!existingIds.has(p.id)) {
        newItems.push({
          id: p.id,
          payment: p,
          batchLabel,
          queuedAt: nowIso
        });
      }
    });

    if (newItems.length === 0) {
      showToast('All selected receipts are already in the Print Queue.');
      return;
    }

    setPrintQueue(prev => [...prev, ...newItems]);
    setSelectedQueueIds(prev => [...prev, ...newItems.map(item => item.id)]);
    showToast(`Added ${newItems.length} receipt${newItems.length > 1 ? 's' : ''} to Print Queue.`);
  };

  const handleQueueAllInFilter = () => {
    if (filteredPayments.length === 0) {
      showToast('No matching receipts to queue.');
      return;
    }
    const batchLabel = getCurrentBatchLabel();
    const existingIds = new Set(printQueue.map(item => item.id));
    const nowIso = new Date().toISOString();

    const newItems: QueuedReceiptItem[] = [];
    filteredPayments.forEach(p => {
      if (!existingIds.has(p.id)) {
        newItems.push({
          id: p.id,
          payment: p,
          batchLabel,
          queuedAt: nowIso
        });
      }
    });

    if (newItems.length === 0) {
      showToast('All filtered receipts are already in the Print Queue.');
      return;
    }

    setPrintQueue(prev => [...prev, ...newItems]);
    setSelectedQueueIds(prev => [...prev, ...newItems.map(item => item.id)]);
    showToast(`Queued entire batch of ${newItems.length} receipt${newItems.length > 1 ? 's' : ''}.`);
  };

  const handleRemoveFromQueue = (paymentId: string) => {
    setPrintQueue(prev => prev.filter(item => item.id !== paymentId));
    setSelectedQueueIds(prev => prev.filter(id => id !== paymentId));
  };

  const handleClearAllQueue = () => {
    setPrintQueue([]);
    setSelectedQueueIds([]);
    setIsQueueExpanded(false);
    showToast('Print Queue cleared completely.');
  };

  const handleToggleSelectQueueItem = (id: string) => {
    setSelectedQueueIds(prev => 
      prev.includes(id) ? prev.filter(itemId => itemId !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAllQueue = () => {
    if (selectedQueueIds.length === printQueue.length) {
      setSelectedQueueIds([]);
    } else {
      setSelectedQueueIds(printQueue.map(item => item.id));
    }
  };

  // Execute direct batch print via BatchReceiptPrintModal
  const handlePrintBatch = () => {
    if (selectedReceiptIds.length === 0) return;
    setBatchModalPayments(selectedReceiptIds);
    setIsBatchModalOpen(true);
  };

  // Execute queue selected print via BatchReceiptPrintModal
  const handlePrintSelectedQueue = () => {
    if (selectedQueueIds.length === 0) {
      showToast('Select at least one receipt in the queue to print.');
      return;
    }
    setBatchModalPayments(selectedQueueIds);
    setIsBatchModalOpen(true);
  };

  const getBillForPayment = (p: PaymentRecord) => {
    return billsList.find(b => 
      b.studentId === p.studentId || 
      (p.admissionNo && b.admissionNo && b.admissionNo.toLowerCase().trim() === p.admissionNo.toLowerCase().trim())
    );
  };

  const previewBill = previewReceipt ? getBillForPayment(previewReceipt) : undefined;
  const previewAmountWords = previewReceipt 
    ? (previewLanguage === 'FR' 
        ? numberToWordsFR(Number(previewReceipt.paid ?? previewReceipt.amount ?? 0))
        : numberToWordsEN(Number(previewReceipt.paid ?? previewReceipt.amount ?? 0)))
    : '';

  // Calculate printable payments based on active target
  const printTargetPayments = useMemo(() => {
    if (activePrintTarget === 'queue') {
      return printQueue
        .filter(item => selectedQueueIds.includes(item.id))
        .map(item => item.payment);
    }
    return paymentsList.filter(p => selectedReceiptIds.includes(p.id));
  }, [activePrintTarget, printQueue, selectedQueueIds, paymentsList, selectedReceiptIds]);

  const totalQueueAmount = useMemo(() => {
    return printQueue.reduce((sum, item) => sum + Number(item.payment.paid ?? item.payment.amount ?? 0), 0);
  }, [printQueue]);

  const uniqueBatches = useMemo(() => {
    return Array.from(new Set(printQueue.map(item => item.batchLabel)));
  }, [printQueue]);

  return (
    <div className="space-y-6 pb-28 relative">

      {/* Floating Alert Toast */}
      {queueToast && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs font-bold border border-slate-700 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{queueToast}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 rounded-3xl border border-indigo-900/40 relative overflow-hidden shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Official Treasury System
              </span>
              <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                Fiscal Serial Compliant
              </span>
              <span className="text-[10px] font-mono font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                Next Serial: {nextSerialPreview}
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2.5">
              <span>Receipt Generation Dashboard</span>
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Generate, preview, queue and multi-print authenticated physical A6 receipts (105mm × 148mm) individually or by entire class/daily batches. All receipts include tamper-proof dynamic QR verification linked to student bursary accounts.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button
              type="button"
              onClick={handleQueueAllInFilter}
              disabled={filteredPayments.length === 0}
              className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-lg ${
                filteredPayments.length > 0 
                  ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white shadow-indigo-950/30 active:scale-95'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <ListPlus className="w-4 h-4" />
              <span>Queue Entire Batch ({filteredPayments.length})</span>
            </button>
            <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/15 text-center min-w-[130px]">
              <span className="text-[9px] text-slate-300 uppercase font-black tracking-wider block">Fiscal Audit</span>
              <span className="text-sm font-black text-emerald-300 mt-0.5 block">{serialAudit.complianceScore}% Audited</span>
            </div>
          </div>
        </div>

        <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none transform translate-x-12 translate-y-12">
          <Printer className="w-72 h-72 text-indigo-400" />
        </div>
      </div>

      {/* Main Grid: Filters & Settings vs Selection Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Control Panel: Filters & Parameters */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-5">
            <div>
              <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-2">
                <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600" />
                <span>Receipt Selection Mode</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Choose how you want to filter and aggregate student receipts.</p>
            </div>

            {/* Mode Tabs */}
            <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => handleModeChange('class')}
                className={`py-2 px-2 rounded-xl transition-all cursor-pointer flex flex-col items-center gap-1 ${
                  filterMode === 'class' 
                    ? 'bg-white text-indigo-700 shadow-xs font-black' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="w-4 h-4" />
                <span className="text-[10px]">By Class</span>
              </button>
              
              <button
                type="button"
                onClick={() => handleModeChange('daterange')}
                className={`py-2 px-2 rounded-xl transition-all cursor-pointer flex flex-col items-center gap-1 ${
                  filterMode === 'daterange' 
                    ? 'bg-white text-indigo-700 shadow-xs font-black' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span className="text-[10px]">Daily / Date</span>
              </button>

              <button
                type="button"
                onClick={() => handleModeChange('individual')}
                className={`py-2 px-2 rounded-xl transition-all cursor-pointer flex flex-col items-center gap-1 ${
                  filterMode === 'individual' 
                    ? 'bg-white text-indigo-700 shadow-xs font-black' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <User className="w-4 h-4" />
                <span className="text-[10px]">Individual</span>
              </button>
            </div>

            {/* MODE 1: BY CLASS SELECTION */}
            {filterMode === 'class' && (
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <label className="text-xs font-black text-slate-700 block">
                  Select Target Academic Class
                </label>
                <select
                  value={selectedClass}
                  onChange={(e) => {
                    setSelectedClass(e.target.value);
                    setSelectedReceiptIds([]);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 bg-slate-50 focus:bg-white focus:border-indigo-500 transition-all cursor-pointer"
                >
                  {classesList.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <div className="text-[11px] text-slate-500 flex items-center justify-between">
                  <span>Payments available for class:</span>
                  <strong className="text-indigo-700 font-mono font-black">{filteredPayments.length} records</strong>
                </div>
              </div>
            )}

            {/* MODE 2: DATE RANGE / DAILY */}
            {filterMode === 'daterange' && (
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <label className="text-xs font-black text-slate-700 block">
                  Date Range / Daily Collection
                </label>
                <div className="space-y-2">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">From Date</span>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        setSelectedReceiptIds([]);
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-slate-50 focus:bg-white focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">To Date</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => {
                        setEndDate(e.target.value);
                        setSelectedReceiptIds([]);
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-slate-50 focus:bg-white focus:border-indigo-500"
                    />
                  </div>
                </div>
                <div className="flex gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      const today = new Date().toISOString().split('T')[0];
                      setStartDate(today);
                      setEndDate(today);
                    }}
                    className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold transition-colors cursor-pointer text-center"
                  >
                    Today Only
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() - 7);
                      setStartDate(d.toISOString().split('T')[0]);
                      setEndDate(new Date().toISOString().split('T')[0]);
                    }}
                    className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold transition-colors cursor-pointer text-center"
                  >
                    Last 7 Days
                  </button>
                </div>
              </div>
            )}

            {/* MODE 3: INDIVIDUAL STUDENT SEARCH */}
            {filterMode === 'individual' && (
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <label className="text-xs font-black text-slate-700 block">
                  Search Student Name or ID
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search by student or admission..."
                    value={studentSearchQuery}
                    onChange={(e) => setStudentSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-slate-50 focus:bg-white focus:border-indigo-500"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3.5" />
                </div>

                {searchableStudents.length > 0 && (
                  <div className="space-y-1 bg-slate-50 p-2 rounded-xl border border-slate-200 max-h-40 overflow-y-auto">
                    {searchableStudents.map(s => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setSelectedStudentId(s.id);
                          setStudentSearchQuery(s.fullName || s.name || '');
                          setSelectedReceiptIds([]);
                        }}
                        className={`w-full text-left p-2 rounded-lg text-xs transition-colors flex items-center justify-between cursor-pointer ${
                          selectedStudentId === s.id ? 'bg-indigo-600 text-white font-bold' : 'hover:bg-slate-200/70 text-slate-700'
                        }`}
                      >
                        <span className="truncate">{s.fullName || s.name}</span>
                        <span className="text-[10px] font-mono opacity-80 shrink-0">{s.admissionNo}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Physical Print Media Spec Note */}
            <div className="bg-indigo-50/70 p-4 rounded-2xl border border-indigo-100 space-y-1.5">
              <span className="text-[10px] font-black uppercase text-indigo-900 tracking-wider flex items-center gap-1.5">
                <Printer className="w-3.5 h-3.5 text-indigo-600" />
                <span>Physical Print Specifications</span>
              </span>
              <p className="text-[10.5px] text-indigo-900/80 leading-relaxed font-medium">
                Standard A6 portrait size (<strong className="font-bold">105mm × 148mm</strong>). Multi-receipt batches automatically break pages cleanly to fit individual A6 thermal/laser stock.
              </p>
            </div>
          </div>
        </div>

        {/* Right Main Table: Receipts List */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
          
          {/* Table Header Bar */}
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
            <div>
              <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                <span>Matching Payment Transactions</span>
                <span className="bg-indigo-100 text-indigo-800 text-[10px] font-black px-2 py-0.5 rounded-full">
                  {filteredPayments.length} Available
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Select transactions to print directly or add them to the persistent Print Queue.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {filteredPayments.length > 0 && (
                <button
                  type="button"
                  onClick={handleToggleSelectAll}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl text-[11px] font-bold text-slate-700 transition-colors cursor-pointer"
                >
                  {selectedReceiptIds.length === filteredPayments.length ? 'Deselect All' : 'Select All'}
                </button>
              )}

              {/* Add to Print Queue Button */}
              <button
                type="button"
                disabled={selectedReceiptIds.length === 0}
                onClick={handleAddSelectedToQueue}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                  selectedReceiptIds.length > 0
                    ? 'bg-slate-900 hover:bg-slate-800 text-white shadow-sm active:scale-95'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
                title="Add selected receipts to the floating Print Queue"
              >
                <ListPlus className="w-3.5 h-3.5" />
                <span>Queue Selected ({selectedReceiptIds.length})</span>
              </button>

              {/* Direct Print Button */}
              <button
                type="button"
                disabled={selectedReceiptIds.length === 0}
                onClick={handlePrintBatch}
                className={`px-4 py-1.5 text-xs font-extrabold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                  selectedReceiptIds.length > 0 
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-950/20 active:scale-95'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
                }`}
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Direct ({selectedReceiptIds.length})</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto flex-1 min-h-[350px]">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] uppercase font-black text-slate-400 tracking-wider">
                  <th className="p-4 w-12 text-center">Select</th>
                  <th className="p-4">Student & Class</th>
                  <th className="p-4">Particulars</th>
                  <th className="p-4">Receipt Serial</th>
                  <th className="p-4">Amount Paid</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center font-bold text-slate-400 space-y-2">
                      <FileText className="w-12 h-12 text-slate-200 mx-auto" />
                      <p className="text-xs">No transaction records found matching filters.</p>
                      <p className="text-[10px] text-slate-400 font-normal italic">Configure parameters in the Selection Mode Panel to load records.</p>
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map(p => {
                    const isChecked = selectedReceiptIds.includes(p.id);
                    const isAlreadyQueued = printQueue.some(item => item.id === p.id);
                    return (
                      <tr 
                        key={p.id}
                        className={`hover:bg-slate-50/50 transition-colors ${
                          isChecked ? 'bg-indigo-50/20' : ''
                        }`}
                      >
                        <td className="p-4 w-12 text-center">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleReceiptSelection(p.id)}
                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                        </td>
                        <td className="p-4">
                          <div>
                            <span className="font-black text-slate-800 block leading-tight">{p.studentName}</span>
                            <span className="text-[10.5px] text-slate-400 font-mono mt-0.5">{p.admissionNo} • {p.className}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="max-w-[140px] truncate">
                            <span className="font-bold text-slate-700 block">{p.paidAs || 'Tuition Fee'}</span>
                            <span className="text-[10px] text-slate-400 block mt-0.5 font-normal italic">{p.notes || 'N/A'}</span>
                          </div>
                        </td>
                        <td className="p-4 font-mono">
                          <div>
                            <span className="font-bold text-slate-900 block">{p.receiptNo || 'N/A'}</span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">{p.date}</span>
                          </div>
                        </td>
                        <td className="p-4 font-mono">
                          <div>
                            <span className="font-black text-emerald-700 block">{formatCurrency(p.paid ?? p.amount ?? 0)}</span>
                            <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-mono font-bold block w-max mt-1">{p.method}</span>
                          </div>
                        </td>
                        <td className="p-4 text-right space-x-1.5 whitespace-nowrap">
                          {isAlreadyQueued ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg">
                              <Check className="w-3 h-3" />
                              <span>Queued</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                handleAddSelectedToQueue();
                              }}
                              className="p-1.5 bg-slate-50 hover:bg-slate-200 text-slate-600 border border-slate-200 rounded-lg transition-all cursor-pointer inline-flex text-[10.5px] font-bold"
                              title="Add to Print Queue"
                            >
                              <ListPlus className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setPreviewReceipt(p);
                              setPreviewLanguage('FR');
                              setPreviewCopyType('Original');
                            }}
                            className="p-1.5 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 border border-slate-200 hover:border-indigo-200 rounded-lg transition-all cursor-pointer inline-flex items-center gap-1 text-[10.5px] font-bold shadow-2xs"
                            title="Interactive visual A6 preview"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Preview</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ===================== UNIFIED FLOATING PRINT QUEUE PANEL ===================== */}
      {printQueue.length > 0 && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 w-full max-w-4xl px-4 animate-scale-in">
          <div className="bg-slate-900/95 backdrop-blur-md text-white rounded-3xl shadow-2xl border border-slate-700/80 overflow-hidden shadow-slate-950/50">
            
            {/* Top Bar / Collapsed View */}
            <div className="p-3.5 sm:px-6 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-900/50 shrink-0">
                  <Printer className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs sm:text-sm font-black tracking-tight flex items-center gap-1.5">
                      <span>Print Queue</span>
                      <span className="bg-indigo-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                        {printQueue.length}
                      </span>
                    </h4>
                    <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                      • {uniqueBatches.length} batch{uniqueBatches.length > 1 ? 'es' : ''} queued
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 font-mono mt-0.5">
                    {formatCurrency(totalQueueAmount)} total • <strong className="text-indigo-300 font-bold">{selectedQueueIds.length}</strong> selected to print
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsQueueExpanded(!isQueueExpanded)}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 border border-slate-700"
                >
                  {isQueueExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                  <span>{isQueueExpanded ? 'Collapse' : 'Manage Queue'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleClearAllQueue}
                  className="px-3 py-2 bg-rose-950/60 hover:bg-rose-900 text-rose-300 hover:text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 border border-rose-800/40"
                  title="Clear all queued receipts"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear All</span>
                </button>

                <button
                  type="button"
                  disabled={selectedQueueIds.length === 0}
                  onClick={handlePrintSelectedQueue}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-md ${
                    selectedQueueIds.length > 0
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-emerald-950/30 active:scale-95'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed shadow-none'
                  }`}
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Selected ({selectedQueueIds.length})</span>
                </button>
              </div>
            </div>

            {/* Expanded Drawer: Queue Inspection & Individual Selection */}
            {isQueueExpanded && (
              <div className="border-t border-slate-800 bg-slate-950/90 p-4 sm:p-6 space-y-4 max-h-72 overflow-y-auto">
                <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleToggleSelectAllQueue}
                      className="text-xs font-bold text-indigo-400 hover:text-indigo-300 cursor-pointer"
                    >
                      {selectedQueueIds.length === printQueue.length ? 'Deselect All in Queue' : 'Select All in Queue'}
                    </button>
                    <span>({selectedQueueIds.length} of {printQueue.length} selected)</span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500">Physical A6 Auto-pagination</span>
                </div>

                <div className="space-y-2">
                  {printQueue.map((item, idx) => {
                    const isChecked = selectedQueueIds.includes(item.id);
                    return (
                      <div 
                        key={item.id}
                        className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 text-xs ${
                          isChecked 
                            ? 'bg-indigo-950/40 border-indigo-700/60 text-white' 
                            : 'bg-slate-900/60 border-slate-800 text-slate-400'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleSelectQueueItem(item.id)}
                            className="w-4 h-4 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-black text-white text-xs truncate">{item.payment.studentName}</span>
                              <span className="text-[10px] font-mono bg-slate-800 px-1.5 py-0.2 rounded text-slate-300">{item.payment.admissionNo}</span>
                              <span className="text-[10px] bg-indigo-900/80 text-indigo-200 px-2 py-0.2 rounded-full font-bold">{item.batchLabel}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-[11px] font-mono text-slate-400">
                              <span className="text-indigo-300 font-bold">{item.payment.receiptNo}</span>
                              <span>•</span>
                              <span>{item.payment.date}</span>
                              <span>•</span>
                              <span className="text-emerald-400 font-bold">{formatCurrency(item.payment.paid ?? item.payment.amount ?? 0)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setPreviewReceipt(item.payment);
                              setPreviewLanguage('FR');
                              setPreviewCopyType('Original');
                            }}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
                            title="Preview receipt"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveFromQueue(item.id)}
                            className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900 text-rose-300 hover:text-white cursor-pointer"
                            title="Remove from queue"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Hidden print-only batch container used for physical printer layout alignment */}
      {printTargetPayments.length > 0 && (
        <div className="print-batch-only-wrapper">
          {printTargetPayments.map((p) => {
            const matchedBill = getBillForPayment(p);
            const amountPaidVal = Number(p.paid ?? p.amount ?? 0);
            const arrearsVal = Number(p.arrears ?? matchedBill?.arrears ?? 0);
            const payableVal = Number(p.payable ?? matchedBill?.payable ?? (amountPaidVal + (p.balance ?? 0)));
            const balanceVal = Number(p.balance ?? matchedBill?.balance ?? 0);
            const discountVal = Number(p.discount ?? matchedBill?.discount ?? 0);
            const wordFR = numberToWordsFR(amountPaidVal);
            const wordEN = numberToWordsEN(amountPaidVal);
            
            const termDisplay = p.term || matchedBill?.term || schoolSettings.activeTerm || 'First Term';
            const yearDisplay = p.academicYear || matchedBill?.academicYear || schoolSettings.activeAcademicYear || '2025-2026';
            const verificationHash = `JPS-${(p.receiptNo || '').slice(-6).toUpperCase()}-${p.date.replace(/-/g, '')}-${amountPaidVal}`;

            return (
              <div 
                key={p.id}
                className="print-a6-receipt-container font-sans"
                style={{ pageBreakAfter: 'always', breakAfter: 'page' }}
              >
                <div>
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2 border-b border-slate-900 pb-1">
                    <div className="flex items-center gap-2">
                      <JIPASLogo size="sm" className="shrink-0" rounded={true} />
                      <div className="leading-none">
                        <h1 className="text-[10px] font-black uppercase tracking-tight text-slate-950">
                          {schoolSettings.schoolName || 'JOY INTERNATIONAL SCHOOL (JIPAS)'}
                        </h1>
                        <p className="text-[6.5px] text-slate-500 font-bold italic mt-0.5">
                          "{schoolSettings.schoolMotto || 'Education is Wealth • Knowledge, Discipline & Excellence'}"
                        </p>
                        <p className="text-[5.5px] text-slate-400 font-normal mt-0.5">
                          {schoolSettings.address ? `${schoolSettings.address}` : 'BP 2364 • Behind T-Oil, Lomé Togo'} • Tel: {schoolSettings.phone || '(00228) 22 60 21 38'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="inline-block bg-slate-950 text-white text-[6.5px] font-black uppercase px-1 rounded-sm">
                        Reçu de Caisse
                      </span>
                      <div className="text-[5.5px] font-black text-indigo-700 uppercase tracking-widest mt-0.5">
                        Copie Originale
                      </div>
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="bg-slate-100 px-1.5 py-0.5 my-1 border border-slate-200 rounded flex justify-between items-center text-[7px] font-bold font-mono">
                    <div>
                      <span className="text-slate-500">N° Reçu: </span>
                      <span className="text-blue-800">{p.receiptNo}</span>
                    </div>
                    <div className="flex gap-2 text-slate-600">
                      <span>Date: <strong className="text-slate-950">{p.date}</strong></span>
                      {p.referenceNo && (
                        <span>Ref: <strong className="text-slate-950">{(p.referenceNo || '').slice(-6).toUpperCase()}</strong></span>
                      )}
                    </div>
                  </div>

                  {/* Student details */}
                  <div className="grid grid-cols-2 gap-1 text-[7.5px] bg-slate-50 border border-slate-200 rounded p-1 mb-1">
                    <div className="space-y-0.5">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Nom de l'Élève:</span>
                        <strong className="text-slate-950 font-bold truncate max-w-[80px]">{p.studentName}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Matricule:</span>
                        <strong className="text-indigo-800 font-mono font-bold">{p.admissionNo}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Classe:</span>
                        <strong className="text-slate-800 truncate max-w-[80px]">{p.className}</strong>
                      </div>
                    </div>
                    <div className="space-y-0.5 border-l border-slate-200 pl-1">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Année Acad.:</span>
                        <strong className="text-slate-950">{yearDisplay}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Semestre/Trim.:</span>
                        <strong className="text-slate-950">{termDisplay}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Méthode:</span>
                        <strong className="text-emerald-700">{p.paymentMethod || p.method}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Fees Breakdown Table */}
                  <table className="w-full text-left text-[7.5px] border-collapse mb-1">
                    <thead>
                      <tr className="bg-slate-950 text-white text-[7px] uppercase font-bold tracking-wider">
                        <th className="p-0.5 border border-slate-950">Libellé</th>
                        <th className="p-0.5 text-right border border-slate-950">Montant (CFA)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-mono">
                      {arrearsVal > 0 && (
                        <tr className="text-slate-600">
                          <td className="p-0.5 font-sans">Reliquat Antérieur (Arrears)</td>
                          <td className="p-0.5 text-right">{arrearsVal.toLocaleString()} CFA</td>
                        </tr>
                      )}
                      {discountVal > 0 && (
                        <tr className="text-rose-600">
                          <td className="p-0.5 font-sans">Remise Accordée (Discount)</td>
                          <td className="p-0.5 text-right">-{discountVal.toLocaleString()} CFA</td>
                        </tr>
                      )}
                      <tr>
                        <td className="p-0.5 font-semibold text-slate-800 font-sans">{p.notes || p.paidAs || 'Frais de Scolarité / Tuition'}</td>
                        <td className="p-0.5 text-right font-bold text-slate-900">{(payableVal - arrearsVal + discountVal).toLocaleString()} CFA</td>
                      </tr>
                      <tr className="bg-slate-100 font-bold text-slate-900 border-t border-slate-900">
                        <td className="p-0.5 text-sans">Total Dû (Total Payable)</td>
                        <td className="p-0.5 text-right">{payableVal.toLocaleString()} CFA</td>
                      </tr>
                      <tr className="bg-emerald-50 font-black text-emerald-800 border-t border-slate-900 text-[8px]">
                        <td className="p-0.5 text-sans">Montant Versé (Amount Paid)</td>
                        <td className="p-0.5 text-right">{amountPaidVal.toLocaleString()} CFA</td>
                      </tr>
                      <tr className="bg-rose-50 font-bold text-rose-800">
                        <td className="p-0.5 text-sans">Solde Restant (Balance Due)</td>
                        <td className="p-0.5 text-right">{balanceVal.toLocaleString()} CFA</td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Word Statement */}
                  <div className="bg-slate-50 border border-slate-200 rounded p-1 text-[6.5px] text-slate-700 mb-1 leading-tight">
                    <span className="font-bold text-slate-500 block">Arrêté la présente somme à (Amount in Words):</span>
                    <span className="font-semibold text-slate-950 italic">"{wordFR}" ({wordEN})</span>
                  </div>
                </div>

                {/* Stamp & Dynamic Verification QR Footer */}
                <div>
                  <div className="grid grid-cols-12 gap-1 border-t border-slate-200 pt-1">
                    <div className="col-span-4 flex items-center justify-center">
                      <div className="bg-white p-0.5 border border-slate-200 rounded">
                        <ReceiptQRCode 
                          receiptId={p.id}
                          receiptNo={p.receiptNo}
                          referenceNo={p.referenceNo}
                          studentName={p.studentName}
                          admissionNo={p.admissionNo}
                          amount={amountPaidVal}
                          date={p.date}
                          size={44}
                          showLabel={false}
                        />
                      </div>
                    </div>
                    <div className="col-span-4 flex items-center justify-center relative rotate-12 border-2 border-emerald-600/50 text-emerald-700/80 rounded-full w-12 h-12 text-center scale-90">
                      <div className="flex flex-col items-center justify-center scale-95 leading-none">
                        <span className="text-[3px] font-bold">JOY INT'L</span>
                        <span className="text-[4.5px] font-black">VALIDÉ</span>
                        <span className="text-[3px] font-mono opacity-80">{verificationHash.slice(0, 8)}</span>
                      </div>
                    </div>
                    <div className="col-span-4 text-center flex flex-col justify-end">
                      <span className="text-[6px] text-slate-400 block border-b border-slate-300 pb-2 mb-0.5 font-bold">Signature / Caisse</span>
                      <span className="text-[5px] text-slate-400 font-bold block">JIPAS Treasury Desk</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ===================== A6 RECEIPT PREVIEW RESPONSIVE MODAL ===================== */}
      {previewReceipt && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4 relative my-auto font-medium animate-scale-in">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="bg-indigo-100 text-indigo-800 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Interactive A6 Preview
                </span>
                <span className="text-xs font-mono font-bold text-slate-500">{previewReceipt.receiptNo}</span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewReceipt(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Translation and Copy Type Controls */}
            <div className="flex gap-2 items-center justify-between text-xs font-bold text-slate-600 flex-wrap">
              <div className="flex gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setPreviewLanguage('FR')}
                  className={`px-3 py-1 rounded-lg cursor-pointer ${previewLanguage === 'FR' ? 'bg-white shadow-sm text-indigo-700' : ''}`}
                >
                  FR
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewLanguage('EN')}
                  className={`px-3 py-1 rounded-lg cursor-pointer ${previewLanguage === 'EN' ? 'bg-white shadow-sm text-indigo-700' : ''}`}
                >
                  EN
                </button>
              </div>

              <div className="flex gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                {(['Original', 'Duplicate', 'Student', 'Finance'] as const).map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setPreviewCopyType(type)}
                    className={`px-2 py-1 rounded-lg text-[10px] cursor-pointer ${previewCopyType === type ? 'bg-white shadow-sm text-indigo-700 font-black' : ''}`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Skeuomorphic visual A6 receipt preview frame */}
            <div className="bg-slate-950 p-4 sm:p-6 rounded-2xl flex items-center justify-center border border-slate-800">
              <div className="bg-white text-slate-950 w-full max-w-[100mm] min-h-[142mm] p-3 shadow-xl rounded-md border border-slate-200 flex flex-col justify-between font-sans text-[8px]">
                <div>
                  <div className="flex items-start justify-between gap-2 border-b border-slate-900 pb-1.5">
                    <div className="flex items-center gap-1.5">
                      <JIPASLogo size="sm" className="shrink-0" rounded={true} />
                      <div className="leading-none">
                        <h1 className="text-[10px] font-black uppercase tracking-tight text-slate-950">
                          {schoolSettings.schoolName || 'JOY INTERNATIONAL SCHOOL (JIPAS)'}
                        </h1>
                        <p className="text-[6.5px] text-slate-500 font-bold italic mt-0.5">
                          "{schoolSettings.schoolMotto || 'Education is Wealth • Knowledge, Discipline & Excellence'}"
                        </p>
                        <p className="text-[5.5px] text-slate-400 font-normal mt-0.5">
                          Tel: {schoolSettings.phone || '(00228) 22 60 21 38'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="inline-block bg-slate-950 text-white text-[6px] font-black uppercase px-1 py-0.5 rounded-sm tracking-wide">
                        {previewLanguage === 'FR' ? 'Reçu de Caisse' : 'Official Receipt'}
                      </span>
                      <div className="text-[5.5px] font-black text-indigo-700 uppercase tracking-widest mt-0.5">
                        {previewCopyType}
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-100 px-1.5 py-0.5 my-1 border border-slate-200 rounded flex justify-between items-center text-[7px] font-bold font-mono">
                    <div>
                      <span className="text-slate-500">N°: </span>
                      <span className="text-blue-800">{previewReceipt.receiptNo}</span>
                    </div>
                    <div className="flex gap-2 text-slate-600">
                      <span>Date: <strong className="text-slate-950">{previewReceipt.date}</strong></span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 text-[7.5px] bg-slate-50 border border-slate-200 rounded p-1 mb-1">
                    <div className="space-y-0.5">
                      <div className="flex justify-between">
                        <span className="text-slate-500">{previewLanguage === 'FR' ? 'Nom Élève:' : 'Student:'}</span>
                        <strong className="text-slate-950 font-bold truncate max-w-[80px]">{previewReceipt.studentName}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">{previewLanguage === 'FR' ? 'Matricule:' : 'Adm No:'}</span>
                        <strong className="text-indigo-800 font-mono font-bold">{previewReceipt.admissionNo}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Classe:</span>
                        <strong className="text-slate-800 truncate max-w-[80px]">{previewReceipt.className}</strong>
                      </div>
                    </div>
                    <div className="space-y-0.5 border-l border-slate-200 pl-1.5">
                      <div className="flex justify-between">
                        <span className="text-slate-500">{previewLanguage === 'FR' ? 'Année Acad.:' : 'Year:'}</span>
                        <strong className="text-slate-950">{previewReceipt.academicYear || schoolSettings.activeAcademicYear}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">{previewLanguage === 'FR' ? 'Semestre:' : 'Term:'}</span>
                        <strong className="text-slate-950">{previewReceipt.term || schoolSettings.activeTerm}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Méthode:</span>
                        <strong className="text-emerald-700">{previewReceipt.paymentMethod || previewReceipt.method}</strong>
                      </div>
                    </div>
                  </div>

                  <table className="w-full text-left text-[7.5px] border-collapse mb-1">
                    <thead>
                      <tr className="bg-slate-950 text-white text-[7px] uppercase font-bold tracking-wider">
                        <th className="p-0.5 border border-slate-950">Libellé</th>
                        <th className="p-0.5 text-right border border-slate-950">Montant (CFA)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-mono">
                      {Number(previewReceipt.arrears ?? previewBill?.arrears ?? 0) > 0 && (
                        <tr className="text-slate-600">
                          <td className="p-0.5 font-sans">Reliquat Antérieur (Arrears)</td>
                          <td className="p-0.5 text-right">{Number(previewReceipt.arrears ?? previewBill?.arrears ?? 0).toLocaleString()} CFA</td>
                        </tr>
                      )}
                      {Number(previewReceipt.discount ?? previewBill?.discount ?? 0) > 0 && (
                        <tr className="text-rose-600">
                          <td className="p-0.5 font-sans">Remise Accordée (Discount)</td>
                          <td className="p-0.5 text-right">-{Number(previewReceipt.discount ?? previewBill?.discount ?? 0).toLocaleString()} CFA</td>
                        </tr>
                      )}
                      <tr>
                        <td className="p-0.5 font-semibold text-slate-800 font-sans">{previewReceipt.notes || previewReceipt.paidAs || 'Frais de Scolarité'}</td>
                        <td className="p-0.5 text-right font-bold text-slate-900">{(Number(previewReceipt.payable ?? previewBill?.payable ?? 0) - Number(previewReceipt.arrears ?? previewBill?.arrears ?? 0) + Number(previewReceipt.discount ?? previewBill?.discount ?? 0)).toLocaleString()} CFA</td>
                      </tr>
                      <tr className="bg-slate-100 font-bold text-slate-900 border-t border-slate-900">
                        <td className="p-0.5 text-sans">Total Payable</td>
                        <td className="p-0.5 text-right">{Number(previewReceipt.payable ?? previewBill?.payable ?? (Number(previewReceipt.paid ?? 0) + Number(previewReceipt.balance ?? 0))).toLocaleString()} CFA</td>
                      </tr>
                      <tr className="bg-emerald-50 font-black text-emerald-800 border-t border-slate-900 text-[8px]">
                        <td className="p-0.5 text-sans">Montant Versé (Amount Paid)</td>
                        <td className="p-0.5 text-right">{Number(previewReceipt.paid ?? previewReceipt.amount ?? 0).toLocaleString()} CFA</td>
                      </tr>
                      <tr className="bg-rose-50 font-bold text-rose-800">
                        <td className="p-0.5 text-sans">Solde Restant (Balance)</td>
                        <td className="p-0.5 text-right">{Number(previewReceipt.balance ?? previewBill?.balance ?? 0).toLocaleString()} CFA</td>
                      </tr>
                    </tbody>
                  </table>

                  <div className="bg-slate-50 border border-slate-200 rounded p-1 text-[6.5px] text-slate-700 leading-tight">
                    <span className="font-bold text-slate-500 block">Arrêté la présente somme à (Amount in Words):</span>
                    <span className="font-semibold text-slate-950 italic">"{previewAmountWords}"</span>
                  </div>
                </div>

                <div>
                  <div className="grid grid-cols-12 gap-1 border-t border-slate-200 pt-1.5">
                    <div className="col-span-4 flex items-center justify-center">
                      <div className="bg-white p-0.5 border border-slate-200 rounded">
                        <ReceiptQRCode 
                          receiptId={previewReceipt.id}
                          receiptNo={previewReceipt.receiptNo}
                          referenceNo={previewReceipt.referenceNo}
                          studentName={previewReceipt.studentName}
                          admissionNo={previewReceipt.admissionNo}
                          amount={Number(previewReceipt.paid ?? previewReceipt.amount ?? 0)}
                          date={previewReceipt.date}
                          size={44}
                          showLabel={false}
                        />
                      </div>
                    </div>
                    <div className="col-span-4 flex items-center justify-center relative rotate-12 border border-emerald-600 text-emerald-700 rounded-full w-11 h-11 text-center scale-95 leading-none">
                      <div className="flex flex-col items-center justify-center scale-90">
                        <span className="text-[3px] font-bold">JOY INT'L</span>
                        <span className="text-[4px] font-black my-0.5">VERIFIED</span>
                        <span className="text-[3px] font-mono opacity-80">{(previewReceipt.id || 'JPS').slice(0, 5).toUpperCase()}</span>
                      </div>
                    </div>
                    <div className="col-span-4 text-center flex flex-col justify-end text-slate-400">
                      <span className="text-[6.5px] block border-b border-slate-300 pb-1 font-semibold">Treasury Desk</span>
                      <span className="text-[5px] font-bold block">JIPAS Official</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Digital Authenticity & Verification Link Panel */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-black tracking-wider text-slate-600 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Digital Authenticity Verification</span>
                </span>
                <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                  Live URL Linked
                </span>
              </div>
              <p className="text-[10px] text-slate-500">
                The embedded dynamic QR code links directly to this student's official payment record on the JIPAS portal:
              </p>
              <div className="bg-white p-2 rounded-xl border border-slate-200 text-[10px] font-mono text-slate-700 truncate select-all flex items-center justify-between gap-2">
                <span className="truncate">
                  {buildReceiptVerificationUrl({
                    receiptNo: previewReceipt.receiptNo,
                    studentName: previewReceipt.studentName,
                    admissionNo: previewReceipt.admissionNo,
                    amount: Number(previewReceipt.paid ?? previewReceipt.amount ?? 0),
                    date: previewReceipt.date,
                    receiptId: previewReceipt.id
                  })}
                </span>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const url = buildReceiptVerificationUrl({
                      receiptNo: previewReceipt.receiptNo,
                      studentName: previewReceipt.studentName,
                      admissionNo: previewReceipt.admissionNo,
                      amount: Number(previewReceipt.paid ?? previewReceipt.amount ?? 0),
                      date: previewReceipt.date,
                      receiptId: previewReceipt.id
                    });
                    try {
                      window.dispatchEvent(new CustomEvent('jipas_open_verify_receipt', {
                        detail: {
                          receiptNo: previewReceipt.receiptNo,
                          admissionNo: previewReceipt.admissionNo,
                          studentName: previewReceipt.studentName,
                          amount: Number(previewReceipt.paid ?? previewReceipt.amount ?? 0),
                          date: previewReceipt.date,
                          receiptId: previewReceipt.id,
                          verificationUrl: url
                        }
                      }));
                    } catch {}
                  }}
                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded-xl text-[10.5px] border border-emerald-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Test Digital Verification</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const toQueue: QueuedReceiptItem = {
                      id: previewReceipt.id,
                      payment: previewReceipt,
                      batchLabel: `Single: ${previewReceipt.studentName}`,
                      queuedAt: new Date().toISOString()
                    };
                    if (!printQueue.some(q => q.id === previewReceipt.id)) {
                      setPrintQueue(prev => [...prev, toQueue]);
                      setSelectedQueueIds(prev => [...prev, previewReceipt.id]);
                      showToast(`Added Receipt #${previewReceipt.receiptNo} to Print Queue.`);
                    } else {
                      showToast('Receipt is already in Print Queue.');
                    }
                  }}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-[10.5px] border border-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ListPlus className="w-3.5 h-3.5 text-slate-600" />
                  <span>Add to Print Queue</span>
                </button>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setPreviewReceipt(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer transition-colors"
              >
                Close Preview
              </button>
              <button
                type="button"
                onClick={() => {
                  setBatchModalPayments([previewReceipt.id]);
                  setIsBatchModalOpen(true);
                }}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-indigo-950/20 cursor-pointer transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print This Receipt (4 on A4 / A6)</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Batch Receipt Print Modal (4 on 1 A4 & A6) */}
      {isBatchModalOpen && (
        <BatchReceiptPrintModal
          isOpen={isBatchModalOpen}
          onClose={() => setIsBatchModalOpen(false)}
          selectedPaymentIds={batchModalPayments}
          payments={paymentsList}
          students={studentsList}
          bills={billsList}
          initialPaperMode="a4_four_per_page"
        />
      )}

    </div>
  );
}

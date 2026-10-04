import React, { useState, useMemo, useEffect } from 'react';
import { 
  FileText, 
  Settings, 
  Printer, 
  Search, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Building2, 
  BookOpen, 
  User, 
  Calendar, 
  DollarSign, 
  Layers, 
  RotateCcw, 
  ChevronRight,
  ExternalLink,
  Edit2,
  Check,
  Filter,
  Sparkles
} from 'lucide-react';
import { 
  Student, 
  StudentBill, 
  NextTermBillSetup, 
  NextTermFeeItem, 
  ClassFeeTariffItem,
  PaymentRecord 
} from '../../types';
import { 
  getStoredStudents, 
  getStoredBills, 
  getStoredPayments, 
  getStoredSettings, 
  getStoredClasses,
  getStoredDepartments,
  saveStoredBills
} from '../../services/storageService';
import { 
  getStoredNextTermSetups, 
  saveNextTermBillSetup, 
  deleteNextTermBillSetup, 
  findNextTermSetup, 
  getStudentCurrentArrears, 
  prepareNextTermBillForStudent, 
  saveNextTermStudentBill, 
  batchGenerateNextTermBills,
  getNextTermInfo,
  DEFAULT_NEXT_TERM_BANK_DETAILS,
  inferDepartmentForClass
} from '../../services/nextTermBillingService';
import PrintableNextTermBillModal from './PrintableNextTermBillModal';
import ReceiptGenerationDashboard from './ReceiptGenerationDashboard';
import JIPASLogo from './JIPASLogo';

interface NextTermBillingManagerProps {
  userRole?: 'admin' | 'accountant' | 'secretary' | 'ceo';
  onNavigateToReceipts?: () => void;
  preselectedStudentId?: string;
}

export default function NextTermBillingManager({
  userRole = 'admin',
  onNavigateToReceipts,
  preselectedStudentId
}: NextTermBillingManagerProps) {
  const canSetup = userRole === 'admin' || userRole === 'accountant' || userRole === 'ceo';
  const settings = getStoredSettings();
  const currency = (settings as any).currency || (settings as any).currencySymbol || 'CFA';
  const nextInfo = useMemo(() => getNextTermInfo(), []);

  // Main navigation tab
  const [activeTab, setActiveTab] = useState<'individual' | 'setup' | 'roster' | 'receipts'>('individual');

  // Shared data states
  const [students, setStudents] = useState<Student[]>([]);
  const [bills, setBills] = useState<StudentBill[]>([]);
  const [setups, setSetups] = useState<NextTermBillSetup[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // ==========================================
  // TAB 1: INDIVIDUAL STUDENT BILL GENERATION
  // ==========================================
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudentClassFilter, setSelectedStudentClassFilter] = useState('All');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  
  // Customization fields for selected student's next term bill
  const [targetAcademicYear, setTargetAcademicYear] = useState(nextInfo.nextAcademicYear);
  const [targetTerm, setTargetTerm] = useState(nextInfo.nextTerm);
  const [includeArrears, setIncludeArrears] = useState(true);
  const [customDiscount, setCustomDiscount] = useState<number>(0);
  const [discountNote, setDiscountNote] = useState('');
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [customOneOffItems, setCustomOneOffItems] = useState<{ name: string; amount: number }[]>([]);
  const [newCustomItemName, setNewCustomItemName] = useState('');
  const [newCustomItemAmount, setNewCustomItemAmount] = useState('');

  // Modal preview state
  const [previewingBill, setPreviewingBill] = useState<StudentBill | null>(null);

  // ==========================================
  // TAB 2: SETUP NEXT TERM BILL (BY CLASS OR DEPT)
  // ==========================================
  const [editingSetupId, setEditingSetupId] = useState<string | null>(null);
  const [setupTargetType, setSetupTargetType] = useState<'class' | 'department'>('department');
  const [setupTargetName, setSetupTargetName] = useState<string>('');
  const [setupYear, setSetupYear] = useState(nextInfo.nextAcademicYear);
  const [setupTerm, setSetupTerm] = useState(nextInfo.nextTerm);
  const [setupResumptionDate, setSetupResumptionDate] = useState('12th January 2027');
  const [setupDueDate, setSetupDueDate] = useState('30th January 2027');
  const [setupNotes, setSetupNotes] = useState('Quote Student Admission Number on all pay-in slips and Mobile Money transfers.');
  const [setupItems, setSetupItems] = useState<NextTermFeeItem[]>([
    { id: 'item-1', name: 'Tuition & Academic Core Instruction', amount: 500, category: 'tuition', defaultSelected: true },
    { id: 'item-2', name: 'PTA Development Dues', amount: 60, category: 'pta', defaultSelected: true },
    { id: 'item-3', name: 'Computer & ICT Laboratory Levy', amount: 50, category: 'ict', defaultSelected: true },
    { id: 'item-4', name: 'Terminal Examination & Stationery Levy', amount: 40, category: 'exam', defaultSelected: true },
    { id: 'item-5', name: 'Infirmary Health & Clinic Levy', amount: 30, category: 'health', defaultSelected: true },
    { id: 'item-6', name: 'Optional Bus Transit Route', amount: 150, category: 'transit', isOptional: true, defaultSelected: false }
  ]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemAmount, setNewItemAmount] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<NextTermFeeItem['category']>('custom');
  const [newItemOptional, setNewItemOptional] = useState(false);

  // Batch Generation State
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);

  // ==========================================
  // TAB 3: NEXT TERM BILLS ROSTER & MULTI-PRINT
  // ==========================================
  const [rosterClassFilter, setRosterClassFilter] = useState('All');
  const [rosterStatusFilter, setRosterStatusFilter] = useState('All');
  const [rosterSearch, setRosterSearch] = useState('');
  const [selectedRosterBillIds, setSelectedRosterBillIds] = useState<string[]>([]);

  // Load initial data
  const loadData = () => {
    setStudents(getStoredStudents());
    setBills(getStoredBills());
    setSetups(getStoredNextTermSetups());
  };

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener('jipas_next_term_setups_updated', handleUpdate);
    window.addEventListener('jipas_next_term_bill_generated', handleUpdate);
    window.addEventListener('jipas_next_term_batch_generated', handleUpdate);
    window.addEventListener('jipas_bills_updated', handleUpdate);
    return () => {
      window.removeEventListener('jipas_next_term_setups_updated', handleUpdate);
      window.removeEventListener('jipas_next_term_bill_generated', handleUpdate);
      window.removeEventListener('jipas_next_term_batch_generated', handleUpdate);
      window.removeEventListener('jipas_bills_updated', handleUpdate);
    };
  }, []);

  // Handle preselected student if passed
  useEffect(() => {
    if (preselectedStudentId && students.length > 0) {
      const match = students.find(s => s.id === preselectedStudentId || s.admissionNo === preselectedStudentId);
      if (match) {
        setSelectedStudent(match);
      }
    }
  }, [preselectedStudentId, students]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Distinct lists
  const availableClasses = useMemo(() => {
    const list = new Set<string>();
    try {
      getStoredClasses().forEach(c => { if (c.name) list.add(c.name); });
    } catch {}
    students.forEach(s => {
      const c = s.className || (s as any).class;
      if (c) list.add(c);
    });
    return Array.from(list).sort();
  }, [students]);

  const availableDepartments = useMemo(() => {
    const list = new Set<string>();
    try {
      getStoredDepartments().forEach(d => { if (d.name) list.add(d.name); });
    } catch {}
    // Standard school departments
    list.add('Pre-School / Kindergarten');
    list.add('Primary School');
    list.add('Junior High School');
    list.add('Senior High School');
    list.add('Boarding Department');
    return Array.from(list).sort();
  }, []);

  // Set default setup target name if not selected
  useEffect(() => {
    if (!setupTargetName) {
      if (setupTargetType === 'class' && availableClasses.length > 0) {
        setSetupTargetName(availableClasses[0]);
      } else if (setupTargetType === 'department' && availableDepartments.length > 0) {
        setSetupTargetName(availableDepartments[0]);
      }
    }
  }, [setupTargetType, availableClasses, availableDepartments, setupTargetName]);

  // Filter students for search in Individual Tab
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      if (s.status === 'Inactive' || s.status === 'Withdrawn' || s.status === 'Graduated') return false;
      const sClass = s.className || (s as any).class || '';
      if (selectedStudentClassFilter !== 'All' && sClass.toLowerCase() !== selectedStudentClassFilter.toLowerCase()) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const name = (s.fullName || (s as any).name || '').toLowerCase();
      const adm = (s.admissionNo || '').toLowerCase();
      return name.includes(q) || adm.includes(q) || sClass.toLowerCase().includes(q);
    });
  }, [students, selectedStudentClassFilter, searchQuery]);

  // Active matched setup for the selected student
  const studentMatchedSetup = useMemo(() => {
    if (!selectedStudent) return null;
    const sClass = selectedStudent.className || (selectedStudent as any).class;
    const sDept = selectedStudent.department || inferDepartmentForClass(sClass);
    return findNextTermSetup(sClass, sDept, targetTerm, targetAcademicYear);
  }, [selectedStudent, targetTerm, targetAcademicYear, setups]);

  // Sync selected items when student or setup changes
  useEffect(() => {
    if (studentMatchedSetup?.setup) {
      const defaultIds = studentMatchedSetup.setup.items
        .filter(it => it.defaultSelected ?? !it.isOptional)
        .map(it => it.id);
      setSelectedItemIds(defaultIds);
      setCustomOneOffItems([]);
    }
  }, [studentMatchedSetup?.setup?.id, selectedStudent?.id]);

  // Student current term balance
  const studentFinancials = useMemo(() => {
    if (!selectedStudent) return { arrears: 0, credit: 0 };
    return getStudentCurrentArrears(selectedStudent.id, selectedStudent.admissionNo);
  }, [selectedStudent, bills]);

  // Calculated next term bill for preview/save
  const computedNextBill = useMemo(() => {
    if (!selectedStudent) return null;
    return prepareNextTermBillForStudent({
      student: selectedStudent,
      setup: studentMatchedSetup?.setup,
      academicYear: targetAcademicYear,
      term: targetTerm,
      includeCurrentArrears: includeArrears,
      discount: customDiscount,
      discountReason: discountNote,
      selectedItemIds,
      customItems: customOneOffItems
    });
  }, [
    selectedStudent, 
    studentMatchedSetup, 
    targetAcademicYear, 
    targetTerm, 
    includeArrears, 
    customDiscount, 
    discountNote, 
    selectedItemIds, 
    customOneOffItems
  ]);

  // Generate and save individual bill
  const handleSaveIndividualBill = async () => {
    if (!computedNextBill || !selectedStudent) return;
    try {
      const saved = await saveNextTermStudentBill(computedNextBill);
      setBills(getStoredBills());
      showToast(`Next term bill #${saved.billNo} generated and saved for ${selectedStudent.fullName}!`);
    } catch (err) {
      console.error(err);
      showToast('Error saving next term bill.');
    }
  };

  // Setup tab: add line item to editor
  const handleAddSetupItem = () => {
    if (!newItemName.trim() || isNaN(Number(newItemAmount)) || Number(newItemAmount) < 0) {
      showToast('Please specify a valid item name and positive amount.');
      return;
    }
    const newItem: NextTermFeeItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      name: newItemName.trim(),
      amount: Number(newItemAmount),
      category: newItemCategory,
      isOptional: newItemOptional,
      defaultSelected: !newItemOptional
    };
    setSetupItems(prev => [...prev, newItem]);
    setNewItemName('');
    setNewItemAmount('');
    setNewItemOptional(false);
  };

  const handleRemoveSetupItem = (id: string) => {
    setSetupItems(prev => prev.filter(item => item.id !== id));
  };

  const handleSaveSetup = () => {
    if (!setupTargetName) {
      showToast('Please select a target class or department.');
      return;
    }
    if (setupItems.length === 0) {
      showToast('Please add at least one fee item to the schedule.');
      return;
    }
    const totalAmount = setupItems
      .filter(it => !it.isOptional)
      .reduce((sum, it) => sum + Number(it.amount), 0);

    const newSetup: NextTermBillSetup = {
      id: editingSetupId || `setup-${setupTargetType}-${setupTargetName.toLowerCase().replace(/[\s\-_/]+/g, '-')}`,
      targetType: setupTargetType,
      targetName: setupTargetName,
      academicYear: setupYear,
      term: setupTerm,
      resumptionDate: setupResumptionDate,
      dueDate: setupDueDate,
      notes: setupNotes,
      totalAmount,
      items: setupItems,
      bankDetails: DEFAULT_NEXT_TERM_BANK_DETAILS,
      updatedAt: new Date().toISOString(),
      updatedBy: userRole.toUpperCase()
    };

    const updated = saveNextTermBillSetup(newSetup);
    setSetups(updated);
    setEditingSetupId(null);
    showToast(`Next term fee structure for ${setupTargetType.toUpperCase()} "${setupTargetName}" saved successfully!`);
  };

  const handleEditExistingSetup = (setup: NextTermBillSetup) => {
    setEditingSetupId(setup.id);
    setSetupTargetType(setup.targetType);
    setSetupTargetName(setup.targetName);
    setSetupYear(setup.academicYear);
    setSetupTerm(setup.term);
    setSetupResumptionDate(setup.resumptionDate || '12th January 2027');
    setSetupDueDate(setup.dueDate || '30th January 2027');
    setSetupNotes(setup.notes || '');
    setSetupItems(setup.items);
    setActiveTab('setup');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteSetup = (id: string) => {
    if (confirm('Are you sure you want to remove this Next Term fee structure?')) {
      const updated = deleteNextTermBillSetup(id);
      setSetups(updated);
      showToast('Setup removed.');
    }
  };

  // Batch generation for class or department
  const handleBatchGenerate = async () => {
    if (!confirm(`Are you sure you want to batch-generate next term bills for ${setupTargetType} "${setupTargetName}"? This will compute bills for all matching students.`)) {
      return;
    }
    setIsBatchGenerating(true);
    try {
      const result = await batchGenerateNextTermBills({
        targetType: setupTargetType,
        targetName: setupTargetName,
        academicYear: setupYear,
        term: setupTerm,
        includeCurrentArrears: true
      });
      setBills(result.bills);
      showToast(`Successfully generated ${result.count} next term bills for ${setupTargetName}!`);
    } catch (err) {
      console.error(err);
      showToast('Failed to run batch generation.');
    } finally {
      setIsBatchGenerating(false);
    }
  };

  // Roster Filtered Bills
  const nextTermBills = useMemo(() => {
    const targetY = nextInfo.nextAcademicYear;
    const targetT = nextInfo.nextTerm;
    return bills.filter(b => {
      // Matches either targeted next period or has 'BILL-NT'
      const isNextPeriod = (b.academicYear === targetY && b.term === targetT) || (b.billNo && b.billNo.includes('-NT-'));
      if (!isNextPeriod) return false;
      if (rosterClassFilter !== 'All' && b.className !== rosterClassFilter) return false;
      if (rosterStatusFilter !== 'All' && b.status !== rosterStatusFilter) return false;
      if (!rosterSearch.trim()) return true;
      const q = rosterSearch.toLowerCase();
      return b.studentName.toLowerCase().includes(q) || b.admissionNo.toLowerCase().includes(q) || (b.billNo || '').toLowerCase().includes(q);
    });
  }, [bills, nextInfo, rosterClassFilter, rosterStatusFilter, rosterSearch]);

  const handlePrintBatchBills = () => {
    if (selectedRosterBillIds.length === 0) {
      showToast('Please select one or more bills from the roster to print.');
      return;
    }
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl border border-slate-700 text-xs font-bold flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          {toastMessage}
        </div>
      )}

      {/* Main Top Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-indigo-400" /> Fiscal Invoicing Hub
              </span>
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-full text-[10px] font-black uppercase tracking-widest">
                Target: {nextInfo.nextTerm} {nextInfo.nextAcademicYear}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <FileText className="w-7 h-7 text-indigo-400" />
              Next Term Fees Bill & Multi-Receipt Engine
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Generate itemized next term bills for individual students with automated arrears rollover. Configure fee tariffs by class or department, and print authentic receipts in batch.
            </p>
          </div>

          {/* Quick Stats or Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveTab('receipts')}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-sm hover:scale-105"
            >
              <Printer className="w-4 h-4 text-yellow-300" />
              <span>Print Multiple Receipts</span>
            </button>
            {canSetup && (
              <button
                onClick={() => setActiveTab('setup')}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-all cursor-pointer hover:scale-105"
              >
                <Settings className="w-4 h-4" />
                <span>Configure Next Term Fees</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation Pill Bar */}
        <div className="flex flex-wrap gap-2 mt-6 pt-6 border-t border-slate-800">
          <button
            onClick={() => setActiveTab('individual')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'individual'
                ? 'bg-white text-slate-900 shadow-md font-black'
                : 'bg-white/5 hover:bg-white/10 text-slate-300'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Generate Individual Student Bill</span>
          </button>

          {canSetup && (
            <button
              onClick={() => setActiveTab('setup')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'setup'
                  ? 'bg-white text-slate-900 shadow-md font-black'
                  : 'bg-white/5 hover:bg-white/10 text-slate-300'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Setup Next Term Bill (Class / Dept)</span>
              <span className="px-1.5 py-0.5 rounded-full text-[9px] bg-indigo-900 text-indigo-200">
                {setups.length}
              </span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('roster')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'roster'
                ? 'bg-white text-slate-900 shadow-md font-black'
                : 'bg-white/5 hover:bg-white/10 text-slate-300'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Next Term Bills Roster ({nextTermBills.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('receipts')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'receipts'
                ? 'bg-white text-slate-900 shadow-md font-black'
                : 'bg-white/5 hover:bg-white/10 text-slate-300'
            }`}
          >
            <Printer className="w-4 h-4" />
            <span>Batch Receipt Printer & Queue</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: GENERATE INDIVIDUAL STUDENT NEXT TERM BILL                         */}
      {/* ========================================================================= */}
      {activeTab === 'individual' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Student Search & Selection (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
                  <User className="w-4 h-4 text-indigo-600" />
                  Select Student to Bill
                </h3>
                <span className="text-[10px] font-bold text-slate-400 uppercase">
                  {filteredStudents.length} Active Students
                </span>
              </div>

              {/* Filters */}
              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by student name or admission no..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-medium"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={selectedStudentClassFilter}
                    onChange={(e) => setSelectedStudentClassFilter(e.target.value)}
                    className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700 font-bold focus:ring-2 focus:ring-indigo-500 cursor-pointer flex-1"
                  >
                    <option value="All">All Class Levels</option>
                    {availableClasses.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Scrollable Student List */}
              <div className="max-h-[460px] overflow-y-auto space-y-2 pr-1 divide-y divide-slate-100">
                {filteredStudents.slice(0, 40).map(s => {
                  const isSelected = selectedStudent?.id === s.id;
                  const sClass = s.className || (s as any).class || 'Unassigned';
                  return (
                    <div
                      key={s.id}
                      onClick={() => setSelectedStudent(s)}
                      className={`pt-2 p-3 rounded-2xl cursor-pointer transition-all border text-left ${
                        isSelected
                          ? 'bg-indigo-50/80 border-indigo-300 shadow-sm'
                          : 'bg-white hover:bg-slate-50/80 border-transparent hover:border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-xs text-slate-900">
                          {s.fullName || (s as any).name}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold">
                          {s.admissionNo}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500">
                        <span className="font-medium text-slate-600">{sClass}</span>
                        <span className="text-[10px] text-indigo-600 font-bold">
                          {s.department || inferDepartmentForClass(sClass)}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {filteredStudents.length === 0 && (
                  <div className="text-center py-8 text-xs text-slate-400">
                    No active students found matching your criteria.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Next Term Bill Builder & Preview (7 cols) */}
          <div className="lg:col-span-7 space-y-5">
            {selectedStudent ? (
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-5">
                {/* Selected Student Banner */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-gradient-to-br from-slate-50 to-indigo-50/40 rounded-2xl border border-indigo-100">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 block">
                      Target Student Profile
                    </span>
                    <h2 className="text-base font-black text-slate-900">
                      {selectedStudent.fullName || (selectedStudent as any).name}
                    </h2>
                    <div className="flex flex-wrap gap-2 text-xs text-slate-600 font-medium">
                      <span>Adm: <strong className="text-slate-900 font-mono">{selectedStudent.admissionNo}</strong></span>
                      <span>•</span>
                      <span>Class: <strong className="text-slate-900">{selectedStudent.className || (selectedStudent as any).class}</strong></span>
                      <span>•</span>
                      <span>Dept: <strong className="text-indigo-700">{selectedStudent.department || inferDepartmentForClass(selectedStudent.className || (selectedStudent as any).class)}</strong></span>
                    </div>
                  </div>

                  {/* Arrears / Financial standing pill */}
                  <div className="text-right bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Current Balance</span>
                    <span className={`text-sm font-black font-mono ${
                      studentFinancials.arrears > 0 ? 'text-rose-600' : 'text-emerald-600'
                    }`}>
                      {studentFinancials.arrears > 0 
                        ? `${currency} ${studentFinancials.arrears.toFixed(2)} Arrears` 
                        : `${currency} 0.00 Settled`}
                    </span>
                  </div>
                </div>

                {/* Tariff Match Badge */}
                <div className="flex items-center justify-between text-xs p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-indigo-600" />
                    <span className="text-slate-600">Applied Next Term Tariff:</span>
                    <span className="font-black text-slate-900">
                      {studentMatchedSetup?.setup.targetName} ({studentMatchedSetup?.setup.targetType})
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 uppercase">
                    Level: {studentMatchedSetup?.matchLevel}
                  </span>
                </div>

                {/* Period & Target Term Selector */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Target Academic Year</label>
                    <input
                      type="text"
                      value={targetAcademicYear}
                      onChange={(e) => setTargetAcademicYear(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Target Academic Term</label>
                    <select
                      value={targetTerm}
                      onChange={(e) => setTargetTerm(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    >
                      <option value="First Term">First Term</option>
                      <option value="Second Term">Second Term</option>
                      <option value="Third Term">Third Term</option>
                    </select>
                  </div>
                </div>

                {/* Interactive Fee Items Checklist */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black uppercase text-slate-800">
                      Fee Line Items (Select Applicable Fees)
                    </label>
                    <span className="text-[11px] text-slate-500">
                      Subtotal: <strong className="text-slate-900 font-mono">{currency} {computedNextBill?.subTotal.toFixed(2)}</strong>
                    </span>
                  </div>

                  <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 max-h-56 overflow-y-auto">
                    {studentMatchedSetup?.setup.items.map(it => {
                      const isChecked = selectedItemIds.includes(it.id);
                      return (
                        <label
                          key={it.id}
                          className={`flex items-center justify-between p-3 text-xs cursor-pointer transition-colors ${
                            isChecked ? 'bg-indigo-50/40' : 'bg-white hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedItemIds(prev => [...prev, it.id]);
                                } else {
                                  setSelectedItemIds(prev => prev.filter(id => id !== it.id));
                                }
                              }}
                              className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer w-4 h-4"
                            />
                            <div>
                              <span className="font-bold text-slate-800 block">{it.name}</span>
                              {it.isOptional && (
                                <span className="text-[10px] text-amber-600 font-semibold">(Optional)</span>
                              )}
                            </div>
                          </div>
                          <span className="font-mono font-bold text-slate-900">
                            {currency} {Number(it.amount).toFixed(2)}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Additional One-off Item Adder */}
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <span className="text-[11px] font-bold text-slate-700 block">
                    + Add Custom Student-Specific Line Item (e.g. Uniform, Books, Fine)
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <input
                      type="text"
                      placeholder="Item description..."
                      value={newCustomItemName}
                      onChange={(e) => setNewCustomItemName(e.target.value)}
                      className="text-xs px-3 py-1.5 bg-white border border-slate-300 rounded-xl flex-1 font-medium"
                    />
                    <input
                      type="number"
                      placeholder={`Amount (${currency})`}
                      value={newCustomItemAmount}
                      onChange={(e) => setNewCustomItemAmount(e.target.value)}
                      className="text-xs px-3 py-1.5 bg-white border border-slate-300 rounded-xl w-28 font-mono"
                    />
                    <button
                      onClick={() => {
                        if (newCustomItemName && Number(newCustomItemAmount) > 0) {
                          setCustomOneOffItems(prev => [...prev, { name: newCustomItemName.trim(), amount: Number(newCustomItemAmount) }]);
                          setNewCustomItemName('');
                          setNewCustomItemAmount('');
                        }
                      }}
                      className="px-3 py-1.5 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-700 cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                  {customOneOffItems.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {customOneOffItems.map((ci, idx) => (
                        <span key={idx} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800">
                          {ci.name}: {currency} {ci.amount}
                          <button
                            onClick={() => setCustomOneOffItems(prev => prev.filter((_, i) => i !== idx))}
                            className="text-rose-500 hover:text-rose-700 font-black ml-1"
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Arrears & Discount Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 text-xs">
                  {/* Arrears Checkbox */}
                  <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 cursor-pointer bg-slate-50/50 hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={includeArrears}
                      onChange={(e) => setIncludeArrears(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 mt-0.5 w-4 h-4 cursor-pointer"
                    />
                    <div>
                      <span className="font-bold text-slate-900 block">Carry Forward Outstanding Arrears</span>
                      <span className="text-[11px] text-slate-500">
                        Include current balance of <strong className="text-rose-600 font-mono">{currency} {studentFinancials.arrears.toFixed(2)}</strong> on next term bill.
                      </span>
                    </div>
                  </label>

                  {/* Scholarship / Discount */}
                  <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-900">Scholarship / Discount</span>
                      <span className="text-[10px] text-slate-400">Deducted from bill</span>
                    </div>
                    <input
                      type="number"
                      placeholder={`Discount (${currency})`}
                      value={customDiscount || ''}
                      onChange={(e) => setCustomDiscount(Number(e.target.value) || 0)}
                      className="w-full text-xs px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-mono font-bold"
                    />
                  </div>
                </div>

                {/* Live Bill Total Summary Banner */}
                {computedNextBill && (
                  <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-2 shadow-md">
                    <div className="flex justify-between text-xs text-slate-300">
                      <span>Term Fees Subtotal:</span>
                      <span className="font-mono font-bold">{currency} {computedNextBill.subTotal.toFixed(2)}</span>
                    </div>
                    {computedNextBill.arrears > 0 && (
                      <div className="flex justify-between text-xs text-rose-300">
                        <span>Prior Arrears Rollover:</span>
                        <span className="font-mono font-bold">+ {currency} {computedNextBill.arrears.toFixed(2)}</span>
                      </div>
                    )}
                    {computedNextBill.discount > 0 && (
                      <div className="flex justify-between text-xs text-emerald-300">
                        <span>Discount / Scholarship:</span>
                        <span className="font-mono font-bold">- {currency} {computedNextBill.discount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
                      <span className="text-sm font-black uppercase tracking-wider text-yellow-300">
                        Total Next Term Payable:
                      </span>
                      <span className="text-xl font-black font-mono text-yellow-300">
                        {currency} {computedNextBill.payable.toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                  <button
                    onClick={() => {
                      if (computedNextBill) {
                        setPreviewingBill(computedNextBill);
                      }
                    }}
                    className="px-5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold text-xs rounded-xl flex items-center gap-2 border border-indigo-200 cursor-pointer transition-colors shadow-2xs"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Preview & Print Bill</span>
                  </button>

                  <button
                    onClick={handleSaveIndividualBill}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl flex items-center gap-2 shadow-md cursor-pointer transition-all hover:scale-[1.02]"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Generate & Save Next Term Bill</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-12 shadow-sm border border-slate-200 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto">
                  <User className="w-8 h-8" />
                </div>
                <h3 className="font-extrabold text-base text-slate-800">No Student Selected</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Select a student from the directory on the left to review their financial history, calculate next term fees, and generate their official printable fee bill.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: SETUP NEXT TERM BILL BY CLASS OR DEPARTMENT (ADMIN & ACCOUNTANT)   */}
      {/* ========================================================================= */}
      {activeTab === 'setup' && canSetup && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <Building2 className="w-6 h-6 text-indigo-600" />
                  Configure Next Term Fee Schedules
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Establish standardized fee structures for the upcoming term based on <strong>Class</strong> or <strong>Department</strong>.
                </p>
              </div>

              {/* Mode Toggle: By Class vs By Department */}
              <div className="inline-flex p-1 bg-slate-100 rounded-2xl border border-slate-200">
                <button
                  onClick={() => {
                    setSetupTargetType('department');
                    setSetupTargetName(availableDepartments[0] || 'Primary School');
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    setupTargetType === 'department'
                      ? 'bg-white text-indigo-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  By Department
                </button>
                <button
                  onClick={() => {
                    setSetupTargetType('class');
                    setSetupTargetName(availableClasses[0] || 'Class 1');
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    setupTargetType === 'class'
                      ? 'bg-white text-indigo-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  By Specific Class
                </button>
              </div>
            </div>

            {/* Target & Period Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <label className="font-extrabold text-slate-800 block mb-1.5 uppercase text-[10px] tracking-wider">
                  Target {setupTargetType === 'department' ? 'Department' : 'Class Level'}
                </label>
                <select
                  value={setupTargetName}
                  onChange={(e) => setSetupTargetName(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-2xs"
                >
                  {setupTargetType === 'department' ? (
                    availableDepartments.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))
                  ) : (
                    availableClasses.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="font-extrabold text-slate-800 block mb-1.5 uppercase text-[10px] tracking-wider">
                  Target Academic Term
                </label>
                <select
                  value={setupTerm}
                  onChange={(e) => setSetupTerm(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-2xs"
                >
                  <option value="First Term">First Term</option>
                  <option value="Second Term">Second Term</option>
                  <option value="Third Term">Third Term</option>
                </select>
              </div>

              <div>
                <label className="font-extrabold text-slate-800 block mb-1.5 uppercase text-[10px] tracking-wider">
                  Next Term Resumes
                </label>
                <input
                  type="text"
                  placeholder="e.g. 12th January 2027"
                  value={setupResumptionDate}
                  onChange={(e) => setSetupResumptionDate(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                />
              </div>

              <div>
                <label className="font-extrabold text-slate-800 block mb-1.5 uppercase text-[10px] tracking-wider">
                  Payment Due Date
                </label>
                <input
                  type="text"
                  placeholder="e.g. 30th January 2027"
                  value={setupDueDate}
                  onChange={(e) => setSetupDueDate(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                />
              </div>
            </div>

            {/* Fee Items Builder */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                  Fee Schedule Line Items ({setupItems.length} items)
                </h4>
                <span className="text-xs font-bold text-indigo-700">
                  Total Mandatory Base: {currency} {setupItems.filter(it => !it.isOptional).reduce((s, it) => s + Number(it.amount), 0).toFixed(2)}
                </span>
              </div>

              {/* Items List Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 text-white uppercase text-[10px] font-bold">
                    <tr>
                      <th className="p-3 w-10 text-center">#</th>
                      <th className="p-3">Fee Item Description</th>
                      <th className="p-3">Category</th>
                      <th className="p-3 text-center">Type</th>
                      <th className="p-3 text-right">Amount ({currency})</th>
                      <th className="p-3 text-center w-16">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {setupItems.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-slate-50/50">
                        <td className="p-3 text-center font-mono text-slate-400">{idx + 1}</td>
                        <td className="p-3 font-bold text-slate-800">{item.name}</td>
                        <td className="p-3 uppercase text-[10px] font-bold text-slate-500">{item.category || 'tuition'}</td>
                        <td className="p-3 text-center">
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${
                            item.isOptional ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {item.isOptional ? 'Optional' : 'Compulsory'}
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-slate-900">
                          {Number(item.amount).toFixed(2)}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleRemoveSetupItem(item.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                            title="Remove Item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Item Adder Row */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-wrap items-center gap-3 text-xs">
                <input
                  type="text"
                  placeholder="New Fee Name (e.g. Science Lab Levy, Bus Transit)"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="px-3 py-2 bg-white border border-slate-300 rounded-xl flex-1 font-medium min-w-48"
                />
                <input
                  type="number"
                  placeholder={`Amount (${currency})`}
                  value={newItemAmount}
                  onChange={(e) => setNewItemAmount(e.target.value)}
                  className="px-3 py-2 bg-white border border-slate-300 rounded-xl w-32 font-mono"
                />
                <select
                  value={newItemCategory}
                  onChange={(e) => setNewItemCategory(e.target.value as any)}
                  className="px-3 py-2 bg-white border border-slate-300 rounded-xl cursor-pointer"
                >
                  <option value="tuition">Tuition</option>
                  <option value="pta">PTA Dues</option>
                  <option value="ict">ICT Lab</option>
                  <option value="exam">Exam & Printing</option>
                  <option value="health">Health Levy</option>
                  <option value="maintenance">Maintenance & Sports</option>
                  <option value="transit">Transit / Bus</option>
                  <option value="boarding">Boarding / Feeding</option>
                  <option value="custom">Custom Levy</option>
                </select>
                <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newItemOptional}
                    onChange={(e) => setNewItemOptional(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Optional</span>
                </label>
                <button
                  onClick={handleAddSetupItem}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                >
                  <Plus className="w-4 h-4" /> Add Item
                </button>
              </div>
            </div>

            {/* Bank Notes & Notice Memo */}
            <div>
              <label className="font-extrabold text-slate-800 block mb-1.5 uppercase text-[10px] tracking-wider">
                Resumption Memo & Notice Instructions
              </label>
              <textarea
                rows={2}
                value={setupNotes}
                onChange={(e) => setSetupNotes(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>

            {/* Bottom Actions Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-100">
              <div className="text-xs text-slate-500">
                {editingSetupId ? 'Editing existing configuration' : 'Creating new configuration'}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleBatchGenerate}
                  disabled={isBatchGenerating}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl flex items-center gap-2 shadow-md cursor-pointer transition-all disabled:opacity-50"
                >
                  <Layers className="w-4 h-4" />
                  <span>{isBatchGenerating ? 'Generating...' : `Batch Generate Bills for ${setupTargetName}`}</span>
                </button>

                <button
                  onClick={handleSaveSetup}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl flex items-center gap-2 shadow-md cursor-pointer transition-all hover:scale-105"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save {setupTargetType.toUpperCase()} Setup</span>
                </button>
              </div>
            </div>
          </div>

          {/* List of Configured Setups Matrix */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
            <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              Existing Next Term Fee Schedules ({setups.length})
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {setups.map(s => (
                <div key={s.id} className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-indigo-300 transition-all shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                      {s.targetType}
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-500">
                      {s.term}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-black text-sm text-slate-900">{s.targetName}</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Resumes: <strong>{s.resumptionDate || '12th Jan 2027'}</strong>
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-xs">
                    <span className="text-slate-500">{s.items.length} Fee Items</span>
                    <span className="font-mono font-black text-slate-900">
                      {currency} {Number(s.totalAmount).toFixed(2)}
                    </span>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      onClick={() => handleEditExistingSetup(s)}
                      className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteSetup(s.id)}
                      className="px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-lg border border-rose-200 cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: NEXT TERM BILLS ROSTER & MULTI-PRINT                               */}
      {/* ========================================================================= */}
      {activeTab === 'roster' && (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-600" />
                Next Term Bills Master Roster
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Overview of all next term student invoices. Select records to print in batch or export invoices.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handlePrintBatchBills}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm cursor-pointer transition-colors"
              >
                <Printer className="w-4 h-4" /> Print Selected Bills ({selectedRosterBillIds.length})
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <div className="relative min-w-48">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter student name or bill..."
                  value={rosterSearch}
                  onChange={(e) => setRosterSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium w-full"
                />
              </div>

              <select
                value={rosterClassFilter}
                onChange={(e) => setRosterClassFilter(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 cursor-pointer"
              >
                <option value="All">All Classes</option>
                {availableClasses.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              <select
                value={rosterStatusFilter}
                onChange={(e) => setRosterStatusFilter(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 cursor-pointer"
              >
                <option value="All">All Statuses</option>
                <option value="Unpaid">Unpaid</option>
                <option value="Partially Paid">Partially Paid</option>
                <option value="Fully Paid">Fully Paid</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (selectedRosterBillIds.length === nextTermBills.length) {
                    setSelectedRosterBillIds([]);
                  } else {
                    setSelectedRosterBillIds(nextTermBills.map(b => b.id));
                  }
                }}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
              >
                {selectedRosterBillIds.length === nextTermBills.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
          </div>

          {/* Bills Table */}
          <div className="border border-slate-200 rounded-2xl overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-900 text-white uppercase text-[10px] font-bold">
                <tr>
                  <th className="p-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={nextTermBills.length > 0 && selectedRosterBillIds.length === nextTermBills.length}
                      onChange={() => {
                        if (selectedRosterBillIds.length === nextTermBills.length) {
                          setSelectedRosterBillIds([]);
                        } else {
                          setSelectedRosterBillIds(nextTermBills.map(b => b.id));
                        }
                      }}
                      className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                  </th>
                  <th className="p-3">Bill Number</th>
                  <th className="p-3">Student Name</th>
                  <th className="p-3">Admission No</th>
                  <th className="p-3">Class</th>
                  <th className="p-3 text-right">Subtotal ({currency})</th>
                  <th className="p-3 text-right">Arrears ({currency})</th>
                  <th className="p-3 text-right">Total Payable ({currency})</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {nextTermBills.map((b, idx) => {
                  const isChecked = selectedRosterBillIds.includes(b.id);
                  return (
                    <tr key={b.id} className={isChecked ? 'bg-indigo-50/40' : 'hover:bg-slate-50/50'}>
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedRosterBillIds(prev => [...prev, b.id]);
                            } else {
                              setSelectedRosterBillIds(prev => prev.filter(id => id !== b.id));
                            }
                          }}
                          className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                      </td>
                      <td className="p-3 font-mono font-bold text-indigo-700">{b.billNo}</td>
                      <td className="p-3 font-bold text-slate-900">{b.studentName}</td>
                      <td className="p-3 font-mono text-slate-600">{b.admissionNo}</td>
                      <td className="p-3 text-slate-800">{b.className}</td>
                      <td className="p-3 text-right font-mono">{Number(b.subTotal).toFixed(2)}</td>
                      <td className="p-3 text-right font-mono text-rose-600">
                        {Number(b.arrears) > 0 ? Number(b.arrears).toFixed(2) : '-'}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900">
                        {Number(b.payable).toFixed(2)}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                          b.status === 'Fully Paid'
                            ? 'bg-emerald-100 text-emerald-800'
                            : b.status === 'Partially Paid'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => setPreviewingBill(b)}
                          className="px-2.5 py-1 bg-white hover:bg-slate-100 text-indigo-600 hover:text-indigo-800 rounded-lg border border-slate-200 text-xs font-bold flex items-center gap-1 cursor-pointer mx-auto"
                        >
                          <Printer className="w-3.5 h-3.5" /> View / Print
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {nextTermBills.length === 0 && (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-xs text-slate-400">
                      No next term bills generated yet. Use the "Generate Individual Student Bill" or "Configure Next Term Fees" tabs to generate bills.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: BATCH RECEIPT PRINTER & PRINT QUEUE                                 */}
      {/* ========================================================================= */}
      {activeTab === 'receipts' && (
        <div className="space-y-4">
          <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-indigo-900 font-bold">
              <Printer className="w-4 h-4 text-indigo-600" />
              <span>Multi-Receipt Printing Desk with Floating Print Queue and Authentic QR Verification</span>
            </div>
            <button
              onClick={() => setActiveTab('individual')}
              className="px-3 py-1 bg-white hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl border border-indigo-200 cursor-pointer"
            >
              Back to Next Term Bills
            </button>
          </div>

          <ReceiptGenerationDashboard
            payments={getStoredPayments()}
            bills={bills}
            students={students}
          />
        </div>
      )}

      {/* Printable Preview Modal */}
      {previewingBill && (
        <PrintableNextTermBillModal
          bill={previewingBill}
          setup={studentMatchedSetup?.setup}
          onClose={() => setPreviewingBill(null)}
        />
      )}
    </div>
  );
}

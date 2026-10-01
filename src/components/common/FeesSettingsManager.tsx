import React, { useState, useMemo, useEffect, FormEvent } from 'react';
import { 
  FeeOptionItem, 
  FeePolicySettings, 
  StudentBill, 
  Student,
  PaymentSettingsConfig,
  PaymentMethodConfig,
  FeeSubmissionItem,
  PaymentRecord,
  NotificationItem,
  ClassFeeTariffItem
} from '../../types';
import { 
  INITIAL_FEE_OPTIONS_DATA, 
  INITIAL_FEE_DESCRIPTION_CATEGORIES, 
  FeeDescriptionCategory,
  DEFAULT_FEE_POLICY 
} from '../../data/feeDescriptions';
import { 
  subscribePaymentSettings, 
  savePaymentSettings, 
  subscribeFeeSubmissions, 
  updateFeeSubmissionStatus, 
  saveNotification,
  subscribeClassFeeTariffs,
  saveClassFeeTariff,
  deleteClassFeeTariff,
  getStoredClassFeeTariffs
} from '../../services/dbService';
import { INITIAL_PAYMENT_SETTINGS, getStoredPaymentSettings, INITIAL_CLASS_FEE_TARIFFS, getStoredFeeOptions, saveStoredFeeOptions } from '../../services/storageService';
import { addMoney } from '../../utils/financeUtils';
import { applyTariffMatrixToAllBills } from '../../services/billingService';
import { 
  Plus, 
  Edit3, 
  Trash2, 
  Save, 
  Search, 
  CheckCircle2, 
  DollarSign, 
  Layers, 
  Sliders, 
  FileText, 
  ShieldCheck, 
  RefreshCw, 
  AlertCircle, 
  Info, 
  BookOpen, 
  Sparkles, 
  Calculator,
  ArrowUpDown,
  Tag,
  Check,
  Percent,
  X,
  Copy,
  CreditCard,
  Building2,
  Smartphone,
  Send,
  Clock,
  CheckCircle,
  XCircle,
  Filter,
  Phone,
  Mail
} from 'lucide-react';

interface FeesSettingsManagerProps {
  userRole: 'admin' | 'accountant';
  feeOptions?: FeeOptionItem[];
  onUpdateFeeOptions?: (options: FeeOptionItem[]) => void;
  feeCategories?: FeeDescriptionCategory[];
  onUpdateFeeCategories?: (categories: FeeDescriptionCategory[]) => void;
  feePolicy?: FeePolicySettings;
  onUpdateFeePolicy?: (policy: FeePolicySettings) => void;
  students?: Student[];
  bills?: StudentBill[];
  classFeeTariffs?: ClassFeeTariffItem[];
  onUpdateClassTariffs?: (tariffs: ClassFeeTariffItem[]) => void;
  onApplyToBills?: (updatedFeeOptions: FeeOptionItem[]) => void;
  onAddPayment?: (payment: PaymentRecord) => void;
  onAddNotification?: (notif: NotificationItem) => void;
  initialTab?: 'tariffs' | 'descriptions' | 'matrix' | 'policy' | 'payment_methods' | 'submissions_queue';
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Tuition: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  PTA: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  ICT: { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' },
  Exams: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  Health: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  Transport: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  Feeding: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  Administrative: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  Maintenance: { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
  Other: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' }
};

export default function FeesSettingsManager({
  userRole,
  feeOptions: initialFeeOptions,
  onUpdateFeeOptions,
  feeCategories: initialFeeCategories,
  onUpdateFeeCategories,
  feePolicy: initialFeePolicy,
  onUpdateFeePolicy,
  students = [],
  bills = [],
  classFeeTariffs: initialTariffsFromProps = [],
  onUpdateClassTariffs,
  onApplyToBills,
  onAddPayment,
  onAddNotification,
  initialTab = 'tariffs'
}: FeesSettingsManagerProps) {
  // Main local state
  const [activeTab, setActiveTab] = useState<'tariffs' | 'descriptions' | 'matrix' | 'policy' | 'payment_methods' | 'submissions_queue'>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  const [feeOptions, setFeeOptions] = useState<FeeOptionItem[]>(() => (initialFeeOptions && initialFeeOptions.length > 0) ? initialFeeOptions : getStoredFeeOptions());
  const [feeCategories, setFeeCategories] = useState<FeeDescriptionCategory[]>(initialFeeCategories || INITIAL_FEE_DESCRIPTION_CATEGORIES);
  const [feePolicy, setFeePolicy] = useState<FeePolicySettings>(initialFeePolicy || DEFAULT_FEE_POLICY);

  // Payment Settings & Fee Submissions Realtime States
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettingsConfig>(() => getStoredPaymentSettings());
  const [feeSubmissions, setFeeSubmissions] = useState<FeeSubmissionItem[]>([]);
  const [queueSearch, setQueueSearch] = useState('');
  const [queueStatusFilter, setQueueStatusFilter] = useState<'All' | 'Pending Verification' | 'Approved' | 'Rejected'>('All');

  // Payment Method Modal state
  const [editingPaymentMethod, setEditingPaymentMethod] = useState<PaymentMethodConfig | null>(null);
  const [showAddMethodModal, setShowAddMethodModal] = useState(false);
  const [methodFormData, setMethodFormData] = useState<Partial<PaymentMethodConfig>>({
    type: 'bank',
    name: '',
    accountName: 'JIPAS Educational Complex',
    accountNumber: '',
    bankOrProviderName: '',
    branchOrSortCode: '',
    instructions: 'Include Student Admission Number as Reference.',
    enabled: true
  });

  // Verification & Rejection Modals state
  const [verifyingSubmission, setVerifyingSubmission] = useState<FeeSubmissionItem | null>(null);
  const [rejectingSubmission, setRejectingSubmission] = useState<FeeSubmissionItem | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');

  // Editable Class-Wise Fee Tariff Matrix State
  const [classTariffs, setClassTariffs] = useState<ClassFeeTariffItem[]>(() => 
    initialTariffsFromProps.length > 0 ? initialTariffsFromProps : getStoredClassFeeTariffs()
  );

  // Sync with props if they change (from subscriptions)
  useEffect(() => {
    if (initialTariffsFromProps && initialTariffsFromProps.length > 0) {
      setClassTariffs(initialTariffsFromProps);
    }
  }, [initialTariffsFromProps]);

  const [matrixViewMode, setMatrixViewMode] = useState<'grid' | 'table'>('grid');
  const [showTariffModal, setShowTariffModal] = useState(false);
  const [editingTariff, setEditingTariff] = useState<ClassFeeTariffItem | null>(null);
  const [tariffFormData, setTariffFormData] = useState<Partial<ClassFeeTariffItem>>({
    classTitle: '',
    dept: 'Primary School',
    baseTuition: 350,
    ptaDues: 50,
    ictFee: 40,
    examFee: 35,
    healthLevy: 20,
    busTransit: 200,
    notes: ''
  });

  // Realtime Subscriptions
  useEffect(() => {
    const unsubSettings = subscribePaymentSettings((settings) => {
      if (settings) setPaymentSettings(settings);
    });

    const unsubSubmissions = subscribeFeeSubmissions((list) => {
      if (list) setFeeSubmissions(list);
    });

    const unsubTariffs = subscribeClassFeeTariffs((tariffs) => {
      if (tariffs && tariffs.length > 0) setClassTariffs(tariffs);
    });

    return () => {
      unsubSettings();
      unsubSubmissions();
      unsubTariffs();
    };
  }, []);

  const activeStudentIds = useMemo(() => new Set((students || []).map(s => s.id)), [students]);
  const activeAdmissionNos = useMemo(() => new Set((students || []).map(s => (s.admissionNo || '').toLowerCase().trim()).filter(Boolean)), [students]);

  const activeSubmissions = useMemo(() => {
    if (!students || students.length === 0) return feeSubmissions;
    return feeSubmissions.filter(s => activeStudentIds.has(s.studentId) || (s.admissionNo && activeAdmissionNos.has(s.admissionNo.toLowerCase().trim())));
  }, [feeSubmissions, activeStudentIds, activeAdmissionNos]);

  const pendingCount = useMemo(() => {
    return activeSubmissions.filter(s => s.status === 'Pending Verification').length;
  }, [activeSubmissions]);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [filterClass, setFilterClass] = useState<string>('All');
  const [filterMandatory, setFilterMandatory] = useState<string>('All');

  // UI States
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [editingItem, setEditingItem] = useState<FeeOptionItem | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchPercent, setBatchPercent] = useState<number>(5);
  const [batchCategory, setBatchCategory] = useState<string>('All');

  // New Fee Item Form State
  const [formData, setFormData] = useState<Partial<FeeOptionItem>>({
    code: '',
    name: '',
    category: 'Tuition',
    amount: 100,
    applicableClass: 'All Classes',
    description: '',
    frequency: 'Termly',
    mandatory: true,
    isActive: true
  });

  // Description category form state
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newOptionInputs, setNewOptionInputs] = useState<Record<string, string>>({});
  const [editingOption, setEditingOption] = useState<{ catId: string; oldVal: string; newVal: string } | null>(null);

  const showNotification = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  // Tariff Matrix Handlers
  const openAddTariffModal = () => {
    setEditingTariff(null);
    setTariffFormData({
      classTitle: '',
      dept: 'Primary School',
      baseTuition: 350,
      ptaDues: 50,
      ictFee: 40,
      examFee: 35,
      healthLevy: 20,
      busTransit: 200,
      notes: ''
    });
    setShowTariffModal(true);
  };

  const openEditTariffModal = (tariff: ClassFeeTariffItem) => {
    setEditingTariff(tariff);
    setTariffFormData({ ...tariff });
    setShowTariffModal(true);
  };

  const handleSaveTariff = async (e: FormEvent) => {
    e.preventDefault();
    if (!tariffFormData.classTitle?.trim()) {
      alert('Please enter a Class Title (e.g. Basic 1 or Creche)');
      return;
    }

    const tariffItem: ClassFeeTariffItem = {
      id: editingTariff ? editingTariff.id : `tariff-${Date.now()}`,
      classTitle: tariffFormData.classTitle.trim(),
      dept: tariffFormData.dept || 'Primary School',
      baseTuition: Number(tariffFormData.baseTuition) || 0,
      ptaDues: Number(tariffFormData.ptaDues) || 0,
      ictFee: Number(tariffFormData.ictFee) || 0,
      examFee: Number(tariffFormData.examFee) || 0,
      healthLevy: Number(tariffFormData.healthLevy) || 0,
      busTransit: Number(tariffFormData.busTransit) || 0,
      notes: tariffFormData.notes?.trim() || ''
    };

    const updated = await saveClassFeeTariff(tariffItem);
    setClassTariffs(updated);
    if (onUpdateClassTariffs) onUpdateClassTariffs(updated);
    // Automatically apply and synchronize updated tariff schedule to all student bills
    await applyTariffMatrixToAllBills(updated).catch(console.warn);
    setShowTariffModal(false);
    showNotification(editingTariff ? `Class Tariff for "${tariffItem.classTitle}" updated and synced to student bills!` : `New Class Tariff for "${tariffItem.classTitle}" created and applied to student bills!`);
  };

  const handleDeleteTariffHandler = async (tariff: ClassFeeTariffItem) => {
    if (window.confirm(`Are you sure you want to delete the Fee Tariff for ${tariff.classTitle}?`)) {
      const updatedList = await deleteClassFeeTariff(tariff.id);
      setClassTariffs(updatedList);
      if (onUpdateClassTariffs) onUpdateClassTariffs(updatedList);
      await applyTariffMatrixToAllBills(updatedList).catch(console.warn);
      showNotification(`Tariff schedule for ${tariff.classTitle} removed and bills updated.`);
    }
  };

  const handleInlineTariffChange = async (tariffId: string, field: keyof ClassFeeTariffItem, value: any) => {
    const tariff = classTariffs.find(t => t.id === tariffId);
    if (!tariff) return;

    const numValue = typeof value === 'string' && !isNaN(Number(value)) ? Number(value) : value;
    const updatedTariff = { ...tariff, [field]: numValue };
    
    try {
      const updatedList = await saveClassFeeTariff(updatedTariff);
      setClassTariffs(updatedList);
      if (onUpdateClassTariffs) onUpdateClassTariffs(updatedList);
      await applyTariffMatrixToAllBills(updatedList).catch(console.warn);
    } catch (err) {
      console.error("Failed to update tariff inline:", err);
    }
  };

  // Sync state upward
  const triggerUpdateFeeOptions = async (updated: FeeOptionItem[]) => {
    setFeeOptions(updated);
    saveStoredFeeOptions(updated);
    if (onUpdateFeeOptions) onUpdateFeeOptions(updated);
    await applyTariffMatrixToAllBills().catch(console.warn);
  };

  const triggerUpdateCategories = (updated: FeeDescriptionCategory[]) => {
    setFeeCategories(updated);
    if (onUpdateFeeCategories) onUpdateFeeCategories(updated);
  };

  const triggerUpdatePolicy = (updated: FeePolicySettings) => {
    setFeePolicy(updated);
    if (onUpdateFeePolicy) onUpdateFeePolicy(updated);
  };

  // Filtered Fee Options
  const filteredFeeOptions = useMemo(() => {
    return feeOptions.filter(item => {
      const matchesSearch = 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.code && item.code.toLowerCase().includes(searchQuery.toLowerCase())) ||
        item.applicableClass.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCat = filterCategory === 'All' || item.category === filterCategory;
      const matchesClass = filterClass === 'All' || item.applicableClass.includes(filterClass) || item.applicableClass === 'All Classes';
      const matchesMandatory = 
        filterMandatory === 'All' || 
        (filterMandatory === 'Mandatory' && item.mandatory) || 
        (filterMandatory === 'Optional' && !item.mandatory);

      return matchesSearch && matchesCat && matchesClass && matchesMandatory;
    });
  }, [feeOptions, searchQuery, filterCategory, filterClass, filterMandatory]);

  // Statistics
  const totalMandatoryTermFees = useMemo(() => {
    const list = feeOptions
      .filter(f => f.mandatory && f.isActive !== false && f.frequency === 'Termly')
      .map(curr => curr.amount || 0);
    return addMoney(...list);
  }, [feeOptions]);

  const totalOptionalFees = useMemo(() => {
    const list = feeOptions
      .filter(f => !f.mandatory && f.isActive !== false)
      .map(curr => curr.amount || 0);
    return addMoney(...list);
  }, [feeOptions]);

  // Handle Save / Add Item
  const handleSaveFeeItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.amount) {
      alert('Please provide a fee name and valid amount.');
      return;
    }

    if (editingItem) {
      const updated = feeOptions.map(item => 
        item.id === editingItem.id ? { ...item, ...formData } as FeeOptionItem : item
      );
      triggerUpdateFeeOptions(updated);
      showNotification(`Fee tariff "${formData.name}" successfully updated!`);
      setEditingItem(null);
    } else {
      const newItem: FeeOptionItem = {
        id: `fo-${Date.now()}`,
        code: formData.code || `FEE-${Math.floor(100 + Math.random() * 900)}`,
        name: formData.name || '',
        category: formData.category || 'Tuition',
        amount: Number(formData.amount) || 0,
        applicableClass: formData.applicableClass || 'All Classes',
        description: formData.description || '',
        frequency: formData.frequency || 'Termly',
        mandatory: formData.mandatory ?? true,
        isActive: formData.isActive ?? true
      };
      const updated = [newItem, ...feeOptions];
      triggerUpdateFeeOptions(updated);
      showNotification(`New fee tariff "${newItem.name}" (${newItem.amount} CFA) added!`);
      setIsAddingItem(false);
    }

    // Reset form
    setFormData({
      code: '',
      name: '',
      category: 'Tuition',
      amount: 100,
      applicableClass: 'All Classes',
      description: '',
      frequency: 'Termly',
      mandatory: true,
      isActive: true
    });
  };

  const handleStartEdit = (item: FeeOptionItem) => {
    setEditingItem(item);
    setFormData({ ...item });
    setIsAddingItem(true);
    window.scrollTo({ top: 120, behavior: 'smooth' });
  };

  const handleDeleteItem = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to remove fee item "${name}"?`)) {
      const updated = feeOptions.filter(item => item.id !== id);
      triggerUpdateFeeOptions(updated);
      showNotification(`Fee item "${name}" deleted.`);
    }
  };

  const handleToggleActive = (id: string) => {
    const updated = feeOptions.map(item => 
      item.id === id ? { ...item, isActive: !item.isActive } : item
    );
    triggerUpdateFeeOptions(updated);
  };

  // Batch Tariff Adjustment
  const handleApplyBatchAdjustment = () => {
    const multiplier = 1 + (batchPercent / 100);
    const updated = feeOptions.map(item => {
      if (batchCategory === 'All' || item.category === batchCategory) {
        return {
          ...item,
          amount: Math.round(item.amount * multiplier)
        };
      }
      return item;
    });
    triggerUpdateFeeOptions(updated);
    showNotification(`Adjusted ${batchCategory} fee tariffs by ${batchPercent > 0 ? '+' : ''}${batchPercent}%!`);
    setBatchModalOpen(false);
  };

  // Description Categories Handlers
  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    const newCat: FeeDescriptionCategory = {
      id: `fdc-${Date.now()}`,
      category: newCategoryName.trim(),
      description: 'Custom fee descriptions for payment receipts',
      options: []
    };
    const updated = [...feeCategories, newCat];
    triggerUpdateCategories(updated);
    setNewCategoryName('');
    showNotification(`New description category "${newCat.category}" added!`);
  };

  const handleDeleteCategory = (catId: string, catName: string) => {
    if (window.confirm(`Are you sure you want to delete category "${catName}" and all its description presets?`)) {
      const updated = feeCategories.filter(c => c.id !== catId);
      triggerUpdateCategories(updated);
      showNotification(`Category "${catName}" removed.`);
    }
  };

  const handleAddOptionToCategory = (catId: string) => {
    const inputVal = newOptionInputs[catId];
    if (!inputVal || !inputVal.trim()) return;

    const updated = feeCategories.map(cat => {
      if (cat.id === catId) {
        return {
          ...cat,
          options: [...cat.options, inputVal.trim()]
        };
      }
      return cat;
    });

    triggerUpdateCategories(updated);
    setNewOptionInputs(prev => ({ ...prev, [catId]: '' }));
    showNotification(`Added description option "${inputVal.trim()}"!`);
  };

  const handleDeleteOptionFromCategory = (catId: string, optionText: string) => {
    const updated = feeCategories.map(cat => {
      if (cat.id === catId) {
        return {
          ...cat,
          options: cat.options.filter(o => o !== optionText)
        };
      }
      return cat;
    });
    triggerUpdateCategories(updated);
    showNotification(`Removed "${optionText}" from preset options.`);
  };

  const handleSaveEditedOption = () => {
    if (!editingOption || !editingOption.newVal.trim()) return;
    const updated = feeCategories.map(cat => {
      if (cat.id === editingOption.catId) {
        return {
          ...cat,
          options: cat.options.map(o => o === editingOption.oldVal ? editingOption.newVal.trim() : o)
        };
      }
      return cat;
    });
    triggerUpdateCategories(updated);
    setEditingOption(null);
    showNotification('Description narrative updated successfully!');
  };

  // Payment Settings Handlers
  const handleSavePaymentMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!methodFormData.name || !methodFormData.accountNumber) {
      alert('Please provide a method name and account number.');
      return;
    }

    let updatedMethods = [...paymentSettings.methods];
    if (editingPaymentMethod) {
      updatedMethods = updatedMethods.map(m => m.id === editingPaymentMethod.id ? { ...m, ...methodFormData } as PaymentMethodConfig : m);
    } else {
      const newMethod: PaymentMethodConfig = {
        id: `pm-${Date.now()}`,
        type: methodFormData.type || 'bank',
        name: methodFormData.name || 'New Payment Method',
        accountName: methodFormData.accountName || 'JIPAS Educational Complex',
        accountNumber: methodFormData.accountNumber || '',
        bankOrProviderName: methodFormData.bankOrProviderName || '',
        branchOrSortCode: methodFormData.branchOrSortCode || '',
        instructions: methodFormData.instructions || 'Enter Student Admission No as reference.',
        enabled: methodFormData.enabled ?? true
      };
      updatedMethods.push(newMethod);
    }

    const newSettings: PaymentSettingsConfig = {
      ...paymentSettings,
      methods: updatedMethods
    };

    await savePaymentSettings(newSettings);
    showNotification(`Payment method "${methodFormData.name}" saved!`);
    setShowAddMethodModal(false);
    setEditingPaymentMethod(null);
  };

  const handleTogglePaymentMethod = async (methodId: string) => {
    const updatedMethods = paymentSettings.methods.map(m => m.id === methodId ? { ...m, enabled: !m.enabled } : m);
    const newSettings = { ...paymentSettings, methods: updatedMethods };
    await savePaymentSettings(newSettings);
    showNotification('Payment method status updated.');
  };

  const handleDeletePaymentMethod = async (methodId: string, name: string) => {
    if (window.confirm(`Are you sure you want to remove payment channel "${name}"?`)) {
      const updatedMethods = paymentSettings.methods.filter(m => m.id !== methodId);
      const newSettings = { ...paymentSettings, methods: updatedMethods };
      await savePaymentSettings(newSettings);
      showNotification(`Payment channel "${name}" removed.`);
    }
  };

  const handleSaveGeneralPaymentInstructions = async () => {
    await savePaymentSettings(paymentSettings);
    showNotification('General payment instructions and support contacts updated!');
  };

  // Fee Submissions Queue Handlers
  const handleConfirmApproval = async () => {
    if (!verifyingSubmission) return;

    const receiptNo = `REC/2026/${Math.floor(100000 + Math.random() * 900000)}`;
    const verifier = userRole === 'admin' ? 'Administrator' : 'Accountant (Grace Tetteh)';

    // 1. Update Fee Submission status
    await updateFeeSubmissionStatus(verifyingSubmission.id, 'Approved', verifier, receiptNo);

    // 2. Create official PaymentRecord
    const newPayment: PaymentRecord = {
      id: `p-${Date.now()}`,
      receiptNo,
      studentId: verifyingSubmission.studentId,
      admissionNo: verifyingSubmission.admissionNo,
      studentName: verifyingSubmission.studentName,
      className: verifyingSubmission.className,
      paidAs: verifyingSubmission.feeType,
      amount: verifyingSubmission.amount,
      paid: verifyingSubmission.amount,
      date: verifyingSubmission.datePaid || new Date().toISOString().split('T')[0],
      academicYear: '2025-2026',
      term: 'Third Term',
      method: verifyingSubmission.paymentMethod as any,
      receivedBy: verifier,
      status: 'Verified',
      description: `Online Self-Reported Payment (Txn ID: ${verifyingSubmission.transactionId})`
    };

    if (onAddPayment) {
      onAddPayment(newPayment);
    }

    // 3. Create Notification for Student & Parent
    const studentNotif: NotificationItem = {
      id: `notif-${Date.now()}`,
      title: '✅ Fee Payment Verified & Approved',
      message: `Your payment proof of ${(verifyingSubmission.amount ?? 0).toFixed(2)} CFA (Txn ID: ${verifyingSubmission.transactionId}) for ${verifyingSubmission.studentName} has been verified and approved. Official Receipt No: ${receiptNo}.`,
      date: new Date().toISOString().split('T')[0],
      type: 'General',
      recipientGroup: verifyingSubmission.studentName,
      targetAudience: 'Parents & Students'
    };
    await saveNotification(studentNotif);
    if (onAddNotification) onAddNotification(studentNotif);

    showNotification(`Payment from ${verifyingSubmission.studentName} (${verifyingSubmission.amount} CFA) approved! Receipt: ${receiptNo}`);
    setVerifyingSubmission(null);
  };

  const handleConfirmRejection = async () => {
    if (!rejectingSubmission) return;
    if (!rejectionReasonInput.trim()) {
      alert('Please state a reason for rejecting this payment submission.');
      return;
    }

    const verifier = userRole === 'admin' ? 'Administrator' : 'Accountant';
    await updateFeeSubmissionStatus(rejectingSubmission.id, 'Rejected', verifier, undefined, rejectionReasonInput.trim());

    // Create Notification for Student & Parent
    const studentNotif: NotificationItem = {
      id: `notif-${Date.now()}`,
      title: '⚠️ Fee Payment Submission Update',
      message: `Your payment proof submission of ${(rejectingSubmission.amount ?? 0).toFixed(2)} CFA (Txn ID: ${rejectingSubmission.transactionId}) for ${rejectingSubmission.studentName} was rejected: "${rejectionReasonInput.trim()}". Please review and re-submit.`,
      date: new Date().toISOString().split('T')[0],
      type: 'General',
      recipientGroup: rejectingSubmission.studentName,
      targetAudience: 'Parents & Students'
    };
    await saveNotification(studentNotif);
    if (onAddNotification) onAddNotification(studentNotif);

    showNotification(`Payment submission for ${rejectingSubmission.studentName} rejected.`);
    setRejectingSubmission(null);
    setRejectionReasonInput('');
  };

  // Filtered Fee Submissions
  const filteredSubmissions = useMemo(() => {
    return activeSubmissions.filter(s => {
      const matchesSearch = s.studentName.toLowerCase().includes(queueSearch.toLowerCase()) ||
        s.admissionNo.toLowerCase().includes(queueSearch.toLowerCase()) ||
        s.transactionId.toLowerCase().includes(queueSearch.toLowerCase()) ||
        s.className.toLowerCase().includes(queueSearch.toLowerCase());

      const matchesStatus = queueStatusFilter === 'All' || s.status === queueStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [activeSubmissions, queueSearch, queueStatusFilter]);

  return (
    <div className="space-y-6">
      {/* Top Role Header & Overview Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-2xl shadow-md border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
              userRole === 'admin' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
            }`}>
              {userRole.toUpperCase()} AUTHORIZED CONSOLE
            </span>
            <span className="text-xs text-indigo-300">• Academic Year 2025-2026</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-cyan-400" />
            School Fee Settings & Tariff Control
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl">
            Configure institutional fee structures, tuition values, statutory levies, custom payment descriptions ("Paid As" narratives), and global billing parameters.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <button
            onClick={() => {
              setEditingItem(null);
              setFormData({
                code: `FEE-${Math.floor(100 + Math.random() * 900)}`,
                name: '',
                category: 'Tuition',
                amount: 100,
                applicableClass: 'All Classes',
                description: '',
                frequency: 'Termly',
                mandatory: true,
                isActive: true
              });
              setIsAddingItem(true);
            }}
            className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Fee Item
          </button>

          <button
            onClick={() => setBatchModalOpen(true)}
            className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3.5 py-2.5 rounded-xl text-xs font-bold border border-slate-700 transition-all cursor-pointer"
          >
            <Percent className="w-3.5 h-3.5 text-cyan-400" /> Batch Adjust
          </button>

          <button
            onClick={async () => {
              try {
                await applyTariffMatrixToAllBills(classTariffs);
                if (onApplyToBills) onApplyToBills(feeOptions);
                showNotification('Fee matrix successfully synchronized to all student bills!');
              } catch (e) {
                console.error('Sync with bills error:', e);
              }
            }}
            title="Recalculate and synchronize all student bills"
            className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Sync with Bills
          </button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs border-l-4 border-l-indigo-600">
          <span className="text-xl sm:text-2xl font-black text-indigo-700">
            {feeOptions.length}
          </span>
          <p className="text-[10px] sm:text-xs uppercase font-bold text-slate-400 mt-1">Configured Fee Tariffs</p>
          <span className="text-[10px] text-slate-500">
            {feeOptions.filter(f => f.mandatory).length} Mandatory • {feeOptions.filter(f => !f.mandatory).length} Optional
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs border-l-4 border-l-cyan-600">
          <span className="text-xl sm:text-2xl font-black text-cyan-700">
            {totalMandatoryTermFees.toLocaleString()} {feePolicy.currencySymbol}
          </span>
          <p className="text-[10px] sm:text-xs uppercase font-bold text-slate-400 mt-1">Total Standard Term Fee</p>
          <span className="text-[10px] text-slate-500">Aggregate mandatory term items</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs border-l-4 border-l-purple-600">
          <span className="text-xl sm:text-2xl font-black text-purple-700">
            {feeCategories.reduce((acc, cat) => acc + cat.options.length, 0)}
          </span>
          <p className="text-[10px] sm:text-xs uppercase font-bold text-slate-400 mt-1">"Paid As" Descriptions</p>
          <span className="text-[10px] text-slate-500">Across {feeCategories.length} categories</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs border-l-4 border-l-emerald-600">
          <span className="text-xl sm:text-2xl font-black text-emerald-700">
            {feePolicy.currencySymbol}
          </span>
          <p className="text-[10px] sm:text-xs uppercase font-bold text-slate-400 mt-1">Base Currency & Policy</p>
          <span className="text-[10px] text-slate-500">Min Deposit: {feePolicy.minDepositPercentage}%</span>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successToast && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl flex items-center justify-between shadow-xs animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span className="text-xs sm:text-sm font-bold">{successToast}</span>
          </div>
          <button 
            onClick={() => setSuccessToast(null)}
            className="text-emerald-700 hover:text-emerald-900 p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Module Sub-Navigation Tabs */}
      <div className="flex flex-wrap gap-2 bg-white p-2 rounded-2xl shadow-xs border border-slate-200">
        <button
          onClick={() => setActiveTab('tariffs')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'tariffs' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <DollarSign className="w-4 h-4" /> Fee Tariffs & Values ({feeOptions.length})
        </button>

        <button
          onClick={() => setActiveTab('descriptions')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'descriptions' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Tag className="w-4 h-4" /> Payment Descriptions ("Paid As" Presets)
        </button>

        <button
          onClick={() => setActiveTab('payment_methods')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'payment_methods' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <CreditCard className="w-4 h-4 text-amber-400" /> Payment Channels & Details
        </button>

        <button
          onClick={() => setActiveTab('submissions_queue')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer relative ${
            activeTab === 'submissions_queue' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Send className="w-4 h-4 text-cyan-400" /> Submitted Payment Proofs
          {pendingCount > 0 && (
            <span className="bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-bounce">
              {pendingCount} Pending
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('matrix')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'matrix' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-4 h-4" /> Class-Wise Fee Structure Matrix
        </button>

        <button
          onClick={() => setActiveTab('policy')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'policy' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Sliders className="w-4 h-4" /> Billing Policies & Parameters
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 1. FEE TARIFFS & VALUES TAB */}
      {/* ========================================================================= */}
      {activeTab === 'tariffs' && (
        <div className="space-y-6">
          {/* Add / Edit Form Card */}
          {isAddingItem && (
            <div className="bg-white rounded-2xl shadow-sm border border-indigo-200 p-6 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                    {editingItem ? <Edit3 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      {editingItem ? `Edit Fee Tariff: ${editingItem.name}` : 'Create New Fee Tariff Item'}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Define the monetary amount, category, class applicability, and description narrative.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setIsAddingItem(false);
                    setEditingItem(null);
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveFeeItem} className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-medium">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Fee Item Code</label>
                  <input
                    type="text"
                    value={formData.code || ''}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="e.g. TUI-PRI-01"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-slate-800 bg-white focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-slate-700 font-bold mb-1">Fee Item Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Tuition Fee (Primary 1 to 6)"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900 font-bold bg-white focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-slate-800 font-bold focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="Tuition">Tuition</option>
                    <option value="PTA">PTA Levy</option>
                    <option value="ICT">ICT & Computer</option>
                    <option value="Exams">Exams & Printing</option>
                    <option value="Health">Health & First Aid</option>
                    <option value="Transport">Bus & Transport</option>
                    <option value="Feeding">Feeding & Canteen</option>
                    <option value="Administrative">Administrative & Admission</option>
                    <option value="Maintenance">Maintenance & Sports</option>
                    <option value="Other">Other Auxiliary</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Fee Value / Amount (CFA) *</label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      min="0"
                      step="5"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                      className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-xl font-mono font-black text-slate-900 bg-white focus:ring-1 focus:ring-indigo-500 text-sm"
                    />
                    <span className="absolute left-2.5 top-2.5 font-bold text-slate-400 text-xs">CFA</span>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Applicable Class / Target</label>
                  <select
                    value={formData.applicableClass}
                    onChange={(e) => setFormData({ ...formData, applicableClass: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-slate-800 font-bold focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="All Classes">All Classes (General)</option>
                    <option value="Pre School">Pre School (Creche, Nursery, KG)</option>
                    <option value="Primary School (All)">Primary School (Basic 1 - 6)</option>
                    <option value="Junior High School (All)">Junior High School (JHS 1 - 3)</option>
                    <option value="Basic 1">Basic 1</option>
                    <option value="Basic 2">Basic 2</option>
                    <option value="JHS 1">JHS 1</option>
                    <option value="JHS 2">JHS 2</option>
                    <option value="JHS 3">JHS 3</option>
                    <option value="Creche">Creche</option>
                    <option value="New Admissions">New Admissions Only</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Billing Frequency</label>
                  <select
                    value={formData.frequency}
                    onChange={(e) => setFormData({ ...formData, frequency: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-slate-800 font-bold focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="Termly">Termly (Each School Term)</option>
                    <option value="Annually">Annually (Once per Academic Year)</option>
                    <option value="Monthly">Monthly</option>
                    <option value="One-Time">One-Time (On Admission/Request)</option>
                  </select>
                </div>

                <div className="flex items-center gap-4 pt-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.mandatory ?? true}
                      onChange={(e) => setFormData({ ...formData, mandatory: e.target.checked })}
                      className="w-4 h-4 text-indigo-600 rounded"
                    />
                    <span className="font-bold text-slate-800">Mandatory Fee</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isActive ?? true}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="w-4 h-4 text-indigo-600 rounded"
                    />
                    <span className="font-bold text-slate-800">Active Status</span>
                  </label>
                </div>

                <div className="md:col-span-3">
                  <label className="block text-slate-700 font-bold mb-1">Description & Purpose Narrative (Shown on Invoices/Receipts)</label>
                  <textarea
                    rows={2}
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Provide a clear description of what this fee covers..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-800 bg-white focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="md:col-span-3 flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingItem(false);
                      setEditingItem(null);
                    }}
                    className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-xs cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    {editingItem ? 'Save Changes' : 'Add Fee Item'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Search, Filter & Controls Header */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 space-y-3">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Fee Tariffs Directory</h3>
                <p className="text-xs text-slate-500">
                  Showing {filteredFeeOptions.length} of {feeOptions.length} fee tariff items
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                <div className="relative flex-1 md:w-60">
                  <input
                    type="text"
                    placeholder="Search by name, code or description..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs bg-white focus:ring-1 focus:ring-indigo-500"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </div>

                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white font-bold text-slate-700"
                >
                  <option value="All">All Categories</option>
                  <option value="Tuition">Tuition</option>
                  <option value="PTA">PTA</option>
                  <option value="ICT">ICT</option>
                  <option value="Exams">Exams</option>
                  <option value="Health">Health</option>
                  <option value="Transport">Transport</option>
                  <option value="Feeding">Feeding</option>
                  <option value="Administrative">Administrative</option>
                  <option value="Maintenance">Maintenance</option>
                </select>

                <select
                  value={filterMandatory}
                  onChange={(e) => setFilterMandatory(e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white font-bold text-slate-700"
                >
                  <option value="All">Mandatory & Optional</option>
                  <option value="Mandatory">Mandatory Only</option>
                  <option value="Optional">Optional Only</option>
                </select>
              </div>
            </div>
          </div>

          {/* Fee Tariffs Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap text-xs">
                <thead>
                  <tr className="bg-slate-900 text-white font-bold uppercase text-[10px]">
                    <th className="p-3 w-12">#</th>
                    <th className="p-3">Code</th>
                    <th className="p-3">Fee Name & Description</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Applicable Class</th>
                    <th className="p-3">Frequency</th>
                    <th className="p-3">Type</th>
                    <th className="p-3 text-right">Amount (CFA)</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredFeeOptions.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-slate-400">
                        No fee items match the search or filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredFeeOptions.map((item, idx) => {
                      const catStyle = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.Other;
                      return (
                        <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 text-slate-400 font-mono">{idx + 1}</td>
                          <td className="p-3 font-mono font-bold text-indigo-700">
                            {item.code || `FEE-${idx + 10}`}
                          </td>
                          <td className="p-3 max-w-[280px]">
                            <span className="font-bold text-slate-900 block truncate">{item.name}</span>
                            {item.description && (
                              <span className="text-[11px] text-slate-500 block truncate" title={item.description}>
                                {item.description}
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}>
                              {item.category}
                            </span>
                          </td>
                          <td className="p-3 text-slate-700 font-bold">
                            {item.applicableClass}
                          </td>
                          <td className="p-3 text-slate-600">
                            {item.frequency || 'Termly'}
                          </td>
                          <td className="p-3">
                            {item.mandatory ? (
                              <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-bold">
                                Mandatory
                              </span>
                            ) : (
                              <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-[10px] font-bold">
                                Optional
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-right font-mono font-black text-slate-900 text-sm">
                            {item.amount.toLocaleString()} CFA
                          </td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => handleToggleActive(item.id)}
                              title="Toggle active status"
                              className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                                item.isActive !== false 
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100' 
                                  : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                              }`}
                            >
                              {item.isActive !== false ? 'Active' : 'Disabled'}
                            </button>
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleStartEdit(item)}
                                title="Edit Fee Values & Description"
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteItem(item.id, item.name)}
                                title="Delete Fee Tariff"
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
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
      )}

      {/* ========================================================================= */}
      {/* 2. PAYMENT DESCRIPTIONS ("PAID AS" PRESETS) TAB */}
      {/* ========================================================================= */}
      {activeTab === 'descriptions' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Tag className="w-5 h-5 text-indigo-600" />
                  Standard Payment Descriptions & "Paid As" Library
                </h3>
                <p className="text-xs text-slate-500">
                  These categorized payment narratives standardize receipt wording and populate the "Paid As (Description)" selective dropdown across Accountant and Admin modules.
                </p>
              </div>

              {/* Add New Category form */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <input
                  type="text"
                  placeholder="New Category Name..."
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  onClick={handleAddCategory}
                  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Category
                </button>
              </div>
            </div>

            {/* Editing Option Modal / Inline */}
            {editingOption && (
              <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex-1 w-full">
                  <label className="block text-[11px] font-bold text-indigo-900 mb-1">Edit Description Text</label>
                  <input
                    type="text"
                    value={editingOption.newVal}
                    onChange={(e) => setEditingOption({ ...editingOption, newVal: e.target.value })}
                    className="w-full px-3 py-2 border border-indigo-300 rounded-xl text-xs font-bold text-slate-900 bg-white"
                  />
                </div>
                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    onClick={() => setEditingOption(null)}
                    className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 bg-white"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEditedOption}
                    className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" /> Save
                  </button>
                </div>
              </div>
            )}

            {/* Categories List */}
            <div className="space-y-6">
              {feeCategories.map((category) => (
                <div key={category.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-200 pb-3">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
                        {category.category}
                      </h4>
                      {category.description && (
                        <p className="text-[11px] text-slate-500">{category.description}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {category.options.length} options
                      </span>
                      <button
                        onClick={() => handleDeleteCategory(category.id, category.category)}
                        title="Delete entire category"
                        className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Options List */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {category.options.map((opt, optIdx) => (
                      <div
                        key={optIdx}
                        className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between gap-2 shadow-2xs hover:border-indigo-300 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                          <span className="text-xs font-semibold text-slate-800 truncate" title={opt}>
                            {opt}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => setEditingOption({ catId: category.id, oldVal: opt, newVal: opt })}
                            title="Edit description narrative"
                            className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded cursor-pointer"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteOptionFromCategory(category.id, opt)}
                            title="Remove option"
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add Option to this Category */}
                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="text"
                      placeholder={`Add new description to ${category.category}...`}
                      value={newOptionInputs[category.id] || ''}
                      onChange={(e) => setNewOptionInputs({ ...newOptionInputs, [category.id]: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddOptionToCategory(category.id);
                        }
                      }}
                      className="flex-1 px-3 py-1.5 border border-slate-300 rounded-xl text-xs bg-white focus:ring-1 focus:ring-indigo-500"
                    />
                    <button
                      onClick={() => handleAddOptionToCategory(category.id)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Description
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. CLASS-WISE FEE STRUCTURE MATRIX TAB */}
      {/* ========================================================================= */}
      {activeTab === 'matrix' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-600" />
                Class-Wise Fee Tariffs Matrix (2026-2027 Academic Year Schedule)
              </h3>
              <p className="text-xs text-slate-500">
                Fully editable aggregated compulsory and optional fee schedules applied per class department. Click any card to edit tariffs.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center bg-slate-100 p-1 rounded-xl mr-2">
                <button
                  onClick={() => setMatrixViewMode('grid')}
                  className={`p-1.5 rounded-lg transition-all flex items-center gap-1.5 ${matrixViewMode === 'grid' ? 'bg-white shadow-xs text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
                  title="Grid View"
                >
                  <Layers className="w-4 h-4" />
                  <span className="text-[10px] font-bold">Grid</span>
                </button>
                <button
                  onClick={() => setMatrixViewMode('table')}
                  className={`p-1.5 rounded-lg transition-all flex items-center gap-1.5 ${matrixViewMode === 'table' ? 'bg-white shadow-xs text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
                  title="Table View (Editable)"
                >
                  <FileText className="w-4 h-4" />
                  <span className="text-[10px] font-bold">Table</span>
                </button>
              </div>

              <button
                onClick={openAddTariffModal}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4 text-emerald-400" /> Add New Class Tariff
              </button>

              <button
                onClick={async () => {
                  try {
                    await applyTariffMatrixToAllBills(classTariffs);
                    if (onApplyToBills) onApplyToBills(feeOptions);
                    showNotification('Fee matrix successfully applied to all student bills!');
                  } catch (e) {
                    console.error('Apply matrix error:', e);
                  }
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Apply Matrix to All Student Bills
              </button>
            </div>
          </div>

          {matrixViewMode === 'table' ? (
            <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-xs">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="p-3">Class Title</th>
                    <th className="p-3">Tuition</th>
                    <th className="p-3">PTA</th>
                    <th className="p-3">ICT</th>
                    <th className="p-3">Exams</th>
                    <th className="p-3">Health</th>
                    <th className="p-3 text-indigo-700">Bus Transit</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {classTariffs.map((cls) => (
                    <tr key={cls.id} className="hover:bg-indigo-50/30 transition-colors group">
                      <td className="p-3 font-bold text-slate-900">{cls.classTitle}</td>
                      <td className="p-2">
                        <input
                          type="number"
                          value={cls.baseTuition}
                          onChange={(e) => handleInlineTariffChange(cls.id, 'baseTuition', e.target.value)}
                          className="w-24 px-2 py-1 border border-transparent group-hover:border-slate-200 rounded bg-transparent group-hover:bg-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-slate-900"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          value={cls.ptaDues}
                          onChange={(e) => handleInlineTariffChange(cls.id, 'ptaDues', e.target.value)}
                          className="w-20 px-2 py-1 border border-transparent group-hover:border-slate-200 rounded bg-transparent group-hover:bg-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-slate-900"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          value={cls.ictFee}
                          onChange={(e) => handleInlineTariffChange(cls.id, 'ictFee', e.target.value)}
                          className="w-20 px-2 py-1 border border-transparent group-hover:border-slate-200 rounded bg-transparent group-hover:bg-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-slate-900"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          value={cls.examFee}
                          onChange={(e) => handleInlineTariffChange(cls.id, 'examFee', e.target.value)}
                          className="w-20 px-2 py-1 border border-transparent group-hover:border-slate-200 rounded bg-transparent group-hover:bg-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-slate-900"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          value={cls.healthLevy}
                          onChange={(e) => handleInlineTariffChange(cls.id, 'healthLevy', e.target.value)}
                          className="w-20 px-2 py-1 border border-transparent group-hover:border-slate-200 rounded bg-transparent group-hover:bg-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-slate-900"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          value={cls.busTransit}
                          onChange={(e) => handleInlineTariffChange(cls.id, 'busTransit', e.target.value)}
                          className="w-24 px-2 py-1 border border-transparent group-hover:border-slate-200 rounded bg-transparent group-hover:bg-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-indigo-700 font-bold"
                        />
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openEditTariffModal(cls)}
                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit Full Schedule"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteTariffHandler(cls)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete Schedule"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {classTariffs.map((cls) => {
              const totalCompulsory = cls.baseTuition + cls.ptaDues + cls.ictFee + cls.examFee + cls.healthLevy;

              return (
                <div key={cls.id} className="bg-slate-50/80 border border-slate-200 rounded-2xl p-5 space-y-4 hover:border-indigo-300 hover:shadow-md transition-all relative group">
                  <div className="flex justify-between items-start border-b border-slate-200 pb-3">
                    <div>
                      <h4 className="text-sm font-black text-slate-900">{cls.classTitle}</h4>
                      <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full uppercase border border-indigo-100 mt-0.5 inline-block">
                        {cls.dept}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-black text-indigo-700 text-lg block">
                        {totalCompulsory.toLocaleString()} CFA
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">Total Compulsory</span>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between text-slate-600 items-center">
                      <span className="font-medium">Tuition Fee</span>
                      <span className="font-mono font-bold text-slate-900">{cls.baseTuition.toLocaleString()} CFA</span>
                    </div>
                    <div className="flex justify-between text-slate-600 items-center">
                      <span className="font-medium">PTA Development Dues</span>
                      <span className="font-mono font-bold text-slate-900">{cls.ptaDues.toLocaleString()} CFA</span>
                    </div>
                    <div className="flex justify-between text-slate-600 items-center">
                      <span className="font-medium">ICT & Computer Lab</span>
                      <span className="font-mono font-bold text-slate-900">{cls.ictFee.toLocaleString()} CFA</span>
                    </div>
                    <div className="flex justify-between text-slate-600 items-center">
                      <span className="font-medium">Exam & Printing Fee</span>
                      <span className="font-mono font-bold text-slate-900">{cls.examFee.toLocaleString()} CFA</span>
                    </div>
                    <div className="flex justify-between text-slate-600 items-center">
                      <span className="font-medium">Infirmary Health Levy</span>
                      <span className="font-mono font-bold text-slate-900">{cls.healthLevy.toLocaleString()} CFA</span>
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-slate-200 flex justify-between items-center text-xs text-slate-600">
                    <span className="font-medium text-indigo-700">Optional Bus Transit</span>
                    <span className="font-mono font-bold text-slate-800">+{cls.busTransit.toLocaleString()} CFA</span>
                  </div>

                  {cls.notes && (
                    <p className="text-[11px] text-slate-500 italic bg-white p-2 rounded-lg border border-slate-100">
                      "{cls.notes}"
                    </p>
                  )}

                  {/* Card Action Buttons */}
                  <div className="pt-3 border-t border-slate-200/80 flex items-center justify-between gap-2">
                    <button
                      onClick={() => openEditTariffModal(cls)}
                      className="flex-1 py-1.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border border-indigo-200 transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-indigo-600" /> Edit Tariff
                    </button>
                    <button
                      onClick={() => handleDeleteTariffHandler(cls)}
                      className="py-1.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-bold flex items-center justify-center gap-1 border border-rose-200 transition-colors cursor-pointer"
                      title="Delete Class Tariff"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          )}
        </div>
      )}


      {/* ========================================================================= */}
      {/* 4. BILLING POLICIES & PARAMETERS TAB */}
      {/* ========================================================================= */}
      {activeTab === 'policy' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-indigo-600" />
              School Billing Policies & Receipt Configuration
            </h3>
            <p className="text-xs text-slate-500">
              Set default payment currency, installment rules, late payment penalties, and terms printed on official receipts.
            </p>
          </div>

          <form 
            onSubmit={(e) => {
              e.preventDefault();
              triggerUpdatePolicy(feePolicy);
              showNotification('Billing policies and receipt parameters saved successfully!');
            }}
            className="space-y-6 text-xs font-medium"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Base Currency Symbol</label>
                <input
                  type="text"
                  value={feePolicy.currencySymbol}
                  onChange={(e) => setFeePolicy({ ...feePolicy, currencySymbol: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-900 bg-white focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Default Active Term</label>
                <input
                  type="text"
                  value={feePolicy.defaultPaymentTerm}
                  onChange={(e) => setFeePolicy({ ...feePolicy, defaultPaymentTerm: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-900 bg-white focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Minimum 1st Installment Deposit (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={feePolicy.minDepositPercentage}
                  onChange={(e) => setFeePolicy({ ...feePolicy, minDepositPercentage: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-900 bg-white focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Late Payment Surcharge Rate (%)</label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={feePolicy.lateFeePenaltyPercent}
                  onChange={(e) => setFeePolicy({ ...feePolicy, lateFeePenaltyPercent: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-900 bg-white focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Sibling Discount Grant (%)</label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={feePolicy.siblingDiscountPercent}
                  onChange={(e) => setFeePolicy({ ...feePolicy, siblingDiscountPercent: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-900 bg-white focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center gap-4 pt-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={feePolicy.allowPartPayments}
                    onChange={(e) => setFeePolicy({ ...feePolicy, allowPartPayments: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span className="font-bold text-slate-800">Allow Part Payments</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Receipt Header Note</label>
                <input
                  type="text"
                  value={feePolicy.receiptHeaderNote}
                  onChange={(e) => setFeePolicy({ ...feePolicy, receiptHeaderNote: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-800 bg-white focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Receipt Footer Terms & Conditions Note</label>
                <input
                  type="text"
                  value={feePolicy.receiptFooterNote}
                  onChange={(e) => setFeePolicy({ ...feePolicy, receiptFooterNote: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-800 bg-white focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="submit"
                className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-xs cursor-pointer"
              >
                <Save className="w-4 h-4" /> Save Billing Policies
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. PAYMENT CHANNELS & DETAILS TAB */}
      {/* ========================================================================= */}
      {activeTab === 'payment_methods' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
              <div>
                <span className="bg-amber-100 text-amber-800 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full">
                  Parent & Student Portal Setup
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-indigo-600" />
                  Official Payment Channels & Bank / MoMo Accounts
                </h3>
                <p className="text-xs text-slate-500">
                  Configure school bank accounts, Mobile Money numbers, and payment instructions visible to parents and students.
                </p>
              </div>

              <button
                onClick={() => {
                  setEditingPaymentMethod(null);
                  setMethodFormData({
                    type: 'bank',
                    name: '',
                    accountName: 'JIPAS Educational Complex',
                    accountNumber: '',
                    bankOrProviderName: '',
                    branchOrSortCode: '',
                    instructions: 'Include Student Admission Number as Reference.',
                    enabled: true
                  });
                  setShowAddMethodModal(true);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Add Payment Channel
              </button>
            </div>

            {/* Methods Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paymentSettings.methods.map((pm) => (
                <div key={pm.id} className={`p-5 rounded-2xl border transition-all space-y-3 relative ${
                  pm.enabled ? 'bg-slate-50 border-slate-200' : 'bg-slate-100/60 border-slate-200 opacity-60'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 flex items-center gap-1 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                      {pm.type === 'bank' && <Building2 className="w-3.5 h-3.5" />}
                      {pm.type === 'momo' && <Smartphone className="w-3.5 h-3.5" />}
                      {pm.type === 'cash' && <CreditCard className="w-3.5 h-3.5" />}
                      {pm.type.toUpperCase()} • {pm.bankOrProviderName || pm.type}
                    </span>

                    <button
                      onClick={() => handleTogglePaymentMethod(pm.id)}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black cursor-pointer ${
                        pm.enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {pm.enabled ? 'Active' : 'Disabled'}
                    </button>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{pm.name}</h4>
                    <p className="text-xs text-slate-600 font-semibold">{pm.accountName}</p>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 font-mono flex justify-between items-center">
                    <div>
                      <span className="text-[9px] text-slate-400 block uppercase">Account Number</span>
                      <span className="text-sm font-black text-indigo-900 tracking-wider">{pm.accountNumber}</span>
                    </div>
                    {pm.branchOrSortCode && (
                      <span className="text-[10px] text-slate-500 font-sans font-semibold">
                        Branch: {pm.branchOrSortCode}
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-500 italic bg-white/50 p-2 rounded-lg border border-slate-200/60">
                    "{pm.instructions}"
                  </p>

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                    <button
                      onClick={() => {
                        setEditingPaymentMethod(pm);
                        setMethodFormData(pm);
                        setShowAddMethodModal(true);
                      }}
                      className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1"
                    >
                      <Edit3 className="w-3 h-3" /> Edit
                    </button>
                    <button
                      onClick={() => handleDeletePaymentMethod(pm.id, pm.name)}
                      className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* General Instructions & Support Contacts */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">General Portal Instructions & Support Contacts</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">General Payment Note for Parents</label>
                  <textarea
                    rows={2}
                    value={paymentSettings.generalInstructions}
                    onChange={(e) => setPaymentSettings({ ...paymentSettings, generalInstructions: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-indigo-600" /> Accounts Support Phone / MoMo Help
                    </label>
                    <input
                      type="text"
                      value={paymentSettings.supportPhone}
                      onChange={(e) => setPaymentSettings({ ...paymentSettings, supportPhone: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-indigo-600" /> Accounts Support Email
                    </label>
                    <input
                      type="text"
                      value={paymentSettings.supportEmail}
                      onChange={(e) => setPaymentSettings({ ...paymentSettings, supportEmail: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleSaveGeneralPaymentInstructions}
                    className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" /> Save General Payment Notes
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. SUBMITTED PAYMENT PROOFS QUEUE TAB */}
      {/* ========================================================================= */}
      {activeTab === 'submissions_queue' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
              <div>
                <span className="bg-cyan-100 text-cyan-800 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full">
                  Real-time Fee Verification Center
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1 flex items-center gap-2">
                  <Send className="w-5 h-5 text-indigo-600" />
                  Student Self-Reported Payment Proofs
                </h3>
                <p className="text-xs text-slate-500">
                  Review fee transactions submitted by students and parents. Verifying a payment auto-generates a receipt and updates student financial balances.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="bg-amber-100 text-amber-900 px-3 py-1.5 rounded-xl text-xs font-extrabold border border-amber-200">
                  {pendingCount} Pending Review
                </span>
              </div>
            </div>

            {/* Metrics Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-500 font-bold block">Total Submissions</span>
                <span className="text-lg font-black text-slate-900">{feeSubmissions.length}</span>
              </div>
              <div className="bg-amber-50 p-3 rounded-xl border border-amber-200">
                <span className="text-xs text-amber-700 font-bold block">Pending Verification</span>
                <span className="text-lg font-black text-amber-900">{pendingCount}</span>
              </div>
              <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                <span className="text-xs text-emerald-700 font-bold block">Approved Payments</span>
                <span className="text-lg font-black text-emerald-900">
                  {feeSubmissions.filter(s => s.status === 'Approved').length}
                </span>
              </div>
              <div className="bg-rose-50 p-3 rounded-xl border border-rose-200">
                <span className="text-xs text-rose-700 font-bold block">Rejected Submissions</span>
                <span className="text-lg font-black text-rose-900">
                  {feeSubmissions.filter(s => s.status === 'Rejected').length}
                </span>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search student name, class, admission no, or transaction ID..."
                  value={queueSearch}
                  onChange={(e) => setQueueSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 font-semibold focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <select
                  value={queueStatusFilter}
                  onChange={(e) => setQueueStatusFilter(e.target.value as any)}
                  className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="All">All Verification Statuses</option>
                  <option value="Pending Verification">Pending Verification Only</option>
                  <option value="Approved">Approved Only</option>
                  <option value="Rejected">Rejected Only</option>
                </select>
              </div>
            </div>

            {/* Submissions Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                <thead>
                  <tr className="bg-slate-900 text-white uppercase text-[10px] font-bold">
                    <th className="p-3">Date</th>
                    <th className="p-3">Student & Class</th>
                    <th className="p-3">Fee Category</th>
                    <th className="p-3">Payment Channel</th>
                    <th className="p-3 text-right">Amount (CFA)</th>
                    <th className="p-3 font-mono">Transaction ID / Ref</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-center">Action / Verification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredSubmissions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-slate-50">
                      <td className="p-3 text-slate-600 font-mono text-[11px]">{sub.submissionDate}</td>
                      <td className="p-3">
                        <div className="font-bold text-slate-900">{sub.studentName}</div>
                        <div className="text-[10px] text-slate-500">
                          {sub.className} • <span className="font-mono">{sub.admissionNo}</span>
                        </div>
                      </td>
                      <td className="p-3 font-semibold text-slate-800">{sub.feeType}</td>
                      <td className="p-3 text-slate-700">{sub.paymentMethod}</td>
                      <td className="p-3 text-right font-bold text-emerald-700 font-mono text-xs">
                        {(sub.amount ?? 0).toFixed(2)} CFA
                      </td>
                      <td className="p-3 font-mono font-black text-indigo-700 bg-indigo-50/50 rounded px-2 py-1">
                        {sub.transactionId}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase shadow-2xs ${
                          sub.status === 'Approved' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                          sub.status === 'Rejected' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                          'bg-amber-100 text-amber-800 border border-amber-200 animate-pulse'
                        }`}>
                          {sub.status}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {sub.status === 'Pending Verification' ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setVerifyingSubmission(sub)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1"
                            >
                              <CheckCircle className="w-3.5 h-3.5" /> Verify & Approve
                            </button>
                            <button
                              onClick={() => {
                                setRejectingSubmission(sub);
                                setRejectionReasonInput('');
                              }}
                              className="px-2.5 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1"
                            >
                              <XCircle className="w-3.5 h-3.5" /> Reject
                            </button>
                          </div>
                        ) : sub.status === 'Approved' ? (
                          <span className="text-emerald-700 text-[11px] font-bold">
                            Receipt: {sub.receiptNo || 'Verified'}
                          </span>
                        ) : (
                          <span className="text-rose-600 text-[11px] font-bold" title={sub.rejectionReason}>
                            Reason: {sub.rejectionReason}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredSubmissions.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        No payment submissions found matching your search or filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ADD / EDIT PAYMENT METHOD */}
      {/* ========================================================================= */}
      {showAddMethodModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-indigo-600" />
                {editingPaymentMethod ? 'Edit Payment Channel' : 'Add New Payment Channel'}
              </h3>
              <button
                onClick={() => setShowAddMethodModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePaymentMethod} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Channel Type *</label>
                <select
                  value={methodFormData.type}
                  onChange={(e) => setMethodFormData({ ...methodFormData, type: e.target.value as any })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold bg-white"
                >
                  <option value="bank">Bank Wire / Direct Transfer</option>
                  <option value="momo">Mobile Money (MTN / Vodafone / AirtelTigo)</option>
                  <option value="cash">Cash / Campus Bursar Direct</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Display Label / Method Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MTN Mobile Money Official"
                  value={methodFormData.name}
                  onChange={(e) => setMethodFormData({ ...methodFormData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Bank Name / Provider Name</label>
                <input
                  type="text"
                  placeholder="e.g. Ecobank the region or MTN MoMo"
                  value={methodFormData.bankOrProviderName}
                  onChange={(e) => setMethodFormData({ ...methodFormData, bankOrProviderName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Account / MoMo No *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 0244123456"
                    value={methodFormData.accountNumber}
                    onChange={(e) => setMethodFormData({ ...methodFormData, accountNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono font-bold text-indigo-900"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Branch / Sort Code</label>
                  <input
                    type="text"
                    placeholder="e.g. Accra Main"
                    value={methodFormData.branchOrSortCode}
                    onChange={(e) => setMethodFormData({ ...methodFormData, branchOrSortCode: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Account Holder Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. JIPAS Educational Complex"
                  value={methodFormData.accountName}
                  onChange={(e) => setMethodFormData({ ...methodFormData, accountName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Instructions for Parents</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Use Student Admission No as reference"
                  value={methodFormData.instructions}
                  onChange={(e) => setMethodFormData({ ...methodFormData, instructions: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddMethodModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-xs"
                >
                  Save Payment Channel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: CONFIRM APPROVAL OF FEE SUBMISSION */}
      {/* ========================================================================= */}
      {verifyingSubmission && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                Approve Payment Proof
              </h3>
              <button
                onClick={() => setVerifyingSubmission(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-500">Student Name:</span>
                <span className="font-bold text-slate-900">{verifyingSubmission.studentName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Class & Admission:</span>
                <span className="font-bold text-slate-800">{verifyingSubmission.className} ({verifyingSubmission.admissionNo})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Fee Paid As:</span>
                <span className="font-bold text-slate-800">{verifyingSubmission.feeType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Method:</span>
                <span className="font-bold text-slate-800">{verifyingSubmission.paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Transaction ID:</span>
                <span className="font-mono font-black text-indigo-700">{verifyingSubmission.transactionId}</span>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t border-slate-200 font-bold">
                <span className="text-slate-900">Amount Paid:</span>
                <span className="font-mono text-emerald-700">{(verifyingSubmission.amount ?? 0).toFixed(2)} CFA</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Approving this submission will generate an official receipt, post a <strong>{(verifyingSubmission.amount ?? 0).toFixed(2)} CFA</strong> payment to the student's ledger, and notify the student/parent via portal alert.
            </p>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setVerifyingSubmission(null)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmApproval}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs flex items-center gap-1.5"
              >
                <CheckCircle className="w-4 h-4" /> Confirm & Post Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: REJECT FEE SUBMISSION */}
      {/* ========================================================================= */}
      {rejectingSubmission && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-rose-900 flex items-center gap-2">
                <XCircle className="w-5 h-5 text-rose-600" />
                Reject Payment Submission
              </h3>
              <button
                onClick={() => setRejectingSubmission(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs space-y-1">
              <p className="font-bold text-slate-800">Student: {rejectingSubmission.studentName} ({rejectingSubmission.className})</p>
              <p className="text-slate-500">Transaction ID: <span className="font-mono font-bold text-indigo-700">{rejectingSubmission.transactionId}</span></p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Reason for Rejection *</label>
              <textarea
                rows={3}
                required
                value={rejectionReasonInput}
                onChange={(e) => setRejectionReasonInput(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-rose-500"
                placeholder="e.g. Transaction ID MOM-9821034 not found on MoMo statement, or amount mismatch."
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 text-xs">
              <button
                type="button"
                onClick={() => setRejectingSubmission(null)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRejection}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow-xs"
              >
                Reject Submission
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Adjust Modal */}
      {batchModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Percent className="w-5 h-5 text-cyan-600" /> Batch Tariff Adjustment
              </h3>
              <button 
                onClick={() => setBatchModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Quickly adjust fee values across an entire category or all tariffs by a percentage modifier.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Target Category</label>
                <select
                  value={batchCategory}
                  onChange={(e) => setBatchCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold bg-white"
                >
                  <option value="All">All Categories</option>
                  <option value="Tuition">Tuition Only</option>
                  <option value="PTA">PTA Levy Only</option>
                  <option value="ICT">ICT Only</option>
                  <option value="Exams">Exams Only</option>
                  <option value="Transport">Transport Only</option>
                  <option value="Feeding">Feeding Only</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Percentage Adjustment (+ / - %)</label>
                <input
                  type="number"
                  value={batchPercent}
                  onChange={(e) => setBatchPercent(parseFloat(e.target.value) || 0)}
                  placeholder="e.g. 5 for +5%, -5 for -5%"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono font-bold text-slate-900 bg-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setBatchModalOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyBatchAdjustment}
                className="px-5 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl font-bold shadow-xs"
              >
                Apply Adjustment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDIT / ADD CLASS FEE TARIFF MATRIX SCHEDULE */}
      {/* ========================================================================= */}
      {showTariffModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 space-y-5 animate-in fade-in zoom-in-95 my-8">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-indigo-600" />
                  {editingTariff ? `Edit Tariff: ${editingTariff.classTitle}` : 'Create New Class Fee Tariff'}
                </h3>
                <p className="text-xs text-slate-500">
                  Configure tuition, mandatory levies, and optional fees for this class structure.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowTariffModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTariff} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Class Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Basic 1 or Creche / Nursery"
                    value={tariffFormData.classTitle || ''}
                    onChange={(e) => setTariffFormData({ ...tariffFormData, classTitle: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-900 bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Department *</label>
                  <select
                    value={tariffFormData.dept || 'Primary School'}
                    onChange={(e) => setTariffFormData({ ...tariffFormData, dept: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-900 bg-white focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Pre School">Pre School</option>
                    <option value="Primary School">Primary School</option>
                    <option value="Junior High School">Junior High School</option>
                    <option value="Senior High School">Senior High School</option>
                    <option value="General">General School-Wide</option>
                  </select>
                </div>
              </div>

              <div className="p-4 bg-indigo-50/60 rounded-2xl border border-indigo-100 space-y-3">
                <h4 className="text-xs font-black text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-indigo-600" />
                  Fee Amounts (CFA Francs)
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Tuition Fee (CFA)</label>
                    <input
                      type="number"
                      min="0"
                      value={tariffFormData.baseTuition ?? 0}
                      onChange={(e) => setTariffFormData({ ...tariffFormData, baseTuition: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono font-bold text-slate-900 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">PTA Dues (CFA)</label>
                    <input
                      type="number"
                      min="0"
                      value={tariffFormData.ptaDues ?? 0}
                      onChange={(e) => setTariffFormData({ ...tariffFormData, ptaDues: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono font-bold text-slate-900 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">ICT & Lab Fee (CFA)</label>
                    <input
                      type="number"
                      min="0"
                      value={tariffFormData.ictFee ?? 0}
                      onChange={(e) => setTariffFormData({ ...tariffFormData, ictFee: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono font-bold text-slate-900 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Exam & Printing (CFA)</label>
                    <input
                      type="number"
                      min="0"
                      value={tariffFormData.examFee ?? 0}
                      onChange={(e) => setTariffFormData({ ...tariffFormData, examFee: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono font-bold text-slate-900 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Infirmary Health Levy (CFA)</label>
                    <input
                      type="number"
                      min="0"
                      value={tariffFormData.healthLevy ?? 0}
                      onChange={(e) => setTariffFormData({ ...tariffFormData, healthLevy: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono font-bold text-slate-900 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Optional Bus Transit (CFA)</label>
                    <input
                      type="number"
                      min="0"
                      value={tariffFormData.busTransit ?? 0}
                      onChange={(e) => setTariffFormData({ ...tariffFormData, busTransit: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono font-bold text-slate-900 bg-white"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-indigo-200/60 flex justify-between items-center text-xs">
                  <span className="font-bold text-indigo-900">Calculated Compulsory Total:</span>
                  <span className="font-mono font-black text-indigo-700 text-sm">
                    {((tariffFormData.baseTuition || 0) + (tariffFormData.ptaDues || 0) + (tariffFormData.ictFee || 0) + (tariffFormData.examFee || 0) + (tariffFormData.healthLevy || 0)).toLocaleString()} CFA
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Description / Notes</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Includes practical workbooks and exam printing materials."
                  value={tariffFormData.notes || ''}
                  onChange={(e) => setTariffFormData({ ...tariffFormData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white text-slate-800 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowTariffModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-sm flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  {editingTariff ? 'Save Tariff Schedule' : 'Create Tariff Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


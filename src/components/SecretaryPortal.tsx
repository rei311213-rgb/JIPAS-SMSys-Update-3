import React, { useState, useEffect, useMemo, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  Student, 
  StudentBill, 
  PaymentRecord, 
  SchoolExpenseRecord,
  SecretaryDailySummary,
  CalendarEvent,
  NotificationItem,
  CourseItem
} from '../types';
import { 
  getStoredExpenses, 
  saveStoredExpenses,
  getStoredSecretarySummaries,
  saveStoredSecretarySummaries,
  getStoredDepartments,
  getStoredClasses,
  getStoredBills,
  saveStoredBills,
  getStoredSettings,
  getStoredUsers
} from '../services/storageService';
import { saveStudent, saveBill, generateUniqueAdmissionNo } from '../services/dbService';
import { generateNextReceiptSerialNumber } from '../services/receiptSerialService';
import { PDFGeneratorService } from '../services/pdfService';
import PrintableReceiptA6 from './common/PrintableReceiptA6';
import BatchReceiptPrintModal from './common/BatchReceiptPrintModal';
import ReceiptQRVerificationModal from './common/ReceiptQRVerificationModal';
import { INITIAL_SHS_COURSES } from '../data/setupData';
import JIPASLogo, { getSchoolLogo } from './common/JIPASLogo';
import ExpenseManager from './common/ExpenseManager';
import BankDepositManager from './common/BankDepositManager';
import PhotoUploader from './common/PhotoUploader';
import OverdueFeeAlertsManager from './admin/OverdueFeeAlertsManager';
import SecretarySidebar, { SecretaryTabType } from './secretary/SecretarySidebar';
import SecretaryDashboard from './secretary/SecretaryDashboard';
import GraduatedBatchManager from './common/GraduatedBatchManager';
import PastEmployeeHistoryManager from './common/PastEmployeeHistoryManager';
import StaffAttendanceQRScanner from './staff/StaffAttendanceQRScanner';
import SyncNowButton from './common/SyncNowButton';
import BulkFeeEntryTool from './common/BulkFeeEntryTool';
import ReceiptGenerationDashboard from './common/ReceiptGenerationDashboard';
import NextTermBillingManager from './common/NextTermBillingManager';
import CampusSelector from './common/CampusSelector';
import { Campus, filterStudentsByCampus, filterBillsByCampus, filterPaymentsByCampus, filterExpensesByCampus, filterSummariesByCampus } from '../lib/campusUtils';
import { useStudentFormDraft } from '../hooks/useStudentFormDraft';
import { StudentFormDraftData } from '../services/studentDraftService';
import DraftStatusBanner from './common/DraftStatusBanner';
import { 
  DollarSign, 
  Receipt, 
  Search, 
  Plus, 
  CheckCircle2, 
  Calendar, 
  Clock, 
  FileText, 
  Printer, 
  Layers, 
  AlertCircle, 
  ArrowUpRight, 
  TrendingUp, 
  QrCode, 
  Download, 
  UserCheck, 
  Wallet, 
  Sparkles,
  ShieldCheck,
  Building,
  RefreshCw,
  CreditCard,
  Send,
  Eye,
  Check,
  X,
  Phone,
  BookOpen,
  Users,
  Building2,
  User as UserIcon,
  UserPlus,
  AlertTriangle,
  GraduationCap,
  Briefcase,
  Filter,
  Menu,
  LogOut
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { addMoney, subtractMoney, formatCurrency, calculateBillBalance } from '../utils/financeUtils';

interface SecretaryPortalProps {
  secretary: User;
  students: Student[];
  bills: StudentBill[];
  payments: PaymentRecord[];
  calendarEvents?: CalendarEvent[];
  notifications?: NotificationItem[];
  courses?: CourseItem[];
  onAddPayment: (payment: PaymentRecord) => void;
  onAddNotification?: (notif: NotificationItem) => void;
  onAddStudent?: (newStudent: Student) => void;
  onUpdateBills?: (bills: StudentBill[]) => void;
  onLogout?: () => void;
}

type SecretaryActiveTab = 
  | 'dashboard'
  | 'fee_collection' 
  | 'expenses' 
  | 'daily_reconcile' 
  | 'students_lookup' 
  | 'bank_deposits'
  | 'enroll_student'
  | 'overdue_alerts'
  | 'collections_log'
  | 'bulk_fee_entry'
  | 'graduated_batch'
  | 'employee_history'
  | 'staff_attendance'
  | 'generate_receipt'
  | 'daily_records'
  | 'next_term_bills';

export default function SecretaryPortal({
  secretary: rawSecretary,
  students: propStudents,
  bills: propBills,
  payments: propPayments,
  calendarEvents = [],
  notifications = [],
  courses = INITIAL_SHS_COURSES,
  onAddPayment,
  onAddNotification,
  onAddStudent,
  onUpdateBills,
  onLogout
}: SecretaryPortalProps) {
  // Look up the actual logged-in user details to prevent falling back to generic placeholders or hardcoded names
  const loggedInUser = useMemo(() => {
    try {
      const storedUsers = getStoredUsers();
      // Match by ID, email, or username
      const matched = storedUsers.find(u => 
        (rawSecretary?.id && u.id === rawSecretary.id) ||
        (rawSecretary?.email && u.email?.toLowerCase() === rawSecretary.email.toLowerCase()) ||
        ((rawSecretary as any)?.username && u.username?.toLowerCase() === (rawSecretary as any).username.toLowerCase())
      );
      if (matched) return matched;
      
      const fallback = storedUsers.find(u => u.role === 'clerk' || u.role === 'secretary');
      return fallback || rawSecretary;
    } catch {
      return rawSecretary;
    }
  }, [rawSecretary]);

  const secretary = loggedInUser || { name: 'Secretary', role: 'secretary', campus: 'JIPAS 1' } as any;
  const [activeTab, setActiveTab] = useState<SecretaryActiveTab>('fee_collection');
  const [selectedPaymentIds, setSelectedPaymentIds] = useState<Set<string>>(new Set());
  const [isBatchPrintModalOpen, setIsBatchPrintModalOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Secretaries are restricted strictly to their assigned campus established during account creation
  const selectedCampus: 'General' | 'JIPAS 1' | 'JIPAS 2' = (secretary?.campus as any) || 'JIPAS 1';

  const students = useMemo(() => {
    const campusFiltered = filterStudentsByCampus(propStudents, selectedCampus);
    return campusFiltered.filter(s => {
      const status = (s.status || '').toLowerCase().trim();
      // Strictly exclude students with status other than 'Enrolled' / 'Active'
      if (['graduated', 'prospective', 'transferred', 'withdrawn', 'inactive', 'pending', 'archived'].includes(status)) {
        return false;
      }
      return status === 'enrolled' || status === 'active' || !s.status;
    });
  }, [propStudents, selectedCampus]);

  const bills = useMemo(() => {
    const campusBills = filterBillsByCampus(propBills, propStudents, selectedCampus);
    const enrolledStudentIds = new Set(students.map(s => s.id));
    const enrolledAdmissionNos = new Set(students.map(s => s.admissionNo));
    return campusBills.filter(b => enrolledStudentIds.has(b.studentId) || enrolledAdmissionNos.has(b.admissionNo));
  }, [propBills, propStudents, selectedCampus, students]);

  const payments = useMemo(() => {
    const campusPayments = filterPaymentsByCampus(propPayments, propStudents, selectedCampus);
    const enrolledStudentIds = new Set(students.map(s => s.id));
    const enrolledAdmissionNos = new Set(students.map(s => s.admissionNo));
    return campusPayments.filter(p => enrolledStudentIds.has(p.studentId) || enrolledAdmissionNos.has(p.admissionNo));
  }, [propPayments, propStudents, selectedCampus, students]);

  const [rawExpenses, setExpenses] = useState<SchoolExpenseRecord[]>(() => getStoredExpenses());
  const expenses = useMemo(() => {
    return filterExpensesByCampus(rawExpenses, selectedCampus);
  }, [rawExpenses, selectedCampus]);

  const [rawSummaries, setSummaries] = useState<SecretaryDailySummary[]>(() => getStoredSecretarySummaries());
  const summaries = useMemo(() => {
    return filterSummariesByCampus(rawSummaries, selectedCampus);
  }, [rawSummaries, selectedCampus]);

  // Global Portal Search States
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [showGlobalSearchModal, setShowGlobalSearchModal] = useState(false);

  // Stats for campus
  const campusStudents = useMemo(() => students.filter(s => s.campus === selectedCampus), [students, selectedCampus]);
  const campusBills = useMemo(() => bills.filter(b => b.campus === selectedCampus), [bills, selectedCampus]);

  const campusClassStats = useMemo(() => {
    const classMap = new Map<string, { enrollment: number; totalDue: number }>();
    campusStudents.forEach(s => {
      const cls = s.className || 'Unknown';
      const stats = classMap.get(cls) || { enrollment: 0, totalDue: 0 };
      stats.enrollment += 1;
      classMap.set(cls, stats);
    });
    
    campusBills.forEach(b => {
      const cls = b.className || 'Unknown';
      const stats = classMap.get(cls) || { enrollment: 0, totalDue: 0 };
      stats.totalDue += (b.balance || 0);
      classMap.set(cls, stats);
    });
    
    return Array.from(classMap.entries()).map(([className, data]) => ({ className, ...data })).sort((a,b) => a.className.localeCompare(b.className));
  }, [campusStudents, campusBills]);

  useEffect(() => {
    const handleExitToDashboard = () => {
      setActiveTab('daily_records');
    };
    window.addEventListener('jipas_exit_to_dashboard', handleExitToDashboard);
    return () => window.removeEventListener('jipas_exit_to_dashboard', handleExitToDashboard);
  }, []);

  const globalSearchResults = useMemo(() => {
    const q = globalSearchQuery.trim().toLowerCase();
    if (!q) return { students: [], payments: [], expenses: [], bills: [], totalCount: 0 };

    const matchedStudents = students.filter(s => 
      s.fullName?.toLowerCase().includes(q) ||
      s.admissionNo?.toLowerCase().includes(q) ||
      s.className?.toLowerCase().includes(q) ||
      s.parentName?.toLowerCase().includes(q) ||
      s.parentPhone?.toLowerCase().includes(q)
    ).slice(0, 6);

    const matchedPayments = payments.filter(p =>
      p.receiptNo?.toLowerCase().includes(q) ||
      p.studentName?.toLowerCase().includes(q) ||
      p.admissionNo?.toLowerCase().includes(q) ||
      p.referenceNo?.toLowerCase().includes(q) ||
      p.method?.toLowerCase().includes(q)
    ).slice(0, 6);

    const matchedExpenses = expenses.filter(e =>
      e.title?.toLowerCase().includes(q) ||
      e.vendorPayee?.toLowerCase().includes(q) ||
      e.category?.toLowerCase().includes(q) ||
      e.voucherNo?.toLowerCase().includes(q) ||
      e.referenceNo?.toLowerCase().includes(q)
    ).slice(0, 6);

    const matchedBills = bills.filter(b =>
      b.studentName?.toLowerCase().includes(q) ||
      b.admissionNo?.toLowerCase().includes(q) ||
      b.className?.toLowerCase().includes(q)
    ).slice(0, 6);

    return {
      students: matchedStudents,
      payments: matchedPayments,
      expenses: matchedExpenses,
      bills: matchedBills,
      totalCount: matchedStudents.length + matchedPayments.length + matchedExpenses.length + matchedBills.length
    };
  }, [globalSearchQuery, students, payments, expenses, bills]);

  // Enroll New Student State
  const [enrollmentActiveTab, setEnrollmentActiveTab] = useState<'form' | 'submissions'>('form');
  const [enrollLastName, setEnrollLastName] = useState('');
  const [enrollOtherNames, setEnrollOtherNames] = useState('');
  const [enrollFullName, setEnrollFullName] = useState('');
  const [enrollGender, setEnrollGender] = useState<'Male' | 'Female'>('Male');
  const [enrollDob, setEnrollDob] = useState('2020-05-15');
  const [enrollAdmissionDate, setEnrollAdmissionDate] = useState(new Date().toISOString().split('T')[0]);
  const [enrollDepartment, setEnrollDepartment] = useState('Primary School');
  const [enrollClassName, setEnrollClassName] = useState('Basic 1');
  const [enrollCourse, setEnrollCourse] = useState('Science (General)');
  const [enrollLevel, setEnrollLevel] = useState<'1' | '2' | '3'>('1');
  const [enrollElectives, setEnrollElectives] = useState<string[]>([]);
  const [enrollHouse, setEnrollHouse] = useState('Blue');
  const [enrollCampus, setEnrollCampus] = useState<'JIPAS 1' | 'JIPAS 2'>(secretary.campus || 'JIPAS 1');
  const [enrollNationality, setEnrollNationality] = useState('Ghanaian');
  const [enrollBloodGroup, setEnrollBloodGroup] = useState('O+');
  const [enrollParentName, setEnrollParentName] = useState('');
  const [enrollParentPhone, setEnrollParentPhone] = useState('');
  const [enrollPhoto, setEnrollPhoto] = useState('');
  const [enrollNotes, setEnrollNotes] = useState('');
  const [isSubmittingEnrollment, setIsSubmittingEnrollment] = useState(false);
  const [enrollmentToast, setEnrollmentToast] = useState<string | null>(null);

  // IndexedDB Auto-save Student Creation Draft Integration
  const secretaryDraftValues = useMemo<StudentFormDraftData>(() => ({
    fullName: [enrollLastName.trim(), enrollOtherNames.trim()].filter(Boolean).join(' ') || enrollFullName,
    lastName: enrollLastName,
    otherNames: enrollOtherNames,
    gender: enrollGender,
    dob: enrollDob,
    admissionDate: enrollAdmissionDate,
    department: enrollDepartment,
    className: enrollClassName,
    course: enrollCourse,
    level: enrollLevel,
    electives: enrollElectives,
    house: enrollHouse,
    campus: enrollCampus,
    parentName: enrollParentName,
    parentPhone: enrollParentPhone,
    photo: enrollPhoto
  }), [enrollLastName, enrollOtherNames, enrollFullName, enrollGender, enrollDob, enrollAdmissionDate, enrollDepartment, enrollClassName, enrollCourse, enrollLevel, enrollElectives, enrollHouse, enrollCampus, enrollParentName, enrollParentPhone, enrollPhoto]);

  const applySecretaryDraftToForm = (draft: StudentFormDraftData) => {
    if (draft.lastName !== undefined) setEnrollLastName(draft.lastName);
    if (draft.otherNames !== undefined) setEnrollOtherNames(draft.otherNames);
    if (draft.fullName !== undefined) {
      setEnrollFullName(draft.fullName);
      if (!draft.lastName && !draft.otherNames) {
        const parts = draft.fullName.trim().split(/\s+/);
        setEnrollLastName(parts[0] || '');
        setEnrollOtherNames(parts.slice(1).join(' '));
      }
    }
    if (draft.gender !== undefined) setEnrollGender(draft.gender);
    if (draft.dob !== undefined) setEnrollDob(draft.dob);
    if (draft.admissionDate !== undefined) setEnrollAdmissionDate(draft.admissionDate);
    if (draft.department !== undefined) setEnrollDepartment(draft.department);
    if (draft.className !== undefined) setEnrollClassName(draft.className);
    if (draft.course !== undefined) setEnrollCourse(draft.course);
    if (draft.level !== undefined) setEnrollLevel(draft.level);
    if (draft.electives !== undefined) setEnrollElectives(draft.electives);
    if (draft.house !== undefined) setEnrollHouse(draft.house);
    if (draft.campus !== undefined) setEnrollCampus(draft.campus as any);
    if (draft.parentName !== undefined) setEnrollParentName(draft.parentName);
    if (draft.parentPhone !== undefined) setEnrollParentPhone(draft.parentPhone);
    if (draft.photo !== undefined) setEnrollPhoto(draft.photo);
  };

  const resetSecretaryEnrollmentForm = () => {
    setEnrollLastName('');
    setEnrollOtherNames('');
    setEnrollFullName('');
    setEnrollGender('Male');
    setEnrollDob('2020-05-15');
    setEnrollAdmissionDate(new Date().toISOString().split('T')[0]);
    setEnrollDepartment('Primary School');
    setEnrollClassName('Basic 1');
    setEnrollCourse('Science (General)');
    setEnrollLevel('1');
    setEnrollElectives([]);
    setEnrollHouse('Blue');
    setEnrollCampus(secretary.campus || 'JIPAS 1');
    setEnrollParentName('');
    setEnrollParentPhone('');
    setEnrollPhoto('');
    setEnrollNotes('');
  };

  const {
    isDraftRestored: isSecDraftRestored,
    lastSavedAt: secLastSavedAt,
    isSaving: isSecSaving,
    discardDraft: discardSecDraft,
    onSuccessfulSubmission: onSecSuccessfulSubmission
  } = useStudentFormDraft({
    values: secretaryDraftValues,
    setValues: applySecretaryDraftToForm
  });

  // Payment Collections Log states
  const [collectionsSearchQuery, setCollectionsSearchQuery] = useState('');
  const [collectionsFilterDepartment, setCollectionsFilterDepartment] = useState('All');
  const [collectionsFilterClass, setCollectionsFilterClass] = useState('All');
  const [collectionsFilterMethod, setCollectionsFilterMethod] = useState('All');
  const [collectionsFilterDateRange, setCollectionsFilterDateRange] = useState<'All' | 'Today' | 'Yesterday' | 'This Week' | 'This Month' | 'Custom'>('All');
  const [collectionsFilterStartDate, setCollectionsFilterStartDate] = useState('');
  const [collectionsFilterEndDate, setCollectionsFilterEndDate] = useState('');
  const [collectionsFilterPaymentStatus, setCollectionsFilterPaymentStatus] = useState<'All' | 'Completed' | 'Pending'>('All');
  const [collectionsSortBy, setCollectionsSortBy] = useState<'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc' | 'name_asc' | 'class_asc'>('date_desc');

  // Fee Collection State
  const [searchStudentQuery, setSearchStudentQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Mobile Money' | 'Bank Transfer'>('Cash');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [collectedByName, setCollectedByName] = useState(secretary.name || 'Front Desk Secretary');
  const [lastIssuedReceipt, setLastIssuedReceipt] = useState<PaymentRecord | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showA6Receipt, setShowA6Receipt] = useState(false);
  const [isQRVerifierOpen, setIsQRVerifierOpen] = useState(false);
  const [autoPrintTriggered, setAutoPrintTriggered] = useState(false);

  // Automatically trigger browser print dialog when an Official Receipt is generated
  useEffect(() => {
    if (showReceiptModal && lastIssuedReceipt && autoPrintTriggered) {
      // Delay briefly to guarantee complete DOM and styling layout before opening browser print prompt
      const timer = setTimeout(() => {
        try {
          window.print();
        } catch (err) {
          console.warn('[SecretaryPortal] Browser print dialog trigger notice:', err);
        }
        setAutoPrintTriggered(false);
      }, 350);

      return () => clearTimeout(timer);
    }
  }, [showReceiptModal, lastIssuedReceipt, autoPrintTriggered]);

  // Secretary Student Enrollment (Unlocked & Billing Synchronized Immediately)
  const handleSubmitSecretaryEnrollment = async (e: React.FormEvent) => {
    e.preventDefault();
    const studentCombinedName = [enrollLastName.trim().toUpperCase(), enrollOtherNames.trim().toUpperCase()].filter(Boolean).join(' ') || enrollFullName.trim().toUpperCase();
    if (!enrollLastName.trim() || !enrollOtherNames.trim() || !enrollParentPhone.trim()) {
      alert('Please fill out the Student Last Name, Other Names, and Parent Phone number.');
      return;
    }

    setIsSubmittingEnrollment(true);
    try {
      const isShs = (enrollDepartment || '').toLowerCase().includes('senior') || (enrollDepartment || '').toLowerCase().includes('shs');
      const resolvedClassName = isShs ? `${enrollCourse} ${enrollLevel}` : enrollClassName;
      const newStudent: Student = {
        id: `st-enroll-${Date.now()}`,
        name: studentCombinedName,
        fullName: studentCombinedName,
        gender: enrollGender,
        dob: enrollDob,
        admissionDate: enrollAdmissionDate,
        department: enrollDepartment,
        course: isShs ? enrollCourse : undefined,
        level: isShs ? enrollLevel : undefined,
        electiveSubjects: isShs && enrollElectives.length > 0 ? enrollElectives : undefined,
        className: resolvedClassName,
        rollNo: String(students.filter(s => s.className === resolvedClassName).length + 1),
        house: enrollHouse,
        campus: enrollCampus,
        nationality: enrollNationality || 'Ghanaian',
        bloodGroup: enrollBloodGroup || 'O+',
        parentName: enrollParentName.trim() || 'Parent',
        parentPhone: enrollParentPhone.trim(),
        admissionNo: generateUniqueAdmissionNo(students),
        academicYear: '2026/2027',
        term: 'Term 1',
        isCurrent: true,
        enrollmentDate: enrollAdmissionDate || new Date().toISOString().split('T')[0],
        photo: enrollPhoto || (enrollGender === 'Male' 
          ? 'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=150&auto=format&fit=crop&q=80'
          : 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=150&auto=format&fit=crop&q=80'),
        status: 'Active',
        approvalStatus: 'Approved',
        isApproved: true,
        enrolledBy: `${secretary.name} (Secretary)`,
        submissionDate: new Date().toISOString().split('T')[0]
      };

      // Save student to Supabase database for cross-device synchronization
      await saveStudent(newStudent);

      // Automatically create & synchronize customized terminal billing schedule
      const existingBills = getStoredBills();
      const newBill: StudentBill = {
        id: `bill-${newStudent.id}-${Date.now()}`,
        studentId: newStudent.id,
        studentName: newStudent.fullName,
        admissionNo: newStudent.admissionNo,
        className: newStudent.className,
        academicYear: newStudent.academicYear || '2025/2026',
        term: newStudent.term || getStoredSettings().activeTerm || 'First Term',
        items: [
          { name: 'Tuition & Terminal Instruction Fee', amount: 1500 },
          { name: 'Admission Fee', amount: 250 },
          { name: 'Development Levy', amount: 100 },
          { name: 'Examination Fee', amount: 75 }
        ],
        subTotal: 1925,
        arrears: 0,
        discount: 0,
        payable: 1925,
        paid: 0,
        balance: 1925,
        status: 'Unpaid',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        dateIssued: new Date().toISOString().split('T')[0]
      };
      const updatedBills = [newBill, ...existingBills];
      saveStoredBills(updatedBills);
      await saveBill(newBill);
      if (onUpdateBills) {
        onUpdateBills(updatedBills);
      }

      if (onAddStudent) {
        onAddStudent(newStudent);
      }

      setEnrollmentToast(`Student "${newStudent.fullName}" successfully enrolled! Profile unlocked and billing synchronized.`);
      
      // Reset form & clear draft from IndexedDB
      await onSecSuccessfulSubmission(resetSecretaryEnrollmentForm);
      setEnrollmentActiveTab('submissions');
      setTimeout(() => setEnrollmentToast(null), 5000);
    } catch (err: any) {
      console.error('Failed to submit student enrollment (DEBUG):', err);
      const errorMessage = err?.message || JSON.stringify(err) || 'Please check your connection and try again.';
      alert(`Failed to submit enrollment: ${errorMessage}`);
    } finally {
      setIsSubmittingEnrollment(false);
    }
  };

  // Hierarchical Filter States for Fee Payment
  const [paymentDept, setPaymentDept] = useState<string>('All');
  const [customDeptInput, setCustomDeptInput] = useState<string>('');
  const [paymentClass, setPaymentClass] = useState<string>('All');
  const [studentRosterSearch, setStudentRosterSearch] = useState<string>('');

  // Extract departments from stored data and student records
  const availableDepartments = useMemo(() => {
    const stored = getStoredDepartments().map(d => d.name);
    const fromStudents = students.map(s => s.department).filter(Boolean);
    const list = Array.from(new Set([...stored, ...fromStudents]));
    return list.length > 0 ? list : ['Pre School', 'Primary School', 'Junior High School', 'Senior High School'];
  }, [students]);

  const getClassesForDepartment = (dept: string) => {
    const lower = (dept || '').toLowerCase();
    const storedClasses = getStoredClasses();
    const matchingStored = storedClasses.filter(c => {
      const cDept = (c.department || (c as any).departmentName || '').toLowerCase();
      return cDept.includes(lower) || lower.includes(cDept);
    }).map(c => c.name);

    if (matchingStored.length > 0) {
      return Array.from(new Set(matchingStored));
    }

    if (lower.includes('primary')) {
      return ['Basic 1', 'Basic 2', 'Basic 3', 'Basic 4', 'Basic 5', 'Basic 6'];
    } else if (lower.includes('junior') || lower.includes('jhs')) {
      return ['JHS 1', 'JHS 2', 'JHS 3'];
    } else if (lower.includes('senior') || lower.includes('shs')) {
      return ['SHS 1', 'SHS 2', 'SHS 3'];
    } else if (lower.includes('pre') || lower.includes('nursery') || lower.includes('kg') || lower.includes('creche')) {
      return ['Creche', 'Nursery 1', 'Nursery 2', 'KG 1', 'KG 2'];
    }
    return ['Basic 1', 'Basic 2', 'Basic 3'];
  };

  const getAdminClassesForDept = (dept: string) => {
    const lower = (dept || '').toLowerCase();
    if (lower.includes('pre') || lower.includes('nursery') || lower.includes('kindergarten') || lower.includes('kg') || lower.includes('creche')) {
      return ['Creche', 'Nursery 1', 'Nursery 2', 'KG 1', 'KG 2'];
    }
    if (lower.includes('junior') || lower.includes('jhs')) {
      return ['JHS 1', 'JHS 2', 'JHS 3'];
    }
    if (lower.includes('senior') || lower.includes('shs')) {
      return ['SHS 1', 'SHS 2', 'SHS 3', 'Science 1', 'General Arts 1', 'Business 1', 'Home Economics 1', 'Visual Arts 1', 'Agricultural Science 1'];
    }
    return ['Basic 1', 'Basic 2', 'Basic 3', 'Basic 4', 'Basic 5', 'Basic 6'];
  };

  const effectiveShsCourses = useMemo(() => {
    const list = (courses || []).filter(c => {
      const d = (c.department || '').toLowerCase();
      return d.includes('senior') || d.includes('shs');
    });
    return list.length > 0 ? list : INITIAL_SHS_COURSES;
  }, [courses]);

  const getAvailableElectives = (courseName: string) => {
    const allCourses = [...effectiveShsCourses, ...(courses || [])];
    const match = allCourses.find(c =>
      (c.name || '').toLowerCase() === (courseName || '').toLowerCase() ||
      (c.name || '').toLowerCase().includes((courseName || '').toLowerCase()) ||
      (courseName || '').toLowerCase().includes((c.name || '').toLowerCase())
    );
    return match?.electiveSubjects || [];
  };

  const enrollmentAvailableClasses = useMemo(() => {
    return getAdminClassesForDept(enrollDepartment);
  }, [enrollDepartment]);

  const handleEnrollDepartmentChange = (dept: string) => {
    setEnrollDepartment(dept);
    setEnrollElectives([]);
    if ((dept || '').toLowerCase().includes('senior') || (dept || '').toLowerCase().includes('shs')) {
      const defaultCourse = effectiveShsCourses[0]?.name || 'Science (General)';
      setEnrollCourse(defaultCourse);
      setEnrollClassName(`${defaultCourse} ${enrollLevel}`);
    } else {
      const classesForDept = getAdminClassesForDept(dept);
      if (classesForDept.length > 0) {
        setEnrollClassName(classesForDept[0]);
      }
    }
  };

  // Extract classes (filtered by selected department if not 'All')
  const availableClasses = useMemo(() => {
    const allStoredClasses = getStoredClasses();
    const effectiveDept = customDeptInput.trim() || paymentDept;
    
    if (effectiveDept && effectiveDept !== 'All') {
      const matchingStored = allStoredClasses.filter(c => {
        const deptItem = getStoredDepartments().find(d => d.name === effectiveDept || d.name === c.department || d.id === (c as any).departmentId);
        return (c.department && (c.department || '').toLowerCase() === (effectiveDept || '').toLowerCase()) ||
               (deptItem && (c as any).departmentId === deptItem.id) ||
               ((c as any).departmentName === effectiveDept);
      }).map(c => c.name);

      const matchingFromStudents = students
        .filter(s => (s.department && (s.department || '').toLowerCase() === (effectiveDept || '').toLowerCase()))
        .map(s => s.currentClass || s.className)
        .filter(Boolean);

      let classList = Array.from(new Set([...matchingStored, ...matchingFromStudents]));

      if (classList.length === 0) {
        const lower = effectiveDept.toLowerCase();
        if (lower.includes('primary')) {
          classList = ['Basic 1', 'Basic 2', 'Basic 3', 'Basic 4', 'Basic 5', 'Basic 6'];
        } else if (lower.includes('junior') || lower.includes('jhs')) {
          classList = ['JHS 1', 'JHS 2', 'JHS 3'];
        } else if (lower.includes('pre') || lower.includes('nursery') || lower.includes('creche') || lower.includes('kg')) {
          classList = ['Creche', 'Nursery 1', 'Nursery 2', 'KG 1', 'KG 2'];
        } else if (lower.includes('senior') || lower.includes('shs')) {
          classList = ['SHS 1', 'SHS 2', 'SHS 3'];
        }
      }

      if (classList.length > 0) return classList;
    }

    const allStudentClasses = students.map(s => s.currentClass || s.className).filter(Boolean);
    return Array.from(new Set([...allStoredClasses.map(c => c.name), ...allStudentClasses]));
  }, [students, paymentDept, customDeptInput]);

  // Filtered students for fee payment based on department, class, and name search
  const filteredStudentsForPayment = useMemo(() => {
    const effectiveDept = customDeptInput.trim() || paymentDept;

    return students.filter(st => {
      // Department filter
      if (effectiveDept && effectiveDept !== 'All') {
        const deptMatches = 
          (st.department && st.department.toLowerCase().includes(effectiveDept.toLowerCase())) ||
          (effectiveDept.toLowerCase().includes('primary') && (st.currentClass || st.className)?.toLowerCase().includes('basic')) ||
          (effectiveDept.toLowerCase().includes('junior') && (st.currentClass || st.className)?.toLowerCase().includes('jhs')) ||
          (effectiveDept.toLowerCase().includes('pre') && ((st.currentClass || st.className)?.toLowerCase().includes('kg') || (st.currentClass || st.className)?.toLowerCase().includes('nursery') || (st.currentClass || st.className)?.toLowerCase().includes('creche'))) ||
          (effectiveDept.toLowerCase().includes('senior') && (st.currentClass || st.className)?.toLowerCase().includes('shs'));
        if (!deptMatches) return false;
      }

      // Class level filter
      if (paymentClass !== 'All') {
        if ((st.currentClass || st.className) !== paymentClass) return false;
      }

      // Search query (search students by name, admission no, or roll no)
      if (studentRosterSearch.trim()) {
        const query = studentRosterSearch.toLowerCase();
        const matchesName = (st.name || st.fullName || '').toLowerCase().includes(query);
        const matchesAdm = (st.admissionNo || '').toLowerCase().includes(query);
        const matchesRoll = (st.rollNo || '').toLowerCase().includes(query);
        if (!matchesName && !matchesAdm && !matchesRoll) return false;
      }

      return true;
    });
  }, [students, paymentDept, customDeptInput, paymentClass, studentRosterSearch]);

  const handleStudentSelect = (studentId: string) => {
    const foundStudent = students.find(s => s.id === studentId);
    if (!foundStudent) return;
    setSelectedStudent(foundStudent);
    
    const studentBills = bills.filter(b => b.studentId === studentId);
    const totalBilled = addMoney(...studentBills.map(b => b.payable ?? b.totalAmount ?? 0));
    const studentPayments = payments.filter(p => p.studentId === studentId && p.status === 'Completed');
    const totalPaid = addMoney(...studentPayments.map(p => p.amount ?? p.paid ?? 0));
    const arrears = Math.max(0, subtractMoney(totalBilled, totalPaid));

    if (arrears > 0) {
      setPaymentAmount(arrears.toString());
    } else {
      setPaymentAmount('715');
    }
  };

  // Daily Handover State
  const [handoverNotes, setHandoverNotes] = useState('');
  const [isHandoverSubmitted, setIsHandoverSubmitted] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Filtered student list for search
  const filteredStudents = useMemo(() => {
    if (!searchStudentQuery.trim()) return [];
    const query = searchStudentQuery.toLowerCase();
    return students.filter(s => 
      (s.name || s.fullName || '').toLowerCase().includes(query) ||
      (s.admissionNo || '').toLowerCase().includes(query) ||
      ((s.currentClass || s.className || '').toLowerCase().includes(query)) ||
      (s.parentPhone && s.parentPhone.includes(query))
    ).slice(0, 8);
  }, [students, searchStudentQuery]);

  // Selected student's financial overview
  const studentFinancials = useMemo(() => {
    if (!selectedStudent) return null;
    const studentBills = bills.filter(b => b.studentId === selectedStudent.id);
    const totalBilled = addMoney(...studentBills.map(b => b.payable ?? b.totalAmount ?? 0));
    const studentPayments = payments.filter(p => p.studentId === selectedStudent.id && p.status !== 'Rejected');
    const totalPaid = addMoney(...studentPayments.map(p => p.amount ?? p.paid ?? 0));
    const outstandingArrears = Math.max(0, subtractMoney(totalBilled, totalPaid));

    return {
      bills: studentBills,
      payments: studentPayments,
      totalBilled,
      totalPaid,
      outstandingArrears
    };
  }, [selectedStudent, bills, payments]);

  // Today's collections by this secretary
  const todaySecretaryPayments = useMemo(() => {
    return payments.filter(p => {
      const isToday = p.date === todayStr;
      const secNameLower = (secretary?.name || '').toLowerCase();
      const isSecretary = p.receivedBy?.toLowerCase().includes('secretary') || 
                          (secNameLower && p.receivedBy?.toLowerCase().includes(secNameLower)) ||
                          p.collectorRole === 'secretary';
      return isToday && isSecretary;
    });
  }, [payments, todayStr, secretary?.name]);

  const totalFeesCollectedToday = useMemo(() => {
    return addMoney(...todaySecretaryPayments.map(p => p.amount ?? p.paid ?? 0));
  }, [todaySecretaryPayments]);

  const collectionsAvailableDepartments = useMemo(() => {
    return ['All', ...availableDepartments];
  }, [availableDepartments]);

  // Financial Dashboard Totals for Secretary (in CFA)
  const totalCollections = useMemo(() => addMoney(...bills.map(b => b.paid || 0)), [bills]);
  const totalOutstanding = useMemo(() => addMoney(...bills.map(b => b.balance || 0)), [bills]);

  const lastTransactionDate = useMemo(() => {
    if (!payments || payments.length === 0) return 'No collections recorded yet';
    const sorted = [...payments]
      .filter(p => p.date)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const latestDate = sorted[0]?.date;
    if (!latestDate) return 'No collections recorded yet';
    try {
      return new Date(latestDate).toLocaleDateString('en-GB', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return latestDate;
    }
  }, [payments]);

  // Group bills by class for the dashboard bar chart
  const barDataByClass = useMemo(() => {
    const groups: { [className: string]: { class: string; collected: number; outstanding: number } } = {};
    bills.forEach(b => {
      const cls = b.className || 'Unknown';
      if (!groups[cls]) {
        groups[cls] = { class: cls, collected: 0, outstanding: 0 };
      }
      groups[cls].collected = addMoney(groups[cls].collected, b.paid || 0);
      groups[cls].outstanding = addMoney(groups[cls].outstanding, b.balance || 0);
    });
    // Return top 6-8 classes to prevent overcrowding in the visual chart
    return Object.values(groups).slice(0, 6);
  }, [bills]);

  const collectionsAvailableClasses = useMemo(() => {
    return ['All', ...availableClasses];
  }, [availableClasses]);

  const filteredCollectionsPayments = useMemo(() => {
    return payments
      .filter(p => {
        // Search query
        const q = collectionsSearchQuery.trim().toLowerCase();
        const matchesQuery = !q || 
          (p.studentName || '').toLowerCase().includes(q) ||
          (p.admissionNo || '').toLowerCase().includes(q) ||
          (p.receiptNo && (p.receiptNo || '').toLowerCase().includes(q));

        if (!matchesQuery) return false;

        // Department filter
        if (collectionsFilterDepartment !== 'All') {
          const student = students.find(s => s.id === p.studentId || s.admissionNo === p.admissionNo);
          const dept = p.department || student?.department || 'General';
          if ((dept || '').toLowerCase() !== (collectionsFilterDepartment || '').toLowerCase()) return false;
        }

        // Class filter
        if (collectionsFilterClass !== 'All') {
          if ((p.className || '').toLowerCase() !== (collectionsFilterClass || '').toLowerCase()) return false;
        }

        // Method filter
        if (collectionsFilterMethod !== 'All') {
          if (p.method && (p.method || '').toLowerCase() !== (collectionsFilterMethod || '').toLowerCase()) return false;
          if (p.paymentMethod && (p.paymentMethod || '').toLowerCase() !== (collectionsFilterMethod || '').toLowerCase()) return false;
        }

        // Payment status filter
        if (collectionsFilterPaymentStatus !== 'All') {
          const statusValue = p.status || 'Completed';
          if ((statusValue || '').toLowerCase() !== (collectionsFilterPaymentStatus || '').toLowerCase()) return false;
        }

        // Date range filter
        if (collectionsFilterDateRange !== 'All') {
          const pDate = new Date(p.date);
          const today = new Date();
          const dToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
          const dPayment = new Date(pDate.getFullYear(), pDate.getMonth(), pDate.getDate());

          if (collectionsFilterDateRange === 'Today') {
            if (dPayment.getTime() !== dToday.getTime()) return false;
          } else if (collectionsFilterDateRange === 'Yesterday') {
            const dYesterday = new Date(dToday);
            dYesterday.setDate(dYesterday.getDate() - 1);
            if (dPayment.getTime() !== dYesterday.getTime()) return false;
          } else if (collectionsFilterDateRange === 'This Week') {
            const oneWeekAgo = new Date(dToday);
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            if (dPayment.getTime() < oneWeekAgo.getTime() || dPayment.getTime() > dToday.getTime()) return false;
          } else if (collectionsFilterDateRange === 'This Month') {
            if (pDate.getFullYear() !== today.getFullYear() || pDate.getMonth() !== today.getMonth()) return false;
          } else if (collectionsFilterDateRange === 'Custom') {
            if (collectionsFilterStartDate) {
              const start = new Date(collectionsFilterStartDate);
              const dStart = new Date(start.getFullYear(), start.getMonth(), start.getDate());
              if (dPayment.getTime() < dStart.getTime()) return false;
            }
            if (collectionsFilterEndDate) {
              const end = new Date(collectionsFilterEndDate);
              const dEnd = new Date(end.getFullYear(), end.getMonth(), end.getDate());
              if (dPayment.getTime() > dEnd.getTime()) return false;
            }
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (collectionsSortBy === 'date_desc') return new Date(b.date).getTime() - new Date(a.date).getTime();
        if (collectionsSortBy === 'date_asc') return new Date(a.date).getTime() - new Date(b.date).getTime();
        if (collectionsSortBy === 'amount_desc') return (b.amount || b.paid) - (a.amount || a.paid);
        if (collectionsSortBy === 'amount_asc') return (a.amount || a.paid) - (b.amount || b.paid);
        if (collectionsSortBy === 'name_asc') return a.studentName.localeCompare(b.studentName);
        if (collectionsSortBy === 'class_asc') return a.className.localeCompare(b.className);
        return 0;
      });
  }, [payments, students, collectionsSearchQuery, collectionsFilterDepartment, collectionsFilterClass, collectionsFilterMethod, collectionsFilterDateRange, collectionsFilterStartDate, collectionsFilterEndDate, collectionsFilterPaymentStatus, collectionsSortBy]);

  // Today's expenses logged by this secretary
  const todaySecretaryExpenses = useMemo(() => {
    return expenses.filter(e => {
      const isToday = e.date === todayStr;
      const secNameLower = (secretary?.name || '').toLowerCase();
      const isSecretary = e.recorderRole === 'secretary' || (secNameLower && e.recordedBy?.toLowerCase().includes(secNameLower));
      return isToday && isSecretary && e.status !== 'Void';
    });
  }, [expenses, todayStr, secretary?.name]);

  const totalExpensesLoggedToday = useMemo(() => {
    return addMoney(...todaySecretaryExpenses.map(e => e.amount || 0));
  }, [todaySecretaryExpenses]);

  // Net Cash on Hand
  const netCashOnHand = useMemo(() => {
    return subtractMoney(totalFeesCollectedToday, totalExpensesLoggedToday);
  }, [totalFeesCollectedToday, totalExpensesLoggedToday]);

  // Handle Recording Student Fee Payment
  const handleProcessPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) {
      alert('Please search and select a student first.');
      return;
    }

    const amountNum = parseFloat(paymentAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('Please enter a valid payment amount greater than 0.');
      return;
    }

    const receiptNo = generateNextReceiptSerialNumber({ academicYear: getStoredSettings().activeAcademicYear });
    const newPayment: PaymentRecord = {
      id: `pmt-sec-${Date.now()}`,
      receiptNo,
      studentId: selectedStudent.id,
      studentName: selectedStudent.name || selectedStudent.fullName || 'Student',
      admissionNo: selectedStudent.admissionNo,
      className: selectedStudent.currentClass || selectedStudent.className || 'Basic 1',
      classAssigned: selectedStudent.currentClass || selectedStudent.className,
      amount: amountNum,
      paid: amountNum,
      method: (paymentMethod as any) || 'Cash',
      date: todayStr,
      paymentMethod,
      referenceNo: paymentReference.trim() || `SEC-${Date.now().toString().slice(-6)}`,
      receivedBy: `${secretary.name} (Secretary Desk)`,
      collectorRole: 'secretary',
      status: 'Completed',
      notes: paymentNotes.trim() || 'Paid at Secretarial Front Desk',
      academicYear: getStoredSettings().activeAcademicYear || '2025-2026',
      term: getStoredSettings().activeTerm || 'First Term'
    };

    onAddPayment(newPayment);
    setLastIssuedReceipt(newPayment);
    setShowReceiptModal(true);
    setAutoPrintTriggered(true);
    showToast(`Official Receipt #${receiptNo} generated. Print dialog triggered automatically.`);

    // Reset Form
    setPaymentAmount('');
    setPaymentReference('');
    setPaymentNotes('');
  };

  // Submit Daily Cash Handover to Bursar
  const handleSubmitDailyHandover = () => {
    const newSummary: SecretaryDailySummary = {
      id: `sum-${todayStr}-${Date.now().toString().slice(-4)}`,
      date: todayStr,
      secretaryId: secretary.id,
      secretaryName: secretary.name,
      totalFeesCollected: totalFeesCollectedToday,
      totalExpensesLogged: totalExpensesLoggedToday,
      netCashOnHand,
      feesCount: todaySecretaryPayments.length,
      expensesCount: todaySecretaryExpenses.length,
      isReconciled: false,
      notes: handoverNotes.trim() || 'Daily end-of-day cash handover to Main Bursary.',
      createdAt: new Date().toISOString()
    };

    const updated = [newSummary, ...summaries.filter(s => s.date !== todayStr || s.secretaryId !== secretary.id)];
    setSummaries(updated);
    saveStoredSecretarySummaries(updated);
    setIsHandoverSubmitted(true);
    showToast('Daily cash handover submitted for Bursar reconciliation.');
  };

  // Print Receipt using CSS-only printable layout and browser print dialog
  const handlePrintReceipt = (rec: PaymentRecord) => {
    setLastIssuedReceipt(rec);
    setShowReceiptModal(true);
    setAutoPrintTriggered(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row text-slate-900 font-sans relative w-full">
      {/* Modern Collapsible Sidebar */}
      <SecretarySidebar
        activeTab={activeTab as SecretaryTabType}
        onSelectTab={(tab) => setActiveTab(tab as SecretaryActiveTab)}
        collectionsCount={payments.length}
        studentsCount={students.length}
        overdueCount={bills.filter(b => (b.balance || 0) > 0).length}
        expensesCount={expenses.length}
        secretary={secretary}
      />

      {/* Main Content Workspace Panel */}
      <div className={`flex-1 p-4 sm:p-6 lg:p-8 space-y-6 overflow-y-auto max-w-full ${showReceiptModal ? 'print:hidden' : ''}`}>
        {/* Toast Notification message */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs font-bold border border-slate-700 animate-bounce">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Active Tab Minimal Header */}
        {(() => {
          const tabMeta = ({
            fee_collection: { title: 'Collect School Fees', subtitle: 'Process student payments & generate instant official receipts', icon: CreditCard, color: 'bg-emerald-600' },
            expenses: { title: 'Record Daily Expenses', subtitle: 'Log petty cash disbursements & petty purchases', icon: Receipt, color: 'bg-rose-600' },
            daily_reconcile: { title: 'Daily Handover & Reconcile', subtitle: 'Balance desk totals & register bursar handover summary', icon: Layers, color: 'bg-indigo-600' },
            students_lookup: { title: 'Student Records & Arrears', subtitle: 'Inspect student bill balances, history, and profiles', icon: BookOpen, color: 'bg-amber-600' },
            bank_deposits: { title: 'Bank Deposits', subtitle: 'Verify bank wire receipts, transfers & slip registers', icon: Building, color: 'bg-emerald-600' },
            enroll_student: { title: 'Enroll New Student', subtitle: 'Enter official admission details & submit for approval', icon: UserPlus, color: 'bg-violet-600' },
            overdue_alerts: { title: 'Overdue Fee Alerts', subtitle: 'Send automated custom reminders via WhatsApp / SMS', icon: AlertTriangle, color: 'bg-red-600' },
            collections_log: { title: 'Payment Collections', subtitle: 'Browse full desk collections logs and audit trails', icon: TrendingUp, color: 'bg-cyan-600' },
            bulk_fee_entry: { title: 'Bulk Fee & Billing Entry', subtitle: 'Batch upload bills or payments for multiple students', icon: Layers, color: 'bg-indigo-600' },
            graduated_batch: { title: 'Graduated Batch (BECE/WASSCE)', subtitle: 'Candidate index numbers, exam types, biodata & placements', icon: GraduationCap, color: 'bg-purple-600' },
            employee_history: { title: 'Employee History (Past Staff)', subtitle: 'Service history, past roles & subjects records', icon: Briefcase, color: 'bg-slate-700' },
            staff_attendance: { title: 'Staff Attendance Scanner', subtitle: 'Scan daily entrance QR code and view attendance status', icon: QrCode, color: 'bg-indigo-600' }
          } as Record<string, { title: string; subtitle: string; icon: React.ElementType; color: string }>)[activeTab] || {
            title: 'Secretary Workspace',
            subtitle: 'Administrative and desk operations',
            icon: Layers,
            color: 'bg-indigo-600'
          };
          const Icon = tabMeta.icon || Layers;
          return (
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl ${tabMeta.color} text-white flex items-center justify-center shadow-md`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-lg sm:text-xl font-black tracking-tight text-slate-900">
                    {tabMeta.title}
                  </h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {tabMeta.subtitle}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {/* Global Portal Search Input */}
                <div className="relative w-48 sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={globalSearchQuery}
                    onChange={(e) => {
                      setGlobalSearchQuery(e.target.value);
                      if (e.target.value.trim()) {
                        setShowGlobalSearchModal(true);
                      }
                    }}
                    onFocus={() => {
                      if (globalSearchQuery.trim()) setShowGlobalSearchModal(true);
                    }}
                    placeholder="Search portal records..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                  />
                  {globalSearchQuery && (
                    <button
                      onClick={() => { setGlobalSearchQuery(''); setShowGlobalSearchModal(false); }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600"
                    >
                      ×
                    </button>
                  )}
                </div>

                <div className="hidden sm:flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab('staff_attendance')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-xs transition cursor-pointer"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Scan Entrance</span>
                  </button>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200">
                    <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Campus: {selectedCampus}</span>
                  </div>
                  <span className="px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200">
                    Secretary: {secretary.name}
                  </span>
                </div>
              </div>
            </div>
          );
        })()}

      {/* Global Search Results Modal */}
      {showGlobalSearchModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-start justify-center pt-20 px-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 animate-scale-in text-slate-900 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Search className="w-5 h-5 text-emerald-600" />
                <h3 className="font-black text-base text-slate-900">
                  Global Search: &ldquo;{globalSearchQuery}&rdquo;
                </h3>
              </div>
              <button
                onClick={() => setShowGlobalSearchModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm cursor-pointer"
              >
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-6">
              {globalSearchResults.totalCount === 0 ? (
                <div className="py-12 text-center text-slate-400 font-medium text-sm">
                  No records found matching &ldquo;{globalSearchQuery}&rdquo;. Try searching for a student name, admission number, receipt number, or expense title.
                </div>
              ) : (
                <>
                  {/* Students Matches */}
                  {globalSearchResults.students.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
                        <span>Students ({globalSearchResults.students.length})</span>
                      </h4>
                      <div className="divide-y divide-slate-100 bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
                        {globalSearchResults.students.map(s => (
                          <div 
                            key={s.id} 
                            onClick={() => {
                              setSelectedStudent(s);
                              setActiveTab('fee_collection');
                              setShowGlobalSearchModal(false);
                            }}
                            className="p-3 hover:bg-emerald-50/50 flex items-center justify-between cursor-pointer transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <img src={s.photo} alt={s.fullName} className="w-9 h-9 rounded-full object-cover border border-slate-200" />
                              <div>
                                <h5 className="font-bold text-slate-900 text-xs">{s.fullName}</h5>
                                <p className="text-[10px] text-slate-500 font-mono">{s.admissionNo} • {s.className}</p>
                              </div>
                            </div>
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-1 rounded-lg">
                              Collect Fees &rarr;
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Payments Matches */}
                  {globalSearchResults.payments.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                        <span>Payment Collections ({globalSearchResults.payments.length})</span>
                      </h4>
                      <div className="divide-y divide-slate-100 bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
                        {globalSearchResults.payments.map(p => (
                          <div 
                            key={p.id}
                            onClick={() => {
                              setActiveTab('collections_log');
                              setCollectionsSearchQuery(p.receiptNo);
                              setShowGlobalSearchModal(false);
                            }}
                            className="p-3 hover:bg-emerald-50/50 flex items-center justify-between cursor-pointer transition-colors text-xs"
                          >
                            <div>
                              <p className="font-mono font-bold text-blue-600">{p.receiptNo} • <span className="text-slate-900">{p.studentName}</span></p>
                              <p className="text-[10px] text-slate-500">{p.date} • {p.method || p.paymentMethod}</p>
                            </div>
                            <span className="font-mono font-black text-emerald-700 text-sm">
                              CFA {(p.amount || p.paid || 0).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Expenses Matches */}
                  {globalSearchResults.expenses.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                        <span>Daily Outflows & Expenses ({globalSearchResults.expenses.length})</span>
                      </h4>
                      <div className="divide-y divide-slate-100 bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
                        {globalSearchResults.expenses.map(e => (
                          <div 
                            key={e.id}
                            onClick={() => {
                              setActiveTab('expenses');
                              setShowGlobalSearchModal(false);
                            }}
                            className="p-3 hover:bg-rose-50/50 flex items-center justify-between cursor-pointer transition-colors text-xs"
                          >
                            <div>
                              <p className="font-bold text-slate-900">{e.title}</p>
                              <p className="text-[10px] text-slate-500 font-mono">{e.voucherNo} • {e.category}</p>
                            </div>
                            <span className="font-mono font-black text-rose-700 text-sm">
                              CFA {(e.amount || 0).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
              <span>Found {globalSearchResults.totalCount} total record(s)</span>
              <button
                onClick={() => setShowGlobalSearchModal(false)}
                className="px-4 py-2 bg-slate-900 text-white font-bold rounded-xl cursor-pointer"
              >
                Close Search
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: COLLECT SCHOOL FEES                                    */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'dashboard' && (
        <SecretaryDashboard 
          students={students}
          payments={payments}
          expenses={expenses}
          bills={bills}
          campus={selectedCampus}
        />
      )}

      {activeTab === 'fee_collection' && (
        <div className="space-y-6">
          {/* Header Card with Hierarchical Filters */}
          <div className="bg-white rounded-3xl shadow-xs border border-slate-200/80 p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="bg-blue-100 text-blue-800 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                    Desk Terminal
                  </span>
                  <span className="text-xs text-slate-400 font-medium">Department & Class Level Hierarchy</span>
                </div>
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                  Student Fee Collection Desk
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Select or enter the academic department, choose the class level, inspect the student roster or search students by name to record front-desk fee payments.
                </p>
              </div>

              {/* Quick Status Pill */}
              <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 px-4 py-2 rounded-2xl">
                <Users className="w-4 h-4 text-blue-600" />
                <div className="text-xs">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Roster In View</span>
                  <span className="font-extrabold text-slate-900">{filteredStudentsForPayment.length} Students</span>
                </div>
              </div>
            </div>

            {/* Hierarchical Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-5">
              {/* 1. Department Filter */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-blue-600" />
                  1. Department Level
                </label>
                <div className="space-y-2">
                  <select
                    value={paymentDept}
                    onChange={(e) => {
                      setPaymentDept(e.target.value);
                      setCustomDeptInput('');
                      setPaymentClass('All');
                    }}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-xs font-bold bg-white text-slate-800 focus:ring-2 focus:ring-blue-500 shadow-2xs"
                  >
                    <option value="All">All Departments</option>
                    {availableDepartments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>

                  <input
                    type="text"
                    placeholder="Or enter custom department..."
                    value={customDeptInput}
                    onChange={(e) => {
                      setCustomDeptInput(e.target.value);
                      if (e.target.value.trim()) {
                        setPaymentDept('Custom');
                      } else {
                        setPaymentDept('All');
                      }
                    }}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 text-slate-700 focus:bg-white focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* 2. Class Level Filter */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                  2. Class Level
                </label>
                <select
                  value={paymentClass}
                  onChange={(e) => setPaymentClass(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-xs font-bold bg-white text-slate-800 focus:ring-2 focus:ring-blue-500 shadow-2xs"
                >
                  <option value="All">All Classes ({availableClasses.length})</option>
                  {availableClasses.map(cls => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>

                {/* Quick Class Pills */}
                <div className="flex flex-wrap gap-1 pt-1 max-h-16 overflow-y-auto">
                  <button
                    type="button"
                    onClick={() => setPaymentClass('All')}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold cursor-pointer transition-colors ${
                      paymentClass === 'All' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    All
                  </button>
                  {availableClasses.slice(0, 5).map(cls => (
                    <button
                      key={cls}
                      type="button"
                      onClick={() => setPaymentClass(cls)}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold cursor-pointer transition-colors ${
                        paymentClass === cls ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {cls}
                    </button>
                  ))}
                  {availableClasses.length > 5 && (
                    <span className="text-[10px] text-slate-400 self-center">+{availableClasses.length - 5} more</span>
                  )}
                </div>
              </div>

              {/* 3. Search Student by Name */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5 text-blue-600" />
                  3. Search Student
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search by student name or ID..."
                    value={studentRosterSearch}
                    onChange={(e) => setStudentRosterSearch(e.target.value)}
                    className="w-full pl-9 pr-8 py-2.5 border border-slate-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-blue-500 shadow-2xs font-medium"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  {studentRosterSearch && (
                    <button
                      type="button"
                      onClick={() => setStudentRosterSearch('')}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 text-xs font-bold"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                  <span>Filtered: <strong>{filteredStudentsForPayment.length}</strong> of {students.length}</span>
                  {(paymentDept !== 'All' || paymentClass !== 'All' || studentRosterSearch) && (
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentDept('All');
                        setCustomDeptInput('');
                        setPaymentClass('All');
                        setStudentRosterSearch('');
                      }}
                      className="text-blue-700 hover:underline font-bold"
                    >
                      Reset Filters
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Main 2-Column Grid: Left = Class Roster Directory, Right = Payment Entry Form */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Student Roster List */}
            <div className="lg:col-span-6 bg-white rounded-3xl shadow-xs border border-slate-200/80 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  <h4 className="text-sm font-black text-slate-900">
                    Class Roster Directory
                  </h4>
                </div>
                <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                  Click student to record payment
                </span>
              </div>

              {filteredStudentsForPayment.length === 0 ? (
                <div className="text-center py-12 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                  <Users className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-700">No students match current filters</p>
                  <p className="text-xs text-slate-500 mt-1">Try selecting a different department, class or clearing the search keyword.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentDept('All');
                      setCustomDeptInput('');
                      setPaymentClass('All');
                      setStudentRosterSearch('');
                    }}
                    className="mt-3 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700"
                  >
                    Clear All Filters
                  </button>
                </div>
              ) : (
                <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
                  {filteredStudentsForPayment.map(st => {
                    const stId = st.id;
                    const studentBills = bills.filter(b => b.studentId === stId);
                    const totalBilled = addMoney(...studentBills.map(b => b.payable ?? b.totalAmount ?? 0));
                    const studentPayments = payments.filter(p => p.studentId === stId && p.status !== 'Rejected');
                    const totalPaid = addMoney(...studentPayments.map(p => p.amount ?? p.paid ?? 0));
                    const balance = Math.max(0, subtractMoney(totalBilled, totalPaid));
                    const isSelected = st.id === selectedStudent?.id;
                    const hasArrears = balance > 0;

                    return (
                      <div
                        key={st.id}
                        onClick={() => handleStudentSelect(st.id)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                            : 'bg-white hover:bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                            isSelected
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {(st.name || st.fullName).slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h5 className="text-xs font-extrabold text-slate-900 truncate">
                                {st.name || st.fullName}
                              </h5>
                              {isSelected && (
                                <span className="text-[9px] bg-blue-600 text-white font-black px-1.5 py-0.2 rounded-sm uppercase">
                                  Selected
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                              <span className="font-mono text-slate-600 font-bold">{st.admissionNo}</span>
                              <span>•</span>
                              <span className="bg-slate-100 text-slate-700 font-semibold px-1.5 py-0.2 rounded">
                                {st.currentClass || st.className}
                              </span>
                              {(st.department) && (
                                <>
                                  <span>•</span>
                                  <span className="text-slate-400 truncate max-w-[100px]">{st.department}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Balance Badge */}
                        <div className="text-right shrink-0">
                          {hasArrears ? (
                            <span className="text-[11px] font-black text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg block">
                              CFA {(balance ?? 0).toFixed(2)}
                              <span className="block text-[9px] font-medium text-rose-500 uppercase">Balance Due</span>
                            </span>
                          ) : (
                            <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg block">
                              ✓ Fully Paid
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right Column: Active Payment Terminal & Form */}
            <div className="lg:col-span-6 space-y-4">
              <div className="bg-white rounded-3xl shadow-xs border border-slate-200/80 p-6 space-y-5">
                <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                  <div>
                    <h4 className="text-base font-black text-slate-900">Payment Details</h4>
                    <p className="text-xs text-slate-500">Selected student billing information</p>
                  </div>
                  {selectedStudent && (
                    <span className="bg-blue-100 text-blue-800 text-[10px] font-black px-2.5 py-1 rounded-full uppercase">
                      {selectedStudent.currentClass || selectedStudent.className}
                    </span>
                  )}
                </div>

                {selectedStudent ? (
                  <form onSubmit={handleProcessPayment} className="space-y-4">
                    {/* Selected Student Banner */}
                    <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-4 rounded-2xl shadow-sm space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[10px] uppercase tracking-wider text-blue-400 font-bold">Selected Student</span>
                          <h4 className="text-base font-black text-white">{selectedStudent.name || selectedStudent.fullName}</h4>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] uppercase text-slate-400 font-medium">Admission ID</span>
                          <p className="text-xs font-mono font-bold text-slate-200">{selectedStudent.admissionNo}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-700/60 text-xs">
                        <div>
                          <span className="text-slate-400 block text-[10px]">Class Level</span>
                          <span className="font-bold text-white">{selectedStudent.currentClass || selectedStudent.className}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Department</span>
                          <span className="font-bold text-white truncate block">{selectedStudent.department || 'General'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Guardian Phone</span>
                          <span className="font-bold text-white">{selectedStudent.parentPhone || 'N/A'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Financial Bill Status Card */}
                    {studentFinancials && (
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <div>
                            <span className="text-slate-500 block text-[10px] uppercase font-bold">Billing Term</span>
                            <span className="font-bold text-slate-800">{selectedStudent.currentClass || selectedStudent.className} • {getStoredSettings().activeAcademicYear || '2026-2027'} ({getStoredSettings().activeTerm || 'First Term'})</span>
                          </div>
                          <div className="text-right">
                            <span className="text-slate-500 block text-[10px] uppercase font-bold">Remaining Arrears</span>
                            <span className="font-mono font-black text-rose-600 text-base">CFA {(studentFinancials.outstandingArrears ?? 0).toFixed(2)}</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200 text-center text-xs">
                          <div className="bg-white p-2 rounded-xl border border-slate-200">
                            <span className="text-[10px] text-slate-400 uppercase block font-bold">Payable</span>
                            <span className="font-bold text-slate-800">CFA {(studentFinancials.totalBilled || 0).toFixed(2)}</span>
                          </div>
                          <div className="bg-white p-2 rounded-xl border border-slate-200">
                            <span className="text-[10px] text-slate-400 uppercase block font-bold">Paid to Date</span>
                            <span className="font-bold text-emerald-600">CFA {(studentFinancials.totalPaid || 0).toFixed(2)}</span>
                          </div>
                          <div className="bg-white p-2 rounded-xl border border-slate-200">
                            <span className="text-[10px] text-slate-400 uppercase block font-bold">Net Balance</span>
                            <span className="font-black text-rose-600">CFA {(studentFinancials.outstandingArrears ?? 0).toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Amount Paid input */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold text-slate-700 uppercase">
                          Amount Paid (CFA) *
                        </label>
                        {studentFinancials && (studentFinancials.outstandingArrears ?? 0) > 0 && (
                          <div className="flex gap-1.5">
                            <button
                              type="button"
                              onClick={() => setPaymentAmount((studentFinancials.outstandingArrears ?? 0).toString())}
                              className="text-[10px] font-black bg-rose-100 hover:bg-rose-200 text-rose-800 px-2 py-0.5 rounded cursor-pointer transition-colors"
                            >
                              Pay Full Balance ({((studentFinancials.outstandingArrears ?? 0)).toFixed(0)} CFA)
                            </button>
                            <button
                              type="button"
                              onClick={() => setPaymentAmount(((studentFinancials.outstandingArrears ?? 0) / 2).toFixed(2))}
                              className="text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded cursor-pointer transition-colors"
                            >
                              50%
                            </button>
                          </div>
                        )}
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl text-base font-black text-emerald-700 bg-white focus:ring-2 focus:ring-blue-500 shadow-2xs"
                        placeholder="0.00"
                      />
                    </div>

                    {/* Payment Method */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Payment Method *
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {([
                          { key: 'Cash', label: 'Cash (Desk)' },
                          { key: 'Mobile Money', label: 'MoMo' },
                          { key: 'Bank Transfer', label: 'Bank Transfer' }
                        ] as const).map(item => (
                          <button
                            key={item.key}
                            type="button"
                            onClick={() => setPaymentMethod(item.key)}
                            className={`py-2 px-1.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer truncate ${
                              paymentMethod === item.key
                                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Transaction Reference */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Transaction Ref / MoMo Txn ID
                      </label>
                      <input
                        type="text"
                        value={paymentReference}
                        onChange={(e) => setPaymentReference(e.target.value)}
                        placeholder="e.g. MOM-44912 or Cash Ref"
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-mono text-xs"
                      />
                    </div>

                    {/* Receipt Notes */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Receipt Notes & Bill Description
                      </label>
                      <input
                        type="text"
                        value={paymentNotes}
                        onChange={(e) => setPaymentNotes(e.target.value)}
                        placeholder="e.g. Tuition fee part-payment for Term 3"
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800"
                      />
                    </div>

                    {/* Collector Info */}
                    <div className="text-[11px] text-slate-500 flex items-center justify-between bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200">
                      <span>Collector Attribution:</span>
                      <span className="font-bold text-slate-800">
                        {secretary.name} (Secretary Desk)
                      </span>
                    </div>

                    {/* Submit Button */}
                    <div className="pt-2">
                      <button
                        type="submit"
                        className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl shadow-lg shadow-emerald-900/20 text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Process Payment & Issue Official Receipt
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="text-center py-12 text-slate-400">
                    <UserIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-xs font-bold">Please select a student from the class roster list to proceed.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: DAILY EXPENSES                                         */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'expenses' && (
        <ExpenseManager
          currentUser={secretary}
          canApprove={false}
          canAdd={true}
          canDelete={true}
          highlightRecorder="secretary"
          onRefreshStats={() => setExpenses(getStoredExpenses())}
        />
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: DAILY HANDOVER & RECONCILIATION                        */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'daily_reconcile' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 space-y-6">
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs space-y-5">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">End-of-Day Cash Handover</h3>
                  <p className="text-xs text-slate-500">Reconcile desk collections and submit cash to Accountant</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2 text-xs">
                  <div className="flex justify-between font-medium">
                    <span className="text-slate-600">Total Student Fees Collected:</span>
                    <span className="font-bold text-emerald-700 font-mono">+ CFA {(totalFeesCollectedToday || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span className="text-slate-600">Total Operational Expenses Logged:</span>
                    <span className="font-bold text-rose-700 font-mono">- CFA {(totalExpensesLoggedToday || 0).toFixed(2)}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-200 flex justify-between font-black text-sm">
                    <span className="text-slate-900">Net Physical Cash to Hand Over:</span>
                    <span className="text-blue-700 font-mono">CFA {(netCashOnHand || 0).toFixed(2)}</span>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1 text-xs">Handover Notes / Discrepancy Remarks</label>
                  <textarea
                    rows={3}
                    value={handoverNotes}
                    onChange={(e) => setHandoverNotes(e.target.value)}
                    placeholder="e.g. CFA 500 cash in envelope handed over to Bursar Kofi Mensah. All receipts verified."
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white"
                  />
                </div>

                <button
                  onClick={handleSubmitDailyHandover}
                  id="btn-submit-secretary-handover"
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold rounded-xl text-xs shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Certify & Submit Daily Handover Summary</span>
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-black text-slate-900 text-xs uppercase tracking-wider">
                  Handover History & Bursar Sign-Off
                </h3>
              </div>

              {summaries.length === 0 ? (
                <div className="p-8 text-center text-slate-400 space-y-1">
                  <Layers className="w-6 h-6 mx-auto text-slate-300 mb-1" />
                  <p className="text-xs font-bold text-slate-600">No Past Handover Summaries</p>
                  <p className="text-[10px]">Submitted summaries for Bursar reconciliation will appear here.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
                  {summaries.map(s => (
                    <div key={s.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-slate-900">{s.date}</span>
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          s.isReconciled 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {s.isReconciled ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          {s.isReconciled ? 'Reconciled by Bursar' : 'Pending Bursar Sign-Off'}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-[11px] font-medium pt-1">
                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase">Fees</span>
                          <span className="font-bold text-emerald-700">CFA {(s.totalFeesCollected || 0).toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase">Expenses</span>
                          <span className="font-bold text-rose-700">CFA {(s.totalExpensesLogged || 0).toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase">Net Cash</span>
                          <span className="font-bold text-blue-700">CFA {(s.netCashOnHand || 0).toFixed(2)}</span>
                        </div>
                      </div>
                      {s.notes && (
                        <p className="text-[11px] text-slate-600 pt-1 border-t border-slate-200">
                          {s.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 4: STUDENTS LOOKUP                                        */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'students_lookup' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-black text-slate-900 text-base">Campus Enrollment & Fees Directory</h3>
              <p className="text-xs text-slate-500">Class-based enrollment and fee balances</p>
            </div>
          </div>

          {/* Campus Stats Table */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
            <h4 className="font-bold text-slate-800 text-xs mb-3 uppercase tracking-wider">Campus Class Summary</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-white text-slate-500 uppercase font-bold text-[10px]">
                    <th className="p-2">Class</th>
                    <th className="p-2 text-center">Enrollment</th>
                    <th className="p-2 text-right">Total Fees Due</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {campusClassStats.map(stat => (
                    <tr key={stat.className} className="hover:bg-slate-100 transition-colors">
                      <td className="p-2 text-slate-900">{stat.className}</td>
                      <td className="p-2 text-center">{stat.enrollment}</td>
                      <td className="p-2 text-right font-mono text-rose-600">{stat.totalDue.toLocaleString()} CFA</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <th className="py-3 px-4">Adm No</th>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4">Class</th>
                  <th className="py-3 px-4">Parent Phone</th>
                  <th className="py-3 px-4 text-right">Fee Arrears</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {students.map(st => {
                  const stBillsFiltered = bills.filter(b => b.studentId === st.id);
                  const stBillsTotal = addMoney(...stBillsFiltered.map(b => b.payable ?? b.totalAmount ?? 0));
                  const stPmtsFiltered = payments.filter(p => p.studentId === st.id && p.status === 'Completed');
                  const stPmtsTotal = addMoney(...stPmtsFiltered.map(p => p.amount ?? p.paid ?? 0));
                  const arrears = Math.max(0, subtractMoney(stBillsTotal, stPmtsTotal));

                  return (
                    <tr key={st.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{st.admissionNo}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedStudent(st);
                            setActiveTab('fee_collection');
                          }}
                          className="hover:text-emerald-600 transition-colors cursor-pointer text-left font-bold"
                        >
                          {st.fullName || st.name}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{st.currentClass}</td>
                      <td className="py-3 px-4 text-slate-600 font-mono">{st.parentPhone || 'N/A'}</td>
                      <td className={`py-3 px-4 text-right font-mono font-black ${arrears > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        CFA {(arrears || 0).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedStudent(st);
                            setActiveTab('fee_collection');
                          }}
                          className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg text-[11px] cursor-pointer"
                        >
                          Collect Fee
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 5: BANK DEPOSITS                                          */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'bank_deposits' && (
        <BankDepositManager userRole="secretary" userName={secretary.name} />
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 6: ENROLL NEW STUDENT                                     */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'enroll_student' && (
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Header Banner */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                    Student Enrollment & Admission
                  </h2>
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase px-2 py-0.5 rounded">
                    Official Registry
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Register new student with automated bill & terminal report generation
                </p>
              </div>
            </div>

            {/* Sub tabs */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold shrink-0">
              <button
                type="button"
                onClick={() => setEnrollmentActiveTab('form')}
                className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  enrollmentActiveTab === 'form'
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200/50'
                    : 'text-slate-500 hover:text-slate-950'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Admission Form</span>
              </button>
              <button
                type="button"
                onClick={() => setEnrollmentActiveTab('submissions')}
                className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  enrollmentActiveTab === 'submissions'
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200/50'
                    : 'text-slate-500 hover:text-slate-950'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Submitted Records ({students.filter(s => s.status === 'Pending' || s.approvalStatus === 'Pending' || s.enrolledBy?.includes(secretary.name)).length})</span>
              </button>
            </div>
          </div>

          {enrollmentToast && (
            <div className="bg-emerald-600 text-white px-4 py-3 rounded-2xl text-xs font-bold flex items-center justify-between shadow-sm animate-fade-in">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{enrollmentToast}</span>
              </span>
              <button onClick={() => setEnrollmentToast(null)} className="text-white hover:text-slate-200 font-black ml-4 cursor-pointer">✕</button>
            </div>
          )}

          {enrollmentActiveTab === 'form' && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-6">
              <DraftStatusBanner
                isDraftRestored={isSecDraftRestored}
                lastSavedAt={secLastSavedAt}
                isSaving={isSecSaving}
                onDiscardDraft={() => discardSecDraft(resetSecretaryEnrollmentForm)}
              />

              <form onSubmit={handleSubmitSecretaryEnrollment} className="space-y-6">
                {/* 1. Student Biodata & Identification */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                  <h3 className="font-bold text-slate-900 uppercase tracking-wider text-xs text-indigo-700 flex items-center gap-2">
                    <UserIcon className="w-4 h-4" />
                    1. Student Biodata & Identification
                  </h3>

                  {/* Photo Uploader */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200">
                    <PhotoUploader
                      currentPhoto={enrollPhoto}
                      onPhotoChange={setEnrollPhoto}
                      entityType="student"
                      gender={enrollGender}
                      label="Student Passport Photograph"
                      size="md"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Last Name / Surname */}
                    <div>
                      <label className="block text-xs font-black text-slate-700 uppercase mb-1">
                        Last Name (Surname) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. MENSAH"
                        value={enrollLastName}
                        onChange={(e) => setEnrollLastName(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold uppercase focus:ring-2 focus:ring-indigo-500 text-xs"
                      />
                    </div>

                    {/* Other Names */}
                    <div>
                      <label className="block text-xs font-black text-slate-700 uppercase mb-1">
                        Other Names (First & Middle) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. KOFI EMMANUEL"
                        value={enrollOtherNames}
                        onChange={(e) => setEnrollOtherNames(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold uppercase focus:ring-2 focus:ring-indigo-500 text-xs"
                      />
                    </div>

                    {/* Gender */}
                    <div>
                      <label className="block text-xs font-black text-slate-700 uppercase mb-1">
                        Gender <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={enrollGender}
                        onChange={(e) => setEnrollGender(e.target.value as 'Male' | 'Female')}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-semibold text-xs"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                    </div>

                    {/* Date of Birth */}
                    <div>
                      <label className="block text-xs font-black text-slate-700 uppercase mb-1">
                        Date of Birth
                      </label>
                      <input
                        type="date"
                        value={enrollDob}
                        onChange={(e) => setEnrollDob(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-semibold text-xs"
                      />
                    </div>

                    {/* Nationality */}
                    <div>
                      <label className="block text-xs font-black text-slate-700 uppercase mb-1">
                        Nationality <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={enrollNationality}
                        onChange={(e) => setEnrollNationality(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white border border-indigo-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 text-xs"
                      >
                        <option value="Ghanaian">Ghanaian</option>
                        <option value="Togolese">Togolese</option>
                        <option value="Nigerian">Nigerian</option>
                        <option value="Ivorian">Ivorian</option>
                        <option value="Beninois">Beninois</option>
                        <option value="Burkinabe">Burkinabe</option>
                        <option value="French">French</option>
                        <option value="British">British</option>
                        <option value="American">American</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    {/* Admission Date */}
                    <div>
                      <label className="block text-xs font-black text-slate-700 uppercase mb-1">
                        Admission Date / Date d'admission <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={enrollAdmissionDate}
                        onChange={(e) => setEnrollAdmissionDate(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white border border-indigo-300 rounded-xl font-bold text-indigo-900 focus:ring-2 focus:ring-indigo-500 text-xs bg-indigo-50/20"
                      />
                    </div>

                    {/* Campus */}
                    <div>
                      <label className="block text-xs font-black text-slate-700 uppercase mb-1">
                        Campus Assignment <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={enrollCampus}
                        onChange={(e) => setEnrollCampus(e.target.value as any)}
                        className="w-full px-3.5 py-2.5 bg-white border border-indigo-300 rounded-xl bg-indigo-50/10 font-bold focus:ring-2 focus:ring-indigo-500 text-xs"
                      >
                        <option value="JIPAS 1">JIPAS 1 (Main Campus)</option>
                        <option value="JIPAS 2">JIPAS 2 (Secondary Campus)</option>
                      </select>
                    </div>

                    {/* Department */}
                    <div>
                      <label className="block text-xs font-black text-slate-700 uppercase mb-1">
                        Department <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={enrollDepartment}
                        onChange={(e) => handleEnrollDepartmentChange(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-xs text-slate-900"
                      >
                        <option value="Primary School">Primary School (Basic 1 - 6)</option>
                        <option value="Junior High School">Junior High School (JHS 1 - 3)</option>
                        <option value="Senior High School">Senior High School (SHS Programmes)</option>
                        <option value="Pre-School / Kindergarten">Pre-School / Kindergarten (Creche, Nursery, KG)</option>
                      </select>
                    </div>

                    {/* SHS Course & Level OR Admission Class */}
                    {((enrollDepartment || '').toLowerCase().includes('senior') || (enrollDepartment || '').toLowerCase().includes('shs')) ? (
                      <div className="md:col-span-2 p-4 bg-indigo-50/70 border border-indigo-200 rounded-2xl space-y-4 animate-fade-in">
                        <div className="flex items-center gap-2 text-indigo-900 font-black text-xs">
                          <BookOpen className="w-4 h-4 text-indigo-600" />
                          <span>SHS Course & Level Placement</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-bold text-indigo-950 mb-1">
                              SHS Course / Programme <span className="text-rose-500">*</span>
                            </label>
                            <select
                              value={enrollCourse}
                              onChange={(e) => {
                                const newCourse = e.target.value;
                                setEnrollCourse(newCourse);
                                setEnrollClassName(`${newCourse} ${enrollLevel}`);
                                setEnrollElectives([]);
                              }}
                              className="w-full px-3 py-2 border border-indigo-300 rounded-xl font-bold bg-white text-indigo-950 focus:ring-2 focus:ring-indigo-500 text-xs"
                            >
                              {effectiveShsCourses.map(c => (
                                <option key={c.id} value={c.name}>{c.name} ({c.code})</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-indigo-950 mb-1">
                              SHS Level / Form <span className="text-rose-500">*</span>
                            </label>
                            <select
                              value={enrollLevel}
                              onChange={(e) => {
                                const lvl = e.target.value as '1' | '2' | '3';
                                setEnrollLevel(lvl);
                                setEnrollClassName(`${enrollCourse} ${lvl}`);
                              }}
                              className="w-full px-3 py-2 border border-indigo-300 rounded-xl font-bold bg-white text-indigo-950 focus:ring-2 focus:ring-indigo-500 text-xs"
                            >
                              <option value="1">Form 1 (SHS 1)</option>
                              <option value="2">Form 2 (SHS 2)</option>
                              <option value="3">Form 3 (SHS 3)</option>
                            </select>
                          </div>
                        </div>

                        {/* Dynamic Electives Selection */}
                        <div className="space-y-2">
                          <label className="block font-bold text-indigo-950 text-[11px] uppercase tracking-wider">
                            Select SHS Elective Subjects (Max 4)
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {getAvailableElectives(enrollCourse).map(elec => (
                              <label 
                                key={elec} 
                                className={`flex items-center gap-2 p-2 rounded-xl border transition-all cursor-pointer ${
                                  enrollElectives.includes(elec) 
                                    ? 'bg-indigo-600 border-indigo-600 text-white' 
                                    : 'bg-white border-indigo-200 text-indigo-900 hover:border-indigo-400'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  className="hidden"
                                  checked={enrollElectives.includes(elec)}
                                  onChange={() => {
                                    if (enrollElectives.includes(elec)) {
                                      setEnrollElectives(prev => prev.filter(e => e !== elec));
                                    } else {
                                      if (enrollElectives.length < 4) {
                                        setEnrollElectives(prev => [...prev, elec]);
                                      } else {
                                        alert("Maximum 4 elective subjects allowed.");
                                      }
                                    }
                                  }}
                                />
                                <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${
                                  enrollElectives.includes(elec) ? 'bg-white border-white' : 'border-indigo-300'
                                }`}>
                                  {enrollElectives.includes(elec) && <Check className="w-2.5 h-2.5 text-indigo-600" />}
                                </div>
                                <span className="text-[11px] font-bold truncate">{elec}</span>
                              </label>
                            ))}
                          </div>
                        </div>

                        <div className="text-[11px] font-semibold text-indigo-800 bg-white/80 p-2.5 rounded-lg border border-indigo-100 flex items-center justify-between">
                          <span>Assigned Class Stream:</span>
                          <strong className="text-indigo-950 font-black px-2 py-0.5 bg-indigo-100 rounded text-xs">
                            {enrollCourse} {enrollLevel}
                          </strong>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-xs font-black text-slate-700 uppercase mb-1">
                          Admission Class <span className="text-rose-500">*</span>
                        </label>
                        <select
                          value={enrollClassName}
                          onChange={(e) => setEnrollClassName(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-indigo-700 text-xs"
                        >
                          {getAdminClassesForDept(enrollDepartment).map(cls => (
                            <option key={cls} value={cls}>{cls}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Parent / Guardian Contact & Emergency Info */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                  <h3 className="font-bold text-slate-900 uppercase tracking-wider text-xs text-emerald-700 flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    2. Parent / Guardian Contact & Emergency Info
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black text-slate-700 uppercase mb-1">
                        Parent / Guardian Full Name
                      </label>
                      <input
                        type="text"
                        value={enrollParentName}
                        onChange={(e) => setEnrollParentName(e.target.value)}
                        placeholder="e.g. Mr. Emmanuel Mensah"
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-700 uppercase mb-1">
                        Primary Mobile Phone (the region Telco) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        value={enrollParentPhone}
                        onChange={(e) => setEnrollParentPhone(e.target.value)}
                        placeholder="0241234567"
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-900 text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Submit Bar */}
                <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                  <div className="text-slate-500">
                    Enrolled by: <strong className="text-slate-800">{secretary.name} (Secretary)</strong>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => {
                        setEnrollFullName('');
                        setEnrollParentName('');
                        setEnrollParentPhone('');
                        setEnrollPhoto('');
                      }}
                      className="px-4 py-2.5 border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs cursor-pointer transition-colors"
                    >
                      Clear Form
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingEnrollment}
                      className="flex-1 sm:flex-none px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-600/10 cursor-pointer disabled:opacity-50"
                    >
                      {isSubmittingEnrollment ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" /> Enrolling Student...
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4" /> Complete Student Enrollment
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {enrollmentActiveTab === 'submissions' && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase">Submitted Secretary Admission Registry</h3>
                  <p className="text-[11px] text-slate-500">History of student registration applications queued for school approval.</p>
                </div>

                <button
                  onClick={() => setEnrollmentActiveTab('form')}
                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> New Application
                </button>
              </div>

              <div className="divide-y divide-slate-100 border-t border-b border-slate-100">
                {students
                  .filter(s => s.status === 'Pending' || s.approvalStatus === 'Pending' || s.enrolledBy?.includes(secretary.name))
                  .map(st => (
                    <div key={st.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-3">
                        <img
                          src={st.photo || 'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=150'}
                          alt={st.fullName}
                          className="w-10 h-10 rounded-full object-cover border border-slate-200"
                        />
                        <div>
                          <h4 className="font-bold text-slate-900">{st.fullName}</h4>
                          <p className="text-[10px] text-slate-500 font-medium">
                            {st.gender} • DOB: {st.dob} • Class: <span className="font-bold text-slate-700">{st.className}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 justify-between sm:justify-end text-[11px] font-medium">
                        <div className="text-right">
                          <span className="block text-[9px] uppercase text-slate-400">Enrolled By</span>
                          <span className="font-bold text-slate-700">{st.enrolledBy || `${secretary.name} (Secretary)`}</span>
                        </div>

                        <div>
                          {st.isApproved || st.status === 'Active' ? (
                            <span className="bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Approved & Enrolled
                            </span>
                          ) : (
                            <span className="bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1">
                              <Clock className="w-3 h-3 text-amber-600" /> Awaiting Approval
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                {students.filter(s => s.status === 'Pending' || s.approvalStatus === 'Pending' || s.enrolledBy?.includes(secretary.name)).length === 0 && (
                  <div className="py-8 text-center text-slate-400 font-medium">
                    No submitted admission applications found. Click "+ New Application" above to enroll a student.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 7: OVERDUE FEE ALERTS & REMINDERS                         */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'overdue_alerts' && (
        <OverdueFeeAlertsManager
          students={students}
          bills={bills}
          payments={payments}
          onAddNotification={onAddNotification}
          onUpdateBills={onUpdateBills}
          onRecordPaymentClick={(studentId) => {
            const student = students.find(s => s.id === studentId);
            if (student) {
              setSelectedStudent(student);
              const bill = bills.find(b => b.studentId === studentId);
              if (bill && bill.balance > 0) {
                setPaymentAmount(bill.balance.toString());
              }
              setActiveTab('fee_collection');
            }
          }}
        />
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 8: PAYMENT COLLECTIONS LOG                                */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'collections_log' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900">Payment Collections Log</h3>
                <span className="bg-cyan-100 text-cyan-800 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                  {filteredCollectionsPayments.length} Receipts
                </span>
                {selectedPaymentIds.size > 0 && (
                  <button
                    onClick={() => setIsBatchPrintModalOpen(true)}
                    className="ml-2 px-3 py-1 bg-emerald-600 text-white rounded-lg text-[10px] font-black uppercase hover:bg-emerald-700 transition-colors"
                  >
                    Batch Print ({selectedPaymentIds.size})
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-500">Repository of all issued receipts and collected tuition/fee payments.</p>
            </div>
          </div>

          {/* FINANCIAL INSIGHTS DASHBOARD */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 border border-slate-200/80 rounded-3xl p-6 text-slate-900">
            {/* Summary Cards */}
            <div className="space-y-4 flex flex-col justify-center">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Billed Fees</span>
                <h4 className="text-2xl font-black text-slate-900 font-mono">
                  CFA {((totalCollections || 0) + (totalOutstanding || 0)).toFixed(2)}
                </h4>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-emerald-100/60 border border-emerald-200 p-3 rounded-2xl relative group cursor-pointer transition-all duration-200 hover:scale-[1.03]">
                  <span className="text-[9px] font-black uppercase text-emerald-800">Total Collections</span>
                  <h5 className="text-base font-bold text-emerald-950 font-mono">CFA {(totalCollections || 0).toFixed(2)}</h5>
                  <div className="absolute opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-bold py-1.5 px-3 rounded-xl shadow-xl whitespace-nowrap z-50 border border-slate-700">
                    Last update: {lastTransactionDate}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900"></div>
                  </div>
                </div>
                <div className="bg-rose-100/60 border border-rose-200 p-3 rounded-2xl relative group cursor-pointer transition-all duration-200 hover:scale-[1.03]">
                  <span className="text-[9px] font-black uppercase text-rose-800">Outstanding Fees</span>
                  <h5 className="text-base font-bold text-rose-950 font-mono">CFA {(totalOutstanding || 0).toFixed(2)}</h5>
                  <div className="absolute opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-bold py-1.5 px-3 rounded-xl shadow-xl whitespace-nowrap z-50 border border-slate-700">
                    Last update: {lastTransactionDate}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Pie Chart */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/60 flex flex-col items-center justify-center min-h-[180px]">
              <span className="text-[10px] font-black uppercase text-slate-500 mb-2">Collections vs. Debt Ratio</span>
              <div className="w-full h-32 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Collected', value: totalCollections },
                        { name: 'Outstanding', value: totalOutstanding }
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={25}
                      outerRadius={45}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      <Cell fill="#10b981" />
                      <Cell fill="#f43f5e" />
                    </Pie>
                    <Tooltip 
                      formatter={(value: any) => [`CFA ${(Number(value) || 0).toFixed(2)}`, '']}
                      contentStyle={{ borderRadius: '12px', fontSize: '10px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex gap-4 text-[10px] font-bold text-slate-600 mt-2">
                <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Collected ({Math.round(totalCollections / ((totalCollections + totalOutstanding) || 1) * 100)}%)</div>
                <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Outstanding ({Math.round(totalOutstanding / ((totalCollections + totalOutstanding) || 1) * 100)}%)</div>
              </div>
            </div>

            {/* Bar Chart by Class */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/60 flex flex-col justify-between min-h-[180px]">
              <span className="text-[10px] font-black uppercase text-slate-500 text-center mb-1">Financial Standing by Class (Top 6)</span>
              <div className="w-full h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barDataByClass} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="class" tick={{ fontSize: 9, fontWeight: 'bold', fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip 
                      formatter={(value: any) => [`CFA ${(Number(value) || 0).toFixed(2)}`, '']}
                      contentStyle={{ borderRadius: '12px', fontSize: '10px' }}
                    />
                    <Bar dataKey="collected" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="outstanding" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* 2-COLUMN SIDEBAR & TABLE LAYOUT */}
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Quick Filter Sidebar */}
            <div className="w-full lg:w-64 shrink-0 bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-5 text-slate-950">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 mb-1 flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-slate-500" /> Quick Filters
                </h4>
                <p className="text-[10px] text-slate-500 leading-normal">Narrow down Front Desk collections logs instantly.</p>
              </div>

              {/* Search Box */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase text-slate-400">Search Query</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search receipt, student or ID..."
                    value={collectionsSearchQuery}
                    onChange={(e) => setCollectionsSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-xl text-xs bg-white focus:ring-1 focus:ring-cyan-500 font-semibold text-slate-900"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                </div>
              </div>

              {/* Date Range Selector */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase text-slate-400">Date Range</label>
                <select
                  value={collectionsFilterDateRange}
                  onChange={(e) => setCollectionsFilterDateRange(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-700"
                >
                  <option value="All">All Time</option>
                  <option value="Today">Today</option>
                  <option value="Yesterday">Yesterday</option>
                  <option value="This Week">This Week (7 Days)</option>
                  <option value="This Month">This Month</option>
                  <option value="Custom">Custom Range</option>
                </select>

                {collectionsFilterDateRange === 'Custom' && (
                  <div className="grid grid-cols-2 gap-2 pt-1.5">
                    <div className="space-y-1">
                      <span className="text-[8px] font-bold text-slate-400 uppercase">Start</span>
                      <input
                        type="date"
                        value={collectionsFilterStartDate}
                        onChange={(e) => setCollectionsFilterStartDate(e.target.value)}
                        className="w-full px-2 py-1 border border-slate-300 rounded-lg text-[10px] bg-white font-medium text-slate-900"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[8px] font-bold text-slate-400 uppercase">End</span>
                      <input
                        type="date"
                        value={collectionsFilterEndDate}
                        onChange={(e) => setCollectionsFilterEndDate(e.target.value)}
                        className="w-full px-2 py-1 border border-slate-300 rounded-lg text-[10px] bg-white font-medium text-slate-900"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Class Group */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase text-slate-400">Class Group</label>
                <select
                  value={collectionsFilterClass}
                  onChange={(e) => setCollectionsFilterClass(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-700"
                >
                  {collectionsAvailableClasses.map(c => (
                    <option key={c} value={c}>{c === 'All' ? 'All Classes' : c}</option>
                  ))}
                </select>
              </div>

              {/* Payment Status Selector */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase text-slate-400">Payment Status</label>
                <select
                  value={collectionsFilterPaymentStatus}
                  onChange={(e) => setCollectionsFilterPaymentStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-700"
                >
                  <option value="All">All Statuses</option>
                  <option value="Completed">Completed</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>

              {/* Extra Original Filters */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <span className="text-[9px] font-black uppercase text-slate-400">Dept</span>
                  <select
                    value={collectionsFilterDepartment}
                    onChange={(e) => setCollectionsFilterDepartment(e.target.value)}
                    className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-[10px] font-semibold text-slate-700"
                  >
                    {collectionsAvailableDepartments.map(d => (
                      <option key={d} value={d}>{d === 'All' ? 'All' : d}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] font-black uppercase text-slate-400">Method</span>
                  <select
                    value={collectionsFilterMethod}
                    onChange={(e) => setCollectionsFilterMethod(e.target.value)}
                    className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-[10px] font-semibold text-slate-700"
                  >
                    <option value="All">All</option>
                    <option value="Mobile Money">MoMo</option>
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank</option>
                  </select>
                </div>
              </div>

              {/* Automated Alerts Trigger */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('overdue_alerts');
                }}
                className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-black rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer font-sans"
              >
                <AlertTriangle className="w-4 h-4 animate-pulse shrink-0" />
                <span>Bulk Overdue Alerts</span>
              </button>

              {/* Reset Filters button */}
              <button
                type="button"
                onClick={() => {
                  setCollectionsSearchQuery('');
                  setCollectionsFilterDateRange('All');
                  setCollectionsFilterStartDate('');
                  setCollectionsFilterEndDate('');
                  setCollectionsFilterClass('All');
                  setCollectionsFilterPaymentStatus('All');
                  setCollectionsFilterMethod('All');
                  setCollectionsFilterDepartment('All');
                }}
                className="w-full py-1.5 bg-slate-200/80 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-all"
              >
                Reset Active Filters
              </button>
            </div>

            {/* Table Area */}
            <div className="flex-1 space-y-4">
              <div className="flex justify-between items-center bg-slate-50 px-4 py-3 rounded-2xl border border-slate-200/60">
                <span className="text-xs font-bold text-slate-500">
                  Showing <span className="font-extrabold text-slate-900">{filteredCollectionsPayments.length}</span> matching entries
                </span>

                {/* Sort By Dropdown */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400">Sort:</span>
                  <select
                    value={collectionsSortBy}
                    onChange={(e) => setCollectionsSortBy(e.target.value as any)}
                    className="px-2.5 py-1.5 border border-indigo-200 bg-indigo-50/60 rounded-xl text-xs font-black text-indigo-900 focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="date_desc">Date (Newest First)</option>
                    <option value="date_asc">Date (Oldest First)</option>
                    <option value="amount_desc">Amount (High to Low)</option>
                    <option value="amount_asc">Amount (Low to High)</option>
                    <option value="name_asc">Student Name (A-Z)</option>
                    <option value="class_asc">Class Name (A-Z)</option>
                  </select>
                </div>
              </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap text-xs">
              <thead>
                <tr className="bg-slate-900 text-white font-bold uppercase text-[10px]">
                  <th className="p-3 w-12">
                    <input
                      type="checkbox"
                      className="rounded border-slate-700 bg-slate-800"
                      checked={selectedPaymentIds.size === filteredCollectionsPayments.length && filteredCollectionsPayments.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedPaymentIds(new Set(filteredCollectionsPayments.map(p => p.id)));
                        } else {
                          setSelectedPaymentIds(new Set());
                        }
                      }}
                    />
                  </th>
                  <th className="p-3">#</th>
                  <th className="p-3">Receipt No</th>
                  <th className="p-3">Date / Time</th>
                  <th className="p-3">Student Name</th>
                  <th className="p-3">Admission No</th>
                  <th className="p-3">Department</th>
                  <th className="p-3">Class</th>
                  <th className="p-3">Paid As</th>
                  <th className="p-3">Method</th>
                  <th className="p-3 text-right">Amount Paid</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-center">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredCollectionsPayments.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="p-8 text-center text-slate-400 font-medium">
                      No payment collection records found matching your selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredCollectionsPayments.map((p, idx) => {
                    const student = students.find(s => s.id === p.studentId || s.admissionNo === p.admissionNo);
                    const deptDisplay = p.department || student?.department || 'General';
                    const displayAmt = p.amount || p.paid || 0;

                    return (
                      <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3">
                          <input
                            type="checkbox"
                            className="rounded border-slate-300"
                            checked={selectedPaymentIds.has(p.id)}
                            onChange={(e) => {
                              const newSelection = new Set(selectedPaymentIds);
                              if (e.target.checked) newSelection.add(p.id);
                              else newSelection.delete(p.id);
                              setSelectedPaymentIds(newSelection);
                            }}
                          />
                        </td>
                        <td className="p-3 text-slate-400 font-mono">{idx + 1}</td>
                        <td className="p-3 font-mono font-bold text-blue-600">{p.receiptNo}</td>
                        <td className="p-3 text-slate-500 font-mono">{p.date}</td>
                        <td className="p-3 font-bold text-slate-900">
                          <button
                            type="button"
                            onClick={() => {
                              const st = students.find(s => s.id === p.studentId || s.admissionNo === p.admissionNo);
                              if (st) {
                                setSelectedStudent(st);
                                setActiveTab('fee_collection');
                              }
                            }}
                            className="hover:text-emerald-600 transition-colors cursor-pointer text-left font-bold"
                          >
                            {p.studentName}
                          </button>
                        </td>
                        <td className="p-3 font-mono text-indigo-700 font-bold">{p.admissionNo}</td>
                        <td className="p-3 font-semibold text-slate-600">{deptDisplay}</td>
                        <td className="p-3 font-bold text-slate-800">{p.className}</td>
                        <td className="p-3 text-slate-600 truncate max-w-[160px]">{p.paidAs || 'Fees'}</td>
                        <td className="p-3">
                          <span className="bg-cyan-100 text-cyan-800 px-2 py-0.5 rounded text-[10px] font-bold">
                            {p.method || p.paymentMethod || 'Cash'}
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono font-black text-emerald-700 text-sm">
                          CFA {(displayAmt ?? 0).toFixed(2)}
                        </td>
                        <td className="p-3">
                          <span className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                            {p.status || 'Completed'}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setLastIssuedReceipt(p);
                                setShowReceiptModal(true);
                                setAutoPrintTriggered(false);
                              }}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                              title="View Official Receipt Preview"
                            >
                              <Eye className="w-3 h-3" /> View A4
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setLastIssuedReceipt(p);
                                setShowA6Receipt(true);
                              }}
                              className="px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs font-bold flex items-center gap-1 cursor-pointer shadow-xs transition-colors"
                              title="Print Dedicated A6 Receipt"
                            >
                              <Printer className="w-3 h-3" /> A6 Print
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
    </div>
  )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 8.5: BULK FEE ENTRY TOOL                                 */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'bulk_fee_entry' && (
        <BulkFeeEntryTool
          students={students}
          currentUser={secretary as any}
          onClose={() => setActiveTab('fee_collection')}
        />
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 9: GRADUATED BATCH (BECE / WASSCE)                         */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'graduated_batch' && (
        <div className="space-y-6">
          <GraduatedBatchManager
            userRole="secretary"
            readOnly={false}
            selectedCampus={selectedCampus}
          />
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 10: PAST EMPLOYEE HISTORY ARCHIVE                          */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'employee_history' && (
        <div className="space-y-6">
          <PastEmployeeHistoryManager
            userRole="secretary"
            readOnly={false}
            selectedCampus={selectedCampus}
          />
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 11: STAFF ATTENDANCE SCANNER                                */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'staff_attendance' && (
        <div className="space-y-6">
          <StaffAttendanceQRScanner 
            currentUser={secretary} 
            employee={secretary} 
            onSuccess={() => setActiveTab('daily_records')}
            onClose={() => setActiveTab('daily_records')}
          />
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 12: BATCH RECEIPT GENERATION & MULTI-PRINT (PHASE 54)     */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'generate_receipt' && (
        <ReceiptGenerationDashboard
          payments={payments}
          bills={bills}
          students={students}
        />
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 12B: NEXT TERM FEES BILL & MULTI-RECEIPT GENERATION       */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'next_term_bills' && (
        <NextTermBillingManager
          userRole="secretary"
          onNavigateToReceipts={() => setActiveTab('generate_receipt')}
        />
      )}

      </div>

      {/* ------------------------------------------------------------- */}
      {/* MODAL & CSS-ONLY PRINTABLE LAYOUT: Official Receipt           */}
      {/* ------------------------------------------------------------- */}
      {showReceiptModal && lastIssuedReceipt && (() => {
        const receiptStudent = students.find(s => s.id === lastIssuedReceipt.studentId || s.admissionNo === lastIssuedReceipt.admissionNo);
        const receiptBill = bills.find(b => b.studentId === lastIssuedReceipt.studentId || b.admissionNo === lastIssuedReceipt.admissionNo);

        const parentName = receiptStudent?.parentName || receiptStudent?.guardianName || 'Parent / Guardian';
        const parentPhone = receiptStudent?.parentPhone || '—';
        const studentDept = lastIssuedReceipt.department || receiptStudent?.department || 'General Academic';
        const admissionNumber = lastIssuedReceipt.admissionNo || receiptStudent?.admissionNo || 'N/A';
        const className = lastIssuedReceipt.className || lastIssuedReceipt.classAssigned || receiptStudent?.className || 'Assigned Class';
        
        // Sum all outstanding balances of all active bills of the student for accurate remaining student balance
        const studentBillsList = bills.filter(b => (b.studentId === lastIssuedReceipt.studentId || b.admissionNo === lastIssuedReceipt.admissionNo) && b.status !== 'Voided' && b.status !== 'VOIDED');
        const totalBilledVal = addMoney(...studentBillsList.map(b => b.payable ?? b.totalAmount ?? 0));
        const studentPaymentsVal = payments.filter(p => (p.studentId === lastIssuedReceipt.studentId || p.admissionNo === lastIssuedReceipt.admissionNo) && p.status !== 'Rejected');
        const totalPaidVal = addMoney(...studentPaymentsVal.map(p => p.amount ?? p.paid ?? 0));
        const currentBalance = Math.max(0, subtractMoney(totalBilledVal, totalPaidVal));
        
        const amountPaidVal = Number(lastIssuedReceipt.amount || lastIssuedReceipt.paid || 0);
        const verificationCode = `SEC-VERIFY-${(lastIssuedReceipt.id || 'RC').slice(-8).toUpperCase()}`;

        return (
          <div className="secretary-receipt-screen-wrapper fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto print:static print:inset-auto print:bg-white print:p-0 print:m-0 print:block print:overflow-visible">
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-3xl w-full p-4 sm:p-7 space-y-4 relative my-auto print:max-w-none print:w-full print:p-0 print:border-none print:shadow-none print:rounded-none">
              
              {/* Screen-Only Header & Action Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3 print:hidden">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <Receipt className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-sm text-slate-900">Official Secretarial Fee Receipt</h3>
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                        Generated & Cleared
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-mono">
                      Ref: <strong className="text-slate-800">{lastIssuedReceipt.referenceNo || lastIssuedReceipt.receiptNo}</strong> • Date: <strong className="text-slate-800">{lastIssuedReceipt.date}</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setIsQRVerifierOpen(true)}
                    className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                    title="Scan QR Code to verify receipt authenticity"
                  >
                    <QrCode className="w-4 h-4 text-emerald-400" />
                    <span>Verify QR</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (receiptStudent) {
                        PDFGeneratorService.generateFeeReceipt(lastIssuedReceipt, receiptStudent);
                      } else {
                        alert('Student data not found for PDF download.');
                      }
                    }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                    title="Download Official PDF Receipt"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        window.print();
                      } catch (e) {
                        console.warn('Print error:', e);
                      }
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                    title="Open browser print dialog"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print Official Receipt</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowA6Receipt(true)}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                    title="Open JIPAS Official A6 Receipt View"
                  >
                    <FileText className="w-4 h-4" />
                    <span>View A6 Format</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowReceiptModal(false)}
                    className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                    title="Close Receipt Modal"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Printable Official Receipt Document */}
              <div
                id="official-secretary-receipt"
                className="print-multi-receipt-container print-a6-receipt-item bg-white border-2 border-slate-900 rounded-2xl p-5 sm:p-7 space-y-4 text-slate-900 print:m-0 print:border-2 print:border-slate-900 print:p-6 print:rounded-none"
              >
                {/* Institutional Header & Crest */}
                <div className="flex items-start justify-between gap-4 border-b-2 border-slate-900 pb-3">
                  <div className="flex items-center gap-3.5">
                    <div className="w-16 h-16 shrink-0 flex items-center justify-center rounded-xl bg-slate-50 p-1 border border-slate-200 print:border-slate-800">
                      <JIPASLogo size="md" />
                    </div>
                    <div>
                      <h1 className="text-lg sm:text-xl font-black uppercase tracking-wider text-slate-950 leading-tight">
                        {getStoredSettings().schoolName || 'JOY INTERNATIONAL SCHOOL (JIPAS)'}
                      </h1>
                      <p className="text-[11px] font-bold text-slate-600 italic">
                        "{getStoredSettings().schoolMotto || 'Education is Wealth • Knowledge, Discipline & Excellence'}"
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                        Accredited by the region Education Service (GES) • Reg: GES/GAR/ED/2018/042
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium">
                        {getStoredSettings().address ? `${getStoredSettings().address} • Tel: ${getStoredSettings().phone || '(00228) 22 60 21 38'}` : '01 BP. 2364 • Kpéhénou N°1 Behind T-Oil Filling Station, and Hedzranawoe 4th Corner after Radio Maria, Lomé — Togo • Tel: (00228) 22 60 21 38 / 99 47 38 23 / 90 83 60 48 • joyjipas2002@gmail.com'}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="inline-block bg-slate-950 text-white text-[10px] font-black uppercase px-2.5 py-1 rounded tracking-wider print:bg-slate-950 print:text-white">
                      Official Receipt
                    </div>
                    <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">
                      Original Copy
                    </div>
                    <div className="text-[9px] font-mono text-slate-400 mt-0.5">
                      Front Desk Division
                    </div>
                  </div>
                </div>

                {/* Document Title & Reference Bar */}
                <div className="bg-slate-100 border border-slate-300 rounded-xl px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold print:bg-slate-100 print:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold uppercase text-slate-800 text-[11px] tracking-wide">
                      Secretarial Fee Payment Receipt
                    </span>
                    <span className="text-slate-400 font-normal">|</span>
                    <span className="font-mono text-blue-700 font-bold">
                      {lastIssuedReceipt.receiptNo}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-600 font-mono">
                    <span>Date: <strong>{lastIssuedReceipt.date}</strong></span>
                    <span>Ref: <strong>{lastIssuedReceipt.referenceNo}</strong></span>
                  </div>
                </div>

                {/* Two-Column Particulars Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {/* Student Particulars */}
                  <div className="bg-slate-50/90 border border-slate-200 rounded-xl p-3.5 space-y-1.5 print:border-slate-700">
                    <div className="text-[10px] font-black uppercase text-slate-500 border-b border-slate-200 pb-1 mb-1 print:border-slate-400">
                      Student Particulars
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Student Name:</span>
                      <strong className="text-slate-900 text-right">{lastIssuedReceipt.studentName}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Admission No:</span>
                      <span className="font-mono font-bold text-indigo-700 text-right">{admissionNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Class / Stream:</span>
                      <strong className="text-slate-800 text-right">{className} ({studentDept})</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Parent / Guardian:</span>
                      <span className="text-slate-800 font-semibold text-right">{parentName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Contact Phone:</span>
                      <span className="font-mono text-slate-700 text-right">{parentPhone}</span>
                    </div>
                  </div>

                  {/* Transaction Metadata */}
                  <div className="bg-slate-50/90 border border-slate-200 rounded-xl p-3.5 space-y-1.5 print:border-slate-700">
                    <div className="text-[10px] font-black uppercase text-slate-500 border-b border-slate-200 pb-1 mb-1 print:border-slate-400">
                      Transaction & Revenue Audit
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Payment Channel:</span>
                      <span className="font-bold text-slate-900 bg-sky-100 text-sky-800 px-2 py-0.5 rounded text-[10px] print:border print:border-slate-700">
                        {lastIssuedReceipt.paymentMethod || lastIssuedReceipt.method || 'Cash Desk'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Academic Session:</span>
                      <span className="font-semibold text-slate-800 text-right">
                        {lastIssuedReceipt.academicYear || '2025/2026'} ({lastIssuedReceipt.term || getStoredSettings().activeTerm || 'First Term'})
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Front Desk Collector:</span>
                      <strong className="text-slate-800 text-right">{lastIssuedReceipt.receivedBy || secretary.name}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Transaction Status:</span>
                      <span className="text-emerald-700 font-bold text-right flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 inline" /> Official & Cleared
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Verification Token:</span>
                      <span className="font-mono text-[10px] font-bold text-slate-600 text-right">{verificationCode}</span>
                    </div>
                  </div>
                </div>

                {/* Financial Line-Item Breakdown Table */}
                <div className="border-2 border-slate-900 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-900 text-white font-bold text-[10px] uppercase tracking-wider print:bg-slate-900 print:text-white">
                      <tr>
                        <th className="p-3">Fee Item / Bill Description</th>
                        <th className="p-3">Academic Session</th>
                        <th className="p-3">Payment Method</th>
                        <th className="p-3 text-right">Amount Paid</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-medium">
                      <tr>
                        <td className="p-3 font-semibold text-slate-900">
                          {lastIssuedReceipt.notes || lastIssuedReceipt.paidAs || 'Tuition & Terminal Instructional Fees'}
                        </td>
                        <td className="p-3 text-slate-600 font-mono text-[11px]">
                          {lastIssuedReceipt.academicYear || '2025/2026'} - {lastIssuedReceipt.term || getStoredSettings().activeTerm || 'First Term'}
                        </td>
                        <td className="p-3 text-slate-700">
                          {lastIssuedReceipt.paymentMethod || lastIssuedReceipt.method || 'Cash'}
                        </td>
                        <td className="p-3 text-right font-mono font-black text-emerald-700 text-sm">
                          CFA {(amountPaidVal ?? 0).toFixed(2)}
                        </td>
                      </tr>
                      <tr className="bg-emerald-50/80 font-bold text-emerald-950 border-t-2 border-slate-900 print:bg-emerald-50">
                        <td colSpan={3} className="p-2.5 text-right font-extrabold uppercase text-[10px] tracking-wider">
                          Net Total Received (This Payment):
                        </td>
                        <td className="p-2.5 text-right font-mono font-black text-emerald-800 text-base">
                          CFA {(amountPaidVal ?? 0).toFixed(2)}
                        </td>
                      </tr>
                      {currentBalance > 0 ? (
                        <tr className="bg-rose-50/80 font-bold text-rose-950">
                          <td colSpan={3} className="p-2 text-right font-extrabold uppercase text-[10px] tracking-wider">
                            Remaining Student Arrears / Balance:
                          </td>
                          <td className="p-2 text-right font-mono font-black text-rose-700 text-xs">
                            CFA {(currentBalance ?? 0).toFixed(2)}
                          </td>
                        </tr>
                      ) : (
                        <tr className="bg-slate-50 font-bold text-slate-700">
                          <td colSpan={3} className="p-2 text-right font-extrabold uppercase text-[10px] tracking-wider">
                            Account Balance Status:
                          </td>
                          <td className="p-2 text-right font-bold text-emerald-700 text-xs">
                            Fully Settled & Nil Arrears
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Authentication & Signatures */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200 text-xs text-slate-600">
                  <div className="space-y-1">
                    <p className="text-[11px] font-medium text-slate-700 leading-relaxed">
                      Received with thanks from <strong className="text-slate-900">{parentName}</strong> on behalf of{' '}
                      <strong className="text-slate-900">{lastIssuedReceipt.studentName}</strong>.
                    </p>
                    <div className="pt-6 border-b-2 border-slate-900 max-w-[220px]" />
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
                      Front Desk Secretarial Officer & Date
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 block">
                      {lastIssuedReceipt.receivedBy || secretary.name}
                    </span>
                  </div>

                  <div className="border-2 border-dashed border-slate-400 rounded-xl p-3 text-center flex flex-col justify-center items-center bg-slate-50/50 print:bg-white print:border-slate-800">
                    <span className="text-[10px] font-black uppercase text-slate-800 tracking-wider">
                      JOY INTERNATIONAL SCHOOL (JIPAS)
                    </span>
                    <span className="text-[9px] font-extrabold text-sky-700 uppercase tracking-widest mt-0.5">
                      ★ SECRETARIAL DESK STAMP & SEAL ★
                    </span>
                    <span className="font-mono text-[9px] text-slate-500 mt-1">
                      VALIDATED: {lastIssuedReceipt.date}
                    </span>
                  </div>
                </div>

                {/* Barcode & Security Strip */}
                <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 h-6">
                    {/* Stylized Barcode lines */}
                    {[2, 4, 1, 3, 2, 5, 1, 2, 4, 2, 3, 1, 5, 2, 3, 1, 4, 2, 3, 2, 4, 1, 3, 5, 2, 1, 4, 2, 3, 1].map((w, i) => (
                      <div
                        key={i}
                        className="h-full bg-slate-900"
                        style={{ width: `${w}px` }}
                      />
                    ))}
                  </div>
                  <div className="text-[9px] font-mono text-slate-500">
                    Security Token: <strong>{verificationCode}</strong>
                  </div>
                </div>

                {/* Institutional Advisory Footer */}
                <div className="text-center text-[9px] text-slate-500 border-t border-slate-200 pt-2 leading-relaxed">
                  Notice to Parents & Students: This official invoice and receipt serves as an authentic institutional financial record.
                  Please retain this document for examination clearance, card issuance, and administrative verification. Alteration voids this document.
                </div>
              </div>

              {/* Screen Modal Bottom Action Controls */}
              <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-100 print:hidden">
                <span className="text-[11px] text-slate-500 font-medium">
                  Browser print preview opens automatically upon receipt generation.
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowReceiptModal(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowA6Receipt(true)}
                    className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <FileText className="w-4 h-4" /> View A6 Format
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        window.print();
                      } catch (e) {
                        console.warn('Print trigger error:', e);
                      }
                    }}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Printer className="w-4 h-4" /> Print Official Receipt
                  </button>
                </div>
              </div>

            </div>
          </div>
        );
      })()}

      {showA6Receipt && lastIssuedReceipt && (() => {
        const receiptStudent = students.find(s => s.id === lastIssuedReceipt.studentId || s.admissionNo === lastIssuedReceipt.admissionNo);
        const receiptBill = bills.find(b => b.studentId === lastIssuedReceipt.studentId || b.admissionNo === lastIssuedReceipt.admissionNo);
        if (!receiptStudent) return null;
        return (
          <PrintableReceiptA6
            receipt={lastIssuedReceipt}
            student={receiptStudent}
            bill={receiptBill}
            onClose={() => setShowA6Receipt(false)}
          />
        );
      })()}

      {/* Batch Print Modal */}
      {isBatchPrintModalOpen && (
        <BatchReceiptPrintModal
          isOpen={isBatchPrintModalOpen}
          onClose={() => setIsBatchPrintModalOpen(false)}
          selectedPaymentIds={Array.from(selectedPaymentIds)}
          payments={payments}
          students={students}
          bills={bills}
          initialPaperMode="a4_four_per_page"
        />
      )}

      {/* QR Code Authenticity Verification Scanner Modal */}
      <ReceiptQRVerificationModal
        isOpen={isQRVerifierOpen}
        onClose={() => setIsQRVerifierOpen(false)}
      />
    </div>
  );
}

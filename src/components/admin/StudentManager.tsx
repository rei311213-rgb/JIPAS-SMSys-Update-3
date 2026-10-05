import React, { useState, useEffect, useMemo, useRef } from 'react';
import Papa from 'papaparse';
import { useVirtualizer } from '@tanstack/react-virtual';
import { 
  GraduationCap, UserPlus, Users, CreditCard, Calendar, ArrowUpRight, 
  History, Plus, Pencil, Trash2, Search, CheckCircle2, AlertTriangle, 
  Printer, Download, Save, QrCode, Shield, Phone, Mail, Check, RotateCcw,
  Loader2, Clock, CheckCheck, XCircle, Inbox, UserCheck, FileText,
  FileSpreadsheet, Sparkles, Upload, AlertCircle, ShieldAlert, X, BookOpen, Zap,
  ArrowRightLeft, FileCheck
} from 'lucide-react';
import jsPDF from 'jspdf';
import { Student, PromotionRecord, CourseItem, ClassItem, DepartmentItem, HouseItem, StudentTransferRecord, StudentDocument } from '../../types';
import JIPASLogo from '../common/JIPASLogo';
import PhotoUploader from '../common/PhotoUploader';
import { saveStudent, deleteStudent, approveStudentAdmission, rejectStudentAdmission, generateUniqueAdmissionNo, getStoredStudents, fetchStudentsPaginated, subscribeStudentTransfers, saveStudentTransfer } from '../../services/dbService';
import { getStoredTransfers } from '../../services/storageService';
import { printContent } from '../../utils/printUtils';
import { INITIAL_SHS_COURSES, INITIAL_CLASSES } from '../../data/setupData';
import { useStudentFormDraft } from '../../hooks/useStudentFormDraft';
import { StudentFormDraftData } from '../../services/studentDraftService';
import DraftStatusBanner from '../common/DraftStatusBanner';
import BulkStudentUploadModal from './BulkStudentUploadModal';
import IDCardToolModal from './IDCardToolModal';
import StudentTransferManager from './StudentTransferManager';
import StudentDocumentVerificationModal from './StudentDocumentVerificationModal';
import AdmissionLetterModal from './AdmissionLetterModal';
import { exportStudentsToExcel } from '../../services/excelExportService';

interface StudentManagerProps {
  activeModule: string;
  students: Student[];
  courses?: CourseItem[];
  classes?: ClassItem[];
  departments?: DepartmentItem[];
  houses?: HouseItem[];
  onAddStudent: (student: Student) => void;
  onUpdateStudent?: (student: Student) => void;
  onDeleteStudent?: (studentId: string) => void;
  onNavigate?: (module: string) => void;
  onManageFees?: (student: Student) => void;
  onCleanOrphaned?: () => Promise<{ cleanedBillsCount: number; cleanedReportsCount: number; totalCleaned?: number }>;
  isReadOnly?: boolean;
}

export const INITIAL_PROMOTION_HISTORY: PromotionRecord[] = [
  { id: 'pr-1', date: '2026-08-25', fromClass: 'Basic 1', toClass: 'Basic 2', academicYear: '2025-2026', studentCount: 2, promotedBy: 'Marcus Prosper', notes: 'End of academic year standard promotion' },
  { id: 'pr-2', date: '2026-08-25', fromClass: 'Creche', toClass: 'Nursery 1', academicYear: '2025-2026', studentCount: 1, promotedBy: 'Marcus Prosper', notes: 'Pre-school transition' },
];

export default function StudentManager({
  activeModule,
  students: initialStudents,
  courses = INITIAL_SHS_COURSES,
  classes = INITIAL_CLASSES,
  departments = [],
  houses = [],
  onAddStudent,
  onUpdateStudent,
  onDeleteStudent,
  onNavigate,
  onManageFees,
  onCleanOrphaned,
  isReadOnly = false
}: StudentManagerProps) {
  const [studentsList, setStudentsList] = useState<Student[]>(initialStudents);
  const [promotionHistory, setPromotionHistory] = useState<PromotionRecord[]>(INITIAL_PROMOTION_HISTORY);

  // Pagination states
  const [paginatedStudents, setPaginatedStudents] = useState<Student[]>([]);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Initial paginated load
  useEffect(() => {
    if (activeModule === 'student_enrolled' || activeModule === 'enrolled_students' || activeModule === 'students') {
      loadInitialPaginatedStudents();
    }
  }, [activeModule]);

  const loadInitialPaginatedStudents = async () => {
    setIsLoadingMore(true);
    try {
      const { students: newStudents, lastVisible } = await fetchStudentsPaginated(20, null);
      setPaginatedStudents(newStudents);
      setLastDoc(lastVisible);
      setHasMore(newStudents.length === 20);
      if (newStudents.length > 0) {
        setStudentsList(prev => {
          if (prev.length === 0) return newStudents;
          const map = new Map<string, Student>();
          prev.forEach(s => map.set(s.id, s));
          newStudents.forEach(s => { if (!map.has(s.id)) map.set(s.id, s); });
          return Array.from(map.values());
        });
      }
    } catch (err) {
      console.error('Initial paginated load error:', err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleLoadMore = async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    try {
      const { students: newStudents, lastVisible } = await fetchStudentsPaginated(20, lastDoc);
      setPaginatedStudents(prev => [...prev, ...newStudents]);
      setLastDoc(lastVisible);
      setHasMore(newStudents.length === 20);
      if (newStudents.length > 0) {
        setStudentsList(prev => {
          const map = new Map<string, Student>();
          prev.forEach(s => map.set(s.id, s));
          newStudents.forEach(s => { if (!map.has(s.id)) map.set(s.id, s); });
          return Array.from(map.values());
        });
      }
    } catch (err) {
      console.error('Load more students error:', err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    if (initialStudents) {
      setStudentsList(prev => {
        if (prev.length === 0) return initialStudents;
        const map = new Map<string, Student>();
        initialStudents.forEach(s => map.set(s.id, s));
        prev.forEach(s => {
          if (!map.has(s.id)) {
            map.set(s.id, s);
          }
        });
        return Array.from(map.values());
      });
    }
  }, [initialStudents]);

  // Clean canonical students list
  const effectiveStudentsList = useMemo(() => {
    if (!studentsList || studentsList.length === 0) return initialStudents || [];
    const map = new Map<string, Student>();
    (initialStudents || []).forEach(s => map.set(s.id, s));
    studentsList.forEach(s => map.set(s.id, s));
    return Array.from(map.values());
  }, [studentsList, initialStudents]);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 250);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const [classFilter, setClassFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [courseFilter, setCourseFilter] = useState('all');
  
  // Individual Promote/Repeat state
  const [individualPromoteStudent, setIndividualPromoteStudent] = useState<Student | null>(null);
  const [individualPromoteTarget, setIndividualPromoteTarget] = useState<string>('');
  const [genderFilter, setGenderFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Active' | 'Pending' | 'Transfers'>('all');
  const [documentVerificationStudent, setDocumentVerificationStudent] = useState<Student | null>(null);
  const [admissionLetterStudent, setAdmissionLetterStudent] = useState<Student | null>(null);

  // Modals & Toasts
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null);
  const [approvingStudent, setApprovingStudent] = useState<Student | null>(null);
  const [assignedAdmNo, setAssignedAdmNo] = useState('');
  const [enrollSuccessToast, setEnrollSuccessToast] = useState(false);
  const [approvalToast, setApprovalToast] = useState<string | null>(null);
  const [promotionToast, setPromotionToast] = useState(false);
  const [isSubmittingStudent, setIsSubmittingStudent] = useState(false);
  const [enrollErrorMsg, setEnrollErrorMsg] = useState('');
  const [lastEnrolledStudent, setLastEnrolledStudent] = useState<Student | null>(null);
  const [showBulkUpload, setShowBulkUpload] = useState(false);

  // PDF Export & Batch CSV & Quick Clean State
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [showBatchCsvModal, setShowBatchCsvModal] = useState(false);
  const [batchCsvText, setBatchCsvText] = useState('');
  const [isImportingBatchCsv, setIsImportingBatchCsv] = useState(false);
  const [batchImportProgress, setBatchImportProgress] = useState<{ current: number; total: number } | null>(null);
  const [batchImportSuccess, setBatchImportSuccess] = useState<string | null>(null);
  const [batchImportError, setBatchImportError] = useState<string | null>(null);
  const [isCleaningOrphanedLocal, setIsCleaningOrphanedLocal] = useState(false);
  const [cleanToastMsg, setCleanToastMsg] = useState<string | null>(null);

  // Controlled Pilot Import State
  const [pilotImportToast, setPilotImportToast] = useState<string | null>(null);

  // Multi-select bulk state
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [selectedIDCardRecord, setSelectedIDCardRecord] = useState<any | null>(null);

  // Class-Based Export Modal State
  const [showClassExportModal, setShowClassExportModal] = useState(false);
  const [exportClassTarget, setExportClassTarget] = useState<string>('all');
  const [exportFormat, setExportFormat] = useState<'pdf' | 'csv'>('pdf');

  // Compute master available class list (filtered by deptFilter if set)
  const availableClassNames = useMemo(() => {
    const set = new Set<string>();
    const baseList = ['Creche', 'Nursery 1', 'Nursery 2', 'KG 1', 'KG 2', 'Basic 1', 'Basic 2', 'Basic 3', 'Basic 4', 'Basic 5', 'Basic 6', 'JHS 1', 'JHS 2', 'JHS 3', 'Science 1', 'Science 2', 'Science 3', 'Visual Arts 1', 'Visual Arts 2', 'Visual Arts 3', 'Home Economics 1', 'Home Economics 2', 'Home Economics 3', 'General Arts 1', 'General Arts 2', 'General Arts 3', 'Business 1', 'Business 2', 'Business 3', 'Agricultural Science 1'];
    
    baseList.forEach(c => {
      if (deptFilter === 'all') {
        set.add(c);
      } else if (deptFilter === 'Pre-School' && (c.includes('Creche') || c.includes('Nursery') || c.includes('KG'))) {
        set.add(c);
      } else if (deptFilter === 'Primary School' && (c.includes('Basic') || c.includes('Class'))) {
        set.add(c);
      } else if (deptFilter === 'Junior High School' && c.includes('JHS')) {
        set.add(c);
      } else if (deptFilter === 'Senior High School' && (c.includes('SHS') || c.includes('Science') || c.includes('Arts') || c.includes('Business') || c.includes('Economics') || c.includes('Visual') || c.includes('Agricultural'))) {
        set.add(c);
      }
    });

    classes?.forEach(c => {
      if (deptFilter === 'all' || (c.department && c.department.toLowerCase() === deptFilter.toLowerCase())) {
        set.add(c.name);
      }
    });

    effectiveStudentsList.forEach(s => {
      if (s.className) {
        if (deptFilter === 'all') {
          set.add(s.className);
        } else if (s.department && s.department.toLowerCase() === deptFilter.toLowerCase()) {
          set.add(s.className);
        } else if (deptFilter === 'Pre-School' && (s.className.includes('Creche') || s.className.includes('Nursery') || s.className.includes('KG'))) {
          set.add(s.className);
        } else if (deptFilter === 'Junior High School' && s.className.includes('JHS')) {
          set.add(s.className);
        } else if (deptFilter === 'Primary School' && (s.className.includes('Basic') || s.className.includes('Class'))) {
          set.add(s.className);
        } else if (deptFilter === 'Senior High School' && (s.className.includes('SHS') || s.className.includes('Science') || s.className.includes('Arts') || s.className.includes('Business') || s.className.includes('Economics') || s.className.includes('Visual'))) {
          set.add(s.className);
        }
      }
    });
    return Array.from(set);
  }, [classes, effectiveStudentsList, deptFilter]);

  // Export Class Admission Details (PDF / CSV)
  const handleExportClassAdmissionDetails = (targetClassNameOverride?: string, formatOverride?: 'pdf' | 'csv') => {
    const targetClass = targetClassNameOverride || exportClassTarget;
    const format = formatOverride || exportFormat;

    const classStudents = targetClass === 'all' 
      ? effectiveStudentsList 
      : effectiveStudentsList.filter(s => s.className === targetClass);

    if (classStudents.length === 0) {
      alert(`No student admission records found for ${targetClass === 'all' ? 'All Classes' : `class "${targetClass}"`}.`);
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const classTitle = targetClass === 'all' ? 'All_Classes' : targetClass.replace(/[^a-zA-Z0-9]/g, '_');

    if (format === 'csv') {
      const headers = [
        'Admission No',
        'Student Full Name',
        'Gender',
        'Date of Birth',
        'Department',
        'Class Name',
        'Roll No',
        'House',
        'Parent / Guardian Name',
        'Parent Phone',
        'Admission Status',
        'Enrollment Date'
      ];

      const rows = classStudents.map(s => [
        `"${s.admissionNo || ''}"`,
        `"${s.fullName || ''}"`,
        `"${s.gender || 'Male'}"`,
        `"${s.dob || ''}"`,
        `"${s.department || ''}"`,
        `"${s.className || ''}"`,
        `"${s.rollNo || ''}"`,
        `"${s.house || ''}"`,
        `"${s.parentName || ''}"`,
        `"${s.parentPhone || ''}"`,
        `"${s.status || 'Active'}"`,
        `"${s.enrollmentDate || s.admissionDate || ''}"`
      ]);

      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `JIPAS_${classTitle}_Admission_Register_${todayStr}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setShowClassExportModal(false);
      return;
    }

    // PDF Export
    setIsExportingPdf(true);
    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 12;
      const contentWidth = pageWidth - margin * 2;

      let y = 14;

      const columns = [
        { id: 'index', title: '#', width: 9, align: 'center' as const },
        { id: 'adm', title: 'Admission No', width: 30, align: 'left' as const },
        { id: 'name', title: 'Student Full Name', width: 55, align: 'left' as const },
        { id: 'class', title: 'Class', width: 25, align: 'left' as const },
        { id: 'gender', title: 'Gender', width: 18, align: 'center' as const },
        { id: 'dob', title: 'Date of Birth', width: 24, align: 'center' as const },
        { id: 'house', title: 'House', width: 22, align: 'left' as const },
        { id: 'parent', title: 'Parent / Guardian', width: 48, align: 'left' as const },
        { id: 'contact', title: 'Parent Phone', width: 32, align: 'left' as const },
        { id: 'status', title: 'Status', width: 20, align: 'center' as const },
      ];

      const drawTableHeader = () => {
        doc.setFillColor(30, 41, 59); // slate-800
        doc.rect(margin, y, contentWidth, 8, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(255, 255, 255);

        let currentX = margin;
        columns.forEach(col => {
          const textX = col.align === 'center' ? currentX + col.width / 2 : currentX + 2;
          doc.text(col.title, textX, y + 5.5, { align: col.align });
          currentX += col.width;
        });

        y += 8;
      };

      const drawPageHeader = () => {
        doc.setFillColor(15, 23, 42); // slate-900
        doc.rect(margin, y, contentWidth, 18, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.text('JESUS IS PRECIOUS ACADEMY (JIPAS)', margin + 6, y + 7);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(203, 213, 225); // slate-300
        doc.text(`OFFICIAL CLASS ADMISSION REGISTER — CLASS: ${targetClass === 'all' ? 'ALL CLASSES' : targetClass.toUpperCase()}`, margin + 6, y + 13);

        doc.setFontSize(8);
        doc.setTextColor(226, 232, 240);
        const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        doc.text(`Date Generated: ${dateStr}`, pageWidth - margin - 6, y + 7, { align: 'right' });
        doc.text(`Academic Year: 2025/2026`, pageWidth - margin - 6, y + 13, { align: 'right' });

        y += 22;

        doc.setFillColor(241, 245, 249); // slate-100
        doc.setDrawColor(203, 213, 225); // slate-300
        doc.rect(margin, y, contentWidth, 9, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(30, 41, 59);

        const boysCount = classStudents.filter(s => s.gender === 'Male').length;
        const girlsCount = classStudents.filter(s => s.gender === 'Female').length;

        const summaryText = `Class: ${targetClass === 'all' ? 'All Classes' : targetClass}  |  Total Enrolled: ${classStudents.length} (Boys: ${boysCount}, Girls: ${girlsCount})  |  Official the region GES School Record`;
        doc.text(summaryText, margin + 4, y + 6);

        y += 12;

        drawTableHeader();
      };

      drawPageHeader();

      const rowHeight = 7.5;
      classStudents.forEach((student, index) => {
        if (y + rowHeight > pageHeight - 15) {
          doc.addPage();
          y = 14;
          drawPageHeader();
        }

        if (index % 2 === 0) {
          doc.setFillColor(255, 255, 255);
        } else {
          doc.setFillColor(248, 250, 252);
        }
        doc.rect(margin, y, contentWidth, rowHeight, 'F');

        doc.setDrawColor(226, 232, 240);
        doc.line(margin, y + rowHeight, margin + contentWidth, y + rowHeight);

        let currentX = margin;
        columns.forEach(col => {
          let val = '';
          if (col.id === 'index') val = String(index + 1);
          else if (col.id === 'adm') val = student.admissionNo || 'N/A';
          else if (col.id === 'name') val = student.fullName || '';
          else if (col.id === 'class') val = student.className || '';
          else if (col.id === 'gender') val = student.gender || 'Male';
          else if (col.id === 'dob') val = student.dob || 'N/A';
          else if (col.id === 'house') val = student.house || 'N/A';
          else if (col.id === 'parent') val = student.parentName || 'N/A';
          else if (col.id === 'contact') val = student.parentPhone || 'N/A';
          else if (col.id === 'status') val = student.status || 'Active';

          const maxLen = col.width - 3;
          let displayVal = String(val || "");
          while (doc.getTextWidth(displayVal) > maxLen && displayVal.length > 3) {
            displayVal = displayVal.slice(0, -2) + '…';
          }

          const textX = col.align === 'center' ? currentX + col.width / 2 : currentX + 2;
          if (col.id === 'name' || col.id === 'adm') {
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(15, 23, 42);
          } else {
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(51, 65, 85);
          }

          doc.text(displayVal, textX, y + 5, { align: col.align });
          currentX += col.width;
        });

        y += rowHeight;
      });

      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184);
        doc.text(`JIPAS School Management System • Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 6, { align: 'center' });
        doc.text('Confidential - Official GES Class Records', pageWidth - margin, pageHeight - 6, { align: 'right' });
      }

      doc.save(`JIPAS_${classTitle}_Admission_Register_${todayStr}.pdf`);
      setShowClassExportModal(false);
    } catch (err) {
      console.error('PDF class export error:', err);
      alert('Failed to generate Class Admission Register PDF.');
    } finally {
      setIsExportingPdf(false);
    }
  };



  // Enrollment Form State
  const [formLastName, setFormLastName] = useState('');
  const [formOtherNames, setFormOtherNames] = useState('');
  const [formFullName, setFormFullName] = useState('');
  const [formGender, setFormGender] = useState<'Male' | 'Female'>('Male');
  const [formDob, setFormDob] = useState('2020-05-15');
  const [formAdmissionDate, setFormAdmissionDate] = useState(new Date().toISOString().split('T')[0]);
  const [formDepartment, setFormDepartment] = useState('Primary School');
  const [formClassName, setFormClassName] = useState('Basic 1');
  const [formCourse, setFormCourse] = useState('Science (General)');
  const [formLevel, setFormLevel] = useState<'1' | '2' | '3'>('1');
  const [formHouse, setFormHouse] = useState('Blue');
  const [formElectives, setFormElectives] = useState<string[]>([]);
  const [formParentName, setFormParentName] = useState('');
  const [formParentPhone, setFormParentPhone] = useState('');
  const [formCampus, setFormCampus] = useState<'JIPAS 1' | 'JIPAS 2'>('JIPAS 1');
  const [formNationality, setFormNationality] = useState('Ghanaian');
  const [formBloodGroup, setFormBloodGroup] = useState('O+');
  const [formPhoto, setFormPhoto] = useState<string>('https://images.unsplash.com/photo-1543269865-cbf427effbad?w=200&auto=format&fit=crop&q=80');

  // Student ID Card Admin Setup State
  const [idCardIssueDate, setIdCardIssueDate] = useState('2026-09-01');
  const [idCardExpiryDate, setIdCardExpiryDate] = useState('2029-12-31');
  const [idCardClassFilter, setIdCardClassFilter] = useState('All Classes');

  // IndexedDB Auto-save Student Creation Draft Integration
  const currentDraftValues = useMemo<StudentFormDraftData>(() => ({
    fullName: [formLastName.trim(), formOtherNames.trim()].filter(Boolean).join(' ') || formFullName,
    lastName: formLastName,
    otherNames: formOtherNames,
    gender: formGender,
    dob: formDob,
    admissionDate: formAdmissionDate,
    department: formDepartment,
    className: formClassName,
    course: formCourse,
    level: formLevel,
    house: formHouse,
    electives: formElectives,
    parentName: formParentName,
    parentPhone: formParentPhone,
    photo: formPhoto
  }), [formLastName, formOtherNames, formFullName, formGender, formDob, formAdmissionDate, formDepartment, formClassName, formCourse, formLevel, formHouse, formElectives, formParentName, formParentPhone, formPhoto]);

  const applyDraftToForm = (draft: StudentFormDraftData) => {
    if (draft.lastName !== undefined) setFormLastName(draft.lastName);
    if (draft.otherNames !== undefined) setFormOtherNames(draft.otherNames);
    if (draft.fullName !== undefined) {
      setFormFullName(draft.fullName);
      if (!draft.lastName && !draft.otherNames) {
        const parts = draft.fullName.trim().split(/\s+/);
        setFormLastName(parts[0] || '');
        setFormOtherNames(parts.slice(1).join(' '));
      }
    }
    if (draft.gender !== undefined) setFormGender(draft.gender);
    if (draft.dob !== undefined) setFormDob(draft.dob);
    if (draft.admissionDate !== undefined) setFormAdmissionDate(draft.admissionDate);
    if (draft.department !== undefined) setFormDepartment(draft.department);
    if (draft.className !== undefined) setFormClassName(draft.className);
    if (draft.course !== undefined) setFormCourse(draft.course);
    if (draft.level !== undefined) setFormLevel(draft.level);
    if (draft.house !== undefined) setFormHouse(draft.house);
    if (draft.electives !== undefined) setFormElectives(draft.electives);
    if (draft.parentName !== undefined) setFormParentName(draft.parentName);
    if (draft.parentPhone !== undefined) setFormParentPhone(draft.parentPhone);
    if (draft.photo !== undefined) setFormPhoto(draft.photo);
  };

  const resetEnrollmentForm = () => {
    setFormLastName('');
    setFormOtherNames('');
    setFormFullName('');
    setFormGender('Male');
    setFormDob('2018-05-15');
    setFormAdmissionDate(new Date().toISOString().split('T')[0]);
    setFormDepartment('Primary School');
    setFormClassName('Basic 1');
    setFormCourse('Science (General)');
    setFormLevel('1');
    setFormHouse('Blue');
    setFormElectives([]);
    setFormParentName('');
    setFormParentPhone('');
    setFormCampus('JIPAS 1');
    setFormNationality('Ghanaian');
    setFormBloodGroup('O+');
    setFormPhoto('https://images.unsplash.com/photo-1543269865-cbf427effbad?w=200&auto=format&fit=crop&q=80');
  };

  const { isDraftRestored, lastSavedAt, isSaving, discardDraft, onSuccessfulSubmission } = useStudentFormDraft({
    values: currentDraftValues,
    setValues: applyDraftToForm,
    enabled: !editingStudent
  });

  // Compute robust list of SHS courses that always falls back to INITIAL_SHS_COURSES
  const effectiveShsCourses = useMemo(() => {
    const fromProps = (courses || []).filter(c => {
      const d = (c.department || '').toLowerCase();
      return d.includes('senior') || d.includes('shs');
    });
    return fromProps.length > 0 ? fromProps : INITIAL_SHS_COURSES;
  }, [courses]);

  const filteredCoursesForForm = useMemo(() => {
    const formDeptLower = (formDepartment || '').toLowerCase();
    if (formDeptLower.includes('senior') || formDeptLower.includes('shs')) {
      return effectiveShsCourses;
    }
    const matching = (courses || []).filter(c => {
      const deptLower = (c.department || '').toLowerCase();
      return deptLower === formDeptLower || deptLower.includes(formDeptLower) || formDeptLower.includes(deptLower);
    });
    return matching.length > 0 ? matching : effectiveShsCourses;
  }, [courses, formDepartment, effectiveShsCourses]);

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

  const handleDepartmentSelectChange = (dept: string) => {
    setFormDepartment(dept);
    setFormElectives([]);
    if (dept.toLowerCase().includes('senior') || dept.toLowerCase().includes('shs')) {
      const defaultCourse = effectiveShsCourses[0]?.name || 'Science (General)';
      setFormCourse(defaultCourse);
      setFormClassName(`${defaultCourse} ${formLevel}`);
    } else {
      const available = getAdminClassesForDept(dept);
      if (available.length > 0) {
        setFormClassName(available[0]);
      }
    }
  };

  const getAvailableElectives = (courseName: string) => {
    const allCourses = [...effectiveShsCourses, ...courses];
    const match = allCourses.find(c =>
      c.name.toLowerCase() === (courseName || '').toLowerCase() ||
      c.name.toLowerCase().includes((courseName || '').toLowerCase()) ||
      (courseName || '').toLowerCase().includes(c.name.toLowerCase())
    );
    return match?.electiveSubjects || [];
  };

  // Bulk CSV Upload state
  const [csvInput, setCsvInput] = useState('');
  const [bulkSuccessMsg, setBulkSuccessMsg] = useState('');

  const generateCsvTemplate = () => {
    const headers = ["Admission No,Full Name,Gender,Dob,Department,ClassName,House,Parent Name,Parent Phone,Campus"];
    const csvContent = headers.join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'student_import_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleBulkCsvUpload = () => {
    if (!csvInput.trim()) {
      alert("Please paste CSV student data or upload a CSV file.");
      return;
    }

    Papa.parse(csvInput, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        let successCount = 0;
        let failCount = 0;
        const newStudents: Student[] = [];
        const admissionNos = new Set(studentsList.map(s => s.admissionNo));
        const summary: string[] = [];
        const validClassNames = classes.map(c => c.name.toLowerCase());

        results.data.forEach((row: any, index: number) => {
          const data: any = {};
          Object.keys(row).forEach(key => {
            data[key.toLowerCase().replace(/[^a-z]/g, '')] = row[key];
          });

          const admissionNo = data['admissionno'];
          const fullName = data['fullname'] || data['name'];
          const className = data['classname'] || data['class'];
          const parentPhone = data['parentphone'] || data['phone'];

          // Validation
          if (!admissionNo || !fullName || !className) {
            summary.push(`Row ${index + 1}: Missing required fields (Admission No, Full Name, Class).`);
            failCount++;
            return;
          }
          if (admissionNos.has(admissionNo)) {
            summary.push(`Row ${index + 1}: Duplicate Admission No '${admissionNo}'.`);
            failCount++;
            return;
          }
          if (!validClassNames.includes((className || '').toLowerCase())) {
            summary.push(`Row ${index + 1}: Class '${className}' not found in master list.`);
            failCount++;
            return;
          }

          const gender = (data['gender']?.toLowerCase().includes('f')) ? 'Female' : 'Male';
          const dob = data['dob'] || '2020-01-01';
          const department = data['department'] || 'Primary School';
          const house = data['house'] || 'Blue';
          const campusStr = data['campus']?.toString().toUpperCase() || '';
          const campus: 'JIPAS 1' | 'JIPAS 2' = campusStr.includes('2') ? 'JIPAS 2' : 'JIPAS 1';
          const parentName = data['parentname'] || data['parent'] || 'Parent / Guardian';

          const nextId = `s-bulk-${Date.now()}-${index}`;
          
          admissionNos.add(admissionNo);

          const newStudent: Student = {
            id: nextId,
            admissionNo: admissionNo,
            fullName: fullName.toUpperCase(),
            gender,
            dob,
            department,
            className: classes.find(c => c.name.toLowerCase() === className.toLowerCase())?.name || className,
            rollNo: String(studentsList.length + successCount + 1).padStart(3, '0'),
            house,
            campus,
            parentName,
            parentPhone: parentPhone || '0240000000',
            academicYear: '2025-2026',
            term: 'Third Term',
            status: 'Active',
            isCurrent: true,
            enrollmentDate: new Date().toISOString().split('T')[0],
            photo: gender === 'Female' 
              ? 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=200&auto=format&fit=crop&q=80'
              : 'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=200&auto=format&fit=crop&q=80'
          };

          newStudents.push(newStudent);
          if (onAddStudent) onAddStudent(newStudent);
          successCount++;
        });

        setStudentsList(prev => [...newStudents, ...prev]);
        setBulkSuccessMsg(`Import Complete! Successfully added: ${successCount}. Failed: ${failCount}.`);
        if (summary.length > 0) alert("Import Summary Errors:\n" + summary.join('\n'));
        setCsvInput('');
        setTimeout(() => setBulkSuccessMsg(''), 10000);
      },
      error: (err) => {
        console.error("CSV Parse error:", err);
        alert("Error parsing CSV data. Please check format.");
      }
    });
  };

  // Attendance Register State
  const [attDate, setAttDate] = useState('2026-09-05');
  const [attClass, setAttClass] = useState('Basic 1');
  const [studentAttMap, setStudentAttMap] = useState<Record<string, 'Present' | 'Absent' | 'Late' | 'Excused'>>({});
  const [attSavedToast, setAttSavedToast] = useState(false);

  // Promote Students State
  const [promoteSourceClass, setPromoteSourceClass] = useState('Basic 1');
  const [promoteTargetClass, setPromoteTargetClass] = useState('Basic 2');
  const [promoteAcademicYear, setPromoteAcademicYear] = useState('2026-2027');
  const [isBulkPromoting, setIsBulkPromoting] = useState(false);
  const [selectedForPromotion, setSelectedForPromotion] = useState<string[]>([]);

  const bulkPromoteStudents = async (ids: string[], targetClass: string, academicYear: string) => {
    for (const id of ids) {
      const student = studentsList.find(s => s.id === id);
      if (student) {
        student.className = targetClass;
        student.academicYear = academicYear;
        await onUpdateStudent(student);
      }
    }
  };

  const handleBulkPromote = async () => {
    setIsBulkPromoting(true);
    const studentsInClass = studentsList.filter(s => s.className === promoteSourceClass);
    const ids = studentsInClass.map(s => s.id);
    
    try {
        await bulkPromoteStudents(ids, promoteTargetClass, promoteAcademicYear);
        setPromotionToast(true);
        setTimeout(() => setPromotionToast(false), 3000);
    } catch (e) {
        console.error("Bulk promotion failed", e);
        alert("Failed to promote students. Please check your connection.");
    } finally {
        setIsBulkPromoting(false);
    }
  };

  // Open Edit Modal
  const handleOpenEditStudent = (st: Student) => {
    setEditingStudent(st);
    setFormFullName(st.fullName);
    const nameParts = (st.fullName || '').trim().split(/\s+/);
    setFormLastName(nameParts[0] || '');
    setFormOtherNames(nameParts.slice(1).join(' '));
    setFormGender(st.gender || 'Male');
    setFormDob(st.dob || '2020-01-01');
    setFormAdmissionDate(st.admissionDate || st.enrollmentDate || new Date().toISOString().split('T')[0]);
    const detectedDept = st.department || (st.course ? 'Senior High School' : 'Primary School');
    setFormDepartment(detectedDept);
    
    // Detect or set course
    let detectedCourse = st.course || '';
    if (!detectedCourse) {
      const match = effectiveShsCourses.find(c => st.className?.toLowerCase().includes(c.name.toLowerCase()));
      detectedCourse = match ? match.name : effectiveShsCourses[0]?.name || 'Science (General)';
    }
    setFormCourse(detectedCourse || 'Science (General)');
    
    // Detect or set level
    const rawLvl = String(st.level || '');
    let detectedLevel: '1' | '2' | '3' = (rawLvl === '2' || rawLvl === '3') ? rawLvl as '2' | '3' : '1';
    if (!st.level && st.className) {
      if (st.className.endsWith('3')) detectedLevel = '3';
      else if (st.className.endsWith('2')) detectedLevel = '2';
      else if (st.className.endsWith('1')) detectedLevel = '1';
    }
    setFormLevel(detectedLevel);
    setFormClassName(st.className || 'Basic 1');
    setFormHouse(st.house || 'Blue');
    setFormParentName(st.parentName || '');
    setFormParentPhone(st.parentPhone || '');
    setFormCampus(st.campus || 'JIPAS 1');
    setFormNationality(st.nationality || 'Ghanaian');
    setFormBloodGroup(st.bloodGroup || 'O+');
    setFormPhoto(st.photo || (st.gender === 'Female' 
      ? 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=200&auto=format&fit=crop&q=80'
      : 'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=200&auto=format&fit=crop&q=80'));
  };

  // Save Add or Edit Student
  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnrollErrorMsg('');

    const combinedName = [formLastName.trim().toUpperCase(), formOtherNames.trim().toUpperCase()].filter(Boolean).join(' ') || formFullName.trim().toUpperCase();

    if (!formLastName.trim() || !formOtherNames.trim()) {
      setEnrollErrorMsg('Please provide both the student\'s Last Name (Surname) and Other Names.');
      return;
    }
    if (!formParentPhone.trim()) {
      setEnrollErrorMsg('Please provide a parent/guardian phone number.');
      return;
    }

    setIsSubmittingStudent(true);

    const isShs = formDepartment === 'Senior High School' || formDepartment === 'SHS';
    const finalClassName = isShs ? `${formCourse} ${formLevel}` : formClassName;

    try {
      if (editingStudent) {
        const updated: Student = {
          ...editingStudent,
          fullName: combinedName,
          gender: formGender,
          dob: formDob,
          admissionDate: formAdmissionDate || editingStudent.admissionDate || new Date().toISOString().split('T')[0],
          enrollmentDate: formAdmissionDate || editingStudent.enrollmentDate || new Date().toISOString().split('T')[0],
          department: isShs ? 'Senior High School' : formDepartment,
          className: finalClassName,
          course: isShs ? formCourse : undefined,
          level: isShs ? formLevel : undefined,
          electiveSubjects: isShs ? formElectives : [],
          house: formHouse,
          campus: formCampus,
          campus_id: formCampus,
          nationality: formNationality || 'Ghanaian',
          bloodGroup: formBloodGroup || 'O+',
          parentName: formParentName.trim() || 'Parent / Guardian',
          parentPhone: formParentPhone.trim(),
          photo: formPhoto
        };
        await saveStudent(updated);
        setStudentsList(prev => prev.map(s => s.id === editingStudent.id ? updated : s));
        if (onUpdateStudent) onUpdateStudent(updated);
        setEditingStudent(null);
        setShowEnrollModal(false);
        setLastEnrolledStudent(updated);
        setEnrollSuccessToast(true);
        setTimeout(() => setEnrollSuccessToast(false), 5000);
      } else {
        const nextId = `s-${Date.now()}`;
        // Admin enrollment defaults to Pending to allow testing approval flow
        const newStudent: Student = {
          id: nextId,
          admissionNo: 'PENDING-APPROVAL',
          fullName: combinedName,
          gender: formGender,
          dob: formDob || '2018-05-15',
          admissionDate: formAdmissionDate || new Date().toISOString().split('T')[0],
          department: isShs ? 'Senior High School' : formDepartment,
          className: finalClassName,
          course: isShs ? formCourse : undefined,
          level: isShs ? formLevel : undefined,
          electiveSubjects: isShs ? formElectives : [],
          rollNo: String(studentsList.length + 1).padStart(3, '0'),
          house: formHouse,
          campus: formCampus,
          campus_id: formCampus,
          nationality: formNationality || 'Ghanaian',
          bloodGroup: formBloodGroup || 'O+',
          parentName: formParentName.trim() || 'Parent / Guardian',
          parentPhone: formParentPhone.trim(),
          academicYear: '2025-2026',
          term: 'Third Term',
          status: 'Pending',
          approvalStatus: 'Pending',
          isApproved: false,
          isCurrent: true,
          enrollmentDate: formAdmissionDate || new Date().toISOString().split('T')[0],
          photo: formPhoto || (formGender === 'Male'
            ? 'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=200&auto=format&fit=crop&q=80'
            : 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=200&auto=format&fit=crop&q=80')
        };
        
        await saveStudent(newStudent);
        setStudentsList(prev => [newStudent, ...prev]);
        if (onAddStudent) onAddStudent(newStudent);
        
        // Clear IndexedDB draft and reset form inputs for subsequent entries
        await onSuccessfulSubmission(resetEnrollmentForm);
        
        setShowEnrollModal(false);
        setLastEnrolledStudent(newStudent);
        setEnrollSuccessToast(true);
        setTimeout(() => setEnrollSuccessToast(false), 5000);
      }
    } catch (err: any) {
      console.error('Failed to save student:', err);
      setEnrollErrorMsg(err?.message || 'Error processing enrollment. Please retry.');
    } finally {
      setIsSubmittingStudent(false);
    }
  };

  // Delete Student - instant UI dismiss & resilient DB delete
  const handleConfirmDelete = async () => {
    if (deletingStudent) {
      const studentIdToDelete = deletingStudent.id;
      setDeletingStudent(null);
      setStudentsList(prev => prev.filter(s => s.id !== studentIdToDelete));
      setPaginatedStudents(prev => prev.filter(s => s.id !== studentIdToDelete));
      if (onDeleteStudent) onDeleteStudent(studentIdToDelete);
      try {
        await deleteStudent(studentIdToDelete);
      } catch (err) {
        console.error('Failed to delete student from DB:', err);
      }
    }
  };

  // Admission Approval Handlers
  const handleApproveAdmission = async (student: Student) => {
    try {
      setApprovingStudent(student.id);
      // Pass assignedAdmNo only if manually entered, otherwise let dbService generate it atomicaly
      const nextAdmNo = assignedAdmNo.trim();
      const updated = await approveStudentAdmission(student.id, nextAdmNo);
      if (updated) {
        setStudentsList(prev => prev.map(s => s.id === student.id ? updated : s));
        if (onUpdateStudent) onUpdateStudent(updated);
        setApprovalToast(`Student "${updated.fullName}" approved successfully with Admission No: ${updated.admissionNo}`);
        setTimeout(() => setApprovalToast(null), 4000);
      }
    } catch (err) {
      console.error('Failed to approve student admission:', err);
    } finally {
      setApprovingStudent(null);
      setAssignedAdmNo('');
    }
  };

  const handleRejectAdmission = async (student: Student) => {
    if (!window.confirm(`Are you sure you want to decline admission for ${student.fullName}?`)) return;
    try {
      const updated = await rejectStudentAdmission(student.id, 'Declined by Administration');
      if (updated) {
        setStudentsList(prev => prev.map(s => s.id === student.id ? updated : s));
        if (onUpdateStudent) onUpdateStudent(updated);
        setApprovalToast(`Admission application for "${student.fullName}" was declined.`);
        setTimeout(() => setApprovalToast(null), 4000);
      }
    } catch (err) {
      console.error('Failed to reject student admission:', err);
    }
  };

  // Promotion Handler
  const handleExecutePromotion = () => {
    if (selectedForPromotion.length === 0) {
      alert("Please select at least one student to promote.");
      return;
    }

    setStudentsList(prev => prev.map(s => {
      if (selectedForPromotion.includes(s.id)) {
        return { ...s, className: promoteTargetClass };
      }
      return s;
    }));

    const newLog: PromotionRecord = {
      id: `pr-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      fromClass: promoteSourceClass,
      toClass: promoteTargetClass,
      academicYear: '2025-2026',
      studentCount: selectedForPromotion.length,
      promotedBy: 'Marcus Prosper (Admin)',
      notes: `Promoted ${selectedForPromotion.length} student(s) from ${promoteSourceClass} to ${promoteTargetClass}`
    };

    setPromotionHistory(prev => [newLog, ...prev]);
    setSelectedForPromotion([]);
    setPromotionToast(true);
    setTimeout(() => setPromotionToast(false), 4000);
  };

  // Pending admissions count
  const pendingAdmissions = effectiveStudentsList.filter(s => s.status === 'Pending' || s.approvalStatus === 'Pending' || s.isApproved === false);

  // Search & Filtered data computation - now using effectiveStudentsList across directory view
  const activeDataList = effectiveStudentsList;

  const filteredStudents = useMemo(() => {
    return activeDataList.filter(s => {
      const matchesSearch = !debouncedSearchQuery ? true : (
        s.fullName.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        s.admissionNo.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        s.parentName?.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        s.parentPhone?.includes(debouncedSearchQuery)
      );
      const matchesDept = deptFilter === 'all' || 
                          (s.department && s.department.toLowerCase() === deptFilter.toLowerCase()) ||
                          (deptFilter === 'Pre-School' && (s.className?.includes('Creche') || s.className?.includes('Nursery') || s.className?.includes('KG'))) ||
                          (deptFilter === 'Junior High School' && s.className?.includes('JHS')) ||
                          (deptFilter === 'Primary School' && (s.className?.includes('Basic') || s.className?.includes('Class'))) ||
                          (deptFilter === 'Senior High School' && (s.className?.includes('SHS') || s.className?.includes('Science') || s.className?.includes('Arts') || s.className?.includes('Business') || s.className?.includes('Economics') || s.className?.includes('Visual')));
      const matchesClass = classFilter === 'all' || s.className === classFilter;
      const matchesCourse = courseFilter === 'all' || s.course === courseFilter || s.className.toLowerCase().includes(courseFilter.toLowerCase());
      const matchesGender = genderFilter === 'all' || s.gender === genderFilter;
      const matchesStatus = statusFilter === 'all' || 
                            (statusFilter === 'Active' && s.status === 'Active' && s.approvalStatus !== 'Pending') ||
                            (statusFilter === 'Pending' && (s.status === 'Pending' || s.approvalStatus === 'Pending' || s.isApproved === false));
      return matchesSearch && matchesDept && matchesClass && matchesCourse && matchesGender && matchesStatus;
    });
  }, [activeDataList, debouncedSearchQuery, deptFilter, classFilter, courseFilter, genderFilter, statusFilter]);

  // Virtualized row engine for high-performance rendering (>500 records)
  const studentTableParentRef = useRef<HTMLDivElement>(null);

  const studentRowVirtualizer = useVirtualizer({
    count: filteredStudents.length,
    getScrollElement: () => studentTableParentRef.current,
    estimateSize: () => 72,
    overscan: 8,
  });

  // Multi-select memoized values & handlers
  const selectedStudents = useMemo(() => {
    return effectiveStudentsList.filter(s => selectedStudentIds.includes(s.id));
  }, [effectiveStudentsList, selectedStudentIds]);

  const selectedPendingStudents = useMemo(() => {
    return selectedStudents.filter(s => s.status === 'Pending' || s.approvalStatus === 'Pending' || s.isApproved === false);
  }, [selectedStudents]);

  const isAllFilteredSelected = useMemo(() => {
    if (filteredStudents.length === 0) return false;
    return filteredStudents.every(s => selectedStudentIds.includes(s.id));
  }, [filteredStudents, selectedStudentIds]);

  const handleToggleSelectAll = () => {
    if (isAllFilteredSelected) {
      const visibleIds = new Set(filteredStudents.map(s => s.id));
      setSelectedStudentIds(prev => prev.filter(id => !visibleIds.has(id)));
    } else {
      const visibleIds = filteredStudents.map(s => s.id);
      setSelectedStudentIds(prev => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const handleToggleSelectStudent = (studentId: string) => {
    setSelectedStudentIds(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleClearSelection = () => {
    setSelectedStudentIds([]);
  };

  const handleBulkApproveStudents = async () => {
    if (selectedPendingStudents.length === 0) return;
    setIsBulkProcessing(true);
    try {
      let approvedCount = 0;
      let currentList = [...studentsList];

      for (const student of selectedPendingStudents) {
        const autoAdmNo = (student.admissionNo && !student.admissionNo.includes('PENDING'))
          ? student.admissionNo
          : generateUniqueAdmissionNo(currentList);

        const updated = await approveStudentAdmission(student.id, autoAdmNo);
        if (updated) {
          approvedCount++;
          currentList = currentList.map(s => s.id === student.id ? updated : s);
          if (onUpdateStudent) onUpdateStudent(updated);
        }
      }

      setStudentsList(currentList);
      setApprovalToast(`Successfully approved ${approvedCount} student admission(s)!`);
      setTimeout(() => setApprovalToast(null), 5000);
      setSelectedStudentIds(prev => prev.filter(id => !selectedPendingStudents.some(s => s.id === id)));
    } catch (err) {
      console.error('Failed bulk approve:', err);
      setApprovalToast('An error occurred during bulk approval.');
      setTimeout(() => setApprovalToast(null), 5000);
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleConfirmBulkDelete = async () => {
    if (selectedStudentIds.length === 0) return;
    setIsBulkProcessing(true);
    try {
      const idsToDelete = [...selectedStudentIds];
      setStudentsList(prev => prev.filter(s => !idsToDelete.includes(s.id)));
      setPaginatedStudents(prev => prev.filter(s => !idsToDelete.includes(s.id)));
      if (onDeleteStudent) {
        idsToDelete.forEach(id => onDeleteStudent(id));
      }
      await Promise.all(idsToDelete.map(id => deleteStudent(id).catch(err => console.error(`Failed deleting student ${id}:`, err))));
      setCleanToastMsg(`Successfully deleted ${idsToDelete.length} student record(s).`);
      setTimeout(() => setCleanToastMsg(null), 5000);
      setSelectedStudentIds([]);
      setShowBulkDeleteModal(false);
    } catch (err) {
      console.error('Failed bulk delete:', err);
    } finally {
      setIsBulkProcessing(false);
    }
  };

  // 1. Export current filtered student table to PDF using jsPDF
  const handleExportToPdf = () => {
    if (filteredStudents.length === 0) {
      alert("No student records available in the current filtered view to export.");
      return;
    }

    setIsExportingPdf(true);
    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 12;
      const contentWidth = pageWidth - margin * 2;

      let y = 14;

      const columns = [
        { id: 'index', title: '#', width: 9, align: 'center' as const },
        { id: 'adm', title: 'Admission No', width: 28, align: 'left' as const },
        { id: 'name', title: 'Student Full Name', width: 55, align: 'left' as const },
        { id: 'class', title: 'Class', width: 26, align: 'left' as const },
        { id: 'gender', title: 'Gender', width: 18, align: 'center' as const },
        { id: 'house', title: 'House', width: 24, align: 'left' as const },
        { id: 'parent', title: 'Parent / Guardian', width: 44, align: 'left' as const },
        { id: 'contact', title: 'Contact Phone', width: 34, align: 'left' as const },
        { id: 'status', title: 'Status', width: 31, align: 'center' as const },
      ];

      const drawTableHeader = () => {
        doc.setFillColor(30, 41, 59); // slate-800
        doc.rect(margin, y, contentWidth, 8, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(255, 255, 255);

        let currentX = margin;
        columns.forEach(col => {
          const textX = col.align === 'center' ? currentX + col.width / 2 : currentX + 2;
          doc.text(col.title, textX, y + 5.5, { align: col.align });
          currentX += col.width;
        });

        y += 8;
      };

      const drawPageHeader = () => {
        doc.setFillColor(15, 23, 42); // slate-900
        doc.rect(margin, y, contentWidth, 18, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.text('JESUS IS PRECIOUS ACADEMY (JIPAS)', margin + 6, y + 7);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(203, 213, 225); // slate-300
        doc.text('OFFICIAL STUDENT ENROLLMENT REGISTER & SUMMARY REPORT', margin + 6, y + 13);

        doc.setFontSize(8);
        doc.setTextColor(226, 232, 240);
        const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        doc.text(`Date: ${dateStr}`, pageWidth - margin - 6, y + 7, { align: 'right' });
        doc.text(`Academic Year: 2025/2026`, pageWidth - margin - 6, y + 13, { align: 'right' });

        y += 22;

        doc.setFillColor(241, 245, 249); // slate-100
        doc.setDrawColor(203, 213, 225); // slate-300
        doc.rect(margin, y, contentWidth, 9, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(30, 41, 59);

        const boysCount = filteredStudents.filter(s => s.gender === 'Male').length;
        const girlsCount = filteredStudents.filter(s => s.gender === 'Female').length;
        const classLabel = classFilter === 'all' ? 'All Classes' : classFilter;
        const statusLabel = statusFilter === 'all' ? 'All Records' : statusFilter;

        const summaryText = `Class Filter: ${classLabel}  |  Status: ${statusLabel}  |  Gender: ${genderFilter === 'all' ? 'All' : genderFilter}  |  Total Records: ${filteredStudents.length} (Boys: ${boysCount}, Girls: ${girlsCount})`;
        doc.text(summaryText, margin + 4, y + 6);

        y += 12;

        drawTableHeader();
      };

      drawPageHeader();

      const rowHeight = 7.5;
      filteredStudents.forEach((student, index) => {
        if (y + rowHeight > pageHeight - 15) {
          doc.addPage();
          y = 14;
          drawPageHeader();
        }

        if (index % 2 === 0) {
          doc.setFillColor(255, 255, 255);
        } else {
          doc.setFillColor(248, 250, 252);
        }
        doc.rect(margin, y, contentWidth, rowHeight, 'F');

        doc.setDrawColor(226, 232, 240);
        doc.line(margin, y + rowHeight, margin + contentWidth, y + rowHeight);

        let currentX = margin;
        columns.forEach(col => {
          let val = '';
          if (col.id === 'index') val = String(index + 1);
          else if (col.id === 'adm') val = student.admissionNo || 'N/A';
          else if (col.id === 'name') val = student.fullName || '';
          else if (col.id === 'class') val = student.className || '';
          else if (col.id === 'gender') val = student.gender || 'Male';
          else if (col.id === 'house') val = student.house || 'N/A';
          else if (col.id === 'parent') val = student.parentName || 'N/A';
          else if (col.id === 'contact') val = student.parentPhone || 'N/A';
          else if (col.id === 'status') val = student.status || 'Active';

          const maxLen = col.width - 3;
          let displayVal = String(val || "");
          while (doc.getTextWidth(displayVal) > maxLen && displayVal.length > 3) {
            displayVal = displayVal.slice(0, -2) + '…';
          }

          const textX = col.align === 'center' ? currentX + col.width / 2 : currentX + 2;
          if (col.id === 'name' || col.id === 'adm') {
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(15, 23, 42);
          } else {
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(51, 65, 85);
          }

          doc.text(displayVal, textX, y + 5, { align: col.align });
          currentX += col.width;
        });

        y += rowHeight;
      });

      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184);
        doc.text(`JIPAS School Management System • Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 6, { align: 'center' });
        doc.text('Confidential - Official GES Records', pageWidth - margin, pageHeight - 6, { align: 'right' });
      }

      const todayStr = new Date().toISOString().split('T')[0];
      doc.save(`JIPAS_Students_Register_${todayStr}.pdf`);
    } catch (err) {
      console.error('PDF export error:', err);
      alert('Failed to generate PDF summary. Please check console.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  // 2. CSV Parser for Batch Import Modal
  interface ParsedStudentRow {
    rawIndex: number;
    fullName: string;
    gender: 'Male' | 'Female';
    className: string;
    dob: string;
    house: string;
    parentName: string;
    parentPhone: string;
    admissionNo?: string;
    isValid: boolean;
    errorReason?: string;
  }

  const parseCsvData = (text: string) => {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) return { rows: [], validRows: [] };

    const firstLine = lines[0].toLowerCase();
    const hasHeader = /name|gender|sex|class|grade|dob|birth|house|parent|phone|admission/i.test(firstLine);

    const headerMap: { [key: string]: number } = {};
    let dataLines = lines;

    if (hasHeader) {
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[^a-z0-9]/g, ''));
      headers.forEach((h, idx) => {
        if (h.includes('name') && !h.includes('parent')) headerMap['fullName'] = idx;
        else if (h.includes('gender') || h.includes('sex')) headerMap['gender'] = idx;
        else if (h.includes('class') || h.includes('grade')) headerMap['className'] = idx;
        else if (h.includes('dob') || h.includes('birth')) headerMap['dob'] = idx;
        else if (h.includes('house')) headerMap['house'] = idx;
        else if ((h.includes('parent') && h.includes('phone')) || h.includes('contact') || h.includes('tel') || h.includes('mobile')) headerMap['parentPhone'] = idx;
        else if (h.includes('parent') || h.includes('guardian') || h.includes('father') || h.includes('mother')) headerMap['parentName'] = idx;
        else if (h.includes('adm') || h.includes('roll') || h.includes('id')) headerMap['admissionNo'] = idx;
      });
      dataLines = lines.slice(1);
    }

    const rows: ParsedStudentRow[] = dataLines.map((line, idx) => {
      const parts = line.split(',').map(p => p.trim().replace(/^["']|["']$/g, ''));
      
      const getVal = (key: string, fallbackIdx: number) => {
        if (hasHeader && headerMap[key] !== undefined && parts[headerMap[key]] !== undefined) {
          return parts[headerMap[key]];
        }
        return parts[fallbackIdx] || '';
      };

      const fullName = getVal('fullName', 0).trim();
      const rawGender = getVal('gender', 1).toLowerCase();
      const gender: 'Male' | 'Female' = (rawGender.includes('f') || rawGender.includes('girl')) ? 'Female' : 'Male';
      const className = getVal('className', 2).trim() || 'Basic 1';
      const dob = getVal('dob', 3).trim() || '2020-01-01';
      const house = getVal('house', 4).trim() || 'Blue';
      const parentName = getVal('parentName', 5).trim() || 'Parent / Guardian';
      const parentPhone = getVal('parentPhone', 6).trim() || '0240000000';
      const admissionNo = getVal('admissionNo', 7).trim() || undefined;

      const isValid = fullName.length >= 2;
      const errorReason = !isValid ? 'Missing student full name' : undefined;

      return {
        rawIndex: idx + 1,
        fullName,
        gender,
        className,
        dob,
        house,
        parentName,
        parentPhone,
        admissionNo,
        isValid,
        errorReason
      };
    });

    const validRows = rows.filter(r => r.isValid);
    return { rows, validRows };
  };

  const handleExecuteBatchImport = async () => {
    const { validRows } = parseCsvData(batchCsvText);
    if (validRows.length === 0) {
      setBatchImportError("No valid student records found in the pasted CSV text. Please verify the format.");
      return;
    }

    setIsImportingBatchCsv(true);
    setBatchImportError(null);
    setBatchImportSuccess(null);
    setBatchImportProgress({ current: 0, total: validRows.length });

    const newStudents: Student[] = [];
    let count = 0;

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      const nextId = `st-bulk-${Date.now()}-${i}`;
      const nextAdmNo = row.admissionNo || generateUniqueAdmissionNo([...studentsList, ...newStudents]);
      const department = row.className.includes('JHS') 
        ? 'Junior High School' 
        : row.className.includes('Nursery') || row.className.includes('Creche') || row.className.includes('KG')
        ? 'Kindergarten'
        : 'Primary School';

      const newStudent: Student = {
        id: nextId,
        admissionNo: nextAdmNo,
        fullName: row.fullName.toUpperCase(),
        gender: row.gender,
        dob: row.dob,
        admissionDate: new Date().toISOString().split('T')[0],
        department,
        className: row.className,
        rollNo: String(studentsList.length + count + 1).padStart(3, '0'),
        house: row.house,
        campus: ((row as any).campus === 'JIPAS 2' || (row as any).campus?.toString().includes('2')) ? 'JIPAS 2' : 'JIPAS 1',
        parentName: row.parentName,
        parentPhone: row.parentPhone,
        academicYear: '2025-2026',
        term: 'Third Term',
        status: 'Active',
        isCurrent: true,
        enrollmentDate: new Date().toISOString().split('T')[0],
        photo: row.gender === 'Female' 
          ? 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=200&auto=format&fit=crop&q=80'
          : 'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=200&auto=format&fit=crop&q=80'
      };

      try {
        await saveStudent(newStudent);
        onAddStudent(newStudent);
        newStudents.push(newStudent);
        count++;
      } catch (err) {
        console.error('Batch import student error:', err);
      }

      setBatchImportProgress({ current: i + 1, total: validRows.length });
    }

    setStudentsList(prev => [...newStudents, ...prev]);
    setIsImportingBatchCsv(false);
    setBatchImportSuccess(`Successfully imported ${count} new students directly into the Firebase database!`);
    
    setTimeout(() => {
      setShowBatchCsvModal(false);
      setBatchCsvText('');
      setBatchImportSuccess(null);
      setBatchImportProgress(null);
    }, 2200);
  };

  // 3. Trigger Quick Clean for Orphaned Records
  const handleTriggerQuickClean = async () => {
    if (!onCleanOrphaned) return;
    if (confirm("Run Quick Clean? This will scan for and remove any fee bills or terminal reports whose students no longer exist in the system.")) {
      setIsCleaningOrphanedLocal(true);
      setCleanToastMsg(null);
      try {
        const res = await onCleanOrphaned();
        if (res.cleanedBillsCount === 0 && res.cleanedReportsCount === 0) {
          setCleanToastMsg("Database verified clean: 0 orphaned bills or reports found.");
        } else {
          setCleanToastMsg(`Quick Clean completed: Removed ${res.cleanedBillsCount} orphaned bills and ${res.cleanedReportsCount} orphaned reports.`);
        }
        setTimeout(() => setCleanToastMsg(null), 6000);
      } catch (err: any) {
        alert("Failed to clean orphaned records: " + (err?.message || "Unknown error"));
      } finally {
        setIsCleaningOrphanedLocal(false);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. ENROLL STUDENT MODULE */}
      {(activeModule === 'student_enroll' || activeModule === 'enroll_student') && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sm:p-6 space-y-5">
          {/* Minimized Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                <UserPlus className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                  Student Enrollment & Admission
                </h2>
                <p className="text-[11px] text-slate-500">
                  Register new student with automated bill & terminal report generation
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowBatchCsvModal(true)}
              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer border border-indigo-200"
            >
              <Upload className="w-3.5 h-3.5" />
              Bulk CSV Import
            </button>
          </div>

          {enrollSuccessToast && (
            <div className="bg-emerald-600 text-white px-4 py-3 rounded-xl text-xs font-bold flex items-center justify-between shadow-sm animate-fade-in">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                {lastEnrolledStudent ? (
                  <span>
                    <strong>{lastEnrolledStudent.fullName}</strong> ({lastEnrolledStudent.admissionNo}) enrolled successfully in {lastEnrolledStudent.className}!
                  </span>
                ) : (
                  <span>Student enrolled successfully! Terminal billing statement and examination records generated.</span>
                )}
              </span>
              <button onClick={() => setEnrollSuccessToast(false)} className="text-white font-black ml-4">✕</button>
            </div>
          )}

          {enrollErrorMsg && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm animate-fade-in">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{enrollErrorMsg}</span>
            </div>
          )}

          {/* Optional Collapsed Bulk CSV */}
          {showBulkUpload && (
            <div className="bg-slate-900 text-white p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-xs text-amber-300 flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5" /> Bulk CSV Import
                </h3>
                <span className="text-[10px] text-slate-400 font-mono">
                  Format: FullName, Gender, Dob, Department, ClassName, House, ParentName, ParentPhone
                </span>
              </div>

              {bulkSuccessMsg && (
                <div className="bg-emerald-600 text-white px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>{bulkSuccessMsg}</span>
                </div>
              )}

              <textarea
                rows={2}
                value={csvInput}
                onChange={(e) => setCsvInput(e.target.value)}
                placeholder="Paste CSV rows here..."
                className="w-full p-2 bg-white/10 border border-white/20 rounded-lg text-white font-mono text-xs focus:outline-none focus:ring-1 focus:ring-amber-400"
              />

              <div className="flex flex-wrap justify-between items-center gap-2">
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept=".csv, .txt"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          setCsvInput(event.target?.result as string || '');
                        };
                        reader.readAsText(file);
                      }
                    }}
                    className="text-xs text-slate-300 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-amber-400 file:text-slate-900 cursor-pointer"
                  />
                  <button
                    type="button"
                    onClick={generateCsvTemplate}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-semibold transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Template
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleBulkCsvUpload}
                  className="px-4 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-900 rounded-lg font-bold text-xs shadow transition-colors cursor-pointer"
                >
                  Import Students
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleSaveStudent} className="space-y-6 text-xs">
            {/* IndexedDB Auto-Saved Draft Indicator Banner */}
            {!editingStudent && (
              <DraftStatusBanner
                isDraftRestored={isDraftRestored}
                lastSavedAt={lastSavedAt}
                isSaving={isSaving}
                onDiscardDraft={() => discardDraft(resetEnrollmentForm)}
              />
            )}

            {/* Student Biodata */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
              <h3 className="font-bold text-slate-900 uppercase tracking-wider text-indigo-700">
                1. Student Biodata & Identification
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Last Name (Surname) *</label>
                  <input
                    type="text"
                    required
                    value={formLastName}
                    onChange={(e) => setFormLastName(e.target.value)}
                    placeholder="e.g. MENSAH"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold uppercase text-slate-900 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Other Names (First & Middle) *</label>
                  <input
                    type="text"
                    required
                    value={formOtherNames}
                    onChange={(e) => setFormOtherNames(e.target.value)}
                    placeholder="e.g. KOFI EMMANUEL"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold uppercase text-slate-900 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Gender *</label>
                  <select
                    value={formGender}
                    onChange={(e) => setFormGender(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-semibold"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Assigned Campus *</label>
                  <select
                    value={formCampus}
                    onChange={(e) => setFormCampus(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-black text-indigo-700 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="JIPAS 1">JIPAS 1 (Kpéhénou)</option>
                    <option value="JIPAS 2">JIPAS 2 (Hedzranawoe)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={formDob}
                    onChange={(e) => setFormDob(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Admission Date / Date d'admission *
                  </label>
                  <input
                    type="date"
                    required
                    value={formAdmissionDate}
                    onChange={(e) => setFormAdmissionDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-indigo-300 rounded-xl font-bold text-indigo-900 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Department *</label>
                    <select
                      value={formDepartment}
                      onChange={(e) => handleDepartmentSelectChange(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-semibold"
                    >
                      <option value="Pre-School / Kindergarten">Pre-School / Kindergarten</option>
                      <option value="Primary School">Primary School</option>
                      <option value="Junior High School">Junior High School</option>
                      <option value="Senior High School">Senior High School</option>
                    </select>
                  </div>
                  {(formDepartment.toLowerCase().includes('senior') || formDepartment.toLowerCase().includes('shs')) ? (
                    <div className="md:col-span-1 grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-indigo-950 mb-1">SHS Course *</label>
                        <select
                          value={formCourse}
                          onChange={(e) => {
                            const newCourse = e.target.value;
                            setFormCourse(newCourse);
                            setFormClassName(`${newCourse} ${formLevel}`);
                            setFormElectives([]);
                          }}
                          className="w-full px-3 py-2.5 border border-indigo-300 rounded-xl font-bold bg-white text-indigo-950"
                        >
                          {effectiveShsCourses.map(c => (
                            <option key={c.id} value={c.name}>{c.name} ({c.code})</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block font-bold text-indigo-950 mb-1">SHS Level *</label>
                        <select
                          value={formLevel}
                          onChange={(e) => {
                            const lvl = e.target.value as '1' | '2' | '3';
                            setFormLevel(lvl);
                            setFormClassName(`${formCourse} ${lvl}`);
                          }}
                          className="w-full px-3 py-2.5 border border-indigo-300 rounded-xl font-bold bg-white text-indigo-950"
                        >
                          <option value="1">Form 1 (SHS 1)</option>
                          <option value="2">Form 2 (SHS 2)</option>
                          <option value="3">Form 3 (SHS 3)</option>
                        </select>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Admission Class *</label>
                      <select
                        value={formClassName}
                        onChange={(e) => setFormClassName(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-indigo-700"
                      >
                        {getAdminClassesForDept(formDepartment).map(cls => (
                          <option key={cls} value={cls}>{cls}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {(formDepartment.toLowerCase().includes('senior') || formDepartment.toLowerCase().includes('shs')) && (
                    <div className="md:col-span-2 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl space-y-3">
                      <label className="block font-bold text-indigo-900 text-[11px] uppercase tracking-wider">
                        Select SHS Elective Subjects (Max 4)
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {getAvailableElectives(formCourse).map(elec => (
                          <label 
                            key={elec} 
                            className={`flex items-center gap-2 p-2 rounded-xl border transition-all cursor-pointer ${
                              formElectives.includes(elec) 
                                ? 'bg-indigo-600 border-indigo-600 text-white' 
                                : 'bg-white border-indigo-200 text-indigo-900 hover:border-indigo-400'
                            }`}
                          >
                            <input
                              type="checkbox"
                              className="hidden"
                              checked={formElectives.includes(elec)}
                              onChange={() => {
                                if (formElectives.includes(elec)) {
                                  setFormElectives(prev => prev.filter(e => e !== elec));
                                } else if (formElectives.length < 4) {
                                  setFormElectives(prev => [...prev, elec]);
                                }
                              }}
                            />
                            <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${
                              formElectives.includes(elec) ? 'bg-white border-white' : 'border-indigo-300'
                            }`}>
                              {formElectives.includes(elec) && <Check className="w-2.5 h-2.5 text-indigo-600" />}
                            </div>
                            <span className="text-[10px] font-bold truncate">{elec}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Parent Information */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
              <h3 className="font-bold text-slate-900 uppercase tracking-wider text-emerald-700">
                2. Parent / Guardian Contact & Emergency Info
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Parent / Guardian Full Name</label>
                  <input
                    type="text"
                    value={formParentName}
                    onChange={(e) => setFormParentName(e.target.value)}
                    placeholder="e.g. Mr. Emmanuel Mensah"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Primary Mobile Phone (the region Telco) *</label>
                  <input
                    type="text"
                    required
                    value={formParentPhone}
                    onChange={(e) => setFormParentPhone(e.target.value)}
                    placeholder="e.g. 0249755593"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-900"
                  />
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="submit"
                id="btn-complete-student-enrollment"
                disabled={isSubmittingStudent}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-70 text-white rounded-xl font-bold shadow-sm flex items-center gap-2 cursor-pointer transition-colors"
              >
                {isSubmittingStudent ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Enrolling Student...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Complete Student Enrollment</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Approval & Action Notification Toast */}
      {approvalToast && (
        <div className="bg-emerald-600 text-white px-4 py-3 rounded-xl text-xs font-bold flex items-center justify-between shadow-lg animate-fade-in">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{approvalToast}</span>
          </span>
          <button onClick={() => setApprovalToast(null)} className="text-white font-black ml-4 cursor-pointer">✕</button>
        </div>
      )}

      {/* 2. ENROLLED STUDENTS MODULE */}
      {(activeModule === 'student_enrolled' || activeModule === 'enrolled_students' || activeModule === 'students') && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
          
          {/* Pending Admissions Alert Banner if pending applications exist */}
          {pendingAdmissions.length > 0 && (
            <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-l-4 border-amber-500 p-4 rounded-xl flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-amber-950">
                    {pendingAdmissions.length} Student Admission{pendingAdmissions.length > 1 ? 's' : ''} Awaiting Admin Approval
                  </h4>
                  <p className="text-[11px] text-amber-800">
                    Teachers submitted new student applications that need administrative verification & admission number assignment.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setStatusFilter('Pending')}
                className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <UserCheck className="w-3.5 h-3.5" /> Review Pending ({pendingAdmissions.length})
              </button>
            </div>
          )}

          {cleanToastMsg && (
            <div className="bg-emerald-50 text-emerald-900 border border-emerald-300 px-4 py-3 rounded-xl text-xs font-bold flex items-center justify-between shadow-sm animate-fade-in">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>{cleanToastMsg}</span>
              </div>
              <button onClick={() => setCleanToastMsg(null)} className="text-emerald-700 hover:text-emerald-900 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="flex flex-wrap justify-between items-center gap-3 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                Enrolled Students Master Register
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Official the regionian GES student records, admission IDs, class distribution, and parent contacts.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                id="btn-export-students-excel"
                onClick={() => exportStudentsToExcel(studentsList)}
                className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 cursor-pointer transition-colors border border-emerald-600"
                title="Download full student directory as Microsoft Excel spreadsheet (.xlsx)"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-200" />
                <span>Export to Excel (.xlsx)</span>
              </button>

              <button
                type="button"
                id="btn-export-students-pdf"
                onClick={handleExportToPdf}
                disabled={isExportingPdf}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 cursor-pointer transition-colors border border-slate-700"
                title="Export printable summary of current student data table using jsPDF"
              >
                <Printer className={`w-3.5 h-3.5 ${isExportingPdf ? 'animate-bounce' : ''}`} />
                <span>{isExportingPdf ? 'Generating PDF...' : 'Export to PDF'}</span>
              </button>

              <button
                type="button"
                id="btn-export-class-roster"
                onClick={() => setShowClassExportModal(true)}
                className="px-3.5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 cursor-pointer transition-colors border border-purple-600"
                title="Export student admission details on a class basis"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Class Admission Export</span>
              </button>

              {!isReadOnly && (
                <>
                  <button
                    type="button"
                    id="btn-batch-import-csv"
                    onClick={() => {
                      setBatchCsvText('');
                      setBatchImportSuccess(null);
                      setBatchImportError(null);
                      setBatchImportProgress(null);
                      setShowBatchCsvModal(true);
                    }}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 cursor-pointer transition-colors border border-indigo-500"
                    title="Paste CSV text to batch import students directly to Firebase"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Batch Import (CSV)</span>
                  </button>

                  {onCleanOrphaned && (
                    <button
                      type="button"
                      id="btn-quick-clean-students"
                      onClick={handleTriggerQuickClean}
                      disabled={isCleaningOrphanedLocal}
                      className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 cursor-pointer transition-colors border border-amber-500"
                      title="Remove orphaned bills and reports for deleted students"
                    >
                      <Sparkles className={`w-3.5 h-3.5 ${isCleaningOrphanedLocal ? 'animate-spin' : ''}`} />
                      <span>{isCleaningOrphanedLocal ? 'Cleaning...' : 'Quick Clean'}</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setEditingStudent(null);
                      setFormFullName('');
                      setFormGender('Male');
                      setFormDob('2020-05-15');
                      setFormAdmissionDate(new Date().toISOString().split('T')[0]);
                      setFormDepartment('Primary School');
                      setFormClassName('Basic 1');
                      setFormHouse('Blue');
                      setFormParentName('');
                      setFormParentPhone('');
                      setShowEnrollModal(true);
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Enroll Student
                  </button>
                </>
              )}
            </div>
          </div>

          {pilotImportToast && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center justify-between shadow-sm animate-fadeIn">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{pilotImportToast}</span>
              </div>
              <button onClick={() => setPilotImportToast(null)} className="text-emerald-500 hover:text-emerald-700">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Status Tabs */}
          <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              All Records ({effectiveStudentsList.length})
            </button>
            <button
              onClick={() => setStatusFilter('Active')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                statusFilter === 'Active'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              Active Students ({effectiveStudentsList.filter(s => s.status === 'Active' && s.approvalStatus !== 'Pending').length})
            </button>
            <button
              onClick={() => setStatusFilter('Pending')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'Pending'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Pending Admissions ({pendingAdmissions.length})</span>
            </button>
            <button
              onClick={() => setStatusFilter('Transfers')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'Transfers'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200'
              }`}
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>Transfers & Leaving Certificates</span>
            </button>
          </div>

          {statusFilter === 'Transfers' ? (
            <StudentTransferManager
              students={effectiveStudentsList}
              onUpdateStudent={onUpdateStudent}
            />
          ) : (
            <>

          {/* Bulk Selection Actions Toolbar */}
          {!isReadOnly && selectedStudentIds.length > 0 && (
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 rounded-xl border border-indigo-500/30 shadow-lg flex flex-wrap items-center justify-between gap-4 animate-fade-in sticky top-2 z-20">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-600/40 border border-indigo-400/40 flex items-center justify-center text-indigo-200 font-black text-xs">
                  {selectedStudentIds.length}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-2">
                    <span>{selectedStudentIds.length} Student{selectedStudentIds.length > 1 ? 's' : ''} Selected</span>
                    {selectedPendingStudents.length > 0 && (
                      <span className="text-[10px] bg-amber-500/30 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-bold">
                        {selectedPendingStudents.length} Pending Approval
                      </span>
                    )}
                  </h4>
                  <p className="text-[11px] text-slate-300">
                    Perform batch admission approval or bulk record deletion for all selected profiles.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {selectedPendingStudents.length > 0 && (
                  <button
                    onClick={handleBulkApproveStudents}
                    disabled={isBulkProcessing}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-2 shadow-sm cursor-pointer"
                  >
                    {isBulkProcessing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCheck className="w-4 h-4 text-emerald-200" />
                    )}
                    <span>Approve Selected ({selectedPendingStudents.length})</span>
                  </button>
                )}

                <button
                  onClick={() => setShowBulkDeleteModal(true)}
                  disabled={isBulkProcessing}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-2 shadow-sm cursor-pointer"
                >
                  <Trash2 className="w-4 h-4 text-rose-200" />
                  <span>Delete Selected ({selectedStudentIds.length})</span>
                </button>

                <button
                  onClick={handleClearSelection}
                  disabled={isBulkProcessing}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-all border border-slate-700 cursor-pointer"
                >
                  Deselect All
                </button>
              </div>
            </div>
          )}

          {/* Filter Bar */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-wrap gap-4 items-center justify-between text-xs">
            <div className="flex flex-wrap gap-3 items-center flex-1">
              <div className="relative min-w-[220px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search student, adm no, parent..."
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium"
                />
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <select
                  value={deptFilter}
                  onChange={(e) => {
                    setDeptFilter(e.target.value);
                    setClassFilter('all');
                  }}
                  className="px-3 py-2 bg-blue-50 border border-blue-200 text-blue-900 rounded-xl text-xs font-bold"
                >
                  <option value="all">All Departments</option>
                  <option value="Pre-School">Pre-School</option>
                  <option value="Primary School">Primary School</option>
                  <option value="Junior High School">Junior High School</option>
                  <option value="Senior High School">Senior High School</option>
                </select>

                <select
                  value={classFilter}
                  onChange={(e) => setClassFilter(e.target.value)}
                  className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold"
                >
                  <option value="all">All {deptFilter !== 'all' ? `${deptFilter} ` : ''}Classes ({filteredStudents.length})</option>
                  {availableClassNames.map(c => {
                    const count = effectiveStudentsList.filter(s => s.className === c).length;
                    return (
                      <option key={c} value={c}>
                        {c} ({count})
                      </option>
                    );
                  })}
                </select>

                {classFilter !== 'all' && (
                  <div className="flex items-center gap-1.5 animate-fadeIn">
                    <button
                      type="button"
                      id="btn-quick-export-class-pdf"
                      onClick={() => handleExportClassAdmissionDetails(classFilter, 'pdf')}
                      className="px-2.5 py-2 bg-purple-100 hover:bg-purple-200 text-purple-900 border border-purple-300 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      title={`Export PDF Admission Register for ${classFilter}`}
                    >
                      <Printer className="w-3.5 h-3.5 text-purple-700" />
                      <span>{classFilter} PDF</span>
                    </button>
                    <button
                      type="button"
                      id="btn-quick-export-class-csv"
                      onClick={() => handleExportClassAdmissionDetails(classFilter, 'csv')}
                      className="px-2.5 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      title={`Export CSV Admission Details for ${classFilter}`}
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                      <span>{classFilter} CSV</span>
                    </button>
                  </div>
                )}
              </div>
              <div>
                <select
                  value={courseFilter}
                  onChange={(e) => setCourseFilter(e.target.value)}
                  className="px-3 py-2 bg-indigo-50 border border-indigo-200 text-indigo-900 rounded-xl text-xs font-bold"
                >
                  <option value="all">All SHS Courses</option>
                  {effectiveShsCourses.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <select
                  value={genderFilter}
                  onChange={(e) => setGenderFilter(e.target.value)}
                  className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold"
                >
                  <option value="all">All Genders</option>
                  <option value="Male">Boys (Male)</option>
                  <option value="Female">Girls (Female)</option>
                </select>
              </div>
            </div>
            <div className="text-slate-500 font-medium flex items-center gap-2">
              <span>Showing <strong>{filteredStudents.length}</strong> of <strong>{effectiveStudentsList.length}</strong> students</span>
              {filteredStudents.length > 50 && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 shadow-2xs">
                  <Zap className="w-3 h-3 text-emerald-600 animate-pulse" /> Virtualized List (High Performance)
                </span>
              )}
            </div>
          </div>

          {/* Desktop Table (Virtualized Engine) */}
          <div ref={studentTableParentRef} className="hidden md:block border border-slate-200 rounded-xl overflow-x-auto max-h-[680px] overflow-y-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-900 text-white uppercase text-[10px] font-bold sticky top-0 z-10 shadow-xs">
                <tr>
                  {!isReadOnly && (
                    <th className="p-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={isAllFilteredSelected}
                        onChange={handleToggleSelectAll}
                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        title="Select or deselect all visible students"
                      />
                    </th>
                  )}
                  <th className="p-3">#</th>
                  <th className="p-3">Admission No</th>
                  <th className="p-3">Student Full Name</th>
                  <th className="p-3">Class / SHS Course</th>
                  <th className="p-3">Gender</th>
                  <th className="p-3">Parent & Contact</th>
                  <th className="p-3">Status</th>
                  {!isReadOnly && <th className="p-3 text-center">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400">
                      No student records found matching your search filters.
                    </td>
                  </tr>
                ) : (() => {
                  const virtualRows = studentRowVirtualizer.getVirtualItems();
                  const totalSize = studentRowVirtualizer.getTotalSize();
                  const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0;
                  const paddingBottom = virtualRows.length > 0 ? totalSize - virtualRows[virtualRows.length - 1].end : 0;

                  return (
                    <>
                      {paddingTop > 0 && (
                        <tr>
                          <td colSpan={9} style={{ height: `${paddingTop}px` }} />
                        </tr>
                      )}
                      {virtualRows.map((virtualRow) => {
                        const st = filteredStudents[virtualRow.index];
                        const idx = virtualRow.index;
                        const isPending = st.status === 'Pending' || st.approvalStatus === 'Pending' || st.isApproved === false;
                        const isShs = st.department === 'Senior High School' || !!st.course || courses.some(c => st.className?.toLowerCase().includes(c.name.toLowerCase()));
                        const isSelected = selectedStudentIds.includes(st.id);

                        return (
                          <tr 
                            key={st.id} 
                            data-index={virtualRow.index} 
                            ref={studentRowVirtualizer.measureElement} 
                            className={`hover:bg-slate-50 transition-colors ${isSelected ? 'bg-indigo-50/60' : isPending ? 'bg-amber-50/40' : ''}`}
                          >
                            {!isReadOnly && (
                              <td className="p-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleSelectStudent(st.id)}
                                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                />
                              </td>
                            )}
                            <td className="p-3 font-mono text-slate-400">{idx + 1}</td>
                            <td className="p-3 font-mono font-bold">
                              {isPending ? (
                                <span className="text-amber-800 bg-amber-100 px-2 py-0.5 rounded text-[10px]">
                                  {st.admissionNo || 'PENDING'}
                                </span>
                              ) : (
                                <span className="text-indigo-700">{st.admissionNo}</span>
                              )}
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-3">
                                <img
                                  src={st.photo || 'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=150&auto=format&fit=crop&q=80'}
                                  alt={st.fullName}
                                  className="w-8 h-8 rounded-full object-cover border border-slate-200"
                                />
                                <div 
                                  className="cursor-pointer group"
                                  onClick={() => onManageFees && onManageFees(st)}
                                >
                                  <span className="font-bold text-slate-900 block group-hover:text-indigo-600 transition-colors">{st.fullName}</span>
                                  {st.enrolledBy && (
                                    <span className="text-[10px] text-slate-400">
                                      Submitted by: {st.enrolledBy}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="flex flex-col gap-0.5">
                                <span className="font-semibold text-slate-800">{st.className}</span>
                                {isShs ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200 w-fit">
                                    <BookOpen className="w-2.5 h-2.5" /> SHS: {st.course || st.className.split(' ').slice(0, -1).join(' ') || 'Course'}
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-400">{st.house} House</span>
                                )}
                                <div className="mt-1">
                                  <span className={`inline-flex items-center text-[9px] font-black tracking-wider px-1.5 py-0.5 rounded border uppercase leading-none ${
                                    st.campus === 'JIPAS 2' 
                                      ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/20 dark:text-purple-300 dark:border-purple-800' 
                                      : 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/20 dark:text-teal-300 dark:border-teal-800'
                                  }`}>
                                    {st.campus || 'JIPAS 1'}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                st.gender === 'Male' ? 'bg-blue-100 text-blue-800' : 'bg-rose-100 text-rose-800'
                              }`}>
                                {st.gender}
                              </span>
                            </td>
                            <td className="p-3 text-slate-600">
                              <div className="font-medium text-slate-900">{st.parentName || 'Parent'}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{st.parentPhone}</div>
                            </td>
                            <td className="p-3">
                              {isPending ? (
                                <span className="bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 w-fit">
                                  <Clock className="w-3 h-3" /> Awaiting Approval
                                </span>
                              ) : st.status === 'Inactive' ? (
                                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold">
                                  Inactive
                                </span>
                              ) : (
                                <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-bold">
                                  Active
                                </span>
                              )}
                            </td>
                            {!isReadOnly && (
                              <td className="p-3 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  {isPending ? (
                                    <>
                                      <button
                                        onClick={() => {
                                          setApprovingStudent(st);
                                          const autoAdmNo = (st.admissionNo && !st.admissionNo.includes('PENDING')) 
                                            ? st.admissionNo 
                                            : generateUniqueAdmissionNo(studentsList);
                                          setAssignedAdmNo(autoAdmNo);
                                        }}
                                        title="Approve & Enroll Student"
                                        className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                                      >
                                        <CheckCheck className="w-3.5 h-3.5" /> Approve
                                      </button>
                                      <button
                                        onClick={() => handleRejectAdmission(st)}
                                        title="Decline Admission"
                                        className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                                      >
                                        <XCircle className="w-3.5 h-3.5" />
                                      </button>
                                    </>
                                  ) : null}

                                  <button
                                    onClick={() => {
                                      setIndividualPromoteStudent(st);
                                      setIndividualPromoteTarget(st.className);
                                    }}
                                    title="Promote or Repeat Student"
                                    className="p-1.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                                  >
                                    <ArrowUpRight className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setSelectedIDCardRecord(st)}
                                    title="Generate & Print ID Card"
                                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                                  >
                                    <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
                                  </button>
                                  <button
                                    onClick={() => setDocumentVerificationStudent(st)}
                                    title="Verify Student Documents (Birth Cert, Immunization, BECE, Reports)"
                                    className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                                  >
                                    <FileCheck className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setAdmissionLetterStudent(st)}
                                    title="Print Official Admission Letter"
                                    className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                                  >
                                    <GraduationCap className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleOpenEditStudent(st)}
                                    title="Edit Student Record"
                                    className="p-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setDeletingStudent(st)}
                                    title="Delete Student Record"
                                    className="p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                      {paddingBottom > 0 && (
                        <tr>
                          <td colSpan={9} style={{ height: `${paddingBottom}px` }} />
                        </tr>
                      )}
                    </>
                  );
                })()}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View */}
          <div className="md:hidden space-y-3">
            {filteredStudents.length === 0 ? (
              <div className="p-6 text-center text-slate-400 font-semibold bg-white border border-slate-200 rounded-2xl">
                No student records found matching your search filters.
              </div>
            ) : (
              filteredStudents.map((st) => {
                const isPending = st.status === 'Pending' || st.approvalStatus === 'Pending' || st.isApproved === false;
                const isSelected = selectedStudentIds.includes(st.id);
                return (
                  <div key={st.id} className={`p-4 bg-white border rounded-2xl shadow-xs space-y-3 ${isSelected ? 'border-indigo-500 bg-indigo-50/20 ring-1 ring-indigo-500/30' : isPending ? 'border-amber-300 bg-amber-50/20' : 'border-slate-200'}`}>
                    <div className="flex items-center gap-3">
                      {!isReadOnly && (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectStudent(st.id)}
                          className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer shrink-0"
                        />
                      )}
                      <img
                        src={st.photo || 'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=150&auto=format&fit=crop&q=80'}
                        alt={st.fullName}
                        className="w-12 h-12 rounded-2xl object-cover border-2 border-indigo-100 shrink-0"
                      />
                      <div 
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => onManageFees && onManageFees(st)}
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="font-extrabold text-slate-900 text-sm truncate group-hover:text-indigo-600">{st.fullName}</h4>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            st.gender === 'Male' ? 'bg-blue-100 text-blue-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {st.gender}
                          </span>
                        </div>
                        <p className="text-xs text-indigo-700 font-mono font-bold mt-0.5">{st.admissionNo}</p>
                        <p className="text-[11px] text-slate-500 font-semibold">{st.className} • {st.house} House</p>
                        {st.enrolledBy && (
                          <p className="text-[10px] text-amber-800 font-medium">Submitted by: {st.enrolledBy}</p>
                        )}
                      </div>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs space-y-1">
                      <div className="text-slate-700 font-medium">Parent: <strong>{st.parentName || 'Parent'}</strong></div>
                      <div className="text-slate-500 font-mono text-[11px]">Phone: {st.parentPhone}</div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      {isPending ? (
                        <span className="bg-amber-100 text-amber-800 border border-amber-200 px-2.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Awaiting Approval
                        </span>
                      ) : (
                        <span className="bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded text-[10px] font-bold">
                          Active
                        </span>
                      )}
                      
                      {!isReadOnly && (
                        <div className="flex items-center gap-2">
                          {isPending && (
                            <button
                              onClick={() => {
                                setApprovingStudent(st);
                                const autoAdmNo = (st.admissionNo && !st.admissionNo.includes('PENDING')) 
                                  ? st.admissionNo 
                                  : generateUniqueAdmissionNo(studentsList);
                                setAssignedAdmNo(autoAdmNo);
                              }}
                              className="px-2.5 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <CheckCheck className="w-3.5 h-3.5" /> Approve
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setIndividualPromoteStudent(st);
                              setIndividualPromoteTarget(st.className);
                            }}
                            className="px-3 py-1.5 bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <ArrowUpRight className="w-3.5 h-3.5" /> Promote
                          </button>
                          <button
                            onClick={() => setSelectedIDCardRecord(st)}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer border border-slate-200"
                          >
                            <CreditCard className="w-3.5 h-3.5 text-indigo-600" /> ID Card
                          </button>
                          <button
                            onClick={() => setDocumentVerificationStudent(st)}
                            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer border border-blue-200"
                          >
                            <FileCheck className="w-3.5 h-3.5" /> Docs
                          </button>
                          <button
                            onClick={() => setAdmissionLetterStudent(st)}
                            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer border border-emerald-200"
                          >
                            <GraduationCap className="w-3.5 h-3.5" /> Letter
                          </button>
                          <button
                            onClick={() => handleOpenEditStudent(st)}
                            className="px-3 py-1.5 bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" /> Edit
                          </button>
                          <button
                            onClick={() => setDeletingStudent(st)}
                            className="px-3 py-1.5 bg-rose-600 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination Load More Button */}
          {hasMore && !debouncedSearchQuery && classFilter === 'all' && genderFilter === 'all' && statusFilter === 'all' && (
            <div className="flex justify-center pt-8 pb-4">
              <button
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-sm font-bold transition-all border border-indigo-500 flex items-center gap-2 shadow-md hover:shadow-lg disabled:opacity-50"
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Loading more students...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-5 h-5" />
                    <span>Load More Student Records</span>
                  </>
                )}
              </button>
            </div>
          )}
          </>
        )}
        </div>
      )}

      {/* 3. STUDENT ID CARDS MODULE */}
      {activeModule === 'student_id_cards' && (() => {
        const classFilteredStudents = idCardClassFilter === 'All Classes'
          ? studentsList
          : studentsList.filter(s => s.className.toLowerCase() === idCardClassFilter.toLowerCase());

        return (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
            <div className="flex flex-wrap justify-between items-center gap-3 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-indigo-600" />
                  Student Identification Card Generator
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Set issue and expiry dates, filter by class, and print official JIPAS student identity badges.
                </p>
              </div>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Printer className="w-4 h-4" /> Print ID Cards ({classFilteredStudents.length})
              </button>
            </div>

            {/* Admin Setup Bar for Class ID Cards */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Target Class / Stream</label>
                <select
                  value={idCardClassFilter}
                  onChange={(e) => setIdCardClassFilter(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900"
                >
                  <option value="All Classes">All Classes (Entire School)</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Date of Issue</label>
                <input
                  type="date"
                  value={idCardIssueDate}
                  onChange={(e) => setIdCardIssueDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-900"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Expiry Date</label>
                <input
                  type="date"
                  value={idCardExpiryDate}
                  onChange={(e) => setIdCardExpiryDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {classFilteredStudents.map((st) => (
                <div
                  key={st.id}
                  className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-2xl p-5 shadow-md border border-indigo-800 space-y-4 relative overflow-hidden cursor-pointer hover:border-indigo-500 transition-all"
                  onClick={() => setSelectedIDCardRecord(st)}
                >
                  {/* Header */}
                  <div className="flex justify-between items-center border-b border-indigo-800/80 pb-3">
                    <div className="flex items-center gap-2">
                      <JIPASLogo size="xs" />
                      <div>
                        <h4 className="font-black text-sm tracking-wider text-amber-400 leading-tight">JIPAS</h4>
                        <p className="text-[9px] text-indigo-200 uppercase tracking-widest font-semibold">Student Identity Badge</p>
                      </div>
                    </div>
                    <div className="w-7 h-7 bg-white/10 rounded-lg flex items-center justify-center">
                      <GraduationCap className="w-4 h-4 text-amber-300" />
                    </div>
                  </div>

                  {/* Body with Photo & Full Bio-data */}
                  <div className="flex gap-3.5 items-start">
                    <img
                      src={st.photo || 'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=150&auto=format&fit=crop&q=80'}
                      alt={st.fullName}
                      className="w-16 h-16 rounded-xl object-cover border-2 border-amber-400 shadow-sm shrink-0 mt-0.5"
                    />
                    <div className="space-y-0.5 overflow-hidden flex-1 text-[11px]">
                      <h5 className="font-black text-xs text-white truncate">{st.fullName}</h5>
                      <p className="text-[11px] font-mono font-bold text-amber-300">{st.admissionNo}</p>
                      <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[9.5px] text-indigo-200 pt-1">
                        <span>Class: <strong className="text-white">{st.className}</strong></span>
                        <span>Campus: <strong className="text-white">{st.campus || 'JIPAS 1'}</strong></span>
                        <span>DOB: <strong className="text-white">{st.dob || '14/05/2012'}</strong></span>
                        <span>Gender: <strong className="text-white">{st.gender || 'Male'}</strong></span>
                        <span>Nationality: <strong className="text-white">{st.nationality || 'Ghanaian'}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Footer Bar */}
                  <div className="bg-white/10 rounded-xl p-2.5 flex justify-between items-center text-[10px]">
                    <div>
                      <span className="text-indigo-300 block text-[8px] uppercase font-bold">Emergency Tel / Guardian:</span>
                      <span className="font-mono font-semibold text-white">{st.parentPhone || '0249755593'}</span>
                      {st.parentName && <span className="text-[8px] text-indigo-200 block truncate max-w-[140px]">({st.parentName})</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right text-[8px] text-indigo-300">
                        <span>VALID:</span>
                        <strong className="block text-white font-mono text-[8.5px]">{idCardIssueDate} → {idCardExpiryDate}</strong>
                      </div>
                      <div className="w-6 h-6 bg-white rounded p-0.5 flex items-center justify-center shrink-0">
                        <QrCode className="w-5 h-5 text-slate-900" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* 4. STUDENT ATTENDANCE MODULE */}
      {activeModule === 'student_attendance' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
          <div className="flex flex-wrap justify-between items-center gap-3 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-600" />
                Class-Wise Student Attendance Terminal
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Mark, compute, and log student attendance for terminal report calculation and statutory tracking.
              </p>
            </div>
            <button
              onClick={() => {
                setAttSavedToast(true);
                setTimeout(() => setAttSavedToast(false), 3000);
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Save className="w-4 h-4" /> Save Attendance Register
            </button>
          </div>

          {attSavedToast && (
            <div className="bg-emerald-600 text-white px-4 py-3 rounded-xl text-xs font-bold flex items-center justify-between shadow-sm animate-fade-in">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Attendance for {attClass} on {attDate} recorded and synchronized successfully!
              </span>
              <button onClick={() => setAttSavedToast(false)} className="text-white font-black ml-4">✕</button>
            </div>
          )}

          {/* Class & Date Controls */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-wrap gap-4 items-center text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Class</label>
              <select
                value={attClass}
                onChange={(e) => setAttClass(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-900"
              >
                <option value="Basic 1">Basic 1</option>
                <option value="Basic 2">Basic 2</option>
                <option value="Basic 3">Basic 3</option>
                <option value="Creche">Creche</option>
                <option value="JHS 1">JHS 1</option>
                <option value="JHS 2">JHS 2</option>
                <option value="JHS 3">JHS 3</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Date</label>
              <input
                type="date"
                value={attDate}
                onChange={(e) => setAttDate(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-900"
              />
            </div>
            <div className="pt-4 flex gap-2">
              <button
                onClick={() => {
                  const map: Record<string, 'Present' | 'Absent' | 'Late' | 'Excused'> = {};
                  studentsList.filter(s => s.className === attClass).forEach(s => {
                    map[s.id] = 'Present';
                  });
                  setStudentAttMap(prev => ({ ...prev, ...map }));
                }}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold cursor-pointer transition-colors"
              >
                Mark Class All Present
              </button>
            </div>
          </div>

          {/* Attendance Table */}
          <div className="border border-slate-200 rounded-xl overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-900 text-white uppercase text-[10px] font-bold">
                <tr>
                  <th className="p-3">#</th>
                  <th className="p-3">Admission No</th>
                  <th className="p-3">Student Name</th>
                  <th className="p-3">Gender</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {studentsList.filter(s => s.className === attClass).map((st, idx) => {
                  const status = studentAttMap[st.id] || 'Present';
                  return (
                    <tr key={st.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-mono text-slate-400">{idx + 1}</td>
                      <td className="p-3 font-mono font-bold text-indigo-700">{st.admissionNo}</td>
                      <td className="p-3 font-bold text-slate-900">{st.fullName}</td>
                      <td className="p-3">{st.gender}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          status === 'Present' ? 'bg-emerald-100 text-emerald-800' :
                          status === 'Late' ? 'bg-amber-100 text-amber-800' :
                          status === 'Absent' ? 'bg-rose-100 text-rose-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {status}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setStudentAttMap(prev => ({ ...prev, [st.id]: 'Present' }))}
                            className={`px-2 py-1 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                              status === 'Present' ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                          >
                            Present
                          </button>
                          <button
                            onClick={() => setStudentAttMap(prev => ({ ...prev, [st.id]: 'Late' }))}
                            className={`px-2 py-1 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                              status === 'Late' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                          >
                            Late
                          </button>
                          <button
                            onClick={() => setStudentAttMap(prev => ({ ...prev, [st.id]: 'Absent' }))}
                            className={`px-2 py-1 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                              status === 'Absent' ? 'bg-rose-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                          >
                            Absent
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. PROMOTE STUDENTS MODULE */}
      {(activeModule === 'student_promote' || activeModule === 'promote_students') && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
          <div className="flex justify-between items-center pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <ArrowUpRight className="w-5 h-5 text-indigo-600" />
                Student Promotion & Class Transition Workbench
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Bulk promote students to higher classes based on academic performance and annual review.
              </p>
            </div>
            <button
              onClick={handleExecutePromotion}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <ArrowUpRight className="w-4 h-4" /> Promote Selected ({selectedForPromotion.length})
            </button>
          </div>

          {promotionToast && (
            <div className="bg-emerald-600 text-white px-4 py-3 rounded-xl text-xs font-bold flex items-center justify-between shadow-sm animate-fade-in">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Promotion executed! Students updated to new class and logged in promotion history.
              </span>
              <button onClick={() => setPromotionToast(false)} className="text-white font-black ml-4">✕</button>
            </div>
          )}

          {/* Class Selectors */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Current Class (Source)</label>
              <select
                value={promoteSourceClass}
                onChange={(e) => setPromoteSourceClass(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-900"
              >
                <option value="Creche">Creche</option>
                <option value="Nursery 1">Nursery 1</option>
                <option value="Basic 1">Basic 1</option>
                <option value="Basic 2">Basic 2</option>
                <option value="Basic 3">Basic 3</option>
                <option value="JHS 1">JHS 1</option>
                <option value="JHS 2">JHS 2</option>
                <option value="JHS 3">JHS 3</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Promote To (Target Class)</label>
              <select
                value={promoteTargetClass}
                onChange={(e) => setPromoteTargetClass(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-indigo-700"
              >
                <option value="Nursery 1">Nursery 1</option>
                <option value="Basic 1">Basic 1</option>
                <option value="Basic 2">Basic 2</option>
                <option value="Basic 3">Basic 3</option>
                <option value="Basic 4">Basic 4</option>
                <option value="JHS 1">JHS 1</option>
                <option value="JHS 2">JHS 2</option>
                <option value="JHS 3">JHS 3</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Target Academic Year</label>
              <select
                value={promoteAcademicYear}
                onChange={(e) => setPromoteAcademicYear(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-indigo-700"
              >
                <option value="2025-2026">2025-2026</option>
                <option value="2026-2027">2026-2027</option>
              </select>
            </div>
          </div>
          
          <button
            onClick={handleBulkPromote}
            disabled={isBulkPromoting}
            className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all disabled:opacity-50"
          >
            {isBulkPromoting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUpRight className="w-4 h-4" />}
            Promote All Students from {promoteSourceClass} to {promoteTargetClass}
          </button>

          {/* Student selection table */}
          <div className="border border-slate-200 rounded-xl overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-900 text-white uppercase text-[10px] font-bold">
                <tr>
                  <th className="p-3 w-12 text-center">
                    <input
                      type="checkbox"
                      onChange={(e) => {
                        const classStudents = studentsList.filter(s => s.className === promoteSourceClass);
                        if (e.target.checked) {
                          setSelectedForPromotion(classStudents.map(s => s.id));
                        } else {
                          setSelectedForPromotion([]);
                        }
                      }}
                      className="w-4 h-4 rounded text-indigo-600"
                    />
                  </th>
                  <th className="p-3">Admission No</th>
                  <th className="p-3">Student Name</th>
                  <th className="p-3">Current Class</th>
                  <th className="p-3">Average Mark</th>
                  <th className="p-3">Promotion Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {studentsList.filter(s => s.className === promoteSourceClass).map((st) => (
                  <tr key={st.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        checked={selectedForPromotion.includes(st.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedForPromotion(prev => [...prev, st.id]);
                          } else {
                            setSelectedForPromotion(prev => prev.filter(id => id !== st.id));
                          }
                        }}
                        className="w-4 h-4 rounded text-indigo-600"
                      />
                    </td>
                    <td className="p-3 font-mono font-bold text-indigo-700">{st.admissionNo}</td>
                    <td className="p-3 font-bold text-slate-900">{st.fullName}</td>
                    <td className="p-3 text-slate-600">{st.className}</td>
                    <td className="p-3 font-mono font-bold text-emerald-700">82.4%</td>
                    <td className="p-3">
                      <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-bold">
                        Eligible for Promotion
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. PROMOTION HISTORY MODULE */}
      {(activeModule === 'student_promotion_history' || activeModule === 'promotion_history') && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
          <div className="flex justify-between items-center pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-600" />
                Class Promotion & Academic Progression Audit Logs
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Archived logs of all past promotion exercises, transferred batches, and authorized admin operators.
              </p>
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-900 text-white uppercase text-[10px] font-bold">
                <tr>
                  <th className="p-3">#</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Source Class</th>
                  <th className="p-3">Promoted To</th>
                  <th className="p-3 text-center">Students Promoted</th>
                  <th className="p-3">Academic Session</th>
                  <th className="p-3">Authorized By</th>
                  <th className="p-3">Notes</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {promotionHistory.map((rec, idx) => (
                  <tr key={rec.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-mono text-slate-400">{idx + 1}</td>
                    <td className="p-3 font-mono font-semibold text-slate-600">{rec.date}</td>
                    <td className="p-3 font-bold text-slate-800">{rec.fromClass}</td>
                    <td className="p-3 font-bold text-indigo-700">{rec.toClass}</td>
                    <td className="p-3 text-center font-bold font-mono text-emerald-700">{rec.studentCount}</td>
                    <td className="p-3 font-mono text-slate-500">{rec.academicYear}</td>
                    <td className="p-3 font-medium text-slate-800">{rec.promotedBy}</td>
                    <td className="p-3 text-slate-500 max-w-xs truncate">{rec.notes}</td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => {
                          setPromotionHistory(prev => prev.filter(p => p.id !== rec.id));
                          alert("Promotion log entry cleared.");
                        }}
                        className="p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                        title="Delete Log"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* EDIT STUDENT MODAL */}
      {(showEnrollModal || editingStudent) && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-indigo-600" />
                {editingStudent ? `Edit Student: ${editingStudent.fullName}` : 'Enroll New Student'}
              </h3>
              <button
                onClick={() => {
                  setShowEnrollModal(false);
                  setEditingStudent(null);
                }}
                className="text-slate-400 hover:text-slate-700 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveStudent} className="space-y-4 text-xs">
              {/* Photo Uploader */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <PhotoUploader
                  currentPhoto={formPhoto}
                  onPhotoChange={setFormPhoto}
                  entityType="student"
                  gender={formGender}
                  label="Student Passport Photograph"
                  size="md"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Last Name (Surname) *</label>
                  <input
                    type="text"
                    required
                    value={formLastName}
                    onChange={(e) => setFormLastName(e.target.value)}
                    placeholder="e.g. MENSAH"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-bold uppercase focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Other Names (First & Middle) *</label>
                  <input
                    type="text"
                    required
                    value={formOtherNames}
                    onChange={(e) => setFormOtherNames(e.target.value)}
                    placeholder="e.g. KOFI EMMANUEL"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-bold uppercase focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Gender</label>
                  <select
                    value={formGender}
                    onChange={(e) => setFormGender(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-semibold bg-white"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={formDob}
                    onChange={(e) => setFormDob(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nationality *</label>
                <select
                  value={formNationality}
                  onChange={(e) => setFormNationality(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-indigo-300 rounded-xl font-bold bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500"
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

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Admission Date / Date d'admission *
                </label>
                <input
                  type="date"
                  required
                  value={formAdmissionDate}
                  onChange={(e) => setFormAdmissionDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-indigo-300 rounded-xl font-bold text-indigo-900 focus:ring-2 focus:ring-indigo-500 bg-indigo-50/30"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Campus Assignment *</label>
                <select
                  value={formCampus}
                  onChange={(e) => setFormCampus(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 border border-indigo-300 rounded-xl bg-indigo-50/10 font-bold focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="JIPAS 1">JIPAS 1 (Main Campus)</option>
                  <option value="JIPAS 2">JIPAS 2 (Secondary Campus)</option>
                </select>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Academic Department *
                  </label>
                  <select
                    value={formDepartment}
                    onChange={(e) => {
                      const dept = e.target.value;
                      setFormDepartment(dept);
                      if (dept.toLowerCase().includes('senior') || dept.toLowerCase().includes('shs')) {
                        const defaultCourse = effectiveShsCourses[0]?.name || 'Science (General)';
                        setFormCourse(defaultCourse);
                        setFormClassName(`${defaultCourse} ${formLevel}`);
                      } else if (dept === 'Junior High School') {
                        setFormClassName('JHS 1');
                      } else if (dept === 'Pre-School / Kindergarten') {
                        setFormClassName('Creche');
                      } else {
                        setFormClassName('Basic 1');
                      }
                    }}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-bold bg-white text-slate-900"
                  >
                    <option value="Primary School">Primary School (Basic 1 - 6)</option>
                    <option value="Junior High School">Junior High School (JHS 1 - 3)</option>
                    <option value="Senior High School">Senior High School (SHS Programmes)</option>
                    <option value="Pre-School / Kindergarten">Pre-School / Kindergarten (Creche, Nursery, KG)</option>
                  </select>
                </div>

                {(formDepartment.toLowerCase().includes('senior') || formDepartment.toLowerCase().includes('shs')) ? (
                  <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-2xl space-y-4 animate-fade-in">
                    <div className="flex items-center gap-2 text-indigo-900 font-black text-xs">
                      <BookOpen className="w-4 h-4 text-indigo-600" />
                      <span>SHS Course & Level Placement</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-indigo-950 mb-1">SHS Course / Programme *</label>
                        <select
                          value={formCourse}
                          onChange={(e) => {
                            const newCourse = e.target.value;
                            setFormCourse(newCourse);
                            setFormClassName(`${newCourse} ${formLevel}`);
                            setFormElectives([]); // Reset electives when course changes
                          }}
                          className="w-full px-3 py-2 border border-indigo-300 rounded-xl font-bold bg-white text-indigo-950 focus:ring-2 focus:ring-indigo-500"
                        >
                          {effectiveShsCourses.map(c => (
                            <option key={c.id} value={c.name}>{c.name} ({c.code})</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block font-bold text-indigo-950 mb-1">SHS Level / Form *</label>
                        <select
                          value={formLevel}
                          onChange={(e) => {
                            const lvl = e.target.value as '1' | '2' | '3';
                            setFormLevel(lvl);
                            setFormClassName(`${formCourse} ${lvl}`);
                          }}
                          className="w-full px-3 py-2 border border-indigo-300 rounded-xl font-bold bg-white text-indigo-950 focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="1">Level 1 (SHS 1)</option>
                          <option value="2">Level 2 (SHS 2)</option>
                          <option value="3">Level 3 (SHS 3)</option>
                        </select>
                      </div>
                    </div>

                    {/* Dynamic Electives Selection */}
                    <div className="space-y-2">
                      <label className="block font-bold text-indigo-950 text-[11px] uppercase tracking-wider">
                        Select Elective Subjects (Max 4)
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {getAvailableElectives(formCourse).map(elec => (
                          <label 
                            key={elec} 
                            className={`flex items-center gap-2 p-2 rounded-lg border transition-all cursor-pointer ${
                              formElectives.includes(elec) 
                                ? 'bg-indigo-600 border-indigo-600 text-white' 
                                : 'bg-white border-indigo-200 text-indigo-900 hover:border-indigo-400'
                            }`}
                          >
                            <input
                              type="checkbox"
                              className="hidden"
                              checked={formElectives.includes(elec)}
                              onChange={() => {
                                if (formElectives.includes(elec)) {
                                  setFormElectives(prev => prev.filter(e => e !== elec));
                                } else {
                                  if (formElectives.length < 4) {
                                    setFormElectives(prev => [...prev, elec]);
                                  } else {
                                    alert("Maximum 4 elective subjects allowed.");
                                  }
                                }
                              }}
                            />
                            <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${
                              formElectives.includes(elec) ? 'bg-white border-white' : 'border-indigo-300'
                            }`}>
                              {formElectives.includes(elec) && <Check className="w-2.5 h-2.5 text-indigo-600" />}
                            </div>
                            <span className="text-[11px] font-bold truncate">{elec}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="text-[11px] font-semibold text-indigo-800 bg-white/80 p-2 rounded-lg border border-indigo-100 flex items-center justify-between">
                      <span>Assigned Class Stream:</span>
                      <strong className="text-indigo-950 font-black px-2 py-0.5 bg-indigo-100 rounded text-xs">
                        {formCourse} {formLevel}
                      </strong>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Assigned Class *</label>
                      <select
                        value={formClassName}
                        onChange={(e) => setFormClassName(e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-semibold bg-white"
                      >
                        {getAdminClassesForDept(formDepartment).map(cls => (
                          <option key={cls} value={cls}>{cls}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Parent / Guardian Name</label>
                  <input
                    type="text"
                    value={formParentName}
                    onChange={(e) => setFormParentName(e.target.value)}
                    placeholder="e.g. Mr. Addo Paul"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Parent Phone *</label>
                  <input
                    type="text"
                    required
                    value={formParentPhone}
                    onChange={(e) => setFormParentPhone(e.target.value)}
                    placeholder="0241234567"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-mono font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowEnrollModal(false);
                    setEditingStudent(null);
                  }}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-sm cursor-pointer transition-colors"
                >
                  {editingStudent ? 'Update Student Record' : 'Enroll Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* APPROVE STUDENT ADMISSION MODAL */}
      {approvingStudent && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <CheckCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Approve Student Admission</h3>
                  <p className="text-[11px] text-slate-500">Confirm official admission and assign register number</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setApprovingStudent(null)}
                className="text-slate-400 hover:text-slate-700 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-2">
              <div className="flex items-center gap-3">
                <img
                  src={approvingStudent.photo || 'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=150&auto=format&fit=crop&q=80'}
                  alt={approvingStudent.fullName}
                  className="w-12 h-12 rounded-xl object-cover border border-slate-200"
                />
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm">{approvingStudent.fullName}</h4>
                  <p className="text-slate-600 font-semibold">{approvingStudent.className} • {approvingStudent.gender}</p>
                  {approvingStudent.enrolledBy && (
                    <p className="text-[10px] text-indigo-600 font-medium">Submitted by: {approvingStudent.enrolledBy}</p>
                  )}
                </div>
              </div>
              <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-600">
                Parent: <strong>{approvingStudent.parentName || 'Parent'}</strong> ({approvingStudent.parentPhone})
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Official Admission Number *
              </label>
              <input
                type="text"
                required
                value={assignedAdmNo}
                onChange={(e) => setAssignedAdmNo(e.target.value)}
                placeholder="e.g. JIPAS/2026/0001"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-mono font-bold text-indigo-700 text-xs focus:ring-2 focus:ring-emerald-500"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                You can keep this automatically generated sequence or assign a custom GES admission code.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setApprovingStudent(null)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleApproveAdmission(approvingStudent)}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer transition-colors flex items-center gap-1.5"
              >
                <CheckCheck className="w-3.5 h-3.5" /> Approve & Enrol Student
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BULK STUDENT IMPORT MODAL DIRECTLY TO FIREBASE */}
      <BulkStudentUploadModal
        isOpen={showBatchCsvModal}
        onClose={() => setShowBatchCsvModal(false)}
        onAddStudent={onAddStudent}
        onSuccess={(count) => {
          setShowBatchCsvModal(false);
          setStudentsList(getStoredStudents());
        }}
      />

      {/* INDIVIDUAL PROMOTE/REPEAT MODAL */}
      {individualPromoteStudent && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setIndividualPromoteStudent(null)}
        >
          <div 
            className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-in"
            onClick={e => e.stopPropagation()}
          >
            <div className="bg-slate-50 border-b border-slate-100 p-4 sm:p-6 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <ArrowUpRight className="w-5 h-5 text-indigo-600" />
                  Promote / Repeat Student
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  Adjust academic level for {individualPromoteStudent.fullName}
                </p>
              </div>
              <button 
                onClick={() => setIndividualPromoteStudent(null)}
                className="w-8 h-8 flex items-center justify-center bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-full transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-4 sm:p-6 space-y-4 text-sm font-medium">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">Current Class</span>
                  <span className="font-bold text-slate-900">{individualPromoteStudent.className}</span>
                </div>
                <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                  <span className="block text-[10px] text-indigo-600 uppercase tracking-wider mb-1">Target Class</span>
                  <select
                    value={individualPromoteTarget}
                    onChange={(e) => setIndividualPromoteTarget(e.target.value)}
                    className="w-full bg-transparent font-bold text-indigo-900 outline-none"
                  >
                    {classes.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="bg-blue-50 text-blue-800 p-4 rounded-xl text-xs flex gap-3 items-start border border-blue-100">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <p>
                  Setting the target class to the <strong>same class</strong> will record this action as a "Repeat". Moving them to a higher class records it as a "Promotion".
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setIndividualPromoteStudent(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const isRepeat = individualPromoteStudent.className === individualPromoteTarget;
                    const actionLabel = isRepeat ? 'Repeated' : 'Promoted';
                    
                    setStudentsList(prev => prev.map(s => {
                      if (s.id === individualPromoteStudent.id) {
                        return { ...s, className: individualPromoteTarget };
                      }
                      return s;
                    }));
                    
                    const newLog: PromotionRecord = {
                      id: `pr-${Date.now()}`,
                      date: new Date().toISOString().split('T')[0],
                      fromClass: individualPromoteStudent.className,
                      toClass: individualPromoteTarget,
                      academicYear: '2025-2026',
                      studentCount: 1,
                      promotedBy: 'Marcus Prosper (Admin)',
                      notes: `${actionLabel} ${individualPromoteStudent.fullName} ${isRepeat ? 'in' : 'from'} ${individualPromoteStudent.className} ${isRepeat ? '' : `to ${individualPromoteTarget}`}`
                    };
                    
                    setPromotionHistory(prev => [newLog, ...prev]);
                    setIndividualPromoteStudent(null);
                    setPromotionToast(true);
                    setTimeout(() => setPromotionToast(false), 4000);
                  }}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors text-sm"
                >
                  {individualPromoteStudent.className === individualPromoteTarget ? 'Repeat Student' : 'Promote Student'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EXPORT CLASS ADMISSION DETAILS MODAL */}
      {showClassExportModal && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setShowClassExportModal(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-purple-100 text-purple-700 rounded-xl">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Export Class Admission Details</h3>
                  <p className="text-xs text-slate-500">Generate class-based student rosters & admission details</p>
                </div>
              </div>
              <button 
                onClick={() => setShowClassExportModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  Select Target Class:
                </label>
                <select
                  value={exportClassTarget}
                  onChange={(e) => setExportClassTarget(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800"
                >
                  <option value="all">All Classes Master Export ({effectiveStudentsList.length} students)</option>
                  {availableClassNames.map(c => {
                    const count = effectiveStudentsList.filter(s => s.className === c).length;
                    return (
                      <option key={c} value={c}>
                        {c} — {count} student{count === 1 ? '' : 's'}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  Choose Export Format:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setExportFormat('pdf')}
                    className={`p-3 rounded-xl border text-left flex flex-col gap-1 cursor-pointer transition-all ${
                      exportFormat === 'pdf'
                        ? 'border-purple-600 bg-purple-50 text-purple-900 shadow-xs'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-xs">
                      <Printer className="w-4 h-4 text-purple-600" />
                      <span>PDF Register</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-tight">
                      Printable A4 landscape register with official header & signature areas.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExportFormat('csv')}
                    className={`p-3 rounded-xl border text-left flex flex-col gap-1 cursor-pointer transition-all ${
                      exportFormat === 'csv'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-xs'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-xs">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                      <span>CSV Spreadsheet</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-tight">
                      Raw data file containing all admission fields, contacts & parent info.
                    </p>
                  </button>
                </div>
              </div>

              {/* Class Summary Stats Box */}
              {(() => {
                const targetStudents = exportClassTarget === 'all' 
                  ? studentsList 
                  : studentsList.filter(s => s.className === exportClassTarget);
                const boys = targetStudents.filter(s => s.gender === 'Male').length;
                const girls = targetStudents.filter(s => s.gender === 'Female').length;

                return (
                  <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-xs space-y-1 text-purple-950">
                    <div className="flex items-center justify-between font-bold">
                      <span>{exportClassTarget === 'all' ? 'All Classes Selected' : `Class: ${exportClassTarget}`}</span>
                      <span className="px-2 py-0.5 bg-purple-200 text-purple-900 rounded-md font-extrabold text-[11px]">
                        {targetStudents.length} Students
                      </span>
                    </div>
                    <p className="text-[11px] text-purple-800">
                      Breakdown: {boys} Male (Boys), {girls} Female (Girls)
                    </p>
                  </div>
                );
              })()}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowClassExportModal(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleExportClassAdmissionDetails()}
                className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download {exportFormat.toUpperCase()} Register</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BULK DELETE CONFIRMATION MODAL */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5 animate-scale-up">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Bulk Delete Students Confirmation</h3>
                <p className="text-xs text-slate-500">Permanent administrative action</p>
              </div>
            </div>

            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-xs space-y-2">
              <p className="font-bold text-rose-900">
                Are you sure you want to permanently delete {selectedStudentIds.length} student record{selectedStudentIds.length > 1 ? 's' : ''}?
              </p>
              <p className="text-rose-700 leading-relaxed">
                This will erase their student profiles, admission numbers, and registration records from the database. This action cannot be undone.
              </p>
            </div>

            <div className="max-h-36 overflow-y-auto space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
              {selectedStudents.map(st => (
                <div key={st.id} className="flex justify-between items-center text-slate-700 py-1 border-b border-slate-100 last:border-0 font-medium">
                  <span className="truncate max-w-[200px]">{st.fullName}</span>
                  <span className="font-mono text-[10px] text-slate-500">{st.admissionNo || 'PENDING'}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowBulkDeleteModal(false)}
                disabled={isBulkProcessing}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmBulkDelete}
                disabled={isBulkProcessing}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-sm cursor-pointer transition-colors"
              >
                {isBulkProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                <span>Confirm Delete ({selectedStudentIds.length})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE STUDENT CONFIRMATION */}
      {deletingStudent && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setDeletingStudent(null)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-slate-200 text-center space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Remove Student Record?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to permanently delete <strong>{deletingStudent.fullName}</strong> ({deletingStudent.admissionNo}) from the student register?
              </p>
            </div>
            <div className="flex justify-center gap-2 pt-2">
              <button
                type="button"
                id="btn-cancel-delete-student"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDeletingStudent(null);
                }}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                id="btn-confirm-delete-student"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleConfirmDelete();
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer transition-colors"
              >
                Yes, Delete Student
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. ID CARD TOOL MODAL */}
      <IDCardToolModal
        isOpen={!!selectedIDCardRecord}
        onClose={() => setSelectedIDCardRecord(null)}
        record={selectedIDCardRecord}
        defaultIssueDate={idCardIssueDate}
        defaultExpiryDate={idCardExpiryDate}
      />

      {/* 6. DOCUMENT VERIFICATION MODAL */}
      {documentVerificationStudent && (
        <StudentDocumentVerificationModal
          student={documentVerificationStudent}
          isOpen={!!documentVerificationStudent}
          onClose={() => setDocumentVerificationStudent(null)}
          onStudentUpdated={(updated) => {
            setStudentsList(prev => prev.map(s => s.id === updated.id ? updated : s));
            if (onUpdateStudent) onUpdateStudent(updated);
          }}
        />
      )}

      {/* 7. ADMISSION LETTER MODAL */}
      {admissionLetterStudent && (
        <AdmissionLetterModal
          student={admissionLetterStudent}
          isOpen={!!admissionLetterStudent}
          onClose={() => setAdmissionLetterStudent(null)}
        />
      )}
    </div>
  );
}

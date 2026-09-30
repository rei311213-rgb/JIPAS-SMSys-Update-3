import React, { useState, useMemo, useEffect } from 'react';
import { 
  AcademicYearItem, TermItem, DepartmentItem, ClassItem, HouseItem, SubjectItem, Student, Teacher, CourseItem, CalendarEvent, GraduatedBatch 
} from '../types';
import { 
  Plus, Edit2, Trash2, CheckCircle, Search, Filter, Calendar, BookOpen, 
  Building2, School, Shield, Check, X, Sliders, AlertTriangle, Users, 
  ChevronRight, ArrowRight, Sparkles, Award, GraduationCap, Layers,
  ChevronDown, ChevronUp, ArrowUp, ArrowDown, Cloud, RefreshCw, CheckSquare, Square, FolderTree,
  Clock, MapPin, Tag, UserCheck, UserX, FileText, Download, CheckSquare2, Info
} from 'lucide-react';
import AcademicTreeView from './admin/AcademicTreeView';
import BulkSubjectAssignmentModal from './admin/BulkSubjectAssignmentModal';
import { 
  deleteAcademicYear, deleteTerm, deleteDepartment, deleteClass, deleteHouse, deleteSubject, deleteCourse,
  saveAllStudents, saveAllTeachers, saveAllClasses, saveAllSubjects, saveAllCourses, saveCourse, saveStoredCourses,
  saveAllDepartments, saveAllAcademicYears, saveAllTerms, saveAllHouses,
  subscribeAcademicYears, subscribeTerms,
  subscribeCalendarEvents, saveCalendarEvent, deleteCalendarEvent,
  subscribeGraduatedBatches, saveGraduatedBatch, deleteGraduatedBatch
} from '../services/dbService';
import { 
  getStoredAcademicYears, getStoredTerms, verifyAcademicYearsPersistence,
  getStoredCalendarEvents, getStoredGraduatedBatches, saveStoredStudents, saveStoredUsers, getStoredUsers
} from '../services/storageService';
import { 
  INITIAL_SHS_COURSES, INITIAL_DEPARTMENTS, INITIAL_CLASSES, INITIAL_SUBJECTS, INITIAL_ACADEMIC_YEARS, INITIAL_TERMS, INITIAL_HOUSES, validateMasterStructure 
} from '../data/setupData';

interface AcademicSetupManagerProps {
  activeModule: string;
  onNavigate?: (module: string) => void;
  students: Student[];
  teachers: Teacher[];
  academicYears: AcademicYearItem[];
  onUpdateAcademicYears: (years: AcademicYearItem[]) => void;
  terms: TermItem[];
  onUpdateTerms: (terms: TermItem[]) => void;
  departments: DepartmentItem[];
  onUpdateDepartments: (departments: DepartmentItem[]) => void;
  courses?: CourseItem[];
  onUpdateCourses?: (courses: CourseItem[]) => void;
  classes: ClassItem[];
  onUpdateClasses: (classes: ClassItem[]) => void;
  houses: HouseItem[];
  onUpdateHouses: (houses: HouseItem[]) => void;
  subjects: SubjectItem[];
  onUpdateSubjects: (subjects: SubjectItem[]) => void;
}

export default function AcademicSetupManager({
  activeModule: rawActiveModule,
  onNavigate,
  students: propStudents = [],
  teachers: propTeachers = [],
  academicYears: propAcademicYears = [],
  onUpdateAcademicYears,
  terms: propTerms = [],
  onUpdateTerms,
  departments: propDepartments = [],
  onUpdateDepartments,
  courses: propCourses = [],
  onUpdateCourses,
  classes: propClasses = [],
  onUpdateClasses,
  houses: propHouses = [],
  onUpdateHouses,
  subjects: propSubjects = [],
  onUpdateSubjects
}: AcademicSetupManagerProps) {
  // Normalize module name
  const activeModule = useMemo(() => {
    const raw = (rawActiveModule || '').toLowerCase().trim();
    if (raw === 'departments' || raw === 'department') return 'setup_departments';
    if (raw === 'classes' || raw === 'class') return 'setup_classes';
    if (raw === 'subjects' || raw === 'subject' || raw === 'subject_management') return 'setup_subjects';
    if (raw === 'courses' || raw === 'course' || raw === 'shs_courses' || raw === 'setup_shs_courses') return 'manage_courses';
    if (raw === 'houses' || raw === 'house') return 'setup_houses';
    if (raw === 'academic_years' || raw === 'academic_year') return 'setup_academic_years';
    if (raw === 'terms' || raw === 'term' || raw === 'term_parameters') return 'setup_term_parameters';
    if (raw === 'academic_calendar' || raw === 'calendar_events' || raw === 'termly_activities' || raw === 'setup_academic_calendar') return 'setup_academic_calendar';
    if (raw === 'graduated_batches' || raw === 'graduated' || raw === 'old_students' || raw === 'alumni' || raw === 'setup_graduated_batches') return 'setup_graduated_batches';
    if (raw === 'tree' || raw === 'academic_tree' || raw === 'tree_view') return 'academic_tree_view';
    return raw || 'setup_management';
  }, [rawActiveModule]);

  // Guaranteed fallback data to prevent any empty/broken states
  const departments = propDepartments.length > 0 ? propDepartments : INITIAL_DEPARTMENTS;
  const courses = (propCourses && propCourses.length > 0) ? propCourses : INITIAL_SHS_COURSES;
  const classes = (propClasses && propClasses.length > 0) ? propClasses : INITIAL_CLASSES;
  const houses = (propHouses && propHouses.length > 0) ? propHouses : INITIAL_HOUSES;
  const subjects = (propSubjects && propSubjects.length > 0) ? propSubjects : INITIAL_SUBJECTS;
  const [academicYearsList, setAcademicYearsList] = useState<AcademicYearItem[]>(() => {
    const stored = getStoredAcademicYears();
    if (Array.isArray(stored) && stored.length > 0) return stored;
    return Array.isArray(propAcademicYears) && propAcademicYears.length > 0 ? propAcademicYears : INITIAL_ACADEMIC_YEARS;
  });

  const [termsList, setTermsList] = useState<TermItem[]>(() => {
    const stored = getStoredTerms();
    if (Array.isArray(stored) && stored.length > 0) return stored;
    return Array.isArray(propTerms) && propTerms.length > 0 ? propTerms : INITIAL_TERMS;
  });

  useEffect(() => {
    if (Array.isArray(propAcademicYears) && propAcademicYears.length > 0) {
      setAcademicYearsList(propAcademicYears);
    }
  }, [propAcademicYears]);

  useEffect(() => {
    if (Array.isArray(propTerms) && propTerms.length > 0) {
      setTermsList(propTerms);
    }
  }, [propTerms]);

  useEffect(() => {
    const unsub = subscribeAcademicYears((ays) => {
      if (Array.isArray(ays) && ays.length > 0) {
        setAcademicYearsList(ays);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = subscribeTerms((tms) => {
      if (Array.isArray(tms) && tms.length > 0) {
        setTermsList(tms);
      }
    });
    return () => unsub();
  }, []);

  const academicYears = academicYearsList;
  const terms = termsList;
  const students = propStudents || [];
  const teachers = propTeachers || [];

  // Real-time Subscriptions for Academic Calendar Events and Graduated Batches
  const [calendarEventsList, setCalendarEventsList] = useState<CalendarEvent[]>(() => getStoredCalendarEvents());
  useEffect(() => {
    const unsub = subscribeCalendarEvents((events) => {
      if (events && events.length > 0) setCalendarEventsList(events);
    });
    return () => unsub();
  }, []);

  const [graduatedBatchesList, setGraduatedBatchesList] = useState<GraduatedBatch[]>(() => getStoredGraduatedBatches());
  useEffect(() => {
    const unsub = subscribeGraduatedBatches((batches) => {
      if (batches && batches.length > 0) setGraduatedBatchesList(batches);
    });
    return () => unsub();
  }, []);
  // Toast notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // ==========================================
  // ACADEMIC CALENDAR STATE & MODALS
  // ==========================================
  const [calSearch, setCalSearch] = useState('');
  const [calYearFilter, setCalYearFilter] = useState('All');
  const [calTermFilter, setCalTermFilter] = useState('All');
  const [calCategoryFilter, setCalCategoryFilter] = useState('All');
  const [showCalModal, setShowCalModal] = useState(false);
  const [editingCalEvent, setEditingCalEvent] = useState<CalendarEvent | null>(null);

  const [calFormTitle, setCalFormTitle] = useState('');
  const [calFormStartDate, setCalFormStartDate] = useState('');
  const [calFormEndDate, setCalFormEndDate] = useState('');
  const [calFormAcademicYear, setCalFormAcademicYear] = useState('');
  const [calFormTerm, setCalFormTerm] = useState('First Term');
  const [calFormCategory, setCalFormCategory] = useState<string>('Academic');
  const [calFormTargetAudience, setCalFormTargetAudience] = useState<string>('All');
  const [calFormLocation, setCalFormLocation] = useState('');
  const [calFormIsImportant, setCalFormIsImportant] = useState(false);
  const [calFormDescription, setCalFormDescription] = useState('');

  const openAddCalModal = () => {
    setEditingCalEvent(null);
    setCalFormTitle('');
    setCalFormStartDate(new Date().toISOString().split('T')[0]);
    setCalFormEndDate('');
    setCalFormAcademicYear(academicYears[0]?.name || '2025/2026');
    setCalFormTerm(terms[0]?.name || 'First Term');
    setCalFormCategory('Academic');
    setCalFormTargetAudience('All');
    setCalFormLocation('Main Assembly Hall / Campus');
    setCalFormIsImportant(false);
    setCalFormDescription('');
    setShowCalModal(true);
  };

  const openEditCalModal = (event: CalendarEvent) => {
    setEditingCalEvent(event);
    setCalFormTitle(event.title || '');
    setCalFormStartDate(event.date || '');
    setCalFormEndDate(event.endDate || '');
    setCalFormAcademicYear(event.academicYear || academicYears[0]?.name || '2025/2026');
    setCalFormTerm(event.term || terms[0]?.name || 'First Term');
    setCalFormCategory(event.category || 'Academic');
    setCalFormTargetAudience(event.targetAudience || 'All');
    setCalFormLocation(event.location || '');
    setCalFormIsImportant(!!event.isImportant);
    setCalFormDescription(event.description || '');
    setShowCalModal(true);
  };

  const handleSaveCalEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!calFormTitle.trim() || !calFormStartDate) {
      showToast('Please specify activity title and start date.');
      return;
    }

    const newEvent: CalendarEvent = {
      id: editingCalEvent ? editingCalEvent.id : `event-${Date.now()}`,
      title: calFormTitle.trim(),
      date: calFormStartDate,
      endDate: calFormEndDate || undefined,
      academicYear: calFormAcademicYear,
      term: calFormTerm,
      category: calFormCategory as any,
      targetAudience: calFormTargetAudience as any,
      location: calFormLocation.trim() || undefined,
      isImportant: calFormIsImportant,
      description: calFormDescription.trim() || `${calFormTitle} for ${calFormTerm}`
    };

    await saveCalendarEvent(newEvent);
    setShowCalModal(false);
    showToast(editingCalEvent ? 'Calendar event updated successfully!' : 'New calendar activity added successfully!');
  };

  const handleDeleteCalEvent = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) return;
    await deleteCalendarEvent(id);
    showToast(`Deleted calendar activity: ${title}`);
  };

  const handleQuickSeedCalendar = async () => {
    const selectedYear = calYearFilter !== 'All' ? calYearFilter : (academicYears[0]?.name || '2025/2026');
    const selectedTerm = calTermFilter !== 'All' ? calTermFilter : (terms[0]?.name || 'First Term');
    
    if (!window.confirm(`Generate standard termly calendar activities for ${selectedYear} (${selectedTerm})?`)) return;

    const standardActivities: Partial<CalendarEvent>[] = [
      { title: `${selectedTerm} Official Reopening & Orientation`, category: 'Reopening', isImportant: true, description: 'Staff, teachers and students return to campus for term resumption.' },
      { title: 'General Parent-Teacher Association (PTA) Meeting', category: 'Meeting', isImportant: false, description: 'Termly consultative meeting between school management and parents.' },
      { title: 'Continuous Assessment & Mid-Term Examinations', category: 'Exam', isImportant: true, description: 'Mid-term evaluation test for all basic and secondary departments.' },
      { title: 'Mid-Term Break & Staff Development Workshop', category: 'Holiday', isImportant: false, description: 'Short termly recess for students and professional training for faculty.' },
      { title: 'Inter-House Sports & Cultural Festival', category: 'Sports', isImportant: false, description: 'Annual athletic games and cultural performing arts competition.' },
      { title: 'Final Termly Examinations (BECE/WASSCE Mock & End of Term)', category: 'Exam', isImportant: true, description: 'Comprehensive end-of-term assessment examinations across all subjects.' },
      { title: 'Vacation & Terminal Progress Reports Release', category: 'Vacation', isImportant: true, description: 'School closes for termly break. Student term report cards published.' },
    ];

    let count = 0;
    const now = new Date();
    for (let i = 0; i < standardActivities.length; i++) {
      const act = standardActivities[i];
      const startDate = new Date(now.getTime() + (i * 14 * 86400000)).toISOString().split('T')[0];
      const newEv: CalendarEvent = {
        id: `event-${Date.now()}-${i}`,
        title: act.title!,
        date: startDate,
        academicYear: selectedYear,
        term: selectedTerm,
        category: act.category as any,
        targetAudience: 'All',
        location: 'School Assembly Hall / Campus',
        isImportant: act.isImportant,
        description: act.description!
      };
      await saveCalendarEvent(newEv);
      count++;
    }

    showToast(`Seeded ${count} standard termly calendar activities for ${selectedYear}!`);
  };

  // ==========================================
  // GRADUATED STUDENT BATCHES STATE & MODALS
  // ==========================================
  const [gradTab, setGradTab] = useState<'batches' | 'students' | 'graduate_class'>('batches');
  const [gradSearch, setGradSearch] = useState('');
  const [gradBatchFilter, setGradBatchFilter] = useState('All');
  const [gradDeptFilter, setGradDeptFilter] = useState('All');

  const [showBatchModal, setShowBatchModal] = useState(false);
  const [editingBatch, setEditingBatch] = useState<GraduatedBatch | null>(null);
  const [batchFormName, setBatchFormName] = useState('');
  const [batchFormYear, setBatchFormYear] = useState('');
  const [batchFormAcademicYear, setBatchFormAcademicYear] = useState('');
  const [batchFormDepartment, setBatchFormDepartment] = useState('');
  const [batchFormClass, setBatchFormClass] = useState('');
  const [batchFormDate, setBatchFormDate] = useState('');
  const [batchFormNotes, setBatchFormNotes] = useState('');

  // Graduate Class Tool state
  const [selectedClassToGraduate, setSelectedClassToGraduate] = useState('');
  const [targetGraduationBatchId, setTargetGraduationBatchId] = useState('');
  const [graduationDateInput, setGraduationDateInput] = useState(new Date().toISOString().split('T')[0]);
  const [selectedStudentIdsForGrad, setSelectedStudentIdsForGrad] = useState<string[]>([]);
  const [graduatingProcessing, setGraduatingProcessing] = useState(false);

  const openAddBatchModal = () => {
    setEditingBatch(null);
    setBatchFormName('');
    setBatchFormYear(new Date().getFullYear().toString());
    setBatchFormAcademicYear(academicYears[0]?.name || '2024/2025');
    setBatchFormDepartment(departments[0]?.name || 'Junior High School');
    setBatchFormClass('Basic 9');
    setBatchFormDate(new Date().toISOString().split('T')[0]);
    setBatchFormNotes('');
    setShowBatchModal(true);
  };

  const openEditBatchModal = (batch: GraduatedBatch) => {
    setEditingBatch(batch);
    setBatchFormName(batch.batchName || '');
    setBatchFormYear(batch.graduationYear || '');
    setBatchFormAcademicYear(batch.academicYear || '');
    setBatchFormDepartment(batch.department || '');
    setBatchFormClass(batch.classGraduated || '');
    setBatchFormDate(batch.graduationDate || '');
    setBatchFormNotes(batch.notes || '');
    setShowBatchModal(true);
  };

  const handleSaveBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchFormName.trim() || !batchFormYear) {
      showToast('Please provide batch name and graduation year.');
      return;
    }

    const newBatch: GraduatedBatch = {
      id: editingBatch ? editingBatch.id : `batch-${Date.now()}`,
      batchName: batchFormName.trim(),
      graduationYear: batchFormYear,
      academicYear: batchFormAcademicYear,
      department: batchFormDepartment,
      classGraduated: batchFormClass,
      totalStudents: editingBatch ? editingBatch.totalStudents : 0,
      graduationDate: batchFormDate,
      status: 'Active',
      notes: batchFormNotes.trim(),
      createdAt: editingBatch ? editingBatch.createdAt : new Date().toISOString()
    };

    await saveGraduatedBatch(newBatch);
    setShowBatchModal(false);
    showToast(editingBatch ? 'Graduated batch updated!' : 'New graduated batch created successfully!');
  };

  const handleDeleteBatch = async (id: string, name: string) => {
    if (!window.confirm(`Delete graduated batch "${name}"? Old student records will be preserved.`)) return;
    await deleteGraduatedBatch(id);
    showToast(`Deleted batch ${name}`);
  };

  // Graduate Students Execution Handler
  const handleGraduateSelectedStudents = async () => {
    if (selectedStudentIdsForGrad.length === 0) {
      showToast('Please select at least one student to graduate.');
      return;
    }
    if (!targetGraduationBatchId) {
      showToast('Please select a target Graduated Batch.');
      return;
    }

    const targetBatch = graduatedBatchesList.find(b => b.id === targetGraduationBatchId);
    if (!targetBatch) {
      showToast('Selected graduated batch not found.');
      return;
    }

    if (!window.confirm(`Confirm graduation of ${selectedStudentIdsForGrad.length} students into "${targetBatch.batchName}"?`)) return;

    setGraduatingProcessing(true);
    try {
      const updatedStudents = students.map(st => {
        if (selectedStudentIdsForGrad.includes(st.id)) {
          return {
            ...st,
            status: 'Graduated' as const,
            graduationYear: targetBatch.graduationYear,
            graduationBatch: targetBatch.batchName,
            graduationDate: graduationDateInput,
            isCurrent: false
          };
        }
        return st;
      });

      // Update LocalStorage & Supabase
      saveStoredStudents(updatedStudents);
      await saveAllStudents(updatedStudents);

      // Update Graduated Batch student count
      const updatedBatchCount = (targetBatch.totalStudents || 0) + selectedStudentIdsForGrad.length;
      const updatedBatchObj: GraduatedBatch = {
        ...targetBatch,
        totalStudents: updatedBatchCount
      };
      await saveGraduatedBatch(updatedBatchObj);

      showToast(`🎉 Congratulations! ${selectedStudentIdsForGrad.length} students successfully graduated into ${targetBatch.batchName}!`);
      setSelectedStudentIdsForGrad([]);
      setSelectedClassToGraduate('');
      setGradTab('students');
    } catch (err) {
      console.error('Graduation processing failed:', err);
      showToast('Error graduating students. Please check network logs.');
    } finally {
      setGraduatingProcessing(false);
    }
  };

  // ==========================================
  // 1. ACADEMIC YEARS STATE & MODALS
  // ==========================================
  const [aySearch, setAySearch] = useState('');
  const [showAyModal, setShowAyModal] = useState(false);
  const [editingAy, setEditingAy] = useState<AcademicYearItem | null>(null);
  const [ayFormName, setAyFormName] = useState('');
  const [ayFormStartDate, setAyFormStartDate] = useState('');
  const [ayFormEndDate, setAyFormEndDate] = useState('');
  const [ayFormStatus, setAyFormStatus] = useState<'Current' | 'Active' | 'Upcoming' | 'Completed'>('Upcoming');

  const openAddAyModal = () => {
    setEditingAy(null);
    setAyFormName('');
    setAyFormStartDate('');
    setAyFormEndDate('');
    setAyFormStatus('Upcoming');
    setShowAyModal(true);
  };

  const openEditAyModal = (ay: AcademicYearItem) => {
    setEditingAy(ay);
    setAyFormName(ay.name);
    setAyFormStartDate(ay.startDate);
    setAyFormEndDate(ay.endDate);
    setAyFormStatus(ay.status);
    setShowAyModal(true);
  };

  const handleSaveAy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ayFormName || !ayFormStartDate || !ayFormEndDate) {
      showToast('Please fill in all required academic year fields.');
      return;
    }

    let updated: AcademicYearItem[];
    if (editingAy) {
      updated = academicYears.map(item => {
        if (item.id === editingAy.id) {
          return {
            ...item,
            name: ayFormName,
            startDate: ayFormStartDate,
            endDate: ayFormEndDate,
            status: ayFormStatus
          };
        }
        // If user set this year as current, change other current to Active
        if (ayFormStatus === 'Current' && item.status === 'Current') {
          return { ...item, status: 'Active' as const };
        }
        return item;
      });
      setAcademicYearsList(updated);
      onUpdateAcademicYears(updated);
      showToast(`Academic Year ${ayFormName} updated successfully.`);
    } else {
      const newAy: AcademicYearItem = {
        id: `ay-${Date.now()}`,
        name: ayFormName,
        startDate: ayFormStartDate,
        endDate: ayFormEndDate,
        status: ayFormStatus,
        hasRecords: false
      };
      let list = [...academicYears];
      if (ayFormStatus === 'Current') {
        list = list.map(a => a.status === 'Current' ? { ...a, status: 'Active' as const } : a);
      }
      updated = [newAy, ...list];
      setAcademicYearsList(updated);
      onUpdateAcademicYears(updated);
      showToast(`Academic Year ${ayFormName} created successfully.`);
    }
    setShowAyModal(false);

    // State check: validate persistence into IndexedDB and localStorage to prevent UI flickering
    try {
      const check = await verifyAcademicYearsPersistence(updated);
      if (check.verified) {
        setAcademicYearsList(updated);
      }
    } catch (err) {
      console.warn('[AcademicSetup] State persistence verification check notice:', err);
    }
  };

  const handleSetCurrentAy = async (id: string) => {
    const updated = academicYears.map(ay => {
      if (ay.id === id) return { ...ay, status: 'Current' as const };
      if (ay.status === 'Current') return { ...ay, status: 'Active' as const };
      return ay;
    });
    setAcademicYearsList(updated);
    onUpdateAcademicYears(updated);
    showToast('Current Academic Year updated.');

    // State check: validate persistence into IndexedDB and localStorage
    try {
      const check = await verifyAcademicYearsPersistence(updated);
      if (check.verified) {
        setAcademicYearsList(updated);
      }
    } catch (err) {
      console.warn('[AcademicSetup] State persistence verification check notice:', err);
    }
  };

  const handleDeleteAy = async (id: string, name: string) => {
    const item = academicYears.find(a => a.id === id);
    if (item?.status === 'Current') {
      showToast('Cannot delete the active Current Academic Year. Please set another year as Current first.');
      return;
    }
    if (confirm(`Are you sure you want to delete Academic Year "${name}"?`)) {
      const remaining = academicYears.filter(a => a.id !== id);
      setAcademicYearsList(remaining);
      onUpdateAcademicYears(remaining);
      showToast(`Academic Year ${name} deleted.`);
      try { 
        await deleteAcademicYear(id); 
        await verifyAcademicYearsPersistence(remaining);
      } catch(e) { 
        console.error('[AcademicSetup] Delete error:', e); 
      }
    }
  };

  const filteredAy = academicYears.filter(a => a.name.toLowerCase().includes(aySearch.toLowerCase()));
  const currentAy = academicYears.find(a => a.status === 'Current') || academicYears[0];

  // ==========================================
  // 2. TERMS STATE & MODALS
  // ==========================================
  const [selectedAyForTerms, setSelectedAyForTerms] = useState<string>(currentAy?.name || '2025-2026');
  const [termSearch, setTermSearch] = useState('');
  const [showTermModal, setShowTermModal] = useState(false);
  const [editingTerm, setEditingTerm] = useState<TermItem | null>(null);
  const [termFormName, setTermFormName] = useState('First Term');
  const [termFormStartDate, setTermFormStartDate] = useState('');
  const [termFormEndDate, setTermFormEndDate] = useState('');
  const [termFormDaysOpen, setTermFormDaysOpen] = useState(60);
  const [termFormNextDate, setTermFormNextDate] = useState('');
  const [termFormHolidays, setTermFormHolidays] = useState(2);
  const [termFormStatus, setTermFormStatus] = useState<'Current' | 'Completed' | 'Upcoming'>('Upcoming');
  const [showParametersConfig, setShowParametersConfig] = useState(false);

  // Term parameters state
  const [assessmentClassRatio, setAssessmentClassRatio] = useState(40);
  const [assessmentExamRatio, setAssessmentExamRatio] = useState(60);
  const [passingMark, setPassingMark] = useState(50);
  const [allowStudentReportDownload, setAllowStudentReportDownload] = useState(true);

  const openAddTermModal = () => {
    setEditingTerm(null);
    setTermFormName('First Term');
    setTermFormStartDate('');
    setTermFormEndDate('');
    setTermFormDaysOpen(60);
    setTermFormNextDate('');
    setTermFormHolidays(2);
    setTermFormStatus('Upcoming');
    setShowTermModal(true);
  };

  const openEditTermModal = (term: TermItem) => {
    setEditingTerm(term);
    setTermFormName(term.name);
    setTermFormStartDate(term.startDate);
    setTermFormEndDate(term.endDate);
    setTermFormDaysOpen(term.daysOpen);
    setTermFormNextDate(term.nextTermDate);
    setTermFormHolidays(term.holidays);
    setTermFormStatus(term.status);
    setShowTermModal(true);
  };

  const handleSaveTerm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!termFormName || !termFormStartDate || !termFormEndDate) {
      showToast('Please fill in required term fields.');
      return;
    }

    if (editingTerm) {
      const updated = terms.map(item => {
        if (item.id === editingTerm.id) {
          return {
            ...item,
            name: termFormName,
            startDate: termFormStartDate,
            endDate: termFormEndDate,
            daysOpen: Number(termFormDaysOpen),
            nextTermDate: termFormNextDate,
            holidays: Number(termFormHolidays),
            status: termFormStatus
          };
        }
        if (termFormStatus === 'Current' && item.academicYear === selectedAyForTerms && item.status === 'Current') {
          return { ...item, status: 'Completed' as const };
        }
        return item;
      });
      onUpdateTerms(updated);
      showToast(`Term "${termFormName}" updated.`);
    } else {
      const newTerm: TermItem = {
        id: `term-${Date.now()}`,
        academicYear: selectedAyForTerms,
        name: termFormName,
        startDate: termFormStartDate,
        endDate: termFormEndDate,
        daysOpen: Number(termFormDaysOpen),
        nextTermDate: termFormNextDate,
        holidays: Number(termFormHolidays),
        status: termFormStatus
      };
      let list = [...terms];
      if (termFormStatus === 'Current') {
        list = list.map(t => (t.academicYear === selectedAyForTerms && t.status === 'Current') ? { ...t, status: 'Completed' as const } : t);
      }
      onUpdateTerms([...list, newTerm]);
      showToast(`Term "${termFormName}" added to ${selectedAyForTerms}.`);
    }
    setShowTermModal(false);
  };

  const handleSetCurrentTerm = (id: string) => {
    const term = terms.find(t => t.id === id);
    if (!term) return;
    const updated = terms.map(t => {
      if (t.id === id) return { ...t, status: 'Current' as const };
      if (t.academicYear === term.academicYear && t.status === 'Current') {
        return { ...t, status: 'Completed' as const };
      }
      return t;
    });
    onUpdateTerms(updated);
    showToast(`"${term.name}" is now the Current Term.`);
  };

  const handleDeleteTerm = async (id: string, name: string) => {
    if (confirm(`Delete ${name}?`)) {
      onUpdateTerms(terms.filter(t => t.id !== id));
      showToast(`Term ${name} deleted.`);
      try { await deleteTerm(id); } catch(e) { console.error(e); }
    }
  };

  const filteredTerms = terms
    .filter(t => t.academicYear === selectedAyForTerms)
    .filter(t => t.name.toLowerCase().includes(termSearch.toLowerCase()));

  // ==========================================
  // 3. DEPARTMENTS STATE & MODALS
  // ==========================================
  const [deptSearch, setDeptSearch] = useState('');
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [editingDept, setEditingDept] = useState<DepartmentItem | null>(null);
  const [deptFormName, setDeptFormName] = useState('');
  const [deptFormCode, setDeptFormCode] = useState('');
  const [deptFormHOD, setDeptFormHOD] = useState('');
  const [deptFormDesc, setDeptFormDesc] = useState('');
  const [deptFormSubDepts, setDeptFormSubDepts] = useState<string[]>([]);
  const [newSubDeptInput, setNewSubDeptInput] = useState('');
  const [expandedDeptSubDepts, setExpandedDeptSubDepts] = useState<Record<string, boolean>>({
    'dept-shs': true,
    'shs': true
  });

  const toggleExpandSubDept = (deptId: string) => {
    setExpandedDeptSubDepts(prev => ({ ...prev, [deptId]: !prev[deptId] }));
  };

  const openAddDeptModal = () => {
    setEditingDept(null);
    setDeptFormName('');
    setDeptFormCode('');
    setDeptFormHOD('');
    setDeptFormDesc('');
    setDeptFormSubDepts([]);
    setNewSubDeptInput('');
    setShowDeptModal(true);
  };

  const openEditDeptModal = (dept: DepartmentItem) => {
    setEditingDept(dept);
    setDeptFormName(dept.name);
    setDeptFormCode(dept.code || '');
    setDeptFormHOD(dept.headOfDept || '');
    setDeptFormDesc(dept.description);
    const isShs = dept.name.toLowerCase().includes('senior') || dept.code === 'SHS';
    const initialSubs = dept.subDepartments && dept.subDepartments.length > 0 
      ? dept.subDepartments 
      : (isShs ? ['Science', 'Visual Arts', 'Home Economics', 'General Arts', 'Business', 'Agricultural Science'] : []);
    setDeptFormSubDepts(initialSubs);
    setNewSubDeptInput('');
    setShowDeptModal(true);
  };

  const handleSaveDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptFormName.trim()) {
      showToast('Department name is required.');
      return;
    }

    const trimmedName = deptFormName.trim();
    const isShs = trimmedName.toLowerCase().includes('senior') || deptFormCode === 'SHS';
    const subDeptsToSave = deptFormSubDepts.length > 0 
      ? deptFormSubDepts 
      : (isShs ? ['Science', 'Visual Arts', 'Home Economics', 'General Arts', 'Business', 'Agricultural Science'] : undefined);

    if (editingDept) {
      const oldDeptName = editingDept.name;
      const updated = departments.map(d => d.id === editingDept.id ? {
        ...d,
        name: trimmedName,
        code: deptFormCode.trim() || trimmedName.substring(0, 3).toUpperCase(),
        headOfDept: deptFormHOD.trim(),
        description: deptFormDesc.trim(),
        subDepartments: subDeptsToSave
      } : d);
      onUpdateDepartments(updated);

      // GLOBAL CASCADE: Reflect changes throughout the entire system
      if (oldDeptName.toLowerCase() !== trimmedName.toLowerCase()) {
        // 1. Cascade update classes
        const updatedClasses = classes.map(c => 
          (c.department || '').toLowerCase() === oldDeptName.toLowerCase() ? { ...c, department: trimmedName } : c
        );
        onUpdateClasses(updatedClasses);
        try { await saveAllClasses(updatedClasses); } catch(err) { console.warn(err); }

        // 2. Cascade update courses
        if (courses && onUpdateCourses) {
          const updatedCourses = courses.map(c => 
            (c.department || '').toLowerCase() === oldDeptName.toLowerCase() ? { ...c, department: trimmedName } : c
          );
          onUpdateCourses(updatedCourses);
          try { await saveAllCourses(updatedCourses); } catch(err) { console.warn(err); }
        }

        // 3. Cascade update subjects
        const updatedSubjects = subjects.map(s => 
          (s.department || '').toLowerCase() === oldDeptName.toLowerCase() ? { ...s, department: trimmedName } : s
        );
        onUpdateSubjects(updatedSubjects);
        try { await saveAllSubjects(updatedSubjects); } catch(err) { console.warn(err); }

        // 4. Cascade update students
        const updatedStudents = students.map(st => 
          (st.department || '').toLowerCase() === oldDeptName.toLowerCase() ? { ...st, department: trimmedName } : st
        );
        try { await saveAllStudents(updatedStudents); } catch(err) { console.warn(err); }

        // 5. Cascade update teachers
        const updatedTeachers = teachers.map(t => 
          t.department && (t.department || '').toLowerCase() === oldDeptName.toLowerCase() ? { ...t, department: trimmedName } : t
        );
        try { await saveAllTeachers(updatedTeachers); } catch(err) { console.warn(err); }
      }

      showToast(`Department "${trimmedName}" updated and propagated throughout the system.`);
    } else {
      const newDept: DepartmentItem = {
        id: `dept-${Date.now()}`,
        name: trimmedName,
        code: deptFormCode.trim() || trimmedName.substring(0, 3).toUpperCase(),
        headOfDept: deptFormHOD.trim(),
        description: deptFormDesc.trim() || '--',
        subDepartments: subDeptsToSave
      };
      onUpdateDepartments([...departments, newDept]);
      showToast(`Department "${trimmedName}" created and ready across all modules.`);
    }
    setShowDeptModal(false);
  };

  const handleDeleteDept = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete Department "${name}"?`)) {
      onUpdateDepartments(departments.filter(d => d.id !== id));
      showToast(`Department ${name} removed.`);
      try { await deleteDepartment(id); } catch(e) { console.error(e); }
    }
  };

  const filteredDepts = departments.filter(d => 
    (d.name || '').toLowerCase().includes(deptSearch.toLowerCase()) || 
    (d.code && (d.code || '').toLowerCase().includes(deptSearch.toLowerCase()))
  );

  // ==========================================
  // 3B. SHS COURSES & PROGRAMMES STATE & MODALS
  // ==========================================
  const [courseSearch, setCourseSearch] = useState('');
  const [courseDeptFilter, setCourseDeptFilter] = useState<'ALL' | 'SHS' | 'OTHER'>('ALL');
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [showMapShsModal, setShowMapShsModal] = useState(false);
  const [selectedShsCourseIds, setSelectedShsCourseIds] = useState<string[]>([]);
  const [isSyncingCourses, setIsSyncingCourses] = useState(false);
  const [editingCourse, setEditingCourse] = useState<CourseItem | null>(null);
  const [courseFormName, setCourseFormName] = useState('');
  const [courseFormCode, setCourseFormCode] = useState('');
  const [courseFormDept, setCourseFormDept] = useState('Senior High School');
  const [courseFormHod, setCourseFormHod] = useState('');
  const [courseFormDesc, setCourseFormDesc] = useState('');
  const [courseFormElectives, setCourseFormElectives] = useState('');

  const openAddCourseModal = () => {
    setEditingCourse(null);
    setCourseFormName('');
    setCourseFormCode('');
    setCourseFormDept('Senior High School');
    setCourseFormHod('');
    setCourseFormDesc('');
    setCourseFormElectives('');
    setShowCourseModal(true);
  };

  const openEditCourseModal = (course: CourseItem) => {
    setEditingCourse(course);
    setCourseFormName(course.name);
    setCourseFormCode(course.code);
    setCourseFormDept(course.department);
    setCourseFormHod(course.headOfProgramme || '');
    setCourseFormDesc(course.description || '');
    setCourseFormElectives(course.electiveSubjects ? course.electiveSubjects.join(', ') : '');
    setShowCourseModal(true);
  };

  const openMapShsModal = () => {
    const mappedIds = (courses || [])
      .filter(c => (c.department || '').toLowerCase().includes('senior') || (c.department || '').toLowerCase().includes('shs'))
      .map(c => c.id);
    setSelectedShsCourseIds(mappedIds.length > 0 ? mappedIds : INITIAL_SHS_COURSES.map(c => c.id));
    setShowMapShsModal(true);
  };

  const handleSyncCoursesToSupabase = async () => {
    setIsSyncingCourses(true);
    try {
      await saveAllCourses(courses);
      saveStoredCourses(courses);
      showToast(`Successfully synced ${courses.length} courses to Supabase cloud database.`);
    } catch (err: any) {
      console.error('Failed to sync courses to Supabase:', err);
      showToast(`Sync error: ${err.message || 'Check Supabase connection.'}`);
    } finally {
      setIsSyncingCourses(false);
    }
  };

  const handleSaveShsCourseMappings = async () => {
    setIsSyncingCourses(true);
    const updatedCourses = courses.map(c => {
      const isMapped = selectedShsCourseIds.includes(c.id);
      const isCurrentlyShs = (c.department || '').toLowerCase().includes('senior') || (c.department || '').toLowerCase().includes('shs');
      if (isMapped) {
        return {
          ...c,
          department: 'Senior High School',
          levels: ['1', '2', '3'] as ('1' | '2' | '3')[]
        };
      } else if (isCurrentlyShs) {
        return {
          ...c,
          department: 'General'
        };
      }
      return c;
    });

    if (onUpdateCourses) {
      onUpdateCourses(updatedCourses);
    }
    saveStoredCourses(updatedCourses);

    // Auto-generate stream classes for newly mapped courses
    const newClassesToAdd: ClassItem[] = [];
    updatedCourses.filter(c => (c.department || '').toLowerCase().includes('senior') || (c.department || '').toLowerCase().includes('shs')).forEach(course => {
      const levels: ('1' | '2' | '3')[] = ['1', '2', '3'];
      levels.forEach(lvl => {
        const streamName = `${course.name} ${lvl}`;
        if (!classes.some(cls => cls.name.toLowerCase() === streamName.toLowerCase())) {
          newClassesToAdd.push({
            id: `cls-shs-${(course.code || course.name.substring(0, 3)).toLowerCase()}-${lvl}-${Date.now()}`,
            name: streamName,
            department: 'Senior High School',
            course: course.name,
            level: lvl,
            classTeacher: course.headOfProgramme || 'Unassigned',
            roomNumber: `SHS Room ${(course.code || 'SHS')}-${lvl}`,
            capacity: 45,
            status: 'Active'
          });
        }
      });
    });

    if (newClassesToAdd.length > 0) {
      const mergedClasses = [...classes, ...newClassesToAdd];
      onUpdateClasses(mergedClasses);
      try { await saveAllClasses(mergedClasses); } catch (e) { console.warn(e); }
    }

    try {
      await saveAllCourses(updatedCourses);
      showToast(`Mapped ${selectedShsCourseIds.length} course(s) to Senior High School and synced to Supabase!`);
    } catch (err: any) {
      console.error('Failed to sync course mappings to Supabase:', err);
      showToast(`Mappings saved locally. Supabase notice: ${err.message || 'Error syncing'}`);
    } finally {
      setIsSyncingCourses(false);
      setShowMapShsModal(false);
    }
  };

  const handleToggleShsMapping = async (course: CourseItem) => {
    const isCurrentlyShs = (course.department || '').toLowerCase().includes('senior') || (course.department || '').toLowerCase().includes('shs');
    const newDept = isCurrentlyShs ? 'General' : 'Senior High School';
    
    const updatedCourse: CourseItem = {
      ...course,
      department: newDept,
      levels: ['1', '2', '3']
    };

    const updatedCourses = courses.map(c => c.id === course.id ? updatedCourse : c);

    if (onUpdateCourses) {
      onUpdateCourses(updatedCourses);
    }
    saveStoredCourses(updatedCourses);

    // If mapped to SHS, make sure Level 1, 2, 3 class streams are created
    if (!isCurrentlyShs) {
      const levels: ('1' | '2' | '3')[] = ['1', '2', '3'];
      const newClassesToAdd: ClassItem[] = [];
      levels.forEach(lvl => {
        const streamName = `${course.name} ${lvl}`;
        if (!classes.some(c => c.name.toLowerCase() === streamName.toLowerCase())) {
          newClassesToAdd.push({
            id: `cls-shs-${(course.code || course.name.substring(0, 3)).toLowerCase()}-${lvl}-${Date.now()}`,
            name: streamName,
            department: 'Senior High School',
            course: course.name,
            level: lvl,
            classTeacher: course.headOfProgramme || 'Unassigned',
            roomNumber: `SHS Room ${(course.code || 'SHS')}-${lvl}`,
            capacity: 45,
            status: 'Active'
          });
        }
      });
      if (newClassesToAdd.length > 0) {
        const merged = [...classes, ...newClassesToAdd];
        onUpdateClasses(merged);
        try { await saveAllClasses(merged); } catch(e) { console.warn(e); }
      }
    }

    try {
      await saveCourse(updatedCourse);
      await saveAllCourses(updatedCourses);
      showToast(isCurrentlyShs 
        ? `Course "${course.name}" unmapped from Senior High School.` 
        : `Course "${course.name}" mapped to Senior High School and synced to Supabase!`
      );
    } catch (err) {
      console.warn('Supabase write error:', err);
      showToast(`Updated course locally. Supabase sync pending.`);
    }
  };

  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseFormName.trim()) {
      showToast('Course name is required.');
      return;
    }

    const electivesArray = courseFormElectives
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const generatedCode = courseFormCode.trim() || courseFormName.substring(0, 3).toUpperCase();

    let targetCourse: CourseItem;
    let updatedCourses: CourseItem[];

    if (editingCourse) {
      const oldCourseName = editingCourse.name;
      targetCourse = {
        ...editingCourse,
        name: courseFormName.trim(),
        code: generatedCode,
        department: courseFormDept,
        headOfProgramme: courseFormHod.trim(),
        description: courseFormDesc.trim(),
        electiveSubjects: electivesArray,
        levels: ['1', '2', '3'] as ('1' | '2' | '3')[]
      };
      updatedCourses = courses.map(c => c.id === editingCourse.id ? targetCourse : c);

      if (onUpdateCourses) {
        onUpdateCourses(updatedCourses);
      }
      saveStoredCourses(updatedCourses);

      // Update associated classes if course name changed
      if (oldCourseName !== courseFormName.trim()) {
        const updatedClasses = classes.map(cls => {
          if (cls.course === oldCourseName || cls.name.startsWith(oldCourseName)) {
            const levelPart = cls.level || cls.name.replace(oldCourseName, '').trim() || '1';
            return {
              ...cls,
              name: `${courseFormName.trim()} ${levelPart}`,
              course: courseFormName.trim(),
              level: levelPart
            };
          }
          return cls;
        });
        onUpdateClasses(updatedClasses);
        try { await saveAllClasses(updatedClasses); } catch(e) { console.warn(e); }
      }

      showToast(`Course "${courseFormName}" updated and saved to Supabase.`);
    } else {
      targetCourse = {
        id: `course-${Date.now()}`,
        name: courseFormName.trim(),
        code: generatedCode,
        department: courseFormDept,
        headOfProgramme: courseFormHod.trim(),
        description: courseFormDesc.trim(),
        levels: ['1', '2', '3'],
        electiveSubjects: electivesArray
      };

      updatedCourses = [...courses, targetCourse];
      if (onUpdateCourses) {
        onUpdateCourses(updatedCourses);
      }
      saveStoredCourses(updatedCourses);

      // Automatically generate the 3 levels (classes: Course 1, Course 2, Course 3) for SHS
      if (courseFormDept.toLowerCase().includes('senior') || courseFormDept.toLowerCase().includes('shs')) {
        const levels: ('1' | '2' | '3')[] = ['1', '2', '3'];
        const newClassesToAdd: ClassItem[] = [];
        levels.forEach(lvl => {
          const streamName = `${courseFormName.trim()} ${lvl}`;
          if (!classes.some(c => c.name.toLowerCase() === streamName.toLowerCase())) {
            newClassesToAdd.push({
              id: `cls-shs-${generatedCode.toLowerCase()}-${lvl}-${Date.now()}`,
              name: streamName,
              department: courseFormDept || 'Senior High School',
              course: courseFormName.trim(),
              level: lvl,
              classTeacher: courseFormHod.trim() || 'Unassigned',
              roomNumber: `SHS Room ${generatedCode}-${lvl}`,
              capacity: 45,
              status: 'Active'
            });
          }
        });

        if (newClassesToAdd.length > 0) {
          const merged = [...classes, ...newClassesToAdd];
          onUpdateClasses(merged);
          try { await saveAllClasses(merged); } catch(e) { console.warn(e); }
        }
      }

      showToast(`Course "${courseFormName}" created and mapped to ${courseFormDept} in Supabase.`);
    }

    try {
      await saveCourse(targetCourse);
      await saveAllCourses(updatedCourses);
    } catch (err) {
      console.warn('Supabase write error:', err);
    }

    setShowCourseModal(false);
  };

  const handleDeleteCourse = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete Course "${name}"?`)) {
      const updated = courses.filter(c => c.id !== id);
      if (onUpdateCourses) {
        onUpdateCourses(updated);
      }
      saveStoredCourses(updated);
      showToast(`Course "${name}" removed.`);
      try {
        await deleteCourse(id);
        await saveAllCourses(updated);
      } catch(e) {
        console.error(e);
      }
    }
  };

  const effectiveShsCourses = useMemo(() => {
    const list = (courses || []).filter(c => {
      const d = (c.department || '').toLowerCase();
      return d.includes('senior') || d.includes('shs');
    });
    return list.length > 0 ? list : INITIAL_SHS_COURSES;
  }, [courses]);

  const filteredCourses = useMemo(() => {
    return (courses || []).filter(c => {
      const isShs = (c.department || '').toLowerCase().includes('senior') || (c.department || '').toLowerCase().includes('shs');
      if (courseDeptFilter === 'SHS' && !isShs) return false;
      if (courseDeptFilter === 'OTHER' && isShs) return false;

      const q = (courseSearch || '').toLowerCase();
      return (
        (c.name || '').toLowerCase().includes(q) ||
        (c.code || '').toLowerCase().includes(q) ||
        (c.department && (c.department || '').toLowerCase().includes(q)) ||
        (c.headOfProgramme && (c.headOfProgramme || '').toLowerCase().includes(q))
      );
    });
  }, [courses, courseDeptFilter, courseSearch]);

  // ==========================================
  // 4. CLASSES STATE & MODALS
  // ==========================================
  const [classSearch, setClassSearch] = useState('');
  const [classFilterDept, setClassFilterDept] = useState('All');
  const [showClassModal, setShowClassModal] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null);
  const [classFormName, setClassFormName] = useState('');
  const [classFormDept, setClassFormDept] = useState(departments[0]?.name || 'Primary School');
  const [classFormCourse, setClassFormCourse] = useState('');
  const [classFormLevel, setClassFormLevel] = useState<'1' | '2' | '3'>('1');
  const [classFormTeacher, setClassFormTeacher] = useState('');
  const [classFormRoom, setClassFormRoom] = useState('');
  const [classFormCapacity, setClassFormCapacity] = useState(35);
  const [classFormStatus, setClassFormStatus] = useState<'Active' | 'Inactive'>('Active');

  // Batch Sync Enrollment states
  const [showSyncEnrollmentModal, setShowSyncEnrollmentModal] = useState(false);
  const [isSyncingEnrollment, setIsSyncingEnrollment] = useState(false);
  const [syncReport, setSyncReport] = useState<{
    totalStudents: number;
    correctedCount: number;
    unmatchedCount: number;
    correctedList: { studentName: string; original: string; corrected: string }[];
    unmatchedList: { studentName: string; original: string; status: string }[];
  } | null>(null);

  const handleRunSyncEnrollment = async () => {
    setIsSyncingEnrollment(true);
    try {
      const studentList = [...students];
      const classNames = classes.map(c => c.name);
      
      let correctedCount = 0;
      let unmatchedCount = 0;
      const correctedList: { studentName: string; original: string; corrected: string }[] = [];
      const unmatchedList: { studentName: string; original: string; status: string }[] = [];
      
      const updatedStudents = studentList.map(st => {
        const currentClass = (st.className || '').trim();
        if (!currentClass) {
          unmatchedCount++;
          unmatchedList.push({
            studentName: st.fullName,
            original: '(None)',
            status: 'Unassigned Class'
          });
          return st;
        }

        // Exact match check
        const exactMatch = classNames.find(c => c === currentClass);
        if (exactMatch) {
          return st;
        }

        // Case-insensitive or trimmed match check
        const normalizedMatch = classNames.find(
          c => c.toLowerCase().trim() === currentClass.toLowerCase().trim()
        );

        if (normalizedMatch) {
          correctedCount++;
          correctedList.push({
            studentName: st.fullName,
            original: st.className,
            corrected: normalizedMatch
          });
          return { ...st, className: normalizedMatch };
        } else {
          unmatchedCount++;
          unmatchedList.push({
            studentName: st.fullName,
            original: st.className,
            status: 'Class Not Found in Master'
          });
          return st;
        }
      });

      if (correctedCount > 0) {
        // Save to database
        await saveAllStudents(updatedStudents);
        showToast(`Successfully reconciled student counts. Auto-corrected ${correctedCount} class allocation discrepancies.`);
      } else {
        showToast('All student enrollments are already fully reconciled and verified.');
      }

      setSyncReport({
        totalStudents: studentList.length,
        correctedCount,
        unmatchedCount,
        correctedList,
        unmatchedList
      });
    } catch (err) {
      console.error('[SyncEnrollment] Error during reconciliation:', err);
      showToast('Failed to complete enrollment sync. Please try again.');
    } finally {
      setIsSyncingEnrollment(false);
    }
  };

  const openAddClassModal = () => {
    setEditingClass(null);
    setClassFormName('');
    setClassFormDept(departments[0]?.name || 'Primary School');
    setClassFormCourse(effectiveShsCourses[0]?.name || 'Science (General)');
    setClassFormLevel('1');
    setClassFormTeacher('');
    setClassFormRoom('');
    setClassFormCapacity(35);
    setClassFormStatus('Active');
    setShowClassModal(true);
  };

  const openEditClassModal = (cls: ClassItem) => {
    setEditingClass(cls);
    setClassFormName(cls.name);
    setClassFormDept(cls.department);
    setClassFormCourse(cls.course || effectiveShsCourses[0]?.name || 'Science (General)');
    setClassFormLevel((cls.level as any) || '1');
    setClassFormTeacher(cls.classTeacher);
    setClassFormRoom(cls.roomNumber);
    setClassFormCapacity(cls.capacity);
    setClassFormStatus(cls.status);
    setShowClassModal(true);
  };

  const handleSaveClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classFormName.trim()) {
      showToast('Class name is required.');
      return;
    }

    const trimmedClassName = classFormName.trim();
    const isShs = classFormDept.toLowerCase().includes('senior') || classFormDept.toLowerCase().includes('shs');

    if (editingClass) {
      const oldClassName = editingClass.name;
      const updated = classes.map(c => c.id === editingClass.id ? {
        ...c,
        name: trimmedClassName,
        department: classFormDept,
        course: isShs ? (classFormCourse || c.course) : c.course,
        level: isShs ? classFormLevel : c.level,
        classTeacher: classFormTeacher || 'Unassigned',
        roomNumber: classFormRoom || '--',
        capacity: Number(classFormCapacity),
        status: classFormStatus
      } : c);
      onUpdateClasses(updated);
      try { await saveAllClasses(updated); } catch (err) { console.warn(err); }

      // GLOBAL CASCADE: Propagate class rename throughout the system
      if (oldClassName !== trimmedClassName) {
        // 1. Update students enrolled in this class
        const updatedStudents = students.map(st => 
          st.className === oldClassName ? { ...st, className: trimmedClassName } : st
        );
        try { await saveAllStudents(updatedStudents); } catch (err) { console.warn(err); }

        // 2. Update teachers teaching this class
        const updatedTeachers = teachers.map(t => {
          if (t.classesTaught && t.classesTaught.includes(oldClassName)) {
            return {
              ...t,
              classesTaught: t.classesTaught.map(c => c === oldClassName ? trimmedClassName : c)
            };
          }
          return t;
        });
        try { await saveAllTeachers(updatedTeachers); } catch (err) { console.warn(err); }
      }

      showToast(`Class "${trimmedClassName}" updated and propagated.`);
    } else {
      const newClassItem: ClassItem = {
        id: `cls-${Date.now()}`,
        name: trimmedClassName,
        department: classFormDept,
        course: isShs ? classFormCourse : undefined,
        level: isShs ? classFormLevel : undefined,
        classTeacher: classFormTeacher || 'Unassigned',
        roomNumber: classFormRoom || '--',
        capacity: Number(classFormCapacity),
        status: classFormStatus
      };
      const updated = [...classes, newClassItem];
      onUpdateClasses(updated);
      try { await saveAllClasses(updated); } catch (err) { console.warn(err); }
      showToast(`Class "${trimmedClassName}" added across all departments.`);
    }
    setShowClassModal(false);
  };

  const handleDeleteClass = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete Class "${name}"?`)) {
      onUpdateClasses(classes.filter(c => c.id !== id));
      showToast(`Class ${name} removed.`);
      try { await deleteClass(id); } catch(e) { console.error(e); }
    }
  };

  const filteredClasses = classes.filter(c => {
    const matchesDept = classFilterDept === 'All' || c.department === classFilterDept;
    const q = (classSearch || '').toLowerCase();
    const matchesSearch = (c.name || '').toLowerCase().includes(q) || 
                          ((c.classTeacher || '').toLowerCase().includes(q));
    return matchesDept && matchesSearch;
  });

  // ==========================================
  // 5. HOUSES STATE & MODALS
  // ==========================================
  const [houseSearch, setHouseSearch] = useState('');
  const [showHouseModal, setShowHouseModal] = useState(false);
  const [editingHouse, setEditingHouse] = useState<HouseItem | null>(null);
  const [houseFormName, setHouseFormName] = useState('');
  const [houseFormColor, setHouseFormColor] = useState('#2563eb');
  const [houseFormMaster, setHouseFormMaster] = useState('');
  const [houseFormPatron, setHouseFormPatron] = useState('');
  const [houseFormMotto, setHouseFormMotto] = useState('');

  const openAddHouseModal = () => {
    setEditingHouse(null);
    setHouseFormName('');
    setHouseFormColor('#2563eb');
    setHouseFormMaster('');
    setHouseFormPatron('');
    setHouseFormMotto('');
    setShowHouseModal(true);
  };

  const openEditHouseModal = (h: HouseItem) => {
    setEditingHouse(h);
    setHouseFormName(h.name);
    setHouseFormColor(h.color);
    setHouseFormMaster(h.master);
    setHouseFormPatron(h.patron || '');
    setHouseFormMotto(h.motto);
    setShowHouseModal(true);
  };

  const handleSaveHouse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!houseFormName) {
      showToast('House name is required.');
      return;
    }

    if (editingHouse) {
      const updated = houses.map(h => h.id === editingHouse.id ? {
        ...h,
        name: houseFormName,
        color: houseFormColor,
        master: houseFormMaster || 'Staff Warden',
        patron: houseFormPatron,
        motto: houseFormMotto || 'Excellence & Discipline'
      } : h);
      onUpdateHouses(updated);
      showToast(`House "${houseFormName}" updated.`);
    } else {
      const newH: HouseItem = {
        id: `house-${Date.now()}`,
        name: houseFormName,
        color: houseFormColor,
        master: houseFormMaster || 'Staff Warden',
        patron: houseFormPatron,
        motto: houseFormMotto || 'Excellence & Discipline'
      };
      onUpdateHouses([...houses, newH]);
      showToast(`House "${houseFormName}" created.`);
    }
    setShowHouseModal(false);
  };

  const handleDeleteHouse = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete ${name}?`)) {
      onUpdateHouses(houses.filter(h => h.id !== id));
      showToast(`${name} deleted.`);
      try { await deleteHouse(id); } catch(e) { console.error(e); }
    }
  };

  const filteredHouses = houses.filter(h => (h.name || '').toLowerCase().includes((houseSearch || '').toLowerCase()));

  // ==========================================
  // 6. SUBJECTS STATE & MODALS
  // ==========================================
  const [subjectSearch, setSubjectSearch] = useState('');
  const [subjectFilterDept, setSubjectFilterDept] = useState('All');
  const [subjectFilterCat, setSubjectFilterCat] = useState('All');
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [showBulkSubjectModal, setShowBulkSubjectModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState<SubjectItem | null>(null);
  const [subjectFormName, setSubjectFormName] = useState('');
  const [subjectFormCode, setSubjectFormCode] = useState('');
  const [subjectFormDept, setSubjectFormDept] = useState(departments[0]?.name || 'Primary School');
  const [subjectFormCat, setSubjectFormCat] = useState<'Core' | 'Elective'>('Core');

  // ====================================================================
  // INTERACTIVE SHS DEPARTMENT & COURSES CURRICULUM BUILDER STATE
  // ====================================================================
  const [shsCurriculumDept, setShsCurriculumDept] = useState<string>('SHS');
  const [shsCurriculumLevel, setShsCurriculumLevel] = useState<string>('Class 2');
  const [shsCurriculumCourse, setShsCurriculumCourse] = useState<string>('General Arts');

  const INITIAL_COURSE_SUBJECTS: Record<string, Array<{ name: string; isCore?: boolean }>> = {
    // PRE-SCHOOL
    'Creche': [
      { name: 'Language & Literacy', isCore: true },
      { name: 'Numeracy', isCore: true },
      { name: 'Creative Activities / Creative Arts' },
      { name: 'Environmental Awareness / Our World' },
      { name: 'Physical Development' },
      { name: 'Personal, Social & Emotional Development' },
      { name: 'Moral/Values Development' }
    ],
    'Nursery 1': [
      { name: 'Language & Literacy', isCore: true },
      { name: 'Numeracy', isCore: true },
      { name: 'Creative Arts' },
      { name: 'Our World / Environmental Awareness' },
      { name: 'Physical Development' },
      { name: 'Religious & Moral Education / Values' },
      { name: 'Personal & Social Development' }
    ],
    'Nursery 2': [
      { name: 'Language & Literacy', isCore: true },
      { name: 'Numeracy', isCore: true },
      { name: 'Creative Arts' },
      { name: 'Our World / Environmental Awareness' },
      { name: 'Physical Development' },
      { name: 'Religious & Moral Education / Values' },
      { name: 'Personal & Social Development' }
    ],
    'KG 1': [
      { name: 'Language & Literacy', isCore: true },
      { name: 'Numeracy', isCore: true },
      { name: 'Our World and Our People', isCore: true },
      { name: 'Creative Arts' },
      { name: 'Physical Development' },
      { name: 'Religious/Moral & Values Education' }
    ],
    'KG 2': [
      { name: 'Language & Literacy', isCore: true },
      { name: 'Numeracy', isCore: true },
      { name: 'Our World and Our People', isCore: true },
      { name: 'Creative Arts' },
      { name: 'Physical Development' },
      { name: 'Religious/Moral & Values Education' }
    ],
    // PRIMARY
    'Basic 1': [
      { name: 'English Language', isCore: true },
      { name: 'Mathematics', isCore: true },
      { name: 'Science', isCore: true },
      { name: 'History', isCore: true },
      { name: 'Religious and Moral Education' },
      { name: 'Creative Arts' },
      { name: 'Physical Education' },
      { name: 'French' },
      { name: 'the regionian Language' },
      { name: 'Computing' }
    ],
    'Basic 2': [
      { name: 'English Language', isCore: true },
      { name: 'Mathematics', isCore: true },
      { name: 'Science', isCore: true },
      { name: 'History', isCore: true },
      { name: 'Religious and Moral Education' },
      { name: 'Creative Arts' },
      { name: 'Physical Education' },
      { name: 'French' },
      { name: 'the regionian Language' },
      { name: 'Computing' }
    ],
    'Basic 3': [
      { name: 'English Language', isCore: true },
      { name: 'Mathematics', isCore: true },
      { name: 'Science', isCore: true },
      { name: 'History', isCore: true },
      { name: 'Religious and Moral Education' },
      { name: 'Creative Arts' },
      { name: 'Physical Education' },
      { name: 'French' },
      { name: 'the regionian Language' },
      { name: 'Computing' }
    ],
    'Basic 4': [
      { name: 'English Language', isCore: true },
      { name: 'Mathematics', isCore: true },
      { name: 'Science', isCore: true },
      { name: 'History', isCore: true },
      { name: 'Religious and Moral Education' },
      { name: 'Creative Arts' },
      { name: 'Physical Education' },
      { name: 'French' },
      { name: 'the regionian Language' },
      { name: 'Computing' }
    ],
    'Basic 5': [
      { name: 'English Language', isCore: true },
      { name: 'Mathematics', isCore: true },
      { name: 'Science', isCore: true },
      { name: 'History', isCore: true },
      { name: 'Religious and Moral Education' },
      { name: 'Creative Arts' },
      { name: 'Physical Education' },
      { name: 'French' },
      { name: 'the regionian Language' },
      { name: 'Computing' }
    ],
    'Basic 6': [
      { name: 'English Language', isCore: true },
      { name: 'Mathematics', isCore: true },
      { name: 'Science', isCore: true },
      { name: 'History', isCore: true },
      { name: 'Religious and Moral Education' },
      { name: 'Creative Arts' },
      { name: 'Physical Education' },
      { name: 'French' },
      { name: 'the regionian Language' },
      { name: 'Computing' }
    ],
    // JHS (CCP Structure)
    'JHS 1': [
      { name: 'English Language', isCore: true },
      { name: 'Mathematics', isCore: true },
      { name: 'Science', isCore: true },
      { name: 'Social Studies', isCore: true },
      { name: 'Computing', isCore: true },
      { name: 'Career Technology' },
      { name: 'Creative Arts and Design' },
      { name: 'Religious and Moral Education' },
      { name: 'Physical Education and Health' },
      { name: 'the regionian Language' },
      { name: 'French Language' }
    ],
    'JHS 2': [
      { name: 'English Language', isCore: true },
      { name: 'Mathematics', isCore: true },
      { name: 'Science', isCore: true },
      { name: 'Social Studies', isCore: true },
      { name: 'Computing', isCore: true },
      { name: 'Career Technology' },
      { name: 'Creative Arts and Design' },
      { name: 'Religious and Moral Education' },
      { name: 'Physical Education and Health' },
      { name: 'the regionian Language' },
      { name: 'French Language' }
    ],
    'JHS 3': [
      { name: 'English Language', isCore: true },
      { name: 'Mathematics', isCore: true },
      { name: 'Science', isCore: true },
      { name: 'Social Studies', isCore: true },
      { name: 'Computing', isCore: true },
      { name: 'Career Technology' },
      { name: 'Creative Arts and Design' },
      { name: 'Religious and Moral Education' },
      { name: 'Physical Education and Health' },
      { name: 'the regionian Language' },
      { name: 'French Language' }
    ],
    // SHS
    'SHS Core Subjects': [
      { name: 'English Language', isCore: true },
      { name: 'Mathematics', isCore: true },
      { name: 'Social Studies', isCore: true },
      { name: 'General Science', isCore: true },
      { name: 'Physical Education and Health', isCore: true },
      { name: 'Robotics and Coding' }
    ],
    'General Science': [
      { name: 'Biology', isCore: false },
      { name: 'Chemistry', isCore: false },
      { name: 'Physics', isCore: false },
      { name: 'Additional Mathematics', isCore: false },
      { name: 'ICT', isCore: false }
    ],
    'General Arts': [
      { name: 'Economics', isCore: false },
      { name: 'Geography', isCore: false },
      { name: 'Government', isCore: false },
      { name: 'History', isCore: false },
      { name: 'Literature in English', isCore: false },
      { name: 'Christian Religious Studies', isCore: false },
      { name: 'Islamic Religious Studies', isCore: false },
      { name: 'the regionian Language', isCore: false },
      { name: 'French', isCore: false }
    ],
    'Business': [
      { name: 'Business Management', isCore: false },
      { name: 'Accounting', isCore: false },
      { name: 'Economics', isCore: false },
      { name: 'Computer Science / ICT', isCore: false },
      { name: 'Additional Mathematics', isCore: false }
    ],
    'Visual & Performing Arts': [
      { name: 'Art and Design Foundation', isCore: false },
      { name: 'Art and Design Studio', isCore: false },
      { name: 'Design & Communication Technology', isCore: false },
      { name: 'Music', isCore: false },
      { name: 'Performing Arts', isCore: false }
    ],
    'Home Economics': [
      { name: 'Management in Living', isCore: false },
      { name: 'Clothing and Textiles', isCore: false },
      { name: 'Food and Nutrition', isCore: false },
      { name: 'Biology', isCore: false },
      { name: 'Chemistry', isCore: false }
    ]
  };

  const [courseCustomSubjects, setCourseCustomSubjects] = useState<Record<string, Array<{ name: string; isCore?: boolean }>>>(INITIAL_COURSE_SUBJECTS);
  const [newCurriculumSubjectInput, setNewCurriculumSubjectInput] = useState('');

  const currentCourseKey = (shsCurriculumDept === 'SHS' || shsCurriculumDept === 'Senior High School') ? shsCurriculumCourse : shsCurriculumDept;
  const activeSubjectList = courseCustomSubjects[currentCourseKey] || courseCustomSubjects['General Arts'] || [];

  const moveSubjectUp = (index: number) => {
    if (index === 0) return;
    const newList = [...activeSubjectList];
    const temp = newList[index - 1];
    newList[index - 1] = newList[index];
    newList[index] = temp;
    setCourseCustomSubjects(prev => ({ ...prev, [currentCourseKey]: newList }));
  };

  const moveSubjectDown = (index: number) => {
    if (index === activeSubjectList.length - 1) return;
    const newList = [...activeSubjectList];
    const temp = newList[index + 1];
    newList[index + 1] = newList[index];
    newList[index] = temp;
    setCourseCustomSubjects(prev => ({ ...prev, [currentCourseKey]: newList }));
  };

  const removeSubjectFromCourse = (index: number) => {
    const newList = activeSubjectList.filter((_, i) => i !== index);
    setCourseCustomSubjects(prev => ({ ...prev, [currentCourseKey]: newList }));
  };

  const addCustomSubjectToCourse = () => {
    if (!newCurriculumSubjectInput.trim()) return;
    const trimmed = newCurriculumSubjectInput.trim();
    if (activeSubjectList.some(s => s.name.toLowerCase() === trimmed.toLowerCase())) {
      showToast('Subject already exists in this curriculum.');
      return;
    }
    const newList = [...activeSubjectList, { name: trimmed }];
    setCourseCustomSubjects(prev => ({ ...prev, [currentCourseKey]: newList }));
    setNewCurriculumSubjectInput('');
    showToast(`Added ${trimmed} to ${currentCourseKey} curriculum.`);
  };

  const resetCurrentCourseSubjects = () => {
    const defaultList = INITIAL_COURSE_SUBJECTS[currentCourseKey] || INITIAL_COURSE_SUBJECTS['General Arts'];
    setCourseCustomSubjects(prev => ({ ...prev, [currentCourseKey]: defaultList }));
    showToast(`Reset ${currentCourseKey} subjects to default.`);
  };

  const openAddSubjectModal = () => {
    setEditingSubject(null);
    setSubjectFormName('');
    setSubjectFormCode('');
    setSubjectFormDept(departments[0]?.name || 'Primary School');
    setSubjectFormCat('Core');
    setShowSubjectModal(true);
  };

  const openEditSubjectModal = (sub: SubjectItem) => {
    setEditingSubject(sub);
    setSubjectFormName(sub.name);
    setSubjectFormCode(sub.code);
    setSubjectFormDept(sub.department);
    setSubjectFormCat(sub.category);
    setShowSubjectModal(true);
  };

  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectFormName.trim()) {
      showToast('Subject name is required.');
      return;
    }

    const trimmedSubName = subjectFormName.trim();
    const generatedCode = subjectFormCode.trim() || `${trimmedSubName.substring(0, 3).toUpperCase()}001`;

    if (editingSubject) {
      const oldSubjectName = editingSubject.name;
      const updated = subjects.map(s => s.id === editingSubject.id ? {
        ...s,
        name: trimmedSubName,
        code: generatedCode,
        department: subjectFormDept,
        category: subjectFormCat
      } : s);
      onUpdateSubjects(updated);
      try { await saveAllSubjects(updated); } catch (err) { console.warn(err); }

      // GLOBAL CASCADE: Propagate subject rename throughout the system
      if (oldSubjectName !== trimmedSubName) {
        // 1. Teachers teaching this subject
        const updatedTeachers = teachers.map(t => {
          if (t.subjectsTaught && t.subjectsTaught.includes(oldSubjectName)) {
            return {
              ...t,
              subjectsTaught: t.subjectsTaught.map(s => s === oldSubjectName ? trimmedSubName : s)
            };
          }
          return t;
        });
        try { await saveAllTeachers(updatedTeachers); } catch (err) { console.warn(err); }

        // 2. Courses referencing this subject
        if (courses && onUpdateCourses) {
          const updatedCourses = courses.map(crs => ({
            ...crs,
            coreSubjects: crs.coreSubjects?.map(s => s === oldSubjectName ? trimmedSubName : s),
            electiveSubjects: crs.electiveSubjects?.map(s => s === oldSubjectName ? trimmedSubName : s)
          }));
          onUpdateCourses(updatedCourses);
          try { await saveAllCourses(updatedCourses); } catch (err) { console.warn(err); }
        }
      }

      showToast(`Subject "${trimmedSubName}" updated and propagated.`);
    } else {
      const newSub: SubjectItem = {
        id: `sub-${Date.now()}`,
        name: trimmedSubName,
        code: generatedCode,
        department: subjectFormDept,
        category: subjectFormCat
      };
      const updated = [...subjects, newSub];
      onUpdateSubjects(updated);
      try { await saveAllSubjects(updated); } catch (err) { console.warn(err); }
      showToast(`Subject "${trimmedSubName}" added across all departments.`);
    }
    setShowSubjectModal(false);
  };

  const handleDeleteSubject = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete Subject "${name}"?`)) {
      onUpdateSubjects(subjects.filter(s => s.id !== id));
      showToast(`Subject ${name} removed.`);
      try { await deleteSubject(id); } catch(e) { console.error(e); }
    }
  };

  const filteredSubjects = subjects.filter(s => {
    const matchesDept = subjectFilterDept === 'All' || s.department === subjectFilterDept;
    const matchesCat = subjectFilterCat === 'All' || s.category === subjectFilterCat;
    const q = (subjectSearch || '').toLowerCase();
    const matchesSearch = (s.name || '').toLowerCase().includes(q) || 
                          ((s.code || '').toLowerCase().includes(q));
    return matchesDept && matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Dynamic Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-slide-up">
          <CheckCircle className="w-5 h-5 text-emerald-400" />
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      {/* ==================================================================== */}
      {/* QUICK ACADEMIC MODULE NAVIGATION TABS */}
      {/* ==================================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-2 shadow-xs flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {[
          { id: 'setup_management', label: 'Overview', icon: Sliders, count: null },
          { id: 'setup_departments', label: 'Departments', icon: Building2, count: departments.length },
          { id: 'manage_courses', label: 'Courses & Programmes', icon: BookOpen, count: courses.length },
          { id: 'setup_classes', label: 'Classes & Streams', icon: School, count: classes.length },
          { id: 'academic_tree_view', label: 'Tree Explorer', icon: FolderTree, count: 'Interactive' },
          { id: 'setup_subjects', label: 'Subjects', icon: BookOpen, count: subjects.length },
          { id: 'setup_houses', label: 'Houses', icon: Shield, count: houses.length },
          { id: 'setup_academic_years', label: 'Academic Years', icon: Calendar, count: academicYears.length },
          { id: 'setup_term_parameters', label: 'Term Parameters', icon: Calendar, count: terms.length },
          { id: 'setup_academic_calendar', label: 'Academic Calendar', icon: Calendar, count: calendarEventsList.length },
          { id: 'setup_graduated_batches', label: 'Graduated Batches', icon: GraduationCap, count: graduatedBatchesList.length },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeModule === tab.id || 
            (tab.id === 'manage_courses' && (activeModule === 'courses' || activeModule === 'setup_manage_courses' || activeModule === 'shs_courses')) ||
            (tab.id === 'setup_management' && activeModule === 'academic_setup');
          return (
            <button
              key={tab.id}
              onClick={() => onNavigate?.(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold text-xs whitespace-nowrap transition-all ${
                isActive 
                  ? 'bg-indigo-600 text-white shadow-xs' 
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
              <span>{tab.label}</span>
              {tab.count !== null && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                  isActive ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ==================================================================== */}
      {/* 0. MASTER SETUP MANAGEMENT HUB (Overview) */}
      {/* ==================================================================== */}
      {(activeModule === 'setup_management' || activeModule === 'academic_setup') && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white rounded-3xl p-6 shadow-md border border-indigo-700/50">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300">
                  Core Institution Framework
                </span>
                <h2 className="text-2xl font-black mt-1">Setup Management Command Center</h2>
                <p className="text-xs text-indigo-200 mt-1 max-w-2xl">
                  Configure structural building blocks of the institution: academic sessions, term scoring parameters, departments, classrooms, student houses, and subject curricula.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-3.5 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-400" /> Active Session: {currentAy?.name || '2025-2026'}
                </span>
              </div>
            </div>
          </div>

          {/* Module Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Card 1: Academic Years */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    {academicYears.length} Sessions
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Academic Years</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Manage active school calendar, archive previous academic years, and set start/end term dates.
                  </p>
                </div>
              </div>
              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={openAddAyModal}
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Year
                </button>
                <button
                  onClick={() => onNavigate && onNavigate('setup_academic_years')}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  Configure <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Card 2: Term / Parameters */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                    <Sliders className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                    {terms.length} Terms
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Term / Parameters</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Set terminal durations, days open, resumption dates, class/exam scoring weightings, and report rules.
                  </p>
                </div>
              </div>
              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={openAddTermModal}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Term
                </button>
                <button
                  onClick={() => onNavigate && onNavigate('setup_term_parameters')}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  Configure <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Card 3: Departments */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800">
                    {departments.length} Depts
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Departments</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Organize Primary, JHS, Senior High School, and assign Heads of Department (HODs).
                  </p>
                </div>
              </div>
              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={openAddDeptModal}
                  className="text-xs font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Dept
                </button>
                <button
                  onClick={() => onNavigate && onNavigate('setup_departments')}
                  className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  Configure <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Card 3B: SHS Courses & Programmes */}
            <div className="bg-white rounded-2xl border border-blue-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-bl-full pointer-events-none" />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
                    {courses.length} SHS Courses
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">SHS Courses / Programmes</h3>
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-blue-100 text-blue-700">SHS</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Science, Visual Arts, Home Economics, etc. Students are placed under courses with automatic Levels 1, 2 & 3.
                  </p>
                </div>
              </div>
              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={openAddCourseModal}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Course
                </button>
                <button
                  onClick={() => onNavigate && onNavigate('setup_shs_courses')}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  Configure <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Card 4: Classes */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                    <School className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
                    {classes.length} Classes
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Classes</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Manage class streams, room assignments, class teacher allocation, and student enrollment capacities.
                  </p>
                </div>
              </div>
              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={openAddClassModal}
                  className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Class
                </button>
                <button
                  onClick={() => onNavigate && onNavigate('setup_classes')}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  Configure <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Card 5: Houses */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                    <Shield className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800">
                    {houses.length} Houses
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Houses</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Setup student competitive houses (Aggrey, Nkrumah, Gbewaa, Yaa Asantewaa), house colors, and masters.
                  </p>
                </div>
              </div>
              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={openAddHouseModal}
                  className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add House
                </button>
                <button
                  onClick={() => onNavigate && onNavigate('setup_houses')}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  Configure <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Card 6: Subjects */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800">
                    {subjects.length} Subjects
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Subjects</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Manage core and elective subject curricula, course codes, departments, and terminal assessment rules.
                  </p>
                </div>
              </div>
              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={openAddSubjectModal}
                  className="text-xs font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Subject
                </button>
                <button
                  onClick={() => onNavigate && onNavigate('setup_subjects')}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  Configure <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Card 7: Academic Calendar & Activities */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                    {calendarEventsList.length} Scheduled
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Academic Calendar</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Setup termly reopening dates, exam weeks, PTA meetings, holidays, vacation, and speech day activities.
                  </p>
                </div>
              </div>
              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={openAddCalModal}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Activity
                </button>
                <button
                  onClick={() => onNavigate && onNavigate('setup_academic_calendar')}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  Configure <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Card 8: Graduated Student Batches */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    {graduatedBatchesList.length} Batches
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Graduated Batches</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Maintain alumni registers, keep historic records of completed students, and manage graduation batches.
                  </p>
                </div>
              </div>
              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={openAddBatchModal}
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Create Batch
                </button>
                <button
                  onClick={() => onNavigate && onNavigate('setup_graduated_batches')}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  Manage <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* ACADEMIC CALENDAR & TERMLY ACTIVITIES MODULE */}
      {/* ==================================================================== */}
      {activeModule === 'setup_academic_calendar' && (() => {
        const filteredCalEvents = calendarEventsList.filter(ev => {
          const matchQ = (ev.title || '').toLowerCase().includes(calSearch.toLowerCase()) ||
                         (ev.description || '').toLowerCase().includes(calSearch.toLowerCase()) ||
                         (ev.location || '').toLowerCase().includes(calSearch.toLowerCase());
          const matchYear = calYearFilter === 'All' || ev.academicYear === calYearFilter;
          const matchTerm = calTermFilter === 'All' || ev.term === calTermFilter;
          const matchCat = calCategoryFilter === 'All' || ev.category === calCategoryFilter;
          return matchQ && matchYear && matchTerm && matchCat;
        });

        return (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-5">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">Termly Schedule & Activities</span>
                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-indigo-600" /> Academic Calendar Management
                </h3>
                <p className="text-xs text-slate-500">
                  Set up reopening dates, vacation schedules, mid-term breaks, examinations, PTA meetings, and sports activities for each term and year.
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleQuickSeedCalendar}
                  className="flex items-center gap-1.5 bg-amber-500/10 text-amber-800 hover:bg-amber-500/20 border border-amber-300 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-amber-600" /> Seed Standard Term Calendar
                </button>
                <button
                  type="button"
                  onClick={openAddCalModal}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Add Activity / Event
                </button>
              </div>
            </div>

            {/* Filters & Color Legend Bar */}
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={calSearch}
                    onChange={(e) => setCalSearch(e.target.value)}
                    placeholder="Search activity title, location..."
                    className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <select
                    value={calYearFilter}
                    onChange={(e) => setCalYearFilter(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-medium"
                  >
                    <option value="All">All Academic Years</option>
                    {academicYears.map(ay => (
                      <option key={ay.id} value={ay.name}>{ay.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <select
                    value={calTermFilter}
                    onChange={(e) => setCalTermFilter(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-medium"
                  >
                    <option value="All">All Terms</option>
                    {terms.map(t => (
                      <option key={t.id} value={t.name}>{t.name}</option>
                    ))}
                    <option value="Full Academic Year">Full Academic Year</option>
                  </select>
                </div>

                <div>
                  <select
                    value={calCategoryFilter}
                    onChange={(e) => setCalCategoryFilter(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-medium"
                  >
                    <option value="All">All Categories</option>
                    <option value="Academic">Academic</option>
                    <option value="Exam">Exam / Assessment</option>
                    <option value="Reopening">Reopening Date</option>
                    <option value="Vacation">Vacation / Closing</option>
                    <option value="Holiday">Holiday / Recess</option>
                    <option value="Sports">Sports & Culture</option>
                    <option value="Meeting">PTA / Staff Meeting</option>
                    <option value="Graduation">Graduation / Speech Day</option>
                  </select>
                </div>
              </div>

              {/* Event Color Legend Bar */}
              <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-2.5 text-xs">
                <span className="text-slate-500 font-extrabold uppercase tracking-wider text-[10px] flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-indigo-600" /> Color Guide:
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2 py-0.5 rounded-lg bg-red-100 text-red-800 border border-red-300 font-extrabold text-[11px] flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-600"></span> Holidays (Red)
                  </span>
                  <span className="px-2 py-0.5 rounded-lg bg-amber-100 text-amber-900 border border-amber-300 font-extrabold text-[11px] flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-600"></span> Exams (Amber)
                  </span>
                  <span className="px-2 py-0.5 rounded-lg bg-blue-100 text-blue-800 border border-blue-300 font-extrabold text-[11px] flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-600"></span> Regular Events (Blue)
                  </span>
                  <span className="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-300 font-extrabold text-[11px] flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-600"></span> Reopening (Emerald)
                  </span>
                  <span className="px-2 py-0.5 rounded-lg bg-purple-100 text-purple-800 border border-purple-300 font-extrabold text-[11px] flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-purple-600"></span> PTA / Meetings (Purple)
                  </span>
                  <span className="px-2 py-0.5 rounded-lg bg-cyan-100 text-cyan-800 border border-cyan-300 font-extrabold text-[11px] flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-cyan-600"></span> Sports (Cyan)
                  </span>
                </div>
              </div>
            </div>

            {/* Activity Cards List */}
            {filteredCalEvents.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-3">
                <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-sm font-bold text-slate-700">No Academic Activities Found</p>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Click "Add Activity / Event" or "Seed Standard Term Calendar" to pre-populate standard term reopening, examination, and vacation dates.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCalEvents.map(event => {
                  const isImportant = !!event.isImportant;
                  const cat = (event.category || 'Academic').toLowerCase();
                  
                  let categoryBadgeStyle = 'bg-blue-100 text-blue-800 border-blue-300';
                  let cardAccentStyle = 'border-l-4 border-l-blue-500 bg-blue-50/10';

                  if (cat.includes('holiday') || cat.includes('vacation') || cat.includes('recess')) {
                    categoryBadgeStyle = 'bg-red-100 text-red-800 border-red-300';
                    cardAccentStyle = 'border-l-4 border-l-red-500 bg-red-50/20';
                  } else if (cat.includes('exam') || cat.includes('assessment') || cat.includes('quiz')) {
                    categoryBadgeStyle = 'bg-amber-100 text-amber-900 border-amber-300';
                    cardAccentStyle = 'border-l-4 border-l-amber-500 bg-amber-50/20';
                  } else if (cat.includes('reopen') || cat.includes('resumption')) {
                    categoryBadgeStyle = 'bg-emerald-100 text-emerald-800 border-emerald-300';
                    cardAccentStyle = 'border-l-4 border-l-emerald-500 bg-emerald-50/20';
                  } else if (cat.includes('meeting') || cat.includes('pta') || cat.includes('staff')) {
                    categoryBadgeStyle = 'bg-purple-100 text-purple-800 border-purple-300';
                    cardAccentStyle = 'border-l-4 border-l-purple-500 bg-purple-50/20';
                  } else if (cat.includes('sport') || cat.includes('game') || cat.includes('culture')) {
                    categoryBadgeStyle = 'bg-cyan-100 text-cyan-800 border-cyan-300';
                    cardAccentStyle = 'border-l-4 border-l-cyan-500 bg-cyan-50/20';
                  }

                  return (
                    <div 
                      key={event.id}
                      className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 relative bg-white ${cardAccentStyle} ${
                        isImportant ? 'shadow-xs ring-1 ring-amber-300' : 'border-slate-200 hover:shadow-sm'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider border ${categoryBadgeStyle}`}>
                            {event.category || 'Academic'}
                          </span>
                          {event.isImportant && (
                            <span className="bg-amber-100 text-amber-900 text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1 border border-amber-300">
                              <Sparkles className="w-3 h-3 text-amber-600" /> High Priority
                            </span>
                          )}
                        </div>

                        <h4 className="font-bold text-slate-900 text-sm leading-snug">{event.title}</h4>
                        
                        <p className="text-xs text-slate-600 line-clamp-2">{event.description}</p>
                      </div>

                      <div className="space-y-2 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-700 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-indigo-500" /> {event.date} {event.endDate ? `to ${event.endDate}` : ''}
                          </span>
                          <span className="font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-bold">
                            {event.term || 'First Term'}
                          </span>
                        </div>

                        {event.location && (
                          <div className="flex items-center gap-1 text-slate-500">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            <span className="truncate">{event.location}</span>
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[10px] font-semibold text-slate-500">
                            Audience: <strong className="text-slate-700">{event.targetAudience || 'All'}</strong>
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => openEditCalModal(event)}
                              className="p-1 hover:bg-slate-100 text-slate-600 hover:text-indigo-600 rounded transition-colors cursor-pointer"
                              title="Edit Event"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCalEvent(event.id, event.title)}
                              className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                              title="Delete Event"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* ==================================================================== */}
      {/* GRADUATED STUDENT BATCHES MODULE */}
      {/* ==================================================================== */}
      {activeModule === 'setup_graduated_batches' && (() => {
        const filteredBatches = graduatedBatchesList.filter(b => {
          const q = gradSearch.toLowerCase();
          const matchQ = (b.batchName || '').toLowerCase().includes(q) ||
                         (b.graduationYear || '').includes(q) ||
                         (b.department || '').toLowerCase().includes(q);
          const matchDept = gradDeptFilter === 'All' || b.department === gradDeptFilter;
          return matchQ && matchDept;
        });

        const graduatedStudents = students.filter(st => {
          if (st.status !== 'Graduated') return false;
          const q = gradSearch.toLowerCase();
          const matchQ = (st.fullName || '').toLowerCase().includes(q) ||
                         (st.admissionNo || '').toLowerCase().includes(q) ||
                         (st.graduationBatch || '').toLowerCase().includes(q);
          const matchBatch = gradBatchFilter === 'All' || st.graduationBatch === gradBatchFilter || st.graduationYear === gradBatchFilter;
          const matchDept = gradDeptFilter === 'All' || st.department === gradDeptFilter;
          return matchQ && matchBatch && matchDept;
        });

        const activeClassStudents = selectedClassToGraduate 
          ? students.filter(st => st.className === selectedClassToGraduate && st.status !== 'Graduated')
          : [];

        return (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-5">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Alumni & Historic Records</span>
                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <GraduationCap className="w-6 h-6 text-emerald-600" /> Graduated Student Batches
                </h3>
                <p className="text-xs text-slate-500">
                  Keep permanent academic records of old students, manage graduating classes, and maintain alumni batch registers.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={openAddBatchModal}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Create Graduated Batch
                </button>
              </div>
            </div>

            {/* Sub Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-200">
              <button
                type="button"
                onClick={() => setGradTab('batches')}
                className={`pb-3 px-4 font-bold text-xs flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                  gradTab === 'batches'
                    ? 'border-emerald-600 text-emerald-700 font-extrabold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Award className="w-4 h-4" /> Graduated Batches ({graduatedBatchesList.length})
              </button>
              <button
                type="button"
                onClick={() => setGradTab('students')}
                className={`pb-3 px-4 font-bold text-xs flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                  gradTab === 'students'
                    ? 'border-emerald-600 text-emerald-700 font-extrabold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Users className="w-4 h-4" /> Old Students Directory ({graduatedStudents.length})
              </button>
              <button
                type="button"
                onClick={() => setGradTab('graduate_class')}
                className={`pb-3 px-4 font-bold text-xs flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                  gradTab === 'graduate_class'
                    ? 'border-emerald-600 text-emerald-700 font-extrabold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Sparkles className="w-4 h-4 text-amber-500" /> Graduate Active Class Tool
              </button>
            </div>

            {/* TAB 1: GRADUATED BATCHES GRID */}
            {gradTab === 'batches' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="relative flex-1 max-w-xs">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={gradSearch}
                      onChange={(e) => setGradSearch(e.target.value)}
                      placeholder="Search batch name or year..."
                      className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                  <span className="text-xs text-slate-500 font-semibold">{filteredBatches.length} Batches Listed</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredBatches.map(batch => (
                    <div key={batch.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:border-slate-300 transition-all space-y-3 flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-mono">
                            Year {batch.graduationYear}
                          </span>
                          <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 text-slate-400" /> {batch.totalStudents || 0} Students
                          </span>
                        </div>

                        <h4 className="text-base font-bold text-slate-900">{batch.batchName}</h4>
                        
                        <div className="text-xs text-slate-600 space-y-1">
                          <p><strong className="text-slate-700">Department:</strong> {batch.department || 'N/A'}</p>
                          <p><strong className="text-slate-700">Completion Class:</strong> {batch.classGraduated || 'N/A'}</p>
                          {batch.graduationDate && <p><strong className="text-slate-700">Date:</strong> {batch.graduationDate}</p>}
                          {batch.notes && <p className="text-slate-500 italic text-[11px] mt-1">{batch.notes}</p>}
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => {
                            setGradBatchFilter(batch.batchName);
                            setGradTab('students');
                          }}
                          className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
                        >
                          View Students <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditBatchModal(batch)}
                            className="p-1 hover:bg-slate-100 text-slate-600 rounded cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteBatch(batch.id, batch.batchName)}
                            className="p-1 hover:bg-rose-50 text-rose-600 rounded cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 2: OLD STUDENTS DIRECTORY */}
            {gradTab === 'students' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={gradSearch}
                      onChange={(e) => setGradSearch(e.target.value)}
                      placeholder="Search old student name, admission no..."
                      className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>

                  <select
                    value={gradBatchFilter}
                    onChange={(e) => setGradBatchFilter(e.target.value)}
                    className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium"
                  >
                    <option value="All">All Graduated Batches</option>
                    {graduatedBatchesList.map(b => (
                      <option key={b.id} value={b.batchName}>{b.batchName}</option>
                    ))}
                  </select>
                </div>

                {graduatedStudents.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                    <GraduationCap className="w-10 h-10 text-slate-300 mx-auto" />
                    <p className="text-sm font-bold text-slate-700">No Old / Graduated Students Found</p>
                    <p className="text-xs text-slate-500">
                      Use the "Graduate Active Class Tool" tab to graduate students from a completed class into an alumni batch.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="p-3">Admission No</th>
                          <th className="p-3">Full Name</th>
                          <th className="p-3">Graduated Batch</th>
                          <th className="p-3">Grad Year</th>
                          <th className="p-3">Department</th>
                          <th className="p-3">Parent Contact</th>
                          <th className="p-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {graduatedStudents.map(st => (
                          <tr key={st.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-3 font-mono font-bold text-slate-700">{st.admissionNo}</td>
                            <td className="p-3 font-bold text-slate-900">{st.fullName}</td>
                            <td className="p-3 font-semibold text-emerald-800 bg-emerald-50 px-2 py-1 rounded border border-emerald-100 inline-block my-1">
                              {st.graduationBatch || 'Graduated Class'}
                            </td>
                            <td className="p-3 font-mono font-bold">{st.graduationYear || '2025'}</td>
                            <td className="p-3 text-slate-600">{st.department}</td>
                            <td className="p-3 text-slate-600">{st.parentName} ({st.parentPhone})</td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                Graduated Alumni
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: GRADUATE ACTIVE CLASS TOOL */}
            {gradTab === 'graduate_class' && (
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-6">
                <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white p-5 rounded-2xl space-y-2">
                  <h4 className="text-lg font-bold flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-400" /> Class Graduation & Transition Tool
                  </h4>
                  <p className="text-xs text-emerald-100 max-w-2xl">
                    Select an active completing class (e.g., Basic 9 or SHS 3), choose a Graduated Batch destination, select students, and click "Graduate Selected Students" to complete their academic record transition.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-4 rounded-xl border border-slate-200">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Select Completing Class</label>
                    <select
                      value={selectedClassToGraduate}
                      onChange={(e) => {
                        setSelectedClassToGraduate(e.target.value);
                        setSelectedStudentIdsForGrad([]);
                      }}
                      className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs font-bold"
                    >
                      <option value="">-- Choose Active Class --</option>
                      {classes.map(c => (
                        <option key={c.id} value={c.name}>{c.name} ({c.department})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Target Graduated Batch</label>
                    <select
                      value={targetGraduationBatchId}
                      onChange={(e) => setTargetGraduationBatchId(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs font-bold"
                    >
                      <option value="">-- Select Target Batch --</option>
                      {graduatedBatchesList.map(b => (
                        <option key={b.id} value={b.id}>{b.batchName} ({b.graduationYear})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Official Graduation Date</label>
                    <input
                      type="date"
                      value={graduationDateInput}
                      onChange={(e) => setGraduationDateInput(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs font-bold"
                    />
                  </div>
                </div>

                {/* Student Selection List */}
                {selectedClassToGraduate && (
                  <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-bold text-slate-900">
                        Students in {selectedClassToGraduate} ({activeClassStudents.length} eligible)
                      </h5>
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedStudentIdsForGrad.length === activeClassStudents.length) {
                            setSelectedStudentIdsForGrad([]);
                          } else {
                            setSelectedStudentIdsForGrad(activeClassStudents.map(s => s.id));
                          }
                        }}
                        className="text-xs font-bold text-emerald-600 hover:text-emerald-700 cursor-pointer"
                      >
                        {selectedStudentIdsForGrad.length === activeClassStudents.length ? 'Deselect All' : 'Select All Students'}
                      </button>
                    </div>

                    <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl">
                      {activeClassStudents.map(st => {
                        const isChecked = selectedStudentIdsForGrad.includes(st.id);
                        return (
                          <label key={st.id} className="flex items-center gap-3 p-2.5 hover:bg-slate-50 cursor-pointer text-xs">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedStudentIdsForGrad(prev => [...prev, st.id]);
                                } else {
                                  setSelectedStudentIdsForGrad(prev => prev.filter(id => id !== st.id));
                                }
                              }}
                              className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                            />
                            <span className="font-mono font-bold text-slate-700">{st.admissionNo}</span>
                            <span className="font-bold text-slate-900 flex-1">{st.fullName}</span>
                            <span className="text-slate-500">{st.gender}</span>
                          </label>
                        );
                      })}
                    </div>

                    <div className="pt-3 flex justify-end">
                      <button
                        type="button"
                        disabled={graduatingProcessing || selectedStudentIdsForGrad.length === 0 || !targetGraduationBatchId}
                        onClick={handleGraduateSelectedStudents}
                        className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
                      >
                        <GraduationCap className="w-4 h-4" />
                        {graduatingProcessing ? 'Processing Graduation...' : `Graduate ${selectedStudentIdsForGrad.length} Selected Students`}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {/* ==================================================================== */}
      {/* 1. ACADEMIC YEARS MODULE */}
      {/* ==================================================================== */}
      {activeModule === 'setup_academic_years' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">School Calendar & Framework</span>
              <h3 className="text-xl font-bold text-slate-900">Academic Years Management</h3>
              <p className="text-xs text-slate-500">Configure, activate, and archive school academic sessions</p>
            </div>
            <button
              onClick={openAddAyModal}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm cursor-pointer transition-all"
            >
              <Plus className="w-4 h-4" /> Add Academic Year
            </button>
          </div>

          {/* Quick Search */}
          <div className="flex flex-wrap items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={aySearch}
                onChange={(e) => setAySearch(e.target.value)}
                placeholder="Search academic year (e.g. 2026-2027)..."
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
              />
            </div>
            <span className="text-xs text-slate-500 font-semibold">{filteredAy.length} Records Found</span>
          </div>

          {/* Current Academic Year Highlight Card */}
          {currentAy && (
            <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-200">School-Wide Active Session</span>
                <span className="bg-emerald-400 text-slate-900 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase">
                  Currently Active
                </span>
              </div>
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                <div>
                  <h4 className="text-2xl font-black">{currentAy.name}</h4>
                  <p className="text-xs text-emerald-100 mt-0.5">
                    Duration: {currentAy.startDate} to {currentAy.endDate}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditAyModal(currentAy)}
                    className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-bold rounded-lg cursor-pointer"
                  >
                    Edit Dates
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 font-bold text-slate-700 uppercase text-[10px]">
                  <th className="p-3 w-14 text-center">S/N</th>
                  <th className="p-3">Academic Session</th>
                  <th className="p-3">Start Date</th>
                  <th className="p-3">End Date</th>
                  <th className="p-3">System Status</th>
                  <th className="p-3">Historical Records</th>
                  <th className="p-3 w-36 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredAy.map((ay, idx) => (
                  <tr key={ay.id} className="hover:bg-slate-50">
                    <td className="p-3 text-center text-slate-500 font-mono">{idx + 1}</td>
                    <td className="p-3 font-bold text-slate-900 flex items-center gap-2">
                      <span>{ay.name}</span>
                      {ay.status === 'Current' && (
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">
                          Current
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-slate-600 font-mono">{ay.startDate}</td>
                    <td className="p-3 text-slate-600 font-mono">{ay.endDate}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        ay.status === 'Current' ? 'bg-emerald-600 text-white' :
                        ay.status === 'Active' ? 'bg-indigo-100 text-indigo-800' :
                        ay.status === 'Upcoming' ? 'bg-amber-100 text-amber-800' :
                        'bg-slate-200 text-slate-700'
                      }`}>
                        {ay.status}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`text-[10px] font-bold ${ay.hasRecords ? 'text-rose-600' : 'text-slate-400'}`}>
                        {ay.hasRecords ? '● Has Student Records' : '○ No Data'}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {ay.status !== 'Current' && (
                          <button
                            title="Set as Current"
                            onClick={() => handleSetCurrentAy(ay.id)}
                            className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded text-[10px] cursor-pointer"
                          >
                            Set Current
                          </button>
                        )}
                        <button
                          title="Edit"
                          onClick={() => openEditAyModal(ay)}
                          className="w-7 h-7 bg-amber-500 hover:bg-amber-600 text-white rounded flex items-center justify-center cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          title="Delete"
                          onClick={() => handleDeleteAy(ay.id, ay.name)}
                          className="w-7 h-7 bg-rose-600 hover:bg-rose-700 text-white rounded flex items-center justify-center cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 2. TERM / PARAMETERS MODULE */}
      {/* ==================================================================== */}
      {activeModule === 'setup_term_parameters' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">Terminal Framework & Assessment</span>
              <h3 className="text-xl font-bold text-slate-900">Terms & Parameters Management</h3>
              <p className="text-xs text-slate-500">Configure academic terms, duration, holidays, and scoring rules</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowParametersConfig(!showParametersConfig)}
                className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5" /> {showParametersConfig ? 'Hide Parameters' : 'Grading Parameters'}
              </button>
              <button
                onClick={openAddTermModal}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm cursor-pointer transition-all"
              >
                <Plus className="w-4 h-4" /> Add Term
              </button>
            </div>
          </div>

          {/* Academic Year Switcher Bar */}
          <div className="bg-indigo-900 text-white p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shadow-xs">
            <div className="flex items-center gap-3">
              <span className="font-bold text-indigo-200 uppercase tracking-wide">Selected Academic Year:</span>
              <select
                value={selectedAyForTerms}
                onChange={(e) => setSelectedAyForTerms(e.target.value)}
                className="bg-white text-slate-900 font-bold px-3 py-1.5 rounded-lg text-xs"
              >
                {academicYears.map(ay => (
                  <option key={ay.id} value={ay.name}>
                    {ay.name} {ay.status === 'Current' ? '(Current Active)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-indigo-700/70 border border-indigo-500 px-3 py-1 rounded-full text-[11px] font-bold">
                {filteredTerms.length} Terms in this Session
              </span>
            </div>
          </div>

          {/* Parameters Settings Collapsible */}
          {showParametersConfig && (
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4 text-xs">
              <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-indigo-600" /> Continuous Assessment & Terminal Parameters
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Class Assessment Score Ratio (%)</label>
                  <input
                    type="number"
                    value={assessmentClassRatio}
                    onChange={(e) => setAssessmentClassRatio(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono font-bold"
                  />
                  <span className="text-[10px] text-slate-400">Default GES is 40%</span>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Exam Score Ratio (%)</label>
                  <input
                    type="number"
                    value={assessmentExamRatio}
                    onChange={(e) => setAssessmentExamRatio(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono font-bold"
                  />
                  <span className="text-[10px] text-slate-400">Default GES is 60%</span>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Pass Mark Threshold (%)</label>
                  <input
                    type="number"
                    value={passingMark}
                    onChange={(e) => setPassingMark(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono font-bold"
                  />
                  <span className="text-[10px] text-slate-400">Minimum score for Grade 1</span>
                </div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowStudentReportDownload}
                    onChange={(e) => setAllowStudentReportDownload(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600"
                  />
                  <span className="font-semibold text-slate-700">Allow Students/Parents to Download Reports for this Session</span>
                </label>
                <button
                  onClick={() => showToast('Parameters saved successfully.')}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-lg font-bold text-xs cursor-pointer shadow-xs"
                >
                  Save Parameters
                </button>
              </div>
            </div>
          )}

          {/* Search bar */}
          <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={termSearch}
                onChange={(e) => setTermSearch(e.target.value)}
                placeholder="Search term by name..."
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
              />
            </div>
            <button
              onClick={() => setTermSearch('')}
              className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold cursor-pointer"
            >
              Reset
            </button>
          </div>

          {/* Terms List */}
          <div className="space-y-3">
            {filteredTerms.map((term, idx) => (
              <div key={term.id} className="bg-white rounded-xl border border-slate-200 p-4 hover:border-slate-300 transition-all">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-indigo-600 text-sm">{idx + 1}.</span>
                      <h4 className="font-bold text-slate-900 text-sm">{term.name}</h4>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        term.status === 'Current' ? 'bg-emerald-600 text-white' :
                        term.status === 'Completed' ? 'bg-slate-200 text-slate-700' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {term.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-medium">
                      <span>📅 {term.startDate} to {term.endDate}</span>
                      <span>⏳ {term.daysOpen} days open</span>
                      <span>🏖️ {term.holidays} holidays</span>
                      {term.nextTermDate && <span>➔ Next term begins: {term.nextTermDate}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-center">
                    {term.status !== 'Current' && (
                      <button
                        onClick={() => handleSetCurrentTerm(term.id)}
                        className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded text-xs cursor-pointer"
                      >
                        Set Active
                      </button>
                    )}
                    <button
                      onClick={() => openEditTermModal(term)}
                      className="w-8 h-8 bg-amber-500 hover:bg-amber-600 text-white rounded-lg flex items-center justify-center cursor-pointer shadow-xs"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteTerm(term.id, term.name)}
                      className="w-8 h-8 bg-rose-600 hover:bg-rose-700 text-white rounded-lg flex items-center justify-center cursor-pointer shadow-xs"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {filteredTerms.length === 0 && (
              <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-xs">
                No terms configured for academic session {selectedAyForTerms}. Click "Add Term" above to create one.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 3. DEPARTMENTS MODULE */}
      {/* ==================================================================== */}
      {activeModule === 'setup_departments' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-700">Institutional Divisions</span>
              <h3 className="text-xl font-bold text-slate-900">Departments Management</h3>
              <p className="text-xs text-slate-500">Manage academic departments, faculty leads, and curricula</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={async () => {
                  const validation = validateMasterStructure(INITIAL_CLASSES, INITIAL_SUBJECTS);
                  if (!validation.valid) {
                    alert(`Seeding Validation Failed! Orphan subjects detected:\n${validation.orphanSubjects.join('\n')}`);
                    return;
                  }
                  if (confirm('Initialize master JIPAS academic structure? This will populate Pre-School, Primary, JHS, and SHS departments, courses, classes, and subjects as specified in the master list.')) {
                    try {
                      await saveAllDepartments(INITIAL_DEPARTMENTS);
                      await saveAllCourses(INITIAL_SHS_COURSES);
                      await saveAllClasses(INITIAL_CLASSES);
                      await saveAllSubjects(INITIAL_SUBJECTS);
                      await saveAllAcademicYears(INITIAL_ACADEMIC_YEARS);
                      await saveAllTerms(INITIAL_TERMS);
                      await saveAllHouses(INITIAL_HOUSES);
                      onUpdateDepartments(INITIAL_DEPARTMENTS);
                      if (onUpdateCourses) onUpdateCourses(INITIAL_SHS_COURSES);
                      onUpdateClasses(INITIAL_CLASSES);
                      onUpdateSubjects(INITIAL_SUBJECTS);
                      onUpdateAcademicYears(INITIAL_ACADEMIC_YEARS);
                      onUpdateTerms(INITIAL_TERMS);
                      onUpdateHouses(INITIAL_HOUSES);
                      showToast('Master JIPAS academic structure seeded successfully with all assigned subjects!');
                    } catch (err) {
                      showToast('Error seeding structure: ' + (err instanceof Error ? err.message : String(err)));
                    }
                  }
                }}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm cursor-pointer transition-all"
              >
                <Sparkles className="w-4 h-4" /> Seed Master JIPAS Structure
              </button>
              <button
                onClick={openAddDeptModal}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm cursor-pointer transition-all"
              >
                <Plus className="w-4 h-4" /> Add Department
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={deptSearch}
                onChange={(e) => setDeptSearch(e.target.value)}
                placeholder="Search department by name or code..."
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
              />
            </div>
            <span className="text-xs font-semibold text-slate-500">{filteredDepts.length} Departments</span>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 font-bold text-slate-700 uppercase text-[10px]">
                  <th className="p-3 w-14 text-center">S/N</th>
                  <th className="p-3">Department Name</th>
                  <th className="p-3">Code</th>
                  <th className="p-3">Head of Department</th>
                  <th className="p-3">Description</th>
                  <th className="p-3 text-center">Classes Count</th>
                  <th className="p-3 w-28 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredDepts.map((dept, idx) => {
                  const deptClassesCount = classes.filter(c => (c.department || '').toLowerCase() === (dept.name || '').toLowerCase()).length;
                  const isShsDept = (dept.name || '').toLowerCase().includes('senior') || dept.code === 'SHS';
                  const isExpanded = expandedDeptSubDepts[dept.id] ?? (isShsDept ? true : false);
                  const subDeptsList = dept.subDepartments && dept.subDepartments.length > 0 
                    ? dept.subDepartments 
                    : (isShsDept ? ['Science', 'Visual Arts', 'Home Economics', 'General Arts', 'Business', 'Agricultural Science'] : []);

                  return (
                    <React.Fragment key={dept.id}>
                      <tr className={`hover:bg-slate-50 transition-colors ${isExpanded && isShsDept ? 'bg-indigo-50/20' : ''}`}>
                        <td className="p-3 text-center text-slate-500 font-mono">{idx + 1}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900 text-xs">{dept.name}</span>
                            {isShsDept && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-800 border border-indigo-200 flex items-center gap-1 shadow-2xs">
                                <Layers className="w-3 h-3 text-indigo-600" />
                                Sub-Department: SHS Courses / Programmes ({subDeptsList.length})
                              </span>
                            )}
                          </div>
                          {isShsDept && (
                            <div className="flex items-center gap-2 mt-1">
                              <button
                                type="button"
                                onClick={() => toggleExpandSubDept(dept.id)}
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 hover:text-indigo-900 hover:underline cursor-pointer"
                              >
                                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                {isExpanded ? 'Hide Sub-Departments' : `View SHS Courses / Programmes (${subDeptsList.length})`}
                              </button>
                              <span className="text-[10px] text-slate-400">•</span>
                              <span className="text-[11px] text-slate-500 truncate max-w-sm">
                                {subDeptsList.join(', ')}
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="p-3 font-mono font-bold text-cyan-700">{dept.code || '--'}</td>
                        <td className="p-3 text-slate-700">{dept.headOfDept || 'Not Assigned'}</td>
                        <td className="p-3 text-slate-500 max-w-xs truncate">{dept.description}</td>
                        <td className="p-3 text-center">
                          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold">
                            {deptClassesCount} Classes
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              title="Edit"
                              onClick={() => openEditDeptModal(dept)}
                              className="w-7 h-7 bg-amber-500 hover:bg-amber-600 text-white rounded flex items-center justify-center cursor-pointer shadow-xs"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              title="Delete"
                              onClick={() => handleDeleteDept(dept.id, dept.name)}
                              className="w-7 h-7 bg-rose-600 hover:bg-rose-700 text-white rounded flex items-center justify-center cursor-pointer shadow-xs"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* SHS SUB-DEPARTMENTS PANEL (CONTAINING SHS COURSES / PROGRAMMES) */}
                      {isShsDept && isExpanded && (
                        <tr className="bg-slate-50/70 border-b border-indigo-100">
                          <td colSpan={7} className="p-4 pl-10 pr-6">
                            <div className="bg-white rounded-2xl p-4 border border-indigo-200 shadow-xs space-y-4">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                                    <GraduationCap className="w-5 h-5" />
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <h4 className="font-extrabold text-slate-900 text-sm tracking-tight">
                                        Sub-Department: SHS Courses / Programmes
                                      </h4>
                                      <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded text-[10px] font-bold">
                                        {effectiveShsCourses.length} Active Tracks
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-slate-500">
                                      Structured curriculum tracks and specialized course streams enrolled under Senior High School
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={openAddCourseModal}
                                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-xs"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                    + Add SHS Course / Programme
                                  </button>
                                  <button
                                    onClick={openAddClassModal}
                                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors"
                                  >
                                    <School className="w-3.5 h-3.5" />
                                    + Add Class Stream
                                  </button>
                                </div>
                              </div>

                              {/* Courses / Programmes Grid */}
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {effectiveShsCourses.map((course) => {
                                  const courseClasses = classes.filter(c => c.course === course.name || c.name.startsWith(course.name));
                                  const enrolledCount = students.filter(s => s.course === course.name || (s.department === dept.name && courseClasses.some(c => c.name === s.className))).length;
                                  return (
                                    <div
                                      key={course.id}
                                      className="bg-slate-50/80 hover:bg-white rounded-xl p-3.5 border border-slate-200 hover:border-indigo-300 hover:shadow-xs transition-all space-y-2.5 text-xs"
                                    >
                                      <div className="flex items-start justify-between gap-2">
                                        <div>
                                          <div className="flex items-center gap-1.5 font-bold text-slate-900">
                                            <span>{course.name}</span>
                                            <span className="font-mono text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-100 px-1.5 py-0.2 rounded font-bold">
                                              {course.code}
                                            </span>
                                          </div>
                                          <span className="text-[11px] text-slate-500 block">
                                            Lead: {course.headOfProgramme || 'HOD Assigned'}
                                          </span>
                                        </div>
                                        <button
                                          onClick={() => openEditCourseModal(course)}
                                          title="Configure Programme"
                                          className="w-7 h-7 bg-white hover:bg-indigo-600 hover:text-white text-slate-600 border border-slate-200 hover:border-indigo-600 rounded-lg flex items-center justify-center transition-colors shadow-2xs"
                                        >
                                          <Edit2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>

                                      <div className="bg-white rounded-lg p-2 border border-slate-100 flex items-center justify-between text-[11px]">
                                        <div>
                                          <span className="text-slate-500 font-semibold">Streams: </span>
                                          <span className="font-bold text-slate-800">
                                            {courseClasses.length > 0 
                                              ? courseClasses.map(c => c.name.replace(course.name, '').trim() || c.name).join(', ')
                                              : 'Level 1, 2, 3'}
                                          </span>
                                        </div>
                                        <span className="bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full text-[10px] border border-emerald-100">
                                          {enrolledCount} Enrolled
                                        </span>
                                      </div>

                                      <div className="text-[10px] text-slate-500">
                                        <span className="font-bold text-slate-600">Electives: </span>
                                        {course.electiveSubjects && course.electiveSubjects.length > 0
                                          ? course.electiveSubjects.slice(0, 3).join(', ') + (course.electiveSubjects.length > 3 ? ` +${course.electiveSubjects.length - 3}` : '')
                                          : 'Standard Electives'}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 3B. SHS COURSES & PROGRAMMES MODULE */}
      {/* ==================================================================== */}
      {(activeModule === 'manage_courses' || activeModule === 'setup_manage_courses' || activeModule === 'setup_shs_courses' || activeModule === 'shs_courses' || activeModule === 'courses') && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-700">Senior High School Curriculum</span>
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-black uppercase">
                  {effectiveShsCourses.length} SHS Programmes
                </span>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                  {courses.length} Total Courses
                </span>
              </div>
              <h3 className="text-xl font-black text-slate-900 mt-1">Manage Courses & SHS Programmes</h3>
              <p className="text-xs text-slate-500">
                Map specific courses (Science, Arts, Business, Home Economics, etc.) to the Senior High School department, generate Level 1-3 class streams, and sync directly to Supabase.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleSyncCoursesToSupabase}
                disabled={isSyncingCourses}
                className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-all disabled:opacity-50"
                title="Force sync all courses to Supabase Cloud Database"
              >
                <Cloud className={`w-3.5 h-3.5 text-blue-600 ${isSyncingCourses ? 'animate-pulse' : ''}`} />
                {isSyncingCourses ? 'Syncing...' : 'Sync Supabase'}
              </button>
              <button
                onClick={openMapShsModal}
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-all"
                title="Quickly map multiple courses to Senior High School"
              >
                <Layers className="w-3.5 h-3.5" /> Map Courses to SHS
              </button>
              <button
                onClick={openAddCourseModal}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-all"
              >
                <Plus className="w-4 h-4" /> Add Course
              </button>
            </div>
          </div>

          {/* Architecture Concept Banner */}
          <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-5 border border-blue-800 shadow-sm space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-blue-300">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-black uppercase tracking-wider">SHS Department Mapping Architecture</span>
              </div>
              <span className="text-[11px] font-mono text-indigo-200 bg-white/10 px-2.5 py-0.5 rounded-full border border-white/10">
                Supabase Table: /courses
              </span>
            </div>
            <p className="text-xs text-slate-200 leading-relaxed max-w-4xl">
              When a course is mapped to the <strong className="text-blue-300">Senior High School</strong> department, it instantly populates the course selection dropdown on the SHS student registration and admission forms. It also automatically configures the Level 1, 2, & 3 class streams (<strong className="text-amber-300">Science 1, Science 2, Science 3</strong>) across grading sheets, terminal reports, and student transcripts.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
              <span className="bg-blue-800/80 border border-blue-600/50 px-3 py-1 rounded-lg font-mono text-blue-100">
                SHS &rarr; Course: Science &rarr; Science 1, 2, 3
              </span>
              <span className="bg-purple-800/80 border border-purple-600/50 px-3 py-1 rounded-lg font-mono text-purple-100">
                SHS &rarr; Course: Visual Arts &rarr; Visual Arts 1, 2, 3
              </span>
              <span className="bg-emerald-800/80 border border-emerald-600/50 px-3 py-1 rounded-lg font-mono text-emerald-100">
                SHS &rarr; Course: Home Economics &rarr; Home Economics 1, 2, 3
              </span>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-blue-700">Total Courses</span>
                <h4 className="text-2xl font-black text-slate-900 mt-0.5">{courses.length} Courses</h4>
              </div>
              <BookOpen className="w-8 h-8 text-blue-600 opacity-70" />
            </div>
            <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-indigo-700">Mapped to SHS</span>
                <h4 className="text-2xl font-black text-slate-900 mt-0.5">{effectiveShsCourses.length} Programmes</h4>
              </div>
              <Layers className="w-8 h-8 text-indigo-600 opacity-70" />
            </div>
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-700">SHS Enrolled Students</span>
                <h4 className="text-2xl font-black text-slate-900 mt-0.5">
                  {students.filter(s => s.department === 'Senior High School' || s.department === 'SHS' || (s.course && s.course.trim().length > 0)).length} Students
                </h4>
              </div>
              <Users className="w-8 h-8 text-emerald-600 opacity-70" />
            </div>
            <div className="p-4 bg-purple-50 rounded-xl border border-purple-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-purple-700">Stream Classes</span>
                <h4 className="text-2xl font-black text-slate-900 mt-0.5">
                  {classes.filter(c => c.department === 'Senior High School' || c.course).length} Classes
                </h4>
              </div>
              <School className="w-8 h-8 text-purple-600 opacity-70" />
            </div>
          </div>

          {/* Department Filter Tabs & Search */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
              <button
                type="button"
                onClick={() => setCourseDeptFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  courseDeptFilter === 'ALL'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                All Courses ({courses.length})
              </button>
              <button
                type="button"
                onClick={() => setCourseDeptFilter('SHS')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  courseDeptFilter === 'SHS'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white text-indigo-700 border border-indigo-200 hover:bg-indigo-50'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Mapped to SHS ({effectiveShsCourses.length})
              </button>
              <button
                type="button"
                onClick={() => setCourseDeptFilter('OTHER')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  courseDeptFilter === 'OTHER'
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                Other Departments ({courses.filter(c => !(c.department || '').toLowerCase().includes('senior') && !(c.department || '').toLowerCase().includes('shs')).length})
              </button>
            </div>

            <div className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={courseSearch}
                  onChange={(e) => setCourseSearch(e.target.value)}
                  placeholder="Search courses by name, code, department, coordinator..."
                  className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>
              {courseSearch && (
                <button
                  onClick={() => setCourseSearch('')}
                  className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Courses Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 font-bold text-slate-700 uppercase text-[10px]">
                  <th className="p-3 w-12 text-center">S/N</th>
                  <th className="p-3">Course / Programme</th>
                  <th className="p-3">Code</th>
                  <th className="p-3">Department Mapping</th>
                  <th className="p-3">Head of Programme / Coordinator</th>
                  <th className="p-3">Level Streams (Classes)</th>
                  <th className="p-3">Elective Subjects</th>
                  <th className="p-3 text-center">Enrolled</th>
                  <th className="p-3 w-32 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredCourses.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-500 space-y-2">
                      <BookOpen className="w-8 h-8 text-slate-400 mx-auto" />
                      <p className="font-bold text-sm text-slate-700">No courses match your filter</p>
                      <p className="text-xs text-slate-500">Add a new course or map existing courses to the Senior High School department.</p>
                      <button
                        onClick={openMapShsModal}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-bold"
                      >
                        <Layers className="w-3.5 h-3.5" /> Map Courses to SHS
                      </button>
                    </td>
                  </tr>
                ) : (
                  filteredCourses.map((course, idx) => {
                    const isShsMapped = (course.department || '').toLowerCase().includes('senior') || (course.department || '').toLowerCase().includes('shs');
                    const enrolledCount = students.filter(s => 
                      ((s.course || '').toLowerCase() === (course.name || '').toLowerCase()) || 
                      ((s.className || '').toLowerCase()).startsWith((course.name || '').toLowerCase())
                    ).length;

                    return (
                      <tr key={course.id} className={`hover:bg-slate-50 transition-colors ${isShsMapped ? 'bg-indigo-50/15' : ''}`}>
                        <td className="p-3 text-center text-slate-500 font-mono">{idx + 1}</td>
                        <td className="p-3">
                          <div className="font-bold text-slate-900 text-sm">{course.name}</div>
                          {course.description && (
                            <div className="text-[11px] text-slate-500 max-w-xs truncate">{course.description}</div>
                          )}
                        </td>
                        <td className="p-3 font-mono font-bold text-blue-700">
                          <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200">
                            {course.code || '--'}
                          </span>
                        </td>
                        <td className="p-3">
                          {isShsMapped ? (
                            <div className="space-y-1">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-2xs">
                                <CheckCircle className="w-3 h-3 text-emerald-600" />
                                Senior High School (SHS)
                              </span>
                              <div>
                                <button
                                  type="button"
                                  onClick={() => handleToggleShsMapping(course)}
                                  className="text-[10px] text-slate-400 hover:text-rose-600 hover:underline cursor-pointer transition-colors"
                                  title="Remove mapping from Senior High School"
                                >
                                  Unmap from SHS
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                {course.department || 'Unassigned'}
                              </span>
                              <div>
                                <button
                                  type="button"
                                  onClick={() => handleToggleShsMapping(course)}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded text-[10px] font-bold cursor-pointer transition-colors"
                                  title="Map this course to the Senior High School department"
                                >
                                  <Layers className="w-2.5 h-2.5" />
                                  + Map to SHS
                                </button>
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-slate-700">
                          {course.headOfProgramme || 'Unassigned'}
                        </td>
                        <td className="p-3">
                          {isShsMapped ? (
                            <div className="flex flex-wrap items-center gap-1">
                              {['1', '2', '3'].map((lvl) => (
                                <span 
                                  key={lvl}
                                  className="px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-900 text-[10px] font-bold font-mono"
                                >
                                  {course.name} {lvl}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">
                              Map to SHS to auto-generate streams
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          {course.electiveSubjects && course.electiveSubjects.length > 0 ? (
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {course.electiveSubjects.map((sub, sIdx) => (
                                <span key={sIdx} className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px]">
                                  {sub}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">None specified</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <span className="bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full font-bold text-xs">
                            {enrolledCount} Students
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              title="Edit Course"
                              onClick={() => openEditCourseModal(course)}
                              className="w-7 h-7 bg-amber-500 hover:bg-amber-600 text-white rounded flex items-center justify-center cursor-pointer shadow-xs"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              title={isShsMapped ? "Unmap from SHS" : "Map to SHS"}
                              onClick={() => handleToggleShsMapping(course)}
                              className={`w-7 h-7 rounded flex items-center justify-center cursor-pointer shadow-xs ${
                                isShsMapped
                                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                  : 'bg-slate-200 hover:bg-indigo-100 text-slate-700 hover:text-indigo-800'
                              }`}
                            >
                              <Layers className="w-3.5 h-3.5" />
                            </button>
                            <button
                              title="Delete Course"
                              onClick={() => handleDeleteCourse(course.id, course.name)}
                              className="w-7 h-7 bg-rose-600 hover:bg-rose-700 text-white rounded flex items-center justify-center cursor-pointer shadow-xs"
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
      )}

      {/* ==================================================================== */}
      {/* 4. CLASSES MODULE */}
      {/* ==================================================================== */}
      {activeModule === 'setup_classes' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Classrooms & Grade Streams</span>
              <h3 className="text-xl font-bold text-slate-900">Classes Management</h3>
              <p className="text-xs text-slate-500">Configure grade levels, assign class teachers, and monitor capacities</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setSyncReport(null);
                  setShowSyncEnrollmentModal(true);
                }}
                className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 px-4 py-2.5 rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-all"
              >
                <RefreshCw className="w-4 h-4" /> Batch Sync Enrollment
              </button>
              <button
                onClick={openAddClassModal}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm cursor-pointer transition-all"
              >
                <Plus className="w-4 h-4" /> Add Class
              </button>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-700">Total Classes</span>
                <h4 className="text-2xl font-black text-slate-900 mt-0.5">{classes.length} Streams</h4>
              </div>
              <School className="w-8 h-8 text-emerald-600 opacity-70" />
            </div>
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-blue-700">Enrolled Students</span>
                <h4 className="text-2xl font-black text-slate-900 mt-0.5">{students.length} Pupils</h4>
              </div>
              <Users className="w-8 h-8 text-blue-600 opacity-70" />
            </div>
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-amber-700">Average Capacity</span>
                <h4 className="text-2xl font-black text-slate-900 mt-0.5">
                  {Math.round(classes.reduce((a, c) => a + c.capacity, 0) / Math.max(1, classes.length))} Seats
                </h4>
              </div>
              <Sparkles className="w-8 h-8 text-amber-600 opacity-70" />
            </div>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-wrap items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={classSearch}
                onChange={(e) => setClassSearch(e.target.value)}
                placeholder="Search by class name or teacher..."
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Department:</span>
              <select
                value={classFilterDept}
                onChange={(e) => setClassFilterDept(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold"
              >
                <option value="All">All Departments</option>
                {departments.map(d => (
                  <option key={d.id} value={d.name}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Classes Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 font-bold text-slate-700 uppercase text-[10px]">
                  <th className="p-3 w-14 text-center">S/N</th>
                  <th className="p-3">Class / Stream</th>
                  <th className="p-3">Department</th>
                  <th className="p-3">Form Master / Teacher</th>
                  <th className="p-3">Room / Hall</th>
                  <th className="p-3 text-center">Enrolled</th>
                  <th className="p-3 text-center">Capacity</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 w-28 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredClasses.map((cls, idx) => {
                  const enrolledCount = students.filter(s => (s.className || '').toLowerCase() === (cls.name || '').toLowerCase()).length;
                  const isNearCapacity = enrolledCount >= cls.capacity * 0.9;
                  return (
                    <tr key={cls.id} className="hover:bg-slate-50">
                      <td className="p-3 text-center text-slate-500 font-mono">{idx + 1}</td>
                      <td className="p-3 font-bold text-slate-900">{cls.name}</td>
                      <td className="p-3 text-slate-700">{cls.department}</td>
                      <td className="p-3 text-slate-800 font-semibold">{cls.classTeacher}</td>
                      <td className="p-3 text-slate-500 font-mono">{cls.roomNumber}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded font-bold font-mono ${
                          isNearCapacity ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {enrolledCount} Pupils
                        </span>
                      </td>
                      <td className="p-3 text-center font-mono text-slate-600">{cls.capacity}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          cls.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {cls.status}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            title="Edit"
                            onClick={() => openEditClassModal(cls)}
                            className="w-7 h-7 bg-amber-500 hover:bg-amber-600 text-white rounded flex items-center justify-center cursor-pointer shadow-xs"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            title="Delete"
                            onClick={() => handleDeleteClass(cls.id, cls.name)}
                            className="w-7 h-7 bg-rose-600 hover:bg-rose-700 text-white rounded flex items-center justify-center cursor-pointer shadow-xs"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

      {/* ==================================================================== */}
      {/* 5. HOUSES MODULE */}
      {/* ==================================================================== */}
      {activeModule === 'setup_houses' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-700">Co-Curricular & Sports</span>
              <h3 className="text-xl font-bold text-slate-900">School Houses Management</h3>
              <p className="text-xs text-slate-500">Configure school houses, color traditions, house masters, and student distribution</p>
            </div>
            <button
              onClick={openAddHouseModal}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm cursor-pointer transition-all"
            >
              <Plus className="w-4 h-4" /> Add House
            </button>
          </div>

          {/* Quick Search */}
          <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={houseSearch}
                onChange={(e) => setHouseSearch(e.target.value)}
                placeholder="Search house by name..."
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
              />
            </div>
            <span className="text-xs font-semibold text-slate-500">{filteredHouses.length} Registered Houses</span>
          </div>

          {/* Houses Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredHouses.map((house) => {
              const count = students.filter(s => (s.house || '').toLowerCase().includes(((house.name || '').toLowerCase()).replace(' house', ''))).length;
              return (
                <div key={house.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs relative overflow-hidden space-y-3">
                  <div 
                    className="absolute top-0 left-0 right-0 h-2" 
                    style={{ backgroundColor: house.color }}
                  />
                  <div className="flex justify-between items-start pt-1">
                    <div>
                      <h4 className="font-bold text-base text-slate-900">{house.name}</h4>
                      <p className="text-[11px] text-slate-500 italic">"{house.motto}"</p>
                    </div>
                    <div 
                      className="w-5 h-5 rounded-full border border-slate-300 shadow-xs flex-shrink-0"
                      style={{ backgroundColor: house.color }}
                    />
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
                    <div className="flex justify-between">
                      <span className="text-slate-400">House Master:</span>
                      <span className="font-bold text-slate-800">{house.master}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Patron:</span>
                      <span className="font-medium text-slate-700">{house.patron || '--'}</span>
                    </div>
                    <div className="flex justify-between items-center pt-1">
                      <span className="text-slate-400">Members:</span>
                      <span className="font-bold text-slate-900 font-mono bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                        {count} Students
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-end gap-1.5 pt-3 border-t border-slate-100">
                    <button
                      onClick={() => openEditHouseModal(house)}
                      className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold rounded text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <Edit2 className="w-3 h-3" /> Edit
                    </button>
                    <button
                      onClick={() => handleDeleteHouse(house.id, house.name)}
                      className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" /> Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 6. SUBJECTS MODULE */}
      {/* ==================================================================== */}
      {activeModule === 'setup_subjects' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-teal-700">Curriculum & Academics</span>
              <h3 className="text-xl font-bold text-slate-900">Subjects Management</h3>
              <p className="text-xs text-slate-500">Configure courses, subject codes, and curriculum classifications</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowBulkSubjectModal(true)}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm cursor-pointer transition-all"
                title="Bulk allocate multiple subjects across classes"
              >
                <Layers className="w-4 h-4" /> Bulk Subject Allocation
              </button>
              <button
                onClick={openAddSubjectModal}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm cursor-pointer transition-all"
              >
                <Plus className="w-4 h-4" /> Add Subject
              </button>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-teal-50 rounded-xl border border-teal-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-teal-700">Total Subjects</span>
                <h4 className="text-2xl font-black text-slate-900 mt-0.5">{subjects.length} Courses</h4>
              </div>
              <BookOpen className="w-8 h-8 text-teal-600 opacity-70" />
            </div>
            <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-indigo-700">Core Subjects</span>
                <h4 className="text-2xl font-black text-slate-900 mt-0.5">
                  {subjects.filter(s => s.category === 'Core').length} Core
                </h4>
              </div>
              <Award className="w-8 h-8 text-indigo-600 opacity-70" />
            </div>
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-amber-700">Elective Subjects</span>
                <h4 className="text-2xl font-black text-slate-900 mt-0.5">
                  {subjects.filter(s => s.category === 'Elective').length} Electives
                </h4>
              </div>
              <Sparkles className="w-8 h-8 text-amber-600 opacity-70" />
            </div>
          </div>

          {/* Interactive SHS Department & Courses Curriculum Builder */}
          <div className="bg-[#0c131d] text-slate-100 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-4">
            {/* Top Bar Selectors */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400">Department:</span>
                <select
                  value={shsCurriculumDept}
                  onChange={(e) => setShsCurriculumDept(e.target.value)}
                  className="bg-[#1e293b] text-white border border-slate-700 font-bold px-3 py-1.5 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="SHS">SHS</option>
                  <option value="Junior High School">Junior High School</option>
                  <option value="Primary School">Primary School</option>
                  <option value="Pre-School">Pre-School</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400">Class:</span>
                <select
                  value={shsCurriculumLevel}
                  onChange={(e) => setShsCurriculumLevel(e.target.value)}
                  className="bg-[#1e293b] text-white border border-slate-700 font-bold px-3 py-1.5 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="Class 1">Class 1</option>
                  <option value="Class 2">Class 2</option>
                  <option value="Class 3">Class 3</option>
                </select>
              </div>

              {(shsCurriculumDept === 'SHS' || shsCurriculumDept === 'Senior High School') && (
                <div className="flex items-center gap-2 animate-fade-in">
                  <span className="text-xs font-bold text-slate-400">Course / Programme:</span>
                  <select
                    value={shsCurriculumCourse}
                    onChange={(e) => setShsCurriculumCourse(e.target.value)}
                    className="bg-[#1e293b] text-white border border-slate-700 font-bold px-3 py-1.5 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    {effectiveShsCourses.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Status Tag Badge */}
            <div className="flex items-center gap-2">
              <span className="bg-[#1e293b] text-slate-300 px-2.5 py-1 rounded-md text-[11px] font-bold border border-slate-700/80">
                Using default subjects
              </span>
              <span className="text-slate-400 text-xs font-semibold">
                {shsCurriculumLevel.replace('Class', 'SHS')} — {shsCurriculumDept === 'SHS' || shsCurriculumDept === 'Senior High School' ? shsCurriculumCourse : shsCurriculumDept}
              </span>
            </div>

            {/* Subject List Box */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-blue-400" />
                    <h4 className="font-bold text-sm text-white">
                      Subject List <span className="text-slate-400 font-normal">({activeSubjectList.length} subjects)</span>
                    </h4>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Drag to reorder, or use the arrows. Remove or add subjects as needed.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => resetCurrentCourseSubjects()}
                  className="text-[11px] text-blue-400 hover:text-blue-300 hover:underline font-semibold cursor-pointer"
                >
                  Reset defaults
                </button>
              </div>

              {/* List items */}
              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {activeSubjectList.map((sub, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-[#131d2a] hover:bg-[#1a2638] rounded-xl border border-slate-800/80 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-slate-400 font-mono text-xs w-5 text-right font-bold">{index + 1}.</span>
                      <span className="font-bold text-xs text-slate-100">{sub.name}</span>
                      {sub.isCore && (
                        <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded text-[10px] font-bold border border-slate-700">
                          Core
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => moveSubjectUp(index)}
                        className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 rounded hover:bg-slate-800 cursor-pointer"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={index === activeSubjectList.length - 1}
                        onClick={() => moveSubjectDown(index)}
                        className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 rounded hover:bg-slate-800 cursor-pointer"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeSubjectFromCourse(index)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 rounded hover:bg-slate-800 ml-1 cursor-pointer"
                        title="Remove Subject"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Subject row */}
              <div className="flex gap-2 pt-2">
                <input
                  type="text"
                  value={newCurriculumSubjectInput}
                  onChange={(e) => setNewCurriculumSubjectInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomSubjectToCourse(); } }}
                  placeholder="e.g. French, Integrated Science..."
                  className="flex-1 bg-[#131d2a] border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={addCustomSubjectToCourse}
                  className="px-4 py-2 bg-[#1e293b] hover:bg-[#28384f] text-white border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </div>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-wrap items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={subjectSearch}
                onChange={(e) => setSubjectSearch(e.target.value)}
                placeholder="Search subject by name or code..."
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Department:</span>
              <select
                value={subjectFilterDept}
                onChange={(e) => setSubjectFilterDept(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold"
              >
                <option value="All">All Departments</option>
                {departments.map(d => (
                  <option key={d.id} value={d.name}>{d.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Category:</span>
              <select
                value={subjectFilterCat}
                onChange={(e) => setSubjectFilterCat(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold"
              >
                <option value="All">All Categories</option>
                <option value="Core">Core</option>
                <option value="Elective">Elective</option>
              </select>
            </div>
          </div>

          {/* Subjects Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 font-bold text-slate-700 uppercase text-[10px]">
                  <th className="p-3 w-14 text-center">S/N</th>
                  <th className="p-3">Subject Name</th>
                  <th className="p-3">Subject Code</th>
                  <th className="p-3">Department</th>
                  <th className="p-3 text-center">Curriculum Type</th>
                  <th className="p-3 w-28 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredSubjects.map((sub, idx) => (
                  <tr key={sub.id} className="hover:bg-slate-50">
                    <td className="p-3 text-center text-slate-500 font-mono">{idx + 1}</td>
                    <td className="p-3 font-bold text-slate-900">{sub.name}</td>
                    <td className="p-3 font-mono font-bold text-teal-700">{sub.code}</td>
                    <td className="p-3 text-slate-700">{sub.department}</td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        sub.category === 'Core' ? 'bg-indigo-100 text-indigo-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {sub.category}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          title="Edit"
                          onClick={() => openEditSubjectModal(sub)}
                          className="w-7 h-7 bg-amber-500 hover:bg-amber-600 text-white rounded flex items-center justify-center cursor-pointer shadow-xs"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          title="Delete"
                          onClick={() => handleDeleteSubject(sub.id, sub.name)}
                          className="w-7 h-7 bg-rose-600 hover:bg-rose-700 text-white rounded flex items-center justify-center cursor-pointer shadow-xs"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 8. ACADEMIC TREE EXPLORER VIEW */}
      {(activeModule === 'academic_tree_view' || activeModule === 'academic_tree' || activeModule === 'tree_view') && (
        <AcademicTreeView
          departments={departments}
          courses={courses}
          classes={classes}
          subjects={subjects}
          onNavigate={onNavigate}
          onUpdateClasses={onUpdateClasses}
        />
      )}

      {/* ==================================================================== */}
      {/* MODAL 1: ACADEMIC YEAR FORM MODAL */}
      {/* ==================================================================== */}
      {showAyModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {editingAy ? 'Edit Academic Year' : 'Add Academic Year'}
              </h3>
              <button onClick={() => setShowAyModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveAy} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Academic Year Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 2028-2029"
                  value={ayFormName}
                  onChange={(e) => setAyFormName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={ayFormStartDate}
                    onChange={(e) => setAyFormStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">End Date *</label>
                  <input
                    type="date"
                    required
                    value={ayFormEndDate}
                    onChange={(e) => setAyFormEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Status</label>
                <select
                  value={ayFormStatus}
                  onChange={(e: any) => setAyFormStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium"
                >
                  <option value="Upcoming">Upcoming</option>
                  <option value="Active">Active</option>
                  <option value="Current">Current (System Active)</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAyModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs"
                >
                  Save Academic Year
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 2: TERM FORM MODAL */}
      {/* ==================================================================== */}
      {showTermModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {editingTerm ? 'Edit Term Details' : `Add Term to ${selectedAyForTerms}`}
              </h3>
              <button onClick={() => setShowTermModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveTerm} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Term Name *</label>
                <select
                  value={termFormName}
                  onChange={(e) => setTermFormName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium"
                >
                  <option value="First Term">First Term</option>
                  <option value="Second Term">Second Term</option>
                  <option value="Third Term">Third Term</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={termFormStartDate}
                    onChange={(e) => setTermFormStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">End Date *</label>
                  <input
                    type="date"
                    required
                    value={termFormEndDate}
                    onChange={(e) => setTermFormEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Days Open</label>
                  <input
                    type="number"
                    value={termFormDaysOpen}
                    onChange={(e) => setTermFormDaysOpen(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Holidays Count</label>
                  <input
                    type="number"
                    value={termFormHolidays}
                    onChange={(e) => setTermFormHolidays(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Next Term Resumes</label>
                <input
                  type="date"
                  value={termFormNextDate}
                  onChange={(e) => setTermFormNextDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Status</label>
                <select
                  value={termFormStatus}
                  onChange={(e: any) => setTermFormStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium"
                >
                  <option value="Upcoming">Upcoming</option>
                  <option value="Current">Current (Active)</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowTermModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs"
                >
                  Save Term
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 3: DEPARTMENT FORM MODAL */}
      {/* ==================================================================== */}
      {showDeptModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {editingDept ? 'Edit Department' : 'Add Department'}
              </h3>
              <button onClick={() => setShowDeptModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveDept} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Department Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Science Department"
                  value={deptFormName}
                  onChange={(e) => setDeptFormName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Code</label>
                  <input
                    type="text"
                    placeholder="e.g. SCI"
                    value={deptFormCode}
                    onChange={(e) => setDeptFormCode(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Head of Dept (HOD)</label>
                  <input
                    type="text"
                    placeholder="e.g. Dr. Kwame Boateng"
                    value={deptFormHOD}
                    onChange={(e) => setDeptFormHOD(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Department curriculum and focus..."
                  value={deptFormDesc}
                  onChange={(e) => setDeptFormDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              {/* Sub-Departments / SHS Courses & Programmes */}
              {(deptFormName.toLowerCase().includes('senior') || deptFormCode === 'SHS' || deptFormSubDepts.length > 0) && (
                <div className="bg-indigo-50/70 p-3.5 rounded-xl border border-indigo-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block font-black text-indigo-900 text-xs flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-indigo-600" />
                      Sub-Departments (SHS Courses / Programmes)
                    </label>
                    <span className="text-[10px] text-indigo-600 font-bold bg-white px-1.5 py-0.5 rounded border border-indigo-200">
                      {deptFormSubDepts.length} Programmes
                    </span>
                  </div>
                  <p className="text-[11px] text-indigo-700 leading-relaxed">
                    Under Senior High School, these sub-departments represent distinct academic tracks/programmes for student enrollment and class streaming.
                  </p>
                  
                  {/* Chips */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {deptFormSubDepts.map((sub, sIdx) => (
                      <span
                        key={sIdx}
                        className="inline-flex items-center gap-1 bg-white border border-indigo-200 text-indigo-900 font-bold px-2 py-0.5 rounded-lg text-[11px] shadow-2xs"
                      >
                        {sub}
                        <button
                          type="button"
                          onClick={() => setDeptFormSubDepts(deptFormSubDepts.filter((_, i) => i !== sIdx))}
                          className="text-slate-400 hover:text-rose-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>

                  {/* Add sub dept input */}
                  <div className="flex items-center gap-1.5 pt-1">
                    <input
                      type="text"
                      placeholder="Add programme (e.g. Technical Science)..."
                      value={newSubDeptInput}
                      onChange={(e) => setNewSubDeptInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (newSubDeptInput.trim()) {
                            setDeptFormSubDepts([...deptFormSubDepts, newSubDeptInput.trim()]);
                            setNewSubDeptInput('');
                          }
                        }
                      }}
                      className="flex-1 px-2.5 py-1.5 bg-white border border-indigo-200 rounded-lg text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newSubDeptInput.trim()) {
                          setDeptFormSubDepts([...deptFormSubDepts, newSubDeptInput.trim()]);
                          setNewSubDeptInput('');
                        }
                      }}
                      className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs"
                    >
                      Add
                    </button>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowDeptModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs"
                >
                  Save Department
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 4: CLASS FORM MODAL */}
      {/* ==================================================================== */}
      {showClassModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {editingClass ? 'Edit Class Details' : 'Add Class / Stream'}
              </h3>
              <button onClick={() => setShowClassModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveClass} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Department *</label>
                <select
                  value={classFormDept}
                  onChange={(e) => {
                    const newDept = e.target.value;
                    setClassFormDept(newDept);
                    if (newDept.toLowerCase().includes('senior') || newDept.toLowerCase().includes('shs')) {
                      if (!classFormCourse || !effectiveShsCourses.some(c => c.name === classFormCourse)) {
                        setClassFormCourse(effectiveShsCourses[0]?.name || 'Science (General)');
                      }
                    }
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium"
                >
                  {departments.map(d => (
                    <option key={d.id} value={d.name}>{d.name}</option>
                  ))}
                </select>
              </div>

              {/* SHS Course & Level Selection if Department is SHS */}
              {(classFormDept.toLowerCase().includes('senior') || classFormDept.toLowerCase().includes('shs')) && (
                <div className="bg-indigo-50/80 p-3 rounded-xl border border-indigo-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-indigo-900 text-xs flex items-center gap-1.5">
                      <GraduationCap className="w-4 h-4 text-indigo-600" />
                      SHS Sub-Department Track
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const chosenCourse = classFormCourse || effectiveShsCourses[0]?.name || 'Science (General)';
                        setClassFormName(`${chosenCourse} ${classFormLevel}`);
                      }}
                      className="text-[10px] text-indigo-700 font-bold hover:underline cursor-pointer"
                    >
                      Auto-fill Class Name
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-bold text-indigo-800 text-[11px] mb-1">Course / Programme</label>
                      <select
                        value={classFormCourse}
                        onChange={(e) => setClassFormCourse(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-indigo-200 rounded-lg font-medium text-xs text-indigo-950"
                      >
                        {effectiveShsCourses.map(c => (
                          <option key={c.id} value={c.name}>{c.name} ({c.code})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block font-bold text-indigo-800 text-[11px] mb-1">SHS Form / Level</label>
                      <select
                        value={classFormLevel}
                        onChange={(e: any) => setClassFormLevel(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-indigo-200 rounded-lg font-medium text-xs text-indigo-950"
                      >
                        <option value="1">SHS 1 (Level 1)</option>
                        <option value="2">SHS 2 (Level 2)</option>
                        <option value="3">SHS 3 (Level 3)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">Class / Form Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Science 1 or Basic 4 A"
                  value={classFormName}
                  onChange={(e) => setClassFormName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Class Teacher / Form Master</label>
                <input
                  type="text"
                  placeholder="e.g. Mr. Evans Lamptey"
                  value={classFormTeacher}
                  onChange={(e) => setClassFormTeacher(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Room / Hall</label>
                  <input
                    type="text"
                    placeholder="e.g. Block B - 102"
                    value={classFormRoom}
                    onChange={(e) => setClassFormRoom(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Student Capacity</label>
                  <input
                    type="number"
                    value={classFormCapacity}
                    onChange={(e) => setClassFormCapacity(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Status</label>
                <select
                  value={classFormStatus}
                  onChange={(e: any) => setClassFormStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowClassModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs"
                >
                  Save Class
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 4B: BATCH SYNC ENROLLMENT MODAL */}
      {/* ==================================================================== */}
      {showSyncEnrollmentModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 border border-slate-200 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-indigo-600 animate-spin-slow" />
                <h3 className="text-base font-bold text-slate-900">
                  Batch Sync & Reconcile Enrollment
                </h3>
              </div>
              <button 
                onClick={() => setShowSyncEnrollmentModal(false)} 
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-600 space-y-2 leading-relaxed">
              <p>
                This high-precision tool scans and reconciles all active student records in the database against the master stream definition table.
              </p>
              <p className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-medium text-slate-500">
                <strong>How it works:</strong> If a student's class field contains minor casing differences, extra spaces, or trailing symbols (e.g. <code className="bg-slate-200 px-1 py-0.5 rounded text-indigo-700">"Basic 1 "</code> instead of <code className="bg-slate-200 px-1 py-0.5 rounded text-emerald-700">"Basic 1"</code>), the system automatically normalizes their database alignment to match the exact official configuration.
              </p>
            </div>

            {/* Audit Actions */}
            <div className="flex justify-center p-2 bg-slate-50 border border-slate-200 rounded-xl">
              <button
                type="button"
                onClick={handleRunSyncEnrollment}
                disabled={isSyncingEnrollment}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-sm transition-all cursor-pointer"
              >
                {isSyncingEnrollment ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Analyzing Master Registrations...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span>Run Master Class Reconciliation Audit</span>
                  </>
                )}
              </button>
            </div>

            {/* Report Panel */}
            {syncReport && (
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                    <span className="block text-[10px] uppercase font-bold text-slate-500">Total Analyzed</span>
                    <strong className="text-lg font-black text-slate-900">{syncReport.totalStudents}</strong>
                  </div>
                  <div className={`p-3 border rounded-xl text-center ${
                    syncReport.correctedCount > 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-slate-50 border-slate-200 text-slate-500'
                  }`}>
                    <span className="block text-[10px] uppercase font-bold">Auto-Corrected</span>
                    <strong className="text-lg font-black">{syncReport.correctedCount}</strong>
                  </div>
                  <div className={`p-3 border rounded-xl text-center ${
                    syncReport.unmatchedCount > 0 ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-slate-50 border-slate-200 text-slate-500'
                  }`}>
                    <span className="block text-[10px] uppercase font-bold">Unmatched / Warnings</span>
                    <strong className="text-lg font-black">{syncReport.unmatchedCount}</strong>
                  </div>
                </div>

                {/* Correction Logs */}
                {syncReport.correctedList.length > 0 && (
                  <div className="space-y-1.5">
                    <h4 className="text-[10px] font-black uppercase text-emerald-800 tracking-wider">
                      Auto-Corrected Discrepancies
                    </h4>
                    <div className="border border-emerald-100 rounded-xl divide-y divide-emerald-50 bg-emerald-50/25 max-h-[120px] overflow-y-auto text-[11px]">
                      {syncReport.correctedList.map((log, i) => (
                        <div key={i} className="p-2 flex justify-between items-center">
                          <span className="font-bold text-slate-700">{log.studentName}</span>
                          <div className="flex items-center gap-1.5 font-mono text-[10px]">
                            <span className="text-rose-600 line-through">"{log.original}"</span>
                            <ArrowRight className="w-3 h-3 text-slate-400" />
                            <span className="bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                              "{log.corrected}"
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Unmatched / Orphan Logs */}
                {syncReport.unmatchedList.length > 0 && (
                  <div className="space-y-1.5">
                    <h4 className="text-[10px] font-black uppercase text-amber-800 tracking-wider">
                      Unmatched Student Records (Requires Review)
                    </h4>
                    <div className="border border-amber-100 rounded-xl divide-y divide-amber-50 bg-amber-50/25 max-h-[120px] overflow-y-auto text-[11px]">
                      {syncReport.unmatchedList.map((log, i) => (
                        <div key={i} className="p-2 flex justify-between items-center">
                          <span className="font-bold text-slate-700">{log.studentName}</span>
                          <div className="flex items-center gap-1.5 text-[10px]">
                            <span className="font-mono text-slate-500">"{log.original}"</span>
                            <span className="bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded font-sans text-[9px]">
                              {log.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {syncReport.correctedCount === 0 && syncReport.unmatchedCount === 0 && (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-center text-xs font-bold flex items-center justify-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span>Master student synchronization verified. Enrollment counts match perfectly!</span>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowSyncEnrollmentModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer transition-all"
              >
                Close Panel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 5: HOUSE FORM MODAL */}
      {/* ==================================================================== */}
      {showHouseModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {editingHouse ? 'Edit House' : 'Add School House'}
              </h3>
              <button onClick={() => setShowHouseModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveHouse} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">House Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Blue House or Nkrumah House"
                  value={houseFormName}
                  onChange={(e) => setHouseFormName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">House Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={houseFormColor}
                    onChange={(e) => setHouseFormColor(e.target.value)}
                    className="w-10 h-10 p-0.5 rounded-lg border border-slate-300 cursor-pointer"
                  />
                  <div className="flex gap-2">
                    {['#2563eb', '#16a34a', '#ca8a04', '#dc2626', '#9333ea', '#0d9488'].map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setHouseFormColor(c)}
                        className="w-6 h-6 rounded-full border border-slate-300"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">House Master / Mistress</label>
                <input
                  type="text"
                  placeholder="e.g. Mr. Evans Lamptey"
                  value={houseFormMaster}
                  onChange={(e) => setHouseFormMaster(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Patron</label>
                <input
                  type="text"
                  placeholder="e.g. Board of Governors"
                  value={houseFormPatron}
                  onChange={(e) => setHouseFormPatron(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">House Motto / Slogan</label>
                <input
                  type="text"
                  placeholder="e.g. Truth, Integrity and Diligence"
                  value={houseFormMotto}
                  onChange={(e) => setHouseFormMotto(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowHouseModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-xs"
                >
                  Save House
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 6: SUBJECT FORM MODAL */}
      {/* ==================================================================== */}
      {showSubjectModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {editingSubject ? 'Edit Subject' : 'Add Subject'}
              </h3>
              <button onClick={() => setShowSubjectModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveSubject} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Subject Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mathematics"
                  value={subjectFormName}
                  onChange={(e) => setSubjectFormName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Subject Code</label>
                  <input
                    type="text"
                    placeholder="e.g. MAT001"
                    value={subjectFormCode}
                    onChange={(e) => setSubjectFormCode(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Curriculum Category</label>
                  <select
                    value={subjectFormCat}
                    onChange={(e: any) => setSubjectFormCat(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium"
                  >
                    <option value="Core">Core Subject</option>
                    <option value="Elective">Elective Subject</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Department</label>
                <select
                  value={subjectFormDept}
                  onChange={(e) => setSubjectFormDept(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium"
                >
                  {departments.map(d => (
                    <option key={d.id} value={d.name}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowSubjectModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-xs"
                >
                  Save Subject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BULK SUBJECT ALLOCATION MODAL */}
      {showBulkSubjectModal && (
        <BulkSubjectAssignmentModal
          isOpen={showBulkSubjectModal}
          onClose={() => setShowBulkSubjectModal(false)}
          subjects={subjects}
          classes={classes}
          teachers={teachers}
          onComplete={(_count, message) => {
            showToast(message);
          }}
        />
      )}

      {/* ==================================================================== */}
      {/* MODAL 3B: SHS COURSE FORM MODAL */}
      {/* ==================================================================== */}
      {showCourseModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingCourse ? 'Edit SHS Course / Programme' : 'Add SHS Course / Programme'}
                  </h3>
                  <p className="text-[11px] text-slate-500">Senior High School Curriculum & Stream Definition</p>
                </div>
              </div>
              <button onClick={() => setShowCourseModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCourse} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Course / Programme Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Science, Visual Arts, Home Economics, General Arts"
                  value={courseFormName}
                  onChange={(e) => setCourseFormName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Students will be enrolled under this course with automatic Levels 1, 2, and 3 classes.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Course Code</label>
                  <input
                    type="text"
                    placeholder="e.g. SCI, VA, HE"
                    value={courseFormCode}
                    onChange={(e) => setCourseFormCode(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono uppercase focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Department Mapping *</label>
                  <select
                    value={courseFormDept}
                    onChange={(e) => setCourseFormDept(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    <option value="Senior High School">Senior High School (SHS)</option>
                    {departments.filter(d => d.name !== 'Senior High School').map(d => (
                      <option key={d.id} value={d.name}>{d.name}</option>
                    ))}
                    {!departments.some(d => d.name === 'General') && (
                      <option value="General">General / Non-SHS</option>
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Head of Programme / Coordinator</label>
                <input
                  type="text"
                  placeholder="e.g. Dr. Kwesi Boateng"
                  value={courseFormHod}
                  onChange={(e) => setCourseFormHod(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Elective Subjects (Comma-separated)</label>
                <input
                  type="text"
                  placeholder="e.g. Physics, Chemistry, Biology, Elective Mathematics"
                  value={courseFormElectives}
                  onChange={(e) => setCourseFormElectives(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Programme Description / Overview</label>
                <textarea
                  rows={2}
                  placeholder="Brief overview of the SHS programme curriculum..."
                  value={courseFormDesc}
                  onChange={(e) => setCourseFormDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              {/* Automatic stream creation note */}
              {courseFormDept.toLowerCase().includes('senior') || courseFormDept.toLowerCase().includes('shs') ? (
                <div className="bg-blue-50 p-3 rounded-xl border border-blue-200 text-[11px] text-blue-900 flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Automatic Class Generation:</strong> Mapped to Senior High School. Saving will automatically establish and configure classes for <strong>{courseFormName || 'Course'} 1, {courseFormName || 'Course'} 2, & {courseFormName || 'Course'} 3</strong>.
                  </span>
                </div>
              ) : (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-[11px] text-slate-700 flex items-start gap-2">
                  <Layers className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                  <span>
                    This course will be saved under <strong>{courseFormDept}</strong>. It will not appear in the Senior High School registration dropdown unless mapped to SHS.
                  </span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCourseModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl cursor-pointer hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs cursor-pointer transition-all"
                >
                  {editingCourse ? 'Update Course' : 'Create & Save Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 3C: MAP COURSES TO SENIOR HICFA SCHOOL (SHS) */}
      {/* ==================================================================== */}
      {showMapShsModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 border border-slate-200 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-xs">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Map Courses to Senior High School (SHS)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Select the academic programmes that belong to the SHS Department. Mapped courses automatically populate the SHS student registration dropdown and generate Levels 1, 2, & 3 classes.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowMapShsModal(false)} 
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Actions & Metrics */}
            <div className="flex items-center justify-between bg-indigo-50/60 p-3 rounded-xl border border-indigo-100 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-indigo-900">
                  {selectedShsCourseIds.length} of {courses.length} courses selected
                </span>
                <span className="text-slate-400">•</span>
                <span className="text-[11px] text-indigo-700">
                  Will be mapped to Senior High School
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedShsCourseIds(courses.map(c => c.id))}
                  className="px-2.5 py-1 bg-white hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedShsCourseIds([])}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                >
                  Deselect All
                </button>
              </div>
            </div>

            {/* Courses Checkbox List */}
            <div className="overflow-y-auto flex-1 divide-y divide-slate-100 border border-slate-200 rounded-xl">
              {courses.map((course) => {
                const isSelected = selectedShsCourseIds.includes(course.id);
                return (
                  <label
                    key={course.id}
                    className={`flex items-start gap-3 p-3 cursor-pointer transition-colors ${
                      isSelected ? 'bg-indigo-50/40 hover:bg-indigo-50/70' : 'hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedShsCourseIds(prev => [...prev, course.id]);
                        } else {
                          setSelectedShsCourseIds(prev => prev.filter(id => id !== course.id));
                        }
                      }}
                      className="mt-0.5 w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-xs">{course.name}</span>
                        <span className="font-mono text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                          {course.code || '--'}
                        </span>
                        {isSelected ? (
                          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                            ✓ Mapped to SHS
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                            Current: {course.department || 'Unassigned'}
                          </span>
                        )}
                      </div>
                      {course.description && (
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">{course.description}</p>
                      )}
                      {course.electiveSubjects && course.electiveSubjects.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {course.electiveSubjects.slice(0, 4).map((sub, i) => (
                            <span key={i} className="text-[9px] bg-slate-100 text-slate-600 px-1 py-0.2 rounded">
                              {sub}
                            </span>
                          ))}
                          {course.electiveSubjects.length > 4 && (
                            <span className="text-[9px] text-slate-400">+{course.electiveSubjects.length - 4} more</span>
                          )}
                        </div>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <span className="text-[11px] text-slate-500">
                Changes will sync to Supabase and refresh registration dropdowns immediately.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowMapShsModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveShsCourseMappings}
                  disabled={isSyncingCourses}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-xs cursor-pointer transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Cloud className="w-3.5 h-3.5" />
                  {isSyncingCourses ? 'Saving to Supabase...' : 'Save & Sync to Supabase'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CALENDAR EVENT MODAL */}
      {showCalModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 space-y-5 animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-600" />
                {editingCalEvent ? 'Edit Calendar Event' : 'Add Calendar Event / Activity'}
              </h3>
              <button
                type="button"
                onClick={() => setShowCalModal(false)}
                className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCalEvent} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Activity Title *</label>
                <input
                  type="text"
                  required
                  value={calFormTitle}
                  onChange={(e) => setCalFormTitle(e.target.value)}
                  placeholder="e.g. End of Term Mid-Term Examination"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={calFormStartDate}
                    onChange={(e) => setCalFormStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">End Date (Optional)</label>
                  <input
                    type="date"
                    value={calFormEndDate}
                    onChange={(e) => setCalFormEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Academic Year</label>
                  <select
                    value={calFormAcademicYear}
                    onChange={(e) => setCalFormAcademicYear(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold"
                  >
                    {academicYears.map(ay => (
                      <option key={ay.id} value={ay.name}>{ay.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Academic Term</label>
                  <select
                    value={calFormTerm}
                    onChange={(e) => setCalFormTerm(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold"
                  >
                    {terms.map(t => (
                      <option key={t.id} value={t.name}>{t.name}</option>
                    ))}
                    <option value="Full Academic Year">Full Academic Year</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={calFormCategory}
                    onChange={(e) => setCalFormCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold"
                  >
                    <option value="Academic">Academic</option>
                    <option value="Exam">Exam / Assessment</option>
                    <option value="Reopening">Reopening Date</option>
                    <option value="Vacation">Vacation / Closing</option>
                    <option value="Holiday">Holiday / Recess</option>
                    <option value="Sports">Sports & Culture</option>
                    <option value="Meeting">PTA / Staff Meeting</option>
                    <option value="Graduation">Graduation / Speech Day</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Target Audience</label>
                  <select
                    value={calFormTargetAudience}
                    onChange={(e) => setCalFormTargetAudience(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold"
                  >
                    <option value="All">All School</option>
                    <option value="Students">Students Only</option>
                    <option value="Teachers">Teachers / Staff</option>
                    <option value="Parents">Parents (PTA)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Venue / Location</label>
                <input
                  type="text"
                  value={calFormLocation}
                  onChange={(e) => setCalFormLocation(e.target.value)}
                  placeholder="e.g. Main Assembly Hall / Sports Field"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="calFormIsImportant"
                  checked={calFormIsImportant}
                  onChange={(e) => setCalFormIsImportant(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300"
                />
                <label htmlFor="calFormIsImportant" className="text-xs font-bold text-slate-800 cursor-pointer">
                  Mark as High Priority / Crucial Date
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Event Description & Notes</label>
                <textarea
                  rows={2}
                  value={calFormDescription}
                  onChange={(e) => setCalFormDescription(e.target.value)}
                  placeholder="Provide brief details regarding this activity..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCalModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 cursor-pointer shadow-sm"
                >
                  Save Activity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GRADUATED BATCH MODAL */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 space-y-5 animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-emerald-600" />
                {editingBatch ? 'Edit Graduated Batch' : 'Create Graduated Batch'}
              </h3>
              <button
                type="button"
                onClick={() => setShowBatchModal(false)}
                className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBatch} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Batch Name *</label>
                <input
                  type="text"
                  required
                  value={batchFormName}
                  onChange={(e) => setBatchFormName(e.target.value)}
                  placeholder="e.g. Class of 2025 (Basic 9 / JHS)"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Graduation Year *</label>
                  <input
                    type="text"
                    required
                    value={batchFormYear}
                    onChange={(e) => setBatchFormYear(e.target.value)}
                    placeholder="2025"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Academic Year</label>
                  <select
                    value={batchFormAcademicYear}
                    onChange={(e) => setBatchFormAcademicYear(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold"
                  >
                    {academicYears.map(ay => (
                      <option key={ay.id} value={ay.name}>{ay.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Department</label>
                  <select
                    value={batchFormDepartment}
                    onChange={(e) => setBatchFormDepartment(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold"
                  >
                    {departments.map(d => (
                      <option key={d.id} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Graduation Date</label>
                  <input
                    type="date"
                    value={batchFormDate}
                    onChange={(e) => setBatchFormDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Completion Class / Level</label>
                <input
                  type="text"
                  value={batchFormClass}
                  onChange={(e) => setBatchFormClass(e.target.value)}
                  placeholder="e.g. Basic 9 / SHS 3"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Notes & Ceremony Remarks</label>
                <textarea
                  rows={2}
                  value={batchFormNotes}
                  onChange={(e) => setBatchFormNotes(e.target.value)}
                  placeholder="e.g. Successfully completed BECE 2025 Examinations."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowBatchModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 cursor-pointer shadow-sm"
                >
                  Save Batch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

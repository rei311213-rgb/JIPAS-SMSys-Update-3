import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Teacher, Student, TermReport, ScoreItem, ClassReportBroadcast, StudentBill, PaymentRecord, CalendarEvent, NotificationItem, TeacherAttendanceRecord, StudentAttendanceRecord, StaffLoginUpdateRequest, UserAccountItem } from '../types';
import { 
  Building, School, BookOpen, Award, CheckCircle, Clock, Save, Bell, 
  Search, Users, Calendar, AlertCircle, FileText, Check, X, Phone, 
  CheckCircle2, KeyRound, UserCheck, Shield, ChevronDown, ChevronUp, 
  Menu, LogOut, Edit3, HelpCircle, User, ArrowRight, Printer, Download, Sparkles, RefreshCw, Filter,
  PanelLeftClose, PanelLeftOpen, UserPlus, Inbox, CheckSquare, Layers, Calculator,
  HardDrive, Database, QrCode, Camera, LogIn, BarChart3
} from 'lucide-react';
import JIPASLogo from './common/JIPASLogo';
import SidebarToggleButton from './common/SidebarToggleButton';
import PhotoUploader from './common/PhotoUploader';
import BackupRecoveryManager from './admin/BackupRecoveryManager';
import GlobalSearchHeader from './common/GlobalSearchHeader';
import SyncNowButton from './common/SyncNowButton';
import { useStudentFormDraft } from '../hooks/useStudentFormDraft';
import { StudentFormDraftData } from '../services/studentDraftService';
import DraftStatusBanner from './common/DraftStatusBanner';
import { saveStudent, saveReport, saveAllReports, subscribeSettings, saveNotification, subscribeTeacherAttendance, saveTeacherAttendanceRecord, subscribeStudentAttendance, saveStudentAttendanceRecord, getStoredUsers, getStoredStaffLoginUpdateRequests, subscribeStaffLoginUpdateRequests, submitStaffLoginUpdateRequest, getActiveAcademicPeriod } from '../services/dbService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

import StaffAttendanceQRScanner from './staff/StaffAttendanceQRScanner';
import { StaffAttendanceService, StaffAttendanceRecord as SupaStaffAttendanceRecord } from '../services/supabase/staffAttendanceService';
import ClassPerformanceOverview from './teacher/ClassPerformanceOverview';
import ExamTimetableManager from './admin/ExamTimetableManager';
import { INITIAL_SHS_COURSES } from '../data/setupData';

export const SELECTIVE_CONDUCT_PRESETS = [
  'Excellent, respectful & highly disciplined',
  'Well-behaved, obedient & courteous',
  'Polite, cooperative & responsible',
  'Gentle, humble & well-mannered',
  'Good conduct; maintains school rules',
  'Calm & steady deportment',
  'Satisfactory, but can occasionally be playful',
  'Restless & easily distracted; needs monitoring',
  'Needs to show more respect to peers & school rules',
  'Inconsistent conduct; behavioral guidance needed'
];

export const SELECTIVE_ATTITUDE_PRESETS = [
  'Very attentive, diligent & hardworking',
  'Shows keen enthusiasm & high commitment',
  'Attentive, motivated & consistently focused',
  'Active participant in class discussions',
  'Calm, steady & methodical worker',
  'Satisfactory effort, but capable of higher achievement',
  'Easily distracted; needs to concentrate more during lessons',
  'Inconsistent submission of homework; needs supervision',
  'Passive in class activities; encouragement needed',
  'Needs to sit up and show more seriousness towards studies'
];

export const SELECTIVE_INTEREST_PRESETS = [
  'Reading, Creative Arts & ICT',
  'Mathematics, Puzzles & Science Club',
  'Sports, Athletics & Football',
  'Music, Singing, Choir & Drama',
  'Debating, Public Speaking & Current Affairs',
  'Gardening, Agriculture & Environmental Stewardship',
  'Cultural Dance & Performing Arts',
  'Drawing, Painting & Handcrafts',
  'Leadership, Red Cross & Cadet Corp',
  'Robotics, Coding & STEM Projects',
  'Spelling Bee, Scrabble & Chess'
];

export const SELECTIVE_TEACHER_REMARKS = [
  {
    category: 'Distinction & High Honours',
    remarks: [
      'An outstanding academic performance! Keep maintaining this brilliant standard.',
      'Excellent terminal results across all subjects. A very promising scholar.',
      'Exceptional brilliance, dedication, and exemplary character shown this term. Kudos!',
      'Top-tier scholarly achievement. Maintains high intellectual rigor.'
    ]
  },
  {
    category: 'Commendable & Good Progress',
    remarks: [
      'Very good performance. Maintain this high level of dedication and enthusiasm.',
      'Good work done this term. Keep pushing for greater excellence.',
      'A disciplined, hardworking, and promising student. Promoted with merit.',
      'Consistent academic improvement shown throughout the term. Keep it up.'
    ]
  },
  {
    category: 'Satisfactory & Capable',
    remarks: [
      'Satisfactory performance, but capable of doing much better with more focus.',
      'Fair performance. Needs to put in more effort next term, especially in core areas.',
      'Average performance. Needs regular home revision and disciplined study habits.'
    ]
  },
  {
    category: 'Remedial & Guidance Needed',
    remarks: [
      'Below average performance. Requires serious academic intervention and remedial support.',
      'Poor terminal performance. Needs to sit up and attend remedial classes.',
      'Weak performance in core subjects. Strict parental guidance recommended.'
    ]
  }
];

interface TeacherPortalProps {
  teacher: Teacher;
  students: Student[];
  teachers?: Teacher[];
  departments?: any[];
  courses?: any[];
  classes?: any[];
  subjects?: any[];
  houses?: any[];
  reports: TermReport[];
  bills?: StudentBill[];
  payments?: PaymentRecord[];
  calendarEvents?: CalendarEvent[];
  notifications?: NotificationItem[];
  broadcasts?: ClassReportBroadcast[];
  onUpdateReport?: (updatedReport: TermReport) => void;
  onUpdateBroadcasts?: (updatedBroadcasts: ClassReportBroadcast[]) => void;
  onAddStudent?: (newStudent: Student) => void;
  onRestoreData?: (data: {
    students?: Student[];
    teachers?: Teacher[];
    reports?: TermReport[];
    bills?: StudentBill[];
    payments?: PaymentRecord[];
  }) => void;
  onLogout?: () => void;
}

export const VALID_TEACHER_VIEWS = new Set<string>([
  'dashboard',
  'enter_results',
  'attendance_comment',
  'profile',
  'change_password',
  'review_reports',
  'backup_recovery',
  'performance_overview',
  'exam_timetable',
  'scan_entrance_qr',
  'my_attendance'
]);

export type TeacherViewType = 'dashboard' | 'enter_results' | 'attendance_comment' | 'profile' | 'change_password' | 'review_reports' | 'backup_recovery' | 'performance_overview' | 'exam_timetable' | 'scan_entrance_qr' | 'my_attendance';

export const getInitialTeacherView = (): TeacherViewType => {
  if (typeof window !== 'undefined') {
    if (localStorage.getItem('jipas_force_dashboard') === 'true') {
      localStorage.removeItem('jipas_force_dashboard');
      window.location.hash = 'teacher/dashboard';
      return 'dashboard';
    }
    const hash = window.location.hash.replace(/^#\/?/, '');
    if (hash.startsWith('teacher/')) {
      const viewPart = hash.replace('teacher/', '');
      if (VALID_TEACHER_VIEWS.has(viewPart)) {
        return viewPart as TeacherViewType;
      }
    } else if (VALID_TEACHER_VIEWS.has(hash)) {
      return hash as TeacherViewType;
    }
    const saved = localStorage.getItem('jipas_active_page_teacher');
    if (saved && VALID_TEACHER_VIEWS.has(saved)) {
      return saved as TeacherViewType;
    }
  }
  return 'dashboard';
};

function MyPersonalAttendanceLogsView({ teacherId }: { teacherId: string }) {
  const [logs, setLogs] = useState<SupaStaffAttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchMyLogs = async () => {
    setIsLoading(true);
    try {
      const records = await StaffAttendanceService.listAttendance({
        staffId: teacherId
      });
      setLogs(records);
    } catch (err) {
      console.warn('Error loading personal attendance logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMyLogs();
  }, [teacherId]);

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-1.5">
            <Clock className="w-5 h-5 text-indigo-600 animate-pulse" />
            <span>My Personal Attendance Logs</span>
          </h2>
          <p className="text-xs text-slate-500">Authorized real-time database timestamps for your campus check-ins.</p>
        </div>
        <button
          onClick={fetchMyLogs}
          disabled={isLoading}
          className="p-2 hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-700 transition-colors cursor-pointer flex items-center gap-1.5 font-bold text-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="overflow-x-auto border border-slate-100 rounded-2xl bg-white">
        <table className="w-full text-left text-xs whitespace-nowrap">
          <thead>
            <tr className="bg-slate-50 text-slate-500 font-extrabold text-[10px] uppercase border-b border-slate-100">
              <th className="p-3">Roster Date</th>
              <th className="p-3">Sign In Time</th>
              <th className="p-3">Sign Out Time</th>
              <th className="p-3">Status</th>
              <th className="p-3">Source</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {logs.length > 0 ? (
              logs.map(log => {
                const formattedIn = log.sign_in_at ? new Date(log.sign_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--';
                const formattedOut = log.sign_out_at ? new Date(log.sign_out_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--';
                return (
                  <tr key={log.id} className="hover:bg-slate-50/50">
                    <td className="p-3 font-bold text-slate-900">{log.attendance_date}</td>
                    <td className="p-3 font-mono text-emerald-600 font-extrabold">{formattedIn}</td>
                    <td className="p-3 font-mono text-slate-500">{formattedOut}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                        log.status === 'Present' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                        log.status === 'Late' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                        log.status === 'Absent' ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                        'bg-indigo-50 text-indigo-700 border border-indigo-100'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="p-3 text-slate-500 font-bold uppercase text-[9px]">{log.source}</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-400 font-semibold">
                  No personal attendance timestamps recorded for this staff member yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function TeacherPortal({ 
  teacher, 
  students, 
  teachers = [],
  reports, 
  bills = [],
  payments = [],
  calendarEvents = [],
  notifications = [],
  broadcasts = [],
  classes = [],
  subjects = [],
  departments = [],
  courses = [],
  houses = [],
  onUpdateReport,
  onUpdateBroadcasts,
  onAddStudent,
  onRestoreData,
  onLogout
}: TeacherPortalProps) {
  // Navigation active view with persistence across page reloads
  const [activeView, setActiveView] = useState<TeacherViewType>(() => getInitialTeacherView());
  const [activeRole, setActiveRole] = useState<'teacher' | 'headteacher' | 'hod'>('teacher');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('jipas_teacher_sidebar_open');
      if (saved !== null) {
        return saved === 'true';
      }
      return window.innerWidth >= 1024;
    }
    return true;
  });
   const [showAcademicBanner, setShowAcademicBanner] = useState(true);
  const [isAssignmentsCollapsed, setIsAssignmentsCollapsed] = useState(false);
  const [systemSettings, setSystemSettings] = useState<any>(null);

  // Auto-created login details & update with admin approval
  const [userAccount, setUserAccount] = useState<UserAccountItem | null>(() => {
    const allUsers = getStoredUsers();
    return allUsers.find(u => u.staffId === teacher.id || u.id === teacher.id || u.email?.toLowerCase() === teacher.email?.toLowerCase()) || null;
  });
  const [staffLoginRequests, setStaffLoginRequests] = useState<StaffLoginUpdateRequest[]>(() => {
    const all = getStoredStaffLoginUpdateRequests();
    return all.filter(r => r.staffId === teacher.id || r.userId === teacher.id);
  });
  const [showEditLoginModal, setShowEditLoginModal] = useState(false);
  const [editReqUsername, setEditReqUsername] = useState('');
  const [editReqEmail, setEditReqEmail] = useState('');
  const [editReqPhone, setEditReqPhone] = useState('');
  const [editReqPassword, setEditReqPassword] = useState('');
  const [editReqReason, setEditReqReason] = useState('');
  const [isSubmittingEditReq, setIsSubmittingEditReq] = useState(false);
  const [loginReqToast, setLoginReqToast] = useState('');

  useEffect(() => {
    const unsub = subscribeStaffLoginUpdateRequests((loadedRequests) => {
      if (loadedRequests) {
        setStaffLoginRequests(loadedRequests.filter(r => r.staffId === teacher.id || r.userId === teacher.id));
      }
      const allUsers = getStoredUsers();
      const matched = allUsers.find(u => u.staffId === teacher.id || u.id === teacher.id || u.email?.toLowerCase() === teacher.email?.toLowerCase());
      if (matched) setUserAccount(matched);
    });
    return () => unsub();
  }, [teacher.id, teacher.email]);

  const handleOpenEditLoginModal = () => {
    setEditReqUsername(userAccount?.username || teacher.id);
    setEditReqEmail(userAccount?.email || teacher.email || '');
    setEditReqPhone(userAccount?.phone || teacher.phone || '');
    setEditReqPassword('');
    setEditReqReason('');
    setShowEditLoginModal(true);
  };

  const handleSubmitStaffLoginRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editReqReason.trim()) {
      alert('Please provide a reason for requesting this credential update.');
      return;
    }
    setIsSubmittingEditReq(true);
    try {
      const newReq: StaffLoginUpdateRequest = {
        id: `req-${Date.now()}`,
        userId: userAccount?.id || teacher.id,
        staffId: teacher.id,
        teacherName: teacher.name,
        currentUsername: userAccount?.username || teacher.id,
        currentEmail: userAccount?.email || teacher.email || '',
        currentPhone: userAccount?.phone || teacher.phone || '',
        requestedUsername: editReqUsername.trim() !== (userAccount?.username || teacher.id) ? editReqUsername.trim() : undefined,
        requestedEmail: editReqEmail.trim() !== (userAccount?.email || teacher.email || '') ? editReqEmail.trim() : undefined,
        requestedPhone: editReqPhone.trim() !== (userAccount?.phone || teacher.phone || '') ? editReqPhone.trim() : undefined,
        requestedPassword: editReqPassword.trim() ? editReqPassword.trim() : undefined,
        reason: editReqReason.trim(),
        status: 'Pending',
        requestedAt: new Date().toISOString(),
        campus: teacher.campus || 'General'
      };
      await submitStaffLoginUpdateRequest(newReq);
      setShowEditLoginModal(false);
      setLoginReqToast('Your login detail update request has been submitted for Administrator approval!');
      setTimeout(() => setLoginReqToast(''), 6000);
    } catch (err: any) {
      alert(err?.message || 'Failed to submit update request.');
    } finally {
      setIsSubmittingEditReq(false);
    }
  };

  useEffect(() => {
    const unsub = subscribeSettings((settings) => {
      if (settings) {
        setSystemSettings(settings);
      }
    });
    return () => unsub();
  }, []);

  // Sync activeView to localStorage and URL hash
  useEffect(() => {
    try {
      localStorage.setItem('jipas_active_page_teacher', activeView);
      window.location.hash = `teacher/${activeView}`;
    } catch (e) {
      console.warn('Could not sync teacher view to storage/hash:', e);
    }
  }, [activeView]);

  // Sync sidebar open state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('jipas_teacher_sidebar_open', String(isSidebarOpen));
    } catch (e) {
      console.warn('Could not sync teacher sidebar state:', e);
    }
  }, [isSidebarOpen]);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#\/?/, '');
      const viewPart = hash.startsWith('teacher/') ? hash.replace('teacher/', '') : hash;
      if (VALID_TEACHER_VIEWS.has(viewPart)) {
        setActiveView(viewPart as TeacherViewType);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleNavigate = (view: TeacherViewType) => {
    setActiveView(view);
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Helper to determine the department of a given class name
  const getClassDepartmentName = (clsName: string): string => {
    const lower = (clsName || '').toLowerCase().trim();
    if (lower.includes('creche') || lower.includes('nursery') || lower.includes('kg') || lower.includes('kindergarten') || lower.includes('pre')) {
      return 'Pre-School';
    }
    if (lower.includes('jhs') || lower.includes('junior')) {
      return 'Junior High School';
    }
    if (lower.includes('shs') || lower.includes('science') || lower.includes('arts') || lower.includes('business') || lower.includes('economics') || lower.includes('visual') || lower.includes('agricultural')) {
      return 'Senior High School';
    }
    return 'Primary School';
  };

  // Helper to get all classes for a specific department
  const getDepartmentClassesList = (deptName: string): string[] => {
    const lower = (deptName || '').toLowerCase().trim();
    if (lower.includes('pre') || lower.includes('nursery') || lower.includes('kindergarten') || lower.includes('kg') || lower.includes('creche')) {
      return ['Creche', 'Nursery 1', 'Nursery 2', 'KG 1', 'KG 2'];
    }
    if (lower.includes('junior') || lower.includes('jhs')) {
      return ['JHS 1', 'JHS 2', 'JHS 3'];
    }
    if (lower.includes('senior') || lower.includes('shs')) {
      return [
        'SHS 1', 'SHS 2', 'SHS 3',
        'General Science 1', 'General Science 2', 'General Science 3',
        'General Arts 1', 'General Arts 2', 'General Arts 3',
        'Business 1', 'Business 2', 'Business 3',
        'Visual & Performing Arts 1', 'Visual & Performing Arts 2', 'Visual & Performing Arts 3',
        'Home Economics 1', 'Home Economics 2', 'Home Economics 3'
      ];
    }
    return ['Basic 1', 'Basic 2', 'Basic 3', 'Basic 4', 'Basic 5', 'Basic 6'];
  };

  const teacherAssignedClasses = useMemo(() => {
    if (Array.isArray(teacher?.classesTaught) && teacher.classesTaught.length > 0) {
      return teacher.classesTaught.filter(Boolean);
    }
    return [];
  }, [teacher?.classesTaught]);

  // Department options filtered by teacher assigned classes
  const departmentOptions = useMemo(() => {
    let baseDepts = ['Pre-School / Kindergarten', 'Primary School', 'Junior High School', 'Senior High School'];
    if (Array.isArray(departments) && departments.length > 0) {
      const names = departments.map(d => typeof d === 'object' ? d.name : d).filter(Boolean);
      baseDepts = Array.from(new Set(names));
    }
    if (teacherAssignedClasses.length > 0) {
      const assignedDepts = Array.from(new Set(teacherAssignedClasses.map(getClassDepartmentName)));
      if (assignedDepts.length > 0) {
        return baseDepts.filter(d => assignedDepts.includes(d));
      }
    }
    return baseDepts;
  }, [departments, teacherAssignedClasses]);

  // Initial department based on teacher's assigned classes or profile
  const initialDept = useMemo(() => {
    if (teacherAssignedClasses.length > 0) {
      return getClassDepartmentName(teacherAssignedClasses[0]);
    }
    if (teacher?.department) {
      const d = teacher.department.toLowerCase();
      if (d.includes('pre') || d.includes('early')) return 'Pre-School';
      if (d.includes('junior') || d.includes('jhs')) return 'Junior High School';
      if (d.includes('senior') || d.includes('shs')) return 'Senior High School';
      return 'Primary School';
    }
    return 'Primary School';
  }, [teacherAssignedClasses, teacher?.department]);

  const [selectedDepartment, setSelectedDepartment] = useState<string>(() => {
    if (teacherAssignedClasses.length > 0) {
      return getClassDepartmentName(teacherAssignedClasses[0]);
    }
    return initialDept;
  });

  // Available classes for the currently selected department, filtered by teacher assigned classes
  const availableClassesForDept = useMemo(() => {
    const allDeptClasses = getDepartmentClassesList(selectedDepartment);
    
    // Also include any dynamically passed classes that match this department
    if (Array.isArray(classes) && classes.length > 0) {
      classes.forEach(c => {
        const cName = typeof c === 'object' ? c.name : c;
        const cDept = typeof c === 'object' ? c.department : '';
        if (cName && (cDept ? cDept.toLowerCase() === selectedDepartment.toLowerCase() : getClassDepartmentName(cName) === selectedDepartment)) {
          if (!allDeptClasses.includes(cName)) {
            allDeptClasses.push(cName);
          }
        }
      });
    }

    if (teacherAssignedClasses.length > 0) {
      const assignedInDept = teacherAssignedClasses.filter(c => {
        const deptOfClass = getClassDepartmentName(c);
        return deptOfClass === selectedDepartment || 
               (selectedDepartment === 'Pre-School' && (c.includes('Creche') || c.includes('Nursery') || c.includes('KG'))) ||
               (selectedDepartment === 'Junior High School' && c.includes('JHS')) ||
               (selectedDepartment === 'Primary School' && (c.includes('Basic') || c.includes('Class'))) ||
               (selectedDepartment === 'Senior High School' && (c.includes('SHS') || c.includes('Science') || c.includes('Arts') || c.includes('Business') || c.includes('Economics') || c.includes('Visual')));
      });
      // When teacher is assigned classes for this department, show ONLY their assigned classes
      return assignedInDept;
    }
    return allDeptClasses;
  }, [selectedDepartment, teacherAssignedClasses, classes]);

  const defaultClasses = availableClassesForDept;
  const [selectedClass, setSelectedClass] = useState<string>(() => {
    if (teacherAssignedClasses.length > 0) {
      const firstMatching = teacherAssignedClasses.find(c => getClassDepartmentName(c) === initialDept);
      return firstMatching || teacherAssignedClasses[0];
    }
    return availableClassesForDept[0] || 'Basic 1';
  });

  const handleDepartmentChange = (newDept: string) => {
    setSelectedDepartment(newDept);
    const classesForNewDept = getDepartmentClassesList(newDept);
    if (teacherAssignedClasses.length > 0) {
      const assignedInNewDept = teacherAssignedClasses.filter(c => getClassDepartmentName(c) === newDept);
      if (assignedInNewDept.length > 0) {
        setSelectedClass(assignedInNewDept[0]);
        return;
      }
    }
    if (classesForNewDept.length > 0) {
      setSelectedClass(classesForNewDept[0]);
    }
  };

  const getSubjectsForDepartment = (deptName: string): string[] => {
    const lower = (deptName || '').toLowerCase().trim();
    if (lower.includes('pre') || lower.includes('nursery') || lower.includes('kg') || lower.includes('creche')) {
      return ['Language & Literacy', 'Numeracy', 'Creative Arts', 'Our World & Environmental Awareness', 'Physical Development', 'Personal, Social & Emotional Development', 'Religious/Moral & Values Education'];
    }
    if (lower.includes('junior') || lower.includes('jhs')) {
      return ['English Language', 'Mathematics', 'Science', 'Social Studies', 'Computing', 'Career Technology', 'Creative Arts and Design', 'Religious and Moral Education', 'Physical Education and Health', 'Ghanaian Language', 'French Language', 'Arabic'];
    }
    if (lower.includes('senior') || lower.includes('shs')) {
      return ['English Language', 'Mathematics (Core)', 'Integrated Science', 'Social Studies', 'Elective Mathematics', 'Biology', 'Chemistry', 'Physics', 'Geography', 'Economics', 'Government', 'History', 'Literature in English', 'Financial Accounting', 'Business Management', 'French'];
    }
    return ['English Language', 'Ghanaian Language', 'Mathematics', 'Science', 'History', 'Creative Arts', 'Religious and Moral Education', 'Physical Education', 'French', 'Computing'];
  };

  const defaultSubjects = useMemo(() => {
    if (Array.isArray(teacher?.subjectsTaught) && teacher.subjectsTaught.length > 0) {
      return teacher.subjectsTaught;
    }
    return getSubjectsForDepartment(selectedDepartment);
  }, [teacher?.subjectsTaught, selectedDepartment]);

  const [selectedSubject, setSelectedSubject] = useState<string>(defaultSubjects[0] || 'English Language');

  const [academicYear, setAcademicYear] = useState(() => getActiveAcademicPeriod().academicYear);
  const [academicTerm, setAcademicTerm] = useState(() => getActiveAcademicPeriod().academicTerm);

  const findCurrentReport = (studentId: string, admissionNo?: string) => {
    return reports.find(r => 
      (r.studentId === studentId || (admissionNo && r.admissionNo === admissionNo)) && 
      r.term === academicTerm && 
      r.academicYear === academicYear
    );
  };

  useEffect(() => {
    const handleUpdate = () => {
      const current = getActiveAcademicPeriod();
      setAcademicYear(current.academicYear);
      setAcademicTerm(current.academicTerm);
    };
    window.addEventListener('storage', handleUpdate);
    window.addEventListener('jipas_cloud_synced', handleUpdate);
    return () => {
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('jipas_cloud_synced', handleUpdate);
    };
  }, []);

  // Loaded students state
  const [isStudentsLoaded, setIsStudentsLoaded] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHouseFilter, setSelectedHouseFilter] = useState('All Houses');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('All Statuses');
  const [saveSuccessToast, setSaveSuccessToast] = useState<string | null>(null);
  const [isSendingReminders, setIsSendingReminders] = useState(false);

  // QR Code Office Attendance State
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [qrModalInitialMode, setQrModalInitialMode] = useState<'scan_office_qr' | 'office_terminal' | 'my_qr_badge'>('scan_office_qr');
  const [attendanceRecords, setAttendanceRecords] = useState<TeacherAttendanceRecord[]>([]);

  // Live Server Clock for Real-Time Attendance Validation
  const [liveServerClock, setLiveServerClock] = useState<Date>(new Date());
  useEffect(() => {
    const clockInterval = setInterval(() => {
      setLiveServerClock(new Date());
    }, 1000);
    return () => clearInterval(clockInterval);
  }, []);

  useEffect(() => {
    const unsub = subscribeTeacherAttendance((records) => {
      setAttendanceRecords(records);
    });
    return () => unsub();
  }, []);

  const todayStr = liveServerClock.toISOString().slice(0, 10);
  const myTodayAttendanceRecord = attendanceRecords.find(
    r => (r.teacherId === teacher?.id || r.teacherId === teacher?.staffId) && r.date === todayStr
  );
  
  // Review Report Cards State
  const [reviewingStudent, setReviewingStudent] = useState<Student | null>(null);
  const [submissionNotes, setSubmissionNotes] = useState('');

  // Lock status for the current selected class report batch
  const currentBroadcast = broadcasts?.find(b => b.className === selectedClass && b.academicYear === academicYear && b.term === academicTerm);
  const isSubmissionLocked = currentBroadcast?.status === 'Submitted' || currentBroadcast?.status === 'Published';

  // Local scores buffer for editing subject scores
  // Keyed by student id -> { classScore: number, examScore: number }
  const [subjectScores, setSubjectScores] = useState<Record<string, { classScore: number; examScore: number }>>({});

  // Detailed SBA Score buffer: studentId -> { classwork: number, homework: number, classTest: number }
  const [detailedSbaScores, setDetailedSbaScores] = useState<Record<string, {
    classwork: number;
    homework: number;
    classTest: number;
  }>>({});

  // Student Terminal Remarks buffer: studentId -> remarks object
  const [terminalRemarks, setTerminalRemarks] = useState<Record<string, {
    conduct: string;
    attitude: string;
    interest: string;
    teacherComment: string;
    attendancePresent: number;
    promotionDecision: string;
  }>>({});

  // Attendance & Remarks State
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().slice(0, 10));
  const [attendanceSubTab, setAttendanceSubTab] = useState<'register' | 'remarks'>('register');
  const [attendanceRegister, setAttendanceRegister] = useState<Record<string, 'Present' | 'Late' | 'Absent' | 'Excused'>>({});
  const [studentAttendanceRecords, setStudentAttendanceRecords] = useState<StudentAttendanceRecord[]>([]);

  useEffect(() => {
    const unsub = subscribeStudentAttendance((records) => {
      setStudentAttendanceRecords(records);
    });
    return () => unsub();
  }, []);

  // Load existing student attendance record when class or date changes
  useEffect(() => {
    const recordId = `att-${selectedClass.replace(/\s+/g, '-').toLowerCase()}-${attendanceDate}`;
    const existing = studentAttendanceRecords.find(r => r.id === recordId);
    if (existing) {
      setAttendanceRegister(existing.records || {});
    } else {
      // Default all class students to Present
      const defaultRegister: Record<string, 'Present' | 'Late' | 'Absent' | 'Excused'> = {};
      classStudents.forEach(st => {
        defaultRegister[st.id] = 'Present';
      });
      setAttendanceRegister(defaultRegister);
    }
  }, [selectedClass, attendanceDate, studentAttendanceRecords, students.length]);
  
  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordToast, setPasswordToast] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Sync subjectScores, detailedSbaScores, and terminalRemarks buffer when context changes
  useEffect(() => {
    const nextSubjectScores: Record<string, { classScore: number; examScore: number }> = {};
    const nextDetailedSbaScores: Record<string, { classwork: number; homework: number; classTest: number }> = {};
    const nextTerminalRemarks: Record<string, any> = {};

    students.forEach(st => {
      const rep = findCurrentReport(st.id, st.admissionNo);
      
      // Sync Subject Scores
      const scoreObj = rep?.scores?.find(s => s.subject.toLowerCase() === selectedSubject.toLowerCase());
      if (scoreObj) {
        nextSubjectScores[st.id] = { classScore: scoreObj.classScore || 0, examScore: scoreObj.examScore || 0 };
      } else {
        nextSubjectScores[st.id] = { classScore: 0, examScore: 0 };
      }

      // Sync Detailed SBA
      nextDetailedSbaScores[st.id] = {
        classwork: scoreObj?.classWork || 0,
        homework: scoreObj?.homework || 0,
        classTest: scoreObj?.projectTest || 0
      };
      
      if (scoreObj && !scoreObj.classWork && !scoreObj.homework && !scoreObj.projectTest && scoreObj.classScore > 0) {
         // Backwards compatibility split if we only have the total
         nextDetailedSbaScores[st.id] = {
           classwork: Math.min(10, Math.floor(scoreObj.classScore * 0.25)),
           homework: Math.min(10, Math.floor(scoreObj.classScore * 0.25)),
           classTest: Math.min(20, Math.floor(scoreObj.classScore * 0.5))
         };
      }

      // Sync Terminal Remarks
      nextTerminalRemarks[st.id] = {
        conduct: rep?.conduct || 'Good & respectful',
        attitude: rep?.attitude || 'Attentive and eager to learn',
        interest: rep?.interest || 'Reading & Sports',
        teacherComment: rep?.teacherComment || 'Satisfactory performance. Shows great potential.',
        attendancePresent: rep?.attendancePresent || 0,
        promotionDecision: rep?.promotionDecision || 'Promoted'
      };
    });

    setSubjectScores(nextSubjectScores);
    setDetailedSbaScores(nextDetailedSbaScores);
    setTerminalRemarks(nextTerminalRemarks);
  }, [selectedSubject, selectedClass, reports, academicYear, academicTerm, students]);

  // Class students filtered
  const classStudents = students.filter(s => {
    // If teacher is assigned specific classes, prevent viewing students from unassigned classes
    if (teacherAssignedClasses.length > 0 && !teacherAssignedClasses.includes(selectedClass)) {
      return false;
    }
    const matchesClass = s.className === selectedClass;
    const matchesSearch = s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          s.admissionNo.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesHouse = selectedHouseFilter === 'All Houses' || 
                         (s.house && s.house.toLowerCase() === selectedHouseFilter.toLowerCase());
    const matchesStatus = selectedStatusFilter === 'All Statuses' || 
                          (s.status && s.status.toLowerCase() === selectedStatusFilter.toLowerCase());
    return matchesClass && matchesSearch && matchesHouse && matchesStatus;
  });

  // Subject Average Chart Data for selectedClass
  const subjectAveragesData = React.useMemo(() => {
    const subjectSums: Record<string, { sum: number; count: number }> = {};
    
    reports.forEach(rep => {
      const isClassStudent = classStudents.some(st => st.id === rep.studentId || st.admissionNo === rep.admissionNo);
      if (isClassStudent && rep.scores) {
        rep.scores.forEach(sc => {
          if (!subjectSums[sc.subject]) {
            subjectSums[sc.subject] = { sum: 0, count: 0 };
          }
          subjectSums[sc.subject].sum += sc.total;
          subjectSums[sc.subject].count += 1;
        });
      }
    });

    const list = Object.keys(subjectSums).map(subName => {
      const { sum, count } = subjectSums[subName];
      return {
        subject: subName,
        average: Math.round(sum / count),
      };
    });

    if (list.length === 0) {
      return [
        { subject: 'English', average: 72 },
        { subject: 'Mathematics', average: 65 },
        { subject: 'Science', average: 78 },
        { subject: 'Social Studies', average: 68 },
        { subject: 'RME', average: 82 },
      ];
    }
    return list;
  }, [reports, classStudents]);

  // Grade calculator helper (GES 1-9 grading scale)
  const calculateGrade = (total: number) => {
    if (total >= 80) return { grade: '1', remark: 'Higher' };
    if (total >= 70) return { grade: '2', remark: 'Higher' };
    if (total >= 65) return { grade: '3', remark: 'High' };
    if (total >= 60) return { grade: '4', remark: 'High' };
    if (total >= 55) return { grade: '5', remark: 'Average' };
    if (total >= 50) return { grade: '6', remark: 'Average' };
    if (total >= 45) return { grade: '7', remark: 'Pass' };
    if (total >= 40) return { grade: '8', remark: 'Pass' };
    return { grade: '9', remark: 'Fail' };
  };

  // Continuous Assessment (SBA) Breakdown Mode Toggle
  const [isDetailedSbaMode, setIsDetailedSbaMode] = useState<boolean>(false);
  const [isBulkEditMode, setIsBulkEditMode] = useState<boolean>(false);

  // Enroll New Student State for Teacher's Portal
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
  const [enrollCampus, setEnrollCampus] = useState<'JIPAS 1' | 'JIPAS 2'>(teacher.campus || 'JIPAS 1');
  const [enrollNationality, setEnrollNationality] = useState('Ghanaian');
  const [enrollBloodGroup, setEnrollBloodGroup] = useState('O+');
  const [enrollParentName, setEnrollParentName] = useState('');
  const [enrollParentPhone, setEnrollParentPhone] = useState('');
  const [enrollPhoto, setEnrollPhoto] = useState('');
  const [enrollNotes, setEnrollNotes] = useState('');
  const [isSubmittingEnrollment, setIsSubmittingEnrollment] = useState(false);
  const [enrollmentToast, setEnrollmentToast] = useState<string | null>(null);

  const effectiveTeacherShsCourses = useMemo(() => {
    const list = (courses || []).filter(c => {
      const d = (c.department || '').toLowerCase();
      return d.includes('senior') || d.includes('shs');
    });
    return list.length > 0 ? list : INITIAL_SHS_COURSES;
  }, [courses]);

  const getTeacherClassesForDept = (dept: string) => {
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

  const getTeacherAvailableElectives = (courseName: string) => {
    const allCourses = [...effectiveTeacherShsCourses, ...(courses || [])];
    const match = allCourses.find(c =>
      c.name.toLowerCase() === (courseName || '').toLowerCase() ||
      c.name.toLowerCase().includes((courseName || '').toLowerCase()) ||
      (courseName || '').toLowerCase().includes(c.name.toLowerCase())
    );
    return match?.electiveSubjects || [];
  };

  const handleTeacherEnrollDeptChange = (dept: string) => {
    setEnrollDepartment(dept);
    setEnrollElectives([]);
    if (dept.toLowerCase().includes('senior') || dept.toLowerCase().includes('shs')) {
      const defaultCourse = effectiveTeacherShsCourses[0]?.name || 'Science (General)';
      setEnrollCourse(defaultCourse);
      setEnrollClassName(`${defaultCourse} ${enrollLevel}`);
    } else {
      const classesForDept = getTeacherClassesForDept(dept);
      if (classesForDept.length > 0) {
        setEnrollClassName(classesForDept[0]);
      }
    }
  };

  // IndexedDB Auto-save Student Creation Draft Integration
  const teacherDraftValues = useMemo<StudentFormDraftData>(() => ({
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

  const applyTeacherDraftToForm = (draft: StudentFormDraftData) => {
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

  const resetTeacherEnrollmentForm = () => {
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
    setEnrollCampus(teacher.campus || 'JIPAS 1');
    setEnrollParentName('');
    setEnrollParentPhone('');
    setEnrollPhoto('');
    setEnrollNotes('');
  };

  const {
    isDraftRestored: isTeacherDraftRestored,
    lastSavedAt: teacherLastSavedAt,
    isSaving: isTeacherSaving,
    discardDraft: discardTeacherDraft,
    onSuccessfulSubmission: onTeacherSuccessfulSubmission
  } = useStudentFormDraft({
    values: teacherDraftValues,
    setValues: applyTeacherDraftToForm
  });

  // Score change in the active subject sheet
  const handleScoreChange = (studentId: string, field: 'classScore' | 'examScore', val: number) => {
    if (isSubmissionLocked) return;
    setSubjectScores(prev => {
      const current = prev[studentId] || { classScore: 0, examScore: 0 };
      const updated = { ...current };
      if (field === 'classScore') {
        updated.classScore = Math.min(40, Math.max(0, val));
      } else {
        updated.examScore = Math.min(60, Math.max(0, val));
      }
      return { ...prev, [studentId]: updated };
    });
  };

  // Detailed Continuous Assessment breakdown score change
  const handleDetailedScoreChange = (
    studentId: string, 
    field: 'classwork' | 'homework' | 'classTest', 
    val: number
  ) => {
    if (isSubmissionLocked) return;
    setDetailedSbaScores(prev => {
      const curr = prev[studentId] || { classwork: 8, homework: 8, classTest: 14 };
      const next = { ...curr };
      if (field === 'classwork') next.classwork = Math.min(10, Math.max(0, val));
      if (field === 'homework') next.homework = Math.min(10, Math.max(0, val));
      if (field === 'classTest') next.classTest = Math.min(20, Math.max(0, val));
      
      // Compute Continuous Assessment total out of 40 and sync to subjectScores
      const totalSba = next.classwork + next.homework + next.classTest;
      setSubjectScores(sp => ({
        ...sp,
        [studentId]: {
          classScore: totalSba,
          examScore: sp[studentId]?.examScore ?? 0
        }
      }));
      return { ...prev, [studentId]: next };
    });
  };

  // Teacher Student Enrollment Submission (Pending Admin Approval)
  const handleSubmitTeacherEnrollment = async (e: React.FormEvent) => {
    e.preventDefault();
    const studentCombinedName = [enrollLastName.trim().toUpperCase(), enrollOtherNames.trim().toUpperCase()].filter(Boolean).join(' ') || enrollFullName.trim().toUpperCase();
    if (!enrollLastName.trim() || !enrollOtherNames.trim() || !enrollParentPhone.trim()) {
      alert('Please provide the student Last Name, Other Names, and parent contact phone number.');
      return;
    }

    setIsSubmittingEnrollment(true);
    try {
      const isShs = enrollDepartment.toLowerCase().includes('senior') || enrollDepartment.toLowerCase().includes('shs');
      const resolvedClassName = isShs ? `${enrollCourse} ${enrollLevel}` : enrollClassName;
      const newStudent: Student = {
        id: `st-enroll-${Date.now()}`,
        admissionNo: 'PENDING-APPROVAL',
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
        academicYear: '2025-2026',
        term: 'Third Term',
        isCurrent: true,
        enrollmentDate: enrollAdmissionDate || new Date().toISOString().split('T')[0],
        photo: enrollPhoto || (enrollGender === 'Male' 
          ? 'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=150&auto=format&fit=crop&q=80'
          : 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=150&auto=format&fit=crop&q=80'),
        status: 'Pending',
        approvalStatus: 'Pending',
        isApproved: false,
        enrolledBy: `${teacher.name} (Teacher)`,
        submissionDate: new Date().toISOString().split('T')[0]
      };

      // Save student to Supabase database for cross-device synchronization
      await saveStudent(newStudent);

      if (onAddStudent) {
        onAddStudent(newStudent);
      }

      setEnrollmentToast(`Student application for "${newStudent.fullName}" submitted successfully! It is awaiting Admin/Headmaster approval.`);
      
      // Clear IndexedDB draft and reset form fields
      await onTeacherSuccessfulSubmission(resetTeacherEnrollmentForm);
      setEnrollmentActiveTab('submissions');
      setTimeout(() => setEnrollmentToast(null), 5000);
    } catch (err) {
      console.error('Failed to submit student enrollment:', err);
      alert('Failed to submit enrollment. Please check connection and try again.');
    } finally {
      setIsSubmittingEnrollment(false);
    }
  };

  // Dispatch automated classwork and missing grade reminders
  const handleSendMissingGradeReminders = async () => {
    const missingStudents = classStudents.filter(st => {
      const score = subjectScores[st.id];
      return !score || score.classScore === 0 || score.examScore === 0;
    });

    if (missingStudents.length === 0) {
      alert(`No missing entries found! All ${classStudents.length} students have complete scores entered for ${selectedSubject}.`);
      return;
    }

    setIsSendingReminders(true);
    try {
      const now = new Date();
      const nowFormatted = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      for (let i = 0; i < missingStudents.length; i++) {
        const st = missingStudents[i];
        const notifId = `incomplete-reminder-${st.id}-${Date.now()}-${i}`;
        const parentName = st.parentName || 'Parent / Guardian';
        
        await saveNotification({
          id: notifId,
          title: `⚠️ Outstanding Classwork/Grade Alert: ${selectedSubject}`,
          message: `Dear ${parentName}, this is an automated academic reminder from ${teacher.name}. ${st.fullName} currently has outstanding/missing continuous assessment (SBA) score entries or incomplete classwork for ${selectedSubject} in ${st.className}. Please check and submit any pending tasks.`,
          recipientGroup: st.fullName,
          targetAudience: 'Parents & Students',
          targetClass: st.className,
          dateSent: nowFormatted,
          read: false,
          type: 'academic_alert',
          priority: 'High'
        });
      }
      showToast(`Successfully dispatched automated reminders and email alerts to ${missingStudents.length} students/parents!`);
    } catch (err) {
      console.error('Failed to dispatch missing grade reminders:', err);
      alert('Failed to send automated reminders. Please try again.');
    } finally {
      setIsSendingReminders(false);
    }
  };

  // Toast notification helper
  const showToast = (msg: string) => {
    setSaveSuccessToast(msg);
    setTimeout(() => setSaveSuccessToast(null), 3500);
  };

  // Save all results & sync to Supabase database
  const handleSaveAllResults = async () => {
    if (isSubmissionLocked) {
      alert(`Editing is locked. This class report batch has already been ${currentBroadcast?.status.toLowerCase()} to the Administration.`);
      return;
    }
    const updatedReportsList: TermReport[] = [];

    classStudents.forEach(st => {
      const scoreData = subjectScores[st.id] || { classScore: 0, examScore: 0 };
      const total = scoreData.classScore + scoreData.examScore;
      const { grade, remark } = calculateGrade(total);

      let rep = findCurrentReport(st.id, st.admissionNo);
      if (!rep) {
        // If no report exists, create a new one instead of skipping
        rep = {
          id: `rep-${st.id}-${academicTerm.replace(/\s+/g, '-').toLowerCase()}-${academicYear}`,
          studentId: st.id,
          studentName: st.fullName,
          admissionNo: st.admissionNo,
          className: st.className,
          academicYear,
          term: academicTerm,
          scores: [],
          totalScore: 0,
          averageScore: 0,
          position: 'N/A',
          isPublished: false,
          conduct: 'Good',
          attitude: 'Eager',
          interest: 'Reading',
          teacherComment: 'Satisfactory',
          headmasterComment: 'Good effort.',
          attendancePresent: 0,
          attendanceTotal: 65
        };
      }

      const existingScores = [...rep.scores];
      const existingIdx = existingScores.findIndex(s => s.subject.toLowerCase() === selectedSubject.toLowerCase());
      
      const detail = detailedSbaScores[st.id] || { classwork: 0, homework: 0, classTest: 0 };
      
      const updatedScoreObj: ScoreItem = {
        subject: selectedSubject,
        classWork: detail.classwork,
        homework: detail.homework,
        projectTest: detail.classTest,
        classScore: scoreData.classScore,
        examScore: scoreData.examScore,
        total,
        grade,
        remark
      };

      if (existingIdx >= 0) {
        existingScores[existingIdx] = updatedScoreObj;
      } else {
        existingScores.push(updatedScoreObj);
      }

      const totalSum = existingScores.reduce((acc, s) => acc + s.total, 0);
      const avg = existingScores.length > 0 ? parseFloat(((totalSum / existingScores.length) || 0).toFixed(1)) : total;

      const fullUpdatedReport: TermReport = {
        ...rep,
        scores: existingScores,
        totalScore: totalSum,
        averageScore: avg
      };

      updatedReportsList.push(fullUpdatedReport);
      if (onUpdateReport) {
        onUpdateReport(fullUpdatedReport);
      }
    });

    // Save batch reports to Supabase for persistent cross-device storage
    try {
      await saveAllReports(updatedReportsList);
    } catch (err) {
      console.error('Failed to sync scores to database:', err);
    }

    showToast(`Successfully saved results for ${classStudents.length} students in ${selectedClass} - ${selectedSubject} (synced to cloud database)!`);
  };

  // Handle Password Update
  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      setPasswordError('Please enter your current password.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    setPasswordError('');
    setPasswordToast(true);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setTimeout(() => setPasswordToast(false), 4000);
  };

  const handleQuickAction = (actionKey: string) => {
    switch (actionKey) {
      case 'teacher_score_entry':
        setActiveView('enter_results');
        break;
      case 'mark_attendance':
        setActiveView('attendance_comment');
        setAttendanceSubTab('register');
        break;
      case 'terminal_remarks':
        setActiveView('attendance_comment');
        setAttendanceSubTab('remarks');
        break;
      case 'view_roster':
        setActiveView('dashboard');
        break;
      case 'change_password':
        setActiveView('change_password');
        break;
      case 'backup_recovery':
        setActiveView('backup_recovery');
        break;
      default:
        break;
    }
    setIsSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle Attendance Toggle
  const handleToggleAttendance = (studentId: string, status: 'Present' | 'Late' | 'Absent' | 'Excused') => {
    setAttendanceRegister(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  // Mark all present
  const handleMarkAllPresent = () => {
    const next: Record<string, 'Present'> = {};
    classStudents.forEach(st => {
      next[st.id] = 'Present';
    });
    setAttendanceRegister(next);
    showToast(`Marked all ${classStudents.length} students as Present for ${attendanceDate}`);
  };

  // Save Attendance Register
  const handleSaveAttendance = async () => {
    try {
      const recordId = `att-${selectedClass.replace(/\s+/g, '-').toLowerCase()}-${attendanceDate}`;
      const record: StudentAttendanceRecord = {
        id: recordId,
        date: attendanceDate,
        className: selectedClass,
        records: attendanceRegister,
        updatedAt: new Date().toISOString(),
        updatedBy: teacher?.name || 'Teacher'
      };
      await saveStudentAttendanceRecord(record);
      showToast(`Attendance register for ${selectedClass} on ${attendanceDate} saved successfully.`);
    } catch (err) {
      console.error('Failed to save student attendance:', err);
      showToast('Error saving attendance register. Please try again.');
    }
  };

  // Smart Auto-Fill Terminal Remarks by Academic Performance
  const handleSmartAutoFillRemarks = () => {
    setTerminalRemarks(prev => {
      const updated = { ...prev };
      classStudents.forEach(st => {
        const rep = findCurrentReport(st.id, st.admissionNo);
        const scores = subjectScores[st.id] || { classScore: 0, examScore: 0 };
        
        let totalAvg = scores.classScore + scores.examScore;
        if (rep?.scores && rep.scores.length > 0) {
          const sum = rep.scores.reduce((acc, curr) => acc + curr.total, 0);
          totalAvg = Math.round(sum / rep.scores.length);
        }

        if (totalAvg >= 80) {
          updated[st.id] = {
            ...updated[st.id],
            conduct: 'Excellent, respectful & highly disciplined',
            attitude: 'Very attentive, diligent & hardworking',
            interest: updated[st.id]?.interest || 'Mathematics, Puzzles & Science Club',
            teacherComment: 'An outstanding academic performance! Keep maintaining this brilliant standard.',
            promotionDecision: 'Promoted'
          };
        } else if (totalAvg >= 70) {
          updated[st.id] = {
            ...updated[st.id],
            conduct: 'Well-behaved, obedient & courteous',
            attitude: 'Attentive, motivated & consistently focused',
            interest: updated[st.id]?.interest || 'Reading, Creative Arts & ICT',
            teacherComment: 'Very good performance. Maintain this high level of dedication and enthusiasm.',
            promotionDecision: 'Promoted'
          };
        } else if (totalAvg >= 55) {
          updated[st.id] = {
            ...updated[st.id],
            conduct: 'Polite, cooperative & responsible',
            attitude: 'Calm, steady & methodical worker',
            interest: updated[st.id]?.interest || 'Sports, Athletics & Football',
            teacherComment: 'Good work done this term. Keep pushing for greater excellence.',
            promotionDecision: 'Promoted'
          };
        } else if (totalAvg >= 45) {
          updated[st.id] = {
            ...updated[st.id],
            conduct: 'Satisfactory, but can occasionally be playful',
            attitude: 'Satisfactory effort, but capable of higher achievement',
            interest: updated[st.id]?.interest || 'Cultural Dance & Performing Arts',
            teacherComment: 'Satisfactory performance, but capable of doing much better with more focus.',
            promotionDecision: 'Promoted on Trial'
          };
        } else {
          updated[st.id] = {
            ...updated[st.id],
            conduct: 'Restless & easily distracted; needs monitoring',
            attitude: 'Needs to sit up and show more seriousness towards studies',
            interest: updated[st.id]?.interest || 'Drawing, Painting & Handcrafts',
            teacherComment: 'Below average performance. Requires serious academic intervention and remedial support.',
            promotionDecision: 'Repeated'
          };
        }
      });
      return updated;
    });
    showToast(`✨ Smart Auto-Selected behavioral assessments and remarks for all ${classStudents.length} students based on academic standing.`);
  };

  // Bulk Apply Field to all students in class
  const handleBulkApplyConduct = (conductVal: string) => {
    if (!conductVal) return;
    setTerminalRemarks(prev => {
      const updated = { ...prev };
      classStudents.forEach(st => {
        updated[st.id] = {
          ...updated[st.id],
          conduct: conductVal
        };
      });
      return updated;
    });
    showToast(`Applied conduct "${conductVal}" to all ${classStudents.length} students.`);
  };

  const handleBulkApplyAttitude = (attitudeVal: string) => {
    if (!attitudeVal) return;
    setTerminalRemarks(prev => {
      const updated = { ...prev };
      classStudents.forEach(st => {
        updated[st.id] = {
          ...updated[st.id],
          attitude: attitudeVal
        };
      });
      return updated;
    });
    showToast(`Applied attitude "${attitudeVal}" to all ${classStudents.length} students.`);
  };

  const handleBulkApplyInterest = (interestVal: string) => {
    if (!interestVal) return;
    setTerminalRemarks(prev => {
      const updated = { ...prev };
      classStudents.forEach(st => {
        updated[st.id] = {
          ...updated[st.id],
          interest: interestVal
        };
      });
      return updated;
    });
    showToast(`Applied co-curricular interest to all ${classStudents.length} students.`);
  };

  // Save Terminal Remarks
  const handleSaveTerminalRemarks = async () => {
    if (isSubmissionLocked) {
      alert(`Editing is locked. This class report batch has already been ${currentBroadcast?.status.toLowerCase()} to the Administration.`);
      return;
    }
    const updatedReportsList: TermReport[] = [];
    classStudents.forEach(st => {
      const remarkData = terminalRemarks[st.id];
      const rep = findCurrentReport(st.id, st.admissionNo);
      if (rep && remarkData) {
        const updated: TermReport = {
          ...rep,
          conduct: remarkData.conduct,
          attitude: remarkData.attitude,
          interest: remarkData.interest,
          teacherComment: remarkData.teacherComment,
          attendancePresent: remarkData.attendancePresent,
          promotionStatus: remarkData.promotionDecision
        };
        updatedReportsList.push(updated);
        if (onUpdateReport) {
          onUpdateReport(updated);
        }
      }
    });
    try {
      await saveAllReports(updatedReportsList);
    } catch (err) {
      console.error('Failed to sync bulk remarks to database:', err);
    }
    showToast(`Terminal remarks, character assessments & promotion decisions saved for all ${classStudents.length} students (synced to cloud database)!`);
  };

  // Calculate ranks for students in active subject
  const studentRankList = [...classStudents].map(st => {
    const scores = subjectScores[st.id] || { classScore: 0, examScore: 0 };
    return {
      studentId: st.id,
      total: scores.classScore + scores.examScore
    };
  }).sort((a, b) => b.total - a.total);

  const getStudentRankString = (studentId: string) => {
    const idx = studentRankList.findIndex(item => item.studentId === studentId);
    if (idx === -1) return '-';
    const rank = idx + 1;
    if (rank === 1) return '1st';
    if (rank === 2) return '2nd';
    if (rank === 3) return '3rd';
    return `${rank}th`;
  };

  // Calculate subject statistics
  const totalScoresList = classStudents.map(st => {
    const sc = subjectScores[st.id] || { classScore: 0, examScore: 0 };
    return sc.classScore + sc.examScore;
  });
  const avgClassScore = totalScoresList.length > 0 
    ? ((totalScoresList.reduce((a, b) => a + b, 0) / totalScoresList.length) || 0).toFixed(1) 
    : '0';
  const highestMark = totalScoresList.length > 0 ? Math.max(...totalScoresList) : 0;
  const passRate = totalScoresList.length > 0 
    ? Math.round((totalScoresList.filter(s => s >= 50).length / totalScoresList.length) * 100) 
    : 0;

  return (
    <div className="min-h-screen bg-[#f4f6f9] flex flex-col md:flex-row -mx-4 sm:-mx-6 lg:-mx-8 -my-8 font-sans relative">
      {/* Mobile Backdrop Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-40 md:hidden transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Collapsible Sidebar: Fixed drawer on mobile, sticky collapsible icon rail on desktop */}
      <aside 
        id="jipas-teacher-sidebar"
        className={`${
          isSidebarOpen 
            ? 'fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] md:static md:w-64' 
            : 'hidden md:flex md:w-20'
        } bg-[#202938] text-white flex-shrink-0 transition-all duration-300 flex flex-col justify-between shadow-xl z-30 md:sticky md:top-4 md:max-h-[calc(100vh-2rem)] md:rounded-2xl md:my-4 md:ml-4 overflow-hidden border border-slate-700/60`}
        aria-label="Teacher Portal Sidebar"
      >
        <div className="overflow-y-auto flex-1 custom-scrollbar">
          {/* Brand & Logo Header */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-slate-700/60 bg-[#1a222f]">
            <div className="flex items-center gap-3 overflow-hidden">
              <JIPASLogo size="sm" />
              {isSidebarOpen && (
                <span className="font-bold text-sm tracking-wide text-slate-100 truncate">
                  Teacher Portal
                </span>
              )}
            </div>
          </div>

          {/* Teacher Profile Identifier Banner */}
          <div className="p-4 border-b border-slate-700/50 flex items-center gap-3 bg-[#1e2736]">
            <div className="w-10 h-10 rounded-full bg-blue-600/90 text-white flex items-center justify-center font-bold shrink-0 shadow-sm border border-blue-400/30">
              <User className="w-5 h-5" />
            </div>
            {isSidebarOpen ? (
              <div className="overflow-hidden">
                <div className="font-bold text-sm text-[#22c55e] truncate leading-tight">
                  {teacher.name}
                </div>
                <div className="text-xs text-[#60a5fa] font-semibold mt-0.5">
                  <select 
                    value={activeRole} 
                    onChange={(e) => setActiveRole(e.target.value as 'teacher' | 'headteacher' | 'hod')}
                    className="bg-transparent text-[#60a5fa] font-semibold cursor-pointer outline-none"
                  >
                    <option value="teacher">Teacher</option>
                    {teacher.headteacherPrivileges && <option value="headteacher">Headteacher</option>}
                    {teacher.hodPrivileges && <option value="hod">HOD</option>}
                  </select>
                </div>
              </div>
            ) : null}
          </div>

          {/* Navigation Menu */}
          <nav className="p-2.5 space-y-3 text-xs font-semibold">
            {/* 1. Dashboard Menu Item */}
            <button
              onClick={() => handleNavigate('dashboard')}
              title="Dashboard Overview"
              className={`w-full flex flex-col items-center justify-center p-3 rounded-2xl transition-all cursor-pointer text-center ${
                activeView === 'dashboard' 
                  ? 'bg-blue-600 text-white font-bold shadow-md border border-blue-400' 
                  : 'bg-[#1a222f] hover:bg-slate-700/60 border border-slate-700/60 text-slate-200 hover:text-white'
              }`}
            >
              <School className={`w-5 h-5 mb-1 ${activeView === 'dashboard' ? 'text-white' : 'text-blue-400'}`} />
              {isSidebarOpen ? (
                <span className="text-xs font-extrabold">Dashboard Overview</span>
              ) : (
                <span className="text-[9px] font-bold">Home</span>
              )}
            </button>

            {/* 2. EXAMINATION MANAGEMENT Category */}
            <div className="space-y-1.5">
              <div className="bg-[#007bff]/90 text-white px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider text-center shadow-xs">
                {isSidebarOpen ? 'EXAMINATION MANAGEMENT' : 'EXAMS'}
              </div>

              <div className={isSidebarOpen ? "grid grid-cols-2 gap-2 p-1.5 bg-[#17202d] rounded-2xl border border-slate-700/50" : "flex flex-col gap-1.5"}>
                {/* 2a. Enter Results Sub-menu */}
                <button
                  onClick={() => handleNavigate('enter_results')}
                  title="Enter Results & Terminal Scores"
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl transition-all cursor-pointer text-center min-h-[66px] ${
                    activeView === 'enter_results' 
                      ? 'bg-blue-600 text-white font-bold shadow-md border border-blue-400' 
                      : 'bg-[#1e2837] hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700/60'
                  }`}
                >
                  <FileText className={`w-5 h-5 mb-1 ${activeView === 'enter_results' ? 'text-white' : 'text-cyan-400'}`} />
                  <span className="text-[10px] font-extrabold text-center leading-tight">
                    {isSidebarOpen ? 'Enter Results' : 'Results'}
                  </span>
                </button>

                {/* 2b. Attendance & Comment Sub-menu */}
                <button
                  onClick={() => handleNavigate('attendance_comment')}
                  title="Attendance Log & Student Character Remarks"
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl transition-all cursor-pointer text-center min-h-[66px] ${
                    activeView === 'attendance_comment' 
                      ? 'bg-blue-600 text-white font-bold shadow-md border border-blue-400' 
                      : 'bg-[#1e2837] hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700/60'
                  }`}
                >
                  <Edit3 className={`w-5 h-5 mb-1 ${activeView === 'attendance_comment' ? 'text-white' : 'text-emerald-400'}`} />
                  <span className="text-[10px] font-extrabold text-center leading-tight">
                    {isSidebarOpen ? 'Attendance Log' : 'Register'}
                  </span>
                </button>

                {/* 2c. Report Card Review Sub-menu */}
                <button
                  onClick={() => handleNavigate('review_reports')}
                  title="Report Card Broadsheets & Terminal Printing"
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl transition-all cursor-pointer text-center min-h-[66px] ${
                    activeView === 'review_reports' 
                      ? 'bg-blue-600 text-white font-bold shadow-md border border-blue-400' 
                      : 'bg-[#1e2837] hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700/60'
                  }`}
                >
                  <Award className={`w-5 h-5 mb-1 ${activeView === 'review_reports' ? 'text-white' : 'text-amber-400'}`} />
                  <span className="text-[10px] font-extrabold text-center leading-tight">
                    {isSidebarOpen ? 'Report Cards' : 'Reports'}
                  </span>
                </button>

                {/* 2d. Performance Analytics Sub-menu */}
                <button
                  onClick={() => handleNavigate('performance_overview')}
                  title="Academic Performance Analytics & Data Visualization"
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl transition-all cursor-pointer text-center min-h-[66px] ${
                    activeView === 'performance_overview' 
                      ? 'bg-blue-600 text-white font-bold shadow-md border border-blue-400' 
                      : 'bg-[#1e2837] hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700/60'
                  }`}
                >
                  <BarChart3 className={`w-5 h-5 mb-1 ${activeView === 'performance_overview' ? 'text-white' : 'text-rose-400'}`} />
                  <span className="text-[10px] font-extrabold text-center leading-tight">
                    {isSidebarOpen ? 'Performance Analytics' : 'Analytics'}
                  </span>
                </button>
              </div>
            </div>

            {/* 3. STUDENT SERVICES Category */}
            <div className="space-y-1.5">
              <div className="bg-[#10b981]/90 text-white px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider text-center shadow-xs">
                {isSidebarOpen ? 'SERVICES & PROFILE' : 'STUDENTS'}
              </div>

              <div className={isSidebarOpen ? "grid grid-cols-2 gap-2 p-1.5 bg-[#17202d] rounded-2xl border border-slate-700/50" : "flex flex-col gap-1.5"}>
                {/* 4. My Profile */}
                <button
                  onClick={() => handleNavigate('profile')}
                  title="My Teacher Profile"
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl transition-all cursor-pointer text-center min-h-[66px] ${
                    activeView === 'profile' 
                      ? 'bg-blue-600 text-white font-bold shadow-md border border-blue-400' 
                      : 'bg-[#1e2837] hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700/60'
                  }`}
                >
                  <User className={`w-5 h-5 mb-1 ${activeView === 'profile' ? 'text-white' : 'text-blue-400'}`} />
                  <span className="text-[10px] font-extrabold text-center leading-tight">
                    {isSidebarOpen ? 'My Profile' : 'Profile'}
                  </span>
                </button>

                {/* 5. Change Password */}
                <button
                  onClick={() => handleNavigate('change_password')}
                  title="Change Password & Security Passcode"
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl transition-all cursor-pointer text-center min-h-[66px] ${
                    activeView === 'change_password' 
                      ? 'bg-amber-600 text-white font-bold shadow-md border border-amber-400' 
                      : 'bg-[#1e2837] hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700/60'
                  }`}
                >
                  <KeyRound className={`w-5 h-5 mb-1 ${activeView === 'change_password' ? 'text-white' : 'text-amber-400'}`} />
                  <span className="text-[10px] font-extrabold text-center leading-tight">
                    {isSidebarOpen ? 'Security Passcode' : 'Security'}
                  </span>
                </button>

                {/* 6. Backup & Recovery */}
                <button
                  onClick={() => handleNavigate('backup_recovery')}
                  title="Data Backup & CSV Records"
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl transition-all cursor-pointer text-center min-h-[66px] ${
                    activeView === 'backup_recovery' 
                      ? 'bg-cyan-600 text-white font-bold shadow-md border border-cyan-400' 
                      : 'bg-[#1e2837] hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700/60'
                  }`}
                >
                  <HardDrive className={`w-5 h-5 mb-1 ${activeView === 'backup_recovery' ? 'text-white' : 'text-cyan-400'}`} />
                  <span className="text-[10px] font-extrabold text-center leading-tight">
                    {isSidebarOpen ? 'Backup & CSV' : 'Backup'}
                  </span>
                </button>
              </div>
            </div>

            {/* 4. STAFF QR ATTENDANCE Category */}
            <div className="space-y-1.5">
              <div className="bg-[#4f46e5]/90 text-white px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider text-center shadow-xs">
                {isSidebarOpen ? 'STAFF ATTENDANCE' : 'ATTEND'}
              </div>

              <div className={isSidebarOpen ? "grid grid-cols-2 gap-2 p-1.5 bg-[#17202d] rounded-2xl border border-slate-700/50" : "flex flex-col gap-1.5"}>
                {/* Scan Entrance QR button */}
                <button
                  onClick={() => handleNavigate('scan_entrance_qr')}
                  title="Scan School Entrance QR Code"
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl transition-all cursor-pointer text-center min-h-[66px] ${
                    activeView === 'scan_entrance_qr' 
                      ? 'bg-indigo-600 text-white font-bold shadow-md border border-indigo-400' 
                      : 'bg-[#1e2837] hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700/60'
                  }`}
                >
                  <QrCode className={`w-5 h-5 mb-1 ${activeView === 'scan_entrance_qr' ? 'text-white' : 'text-indigo-400'}`} />
                  <span className="text-[10px] font-extrabold text-center leading-tight">
                    {isSidebarOpen ? 'Scan Entrance' : 'Scan QR'}
                  </span>
                </button>

                {/* My Attendance logs button */}
                <button
                  onClick={() => handleNavigate('my_attendance')}
                  title="My Personal Attendance Log Roster"
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl transition-all cursor-pointer text-center min-h-[66px] ${
                    activeView === 'my_attendance' 
                      ? 'bg-indigo-600 text-white font-bold shadow-md border border-indigo-400' 
                      : 'bg-[#1e2837] hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700/60'
                  }`}
                >
                  <Clock className={`w-5 h-5 mb-1 ${activeView === 'my_attendance' ? 'text-white' : 'text-emerald-400'}`} />
                  <span className="text-[10px] font-extrabold text-center leading-tight">
                    {isSidebarOpen ? 'My Attendance' : 'My Logs'}
                  </span>
                </button>
              </div>
            </div>
          </nav>
        </div>

        {/* Red Logout Button at Bottom of Sidebar */}
        <div className="p-3 border-t border-slate-700/60 shrink-0">
          <button
            onClick={onLogout}
            title="Log Out of Teacher Portal"
            className={`w-full bg-[#dc3545] hover:bg-red-700 text-white font-bold text-xs py-2.5 ${
              isSidebarOpen ? 'px-3' : 'px-1.5'
            } rounded-lg flex items-center justify-center gap-2 transition-colors shadow-sm cursor-pointer`}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {isSidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* 2. MAIN CONTENT WRAPPER */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#f4f6f9]">
        {/* Top Header Bar */}
        <div className="bg-white border-b border-slate-200 h-14 px-4 sm:px-6 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-3">
            <SidebarToggleButton
              isOpen={isSidebarOpen}
              onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
              label={isSidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
            />
          </div>

          <div className="flex items-center gap-2">
            <GlobalSearchHeader
              students={students}
              teachers={teachers}
              bills={bills}
              payments={payments}
              userRole="teacher"
              onNavigate={(modId, tabId) => {
                if (modId) {
                  setActiveView(modId as TeacherViewType);
                }
              }}
              placeholder="Search students, classes, records..."
            />

            <SyncNowButton variant="compact" />

            <button
              onClick={onLogout}
              className="bg-[#dc3545] hover:bg-red-700 text-white text-xs font-bold px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" /> Logout
            </button>
          </div>
        </div>

        {/* Sub-Header & Breadcrumb Bar */}
        <div className="px-4 sm:px-6 pt-5 pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {activeView === 'dashboard' && 'Teacher Dashboard'}
            {activeView === 'enter_results' && 'Enter Results'}
            {activeView === 'attendance_comment' && 'Attendance & Comment'}
            {activeView === 'profile' && 'My Profile'}
            {activeView === 'change_password' && 'Change Password'}
            {activeView === 'performance_overview' && 'Performance Analytics'}
            {activeView === 'backup_recovery' && 'Backup & Recovery Vault'}
            {activeView === 'scan_entrance_qr' && 'Scan School Entrance QR'}
            {activeView === 'my_attendance' && 'My Personal Attendance Logs'}
          </h1>
          <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
            <button 
              onClick={() => setActiveView('dashboard')} 
              className="text-[#007bff] hover:underline cursor-pointer"
            >
              {activeView === 'dashboard' ? 'Home' : 'Dashboard'}
            </button>
            <span>/</span>
            <span className="text-slate-700 font-semibold capitalize">
              {activeView.replace('_', ' ')}
            </span>
          </div>
        </div>

        {/* Main Content Body */}
        <div className="p-4 sm:px-6 space-y-4">
          {/* Toast Banner */}
          {saveSuccessToast && (
            <div className="p-3.5 bg-emerald-600 text-white rounded-lg text-xs font-bold flex items-center justify-between shadow-sm animate-fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>{saveSuccessToast}</span>
              </div>
              <button 
                onClick={() => setSaveSuccessToast(null)} 
                className="text-white hover:text-emerald-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Global Student Search and Filters Bar */}
          {['dashboard', 'enter_results', 'attendance_comment', 'review_reports'].includes(activeView) && (
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-4">
              <div className="flex-1 flex flex-col sm:flex-row gap-3">
                {/* Name / ID Search */}
                <div className="relative flex-1">
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Student Search</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search by name or admission ID..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                    />
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
                    {searchQuery && (
                      <button 
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2.5 top-2.5 text-xs text-slate-400 hover:text-slate-600 font-bold"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>

                {/* House Filter */}
                <div className="w-full sm:w-48">
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Filter by House</label>
                  <select
                    value={selectedHouseFilter}
                    onChange={(e) => setSelectedHouseFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer transition-colors font-semibold text-slate-700"
                  >
                    <option value="All Houses">🏡 All Houses</option>
                    <option value="Red">🔴 Red House</option>
                    <option value="Blue">🔵 Blue House</option>
                    <option value="Green">🟢 Green House</option>
                    <option value="Yellow">🟡 Yellow House</option>
                    <option value="Gold">👑 Gold House</option>
                  </select>
                </div>

                {/* Status Filter */}
                <div className="w-full sm:w-48">
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Academic Status</label>
                  <select
                    value={selectedStatusFilter}
                    onChange={(e) => setSelectedStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer transition-colors font-semibold text-slate-700"
                  >
                    <option value="All Statuses">⚡ All Statuses</option>
                    <option value="Active">🟢 Active</option>
                    <option value="Inactive">🔴 Inactive</option>
                    <option value="Pending">🟡 Pending</option>
                  </select>
                </div>
              </div>

              {/* Status summary bubble */}
              <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 border-slate-100 pt-3 sm:pt-0 sm:pl-4">
                <span className="text-[10px] font-bold uppercase text-slate-400">Filtered Match</span>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-black bg-blue-50 text-blue-700 border border-blue-100">
                  {classStudents.length} Students
                </span>
              </div>
            </div>
          )}

          {/* Teal Academic Period Banner */}
          {showAcademicBanner && (
            <div className="bg-[#17a2b8] text-white px-4 py-3 rounded-lg flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-2 text-xs sm:text-sm font-bold">
                <Clock className="w-4 h-4 shrink-0" />
                <span>Current Academic Period</span>
                <span className="font-normal opacity-90 block sm:inline ml-0 sm:ml-2">
                  {academicYear} - {academicTerm}
                </span>
              </div>
              <button 
                onClick={() => setShowAcademicBanner(false)}
                className="text-white/80 hover:text-white p-1 rounded cursor-pointer"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* =================================================================== */}
          {/* TEACHER VIEWS WITH ENTRY ANIMATIONS */}
          {/* =================================================================== */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              {/* PERFORMANCE OVERVIEW ANALYTICS MODULE */}
              {activeView === 'performance_overview' && (
                <ClassPerformanceOverview 
                  teacher={teacher}
                  students={students}
                  reports={reports}
                  attendanceRecords={studentAttendanceRecords}
                />
              )}

              {/* VIEW 1: TEACHER DASHBOARD (SCREENSHOT 1) */}
              {activeView === 'dashboard' && (
            <div className="space-y-4">
              {/* Welcome Back Card */}
              <div className="relative overflow-hidden bg-white rounded-xl border border-slate-200 border-t-4 border-t-[#007bff] p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                {/* School Wallpaper Backdrop with Subtle Opacity */}
                <div 
                  className="absolute inset-0 bg-cover bg-center opacity-10 mix-blend-luminosity scale-105 pointer-events-none"
                  style={{ backgroundImage: `url('/wallpapers/classroom.jpg')` }}
                />
                <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-3.5">
                  <div className="p-1 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-center shrink-0">
                    <img
                      src={teacher.photo || "/avatar.png"}
                      onError={(e) => { (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/adventurer/svg?seed=${teacher.name}` }}
                      className="w-10 h-10 rounded-lg object-cover shadow-xs"
                      alt={teacher.name}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h2 className="text-lg font-bold text-slate-900">
                        Welcome back, <strong className="text-slate-900 font-extrabold">{teacher.name}!</strong>
                      </h2>
                      {/* Color-Coded Status Badge */}
                      {(() => {
                        let badgeBg = 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-200 dark:border-rose-800';
                        let badgeText = 'Pending';
                        let dotColor = 'bg-rose-500';
                        let animatePing = 'animate-pulse';

                        if (myTodayAttendanceRecord?.timeIn && myTodayAttendanceRecord?.timeOut) {
                          badgeBg = 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-800';
                          badgeText = 'Signed Out';
                          dotColor = 'bg-amber-500';
                          animatePing = '';
                        } else if (myTodayAttendanceRecord?.timeIn) {
                          badgeBg = 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-800';
                          badgeText = 'Signed In';
                          dotColor = 'bg-emerald-500';
                          animatePing = 'animate-ping';
                        }

                        return (
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${badgeBg}`}>
                            <span className="relative flex h-2 w-2">
                              {animatePing && (
                                <span className={`absolute inline-flex h-full w-full rounded-full ${dotColor} opacity-75 ${animatePing}`} />
                              )}
                              <span className={`relative inline-flex rounded-full h-2 w-2 ${dotColor}`} />
                            </span>
                            {badgeText}
                          </span>
                        );
                      })()}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      You are logged in as Teacher • {teacher.classesTaught?.length ? teacher.classesTaught.join(', ') : teacher.designation || 'JIPAS Faculty'}
                    </p>
                  </div>
                </div>

                <div className="relative z-10 flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => setActiveView('profile')}
                    className="flex-1 sm:flex-none px-3.5 py-1.5 bg-[#007bff] hover:bg-blue-700 text-white rounded-md text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                  >
                    <User className="w-3.5 h-3.5" /> My Profile
                  </button>
                  <button
                    onClick={() => setActiveView('change_password')}
                    className="flex-1 sm:flex-none px-3.5 py-1.5 bg-[#ffc107] hover:bg-amber-500 text-slate-900 rounded-md text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-slate-900" /> Change Password
                  </button>
                </div>
              </div>



              {/* 3 Metric Stat Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. Departments */}
                <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-2xs flex items-center">
                  <div className="w-20 h-20 bg-[#007bff] flex items-center justify-center text-white shrink-0">
                    <Building className="w-8 h-8" />
                  </div>
                  <div className="px-4 py-2 flex-1">
                    <div className="text-xs text-slate-600 font-medium">Departments</div>
                    <div className="text-2xl font-black text-slate-900">1</div>
                  </div>
                </div>

                {/* 2. Classes Taught */}
                <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-2xs flex items-center">
                  <div className="w-20 h-20 bg-[#28a745] flex items-center justify-center text-white shrink-0">
                    <School className="w-8 h-8" />
                  </div>
                  <div className="px-4 py-2 flex-1">
                    <div className="text-xs text-slate-600 font-medium">Classes Taught</div>
                    <div className="text-2xl font-black text-slate-900">
                      {teacher?.classesTaught?.length || defaultClasses.length || 1}
                    </div>
                  </div>
                </div>

                {/* 3. Subjects Taught */}
                <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-2xs flex items-center">
                  <div className="w-20 h-20 bg-[#ffc107] flex items-center justify-center text-slate-900 shrink-0">
                    <BookOpen className="w-8 h-8" />
                  </div>
                  <div className="px-4 py-2 flex-1">
                    <div className="text-xs text-slate-600 font-medium">Subjects Taught</div>
                    <div className="text-2xl font-black text-slate-900">
                      {defaultSubjects.length}
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Teacher Navigation Menu Thumbnail Grid */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                      Teacher Main Navigation & Command Menus
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">Click any thumbnail menu item below to open your teaching tools</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 pt-1">
                  {/* Menu 1: Enter Exam Scores */}
                  <button
                    onClick={() => setActiveView('enter_results')}
                    className="group p-4 bg-gradient-to-br from-blue-50/80 to-slate-50 hover:from-[#007bff] hover:to-blue-700 border border-blue-100 hover:border-blue-600 rounded-2xl text-left transition-all duration-200 shadow-2xs hover:shadow-lg hover:-translate-y-1 cursor-pointer flex flex-col justify-between space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 bg-[#007bff] group-hover:bg-white text-white group-hover:text-[#007bff] rounded-xl flex items-center justify-center transition-colors shadow-xs">
                        <Edit3 className="w-5 h-5" />
                      </div>
                      <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-blue-100 group-hover:bg-blue-500 text-blue-800 group-hover:text-white uppercase tracking-wider transition-colors">
                        Grading
                      </span>
                    </div>
                    <div>
                      <h4 className="font-extrabold text-xs text-slate-900 group-hover:text-white transition-colors flex items-center gap-1">
                        Exam Scores
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                      </h4>
                      <p className="text-[11px] text-slate-500 group-hover:text-blue-100 transition-colors mt-0.5 line-clamp-2">
                        Input SBA classwork, homework & terminal exam marks
                      </p>
                    </div>
                  </button>

                  {/* Menu 2: Attendance & Conduct */}
                  <button
                    onClick={() => setActiveView('attendance_comment')}
                    className="group p-4 bg-gradient-to-br from-emerald-50/80 to-slate-50 hover:from-emerald-600 hover:to-emerald-700 border border-emerald-100 hover:border-emerald-600 rounded-2xl text-left transition-all duration-200 shadow-2xs hover:shadow-lg hover:-translate-y-1 cursor-pointer flex flex-col justify-between space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 bg-emerald-600 group-hover:bg-white text-white group-hover:text-emerald-600 rounded-xl flex items-center justify-center transition-colors shadow-xs">
                        <CheckSquare className="w-5 h-5" />
                      </div>
                      <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-100 group-hover:bg-emerald-500 text-emerald-800 group-hover:text-white uppercase tracking-wider transition-colors">
                        Register
                      </span>
                    </div>
                    <div>
                      <h4 className="font-extrabold text-xs text-slate-900 group-hover:text-white transition-colors flex items-center gap-1">
                        Attendance
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                      </h4>
                      <p className="text-[11px] text-slate-500 group-hover:text-emerald-100 transition-colors mt-0.5 line-clamp-2">
                        Record attendance log, deportment & teacher remarks
                      </p>
                    </div>
                  </button>

                  {/* Menu 3: Review Broadsheets */}
                  <button
                    onClick={() => setActiveView('review_reports')}
                    className="group p-4 bg-gradient-to-br from-purple-50/80 to-slate-50 hover:from-purple-600 hover:to-purple-700 border border-purple-100 hover:border-purple-600 rounded-2xl text-left transition-all duration-200 shadow-2xs hover:shadow-lg hover:-translate-y-1 cursor-pointer flex flex-col justify-between space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 bg-purple-600 group-hover:bg-white text-white group-hover:text-purple-600 rounded-xl flex items-center justify-center transition-colors shadow-xs">
                        <FileText className="w-5 h-5" />
                      </div>
                      <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-purple-100 group-hover:bg-purple-500 text-purple-800 group-hover:text-white uppercase tracking-wider transition-colors">
                        Reports
                      </span>
                    </div>
                    <div>
                      <h4 className="font-extrabold text-xs text-slate-900 group-hover:text-white transition-colors flex items-center gap-1">
                        Broadsheets
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                      </h4>
                      <p className="text-[11px] text-slate-500 group-hover:text-purple-100 transition-colors mt-0.5 line-clamp-2">
                        Review class broadsheets & submit terminal reports
                      </p>
                    </div>
                  </button>

                  {/* Menu 5: Profile & Staff ID */}
                  <button
                    onClick={() => setActiveView('profile')}
                    className="group p-4 bg-gradient-to-br from-cyan-50/80 to-slate-50 hover:from-cyan-600 hover:to-cyan-700 border border-cyan-100 hover:border-cyan-600 rounded-2xl text-left transition-all duration-200 shadow-2xs hover:shadow-lg hover:-translate-y-1 cursor-pointer flex flex-col justify-between space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 bg-cyan-600 group-hover:bg-white text-white group-hover:text-cyan-600 rounded-xl flex items-center justify-center transition-colors shadow-xs">
                        <Shield className="w-5 h-5" />
                      </div>
                      <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-cyan-100 group-hover:bg-cyan-500 text-cyan-800 group-hover:text-white uppercase tracking-wider transition-colors">
                        Staff ID
                      </span>
                    </div>
                    <div>
                      <h4 className="font-extrabold text-xs text-slate-900 group-hover:text-white transition-colors flex items-center gap-1">
                        My Profile
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                      </h4>
                      <p className="text-[11px] text-slate-500 group-hover:text-cyan-100 transition-colors mt-0.5 line-clamp-2">
                        View staff bio, class assignments & digital ID card
                      </p>
                    </div>
                  </button>

                  {/* Menu 7: Exam Timetable & Schedule */}
                  <button
                    onClick={() => setActiveView('exam_timetable')}
                    className="group p-4 bg-gradient-to-br from-emerald-50/80 to-slate-50 hover:from-emerald-600 hover:to-emerald-700 border border-emerald-100 hover:border-emerald-600 rounded-2xl text-left transition-all duration-200 shadow-2xs hover:shadow-lg hover:-translate-y-1 cursor-pointer flex flex-col justify-between space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 bg-emerald-600 group-hover:bg-white text-white group-hover:text-emerald-600 rounded-xl flex items-center justify-center transition-colors shadow-xs">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-100 group-hover:bg-emerald-500 text-emerald-800 group-hover:text-white uppercase tracking-wider transition-colors">
                        Exams
                      </span>
                    </div>
                    <div>
                      <h4 className="font-extrabold text-xs text-slate-900 group-hover:text-white transition-colors flex items-center gap-1">
                        Exam Timetable
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                      </h4>
                      <p className="text-[11px] text-slate-500 group-hover:text-emerald-100 transition-colors mt-0.5 line-clamp-2">
                        View examination schedules & broadcast notices
                      </p>
                    </div>
                  </button>

                  {/* Menu 8: Class Performance Overview */}
                  <button
                    onClick={() => setActiveView('performance_overview')}
                    className="group p-4 bg-gradient-to-br from-indigo-50/80 to-slate-50 hover:from-indigo-600 hover:to-indigo-700 border border-indigo-100 hover:border-indigo-600 rounded-2xl text-left transition-all duration-200 shadow-2xs hover:shadow-lg hover:-translate-y-1 cursor-pointer flex flex-col justify-between space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 bg-indigo-600 group-hover:bg-white text-white group-hover:text-indigo-600 rounded-xl flex items-center justify-center transition-colors shadow-xs">
                        <BarChart3 className="w-5 h-5" />
                      </div>
                      <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-indigo-100 group-hover:bg-indigo-500 text-indigo-800 group-hover:text-white uppercase tracking-wider transition-colors">
                        Analytics
                      </span>
                    </div>
                    <div>
                      <h4 className="font-extrabold text-xs text-slate-900 group-hover:text-white transition-colors flex items-center gap-1">
                        Class Performance
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                      </h4>
                      <p className="text-[11px] text-slate-500 group-hover:text-indigo-100 transition-colors mt-0.5 line-clamp-2">
                        Visualize grade distributions & attendance trends
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* My Current Assignments (2025-2026 - Third Term) Panel */}
              <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-2xs">
                {/* Blue Header with collapse toggle */}
                <div className="bg-[#007bff] text-white px-4 py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs sm:text-sm font-bold">
                    <FileText className="w-4 h-4" />
                    <span>My Current Assignments ({academicYear} - {academicTerm})</span>
                  </div>
                  <button
                    onClick={() => setIsAssignmentsCollapsed(!isAssignmentsCollapsed)}
                    className="text-white hover:bg-blue-700/50 p-1 rounded cursor-pointer transition-colors"
                  >
                    {isAssignmentsCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                  </button>
                </div>

                {/* Table Content */}
                {!isAssignmentsCollapsed && (
                  <>
                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-800 font-bold">
                            <th className="py-2.5 px-4">Department</th>
                            <th className="py-2.5 px-4">Academic Year</th>
                            <th className="py-2.5 px-4">Term</th>
                            <th className="py-2.5 px-4">Classes</th>
                            <th className="py-2.5 px-4">Subjects</th>
                            <th className="py-2.5 px-4 text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                          <tr className="hover:bg-slate-50/70">
                            <td className="py-3 px-4 font-bold text-slate-900">Primary School</td>
                            <td className="py-3 px-4 font-mono">{academicYear}</td>
                            <td className="py-3 px-4">{academicTerm}</td>
                            <td className="py-3 px-4 font-bold text-emerald-700">{selectedClass}</td>
                            <td className="py-3 px-4">
                              <span className="font-semibold text-slate-900">
                                {defaultSubjects.length} Subjects:
                              </span>{' '}
                              <span className="text-slate-500 text-[11px]">
                                {defaultSubjects.slice(0, 4).join(', ')}...
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => setActiveView('enter_results')}
                                  className="px-2.5 py-1 bg-[#007bff] hover:bg-blue-700 text-white rounded text-[11px] font-bold shadow-2xs cursor-pointer"
                                >
                                  Enter Results
                                </button>
                                <button
                                  onClick={() => setActiveView('attendance_comment')}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold shadow-2xs cursor-pointer"
                                >
                                  Attendance
                                </button>
                              </div>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Cards View */}
                    <div className="md:hidden p-3 space-y-3">
                      <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 text-xs">
                        <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                          <span className="font-extrabold text-slate-900 text-sm">Primary School</span>
                          <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            {selectedClass}
                          </span>
                        </div>

                        <div className="flex justify-between text-slate-600">
                          <span>Year / Term:</span>
                          <span className="font-bold text-slate-800">{academicYear} ({academicTerm})</span>
                        </div>

                        <div className="text-slate-600">
                          <span className="font-bold text-slate-800">{defaultSubjects.length} Subjects:</span>
                          <p className="text-slate-500 text-[11px] mt-0.5">{defaultSubjects.join(', ')}</p>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                          <button
                            onClick={() => setActiveView('enter_results')}
                            className="px-3 py-1.5 bg-[#007bff] text-white rounded-lg text-xs font-bold shadow-2xs cursor-pointer"
                          >
                            Enter Results
                          </button>
                          <button
                            onClick={() => setActiveView('attendance_comment')}
                            className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold shadow-2xs cursor-pointer"
                          >
                            Attendance
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Class Performance Trend Widget */}
              <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-2xs">
                <div className="bg-slate-900 text-white px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-blue-400" />
                    <div>
                      <h3 className="text-sm font-black tracking-tight">{selectedClass} Subject Performance Trend</h3>
                      <p className="text-[10px] text-slate-400 font-medium">Average subject scores to analyze academic performance before submitting reports to administration.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-300">Active Filter:</span>
                    <select
                      value={selectedClass}
                      onChange={(e) => setSelectedClass(e.target.value)}
                      className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-[11px] font-bold text-white focus:outline-none cursor-pointer"
                    >
                      {defaultClasses.map(cls => (
                        <option key={cls} value={cls}>{cls}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="p-5">
                  <div className="h-64 sm:h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={subjectAveragesData}
                        margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis 
                          dataKey="subject" 
                          stroke="#64748b" 
                          fontSize={11} 
                          fontWeight={700}
                          tickLine={false}
                        />
                        <YAxis 
                          stroke="#64748b" 
                          fontSize={11} 
                          fontWeight={700}
                          domain={[0, 100]}
                          tickLine={false}
                        />
                        <Tooltip
                          contentStyle={{ 
                            backgroundColor: '#0f172a', 
                            border: 'none', 
                            borderRadius: '8px', 
                            color: '#fff',
                            fontSize: '11px',
                            fontWeight: 'bold'
                          }}
                          cursor={{ fill: '#f8fafc' }}
                        />
                        <Bar 
                          dataKey="average" 
                          fill="#3b82f6" 
                          radius={[4, 4, 0, 0]} 
                          maxBarSize={50}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* 3 Lower Info Cards / Lists */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. My Departments Card */}
                <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-2xs">
                  <div className="bg-[#17a2b8] text-white px-4 py-2.5 text-xs sm:text-sm font-bold flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4" />
                      <span>My Departments</span>
                    </div>
                    <span className="bg-white/20 text-white px-2 py-0.5 rounded text-xs font-mono">1</span>
                  </div>
                  <div className="p-3 space-y-1.5 text-xs font-semibold text-slate-800">
                    <div className="flex items-center gap-2.5 p-2 rounded bg-slate-50 border border-slate-100">
                      <Building className="w-4 h-4 text-[#17a2b8]" />
                      <span>Primary School</span>
                    </div>
                  </div>
                </div>

                {/* 2. My Classes Card */}
                <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-2xs">
                  <div className="bg-[#28a745] text-white px-4 py-2.5 text-xs sm:text-sm font-bold flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <School className="w-4 h-4" />
                      <span>My Classes</span>
                    </div>
                    <span className="bg-white/20 text-white px-2 py-0.5 rounded text-xs font-mono">
                      {teacher?.classesTaught?.length || defaultClasses.length || 1}
                    </span>
                  </div>
                  <div className="p-3 space-y-1.5 text-xs font-semibold text-slate-800">
                    {(teacher?.classesTaught && teacher.classesTaught.length > 0 ? teacher.classesTaught : defaultClasses).map(cls => (
                      <div key={cls} className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-100">
                        <div className="flex items-center gap-2.5">
                          <School className="w-4 h-4 text-[#28a745]" />
                          <span>{cls}</span>
                        </div>
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                          {students.filter(s => s.className === cls).length || 6} Students
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. My Subjects Card */}
                <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-2xs">
                  <div className="bg-[#ffc107] text-slate-900 px-4 py-2.5 text-xs sm:text-sm font-black flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4" />
                      <span>My Subjects</span>
                    </div>
                    <span className="bg-black/10 text-slate-900 px-2 py-0.5 rounded text-xs font-mono font-bold">
                      {defaultSubjects.length}
                    </span>
                  </div>
                  <div className="p-3 space-y-1.5 text-xs font-semibold text-slate-800 max-h-72 overflow-y-auto divide-y divide-slate-100">
                    {defaultSubjects.map((sb, i) => (
                      <div key={sb} className="flex items-center gap-2.5 py-1.5 first:pt-0">
                        <BookOpen className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span className="truncate">{sb}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* VIEW 2: ENTER RESULTS (SCREENSHOT 2) */}
          {/* =================================================================== */}
          {activeView === 'enter_results' && (
            <div className="space-y-4">
              {/* Select Class and Subject Card */}
              <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-2xs">
                <div className="bg-[#007bff] text-white px-4 py-2.5 text-xs sm:text-sm font-bold flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <span>Select Class and Subject</span>
                </div>

                <div className="p-4 bg-white">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 items-end">
                    {/* Academic Year */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Academic Year
                      </label>
                      <input
                        type="text"
                        value={academicYear}
                        disabled
                        className="w-full px-3 py-1.5 bg-slate-100 border border-slate-300 rounded-md text-xs font-bold text-slate-600 cursor-not-allowed"
                      />
                    </div>

                    {/* Term */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Term
                      </label>
                      <input
                        type="text"
                        value={academicTerm}
                        disabled
                        className="w-full px-3 py-1.5 bg-slate-100 border border-slate-300 rounded-md text-xs font-bold text-slate-600 cursor-not-allowed"
                      />
                    </div>

                    {/* Department * */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Department <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={selectedDepartment}
                        onChange={(e) => handleDepartmentChange(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        {departmentOptions.map(dept => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                    </div>

                    {/* Class * */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Class <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={selectedClass}
                        onChange={(e) => setSelectedClass(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        {defaultClasses.map(cls => (
                          <option key={cls} value={cls}>{cls}</option>
                        ))}
                      </select>
                    </div>

                    {/* Subject * */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Subject <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={selectedSubject}
                        onChange={(e) => setSelectedSubject(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        {defaultSubjects.map(sub => (
                          <option key={sub} value={sub}>{sub}</option>
                        ))}
                      </select>
                    </div>

                    {/* Load Students Button */}
                    <div>
                      <label className="block text-xs font-bold text-transparent mb-1 select-none">
                        Action
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setIsStudentsLoaded(true);
                          showToast(`Loaded ${classStudents.length} students for ${selectedClass} - ${selectedSubject}`);
                        }}
                        className="w-full px-4 py-1.5 bg-[#007bff] hover:bg-blue-700 text-white rounded-md text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs cursor-pointer h-[34px]"
                      >
                        <Users className="w-3.5 h-3.5" /> Load Students
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Assessment Score Entry Grid */}
              {isStudentsLoaded && (() => {
                const missingScoresCount = classStudents.filter(st => {
                  const score = subjectScores[st.id];
                  return !score || score.classScore === 0 || score.examScore === 0;
                }).length;

                return (
                  <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-2xs space-y-3 p-4">
                    {isSubmissionLocked && (
                      <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-lg p-3 text-xs font-bold flex items-center gap-2.5 mb-2">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <div>
                          This class report batch has already been <strong className="text-amber-800 uppercase">{currentBroadcast?.status}</strong> to the Administration. Score editing is locked. If you need to make modifications, please visit the <button type="button" onClick={() => setActiveView('review_reports')} className="text-blue-700 hover:underline font-extrabold cursor-pointer">Report Card Review</button> tab to recall the submission.
                        </div>
                      </div>
                    )}
                    {/* Subject Sheet Heading & Summary Stats */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="bg-blue-100 text-blue-800 text-[10px] font-black uppercase px-2 py-0.5 rounded">
                            Continuous Assessment & Terminal Exams
                          </span>
                          <h3 className="text-base font-black text-slate-900">
                            {selectedClass} • {selectedSubject}
                          </h3>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Class Assessment (40%) + Exam Score (60%) = Total Mark (100%) • Grading automatically syncs with terminal report cards.
                        </p>
                      </div>

                      {/* Action buttons */}
                      <div className="flex flex-wrap items-center gap-2">
                        {systemSettings?.enableIncompleteReminders !== false && (
                          <button
                            type="button"
                            onClick={handleSendMissingGradeReminders}
                            disabled={isSendingReminders}
                            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                            title="Send automated email or notification reminders to students with incomplete scores"
                          >
                            <Bell className={`w-3.5 h-3.5 text-indigo-600 ${missingScoresCount > 0 ? 'animate-bounce' : ''}`} />
                            {isSendingReminders ? 'Sending...' : 'Send Reminders'}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={handleSaveAllResults}
                          className="px-4 py-1.5 bg-[#28a745] hover:bg-green-700 text-white rounded-md text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                        >
                          <Save className="w-3.5 h-3.5" /> Save All Scores
                        </button>
                      </div>
                    </div>

                    {/* Summary Metric Pills */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 pb-2">
                      <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-md text-center">
                        <div className="text-[10px] uppercase font-bold text-slate-500">Students Enrolled</div>
                        <div className="text-base font-black text-slate-900">{classStudents.length}</div>
                      </div>
                      <div className="bg-blue-50 border border-blue-200 p-2.5 rounded-md text-center">
                        <div className="text-[10px] uppercase font-bold text-blue-700">Subject Class Avg</div>
                        <div className="text-base font-black text-blue-900">{avgClassScore}%</div>
                      </div>
                      <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-md text-center">
                        <div className="text-[10px] uppercase font-bold text-emerald-700">Highest Score</div>
                        <div className="text-base font-black text-emerald-900">{highestMark}%</div>
                      </div>
                      <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-md text-center">
                        <div className="text-[10px] uppercase font-bold text-amber-700">Pass Rate (≥50%)</div>
                        <div className="text-base font-black text-amber-900">{passRate}%</div>
                      </div>
                    </div>

                    {/* Automated Reminder Alert Banner */}
                    {missingScoresCount > 0 && (
                      <div className="bg-indigo-50/75 border border-indigo-200/50 p-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2 text-indigo-900 font-medium">
                          <AlertCircle className="w-4 h-4 text-indigo-600 shrink-0" />
                          <span>
                            <strong>{missingScoresCount} student(s)</strong> have incomplete classwork or missing grade entries.
                            {systemSettings?.enableIncompleteReminders !== false ? (
                              <span className="text-slate-500 font-normal"> You can dispatch automated alerts to their portals and parent emails according to Admin system rules.</span>
                            ) : (
                              <span className="text-slate-500 font-normal"> (Automated alert dispatches are currently disabled in Admin portal settings).</span>
                            )}
                          </span>
                        </div>
                        {systemSettings?.enableIncompleteReminders !== false && (
                          <button
                            type="button"
                            onClick={handleSendMissingGradeReminders}
                            disabled={isSendingReminders}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap disabled:opacity-50"
                          >
                            <Bell className="w-3 h-3 text-white" />
                            {isSendingReminders ? 'Dispatched' : 'Notify Outstanding'}
                          </button>
                        )}
                      </div>
                    )}

                  {/* Search filter and Mode Switcher */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-1">
                    <div className="relative w-full sm:w-64">
                      <input
                        type="text"
                        placeholder="Search student or ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-md text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    </div>

                    {/* Mode Toggle: Quick SBA vs Detailed Continuous Assessment */}
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                      <span className="text-xs text-slate-500 font-semibold hidden md:inline">Entry Mode:</span>
                      <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs font-bold">
                        <button
                          type="button"
                          onClick={() => setIsDetailedSbaMode(false)}
                          className={`px-3 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                            !isDetailedSbaMode 
                              ? 'bg-white text-blue-800 shadow-2xs font-black' 
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <Calculator className="w-3 h-3 text-blue-600" />
                          <span>Standard SBA (40/60)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsDetailedSbaMode(true)}
                          className={`px-3 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                            isDetailedSbaMode 
                              ? 'bg-white text-indigo-800 shadow-2xs font-black' 
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <Layers className="w-3 h-3 text-indigo-600" />
                          <span>Detailed Assessment Breakdown</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Desktop Table */}
                  <div className="hidden md:block overflow-x-auto border border-slate-200 rounded-lg">
                    <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                      <thead>
                        <tr className="bg-slate-900 text-white font-bold uppercase text-[10px]">
                          <th className="py-2.5 px-3 w-10 text-center">#</th>
                          <th className="py-2.5 px-3">Photo</th>
                          <th className="py-2.5 px-3">Admission No</th>
                          <th className="py-2.5 px-3">Student Name</th>
                          
                          {isDetailedSbaMode ? (
                            <>
                              <th className="py-2.5 px-2.5 text-center bg-indigo-950 text-indigo-200">Classwork (/10)</th>
                              <th className="py-2.5 px-2.5 text-center bg-indigo-950 text-indigo-200">Homework (/10)</th>
                              <th className="py-2.5 px-2.5 text-center bg-indigo-950 text-indigo-200">SBA Test (/20)</th>
                              <th className="py-2.5 px-3 text-center bg-indigo-900 text-white">Continuous Assess (40%)</th>
                            </>
                          ) : (
                            <th className="py-2.5 px-3 text-center bg-slate-800">Continuous Assess (40%)</th>
                          )}

                          <th className="py-2.5 px-3 text-center bg-slate-800">Terminal Exam (60%)</th>
                          <th className="py-2.5 px-3 text-center bg-blue-900 text-white">Total (100%)</th>
                          <th className="py-2.5 px-3 text-center">Grade</th>
                          <th className="py-2.5 px-3 text-center">Position</th>
                          <th className="py-2.5 px-3 text-center">Remark</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
                        {classStudents.map((st, idx) => {
                          const sc = subjectScores[st.id] || { classScore: 0, examScore: 0 };
                          const det = detailedSbaScores[st.id] || { classwork: 8, homework: 8, classTest: 14 };
                          const total = sc.classScore + sc.examScore;
                          const { grade, remark } = calculateGrade(total);
                          const rankStr = getStudentRankString(st.id);

                          return (
                            <tr key={st.id} className="hover:bg-slate-50 transition-colors">
                              <td className="py-2.5 px-3 text-center text-slate-400 font-mono font-bold">
                                {idx + 1}
                              </td>
                              <td className="py-2 px-3">
                                <img
                                  src={st.photo || "https://images.unsplash.com/photo-1544717305-2782549b5136?w=150"}
                                  alt={st.fullName}
                                  className="w-8 h-8 rounded-full object-cover border border-slate-200"
                                />
                              </td>
                              <td className="py-2.5 px-3 font-mono font-bold text-blue-700">
                                {st.admissionNo}
                              </td>
                              <td className="py-2.5 px-3 font-bold text-slate-900">
                                {st.fullName}
                              </td>

                              {/* Detailed SBA Breakdown or Standard Single SBA Box */}
                              {isDetailedSbaMode ? (
                                <>
                                  <td className="py-2 px-2 text-center bg-indigo-50/30">
                                    <input
                                      type="number"
                                      min="0"
                                      max="10"
                                      value={det.classwork}
                                      onChange={(e) => handleDetailedScoreChange(st.id, 'classwork', parseFloat(e.target.value) || 0)}
                                      className="w-16 px-1.5 py-1 text-center font-mono font-bold border border-indigo-200 rounded focus:ring-1 focus:ring-indigo-500 bg-white"
                                    />
                                  </td>
                                  <td className="py-2 px-2 text-center bg-indigo-50/30">
                                    <input
                                      type="number"
                                      min="0"
                                      max="10"
                                      value={det.homework}
                                      onChange={(e) => handleDetailedScoreChange(st.id, 'homework', parseFloat(e.target.value) || 0)}
                                      className="w-16 px-1.5 py-1 text-center font-mono font-bold border border-indigo-200 rounded focus:ring-1 focus:ring-indigo-500 bg-white"
                                    />
                                  </td>
                                  <td className="py-2 px-2 text-center bg-indigo-50/30">
                                    <input
                                      type="number"
                                      min="0"
                                      max="20"
                                      value={det.classTest}
                                      onChange={(e) => handleDetailedScoreChange(st.id, 'classTest', parseFloat(e.target.value) || 0)}
                                      className="w-16 px-1.5 py-1 text-center font-mono font-bold border border-indigo-200 rounded focus:ring-1 focus:ring-indigo-500 bg-white"
                                    />
                                  </td>
                                  <td className="py-2.5 px-3 text-center font-mono font-bold text-indigo-900 bg-indigo-50/80">
                                    {sc.classScore} / 40
                                  </td>
                                </>
                              ) : (
                                <td className="py-2 px-3 text-center bg-slate-50/50">
                                  <input
                                    type="number"
                                    min="0"
                                    max="40"
                                    value={sc.classScore}
                                    onChange={(e) => handleScoreChange(st.id, 'classScore', parseFloat(e.target.value) || 0)}
                                    className="w-20 px-2 py-1 text-center font-mono font-bold border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 bg-white"
                                  />
                                </td>
                              )}

                              {/* Terminal Exam Score (60%) */}
                              <td className="py-2 px-3 text-center bg-slate-50/50">
                                <input
                                  type="number"
                                  min="0"
                                  max="60"
                                  value={sc.examScore}
                                  onChange={(e) => handleScoreChange(st.id, 'examScore', parseFloat(e.target.value) || 0)}
                                  className="w-20 px-2 py-1 text-center font-mono font-bold border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 bg-white"
                                />
                              </td>
                              {/* Total Score */}
                              <td className="py-2.5 px-3 text-center font-mono font-black text-sm bg-blue-50/40 text-blue-900">
                                {total}
                              </td>
                              {/* Grade */}
                              <td className="py-2.5 px-3 text-center">
                                <span className={`px-2 py-0.5 rounded text-[11px] font-black ${
                                  parseInt(grade) <= 2 ? 'bg-emerald-100 text-emerald-800' :
                                  parseInt(grade) <= 5 ? 'bg-blue-100 text-blue-800' :
                                  parseInt(grade) <= 7 ? 'bg-amber-100 text-amber-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  Grade {grade}
                                </span>
                              </td>
                              {/* Position */}
                              <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-700">
                                {rankStr}
                              </td>
                              {/* Remark */}
                              <td className="py-2.5 px-3 text-center font-semibold text-slate-600">
                                {remark}
                              </td>
                            </tr>
                          );
                        })}
                        {classStudents.length === 0 && (
                          <tr>
                            <td colSpan={isDetailedSbaMode ? 13 : 10} className="py-6 text-center text-slate-400 font-semibold">
                              No students found in {selectedClass}.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards View for Score Entry */}
                  <div className="md:hidden space-y-3 pt-2">
                    {classStudents.map((st) => {
                      const sc = subjectScores[st.id] || { classScore: 0, examScore: 0 };
                      const det = detailedSbaScores[st.id] || { classwork: 8, homework: 8, classTest: 14 };
                      const total = sc.classScore + sc.examScore;
                      const { grade, remark } = calculateGrade(total);
                      const rankStr = getStudentRankString(st.id);

                      return (
                        <div key={st.id} className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3">
                          <div className="flex items-center gap-3">
                            <img
                              src={st.photo || "https://images.unsplash.com/photo-1544717305-2782549b5136?w=150"}
                              alt={st.fullName}
                              className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <h4 className="font-extrabold text-slate-900 text-sm truncate">{st.fullName}</h4>
                              <p className="text-xs text-blue-700 font-mono font-bold">{st.admissionNo}</p>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[11px] font-black ${
                              parseInt(grade) <= 2 ? 'bg-emerald-100 text-emerald-800' :
                              parseInt(grade) <= 5 ? 'bg-blue-100 text-blue-800' :
                              parseInt(grade) <= 7 ? 'bg-amber-100 text-amber-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              Grade {grade}
                            </span>
                          </div>

                          {/* Detailed SBA Breakdown or Standard SBA in Mobile Card */}
                          {isDetailedSbaMode ? (
                            <div className="space-y-2 bg-indigo-50/40 p-3 rounded-xl border border-indigo-100">
                              <div className="text-[10px] uppercase font-bold text-indigo-800 tracking-wider">
                                Continuous Assessment Breakdown (40%)
                              </div>
                              <div className="grid grid-cols-3 gap-2">
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Classwork (10)</label>
                                  <input
                                    type="number"
                                    min="0"
                                    max="10"
                                    value={det.classwork}
                                    onChange={(e) => handleDetailedScoreChange(st.id, 'classwork', parseFloat(e.target.value) || 0)}
                                    className="w-full px-2 py-1 text-center font-mono font-bold border border-slate-300 rounded bg-white text-xs"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Homework (10)</label>
                                  <input
                                    type="number"
                                    min="0"
                                    max="10"
                                    value={det.homework}
                                    onChange={(e) => handleDetailedScoreChange(st.id, 'homework', parseFloat(e.target.value) || 0)}
                                    className="w-full px-2 py-1 text-center font-mono font-bold border border-slate-300 rounded bg-white text-xs"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Test (20)</label>
                                  <input
                                    type="number"
                                    min="0"
                                    max="20"
                                    value={det.classTest}
                                    onChange={(e) => handleDetailedScoreChange(st.id, 'classTest', parseFloat(e.target.value) || 0)}
                                    className="w-full px-2 py-1 text-center font-mono font-bold border border-slate-300 rounded bg-white text-xs"
                                  />
                                </div>
                              </div>
                              <div className="flex justify-between items-center pt-1 border-t border-indigo-100 text-xs font-bold text-indigo-900">
                                <span>Continuous Assess Total:</span>
                                <span>{sc.classScore} / 40</span>
                              </div>
                            </div>
                          ) : null}

                          <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                            {!isDetailedSbaMode && (
                              <div>
                                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                                  Continuous Assess (40%)
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  max="40"
                                  value={sc.classScore}
                                  onChange={(e) => handleScoreChange(st.id, 'classScore', parseFloat(e.target.value) || 0)}
                                  className="w-full px-2 py-1.5 text-center font-mono font-bold border border-slate-300 rounded-lg bg-white"
                                />
                              </div>
                            )}
                            <div className={isDetailedSbaMode ? 'col-span-2' : ''}>
                              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                                Terminal Exam (60%)
                              </label>
                              <input
                                type="number"
                                min="0"
                                max="60"
                                value={sc.examScore}
                                onChange={(e) => handleScoreChange(st.id, 'examScore', parseFloat(e.target.value) || 0)}
                                className="w-full px-2 py-1.5 text-center font-mono font-bold border border-slate-300 rounded-lg bg-white"
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-xs pt-1">
                            <div className="flex items-center gap-2">
                              <span className="text-slate-500">Total:</span>
                              <strong className="text-sm font-black text-blue-900">{total} / 100</strong>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-slate-500">Position:</span>
                              <strong className="font-bold text-slate-800">{rankStr}</strong>
                            </div>
                            <div className="text-slate-600 font-semibold">{remark}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Bottom Save & Lock Buttons */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
                    <div className="text-xs text-slate-500">
                      Scores are automatically validated against GES grading standards.
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={handleSaveAllResults}
                        className="w-full sm:w-auto px-5 py-2 bg-[#28a745] hover:bg-green-700 text-white rounded-md text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                      >
                        <Save className="w-4 h-4" /> Save All Results
                      </button>
                    </div>
                  </div>
                </div>
                );
              })()}
            </div>
          )}

          {/* =================================================================== */}
          {/* VIEW 3: ATTENDANCE & COMMENT */}
          {/* =================================================================== */}
          {activeView === 'attendance_comment' && (
            <div className="space-y-4">
              {/* Header Navigation Tab for Attendance vs Remarks */}
              <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-2xs flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setAttendanceSubTab('register')}
                    className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                      attendanceSubTab === 'register' 
                        ? 'bg-blue-600 text-white shadow-2xs' 
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5" /> Daily Attendance Register
                  </button>
                  <button
                    onClick={() => setAttendanceSubTab('remarks')}
                    className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                      attendanceSubTab === 'remarks' 
                        ? 'bg-blue-600 text-white shadow-2xs' 
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Terminal Remarks & Character
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-500">Department:</span>
                    <select
                      value={selectedDepartment}
                      onChange={(e) => handleDepartmentChange(e.target.value)}
                      className="px-2.5 py-1 border border-slate-300 rounded text-xs font-bold text-slate-800 bg-white"
                    >
                      {departmentOptions.map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-500">Class:</span>
                    <select
                      value={selectedClass}
                      onChange={(e) => setSelectedClass(e.target.value)}
                      className="px-2.5 py-1 border border-slate-300 rounded text-xs font-bold text-slate-800 bg-white"
                    >
                      {defaultClasses.map(cls => (
                        <option key={cls} value={cls}>{cls}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {isSubmissionLocked && (
                <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-lg p-3 text-xs font-bold flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <div>
                    This class report batch is locked because it has already been <strong className="text-amber-800 uppercase">{currentBroadcast?.status}</strong> to the Administration. Comment edits and behavior ratings are locked. If you need to make modifications, please visit the <button type="button" onClick={() => setActiveView('review_reports')} className="text-blue-700 hover:underline font-extrabold cursor-pointer">Report Card Review</button> tab to recall the submission.
                  </div>
                </div>
              )}

              {/* Sub-View A: Daily Attendance Register */}
              {attendanceSubTab === 'register' && (
                <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-4 shadow-2xs">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        Daily Attendance Roll: {selectedClass}
                      </h3>
                      <p className="text-xs text-slate-500">
                        Mark attendance status for each student on the selected school day.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                      <input
                        type="date"
                        value={attendanceDate}
                        onChange={(e) => setAttendanceDate(e.target.value)}
                        className="px-3 py-1.5 border border-slate-300 rounded text-xs font-bold bg-white"
                      />
                      <button
                        type="button"
                        onClick={handleMarkAllPresent}
                        className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded text-xs font-bold cursor-pointer transition-colors"
                      >
                        Mark All Present
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveAttendance}
                        className="px-3.5 py-1.5 bg-[#28a745] hover:bg-green-700 text-white rounded text-xs font-bold shadow-2xs cursor-pointer flex items-center gap-1.5"
                      >
                        <Save className="w-3.5 h-3.5" /> Save Register
                      </button>
                    </div>
                  </div>

                  {/* Attendance table */}
                  <div className="overflow-x-auto border border-slate-200 rounded-lg">
                    <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                      <thead>
                        <tr className="bg-slate-900 text-white font-bold uppercase text-[10px]">
                          <th className="py-2.5 px-3 w-10 text-center">#</th>
                          <th className="py-2.5 px-3">Admission No</th>
                          <th className="py-2.5 px-3">Student Name</th>
                          <th className="py-2.5 px-3 text-center">Mark Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {classStudents.map((st, idx) => {
                          const currentStatus = attendanceRegister[st.id] || 'Present';
                          return (
                            <tr key={st.id} className="hover:bg-slate-50">
                              <td className="py-2.5 px-3 text-center text-slate-400 font-mono font-bold">
                                {idx + 1}
                              </td>
                              <td className="py-2.5 px-3 font-mono font-bold text-blue-700">
                                {st.admissionNo}
                              </td>
                              <td className="py-2.5 px-3 font-bold text-slate-900">
                                {st.fullName}
                              </td>
                              <td className="py-2 px-3 text-center">
                                <div className="inline-flex gap-1 bg-slate-100 p-1 rounded-md">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleAttendance(st.id, 'Present')}
                                    className={`px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                                      currentStatus === 'Present' 
                                        ? 'bg-[#28a745] text-white shadow-2xs' 
                                        : 'text-slate-600 hover:bg-slate-200'
                                    }`}
                                  >
                                    Present
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleAttendance(st.id, 'Late')}
                                    className={`px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                                      currentStatus === 'Late' 
                                        ? 'bg-[#ffc107] text-slate-900 shadow-2xs font-black' 
                                        : 'text-slate-600 hover:bg-slate-200'
                                    }`}
                                  >
                                    Late
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleAttendance(st.id, 'Absent')}
                                    className={`px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                                      currentStatus === 'Absent' 
                                        ? 'bg-[#dc3545] text-white shadow-2xs' 
                                        : 'text-slate-600 hover:bg-slate-200'
                                    }`}
                                  >
                                    Absent
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleAttendance(st.id, 'Excused')}
                                    className={`px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                                      currentStatus === 'Excused' 
                                        ? 'bg-[#17a2b8] text-white shadow-2xs' 
                                        : 'text-slate-600 hover:bg-slate-200'
                                    }`}
                                  >
                                    Excused
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

              {/* Sub-View B: Terminal Remarks & Character Assessment (Selective Mode) */}
              {attendanceSubTab === 'remarks' && (
                <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-4 shadow-2xs">
                  {/* Header & Main Actions */}
                  <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <Award className="w-5 h-5 text-indigo-600" />
                        Terminal Remarks & Selective Behavioral Assessment: {selectedClass}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Choose curriculum-compliant selective remarks for conduct, attitude to work, co-curricular interest, and terminal promotion.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSmartAutoFillRemarks}
                        className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded text-xs font-bold shadow-2xs cursor-pointer flex items-center gap-1.5 transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> ✨ Auto-Select from Grades
                      </button>

                      <button
                        type="button"
                        onClick={handleSaveTerminalRemarks}
                        className="px-4 py-1.5 bg-[#28a745] hover:bg-green-700 text-white rounded text-xs font-bold shadow-2xs cursor-pointer flex items-center gap-1.5 transition-colors"
                      >
                        <Save className="w-3.5 h-3.5" /> Save All Terminal Remarks
                      </button>
                    </div>
                  </div>

                  {/* Batch Bulk Allocation Strip */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2 text-xs">
                    <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                      <Filter className="w-3.5 h-3.5 text-indigo-600" />
                      Class-Wide Quick Batch Setters:
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {/* Bulk Conduct */}
                      <div className="flex gap-1.5">
                        <select
                          id="bulk-conduct-select"
                          className="flex-1 px-2.5 py-1 bg-white border border-slate-300 rounded text-[11px] font-medium text-slate-800"
                          defaultValue=""
                          onChange={(e) => {
                            if (e.target.value) {
                              handleBulkApplyConduct(e.target.value);
                              e.target.value = '';
                            }
                          }}
                        >
                          <option value="" disabled>Set Conduct for All Students...</option>
                          {SELECTIVE_CONDUCT_PRESETS.map((c, i) => (
                            <option key={i} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>

                      {/* Bulk Attitude */}
                      <div className="flex gap-1.5">
                        <select
                          id="bulk-attitude-select"
                          className="flex-1 px-2.5 py-1 bg-white border border-slate-300 rounded text-[11px] font-medium text-slate-800"
                          defaultValue=""
                          onChange={(e) => {
                            if (e.target.value) {
                              handleBulkApplyAttitude(e.target.value);
                              e.target.value = '';
                            }
                          }}
                        >
                          <option value="" disabled>Set Attitude for All Students...</option>
                          {SELECTIVE_ATTITUDE_PRESETS.map((a, i) => (
                            <option key={i} value={a}>{a}</option>
                          ))}
                        </select>
                      </div>

                      {/* Bulk Interest */}
                      <div className="flex gap-1.5">
                        <select
                          id="bulk-interest-select"
                          className="flex-1 px-2.5 py-1 bg-white border border-slate-300 rounded text-[11px] font-medium text-slate-800"
                          defaultValue=""
                          onChange={(e) => {
                            if (e.target.value) {
                              handleBulkApplyInterest(e.target.value);
                              e.target.value = '';
                            }
                          }}
                        >
                          <option value="" disabled>Set Talent/Interest for All...</option>
                          {SELECTIVE_INTEREST_PRESETS.map((intr, i) => (
                            <option key={i} value={intr}>{intr}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Student Remarks Cards List */}
                  <div className="space-y-4">
                    {classStudents.map((st, idx) => {
                      const data = terminalRemarks[st.id] || {
                        conduct: 'Good conduct; maintains school rules',
                        attitude: 'Attentive, motivated & consistently focused',
                        interest: 'Reading, Creative Arts & ICT',
                        teacherComment: 'A hardworking and promising student.',
                        attendancePresent: 66,
                        promotionDecision: 'Promoted'
                      };

                      return (
                        <div key={st.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 hover:border-indigo-300 transition-colors">
                          {/* Student Header Bar */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
                            <div className="flex items-center gap-2.5">
                              <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                                {idx + 1}
                              </span>
                              <div>
                                <span className="font-black text-sm text-slate-900">{st.fullName}</span>
                                <span className="text-xs font-mono font-bold text-blue-700 ml-2">({st.admissionNo})</span>
                              </div>
                            </div>

                            {/* Promotion Decision */}
                            <div className="flex items-center gap-2">
                              <label className="text-xs font-bold text-slate-700">Promotion Decision:</label>
                              <select
                                value={data.promotionDecision}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setTerminalRemarks(prev => ({
                                    ...prev,
                                    [st.id]: { ...prev[st.id], promotionDecision: val }
                                  }));
                                }}
                                className={`px-2.5 py-1 border rounded text-xs font-bold ${
                                  data.promotionDecision === 'Promoted' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' :
                                  data.promotionDecision === 'Promoted on Trial' ? 'bg-amber-50 text-amber-800 border-amber-300' :
                                  'bg-rose-50 text-rose-800 border-rose-300'
                                }`}
                              >
                                <option value="Promoted">Promoted</option>
                                <option value="Promoted on Trial">Promoted on Trial</option>
                                <option value="Repeated">Repeated</option>
                              </select>
                            </div>
                          </div>

                          {/* 4 Assessment Columns */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                            {/* 1. Conduct & Character (Selective) */}
                            <div className="space-y-1">
                              <div className="flex justify-between items-center">
                                <label className="block text-[11px] font-bold text-slate-700">
                                  Conduct & Character *
                                </label>
                              </div>
                              <select
                                value={SELECTIVE_CONDUCT_PRESETS.includes(data.conduct) ? data.conduct : '__custom__'}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val !== '__custom__') {
                                    setTerminalRemarks(prev => ({
                                      ...prev,
                                      [st.id]: { ...prev[st.id], conduct: val }
                                    }));
                                  }
                                }}
                                className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-xs font-medium text-slate-900 focus:ring-1 focus:ring-indigo-500"
                              >
                                {SELECTIVE_CONDUCT_PRESETS.map((c, i) => (
                                  <option key={i} value={c}>{c}</option>
                                ))}
                                {!SELECTIVE_CONDUCT_PRESETS.includes(data.conduct) && (
                                  <option value="__custom__">Custom: {data.conduct.slice(0, 30)}...</option>
                                )}
                              </select>
                              {/* Quick selection chips */}
                              <div className="flex flex-wrap gap-1 pt-1">
                                <button
                                  type="button"
                                  onClick={() => setTerminalRemarks(prev => ({ ...prev, [st.id]: { ...prev[st.id], conduct: 'Excellent, respectful & highly disciplined' } }))}
                                  className="text-[10px] px-1.5 py-0.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded font-semibold transition-colors cursor-pointer"
                                >
                                  ✨ Excellent
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setTerminalRemarks(prev => ({ ...prev, [st.id]: { ...prev[st.id], conduct: 'Well-behaved, obedient & courteous' } }))}
                                  className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded font-semibold transition-colors cursor-pointer"
                                >
                                  👍 Well-Behaved
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setTerminalRemarks(prev => ({ ...prev, [st.id]: { ...prev[st.id], conduct: 'Polite, cooperative & responsible' } }))}
                                  className="text-[10px] px-1.5 py-0.5 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded font-semibold transition-colors cursor-pointer"
                                >
                                  🤝 Cooperative
                                </button>
                              </div>
                            </div>

                            {/* 2. Attitude Towards Work (Selective) */}
                            <div className="space-y-1">
                              <label className="block text-[11px] font-bold text-slate-700">
                                Attitude Towards Work *
                              </label>
                              <select
                                value={SELECTIVE_ATTITUDE_PRESETS.includes(data.attitude) ? data.attitude : '__custom__'}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val !== '__custom__') {
                                    setTerminalRemarks(prev => ({
                                      ...prev,
                                      [st.id]: { ...prev[st.id], attitude: val }
                                    }));
                                  }
                                }}
                                className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-xs font-medium text-slate-900 focus:ring-1 focus:ring-indigo-500"
                              >
                                {SELECTIVE_ATTITUDE_PRESETS.map((a, i) => (
                                  <option key={i} value={a}>{a}</option>
                                ))}
                                {!SELECTIVE_ATTITUDE_PRESETS.includes(data.attitude) && (
                                  <option value="__custom__">Custom: {data.attitude.slice(0, 30)}...</option>
                                )}
                              </select>
                              {/* Quick selection chips */}
                              <div className="flex flex-wrap gap-1 pt-1">
                                <button
                                  type="button"
                                  onClick={() => setTerminalRemarks(prev => ({ ...prev, [st.id]: { ...prev[st.id], attitude: 'Very attentive, diligent & hardworking' } }))}
                                  className="text-[10px] px-1.5 py-0.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded font-semibold transition-colors cursor-pointer"
                                >
                                  ⭐ Hardworking
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setTerminalRemarks(prev => ({ ...prev, [st.id]: { ...prev[st.id], attitude: 'Attentive, motivated & consistently focused' } }))}
                                  className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded font-semibold transition-colors cursor-pointer"
                                >
                                  🔥 Motivated
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setTerminalRemarks(prev => ({ ...prev, [st.id]: { ...prev[st.id], attitude: 'Active participant in class discussions' } }))}
                                  className="text-[10px] px-1.5 py-0.5 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded font-semibold transition-colors cursor-pointer"
                                >
                                  💬 Active
                                </button>
                              </div>
                            </div>

                            {/* 3. Interest & Talents (Selective) */}
                            <div className="space-y-1">
                              <label className="block text-[11px] font-bold text-slate-700">
                                Interest / Talents *
                              </label>
                              <select
                                value={SELECTIVE_INTEREST_PRESETS.includes(data.interest) ? data.interest : '__custom__'}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val !== '__custom__') {
                                    setTerminalRemarks(prev => ({
                                      ...prev,
                                      [st.id]: { ...prev[st.id], interest: val }
                                    }));
                                  }
                                }}
                                className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-xs font-medium text-slate-900 focus:ring-1 focus:ring-indigo-500"
                              >
                                {SELECTIVE_INTEREST_PRESETS.map((intr, i) => (
                                  <option key={i} value={intr}>{intr}</option>
                                ))}
                                {!SELECTIVE_INTEREST_PRESETS.includes(data.interest) && (
                                  <option value="__custom__">Custom: {data.interest.slice(0, 30)}...</option>
                                )}
                              </select>
                              {/* Quick selection chips */}
                              <div className="flex flex-wrap gap-1 pt-1">
                                <button
                                  type="button"
                                  onClick={() => setTerminalRemarks(prev => ({ ...prev, [st.id]: { ...prev[st.id], interest: 'Reading, Creative Arts & ICT' } }))}
                                  className="text-[10px] px-1.5 py-0.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded font-semibold transition-colors cursor-pointer"
                                >
                                  📖 Reading & ICT
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setTerminalRemarks(prev => ({ ...prev, [st.id]: { ...prev[st.id], interest: 'Sports, Athletics & Football' } }))}
                                  className="text-[10px] px-1.5 py-0.5 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded font-semibold transition-colors cursor-pointer"
                                >
                                  ⚽ Sports
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setTerminalRemarks(prev => ({ ...prev, [st.id]: { ...prev[st.id], interest: 'Robotics, Coding & STEM Projects' } }))}
                                  className="text-[10px] px-1.5 py-0.5 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded font-semibold transition-colors cursor-pointer"
                                >
                                  🤖 STEM
                                </button>
                              </div>
                            </div>

                            {/* 4. Attendance (Present / 70) */}
                            <div className="space-y-1">
                              <label className="block text-[11px] font-bold text-slate-700">
                                Attendance (Days Present / 70)
                              </label>
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="number"
                                  min="0"
                                  max="70"
                                  value={data.attendancePresent}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value) || 0;
                                    setTerminalRemarks(prev => ({
                                      ...prev,
                                      [st.id]: { ...prev[st.id], attendancePresent: val }
                                    }));
                                  }}
                                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs font-mono font-bold text-slate-900"
                                />
                                <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap">/ 70 days</span>
                              </div>
                              <div className="flex gap-1 pt-1">
                                <button
                                  type="button"
                                  onClick={() => setTerminalRemarks(prev => ({ ...prev, [st.id]: { ...prev[st.id], attendancePresent: 70 } }))}
                                  className="text-[10px] px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-bold cursor-pointer"
                                >
                                  Full 70
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setTerminalRemarks(prev => ({ ...prev, [st.id]: { ...prev[st.id], attendancePresent: 68 } }))}
                                  className="text-[10px] px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-bold cursor-pointer"
                                >
                                  68
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setTerminalRemarks(prev => ({ ...prev, [st.id]: { ...prev[st.id], attendancePresent: 65 } }))}
                                  className="text-[10px] px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-bold cursor-pointer"
                                >
                                  65
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Class Teacher Terminal Remarks (Selective Dropdown + Editable Box) */}
                          <div className="space-y-1.5 pt-1 border-t border-slate-200/80">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                              <label className="block text-[11px] font-bold text-slate-800 flex items-center gap-1">
                                <FileText className="w-3.5 h-3.5 text-indigo-600" />
                                Class Teacher Terminal Remarks & Recommendation:
                              </label>

                              {/* Selective Preset Selector */}
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-slate-500 font-bold">Select Remark Preset:</span>
                                <select
                                  defaultValue=""
                                  onChange={(e) => {
                                    if (e.target.value) {
                                      setTerminalRemarks(prev => ({
                                        ...prev,
                                        [st.id]: { ...prev[st.id], teacherComment: e.target.value }
                                      }));
                                      e.target.value = '';
                                    }
                                  }}
                                  className="px-2 py-1 bg-white border border-indigo-200 text-indigo-900 rounded text-[11px] font-bold"
                                >
                                  <option value="" disabled>Choose Predefined Remark...</option>
                                  {SELECTIVE_TEACHER_REMARKS.map((group, gIdx) => (
                                    <optgroup key={gIdx} label={group.category}>
                                      {group.remarks.map((rmk, rIdx) => (
                                        <option key={rIdx} value={rmk}>{rmk}</option>
                                      ))}
                                    </optgroup>
                                  ))}
                                </select>
                              </div>
                            </div>

                            {/* Editable text box */}
                            <input
                              type="text"
                              value={data.teacherComment}
                              onChange={(e) => {
                                const val = e.target.value;
                                setTerminalRemarks(prev => ({
                                  ...prev,
                                  [st.id]: { ...prev[st.id], teacherComment: val }
                                }));
                              }}
                              placeholder="Type or select remark from dropdown above..."
                              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                            />

                            {/* Quick 1-click preset badges */}
                            <div className="flex flex-wrap gap-1.5 pt-0.5">
                              <button
                                type="button"
                                onClick={() => setTerminalRemarks(prev => ({ ...prev, [st.id]: { ...prev[st.id], teacherComment: 'An outstanding academic performance! Keep maintaining this brilliant standard.' } }))}
                                className="text-[10px] px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded hover:bg-emerald-100 font-bold transition-colors cursor-pointer"
                              >
                                🏆 Outstanding
                              </button>
                              <button
                                type="button"
                                onClick={() => setTerminalRemarks(prev => ({ ...prev, [st.id]: { ...prev[st.id], teacherComment: 'Very good performance. Maintain this high level of dedication and enthusiasm.' } }))}
                                className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 rounded hover:bg-blue-100 font-bold transition-colors cursor-pointer"
                              >
                                ⭐ Very Good
                              </button>
                              <button
                                type="button"
                                onClick={() => setTerminalRemarks(prev => ({ ...prev, [st.id]: { ...prev[st.id], teacherComment: 'A disciplined, hardworking, and promising student. Promoted with merit.' } }))}
                                className="text-[10px] px-2 py-0.5 bg-purple-50 text-purple-800 border border-purple-200 rounded hover:bg-purple-100 font-bold transition-colors cursor-pointer"
                              >
                                🎖️ Hardworking & Promoted
                              </button>
                              <button
                                type="button"
                                onClick={() => setTerminalRemarks(prev => ({ ...prev, [st.id]: { ...prev[st.id], teacherComment: 'Satisfactory performance, but capable of doing much better with more focus.' } }))}
                                className="text-[10px] px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded hover:bg-amber-100 font-bold transition-colors cursor-pointer"
                              >
                                📈 Satisfactory / Needs Focus
                              </button>
                              <button
                                type="button"
                                onClick={() => setTerminalRemarks(prev => ({ ...prev, [st.id]: { ...prev[st.id], teacherComment: 'Below average performance. Requires serious academic intervention and remedial support.' } }))}
                                className="text-[10px] px-2 py-0.5 bg-rose-50 text-rose-800 border border-rose-200 rounded hover:bg-rose-100 font-bold transition-colors cursor-pointer"
                              >
                                ⚠️ Remedial Support Needed
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =================================================================== */}
          {/* VIEW 3.5: ENROLL NEW STUDENT (Awaiting Admin Approval) */}
          {/* =================================================================== */}
          {activeView === 'enroll_student' && (
            <div className="max-w-4xl mx-auto space-y-4">
              {/* Header Banner */}
              <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase px-2 py-0.5 rounded">
                      Teacher Admissions
                    </span>
                    <h2 className="text-xl font-black text-slate-900">Enroll New Student</h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Submit student admission details directly from your portal. New enrollments will be queued for Admin/Headmaster review & approval.
                  </p>
                </div>

                {/* Sub tabs */}
                <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-bold shrink-0">
                  <button
                    type="button"
                    onClick={() => setEnrollmentActiveTab('form')}
                    className={`px-3 py-1.5 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                      enrollmentActiveTab === 'form'
                        ? 'bg-white text-emerald-800 shadow-2xs font-black'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <UserPlus className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Application Form</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEnrollmentActiveTab('submissions')}
                    className={`px-3 py-1.5 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                      enrollmentActiveTab === 'submissions'
                        ? 'bg-white text-blue-800 shadow-2xs font-black'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Inbox className="w-3.5 h-3.5 text-blue-600" />
                    <span>Submitted Records ({students.filter(s => s.status === 'Pending' || s.approvalStatus === 'Pending' || s.enrolledBy?.includes(teacher.name)).length})</span>
                  </button>
                </div>
              </div>

              {/* Toast Feedback */}
              {enrollmentToast && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg text-xs font-bold flex items-center gap-3 shadow-xs animate-fadeIn">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <div className="font-black text-sm text-emerald-950">Enrollment Submitted Successfully!</div>
                    <div className="text-emerald-800 font-medium">{enrollmentToast}</div>
                  </div>
                </div>
              )}

              {/* Sub-view 1: Application Form */}
              {enrollmentActiveTab === 'form' && (
                <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-2xs">
                  <DraftStatusBanner
                    isDraftRestored={isTeacherDraftRestored}
                    lastSavedAt={teacherLastSavedAt}
                    isSaving={isTeacherSaving}
                    onDiscardDraft={() => discardTeacherDraft(resetTeacherEnrollmentForm)}
                  />

                  <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-lg mb-6 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-xs text-amber-900 space-y-1">
                      <strong className="block font-bold text-amber-950">Admission Approval Workflow:</strong>
                      <span>
                        Students enrolled through the Teacher Portal will receive a temporary <code className="bg-amber-100 px-1 py-0.5 rounded font-mono font-bold">PENDING-APPROVAL</code> status. 
                        Once the Administrator reviews the record and issues the official permanent Admission ID, the student will automatically appear in active class rolls, terminal broadsheets, and billing rosters.
                      </span>
                    </div>
                  </div>

                  <form onSubmit={handleSubmitTeacherEnrollment} className="space-y-6">
                    {/* 1. Student Biodata & Identification */}
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                      <h3 className="font-bold text-slate-900 uppercase tracking-wider text-xs text-indigo-700 flex items-center gap-2">
                        <User className="w-4 h-4" />
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
                            onChange={(e) => handleTeacherEnrollDeptChange(e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-xs text-slate-900"
                          >
                            <option value="Primary School">Primary School (Basic 1 - 6)</option>
                            <option value="Junior High School">Junior High School (JHS 1 - 3)</option>
                            <option value="Senior High School">Senior High School (SHS Programmes)</option>
                            <option value="Pre-School / Kindergarten">Pre-School / Kindergarten (Creche, Nursery, KG)</option>
                          </select>
                        </div>

                        {/* SHS Course & Level OR Admission Class */}
                        {(enrollDepartment.toLowerCase().includes('senior') || enrollDepartment.toLowerCase().includes('shs')) ? (
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
                                  {effectiveTeacherShsCourses.map(c => (
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
                                {getTeacherAvailableElectives(enrollCourse).map(elec => (
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
                              {getTeacherClassesForDept(enrollDepartment).map(cls => (
                                <option key={cls} value={cls}>{cls}</option>
                              ))}
                            </select>
                          </div>
                        )}

                        {/* Nationality */}
                        <div className="col-span-1 md:col-span-2">
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
                            <option value="Beninese">Beninese</option>
                            <option value="Ivorian">Ivorian</option>
                            <option value="Burkinabe">Burkinabe</option>
                            <option value="Other / International">Other / International</option>
                          </select>
                        </div>
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
                        Enrolled by: <strong className="text-slate-800">{teacher.name} (Teacher)</strong>
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
                              <RefreshCw className="w-4 h-4 animate-spin" /> Submitting...
                            </>
                          ) : (
                            <>
                              <UserPlus className="w-4 h-4" /> Submit Enrollment for Approval
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              )}

              {/* Sub-view 2: My Submitted Admissions */}
              {enrollmentActiveTab === 'submissions' && (
                <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-2xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="text-base font-black text-slate-900">Submitted Student Admissions</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Track approval progress of student admissions submitted for administrative clearance.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setEnrollmentActiveTab('form')}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <UserPlus className="w-3.5 h-3.5" /> + New Application
                    </button>
                  </div>

                  <div className="overflow-x-auto border border-slate-200 rounded-lg">
                    <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                      <thead>
                        <tr className="bg-slate-900 text-white font-bold uppercase text-[10px]">
                          <th className="py-2.5 px-3">Photo</th>
                          <th className="py-2.5 px-3">Student Name</th>
                          <th className="py-2.5 px-3">Class</th>
                          <th className="py-2.5 px-3">Parent / Contact</th>
                          <th className="py-2.5 px-3">Submitted By</th>
                          <th className="py-2.5 px-3 text-center">Status</th>
                          <th className="py-2.5 px-3 text-center">Admission No</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
                        {students
                          .filter(s => s.status === 'Pending' || s.approvalStatus === 'Pending' || s.enrolledBy?.includes(teacher.name))
                          .map((st) => (
                            <tr key={st.id} className="hover:bg-slate-50 transition-colors">
                              <td className="py-2 px-3">
                                <img
                                  src={st.photo || "https://images.unsplash.com/photo-1544717305-2782549b5136?w=150"}
                                  alt={st.fullName}
                                  className="w-8 h-8 rounded-full object-cover border border-slate-200"
                                />
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="font-bold text-slate-900">{st.fullName}</div>
                                <div className="text-[10px] text-slate-500">{st.gender} • DOB: {st.dob}</div>
                              </td>
                              <td className="py-2.5 px-3">
                                <span className="px-2 py-0.5 bg-slate-100 rounded font-bold text-slate-700">
                                  {st.className}
                                </span>
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="font-semibold">{st.parentName}</div>
                                <div className="text-[10px] font-mono text-slate-500">{st.parentPhone}</div>
                              </td>
                              <td className="py-2.5 px-3 text-slate-600 font-medium">
                                {st.enrolledBy || `${teacher.name} (Teacher)`}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                {st.status === 'Pending' || st.approvalStatus === 'Pending' ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200">
                                    <Clock className="w-3 h-3 text-amber-600 animate-pulse" /> Pending Approval
                                  </span>
                                ) : st.status === 'Inactive' ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-200">
                                    <X className="w-3 h-3 text-rose-600" /> Rejected / Inactive
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Approved & Enrolled
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-center font-mono font-bold">
                                {st.admissionNo === 'PENDING-APPROVAL' ? (
                                  <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-[10px]">
                                    Awaiting ID
                                  </span>
                                ) : (
                                  <span className="text-blue-700">
                                    {st.admissionNo}
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        {students.filter(s => s.status === 'Pending' || s.approvalStatus === 'Pending' || s.enrolledBy?.includes(teacher.name)).length === 0 && (
                          <tr>
                            <td colSpan={7} className="py-8 text-center text-slate-400 font-semibold">
                              No submitted admission applications found. Click "+ New Application" above to enroll a student.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =================================================================== */}
          {/* VIEW: REPORT CARD REVIEW & SUBMISSION */}
          {/* =================================================================== */}
          {activeView === 'review_reports' && (
            <div className="space-y-4">
              {/* Class & Term Select Header */}
              <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <Award className="w-5 h-5 text-blue-600" />
                    Report Card Batch Review & Submission
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Select your assigned class to review student terminal reports, analyze academic performance, and submit reports to administration for vetting.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div>
                    <span className="text-xs font-bold text-slate-500 mr-2">Department:</span>
                    <select
                      value={selectedDepartment}
                      onChange={(e) => handleDepartmentChange(e.target.value)}
                      className="px-3 py-1.5 border border-slate-300 rounded text-xs font-bold text-slate-800 bg-white"
                    >
                      {departmentOptions.map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-500 mr-2">Class:</span>
                    <select
                      value={selectedClass}
                      onChange={(e) => setSelectedClass(e.target.value)}
                      className="px-3 py-1.5 border border-slate-300 rounded text-xs font-bold text-slate-800 bg-white"
                    >
                      {defaultClasses.map(cls => (
                        <option key={cls} value={cls}>{cls}</option>
                      ))}
                    </select>
                  </div>
                  <div className="bg-slate-50 px-3 py-1.5 rounded-md border border-slate-200 text-xs font-bold text-slate-700">
                    {academicYear} • {academicTerm}
                  </div>
                </div>
              </div>

              {/* Submission Workflow Controls Card */}
              <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-2xs">
                <div className="border-b border-slate-100 px-4 py-3 bg-slate-50/50 flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
                    Vetting & Broadcast Workflow Status
                  </span>
                  <div>
                    {(!currentBroadcast || currentBroadcast.status === 'Draft') && (
                      <span className="bg-slate-100 text-slate-800 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                        ● Draft Mode
                      </span>
                    )}
                    {currentBroadcast?.status === 'Submitted' && (
                      <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider animate-pulse">
                        ● Awaiting Admin Vetting
                      </span>
                    )}
                    {currentBroadcast?.status === 'Published' && (
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                        ● Published & Live
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-4 sm:p-5 space-y-4">
                  {(!currentBroadcast || currentBroadcast.status === 'Draft') ? (
                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
                      <div className="flex-1 max-w-2xl">
                        <h3 className="text-sm font-bold text-slate-900 mb-1">
                          Submit {selectedClass} Terminal Reports for Official Vetting
                        </h3>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          Your score entries, behavioral remarks, and attendance records are currently in <strong className="text-slate-700">Draft</strong>. When all student entries are fully completed, you must submit this class report batch to the Admin. 
                          <span className="block mt-1 font-semibold text-amber-700">
                            * Note: Submission will temporarily lock results entry for this class to prevent editing conflicts during headmaster review. Only admins can publish to the student portal.
                          </span>
                        </p>
                      </div>

                      <div className="w-full lg:w-96 space-y-3 shrink-0">
                        <div>
                          <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                            Submission Note to Admin (Optional)
                          </label>
                          <textarea
                            value={submissionNotes}
                            onChange={(e) => setSubmissionNotes(e.target.value)}
                            placeholder="Add remarks for headmaster vetting..."
                            rows={2}
                            className="w-full p-2 border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            const nextBroadcasts = [...broadcasts];
                            const existingIdx = nextBroadcasts.findIndex(b => b.className === selectedClass && b.academicYear === academicYear && b.term === academicTerm);
                            
                            // Calculate averages
                            let totalAvgSum = 0;
                            let studentsWithScores = 0;
                            classStudents.forEach(st => {
                              const rep = findCurrentReport(st.id, st.admissionNo);
                              if (rep?.scores && rep.scores.length > 0) {
                                const avg = rep.scores.reduce((sum, s) => sum + s.total, 0) / rep.scores.length;
                                totalAvgSum += avg;
                                studentsWithScores++;
                              }
                            });
                            const classAverage = studentsWithScores > 0 ? Math.round(totalAvgSum / studentsWithScores) : 65;

                            const updatedBroadcast: ClassReportBroadcast = {
                              id: currentBroadcast?.id || `broadcast-${selectedClass}-${academicYear}-${academicTerm}-${Date.now()}`,
                              className: selectedClass,
                              academicYear,
                              term: academicTerm,
                              isBroadcasted: false,
                              status: 'Submitted',
                              releaseNotes: submissionNotes || `Class report submitted by ${teacher.name} for headmaster vetting & broadcast.`,
                              totalStudentsCount: classStudents.length,
                              classAverage,
                              allowDownload: true
                            };

                            if (existingIdx >= 0) {
                              nextBroadcasts[existingIdx] = updatedBroadcast;
                            } else {
                              nextBroadcasts.push(updatedBroadcast);
                            }

                            if (onUpdateBroadcasts) {
                              onUpdateBroadcasts(nextBroadcasts);
                            }
                            setSubmissionNotes('');
                            showToast(`Successfully submitted ${selectedClass} report batch to Administration for vetting!`);
                          }}
                          className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-md shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <CheckSquare className="w-4 h-4" /> Submit Class Report to Admin
                        </button>
                      </div>
                    </div>
                  ) : currentBroadcast.status === 'Submitted' ? (
                    <div className="bg-amber-50/50 border border-amber-200 rounded-lg p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <h3 className="text-sm font-bold text-amber-900 flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                          Awaiting Administration Vetting & Publication
                        </h3>
                        <p className="text-xs text-amber-700 leading-relaxed max-w-2xl">
                          This terminal report batch was successfully submitted by <strong className="text-amber-900 font-extrabold">{teacher.name}</strong> to the headmaster/administrator for final review and verification. Results editing is currently locked. If you need to make corrections, you can recall this submission before publication.
                        </p>
                        {currentBroadcast.releaseNotes && (
                          <div className="text-[11px] text-amber-800 bg-amber-100/40 p-2 rounded border border-amber-200/50 mt-2">
                            <span className="font-bold">Submission Notes:</span> "{currentBroadcast.releaseNotes}"
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const nextBroadcasts = [...broadcasts];
                          const existingIdx = nextBroadcasts.findIndex(b => b.className === selectedClass && b.academicYear === academicYear && b.term === academicTerm);
                          if (existingIdx >= 0) {
                            nextBroadcasts[existingIdx] = {
                              ...nextBroadcasts[existingIdx],
                              status: 'Draft',
                              isBroadcasted: false
                            };
                            if (onUpdateBroadcasts) {
                              onUpdateBroadcasts(nextBroadcasts);
                            }
                            showToast(`Submission recalled. ${selectedClass} report card edits are now UNLOCKED!`);
                          }
                        }}
                        className="w-full sm:w-auto px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-xs rounded-md border border-amber-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-amber-700" /> Recall Submission
                      </button>
                    </div>
                  ) : (
                    <div className="bg-emerald-50/50 border border-emerald-200 rounded-lg p-4">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <h3 className="text-sm font-bold text-emerald-900 flex items-center gap-1.5">
                            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                            Class Report Cards Published & Live
                          </h3>
                          <p className="text-xs text-emerald-700 leading-relaxed max-w-2xl">
                            The Administrator has vetted and published this class report batch to the Student Portal. Reports are now active. Students and parents can access official grades and performance sheets. Result entry and modifications are locked.
                          </p>
                        </div>
                        <div className="bg-emerald-600 text-white font-bold text-xs px-3 py-1.5 rounded shadow-sm shrink-0 uppercase tracking-wider text-center">
                          Published
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Student Report Status List */}
              <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-2xs">
                <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Student Terminal Report Card Registry</h3>
                    <p className="text-[11px] text-slate-500">Preview and double-check each individual report card's design, remarks, and complete scores prior to administrative release.</p>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
                      <button
                        type="button"
                        onClick={() => setIsBulkEditMode(false)}
                        className={`px-3 py-1 rounded text-xs font-black transition-all flex items-center gap-1 cursor-pointer ${
                          !isBulkEditMode 
                            ? 'bg-white text-slate-900 shadow-2xs' 
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <FileText className="w-3.5 h-3.5" />
                        Registry List
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsBulkEditMode(true)}
                        className={`px-3 py-1 rounded text-xs font-black transition-all flex items-center gap-1 cursor-pointer ${
                          isBulkEditMode 
                            ? 'bg-white text-slate-900 shadow-2xs' 
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                        Bulk Edit Mode
                      </button>
                    </div>

                    {isBulkEditMode && (
                      <button
                        type="button"
                        onClick={handleSaveTerminalRemarks}
                        disabled={isSubmissionLocked}
                        className={`px-3 py-1 rounded text-xs font-black flex items-center gap-1 transition-all shadow-xs cursor-pointer ${
                          isSubmissionLocked
                            ? 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                      >
                        <Save className="w-3.5 h-3.5" />
                        Save All
                      </button>
                    )}

                    <span className="text-xs font-extrabold text-blue-800 bg-blue-50 px-2.5 py-1 rounded border border-blue-200">
                      Total: {classStudents.length}
                    </span>
                  </div>
                </div>

                {!isBulkEditMode ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                          <th className="py-3 px-4 text-center w-12">#</th>
                          <th className="py-3 px-4">Student Name</th>
                          <th className="py-3 px-4">Admission No</th>
                          <th className="py-3 px-4 text-center">Subjects Entered</th>
                          <th className="py-3 px-4 text-center">Average Score</th>
                          <th className="py-3 px-4">General Teacher Comment</th>
                          <th className="py-3 px-4 text-right pr-6">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                        {classStudents.map((st, idx) => {
                          const report = findCurrentReport(st.id, st.admissionNo);
                          const subjectsCount = report?.scores?.length || 0;
                          
                          let totalSum = 0;
                          let avgScore = 0;
                          let gradeStr = '-';
                          if (report?.scores && report.scores.length > 0) {
                            totalSum = report.scores.reduce((sum, s) => sum + s.total, 0);
                            avgScore = Math.round(totalSum / report.scores.length);
                            gradeStr = calculateGrade(avgScore).grade;
                          } else {
                            const sc = subjectScores[st.id] || { classScore: 0, examScore: 0 };
                            avgScore = sc.classScore + sc.examScore;
                            gradeStr = calculateGrade(avgScore).grade;
                          }

                          return (
                            <tr key={st.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-3.5 px-4 text-center text-slate-400 font-mono font-bold">
                                {idx + 1}
                              </td>
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-2.5">
                                  <img
                                    src={st.photo || "https://images.unsplash.com/photo-1544717305-2782549b5136?w=150"}
                                    alt={st.fullName}
                                    className="w-7 h-7 rounded-full object-cover border border-slate-200 shrink-0"
                                  />
                                  <span className="font-extrabold text-slate-900">{st.fullName}</span>
                                </div>
                              </td>
                              <td className="py-3.5 px-4 font-mono font-bold text-slate-500">
                                {st.admissionNo}
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                <span className={`px-2 py-0.5 rounded font-black text-[10px] ${
                                  subjectsCount >= 5 
                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                                    : (subjectsCount > 0 ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-red-50 text-red-800 border border-red-200')
                                }`}>
                                  {subjectsCount} subjects
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-center font-mono">
                                <div className="flex flex-col items-center justify-center">
                                  <span className="font-extrabold text-slate-950">{avgScore}%</span>
                                  <span className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Grade: {gradeStr}</span>
                                </div>
                              </td>
                              <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate" title={report?.teacherComment}>
                                {report?.teacherComment || <span className="text-red-400 italic font-normal">Pending comment entry</span>}
                              </td>
                              <td className="py-3.5 px-4 text-right pr-6">
                                <button
                                  type="button"
                                  onClick={() => setReviewingStudent(st)}
                                  className="px-3 py-1 bg-slate-100 hover:bg-blue-50 text-blue-700 hover:text-blue-900 rounded font-black text-xs border border-slate-200 hover:border-blue-300 flex items-center gap-1.5 ml-auto transition-colors cursor-pointer"
                                >
                                  <Search className="w-3.5 h-3.5" /> Review Card
                                </button>
                              </td>
                            </tr>
                          );
                        })}

                        {classStudents.length === 0 && (
                          <tr>
                            <td colSpan={7} className="py-10 text-center font-bold text-slate-400 italic">
                              No students enrolled in {selectedClass} yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs min-w-[1200px]">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                          <th className="py-3 px-3 text-center w-12">#</th>
                          <th className="py-3 px-3 w-48">Student Name</th>
                          <th className="py-3 px-3 w-24 text-center">Attd (Pres)</th>
                          <th className="py-3 px-3 w-48">Conduct</th>
                          <th className="py-3 px-3 w-48">Attitude</th>
                          <th className="py-3 px-3 w-48">Interest / Talent</th>
                          <th className="py-3 px-3 w-64">Class Teacher Comment</th>
                          <th className="py-3 px-3 w-36">Promotion</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                        {classStudents.map((st, idx) => {
                          const report = findCurrentReport(st.id, st.admissionNo);
                          const val = terminalRemarks[st.id] || {
                            conduct: 'Excellent, respectful & highly disciplined',
                            attitude: 'Very attentive, diligent & hardworking',
                            interest: 'Reading, Creative Arts & ICT',
                            teacherComment: 'An outstanding academic performance! Keep maintaining this brilliant standard.',
                            attendancePresent: 66,
                            promotionDecision: 'Promoted'
                          };

                          const handleUpdateBulkField = (field: string, value: any) => {
                            setTerminalRemarks(prev => ({
                              ...prev,
                              [st.id]: {
                                ...(prev[st.id] || {
                                  conduct: 'Excellent, respectful & highly disciplined',
                                  attitude: 'Very attentive, diligent & hardworking',
                                  interest: 'Reading, Creative Arts & ICT',
                                  teacherComment: 'An outstanding academic performance! Keep maintaining this brilliant standard.',
                                  attendancePresent: 66,
                                  promotionDecision: 'Promoted'
                                }),
                                [field]: value
                              }
                            }));
                          };

                          return (
                            <tr key={st.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-3 px-3 text-center text-slate-400 font-mono font-bold">
                                {idx + 1}
                              </td>
                              <td className="py-3 px-3">
                                <span className="font-extrabold text-slate-900 block truncate" title={st.fullName}>
                                  {st.fullName}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono block">{st.admissionNo}</span>
                              </td>
                              <td className="py-3 px-3">
                                <input
                                  type="number"
                                  min={0}
                                  max={70}
                                  value={val.attendancePresent}
                                  disabled={isSubmissionLocked}
                                  onChange={(e) => handleUpdateBulkField('attendancePresent', parseInt(e.target.value) || 0)}
                                  className="w-full px-2 py-1 text-xs border border-slate-200 rounded font-mono font-bold text-center focus:ring-1 focus:ring-blue-500 bg-white"
                                />
                              </td>
                              <td className="py-3 px-3">
                                <select
                                  value={val.conduct}
                                  disabled={isSubmissionLocked}
                                  onChange={(e) => handleUpdateBulkField('conduct', e.target.value)}
                                  className="w-full px-2 py-1 text-[11px] border border-slate-200 rounded font-medium focus:ring-1 focus:ring-blue-500 bg-white"
                                >
                                  {SELECTIVE_CONDUCT_PRESETS.map((p, pIdx) => (
                                    <option key={pIdx} value={p}>{p}</option>
                                  ))}
                                </select>
                              </td>
                              <td className="py-3 px-3">
                                <select
                                  value={val.attitude}
                                  disabled={isSubmissionLocked}
                                  onChange={(e) => handleUpdateBulkField('attitude', e.target.value)}
                                  className="w-full px-2 py-1 text-[11px] border border-slate-200 rounded font-medium focus:ring-1 focus:ring-blue-500 bg-white"
                                >
                                  {SELECTIVE_ATTITUDE_PRESETS.map((p, pIdx) => (
                                    <option key={pIdx} value={p}>{p}</option>
                                  ))}
                                </select>
                              </td>
                              <td className="py-3 px-3">
                                <select
                                  value={val.interest}
                                  disabled={isSubmissionLocked}
                                  onChange={(e) => handleUpdateBulkField('interest', e.target.value)}
                                  className="w-full px-2 py-1 text-[11px] border border-slate-200 rounded font-medium focus:ring-1 focus:ring-blue-500 bg-white"
                                >
                                  {SELECTIVE_INTEREST_PRESETS.map((p, pIdx) => (
                                    <option key={pIdx} value={p}>{p}</option>
                                  ))}
                                </select>
                              </td>
                              <td className="py-3 px-3">
                                <input
                                  type="text"
                                  value={val.teacherComment}
                                  disabled={isSubmissionLocked}
                                  onChange={(e) => handleUpdateBulkField('teacherComment', e.target.value)}
                                  className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:ring-1 focus:ring-blue-500 bg-white font-medium animate-fadeIn"
                                  placeholder="Write custom comment..."
                                />
                              </td>
                              <td className="py-3 px-3">
                                <select
                                  value={val.promotionDecision || 'Promoted'}
                                  disabled={isSubmissionLocked}
                                  onChange={(e) => handleUpdateBulkField('promotionDecision', e.target.value)}
                                  className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:ring-1 focus:ring-blue-500 bg-white font-bold"
                                >
                                  <option value="Promoted">Promoted</option>
                                  <option value="Repeated">Repeated</option>
                                  <option value="On Probation">On Probation</option>
                                  <option value="Advanced">Advanced</option>
                                </select>
                              </td>
                            </tr>
                          );
                        })}

                        {classStudents.length === 0 && (
                          <tr>
                            <td colSpan={8} className="py-10 text-center font-bold text-slate-400 italic">
                              No students enrolled in {selectedClass} yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Report Card Preview Modal Overlay */}
              {reviewingStudent && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
                  <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                    {/* Modal Title & Actions Header */}
                    <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between shrink-0">
                      <div className="flex items-center gap-2">
                        <Award className="w-5 h-5 text-amber-400" />
                        <div>
                          <h3 className="font-extrabold text-sm tracking-tight uppercase">
                            Official Report Card Preview (Read-Only)
                          </h3>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Teacher: {teacher.name} • Class: {reviewingStudent.className}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            window.print();
                          }}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" /> Print Draft
                        </button>
                        <button
                          type="button"
                          onClick={() => setReviewingStudent(null)}
                          className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-880 transition-colors cursor-pointer"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    {/* Report Card Printable Canvas */}
                    <div className="p-6 sm:p-8 overflow-y-auto flex-1 space-y-6 text-xs text-slate-800 select-text" id="printable-report-card">
                      {/* Crest & Header Layout */}
                      <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left justify-between gap-4 border-b-2 border-slate-950 pb-5">
                        <div className="flex items-center gap-3">
                          <JIPASLogo size="lg" rounded={false} className="shrink-0 drop-shadow-sm" />
                          <div>
                            <h1 className="text-lg font-black text-slate-950 uppercase tracking-tight leading-tight">
                              Junior High Portal Academic System
                            </h1>
                            <p className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">
                              the region Education Service (GES) Approved Curriculum
                            </p>
                            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                              Email: admin@jipas-edu.gh • Tel: +233 (0) 544 123 456
                            </p>
                          </div>
                        </div>

                        <div className="text-center sm:text-right">
                          <span className="inline-block bg-blue-900 text-white font-mono font-black text-xs px-3 py-1 rounded border border-slate-950">
                            TERMINAL REPORT CARD
                          </span>
                          <div className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mt-2">
                            Academic Year: {academicYear}
                          </div>
                          <div className="text-[11px] font-black text-slate-900 mt-0.5">
                            {academicTerm} (GES Standard)
                          </div>
                        </div>
                      </div>

                      {/* Student details grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
                        <div>
                          <span className="block text-[9px] font-black uppercase text-slate-400">Student Name</span>
                          <span className="font-extrabold text-slate-950 text-sm leading-tight block mt-0.5">{reviewingStudent?.fullName || reviewingStudent?.name || 'Student'}</span>
                        </div>
                        <div>
                          <span className="block text-[9px] font-black uppercase text-slate-400">Admission Number</span>
                          <span className="font-bold text-slate-950 mt-0.5 block font-mono">{reviewingStudent?.admissionNo || ''}</span>
                        </div>
                        <div>
                          <span className="block text-[9px] font-black uppercase text-slate-400">Class Enrolled</span>
                          <span className="font-bold text-slate-950 mt-0.5 block">{reviewingStudent.className}</span>
                        </div>
                        <div>
                          <span className="block text-[9px] font-black uppercase text-slate-400">Attendance</span>
                          <span className="font-bold text-slate-950 mt-0.5 block">
                            {findCurrentReport(reviewingStudent.id, reviewingStudent.admissionNo)?.attendancePresent ?? 0} / {findCurrentReport(reviewingStudent.id, reviewingStudent.admissionNo)?.attendanceTotal ?? 0} days
                          </span>
                        </div>
                      </div>

                      {/* Performance Scores Table */}
                      <div className="space-y-2">
                        <span className="text-xs font-black uppercase tracking-wider text-slate-900 block border-l-4 border-slate-950 pl-2">
                          Academic Subject Performance Sheet
                        </span>
                        
                        <div className="border-2 border-slate-950 overflow-hidden rounded-md">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-slate-950 text-white font-bold uppercase text-[9px] tracking-wider divide-x divide-slate-800">
                                <th className="py-2 px-3 w-40">Subject Name</th>
                                <th className="py-2 px-3 text-center w-24">Class Score (40%)</th>
                                <th className="py-2 px-3 text-center w-24">Exam Score (60%)</th>
                                <th className="py-2 px-3 text-center w-24">Total Score (100%)</th>
                                <th className="py-2 px-3 text-center w-16">Grade</th>
                                <th className="py-2 px-3 text-center w-16">Position</th>
                                <th className="py-2 px-3">Subject Remarks</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-300 font-semibold text-slate-800 border-t border-slate-950">
                              {(() => {
                                const rep = reports.find(r => (r.studentId === reviewingStudent.id || r.admissionNo === reviewingStudent.admissionNo) && r.term === academicTerm && r.academicYear === academicYear);
                                return rep?.scores && rep.scores.length > 0 ? (
                                  rep.scores.map((sc, index) => {
                                    return (
                                      <tr key={index} className="divide-x divide-slate-300 hover:bg-slate-50 transition-colors">
                                        <td className="py-2 px-3 font-bold text-slate-900">
                                          {sc.subject}
                                        </td>
                                        <td className="py-2 px-3 text-center font-mono font-bold">
                                          {sc.classScore}
                                        </td>
                                        <td className="py-2 px-3 text-center font-mono font-bold">
                                          {sc.examScore}
                                        </td>
                                        <td className="py-2 px-3 text-center font-mono font-bold bg-slate-100 text-slate-950">
                                          {sc.total}
                                        </td>
                                        <td className="py-2 px-3 text-center font-mono font-extrabold text-blue-900">
                                          {sc.grade}
                                        </td>
                                        <td className="py-2 px-3 text-center font-mono">
                                          {index + 1}
                                        </td>
                                        <td className="py-2 px-3 text-slate-600 font-medium italic">
                                          {sc.remark}
                                        </td>
                                      </tr>
                                    );
                                  })
                                ) : (
                                  <tr>
                                    <td colSpan={7} className="py-6 text-center font-bold text-amber-700 bg-amber-50 italic">
                                      No subject grades have been officially entered or saved for this student yet.
                                    </td>
                                  </tr>
                                );
                              })()}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Character and General Remarks Card */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-200 pt-5">
                        <div className="space-y-3 bg-slate-50 p-4 rounded-lg border border-slate-200">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                            Behavioral & Conduct Assessments
                          </span>
                          <div className="space-y-2 text-xs">
                            {(() => {
                              const rep = reports.find(r => (r.studentId === reviewingStudent.id || r.admissionNo === reviewingStudent.admissionNo) && r.term === academicTerm && r.academicYear === academicYear);
                              return (
                                <>
                                  <div className="flex justify-between border-b border-slate-200 pb-1.5">
                                    <span className="text-slate-500">General Conduct:</span>
                                    <strong className="text-slate-950">{rep?.conduct || 'Good & disciplined'}</strong>
                                  </div>
                                  <div className="flex justify-between border-b border-slate-200 pb-1.5">
                                    <span className="text-slate-500">Attitude to Studies:</span>
                                    <strong className="text-slate-950">{rep?.attitude || 'Very attentive & hardworking'}</strong>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-500">Co-curricular Interest:</span>
                                    <strong className="text-slate-950">{rep?.interest || 'Reading & Sports'}</strong>
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                        </div>

                        <div className="space-y-3 bg-slate-50 p-4 rounded-lg border border-slate-200">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                            Form Teacher & Administration Remarks
                          </span>
                          <div className="space-y-2 text-xs">
                            {(() => {
                              const rep = findCurrentReport(reviewingStudent.id, reviewingStudent.admissionNo);
                              return (
                                <>
                                  <div>
                                    <span className="text-slate-500 block">Form Teacher's Remarks:</span>
                                    <strong className="text-slate-950 block mt-1 italic font-medium">
                                      "{rep?.teacherComment || 'Satisfactory work. Shows great potential for excellence.'}"
                                    </strong>
                                  </div>
                                  {rep?.promotionStatus && (
                                    <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                                      <span className="text-slate-500">Promotion Decision:</span>
                                      <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-black uppercase">
                                        {rep.promotionStatus}
                                      </span>
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      </div>

                      {/* Signatures Row */}
                      <div className="grid grid-cols-3 gap-6 pt-10 text-center text-[10px]">
                        <div>
                          <div className="h-10 border-b border-slate-950 flex items-end justify-center font-bold text-slate-600 font-serif italic">
                            {teacher.name}
                          </div>
                          <span className="block uppercase font-black text-slate-400 tracking-wider mt-1.5">Class Form Teacher</span>
                        </div>
                        <div>
                          <div className="h-10 border-b border-slate-950 flex items-end justify-center font-bold text-slate-600">
                            {currentBroadcast?.status === 'Published' ? (
                              <span className="font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300">
                                ✓ OFFICIAL RELEASE
                              </span>
                            ) : (
                              <span className="text-amber-600 text-[9px] font-bold italic">
                                [Awaiting Vetting Release]
                              </span>
                            )}
                          </div>
                          <span className="block uppercase font-black text-slate-400 tracking-wider mt-1.5">Release Status</span>
                        </div>
                        <div>
                          <div className="h-10 border-b border-slate-950 flex items-end justify-center font-bold text-slate-400">
                            {currentBroadcast?.status === 'Published' ? 'Approved & Signed' : 'Pending Verification'}
                          </div>
                          <span className="block uppercase font-black text-slate-400 tracking-wider mt-1.5">Headmaster / Principal</span>
                        </div>
                      </div>
                    </div>

                    {/* Modal Bottom Close */}
                    <div className="bg-slate-50 border-t border-slate-200 p-4 flex items-center justify-end gap-2 shrink-0">
                      <span className="text-xs text-slate-500 font-medium mr-auto">
                        * Note: This is an internal review preview. Student access is disabled until official broadcast.
                      </span>
                      <button
                        type="button"
                        onClick={() => setReviewingStudent(null)}
                        className="px-5 py-2 bg-slate-900 hover:bg-slate-850 text-white rounded font-extrabold text-xs tracking-tight transition-colors cursor-pointer"
                      >
                        Close Preview
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =================================================================== */}
          {/* VIEW 4: MY PROFILE */}
          {/* =================================================================== */}
          {activeView === 'profile' && (
            <div className="max-w-3xl mx-auto space-y-4">
              <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-2xs">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 border-b border-slate-100 pb-5">
                  <div className="w-20 h-20 rounded-full bg-blue-600 text-white flex items-center justify-center text-3xl font-black shadow-sm shrink-0">
                    <User className="w-10 h-10" />
                  </div>
                  <div className="text-center sm:text-left flex-1">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">
                        Active Teacher
                      </span>
                      <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded">
                        Rank: {teacher.rank}
                      </span>
                    </div>
                    <h2 className="text-2xl font-black text-slate-900">{teacher.name}</h2>
                    <p className="text-xs text-slate-500 font-semibold mt-0.5">
                      {teacher.designation} • Staff ID: {teacher.id}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-5">
                  <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                    <span className="block text-[10px] font-bold uppercase text-slate-400">Email Address</span>
                    <span className="font-bold text-slate-800">{teacher.email}</span>
                  </div>
                  <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                    <span className="block text-[10px] font-bold uppercase text-slate-400">Phone Number</span>
                    <span className="font-bold text-slate-800">{teacher.phone}</span>
                  </div>
                  <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                    <span className="block text-[10px] font-bold uppercase text-slate-400">Academic Qualification</span>
                    <span className="font-bold text-slate-800">{teacher.academicQualification}</span>
                  </div>
                  <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                    <span className="block text-[10px] font-bold uppercase text-slate-400">Professional Qualification</span>
                    <span className="font-bold text-slate-800">{teacher.professionalQualification}</span>
                  </div>
                  <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 sm:col-span-2">
                    <span className="block text-[10px] font-bold uppercase text-slate-400">Assigned Classes</span>
                    <span className="font-bold text-slate-800">{teacher?.classesTaught?.join(', ') || defaultClasses.join(', ')}</span>
                  </div>
                  <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 sm:col-span-2">
                    <span className="block text-[10px] font-bold uppercase text-slate-400">Teaching Subjects</span>
                    <span className="font-bold text-slate-800">{defaultSubjects.join(', ')}</span>
                  </div>
                </div>

                {/* Auto-Provisioned Portal Account & Credential Edit Privilege */}
                <div className="mt-6 pt-6 border-t border-slate-200 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
                        <KeyRound className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">Portal Login Credentials & Security</h4>
                        <p className="text-[11px] text-slate-500">
                          Auto-provisioned portal account. You have the privilege to edit your login details with Administrator approval.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleOpenEditLoginModal}
                      className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer w-fit"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Request Login Update
                    </button>
                  </div>

                  {loginReqToast && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{loginReqToast}</span>
                    </div>
                  )}

                  {/* Active credentials preview */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <span className="block text-[10px] font-bold uppercase text-slate-400">Portal Username</span>
                      <span className="font-mono font-bold text-slate-800 text-xs">{userAccount?.username || teacher.id}</span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <span className="block text-[10px] font-bold uppercase text-slate-400">Official Portal Email</span>
                      <span className="font-bold text-slate-800 text-xs truncate block">{userAccount?.email || teacher.email || 'None'}</span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <span className="block text-[10px] font-bold uppercase text-slate-400">Account Provisioning</span>
                      <span className="inline-flex items-center gap-1 font-bold text-emerald-700 text-xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Auto-Provisioned
                      </span>
                    </div>
                  </div>

                  {/* Recent Login Requests History / Status */}
                  {staffLoginRequests.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <span className="block text-[11px] font-bold text-slate-600">Your Login Detail Update Requests:</span>
                      <div className="space-y-2">
                        {staffLoginRequests.map((req) => (
                          <div
                            key={req.id}
                            className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                              req.status === 'Pending'
                                ? 'bg-amber-50/60 border-amber-200 text-amber-900'
                                : req.status === 'Approved'
                                ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                                : 'bg-rose-50/60 border-rose-200 text-rose-900'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold">
                                {req.status === 'Pending' && '⏳ Update Request Pending Approval'}
                                {req.status === 'Approved' && '✓ Update Approved & Applied'}
                                {req.status === 'Rejected' && '✗ Update Declined by Admin'}
                              </span>
                              <span className="text-[10px] opacity-75">
                                {new Date(req.requestedAt).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="text-[11px] space-y-0.5 opacity-90">
                              {req.requestedUsername && <div>• Requested Username: <strong>{req.requestedUsername}</strong></div>}
                              {req.requestedEmail && <div>• Requested Email: <strong>{req.requestedEmail}</strong></div>}
                              {req.requestedPhone && <div>• Requested Phone: <strong>{req.requestedPhone}</strong></div>}
                              {req.requestedPassword && <div>• Password Change Requested</div>}
                              <div>• Reason: <em>"{req.reason}"</em></div>
                              {req.adminFeedback && (
                                <div className="font-semibold text-rose-700 mt-1">Admin Feedback: "{req.adminFeedback}"</div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* VIEW 5: CHANGE PASSWORD */}
          {/* =================================================================== */}
          {activeView === 'change_password' && (
            <div className="max-w-xl mx-auto space-y-4">
              <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-2xs">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-4">
                  <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg">
                    <KeyRound className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Change Account Password</h2>
                    <p className="text-xs text-slate-500">Update your teacher portal credentials securely.</p>
                  </div>
                </div>

                {passwordToast && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-bold flex items-center gap-2 mb-4">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Password updated successfully! Your account is secure.</span>
                  </div>
                )}

                {passwordError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-xs font-bold flex items-center gap-2 mb-4">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <span>{passwordError}</span>
                  </div>
                )}

                <form onSubmit={handlePasswordSubmit} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Current Password *</label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                      className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">New Password *</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password (min. 6 chars)"
                      className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Confirm New Password *</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      className="w-full py-2.5 bg-[#ffc107] hover:bg-amber-500 text-slate-900 font-bold rounded-md transition-colors shadow-2xs cursor-pointer text-xs flex items-center justify-center gap-2"
                    >
                      <KeyRound className="w-4 h-4 text-slate-900" /> Update Password
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* VIEW 7: EXAM TIMETABLE & SCHEDULE */}
          {/* =================================================================== */}
          {activeView === 'exam_timetable' && (
            <div className="space-y-4">
              <ExamTimetableManager
                classes={classes || []}
                subjects={subjects || []}
                currentUserRole="teacher"
                currentUserName={teacher.name}
              />
            </div>
          )}
          {activeView === 'backup_recovery' && (
            <div className="space-y-4">
              <BackupRecoveryManager
                students={students}
                teachers={teachers}
                reports={reports}
                bills={bills}
                payments={payments}
                calendarEvents={calendarEvents}
                notifications={notifications}
                onRestoreData={onRestoreData}
              />
            </div>
          )}

          {activeView === 'scan_entrance_qr' && (
            <div className="space-y-4">
              <StaffAttendanceQRScanner teacher={teacher} />
            </div>
          )}

          {activeView === 'my_attendance' && (
            <div className="space-y-4">
              <MyPersonalAttendanceLogsView teacherId={teacher.id} />
            </div>
          )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* EDIT AUTO-PROVISIONED LOGIN DETAILS REQUEST MODAL */}
      {showEditLoginModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Request Portal Login Details Update</h3>
                  <p className="text-[11px] text-slate-500">Requires Administrator review & approval.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEditLoginModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitStaffLoginRequest} className="space-y-3.5 text-xs">
              <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl text-indigo-900 text-[11px] leading-relaxed">
                Staff accounts are auto-provisioned by administration. You can propose updates to your username, email, phone number, or password below. Once approved by the Admin, your login credentials will be updated immediately.
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Requested Username / Login ID
                </label>
                <input
                  type="text"
                  value={editReqUsername}
                  onChange={(e) => setEditReqUsername(e.target.value)}
                  placeholder="e.g. k.asante"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-[10px] text-slate-400">Current: {userAccount?.username || teacher.id}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Official Email Address
                  </label>
                  <input
                    type="email"
                    value={editReqEmail}
                    onChange={(e) => setEditReqEmail(e.target.value)}
                    placeholder="e.g. teacher@jipas.edu.gh"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={editReqPhone}
                    onChange={(e) => setEditReqPhone(e.target.value)}
                    placeholder="e.g. 0244123456"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  New Password <span className="text-slate-400 font-normal">(Leave blank to keep current)</span>
                </label>
                <input
                  type="password"
                  value={editReqPassword}
                  onChange={(e) => setEditReqPassword(e.target.value)}
                  placeholder="Enter new desired password (min. 6 characters)"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Reason for Update Request <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={editReqReason}
                  onChange={(e) => setEditReqReason(e.target.value)}
                  rows={2}
                  required
                  placeholder="e.g. Correcting typo in official email / updated phone contact."
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditLoginModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEditReq}
                  className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  {isSubmittingEditReq ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


    </div>
  );
}

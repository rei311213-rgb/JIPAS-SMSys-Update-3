import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, Users, UserCheck, School, TrendingUp, AlertTriangle, 
  DollarSign, PieChart as PieIcon, Activity, BarChart3,
  Calendar, Award, BookOpen, GraduationCap, Briefcase,
  FileText, Shield, Search, CheckCircle, AlertCircle, 
  ArrowUpRight, Settings, UserCog, ClipboardCheck, MessageSquare, 
  KeyRound, Layers, Building2, Bookmark, Send, Eye, History, 
  RefreshCw, CheckCircle2, Mail, Clock, LogOut, Printer, Wallet, 
  ChevronRight, ChevronDown, 
  MessageCircle, Database, Trash2, X, Sparkles, Palette, Download, Menu,
  ShieldAlert, Trophy, Grid, ArrowLeft, ExternalLink, Lock, Scale
} from 'lucide-react';
import { 
  Student, Teacher, TermReport, StudentBill, PaymentRecord, CalendarEvent, NotificationItem, LoginLog,
  AcademicYearItem, TermItem, DepartmentItem, ClassItem, HouseItem, SubjectItem, ClassFeeTariffItem,
  ClassReportBroadcast, ThemePaletteConfig, CourseItem, DEFAULT_CEO_PRIVILEGES, CeoPrivilegesConfig
} from '../types';
import ExecutiveDashboard from './ceo/ExecutiveDashboard';
import ExecutiveReports from './ceo/ExecutiveReports';
import ConsolidatedExecutiveReport from './ceo/ConsolidatedExecutiveReport';
import ExecutiveAlertFeed from './ceo/ExecutiveAlertFeed';
import TopPerformingClasses from './ceo/TopPerformingClasses';
import StudentManager from './admin/StudentManager';
import TeacherManager from './admin/TeacherManager';
import FeeManager from './admin/FeeManager';
import AttendanceManager from './admin/AttendanceManager';
import DisciplineTracker from './admin/DisciplineTracker';
import AcademicSetupManager from './AcademicSetupManager';
import ExpenseManager from './common/ExpenseManager';
import PerformanceOverview from './admin/PerformanceOverview';
import FinancialReconciliationDashboard from './admin/FinancialReconciliationDashboard';
import GraduatedBatchManager from './common/GraduatedBatchManager';
import PastEmployeeHistoryManager from './common/PastEmployeeHistoryManager';
import JIPASLogo from './common/JIPASLogo';
import CampusSelector from './common/CampusSelector';
import { getStoredExpenses } from '../services/storageService';
import { filterExpensesByCampus } from '../lib/campusUtils';
import { addMoney, subtractMoney, formatCurrency } from '../utils/financeUtils';

interface CEOPortalProps {
  currentUser: any;
  students: Student[];
  teachers: Teacher[];
  reports: TermReport[];
  bills: StudentBill[];
  payments: PaymentRecord[];
  calendarEvents: CalendarEvent[];
  notifications: NotificationItem[];
  academicYears: AcademicYearItem[];
  terms: TermItem[];
  departments: DepartmentItem[];
  classes: ClassItem[];
  houses: HouseItem[];
  subjects: SubjectItem[];
  onLogout: () => void;
}

const VALID_CEO_MODULES = new Set([
  'dashboard', 'reports', 'executive_report', 'alert_feed', 'class_rankings', 'school_overview', 'students', 'teachers', 
  'attendance', 'staff_attendance', 'discipline',
  'academic_performance', 'performance_analytics', 'school_finances',
  'fees_payments', 'expenses', 'income_expenses', 'financial_trends', 'financial_reconciliation', 'staff_queries',
  'graduated_batches', 'graduated_batch_registry', 'employee_history', 'past_employees'
]);

export default function CEOPortal({
  currentUser,
  students: propStudents,
  teachers: propTeachers,
  reports,
  bills: propBills,
  payments: propPayments,
  calendarEvents,
  notifications,
  academicYears,
  terms,
  departments,
  classes,
  houses,
  subjects,
  onLogout
}: CEOPortalProps) {
  const privileges: CeoPrivilegesConfig = currentUser?.ceoPrivileges || DEFAULT_CEO_PRIVILEGES;
  const executiveTitle = currentUser?.executiveTitle || (currentUser?.role === 'director' ? 'Executive Board Director' : 'School Proprietor (CEO)');

  // Multi-campus multi-campus state and shadow filters
  const [selectedCampus, setSelectedCampus] = useState<'General' | 'JIPAS 1' | 'JIPAS 2'>(() => {
    const saved = localStorage.getItem('jipas_active_campus') || localStorage.getItem('jipas_selected_campus');
    return (saved as any) || 'General';
  });

  useEffect(() => {
    const handleEvent = () => {
      const active = (localStorage.getItem('jipas_active_campus') as any) || (localStorage.getItem('jipas_selected_campus') as any) || 'General';
      setSelectedCampus(active);
    };
    window.addEventListener('jipas_campus_changed', handleEvent);
    return () => window.removeEventListener('jipas_campus_changed', handleEvent);
  }, []);

  const handleCampusChange = (campus: 'General' | 'JIPAS 1' | 'JIPAS 2') => {
    setSelectedCampus(campus);
    localStorage.setItem('jipas_active_campus', campus);
    localStorage.setItem('jipas_selected_campus', campus);
    window.dispatchEvent(new Event('jipas_campus_changed'));
  };

  const students = useMemo(() => {
    if (selectedCampus === 'General') return propStudents;
    return propStudents.filter(s => (s.campus || 'JIPAS 1') === selectedCampus);
  }, [propStudents, selectedCampus]);

  const teachers = useMemo(() => {
    if (selectedCampus === 'General') return propTeachers;
    return propTeachers.filter(t => (t.campus || 'JIPAS 1') === selectedCampus);
  }, [propTeachers, selectedCampus]);

  const validStudentIds = useMemo(() => new Set(propStudents.map(s => s.id)), [propStudents]);
  const validAdmissionNos = useMemo(() => new Set(propStudents.map(s => (s.admissionNo || '').toLowerCase().trim()).filter(Boolean)), [propStudents]);

  const bills = useMemo(() => {
    const active = propBills.filter(b => validStudentIds.has(b.studentId) || (b.admissionNo && validAdmissionNos.has(b.admissionNo.toLowerCase().trim())));
    if (selectedCampus === 'General') return active;
    return active.filter(b => {
      const student = propStudents.find(s => s.id === b.studentId || (b.admissionNo && s.admissionNo === b.admissionNo));
      return (student?.campus || 'JIPAS 1') === selectedCampus;
    });
  }, [propBills, propStudents, selectedCampus, validStudentIds, validAdmissionNos]);

  const payments = useMemo(() => {
    const active = propPayments.filter(p => validStudentIds.has(p.studentId) || (p.admissionNo && validAdmissionNos.has(p.admissionNo.toLowerCase().trim())));
    if (selectedCampus === 'General') return active;
    return active.filter(p => {
      const student = propStudents.find(s => s.id === p.studentId || (p.admissionNo && s.admissionNo === p.admissionNo));
      return (student?.campus || 'JIPAS 1') === selectedCampus;
    });
  }, [propPayments, propStudents, selectedCampus, validStudentIds, validAdmissionNos]);

  const [activeModule, setActiveModule] = useState<string>(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash && VALID_CEO_MODULES.has(hash)) return hash;
    return 'dashboard';
  });

  const [isThumbnailModalOpen, setIsThumbnailModalOpen] = useState(false);

  useEffect(() => {
    window.location.hash = activeModule;
  }, [activeModule]);

  const handleNavigate = (mod: string) => {
    setActiveModule(mod);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Executive Query State
  const [queriesList, setQueriesList] = useState<Array<{
    id: string;
    date: string;
    time: string;
    recipientRole: string;
    subject: string;
    message: string;
    urgency: string;
    sender: string;
    status: string;
  }>>([
    {
      id: 'query-101',
      date: '2026-09-20',
      time: '09:30 AM',
      recipientRole: 'Headteacher',
      subject: 'Audit Query: Basic 2 Term 3 Attendance Discrepancy',
      message: 'Please provide formal clarification regarding the 12% attendance dip logged in Basic 2 B during the week of Sept 10.',
      urgency: 'Priority',
      sender: 'Dr. Kwame Mensah (CEO)',
      status: 'Acknowledged'
    },
    {
      id: 'query-102',
      date: '2026-09-18',
      time: '02:15 PM',
      recipientRole: 'Accountant',
      subject: 'Financial Query: GWCL Water Utility Voucher VCH-2026-001',
      message: 'Kindly submit the breakdown and receipt for GWCL utility payment.',
      urgency: 'Routine',
      sender: 'Dr. Kwame Mensah (CEO)',
      status: 'Resolved'
    }
  ]);

  const [queryTargetRole, setQueryTargetRole] = useState('Headteacher');
  const [querySubject, setQuerySubject] = useState('');
  const [queryMessage, setQueryMessage] = useState('');
  const [queryUrgency, setQueryUrgency] = useState<'Routine' | 'Priority' | 'Critical'>('Routine');
  const [queryToast, setQueryToast] = useState<string | null>(null);

  const handleSendExecutiveQuery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!querySubject.trim() || !queryMessage.trim()) return;

    const newQuery = {
      id: `query-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      recipientRole: queryTargetRole,
      subject: querySubject,
      message: queryMessage,
      urgency: queryUrgency,
      sender: 'Dr. Kwame Mensah (CEO)',
      status: 'Pending Response'
    };

    setQueriesList(prev => [newQuery, ...prev]);
    setQuerySubject('');
    setQueryMessage('');
    setQueryToast(`Executive query successfully dispatched to ${queryTargetRole}!`);
    setTimeout(() => setQueryToast(null), 4000);
  };

  // Check if current active module is allowed
  const isModuleAllowed = (mod: string): boolean => {
    if (mod === 'dashboard') return true;
    if (mod === 'executive_report') return privileges.canViewConsolidatedExecutiveReport ?? true;
    if (mod === 'alert_feed') return privileges.canReceiveExecutiveAlerts ?? true;
    if (mod === 'reports') return privileges.canViewAcademicReports ?? true;
    if (mod === 'school_overview') return true;
    if (mod === 'students') return privileges.canViewStudentDirectory ?? true;
    if (mod === 'teachers') return privileges.canViewStaffDirectory ?? true;
    if (mod === 'attendance') return true;
    if (mod === 'staff_attendance') return privileges.canViewStaffAttendance ?? true;
    if (mod === 'discipline') return privileges.canViewDisciplineLogs ?? true;
    if (mod === 'academic_performance' || mod === 'performance_analytics' || mod === 'class_rankings') return privileges.canViewAcademicReports ?? true;
    if (mod === 'expenses') return (privileges.canViewFinancials ?? true) && (privileges.canViewDetailedExpenses ?? true);
    if (mod === 'school_finances' || mod === 'fees_payments' || mod === 'income_expenses' || mod === 'financial_trends' || mod === 'financial_reconciliation') return privileges.canViewFinancials ?? true;
    return true;
  };

  const totalRevenue = useMemo(() => {
    return addMoney(...payments.map(p => p.paid || p.amount || 0));
  }, [payments]);

  const totalExpenditure = useMemo(() => {
    const rawExpenses = getStoredExpenses();
    const campusFiltered = filterExpensesByCampus(rawExpenses, selectedCampus);
    return addMoney(...campusFiltered.map(e => e.amount || 0));
  }, [selectedCampus]);

  const netSurplus = subtractMoney(totalRevenue, totalExpenditure);

  // CEO Thumbnail Groups
  const ceoThumbnailGroups = [
    {
      title: 'Executive Command & High-Level Reports',
      icon: Sparkles,
      color: 'text-blue-400',
      items: [
        {
          id: 'dashboard',
          label: 'Executive Dashboard',
          description: 'Overall institutional health, top KPIs, growth metrics & financial overview',
          icon: LayoutDashboard,
          badge: 'Executive Hub',
          color: 'from-blue-600 to-indigo-700',
          badgeBg: 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
        },
        {
          id: 'executive_report',
          label: 'Consolidated Report',
          description: 'Multi-departmental terminal executive ledger & master report summary',
          icon: FileText,
          badge: `${reports.length} Reports`,
          color: 'from-purple-600 to-indigo-700',
          badgeBg: 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
        },
        {
          id: 'alert_feed',
          label: 'Executive Alerts',
          description: 'Real-time risk warnings, fee arrears & operational notices',
          icon: ShieldAlert,
          badge: 'Live Feed',
          color: 'from-rose-600 to-amber-600',
          badgeBg: 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
        },
        {
          id: 'reports',
          label: 'Executive Reports',
          description: 'Academic performance summaries & terminal grade distributions',
          icon: Award,
          badge: 'Analytics',
          color: 'from-amber-600 to-emerald-600',
          badgeBg: 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
        }
      ]
    },
    {
      title: 'School Operations & Directories',
      icon: School,
      color: 'text-indigo-400',
      items: [
        {
          id: 'school_overview',
          label: 'School Overview',
          description: 'Institutional structure, department breakdown & faculty statistics',
          icon: Building2,
          badge: `${departments.length} Depts`,
          color: 'from-indigo-600 to-blue-600',
          badgeBg: 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
        },
        {
          id: 'students',
          label: 'Student Directory',
          description: 'Complete student roster, admissions, profiles & class rosters',
          icon: Users,
          badge: `${students.length} Students`,
          color: 'from-blue-600 to-cyan-600',
          badgeBg: 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
        },
        {
          id: 'teachers',
          label: 'Staff Directory',
          description: 'Teaching staff, qualification records & departmental rosters',
          icon: UserCheck,
          badge: `${teachers.length} Faculty`,
          color: 'from-emerald-600 to-teal-600',
          badgeBg: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
        },
        {
          id: 'attendance',
          label: 'Student Attendance',
          description: 'Daily student attendance logs, roll calls & absence tracking',
          icon: ClipboardCheck,
          badge: 'Daily Roll',
          color: 'from-amber-600 to-orange-600',
          badgeBg: 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
        },
        {
          id: 'staff_attendance',
          label: 'Staff Attendance',
          description: 'Teacher punctuality logs, clock-in records & attendance audit',
          icon: Clock,
          badge: 'Faculty Clock',
          color: 'from-violet-600 to-purple-600',
          badgeBg: 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
        },
        {
          id: 'discipline',
          label: 'Discipline Reports',
          description: 'Student conduct tracker, incident logs & disciplinary actions',
          icon: Shield,
          badge: 'Conduct',
          color: 'from-rose-600 to-red-600',
          badgeBg: 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
        },
        {
          id: 'graduated_batches',
          label: 'Graduated Batch (Alumni)',
          description: 'Official graduated batches, candidate index numbers, BECE & WASSCE placement records',
          icon: GraduationCap,
          badge: 'Alumni Archives',
          color: 'from-purple-600 to-indigo-700',
          badgeBg: 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
        },
        {
          id: 'employee_history',
          label: 'Employee History (Past Staff)',
          description: 'Historical archive of past employees, duration of service, departments, roles & certifications',
          icon: Briefcase,
          badge: 'Staff Archive',
          color: 'from-slate-600 to-slate-800',
          badgeBg: 'bg-slate-500/20 text-slate-300 border border-slate-500/30'
        }
      ]
    },
    {
      title: 'Academic Performance & Leaderboards',
      icon: GraduationCap,
      color: 'text-purple-400',
      items: [
        {
          id: 'academic_performance',
          label: 'Academic Performance',
          description: 'Terminal exam results, score entry review & grade cards',
          icon: Award,
          badge: 'Exams',
          color: 'from-purple-600 to-pink-600',
          badgeBg: 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
        },
        {
          id: 'performance_analytics',
          label: 'Performance Analytics',
          description: 'Subject-level score breakdowns, averages & trend analysis',
          icon: BarChart3,
          badge: 'Charts',
          color: 'from-indigo-600 to-purple-600',
          badgeBg: 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
        },
        {
          id: 'class_rankings',
          label: 'Top Performing Classes',
          description: 'Class leaderboards & top academic cohorts across terms',
          icon: Trophy,
          badge: 'Leaderboard',
          color: 'from-amber-500 to-yellow-600',
          badgeBg: 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
        }
      ]
    },
    {
      title: 'Financial Oversight & Profitability',
      icon: DollarSign,
      color: 'text-emerald-400',
      items: [
        {
          id: 'school_finances',
          label: 'School Finances',
          description: 'Total revenue vs expenses summary & net financial position',
          icon: Wallet,
          badge: formatCurrency(totalRevenue),
          color: 'from-emerald-600 to-green-700',
          badgeBg: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
        },
        {
          id: 'fees_payments',
          label: 'Fees & Payments',
          description: 'Student fee tariffs, payment receipts & collection logs',
          icon: DollarSign,
          badge: `${payments.length} Payments`,
          color: 'from-teal-600 to-emerald-600',
          badgeBg: 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
        },
        {
          id: 'expenses',
          label: 'School Expenses',
          description: 'Operational spending logs, approval records & expense vouchers',
          icon: TrendingUp,
          badge: 'Spending',
          color: 'from-rose-600 to-red-700',
          badgeBg: 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
        },
        {
          id: 'income_expenses',
          label: 'Income vs Expenses',
          description: 'Profitability breakdown, budget vs actual comparisons',
          icon: PieIcon,
          badge: 'P&L Analysis',
          color: 'from-blue-600 to-indigo-600',
          badgeBg: 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
        },
        {
          id: 'financial_trends',
          label: 'Financial Trends',
          description: 'Multi-term financial forecasting & growth trajectory analysis',
          icon: BarChart3,
          badge: 'Growth Index',
          color: 'from-indigo-600 to-violet-600',
          badgeBg: 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
        },
        {
          id: 'financial_reconciliation',
          label: 'Financial Reconciliation & Exceptions',
          description: 'Phase 30 cross-ledger mathematical audit & discrepancy analysis',
          icon: Scale,
          badge: 'Phase 30 Audit',
          color: 'from-emerald-600 to-teal-700',
          badgeBg: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
        }
      ]
    },
    {
      title: 'Executive Governance & Staff Communication',
      icon: Mail,
      color: 'text-amber-400',
      items: [
        {
          id: 'staff_queries',
          label: 'Send Query to Staff',
          description: 'Issue formal executive equerry or administrative queries to staff members',
          icon: Send,
          badge: `${queriesList.length} Queries`,
          color: 'from-amber-600 to-yellow-600',
          badgeBg: 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
        }
      ]
    }
  ];

  const renderThumbnailNavGrid = () => (
    <div className="space-y-8">
      <div className="bg-gradient-to-r from-[#0A1226] via-[#0F172A] to-[#0A1226] p-6 rounded-3xl border border-blue-900/40 shadow-2xl backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-blue-400 font-black text-xs uppercase tracking-widest mb-1">
            <Grid className="w-4 h-4 text-blue-400" />
            Executive Command Hub & Thumbnail Navigation
          </div>
          <h2 className="text-xl font-black text-white">CEO Thumbnail Modules</h2>
          <p className="text-xs text-slate-400 mt-1">Tap any thumbnail card to jump directly into the requested module view</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-300 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-800">
            {ceoThumbnailGroups.reduce((acc, g) => acc + g.items.length, 0)} Total Modules
          </span>
        </div>
      </div>

      <div className="space-y-8">
        {ceoThumbnailGroups.map((group, idx) => (
          <div key={idx} className="space-y-4">
            <h3 className={`text-xs font-black uppercase tracking-widest flex items-center gap-2 pl-1 ${group.color}`}>
              <group.icon className="w-4 h-4" />
              {group.title}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {group.items.map(item => {
                const allowed = isModuleAllowed(item.id);
                const isActive = activeModule === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (allowed) {
                        handleNavigate(item.id);
                        setIsThumbnailModalOpen(false);
                      }
                    }}
                    disabled={!allowed}
                    className={`group relative p-5 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between space-y-4 cursor-pointer overflow-hidden ${
                      isActive
                        ? 'bg-blue-900/40 border-blue-500 shadow-xl shadow-blue-500/20 ring-2 ring-blue-500/50'
                        : allowed
                        ? 'bg-[#0F172A]/90 hover:bg-[#1E293B] border-slate-800/80 hover:border-blue-500/60 shadow-lg hover:shadow-2xl hover:-translate-y-1'
                        : 'bg-slate-900/40 border-slate-800/40 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform shrink-0`}>
                        <item.icon className="w-5 h-5" />
                      </div>
                      {allowed ? (
                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${item.badgeBg}`}>
                          {item.badge}
                        </span>
                      ) : (
                        <span className="text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-wider bg-slate-800 text-slate-500 flex items-center gap-1">
                          <Lock className="w-3 h-3" /> Restricted
                        </span>
                      )}
                    </div>

                    <div>
                      <h4 className="font-extrabold text-sm text-white group-hover:text-blue-400 transition-colors flex items-center justify-between gap-1">
                        <span>{item.label}</span>
                        {allowed && <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />}
                      </h4>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    </div>

                    {allowed && (
                      <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] font-bold text-blue-400 group-hover:text-blue-300">
                        <span>{isActive ? '● Currently Active' : 'Open Module'}</span>
                        <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top CEO Executive Header Bar */}
      <header className="sticky top-0 z-30 bg-[#070D1E]/95 backdrop-blur-md border border-blue-950/80 px-4 py-3.5 sm:px-6 rounded-2xl shadow-2xl overflow-x-clip">
        <div className="flex flex-wrap items-center justify-between gap-4 min-w-0 w-full">
          <div className="flex items-center gap-3 min-w-0 shrink">
            <JIPASLogo size="sm" />
            <div className="min-w-0 shrink">
              <div className="flex items-center gap-2 min-w-0">
                <h1 className="text-sm font-black text-white tracking-wide truncate">
                  {currentUser?.role === 'director' ? 'DIRECTOR PORTAL' : 'CEO PORTAL'}
                </h1>
                <span className="px-2 py-0.5 bg-blue-600 text-white rounded text-[9px] font-black uppercase tracking-wider shrink-0">
                  EXEC
                </span>
              </div>
              <p className="text-[10px] text-blue-400 font-bold uppercase tracking-wider truncate min-w-0">{executiveTitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {activeModule !== 'dashboard' && (
              <button
                onClick={() => handleNavigate('dashboard')}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Dashboard Hub</span>
              </button>
            )}

            <button
              onClick={() => setIsThumbnailModalOpen(true)}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-blue-400 border border-blue-900/50 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <Grid className="w-4 h-4 text-blue-400" />
              <span className="hidden sm:inline">Thumbnail Menus</span>
            </button>

            <button
              onClick={onLogout}
              className="px-3.5 py-2 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-900/50 text-rose-400 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>

        {/* Horizontal Quick Thumbnail Nav Strip */}
        <div className="mt-3 pt-3 border-t border-blue-950/60 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest shrink-0 pr-1 flex items-center gap-1">
            <Grid className="w-3 h-3 text-blue-400" /> Quick Nav:
          </span>
          {ceoThumbnailGroups.flatMap(g => g.items).map(item => {
            const allowed = isModuleAllowed(item.id);
            if (!allowed) return null;
            const isActive = activeModule === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id)}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 ring-1 ring-blue-400'
                    : 'bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <item.icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Thumbnail Navigation Modal Drawer */}
      <AnimatePresence>
        {isThumbnailModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#070D1E] border border-blue-900/60 rounded-3xl p-6 sm:p-8 max-w-6xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative space-y-6"
            >
              <div className="flex items-center justify-between pb-4 border-b border-blue-950">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                    <Grid className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white">CEO Thumbnail Menus Hub</h3>
                    <p className="text-xs text-slate-400">Select any thumbnail menu item to jump to that module</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsThumbnailModalOpen(false)}
                  className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {renderThumbnailNavGrid()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="w-full">
        {!isModuleAllowed(activeModule) ? (
          <div className="bg-[#0F172A] p-8 rounded-3xl border border-amber-900/40 shadow-xl text-center space-y-4 my-8">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-black text-white">Privilege Restricted</h2>
            <p className="text-sm text-slate-400 max-w-md mx-auto">
              Your executive account ({executiveTitle}) does not have administrative permission to view this module.
            </p>
            <p className="text-xs text-slate-500">
              Please contact the School Administrator to request access or adjust your executive permissions in CEO & Director Management.
            </p>
            <button
              onClick={() => handleNavigate('dashboard')}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Return to Executive Dashboard
            </button>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeModule}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-8"
            >
              {activeModule === 'dashboard' && (
                <>
                  {/* Thumbnail Navigation Cards on Dashboard */}
                  {renderThumbnailNavGrid()}

                  {/* CEO Executive Analytics & Charts */}
                  <div className="pt-6 border-t border-slate-800">
                    <ExecutiveDashboard 
                      students={students}
                      teachers={teachers}
                      reports={reports}
                      payments={payments}
                      bills={bills}
                    />
                  </div>
                </>
              )}

              {activeModule === 'reports' && (
                <ExecutiveReports />
              )}

              {activeModule === 'executive_report' && (
                <ConsolidatedExecutiveReport />
              )}

              {activeModule === 'alert_feed' && (
                <ExecutiveAlertFeed />
              )}

              {activeModule === 'students' && (
                <StudentManager 
                  activeModule="enrolled_students"
                  students={students}
                  classes={classes}
                  departments={departments}
                  houses={houses}
                  onAddStudent={() => {}} // READ ONLY
                  onUpdateStudent={() => {}} // READ ONLY
                  onDeleteStudent={() => {}} // READ ONLY
                  isReadOnly={true}
                />
              )}

              {activeModule === 'teachers' && (
                <TeacherManager 
                  activeModule="teachers"
                  teachers={teachers}
                  onAddTeacher={() => {}} // READ ONLY
                  onUpdateTeacher={() => {}} // READ ONLY
                  onDeleteTeacher={() => {}} // READ ONLY
                  isReadOnly={true}
                />
              )}

              {activeModule === 'academic_performance' && (
                <PerformanceOverview reports={reports} />
              )}

              {activeModule === 'performance_analytics' && (
                <PerformanceOverview reports={reports} />
              )}

              {activeModule === 'class_rankings' && (
                <TopPerformingClasses />
              )}

              {activeModule === 'fees_payments' && (
                <FeeManager 
                  activeModule="payments"
                  bills={bills}
                  payments={payments}
                  students={students}
                  classFeeTariffs={[]} // Empty for read-only overview
                  onAddPayment={() => {}} // READ ONLY
                />
              )}

              {activeModule === 'expenses' && (
                <ExpenseManager canAdd={false} canApprove={false} canDelete={false} />
              )}

              {activeModule === 'income_expenses' && (
                <FeeManager 
                  activeModule="income_expenses"
                  bills={bills}
                  payments={payments}
                  students={students}
                  classFeeTariffs={[]}
                  onAddPayment={() => {}} // READ ONLY
                />
              )}

              {activeModule === 'financial_trends' && (
                <div className="bg-[#0F172A] p-8 rounded-3xl border border-slate-800 shadow-xl">
                   <h2 className="text-xl font-black text-white mb-6">Financial Trends & Growth</h2>
                   <p className="text-slate-400">Comprehensive multi-term financial visualization for executive planning.</p>
                </div>
              )}

              {activeModule === 'financial_reconciliation' && (
                <FinancialReconciliationDashboard
                  currentUser={currentUser}
                  students={students}
                  bills={bills}
                  payments={payments}
                  onClose={() => setActiveModule('dashboard')}
                />
              )}

              {activeModule === 'attendance' && (
                <AttendanceManager 
                  type="student"
                  students={students}
                  teachers={teachers}
                />
              )}

              {activeModule === 'staff_attendance' && (
                <AttendanceManager 
                  type="teacher"
                  students={students}
                  teachers={teachers}
                />
              )}

              {activeModule === 'discipline' && (
                <DisciplineTracker 
                  students={students}
                />
              )}

              {activeModule === 'school_overview' && (
                <div className="bg-[#0F172A] p-8 rounded-3xl border border-slate-800 shadow-xl">
                  <h2 className="text-xl font-black text-white mb-6">Institutional Structural Overview</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800">
                        <h4 className="text-xs font-black text-blue-400 uppercase tracking-widest mb-4">Departmental Breakdown</h4>
                        <div className="space-y-3">
                           {departments.map(d => (
                             <div key={d.id} className="flex justify-between items-center text-sm">
                                <span className="text-slate-300">{d.name}</span>
                                <span className="font-bold text-white">{classes.filter(c => c.department === d.name).length} Classes</span>
                             </div>
                           ))}
                        </div>
                     </div>
                     <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800">
                        <h4 className="text-xs font-black text-emerald-400 uppercase tracking-widest mb-4">Teaching Faculty Stats</h4>
                        <div className="space-y-3">
                           <div className="flex justify-between items-center text-sm">
                              <span className="text-slate-300">Total Teachers</span>
                              <span className="font-bold text-white">{teachers.length}</span>
                           </div>
                           <div className="flex justify-between items-center text-sm">
                              <span className="text-slate-300">Class Teachers</span>
                              <span className="font-bold text-white">{classes.length}</span>
                           </div>
                        </div>
                     </div>
                  </div>
                </div>
              )}

              {activeModule === 'graduated_batches' && (
                <div className="bg-slate-900/90 rounded-3xl p-4 sm:p-6 border border-slate-800">
                  <GraduatedBatchManager 
                    userRole="ceo" 
                    readOnly={true} 
                    selectedCampus={selectedCampus}
                  />
                </div>
              )}

              {activeModule === 'employee_history' && (
                <div className="bg-slate-900/90 rounded-3xl p-4 sm:p-6 border border-slate-800">
                  <PastEmployeeHistoryManager 
                    userRole="ceo" 
                    readOnly={true} 
                    selectedCampus={selectedCampus}
                  />
                </div>
              )}

              {activeModule === 'school_finances' && (
                 <div className="space-y-6">
                    <div className="bg-[#0F172A] p-8 rounded-3xl border border-slate-800 shadow-xl">
                      <h2 className="text-xl font-black text-white mb-6">School Financial Summary</h2>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="p-6 bg-blue-900/10 rounded-2xl border border-blue-900/30">
                             <span className="text-[10px] font-black text-blue-400 uppercase">Total Revenue</span>
                             <h3 className="text-2xl font-black text-white mt-1">{formatCurrency(totalRevenue)}</h3>
                          </div>
                          <div className="p-6 bg-rose-900/10 rounded-2xl border border-rose-900/30">
                             <span className="text-[10px] font-black text-rose-400 uppercase">Total Expenditure</span>
                             <h3 className="text-2xl font-black text-white mt-1">{formatCurrency(totalExpenditure)}</h3>
                          </div>
                          <div className="p-6 bg-emerald-900/10 rounded-2xl border border-emerald-900/30">
                             <span className="text-[10px] font-black text-emerald-400 uppercase">Net Surplus</span>
                             <h3 className="text-2xl font-black text-white mt-1">{formatCurrency(netSurplus)}</h3>
                          </div>
                      </div>
                    </div>
                 </div>
              )}

              {activeModule === 'staff_queries' && (
                <div className="space-y-6">
                  <div className="bg-[#0F172A] p-8 rounded-3xl border border-slate-800 shadow-xl">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-400">
                          <Send className="w-6 h-6" />
                        </div>
                        <div>
                          <h2 className="text-xl font-black text-white">Executive Equerry & Staff Query Portal</h2>
                          <p className="text-slate-400 text-xs mt-0.5">Issue formal administrative queries and directives directly to staff members</p>
                        </div>
                      </div>
                      <span className="px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-full text-xs font-bold uppercase tracking-wider self-start md:self-auto">
                        CEO Governance Channel
                      </span>
                    </div>

                    {queryToast && (
                      <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-2xl text-xs font-bold flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                          <span>{queryToast}</span>
                        </div>
                        <button onClick={() => setQueryToast(null)} className="text-emerald-400 hover:text-white">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    <form onSubmit={handleSendExecutiveQuery} className="space-y-4 bg-[#020617] p-6 rounded-2xl border border-slate-800">
                      <h3 className="text-sm font-black text-amber-400 uppercase tracking-widest mb-2">Compose Formal Executive Query</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-slate-400 text-xs font-bold mb-1">Target Recipient / Staff Role</label>
                          <select 
                            value={queryTargetRole} 
                            onChange={(e) => setQueryTargetRole(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white font-bold focus:outline-none focus:border-amber-500"
                          >
                            <option value="Headteacher">Headteacher / Principal</option>
                            <option value="Accountant">Chief Bursar / Accountant</option>
                            <option value="Secretary">School Secretary</option>
                            <option value="Class Teacher">Class Teacher (Basic 1)</option>
                            <option value="Board Director">Board Director</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-slate-400 text-xs font-bold mb-1">Urgency Level</label>
                          <select 
                            value={queryUrgency} 
                            onChange={(e) => setQueryUrgency(e.target.value as any)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white font-bold focus:outline-none focus:border-amber-500"
                          >
                            <option value="Routine">Routine Inquiry</option>
                            <option value="Priority">Priority Audit Request</option>
                            <option value="Critical">Critical Executive Directive</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-slate-400 text-xs font-bold mb-1">Subject / Ref Topic</label>
                        <input 
                          type="text" 
                          required
                          placeholder="e.g. Discrepancy in Term 3 Science Lab Expense Voucher..."
                          value={querySubject}
                          onChange={(e) => setQuerySubject(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white font-bold focus:outline-none focus:border-amber-500 placeholder-slate-600"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-400 text-xs font-bold mb-1">Detailed Message / Equerry</label>
                        <textarea 
                          required
                          rows={4}
                          placeholder="Type detailed query, instructions or audit demand for the staff member..."
                          value={queryMessage}
                          onChange={(e) => setQueryMessage(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white font-medium focus:outline-none focus:border-amber-500 placeholder-slate-600"
                        />
                      </div>

                      <div className="flex justify-end pt-2">
                        <button 
                          type="submit"
                          className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-700 hover:from-amber-600 hover:to-amber-800 text-white font-black text-xs rounded-xl shadow-lg flex items-center gap-2 cursor-pointer transition-all"
                        >
                          <Send className="w-4 h-4" />
                          <span>Dispatch Executive Query</span>
                        </button>
                      </div>
                    </form>

                    {/* Sent Queries History */}
                    <div className="mt-8 space-y-4">
                      <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                        <History className="w-4 h-4 text-amber-400" /> Dispatched Executive Queries Log ({queriesList.length})
                      </h3>

                      <div className="space-y-3">
                        {queriesList.map((q) => (
                          <div key={q.id} className="p-5 bg-slate-900/80 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                  q.urgency === 'Critical' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                                  q.urgency === 'Priority' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                                  'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                }`}>
                                  {q.urgency}
                                </span>
                                <span className="text-white font-black text-sm">{q.subject}</span>
                              </div>
                              <p className="text-xs text-slate-400 font-medium">{q.message}</p>
                              <div className="flex items-center gap-4 text-[10px] text-slate-500 font-bold pt-1">
                                <span>Recipient: <strong className="text-slate-300">{q.recipientRole}</strong></span>
                                <span>Date: {q.date} at {q.time}</span>
                              </div>
                            </div>
                            <div className="flex-shrink-0">
                              <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider ${
                                q.status === 'Resolved' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                                q.status === 'Acknowledged' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                                'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse'
                              }`}>
                                {q.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </main>
    </div>
  );
}

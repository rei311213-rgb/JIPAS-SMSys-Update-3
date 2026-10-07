import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Student, Teacher, TermReport, StudentBill, PaymentRecord, CalendarEvent, NotificationItem, LoginLog,
  AcademicYearItem, TermItem, DepartmentItem, ClassItem, HouseItem, SubjectItem, ClassFeeTariffItem,
  ClassReportBroadcast, ThemePaletteConfig, CourseItem, UserAccountItem
} from '../types';
import SchoolCalendarView from './SchoolCalendarView';
import AcademicSetupManager from './AcademicSetupManager';
import AcademicTreeView from './admin/AcademicTreeView';
import SystemSettingsManager from './admin/SystemSettingsManager';
import TeacherManager from './admin/TeacherManager';
import StudentManager from './admin/StudentManager';
import ExaminationManager from './admin/ExaminationManager';
import ExamTimetableManager from './admin/ExamTimetableManager';
import TerminalReportManager from './admin/TerminalReportManager';
import FeeManager from './admin/FeeManager';
import CommunicationLogsManager from './admin/CommunicationLogsManager';
import AdminDashboardCharts from './admin/AdminDashboardCharts';
import StudentTranscriptManager from './admin/StudentTranscriptManager';
import BackupRecoveryManager from './admin/BackupRecoveryManager';
import DataConflictResolver from './admin/DataConflictResolver';
import ReconciliationDashboard from './admin/ReconciliationDashboard';
import DatabaseIntegrityManager from './admin/DatabaseIntegrityManager';
import BulkStudentUploadModal from './admin/BulkStudentUploadModal';
import BulkTeacherUploadModal from './admin/BulkTeacherUploadModal';
import BulkDataImportModal from './admin/BulkDataImportModal';
import AttendanceManager from './admin/AttendanceManager';
import CommunicationsCenter from './admin/CommunicationsCenter';
import AssetLibraryManager from './admin/AssetLibraryManager';
import DisciplineTracker from './admin/DisciplineTracker';
import SyncNowButton from './common/SyncNowButton';
import CeoRoleManager from './admin/CeoRoleManager';
import FinancialAuditManager from './admin/FinancialAuditManager';
import FinancialReconciliationDashboard from './admin/FinancialReconciliationDashboard';
import SecurityAuditLogsManager from './admin/SecurityAuditLogsManager';
import UserPortalReviewManager from './admin/UserPortalReviewManager';
import DepartmentalFinancialSummary from './common/DepartmentalFinancialSummary';
import FinancialAuditTrail from './common/FinancialAuditTrail';
import ExpenseManager from './common/ExpenseManager';
import ReceiptGenerationDashboard from './common/ReceiptGenerationDashboard';
import NextTermBillingManager from './common/NextTermBillingManager';
import { getActiveCampus, setActiveCampus, filterStudentsByCampus, filterTeachersByCampus, filterBillsByCampus, filterPaymentsByCampus, filterExpensesByCampus } from '../lib/campusUtils';
import JIPASLogo, { getSchoolLogo } from './common/JIPASLogo';
import CampusSelector from './common/CampusSelector';
import DashboardSkeleton from './common/DashboardSkeleton';
import { LiveActivityFeed } from './common/LiveActivityFeed';
import GlobalSearchHeader from './common/GlobalSearchHeader';
import SidebarToggleButton from './common/SidebarToggleButton';
import GettingStartedTour from './common/GettingStartedTour';
import PayrollManager from './common/PayrollManager';
import StaffAttendanceManager from './admin/StaffAttendanceManager';
import GraduatedBatchManager from './common/GraduatedBatchManager';
import PastEmployeeHistoryManager from './common/PastEmployeeHistoryManager';
import BoardingManager from './admin/BoardingManager';
import SessionControlsManager from './admin/SessionControlsManager';
import StudentTransferManager from './admin/StudentTransferManager';
import ProductionHealthDashboard from './admin/ProductionHealthDashboard';
import ProductionLaunchControlPanel from './admin/ProductionLaunchControlPanel';
import TermClosureRollOverWizard from './admin/TermClosureRollOverWizard';
import WhatsAppFeeDispatchCenter from './admin/WhatsAppFeeDispatchCenter';
import StudentQRIdCardGenerator from './admin/StudentQRIdCardGenerator';
import MinesecComplianceExport from './admin/MinesecComplianceExport';
import ContinuousAssessmentGradebook from './common/ContinuousAssessmentGradebook';
import ParentMobilePaymentPortal from './common/ParentMobilePaymentPortal';
import CanteenPOSManager from './common/CanteenPOSManager';
import AlgorithmicTimetableGenerator from './admin/AlgorithmicTimetableGenerator';
import UserManualModal from './common/UserManualModal';
import DataIntegrityDashboard from './admin/DataIntegrityDashboard';
import BackupVerificationPanel from './admin/BackupVerificationPanel';
import SystemMaintenancePanel from './admin/SystemMaintenancePanel';
import DataGovernanceDashboard from './admin/DataGovernanceDashboard';
import DisasterRecoveryDashboard from './admin/DisasterRecoveryDashboard';
import ReleaseManagementPanel from './admin/ReleaseManagementPanel';
import ChangeAuditPanel from './admin/ChangeAuditPanel';
import AppErrorBoundary from './common/AppErrorBoundary';
import { useI18n } from '../i18n/I18nContext';
import { PDFGeneratorService } from '../services/pdfService';
import { addMoney, subtractMoney } from '../utils/financeUtils';
import { syncAllBillsWithPayments } from '../services/financialLedgerCalculationService';

import { 
  INITIAL_ACADEMIC_YEARS, INITIAL_TERMS, INITIAL_DEPARTMENTS, 
  INITIAL_CLASSES, INITIAL_HOUSES, INITIAL_SUBJECTS 
} from '../data/setupData';
import { checkHasDemoData, clearDemoData, getStoredReports, forceSyncCollections } from '../services/dbService';
import { getStoredExpenses, getStoredSettings, getActiveAcademicPeriod } from '../services/storageService';
import { 
  LayoutDashboard, Users, UserCheck, CreditCard, Award, Calendar, Bell, 
  FileText, Shield, Plus, Search, CheckCircle, AlertCircle, ArrowUpRight, DollarSign, BookOpen,
  Settings, UserCog, GraduationCap, ClipboardCheck, BarChart3, MessageSquare, KeyRound, Layers, Building2, School, Bookmark,
  Send, Eye, History, RefreshCw, CheckCircle2, Mail, Clock, AlertTriangle, LogOut, Printer, Wallet, TrendingUp, ChevronRight, ChevronDown,
  PanelLeftClose, PanelLeftOpen, MessageCircle, Database, Trash2, X, Sparkles, Palette, Download, Menu, Presentation, ShieldCheck,
  GitCompare, Activity, Upload, Crown, FolderTree, Briefcase, Zap, UserPlus, Receipt, Compass, HardDrive,
  Bus, ShieldAlert, ArrowRightLeft, Wrench, QrCode, Scale, Flame, Rocket, Utensils, Smartphone
} from 'lucide-react';
import Draggable from 'react-draggable';


import PerformanceOverview from './admin/PerformanceOverview';

interface AdminPortalProps {
  currentUser?: any;
  isLoading?: boolean;
  themePalette?: ThemePaletteConfig;
  onUpdateThemePalette?: (palette: ThemePaletteConfig) => void;
  students: Student[];
  teachers: Teacher[];
  reports: TermReport[];
  bills: StudentBill[];
  payments: PaymentRecord[];
  calendarEvents: CalendarEvent[];
  notifications: NotificationItem[];
  classFeeTariffs: ClassFeeTariffItem[];
  broadcasts?: ClassReportBroadcast[];
  loginLogs: LoginLog[];
  academicYears: AcademicYearItem[];
  terms: TermItem[];
  departments: DepartmentItem[];
  courses?: CourseItem[];
  classes: ClassItem[];
  houses: HouseItem[];
  subjects: SubjectItem[];
  onAddStudent: (student: Student) => void;
  onUpdateStudent?: (student: Student) => void;
  onDeleteStudent?: (studentId: string) => void;
  onAddTeacher?: (teacher: Teacher) => void;
  onUpdateTeacher?: (teacher: Teacher) => void;
  onDeleteTeacher?: (teacherId: string) => void;
  onUpdateAcademicYears: (years: AcademicYearItem[]) => void;
  onUpdateTerms: (terms: TermItem[]) => void;
  onUpdateDepartments: (departments: DepartmentItem[]) => void;
  onUpdateCourses?: (courses: CourseItem[]) => void;
  onUpdateClasses: (classes: ClassItem[]) => void;
  onUpdateHouses: (houses: HouseItem[]) => void;
  onUpdateSubjects: (subjects: SubjectItem[]) => void;
  onAddEvent: (event: CalendarEvent) => void;
  onAddPayment?: (payment: PaymentRecord) => void;
  onUpdateReports?: (reports: TermReport[]) => void;
  onUpdateBroadcasts?: (broadcasts: ClassReportBroadcast[]) => void;
  onAddNotification?: (notif: NotificationItem) => void;
  onRestoreData?: (data: any) => void;
  onUpdateNotifications?: (notifs: NotificationItem[]) => void;
  onLogout?: () => void;
  onCleanOrphaned?: () => Promise<{ cleanedBillsCount: number, cleanedReportsCount: number }>;
  onClearAllData?: () => void;
  onLoginAsUser?: (user: UserAccountItem) => void;
}

// Valid administrative module identifiers for URL hash routing and refresh persistence
const VALID_ADMIN_MODULES = new Set([
  'dashboard', 'bulk_upload', 'bulk_teacher_upload', 'bulk_data_import', 'data_import', 'bulk_import',
  // Setup
  'setup_management', 'setup_academic_years', 'setup_term_parameters', 'setup_departments', 'departments', 'department',
  'manage_courses', 'setup_manage_courses', 'setup_shs_courses', 'shs_courses', 'courses', 'course',
  'setup_classes', 'classes', 'class', 'setup_houses', 'houses', 'house', 'setup_subjects', 'subjects', 'subject', 'subject_management',
  'setup_academic_calendar', 'academic_calendar', 'calendar_events', 'termly_activities',
  'setup_graduated_batches', 'graduated_batches', 'old_students', 'alumni',
  'academic_setup', 'academic_tree_view', 'academic_tree', 'tree_view',
  // System
  'system_settings', 'system_school_setup', 'school_setup', 'system_working_periods', 'working_periods', 'system_theme_palette', 'theme_palette', 'color_palette', 'system_account_requests', 'account_requests', 'system_backup_restore', 'backup_recovery', 'backup_restore',
  'data_conflict_resolver', 'conflict_resolver', 'system_conflict_resolver', 'reconciliation_dashboard', 'database_integrity', 'integrity_check', 'database_reconciliation',
  'system_users_roles', 'system_users', 'users_roles', 'users', 'system_student_portal_ctrl', 'system_student_portal_control', 'student_portal_control',
  'system_manage_logins', 'system_manage_portal_logins', 'manage_portal_logins', 'manage_user_logins', 'manage_logins', 'admin_feedback_manager',
  'sub_accountant_roles', 'accountant_roles', 'sub_accountant_privileges',
  'ceo_director_roles', 'ceo_roles', 'director_roles', 'executive_roles',
  'users_portal_review', 'portal_review', 'users_review', 'security_audit', 'security_audit_logs', 'firewall', 'waf_firewall', 'launch_control', 'production_launch_gate',
  'term_closure_wizard', 'term_closure', 'rollover_wizard', 'whatsapp_dispatch_center', 'whatsapp_dispatch', 'student_qr_id_cards', 'qr_id_cards', 'minesec_compliance_export', 'minesec_dossier',
  'continuous_assessment_gradebook', 'ca_gradebook', 'master_broadsheet', 'parent_momo_checkout', 'self_service_checkout', 'canteen_pos', 'canteen_meal_card', 'school_canteen', 'algorithmic_timetable', 'timetable_generator', 'master_timetable',
  // Teacher
  'teacher_profile', 'teachers', 'teacher_id_cards', 'teacher_assign',
  'teacher_attendance', 'teacher_attendance_report', 'teacher_attendance_stats', 'bulk_teacher_upload',
  // Student
  'student_enroll', 'enroll_student', 'student_enrolled', 'enrolled_students',
  'student_transcript', 'exam_transcripts', 'transcripts', 'student_id_cards',
  'student_attendance', 'discipline', 'student_promote', 'promote_students', 'student_promotion_history', 'promotion_history',
  'student_transfers', 'transfers', 'enrollment_reports',
  'admin_terminal_reports', 'reports_terminal', 'terminal_reports', 'class_broadcasts',
  // Examination
  'exam_timetable', 'exam_grading_system', 'grading_system', 'exam_score_conversion', 'score_conversion',
  'exam_enter_results', 'enter_results', 'exam_report_sheets', 'report_sheets', 'score_approvals',
  // Fee & Financial
  'fee_options', 'fees', 'fee_bill_students', 'bills', 'fee_generate_sheets',
  'fee_collection', 'fee_bulk_entry', 'payments', 'fee_payment_history', 'fee_payment_stats',
  'fee_income_expenses', 'income_expenses', 'fee_overdue_alerts', 'fee_audit_activity', 'audit_activity', 'payment_settings',
  'fee_refunds', 'refunds',
  'financial_reconciliation', 'reconciliation_audit',
  'financial_audit', 'financial_records_audit', 'audit_financial', 'departmental_financial_summary', 'dept_financial_summary',
  'institutional_expenses', 'school_expenses', 'expenses', 'student_services',
  'secretary_handover', 'secretary_records',
  // Payroll & Remuneration
  'payroll', 'payroll_dashboard', 'payroll_runs', 'payroll_structures', 'payroll_payslips', 'payroll_loans', 'payroll_settings',
  // Notifications & SMS & Activity
  'notif_send', 'send_notification', 'whatsapp_broadcast', 'whatsapp_groups',
  'whatsapp_history', 'notif_history', 'notification_history', 'sms_compose',
  'compose_sms', 'sms_history', 'logs_student', 'student_login_history',
  'logs_user', 'user_login_history', 'performance_overview',
  // Graduated Batches & Past Employees
  'graduated_batch_registry', 'graduated_batches', 'past_employees', 'employee_history',
  // Logistics, Boarding & Sessions
  'session_controls', 'active_sessions', 'session_security',
  'boarding_management', 'boarding', 'hostel', 'class_broadcast_console'
]);

export const normalizeAdminModuleId = (mod: string): string => {
  if (!mod) return 'dashboard';
  const clean = mod.toLowerCase().trim();
  if (clean === 'departments' || clean === 'department') return 'setup_departments';
  if (clean === 'classes' || clean === 'class') return 'setup_classes';
  if (clean === 'subjects' || clean === 'subject' || clean === 'subject_management') return 'setup_subjects';
  if (clean === 'courses' || clean === 'course' || clean === 'shs_courses' || clean === 'setup_shs_courses' || clean === 'setup_manage_courses') return 'manage_courses';
  if (clean === 'houses' || clean === 'house') return 'setup_houses';
  if (clean === 'academic_years' || clean === 'academic_year') return 'setup_academic_years';
  if (clean === 'terms' || clean === 'term' || clean === 'term_parameters') return 'setup_term_parameters';
  if (clean === 'academic_calendar' || clean === 'calendar_events' || clean === 'termly_activities' || clean === 'setup_academic_calendar') return 'setup_academic_calendar';
  if (clean === 'graduated_batches' || clean === 'graduated_batch_registry' || clean === 'old_students' || clean === 'alumni' || clean === 'setup_graduated_batches') return 'graduated_batch_registry';
  if (clean === 'past_employees' || clean === 'employee_history' || clean === 'past_staff') return 'past_employees';
  if (clean === 'tree' || clean === 'academic_tree' || clean === 'tree_view') return 'academic_tree_view';
  if (clean === 'system_users' || clean === 'users') return 'system_users_roles';
  if (clean === 'portal_review' || clean === 'users_review' || clean === 'user_portal_review') return 'users_portal_review';
  if (clean === 'system_school_setup' || clean === 'school_setup') return 'system_settings';
  if (clean === 'reports_terminal') return 'admin_terminal_reports';
  if (clean === 'backup_recovery' || clean === 'backup_restore') return 'system_backup_restore';
  if (clean === 'fee' || clean === 'fees' || clean === 'fee_management' || clean === 'fee_hub' || clean === 'school_fee_management') return 'fee_collection';
  return clean;
};

const getCategoryForModule = (mod: string): string => {
  const norm = normalizeAdminModuleId(mod);
  if (norm === 'performance_overview') return 'dashboard';
  if (norm.startsWith('setup_') || norm === 'academic_setup' || norm === 'manage_courses' || norm === 'academic_tree_view') return 'setup';
  if (norm.startsWith('system_') || norm === 'backup_recovery' || norm === 'backup_restore' || norm === 'users_roles' || norm === 'student_portal_control' || norm === 'manage_portal_logins' || norm === 'account_requests' || norm === 'sub_accountant_roles' || norm === 'accountant_roles' || norm === 'ceo_director_roles' || norm === 'ceo_roles' || norm === 'director_roles' || norm === 'executive_roles' || norm === 'users_portal_review' || norm === 'portal_review' || norm === 'admin_feedback_manager' || norm === 'reconciliation_dashboard' || norm === 'data_conflict_resolver' || norm === 'database_integrity' || norm === 'integrity_check') return 'system';
  if (norm.startsWith('teacher_') || norm === 'teachers' || norm === 'bulk_teacher_upload') return 'teacher';
  if (norm === 'student_transcript' || norm === 'exam_transcripts' || norm === 'transcripts') return 'student';
  if (norm === 'admin_terminal_reports' || norm === 'terminal_reports' || norm === 'class_broadcasts') return 'exam';
  if (norm.startsWith('student_') || norm === 'students' || norm === 'enroll_student' || norm === 'enrolled_students' || norm === 'promote_students' || norm === 'promotion_history' || norm === 'discipline' || norm === 'bulk_upload' || norm === 'bulk_data_import' || norm === 'data_import' || norm === 'bulk_import') return 'student';
  if (norm.startsWith('exam_') || norm === 'grading_system' || norm === 'score_conversion' || norm === 'enter_results' || norm === 'report_sheets') return 'exam';
  if (norm.startsWith('fee_') || norm === 'fees' || norm === 'bills' || norm === 'payments' || norm === 'income_expenses' || norm === 'audit_activity' || norm === 'financial_audit' || norm === 'financial_records_audit' || norm === 'financial_reconciliation' || norm === 'reconciliation_audit' || norm === 'institutional_expenses' || norm === 'expenses' || norm === 'secretary_handover') return 'fee';
  if (norm.startsWith('payroll_') || norm === 'payroll') return 'payroll';
  if (norm === 'session_controls' || norm === 'active_sessions' || norm === 'session_security') return 'system';
  if (norm === 'boarding_management' || norm === 'boarding' || norm === 'library_assets') return 'resources';
  if (norm.startsWith('notif_') || norm.startsWith('sms_') || norm.startsWith('whatsapp_') || norm === 'send_notification' || norm === 'notification_history' || norm === 'compose_sms' || norm === 'sms_history') return 'notif';
  if (norm.startsWith('logs_') || norm === 'student_login_history' || norm === 'user_login_history') return 'logs';
  return 'dashboard';
};

const ADMIN_NAV_GROUPS = [
  {
    id: 'overview',
    title: 'Overview',
    icon: LayoutDashboard,
    items: [
      { id: 'dashboard', label: 'Dashboard Overview', icon: LayoutDashboard },
      { id: 'performance_overview', label: 'Performance Analytics', icon: BarChart3 },
    ]
  },
  {
    id: 'setup',
    title: 'Setup Management',
    icon: School,
    items: [
      { id: 'setup_academic_years', label: 'Academic Years', icon: Calendar },
      { id: 'setup_term_parameters', label: 'Term / Parameters', icon: Bookmark },
      { id: 'setup_academic_calendar', label: 'Academic Calendar & Activities', icon: Calendar },
      { id: 'setup_graduated_batches', label: 'Graduated Batches & Alumni', icon: GraduationCap },
      { id: 'setup_departments', label: 'Departments', icon: Building2 },
      { id: 'manage_courses', label: 'Manage Courses', icon: BookOpen },
      { id: 'setup_classes', label: 'Classes', icon: School },
      { id: 'academic_tree_view', label: 'Academic Tree Explorer', icon: FolderTree },
      { id: 'setup_houses', label: 'Houses', icon: Shield },
      { id: 'setup_subjects', label: 'Subject Management', icon: BookOpen },
    ]
  },
  {
    id: 'system',
    title: 'System Setting',
    icon: Settings,
    items: [
      { id: 'system_settings', label: 'System Settings', icon: Settings },
      { id: 'system_working_periods', label: 'Staff Working Periods', icon: Clock },
      { id: 'system_theme_palette', label: 'Theme & Color Palette', icon: Palette },
      { id: 'system_account_requests', label: 'Account Requests', icon: UserCheck },
      { id: 'system_users_roles', label: 'Users & Roles', icon: UserCog },
      { id: 'users_portal_review', label: 'Users Portal Review', icon: Eye },
      { id: 'ceo_director_roles', label: 'CEO & Director Management', icon: Crown },
      { id: 'security_audit', label: 'Security & Role Audit Logs', icon: ShieldCheck },
      { id: 'waf_firewall', label: 'WAF Firewall & Threat Shield', icon: Flame },
      { id: 'launch_control', label: 'Production Launch & 4 Options Gate', icon: Rocket },
      { id: 'session_controls', label: 'Session Controls & Active Logins', icon: ShieldAlert },
      { id: 'system_student_portal_ctrl', label: 'Student Portal Control', icon: GraduationCap },
      { id: 'system_manage_logins', label: 'Manage Portal Logins', icon: KeyRound },
      { id: 'system_backup_restore', label: 'Backup & Recovery', icon: Database },
      { id: 'database_backup', label: 'Database Backup (IndexedDB)', icon: HardDrive },
      { id: 'database_integrity', label: 'Database Integrity', icon: ShieldCheck },
      { id: 'data_conflict_resolver', label: 'Data Conflict Resolver', icon: GitCompare },
      { id: 'reconciliation_dashboard', label: 'Reconciliation Dashboard', icon: Activity },
      { id: 'minesec_compliance_export', label: 'MINESEC Compliance & Statistics', icon: Building2 },
    ]
  },
  {
    id: 'teacher',
    title: 'Staff Management',
    icon: UserCheck,
    items: [
      { id: 'teacher_profile', label: 'Employee (Current Staff)', icon: UserCheck },
      { id: 'bulk_teacher_upload', label: 'Bulk Import Teachers', icon: Upload },
      { id: 'past_employees', label: 'Employee History (Past Staff)', icon: Briefcase },
      { id: 'teacher_id_cards', label: 'Staff ID Cards', icon: CreditCard },
      { id: 'teacher_assign', label: 'Assign Teacher', icon: Users },
      { id: 'teacher_attendance', label: 'Teacher Attendance', icon: ClipboardCheck },
      { id: 'teacher_attendance_report', label: 'Attendance Report', icon: FileText },
      { id: 'teacher_attendance_stats', label: 'Attendance Statistics', icon: BarChart3 },
      { id: 'staff_qr_attendance_dashboard', label: 'Staff QR Attendance', icon: QrCode },
    ]
  },
  {
    id: 'student',
    title: 'Student Management',
    icon: Users,
    items: [
      { id: 'student_enroll', label: 'Enroll Student', icon: Plus },
      { id: 'bulk_upload', label: 'Bulk Import Students', icon: Upload },
      { id: 'student_enrolled', label: 'Enrolled Students', icon: Users },
      { id: 'student_id_cards', label: 'Student ID Cards', icon: Award },
      { id: 'student_qr_id_cards', label: 'PVC QR ID Cards & Gate Terminal', icon: QrCode },
      { id: 'student_transfers', label: 'Transfers & Leaving Certs', icon: ArrowRightLeft },
      { id: 'graduated_batch_registry', label: 'Graduated Batch (BECE / WASSCE)', icon: GraduationCap },
      { id: 'student_attendance', label: 'Student Attendance', icon: ClipboardCheck },
      { id: 'discipline', label: 'Discipline & Conduct', icon: ShieldCheck },
      { id: 'student_promote', label: 'Promote Students', icon: ArrowUpRight },
      { id: 'student_promotion_history', label: 'Promotion History', icon: History },
    ]
  },
  {
    id: 'exam',
    title: 'Examination Management',
    icon: Award,
    items: [
      { id: 'continuous_assessment_gradebook', label: 'Continuous Assessment (CA) Gradebook', icon: Award },
      { id: 'algorithmic_timetable', label: 'Master Timetable Generator', icon: Clock },
      { id: 'exam_timetable', label: 'Exam Timetable & Schedule', icon: Calendar },
      { id: 'admin_terminal_reports', label: 'Terminal Reports & Broadcast', icon: Award },
      { id: 'student_transcript', label: "Students' Transcripts", icon: Award },
      { id: 'score_approvals', label: 'Score Approvals & Endorsement', icon: CheckCircle2 },
      { id: 'exam_grading_system', label: 'Grading System', icon: Award },
      { id: 'exam_score_conversion', label: 'Score Conversion', icon: Layers },
      { id: 'exam_enter_results', label: 'Enter Results', icon: FileText },
      { id: 'exam_report_sheets', label: 'Exam Report Sheets', icon: BookOpen },
      { id: 'class_broadcast_console', label: 'Report Card Broadcast Console', icon: Send },
    ]
  },
  {
    id: 'fee',
    title: 'Fee Management',
    icon: DollarSign,
    items: [
      { id: 'financial_reconciliation', label: 'Financial Reconciliation', icon: Scale },
      { id: 'financial_audit', label: 'Financial Records Audit', icon: ShieldCheck },
      { id: 'audit_trail', label: 'Financial Audit Trail', icon: ShieldCheck },
      { id: 'term_closure_wizard', label: 'End-of-Term Closure & Roll-Over', icon: Lock },
      { id: 'parent_momo_checkout', label: 'Parent Mobile Money Checkout', icon: Smartphone },
      { id: 'departmental_financial_summary', label: 'Departmental Financial Summary', icon: Building2 },
      { id: 'institutional_expenses', label: 'Institutional Expenses', icon: Wallet },
      { id: 'payment_settings', label: 'Payment Channels & Proofs', icon: CreditCard },
      { id: 'fee_options', label: 'Fee Settings & Tariffs', icon: CreditCard },
      { id: 'fee_bill_students', label: 'Bill Students', icon: FileText },
      { id: 'fee_generate_sheets', label: 'Generate All Sheets', icon: Layers },
      { id: 'fee_collection', label: 'Fee Collection', icon: DollarSign },
      { id: 'fee_bulk_entry', label: 'Bulk Fee & Billing Entry', icon: FileText },
      { id: 'fee_refunds', label: 'Fee Refunds & Adjustments', icon: RefreshCw },
      { id: 'fee_payment_history', label: 'Payment History', icon: Calendar },
      { id: 'fee_payment_stats', label: 'Payment Statistics', icon: BarChart3 },
      { id: 'fee_income_expenses', label: 'Income & Expenses', icon: Wallet },
      { id: 'fee_overdue_alerts', label: 'Overdue Fee Alerts', icon: AlertCircle },
      { id: 'fee_next_term_bills', label: 'Next Term Fees Bill', icon: Layers },
      { id: 'fee_generate_receipt', label: 'Generate Receipt', icon: FileText },
      { id: 'fee_audit_activity', label: 'Audit Activity', icon: Shield },
    ]
  },
  {
    id: 'payroll',
    title: 'Staff Payroll System',
    icon: Wallet,
    items: [
      { id: 'payroll_dashboard', label: 'Staff Payroll Overview', icon: LayoutDashboard },
      { id: 'payroll_runs', label: 'Monthly Payroll Batches', icon: Calendar },
      { id: 'payroll_structures', label: 'Faculty Salary Structures', icon: Users },
      { id: 'payroll_payslips', label: 'Official Staff Payslips', icon: FileText },
      { id: 'payroll_loans', label: 'Loans & Salary Advances', icon: CreditCard },
      { id: 'payroll_settings', label: 'Payroll & Pension Settings', icon: Settings },
    ]
  },
  {
    id: 'notif',
    title: 'Notifications & SMS',
    icon: Bell,
    items: [
      { id: 'notif_send', label: 'Send Notification', icon: Bell },
      { id: 'whatsapp_dispatch_center', label: 'WhatsApp & SMS Fee Dispatch', icon: MessageSquare },
      { id: 'whatsapp_broadcast', label: 'WhatsApp Broadcast', icon: MessageCircle },
      { id: 'whatsapp_groups', label: 'WhatsApp Groups', icon: Users },
      { id: 'whatsapp_history', label: 'WhatsApp Logs', icon: History },
      { id: 'communications', label: 'AI Smart Broadcasts', icon: Send },
      { id: 'notif_history', label: 'Notification History', icon: FileText },
      { id: 'sms_compose', label: 'Compose SMS', icon: MessageSquare },
      { id: 'sms_history', label: 'SMS History', icon: MessageSquare },
    ]
  },
  {
    id: 'logs',
    title: 'Activity Logs',
    icon: Shield,
    items: [
      { id: 'logs_student', label: 'Student Login History', icon: Users },
      { id: 'logs_user', label: 'User Login History', icon: Shield },
    ]
  },
  {
    id: 'resources',
    title: 'School Resources & Amenities',
    icon: Layers,
    items: [
      { id: 'canteen_pos', label: 'Canteen POS & Meal Cards', icon: Utensils },
      { id: 'library_assets', label: 'Library & Asset Manager', icon: Layers },
      { id: 'boarding_management', label: 'Hostel & Boarding Rooms', icon: Building2 },
    ]
  }
];

export default function AdminPortal({
  currentUser: propCurrentUser,
  isLoading = false,
  themePalette,
  onUpdateThemePalette,
  students: propStudents,
  teachers: propTeachers,
  reports,
  bills: propBills,
  payments: propPayments,
  calendarEvents,
  notifications,
  classFeeTariffs,
  broadcasts = [],
  loginLogs,
  academicYears,
  terms,
  departments,
  courses = [],
  classes,
  houses,
  subjects,
  onAddStudent,
  onUpdateStudent,
  onDeleteStudent,
  onAddTeacher,
  onUpdateTeacher,
  onDeleteTeacher,
  onUpdateAcademicYears,
  onUpdateTerms,
  onUpdateDepartments,
  onUpdateCourses,
  onUpdateClasses,
  onUpdateHouses,
  onUpdateSubjects,
  onAddEvent,
  onAddPayment,
  onUpdateReports,
  onUpdateBroadcasts,
  onAddNotification,
  onUpdateNotifications,
  onRestoreData,
  onLogout,
  onCleanOrphaned,
  onClearAllData,
  onLoginAsUser
}: AdminPortalProps) {
  const { t } = useI18n();
  
  // Persistent active module: reloads current page directly on refresh from URL hash or localStorage
  const [activeModule, setActiveModule] = useState<string>(() => {
    if (localStorage.getItem('jipas_force_dashboard') === 'true') {
      localStorage.removeItem('jipas_force_dashboard');
      window.location.hash = 'dashboard';
      return 'dashboard';
    }
    const rawHash = window.location.hash.replace('#', '');
    const hash = normalizeAdminModuleId(rawHash);
    if (hash && VALID_ADMIN_MODULES.has(hash)) return hash;
    const rawSaved = localStorage.getItem('jipas_active_page_admin');
    const saved = normalizeAdminModuleId(rawSaved || '');
    if (saved && VALID_ADMIN_MODULES.has(saved)) return saved;
    return 'dashboard';
  });

  const [showGettingStartedTour, setShowGettingStartedTour] = useState<boolean>(() => {
    try {
      return localStorage.getItem('jipas_onboarding_completed') !== 'true';
    } catch (e) {
      return false;
    }
  });

  const [rawExpenses] = useState(() => getStoredExpenses());
  const activePeriod = getActiveAcademicPeriod();

  // Campus Multi-Campus State and shadow filters
  const [selectedCampus, setSelectedCampus] = useState<'General' | 'JIPAS 1' | 'JIPAS 2'>(() => {
    return getActiveCampus();
  });

  useEffect(() => {
    const handleEvent = () => {
      setSelectedCampus(getActiveCampus());
    };
    window.addEventListener('jipas_campus_changed', handleEvent);
    return () => window.removeEventListener('jipas_campus_changed', handleEvent);
  }, []);

  // Listen for attendance scanner exit to return to dashboard
  useEffect(() => {
    const handleExit = () => {
      setActiveModule('dashboard');
    };
    window.addEventListener('jipas_exit_to_dashboard', handleExit);
    return () => window.removeEventListener('jipas_exit_to_dashboard', handleExit);
  }, []);

  const handleCampusChange = (campus: 'General' | 'JIPAS 1' | 'JIPAS 2') => {
    setSelectedCampus(campus);
    setActiveCampus(campus);
  };

  const students = useMemo(() => {
    return filterStudentsByCampus(propStudents, selectedCampus);
  }, [propStudents, selectedCampus]);

  const teachers = useMemo(() => {
    return filterTeachersByCampus(propTeachers, selectedCampus);
  }, [propTeachers, selectedCampus]);

  const bills = useMemo(() => {
    return filterBillsByCampus(propBills, propStudents, selectedCampus);
  }, [propBills, propStudents, selectedCampus]);

  const payments = useMemo(() => {
    return filterPaymentsByCampus(propPayments, propStudents, selectedCampus);
  }, [propPayments, propStudents, selectedCampus]);

  const expenses = useMemo(() => {
    return filterExpensesByCampus(rawExpenses, selectedCampus);
  }, [rawExpenses, selectedCampus]);

  // Collapsible Sidebar State Management
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      return false;
    }
    try {
      const saved = localStorage.getItem('jipas_admin_sidebar_open');
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('jipas_admin_sidebar_collapsed');
      return saved !== null ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });


  const toggleSidebar = (openState: boolean) => {
    setIsSidebarOpen(openState);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('jipas_admin_sidebar_open', JSON.stringify(openState));
      } catch {}
    }
  };

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('jipas_admin_sidebar_collapsed', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Accordion category collapse/expand state - collapsed by default for a clean, professional sidebar layout
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  const [menuFilter, setMenuFilter] = useState('');
  const [selectedStudentForFees, setSelectedStudentForFees] = useState<Student | null>(null);
  const [isManualOpen, setIsManualOpen] = useState(false);

  const [currentUser, setCurrentUser] = useState<any>(() => {
    if (propCurrentUser) return propCurrentUser;
    try {
      const stored = localStorage.getItem('jipas_current_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (propCurrentUser) {
      setCurrentUser(propCurrentUser);
    }
  }, [propCurrentUser]);

  const filteredNavGroups = ADMIN_NAV_GROUPS.map(group => {
    if (currentUser?.role === 'sub_admin' && Array.isArray(currentUser?.allowedModules) && currentUser.allowedModules.length > 0) {
      const allowedItems = group.items.filter(item => {
        return currentUser.allowedModules.some((mod: string) => {
          if (!mod) return false;
          const cleanMod = mod.toLowerCase().trim();
          const cleanGroupId = group.id.toLowerCase().trim();
          const cleanItemId = item.id.toLowerCase().trim();

          if (cleanMod === cleanGroupId || cleanMod === cleanItemId) return true;
          if (cleanGroupId === 'setup' && (cleanMod === 'setup_management' || cleanMod.startsWith('setup') || cleanMod === 'academic_setup')) return true;
          if (cleanGroupId === 'system' && (cleanMod === 'system_settings' || cleanMod.startsWith('system') || cleanMod === 'settings')) return true;
          if (cleanGroupId === 'teacher' && (cleanMod === 'teachers' || cleanMod.startsWith('teacher') || cleanMod === 'faculty')) return true;
          if (cleanGroupId === 'student' && (cleanMod === 'students' || cleanMod.startsWith('student') || cleanMod === 'enrollment')) return true;
          if (cleanGroupId === 'exam' && (cleanMod === 'exams' || cleanMod.startsWith('exam') || cleanMod === 'academics')) return true;
          if (cleanGroupId === 'fee' && (cleanMod === 'fees' || cleanMod.startsWith('fee') || cleanMod === 'finance' || cleanMod === 'bills' || cleanMod === 'payments')) return true;
          if (cleanGroupId === 'notif' && (cleanMod === 'notif_send' || cleanMod.startsWith('notif') || cleanMod.startsWith('sms') || cleanMod.startsWith('whatsapp') || cleanMod === 'broadcast')) return true;
          if (cleanGroupId === 'logs' && (cleanMod === 'logs_user' || cleanMod.startsWith('logs') || cleanMod === 'audit')) return true;
          return cleanItemId.includes(cleanMod) || cleanMod.includes(cleanItemId);
        });
      });
      return { ...group, items: allowedItems };
    }
    return group;
  }).filter(group => group.items.length > 0);

  // Sync active module with URL hash and localStorage so refresh keeps the exact current page
  useEffect(() => {
    window.location.hash = activeModule;
    try {
      localStorage.setItem('jipas_active_page_admin', activeModule);
    } catch (e) {
      console.warn('Could not save active page:', e);
    }
  }, [activeModule]);

  // Listen to hash changes (for browser back/forward buttons)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash && VALID_ADMIN_MODULES.has(hash)) {
        setActiveModule(hash);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Persist sidebar open state
  useEffect(() => {
    try {
      localStorage.setItem('jipas_admin_sidebar_open', JSON.stringify(isSidebarOpen));
    } catch (e) {
      console.warn('Could not save sidebar preference:', e);
    }
  }, [isSidebarOpen]);

  const toggleCategory = (catId: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [catId]: !prev[catId]
    }));
  };

  const [hasDemoData, setHasDemoData] = useState<boolean>(true);
  const [isClearingDemo, setIsClearingDemo] = useState<boolean>(false);
  const [showClearDemoModal, setShowClearDemoModal] = useState<boolean>(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState<string>('');
  const [clearProgressPercent, setClearProgressPercent] = useState<number>(0);
  const [clearCurrentStep, setClearCurrentStep] = useState<string>('');

  useEffect(() => {
    checkHasDemoData().then(val => {
      setHasDemoData(val);
    });
  }, []);

  const handleConfirmClearDemoData = async () => {
    if (deleteConfirmText.trim().toUpperCase() !== 'DELETE') return;
    setIsClearingDemo(true);
    setClearProgressPercent(0);
    setClearCurrentStep('Initializing database purge...');
    try {
      await clearDemoData((pct, col) => {
        setClearProgressPercent(pct);
        setClearCurrentStep(`Purging collection: ${col}`);
      });
      setHasDemoData(false);
      
      // Update memory state across all modules
      if (onClearAllData) {
        onClearAllData();
      }
      onUpdateAcademicYears([]);
      onUpdateTerms([]);
      onUpdateDepartments([]);
      onUpdateClasses([]);
      onUpdateHouses([]);
      onUpdateSubjects([]);
      if (onUpdateCourses) onUpdateCourses([]);
      if (onUpdateReports) onUpdateReports([]);
      
      setTimeout(() => {
        setIsClearingDemo(false);
        setShowClearDemoModal(false);
        setDeleteConfirmText('');
        setClearProgressPercent(0);
        alert("All records, students, fees, and staff data have been permanently cleared from Supabase and local storage.");
      }, 500);
    } catch (err) {
      console.error('Failed to clear demo data:', err);
      alert("Failed to clear demo data. Please check your network connection.");
      setIsClearingDemo(false);
    }
  };

  // Financial calculations: Scoped strictly to active non-deleted students
  const activeStudentIds = useMemo(() => new Set(students.map(s => s.id)), [students]);
  const activeAdmissionNos = useMemo(() => new Set(students.map(s => (s.admissionNo || '').toLowerCase().trim()).filter(Boolean)), [students]);

  const activeStudentPayments = useMemo(() => {
    return payments.filter(p => activeStudentIds.has(p.studentId) || (p.admissionNo && activeAdmissionNos.has(p.admissionNo.toLowerCase().trim())));
  }, [payments, activeStudentIds, activeAdmissionNos]);

  const activeStudentBills = useMemo(() => {
    const rawBills = bills.filter(b => activeStudentIds.has(b.studentId) || (b.admissionNo && activeAdmissionNos.has(b.admissionNo.toLowerCase().trim())));
    return syncAllBillsWithPayments(rawBills, activeStudentPayments);
  }, [bills, activeStudentPayments, activeStudentIds, activeAdmissionNos]);

  const totalRevenue = useMemo(() => addMoney(...activeStudentPayments.map(p => p.paid ?? p.amount ?? 0)), [activeStudentPayments]);
  const totalBilled = useMemo(() => addMoney(...activeStudentBills.map(b => b.payable ?? b.subTotal ?? 0)), [activeStudentBills]);
  const totalPending = useMemo(() => Math.max(0, subtractMoney(totalBilled, totalRevenue)), [totalBilled, totalRevenue]);
  
  // Notification calculations
  const unreadNotifications = notifications.filter(n => !n.read).length;

  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupSuccess, setBackupSuccess] = useState(false);

  const handleBackupDatabase = () => {
    setIsBackingUp(true);
    try {
      const backupPayload = {
        meta: {
          system: 'JIPAS School Management System',
          version: '2026.3.1',
          exportedAt: new Date().toISOString(),
          schoolMotto: 'Education is Wealth',
          environment: 'Admin Manual Backup'
        },
        data: {
          students,
          teachers,
          reports,
          bills,
          payments,
          calendarEvents,
          notifications
        },
        counts: {
          students: students.length,
          teachers: teachers.length,
          reports: reports.length,
          bills: bills.length,
          payments: payments.length,
          events: calendarEvents.length
        }
      };

      const jsonStr = JSON.stringify(backupPayload, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.download = `jipas_db_backup_${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setBackupSuccess(true);
      setTimeout(() => setBackupSuccess(false), 4000);
    } catch (err: any) {
      alert(`Database backup failed: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleDashboardBulkExport = () => {
    try {
      const exportRows = students.map(s => {
        const studentReports = (reports || []).filter(r => r.admissionNo === s.admissionNo || r.studentId === s.id);
        const latestReport = studentReports[studentReports.length - 1];
        return {
          'Admission No': s.admissionNo,
          'Full Name': s.fullName,
          'Gender': s.gender,
          'Date of Birth': s.dob,
          'Department': s.department,
          'Class Name': s.className,
          'House': s.house,
          'Parent Name': s.parentName,
          'Parent Phone': s.parentPhone,
          'Status': s.status,
          'Academic Year': s.academicYear,
          'Term': s.term,
          'Total Academic Reports': studentReports.length,
          'Latest Total Score': latestReport ? latestReport.totalScore : '--',
          'Latest Average': latestReport ? latestReport.averageScore : '--',
          'Latest Position': latestReport ? latestReport.position : '--',
          'Promotion Status': latestReport ? (latestReport.promotionStatus || '--') : '--'
        };
      });

      if (exportRows.length === 0) {
        alert('No student records available to export.');
        return;
      }

      const headers = Object.keys(exportRows[0]);
      const csvRows = [headers.join(',')];
      for (const row of exportRows) {
        const values = headers.map(h => {
          const val = (row as any)[h];
          const escaped = ('' + (val ?? '')).replace(/"/g, '""');
          return `"${escaped}"`;
        });
        csvRows.push(values.join(','));
      }

      const csvString = csvRows.join('\n');
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.download = `jipas_dashboard_bulk_student_academic_archive_${dateStr}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Bulk export failed: ${err?.message || 'Unknown error'}`);
    }
  };

  const [isCleaningOrphaned, setIsCleaningOrphaned] = useState(false);
  const [cleanSuccessMsg, setCleanSuccessMsg] = useState('');

  const handleQuickClean = async () => {
    if (!onCleanOrphaned) {
      alert("Database cleaning is currently unavailable.");
      return;
    }
    if (confirm("Are you sure you want to run 'Quick Clean'? This will find and permanently delete any bills or terminal reports belonging to student IDs that no longer exist in the system. This action cannot be undone.")) {
      setIsCleaningOrphaned(true);
      setCleanSuccessMsg('');
      try {
        const result = await onCleanOrphaned();
        if (result.cleanedBillsCount === 0 && result.cleanedReportsCount === 0) {
          setCleanSuccessMsg("No orphaned records found. System is already clean! ✨");
        } else {
          setCleanSuccessMsg(`Clean completed! Removed ${result.cleanedBillsCount} orphaned bills and ${result.cleanedReportsCount} orphaned reports. 🧹`);
        }
        setTimeout(() => setCleanSuccessMsg(''), 6000);
      } catch (err: any) {
        alert(`Failed to clean orphaned records: ${err?.message || 'Unknown error'}`);
      } finally {
        setIsCleaningOrphaned(false);
      }
    }
  };

  // Centralized Force Full Cloud Sync state and handler
  const [isFullSyncing, setIsFullSyncing] = useState<boolean>(false);
  const [fullSyncSuccess, setFullSyncSuccess] = useState<boolean>(false);
  const [fullSyncFeedback, setFullSyncFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleForceFullCloudSync = async () => {
    if (isFullSyncing) return;
    setIsFullSyncing(true);
    setFullSyncFeedback(null);
    try {
      const success = await forceSyncCollections(currentUser?.role || 'admin');
      if (success) {
        setFullSyncSuccess(true);
        setFullSyncFeedback({
          type: 'success',
          message: 'Full Cloud Sync Successful: All collections and data providers (Supabase Cloud, Firebase Firestore, IndexedDB) are synchronized across all connected devices.'
        });
        setTimeout(() => setFullSyncSuccess(false), 4000);
        setTimeout(() => setFullSyncFeedback(null), 6000);
      } else {
        setFullSyncFeedback({
          type: 'error',
          message: 'Cloud synchronization completed with warnings or device is offline. Please check network connectivity.'
        });
        setTimeout(() => setFullSyncFeedback(null), 6000);
      }
    } catch (err: any) {
      console.error('[AdminPortal] Force full cloud sync failed:', err);
      setFullSyncFeedback({
        type: 'error',
        message: `Sync failed: ${err?.message || 'Network error'}`
      });
      setTimeout(() => setFullSyncFeedback(null), 6000);
    } finally {
      setIsFullSyncing(false);
    }
  };

  // Quick module switcher helper
  const handleNavigate = (mod: string) => {
    const target = normalizeAdminModuleId(mod);
    setActiveModule(target);
    // Auto-hide sidebar after selecting an item only on mobile screen widths
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleQuickAction = (actionKey: string) => {
    switch (actionKey) {
      case 'student_add':
        handleNavigate('student_enroll');
        break;
      case 'teacher_add':
        handleNavigate('teacher_profile');
        break;
      case 'score_entry':
        handleNavigate('exam_enter_results');
        break;
      case 'send_notif':
        handleNavigate('notif_send');
        break;
      case 'create_bill':
        handleNavigate('fee_bill_students');
        break;
      case 'print_reports':
        handleNavigate('exam_report_sheets');
        break;
      default:
        break;
    }
  };

  const markAllNotificationsAsRead = () => {
    if (onUpdateNotifications) {
      const updated = notifications.map(n => ({ ...n, read: true }));
      onUpdateNotifications(updated);
    }
  };

  return (
    <div className="relative flex flex-col lg:flex-row gap-6 w-full">
      {/* Mobile Backdrop Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-40 lg:hidden transition-opacity"
          onClick={() => toggleSidebar(false)}
          aria-hidden="true"
        />
      )}

      {/* RESPONSIVE NAVIGATION SIDEBAR: Full slide-over drawer on mobile, collapsible docked sticky sidebar on desktop */}
      {isSidebarOpen && (
        <aside
          id="jipas-admin-sidebar"
          className={`fixed inset-y-0 left-0 z-50 ${
            isSidebarCollapsed ? 'lg:w-20' : 'w-72 max-w-[85vw] lg:w-64 xl:w-72'
          } h-full bg-[#070D1E]/95 text-slate-300 shadow-2xl flex flex-col border-r border-blue-950/80 lg:static lg:inset-auto lg:z-30 lg:shrink-0 lg:sticky lg:top-24 lg:max-h-[calc(100vh-6.5rem)] lg:rounded-2xl lg:border lg:border-blue-900/40 overflow-hidden backdrop-blur-md transition-all duration-300`}
          aria-label="Admin Navigation Sidebar"
        >
          {/* Header with static collapse and close toggles */}
          <div className="p-3.5 border-b border-blue-950/80 flex items-center justify-between shrink-0 bg-[#050A18]/80">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <img 
                src={getSchoolLogo()} 
                alt="JIPAS Crest" 
                className="w-8 h-8 object-contain shrink-0" 
                onError={(e) => { e.currentTarget.src = '/logo.png'; }}
              />
              {!isSidebarCollapsed && (
                <div className="whitespace-nowrap overflow-hidden">
                  <h2 className="text-xs font-bold text-white tracking-wide flex items-center gap-1.5">
                    JIPAS Portal
                  </h2>
                  <p className="text-[10px] text-indigo-400 font-medium">Administrator Console</p>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-1 shrink-0">
              {/* Mobile Close Drawer button */}
              <button
                onClick={() => toggleSidebar(false)}
                title="Close Navigation Menu"
                id="jipas-static-sidebar-close-btn"
                className="lg:hidden p-1.5 text-slate-400 hover:text-white hover:bg-slate-800/60 rounded-lg transition-colors cursor-pointer border border-slate-700/50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Search/Filter Bar for Fast Access (Only in expanded mode) */}
          {!isSidebarCollapsed && (
            <div className="px-3 pt-2.5 pb-1 shrink-0">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
                <input
                  type="text"
                  value={menuFilter}
                  onChange={(e) => setMenuFilter(e.target.value)}
                  placeholder="Filter menu items..."
                  className="w-full pl-8 pr-2.5 py-1.5 bg-[#0A142A] border border-blue-900/50 rounded-xl text-[11px] text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* Scrollable Navigation Groups */}
          <div className="flex-1 overflow-y-auto px-2.5 py-2 space-y-1.5 text-xs font-medium scrollbar-thin scrollbar-thumb-slate-700">
            {/* Dashboard Link */}
            <button
              onClick={() => { handleNavigate('dashboard'); toggleSidebar(false); }}
              title="Dashboard Overview"
              className={`w-full flex flex-col items-center justify-center p-2.5 rounded-2xl transition-all cursor-pointer text-center ${
                activeModule === 'dashboard'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow-lg shadow-blue-500/30 border border-blue-400'
                  : 'bg-[#0A142A]/90 hover:bg-slate-800/80 text-slate-300 hover:text-white border border-blue-900/40'
              }`}
            >
              <LayoutDashboard className={`w-5 h-5 mb-0.5 ${activeModule === 'dashboard' ? 'text-white' : 'text-blue-400'}`} />
              {!isSidebarCollapsed && <span className="text-xs font-bold">Dashboard Overview</span>}
            </button>

            {/* In Collapsed Mode: Compact Icon Group Rail with Direct Navigation */}
            {isSidebarCollapsed ? (
              <div className="space-y-1.5 pt-1">
                {filteredNavGroups.map((group) => {
                  const GroupIcon = (group.icon || LayoutDashboard) as any;
                  const hasActiveChild = group.items.some(it => it.id === activeModule);
                  const firstItem = group.items[0];

                  return (
                    <button
                      key={group.id}
                      onClick={() => {
                        if (group.id === 'fee') {
                          handleNavigate('fee_collection');
                          toggleSidebar(false);
                        } else if (firstItem) {
                          handleNavigate(firstItem.id);
                          toggleSidebar(false);
                        }
                      }}
                      title={`${group.title}: ${(group.items || []).map(i => i.label).join(', ')}`}
                      className={`w-full flex flex-col items-center justify-center p-2.5 rounded-xl transition-all cursor-pointer text-center relative ${
                        hasActiveChild
                          ? 'bg-blue-600/90 text-white font-bold shadow-md shadow-blue-500/30 border border-blue-400'
                          : 'bg-[#0A142A]/90 hover:bg-slate-800/80 text-slate-300 hover:text-white border border-blue-900/40'
                      }`}
                    >
                      <GroupIcon className={`w-5 h-5 ${hasActiveChild ? 'text-white' : 'text-blue-400'}`} />
                      <span className="text-[8px] font-black uppercase mt-1 truncate max-w-full">
                        {group.id}
                      </span>
                      {hasActiveChild && (
                        <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-blue-900" />
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              /* Expanded Mode Accordion Categories */
              <div className="space-y-1.5">
                {filteredNavGroups.map((group) => {
                  const GroupIcon = (group.icon || LayoutDashboard) as any;
                  const hasActiveChild = group.items.some(it => it.id === activeModule);
                  const filteredItems = menuFilter.trim()
                    ? group.items.filter(it => it.label.toLowerCase().includes(menuFilter.toLowerCase()))
                    : group.items;

                  if (menuFilter.trim() && filteredItems.length === 0) {
                    return null;
                  }

                  const isExpanded = menuFilter.trim() ? true : (expandedCategories[group.id] !== undefined ? expandedCategories[group.id] : hasActiveChild);

                  return (
                    <div key={group.id} className="border border-blue-950/70 rounded-xl overflow-hidden bg-[#0A1329]/50">
                      <button
                        onClick={() => {
                          toggleCategory(group.id);
                          if (!hasActiveChild) {
                            if (group.id === 'fee') {
                              handleNavigate('fee_collection');
                            } else if (filteredItems[0]) {
                              handleNavigate(filteredItems[0].id);
                            }
                          }
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-2 text-left transition-colors cursor-pointer ${
                          hasActiveChild
                            ? 'bg-blue-950/70 text-blue-300 font-bold'
                            : 'hover:bg-slate-800/60 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider">
                          <GroupIcon className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          <span className="whitespace-nowrap">{group.title}</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-slate-800/80 text-slate-400">
                            {group.items.length}
                          </span>
                          {isExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                          )}
                        </span>
                      </button>

                      {isExpanded && (
                        <div className="grid grid-cols-2 gap-2 p-2 bg-[#050A18]/80 border-t border-blue-950/60">
                          {filteredItems.map(item => {
                            const ItemIcon = (item.icon || LayoutDashboard) as any;
                            const isSelected = activeModule === item.id;
                            return (
                              <button
                                key={item.id}
                                onClick={() => { handleNavigate(item.id); toggleSidebar(false); }}
                                className={`flex flex-col items-center justify-center p-2.5 rounded-xl text-center transition-all cursor-pointer min-h-[66px] ${
                                  isSelected
                                    ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-bold shadow-md shadow-blue-500/25 border border-blue-400'
                                    : 'bg-[#0A142A]/90 hover:bg-slate-800/90 text-slate-300 hover:text-white border border-blue-900/30'
                                }`}
                              >
                                <ItemIcon className={`w-5 h-5 mb-1 shrink-0 ${isSelected ? 'text-white' : 'text-blue-400'}`} />
                                <span className="text-[10px] font-extrabold leading-tight text-center line-clamp-2 w-full">{item.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Logout button at bottom of sidebar */}
            <div className="pt-2 border-t border-blue-950/80">
              <button
                onClick={() => {
                  if (window.confirm('Are you sure you want to log out of JIPAS?')) {
                    onLogout?.();
                  }
                }}
                className={`w-full flex items-center ${
                  isSidebarCollapsed ? 'justify-center p-2' : 'gap-2 px-3 py-2'
                } rounded-xl text-rose-500 hover:bg-rose-950/30 hover:text-rose-400 transition-colors text-xs font-bold cursor-pointer`}
                title="Déconnexion"
              >
                <LogOut className="w-4 h-4 text-rose-500 shrink-0" />
                {!isSidebarCollapsed && <span>Déconnexion</span>}
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 min-w-0 w-full space-y-6">
        {/* Top Action Bar: Search Bar, Sidebar Toggle & Presentation Button */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 w-full px-1">
            {/* Header Sidebar Collapse/Expand Toggle Button & Campus Switcher */}
          <div className="flex flex-wrap items-center gap-3">
            <SidebarToggleButton
              isOpen={isSidebarOpen}
              isCollapsed={isSidebarCollapsed}
              onToggle={(e) => {
                const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
                if (isMobile) {
                  toggleSidebar(!isSidebarOpen);
                } else {
                  if (!isSidebarOpen) {
                    toggleSidebar(true);
                  } else {
                    toggleSidebarCollapse();
                  }
                }
              }}
              label={
                typeof window !== 'undefined' && window.innerWidth < 1024
                  ? (isSidebarOpen ? "Close Menu" : "Open Menu")
                  : (!isSidebarOpen ? "Open Menu" : isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar")
              }
            />
          </div>

          <div className="flex items-center gap-2.5 flex-1 max-w-2xl justify-end">
            <GlobalSearchHeader
              students={students}
              teachers={teachers}
              bills={bills}
              payments={payments}
              classFeeTariffs={classFeeTariffs}
              navGroups={ADMIN_NAV_GROUPS}
              userRole="admin"
              onNavigate={(modId) => handleNavigate(modId)}
              onSelectStudentForReport={(student) => {
                handleNavigate('terminal_reports');
              }}
              onSelectStudentForPayment={(student) => {
                handleNavigate('fee_bill_students');
              }}
              placeholder="Search students, teachers, fee bills, receipts, settings..."
            />

            {/* User Manual Download & Viewer Button */}
            <button
              onClick={() => setIsManualOpen(true)}
              id="admin-header-user-manual-btn"
              title="Open and download official JIPAS SMSys User Manual (v2.6)"
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-md transition-all cursor-pointer shrink-0 border border-indigo-300 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 text-indigo-700 dark:text-indigo-200 select-none"
            >
              <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span className="hidden lg:inline font-black">User Manual</span>
            </button>

            {/* Centralized Force Full Cloud Sync Button in Header */}
            <button
              onClick={handleForceFullCloudSync}
              disabled={isFullSyncing}
              id="admin-header-force-cloud-sync-btn"
              title="Force Full Cloud Sync: Synchronizes Supabase Cloud, Firebase Firestore, and local IndexedDB state across all connected computers"
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-md transition-all cursor-pointer shrink-0 border select-none ${
                isFullSyncing
                  ? 'bg-blue-600 text-white border-blue-400 ring-2 ring-blue-400/40 animate-pulse'
                  : fullSyncSuccess
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-400 ring-2 ring-emerald-500/30'
                  : 'bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-600 hover:to-indigo-600 text-white border-blue-500/70 hover:shadow-lg hover:shadow-blue-500/20 active:scale-98'
              }`}
            >
              <RefreshCw className={`w-4 h-4 shrink-0 ${isFullSyncing ? 'animate-spin' : ''}`} />
              <span className="hidden md:inline font-black tracking-wide">
                {isFullSyncing ? 'Syncing Clouds...' : fullSyncSuccess ? 'Synced! ✓' : 'Force Full Cloud Sync'}
              </span>
              <span className="md:hidden font-black">
                {isFullSyncing ? 'Syncing...' : fullSyncSuccess ? 'Synced ✓' : 'Cloud Sync'}
              </span>
            </button>
          </div>
        </div>

        {/* Centralized Cloud Sync Feedback Alert */}
        {fullSyncFeedback && (
          <div
            className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-xs sm:text-sm font-bold shadow-lg border transition-all animate-fadeIn ${
              fullSyncFeedback.type === 'success'
                ? 'bg-emerald-950/90 text-emerald-200 border-emerald-700/80 shadow-emerald-950/30'
                : 'bg-rose-950/90 text-rose-200 border-rose-700/80 shadow-rose-950/30'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {fullSyncFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{fullSyncFeedback.message}</span>
            </div>
            <button
              onClick={() => setFullSyncFeedback(null)}
              className="text-white/70 hover:text-white p-1 rounded-md transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Top Header Banner - Only show on dashboard */}
        {activeModule === 'dashboard' && (
          <div className="relative overflow-hidden bg-slate-900 text-white rounded-2xl p-6 shadow-xl flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6 border border-indigo-900/40 w-full">
            {/* School Wallpaper Backdrop with Gradient Overlay */}
            <div 
              className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-luminosity scale-105 pointer-events-none"
              style={{ backgroundImage: `url('/wallpapers/classroom.jpg')` }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-blue-950/95 via-indigo-950/90 to-slate-950/85 pointer-events-none" />

            <div className="relative z-10 flex items-center gap-4">
              <JIPASLogo size="lg" className="shrink-0 drop-shadow-md" />
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="bg-white/20 text-white text-xs font-bold px-2.5 py-0.5 rounded-full backdrop-blur-xs">
                    JIPAS
                  </span>
                  <span className="bg-emerald-500 text-white text-xs font-bold px-2.5 py-0.5 rounded-full shadow-xs">
                    Active Term: {activePeriod.academicTerm} {activePeriod.academicYear}
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight drop-shadow-sm">
                  School Management System Dashboard
                </h1>
                <p className="text-blue-200 text-xs mt-1">
                  01 BP. 2364 • Tél. (00228) 22 60 21 38 / 99 47 38 23 / 90 83 60 48 • Kpéhénou N°1 Behind T-Oil Filling Station and Hedzranawoe 4th Corner after Radio Maria, Lomé — Togo • joyjipas2002@gmail.com • Motto: Education is Wealth
                </p>
              </div>
            </div>

            <div className="relative z-10 flex flex-wrap items-center gap-2.5 sm:gap-3 w-full xl:w-auto justify-start xl:justify-end">
              <button
                onClick={() => setShowGettingStartedTour(true)}
                id="admin-getting-started-btn"
                className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black shadow-lg shadow-amber-500/20 transition-all cursor-pointer border border-amber-400/60"
                title="Open interactive Getting Started walkthrough guide"
              >
                <Compass className="w-4 h-4 text-slate-950" />
                <span>Getting Started Guide</span>
              </button>

              <button
                onClick={() => setActiveModule('staff_attendance')}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black shadow-lg transition-all cursor-pointer border border-emerald-500"
              >
                <QrCode className="w-4 h-4 text-white" />
                <span>Scan Entrance</span>
              </button>

              <button
                onClick={handleForceFullCloudSync}
                disabled={isFullSyncing}
                id="admin-banner-force-cloud-sync-btn"
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-lg transition-all cursor-pointer border ${
                  isFullSyncing
                    ? 'bg-blue-600 text-white border-blue-400 ring-2 ring-blue-400/40 animate-pulse'
                    : fullSyncSuccess
                    ? 'bg-emerald-600 hover:bg-emerald-700 border-emerald-500 text-white'
                    : 'bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-600 hover:to-indigo-600 text-white border-blue-400/60 shadow-blue-900/40'
                }`}
                title="Force synchronize all collections and data providers between computers (Computer A & Computer B)"
              >
                <RefreshCw className={`w-4 h-4 ${isFullSyncing ? 'animate-spin' : ''}`} />
                <span>{isFullSyncing ? 'Syncing All Clouds...' : fullSyncSuccess ? 'Cloud In Sync! ✓' : 'Force Full Cloud Sync'}</span>
              </button>

              <button
                onClick={() => setShowClearDemoModal(true)}
                disabled={isClearingDemo}
                id="admin-clear-demo-data-btn"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-md transition-all cursor-pointer border bg-rose-600/90 hover:bg-rose-600 border-rose-400/50 text-white"
                title="Clear all existing records, students, fees, staff and reset app"
              >
                <Trash2 className="w-4 h-4 text-white" />
                <span>{isClearingDemo ? 'Resetting...' : 'Reset & Clear All Records'}</span>
              </button>
              
              <button
                onClick={handleBackupDatabase}
                disabled={isBackingUp}
                id="admin-manual-db-backup"
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-lg transition-all cursor-pointer border ${
                  backupSuccess 
                    ? 'bg-emerald-600 hover:bg-emerald-700 border-emerald-500 text-white' 
                    : 'bg-slate-800 hover:bg-slate-750 border-slate-700/80 text-indigo-200'
                }`}
              >
                <Database className={`w-4 h-4 ${backupSuccess ? 'text-white' : 'text-indigo-400'}`} />
                <span>{isBackingUp ? 'Compiling JSON...' : backupSuccess ? 'Backup Downloaded! ✓' : 'Backup Database'}</span>
              </button>

              <button
                onClick={handleQuickClean}
                disabled={isCleaningOrphaned}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-lg transition-all cursor-pointer border border-indigo-500"
              >
                <Sparkles className={`w-4 h-4 ${isCleaningOrphaned ? 'animate-spin' : ''}`} />
                <span>{isCleaningOrphaned ? 'Cleaning...' : 'Quick Clean'}</span>
              </button>

              <button
                onClick={() => setActiveModule('bulk_upload')}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-lg transition-all cursor-pointer"
              >
                <Upload className="w-4 h-4" /> Bulk CSV Import
              </button>

              <SyncNowButton variant="portal" />

              <button
                onClick={() => setActiveModule('student_enroll')}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-lg transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Enroll New Student
              </button>
            </div>
          </div>
        )}

        {cleanSuccessMsg && (
          <div className="bg-emerald-600/90 text-white px-5 py-3.5 rounded-2xl shadow-lg border border-emerald-500 flex items-center justify-between animate-fade-in text-sm font-semibold">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-5 h-5 text-emerald-200" />
              <span>{cleanSuccessMsg}</span>
            </div>
            <button
              onClick={() => setCleanSuccessMsg('')}
              className="p-1 hover:bg-emerald-700 rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4 text-emerald-100" />
            </button>
          </div>
        )}

        {/* DYNAMIC MODULE VIEWS WITH ENTRY ANIMATIONS */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeModule}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="space-y-6"
          >
            {/* 1. DASHBOARD MODULE */}
            {activeModule === 'dashboard' && (
              <div className="space-y-6">
                {/* Dashboard Header with Quick Actions & Bulk Export Button */}
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <div>
                    <h2 className="text-lg font-black text-slate-900">Administrator Dashboard & Analytics</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Overview of school enrollment, financial audit, portal governance, and academic progress.</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    {/* Direct Audit of Financial Records Button */}
                    <button
                      onClick={() => handleNavigate('financial_audit')}
                      id="admin-dashboard-audit-btn"
                      className="px-3.5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-600/20 transition-all cursor-pointer flex items-center gap-2"
                      title="Run Full Audit of Fee Collections, Balances, and Financial Discrepancies"
                    >
                      <ShieldCheck className="w-4 h-4 text-emerald-200" />
                      <span>Audit Financial Records</span>
                    </button>

                    {/* Users Portal Review Button */}
                    <button
                      onClick={() => handleNavigate('users_portal_review')}
                      id="admin-dashboard-portal-review-btn"
                      className="px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-md shadow-indigo-600/20 transition-all cursor-pointer flex items-center gap-2"
                      title="Review all 4 user portals, RBAC permissions, and active logins"
                    >
                      <Eye className="w-4 h-4 text-indigo-200" />
                      <span>Users Portal Review</span>
                    </button>

                    <button
                      onClick={handleDashboardBulkExport}
                      className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 active:scale-[0.98] text-slate-800 border border-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2"
                    >
                      <Download className="w-4 h-4 text-slate-600" />
                      <span>Export CSV</span>
                    </button>
                  </div>
                </div>

            {/* Top Stat Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 gap-4">
              <div 
                onClick={() => setActiveModule('student_enrolled')}
                className="bg-slate-800 text-white p-5 rounded-2xl shadow-sm border border-slate-700 flex items-center justify-between cursor-pointer hover:bg-slate-750 transition-colors"
              >
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{t('dashboard.totalEnrolled', 'Total Enrolled')}</p>
                  <h3 className="text-3xl font-black mt-1">{students.length}</h3>
                  <p className="text-xs text-emerald-400 font-semibold mt-1">{t('dashboard.activeStudents', 'Active Students')}</p>
                </div>
                <div className="w-12 h-12 bg-indigo-600/30 rounded-2xl flex items-center justify-center text-indigo-400">
                  <Users className="w-6 h-6" />
                </div>
              </div>

              <div 
                onClick={() => setActiveModule('fee_bill_students')}
                className="bg-purple-700 text-white p-5 rounded-2xl shadow-sm border border-purple-600 flex items-center justify-between cursor-pointer hover:bg-purple-650 transition-colors"
              >
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-purple-200">{t('dashboard.pendingPayments', 'Pending Payments')}</p>
                  <h3 className="text-3xl font-black mt-1 font-mono">{(totalPending ?? 0).toFixed(2)} CFA</h3>
                  <p className="text-xs text-purple-100 font-semibold mt-1">{t('dashboard.outstandingBalances', 'Outstanding Balances')}</p>
                </div>
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-white">
                  <DollarSign className="w-6 h-6" />
                </div>
              </div>

              <div 
                onClick={() => setActiveModule('dashboard')}
                className="bg-rose-700 text-white p-5 rounded-2xl shadow-sm border border-rose-600 flex items-center justify-between cursor-pointer hover:bg-rose-650 transition-colors"
              >
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-rose-200">{t('dashboard.newNotifications', 'New Notifications')}</p>
                  <h3 className="text-3xl font-black mt-1">{unreadNotifications}</h3>
                  <p className="text-xs text-rose-100 font-semibold mt-1">{t('dashboard.unreadAlerts', 'Unread Alerts')}</p>
                  {unreadNotifications > 0 && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); markAllNotificationsAsRead(); }}
                      className="mt-2 text-[10px] font-bold text-white bg-rose-900/40 hover:bg-rose-900/60 px-2 py-1 rounded cursor-pointer"
                    >
                      Mark All As Read
                    </button>
                  )}
                </div>
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-white">
                  <Bell className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* Quick Actions Workflow Speed Section */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-5 rounded-2xl border border-indigo-900/40 shadow-md text-white space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-indigo-300 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
                    <span>Administrative Quick Actions</span>
                  </h3>
                  <p className="text-xs text-slate-300">Direct operational shortcuts to accelerate workflow speed.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <button
                  onClick={() => setActiveModule('student_enrolled')}
                  className="p-3 bg-white/10 hover:bg-white/15 border border-white/15 rounded-xl text-left transition-all cursor-pointer flex items-center gap-3 group"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Register New Student</h4>
                    <p className="text-[10px] text-slate-300">Enroll student & assign admission</p>
                  </div>
                </button>

                <button
                  onClick={() => setActiveModule('fee_bill_students')}
                  className="p-3 bg-white/10 hover:bg-white/15 border border-white/15 rounded-xl text-left transition-all cursor-pointer flex items-center gap-3 group"
                >
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <Receipt className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Generate Fee Invoice</h4>
                    <p className="text-[10px] text-slate-300">Issue term bills & payment receipts</p>
                  </div>
                </button>

                <button
                  onClick={() => setActiveModule('send_notification')}
                  className="p-3 bg-white/10 hover:bg-white/15 border border-white/15 rounded-xl text-left transition-all cursor-pointer flex items-center gap-3 group"
                >
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <Send className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Post Teacher Announcement</h4>
                    <p className="text-[10px] text-slate-300">Broadcast updates to faculty & students</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Interactive Visual Charts Hub (Recharts) */}
            <AdminDashboardCharts
              students={students}
              teachers={teachers}
              reports={reports}
              bills={bills}
              payments={payments}
              onNavigate={(mod) => setActiveModule(mod)}
            />

            <div className="h-[400px] my-6">
              <LiveActivityFeed />
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4 mb-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" /> Quick Actions
                </h3>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => handleNavigate('student_enroll')}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-xl text-xs transition-colors cursor-pointer border border-blue-200"
                >
                  <Plus className="w-4 h-4" /> Add Student
                </button>
                <button
                  onClick={() => handleNavigate('notification_center')}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold rounded-xl text-xs transition-colors cursor-pointer border border-amber-200"
                >
                  <Bell className="w-4 h-4" /> Post Notice
                </button>
                <button
                  onClick={() => handleNavigate('new_payment')}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-xl text-xs transition-colors cursor-pointer border border-emerald-200"
                >
                  <CreditCard className="w-4 h-4" /> Quick Payment
                </button>
              </div>
            </div>

            {/* Main Admin Navigation Menus & Command Hub Grid */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    Administrative Main Menus & Command Hub
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">Click any thumbnail menu item below to open administration modules</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-3.5 pt-1">
                {isLoading ? (
                  <DashboardSkeleton />
                ) : (
                  <>
                    {/* Menu 1: Students */}
                    <button
                      onClick={() => handleNavigate('student_enrolled')}
                      className="group p-4 bg-gradient-to-br from-indigo-50/80 to-slate-50 hover:from-indigo-600 hover:to-indigo-700 border border-indigo-100 hover:border-indigo-600 rounded-2xl text-left transition-all duration-200 shadow-2xs hover:shadow-lg hover:-translate-y-1 cursor-pointer flex flex-col justify-between space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="w-10 h-10 bg-indigo-600 group-hover:bg-white text-white group-hover:text-indigo-600 rounded-xl flex items-center justify-center transition-colors shadow-xs">
                          <Users className="w-5 h-5" />
                        </div>
                        <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-indigo-100 group-hover:bg-indigo-500 text-indigo-800 group-hover:text-white uppercase tracking-wider transition-colors">
                          {students.length} Students
                        </span>
                      </div>
                      <div>
                        <h4 className="font-extrabold text-xs text-slate-900 group-hover:text-white transition-colors flex items-center gap-1">
                          Student Management
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                        </h4>
                        <p className="text-[11px] text-slate-500 group-hover:text-indigo-100 transition-colors mt-0.5 line-clamp-2">
                          Admissions, enrollment, transcript generator & class rosters
                        </p>
                      </div>
                    </button>

                    {/* Menu 2: Teachers */}
                    <button
                      onClick={() => handleNavigate('teachers')}
                      className="group p-4 bg-gradient-to-br from-emerald-50/80 to-slate-50 hover:from-emerald-600 hover:to-emerald-700 border border-emerald-100 hover:border-emerald-600 rounded-2xl text-left transition-all duration-200 shadow-2xs hover:shadow-lg hover:-translate-y-1 cursor-pointer flex flex-col justify-between space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="w-10 h-10 bg-emerald-600 group-hover:bg-white text-white group-hover:text-emerald-600 rounded-xl flex items-center justify-center transition-colors shadow-xs">
                          <UserCog className="w-5 h-5" />
                        </div>
                        <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-100 group-hover:bg-emerald-500 text-emerald-800 group-hover:text-white uppercase tracking-wider transition-colors">
                          {teachers.length} Faculty
                        </span>
                      </div>
                      <div>
                        <h4 className="font-extrabold text-xs text-slate-900 group-hover:text-white transition-colors flex items-center gap-1">
                          Teacher & Staff Portal
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                        </h4>
                        <p className="text-[11px] text-slate-500 group-hover:text-emerald-100 transition-colors mt-0.5 line-clamp-2">
                          Staff profiles, subject allocations & digital teacher ID generator
                        </p>
                      </div>
                    </button>
                  </>
                )}

                {/* Menu 3: Examination & Marks */}
                <button
                  onClick={() => handleNavigate('exam_enter_results')}
                  className="group p-4 bg-gradient-to-br from-amber-50/80 to-slate-50 hover:from-amber-600 hover:to-amber-700 border border-amber-100 hover:border-amber-600 rounded-2xl text-left transition-all duration-200 shadow-2xs hover:shadow-lg hover:-translate-y-1 cursor-pointer flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 bg-amber-600 group-hover:bg-white text-white group-hover:text-amber-600 rounded-xl flex items-center justify-center transition-colors shadow-xs">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-amber-100 group-hover:bg-amber-500 text-amber-800 group-hover:text-white uppercase tracking-wider transition-colors">
                      Exams
                    </span>
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-900 group-hover:text-white transition-colors flex items-center gap-1">
                      Examination & Grading
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                    </h4>
                    <p className="text-[11px] text-slate-500 group-hover:text-amber-100 transition-colors mt-0.5 line-clamp-2">
                      SBA continuous assessment marks entry & result broadsheets
                    </p>
                  </div>
                </button>

                {/* Menu 4: Terminal Reports */}
                <button
                  onClick={() => handleNavigate('admin_terminal_reports')}
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
                      Terminal Report Cards
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                    </h4>
                    <p className="text-[11px] text-slate-500 group-hover:text-purple-100 transition-colors mt-0.5 line-clamp-2">
                      Review, print, and PDF export official terminal student reports
                    </p>
                  </div>
                </button>

                {/* Menu 5: Fee & Bursary */}
                <button
                  onClick={() => handleNavigate('fee_collection')}
                  className="group p-4 bg-gradient-to-br from-cyan-50/80 to-slate-50 hover:from-cyan-600 hover:to-cyan-700 border border-cyan-100 hover:border-cyan-600 rounded-2xl text-left transition-all duration-200 shadow-2xs hover:shadow-lg hover:-translate-y-1 cursor-pointer flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 bg-cyan-600 group-hover:bg-white text-white group-hover:text-cyan-600 rounded-xl flex items-center justify-center transition-colors shadow-xs">
                      <Wallet className="w-5 h-5" />
                    </div>
                    <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-cyan-100 group-hover:bg-cyan-500 text-cyan-800 group-hover:text-white uppercase tracking-wider transition-colors">
                      Bursary
                    </span>
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-900 group-hover:text-white transition-colors flex items-center gap-1">
                      School Fee Management
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                    </h4>
                    <p className="text-[11px] text-slate-500 group-hover:text-cyan-100 transition-colors mt-0.5 line-clamp-2">
                      Fee tariffs, MoMo payment receipts & overdue arrears tracking
                    </p>
                  </div>
                </button>

                {/* Menu 6: Academic Setup */}
                <button
                  onClick={() => handleNavigate('academic_setup')}
                  className="group p-4 bg-gradient-to-br from-blue-50/80 to-slate-50 hover:from-blue-600 hover:to-blue-700 border border-blue-100 hover:border-blue-600 rounded-2xl text-left transition-all duration-200 shadow-2xs hover:shadow-lg hover:-translate-y-1 cursor-pointer flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 bg-blue-600 group-hover:bg-white text-white group-hover:text-blue-600 rounded-xl flex items-center justify-center transition-colors shadow-xs">
                      <School className="w-5 h-5" />
                    </div>
                    <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-blue-100 group-hover:bg-blue-500 text-blue-800 group-hover:text-white uppercase tracking-wider transition-colors">
                      Setup
                    </span>
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-900 group-hover:text-white transition-colors flex items-center gap-1">
                      Academic Classes & Setup
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                    </h4>
                    <p className="text-[11px] text-slate-500 group-hover:text-blue-100 transition-colors mt-0.5 line-clamp-2">
                      Manage academic terms, departments, subjects & class rosters
                    </p>
                  </div>
                </button>

                {/* Menu 7: System Users */}
                <button
                  onClick={() => handleNavigate('system_users_roles')}
                  className="group p-4 bg-gradient-to-br from-slate-100 to-slate-50 hover:from-slate-800 hover:to-slate-900 border border-slate-200 hover:border-slate-800 rounded-2xl text-left transition-all duration-200 shadow-2xs hover:shadow-lg hover:-translate-y-1 cursor-pointer flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 bg-slate-800 group-hover:bg-white text-white group-hover:text-slate-900 rounded-xl flex items-center justify-center transition-colors shadow-xs">
                      <Settings className="w-5 h-5" />
                    </div>
                    <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-slate-200 group-hover:bg-slate-700 text-slate-800 group-hover:text-white uppercase tracking-wider transition-colors">
                      System
                    </span>
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-900 group-hover:text-white transition-colors flex items-center gap-1">
                      Users & Permissions
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                    </h4>
                    <p className="text-[11px] text-slate-500 group-hover:text-slate-200 transition-colors mt-0.5 line-clamp-2">
                      Portal user credentials, sub-admin roles & access privileges
                    </p>
                  </div>
                </button>

                {/* Menu 8: Backup & Disaster Recovery */}
                <button
                  onClick={() => handleNavigate('system_backup_restore')}
                  className="group p-4 bg-gradient-to-br from-rose-50/80 to-slate-50 hover:from-rose-600 hover:to-rose-700 border border-rose-100 hover:border-rose-600 rounded-2xl text-left transition-all duration-200 shadow-2xs hover:shadow-lg hover:-translate-y-1 cursor-pointer flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 bg-rose-600 group-hover:bg-white text-white group-hover:text-rose-600 rounded-xl flex items-center justify-center transition-colors shadow-xs">
                      <Database className="w-5 h-5" />
                    </div>
                    <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-rose-100 group-hover:bg-rose-500 text-rose-800 group-hover:text-white uppercase tracking-wider transition-colors">
                      Backup
                    </span>
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-900 group-hover:text-white transition-colors flex items-center gap-1">
                      Backup & CSV Archiving
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                    </h4>
                    <p className="text-[11px] text-slate-500 group-hover:text-rose-100 transition-colors mt-0.5 line-clamp-2">
                      JSON/CSV database exports, cloud backups & local recovery
                    </p>
                  </div>
                </button>

                {/* Menu 9: SMS & Communications */}
                <button
                  onClick={() => handleNavigate('sms_compose')}
                  className="group p-4 bg-gradient-to-br from-teal-50/80 to-slate-50 hover:from-teal-600 hover:to-teal-700 border border-teal-100 hover:border-teal-600 rounded-2xl text-left transition-all duration-200 shadow-2xs hover:shadow-lg hover:-translate-y-1 cursor-pointer flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 bg-teal-600 group-hover:bg-white text-white group-hover:text-teal-600 rounded-xl flex items-center justify-center transition-colors shadow-xs">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-teal-100 group-hover:bg-teal-500 text-teal-800 group-hover:text-white uppercase tracking-wider transition-colors">
                      SMS Gateway
                    </span>
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-900 group-hover:text-white transition-colors flex items-center gap-1">
                      Bulk SMS & Notifications
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                    </h4>
                    <p className="text-[11px] text-slate-500 group-hover:text-teal-100 transition-colors mt-0.5 line-clamp-2">
                      MTN / Telecel / AT SMS gateway & system audit logs
                    </p>
                  </div>
                </button>

                {/* Menu 10: Staff Payroll System */}
                <button
                  onClick={() => handleNavigate('payroll_dashboard')}
                  className="group p-4 bg-gradient-to-br from-purple-50/80 to-slate-50 hover:from-purple-600 hover:to-purple-700 border border-purple-100 hover:border-purple-600 rounded-2xl text-left transition-all duration-200 shadow-2xs hover:shadow-lg hover:-translate-y-1 cursor-pointer flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 bg-purple-600 group-hover:bg-white text-white group-hover:text-purple-600 rounded-xl flex items-center justify-center transition-colors shadow-xs">
                      <Wallet className="w-5 h-5" />
                    </div>
                    <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-purple-100 group-hover:bg-purple-500 text-purple-800 group-hover:text-white uppercase tracking-wider transition-colors">
                      Payroll & Pension
                    </span>
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-900 group-hover:text-white transition-colors flex items-center gap-1">
                      Staff Payroll & Remuneration
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                    </h4>
                    <p className="text-[11px] text-slate-500 group-hover:text-purple-100 transition-colors mt-0.5 line-clamp-2">
                      Monthly salary runs, Pension 5.5%, PAYE tax, loans & HD payslips
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Quick Students & Teachers Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Enrolled Students preview */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Users className="w-4 h-4 text-indigo-600" /> Recent Student Admissions
                  </h3>
                  <button
                    onClick={() => handleNavigate('student_enrolled')}
                    className="text-indigo-600 hover:text-indigo-800 text-xs font-bold cursor-pointer"
                  >
                    View All ({students.length}) →
                  </button>
                </div>
                <div className="divide-y divide-slate-100 text-xs">
                  {students.slice(0, 5).map(s => (
                    <div key={s.id} className="py-2.5 flex justify-between items-center">
                      <div>
                        <span className="font-bold text-slate-900 block">{s.fullName}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{s.admissionNo} • {s.className}</span>
                      </div>
                      <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-bold">
                        {s.status || 'Active'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Teaching Faculty preview */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-indigo-600" /> Teaching Faculty
                  </h3>
                  <button
                    onClick={() => handleNavigate('teacher_profile')}
                    className="text-indigo-600 hover:text-indigo-800 text-xs font-bold cursor-pointer"
                  >
                    Manage Faculty ({teachers.length}) →
                  </button>
                </div>
                <div className="divide-y divide-slate-100 text-xs">
                  {teachers.slice(0, 5).map(t => (
                    <div key={t.id} className="py-2.5 flex justify-between items-center">
                      <div>
                        <span className="font-bold text-slate-900 block">{t.name}</span>
                        <span className="text-[10px] text-indigo-600">{t.designation} • {t.academicQualification}</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500">{t.phone}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PERFORMANCE OVERVIEW ANALYTICS MODULE */}
        {activeModule === 'performance_overview' && (
          <PerformanceOverview 
            reports={reports}
          />
        )}

        {/* ACADEMIC TREE EXPLORER MODULE */}
        {(activeModule === 'academic_tree_view' || activeModule === 'academic_tree' || activeModule === 'tree_view') && (
          <AcademicTreeView
            departments={departments}
            courses={courses}
            classes={classes}
            subjects={subjects}
            onNavigate={handleNavigate}
            onUpdateClasses={onUpdateClasses}
          />
        )}

        {/* GRADUATED BATCH & CANDIDATE REGISTRY */}
        {(activeModule === 'graduated_batch_registry' || activeModule === 'graduated_batches' || activeModule === 'setup_graduated_batches') && (
          <GraduatedBatchManager
            userRole="admin"
            readOnly={false}
            selectedCampus={selectedCampus}
          />
        )}

        {/* EMPLOYEE HISTORY (PAST STAFF ARCHIVE) */}
        {(activeModule === 'past_employees' || activeModule === 'employee_history') && (
          <PastEmployeeHistoryManager
            userRole="admin"
            readOnly={false}
            selectedCampus={selectedCampus}
          />
        )}

        {/* 2. ACADEMIC SETUP MANAGEMENT MODULES */}
        {activeModule !== 'setup_graduated_batches' && activeModule !== 'graduated_batch_registry' && activeModule !== 'graduated_batches' && (activeModule.startsWith('setup_') || activeModule === 'academic_setup' || activeModule === 'manage_courses' || activeModule === 'setup_manage_courses' || activeModule === 'shs_courses' || activeModule === 'courses' || activeModule === 'departments' || activeModule === 'classes' || activeModule === 'subjects' || activeModule === 'houses') && (
          <AcademicSetupManager
            activeModule={normalizeAdminModuleId(activeModule)}
            onNavigate={handleNavigate}
            students={students}
            teachers={teachers}
            academicYears={academicYears}
            onUpdateAcademicYears={onUpdateAcademicYears}
            terms={terms}
            onUpdateTerms={onUpdateTerms}
            departments={departments}
            onUpdateDepartments={onUpdateDepartments}
            courses={courses}
            onUpdateCourses={onUpdateCourses}
            classes={classes}
            onUpdateClasses={onUpdateClasses}
            houses={houses}
            onUpdateHouses={onUpdateHouses}
            subjects={subjects}
            onUpdateSubjects={onUpdateSubjects}
          />
        )}

        {/* 3. SYSTEM SETTINGS & USERS & ROLES & PORTAL CONTROL */}
        {activeModule !== 'system_backup_restore' && activeModule !== 'system_conflict_resolver' && activeModule !== 'data_conflict_resolver' && activeModule !== 'conflict_resolver' && (activeModule.startsWith('system_') || activeModule === 'system_settings' || activeModule === 'users_roles' || activeModule === 'student_portal_control' || activeModule === 'manage_portal_logins' || activeModule === 'manage_user_logins' || activeModule === 'manage_logins') && (
          <SystemSettingsManager
            activeModule={activeModule}
            onNavigate={handleNavigate}
            themePalette={themePalette}
            onUpdateThemePalette={onUpdateThemePalette}
            onLoginAsUser={onLoginAsUser}
            onClearAllData={onClearAllData}
          />
        )}

        {/* BACKUP & RECOVERY MODULE */}
        {(activeModule === 'system_backup_restore' || activeModule === 'database_backup' || activeModule === 'backup_recovery' || activeModule === 'backup_restore') && (
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
        )}

        {/* DATA CONFLICT RESOLVER MODULE */}
        {(activeModule === 'data_conflict_resolver' || activeModule === 'conflict_resolver' || activeModule === 'system_conflict_resolver') && (
          <DataConflictResolver
            currentUser={currentUser}
            onNavigate={handleNavigate}
            onDataModified={() => {
              // Local or cloud data changed during resolution
            }}
          />
        )}

        {/* RECONCILIATION DASHBOARD MODULE */}
        {activeModule === 'reconciliation_dashboard' && (
          <ReconciliationDashboard
            currentUser={currentUser}
            onNavigate={handleNavigate}
          />
        )}

        {/* DATABASE INTEGRITY & RECONCILIATION MODULE */}
        {(activeModule === 'database_integrity' || activeModule === 'integrity_check' || activeModule === 'database_reconciliation') && (
          <DatabaseIntegrityManager
            currentUser={currentUser}
            onNavigate={handleNavigate}
          />
        )}

        {/* COMMUNICATION & COMMUNITY MODULES */}
        {activeModule === 'communications' && (
          <CommunicationsCenter />
        )}

        {activeModule === 'library_assets' && (
          <AssetLibraryManager />
        )}

        {activeModule === 'discipline' && (
          <DisciplineTracker students={students} />
        )}

        {(activeModule === 'student_attendance' || activeModule === 'teacher_attendance') && (
          <AttendanceManager 
            type={activeModule === 'student_attendance' ? 'student' : 'teacher'}
            students={students}
            teachers={teachers}
          />
        )}

        {/* 4. STAFF MANAGEMENT MODULES */}
        {activeModule === 'staff_qr_attendance_dashboard' && (
          <StaffAttendanceManager />
        )}

        {(activeModule.startsWith('teacher_') || activeModule === 'teachers' || activeModule === 'attendance_report' || activeModule === 'attendance_stats' || activeModule === 'attendance_statistics') && activeModule !== 'teacher_attendance' && activeModule !== 'staff_qr_attendance_dashboard' && (
          <TeacherManager
            activeModule={activeModule}
            teachers={teachers}
            onAddTeacher={onAddTeacher}
            onUpdateTeacher={onUpdateTeacher}
            onDeleteTeacher={onDeleteTeacher}
            onNavigate={handleNavigate}
          />
        )}

        {/* 5. STUDENT TRANSCRIPT GENERATOR MODULE */}
        {(activeModule === 'student_transcript' || activeModule === 'exam_transcripts' || activeModule === 'transcripts') && (
          <StudentTranscriptManager
            students={students}
            reports={reports}
            onNavigate={handleNavigate}
          />
        )}

        {/* 5B. STUDENT TERMINAL REPORT & CLASS BROADCAST MANAGER */}
        {(activeModule === 'admin_terminal_reports' || activeModule === 'terminal_reports' || activeModule === 'class_broadcasts') && (
          <TerminalReportManager
            students={students}
            reports={reports}
            broadcasts={broadcasts}
            classes={classes}
            academicYears={academicYears}
            terms={terms}
            subjects={subjects}
            currentUser={currentUser}
            onUpdateReports={onUpdateReports}
            onUpdateBroadcasts={onUpdateBroadcasts}
          />
        )}

        {/* 6. STUDENT MANAGEMENT MODULES */}
        {activeModule !== 'student_transcript' && (activeModule.startsWith('student_') || activeModule === 'students' || activeModule === 'enroll_student' || activeModule === 'enrolled_students' || activeModule === 'promote_students' || activeModule === 'promotion_history') && (
          <StudentManager
            activeModule={activeModule}
            students={students}
            courses={courses}
            classes={classes}
            departments={departments}
            houses={houses}
            onAddStudent={onAddStudent}
            onUpdateStudent={onUpdateStudent}
            onDeleteStudent={onDeleteStudent}
            onManageFees={(st) => {
              setSelectedStudentForFees(st);
              setActiveModule('fee_collection');
            }}
            onNavigate={handleNavigate}
            onCleanOrphaned={onCleanOrphaned}
          />
        )}

        {(activeModule === 'bulk_upload' || activeModule === 'bulk_teacher_upload' || activeModule === 'bulk_data_import' || activeModule === 'data_import' || activeModule === 'bulk_import') && (
          <BulkDataImportModal
            isOpen={true}
            isFullPage={true}
            initialType={activeModule === 'bulk_teacher_upload' ? 'teachers' : 'students'}
            onClose={() => setActiveModule('dashboard')}
            onAddStudent={onAddStudent}
            onAddTeacher={onAddTeacher}
            onSuccess={(type, count) => {
              if (type === 'students') {
                setActiveModule('student_enrolled');
                if (onUpdateReports) {
                  onUpdateReports(getStoredReports());
                }
              } else {
                setActiveModule('teacher_profile');
              }
            }}
          />
        )}

        {/* 7. EXAMINATION MANAGEMENT MODULES */}
        {activeModule === 'exam_timetable' && (
          <ExamTimetableManager
            classes={classes}
            subjects={subjects}
            currentUserRole={currentUser?.role || 'admin'}
            currentUserName={currentUser?.name || 'Administrator'}
          />
        )}

        {activeModule !== 'exam_transcripts' && activeModule !== 'exam_timetable' && (activeModule.startsWith('exam_') || activeModule === 'grading_system' || activeModule === 'score_conversion' || activeModule === 'enter_results' || activeModule === 'report_sheets' || activeModule === 'score_approvals') && (
          <ExaminationManager
            activeModule={activeModule}
            students={students}
            reports={reports}
            onUpdateReports={onUpdateReports}
            onNavigate={handleNavigate}
            subjects={subjects}
          />
        )}

        {activeModule === 'class_broadcast_console' && (
          <div className="bg-[#0B142A] border border-blue-900/60 rounded-2xl p-6 shadow-xl space-y-5 text-white">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-blue-950/80 pb-5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white shrink-0">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-white tracking-tight">
                      Terminal Reports Class Broadcast Console
                    </h3>
                    <span className="bg-blue-950 text-blue-300 border border-blue-800/80 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {activePeriod.academicTerm} {activePeriod.academicYear}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Admins hold exclusive authorization to broadcast terminal reports on a class basis before students can access them.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={() => setActiveModule('admin_terminal_reports')}
                  className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
                >
                  <span>Open Full Broadcast Manager</span>
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Class Broadcast Status Overview Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {(classes && classes.length > 0 ? classes : [
                { id: '1', name: 'Basic 1' }, { id: '2', name: 'Basic 2' }, { id: '3', name: 'Basic 3' },
                { id: '4', name: 'Basic 4' }, { id: '5', name: 'Basic 5' }, { id: '6', name: 'Basic 6' },
                { id: '7', name: 'JHS 1' }, { id: '8', name: 'JHS 2' }, { id: '9', name: 'JHS 3' }
              ]).map((cls: any) => {
                const className = typeof cls === 'string' ? cls : cls.name;
                const bcast = broadcasts?.find(b => 
                  (b.className || '').toLowerCase() === className.toLowerCase() && 
                  (b.term || '').toLowerCase() === activePeriod.academicTerm.toLowerCase() &&
                  (b.academicYear === activePeriod.academicYear)
                );
                const isBroadcasted = bcast?.isBroadcasted ?? false;
                const classStudentCount = students.filter(s => (s.className || '').toLowerCase() === className.toLowerCase()).length;
                const classReportCount = reports.filter(r => 
                  (r.className || '').toLowerCase() === className.toLowerCase() && 
                  r.term === activePeriod.academicTerm && 
                  r.academicYear === activePeriod.academicYear
                ).length;

                return (
                  <div
                    key={className}
                    className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                      isBroadcasted 
                        ? 'bg-emerald-950/30 border-emerald-800/50 hover:border-emerald-700/80' 
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white truncate">{className}</span>
                        <span className={`inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
                          isBroadcasted 
                            ? 'bg-emerald-900/80 text-emerald-300 border border-emerald-700/60' 
                            : 'bg-amber-950/80 text-amber-300 border border-amber-800/60'
                        }`}>
                          {isBroadcasted ? '🟢 Published Live' : '🟡 Draft / Pending'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        {classReportCount} / {classStudentCount || 'N/A'} reports ready • {isBroadcasted ? 'Accessible on Student Portal' : 'Hidden from students'}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={async () => {
                          const newStatus = isBroadcasted ? 'Draft' : 'Published';
                          const updatedRecord: any = {
                            id: bcast?.id || `broadcast-${className.replace(/\s+/g, '-').toLowerCase()}-${activePeriod.academicTerm.replace(/\s+/g, '-').toLowerCase()}`,
                            className,
                            academicYear: activePeriod.academicYear,
                            term: activePeriod.academicTerm,
                            isBroadcasted: !isBroadcasted,
                            broadcastedAt: !isBroadcasted ? new Date().toLocaleDateString('en-GB') : undefined,
                            broadcastedBy: currentUser?.name || 'Administrator',
                            status: newStatus as any,
                            releaseNotes: !isBroadcasted ? 'Terminal assessment released by Administration.' : 'Draft mode'
                          };
                          const all = broadcasts || [];
                          const idx = all.findIndex(b => 
                            (b.className || '').toLowerCase() === className.toLowerCase() && 
                            (b.term || '').toLowerCase() === activePeriod.academicTerm.toLowerCase() &&
                            (b.academicYear === activePeriod.academicYear)
                          );
                          let nextList: any[];
                          if (idx >= 0) {
                            nextList = [...all];
                            nextList[idx] = updatedRecord;
                          } else {
                            nextList = [updatedRecord, ...all];
                          }
                          onUpdateBroadcasts?.(nextList);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer shadow-sm ${
                          isBroadcasted
                            ? 'bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800/60'
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/40'
                        }`}
                      >
                        {isBroadcasted ? 'Revoke' : 'Broadcast Live'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 7. FEE MANAGEMENT MODULES */}
        {(activeModule.startsWith('fee_') || activeModule === 'fees' || activeModule === 'fee' || activeModule === 'fee_management' || activeModule === 'bills' || activeModule === 'payments' || activeModule === 'income_expenses' || activeModule === 'audit_activity' || activeModule === 'payment_settings' || activeModule === 'payment_channels' || activeModule === 'payment_proofs' || activeModule === 'fee_bulk_entry') && activeModule !== 'fee_generate_receipt' && activeModule !== 'fee_next_term_bills' && (
          <AppErrorBoundary fallbackTitle="School Fee Management Terminal">
            <FeeManager
              activeModule={activeModule}
              students={students}
              bills={bills}
              payments={payments}
              classFeeTariffs={classFeeTariffs}
              onAddPayment={onAddPayment || (() => {})}
              onNavigate={handleNavigate}
              onAddNotification={onAddNotification}
              preselectedStudentId={selectedStudentForFees?.id}
              currentUser={currentUser}
            />
          </AppErrorBoundary>
        )}

        {/* 7.1 BATCH RECEIPT GENERATION & MULTI-PRINT (PHASE 54) */}
        {activeModule === 'fee_generate_receipt' && (
          <ReceiptGenerationDashboard
            payments={payments}
            bills={bills}
            students={students}
          />
        )}

        {/* 7.2 NEXT TERM FEES BILL & INVOICING ENGINE */}
        {activeModule === 'fee_next_term_bills' && (
          <NextTermBillingManager
            userRole="admin"
            onNavigateToReceipts={() => handleNavigate('fee_generate_receipt')}
          />
        )}

        {/* 7A.0 FINANCIAL RECONCILIATION & EXCEPTION DETECTION (PHASE 30) */}
        {(activeModule === 'financial_reconciliation' || activeModule === 'reconciliation_audit') && (
          <FinancialReconciliationDashboard
            currentUser={currentUser}
            students={students}
            bills={bills}
            payments={payments}
            onClose={() => handleNavigate('dashboard')}
          />
        )}

        {/* 7A. FINANCIAL AUDIT MANAGER MODULE */}
        {(activeModule === 'financial_audit' || activeModule === 'financial_records_audit' || activeModule === 'audit_financial') && (
          <FinancialAuditManager
            currentUser={currentUser}
            students={students}
            bills={bills}
            payments={payments}
            onClose={() => handleNavigate('dashboard')}
          />
        )}

        {/* 7A.0 INSTITUTIONAL EXPENSES */}
        {(activeModule === 'institutional_expenses' || activeModule === 'school_expenses' || activeModule === 'expenses') && (
          <ExpenseManager
            currentUser={currentUser}
            canApprove={true}
          />
        )}

        {/* 7A.02 CEO & DIRECTOR ROLES & PRIVILEGES */}
        {(activeModule === 'ceo_director_roles' || activeModule === 'ceo_roles' || activeModule === 'director_roles' || activeModule === 'executive_roles') && (
          <CeoRoleManager />
        )}

        {/* 7A.1 FINANCIAL AUDIT TRAIL MODULE */}
        {activeModule === 'audit_trail' && (
          <div className="h-[calc(100vh-120px)] pb-10">
            <FinancialAuditTrail 
              payments={payments}
              expenses={expenses}
              bills={bills}
            />
          </div>
        )}

        {/* 7A0. USERS PORTAL REVIEW & EXPERIENCE INSPECTOR */}
        {(activeModule === 'users_portal_review' || activeModule === 'portal_review' || activeModule === 'users_review') && (
          <UserPortalReviewManager
            studentsCount={students.length}
            teachersCount={teachers.length}
            onPreviewRole={(role) => onLoginAsUser?.({ role } as any)}
            onBackToDashboard={() => handleNavigate('dashboard')}
          />
        )}

        {/* 7A1. SECURITY AUDIT LOGS & WAF FIREWALL MODULE */}
        {(activeModule === 'security_audit' || activeModule === 'security_audit_logs' || activeModule === 'firewall' || activeModule === 'waf_firewall') && (
          <SecurityAuditLogsManager />
        )}

        {/* 7A1B. PRODUCTION LAUNCH & 4 OPTIONS GATE */}
        {(activeModule === 'launch_control' || activeModule === 'production_launch_gate') && (
          <ProductionLaunchControlPanel />
        )}

        {/* 7A1C. OPTION A: END-OF-TERM CLOSURE & ROLL-OVER WIZARD */}
        {(activeModule === 'term_closure_wizard' || activeModule === 'term_closure' || activeModule === 'rollover_wizard') && (
          <TermClosureRollOverWizard
            students={students}
            bills={bills}
            payments={payments}
            currentUser={currentUser}
          />
        )}

        {/* 7A1D. OPTION B: WHATSAPP & SMS FEE DISPATCH CENTER */}
        {(activeModule === 'whatsapp_dispatch_center' || activeModule === 'whatsapp_dispatch') && (
          <WhatsAppFeeDispatchCenter
            students={students}
            bills={bills}
            payments={payments}
          />
        )}

        {/* 7A1E. OPTION C: PVC QR ID CARDS & GATE TERMINAL */}
        {(activeModule === 'student_qr_id_cards' || activeModule === 'qr_id_cards') && (
          <StudentQRIdCardGenerator
            students={students}
          />
        )}

        {/* 7A1F. OPTION D: MINESEC COMPLIANCE & STATISTICAL EXPORT */}
        {(activeModule === 'minesec_compliance_export' || activeModule === 'minesec_dossier') && (
          <MinesecComplianceExport
            students={students}
            teachers={teachers}
            bills={bills}
            payments={payments}
          />
        )}

        {/* 7A1G. OPTION 1: CONTINUOUS ASSESSMENT (CA) GRADEBOOK */}
        {(activeModule === 'continuous_assessment_gradebook' || activeModule === 'ca_gradebook' || activeModule === 'master_broadsheet') && (
          <ContinuousAssessmentGradebook
            students={students}
            currentUser={currentUser}
          />
        )}

        {/* 7A1H. OPTION 2: PARENT MOBILE MONEY CHECKOUT */}
        {(activeModule === 'parent_momo_checkout' || activeModule === 'self_service_checkout') && (
          <ParentMobilePaymentPortal
            students={students}
            bills={bills}
            payments={payments}
            currentUser={currentUser}
          />
        )}

        {/* 7A1I. OPTION 3: SCHOOL CANTEEN POS & MEAL CARDS */}
        {(activeModule === 'canteen_pos' || activeModule === 'canteen_meal_card' || activeModule === 'school_canteen') && (
          <CanteenPOSManager
            students={students}
            currentUser={currentUser}
          />
        )}

        {/* 7A1J. OPTION 4: ALGORITHMIC TIMETABLE GENERATOR */}
        {(activeModule === 'algorithmic_timetable' || activeModule === 'timetable_generator' || activeModule === 'master_timetable') && (
          <AlgorithmicTimetableGenerator
            teachers={teachers}
          />
        )}

        {/* 7A2. DEPARTMENTAL FINANCIAL SUMMARY MODULE */}
        {(activeModule === 'departmental_financial_summary' || activeModule === 'dept_financial_summary') && (
          <DepartmentalFinancialSummary
            students={students}
            bills={bills}
            payments={payments}
            expenses={expenses}
          />
        )}

        {/* 7A3. SESSION CONTROLS & ACTIVE SECURITY LOGINS */}
        {(activeModule === 'session_controls' || activeModule === 'active_sessions' || activeModule === 'session_security') && (
          <SessionControlsManager />
        )}

        {/* 7A4. STUDENT TRANSFERS & LEAVING CERTIFICATES */}
        {(activeModule === 'student_transfers' || activeModule === 'transfers') && (
          <StudentTransferManager
            students={students}
            onUpdateStudent={onUpdateStudent}
            currentUser={currentUser}
          />
        )}

        {/* 7A6. BOARDING & HOSTEL MANAGEMENT */}
        {(activeModule === 'boarding_management' || activeModule === 'boarding' || activeModule === 'hostel') && (
          <BoardingManager students={students} />
        )}



        {/* 7B. STAFF PAYROLL & REMUNERATION SYSTEM MODULE */}
        {(activeModule.startsWith('payroll_') || activeModule === 'payroll') && (
          <PayrollManager
            currentUserRole="Admin"
            teachers={teachers}
            onAddNotification={onAddNotification}
          />
        )}

        {/* 8. NOTIFICATIONS & SMS & WHATSAPP & ACTIVITY LOGS MODULES */}
        {(activeModule.startsWith('notif_') || activeModule.startsWith('sms_') || activeModule.startsWith('whatsapp_') || activeModule.startsWith('logs_') || activeModule === 'send_notification' || activeModule === 'notification_history' || activeModule === 'compose_sms' || activeModule === 'sms_history' || activeModule === 'student_login_history' || activeModule === 'user_login_history' || activeModule === 'student_logins_history' || activeModule === 'user_logins_history' || activeModule === 'students_logins_history') && (
          <CommunicationLogsManager
            activeModule={activeModule}
            students={students}
            onNavigate={handleNavigate}
          />
        )}

        {/* PHASE 16 & 17 PRODUCTION OPERATIONS & GOVERNANCE MODULES */}
        {activeModule === 'production_health' && <ProductionHealthDashboard />}
        {activeModule === 'data_integrity' && <DataIntegrityDashboard />}
        {activeModule === 'data_governance' && <DataGovernanceDashboard />}
        {activeModule === 'disaster_recovery' && <DisasterRecoveryDashboard />}
        {activeModule === 'release_management' && <ReleaseManagementPanel />}
        {activeModule === 'change_audit' && <ChangeAuditPanel />}
        {activeModule === 'backup_verification' && <BackupVerificationPanel />}
        {activeModule === 'system_maintenance' && <SystemMaintenancePanel />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Clear Demo Data Confirmation Modal */}
      {showClearDemoModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex justify-center items-start pt-16 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 text-left space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">Reset & Clear All Records</h3>
                <p className="text-xs text-slate-500 font-medium">Destructive administrative action</p>
              </div>
            </div>

            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 text-xs text-rose-900 space-y-2">
              <p className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                This will permanently remove all application records:
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-700 text-[11px] pl-1">
                <li>All students, admission & enrollment records</li>
                <li>All teachers, staff & faculty assignments</li>
                <li>All terminal reports, assessments & grades</li>
                <li>All fee bills, transactions & receipts</li>
                <li>All academic years, terms, classes, houses & subjects</li>
              </ul>
              <p className="text-[11px] text-emerald-800 font-semibold bg-emerald-50 border border-emerald-200 p-2 rounded-lg mt-2">
                ✓ Your Admin account and system settings will be safely preserved.
              </p>
            </div>

            {isClearingDemo ? (
              <div className="space-y-3 py-3">
                <div className="flex justify-between text-xs font-bold text-slate-700">
                  <span>{clearCurrentStep || 'Processing purge...'}</span>
                  <span>{clearProgressPercent}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200">
                  <div 
                    className="bg-rose-600 h-3 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${clearProgressPercent}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-500 italic text-center">Please do not close or refresh this page while deletion is in progress.</p>
              </div>
            ) : (
              <div className="space-y-3 pt-1">
                <label className="block text-xs font-bold text-slate-700">
                  Type <span className="text-rose-600 font-mono font-black">DELETE</span> to confirm this action:
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value.toUpperCase())}
                  placeholder="Type DELETE"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500 uppercase tracking-wider"
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowClearDemoModal(false);
                  setDeleteConfirmText('');
                }}
                disabled={isClearingDemo}
                className="px-4 py-2.5 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmClearDemoData}
                disabled={isClearingDemo || deleteConfirmText.trim().toUpperCase() !== 'DELETE'}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-colors flex items-center gap-2"
              >
                {isClearingDemo ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Purging Data... ({clearProgressPercent}%)</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm & Purge All Records</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Getting Started Walkthrough Tour Overlay */}
      <GettingStartedTour
        isOpen={showGettingStartedTour}
        onClose={() => setShowGettingStartedTour(false)}
        onNavigate={(mod) => handleNavigate(mod)}
        userRole="admin"
      />

      {/* Official Institutional User Manual & Guide Modal */}
      <UserManualModal
        isOpen={isManualOpen}
        onClose={() => setIsManualOpen(false)}
      />
    </div>
  );
}

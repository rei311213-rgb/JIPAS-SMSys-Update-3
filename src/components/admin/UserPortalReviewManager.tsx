import { useState, useEffect, useMemo } from 'react';
import { 
  UserRole,
  Student,
  Teacher,
  UserAccountItem
} from '../../types';
import { 
  getStoredUsers,
  subscribeUsers
} from '../../services/dbService';
import { 
  Users, 
  Shield, 
  UserCheck, 
  Calculator, 
  GraduationCap, 
  Receipt, 
  Eye, 
  CheckCircle2, 
  Sparkles, 
  Lock, 
  ArrowRight,
  ShieldCheck,
  Building,
  KeyRound,
  FileText,
  CreditCard,
  Layers,
  Award,
  Crown,
  ChevronLeft
} from 'lucide-react';

interface UserPortalReviewManagerProps {
  studentsCount: number;
  teachersCount: number;
  onPreviewRole?: (role: UserRole) => void;
  onBackToDashboard?: () => void;
}

interface PortalRoleSpec {
  role: UserRole;
  title: string;
  subtitle: string;
  badgeColor: string;
  icon: any;
  capabilities: string[];
  accessLevel: 'Full Administrative' | 'Academic Grading' | 'Financial & Remuneration' | 'Front Desk Collection' | 'Student & Parent Access';
  overviewText: string;
}

const PORTAL_SPECS: PortalRoleSpec[] = [
  {
    role: 'admin',
    title: 'School Administrator Portal',
    subtitle: 'Institutional Command & Master Controls',
    badgeColor: 'bg-rose-100 text-rose-800 border-rose-200',
    icon: ShieldCheck,
    accessLevel: 'Full Administrative',
    overviewText: 'Master oversight over academic setup, staff management, student records, fee billing, payroll processing, system backups, and financial audit.',
    capabilities: [
      'Complete Setup (Years, Terms, Classes, SHS Courses)',
      'Manage Faculty & Staff Assignments',
      'Student Enrollment & Automatic Promotions',
      'Institutional Financial Records & Auditing',
      'Staff Payroll & Remuneration Runs',
      'System Settings & Accountant RBAC Matrix'
    ]
  },
  {
    role: 'teacher',
    title: 'Teacher / Educator Portal',
    subtitle: 'Classroom Academics & Terminal Reports',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    icon: UserCheck,
    accessLevel: 'Academic Grading',
    overviewText: 'Focused classroom workspace for class teachers and subject masters to record continuous assessments, exam scores, attendance, and generate GES terminal report cards.',
    capabilities: [
      'Continuous Assessment (30% Class Score + 70% Exam)',
      'Automated Grade & Interpretation Engine (A1 to F9 / 1 to 9)',
      'Class Attendance & Selective Conduct Remarks',
      'Broadsheet & Terminal Report Review',
      'Class Broadcasts to Student & Parent Portals',
      'Student Enrollment & Classroom Directory'
    ]
  },
  {
    role: 'accountant',
    title: 'Accountant & Bursar Portal',
    subtitle: 'Comprehensive Financial & Fee Management',
    badgeColor: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    icon: Calculator,
    accessLevel: 'Financial & Remuneration',
    overviewText: 'Full institutional treasury system for tuition fee billings, automated fee reminders, payment proofs verification, expenditure disbursements, and payroll.',
    capabilities: [
      'Student Fee Billing & Class Tariffs',
      'Fee Collection & Payment Receipting',
      'Payment Channels & Bank Proof Verification',
      'School Expenditures & Voucher Management',
      'Monthly Staff Payroll & Payslips',
      'Secretary Desk Cash Reconciliation'
    ]
  },
  {
    role: 'secretary',
    title: 'Front Desk Secretary Portal',
    subtitle: 'Point-of-Sale Fee Collection & Petty Cash',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: Receipt,
    accessLevel: 'Front Desk Collection',
    overviewText: 'Fast front-desk point-of-sale interface for accepting cash and MoMo school fee payments, issuing printable official receipts, recording petty cash outlays, and submitting daily cash handover summaries.',
    capabilities: [
      'Instant Student Fee Collection & Search',
      'Print Official Receipts with Verification QR Codes',
      'Log Daily Petty Cash & Office Expenses',
      'Submit Daily Cash Handover to Main Bursary',
      'Student Directory & Parent Contact Lookup'
    ]
  },
  {
    role: 'student',
    title: 'Student & Parent Portal',
    subtitle: 'Academic Progress, Reports & Invoices',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
    icon: GraduationCap,
    accessLevel: 'Student & Parent Access',
    overviewText: 'Dedicated portal for students and parents to view published terminal report cards, track subject scores, check outstanding bill items, and upload fee payment receipts.',
    capabilities: [
      'Download & Print Official GES Terminal Report Cards',
      'Review Term-by-Term Subject Performance',
      'Inspect Itemized Fee Bills & Outstanding Balances',
      'Upload Bank / MoMo Payment Receipts for Clearance',
      'Access School Calendar & Broadcast Announcements'
    ]
  },
  {
    role: 'ceo',
    title: 'CEO & Executive Director Portal',
    subtitle: 'High-Level Governance & Strategic Oversight',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
    icon: Crown,
    accessLevel: 'Full Administrative',
    overviewText: 'High-level executive dashboard delivering strategic oversight across multi-campus operations, enrollment numbers, aggregate fee revenues, collection metrics, and cross-campus performance.',
    capabilities: [
      'Multi-Campus Enrollment & Staff Demographics',
      'High-Level Financial Performance & Revenue Aggregation',
      'Cross-Campus Student Performance & Exam Metrics',
      'Campus Selector & Consolidated Reporting',
      'Direct Communication Channels with School Leadership'
    ]
  },
  {
    role: 'headmaster',
    title: 'Headmaster & Academic Director Portal',
    subtitle: 'Institutional Academic Leadership & Faculty Supervision',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: Award,
    accessLevel: 'Academic Grading',
    overviewText: 'Administrative hub for Headteachers, Headmasters, and Heads of Departments to oversee curriculum coverage, lesson delivery, terminal report card approvals, and academic excellence.',
    capabilities: [
      'Supervise Teaching Faculty & Departmental Allocations',
      'Approve Class Continuous Assessments & Broadsheets',
      'Monitor Academic Calendar Milestones & Term Deadlines',
      'Review Class Attendance & Student Disciplinary Trends',
      'Publish Official Headmaster Termly Directives'
    ]
  }
];

export default function UserPortalReviewManager({
  studentsCount,
  teachersCount,
  onPreviewRole,
  onBackToDashboard
}: UserPortalReviewManagerProps) {
  const [users, setUsers] = useState<UserAccountItem[]>(() => {
    const initial = getStoredUsers();
    console.log('[UsersPortalReview] Initializing state from getStoredUsers(). Found count:', initial ? initial.length : 0);
    return initial || [];
  });

  useEffect(() => {
    console.log('[UsersPortalReview] LIFECYCLE: Component MOUNTED into DOM.', {
      initialUsersCount: users.length,
      isUsersArrayEmpty: users.length === 0,
      studentsCount,
      teachersCount,
      timestamp: new Date().toISOString()
    });

    const unsub = subscribeUsers((loaded) => {
      console.log('[UsersPortalReview] DATA_FETCH: subscribeUsers callback fired.', {
        loadedCount: loaded ? loaded.length : 0,
        isLoadedArrayEmpty: !loaded || loaded.length === 0,
        isArray: Array.isArray(loaded),
        sampleData: loaded && loaded.length > 0 ? loaded.slice(0, 2) : 'EMPTY_ARRAY',
        timestamp: new Date().toISOString()
      });
      if (!loaded || loaded.length === 0) {
        console.warn('[UsersPortalReview] Warning: Fetched users array is empty. Fallback counts will be applied.');
      }
      setUsers(loaded || []);
    });

    return () => {
      console.log('[UsersPortalReview] LIFECYCLE: Component UNMOUNTING from DOM (Cleanup).', {
        lastUsersCount: users.length,
        timestamp: new Date().toISOString()
      });
      unsub();
    };
  }, []);

  const [selectedRole, setSelectedRole] = useState<UserRole>('teacher');

  const selectedSpec = useMemo(() => {
    return PORTAL_SPECS.find(s => s.role === selectedRole) || PORTAL_SPECS[0];
  }, [selectedRole]);

  // Count active accounts per role
  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = {
      admin: users.filter(u => u.role === 'admin').length,
      teacher: teachersCount || users.filter(u => u.role === 'teacher').length,
      accountant: users.filter(u => u.role === 'accountant').length,
      secretary: users.filter(u => u.role === 'secretary').length,
      student: studentsCount || users.filter(u => u.role === 'student').length,
      ceo: users.filter(u => u.role === 'ceo' || u.role === 'director').length,
      headmaster: users.filter(u => u.role === 'headmaster' || u.role === 'headteacher' || u.role === 'hod').length
    };
    return counts;
  }, [users, teachersCount, studentsCount]);

  // Render diagnostics logging
  console.log('[UsersPortalReview] RENDER: Rendering component view.', {
    usersArrayLength: users.length,
    isUsersArrayEmpty: users.length === 0,
    selectedRole,
    roleCounts,
    specTitle: selectedSpec?.title
  });

  return (
    <div className="space-y-6 text-slate-900 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
              <Eye className="w-5 h-5" />
            </div>
            <span className="text-xs font-black tracking-wider uppercase text-purple-600">
              Users Portal Review & Experience Inspector
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900">
            Multi-Role Portals & User Experience Review
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Inspect the functional scopes, permissions, and dashboards experienced by Teachers, Accountants, Sub-Accountants, Secretaries, and Students across the JIPAS ecosystem.
          </p>
        </div>
        {onBackToDashboard && (
          <button
            onClick={onBackToDashboard}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors flex items-center gap-2 cursor-pointer self-start md:self-auto shrink-0 shadow-xs"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </button>
        )}
      </div>

      {/* Role Selector Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        {PORTAL_SPECS.map(spec => {
          const Icon = spec.icon;
          const isSelected = selectedRole === spec.role;
          const count = roleCounts[spec.role] || 0;

          return (
            <button
              key={spec.role}
              onClick={() => setSelectedRole(spec.role)}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                isSelected 
                  ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-indigo-500' 
                  : 'bg-white text-slate-900 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-3">
                <div className={`p-2 rounded-xl ${isSelected ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-700'}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  {count} {count === 1 ? 'User' : 'Users'}
                </span>
              </div>

              <div>
                <div className="text-xs font-black truncate">{spec.title.replace(' Portal', '')}</div>
                <div className={`text-[10px] truncate ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                  {spec.accessLevel}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Detailed Portal Experience Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
              <selectedSpec.icon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-slate-900">{selectedSpec.title}</h3>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${selectedSpec.badgeColor}`}>
                  {selectedSpec.accessLevel}
                </span>
              </div>
              <p className="text-xs text-slate-500">{selectedSpec.subtitle}</p>
            </div>
          </div>

          {onPreviewRole && (
            <button
              onClick={() => onPreviewRole(selectedRole)}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-md shadow-indigo-600/20 transition-all cursor-pointer self-start sm:self-auto shrink-0"
              title={`Switch session to test ${selectedSpec.title}`}
            >
              <span>Test {selectedSpec.title.replace(' Portal', '')} View</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 text-xs text-slate-700 leading-relaxed">
          {selectedSpec.overviewText}
        </div>

        {/* Modules & Key Capabilities Grid */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Core Modules & Interactive Workflows in this Portal:
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {selectedSpec.capabilities.map((cap, idx) => (
              <div key={idx} className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/60 flex items-center gap-2.5 text-xs font-medium text-slate-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{cap}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

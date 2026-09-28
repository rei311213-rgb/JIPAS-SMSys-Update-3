import { 
  Student, 
  Teacher, 
  TermReport, 
  StudentBill, 
  PaymentRecord, 
  CalendarEvent, 
  NotificationItem, 
  LoginLog,
  SchoolExpenseRecord,
  BankDepositRecord,
  SecurityAuditLog
} from '../types';

export const INITIAL_TEACHERS: Teacher[] = [
  {
    id: 'tch-pre-1',
    staffId: 'TCH-PRE-001',
    name: 'Mrs. Abigail Mensah',
    email: 'abigail.mensah@jipas.edu',
    phone: '+228 90 12 34 56',
    gender: 'Female',
    academicQualification: 'B.Ed Early Childhood Education',
    professionalQualification: 'Licensed Early Childhood Educator',
    designation: 'Head of Department - Pre-School',
    rank: 'Senior Educator',
    department: 'Pre-School',
    classesTaught: ['Creche', 'Nursery 1', 'Nursery 2', 'KG 1', 'KG 2'],
    subjectsTaught: ['Language & Literacy', 'Numeracy', 'Creative Arts']
  },
  {
    id: 'tch-pri-1',
    staffId: 'TCH-PRI-001',
    name: 'Mr. Emmanuel Tetteh',
    email: 'emmanuel.tetteh@jipas.edu',
    phone: '+228 91 23 45 67',
    gender: 'Male',
    academicQualification: 'B.Ed Basic Education',
    professionalQualification: 'Licensed Primary Educator',
    designation: 'Head of Department - Primary School',
    rank: 'Principal Superintendent',
    department: 'Primary School',
    classesTaught: ['Basic 1', 'Basic 2', 'Basic 3', 'Basic 4', 'Basic 5', 'Basic 6'],
    subjectsTaught: ['Mathematics', 'English Language', 'Science']
  },
  {
    id: 'tch-jhs-1',
    staffId: 'TCH-JHS-001',
    name: 'Mr. Paul Denyo',
    email: 'paul.denyo@jipas.edu',
    phone: '+228 92 34 56 78',
    gender: 'Male',
    academicQualification: 'B.Sc Science Education',
    professionalQualification: 'Licensed JHS Educator',
    designation: 'Head of Department - Junior High School',
    rank: 'Senior Superintendent I',
    department: 'Junior High School',
    classesTaught: ['JHS 1', 'JHS 2', 'JHS 3'],
    subjectsTaught: ['Science', 'Social Studies', 'Computing']
  },
  {
    id: 'tch-shs-1',
    staffId: 'TCH-SHS-001',
    name: 'Dr. Kwame Boateng',
    email: 'kwame.boateng@jipas.edu',
    phone: '+228 93 45 67 89',
    gender: 'Male',
    academicQualification: 'Ph.D Physics Education',
    professionalQualification: 'Licensed SHS Educator',
    designation: 'Head of Department - Senior High School',
    rank: 'Chief Superintendent',
    department: 'Senior High School',
    classesTaught: ['General Science 1', 'General Science 2', 'General Science 3', 'General Arts 1', 'Business 1'],
    subjectsTaught: ['Physics', 'Chemistry', 'General Science']
  }
];

export const INITIAL_STUDENTS: Student[] = [];

export const INITIAL_TERM_REPORTS: TermReport[] = [];
export const INITIAL_BILLS: StudentBill[] = [];
export const INITIAL_PAYMENTS: PaymentRecord[] = [];
export const INITIAL_CALENDAR_EVENTS: CalendarEvent[] = [];
export const INITIAL_NOTIFICATIONS: NotificationItem[] = [];
export const INITIAL_LOGIN_LOGS: LoginLog[] = [];
export const INITIAL_EXPENSES: SchoolExpenseRecord[] = [];
export const INITIAL_BANK_DEPOSITS: BankDepositRecord[] = [];
export const INITIAL_SECURITY_AUDIT_LOGS: SecurityAuditLog[] = [];

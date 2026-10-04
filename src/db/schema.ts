import { pgTable, text, boolean, timestamp, jsonb, integer, uuid, date, decimal } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email'),
  role: text('role').notNull(),
  phone: text('phone'),
  status: text('status').default('Active'),
  lastLogin: timestamp('last_login'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const students = pgTable('students', {
  id: uuid('id').primaryKey(),
  admissionNo: text('admission_no').notNull().unique(),
  fullName: text('full_name').notNull(),
  gender: text('gender').notNull(),
  dob: date('dob').notNull(),
  department: text('department'),
  className: text('class_name'),
  rollNo: text('roll_no'),
  house: text('house'),
  parentPhone: text('parent_phone'),
  parentName: text('parent_name'),
  academicYear: text('academic_year'),
  term: text('term'),
  status: text('status').default('Active'),
  isCurrent: boolean('is_current').default(true),
  enrollmentDate: date('enrollment_date'),
});

export const academicYears = pgTable('academic_years', {
  id: uuid('id').primaryKey(),
  name: text('name').notNull(),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  isCurrent: boolean('is_current').default(false),
  status: text('status').default('Upcoming'),
});

export const terms = pgTable('terms', {
  id: uuid('id').primaryKey(),
  name: text('name').notNull(),
  termNumber: integer('term_number').notNull(),
  academicYear: text('academic_year').notNull(),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  isCurrent: boolean('is_current').default(false),
  daysOpen: integer('days_open'),
});

export const classes = pgTable('classes', {
  id: uuid('id').primaryKey(),
  name: text('name').notNull(),
  department: text('department'),
  stream: text('stream'),
  classTeacher: text('class_teacher'),
  capacity: integer('capacity'),
});

export const termReports = pgTable('term_reports', {
  id: uuid('id').primaryKey(),
  studentId: uuid('student_id').notNull(),
  admissionNo: text('admission_no').notNull(),
  term: text('term').notNull(),
  academicYear: text('academic_year').notNull(),
  subjects: jsonb('subjects').notNull(),
  totalScore: integer('total_score'),
  position: integer('position'),
  isPublished: boolean('is_published').default(false),
  status: text('status'),
});

export const payments = pgTable('payments', {
  id: uuid('id').primaryKey(),
  studentId: uuid('student_id').notNull(),
  admissionNo: text('admission_no').notNull(),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  paymentDate: date('payment_date').notNull(),
  paymentMethod: text('payment_method'),
  receiptNo: text('receipt_no'),
  term: text('term'),
  academicYear: text('academic_year'),
});

export const bills = pgTable('bills', {
  id: uuid('id').primaryKey(),
  studentId: uuid('student_id').notNull(),
  admissionNo: text('admission_no').notNull(),
  amountDue: decimal('amount_due', { precision: 12, scale: 2 }).notNull(),
  term: text('term'),
  academicYear: text('academic_year'),
  dueDate: date('due_date'),
  status: text('status'),
});

export const expenses = pgTable('expenses', {
  id: uuid('id').primaryKey(),
  description: text('description').notNull(),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  date: date('date').notNull(),
  category: text('category'),
  recorderRole: text('recorder_role'),
});

export const subjects = pgTable('subjects', {
  id: uuid('id').primaryKey(),
  name: text('name').notNull(),
  code: text('code').notNull(),
  department: text('department'),
  isCore: boolean('is_core').default(false),
});

export const bankDeposits = pgTable('bank_deposits', {
  id: uuid('id').primaryKey(),
  bankName: text('bank_name').notNull(),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  date: date('date').notNull(),
  referenceNo: text('reference_no'),
});

export const securityAuditLogs = pgTable('security_audit_logs', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id'),
  action: text('action'),
  details: text('details'),
  timestamp: timestamp('timestamp').defaultNow(),
});

export const payrollRuns = pgTable('payroll_runs', {
  id: uuid('id').primaryKey(),
  month: text('month'),
  year: text('year'),
  totalAmount: decimal('total_amount', { precision: 12, scale: 2 }),
  status: text('status'),
});

export const staffSalaries = pgTable('staff_salaries', {
  id: uuid('id').primaryKey(),
  staffId: uuid('staff_id'),
  amount: decimal('amount', { precision: 12, scale: 2 }),
  month: text('month'),
});

export const staffLoans = pgTable('staff_loans', {
  id: uuid('id').primaryKey(),
  staffId: uuid('staff_id'),
  amount: decimal('amount', { precision: 12, scale: 2 }),
  repaymentAmount: decimal('repayment_amount', { precision: 12, scale: 2 }),
});

export const staffAttendance = pgTable('staff_attendance', {
  id: uuid('id').primaryKey(),
  date: date('date').notNull(),
  teacherId: uuid('teacher_id').notNull(),
  teacherName: text('teacher_name').notNull(),
  status: text('status').notNull(),
  campus: text('campus'),
  timeIn: text('time_in'),
  timeOut: text('time_out'),
  remarks: text('remarks'),
  clockInMethod: text('clock_in_method'),
  verified: boolean('verified').default(false),
  officeStationId: text('office_station_id'),
});

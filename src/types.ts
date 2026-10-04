export type UserRole = 
  | 'admin' 
  | 'super_admin' 
  | 'headmaster' 
  | 'headteacher'
  | 'hod'
  | 'teacher' 
  | 'accountant' 
  | 'sub_accountant' 
  | 'secretary' 
  | 'hr' 
  | 'student' 
  | 'parent' 
  | 'clerk' 
  | 'sub_admin'
  | 'ceo'
  | 'director'
  | 'cook'
  | 'cleaner'
  | 'security'
  | 'driver'
  | 'librarian'
  | 'nurse'
  | 'lab_assistant'
  | 'handyman'
  | 'others';

export type AppResource = 
  | 'students'
  | 'teachers'
  | 'classes'
  | 'subjects'
  | 'academic_years'
  | 'terms'
  | 'attendance'
  | 'reports'
  | 'fees'
  | 'payments'
  | 'receipts'
  | 'expenses'
  | 'bank_deposits'
  | 'payroll'
  | 'staff_loans'
  | 'users'
  | 'audit_logs'
  | 'settings'
  | 'calendar'
  | 'communications'
  | 'library'
  | 'assets'
  | 'discipline';

export type AppPermission = 
  | 'view_students'
  | 'edit_students'
  | 'delete_students'
  | 'view_teachers'
  | 'edit_teachers'
  | 'manage_classes'
  | 'enter_grades'
  | 'publish_reports'
  | 'collect_fees'
  | 'void_payments'
  | 'correct_fees'
  | 'void_fees'
  | 'fees.correct'
  | 'fees.void'
  | 'enter_expenses'
  | 'approve_expenses'
  | 'run_payroll'
  | 'view_payroll'
  | 'manage_bank_deposits'
  | 'view_audit_logs'
  | 'manage_users'
  | 'manage_settings';

export type AppModule = 
  | 'admin_portal'
  | 'teacher_portal'
  | 'accountant_portal'
  | 'secretary_portal'
  | 'student_portal'
  | 'payroll_module'
  | 'financial_audit'
  | 'revenue_trends'
  | 'fee_reminders'
  | 'academic_setup'
  | 'settings_module';

export interface CloudSyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncedAt: string | null;
  pendingWritesCount: number;
  lastError: string | null;
  unsyncedDraftsCount: number;
}

export interface AccountantPrivilegesConfig {
  canCollectFees: boolean;
  canEnterExpenses: boolean;
  canApproveExpenses: boolean;
  canManageFeeSettings: boolean;
  canRunPayroll: boolean;
  canViewFinancialReports: boolean;
  canPerformAudit: boolean;
  canVoidPayments: boolean;
  canExportData: boolean;
  canManageSecretaryRecords: boolean;
}

export interface CeoPrivilegesConfig {
  canViewFinancials: boolean;            // School balances, cash flow, revenue summaries
  canViewDetailedExpenses: boolean;      // Itemized expenditure logs and receipts
  canViewPayrollDetails: boolean;        // Individual staff salary breakdowns & loan records
  canViewDebtorsList: boolean;           // Student fee arrears & defaulters list
  canViewAcademicReports: boolean;       // Term reports, grade distribution & class rankings
  canViewStudentDirectory: boolean;      // Student profile records & enrollment details
  canViewParentContacts: boolean;        // Parent phone numbers & addresses
  canViewStaffDirectory: boolean;        // Teacher/staff profiles & staff contacts
  canViewStaffAttendance: boolean;       // Teacher & staff clock-in / clock-out records
  canViewDisciplineLogs: boolean;        // Student disciplinary records & incident reports
  canViewSecurityAudit: boolean;         // Security audit logs & system activity feed
  canExportReports: boolean;             // Exporting institutional PDFs, Excel & CSV reports
  canViewConsolidatedExecutiveReport: boolean; // High-level executive synthesis report
  canReceiveExecutiveAlerts: boolean;    // Critical automated alerts (large arrears, budget spikes)
  readOnlyMode: boolean;                 // Strict observation mode (no modification access)
}

export const DEFAULT_CEO_PRIVILEGES: CeoPrivilegesConfig = {
  canViewFinancials: true,
  canViewDetailedExpenses: true,
  canViewPayrollDetails: true,
  canViewDebtorsList: true,
  canViewAcademicReports: true,
  canViewStudentDirectory: true,
  canViewParentContacts: true,
  canViewStaffDirectory: true,
  canViewStaffAttendance: true,
  canViewDisciplineLogs: true,
  canViewSecurityAudit: true,
  canExportReports: true,
  canViewConsolidatedExecutiveReport: true,
  canReceiveExecutiveAlerts: true,
  readOnlyMode: false
};

export interface HeadteacherPrivilegesConfig {
  canEndorseTerminalReports: boolean;
  canSuperviseTeachers: boolean;
  canManageSectionClasses: boolean;
  canViewStudentTranscripts: boolean;
  canPublishSectionBroadcasts: boolean;
  canManageAttendanceOversight: boolean;
}

export interface HodPrivilegesConfig {
  canManageCurriculum: boolean;
  canSuperviseDeptTeachers: boolean;
  canEndorseSubjectGrades: boolean;
  canReviewAssessmentSheets: boolean;
  canPublishDeptNotices: boolean;
  canViewDeptAnalytics: boolean;
}

export interface User {
  id: string;
  name: string;
  email?: string;
  role: UserRole;
  phone?: string;
  classAssigned?: string;
  admissionNo?: string;
  avatar?: string;
  allowedModules?: string[];
  privilege?: 'all' | 'read' | 'write';
  accountantPrivileges?: AccountantPrivilegesConfig;
  ceoPrivileges?: CeoPrivilegesConfig;
  headteacherPrivileges?: HeadteacherPrivilegesConfig;
  hodPrivileges?: HodPrivilegesConfig;
  executiveTitle?: string;
  leadershipTitle?: string;
  department?: string;
  assignedDepartments?: string[];
  campus?: 'JIPAS 1' | 'JIPAS 2' | string;
}

export interface GraduatedBatch {
  id: string;
  batchName: string;
  graduationYear: string;
  academicYear: string;
  department?: string;
  classGraduated?: string;
  totalStudents: number;
  graduationDate?: string;
  status?: 'Active' | 'Archived';
  notes?: string;
  createdAt?: string;
}

export interface GraduatedStudentItem {
  id: string;
  studentId?: string;
  admissionNo: string;
  fullName: string;
  gender: 'Male' | 'Female';
  dob?: string;
  completionYear: string; // e.g. "2025"
  examType: 'BECE' | 'WASSCE';
  candidateIndexNo: string; // 10-digit index number e.g. "1010203001"
  becePlacementStatus?: 'Placement' | 'Non-placement';
  placedSchool?: string; // If Placement: e.g. "Presbyterian Boys' Secondary School (PRESEC Legon)"
  placedProgramme?: string; // e.g. "General Science"
  wassceProgramme?: string; // If WASSCE: e.g. "General Science", "General Arts", "Business"
  classGraduatedFrom: string; // e.g. "JHS 3" or "SHS 3 Science"
  department: string; // "Junior High School" or "Senior High School"
  aggregate?: number | string; // e.g. 06, 08, 12, etc.
  parentName?: string;
  parentPhone?: string;
  guardianContact?: string;
  campus?: 'JIPAS 1' | 'JIPAS 2' | string;
  status?: 'Completed' | 'Placed' | 'Pending Placement' | 'Higher Education' | 'Archived';
  remarks?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PastEmployeeRecord {
  id: string;
  fullName: string;
  staffId?: string;
  gender?: 'Male' | 'Female';
  phone?: string;
  email?: string;
  department: string; // e.g. "Senior High School", "Junior High School", "Primary School"
  role: string; // e.g. "Head of Department", "Subject Teacher", "Class Teacher", "Accountant"
  durationOfService: string; // e.g. "2018 - 2024 (6 Years)"
  startDate?: string;
  endDate?: string;
  classesHandled?: string[]; // e.g. ["SHS 1 Science", "SHS 2 Science", "SHS 3 Science"]
  subjectsHandled?: string[]; // e.g. ["Core Mathematics", "Elective Mathematics"]
  exitReason?: 'Resigned' | 'Retired' | 'Contract Completed' | 'Relocated' | 'Further Studies' | 'Other';
  serviceRating?: 'Outstanding' | 'Very Good' | 'Good' | 'Satisfactory';
  remarks?: string;
  forwardingContact?: string;
  certificateIssued?: boolean;
  campus?: 'JIPAS 1' | 'JIPAS 2' | string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Student {
  id: string;
  admissionNo: string;
  fullName: string;
  lastName?: string;
  otherNames?: string;
  gender: 'Male' | 'Female';
  dob: string;
  admissionDate?: string;
  department: string;
  className: string;
  course?: string;
  level?: string | number;
  electiveSubjects?: string[];
  rollNo: string;
  house: string;
  parentPhone: string;
  parentName: string;
  parentEmail?: string;
  email?: string;
  academicYear: string;
  term: string;
  status: 'Active' | 'Inactive' | 'Pending' | 'Graduated';
  graduationYear?: string;
  graduationBatch?: string;
  graduationDate?: string;
  exitReason?: string;
  campus?: 'JIPAS 1' | 'JIPAS 2';
  campus_id?: 'JIPAS 1' | 'JIPAS 2';
  isCurrent: boolean;
  enrollmentDate: string;
  photo?: string;
  isApproved?: boolean;
  approvalStatus?: 'Approved' | 'Pending' | 'Rejected';
  enrolledBy?: string;
  submissionDate?: string;
  rejectionReason?: string;
  name?: string;
  currentClass?: string;
  guardianName?: string;
  guardianRelationship?: string;
  guardianOccupation?: string;
  guardianAddress?: string;
  emergencyContactPerson?: string;
  emergencyContactPhone?: string;
  healthConditions?: string;
  bloodGroup?: string;
  previousSchool?: string;
  documents?: StudentDocument[];
  transfers?: StudentTransferRecord[];
  transferStatus?: 'None' | 'Transferred Out' | 'Transferred In' | 'Transferred Campus';
  serviceSubscriptions?: {
    transport?: boolean;
    transportRoute?: string;
    boarding?: boolean;
    boardingHouse?: string;
    library?: boolean;
  };
  createdAt?: string;
  updatedAt?: string;
  versionVector?: any;
}

export interface StudentDocument {
  id: string;
  name: string;
  type: 'Birth Certificate' | 'Immunization Record' | 'BECE Results Slip' | 'WASSCE Results Slip' | 'Previous School Report' | 'Transfer Certificate' | 'National ID' | 'Other';
  fileUrl?: string;
  fileName?: string;
  fileSizeKb?: number;
  uploadedAt: string;
  verified: boolean;
  verifiedBy?: string;
  verifiedAt?: string;
  verificationNotes?: string;
}

export interface StudentTransferRecord {
  id: string;
  studentId: string;
  studentName: string;
  admissionNo: string;
  transferType: 'Inter-Campus Transfer' | 'Transfer Out' | 'Transfer In';
  fromCampus?: string;
  toCampus?: string;
  fromSchool?: string;
  toSchool?: string;
  fromClass: string;
  toClass: string;
  date: string;
  reason: string;
  clearanceStatus: 'Pending' | 'Approved' | 'Completed' | 'Rejected';
  authorizedBy?: string;
  certificateIssued?: boolean;
  notes?: string;
  createdAt: string;
}

export interface Teacher {
  id: string;
  staffId?: string;
  name: string;
  lastName?: string;
  otherNames?: string;
  email: string;
  phone: string;
  gender: 'Male' | 'Female';
  campus?: 'JIPAS 1' | 'JIPAS 2';
  status?: 'Active' | 'Inactive' | 'On Leave';
  academicQualification: string;
  professionalQualification: string;
  designation: string;
  rank: string;
  department?: string;
  ntcLicenseNo?: string;
  emergencyContact?: string;
  bloodGroup?: string;
  dateJoined?: string;
  dateOfEmployment?: string;
  photo?: string;
  classesTaught: string[];
  subjectsTaught: string[];
  headteacherPrivileges?: HeadteacherPrivilegesConfig;
  hodPrivileges?: HodPrivilegesConfig;
}

export interface ScoreItem {
  subject: string;
  classWork?: number;     // Continuous Assessment (Class Work / Task)
  homework?: number;      // Continuous Assessment (Homework / Assignment)
  projectTest?: number;   // Continuous Assessment (Project / Class Test)
  classScore: number;     // Total Continuous Assessment (SBA, e.g. out of 40% or 50%)
  examScore: number;      // Terminal Examination Score (e.g. out of 60% or 50%)
  total: number;          // Total Composite Score (100%)
  grade: string;          // GES Grade (1 - 9)
  position?: string;      // Subject Position
  remark: string;         // Descriptive remark
}

export interface TermReport {
  id: string;
  studentId: string;
  studentName: string;
  admissionNo: string;
  className: string;
  academicYear: string;
  term: string;
  campus?: string;
  attendancePresent: number;
  attendanceTotal: number;
  conduct: string;
  attitude: string;
  interest: string;
  teacherComment: string;
  headmasterComment: string;
  scores: ScoreItem[];
  totalScore: number;
  averageScore: number;
  position: string;
  isPublished?: boolean;
  publishedAt?: string;
  publishedBy?: string;
  promotedTo?: string;
  promotionStatus?: 'Promoted' | 'Repeated' | 'On Probation' | 'Advanced' | string;
  nextTermBegins?: string;
  vacationDate?: string;
  rawScore?: number;
  aggregate?: string;
}

export interface ClassReportBroadcast {
  id: string;
  className: string;
  academicYear: string;
  term: string;
  isBroadcasted: boolean;
  broadcastedAt?: string;
  broadcastedBy?: string;
  status: 'Published' | 'Draft' | 'Locked' | 'Archived' | 'Submitted';
  releaseNotes?: string;
  nextTermBegins?: string;
  vacationDate?: string;
  totalStudentsCount?: number;
  classAverage?: number;
  allowDownload?: boolean;
}

export interface FeeItem {
  id: string;
  name: string;
  amount: number;
  department: string;
}

export interface FeeOptionItem {
  id: string;
  name: string;
  category: 'Tuition' | 'PTA' | 'ICT' | 'Exams' | 'Maintenance' | 'Transport' | 'Uniform' | 'Health' | 'Feeding' | 'Administrative' | 'Other' | string;
  amount: number;
  applicableClass: string;
  description?: string;
  frequency?: 'Termly' | 'Annually' | 'Monthly' | 'One-Time' | 'Per-Term';
  mandatory: boolean;
  isActive?: boolean;
  code?: string;
}

export interface FeePolicySettings {
  currencySymbol: string;
  defaultPaymentTerm: string;
  allowPartPayments: boolean;
  minDepositPercentage: number;
  lateFeePenaltyPercent: number;
  siblingDiscountPercent: number;
  scholarshipGrantActive: boolean;
  receiptHeaderNote: string;
  receiptFooterNote: string;
}

export interface StudentBill {
  id: string;
  studentId: string;
  studentName: string;
  admissionNo: string;
  className: string;
  academicYear: string;
  term: string;
  campus?: string;
  billNo?: string;
  items: { name: string; amount: number }[];
  subTotal: number;
  arrears: number;
  discount: number;
  payable: number;
  paid: number;
  balance: number;
  status: 'Fully Paid' | 'Partially Paid' | 'Unpaid' | 'Overpaid' | 'Voided' | 'Corrected' | 'VOIDED' | 'CORRECTED';
  isVoided?: boolean;
  isCorrected?: boolean;
  voidedAt?: string;
  voidedBy?: string;
  voidReason?: string;
  correctionId?: string;
  correctionReference?: string;
  originalBillId?: string;
  originalStudentId?: string;
  revision?: number;
  dueDate?: string;
  dateIssued?: string;
  updatedAt?: string;
  history?: Array<{
    type: string;
    amount?: number;
    date?: string;
    user?: string;
    reason?: string;
    [key: string]: any;
  }>;
  actionRequired?: boolean;
  actionRequiredReason?: string;
  actionRequiredDate?: string;
  actionSeverity?: 'Critical' | 'Moderate' | 'Warning';
  actionStatus?: 'Pending Follow-up' | 'Contacted' | 'Promised' | 'Resolved';
  lastContactDate?: string;
  promisedDate?: string;
  followUpNotes?: string;
  paidAmount?: number; // Added for backward compatibility with schema.sql
  totalAmount?: number; // Added for backward compatibility with schema.sql
}

export type CorrectionReasonCode =
  | 'WRONG_AMOUNT'
  | 'WRONG_STUDENT'
  | 'WRONG_STUDENT_SELECTED'
  | 'AMOUNT_TYPO'
  | 'DUPLICATE_FEE'
  | 'WRONG_FEE_ITEM'
  | 'WRONG_ACADEMIC_TERM'
  | 'WRONG_TERM_ASSIGNED'
  | 'WRONG_ACADEMIC_YEAR'
  | 'INCORRECT_TARIFF'
  | 'DATA_ENTRY_ERROR'
  | 'FEE_SHOULD_NOT_BE_CREATED'
  | 'OTHER';

export interface FeeCorrectionRecord {
  id: string; // correctionId (e.g. CORR-2026-XXXXXX)
  originalBillId: string;
  replacementBillId?: string;
  originalStudentId: string;
  correctedStudentId?: string;
  originalAmount: number;
  correctedAmount?: number;
  originalFeeItem?: string;
  correctedFeeItem?: string;
  originalTerm?: string;
  correctedTerm?: string;
  action: 'CORRECT_AMOUNT' | 'VOID' | 'CORRECT_STUDENT' | 'CORRECT_FEE_ITEM' | 'CORRECT_TERM' | 'CORRECT_DUPLICATE' | 'CORRECT_PAYMENT_STUDENT' | 'CORRECT_PAYMENT_AMOUNT' | 'CORRECT_PAYMENT_CATEGORY' | 'CORRECT_PAYMENT_PERIOD' | 'VOID_PAYMENT';
  reasonCode: CorrectionReasonCode;
  reasonText: string;
  actorId: string;
  actorRole: string;
  campusId: string;
  timestamp: string;
  previousStatus: string;
  newStatus: string;
  idempotencyKey?: string;
  baseRevision?: number;
  baseUpdatedAt?: string;
}

export interface DailyFeeAuditSummary {
  lastRunDate: string;
  lastRunTimestamp: string;
  totalStudentsChecked: number;
  flaggedCount: number;
  totalOverdueAmount: number;
  criticalCount: number;
  moderateCount: number;
  warningCount: number;
  items: {
    studentId: string;
    studentName: string;
    admissionNo: string;
    className: string;
    parentName: string;
    parentPhone: string;
    balance: number;
    severity: 'Critical' | 'Moderate' | 'Warning';
    reason: string;
    status: 'Pending Follow-up' | 'Contacted' | 'Promised' | 'Resolved';
    promisedDate?: string;
  }[];
}

export interface PaymentRecord {
  id: string;
  receiptNo: string;
  date: string;
  studentId: string;
  studentName: string;
  admissionNo: string;
  className: string;
  department?: string;
  paidAs?: string;
  billAmount?: number;
  arrears?: number;
  discount?: number;
  payable?: number;
  paid: number;
  amount?: number;
  balance?: number;
  method: 'Cash' | 'Mobile money' | 'Bank Transfer' | string;
  status: 'Fully Paid' | 'Partially Paid' | 'Verified' | string;
  collectedBy?: string;
  collectorRole?: string;
  classAssigned?: string;
  referenceNo?: string;
  paymentMethod?: string;
  receivedBy?: string;
  description?: string;
  notes?: string;
  isDuplicateRisk?: boolean;
  academicYear?: string;
  term?: string;
}

export interface SecurityAuditLog {
  id: string;
  timestamp: string;
  performedBy?: string;
  performedByRole?: string;
  targetUser?: string;
  targetUserRole?: string;
  actionType: 'Role Update' | 'Privilege Modification' | 'Account Deactivation' | 'Password Reset' | 'Access Level Change' | string;
  details: string;
  userId?: string;
  userName?: string;
  userRole?: string;
  resource?: string;
  resourceId?: string;
  severity?: 'INFO' | 'WARNING' | 'CRITICAL' | 'ALERT';
  ipAddress?: string;
  metadata?: Record<string, any>;
}

export interface TariffCorrectionLog {
  id: string;
  studentId: string;
  studentName?: string;
  admissionNo?: string;
  className?: string;
  originalTariff: {
    payable?: number;
    subTotal?: number;
    items?: Array<{ name: string; amount: number }>;
    [key: string]: any;
  } | number | string;
  correctedTariff: {
    payable?: number;
    subTotal?: number;
    items?: Array<{ name: string; amount: number }>;
    [key: string]: any;
  } | number | string;
  accountantId: string;
  accountantName?: string;
  timestamp: string;
  campus?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  endDate?: string;
  academicYear?: string;
  term?: string;
  category: 'Academic' | 'Holiday' | 'Exam' | 'Sports' | 'Meeting' | 'Cultural' | 'Graduation' | 'Reopening' | 'Vacation' | string;
  description: string;
  location?: string;
  targetAudience?: 'All' | 'Teachers' | 'Students' | 'Parents' | 'Staff' | string;
  isImportant?: boolean;
}

export type Bill = StudentBill;

export type FinancialDiscrepancyType =
  | 'DUPLICATE_RECEIPT'
  | 'DUPLICATE_PAYMENT'
  | 'BALANCE_MISMATCH'
  | 'UNALLOCATED_PAYMENT'
  | 'UNEXPLAINED_CREDIT'
  | 'UNVERIFIED_EXTERNAL_EVIDENCE'
  | 'TARIFF_DEVIATION'
  | 'PERIOD_INCONSISTENCY'
  | 'EXPENSE_VARIANCE'
  | 'PAYROLL_VARIANCE'
  | 'DASHBOARD_VARIANCE'
  | 'ZERO_ENROLLMENT_TARIFF';

export type DiscrepancySeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type ExternalEvidenceStatus = 'VERIFIED' | 'NOT VERIFIED' | 'SUSPECTED_DUPLICATE' | 'MATHEMATICAL_ERROR';

export interface FinancialExceptionItem {
  id: string;
  studentRef?: string;
  studentName?: string;
  admissionNo?: string;
  campus: string;
  academicPeriod: string;
  academicYear?: string;
  term?: string;
  category: FinancialDiscrepancyType;
  severity: DiscrepancySeverity;
  expectedAmount: number;
  recordedAmount: number;
  variance: number;
  transactionRefs: string[];
  description: string;
  verificationStatus: ExternalEvidenceStatus;
  recommendedInvestigation: string;
  detectedAt: string;
  rawDetails?: Record<string, any>;
}

export interface FinancialReconciliationReport {
  id: string;
  reconciliationDate: string;
  academicPeriod: string;
  academicYear?: string;
  term?: string;
  campus: string;
  status: 'Clean' | 'Discrepancies Detected' | 'Under Investigation' | 'Resolved';
  reviewerName: string;
  reviewerRole: string;
  
  // Dashboard Core Metrics
  totalPostedCharges: number;
  totalValidCollections: number;
  totalOutstandingBalances: number;
  unallocatedPaymentsAmount: number;
  unexplainedCreditsAmount: number;
  reversedPaymentsAmount: number;
  totalRefundsAmount: number;
  
  // Account counts
  totalAccountsReconciled: number;
  totalDiscrepanciesCount: number;
  unresolvedDiscrepanciesAmount: number;
  
  // Exceptions
  exceptions: FinancialExceptionItem[];

  // Cross-system dashboard reconciliations
  dashboardReconciliations: {
    accountantDashboardReconciled: boolean;
    accountantVariance: number;
    secretaryDashboardReconciled: boolean;
    secretaryVariance: number;
    ceoDashboardReconciled: boolean;
    ceoVariance: number;
    notes: string;
  };

  // Operational summaries
  expenseReconciliation: {
    totalExpensesRecorded: number;
    unverifiedExpensesCount: number;
    variance: number;
  };
  payrollReconciliation: {
    totalPayrollDisbursed: number;
    payslipDiscrepanciesCount: number;
    variance: number;
  };
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type?: string;
  recipientGroup?: string;
  targetAudience?: string;
  targetClass?: string;
  targetDepartment?: string;
  targetRole?: string;
  targetRoles?: string[];
  targetUserId?: string;
  date?: string;
  dateSent?: string;
  scheduledFor?: string;
  createdAt?: string;
  read?: boolean;
  sender?: string;
  sentBy?: string;
  priority?: 'Normal' | 'Medium' | 'High' | string;
  status?: string;
  deliveryStatus?: 'Delivered' | 'Pending' | 'Scheduled' | 'Failed';
  smsDeliveryStatus?: 'Delivered' | 'Sent' | 'Failed' | 'Not Sent';
  emailDeliveryStatus?: 'Delivered' | 'Sent' | 'Failed' | 'Not Sent';
  readCount?: number;
  readBy?: string[];
}

export interface FeeRefundRecord {
  id: string;
  refundVoucherNo: string;
  receiptRefNo?: string;
  paymentId?: string;
  studentId: string;
  studentName: string;
  admissionNo: string;
  className: string;
  amount: number;
  date: string;
  refundMethod: 'Cash' | 'Mobile money' | 'Bank Transfer' | 'Cheque';
  reason: 'Overpayment' | 'Withdrawal / Relocation' | 'Duplicate Payment' | 'Fee Adjustment / Waiver' | 'Other';
  approvedBy: string;
  processedBy: string;
  status: 'Approved' | 'Pending' | 'Completed' | 'Cancelled';
  notes?: string;
  academicYear?: string;
  term?: string;
  campus?: string;
  createdAt: string;
}

export interface ScoreApprovalRecord {
  id: string;
  className: string;
  subjectName: string;
  academicYear: string;
  term: string;
  teacherId: string;
  teacherName: string;
  status: 'Submitted' | 'Under Review' | 'Approved' | 'Revision Requested';
  submittedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewComments?: string;
  scoresCount: number;
  averageScore: number;
  campus?: string;
}

export interface TransportRouteItem {
  id: string;
  routeName: string;
  driverName: string;
  driverPhone: string;
  busNumber: string;
  capacity: number;
  enrolledStudentsCount?: number;
  stops: string[];
  farePerTerm: number;
  status?: 'Active' | 'Inactive';
  campus?: string;
}

export interface BoardingRoomItem {
  id: string;
  hallName: string;
  roomNumber: string;
  gender: 'Boys' | 'Girls' | 'Mixed';
  houseMaster: string;
  capacity: number;
  occupied: number;
  status?: 'Available' | 'Full' | 'Maintenance';
  campus?: string;
}

export interface SMSHistoryItem {
  id: string;
  recipientName: string;
  recipientPhone: string;
  message: string;
  senderId: string;
  dateSent: string;
  status: 'Delivered' | 'Sent' | 'Failed' | string;
  costGH: number;
  smsCount: number;
}

export interface WhatsAppGroupItem {
  id: string;
  name: string;
  category: 'PTA' | 'Class' | 'Staff' | 'General';
  inviteLink?: string;
  memberCount: number;
  classAssigned?: string;
  description?: string;
}

export interface WhatsAppLogItem {
  id: string;
  groupName: string;
  groupId?: string;
  title: string;
  message: string;
  dateSent: string;
  sentBy: string;
  status: 'Delivered' | 'Dispatched';
  memberCount?: number;
}

export interface OverdueAlertRecord {
  id: string;
  studentId: string;
  studentName: string;
  admissionNo: string;
  className: string;
  parentName: string;
  parentPhone: string;
  tuitionArrears: number;
  levyArrears: number;
  totalBalance: number;
  dueDate: string;
  status: 'Pending' | 'Reminded' | 'Promised' | 'Flagged' | 'Resolved';
  flagReason?: string;
  internalNotes?: string;
  lastReminderDate?: string;
  reminderCount: number;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
}

export interface ParentReminderLog {
  id: string;
  studentId: string;
  studentName: string;
  admissionNo: string;
  parentName: string;
  parentPhone: string;
  balanceReminded: number;
  channel: 'WhatsApp Direct' | 'WhatsApp Group' | 'SMS' | 'In-App Portal';
  tone: string;
  dateSent: string;
  operator: string;
  status: 'Sent' | 'Delivered' | 'Failed';
  messageSnippet: string;
}

export interface LoginHistoryItem {
  id: string;
  userId: string;
  userName: string;
  role: string;
  ipAddress: string;
  device: string;
  timestamp: string;
  status: 'Success' | 'Failed' | string;
}

export interface LoginLog {
  id: string;
  user: string;
  role: string;
  email: string;
  ipAddress: string;
  device: string;
  browser: string;
  os: string;
  loginTime: string;
  logoutTime?: string;
  status: 'Success' | 'Failed';
  failReason?: string;
}

export interface AcademicYearItem {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: 'Current' | 'Active' | 'Upcoming' | 'Completed';
  hasRecords: boolean;
  campus?: string;
}

export interface TermItem {
  id: string;
  academicYear: string;
  name: string;
  startDate: string;
  endDate: string;
  daysOpen: number;
  nextTermDate: string;
  holidays: number;
  status: 'Current' | 'Completed' | 'Upcoming';
  campus?: string;
}

export interface DepartmentItem {
  id: string;
  name: string;
  code?: string;
  description: string;
  headOfDept?: string;
  subDepartments?: string[]; // Sub-departments under this department (e.g. SHS Courses / Programmes: Science, Visual Arts, Home Economics, etc.)
  campus?: string;
}

export interface CourseItem {
  id: string;
  name: string; // e.g. "Science", "Visual Arts", "Home Economics", "General Arts", "Business", "Agricultural Science"
  code: string; // e.g. "SCI", "V-ART", "H-ECON", "G-ART", "BUS", "AGRI"
  department: string; // "Senior High School" / "SHS"
  description?: string;
  coreSubjects?: string[];
  electiveSubjects?: string[];
  headOfCourse?: string;
  headOfProgramme?: string;
  headOfDepartment?: string;
  durationYears?: number; // 3 years (1, 2, 3)
  levels?: ('1' | '2' | '3' | string)[];
  classesGenerated?: string[]; // e.g. ["Science 1", "Science 2", "Science 3"]
  campus?: string;
}

export interface ClassItem {
  id: string;
  name: string;
  department: string;
  course?: string; // Optional: Course / Programme for SHS (e.g. "Science", "Visual Arts", "Home Economics")
  level?: string | number; // Optional: 1, 2, 3
  classTeacher: string;
  roomNumber: string;
  capacity: number;
  status: 'Active' | 'Inactive';
  assignedSubjects?: string[]; // Linked subject names or IDs based on master structure
  campus?: string;
}

export interface HouseItem {
  id: string;
  name: string;
  color: string;
  master: string;
  patron?: string;
  motto: string;
  campus?: string;
}

export interface SubjectItem {
  id: string;
  name: string;
  code: string;
  department: string; // The parent Department
  classId?: string;   // The specific class this subject belongs to
  category: 'Core' | 'Elective';
  campus?: string;
}

export interface AcademicYear {
  id: string;
  name: string;
  startDate?: string;
  endDate?: string;
  isCurrent?: boolean;
  status?: 'Active' | 'Upcoming' | 'Archived';
}

export interface Term {
  id: string;
  name: string;
  termNumber?: number;
  academicYear?: string;
  startDate?: string;
  endDate?: string;
  isCurrent?: boolean;
  daysOpen?: number;
  resumptionDate?: string;
}

export interface Department {
  id: string;
  name: string;
  code?: string;
  hod?: string;
  description?: string;
}

export interface SchoolClass {
  id: string;
  name: string;
  department?: string;
  stream?: string;
  roomNo?: string;
  classTeacher?: string;
  capacity?: number;
}

export interface House {
  id: string;
  name: string;
  color?: string;
  houseMaster?: string;
  motto?: string;
}

export interface Subject {
  id: string;
  name: string;
  code?: string;
  department?: string;
  isCore?: boolean;
}

export interface StaffWorkingHoursConfig {
  startTime: string;        // e.g. "07:30" (AM)
  latenessCutoff: string;   // e.g. "08:00" (AM)
  closingTime: string;      // e.g. "15:30" (3:30 PM)
  workingDays: string[];    // e.g. ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  gracePeriodMinutes?: number; // e.g. 5
}

export interface SystemSettingsConfig {
  schoolName: string;
  schoolMotto: string;
  address: string;
  email: string;
  phone: string;
  altPhone: string;
  activeAcademicYear: string;
  activeTerm: string;
  nextTermBegins: string;
  smsSenderId: string;
  currencySymbol: string;
  enableStudentPortal: boolean;
  enableFeeReceiptPrinting: boolean;
  allowReportDownload: boolean;
  autoPromotePassingScore: number;
  enableIncompleteReminders?: boolean;
  reminderFrequency?: 'Daily' | 'Weekly' | 'Bi-weekly';
  notifyParentsForMissingGrades?: boolean;
  missingGradeThreshold?: number;
  workingHours?: StaffWorkingHoursConfig;
}

export interface SchoolSettings {
  schoolName: string;
  schoolMotto: string;
  schoolLogo: string;
  laptopLogo?: string;
  mobileLogo?: string;
  thisDeviceLogo?: string;
  phone: string;
  email: string;
  address: string;
  website: string;
  activeAcademicYear: string;
  activeTerm: string;
  staffSecretCode?: string;
  enableIncompleteReminders?: boolean;
  reminderFrequency?: 'Daily' | 'Weekly' | 'Bi-weekly';
  notifyParentsForMissingGrades?: boolean;
  missingGradeThreshold?: number;
  workingHours?: StaffWorkingHoursConfig;
  updatedAt?: string;
}

export interface ThemePaletteConfig {
  id?: string;
  name: string;
  primaryColor: string;
  primaryHoverColor?: string;
  primaryLightColor?: string;
  backgroundColor: string;
  cardBackgroundColor: string;
  textColor: string;
  accentColor?: string;
  sidebarBgColor?: string;
  headerBgColor?: string;
  mode?: 'light' | 'dark' | 'custom';
  wallpaper?: 'classroom' | 'assembly' | 'none' | string;
  wallpaperOpacity?: number;
  updatedAt?: string;
  updatedBy?: string;
}

export interface UserAccountItem {
  id: string;
  name: string;
  email: string;
  username: string;
  role: UserRole;
  phone: string;
  status: 'Active' | 'Inactive' | 'Locked' | 'Pending';
  lastLogin: string;
  createdAt: string;
  campus?: string;
  password?: string;
  isApproved?: boolean;
  registrationType?: 'faculty' | 'student' | 'admin' | 'executive';
  department?: string;
  className?: string;
  classAssigned?: string;
  teacherId?: string;
  admissionNo?: string;
  parentName?: string;
  parentPhone?: string;
  staffId?: string;
  approvedBy?: string;
  approvedAt?: string;
  privilege?: 'read' | 'read_write';
  allowedModules?: string[];
  accountantPrivileges?: AccountantPrivilegesConfig;
  ceoPrivileges?: CeoPrivilegesConfig;
  headteacherPrivileges?: HeadteacherPrivilegesConfig;
  hodPrivileges?: HodPrivilegesConfig;
  executiveTitle?: string;
  leadershipTitle?: string;
  assignedDepartments?: string[];
  subjectsTaught?: string[];
  classesTaught?: string[];
  classesAssigned?: string[];
  departmentCourse?: string;
  pendingLoginUpdate?: StaffLoginUpdateRequest;
}

export interface StaffLoginUpdateRequest {
  id: string;
  userId: string;
  staffId: string;
  teacherName: string;
  currentUsername: string;
  currentEmail: string;
  currentPhone: string;
  requestedUsername?: string;
  requestedEmail?: string;
  requestedPhone?: string;
  requestedPassword?: string;
  reason?: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  requestedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  adminFeedback?: string;
  campus?: string;
}

export interface TeacherAssignmentItem {
  id: string;
  teacherId: string;
  teacherName: string;
  className: string;
  subjectName: string;
  academicYear: string;
  term: string;
  roleType: 'Class Teacher' | 'Subject Teacher' | 'Assistant';
}

export interface TeacherAttendanceRecord {
  id: string;
  date: string;
  teacherId: string;
  teacherName: string;
  status: 'Present' | 'Absent' | 'Late' | 'Excused';
  campus?: string;
  timeIn?: string;
  timeOut?: string;
  remarks?: string;
  clockInMethod?: string;
  verified?: boolean;
  officeStationId?: string;
}

export interface StudentAttendanceRecord {
  id: string; // "att-[class]-[date]"
  date: string; // YYYY-MM-DD
  className: string;
  records: Record<string, 'Present' | 'Late' | 'Absent' | 'Excused'>; // studentId -> status
  updatedAt: string;
  updatedBy: string;
}

export interface PromotionRecord {
  id: string;
  date: string;
  fromClass: string;
  toClass: string;
  academicYear: string;
  studentCount: number;
  promotedBy: string;
  notes?: string;
}

export interface GradingScaleItem {
  id: string;
  department: string;
  systemName: string;
  academicYear: string;
  term: string;
  bands: {
    minScore: number;
    maxScore: number;
    grade: string;
    remark: string;
  }[];
}

export interface ScoreConversionItem {
  id: string;
  academicYear: string;
  term: string;
  department: string;
  classScoreWeight: number; // e.g., 40 or 30
  examScoreWeight: number;  // e.g., 60 or 70
  description?: string;
}

export interface BankDepositRecord {
  id: string;
  bankName: string;
  accountNumber: string;
  amount: number;
  bankReceiptNo: string; // Teller / Slip / Deposit receipt number
  date: string;
  depositedBy: string; // Name of person who sent/deposited money
  depositedByRole: 'accountant' | 'bursar' | 'secretary' | 'admin' | string;
  purpose: string; // e.g. "Daily Tuition Fee Collection Deposit"
  referenceNo?: string;
  notes?: string;
  status: 'Completed' | 'Pending Verification' | string;
  createdAt: string;
}

export interface SchoolExpenseRecord {
  id: string;
  voucherNo: string;
  date: string;
  category: 'Utilities & Water' | 'Electricity & Power' | 'Teaching & Lab Supplies' | 'Stationery & Printing' | 'Repairs & Maintenance' | 'Staff Welfare & Refreshment' | 'Sanitation & Cleaning' | 'Transport & Fuel' | 'Examination Materials' | 'ICT & Software Licenses' | 'Boarding & Kitchen Supplies' | 'Administrative / Petty Cash' | 'Sports & Extra-Curricular' | 'Other' | string;
  title: string;
  description?: string;
  amount: number;
  paymentMethod: 'Cash' | 'Mobile Money' | 'Bank Transfer' | 'Cheque' | 'Petty Cash' | string;
  vendorPayee: string;
  department?: string;
  recordedBy: string; // e.g. "Accountant (Grace Tetteh)", "Secretary (Abena Osei)"
  loggedBy?: string;
  recorderRole: 'accountant' | 'sub_accountant' | 'secretary' | 'admin' | string;
  approvedBy?: string;
  status: 'Approved' | 'Pending' | 'Paid' | 'Reconciled' | 'Void';
  receiptAttachmentUrl?: string;
  referenceNo?: string;
  academicYear?: string;
  term?: string;
  notes?: string;
  createdAt: string;
  campus?: string;
}

export interface SecretaryDailySummary {
  id: string;
  date: string;
  secretaryId: string;
  secretaryName: string;
  totalFeesCollected: number;
  totalExpensesLogged: number;
  totalExpensesIncurred?: number;
  netCashOnHand: number;
  transactionCount?: number;
  receiptsCount?: number;
  feesCount?: number;
  expensesCount?: number;
  isReconciled?: boolean;
  isReconciledWithBursar?: boolean;
  reconciledBy?: string;
  reconciledAt?: string;
  reconciliationNotes?: string;
  notes?: string;
  createdAt?: string;
  campus?: string;
}

export interface IncomeExpenseItem {
  id: string;
  date: string;
  type: 'Income' | 'Expense';
  category: string;
  title?: string;
  amount: number;
  paymentMethod?: string;
  recordedBy: string;
  receiptVoucherNo?: string;
  referenceNo?: string;
  notes?: string;
  description?: string;
}

export interface FinancialAuditItem {
  id: string;
  dateTime?: string;
  timestamp?: string;
  user: string;
  role?: string;
  studentName?: string;
  admissionNo?: string;
  studentAdmNo?: string;
  amount?: number;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'PRINT' | 'VOID' | string;
  changes?: string;
  ipAddress?: string;
  details?: string;
}

export interface FinancialAuditReport {
  id: string;
  auditDate: string;
  auditPeriod?: string;
  auditorName?: string;
  auditorRole?: string;
  academicYear?: string;
  term?: string;
  auditedBy?: string;
  totalBilled: number;
  totalCollections?: number;
  totalCollected?: number;
  accountantCollections?: number;
  secretaryCollections?: number;
  totalExpenditures?: number;
  totalExpenses?: number;
  totalPayrollPayout?: number;
  totalPayroll?: number;
  netOperatingSurplus?: number;
  netSurplus?: number;
  unreconciledSecretaryCash?: number;
  flaggedDiscrepanciesCount?: number;
  discrepancies: any;
  auditStatus: 'Clean / Reconciled' | 'Discrepancies Flagged' | 'Action Required' | 'Requires Action' | 'Balanced' | string;
  certifiedBy?: string;
  certifiedAt?: string;
  createdAt?: string;
  notes?: string;
}

export interface PaymentMethodConfig {
  id: string;
  type: 'bank' | 'momo' | 'online' | 'cash' | 'other';
  name: string;
  enabled: boolean;
  isPrimary?: boolean;
  accountName: string;
  accountNumber: string;
  bankOrProviderName?: string;
  branchOrSortCode?: string;
  instructions: string;
}

export interface PaymentSettingsConfig {
  methods: PaymentMethodConfig[];
  generalInstructions: string;
  allowPortalSubmission: boolean;
  requireProofReference: boolean;
  supportPhone: string;
  supportEmail: string;
  updatedAt?: string;
}

export interface ThermalPrinterSettingsConfig {
  receiptPaperMode: 'a6' | '80mm' | '58mm';
  includeLogo: boolean;
  customFooterText: string;
  showQrCode: boolean;
  autoPrintPrompt: boolean;
  printDensity: 'normal' | 'dark' | 'extra-dark';
}

export interface FeeSubmissionItem {
  id: string;
  studentId: string;
  studentName: string;
  admissionNo: string;
  className: string;
  amount: number;
  feeType: string;
  paymentMethod: string;
  transactionId: string;
  datePaid: string;
  submissionDate: string;
  status: 'Pending Verification' | 'Approved' | 'Rejected';
  notes?: string;
  rejectionReason?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  receiptNo?: string;
}

export interface ClassFeeTariffItem {
  id: string;
  classTitle: string;
  dept: string;
  baseTuition: number;
  ptaDues: number;
  ictFee: number;
  examFee: number;
  healthLevy: number;
  busTransit: number;
  notes?: string;
  customBreakdown?: { label: string; amount: number }[];
}

export interface StaffAllowanceBreakdown {
  responsibility: number;
  transport: number;
  housing: number;
  utilityHardship: number;
  overtime: number;
  bonus: number;
  other: number;
}

export interface StaffDeductionBreakdown {
  pensionEmployee: number;
  payeTax: number;
  welfareFund: number;
  loanRepayment: number;
  absenteeismPenalty: number;
  other: number;
}

export interface StaffSalaryStructure {
  id: string;
  staffId: string;
  staffName: string;
  staffType: 'Teaching' | 'Non-Teaching' | 'Administrative' | 'Support';
  designation: string;
  department: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  pensionNumber: string;
  tinNumber: string;
  basicSalary: number;
  allowances: StaffAllowanceBreakdown;
  paymentMethod: 'Bank Transfer' | 'Mobile Money' | 'Cash' | 'Cheque';
  isActive: boolean;
  phone?: string;
  email?: string;
  updatedAt?: string;
}

export interface StaffPayslipItem {
  id: string;
  payrollRunId: string;
  voucherNo?: string;
  voucherNumber?: string;
  staffId: string;
  staffName: string;
  staffType: 'Teaching' | 'Non-Teaching' | 'Administrative' | 'Support' | string;
  designation: string;
  department: string;
  month?: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  paymentDate: string;
  bankName: string;
  accountNumber: string;
  accountName?: string;
  pensionNumber: string;
  tinNumber: string;
  paymentMethod: 'Bank Transfer' | 'Mobile Money' | 'Cash' | 'Cheque' | string;
  basicSalary: number;
  allowances: StaffAllowanceBreakdown;
  totalAllowances: number;
  grossEarnings: number;
  deductions: StaffDeductionBreakdown;
  totalDeductions: number;
  netSalary: number;
  employerContribution?: {
    pensionEmployer: number;
    tier2Fund: number;
  };
  status: 'Draft' | 'Approved' | 'Paid' | 'Held';
  notes?: string;
  paidAt?: string;
  paidBy?: string;
}

export interface PayrollRun {
  id: string;
  batchNumber?: string;
  month: string;
  academicYear: string;
  term: string;
  staffType?: string;
  totalStaff: number;
  totalBasicSalary: number;
  totalAllowances: number;
  totalGrossPay?: number;
  totalGrossEarnings?: number;
  totalPensionEmployee: number;
  totalPensionEmployer: number;
  totalPAYETax: number;
  totalWelfare: number;
  totalLoanDeductions: number;
  totalDeductions: number;
  totalNetPayout?: number;
  totalNetPay?: number;
  status: 'Draft' | 'Approved' | 'Disbursed' | 'Archived';
  createdAt?: string;
  createdBy?: string;
  preparedBy?: string;
  preparedDate?: string;
  approvedAt?: string;
  approvedBy?: string;
  approvedDate?: string;
  disbursedAt?: string;
  disbursedBy?: string;
  payslips: StaffPayslipItem[];
  notes?: string;
}

export interface StaffLoanAdvance {
  id: string;
  staffId: string;
  staffName: string;
  staffType: string;
  loanType: 'Salary Advance' | 'Emergency Staff Loan' | 'Vehicle / Equipment Loan' | 'Welfare Relief Loan';
  principalAmount: number;
  monthlyDeduction: number;
  amountRepaid: number;
  remainingBalance: number;
  durationMonths: number;
  monthsRemaining: number;
  startDate: string;
  expectedEndDate: string;
  status: 'Active' | 'Paid Off' | 'Pending' | 'Suspended';
  approvedBy?: string;
  reason?: string;
}

export interface PayrollSettingsConfig {
  currencySymbol: string;
  pensionEmployeeRate: number;
  pensionEmployerRate: number;
  tier2EmployeeRate: number;
  defaultWelfareDeduction: number;
  enableAutoAbsenteeismDeduction: boolean;
  dailyAbsenteeismRate: number;
  defaultPayDay: number;
  schoolSignatoryTitle: string;
  headmasterSignatoryTitle: string;
  payslipHeaderNote: string;
  payslipFooterNote: string;
}

// -------------------------------------------------------------
// Feedback & Bug Reporting Types
// -------------------------------------------------------------
export type FeedbackType = 'bug' | 'comment' | 'suggestion' | 'praise';
export type FeedbackStatus = 'pending' | 'in_review' | 'resolved' | 'archived';
export type FeedbackPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface FeedbackItem {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  type: FeedbackType;
  title: string;
  message: string;
  category?: string;
  portal?: string;
  status: FeedbackStatus;
  priority: FeedbackPriority;
  deviceInfo?: string;
  adminNotes?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExamScheduleItem {
  id: string;
  className: string; // e.g. "Basic 1", "JHS 1", "General Science 1", or "All Classes"
  subjectName: string; // e.g. "Mathematics"
  examDate: string; // YYYY-MM-DD
  startTime: string; // e.g. "09:00 AM"
  endTime: string; // e.g. "11:00 AM"
  venue: string; // e.g. "Main Exam Hall A", "Room P-1"
  invigilator: string; // e.g. "Mr. Emmanuel Tetteh"
  totalMarks: number; // e.g. 100
  instructions?: string; // e.g. "No calculators allowed."
  status: 'Scheduled' | 'In Progress' | 'Completed' | 'Postponed';
  academicYear: string;
  term: string;
  isBroadcasted?: boolean;
  broadcastedAt?: string;
  broadcastedBy?: string;
}

// =========================================================================
// PHASE 40 OPERATIONAL HEALTH & MONITORING TYPES
// =========================================================================

export type OperationalHealthStatus = 'HEALTHY' | 'DEGRADED' | 'WARNING' | 'CRITICAL' | 'UNKNOWN';
export type OperationalHealthSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface OperationalHealthCheck {
  checkId: string;
  name: string;
  status: OperationalHealthStatus;
  checkedAt: string;
  message: string;
  details?: string;
  durationMs: number;
  campusId?: string;
  severity: OperationalHealthSeverity;
  remediationHint?: string;
}

export interface OperationalReport {
  overallStatus: OperationalHealthStatus;
  generatedAt: string;
  campusScope?: string;
  checks: OperationalHealthCheck[];
  database: {
    status: 'CONNECTED' | 'UNAVAILABLE' | 'UNAUTHORIZED' | 'CONFIGURATION_ERROR' | 'UNKNOWN';
    latencyMs?: number;
    error?: string;
  };
  sync: {
    status: OperationalHealthStatus;
    lastPushAt?: string;
    lastPullAt?: string;
    pendingWrites: number;
    lastError?: string;
  };
  backup: {
    status: OperationalHealthStatus;
    lastSnapshotAt?: string;
    ageMinutes: number;
    snapshotVersion?: number;
    collectionsCount: number;
  };
  offlineQueue: {
    status: OperationalHealthStatus;
    queuedCount: number;
    oldestTimestamp?: string;
  };
  errorMonitoring: {
    status: OperationalHealthStatus;
    totalErrors: number;
    recentErrorsCount: number;
    criticalErrorsCount: number;
  };
  auditLog: {
    status: OperationalHealthStatus;
    totalLogs: number;
    lastEventTimestamp?: string;
  };
  configuration: {
    status: OperationalHealthStatus;
    driftDetected: boolean;
    details: string[];
  };
  disasterRecovery: {
    status: 'READY' | 'DEGRADED' | 'NOT_READY';
    rpoMinutes: number;
    rtoMinutes: number;
  };
}

// =========================================================================
// PHASE 41 & 42 PRODUCTION DEPLOYMENT & LAUNCH GATE TYPES
// =========================================================================

export type EnvironmentType = 'development' | 'staging' | 'production' | 'preview' | 'test' | 'unknown';

export interface ProductionActionAuthorization {
  authorized: boolean;
  authorizedBy?: string;
  authorizedAt?: string;
  reason?: string;
}

export interface ConcurrencyTestMetrics {
  scenarioName: string;
  simulatedClients: number;
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  duplicateRejections: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  maxLatencyMs: number;
  integrityViolations: number;
  details?: string;
}

export type LaunchGateStatus = 'AUTOMATED_VERIFIED' | 'HUMAN_VERIFICATION_REQUIRED' | 'FAILED' | 'NOT_APPLICABLE' | 'PASS' | 'BLOCKED';

export interface LaunchGateItem {
  id: string;
  name: string;
  category: 'SECURITY' | 'INFRASTRUCTURE' | 'DATA_INTEGRITY' | 'OPERATIONS' | 'GOVERNANCE';
  status: LaunchGateStatus;
  description: string;
  verifiedDetails?: string;
  humanVerificationNotes?: string;
}

export interface ProductionLaunchGateItem {
  id: string;
  name: string;
  status: 'PASS' | 'FAIL' | 'BLOCKED' | 'HUMAN_VERIFICATION_REQUIRED';
  evidence?: string;
  checkedAt?: string;
}

export interface ProductionLaunchGateReport {
  generatedAt: string;
  commitSha?: string;
  deploymentId?: string;
  environment: EnvironmentType;
  overallStatus?: 'READY_FOR_HUMAN_REVIEW' | 'BLOCKED' | 'FAILED' | 'READY' | 'LIVE_VERIFIED' | 'ROLLBACK_REQUIRED';
  status?: 'READY' | 'BLOCKED' | 'LIVE_VERIFIED' | 'ROLLBACK_REQUIRED' | 'READY_FOR_HUMAN_REVIEW';
  automatedChecksPassed?: number;
  humanVerificationRequiredCount?: number;
  failedCount?: number;
  gates?: LaunchGateItem[];
  items?: ProductionLaunchGateItem[];
  concurrencyMetrics?: ConcurrencyTestMetrics[];
}

// =========================================================================
// PHASE 43 CROSS-DEVICE SYNCHRONIZATION & RECONCILIATION TYPES
// =========================================================================

export type SyncSessionStatus =
  | 'INITIALIZING'
  | 'AUTHENTICATING'
  | 'REMOTE_BASELINE_LOADING'
  | 'REMOTE_BASELINE_ESTABLISHED'
  | 'RECONCILING'
  | 'READY'
  | 'OFFLINE'
  | 'CONFLICT'
  | 'ERROR';

export type SyncOperationOrigin =
  | 'LOCAL_EDIT'
  | 'REMOTE_HYDRATION'
  | 'REMOTE_REALTIME'
  | 'RECOVERY'
  | 'IMPORT';

export interface SyncClientIdentity {
  deviceId: string;
  sessionId: string;
  createdAt: string;
}

export interface PendingMutation<T = any> {
  mutationId: string;
  deviceId: string;
  sessionId: string;
  entityType: string;
  entityId: string;
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  payload: T;
  baseRevision?: number;
  baseUpdatedAt?: string;
  createdAt: string;
  status: 'PENDING' | 'PROCESSING' | 'SYNCED' | 'CONFLICT' | 'FAILED';
  errorMessage?: string;
}

export interface SyncDiagnostics {
  deviceId: string;
  sessionId: string;
  status: SyncSessionStatus;
  lastRemoteRevision: number;
  lastLocalMutationAt?: string;
  pendingMutationsCount: number;
  lastSuccessfulPullAt?: string;
  lastSuccessfulPushAt?: string;
  lastConflictAt?: string;
  lastError?: string;
  acknowledgedMutationsCount?: number;
  rejectedMutationsCount?: number;
  staleEventsCount?: number;
  duplicateEventsCount?: number;
}

// =========================================================================
// PHASE 44 MUTATION JOURNALING, CONFLICT RESOLUTION & CONVERGENCE TYPES
// =========================================================================

export type JournaledMutationStatus = 
  | 'PENDING'
  | 'IN_FLIGHT'
  | 'ACKNOWLEDGED'
  | 'CONFLICT'
  | 'RETRY'
  | 'FAILED';

export type ConflictCategory =
  | 'NO_CONFLICT'
  | 'SAFE_TO_APPLY'
  | 'STALE_LOCAL'
  | 'STALE_REMOTE'
  | 'CONCURRENT_UPDATE'
  | 'DELETE_VS_UPDATE'
  | 'UPDATE_VS_DELETE'
  | 'DUPLICATE_MUTATION'
  | 'ALREADY_RESOLVED';

export interface FieldMutationMetadata {
  field: string;
  mutationId: string;
  deviceId: string;
  logicalRevision: number;
  updatedAt: string;
  value?: any;
}

export interface EntityRevisionMeta {
  revision?: number;
  logicalRevision?: number;
  updatedAt?: string;
  updatedByDeviceId?: string;
  updatedBySessionId?: string;
  lastMutationId?: string;
  fieldMeta?: Record<string, FieldMutationMetadata>;
}

export interface JournaledMutation<T = any> {
  mutationId: string;
  deviceId: string;
  sessionId: string;
  campusId?: string;
  entityType: string;
  entityId: string;
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  payload: T;
  baseRevision?: number;
  baseUpdatedAt?: string;
  createdAt: string;
  logicalRevision: number;
  status: JournaledMutationStatus;
  attemptCount: number;
  lastAttemptAt?: string;
  acknowledgedAt?: string;
  conflictState?: ConflictCategory;
  errorMessage?: string;
}

export interface ConflictClassificationResult {
  category: ConflictCategory;
  winner: 'LOCAL' | 'REMOTE' | 'MERGE' | 'SUPPRESS' | 'NONE';
  reason: string;
  mergedPayload?: any;
  conflictingFields?: string[];
}

export interface ConvergenceSimulationResult {
  scenarioName: string;
  totalClients: number;
  totalOperations: number;
  converged: boolean;
  finalCanonicalRevision: number;
  duplicateSuppressionCount: number;
  outOfOrderResolutionCount: number;
  clockSkewCompensationCount: number;
  violationsCount: number;
  details?: string;
}






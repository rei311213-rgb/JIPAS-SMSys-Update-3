import React, { useState, useEffect } from 'react';
import { 
  Student, TermReport, StudentBill, PaymentRecord, CalendarEvent, NotificationItem, 
  PaymentSettingsConfig, FeeSubmissionItem, ClassReportBroadcast 
} from '../types';
import SchoolCalendarView from './SchoolCalendarView';
import JIPASLogo, { getSchoolLogo } from './common/JIPASLogo';
import LanguageSwitcher from './common/LanguageSwitcher';
import { subscribePaymentSettings, subscribeFeeSubmissions, saveFeeSubmission, saveNotification, subscribeClassBroadcasts } from '../services/dbService';
import { INITIAL_PAYMENT_SETTINGS, getStoredStudents, saveStoredStudents, getStoredUsers, saveStoredUsers } from '../services/storageService';
import { 
  Award, CreditCard, Calendar, User, Printer, CheckCircle, Clock, BookOpen, 
  AlertCircle, FileText, CheckCircle2, TrendingUp, ShieldCheck, Download,
  ExternalLink, Eye, ChevronRight, Phone, Home, Sparkles, QrCode, Bell,
  Send, Copy, Check, Building2, Smartphone, Plus, HelpCircle, X, Lock, ShieldAlert,
  LayoutDashboard, AlertTriangle, Key, MessageSquare
} from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

import AnnouncementsFeed from './student/AnnouncementsFeed';

interface StudentPortalProps {
  student: Student;
  reports: TermReport[];
  bills: StudentBill[];
  payments: PaymentRecord[];
  calendarEvents: CalendarEvent[];
  notifications?: NotificationItem[];
  broadcasts?: ClassReportBroadcast[];
}

export const VALID_STUDENT_TABS = new Set<string>([
  'dashboard',
  'reports',
  'fees',
  'calendar',
  'profile',
  'notifications',
  'announcements'
]);

export type StudentTab = 'dashboard' | 'reports' | 'fees' | 'calendar' | 'profile' | 'notifications' | 'announcements';

export const getInitialStudentTab = (): StudentTab => {
  if (typeof window !== 'undefined') {
    if (localStorage.getItem('jipas_force_dashboard') === 'true') {
      localStorage.removeItem('jipas_force_dashboard');
      window.location.hash = 'student/dashboard';
      return 'dashboard';
    }
    const hash = window.location.hash.replace(/^#\/?/, '');
    if (hash.startsWith('student/')) {
      const tabPart = hash.replace('student/', '');
      if (VALID_STUDENT_TABS.has(tabPart)) {
        return tabPart as StudentTab;
      }
    } else if (VALID_STUDENT_TABS.has(hash)) {
      return hash as StudentTab;
    }
    const saved = localStorage.getItem('jipas_active_page_student');
    if (saved && VALID_STUDENT_TABS.has(saved)) {
      return saved as StudentTab;
    }
  }
  return 'dashboard';
};

export default function StudentPortal({ 
  student: rawStudent, 
  reports, 
  bills, 
  payments, 
  calendarEvents, 
  notifications = [],
  broadcasts: propBroadcasts
}: StudentPortalProps) {
  const fallbackStudent: Student = {
    id: '',
    fullName: 'Student Portal User',
    admissionNo: 'Pending Assignment',
    gender: 'Male',
    className: 'Unassigned',
    rollNo: '—',
    dob: '—',
    house: '—',
    parentName: 'Parent / Guardian',
    parentPhone: '—',
    department: 'General',
    campus: 'JIPAS 1',
    status: 'Active',
    academicYear: '2026/2027',
    term: 'First Term',
    isCurrent: true,
    enrollmentDate: new Date().toISOString().split('T')[0]
  };

  const student = rawStudent || fallbackStudent;
  const [activeTab, setActiveTab] = useState<StudentTab>(() => getInitialStudentTab());
  const [broadcastsList, setBroadcastsList] = useState<ClassReportBroadcast[]>(propBroadcasts || []);

  useEffect(() => {
    if (propBroadcasts && propBroadcasts.length > 0) {
      setBroadcastsList(propBroadcasts);
    }
  }, [propBroadcasts]);

  useEffect(() => {
    const unsub = subscribeClassBroadcasts((list) => {
      if (list && list.length > 0) {
        setBroadcastsList(list);
      }
    });
    return () => unsub();
  }, []);

  // Sync activeTab to localStorage and URL hash
  useEffect(() => {
    try {
      localStorage.setItem('jipas_active_page_student', activeTab);
      window.location.hash = `student/${activeTab}`;
    } catch (e) {
      console.warn('Could not sync student tab to storage/hash:', e);
    }
  }, [activeTab]);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#\/?/, '');
      const tabPart = hash.startsWith('student/') ? hash.replace('student/', '') : hash;
      if (VALID_STUDENT_TABS.has(tabPart)) {
        setActiveTab(tabPart as StudentTab);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);
  const [selectedTerm, setSelectedTerm] = useState<string>('First Term');
  const [selectedReceipt, setSelectedReceipt] = useState<PaymentRecord | null>(null);
  const [showPrintStatementModal, setShowPrintStatementModal] = useState<boolean>(false);
  const [showDigitalIdModal, setShowDigitalIdModal] = useState<boolean>(false);

  // Security Password States
  const [secPasswordInput, setSecPasswordInput] = useState('');
  const [secConfirmPasswordInput, setSecConfirmPasswordInput] = useState('');
  const [passwordToast, setPasswordToast] = useState<string | null>(null);

  const handleSaveStudentPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!secPasswordInput || secPasswordInput.length < 4) {
      alert('Password must be at least 4 characters long.');
      return;
    }
    if (secPasswordInput !== secConfirmPasswordInput) {
      alert('Passwords do not match. Please re-enter.');
      return;
    }

    try {
      const storedStudents = getStoredStudents();
      const updatedStudents = storedStudents.map(s => s.id === student.id || s.admissionNo === student.admissionNo ? { ...s, password: secPasswordInput } : s);
      saveStoredStudents(updatedStudents);

      const storedUsers = getStoredUsers();
      const updatedUsers = storedUsers.map(u => (u.admissionNo === student.admissionNo || u.id === student.id) ? { ...u, password: secPasswordInput } : u);
      saveStoredUsers(updatedUsers);

      setPasswordToast('🔒 Account Password updated successfully! Parents and students can now log in using this password.');
      setTimeout(() => setPasswordToast(null), 4000);
      setSecPasswordInput('');
      setSecConfirmPasswordInput('');
    } catch (err) {
      console.error('Failed to save student password:', err);
      alert('Failed to save password. Please try again.');
    }
  };

  // Fee Payment Submission states
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettingsConfig>(INITIAL_PAYMENT_SETTINGS);
  const [feeSubmissions, setFeeSubmissions] = useState<FeeSubmissionItem[]>([]);
  const [showSubmitModal, setShowSubmitModal] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [submitToast, setSubmitToast] = useState<string | null>(null);

  // Form states
  const [formStudentName, setFormStudentName] = useState<string>(student.fullName);
  const [formClassName, setFormClassName] = useState<string>(student.className);
  const [formAdmissionNo, setFormAdmissionNo] = useState<string>(student.admissionNo);
  const [formFeeType, setFormFeeType] = useState<string>('Tuition Fee (Full Term Payment)');
  const [formMethod, setFormMethod] = useState<string>('MTN Mobile Money (MoMo Pay)');
  const [formAmount, setFormAmount] = useState<number>(0);
  const [formTxnId, setFormTxnId] = useState<string>('');
  const [formDatePaid, setFormDatePaid] = useState<string>(new Date().toISOString().split('T')[0]);
  const [formNotes, setFormNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Subscribe to Payment Settings and Fee Submissions
  useEffect(() => {
    const unsubSettings = subscribePaymentSettings((settings) => {
      if (settings) setPaymentSettings(settings);
    });

    const unsubSubmissions = subscribeFeeSubmissions((list) => {
      if (list) setFeeSubmissions(list);
    });

    return () => {
      unsubSettings();
      unsubSubmissions();
    };
  }, []);

  // Update pre-filled amount when student bill or modal opens
  useEffect(() => {
    const studentBill = bills.find(b => b.studentId === student.id || b.admissionNo === student.admissionNo);
    if (studentBill) {
      setFormAmount(studentBill.balance > 0 ? studentBill.balance : studentBill.payable);
    }
  }, [bills, student]);

  const handleCopyText = (text: string, id: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2500);
    } catch (e) {
      console.warn('Copy failed:', e);
    }
  };

  const handleSubmitFeeProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTxnId.trim() || formAmount <= 0) {
      alert('Please provide a valid Transaction ID and Payment Amount.');
      return;
    }

    setIsSubmitting(true);
    const newSubmission: FeeSubmissionItem = {
      id: `sub-${Date.now()}`,
      studentId: student.id,
      studentName: formStudentName.trim() || student.fullName,
      admissionNo: formAdmissionNo.trim() || student.admissionNo,
      className: formClassName.trim() || student.className,
      amount: Number(formAmount),
      feeType: formFeeType,
      paymentMethod: formMethod,
      transactionId: formTxnId.trim().toUpperCase(),
      datePaid: formDatePaid,
      submissionDate: new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }),
      status: 'Pending Verification',
      notes: formNotes.trim()
    };

    try {
      await saveFeeSubmission(newSubmission);

      // Create realtime Notification for Admin & Accountant
      const adminNotif: NotificationItem = {
        id: `notif-${Date.now()}`,
        title: `⚡ New Fee Payment Submission: ${newSubmission.studentName}`,
        message: `${newSubmission.studentName} (${newSubmission.className}, Adm: ${newSubmission.admissionNo}) submitted fee payment of ${(newSubmission.amount ?? 0).toFixed(2)} GHS via ${newSubmission.paymentMethod}. Transaction ID: ${newSubmission.transactionId}. Awaiting verification.`,
        date: new Date().toISOString().split('T')[0],
        type: 'General',
        recipientGroup: 'Admin',
        targetAudience: 'Staff & Teachers'
      };
      await saveNotification(adminNotif);

      setSubmitToast(`Fee payment proof (Txn ID: ${newSubmission.transactionId}) submitted to Admin & Accountant for verification!`);
      setShowSubmitModal(false);
      setFormTxnId('');
      setFormNotes('');
    } catch (err) {
      console.error('Error submitting fee proof:', err);
      alert('Failed to submit fee proof. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter submissions for this student
  const studentFeeSubmissions = feeSubmissions.filter(
    s => s.studentId === student.id || s.admissionNo === student.admissionNo || s.studentName.toLowerCase() === student.fullName.toLowerCase()
  );

  // Filter notifications relevant to student
  const studentNotifications = notifications.filter(n => 
    !n.recipientGroup || 
    n.recipientGroup === student.fullName || 
    n.recipientGroup === student.className || 
    n.targetClass === student.className ||
    n.targetAudience === 'Parents & Students'
  );

  // Find student report matching selected term or student
  const studentReportsList = reports.filter(r => r.studentId === student.id || r.admissionNo === student.admissionNo);

  // Historical terms averages data for chart
  const academicGrowthData = React.useMemo(() => {
    const studentReports = reports.filter(r => r.studentId === student.id || r.admissionNo === student.admissionNo);
    
    const data = studentReports.map(r => ({
      name: `${r.academicYear?.replace('20', '') || ''} - ${r.term || ''}`,
      average: r.averageScore || 0,
      total: r.totalScore || 0,
    }));

    if (data.length === 0) {
      return [
        { name: '25/26 - First Term', average: 74, total: 518 },
        { name: '25/26 - Second Term', average: 78, total: 546 },
        { name: '25/26 - Third Term', average: 82, total: 574 },
      ];
    }

    return data.sort((a, b) => a.name.localeCompare(b.name));
  }, [reports, student]);
  const studentReport = studentReportsList.find(r => r.term?.toLowerCase() === selectedTerm?.toLowerCase()) || studentReportsList[0] || reports[0];
  
  // Find active broadcast record for student's class and selected term
  const activeClassBroadcast = (broadcastsList || []).find(b => 
    b.className?.trim().toLowerCase() === student?.className?.trim().toLowerCase() && 
    b.term?.trim().toLowerCase() === selectedTerm?.trim().toLowerCase()
  );

  // Broadcast Gate Check: A student only sees their report if the Admin has broadcasted it for their class & term
  const isReportBroadcasted = activeClassBroadcast 
    ? activeClassBroadcast.isBroadcasted 
    : (studentReport?.isPublished ?? ((student?.className || '').toLowerCase() === 'basic 1' || (student?.className || '').toLowerCase() === 'jhs 1a'));

  const studentBill = bills.find(b => b.studentId === student.id || b.admissionNo === student.admissionNo) || bills[0];
  const studentPayments = payments.filter(p => p.studentId === student.id || p.admissionNo === student.admissionNo || p.studentName === student.fullName);

  // Computed metrics
  const averageScore = studentReport?.averageScore || 85.8;
  const attendanceRate = studentReport?.attendanceTotal 
    ? Math.round((studentReport.attendancePresent / studentReport.attendanceTotal) * 100) 
    : 97;
  const totalPayable = studentBill?.payable || 1200;
  const totalPaid = studentBill?.paid || 1200;
  const balanceDue = studentBill?.balance ?? 0;
  const clearancePercent = totalPayable > 0 ? Math.min(100, Math.round((totalPaid / totalPayable) * 100)) : 100;

  const handlePrintReceiptPDF = (receipt: any) => {
    if (!receipt) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const logoSrc = getSchoolLogo();
    const absoluteLogoSrc = logoSrc.startsWith('http') || logoSrc.startsWith('data:') 
      ? logoSrc 
      : window.location.origin + (logoSrc.startsWith('/') ? '' : '/') + logoSrc;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Fee Payment Receipt - ${receipt.receiptNo || 'Receipt'}</title>
          <style>
            @page { size: A5 landscape; margin: 10mm; }
            body { font-family: system-ui, -apple-system, sans-serif; color: #0f172a; padding: 20px; margin: 0; background: #fff; }
            .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 15px; }
            .school-logo { width: 40px; height: 40px; object-fit: contain; margin-bottom: 8px; }
            .title { font-size: 18px; font-weight: 900; color: #1e1b4b; text-transform: uppercase; }
            .subtitle { font-size: 11px; font-weight: 800; color: #0284c7; text-transform: uppercase; margin-top: 2px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; font-size: 11px; margin-bottom: 15px; }
            .box { background: #f8fafc; border: 1px solid #cbd5e1; padding: 10px; border-radius: 8px; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 15px; }
            th { background: #0f172a; color: white; padding: 6px 10px; text-align: left; font-size: 10px; text-transform: uppercase; }
            td { padding: 6px 10px; border-bottom: 1px solid #e2e8f0; }
            .amount { font-family: monospace; font-weight: bold; text-align: right; }
            .footer { display: flex; justify-content: space-between; align-items: flex-end; font-size: 10px; color: #64748b; margin-top: 20px; }
            .stamp { border: 2px dashed #94a3b8; padding: 10px 20px; border-radius: 6px; text-align: center; font-weight: bold; font-size: 9px; }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="${absoluteLogoSrc}" alt="School Crest" class="school-logo" />
            <div class="title">JIPAS EDUCATIONAL COMPLEX</div>
            <div class="subtitle">OFFICIAL FEE PAYMENT RECEIPT</div>
            <div style="font-size: 10px; color: #64748b;">01 BP. 2364 • Lomé — Togo &bull; Official Student Bursary Receipt</div>
          </div>

          <div class="grid">
            <div class="box">
              <strong>STUDENT PARTICULARS</strong><br/>
              Name: <strong>${student.fullName}</strong><br/>
              Admission No: <strong>${student.admissionNo}</strong><br/>
              Class: <strong>${student.className}</strong>
            </div>
            <div class="box">
              <strong>RECEIPT PARTICULARS</strong><br/>
              Receipt No: <strong>${receipt.receiptNo}</strong><br/>
              Date Paid: <strong>${receipt.date}</strong><br/>
              Payment Method: <strong>${receipt.paymentMethod || 'Cash / MoMo / Bank'}</strong>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th style="text-align: right;">Amount Paid (GHS)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${receipt.paidAs || 'Fee Payment'}</td>
                <td class="amount">${(receipt.paid ?? 0).toFixed(2)} GHS</td>
              </tr>
              <tr style="background: #f8fafc; font-weight: bold;">
                <td>Remaining Balance Outstanding</td>
                <td class="amount" style="color: #be123c;">${(receipt.balance ?? 0).toFixed(2)} GHS</td>
              </tr>
            </tbody>
          </table>

          <div class="footer">
            <div>
              Cashier Signature: <strong>${receipt.collectedBy || 'Accountant Office'}</strong><br/>
              Certified Electronic Receipt &bull; JIPAS Portal
            </div>
            <div class="stamp">OFFICIAL BURSAR STAMP</div>
          </div>

          <script>window.onload = function() { window.print(); window.close(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handlePrintTerminalReportPDF = () => {
    if (!studentReport) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const logoSrc = getSchoolLogo();
    const absoluteLogoSrc = logoSrc.startsWith('http') || logoSrc.startsWith('data:') 
      ? logoSrc 
      : window.location.origin + (logoSrc.startsWith('/') ? '' : '/') + logoSrc;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Terminal Academic Report - ${student.fullName}</title>
          <style>
            @page { size: A4 portrait; margin: 15mm; }
            body { font-family: system-ui, -apple-system, sans-serif; color: #0f172a; padding: 20px; margin: 0; background: #fff; }
            .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px; }
            .school-logo { width: 50px; height: 50px; object-fit: contain; margin-bottom: 10px; }
            .title { font-size: 20px; font-weight: 900; color: #1e1b4b; text-transform: uppercase; }
            .subtitle { font-size: 12px; font-weight: 800; color: #0284c7; text-transform: uppercase; margin-top: 2px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; font-size: 11px; margin-bottom: 20px; }
            .box { background: #f8fafc; border: 1px solid #cbd5e1; padding: 12px; border-radius: 8px; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 20px; }
            th { background: #0f172a; color: white; padding: 8px 10px; text-align: left; font-size: 10px; text-transform: uppercase; }
            td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .footer { margin-top: 30px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; font-size: 11px; }
            .signature { border-top: 1px solid #0f172a; padding-top: 5px; text-align: center; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="${absoluteLogoSrc}" alt="School Crest" class="school-logo" />
            <div class="title">JIPAS EDUCATIONAL COMPLEX</div>
            <div class="subtitle">OFFICIAL TERMINAL ACADEMIC PERFORMANCE REPORT</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 3px;">01 BP. 2364 • Lomé — Togo &bull; Academic Assessment Bureau</div>
          </div>

          <div class="grid">
            <div class="box">
              <strong>STUDENT PARTICULARS</strong><br/>
              Full Name: <strong>${student.fullName}</strong><br/>
              Admission No: <strong>${student.admissionNo}</strong><br/>
              Class: <strong>${student.className}</strong><br/>
              Department: <strong>${student.department || 'General'}</strong>
            </div>
            <div class="box">
              <strong>ACADEMIC PERIOD & SUMMARY</strong><br/>
              Academic Year: <strong>2025/2026</strong><br/>
              Term: <strong>${selectedTerm}</strong><br/>
              Overall Score: <strong>${(studentReport as any).overallScore || studentReport.averageScore || 'N/A'}%</strong><br/>
              Class Rank / Position: <strong>${studentReport.position || 'N/A'}</strong>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Subject</th>
                <th class="center">Class Score (40)</th>
                <th class="center">Exam Score (60)</th>
                <th class="center">Total Score (100)</th>
                <th class="center">Grade</th>
                <th>Teacher's Remarks</th>
              </tr>
            </thead>
            <tbody>
              ${((studentReport as any).subjectGrades || (studentReport.scores as any[]) || []).map((s: any) => `
                <tr>
                  <td class="bold">${s.subject || s.subjectName}</td>
                  <td class="center">${s.classScore ?? s.classWork ?? 0}</td>
                  <td class="center">${s.examScore ?? s.exam ?? 0}</td>
                  <td class="center bold">${s.totalScore ?? s.total ?? 0}</td>
                  <td class="center bold">${s.grade || 'N/A'}</td>
                  <td>${s.remarks || s.remark || 'Satisfactory progress'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="box" style="margin-bottom: 20px;">
            <strong>HEADMASTER & CLASS TEACHER REMARKS</strong><br/>
            Class Teacher Comment: <em>${studentReport.teacherComment || 'Demonstrates strong dedication and academic commitment.'}</em><br/>
            Headmaster Comment: <em>${studentReport.headmasterComment || 'Promoted to the next academic level.'}</em>
          </div>

          <div class="footer">
            <div class="signature">Class Teacher Signature</div>
            <div class="signature">Headmaster / Principal Stamp</div>
          </div>

          <script>window.onload = function() { window.print(); window.close(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handlePrintIdCardPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const logoSrc = getSchoolLogo();
    const absoluteLogoSrc = logoSrc.startsWith('http') || logoSrc.startsWith('data:') 
      ? logoSrc 
      : window.location.origin + (logoSrc.startsWith('/') ? '' : '/') + logoSrc;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Official Student ID Card - ${student.fullName}</title>
          <style>
            @page { size: 85.6mm 54mm; margin: 0; }
            body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 12px; background: #0f172a; color: #fff; width: 85.6mm; height: 54mm; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; }
            .header-flex { display: flex; align-items: center; justify-content: center; gap: 6px; margin-bottom: 2px; }
            .school-logo { width: 14px; height: 14px; object-fit: contain; }
            .title { font-size: 11px; font-weight: 900; text-align: center; text-transform: uppercase; color: #38bdf8; letter-spacing: 0.5px; }
            .sub { font-size: 7px; text-align: center; color: #cbd5e1; text-transform: uppercase; }
            .content { display: flex; gap: 10px; align-items: center; margin-top: 6px; }
            .avatar { width: 42px; height: 42px; border-radius: 50%; border: 2px solid #38bdf8; background: #1e293b; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 16px; shrink: 0; }
            .info { font-size: 8px; line-height: 1.3; }
            .info strong { color: #f8fafc; font-size: 9px; display: block; }
            .footer { border-top: 1px solid #334155; padding-top: 4px; display: flex; justify-content: space-between; font-size: 7px; color: #94a3b8; }
          </style>
        </head>
        <body>
          <div>
            <div class="header-flex">
              <img src="${absoluteLogoSrc}" alt="Crest" class="school-logo" />
              <div class="title">JIPAS EDUCATIONAL COMPLEX</div>
            </div>
            <div class="sub">OFFICIAL STUDENT IDENTIFICATION CARD</div>
            <div class="content">
              <div class="avatar">${student.fullName.charAt(0)}</div>
              <div class="info">
                <strong>${student.fullName}</strong>
                ID: ${student.admissionNo}<br/>
                Class: ${student.className}<br/>
                House: ${student.house} House
              </div>
            </div>
          </div>
          <div class="footer">
            <span>Emergency: ${student.parentPhone || 'N/A'}</span>
            <span>01 BP. 2364 • Lomé — Togo</span>
          </div>
          <script>window.onload = function() { window.print(); window.close(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handlePrintStatementPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const logoSrc = getSchoolLogo();
    const absoluteLogoSrc = logoSrc.startsWith('http') || logoSrc.startsWith('data:') 
      ? logoSrc 
      : window.location.origin + (logoSrc.startsWith('/') ? '' : '/') + logoSrc;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>JIPAS Fee Payment & Arrears Statement - ${student.fullName}</title>
          <style>
            @page { size: A4; margin: 15mm; }
            body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; color: #0f172a; padding: 20px; margin: 0; background: #fff; }
            .header-table { width: 100%; border-bottom: 2px solid #0f172a; padding-bottom: 15px; margin-bottom: 20px; }
            .school-logo { width: 50px; height: 50px; object-fit: contain; margin-bottom: 8px; }
            .school-title { font-size: 20px; font-weight: 900; color: #1e1b4b; text-transform: uppercase; letter-spacing: -0.5px; }
            .doc-sub { font-size: 12px; font-weight: 800; color: #0284c7; text-transform: uppercase; margin-top: 4px; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; font-size: 11px; }
            .info-box { background: #f8fafc; border: 1px solid #cbd5e1; padding: 12px 15px; border-radius: 10px; }
            .info-box strong { color: #0f172a; display: block; margin-bottom: 4px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
            .summary-card { background: ${balanceDue > 0 ? '#fef2f2' : '#f0fdf4'}; border: 2px solid ${balanceDue > 0 ? '#dc2626' : '#16a34a'}; padding: 18px; border-radius: 12px; margin-bottom: 24px; text-align: center; }
            .summary-title { font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; color: ${balanceDue > 0 ? '#991b1b' : '#14532d'}; }
            .summary-amount { font-size: 28px; font-weight: 900; font-family: monospace; color: ${balanceDue > 0 ? '#b91c1c' : '#15803d'}; margin: 6px 0; }
            .section-title { font-size: 12px; font-weight: 900; text-transform: uppercase; color: #0f172a; margin-top: 20px; margin-bottom: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 20px; }
            th { background: #0f172a; color: white; text-align: left; padding: 8px 12px; font-size: 10px; text-transform: uppercase; }
            td { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; }
            .amount { font-family: monospace; font-weight: bold; text-align: right; }
            .footer-grid { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 40px; padding-top: 20px; border-top: 1px dashed #cbd5e1; font-size: 10px; color: #64748b; }
            .stamp-area { border: 2px dashed #94a3b8; width: 160px; height: 70px; display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 900; color: #64748b; text-align: center; border-radius: 8px; text-transform: uppercase; }
          </style>
        </head>
        <body>
          <table class="header-table">
            <tr>
              <td>
                <img src="${absoluteLogoSrc}" alt="School Crest" class="school-logo" />
                <div class="school-title">JIPAS EDUCATIONAL COMPLEX</div>
                <div class="doc-sub">OFFICIAL STUDENT FEE PAYMENT & REMAINING ARREARS STATEMENT</div>
                <div style="font-size: 11px; color: #64748b; margin-top: 4px;">01 BP. 2364 • Lomé — Togo • Official Financial Control Desk</div>
              </td>
              <td style="text-align: right; font-size: 11px; color: #475569;">
                <div><strong>Statement Date:</strong> ${new Date().toLocaleDateString()}</div>
                <div><strong>Academic Year:</strong> ${studentBill?.academicYear || '2025/2026'}</div>
                <div><strong>Term:</strong> ${studentBill?.term || 'Current Term'}</div>
              </td>
            </tr>
          </table>

          <div class="info-grid">
            <div class="info-box">
              <strong>STUDENT PARTICULARS</strong>
              Name: <strong>${student.fullName}</strong><br/>
              Admission No: <strong>${student.admissionNo}</strong><br/>
              Class: <strong>${student.className}</strong><br/>
              Department: <strong>${student.department || 'General Department'}</strong>
            </div>
            <div class="info-box">
              <strong>PARENT / GUARDIAN CONTACT</strong>
              Guardian Name: <strong>${student.parentName || 'N/A'}</strong><br/>
              Contact Phone: <strong>${student.parentPhone || 'N/A'}</strong><br/>
              House / Warden: <strong>${student.house} House Warden</strong>
            </div>
          </div>

          <div class="summary-card">
            <div class="summary-title">OUTSTANDING REMAINING ARREARS BALANCE</div>
            <div class="summary-amount">${(balanceDue ?? 0).toFixed(2)} GHS</div>
            <div style="font-size: 11px; color: #475569; font-weight: 600;">
              Total Billed: <strong>${(totalPayable ?? 0).toFixed(2)} GHS</strong> &bull; Total Payments Received: <strong>${(totalPaid ?? 0).toFixed(2)} GHS</strong>
            </div>
          </div>

          <div class="section-title">1. Approved Fee Breakdown & Charges</div>
          <table>
            <thead>
              <tr>
                <th>Item Description</th>
                <th style="text-align: right;">Amount (GHS)</th>
              </tr>
            </thead>
            <tbody>
              ${(studentBill?.items || []).map(it => `
                <tr>
                  <td>${it.name || (it as any).description || 'Fee Item'}</td>
                  <td class="amount">${(it.amount ?? 0).toFixed(2)} GHS</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="section-title">2. Payments Logged & Verified Receipts</div>
          <table>
            <thead>
              <tr>
                <th>Receipt No</th>
                <th>Date Paid</th>
                <th>Description</th>
                <th>Payment Channel</th>
                <th style="text-align: right;">Amount Paid (GHS)</th>
              </tr>
            </thead>
            <tbody>
              ${studentPayments.map(p => `
                <tr>
                  <td style="font-family: monospace; font-weight: bold;">${p.receiptNo}</td>
                  <td>${p.date}</td>
                  <td>${p.paidAs || 'Tuition Fee Payment'}</td>
                  <td>${p.paymentMethod || 'Cash / Bank / MoMo'}</td>
                  <td class="amount">${((p.paid ?? (p as any).amount) ?? 0).toFixed(2)} GHS</td>
                </tr>
              `).join('')}
              ${studentPayments.length === 0 ? `
                <tr>
                  <td colspan="5" style="text-align: center; color: #94a3b8; padding: 15px;">No recorded fee payment receipts found.</td>
                </tr>
              ` : ''}
            </tbody>
          </table>

          <div class="footer-grid">
            <div>
              <p><strong>Verification Notice:</strong> This statement is generated by JIPAS Financial System.</p>
              <p>For inquiries, contact Bursar Desk at joyjipas2002@gmail.com or (00228) 22 60 21 38 / 99 47 38 23 / 90 83 60 48.</p>
            </div>
            <div class="stamp-area">
              OFFICIAL BURSAR<br/>STAMP & SIGNATURE
            </div>
          </div>

          <script>window.onload = function() { window.print(); window.close(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end mb-2">
        <LanguageSwitcher variant="pill" />
      </div>
      {/* Student Top Banner */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 border border-emerald-900/40">
        {/* School Wallpaper Backdrop with Gradient Overlay */}
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-luminosity scale-105 pointer-events-none"
          style={{ backgroundImage: `url('/wallpapers/classroom.jpg')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/95 via-teal-950/90 to-slate-950/90 pointer-events-none" />

        <div className="absolute right-0 bottom-0 opacity-10 translate-x-8 translate-y-8 pointer-events-none">
          <BookOpen className="w-64 h-64 text-white" />
        </div>
        
        <div className="flex items-center gap-5 z-10 w-full md:w-auto">
          <div className="relative">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center overflow-hidden shadow-lg">
              {student.photo ? (
                <img src={student.photo} alt={student.fullName} className="w-full h-full object-cover" />
              ) : (
                <User className="w-12 h-12 text-white/80" />
              )}
            </div>
            <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-400 border-2 border-emerald-900 rounded-full"></span>
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="bg-purple-500/30 border border-purple-400/40 text-purple-200 text-xs font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                Ward & Student Portal
              </span>
              <span className="bg-emerald-500/30 border border-emerald-400/40 text-emerald-100 text-xs font-bold px-2.5 py-0.5 rounded-full font-mono">
                {student.admissionNo}
              </span>
              <span className="bg-amber-500/30 border border-amber-400/40 text-amber-200 text-xs font-bold px-2.5 py-0.5 rounded-full">
                {student.className}
              </span>
              <span className="bg-white/20 text-white text-[11px] font-semibold px-2 py-0.5 rounded-full">
                {student.status || 'Active'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              {student.fullName}
            </h1>
            <p className="text-emerald-100 text-xs sm:text-sm mt-1">
              Department: <span className="font-semibold text-white">{student.department}</span> • House: <span className="font-bold underline text-amber-200">{student.house} House</span>
              {student.parentName && (
                <span className="block sm:inline sm:ml-2 text-emerald-200/90 font-medium">
                  • Parent/Guardian: <strong className="text-white">{student.parentName}</strong>
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Quick Top Stats */}
        <div className="flex flex-wrap gap-2.5 z-10 w-full md:w-auto justify-start md:justify-end">
          {balanceDue > 0 && (
            <button
              id="student-arrears-red-icon"
              onClick={() => {
                setActiveTab('fees');
                setShowSubmitModal(true);
              }}
              className="bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-black px-3.5 py-2 rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-rose-600/30 border border-rose-400 animate-pulse cursor-pointer transition-all"
              title="Click to pay fee arrears"
            >
              <AlertTriangle className="w-4 h-4 text-amber-300 animate-bounce shrink-0" />
              <div className="text-left leading-tight">
                <span className="block text-[9px] uppercase tracking-wider text-rose-200 font-black">Fee Arrears</span>
                <span className="text-xs sm:text-sm font-black font-mono">{(balanceDue ?? 0).toFixed(2)} GHS</span>
              </div>
              <span className="bg-white text-rose-800 text-[10px] font-black px-2 py-0.5 rounded-lg shadow-xs ml-1 hover:bg-rose-50">
                Pay Now →
              </span>
            </button>
          )}

          <div className="bg-white/10 backdrop-blur-md border border-white/20 px-4 py-2 rounded-xl text-center min-w-[90px]">
            <span className="block text-[10px] text-emerald-200 uppercase font-bold tracking-wider">Attendance</span>
            <span className="text-base sm:text-lg font-black">{attendanceRate}%</span>
          </div>
          <div className="bg-white/10 backdrop-blur-md border border-white/20 px-4 py-2 rounded-xl text-center min-w-[90px]">
            <span className="block text-[10px] text-emerald-200 uppercase font-bold tracking-wider">Fees Clear</span>
            <span className={`text-base sm:text-lg font-black ${clearancePercent === 100 ? 'text-emerald-300' : 'text-rose-300'}`}>
              {clearancePercent}%
            </span>
          </div>
          <button
            onClick={() => setShowDigitalIdModal(true)}
            className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
          >
            <QrCode className="w-4 h-4" /> Digital ID
          </button>
        </div>
      </div>

      {/* Red Arrears Banner Alert if Arrears Exist */}
      {balanceDue > 0 && (
        <div 
          onClick={() => {
            setActiveTab('fees');
            setShowSubmitModal(true);
          }}
          className="p-4 bg-gradient-to-r from-rose-50 via-rose-100/60 to-red-50 border-2 border-rose-500 hover:border-rose-600 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md cursor-pointer group transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="p-3 bg-rose-600 text-white rounded-2xl shadow-sm shrink-0 group-hover:scale-105 transition-transform">
              <AlertTriangle className="w-6 h-6 text-white animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-rose-600 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-md">
                  Unpaid Fee Arrears Alert
                </span>
                <span className="text-xs font-mono font-black text-rose-700">
                  {(balanceDue ?? 0).toFixed(2)} GHS
                </span>
              </div>
              <p className="text-xs text-rose-950 font-bold mt-1">
                Notice: Your ward has an outstanding fee balance of <span className="underline font-mono font-black text-rose-700">{(balanceDue ?? 0).toFixed(2)} GHS</span>. Click here to open fee payment and submit your transaction proof.
              </p>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setActiveTab('fees');
              setShowSubmitModal(true);
            }}
            className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl shadow-md flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <CreditCard className="w-4 h-4" />
            <span>Pay Fee Arrears Now</span>
          </button>
        </div>
      )}

      {/* Portal Navigation Big Thumbnails */}
      <div className="bg-white/80 backdrop-blur-sm p-4 sm:p-5 rounded-3xl shadow-sm border border-slate-200/90 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="text-xs sm:text-sm font-black text-slate-800 uppercase tracking-wider">
              Student Portal Quick Navigation
            </h2>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            Tap a big thumbnail to switch views instantly
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-3.5">
          {/* 1. Dashboard Overview */}
          <button
            id="student-btn-dashboard"
            onClick={() => setActiveTab('dashboard')}
            className={`group relative p-4 rounded-2xl text-left transition-all duration-200 cursor-pointer flex flex-col justify-between overflow-hidden min-h-[135px] sm:min-h-[145px] ${
              activeTab === 'dashboard'
                ? 'bg-gradient-to-b from-emerald-50 via-emerald-50/50 to-white border-2 border-emerald-600 shadow-md ring-4 ring-emerald-500/15 -translate-y-0.5'
                : 'bg-white hover:bg-slate-50 border border-slate-200/90 shadow-2xs hover:shadow-md hover:-translate-y-1 hover:border-emerald-300'
            }`}
          >
            {activeTab === 'dashboard' && (
              <span className="absolute top-0 right-0 w-3 h-3 bg-emerald-600 rounded-bl-lg" />
            )}
            <div className="flex items-center justify-between w-full mb-3">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-2xs ${
                  activeTab === 'dashboard'
                    ? 'bg-emerald-600 text-white shadow-emerald-600/30'
                    : 'bg-emerald-100/80 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white'
                }`}
              >
                <LayoutDashboard className="w-6 h-6" />
              </div>
              <span
                className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider transition-colors ${
                  activeTab === 'dashboard'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-100 text-emerald-800 group-hover:bg-emerald-200'
                }`}
              >
                {activeTab === 'dashboard' ? 'Active' : 'Home'}
              </span>
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black text-slate-900 leading-tight group-hover:text-emerald-950">
                Dashboard Overview
              </h3>
              <p className="text-[11px] text-slate-500 group-hover:text-slate-600 mt-1 line-clamp-1 leading-normal">
                Academic metrics & growth
              </p>
            </div>
          </button>

          {/* 2. Terminal Reports */}
          <button
            id="student-btn-reports"
            onClick={() => setActiveTab('reports')}
            className={`group relative p-4 rounded-2xl text-left transition-all duration-200 cursor-pointer flex flex-col justify-between overflow-hidden min-h-[135px] sm:min-h-[145px] ${
              activeTab === 'reports'
                ? 'bg-gradient-to-b from-indigo-50 via-indigo-50/50 to-white border-2 border-indigo-600 shadow-md ring-4 ring-indigo-500/15 -translate-y-0.5'
                : 'bg-white hover:bg-slate-50 border border-slate-200/90 shadow-2xs hover:shadow-md hover:-translate-y-1 hover:border-indigo-300'
            }`}
          >
            {activeTab === 'reports' && (
              <span className="absolute top-0 right-0 w-3 h-3 bg-indigo-600 rounded-bl-lg" />
            )}
            <div className="flex items-center justify-between w-full mb-3">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-2xs ${
                  activeTab === 'reports'
                    ? 'bg-indigo-600 text-white shadow-indigo-600/30'
                    : 'bg-indigo-100/80 text-indigo-700 group-hover:bg-indigo-600 group-hover:text-white'
                }`}
              >
                <Award className="w-6 h-6" />
              </div>
              <span
                className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider transition-colors ${
                  activeTab === 'reports'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-indigo-100 text-indigo-800 group-hover:bg-indigo-200'
                }`}
              >
                {activeTab === 'reports' ? 'Active' : studentReport?.position ? `Rank ${studentReport.position}` : 'Grades'}
              </span>
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black text-slate-900 leading-tight group-hover:text-indigo-950">
                Terminal Reports
              </h3>
              <p className="text-[11px] text-slate-500 group-hover:text-slate-600 mt-1 line-clamp-1 leading-normal">
                Term scores & report cards
              </p>
            </div>
          </button>

          {/* 3. Fees & Billing */}
          <button
            id="student-btn-fees"
            onClick={() => setActiveTab('fees')}
            className={`group relative p-4 rounded-2xl text-left transition-all duration-200 cursor-pointer flex flex-col justify-between overflow-hidden min-h-[135px] sm:min-h-[145px] ${
              activeTab === 'fees'
                ? 'bg-gradient-to-b from-cyan-50 via-cyan-50/50 to-white border-2 border-cyan-600 shadow-md ring-4 ring-cyan-500/15 -translate-y-0.5'
                : 'bg-white hover:bg-slate-50 border border-slate-200/90 shadow-2xs hover:shadow-md hover:-translate-y-1 hover:border-cyan-300'
            }`}
          >
            {activeTab === 'fees' && (
              <span className="absolute top-0 right-0 w-3 h-3 bg-cyan-600 rounded-bl-lg" />
            )}
            <div className="flex items-center justify-between w-full mb-3">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-2xs ${
                  activeTab === 'fees'
                    ? 'bg-cyan-600 text-white shadow-cyan-600/30'
                    : 'bg-cyan-100/80 text-cyan-700 group-hover:bg-cyan-600 group-hover:text-white'
                }`}
              >
                <CreditCard className="w-6 h-6" />
              </div>
              <span
                className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider transition-colors ${
                  activeTab === 'fees'
                    ? 'bg-cyan-600 text-white'
                    : balanceDue === 0
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {activeTab === 'fees' ? 'Active' : balanceDue === 0 ? 'Clear' : 'Pending'}
              </span>
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black text-slate-900 leading-tight group-hover:text-cyan-950">
                Fees & Billing
              </h3>
              <p className="text-[11px] text-slate-500 group-hover:text-slate-600 mt-1 line-clamp-1 leading-normal">
                Balances, receipts & MoMo
              </p>
            </div>
          </button>

          {/* 4. School Calendar */}
          <button
            id="student-btn-calendar"
            onClick={() => setActiveTab('calendar')}
            className={`group relative p-4 rounded-2xl text-left transition-all duration-200 cursor-pointer flex flex-col justify-between overflow-hidden min-h-[135px] sm:min-h-[145px] ${
              activeTab === 'calendar'
                ? 'bg-gradient-to-b from-sky-50 via-sky-50/50 to-white border-2 border-sky-600 shadow-md ring-4 ring-sky-500/15 -translate-y-0.5'
                : 'bg-white hover:bg-slate-50 border border-slate-200/90 shadow-2xs hover:shadow-md hover:-translate-y-1 hover:border-sky-300'
            }`}
          >
            {activeTab === 'calendar' && (
              <span className="absolute top-0 right-0 w-3 h-3 bg-sky-600 rounded-bl-lg" />
            )}
            <div className="flex items-center justify-between w-full mb-3">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-2xs ${
                  activeTab === 'calendar'
                    ? 'bg-sky-600 text-white shadow-sky-600/30'
                    : 'bg-sky-100/80 text-sky-700 group-hover:bg-sky-600 group-hover:text-white'
                }`}
              >
                <Calendar className="w-6 h-6" />
              </div>
              <span
                className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider transition-colors ${
                  activeTab === 'calendar'
                    ? 'bg-sky-600 text-white'
                    : 'bg-sky-100 text-sky-800 group-hover:bg-sky-200'
                }`}
              >
                {activeTab === 'calendar' ? 'Active' : 'Schedule'}
              </span>
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black text-slate-900 leading-tight group-hover:text-sky-950">
                School Calendar
              </h3>
              <p className="text-[11px] text-slate-500 group-hover:text-slate-600 mt-1 line-clamp-1 leading-normal">
                Term dates & holidays
              </p>
            </div>
          </button>

          {/* 5. Student Profile */}
          <button
            id="student-btn-profile"
            onClick={() => setActiveTab('profile')}
            className={`group relative p-4 rounded-2xl text-left transition-all duration-200 cursor-pointer flex flex-col justify-between overflow-hidden min-h-[135px] sm:min-h-[145px] ${
              activeTab === 'profile'
                ? 'bg-gradient-to-b from-amber-50 via-amber-50/50 to-white border-2 border-amber-600 shadow-md ring-4 ring-amber-500/15 -translate-y-0.5'
                : 'bg-white hover:bg-slate-50 border border-slate-200/90 shadow-2xs hover:shadow-md hover:-translate-y-1 hover:border-amber-300'
            }`}
          >
            {activeTab === 'profile' && (
              <span className="absolute top-0 right-0 w-3 h-3 bg-amber-600 rounded-bl-lg" />
            )}
            <div className="flex items-center justify-between w-full mb-3">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-2xs ${
                  activeTab === 'profile'
                    ? 'bg-amber-600 text-white shadow-amber-600/30'
                    : 'bg-amber-100/80 text-amber-700 group-hover:bg-amber-600 group-hover:text-white'
                }`}
              >
                <User className="w-6 h-6" />
              </div>
              <span
                className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider transition-colors ${
                  activeTab === 'profile'
                    ? 'bg-amber-600 text-white'
                    : 'bg-amber-100 text-amber-800 group-hover:bg-amber-200'
                }`}
              >
                {activeTab === 'profile' ? 'Active' : 'Bio'}
              </span>
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black text-slate-900 leading-tight group-hover:text-amber-950">
                Student Profile
              </h3>
              <p className="text-[11px] text-slate-500 group-hover:text-slate-600 mt-1 line-clamp-1 leading-normal">
                Bio, guardian info & ID
              </p>
            </div>
          </button>

          {/* 6. Notification */}
          <button
            id="student-btn-notifications"
            onClick={() => setActiveTab('notifications')}
            className={`group relative p-4 rounded-2xl text-left transition-all duration-200 cursor-pointer flex flex-col justify-between overflow-hidden min-h-[135px] sm:min-h-[145px] ${
              activeTab === 'notifications'
                ? 'bg-gradient-to-b from-rose-50 via-rose-50/50 to-white border-2 border-rose-600 shadow-md ring-4 ring-rose-500/15 -translate-y-0.5'
                : 'bg-white hover:bg-slate-50 border border-slate-200/90 shadow-2xs hover:shadow-md hover:-translate-y-1 hover:border-rose-300'
            }`}
          >
            {activeTab === 'notifications' && (
              <span className="absolute top-0 right-0 w-3 h-3 bg-rose-600 rounded-bl-lg" />
            )}
            <div className="flex items-center justify-between w-full mb-3">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-2xs relative ${
                  activeTab === 'notifications'
                    ? 'bg-rose-600 text-white shadow-rose-600/30'
                    : 'bg-rose-100/80 text-rose-700 group-hover:bg-rose-600 group-hover:text-white'
                }`}
              >
                <Bell className="w-6 h-6" />
                {studentNotifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 border-2 border-white text-white rounded-full text-[10px] font-black flex items-center justify-center animate-pulse">
                    {studentNotifications.length}
                  </span>
                )}
              </div>
              <span
                className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider transition-colors ${
                  activeTab === 'notifications'
                    ? 'bg-rose-600 text-white'
                    : studentNotifications.length > 0
                    ? 'bg-rose-100 text-rose-800 font-bold'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {activeTab === 'notifications' ? 'Active' : studentNotifications.length > 0 ? `${studentNotifications.length} New` : 'Notices'}
              </span>
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black text-slate-900 leading-tight group-hover:text-rose-950">
                Notification
              </h3>
              <p className="text-[11px] text-slate-500 group-hover:text-slate-600 mt-1 line-clamp-1 leading-normal">
                Announcements & alerts
              </p>
            </div>
          </button>

          {/* 7. Announcements Feed */}
          <button
            id="student-btn-announcements"
            onClick={() => setActiveTab('announcements')}
            className={`group relative p-4 rounded-2xl text-left transition-all duration-200 cursor-pointer flex flex-col justify-between overflow-hidden min-h-[135px] sm:min-h-[145px] ${
              activeTab === 'announcements'
                ? 'bg-gradient-to-b from-indigo-50 via-indigo-50/50 to-white border-2 border-indigo-600 shadow-md ring-4 ring-indigo-500/15 -translate-y-0.5'
                : 'bg-white hover:bg-slate-50 border border-slate-200/90 shadow-2xs hover:shadow-md hover:-translate-y-1 hover:border-indigo-300'
            }`}
          >
            {activeTab === 'announcements' && (
              <span className="absolute top-0 right-0 w-3 h-3 bg-indigo-600 rounded-bl-lg" />
            )}
            <div className="flex items-center justify-between w-full mb-3">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-2xs ${
                  activeTab === 'announcements'
                    ? 'bg-indigo-600 text-white shadow-indigo-600/30'
                    : 'bg-indigo-100/80 text-indigo-700 group-hover:bg-indigo-600 group-hover:text-white'
                }`}
              >
                <MessageSquare className="w-6 h-6" />
              </div>
              <span
                className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider transition-colors ${
                  activeTab === 'announcements'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-indigo-100 text-indigo-800 group-hover:bg-indigo-200'
                }`}
              >
                {activeTab === 'announcements' ? 'Active' : 'Broadcasts'}
              </span>
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black text-slate-900 leading-tight group-hover:text-indigo-950">
                School Broadcasts
              </h3>
              <p className="text-[11px] text-slate-500 group-hover:text-slate-600 mt-1 line-clamp-1 leading-normal">
                Announcements & feeds
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* ===================== TAB 1: DASHBOARD OVERVIEW ===================== */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Top 4 Performance Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Terminal Average</p>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mt-0.5">{averageScore}%</h3>
                <p className="text-xs text-emerald-600 font-semibold mt-1">Class Rank: {studentReport?.position || '1st'}</p>
              </div>
              <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                <Award className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Fee Balance</p>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mt-0.5">{(balanceDue ?? 0).toFixed(2)} GHS</h3>
                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold mt-1 ${
                  balanceDue === 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {balanceDue === 0 ? 'Fully Paid' : 'Balance Pending'}
                </span>
              </div>
              <div className="w-12 h-12 bg-cyan-50 rounded-2xl flex items-center justify-center text-cyan-600">
                <CreditCard className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Attendance Log</p>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mt-0.5">{studentReport?.attendancePresent || 68} Days</h3>
                <p className="text-xs text-slate-500 font-semibold mt-1">Total: {studentReport?.attendanceTotal || 70} Days ({attendanceRate}%)</p>
              </div>
              <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Subjects Enrolled</p>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mt-0.5">{studentReport?.scores?.length || 6}</h3>
                <p className="text-xs text-emerald-600 font-semibold mt-1">General Arts / Science</p>
              </div>
              <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600">
                <BookOpen className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Academic Growth Progress Tracker Line Graph */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" /> Academic Growth & Term-over-Term Trend
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Visual tracker showing terminal average progression over consecutive academic terms</p>
            </div>

            <div className="h-64 sm:h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={academicGrowthData}
                  margin={{ top: 10, right: 30, left: -10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="name" 
                    stroke="#64748b" 
                    fontSize={11} 
                    tickLine={false}
                    axisLine={false}
                    dy={10}
                  />
                  <YAxis 
                    stroke="#64748b" 
                    fontSize={11} 
                    domain={[0, 100]}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => `${val}%`}
                  />
                  <Tooltip
                    contentStyle={{ 
                      backgroundColor: '#1e293b', 
                      borderRadius: '12px', 
                      border: 'none',
                      color: '#ffffff',
                      fontSize: '12px'
                    }}
                    formatter={(value: any) => [`${value}%`, 'Average Score']}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  <Line
                    name="Student Terminal Average"
                    type="monotone"
                    dataKey="average"
                    stroke="#10b981"
                    strokeWidth={4}
                    dot={{ r: 6, stroke: '#ffffff', strokeWidth: 2, fill: '#10b981' }}
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Quick preview of terminal report */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-600" /> Latest Academic Performance ({selectedTerm})
                  </h3>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isReportBroadcasted 
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                      : 'bg-amber-100 text-amber-800 border border-amber-300'
                  }`}>
                    {isReportBroadcasted ? '🟢 Published Live' : '🟡 Pending Class Broadcast'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">Official grades registered with West African / GES curriculum standards</p>
              </div>
              <button
                onClick={() => setActiveTab('reports')}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
              >
                View Full Terminal Report <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {isReportBroadcasted ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse whitespace-nowrap text-xs">
                  <thead>
                    <tr className="bg-slate-900 text-white font-bold uppercase text-[10px]">
                      <th className="p-3">Subject</th>
                      <th className="p-3 text-center">Class Score (40%)</th>
                      <th className="p-3 text-center">Exam Score (60%)</th>
                      <th className="p-3 text-center">Total (100%)</th>
                      <th className="p-3 text-center">Grade</th>
                      <th className="p-3">Remark</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {studentReport?.scores.map((sc, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-3 text-slate-900 font-bold">{sc.subject}</td>
                        <td className="p-3 text-center text-slate-600 font-mono">{sc.classScore}</td>
                        <td className="p-3 text-center text-slate-600 font-mono">{sc.examScore}</td>
                        <td className="p-3 text-center font-bold text-emerald-700 font-mono">{sc.total}</td>
                        <td className="p-3 text-center">
                          <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-[10px]">
                            Grade {sc.grade}
                          </span>
                        </td>
                        <td className="p-3 text-slate-700 font-semibold">{sc.remark}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-center space-y-2">
                <div className="w-10 h-10 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto">
                  <Lock className="w-5 h-5" />
                </div>
                <div className="font-bold text-sm text-slate-800">
                  Terminal Assessment Pending Administration Broadcast
                </div>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  The terminal examination report for <strong className="text-slate-700">{student.className}</strong> ({selectedTerm}) has not yet been broadcasted by the administration. Check back once results are officially released.
                </p>
                <button
                  onClick={() => setActiveTab('reports')}
                  className="mt-2 text-xs font-bold bg-white text-slate-700 border border-slate-300 px-3 py-1.5 rounded-lg hover:bg-slate-100 cursor-pointer inline-flex items-center gap-1"
                >
                  <Eye className="w-3.5 h-3.5" /> Check Release Status
                </button>
              </div>
            )}
          </div>

          {/* Quick Upcoming Events Preview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase text-slate-600 tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-indigo-600" /> Upcoming Academic Calendar
                </h4>
                <button 
                  onClick={() => setActiveTab('calendar')} 
                  className="text-xs text-indigo-600 font-bold hover:underline cursor-pointer"
                >
                  Full Calendar →
                </button>
              </div>
              <div className="space-y-2">
                {calendarEvents.slice(0, 3).map((ev) => (
                  <div key={ev.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-800 text-xs">{ev.title}</div>
                      <div className="text-[11px] text-slate-500 font-medium">{ev.date}</div>
                    </div>
                    <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded">
                      {ev.category}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-3">
              <h4 className="text-xs font-bold uppercase text-slate-600 tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" /> Student Verification & Compliance
              </h4>
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Student Status:</span>
                  <span className="font-bold text-emerald-700">Fully Registered</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">the region Education Service (GES) No:</span>
                  <span className="font-mono font-bold text-slate-800">GES-2026-{student.admissionNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Conduct / Discipline:</span>
                  <span className="font-bold text-slate-800">{studentReport?.conduct || 'Exemplary'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">House Master:</span>
                  <span className="font-bold text-slate-800">{student.house} House Warden</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================== TAB 2: TERMINAL REPORTS ===================== */}
      {activeTab === 'reports' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Official Continuous Assessment</span>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                  isReportBroadcasted 
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}>
                  {isReportBroadcasted ? '🟢 Published Live' : '🟡 Pending Admin Broadcast'}
                </span>
              </div>
              <h2 className="text-2xl font-black text-slate-900 mt-1">Terminal Assessment & Performance Sheet</h2>
              <p className="text-xs text-slate-500 mt-0.5">Academic Year: {studentReport?.academicYear || '2025/2026'} • JIPAS</p>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Term Selector */}
              <select
                value={selectedTerm}
                onChange={(e) => setSelectedTerm(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold bg-white text-slate-700"
              >
                <option value="First Term">First Term</option>
                <option value="Second Term">Second Term</option>
                <option value="Third Term">Third Term</option>
              </select>

              {isReportBroadcasted ? (
                <button
                  onClick={handlePrintTerminalReportPDF}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" /> Generate & Print Official Report
                </button>
              ) : (
                <button
                  disabled
                  className="flex items-center gap-1.5 bg-slate-100 text-slate-400 px-4 py-2 rounded-xl text-xs font-bold cursor-not-allowed border border-slate-200"
                  title="Printing disabled until report is broadcasted by administration"
                >
                  <Lock className="w-3.5 h-3.5" /> Print Locked
                </button>
              )}
            </div>
          </div>

          {isReportBroadcasted ? (
            <div className="space-y-6">
              {/* Official Broadcast Authorization Badge */}
              <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 text-emerald-900 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Official Terminal Report Broadcasted by Administration</span>
                </div>
                <span className="text-[11px] text-emerald-800 bg-emerald-100/80 border border-emerald-300 px-2.5 py-0.5 rounded-full font-medium">
                  {student.className} • Authorized by {activeClassBroadcast?.broadcastedBy || 'Administration'}
                </span>
              </div>

              {/* Student metadata block */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">Student Full Name</span>
                  <span className="font-bold text-slate-900 text-sm">{student.fullName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">Admission Number</span>
                  <span className="font-mono font-bold text-indigo-700 text-sm">{student.admissionNo}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">Class & Form</span>
                  <span className="font-bold text-slate-900 text-sm">{student.className}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">Overall Position</span>
                  <span className="font-bold text-emerald-700 text-sm">{studentReport?.position || '1st out of 34'}</span>
                </div>
              </div>

              {/* Detailed Scores Table */}
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                  <thead>
                    <tr className="bg-slate-900 text-white uppercase text-[10px] font-bold">
                      <th className="p-3">Subject Name</th>
                      <th className="p-3 text-center">Class Score (40)</th>
                      <th className="p-3 text-center">Exam Score (60)</th>
                      <th className="p-3 text-center">Total Score (100)</th>
                      <th className="p-3 text-center">GES Grade</th>
                      <th className="p-3">Teacher's Remark</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {studentReport?.scores.map((sc, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-3 font-bold text-slate-900">{sc.subject}</td>
                        <td className="p-3 text-center text-slate-600 font-mono">{sc.classScore}</td>
                        <td className="p-3 text-center text-slate-600 font-mono">{sc.examScore}</td>
                        <td className="p-3 text-center font-bold text-emerald-700 font-mono">{sc.total}</td>
                        <td className="p-3 text-center">
                          <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-[10px]">
                            Grade {sc.grade}
                          </span>
                        </td>
                        <td className="p-3 text-slate-700">{sc.remark}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Performance summary & Attendance */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-3 text-xs">
                  <h4 className="text-xs font-bold uppercase text-slate-600 tracking-wider">Attendance & Conduct Profile</h4>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-600">Days Present / Total:</span>
                    <span className="font-bold text-slate-900">{studentReport?.attendancePresent || 68} / {studentReport?.attendanceTotal || 70} Days</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-600">Conduct / Deportment:</span>
                    <span className="font-bold text-slate-900">{studentReport?.conduct || 'Exemplary'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-600">Attitude to Learning:</span>
                    <span className="font-bold text-slate-900">{studentReport?.attitude || 'Very Diligent and Inquisitive'}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-600">Co-curricular Interest:</span>
                    <span className="font-bold text-slate-900">{studentReport?.interest || 'Debating, Robotics, Football'}</span>
                  </div>
                </div>

                <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-3 text-xs">
                  <h4 className="text-xs font-bold uppercase text-slate-600 tracking-wider">Institutional Remarks & Endorsement</h4>
                  <div className="space-y-3">
                    <div className="p-3 bg-white rounded-lg border border-slate-200">
                      <div className="font-bold text-slate-800 text-[11px] mb-0.5">Form Master's Remark:</div>
                      <p className="text-slate-600 italic">"{studentReport?.teacherComment || 'An outstanding performance across all registered subjects. Keep up the high standard.'}"</p>
                    </div>
                    <div className="p-3 bg-white rounded-lg border border-slate-200">
                      <div className="font-bold text-slate-800 text-[11px] mb-0.5">Headmaster's Endorsement:</div>
                      <p className="text-slate-600 italic">"{studentReport?.headmasterComment || 'Excellent terminal results. Promoted to the next academic stream with merit.'}"</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* PENDING CLASS BROADCAST NOTICE */
            <div className="bg-[#0B142A] border border-blue-900/60 text-white rounded-2xl p-8 sm:p-10 text-center space-y-6 max-w-2xl mx-auto shadow-2xl my-4">
              <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 rounded-3xl flex items-center justify-center text-amber-400 mx-auto shadow-lg shadow-amber-500/10">
                <Lock className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <span className="bg-amber-950/80 text-amber-300 border border-amber-800/80 text-[10px] font-black uppercase tracking-widest px-3.5 py-1 rounded-full inline-block">
                  Class Broadcast Pending
                </span>
                <h3 className="text-2xl font-black text-white tracking-tight">
                  Terminal Assessment Report Not Yet Released
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto leading-relaxed">
                  The official terminal report cards for <strong className="text-amber-300">{student.className}</strong> (<span className="text-white font-semibold">{selectedTerm}</span>) have not yet been broadcasted by the administration.
                </p>
              </div>

              <div className="bg-slate-950/80 border border-blue-950/80 rounded-xl p-4 text-xs text-left grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Target Class</span>
                  <span className="font-bold text-white text-sm">{student.className}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Academic Term</span>
                  <span className="font-bold text-white text-sm">{selectedTerm} (2025-2026)</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Release Status</span>
                  <span className="font-bold text-amber-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> Awaiting Admin Broadcast
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Next Term Begins</span>
                  <span className="font-bold text-emerald-400">{studentReport?.nextTermBegins || '8th September, 2026'}</span>
                </div>
              </div>

              <div className="p-4 bg-blue-950/50 border border-blue-900/60 rounded-xl text-xs text-blue-200/90 leading-relaxed text-left flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-white block mb-0.5">GES & JIPAS Assessment Governance:</span>
                  the regionian school regulations mandate that terminal assessments must receive final vetting, position ranking, and official class broadcast authorization by the Headmaster and Administration before public release on student portals.
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================== TAB 3: FEES & BILLING ===================== */}
      {activeTab === 'fees' && (
        <div className="space-y-6">
          {submitToast && (
            <div className="bg-emerald-600 text-white px-5 py-4 rounded-2xl shadow-md text-xs sm:text-sm font-bold flex items-center justify-between animate-fade-in">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                {submitToast}
              </span>
              <button onClick={() => setSubmitToast(null)} className="hover:bg-emerald-700 p-1 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Self-Service Fee Payment & Submission Header Banner */}
          <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white rounded-2xl shadow-md border border-indigo-800/60 p-6 sm:p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-1">
              <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-emerald-500/30">
                Official School Fee Portal
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2 pt-1">
                <CreditCard className="w-6 h-6 text-emerald-400" />
                Pay School Fees & Submit Payment Proof
              </h2>
              <p className="text-xs text-slate-300 max-w-xl">
                Select your preferred payment channel (MoMo, GCB Bank, Telecel Cash, or Cashier Desk) and submit your transaction ID for instant Bursar verification.
              </p>
            </div>

            <button
              onClick={() => {
                if (balanceDue > 0) setFormAmount(balanceDue);
                setShowSubmitModal(true);
              }}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white px-6 py-3.5 rounded-xl text-xs sm:text-sm font-black shadow-lg hover:shadow-emerald-500/20 transition-all cursor-pointer transform active:scale-95 whitespace-nowrap"
            >
              <Send className="w-4 h-4" /> Pay Fees / Submit Payment Proof
            </button>
          </div>

          {/* Student Submitted Proofs Status Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-600" />
                  Submitted Payment Proofs & Live Verification Status
                </h3>
                <p className="text-xs text-slate-500">Track self-reported fee payments sent to Admin and Accountant for verification</p>
              </div>
              <button
                onClick={() => setShowSubmitModal(true)}
                className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold border border-indigo-200 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Submit New Payment
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                <thead>
                  <tr className="bg-slate-900 text-white uppercase text-[10px] font-bold">
                    <th className="p-3">Submission Date</th>
                    <th className="p-3">Fee Category</th>
                    <th className="p-3">Payment Channel</th>
                    <th className="p-3 text-right">Amount Paid</th>
                    <th className="p-3 font-mono">Transaction ID / Ref</th>
                    <th className="p-3 text-center">Verification Status</th>
                    <th className="p-3">Verifier / Receipt Info</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {studentFeeSubmissions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-slate-50">
                      <td className="p-3 text-slate-600 font-mono text-[11px]">{sub.submissionDate}</td>
                      <td className="p-3 font-semibold text-slate-900">{sub.feeType}</td>
                      <td className="p-3 text-slate-700">{sub.paymentMethod}</td>
                      <td className="p-3 text-right font-bold text-emerald-700 font-mono">{(sub.amount ?? 0).toFixed(2)} GHS</td>
                      <td className="p-3 font-mono font-black text-indigo-700 bg-indigo-50/50 rounded px-2 py-1">{sub.transactionId}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase shadow-2xs ${
                          sub.status === 'Approved' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                          sub.status === 'Rejected' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                          'bg-amber-100 text-amber-800 border border-amber-200 animate-pulse'
                        }`}>
                          {sub.status}
                        </span>
                      </td>
                      <td className="p-3 text-slate-600 text-[11px]">
                        {sub.status === 'Approved' && (
                          <span className="text-emerald-700 font-bold">
                            Verified by {sub.verifiedBy || 'Accountant'} {sub.receiptNo ? `(Receipt: ${sub.receiptNo})` : ''}
                          </span>
                        )}
                        {sub.status === 'Rejected' && (
                          <span className="text-rose-600 font-bold" title={sub.rejectionReason}>
                            Rejected: {sub.rejectionReason || 'Details mismatch'}
                          </span>
                        )}
                        {sub.status === 'Pending Verification' && (
                          <span className="text-amber-700 italic">Under review by Bursar / Admin</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {studentFeeSubmissions.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-slate-400">
                        No payment proofs submitted yet. After making a payment, click "Submit Payment Proof to Admin" above.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Student Bill Breakdown Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-6 mb-6">
              <div>
                <span className="text-xs font-bold text-cyan-600 uppercase tracking-widest">Financial Ledger</span>
                <h2 className="text-2xl font-black text-slate-900 mt-1">Student Bill & Tuition Breakdown</h2>
                <p className="text-xs text-slate-500 mt-0.5">Academic Term: {studentBill?.academicYear || '2026/2027'} • {studentBill?.term || 'First Term'}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase ${
                  balanceDue === 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {balanceDue === 0 ? 'Fully Cleared' : 'Outstanding Balance'}
                </span>
                <button
                  onClick={() => setShowPrintStatementModal(true)}
                  className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" /> View Full Statement
                </button>
              </div>
            </div>

            {/* Fee Items Table */}
            <div className="overflow-x-auto mb-6 border border-slate-200 rounded-xl">
              <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                <thead>
                  <tr className="bg-slate-900 text-white uppercase text-[10px] font-bold">
                    <th className="p-3">Fee Item / Approved Bill Description</th>
                    <th className="p-3 text-right">Standard Amount (GHS)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {studentBill?.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-3 text-slate-900 font-semibold">{item.name}</td>
                      <td className="p-3 text-right text-slate-800 font-mono font-bold">{(item.amount ?? 0).toFixed(2)} GHS</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bill Summary Calculations */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 max-w-md ml-auto space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-600 font-medium">Gross Tuition Subtotal:</span>
                <span className="font-bold text-slate-900 font-mono">{(studentBill?.subTotal ?? 1200).toFixed(2)} GHS</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-600 font-medium">Previous Arrears:</span>
                <span className="font-bold text-slate-700 font-mono">{(studentBill?.arrears ?? 0).toFixed(2)} GHS</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-600 font-medium">Discount / Scholar Exemption:</span>
                <span className="font-bold text-emerald-700 font-mono">- {(studentBill?.discount ?? 0).toFixed(2)} GHS</span>
              </div>
              <div className="flex justify-between py-1 font-bold text-slate-900 text-sm">
                <span>Net Payable:</span>
                <span className="font-mono text-emerald-700">{(totalPayable ?? 0).toFixed(2)} GHS</span>
              </div>
              <div className="flex justify-between py-1 text-slate-700">
                <span>Total Amount Paid to Date:</span>
                <span className="font-bold text-emerald-600 font-mono">{(totalPaid ?? 0).toFixed(2)} GHS</span>
              </div>
              <div className="border-t-2 border-slate-300 pt-2 flex justify-between text-base font-black">
                <span className="text-slate-900">Current Balance Due:</span>
                <span className={`font-mono ${balanceDue === 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                  {(balanceDue ?? 0).toFixed(2)} GHS
                </span>
              </div>
            </div>
          </div>

          {/* Payment Receipts History */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Official Payment Receipts & Audit History</h3>
                <p className="text-xs text-slate-500">Click any receipt to generate or verify an official electronic receipt</p>
              </div>
              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
                {studentPayments.length} Registered Payments
              </span>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                <thead>
                  <tr className="bg-slate-900 text-white uppercase text-[10px] font-bold">
                    <th className="p-3">Receipt No.</th>
                    <th className="p-3">Transaction Date</th>
                    <th className="p-3">Paid As (Description)</th>
                    <th className="p-3">Payment Channel</th>
                    <th className="p-3 text-right">Amount Paid</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3">Cashier / Staff</th>
                    <th className="p-3 text-center">Receipt Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {studentPayments.map((pay) => (
                    <tr key={pay.id} className="hover:bg-slate-50">
                      <td className="p-3 font-mono font-bold text-indigo-700">{pay.receiptNo}</td>
                      <td className="p-3 text-slate-600 font-mono">{pay.date}</td>
                      <td className="p-3 text-slate-700 font-semibold max-w-[180px] truncate" title={pay.paidAs || pay.description}>
                        <span className="bg-indigo-50 text-indigo-800 px-2 py-0.5 rounded text-[10px] font-bold border border-indigo-100">
                          {pay.paidAs || pay.description || 'Tuition Fee'}
                        </span>
                      </td>
                      <td className="p-3 text-slate-700">{pay.method}</td>
                      <td className="p-3 text-right font-bold text-emerald-700 font-mono">{(pay.amount ?? pay.paid ?? 0).toFixed(2)} GHS</td>
                      <td className="p-3 text-center">
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded shadow-2xs">
                          {pay.status}
                        </span>
                      </td>
                      <td className="p-3 text-slate-600">{pay.collectedBy}</td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => setSelectedReceipt(pay)}
                          className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[11px] font-bold shadow-xs flex items-center gap-1 mx-auto cursor-pointer"
                        >
                          <Eye className="w-3 h-3" /> View Receipt
                        </button>
                      </td>
                    </tr>
                  ))}
                  {studentPayments.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-slate-400">No payment receipts registered for this student yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================== TAB 4: SCHOOL CALENDAR ===================== */}
      {activeTab === 'calendar' && (
        <SchoolCalendarView events={calendarEvents} />
      )}

      {/* ===================== TAB 5: STUDENT PROFILE ===================== */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 max-w-3xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-slate-100">
              <div className="w-24 h-24 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-3xl font-black overflow-hidden shadow-md border-2 border-emerald-200">
                {student.photo ? (
                  <img src={student.photo} alt={student.fullName} className="w-full h-full object-cover" />
                ) : (
                  student.fullName.charAt(0)
                )}
              </div>
              <div className="text-center sm:text-left space-y-1">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                    {student.status || 'Active'} Student
                  </span>
                  <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full font-mono">
                    ID: {student.admissionNo}
                  </span>
                </div>
                <h2 className="text-2xl font-black text-slate-900">{student.fullName}</h2>
                <p className="text-xs text-slate-500 font-medium">
                  {student.className} • {student.department} • Enrolled {student.enrollmentDate || 'Sept 2025'}
                </p>
              </div>

              <div className="sm:ml-auto">
                <button
                  onClick={() => setShowDigitalIdModal(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <QrCode className="w-4 h-4" /> Open Digital ID
                </button>
              </div>
            </div>

            {/* Profile Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold uppercase block mb-0.5">Assigned Class</span>
                <span className="font-bold text-slate-900 text-sm">{student.className}</span>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold uppercase block mb-0.5">Academic Department</span>
                <span className="font-bold text-slate-900 text-sm">{student.department}</span>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold uppercase block mb-0.5">Assigned House</span>
                <span className="font-bold text-slate-900 text-sm">{student.house} House</span>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold uppercase block mb-0.5">Gender</span>
                <span className="font-bold text-slate-900 text-sm">{student.gender}</span>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold uppercase block mb-0.5">Date of Birth</span>
                <span className="font-bold text-slate-900 text-sm">{student.dob || '14/05/2008'}</span>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold uppercase block mb-0.5">Roll Number</span>
                <span className="font-mono font-bold text-slate-900 text-sm">{student.rollNo || '04'}</span>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold uppercase block mb-0.5">Parent / Guardian Name</span>
                <span className="font-bold text-slate-900 text-sm">{student.parentName}</span>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold uppercase block mb-0.5">Parent Emergency Phone</span>
                <span className="font-mono font-bold text-emerald-700 text-sm flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5" /> {student.parentPhone}
                </span>
              </div>
            </div>

            {/* Parent & Student Password Security Setting Card */}
            <div className="mt-6 p-5 bg-gradient-to-br from-indigo-50/80 via-purple-50/30 to-slate-50 rounded-2xl border border-indigo-200/80 space-y-4">
              <div className="flex items-center gap-2 border-b border-indigo-100 pb-3">
                <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-xs">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm">Parent & Ward Security Password Manager</h4>
                  <p className="text-[11px] text-slate-500">Set or update a secure password for logging into this Student ID portal account</p>
                </div>
              </div>

              {passwordToast && (
                <div className="p-3 bg-emerald-100 text-emerald-900 text-xs font-bold rounded-xl flex items-center gap-2 animate-fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{passwordToast}</span>
                </div>
              )}

              <form onSubmit={handleSaveStudentPassword} className="space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">New Account Password *</label>
                    <input
                      type="password"
                      required
                      minLength={4}
                      value={secPasswordInput}
                      onChange={(e) => setSecPasswordInput(e.target.value)}
                      placeholder="Enter new account password..."
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Confirm New Password *</label>
                    <input
                      type="password"
                      required
                      minLength={4}
                      value={secConfirmPasswordInput}
                      onChange={(e) => setSecConfirmPasswordInput(e.target.value)}
                      placeholder="Re-enter password to confirm..."
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-slate-500 font-medium">
                    This password will protect logging in with Student ID <strong className="font-mono text-indigo-700">{student.admissionNo}</strong>.
                  </span>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-black rounded-xl text-xs shadow-md flex items-center gap-2 cursor-pointer transition-all shrink-0"
                  >
                    <ShieldCheck className="w-4 h-4 text-emerald-300" />
                    <span>Save Password</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ===================== MODAL: OFFICIAL PAYMENT RECEIPT ===================== */}
      {selectedReceipt && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div id="printable-receipt" className="print-a4-page print-no-break bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 space-y-4 print:p-0 print:border-none">
            {/* Header */}
            <div className="text-center pb-3 border-b-2 border-slate-800">
              <div className="text-[10px] font-black tracking-widest text-emerald-700 uppercase">JIPAS</div>
              <h2 className="text-base font-black text-slate-900">OFFICIAL STUDENT FEE RECEIPT</h2>
              <p className="text-[10px] text-slate-500">01 BP. 2364 • Kpéhénou N°1 Behind T-Oil Feeling Station, and Hedzranawoe 4th Corner after Radio Maria, Lomé — Togo • Tel: (00228) 22 60 21 38 / 99 47 38 23 / 90 83 60 48 • joyjipas2002@gmail.com</p>
            </div>

            {/* Receipt Details Grid */}
            <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl text-xs border border-slate-200">
              <div>
                <span className="text-slate-400 uppercase text-[9px] font-bold block">Receipt Number</span>
                <span className="font-mono font-bold text-indigo-700">{selectedReceipt.receiptNo}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 uppercase text-[9px] font-bold block">Date Issued</span>
                <span className="font-semibold text-slate-700">{selectedReceipt.date}</span>
              </div>
              <div>
                <span className="text-slate-400 uppercase text-[9px] font-bold block">Student Name</span>
                <span className="font-bold text-slate-900">{student.fullName}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 uppercase text-[9px] font-bold block">Admission No.</span>
                <span className="font-mono font-semibold text-slate-700">{student.admissionNo}</span>
              </div>
              <div>
                <span className="text-slate-400 uppercase text-[9px] font-bold block">Class / Form</span>
                <span className="font-semibold text-slate-700">{student.className}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 uppercase text-[9px] font-bold block">Payment Method</span>
                <span className="font-semibold text-slate-700">{selectedReceipt.method}</span>
              </div>
              <div className="col-span-2 pt-1 border-t border-slate-200">
                <span className="text-slate-400 uppercase text-[9px] font-bold block">Paid As (Description / Purpose)</span>
                <span className="font-bold text-slate-800 text-xs">{selectedReceipt.paidAs || selectedReceipt.description || 'Tuition Fees'}</span>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-200 text-xs flex justify-between items-center">
              <div>
                <span className="text-[10px] font-bold uppercase text-emerald-800 block">Amount Paid</span>
                <span className="text-lg font-black text-emerald-700 font-mono">{((selectedReceipt.paid ?? (selectedReceipt as any).amount) ?? 0).toFixed(2)} GHS</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold uppercase text-slate-500 block">Remaining Balance</span>
                <span className="text-sm font-bold text-slate-700 font-mono">{(selectedReceipt.balance ?? 0).toFixed(2)} GHS</span>
              </div>
            </div>

            <div className="flex justify-between items-end text-[10px] text-slate-400 pt-1">
              <span>Cashier Signature: <strong>{selectedReceipt.collectedBy}</strong></span>
              <span>Certified Electronic Receipt</span>
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 print:hidden">
              <button
                onClick={() => handlePrintReceiptPDF(selectedReceipt)}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" /> Generate & Print Receipt
              </button>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== MODAL: FULL FINANCIAL STATEMENT ===================== */}
      {showPrintStatementModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div id="printable-fee-history" className="print-a4-page print-no-break bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 border border-slate-200 space-y-4 print:p-0 print:border-none">
            <div className="text-center pb-3 border-b-2 border-slate-800">
              <h2 className="text-base font-black text-slate-900">JIPAS</h2>
              <p className="text-[10px] text-slate-500">Comprehensive Student Account Statement</p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-xl">
              <div>
                <span className="text-slate-400 font-bold uppercase text-[9px] block">Student Name:</span>
                <span className="font-bold text-slate-900">{student.fullName}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 font-bold uppercase text-[9px] block">Admission ID:</span>
                <span className="font-mono font-bold text-slate-900">{student.admissionNo}</span>
              </div>
            </div>

            {/* Transactions */}
            <div className="space-y-2 text-xs">
              <div className="font-bold text-slate-800 uppercase text-[10px]">Itemized Charges:</div>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                {studentBill?.items.map((it, i) => (
                  <div key={i} className="flex justify-between p-2.5 bg-white text-slate-700">
                    <span>{it.name}</span>
                    <span className="font-mono font-bold">{(it.amount ?? 0).toFixed(2)} GHS</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between text-xs font-bold bg-slate-100 p-3 rounded-xl">
              <span>Total Fees Payable: {(totalPayable ?? 0).toFixed(2)} GHS</span>
              <span className="text-emerald-700">Total Paid: {(totalPaid ?? 0).toFixed(2)} GHS</span>
              <span className={balanceDue === 0 ? 'text-emerald-700' : 'text-rose-600'}>
                Balance: {(balanceDue ?? 0).toFixed(2)} GHS
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 print:hidden">
              <button
                onClick={handlePrintStatementPDF}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" /> Generate & Print PDF Statement
              </button>
              <button
                onClick={() => setShowPrintStatementModal(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== MODAL: DIGITAL STUDENT ID CARD ===================== */}
      {showDigitalIdModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 border border-slate-200 space-y-4 print:p-0 print:border-none">
            {/* Student ID Card Front */}
            <div className="bg-gradient-to-br from-emerald-900 via-teal-800 to-slate-900 text-white rounded-2xl p-5 shadow-lg relative overflow-hidden space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-white/20">
                <div className="flex items-center gap-2">
                  <JIPASLogo size="xs" />
                  <div>
                    <div className="text-[10px] font-black tracking-widest text-amber-300 uppercase">Student Identity Card</div>
                    <div className="text-xs font-black">JIPAS</div>
                  </div>
                </div>
                <span className="bg-amber-400 text-slate-900 text-[9px] font-black px-2 py-0.5 rounded uppercase">
                  2026/2027
                </span>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-white/20 backdrop-blur-xs border border-white/30 overflow-hidden flex items-center justify-center">
                  {student.photo ? (
                    <img src={student.photo} alt={student.fullName} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-8 h-8 text-white" />
                  )}
                </div>
                <div>
                  <div className="text-sm font-black tracking-tight">{student.fullName}</div>
                  <div className="text-[11px] text-emerald-200 font-mono mt-0.5">{student.admissionNo}</div>
                  <div className="text-[10px] text-slate-300 mt-0.5">{student.className} • {student.house} House</div>
                </div>
              </div>

              {/* Barcode / Emergency Phone */}
              <div className="pt-2 border-t border-white/20 flex justify-between items-center text-[9px] text-slate-300">
                <span>Emergency: {student.parentPhone}</span>
                <span className="font-mono bg-white text-slate-900 font-bold px-1.5 py-0.5 rounded text-[8px] tracking-widest">
                  |||||||||||||||
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                onClick={handlePrintIdCardPDF}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" /> Generate & Print ID Card
              </button>
              <button
                onClick={() => setShowDigitalIdModal(false)}
                className="px-3.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== SUBMIT FEE PAYMENT PROOF MODAL ===================== */}
      {showSubmitModal && (() => {
        const enabledMethods = paymentSettings.methods.filter(m => m.enabled);
        const selectedChannel = enabledMethods.find(m => m.name === formMethod) || enabledMethods[0];

        return (
          <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl p-6 sm:p-8 space-y-6 my-8">
              <div className="flex justify-between items-start pb-4 border-b border-slate-100">
                <div>
                  <span className="bg-indigo-100 text-indigo-800 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full">
                    Self-Reporting Payment Portal
                  </span>
                  <h3 className="text-xl font-black text-slate-900 mt-1 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-indigo-600" /> Pay Fees & Submit Payment Proof
                  </h3>
                  <p className="text-xs text-slate-500">Select your payment channel, view account details, and upload transaction proof</p>
                </div>
                <button
                  onClick={() => setShowSubmitModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Step 1: Select Payment Channel */}
              <div className="space-y-3">
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
                  1. Select Payment Channel *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {enabledMethods.map((pm) => {
                    const isSelected = formMethod === pm.name;
                    return (
                      <button
                        key={pm.id}
                        type="button"
                        onClick={() => setFormMethod(pm.name)}
                        className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between relative ${
                          isSelected
                            ? 'bg-indigo-50/90 border-indigo-600 ring-2 ring-indigo-500/20 shadow-sm'
                            : 'bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-slate-100/80'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-1">
                          <span className={`text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 ${isSelected ? 'text-indigo-700' : 'text-slate-500'}`}>
                            {pm.type === 'bank' && <Building2 className="w-3.5 h-3.5" />}
                            {pm.type === 'momo' && <Smartphone className="w-3.5 h-3.5" />}
                            {pm.type === 'cash' && <CreditCard className="w-3.5 h-3.5" />}
                            {pm.bankOrProviderName || pm.type.toUpperCase()}
                          </span>
                          {isSelected && (
                            <span className="bg-indigo-600 text-white rounded-full p-0.5">
                              <Check className="w-3 h-3" />
                            </span>
                          )}
                        </div>
                        <div className="font-bold text-xs text-slate-900">{pm.name}</div>
                        <div className="text-[11px] font-mono text-slate-600 mt-1 font-semibold">
                          {pm.accountNumber}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Display Account Details Box for Selected Payment Channel */}
              {selectedChannel && (
                <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-4 sm:p-5 rounded-2xl space-y-3 border border-indigo-900/50 shadow-inner">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                      {selectedChannel.type === 'bank' && <Building2 className="w-4 h-4" />}
                      {selectedChannel.type === 'momo' && <Smartphone className="w-4 h-4" />}
                      {selectedChannel.type === 'cash' && <CreditCard className="w-4 h-4" />}
                      {selectedChannel.name}
                    </span>
                    <span className="text-[10px] bg-cyan-500/20 text-cyan-300 font-bold px-2.5 py-0.5 rounded-full border border-cyan-500/30">
                      {selectedChannel.accountName}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                    <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="text-[9px] text-slate-400 block uppercase font-bold">Account / MoMo Number</span>
                        <span className="text-base font-mono font-black text-amber-300 tracking-wider">
                          {selectedChannel.accountNumber}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyText(selectedChannel.accountNumber, selectedChannel.id)}
                        className="p-2 bg-indigo-600/40 hover:bg-indigo-600 text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 border border-indigo-400/30"
                      >
                        {copiedId === selectedChannel.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span className="text-[10px]">{copiedId === selectedChannel.id ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>

                    {selectedChannel.branchOrSortCode && (
                      <div className="text-xs text-slate-300 space-y-0.5">
                        <span className="text-[10px] text-slate-400 block uppercase font-bold">Branch / Sort Code</span>
                        <span className="font-semibold text-white">{selectedChannel.branchOrSortCode}</span>
                      </div>
                    )}
                  </div>

                  {selectedChannel.instructions && (
                    <p className="text-[11px] text-slate-300 leading-relaxed italic bg-slate-900/50 p-2.5 rounded-xl border border-slate-800/80">
                      "{selectedChannel.instructions}"
                    </p>
                  )}
                </div>
              )}

              {/* Step 2: Payment Proof Details Form */}
              <form onSubmit={handleSubmitFeeProof} className="space-y-4 text-xs pt-2 border-t border-slate-100">
                <div className="font-black uppercase tracking-wider text-slate-700 text-xs mb-1">
                  2. Enter Payment Transaction Details
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Student Full Name *</label>
                    <input
                      type="text"
                      required
                      value={formStudentName}
                      onChange={(e) => setFormStudentName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                      placeholder="Enter student name"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Class / Form *</label>
                    <input
                      type="text"
                      required
                      value={formClassName}
                      onChange={(e) => setFormClassName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                      placeholder="e.g. Basic 1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Admission Number *</label>
                    <input
                      type="text"
                      required
                      value={formAdmissionNo}
                      onChange={(e) => setFormAdmissionNo(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-indigo-700 focus:ring-2 focus:ring-indigo-500"
                      placeholder="e.g. ADM/26/0001"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Fee Category / Paid As *</label>
                    <select
                      value={formFeeType}
                      onChange={(e) => setFormFeeType(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="Tuition Fee (Full Term Payment)">Tuition Fee (Full Term Payment)</option>
                      <option value="Tuition Fee (Part Payment)">Tuition Fee (Part Payment)</option>
                      <option value="PTA Levy & Development Fee">PTA Levy & Development Fee</option>
                      <option value="ICT & Computer Lab Fee">ICT & Computer Lab Fee</option>
                      <option value="Examination & Continuous Assessment">Examination & Continuous Assessment</option>
                      <option value="Feeding & Boarding Fee">Feeding & Boarding Fee</option>
                      <option value="Arrears / Previous Term Clearance">Arrears / Previous Term Clearance</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Amount Paid (GHS) *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      step="0.01"
                      value={formAmount}
                      onChange={(e) => setFormAmount(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-mono font-extrabold text-emerald-700 text-sm focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Transaction ID / Ref No. *</label>
                    <input
                      type="text"
                      required
                      value={formTxnId}
                      onChange={(e) => setFormTxnId(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-mono font-black text-indigo-700 tracking-wider focus:ring-2 focus:ring-indigo-500 uppercase"
                      placeholder="e.g. MOM-9821034 or TXN-1002"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Date Paid *</label>
                  <input
                    type="date"
                    required
                    value={formDatePaid}
                    onChange={(e) => setFormDatePaid(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Additional Notes / Remarks (Optional)</label>
                  <textarea
                    rows={2}
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. Paid from phone 0244123456 by Parent Mr. Mensah"
                  />
                </div>

                <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-amber-900 text-[11px] leading-relaxed">
                  <strong>Note:</strong> Your payment submission will be automatically dispatched to the School Admin and Bursar for verification against the bank/MoMo bank statement.
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowSubmitModal(false)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-black shadow-md flex items-center gap-2 cursor-pointer transition-all"
                  >
                    <Send className="w-4 h-4" />
                    {isSubmitting ? 'Submitting...' : 'Submit to Admin & Accountant'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* ===================== NOTIFICATIONS TAB ===================== */}
      {activeTab === 'notifications' && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-6">
          <div className="flex justify-between items-center pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Bell className="w-5 h-5 text-indigo-600" />
                Student & Parent Notifications & Fee Alerts
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Real-time alerts, payment reminders, and broadcast announcements pushed by school administration.</p>
            </div>
            <span className="px-3 py-1 bg-indigo-50 text-indigo-700 font-bold text-xs rounded-full border border-indigo-100">
              {studentNotifications.length} Notices
            </span>
          </div>

          {studentNotifications.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <Bell className="w-12 h-12 mx-auto opacity-40" />
              <p className="text-sm font-semibold">No active notifications or payment notices at this time.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {studentNotifications.map((n) => (
                <div key={n.id} className="p-5 bg-gradient-to-r from-slate-50 to-indigo-50/40 rounded-2xl border border-indigo-100/60 shadow-xs space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse"></span>
                      <h4 className="font-bold text-slate-900 text-sm sm:text-base">{n.title}</h4>
                    </div>
                    <span className="text-[11px] font-mono font-semibold text-slate-500 bg-white px-2.5 py-0.5 rounded-full border border-slate-200">
                      {n.date || n.dateSent || 'Today'}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-700 pl-4 border-l-2 border-indigo-500">{n.message}</p>
                  <div className="flex items-center gap-3 text-[11px] text-slate-500 pt-2 pl-4">
                    <span>Target: <strong className="text-slate-700">{n.recipientGroup || n.targetClass || 'All Students'}</strong></span>
                    <span>•</span>
                    <span className="text-emerald-700 font-semibold">Status: Delivered & Verified</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===================== ANNOUNCEMENTS TAB ===================== */}
      {activeTab === 'announcements' && (
        <AnnouncementsFeed student={student} />
      )}
    </div>
  );
}

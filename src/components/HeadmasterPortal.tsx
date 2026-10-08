import React, { useState, useMemo, useEffect } from 'react';
import { 
  User, ThemePaletteConfig, Student, Teacher, TermReport, StudentBill, PaymentRecord, 
  CalendarEvent, NotificationItem, ClassReportBroadcast, ScoreApprovalRecord 
} from '../types';
import { 
  Users, BookOpen, FileText, ClipboardList, CheckCircle2, Award, 
  Send, AlertCircle, Search, Filter, Check, X, Clock, Printer, 
  ChevronRight, Calendar, Layers, ShieldCheck, Download, BarChart3,
  TrendingUp, RefreshCw, UserCheck, MessageSquare, Star, Sparkles, QrCode
} from 'lucide-react';
import JIPASLogo from './common/JIPASLogo';
import StaffAttendanceQRScanner from './staff/StaffAttendanceQRScanner';
import StaffDirectory from './staff/StaffDirectory';
import { printContent } from '../utils/printUtils';
import { 
  subscribeScoreApprovals, 
  saveScoreApproval, 
  saveReport, 
  saveClassBroadcast 
} from '../services/dbService';
import { getStoredScoreApprovals } from '../services/storageService';

interface HeadmasterPortalProps {
  currentUser: User;
  themePalette?: ThemePaletteConfig;
  students: Student[];
  teachers: Teacher[];
  reports: TermReport[];
  bills: StudentBill[];
  payments: PaymentRecord[];
  calendarEvents: CalendarEvent[];
  notifications: NotificationItem[];
  broadcasts: ClassReportBroadcast[];
}

export default function HeadmasterPortal({
  currentUser,
  themePalette,
  students,
  teachers,
  reports,
  bills,
  payments,
  calendarEvents,
  notifications,
  broadcasts
}: HeadmasterPortalProps) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'approvals' | 'reports' | 'performance' | 'attendance' | 'staff'>('dashboard');
  const [selectedClass, setSelectedClass] = useState<string>('All');
  const [selectedSubject, setSelectedSubject] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  // Score approvals real-time list
  const [scoreApprovals, setScoreApprovals] = useState<ScoreApprovalRecord[]>(() => getStoredScoreApprovals());
  const [approvalModalRecord, setApprovalModalRecord] = useState<ScoreApprovalRecord | null>(null);
  const [revisionNotes, setRevisionNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Selected student for report endorsement
  const [endorsingReport, setEndorsingReport] = useState<TermReport | null>(null);
  const [headmasterComment, setHeadmasterComment] = useState('');
  const [promotionStatus, setPromotionStatus] = useState<string>('Promoted');
  const [promotedToClass, setPromotedToClass] = useState<string>('');

  useEffect(() => {
    const unsub = subscribeScoreApprovals((items) => {
      setScoreApprovals(items);
    });
    const handleExitToDashboard = () => {
      setActiveTab('dashboard');
    };
    window.addEventListener('jipas_exit_to_dashboard', handleExitToDashboard);
    return () => {
      unsub();
      window.removeEventListener('jipas_exit_to_dashboard', handleExitToDashboard);
    };
  }, []);

  const triggerToast = (msg: string) => {
    setFeedbackToast(msg);
    setTimeout(() => setFeedbackToast(null), 3500);
  };

  const assignedDept = useMemo(() => {
    if (currentUser.department) return currentUser.department;
    
    // Infer from leadership title if department is missing
    const title = (currentUser.leadershipTitle || '').toLowerCase();
    if (title.includes('junior high') || title.includes('jhs')) return 'Junior High School';
    if (title.includes('senior high') || title.includes('shs')) return 'Senior High School';
    if (title.includes('pre-school') || title.includes('nursery')) return 'Pre-School';
    
    return 'Primary School'; // Final fallback
  }, [currentUser.department, currentUser.leadershipTitle]);
  const isSuperAdmin = currentUser.role === 'admin' || currentUser.role === 'super_admin';

  // Filter department students, teachers & reports
  const deptStudents = useMemo(() => {
    if (isSuperAdmin) return students;
    return students.filter(s => (s.department || '').toLowerCase() === assignedDept.toLowerCase());
  }, [students, assignedDept, isSuperAdmin]);

  const deptTeachers = useMemo(() => {
    if (isSuperAdmin) return teachers;
    return teachers.filter(t => (t.department || '').toLowerCase() === assignedDept.toLowerCase());
  }, [teachers, assignedDept, isSuperAdmin]);

  const deptReports = useMemo(() => {
    return reports.filter(r => deptStudents.some(s => s.id === r.studentId));
  }, [reports, deptStudents]);

  // Unique classes in this department
  const deptClasses = useMemo(() => {
    const set = new Set<string>();
    deptStudents.forEach(s => {
      if (s.className) set.add(s.className);
    });
    return Array.from(set).sort();
  }, [deptStudents]);

  // Analytics
  const analytics = useMemo(() => {
    const totalStudents = deptStudents.length;
    const totalTeachers = deptTeachers.length;
    const totalReports = deptReports.length;
    
    let sumScore = 0;
    let passingCount = 0;

    deptReports.forEach(r => {
      const avg = r.averageScore ?? 0;
      sumScore += avg;
      if (avg >= 50) passingCount++;
    });

    const deptAverage = totalReports > 0 ? (sumScore / totalReports).toFixed(1) : '0.0';
    const passRate = totalReports > 0 ? ((passingCount / totalReports) * 100).toFixed(0) : '0';
    const pendingApprovalsCount = scoreApprovals.filter(a => a.status === 'Submitted' || a.status === 'Under Review').length;

    return {
      totalStudents,
      totalTeachers,
      totalReports,
      deptAverage,
      passRate,
      pendingApprovalsCount
    };
  }, [deptStudents, deptTeachers, deptReports, scoreApprovals]);

  // Handle Score Approval Action
  const handleApproveScore = async (rec: ScoreApprovalRecord) => {
    setIsProcessing(true);
    try {
      const updated: ScoreApprovalRecord = {
        ...rec,
        status: 'Approved',
        reviewedBy: currentUser.name,
        reviewedAt: new Date().toISOString(),
        reviewComments: 'Endorsed and approved for terminal grading.'
      };
      await saveScoreApproval(updated);
      triggerToast(`✓ Scores for ${rec.className} (${rec.subjectName}) approved successfully!`);
      setApprovalModalRecord(null);
    } catch (err: any) {
      triggerToast(`Failed to approve scores: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRequestRevision = async (rec: ScoreApprovalRecord) => {
    if (!revisionNotes.trim()) {
      alert('Please enter revision comments or instructions for the teacher.');
      return;
    }
    setIsProcessing(true);
    try {
      const updated: ScoreApprovalRecord = {
        ...rec,
        status: 'Revision Requested',
        reviewedBy: currentUser.name,
        reviewedAt: new Date().toISOString(),
        reviewComments: revisionNotes.trim()
      };
      await saveScoreApproval(updated);
      triggerToast(`Revision request sent for ${rec.className} (${rec.subjectName}).`);
      setApprovalModalRecord(null);
      setRevisionNotes('');
    } catch (err: any) {
      triggerToast(`Failed to request revision: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Headmaster Endorsement of a Terminal Report
  const handleSaveReportEndorsement = async () => {
    if (!endorsingReport) return;
    setIsProcessing(true);
    try {
      const updated: TermReport = {
        ...endorsingReport,
        headmasterComment: headmasterComment.trim(),
        promotionStatus: promotionStatus as any,
        promotedTo: promotedToClass || endorsingReport.promotedTo,
        isPublished: true,
        publishedAt: new Date().toISOString(),
        publishedBy: currentUser.name
      };
      await saveReport(updated);
      triggerToast(`✓ Terminal report for ${endorsingReport.studentName} endorsed and published!`);
      setEndorsingReport(null);
    } catch (err: any) {
      triggerToast(`Failed to endorse report: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Print Transcript Summary
  const handlePrintTranscriptSummary = (report: TermReport) => {
    const html = `
      <div style="font-family: sans-serif; padding: 25px; color: #0f172a;">
        <div style="text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 20px;">
          <h1 style="margin: 0; font-size: 20px; color: #1e3a8a;">JOY INTERNATIONAL SCHOOL (JIPAS)</h1>
          <p style="margin: 4px 0; font-size: 12px; color: #475569;">OFFICIAL ACADEMIC TRANSCRIPT & PERFORMANCE RECORD</p>
          <p style="margin: 0; font-size: 11px; color: #64748b;">Department: ${assignedDept} | Academic Year: ${report.academicYear} | ${report.term}</p>
        </div>

        <div style="display: flex; justify-content: space-between; margin-bottom: 15px; font-size: 12px;">
          <div>
            <p><strong>Student Name:</strong> ${report.studentName}</p>
            <p><strong>Admission No:</strong> ${report.admissionNo}</p>
            <p><strong>Class:</strong> ${report.className}</p>
          </div>
          <div style="text-align: right;">
            <p><strong>Total Composite Score:</strong> ${report.totalScore ?? 0}</p>
            <p><strong>Average Score:</strong> ${(report.averageScore ?? 0).toFixed(1)}%</p>
            <p><strong>Class Position:</strong> ${report.position || '--'}</p>
            <p><strong>Promotion Status:</strong> ${report.promotionStatus || 'Pending'}</p>
          </div>
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 20px;">
          <thead>
            <tr style="background-color: #f1f5f9;">
              <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: left;">Subject</th>
              <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">Class Score (30%)</th>
              <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">Exam Score (70%)</th>
              <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">Total (100%)</th>
              <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">Grade</th>
              <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: left;">Remarks</th>
            </tr>
          </thead>
          <tbody>
            ${(report.scores || []).map(s => `
              <tr>
                <td style="border: 1px solid #cbd5e1; padding: 6px 8px;">${s.subject}</td>
                <td style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: center;">${s.classScore ?? '--'}</td>
                <td style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: center;">${s.examScore ?? '--'}</td>
                <td style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: center; font-weight: bold;">${s.total ?? '--'}</td>
                <td style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: center; font-weight: bold;">${s.grade ?? '--'}</td>
                <td style="border: 1px solid #cbd5e1; padding: 6px 8px;">${s.remark || '--'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 20px; font-size: 11px;">
          <p style="margin: 0 0 6px 0;"><strong>Class Teacher's Remarks:</strong> ${report.teacherComment || 'None recorded.'}</p>
          <p style="margin: 0;"><strong>Headmaster's Endorsement:</strong> ${report.headmasterComment || 'Satisfactory academic performance endorsed.'}</p>
        </div>

        <div style="display: flex; justify-content: space-between; margin-top: 40px; font-size: 11px;">
          <div style="text-align: center; width: 200px; border-top: 1px solid #0f172a; padding-top: 6px;">
            Class Teacher Signature
          </div>
          <div style="text-align: center; width: 200px; border-top: 1px solid #0f172a; padding-top: 6px;">
            Headmaster Signature & Stamp
          </div>
        </div>
      </div>
    `;
    printContent(html, `JIPAS_Transcript_${report.admissionNo}`);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {feedbackToast && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 text-xs font-bold animate-in fade-in slide-in-from-top-4">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>{feedbackToast}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
              <Award className="w-8 h-8 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-300/30">
                  Academic Leadership Portal
                </span>
                <span className="text-xs text-blue-200">•</span>
                <span className="text-xs font-bold text-blue-200">{assignedDept}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black mt-1 tracking-tight">
                {currentUser.name}
              </h1>
              <p className="text-xs text-slate-300 mt-0.5">
                Head of Department / Headmaster Oversight & Endorsements
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-xs border border-white/20 flex items-center gap-1.5 text-blue-100">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Standard SBA: 30% / Exam: 70%
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200 text-xs font-bold">
        {[
          { id: 'dashboard', label: 'Overview & Analytics', icon: BarChart3 },
          { id: 'approvals', label: `Score Approvals (${analytics.pendingApprovalsCount})`, icon: CheckCircle2 },
          { id: 'reports', label: 'Terminal Reports & Endorsements', icon: FileText },
          { id: 'performance', label: 'Subject & Class Rankings', icon: TrendingUp },
          { id: 'attendance', label: 'Attendance Oversight', icon: ClipboardList },
          { id: 'staff', label: 'Staff Directory', icon: BookOpen }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                isActive 
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30' 
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 1. DASHBOARD OVERVIEW */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Enrolled</p>
                <h3 className="text-3xl font-black text-slate-900 mt-1">{analytics.totalStudents}</h3>
                <p className="text-[11px] text-emerald-600 font-bold mt-1">Students in {assignedDept}</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Faculty Staff</p>
                <h3 className="text-3xl font-black text-slate-900 mt-1">{analytics.totalTeachers}</h3>
                <p className="text-[11px] text-indigo-600 font-bold mt-1">Assigned Teachers</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <UserCheck className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Dept Average Score</p>
                <h3 className="text-3xl font-black text-slate-900 mt-1">{analytics.deptAverage}%</h3>
                <p className="text-[11px] text-emerald-600 font-bold mt-1">Pass Rate: {analytics.passRate}%</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Pending Endorsements</p>
                <h3 className="text-3xl font-black text-amber-600 mt-1">{analytics.pendingApprovalsCount}</h3>
                <p className="text-[11px] text-amber-700 font-bold mt-1">Class Score Batches</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Quick Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                  <QrCode className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-slate-900 text-sm">Scan School Entrance QR</h4>
                <p className="text-xs text-slate-500">
                  Scan entrance QR code via live camera to record daily gate check-in or check-out.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('attendance')}
                className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all shadow-xs"
              >
                Scan Entrance QR <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-slate-900 text-sm">Review Submitted Class Scores</h4>
                <p className="text-xs text-slate-500">
                  Verify 30% Continuous Assessment and 70% Terminal Examination scores submitted by class teachers.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('approvals')}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all shadow-xs"
              >
                Go to Approvals <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-slate-900 text-sm">Endorse Terminal Reports</h4>
                <p className="text-xs text-slate-500">
                  Attach official headmaster recommendations, remarks, and promotion approvals before publishing to parents.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('reports')}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all shadow-xs"
              >
                Endorse Reports <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. SCORE APPROVALS */}
      {activeTab === 'approvals' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Verification & Quality Control</span>
              <h3 className="text-lg font-black text-slate-900">Score Approvals & Grade Endorsements</h3>
              <p className="text-xs text-slate-500">Review teacher mark sheets (30% Continuous Assessment + 70% Terminal Examination)</p>
            </div>
          </div>

          {scoreApprovals.length === 0 ? (
            <div className="p-12 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <CheckCircle2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-700">No score batches awaiting approval</p>
              <p className="text-xs text-slate-400 mt-1">Teacher score submissions will automatically appear here for endorsement.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-500">
                    <th className="p-3">Class</th>
                    <th className="p-3">Subject</th>
                    <th className="p-3">Teacher</th>
                    <th className="p-3 text-center">Students</th>
                    <th className="p-3 text-center">Class Avg</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Submitted At</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {scoreApprovals.map(approval => {
                    const isPending = approval.status === 'Submitted' || approval.status === 'Under Review';
                    return (
                      <tr key={approval.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-bold text-slate-900">{approval.className}</td>
                        <td className="p-3 font-semibold text-indigo-700">{approval.subjectName}</td>
                        <td className="p-3 text-slate-700">{approval.teacherName}</td>
                        <td className="p-3 text-center font-mono font-bold">{approval.scoresCount}</td>
                        <td className="p-3 text-center font-mono font-bold text-emerald-600">{approval.averageScore}%</td>
                        <td className="p-3">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            approval.status === 'Approved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : approval.status === 'Revision Requested'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {approval.status}
                          </span>
                        </td>
                        <td className="p-3 text-slate-400 text-[11px]">
                          {approval.submittedAt ? new Date(approval.submittedAt).toLocaleDateString() : '--'}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {isPending && (
                              <>
                                <button
                                  onClick={() => handleApproveScore(approval)}
                                  disabled={isProcessing}
                                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => {
                                    setApprovalModalRecord(approval);
                                    setRevisionNotes('');
                                  }}
                                  disabled={isProcessing}
                                  className="px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition-all cursor-pointer"
                                >
                                  Revision
                                </button>
                              </>
                            )}
                            {approval.status === 'Approved' && (
                              <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                                <Check className="w-3.5 h-3.5" /> Endorsed
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 3. TERMINAL REPORTS & ENDORSEMENTS */}
      {activeTab === 'reports' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Institutional Certification</span>
              <h3 className="text-lg font-black text-slate-900">Terminal Report Endorsements</h3>
              <p className="text-xs text-slate-500">Sign and certify end-of-term student report cards</p>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none"
              >
                <option value="All">All Classes ({deptClasses.length})</option>
                {deptClasses.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-500">
                  <th className="p-3">Student Name</th>
                  <th className="p-3">Adm No.</th>
                  <th className="p-3">Class</th>
                  <th className="p-3 text-center">Average Score</th>
                  <th className="p-3 text-center">Position</th>
                  <th className="p-3">Headmaster Remark</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {deptReports
                  .filter(r => selectedClass === 'All' || r.className === selectedClass)
                  .map(report => (
                    <tr key={report.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-bold text-slate-900">{report.studentName}</td>
                      <td className="p-3 font-mono text-slate-500">{report.admissionNo}</td>
                      <td className="p-3 text-slate-700">{report.className}</td>
                      <td className="p-3 text-center font-bold text-blue-600">{(report.averageScore ?? 0).toFixed(1)}%</td>
                      <td className="p-3 text-center font-bold text-slate-700">{report.position || '--'}</td>
                      <td className="p-3 text-slate-600 max-w-xs truncate">
                        {report.headmasterComment || <span className="italic text-slate-400">Pending endorsement</span>}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          report.isPublished ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {report.isPublished ? 'Published' : 'Draft'}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setEndorsingReport(report);
                              setHeadmasterComment(report.headmasterComment || 'A very commendable and disciplined academic performance. Promoted.');
                              setPromotionStatus(report.promotionStatus || 'Promoted');
                              setPromotedToClass(report.promotedTo || '');
                            }}
                            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
                          >
                            Endorse
                          </button>
                          <button
                            onClick={() => handlePrintTranscriptSummary(report)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-all cursor-pointer"
                            title="Print Report Summary"
                          >
                            <Printer className="w-3.5 h-3.5" />
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

      {/* 4. PERFORMANCE & RANKINGS */}
      {activeTab === 'performance' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex justify-between items-center border-b border-slate-100 pb-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-purple-600">Analytics</span>
              <h3 className="text-lg font-black text-slate-900">Academic Standings & Top Performers</h3>
              <p className="text-xs text-slate-500">Departmental scholastic rankings across classes</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Top Students */}
            <div className="border border-slate-200 rounded-2xl p-5 space-y-4">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
                Department Top Scholars (90%+ Average)
              </h4>
              <div className="divide-y divide-slate-100 text-xs">
                {deptReports
                  .filter(r => (r.averageScore ?? 0) >= 70)
                  .sort((a, b) => (b.averageScore ?? 0) - (a.averageScore ?? 0))
                  .slice(0, 8)
                  .map((rep, idx) => (
                    <div key={rep.id} className="py-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-900 font-bold flex items-center justify-center text-[10px]">
                          #{idx + 1}
                        </span>
                        <div>
                          <p className="font-bold text-slate-900">{rep.studentName}</p>
                          <p className="text-[10px] text-slate-400">{rep.className} • {rep.admissionNo}</p>
                        </div>
                      </div>
                      <span className="font-black text-emerald-600 font-mono text-sm">
                        {(rep.averageScore ?? 0).toFixed(1)}%
                      </span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Class Pass Rates */}
            <div className="border border-slate-200 rounded-2xl p-5 space-y-4">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                Class Average Standings
              </h4>
              <div className="space-y-3">
                {deptClasses.map(cls => {
                  const classReports = deptReports.filter(r => r.className === cls);
                  const avg = classReports.length > 0 
                    ? classReports.reduce((acc, r) => acc + (r.averageScore ?? 0), 0) / classReports.length 
                    : 0;
                  return (
                    <div key={cls} className="space-y-1">
                      <div className="flex justify-between text-xs font-bold text-slate-700">
                        <span>{cls}</span>
                        <span>{avg.toFixed(1)}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div 
                          className="h-full bg-indigo-600 rounded-full transition-all"
                          style={{ width: `${Math.min(100, Math.max(0, avg))}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. ATTENDANCE OVERSIGHT */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          <StaffAttendanceQRScanner 
            currentUser={currentUser} 
            employee={currentUser} 
            onSuccess={() => setActiveTab('dashboard')}
            onClose={() => setActiveTab('dashboard')}
          />

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-600">Discipline & Presence</span>
              <h3 className="text-lg font-black text-slate-900">Attendance Supervision</h3>
              <p className="text-xs text-slate-500">Monitor teacher clock-ins and student attendance across classes</p>
            </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 border border-slate-200 rounded-2xl space-y-3">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-indigo-600" />
                Department Faculty Attendance
              </h4>
              <div className="divide-y divide-slate-100 text-xs">
                {deptTeachers.map(teacher => (
                  <div key={teacher.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-900">{teacher.name}</p>
                      <p className="text-[10px] text-slate-400">{teacher.designation || 'Faculty Teacher'}</p>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      Active
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-5 border border-slate-200 rounded-2xl space-y-3">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-teal-600" />
                Enrolled Class Counts
              </h4>
              <div className="divide-y divide-slate-100 text-xs">
                {deptClasses.map(c => {
                  const count = deptStudents.filter(s => s.className === c).length;
                  return (
                    <div key={c} className="py-2.5 flex items-center justify-between">
                      <span className="font-bold text-slate-800">{c}</span>
                      <span className="font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                        {count} Enrolled
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
        </div>
      )}

      {/* 6. STAFF DIRECTORY */}
      {activeTab === 'staff' && (
        <div className="space-y-6">
          <StaffDirectory 
            teachers={deptTeachers} 
            title={`${assignedDept} Staff Directory`}
            subtitle={`Official registry of faculty and administrative staff within the ${assignedDept}.`}
            isReadOnly={true}
          />
        </div>
      )}

      {/* Endorse Modal */}
      {endorsingReport && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-slate-900 text-base">Endorse Terminal Report</h3>
                <p className="text-xs text-slate-400">{endorsingReport.studentName} • {endorsingReport.className}</p>
              </div>
              <button 
                onClick={() => setEndorsingReport(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Headmaster's Official Remark *</label>
                <textarea
                  rows={3}
                  value={headmasterComment}
                  onChange={(e) => setHeadmasterComment(e.target.value)}
                  className="w-full p-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter endorsement remark..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Promotion Status</label>
                  <select
                    value={promotionStatus}
                    onChange={(e) => setPromotionStatus(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl outline-none bg-white font-bold"
                  >
                    <option value="Promoted">Promoted</option>
                    <option value="Repeated">Repeated</option>
                    <option value="On Probation">On Probation</option>
                    <option value="Advanced">Advanced (Double Promotion)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Promoted To Class</label>
                  <input
                    type="text"
                    value={promotedToClass}
                    onChange={(e) => setPromotedToClass(e.target.value)}
                    placeholder="e.g. Basic 2"
                    className="w-full p-2.5 border border-slate-300 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 text-blue-800 text-[11px] space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-600" /> Endorsement Notice
                </p>
                <p>
                  Endorsing this report will digitally certify the terminal results and automatically publish them to the student & parent portal.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setEndorsingReport(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveReportEndorsement}
                disabled={isProcessing}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all shadow-xs cursor-pointer flex items-center gap-2"
              >
                <Check className="w-4 h-4" /> Save & Certify Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revision Request Modal */}
      {approvalModalRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-black text-slate-900 text-base">Request Score Revision</h3>
              <button 
                onClick={() => setApprovalModalRecord(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-600">
                You are requesting revision for <strong>{approvalModalRecord.className}</strong> (<strong>{approvalModalRecord.subjectName}</strong>) submitted by <strong>{approvalModalRecord.teacherName}</strong>.
              </p>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Feedback / Revision Reason *</label>
                <textarea
                  rows={4}
                  value={revisionNotes}
                  onChange={(e) => setRevisionNotes(e.target.value)}
                  className="w-full p-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-rose-500"
                  placeholder="Specify errors, missing homework/SBA components, or reason for rejection..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setApprovalModalRecord(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRequestRevision(approvalModalRecord)}
                disabled={isProcessing}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition-all shadow-xs cursor-pointer"
              >
                Send Revision Notice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

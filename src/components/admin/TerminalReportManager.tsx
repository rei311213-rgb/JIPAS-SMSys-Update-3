import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Award, FileText, Send, CheckCircle2, AlertCircle, Eye, Edit3, Plus, 
  Printer, Download, Search, Filter, RefreshCw, X, Check, ArrowUpRight, 
  Sparkles, Lock, Unlock, Calendar, User, BookOpen, AlertTriangle, ShieldCheck, Clock, Loader2,
  Trash2
} from 'lucide-react';
import { 
  Student, 
  TermReport, 
  ScoreItem, 
  ClassReportBroadcast, 
  ClassItem, 
  AcademicYearItem, 
  TermItem, 
  SubjectItem,
  NotificationItem
} from '../../types';
import JIPASLogo from '../common/JIPASLogo';
import { SCHOOL_CONTACT } from '../../constants/schoolInfo';
import AIReportAssistant from '../common/AIReportAssistant';
import { 
  saveReport, 
  saveAllReports, 
  saveClassBroadcast, 
  saveNotification, 
  emailStudentReportToParent,
  clearAllClassReportBroadcasts
} from '../../services/dbService';
import { PDFGeneratorService } from '../../services/pdfService';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface TerminalReportManagerProps {
  students: Student[];
  reports: TermReport[];
  broadcasts?: ClassReportBroadcast[];
  classes?: ClassItem[];
  academicYears?: AcademicYearItem[];
  terms?: TermItem[];
  subjects?: SubjectItem[];
  currentUser?: any;
  onUpdateReports?: (reports: TermReport[]) => void;
  onUpdateBroadcasts?: (broadcasts: ClassReportBroadcast[]) => void;
}

export default function TerminalReportManager({
  students,
  reports: initialReports,
  broadcasts: initialBroadcasts = [],
  classes = [],
  academicYears = [],
  terms = [],
  subjects = [],
  currentUser,
  onUpdateReports,
  onUpdateBroadcasts
}: TerminalReportManagerProps) {
  // Active Filter state
  const [selectedDepartment, setSelectedDepartment] = useState<string>('All');
  const [selectedClass, setSelectedClass] = useState<string>('Basic 1');
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>('2025-2026');
  const [selectedTerm, setSelectedTerm] = useState<string>('Third Term');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Local state for reports & broadcasts
  const [reportsList, setReportsList] = useState<TermReport[]>(initialReports);
  const [broadcastsList, setBroadcastsList] = useState<ClassReportBroadcast[]>(initialBroadcasts);

  // Modals state
  const [viewingReport, setViewingReport] = useState<TermReport | null>(null);
  const [editingReport, setEditingReport] = useState<TermReport | null>(null);
  const [showBroadcastModal, setShowBroadcastModal] = useState<boolean>(false);
  const [showBatchPrintModal, setShowBatchPrintModal] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [emailingReportId, setEmailingReportId] = useState<string | null>(null);
  const batchPrintContainerRef = useRef<HTMLDivElement>(null);

  // Broadcast Modal form state
  const [broadcastNotes, setBroadcastNotes] = useState<string>('Official terminal examination report cards released. All continuous assessment records and teacher endorsements finalized.');
  const [nextTermDate, setNextTermDate] = useState<string>('2026-10-12');
  const [vacationDate, setVacationDate] = useState<string>('2026-09-18');
  const [notifyParents, setNotifyParents] = useState<boolean>(true);

  // Sync props to state if updated externally
  useEffect(() => {
    if (initialReports && initialReports.length > 0) {
      setReportsList(initialReports);
    }
  }, [initialReports]);

  useEffect(() => {
    if (initialBroadcasts && initialBroadcasts.length > 0) {
      setBroadcastsList(initialBroadcasts);
    }
  }, [initialBroadcasts]);

  // Derived class names list (mapped to selected department)
  const classOptions = useMemo(() => {
    let baseList = [
      'Creche', 'Nursery 1', 'Nursery 2', 'KG 1', 'KG 2',
      'Basic 1', 'Basic 2', 'Basic 3', 'Basic 4', 'Basic 5', 'Basic 6',
      'JHS 1', 'JHS 2', 'JHS 3'
    ];
    if (classes && classes.length > 0) {
      baseList = Array.from(new Set([...baseList, ...classes.map(c => c.name)]));
    }
    if (selectedDepartment === 'All') return baseList;
    if (selectedDepartment === 'Pre-School') {
      return baseList.filter(c => c.includes('Creche') || c.includes('Nursery') || c.includes('KG'));
    }
    if (selectedDepartment === 'Primary School') {
      return baseList.filter(c => c.includes('Basic') || c.includes('Class'));
    }
    if (selectedDepartment === 'Junior High School') {
      return baseList.filter(c => c.includes('JHS'));
    }
    if (selectedDepartment === 'Senior High School') {
      return baseList.filter(c => c.includes('SHS') || c.includes('Science') || c.includes('Arts') || c.includes('Business') || c.includes('Economics') || c.includes('Visual'));
    }
    return baseList;
  }, [classes, selectedDepartment]);

  // Fallback subject list
  const defaultSubjectNames = useMemo(() => {
    if (subjects && subjects.length > 0) {
      return subjects.map(s => s.name);
    }
    return [
      'English Language',
      'Mathematics',
      'Integrated Science',
      'Social Studies',
      'Computing / ICT',
      'Creative Arts',
      'Religious & Moral Edu. (R.M.E)',
      'the regionian Language (Twi/Ga/Ewe)',
      'French'
    ];
  }, [subjects]);

  // Active Broadcast object for selected class and term
  const currentBroadcast = useMemo(() => {
    return broadcastsList.find(b => 
      b.className === selectedClass && 
      b.term.toLowerCase() === selectedTerm.toLowerCase() &&
      (b.academicYear === selectedAcademicYear || !b.academicYear)
    );
  }, [broadcastsList, selectedClass, selectedTerm, selectedAcademicYear]);

  const isClassBroadcasted = currentBroadcast?.isBroadcasted ?? false;

  // Filter students belonging to selected class
  const classStudents = useMemo(() => {
    return students.filter(s => s.className.toLowerCase() === selectedClass.toLowerCase());
  }, [students, selectedClass]);

  // Map or synthesize reports for students in selected class
  const classReports = useMemo(() => {
    const isJhs = selectedClass.includes('JHS');
    
    // Grade calculator
    const computeGrade = (total: number) => {
      if (isJhs) {
        if (total >= 80) return { grade: '1', remark: 'Highest' };
        if (total >= 70) return { grade: '2', remark: 'Higher' };
        if (total >= 65) return { grade: '3', remark: 'High' };
        if (total >= 60) return { grade: '4', remark: 'High Average' };
        if (total >= 55) return { grade: '5', remark: 'Average' };
        if (total >= 50) return { grade: '6', remark: 'Low Average' };
        if (total >= 45) return { grade: '7', remark: 'Lower' };
        if (total >= 40) return { grade: '8', remark: 'Lowest' };
        return { grade: '9', remark: 'Fail' };
      }
      if (total >= 80) return { grade: 'A', remark: 'Excellent' };
      if (total >= 70) return { grade: 'B', remark: 'Very Good' };
      if (total >= 60) return { grade: 'C', remark: 'Good' };
      if (total >= 50) return { grade: 'D', remark: 'Credit' };
      if (total >= 40) return { grade: 'E', remark: 'Pass' };
      return { grade: 'F', remark: 'Weak' };
    };

    return classStudents.map((st, idx) => {
      const existing = reportsList.find(r => 
        (r.studentId === st.id || r.admissionNo === st.admissionNo) &&
        r.term.toLowerCase() === selectedTerm.toLowerCase()
      );

      if (existing) {
        return {
          ...existing,
          isPublished: isClassBroadcasted || existing.isPublished
        };
      }

      // Return a skeleton "No Report" object instead of generating fake scores
      return {
        id: `empty-${st.id}-${selectedTerm.replace(/\s+/g, '-').toLowerCase()}`,
        studentId: st.id,
        studentName: st.fullName,
        admissionNo: st.admissionNo,
        className: st.className,
        academicYear: selectedAcademicYear,
        term: selectedTerm,
        attendancePresent: 0,
        attendanceTotal: 0,
        conduct: 'N/A',
        attitude: 'N/A',
        interest: 'N/A',
        teacherComment: 'No academic records found for this term.',
        headmasterComment: 'No academic records found for this term.',
        scores: [],
        totalScore: 0,
        averageScore: 0,
        position: 'N/A',
        isPublished: false,
        nextTermBegins: nextTermDate,
        vacationDate: vacationDate,
        status: 'Incomplete' as any
      };
    });
  }, [classStudents, reportsList, selectedTerm, selectedAcademicYear, selectedClass, isClassBroadcasted, defaultSubjectNames, nextTermDate, vacationDate]);

  // Filtered reports matching search query
  const filteredClassReports = useMemo(() => {
    if (!searchQuery.trim()) return classReports;
    const q = searchQuery.toLowerCase();
    return classReports.filter(r => 
      r.studentName.toLowerCase().includes(q) || 
      r.admissionNo.toLowerCase().includes(q) ||
      r.position.toLowerCase().includes(q)
    );
  }, [classReports, searchQuery]);

  // Calculate summary metrics for the selected class
  const classMetrics = useMemo(() => {
    const count = classReports.length;
    if (count === 0) {
      return { total: 0, average: 0, highest: 0, passRate: 100 };
    }
    const avg = Number((classReports.reduce((sum, r) => sum + (r.averageScore || 0), 0) / count).toFixed(1));
    const highest = Math.max(...classReports.map(r => r.totalScore || 0));
    const passingCount = classReports.filter(r => (r.averageScore || 0) >= 50).length;
    const passRate = Math.round((passingCount / count) * 100);

    return { total: count, average: avg, highest, passRate };
  }, [classReports]);

  // Export All Finalized Report Cards to PDF using html2canvas and jsPDF
  const handleExportAllToPDF = async () => {
    if (!batchPrintContainerRef.current) return;
    setIsExportingPdf(true);

    try {
      const element = batchPrintContainerRef.current;
      
      const canvas = await html2canvas(element, {
        scale: 1.5,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const fileName = `JIPAS_ReportCards_${selectedClass.replace(/\s+/g, '_')}_${selectedTerm.replace(/\s+/g, '_')}.pdf`;
      pdf.save(fileName);
      setToastMessage("PDF Export Successful! Generated reports downloaded to your device.");
      setTimeout(() => setToastMessage(null), 3500);
    } catch (err) {
      console.error("PDF Export error:", err);
      alert("Failed to export report cards to PDF format.");
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleOfficialPDFExport = async (report: TermReport) => {
    setIsProcessing(true);
    try {
      await PDFGeneratorService.generateTerminalReport(report);
      setToastMessage("Official Report Card Generated Successfully.");
      setTimeout(() => setToastMessage(null), 3500);
    } catch (err) {
      console.error("PDF Export error:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEmailReportToParent = async (report: TermReport) => {
    const student = students.find(s => s.id === report.studentId);
    const parentEmail = student?.parentEmail || student?.email;

    if (!parentEmail) {
      alert(`No contact email is configured for ${report.studentName}. Please edit their profile to add a parent email before dispatching.`);
      return;
    }

    setEmailingReportId(report.id);
    try {
      const res = await emailStudentReportToParent(
        report.id,
        report.studentId,
        parentEmail,
        report.studentName,
        report.term
      );

      if (res.success) {
        setToastMessage(res.message);
        setTimeout(() => setToastMessage(null), 4000);
      } else {
        alert(`Failed to send report card: ${res.message}`);
      }
    } catch (err: any) {
      console.error("Email report error:", err);
      alert("An unexpected error occurred while sending the email.");
    } finally {
      setEmailingReportId(null);
    }
  };

  // Handle Class Broadcast Toggle
  const handleExecuteBroadcast = async (statusToSet: 'Published' | 'Draft') => {
    setIsProcessing(true);
    const isNowBroadcasted = statusToSet === 'Published';

    const broadcastRecord: ClassReportBroadcast = {
      id: currentBroadcast?.id || `broadcast-${selectedClass.replace(/\s+/g, '-').toLowerCase()}-${selectedTerm.replace(/\s+/g, '-').toLowerCase()}`,
      className: selectedClass,
      academicYear: selectedAcademicYear,
      term: selectedTerm,
      isBroadcasted: isNowBroadcasted,
      broadcastedAt: isNowBroadcasted ? new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : undefined,
      broadcastedBy: currentUser?.name || 'School Administrator',
      status: statusToSet,
      releaseNotes: broadcastNotes,
      nextTermBegins: nextTermDate,
      vacationDate: vacationDate,
      totalStudentsCount: classStudents.length,
      classAverage: classMetrics.average,
      allowDownload: true
    };

    try {
      // 1. Save broadcast record
      const updatedBroadcasts = await saveClassBroadcast(broadcastRecord);
      setBroadcastsList(updatedBroadcasts);
      onUpdateBroadcasts?.(updatedBroadcasts);

      // 2. Mark all reports for this class as published/draft
      const updatedReports = reportsList.map(r => {
        if (r.className.toLowerCase() === selectedClass.toLowerCase() && r.term.toLowerCase() === selectedTerm.toLowerCase()) {
          return {
            ...r,
            isPublished: isNowBroadcasted,
            publishedAt: broadcastRecord.broadcastedAt,
            publishedBy: broadcastRecord.broadcastedBy,
            nextTermBegins: nextTermDate,
            vacationDate: vacationDate
          };
        }
        return r;
      });

      // Also ensure classReports are persisted
      for (const cr of classReports) {
        const found = updatedReports.find(r => r.studentId === cr.studentId && r.term.toLowerCase() === selectedTerm.toLowerCase());
        if (!found) {
          updatedReports.push({
            ...cr,
            isPublished: isNowBroadcasted,
            publishedAt: broadcastRecord.broadcastedAt,
            publishedBy: broadcastRecord.broadcastedBy
          });
        }
      }

      await saveAllReports(updatedReports);
      setReportsList(updatedReports);
      onUpdateReports?.(updatedReports);

      // 3. If broadcasting and notify parents is checked, create portal notifications
      if (isNowBroadcasted && notifyParents) {
        const broadcastNotif: NotificationItem = {
          id: `notif-broadcast-${Date.now()}`,
          title: `📢 Terminal Reports Released: ${selectedClass} (${selectedTerm})`,
          message: `Official Terminal Examination report cards for ${selectedClass} (${selectedAcademicYear} - ${selectedTerm}) have been officially broadcasted by the administration. Parents and students can now view and download report cards on the student portal.`,
          date: new Date().toISOString().split('T')[0],
          type: 'Academic',
          recipientGroup: selectedClass,
          targetClass: selectedClass,
          targetAudience: 'Parents & Students'
        };
        await saveNotification(broadcastNotif);
      }

      setShowBroadcastModal(false);
      setToastMessage(
        isNowBroadcasted 
          ? `✓ Terminal reports for ${selectedClass} (${selectedTerm}) have been successfully broadcasted live to the Student Portal!`
          : `✓ Terminal reports broadcast for ${selectedClass} has been revoked and set to Draft mode.`
      );
      setTimeout(() => setToastMessage(null), 6000);
    } catch (err) {
      console.error('Error updating broadcast state:', err);
      alert('Failed to update broadcast status. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Auto-calculate & Rank Entire Class
  const handleAutoRankClass = async () => {
    setIsProcessing(true);
    try {
      // Sort students by totalScore descending
      const sorted = [...classReports].sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));
      const totalCount = sorted.length;

      const rankedReports = sorted.map((rep, index) => {
        const rankNum = index + 1;
        const suffix = rankNum === 1 ? 'st' : rankNum === 2 ? 'nd' : rankNum === 3 ? 'rd' : 'th';
        return {
          ...rep,
          position: `${rankNum}${suffix} out of ${totalCount}`
        };
      });

      // Merge into reports list
      const updatedReports = [...reportsList];
      for (const rr of rankedReports) {
        const idx = updatedReports.findIndex(r => r.studentId === rr.studentId && r.term.toLowerCase() === selectedTerm.toLowerCase());
        if (idx >= 0) {
          updatedReports[idx] = rr;
        } else {
          updatedReports.push(rr);
        }
      }

      await saveAllReports(updatedReports);
      setReportsList(updatedReports);
      onUpdateReports?.(updatedReports);

      setToastMessage(`✓ Successfully computed composite totals, GPA averages, and 1st-${totalCount}th positions for all ${totalCount} students in ${selectedClass}!`);
      setTimeout(() => setToastMessage(null), 5000);
    } catch (err) {
      console.error('Error calculating ranks:', err);
      alert('Could not auto-calculate class ranks.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Save changes from editing a student report
  const handleSaveStudentReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReport) return;

    setIsProcessing(true);
    try {
      // Recalculate total and average
      const totalScore = editingReport.scores.reduce((sum, s) => sum + (s.total || 0), 0);
      const averageScore = Number((totalScore / (editingReport.scores.length || 1)).toFixed(1));

      const updatedReport: TermReport = {
        ...editingReport,
        totalScore,
        averageScore
      };

      await saveReport(updatedReport);

      const updatedList = reportsList.map(r => r.id === updatedReport.id ? updatedReport : r);
      if (!updatedList.some(r => r.id === updatedReport.id)) {
        updatedList.push(updatedReport);
      }
      setReportsList(updatedList);
      onUpdateReports?.(updatedList);

      setEditingReport(null);
      setToastMessage(`✓ Saved terminal report records and marks for ${updatedReport.studentName}!`);
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err) {
      console.error('Error saving student report:', err);
      alert('Failed to save student report. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="bg-emerald-600 text-white px-5 py-3.5 rounded-2xl shadow-lg text-xs sm:text-sm font-bold flex items-center justify-between animate-fadeIn">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            {toastMessage}
          </span>
          <button 
            onClick={() => setToastMessage(null)} 
            className="hover:bg-emerald-700 p-1 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* TOP HEADER & CLASS BROADCAST CONTROL PANEL */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-2xl shadow-xl border border-blue-900/60 p-6 sm:p-8 space-y-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-blue-900/80 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="bg-blue-500/20 text-blue-300 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-blue-500/30">
                the region Education Service • Term Report Administration
              </span>
              {currentBroadcast?.status === 'Submitted' ? (
                <span className="bg-amber-500/20 text-amber-300 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border border-amber-500/40 flex items-center gap-1.5 animate-pulse">
                  <Clock className="w-3 h-3 text-amber-400" />
                  Teacher Submitted (Awaiting Vetting)
                </span>
              ) : isClassBroadcasted ? (
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border border-emerald-500/40 flex items-center gap-1.5 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  Live on Student Portal
                </span>
              ) : (
                <span className="bg-amber-500/20 text-amber-300 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border border-amber-500/40 flex items-center gap-1.5">
                  <Lock className="w-3 h-3" />
                  Draft (Locked from Portal)
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2.5 tracking-tight">
              <Award className="w-7 h-7 text-blue-400" />
              Student Terminal Reports & Class Broadcast Console
            </h1>
            <p className="text-xs text-slate-300 max-w-2xl">
              Compile continuous assessments, terminal examination results, conduct, teacher comments, and publish reports class-by-class before students can access them on their student portal.
            </p>
          </div>

          {/* Quick Primary Actions */}
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            {isClassBroadcasted ? (
              <button
                onClick={() => handleExecuteBroadcast('Draft')}
                disabled={isProcessing}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600/90 hover:bg-amber-600 text-white text-xs font-bold shadow-md transition-all cursor-pointer border border-amber-500/50"
              >
                <Lock className="w-4 h-4" /> Revoke Broadcast (Lock)
              </button>
            ) : (
              <button
                onClick={() => setShowBroadcastModal(true)}
                disabled={isProcessing}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-black shadow-lg shadow-emerald-500/20 transition-all cursor-pointer transform active:scale-95"
              >
                <Send className="w-4 h-4" /> Broadcast Class Reports Live
              </button>
            )}

            <button
              onClick={handleAutoRankClass}
              disabled={isProcessing || classReports.length === 0}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition-all cursor-pointer border border-blue-500/40"
              title="Recalculate composite totals, averages, and 1st-X positions"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} /> Auto-Rank Class
            </button>

            <button
              onClick={() => setShowBatchPrintModal(true)}
              disabled={classReports.length === 0}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-bold shadow-md transition-all cursor-pointer border border-slate-700"
            >
              <Printer className="w-4 h-4 text-blue-400" /> Batch Print ({classReports.length})
            </button>

            <button
              onClick={async () => {
                if (window.confirm('Are you sure you want to empty the Broadcast Console? This will remove all published/draft broadcast states from the database.')) {
                  setIsProcessing(true);
                  const success = await clearAllClassReportBroadcasts();
                  if (success) {
                    setBroadcastsList([]);
                    onUpdateBroadcasts?.([]);
                    setToastMessage('✓ Broadcast Console cleared successfully.');
                  } else {
                    alert('Failed to clear Broadcast Console.');
                  }
                  setIsProcessing(false);
                }
              }}
              disabled={isProcessing}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-900/20 hover:bg-red-900/40 text-red-400 text-xs font-bold shadow-md transition-all cursor-pointer border border-red-900/30"
              title="Empty the entire Broadcast Console database"
            >
              <Trash2 className="w-4 h-4" /> Clear Console
            </button>
          </div>
        </div>

        {/* Filters & Selection Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 bg-slate-800/80 p-4 rounded-xl border border-blue-900/50 text-xs">
          <div>
            <label className="block font-bold text-slate-300 mb-1">Department</label>
            <select
              value={selectedDepartment}
              onChange={(e) => {
                const newDept = e.target.value;
                setSelectedDepartment(newDept);
                if (newDept === 'Pre-School') setSelectedClass('Creche');
                else if (newDept === 'Primary School') setSelectedClass('Basic 1');
                else if (newDept === 'Junior High School') setSelectedClass('JHS 1');
                else if (newDept === 'Senior High School') setSelectedClass('SHS 1');
                else setSelectedClass('Basic 1');
              }}
              className="w-full px-3 py-2 bg-blue-950 border border-blue-800 rounded-xl font-bold text-blue-200 focus:ring-2 focus:ring-blue-500"
            >
              <option value="All">All Departments</option>
              <option value="Pre-School">Pre-School</option>
              <option value="Primary School">Primary School</option>
              <option value="Junior High School">Junior High School</option>
              <option value="Senior High School">Senior High School</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-300 mb-1">Target Class</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl font-bold text-white focus:ring-2 focus:ring-blue-500"
            >
              {classOptions.map(cName => (
                <option key={cName} value={cName}>{cName}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-300 mb-1">Academic Year</label>
            <select
              value={selectedAcademicYear}
              onChange={(e) => setSelectedAcademicYear(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl font-bold text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="2025-2026">2025-2026</option>
              <option value="2026-2027">2026-2027</option>
              <option value="2024-2025">2024-2025</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-300 mb-1">Academic Term</label>
            <select
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl font-bold text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="First Term">First Term</option>
              <option value="Second Term">Second Term</option>
              <option value="Third Term">Third Term</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-300 mb-1">Quick Search Student</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Name or Admission No..."
                className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Live Broadcast Status Banner */}
        <div className={`p-4 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs ${
          isClassBroadcasted 
            ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200' 
            : currentBroadcast?.status === 'Submitted'
            ? 'bg-blue-950/60 border-blue-500/40 text-blue-200'
            : 'bg-amber-950/60 border-amber-500/40 text-amber-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              isClassBroadcasted ? 'bg-emerald-500/20 text-emerald-400' : currentBroadcast?.status === 'Submitted' ? 'bg-blue-500/20 text-blue-400' : 'bg-amber-500/20 text-amber-400'
            }`}>
              {isClassBroadcasted ? <ShieldCheck className="w-5 h-5" /> : currentBroadcast?.status === 'Submitted' ? <Clock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
            </div>
            <div>
              <div className="font-extrabold text-white text-sm">
                {isClassBroadcasted 
                  ? `Class Terminal Reports are Broadcasted & Live for ${selectedClass}` 
                  : currentBroadcast?.status === 'Submitted'
                  ? `Class Teacher Submitted Reports for ${selectedClass} (Vetting Required)`
                  : `Class Terminal Reports are in Draft Mode for ${selectedClass}`}
              </div>
              <p className="text-[11px] opacity-80 mt-0.5">
                {isClassBroadcasted 
                  ? `Published on ${currentBroadcast?.broadcastedAt || 'Recently'} by ${currentBroadcast?.broadcastedBy || 'Administration'}. Students in ${selectedClass} can view their report cards in their portal.` 
                  : currentBroadcast?.status === 'Submitted'
                  ? `Submitted by teacher for review. Check entry details, behavior remarks, and attendance. Approve to publish.`
                  : `Students in ${selectedClass} cannot see their terminal grades or position until an administrator broadcasts them.`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isClassBroadcasted ? (
              <span className="px-3 py-1 bg-emerald-500 text-slate-950 font-black rounded-lg uppercase tracking-wider text-[10px]">
                Accessible on Student Portal
              </span>
            ) : currentBroadcast?.status === 'Submitted' ? (
              <button
                onClick={() => setShowBroadcastModal(true)}
                className="px-3.5 py-1.5 bg-blue-500 hover:bg-blue-400 text-white font-black rounded-lg text-xs transition-colors cursor-pointer shadow-sm flex items-center gap-1.5 animate-pulse"
              >
                Vet & Publish Live →
              </button>
            ) : (
              <button
                onClick={() => setShowBroadcastModal(true)}
                className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg text-xs transition-colors cursor-pointer shadow-sm"
              >
                Release to Students →
              </button>
            )}
          </div>
        </div>
      </div>

      {/* CLASS PERFORMANCE METRICS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Class Enrollment</p>
            <h3 className="text-2xl font-black text-slate-900 mt-0.5">{classMetrics.total} Students</h3>
            <p className="text-xs text-blue-600 font-semibold mt-1">{selectedClass} ({selectedTerm})</p>
          </div>
          <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
            <User className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Class Mean Average</p>
            <h3 className="text-2xl font-black text-slate-900 mt-0.5">{classMetrics.average}%</h3>
            <p className="text-xs text-emerald-600 font-semibold mt-1">Pass Rate: {classMetrics.passRate}%</p>
          </div>
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
            <Award className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Highest Composite Score</p>
            <h3 className="text-2xl font-black text-slate-900 mt-0.5">{classMetrics.highest} pts</h3>
            <p className="text-xs text-indigo-600 font-semibold mt-1">Rank 1 Benchmark</p>
          </div>
          <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
            <Sparkles className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Portal Broadcast Status</p>
            <h3 className={`text-xl font-black mt-0.5 ${isClassBroadcasted ? 'text-emerald-700' : 'text-amber-700'}`}>
              {isClassBroadcasted ? 'Broadcasted' : 'Draft / Locked'}
            </h3>
            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold mt-1 ${
              isClassBroadcasted ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
            }`}>
              {isClassBroadcasted ? 'Portal Live' : 'Awaiting Release'}
            </span>
          </div>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
            isClassBroadcasted ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
          }`}>
            {isClassBroadcasted ? <Unlock className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
          </div>
        </div>
      </div>

      {/* STUDENT TERMINAL REPORTS MASTER TABLE */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              {selectedClass} Student Terminal Reports Master Sheet ({selectedTerm})
            </h2>
            <p className="text-xs text-slate-500">
              Showing {filteredClassReports.length} student records for {selectedAcademicYear} academic session.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleAutoRankClass}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 rounded-lg flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Recompute Positions
            </button>
          </div>
        </div>

        {filteredClassReports.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <Award className="w-12 h-12 mx-auto text-slate-300" />
            <div className="text-base font-bold text-slate-700">No student records found in {selectedClass}</div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Please enroll students in this class or select another class from the filter dropdown above.
            </p>
          </div>
        ) : (
          <div className="border border-slate-200 rounded-xl overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-900 text-white uppercase text-[10px] font-bold">
                <tr>
                  <th className="p-3 text-center">Rank</th>
                  <th className="p-3">Admission No</th>
                  <th className="p-3">Student Name</th>
                  <th className="p-3 text-center">Subjects Tested</th>
                  <th className="p-3 text-center">Total Score</th>
                  <th className="p-3 text-center">Terminal Average</th>
                  <th className="p-3 text-center">Attendance</th>
                  <th className="p-3 text-center">Portal Visibility</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredClassReports.map((rep, idx) => (
                  <tr key={rep.id || idx} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 text-center">
                      <span className="bg-purple-100 text-purple-900 font-black px-2.5 py-0.5 rounded-full text-xs">
                        {rep.position || `${idx + 1}th`}
                      </span>
                    </td>
                    <td className="p-3 font-mono font-bold text-blue-700">
                      {rep.admissionNo}
                    </td>
                    <td className="p-3 font-bold text-slate-900 flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-[10px]">
                        {rep.studentName.charAt(0)}
                      </div>
                      {rep.studentName}
                    </td>
                    <td className="p-3 text-center font-mono text-slate-600">
                      {rep.scores?.length || 7} Subjects
                    </td>
                    <td className="p-3 text-center font-mono font-bold text-slate-800">
                      {rep.totalScore}
                    </td>
                    <td className="p-3 text-center font-mono font-black text-emerald-700 text-sm">
                      {rep.averageScore}%
                    </td>
                    <td className="p-3 text-center font-mono text-slate-600">
                      {rep.attendancePresent}/{rep.attendanceTotal}
                    </td>
                    <td className="p-3 text-center">
                      {isClassBroadcasted ? (
                        <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-[10px] inline-flex items-center gap-1">
                          <Check className="w-3 h-3" /> Published
                        </span>
                      ) : (
                        <span className="bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded text-[10px] inline-flex items-center gap-1">
                          <Lock className="w-3 h-3" /> Draft (Hidden)
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setViewingReport(rep)}
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-2xs flex items-center gap-1 cursor-pointer transition-colors"
                          title="Preview Official Report Card"
                        >
                          <Eye className="w-3.5 h-3.5" /> View Card
                        </button>
                        <button
                          onClick={() => handleOfficialPDFExport(rep)}
                          className="px-2.5 py-1 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                          title="Generate Official PDF"
                        >
                          <Printer className="w-3.5 h-3.5" /> Official PDF
                        </button>
                        <button
                          onClick={() => handleEmailReportToParent(rep)}
                          disabled={emailingReportId === rep.id}
                          className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white disabled:bg-teal-850 disabled:opacity-60 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                          title="Dispatch Terminal Report card to Parent Email"
                        >
                          {emailingReportId === rep.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Send className="w-3.5 h-3.5" />
                          )}
                          Email Parent
                        </button>
                        <button
                          onClick={() => setEditingReport(rep)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                          title="Edit Marks & Remarks"
                        >
                          <Edit3 className="w-3.5 h-3.5" /> Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* BROADCAST CLASS REPORTS MODAL */}
      {showBroadcastModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 sm:p-8 border border-slate-200 space-y-6">
            <div className="flex justify-between items-start border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-black tracking-widest text-emerald-600 uppercase">Publishing Console</span>
                <h3 className="text-xl font-black text-slate-900 mt-0.5 flex items-center gap-2">
                  <Send className="w-5 h-5 text-emerald-600" />
                  Broadcast {selectedClass} Terminal Reports
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Once published, students and parents in {selectedClass} can immediately view and download their official report cards on the Student Portal.
                </p>
              </div>
              <button 
                onClick={() => setShowBroadcastModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 grid grid-cols-2 gap-2 text-slate-700 font-medium">
                <div>Class: <strong className="text-slate-900">{selectedClass}</strong></div>
                <div>Session: <strong className="text-slate-900">{selectedAcademicYear} ({selectedTerm})</strong></div>
                <div>Students Impacted: <strong className="text-blue-700">{classReports.length} students</strong></div>
                <div>Class Mean: <strong className="text-emerald-700">{classMetrics.average}%</strong></div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Administrative Release Notes / Message</label>
                <textarea
                  rows={3}
                  value={broadcastNotes}
                  onChange={(e) => setBroadcastNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Vacation Date</label>
                  <input
                    type="date"
                    value={vacationDate}
                    onChange={(e) => setVacationDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Next Term Resumption Date</label>
                  <input
                    type="date"
                    value={nextTermDate}
                    onChange={(e) => setNextTermDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium font-bold text-blue-900"
                  />
                </div>
              </div>

              <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100 flex items-center gap-3">
                <input
                  type="checkbox"
                  id="notify-portal"
                  checked={notifyParents}
                  onChange={(e) => setNotifyParents(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                />
                <label htmlFor="notify-portal" className="text-xs font-bold text-emerald-950 cursor-pointer">
                  Send In-App Portal Notification & Announcement to all {selectedClass} Parents & Students
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowBroadcastModal(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleExecuteBroadcast('Published')}
                disabled={isProcessing}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-lg shadow-emerald-600/20 flex items-center gap-2 cursor-pointer transition-all"
              >
                <Send className="w-4 h-4" />
                {isProcessing ? 'Broadcasting...' : 'Confirm & Publish Live'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STUDENT REPORT CARD PREVIEW MODAL */}
      {viewingReport && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn overflow-y-auto">
          <div id="printable-terminal-report" className="print-a4-page print-no-break bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 sm:p-8 border border-slate-200 space-y-6 my-8 print:m-0 print:p-4 print:shadow-none">
            {/* the region GES & School Official Header */}
            <div className="text-center border-b-2 border-slate-900 pb-4 flex flex-col items-center relative">
              <div className="text-[10px] font-black tracking-widest text-blue-700 uppercase mb-1">
                REPUBLIC OF GHANA • GHANA EDUCATION SERVICE (GES)
              </div>
              <JIPASLogo size="md" className="mb-2" />
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">JOY INTERNATIONAL SCHOOL (JIPAS)</h2>
              <p className="text-[11px] text-slate-500">
                {SCHOOL_CONTACT.poBox} • {SCHOOL_CONTACT.address} • Tel: {SCHOOL_CONTACT.tel} • {SCHOOL_CONTACT.email}
              </p>
              <div className="inline-block bg-slate-900 text-white text-xs font-bold px-4 py-1 rounded-full mt-2 uppercase tracking-wider">
                Continuous Assessment & Terminal Examination Report Card
              </div>

              <div className="absolute right-0 top-0 print:hidden">
                <button
                  onClick={() => setViewingReport(null)}
                  className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Student Metadata Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200 font-medium">
              <div>Student Full Name: <strong className="text-slate-900 block text-sm">{viewingReport.studentName}</strong></div>
              <div>Admission No: <strong className="font-mono text-blue-700 block text-sm">{viewingReport.admissionNo}</strong></div>
              <div>Class / Form: <strong className="text-slate-900 block text-sm">{viewingReport.className}</strong></div>
              <div>Academic Session: <strong>{viewingReport.academicYear} ({viewingReport.term})</strong></div>
              <div>Attendance: <strong>{viewingReport.attendancePresent} / {viewingReport.attendanceTotal} Days</strong></div>
              <div>Overall Position: <strong className="text-purple-700 font-black">{viewingReport.position}</strong></div>
            </div>

            {/* Marks & Continuous Assessment Table */}
            <div className="border border-slate-300 rounded-xl overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-900 text-white uppercase text-[10px] font-bold">
                  <tr>
                    <th className="p-2.5">Subject</th>
                    <th className="p-2.5 text-center">Class Score (/40)</th>
                    <th className="p-2.5 text-center">Exam Score (/60)</th>
                    <th className="p-2.5 text-center">Total (/100)</th>
                    <th className="p-2.5 text-center">GES Grade</th>
                    <th className="p-2.5">Remark</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {viewingReport.scores?.map((sc, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="p-2.5 font-bold text-slate-900">{sc.subject}</td>
                      <td className="p-2.5 text-center font-mono text-slate-600">{sc.classScore}</td>
                      <td className="p-2.5 text-center font-mono text-slate-600">{sc.examScore}</td>
                      <td className="p-2.5 text-center font-mono font-black text-blue-700">{sc.total}</td>
                      <td className="p-2.5 text-center font-bold text-emerald-700">{sc.grade}</td>
                      <td className="p-2.5 text-slate-700">{sc.remark}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Performance Summary Bar */}
            <div className="flex flex-wrap justify-between items-center bg-blue-50 p-3.5 rounded-xl border border-blue-200 text-xs font-bold text-slate-800">
              <div>Total Raw Score: <span className="font-mono text-blue-800 font-black">{viewingReport.totalScore} pts</span></div>
              <div>Terminal Average: <span className="font-mono text-emerald-800 font-black">{viewingReport.averageScore}%</span></div>
              <div>Next Term Begins: <span className="text-slate-900">{viewingReport.nextTermBegins || nextTermDate}</span></div>
            </div>

            {/* Conduct & Remarks */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
              <div><strong>Conduct:</strong> <span className="text-slate-700">{viewingReport.conduct || 'Exemplary'}</span></div>
              <div><strong>Attitude:</strong> <span className="text-slate-700">{viewingReport.attitude || 'Diligent & Respectful'}</span></div>
              <div className="col-span-2 pt-2 border-t border-slate-200/60">
                <strong>Form Master's Remark:</strong>
                <p className="text-slate-700 italic mt-0.5">"{viewingReport.teacherComment || 'An impressive academic result. Keep up the high standard.'}"</p>
              </div>
              <div className="col-span-2 pt-2 border-t border-slate-200/60">
                <strong>Headmaster's Endorsement:</strong>
                <p className="text-slate-700 italic mt-0.5">"{viewingReport.headmasterComment || 'Promoted with credit. Exceptional dedication.'}"</p>
              </div>
            </div>

            {/* Signature Stubs for Physical Print */}
            <div className="grid grid-cols-2 gap-8 pt-4 border-t border-slate-200 text-xs">
              <div className="text-center space-y-2">
                <div className="border-b border-slate-400 w-40 mx-auto h-8"></div>
                <div className="font-bold text-slate-800">Class Teacher's Signature</div>
              </div>
              <div className="text-center space-y-2">
                <div className="border-b border-slate-400 w-40 mx-auto h-8"></div>
                <div className="font-bold text-slate-800">Headmaster's Stamp & Signature</div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 print:hidden">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" /> Print Official Report Card
              </button>
              <button
                onClick={() => setViewingReport(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT STUDENT REPORT MODAL */}
      {editingReport && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 sm:p-8 border border-slate-200 space-y-6 my-8">
            <div className="flex justify-between items-start border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-black tracking-widest text-blue-600 uppercase">Assessment Editor</span>
                <h3 className="text-xl font-black text-slate-900 mt-0.5 flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-blue-600" />
                  Edit Report: {editingReport.studentName} ({editingReport.admissionNo})
                </h3>
                <p className="text-xs text-slate-500">Update continuous assessment scores, conduct, and teacher remarks.</p>
              </div>
              <button 
                onClick={() => setEditingReport(null)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStudentReport} className="space-y-4 text-xs">
              {/* Subject Marks Table Inputs */}
              <div className="space-y-2">
                <label className="block font-bold text-slate-800">Subject Marks Breakdown (SBA 40% + Terminal Exam 60%)</label>
                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-900 text-white uppercase text-[10px] sticky top-0">
                      <tr>
                        <th className="p-2.5">Subject</th>
                        <th className="p-2.5 text-center">Class Score (/40)</th>
                        <th className="p-2.5 text-center">Exam Score (/60)</th>
                        <th className="p-2.5 text-center">Total (/100)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {editingReport.scores.map((sc, sIdx) => (
                        <tr key={sIdx}>
                          <td className="p-2 font-bold text-slate-900">{sc.subject}</td>
                          <td className="p-2 text-center">
                            <input
                              type="number"
                              min="0"
                              max="40"
                              value={sc.classScore}
                              onChange={(e) => {
                                const val = Math.min(40, Math.max(0, parseFloat(e.target.value) || 0));
                                const updatedScores = [...editingReport.scores];
                                const newTotal = val + (sc.examScore || 0);
                                updatedScores[sIdx] = { ...sc, classScore: val, total: newTotal };
                                setEditingReport({ ...editingReport, scores: updatedScores });
                              }}
                              className="w-16 px-2 py-1 border border-slate-300 rounded-lg text-center font-mono font-bold"
                            />
                          </td>
                          <td className="p-2 text-center">
                            <input
                              type="number"
                              min="0"
                              max="60"
                              value={sc.examScore}
                              onChange={(e) => {
                                const val = Math.min(60, Math.max(0, parseFloat(e.target.value) || 0));
                                const updatedScores = [...editingReport.scores];
                                const newTotal = (sc.classScore || 0) + val;
                                updatedScores[sIdx] = { ...sc, examScore: val, total: newTotal };
                                setEditingReport({ ...editingReport, scores: updatedScores });
                              }}
                              className="w-16 px-2 py-1 border border-slate-300 rounded-lg text-center font-mono font-bold"
                            />
                          </td>
                          <td className="p-2 text-center font-mono font-black text-blue-700">
                            {(sc.classScore || 0) + (sc.examScore || 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Attendance & Profile */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Days Present</label>
                  <input
                    type="number"
                    value={editingReport.attendancePresent}
                    onChange={(e) => setEditingReport({ ...editingReport, attendancePresent: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Total Term Days</label>
                  <input
                    type="number"
                    value={editingReport.attendanceTotal}
                    onChange={(e) => setEditingReport({ ...editingReport, attendanceTotal: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Position / Rank</label>
                  <input
                    type="text"
                    value={editingReport.position}
                    onChange={(e) => setEditingReport({ ...editingReport, position: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-purple-700"
                  />
                </div>
              </div>

              {/* Conduct & Interest */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Conduct & Deportment</label>
                  <input
                    type="text"
                    value={editingReport.conduct}
                    onChange={(e) => setEditingReport({ ...editingReport, conduct: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Attitude to Work</label>
                  <input
                    type="text"
                    value={editingReport.attitude}
                    onChange={(e) => setEditingReport({ ...editingReport, attitude: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              {/* AI Assistant */}
              <AIReportAssistant 
                report={editingReport} 
                onCommentGenerated={(comment) => setEditingReport({ ...editingReport, teacherComment: comment })}
              />

              {/* Remarks */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Form / Class Teacher's Remark</label>
                <input
                  type="text"
                  value={editingReport.teacherComment}
                  onChange={(e) => setEditingReport({ ...editingReport, teacherComment: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Headmaster's Official Endorsement</label>
                <input
                  type="text"
                  value={editingReport.headmasterComment}
                  onChange={(e) => setEditingReport({ ...editingReport, headmasterComment: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingReport(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md cursor-pointer transition-colors"
                >
                  {isProcessing ? 'Saving...' : 'Save Student Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BATCH PRINT MODAL */}
      {showBatchPrintModal && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full p-6 sm:p-8 border border-slate-200 space-y-6 my-8 print:p-0 print:shadow-none">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4 print:hidden">
              <div>
                <h3 className="text-xl font-black text-slate-900">
                  Batch Print: {selectedClass} Terminal Report Cards ({classReports.length} Students)
                </h3>
                <p className="text-xs text-slate-500">Ready to print all official report cards for the class.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportAllToPDF}
                  disabled={isExportingPdf}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  {isExportingPdf ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Exporting PDF...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" /> Export PDF ({classReports.length})
                    </>
                  )}
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" /> Print All ({classReports.length})
                </button>
                <button
                  onClick={() => setShowBatchPrintModal(false)}
                  className="text-slate-400 hover:text-slate-700 p-2 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Class Cards List */}
            <div ref={batchPrintContainerRef} id="printable-terminal-report" className="space-y-12 bg-white print-class-reports-container">
              {classReports.map((rep, idx) => (
                <div key={idx} className="print-class-report-page print-a4-page print-no-break p-6 border-2 border-slate-800 rounded-2xl space-y-4">
                  <div className="text-center border-b border-slate-400 pb-3 flex flex-col items-center">
                    <div className="text-[10px] font-black uppercase tracking-widest text-blue-700 mb-1">Republic of the region • GES Accredited</div>
                    <JIPASLogo size="sm" className="mb-2" />
                    <h3 className="text-xl font-black text-slate-900">JOY INTERNATIONAL SCHOOL (JIPAS)</h3>
                    <div className="text-xs font-bold text-slate-600">Continuous Assessment & Terminal Report Card • {selectedAcademicYear} ({selectedTerm})</div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <div>Student: <strong>{rep.studentName}</strong></div>
                    <div>Adm No: <strong className="font-mono text-blue-700">{rep.admissionNo}</strong></div>
                    <div>Class: <strong>{rep.className}</strong></div>
                    <div>Position: <strong className="text-purple-700">{rep.position}</strong></div>
                    <div>Total Score: <strong>{rep.totalScore}</strong></div>
                    <div>Average: <strong className="text-emerald-700">{rep.averageScore}%</strong></div>
                  </div>

                  <table className="w-full text-xs text-left border border-slate-200">
                    <thead className="bg-slate-900 text-white text-[10px] uppercase">
                      <tr>
                        <th className="p-2">Subject</th>
                        <th className="p-2 text-center">Class (40%)</th>
                        <th className="p-2 text-center">Exam (60%)</th>
                        <th className="p-2 text-center">Total (100%)</th>
                        <th className="p-2 text-center">Grade</th>
                        <th className="p-2">Remark</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rep.scores?.map((sc, sI) => (
                        <tr key={sI}>
                          <td className="p-1.5 font-bold">{sc.subject}</td>
                          <td className="p-1.5 text-center font-mono">{sc.classScore}</td>
                          <td className="p-1.5 text-center font-mono">{sc.examScore}</td>
                          <td className="p-1.5 text-center font-mono font-bold text-blue-700">{sc.total}</td>
                          <td className="p-1.5 text-center font-bold text-emerald-700">{sc.grade}</td>
                          <td className="p-1.5">{sc.remark}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="grid grid-cols-2 gap-4 text-xs pt-2">
                    <div>Teacher Remark: <em>"{rep.teacherComment || 'Satisfactory progress.'}"</em></div>
                    <div>Headmaster Remark: <em>"{rep.headmasterComment || 'Promoted.'}"</em></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

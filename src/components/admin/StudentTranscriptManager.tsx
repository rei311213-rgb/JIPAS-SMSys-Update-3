import React, { useState, useRef } from 'react';
import { 
  FileText, Download, Share2, Printer, Search, CheckCircle2, 
  Sparkles, Award, User, Calendar, BookOpen, 
  Copy, Mail, MessageCircle, ExternalLink, QrCode, ShieldCheck, ChevronRight
} from 'lucide-react';
import { Student, TermReport } from '../../types';
import JIPASLogo from '../common/JIPASLogo';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface StudentTranscriptManagerProps {
  students: Student[];
  reports: TermReport[];
  onNavigate?: (module: string) => void;
}

export default function StudentTranscriptManager({
  students,
  reports
}: StudentTranscriptManagerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState('All Classes');
  const [selectedStudentId, setSelectedStudentId] = useState<string>(students[0]?.id || 's1');
  const [transcriptType, setTranscriptType] = useState<'cumulative' | 'current_year' | 'graduation'>('cumulative');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const transcriptRef = useRef<HTMLDivElement>(null);

  // Available classes
  const classesList = ['All Classes', ...Array.from(new Set(students.map(s => s.className)))];

  // Filter students
  const filteredStudents = students.filter(s => {
    const matchesSearch = s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          s.admissionNo.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesClass = selectedClass === 'All Classes' || s.className === selectedClass;
    return matchesSearch && matchesClass;
  });

  const activeStudent = students.find(s => s.id === selectedStudentId) || students[0] || {
    id: 's1',
    admissionNo: 'ADM/26/0001',
    fullName: 'DENYO SAMUEL YAW',
    gender: 'Male',
    dob: '2020-05-10',
    department: 'Primary School',
    className: 'Basic 1',
    rollNo: '001',
    house: 'Blue',
    parentPhone: '0249755593',
    parentName: 'Mr. Denyo Paul Sam',
    academicYear: '2025-2026',
    term: 'Third Term',
    status: 'Active',
    isCurrent: true,
    enrollmentDate: '2024-09-01'
  };

  // Find all reports for the active student
  const studentReports = reports.filter(r => 
    r.studentId === activeStudent.id || 
    r.admissionNo?.toLowerCase() === activeStudent.admissionNo?.toLowerCase()
  );

  // Calculate Cumulative Academic Statistics
  const allScores = studentReports.flatMap(r => r.scores || []);
  const totalSubjectsCount = allScores.length;
  const cumulativeTotalScore = allScores.reduce((acc, sc) => acc + (sc.total || 0), 0);
  const cumulativeAverage = totalSubjectsCount > 0 
    ? ((cumulativeTotalScore ?? 0) / totalSubjectsCount).toFixed(1) 
    : '0.0';

  // Derive GPA on standard 4.0 scale based on average percentage
  const avgNum = parseFloat(cumulativeAverage);
  let gpa = totalSubjectsCount > 0 ? '4.00' : '—';
  let academicHonors = totalSubjectsCount > 0 ? 'First Class Honours / High Distinction' : 'Pending Assessments';
  if (totalSubjectsCount > 0) {
    if (avgNum >= 80) {
      gpa = '4.00';
      academicHonors = 'Principal\'s Honor List (Distinction)';
    } else if (avgNum >= 70) {
      gpa = '3.50';
      academicHonors = 'First Class Standing';
    } else if (avgNum >= 60) {
      gpa = '3.00';
      academicHonors = 'Second Class Upper';
    } else if (avgNum >= 50) {
      gpa = '2.50';
      academicHonors = 'Second Class Lower';
    } else {
      gpa = '2.00';
      academicHonors = 'Pass';
    }
  }

  const transcriptId = `TR-${activeStudent.admissionNo?.replace(/[^a-zA-Z0-9]/g, '') || '2026'}-${Date.now().toString().slice(-4)}`;
  const issueDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // PDF Download Handler using html2canvas & jsPDF
  const handleDownloadPDF = async () => {
    if (!transcriptRef.current) return;
    setIsGeneratingPdf(true);

    try {
      const element = transcriptRef.current;
      const canvas = await html2canvas(element, {
        scale: 2, // high quality
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

      const fileName = `JIPAS_Official_Transcript_${activeStudent.admissionNo.replace(/\//g, '_')}_${activeStudent.fullName.replace(/\s+/g, '_')}.pdf`;
      pdf.save(fileName);
      showToast('Official Transcript PDF downloaded successfully!');
    } catch (error) {
      console.error('PDF generation error:', error);
      showToast('Printing dialog opened as PDF alternative.');
      window.print();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Print Handler
  const handlePrint = () => {
    window.print();
  };

  // Share Handler
  const handleNativeShare = async () => {
    const shareData = {
      title: `Official Academic Transcript - ${activeStudent.fullName}`,
      text: `JIPAS Official Academic Transcript for ${activeStudent.fullName} (${activeStudent.admissionNo}). Cumulative Average: ${cumulativeAverage}%, GPA: ${gpa}. Verification Code: ${transcriptId}`,
      url: window.location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        showToast('Transcript shared successfully!');
      } catch (err) {
        console.log('Share canceled or failed', err);
      }
    } else {
      setShowShareModal(true);
    }
  };

  const copyTranscriptSummary = () => {
    const text = `--- JIPAS OFFICIAL ACADEMIC TRANSCRIPT ---\nStudent: ${activeStudent.fullName}\nAdmission No: ${activeStudent.admissionNo}\nClass: ${activeStudent.className} | Dept: ${activeStudent.department}\nCumulative Average: ${cumulativeAverage}%\nGPA: ${gpa} (Scale 4.0)\nStanding: ${academicHonors}\nVerification Code: ${transcriptId}\nIssued Date: ${issueDate}\nAccredited by the region Education Service (GES)`;
    navigator.clipboard.writeText(text);
    showToast('Transcript details copied to clipboard!');
  };

  const getWhatsAppLink = () => {
    const parentNumber = activeStudent.parentPhone?.replace(/[^0-9]/g, '') || '';
    const safeParentNumber = parentNumber || '';
    const phoneParam = safeParentNumber.startsWith('0') ? `233${safeParentNumber.slice(1)}` : safeParentNumber;
    const msg = encodeURIComponent(`Hello, here is the official academic transcript for ${activeStudent.fullName} (Adm: ${activeStudent.admissionNo}) from JIPAS School Management. Cumulative Average: ${cumulativeAverage}%, GPA: ${gpa}. Verification Ref: ${transcriptId}. Issued on ${issueDate}.`);
    return `https://api.whatsapp.com/send?phone=${phoneParam}&text=${msg}`;
  };

  const getEmailLink = () => {
    const subject = encodeURIComponent(`Official Academic Transcript - ${activeStudent.fullName} (${activeStudent.admissionNo})`);
    const body = encodeURIComponent(`Dear Parent/Guardian,\n\nPlease find the summary of the official academic transcript for ${activeStudent.fullName} (${activeStudent.admissionNo}):\n\n- Class: ${activeStudent.className}\n- Cumulative Average: ${cumulativeAverage}%\n- GPA: ${gpa} / 4.0\n- Academic Standing: ${academicHonors}\n- Verification Reference: ${transcriptId}\n\nIssued by JIPAS Administration.\nEducation is Wealth.`);
    return `mailto:?subject=${subject}&body=${body}`;
  };

  return (
    <div className="space-y-6">
      {/* Toast feedback */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-emerald-500/50 flex items-center gap-2.5 text-xs font-semibold animate-in fade-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-wider mb-1">
            <Award className="w-4 h-4 text-amber-400" />
            <span>Academic Records & Certification</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            Official Students' Transcripts
          </h1>
          <p className="text-xs text-indigo-200 mt-1 max-w-xl">
            Generate, verify, download as certified PDF, or directly share cumulative academic transcripts for enrolled and graduating students.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleDownloadPDF}
            disabled={isGeneratingPdf}
            id="btn-download-transcript-pdf"
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
          >
            {isGeneratingPdf ? (
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Generating PDF...
              </span>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Download PDF</span>
              </>
            )}
          </button>

          <button
            onClick={handleNativeShare}
            id="btn-share-transcript"
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            <span>Share Transcript</span>
          </button>

          <button
            onClick={handlePrint}
            id="btn-print-transcript"
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Student Selector Sidebar + Live Transcript Canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Student Roster & Filters */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-indigo-600" /> Select Student
            </h3>

            {/* Class filter */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Filter by Class</label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {classesList.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Search input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search name or adm no..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 pl-8 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            </div>

            {/* Transcript Scope selection */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1.5">Transcript Format</label>
              <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-lg text-[11px] font-bold">
                <button
                  onClick={() => setTranscriptType('cumulative')}
                  className={`py-1.5 px-2 rounded-md transition-all ${
                    transcriptType === 'cumulative' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Full / Cumulative
                </button>
                <button
                  onClick={() => setTranscriptType('current_year')}
                  className={`py-1.5 px-2 rounded-md transition-all ${
                    transcriptType === 'current_year' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Current Year
                </button>
                <button
                  onClick={() => setTranscriptType('graduation')}
                  className={`py-1.5 px-2 rounded-md transition-all ${
                    transcriptType === 'graduation' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Certificate
                </button>
              </div>
            </div>

            {/* Student List */}
            <div className="space-y-1.5 max-h-[460px] overflow-y-auto pr-1 pt-1">
              {filteredStudents.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400">
                  No students found matching filters.
                </div>
              ) : (
                filteredStudents.map(st => {
                  const isSelected = st.id === activeStudent.id;
                  return (
                    <button
                      key={st.id}
                      onClick={() => setSelectedStudentId(st.id)}
                      className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                        isSelected 
                          ? 'bg-indigo-50 border-indigo-300 ring-1 ring-indigo-300' 
                          : 'bg-white border-slate-200/80 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {st.photo ? (
                          <img 
                            src={st.photo} 
                            alt={st.fullName} 
                            referrerPolicy="no-referrer"
                            className="w-8 h-8 rounded-full object-cover border border-slate-200 flex-shrink-0" 
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-black text-xs flex items-center justify-center flex-shrink-0">
                            {st.fullName.charAt(0)}
                          </div>
                        )}
                        <div className="truncate">
                          <p className="text-xs font-bold text-slate-900 truncate">{st.fullName}</p>
                          <p className="text-[10px] text-slate-500">{st.admissionNo} • {st.className}</p>
                        </div>
                      </div>
                      <ChevronRight className={`w-3.5 h-3.5 flex-shrink-0 ${isSelected ? 'text-indigo-600' : 'text-slate-300'}`} />
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: High-Fidelity Official Transcript Sheet */}
        <div className="lg:col-span-8">
          
          {/* Quick Share / Info Bar */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-4 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-700 font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Official GES Transcript Record</span>
              <span className="text-slate-400">•</span>
              <span className="font-mono text-slate-500 text-[11px]">ID: {transcriptId}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={copyTranscriptSummary}
                className="flex items-center gap-1 text-[11px] font-bold text-slate-700 hover:text-indigo-600 bg-white border border-slate-200 px-2.5 py-1 rounded-lg shadow-2xs cursor-pointer"
              >
                <Copy className="w-3 h-3" /> Copy Summary
              </button>

              <a
                href={getWhatsAppLink()}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg shadow-2xs"
              >
                <MessageCircle className="w-3 h-3" /> WhatsApp Parent
              </a>
            </div>
          </div>

          {/* Printable & Downloadable Transcript Document Container */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-6 sm:p-10 text-slate-900 relative overflow-hidden" id="transcript-document" ref={transcriptRef}>
            
            {/* Subtle Watermark Seal */}
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none">
              <div className="w-96 h-96 rounded-full border-[16px] border-slate-900 flex items-center justify-center">
                <span className="text-8xl font-black tracking-widest text-slate-900">JIPAS</span>
              </div>
            </div>

            {/* Official Top Crest & Header */}
            <div className="border-b-2 border-slate-900 pb-5 mb-6 text-center">
              <div className="flex items-center justify-center mb-2">
                <JIPASLogo size="lg" rounded={false} />
              </div>
              <h2 className="text-2xl font-black text-slate-900 tracking-wider uppercase">
                JIPAS - Joy International Primary/Junior/Senior High & Adult School Portal System
              </h2>
              <p className="text-xs font-bold text-indigo-800 tracking-widest uppercase mt-0.5">
                Motto: Education is Wealth • Founded 1990
              </p>
              <p className="text-[11px] text-slate-600 font-medium mt-1">
                01 BP. 2364 • Kpéhénou N°1 Behind T-Oil Feeling Station, and Hedzranawoe 4th Corner after Radio Maria, Lomé — Togo • Tel: (00228) 22 60 21 38 / 99 47 38 23 / 90 83 60 48 • joyjipas2002@gmail.com
              </p>
              <div className="mt-3 inline-block bg-slate-900 text-white text-xs font-black px-4 py-1 uppercase tracking-widest rounded-xs">
                OFFICIAL ACADEMIC TRANSCRIPT & CUMULATIVE RECORD
              </div>
            </div>

            {/* Student Metadata Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-slate-500 font-bold block text-[10px] uppercase tracking-wider">Student Name</span>
                <span className="font-black text-slate-900 text-sm">{activeStudent.fullName}</span>
              </div>
              <div>
                <span className="text-slate-500 font-bold block text-[10px] uppercase tracking-wider">Admission Number</span>
                <span className="font-mono font-bold text-indigo-700">{activeStudent.admissionNo}</span>
              </div>
              <div>
                <span className="text-slate-500 font-bold block text-[10px] uppercase tracking-wider">Class / Department</span>
                <span className="font-bold text-slate-800">{activeStudent.className} ({activeStudent.department})</span>
              </div>
              <div>
                <span className="text-slate-500 font-bold block text-[10px] uppercase tracking-wider">Gender / DOB</span>
                <span className="font-semibold text-slate-800">{activeStudent.gender} • {activeStudent.dob || '2020-05-10'}</span>
              </div>
              <div>
                <span className="text-slate-500 font-bold block text-[10px] uppercase tracking-wider">House / Roll No</span>
                <span className="font-semibold text-slate-800">{activeStudent.house || 'Blue'} House • #{activeStudent.rollNo || '001'}</span>
              </div>
              <div>
                <span className="text-slate-500 font-bold block text-[10px] uppercase tracking-wider">Date of Admission</span>
                <span className="font-semibold text-slate-800">{activeStudent.enrollmentDate || '01-09-2024'}</span>
              </div>
              <div>
                <span className="text-slate-500 font-bold block text-[10px] uppercase tracking-wider">Current Status</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  {activeStudent.status || 'Active'} Student
                </span>
              </div>
              <div>
                <span className="text-slate-500 font-bold block text-[10px] uppercase tracking-wider">Date of Issue</span>
                <span className="font-semibold text-slate-800">{issueDate}</span>
              </div>
            </div>

            {/* Academic Performance Term by Term Breakdown */}
            <div className="space-y-6 mb-6">
              {studentReports.length > 0 ? (
                studentReports.map((rep, idx) => (
                  <div key={rep.id || idx} className="border border-slate-300 rounded-lg overflow-hidden">
                    {/* Term Header */}
                    <div className="bg-slate-800 text-white px-4 py-2 flex flex-wrap items-center justify-between text-xs font-bold">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                        <span>ACADEMIC YEAR: {rep.academicYear || '2025-2026'} — {rep.term || 'Third Term'}</span>
                      </div>
                      <div className="flex items-center gap-3 text-slate-300 text-[11px]">
                        <span>Position: <strong className="text-white">{rep.position || '1st out of 25'}</strong></span>
                        <span>Term Average: <strong className="text-white">{rep.averageScore || 85.8}%</strong></span>
                        <span>Attendance: <strong className="text-white">{rep.attendancePresent || 68}/{rep.attendanceTotal || 70} Days</strong></span>
                      </div>
                    </div>

                    {/* Scores Table */}
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-300 text-[11px] font-bold text-slate-700">
                          <th className="py-2 px-3">#</th>
                          <th className="py-2 px-3">Subject</th>
                          <th className="py-2 px-3 text-center">Class Score (40%)</th>
                          <th className="py-2 px-3 text-center">Exam Score (60%)</th>
                          <th className="py-2 px-3 text-center">Total (100%)</th>
                          <th className="py-2 px-3 text-center">GES Grade</th>
                          <th className="py-2 px-3">Teacher's Remark</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {rep.scores?.map((sc, scIdx) => (
                          <tr key={scIdx} className="hover:bg-slate-50/50">
                            <td className="py-1.5 px-3 text-slate-400 font-mono text-[11px]">{scIdx + 1}</td>
                            <td className="py-1.5 px-3 font-bold text-slate-800">{sc.subject}</td>
                            <td className="py-1.5 px-3 text-center text-slate-600 font-mono">{sc.classScore}</td>
                            <td className="py-1.5 px-3 text-center text-slate-600 font-mono">{sc.examScore}</td>
                            <td className="py-1.5 px-3 text-center font-bold text-slate-900 font-mono">{sc.total}</td>
                            <td className="py-1.5 px-3 text-center font-bold text-indigo-700">{sc.grade}</td>
                            <td className="py-1.5 px-3 text-slate-700">{sc.remark}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Behavioral & Character Assessment */}
                    {(rep.conduct || rep.teacherComment) && (
                      <div className="bg-slate-50 p-3 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                        <div>
                          <span className="font-bold text-slate-700">Conduct & Character:</span>{' '}
                          <span className="text-slate-600">{rep.conduct || 'Exemplary and courteous'}</span>
                        </div>
                        <div>
                          <span className="font-bold text-slate-700">Attitude / Special Interest:</span>{' '}
                          <span className="text-slate-600">{rep.attitude || 'Diligent'} • {rep.interest || 'Creative Arts & Reading'}</span>
                        </div>
                        {rep.teacherComment && (
                          <div className="md:col-span-2">
                            <span className="font-bold text-slate-700">Class Teacher's Remark:</span>{' '}
                            <span className="text-slate-600 italic">"{rep.teacherComment}"</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="border border-dashed border-slate-300 rounded-2xl p-10 text-center bg-slate-50">
                  <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-700">No Terminal Examination Reports Recorded</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                    Terminal assessment scores entered and endorsed by class teachers for {activeStudent.fullName} will compile automatically into this official cumulative transcript.
                  </p>
                </div>
              )}
            </div>

            {/* Cumulative Summary Box */}
            <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-4 mb-8 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div>
                <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">Cumulative Average</span>
                <span className="text-xl font-black text-slate-900">{cumulativeAverage}%</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">GPA (4.0 Scale)</span>
                <span className="text-xl font-black text-indigo-900">{gpa}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">Total Credits Assessed</span>
                <span className="text-xl font-black text-slate-900">{totalSubjectsCount} Subjects</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">Overall Academic Honors</span>
                <span className="text-xs font-black text-emerald-800 block mt-1">{academicHonors}</span>
              </div>
            </div>

            {/* Verification and Signatures Footer */}
            <div className="border-t-2 border-slate-200 pt-6 mt-6 grid grid-cols-1 sm:grid-cols-3 gap-6 items-end">
              
              {/* QR Code and Verification Key */}
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 bg-slate-100 border border-slate-300 rounded-md p-1 flex items-center justify-center flex-shrink-0">
                  <QrCode className="w-14 h-14 text-slate-800" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Official Verification</p>
                  <p className="text-[11px] font-mono font-bold text-slate-900">{transcriptId}</p>
                  <p className="text-[9px] text-slate-500">Scan QR or enter key at jipas.edu.gh/verify</p>
                </div>
              </div>

              {/* Examination Officer Signature */}
              <div className="text-center">
                <div className="border-b border-slate-400 w-36 mx-auto mb-1 pb-1">
                  <span className="font-serif italic text-sm text-slate-800 font-semibold">E. Frimpong</span>
                </div>
                <p className="text-[10px] font-bold text-slate-800 uppercase tracking-wider">Registrar / Exam Officer</p>
                <p className="text-[9px] text-slate-500">JIPAS Academic Board</p>
              </div>

              {/* Headmaster / Principal Official Signature and Seal */}
              <div className="text-center relative">
                {/* Official Red Stamp Seal */}
                <div className="absolute right-0 bottom-6 border-2 border-red-600/70 text-red-600 font-black text-[9px] uppercase tracking-widest px-2 py-1 rotate-[-12deg] rounded-sm pointer-events-none select-none">
                  OFFICIALLY CERTIFIED • JIPAS
                </div>
                <div className="border-b border-slate-400 w-36 mx-auto mb-1 pb-1 min-h-[32px] flex items-center justify-center">
                  {typeof window !== 'undefined' && localStorage.getItem('jipas_ceo_signature') ? (
                    <img 
                      src={localStorage.getItem('jipas_ceo_signature') || ''} 
                      alt="Headmaster Signature" 
                      className="h-9 max-w-[120px] object-contain mx-auto" 
                    />
                  ) : (
                    <span className="font-serif italic text-sm text-indigo-950 font-semibold">Marcus Prosper</span>
                  )}
                </div>
                <p className="text-[10px] font-bold text-slate-800 uppercase tracking-wider">Headmaster / Principal</p>
                <p className="text-[9px] text-slate-500">Date: {issueDate}</p>
              </div>
            </div>

            {/* Legal Notice */}
            <div className="mt-8 pt-4 border-t border-slate-100 text-center text-[9px] text-slate-400">
              This document is an official academic transcript issued by JIPAS under the regulations of the the region Education Service (GES). Any alteration or erasure renders this transcript invalid.
            </div>
          </div>
        </div>
      </div>

      {/* Share Modal Dialog */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Share2 className="w-4 h-4 text-indigo-600" /> Share Student Transcript
              </h3>
              <button 
                onClick={() => setShowShareModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none cursor-pointer"
              >
                ×
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Share the official transcript for <strong className="text-slate-900">{activeStudent.fullName}</strong> ({activeStudent.admissionNo}):
            </p>

            <div className="space-y-2">
              <a
                href={getWhatsAppLink()}
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center justify-between p-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-emerald-600" /> Send via WhatsApp to Parent
                </span>
                <ExternalLink className="w-3.5 h-3.5 opacity-60" />
              </a>

              <a
                href={getEmailLink()}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-bold border border-blue-200 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-blue-600" /> Send via Email
                </span>
                <ExternalLink className="w-3.5 h-3.5 opacity-60" />
              </a>

              <button
                onClick={() => {
                  copyTranscriptSummary();
                  setShowShareModal(false);
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-bold border border-slate-200 transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Copy className="w-4 h-4 text-slate-600" /> Copy Formatted Text Summary
                </span>
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              </button>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowShareModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

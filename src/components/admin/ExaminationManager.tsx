import React, { useState, useEffect } from 'react';
import { 
  FileText, Award, Percent, Edit3, Plus, Pencil, Trash2, Save, 
  CheckCircle2, Download, Printer, ArrowLeft, Search, Eye, Filter, Check, X, Clock, Sparkles
} from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Student, TermReport, GradingScaleItem, ScoreConversionItem, SubjectItem, ScoreApprovalRecord } from '../../types';
import JIPASLogo from '../common/JIPASLogo';
import { subscribeScoreApprovals, saveScoreApproval } from '../../services/dbService';
import { getStoredScoreApprovals } from '../../services/storageService';

interface ExaminationManagerProps {
  activeModule: string;
  students: Student[];
  reports: TermReport[];
  onUpdateReports?: (reports: TermReport[]) => void;
  onNavigate?: (module: string) => void;
  subjects?: SubjectItem[];
}

export const INITIAL_GRADING_SCALES: GradingScaleItem[] = [
  {
    id: 'gs-1',
    department: 'Primary School',
    systemName: 'Primary School 6-Point Scale',
    academicYear: '2025-2026',
    term: 'Third Term',
    bands: [
      { minScore: 80, maxScore: 100, grade: 'A', remark: 'Excellent' },
      { minScore: 70, maxScore: 79.99, grade: 'B', remark: 'Very Good' },
      { minScore: 60, maxScore: 69.99, grade: 'C', remark: 'Good' },
      { minScore: 50, maxScore: 59.99, grade: 'D', remark: 'Credit' },
      { minScore: 40, maxScore: 49.99, grade: 'E', remark: 'Pass' },
      { minScore: 0, maxScore: 39.99, grade: 'F', remark: 'Weak' }
    ]
  },
  {
    id: 'gs-2',
    department: 'Junior High School',
    systemName: 'JHS 9-Point Stanine Scale (WAEC Standard)',
    academicYear: '2025-2026',
    term: 'Third Term',
    bands: [
      { minScore: 80, maxScore: 100, grade: '1', remark: 'Highest' },
      { minScore: 70, maxScore: 79.99, grade: '2', remark: 'Higher' },
      { minScore: 65, maxScore: 69.99, grade: '3', remark: 'High' },
      { minScore: 60, maxScore: 64.99, grade: '4', remark: 'High Average' },
      { minScore: 55, maxScore: 59.99, grade: '5', remark: 'Average' },
      { minScore: 50, maxScore: 54.99, grade: '6', remark: 'Low Average' },
      { minScore: 45, maxScore: 49.99, grade: '7', remark: 'Lower' },
      { minScore: 40, maxScore: 44.99, grade: '8', remark: 'Lowest' },
      { minScore: 0, maxScore: 39.99, grade: '9', remark: 'Fail' }
    ]
  },
  {
    id: 'gs-3',
    department: 'Senior High School',
    systemName: 'SHS 9-Point Grading Scale (WASSCE Standard)',
    academicYear: '2025-2026',
    term: 'Third Term',
    bands: [
      { minScore: 80, maxScore: 100, grade: 'A1', remark: 'Excellent' },
      { minScore: 70, maxScore: 79.99, grade: 'B2', remark: 'Very Good' },
      { minScore: 65, maxScore: 69.99, grade: 'B3', remark: 'Good' },
      { minScore: 60, maxScore: 64.99, grade: 'C4', remark: 'Credit' },
      { minScore: 55, maxScore: 59.99, grade: 'C5', remark: 'Credit' },
      { minScore: 50, maxScore: 54.99, grade: 'C6', remark: 'Credit' },
      { minScore: 45, maxScore: 49.99, grade: 'D7', remark: 'Pass' },
      { minScore: 40, maxScore: 44.99, grade: 'E8', remark: 'Pass' },
      { minScore: 0, maxScore: 39.99, grade: 'F9', remark: 'Fail' }
    ]
  }
];

export const INITIAL_SCORE_CONVERSIONS: ScoreConversionItem[] = [
  { id: 'sc-1', academicYear: '2025-2026', term: 'Third Term', department: 'Junior High School', classScoreWeight: 40, examScoreWeight: 60, description: 'Standard SBA 40% + Terminal Exam 60%' },
  { id: 'sc-2', academicYear: '2025-2026', term: 'Third Term', department: 'Primary School', classScoreWeight: 30, examScoreWeight: 70, description: 'Primary Class Work 30% + Exam 70%' },
  { id: 'sc-3', academicYear: '2025-2026', term: 'Third Term', department: 'Pre-School / Kindergarten', classScoreWeight: 50, examScoreWeight: 50, description: 'Continuous assessment 50% + Term Assessment 50%' },
  { id: 'sc-shs', academicYear: '2025-2026', term: 'Third Term', department: 'Senior High School', classScoreWeight: 30, examScoreWeight: 70, description: 'SHS Term Work 30% + Terminal Exam 70%' }
];

export default function ExaminationManager({
  activeModule,
  students,
  reports: initialReports,
  onUpdateReports,
  onNavigate,
  subjects
}: ExaminationManagerProps) {
  const [reportsList, setReportsList] = useState<TermReport[]>(initialReports);
  const [gradingScales, setGradingScales] = useState<GradingScaleItem[]>(INITIAL_GRADING_SCALES);
  const [scoreConversions, setScoreConversions] = useState<ScoreConversionItem[]>(INITIAL_SCORE_CONVERSIONS);

  const subjectList = subjects && subjects.length > 0 ? subjects.map(s => s.name) : [
    'Mathematics',
    'English Language',
    'Integrated Science',
    'Social Studies',
    'ICT / Computing',
    'Creative Arts',
    'Religious & Moral Edu.'
  ];

  // Result entry state
  const [examClass, setExamClass] = useState('Basic 1');
  const [examSubject, setExamSubject] = useState('Mathematics');
  const [isExamLoaded, setIsExamLoaded] = useState(true);
  const [examScoresInput, setExamScoresInput] = useState<Record<string, { classScore: number; examScore: number }>>({});
  const [examSaveToast, setExamSaveToast] = useState(false);

  // Report Sheets view state
  const [selectedReportClass, setSelectedReportClass] = useState('Basic 1');
  const [viewingStudentReport, setViewingStudentReport] = useState<TermReport | null>(null);

  // Score Approvals State
  const [scoreApprovals, setScoreApprovals] = useState<ScoreApprovalRecord[]>(() => getStoredScoreApprovals());
  const [approvalToast, setApprovalToast] = useState<string | null>(null);
  
  const [showTestimonialModal, setShowTestimonialModal] = useState(false);
  const [testimonialData, setTestimonialData] = useState({ student: null as Student | null, highlight: '', refs: '' });

  const generateTranscriptPdf = (student: Student) => {
    const studentReports = reportsList.filter(r => r.studentId === student.id || r.admissionNo === student.admissionNo);
    const doc = new jsPDF();
    doc.text(`Official Academic Transcript: ${student.fullName}`, 14, 15);
    
    const tableData = studentReports.flatMap(r => 
      (r.scores || []).map(s => [r.term, s.subject, s.grade, s.total])
    );
    
    (doc as any).autoTable({
      head: [['Term', 'Subject', 'Grade', 'Score']],
      body: tableData,
      startY: 25,
    });
    
    doc.save(`Transcript_${student.fullName.replace(/\s+/g, '_')}.pdf`);
  };

  const generateTestimonialPdf = () => {
    if (!testimonialData.student) return;
    const doc = new jsPDF();
    doc.text(`Testimonial: ${testimonialData.student.fullName}`, 14, 15);
    doc.text(`Highlight: ${testimonialData.highlight}`, 14, 25);
    doc.text(`References: ${testimonialData.refs}`, 14, 35);
    doc.save(`Testimonial_${testimonialData.student.fullName.replace(/\s+/g, '_')}.pdf`);
    setShowTestimonialModal(false);
  };

  useEffect(() => {
    const unsub = subscribeScoreApprovals((items) => {
      setScoreApprovals(items);
    });
    return () => unsub();
  }, []);

  const triggerApprovalToast = (msg: string) => {
    setApprovalToast(msg);
    setTimeout(() => setApprovalToast(null), 3500);
  };

  const handleApprove = async (approval: ScoreApprovalRecord) => {
    try {
      const updated: ScoreApprovalRecord = {
        ...approval,
        status: 'Approved',
        reviewedAt: new Date().toISOString(),
        reviewedBy: 'Administrator',
        reviewComments: 'Endorsed & Approved'
      };
      await saveScoreApproval(updated);
      triggerApprovalToast(`✓ Scores for ${approval.className} (${approval.subjectName}) endorsed and approved!`);
    } catch (e: any) {
      alert('Error approving scores: ' + e.message);
    }
  };

  const handleRevision = async (approval: ScoreApprovalRecord) => {
    const reason = prompt('Enter notes or instructions for revision request:', 'Incomplete SBA class tasks or score adjustments needed');
    if (!reason) return;
    try {
      const updated: ScoreApprovalRecord = {
        ...approval,
        status: 'Revision Requested',
        reviewedAt: new Date().toISOString(),
        reviewedBy: 'Administrator',
        reviewComments: reason
      };
      await saveScoreApproval(updated);
      triggerApprovalToast(`Revision requested for ${approval.className} (${approval.subjectName}).`);
    } catch (e: any) {
      alert('Error requesting revision: ' + e.message);
    }
  };

  // Modals for Grading System & Score Conversion
  const [showAddGradingModal, setShowAddGradingModal] = useState(false);
  const [editingGrading, setEditingGrading] = useState<GradingScaleItem | null>(null);

  const [showAddConversionModal, setShowAddConversionModal] = useState(false);
  const [editingConversion, setEditingConversion] = useState<ScoreConversionItem | null>(null);

  // Conversion Form state
  const [convDept, setConvDept] = useState('Primary School');
  const [convClassWeight, setConvClassWeight] = useState(40);
  const [convExamWeight, setConvExamWeight] = useState(60);
  const [convDesc, setConvDesc] = useState('');

  // Grading Form State
  const [gradeSystemName, setGradeSystemName] = useState('Custom Grading Scale');
  const [gradeDept, setGradeDept] = useState('Primary School');

  // Compute Grade Function
  const computeGrade = (total: number, isJhs: boolean = false) => {
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

  // Filter students for result entry
  const activeClassStudents = students.filter(s => s.className === examClass);
  const displayStudents = activeClassStudents.length > 0 ? activeClassStudents : students;

  // Auto-populate score inputs for active students whenever class or subject changes
  React.useEffect(() => {
    const derived: Record<string, { classScore: number; examScore: number }> = {};
    displayStudents.forEach(st => {
      const rep = reportsList.find(r => r.studentId === st.id || r.admissionNo === st.admissionNo);
      const scoreObj = rep?.scores?.find(s => s.subject.toLowerCase() === examSubject.toLowerCase());
      if (scoreObj) {
        derived[st.id] = { classScore: scoreObj.classScore, examScore: scoreObj.examScore };
      } else {
        derived[st.id] = { classScore: 28, examScore: 56 };
      }
    });
    setExamScoresInput(derived);
  }, [examClass, examSubject, displayStudents.length]);

  // Save All Results
  const handleSaveAllResults = () => {
    const isJhs = examClass.includes('JHS');
    const updated = reportsList.map(r => {
      const matchedStudent = displayStudents.find(s => s.id === r.studentId || s.admissionNo === r.admissionNo);
      if (!matchedStudent) return r;

      const scores = examScoresInput[matchedStudent.id] || { classScore: 28, examScore: 56 };
      const total = Math.min(100, (scores.classScore || 0) + (scores.examScore || 0));
      const { grade, remark } = computeGrade(total, isJhs);

      const subjList = r.scores || [];
      const subjIndex = subjList.findIndex(sub => sub.subject.toLowerCase() === examSubject.toLowerCase());
      let newScores = [...subjList];
      if (subjIndex >= 0) {
        newScores[subjIndex] = {
          ...newScores[subjIndex],
          classScore: scores.classScore,
          examScore: scores.examScore,
          total: total,
          grade: grade,
          remark: remark
        };
      } else {
        newScores.push({
          subject: examSubject,
          classScore: scores.classScore,
          examScore: scores.examScore,
          total: total,
          grade: grade,
          remark: remark
        });
      }

      const newTotal = newScores.reduce((acc, s) => acc + (s.total || 0), 0);
      return {
        ...r,
        scores: newScores,
        totalScore: newTotal,
        averageScore: Number(((newTotal ?? 0) / Math.max(1, newScores.length)).toFixed(1))
      };
    });

    setReportsList(updated);
    if (onUpdateReports) onUpdateReports(updated);
    setExamSaveToast(true);
    setTimeout(() => setExamSaveToast(false), 3500);
  };

  // Save Conversion
  const handleSaveConversion = (e: React.FormEvent) => {
    e.preventDefault();
    if (convClassWeight + convExamWeight !== 100) {
      alert("Class Score Weight + Exam Score Weight must equal exactly 100%");
      return;
    }

    if (editingConversion) {
      setScoreConversions(prev => prev.map(c => c.id === editingConversion.id ? {
        ...c,
        department: convDept,
        classScoreWeight: convClassWeight,
        examScoreWeight: convExamWeight,
        description: convDesc || `Class ${convClassWeight}% + Exam ${convExamWeight}%`
      } : c));
      setEditingConversion(null);
    } else {
      const newConv: ScoreConversionItem = {
        id: `sc-${Date.now()}`,
        academicYear: '2025-2026',
        term: 'Third Term',
        department: convDept,
        classScoreWeight: convClassWeight,
        examScoreWeight: convExamWeight,
        description: convDesc || `Class ${convClassWeight}% + Exam ${convExamWeight}%`
      };
      setScoreConversions(prev => [newConv, ...prev]);
      setShowAddConversionModal(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. GRADING SYSTEM MODULE */}
      {(activeModule === 'exam_grading_system' || activeModule === 'exam_grading_systems' || activeModule === 'grading_system') && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
          <div className="flex flex-wrap justify-between items-center gap-3 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <Award className="w-5 h-5 text-indigo-600" />
                Examination Grading Systems & Stanine Scales
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Official the regionian GES and WAEC grading scales (A-F for Primary, 1-9 Stanine for Junior High School).
              </p>
            </div>
            <button
              onClick={() => setShowAddGradingModal(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Grading System
            </button>
          </div>

          <div className="space-y-6">
            {gradingScales.map((scale) => (
              <div key={scale.id} className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                <div className="bg-slate-900 text-white px-5 py-3.5 flex flex-wrap justify-between items-center gap-2">
                  <div>
                    <h4 className="font-bold text-sm text-amber-300">{scale.systemName}</h4>
                    <p className="text-[10px] text-slate-300">{scale.department} • {scale.academicYear} ({scale.term})</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => alert(`Editing grading criteria for ${scale.systemName}`)}
                      className="p-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                      title="Edit Scale"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setGradingScales(prev => prev.filter(s => s.id !== scale.id))}
                      className="p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                      title="Delete Scale"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs whitespace-nowrap">
                    <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] font-bold">
                      <tr>
                        <th className="p-3">Min Score</th>
                        <th className="p-3">Max Score</th>
                        <th className="p-3 text-center">Grade</th>
                        <th className="p-3">Official Remark</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {scale.bands.map((band, bIdx) => (
                        <tr key={bIdx} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 font-mono font-bold">{(band.minScore ?? 0).toFixed(2)}</td>
                          <td className="p-3 font-mono font-bold">{(band.maxScore ?? 0).toFixed(2)}</td>
                          <td className="p-3 text-center font-bold">
                            <span className="bg-indigo-100 text-indigo-800 px-2.5 py-0.5 rounded text-xs">
                              {band.grade}
                            </span>
                          </td>
                          <td className="p-3 font-semibold text-slate-700">{band.remark}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. SCORE CONVERSION MODULE */}
      {(activeModule === 'exam_score_conversion' || activeModule === 'score_conversion') && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
          <div className="flex flex-wrap justify-between items-center gap-3 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <Percent className="w-5 h-5 text-indigo-600" />
                Continuous Assessment & Score Conversion Formulas
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure class work and terminal exam weights per department (e.g. 40% Class SBA + 60% Exam).
              </p>
            </div>
            <button
              onClick={() => {
                setEditingConversion(null);
                setConvDept('Primary School');
                setConvClassWeight(40);
                setConvExamWeight(60);
                setConvDesc('');
                setShowAddConversionModal(true);
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Score Conversion
            </button>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-900 text-white uppercase text-[10px] font-bold">
                <tr>
                  <th className="p-3">#</th>
                  <th className="p-3">Department</th>
                  <th className="p-3">Academic Session</th>
                  <th className="p-3 text-center">Class Score Weight (%)</th>
                  <th className="p-3 text-center">Exam Score Weight (%)</th>
                  <th className="p-3">Formula Description</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {scoreConversions.map((conv, idx) => (
                  <tr key={conv.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-mono text-slate-400">{idx + 1}</td>
                    <td className="p-3 font-bold text-slate-900">{conv.department}</td>
                    <td className="p-3 font-mono text-slate-600">{conv.academicYear} • {conv.term}</td>
                    <td className="p-3 text-center font-mono font-bold text-indigo-700">{conv.classScoreWeight}%</td>
                    <td className="p-3 text-center font-mono font-bold text-purple-700">{conv.examScoreWeight}%</td>
                    <td className="p-3 text-slate-600">{conv.description}</td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => {
                            setEditingConversion(conv);
                            setConvDept(conv.department);
                            setConvClassWeight(conv.classScoreWeight);
                            setConvExamWeight(conv.examScoreWeight);
                            setConvDesc(conv.description || '');
                            setShowAddConversionModal(true);
                          }}
                          className="p-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setScoreConversions(prev => prev.filter(c => c.id !== conv.id))}
                          className="p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

      {/* 3. ENTER RESULTS MODULE */}
      {(activeModule === 'exam_enter_results' || activeModule === 'enter_results') && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
          <div className="flex flex-wrap justify-between items-center gap-3 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-indigo-600" />
                Score & Grade Entry Terminal
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Input raw continuous assessment and terminal examination marks with automated total, Stanine grade, and remark calculation.
              </p>
            </div>
            {isExamLoaded && (
              <button
                onClick={handleSaveAllResults}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-2 cursor-pointer transition-colors"
              >
                <Save className="w-4 h-4" /> Save & Synchronize Results
              </button>
            )}
          </div>

          {examSaveToast && (
            <div className="bg-emerald-600 text-white px-4 py-3 rounded-xl text-xs font-bold flex items-center justify-between shadow-sm animate-fade-in">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Marks for {examSubject} ({examClass}) saved! Reports synchronized across Teacher, Accountant, and Student portals.
              </span>
              <button onClick={() => setExamSaveToast(false)} className="text-white font-black ml-4">✕</button>
            </div>
          )}

          {/* Selector Grid */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs items-end">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Academic Session</label>
              <input type="text" readOnly defaultValue="2025-2026 (Third Term)" className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-semibold" />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Class</label>
              <select
                value={examClass}
                onChange={(e) => {
                  setExamClass(e.target.value);
                  setIsExamLoaded(false);
                }}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-900"
              >
                <option value="Basic 1">Basic 1</option>
                <option value="Basic 2">Basic 2</option>
                <option value="Basic 3">Basic 3</option>
                <option value="Creche">Creche</option>
                <option value="JHS 1">JHS 1</option>
                <option value="JHS 2">JHS 2</option>
                <option value="JHS 3">JHS 3</option>
                <option value="SHS 1">SHS 1</option>
                <option value="SHS 2">SHS 2</option>
                <option value="SHS 3">SHS 3</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Subject</label>
              <select
                value={examSubject}
                onChange={(e) => {
                  setExamSubject(e.target.value);
                  setIsExamLoaded(false);
                }}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-indigo-700"
              >
                {subjectList.map(subj => (
                  <option key={subj} value={subj}>{subj}</option>
                ))}
              </select>
            </div>
            <div>
              <button
                onClick={() => setIsExamLoaded(true)}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-sm"
              >
                <Search className="w-4 h-4" /> Load Score Sheet
              </button>
            </div>
          </div>

          {/* Results Entry Table */}
          {isExamLoaded && (
            <div className="space-y-4">
              <div className="bg-slate-900 text-white p-4 rounded-xl flex flex-wrap justify-between items-center text-xs">
                <div>
                  <h4 className="font-bold text-sm text-amber-300">Class Marks Matrix: {examSubject} • {examClass}</h4>
                  <p className="text-slate-400">Class Assessment (/40) + End of Term Exam (/60) = 100% Total</p>
                </div>
                <button
                  onClick={handleSaveAllResults}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-sm cursor-pointer"
                >
                  💾 Save All Changes
                </button>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-x-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] font-bold">
                    <tr>
                      <th className="p-3">#</th>
                      <th className="p-3">Admission No</th>
                      <th className="p-3">Student Name</th>
                      <th className="p-3 text-center">Class Score (/40)</th>
                      <th className="p-3 text-center">Exam Score (/60)</th>
                      <th className="p-3 text-center">Total (/100)</th>
                      <th className="p-3 text-center">Grade</th>
                      <th className="p-3">Remark</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {displayStudents.map((st, idx) => {
                      const scores = examScoresInput[st.id] || { classScore: 28, examScore: 56 };
                      const total = Math.min(100, (scores.classScore || 0) + (scores.examScore || 0));
                      const isJhs = examClass.includes('JHS');
                      const { grade, remark } = computeGrade(total, isJhs);

                      return (
                        <tr key={st.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 font-mono text-slate-400">{idx + 1}</td>
                          <td className="p-3 font-mono font-bold text-indigo-700">{st.admissionNo}</td>
                          <td className="p-3 font-bold text-slate-900">{st.fullName}</td>
                          <td className="p-3 text-center">
                            <input
                              type="number"
                              min="0"
                              max="40"
                              value={scores.classScore}
                              onChange={(e) => {
                                const val = Math.min(40, Math.max(0, parseFloat(e.target.value) || 0));
                                setExamScoresInput(prev => ({
                                  ...prev,
                                  [st.id]: { ...scores, classScore: val }
                                }));
                              }}
                              className="w-20 px-2 py-1.5 border border-slate-300 rounded-lg text-center font-mono font-bold bg-white focus:ring-2 focus:ring-indigo-500"
                            />
                          </td>
                          <td className="p-3 text-center">
                            <input
                              type="number"
                              min="0"
                              max="60"
                              value={scores.examScore}
                              onChange={(e) => {
                                const val = Math.min(60, Math.max(0, parseFloat(e.target.value) || 0));
                                setExamScoresInput(prev => ({
                                  ...prev,
                                  [st.id]: { ...scores, examScore: val }
                                }));
                              }}
                              className="w-20 px-2 py-1.5 border border-slate-300 rounded-lg text-center font-mono font-bold bg-white focus:ring-2 focus:ring-indigo-500"
                            />
                          </td>
                          <td className="p-3 text-center font-mono font-black text-indigo-700 text-sm">
                            {total}
                          </td>
                          <td className="p-3 text-center">
                            <span className="bg-indigo-100 text-indigo-800 font-bold px-2.5 py-0.5 rounded text-xs">
                              {grade}
                            </span>
                          </td>
                          <td className="p-3 font-semibold text-slate-700">{remark}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. EXAM REPORT SHEETS MODULE */}
      {(activeModule === 'exam_report_sheets' || activeModule === 'exam_report_sheets_view' || activeModule === 'report_sheets') && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
          <div className="flex flex-wrap justify-between items-center gap-3 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                Terminal Examination Report Cards & Class Master Sheets
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Generate official Republic of the region Ministry of Education terminal reports with position, attendance, and remarks.
              </p>
            </div>
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Printer className="w-4 h-4" /> Print Class Report Cards
            </button>
          </div>

          {/* Class Filter */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-wrap gap-4 items-center text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Select Class</label>
              <select
                value={selectedReportClass}
                onChange={(e) => setSelectedReportClass(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-900"
              >
                <option value="Basic 1">Basic 1</option>
                <option value="Basic 2">Basic 2</option>
                <option value="Basic 3">Basic 3</option>
                <option value="Creche">Creche</option>
                <option value="JHS 1">JHS 1</option>
                <option value="JHS 2">JHS 2</option>
                <option value="JHS 3">JHS 3</option>
                <option value="SHS 1">SHS 1</option>
                <option value="SHS 2">SHS 2</option>
                <option value="SHS 3">SHS 3</option>
              </select>
            </div>
            <div className="pt-4 text-slate-500 font-medium">
              Academic Term: <strong>2025-2026 (Third Term)</strong>
            </div>
          </div>

          {/* Reports Summary Table */}
          <div className="border border-slate-200 rounded-xl overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-900 text-white uppercase text-[10px] font-bold">
                <tr>
                  <th className="p-3">#</th>
                  <th className="p-3">Admission No</th>
                  <th className="p-3">Student Full Name</th>
                  <th className="p-3 text-center">Subjects Tested</th>
                  <th className="p-3 text-center">Total Score</th>
                  <th className="p-3 text-center">Average (%)</th>
                  <th className="p-3 text-center">Position</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {reportsList.map((rep, idx) => (
                  <tr key={rep.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-mono text-slate-400">{idx + 1}</td>
                    <td className="p-3 font-mono font-bold text-indigo-700">{rep.admissionNo}</td>
                    <td className="p-3 font-bold text-slate-900">{rep.studentName}</td>
                    <td className="p-3 text-center font-mono">{rep.scores?.length || 7}</td>
                    <td className="p-3 text-center font-mono font-bold">{rep.totalScore || 574}</td>
                    <td className="p-3 text-center font-mono font-black text-emerald-700">{rep.averageScore || 82.0}%</td>
                    <td className="p-3 text-center">
                      <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded font-bold text-xs">
                        {rep.position || `${idx + 1}th`}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => setViewingStudentReport(rep)}
                        className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-2xs flex items-center gap-1 mx-auto cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" /> View Report Card
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* STUDENT REPORT CARD PREVIEW MODAL */}
      {viewingStudentReport && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8 border border-slate-200 space-y-6 my-8">
            {/* Header */}
            <div className="text-center border-b-2 border-slate-800 pb-4 flex flex-col items-center">
              <div className="text-xs font-black tracking-widest text-indigo-700 uppercase mb-2">Republic of the region • GES Accredited</div>
              <JIPASLogo size="md" className="mb-2" />
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">JOY INTERNATIONAL SCHOOL (JIPAS)</h2>
              <p className="text-xs text-slate-500">01 BP. 2364 • Kpéhénou N°1 Behind T-Oil Filling Station, and Hedzranawoe 4th Corner after Radio Maria, Lomé — Togo • Tel: (00228) 22 60 21 38 / 99 47 38 23 / 90 83 60 48 • joyjipas2002@gmail.com</p>
              <div className="inline-block bg-slate-900 text-white text-xs font-bold px-4 py-1 rounded-full mt-2 uppercase tracking-wider">
                Terminal Examination Report Card
              </div>
            </div>

            {/* Student Info Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200 font-medium">
              <div>Student: <strong className="text-slate-900">{viewingStudentReport.studentName}</strong></div>
              <div>Admission No: <strong className="font-mono text-indigo-700">{viewingStudentReport.admissionNo}</strong></div>
              <div>Class: <strong>{viewingStudentReport.className}</strong></div>
              <div>Academic Term: <strong>{viewingStudentReport.academicYear} ({viewingStudentReport.term})</strong></div>
              <div>Attendance: <strong>{viewingStudentReport.attendancePresent} / {viewingStudentReport.attendanceTotal} days</strong></div>
              <div>Position: <strong className="text-purple-700 font-bold">{viewingStudentReport.position}</strong></div>
            </div>
            
            <div className="flex gap-2 mt-3">
              <button onClick={() => {
                const student = students.find(s => s.fullName === viewingStudentReport.studentName);
                setTestimonialData({ student: student || null, highlight: '', refs: '' });
                setShowTestimonialModal(true);
              }} className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-[10px] font-bold hover:bg-indigo-700">
                <Award className="w-3 h-3" /> Testimonial
              </button>
              <button onClick={() => {
                const student = students.find(s => s.fullName === viewingStudentReport.studentName);
                if (student) generateTranscriptPdf(student);
              }} className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-[10px] font-bold hover:bg-emerald-700">
                <FileText className="w-3 h-3" /> Transcript
              </button>
            </div>
            
            {showTestimonialModal && (
              <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50">
                <div className="bg-white p-6 rounded-xl w-96 space-y-4">
                  <h3 className="font-bold">Generate Testimonial</h3>
                  <textarea placeholder="Academic Highlights" className="w-full border p-2 text-xs" onChange={e => setTestimonialData(prev => ({...prev, highlight: e.target.value}))} />
                  <textarea placeholder="Character References" className="w-full border p-2 text-xs" onChange={e => setTestimonialData(prev => ({...prev, refs: e.target.value}))} />
                  <div className="flex gap-2">
                    <button onClick={() => setShowTestimonialModal(false)} className="px-3 py-1 bg-slate-200 text-slate-800 rounded">Cancel</button>
                    <button onClick={generateTestimonialPdf} className="px-3 py-1 bg-indigo-600 text-white rounded">Generate PDF</button>
                  </div>
                </div>
              </div>
            )}



            {/* Marks Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-900 text-white uppercase text-[10px] font-bold">
                  <tr>
                    <th className="p-2.5">Subject</th>
                    <th className="p-2.5 text-center">Class (/40)</th>
                    <th className="p-2.5 text-center">Exam (/60)</th>
                    <th className="p-2.5 text-center">Total (/100)</th>
                    <th className="p-2.5 text-center">Grade</th>
                    <th className="p-2.5">Remark</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {viewingStudentReport.scores?.map((sc, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="p-2.5 font-bold text-slate-900">{sc.subject}</td>
                      <td className="p-2.5 text-center font-mono">{sc.classScore}</td>
                      <td className="p-2.5 text-center font-mono">{sc.examScore}</td>
                      <td className="p-2.5 text-center font-mono font-black text-indigo-700">{sc.total}</td>
                      <td className="p-2.5 text-center font-bold text-emerald-700">{sc.grade}</td>
                      <td className="p-2.5 text-slate-700">{sc.remark}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Teacher Remarks */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
              <div><strong>Class Teacher's Remark:</strong> <span className="text-slate-700">{viewingStudentReport.teacherComment || 'Satisfactory academic performance. Shows high commitment to learning.'}</span></div>
              <div><strong>Headmaster's Endorsement:</strong> <span className="text-slate-700">{viewingStudentReport.headmasterComment || 'Promoted. Keep maintaining this exceptional academic track record.'}</span></div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 print:hidden">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" /> Print Report Card
              </button>
              <button
                onClick={() => setViewingStudentReport(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD SCORE CONVERSION MODAL */}
      {(showAddConversionModal || editingConversion) && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Percent className="w-5 h-5 text-indigo-600" />
                {editingConversion ? 'Edit Score Conversion' : 'Add Score Conversion'}
              </h3>
              <button
                onClick={() => {
                  setShowAddConversionModal(false);
                  setEditingConversion(null);
                }}
                className="text-slate-400 hover:text-slate-700 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveConversion} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Department</label>
                <select
                  value={convDept}
                  onChange={(e) => setConvDept(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-semibold bg-white"
                >
                  <option value="Senior High School">Senior High School (SHS)</option>
                  <option value="Junior High School">Junior High School</option>
                  <option value="Primary School">Primary School</option>
                  <option value="Pre-School / Kindergarten">Pre-School / Kindergarten</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Class Score Weight (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={convClassWeight}
                    onChange={(e) => setConvClassWeight(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Exam Score Weight (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={convExamWeight}
                    onChange={(e) => setConvExamWeight(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description / Notes</label>
                <input
                  type="text"
                  value={convDesc}
                  onChange={(e) => setConvDesc(e.target.value)}
                  placeholder="e.g. Standard SBA 40% + Terminal Exam 60%"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddConversionModal(false);
                    setEditingConversion(null);
                  }}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-sm cursor-pointer"
                >
                  Save Formula
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* SCORE APPROVALS & ENDORSEMENTS */}
      {(activeModule === 'score_approvals' || activeModule === 'exam_score_approvals') && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
          {approvalToast && (
            <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-slate-700 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              {approvalToast}
            </div>
          )}

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Verification & Quality Control</span>
              <h3 className="text-lg font-black text-slate-900">Score Approvals & Grade Endorsements</h3>
              <p className="text-xs text-slate-500">
                Endorse teacher continuous assessments (30%) and terminal examination marks (70%)
              </p>
            </div>
          </div>

          {scoreApprovals.length === 0 ? (
            <div className="p-12 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-30 text-indigo-500" />
              <p className="text-xs font-bold text-slate-700">No score batches pending approval</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Faculty score submissions will be queued here for endorsement.</p>
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
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            approval.status === 'Approved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : approval.status === 'Revision Requested'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {approval.status}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {isPending && (
                              <>
                                <button
                                  onClick={() => handleApprove(approval)}
                                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-2xs cursor-pointer"
                                >
                                  Endorse & Approve
                                </button>
                                <button
                                  onClick={() => handleRevision(approval)}
                                  className="px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold cursor-pointer"
                                >
                                  Revision
                                </button>
                              </>
                            )}
                            {approval.status === 'Approved' && (
                              <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                                <Check className="w-3.5 h-3.5" /> Endorsed by {approval.reviewedBy || 'Admin'}
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
    </div>
  );
}

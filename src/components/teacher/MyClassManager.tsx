import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Users, 
  BookOpen, 
  FileSpreadsheet, 
  Upload, 
  Download, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertCircle, 
  Calendar, 
  Filter, 
  Sparkles, 
  Save, 
  UserCheck, 
  BarChart3, 
  Plus, 
  Eye, 
  RefreshCw, 
  FileText, 
  Check, 
  X, 
  ChevronRight,
  GraduationCap,
  Award,
  AlertTriangle,
  User
} from 'lucide-react';
import { Student, Teacher, TermReport, ScoreItem, StudentAttendanceRecord } from '../../types';
import { saveStudentAttendanceRecord, saveReport, saveAllReports, subscribeStudentAttendance } from '../../services/dbService';

interface MyClassManagerProps {
  teacher: Teacher;
  students: Student[];
  reports: TermReport[];
  academicYear: string;
  term: string;
  onRefreshReports?: () => void;
}

export default function MyClassManager({
  teacher,
  students = [],
  reports = [],
  academicYear,
  term,
  onRefreshReports
}: MyClassManagerProps) {
  // 1. Resolve Teacher's Assigned Classes
  const assignedClasses = useMemo(() => {
    const rawList: string[] = [];
    if (Array.isArray(teacher.classesTaught) && teacher.classesTaught.length > 0) {
      rawList.push(...teacher.classesTaught);
    }
    if (Array.isArray((teacher as any).classesAssigned) && (teacher as any).classesAssigned.length > 0) {
      rawList.push(...(teacher as any).classesAssigned);
    }
    if (Array.isArray((teacher as any).classesHandled) && (teacher as any).classesHandled.length > 0) {
      rawList.push(...(teacher as any).classesHandled);
    }

    const unique = Array.from(new Set(rawList.filter(Boolean)));

    // Fallback: If no assigned classes found on teacher record, derive from existing student classes or default list
    if (unique.length === 0) {
      const studentClasses = Array.from(new Set(students.map(s => s.className).filter(Boolean)));
      if (studentClasses.length > 0) return studentClasses;
      return ['Basic 1', 'Basic 2', 'Basic 3', 'Basic 4', 'Basic 5', 'Basic 6', 'JHS 1', 'JHS 2', 'JHS 3', 'SHS 1 Science'];
    }
    return unique;
  }, [teacher, students]);

  const [selectedClass, setSelectedClass] = useState<string>(() => assignedClasses[0] || 'Basic 1');
  const [activeTab, setActiveTab] = useState<'roster' | 'exam_records' | 'attendance'>('roster');

  // Ensure selectedClass remains valid if assignedClasses updates
  useEffect(() => {
    if (!assignedClasses.includes(selectedClass) && assignedClasses.length > 0) {
      setSelectedClass(assignedClasses[0]);
    }
  }, [assignedClasses, selectedClass]);

  // Filter students by selected class
  const classStudents = useMemo(() => {
    return students.filter(s => 
      s.className?.trim().toLowerCase() === selectedClass.trim().toLowerCase() ||
      (s as any).classId?.trim().toLowerCase() === selectedClass.trim().toLowerCase()
    );
  }, [students, selectedClass]);

  // Selected Student Profile Modal State
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
  const [searchRosterText, setSearchRosterText] = useState('');
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Filtered Roster
  const filteredRoster = useMemo(() => {
    if (!searchRosterText.trim()) return classStudents;
    const q = searchRosterText.toLowerCase();
    return classStudents.filter(s => 
      s.fullName?.toLowerCase().includes(q) ||
      s.admissionNo?.toLowerCase().includes(q) ||
      s.parentPhone?.includes(q) ||
      s.guardianContact?.includes(q)
    );
  }, [classStudents, searchRosterText]);

  // ---------------------------------------------------------------------------
  // EXAM / CLASS RECORDS STATE & HANDLERS
  // ---------------------------------------------------------------------------
  const availableSubjects = useMemo(() => {
    if (Array.isArray(teacher.subjectsTaught) && teacher.subjectsTaught.length > 0) {
      return teacher.subjectsTaught;
    }
    return [
      'Core Mathematics',
      'Integrated Science',
      'English Language',
      'Social Studies',
      'Information Technology',
      'Religious & Moral Education',
      'Creative Arts',
      'French'
    ];
  }, [teacher]);

  const [selectedSubject, setSelectedSubject] = useState<string>(() => availableSubjects[0] || 'Core Mathematics');
  const [assessmentFilter, setSelectedAssessmentFilter] = useState<'ALL' | 'CLASS_WORK' | 'HOMEWORK' | 'PROJECT_TEST' | 'EXAM'>('ALL');
  
  // Local score state grid map: studentId -> { classWork, homework, projectTest, examScore, remark }
  const [scoreInputs, setScoreInputs] = useState<Record<string, {
    classWork: number | '';
    homework: number | '';
    projectTest: number | '';
    examScore: number | '';
    remark: string;
  }>>({});

  const [isSavingScores, setIsSavingScores] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Initialize or populate scores when class, subject, or reports change
  useEffect(() => {
    const newInputs: Record<string, {
      classWork: number | '';
      homework: number | '';
      projectTest: number | '';
      examScore: number | '';
      remark: string;
    }> = {};

    classStudents.forEach(st => {
      // Find matching report for student
      const report = reports.find(r => 
        (r.studentId === st.id || r.admissionNo === st.admissionNo) &&
        r.academicYear === academicYear &&
        r.term === term
      );

      const subjectScore = report?.scores?.find(sc => sc.subject?.trim().toLowerCase() === selectedSubject.trim().toLowerCase());

      newInputs[st.id] = {
        classWork: subjectScore?.classWork !== undefined ? subjectScore.classWork : '',
        homework: subjectScore?.homework !== undefined ? subjectScore.homework : '',
        projectTest: subjectScore?.projectTest !== undefined ? subjectScore.projectTest : '',
        examScore: subjectScore?.examScore !== undefined ? subjectScore.examScore : '',
        remark: subjectScore?.remark || ''
      };
    });

    setScoreInputs(newInputs);
  }, [classStudents, selectedSubject, reports, academicYear, term]);

  const handleScoreChange = (studentId: string, field: 'classWork' | 'homework' | 'projectTest' | 'examScore' | 'remark', value: any) => {
    setScoreInputs(prev => {
      const current = prev[studentId] || { classWork: '', homework: '', projectTest: '', examScore: '', remark: '' };
      let updatedValue = value;

      if (field !== 'remark') {
        if (value === '') {
          updatedValue = '';
        } else {
          const num = Number(value);
          if (isNaN(num)) return prev;
          // Apply max threshold boundaries
          if (field === 'classWork' && num > 10) updatedValue = 10;
          else if (field === 'homework' && num > 10) updatedValue = 10;
          else if (field === 'projectTest' && num > 20) updatedValue = 20;
          else if (field === 'examScore' && num > 60) updatedValue = 60;
          else if (num < 0) updatedValue = 0;
          else updatedValue = num;
        }
      }

      return {
        ...prev,
        [studentId]: {
          ...current,
          [field]: updatedValue
        }
      };
    });
  };

  const calculateGrade = (total: number) => {
    if (total >= 80) return { grade: '1', remark: 'Higher / Excellent' };
    if (total >= 70) return { grade: '2', remark: 'Very Good' };
    if (total >= 65) return { grade: '3', remark: 'Good' };
    if (total >= 60) return { grade: '4', remark: 'Credit' };
    if (total >= 55) return { grade: '5', remark: 'Credit' };
    if (total >= 50) return { grade: '6', remark: 'Average Pass' };
    if (total >= 45) return { grade: '7', remark: 'Pass' };
    if (total >= 40) return { grade: '8', remark: 'Weak Pass' };
    return { grade: '9', remark: 'Fail / Needs Support' };
  };

  // Batch Save Scores
  const handleSaveClassScores = async () => {
    setIsSavingScores(true);
    try {
      const updatedReportsList: TermReport[] = [];

      for (const st of classStudents) {
        const input = scoreInputs[st.id] || { classWork: '', homework: '', projectTest: '', examScore: '', remark: '' };

        const cw = Number(input.classWork) || 0;
        const hw = Number(input.homework) || 0;
        const pt = Number(input.projectTest) || 0;
        const ex = Number(input.examScore) || 0;
        const total = Math.min(100, Math.round(cw + hw + pt + ex));

        const { grade, remark: autoRemark } = calculateGrade(total);

        // Find existing report or assemble new report object
        let existingReport = reports.find(r => 
          (r.studentId === st.id || r.admissionNo === st.admissionNo) &&
          r.academicYear === academicYear &&
          r.term === term
        );

        if (!existingReport) {
          existingReport = {
            id: `rep_${st.id}_${academicYear.replace(/\s+/g, '')}_${term.replace(/\s+/g, '')}`,
            studentId: st.id,
            studentName: st.fullName,
            admissionNo: st.admissionNo,
            className: selectedClass,
            academicYear: academicYear,
            term: term,
            attendancePresent: 0,
            attendanceTotal: 60,
            conduct: 'Satisfactory',
            attitude: 'Good',
            interest: 'High',
            teacherComment: 'Good effort in class.',
            headmasterComment: 'Promising performance.',
            scores: [],
            totalScore: 0,
            averageScore: 0,
            position: '1st'
          };
        }

        // Update or append subject score item
        const scoresCopy = Array.isArray(existingReport.scores) ? [...existingReport.scores] : [];
        const subjIdx = scoresCopy.findIndex(s => s.subject?.trim().toLowerCase() === selectedSubject.trim().toLowerCase());

        const updatedScoreItem: ScoreItem = {
          subject: selectedSubject,
          classWork: cw,
          homework: hw,
          projectTest: pt,
          classScore: cw + hw + pt,
          examScore: ex,
          total: total,
          grade: grade,
          remark: input.remark || autoRemark
        };

        if (subjIdx !== -1) {
          scoresCopy[subjIdx] = updatedScoreItem;
        } else {
          scoresCopy.push(updatedScoreItem);
        }

        // Recalculate student overall total and average
        const totalSum = scoresCopy.reduce((acc, curr) => acc + (curr.total || 0), 0);
        const avgScore = scoresCopy.length > 0 ? Math.round((totalSum / scoresCopy.length) * 10) / 10 : 0;

        const updatedReport: TermReport = {
          ...existingReport,
          scores: scoresCopy,
          totalScore: totalSum,
          averageScore: avgScore
        };

        updatedReportsList.push(updatedReport);
        await saveReport(updatedReport);
      }

      if (onRefreshReports) onRefreshReports();
      showToast(`Successfully saved ${selectedSubject} scores for ${classStudents.length} students in ${selectedClass}!`, 'success');
    } catch (err: any) {
      showToast(`Error saving class exam scores: ${err.message || 'Unknown error'}`, 'error');
    } finally {
      setIsSavingScores(false);
    }
  };

  // CSV Template Generation
  const handleDownloadCsvTemplate = () => {
    const headers = ['Admission No', 'Student Name', 'Class Work (Max 10)', 'Homework (Max 10)', 'Project/Test (Max 20)', 'Exam Score (Max 60)', 'Remarks'];
    const rows = classStudents.map(s => {
      const input = scoreInputs[s.id] || { classWork: '', homework: '', projectTest: '', examScore: '', remark: '' };
      return [
        `"${s.admissionNo}"`,
        `"${s.fullName}"`,
        input.classWork ?? '',
        input.homework ?? '',
        input.projectTest ?? '',
        input.examScore ?? '',
        `"${input.remark || ''}"`
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${selectedClass.replace(/\s+/g, '_')}_${selectedSubject.replace(/\s+/g, '_')}_Exam_Template.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Downloaded CSV score template for ${selectedClass} - ${selectedSubject}`, 'info');
  };

  // CSV File Import Parser
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) return;

        const lines = text.split(/\r\n|\n/);
        if (lines.length <= 1) {
          showToast('Uploaded CSV file appears to be empty.', 'error');
          return;
        }

        let importedCount = 0;
        const updatedInputs = { ...scoreInputs };

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          // Simple CSV line splitter considering quotes
          const cols = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(',');
          if (cols.length < 2) continue;

          const rawAdm = cols[0]?.replace(/"/g, '').trim();
          const rawName = cols[1]?.replace(/"/g, '').trim();
          const cwVal = cols[2] !== undefined ? Number(cols[2].replace(/"/g, '').trim()) : '';
          const hwVal = cols[3] !== undefined ? Number(cols[3].replace(/"/g, '').trim()) : '';
          const ptVal = cols[4] !== undefined ? Number(cols[4].replace(/"/g, '').trim()) : '';
          const exVal = cols[5] !== undefined ? Number(cols[5].replace(/"/g, '').trim()) : '';
          const remVal = cols[6] ? cols[6].replace(/"/g, '').trim() : '';

          // Match student by Admission No or Full Name
          const matched = classStudents.find(s => 
            (rawAdm && s.admissionNo?.toLowerCase() === rawAdm.toLowerCase()) ||
            (rawName && s.fullName?.toLowerCase() === rawName.toLowerCase())
          );

          if (matched) {
            updatedInputs[matched.id] = {
              classWork: !isNaN(Number(cwVal)) && cwVal !== '' ? Math.min(10, Math.max(0, Number(cwVal))) : '',
              homework: !isNaN(Number(hwVal)) && hwVal !== '' ? Math.min(10, Math.max(0, Number(hwVal))) : '',
              projectTest: !isNaN(Number(ptVal)) && ptVal !== '' ? Math.min(20, Math.max(0, Number(ptVal))) : '',
              examScore: !isNaN(Number(exVal)) && exVal !== '' ? Math.min(60, Math.max(0, Number(exVal))) : '',
              remark: remVal || ''
            };
            importedCount++;
          }
        }

        setScoreInputs(updatedInputs);
        showToast(`Successfully imported scores for ${importedCount} students from CSV file!`, 'success');
      } catch (err) {
        showToast('Error parsing CSV file. Please verify CSV column format.', 'error');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ---------------------------------------------------------------------------
  // CLASS ATTENDANCE REGISTER STATE & HANDLERS
  // ---------------------------------------------------------------------------
  const [attendanceDate, setAttendanceDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [attendanceSession, setAttendanceSession] = useState<'Morning Roll Call' | 'Afternoon Roll Call'>('Morning Roll Call');
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, 'Present' | 'Late' | 'Absent' | 'Excused'>>({});
  const [isSavingAttendance, setIsSavingAttendance] = useState(false);

  // Load existing attendance register for selected date & class
  useEffect(() => {
    const handleSync = () => {
      try {
        const rawLocal = localStorage.getItem('jipas_student_attendance');
        if (rawLocal) {
          const list: StudentAttendanceRecord[] = JSON.parse(rawLocal);
          const found = list.find(r => r.className === selectedClass && r.date === attendanceDate);
          if (found && found.records) {
            setAttendanceRecords(found.records);
            return;
          }
        }
      } catch {}

      // Default: set all students to 'Present'
      const initMap: Record<string, 'Present' | 'Late' | 'Absent' | 'Excused'> = {};
      classStudents.forEach(st => {
        initMap[st.id] = 'Present';
      });
      setAttendanceRecords(initMap);
    };

    handleSync();
  }, [selectedClass, attendanceDate, classStudents]);

  const handleSetAllAttendance = (status: 'Present' | 'Absent' | 'Late' | 'Excused') => {
    const updated: Record<string, 'Present' | 'Late' | 'Absent' | 'Excused'> = {};
    classStudents.forEach(st => {
      updated[st.id] = status;
    });
    setAttendanceRecords(updated);
  };

  const handleStudentAttendanceChange = (studentId: string, status: 'Present' | 'Late' | 'Absent' | 'Excused') => {
    setAttendanceRecords(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  const handleSaveClassAttendance = async () => {
    setIsSavingAttendance(true);
    try {
      const recordItem: StudentAttendanceRecord = {
        id: `att-${selectedClass.replace(/\s+/g, '')}-${attendanceDate}`,
        date: attendanceDate,
        className: selectedClass,
        records: attendanceRecords,
        updatedAt: new Date().toISOString(),
        updatedBy: teacher.name || (teacher as any).fullName || 'Teacher'
      };

      await saveStudentAttendanceRecord(recordItem);
      showToast(`Saved ${selectedClass} class attendance for ${attendanceDate} (${Object.keys(attendanceRecords).length} students)!`, 'success');
    } catch (err: any) {
      showToast(`Failed to save class attendance: ${err.message || 'Error'}`, 'error');
    } finally {
      setIsSavingAttendance(false);
    }
  };

  // Attendance summary metrics
  const attendanceStats = useMemo(() => {
    let present = 0, late = 0, absent = 0, excused = 0;
    Object.values(attendanceRecords).forEach(val => {
      if (val === 'Present') present++;
      else if (val === 'Late') late++;
      else if (val === 'Absent') absent++;
      else if (val === 'Excused') excused++;
    });
    const total = classStudents.length || 1;
    const rate = Math.round(((present + late) / total) * 100);
    return { present, late, absent, excused, total: classStudents.length, rate };
  }, [attendanceRecords, classStudents]);

  return (
    <div className="space-y-6">
      {/* Toast Banner */}
      {toastMessage && (
        <div className={`p-4 rounded-2xl border text-xs font-extrabold flex items-center justify-between gap-3 shadow-md transition-all ${
          toastMessage.type === 'success' ? 'bg-emerald-600 text-white border-emerald-500' :
          toastMessage.type === 'error' ? 'bg-rose-600 text-white border-rose-500' :
          'bg-indigo-600 text-white border-indigo-500'
        }`}>
          <div className="flex items-center gap-2">
            {toastMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0" />}
            {toastMessage.type === 'error' && <AlertCircle className="w-4 h-4 shrink-0" />}
            {toastMessage.type === 'info' && <Sparkles className="w-4 h-4 shrink-0" />}
            <span>{toastMessage.text}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="p-1 hover:bg-white/20 rounded-lg cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* HEADER & ASSIGNED CLASS SELECTOR */}
      <div className="bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg text-white">
              <GraduationCap className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                <span>My Assigned Classes & Classroom Hub</span>
              </h1>
              <p className="text-xs text-slate-400 font-medium">
                Manage student rosters, upload continuous assessment & exam marks, and take daily class attendance.
              </p>
            </div>
          </div>

          {/* Class Switcher Pill Dropdown */}
          <div className="flex items-center gap-2 bg-slate-800/80 p-2 rounded-2xl border border-slate-700">
            <span className="text-[11px] font-black uppercase text-indigo-400 shrink-0 pl-1">
              Assigned Class:
            </span>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="bg-slate-900 text-white font-extrabold text-xs px-3 py-1.5 rounded-xl border border-indigo-500/50 focus:outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer"
            >
              {assignedClasses.map(cls => (
                <option key={cls} value={cls}>
                  🏫 {cls}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tab Selection Bar */}
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            onClick={() => setActiveTab('roster')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'roster'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Class Roster ({classStudents.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('exam_records')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'exam_records'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Upload & Record Exam Marks</span>
          </button>

          <button
            onClick={() => setActiveTab('attendance')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'attendance'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <Clock className="w-4 h-4 text-amber-400" />
            <span>Class Attendance Register</span>
          </button>
        </div>
      </div>

      {/* =================================----------------------------------- */}
      {/* TAB 1: CLASS ROSTER & STUDENT PROFILES                                */}
      {/* =================================----------------------------------- */}
      {activeTab === 'roster' && (
        <div className="space-y-6">
          {/* Summary Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs flex items-center gap-3">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase block">Total Enrolled</span>
                <span className="text-xl font-black text-slate-900">{classStudents.length} Students</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs flex items-center gap-3">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                <UserCheck className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase block">Gender Split</span>
                <span className="text-sm font-black text-slate-900">
                  👦 {classStudents.filter(s => s.gender === 'Male').length} M / 👧 {classStudents.filter(s => s.gender === 'Female').length} F
                </span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs flex items-center gap-3">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase block">Today's Attendance</span>
                <span className="text-xl font-black text-emerald-600">{attendanceStats.rate}% Present</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs flex items-center gap-3">
              <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase block">Academic Year</span>
                <span className="text-sm font-black text-slate-900">{academicYear} ({term})</span>
              </div>
            </div>
          </div>

          {/* Roster Controls */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Search student name, admission no, or phone..."
                  value={searchRosterText}
                  onChange={(e) => setSearchRosterText(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <span className="text-xs font-extrabold text-slate-500">
                Displaying <span className="text-indigo-600 font-black">{filteredRoster.length}</span> students in {selectedClass}
              </span>
            </div>

            {/* Roster Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-100">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-extrabold text-[10px] uppercase border-b border-slate-100">
                    <th className="p-3">#</th>
                    <th className="p-3">Admission No</th>
                    <th className="p-3">Student Full Name</th>
                    <th className="p-3">Gender</th>
                    <th className="p-3">Guardian Contact</th>
                    <th className="p-3">DOB / Age</th>
                    <th className="p-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {filteredRoster.length > 0 ? (
                    filteredRoster.map((st, idx) => (
                      <tr key={st.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3 text-slate-400 font-bold text-[10px]">{idx + 1}</td>
                        <td className="p-3 font-mono font-extrabold text-indigo-700">{st.admissionNo}</td>
                        <td className="p-3 font-bold text-slate-900 flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-xs shrink-0">
                            {st.fullName ? st.fullName.charAt(0).toUpperCase() : 'S'}
                          </div>
                          <span>{st.fullName}</span>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                            st.gender === 'Male' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-pink-50 text-pink-700 border border-pink-100'
                          }`}>
                            {st.gender}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-slate-600">
                          {st.parentPhone || st.guardianContact || '--'}
                        </td>
                        <td className="p-3 text-slate-500 font-mono text-[11px]">
                          {st.dob || '--'}
                        </td>
                        <td className="p-3">
                          <button
                            onClick={() => setViewingStudent(st)}
                            className="px-3 py-1 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white rounded-xl text-[10px] font-extrabold transition-all cursor-pointer flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View Profile</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400 font-semibold space-y-1">
                        <Users className="w-8 h-8 text-slate-300 mx-auto" />
                        <p>No students found for class "{selectedClass}".</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =================================----------------------------------- */}
      {/* TAB 2: UPLOAD CLASS RECORDS & EXAM MARKS                             */}
      {/* =================================----------------------------------- */}
      {activeTab === 'exam_records' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <span>Upload & Record Marks for {selectedClass}</span>
              </h2>
              <p className="text-xs text-slate-500">
                Batch enter continuous assessments and end-of-term examination scores or import filled CSV records.
              </p>
            </div>

            {/* Subject Selector & Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-2xl border border-slate-200">
                <span className="text-[10px] font-black text-slate-500 uppercase">Subject:</span>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="bg-white text-xs font-bold text-slate-900 focus:outline-none cursor-pointer border border-slate-200 rounded-xl px-2 py-1"
                >
                  {availableSubjects.map(sub => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleDownloadCsvTemplate}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                title="Download CSV Template with enrolled students"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Download Template</span>
              </button>

              <label className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5 text-emerald-600" />
                <span>Upload CSV</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              <button
                onClick={handleSaveClassScores}
                disabled={isSavingScores}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold shadow-md shadow-indigo-600/30 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSavingScores ? 'Saving...' : 'Save Class Scores'}</span>
              </button>
            </div>
          </div>

          {/* Assessment Legend Note */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[10px] font-extrabold bg-indigo-50/50 p-3 rounded-2xl border border-indigo-100/60 text-indigo-950">
            <div>Class Work: <span className="text-indigo-600">Max 10</span></div>
            <div>Homework: <span className="text-indigo-600">Max 10</span></div>
            <div>Project/Test: <span className="text-indigo-600">Max 20</span></div>
            <div>Exam Score: <span className="text-indigo-600">Max 60</span></div>
            <div>Total Score: <span className="text-emerald-700">Max 100</span></div>
          </div>

          {/* Scores Entry Grid */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-extrabold text-[10px] uppercase border-b border-slate-200">
                  <th className="p-3">#</th>
                  <th className="p-3">Admission No</th>
                  <th className="p-3">Student Name</th>
                  <th className="p-3 text-center">Class Work (10)</th>
                  <th className="p-3 text-center">Homework (10)</th>
                  <th className="p-3 text-center">Project/Test (20)</th>
                  <th className="p-3 text-center">Exam Score (60)</th>
                  <th className="p-3 text-center">Total (100)</th>
                  <th className="p-3 text-center">Grade</th>
                  <th className="p-3">Remark</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {classStudents.length > 0 ? (
                  classStudents.map((st, idx) => {
                    const input = scoreInputs[st.id] || { classWork: '', homework: '', projectTest: '', examScore: '', remark: '' };
                    const cw = Number(input.classWork) || 0;
                    const hw = Number(input.homework) || 0;
                    const pt = Number(input.projectTest) || 0;
                    const ex = Number(input.examScore) || 0;
                    const total = Math.min(100, Math.round(cw + hw + pt + ex));
                    const { grade, remark: autoRemark } = calculateGrade(total);

                    return (
                      <tr key={st.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="p-3 text-slate-400 font-bold text-[10px]">{idx + 1}</td>
                        <td className="p-3 font-mono font-extrabold text-indigo-700">{st.admissionNo}</td>
                        <td className="p-3 font-bold text-slate-900">{st.fullName}</td>

                        {/* Class Work Input */}
                        <td className="p-2 text-center">
                          <input
                            type="number"
                            min="0"
                            max="10"
                            value={input.classWork}
                            onChange={(e) => handleScoreChange(st.id, 'classWork', e.target.value)}
                            placeholder="0-10"
                            className="w-16 px-2 py-1 text-center bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs font-bold focus:bg-white focus:ring-2 focus:ring-indigo-500"
                          />
                        </td>

                        {/* Homework Input */}
                        <td className="p-2 text-center">
                          <input
                            type="number"
                            min="0"
                            max="10"
                            value={input.homework}
                            onChange={(e) => handleScoreChange(st.id, 'homework', e.target.value)}
                            placeholder="0-10"
                            className="w-16 px-2 py-1 text-center bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs font-bold focus:bg-white focus:ring-2 focus:ring-indigo-500"
                          />
                        </td>

                        {/* Project / Test Input */}
                        <td className="p-2 text-center">
                          <input
                            type="number"
                            min="0"
                            max="20"
                            value={input.projectTest}
                            onChange={(e) => handleScoreChange(st.id, 'projectTest', e.target.value)}
                            placeholder="0-20"
                            className="w-16 px-2 py-1 text-center bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs font-bold focus:bg-white focus:ring-2 focus:ring-indigo-500"
                          />
                        </td>

                        {/* Exam Score Input */}
                        <td className="p-2 text-center">
                          <input
                            type="number"
                            min="0"
                            max="60"
                            value={input.examScore}
                            onChange={(e) => handleScoreChange(st.id, 'examScore', e.target.value)}
                            placeholder="0-60"
                            className="w-20 px-2 py-1 text-center bg-indigo-50/70 border border-indigo-200 rounded-xl font-mono text-xs font-extrabold text-indigo-900 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                          />
                        </td>

                        {/* Computed Total */}
                        <td className="p-3 text-center">
                          <span className={`font-mono text-xs font-black px-2.5 py-1 rounded-xl ${
                            total >= 80 ? 'bg-emerald-100 text-emerald-800' :
                            total >= 50 ? 'bg-indigo-100 text-indigo-800' :
                            total >= 40 ? 'bg-amber-100 text-amber-800' :
                            'bg-rose-100 text-rose-800'
                          }`}>
                            {total}
                          </span>
                        </td>

                        {/* Computed Grade */}
                        <td className="p-3 text-center">
                          <span className="font-extrabold text-xs text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                            {grade}
                          </span>
                        </td>

                        {/* Remark Input */}
                        <td className="p-2">
                          <input
                            type="text"
                            value={input.remark || autoRemark}
                            onChange={(e) => handleScoreChange(st.id, 'remark', e.target.value)}
                            placeholder={autoRemark}
                            className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500"
                          />
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-slate-400 font-semibold">
                      No students found in {selectedClass} to enter scores.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =================================----------------------------------- */}
      {/* TAB 3: CLASS ATTENDANCE REGISTER                                     */}
      {/* =================================----------------------------------- */}
      {activeTab === 'attendance' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-600" />
                <span>Class Attendance Register for {selectedClass}</span>
              </h2>
              <p className="text-xs text-slate-500">
                Mark daily attendance roll call for all assigned students in this classroom.
              </p>
            </div>

            {/* Date & Batch Controls */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-2xl border border-slate-200">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <input
                  type="date"
                  value={attendanceDate}
                  onChange={(e) => setAttendanceDate(e.target.value)}
                  className="bg-white font-mono text-xs font-bold text-slate-800 focus:outline-none cursor-pointer border border-slate-200 rounded-xl px-2 py-1"
                />
              </div>

              <button
                onClick={() => handleSetAllAttendance('Present')}
                className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Mark All Present
              </button>

              <button
                onClick={() => handleSetAllAttendance('Absent')}
                className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Mark All Absent
              </button>

              <button
                onClick={handleSaveClassAttendance}
                disabled={isSavingAttendance}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold shadow-md shadow-indigo-600/30 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSavingAttendance ? 'Saving...' : 'Save Register'}</span>
              </button>
            </div>
          </div>

          {/* Attendance Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-2xl text-center">
              <span className="text-[10px] font-black uppercase text-emerald-600 block">Present</span>
              <span className="text-lg font-black text-emerald-900">{attendanceStats.present}</span>
            </div>
            <div className="p-3 bg-amber-50 border border-amber-100 rounded-2xl text-center">
              <span className="text-[10px] font-black uppercase text-amber-600 block">Late</span>
              <span className="text-lg font-black text-amber-900">{attendanceStats.late}</span>
            </div>
            <div className="p-3 bg-rose-50 border border-rose-100 rounded-2xl text-center">
              <span className="text-[10px] font-black uppercase text-rose-600 block">Absent</span>
              <span className="text-lg font-black text-rose-900">{attendanceStats.absent}</span>
            </div>
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-2xl text-center">
              <span className="text-[10px] font-black uppercase text-blue-600 block">Excused</span>
              <span className="text-lg font-black text-blue-900">{attendanceStats.excused}</span>
            </div>
            <div className="p-3 bg-slate-900 text-white rounded-2xl text-center col-span-2 sm:col-span-1">
              <span className="text-[10px] font-black uppercase text-slate-400 block">Attendance Rate</span>
              <span className="text-lg font-black text-emerald-400">{attendanceStats.rate}%</span>
            </div>
          </div>

          {/* Attendance Register Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-extrabold text-[10px] uppercase border-b border-slate-200">
                  <th className="p-3">#</th>
                  <th className="p-3">Admission No</th>
                  <th className="p-3">Student Name</th>
                  <th className="p-3">Gender</th>
                  <th className="p-3">Attendance Status Selection</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {classStudents.length > 0 ? (
                  classStudents.map((st, idx) => {
                    const status = attendanceRecords[st.id] || 'Present';
                    return (
                      <tr key={st.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="p-3 text-slate-400 font-bold text-[10px]">{idx + 1}</td>
                        <td className="p-3 font-mono font-extrabold text-indigo-700">{st.admissionNo}</td>
                        <td className="p-3 font-bold text-slate-900">{st.fullName}</td>
                        <td className="p-3 text-slate-500 font-extrabold uppercase text-[10px]">{st.gender}</td>
                        <td className="p-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleStudentAttendanceChange(st.id, 'Present')}
                              className={`px-3 py-1 rounded-xl text-[10px] font-extrabold uppercase transition-all cursor-pointer ${
                                status === 'Present'
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              }`}
                            >
                              Present
                            </button>

                            <button
                              type="button"
                              onClick={() => handleStudentAttendanceChange(st.id, 'Late')}
                              className={`px-3 py-1 rounded-xl text-[10px] font-extrabold uppercase transition-all cursor-pointer ${
                                status === 'Late'
                                  ? 'bg-amber-600 text-white shadow-xs'
                                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                              }`}
                            >
                              Late
                            </button>

                            <button
                              type="button"
                              onClick={() => handleStudentAttendanceChange(st.id, 'Absent')}
                              className={`px-3 py-1 rounded-xl text-[10px] font-extrabold uppercase transition-all cursor-pointer ${
                                status === 'Absent'
                                  ? 'bg-rose-600 text-white shadow-xs'
                                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                              }`}
                            >
                              Absent
                            </button>

                            <button
                              type="button"
                              onClick={() => handleStudentAttendanceChange(st.id, 'Excused')}
                              className={`px-3 py-1 rounded-xl text-[10px] font-extrabold uppercase transition-all cursor-pointer ${
                                status === 'Excused'
                                  ? 'bg-blue-600 text-white shadow-xs'
                                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                              }`}
                            >
                              Excused
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400 font-semibold">
                      No students found in {selectedClass} for attendance registration.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* STUDENT DETAIL MODAL */}
      {viewingStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 font-black flex items-center justify-center text-lg">
                  {viewingStudent.fullName.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">{viewingStudent.fullName}</h3>
                  <p className="text-[11px] font-mono text-indigo-600">Admission No: {viewingStudent.admissionNo}</p>
                </div>
              </div>
              <button
                onClick={() => setViewingStudent(null)}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-0.5">
                <span className="text-[10px] font-black text-slate-400 uppercase block">Class / Department</span>
                <span className="font-bold text-slate-900">{viewingStudent.className}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-0.5">
                <span className="text-[10px] font-black text-slate-400 uppercase block">Gender</span>
                <span className="font-bold text-slate-900">{viewingStudent.gender}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-0.5">
                <span className="text-[10px] font-black text-slate-400 uppercase block">Date of Birth</span>
                <span className="font-bold text-slate-900">{viewingStudent.dob || '--'}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-0.5">
                <span className="text-[10px] font-black text-slate-400 uppercase block">Guardian Phone</span>
                <span className="font-bold text-slate-900 font-mono">{viewingStudent.parentPhone || viewingStudent.guardianContact || '--'}</span>
              </div>
            </div>

            <button
              onClick={() => setViewingStudent(null)}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer"
            >
              Close Student Details
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

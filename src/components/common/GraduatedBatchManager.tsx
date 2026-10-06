import React, { useState, useEffect, useMemo } from 'react';
import { 
  GraduationCap, 
  Search, 
  Plus, 
  Filter, 
  Edit3, 
  Trash2, 
  Eye, 
  Download, 
  Printer, 
  CheckCircle2, 
  AlertCircle, 
  School, 
  Calendar, 
  Award, 
  Users, 
  FileText, 
  Building2, 
  Sparkles, 
  X, 
  ChevronRight, 
  Phone, 
  BookOpen, 
  ShieldCheck,
  Check,
  Briefcase
} from 'lucide-react';
import { GraduatedStudentItem } from '../../types';
import { 
  getStoredGraduatedStudents, 
  saveGraduatedStudent, 
  deleteGraduatedStudent,
  subscribeGraduatedStudents,
  saveStoredGraduatedStudents,
  saveStoredGraduatedBatches
} from '../../services/dbService';
import BulkGraduatedImportModal from './BulkGraduatedImportModal';

interface GraduatedBatchManagerProps {
  userRole: 'admin' | 'secretary' | 'ceo' | 'director' | string;
  readOnly?: boolean;
  selectedCampus?: string;
}

export default function GraduatedBatchManager({
  userRole,
  readOnly = false,
  selectedCampus = 'General'
}: GraduatedBatchManagerProps) {
  // Can edit if admin or secretary AND not explicitly forced read-only
  const isEditable = !readOnly && (userRole === 'admin' || userRole === 'secretary');

  const [students, setStudents] = useState<GraduatedStudentItem[]>(() => getStoredGraduatedStudents());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>('All');
  const [selectedExamType, setSelectedExamType] = useState<string>('All');
  const [selectedPlacement, setSelectedPlacement] = useState<string>('All');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('All');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<GraduatedStudentItem | null>(null);
  const [viewingStudent, setViewingStudent] = useState<GraduatedStudentItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Form states
  const [formFullName, setFormFullName] = useState('');
  const [formAdmissionNo, setFormAdmissionNo] = useState('');
  const [formGender, setFormGender] = useState<'Male' | 'Female'>('Male');
  const [formDob, setFormDob] = useState('');
  const [formCompletionYear, setFormCompletionYear] = useState(new Date().getFullYear().toString());
  const [formExamType, setFormExamType] = useState<'BECE' | 'WASSCE'>('BECE');
  const [formCandidateIndexNo, setFormCandidateIndexNo] = useState('');
  const [formBecePlacement, setFormBecePlacement] = useState<'Placement' | 'Non-placement'>('Placement');
  const [formPlacedSchool, setFormPlacedSchool] = useState('');
  const [formPlacedProgramme, setFormPlacedProgramme] = useState('');
  const [formWassceProgramme, setFormWassceProgramme] = useState('General Science');
  const [formClassGraduated, setFormClassGraduated] = useState('Basic 9 A');
  const [formDepartment, setFormDepartment] = useState('Junior High School');
  const [formAggregate, setFormAggregate] = useState<string>('06');
  const [formParentName, setFormParentName] = useState('');
  const [formParentPhone, setFormParentPhone] = useState('');
  const [formCampus, setFormCampus] = useState<'JIPAS 1' | 'JIPAS 2'>('JIPAS 1');
  const [formRemarks, setFormRemarks] = useState('');

  // Subscribe to live updates
  useEffect(() => {
    const unsub = subscribeGraduatedStudents((items) => {
      if (items && items.length >= 0) {
        setStudents(items);
      }
    });
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  // Filter students
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      // Campus filter
      if (selectedCampus && selectedCampus !== 'General' && s.campus && s.campus !== selectedCampus) {
        return false;
      }
      // Year filter
      if (selectedYear !== 'All' && s.completionYear !== selectedYear) {
        return false;
      }
      // Exam Type filter
      if (selectedExamType !== 'All' && s.examType !== selectedExamType) {
        return false;
      }
      // Placement filter (only applies to BECE)
      if (selectedPlacement !== 'All') {
        if (s.examType !== 'BECE') return false;
        if (s.becePlacementStatus !== selectedPlacement) return false;
      }
      // Department filter
      if (selectedDepartment !== 'All' && s.department !== selectedDepartment) {
        return false;
      }
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = s.fullName.toLowerCase().includes(q);
        const matchIndex = s.candidateIndexNo.toLowerCase().includes(q);
        const matchAdm = s.admissionNo.toLowerCase().includes(q);
        const matchSchool = s.placedSchool?.toLowerCase().includes(q);
        const matchProg = (s.placedProgramme || s.wassceProgramme || '').toLowerCase().includes(q);
        return matchName || matchIndex || matchAdm || matchSchool || matchProg;
      }
      return true;
    });
  }, [students, selectedCampus, selectedYear, selectedExamType, selectedPlacement, selectedDepartment, searchQuery]);

  // Unique years for filtering
  const availableYears = useMemo(() => {
    const set = new Set<string>();
    students.forEach(s => {
      if (s.completionYear) set.add(s.completionYear);
    });
    const arr = Array.from(set).sort().reverse();
    if (arr.length === 0) arr.push('2025', '2024');
    return arr;
  }, [students]);

  // Analytics stats
  const stats = useMemo(() => {
    const total = filteredStudents.length;
    const beceList = filteredStudents.filter(s => s.examType === 'BECE');
    const wassceList = filteredStudents.filter(s => s.examType === 'WASSCE');
    const becePlaced = beceList.filter(s => s.becePlacementStatus === 'Placement').length;
    const beceNonPlaced = beceList.filter(s => s.becePlacementStatus === 'Non-placement').length;
    const placementRate = beceList.length > 0 ? Math.round((becePlaced / beceList.length) * 100) : 0;
    
    return {
      total,
      beceCount: beceList.length,
      wassceCount: wassceList.length,
      becePlaced,
      beceNonPlaced,
      placementRate
    };
  }, [filteredStudents]);

  const resetForm = () => {
    setEditingStudent(null);
    setFormFullName('');
    setFormAdmissionNo(`JIPAS/${new Date().getFullYear()}/${String(Math.floor(100 + Math.random() * 900))}`);
    setFormGender('Male');
    setFormDob('2009-01-01');
    setFormCompletionYear(new Date().getFullYear().toString());
    setFormExamType('BECE');
    setFormCandidateIndexNo(`1010${new Date().getFullYear().toString().slice(-2)}${String(Math.floor(1000 + Math.random() * 9000))}`);
    setFormBecePlacement('Placement');
    setFormPlacedSchool('');
    setFormPlacedProgramme('General Science');
    setFormWassceProgramme('General Science');
    setFormClassGraduated('Basic 9 A');
    setFormDepartment('Junior High School');
    setFormAggregate('06');
    setFormParentName('');
    setFormParentPhone('');
    setFormCampus('JIPAS 1');
    setFormRemarks('');
    setErrorMessage('');
  };

  const handleOpenAddModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (student: GraduatedStudentItem) => {
    setEditingStudent(student);
    setFormFullName(student.fullName);
    setFormAdmissionNo(student.admissionNo || '');
    setFormGender(student.gender || 'Male');
    setFormDob(student.dob || '');
    setFormCompletionYear(student.completionYear || new Date().getFullYear().toString());
    setFormExamType(student.examType || 'BECE');
    setFormCandidateIndexNo(student.candidateIndexNo || '');
    setFormBecePlacement(student.becePlacementStatus || 'Placement');
    setFormPlacedSchool(student.placedSchool || '');
    setFormPlacedProgramme(student.placedProgramme || '');
    setFormWassceProgramme(student.wassceProgramme || 'General Science');
    setFormClassGraduated(student.classGraduatedFrom || 'Basic 9 A');
    setFormDepartment(student.department || 'Junior High School');
    setFormAggregate(String(student.aggregate || '06'));
    setFormParentName(student.parentName || '');
    setFormParentPhone(student.parentPhone || '');
    setFormCampus((student.campus as any) || 'JIPAS 1');
    setFormRemarks(student.remarks || '');
    setErrorMessage('');
    setIsModalOpen(true);
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formFullName.trim()) {
      setErrorMessage('Student full name is required.');
      return;
    }
    if (!formCandidateIndexNo.trim()) {
      setErrorMessage("Candidate's Index Number is required.");
      return;
    }

    setIsSaving(true);
    setErrorMessage('');

    try {
      const studentId = editingStudent ? editingStudent.id : `grad-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      
      const newGraduatedStudent: GraduatedStudentItem = {
        id: studentId,
        admissionNo: formAdmissionNo.trim() || `ADM-${Date.now().toString().slice(-4)}`,
        fullName: formFullName.trim().toUpperCase(),
        gender: formGender,
        dob: formDob,
        completionYear: formCompletionYear,
        examType: formExamType,
        candidateIndexNo: formCandidateIndexNo.trim(),
        becePlacementStatus: formExamType === 'BECE' ? formBecePlacement : undefined,
        placedSchool: formExamType === 'BECE' && formBecePlacement === 'Placement' ? formPlacedSchool.trim() : undefined,
        placedProgramme: formExamType === 'BECE' && formBecePlacement === 'Placement' ? formPlacedProgramme.trim() : undefined,
        wassceProgramme: formExamType === 'WASSCE' ? formWassceProgramme.trim() : undefined,
        classGraduatedFrom: formClassGraduated.trim(),
        department: formDepartment,
        aggregate: formAggregate ? (isNaN(Number(formAggregate)) ? formAggregate : Number(formAggregate)) : undefined,
        parentName: formParentName.trim(),
        parentPhone: formParentPhone.trim(),
        campus: formCampus,
        status: formExamType === 'BECE' ? (formBecePlacement === 'Placement' ? 'Placed' : 'Pending Placement') : 'Higher Education',
        remarks: formRemarks.trim(),
        updatedAt: new Date().toISOString(),
        createdAt: editingStudent?.createdAt || new Date().toISOString()
      };

      await saveGraduatedStudent(newGraduatedStudent);
      
      // Update local state immediately
      setStudents(prev => {
        const idx = prev.findIndex(s => s.id === studentId);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = newGraduatedStudent;
          return next;
        }
        return [newGraduatedStudent, ...prev];
      });

      setSuccessMessage(editingStudent ? 'Graduated candidate details updated successfully!' : 'New graduated candidate registered successfully!');
      setTimeout(() => setSuccessMessage(''), 4000);
      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Error saving graduated student:', err);
      setErrorMessage(err?.message || 'Failed to save graduated student. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (student: GraduatedStudentItem) => {
    if (!isEditable) return;
    const confirmDelete = window.confirm(`Are you sure you want to remove the graduation record for ${student.fullName} (Index: ${student.candidateIndexNo})?`);
    if (!confirmDelete) return;

    try {
      await deleteGraduatedStudent(student.id);
      setStudents(prev => prev.filter(s => s.id !== student.id));
      setSuccessMessage(`Graduation record for ${student.fullName} has been removed.`);
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      console.error('Error deleting student:', err);
      alert('Failed to delete graduation record.');
    }
  };

  const handleClearAllGraduatedRecords = async () => {
    if (!isEditable) return;
    const confirmClear = window.confirm('Are you sure you want to PERMANENTLY clear all graduated candidate records? This action cannot be undone.');
    if (!confirmClear) return;

    try {
      saveStoredGraduatedStudents([]);
      saveStoredGraduatedBatches([]);
      setStudents([]);
      setSuccessMessage('All graduated candidate records have been permanently cleared.');
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      console.error('Error clearing graduated records:', err);
      alert('Failed to clear graduated candidate records.');
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (filteredStudents.length === 0) {
      alert('No graduated records to export.');
      return;
    }

    const headers = [
      'Full Name',
      'Gender',
      'Admission No',
      'Candidate Index No',
      'Year of Completion',
      'Exam Type',
      'BECE Placement Status',
      'Placed Senior High School',
      'Placed / WASSCE Programme',
      'Department Graduated From',
      'Class Graduated From',
      'Aggregate',
      'Parent / Guardian Name',
      'Parent Contact',
      'Campus',
      'Remarks'
    ];

    const rows = filteredStudents.map(s => [
      `"${s.fullName}"`,
      `"${s.gender}"`,
      `"${s.admissionNo}"`,
      `"${s.candidateIndexNo}"`,
      `"${s.completionYear}"`,
      `"${s.examType}"`,
      `"${s.examType === 'BECE' ? (s.becePlacementStatus || 'N/A') : 'N/A'}"`,
      `"${s.placedSchool || ''}"`,
      `"${s.placedProgramme || s.wassceProgramme || ''}"`,
      `"${s.department}"`,
      `"${s.classGraduatedFrom}"`,
      `"${s.aggregate || ''}"`,
      `"${s.parentName || ''}"`,
      `"${s.parentPhone || ''}"`,
      `"${s.campus || ''}"`,
      `"${(s.remarks || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `JIPAS_Graduated_Batch_${selectedYear}_${selectedExamType}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target?.result as string;
      if (!text) return;

      try {
        const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
        if (lines.length < 2) {
          alert('CSV file is empty or missing data rows.');
          return;
        }

        const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, '').toLowerCase());
        
        const colIndices = {
          fullName: headers.findIndex(h => h.includes('name') && !h.includes('parent') && !h.includes('guardian')),
          gender: headers.findIndex(h => h.includes('gender')),
          admissionNo: headers.findIndex(h => h.includes('admission') || h.includes('adm')),
          candidateIndexNo: headers.findIndex(h => h.includes('index') || h.includes('candidate')),
          completionYear: headers.findIndex(h => h.includes('year') || h.includes('completion')),
          examType: headers.findIndex(h => h.includes('exam')),
          becePlacementStatus: headers.findIndex(h => h.includes('placement')),
          placedSchool: headers.findIndex(h => h.includes('placed senior') || h.includes('placed school') || h.includes('school')),
          programme: headers.findIndex(h => h.includes('programme') || h.includes('program') || h.includes('course')),
          department: headers.findIndex(h => h.includes('department') || h.includes('dept')),
          classGraduatedFrom: headers.findIndex(h => h.includes('class')),
          aggregate: headers.findIndex(h => h.includes('aggregate')),
          parentName: headers.findIndex(h => h.includes('parent') && h.includes('name')),
          parentPhone: headers.findIndex(h => h.includes('contact') || h.includes('phone') || h.includes('mobile')),
          campus: headers.findIndex(h => h.includes('campus')),
          remarks: headers.findIndex(h => h.includes('remarks') || h.includes('comment'))
        };

        const importedStudents: GraduatedStudentItem[] = [];

        const parseCSVLine = (line: string) => {
          const result = [];
          let current = '';
          let inQuotes = false;
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              result.push(current.trim().replace(/^["']|["']$/g, ''));
              current = '';
            } else {
              current += char;
            }
          }
          result.push(current.trim().replace(/^["']|["']$/g, ''));
          return result;
        };

        for (let i = 1; i < lines.length; i++) {
          const cells = parseCSVLine(lines[i]);
          if (cells.length < 3) continue;

          const getVal = (index: number, fallback = '') => {
            return index >= 0 && index < cells.length ? cells[index] : fallback;
          };

          const fullName = getVal(colIndices.fullName);
          if (!fullName) continue;

          const rawGender = getVal(colIndices.gender).toLowerCase();
          const gender: 'Male' | 'Female' = rawGender.startsWith('f') ? 'Female' : 'Male';
          const admissionNo = getVal(colIndices.admissionNo) || `ADM-GRAD-${Date.now()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
          const candidateIndexNo = getVal(colIndices.candidateIndexNo) || `INDEX-${Math.floor(1000000000 + Math.random() * 9000000000)}`;
          const completionYear = getVal(colIndices.completionYear) || new Date().getFullYear().toString();
          
          const rawExamType = getVal(colIndices.examType).toUpperCase();
          const examType: 'BECE' | 'WASSCE' = rawExamType.includes('WASSCE') ? 'WASSCE' : 'BECE';

          const rawPlacement = getVal(colIndices.becePlacementStatus).toLowerCase();
          const becePlacementStatus: 'Placement' | 'Non-placement' = rawPlacement.includes('non') ? 'Non-placement' : 'Placement';

          const placedSchool = getVal(colIndices.placedSchool);
          const prog = getVal(colIndices.programme) || 'General Arts';
          const department = getVal(colIndices.department) || (examType === 'BECE' ? 'Junior High School' : 'Senior High School');
          const classGraduatedFrom = getVal(colIndices.classGraduatedFrom) || (examType === 'BECE' ? 'Basic 9' : 'SHS 3');
          const aggregate = getVal(colIndices.aggregate);
          const parentName = getVal(colIndices.parentName);
          const parentPhone = getVal(colIndices.parentPhone);
          const rawCampus = getVal(colIndices.campus);
          const campus: 'JIPAS 1' | 'JIPAS 2' = rawCampus.includes('2') ? 'JIPAS 2' : 'JIPAS 1';
          const remarks = getVal(colIndices.remarks);

          const newStudent: GraduatedStudentItem = {
            id: `grad-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            fullName,
            gender,
            admissionNo,
            candidateIndexNo,
            completionYear,
            examType,
            becePlacementStatus,
            placedSchool,
            placedProgramme: examType === 'BECE' ? prog : undefined,
            wassceProgramme: examType === 'WASSCE' ? prog : undefined,
            classGraduatedFrom,
            department,
            aggregate,
            parentName,
            parentPhone,
            campus,
            status: examType === 'BECE' ? (becePlacementStatus === 'Placement' ? 'Placed' : 'Pending Placement') : 'Completed',
            remarks,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          importedStudents.push(newStudent);
        }

        if (importedStudents.length === 0) {
          alert('No valid graduation records could be parsed.');
          return;
        }

        for (const s of importedStudents) {
          await saveGraduatedStudent(s);
        }

        setStudents(prev => [...importedStudents, ...prev]);
        setSuccessMessage(`Successfully imported ${importedStudents.length} graduated records!`);
        setTimeout(() => setSuccessMessage(''), 5000);

      } catch (err: any) {
        console.error('Error importing CSV:', err);
        alert(`Failed to import CSV: ${err.message || 'Unknown parsing issue'}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Print view
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Header */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 rounded-full text-xs font-semibold">
              <GraduationCap className="w-4 h-4 text-indigo-400" />
              <span>Official Alumni & Examination Registry</span>
              {readOnly && (
                <span className="ml-2 px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-400/30 rounded-md text-[10px] font-bold">
                  Read-Only Executive Mode
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              Graduated Batch Records
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
              Permanent institutional repository of graduated student candidates, official WAEC Candidate Index Numbers, BECE & WASSCE outcomes, and CSSPS Senior High School placements.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-sm cursor-pointer"
              title="Export filtered records to CSV"
            >
              <Download className="w-4 h-4 text-indigo-300" />
              <span>Export CSV</span>
            </button>

            {isEditable && (
              <button
                onClick={() => setIsBulkImportOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-sm cursor-pointer"
                title="Bulk import graduation records from CSV file with validation"
              >
                <Download className="w-4 h-4 text-emerald-300 rotate-180" />
                <span>Import CSV</span>
              </button>
            )}

            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-sm cursor-pointer"
              title="Print candidates registry"
            >
              <Printer className="w-4 h-4 text-indigo-300" />
              <span>Print Register</span>
            </button>

            {isEditable && (
              <>
                <button
                  onClick={handleClearAllGraduatedRecords}
                  className="flex items-center gap-2 px-4 py-2.5 bg-rose-600/90 hover:bg-rose-600 text-white border border-rose-500/50 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-sm cursor-pointer"
                  title="Clear all graduated candidate records"
                >
                  <Trash2 className="w-4 h-4 text-white" />
                  <span>Clear All Records</span>
                </button>
                <button
                  onClick={handleOpenAddModal}
                  className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-lg shadow-emerald-500/25 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Graduated Student</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Quick Highlights / Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 border-t border-white/10">
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 p-3 sm:p-4 rounded-2xl">
            <span className="text-[11px] font-medium text-slate-300 block">Total Candidates</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl sm:text-2xl font-black text-white">{stats.total}</span>
              <span className="text-[11px] text-slate-400">Graduates</span>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 p-3 sm:p-4 rounded-2xl">
            <span className="text-[11px] font-medium text-blue-300 block">BECE Candidates</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl sm:text-2xl font-black text-blue-400">{stats.beceCount}</span>
              <span className="text-[11px] text-blue-200">Basic 9</span>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 p-3 sm:p-4 rounded-2xl">
            <span className="text-[11px] font-medium text-emerald-300 block">BECE Placement Rate</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl sm:text-2xl font-black text-emerald-400">{stats.placementRate}%</span>
              <span className="text-[11px] text-emerald-200">({stats.becePlaced} Placed)</span>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 p-3 sm:p-4 rounded-2xl">
            <span className="text-[11px] font-medium text-purple-300 block">WASSCE Candidates</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl sm:text-2xl font-black text-purple-400">{stats.wassceCount}</span>
              <span className="text-[11px] text-purple-200">SHS 3</span>
            </div>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center justify-between text-xs sm:text-sm font-semibold shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage('')} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search bar */}
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search candidate name, index no, school..."
              className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Completion Year Filter */}
          <div>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 focus:bg-white focus:ring-2 focus:ring-indigo-500"
            >
              <option value="All">All Completion Years</option>
              {availableYears.map(yr => (
                <option key={yr} value={yr}>Class of {yr}</option>
              ))}
            </select>
          </div>

          {/* Exam Type Filter */}
          <div>
            <select
              value={selectedExamType}
              onChange={(e) => setSelectedExamType(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 focus:bg-white focus:ring-2 focus:ring-indigo-500"
            >
              <option value="All">All Exam Types (BECE & WASSCE)</option>
              <option value="BECE">BECE (Basic 9 / JHS)</option>
              <option value="WASSCE">WASSCE (SHS 3)</option>
            </select>
          </div>

          {/* BECE Placement Filter */}
          <div>
            <select
              value={selectedPlacement}
              onChange={(e) => setSelectedPlacement(e.target.value)}
              disabled={selectedExamType === 'WASSCE'}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 focus:bg-white focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              <option value="All">All Placement Statuses</option>
              <option value="Placement">BECE Placement (SHS Placed)</option>
              <option value="Non-placement">BECE Non-placement</option>
            </select>
          </div>
        </div>

        {/* Secondary active filter tags & counter */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>Showing <strong className="text-slate-800">{filteredStudents.length}</strong> of <strong className="text-slate-800">{students.length}</strong> graduated candidate records</span>
            {(searchQuery || selectedYear !== 'All' || selectedExamType !== 'All' || selectedPlacement !== 'All') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedYear('All');
                  setSelectedExamType('All');
                  setSelectedPlacement('All');
                  setSelectedDepartment('All');
                }}
                className="text-indigo-600 hover:text-indigo-800 font-bold underline cursor-pointer ml-2"
              >
                Reset Filters
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 text-[11px]">
            <span className="flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> Placed: {stats.becePlaced}
            </span>
            <span className="flex items-center gap-1 font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
              <span className="w-2 h-2 rounded-full bg-amber-500" /> Non-placement: {stats.beceNonPlaced}
            </span>
            <span className="flex items-center gap-1 font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
              <span className="w-2 h-2 rounded-full bg-purple-500" /> WASSCE: {stats.wassceCount}
            </span>
          </div>
        </div>
      </div>

      {/* Main Records Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredStudents.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
              <GraduationCap className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-800">No Graduated Candidates Found</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              {searchQuery || selectedYear !== 'All' || selectedExamType !== 'All' 
                ? 'No candidate records match your current filter criteria. Try adjusting your filters.'
                : 'No graduated student records have been created yet.'}
            </p>
            {isEditable && (
              <button
                onClick={handleOpenAddModal}
                className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition cursor-pointer"
              >
                Add First Candidate
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Candidate Biodata</th>
                  <th className="py-3 px-4">Year & Class</th>
                  <th className="py-3 px-4">Exam & Index No</th>
                  <th className="py-3 px-4">BECE / WASSCE Outcome</th>
                  <th className="py-3 px-4">Aggregate</th>
                  <th className="py-3 px-4">Parent / Contact</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((s) => {
                  const isBece = s.examType === 'BECE';
                  const isPlaced = s.becePlacementStatus === 'Placement';

                  return (
                    <tr key={s.id} className="hover:bg-indigo-50/30 transition-colors">
                      {/* Candidate Biodata */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs uppercase shadow-sm ${
                            s.gender === 'Female' 
                              ? 'bg-rose-100 text-rose-700 border border-rose-200' 
                              : 'bg-blue-100 text-blue-700 border border-blue-200'
                          }`}>
                            {s.fullName.slice(0, 2)}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block">{s.fullName}</span>
                            <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                              <span>{s.gender}</span>
                              <span>•</span>
                              <span className="font-mono">{s.admissionNo}</span>
                              {s.campus && (
                                <>
                                  <span>•</span>
                                  <span className="font-medium text-slate-600">{s.campus}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Year & Class */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 font-bold text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100 text-[11px]">
                          Class of {s.completionYear}
                        </span>
                        <div className="text-[11px] text-slate-600 mt-1 font-medium">
                          {s.classGraduatedFrom}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {s.department}
                        </div>
                      </td>

                      {/* Exam & Index No */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                            isBece 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-purple-600 text-white'
                          }`}>
                            {s.examType}
                          </span>
                          <div className="font-mono font-bold text-slate-900 tracking-wider text-xs">
                            {s.candidateIndexNo}
                          </div>
                        </div>
                      </td>

                      {/* Outcome / Placement */}
                      <td className="py-3.5 px-4 max-w-xs">
                        {isBece ? (
                          isPlaced ? (
                            <div className="space-y-0.5">
                              <span className="inline-flex items-center gap-1 font-bold text-[10px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                <Check className="w-3 h-3 text-emerald-600" /> Placement Placed
                              </span>
                              <div className="font-bold text-slate-800 text-[11px] leading-tight truncate" title={s.placedSchool}>
                                {s.placedSchool || 'Senior High School'}
                              </div>
                              {s.placedProgramme && (
                                <div className="text-[10px] text-slate-500 font-medium">
                                  Programme: {s.placedProgramme}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-0.5">
                              <span className="inline-flex items-center gap-1 font-bold text-[10px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                                <AlertCircle className="w-3 h-3 text-amber-600" /> Non-placement
                              </span>
                              <div className="text-[10px] text-slate-500">
                                CSSPS Self-placement pending
                              </div>
                            </div>
                          )
                        ) : (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 font-bold text-[10px] text-purple-800 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                              <Award className="w-3 h-3 text-purple-600" /> WASSCE Completed
                            </span>
                            <div className="font-bold text-slate-800 text-[11px]">
                              Programme: {s.wassceProgramme || 'General Science'}
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Aggregate */}
                      <td className="py-3.5 px-4">
                        {s.aggregate !== undefined && s.aggregate !== '' ? (
                          <div className="inline-flex flex-col items-center justify-center w-8 h-8 rounded-xl bg-slate-100 font-black text-slate-800 text-xs border border-slate-200">
                            {String(s.aggregate).padStart(2, '0')}
                          </div>
                        ) : (
                          <span className="text-slate-400 font-mono">-</span>
                        )}
                      </td>

                      {/* Parent / Contact */}
                      <td className="py-3.5 px-4">
                        <div className="text-[11px] font-semibold text-slate-800">
                          {s.parentName || 'Parent / Guardian'}
                        </div>
                        {s.parentPhone && (
                          <div className="flex items-center gap-1 text-[11px] text-slate-500 font-mono mt-0.5">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{s.parentPhone}</span>
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setViewingStudent(s)}
                            className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                            title="View Full Profile & Remarks"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {isEditable && (
                            <>
                              <button
                                onClick={() => handleOpenEditModal(s)}
                                className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                title="Edit Candidate Record"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(s)}
                                className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                title="Delete Record"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
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

      {/* Add / Edit Candidate Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-8">
            <div className="px-6 py-4 bg-gradient-to-r from-indigo-900 to-indigo-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-indigo-300" />
                <h3 className="font-bold text-base">
                  {editingStudent ? 'Edit Graduated Candidate' : 'Register Graduated Candidate'}
                </h3>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-indigo-200 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMessage && (
              <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2 font-semibold">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSaveStudent} className="p-6 space-y-4 text-xs">
              {/* Section 1: Candidate Biodata */}
              <div>
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-2.5 pb-1 border-b border-slate-100 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-indigo-600" />
                  Candidate Biodata
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">Student Full Name *</label>
                    <input
                      type="text"
                      required
                      value={formFullName}
                      onChange={(e) => setFormFullName(e.target.value)}
                      placeholder="e.g. KWESI MENSAH AGYAPONG"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold uppercase focus:bg-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Gender *</label>
                    <select
                      value={formGender}
                      onChange={(e) => setFormGender(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold focus:bg-white"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Admission Number</label>
                    <input
                      type="text"
                      value={formAdmissionNo}
                      onChange={(e) => setFormAdmissionNo(e.target.value)}
                      placeholder="e.g. JIPAS/2022/014"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Date of Birth</label>
                    <input
                      type="date"
                      value={formDob}
                      onChange={(e) => setFormDob(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Campus</label>
                    <select
                      value={formCampus}
                      onChange={(e) => setFormCampus(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold focus:bg-white"
                    >
                      <option value="JIPAS 1">JIPAS 1 (Main Campus)</option>
                      <option value="JIPAS 2">JIPAS 2 (Secondary Campus)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 2: Examination & Completion Details */}
              <div className="pt-2">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-2.5 pb-1 border-b border-slate-100 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-indigo-600" />
                  Examination & Completion Credentials
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Type of Exam *</label>
                    <select
                      value={formExamType}
                      onChange={(e) => {
                        const val = e.target.value as 'BECE' | 'WASSCE';
                        setFormExamType(val);
                        if (val === 'BECE') {
                          setFormDepartment('Junior High School');
                          setFormClassGraduated('Basic 9 A');
                        } else {
                          setFormDepartment('Senior High School');
                          setFormClassGraduated('SHS 3 Science');
                        }
                      }}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold focus:bg-white"
                    >
                      <option value="BECE">BECE (Junior High)</option>
                      <option value="WASSCE">WASSCE (Senior High)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Year of Completion *</label>
                    <input
                      type="number"
                      required
                      min="2010"
                      max="2035"
                      value={formCompletionYear}
                      onChange={(e) => setFormCompletionYear(e.target.value)}
                      placeholder="e.g. 2025"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Candidate's Index No *</label>
                    <input
                      type="text"
                      required
                      value={formCandidateIndexNo}
                      onChange={(e) => setFormCandidateIndexNo(e.target.value)}
                      placeholder="e.g. 1010203001"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Class Graduated From</label>
                    <input
                      type="text"
                      value={formClassGraduated}
                      onChange={(e) => setFormClassGraduated(e.target.value)}
                      placeholder="e.g. Basic 9 A"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Department</label>
                    <select
                      value={formDepartment}
                      onChange={(e) => setFormDepartment(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold focus:bg-white"
                    >
                      <option value="Junior High School">Junior High School</option>
                      <option value="Senior High School">Senior High School</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Exam Aggregate / Score</label>
                    <input
                      type="text"
                      value={formAggregate}
                      onChange={(e) => setFormAggregate(e.target.value)}
                      placeholder="e.g. 06 or 08"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold font-mono focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: BECE Placement / WASSCE Programme */}
              <div className="pt-2">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-2.5 pb-1 border-b border-slate-100 flex items-center gap-1.5">
                  <School className="w-4 h-4 text-indigo-600" />
                  {formExamType === 'BECE' ? 'BECE Placement (CSSPS) Details' : 'WASSCE Course Programme'}
                </h4>

                {formExamType === 'BECE' ? (
                  <div className="space-y-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1.5">BECE Placement Status *</label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                          <input
                            type="radio"
                            name="becePlacement"
                            value="Placement"
                            checked={formBecePlacement === 'Placement'}
                            onChange={() => setFormBecePlacement('Placement')}
                            className="text-emerald-600 focus:ring-emerald-500"
                          />
                          <span>Placement (SHS School Assigned)</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                          <input
                            type="radio"
                            name="becePlacement"
                            value="Non-placement"
                            checked={formBecePlacement === 'Non-placement'}
                            onChange={() => setFormBecePlacement('Non-placement')}
                            className="text-amber-600 focus:ring-amber-500"
                          />
                          <span>Non-placement</span>
                        </label>
                      </div>
                    </div>

                    {formBecePlacement === 'Placement' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Placed Senior High School Name</label>
                          <input
                            type="text"
                            value={formPlacedSchool}
                            onChange={(e) => setFormPlacedSchool(e.target.value)}
                            placeholder="e.g. PRESEC Legon / Achimota School"
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>

                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Placed Programme / Track</label>
                          <input
                            type="text"
                            value={formPlacedProgramme}
                            onChange={(e) => setFormPlacedProgramme(e.target.value)}
                            placeholder="e.g. General Science, Business, General Arts"
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">SHS Course / Programme</label>
                      <select
                        value={formWassceProgramme}
                        onChange={(e) => setFormWassceProgramme(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="General Science">General Science</option>
                        <option value="General Arts">General Arts</option>
                        <option value="Business">Business</option>
                        <option value="Visual & Performing Arts">Visual & Performing Arts</option>
                        <option value="Home Economics">Home Economics</option>
                        <option value="Agricultural Science">Agricultural Science</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Section 4: Parent / Guardian & Remarks */}
              <div className="pt-2">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-2.5 pb-1 border-b border-slate-100 flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-indigo-600" />
                  Parent Contact & Remarks
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Parent / Guardian Full Name</label>
                    <input
                      type="text"
                      value={formParentName}
                      onChange={(e) => setFormParentName(e.target.value)}
                      placeholder="e.g. Mr. Emmanuel Agyapong"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Parent Phone Number</label>
                    <input
                      type="text"
                      value={formParentPhone}
                      onChange={(e) => setFormParentPhone(e.target.value)}
                      placeholder="e.g. 0244112233"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono focus:bg-white"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">Remarks / Destination Notes</label>
                    <textarea
                      rows={2}
                      value={formRemarks}
                      onChange={(e) => setFormRemarks(e.target.value)}
                      placeholder="Notes on exam distinctions, scholarships, tertiary admissions, etc."
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition disabled:opacity-50 cursor-pointer flex items-center gap-2"
                >
                  {isSaving ? 'Saving Record...' : (editingStudent ? 'Update Candidate' : 'Save Graduated Candidate')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {viewingStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-8">
            <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-base">Graduation Dossier</h3>
              </div>
              <button 
                onClick={() => setViewingStudent(null)}
                className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="text-center pb-4 border-b border-slate-100">
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-700 text-xl font-black flex items-center justify-center mx-auto mb-2 shadow-sm">
                  {viewingStudent.fullName.slice(0, 2)}
                </div>
                <h2 className="text-lg font-black text-slate-900 uppercase">{viewingStudent.fullName}</h2>
                <div className="flex items-center justify-center gap-2 text-slate-500 font-mono mt-1 text-[11px]">
                  <span>Admission No: {viewingStudent.admissionNo}</span>
                  <span>•</span>
                  <span>Class of {viewingStudent.completionYear}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Exam Type</span>
                  <span className="font-bold text-slate-900 text-sm">{viewingStudent.examType}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Candidate Index Number</span>
                  <span className="font-mono font-bold text-indigo-700 text-sm">{viewingStudent.candidateIndexNo}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Class / Department</span>
                  <span className="font-semibold text-slate-800">{viewingStudent.classGraduatedFrom} ({viewingStudent.department})</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Aggregate Score</span>
                  <span className="font-mono font-black text-slate-900">{viewingStudent.aggregate || 'N/A'}</span>
                </div>
              </div>

              {viewingStudent.examType === 'BECE' ? (
                <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-1">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase block">CSSPS Placement Status</span>
                  <div className="font-bold text-emerald-950 text-xs">
                    {viewingStudent.becePlacementStatus === 'Placement' ? 'Successfully Placed' : 'Non-placement / Self-placement'}
                  </div>
                  {viewingStudent.placedSchool && (
                    <div className="text-slate-700 text-[11px] pt-1">
                      <strong>Assigned SHS:</strong> {viewingStudent.placedSchool}
                    </div>
                  )}
                  {viewingStudent.placedProgramme && (
                    <div className="text-slate-600 text-[11px]">
                      <strong>Programme Track:</strong> {viewingStudent.placedProgramme}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3.5 bg-purple-50/70 border border-purple-200 rounded-2xl space-y-1">
                  <span className="text-[10px] font-bold text-purple-800 uppercase block">WASSCE Programme</span>
                  <div className="font-bold text-purple-950 text-xs">{viewingStudent.wassceProgramme}</div>
                </div>
              )}

              <div className="space-y-1 text-slate-600">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Parent / Guardian Information</span>
                <p className="font-medium text-slate-800">{viewingStudent.parentName || 'Not specified'}</p>
                {viewingStudent.parentPhone && (
                  <p className="font-mono text-slate-600">{viewingStudent.parentPhone}</p>
                )}
              </div>

              {viewingStudent.remarks && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-600 text-[11px]">
                  <strong className="block text-slate-700 mb-0.5">Remarks / Progression:</strong>
                  {viewingStudent.remarks}
                </div>
              )}

              <div className="pt-3 flex justify-end">
                <button
                  onClick={() => setViewingStudent(null)}
                  className="px-5 py-2 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900 transition cursor-pointer"
                >
                  Close Dossier
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isBulkImportOpen && (
        <BulkGraduatedImportModal
          isOpen={isBulkImportOpen}
          onClose={() => setIsBulkImportOpen(false)}
          onSuccess={(importedCount) => {
            setStudents(getStoredGraduatedStudents());
            setSuccessMessage(`Successfully imported ${importedCount} graduated records in bulk!`);
            setTimeout(() => setSuccessMessage(''), 5000);
          }}
        />
      )}
    </div>
  );
}

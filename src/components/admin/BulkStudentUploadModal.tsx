import React, { useState, useRef, useMemo } from 'react';
import { 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Users, 
  Check, 
  Sparkles, 
  Download,
  ShieldCheck,
  AlertCircle,
  FileSpreadsheet,
  Receipt,
  FileCheck2,
  HelpCircle,
  ArrowRight,
  RefreshCw,
  Copy,
  Layers
} from 'lucide-react';
import { Student, StudentBill, TermReport } from '../../types';
import { 
  getStoredStudents, 
  saveAllStudents, 
  generateUniqueAdmissionNo,
  saveAllBills,
  getStoredBills,
  saveAllReports,
  getStoredReports,
  getStoredClassFeeTariffs
} from '../../services/dbService';
import { computeStudentBill } from '../../services/billingService';

interface BulkStudentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (importedCount: number) => void;
  onAddStudent?: (student: Student) => void;
  isFullPage?: boolean;
}

interface ParsedStudentRow {
  rowNumber: number;
  fullName: string;
  gender: 'Male' | 'Female';
  className: string;
  dob: string;
  house: string;
  parentName: string;
  parentPhone: string;
  admissionNo: string;
  campus: string;
  department: string;
  academicYear: string;
  term: string;
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

const SAMPLE_CSV_CONTENT = `Full Name,Gender,Class,Admission No,Date of Birth,House,Parent Name,Parent Phone,Department,Campus
Kofi Mensah,Male,Basic 5,JIPAS/2026/0101,2015-05-14,Blue House,Mr. Kwame Mensah,+233 24 123 4567,Primary School,JIPAS 1
Ama Serwaa Boateng,Female,Basic 6,JIPAS/2026/0102,2014-08-22,Red House,Mrs. Grace Boateng,+233 20 987 6543,Primary School,JIPAS 2
Kwabena Osei,Male,JHS 1,JIPAS/2026/0103,2013-11-05,Green House,Dr. Osei Tutu,+233 55 456 7890,Junior High School,JIPAS 1
Abena Pokuaa,Female,KG 2,JIPAS/2026/0104,2019-02-18,Yellow House,Madam Akosua Poku,+233 27 654 3210,Kindergarten,JIPAS 2`;

export default function BulkStudentUploadModal({ 
  isOpen, 
  onClose, 
  onSuccess,
  isFullPage = false
}: BulkStudentUploadModalProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [csvInput, setCsvInput] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [autoGenerateMissingAdm, setAutoGenerateMissingAdm] = useState(true);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null);
  const [importResult, setImportResult] = useState<{
    studentsCount: number;
    billsCount: number;
    reportsCount: number;
  } | null>(null);
  
  const [copiedTemplate, setCopiedTemplate] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parsing & Validation Engine
  const { parsedRows, validCount, invalidCount, hasDuplicateAdmissions } = useMemo(() => {
    if (!csvInput.trim()) {
      return { parsedRows: [], validCount: 0, invalidCount: 0, hasDuplicateAdmissions: false };
    }

    const lines = csvInput.trim().split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length === 0) {
      return { parsedRows: [], validCount: 0, invalidCount: 0, hasDuplicateAdmissions: false };
    }

    // Check if the first line is header
    const firstLineLower = lines[0].toLowerCase();
    const hasHeader = /name|gender|sex|class|grade|dob|birth|house|parent|phone|admission|adm/i.test(firstLineLower);

    const headerMap: { [key: string]: number } = {};
    let dataLines = lines;

    if (hasHeader) {
      const parseCSVHeader = (headerStr: string) => {
        const matches = headerStr.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
        return matches.map(h => h.replace(/^"|"$/g, '').trim().toLowerCase().replace(/[^a-z0-9]/g, ''));
      };

      const headers = parseCSVHeader(lines[0]);
      headers.forEach((h, idx) => {
        if (h.includes('lastname') || h.includes('surname')) headerMap['lastName'] = idx;
        else if (h.includes('othernames') || h.includes('firstname') || h.includes('middlename')) headerMap['otherNames'] = idx;
        else if (h.includes('name') && !h.includes('parent')) headerMap['fullName'] = idx;
        else if (h.includes('gender') || h.includes('sex')) headerMap['gender'] = idx;
        else if (h.includes('class') || h.includes('grade')) headerMap['className'] = idx;
        else if (h.includes('adm') || h.includes('roll') || h.includes('id') || h.includes('number')) headerMap['admissionNo'] = idx;
        else if (h.includes('dob') || h.includes('birth')) headerMap['dob'] = idx;
        else if (h.includes('house')) headerMap['house'] = idx;
        else if ((h.includes('parent') && h.includes('phone')) || h.includes('contact') || h.includes('tel') || h.includes('mobile')) headerMap['parentPhone'] = idx;
        else if (h.includes('parent') || h.includes('guardian') || h.includes('father') || h.includes('mother')) headerMap['parentName'] = idx;
        else if (h.includes('dept') || h.includes('department')) headerMap['department'] = idx;
        else if (h.includes('campus')) headerMap['campus'] = idx;
      });
      dataLines = lines.slice(1);
    }

    const existingStudents = getStoredStudents();
    const existingAdmissionNos = new Set(existingStudents.map(s => s.admissionNo?.toUpperCase().trim()).filter(Boolean));
    const seenBatchAdmissionNos = new Set<string>();

    const rows: ParsedStudentRow[] = [];
    let dupFlag = false;

    const parseCSVLine = (text: string) => {
      const p: string[] = [];
      let cur = '';
      let inQuote = false;
      for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (c === '"') {
          inQuote = !inQuote;
        } else if (c === ',' && !inQuote) {
          p.push(cur.trim().replace(/^"|"$/g, ''));
          cur = '';
        } else {
          cur += c;
        }
      }
      p.push(cur.trim().replace(/^"|"$/g, ''));
      return p;
    };

    dataLines.forEach((line, index) => {
      const parts = parseCSVLine(line);
      if (parts.length === 0 || (parts.length === 1 && !parts[0])) return;

      const getVal = (key: string, fallbackIdx: number) => {
        if (hasHeader && headerMap[key] !== undefined && parts[headerMap[key]] !== undefined) {
          return parts[headerMap[key]];
        }
        return parts[fallbackIdx] || '';
      };

      const lastName = getVal('lastName', -1).trim();
      const otherNames = getVal('otherNames', -1).trim();
      let fullName = getVal('fullName', 0).trim();
      if (!fullName && (lastName || otherNames)) {
        fullName = [lastName, otherNames].filter(Boolean).join(' ');
      }
      const rawGender = getVal('gender', 1).toLowerCase();
      const gender: 'Male' | 'Female' = (rawGender.startsWith('f') || rawGender.includes('girl') || rawGender.includes('woman')) ? 'Female' : 'Male';
      const className = getVal('className', 2).trim() || 'Basic 1';
      let admissionNo = getVal('admissionNo', 3).trim();
      const dob = getVal('dob', 4).trim() || '2015-01-01';
      const house = getVal('house', 5).trim() || 'Blue House';
      const parentName = getVal('parentName', 6).trim() || 'Parent / Guardian';
      const parentPhone = getVal('parentPhone', 7).trim() || '+233 24 000 0000';
      
      let department = getVal('department', 8).trim();
      let campus = getVal('campus', 9).trim();
      if (!campus) campus = 'JIPAS 1';
      if (!department) {
        if (className.includes('JHS') || className.includes('Junior')) {
          department = 'Junior High School';
        } else if (className.includes('Creche') || className.includes('Nursery') || className.includes('KG')) {
          department = 'Pre-School / Kindergarten';
        } else if (className.includes('SHS') || className.includes('Senior')) {
          department = 'Senior High School';
        } else {
          department = 'Primary School';
        }
      }

      const errors: string[] = [];
      const warnings: string[] = [];

      // Required validation
      if (!fullName || fullName.length < 2) {
        errors.push('Student full name is required (min 2 characters).');
      }

      if (!className) {
        errors.push('Class level is required.');
      }

      // Admission number validation
      if (!admissionNo) {
        if (autoGenerateMissingAdm) {
          // Generate a sequential mock identifier for preview
          admissionNo = `AUTO-GENERATED`;
          warnings.push('Admission number will be automatically assigned (JIPAS/2026/000X).');
        } else {
          errors.push('Admission number is missing.');
        }
      } else {
        const cleanAdm = admissionNo.toUpperCase();
        if (existingAdmissionNos.has(cleanAdm)) {
          errors.push(`Admission number "${admissionNo}" already exists in the school database.`);
          dupFlag = true;
        } else if (seenBatchAdmissionNos.has(cleanAdm)) {
          errors.push(`Duplicate admission number "${admissionNo}" found in CSV batch.`);
          dupFlag = true;
        } else {
          seenBatchAdmissionNos.add(cleanAdm);
        }
      }

      rows.push({
        rowNumber: index + (hasHeader ? 2 : 1),
        fullName,
        gender,
        className,
        dob,
        house,
        parentName,
        parentPhone,
        admissionNo,
        department,
        campus,
        academicYear: '2025-2026',
        term: 'Third Term',
        isValid: errors.length === 0,
        errors,
        warnings
      });
    });

    const valid = rows.filter(r => r.isValid).length;
    const invalid = rows.filter(r => !r.isValid).length;

    return {
      parsedRows: rows,
      validCount: valid,
      invalidCount: invalid,
      hasDuplicateAdmissions: dupFlag
    };
  }, [csvInput, autoGenerateMissingAdm]);

  if (!isOpen && !isFullPage) return null;

  // Handle File Selection via drag/drop or input
  const handleFileChange = (file: File) => {
    if (!file.name.endsWith('.csv') && !file.type.includes('csv') && !file.type.includes('text')) {
      alert('Please select a valid .csv file.');
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setCsvInput(text || '');
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleDownloadSample = () => {
    const blob = new Blob([SAMPLE_CSV_CONTENT], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'JIPAS_Students_Import_Template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyTemplate = () => {
    navigator.clipboard.writeText(SAMPLE_CSV_CONTENT);
    setCopiedTemplate(true);
    setTimeout(() => setCopiedTemplate(false), 2000);
  };

  // Execute Bulk Import with automated Student + Bill + Report creation
  const handleExecuteImport = async () => {
    const validRows = parsedRows.filter(r => r.isValid);
    if (validRows.length === 0) return;

    setIsProcessing(true);
    setImportProgress({ current: 0, total: validRows.length });

    try {
      const existingStudents = getStoredStudents();
      const existingBills = getStoredBills();
      const existingReports = getStoredReports();

      const newStudents: Student[] = [];
      const newBills: StudentBill[] = [];
      const newReports: TermReport[] = [];

      for (let i = 0; i < validRows.length; i++) {
        const row = validRows[i];
        const studentId = `st-bulk-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`;
        
        let finalAdmissionNo = row.admissionNo;
        if (!finalAdmissionNo || finalAdmissionNo === 'AUTO-GENERATED') {
          finalAdmissionNo = generateUniqueAdmissionNo([...existingStudents, ...newStudents]);
        }

        const studentData: Student = {
          id: studentId,
          admissionNo: finalAdmissionNo.toUpperCase(),
          fullName: row.fullName.toUpperCase(),
          gender: row.gender,
          dob: row.dob || '2015-05-14',
          admissionDate: new Date().toISOString().split('T')[0],
          enrollmentDate: new Date().toISOString().split('T')[0],
          department: row.department,
          campus: (row.campus === 'JIPAS 2' ? 'JIPAS 2' : 'JIPAS 1') as 'JIPAS 1' | 'JIPAS 2',
          className: row.className,
          rollNo: String(existingStudents.length + i + 1).padStart(3, '0'),
          house: row.house || 'Blue House',
          parentName: row.parentName || 'Parent / Guardian',
          parentPhone: row.parentPhone || '+233 24 000 0000',
          academicYear: row.academicYear || '2025-2026',
          term: row.term || 'Third Term',
          status: 'Active',
          isCurrent: true,
          photo: row.gender === 'Female'
            ? 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=200&auto=format&fit=crop&q=80'
            : 'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=200&auto=format&fit=crop&q=80'
        };

        // 1. Initial Student Bill (computed dynamically from configured fee tariffs)
        const initialBill: StudentBill = computeStudentBill(studentData, getStoredClassFeeTariffs());

        // 2. Initial Terminal Report
        const initialReport: TermReport = {
          id: `rep-bulk-${Date.now()}-${i}`,
          studentId: studentData.id,
          studentName: studentData.fullName,
          admissionNo: studentData.admissionNo,
          className: studentData.className,
          academicYear: studentData.academicYear || '2025-2026',
          term: studentData.term || 'Third Term',
          attendancePresent: 65,
          attendanceTotal: 70,
          conduct: 'Good & respectful',
          attitude: 'Attentive and eager to learn',
          interest: 'Reading, Science and Sports',
          teacherComment: 'A very promising student. Shows great dedication.',
          headmasterComment: 'Admitted successfully. Maintain high discipline and excellence.',
          scores: [
            { subject: 'Mathematics', classScore: 25, examScore: 55, total: 80, grade: '1', remark: 'Higher' },
            { subject: 'English Language', classScore: 24, examScore: 54, total: 78, grade: '2', remark: 'Higher' },
            { subject: 'Integrated Science', classScore: 26, examScore: 58, total: 84, grade: '1', remark: 'Higher' },
            { subject: 'Computing', classScore: 25, examScore: 55, total: 80, grade: '1', remark: 'Higher' },
            { subject: 'Creative Arts', classScore: 26, examScore: 56, total: 82, grade: '1', remark: 'Higher' },
            { subject: 'Our World Our People', classScore: 25, examScore: 55, total: 80, grade: '1', remark: 'Higher' },
            { subject: 'Religious & Moral Edu.', classScore: 26, examScore: 54, total: 80, grade: '1', remark: 'Higher' }
          ],
          totalScore: 564,
          averageScore: 80.5,
          position: '3rd'
        };

        newStudents.push(studentData);
        newBills.push(initialBill);
        newReports.push(initialReport);

        setImportProgress({ current: i + 1, total: validRows.length });
      }

      // Persist all batches to Supabase & Local Storage
      const updatedStudents = [...newStudents, ...existingStudents];
      const updatedBills = [...newBills, ...existingBills];
      const updatedReports = [...newReports, ...existingReports];

      await saveAllStudents(updatedStudents);
      await saveAllBills(updatedBills);
      await saveAllReports(updatedReports);

      setImportResult({
        studentsCount: newStudents.length,
        billsCount: newBills.length,
        reportsCount: newReports.length
      });

      // Notify parent callbacks
      setTimeout(() => {
        onSuccess(newStudents.length);
      }, 2500);

    } catch (err: any) {
      console.error('Bulk import error:', err);
      alert('Failed to complete bulk import to Supabase: ' + (err?.message || 'Network error'));
    } finally {
      setIsProcessing(false);
    }
  };

  const element = (
    <div className={isFullPage ? "bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 w-full overflow-hidden shadow-md flex flex-col animate-fade-in" : "bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]"}>
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-5 sm:p-6 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400 shadow-inner">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black tracking-tight">Bulk Student CSV Import</h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase tracking-wider border border-emerald-400/30">
                  Automated Billing & Reports
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Upload or paste student roster with schema validation, duplicate detection, and automated initial term ledger & report card generation.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800/60 hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
          {importResult ? (
            /* Success Completion Screen */
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-8 rounded-3xl text-center space-y-5 animate-fade-in">
              <div className="w-16 h-16 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-xl font-black text-emerald-900 dark:text-emerald-100">
                  Bulk Student Admission Complete!
                </h3>
                <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1 max-w-lg mx-auto">
                  All student profiles have been parsed, validated against duplicate admission numbers, and synchronized to the Supabase database.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-xl mx-auto pt-2">
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 shadow-xs">
                  <div className="flex items-center justify-center gap-1 text-emerald-600 dark:text-emerald-400 mb-1">
                    <Users className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase">Students</span>
                  </div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white">
                    {importResult.studentsCount}
                  </div>
                  <div className="text-[10px] text-slate-500">Profiles Created</div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 shadow-xs">
                  <div className="flex items-center justify-center gap-1 text-blue-600 dark:text-blue-400 mb-1">
                    <Receipt className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase">Initial Bills</span>
                  </div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white">
                    {importResult.billsCount}
                  </div>
                  <div className="text-[10px] text-slate-500">Fee Accounts Created</div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 shadow-xs">
                  <div className="flex items-center justify-center gap-1 text-indigo-600 dark:text-indigo-400 mb-1">
                    <FileCheck2 className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase">Reports</span>
                  </div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white">
                    {importResult.reportsCount}
                  </div>
                  <div className="text-[10px] text-slate-500">Term Cards Initialized</div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer"
                >
                  Return to Student Manager
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Template Download & Quick Tools Bar */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-semibold">
                  <HelpCircle className="w-4 h-4 text-indigo-500 shrink-0" />
                  <span>Expected Columns: <strong className="font-mono text-[11px] text-indigo-600 dark:text-indigo-400">FullName, Gender, Class, AdmissionNo, DOB, House, ParentName, Phone, Department</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyTemplate}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl border border-slate-200 dark:border-slate-700 font-bold transition-colors cursor-pointer text-xs"
                  >
                    {copiedTemplate ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                    <span>{copiedTemplate ? 'Copied Template!' : 'Copy Sample CSV'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadSample}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 rounded-xl border border-indigo-200 dark:border-indigo-800 font-bold transition-colors cursor-pointer text-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download CSV Template</span>
                  </button>
                </div>
              </div>

              {/* Input Mode Selector */}
              <div className="flex border-b border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveTab('upload')}
                  className={`px-4 py-2.5 font-bold text-xs border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
                    activeTab === 'upload'
                      ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  <span>Upload .CSV File</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('paste')}
                  className={`px-4 py-2.5 font-bold text-xs border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
                    activeTab === 'paste'
                      ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>Paste CSV Data</span>
                </button>
              </div>

              {/* Upload Drop Zone / Paste Area */}
              {activeTab === 'upload' ? (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
                    isDragging
                      ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/40'
                      : 'border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 hover:border-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileChange(e.target.files[0]);
                      }
                    }}
                  />
                  <div className="w-14 h-14 bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Upload className="w-7 h-7" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {fileName ? fileName : 'Click to select or drag and drop your .CSV student file'}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Supports exported spreadsheets from Excel, Google Sheets, or SIS software (.csv)
                  </p>
                  {fileName && (
                    <span className="inline-block mt-3 px-3 py-1 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 rounded-lg text-xs font-bold">
                      Loaded: {fileName} ({parsedRows.length} total rows parsed)
                    </span>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <label className="font-bold text-slate-700 dark:text-slate-300">
                      Paste CSV Records (Comma Separated)
                    </label>
                    <button
                      type="button"
                      onClick={() => setCsvInput(SAMPLE_CSV_CONTENT)}
                      className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                    >
                      Insert Sample Data
                    </button>
                  </div>
                  <textarea
                    rows={6}
                    value={csvInput}
                    onChange={(e) => setCsvInput(e.target.value)}
                    placeholder={SAMPLE_CSV_CONTENT}
                    className="w-full font-mono text-xs p-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none leading-relaxed"
                  />
                </div>
              )}

              {/* Admission Number Configuration Toggle */}
              <div className="flex items-center justify-between p-3.5 bg-indigo-50/50 dark:bg-indigo-950/30 rounded-2xl border border-indigo-100 dark:border-indigo-900/60 text-xs">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    Auto-Generate Missing Admission Numbers (JIPAS/2026/000X format)
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoGenerateMissingAdm}
                    onChange={(e) => setAutoGenerateMissingAdm(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {/* Real-Time Parse Preview & Validation Grid */}
              {parsedRows.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase text-slate-600 dark:text-slate-400 tracking-wider">
                        Validation Preview ({parsedRows.length} Rows Detected)
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-bold">
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        {validCount} Ready to Import
                      </span>
                      {invalidCount > 0 && (
                        <span className="px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                          {invalidCount} Invalid Rows
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Parse Results Table */}
                  <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden max-h-60 overflow-y-auto">
                    <table className="w-full text-left text-xs whitespace-nowrap">
                      <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase text-[10px] sticky top-0 z-10">
                        <tr>
                          <th className="p-2.5">Row</th>
                          <th className="p-2.5">Status</th>
                          <th className="p-2.5">Student Name</th>
                          <th className="p-2.5">Admission No</th>
                          <th className="p-2.5">Class</th>
                          <th className="p-2.5">Gender</th>
                          <th className="p-2.5">Parent Details</th>
                          <th className="p-2.5">Validation Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                        {parsedRows.map((row, idx) => (
                          <tr 
                            key={idx} 
                            className={row.isValid ? 'hover:bg-slate-50 dark:hover:bg-slate-800/50' : 'bg-rose-50/50 dark:bg-rose-950/20'}
                          >
                            <td className="p-2.5 font-mono text-slate-400">#{row.rowNumber}</td>
                            <td className="p-2.5">
                              {row.isValid ? (
                                <span className="inline-flex items-center gap-1 text-emerald-600 font-bold text-[11px]">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Valid
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-rose-600 font-bold text-[11px]">
                                  <AlertTriangle className="w-3.5 h-3.5" /> Error
                                </span>
                              )}
                            </td>
                            <td className="p-2.5 font-bold text-slate-900 dark:text-white">
                              {row.fullName || <span className="text-rose-500 italic">Empty Name</span>}
                            </td>
                            <td className="p-2.5 font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                              {row.admissionNo}
                            </td>
                            <td className="p-2.5 text-slate-600 dark:text-slate-300">{row.className}</td>
                            <td className="p-2.5 text-slate-600 dark:text-slate-300">{row.gender}</td>
                            <td className="p-2.5 text-slate-500 text-[11px] truncate max-w-[150px]" title={`${row.parentName} (${row.parentPhone})`}>
                              {row.parentName} • {row.parentPhone}
                            </td>
                            <td className="p-2.5">
                              {row.errors.length > 0 ? (
                                <div className="text-rose-600 dark:text-rose-400 font-semibold text-[11px]">
                                  {row.errors.join(' ')}
                                </div>
                              ) : row.warnings.length > 0 ? (
                                <div className="text-amber-600 dark:text-amber-400 font-medium text-[11px]">
                                  {row.warnings.join(' ')}
                                </div>
                              ) : (
                                <span className="text-emerald-600 dark:text-emerald-400 text-[11px]">
                                  Ready: Initial bill & report will be created
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        {!importResult && (
          <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="text-xs text-slate-500">
              {parsedRows.length > 0 ? (
                <span>
                  <strong>{validCount}</strong> of <strong>{parsedRows.length}</strong> students ready for Supabase insertion
                </span>
              ) : (
                <span>Select a CSV file or paste rows to begin parsing</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isProcessing}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleExecuteImport}
                disabled={isProcessing || validCount === 0}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shadow-md shadow-indigo-600/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>
                      Importing {importProgress ? `${importProgress.current}/${importProgress.total}` : '...'}
                    </span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>
                      Import {validCount > 0 ? `${validCount} Valid Students` : 'Students'} to Supabase
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
    </div>
  );

  if (isFullPage) {
    return element;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      {element}
    </div>
  );
}

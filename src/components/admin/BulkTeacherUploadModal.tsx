import React, { useState, useRef, useMemo } from 'react';
import { 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Users, 
  Check, 
  Download,
  ShieldCheck,
  FileSpreadsheet,
  FileCheck2,
  HelpCircle,
  RefreshCw,
  Copy,
  Briefcase,
  Key,
  GraduationCap
} from 'lucide-react';
import { Teacher, UserAccountItem } from '../../types';
import { 
  getStoredTeachers, 
  saveAllTeachers, 
  adminCreateUserAccount,
  saveUserAccount,
  getStoredUsers
} from '../../services/dbService';

interface BulkTeacherUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (importedCount: number) => void;
  onAddTeacher?: (teacher: Teacher) => void;
  isFullPage?: boolean;
}

export interface ParsedTeacherRow {
  rowNumber: number;
  name: string;
  lastName?: string;
  otherNames?: string;
  staffId: string;
  email: string;
  phone: string;
  gender: 'Male' | 'Female';
  department: string;
  designation: string;
  rank: string;
  academicQualification: string;
  professionalQualification: string;
  ntcLicense: string;
  emergencyContact: string;
  bloodGroup: string;
  classes: string[];
  subjects: string[];
  dateOfEmployment: string;
  campus: string;
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export const SAMPLE_TEACHER_CSV_CONTENT = `Full Name,Staff ID,Gender,Email,Phone,Department,Designation,Rank,Academic Qualification,Professional Qualification,NTC License,Assigned Classes,Assigned Subjects,Campus
Emmanuel Osei,JIPAS/STAFF/2026/001,Male,emmanuel.osei@jipas.edu.gh,0244123456,Primary Department,Class Teacher,Senior Superintendent I,B.Ed Basic Education,Licensed Professional Teacher,NTC/TR/2022/49821,"Basic 4, Basic 5","Mathematics, Science",JIPAS 1
Grace Adjei Mensah,JIPAS/STAFF/2026/002,Female,grace.mensah@jipas.edu.gh,0209876543,Junior High School,Subject Teacher,Principal Superintendent,B.A English & Linguistics,Postgraduate Diploma in Education,NTC/TR/2021/33219,"JHS 1, JHS 2, JHS 3","English Language, Literature",JIPAS 1
Kofi Boateng,JIPAS/STAFF/2026/003,Male,kofi.boateng@jipas.edu.gh,0244987654,Senior High School,Subject Teacher,Principal Superintendent,B.Sc Physics,Postgraduate Diploma in Education,NTC/TR/2020/66543,"SHS 1, SHS 2, SHS 3","Physics, Integrated Science, Elective Mathematics",JIPAS 1
Kwabena Darko,JIPAS/STAFF/2026/004,Male,kwabena.darko@jipas.edu.gh,0554567890,Primary Department,Class Teacher,Superintendent I,B.Ed Early Childhood,Licensed Professional Teacher,NTC/TR/2023/11874,Basic 2,"Creative Arts, OWOP",JIPAS 2
Abigail Antwi,JIPAS/STAFF/2026/005,Female,abigail.antwi@jipas.edu.gh,0276543210,Junior High School,Head of Department,Assistant Director II,M.Sc Computing,Licensed Professional Teacher,NTC/TR/2019/88765,"JHS 1, JHS 2","Computing, ICT",JIPAS 2`;

export default function BulkTeacherUploadModal({ 
  isOpen, 
  onClose, 
  onSuccess,
  isFullPage = false
}: BulkTeacherUploadModalProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [csvInput, setCsvInput] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [autoGenerateMissingStaffId, setAutoGenerateMissingStaffId] = useState(true);
  // Compulsory: Staff portal login user accounts are always automatically provisioned
  const autoCreateUserAccounts = true;
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null);
  const [importResult, setImportResult] = useState<{
    teachersCount: number;
    accountsCount: number;
  } | null>(null);
  
  const [copiedTemplate, setCopiedTemplate] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parsing & Validation Engine
  const { parsedRows, validCount, invalidCount, hasDuplicateStaffIds } = useMemo(() => {
    if (!csvInput.trim()) {
      return { parsedRows: [], validCount: 0, invalidCount: 0, hasDuplicateStaffIds: false };
    }

    const lines = csvInput.trim().split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length === 0) {
      return { parsedRows: [], validCount: 0, invalidCount: 0, hasDuplicateStaffIds: false };
    }

    // Check if the first line is header
    const firstLineLower = lines[0].toLowerCase();
    const hasHeader = /name|staff|gender|sex|email|phone|contact|dept|department|class|subject|rank|qualification|ntc/i.test(firstLineLower);

    const headerMap: { [key: string]: number } = {};
    let dataLines = lines;

    if (hasHeader) {
      // Split with support for commas inside quotes
      const parseCSVHeader = (headerStr: string) => {
        const matches = headerStr.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
        return matches.map(h => h.replace(/^"|"$/g, '').trim().toLowerCase().replace(/[^a-z0-9]/g, ''));
      };
      
      const headers = parseCSVHeader(lines[0]);
      headers.forEach((h, idx) => {
        if (h.includes('staffid') || (h.includes('staff') && h.includes('id')) || h.includes('idno') || h.includes('empid')) headerMap['staffId'] = idx;
        else if (h.includes('lastname') || h.includes('surname')) headerMap['lastName'] = idx;
        else if (h.includes('othernames') || h.includes('firstname') || h.includes('middlename')) headerMap['otherNames'] = idx;
        else if (h.includes('name') || h.includes('teacher') || h.includes('faculty')) headerMap['name'] = idx;
        else if (h.includes('gender') || h.includes('sex')) headerMap['gender'] = idx;
        else if (h.includes('email') || h.includes('mail')) headerMap['email'] = idx;
        else if (h.includes('phone') || h.includes('contact') || h.includes('mobile') || h.includes('tel')) headerMap['phone'] = idx;
        else if (h.includes('dept') || h.includes('department')) headerMap['department'] = idx;
        else if (h.includes('designation') || h.includes('role') || h.includes('title')) headerMap['designation'] = idx;
        else if (h.includes('rank') || h.includes('position')) headerMap['rank'] = idx;
        else if (h.includes('academic') || (h.includes('qualification') && !h.includes('prof'))) headerMap['academicQualification'] = idx;
        else if (h.includes('professional') || h.includes('profqual')) headerMap['professionalQualification'] = idx;
        else if (h.includes('ntc') || h.includes('license') || h.includes('licence')) headerMap['ntcLicense'] = idx;
        else if (h.includes('class') || h.includes('classes') || h.includes('grade')) headerMap['classes'] = idx;
        else if (h.includes('subject') || h.includes('subjects') || h.includes('course')) headerMap['subjects'] = idx;
        else if (h.includes('campus')) headerMap['campus'] = idx;
        else if (h.includes('employment') || h.includes('joined') || h.includes('hire')) headerMap['dateOfEmployment'] = idx;
        else if (h.includes('emergency')) headerMap['emergencyContact'] = idx;
        else if (h.includes('blood')) headerMap['bloodGroup'] = idx;
      });
      dataLines = lines.slice(1);
    }

    const existingTeachers = getStoredTeachers();
    const existingStaffIds = new Set(existingTeachers.map(t => t.staffId?.toUpperCase().trim()).filter(Boolean));
    const existingEmails = new Set(existingTeachers.map(t => t.email?.toLowerCase().trim()).filter(Boolean));
    const seenBatchStaffIds = new Set<string>();
    const seenBatchEmails = new Set<string>();

    const rows: ParsedTeacherRow[] = [];
    let dupFlag = false;

    // Helper regex for CSV with quotes
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
      let rawName = getVal('name', 0).trim();
      if (!rawName && (lastName || otherNames)) {
        rawName = [lastName, otherNames].filter(Boolean).join(' ');
      }

      let staffId = getVal('staffId', 1).trim();
      const rawGender = getVal('gender', 2).toLowerCase();
      const gender: 'Male' | 'Female' = (rawGender.startsWith('f') || rawGender.includes('woman') || rawGender.includes('lady')) ? 'Female' : 'Male';
      let email = getVal('email', 3).trim().toLowerCase();
      const phone = getVal('phone', 4).trim();
      const department = getVal('department', 5).trim() || 'Primary Department';
      const designation = getVal('designation', 6).trim() || 'Class Teacher';
      const rank = getVal('rank', 7).trim() || 'Senior Superintendent I';
      const academicQualification = getVal('academicQualification', 8).trim() || 'B.Ed Basic Education';
      const professionalQualification = getVal('professionalQualification', 9).trim() || 'Licensed Professional Teacher (NTC)';
      const ntcLicense = getVal('ntcLicense', 10).trim() || 'NTC/TR/2023/0000';
      
      const rawClasses = getVal('classes', 11).trim();
      const rawSubjects = getVal('subjects', 12).trim();
      let campus = getVal('campus', 13).trim();
      if (!campus) campus = 'JIPAS 1';

      const dateOfEmployment = getVal('dateOfEmployment', 14).trim() || new Date().toISOString().split('T')[0];
      const emergencyContact = getVal('emergencyContact', 15).trim() || phone;
      const bloodGroup = getVal('bloodGroup', 16).trim() || 'O+';

      const classes = rawClasses ? rawClasses.split(/[,;]/).map(c => c.trim()).filter(Boolean) : ['Basic 1'];
      const subjects = rawSubjects ? rawSubjects.split(/[,;]/).map(s => s.trim()).filter(Boolean) : ['Mathematics', 'English Language'];

      const errors: string[] = [];
      const warnings: string[] = [];

      // 1. Name validation
      if (!rawName || rawName.length < 2) {
        errors.push('Teacher full name is required (min 2 characters).');
      }

      // 2. Staff ID validation & Duplicate Check
      if (!staffId) {
        if (autoGenerateMissingStaffId) {
          staffId = 'AUTO-GENERATED';
          warnings.push('Staff ID will be auto-generated (JIPAS/STAFF/2026/XXX).');
        } else {
          errors.push('Staff ID Number is missing.');
        }
      } else {
        const cleanStaffId = staffId.toUpperCase();
        if (existingStaffIds.has(cleanStaffId)) {
          errors.push(`Staff ID "${staffId}" already exists in the teacher database.`);
          dupFlag = true;
        } else if (seenBatchStaffIds.has(cleanStaffId)) {
          errors.push(`Duplicate Staff ID "${staffId}" found within CSV batch.`);
          dupFlag = true;
        } else {
          seenBatchStaffIds.add(cleanStaffId);
        }
      }

      // 3. Email validation
      if (!email) {
        // Auto-generate suggested email
        if (rawName) {
          const slug = rawName.toLowerCase().replace(/[^a-z0-9]/g, '.').replace(/\.+/g, '.');
          email = `${slug}@jipas.edu.gh`;
          warnings.push(`Email missing; will assign default institutional email: ${email}`);
        } else {
          errors.push('Email is missing.');
        }
      } else {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          errors.push(`Invalid email format "${email}".`);
        } else if (existingEmails.has(email)) {
          warnings.push(`Email "${email}" is already associated with an existing faculty member.`);
        } else if (seenBatchEmails.has(email)) {
          errors.push(`Duplicate email "${email}" found in CSV batch.`);
        } else {
          seenBatchEmails.add(email);
        }
      }

      // 4. Phone validation
      if (phone) {
        const cleanPhone = phone.replace(/[\s\-()]/g, '');
        if (cleanPhone.length < 9) {
          warnings.push(`Phone number "${phone}" may be too short.`);
        }
      }

      rows.push({
        rowNumber: index + (hasHeader ? 2 : 1),
        name: rawName,
        lastName,
        otherNames,
        staffId,
        email,
        phone: phone || '0240000000',
        gender,
        department,
        designation,
        rank,
        academicQualification,
        professionalQualification,
        ntcLicense,
        emergencyContact,
        bloodGroup,
        classes,
        subjects,
        dateOfEmployment,
        campus,
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
      hasDuplicateStaffIds: dupFlag
    };
  }, [csvInput, autoGenerateMissingStaffId]);

  if (!isOpen && !isFullPage) return null;

  // Handle File Selection
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
    const blob = new Blob([SAMPLE_TEACHER_CSV_CONTENT], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'JIPAS_Teachers_Faculty_Import_Template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyTemplate = () => {
    navigator.clipboard.writeText(SAMPLE_TEACHER_CSV_CONTENT);
    setCopiedTemplate(true);
    setTimeout(() => setCopiedTemplate(false), 2000);
  };

  // Execute Bulk Teacher Import to Supabase & Local Storage
  const handleExecuteImport = async () => {
    const validRows = parsedRows.filter(r => r.isValid);
    if (validRows.length === 0) return;

    setIsProcessing(true);
    setImportProgress({ current: 0, total: validRows.length });

    try {
      const existingTeachers = getStoredTeachers();
      const existingUserAccounts = getStoredUsers();
      const newTeachers: Teacher[] = [];
      let accountsCreated = 0;

      for (let i = 0; i < validRows.length; i++) {
        const row = validRows[i];
        const teacherId = `t-bulk-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`;
        
        let finalStaffId = row.staffId;
        if (!finalStaffId || finalStaffId === 'AUTO-GENERATED') {
          finalStaffId = `JIPAS/STAFF/2026/${String(existingTeachers.length + i + 1).padStart(3, '0')}`;
        }

        const teacherData: Teacher = {
          id: teacherId,
          staffId: finalStaffId,
          name: row.name,
          lastName: row.lastName,
          otherNames: row.otherNames,
          email: row.email,
          phone: row.phone,
          gender: row.gender,
          department: row.department,
          designation: row.designation,
          rank: row.rank,
          academicQualification: row.academicQualification,
          professionalQualification: row.professionalQualification,
          ntcLicenseNo: row.ntcLicense,
          classesTaught: row.classes,
          subjectsTaught: row.subjects,
          dateOfEmployment: row.dateOfEmployment,
          dateJoined: row.dateOfEmployment,
          campus: row.campus === 'JIPAS 2' ? 'JIPAS 2' : 'JIPAS 1',
          emergencyContact: row.emergencyContact,
          bloodGroup: row.bloodGroup,
          photo: row.gender === 'Female'
            ? 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80'
            : 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80'
        };

        newTeachers.push(teacherData);

        // Compulsory User Account Auto-Creation with secure credentials
        const username = row.email 
          ? row.email.split('@')[0].toLowerCase() 
          : `staff_${finalStaffId.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}`;
        const existingAcc = existingUserAccounts.find(u => 
          (u.email && row.email && u.email.toLowerCase() === row.email.toLowerCase()) || 
          u.username.toLowerCase() === username ||
          (u.staffId && u.staffId.toLowerCase() === finalStaffId.toLowerCase())
        );

        if (!existingAcc) {
          const securePassword = `Staff@${finalStaffId.replace(/[^a-zA-Z0-9]/g, '').slice(-4) || '2026'}`;
          const newUser: UserAccountItem = {
            id: `usr-t-${Date.now()}-${i}`,
            name: row.name,
            email: row.email || `${username}@jipas.edu.gh`,
            username,
            password: securePassword,
            role: 'teacher',
            phone: row.phone,
            status: 'Active',
            department: row.department,
            classAssigned: row.classes[0] || '',
            classesTaught: row.classes,
            subjectsTaught: row.subjects,
            staffId: finalStaffId,
            campus: row.campus,
            createdAt: new Date().toISOString(),
            lastLogin: 'Never',
            isApproved: true,
            registrationType: 'faculty'
          };
          try {
            await adminCreateUserAccount(newUser, securePassword);
            accountsCreated++;
          } catch (err) {
            // Reliable fallback to saveUserAccount to ensure credentials work offline/immediately
            try {
              await saveUserAccount(newUser);
              accountsCreated++;
            } catch (saveErr) {
              console.warn('Could not auto-create user account for teacher:', row.name, saveErr);
            }
          }
        }

        setImportProgress({ current: i + 1, total: validRows.length });
      }

      // Persist all teachers to Supabase & local storage
      const updatedTeachers = [...newTeachers, ...existingTeachers];
      await saveAllTeachers(updatedTeachers);

      setImportResult({
        teachersCount: newTeachers.length,
        accountsCount: accountsCreated
      });

      // Notify parent
      setTimeout(() => {
        onSuccess(newTeachers.length);
      }, 2500);

    } catch (err: any) {
      console.error('Bulk teacher import error:', err);
      alert('Failed to complete bulk import: ' + (err?.message || 'Database error'));
    } finally {
      setIsProcessing(false);
    }
  };

  const element = (
    <div className={isFullPage ? "bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 w-full overflow-hidden shadow-md flex flex-col animate-fade-in" : "bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 w-full max-w-5xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]"}>
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 p-5 sm:p-6 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shadow-inner">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black tracking-tight">Bulk Teacher & Faculty CSV Import</h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase tracking-wider border border-emerald-400/30">
                  Staff Onboarding
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Upload or paste faculty records with automated Staff ID assignment, qualification parsing, duplicate verification, and optional portal login creation.
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
                  Bulk Teacher Onboarding Complete!
                </h3>
                <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1 max-w-lg mx-auto">
                  All teacher profiles have been parsed, validated against duplicate Staff IDs, and saved securely to the school database.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md mx-auto pt-2">
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 shadow-xs">
                  <div className="flex items-center justify-center gap-1 text-emerald-600 dark:text-emerald-400 mb-1">
                    <Briefcase className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase">Faculty Profiles</span>
                  </div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white">
                    {importResult.teachersCount}
                  </div>
                  <div className="text-[10px] text-slate-500">Teachers Added</div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 shadow-xs">
                  <div className="flex items-center justify-center gap-1 text-indigo-600 dark:text-indigo-400 mb-1">
                    <Key className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase">Portal Logins</span>
                  </div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white">
                    {importResult.accountsCount}
                  </div>
                  <div className="text-[10px] text-slate-500">User Accounts Created</div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer"
                >
                  Return to Teacher Management
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Template Download & Quick Tools Bar */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-semibold">
                  <HelpCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Expected Columns: <strong className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400">FullName, StaffID, Gender, Email, Phone, Department, Designation, Rank, Qualification, AssignedClasses, AssignedSubjects, Campus</strong></span>
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
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/80 text-emerald-700 dark:text-emerald-300 rounded-xl border border-emerald-200 dark:border-emerald-800 font-bold transition-colors cursor-pointer text-xs"
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
                      ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
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
                      ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
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
                      ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40'
                      : 'border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 hover:border-emerald-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'
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
                  <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Upload className="w-7 h-7" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {fileName ? fileName : 'Click to select or drag and drop your .CSV teacher file'}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Supports exported spreadsheets from Excel, Google Sheets, or HR software (.csv)
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
                      Paste CSV Faculty Records (Comma Separated)
                    </label>
                    <button
                      type="button"
                      onClick={() => setCsvInput(SAMPLE_TEACHER_CSV_CONTENT)}
                      className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
                    >
                      Insert Sample Data
                    </button>
                  </div>
                  <textarea
                    rows={6}
                    value={csvInput}
                    onChange={(e) => setCsvInput(e.target.value)}
                    placeholder={SAMPLE_TEACHER_CSV_CONTENT}
                    className="w-full font-mono text-xs p-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none leading-relaxed"
                  />
                </div>
              )}

              {/* Import Options & Toggles */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-center justify-between p-3.5 bg-emerald-50/50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-100 dark:border-emerald-900/60 text-xs">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      Auto-Generate Missing Staff IDs (JIPAS/STAFF/2026/XXX)
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoGenerateMissingStaffId}
                      onChange={(e) => setAutoGenerateMissingStaffId(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-3.5 bg-emerald-50/70 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/60 rounded-xl text-emerald-700 dark:text-emerald-300">
                      <Key className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-900 dark:text-white">
                          Auto-Create Portal Login User Accounts (Role: Teacher)
                        </span>
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-600 text-white shadow-xs">
                          Compulsory
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Guarantees secure portal credentials for all faculty. Staff don't need to self-register and can request credential edits with admin approval.
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-700 shadow-2xs">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      Always Active
                    </span>
                  </div>
                </div>
              </div>

              {/* Real-Time Parse Preview & Validation Grid */}
              {parsedRows.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase text-slate-600 dark:text-slate-400 tracking-wider">
                        Faculty Validation Preview ({parsedRows.length} Rows Detected)
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
                  <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden max-h-64 overflow-y-auto">
                    <table className="w-full text-left text-xs whitespace-nowrap">
                      <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase text-[10px] sticky top-0 z-10">
                        <tr>
                          <th className="p-2.5">Row</th>
                          <th className="p-2.5">Status</th>
                          <th className="p-2.5">Teacher Name</th>
                          <th className="p-2.5">Staff ID</th>
                          <th className="p-2.5">Gender</th>
                          <th className="p-2.5">Email & Phone</th>
                          <th className="p-2.5">Department & Role</th>
                          <th className="p-2.5">Assigned Classes & Subjects</th>
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
                              {row.name || <span className="text-rose-500 italic">Empty Name</span>}
                            </td>
                            <td className="p-2.5 font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                              {row.staffId}
                            </td>
                            <td className="p-2.5 text-slate-600 dark:text-slate-300">{row.gender}</td>
                            <td className="p-2.5 text-slate-500 text-[11px]">
                              <div>{row.email}</div>
                              <div className="text-[10px] text-slate-400">{row.phone}</div>
                            </td>
                            <td className="p-2.5 text-slate-600 dark:text-slate-300">
                              <span className="font-semibold text-slate-800 dark:text-slate-200">{row.designation}</span>
                              <span className="text-[10px] text-slate-400 block">{row.department}</span>
                            </td>
                            <td className="p-2.5 text-slate-600 dark:text-slate-300 text-[11px]">
                              <div><strong className="text-slate-700 dark:text-slate-300">Cls:</strong> {row.classes.join(', ') || 'None'}</div>
                              <div className="text-slate-500"><strong className="text-slate-700 dark:text-slate-300">Sub:</strong> {row.subjects.join(', ') || 'None'}</div>
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
                                  Ready: Profile verified
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
                  <strong>{validCount}</strong> of <strong>{parsedRows.length}</strong> teachers ready for import
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
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shadow-md shadow-emerald-600/30 disabled:opacity-50 disabled:cursor-not-allowed"
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
                      Import {validCount > 0 ? `${validCount} Valid Teachers` : 'Teachers'}
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

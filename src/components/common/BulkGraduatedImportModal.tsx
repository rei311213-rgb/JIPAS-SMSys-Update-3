import React, { useState, useRef, useMemo } from 'react';
import { 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Check, 
  Sparkles, 
  Download,
  HelpCircle,
  ArrowRight,
  RefreshCw,
  Copy,
  Layers,
  GraduationCap
} from 'lucide-react';
import { GraduatedStudentItem } from '../../types';
import { saveGraduatedStudent } from '../../services/dbService';

interface BulkGraduatedImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (count: number) => void;
}

interface ParsedGraduatedRow {
  rowNumber: number;
  fullName: string;
  gender: 'Male' | 'Female';
  admissionNo: string;
  candidateIndexNo: string;
  completionYear: string;
  examType: 'BECE' | 'WASSCE';
  becePlacementStatus: 'Placement' | 'Non-placement';
  placedSchool: string;
  programme: string;
  department: string;
  classGraduatedFrom: string;
  aggregate: string;
  parentName: string;
  parentPhone: string;
  campus: 'JIPAS 1' | 'JIPAS 2';
  remarks: string;
  isValid: boolean;
  errors: string[];
}

const SAMPLE_CSV_CONTENT = `Full Name,Gender,Admission No,Candidate Index No,Completion Year,Exam Type,Placement Status,Placed School,Programme,Department,Class Graduated,Aggregate,Parent Name,Parent Phone,Campus,Remarks
Kofi Mensah,Male,JIPAS/2026/0101,1020304050,2026,BECE,Placement,Prempeh College,General Science,Junior High School,Basic 9,06,Mr. Kwame Mensah,+233 24 123 4567,JIPAS 1,Outstanding performance
Ama Serwaa Boateng,Female,JIPAS/2026/0102,1020304051,2026,WASSCE,Non-placement,,Business,Senior High School,SHS 3,12,Mrs. Grace Boateng,+233 20 987 6543,JIPAS 2,Passed with Distinction`;

export default function BulkGraduatedImportModal({ 
  isOpen, 
  onClose, 
  onSuccess
}: BulkGraduatedImportModalProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [csvInput, setCsvInput] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedTemplate, setCopiedTemplate] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parsing & Validation Engine
  const { parsedRows, validCount, invalidCount } = useMemo(() => {
    if (!csvInput.trim()) {
      return { parsedRows: [], validCount: 0, invalidCount: 0 };
    }

    const lines = csvInput.trim().split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length === 0) {
      return { parsedRows: [], validCount: 0, invalidCount: 0 };
    }

    // Check if first line has header
    const firstLineLower = lines[0].toLowerCase();
    const hasHeader = /name|gender|sex|admission|index|year|exam|placement|school|programme|dept|class|parent/i.test(firstLineLower);

    const headerMap: { [key: string]: number } = {};
    let dataLines = lines;

    if (hasHeader) {
      const parseCSVHeader = (headerStr: string) => {
        return headerStr.split(',').map(h => h.trim().toLowerCase().replace(/[^a-z0-9]/g, ''));
      };

      const headers = parseCSVHeader(lines[0]);
      headers.forEach((h, idx) => {
        if (h.includes('name') && !h.includes('parent')) headerMap['fullName'] = idx;
        else if (h.includes('gender') || h.includes('sex')) headerMap['gender'] = idx;
        else if (h.includes('admission') || h.includes('adm')) headerMap['admissionNo'] = idx;
        else if (h.includes('index') || h.includes('candidate')) headerMap['candidateIndexNo'] = idx;
        else if (h.includes('year') || h.includes('completion')) headerMap['completionYear'] = idx;
        else if (h.includes('exam')) headerMap['examType'] = idx;
        else if (h.includes('placement')) headerMap['placementStatus'] = idx;
        else if (h.includes('school') || h.includes('placed')) headerMap['placedSchool'] = idx;
        else if (h.includes('programme') || h.includes('program') || h.includes('course')) headerMap['programme'] = idx;
        else if (h.includes('department') || h.includes('dept')) headerMap['department'] = idx;
        else if (h.includes('class')) headerMap['classGraduatedFrom'] = idx;
        else if (h.includes('aggregate')) headerMap['aggregate'] = idx;
        else if (h.includes('parent') && h.includes('name')) headerMap['parentName'] = idx;
        else if (h.includes('phone') || h.includes('contact') || h.includes('mobile')) headerMap['parentPhone'] = idx;
        else if (h.includes('campus')) headerMap['campus'] = idx;
        else if (h.includes('remark') || h.includes('comment')) headerMap['remarks'] = idx;
      });
      dataLines = lines.slice(1);
    } else {
      // Default standard header indices
      headerMap['fullName'] = 0;
      headerMap['gender'] = 1;
      headerMap['admissionNo'] = 2;
      headerMap['candidateIndexNo'] = 3;
      headerMap['completionYear'] = 4;
      headerMap['examType'] = 5;
    }

    const rows: ParsedGraduatedRow[] = [];

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
      const cells = parseCSVLine(line);
      if (cells.length === 0 || (cells.length === 1 && !cells[0])) return;

      const rowNumber = index + (hasHeader ? 2 : 1);
      const errors: string[] = [];

      const getVal = (fieldKey: string, fallback = '') => {
        const idx = headerMap[fieldKey];
        if (idx !== undefined && idx < cells.length) {
          return cells[idx].trim();
        }
        return fallback;
      };

      const fullName = getVal('fullName');
      const rawGender = getVal('gender').toLowerCase();
      const admissionNo = getVal('admissionNo');
      const candidateIndexNo = getVal('candidateIndexNo');
      const completionYear = getVal('completionYear') || new Date().getFullYear().toString();
      const rawExamType = getVal('examType').toUpperCase();
      const rawPlacement = getVal('placementStatus').toLowerCase();
      const placedSchool = getVal('placedSchool');
      const programme = getVal('programme');
      const department = getVal('department');
      const classGraduatedFrom = getVal('classGraduatedFrom');
      const aggregate = getVal('aggregate');
      const parentName = getVal('parentName');
      const parentPhone = getVal('parentPhone');
      const rawCampus = getVal('campus');
      const remarks = getVal('remarks');

      // Validations
      if (!fullName) {
        errors.push('Full Name is required.');
      }

      let gender: 'Male' | 'Female' = 'Male';
      if (rawGender.startsWith('f')) {
        gender = 'Female';
      } else if (rawGender.startsWith('m')) {
        gender = 'Male';
      } else if (rawGender) {
        errors.push(`Invalid Gender "${rawGender}". Use Male or Female.`);
      }

      const examType: 'BECE' | 'WASSCE' = rawExamType.includes('WASSCE') ? 'WASSCE' : 'BECE';
      const becePlacementStatus: 'Placement' | 'Non-placement' = rawPlacement.includes('non') ? 'Non-placement' : 'Placement';
      const campus: 'JIPAS 1' | 'JIPAS 2' = rawCampus.includes('2') ? 'JIPAS 2' : 'JIPAS 1';

      if (!candidateIndexNo) {
        errors.push('Candidate Index No is required.');
      }

      rows.push({
        rowNumber,
        fullName,
        gender,
        admissionNo,
        candidateIndexNo,
        completionYear,
        examType,
        becePlacementStatus,
        placedSchool,
        programme,
        department: department || (examType === 'BECE' ? 'Junior High School' : 'Senior High School'),
        classGraduatedFrom: classGraduatedFrom || (examType === 'BECE' ? 'Basic 9' : 'SHS 3'),
        aggregate,
        parentName,
        parentPhone,
        campus,
        remarks,
        isValid: errors.length === 0,
        errors
      });
    });

    const valCount = rows.filter(r => r.isValid).length;
    const invCount = rows.length - valCount;

    return { parsedRows: rows, validCount: valCount, invalidCount: invCount };
  }, [csvInput]);

  if (!isOpen) return null;

  // File handling
  const processFile = (file: File) => {
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
      alert('Please upload a .csv text file.');
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) {
        setCsvInput(text);
      }
    };
    reader.readAsText(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
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
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleCopyTemplate = () => {
    navigator.clipboard.writeText(SAMPLE_CSV_CONTENT);
    setCopiedTemplate(true);
    setTimeout(() => setCopiedTemplate(false), 2000);
  };

  const handleDownloadTemplate = () => {
    const blob = new Blob([SAMPLE_CSV_CONTENT], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'jipas_graduated_batch_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Import execution
  const handleExecuteImport = async () => {
    const validRows = parsedRows.filter(r => r.isValid);
    if (validRows.length === 0) {
      alert('There are no valid records to import.');
      return;
    }

    setIsProcessing(true);
    try {
      let count = 0;
      for (const row of validRows) {
        const item: GraduatedStudentItem = {
          id: `grad-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          fullName: row.fullName,
          gender: row.gender,
          admissionNo: row.admissionNo || `ADM-GRAD-${Date.now()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`,
          candidateIndexNo: row.candidateIndexNo,
          completionYear: row.completionYear,
          examType: row.examType,
          becePlacementStatus: row.becePlacementStatus,
          placedSchool: row.placedSchool || undefined,
          placedProgramme: row.examType === 'BECE' ? (row.programme || undefined) : undefined,
          wassceProgramme: row.examType === 'WASSCE' ? (row.programme || undefined) : undefined,
          classGraduatedFrom: row.classGraduatedFrom,
          department: row.department,
          aggregate: row.aggregate || undefined,
          parentName: row.parentName || undefined,
          parentPhone: row.parentPhone || undefined,
          campus: row.campus,
          status: row.examType === 'BECE' ? (row.becePlacementStatus === 'Placement' ? 'Placed' : 'Pending Placement') : 'Completed',
          remarks: row.remarks || undefined,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        await saveGraduatedStudent(item);
        count++;
      }

      onSuccess(count);
      onClose();
    } catch (err: any) {
      console.error(err);
      alert('Error during bulk import: ' + (err.message || 'Check connection.'));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-slate-900 text-white rounded-3xl border border-slate-800 shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-xl text-white">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">Bulk Import Graduated Batch</h2>
              <p className="text-xs text-slate-400">Upload or paste CSV graduation records to quickly populate your alumni batch registry.</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 text-xs">
          <button
            onClick={() => { setActiveTab('upload'); setCsvInput(''); setFileName(null); }}
            className={`px-6 py-3.5 font-bold transition-colors ${activeTab === 'upload' ? 'border-b-2 border-indigo-500 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            File Upload (.CSV)
          </button>
          <button
            onClick={() => { setActiveTab('paste'); setCsvInput(''); setFileName(null); }}
            className={`px-6 py-3.5 font-bold transition-colors ${activeTab === 'paste' ? 'border-b-2 border-indigo-500 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            Copy & Paste Raw Text
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Instructions and Download Template */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase text-indigo-400 bg-indigo-950/80 px-2.5 py-0.5 rounded-full border border-indigo-800/60 inline-block">Format Reference</span>
              <p className="text-xs font-semibold text-slate-300">Requires headings matching: Full Name, Gender, Admission No, Candidate Index No, Exam Type, Campus, etc.</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleCopyTemplate}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-all border border-slate-700"
              >
                {copiedTemplate ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedTemplate ? 'Copied' : 'Copy Template'}
              </button>
              <button
                onClick={handleDownloadTemplate}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-all shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                Download CSV
              </button>
            </div>
          </div>

          {/* Input State */}
          {activeTab === 'upload' ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-3 ${
                isDragging 
                  ? 'border-indigo-400 bg-indigo-950/25' 
                  : fileName 
                  ? 'border-emerald-500/50 bg-emerald-950/5' 
                  : 'border-slate-800 hover:border-indigo-500/50 bg-slate-950/20'
              }`}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept=".csv" 
                className="hidden" 
              />
              <div className={`p-4 rounded-2xl ${fileName ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                <Upload className="w-8 h-8" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-200">
                  {fileName ? `Loaded: ${fileName}` : 'Drag & drop graduated batch CSV file here'}
                </p>
                <p className="text-xs text-slate-500 mt-1">or click to browse your computer files</p>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400">Paste comma-separated rows below:</label>
              <textarea
                value={csvInput}
                onChange={(e) => setCsvInput(e.target.value)}
                placeholder="Full Name,Gender,Admission No,Candidate Index No,Completion Year,Exam Type&#10;Kofi Mensah,Male,JIPAS/2026/0101,1020304050,2026,BECE"
                className="w-full h-44 bg-slate-950 text-slate-200 border border-slate-800 rounded-2xl p-4 font-mono text-xs focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          )}

          {/* Preview Section */}
          {parsedRows.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">File Parsing & Validation Preview</span>
                <div className="flex gap-2">
                  <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950 border border-emerald-800/80 px-2.5 py-0.5 rounded-full">
                    {validCount} Valid
                  </span>
                  {invalidCount > 0 && (
                    <span className="text-[11px] font-bold text-rose-400 bg-rose-950 border border-rose-800/80 px-2.5 py-0.5 rounded-full">
                      {invalidCount} Errors
                    </span>
                  )}
                </div>
              </div>

              <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/40 max-h-56 overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-900/80 text-slate-400 border-b border-slate-800 text-[10px] uppercase font-bold tracking-wider">
                      <th className="py-2.5 px-3.5 w-12 text-center">Row</th>
                      <th className="py-2.5 px-3.5">Full Name</th>
                      <th className="py-2.5 px-3.5">Exam Type</th>
                      <th className="py-2.5 px-3.5">Index No</th>
                      <th className="py-2.5 px-3.5">Admission No</th>
                      <th className="py-2.5 px-3.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {parsedRows.map((row) => (
                      <tr key={row.rowNumber} className={`hover:bg-slate-800/30 ${row.isValid ? 'text-slate-300' : 'text-rose-300 bg-rose-950/10'}`}>
                        <td className="py-2 px-3.5 text-center text-slate-500 font-mono">{row.rowNumber}</td>
                        <td className="py-2 px-3.5">
                          <span className="font-bold block">{row.fullName}</span>
                          {!row.isValid && (
                            <span className="text-[10px] text-rose-400 block font-semibold">{row.errors.join(', ')}</span>
                          )}
                        </td>
                        <td className="py-2 px-3.5 font-mono">{row.examType}</td>
                        <td className="py-2 px-3.5 font-mono">{row.candidateIndexNo || '-'}</td>
                        <td className="py-2 px-3.5 font-mono">{row.admissionNo || 'Auto'}</td>
                        <td className="py-2 px-3.5">
                          {row.isValid ? (
                            <span className="inline-flex items-center gap-1 text-emerald-400">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Valid
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-rose-400">
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-500" /> Rejected
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

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-800 bg-slate-950/40 rounded-b-3xl flex items-center justify-between">
          <button
            onClick={() => { setCsvInput(''); setFileName(null); }}
            disabled={parsedRows.length === 0}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Clear Preview
          </button>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleExecuteImport}
              disabled={isProcessing || validCount === 0}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-indigo-900/10"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Import {validCount} Records
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

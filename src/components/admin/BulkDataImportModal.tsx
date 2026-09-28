import React, { useState } from 'react';
import { 
  Users, 
  GraduationCap, 
  FileSpreadsheet, 
  X, 
  CheckCircle2, 
  ShieldCheck, 
  FileText,
  Sparkles,
  ArrowRight,
  Database,
  Layers,
  Award
} from 'lucide-react';
import BulkStudentUploadModal from './BulkStudentUploadModal';
import BulkTeacherUploadModal from './BulkTeacherUploadModal';
import { Student, Teacher } from '../../types';

interface BulkDataImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: 'students' | 'teachers';
  onSuccess?: (type: 'students' | 'teachers', count: number) => void;
  onAddStudent?: (student: Student) => void;
  onAddTeacher?: (teacher: Teacher) => void;
  isFullPage?: boolean;
}

export default function BulkDataImportModal({
  isOpen,
  onClose,
  initialType = 'students',
  onSuccess,
  onAddStudent,
  onAddTeacher,
  isFullPage = false
}: BulkDataImportModalProps) {
  const [activeType, setActiveType] = useState<'students' | 'teachers'>(initialType);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  if (!isOpen && !isFullPage) return null;

  const handleStudentSuccess = (count: number) => {
    setSuccessNotice(`Successfully imported and synchronized ${count} student profiles with initial ledgers & term reports.`);
    onSuccess?.('students', count);
  };

  const handleTeacherSuccess = (count: number) => {
    setSuccessNotice(`Successfully imported and synchronized ${count} teacher/faculty profiles to the database.`);
    onSuccess?.('teachers', count);
  };

  return (
    <div className={isFullPage ? "w-full space-y-5 animate-fade-in" : "fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in"}>
      <div className={isFullPage ? "w-full" : "w-full max-w-5xl max-h-[94vh] flex flex-col"}>
        
        {/* Top Type Selector Bar */}
        <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                JIPAS Bulk CSV Data Import Center
                <span className="px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold">
                  Data Integrity Engine
                </span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Batch import student rosters and faculty staff records from CSV spreadsheets with schema validation and duplicate checks.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => {
                  setActiveType('students');
                  setSuccessNotice(null);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeType === 'students'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Students Roster CSV</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveType('teachers');
                  setSuccessNotice(null);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeType === 'teachers'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <GraduationCap className="w-4 h-4" />
                <span>Teachers & Faculty CSV</span>
              </button>
            </div>

            {!isFullPage && (
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl bg-slate-100 dark:bg-slate-800 transition-colors cursor-pointer ml-1"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Success toast if any */}
        {successNotice && (
          <div className="mb-4 p-3.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center justify-between gap-3 text-xs text-emerald-800 dark:text-emerald-200 animate-fade-in">
            <div className="flex items-center gap-2 font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{successNotice}</span>
            </div>
            <button
              onClick={() => setSuccessNotice(null)}
              className="text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 font-bold"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Child Import Modal by Active Type */}
        {activeType === 'students' ? (
          <BulkStudentUploadModal
            isOpen={true}
            isFullPage={isFullPage}
            onClose={onClose}
            onAddStudent={onAddStudent}
            onSuccess={handleStudentSuccess}
          />
        ) : (
          <BulkTeacherUploadModal
            isOpen={true}
            isFullPage={isFullPage}
            onClose={onClose}
            onAddTeacher={onAddTeacher}
            onSuccess={handleTeacherSuccess}
          />
        )}

      </div>
    </div>
  );
}

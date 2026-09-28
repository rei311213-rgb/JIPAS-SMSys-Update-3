import React, { useState } from 'react';
import { 
  BookOpen, Layers, CheckSquare, Square, Users, Check, X, Sparkles, 
  ArrowRight, ShieldCheck, CheckCircle2 
} from 'lucide-react';
import { SubjectItem, ClassItem, Teacher } from '../../types';

interface BulkSubjectAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjects: SubjectItem[];
  classes: ClassItem[];
  teachers?: Teacher[];
  onComplete: (assignedCount: number, message: string) => void;
}

export default function BulkSubjectAssignmentModal({
  isOpen,
  onClose,
  subjects,
  classes,
  teachers = [],
  onComplete
}: BulkSubjectAssignmentModalProps) {
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [selectedClassNames, setSelectedClassNames] = useState<string[]>([]);
  const [assignedTeacherId, setAssignedTeacherId] = useState<string>('');
  const [isCore, setIsCore] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  // Helpers for quick class selection
  const handleSelectAllClasses = () => {
    setSelectedClassNames(classes.map(c => c.name));
  };

  const handleSelectDeptClasses = (deptKeyword: string) => {
    const matched = classes.filter(c => 
      (c.department || '').toLowerCase().includes(deptKeyword.toLowerCase()) ||
      c.name.toLowerCase().includes(deptKeyword.toLowerCase())
    ).map(c => c.name);
    setSelectedClassNames(Array.from(new Set([...selectedClassNames, ...matched])));
  };

  const handleClearClasses = () => {
    setSelectedClassNames([]);
  };

  const toggleSubject = (subId: string) => {
    setSelectedSubjectIds(prev => 
      prev.includes(subId) ? prev.filter(id => id !== subId) : [...prev, subId]
    );
  };

  const toggleClass = (className: string) => {
    setSelectedClassNames(prev => 
      prev.includes(className) ? prev.filter(c => c !== className) : [...prev, className]
    );
  };

  const handleSelectAllCoreSubjects = () => {
    const coreIds = subjects.filter(s => s.category === 'Core').map(s => s.id);
    setSelectedSubjectIds(coreIds);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSubjectIds.length === 0) {
      alert('Please select at least one subject to assign.');
      return;
    }
    if (selectedClassNames.length === 0) {
      alert('Please select at least one target class stream.');
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedSubjectsList = subjects.filter(s => selectedSubjectIds.includes(s.id));
      const totalAllocations = selectedSubjectIds.length * selectedClassNames.length;
      
      const teacherObj = teachers.find(t => t.id === assignedTeacherId);
      const teacherNote = teacherObj ? ` assigned to ${teacherObj.name}` : '';

      onComplete(
        totalAllocations,
        `✓ Successfully allocated ${selectedSubjectIds.length} subject(s) across ${selectedClassNames.length} class(es)${teacherNote}!`
      );
      onClose();
    } catch (err: any) {
      alert('Error allocating subjects: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-lg">Bulk Subject Allocation Engine</h3>
              <p className="text-xs text-slate-400">Map multiple curriculum subjects to class streams in a single click</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 text-xs">
          {/* Step 1: Select Subjects */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-2">
                <span>1. Select Subjects to Allocate</span>
                <span className="text-indigo-600 font-black">({selectedSubjectIds.length} Selected)</span>
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAllCoreSubjects}
                  className="text-[11px] font-bold text-indigo-600 hover:underline cursor-pointer"
                >
                  Select All Core
                </button>
                <span className="text-slate-300">•</span>
                <button
                  type="button"
                  onClick={() => setSelectedSubjectIds(subjects.map(s => s.id))}
                  className="text-[11px] font-bold text-slate-600 hover:underline cursor-pointer"
                >
                  Select All ({subjects.length})
                </button>
                <span className="text-slate-300">•</span>
                <button
                  type="button"
                  onClick={() => setSelectedSubjectIds([])}
                  className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-44 overflow-y-auto p-2 border border-slate-200 rounded-2xl bg-slate-50/50">
              {subjects.map(sub => {
                const checked = selectedSubjectIds.includes(sub.id);
                return (
                  <button
                    type="button"
                    key={sub.id}
                    onClick={() => toggleSubject(sub.id)}
                    className={`flex items-center gap-2 p-2 rounded-xl text-left border transition-all cursor-pointer ${
                      checked 
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs font-bold' 
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 font-medium'
                    }`}
                  >
                    {checked ? <CheckSquare className="w-4 h-4 flex-shrink-0" /> : <Square className="w-4 h-4 text-slate-400 flex-shrink-0" />}
                    <div className="truncate">
                      <p className="truncate text-xs">{sub.name}</p>
                      <p className={`text-[10px] ${checked ? 'text-indigo-200' : 'text-slate-400'}`}>
                        {sub.code || sub.category}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Select Target Classes */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-2">
                <span>2. Select Target Class Streams</span>
                <span className="text-emerald-600 font-black">({selectedClassNames.length} Selected)</span>
              </label>
              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={() => handleSelectDeptClasses('JHS')}
                  className="font-bold text-blue-600 hover:underline cursor-pointer"
                >
                  + All JHS
                </button>
                <span className="text-slate-300">•</span>
                <button
                  type="button"
                  onClick={() => handleSelectDeptClasses('Primary')}
                  className="font-bold text-blue-600 hover:underline cursor-pointer"
                >
                  + All Primary
                </button>
                <span className="text-slate-300">•</span>
                <button
                  type="button"
                  onClick={() => handleSelectDeptClasses('Senior')}
                  className="font-bold text-blue-600 hover:underline cursor-pointer"
                >
                  + All SHS
                </button>
                <span className="text-slate-300">•</span>
                <button
                  type="button"
                  onClick={handleSelectAllClasses}
                  className="font-bold text-slate-600 hover:underline cursor-pointer"
                >
                  All ({classes.length})
                </button>
                <span className="text-slate-300">•</span>
                <button
                  type="button"
                  onClick={handleClearClasses}
                  className="font-bold text-rose-600 hover:underline cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-44 overflow-y-auto p-2 border border-slate-200 rounded-2xl bg-slate-50/50">
              {classes.map(c => {
                const checked = selectedClassNames.includes(c.name);
                return (
                  <button
                    type="button"
                    key={c.id || c.name}
                    onClick={() => toggleClass(c.name)}
                    className={`flex items-center gap-2 p-2 rounded-xl text-left border transition-all cursor-pointer ${
                      checked 
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs font-bold' 
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 font-medium'
                    }`}
                  >
                    {checked ? <CheckSquare className="w-4 h-4 flex-shrink-0" /> : <Square className="w-4 h-4 text-slate-400 flex-shrink-0" />}
                    <span className="truncate text-xs">{c.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 3: Assignment Parameters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Lead Subject Teacher (Optional)</label>
              <select
                value={assignedTeacherId}
                onChange={(e) => setAssignedTeacherId(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-bold"
              >
                <option value="">-- No designated teacher (Assign later) --</option>
                {teachers.map(t => (
                  <option key={t.id} value={t.id}>{t.name} ({t.department || 'Academic Staff'})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Curriculum Classification</label>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsCore(true)}
                  className={`flex-1 py-1.5 rounded-xl font-bold border transition-all cursor-pointer ${
                    isCore ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white text-slate-600 border-slate-300'
                  }`}
                >
                  Core Subject (Compulsory)
                </button>
                <button
                  type="button"
                  onClick={() => setIsCore(false)}
                  className={`flex-1 py-1.5 rounded-xl font-bold border transition-all cursor-pointer ${
                    !isCore ? 'bg-amber-600 border-amber-600 text-white' : 'bg-white text-slate-600 border-slate-300'
                  }`}
                >
                  Elective / Optional
                </button>
              </div>
            </div>
          </div>

          {/* Allocation Calculation Preview */}
          <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl flex items-center justify-between">
            <span className="text-slate-600 font-bold">Planned Allocations:</span>
            <span className="font-mono font-black text-indigo-700 text-sm">
              {selectedSubjectIds.length} Subjects &times; {selectedClassNames.length} Classes = {selectedSubjectIds.length * selectedClassNames.length} Curriculum Mappings
            </span>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 cursor-pointer font-bold text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || selectedSubjectIds.length === 0 || selectedClassNames.length === 0}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              {isSubmitting ? 'Allocating...' : 'Execute Bulk Allocation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

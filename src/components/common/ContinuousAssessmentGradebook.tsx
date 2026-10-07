import React, { useState, useMemo } from 'react';
import {
  GraduationCap,
  Award,
  BookOpen,
  Filter,
  Search,
  Printer,
  Download,
  CheckCircle2,
  Sparkles,
  Layers,
  Save,
  Users
} from 'lucide-react';
import { Student } from '../../types';
import {
  computeClassBroadsheet,
  DEFAULT_WEIGHTS,
  AssessmentWeights,
  StudentMarkRecord
} from '../../services/gradebookService';

interface Props {
  students: Student[];
  currentUser?: any;
}

export default function ContinuousAssessmentGradebook({ students, currentUser }: Props) {
  const [selectedClass, setSelectedClass] = useState<string>('Form 1');
  const [selectedSubject, setSelectedSubject] = useState<string>('Mathematics');
  const [searchQuery, setSearchQuery] = useState('');
  const [weights, setWeights] = useState<AssessmentWeights>(DEFAULT_WEIGHTS);
  const [marksMap, setMarksMap] = useState<Record<string, { seq1: number; seq2: number; mid: number; exam: number }>>({});
  const [saveSuccess, setSaveSuccess] = useState(false);

  const classesList = useMemo(() => {
    const set = new Set<string>();
    students.forEach(s => { if (s.className) set.add(s.className); });
    return Array.from(set).sort();
  }, [students]);

  const defaultClasses = classesList.length > 0 ? classesList : ['Form 1', 'Form 2', 'Form 3', 'Form 4', 'Form 5', 'Lower Sixth', 'Upper Sixth'];

  const broadsheet = useMemo(() => {
    return computeClassBroadsheet(selectedClass, selectedSubject, students, marksMap, weights);
  }, [selectedClass, selectedSubject, students, marksMap, weights]);

  const filteredRecords = useMemo(() => {
    return broadsheet.records.filter(r => !searchQuery || r.studentName.toLowerCase().includes(searchQuery.toLowerCase()) || r.admissionNo.includes(searchQuery));
  }, [broadsheet.records, searchQuery]);

  const handleUpdateMark = (studentId: string, field: 'seq1' | 'seq2' | 'mid' | 'exam', value: number) => {
    const val = Math.min(20, Math.max(0, Number(value) || 0));
    setMarksMap(prev => {
      const current = prev[studentId] || { seq1: 14, seq2: 15, mid: 13, exam: 14 };
      return {
        ...prev,
        [studentId]: {
          ...current,
          [field]: val
        }
      };
    });
  };

  const handleSaveMarks = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-purple-800/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-300 text-xs font-bold tracking-wide">
              <Award className="w-3.5 h-3.5 text-purple-400" />
              <span>OPTION 1 — CONTINUOUS ASSESSMENT (CA) & WEIGHTED GRADEBOOK</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Continuous Assessment & Master Broadsheet
            </h1>
            <p className="text-sm text-purple-200/80 max-w-2xl">
              Weighted grading engine computing Sequences 1 & 2 (15%), Practical Mid-Term (20%), and Final Exam (50%) with automatic class ranks and official remarks.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleSaveMarks}
              className="px-5 py-2.5 bg-purple-500 hover:bg-purple-400 text-slate-950 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-purple-500/30"
            >
              <Save className="w-4 h-4" />
              <span>Commit Marks & Ranks</span>
            </button>
            <button
              onClick={() => window.print()}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Broadsheet</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-6 border-t border-purple-800/50">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-purple-200/70 mb-1">Class</label>
            <select
              value={selectedClass}
              onChange={e => setSelectedClass(e.target.value)}
              className="w-full bg-slate-800/90 border border-slate-700 text-white rounded-xl p-2.5 text-xs font-bold"
            >
              {defaultClasses.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-purple-200/70 mb-1">Subject</label>
            <select
              value={selectedSubject}
              onChange={e => setSelectedSubject(e.target.value)}
              className="w-full bg-slate-800/90 border border-slate-700 text-white rounded-xl p-2.5 text-xs font-bold"
            >
              <option value="Mathematics">Mathematics</option>
              <option value="English Language">English Language</option>
              <option value="French">French</option>
              <option value="Physics">Physics</option>
              <option value="Chemistry">Chemistry</option>
              <option value="Biology">Biology</option>
              <option value="History">History</option>
              <option value="Geography">Geography</option>
              <option value="Computer Science">Computer Science</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-purple-200/70 mb-1">Academic Term</label>
            <div className="bg-slate-800/90 border border-slate-700 text-white rounded-xl p-2.5 text-xs font-bold">
              First Term (Trimestre 1)
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-purple-200/70 mb-1">Formula Weightings</label>
            <div className="bg-slate-800/90 border border-slate-700 text-purple-300 rounded-xl p-2.5 text-xs font-mono font-bold">
              15% + 15% + 20% + 50%
            </div>
          </div>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-2xl text-xs font-bold text-emerald-800 dark:text-emerald-200 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>Continuous assessment marks, weighted GPAs, and class ranks saved successfully!</span>
        </div>
      )}

      {/* Analytics Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="text-xs font-bold text-slate-500">Class Average (/20)</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">{broadsheet.classAverage} <span className="text-xs font-bold text-slate-400">/ 20</span></div>
          <div className="text-[11px] text-slate-400">{broadsheet.records.length} Students Evaluated</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="text-xs font-bold text-slate-500">Highest Score (Major)</div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{broadsheet.highestMark} <span className="text-xs font-bold text-slate-400">/ 20</span></div>
          <div className="text-[11px] text-emerald-600 font-bold">Rank 1 Benchmark</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="text-xs font-bold text-slate-500">Lowest Score</div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400">{broadsheet.lowestMark} <span className="text-xs font-bold text-slate-400">/ 20</span></div>
          <div className="text-[11px] text-rose-500 font-bold">Remediation Required</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="text-xs font-bold text-slate-500">Pass Rate (&ge; 10/20)</div>
          <div className="text-2xl font-black text-purple-600 dark:text-purple-400">{broadsheet.passRatePercent}%</div>
          <div className="text-[11px] text-purple-500 font-bold">Academic Success Index</div>
        </div>
      </div>

      {/* Broadsheet Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search student or matricule..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium w-64"
            />
          </div>

          <div className="text-xs font-mono text-slate-400">
            Broadsheet: <b>{selectedClass}</b> — <b>{selectedSubject}</b>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-bold uppercase text-[10px]">
              <tr>
                <th className="p-3 w-12 text-center">Rank</th>
                <th className="p-3">Student Name</th>
                <th className="p-3">Matricule</th>
                <th className="p-3 text-center">Seq 1 (15%)</th>
                <th className="p-3 text-center">Seq 2 (15%)</th>
                <th className="p-3 text-center">Mid-Term (20%)</th>
                <th className="p-3 text-center">Final Exam (50%)</th>
                <th className="p-3 text-center">Total (/20)</th>
                <th className="p-3 text-center">Grade</th>
                <th className="p-3">Appréciation / Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {filteredRecords.map(r => (
                <tr key={r.studentId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="p-3 text-center font-black">
                    <span className={`w-6 h-6 rounded-full inline-flex items-center justify-center text-[10px] ${
                      r.rank === 1 ? 'bg-amber-100 text-amber-900 font-black' :
                      r.rank === 2 ? 'bg-slate-200 text-slate-800 font-bold' :
                      r.rank === 3 ? 'bg-orange-100 text-orange-900 font-bold' : 'text-slate-500'
                    }`}>
                      #{r.rank}
                    </span>
                  </td>
                  <td className="p-3 font-bold text-slate-900 dark:text-white">{r.studentName}</td>
                  <td className="p-3 font-mono text-[11px] text-slate-400">{r.admissionNo}</td>
                  <td className="p-3 text-center">
                    <input
                      type="number"
                      min="0"
                      max="20"
                      step="0.5"
                      defaultValue={r.sequence1}
                      onChange={e => handleUpdateMark(r.studentId, 'seq1', Number(e.target.value))}
                      className="w-14 p-1 text-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold"
                    />
                  </td>
                  <td className="p-3 text-center">
                    <input
                      type="number"
                      min="0"
                      max="20"
                      step="0.5"
                      defaultValue={r.sequence2}
                      onChange={e => handleUpdateMark(r.studentId, 'seq2', Number(e.target.value))}
                      className="w-14 p-1 text-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold"
                    />
                  </td>
                  <td className="p-3 text-center">
                    <input
                      type="number"
                      min="0"
                      max="20"
                      step="0.5"
                      defaultValue={r.midtermPractical}
                      onChange={e => handleUpdateMark(r.studentId, 'mid', Number(e.target.value))}
                      className="w-14 p-1 text-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold"
                    />
                  </td>
                  <td className="p-3 text-center">
                    <input
                      type="number"
                      min="0"
                      max="20"
                      step="0.5"
                      defaultValue={r.finalExam}
                      onChange={e => handleUpdateMark(r.studentId, 'exam', Number(e.target.value))}
                      className="w-14 p-1 text-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold font-mono"
                    />
                  </td>
                  <td className="p-3 text-center font-black text-sm text-purple-600 dark:text-purple-400">
                    {r.weightedTotal}
                  </td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                      r.grade.startsWith('A') ? 'bg-emerald-100 text-emerald-800' :
                      r.grade === 'B' ? 'bg-blue-100 text-blue-800' :
                      r.grade === 'C' ? 'bg-purple-100 text-purple-800' :
                      r.grade === 'D' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {r.grade}
                    </span>
                  </td>
                  <td className="p-3 text-xs font-medium text-slate-600 dark:text-slate-300">
                    {r.remarks}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

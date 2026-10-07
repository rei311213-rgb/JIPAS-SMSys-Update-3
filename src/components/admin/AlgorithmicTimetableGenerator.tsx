import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  Printer,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Users,
  Building2,
  Layers,
  RefreshCw,
  Search,
  Filter
} from 'lucide-react';
import { Teacher } from '../../types';
import {
  generateAutomatedTimetable,
  TIMETABLE_PERIODS,
  DAYS_OF_WEEK,
  TimetableSlot,
  TimetableConflict
} from '../../services/timetableSchedulerService';

interface Props {
  teachers: Teacher[];
}

export default function AlgorithmicTimetableGenerator({ teachers }: Props) {
  const [selectedClass, setSelectedClass] = useState<string>('Form 1');
  const [selectedTeacherFilter, setSelectedTeacherFilter] = useState<string>('ALL');
  const [timetableData, setTimetableData] = useState<{ slots: TimetableSlot[]; conflicts: TimetableConflict[] }>(() => {
    return generateAutomatedTimetable(
      ['Form 1', 'Form 2', 'Form 3', 'Form 4', 'Form 5', 'Lower Sixth', 'Upper Sixth'],
      teachers,
      ['Mathematics', 'English Language', 'French', 'Physics', 'Chemistry', 'Biology', 'History', 'Geography', 'Computer Science']
    );
  });
  const [isGenerating, setIsGenerating] = useState(false);

  const handleRegenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const generated = generateAutomatedTimetable(
        ['Form 1', 'Form 2', 'Form 3', 'Form 4', 'Form 5', 'Lower Sixth', 'Upper Sixth'],
        teachers,
        ['Mathematics', 'English Language', 'French', 'Physics', 'Chemistry', 'Biology', 'History', 'Geography', 'Computer Science']
      );
      setTimetableData(generated);
      setIsGenerating(false);
    }, 400);
  };

  const filteredSlots = useMemo(() => {
    return timetableData.slots
      .filter(s => selectedClass === 'ALL' || s.className === selectedClass)
      .filter(s => selectedTeacherFilter === 'ALL' || s.teacherId === selectedTeacherFilter || s.teacherName.includes(selectedTeacherFilter));
  }, [timetableData.slots, selectedClass, selectedTeacherFilter]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-teal-800/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 border border-teal-400/30 text-teal-300 text-xs font-bold tracking-wide">
              <Clock className="w-3.5 h-3.5 text-teal-400" />
              <span>OPTION 4 — ALGORITHMIC TIMETABLE GENERATOR & CLASH RESOLVER</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Institutional Master Timetable & Clash Detector
            </h1>
            <p className="text-sm text-teal-200/80 max-w-2xl">
              Constraint-based weekly scheduler distributing subjects, specialized science/computer laboratories, and teacher workloads with zero room collisions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleRegenerate}
              disabled={isGenerating}
              className="px-5 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-teal-500/30"
            >
              <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
              <span>{isGenerating ? 'Solving Constraints...' : 'Generate New Timetable'}</span>
            </button>
            <button
              onClick={() => window.print()}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Timetable</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6 pt-6 border-t border-teal-800/50">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-teal-200/70 mb-1">View Schedule for Class</label>
            <select
              value={selectedClass}
              onChange={e => setSelectedClass(e.target.value)}
              className="w-full bg-slate-800/90 border border-slate-700 text-white rounded-xl p-2.5 text-xs font-bold"
            >
              {['Form 1', 'Form 2', 'Form 3', 'Form 4', 'Form 5', 'Lower Sixth', 'Upper Sixth'].map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-teal-200/70 mb-1">Filter by Teacher</label>
            <select
              value={selectedTeacherFilter}
              onChange={e => setSelectedTeacherFilter(e.target.value)}
              className="w-full bg-slate-800/90 border border-slate-700 text-white rounded-xl p-2.5 text-xs font-bold"
            >
              <option value="ALL">All Teachers (Tous les Enseignants)</option>
              {teachers.map(t => (
                <option key={t.id} value={t.id}>{t.name || (t as any).fullName || 'Teacher'}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Conflicts Banner if Any */}
      {timetableData.conflicts.length > 0 ? (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-2xl space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>{timetableData.conflicts.length} Potential Collisions Detected & Highlighted in Red</span>
          </div>
          <div className="text-[11px] text-amber-700 dark:text-amber-300">
            {timetableData.conflicts[0]?.description}
          </div>
        </div>
      ) : (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-2xl flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Zero Scheduling Conflicts Detected! Workloads, room capacities, and teacher hours are 100% verified.</span>
        </div>
      )}

      {/* Master 5-Day Weekly Grid View */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-bold uppercase text-[10px]">
            <tr>
              <th className="p-3 border-r border-slate-200 dark:border-slate-800 w-24">Period / Time</th>
              {DAYS_OF_WEEK.map(day => (
                <th key={day} className="p-3 text-center border-r border-slate-200 dark:border-slate-800 last:border-r-0">
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
            {TIMETABLE_PERIODS.map(p => (
              <tr key={p.period} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                <td className="p-3 font-bold border-r border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                  <div>Period {p.period}</div>
                  <div className="text-[10px] text-slate-400 font-mono">{p.timeRange}</div>
                </td>

                {DAYS_OF_WEEK.map(day => {
                  const slot = filteredSlots.find(s => s.day === day && s.period === p.period);
                  if (!slot) {
                    return (
                      <td key={day} className="p-3 text-center border-r border-slate-200 dark:border-slate-800 text-slate-300">
                        —
                      </td>
                    );
                  }

                  return (
                    <td
                      key={day}
                      className={`p-3 border-r border-slate-200 dark:border-slate-800 last:border-r-0 ${
                        slot.isConflict
                          ? 'bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-500'
                          : 'hover:bg-teal-50/30 dark:hover:bg-teal-950/20'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="font-bold text-slate-900 dark:text-white">{slot.subject}</div>
                        <div className="text-[11px] text-teal-600 dark:text-teal-400 font-medium">{slot.teacherName}</div>
                        <div className="text-[10px] font-mono text-slate-400 flex items-center justify-between">
                          <span>{slot.roomName}</span>
                          <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 font-bold">{slot.className}</span>
                        </div>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

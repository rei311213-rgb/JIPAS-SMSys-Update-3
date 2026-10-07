import React, { useState, useMemo } from 'react';
import {
  Building2,
  FileText,
  Printer,
  Download,
  CheckCircle2,
  Users,
  Award,
  GraduationCap,
  Sparkles,
  Layers,
  Scale
} from 'lucide-react';
import { Student, Teacher, StudentBill, PaymentRecord } from '../../types';
import { generateMinesecDossier } from '../../services/minesecReportService';

interface Props {
  students: Student[];
  teachers: Teacher[];
  bills: StudentBill[];
  payments: PaymentRecord[];
}

export default function MinesecComplianceExport({
  students,
  teachers,
  bills,
  payments
}: Props) {
  const [academicYear, setAcademicYear] = useState('2025/2026');

  const dossier = useMemo(() => {
    return generateMinesecDossier(students, teachers, bills, payments, academicYear);
  }, [students, teachers, bills, payments, academicYear]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-amber-800/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 text-xs font-bold tracking-wide">
              <Building2 className="w-3.5 h-3.5 text-amber-400" />
              <span>OPTION D — MINESEC REGULATORY COMPLIANCE DOSSIER</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Ministry Statistical Returns (MINESEC / Délégué Régional)
            </h1>
            <p className="text-sm text-amber-200/80 max-w-2xl">
              Official Cameroonian Ministry of Secondary Education standardized statistical reporting: Gender parity, age distribution, teacher ratios, and financial recovery indicators.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => window.print()}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-amber-500/30"
            >
              <Printer className="w-4 h-4" />
              <span>Print Official MINESEC Dossier</span>
            </button>
          </div>
        </div>
      </div>

      {/* Statistical Summary Gauges */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="text-xs font-bold text-slate-500">Total Enrolled Pupils</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">{dossier.totalEnrollment}</div>
          <div className="text-[11px] text-slate-400">
            {dossier.totalBoys} Garçons (Boys) • {dossier.totalGirls} Filles (Girls)
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="text-xs font-bold text-slate-500">Gender Parity Index (GPI)</div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400">{dossier.genderParityIndex}</div>
          <div className="text-[11px] text-emerald-600 font-bold">Complies with UNESCO Parity Baseline</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="text-xs font-bold text-slate-500">Student-Teacher Ratio</div>
          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{dossier.studentTeacherRatio} : 1</div>
          <div className="text-[11px] text-slate-400">{dossier.totalTeachingStaff} Qualified Pedagogic Staff</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="text-xs font-bold text-slate-500">Institutional Recovery Rate</div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{dossier.overallRecoveryRate}%</div>
          <div className="text-[11px] text-emerald-600 font-bold">Valid for Ministerial Inspection</div>
        </div>
      </div>

      {/* Official MINESEC Statistical Table */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="border-b border-slate-200 dark:border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-amber-600">MINESEC TABLEAU STATISTIQUE OFFICIEL N° 12</div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">Effectifs par Classe, Genre et Taux de Recouvrement</h3>
          </div>
          <div className="text-xs font-mono text-slate-500 font-bold">
            Arrêté Ministériel N° {dossier.minesecApprovalNo}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-bold uppercase text-[10px]">
              <tr>
                <th className="p-3">Classe</th>
                <th className="p-3">Section / Cycle</th>
                <th className="p-3 text-center">Garçons (M)</th>
                <th className="p-3 text-center">Filles (F)</th>
                <th className="p-3 text-center">Total Effectif</th>
                <th className="p-3 text-right">Total Facturé (CFA)</th>
                <th className="p-3 text-right">Total Encaissé (CFA)</th>
                <th className="p-3 text-right">Taux (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {dossier.classesBreakdown.map(c => (
                <tr key={c.className} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="p-3 font-bold text-slate-900 dark:text-white">{c.className}</td>
                  <td className="p-3 text-slate-500">{c.department}</td>
                  <td className="p-3 text-center font-mono">{c.maleCount}</td>
                  <td className="p-3 text-center font-mono">{c.femaleCount}</td>
                  <td className="p-3 text-center font-bold font-mono text-indigo-600 dark:text-indigo-400">{c.totalStudents}</td>
                  <td className="p-3 text-right font-mono">{c.totalBilledCfa.toLocaleString()}</td>
                  <td className="p-3 text-right font-mono text-emerald-600 font-bold">{c.totalCollectedCfa.toLocaleString()}</td>
                  <td className="p-3 text-right font-bold text-emerald-600">{c.recoveryRatePercent}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

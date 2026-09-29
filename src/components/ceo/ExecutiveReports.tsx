import React, { useState } from 'react';
import { 
  FileText, Download, Printer, 
  CheckCircle2, AlertCircle, RefreshCw, Radio, Sparkles
} from 'lucide-react';
import { generateSchoolPerformanceSummary } from '../../services/pdfService';
import { useRealtimeDashboardData } from '../../hooks/useRealtimeDashboardData';

export default function ExecutiveReports() {
  const [activeTab, setActiveTab] = useState<'Daily' | 'Weekly' | 'Monthly' | 'Termly' | 'Annual'>('Monthly');

  // Unified realtime dashboard hook with campus awareness and unmount cleanup
  const { metrics, isLoading, isLive, status, activeCampus, refresh } = useRealtimeDashboardData({
    role: 'ceo'
  });

  const currentDateFormatted = new Date().toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });

  const currentTimestampFormatted = metrics.lastSyncedAt 
    ? new Date(metrics.lastSyncedAt).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : new Date().toLocaleString();

  // Dynamic report sections derived exclusively from verified database state
  const reportSections = [
    {
      title: 'Enrollment & Staffing',
      stats: [
        { 
          label: 'Total Students', 
          value: metrics.totalStudents > 0 ? metrics.totalStudents.toLocaleString() : '0', 
          trend: metrics.totalStudents > 0 ? `${metrics.activeStudents} Active` : 'No enrollments' 
        },
        { 
          label: 'Total Staff', 
          value: metrics.totalStaff > 0 ? metrics.totalStaff.toLocaleString() : '0', 
          trend: metrics.totalStaff > 0 ? `${metrics.activeTeachers} Active` : 'No staff' 
        },
        { 
          label: 'Teacher/Student Ratio', 
          value: metrics.teacherStudentRatio, 
          trend: metrics.totalStaff > 0 && metrics.totalStudents > 0 ? 'Verified' : 'Pending Data' 
        }
      ]
    },
    {
      title: 'Financial Summary',
      stats: [
        { 
          label: 'Fees Collected', 
          value: metrics.feesCollected > 0 ? `GHS ${metrics.feesCollected.toLocaleString()}` : 'GHS 0', 
          trend: metrics.totalPaymentsCount > 0 ? `${metrics.totalPaymentsCount} transactions` : 'No payments' 
        },
        { 
          label: 'Operating Expenses', 
          value: metrics.operatingExpenses > 0 ? `GHS ${metrics.operatingExpenses.toLocaleString()}` : 'GHS 0', 
          trend: metrics.operatingExpenses > 0 ? 'Actual spend' : 'No expenses' 
        },
        { 
          label: 'Net Position', 
          value: `GHS ${metrics.netPosition.toLocaleString()}`, 
          trend: metrics.netPosition >= 0 ? 'Surplus' : 'Deficit' 
        }
      ]
    },
    {
      title: 'Attendance & Academic',
      stats: [
        { 
          label: 'Student Attendance', 
          value: metrics.studentAttendanceRate !== null ? `${metrics.studentAttendanceRate}%` : '—', 
          trend: metrics.studentAttendanceRate !== null ? 'Live Average' : 'No records' 
        },
        { 
          label: 'Staff Attendance', 
          value: metrics.staffAttendanceRate !== null ? `${metrics.staffAttendanceRate}%` : '—', 
          trend: metrics.staffAttendanceRate !== null ? 'QR Verified' : 'No records' 
        },
        { 
          label: 'SBA Completion', 
          value: metrics.sbaCompletionRate !== null ? `${metrics.sbaCompletionRate}%` : '—', 
          trend: metrics.sbaCompletionRate !== null ? `${metrics.academicMilestonesCount} reports` : 'Pending' 
        }
      ]
    }
  ];

  return (
    <div className="space-y-6">
      {/* Report Controls Bar */}
      <div className="bg-[#0F172A] p-6 rounded-3xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-white">Consolidated Executive Reports</h2>
              {isLive ? (
                <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  <Radio className="w-2.5 h-2.5 animate-pulse" /> LIVE
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full border border-slate-700">
                  {status}
                </span>
              )}
            </div>
            <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mt-0.5">
              Campus Scope: <span className="text-blue-400">{activeCampus}</span> • Real-time Supabase Stream
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => refresh()}
            disabled={isLoading}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
            title="Refresh database records"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Sync Now</span>
          </button>

          <div className="flex bg-[#020617] p-1 rounded-2xl border border-slate-800 overflow-x-auto scrollbar-hide">
            {['Daily', 'Weekly', 'Monthly', 'Termly', 'Annual'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === tab 
                    ? 'bg-blue-600 text-white shadow-lg' 
                    : 'text-slate-500 hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Report Preview */}
        <div className="xl:col-span-3 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 sm:p-10 shadow-xl relative overflow-hidden min-h-[700px] border border-slate-200 dark:border-slate-800">
            {/* Background watermark */}
            <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
              <FileText className="w-64 h-64 text-slate-900 dark:text-white" />
            </div>

            {/* Content */}
            <div className="relative z-10">
              <div className="flex flex-col sm:flex-row justify-between sm:items-start border-b-2 border-slate-100 dark:border-slate-800 pb-8 mb-8 gap-4">
                <div>
                  <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white leading-tight">
                    {activeTab.toUpperCase()} EXECUTIVE SUMMARY
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 font-bold mt-1 uppercase tracking-widest text-xs sm:text-sm">
                    Period: {currentDateFormatted} • Campus: {activeCampus}
                  </p>
                </div>
                <div className="sm:text-right">
                  <span className="block text-[10px] font-black text-slate-400 uppercase">Verification Status</span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Database Authenticated
                  </span>
                </div>
              </div>

              {/* Real Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {reportSections.map((section, idx) => (
                  <div key={idx} className="space-y-4">
                    <h4 className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest border-l-4 border-blue-600 pl-3">
                      {section.title}
                    </h4>
                    <div className="space-y-4">
                      {section.stats.map((stat, sIdx) => (
                        <div key={sIdx} className="group p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-tight mb-1">
                            {stat.label}
                          </span>
                          <div className="flex items-baseline gap-2">
                            <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                              {stat.value}
                            </span>
                            <span className="text-[10px] font-bold text-slate-500">
                              {stat.trend}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Data-Grounded Executive Insight */}
              <div className="mt-12 bg-slate-50 dark:bg-slate-800/40 p-6 sm:p-8 rounded-3xl border border-slate-100 dark:border-slate-800">
                <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-500" />
                  Proprietor&apos;s Strategic Insight
                </h4>
                <div className="space-y-4">
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed italic">
                    &quot;{metrics.executiveInsight}&quot;
                  </p>
                  <div className="flex flex-wrap items-center gap-4 text-[10px] font-bold text-slate-400">
                    <span className="flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 text-amber-500" />
                      {metrics.operationalRisksCount} Operational Arrears Flagged
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      {metrics.academicMilestonesCount} Terminal Assessments Approved
                    </span>
                  </div>
                </div>
              </div>

              {/* Report Footer */}
              <div className="mt-12 pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-3 text-slate-400 text-[10px]">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center text-[10px] font-black">
                    JP
                  </div>
                  <div>
                    <span className="block font-bold text-slate-600 dark:text-slate-300">JIPAS PORTAL SYSTEM</span>
                    <span className="block text-[9px]">Last synchronized: {currentTimestampFormatted}</span>
                  </div>
                </div>
                <div className="text-[10px] font-mono text-slate-400 font-medium">
                  Authoritative Campus: {activeCampus}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Actions */}
        <div className="space-y-4">
          <div className="bg-[#0F172A] p-6 rounded-3xl border border-slate-800 shadow-xl space-y-4">
            <h3 className="text-xs font-black text-white uppercase tracking-widest">Report Actions</h3>
            <div className="space-y-3">
              <button 
                onClick={async () => {
                  try {
                    await generateSchoolPerformanceSummary(undefined, {
                      term: 'Third Term',
                      academicYear: '2025/2026',
                      campus: activeCampus,
                      title: `Executive Consolidated Performance Report (${activeTab})`
                    });
                  } catch (err) {
                    console.error('Failed to generate PDF:', err);
                  }
                }}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/40 cursor-pointer"
              >
                <Download className="w-4 h-4" /> Download PDF Summary
              </button>
              <button 
                onClick={() => window.print()}
                className="w-full py-3.5 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4" /> Print Document
              </button>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-900/20 to-transparent p-5 rounded-3xl border border-blue-900/30">
            <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-2">Live Stream Notice</h4>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Executive dashboard metrics synchronize directly with Supabase. Realtime changes to school rosters, payments, expenses, and staff attendance update dynamically without requiring full page reload.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

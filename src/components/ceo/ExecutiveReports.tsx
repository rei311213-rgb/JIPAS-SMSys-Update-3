import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, Download, Printer, Filter, 
  Calendar, Users, DollarSign, BookOpen,
  ChevronDown, ArrowRight, CheckCircle2, AlertCircle
} from 'lucide-react';
import { generateSchoolPerformanceSummary } from '../../services/pdfService';
import { getActiveCampus } from '../../lib/campusUtils';

export default function ExecutiveReports() {
  const [activeTab, setActiveTab] = useState<'Daily' | 'Weekly' | 'Monthly' | 'Termly' | 'Annual'>('Monthly');

  const reportData = {
    Monthly: {
      date: 'September 2026',
      sections: [
        { title: 'Enrollment & Staffing', stats: [
          { label: 'Total Students', value: '842', trend: '+12' },
          { label: 'Total Staff', value: '62', trend: '0' },
          { label: 'Teacher/Student Ratio', value: '1:14', trend: 'Optimal' }
        ]},
        { title: 'Financial Summary', stats: [
          { label: 'Fees Collected', value: 'CFA 124,500', trend: '78%' },
          { label: 'Operating Expenses', value: 'CFA 42,100', trend: 'Within Budget' },
          { label: 'Net Position', value: 'CFA 82,400', trend: '+15% MoM' }
        ]},
        { title: 'Attendance & Academic', stats: [
          { label: 'Student Attendance', value: '94.2%', trend: 'Stable' },
          { label: 'Staff Attendance', value: '98.5%', trend: 'Excellent' },
          { label: 'SBA Completion', value: '100%', trend: 'On Time' }
        ]}
      ]
    }
  };

  return (
    <div className="space-y-6">
      {/* Report Controls */}
      <div className="bg-[#0F172A] p-6 rounded-3xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white">Consolidated Executive Reports</h2>
            <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">Multi-Dimensional Performance Audits</p>
          </div>
        </div>

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

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Report Preview */}
        <div className="xl:col-span-3 space-y-6">
          <div className="bg-white rounded-[2rem] p-10 shadow-2xl relative overflow-hidden min-h-[800px]">
            {/* Report Header Decor */}
            <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
              <FileText className="w-64 h-64 text-black" />
            </div>

            {/* Content */}
            <div className="relative z-10">
              <div className="flex justify-between items-start border-b-2 border-slate-100 pb-8 mb-10">
                <div>
                  <h3 className="text-3xl font-black text-slate-900 leading-tight">
                    {activeTab.toUpperCase()} EXECUTIVE SUMMARY
                  </h3>
                  <p className="text-slate-500 font-bold mt-1 uppercase tracking-widest text-sm">
                    Period: {reportData.Monthly.date}
                  </p>
                </div>
                <div className="text-right">
                  <span className="block text-[10px] font-black text-slate-400 uppercase">Document Hash</span>
                  <code className="text-[10px] text-slate-300">JIPAS-EXE-2026-09-20</code>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                {reportData.Monthly.sections.map((section, idx) => (
                  <div key={idx} className="space-y-6">
                    <h4 className="text-xs font-black text-blue-600 uppercase tracking-widest border-l-4 border-blue-600 pl-3">
                      {section.title}
                    </h4>
                    <div className="space-y-6">
                      {section.stats.map((stat, sIdx) => (
                        <div key={sIdx} className="group">
                          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-tight mb-1">{stat.label}</span>
                          <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-black text-slate-900 group-hover:text-blue-600 transition-colors">{stat.value}</span>
                            <span className={`text-[10px] font-bold ${stat.trend.startsWith('+') ? 'text-emerald-500' : 'text-slate-500'}`}>
                              {stat.trend}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Key Insights Section */}
              <div className="mt-16 bg-slate-50 p-8 rounded-3xl border border-slate-100">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Proprietor's Strategic Insight
                </h4>
                <div className="space-y-4">
                  <p className="text-sm text-slate-600 leading-relaxed italic">
                    "Institutional operations are currently performing at 92% efficiency. Financial liquidity has improved following the Term 3 fee collection cycle. Strategic focus should remain on improving Mathematics proficiency in the JHS department and finalizing the new lab installation."
                  </p>
                  <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400">
                    <span className="flex items-center gap-1"><AlertCircle className="w-3 h-3 text-amber-500" /> 3 Operational Risks Flagged</span>
                    <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> 12 Academic Milestones Reached</span>
                  </div>
                </div>
              </div>

              {/* Report Footer */}
              <div className="mt-16 pt-8 border-t border-slate-100 flex justify-between items-center opacity-50">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white text-[10px] font-black">JP</div>
                  <div className="text-[9px] font-bold text-slate-500">
                    <span className="block">JIPAS EDUCATIONAL COMPLEX</span>
                    <span className="block">Generated on Sep 20, 2026 • 14:59</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  {[1, 2, 3].map(i => <div key={i} className="w-2 h-2 rounded-full bg-slate-200" />)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Actions */}
        <div className="space-y-4">
          <div className="bg-[#0F172A] p-6 rounded-3xl border border-slate-800 shadow-xl">
            <h3 className="text-xs font-black text-white uppercase tracking-widest mb-6">Report Actions</h3>
            <div className="space-y-3">
              <button 
                onClick={async () => {
                  try {
                    const campus = getActiveCampus();
                    await generateSchoolPerformanceSummary(undefined, {
                      term: 'Third Term',
                      academicYear: '2025/2026',
                      campus,
                      title: `Executive Consolidated Performance Report (${activeTab})`
                    });
                  } catch (err) {
                    console.error('Failed to generate PDF:', err);
                    alert('Unable to generate PDF report.');
                  }
                }}
                className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/40 cursor-pointer"
              >
                <Download className="w-4 h-4" /> Download PDF Summary
              </button>
              <button 
                onClick={() => window.print()}
                className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4" /> Print Document
              </button>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-900/20 to-transparent p-6 rounded-3xl border border-blue-900/30">
            <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-2">Notice</h4>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Consolidated reports are auto-generated every Saturday at 23:59 GMT. Data includes all verified financial transactions and finalized academic results.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

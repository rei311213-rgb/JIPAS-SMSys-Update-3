import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Trophy, Medal, Award, TrendingUp, Users, 
  Search, Filter, Download, ArrowUpRight, 
  ChevronRight, Sparkles, BarChart3, Star
} from 'lucide-react';
import { TermReport } from '../../types';
import { getStoredReports } from '../../services/storageService';

interface TopPerformingClassesProps {
  reports?: TermReport[];
}

export default function TopPerformingClasses({ reports: propReports }: TopPerformingClassesProps) {
  const [loading, setLoading] = useState(true);
  const [rankedClasses, setRankedClasses] = useState<any[]>([]);
  const [selectedTerm, setSelectedTerm] = useState('Term 1');
  const [selectedYear, setSelectedYear] = useState('2025/2026');

  useEffect(() => {
    fetchClassPerformance();
  }, [selectedTerm, selectedYear, propReports]);

  const fetchClassPerformance = async () => {
    setLoading(true);
    try {
      let reports: TermReport[] = [];
      if (propReports && propReports.length > 0) {
        reports = propReports;
      } else {
        reports = getStoredReports();
      }
      
      // Calculate averages per class
      const classGroups: Record<string, { totalScore: number, studentCount: number }> = {};
      
      reports.forEach(report => {
        const cName = report.className || 'General';
        if (!classGroups[cName]) {
          classGroups[cName] = { totalScore: 0, studentCount: 0 };
        }
        classGroups[cName].totalScore += (report.averageScore ?? report.totalScore ?? 0);
        classGroups[cName].studentCount += 1;
      });
      
      const ranked = Object.keys(classGroups).map(className => ({
        className,
        averagePerformance: Math.round((classGroups[className].totalScore / (classGroups[className].studentCount || 1)) * 10) / 10,
        studentCount: classGroups[className].studentCount,
        passRate: Math.round((reports.filter(r => r.className === className && (r.averageScore ?? 0) >= 50).length / (classGroups[className].studentCount || 1)) * 100),
      })).sort((a, b) => b.averagePerformance - a.averagePerformance);
      
      setRankedClasses(ranked);
    } catch (err) {
      console.warn('Class performance handled with fallback:', err);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (index: number) => {
    switch(index) {
      case 0: return <Trophy className="w-5 h-5 text-yellow-400" />;
      case 1: return <Medal className="w-5 h-5 text-slate-300" />;
      case 2: return <Award className="w-5 h-5 text-amber-600" />;
      default: return <span className="text-xs font-black text-slate-500">{index + 1}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#020617] p-8 rounded-3xl border border-slate-800 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-3 uppercase tracking-tight">
            <Trophy className="text-yellow-400" />
            Class Performance Rankings
          </h2>
          <p className="text-slate-400 text-sm mt-1">Real-time academic leaderboard based on current term averages.</p>
        </div>

        <div className="flex items-center gap-3">
          <select 
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="bg-[#0F172A] border border-slate-800 text-xs font-bold text-white px-4 py-2 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option>2025/2026</option>
            <option>2024/2025</option>
          </select>
          <select 
            value={selectedTerm}
            onChange={(e) => setSelectedTerm(e.target.value)}
            className="bg-[#0F172A] border border-slate-800 text-xs font-bold text-white px-4 py-2 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option>Term 1</option>
            <option>Term 2</option>
            <option>Term 3</option>
          </select>
          <button className="p-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl border border-slate-700 transition-all cursor-pointer">
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-[#0F172A] rounded-3xl border border-slate-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-900/50 border-b border-slate-800">
                <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Rank</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Class Name</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Population</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Pass Rate</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Avg Performance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {loading ? (
                [1, 2, 3, 4, 5].map(i => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="px-8 py-6 h-16 bg-slate-900/20"></td>
                  </tr>
                ))
              ) : rankedClasses.length > 0 ? (
                rankedClasses.map((item, index) => (
                  <motion.tr 
                    key={item.className}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-slate-800/30 transition-all group"
                  >
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        {getRankIcon(index)}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black ${
                          index < 3 ? 'bg-blue-600/20 text-blue-400' : 'bg-slate-800 text-slate-500'
                        }`}>
                          {item.className.substring(0, 2).toUpperCase()}
                        </div>
                        <span className="font-black text-white text-sm tracking-tight">{item.className}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2 text-slate-400 font-bold text-xs">
                        <Users className="w-3.5 h-3.5" />
                        {item.studentCount} Students
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col gap-1.5 w-32">
                        <div className="flex justify-between items-center text-[9px] font-black text-slate-500 uppercase">
                          <span>Success</span>
                          <span>{item.passRate}%</span>
                        </div>
                        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${item.passRate}%` }}
                            className={`h-full rounded-full ${
                              item.passRate > 80 ? 'bg-emerald-500' : 
                              item.passRate > 60 ? 'bg-blue-500' : 'bg-rose-500'
                            }`}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex flex-col items-end">
                        <span className={`text-xl font-black ${
                          item.averagePerformance >= 80 ? 'text-emerald-400' : 
                          item.averagePerformance >= 70 ? 'text-blue-400' : 
                          item.averagePerformance >= 60 ? 'text-amber-400' : 'text-rose-400'
                        }`}>
                          {item.averagePerformance}%
                        </span>
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Weighted Average</span>
                      </div>
                    </td>
                  </motion.tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Star className="w-10 h-10 text-slate-700" />
                      <p className="text-slate-500 text-sm font-bold">No academic records found for this term.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Insights Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-emerald-900/10 border border-emerald-900/30 p-6 rounded-3xl">
          <div className="flex items-center gap-3 text-emerald-400 font-black uppercase tracking-widest text-[10px] mb-2">
            <Sparkles className="w-4 h-4" /> Leading Edge
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            The highest performing class currently is <span className="text-white font-black">{rankedClasses[0]?.className || 'N/A'}</span> with an exceptional average of <span className="text-white font-black">{rankedClasses[0]?.averagePerformance || 0}%</span>.
          </p>
        </div>

        <div className="bg-blue-900/10 border border-blue-900/30 p-6 rounded-3xl">
          <div className="flex items-center gap-3 text-blue-400 font-black uppercase tracking-widest text-[10px] mb-2">
            <BarChart3 className="w-4 h-4" /> Academic Density
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Institutional average across all classes stands at <span className="text-white font-black">
              {rankedClasses.length > 0 ? Math.round(rankedClasses.reduce((acc, c) => acc + c.averagePerformance, 0) / rankedClasses.length) : 0}%
            </span> for this period.
          </p>
        </div>

        <div className="bg-rose-900/10 border border-rose-900/30 p-6 rounded-3xl">
          <div className="flex items-center gap-3 text-rose-400 font-black uppercase tracking-widest text-[10px] mb-2">
            <TrendingUp className="w-4 h-4" /> Growth Opportunity
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Targeting a 5% increase in lower-performing cohorts through academic intervention programs scheduled for the upcoming term.
          </p>
        </div>
      </div>
    </div>
  );
}

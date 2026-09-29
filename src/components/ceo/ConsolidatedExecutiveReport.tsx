import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  FileText, Calendar, Download, TrendingUp, Users, 
  DollarSign, Briefcase, CheckCircle2, 
  Activity, Globe, Search, ArrowUpRight, ArrowDownRight, RefreshCw, Radio
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, Legend
} from 'recharts';
import { Student, PaymentRecord, SchoolExpenseRecord, StudentAttendanceRecord } from '../../types';
import { getStoredStudents, getStoredPayments, getStoredExpenses, getStoredStudentAttendance, getStoredTeachers } from '../../services/storageService';
import { getActiveCampus, filterStudentsByCampus, filterPaymentsByCampus, filterExpensesByCampus, filterTeachersByCampus } from '../../lib/campusUtils';
import { StaffAttendanceService } from '../../services/supabase/staffAttendanceService';
import { useRealtimeDashboardData } from '../../hooks/useRealtimeDashboardData';
import { addMoney, subtractMoney } from '../../utils/financeUtils';

type TimeRange = 'Daily' | 'Weekly' | 'Monthly' | 'Termly' | 'Annual';

export default function ConsolidatedExecutiveReport() {
  const [timeRange, setTimeRange] = useState<TimeRange>('Monthly');
  const activeCampus = getActiveCampus();

  const { metrics, isLoading, isLive, refresh } = useRealtimeDashboardData({
    role: 'ceo',
    campus: activeCampus
  });

  const [staffAttRate, setStaffAttRate] = useState<number | null>(null);

  useEffect(() => {
    async function loadStaffAtt() {
      try {
        const today = new Date().toISOString().split('T')[0];
        const logs = await StaffAttendanceService.listAttendance({ date: today });
        if (logs && logs.length > 0) {
          const present = logs.filter(l => l.status === 'Present' || l.status === 'Late').length;
          setStaffAttRate(Math.round((present / logs.length) * 100));
        } else {
          setStaffAttRate(null);
        }
      } catch {
        setStaffAttRate(null);
      }
    }
    loadStaffAtt();
  }, [activeCampus]);

  // Derived filtered records
  const allStudents = useMemo(() => filterStudentsByCampus(getStoredStudents(), activeCampus), [activeCampus]);
  const allTeachers = useMemo(() => filterTeachersByCampus(getStoredTeachers(), activeCampus), [activeCampus]);
  const allPayments = useMemo(() => filterPaymentsByCampus(getStoredPayments(), allStudents, activeCampus), [allStudents, activeCampus]);
  const allExpenses = useMemo(() => filterExpensesByCampus(getStoredExpenses(), activeCampus), [activeCampus]);
  const allAttendance = useMemo(() => getStoredStudentAttendance(), []);

  // Filter records by time range
  const { filteredPayments, filteredExpenses, admissionsCount } = useMemo(() => {
    const now = new Date();
    const startDate = new Date();

    switch (timeRange) {
      case 'Daily': startDate.setHours(0, 0, 0, 0); break;
      case 'Weekly': startDate.setDate(now.getDate() - 7); break;
      case 'Monthly': startDate.setMonth(now.getMonth() - 1); break;
      case 'Termly': startDate.setMonth(now.getMonth() - 4); break;
      case 'Annual': startDate.setFullYear(now.getFullYear() - 1); break;
    }

    const pay = allPayments.filter(p => {
      if (!p.date) return true;
      const d = new Date(p.date);
      return d >= startDate && d <= now;
    });

    const exp = allExpenses.filter(e => {
      if (!e.date) return true;
      const d = new Date(e.date);
      return d >= startDate && d <= now;
    });

    const adm = allStudents.filter(s => {
      if (!s.enrollmentDate) return true;
      const d = new Date(s.enrollmentDate);
      return d >= startDate && d <= now;
    }).length;

    return {
      filteredPayments: pay,
      filteredExpenses: exp,
      admissionsCount: adm
    };
  }, [allPayments, allExpenses, allStudents, timeRange]);

  const totalRevenue = useMemo(() => {
    return addMoney(...filteredPayments.map(p => p.paid || (p as any).amount || 0));
  }, [filteredPayments]);

  const totalExpenses = useMemo(() => {
    return addMoney(...filteredExpenses.map(e => e.amount || 0));
  }, [filteredExpenses]);

  // Real financial trends grouped by date
  const financialTrends = useMemo(() => {
    const dateMap: Record<string, { revenue: number; expense: number }> = {};

    filteredPayments.forEach(p => {
      const dateKey = p.date ? p.date.split('-').slice(1).join('/') : 'Recent';
      if (!dateMap[dateKey]) dateMap[dateKey] = { revenue: 0, expense: 0 };
      dateMap[dateKey].revenue = addMoney(dateMap[dateKey].revenue, p.paid || (p as any).amount || 0);
    });

    filteredExpenses.forEach(e => {
      const dateKey = e.date ? e.date.split('-').slice(1).join('/') : 'Recent';
      if (!dateMap[dateKey]) dateMap[dateKey] = { revenue: 0, expense: 0 };
      dateMap[dateKey].expense = addMoney(dateMap[dateKey].expense, e.amount || 0);
    });

    const keys = Object.keys(dateMap).slice(-10);
    if (keys.length === 0) {
      return [{ name: 'No Data', revenue: 0, expense: 0 }];
    }
    return keys.map(k => ({
      name: k,
      revenue: dateMap[k].revenue,
      expense: dateMap[k].expense
    }));
  }, [filteredPayments, filteredExpenses]);

  // Real revenue by method/category breakdown
  const revenueByCategory = useMemo(() => {
    const catMap: Record<string, number> = {};
    filteredPayments.forEach(p => {
      const category = (p as any).category || p.method || 'General Fees';
      catMap[category] = addMoney(catMap[category] || 0, p.paid || (p as any).amount || 0);
    });

    const entries = Object.entries(catMap).map(([name, value]) => ({ name, value }));
    if (entries.length === 0) {
      return [{ name: 'No Collections Yet', value: 1 }];
    }
    return entries;
  }, [filteredPayments]);

  const avgStudentAttendance = useMemo(() => {
    if (allAttendance.length === 0) return null;
    let presentCount = 0;
    let totalCount = 0;
    allAttendance.forEach(rec => {
      if (rec.records) {
        Object.values(rec.records).forEach((status: any) => {
          totalCount++;
          if (status === 'Present') presentCount++;
        });
      }
    });
    return totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : null;
  }, [allAttendance]);

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  return (
    <div className="space-y-8">
      {/* Report Header */}
      <div className="bg-[#020617] p-8 rounded-3xl border border-slate-800 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <FileText className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-white leading-tight uppercase tracking-tight">
                  Consolidated Executive Report
                </h1>
                {isLive && (
                  <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    <Radio className="w-2.5 h-2.5 animate-pulse" /> LIVE
                  </span>
                )}
              </div>
              <p className="text-slate-400 text-sm mt-0.5">
                Authentic institutional intelligence for {activeCampus} ({timeRange} scope).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => refresh()}
              disabled={isLoading}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
              title="Refresh database records"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="text-[10px] font-bold uppercase tracking-wider">Sync Data</span>
            </button>

            <div className="flex bg-[#0F172A] p-1 rounded-xl border border-slate-800 shadow-inner">
              {(['Daily', 'Weekly', 'Monthly', 'Termly', 'Annual'] as TimeRange[]).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                    timeRange === range 
                      ? 'bg-blue-600 text-white shadow-lg' 
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>

            <button 
              onClick={() => window.print()} 
              className="p-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl border border-slate-700 transition-all cursor-pointer"
              title="Print document"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Primary KPI Grid (All values derived from verified database state) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { 
            label: 'Admissions in Period', 
            value: admissionsCount > 0 ? admissionsCount.toLocaleString() : '0', 
            icon: Users, 
            color: 'text-blue-400', 
            bg: 'bg-blue-400/10', 
            trend: `${allStudents.length} total enrolled` 
          },
          { 
            label: 'Fees Collected', 
            value: totalRevenue > 0 ? `GHS ${totalRevenue.toLocaleString()}` : 'GHS 0', 
            icon: DollarSign, 
            color: 'text-emerald-400', 
            bg: 'bg-emerald-400/10', 
            trend: `${filteredPayments.length} transactions` 
          },
          { 
            label: 'Operating Expenses', 
            value: totalExpenses > 0 ? `GHS ${totalExpenses.toLocaleString()}` : 'GHS 0', 
            icon: TrendingUp, 
            color: 'text-rose-400', 
            bg: 'bg-rose-400/10', 
            trend: `${filteredExpenses.length} disbursements` 
          },
          { 
            label: 'Student Attendance', 
            value: avgStudentAttendance !== null ? `${avgStudentAttendance}%` : '—', 
            icon: Activity, 
            color: 'text-amber-400', 
            bg: 'bg-amber-400/10', 
            trend: avgStudentAttendance !== null ? 'Live Verified' : 'No records' 
          },
        ].map((kpi, idx) => (
          <div 
            key={idx}
            className="bg-[#0F172A] p-6 rounded-3xl border border-slate-800 shadow-xl group hover:border-slate-700 transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 rounded-2xl ${kpi.bg} flex items-center justify-center ${kpi.color} group-hover:scale-110 transition-transform`}>
                <kpi.icon className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-black px-2 py-1 rounded-full bg-slate-800 text-slate-300">
                {kpi.trend}
              </span>
            </div>
            <span className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1">{kpi.label}</span>
            <span className="text-2xl font-black text-white">{kpi.value}</span>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#0F172A] p-8 rounded-3xl border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <TrendingUp className="text-blue-400" /> Revenue vs Expenditure ({timeRange})
            </h3>
            <div className="flex gap-4">
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div> Revenue
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div> Expenses
              </div>
            </div>
          </div>
          
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={financialTrends}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '12px' }} />
                <Area type="monotone" dataKey="revenue" stroke="#3B82F6" fillOpacity={1} fill="url(#colorRev)" strokeWidth={3} />
                <Area type="monotone" dataKey="expense" stroke="#EF4444" fillOpacity={1} fill="url(#colorExp)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#0F172A] p-8 rounded-3xl border border-slate-800 shadow-xl flex flex-col">
          <h3 className="text-lg font-black text-white mb-8 flex items-center gap-2">
            <DollarSign className="text-emerald-400" /> Revenue Stream Breakdown
          </h3>
          <div className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={revenueByCategory}
                  innerRadius={75}
                  outerRadius={105}
                  paddingAngle={6}
                  dataKey="value"
                >
                  {revenueByCategory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '12px' }} />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-6 space-y-3">
            {revenueByCategory.map((item, i) => (
              <div key={i} className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-bold">{item.name}</span>
                <span className="text-white font-black">
                  {totalRevenue > 0 ? `GHS ${item.value.toLocaleString()}` : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Module Specific Summaries */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#0F172A] p-8 rounded-3xl border border-slate-800 shadow-xl">
          <h3 className="text-sm font-black text-white mb-6 uppercase tracking-[0.2em] flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-blue-400" /> Staff & Personnel Logistics
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-900 rounded-2xl border border-slate-800">
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-slate-500" />
                <span className="text-xs text-slate-300 font-bold">Staff Attendance Rate</span>
              </div>
              <span className="text-sm font-black text-emerald-400">
                {staffAttRate !== null ? `${staffAttRate}%` : 'No logs today'}
              </span>
            </div>
            <div className="flex items-center justify-between p-4 bg-slate-900 rounded-2xl border border-slate-800">
              <div className="flex items-center gap-3">
                <Users className="w-4 h-4 text-slate-500" />
                <span className="text-xs text-slate-300 font-bold">Total Active Staff</span>
              </div>
              <span className="text-sm font-black text-blue-400">
                {allTeachers.length > 0 ? `${allTeachers.length} personnel` : '0 personnel'}
              </span>
            </div>
            <div className="flex items-center justify-between p-4 bg-slate-900 rounded-2xl border border-slate-800">
              <div className="flex items-center gap-3">
                <Activity className="w-4 h-4 text-slate-500" />
                <span className="text-xs text-slate-300 font-bold">Teacher / Student Ratio</span>
              </div>
              <span className="text-sm font-black text-amber-400">
                {allTeachers.length > 0 && allStudents.length > 0 
                  ? `1:${Math.max(1, Math.round(allStudents.length / allTeachers.length))}` 
                  : '—'}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-[#0F172A] p-8 rounded-3xl border border-slate-800 shadow-xl">
          <h3 className="text-sm font-black text-white mb-6 uppercase tracking-[0.2em] flex items-center gap-2">
            <Globe className="w-4 h-4 text-emerald-400" /> Operational Health & Liquidity
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-900 rounded-2xl border border-slate-800">
              <div className="flex items-center gap-3">
                <Search className="w-4 h-4 text-slate-500" />
                <span className="text-xs text-slate-300 font-bold">Net Cash Position</span>
              </div>
              <span className={`text-sm font-black ${subtractMoney(totalRevenue, totalExpenses) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                GHS {subtractMoney(totalRevenue, totalExpenses).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between p-4 bg-slate-900 rounded-2xl border border-slate-800">
              <div className="flex items-center gap-3">
                <ArrowUpRight className="w-4 h-4 text-slate-500" />
                <span className="text-xs text-slate-300 font-bold">Revenue Transactions</span>
              </div>
              <span className="text-sm font-black text-emerald-400">
                {filteredPayments.length} recorded
              </span>
            </div>
            <div className="flex items-center justify-between p-4 bg-slate-900 rounded-2xl border border-slate-800">
              <div className="flex items-center gap-3">
                <ArrowDownRight className="w-4 h-4 text-slate-500" />
                <span className="text-xs text-slate-300 font-bold">Expense Disbursements</span>
              </div>
              <span className="text-sm font-black text-rose-400">
                {filteredExpenses.length} recorded
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

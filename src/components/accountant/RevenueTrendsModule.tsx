import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { 
  TrendingUp, Calendar, DollarSign, ArrowUpRight, Filter, 
  Download, Layers, CreditCard, Sparkles, Receipt, CheckCircle2, ChevronRight 
} from 'lucide-react';
import { PaymentRecord, Student, StudentBill } from '../../types';

interface RevenueTrendsModuleProps {
  payments: PaymentRecord[];
  students?: Student[];
  bills?: StudentBill[];
  onNavigateToCollections?: () => void;
}

interface MonthlyAggregate {
  key: string;
  monthLabel: string;
  year: number;
  monthIndex: number;
  totalRevenue: number;
  transactionCount: number;
  averagePayment: number;
  cumulativeRevenue: number;
  cashRevenue: number;
  momoRevenue: number;
  bankRevenue: number;
  chequeRevenue: number;
}

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const METHOD_COLORS: Record<string, string> = {
  'Mobile Money': '#0284c7', // Sky blue
  'Cash': '#10b981',         // Emerald
  'Bank Transfer': '#6366f1', // Indigo
  'Cheque': '#f59e0b',        // Amber
  'Other': '#64748b'          // Slate
};

export default function RevenueTrendsModule({
  payments,
  students = [],
  bills = [],
  onNavigateToCollections
}: RevenueTrendsModuleProps) {
  const [selectedDepartment, setSelectedDepartment] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'monthly' | 'cumulative' | 'breakdown' | 'outstanding-fees' | 'department-performance'>('monthly');

  // 1. Outstanding fee data by class
  const outstandingDataByClass = useMemo(() => {
    const classMap = new Map<string, { className: string; billed: number; paid: number; outstanding: number }>();
    
    bills.forEach(b => {
      const clsName = b.className || 'Unknown';
      const current = classMap.get(clsName) || { className: clsName, billed: 0, paid: 0, outstanding: 0 };
      
      current.billed += b.payable || 0;
      current.paid += b.paid || 0;
      current.outstanding += b.balance || 0;
      
      classMap.set(clsName, current);
    });
    
    return Array.from(classMap.values())
      .sort((a, b) => b.outstanding - a.outstanding) // Sort by highest outstanding
      .slice(0, 8); // Top 8 classes
  }, [bills]);

  // 2. Department-wise performance
  const departmentPerformanceData = useMemo(() => {
    const depts = ['Pre School', 'Primary School', 'Junior High School', 'Senior High School'];
    return depts.map(dept => {
      let billed = 0;
      let paid = 0;
      let outstanding = 0;
      
      bills.forEach(b => {
        const student = students.find(s => s.id === b.studentId || s.admissionNo === b.admissionNo);
        const sDept = (b as any).department || student?.department || '';
        
        const isMatch = sDept === dept || 
          (dept === 'Junior High School' && (sDept === 'JHS' || sDept === 'Junior High School')) || 
          (dept === 'Senior High School' && (sDept === 'SHS' || sDept === 'Senior High School'));
        
        if (isMatch) {
          billed += b.payable || 0;
          paid += b.paid || 0;
          outstanding += b.balance || 0;
        }
      });
      
      const rate = billed > 0 ? Math.round((paid / billed) * 100) : 0;
      
      return {
        department: dept,
        billed,
        paid,
        outstanding,
        rate
      };
    });
  }, [bills, students]);

  // Filter payments by department if selected
  const filteredPayments = useMemo(() => {
    if (selectedDepartment === 'All') return payments;
    return payments.filter(p => {
      if (p.department) return p.department === selectedDepartment;
      const student = students.find(s => s.id === p.studentId || s.admissionNo === p.admissionNo);
      return student?.department === selectedDepartment;
    });
  }, [payments, selectedDepartment, students]);

  // Aggregate monthly data
  const monthlyData = useMemo(() => {
    const map = new Map<string, {
      totalRevenue: number;
      transactionCount: number;
      cashRevenue: number;
      momoRevenue: number;
      bankRevenue: number;
      chequeRevenue: number;
      year: number;
      monthIndex: number;
    }>();

    filteredPayments.forEach(p => {
      // Parse date: p.date could be YYYY-MM-DD or DD/MM/YYYY or standard ISO
      let d = new Date(p.date);
      if (isNaN(d.getTime())) {
        // Fallback parse for DD/MM/YYYY
        const parts = p.date.split(/[-/]/);
        if (parts.length === 3) {
          if (parts[0].length === 4) {
            d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
          } else {
            d = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
          }
        }
      }

      if (isNaN(d.getTime())) {
        d = new Date();
      }

      const year = d.getFullYear();
      const monthIndex = d.getMonth();
      const key = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;

      const current = map.get(key) || {
        totalRevenue: 0,
        transactionCount: 0,
        cashRevenue: 0,
        momoRevenue: 0,
        bankRevenue: 0,
        chequeRevenue: 0,
        year,
        monthIndex
      };

      const amt = p.paid || 0;
      current.totalRevenue += amt;
      current.transactionCount += 1;

      const method = (p.method || p.paymentMethod || '').toLowerCase();
      if (method.includes('momo') || method.includes('mobile')) {
        current.momoRevenue += amt;
      } else if (method.includes('cash')) {
        current.cashRevenue += amt;
      } else if (method.includes('bank')) {
        current.bankRevenue += amt;
      } else if (method.includes('cheque') || method.includes('check')) {
        current.chequeRevenue += amt;
      } else {
        current.cashRevenue += amt;
      }

      map.set(key, current);
    });

    // Sort chronologically
    const sortedKeys = Array.from(map.keys()).sort();

    let cumulative = 0;
    const result: MonthlyAggregate[] = sortedKeys.map(key => {
      const item = map.get(key)!;
      cumulative += item.totalRevenue;

      return {
        key,
        monthLabel: `${MONTH_NAMES[item.monthIndex]} ${item.year}`,
        year: item.year,
        monthIndex: item.monthIndex,
        totalRevenue: item.totalRevenue,
        transactionCount: item.transactionCount,
        averagePayment: item.transactionCount > 0 ? Math.round(item.totalRevenue / item.transactionCount) : 0,
        cumulativeRevenue: cumulative,
        cashRevenue: item.cashRevenue,
        momoRevenue: item.momoRevenue,
        bankRevenue: item.bankRevenue,
        chequeRevenue: item.chequeRevenue
      };
    });

    return result;
  }, [filteredPayments]);

  // Overall summary metrics
  const totalRevenue = useMemo(() => {
    return filteredPayments.reduce((sum, p) => sum + (p.paid || 0), 0);
  }, [filteredPayments]);

  const peakMonth = useMemo(() => {
    if (monthlyData.length === 0) return null;
    return [...monthlyData].sort((a, b) => b.totalRevenue - a.totalRevenue)[0];
  }, [monthlyData]);

  const averageMonthlyRevenue = useMemo(() => {
    if (monthlyData.length === 0) return 0;
    return Math.round(totalRevenue / monthlyData.length);
  }, [totalRevenue, monthlyData]);

  // Method distribution for pie chart
  const methodDistribution = useMemo(() => {
    let cash = 0;
    let momo = 0;
    let bank = 0;
    let cheque = 0;

    filteredPayments.forEach(p => {
      const amt = p.paid || 0;
      const m = (p.method || p.paymentMethod || '').toLowerCase();
      if (m.includes('momo') || m.includes('mobile')) {
        momo += amt;
      } else if (m.includes('bank')) {
        bank += amt;
      } else if (m.includes('cheque') || m.includes('check')) {
        cheque += amt;
      } else {
        cash += amt;
      }
    });

    return [
      { name: 'Mobile Money', value: momo, color: METHOD_COLORS['Mobile Money'] },
      { name: 'Cash', value: cash, color: METHOD_COLORS['Cash'] },
      { name: 'Bank Transfer', value: bank, color: METHOD_COLORS['Bank Transfer'] },
      { name: 'Cheque', value: cheque, color: METHOD_COLORS['Cheque'] }
    ].filter(item => item.value > 0);
  }, [filteredPayments]);

  // Export monthly summary report to CSV
  const handleExportMonthlyCSV = () => {
    if (monthlyData.length === 0) return;

    const headers = [
      'Month',
      'Year',
      'Total Collection (CFA)',
      'Transaction Count',
      'Average Payment (CFA)',
      'Cumulative Total (CFA)',
      'Cash (CFA)',
      'Mobile Money (CFA)',
      'Bank Transfer (CFA)'
    ];

    const rows = monthlyData.map(m => [
      `"${m.monthLabel}"`,
      m.year,
      (m.totalRevenue ?? 0).toFixed(2),
      m.transactionCount,
      (m.averagePayment ?? 0).toFixed(2),
      (m.cumulativeRevenue ?? 0).toFixed(2),
      (m.cashRevenue ?? 0).toFixed(2),
      (m.momoRevenue ?? 0).toFixed(2),
      (m.bankRevenue ?? 0).toFixed(2)
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `JIPAS_Monthly_Revenue_Trends_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-8">
      {/* Module Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-indigo-100 text-indigo-800 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Recharts Analytics Engine
            </span>
            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase">
              Live Stored Records
            </span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-indigo-600" />
            Revenue & Fee Collection Trends
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Visualizing monthly fee collection trajectory, cashflow velocity, and channel distribution
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-stretch md:self-auto">
          {/* Department Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500 font-medium">Dept:</span>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="All">All Departments</option>
              <option value="Pre School">Pre School</option>
              <option value="Primary School">Primary School</option>
              <option value="Junior High School">Junior High School</option>
              <option value="Senior High School">Senior High School</option>
            </select>
          </div>

          {/* Export Button */}
          <button
            type="button"
            onClick={handleExportMonthlyCSV}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Trends (CSV)</span>
          </button>
        </div>
      </div>

      {/* KPI Highlight Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Total Collections</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 tracking-tight font-mono">
            {totalRevenue.toLocaleString()} <span className="text-xs font-bold text-slate-400">CFA</span>
          </p>
          <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Across {filteredPayments.length} verified receipts
          </span>
        </div>

        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Peak Revenue Month</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-700">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 tracking-tight">
            {peakMonth ? peakMonth.monthLabel : 'N/A'}
          </p>
          <span className="text-[11px] font-semibold text-indigo-700 font-mono">
            {peakMonth ? `${peakMonth.totalRevenue.toLocaleString()} CFA` : '0 CFA'}
          </span>
        </div>

        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Monthly Average</span>
            <div className="w-8 h-8 rounded-xl bg-cyan-100 flex items-center justify-center text-cyan-700">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 tracking-tight font-mono">
            {averageMonthlyRevenue.toLocaleString()} <span className="text-xs font-bold text-slate-400">CFA</span>
          </p>
          <span className="text-[11px] font-semibold text-slate-500">
            Across {monthlyData.length || 1} active collection months
          </span>
        </div>

        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Digital Payments Share</span>
            <div className="w-8 h-8 rounded-xl bg-sky-100 flex items-center justify-center text-sky-700">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 tracking-tight font-mono">
            {totalRevenue > 0 
              ? `${Math.round(((methodDistribution.find(m => m.name === 'Mobile Money')?.value || 0) / totalRevenue) * 100)}%`
              : '0%'
            }
          </p>
          <span className="text-[11px] font-semibold text-sky-700">
            Mobile Money & Bank Transfers
          </span>
        </div>
      </div>

      {/* Chart View Switcher */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center border-b border-slate-200 pb-4 gap-4">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setViewMode('monthly')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'monthly'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Monthly Collections Bar Chart
          </button>
          <button
            type="button"
            onClick={() => setViewMode('cumulative')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'cumulative'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Cumulative Trajectory Area Chart
          </button>
          <button
            type="button"
            onClick={() => setViewMode('breakdown')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'breakdown'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Payment Channels Split
          </button>
          <button
            type="button"
            onClick={() => setViewMode('outstanding-fees')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'outstanding-fees'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Outstanding Fee Summary
          </button>
          <button
            type="button"
            onClick={() => setViewMode('department-performance')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'department-performance'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Department Collection Performance
          </button>
        </div>

        {onNavigateToCollections && (
          <button
            type="button"
            onClick={onNavigateToCollections}
            className="hidden sm:flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
          >
            <span>View All Payment Receipts</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Main Charts Area */}
      {monthlyData.length === 0 ? (
        <div className="py-16 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          <Receipt className="w-10 h-10 mx-auto mb-2 text-slate-300" />
          <p className="text-sm font-bold text-slate-600">No payment records available for revenue trends</p>
          <p className="text-xs text-slate-400 mt-1">Payment collections recorded through the bursary will be charted here automatically.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* VIEW 1: MONTHLY BAR CHART */}
          {viewMode === 'monthly' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Monthly Tuition & Fee Revenue (CFA)</h3>
                  <p className="text-xs text-slate-400">Total fees deposited and reconciled per calendar month</p>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-indigo-600 inline-block" />
                    <span className="text-slate-600 font-medium">Monthly Collection</span>
                  </div>
                </div>
              </div>

              <div className="h-80 w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData} margin={{ top: 10, right: 20, left: 10, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="monthLabel" 
                      tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
                      stroke="#cbd5e1"
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{ fill: '#64748b', fontSize: 11, fontFamily: 'monospace' }}
                      stroke="#cbd5e1"
                      tickLine={false}
                      tickFormatter={(val) => val >= 1000 ? `${((val ?? 0) / 1000).toFixed(0)}k` : val}
                    />
                    <Tooltip 
                      formatter={(value: any) => [`${Number(value).toLocaleString()} CFA`, 'Total Revenue']}
                      labelFormatter={(label) => `Month: ${label}`}
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderRadius: '12px',
                        border: 'none',
                        color: '#ffffff',
                        fontSize: '12px',
                        fontWeight: 600,
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.2)'
                      }}
                    />
                    <Bar 
                      dataKey="totalRevenue" 
                      fill="#4f46e5" 
                      radius={[8, 8, 0, 0]} 
                      maxBarSize={48}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* VIEW 2: CUMULATIVE TRAJECTORY AREA CHART */}
          {viewMode === 'cumulative' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Cumulative Revenue Velocity</h3>
                  <p className="text-xs text-slate-400">Cumulative cash collected across the academic session</p>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                  <span>Total Reached: {totalRevenue.toLocaleString()} CFA</span>
                </div>
              </div>

              <div className="h-80 w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyData} margin={{ top: 10, right: 20, left: 10, bottom: 25 }}>
                    <defs>
                      <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#059669" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#059669" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="monthLabel" 
                      tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
                      stroke="#cbd5e1"
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{ fill: '#64748b', fontSize: 11, fontFamily: 'monospace' }}
                      stroke="#cbd5e1"
                      tickLine={false}
                      tickFormatter={(val) => val >= 1000 ? `${((val ?? 0) / 1000).toFixed(0)}k` : val}
                    />
                    <Tooltip 
                      formatter={(value: any) => [`${Number(value).toLocaleString()} CFA`, 'Cumulative Collections']}
                      labelFormatter={(label) => `Month: ${label}`}
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderRadius: '12px',
                        border: 'none',
                        color: '#ffffff',
                        fontSize: '12px',
                        fontWeight: 600,
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.2)'
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="cumulativeRevenue" 
                      stroke="#059669" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#revenueGrad)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* VIEW 3: PAYMENT CHANNELS SPLIT */}
          {viewMode === 'breakdown' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center pt-2">
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={methodDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={95}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {methodDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: any) => [`${Number(value).toLocaleString()} CFA`, 'Amount']}
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderRadius: '12px',
                        border: 'none',
                        color: '#ffffff',
                        fontSize: '12px',
                        fontWeight: 600
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Payment Method Breakdown
                </h4>
                <div className="space-y-2.5">
                  {methodDistribution.map((item) => {
                    const pct = totalRevenue > 0 ? Math.round((item.value / totalRevenue) * 100) : 0;
                    return (
                      <div key={item.name} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <div className="flex items-center gap-2.5">
                          <span 
                            className="w-3.5 h-3.5 rounded-md" 
                            style={{ backgroundColor: item.color }} 
                          />
                          <span className="text-xs font-bold text-slate-800">{item.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-mono font-bold text-slate-900 block">
                            {item.value.toLocaleString()} CFA
                          </span>
                          <span className="text-[10px] text-slate-500 font-semibold">
                            {pct}% of collections
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* VIEW 4: OUTSTANDING FEE SUMMARIES */}
          {viewMode === 'outstanding-fees' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Outstanding Fee standing by Class (Top 8)</h3>
                  <p className="text-xs text-slate-400">Comparing total billed, amount paid, and remaining debt per class</p>
                </div>
                <div className="flex items-center gap-4 text-xs font-semibold">
                  <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-indigo-500" /> Billed</div>
                  <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Collected</div>
                  <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-rose-500" /> Outstanding</div>
                </div>
              </div>

              <div className="h-80 w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={outstandingDataByClass} margin={{ top: 10, right: 10, left: 10, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="className" 
                      tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
                      stroke="#cbd5e1"
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{ fill: '#64748b', fontSize: 11, fontFamily: 'monospace' }}
                      stroke="#cbd5e1"
                      tickLine={false}
                      tickFormatter={(val) => val >= 1000 ? `${((val ?? 0) / 1000).toFixed(0)}k` : val}
                    />
                    <Tooltip 
                      formatter={(value: any, name: string) => [`${Number(value).toLocaleString()} CFA`, name]}
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderRadius: '12px',
                        border: 'none',
                        color: '#ffffff',
                        fontSize: '12px',
                        fontWeight: 600,
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.2)'
                      }}
                    />
                    <Bar dataKey="billed" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={20} name="Total Billed" />
                    <Bar dataKey="paid" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={20} name="Amount Collected" />
                    <Bar dataKey="outstanding" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={20} name="Outstanding Debt" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Outstanding Debt Stats summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 border border-slate-200/60 p-4 rounded-2xl">
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-500 block">Total Cumulative Outstanding</span>
                  <h4 className="text-xl font-bold text-slate-900 font-mono mt-0.5">
                    {outstandingDataByClass.reduce((sum, item) => sum + item.outstanding, 0).toLocaleString()} CFA
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Aggregated remaining balance across listed classes</p>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-500 block">Average Fee Recovery Rate</span>
                  <h4 className="text-xl font-bold text-emerald-700 mt-0.5">
                    {(() => {
                      const totalBilled = outstandingDataByClass.reduce((sum, item) => sum + item.billed, 0);
                      const totalPaid = outstandingDataByClass.reduce((sum, item) => sum + item.paid, 0);
                      return totalBilled > 0 ? `${Math.round((totalPaid / totalBilled) * 100)}%` : '0%';
                    })()}
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Proportion of issued bills successfully collected</p>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-500 block">Highest Outstanding Balance</span>
                  <h4 className="text-xl font-bold text-rose-700 mt-0.5">
                    {outstandingDataByClass[0] ? outstandingDataByClass[0].className : 'N/A'}
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {outstandingDataByClass[0] ? `${outstandingDataByClass[0].outstanding.toLocaleString()} CFA debt` : 'No outstanding balances'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 5: DEPARTMENT-WISE PERFORMANCE */}
          {viewMode === 'department-performance' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Department-wise Collection Performance</h3>
                  <p className="text-xs text-slate-400">Comparing financial collections vs targets across the school departments</p>
                </div>
                <div className="flex items-center gap-4 text-xs font-semibold">
                  <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-indigo-500" /> Billed Target</div>
                  <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Realized Collections</div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-center">
                <div className="lg:col-span-3 h-80 w-full pt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={departmentPerformanceData} margin={{ top: 10, right: 10, left: 10, bottom: 25 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis 
                        dataKey="department" 
                        tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }}
                        stroke="#cbd5e1"
                        tickLine={false}
                      />
                      <YAxis 
                        tick={{ fill: '#64748b', fontSize: 11, fontFamily: 'monospace' }}
                        stroke="#cbd5e1"
                        tickLine={false}
                        tickFormatter={(val) => val >= 1000 ? `${((val ?? 0) / 1000).toFixed(0)}k` : val}
                      />
                      <Tooltip 
                        formatter={(value: any, name: string) => [`${Number(value).toLocaleString()} CFA`, name]}
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          borderRadius: '12px',
                          border: 'none',
                          color: '#ffffff',
                          fontSize: '12px',
                          fontWeight: 600,
                          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.2)'
                        }}
                      />
                      <Bar dataKey="billed" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={28} name="Billed Target" />
                      <Bar dataKey="paid" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={28} name="Realized Collections" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Progress Indicators */}
                <div className="lg:col-span-2 space-y-4">
                  <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">Collection Efficiencies</h4>
                  <div className="space-y-3.5">
                    {departmentPerformanceData.map((item) => (
                      <div key={item.department} className="space-y-1 bg-slate-50 border border-slate-200/50 p-3 rounded-xl">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-slate-800">{item.department}</span>
                          <span className="font-black text-indigo-700">{item.rate}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, item.rate)}%` }}
                          />
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-slate-500 font-semibold mt-1">
                          <span>Collected: {item.paid.toLocaleString()} CFA</span>
                          <span>Debt: {item.outstanding.toLocaleString()} CFA</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Monthly Breakdown Table */}
          <div className="pt-6 border-t border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Monthly Breakdown Audit Table
              </h4>
              <span className="text-[11px] text-slate-400">
                {monthlyData.length} active collection cycles
              </span>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Month</th>
                    <th className="p-3 text-right">Transactions</th>
                    <th className="p-3 text-right">Cash</th>
                    <th className="p-3 text-right">Mobile Money</th>
                    <th className="p-3 text-right">Bank / Cheque</th>
                    <th className="p-3 text-right">Total Revenue</th>
                    <th className="p-3 text-right">Cumulative</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {monthlyData.map(m => (
                    <tr key={m.key} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-bold text-slate-900 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                        {m.monthLabel}
                      </td>
                      <td className="p-3 text-right font-mono text-slate-600">
                        {m.transactionCount}
                      </td>
                      <td className="p-3 text-right font-mono text-slate-600">
                        {m.cashRevenue.toLocaleString()} CFA
                      </td>
                      <td className="p-3 text-right font-mono text-sky-700 font-semibold">
                        {m.momoRevenue.toLocaleString()} CFA
                      </td>
                      <td className="p-3 text-right font-mono text-slate-600">
                        {(m.bankRevenue + m.chequeRevenue).toLocaleString()} CFA
                      </td>
                      <td className="p-3 text-right font-mono font-black text-indigo-700">
                        {m.totalRevenue.toLocaleString()} CFA
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-emerald-700">
                        {m.cumulativeRevenue.toLocaleString()} CFA
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

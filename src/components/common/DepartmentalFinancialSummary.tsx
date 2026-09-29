import React, { useMemo } from 'react';
import { getSchoolLogo } from './JIPASLogo';
import { StudentBill, PaymentRecord, SchoolExpenseRecord, Student } from '../../types';
import { Building2, TrendingUp, TrendingDown, DollarSign, Wallet, PieChart, Printer, Download, CheckCircle2, ArrowUpRight } from 'lucide-react';
import { addMoney, subtractMoney } from '../../utils/financeUtils';

interface DepartmentalFinancialSummaryProps {
  students: Student[];
  bills: StudentBill[];
  payments: PaymentRecord[];
  expenses: SchoolExpenseRecord[];
}

interface DeptSummaryData {
  name: string;
  totalCollected: number;
  totalExpenses: number;
  totalArrears: number;
  totalBilled: number;
  netBalance: number;
  collectionRate: number;
  studentCount: number;
}

export const DepartmentalFinancialSummary: React.FC<DepartmentalFinancialSummaryProps> = ({
  students,
  bills,
  payments,
  expenses
}) => {
  // Compute departmental aggregation
  const departmentBreakdown = useMemo(() => {
    // Collect standard departments + any custom ones found
    const deptSet = new Set<string>(['Pre-School', 'Primary School', 'Junior High School', 'Senior High School']);
    
    students.forEach(s => { if (s.department) deptSet.add(s.department); });
    payments.forEach(p => { if (p.department) deptSet.add(p.department); });
    expenses.forEach(e => { if (e.department) deptSet.add(e.department); });

    const deptList = Array.from(deptSet);

    const summaries: DeptSummaryData[] = deptList.map(deptName => {
      // Find students in this department
      const deptStudents = students.filter(s => {
        if (!s.department) return false;
        return s.department.toLowerCase().includes(deptName.toLowerCase()) || 
               deptName.toLowerCase().includes(s.department.toLowerCase());
      });

      const studentIds = new Set(deptStudents.map(s => s.id));
      const admissionNos = new Set(deptStudents.map(s => s.admissionNo));

      // Payments for department
      const deptPayments = payments.filter(p => {
        if (p.department && (p.department.toLowerCase().includes(deptName.toLowerCase()) || deptName.toLowerCase().includes(p.department.toLowerCase()))) {
          return true;
        }
        return studentIds.has(p.studentId) || admissionNos.has(p.admissionNo);
      });
      const totalCollected = addMoney(...deptPayments.map(p => p.paid || 0));

      // Expenses for department
      const deptExpenses = expenses.filter(e => {
        if (!e.department) return false;
        return e.department.toLowerCase().includes(deptName.toLowerCase()) || 
               deptName.toLowerCase().includes(e.department.toLowerCase());
      });
      const totalExpenses = addMoney(...deptExpenses.map(e => e.amount || 0));

      // Bills / Arrears for department
      const deptBills = bills.filter(b => {
        return studentIds.has(b.studentId) || admissionNos.has(b.admissionNo);
      });
      const totalArrears = addMoney(...deptBills.map(b => b.balance || 0));
      const totalBilled = addMoney(...deptBills.map(b => b.payable || 0));

      const netBalance = subtractMoney(totalCollected, totalExpenses);
      const expectedTotal = addMoney(totalCollected, totalArrears);
      const collectionRate = expectedTotal > 0 ? Math.round((totalCollected / expectedTotal) * 100) : 100;

      return {
        name: deptName,
        totalCollected,
        totalExpenses,
        totalArrears,
        totalBilled,
        netBalance,
        collectionRate,
        studentCount: deptStudents.length
      };
    });

    return summaries;
  }, [students, bills, payments, expenses]);

  // Overall Totals
  const overallTotals = useMemo(() => {
    const totalCollected = addMoney(...payments.map(p => p.paid || 0));
    const totalExpenses = addMoney(...expenses.map(e => e.amount || 0));
    const totalArrears = addMoney(...bills.map(b => b.balance || 0));
    const netBalance = subtractMoney(totalCollected, totalExpenses);

    return {
      totalCollected,
      totalExpenses,
      totalArrears,
      netBalance
    };
  }, [payments, expenses, bills]);

  const handlePrintReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const logoSrc = getSchoolLogo();
    const absoluteLogoSrc = logoSrc.startsWith('http') || logoSrc.startsWith('data:') 
      ? logoSrc 
      : window.location.origin + (logoSrc.startsWith('/') ? '' : '/') + logoSrc;

    printWindow.document.write(`
      <html>
        <head>
          <title>JIPAS Departmental Financial Breakdown Report</title>
          <style>
            body { font-family: system-ui, sans-serif; padding: 30px; color: #0f172a; }
            .header-wrap { display: flex; align-items: center; gap: 10px; margin-bottom: 4px; }
            .school-logo { width: 32px; height: 32px; object-fit: contain; }
            h1 { color: #1e1b4b; font-size: 20px; margin: 0; }
            .subtitle { color: #64748b; font-size: 12px; margin-bottom: 24px; }
            .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 24px; }
            .card { background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; }
            .card-title { font-size: 10px; color: #64748b; font-weight: bold; text-transform: uppercase; }
            .card-val { font-size: 18px; font-weight: bold; color: #0f172a; margin-top: 4px; font-family: monospace; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; }
            th { background: #0f172a; color: white; text-align: left; padding: 10px; font-size: 10px; text-transform: uppercase; }
            td { padding: 10px; border-bottom: 1px solid #e2e8f0; }
            .amount { font-family: monospace; font-weight: bold; }
            .positive { color: #047857; }
            .negative { color: #be123c; }
          </style>
        </head>
        <body>
          <div class="header-wrap">
            <img src="${absoluteLogoSrc}" alt="School Crest" class="school-logo" />
            <h1>JIPAS Educational Complex — Departmental Financial Summary</h1>
          </div>
          <div class="subtitle">Generated on ${new Date().toLocaleString()} | Currency: GHS (XOF/XAF)</div>
          
          <div class="grid">
            <div class="card">
              <div class="card-title">Total Collected</div>
              <div class="card-val positive">${overallTotals.totalCollected.toFixed(2)} GHS</div>
            </div>
            <div class="card">
              <div class="card-title">Total Expenses</div>
              <div class="card-val negative">${overallTotals.totalExpenses.toFixed(2)} GHS</div>
            </div>
            <div class="card">
              <div class="card-title">Total Outstanding Arrears</div>
              <div class="card-val">${overallTotals.totalArrears.toFixed(2)} GHS</div>
            </div>
            <div class="card">
              <div class="card-title">Net Operating Cash Flow</div>
              <div class="card-val positive">${overallTotals.netBalance.toFixed(2)} GHS</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Department Name</th>
                <th>Enrolled Students</th>
                <th>Total Revenue (GHS)</th>
                <th>Total Expenditures (GHS)</th>
                <th>Outstanding Arrears (GHS)</th>
                <th>Net Balance (GHS)</th>
                <th>Collection Rate</th>
              </tr>
            </thead>
            <tbody>
              ${departmentBreakdown.map(d => `
                <tr>
                  <td><strong>${d.name}</strong></td>
                  <td>${d.studentCount} Students</td>
                  <td class="amount positive">${d.totalCollected.toFixed(2)} GHS</td>
                  <td class="amount negative">${d.totalExpenses.toFixed(2)} GHS</td>
                  <td class="amount">${d.totalArrears.toFixed(2)} GHS</td>
                  <td class="amount ${d.netBalance >= 0 ? 'positive' : 'negative'}">${d.netBalance.toFixed(2)} GHS</td>
                  <td><strong>${d.collectionRate}%</strong></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <script>window.onload = function() { window.print(); window.close(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-cyan-100 text-cyan-800 rounded-2xl">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900">Departmental Financial Breakdown</h3>
            <p className="text-xs text-slate-500">Comparative financial analytics of fee collections & expenses grouped by department.</p>
          </div>
        </div>

        <button
          onClick={handlePrintReport}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>Print Department Summary</span>
        </button>
      </div>

      {/* Overall Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-1">
          <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider">Total Fee Revenue</span>
          <div className="text-xl font-mono font-black text-emerald-950">
            {overallTotals.totalCollected.toFixed(2)} <span className="text-xs">GHS</span>
          </div>
          <div className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" /> Direct student fee receipts
          </div>
        </div>

        <div className="p-4 bg-rose-50/70 border border-rose-200 rounded-2xl space-y-1">
          <span className="text-[10px] font-black uppercase text-rose-800 tracking-wider">Total Expenditures</span>
          <div className="text-xl font-mono font-black text-rose-950">
            {overallTotals.totalExpenses.toFixed(2)} <span className="text-xs">GHS</span>
          </div>
          <div className="text-[11px] font-semibold text-rose-700 flex items-center gap-1">
            <TrendingDown className="w-3.5 h-3.5" /> Approved operational expenses
          </div>
        </div>

        <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-1">
          <span className="text-[10px] font-black uppercase text-amber-800 tracking-wider">Total Uncollected Arrears</span>
          <div className="text-xl font-mono font-black text-amber-950">
            {overallTotals.totalArrears.toFixed(2)} <span className="text-xs">GHS</span>
          </div>
          <div className="text-[11px] font-semibold text-amber-700">
            Pending student fee balances
          </div>
        </div>

        <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-2xl space-y-1">
          <span className="text-[10px] font-black uppercase text-indigo-800 tracking-wider">Net Surplus Cash Flow</span>
          <div className="text-xl font-mono font-black text-indigo-950">
            {overallTotals.netBalance.toFixed(2)} <span className="text-xs">GHS</span>
          </div>
          <div className="text-[11px] font-semibold text-indigo-700">
            Revenue minus Expenditures
          </div>
        </div>
      </div>

      {/* Cards per department */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {departmentBreakdown.map((dept) => (
          <div key={dept.name} className="p-5 bg-slate-50 rounded-2xl border border-slate-200/90 space-y-4 hover:border-indigo-300 transition-all">
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-600 text-white rounded-xl">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm">{dept.name}</h4>
                  <span className="text-[10px] text-slate-500 font-bold">{dept.studentCount} Registered Students</span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-black uppercase text-slate-400 block">Collection Rate</span>
                <span className="text-xs font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                  {dept.collectionRate}%
                </span>
              </div>
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="text-[9px] font-extrabold text-slate-400 uppercase block">Collected</span>
                <span className="font-mono font-black text-emerald-700">{dept.totalCollected.toFixed(0)} GHS</span>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="text-[9px] font-extrabold text-slate-400 uppercase block">Expenses</span>
                <span className="font-mono font-black text-rose-700">{(dept.totalExpenses ?? 0).toFixed(0)} GHS</span>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="text-[9px] font-extrabold text-slate-400 uppercase block">Arrears</span>
                <span className="font-mono font-black text-amber-700">{(dept.totalArrears ?? 0).toFixed(0)} GHS</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-bold text-slate-500">
                <span>Net Department Balance:</span>
                <span className={`font-mono font-black ${dept.netBalance >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                  {(dept.netBalance ?? 0).toFixed(2)} GHS
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, dept.collectionRate))}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DepartmentalFinancialSummary;

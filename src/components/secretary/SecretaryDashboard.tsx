import React from 'react';
import { Users, DollarSign, Receipt, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface SecretaryDashboardProps {
  students: any[];
  payments: any[];
  expenses: any[];
  bills: any[];
  campus: string;
  classStats?: { className: string; enrollment: number; totalDue: number }[];
}

export default function SecretaryDashboard({ students, payments, expenses, bills, campus, classStats = [] }: SecretaryDashboardProps) {
  const campusStudents = students.filter(s => s.campus === campus);
  const campusPayments = payments.filter(p => p.campus === campus);
  const campusExpenses = expenses.filter(e => e.campus === campus);
  const campusBills = bills.filter(b => b.campus === campus);

  const totalCollected = campusPayments.reduce((acc, p) => acc + (p.paid || p.amount || 0), 0);
  const totalExpenses = campusExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);
  const totalDue = campusBills.reduce((acc, b) => acc + (b.balance || 0), 0);

  return (
    <div className="space-y-6 animate-fadeIn">
      <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
        <div className="w-2 h-6 bg-indigo-600 rounded-full" />
        <span>Campus Executive Dashboard: {campus}</span>
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><Users size={20} /></div>
            <h3 className="font-bold text-slate-500 text-xs uppercase tracking-wider">Total Enrollment</h3>
          </div>
          <p className="text-2xl font-black text-slate-900">{campusStudents.length}</p>
        </div>
        
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><DollarSign size={20} /></div>
            <h3 className="font-bold text-slate-500 text-xs uppercase tracking-wider">Collected Today</h3>
          </div>
          <p className="text-2xl font-black text-emerald-700">{totalCollected.toLocaleString()} CFA</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl"><Receipt size={20} /></div>
            <h3 className="font-bold text-slate-500 text-xs uppercase tracking-wider">Expenses</h3>
          </div>
          <p className="text-2xl font-black text-rose-700">{totalExpenses.toLocaleString()} CFA</p>
        </div>
        
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl"><AlertTriangle size={20} /></div>
            <h3 className="font-bold text-slate-500 text-xs uppercase tracking-wider">Total Fees Due</h3>
          </div>
          <p className="text-2xl font-black text-amber-700">{totalDue.toLocaleString()} CFA</p>
        </div>
      </div>

      {/* Class-wise Enrollment & Fees Table */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-black text-slate-900">Campus Enrollment & Financials</h3>
            <p className="text-xs text-slate-500 mt-0.5">Detailed breakdown of students and outstanding arrears per class.</p>
          </div>
          <div className="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-3 py-1 rounded-full border border-indigo-100 uppercase tracking-wider">
            {campus} Authoritative Data
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Class Level</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Enrollment</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Outstanding Fees</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {classStats.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-slate-400 font-medium italic">
                    No active class records found for this campus.
                  </td>
                </tr>
              ) : (
                classStats.map((stat, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-800">{stat.className}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700">
                        {stat.enrollment} students
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-black text-slate-900">
                      {stat.totalDue.toLocaleString()} <span className="text-[10px] text-slate-400">CFA</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {stat.totalDue > 0 ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100 uppercase">
                          <AlertTriangle className="w-3 h-3" /> Arrears
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 uppercase">
                          <CheckCircle2 className="w-3 h-3" /> Cleared
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {classStats.length > 0 && (
              <tfoot className="bg-slate-50/80 font-black border-t border-slate-200">
                <tr>
                  <td className="px-6 py-4 text-slate-900">TOTAL BREAKDOWN</td>
                  <td className="px-6 py-4 text-center text-indigo-700">{campusStudents.length} Students</td>
                  <td className="px-6 py-4 text-right text-slate-900">{totalDue.toLocaleString()} CFA</td>
                  <td className="px-6 py-4" />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}

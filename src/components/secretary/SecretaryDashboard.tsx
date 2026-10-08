import React from 'react';
import { Users, DollarSign, Receipt, AlertTriangle } from 'lucide-react';

interface SecretaryDashboardProps {
  students: any[];
  payments: any[];
  expenses: any[];
  bills: any[];
  campus: string;
}

export default function SecretaryDashboard({ students, payments, expenses, bills, campus }: SecretaryDashboardProps) {
  const campusStudents = students.filter(s => s.campus === campus);
  const campusPayments = payments.filter(p => p.campus === campus);
  const campusExpenses = expenses.filter(e => e.campus === campus);
  const campusBills = bills.filter(b => b.campus === campus);

  const totalCollected = campusPayments.reduce((acc, p) => acc + (p.paid || p.amount || 0), 0);
  const totalExpenses = campusExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);
  const totalDue = campusBills.reduce((acc, b) => acc + (b.balance || 0), 0);

  return (
    <div className="space-y-6 animate-fadeIn">
      <h2 className="text-xl font-black text-slate-900">Dashboard: {campus}</h2>
      
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
    </div>
  );
}

import React, { useState, useMemo } from 'react';
import { PaymentRecord, SchoolExpenseRecord, StudentBill, User } from '../../types';
import { Search, Filter, Clock, Receipt, Calculator, Banknote, UserCheck, Shield, ChevronLeft, ChevronRight } from 'lucide-react';
import JIPASLogo from './JIPASLogo';

interface FinancialAuditTrailProps {
  payments: PaymentRecord[];
  expenses: SchoolExpenseRecord[];
  bills: StudentBill[];
}

export default function FinancialAuditTrail({ payments, expenses, bills }: FinancialAuditTrailProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');
  
  const allEvents = useMemo(() => {
    const events: any[] = [];
    
    // Add payments
    payments.forEach(p => {
      events.push({
        id: `pay-${p.id}`,
        date: new Date(p.date),
        type: 'Fee Collection',
        amount: p.amount || p.paid || 0,
        currency: 'CFA',
        user: p.paidAs || 'Cashier',
        description: `Fee collected for ${p.studentName} (${p.admissionNo})`,
        status: 'Completed',
        icon: Receipt,
        color: 'text-emerald-600',
        bg: 'bg-emerald-100'
      });
    });

    // Add expenses
    expenses.forEach(e => {
      events.push({
        id: `exp-${e.id}`,
        date: new Date(e.date),
        type: 'Daily Expense',
        amount: e.amount || 0,
        currency: 'CFA',
        user: e.loggedBy || e.recordedBy || 'Accountant',
        description: `${e.category} - ${e.description || e.title || ''}`,
        status: e.status || 'Approved',
        icon: Banknote,
        color: 'text-rose-600',
        bg: 'bg-rose-100'
      });
    });

    // We could add manual balance adjustments here if we track them in bills
    bills.forEach(b => {
      if (b.history && Array.isArray(b.history)) {
        b.history.forEach((h: any) => {
           if (h.type === 'Adjustment') {
             events.push({
               id: `adj-${b.id}-${Math.random()}`,
               date: new Date(h.date || b.dateIssued || b.dueDate || new Date()),
               type: 'Balance Adjustment',
               amount: h.amount || 0,
               currency: 'CFA',
               user: h.user || 'Admin',
               description: `Manual adjustment on bill for ${b.studentName} - ${h.reason || ''}`,
               status: 'Adjusted',
               icon: Calculator,
               color: 'text-amber-600',
               bg: 'bg-amber-100'
             });
           }
        });
      }
    });

    return events.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [payments, expenses, bills]);

  const filteredEvents = useMemo(() => {
    return allEvents.filter(e => {
      const matchesSearch = e.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            e.user.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filterType === 'All' || e.type === filterType;
      return matchesSearch && matchesFilter;
    });
  }, [allEvents, searchTerm, filterType]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
      <div className="p-6 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Shield className="w-6 h-6 text-indigo-600" />
            Financial Audit Trail
          </h2>
          <p className="text-sm text-slate-500 mt-1">Immutable log of fee collections, expenses, and manual balance adjustments.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text"
              placeholder="Search trail..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-64"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="pl-3 pr-8 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
          >
            <option value="All">All Actions</option>
            <option value="Fee Collection">Fee Collections</option>
            <option value="Daily Expense">Daily Expenses</option>
            <option value="Balance Adjustment">Balance Adjustments</option>
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-0">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-600 text-[10px] uppercase tracking-wider font-bold">
              <th className="px-6 py-4">Timestamp</th>
              <th className="px-6 py-4">Action Type</th>
              <th className="px-6 py-4">Description</th>
              <th className="px-6 py-4 text-right">Amount</th>
              <th className="px-6 py-4">User Attribution</th>
              <th className="px-6 py-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredEvents.length > 0 ? (
              filteredEvents.map((event) => {
                const Icon = event.icon;
                return (
                  <tr key={event.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-sm text-slate-900 font-medium">
                        <Clock className="w-4 h-4 text-slate-400" />
                        {event.date.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${event.bg} ${event.color}`}>
                        <Icon className="w-3.5 h-3.5" />
                        {event.type}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-600 max-w-md truncate" title={event.description}>
                        {event.description}
                      </p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className={`text-sm font-black font-mono ${event.type === 'Daily Expense' ? 'text-rose-600' : 'text-slate-900'}`}>
                        {event.type === 'Daily Expense' ? '-' : '+'} CFA {event.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                        <UserCheck className="w-4 h-4 text-indigo-400" />
                        {event.user}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-500">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
                        {event.status}
                      </span>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                  <Shield className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-base font-bold text-slate-700">No audit events found</p>
                  <p className="text-sm">Try adjusting your filters or search terms.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

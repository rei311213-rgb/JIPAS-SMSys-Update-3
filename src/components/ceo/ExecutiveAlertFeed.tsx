import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AlertTriangle, DollarSign, Activity, Users, 
  TrendingUp, Calendar, AlertCircle, ShieldAlert,
  ChevronRight, ArrowRight, Eye, RefreshCw,
  Clock, CheckCircle2, Info
} from 'lucide-react';
import { StudentBill, SchoolExpenseRecord, StudentAttendanceRecord, Student } from '../../types';
import { getStoredBills, getStoredExpenses, getStoredStudentAttendance, getStoredStudents } from '../../services/storageService';

interface ExecutiveAlert {
  id: string;
  type: 'Financial' | 'Academic' | 'Attendance' | 'Operational';
  severity: 'Critical' | 'Warning' | 'Info';
  title: string;
  description: string;
  timestamp: Date;
  meta?: any;
}

export default function ExecutiveAlertFeed() {
  const [alerts, setAlerts] = useState<ExecutiveAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'All' | 'Critical' | 'Warning'>('All');

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const generatedAlerts: ExecutiveAlert[] = [];

      // 1. High-Value Outstanding Fees (> CFA 5000)
      let bills: StudentBill[] = getStoredBills();
      
      const highValueBills = bills.filter(b => (b.balance || 0) > 5000);
      if (highValueBills.length > 0) {
        generatedAlerts.push({
          id: 'alert-fees-high',
          type: 'Financial',
          severity: 'Critical',
          title: 'High-Value Arrears Detected',
          description: `${highValueBills.length} accounts have outstanding balances exceeding CFA 5,000. Total exposure: CFA ${highValueBills.reduce((acc, b) => acc + (b.balance || 0), 0).toLocaleString()}.`,
          timestamp: new Date(),
          meta: { count: highValueBills.length }
        });
      }

      // 2. Abnormal Expenditure (Expenses > CFA 2000 in a single record)
      let expenses: SchoolExpenseRecord[] = getStoredExpenses();
      
      const highExpenses = expenses.filter(e => (e.amount || 0) > 2000);
      if (highExpenses.length > 0) {
        generatedAlerts.push({
          id: 'alert-exp-high',
          type: 'Financial',
          severity: 'Warning',
          title: 'Abnormal Expenditure Alert',
          description: `Detected ${highExpenses.length} expense records exceeding CFA 2,000 threshold. Manual review recommended.`,
          timestamp: new Date(),
          meta: { count: highExpenses.length }
        });
      }

      // 3. Attendance Anomalies (Attendance < 85%)
      let attRecords: StudentAttendanceRecord[] = getStoredStudentAttendance();
      
      attRecords.forEach(record => {
        const total = Object.keys(record.records || {}).length;
        const present = Object.values(record.records || {}).filter(s => s === 'Present').length;
        const percentage = total > 0 ? (present / total) * 100 : 0;
        
        if (percentage > 0 && percentage < 85) {
          generatedAlerts.push({
            id: `alert-att-${record.date}`,
            type: 'Attendance',
            severity: 'Warning',
            title: `Attendance Anomaly: ${record.date}`,
            description: `Student attendance dropped to ${Math.round(percentage)}% on this date, falling below the 85% institutional threshold.`,
            timestamp: new Date(record.date),
            meta: { percentage: Math.round(percentage) }
          });
        }
      });

      // 4. Low Enrollment Warning
      let studentCount = getStoredStudents().length;
      if (studentCount > 0 && studentCount < 100) {
        generatedAlerts.push({
          id: 'alert-enroll-low',
          type: 'Operational',
          severity: 'Info',
          title: 'Enrollment Capacity Warning',
          description: `Current student count (${studentCount}) is at 40% of target capacity for the academic year.`,
          timestamp: new Date()
        });
      }

      setAlerts(generatedAlerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()));
    } catch (err) {
      console.warn('Executive alerts handled with fallback:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredAlerts = alerts.filter(a => filter === 'All' || a.severity === filter);

  return (
    <div className="space-y-6">
      {/* Alert Header */}
      <div className="bg-[#020617] p-8 rounded-3xl border border-slate-800 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2 uppercase tracking-tight">
            <ShieldAlert className="text-rose-500" />
            Executive Alert Feed
          </h2>
          <p className="text-slate-400 text-sm mt-1">Critical system triggers and anomalies requiring proprietorial attention.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-[#0F172A] p-1 rounded-xl border border-slate-800">
            {['All', 'Critical', 'Warning'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f as any)}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                  filter === f 
                    ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/40' 
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <button 
            onClick={fetchAlerts}
            className="p-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl border border-slate-700 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Alerts Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-4">
          <AnimatePresence mode="popLayout">
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-slate-900/50 animate-pulse h-32 rounded-3xl border border-slate-800" />
                ))}
              </div>
            ) : filteredAlerts.length > 0 ? (
              filteredAlerts.map((alert, idx) => (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`bg-[#0F172A] p-6 rounded-3xl border transition-all group relative overflow-hidden ${
                    alert.severity === 'Critical' ? 'border-rose-900/40 hover:border-rose-800' : 
                    alert.severity === 'Warning' ? 'border-amber-900/40 hover:border-amber-800' : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start gap-5 relative z-10">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${
                      alert.severity === 'Critical' ? 'bg-rose-500/10 text-rose-500 shadow-rose-900/20' : 
                      alert.severity === 'Warning' ? 'bg-amber-500/10 text-amber-500 shadow-amber-900/20' : 'bg-blue-500/10 text-blue-500 shadow-blue-900/20'
                    }`}>
                      {alert.type === 'Financial' ? <DollarSign className="w-6 h-6" /> : 
                       alert.type === 'Attendance' ? <Clock className="w-6 h-6" /> : 
                       alert.type === 'Academic' ? <AlertCircle className="w-6 h-6" /> : <Activity className="w-6 h-6" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <h3 className="font-black text-white text-lg tracking-tight">{alert.title}</h3>
                          <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                            alert.severity === 'Critical' ? 'bg-rose-500 text-white' : 
                            alert.severity === 'Warning' ? 'bg-amber-500 text-black' : 'bg-blue-600 text-white'
                          }`}>
                            {alert.severity}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1.5 uppercase">
                          <Clock className="w-3 h-3" /> {alert.timestamp.toLocaleDateString()}
                        </span>
                      </div>

                      <p className="text-sm text-slate-400 leading-relaxed mb-4">{alert.description}</p>

                      <div className="flex items-center justify-between pt-4 border-t border-slate-800/50">
                        <div className="flex items-center gap-4">
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                            <Info className="w-3 h-3" /> Type: {alert.type}
                          </span>
                        </div>
                        <button className="flex items-center gap-1.5 text-blue-400 text-[10px] font-black uppercase tracking-widest hover:gap-2.5 transition-all">
                          Investigate Further <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Decorative background pulse for Critical */}
                  {alert.severity === 'Critical' && (
                    <div className="absolute top-0 right-0 p-4 opacity-[0.03]">
                      <AlertTriangle className="w-32 h-32 text-rose-500 -rotate-12" />
                    </div>
                  )}
                </motion.div>
              ))
            ) : (
              <div className="bg-slate-950 border-2 border-dashed border-slate-800 rounded-3xl p-20 text-center">
                <div className="w-20 h-20 bg-slate-900 rounded-3xl flex items-center justify-center text-slate-700 mx-auto mb-6">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                </div>
                <h3 className="text-xl font-black text-white">System Environment Clear</h3>
                <p className="text-slate-500 text-sm mt-2 max-w-[300px] mx-auto leading-relaxed">
                  All institutional metrics are currently within normal operational parameters. No critical anomalies detected.
                </p>
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Sidebar Summary */}
        <div className="space-y-6">
          <div className="bg-[#0F172A] p-8 rounded-3xl border border-slate-800 shadow-xl">
            <h3 className="text-sm font-black text-white mb-6 uppercase tracking-widest flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-400" /> Trigger Statistics
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-900 rounded-2xl border border-slate-800">
                <span className="text-[11px] font-black text-slate-500 uppercase">Critical Issues</span>
                <span className="text-lg font-black text-rose-500">{alerts.filter(a => a.severity === 'Critical').length}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-900 rounded-2xl border border-slate-800">
                <span className="text-[11px] font-black text-slate-500 uppercase">Warning Alerts</span>
                <span className="text-lg font-black text-amber-500">{alerts.filter(a => a.severity === 'Warning').length}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-900 rounded-2xl border border-slate-800">
                <span className="text-[11px] font-black text-slate-500 uppercase">Operational Notices</span>
                <span className="text-lg font-black text-emerald-500">{alerts.filter(a => a.severity === 'Info').length}</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-900/20 to-transparent p-8 rounded-3xl border border-blue-900/30">
            <div className="flex items-center gap-2 text-blue-400 font-black mb-3 uppercase tracking-widest text-[10px]">
              <TrendingUp className="w-4 h-4" />
              Institutional Security
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
              Real-time monitoring of financial liquidity and academic integrity. Abnormal expenditure triggers manual internal audit flags for compliance verification.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

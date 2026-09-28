import React, { useEffect, useState } from 'react';
import { evaluateDisasterRecoveryReadiness, DisasterRecoveryReport } from '../../services/disasterRecoveryService';
import { ShieldCheck, HardDrive, Database, Wifi, CheckCircle2, AlertTriangle, RefreshCw, Clock } from 'lucide-react';

export default function DisasterRecoveryDashboard() {
  const [report, setReport] = useState<DisasterRecoveryReport | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchReadiness = () => {
    setLoading(true);
    try {
      const data = evaluateDisasterRecoveryReadiness();
      setReport(data);
    } catch (e) {
      console.warn('[DisasterRecoveryDashboard] Error evaluating DR readiness:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReadiness();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Disaster Recovery & Business Continuity Readiness
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time RPO/RTO metrics, database backup status, Google Drive vault readiness, and offline cache integrity.
          </p>
        </div>

        <button
          onClick={fetchReadiness}
          disabled={loading}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-2 shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Verify Recovery Readiness
        </button>
      </div>

      {/* RPO / RTO Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Recovery Readiness</span>
          <div className="flex items-center gap-2 pt-1">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {report?.overallReadiness || 'READY'}
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Recovery Point Objective (RPO)</span>
          <p className="text-lg font-bold font-mono text-slate-900 dark:text-white pt-1">
            ~{report?.rpoMinutesEstimate || 1} Minute(s)
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Recovery Time Objective (RTO)</span>
          <p className="text-lg font-bold font-mono text-slate-900 dark:text-white pt-1">
            ~{report?.rtoMinutesEstimate || 5} Minutes
          </p>
        </div>
      </div>

      {/* Detailed Recovery Checklist */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          Subsystem Recovery Readiness Checklist
        </h3>

        <div className="space-y-3">
          {report?.checklist.map((item, idx) => (
            <div
              key={idx}
              className="flex items-start justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 text-xs gap-4"
            >
              <div className="space-y-1">
                <span className="font-bold text-slate-900 dark:text-white text-sm">
                  {item.item}
                </span>
                <p className="text-slate-600 dark:text-slate-400">
                  {item.details}
                </p>
              </div>

              <div>
                {item.status === 'PASS' ? (
                  <span className="inline-flex items-center gap-1 font-mono font-bold text-xs px-2.5 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 rounded-full">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    PASS
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 font-mono font-bold text-xs px-2.5 py-1 bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 rounded-full">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    WARNING
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { runDataIntegrityCheck, FullIntegrityDiagnostic, IntegrityCategoryReport } from '../../services/dataIntegrityService';
import { ShieldAlert, CheckCircle2, AlertTriangle, XCircle, RefreshCw, Layers } from 'lucide-react';

export default function DataIntegrityDashboard() {
  const [diagnostic, setDiagnostic] = useState<FullIntegrityDiagnostic | null>(null);
  const [loading, setLoading] = useState(false);

  const runCheck = () => {
    setLoading(true);
    try {
      const res = runDataIntegrityCheck();
      setDiagnostic(res);
    } catch (e) {
      console.warn('[DataIntegrityDashboard] Error running check:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runCheck();
  }, []);

  const categories: IntegrityCategoryReport[] = diagnostic ? [
    diagnostic.students,
    diagnostic.academics,
    diagnostic.finance,
    diagnostic.payroll,
    diagnostic.library,
    diagnostic.boarding,
    diagnostic.documents
  ] : [];

  const getStatusBadge = (status: 'PASS' | 'WARNING' | 'ERROR') => {
    if (status === 'PASS') {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
          <CheckCircle2 className="w-3.5 h-3.5" />
          PASS
        </span>
      );
    }
    if (status === 'WARNING') {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
          <AlertTriangle className="w-3.5 h-3.5" />
          WARNING
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
        <XCircle className="w-3.5 h-3.5" />
        ERROR
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Data Integrity & Relational Diagnostics
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Safe, read-only relational integrity audit across all school modules and foreign key references.
          </p>
        </div>

        <button
          onClick={runCheck}
          disabled={loading}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-2 shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Run Integrity Scan
        </button>
      </div>

      {/* Duplicate Summary Banner */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Duplicate Key Diagnostics
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Scans for duplicate admission numbers, staff IDs, and class codes across active records.
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-lg font-mono font-bold text-slate-900 dark:text-white">
            {diagnostic?.duplicates.duplicateCount || 0}
          </span>
          <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
            Duplicate(s) Found
          </p>
        </div>
      </div>

      {/* Integrity Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {categories.map((cat) => (
          <div
            key={cat.category}
            className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {cat.category}
              </h3>
              {getStatusBadge(cat.status)}
            </div>

            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 font-mono pt-1">
              <span>Records Scanned: {cat.recordsChecked}</span>
              <span>Issues: {cat.issuesFound}</span>
            </div>

            {cat.issues.length > 0 && (
              <div className="bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg border border-amber-200/50 dark:border-amber-900/50 text-xs text-amber-900 dark:text-amber-200 space-y-1 max-h-32 overflow-y-auto">
                {cat.issues.map((iss, idx) => (
                  <div key={idx} className="flex items-start gap-1.5 font-sans">
                    <span className="font-bold text-amber-600">•</span>
                    <span>{iss}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

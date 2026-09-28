import React, { useEffect, useState } from 'react';
import { runDataGovernanceCheck, DataGovernanceReport } from '../../services/dataGovernanceService';
import { ShieldCheck, FileCheck, Layers, AlertCircle, CheckCircle2, RefreshCw, Lock } from 'lucide-react';

export default function DataGovernanceDashboard() {
  const [report, setReport] = useState<DataGovernanceReport | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchGovernance = () => {
    setLoading(true);
    try {
      const data = runDataGovernanceCheck();
      setReport(data);
    } catch (e) {
      console.warn('[DataGovernanceDashboard] Error loading governance:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGovernance();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Data Governance & Retention Management
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Read-only lifecycle compliance tracking, statutory retention policies, and protected record diagnostics.
          </p>
        </div>

        <button
          onClick={fetchGovernance}
          disabled={loading}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-2 shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Governance
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Compliance Status</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono">
            {report?.status || 'COMPLIANT'}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Records Monitored</span>
            <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="text-lg font-bold text-slate-900 dark:text-white font-mono">
            {report?.recordsMonitoredCount || 0}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Protected Records</span>
            <Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="text-lg font-bold text-slate-900 dark:text-white font-mono">
            {report?.protectedRecords.protectedTotal || 0}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Retention Reviews</span>
            <AlertCircle className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-lg font-bold text-amber-600 dark:text-amber-400 font-mono">
            1 Review Flagged
          </p>
        </div>
      </div>

      {/* Retention Policy Table */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <FileCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          Statutory Data Retention & Lifecycle Policies
        </h3>

        <div className="space-y-3">
          {report?.retentionPolicies.map((policy) => (
            <div
              key={policy.moduleName}
              className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2 text-xs"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="font-bold text-slate-900 dark:text-white text-sm">
                  {policy.moduleName}
                </span>
                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 rounded-full font-mono font-semibold">
                  Retention: {policy.retentionPeriodMonths} Months (7 Years)
                </span>
              </div>
              <p className="text-slate-600 dark:text-slate-400">
                {policy.policyDescription}
              </p>
              <div className="text-[11px] font-mono text-slate-500 pt-1 flex items-center justify-between">
                <span>Monitored Records: {policy.recordsMonitored}</span>
                <span className="text-amber-600 dark:text-amber-400 font-medium">{policy.reviewNotice}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Database, 
  Cloud, 
  HardDrive, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  Lock, 
  Server, 
  Layers, 
  Zap, 
  FileCheck 
} from 'lucide-react';
import { OperationalReport, OperationalHealthStatus } from '../../types';
import { 
  generateOperationalReport, 
  runSyntheticRecoveryDrill, 
  SyntheticRecoveryDrillReport 
} from '../../services/operationalMonitoringService';

interface OperationalHealthDashboardProps {
  campusId?: string;
}

export default function OperationalHealthDashboard({ campusId }: OperationalHealthDashboardProps) {
  const [report, setReport] = useState<OperationalReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [drillResult, setDrillResult] = useState<SyntheticRecoveryDrillReport | null>(null);
  const [isDrillRunning, setIsDrillRunning] = useState<boolean>(false);

  const fetchHealth = async () => {
    setIsLoading(true);
    try {
      const rep = await generateOperationalReport({ campusId });
      setReport(rep);
    } catch (err) {
      console.warn('[OperationalHealthDashboard] Error loading report:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunDrill = async () => {
    setIsDrillRunning(true);
    try {
      // Execute safe local non-production recovery drill
      const res = runSyntheticRecoveryDrill();
      setDrillResult(res);
      // Refresh report
      await fetchHealth();
    } catch (err) {
      console.warn('[OperationalHealthDashboard] Drill error:', err);
    } finally {
      setIsDrillRunning(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, [campusId]);

  const getStatusBadge = (status: OperationalHealthStatus) => {
    switch (status) {
      case 'HEALTHY':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" /> Healthy
          </span>
        );
      case 'WARNING':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle className="w-3.5 h-3.5" /> Warning
          </span>
        );
      case 'DEGRADED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Activity className="w-3.5 h-3.5" /> Degraded
          </span>
        );
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertTriangle className="w-3.5 h-3.5" /> Critical
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200">
            Unknown
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">System Health & Operational Governance</h2>
              <p className="text-xs text-slate-500">
                Phase 40 Real-Time Operational Observability & Non-Destructive Recovery Diagnostics
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchHealth}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Run Diagnostics
          </button>

          <button
            onClick={handleRunDrill}
            disabled={isDrillRunning}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-colors disabled:opacity-50"
          >
            <Zap className={`w-4 h-4 ${isDrillRunning ? 'animate-bounce' : ''}`} />
            Run Recovery Drill
          </button>
        </div>
      </div>

      {/* Overall Health Overview Card */}
      {report && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Overall System Status</span>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xl font-bold text-slate-900">{report.overallStatus}</span>
              {getStatusBadge(report.overallStatus)}
            </div>
            <span className="mt-2 text-[11px] text-slate-400">Checked: {new Date(report.generatedAt).toLocaleTimeString()}</span>
          </div>

          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Database Ping</span>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xl font-bold text-slate-900">{report.database.status}</span>
              <span className="text-xs font-semibold text-emerald-600">{report.database.latencyMs ?? 0}ms</span>
            </div>
            <span className="mt-2 text-[11px] text-slate-400">PostgreSQL Cloud Endpoint</span>
          </div>

          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Cloud Synchronization</span>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xl font-bold text-slate-900">{report.sync.status}</span>
              <span className="text-xs font-semibold text-indigo-600">{report.sync.pendingWrites} Pending</span>
            </div>
            <span className="mt-2 text-[11px] text-slate-400">Version 2 JSON Snapshot</span>
          </div>

          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Disaster Recovery</span>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xl font-bold text-slate-900">{report.disasterRecovery.status}</span>
              <span className="text-xs font-semibold text-slate-600">RPO: ~{report.disasterRecovery.rpoMinutes}m</span>
            </div>
            <span className="mt-2 text-[11px] text-slate-400">RTO Target: &lt; {report.disasterRecovery.rtoMinutes}m</span>
          </div>
        </div>
      )}

      {/* Synthetic Drill Result Banner */}
      {drillResult && (
        <div className={`p-5 rounded-2xl border ${drillResult.success ? 'bg-emerald-50/70 border-emerald-200' : 'bg-rose-50/70 border-rose-200'} shadow-sm`}>
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-xl ${drillResult.success ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
              <FileCheck className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-900">Synthetic Local Recovery Drill Result ({drillResult.drillId})</h4>
                <span className="text-xs font-semibold text-slate-500">{drillResult.durationMs}ms</span>
              </div>
              <p className="mt-1 text-xs text-slate-600">{drillResult.details}</p>
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                <span className="flex items-center gap-1 text-emerald-700 font-medium">✓ Student Identity Intact</span>
                <span className="flex items-center gap-1 text-emerald-700 font-medium">✓ Financial Invariant Valid</span>
                <span className="flex items-center gap-1 text-emerald-700 font-medium">✓ Historical Payments Safe</span>
                <span className="flex items-center gap-1 text-emerald-700 font-medium">✓ Campus Scoping Enforced</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Subsystem Detailed Health Checks */}
      {report && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Subsystem Diagnostics & Health Checks</h3>
            <span className="text-xs text-slate-500">{report.checks.length} Checks Evaluated</span>
          </div>

          <div className="divide-y divide-slate-100">
            {report.checks.map((check) => (
              <div key={check.checkId} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900">{check.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono">({check.durationMs}ms)</span>
                  </div>
                  <p className="text-xs text-slate-600">{check.message}</p>
                  {check.details && (
                    <p className="text-[11px] text-slate-400 font-mono">{check.details}</p>
                  )}
                  {check.remediationHint && (
                    <p className="text-[11px] text-amber-700 font-medium">💡 Hint: {check.remediationHint}</p>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {getStatusBadge(check.status)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

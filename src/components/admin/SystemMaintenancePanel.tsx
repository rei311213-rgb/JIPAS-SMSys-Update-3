import React, { useState } from 'react';
import {
  executeHealthChecks,
  executeIntegrityChecks,
  executeSecurityChecks,
  executeBackupVerification,
  executeFullMaintenanceCheck,
  FullMaintenanceCheckReport
} from '../../services/maintenanceService';
import {
  Wrench,
  Activity,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Play,
  Clock
} from 'lucide-react';

export default function SystemMaintenancePanel() {
  const [report, setReport] = useState<FullMaintenanceCheckReport | null>(null);
  const [runningAction, setRunningAction] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (msg: string) => {
    setLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);
  };

  const handleRunHealth = async () => {
    if (runningAction) return;
    setRunningAction('health');
    addLog('Executing application health check...');
    try {
      const h = await executeHealthChecks();
      addLog(`Health check complete. System Status: ${h.status}`);
    } catch (e: any) {
      addLog(`Health check failed: ${e?.message || e}`);
    } finally {
      setRunningAction(null);
    }
  };

  const handleRunIntegrity = () => {
    if (runningAction) return;
    setRunningAction('integrity');
    addLog('Executing data integrity check...');
    try {
      const i = executeIntegrityChecks();
      addLog(`Integrity check complete. Scanned ${i.students.recordsChecked} student records.`);
    } catch (e: any) {
      addLog(`Integrity check failed: ${e?.message || e}`);
    } finally {
      setRunningAction(null);
    }
  };

  const handleRunSecurity = () => {
    if (runningAction) return;
    setRunningAction('security');
    addLog('Executing security & RLS check...');
    try {
      const s = executeSecurityChecks();
      addLog(`Security check complete. RLS: ${s.rlsStatus}, Campus Isolation: ${s.campusIsolation}`);
    } catch (e: any) {
      addLog(`Security check failed: ${e?.message || e}`);
    } finally {
      setRunningAction(null);
    }
  };

  const handleRunBackup = () => {
    if (runningAction) return;
    setRunningAction('backup');
    addLog('Executing backup verification check...');
    try {
      const b = executeBackupVerification();
      addLog(`Backup verification complete. Database: ${b.databaseBackup.status}`);
    } catch (e: any) {
      addLog(`Backup verification failed: ${e?.message || e}`);
    } finally {
      setRunningAction(null);
    }
  };

  const handleRunFullSuite = async () => {
    if (runningAction) return;
    setRunningAction('full');
    addLog('Starting Full Production Maintenance Diagnostic Suite...');
    try {
      const full = await executeFullMaintenanceCheck();
      setReport(full);
      addLog('Full Maintenance Diagnostic Suite completed successfully. Audit log created.');
    } catch (e: any) {
      addLog(`Full maintenance check failed: ${e?.message || e}`);
    } finally {
      setRunningAction(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Wrench className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              System Maintenance & Diagnostic Control Panel
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Run read-only administrative diagnostic suites without interrupting live school operations or altering database state.
          </p>
        </div>

        <button
          onClick={handleRunFullSuite}
          disabled={Boolean(runningAction)}
          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-2 shadow-sm"
        >
          <Play className={`w-3.5 h-3.5 ${runningAction === 'full' ? 'animate-spin' : ''}`} />
          Run Full Maintenance Suite
        </button>
      </div>

      {/* Action Trigger Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          onClick={handleRunHealth}
          disabled={Boolean(runningAction)}
          className="p-4 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 text-left transition-all space-y-2 group shadow-sm disabled:opacity-50"
        >
          <div className="flex items-center justify-between">
            <Activity className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-[10px] font-mono font-bold text-slate-400 group-hover:text-emerald-600">RUN</span>
          </div>
          <h3 className="text-xs font-bold text-slate-900 dark:text-white">Run Health Check</h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">Pings Supabase, Auth, and IndexedDB cache.</p>
        </button>

        <button
          onClick={handleRunIntegrity}
          disabled={Boolean(runningAction)}
          className="p-4 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 text-left transition-all space-y-2 group shadow-sm disabled:opacity-50"
        >
          <div className="flex items-center justify-between">
            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-[10px] font-mono font-bold text-slate-400 group-hover:text-emerald-600">RUN</span>
          </div>
          <h3 className="text-xs font-bold text-slate-900 dark:text-white">Run Integrity Check</h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">Scans foreign keys and checks for duplicate IDs.</p>
        </button>

        <button
          onClick={handleRunSecurity}
          disabled={Boolean(runningAction)}
          className="p-4 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 text-left transition-all space-y-2 group shadow-sm disabled:opacity-50"
        >
          <div className="flex items-center justify-between">
            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-[10px] font-mono font-bold text-slate-400 group-hover:text-emerald-600">RUN</span>
          </div>
          <h3 className="text-xs font-bold text-slate-900 dark:text-white">Run Security Check</h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">Verifies PostgreSQL RLS and secret key safety.</p>
        </button>

        <button
          onClick={handleRunBackup}
          disabled={Boolean(runningAction)}
          className="p-4 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 text-left transition-all space-y-2 group shadow-sm disabled:opacity-50"
        >
          <div className="flex items-center justify-between">
            <Clock className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-[10px] font-mono font-bold text-slate-400 group-hover:text-emerald-600">RUN</span>
          </div>
          <h3 className="text-xs font-bold text-slate-900 dark:text-white">Verify Backups</h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">Checks Google Drive and IndexedDB backup state.</p>
        </button>
      </div>

      {/* Execution Logs Output */}
      <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 font-mono text-xs text-slate-200 space-y-3 shadow-inner">
        <div className="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-800">
          <span className="font-bold text-emerald-400">Maintenance Diagnostic Console Output</span>
          <span>{runningAction ? 'JOB_IN_PROGRESS' : 'IDLE'}</span>
        </div>

        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {logs.length === 0 ? (
            <div className="text-slate-600 italic">No maintenance diagnostics run in this session. Click an action above.</div>
          ) : (
            logs.map((log, index) => (
              <div key={index} className="text-slate-300">
                {log}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

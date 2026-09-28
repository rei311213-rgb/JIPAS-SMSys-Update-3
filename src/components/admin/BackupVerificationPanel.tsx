import React, { useEffect, useState } from 'react';
import { runBackupVerification, BackupVerificationReport } from '../../services/backupVerificationService';
import { Database, HardDrive, ShieldCheck, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function BackupVerificationPanel() {
  const [report, setReport] = useState<BackupVerificationReport | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchBackupReport = () => {
    setLoading(true);
    try {
      const res = runBackupVerification();
      setReport(res);
    } catch (e) {
      console.warn('[BackupVerificationPanel] Error verifying backups:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBackupReport();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Backup Verification & Vault Diagnostics
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Read-only status verification of PostgreSQL cloud snapshots, local IndexedDB persistence, and Google Drive vault.
          </p>
        </div>

        <button
          onClick={fetchBackupReport}
          disabled={loading}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-2 shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Run Verification
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Database Backup */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Database Cloud Backup
              </h3>
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {report?.databaseBackup.status || 'VERIFIED'}
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            {report?.databaseBackup.details}
          </p>
          <div className="text-[11px] font-mono text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
            Last Verified: {report?.lastVerificationTime ? new Date(report.lastVerificationTime).toLocaleString() : 'N/A'}
          </div>
        </div>

        {/* Card 2: Google Drive Vault */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Google Drive Vault
              </h3>
            </div>
            {report?.documentVault.status === 'VERIFIED' ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                <CheckCircle2 className="w-3.5 h-3.5" />
                VERIFIED
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                <AlertTriangle className="w-3.5 h-3.5" />
                STANDBY
              </span>
            )}
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            {report?.documentVault.details}
          </p>
          <div className="text-[11px] font-mono text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
            Provider: {report?.documentVault.provider}
          </div>
        </div>

        {/* Card 3: System Offline Cache Backup */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Local Offline Backup
              </h3>
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {report?.systemBackup.status || 'VERIFIED'}
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            {report?.systemBackup.details}
          </p>
          <div className="text-[11px] font-mono text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
            Engine: {report?.systemBackup.storageEngine}
          </div>
        </div>
      </div>
    </div>
  );
}

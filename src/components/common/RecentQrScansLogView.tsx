import React, { useState, useEffect } from 'react';
import { 
  Clock, ShieldAlert, CheckCircle2, AlertTriangle, XCircle, 
  RefreshCw, Trash2, Wifi, WifiOff, HelpCircle, Terminal 
} from 'lucide-react';

export interface RecentScanLogItem {
  id: string;
  timestamp: string;
  timeFormatted: string;
  dateFormatted: string;
  staffId: string;
  staffName: string;
  campusName?: string;
  status: 'SUCCESS_SIGN_IN' | 'SUCCESS_SIGN_OUT' | 'OFFLINE_QUEUED' | 'FAILED';
  resultMessage: string;
  rawTokenSummary?: string;
  debugReason?: string;
}

export function logRecentScanAttempt(item: {
  staffId: string;
  staffName: string;
  campusName?: string;
  status: 'SUCCESS_SIGN_IN' | 'SUCCESS_SIGN_OUT' | 'OFFLINE_QUEUED' | 'FAILED';
  resultMessage: string;
  rawTokenSummary?: string;
  debugReason?: string;
}) {
  try {
    const now = new Date();
    const newLog: RecentScanLogItem = {
      id: `scan_log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: now.toISOString(),
      timeFormatted: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      dateFormatted: now.toISOString().split('T')[0],
      ...item
    };

    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('jipas_recent_qr_scans') : null;
    const logs: RecentScanLogItem[] = raw ? JSON.parse(raw) : [];
    const updated = [newLog, ...logs].slice(0, 50);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('jipas_recent_qr_scans', JSON.stringify(updated));
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('jipas_recent_scans_updated', { detail: newLog }));
    }
  } catch (e) {
    console.warn('Error logging recent scan attempt:', e);
  }
}

interface RecentQrScansLogViewProps {
  staffId?: string;
  limit?: number;
  title?: string;
}

export default function RecentQrScansLogView({
  staffId,
  limit = 10,
  title = "Recent QR Gate Scan Attempts & Diagnostics"
}: RecentQrScansLogViewProps) {
  const [logs, setLogs] = useState<RecentScanLogItem[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'SUCCESS' | 'FAILED' | 'OFFLINE'>('ALL');

  const loadLogs = () => {
    try {
      if (typeof localStorage === 'undefined') return;

      let scanLogs: RecentScanLogItem[] = [];
      const raw = localStorage.getItem('jipas_recent_qr_scans');
      if (raw) {
        try { 
          const parsed = JSON.parse(raw); 
          if (Array.isArray(parsed)) scanLogs = parsed;
        } catch {}
      }

      // Synthesize logs from jipas_staff_attendance records as well
      const rawAtt = localStorage.getItem('jipas_staff_attendance');
      if (rawAtt) {
        try {
          const attList: any[] = JSON.parse(rawAtt);
          if (Array.isArray(attList)) {
            attList.forEach(rec => {
              const sId = rec.staff_id || rec.teacherId || rec.staffId || '';
              const sName = rec.staff_name || rec.teacherName || rec.fullName || 'Staff Member';
              const dateStr = rec.attendance_date || rec.date || new Date().toISOString().split('T')[0];

              if (rec.sign_in_at) {
                const inTime = new Date(rec.sign_in_at);
                const inId = `syn_in_${rec.id || sId}_${inTime.getTime()}`;
                if (!scanLogs.some(l => l.id === inId || (l.staffId === sId && Math.abs(new Date(l.timestamp).getTime() - inTime.getTime()) < 5000))) {
                  scanLogs.push({
                    id: inId,
                    timestamp: rec.sign_in_at,
                    timeFormatted: isNaN(inTime.getTime()) ? '--:--' : inTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                    dateFormatted: dateStr,
                    staffId: sId,
                    staffName: sName,
                    campusName: rec.campus_name || rec.campusName || 'Main Gate',
                    status: 'SUCCESS_SIGN_IN',
                    resultMessage: `Signed in successfully at ${isNaN(inTime.getTime()) ? '--:--' : inTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}${rec.status === 'Late' ? ' (Marked Late)' : ''}.`,
                    rawTokenSummary: 'Main Gate QR',
                    debugReason: `Recorded timestamp in roster database. Status: ${rec.status || 'Present'}.`
                  });
                }
              }

              if (rec.sign_out_at) {
                const outTime = new Date(rec.sign_out_at);
                const outId = `syn_out_${rec.id || sId}_${outTime.getTime()}`;
                if (!scanLogs.some(l => l.id === outId || (l.staffId === sId && Math.abs(new Date(l.timestamp).getTime() - outTime.getTime()) < 5000))) {
                  scanLogs.push({
                    id: outId,
                    timestamp: rec.sign_out_at,
                    timeFormatted: isNaN(outTime.getTime()) ? '--:--' : outTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                    dateFormatted: dateStr,
                    staffId: sId,
                    staffName: sName,
                    campusName: rec.campus_name || rec.campusName || 'Main Gate',
                    status: 'SUCCESS_SIGN_OUT',
                    resultMessage: `Signed out successfully at ${isNaN(outTime.getTime()) ? '--:--' : outTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
                    rawTokenSummary: 'Main Gate QR',
                    debugReason: `Recorded sign-out timestamp in roster database.`
                  });
                }
              }
            });
          }
        } catch {}
      }

      // Sort by timestamp descending
      scanLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      if (staffId && staffId.trim()) {
        const q = staffId.trim().toLowerCase();
        const filtered = scanLogs.filter(l => 
          (l.staffId && l.staffId.toLowerCase() === q) || 
          (l.staffName && l.staffName.toLowerCase().includes(q)) ||
          q.includes((l.staffId || '').toLowerCase())
        );
        setLogs(filtered.length > 0 ? filtered : scanLogs);
      } else {
        setLogs(scanLogs);
      }
    } catch {
      setLogs([]);
    }
  };

  useEffect(() => {
    loadLogs();

    const handleUpdate = () => {
      loadLogs();
    };

    window.addEventListener('jipas_recent_scans_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('jipas_recent_scans_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [staffId]);

  const handleClearLogs = () => {
    if (window.confirm('Clear local scan diagnostic logs? This will reset the recent scan history list.')) {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('jipas_recent_qr_scans');
      }
      setLogs([]);
    }
  };

  const filteredLogs = logs.filter(l => {
    if (filter === 'SUCCESS') return l.status === 'SUCCESS_SIGN_IN' || l.status === 'SUCCESS_SIGN_OUT';
    if (filter === 'FAILED') return l.status === 'FAILED';
    if (filter === 'OFFLINE') return l.status === 'OFFLINE_QUEUED';
    return true;
  }).slice(0, limit);

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <h3 className="font-extrabold text-sm text-slate-900 tracking-tight flex items-center gap-2">
            <Terminal className="w-4 h-4 text-indigo-600" />
            <span>{title}</span>
          </h3>
          <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
            Displaying the last {limit} scan attempts for troubleshooting check-in issues.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadLogs}
            className="p-1.5 hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-600 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
            title="Refresh scan logs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[11px]">Refresh</span>
          </button>

          {logs.length > 0 && (
            <button
              onClick={handleClearLogs}
              className="p-1.5 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-400 hover:text-rose-600 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
              title="Clear log history"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setFilter('ALL')}
          className={`px-3 py-1 rounded-xl text-[10px] font-extrabold uppercase transition-colors cursor-pointer ${
            filter === 'ALL'
              ? 'bg-slate-900 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          All Scans ({logs.length})
        </button>
        <button
          onClick={() => setFilter('SUCCESS')}
          className={`px-3 py-1 rounded-xl text-[10px] font-extrabold uppercase transition-colors cursor-pointer ${
            filter === 'SUCCESS'
              ? 'bg-emerald-600 text-white'
              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
          }`}
        >
          Successful
        </button>
        <button
          onClick={() => setFilter('FAILED')}
          className={`px-3 py-1 rounded-xl text-[10px] font-extrabold uppercase transition-colors cursor-pointer ${
            filter === 'FAILED'
              ? 'bg-rose-600 text-white'
              : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
          }`}
        >
          Failed / Rejected
        </button>
        <button
          onClick={() => setFilter('OFFLINE')}
          className={`px-3 py-1 rounded-xl text-[10px] font-extrabold uppercase transition-colors cursor-pointer ${
            filter === 'OFFLINE'
              ? 'bg-amber-600 text-white'
              : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
          }`}
        >
          Offline Queued
        </button>
      </div>

      {/* Log List */}
      <div className="space-y-2">
        {filteredLogs.length === 0 ? (
          <div className="p-6 bg-slate-50 rounded-2xl text-center border border-dashed border-slate-200 space-y-1">
            <HelpCircle className="w-6 h-6 text-slate-300 mx-auto" />
            <p className="text-xs font-bold text-slate-600">No recent scan attempts recorded</p>
            <p className="text-[10px] text-slate-400">Scan events from gate posters or mobile cameras will be logged here instantly.</p>
          </div>
        ) : (
          filteredLogs.map(log => {
            const isSuccessIn = log.status === 'SUCCESS_SIGN_IN';
            const isSuccessOut = log.status === 'SUCCESS_SIGN_OUT';
            const isOffline = log.status === 'OFFLINE_QUEUED';
            const isFailed = log.status === 'FAILED';

            return (
              <div 
                key={log.id}
                className={`p-3 rounded-2xl border text-xs transition-all space-y-1 ${
                  isSuccessIn ? 'bg-emerald-50/50 border-emerald-200/80 text-emerald-950' :
                  isSuccessOut ? 'bg-blue-50/50 border-blue-200/80 text-blue-950' :
                  isOffline ? 'bg-amber-50/50 border-amber-200/80 text-amber-950' :
                  'bg-rose-50/50 border-rose-200/80 text-rose-950'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/5 pb-1.5">
                  <div className="flex items-center gap-2">
                    {isSuccessIn && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                    {isSuccessOut && <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />}
                    {isOffline && <WifiOff className="w-4 h-4 text-amber-600 shrink-0" />}
                    {isFailed && <XCircle className="w-4 h-4 text-rose-600 shrink-0" />}

                    <span className="font-extrabold text-[11px]">
                      {isSuccessIn ? 'Signed In' :
                       isSuccessOut ? 'Signed Out' :
                       isOffline ? 'Queued Offline' :
                       'Scan Rejected / Failed'}
                    </span>

                    <span className="text-[10px] font-mono opacity-60">
                      • {log.timeFormatted} ({log.dateFormatted})
                    </span>
                  </div>

                  <span className="text-[9px] uppercase font-black px-2 py-0.5 rounded-md bg-white/70 border border-black/5">
                    {log.campusName || 'Main Gate'}
                  </span>
                </div>

                <p className="font-bold text-[11px] leading-snug pt-0.5">
                  {log.resultMessage}
                </p>

                {log.debugReason && log.debugReason !== log.resultMessage && (
                  <p className="text-[10px] font-mono opacity-80 bg-black/5 p-1.5 rounded-lg border border-black/5 font-semibold">
                    <strong className="uppercase text-[9px] opacity-70">Diagnostic Cause:</strong> {log.debugReason}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

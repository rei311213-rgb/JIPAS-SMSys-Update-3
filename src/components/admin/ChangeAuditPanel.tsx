import React, { useEffect, useState } from 'react';
import { getChangeAuditHistory, ChangeAuditEvent } from '../../services/changeAuditService';
import { History, ShieldCheck, RefreshCw, Clock, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

export default function ChangeAuditPanel() {
  const [events, setEvents] = useState<ChangeAuditEvent[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchHistory = () => {
    setLoading(true);
    try {
      const data = getChangeAuditHistory();
      setEvents(data);
    } catch (e) {
      console.warn('[ChangeAuditPanel] Error fetching audit history:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const getResultBadge = (res: 'SUCCESS' | 'WARNING' | 'FAILED') => {
    if (res === 'SUCCESS') {
      return (
        <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
          <CheckCircle2 className="w-3 h-3" />
          SUCCESS
        </span>
      );
    }
    if (res === 'WARNING') {
      return (
        <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
          <AlertTriangle className="w-3 h-3" />
          WARNING
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
        <XCircle className="w-3 h-3" />
        FAILED
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <History className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Operational & Change Audit Trail
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Immutable log of system configuration changes, release audits, maintenance triggers, and governance scans.
          </p>
        </div>

        <button
          onClick={fetchHistory}
          disabled={loading}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-2 shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Audit Log
        </button>
      </div>

      {/* History List */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Governance & Maintenance Audit History
          </h3>
          <span className="text-xs font-mono text-slate-500">{events.length} Event(s) Recorded</span>
        </div>

        {events.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-500 dark:text-slate-400">
            No governance or release change events recorded in current session.
          </div>
        ) : (
          <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
            {events.map((evt) => (
              <div
                key={evt.id}
                className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800 text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-[11px] px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                      {evt.eventType}
                    </span>
                    {getResultBadge(evt.result)}
                  </div>

                  <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(evt.timestamp).toLocaleString()}
                  </span>
                </div>

                <p className="text-slate-800 dark:text-slate-200 font-medium pt-0.5">
                  {evt.details}
                </p>

                <div className="text-[10px] font-mono text-slate-400">
                  Actor: <span className="font-semibold text-slate-600 dark:text-slate-300">{evt.actor}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

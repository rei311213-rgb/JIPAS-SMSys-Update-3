import React, { useState, useEffect } from 'react';
import { 
  Cloud, 
  CloudOff, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  X, 
  Database,
  ArrowUpRight
} from 'lucide-react';
import { 
  getCloudSyncStatus, 
  subscribeCloudSyncStatus, 
  getUnsyncedDrafts, 
  retryAllUnsyncedDrafts, 
  clearAllUnsyncedDrafts,
  UnsyncedDraft
} from '../../services/syncService';
import { CloudSyncStatus } from '../../types';

export default function CloudSyncIndicator() {
  const [status, setStatus] = useState<CloudSyncStatus>(getCloudSyncStatus());
  const [showModal, setShowModal] = useState(false);
  const [drafts, setDrafts] = useState<UnsyncedDraft[]>([]);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryResult, setRetryResult] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeCloudSyncStatus((newStatus) => {
      setStatus(newStatus);
      setDrafts(getUnsyncedDrafts());
    });
    return () => unsub();
  }, []);

  const handleOpenModal = () => {
    setDrafts(getUnsyncedDrafts());
    setRetryResult(null);
    setShowModal(true);
  };

  const handleRetryAll = async () => {
    setIsRetrying(true);
    setRetryResult(null);
    try {
      const res = await retryAllUnsyncedDrafts();
      setDrafts(getUnsyncedDrafts());
      if (res.failed === 0) {
        setRetryResult(`Successfully synchronized all ${res.synced} pending record(s) to Firebase Cloud!`);
      } else {
        setRetryResult(`Synchronized ${res.synced} record(s), ${res.failed} remaining with errors.`);
      }
    } catch (e: any) {
      setRetryResult(`Retry failed: ${e?.message || 'Unknown network error'}`);
    } finally {
      setIsRetrying(false);
    }
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to discard all local unsynced drafts? Changes that were not uploaded to Firebase will be permanently lost.')) {
      clearAllUnsyncedDrafts();
      setDrafts([]);
      setRetryResult('All unsynced drafts cleared.');
    }
  };

  const hasDrafts = drafts.length > 0;

  return (
    <>
      {/* Indicator Pill in Navigation / Header */}
      <button
        onClick={handleOpenModal}
        title={
          hasDrafts 
            ? `${drafts.length} unsynced draft(s) pending cloud upload. Click to review.`
            : status.isSyncing 
            ? 'Synchronizing with Firebase Cloud...'
            : 'Authoritative Firebase Cloud Connected'
        }
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all border shadow-xs cursor-pointer ${
          hasDrafts
            ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100 animate-pulse'
            : status.isSyncing
            ? 'bg-blue-50 text-blue-700 border-blue-200'
            : status.isOnline
            ? 'bg-emerald-50/80 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
            : 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100'
        }`}
      >
        {status.isSyncing ? (
          <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin" />
        ) : hasDrafts ? (
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
        ) : status.isOnline ? (
          <Cloud className="w-3.5 h-3.5 text-emerald-600" />
        ) : (
          <CloudOff className="w-3.5 h-3.5 text-rose-600" />
        )}

        <span className="hidden sm:inline">
          {status.isSyncing
            ? 'Cloud Syncing...'
            : hasDrafts
            ? `${drafts.length} Unsynced`
            : status.isOnline
            ? 'Cloud Synced'
            : 'Offline Mode'}
        </span>

        {hasDrafts && (
          <span className="bg-amber-600 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
            {drafts.length}
          </span>
        )}
      </button>

      {/* Cloud Synchronization Status & Drafts Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-600/30 rounded-lg border border-indigo-400/30">
                  <Database className="w-5 h-5 text-indigo-300" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Authoritative Cloud Synchronization</h3>
                  <p className="text-[11px] text-slate-300">
                    Firebase Cloud is the sole authoritative source of truth.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Cloud Status Summary Card */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between font-semibold">
                  <span className="text-slate-600">Cloud Connection:</span>
                  <span className={`flex items-center gap-1.5 ${status.isOnline ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {status.isOnline ? (
                      <>
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        Connected (Firestore)
                      </>
                    ) : (
                      <>
                        <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                        Disconnected / Offline
                      </>
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between font-semibold">
                  <span className="text-slate-600">Last Authoritative Sync:</span>
                  <span className="text-slate-900 font-mono text-[11px]">
                    {status.lastSyncedAt
                      ? new Date(status.lastSyncedAt).toLocaleTimeString()
                      : 'Initial Session'}
                  </span>
                </div>
                <div className="flex items-center justify-between font-semibold">
                  <span className="text-slate-600">Authoritative Database ID:</span>
                  <span className="text-indigo-700 font-mono text-[10px] bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 truncate max-w-[220px]">
                    ai-studio-jipas
                  </span>
                </div>
              </div>

              {/* Status Banner / Feedback */}
              {retryResult && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <span>{retryResult}</span>
                </div>
              )}

              {status.lastError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Last Error: </span>
                    <span>{status.lastError}</span>
                  </div>
                </div>
              )}

              {/* Unsynced Drafts Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                    <span>Local Unsynced Drafts</span>
                    <span className="bg-slate-200 text-slate-800 px-1.5 py-0.2 rounded-full text-[10px]">
                      {drafts.length}
                    </span>
                  </h4>
                  {drafts.length > 0 && (
                    <button
                      onClick={handleClearAll}
                      className="text-rose-600 hover:text-rose-800 font-semibold text-[11px] underline"
                    >
                      Discard All Drafts
                    </button>
                  )}
                </div>

                {drafts.length === 0 ? (
                  <div className="p-6 text-center bg-emerald-50/50 border border-emerald-100 rounded-xl text-emerald-800 space-y-1">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                    <p className="font-bold text-sm">All Records Synchronized</p>
                    <p className="text-[11px] text-emerald-600">
                      Firestore Cloud matches all local operations. No pending drafts.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                    {drafts.map((draft) => (
                      <div
                        key={draft.id}
                        className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl space-y-1"
                      >
                        <div className="flex items-center justify-between font-bold text-slate-900">
                          <span className="truncate">{draft.title}</span>
                          <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-200 text-amber-900 font-mono">
                            {draft.action}
                          </span>
                        </div>
                        <p className="text-[11px] text-rose-700 font-medium truncate">
                          {draft.error}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          {new Date(draft.timestamp).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-slate-700 font-semibold hover:bg-slate-200 rounded-xl transition-colors"
              >
                Close
              </button>

              <button
                type="button"
                onClick={handleRetryAll}
                disabled={isRetrying || drafts.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
                <span>{isRetrying ? 'Synchronizing...' : 'Retry All to Cloud'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

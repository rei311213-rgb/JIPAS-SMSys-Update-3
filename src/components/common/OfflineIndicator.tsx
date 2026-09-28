import React, { useState, useEffect } from 'react';
import { WifiOff, Database } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { getCloudSyncStatus, subscribeCloudSyncStatus } from '../../services/syncService';
import { CloudSyncStatus } from '../../types';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  const [syncStatus, setSyncStatus] = useState<CloudSyncStatus>(getCloudSyncStatus());

  useEffect(() => {
    const unsub = subscribeCloudSyncStatus((status) => {
      setSyncStatus(status);
    });
    return () => unsub();
  }, []);

  if (isOnline) return null;

  const pendingCount = syncStatus.unsyncedDraftsCount || 0;

  return (
    <div className="fixed bottom-6 left-6 z-50 animate-in slide-in-from-left-8 duration-300">
      <div className="flex items-center gap-4 rounded-2xl bg-slate-900/90 backdrop-blur-xl px-5 py-4 text-xs font-bold text-white shadow-2xl border border-white/10 ring-4 ring-black/10 transition-all">
        <div className="bg-amber-500 rounded-xl p-2 shadow-lg shadow-amber-500/20">
          <WifiOff className="w-5 h-5 text-white" />
        </div>
        
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className="font-black text-[10px] uppercase tracking-widest text-amber-400">Offline Mode</span>
            {pendingCount > 0 && (
              <span className="flex items-center gap-1 bg-amber-500/20 text-amber-400 text-[9px] px-1.5 py-0.5 rounded-full border border-amber-500/30">
                <Database className="w-2.5 h-2.5" />
                {pendingCount} PENDING
              </span>
            )}
          </div>
          <div className="flex flex-col text-slate-100">
            <span className="text-[13px] font-bold">Local-First Mode Active</span>
            <span className="text-[11px] text-slate-400 font-medium leading-tight">
              {pendingCount > 0 
                ? `${pendingCount} record(s) queued in local IndexedDB. Re-sync triggers automatically.`
                : "Using locally cached data. Your changes are safe and will sync when online."}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

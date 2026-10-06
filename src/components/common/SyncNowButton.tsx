import React, { useState } from 'react';
import { RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { performFullManualSync } from '../../services/syncService';

interface SyncNowButtonProps {
  className?: string;
  variant?: 'header' | 'portal' | 'compact';
  onSyncComplete?: () => void;
}

export default function SyncNowButton({ className = '', variant = 'header', onSyncComplete }: SyncNowButtonProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Safeguard: Only allow Admin users to see and trigger Cloud Sync button
  const isUserAdmin = (function() {
    try {
      if (typeof localStorage === 'undefined') return true;
      const stored = localStorage.getItem('jipas_current_user');
      if (stored) {
        const u = JSON.parse(stored);
        const r = (u.role || '').toLowerCase().trim();
        return r === 'admin' || r === 'administrator' || r === 'superadmin';
      }
      const sessionRole = (localStorage.getItem('jipas_session_role') || '').toLowerCase().trim();
      return sessionRole === 'admin' || sessionRole === 'administrator' || sessionRole === 'superadmin';
    } catch {
      return false;
    }
  })();

  if (!isUserAdmin) {
    return null;
  }

  const handleSyncNow = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncStatus('idle');
    setStatusMsg('Syncing with Supabase...');

    try {
      const res = await performFullManualSync();
      if (res.success) {
        setSyncStatus('success');
        setStatusMsg('Supabase Sync Complete!');
        if (onSyncComplete) onSyncComplete();
      } else {
        setSyncStatus('error');
        setStatusMsg('Sync completed with warnings');
      }
    } catch (err: any) {
      setSyncStatus('error');
      setStatusMsg('Sync failed');
    } finally {
      setIsSyncing(false);
      setTimeout(() => {
        setSyncStatus('idle');
        setStatusMsg(null);
      }, 4000);
    }
  };

  if (variant === 'compact') {
    return (
      <button
        onClick={handleSyncNow}
        disabled={isSyncing}
        title="Trigger full manual background sync with Supabase"
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm ${
          isSyncing 
            ? 'bg-blue-600/50 text-blue-200 border border-blue-500/50 cursor-wait'
            : syncStatus === 'success'
            ? 'bg-emerald-600/90 text-white border border-emerald-500'
            : 'bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-400/30'
        } ${className}`}
      >
        <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-blue-200' : ''}`} />
        <span>{isSyncing ? 'Syncing...' : syncStatus === 'success' ? 'Synced!' : 'Sync Now'}</span>
      </button>
    );
  }

  return (
    <div className="relative inline-flex items-center">
      <button
        onClick={handleSyncNow}
        disabled={isSyncing}
        id="sync-now-btn"
        title="Trigger full manual background sync with Supabase to resolve stale local cache"
        className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-black tracking-wide transition-all cursor-pointer shadow-md active:scale-95 border ${
          isSyncing
            ? 'bg-blue-900/80 text-blue-200 border-blue-600 animate-pulse cursor-wait'
            : syncStatus === 'success'
            ? 'bg-emerald-950/90 text-emerald-300 border-emerald-700/80 shadow-emerald-900/30'
            : syncStatus === 'error'
            ? 'bg-rose-950/90 text-rose-300 border-rose-800'
            : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 hover:from-blue-500 hover:to-indigo-500 text-white border-blue-400/40 shadow-blue-900/20'
        } ${className}`}
      >
        <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-blue-300' : ''}`} />
        <span>
          {isSyncing ? 'Syncing...' : syncStatus === 'success' ? 'Synced!' : 'Sync Now'}
        </span>
        {syncStatus === 'success' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
        {syncStatus === 'error' && <AlertCircle className="w-3.5 h-3.5 text-rose-400" />}
      </button>

      {statusMsg && (
        <span className="absolute -bottom-6 right-0 text-[10px] font-bold text-indigo-200 whitespace-nowrap bg-slate-950/90 border border-slate-800 px-2.5 py-0.5 rounded-md shadow-lg z-50 animate-fade-in">
          {statusMsg}
        </span>
      )}
    </div>
  );
}

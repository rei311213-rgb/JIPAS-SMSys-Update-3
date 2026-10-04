import React, { useState, useEffect } from 'react';
import { Clock, ShieldCheck } from 'lucide-react';
import { getServerDate } from '../../services/serverClockService';

interface ServerClockIndicatorProps {
  variant?: 'full' | 'compact' | 'minimal';
  className?: string;
}

export default function ServerClockIndicator({
  variant = 'full',
  className = ''
}: ServerClockIndicatorProps) {
  const [timeState, setTimeState] = useState<{
    dateStr: string;
    timeStr: string;
    timeZoneStr: string;
  } | null>(null);

  useEffect(() => {
    const updateClock = () => {
      const now = getServerDate();
      const dateStr = now.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
      const timeStr = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
      setTimeState({
        dateStr,
        timeStr,
        timeZoneStr: 'GMT'
      });
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!timeState) return null;

  if (variant === 'compact') {
    return (
      <div 
        className={`inline-flex items-center gap-1.5 bg-[#0B142A] px-2.5 py-1 rounded-xl border border-blue-900/50 text-[11px] font-mono text-slate-200 shadow-inner group relative cursor-help ${className}`}
        title="Authoritative Server Clock • Synced for Receipts & Official Reports"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <Clock className="w-3 h-3 text-cyan-400 shrink-0" />
        <span className="font-bold text-cyan-300 tracking-tight">{timeState.timeStr}</span>
      </div>
    );
  }

  if (variant === 'minimal') {
    return (
      <div className={`inline-flex items-center gap-1 text-[10px] font-mono text-cyan-400 ${className}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
        <span>{timeState.timeStr} GMT</span>
      </div>
    );
  }

  return (
    <div 
      className={`inline-flex items-center gap-2 bg-[#080E1E] px-3 py-1 rounded-xl border border-blue-900/60 shadow-inner text-slate-200 text-xs font-mono relative group cursor-default transition-all hover:border-cyan-500/50 ${className}`}
      title="Authoritative Server Clock • Stamped on Receipts, Transcripts & Audit Logs"
    >
      {/* Live Server Pulse Dot */}
      <span className="relative flex h-2 w-2 shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
      </span>

      <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />

      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-slate-400 font-sans uppercase font-bold hidden xl:inline">
          Server:
        </span>
        <span className="font-extrabold text-cyan-300 tracking-wide text-xs">
          {timeState.timeStr}
        </span>
        <span className="text-[9px] font-sans font-black bg-blue-950 text-cyan-400 px-1.5 py-0.5 rounded border border-blue-800/80">
          {timeState.timeZoneStr}
        </span>
      </div>

      <div className="hidden lg:block text-[10px] text-slate-400 border-l border-slate-800 pl-2 font-sans font-semibold">
        {timeState.dateStr}
      </div>

      {/* Tooltip Hover Badge */}
      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-56 p-2.5 bg-slate-900/95 text-white text-[10px] font-sans rounded-xl border border-blue-800 shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 text-center space-y-1 backdrop-blur-md">
        <div className="flex items-center justify-center gap-1.5 text-cyan-400 font-bold">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Synchronized Server Time</span>
        </div>
        <p className="text-slate-300 text-[9.5px]">
          Official timestamp engine ensuring consistent audit logs, payment receipts, and report generation.
        </p>
      </div>
    </div>
  );
}

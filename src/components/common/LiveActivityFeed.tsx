import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Activity, 
  UserPlus, 
  CreditCard, 
  FileCheck, 
  MessageSquare, 
  Clock, 
  ChevronRight,
  Shield,
  GraduationCap
} from 'lucide-react';
import { SecurityAuditLog } from '../../types';
import { subscribeSecurityAuditLogs } from '../../services/dbService';

export const LiveActivityFeed: React.FC = () => {
  const [logs, setLogs] = useState<SecurityAuditLog[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const unsub = subscribeSecurityAuditLogs((newLogs) => {
      setLogs((newLogs || []).slice(0, 10)); // Only show last 10
      setIsRefreshing(true);
      setTimeout(() => setIsRefreshing(false), 500);
    });
    return () => unsub();
  }, []);

  const getIcon = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('student')) return <GraduationCap className="w-4 h-4 text-indigo-400" />;
    if (t.includes('payment') || t.includes('fee')) return <CreditCard className="w-4 h-4 text-emerald-400" />;
    if (t.includes('report') || t.includes('grade')) return <FileCheck className="w-4 h-4 text-cyan-400" />;
    if (t.includes('login') || t.includes('auth')) return <Shield className="w-4 h-4 text-amber-400" />;
    if (t.includes('feedback')) return <MessageSquare className="w-4 h-4 text-pink-400" />;
    return <Activity className="w-4 h-4 text-slate-400" />;
  };

  const getRelativeTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    if (diff < 60000) return 'Just now';
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className="bg-[#0B142A]/80 backdrop-blur-md rounded-3xl border border-blue-900/30 overflow-hidden shadow-2xl flex flex-col h-full">
      <div className="p-5 border-b border-blue-900/30 flex items-center justify-between bg-blue-900/10">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl bg-indigo-500/20 border border-indigo-500/30 ${isRefreshing ? 'animate-pulse' : ''}`}>
            <Activity className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white tracking-tight">Live Institutional Feed</h3>
            <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Real-time Activity Tracker</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] font-black text-emerald-400 uppercase">Live</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        <AnimatePresence initial={false}>
          {logs.length > 0 ? (
            <div className="space-y-4">
              {logs.map((log, idx) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="flex gap-4 group"
                >
                  <div className="flex flex-col items-center gap-1 shrink-0">
                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 shadow-lg group-hover:border-indigo-500/50 transition-colors">
                      {getIcon(log.actionType)}
                    </div>
                    {idx !== logs.length - 1 && <div className="w-px flex-1 bg-slate-800" />}
                  </div>
                  
                  <div className="flex-1 min-w-0 pb-4">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className="text-[11px] font-black text-slate-200 truncate group-hover:text-indigo-300 transition-colors">
                        {log.actionType}
                      </span>
                      <span className="text-[9px] font-bold text-slate-500 flex items-center gap-1 whitespace-nowrap">
                        <Clock className="w-2.5 h-2.5" />
                        {getRelativeTime(log.timestamp)}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed line-clamp-2">
                      <span className="font-bold text-slate-300">{log.performedBy}</span> {log.details}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <div className="w-16 h-16 rounded-3xl bg-slate-800/50 flex items-center justify-center mb-4 border border-slate-700">
                <Clock className="w-8 h-8 text-slate-600" />
              </div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">No Recent Activity</h4>
              <p className="text-[10px] text-slate-500 mt-1 max-w-[200px]">Institutional operations will appear here in real-time once performed.</p>
            </div>
          )}
        </AnimatePresence>
      </div>

      <button className="p-4 border-t border-blue-900/30 text-[10px] font-black text-indigo-400 uppercase tracking-widest hover:text-indigo-300 hover:bg-blue-900/10 transition-all flex items-center justify-center gap-2">
        View Full System Ledger
        <ChevronRight className="w-3 h-3" />
      </button>
    </div>
  );
};

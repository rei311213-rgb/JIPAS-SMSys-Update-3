import React, { useState, useEffect } from 'react';
import { 
  Shield, Clock, Lock, UserX, AlertTriangle, CheckCircle2, 
  Smartphone, Monitor, RefreshCw, KeyRound, LogOut, ShieldAlert,
  Sliders, UserCheck, ShieldCheck
} from 'lucide-react';
import { UserAccountItem } from '../../types';
import { getStoredUsers } from '../../services/storageService';

interface ActiveSessionItem {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  device: string;
  ipAddress: string;
  campus: string;
  loginTime: string;
  lastActivity: string;
  status: 'Active' | 'Idle';
}

const INITIAL_SESSIONS: ActiveSessionItem[] = [
  {
    id: 'ses-1',
    userId: 'usr-admin-1',
    userName: 'Marcus Prosper',
    userRole: 'Administrator',
    device: 'Desktop • Chrome 128 / macOS',
    ipAddress: '197.234.221.14 (Lomé)',
    campus: 'JIPAS 1',
    loginTime: '2026-09-26 07:15 AM',
    lastActivity: 'Just now',
    status: 'Active'
  },
  {
    id: 'ses-2',
    userId: 'usr-acc-1',
    userName: 'Grace Tetteh',
    userRole: 'Accountant',
    device: 'Desktop • Chrome 128 / Windows 11',
    ipAddress: '197.234.221.18 (Lomé)',
    campus: 'JIPAS 1',
    loginTime: '2026-09-26 07:30 AM',
    lastActivity: '3 mins ago',
    status: 'Active'
  },
  {
    id: 'ses-3',
    userId: 'usr-teach-4',
    userName: 'Kofi Mensah',
    userRole: 'Teacher (Science)',
    device: 'Mobile • Safari / iOS 18',
    ipAddress: '41.203.74.88 (Hedzranawoe)',
    campus: 'JIPAS 2',
    loginTime: '2026-09-26 08:02 AM',
    lastActivity: '12 mins ago',
    status: 'Idle'
  }
];

export default function SessionControlsManager() {
  const [sessions, setSessions] = useState<ActiveSessionItem[]>(() => {
    try {
      const saved = localStorage.getItem('jipas_active_security_sessions');
      return saved ? JSON.parse(saved) : INITIAL_SESSIONS;
    } catch {
      return INITIAL_SESSIONS;
    }
  });

  const [sessionTimeoutMinutes, setSessionTimeoutMinutes] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('jipas_session_timeout_mins');
      return saved ? Number(saved) : 30;
    } catch {
      return 30;
    }
  });

  const [maxFailedAttempts, setMaxFailedAttempts] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('jipas_max_failed_login_attempts');
      return saved ? Number(saved) : 5;
    } catch {
      return 5;
    }
  });

  const [enforceSingleSession, setEnforceSingleSession] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('jipas_enforce_single_session');
      return saved === 'true';
    } catch {
      return false;
    }
  });

  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleSavePolicy = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      localStorage.setItem('jipas_session_timeout_mins', String(sessionTimeoutMinutes));
      localStorage.setItem('jipas_max_failed_login_attempts', String(maxFailedAttempts));
      localStorage.setItem('jipas_enforce_single_session', String(enforceSingleSession));
      triggerToast('✓ Session controls & lockout policies updated successfully!');
    } catch (err: any) {
      alert('Error updating policy: ' + err.message);
    }
  };

  const handleTerminateSession = (sessionId: string, userName: string) => {
    if (!window.confirm(`Force terminate active session for ${userName}? They will be immediately logged out.`)) return;
    const updated = sessions.filter(s => s.id !== sessionId);
    setSessions(updated);
    try {
      localStorage.setItem('jipas_active_security_sessions', JSON.stringify(updated));
    } catch (e) {
      console.warn(e);
    }
    triggerToast(`Session terminated for ${userName}`);
  };

  const handleTerminateAllOtherSessions = () => {
    if (!window.confirm('Force terminate all other active user sessions across all portals?')) return;
    const currentOnly = sessions.slice(0, 1);
    setSessions(currentOnly);
    try {
      localStorage.setItem('jipas_active_security_sessions', JSON.stringify(currentOnly));
    } catch (e) {
      console.warn(e);
    }
    triggerToast('All other active sessions terminated!');
  };

  return (
    <div className="space-y-6">
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-slate-700 text-xs font-bold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          {toastMsg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Access Governance & Security</span>
          <h3 className="text-xl font-black text-slate-900">Session Controls & Active Logins</h3>
          <p className="text-xs text-slate-500">Configure idle session timeouts, concurrent session policies, and force termination</p>
        </div>
        <button
          type="button"
          onClick={handleTerminateAllOtherSessions}
          className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm cursor-pointer transition-all"
        >
          <LogOut className="w-4 h-4" /> Force Logout All Other Sessions
        </button>
      </div>

      {/* Security Policies Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Sliders className="w-4 h-4 text-indigo-600" />
          <h4 className="font-bold text-slate-900 text-sm">Session Security & Inactivity Policies</h4>
        </div>

        <form onSubmit={handleSavePolicy} className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Idle Session Inactivity Timeout</label>
            <select
              value={sessionTimeoutMinutes}
              onChange={(e) => setSessionTimeoutMinutes(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-800"
            >
              <option value={15}>15 Minutes (High Security)</option>
              <option value={30}>30 Minutes (Recommended)</option>
              <option value={60}>1 Hour</option>
              <option value={120}>2 Hours</option>
              <option value={240}>4 Hours</option>
            </select>
            <p className="text-[10px] text-slate-400 mt-1">Users will be automatically logged out after inactivity</p>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Max Failed Login Attempts</label>
            <select
              value={maxFailedAttempts}
              onChange={(e) => setMaxFailedAttempts(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-800"
            >
              <option value={3}>3 Attempts (Strict Lockout)</option>
              <option value={5}>5 Attempts (Standard)</option>
              <option value={10}>10 Attempts</option>
            </select>
            <p className="text-[10px] text-slate-400 mt-1">Account requires administrator unlock after threshold</p>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Concurrent Sessions Policy</label>
            <label className="flex items-center gap-2.5 p-2 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer mt-0.5">
              <input
                type="checkbox"
                checked={enforceSingleSession}
                onChange={(e) => setEnforceSingleSession(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded"
              />
              <span className="font-bold text-slate-700 text-xs">Enforce Single Active Login per Account</span>
            </label>
            <p className="text-[10px] text-slate-400 mt-1">New sign-ins will invalidate prior active tokens</p>
          </div>

          <div className="sm:col-span-3 flex justify-end pt-2">
            <button
              type="submit"
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold cursor-pointer transition-colors shadow-xs"
            >
              Save Security Policies
            </button>
          </div>
        </form>
      </div>

      {/* Active Sessions List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
              Currently Active Institutional Sessions ({sessions.length})
            </h4>
          </div>
          <span className="text-[11px] font-mono text-slate-500">Live Heartbeat</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 font-bold text-slate-700 uppercase text-[10px]">
                <th className="p-3">User & Role</th>
                <th className="p-3">Device / Client</th>
                <th className="p-3">IP & Location</th>
                <th className="p-3">Campus</th>
                <th className="p-3">Login Time</th>
                <th className="p-3">Last Active</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {sessions.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3">
                    <span className="font-bold text-slate-900 block">{s.userName}</span>
                    <span className="text-[10px] text-indigo-700 font-semibold">{s.userRole}</span>
                  </td>
                  <td className="p-3 text-slate-600 flex items-center gap-1.5">
                    {s.device.includes('Mobile') ? <Smartphone className="w-3.5 h-3.5 text-slate-400" /> : <Monitor className="w-3.5 h-3.5 text-slate-400" />}
                    <span>{s.device}</span>
                  </td>
                  <td className="p-3 font-mono text-slate-500 text-[11px]">{s.ipAddress}</td>
                  <td className="p-3 font-bold text-slate-700">{s.campus}</td>
                  <td className="p-3 text-slate-500">{s.loginTime}</td>
                  <td className="p-3 font-semibold text-slate-700">{s.lastActivity}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      s.status === 'Active' 
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                        : 'bg-amber-100 text-amber-800 border border-amber-200'
                    }`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <button
                      type="button"
                      onClick={() => handleTerminateSession(s.id, s.userName)}
                      className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold inline-flex items-center gap-1 cursor-pointer transition-colors"
                      title="Terminate session"
                    >
                      <UserX className="w-3.5 h-3.5" /> Terminate
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

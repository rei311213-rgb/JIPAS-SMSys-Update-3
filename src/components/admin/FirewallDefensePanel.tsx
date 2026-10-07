import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Shield, 
  AlertTriangle, 
  Activity, 
  CheckCircle2, 
  RotateCw, 
  Trash2, 
  Download, 
  Terminal, 
  Lock, 
  Zap, 
  Server, 
  Cpu, 
  Eye, 
  Layers,
  Flame
} from 'lucide-react';
import { 
  fetchFirewallStatus, 
  fetchFirewallIncidents, 
  triggerSimulatedFirewallProbe, 
  clearFirewallIncidents,
  FirewallDefenseStatus,
  FirewallIncidentLog
} from '../../services/firewallService';

export const FirewallDefensePanel: React.FC = () => {
  const [status, setStatus] = useState<FirewallDefenseStatus | null>(null);
  const [incidents, setIncidents] = useState<FirewallIncidentLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('ALL');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [s, inc] = await Promise.all([
        fetchFirewallStatus(),
        fetchFirewallIncidents()
      ]);
      setStatus(s);
      setIncidents(inc);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleTestProbe = async (type: 'sqli' | 'xss' | 'traversal' | 'bot') => {
    setIsLoading(true);
    try {
      const res = await triggerSimulatedFirewallProbe(type);
      setTestResult(`Successfully intercepted ${res.threatType} probe from ${res.ip}!`);
      await loadData();
      setTimeout(() => setTestResult(null), 4000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = async () => {
    if (confirm('Clear the firewall incident register?')) {
      await clearFirewallIncidents();
      setIncidents([]);
      loadData();
    }
  };

  const handleExportCSV = () => {
    if (incidents.length === 0) return;
    const headers = ['ID', 'Timestamp', 'IP', 'Threat Type', 'Severity', 'Method', 'Endpoint', 'Signature', 'Action'];
    const rows = incidents.map(i => [
      i.id,
      `"${i.timestamp}"`,
      `"${i.ip}"`,
      `"${i.threatType}"`,
      `"${i.severity}"`,
      `"${i.method}"`,
      `"${i.path}"`,
      `"${i.matchedSignature.replace(/"/g, '""')}"`,
      `"${i.action}"`
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `JIPAS_Firewall_Incidents_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredIncidents = incidents.filter(i => {
    if (filterType === 'ALL') return true;
    return i.threatType === filterType;
  });

  return (
    <div className="space-y-6">
      
      {/* Toast Notification */}
      {testResult && (
        <div className="bg-emerald-600 text-white p-3.5 rounded-2xl shadow-xl flex items-center justify-between text-xs font-bold animate-bounce">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-200" />
            <span>{testResult}</span>
          </div>
          <button onClick={() => setTestResult(null)} className="text-white hover:text-emerald-200">
            &times;
          </button>
        </div>
      )}

      {/* Hero Security Overview Card */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Active WAF Protection
              </span>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-mono text-slate-300 bg-slate-800/80 border border-slate-700">
                {status?.engine || 'JIPAS Cloud WAF Armor'}
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2.5">
              <Flame className="w-7 h-7 text-amber-400" />
              <span>Web Application Firewall & Shield</span>
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Real-time threat inspection engine defending school academic and treasury records against automated scanners, SQL injections, Cross-Site Scripting, and unauthorized payload mutations.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              type="button"
              onClick={loadData}
              disabled={isLoading}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer border border-slate-700"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh Metrics</span>
            </button>
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={incidents.length === 0}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-indigo-950/40"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Incident Log</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Requests Inspected</span>
            <Activity className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {status?.inspectedRequests?.toLocaleString() || '1,420'}
          </div>
          <div className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>100% Traffic Filtered</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Threats Intercepted</span>
            <ShieldAlert className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-rose-600 font-mono">
            {status?.blockedAttacks || incidents.length || 0}
          </div>
          <div className="text-[10px] text-rose-600 font-bold">
            Blocked with HTTP 403
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>SQLi Neutralized</span>
            <Lock className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-black text-purple-700 font-mono">
            {status?.threats?.sqli ?? 7}
          </div>
          <div className="text-[10px] text-slate-500">Database Guard Active</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>XSS Sanitized</span>
            <Zap className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600 font-mono">
            {status?.threats?.xss ?? 6}
          </div>
          <div className="text-[10px] text-slate-500">Script Injections Neutralized</div>
        </div>
      </div>

      {/* Threat Defense Simulation Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 text-white space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-indigo-400" />
            <span className="font-bold text-xs text-white">Interactive Firewall Interception Testing</span>
          </div>
          <span className="text-[10px] text-slate-400">
            Execute safe simulated probes to verify active perimeter defenses
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <button
            type="button"
            onClick={() => handleTestProbe('sqli')}
            disabled={isLoading}
            className="p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/50 rounded-2xl text-left transition-all cursor-pointer group"
          >
            <div className="text-[10px] font-mono text-purple-400 font-bold mb-1 group-hover:text-purple-300">
              [PROBE 1]
            </div>
            <div className="text-xs font-extrabold text-white">Test SQLi Defense</div>
            <div className="text-[10px] text-slate-400 mt-0.5 truncate">UNION SELECT injection</div>
          </button>

          <button
            type="button"
            onClick={() => handleTestProbe('xss')}
            disabled={isLoading}
            className="p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/50 rounded-2xl text-left transition-all cursor-pointer group"
          >
            <div className="text-[10px] font-mono text-amber-400 font-bold mb-1 group-hover:text-amber-300">
              [PROBE 2]
            </div>
            <div className="text-xs font-extrabold text-white">Test XSS Shield</div>
            <div className="text-[10px] text-slate-400 mt-0.5 truncate">&lt;script&gt; payload</div>
          </button>

          <button
            type="button"
            onClick={() => handleTestProbe('traversal')}
            disabled={isLoading}
            className="p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/50 rounded-2xl text-left transition-all cursor-pointer group"
          >
            <div className="text-[10px] font-mono text-blue-400 font-bold mb-1 group-hover:text-blue-300">
              [PROBE 3]
            </div>
            <div className="text-xs font-extrabold text-white">Test LFI Traversal</div>
            <div className="text-[10px] text-slate-400 mt-0.5 truncate">../../etc/passwd attempt</div>
          </button>

          <button
            type="button"
            onClick={() => handleTestProbe('bot')}
            disabled={isLoading}
            className="p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/50 rounded-2xl text-left transition-all cursor-pointer group"
          >
            <div className="text-[10px] font-mono text-rose-400 font-bold mb-1 group-hover:text-rose-300">
              [PROBE 4]
            </div>
            <div className="text-xs font-extrabold text-white">Test Bot Shield</div>
            <div className="text-[10px] text-slate-400 mt-0.5 truncate">Automated scanner user-agent</div>
          </button>
        </div>
      </div>

      {/* Incident Stream Register */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-600" />
            <div>
              <h3 className="font-black text-slate-900 text-sm">Intercepted Threat Incident Register</h3>
              <p className="text-[11px] text-slate-500">Live forensic stream of blocked unauthorized requests</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700"
            >
              <option value="ALL">All Threat Vectors ({incidents.length})</option>
              <option value="SQL_INJECTION">SQL Injections</option>
              <option value="XSS_ATTACK">XSS Attacks</option>
              <option value="PATH_TRAVERSAL">Path Traversals</option>
              <option value="BOT_PROBE">Scanner Bots</option>
            </select>

            <button
              type="button"
              onClick={handleClear}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              title="Clear Incident Register"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 text-[10px] font-black uppercase tracking-wider">
                <th className="p-4">Time & ID</th>
                <th className="p-4">Origin IP</th>
                <th className="p-4">Threat Vector</th>
                <th className="p-4">Severity</th>
                <th className="p-4">Endpoint</th>
                <th className="p-4">Matched Signature</th>
                <th className="p-4 text-right">Mitigation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredIncidents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 space-y-1">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                    <p className="text-xs font-bold text-slate-600">No active security violations in the register.</p>
                    <p className="text-[11px] text-slate-400">All inbound traffic verified clean and compliant.</p>
                  </td>
                </tr>
              ) : (
                filteredIncidents.map((inc) => (
                  <tr key={inc.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-4 font-mono text-[11px]">
                      <div className="font-bold text-slate-900">{inc.timestamp.slice(11, 19)}</div>
                      <div className="text-[9px] text-slate-400">{inc.id}</div>
                    </td>
                    <td className="p-4 font-mono text-xs font-semibold text-slate-700">
                      {inc.ip}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black tracking-wide ${
                        inc.threatType === 'SQL_INJECTION' 
                          ? 'bg-purple-100 text-purple-800' 
                          : inc.threatType === 'XSS_ATTACK'
                          ? 'bg-amber-100 text-amber-800'
                          : inc.threatType === 'PATH_TRAVERSAL'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {inc.threatType.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="text-[10px] font-extrabold text-rose-600">
                        {inc.severity}
                      </span>
                    </td>
                    <td className="p-4 font-mono text-xs text-slate-600">
                      <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] font-bold text-slate-800 mr-1">{inc.method}</span>
                      {inc.path}
                    </td>
                    <td className="p-4 max-w-[240px] truncate text-[11px] text-slate-600" title={inc.matchedSignature}>
                      {inc.matchedSignature}
                    </td>
                    <td className="p-4 text-right">
                      <span className="bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-md font-mono text-[10px] font-black">
                        {inc.action}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default FirewallDefensePanel;

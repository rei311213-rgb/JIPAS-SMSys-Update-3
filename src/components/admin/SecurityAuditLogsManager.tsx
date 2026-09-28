import React, { useState } from 'react';
import { getSchoolLogo } from '../common/JIPASLogo';
import { SecurityAuditLog } from '../../types';
import { getStoredSecurityAuditLogs, saveStoredSecurityAuditLogs, recordSecurityAuditLog } from '../../services/storageService';
import { ShieldCheck, Search, Filter, Download, Printer, UserCheck, Clock, ShieldAlert, Key, Lock, Plus } from 'lucide-react';

export const SecurityAuditLogsManager: React.FC = () => {
  const [logs, setLogs] = useState<SecurityAuditLog[]>(() => getStoredSecurityAuditLogs());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState('All');

  const filteredLogs = logs.filter(log => {
    const q = searchQuery.toLowerCase();
    const matchSearch = 
      !q || 
      log.performedBy.toLowerCase().includes(q) ||
      log.targetUser.toLowerCase().includes(q) ||
      log.details.toLowerCase().includes(q) ||
      log.actionType.toLowerCase().includes(q);

    const matchAction = filterAction === 'All' || log.actionType === filterAction;

    return matchSearch && matchAction;
  });

  const handleExportCSV = () => {
    const headers = ['ID', 'Timestamp', 'Performed By', 'Role', 'Target User', 'Target Role', 'Action Type', 'Details'];
    const rows = filteredLogs.map(l => [
      l.id,
      `"${l.timestamp}"`,
      `"${l.performedBy}"`,
      `"${l.performedByRole}"`,
      `"${l.targetUser}"`,
      `"${l.targetUserRole}"`,
      `"${l.actionType}"`,
      `"${l.details.replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `JIPAS_Security_Audit_Logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintAuditReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const logoSrc = getSchoolLogo();
    const absoluteLogoSrc = logoSrc.startsWith('http') || logoSrc.startsWith('data:') 
      ? logoSrc 
      : window.location.origin + (logoSrc.startsWith('/') ? '' : '/') + logoSrc;

    printWindow.document.write(`
      <html>
        <head>
          <title>JIPAS System Security & Audit Log Report</title>
          <style>
            body { font-family: system-ui, sans-serif; padding: 30px; color: #0f172a; }
            .header-wrap { display: flex; align-items: center; gap: 10px; margin-bottom: 4px; }
            .school-logo { width: 32px; height: 32px; object-fit: contain; }
            h1 { color: #1e1b4b; margin: 0; font-size: 20px; }
            .subtitle { color: #64748b; font-size: 12px; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 15px; }
            th { background: #0f172a; color: white; text-align: left; padding: 8px; font-size: 10px; text-transform: uppercase; }
            td { padding: 8px; border-bottom: 1px solid #e2e8f0; }
            .badge { display: inline-block; padding: 2px 6px; background: #e0e7ff; color: #3730a3; border-radius: 4px; font-weight: bold; font-size: 10px; }
          </style>
        </head>
        <body>
          <div class="header-wrap">
            <img src="${absoluteLogoSrc}" alt="School Crest" class="school-logo" />
            <h1>JIPAS Educational Complex — System Security & Role Audit Trail</h1>
          </div>
          <div class="subtitle">Generated on ${new Date().toLocaleString()} | Target: Role Modifications & Privilege Changes</div>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Timestamp</th>
                <th>Administrator</th>
                <th>Target User</th>
                <th>Action Type</th>
                <th>Modification Details</th>
              </tr>
            </thead>
            <tbody>
              ${filteredLogs.map((l, i) => `
                <tr>
                  <td>${i + 1}</td>
                  <td>${l.timestamp}</td>
                  <td><strong>${l.performedBy}</strong> (${l.performedByRole})</td>
                  <td><strong>${l.targetUser}</strong></td>
                  <td><span class="badge">${l.actionType}</span></td>
                  <td>${l.details}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <script>window.onload = function() { window.print(); window.close(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-100 text-indigo-800 rounded-2xl">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black text-slate-900">Security & Role Audit Logs</h3>
              <span className="bg-indigo-100 text-indigo-800 font-extrabold text-[10px] px-2 py-0.5 rounded-full uppercase">
                {filteredLogs.length} Events Tracked
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Timestamped history of all user role assignments, sub-accountant privilege updates, and secretary permission changes.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 text-indigo-600" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handlePrintAuditReport}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Audit Report</span>
          </button>
        </div>
      </div>

      {/* Filters bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
        <div className="relative flex-1 min-w-[220px]">
          <input
            type="text"
            placeholder="Search by administrator, target user, or changes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-indigo-500"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-600">Action Type:</label>
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white font-bold text-slate-700"
          >
            <option value="All">All Actions</option>
            <option value="Privilege Modification">Privilege Modification</option>
            <option value="Role Update">Role Update</option>
            <option value="Access Level Change">Access Level Change</option>
            <option value="Password Reset">Password Reset</option>
            <option value="Account Deactivation">Account Deactivation</option>
          </select>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200">
        <table className="w-full text-left border-collapse whitespace-nowrap text-xs">
          <thead>
            <tr className="bg-slate-900 text-white font-bold uppercase text-[10px]">
              <th className="p-3 w-12">#</th>
              <th className="p-3">Timestamp</th>
              <th className="p-3">Performed By (Admin)</th>
              <th className="p-3">Target User</th>
              <th className="p-3">Action Type</th>
              <th className="p-3">Modification Details</th>
              <th className="p-3 text-center">Security Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-400 font-medium">
                  No security audit records match your search query or action filter.
                </td>
              </tr>
            ) : (
              filteredLogs.map((log, idx) => (
                <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3 text-slate-400 font-mono">{idx + 1}</td>
                  <td className="p-3 text-slate-500 font-mono flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{log.timestamp}</span>
                  </td>
                  <td className="p-3">
                    <div className="font-bold text-slate-900">{log.performedBy}</div>
                    <div className="text-[10px] text-indigo-600 uppercase font-mono">{log.performedByRole}</div>
                  </td>
                  <td className="p-3">
                    <div className="font-extrabold text-indigo-950">{log.targetUser}</div>
                    <div className="text-[10px] text-slate-500 uppercase font-mono">{log.targetUserRole}</div>
                  </td>
                  <td className="p-3">
                    <span className="px-2.5 py-1 bg-indigo-50 border border-indigo-200 text-indigo-800 rounded-lg text-[10px] font-black uppercase tracking-wider">
                      {log.actionType}
                    </span>
                  </td>
                  <td className="p-3 text-slate-700 max-w-[320px] truncate" title={log.details}>
                    {log.details}
                  </td>
                  <td className="p-3 text-center">
                    <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" /> Audit Verified
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SecurityAuditLogsManager;

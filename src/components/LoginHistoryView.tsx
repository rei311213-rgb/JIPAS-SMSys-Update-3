import React, { useState } from 'react';
import { 
  BarChart3, CheckCircle2, XCircle, Users, RotateCcw, 
  Download, Filter, Minus, Plus, Monitor, Smartphone, 
  Hourglass, LogOut, Search
} from 'lucide-react';

interface LoginRecord {
  id: string;
  name?: string;
  user?: string;
  role: string;
  email?: string;
  ipAddress: string;
  device: 'Desktop' | 'Mobile' | 'Tablet';
  browser: string;
  os: string;
  loginTime: string;
  logoutTime?: string | null;
  duration?: string;
  status: 'Success' | 'Failed';
  failReason?: string;
}

const STUDENT_LOGIN_RECORDS: LoginRecord[] = [];

const USER_LOGIN_RECORDS: LoginRecord[] = [];

interface LoginHistoryViewProps {
  type: 'student' | 'user';
  onNavigateDashboard: () => void;
  onLogout: () => void;
}

export default function LoginHistoryView({
  type,
  onNavigateDashboard,
  onLogout
}: LoginHistoryViewProps) {
  const isStudent = type === 'student';
  const rawList = isStudent ? STUDENT_LOGIN_RECORDS : USER_LOGIN_RECORDS;

  // Filter states
  const [nameSearch, setNameSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [deviceFilter, setDeviceFilter] = useState('All');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [filterCollapsed, setFilterCollapsed] = useState(false);

  // Metric stats
  const totalLogins = rawList.length;
  const successfulLogins = rawList.filter(r => r.status === 'Success').length;
  const failedAttempts = rawList.filter(r => r.status === 'Failed').length;
  const uniqueUsers = new Set(rawList.map(r => r.name || r.user || r.email)).size;

  const handleReset = () => {
    setNameSearch('');
    setRoleFilter('All');
    setStatusFilter('All');
    setDeviceFilter('All');
    setFromDate('');
    setToDate('');
  };

  const handleExport = () => {
    const csvContent = "data:text/csv;charset=utf-8," + 
      (isStudent ? "ID,Name,Role,IP Address,Device,Browser,OS,Login Time,Logout Time,Status\n" : "ID,User,Role,Email,IP Address,Device,Browser,OS,Login Time,Logout Time,Status\n") +
      rawList.map(r => `${r.id},"${r.name || r.user || ''}","${r.role}","${r.email || ''}","${r.ipAddress}","${r.device}","${r.browser}","${r.os}","${r.loginTime}","${r.logoutTime || 'No Logout'}","${r.status}"`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${isStudent ? 'student_parent_logins' : 'user_logins'}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredRecords = rawList.filter(item => {
    const nameMatch = !nameSearch || 
      (item.name && item.name.toLowerCase().includes(nameSearch.toLowerCase())) ||
      (item.user && item.user.toLowerCase().includes(nameSearch.toLowerCase())) ||
      (item.email && item.email.toLowerCase().includes(nameSearch.toLowerCase()));
    
    const roleMatch = roleFilter === 'All' || item.role.toLowerCase() === roleFilter.toLowerCase();
    const statusMatch = statusFilter === 'All' || item.status === statusFilter;
    const deviceMatch = deviceFilter === 'All' || item.device === deviceFilter;
    return nameMatch && roleMatch && statusMatch && deviceMatch;
  });

  const getRoleBadge = (role: string) => {
    const r = role.toLowerCase();
    if (r === 'admin') {
      return <span className="bg-rose-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-2xs">Admin</span>;
    }
    if (r === 'teacher') {
      return <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-2xs">Teacher</span>;
    }
    if (r === 'accountant') {
      return <span className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-2xs">Accountant</span>;
    }
    if (r === 'student') {
      return <span className="bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-2xs">Student</span>;
    }
    if (r === 'parent') {
      return <span className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-2xs">Parent</span>;
    }
    if (r === 'unknown') {
      return <span className="bg-slate-500 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-2xs">unknown</span>;
    }
    return <span className="text-slate-500 font-bold">-</span>;
  };

  return (
    <div className="space-y-6">
      {/* Top Header bar with Title, Breadcrumb and Logout Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
            <span className="text-xl">🕒</span>
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
              {isStudent ? 'Student & Parent Login History' : 'Login History'}
            </h2>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <button 
                onClick={onNavigateDashboard} 
                className="text-blue-600 hover:underline font-medium"
              >
                Dashboard
              </button>
              <span>/</span>
              <span className="text-slate-700 font-semibold">Login History</span>
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            if (window.confirm("Are you sure you want to log out of JIPAS?")) {
              onLogout();
            }
          }}
          className="bg-rose-600 hover:bg-rose-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>

      {/* Top 4 Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Card 1: Total Logins */}
        <div className="bg-[#00a6b4] text-white p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs uppercase font-bold text-cyan-100 mb-1">Total Logins</p>
            <span className="text-3xl sm:text-4xl font-black">{totalLogins}</span>
          </div>
          <BarChart3 className="w-10 h-10 opacity-80" />
        </div>

        {/* Card 2: Successful */}
        <div className="bg-[#28a745] text-white p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs uppercase font-bold text-emerald-100 mb-1">Successful</p>
            <span className="text-3xl sm:text-4xl font-black">{successfulLogins}</span>
          </div>
          <CheckCircle2 className="w-10 h-10 opacity-80" />
        </div>

        {/* Card 3: Failed Attempts */}
        <div className="bg-[#dc3545] text-white p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs uppercase font-bold text-rose-100 mb-1">Failed Attempts</p>
            <span className="text-3xl sm:text-4xl font-black">{failedAttempts}</span>
          </div>
          <XCircle className="w-10 h-10 opacity-80" />
        </div>

        {/* Card 4: Unique Users */}
        <div className="bg-[#ffc107] text-slate-900 p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs uppercase font-bold text-amber-900 mb-1">Unique Users</p>
            <span className="text-3xl sm:text-4xl font-black text-slate-900">{uniqueUsers}</span>
          </div>
          <Users className="w-10 h-10 text-amber-900 opacity-80" />
        </div>
      </div>

      {/* Collapsible Filter Login Records Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div 
          onClick={() => setFilterCollapsed(!filterCollapsed)}
          className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200 flex justify-between items-center cursor-pointer select-none"
        >
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
            <Filter className="w-3.5 h-3.5 text-slate-600" />
            <span>Filter Login Records</span>
          </div>
          <button 
            type="button" 
            aria-label="Toggle filter" 
            className="text-slate-400 hover:text-slate-600"
          >
            {filterCollapsed ? <Plus className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
          </button>
        </div>

        {!filterCollapsed && (
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {/* Username Input */}
              <div>
                <input
                  type="text"
                  value={nameSearch}
                  onChange={(e) => setNameSearch(e.target.value)}
                  placeholder={isStudent ? "Username" : "User Name"}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium placeholder-slate-400 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Roles Dropdown */}
              <div>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white font-medium text-slate-700"
                >
                  <option value="All">All Roles</option>
                  {isStudent ? (
                    <>
                      <option value="Student">Student</option>
                      <option value="Parent">Parent</option>
                      <option value="unknown">unknown</option>
                    </>
                  ) : (
                    <>
                      <option value="Admin">Admin</option>
                      <option value="Teacher">Teacher</option>
                      <option value="Accountant">Accountant</option>
                    </>
                  )}
                </select>
              </div>

              {/* Status Dropdown */}
              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white font-medium text-slate-700"
                >
                  <option value="All">All Status</option>
                  <option value="Success">Success</option>
                  <option value="Failed">Failed</option>
                </select>
              </div>

              {/* Devices Dropdown */}
              <div>
                <select
                  value={deviceFilter}
                  onChange={(e) => setDeviceFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white font-medium text-slate-700"
                >
                  <option value="All">All Devices</option>
                  <option value="Desktop">Desktop</option>
                  <option value="Mobile">Mobile</option>
                </select>
              </div>

              {/* Date From */}
              <div>
                <input
                  type="text"
                  placeholder="dd/mm/yyyy"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium text-slate-700 placeholder-slate-400"
                />
              </div>

              {/* Date To */}
              <div>
                <input
                  type="text"
                  placeholder="dd/mm/yyyy"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium text-slate-700 placeholder-slate-400"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 pt-1">
              <button 
                onClick={() => {}}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5"
              >
                <Search className="w-3.5 h-3.5" /> Filter
              </button>
              <button 
                onClick={handleReset}
                className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset
              </button>
              <button 
                onClick={handleExport}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> Export
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Login Records Table Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center gap-2 text-xs font-bold text-slate-800">
          <span>📜</span>
          <span>Login Records</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap text-xs">
            <thead>
              <tr className="bg-slate-900 text-white font-bold uppercase text-[10px]">
                <th className="p-3">ID</th>
                <th className="p-3">{isStudent ? 'Name' : 'User'}</th>
                <th className="p-3">Role</th>
                {!isStudent && <th className="p-3">Email</th>}
                <th className="p-3">IP Address</th>
                <th className="p-3">Device</th>
                <th className="p-3">Browser</th>
                <th className="p-3">OS</th>
                <th className="p-3">Login Time</th>
                <th className="p-3">Logout Time</th>
                <th className="p-3">Status</th>
                {isStudent && <th className="p-3">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={isStudent ? 12 : 11} className="p-6 text-center text-slate-500 font-medium">
                    No login records match your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* ID */}
                    <td className="p-3 text-slate-700 font-semibold">{rec.id}</td>

                    {/* Name or User */}
                    <td className="p-3 text-slate-900 font-bold">
                      {isStudent ? (rec.name || 'Unknown') : (rec.user || 'Unknown')}
                    </td>

                    {/* Role */}
                    <td className="p-3">
                      {getRoleBadge(rec.role)}
                    </td>

                    {/* Email (User table only) */}
                    {!isStudent && (
                      <td className="p-3 text-slate-600 font-mono text-[11px]">
                        {rec.email || '-'}
                      </td>
                    )}

                    {/* IP Address */}
                    <td className="p-3 text-[#e83e8c] font-mono text-[11px] font-semibold">
                      {rec.ipAddress}
                    </td>

                    {/* Device with icon */}
                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        {rec.device === 'Desktop' ? (
                          <>
                            <Monitor className="w-4 h-4 text-emerald-600" />
                            <span className="text-slate-700 font-medium">Desktop</span>
                          </>
                        ) : (
                          <>
                            <Smartphone className="w-4 h-4 text-blue-500" />
                            <span className="text-slate-700 font-medium">Mobile</span>
                          </>
                        )}
                      </div>
                    </td>

                    {/* Browser */}
                    <td className="p-3 text-slate-700">{rec.browser}</td>

                    {/* OS */}
                    <td className="p-3 text-slate-700">{rec.os}</td>

                    {/* Login Time */}
                    <td className="p-3 text-slate-800 font-semibold">{rec.loginTime}</td>

                    {/* Logout Time */}
                    <td className="p-3">
                      {rec.logoutTime ? (
                        <div className="space-y-0.5">
                          <div className="text-slate-800 font-semibold">{rec.logoutTime}</div>
                          {rec.duration && (
                            <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-bold">
                              <Hourglass className="w-3 h-3 text-emerald-600" />
                              <span>{rec.duration}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="bg-[#ffc107] text-slate-900 text-[10px] font-bold px-2 py-0.5 rounded shadow-2xs">
                          No Logout
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="p-3">
                      {rec.status === 'Success' ? (
                        <span className="bg-[#28a745] text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-2xs inline-flex items-center gap-1">
                          ✔ Success
                        </span>
                      ) : (
                        <div className="space-y-0.5">
                          <span className="bg-[#dc3545] text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-2xs inline-flex items-center gap-1">
                            ✖ Failed
                          </span>
                          {rec.failReason && (
                            <div className="text-[10px] text-rose-600 font-semibold">
                              {rec.failReason}
                            </div>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Action (Student table only) */}
                    {isStudent && (
                      <td className="p-3 text-slate-400">
                        <button 
                          onClick={() => alert(`Viewing session details for ID ${rec.id} (${rec.loginTime})`)}
                          className="hover:text-blue-600 text-[11px] font-bold"
                          title="View Details"
                        >
                          👁
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div>Showing {filteredRecords.length} records</div>
          <div className="flex items-center gap-1">
            <button className="px-2.5 py-1 rounded bg-blue-600 text-white font-bold text-xs">
              1
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

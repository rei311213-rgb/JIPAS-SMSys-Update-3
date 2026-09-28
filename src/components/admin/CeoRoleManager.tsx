import React, { useState, useEffect, useMemo, FormEvent } from 'react';
import { 
  UserAccountItem, 
  CeoPrivilegesConfig,
  DEFAULT_CEO_PRIVILEGES 
} from '../../types';
import { 
  getStoredUsers, 
  saveStoredUsers,
  saveUserAccount,
  deleteUserAccount,
  subscribeUsers
} from '../../services/dbService';
import { 
  Crown,
  Shield, 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  Save, 
  Plus, 
  UserPlus, 
  UserCog, 
  DollarSign, 
  Receipt, 
  Lock, 
  Check, 
  X, 
  Edit3, 
  Trash2,
  AlertCircle,
  Sparkles,
  Info,
  Building2,
  Award,
  Users,
  Eye,
  KeyRound,
  FileText,
  AlertTriangle,
  Briefcase,
  TrendingUp,
  Clock,
  Download,
  Search,
  BookOpen
} from 'lucide-react';

interface CeoRoleManagerProps {
  onUsersUpdated?: (users: UserAccountItem[]) => void;
}

// Preset Privilege Profiles for Fast Configuration
const PRESET_PROFILES: {
  id: string;
  name: string;
  badge: string;
  description: string;
  privileges: CeoPrivilegesConfig;
}[] = [
  {
    id: 'full_proprietor',
    name: 'Full Proprietor / CEO',
    badge: 'Unrestricted',
    description: 'Complete unrestricted visibility across institutional finances, academic rankings, staff payroll, and automated risk alarms.',
    privileges: {
      canViewFinancials: true,
      canViewDetailedExpenses: true,
      canViewPayrollDetails: true,
      canViewDebtorsList: true,
      canViewAcademicReports: true,
      canViewStudentDirectory: true,
      canViewParentContacts: true,
      canViewStaffDirectory: true,
      canViewStaffAttendance: true,
      canViewDisciplineLogs: true,
      canViewSecurityAudit: true,
      canExportReports: true,
      canViewConsolidatedExecutiveReport: true,
      canReceiveExecutiveAlerts: true,
      readOnlyMode: false
    }
  },
  {
    id: 'board_director',
    name: 'Board of Directors',
    badge: 'Governance',
    description: 'High-level executive financial summaries and academic performance. Sensitive parent contacts and detailed expense receipts are restricted.',
    privileges: {
      canViewFinancials: true,
      canViewDetailedExpenses: false,
      canViewPayrollDetails: false,
      canViewDebtorsList: true,
      canViewAcademicReports: true,
      canViewStudentDirectory: true,
      canViewParentContacts: false,
      canViewStaffDirectory: true,
      canViewStaffAttendance: false,
      canViewDisciplineLogs: false,
      canViewSecurityAudit: true,
      canExportReports: true,
      canViewConsolidatedExecutiveReport: true,
      canReceiveExecutiveAlerts: true,
      readOnlyMode: true
    }
  },
  {
    id: 'academic_director',
    name: 'Academic & Curriculum Director',
    badge: 'Academic',
    description: 'Complete access to academic metrics, term rankings, student profiles, and staff directory. All financial ledgers and payroll are hidden.',
    privileges: {
      canViewFinancials: false,
      canViewDetailedExpenses: false,
      canViewPayrollDetails: false,
      canViewDebtorsList: false,
      canViewAcademicReports: true,
      canViewStudentDirectory: true,
      canViewParentContacts: true,
      canViewStaffDirectory: true,
      canViewStaffAttendance: true,
      canViewDisciplineLogs: true,
      canViewSecurityAudit: false,
      canExportReports: true,
      canViewConsolidatedExecutiveReport: false,
      canReceiveExecutiveAlerts: false,
      readOnlyMode: false
    }
  },
  {
    id: 'financial_oversight',
    name: 'Financial Oversight / Auditor',
    badge: 'Financial',
    description: 'Comprehensive financial summaries, expense monitoring, and fee arrears audits. Disciplinary logs and student contact details are hidden.',
    privileges: {
      canViewFinancials: true,
      canViewDetailedExpenses: true,
      canViewPayrollDetails: true,
      canViewDebtorsList: true,
      canViewAcademicReports: false,
      canViewStudentDirectory: false,
      canViewParentContacts: false,
      canViewStaffDirectory: false,
      canViewStaffAttendance: false,
      canViewDisciplineLogs: false,
      canViewSecurityAudit: true,
      canExportReports: true,
      canViewConsolidatedExecutiveReport: true,
      canReceiveExecutiveAlerts: true,
      readOnlyMode: true
    }
  },
  {
    id: 'strict_observer',
    name: 'Executive Observer (Read-Only)',
    badge: 'Observer',
    description: 'Strict view-only access across allowed reports with zero data export or modification privileges.',
    privileges: {
      canViewFinancials: true,
      canViewDetailedExpenses: false,
      canViewPayrollDetails: false,
      canViewDebtorsList: false,
      canViewAcademicReports: true,
      canViewStudentDirectory: true,
      canViewParentContacts: false,
      canViewStaffDirectory: true,
      canViewStaffAttendance: false,
      canViewDisciplineLogs: false,
      canViewSecurityAudit: false,
      canExportReports: false,
      canViewConsolidatedExecutiveReport: true,
      canReceiveExecutiveAlerts: true,
      readOnlyMode: true
    }
  }
];

export default function CeoRoleManager({ onUsersUpdated }: CeoRoleManagerProps) {
  const [users, setUsers] = useState<UserAccountItem[]>(() => getStoredUsers());

  useEffect(() => {
    const unsub = subscribeUsers((loadedUsers) => {
      setUsers(loadedUsers);
    });
    return () => unsub();
  }, []);
  const [selectedUser, setSelectedUser] = useState<UserAccountItem | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // New Account State
  const [newName, setNewName] = useState('');
  const [newExecutiveTitle, setNewExecutiveTitle] = useState('School Proprietor (CEO)');
  const [newRole, setNewRole] = useState<'ceo' | 'director'>('ceo');
  const [newEmail, setNewEmail] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newPassword, setNewPassword] = useState('CEO@2026');
  const [newPreset, setNewPreset] = useState('full_proprietor');

  // Edit Account State
  const [editName, setEditName] = useState('');
  const [editExecutiveTitle, setEditExecutiveTitle] = useState('');
  const [editRole, setEditRole] = useState<'ceo' | 'director'>('ceo');
  const [editEmail, setEditEmail] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editStatus, setEditStatus] = useState<'Active' | 'Inactive' | 'Locked'>('Active');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Filter executive accounts (ceo, director)
  const executiveUsers = useMemo(() => {
    return users.filter(u => {
      const isExec = u.role === 'ceo' || u.role === 'director' || (u as any).registrationType === 'executive';
      if (!isExec) return false;
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.username && u.username.toLowerCase().includes(q)) ||
        (u.executiveTitle && u.executiveTitle.toLowerCase().includes(q))
      );
    });
  }, [users, searchQuery]);

  // If no user is selected, default to the first one
  React.useEffect(() => {
    if (!selectedUser && executiveUsers.length > 0) {
      setSelectedUser(executiveUsers[0]);
    } else if (selectedUser) {
      // Keep selectedUser synced with updated users list
      const refreshed = executiveUsers.find(u => u.id === selectedUser.id);
      if (refreshed) {
        setSelectedUser(refreshed);
      } else if (executiveUsers.length > 0) {
        setSelectedUser(executiveUsers[0]);
      } else {
        setSelectedUser(null);
      }
    }
  }, [executiveUsers]);

  // Toggle single privilege
  const handleTogglePrivilege = async (key: keyof CeoPrivilegesConfig) => {
    if (!selectedUser) return;
    const currentPrivs: CeoPrivilegesConfig = selectedUser.ceoPrivileges || { ...DEFAULT_CEO_PRIVILEGES };
    const updatedPrivs: CeoPrivilegesConfig = {
      ...currentPrivs,
      [key]: !currentPrivs[key]
    };

    const updatedUser: UserAccountItem = {
      ...selectedUser,
      ceoPrivileges: updatedPrivs
    };

    const updatedList = users.map(u => u.id === selectedUser.id ? updatedUser : u);
    setUsers(updatedList);
    setSelectedUser(updatedUser);
    saveStoredUsers(updatedList);
    await saveUserAccount(updatedUser);
    if (onUsersUpdated) onUsersUpdated(updatedList);

    showToast(`Updated "${String(key)}" for ${selectedUser.name}`);
  };

  // Apply a preset profile
  const handleApplyPreset = async (presetId: string) => {
    if (!selectedUser) return;
    const preset = PRESET_PROFILES.find(p => p.id === presetId);
    if (!preset) return;

    const updatedUser: UserAccountItem = {
      ...selectedUser,
      ceoPrivileges: { ...preset.privileges }
    };

    const updatedList = users.map(u => u.id === selectedUser.id ? updatedUser : u);
    setUsers(updatedList);
    setSelectedUser(updatedUser);
    saveStoredUsers(updatedList);
    await saveUserAccount(updatedUser);
    if (onUsersUpdated) onUsersUpdated(updatedList);

    showToast(`Applied preset "${preset.name}" to ${selectedUser.name}`);
  };

  // Toggle status
  const handleToggleStatus = async (user: UserAccountItem) => {
    const nextStatus = user.status === 'Active' ? 'Inactive' : 'Active';
    const updatedUser: UserAccountItem = {
      ...user,
      status: nextStatus
    };

    const updatedList = users.map(u => u.id === user.id ? updatedUser : u);
    setUsers(updatedList);
    saveStoredUsers(updatedList);
    await saveUserAccount(updatedUser);
    if (onUsersUpdated) onUsersUpdated(updatedList);

    showToast(`Account for ${user.name} is now ${nextStatus}`);
  };

  // Delete account
  const handleDeleteAccount = async (user: UserAccountItem) => {
    if (confirm(`Are you sure you want to remove the executive account for ${user.name}? This will revoke their portal access immediately.`)) {
      const updatedList = users.filter(u => u.id !== user.id);
      setUsers(updatedList);
      saveStoredUsers(updatedList);
      await deleteUserAccount(user.id);
      if (onUsersUpdated) onUsersUpdated(updatedList);
      if (selectedUser?.id === user.id) {
        setSelectedUser(updatedList.find(u => u.role === 'ceo' || u.role === 'director') || null);
      }
      showToast(`Executive account for ${user.name} was removed.`);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (user: UserAccountItem) => {
    setEditName(user.name);
    setEditExecutiveTitle(user.executiveTitle || (user.role === 'ceo' ? 'School Proprietor (CEO)' : 'Board Director'));
    setEditRole(user.role === 'director' ? 'director' : 'ceo');
    setEditEmail(user.email);
    setEditUsername(user.username || '');
    setEditPhone(user.phone || '');
    setEditPassword(user.password || '');
    setEditStatus((user.status as any) || 'Active');
    setShowEditModal(true);
  };

  // Save Edit Modal
  const handleSaveEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    const updatedUser: UserAccountItem = {
      ...selectedUser,
      name: editName.trim(),
      executiveTitle: editExecutiveTitle.trim(),
      role: editRole,
      email: editEmail.trim(),
      username: editUsername.trim(),
      phone: editPhone.trim(),
      password: editPassword.trim(),
      status: editStatus,
      registrationType: 'executive'
    };

    const updatedList = users.map(u => u.id === selectedUser.id ? updatedUser : u);
    setUsers(updatedList);
    setSelectedUser(updatedUser);
    saveStoredUsers(updatedList);
    await saveUserAccount(updatedUser);
    if (onUsersUpdated) onUsersUpdated(updatedList);

    setShowEditModal(false);
    showToast(`Executive account updated successfully.`);
  };

  // Handle Create New Account
  const handleCreateAccount = async (e: FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim() || !newUsername.trim()) {
      showToast('Please fill in Name, Email, and Username.');
      return;
    }

    // Check duplicate
    if (users.some(u => u.email.toLowerCase() === newEmail.trim().toLowerCase() || (u.username && u.username.toLowerCase() === newUsername.trim().toLowerCase()))) {
      showToast('An account with this email or username already exists.');
      return;
    }

    const selectedPresetObj = PRESET_PROFILES.find(p => p.id === newPreset);
    const initialPrivs: CeoPrivilegesConfig = selectedPresetObj 
      ? { ...selectedPresetObj.privileges } 
      : { ...DEFAULT_CEO_PRIVILEGES };

    const newAccount: UserAccountItem = {
      id: `usr-exec-${Date.now()}`,
      name: newName.trim(),
      executiveTitle: newExecutiveTitle.trim(),
      email: newEmail.trim(),
      username: newUsername.trim().toLowerCase(),
      phone: newPhone.trim(),
      password: newPassword.trim(),
      role: newRole,
      registrationType: 'executive',
      status: 'Active',
      isApproved: true,
      lastLogin: 'Never',
      createdAt: new Date().toISOString().split('T')[0],
      ceoPrivileges: initialPrivs
    };

    const updatedList = [newAccount, ...users];
    setUsers(updatedList);
    setSelectedUser(newAccount);
    saveStoredUsers(updatedList);
    await saveUserAccount(newAccount);
    if (onUsersUpdated) onUsersUpdated(updatedList);

    setShowAddModal(false);
    // Reset fields
    setNewName('');
    setNewEmail('');
    setNewUsername('');
    setNewPhone('');
    setNewPassword('CEO@2026');
    setNewExecutiveTitle('School Proprietor (CEO)');

    showToast(`Created executive account for ${newAccount.name} (${newAccount.executiveTitle})`);
  };

  const activePrivs: CeoPrivilegesConfig = selectedUser?.ceoPrivileges || { ...DEFAULT_CEO_PRIVILEGES };

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 rounded-2xl shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="p-3.5 bg-indigo-500/20 text-indigo-300 rounded-xl border border-indigo-500/30 shadow-inner">
              <Crown className="w-8 h-8 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                  CEO & Director Management
                </h1>
                <span className="bg-amber-400/20 text-amber-300 text-xs font-bold px-2.5 py-0.5 rounded-full border border-amber-400/30">
                  Executive Governance
                </span>
              </div>
              <p className="text-slate-400 text-sm mt-1 max-w-2xl">
                Create independent accounts for Proprietors, Managing Directors, and Board Members. Configure granular access controls and restrict sensitive academic or financial records.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2.5 rounded-xl text-sm shadow-lg shadow-indigo-600/30 hover:shadow-indigo-500/40 transition-all flex items-center gap-2 active:scale-95"
            >
              <UserPlus className="w-4 h-4" />
              Provision Executive Account
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Left = Executive Accounts Directory, Right = Granular Privilege Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Accounts Directory (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-indigo-600" />
                  Executive Accounts ({executiveUsers.length})
                </h2>
                <p className="text-xs text-slate-500">Select an account to view and configure privileges</p>
              </div>
            </div>

            {/* Search filter */}
            <div className="relative mb-4">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search by name, title, or username..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Accounts List */}
            <div className="space-y-2.5 max-h-[580px] overflow-y-auto pr-1">
              {executiveUsers.length === 0 ? (
                <div className="text-center py-10 px-4 border-2 border-dashed border-slate-200 rounded-xl">
                  <Crown className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-600">No Executive Accounts Found</p>
                  <p className="text-[11px] text-slate-400 mt-1 mb-3">Click below to provision the first CEO or Director account.</p>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-bold px-3 py-1.5 rounded-lg text-xs transition"
                  >
                    + Provision Account
                  </button>
                </div>
              ) : (
                executiveUsers.map(user => {
                  const isSelected = selectedUser?.id === user.id;
                  const isActive = user.status === 'Active';
                  const isDirector = user.role === 'director';

                  return (
                    <div
                      key={user.id}
                      onClick={() => setSelectedUser(user)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer relative ${
                        isSelected 
                          ? 'border-indigo-600 bg-indigo-50/50 shadow-sm ring-1 ring-indigo-500' 
                          : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/70'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 shadow-sm ${
                            isDirector 
                              ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                              : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                          }`}>
                            {isDirector ? 'DIR' : 'CEO'}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <h3 className="text-sm font-bold text-slate-900 truncate">{user.name}</h3>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                                isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {user.status}
                              </span>
                            </div>
                            <p className="text-xs font-semibold text-indigo-700 truncate">
                              {user.executiveTitle || (isDirector ? 'Board Director' : 'School Proprietor (CEO)')}
                            </p>
                            <p className="text-[11px] text-slate-500 truncate mt-0.5">
                              @{user.username || user.email}
                            </p>
                          </div>
                        </div>

                        {/* Quick Action Badges */}
                        <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                          <button
                            title="Edit Account Details"
                            onClick={() => handleOpenEdit(user)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            title={isActive ? 'Deactivate Account' : 'Activate Account'}
                            onClick={() => handleToggleStatus(user)}
                            className={`p-1.5 rounded-lg transition ${
                              isActive 
                                ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50' 
                                : 'text-emerald-600 bg-emerald-50'
                            }`}
                          >
                            {isActive ? <Lock className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            title="Delete Account"
                            onClick={() => handleDeleteAccount(user)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Privilege summary pill */}
                      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                        <span className="flex items-center gap-1">
                          <KeyRound className="w-3 h-3 text-slate-400" />
                          Password: {user.password ? 'Custom Protected' : 'Default'}
                        </span>
                        <span className="font-semibold text-slate-700">
                          {user.ceoPrivileges?.readOnlyMode ? '🔒 Read-Only' : '⚡ Interactive'}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Privilege Control Center (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {selectedUser ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
              
              {/* Selected User Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-800 text-white font-black text-base flex items-center justify-center shadow-md">
                    {selectedUser.role === 'director' ? 'DIR' : 'CEO'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-black text-slate-900">{selectedUser.name}</h2>
                      <span className="bg-indigo-100 text-indigo-800 text-xs font-bold px-2 py-0.5 rounded-full">
                        {selectedUser.role === 'director' ? 'Director' : 'CEO / Proprietor'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {selectedUser.executiveTitle || 'Executive Officer'} &bull; Username: <span className="font-mono font-semibold text-slate-700">@{selectedUser.username || selectedUser.email}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenEdit(selectedUser)}
                    className="text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition flex items-center gap-1.5"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Edit Account
                  </button>
                </div>
              </div>

              {/* Fast Presets Selector */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    Quick Privilege Presets
                  </label>
                  <span className="text-[11px] text-slate-500">1-click configuration templates</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {PRESET_PROFILES.map(preset => (
                    <button
                      key={preset.id}
                      onClick={() => handleApplyPreset(preset.id)}
                      className="p-2.5 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 text-left transition-all group"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition truncate">
                          {preset.name}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 line-clamp-2 leading-tight">
                        {preset.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Granular Privilege Categories */}
              <div className="space-y-6 pt-2">
                
                {/* Category 1: Financial & Commercial Oversight */}
                <div className="space-y-3">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2 pb-1 border-b border-slate-100">
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    Financial & Commercial Oversight
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <PrivilegeToggleCard
                      title="School Balances & Revenue"
                      description="View overall school balance, cash collection summaries & revenue trends."
                      checked={activePrivs.canViewFinancials}
                      onChange={() => handleTogglePrivilege('canViewFinancials')}
                    />
                    <PrivilegeToggleCard
                      title="Itemized Expenses & Receipts"
                      description="Inspect detailed operational expense vouchers, invoices and receipts."
                      checked={activePrivs.canViewDetailedExpenses}
                      onChange={() => handleTogglePrivilege('canViewDetailedExpenses')}
                    />
                    <PrivilegeToggleCard
                      title="Staff Payroll & Compensation"
                      description="View individual teacher salaries, staff loan schedules, and payroll runs."
                      checked={activePrivs.canViewPayrollDetails}
                      onChange={() => handleTogglePrivilege('canViewPayrollDetails')}
                    />
                    <PrivilegeToggleCard
                      title="Fee Arrears & Defaulters"
                      description="View outstanding student fees, debtor balances and fee recovery status."
                      checked={activePrivs.canViewDebtorsList}
                      onChange={() => handleTogglePrivilege('canViewDebtorsList')}
                    />
                  </div>
                </div>

                {/* Category 2: Academic & Institutional Performance */}
                <div className="space-y-3">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2 pb-1 border-b border-slate-100">
                    <Award className="w-4 h-4 text-indigo-600" />
                    Academic & Faculty Oversight
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <PrivilegeToggleCard
                      title="Academic Reports & Rankings"
                      description="Access student terminal scores, subject averages, and top performing classes."
                      checked={activePrivs.canViewAcademicReports}
                      onChange={() => handleTogglePrivilege('canViewAcademicReports')}
                    />
                    <PrivilegeToggleCard
                      title="Student Directory Records"
                      description="Browse enrolled student rosters, class allocations, and demographics."
                      checked={activePrivs.canViewStudentDirectory}
                      onChange={() => handleTogglePrivilege('canViewStudentDirectory')}
                    />
                    <PrivilegeToggleCard
                      title="Parent Contact Information"
                      description="View sensitive parent/guardian phone numbers and emergency contacts."
                      checked={activePrivs.canViewParentContacts}
                      onChange={() => handleTogglePrivilege('canViewParentContacts')}
                    />
                    <PrivilegeToggleCard
                      title="Teaching Faculty Directory"
                      description="Access teacher profiles, assigned classes, and department listings."
                      checked={activePrivs.canViewStaffDirectory}
                      onChange={() => handleTogglePrivilege('canViewStaffDirectory')}
                    />
                    <PrivilegeToggleCard
                      title="Staff Clock-in & Attendance"
                      description="View teacher arrival times, attendance percentages, and late records."
                      checked={activePrivs.canViewStaffAttendance}
                      onChange={() => handleTogglePrivilege('canViewStaffAttendance')}
                    />
                    <PrivilegeToggleCard
                      title="Discipline & Incident Logs"
                      description="View student behavioral records, infractions, and disciplinary actions."
                      checked={activePrivs.canViewDisciplineLogs}
                      onChange={() => handleTogglePrivilege('canViewDisciplineLogs')}
                    />
                  </div>
                </div>

                {/* Category 3: Executive Intelligence & Governance */}
                <div className="space-y-3">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2 pb-1 border-b border-slate-100">
                    <ShieldCheck className="w-4 h-4 text-purple-600" />
                    Executive Governance & Security
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <PrivilegeToggleCard
                      title="Consolidated Executive Report"
                      description="View synthesized cross-departmental operations and analytics summary."
                      checked={activePrivs.canViewConsolidatedExecutiveReport}
                      onChange={() => handleTogglePrivilege('canViewConsolidatedExecutiveReport')}
                    />
                    <PrivilegeToggleCard
                      title="Automated Executive Alerts"
                      description="Receive critical alerts on high fee arrears, unusual expenses, and low attendance."
                      checked={activePrivs.canReceiveExecutiveAlerts}
                      onChange={() => handleTogglePrivilege('canReceiveExecutiveAlerts')}
                    />
                    <PrivilegeToggleCard
                      title="Security & System Audit Logs"
                      description="Inspect security audit trails, user logins, and administrative changes."
                      checked={activePrivs.canViewSecurityAudit}
                      onChange={() => handleTogglePrivilege('canViewSecurityAudit')}
                    />
                    <PrivilegeToggleCard
                      title="Export Institutional Data"
                      description="Permission to download PDF summaries, Excel spreadsheets, and CSV files."
                      checked={activePrivs.canExportReports}
                      onChange={() => handleTogglePrivilege('canExportReports')}
                    />
                    <div className="sm:col-span-2">
                      <PrivilegeToggleCard
                        title="Strict Observation Mode (Read-Only)"
                        description="Locks account into view-only governance mode. Disallows all data mutations."
                        checked={activePrivs.readOnlyMode}
                        onChange={() => handleTogglePrivilege('readOnlyMode')}
                        isHighlight={true}
                      />
                    </div>
                  </div>
                </div>

              </div>

            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
              <Crown className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">No Account Selected</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Select an executive account from the list on the left to review or customize their individual access privileges.
              </p>
            </div>
          )}
        </div>

      </div>

      {/* Modal: Provision New Executive Account */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Crown className="w-6 h-6 text-amber-500" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900">Provision Executive Account</h2>
                  <p className="text-xs text-slate-500">Create an independent account for a School Proprietor or Director</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAccount} className="space-y-4">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Kwame Mensah"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Executive Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. School Proprietor (CEO)"
                    value={newExecutiveTitle}
                    onChange={e => setNewExecutiveTitle(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Role Classification *</label>
                  <select
                    value={newRole}
                    onChange={e => setNewRole(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                  >
                    <option value="ceo">CEO / Proprietor</option>
                    <option value="director">Board Director / Executive</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Initial Privilege Preset</label>
                  <select
                    value={newPreset}
                    onChange={e => setNewPreset(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {PRESET_PROFILES.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.badge})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. director@jipas.edu.gh"
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Unique Username *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. director.kwame"
                    value={newUsername}
                    onChange={e => setNewUsername(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number (Optional)</label>
                  <input
                    type="tel"
                    placeholder="e.g. 0244123456"
                    value={newPhone}
                    onChange={e => setNewPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Initial Access Password *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CEO@2026"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 flex items-start gap-2.5 text-xs text-indigo-900">
                <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <span>
                  This creates a separate, independent executive login with its own credentials. The Admin can modify or restrict their privileges anytime from this dashboard.
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md transition active:scale-95"
                >
                  Provision Executive Account
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Modal: Edit Executive Account */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900">Edit Executive Profile</h2>
                  <p className="text-xs text-slate-500">Update credentials and title for {selectedUser.name}</p>
                </div>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Executive Title</label>
                  <input
                    type="text"
                    required
                    value={editExecutiveTitle}
                    onChange={e => setEditExecutiveTitle(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Role Classification</label>
                  <select
                    value={editRole}
                    onChange={e => setEditRole(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                  >
                    <option value="ceo">CEO / Proprietor</option>
                    <option value="director">Board Director / Executive</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Account Status</label>
                  <select
                    value={editStatus}
                    onChange={e => setEditStatus(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                  >
                    <option value="Active">Active (Access Granted)</option>
                    <option value="Inactive">Inactive (Access Suspended)</option>
                    <option value="Locked">Locked</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={e => setEditEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Username</label>
                  <input
                    type="text"
                    required
                    value={editUsername}
                    onChange={e => setEditUsername(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={e => setEditPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Reset Password</label>
                  <input
                    type="text"
                    placeholder="Enter new password"
                    value={editPassword}
                    onChange={e => setEditPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md transition active:scale-95"
                >
                  Save Changes
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}

// Sub-component: Individual Privilege Toggle Card
function PrivilegeToggleCard({
  title,
  description,
  checked,
  onChange,
  isHighlight = false
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: () => void;
  isHighlight?: boolean;
}) {
  return (
    <div
      onClick={onChange}
      className={`p-3.5 rounded-xl border transition-all cursor-pointer select-none flex items-start justify-between gap-3 ${
        isHighlight
          ? checked
            ? 'bg-amber-500/10 border-amber-300 ring-1 ring-amber-400/40'
            : 'bg-slate-50 border-slate-200'
          : checked
          ? 'bg-indigo-50/50 border-indigo-200'
          : 'bg-slate-50/50 border-slate-200 hover:border-slate-300'
      }`}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <h4 className={`text-xs font-bold ${checked ? 'text-slate-900' : 'text-slate-600'}`}>
            {title}
          </h4>
          {checked && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          )}
        </div>
        <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
          {description}
        </p>
      </div>

      <div
        className={`w-9 h-5 rounded-full p-0.5 transition-colors shrink-0 mt-0.5 ${
          checked ? (isHighlight ? 'bg-amber-500' : 'bg-indigo-600') : 'bg-slate-300'
        }`}
      >
        <div
          className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </div>
    </div>
  );
}

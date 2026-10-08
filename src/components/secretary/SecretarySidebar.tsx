import React, { useState, useEffect } from 'react';
import { 
  FileText, DollarSign, Plus, Settings, AlertTriangle, 
  Pin, PinOff, ChevronRight, Menu, X, CheckCircle2, 
  TrendingUp, Sparkles, User, ShieldCheck, Wallet, Receipt, Layers, Building, Building2, BellRing, BarChart3, UserPlus, Search,
  GraduationCap, Briefcase, QrCode
} from 'lucide-react';
import JIPASLogo from '../common/JIPASLogo';
import SidebarToggleButton from '../common/SidebarToggleButton';

export type SecretaryTabType = 
  | 'dashboard'
  | 'fee_collection' 
  | 'expenses' 
  | 'daily_reconcile' 
  | 'students_lookup' 
  | 'bank_deposits' 
  | 'enroll_student' 
  | 'overdue_alerts' 
  | 'collections_log'
  | 'bulk_fee_entry'
  | 'graduated_batch'
  | 'employee_history'
  | 'staff_attendance'
  | 'generate_receipt'
  | 'next_term_bills';

interface SecretarySidebarProps {
  activeTab: SecretaryTabType;
  onSelectTab: (tab: SecretaryTabType) => void;
  collectionsCount?: number;
  studentsCount?: number;
  overdueCount?: number;
  expensesCount?: number;
  secretary?: any;
}

interface SecretaryNavItem {
  id: SecretaryTabType;
  category: string;
  label: string;
  sublabel: string;
  icon: React.ElementType;
  badge?: string | number;
  badgeColor?: string;
  isPrimaryAction?: boolean;
}

export default function SecretarySidebar({
  activeTab,
  onSelectTab,
  collectionsCount = 0,
  studentsCount = 0,
  overdueCount = 0,
  expensesCount = 0,
  secretary
}: SecretarySidebarProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPinned, setIsPinned] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('jipas_secretary_sidebar_pinned');
      if (saved !== null) {
        return saved === 'true';
      }
    }
    return false;
  });
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('jipas_secretary_sidebar_pinned', String(isPinned));
    } catch (e) {
      console.warn('Could not store secretary sidebar pin state:', e);
    }
  }, [isPinned]);

  const isExpanded = isHovered || isPinned;

  const navItems: SecretaryNavItem[] = [
    {
      id: 'dashboard',
      category: 'GENERAL',
      label: 'Secretary Dashboard',
      sublabel: 'Overview of campus activity, enrollment, and financials',
      icon: BarChart3,
    },
    {
      id: 'fee_collection',
      category: 'POS DESK',
      label: 'Collect School Fees',
      sublabel: 'Process student payments & generate instant official receipts',
      icon: Plus,
      badge: 'Quick',
      badgeColor: 'bg-emerald-500 text-white',
      isPrimaryAction: true
    },
    {
      id: 'expenses',
      category: 'OUTFLOWS',
      label: 'Record Daily Expenses',
      sublabel: 'Log petty cash disbursements & petty purchases',
      icon: Receipt,
      badge: expensesCount > 0 ? expensesCount : undefined,
      badgeColor: 'bg-rose-100 text-rose-800'
    },
    {
      id: 'daily_reconcile',
      category: 'RECONCILE',
      label: 'Daily Handover & Reconcile',
      sublabel: 'Balance desk totals & register bursar handover summary',
      icon: Layers,
      badge: 'Desk',
      badgeColor: 'bg-blue-100 text-blue-800'
    },
    {
      id: 'students_lookup',
      category: 'ROSTER',
      label: 'Student Records & Arrears',
      sublabel: 'Inspect student bill balances, history, and profiles',
      icon: Search,
      badge: studentsCount > 0 ? studentsCount : undefined,
      badgeColor: 'bg-blue-100 text-blue-800'
    },
    {
      id: 'bank_deposits',
      category: 'DEPOSITS',
      label: 'Bank Deposits',
      sublabel: 'Verify bank wire receipts, transfers & slip registers',
      icon: Building,
      badge: 'Bank',
      badgeColor: 'bg-emerald-100 text-emerald-800'
    },
    {
      id: 'enroll_student',
      category: 'INTAKE',
      label: 'Enroll New Student',
      sublabel: 'Enter official admission details & submit for approval',
      icon: UserPlus,
      badge: 'New',
      badgeColor: 'bg-cyan-500 text-white'
    },
    {
      id: 'overdue_alerts',
      category: 'ALERTS',
      label: 'Overdue Fee Alerts',
      sublabel: 'Send automated custom reminders via WhatsApp / SMS',
      icon: AlertTriangle,
      badge: overdueCount > 0 ? overdueCount : undefined,
      badgeColor: 'bg-rose-500 text-white animate-pulse'
    },
    {
      id: 'collections_log',
      category: 'LOGS',
      label: 'Payment Collections',
      sublabel: 'Browse full desk collections logs and audit trails',
      icon: FileText,
      badge: collectionsCount > 0 ? collectionsCount : undefined,
      badgeColor: 'bg-emerald-100 text-emerald-800'
    },
    {
      id: 'bulk_fee_entry',
      category: 'POS DESK',
      label: 'Bulk Fee & Billing Entry',
      sublabel: 'Batch upload bills or payments for multiple students',
      icon: Layers,
      badge: 'Bulk',
      badgeColor: 'bg-indigo-500 text-white'
    },
    {
      id: 'generate_receipt',
      category: 'POS DESK',
      label: 'Generate & Print Receipts',
      sublabel: 'Print A6 receipts individually or by class/date in batch',
      icon: FileText,
      badge: 'Batch',
      badgeColor: 'bg-indigo-500 text-white'
    },
    {
      id: 'next_term_bills',
      category: 'POS DESK',
      label: 'Next Term Fees Bill',
      sublabel: 'Generate individual student bills & print multiple receipts',
      icon: Layers,
      badge: 'Next Term',
      badgeColor: 'bg-emerald-500 text-white'
    },
    {
      id: 'graduated_batch',
      category: 'ALUMNI',
      label: 'Graduated Batch (BECE/WASSCE)',
      sublabel: 'Candidate index numbers, exam types, biodata & placements',
      icon: GraduationCap,
      badge: 'Batch',
      badgeColor: 'bg-purple-100 text-purple-800'
    },
    {
      id: 'employee_history',
      category: 'PERSONNEL',
      label: 'Employee History (Past Staff)',
      sublabel: 'Add & modify past staff service, roles & subjects records',
      icon: Briefcase,
      badge: 'Archive',
      badgeColor: 'bg-indigo-100 text-indigo-800'
    },
    {
      id: 'staff_attendance',
      category: 'PERSONNEL',
      label: 'Staff Attendance Scanner',
      sublabel: 'Scan daily entrance QR code and view personal attendance status',
      icon: QrCode,
      badge: 'Scan',
      badgeColor: 'bg-indigo-500 text-white'
    }
  ];

  const handleSelect = (tab: SecretaryTabType) => {
    onSelectTab(tab);
    setIsMobileOpen(false);
  };

  return (
    <>
      {/* MOBILE TRIGGER BAR */}
      <div className="lg:hidden w-full bg-white border border-slate-200 rounded-2xl p-3 flex items-center justify-between shadow-xs mb-4">
        <div className="flex items-center gap-2">
          <SidebarToggleButton
            isOpen={isMobileOpen}
            onToggle={() => setIsMobileOpen(true)}
            variant="compact"
            ariaLabel="Open Secretary Menu"
          />
          <div>
            <span className="text-xs font-bold text-slate-800 block">Secretary Navigation</span>
            <span className="text-[10px] text-pink-700 font-semibold uppercase tracking-wider">
              Active: {navItems.find(n => n.id === activeTab)?.label}
            </span>
          </div>
        </div>

        <button
          onClick={() => handleSelect('fee_collection')}
          className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Collect Fee</span>
        </button>
      </div>

      {/* MOBILE DRAWER */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileOpen(false)}
          />

          <div className="relative w-80 max-w-[90vw] bg-slate-900 text-white flex flex-col h-full shadow-2xl z-10 p-4 space-y-4 overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <JIPASLogo size="sm" />
                <div>
                  <h3 className="text-sm font-bold text-white">Secretary Quick Action & Desk</h3>
                  <span className="text-[10px] text-pink-400 font-medium">Front Office Management</span>
                </div>
              </div>
              <button
                onClick={() => setIsMobileOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 space-y-3 pb-6">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <div key={item.id} className="space-y-1">
                    <span className="text-[9px] font-black tracking-widest text-pink-400 uppercase px-1">{item.category}</span>
                    <button
                      onClick={() => handleSelect(item.id)}
                      className={`w-full flex items-start gap-3 p-3 rounded-xl transition-all cursor-pointer text-left border ${
                        isActive 
                          ? 'bg-pink-600 text-white font-bold shadow-md border-pink-400' 
                          : 'bg-slate-800/90 hover:bg-slate-700 text-slate-200 border-slate-700/60'
                      }`}
                    >
                      <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${isActive ? 'text-white' : 'text-pink-400'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-extrabold truncate">{item.label}</span>
                          {item.badge !== undefined && (
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${item.badgeColor || 'bg-slate-700 text-pink-200'}`}>
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <p className={`text-[10px] mt-0.5 leading-snug line-clamp-2 ${isActive ? 'text-pink-100' : 'text-slate-400'}`}>
                          {item.sublabel}
                        </p>
                      </div>
                    </button>
                  </div>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* DESKTOP HOVER/PIN SIDEBAR */}
      <aside
        id="secretary-hover-sidebar"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`hidden lg:flex flex-col flex-shrink-0 sticky top-24 bg-white border border-slate-200 rounded-3xl shadow-sm transition-all duration-300 ease-in-out z-20 overflow-hidden ${
          isExpanded ? 'w-80 shadow-xl border-pink-200' : 'w-18'
        }`}
        style={{ minHeight: '520px', maxHeight: 'calc(100vh - 120px)' }}
        aria-label="Secretary Portal Sidebar"
      >
        <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="p-1.5 bg-pink-600 text-white rounded-xl shadow-xs shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            {isExpanded && (
              <div className="overflow-hidden whitespace-nowrap animate-fadeIn">
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 leading-tight">
                  Secretary Quick Action
                </h2>
                <span className="text-[10px] text-pink-700 font-semibold block">
                  Desk & Front Office Management
                </span>
              </div>
            )}
          </div>

          {isExpanded && (
            <button
              onClick={() => setIsPinned(!isPinned)}
              title={isPinned ? "Unpin sidebar (enable auto-hide on hover)" : "Pin sidebar open"}
              id="secretary-sidebar-pin-toggle"
              className={`p-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${
                isPinned 
                  ? 'bg-pink-100 text-pink-700 font-bold' 
                  : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200/60'
              }`}
            >
              {isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>

        {isExpanded && (
          <div className="px-3.5 pt-2 pb-1">
            <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500 bg-pink-50/70 border border-pink-100 rounded-lg px-2.5 py-1">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
                {isPinned ? 'Sidebar Pinned Open' : 'Auto-hide on Hover Active'}
              </span>
              <span className="text-[9px] text-pink-800 font-bold uppercase tracking-wider">
                {isPinned ? 'Locked' : 'Hover'}
              </span>
            </div>
          </div>
        )}

        {isExpanded && (() => {
          const secName = secretary?.name || 'Abena Osei';
          const secInitials = (function() {
            const parts = secName.trim().toUpperCase().split(/\s+/);
            if (parts.length >= 2) {
              return parts[0].charAt(0) + parts[1].charAt(0);
            }
            return secName.slice(0, 2).toUpperCase();
          })();
          return (
            <div className="px-3.5 py-2.5 mx-3 mt-1 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center gap-2.5 animate-fadeIn">
              <div className="w-9 h-9 rounded-xl bg-pink-700 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                {secInitials}
              </div>
              <div className="overflow-hidden whitespace-nowrap">
                <span className="text-xs font-bold text-slate-900 block truncate">{secName}</span>
                <span className="text-[10px] text-slate-500 font-medium block truncate">School Secretary</span>
              </div>
            </div>
          );
        })()}

        <nav className="flex-1 p-3 overflow-y-auto space-y-3 mt-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <div key={item.id} className="space-y-1">
                {isExpanded && (
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[9px] font-black tracking-widest text-pink-700 uppercase">
                      {item.category}
                    </span>
                  </div>
                )}
                <button
                  id={`secretary-sidebar-tab-${item.id}`}
                  onClick={() => handleSelect(item.id)}
                  title={`${item.label}: ${item.sublabel}`}
                  className={`w-full group flex items-start gap-3 p-2.5 rounded-2xl transition-all cursor-pointer relative border text-left ${
                    isActive
                      ? 'bg-pink-600 border-pink-500 text-white font-bold shadow-md shadow-pink-900/10'
                      : item.isPrimaryAction
                      ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-900'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200/80 text-slate-700'
                  } ${!isExpanded ? 'justify-center p-3' : ''}`}
                >
                  <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${
                    isActive ? 'text-white' : item.isPrimaryAction ? 'text-emerald-600' : 'text-pink-600'
                  }`} />

                  {isExpanded ? (
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className={`text-xs font-extrabold leading-tight truncate ${
                          isActive ? 'text-white' : 'text-slate-900'
                        }`}>
                          {item.label}
                        </span>
                        {item.badge !== undefined && (
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                            isActive 
                              ? 'bg-white/20 text-white' 
                              : item.badgeColor || 'bg-slate-200 text-slate-700'
                          }`}>
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <p className={`text-[10px] mt-0.5 leading-snug line-clamp-2 ${
                        isActive ? 'text-pink-100' : 'text-slate-500'
                      }`}>
                        {item.sublabel}
                      </p>
                    </div>
                  ) : (
                    <div className="absolute hidden group-hover:flex flex-col left-full ml-2 top-0 bg-slate-900 text-white text-[11px] p-2.5 rounded-xl shadow-xl z-50 whitespace-nowrap min-w-[200px]">
                      <span className="text-[9px] font-black text-pink-400 uppercase tracking-wider">{item.category}</span>
                      <span className="font-bold">{item.label}</span>
                      <span className="text-[10px] text-slate-300">{item.sublabel}</span>
                    </div>
                  )}

                  {!isExpanded && item.badge !== undefined && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full ring-1 ring-white" />
                  )}
                </button>
              </div>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-100 bg-slate-50/80">
          {isExpanded ? (
            <div className="space-y-2 animate-fadeIn">
              <div className="bg-white p-2.5 rounded-xl border border-slate-200 text-[11px] space-y-1 text-center">
                <span className="text-[10px] text-slate-400 font-semibold block">Front Desk Operations</span>
                <span className="text-xs font-black text-pink-700 block">JIPAS Academic Session</span>
              </div>
              <div className="text-[10px] text-center text-slate-400">
                <span>Move mouse away to auto-hide</span>
              </div>
            </div>
          ) : (
            <div 
              className="flex flex-col items-center justify-center text-slate-400 hover:text-pink-600 cursor-pointer py-1"
              title="Hover to auto-expand sidebar"
            >
              <ChevronRight className="w-4 h-4 text-pink-600 animate-pulse" />
              <span className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">
                Hover
              </span>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

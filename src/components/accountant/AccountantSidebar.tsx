import React, { useState, useEffect } from 'react';
import { 
  FileText, DollarSign, Plus, Settings, AlertTriangle, 
  Pin, PinOff, ChevronRight, Menu, X, CheckCircle2, 
  TrendingUp, Sparkles, User, ShieldCheck, Wallet, Receipt, Layers, Building, Building2, BellRing, BarChart3, Clock, Users, Scale
} from 'lucide-react';
import JIPASLogo from '../common/JIPASLogo';
import SidebarToggleButton from '../common/SidebarToggleButton';

export type AccountantTabType = 
  | 'dashboard' 
  | 'collections' 
  | 'revenue-trends'
  | 'bills' 
  | 'new-payment' 
  | 'fee-settings' 
  | 'overdue-alerts' 
  | 'automated-reminders'
  | 'expenses' 
  | 'secretary-records' 
  | 'bank-deposits' 
  | 'payroll' 
  | 'staff'
  | 'staff-attendance'
  | 'dept-financial-summary' 
  | 'financial-reconciliation'
  | 'audit-trail'
  | 'fee-audit-report'
  | 'next-term-bills'
  | 'generate-receipt';

interface AccountantSidebarProps {
  activeTab: AccountantTabType;
  onSelectTab: (tab: AccountantTabType) => void;
  totalCollected: number;
  totalOutstanding: number;
  collectionRate: number;
  collectionsCount: number;
  billsCount: number;
  overdueCount: number;
  actionRequiredCount?: number;
}

export default function AccountantSidebar({
  activeTab,
  onSelectTab,
  totalCollected,
  totalOutstanding,
  collectionRate,
  collectionsCount,
  billsCount,
  overdueCount,
  actionRequiredCount = 0
}: AccountantSidebarProps) {
  // Auto hide/show on hover state
  const [isHovered, setIsHovered] = useState(false);
  // Optional pin state so user can lock sidebar open if desired (persisted across reloads)
  const [isPinned, setIsPinned] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('jipas_accountant_sidebar_pinned');
      if (saved !== null) {
        return saved === 'true';
      }
    }
    return false;
  });
  // Mobile drawer state
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('jipas_accountant_sidebar_pinned', String(isPinned));
    } catch (e) {
      console.warn('Could not store accountant sidebar pin state:', e);
    }
  }, [isPinned]);

  const isExpanded = isHovered || isPinned;

  const navItems: {
    id: AccountantTabType;
    label: string;
    sublabel: string;
    icon: React.ElementType;
    badge?: string | number;
    badgeColor?: string;
    isPrimaryAction?: boolean;
  }[] = [
    {
      id: 'dashboard',
      label: 'Main Dashboard',
      sublabel: 'Overview & Analytics',
      icon: TrendingUp
    },
    {
      id: 'collections',
      label: 'Collections & Receipts',
      sublabel: `${collectionsCount} verified payments`,
      icon: FileText,
      badge: collectionsCount > 0 ? collectionsCount : undefined,
      badgeColor: 'bg-emerald-100 text-emerald-800'
    },
    {
      id: 'revenue-trends',
      label: 'Revenue Trends',
      sublabel: 'Monthly collections chart',
      icon: BarChart3,
      badge: 'Recharts',
      badgeColor: 'bg-indigo-100 text-indigo-800'
    },
    {
      id: 'bills',
      label: 'Bills & Arrears',
      sublabel: actionRequiredCount > 0 ? `${actionRequiredCount} Action Required` : `${billsCount} student term bills`,
      icon: DollarSign,
      badge: actionRequiredCount > 0 ? `${actionRequiredCount} Action` : (billsCount > 0 ? billsCount : undefined),
      badgeColor: actionRequiredCount > 0 ? 'bg-rose-600 text-white font-black animate-pulse' : 'bg-blue-100 text-blue-800'
    },
    {
      id: 'next-term-bills',
      label: 'Next Term Fees Bill',
      sublabel: 'Setup tariffs & individual bills',
      icon: Layers,
      badge: 'Next Term',
      badgeColor: 'bg-emerald-500 text-white'
    },
    {
      id: 'generate-receipt',
      label: 'Print Receipts Desk',
      sublabel: 'Multi-receipts & Print Queue',
      icon: FileText,
      badge: 'Batch',
      badgeColor: 'bg-indigo-500 text-white'
    },
    {
      id: 'new-payment',
      label: 'Collect Fee Payment',
      sublabel: 'Generate official receipt',
      icon: Plus,
      badge: 'New',
      badgeColor: 'bg-emerald-500 text-white',
      isPrimaryAction: true
    },
    {
      id: 'fee-settings',
      label: 'Fee Settings & Tariffs',
      sublabel: 'Configure school fee items',
      icon: Settings
    },
    {
      id: 'overdue-alerts',
      label: 'Overdue Fee Alerts',
      sublabel: 'Defaulters & SMS notices',
      icon: AlertTriangle,
      badge: overdueCount > 0 ? overdueCount : undefined,
      badgeColor: 'bg-rose-500 text-white animate-pulse'
    },
    {
      id: 'automated-reminders',
      label: 'Fee Reminders Utility',
      sublabel: 'Unpaid & Partial notices',
      icon: BellRing,
      badge: 'Auto',
      badgeColor: 'bg-amber-100 text-amber-800'
    },
    {
      id: 'expenses',
      label: 'Institutional Expenses',
      sublabel: 'Vouchers & Operating Costs',
      icon: Receipt,
      badge: 'Outlays',
      badgeColor: 'bg-rose-100 text-rose-800'
    },
    {
      id: 'secretary-records',
      label: 'Secretary Desk & Cash',
      sublabel: 'Front Desk Daily Handover',
      icon: Layers,
      badge: 'Desk',
      badgeColor: 'bg-blue-100 text-blue-800'
    },
    {
      id: 'bank-deposits',
      label: 'Bank Deposits & Slips',
      sublabel: 'Monies sent to bank',
      icon: Building,
      badge: 'Bank',
      badgeColor: 'bg-emerald-100 text-emerald-800'
    },
    {
      id: 'payroll',
      label: 'Staff Payroll System',
      sublabel: 'Salaries, Pension, PAYE & Slips',
      icon: Wallet,
      badge: 'Bursary',
      badgeColor: 'bg-purple-100 text-purple-800'
    },
    {
      id: 'staff',
      label: 'Institutional Staff',
      sublabel: 'Manage Cooks, Cleaners, etc.',
      icon: Users,
      badge: 'HR',
      badgeColor: 'bg-orange-100 text-orange-800'
    },
    {
      id: 'staff-attendance',
      label: 'Staff Attendance Tracker',
      sublabel: 'Clock-in & payroll sync',
      icon: Clock,
      badge: 'Live',
      badgeColor: 'bg-emerald-100 text-emerald-800'
    },
    {
      id: 'dept-financial-summary',
      label: 'Dept Financial Summary',
      sublabel: 'Income & Expense Breakdown',
      icon: Building2,
      badge: 'Summary',
      badgeColor: 'bg-indigo-100 text-indigo-800'
    },
    {
      id: 'financial-reconciliation',
      label: 'Financial Reconciliation',
      sublabel: 'Phase 30 Exception Detection',
      icon: Scale,
      badge: 'Audit',
      badgeColor: 'bg-emerald-600 text-white'
    },
    {
      id: 'audit-trail',
      label: 'Financial Audit Trail',
      sublabel: 'Immutable log of adjustments',
      icon: ShieldCheck,
      badge: 'Governance',
      badgeColor: 'bg-indigo-600 text-white'
    },
    {
      id: 'fee-audit-report',
      label: 'Fee Audit Report',
      sublabel: 'Master tariff matrix sync',
      icon: DollarSign,
      badge: 'Matrix',
      badgeColor: 'bg-indigo-600 text-white'
    }
  ];

  const handleSelect = (tab: AccountantTabType) => {
    onSelectTab(tab);
    setIsMobileOpen(false);
  };

  return (
    <>
      {/* ========================================================================= */}
      {/* MOBILE TRIGGER BAR (< lg screens) */}
      {/* ========================================================================= */}
      <div className="lg:hidden w-full bg-white border border-slate-200 rounded-2xl p-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2">
          <SidebarToggleButton
            isOpen={isMobileOpen}
            onToggle={() => setIsMobileOpen(true)}
            variant="compact"
            ariaLabel="Open Finance Menu"
          />
          <div>
            <span className="text-xs font-bold text-slate-800 block">Finance Navigation</span>
            <span className="text-[10px] text-cyan-700 font-semibold uppercase tracking-wider">
              Active: {navItems.find(n => n.id === activeTab)?.label}
            </span>
          </div>
        </div>

        <button
          onClick={() => handleSelect('new-payment')}
          className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Collect Fee</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* MOBILE BACKDROP DRAWER */}
      {/* ========================================================================= */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileOpen(false)}
          />

          {/* Drawer Panel */}
          <div className="relative w-72 max-w-[85vw] bg-slate-900 text-white flex flex-col h-full shadow-2xl z-10 p-4 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <JIPASLogo size="sm" />
                <div>
                  <h3 className="text-sm font-bold text-white">Bursary Portal</h3>
                  <span className="text-[10px] text-cyan-400 font-medium">Financial Management</span>
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

            {/* Navigation in mobile */}
            <nav className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-2 gap-2 p-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item.id)}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-2xl text-center transition-all cursor-pointer relative min-h-[70px] border ${
                        isActive 
                          ? 'bg-cyan-600 text-white font-bold shadow-md border-cyan-400' 
                          : 'bg-slate-800/90 hover:bg-slate-700 text-slate-200 border-slate-700/60'
                      }`}
                    >
                      <Icon className={`w-5 h-5 mb-1 ${isActive ? 'text-white' : 'text-cyan-400'}`} />
                      <span className="text-[10px] font-extrabold text-center leading-tight line-clamp-2 w-full">{item.label}</span>
                      {item.badge !== undefined && (
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full mt-1 ${item.badgeColor || 'bg-slate-700 text-cyan-200'}`}>
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </nav>

            {/* Footer summary */}
            <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/60 text-xs space-y-1.5">
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>Collection Rate</span>
                <span className="font-bold text-cyan-300">{collectionRate}%</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-cyan-500 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min(100, collectionRate)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DESKTOP SIDEBAR WITH AUTO HIDE/SHOW ON MOUSE HOVER */}
      {/* ========================================================================= */}
      <aside
        id="accountant-hover-sidebar"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`hidden lg:flex flex-col flex-shrink-0 sticky top-24 bg-white border border-slate-200 rounded-3xl shadow-sm transition-all duration-300 ease-in-out z-20 overflow-hidden ${
          isExpanded ? 'w-72 shadow-xl border-cyan-200' : 'w-18'
        }`}
        style={{ minHeight: '520px', maxHeight: 'calc(100vh - 120px)' }}
        aria-label="Accountant Portal Sidebar"
      >
        {/* SIDEBAR HEADER */}
        <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="p-1.5 bg-cyan-600 text-white rounded-xl shadow-xs shrink-0">
              <Wallet className="w-5 h-5" />
            </div>
            {isExpanded && (
              <div className="overflow-hidden whitespace-nowrap animate-fadeIn">
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 leading-tight">
                  Finance Portal
                </h2>
                <span className="text-[10px] text-cyan-700 font-semibold block">
                  Bursary & Accounts
                </span>
              </div>
            )}
          </div>

          {/* Pin toggle button when expanded */}
          {isExpanded && (
            <button
              onClick={() => setIsPinned(!isPinned)}
              title={isPinned ? "Unpin sidebar (enable auto-hide on hover)" : "Pin sidebar open"}
              id="accountant-sidebar-pin-toggle"
              className={`p-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${
                isPinned 
                  ? 'bg-cyan-100 text-cyan-700 font-bold' 
                  : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200/60'
              }`}
            >
              {isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>

        {/* HOVER STATUS CHIP (Visible when expanded) */}
        {isExpanded && (
          <div className="px-3.5 pt-2 pb-1">
            <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500 bg-cyan-50/70 border border-cyan-100 rounded-lg px-2.5 py-1">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
                {isPinned ? 'Sidebar Pinned Open' : 'Auto-hide on Hover Active'}
              </span>
              <span className="text-[9px] text-cyan-800 font-bold uppercase tracking-wider">
                {isPinned ? 'Locked' : 'Hover'}
              </span>
            </div>
          </div>
        )}

        {/* ACCOUNTANT PROFILE SUMMARY (Expanded only) */}
        {isExpanded && (
          <div className="px-3.5 py-2.5 mx-3 mt-1 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center gap-2.5 animate-fadeIn">
            <div className="w-9 h-9 rounded-xl bg-cyan-700 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
              DM
            </div>
            <div className="overflow-hidden whitespace-nowrap">
              <span className="text-xs font-bold text-slate-900 block truncate">Denis Mawutor</span>
              <span className="text-[10px] text-slate-500 font-medium block truncate">Accountant / Bursar</span>
            </div>
          </div>
        )}

        {/* NAVIGATION ITEMS */}
        <nav className="flex-1 p-2 overflow-y-auto mt-1">
          <div className={isExpanded ? "grid grid-cols-2 gap-2" : "flex flex-col gap-2"}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  id={`sidebar-tab-${item.id}`}
                  onClick={() => handleSelect(item.id)}
                  title={`${item.label} (${item.sublabel})`}
                  className={`group flex flex-col items-center justify-center p-2.5 rounded-2xl transition-all cursor-pointer relative min-h-[68px] border text-center ${
                    isActive
                      ? 'bg-cyan-600 border-cyan-500 text-white font-bold shadow-md shadow-cyan-900/10'
                      : item.isPrimaryAction
                      ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-800'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200/80 text-slate-700'
                  }`}
                >
                  <Icon className={`w-5 h-5 mb-1 shrink-0 ${
                    isActive ? 'text-white' : item.isPrimaryAction ? 'text-emerald-600' : 'text-cyan-600'
                  }`} />

                  {isExpanded ? (
                    <span className={`text-[10px] font-extrabold leading-tight text-center line-clamp-2 w-full ${
                      isActive ? 'text-white' : 'text-slate-900'
                    }`}>
                      {item.label}
                    </span>
                  ) : (
                    <span className={`text-[9px] font-bold leading-tight truncate max-w-full ${
                      isActive ? 'text-white' : 'text-slate-600'
                    }`}>
                      {item.label.split(' ')[0]}
                    </span>
                  )}

                  {/* Badge rendering */}
                  {item.badge !== undefined && (
                    isExpanded ? (
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full mt-1 ${
                        isActive 
                          ? 'bg-white/20 text-white' 
                          : item.badgeColor || 'bg-slate-200 text-slate-700'
                      }`}>
                        {item.badge}
                      </span>
                    ) : (
                      <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full ring-1 ring-white" />
                    )
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* SIDEBAR FOOTER */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/80">
          {isExpanded ? (
            <div className="space-y-2 animate-fadeIn">
              <div className="bg-white p-2.5 rounded-xl border border-slate-200 text-[11px] space-y-1">
                <div className="flex justify-between items-center text-slate-500">
                  <span className="font-semibold">Collection Rate</span>
                  <span className="font-bold text-cyan-700">{collectionRate}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="bg-cyan-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, collectionRate)}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-400 pt-0.5">
                  <span>Outstanding:</span>
                  <span className="font-mono font-bold text-rose-600">
                    {totalOutstanding.toLocaleString()} CFA
                  </span>
                </div>
              </div>

              <div className="text-[10px] text-center text-slate-400 flex items-center justify-center gap-1">
                <span>Move mouse away to auto-hide</span>
              </div>
            </div>
          ) : (
            // Collapsed indicator hint
            <div 
              className="flex flex-col items-center justify-center text-slate-400 hover:text-cyan-600 cursor-pointer py-1"
              title="Hover to auto-expand sidebar"
            >
              <ChevronRight className="w-4 h-4 text-cyan-600 animate-pulse" />
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

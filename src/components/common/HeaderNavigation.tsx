import React, { useState } from 'react';
import JIPASLogo from './JIPASLogo';
import LanguageSwitcher from './LanguageSwitcher';
import CampusSelector from './CampusSelector';
import SyncNowButton from './SyncNowButton';
import { PWAInstallButton } from './PWAInstallButton';
import SidebarToggleButton from './SidebarToggleButton';
import { useI18n } from '../../i18n/I18nContext';
import { User, ThemePaletteConfig } from '../../types';
import { 
  LogOut, 
  UserCheck, 
  ShieldCheck, 
  Calculator, 
  BookOpen, 
  FileText, 
  Crown, 
  Award, 
  GraduationCap, 
  Menu, 
  X 
} from 'lucide-react';

interface HeaderNavigationProps {
  currentUser: User;
  sessionRole: string;
  themePalette: ThemePaletteConfig;
  handleLogout: () => void;
}

export default function HeaderNavigation({
  currentUser,
  sessionRole,
  themePalette,
  handleLogout
}: HeaderNavigationProps) {
  const { t } = useI18n();
  const [isMobileMenuOpen, setIsMobileOpenMenu] = useState(false);

  return (
    <header 
      className="border-b sticky top-0 z-50 w-full backdrop-blur-md shadow-lg shadow-black/20"
      style={{
        backgroundColor: `${themePalette.headerBgColor || themePalette.cardBackgroundColor}f2`,
        borderColor: `${themePalette.primaryColor}30`
      }}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4 relative z-10">
        {/* Brand & Logo */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="shrink-0 scale-90 sm:scale-100">
            <JIPASLogo size="sm" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-black tracking-tight text-white leading-tight truncate">
              {t('app.name', 'JIPAS')}
            </h1>
            <p className="text-[10px] sm:text-xs font-semibold text-indigo-400 truncate hidden xs:block">
              {t('app.subtitle', 'Système de Gestion Scolaire • 1990')}
            </p>
          </div>
        </div>

        {/* Desktop Controls (> sm) */}
        <div className="hidden sm:flex items-center gap-2 sm:gap-2.5 shrink-0">
          <PWAInstallButton />

          {/* Sync Now Button */}
          {currentUser.role !== 'student' && (
            <SyncNowButton variant="compact" />
          )}

          {/* Campus Selector */}
          {(currentUser.role === 'admin' || currentUser.role === 'accountant' || currentUser.role === 'ceo' || currentUser.role === 'director' || currentUser.role === 'secretary') && (
            <CampusSelector />
          )}

          {/* Language Switcher */}
          <LanguageSwitcher />

          {/* Role Badge */}
          <div className="hidden lg:flex items-center gap-1.5 bg-[#0B142A] px-2.5 py-1 rounded-xl border border-blue-900/50 text-[11px] font-bold text-slate-200 shadow-inner">
            {(sessionRole === 'admin' || currentUser.role === 'admin') && <ShieldCheck className="w-3.5 h-3.5 text-rose-500" />}
            {sessionRole === 'teacher' && <UserCheck className="w-3.5 h-3.5 text-emerald-400" />}
            {sessionRole === 'accountant' && <Calculator className="w-3.5 h-3.5 text-cyan-400" />}
            {sessionRole === 'secretary' && <FileText className="w-3.5 h-3.5 text-pink-400" />}
            {sessionRole === 'student' && <BookOpen className="w-3.5 h-3.5 text-indigo-400" />}
            {(sessionRole === 'ceo' || sessionRole === 'director') && <Crown className="w-3.5 h-3.5 text-amber-400" />}
            {(sessionRole === 'headteacher' || sessionRole === 'headmaster') && <Award className="w-3.5 h-3.5 text-blue-400" />}
            {sessionRole === 'hod' && <GraduationCap className="w-3.5 h-3.5 text-purple-400" />}
            <span className="capitalize truncate max-w-[100px]">
              {currentUser.executiveTitle ? currentUser.executiveTitle : sessionRole}
            </span>
          </div>

          {/* User Profile & Logout */}
          <div className="flex items-center gap-2 border-l border-slate-800/80 pl-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 p-0.5 shadow-md shadow-blue-500/20 shrink-0">
              <div className="w-full h-full rounded-full bg-[#070D1E] flex items-center justify-center overflow-hidden">
                {currentUser.avatar ? (
                  <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[11px] font-black text-blue-400">{currentUser.name?.charAt(0) || 'U'}</span>
                )}
              </div>
            </div>
            <button
              onClick={handleLogout}
              id="header-logout-btn"
              title={t('app.logout', 'Logout')}
              className="flex items-center gap-1 bg-rose-950/40 hover:bg-rose-900/65 text-rose-400 px-2.5 py-1.5 rounded-xl text-xs font-bold border border-rose-900/50 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-500" />
              <span className="hidden md:inline">{t('app.logout', 'Déconnexion')}</span>
            </button>
          </div>
        </div>

        {/* Mobile Header Bar Quick Controls (< sm) */}
        <div className="flex sm:hidden items-center gap-2">
          <LanguageSwitcher />

          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 p-0.5 shrink-0">
            <div className="w-full h-full rounded-full bg-[#070D1E] flex items-center justify-center overflow-hidden">
              {currentUser.avatar ? (
                <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-[10px] font-black text-blue-400">{currentUser.name?.charAt(0) || 'U'}</span>
              )}
            </div>
          </div>

          <SidebarToggleButton
            isOpen={isMobileMenuOpen}
            onToggle={() => setIsMobileOpenMenu(!isMobileMenuOpen)}
            variant="compact"
            size="md"
            ariaLabel="Toggle Header Actions"
          />
        </div>
      </div>

      {/* Mobile Drawer Dropdown for site-wide actions */}
      {isMobileMenuOpen && (
        <div className="sm:hidden border-t border-slate-800/80 bg-[#070D1E]/95 backdrop-blur-md px-4 py-3 space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white">{currentUser.name}</span>
              <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 bg-blue-900/60 text-blue-300 rounded border border-blue-700/50">
                {sessionRole}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {currentUser.role !== 'student' && (
              <SyncNowButton variant="compact" />
            )}

            {(currentUser.role === 'admin' || currentUser.role === 'accountant' || currentUser.role === 'ceo' || currentUser.role === 'director' || currentUser.role === 'secretary') && (
              <CampusSelector />
            )}
          </div>

          <div className="pt-1 flex items-center justify-between">
            <button
              onClick={() => {
                setIsMobileOpenMenu(false);
                handleLogout();
              }}
              className="w-full flex items-center justify-center gap-1.5 bg-rose-950/60 hover:bg-rose-900 text-rose-300 px-3 py-2 rounded-xl text-xs font-bold border border-rose-800/60 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-rose-400" />
              <span>{t('app.logout', 'Déconnexion')}</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
}

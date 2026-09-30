import React from 'react';
import { Menu, X, PanelLeftOpen, PanelLeftClose } from 'lucide-react';

export interface SidebarToggleButtonProps {
  isOpen: boolean;
  isCollapsed?: boolean;
  onToggle: (e: React.MouseEvent<HTMLButtonElement>) => void;
  label?: string;
  variant?: 'default' | 'inline' | 'compact' | 'subtle';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  ariaLabel?: string;
  title?: string;
}

/**
 * Single Authoritative Sidebar & Navigation Menu Toggle Button Component.
 * Unified across all portal layouts to emit a consistent toggle event
 * and ensure no redundant or mismatched icons appear in the layout.
 */
export default function SidebarToggleButton({
  isOpen,
  isCollapsed = false,
  onToggle,
  label,
  variant = 'default',
  size = 'md',
  className = '',
  ariaLabel,
  title
}: SidebarToggleButtonProps) {
  // Determine which icon to display based on open and collapsed state
  const renderIcon = () => {
    const iconSizeClass = size === 'sm' ? 'w-3.5 h-3.5' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4';

    if (!isOpen) {
      return <Menu className={`${iconSizeClass} text-blue-400 group-hover:text-white transition-colors`} />;
    }
    if (isCollapsed) {
      return <PanelLeftOpen className={`${iconSizeClass} text-emerald-400 group-hover:text-white transition-colors`} />;
    }
    return <PanelLeftClose className={`${iconSizeClass} text-slate-400 group-hover:text-white transition-colors`} />;
  };

  const getVariantClasses = () => {
    switch (variant) {
      case 'compact':
        return 'p-2 bg-slate-900/80 hover:bg-blue-900/60 text-slate-300 hover:text-white border border-slate-700/60 rounded-xl transition-all cursor-pointer shadow-xs';
      case 'inline':
        return 'px-3 py-1.5 bg-slate-900/80 hover:bg-blue-900/60 text-slate-300 hover:text-white border border-slate-700/60 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs';
      case 'subtle':
        return 'p-1.5 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-lg border border-slate-700/50 transition-colors cursor-pointer';
      case 'default':
      default:
        return 'px-3 py-2 bg-slate-900/80 hover:bg-blue-900/60 text-slate-300 hover:text-white border border-slate-700/60 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-xs';
    }
  };

  const computedTitle = title || (
    label ? label : (isOpen ? (isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar') : 'Open Menu')
  );

  const computedAriaLabel = ariaLabel || computedTitle;

  return (
    <button
      type="button"
      onClick={onToggle}
      title={computedTitle}
      aria-label={computedAriaLabel}
      className={`group ${getVariantClasses()} ${className}`}
    >
      {renderIcon()}
      {label && <span className="truncate">{label}</span>}
    </button>
  );
}

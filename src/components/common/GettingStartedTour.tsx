import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, X, ChevronRight, ChevronLeft, CheckCircle2, 
  LayoutDashboard, UserPlus, Receipt, Send, ShieldCheck, 
  Search, Users, BookOpen, HelpCircle, Compass
} from 'lucide-react';

interface TourStep {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ReactNode;
  badge: string;
  badgeColor: string;
  highlights: string[];
  actionLabel?: string;
  actionModule?: string;
}

interface GettingStartedTourProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (module: string) => void;
  userRole?: string;
}

export default function GettingStartedTour({
  isOpen,
  onClose,
  onNavigate,
  userRole = 'admin'
}: GettingStartedTourProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const steps: TourStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to JIPAS School Management',
      subtitle: 'Complete Cloud & Regional Education Governance System',
      description: 'Experience unified multi-campus management, offline-first reliability, instant fee accounting, and real-time student tracking.',
      icon: <Compass className="w-8 h-8 text-indigo-400" />,
      badge: 'Getting Started',
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
      highlights: [
        'Multi-Campus Selector for regional and campus-wide scope switching',
        'Automatic offline-first synchronization with Firebase Firestore',
        'Role-Based Access Control (Admin, Teachers, Accountants, Executives)'
      ]
    },
    {
      id: 'dashboard',
      title: 'Real-Time Analytics & Financial Cards',
      subtitle: 'Live Enrollment & Revenue Snapshot',
      description: 'Monitor active student enrollment numbers, outstanding fee balances, unread announcements, and live institutional statistics in one place.',
      icon: <LayoutDashboard className="w-8 h-8 text-emerald-400" />,
      badge: 'Core Analytics',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      highlights: [
        'Live student statistics synced with real-time class rosters',
        'Financial balance totals in CFA currency with pending audit indicators',
        'Unread notification counter and institutional event alerts'
      ],
      actionLabel: 'View Dashboard Analytics',
      actionModule: 'dashboard'
    },
    {
      id: 'quick_actions',
      title: 'Administrative Quick Actions',
      subtitle: 'High-Speed Workflow Shortcuts',
      description: 'Perform frequent administrative operations with single-click shortcuts directly from the main overview.',
      icon: <Sparkles className="w-8 h-8 text-amber-400" />,
      badge: 'Workflow Acceleration',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      highlights: [
        'Register New Student: Fast-track student enrollment with auto admission IDs',
        'Generate Fee Invoice: Instantly bill classes and issue printed receipts',
        'Post Teacher Announcement: Broadcast urgent messages to staff and students'
      ],
      actionLabel: 'Try Quick Actions',
      actionModule: 'dashboard'
    },
    {
      id: 'student_records',
      title: 'Enrolled Students Master Register',
      subtitle: 'Class Roster & Admission Governance',
      description: 'Manage, search, approve pending admissions, assign houses/classes, and promote students across academic terms.',
      icon: <Users className="w-8 h-8 text-blue-400" />,
      badge: 'Student Register',
      badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      highlights: [
        'Batch import students from CSV files or export official registers to PDF',
        'Approve or decline pending online admission requests',
        'Bulk class promotion and house assignment tools'
      ],
      actionLabel: 'Open Student Manager',
      actionModule: 'student_enrolled'
    },
    {
      id: 'financial_academic',
      title: 'Financial Audit & Academic Hub',
      subtitle: 'Fees, Terminal Reports & System Security',
      description: 'Maintain strict financial transparency with audit trails, class fee tariffs, terminal report generation, and automated database backups.',
      icon: <ShieldCheck className="w-8 h-8 text-purple-400" />,
      badge: 'Governance & Audits',
      badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      highlights: [
        'Audit Financial Records: Comprehensive audit trail for all payments & fees',
        'Terminal Reports: Batch compile student report cards with grade analysis',
        'Database Backup & Reset: Backup or clear system records safely'
      ],
      actionLabel: 'Explore Financial Audit',
      actionModule: 'financial_audit'
    }
  ];

  const currentStep = steps[currentStepIndex];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStepIndex]);

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const handleClose = () => {
    if (dontShowAgain) {
      try {
        localStorage.setItem('jipas_onboarding_completed', 'true');
      } catch (e) {
        console.warn('Could not save onboarding status:', e);
      }
    }
    onClose();
  };

  const handleActionClick = (module?: string) => {
    if (module && onNavigate) {
      onNavigate(module);
    }
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-center items-start pt-16 p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="bg-slate-900 border border-slate-700 text-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden flex flex-col relative"
        >
          {/* Top Progress Bar */}
          <div className="w-full bg-slate-800 h-1.5 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-indigo-500 via-emerald-500 to-amber-400 h-1.5 transition-all duration-300 ease-out"
              style={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
            />
          </div>

          {/* Modal Header */}
          <div className="p-6 pb-4 flex items-start justify-between gap-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 shadow-inner">
                {currentStep.icon}
              </div>
              <div>
                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase border mb-1 ${currentStep.badgeColor}`}>
                  {currentStep.badge}
                </span>
                <h3 className="text-lg font-black text-white leading-snug">
                  {currentStep.title}
                </h3>
              </div>
            </div>

            <button
              onClick={handleClose}
              className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Close Walkthrough"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-6 space-y-5">
            <div className="space-y-1.5">
              <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                {currentStep.subtitle}
              </p>
              <p className="text-sm text-slate-300 leading-relaxed">
                {currentStep.description}
              </p>
            </div>

            {/* Feature Highlights */}
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-4 space-y-2.5">
              <p className="text-xs font-black text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Key Highlights & Capabilities
              </p>
              <ul className="space-y-2 text-xs text-slate-200">
                {currentStep.highlights.map((highlight, idx) => (
                  <li key={idx} className="flex items-start gap-2 leading-tight">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                    <span>{highlight}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Optional Try Action Link */}
            {currentStep.actionLabel && currentStep.actionModule && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => handleActionClick(currentStep.actionModule)}
                  className="w-full py-2.5 px-4 bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-indigo-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 group"
                >
                  <span>{currentStep.actionLabel}</span>
                  <ChevronRight className="w-4 h-4 text-indigo-300 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            )}
          </div>

          {/* Modal Footer Controls */}
          <div className="p-5 bg-slate-950/60 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-800"
              />
              <span>Don't show this walkthrough again on startup</span>
            </label>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <span className="text-xs text-slate-500 font-mono font-semibold mr-2">
                {currentStepIndex + 1} / {steps.length}
              </span>

              {currentStepIndex > 0 && (
                <button
                  type="button"
                  onClick={handlePrev}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleNext}
                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-teal-600 hover:from-indigo-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold cursor-pointer shadow-md transition-all flex items-center gap-1.5"
              >
                <span>{currentStepIndex === steps.length - 1 ? 'Finish & Explore' : 'Next Step'}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

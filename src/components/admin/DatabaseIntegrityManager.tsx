import React, { useState, useEffect, useMemo } from 'react';
import { 
  Database, 
  ShieldCheck, 
  RefreshCw, 
  AlertTriangle, 
  Trash2, 
  CheckCircle2, 
  Search, 
  ArrowDownCircle, 
  GitMerge, 
  CopyCheck, 
  Cloud, 
  HardDrive, 
  Sparkles, 
  Layers, 
  AlertCircle,
  Clock,
  ArrowRight,
  Shield,
  Info
} from 'lucide-react';
import { Student, User } from '../../types';
import { 
  auditDatabaseIntegrity, 
  reconcileMasterFirestoreToLocal as reconcileMasterSupabaseToLocal, 
  purgeLocalGhostStudents, 
  deduplicateFirestoreStudentsMaster as deduplicateSupabaseStudentsMaster,
  DatabaseIntegrityAudit,
  saveStudent,
  deleteStudent,
  deleteMultipleStudents,
  purgeOperationalDatabase
} from '../../services/dbService';

interface DatabaseIntegrityManagerProps {
  currentUser?: User;
  onStudentsUpdated?: (students: Student[]) => void;
  onNavigate?: (module: string) => void;
}

export default function DatabaseIntegrityManager({ 
  currentUser, 
  onStudentsUpdated,
  onNavigate 
}: DatabaseIntegrityManagerProps) {
  const [audit, setAudit] = useState<DatabaseIntegrityAudit | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'ghosts' | 'duplicates' | 'unsynced' | 'verified'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  const runAudit = async () => {
    setIsLoading(true);
    setFeedback(null);
    try {
      const result = await auditDatabaseIntegrity();
      setAudit(result);
    } catch (err: any) {
      console.error('[DatabaseIntegrityManager] Audit failed:', err);
      setFeedback({
        type: 'error',
        message: 'Integrity scan failed: ' + (err?.message || String(err))
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    runAudit();

    const handleReconciled = () => {
      runAudit();
    };
    window.addEventListener('jipas_students_reconciled', handleReconciled);
    return () => {
      window.removeEventListener('jipas_students_reconciled', handleReconciled);
    };
  }, []);

  // One-Way Master -> Local Authoritative Reconciliation
  const handleOneWayReconcile = async () => {
    if (!confirm('Execute One-Way Reconciliation?\n\nThis will make your local IndexedDB and browser storage an exact mirror of the master Supabase database, permanently removing all ghost and deleted records.')) {
      return;
    }
    setActionLoading('reconcile');
    setFeedback(null);
    try {
      const res = await reconcileMasterSupabaseToLocal();
      if (onStudentsUpdated) {
        // Will receive authoritative update
      }
      setFeedback({
        type: 'success',
        message: res.message
      });
      await runAudit();
    } catch (err: any) {
      console.error('[DatabaseIntegrityManager] Reconciliation failed:', err);
      setFeedback({
        type: 'error',
        message: 'Reconciliation failed: ' + (err?.message || String(err))
      });
    } finally {
      setActionLoading(null);
    }
  };

  // Purge All Ghost Records from Local Store
  const handlePurgeGhosts = async () => {
    if (!confirm(`Purge all ${audit?.ghostCount || 0} ghost records from local storage?\n\nThese records do not exist on the master Supabase database and are safe to remove.`)) {
      return;
    }
    setActionLoading('purge');
    setFeedback(null);
    try {
      const res = await purgeLocalGhostStudents();
      setFeedback({
        type: 'success',
        message: `Successfully purged ${res.purgedCount} ghost student record(s) from local cache.`
      });
      await runAudit();
    } catch (err: any) {
      console.error('[DatabaseIntegrityManager] Ghost purge failed:', err);
      setFeedback({
        type: 'error',
        message: 'Purge failed: ' + (err?.message || String(err))
      });
    } finally {
      setActionLoading(null);
    }
  };

  // Deduplicate Records on Supabase Master
  const handleResolveDuplicates = async () => {
    if (!confirm('Resolve duplicate admission profiles?\n\nThis will keep the newest updated student profile for each admission number and remove obsolete redundant duplicates.')) {
      return;
    }
    setActionLoading('dedup');
    setFeedback(null);
    try {
      const res = await deduplicateSupabaseStudentsMaster();
      setFeedback({
        type: 'success',
        message: `Deduplication complete. Resolved ${res.resolvedCount} duplicate student document(s).`
      });
      await runAudit();
    } catch (err: any) {
      console.error('[DatabaseIntegrityManager] Deduplication failed:', err);
      setFeedback({
        type: 'error',
        message: 'Deduplication failed: ' + (err?.message || String(err))
      });
    } finally {
      setActionLoading(null);
    }
  };

  // Purge Individual Ghost Student
  const handlePurgeIndividualGhost = async (student: Student) => {
    try {
      await deleteStudent(student.id);
      setFeedback({
        type: 'success',
        message: `Removed ghost record "${student.fullName}" (#${student.admissionNo || student.id}).`
      });
      await runAudit();
    } catch (err: any) {
      alert('Could not remove record: ' + (err?.message || String(err)));
    }
  };

  // Push Local-Only record to Supabase
  const handlePushToSupabase = async (student: Student) => {
    try {
      await saveStudent(student);
      setFeedback({
        type: 'success',
        message: `Pushed "${student.fullName}" to Supabase Master.`
      });
      await runAudit();
    } catch (err: any) {
      alert('Could not push record: ' + (err?.message || String(err)));
    }
  };

  // Build unified display list with metadata tags
  const combinedList = useMemo(() => {
    if (!audit) return [];
    const masterIds = new Set(audit.masterStudents.map(m => m.id));
    const ghostIds = new Set(audit.ghostStudents.map(g => g.id));
    const draftIds = new Set(audit.unsyncedDrafts.map(d => d.docId));
    
    // Duplicate IDs
    const duplicateIds = new Set<string>();
    audit.duplicateGroups.forEach(g => {
      g.records.forEach(r => duplicateIds.add(r.id));
    });

    // Merge all unique records
    const map = new Map<string, { student: Student; statusType: 'verified' | 'ghost' | 'duplicate' | 'unsynced' }>();

    audit.masterStudents.forEach(m => {
      let stType: 'verified' | 'ghost' | 'duplicate' | 'unsynced' = 'verified';
      if (duplicateIds.has(m.id)) stType = 'duplicate';
      map.set(m.id, { student: m, statusType: stType });
    });

    audit.localStudents.forEach(l => {
      if (!map.has(l.id)) {
        let stType: 'verified' | 'ghost' | 'duplicate' | 'unsynced' = 'verified';
        if (ghostIds.has(l.id)) stType = 'ghost';
        else if (draftIds.has(l.id)) stType = 'unsynced';
        else if (duplicateIds.has(l.id)) stType = 'duplicate';
        map.set(l.id, { student: l, statusType: stType });
      }
    });

    return Array.from(map.values());
  }, [audit]);

  const filteredItems = useMemo(() => {
    return combinedList.filter(({ student, statusType }) => {
      if (activeTab === 'ghosts' && statusType !== 'ghost') return false;
      if (activeTab === 'duplicates' && statusType !== 'duplicate') return false;
      if (activeTab === 'unsynced' && statusType !== 'unsynced') return false;
      if (activeTab === 'verified' && statusType !== 'verified') return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        (student.fullName || '').toLowerCase().includes(q) ||
        (student.admissionNo || '').toLowerCase().includes(q) ||
        (student.className || '').toLowerCase().includes(q) ||
        (student.id || '').toLowerCase().includes(q)
      );
    });
  }, [combinedList, activeTab, searchQuery]);

  const isAllVisibleSelected = useMemo(() => {
    if (!filteredItems || filteredItems.length === 0) return false;
    return filteredItems.every(({ student }) => selectedStudentIds.includes(student.id));
  }, [filteredItems, selectedStudentIds]);

  const handleToggleSelectAll = () => {
    if (isAllVisibleSelected) {
      const visibleIds = new Set(filteredItems.map(({ student }) => student.id));
      setSelectedStudentIds(prev => prev.filter(id => !visibleIds.has(id)));
    } else {
      const visibleIds = filteredItems.map(({ student }) => student.id);
      setSelectedStudentIds(prev => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    setSelectedStudentIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleDeleteSelected = async () => {
    if (selectedStudentIds.length === 0) return;
    if (!confirm(`Execute Atomic Batch Deletion?\n\nAre you sure you want to delete ${selectedStudentIds.length} selected student profile(s)?\nThis triggers an atomic writeBatch in Supabase to prevent partial synchronization errors.`)) {
      return;
    }
    setActionLoading('batch_delete');
    setFeedback(null);
    try {
      const res = await deleteMultipleStudents(selectedStudentIds);
      setFeedback({
        type: 'success',
        message: `Atomic batch delete complete. Successfully deleted ${res.deletedCount} student profile(s).`
      });
      setSelectedStudentIds([]);
      await runAudit();
    } catch (err: any) {
      console.error('[DatabaseIntegrityManager] Batch delete failed:', err);
      setFeedback({
        type: 'error',
        message: 'Batch delete failed: ' + (err?.message || String(err))
      });
    } finally {
      setActionLoading(null);
    }
  };

  const [purgeProgress, setPurgeProgress] = useState<{ percent: number; collection: string } | null>(null);

  const handlePurgeOperationalDatabase = async () => {
    const confirmation = prompt(
      'DANGER: TOTAL OPERATIONAL PURGE\n\nThis will permanently delete ALL students, bills, and reports from Supabase and local cache for a fresh start.\nYour user account and login session will NOT be affected.\n\nTo confirm, type "PURGE" below:'
    );

    if (confirmation !== 'PURGE') {
      if (confirmation !== null) {
        alert('Purge cancelled: Confirmation text did not match "PURGE".');
      }
      return;
    }

    setActionLoading('purge_db');
    setPurgeProgress({ percent: 10, collection: 'Initiating...' });
    setFeedback(null);

    try {
      const res = await purgeOperationalDatabase((percent, col) => {
        setPurgeProgress({ percent, collection: col });
      });

      setFeedback({
        type: 'success',
        message: `Database Purge Complete! Atomically deleted ${res.totalDeleted} record(s) across students (${res.deletedCounts.students || 0}), bills (${res.deletedCounts.bills || 0}), and reports (${res.deletedCounts.reports || 0}). Your user auth session remains active.`
      });

      if (onStudentsUpdated) {
        onStudentsUpdated([]);
      }
      setSelectedStudentIds([]);
      await runAudit();
    } catch (err: any) {
      console.error('[DatabaseIntegrityManager] Operational purge failed:', err);
      setFeedback({
        type: 'error',
        message: 'Purge failed: ' + (err?.message || String(err))
      });
    } finally {
      setActionLoading(null);
      setPurgeProgress(null);
    }
  };

  return (
    <div className="space-y-6 text-slate-900 animate-fade-in pb-12">
      {/* Top Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-bold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              Database Integrity Engine
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Database Integrity & Reconciliation
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Authoritative, one-way synchronization between your local IndexedDB storage and the master Supabase cloud database. Diagnose storage drift, wipe ghost records, and resolve duplicate student profiles safely.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={runAudit}
              disabled={isLoading || !!actionLoading}
              className="px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/80 text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-xs disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-400' : 'text-slate-300'}`} />
              <span>{isLoading ? 'Scanning...' : 'Rescan Integrity'}</span>
            </button>

            <button
              onClick={handleResolveDuplicates}
              disabled={isLoading || !!actionLoading}
              title="Identify and merge students with identical admission numbers, keeping the most recent entry and deleting outdated duplicate records."
              className="px-4.5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-black flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-purple-950/40 disabled:opacity-50"
            >
              <GitMerge className={`w-4 h-4 ${actionLoading === 'dedup' ? 'animate-spin' : ''}`} />
              <span>{actionLoading === 'dedup' ? 'Merging Duplicates...' : 'Auto-Resolve Duplicates'}</span>
            </button>

            <button
              onClick={handleOneWayReconcile}
              disabled={isLoading || !!actionLoading}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-950/40 disabled:opacity-50"
            >
              <ArrowDownCircle className={`w-4 h-4 ${actionLoading === 'reconcile' ? 'animate-spin' : ''}`} />
              <span>One-Way Reconcile (Master → Local)</span>
            </button>

            <button
              onClick={handlePurgeOperationalDatabase}
              disabled={isLoading || !!actionLoading}
              title="Atomically delete all students, bills, and reports from Supabase and local cache for a clean fresh start, preserving user authentication tokens."
              className="px-4.5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-rose-950/40 disabled:opacity-50"
            >
              <Trash2 className={`w-4 h-4 ${actionLoading === 'purge_db' ? 'animate-spin' : ''}`} />
              <span>{actionLoading === 'purge_db' ? `Purging (${purgeProgress?.percent || 0}%)...` : 'Purge Database'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div className={`p-4 rounded-2xl border flex items-start gap-3 transition-all ${
          feedback.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
            : feedback.type === 'error'
            ? 'bg-rose-50 border-rose-200 text-rose-900'
            : 'bg-blue-50 border-blue-200 text-blue-900'
        }`}>
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : feedback.type === 'error' ? (
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          ) : (
            <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 text-xs font-semibold leading-relaxed">
            {feedback.message}
          </div>
          <button 
            onClick={() => setFeedback(null)} 
            className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      {/* Integrity Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Master Supabase Card */}
        <div className="bg-white rounded-2xl p-4.5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Supabase Master</span>
            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
              <Cloud className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 font-mono">
              {audit ? audit.masterCount : '...'}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">Authoritative cloud records</p>
          </div>
        </div>

        {/* Local IndexedDB Card */}
        <div className="bg-white rounded-2xl p-4.5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Local IndexedDB</span>
            <div className="p-1.5 bg-slate-100 text-slate-700 rounded-lg">
              <HardDrive className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 font-mono">
              {audit ? audit.localCount : '...'}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">Cached on this browser</p>
          </div>
        </div>

        {/* Ghost Records Card */}
        <div className={`bg-white rounded-2xl p-4.5 border shadow-xs flex flex-col justify-between ${
          (audit?.ghostCount || 0) > 0 ? 'border-rose-300 ring-2 ring-rose-50' : 'border-slate-200'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">Ghost Records</span>
            <div className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-rose-600 font-mono">
              {audit ? audit.ghostCount : '...'}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">Local only / deleted on cloud</p>
          </div>
        </div>

        {/* Duplicate Admission Nos Card */}
        <div className={`bg-white rounded-2xl p-4.5 border shadow-xs flex flex-col justify-between ${
          (audit?.duplicateCount || 0) > 0 ? 'border-purple-300 ring-2 ring-purple-50' : 'border-slate-200'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-purple-600 uppercase tracking-wider">Duplicate Profiles</span>
            <div className="p-1.5 bg-purple-50 text-purple-600 rounded-lg">
              <CopyCheck className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-purple-600 font-mono">
              {audit ? audit.duplicateCount : '...'}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">Shared admission numbers</p>
          </div>
        </div>

        {/* Sync Drift Status */}
        <div className="bg-white rounded-2xl p-4.5 border border-slate-200 shadow-xs flex flex-col justify-between col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Integrity State</span>
            <div className={`p-1.5 rounded-lg ${
              (audit?.ghostCount === 0 && audit?.duplicateCount === 0 && audit?.masterCount === audit?.localCount)
                ? 'bg-emerald-50 text-emerald-600'
                : 'bg-amber-50 text-amber-600'
            }`}>
              <Shield className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className={`text-sm font-black flex items-center gap-1.5 ${
              (audit?.ghostCount === 0 && audit?.duplicateCount === 0 && audit?.masterCount === audit?.localCount)
                ? 'text-emerald-600'
                : 'text-amber-600'
            }`}>
              {(audit?.ghostCount === 0 && audit?.duplicateCount === 0 && audit?.masterCount === audit?.localCount) ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>100% In Sync</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4" />
                  <span>Drift Detected</span>
                </>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {audit?.lastAuditedAt ? new Date(audit.lastAuditedAt).toLocaleTimeString() : 'Not scanned'}
            </p>
          </div>
        </div>
      </div>

      {/* Emergency Remediation Actions Card */}
      {(audit && (audit.ghostCount > 0 || audit.duplicateCount > 0)) && (
        <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="text-xs font-black text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Reconciliation Recommendations
            </h4>
            <p className="text-xs text-amber-800">
              Found {audit.ghostCount} ghost record(s) and {audit.duplicateCount} duplicate profile(s). Choose an automated fix:
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {audit.ghostCount > 0 && (
              <button
                onClick={handlePurgeGhosts}
                disabled={!!actionLoading}
                className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Purge {audit.ghostCount} Ghost Record(s)</span>
              </button>
            )}

            {audit.duplicateCount > 0 && (
              <button
                onClick={handleResolveDuplicates}
                disabled={!!actionLoading}
                className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                <GitMerge className="w-3.5 h-3.5" />
                <span>Auto-Resolve {audit.duplicateCount} Duplicate(s)</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Student Records Explorer */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
        {/* Navigation Tabs and Search */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-50/50">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              All Records ({combinedList.length})
            </button>

            <button
              onClick={() => setActiveTab('ghosts')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'ghosts'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-rose-600 hover:bg-rose-50'
              }`}
            >
              <span>Ghosts</span>
              <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${
                activeTab === 'ghosts' ? 'bg-rose-700 text-white' : 'bg-rose-100 text-rose-700'
              }`}>
                {audit?.ghostCount || 0}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('duplicates')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'duplicates'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-purple-600 hover:bg-purple-50'
              }`}
            >
              <span>Duplicates</span>
              <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${
                activeTab === 'duplicates' ? 'bg-purple-700 text-white' : 'bg-purple-100 text-purple-700'
              }`}>
                {audit?.duplicateCount || 0}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('verified')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'verified'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              Master Verified ({audit?.masterCount || 0})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search student, adm #, ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Permanent Bulk Actions Row Above Table */}
        <div className="px-5 py-3 bg-slate-100/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 font-bold text-slate-800 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isAllVisibleSelected}
                onChange={handleToggleSelectAll}
                className="w-4 h-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
              />
              <span>Select All Visible ({filteredItems.length})</span>
            </label>

            {selectedStudentIds.length > 0 && (
              <span className="text-[11px] font-bold text-rose-700 bg-rose-100 px-2.5 py-0.5 rounded-full border border-rose-200 animate-pulse">
                {selectedStudentIds.length} Record(s) Selected
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {selectedStudentIds.length > 0 && (
              <button
                onClick={() => setSelectedStudentIds([])}
                className="px-3 py-1.5 bg-white hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-300 text-xs font-semibold cursor-pointer transition-colors"
              >
                Clear Selection
              </button>
            )}

            <button
              onClick={handleDeleteSelected}
              disabled={selectedStudentIds.length === 0 || !!actionLoading}
              title={selectedStudentIds.length === 0 ? "Select records below to enable batch deletion" : "Executes atomic writeBatch deletion in Supabase"}
              className={`px-4 py-1.5 rounded-xl text-xs font-black shadow-xs flex items-center gap-1.5 transition-all ${
                selectedStudentIds.length > 0
                  ? 'bg-rose-600 hover:bg-rose-700 text-white cursor-pointer shadow-rose-600/20'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>
                {actionLoading === 'batch_delete'
                  ? 'Executing Atomic writeBatch...'
                  : selectedStudentIds.length > 0
                  ? `Delete Selected (${selectedStudentIds.length})`
                  : 'Delete Selected'}
              </span>
            </button>
          </div>
        </div>

        {/* Student Records Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100/70 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllVisibleSelected}
                    onChange={handleToggleSelectAll}
                    className="w-4 h-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                    title="Select / Deselect All Visible Records"
                  />
                </th>
                <th className="py-3 px-4">Student Profile</th>
                <th className="py-3 px-4">Admission #</th>
                <th className="py-3 px-4">Class / Campus</th>
                <th className="py-3 px-4">Integrity Status</th>
                <th className="py-3 px-4">Last Updated</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <CheckCircle2 className="w-8 h-8 text-slate-300" />
                      <p className="text-xs">No records found matching current criteria.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredItems.map(({ student, statusType }) => (
                  <tr key={student.id} className={`hover:bg-slate-50/80 transition-colors ${
                    selectedStudentIds.includes(student.id)
                      ? 'bg-rose-50/60'
                      : statusType === 'ghost' ? 'bg-rose-50/30' : statusType === 'duplicate' ? 'bg-purple-50/30' : ''
                  }`}>
                    {/* Row Checkbox */}
                    <td className="py-3 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={selectedStudentIds.includes(student.id)}
                        onChange={() => handleToggleSelectOne(student.id)}
                        className="w-4 h-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                      />
                    </td>

                    {/* Student Profile */}
                    <td className="py-3 px-4">
                      <div className="font-extrabold text-slate-900">{student.fullName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">ID: {student.id}</div>
                    </td>

                    {/* Admission # */}
                    <td className="py-3 px-4 font-mono font-bold text-slate-700">
                      {student.admissionNo || <span className="text-slate-400 italic">None</span>}
                    </td>

                    {/* Class / Campus */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{student.className || 'Unassigned'}</div>
                      <div className="text-[10px] text-slate-400">{student.campus || 'JIPAS 1'}</div>
                    </td>

                    {/* Integrity Status */}
                    <td className="py-3 px-4">
                      {statusType === 'verified' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                          <CheckCircle2 className="w-3 h-3" />
                          Master Confirmed
                        </span>
                      )}
                      {statusType === 'ghost' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-black">
                          <AlertTriangle className="w-3 h-3" />
                          Ghost (Local Only)
                        </span>
                      )}
                      {statusType === 'duplicate' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-bold">
                          <CopyCheck className="w-3 h-3" />
                          Duplicate Adm #
                        </span>
                      )}
                      {statusType === 'unsynced' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                          <Clock className="w-3 h-3" />
                          Pending Upload
                        </span>
                      )}
                    </td>

                    {/* Last Updated */}
                    <td className="py-3 px-4 text-slate-500 text-[11px] font-mono">
                      {student.updatedAt ? new Date(student.updatedAt).toLocaleDateString() : student.createdAt || 'N/A'}
                    </td>

                    {/* Action buttons */}
                    <td className="py-3 px-4 text-right">
                      {statusType === 'ghost' ? (
                        <button
                          onClick={() => handlePurgeIndividualGhost(student)}
                          className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[11px] font-bold cursor-pointer transition-colors"
                        >
                          Purge Ghost
                        </button>
                      ) : statusType === 'unsynced' ? (
                        <button
                          onClick={() => handlePushToSupabase(student)}
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold cursor-pointer transition-colors"
                        >
                          Push to Master
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-mono">OK</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Architectural Guidelines Explainer */}
      <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 text-slate-600 space-y-2 text-xs">
        <h5 className="font-bold text-slate-800 flex items-center gap-1.5">
          <Info className="w-4 h-4 text-blue-600" />
          How One-Way Master Reconciliation Works
        </h5>
        <p className="leading-relaxed">
          In a local-first application, offline caches in IndexedDB or browser localStorage can occasionally retain records that were subsequently deleted on the remote Supabase cloud database (referred to as <strong>Ghost Records</strong>). Clicking <strong>One-Way Reconcile</strong> authoritatively synchronizes the client cache to strictly mirror the remote Supabase cloud master collection, wiping all ghost records and duplicate IDs across active tabs.
        </p>
      </div>
    </div>
  );
}

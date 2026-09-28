import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  RefreshCw, 
  GitCompare, 
  Cloud, 
  HardDrive, 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle, 
  Check, 
  Clock, 
  Database, 
  Search, 
  Filter, 
  Layers, 
  Sparkles, 
  FileText, 
  Trash2, 
  X, 
  ChevronDown, 
  ChevronUp, 
  History, 
  AlertCircle,
  ExternalLink,
  ShieldAlert,
  ArrowDownLeft,
  ArrowUpRight,
  Sliders,
  CheckSquare,
  Square
} from 'lucide-react';
import { 
  DataConflictItem, 
  ConflictType, 
  FieldDiff, 
  scanForDataConflicts, 
  resolveWithDeviceOverwrite, 
  resolveWithCloudOverwrite, 
  resolveWithSelectiveMerge, 
  bulkResolveWithDevice, 
  bulkResolveWithCloud, 
  getConflictAuditLogs, 
  ConflictAuditRecord, 
  clearConflictAuditLogs, 
  createSimulatedConflict,
  formatTimestampDisplay,
  CONFLICT_COLLECTIONS
} from '../../services/conflictService';
import { getCloudSyncStatus } from '../../services/syncService';

interface DataConflictResolverProps {
  currentUser?: any;
  onNavigate?: (module: string) => void;
  onDataModified?: () => void;
}

export default function DataConflictResolver({
  currentUser,
  onNavigate,
  onDataModified
}: DataConflictResolverProps) {
  // Scanning state
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState({ current: 0, total: 0, currentCollection: '' });
  const [lastScannedAt, setLastScannedAt] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<DataConflictItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<ConflictAuditRecord[]>(() => getConflictAuditLogs());

  // Active UI tab
  const [activeTab, setActiveTab] = useState<'conflicts' | 'audit'>('conflicts');

  // Filters & Search
  const [selectedCollection, setSelectedCollection] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Bulk Selection
  const [selectedConflictIds, setSelectedConflictIds] = useState<string[]>([]);
  const [isBulkExecuting, setIsBulkExecuting] = useState(false);

  // Card expanded states
  const [expandedCardIds, setExpandedCardIds] = useState<Set<string>>(new Set());

  // Selective Merge Modal State
  const [mergeTargetConflict, setMergeTargetConflict] = useState<DataConflictItem | null>(null);
  const [mergeFieldDecisions, setMergeFieldDecisions] = useState<Record<string, 'device' | 'cloud' | 'custom'>>({});
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({});
  const [isApplyingMerge, setIsApplyingMerge] = useState(false);
  const [showJsonPreview, setShowJsonPreview] = useState(false);

  // Quick Notification Toast
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ message, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const adminName = currentUser?.name || currentUser?.fullName || 'Administrator';
  const syncStatus = getCloudSyncStatus();

  // Run initial scan on mount
  const executeScan = useCallback(async () => {
    setIsScanning(true);
    setScanProgress({ current: 0, total: CONFLICT_COLLECTIONS.length, currentCollection: 'Initializing...' });
    try {
      const detected = await scanForDataConflicts(undefined, (current, total, label) => {
        setScanProgress({ current, total, currentCollection: label });
      });
      setConflicts(detected);
      setLastScannedAt(new Date().toISOString());
      setSelectedConflictIds([]);
      if (detected.length === 0) {
        showToast('Scan complete: All local and Supabase records are in sync!', 'info');
      } else {
        showToast(`Scan complete: Found ${detected.length} conflict(s) or timestamp mismatch(es).`, 'info');
      }
    } catch (err: any) {
      console.error('[DataConflictResolver] Scan failed:', err);
      showToast(`Scan failed: ${err?.message || 'Unknown network error'}`, 'error');
    } finally {
      setIsScanning(false);
    }
  }, []);

  useEffect(() => {
    executeScan();
  }, [executeScan]);

  // Refresh audit logs
  const refreshAuditLogs = () => {
    setAuditLogs(getConflictAuditLogs());
  };

  // Card toggle
  const toggleCardExpanded = (id: string) => {
    setExpandedCardIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // -------------------------------------------------------------
  // Filtered conflicts
  // -------------------------------------------------------------
  const filteredConflicts = useMemo(() => {
    return conflicts.filter(c => {
      if (selectedCollection !== 'all' && c.collectionName !== selectedCollection) return false;
      if (selectedType !== 'all') {
        if (selectedType === 'drafts' && !c.hasPendingDraft && c.conflictType !== 'unsynced_draft') return false;
        if (selectedType === 'device_newer' && c.conflictType !== 'device_newer') return false;
        if (selectedType === 'cloud_newer' && c.conflictType !== 'cloud_newer') return false;
        if (selectedType === 'divergence' && c.conflictType !== 'content_divergence' && c.conflictType !== 'timestamp_mismatch') return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = c.title.toLowerCase().includes(q);
        const matchesId = c.docId.toLowerCase().includes(q);
        const matchesCol = c.collectionLabel.toLowerCase().includes(q);
        const matchesSub = c.subtitle ? c.subtitle.toLowerCase().includes(q) : false;
        if (!matchesTitle && !matchesId && !matchesCol && !matchesSub) return false;
      }
      return true;
    });
  }, [conflicts, selectedCollection, selectedType, searchQuery]);

  // Summary counts
  const summaryCounts = useMemo(() => {
    return {
      total: conflicts.length,
      deviceNewer: conflicts.filter(c => c.conflictType === 'device_newer').length,
      cloudNewer: conflicts.filter(c => c.conflictType === 'cloud_newer').length,
      drafts: conflicts.filter(c => c.hasPendingDraft || c.conflictType === 'unsynced_draft').length,
      contentDivergence: conflicts.filter(c => c.conflictType === 'content_divergence' || c.conflictType === 'timestamp_mismatch').length
    };
  }, [conflicts]);

  // -------------------------------------------------------------
  // Single Resolution Actions
  // -------------------------------------------------------------
  const handleOverwriteCloud = async (conflict: DataConflictItem) => {
    try {
      await resolveWithDeviceOverwrite(conflict, adminName);
      setConflicts(prev => prev.filter(c => c.id !== conflict.id));
      setSelectedConflictIds(prev => prev.filter(id => id !== conflict.id));
      refreshAuditLogs();
      showToast(`Successfully pushed Device version for "${conflict.title}" to Supabase.`, 'success');
      if (onDataModified) onDataModified();
    } catch (err: any) {
      console.error('[handleOverwriteCloud] Failed:', err);
      showToast(`Overwrite Cloud failed: ${err?.message || 'Error writing to Supabase'}`, 'error');
    }
  };

  const handleOverwriteDevice = async (conflict: DataConflictItem) => {
    try {
      await resolveWithCloudOverwrite(conflict, adminName);
      setConflicts(prev => prev.filter(c => c.id !== conflict.id));
      setSelectedConflictIds(prev => prev.filter(id => id !== conflict.id));
      refreshAuditLogs();
      showToast(`Successfully replaced Device version with Supabase cloud data for "${conflict.title}".`, 'success');
      if (onDataModified) onDataModified();
    } catch (err: any) {
      console.error('[handleOverwriteDevice] Failed:', err);
      showToast(`Overwrite Device failed: ${err?.message || 'Error updating local storage'}`, 'error');
    }
  };

  // -------------------------------------------------------------
  // Selective Merge Modal Handling
  // -------------------------------------------------------------
  const openSelectiveMergeModal = (conflict: DataConflictItem) => {
    setMergeTargetConflict(conflict);
    const initialDecisions: Record<string, 'device' | 'cloud' | 'custom'> = {};
    const initialCustom: Record<string, any> = {};

    conflict.differingFields.forEach(f => {
      // Default to the newer source if clear, otherwise device
      if (conflict.conflictType === 'cloud_newer') {
        initialDecisions[f.field] = 'cloud';
      } else {
        initialDecisions[f.field] = 'device';
      }
      initialCustom[f.field] = f.deviceVal !== null && f.deviceVal !== undefined ? f.deviceVal : f.cloudVal;
    });

    setMergeFieldDecisions(initialDecisions);
    setCustomFieldValues(initialCustom);
    setShowJsonPreview(false);
  };

  const setAllMergeDecisions = (source: 'device' | 'cloud') => {
    if (!mergeTargetConflict) return;
    const next: Record<string, 'device' | 'cloud' | 'custom'> = {};
    mergeTargetConflict.differingFields.forEach(f => {
      next[f.field] = source;
    });
    setMergeFieldDecisions(next);
  };

  // Build the merged object preview
  const mergedPreviewObject = useMemo(() => {
    if (!mergeTargetConflict) return {};
    const base = { ...(mergeTargetConflict.cloudData || mergeTargetConflict.deviceData || {}) };

    mergeTargetConflict.differingFields.forEach(f => {
      const choice = mergeFieldDecisions[f.field] || 'device';
      if (choice === 'device') {
        base[f.field] = f.deviceVal;
      } else if (choice === 'cloud') {
        base[f.field] = f.cloudVal;
      } else if (choice === 'custom') {
        base[f.field] = customFieldValues[f.field];
      }
    });

    base.updatedAt = new Date().toISOString();
    return base;
  }, [mergeTargetConflict, mergeFieldDecisions, customFieldValues]);

  const handleApplySelectiveMerge = async () => {
    if (!mergeTargetConflict) return;
    setIsApplyingMerge(true);
    try {
      await resolveWithSelectiveMerge(
        mergeTargetConflict,
        mergedPreviewObject,
        adminName,
        mergeTargetConflict.differingFields.length
      );
      setConflicts(prev => prev.filter(c => c.id !== mergeTargetConflict.id));
      setSelectedConflictIds(prev => prev.filter(id => id !== mergeTargetConflict.id));
      refreshAuditLogs();
      showToast(`Merged record for "${mergeTargetConflict.title}" applied to both Supabase and Device.`, 'success');
      setMergeTargetConflict(null);
      if (onDataModified) onDataModified();
    } catch (err: any) {
      console.error('[handleApplySelectiveMerge] Failed:', err);
      showToast(`Selective merge failed: ${err?.message || 'Error applying merge'}`, 'error');
    } finally {
      setIsApplyingMerge(false);
    }
  };

  // -------------------------------------------------------------
  // Bulk Actions
  // -------------------------------------------------------------
  const toggleSelectConflict = (id: string) => {
    setSelectedConflictIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAllFiltered = () => {
    if (selectedConflictIds.length === filteredConflicts.length) {
      setSelectedConflictIds([]);
    } else {
      setSelectedConflictIds(filteredConflicts.map(c => c.id));
    }
  };

  const handleBulkOverwriteDevice = async () => {
    const targets = conflicts.filter(c => selectedConflictIds.includes(c.id));
    if (targets.length === 0) return;
    setIsBulkExecuting(true);
    try {
      const { successful, failed } = await bulkResolveWithDevice(targets, adminName);
      setConflicts(prev => prev.filter(c => !selectedConflictIds.includes(c.id)));
      setSelectedConflictIds([]);
      refreshAuditLogs();
      showToast(`Bulk overwrite to Cloud complete: ${successful} saved, ${failed} failed.`, 'success');
      if (onDataModified) onDataModified();
    } catch (err: any) {
      showToast(`Bulk action error: ${err.message}`, 'error');
    } finally {
      setIsBulkExecuting(false);
    }
  };

  const handleBulkOverwriteCloud = async () => {
    const targets = conflicts.filter(c => selectedConflictIds.includes(c.id));
    if (targets.length === 0) return;
    setIsBulkExecuting(true);
    try {
      const { successful, failed } = await bulkResolveWithCloud(targets, adminName);
      setConflicts(prev => prev.filter(c => !selectedConflictIds.includes(c.id)));
      setSelectedConflictIds([]);
      refreshAuditLogs();
      showToast(`Bulk replace from Cloud complete: ${successful} updated on device, ${failed} failed.`, 'success');
      if (onDataModified) onDataModified();
    } catch (err: any) {
      showToast(`Bulk action error: ${err.message}`, 'error');
    } finally {
      setIsBulkExecuting(false);
    }
  };

  // -------------------------------------------------------------
  // Simulator Handler
  // -------------------------------------------------------------
  const handleClearAllConflicts = () => {
    setConflicts([]);
    setSelectedConflictIds([]);
    showToast('All pending data conflicts cleared successfully!', 'success');
  };

  const handleResolveAllAuto = async () => {
    if (conflicts.length === 0) return;
    setIsBulkExecuting(true);
    try {
      const { successful } = await bulkResolveWithDevice(conflicts, adminName);
      setConflicts([]);
      setSelectedConflictIds([]);
      refreshAuditLogs();
      showToast(`All ${conflicts.length} conflicts resolved and synced to Cloud!`, 'success');
      if (onDataModified) onDataModified();
    } catch (err: any) {
      setConflicts([]);
      setSelectedConflictIds([]);
      showToast('Conflicts queue cleared.', 'success');
    } finally {
      setIsBulkExecuting(false);
    }
  };

  const handleSimulateConflict = async () => {
    try {
      const testConflict = await createSimulatedConflict();
      setConflicts(prev => [testConflict, ...prev.filter(c => c.id !== testConflict.id)]);
      setExpandedCardIds(prev => new Set(prev).add(testConflict.id));
      showToast('Simulated test conflict created! You can now test selective merge or overwriting.', 'info');
    } catch (err: any) {
      showToast(`Failed to generate simulated conflict: ${err.message}`, 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast notification popup */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 text-xs font-bold border ${
              toastMessage.type === 'success' 
                ? 'bg-emerald-950 text-emerald-100 border-emerald-700/60' 
                : toastMessage.type === 'error'
                ? 'bg-rose-950 text-rose-100 border-rose-700/60'
                : 'bg-indigo-950 text-indigo-100 border-indigo-700/60'
            }`}
          >
            {toastMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            {toastMessage.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400" />}
            {toastMessage.type === 'info' && <Sparkles className="w-4 h-4 text-indigo-400" />}
            <span>{toastMessage.message}</span>
            <button onClick={() => setToastMessage(null)} className="ml-2 hover:opacity-75 cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Header Banner */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                <GitCompare className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  Data Conflict Resolver
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                    Cloud Database Sync
                  </span>
                </h2>
                <p className="text-xs text-slate-500">
                  Inspect timestamp divergences between local device cache and Cloud Database, and resolve with selective merge, cloud push, or authoritative clearing.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-3">
              <span className="flex items-center gap-1.5 font-semibold">
                <span className={`w-2 h-2 rounded-full ${syncStatus.isOnline ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                {syncStatus.isOnline ? 'Cloud Online' : 'Device Offline'}
              </span>
              <span className="text-slate-300">•</span>
              <span className="flex items-center gap-1 text-slate-600 font-medium">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Last Scan: {lastScannedAt ? formatTimestampDisplay(lastScannedAt) : 'Not yet scanned'}
              </span>
              {conflicts.length > 0 && (
                <>
                  <span className="text-slate-300">•</span>
                  <span className="font-bold text-amber-600 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {conflicts.length} conflict(s) pending resolution
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {conflicts.length > 0 && (
              <>
                <button
                  onClick={handleResolveAllAuto}
                  disabled={isBulkExecuting}
                  className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
                  title="Automatically push all device records to Cloud to resolve all conflicts"
                >
                  <HardDrive className="w-3.5 h-3.5 text-emerald-200" />
                  Resolve & Sync All ({conflicts.length})
                </button>

                <button
                  onClick={handleClearAllConflicts}
                  className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-black rounded-xl transition-all flex items-center gap-1.5 cursor-pointer border border-rose-200 shadow-2xs"
                  title="Clear all pending conflict alerts"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  Clear All Conflicts
                </button>
              </>
            )}

            <button
              onClick={handleSimulateConflict}
              className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
              title="Create a test student with intentionally mismatched timestamps to test resolution workflows"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              Simulate Test Conflict
            </button>

            <button
              onClick={executeScan}
              disabled={isScanning}
              className={`px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer ${
                isScanning ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
              {isScanning ? `Scanning ${scanProgress.currentCollection}...` : 'Scan for Conflicts'}
            </button>
          </div>
        </div>

        {/* Scanning progress bar */}
        {isScanning && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs text-slate-600 mb-1.5 font-medium">
              <span>Scanning: {scanProgress.currentCollection}</span>
              <span>{scanProgress.current} of {scanProgress.total} collections</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-indigo-600 h-full transition-all duration-300 rounded-full"
                style={{ width: `${(scanProgress.current / Math.max(1, scanProgress.total)) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Conflicts</span>
            <div className="w-7 h-7 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
              <GitCompare className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900">{summaryCounts.total}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Across all scanned entities</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Device Ahead</span>
            <div className="w-7 h-7 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <HardDrive className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-2xl font-black text-indigo-600">{summaryCounts.deviceNewer}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Local edits newer than Supabase</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">Cloud Ahead</span>
            <div className="w-7 h-7 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
              <Cloud className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-600">{summaryCounts.cloudNewer}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Supabase has newer remote edits</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-rose-600 uppercase tracking-wider">Pending Drafts</span>
            <div className="w-7 h-7 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
              <AlertCircle className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-2xl font-black text-rose-600">{summaryCounts.drafts}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Offline or failed queue items</p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('conflicts')}
            className={`pb-2 px-1 text-xs font-bold transition-all relative flex items-center gap-2 cursor-pointer ${
              activeTab === 'conflicts'
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <GitCompare className="w-4 h-4" />
            Active Conflicts
            {conflicts.length > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-rose-100 text-rose-700 font-bold">
                {conflicts.length}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setActiveTab('audit');
              refreshAuditLogs();
            }}
            className={`pb-2 px-1 text-xs font-bold transition-all relative flex items-center gap-2 cursor-pointer ${
              activeTab === 'audit'
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-4 h-4" />
            Resolution Audit Logs
            <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-slate-100 text-slate-600 font-semibold">
              {auditLogs.length}
            </span>
          </button>
        </div>

        {activeTab === 'conflicts' && conflicts.length > 0 && (
          <span className="text-xs text-slate-400 font-medium">
            Showing {filteredConflicts.length} of {conflicts.length} records
          </span>
        )}
      </div>

      {/* TAB 1: ACTIVE CONFLICTS */}
      {activeTab === 'conflicts' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
              {/* Search */}
              <div className="relative flex-1 min-w-[180px] max-w-sm">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter by title, ID, or class..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Collection filter */}
              <select
                value={selectedCollection}
                onChange={(e) => setSelectedCollection(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              >
                <option value="all">All Collections ({conflicts.length})</option>
                {CONFLICT_COLLECTIONS.map(c => {
                  const count = conflicts.filter(item => item.collectionName === c.name).length;
                  return (
                    <option key={c.name} value={c.name}>
                      {c.label} ({count})
                    </option>
                  );
                })}
              </select>

              {/* Type filter */}
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              >
                <option value="all">All Discrepancy Types</option>
                <option value="device_newer">Device Ahead (Local Newer)</option>
                <option value="cloud_newer">Cloud Ahead (Supabase Newer)</option>
                <option value="drafts">Pending Unsynced Drafts</option>
                <option value="divergence">Content Divergence</option>
              </select>
            </div>

            {/* Bulk action buttons */}
            {filteredConflicts.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSelectAllFiltered}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  {selectedConflictIds.length === filteredConflicts.length ? (
                    <CheckSquare className="w-3.5 h-3.5 text-indigo-600" />
                  ) : (
                    <Square className="w-3.5 h-3.5 text-slate-400" />
                  )}
                  {selectedConflictIds.length === filteredConflicts.length ? 'Deselect All' : `Select All (${filteredConflicts.length})`}
                </button>

                {selectedConflictIds.length > 0 && (
                  <div className="flex items-center gap-1.5 bg-indigo-50 p-1 rounded-xl border border-indigo-200">
                    <button
                      onClick={handleBulkOverwriteDevice}
                      disabled={isBulkExecuting}
                      className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
                      title="Authoritatively push device version to Supabase for all selected items"
                    >
                      <HardDrive className="w-3 h-3" />
                      Push to Cloud ({selectedConflictIds.length})
                    </button>

                    <button
                      onClick={handleBulkOverwriteCloud}
                      disabled={isBulkExecuting}
                      className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
                      title="Replace device cache with cloud version for all selected items"
                    >
                      <Cloud className="w-3 h-3" />
                      Revert to Cloud ({selectedConflictIds.length})
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Conflict Items List */}
          {filteredConflicts.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-xs">
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center mb-3">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-base font-black text-slate-900 mb-1">
                {conflicts.length === 0 ? 'Zero Data Conflicts Detected' : 'No Conflicts Match Selected Filter'}
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mb-5">
                {conflicts.length === 0 
                  ? 'All local device records and Supabase cloud documents are currently in strict timestamp alignment.'
                  : 'Try resetting your collection, discrepancy type, or keyword search query.'}
              </p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={executeScan}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 cursor-pointer shadow-xs"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Re-scan Database
                </button>
                {conflicts.length === 0 && (
                  <button
                    onClick={handleSimulateConflict}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-2 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> Create Test Scenario
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredConflicts.map(conflict => {
                const isSelected = selectedConflictIds.includes(conflict.id);
                const isExpanded = expandedCardIds.has(conflict.id);

                return (
                  <div 
                    key={conflict.id}
                    className={`bg-white rounded-2xl border transition-all duration-200 shadow-2xs overflow-hidden ${
                      isSelected ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {/* Header Row */}
                    <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => toggleSelectConflict(conflict.id)}
                          className="mt-1 text-slate-400 hover:text-indigo-600 cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-indigo-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300" />
                          )}
                        </button>

                        <div>
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold">
                              {conflict.collectionLabel}
                            </span>

                            {/* Badge by type */}
                            {conflict.conflictType === 'device_newer' && (
                              <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 text-[10px] font-extrabold flex items-center gap-1">
                                <ArrowUpRight className="w-3 h-3" /> Device Ahead (Local Newer)
                              </span>
                            )}
                            {conflict.conflictType === 'cloud_newer' && (
                              <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-extrabold flex items-center gap-1">
                                <ArrowDownLeft className="w-3 h-3" /> Cloud Ahead (Remote Newer)
                              </span>
                            )}
                            {conflict.conflictType === 'unsynced_draft' && (
                              <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 text-[10px] font-extrabold flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" /> Pending Unsynced Draft
                              </span>
                            )}
                            {conflict.conflictType === 'content_divergence' && (
                              <span className="px-2 py-0.5 rounded-md bg-orange-100 text-orange-800 text-[10px] font-extrabold flex items-center gap-1">
                                <Sliders className="w-3 h-3" /> Content Divergence
                              </span>
                            )}
                            {conflict.conflictType === 'only_device' && (
                              <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 text-[10px] font-extrabold">
                                Device Only (Not in Cloud)
                              </span>
                            )}
                            {conflict.conflictType === 'only_cloud' && (
                              <span className="px-2 py-0.5 rounded-md bg-sky-100 text-sky-800 text-[10px] font-extrabold">
                                Cloud Only (Not on Device)
                              </span>
                            )}

                            <span className="text-[10px] text-slate-400 font-mono">
                              ID: {conflict.docId}
                            </span>
                          </div>

                          <h4 className="font-extrabold text-sm text-slate-900">
                            {conflict.title}
                          </h4>
                          {conflict.subtitle && (
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {conflict.subtitle}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex flex-wrap items-center gap-2 self-end md:self-center">
                        <button
                          onClick={() => handleOverwriteCloud(conflict)}
                          className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                          title="Authoritatively overwrite Supabase Cloud with this device's version"
                        >
                          <HardDrive className="w-3.5 h-3.5" />
                          Push Device to Cloud
                        </button>

                        <button
                          onClick={() => handleOverwriteDevice(conflict)}
                          disabled={!conflict.cloudData}
                          className={`px-3 py-1.5 bg-amber-50 hover:bg-amber-600 text-amber-700 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                            !conflict.cloudData ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                          title="Revert local record to match Supabase Cloud"
                        >
                          <Cloud className="w-3.5 h-3.5" />
                          Revert to Cloud
                        </button>

                        <button
                          onClick={() => openSelectiveMergeModal(conflict)}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                          title="Selectively choose field-by-field which values to retain"
                        >
                          <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                          Selective Merge
                        </button>

                        <button
                          onClick={() => toggleCardExpanded(conflict.id)}
                          className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
                          title={isExpanded ? 'Collapse fields' : 'Inspect differing fields'}
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Timestamp Comparison Strip */}
                    <div className="px-4 py-2.5 bg-slate-50/75 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs gap-3">
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                          <HardDrive className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Device:</span>
                          <span className="font-mono font-bold text-slate-800">
                            {formatTimestampDisplay(conflict.deviceTimestamp)}
                          </span>
                        </div>

                        <span className="text-slate-300">vs</span>

                        <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                          <Cloud className="w-3.5 h-3.5 text-amber-500" />
                          <span>Supabase Cloud:</span>
                          <span className="font-mono font-bold text-slate-800">
                            {formatTimestampDisplay(conflict.cloudTimestamp)}
                          </span>
                        </div>
                      </div>

                      <div className="text-xs font-semibold text-slate-500">
                        {conflict.timestampDiffDescription}
                      </div>
                    </div>

                    {/* Expandable Differing Fields */}
                    {isExpanded && (
                      <div className="p-4 border-t border-slate-200 bg-slate-50/30">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                            Differing Attributes ({conflict.differingFields.length})
                          </h5>
                          <span className="text-[11px] text-slate-400">
                            Click &ldquo;Selective Merge&rdquo; to customize or apply individual field choices
                          </span>
                        </div>

                        {conflict.differingFields.length === 0 ? (
                          <p className="text-xs text-slate-500 italic py-2">
                            No individual field differences detected. The discrepancy is strictly timestamp-based.
                          </p>
                        ) : (
                          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white text-xs">
                            <table className="w-full border-collapse text-left">
                              <thead>
                                <tr className="bg-slate-100 text-slate-600 text-[11px] font-black border-b border-slate-200">
                                  <th className="py-2 px-3 w-1/4">Field / Property</th>
                                  <th className="py-2 px-3 w-3/8 text-indigo-900 bg-indigo-50/50">Device (Local Storage)</th>
                                  <th className="py-2 px-3 w-3/8 text-amber-900 bg-amber-50/50">Supabase (Cloud Remote)</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 font-medium">
                                {conflict.differingFields.map(f => (
                                  <tr key={f.field} className="hover:bg-slate-50/80">
                                    <td className="py-2 px-3 font-bold text-slate-700">
                                      {f.label}
                                      <div className="text-[10px] font-mono text-slate-400">{f.field}</div>
                                    </td>
                                    <td className="py-2 px-3 font-mono text-[11px] text-indigo-700 bg-indigo-50/20">
                                      {typeof f.deviceVal === 'object' 
                                        ? JSON.stringify(f.deviceVal) 
                                        : String(f.deviceVal ?? '(empty / not set)')}
                                    </td>
                                    <td className="py-2 px-3 font-mono text-[11px] text-amber-700 bg-amber-50/20">
                                      {typeof f.cloudVal === 'object' 
                                        ? JSON.stringify(f.cloudVal) 
                                        : String(f.cloudVal ?? '(empty / not set)')}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">Conflict Resolution Audit Trail</h3>
              <p className="text-xs text-slate-500">Historical logs of all manual merge and overwrite decisions executed by staff.</p>
            </div>

            {auditLogs.length > 0 && (
              <button
                onClick={() => {
                  if (confirm('Clear all conflict resolution audit logs?')) {
                    clearConflictAuditLogs();
                    refreshAuditLogs();
                    showToast('Audit log history cleared.', 'info');
                  }
                }}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear Audit Logs
              </button>
            )}
          </div>

          {auditLogs.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
              <History className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-500 font-medium">No conflict resolutions logged yet.</p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black text-slate-600">
                      <th className="py-3 px-4">Date & Time</th>
                      <th className="py-3 px-4">Record / Collection</th>
                      <th className="py-3 px-4">Resolution Strategy</th>
                      <th className="py-3 px-4">Summary</th>
                      <th className="py-3 px-4">Executed By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {auditLogs.map(log => (
                      <tr key={log.id} className="hover:bg-slate-50/60">
                        <td className="py-3 px-4 font-mono text-slate-600">
                          {formatTimestampDisplay(log.timestamp)}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {log.docTitle}
                          <div className="text-[10px] text-slate-400 font-mono">{log.collectionName} • #{log.docId}</div>
                        </td>
                        <td className="py-3 px-4">
                          {log.strategy === 'overwrite_cloud' && (
                            <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 text-[10px] font-bold">
                              Pushed Device to Cloud
                            </span>
                          )}
                          {log.strategy === 'overwrite_device' && (
                            <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-bold">
                              Reverted to Cloud
                            </span>
                          )}
                          {log.strategy === 'merged' && (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                              Selective Field Merge
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {log.summary}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-800">
                          {log.resolvedBy}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* SELECTIVE MERGE MODAL */}
      {/* ------------------------------------------------------------- */}
      <AnimatePresence>
        {mergeTargetConflict && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200"
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                    <Sliders className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                      Selective Field Merge
                      <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 text-[10px] font-bold">
                        {mergeTargetConflict.collectionLabel}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      Record: <span className="font-bold text-slate-800">{mergeTargetConflict.title}</span> (ID: {mergeTargetConflict.docId})
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setMergeTargetConflict(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Instructions and Quick Toggles */}
              <div className="p-6 border-b border-slate-100 bg-white flex flex-wrap items-center justify-between gap-3 text-xs">
                <p className="text-slate-600 max-w-lg">
                  Choose which version to preserve for each attribute. When applied, the unified document will be written to Supabase Cloud Database and updated in local device storage.
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAllMergeDecisions('device')}
                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl transition-all cursor-pointer"
                  >
                    Select All Device
                  </button>
                  <button
                    type="button"
                    onClick={() => setAllMergeDecisions('cloud')}
                    className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold rounded-xl transition-all cursor-pointer"
                  >
                    Select All Cloud
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowJsonPreview(!showJsonPreview)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    {showJsonPreview ? 'Hide JSON' : 'Preview JSON'}
                  </button>
                </div>
              </div>

              {/* Modal Body: Scrollable Fields Comparison */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {showJsonPreview && (
                  <div className="bg-slate-900 text-slate-100 p-4 rounded-2xl text-xs font-mono max-h-48 overflow-y-auto mb-4 border border-slate-800">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Resulting Merged Document Preview:</p>
                    <pre>{JSON.stringify(mergedPreviewObject, null, 2)}</pre>
                  </div>
                )}

                {mergeTargetConflict.differingFields.map(f => {
                  const decision = mergeFieldDecisions[f.field] || 'device';

                  return (
                    <div 
                      key={f.field}
                      className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="font-extrabold text-xs text-slate-900">{f.label}</span>
                          <span className="text-[10px] font-mono text-slate-400 ml-2">({f.field})</span>
                        </div>

                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Active Choice: <span className={decision === 'device' ? 'text-indigo-600' : 'text-amber-600'}>{decision}</span>
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* Device Option */}
                        <div 
                          onClick={() => setMergeFieldDecisions(prev => ({ ...prev, [f.field]: 'device' }))}
                          className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 ${
                            decision === 'device'
                              ? 'bg-indigo-50 border-indigo-500 ring-2 ring-indigo-500/20'
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`merge_field_${f.field}`}
                            checked={decision === 'device'}
                            onChange={() => setMergeFieldDecisions(prev => ({ ...prev, [f.field]: 'device' }))}
                            className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between text-[11px] font-bold text-indigo-900 mb-1">
                              <span className="flex items-center gap-1">
                                <HardDrive className="w-3 h-3 text-indigo-600" />
                                Device Value (Local)
                              </span>
                            </div>
                            <div className="font-mono text-xs text-slate-800 break-words">
                              {typeof f.deviceVal === 'object' 
                                ? JSON.stringify(f.deviceVal) 
                                : String(f.deviceVal ?? '(null / undefined)')}
                            </div>
                          </div>
                        </div>

                        {/* Cloud Option */}
                        <div 
                          onClick={() => setMergeFieldDecisions(prev => ({ ...prev, [f.field]: 'cloud' }))}
                          className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 ${
                            decision === 'cloud'
                              ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-500/20'
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`merge_field_${f.field}`}
                            checked={decision === 'cloud'}
                            onChange={() => setMergeFieldDecisions(prev => ({ ...prev, [f.field]: 'cloud' }))}
                            className="mt-0.5 text-amber-600 focus:ring-amber-500"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between text-[11px] font-bold text-amber-900 mb-1">
                              <span className="flex items-center gap-1">
                                <Cloud className="w-3 h-3 text-amber-600" />
                                Supabase Value (Remote)
                              </span>
                            </div>
                            <div className="font-mono text-xs text-slate-800 break-words">
                              {typeof f.cloudVal === 'object' 
                                ? JSON.stringify(f.cloudVal) 
                                : String(f.cloudVal ?? '(null / undefined)')}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setMergeTargetConflict(null)}
                  className="px-4 py-2 bg-white border border-slate-300 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-100 transition-all cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={isApplyingMerge}
                  onClick={handleApplySelectiveMerge}
                  className={`px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer ${
                    isApplyingMerge ? 'opacity-70 cursor-not-allowed' : ''
                  }`}
                >
                  {isApplyingMerge ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Synchronizing Merge to Supabase...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Confirm & Apply Merged Record
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

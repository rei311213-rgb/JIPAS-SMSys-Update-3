import React, { useState } from 'react';
import { Download, Upload, HardDrive, CheckCircle2, ShieldAlert, Sparkles, RefreshCw, AlertCircle, FileText, Database, Cloud } from 'lucide-react';
import { uploadBackupToDrive } from '../../services/googleDriveService';

interface UserLocalDataBackupProps {
  currentUser: any;
  userReports?: any[];
  userAttendance?: any[];
  userSettings?: any;
  onRestoreLocalData?: (data: any) => void;
}

export default function UserLocalDataBackup({
  currentUser,
  userReports = [],
  userAttendance = [],
  userSettings = {},
  onRestoreLocalData
}: UserLocalDataBackupProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [notice, setNotice] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const userName = currentUser?.name || currentUser?.fullName || currentUser?.full_name || 'User';
  const userRole = currentUser?.role || 'Staff';
  const userId = currentUser?.id || 'user_id';

  const showNotice = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setNotice({ message, type });
    setTimeout(() => setNotice(null), 5000);
  };

  // 1. Export My Local Data Backup & Send Copy to Admin's Google Cloud Drive
  const handleExportMyData = async () => {
    setIsExporting(true);
    try {
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];

      // Build user-specific backup payload
      const backupPayload = {
        app: 'JIPAS School Management System',
        backupType: 'USER_LOCAL_DATA_BACKUP',
        exportedAt: now.toISOString(),
        exportedBy: {
          id: userId,
          name: userName,
          role: userRole,
          email: currentUser?.email || '',
          department: currentUser?.department || ''
        },
        data: {
          profile: currentUser,
          reports: userReports,
          attendance: userAttendance,
          settings: userSettings,
          localStorageKeys: (function() {
            try {
              const keys: Record<string, string> = {};
              for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k && (k.startsWith('jipas_') || k.startsWith('draft_'))) {
                  keys[k] = localStorage.getItem(k) || '';
                }
              }
              return keys;
            } catch {
              return {};
            }
          })()
        }
      };

      const jsonString = JSON.stringify(backupPayload, null, 2);
      const fileName = `JIPAS_MyData_${userRole.replace(/\s+/g, '_')}_${userName.replace(/\s+/g, '_')}_${dateStr}.json`;

      // Trigger local browser JSON file download
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // 2. Transmit copy to Admin's Google Drive Storage (or queue for admin cloud sync)
      let cloudSent = false;
      try {
        await uploadBackupToDrive(
          backupPayload,
          `CloudCopy_${fileName}`,
          `Automated disaster recovery backup uploaded by ${userRole} ${userName}`
        );
        cloudSent = true;
      } catch (driveErr) {
        // Queue in pending admin drive uploads so admin's drive receives it on next sync
        try {
          const rawPending = localStorage.getItem('jipas_admin_pending_drive_backups') || '[]';
          const pendingList = JSON.parse(rawPending);
          pendingList.unshift({
            id: `pending_drive_${Date.now()}`,
            fileName: `CloudCopy_${fileName}`,
            payload: backupPayload,
            uploader: `${userRole} - ${userName}`,
            timestamp: now.toISOString()
          });
          localStorage.setItem('jipas_admin_pending_drive_backups', JSON.stringify(pendingList.slice(0, 20)));
        } catch {}
      }

      const cloudStatusText = cloudSent
        ? "A copy has been transmitted directly to Admin's Google Cloud Drive Storage!"
        : "A copy has been queued in local vault for automated Admin Cloud Storage sync.";

      showNotice(`Local data backup saved successfully! ${cloudStatusText}`, 'success');
    } catch (err: any) {
      showNotice(`Failed to generate local backup: ${err?.message || 'Unknown error'}`, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // 2. Restore Local Data from Selected JSON File
  const handleFileRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsRestoring(true);
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) throw new Error('File is empty.');

        const parsed = JSON.parse(text);
        
        // Validate backup structure
        if (!parsed.data && !parsed.exportedBy) {
          throw new Error('Invalid JIPAS local backup format.');
        }

        if (window.confirm(`Restore local user data from "${file.name}"? This will refresh your current local session data.`)) {
          if (parsed.data?.localStorageKeys) {
            Object.entries(parsed.data.localStorageKeys).forEach(([key, val]) => {
              if (typeof val === 'string') {
                localStorage.setItem(key, val);
              }
            });
          }

          if (onRestoreLocalData && parsed.data) {
            onRestoreLocalData(parsed.data);
          }

          showNotice('Local data successfully restored from backup file! Refreshing state...', 'success');
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        }
      } catch (err: any) {
        showNotice(`Restore failed: ${err?.message || 'Invalid JSON backup file.'}`, 'error');
      } finally {
        setIsRestoring(false);
        e.target.value = '';
      }
    };

    reader.readAsText(file);
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-5">
      {/* Notice Banner */}
      {notice && (
        <div className={`p-4 rounded-2xl border text-xs font-extrabold flex items-center justify-between gap-3 shadow-xs ${
          notice.type === 'success' ? 'bg-emerald-600 text-white border-emerald-500' :
          notice.type === 'error' ? 'bg-rose-600 text-white border-rose-500' :
          'bg-indigo-600 text-white border-indigo-500'
        }`}>
          <div className="flex items-center gap-2">
            {notice.type === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0" />}
            {notice.type === 'error' && <AlertCircle className="w-4 h-4 shrink-0" />}
            {notice.type === 'info' && <Sparkles className="w-4 h-4 shrink-0" />}
            <span>{notice.message}</span>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
            <HardDrive className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-slate-900">My Local Data Backup & Recovery</h3>
            <p className="text-[11px] text-slate-500 font-medium">
              Export a local copy of your data for disaster recovery. A copy is automatically sent to Admin's Google Drive.
            </p>
          </div>
        </div>

        <span className="px-3 py-1 bg-indigo-50 text-indigo-700 font-black text-[10px] uppercase rounded-full border border-indigo-100 shrink-0">
          User Local Vault
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Export My Local Data */}
        <div className="p-5 bg-gradient-to-br from-indigo-50/60 to-slate-50 border border-indigo-100 rounded-3xl space-y-3 flex flex-col justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-indigo-700">
              <Download className="w-5 h-5" />
              <h4 className="font-extrabold text-xs text-slate-900">Export & Download My Data</h4>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Generates an offline JSON file containing your profile, reports, and local records. A copy is sent to Admin's Google Cloud Drive.
            </p>
          </div>

          <button
            onClick={handleExportMyData}
            disabled={isExporting}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-black text-xs rounded-2xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>{isExporting ? 'Packaging Local Backup...' : 'Download My Data Backup'}</span>
          </button>
        </div>

        {/* Card 2: Restore My Local Data */}
        <div className="p-5 bg-gradient-to-br from-emerald-50/60 to-slate-50 border border-emerald-100 rounded-3xl space-y-3 flex flex-col justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-emerald-700">
              <Upload className="w-5 h-5" />
              <h4 className="font-extrabold text-xs text-slate-900">Restore My Data from Backup</h4>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Select a previously downloaded JIPAS local JSON backup file to restore your profile and local records.
            </p>
          </div>

          <label className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-2xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2">
            <Upload className="w-4 h-4" />
            <span>{isRestoring ? 'Restoring File...' : 'Select Local Backup JSON File'}</span>
            <input
              type="file"
              accept=".json"
              onChange={handleFileRestore}
              className="hidden"
            />
          </label>
        </div>
      </div>
    </div>
  );
}

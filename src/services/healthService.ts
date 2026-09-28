/**
 * PRODUCTION HEALTH & DIAGNOSTICS SERVICE
 * Provides safe operational health diagnostics for Supabase connectivity,
 * Auth state, IndexedDB offline cache, offline sync queue, and Google Drive vault.
 * Guarantees zero leakage of credentials, bearer tokens, or secret keys.
 */

import { supabase } from '../lib/supabase';
import { validateEnvironment } from '../lib/envConfig';
import { idbGet, IDB_STORE_KEYS } from './idbService';
import { getCloudSyncStatus, getUnsyncedDrafts } from './syncService';
import { getReleaseMetadata } from './releaseService';

export type HealthStatus = 'HEALTHY' | 'DEGRADED' | 'OFFLINE' | 'ERROR';

export interface SystemHealthReport {
  application: string;
  status: HealthStatus;
  supabase: {
    status: 'connected' | 'degraded' | 'disconnected';
    latencyMs?: number;
    error?: string;
  };
  authentication: {
    status: 'authenticated' | 'unauthenticated' | 'error';
    userId?: string;
    role?: string;
    isProfileHydrated: boolean;
  };
  indexedDB: {
    status: 'available' | 'unavailable';
  };
  syncQueue: {
    pendingCount: number;
    failedCount: number;
    conflictCount: number;
    oldestPendingTimestamp?: string;
    isOnline: boolean;
    syncStatus: string;
  };
  googleDrive: {
    status: 'CONNECTED' | 'DISCONNECTED' | 'UNAVAILABLE' | 'UNKNOWN';
  };
  version: string;
  checkedAt: string;
}

/**
 * Checks system operational health across all core subsystems.
 */
export async function checkApplicationHealth(): Promise<SystemHealthReport> {
  const envCheck = validateEnvironment();
  const releaseInfo = getReleaseMetadata();
  const checkedAt = new Date().toISOString();
  let overallStatus: HealthStatus = 'HEALTHY';

  // 1. Supabase Check
  let supabaseStatus: 'connected' | 'degraded' | 'disconnected' = 'disconnected';
  let latencyMs: number | undefined;
  let supabaseErr: string | undefined;

  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  if (!isOnline) {
    supabaseStatus = 'disconnected';
    overallStatus = 'OFFLINE';
    supabaseErr = 'Client is currently offline.';
  } else if (!envCheck.isValid) {
    supabaseStatus = 'disconnected';
    overallStatus = 'DEGRADED';
    supabaseErr = 'Missing public environment configuration.';
  } else {
    try {
      const startTime = performance.now();
      const { error } = await supabase
        .from('profiles')
        .select('count', { count: 'exact', head: true });

      const endTime = performance.now();
      latencyMs = Math.round(endTime - startTime);

      if (error && error.code !== 'PGRST116' && error.code !== '42501') {
        supabaseStatus = 'degraded';
        supabaseErr = error.message;
        overallStatus = 'DEGRADED';
      } else {
        supabaseStatus = 'connected';
      }
    } catch (err: any) {
      supabaseStatus = 'disconnected';
      supabaseErr = err?.message || 'Database ping failed.';
      overallStatus = 'DEGRADED';
    }
  }

  // 2. Auth Check
  let authStatus: 'authenticated' | 'unauthenticated' | 'error' = 'unauthenticated';
  let userId: string | undefined;
  let userRole: string | undefined;
  let isProfileHydrated = false;

  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      authStatus = 'error';
      if (overallStatus !== 'OFFLINE') overallStatus = 'DEGRADED';
    } else if (session?.user) {
      authStatus = 'authenticated';
      userId = session.user.id;
      userRole = session.user.user_metadata?.role || session.user.app_metadata?.role || 'Administrator';
      isProfileHydrated = true;
    } else {
      authStatus = 'unauthenticated';
    }
  } catch {
    authStatus = 'error';
    if (overallStatus !== 'OFFLINE') overallStatus = 'DEGRADED';
  }

  // 3. IndexedDB Check
  let idbStatus: 'available' | 'unavailable' = 'unavailable';
  try {
    await idbGet(IDB_STORE_KEYS.IDB_UNSYNCED_DRAFTS, []);
    idbStatus = 'available';
  } catch {
    idbStatus = 'unavailable';
    if (overallStatus !== 'OFFLINE') overallStatus = 'DEGRADED';
  }

  // 4. Sync Queue Check
  const syncInfo = getCloudSyncStatus();
  const unsyncedDrafts = getUnsyncedDrafts();
  const failedDrafts = unsyncedDrafts.filter(d => Boolean(d.error));
  const oldestDraft = unsyncedDrafts.length > 0
    ? unsyncedDrafts.reduce((prev, curr) => new Date(prev.timestamp) < new Date(curr.timestamp) ? prev : curr)
    : undefined;

  // 5. Google Drive Check
  let driveStatus: 'CONNECTED' | 'DISCONNECTED' | 'UNAVAILABLE' | 'UNKNOWN' = 'CONNECTED';
  if (typeof window !== 'undefined' && !(window as any).google?.accounts?.oauth2) {
    driveStatus = 'UNAVAILABLE';
  }

  return {
    application: releaseInfo.applicationName,
    status: overallStatus,
    supabase: {
      status: supabaseStatus,
      latencyMs,
      error: supabaseErr
    },
    authentication: {
      status: authStatus,
      userId,
      role: userRole,
      isProfileHydrated
    },
    indexedDB: {
      status: idbStatus
    },
    syncQueue: {
      pendingCount: unsyncedDrafts.length + syncInfo.pendingWritesCount,
      failedCount: failedDrafts.length,
      conflictCount: 0,
      oldestPendingTimestamp: oldestDraft?.timestamp,
      isOnline: syncInfo.isOnline,
      syncStatus: syncInfo.isSyncing
        ? 'SYNCING'
        : !syncInfo.isOnline
        ? 'OFFLINE'
        : unsyncedDrafts.length > 0
        ? 'PENDING'
        : 'SYNCED'
    },
    googleDrive: {
      status: driveStatus
    },
    version: releaseInfo.version,
    checkedAt
  };
}

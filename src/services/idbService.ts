import localforage from 'localforage';
import { STORAGE_KEYS } from '../constants/storageKeys';

// Configure localforage instance for IndexedDB-first local cache
localforage.config({
  name: 'JIPAS_School_Management_System',
  storeName: 'jipas_indexeddb_store',
  description: 'Local-first IndexedDB storage for offline-resilient data persistence and background sync',
  driver: [
    localforage.INDEXEDDB,
    localforage.WEBSQL,
    localforage.LOCALSTORAGE
  ]
});

export const IDB_STORE_KEYS = {
  ...STORAGE_KEYS,
  IDB_UNSYNCED_DRAFTS: 'jipas_idb_unsynced_drafts_queue',
  IDB_LAST_SYNC_TIME: 'jipas_idb_last_sync_timestamp'
} as const;

/**
 * Reads an item from IndexedDB via localforage with fallback
 */
export async function idbGet<T>(key: string, fallback: T): Promise<T> {
  if (typeof window === 'undefined') return fallback;
  try {
    const val = await localforage.getItem<T>(key);
    if (val !== null && val !== undefined) {
      return val;
    }
  } catch (err) {
    console.warn(`[idbService] Error reading key "${key}" from IndexedDB:`, err);
  }
  return fallback;
}

/**
 * Writes an item to IndexedDB via localforage
 */
export async function idbSet<T>(key: string, data: T): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    await localforage.setItem(key, data);
  } catch (err) {
    console.warn(`[idbService] Error writing key "${key}" to IndexedDB:`, err);
  }
}

/**
 * Removes an item from IndexedDB via localforage
 */
export async function idbRemove(key: string): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    await localforage.removeItem(key);
  } catch (err) {
    console.warn(`[idbService] Error removing key "${key}" from IndexedDB:`, err);
  }
}

/**
 * Clears all data from the IndexedDB store
 */
export async function idbClear(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    await localforage.clear();
    console.log('[idbService] IndexedDB store cleared successfully.');
  } catch (err) {
    console.warn('[idbService] Error clearing IndexedDB store:', err);
  }
}

export interface IDBBackupPayload {
  meta: {
    system: string;
    version: string;
    exportedAt: string;
    totalKeys: number;
    storeName: string;
    databaseType: string;
  };
  data: Record<string, any>;
}

/**
 * Dumps all keys and values from IndexedDB (localforage) and localStorage fallback into a structured export object
 */
export async function exportAllIndexedDBData(): Promise<IDBBackupPayload> {
  const data: Record<string, any> = {};
  if (typeof window === 'undefined') {
    return {
      meta: {
        system: 'JIPAS Institutional Management System',
        version: '2.5.0',
        exportedAt: new Date().toISOString(),
        totalKeys: 0,
        storeName: 'jipas_indexeddb_store',
        databaseType: 'IndexedDB (LocalForage)'
      },
      data: {}
    };
  }

  try {
    const keys = await localforage.keys();
    for (const key of keys) {
      const val = await localforage.getItem(key);
      if (val !== null && val !== undefined) {
        data[key] = val;
      }
    }

    // Also include any localStorage items as fallback
    for (let i = 0; i < localStorage.length; i++) {
      const lsKey = localStorage.key(i);
      if (lsKey && !(lsKey in data)) {
        try {
          const raw = localStorage.getItem(lsKey);
          if (raw) data[lsKey] = JSON.parse(raw);
        } catch {
          data[lsKey] = localStorage.getItem(lsKey);
        }
      }
    }
  } catch (err) {
    console.warn('[idbService] Error exporting IndexedDB state:', err);
  }

  return {
    meta: {
      system: 'JIPAS Institutional Management System',
      version: '2.5.0',
      exportedAt: new Date().toISOString(),
      totalKeys: Object.keys(data).length,
      storeName: 'jipas_indexeddb_store',
      databaseType: 'IndexedDB (LocalForage)'
    },
    data
  };
}

/**
 * Triggers a browser file download of a JSON object
 */
export function downloadJSONFile(payload: any, filename: string) {
  if (typeof window === 'undefined') return;
  const jsonStr = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Hydrates localStorage from IndexedDB at app initialization.
 * This ensures that if localStorage was cleared or opened on a new tab,
 * the full offline cache stored in IndexedDB is restored seamlessly.
 */
export async function initLocalForageStore(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  console.log('[idbService] Initializing Local-First IndexedDB synchronization engine...');

  try {
    const keysToHydrate = Object.values(STORAGE_KEYS);
    let hydratedCount = 0;

    for (const key of keysToHydrate) {
      const idbValue = await idbGet<any>(key, null);
      if (idbValue !== null && idbValue !== undefined) {
        try {
          const currentLocal = localStorage.getItem(key);
          if (!currentLocal) {
            localStorage.setItem(key, JSON.stringify(idbValue));
            hydratedCount++;
          }
        } catch (lsErr) {
          console.warn(`[idbService] Fallback localStorage write notice for ${key}:`, lsErr);
        }
      } else {
        // If IndexedDB key doesn't exist yet, seed it from existing localStorage
        const currentLocalRaw = localStorage.getItem(key);
        if (currentLocalRaw) {
          try {
            const parsed = JSON.parse(currentLocalRaw);
            await idbSet(key, parsed);
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
    }

    console.log(`[idbService] IndexedDB initialization complete. Hydrated ${hydratedCount} key(s) into memory/local cache.`);
    return true;
  } catch (err) {
    console.warn('[idbService] LocalForage init error:', err);
    return false;
  }
}

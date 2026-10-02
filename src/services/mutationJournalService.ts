/**
 * JIPAS SMSYS DURABLE MUTATION JOURNAL SERVICE (PHASE 44)
 * Provides crash-resilient mutation journaling in IndexedDB/LocalStorage,
 * globally unique mutation deduplication, and transaction lifecycle tracking.
 */

import { JournaledMutation, JournaledMutationStatus } from '../types';
import { idbGet, idbSet, IDB_STORE_KEYS } from './idbService';
import { getSyncClientIdentity } from './syncService';
import { getNextLogicalRevision } from './syncRevisionService';

const STORAGE_KEY_JOURNAL = 'jipas_durable_mutation_journal';
const STORAGE_KEY_APPLIED_MUTATION_IDS = 'jipas_applied_mutation_ids';

let inMemoryJournalCache: JournaledMutation[] | null = null;
let inMemoryAppliedIdsSet: Set<string> | null = null;

/**
 * Loads the applied mutation IDs for deduplication.
 */
export function getAppliedMutationIds(): Set<string> {
  if (inMemoryAppliedIdsSet) return inMemoryAppliedIdsSet;

  const set = new Set<string>();
  if (typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_APPLIED_MUTATION_IDS);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
          arr.forEach(id => set.add(id));
        }
      }
    } catch {}
  }
  inMemoryAppliedIdsSet = set;
  return set;
}

/**
 * Saves applied mutation IDs to localStorage and IndexedDB.
 */
export function saveAppliedMutationIds(ids: Set<string>): void {
  inMemoryAppliedIdsSet = ids;
  const arr = Array.from(ids);
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY_APPLIED_MUTATION_IDS, JSON.stringify(arr));
    } catch {}
  }
  idbSet(IDB_STORE_KEYS.IDB_APPLIED_MUTATION_IDS, arr).catch(() => {});
}

/**
 * Deduplication check: returns true if this mutation has already been applied.
 */
export function hasMutationBeenApplied(mutationId: string): boolean {
  if (!mutationId) return false;
  return getAppliedMutationIds().has(mutationId);
}

/**
 * Marks a mutation as applied in the durable deduplication set.
 */
export function markMutationApplied(mutationId: string): void {
  if (!mutationId) return;
  const applied = getAppliedMutationIds();
  applied.add(mutationId);
  saveAppliedMutationIds(applied);
}

/**
 * Retrieves all mutations from the durable journal.
 */
export function getMutationJournal(): JournaledMutation[] {
  if (inMemoryJournalCache) return inMemoryJournalCache;

  if (typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_JOURNAL);
      if (raw) {
        inMemoryJournalCache = JSON.parse(raw);
        return inMemoryJournalCache || [];
      }
    } catch {}
  }
  inMemoryJournalCache = [];
  return inMemoryJournalCache;
}

/**
 * Persists the mutation journal to localStorage and IndexedDB.
 */
export function saveMutationJournal(journal: JournaledMutation[]): void {
  inMemoryJournalCache = journal;
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY_JOURNAL, JSON.stringify(journal));
    } catch (e) {
      console.warn('[mutationJournalService] Failed to save journal to localStorage:', e);
    }
  }
  idbSet(IDB_STORE_KEYS.IDB_MUTATION_JOURNAL, journal).catch(() => {});
}

/**
 * Appends a new mutation to the durable journal with monotonic logical revision and attribution.
 */
export function appendMutationJournal<T = any>(
  entityType: string,
  entityId: string,
  operation: 'CREATE' | 'UPDATE' | 'DELETE',
  payload: T,
  options: {
    campusId?: string;
    baseRevision?: number;
    baseUpdatedAt?: string;
    customMutationId?: string;
  } = {}
): JournaledMutation<T> {
  const { deviceId, sessionId } = getSyncClientIdentity();
  const mutationId = options.customMutationId || 
    (typeof crypto !== 'undefined' && crypto.randomUUID 
      ? crypto.randomUUID() 
      : `mut_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`);

  const logicalRev = getNextLogicalRevision(options.baseRevision);

  const mutation: JournaledMutation<T> = {
    mutationId,
    deviceId,
    sessionId,
    campusId: options.campusId || (payload as any)?.campus || 'JIPAS 1',
    entityType,
    entityId,
    operation,
    payload,
    baseRevision: options.baseRevision,
    baseUpdatedAt: options.baseUpdatedAt || (payload as any)?.updatedAt || new Date().toISOString(),
    createdAt: new Date().toISOString(),
    logicalRevision: logicalRev,
    status: 'PENDING',
    attemptCount: 0
  };

  const journal = getMutationJournal();
  // Idempotency: Replace existing pending mutation for identical entity or append
  const existingIdx = journal.findIndex(m => 
    m.entityType === entityType && 
    m.entityId === entityId && 
    (m.status === 'PENDING' || m.status === 'RETRY')
  );

  if (existingIdx >= 0) {
    journal[existingIdx] = mutation;
  } else {
    journal.push(mutation);
  }

  saveMutationJournal(journal);
  return mutation;
}

/**
 * Updates the execution status of a journaled mutation.
 */
export function markMutationStatus(
  mutationId: string,
  status: JournaledMutationStatus,
  error?: string
): void {
  const journal = getMutationJournal();
  const mut = journal.find(m => m.mutationId === mutationId);
  if (!mut) return;

  mut.status = status;
  mut.lastAttemptAt = new Date().toISOString();
  mut.attemptCount += 1;

  if (status === 'ACKNOWLEDGED') {
    mut.acknowledgedAt = new Date().toISOString();
    markMutationApplied(mutationId);
  } else if (status === 'FAILED' || status === 'CONFLICT') {
    mut.errorMessage = error;
  }

  saveMutationJournal(journal);
}

/**
 * Returns pending and retryable mutations for synchronization.
 */
export function getPendingAndRetryJournalMutations(): JournaledMutation[] {
  const journal = getMutationJournal();
  return journal.filter(m => m.status === 'PENDING' || m.status === 'RETRY');
}

/**
 * Clears acknowledged mutations from the journal to prevent unbounded growth.
 */
export function clearAcknowledgedMutations(): void {
  const journal = getMutationJournal().filter(m => m.status !== 'ACKNOWLEDGED');
  saveMutationJournal(journal);
}

/**
 * Resets the mutation journal and applied IDs (for tests).
 */
export function clearMutationJournal(): void {
  inMemoryJournalCache = [];
  inMemoryAppliedIdsSet = new Set();
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY_JOURNAL);
    localStorage.removeItem(STORAGE_KEY_APPLIED_MUTATION_IDS);
  }
  idbSet(IDB_STORE_KEYS.IDB_MUTATION_JOURNAL, []).catch(() => {});
  idbSet(IDB_STORE_KEYS.IDB_APPLIED_MUTATION_IDS, []).catch(() => {});
}

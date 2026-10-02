/**
 * JIPAS SMSYS SYNC REVISION & CLOCK SKEW PROTECTION ENGINE (PHASE 44)
 * Provides canonical revision comparison, monotonic logical clock management,
 * device clock skew anomaly compensation, and entity revision metadata tracking.
 */

import { EntityRevisionMeta, FieldMutationMetadata } from '../types';
import { getOrCreateSyncDeviceId } from './syncService';

// Monotonic in-memory logical clock counter
let currentLogicalClock = 1;
const STORAGE_KEY_LOGICAL_CLOCK = 'jipas_sync_logical_clock';

/**
 * Initializes and retrieves the next monotonically increasing logical revision.
 * Compensates for clock skew, offline operations, and system time adjustments.
 */
export function getNextLogicalRevision(baseRevision?: number): number {
  if (typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEY_LOGICAL_CLOCK);
    if (stored) {
      const parsed = parseInt(stored, 10);
      if (!isNaN(parsed) && parsed > currentLogicalClock) {
        currentLogicalClock = parsed;
      }
    }
  }

  if (baseRevision && baseRevision >= currentLogicalClock) {
    currentLogicalClock = baseRevision + 1;
  } else {
    currentLogicalClock += 1;
  }

  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY_LOGICAL_CLOCK, String(currentLogicalClock));
    } catch {}
  }

  return currentLogicalClock;
}

export function resetLogicalClockForTesting(initial = 1): void {
  currentLogicalClock = initial;
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY_LOGICAL_CLOCK, String(initial));
    } catch {}
  }
}

/**
 * Validates whether a device timestamp represents an obvious wall-clock anomaly
 * (e.g. clock jumped > 24 hours into past or future relative to canonical remote time).
 */
export function isClockAnomalous(remoteTimestamp?: string, localTimestamp?: string): boolean {
  if (!remoteTimestamp || !localTimestamp) return false;
  const remoteMs = new Date(remoteTimestamp).getTime();
  const localMs = new Date(localTimestamp).getTime();
  if (isNaN(remoteMs) || isNaN(localMs)) return false;

  const diffMs = Math.abs(localMs - remoteMs);
  const SKEW_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours
  return diffMs > SKEW_THRESHOLD_MS;
}

/**
 * Extracts revision metadata from an arbitrary entity object.
 */
export function extractEntityRevisionMeta(entity: any): EntityRevisionMeta {
  if (!entity || typeof entity !== 'object') {
    return {
      revision: 0,
      logicalRevision: 0,
      updatedAt: undefined,
      updatedByDeviceId: undefined,
      updatedBySessionId: undefined,
      lastMutationId: undefined,
      fieldMeta: {}
    };
  }

  return {
    revision: typeof entity.revision === 'number' ? entity.revision : 0,
    logicalRevision: typeof entity.logicalRevision === 'number' ? entity.logicalRevision : 0,
    updatedAt: entity.updatedAt || entity.lastModified || entity.timestamp || entity.createdAt,
    updatedByDeviceId: entity.updatedByDeviceId || entity.lastModifiedDeviceId,
    updatedBySessionId: entity.updatedBySessionId || entity.lastModifiedSessionId,
    lastMutationId: entity.lastMutationId || entity.mutationId,
    fieldMeta: entity.fieldMeta || {}
  };
}

/**
 * Deterministically compares two entity revisions.
 * Returns:
 *   > 0 if entity 'a' is strictly newer than 'b'
 *   < 0 if entity 'b' is strictly newer than 'a'
 *   = 0 if identical
 *
 * Deterministic precedence:
 * 1. Authoritative / Server Revision
 * 2. Logical Revision
 * 3. Sanitized ISO Timestamp (updatedAt)
 * 4. Deterministic Device ID tie-breaker
 * 5. Deterministic Mutation ID tie-breaker
 */
export function compareEntityRevision(a: any, b: any): number {
  if (!a && !b) return 0;
  if (a && !b) return 1;
  if (!a && b) return -1;

  const metaA = extractEntityRevisionMeta(a);
  const metaB = extractEntityRevisionMeta(b);

  // 1. Authoritative Server Revision
  if (metaA.revision !== metaB.revision) {
    return metaA.revision - metaB.revision;
  }

  // 2. Logical Revision
  if (metaA.logicalRevision !== metaB.logicalRevision) {
    return metaA.logicalRevision - metaB.logicalRevision;
  }

  // 3. Normalized ISO Timestamps
  const timeA = metaA.updatedAt ? new Date(metaA.updatedAt).getTime() : 0;
  const timeB = metaB.updatedAt ? new Date(metaB.updatedAt).getTime() : 0;

  if (timeA !== timeB && !isNaN(timeA) && !isNaN(timeB)) {
    return timeA - timeB;
  }

  // 4. Deterministic Device ID Tie-Breaker (lexicographical)
  const devA = metaA.updatedByDeviceId || '';
  const devB = metaB.updatedByDeviceId || '';
  if (devA !== devB) {
    return devA.localeCompare(devB);
  }

  // 5. Deterministic Mutation ID Tie-Breaker (lexicographical)
  const mutA = metaA.lastMutationId || '';
  const mutB = metaB.lastMutationId || '';
  if (mutA !== mutB) {
    return mutA.localeCompare(mutB);
  }

  return 0;
}

/**
 * Tags an entity with full monotonic revision and device metadata.
 */
export function tagEntityWithRevision<T extends Record<string, any>>(
  entity: T,
  options: {
    revision?: number;
    baseRevision?: number;
    deviceId?: string;
    sessionId?: string;
    mutationId?: string;
    fields?: string[];
  } = {}
): T {
  const deviceId = options.deviceId || getOrCreateSyncDeviceId();
  const logicalRev = getNextLogicalRevision(options.baseRevision);
  const now = new Date().toISOString();

  const fieldMeta: Record<string, FieldMutationMetadata> = { ...(entity.fieldMeta || {}) };
  if (Array.isArray(options.fields) && options.mutationId) {
    options.fields.forEach(f => {
      fieldMeta[f] = {
        field: f,
        mutationId: options.mutationId!,
        deviceId,
        logicalRevision: logicalRev,
        updatedAt: now,
        value: entity[f]
      };
    });
  }

  return {
    ...entity,
    revision: options.revision !== undefined ? options.revision : (entity.revision || 1),
    logicalRevision: logicalRev,
    updatedAt: now,
    updatedByDeviceId: deviceId,
    updatedBySessionId: options.sessionId || entity.updatedBySessionId,
    lastMutationId: options.mutationId || entity.lastMutationId,
    fieldMeta
  };
}

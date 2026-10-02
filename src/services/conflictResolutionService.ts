/**
 * JIPAS SMSYS CONFLICT RESOLUTION & STATE CONVERGENCE ENGINE (PHASE 44)
 * Provides explicit conflict classification, 3-way field-level merging,
 * Delete-vs-Update resolution, Campus isolation enforcement, and RBAC validation.
 */

import { 
  ConflictCategory, 
  ConflictClassificationResult, 
  JournaledMutation, 
  User,
  FieldMutationMetadata
} from '../types';
import { compareEntityRevision, extractEntityRevisionMeta } from './syncRevisionService';
import { hasMutationBeenApplied } from './mutationJournalService';
import { canCreate, canUpdate, canDelete } from './rbacService';

/**
 * Classifies the conflict type between local and remote state for an entity.
 */
export function classifyConflict(
  localEntity: any,
  remoteEntity: any,
  pendingMutation?: JournaledMutation | null,
  tombstones: Record<string, any> = {}
): ConflictClassificationResult {
  const entityId = localEntity?.id || remoteEntity?.id || pendingMutation?.entityId;
  const tombstone = entityId ? tombstones[entityId] : null;

  // 1. Deduplication check
  if (pendingMutation && hasMutationBeenApplied(pendingMutation.mutationId)) {
    return {
      category: 'DUPLICATE_MUTATION',
      winner: 'SUPPRESS',
      reason: `Mutation ${pendingMutation.mutationId} has already been applied.`
    };
  }

  // 2. Tombstone / Deletion conflicts
  if (tombstone) {
    const tombTime = new Date(tombstone.deletedAt).getTime();
    const localTime = localEntity?.updatedAt ? new Date(localEntity.updatedAt).getTime() : 0;
    const remoteTime = remoteEntity?.updatedAt ? new Date(remoteEntity.updatedAt).getTime() : 0;

    if (pendingMutation && (pendingMutation.operation === 'UPDATE' || pendingMutation.operation === 'CREATE')) {
      const mutTime = new Date(pendingMutation.createdAt).getTime();
      if (tombTime >= mutTime) {
        return {
          category: 'DELETE_VS_UPDATE',
          winner: 'SUPPRESS',
          reason: `Entity ${entityId} was deleted by tombstone at ${tombstone.deletedAt}. Mutation rejected.`
        };
      }
    }

    if (tombTime >= localTime && tombTime >= remoteTime) {
      return {
        category: 'DELETE_VS_UPDATE',
        winner: 'SUPPRESS',
        reason: `Entity ${entityId} has authoritative tombstone deletion.`
      };
    }
  }

  if (pendingMutation && pendingMutation.operation === 'DELETE' && remoteEntity) {
    const mutTime = new Date(pendingMutation.createdAt).getTime();
    const remoteTime = remoteEntity?.updatedAt ? new Date(remoteEntity.updatedAt).getTime() : 0;
    if (mutTime >= remoteTime) {
      return {
        category: 'UPDATE_VS_DELETE',
        winner: 'LOCAL',
        reason: `Local deletion is strictly newer than remote update.`
      };
    }
  }

  // 3. Entity presence checks
  if (!localEntity && !remoteEntity) {
    return { category: 'NO_CONFLICT', winner: 'NONE', reason: 'Neither local nor remote entity exists.' };
  }

  if (localEntity && !remoteEntity) {
    if (pendingMutation && pendingMutation.operation === 'CREATE') {
      return { category: 'SAFE_TO_APPLY', winner: 'LOCAL', reason: 'New local creation with pending mutation.' };
    }
    return { category: 'STALE_LOCAL', winner: 'SUPPRESS', reason: 'Local entity absent from canonical remote baseline without pending creation.' };
  }

  if (!localEntity && remoteEntity) {
    return { category: 'SAFE_TO_APPLY', winner: 'REMOTE', reason: 'New remote entity safely adopted by local cache.' };
  }

  // 4. Both local and remote exist - compare revisions
  const cmp = compareEntityRevision(localEntity, remoteEntity);

  if (cmp === 0) {
    return { category: 'NO_CONFLICT', winner: 'REMOTE', reason: 'Local and remote entities are identical in revision and timestamps.' };
  }

  if (cmp > 0) {
    // Local is newer
    if (pendingMutation && pendingMutation.status === 'PENDING') {
      return {
        category: 'CONCURRENT_UPDATE',
        winner: 'LOCAL',
        reason: 'Local entity has explicit newer mutation.'
      };
    }
    return {
      category: 'SAFE_TO_APPLY',
      winner: 'LOCAL',
      reason: 'Local entity has strictly higher revision.'
    };
  } else {
    // Remote is strictly newer
    if (pendingMutation && pendingMutation.status === 'PENDING') {
      return {
        category: 'STALE_LOCAL',
        winner: 'REMOTE',
        reason: 'Remote revision is strictly higher than local pending mutation base revision.'
      };
    }
    return {
      category: 'SAFE_TO_APPLY',
      winner: 'REMOTE',
      reason: 'Remote entity has strictly higher revision.'
    };
  }
}

/**
 * Performs field-level 3-way merging when independent fields of the same entity
 * are modified across different clients.
 */
export function resolveFieldLevelConflict<T extends Record<string, any>>(
  localEntity: T,
  remoteEntity: T,
  baseEntity?: T | null,
  localFieldMeta: Record<string, FieldMutationMetadata> = {},
  remoteFieldMeta: Record<string, FieldMutationMetadata> = {}
): { merged: T; conflictingFields: string[] } {
  const merged: any = { ...remoteEntity };
  const conflictingFields: string[] = [];

  const allKeys = new Set([
    ...Object.keys(localEntity || {}),
    ...Object.keys(remoteEntity || {})
  ]);

  allKeys.forEach(key => {
    // System revision / metadata keys are handled at the entity level
    if (key === 'revision' || key === 'logicalRevision' || key === 'updatedAt' || key === 'fieldMeta' || key === 'id') {
      return;
    }

    const localVal = localEntity?.[key];
    const remoteVal = remoteEntity?.[key];
    const baseVal = baseEntity?.[key];

    // Case 1: Identical values
    if (JSON.stringify(localVal) === JSON.stringify(remoteVal)) {
      merged[key] = localVal;
      return;
    }

    // Case 2: Only local changed relative to base
    if (baseEntity && JSON.stringify(remoteVal) === JSON.stringify(baseVal) && JSON.stringify(localVal) !== JSON.stringify(baseVal)) {
      merged[key] = localVal;
      return;
    }

    // Case 3: Only remote changed relative to base
    if (baseEntity && JSON.stringify(localVal) === JSON.stringify(baseVal) && JSON.stringify(remoteVal) !== JSON.stringify(baseVal)) {
      merged[key] = remoteVal;
      return;
    }

    // Case 4: Both modified - check field-level metadata
    const lMeta = localFieldMeta[key];
    const rMeta = remoteFieldMeta[key];

    if (lMeta && rMeta) {
      if (lMeta.logicalRevision > rMeta.logicalRevision) {
        merged[key] = localVal;
      } else if (rMeta.logicalRevision > lMeta.logicalRevision) {
        merged[key] = remoteVal;
      } else {
        // Tie-breaker using timestamp or deviceId
        const lTime = new Date(lMeta.updatedAt).getTime();
        const rTime = new Date(rMeta.updatedAt).getTime();
        if (lTime >= rTime) {
          merged[key] = localVal;
        } else {
          merged[key] = remoteVal;
        }
        conflictingFields.push(key);
      }
    } else {
      // Fallback to entity-level revision comparator
      const cmp = compareEntityRevision(localEntity, remoteEntity);
      if (cmp >= 0) {
        merged[key] = localVal;
      } else {
        merged[key] = remoteVal;
      }
      conflictingFields.push(key);
    }
  });

  // Re-calculate revision meta for the merged entity
  const metaCmp = compareEntityRevision(localEntity, remoteEntity);
  merged.revision = Math.max(localEntity?.revision || 1, remoteEntity?.revision || 1) + 1;
  merged.logicalRevision = Math.max(localEntity?.logicalRevision || 1, remoteEntity?.logicalRevision || 1) + 1;
  merged.updatedAt = new Date().toISOString();
  merged.updatedByDeviceId = metaCmp >= 0 ? localEntity?.updatedByDeviceId : remoteEntity?.updatedByDeviceId;

  return { merged, conflictingFields };
}

/**
 * Enforces strict campus scope barrier. Fails closed if mutation attempts cross-campus write.
 */
export function validateCampusScope(
  entity: { campus?: string; campusId?: string },
  authorizedCampus?: string
): boolean {
  if (!authorizedCampus || authorizedCampus === 'General' || authorizedCampus === 'All') {
    return true; // Institutional / Super-Admin scope
  }

  const target = entity.campus || entity.campusId;
  if (!target) return true; // Inherits active context

  return target === authorizedCampus;
}

/**
 * Validates that a replayed or queued mutation complies with RBAC permissions.
 */
export function validateMutationRBAC(
  mutation: JournaledMutation,
  user: User
): { allowed: boolean; reason?: string } {
  if (!user || !user.role) {
    return { allowed: false, reason: 'Unauthenticated user context for mutation.' };
  }

  // Super Admin & CEO have institutional authority
  if (user.role === 'super_admin' || user.role === 'ceo' || user.role === 'director' || user.role === 'admin') {
    return { allowed: true };
  }

  // Campus check
  if (!validateCampusScope({ campus: mutation.campusId }, user.campus)) {
    return { allowed: false, reason: `Campus barrier violation: ${user.campus} cannot mutate ${mutation.campusId}.` };
  }

  // Role resource checks
  const res = mutation.entityType as any;
  if (mutation.operation === 'CREATE') {
    const ok = canCreate(user, res);
    return ok ? { allowed: true } : { allowed: false, reason: `Role '${user.role}' unauthorized to CREATE on '${res}'.` };
  }

  if (mutation.operation === 'UPDATE') {
    const ok = canUpdate(user, res);
    return ok ? { allowed: true } : { allowed: false, reason: `Role '${user.role}' unauthorized to UPDATE on '${res}'.` };
  }

  if (mutation.operation === 'DELETE') {
    const ok = canDelete(user, res);
    return ok ? { allowed: true } : { allowed: false, reason: `Role '${user.role}' unauthorized to DELETE on '${res}'.` };
  }

  return { allowed: true };
}

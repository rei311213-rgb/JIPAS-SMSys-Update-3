/**
 * CHANGE AUDIT & EVENT LOGGING SERVICE
 * Logs administrative configuration changes, release management events,
 * maintenance state changes, and governance checks into central audit trail.
 * Enforces strict secret and credential redaction.
 */

import { recordSecurityAuditLog, getStoredSecurityAuditLogs } from './storageService';

export type ChangeEventType =
  | 'RELEASE_VERIFIED'
  | 'RELEASE_REGISTERED'
  | 'MIGRATION_VERIFIED'
  | 'MIGRATION_DRIFT_DETECTED'
  | 'RECOVERY_CHECK_EXECUTED'
  | 'GOVERNANCE_CHECK_EXECUTED'
  | 'RETENTION_REVIEW_FLAGGED'
  | 'MAINTENANCE_STARTED'
  | 'MAINTENANCE_COMPLETED'
  | 'MAINTENANCE_FAILED';

export interface ChangeAuditEvent {
  id: string;
  eventType: ChangeEventType;
  actor: string;
  timestamp: string;
  details: string;
  result: 'SUCCESS' | 'WARNING' | 'FAILED';
}

/**
 * Strips any potential tokens, secrets, or keys from log strings.
 */
function sanitizeLogDetail(detail: string): string {
  if (!detail) return '';
  return detail
    .replace(/bearer\s+[A-Za-z0-9\-\._~\+\/]+=*/gi, 'Bearer [REDACTED]')
    .replace(/password\s*=\s*['"][^'"]+['"]/gi, 'password=[REDACTED]')
    .replace(/secret\s*=\s*['"][^'"]+['"]/gi, 'secret=[REDACTED]');
}

/**
 * Records a change audit event into the immutable security audit log.
 */
export function recordChangeEvent(
  eventType: ChangeEventType,
  actor: string,
  details: string,
  result: 'SUCCESS' | 'WARNING' | 'FAILED' = 'SUCCESS'
): ChangeAuditEvent {
  const sanitizedDetails = sanitizeLogDetail(details);
  const timestamp = new Date().toISOString();

  recordSecurityAuditLog({
    performedBy: actor || 'System Administrator',
    performedByRole: 'Administrator',
    actionType: eventType,
    details: `${eventType}: ${sanitizedDetails} [Result: ${result}]`
  });

  return {
    id: `change_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    eventType,
    actor: actor || 'System Administrator',
    timestamp,
    details: sanitizedDetails,
    result
  };
}

/**
 * Retrieves change audit events filtered for governance, maintenance, and release events.
 */
export function getChangeAuditHistory(): ChangeAuditEvent[] {
  const rawLogs = getStoredSecurityAuditLogs();
  const filtered = rawLogs.filter(log =>
    log.actionType?.includes('_EXECUTED') ||
    log.actionType?.includes('_VERIFIED') ||
    log.actionType?.includes('MAINTENANCE') ||
    log.actionType?.includes('GOVERNANCE') ||
    log.actionType?.includes('RELEASE')
  );

  return filtered.map(log => ({
    id: log.id,
    eventType: (log.actionType as ChangeEventType) || 'GOVERNANCE_CHECK_EXECUTED',
    actor: log.performedBy || 'System Administrator',
    timestamp: log.timestamp,
    details: log.details,
    result: log.details?.includes('Result: FAILED') ? 'FAILED' : log.details?.includes('Result: WARNING') ? 'WARNING' : 'SUCCESS'
  }));
}

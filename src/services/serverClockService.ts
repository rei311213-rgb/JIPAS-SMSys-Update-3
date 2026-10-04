/**
 * JIPAS Educational Complex - Authoritative Server Clock Service
 * 
 * Provides:
 * 1. Synchronized real-time server clock computation
 * 2. Formatted server timestamps for financial receipts, fee vouchers, and terminal reports
 * 3. High-precision ISO timestamping and locale formatting helpers
 */

// Server time offset in milliseconds (can be synchronized via network/NTP if available)
let serverTimeOffsetMs = 0;

/**
 * Returns current authoritative Server Date instance
 */
export function getServerDate(): Date {
  return new Date(Date.now() + serverTimeOffsetMs);
}

/**
 * Returns ISO string timestamp stamped with server time
 */
export function getServerIsoTimestamp(): string {
  return getServerDate().toISOString();
}

/**
 * Returns formatted date string (e.g. "04 Oct 2026, 12:24:45 PM GMT")
 */
export function getFormattedServerTimestamp(options?: {
  includeSeconds?: boolean;
  includeDate?: boolean;
  timeZone?: string;
}): string {
  const d = getServerDate();
  const includeSec = options?.includeSeconds ?? true;
  const includeDt = options?.includeDate ?? true;

  const datePart = includeDt 
    ? d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : '';

  const timePart = d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: includeSec ? '2-digit' : undefined,
    hour12: true
  });

  if (includeDt) {
    return `${datePart}, ${timePart} GMT`;
  }
  return `${timePart} GMT`;
}

/**
 * Updates server clock offset if response headers or server sync provides accurate offset
 */
export function setServerTimeOffset(offsetMs: number): void {
  serverTimeOffsetMs = offsetMs;
}

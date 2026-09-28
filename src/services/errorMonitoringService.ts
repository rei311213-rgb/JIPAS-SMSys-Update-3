/**
 * CENTRALIZED CLIENT ERROR MONITORING SERVICE
 * Production-safe error logging, classification, and sanitization abstraction.
 * Captures UI, network, auth, database, and sync errors while ensuring sensitive
 * credentials, tokens, passwords, and student document binaries are never logged.
 */

export type ErrorCategory =
  | 'AUTHENTICATION'
  | 'AUTHORIZATION'
  | 'DATABASE'
  | 'NETWORK'
  | 'OFFLINE_SYNC'
  | 'CONFLICT'
  | 'DOCUMENT_VAULT'
  | 'FINANCE'
  | 'PAYROLL'
  | 'UI'
  | 'UNKNOWN';

export interface AppErrorEvent {
  id: string;
  category: ErrorCategory;
  message: string;
  timestamp: string;
  context?: Record<string, any>;
  handled: boolean;
}

const MAX_ERROR_LOG_SIZE = 50;
const errorLogBuffer: AppErrorEvent[] = [];
let isInitialized = false;

/**
 * Strips secrets, passwords, bearer tokens, and large binary buffers from log contexts.
 */
function sanitizeContext(rawContext?: Record<string, any>): Record<string, any> | undefined {
  if (!rawContext) return undefined;
  const sanitized: Record<string, any> = {};

  for (const key of Object.keys(rawContext)) {
    const lowerKey = key.toLowerCase();
    if (
      lowerKey.includes('password') ||
      lowerKey.includes('token') ||
      lowerKey.includes('secret') ||
      lowerKey.includes('key') ||
      lowerKey.includes('auth') ||
      lowerKey.includes('binary') ||
      lowerKey.includes('base64')
    ) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof rawContext[key] === 'string' && rawContext[key].length > 1000) {
      sanitized[key] = rawContext[key].substring(0, 100) + '... [TRUNCATED]';
    } else {
      sanitized[key] = rawContext[key];
    }
  }

  return sanitized;
}

/**
 * Reports a categorized error to the monitoring system.
 */
export function reportError(
  error: unknown,
  category: ErrorCategory = 'UNKNOWN',
  context?: Record<string, any>,
  handled = true
): AppErrorEvent {
  let message = 'An unexpected application error occurred.';

  if (typeof error === 'string') {
    message = error;
  } else if (error && typeof error === 'object') {
    if ('message' in error && typeof (error as any).message === 'string') {
      message = (error as any).message;
    } else {
      message = String(error);
    }
  }

  // Sanitize any token/password patterns from message text itself
  message = message
    .replace(/bearer\s+[A-Za-z0-9\-\._~\+\/]+=*/gi, 'Bearer [REDACTED]')
    .replace(/password\s*=\s*['"][^'"]+['"]/gi, 'password=[REDACTED]');

  // Deduplicate identical message in short window (last 3 seconds)
  const recentDup = errorLogBuffer.find(
    (e) => e.message === message && e.category === category && Date.now() - new Date(e.timestamp).getTime() < 3000
  );

  if (recentDup) {
    return recentDup;
  }

  const errorEvent: AppErrorEvent = {
    id: `err_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    category,
    message,
    timestamp: new Date().toISOString(),
    context: sanitizeContext(context),
    handled
  };

  errorLogBuffer.unshift(errorEvent);

  if (errorLogBuffer.length > MAX_ERROR_LOG_SIZE) {
    errorLogBuffer.pop();
  }

  // Safe operational console notice (without exposing raw stack traces to users)
  console.warn(`[JIPAS Monitor : ${category}]`, message);

  return errorEvent;
}

/**
 * Returns currently recorded error events.
 */
export function getRecentErrors(): AppErrorEvent[] {
  return [...errorLogBuffer];
}

/**
 * Clears the in-memory error buffer.
 */
export function clearErrorLog(): void {
  errorLogBuffer.length = 0;
}

/**
 * Attaches global unhandled error and unhandled rejection listeners.
 */
export function initErrorMonitoring(): void {
  if (isInitialized || typeof window === 'undefined') return;

  window.addEventListener('error', (event) => {
    reportError(event.error || event.message, 'UI', { source: event.filename, lineno: event.lineno }, false);
  });

  window.addEventListener('unhandledrejection', (event) => {
    reportError(event.reason, 'NETWORK', { type: 'unhandled_promise_rejection' }, false);
  });

  isInitialized = true;
}

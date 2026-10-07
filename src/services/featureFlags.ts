// Comprehensive Feature Flag Configuration & Runtime Management
export const FEATURES = {
  AUTOMATED_FINANCIAL_AUDIT: 'AUTOMATED_FINANCIAL_AUDIT',
  BULK_PRINT_RECEIPTS: 'BULK_PRINT_RECEIPTS',
  AI_AT_RISK_DETECTION: 'AI_AT_RISK_DETECTION',
  STRICT_RATE_LIMITING: 'STRICT_RATE_LIMITING',
  OFFLINE_RESILIENCE_MODE: 'OFFLINE_RESILIENCE_MODE',
} as const;

export type FeatureKey = typeof FEATURES[keyof typeof FEATURES];

export interface FeatureFlagMeta {
  key: FeatureKey;
  label: string;
  description: string;
  category: 'Finance & Audit' | 'Printing & Output' | 'AI & Analytics' | 'Security & Network';
  defaultEnabled: boolean;
  enabled: boolean;
}

export const FEATURE_METADATA: Record<FeatureKey, Omit<FeatureFlagMeta, 'key' | 'enabled'>> = {
  [FEATURES.AUTOMATED_FINANCIAL_AUDIT]: {
    label: 'Automated Financial Reconciliation Engine',
    description: 'Scheduled midnight background verification comparing student bills, collections, and detecting ledger discrepancies.',
    category: 'Finance & Audit',
    defaultEnabled: true,
  },
  [FEATURES.BULK_PRINT_RECEIPTS]: {
    label: 'Multi-Receipt Batch Printing (4 per A4)',
    description: 'Enables selection of multiple payments to format and print 4 distinct A6 slips neatly arranged on a single A4 sheet.',
    category: 'Printing & Output',
    defaultEnabled: true,
  },
  [FEATURES.AI_AT_RISK_DETECTION]: {
    label: 'Predictive Student Academic Risk Analysis',
    description: 'Utilizes server-side Gemini intelligence to analyze student grading trends and identify learners requiring early intervention.',
    category: 'AI & Analytics',
    defaultEnabled: true,
  },
  [FEATURES.STRICT_RATE_LIMITING]: {
    label: 'API Shield & Dynamic Rate Limiting',
    description: 'Protects backend endpoints against brute-force attempts and denial-of-service spikes by throttling excessive requests.',
    category: 'Security & Network',
    defaultEnabled: true,
  },
  [FEATURES.OFFLINE_RESILIENCE_MODE]: {
    label: 'Offline-First Local Storage Cache',
    description: 'Maintains instant UI responsiveness during intermittent network connectivity by prioritizing local storage caches.',
    category: 'Security & Network',
    defaultEnabled: true,
  },
};

const STORAGE_KEY = 'jipas_system_feature_flags';

// In-memory states
const inMemoryFlags: Record<string, boolean> = {
  [FEATURES.AUTOMATED_FINANCIAL_AUDIT]: true,
  [FEATURES.BULK_PRINT_RECEIPTS]: true,
  [FEATURES.AI_AT_RISK_DETECTION]: true,
  [FEATURES.STRICT_RATE_LIMITING]: true,
  [FEATURES.OFFLINE_RESILIENCE_MODE]: true,
};

function getStoredFlagsFromBrowser(): Record<string, boolean> | null {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function persistFlagsToBrowser(flags: Record<string, boolean>): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(flags));
  } catch (e) {
    console.warn('[featureFlags] Failed to persist flags to localStorage:', e);
  }
}

export const isFeatureEnabled = (featureKey: string): boolean => {
  const browserFlags = getStoredFlagsFromBrowser();
  if (browserFlags && typeof browserFlags[featureKey] === 'boolean') {
    return browserFlags[featureKey];
  }
  if (typeof inMemoryFlags[featureKey] === 'boolean') {
    return inMemoryFlags[featureKey];
  }
  const meta = FEATURE_METADATA[featureKey as FeatureKey];
  return meta ? meta.defaultEnabled : false;
};

export const toggleFeature = (featureKey: string, enabled?: boolean): boolean => {
  const current = isFeatureEnabled(featureKey);
  const next = enabled !== undefined ? enabled : !current;
  
  inMemoryFlags[featureKey] = next;
  
  const browserFlags = getStoredFlagsFromBrowser() || { ...inMemoryFlags };
  browserFlags[featureKey] = next;
  persistFlagsToBrowser(browserFlags);

  // Notify listeners across the app
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('jipas_feature_flag_changed', {
      detail: { key: featureKey, enabled: next }
    }));
  }

  return next;
};

export const getAllFeatureFlags = (): FeatureFlagMeta[] => {
  return (Object.keys(FEATURE_METADATA) as FeatureKey[]).map((key) => {
    const meta = FEATURE_METADATA[key];
    return {
      key,
      label: meta.label,
      description: meta.description,
      category: meta.category,
      defaultEnabled: meta.defaultEnabled,
      enabled: isFeatureEnabled(key),
    };
  });
};

export const resetFeatureFlagsToDefaults = (): void => {
  (Object.keys(FEATURE_METADATA) as FeatureKey[]).forEach((key) => {
    inMemoryFlags[key] = FEATURE_METADATA[key].defaultEnabled;
  });
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      localStorage.removeItem(STORAGE_KEY);
      window.dispatchEvent(new CustomEvent('jipas_feature_flag_changed'));
    } catch {}
  }
};

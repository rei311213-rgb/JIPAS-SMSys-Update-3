/**
 * RELEASE & APPLICATION METADATA SERVICE
 * Exposes safe application release information, version metadata,
 * and build environment details.
 */

import { validateEnvironment } from '../lib/envConfig';

export interface ReleaseMetadata {
  applicationName: string;
  version: string;
  buildEnvironment: 'development' | 'production' | 'test';
  releaseChannel: string;
  buildTimestamp: string;
  architecture: string;
}

export function getReleaseMetadata(): ReleaseMetadata {
  const env = validateEnvironment();
  return {
    applicationName: 'JIPAS Students Hub',
    version: env.applicationVersion,
    buildEnvironment: env.buildMode,
    releaseChannel: 'Production GA',
    buildTimestamp: '2026-09-26T00:00:00Z',
    architecture: 'Supabase PostgreSQL + PostgreSQL RLS + IndexedDB + Google Drive Vault'
  };
}

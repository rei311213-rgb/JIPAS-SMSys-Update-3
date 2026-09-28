# Phase 19 Production Launch Runbook
## JIPAS Students Hub — Deployment Prerequisites & Human Approvals

This runbook defines the required human approval process, deployment pipeline triggers, and smoke tests needed for safe production launches.

### 1. Mandatory Deployment Prerequisites
1. **TypeScript Check**: `npm run lint` must compile successfully with zero errors.
2. **Automated Unit Tests**: `npm run test` must output `16/16 PASSED`.
3. **Environment Staging Audits**: All Phase 19 diagnostics in the Admin Dashboard must flag as verified green.
4. **Credential Containment**: Confirm that no service-role secrets are included in the bundle outputs.

### 2. Launch Execution Roadmap
1. Place the system into a read-only Maintenance Mode via the Admin Control Panel.
2. Deploy the verified, compiled client assets to Google Cloud Run / hosting.
3. Execute post-launch smoke tests: sign in, navigate to the **QA & Release Diagnostics** dashboard, and trigger a live system diagnostic check.
4. Disable Maintenance Mode to restore standard active read/write capabilities.

### 3. Quick-Rollback Actions
If smoke testing reveals critical regressions:
1. Re-enable Maintenance Mode immediately to lock input states.
2. Re-deploy the previously verified stable deployment bundle from your local repository.
3. Validate client reconnection and sync.

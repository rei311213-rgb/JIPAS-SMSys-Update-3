# Phase 20 Controlled Production Deployment Runbook
## JIPAS Students Hub — Deployment Gates, Smoke Tests & Rollbacks

This runbook defines the exact commands, prerequisites, and decision matrices for an authorized human operator deploying the Phase 20 release container.

### 1. Mandatory Pre-Deployment Checklist
1. **Type Safety Validation**: `npm run lint` must complete with zero errors.
2. **Core Automated Tests**: `npm run test` must output `16/16 PASSED`.
3. **Staging Readiness Diagnostics**: All security and variable diagnostics must show passing.
4. **Human Sign-Offs**: CEO and Headmaster launch keys must be toggled green in the Administrator Dashboard.

### 2. Launch Execution Procedures
1. Enter read-only Maintenance Mode via the Admin Control Panel to freeze current writes.
2. Build and compile production-grade static assets:
   ```bash
   npm run build
   ```
3. Deploy compiled artifacts located in `dist/` to the web hosting container.
4. Run Post-Deployment Smoke Tests:
   * Verify dashboard initialization.
   * Verify student portal sandbox boundary.
5. De-activate Maintenance Mode to restore full write operations.

### 3. Immediate Rollback Playbook
If post-launch testing reveals severe regressions:
1. Re-enable Maintenance Mode immediately.
2. Redeploy the last stable, compiled Phase 19 static build.
3. Verify client reconnection, sync, and offline durable queue.

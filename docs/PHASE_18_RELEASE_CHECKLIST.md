# PHASE 18 PRODUCTION DEPLOYMENT & RELEASE CHECKLIST
## JIPAS Students Hub — Release-Readiness & Rollback Procedures

This checklist outlines the release procedure, safety verifications, and rollback instructions for JIPAS Students Hub Phase 18.

---

### 1. Pre-Deployment Verification Checklist

Before deploying the compiled build to production, complete the following validation steps:

- [ ] **Run Linter (Static Type Check)**:
  `npm run lint` must exit with code 0 (no TypeScript compilation issues).
- [ ] **Run Core Test Suite**:
  `npm run test` must output `16/16 PASSED` with zero failed assertions.
- [ ] **Verify Production Environment Variables**:
  Ensure the following variables are securely set in the production environment:
  - `VITE_SUPABASE_URL`: Fully qualified production database endpoint.
  - `VITE_SUPABASE_ANON_KEY`: Public anonymous API key.
- [ ] **Check Secrets Containment**:
  Confirm that `SUPABASE_SERVICE_ROLE_KEY` is strictly absent from the client bundles and is only present server-side.
- [ ] **Confirm Zero Firebase Dependency**:
  `package.json` must contain exactly **0** firebase-related dependencies.
- [ ] **Confirm Zero Transport Module**:
  Ensure no Transport modules, views, or endpoints are included in the build.
- [ ] **Perform Production Compilation Build**:
  `npm run build` must succeed without errors, generating a valid `dist/` directory.

---

### 2. Live Deployment Procedure

1. **Enter Read-Only Maintenance State**:
   - Navigate to the **Release & Migration Control** panel inside the Admin Portal.
   - Click **Toggle Maintenance Mode** to transition the platform into `MAINTENANCE` state.
2. **Execute Schema Migration Checklist**:
   - Verify the `system_migrations` table contains the expected version metadata (`17.0.0`).
3. **Trigger Hosting Deployment**:
   - Push the verified production build artifact to the target hosting provider (Google Cloud Run / Vercel / Netlify).
4. **Post-Deployment Verification**:
   - Refresh the client, verify the app initializes correctly, and run the automated diagnostics suite from the **QA & Release Diagnostics** dashboard to confirm active health.
5. **Exit Maintenance State**:
   - Disable maintenance mode to restore active writes.

---

### 3. Rapid Rollback Instructions

Should post-deployment checks flag any catastrophic failures or schema incompatibility, execute the following instructions:

1. **Activate Immediate Maintenance Block**:
   - Toggle maintenance mode to block any new incoming database writes and protect local synchronization queues.
2. **Revert Deployment Artifact**:
   - Re-deploy the previously compiled, verified Phase 17 stable artifact to production hosting.
3. **Verify Local Client Restorations**:
   - Clear the current session, re-authenticate, and confirm local synchronization queues successfully sync any unsynced offline state.

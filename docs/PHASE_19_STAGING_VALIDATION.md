# Phase 19 Staging Environment Validation
## JIPAS Students Hub — Staging Health Controls

This document details the configuration validation, server environment diagnostics, and safeguards designed to isolate our staging and production servers cleanly.

### 1. Active Environment Verification
Staging validations evaluate the operating environment automatically based on domain name origin checking:
* **Development Mode**: `localhost` / `127.0.0.1` endpoints.
* **Staging Mode**: Cloud preview staging URLs containing `staging`, `dev`, `ais-dev`, or `ais-pre` keywords.
* **Production Mode**: Joy International official custom domain matching `joyinternational` or `jipas`.

### 2. Mandatory Environment Variables Validation
We continuously verify that all critical parameters exist, adhere to expected cryptographic formats, and are masked correctly during diagnostics:
* `VITE_SUPABASE_URL`: Fully qualified production/staging backend connection pool.
* `VITE_SUPABASE_ANON_KEY`: Safe public JWT key.
* `GEMINI_API_KEY`: Server-only credentials required for AI commenting and academic analytics.

### 3. Production Environment Safeguards
Whenever `production` mode is active, the testing suite triggers strict runtime locks blocking the execution of any destructive automated scripts. This ensures database safety, zero testing mutations on real student folders, and protects billing records.

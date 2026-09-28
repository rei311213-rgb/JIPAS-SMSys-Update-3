# Phase 20 Database Backup and Recovery Manual
## JIPAS Students Hub — Backup Schedules & Recovery Operations

This manual details the database backup procedures, Point-In-Time recovery policies, and offline cache synchronization routines configured for Phase 20.

### 1. Daily Backup Configuration
* **Point-In-Time Recovery (PITR)**: Backups are enabled on Supabase backend hosting with a 30-day log-retention loop.
* **Schema Lock**: Authoritative schema is aligned with schema version `17.0.0` (matching migration historical registers).

### 2. Isolated Schema Restoration Drills
To verify backup integrity, operators may run restoration drills on an isolated staging database:
1. Provision a separate staging schema (never overwrite live production tables).
2. Restore the latest backup file to the staging schema.
3. Validate student count and outstanding balance math.
* **Measured RPO (Recovery Point Objective)**: Evaluated dynamically (~1 minute) based on offline synchronization durable logs.
* **Measured RTO (Recovery Time Objective)**: Evaluated dynamically (~5 minutes) based on automatic reconnect routines.

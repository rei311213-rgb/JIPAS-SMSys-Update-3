# Security Specification - JIPAS

## Authentication
- Users must be authenticated for most operations.
- Admin role has full access to all collections.

## Role-Based Access Control (RBAC)
- **Admin**: Full control.
- **Sub-Admin / Clerk**: View-only access to academic catalogs and staff, but can manage students.
- **Teacher**: Can read student lists, academic setup, and their own assigned students' reports. Can create/update reports.
- **Accountant / Sub-Accountant**: Can manage bills, transactions (payments), expenses, and bank deposits.
- **Secretary**: Can manage student registrations and read bills/payments to assist parents.
- **Student**: Read-only access to their own student profile, bills, and reports. Public read access to school catalogs (academic years, terms, classes).

## Collection Rules Summary
- `students`: Secretary/Admin write. All staff read. Students read self.
- `teachers`: Admin write. Admin/Sub-Admin read.
- `users`: Admin only.
- `reports`: Teachers/Admin write. Students read self.
- `bills`: Accountants/Admin write. Students read self.
- `transactions`: Accountants/Secretary/Admin write. Students read self.
- `securityAuditLogs`: Admin only.
- `expenses`: Accountants/Admin only.
- `bankDeposits`: Accountants/Admin only.
- `feedback`: Public write (authenticated), Admin read.
- `academicYears`, `terms`, `classes`, `houses`, `subjects`, `events`, `notifications`, `classFeeTariffs`, `classReportBroadcasts`: Public read (authenticated), Admin write.
- `settings`, `systemSettings`: Public read (authenticated), Admin write.

# Supabase migration preparation

These files document the schema and guarded content migration. Review the schema and retain a verified backup before any approved remote import.

## Validation status

All five migrations and `verification.sql` were executed in an isolated
PGlite 0.4.1 PostgreSQL WebAssembly runtime in the system temporary directory.
The test database supplied disposable `anon`, `authenticated`, and
`service_role` roles plus a minimal `storage.objects` stand-in. The five
migrations applied twice successfully. Synthetic-only checks passed for all
nine tables/RLS policies, role permissions, import idempotency and overwrite
protection, section rollback, rate-limit denial/reset/null handling, session
creation/validation/revocation, contact-message RPCs, and the verification SQL.
No project JSON, real contact messages, production sessions, counters, or
media were imported. This does not replace a hosted Supabase project smoke
test.

## SQL execution order

Use a fresh Supabase project and execute each complete file in the SQL Editor,
in this order:

1. `migrations/001_initial_schema.sql`
2. `migrations/002_security_policies.sql`
3. `migrations/003_portfolio_functions.sql`
4. `migrations/004_security_functions.sql`
5. `migrations/005_data_import_functions.sql`

Execute each script as a project database owner (the Supabase SQL Editor's
default role) so the `SECURITY DEFINER` functions are owned by a trusted role.
Inspect the SQL Editor result after each file. The scripts use transactions;
if one fails, that file's transaction rolls back. Do not retry blindly after
manually changing only part of a failed script.

`002_security_policies.sql` assumes Supabase's `anon`, `authenticated`,
`service_role`, and `storage.objects` already exist. It blocks direct client
access to app tables and functions. Backend-only calls use the service role;
never put that key in browser code. The verification SQL includes an anon
table-access check.

For a hosted Supabase-specific smoke test, create a separate disposable
development project with no real data, open its SQL Editor, run the five
migrations in order one file at a time, then run `verification.sql`. Do not
link the portfolio backend, import `data.json`, or upload media to that test
project. Delete the disposable project after recording the pass/fail results.
Supabase documents that direct Dashboard SQL changes are not recorded in its
migration history; decide whether the long-term workflow will use SQL Editor
or CLI migrations before applying changes to the target project.

## Local backup and dry run

From the repository root:

```powershell
node scripts/backup-portfolio.js
node scripts/migrate-portfolio.js --dry-run
node scripts/verify-migration.js
```

The backup utility defaults to a private directory under the user's home
folder, outside the repository. It copies the private local
`frontend/backend/data.json` and referenced local media, writes file hashes
and counts to a private manifest, restricts Windows ACLs to the current
account, SYSTEM, and Administrators (and uses owner-only POSIX modes), and
refuses output inside the repository.
Use `--out <absolute-private-directory>` to choose another location outside
the repository. It does not inspect Git history, upload files, or modify the
source. Review the output directory's access controls and retain it securely.

The dry run validates source content and local media without network access. A fresh repository checkout does not contain `frontend/backend/data.json`; restore that private file locally before using the backup, migration, or local migration-verification commands. The synthetic test fixture is not a migration source. To import public portfolio sections after explicit approval, run `node scripts/migrate-portfolio.js --apply`. The import RPC is atomic, rejects populated data, and returns unchanged on replay of the same payload. The script does not offer overwrite, import messages, or upload media. Local media stays in static assets; the CV and two flagged PDFs are excluded from Vercel by `.vercelignore`.

Use `node --env-file=frontend/backend/.env scripts/verify-migration.js --remote` for read-only comparison. An anonymous table check runs only if `SUPABASE_ANON_KEY` is set. The server key may be provided as `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY`.

The application uses the existing public bucket for authenticated new uploads, and Supabase RPCs for data and security operations. Configure `SUPABASE_URL`, a server key, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `RATE_LIMIT_HMAC_SECRET`, `SITE_URL`, and `NODE_ENV=production` in Vercel. Never expose server keys to browser code.

## Rollback

Do not drop tables as an automatic rollback. If a script fails, its transaction
should leave that file unapplied. For an intentional rollback after successful
execution, stop backend use of the new RPCs first, export and verify any data
created since import, then use a separately reviewed rollback script or
restore a database backup. The scripts do not include destructive `DROP`
statements. Restore the local JSON/media backup only after comparing it with
the working tree; do not overwrite newer files blindly.

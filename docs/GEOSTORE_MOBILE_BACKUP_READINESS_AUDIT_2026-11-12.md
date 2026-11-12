# GEOSTORE — Mobile Backup Readiness Audit (2026-11-12)

## Scope
Read-only review of the connected Supabase project and current official Supabase backup documentation. No Production database, schema, migration, Storage object, project setting, or deployment was changed.

## Verified project state
- Supabase project ref: `xmtnszxtnfxnrojionoa`
- Project status: `ACTIVE_HEALTHY`
- PostgreSQL: 17.11
- Region: `us-west-2`
- Production migration ledger: 93 entries (rechecked in this pass).
- Supabase development branches: none.
- Current project metadata response does not expose the billing plan; plan must be confirmed in Dashboard before assuming dashboard backup availability.
- Security Advisor still reports `auth_leaked_password_protection` as WARN / disabled.

## Official backup constraints
Official documentation: https://supabase.com/docs/guides/platform/backups

- Supabase states scheduled daily database backups are provided for Pro, Team, and Enterprise plans. Pro retains 7 days; Team 14 days; Enterprise up to 30 days.
- Free-plan projects are instructed to create manual exports with Supabase CLI `db dump` and keep off-site copies. The CLI workflow requires a computer or another trusted shell environment; it is not safely completed from the iPhone Dashboard alone.
- Database backups do **not** include the actual files stored through Supabase Storage. They include Storage metadata only. Storage objects require a separate export/download process.
- Dashboard Storage supports downloading individual objects. Bulk export is better handled with CLI or an S3-compatible client.
- A restore is a downtime-causing operation and is not a backup operation. Do not click Restore during this audit.

## iPhone-only operational path
1. Open the Supabase Dashboard in Safari and select the GEOSTORE project.
2. Open **Database → Backups** (scheduled backups page).
3. Inspect only: record whether backup entries are visible and note their displayed timestamps/retention. Do not select Restore, PITR restore, reset, or any destructive action.
4. Confirm the project billing plan in the Dashboard / organization billing area. Do not infer it from project metadata.
5. Separately inspect **Storage → Files** and list the buckets and object counts; do not delete, move, or overwrite objects.
6. If the project is Free and no downloadable backup is offered, stop. A complete logical export requires a trusted computer/shell workflow. Do not paste database URLs, passwords, access tokens, service-role keys, or S3 secrets into ChatGPT or browser notes.

## Release blockers remain
- 24 Production migration versions still lack their exact source files in the audit branch.
- No verified restorable backup ID/timestamp has been established.
- Storage objects need a separate backup plan.
- No Supabase development branch exists.
- Therefore do not merge PR #87, apply migrations, run `db push`, or deploy to Production.

## Preservation requirements
Preserve current live users, products, variants, stock, settings, messages, and any active operational data. The user has clarified that historical orders and photos they were concerned about were test data and do not need to be restored from an old backup. This is permission to skip recovery of those historical test records/files, not permission to delete currently present Production records or Storage objects. Do not run test orders/messages against Production.

## Outcome
This pass confirms the safe iPhone inspection route and the key plan-dependent limitation. It does not claim that a backup exists or that a backup has been downloaded. Next required evidence: the user checks whether **Database → Backups** shows dated entries and confirms the project plan; then the backup path can be selected without risking Production.


## User-confirmed Dashboard observation (2026-11-12)
The user checked **Database → Backups** from an iPhone and reported that no backup entries are visible. This is a user-reported UI observation, not an independently verified API result. Accordingly:
- No scheduled backup or restorable point is currently confirmed.
- Do not represent the project as backed up.
- Continue with read-only checks only; no Production migrations, schema changes, data writes, Storage mutations, merge, or deployment.
- Next safe user-side check: confirm the Supabase organization/project billing plan in Dashboard. If the project is Free, the manual CLI export path requires a trusted computer/shell; wait until one is available rather than attempting an unsafe phone-only workaround.


## User recovery preference and current Storage inventory (2026-11-12)
- The user explicitly confirmed that the older orders and photos under discussion were test data and do not need restoration. Do not spend further work attempting to recover those historical test records/files.
- A read-only query of current Storage metadata found one bucket, `storefront-media`, marked public, with 12 objects and 2,413,683 bytes total. This is a current inventory observation, not a backup.
- No Storage objects were downloaded, modified, moved, or deleted.
- Continue the audit without historical test-data restoration, while preserving currently present Production data and functionality. Production deployment safeguards and migration-source blockers remain unchanged.

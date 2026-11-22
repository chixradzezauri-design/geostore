# Stage 71 — fail-closed SQL guards for the coordinated release

**NOT RELEASE-READY. PR #149 remains Draft. Production unchanged.**

## What is now protected by executable SQL

The four pending SQL files have to be applied in the correct dependency order,
and only after a full migration-history and security review. This stage adds
SQL catalog prerequisite checks **inside** each of the three additive
migrations, after `BEGIN` and before the first function replacement:

- **Stage51** refuses to overwrite checkout when
  `private.create_order_with_stock(jsonb)` is absent, not SECURITY DEFINER or
  no longer returns JSONB, or an existing public wrapper has unexpected
  SECURITY DEFINER / return-type configuration.
- **Stage54** refuses to replace customer history if Supabase `auth.uid()`
  or the owner-scoped order table's column types are absent or changed.
- **Stage57 / Phase A** refuses to install admin order projected APIs if
  the staff permission infrastructure, Orders RLS or any of the seventeen
  referenced order columns/types is missing. Phase A does **not** revoke
  old raw order grants, preserving the existing Production frontend.
- **Stage70 / Phase B** retains the earlier guard requiring BOTH new projected
  APIs and safe invocation grants before sensitive order snapshot SELECT grants
  can be removed. It must execute only AFTER the reviewed new frontend is READY.

No SQL is being applied during this preparation stage. The added guards
make a future unexpected live-schema difference abort its own migration
transaction before any checkout, order history or staff order RPC changes.

## Validation and blockers

The exact source migration files run in the existing isolated, no paid staging
PostgreSQL 17 GitHub CI fixture. The Stage71 Node tests ensure guards remain
before their sensitive function replacements and preserve the Phase A/B order.

A successful fixture is NOT equivalent to **full-schema** Supabase Auth,
PostgREST, Storage and real authenticated **JWT** role / checkout E2E testing.

The unresolved **migration history** mismatch still includes 43 branch-local
versions without matching Production timestamps (32 same normalized name at
a different timestamp, seven older unreviewed or dangerous migrations and
four new, unapplied release migrations). Blind `supabase db push` and
automated `supabase migration repair` remain prohibited.

**Production unchanged**: no DDL/DML on the live project, no merge or Vercel
Production deployment, no paid Supabase project/branch, no customer orders,
stock or staff records modified. The user previously declined paid staging;
**no paid staging** was created.

Next operational release action once a no-cost full-schema isolated testing
option is available: verify checkout/finance and permissions against real
Supabase JWT/Data API roles, then apply Phase A, release the exact reviewed
frontend, and apply Phase B only when new clients are healthy. Stop immediately
on an unexpected live migration-history or catalog difference.

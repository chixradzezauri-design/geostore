# Stage 74 — historical SQL executable-token reconciliation

**NOT RELEASE-READY. Production unchanged. PR #149 remains Draft.**

One-time read-only Supabase migration catalog query retrieved the applied SQL
for the **11** same-name/different-timestamp files whose content MD5s differed.
Those original SQL source bodies were compared with the matching GitHub
migration files using a SQL-aware lexical tokenizer. No customer, staff,
stock, finance or order records were accessed.

**10 of the 11** historical/local pairs have identical executable SQL tokens
after ignoring comments, indentation and whitespace. This included full
SQL inside dollar-quoted PL/pgSQL bodies; string literals and SQL operators
were preserved. Source equality evidence is captured in
`release/stage74-reviewed-sql-evidence.json` using exact local Git blob
hashes, applied SQL MD5s, source versions and local executable token counts.
**SQL text was not committed** from Supabase.

The single real difference is
`20261119090000_revoke_anon_completed_order_reactivation.sql`:
the local migration adds `BEGIN;` / `COMMIT;` and grants execute to
`authenticated, service_role`; the applied migration lacks the explicit
transaction wrapper and grants only to `authenticated`. This is an
**authorization and transaction difference**, not cosmetic formatting.
Never treat it as automatically applied or safe to replay.

Of the original 32 same-name/different-version source pairs, **21 were
byte-identical**, **10 additional pairs were identical at executable SQL
token level**, and **1 had a real privilege/transaction difference**.
The 61 local files that have an exact version/name but different stored
SQL MD5 still need historical source review; the seven known older
unapplied SQL migrations must not be blindly replayed.

The no-network Stage74 CI guard rechecks frozen SQL source hashes, remote
migration digest evidence, token counts and the identified exception.
The full remote SQL is not checked into GitHub and therefore is NOT
retokenized in CI; classification is frozen one-time review evidence.

Production rollout remains strictly **Phase A** (customer checkout/history
redaction and add-only admin order RPCs), new frontend verified READY,
then **Phase B** (restrict old raw financial order reads), only after
real **full-schema Supabase** authenticated **JWT**/PostgREST validation
and coordinated safe release rehearsal. No automatic migration repair
or schema deploy, no live DDL/DML, **no paid staging** or Production changes.

## Stage75 local-only historical version reconciliation

21 byte-identical old-version SQL files were renamed to exact already-applied Supabase timestamps. The previous 32 different-timestamp pair count is now 11, with the same 10 comment/formatting-only pairs and one actual service_role privilege difference. No database history was repaired, no SQL was executed, and Phase A/B deployment prerequisites remain unchanged.

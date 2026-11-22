# Stage 75 — align 21 byte-identical local migration filenames to already-applied versions

**NOT RELEASE-READY. Production unchanged. PR #149 remains Draft/unmerged.**

The read-only Stage73 audit proved 21 local migrations were **byte-for-byte
identical** to SQL already applied by the connected Production Supabase.
All 21 have now been renamed **only in the GitHub PR branch** to their actual
remote applied version IDs. The existing SQL blob SHA values are reused;
not even a single SQL byte was edited. The complete old/new filename map,
unchanged Git blob SHA and remote SQL MD5 checksums are retained in
`release/stage75-reviewed-local-renames.json`.

The Stage75 test guard checks every renamed local SQL file against its exact
previous Git blob SHA and original Supabase-stored SQL MD5, and rejects any
reintroduced old duplicate or altered content. It also checks the frozen 135
applied remote version/name snapshot and the four original, source-pinned
release SQL files.

## Result after local reconciliation

| Migration-history bucket | Before | After |
| --- | ---: | ---: |
| Exact local version + name | 80 | **101** |
| Same name, different timestamp | 32 | **11** |
| Older unmatched risky/unproven files | 7 | 7 |
| Staged new SQL files | 4 | 4 |
| **Unmatched local versions** | 43 | **22** |
| Applied remote versions without matching local version | 55 | **34** |

The 11 remaining different-timestamp records comprise ten earlier
lexically equal but different-byte sources, plus one actual
`service_role` permission and transaction-scope drift. The 61 exact-version
but SQL-different historical sources and seven old risky/unproven migrations
still need careful targeted review; none was replayed.

## Safe release boundary

**Phase A** (three reviewed checkout/history/admin projection API migrations)
must precede the reviewed frontend deployment. **Phase B** (legacy
finance-bearing order-column ACL cutover) must follow only after the new
frontend is fully READY. This local-only rename step does not change those
four SQL sources or the required order.

True **full-schema Supabase** staging with authenticated **JWT**/PostgREST,
staff roles, checkout, stock and order status checks remains mandatory before
merging/deploying the accumulated PR. A local rename is NOT a Supabase
migration repair and is NOT permission to run a blind `supabase db push`.
No Supabase Production writes, no SQL execution, no live order/stock
changes, **no paid staging**, no PR merge or Vercel Production deploy took
place in this stage.

**Production unchanged.**

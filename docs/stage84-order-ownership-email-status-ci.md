# Stage84 — source-real checkout ownership, email and status triggers

**NOT RELEASE-READY. Production unchanged. No paid staging. This stage requires no paid staging environment.** All work is Draft PR #149.

Current Production has **8 enabled order triggers**. Stage83 already added the three real product stock triggers to the disposable local Auth/PostgREST checkout. Stage84 adds three safe, source-verbatim original order trigger FUNCTION bodies and their original trigger DDL:
- \`private.bind_order_to_auth_user()\` from 20261108215548, binding an authenticated order's immutable user UUID to auth.uid(), and nullifying guest ownership;
- \`private.require_valid_guest_checkout_email()\` from 20261107150014, rejecting malformed or missing guest email at the database boundary;
- \`private.set_order_status_changed_at()\` from 20261103155226, storing an accurate status transition timestamp.

The extractor uses uniquely identified source statements and refuses missing or duplicate markers. Functions are private and their EXECUTE privileges are revoked for PUBLIC/anon/authenticated to match the original intent; normal checkout triggers run with the actual caller claims. No extra fake SQL function implementation is introduced.

All three source functions are verified in the disposable local PostgreSQL runtime against read-only effective live Production pg_get_functiondef MD5 digests recorded on 2026-11-23:
- owner \`05ce287ad79d503487ecb04de243ff7d\`;
- guest email \`8054195435f9246d9be2a04aadb27804\`;
- status timestamp \`760ff7476bfcfcf7007a07df49f6e262\`.

The Stage80 signed GoTrue/PostgREST checkout uses synthetic valid guest emails, and a verified signed customer order. After cancellation it checks that the user's immutable auth UUID, guest-null owner and status timestamp survive the real versioned stock/coupon/variant/financial transaction. Stage84 then rejects both omitted and malformed guest emails with SQLSTATE 22023, with checks that no extra orders, stock changes or inventory ledger movements remain after the rejected transaction. This improves local source realism without any user data copying or Production DML.

**Limitations:** 3 of **8 Production order triggers** are now exercised directly in this new stage, while the remaining order-status transitions, dispatch guard, product publication and order notifications still require separate source-parity and full-schema validation. Stage78/79/80/83/84 remains a synthetic database structure and not a **full-schema** Prod clone. Existing 11 historical executable SQL divergences are not resolved by these tests.

Release still follows **Phase A** redaction and additive RPCs, reviewed READY frontend, then **Phase B** post-frontend finance snapshot revocation only after existing tabs are accounted for. No blind historical replay. **Production unchanged**, no live DDL/DML, PR merge, Production publish or paid staging.

# Secure quick login & profile avatar rollout

- Stage 01: native password-manager autofill and opt-in credential save when supported; no application password storage. Safari/iOS controls its own save prompt.
- Stage 02: verify locked Supabase JS version, supported Auth passkey feature/configuration and relying-party origin; keep experimental passkeys disabled until an isolated test verifies actual Auth-issued sessions. Device Face ID/PIN are authenticator methods, never local application login checks. Maintain password recovery and existing admin MFA.
- Stage 03: passkey enrollment, sign-in, revocation and recovery testing; no silent enrollment, no raw biometrics or PIN collection.
- Stage 04: selectable 3D-style profile avatar catalog, compact mobile layout and account-scoped persistence with ownership enforcement. No public disclosure of profile identity.
- Stage 05: signed-in, cross-device and responsive verification; one draft PR, no Production changes until approval.

References: https://supabase.com/docs/guides/auth/passkeys and https://developer.mozilla.org/en-US/docs/Web/Security/Authentication/Passkeys.

## Stage 02 implementation
Locked Supabase JS is already 2.109.0 (minimum 2.105.0); no dependency upgrade needed. The native SDK ceremony is wired behind `VITE_CUSTOMER_PASSKEY_ENABLED=true` and the exact HTTPS production origin. Do not set this flag until the Auth server Passkeys toggle and RP ID `geostore.vercel.app`, RP origin `https://geostore.vercel.app`, display name GEOSTORE are verified and an isolated real ceremony is tested. No Production Auth configuration was modified. Browser chooses Face ID, fingerprint, device PIN or security key; the app never handles a PIN. Existing admin permission and MFA logic is unchanged; enrollment is restricted to non-admin customer UI. Next: credential management, secure recovery and real-browser verification. The feature is experimental.

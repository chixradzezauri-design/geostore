-- Disposable DB only, after the atomic candidate contract.
\set ON_ERROR_STOP on
CREATE ROLE advanced_http_authenticator NOINHERIT LOGIN PASSWORD 'advanced-http-fixture-only';
GRANT anon,authenticated TO advanced_http_authenticator;
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $claims$
 SELECT (nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid;
$claims$;
CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $claims$
 SELECT coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb,'{}'::jsonb);
$claims$;

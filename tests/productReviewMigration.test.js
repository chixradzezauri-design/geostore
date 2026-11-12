import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const migrationPath = new URL("../supabase/migrations/20261110194917_product_reviews.sql", import.meta.url);
const migration = await readFile(migrationPath, "utf8");

const count = (source, pattern) => [...source.matchAll(pattern)].length;

test("product review rate-limit SQL has one complete function definition", () => {
  assert.equal(count(migration, /CREATE OR REPLACE FUNCTION private\.consume_product_review_rate_limit\(/g), 1);
  assert.match(migration, /p_key_hash !~ '\^\[0-9a-f\]\{64\}\$'/);
  assert.match(migration, /p_max_attempts IS NULL/);
  assert.match(migration, /p_window_seconds IS NULL/);
  assert.match(migration, /RETURN v_attempt_count <= p_max_attempts;/);
  assert.match(migration, /END;\s*\$function\$;/);
});

test("product review rate-limit SQL has no orphaned duplicate function tail", () => {
  assert.doesNotMatch(migration, /^\s+OR p_max_attempts IS NULL OR p_max_attempts NOT BETWEEN/m);
  assert.equal(count(migration, /CREATE OR REPLACE FUNCTION public\.consume_product_review_rate_limit\(/g), 1);
});

test("private review image bucket is declared once and remains private", () => {
  assert.equal(count(migration, /INSERT INTO storage\.buckets/g), 1);
  assert.match(migration, /'product-review-images',\s*'product-review-images',\s*false,\s*1048576/s);
});

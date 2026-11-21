import test from 'node:test';
import assert from 'node:assert/strict';
import { invalidateAdminSessionOperations } from '../src/utils/adminSessionLifecycle.js';

const makeRefs = () => ({
  adminSessionActiveRef: { current: true },
  adminSessionVersion: { current: 8 },
  expenseMutationVersionRef: { current: 3 },
  expenseMutationInFlightRef: { current: true },
  expenseFetchRequestRef: { current: 5 },
  expenseFetchInFlightRef: { current: true },
  expenseExportInFlightRef: { current: true },
  aiResponseVersionRef: { current: 2 },
  aiResponseInFlightRef: { current: true }
});

test('principal-keyed panel unmount invalidates previously captured async session guards', () => {
  const refs = makeRefs();
  const capturedSessionVersion = refs.adminSessionVersion.current;
  const isCurrent = () => refs.adminSessionActiveRef.current &&
    refs.adminSessionVersion.current === capturedSessionVersion;
  assert.equal(isCurrent(), true);
  invalidateAdminSessionOperations(refs);
  assert.equal(isCurrent(), false);
  assert.equal(refs.adminSessionActiveRef.current, false);
  assert.equal(refs.adminSessionVersion.current, capturedSessionVersion + 1);
});

test('unmount invalidates pending expense read, write, export and delayed private AI callbacks', () => {
  const refs = makeRefs();
  const capturedMutationVersion = refs.expenseMutationVersionRef.current;
  const capturedFetchId = refs.expenseFetchRequestRef.current;
  const capturedAiVersion = refs.aiResponseVersionRef.current;
  invalidateAdminSessionOperations(refs);
  assert.equal(refs.expenseMutationVersionRef.current, capturedMutationVersion + 1);
  assert.equal(refs.expenseMutationInFlightRef.current, false);
  assert.equal(refs.expenseFetchRequestRef.current, capturedFetchId + 1);
  assert.equal(refs.expenseFetchInFlightRef.current, false);
  assert.equal(refs.expenseExportInFlightRef.current, false);
  assert.equal(refs.aiResponseVersionRef.current, capturedAiVersion + 1);
  assert.equal(refs.aiResponseInFlightRef.current, false);
});

test('React strict-mode cleanup and subsequent mount can safely get a fresh operation generation', () => {
  const refs = makeRefs();
  const firstSession = refs.adminSessionVersion.current;
  invalidateAdminSessionOperations(refs);
  refs.adminSessionActiveRef.current = true;
  refs.adminSessionVersion.current += 1;
  const secondSession = refs.adminSessionVersion.current;
  assert.equal(secondSession > firstSession, true);
  assert.equal(refs.adminSessionActiveRef.current, true);
  invalidateAdminSessionOperations(refs);
  assert.equal(refs.adminSessionActiveRef.current, false);
  assert.equal(refs.adminSessionVersion.current > secondSession, true);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchAllProductReviews } from '../src/utils/productReviewsAdminApi.js';

function createClient(pages, options = {}) {
  const calls = [];
  const client = {
    from(table) {
      assert.equal(table, 'product_reviews');
      const builder = {
        select(columns) {
          calls.push({ method: 'select', columns });
          return builder;
        },
        order(column, config) {
          calls.push({ method: 'order', column, config });
          return builder;
        },
        range(from, to) {
          calls.push({ method: 'range', from, to });
          const next = pages.shift();
          if (next instanceof Error) return Promise.resolve({ data: null, error: next });
          return Promise.resolve({ data: next ?? [], error: null });
        }
      };
      return builder;
    }
  };
  return { client, calls };
}

test('loads every review page and uses stable ordering', async () => {
  const first = Array.from({ length: 2 }, (_, i) => ({ id: i + 1 }));
  const second = [{ id: 3 }, { id: 4 }];
  const { client, calls } = createClient([first, second, []]);
  const rows = await fetchAllProductReviews(client, { pageSize: 2 });

  assert.deepEqual(rows, [...first, ...second]);
  assert.deepEqual(calls.filter(call => call.method === 'range'), [
    { method: 'range', from: 0, to: 1 },
    { method: 'range', from: 2, to: 3 },
    { method: 'range', from: 4, to: 5 }
  ]);
  assert.deepEqual(calls.filter(call => call.method === 'order').map(call => call.column), ['created_at', 'id', 'created_at', 'id', 'created_at', 'id']);
});

test('returns an empty list when the table has no reviews', async () => {
  const { client, calls } = createClient([[]]);
  assert.deepEqual(await fetchAllProductReviews(client), []);
  assert.deepEqual(calls.filter(call => call.method === 'range'), [{ method: 'range', from: 0, to: 499 }]);
});

test('propagates database errors instead of presenting a partial queue as complete', async () => {
  const failure = new Error('database unavailable');
  const { client } = createClient([[{ id: 1 }], failure]);
  await assert.rejects(fetchAllProductReviews(client, { pageSize: 1 }), /database unavailable/);
});

test('rejects invalid page sizes before querying', async () => {
  const { client, calls } = createClient([]);
  await assert.rejects(fetchAllProductReviews(client, { pageSize: 0 }), RangeError);
  await assert.rejects(fetchAllProductReviews(client, { pageSize: 1001 }), RangeError);
  assert.equal(calls.length, 0);
});


test('accepts an admin review request only within its original authenticated session', async () => {
  const { isCurrentAdminReviewRequest } = await import('../src/utils/productReviewsAdminApi.js');
  assert.equal(isCurrentAdminReviewRequest(true, 4, 4), true);
  assert.equal(isCurrentAdminReviewRequest(false, 4, 4), false);
  assert.equal(isCurrentAdminReviewRequest(true, 4, 5), false);
  assert.equal(isCurrentAdminReviewRequest(true, 4, 4.5), false);
});

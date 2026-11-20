import test from 'node:test';
import assert from 'node:assert/strict';
import { isConfirmedExpenseInsert, isConfirmedExpenseDelete } from '../src/utils/expenseMutationSafety.js';

const expense = {
  id: 'exp-safe-123',
  category: 'რეკლამა & მარკეტინგი',
  description: 'Facebook Ads',
  date: '2026-11-20',
  amount: 125.75
};

test('expense creation is confirmed only by exactly one matching persisted row', () => {
  assert.equal(isConfirmedExpenseInsert([{ ...expense }], expense), true);
  assert.equal(isConfirmedExpenseInsert([{ ...expense, amount: '125.75' }], expense), true);
  assert.equal(isConfirmedExpenseInsert([{ ...expense }, { ...expense }], expense), false);
  assert.equal(isConfirmedExpenseInsert([], expense), false);
  assert.equal(isConfirmedExpenseInsert(null, expense), false);
  assert.equal(isConfirmedExpenseInsert({ ...expense }, expense), false);
  assert.equal(isConfirmedExpenseInsert([{ ...expense, id: 'different-id' }], expense), false);
  assert.equal(isConfirmedExpenseInsert([{ ...expense, date: '2026-11-19' }], expense), false);
  assert.equal(isConfirmedExpenseInsert([{ ...expense, category: 'სხვა' }], expense), false);
  assert.equal(isConfirmedExpenseInsert([{ ...expense, description: 'Other expense' }], expense), false);
  assert.equal(isConfirmedExpenseInsert([{ ...expense, amount: '125.76' }], expense), false);
  assert.equal(isConfirmedExpenseInsert([{ ...expense, amount: 'not-a-number' }], expense), false);
  assert.equal(isConfirmedExpenseInsert([null], expense), false);
  assert.equal(isConfirmedExpenseInsert([[]], expense), false);
  assert.equal(isConfirmedExpenseInsert([{ id: expense.id }], expense), false);
});

test('expense deletion requires exactly one returned row with the requested id', () => {
  assert.equal(isConfirmedExpenseDelete([{ id: expense.id }], expense.id), true);
  assert.equal(isConfirmedExpenseDelete([{ id: 'another' }], expense.id), false);
  assert.equal(isConfirmedExpenseDelete([], expense.id), false);
  assert.equal(isConfirmedExpenseDelete([{}, {}], expense.id), false);
  assert.equal(isConfirmedExpenseDelete(null, expense.id), false);
  assert.equal(isConfirmedExpenseDelete({ id: expense.id }, expense.id), false);
  assert.equal(isConfirmedExpenseDelete([null], expense.id), false);
  assert.equal(isConfirmedExpenseDelete([{ id: expense.id }], ''), false);
});

import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { getDailyVentiQuote, VENTI_QUOTES } from '../src/lib/venti-quotes';

test('daily quote survives refresh and uses the local midnight boundary', () => {
  const values = new Map<string, string>();
  Object.assign(globalThis, { localStorage: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
  } });
  const random = mock.method(Math, 'random', () => 0);
  try {
    const today = getDailyVentiQuote(new Date(2026, 10, 6, 23, 59));
    assert.ok(VENTI_QUOTES.includes(today));
    // A persisted choice from another page/module takes precedence over memory.
    const key = [...values.keys()][0];
    values.set(key, JSON.stringify({ date: '2026-11-06', id: VENTI_QUOTES[2].id }));
    assert.equal(getDailyVentiQuote(new Date(2026, 10, 6, 23, 59)).id, VENTI_QUOTES[2].id);
    assert.equal(random.mock.callCount(), 1);

    const tomorrow = getDailyVentiQuote(new Date(2026, 10, 7, 0, 0));
    assert.notEqual(tomorrow.id, VENTI_QUOTES[2].id);
    assert.equal(JSON.parse(values.get(key)!).date, '2026-11-07');
    assert.equal(getDailyVentiQuote(new Date(2026, 10, 7, 22, 0)).id, tomorrow.id);
    assert.equal(random.mock.callCount(), 2);
  } finally {
    random.mock.restore();
  }
});

test('blocked storage keeps a stable session quote and does not stop learning', () => {
  Object.assign(globalThis, { localStorage: {
    getItem: () => { throw new Error('Storage disabled'); },
    setItem: () => { throw new Error('Storage disabled'); },
  } });
  const quote = getDailyVentiQuote(new Date(2026, 10, 8));
  assert.ok(VENTI_QUOTES.includes(quote));
  assert.equal(getDailyVentiQuote(new Date(2026, 10, 8, 18)).id, quote.id);
});

test('a failed write cannot let yesterday’s persisted quote overwrite today’s session choice', () => {
  Object.assign(globalThis, { localStorage: {
    getItem: () => JSON.stringify({ date: '2026-11-08', id: VENTI_QUOTES[0].id }),
    setItem: () => { throw new Error('Quota exceeded'); },
  } });
  const random = mock.method(Math, 'random', () => 0.8);
  try {
    const quote = getDailyVentiQuote(new Date(2026, 10, 9));
    assert.equal(getDailyVentiQuote(new Date(2026, 10, 9, 12)).id, quote.id);
    assert.equal(random.mock.callCount(), 1);
  } finally {
    random.mock.restore();
  }
});

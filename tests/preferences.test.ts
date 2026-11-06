import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { scopedStorage } from '../src/lib/platform';

const values = new Map<string,string>();
const storage = {
  getItem: (key: string) => values.get(key) ?? null,
  setItem: (key: string, value: string) => { values.set(key, value); },
};
Object.assign(globalThis, { localStorage: storage });

test('the standalone app keeps the old Pages preference namespace', async () => {
  const legacyKey = `__miaoda_${'__global__'}__:teyvat_vocab_prefs`;
  values.set(legacyKey, JSON.stringify({ dailyGoal: 30, favoriteWordIds: ['abandon'] }));
  const { getPrefs, updatePrefs } = await import('../src/lib/prefs');
  assert.equal(getPrefs().dailyGoal, 30);
  assert.deepEqual(getPrefs().favoriteWordIds, ['abandon']);
  updatePrefs({ dailyGoal: 20 });
  assert.equal(JSON.parse(values.get(legacyKey)!).dailyGoal, 20);
  assert.equal(scopedStorage.getItem('teyvat_vocab_prefs'), values.get(legacyKey));

  const failure = mock.method(storage, 'setItem', () => { throw new DOMException('Full', 'QuotaExceededError'); });
  const log = mock.method(console, 'error', () => {});
  assert.throws(() => updatePrefs({ dailyGoal: 50 }), /保存失败/);
  assert.equal(getPrefs().dailyGoal, 20);
  assert.equal(JSON.parse(values.get(legacyKey)!).dailyGoal, 20);
  failure.mock.restore();
  log.mock.restore();
});

import assert from 'node:assert/strict';
import { afterEach, beforeEach, mock, test } from 'node:test';
import { registerHooks } from 'node:module';
import 'fake-indexeddb/auto';
import type { DailyQueue, Word, WordState } from '../src/lib/db';

// The app's storage adapter and asset URL are browser infrastructure. Keep the
// actual engine, preferences and IndexedDB transactions in these regression tests.
const storage = new Map<string, string>();
Object.assign(globalThis, {
  localStorage: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => { storage.set(key, value); },
    removeItem: (key: string) => { storage.delete(key); },
  },
});
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === '@lark-apaas/client-toolkit-lite') {
      return {
        url: `data:text/javascript,${encodeURIComponent('export const scopedStorage=globalThis.localStorage; export const logger={info(){},warn(){},error(){}};')}`,
        shortCircuit: true,
      };
    }
    if (specifier === './assets' && context.parentURL?.endsWith('/lexicon.ts')) {
      return { url: 'data:text/javascript,export const resolveAppUrl=(path)=>path;', shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});

const db = await import('../src/lib/db');
const engine = await import('../src/lib/study-engine');
const prefs = await import('../src/lib/prefs');
const FIXED_NOW = new Date(2026, 10, 6, 15, 0).getTime();
const words: Word[] = Array.from({ length: 12 }, (_, i) => ({
  id: String(i + 1).padStart(3, '0'), word: `word-${i + 1}`, phonetic: '', definitionRaw: '测试词', examples: [],
}));

async function allRecords(store: string) {
  return db.runTransaction([store], 'readonly', (tx) => db.requestResult(tx.objectStore(store).getAll()));
}

function learned(wordId: string, nextReview = FIXED_NOW - 1, status: WordState['status'] = 'learning'): WordState {
  return { wordId, status, level: status === 'mastered' ? 6 : 1, nextReview, lastReviewed: FIXED_NOW - 86400000, correctCount: 1, wrongCount: 0 };
}

beforeEach(async () => {
  mock.timers.enable({ apis: ['Date'], now: FIXED_NOW });
  const connection = await db.openDB();
  await db.runTransaction([...connection.objectStoreNames], 'readwrite', async (tx) => {
    for (const name of connection.objectStoreNames) tx.objectStore(name).clear();
  });
  prefs.updatePrefs({ dailyGoal: 5 });
  await db.bulkPutWords(words);
});

afterEach(() => {
  mock.restoreAll();
  mock.timers.reset();
});

test('every rating can be undone without dropping queued words or leaving history', async () => {
  const original = await engine.getOrCreateDailyQueue();
  const originalState = await db.getWordState('001');
  const originalStat = await db.getDailyStat(db.getDateKey());
  for (const rating of ['known', 'fuzzy', 'unknown'] as const) {
    await engine.rateCurrentWord(rating, 'all', '001');
    assert.equal((await allRecords('ratingHistory')).length, 1);
    assert.deepEqual(await engine.undoLastRating(), original);
    assert.deepEqual(await db.getWordState('001'), originalState);
    assert.deepEqual(await db.getDailyStat(db.getDateKey()), originalStat);
    assert.equal((await allRecords('ratingHistory')).length, 0);
    assert.equal((await allRecords('undoStack')).length, 0);
  }
});

test('review mode leaves new words pending and undo restores their original order', async () => {
  await db.putWordState(learned('001'));
  await db.putWordState(learned('002', FIXED_NOW - 1, 'mastered'));
  const original = await engine.getOrCreateDailyQueue();
  assert.equal((await engine.getCurrentWord())?.word.id, '003');
  assert.equal((await engine.getCurrentWord('review'))?.word.id, '001');
  await engine.rateCurrentWord('known', 'review', '001');
  assert.deepEqual(await engine.undoLastRating(), original);
  await engine.rateCurrentWord('unknown', 'review', '001');
  const second = await engine.getCurrentWord('review');
  assert.equal(second?.word.id, '002');
  assert.equal(second?.index, 1);
  assert.equal(second?.total, 2);
  await engine.rateCurrentWord('known', 'review', '002');
  assert.equal(await engine.getCurrentWord('review'), null);
  assert.equal((await engine.getCurrentWord())?.word.id, '003');
  const stats = await engine.getHomeStats();
  assert.equal(stats.today.newCompleted, 0);
  assert.equal(stats.today.reviewed, 2);
  assert.equal(stats.today.reviewDue, 0);
  assert.equal(stats.today.remaining, 5);
  assert.equal(stats.totalLearned, 2);
  assert.equal(stats.studyDays, 1);
});

test('changing the goal reshapes only pending new words on the same day', async () => {
  await engine.getOrCreateDailyQueue();
  await engine.rateCurrentWord('known', 'all', '001');
  await engine.rateCurrentWord('known', 'all', '002');
  prefs.updatePrefs({ dailyGoal: 8 });
  let queue = await engine.getOrCreateDailyQueue();
  assert.equal(queue.queue.length, 8);
  assert.equal(queue.newCompleted, 2);
  assert.equal(queue.currentIndex, 2);
  for (const id of ['003', '004', '005', '006']) await engine.rateCurrentWord('known', 'all', id);
  prefs.updatePrefs({ dailyGoal: 5 });
  queue = await engine.getOrCreateDailyQueue();
  assert.equal(queue.queue.length, 6);
  assert.equal(queue.newCompleted, 6);
  assert.equal(queue.currentIndex, 6);
  assert.equal(await engine.getCurrentWord(), null);
});

test('reviews become available when due, including mastered words and a ten-minute retry', async () => {
  await db.putWordState(learned('001', FIXED_NOW + 60000, 'mastered'));
  await engine.getOrCreateDailyQueue();
  assert.equal(await engine.getCurrentWord('review'), null);
  mock.timers.tick(60001);
  assert.equal((await engine.getCurrentWord('review'))?.word.id, '001');
  await engine.rateCurrentWord('unknown', 'review', '001');
  assert.equal((await db.getWordState('001'))?.status, 'learning');
  assert.equal(await engine.getCurrentWord('review'), null);
  mock.timers.tick(10 * 60000);
  assert.equal((await engine.getCurrentWord('review'))?.word.id, '001');
  assert.equal((await engine.getHomeStats()).today.reviewDue, 1);
});

test('double taps and stale cards cannot rate an unseen next word', async () => {
  await engine.getCurrentWord();
  const results = await Promise.allSettled([
    engine.rateCurrentWord('known', 'all', '001'),
    engine.rateCurrentWord('known', 'all', '001'),
  ]);
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  await assert.rejects(engine.rateCurrentWord('known', 'all', '001'), /学习进度已更新/);
  assert.equal((await engine.getHomeStats()).today.newCompleted, 1);
  assert.equal((await db.getWordState('002'))?.status, 'new');
  assert.equal((await allRecords('ratingHistory')).length, 1);
});

test('a late write failure rolls back word state, queue, stats and rating history together', async () => {
  const original = await engine.getOrCreateDailyQueue();
  const originalState = await db.getWordState('001');
  const originalAdd = IDBObjectStore.prototype.add;
  const failure = mock.method(IDBObjectStore.prototype, 'add', function (this: IDBObjectStore, value: unknown, key?: IDBValidKey) {
    if (this.name === 'undoStack') throw new Error('simulated write failure');
    return originalAdd.call(this, value, key);
  });
  await assert.rejects(engine.rateCurrentWord('known', 'all', '001'), /simulated write failure/);
  failure.mock.restore();
  assert.deepEqual(await db.getDailyQueue(db.getDateKey()), original);
  assert.deepEqual(await db.getWordState('001'), originalState);
  assert.equal((await db.getDailyStat(db.getDateKey()))?.newLearned, 0);
  assert.equal((await allRecords('ratingHistory')).length, 0);
  await engine.rateCurrentWord('known', 'all', '001');
  assert.equal((await engine.getHomeStats()).today.newCompleted, 1);
});

test('v1 undo entries remain usable and do not truncate the last pending word', async () => {
  const original = await engine.getOrCreateDailyQueue();
  const originalState = (await db.getWordState('001'))!;
  const progressed: DailyQueue = { ...original, currentIndex: 1, completed: 1, newCompleted: 1 };
  await db.putDailyQueue(progressed);
  await db.putWordState(learned('001', FIXED_NOW + 86400000));
  await db.pushUndoEntry({ wordId: '001', prevWordState: originalState, prevQueueIndex: 0, prevCompleted: 0, prevNewCompleted: 0, prevReviewCompleted: 0, rating: 'known', timestamp: FIXED_NOW, wasFirstRating: true });
  await db.addRatingRecord({ wordId: '001', rating: 'known', timestamp: FIXED_NOW, date: db.getDateKey(), queueType: 'new' });
  assert.deepEqual(await engine.undoLastRating(), original);
  assert.equal((await allRecords('ratingHistory')).length, 0);
  assert.equal((await db.openDB()).version, 1);
});

test('a failed lexicon fetch can be retried in the same page session', async () => {
  let attempts = 0;
  mock.method(globalThis, 'fetch', async () => {
    attempts++;
    if (attempts === 1) throw new Error('offline');
    return new Response(JSON.stringify({ meta: { wordCount: words.length }, words }));
  });
  const { loadLexicon } = await import('../src/lib/lexicon');
  await assert.rejects(loadLexicon(), /词书数据加载失败/);
  await loadLexicon();
  assert.equal(attempts, 2);
  assert.equal(await db.getWordsCount(), words.length);
});

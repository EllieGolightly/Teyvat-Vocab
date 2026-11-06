import { describe, test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_THEME_ID, THEME_IDS, THEMES, getTheme, type ThemeId } from '../src/lib/themes';
import { REGION_QUOTES } from '../src/lib/region-quotes';
import { getDailyRegionQuote } from '../src/lib/daily-region-quotes';
import { VENTI_QUOTES } from '../src/lib/venti-quotes';

function installStorage(t: TestContext, storage: Pick<Storage, 'getItem' | 'setItem'>) {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
  t.after(() => {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  });
}

function memoryStorage(t: TestContext) {
  const values = new Map<string, string>();
  installStorage(t, {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value); },
  });
  return values;
}

function quotesFor(id: ThemeId) {
  return id === 'mondstadt' ? VENTI_QUOTES : REGION_QUOTES[id];
}

// Storage and Math.random are process globals, so keep these cases sequential.
describe('regional themes and daily quotes', { concurrency: false }, () => {
  test('all eight themes resolve, and a missing or obsolete preference falls back safely', () => {
    assert.equal(THEMES.length, 8);
    assert.deepEqual(new Set(THEMES.map(theme => theme.id)), new Set(THEME_IDS));
    for (const id of THEME_IDS) assert.equal(getTheme(id).id, id);
    for (const invalid of [undefined, '', 'retired-theme', '__proto__']) {
      assert.equal(getTheme(invalid).id, DEFAULT_THEME_ID);
    }
  });

  test('every theme has attributable quotes with globally unique identities', () => {
    const ids = new Set<string>();
    for (const id of THEME_IDS) {
      const quotes = quotesFor(id);
      assert.ok(quotes?.length > 1, `${id} needs a pool that can avoid yesterday's quote`);
      for (const quote of quotes) {
        assert.ok(quote.id.trim());
        assert.ok(!ids.has(quote.id), `duplicate quote identity: ${quote.id}`);
        ids.add(quote.id);
        assert.ok(quote.text.trim(), `${quote.id} has no text`);
        assert.ok(quote.source.trim(), `${quote.id} has no attribution`);
        const url = new URL(quote.sourceUrl);
        assert.equal(url.protocol, 'https:');
        assert.ok(url.hostname && url.pathname !== '/', `${quote.id} needs a source page`);
      }
    }
  });

  test('switching between regions preserves each region’s daily selection', t => {
    memoryStorage(t);
    let randomValue = 0.15;
    t.mock.method(Math, 'random', () => randomValue);
    const morning = new Date(2030, 2, 10, 9);
    const evening = new Date(2030, 2, 10, 23, 59);
    const selected = new Map(THEME_IDS.map(id => {
      const quote = getDailyRegionQuote(id, morning);
      assert.ok(quotesFor(id).some(candidate => candidate.id === quote.id));
      return [id, quote.id];
    }));

    randomValue = 0.95;
    for (const id of [...THEME_IDS].reverse()) {
      assert.equal(getDailyRegionQuote(id, evening).id, selected.get(id));
    }
  });

  test('the local midnight boundary gives every region a different, stable quote', t => {
    memoryStorage(t);
    t.mock.method(Math, 'random', () => 0);
    const before = new Date(2030, 3, 12, 23, 59);
    const midnight = new Date(2030, 3, 13, 0, 0);
    const later = new Date(2030, 3, 13, 18);
    for (const id of THEME_IDS) {
      const yesterday = getDailyRegionQuote(id, before);
      const today = getDailyRegionQuote(id, midnight);
      assert.notEqual(today.id, yesterday.id, `${id} repeated yesterday's quote`);
      assert.equal(getDailyRegionQuote(id, later).id, today.id);
    }
  });

  test('unavailable storage still allows stable daily quotes across theme switches', t => {
    installStorage(t, {
      getItem: () => { throw new Error('Storage is blocked'); },
      setItem: () => { throw new Error('Storage is blocked'); },
    });
    let randomValue = 0.25;
    t.mock.method(Math, 'random', () => randomValue);
    const day = new Date(2030, 4, 15, 8);
    const selected = new Map(THEME_IDS.map(id => [id, getDailyRegionQuote(id, day).id]));
    randomValue = 0.75;
    for (const id of [...THEME_IDS].reverse()) {
      assert.equal(getDailyRegionQuote(id, new Date(2030, 4, 15, 20)).id, selected.get(id));
    }
  });

  test('a failed write does not let yesterday’s persisted quote replace today’s session choice', t => {
    const values = new Map<string, string>();
    let writable = true;
    installStorage(t, {
      getItem: key => values.get(key) ?? null,
      setItem: (key, value) => {
        if (!writable) throw new Error('Quota exceeded');
        values.set(key, value);
      },
    });
    t.mock.method(Math, 'random', () => 0);
    const yesterday = getDailyRegionQuote('liyue', new Date(2030, 5, 20));
    writable = false;
    const today = getDailyRegionQuote('liyue', new Date(2030, 5, 21, 8));
    assert.notEqual(today.id, yesterday.id);
    getDailyRegionQuote('inazuma', new Date(2030, 5, 21, 9));
    assert.equal(getDailyRegionQuote('liyue', new Date(2030, 5, 21, 20)).id, today.id);
  });
});

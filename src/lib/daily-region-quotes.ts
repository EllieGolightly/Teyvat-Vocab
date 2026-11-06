import { getDateKey } from './db';
import { scopedStorage } from './platform';
import { REGION_QUOTES, type RegionQuote } from './region-quotes';
import { getDailyVentiQuote } from './venti-quotes';
import { getTheme, type ThemeId } from './themes';

const selections = new Map<ThemeId, { date: string; id: string }>();

/** Each region keeps its own daily choice, including when switching away/back. */
export function getDailyRegionQuote(themeId: ThemeId, now = new Date()): RegionQuote {
  const id = getTheme(themeId).id;
  if (id === 'mondstadt') return getDailyVentiQuote(now);
  const quotes = REGION_QUOTES[id];
  const date = getDateKey(now);
  const key = `teyvat_daily_quote_${id}`;
  let previous = selections.get(id);
  try {
    const raw = scopedStorage.getItem(key);
    const saved = raw ? JSON.parse(raw) : null;
    if (saved && typeof saved.date === 'string' && quotes.some(q => q.id === saved.id)
      && (saved.date === date || previous?.date !== date)) previous = saved;
  } catch { /* Learning remains available when storage is restricted. */ }
  const existing = previous?.date === date && quotes.find(q => q.id === previous.id);
  if (existing) {
    selections.set(id, previous!);
    return existing;
  }
  const candidates = quotes.filter(q => q.id !== previous?.id);
  const quote = candidates[Math.floor(Math.random() * candidates.length)];
  const selected = { date, id: quote.id };
  selections.set(id, selected);
  try { scopedStorage.setItem(key, JSON.stringify(selected)); } catch { /* Session fallback. */ }
  return quote;
}

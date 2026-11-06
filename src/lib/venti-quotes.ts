import { getDateKey } from './db';
import { scopedStorage } from './platform';

const SOURCE_URL = 'https://wiki.biligame.com/ys/温迪语音';

// Short, unmodified excerpts from the game's Chinese character voice-overs.
// Cross-checked against BWIKI on 2026-11-06; labels identify the original lines.
export const VENTI_QUOTES = [
  { id: 'poem', text: '动身吧，旅行者。', source: '闲聊·诗篇' },
  { id: 'wind', text: '难得呀，要不要去飞一飞？', source: '刮大风了…' },
  { id: 'song', text: '我想把你写进新歌里！', source: '关于我们·新歌' },
  { id: 'sit', text: '来，坐这边。', source: '突破的感受·转' },
].map((quote) => ({ ...quote, sourceUrl: SOURCE_URL }));

export type VentiQuote = (typeof VENTI_QUOTES)[number];
const STORAGE_KEY = 'teyvat_daily_venti_quote';
let memorySelection: { date: string; id: string } | undefined;

/** One random quote per local calendar day, shared across reloads and pages. */
export function getDailyVentiQuote(now = new Date()): VentiQuote {
  const date = getDateKey(now);
  let previous = memorySelection;
  try {
    const raw = scopedStorage.getItem(STORAGE_KEY);
    const saved = raw ? JSON.parse(raw) : null;
    if (saved && typeof saved.date === 'string' && VENTI_QUOTES.some((q) => q.id === saved.id)
      && (saved.date === date || previous?.date !== date)) {
      previous = saved;
    }
  } catch {
    // Quota/private-mode restrictions must not interrupt learning.
  }

  const existing = previous?.date === date && VENTI_QUOTES.find((q) => q.id === previous.id);
  if (existing) {
    memorySelection = previous;
    return existing;
  }

  const candidates = VENTI_QUOTES.filter((q) => q.id !== previous?.id);
  const quote = candidates[Math.floor(Math.random() * candidates.length)];
  memorySelection = { date, id: quote.id };
  try {
    scopedStorage.setItem(STORAGE_KEY, JSON.stringify(memorySelection));
  } catch {
    // Keep today's choice for this session when persistence is unavailable.
  }
  return quote;
}

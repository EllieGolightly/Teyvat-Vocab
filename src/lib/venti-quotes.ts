import { getDateKey } from './db';
import { scopedStorage } from './platform';

// Short Chinese excerpts, checked against the linked BWIKI transcripts on 2026-11-06.
// Nine story lines and one official greeting; source labels distinguish the latter
// and Venti's quotation of a Mondstadt saying. Keep each excerpt's original wording.
export const VENTI_QUOTES = [
  {
    id: 'story-seeds',
    text: '风带来故事的种子，时间使其发芽。',
    source: '活动剧情「翠庵酩酊疑闻」·温迪引用蒙德古话',
    page: '翠庵酩酊疑闻',
  },
  {
    id: 'journey-meaning',
    text: '当你重新踏上旅途之后，一定要记得旅途本身的意义。',
    source: '魔神任务「尾声的尾声」节选',
    page: '尾声的尾声',
  },
  {
    id: 'changing-wind',
    text: '但，风向是会转变的。终有一天，会吹向更有光亮的方向。',
    source: '魔神任务「为了青色的身影」节选',
    page: '为了青色的身影',
  },
  {
    id: 'windblume',
    text: '一切美好、值得被祝福的事物，都可以是「风之花」。',
    source: '活动剧情「风与花之梦」节选',
    page: '风与花之梦',
  },
  {
    id: 'gentle-wind',
    text: '放轻松，让风带着你前进。',
    source: '世界任务「时与风的故事」',
    page: '时与风的故事',
  },
  {
    id: 'storytellers',
    text: '书写故事的人和吟唱故事的人之间，似乎存在某种默契。',
    source: '传说任务「来自过去的预言」',
    page: '来自过去的预言',
  },
  {
    id: 'a-wish',
    text: '去实现那个早就该实现的愿望。',
    source: '传说任务「命运的题解」',
    page: '命运的题解',
  },
  {
    id: 'wind-remembers',
    text: '去吧，我的朋友。这里发生的诗篇，风会一一记下。',
    source: '活动剧情「自往昔飘起的酒香」·摘星崖对话',
    page: '自往昔飘起的酒香',
  },
  {
    id: 'understanding-friends',
    text: '不过，朋友之间，也许就是要心知肚明才好。',
    source: '传说任务「若你困于无风之地」',
    page: '若你困于无风之地',
  },
  {
    id: 'breeze-and-fragrance',
    text: '无论未来你去往何方，微风与芬芳都会伴你左右。',
    source: '官方贺图「2026 白色情人节·温迪」节选',
    page: 'Venti',
  },
].map(({ page, ...quote }) => ({ ...quote, sourceUrl: `https://wiki.biligame.com/ys/${page}` }));

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

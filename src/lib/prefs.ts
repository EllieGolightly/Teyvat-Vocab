// Preferences stored in localStorage (scoped by appId)
import { scopedStorage } from '@lark-apaas/client-toolkit-lite';
import { logger } from '@lark-apaas/client-toolkit-lite';

const PREFS_KEY = 'teyvat_vocab_prefs';

export interface WidgetLayoutItem {
  id: string;
  type: WidgetType;
  col: number; // 0-indexed
  row: number; // 0-indexed
  colSpan: number; // 1 or 2
  rowSpan: number; // 1 or 2
}

export type WidgetType =
  | 'today-plan'
  | 'weekly-stats'
  | 'word-of-day'
  | 'venti-quote'
  | 'book-illustration'
  | 'streak'
  | 'favorites'
  | 'achievements'
  | 'settings';

export interface StickerPosition {
  id: string;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  zIndex: number;
}

export interface AppPrefs {
  dailyGoal: number;
  themeColor: string; // primary color override (optional)
  wallpaper: string; // url or 'default'
  widgets: WidgetLayoutItem[];
  stickers: StickerPosition[];
  gridCols: number;
}

const DEFAULT_PREFS: AppPrefs = {
  dailyGoal: 20,
  themeColor: '',
  wallpaper: 'default',
  gridCols: 4,
  widgets: [
    { id: 'w1', type: 'today-plan', col: 0, row: 0, colSpan: 2, rowSpan: 2 },
    { id: 'w2', type: 'venti-quote', col: 2, row: 0, colSpan: 2, rowSpan: 1 },
    { id: 'w3', type: 'streak', col: 2, row: 1, colSpan: 1, rowSpan: 1 },
    { id: 'w4', type: 'weekly-stats', col: 3, row: 1, colSpan: 1, rowSpan: 1 },
    { id: 'w5', type: 'word-of-day', col: 0, row: 2, colSpan: 2, rowSpan: 1 },
    { id: 'w6', type: 'book-illustration', col: 2, row: 2, colSpan: 2, rowSpan: 2 },
    { id: 'w7', type: 'favorites', col: 0, row: 3, colSpan: 1, rowSpan: 1 },
    { id: 'w8', type: 'achievements', col: 1, row: 3, colSpan: 1, rowSpan: 1 },
  ],
  stickers: [
    { id: 'paimon-traveler', x: 70, y: 78, zIndex: 10 },
  ],
};

let cachedPrefs: AppPrefs | null = null;

export function getPrefs(): AppPrefs {
  if (cachedPrefs) return cachedPrefs;

  try {
    const raw = scopedStorage.getItem(PREFS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      cachedPrefs = { ...DEFAULT_PREFS, ...parsed };
      return cachedPrefs;
    }
  } catch (err) {
    logger.warn('Failed to read prefs:', String(err));
  }

  cachedPrefs = { ...DEFAULT_PREFS };
  return cachedPrefs;
}

export function savePrefs(prefs: AppPrefs): void {
  cachedPrefs = prefs;
  try {
    scopedStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch (err) {
    logger.error('Failed to save prefs:', String(err));
  }
}

export function updatePrefs(patch: Partial<AppPrefs>): AppPrefs {
  const current = getPrefs();
  const next = { ...current, ...patch };
  savePrefs(next);
  return next;
}

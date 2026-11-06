// Preferences stored in localStorage (scoped by appId)
import { scopedStorage } from './platform';
import { logger } from './platform';

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

export const WIDGET_SIZES: Record<WidgetType, { colSpan: number; rowSpan: number }> = {
  'today-plan': { colSpan: 2, rowSpan: 2 },
  'weekly-stats': { colSpan: 1, rowSpan: 1 },
  'word-of-day': { colSpan: 2, rowSpan: 1 },
  'venti-quote': { colSpan: 2, rowSpan: 1 },
  'book-illustration': { colSpan: 2, rowSpan: 2 },
  streak: { colSpan: 1, rowSpan: 1 },
  favorites: { colSpan: 1, rowSpan: 1 },
  achievements: { colSpan: 1, rowSpan: 1 },
  settings: { colSpan: 1, rowSpan: 1 },
};

/** Repair layouts saved by the old resizable version and enforce one size per widget. */
export function normalizeWidgets(widgets: WidgetLayoutItem[]): WidgetLayoutItem[] {
  const placed: WidgetLayoutItem[] = [];
  const ordered = widgets
    .filter((widget) => Object.prototype.hasOwnProperty.call(WIDGET_SIZES, widget.type))
    .slice()
    .sort((a, b) => a.row - b.row || a.col - b.col);

  for (const widget of ordered) {
    const size = WIDGET_SIZES[widget.type];
    const desiredCol = Math.max(0, Math.min(4 - size.colSpan, widget.col));
    const desiredRow = Math.max(0, widget.row);
    let best: { col: number; row: number; distance: number } | null = null;

    for (let row = 0; row < 80; row += 1) {
      for (let col = 0; col <= 4 - size.colSpan; col += 1) {
        const collides = placed.some(
          (other) =>
            col < other.col + other.colSpan &&
            col + size.colSpan > other.col &&
            row < other.row + other.rowSpan &&
            row + size.rowSpan > other.row,
        );
        if (collides) continue;
        const distance = Math.abs(col - desiredCol) + Math.abs(row - desiredRow);
        if (!best || distance < best.distance) best = { col, row, distance };
      }
      if (best && best.distance === 0) break;
    }

    placed.push({
      ...widget,
      ...size,
      col: best?.col ?? 0,
      row: best?.row ?? placed.length * 2,
    });
  }
  return placed;
}

export interface StickerPosition {
  id: string;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  zIndex: number;
}

export interface AppPrefs {
  dailyGoal: number;
  favoriteWordIds?: string[];
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
      const merged = { ...DEFAULT_PREFS, ...parsed, gridCols: 4 };
      cachedPrefs = { ...merged, widgets: normalizeWidgets(merged.widgets) };
      return cachedPrefs;
    }
  } catch (err) {
    logger.warn('Failed to read prefs:', String(err));
  }

  cachedPrefs = { ...DEFAULT_PREFS };
  return cachedPrefs;
}

export function savePrefs(prefs: AppPrefs): void {
  try {
    scopedStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    cachedPrefs = prefs;
  } catch (err) {
    logger.error('Failed to save prefs:', String(err));
    throw new Error('本地偏好保存失败，请检查浏览器存储空间后重试');
  }
}

export function updatePrefs(patch: Partial<AppPrefs>): AppPrefs {
  const current = getPrefs();
  const next = { ...current, ...patch };
  savePrefs(next);
  return next;
}

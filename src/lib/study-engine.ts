import {
  getWordState,
  getAllWordStates,
  putWordState,
  getDailyQueue,
  putDailyQueue,
  getDailyStat,
  putDailyStat,
  pushUndoEntry,
  popUndoEntry,
  clearUndoStack,
  addRatingRecord,
  getDateKey,
  getDayStartMs,
  getWord,
  getAllWordIds,
  openDB,
  type WordState,
  type DailyQueue,
  type DailyStat,
  type UndoEntry,
} from './db';

import { getPrefs } from './prefs';

export type Rating = 'unknown' | 'fuzzy' | 'known';

// SRS intervals (in days) by level
const LEVEL_INTERVALS = [0, 1, 2, 4, 7, 15, 30];
const MAX_LEVEL = 6;

// In-day re-review interval for "unknown" (ms)
const UNKNOWN_REVIEW_DELAY_MS = 10 * 60 * 1000; // 10 min

function getDefaultWordState(wordId: string): WordState {
  return {
    wordId,
    status: 'new',
    level: 0,
    nextReview: 0,
    lastReviewed: 0,
    correctCount: 0,
    wrongCount: 0,
  };
}

/**
 * Ensure every word has a wordState entry (default to 'new').
 * Only called once during initial setup.
 */
async function ensureWordStates(): Promise<void> {
  const allIds = await getAllWordIds();
  const existingStates = await getAllWordStates();
  const existingIds = new Set(existingStates.map((s) => s.wordId));

  const missing: WordState[] = [];
  for (const id of allIds) {
    if (!existingIds.has(id)) {
      missing.push(getDefaultWordState(id));
    }
  }

  if (missing.length > 0) {
    // bulk insert in batches
    const BATCH = 500;
    for (let i = 0; i < missing.length; i += BATCH) {
      const batch = missing.slice(i, i + BATCH);
      const db = await openDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction('wordStates', 'readwrite');
        const store = tx.objectStore('wordStates');
        batch.forEach((s) => store.put(s));
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    }
  }
}

/**
 * Get or create today's daily queue.
 * If date has changed or queue doesn't exist, generate a new one.
 */
export async function getOrCreateDailyQueue(): Promise<DailyQueue> {
  const date = getDateKey();
  let queue = await getDailyQueue(date);

  if (queue) return queue;

  // Ensure word states exist before generating queue
  await ensureWordStates();

  const prefs = getPrefs();
  const dailyGoal = prefs.dailyGoal ?? 20;

  // Find new words (status === 'new') sorted by wordId ascending, take first dailyGoal
  const allStates = await getAllWordStates();
  const dayStart = getDayStartMs(date);

  const newWords = allStates
    .filter((s) => s.status === 'new')
    .sort((a, b) => a.wordId.localeCompare(b.wordId))
    .slice(0, dailyGoal)
    .map((s) => s.wordId);

  const reviewWords = allStates
    .filter((s) => s.status === 'learning' && s.nextReview <= dayStart)
    .sort((a, b) => a.nextReview - b.nextReview)
    .map((s) => s.wordId);

  const allQueue = [...newWords, ...reviewWords];

  queue = {
    date,
    newQueue: newWords,
    reviewQueue: reviewWords,
    queue: allQueue,
    currentIndex: 0,
    completed: 0,
    newCompleted: 0,
    reviewCompleted: 0,
  };

  await putDailyQueue(queue);

  // Initialize daily stats if not exists
  const existingStat = await getDailyStat(date);
  if (!existingStat) {
    // Calculate streak
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yKey = getDateKey(yesterday);
    const yStat = await getDailyStat(yKey);
    const streakContinued = !!yStat && (yStat.newLearned > 0 || yStat.reviewed > 0);

    await putDailyStat({
      date,
      newLearned: 0,
      reviewed: 0,
      known: 0,
      fuzzy: 0,
      unknown: 0,
      streakContinued,
    });
  }

  // Clear undo stack for new day
  await clearUndoStack();

  return queue;
}

/**
 * Get the current word to study (at currentIndex).
 * Returns null if queue is complete.
 */
export async function getCurrentWord(): Promise<{ word: import('./db').Word; index: number; total: number } | null> {
  const queue = await getOrCreateDailyQueue();
  if (queue.currentIndex >= queue.queue.length) return null;

  const wordId = queue.queue[queue.currentIndex];
  const word = await getWord(wordId);
  if (!word) throw new Error(`Word not found: ${wordId}`);

  return { word, index: queue.currentIndex, total: queue.queue.length };
}

/**
 * Apply a rating to the current word, advance to next.
 * Returns the updated queue state.
 */
export async function rateCurrentWord(rating: Rating): Promise<DailyQueue> {
  const queue = await getOrCreateDailyQueue();
  if (queue.currentIndex >= queue.queue.length) return queue;

  const wordId = queue.queue[queue.currentIndex];
  const prevState = (await getWordState(wordId)) ?? getDefaultWordState(wordId);

  const wasFirstRating = prevState.status === 'new';
  const queueType: 'new' | 'review' = prevState.status === 'new' ? 'new' : 'review';

  // Snapshot for undo
  const undoEntry: Omit<UndoEntry, 'id'> = {
    wordId,
    prevWordState: { ...prevState },
    prevQueueIndex: queue.currentIndex,
    prevCompleted: queue.completed,
    prevNewCompleted: queue.newCompleted,
    prevReviewCompleted: queue.reviewCompleted,
    rating,
    timestamp: Date.now(),
    wasFirstRating,
  };

  // Calculate new state
  const newState = computeNextState(prevState, rating);

  // Update queue
  const newQueue: DailyQueue = {
    ...queue,
    currentIndex: queue.currentIndex + 1,
    completed: queue.completed + 1,
    newCompleted: wasFirstRating ? queue.newCompleted + 1 : queue.newCompleted,
    reviewCompleted: queueType === 'review' ? queue.reviewCompleted + 1 : queue.reviewCompleted,
  };

  // For "unknown" (in learning mode), re-add to end of queue for same-day review
  if (rating === 'unknown' && !wasFirstRating) {
    // don't add again if it's already at the end (avoid infinite loop for single word)
    if (newQueue.queue[newQueue.queue.length - 1] !== wordId) {
      newQueue.queue = [...newQueue.queue, wordId];
    }
  }
  // For "unknown" (first time / new), also add to tail for same-day re-review
  if (rating === 'unknown' && wasFirstRating) {
    newQueue.queue = [...newQueue.queue, wordId];
  }

  // Update daily stats
  const date = getDateKey();
  const stat = (await getDailyStat(date)) ?? {
    date,
    newLearned: 0,
    reviewed: 0,
    known: 0,
    fuzzy: 0,
    unknown: 0,
    streakContinued: false,
  };

  const newStat: DailyStat = {
    ...stat,
    newLearned: wasFirstRating ? stat.newLearned + 1 : stat.newLearned,
    reviewed: queueType === 'review' ? stat.reviewed + 1 : stat.reviewed,
    known: rating === 'known' ? stat.known + 1 : stat.known,
    fuzzy: rating === 'fuzzy' ? stat.fuzzy + 1 : stat.fuzzy,
    unknown: rating === 'unknown' ? stat.unknown + 1 : stat.unknown,
  };

  // Persist all
  await putWordState(newState);
  await putDailyQueue(newQueue);
  await putDailyStat(newStat);
  await pushUndoEntry(undoEntry);
  await addRatingRecord({
    wordId,
    rating,
    timestamp: Date.now(),
    date,
    queueType,
  });

  return newQueue;
}

/**
 * Compute next word state based on rating.
 */
function computeNextState(prev: WordState, rating: Rating): WordState {
  const now = Date.now();
  const state: WordState = { ...prev, lastReviewed: now };

  if (rating === 'unknown') {
    state.wrongCount += 1;
    state.level = Math.max(0, state.level - 1);
    // next review = 10 minutes later (same-day re-review)
    state.nextReview = now + UNKNOWN_REVIEW_DELAY_MS;
    if (prev.status === 'new') {
      state.status = 'learning';
      state.firstLearnedAt = now;
    }
  } else if (rating === 'fuzzy') {
    state.correctCount += 1;
    // level stays the same for fuzzy
    state.nextReview = now + 1 * 24 * 60 * 60 * 1000; // tomorrow
    if (prev.status === 'new') {
      state.status = 'learning';
      state.firstLearnedAt = now;
      state.level = 1;
    }
  } else {
    // known
    state.correctCount += 1;
    if (prev.status === 'new') {
      state.status = 'learning';
      state.firstLearnedAt = now;
      state.level = 2;
    } else {
      state.level = Math.min(MAX_LEVEL, state.level + 1);
    }
    const intervalDays = LEVEL_INTERVALS[state.level] ?? 30;
    state.nextReview = now + intervalDays * 24 * 60 * 60 * 1000;
    if (state.level >= MAX_LEVEL) {
      state.status = 'mastered';
    }
  }

  return state;
}

/**
 * Undo the last rating.
 * Returns the updated queue, or null if nothing to undo.
 */
export async function undoLastRating(): Promise<DailyQueue | null> {
  const entry = await popUndoEntry();
  if (!entry) return null;

  const date = getDateKey();
  const queue = await getDailyQueue(date);
  if (!queue) return null;

  // Restore word state
  await putWordState(entry.prevWordState);

  // Restore queue counts & index
  const newQueue: DailyQueue = {
    ...queue,
    currentIndex: entry.prevQueueIndex,
    completed: entry.prevCompleted,
    newCompleted: entry.prevNewCompleted,
    reviewCompleted: entry.prevReviewCompleted,
    // Remove any items added after the undo point (unknown re-adds)
    queue: queue.queue.slice(0, Math.max(queue.queue.length - 1, entry.prevQueueIndex + 1)),
  };

  // If the last item in queue was the unknown re-add, remove it
  // (simplification: we only remove the last added if it matches the undone word and was unknown)
  if (entry.rating === 'unknown') {
    const lastIdx = newQueue.queue.length - 1;
    if (newQueue.queue[lastIdx] === entry.wordId && lastIdx >= entry.prevQueueIndex + 1) {
      newQueue.queue = newQueue.queue.slice(0, lastIdx);
    }
  }

  await putDailyQueue(newQueue);

  // Update daily stats (subtract)
  const stat = await getDailyStat(date);
  if (stat) {
    const newStat: DailyStat = {
      ...stat,
      newLearned: entry.wasFirstRating ? Math.max(0, stat.newLearned - 1) : stat.newLearned,
      reviewed: !entry.wasFirstRating ? Math.max(0, stat.reviewed - 1) : stat.reviewed,
      known: entry.rating === 'known' ? Math.max(0, stat.known - 1) : stat.known,
      fuzzy: entry.rating === 'fuzzy' ? Math.max(0, stat.fuzzy - 1) : stat.fuzzy,
      unknown: entry.rating === 'unknown' ? Math.max(0, stat.unknown - 1) : stat.unknown,
    };
    await putDailyStat(newStat);
  }

  return newQueue;
}

/**
 * Get home page stats: today progress, streak, weekly data.
 */
export async function getHomeStats(): Promise<{
  today: { newCompleted: number; dailyGoal: number; reviewed: number; total: number };
  streak: number;
  weekly: DailyStat[];
}> {
  const date = getDateKey();
  const prefs = getPrefs();
  const dailyGoal = prefs.dailyGoal ?? 20;

  let queue: DailyQueue | undefined;
  try {
    queue = await getDailyQueue(date);
  } catch {
    queue = undefined;
  }

  const todayStat = (await getDailyStat(date)) ?? {
    date,
    newLearned: 0,
    reviewed: 0,
    known: 0,
    fuzzy: 0,
    unknown: 0,
    streakContinued: false,
  };

  // Calculate streak: count consecutive days (going backward from today) with newLearned > 0
  let streak = 0;
  const d = new Date();
  for (let i = 0; i < 365; i++) {
    const key = getDateKey(d);
    const s = await getDailyStat(key);
    if (s && (s.newLearned > 0 || s.reviewed > 0)) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }

  // Weekly stats (last 7 days)
  const weekly: DailyStat[] = [];
  const dw = new Date();
  for (let i = 6; i >= 0; i--) {
    const d2 = new Date();
    d2.setDate(d2.getDate() - i);
    const key = getDateKey(d2);
    const s = await getDailyStat(key);
    weekly.push(s ?? { date: key, newLearned: 0, reviewed: 0, known: 0, fuzzy: 0, unknown: 0, streakContinued: false });
  }

  return {
    today: {
      newCompleted: queue?.newCompleted ?? todayStat.newLearned ?? 0,
      dailyGoal,
      reviewed: queue?.reviewCompleted ?? todayStat.reviewed ?? 0,
      total: queue?.queue.length ?? 0,
    },
    streak,
    weekly,
  };
}

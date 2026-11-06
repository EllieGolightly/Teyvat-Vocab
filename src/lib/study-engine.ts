import {
  getDateKey,
  requestResult,
  runTransaction,
  type Word,
  type WordState,
  type DailyQueue,
  type DailyStat,
  type RatingRecord,
  type UndoEntry,
} from './db';
import { getPrefs } from './prefs';

export type Rating = 'unknown' | 'fuzzy' | 'known';
export type StudyMode = 'all' | 'review';

const LEVEL_INTERVALS = [0, 1, 2, 4, 7, 15, 30];
const MAX_LEVEL = 6;
const DAY_MS = 24 * 60 * 60 * 1000;
const UNKNOWN_REVIEW_DELAY_MS = 10 * 60 * 1000;
const STUDY_STORES = ['words', 'wordStates', 'dailyQueue', 'dailyStats', 'ratingHistory', 'undoStack'];

// IndexedDB also serializes these readwrite transactions across tabs. The local
// chain keeps related operations ordered before the database connection resolves.
let pendingOperation: Promise<unknown> = Promise.resolve();
let ratingInFlight = false;

function mutate<T>(operation: (tx: IDBTransaction) => Promise<T>): Promise<T> {
  const result = pendingOperation.then(() => runTransaction(STUDY_STORES, 'readwrite', operation));
  pendingOperation = result.catch(() => undefined);
  return result;
}

function getDefaultWordState(wordId: string): WordState {
  return { wordId, status: 'new', level: 0, nextReview: 0, lastReviewed: 0, correctCount: 0, wrongCount: 0 };
}

function emptyStat(date: string): DailyStat {
  return { date, newLearned: 0, reviewed: 0, known: 0, fuzzy: 0, unknown: 0, streakContinued: false };
}

function hasActivity(stat?: DailyStat): boolean {
  return !!stat && (stat.newLearned > 0 || stat.reviewed > 0);
}

function getGoal(): number {
  const value = getPrefs().dailyGoal;
  return Number.isFinite(value) ? Math.max(5, Math.min(100, Math.round(value))) : 20;
}

interface QueueContext {
  queue: DailyQueue;
  states: Map<string, WordState>;
  stat: DailyStat;
  totalWords: number;
}

/** Reconcile only pending work; completed words and counters always survive. */
async function synchronizeQueue(tx: IDBTransaction, now: number): Promise<QueueContext> {
  const date = getDateKey(new Date(now));
  const queueStore = tx.objectStore('dailyQueue');
  const stateStore = tx.objectStore('wordStates');
  const statStore = tx.objectStore('dailyStats');
  const saved = await requestResult<DailyQueue | undefined>(queueStore.get(date));
  const allIds = await requestResult(tx.objectStore('words').getAllKeys()) as string[];
  const validIds = new Set(allIds);
  const allStates = await requestResult<WordState[]>(stateStore.getAll());
  const states = new Map(allStates.filter((state) => validIds.has(state.wordId)).map((state) => [state.wordId, state]));
  for (const id of allIds) {
    if (!states.has(id)) {
      const state = getDefaultWordState(id);
      states.set(id, state);
      stateStore.put(state);
    }
  }

  let stat = await requestResult<DailyStat | undefined>(statStore.get(date));
  if (!stat) {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const previous = await requestResult<DailyStat | undefined>(statStore.get(getDateKey(yesterday)));
    stat = { ...emptyStat(date), streakContinued: hasActivity(previous) };
    statStore.put(stat);
  }

  const queue: DailyQueue = saved ?? {
    date, newQueue: [], reviewQueue: [], queue: [], currentIndex: 0,
    completed: 0, newCompleted: 0, reviewCompleted: 0,
  };
  const completed = queue.queue.slice(0, queue.currentIndex);
  const completedIds = new Set(completed);
  const remainingNew = Math.max(0, getGoal() - queue.newCompleted);
  const pending: string[] = [];
  const selected = new Set<string>();
  let selectedNew = 0;
  const select = (id: string) => {
    const state = states.get(id);
    if (!state || selected.has(id)) return;
    if (state.status === 'new') {
      if (selectedNew >= remainingNew) return;
      selectedNew++;
    } else if (state.nextReview > now) {
      return;
    }
    selected.add(id);
    pending.push(id);
  };
  // Retain the order of still-needed work, including old v1 saved queues.
  queue.queue.slice(queue.currentIndex).forEach(select);
  allIds.slice().sort((a, b) => a.localeCompare(b)).forEach((id) => {
    if (states.get(id)?.status === 'new') select(id);
  });
  [...states.values()]
    .filter((state) => state.status !== 'new' && state.nextReview <= now)
    .sort((a, b) => a.nextReview - b.nextReview)
    .forEach((state) => select(state.wordId));

  const newPending = pending.filter((id) => states.get(id)?.status === 'new');
  const reviewPending = pending.filter((id) => states.get(id)?.status !== 'new');
  const next: DailyQueue = {
    ...queue,
    queue: [...completed, ...pending],
    newQueue: [...new Set([...queue.newQueue.filter((id) => completedIds.has(id)), ...newPending])],
    reviewQueue: [...new Set([...queue.reviewQueue.filter((id) => completedIds.has(id)), ...reviewPending])],
  };
  queueStore.put(next);
  if (!saved) tx.objectStore('undoStack').clear();
  return { queue: next, states, stat, totalWords: allIds.length };
}

export function getOrCreateDailyQueue(): Promise<DailyQueue> {
  return mutate(async (tx) => (await synchronizeQueue(tx, Date.now())).queue);
}

function pendingIndex(queue: DailyQueue, states: Map<string, WordState>, mode: StudyMode): number {
  if (mode === 'all') return queue.currentIndex < queue.queue.length ? queue.currentIndex : -1;
  return queue.queue.findIndex((id, index) => index >= queue.currentIndex && states.get(id)?.status !== 'new');
}

export function getCurrentWord(mode: StudyMode = 'all'): Promise<{
  word: Word; index: number; total: number; mode: StudyMode;
} | null> {
  return mutate(async (tx) => {
    const { queue, states } = await synchronizeQueue(tx, Date.now());
    const index = pendingIndex(queue, states, mode);
    if (index < 0) return null;
    const word = await requestResult<Word | undefined>(tx.objectStore('words').get(queue.queue[index]));
    if (!word) throw new Error('这个单词暂时无法读取，请重新加载词书');
    const completed = mode === 'review' ? queue.reviewCompleted : queue.currentIndex;
    const remaining = mode === 'review'
      ? queue.queue.slice(queue.currentIndex).filter((id) => states.get(id)?.status !== 'new').length
      : queue.queue.length - queue.currentIndex;
    return { word, index: completed, total: completed + remaining, mode };
  });
}

export async function rateCurrentWord(
  rating: Rating,
  mode: StudyMode = 'all',
  expectedWordId?: string,
): Promise<DailyQueue> {
  if (ratingInFlight) throw new Error('正在保存上一个评价，请稍候');
  ratingInFlight = true;
  try {
    return await mutate(async (tx) => {
      const now = Date.now();
      const { queue, states, stat } = await synchronizeQueue(tx, now);
      const index = pendingIndex(queue, states, mode);
      if (index < 0) {
        if (expectedWordId) throw new Error('学习进度已更新，请重新加载当前单词');
        return queue;
      }
      const wordId = queue.queue[index];
      if (expectedWordId && wordId !== expectedWordId) throw new Error('学习进度已更新，请重新加载当前单词');
      const prevState = states.get(wordId)!;
      const wasFirstRating = prevState.status === 'new';
      const queueType = wasFirstRating ? 'new' : 'review';
      const nextState = computeNextState(prevState, rating, now);
      // A dedicated review takes the selected review word out of the pending
      // suffix and places it at the shared cursor, leaving new words untouched.
      const ordered = [...queue.queue];
      const [selected] = ordered.splice(index, 1);
      ordered.splice(queue.currentIndex, 0, selected);
      const nextQueue: DailyQueue = {
        ...queue, queue: ordered,
        currentIndex: queue.currentIndex + 1,
        completed: queue.completed + 1,
        newCompleted: queue.newCompleted + (wasFirstRating ? 1 : 0),
        reviewCompleted: queue.reviewCompleted + (wasFirstRating ? 0 : 1),
      };
      const nextStat: DailyStat = {
        ...stat,
        newLearned: stat.newLearned + (wasFirstRating ? 1 : 0),
        reviewed: stat.reviewed + (wasFirstRating ? 0 : 1),
        [rating]: stat[rating] + 1,
      };
      tx.objectStore('wordStates').put(nextState);
      tx.objectStore('dailyQueue').put(nextQueue);
      tx.objectStore('dailyStats').put(nextStat);
      const ratingRecordId = await requestResult(tx.objectStore('ratingHistory').add({
        wordId, rating, timestamp: now, date: queue.date, queueType,
      } satisfies Omit<RatingRecord, 'id'>)) as number;
      tx.objectStore('undoStack').add({
        wordId, prevWordState: prevState, prevQueue: queue, prevDailyStat: stat,
        prevQueueIndex: queue.currentIndex, prevCompleted: queue.completed,
        prevNewCompleted: queue.newCompleted, prevReviewCompleted: queue.reviewCompleted,
        rating, timestamp: now, wasFirstRating, date: queue.date, ratingRecordId,
      } satisfies Omit<UndoEntry, 'id'>);
      return nextQueue;
    });
  } finally {
    ratingInFlight = false;
  }
}

function computeNextState(prev: WordState, rating: Rating, now: number): WordState {
  const state: WordState = { ...prev, lastReviewed: now };
  if (prev.status === 'new') state.firstLearnedAt = now;
  if (rating === 'unknown') {
    state.status = 'learning';
    state.wrongCount++;
    state.level = Math.max(0, state.level - 1);
    // It returns when actually due, rather than being shown immediately again.
    state.nextReview = now + UNKNOWN_REVIEW_DELAY_MS;
  } else if (rating === 'fuzzy') {
    state.status = 'learning';
    state.correctCount++;
    state.level = prev.status === 'new' ? 1 : state.level;
    state.nextReview = now + DAY_MS;
  } else {
    state.correctCount++;
    state.level = prev.status === 'new' ? 2 : Math.min(MAX_LEVEL, state.level + 1);
    state.status = state.level >= MAX_LEVEL ? 'mastered' : 'learning';
    state.nextReview = now + (LEVEL_INTERVALS[state.level] ?? 30) * DAY_MS;
  }
  return state;
}

export function undoLastRating(): Promise<DailyQueue | null> {
  return mutate(async (tx) => {
    const date = getDateKey();
    const undoStore = tx.objectStore('undoStack');
    const cursor = await requestResult(undoStore.openCursor(null, 'prev'));
    if (!cursor) return null;
    const entry = cursor.value as UndoEntry;
    const entryDate = entry.date ?? getDateKey(new Date(entry.timestamp));
    if (entryDate !== date) {
      undoStore.clear();
      return null;
    }
    const saved = await requestResult<DailyQueue | undefined>(tx.objectStore('dailyQueue').get(date));
    if (!saved) return null;

    // Old entries did not save full snapshots. Only the unknown rating could
    // append a word; known/fuzzy must never truncate an unrelated tail word.
    let legacyWords = [...saved.queue];
    if (entry.rating === 'unknown' && legacyWords.length > entry.prevQueueIndex + 1 && legacyWords.at(-1) === entry.wordId) {
      legacyWords = legacyWords.slice(0, -1);
    }
    const restored: DailyQueue = entry.prevQueue ?? {
      ...saved, queue: legacyWords, currentIndex: entry.prevQueueIndex,
      completed: entry.prevCompleted, newCompleted: entry.prevNewCompleted,
      reviewCompleted: entry.prevReviewCompleted,
    };
    tx.objectStore('wordStates').put(entry.prevWordState);
    tx.objectStore('dailyQueue').put(restored);
    const stat = await requestResult<DailyStat | undefined>(tx.objectStore('dailyStats').get(date));
    if (entry.prevDailyStat) {
      tx.objectStore('dailyStats').put(entry.prevDailyStat);
    } else if (stat) {
      tx.objectStore('dailyStats').put({
        ...stat,
        newLearned: Math.max(0, stat.newLearned - (entry.wasFirstRating ? 1 : 0)),
        reviewed: Math.max(0, stat.reviewed - (entry.wasFirstRating ? 0 : 1)),
        [entry.rating]: Math.max(0, stat[entry.rating] - 1),
      });
    }
    const historyStore = tx.objectStore('ratingHistory');
    if (entry.ratingRecordId !== undefined) {
      historyStore.delete(entry.ratingRecordId);
    } else {
      const history = await requestResult<RatingRecord[]>(historyStore.index('wordId').getAll(entry.wordId));
      const match = history.reverse().find((record) => record.date === date && record.rating === entry.rating);
      if (match?.id !== undefined) historyStore.delete(match.id);
    }
    undoStore.delete(cursor.primaryKey);
    return restored;
  });
}

export interface HomeStats {
  today: {
    newCompleted: number; dailyGoal: number; reviewed: number; total: number;
    remaining: number; reviewDue: number;
  };
  streak: number;
  weekly: DailyStat[];
  totalLearned: number;
  mastered: number;
  totalWords: number;
  studyDays: number;
}

export function getHomeStats(): Promise<HomeStats> {
  return mutate(async (tx) => {
    const now = Date.now();
    const { queue, states, totalWords } = await synchronizeQueue(tx, now);
    const allStats = await requestResult<DailyStat[]>(tx.objectStore('dailyStats').getAll());
    const byDate = new Map(allStats.map((stat) => [stat.date, stat]));
    let streak = 0;
    const day = new Date(now);
    // An unfinished today does not erase yesterday's continuing streak.
    if (!hasActivity(byDate.get(getDateKey(day)))) day.setDate(day.getDate() - 1);
    while (hasActivity(byDate.get(getDateKey(day)))) {
      streak++;
      day.setDate(day.getDate() - 1);
    }
    const weekly: DailyStat[] = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date(now);
      day.setDate(day.getDate() - i);
      const date = getDateKey(day);
      weekly.push(byDate.get(date) ?? emptyStat(date));
    }
    const remaining = queue.queue.slice(queue.currentIndex);
    const allStates = [...states.values()];
    return {
      today: {
        newCompleted: queue.newCompleted, dailyGoal: getGoal(),
        reviewed: queue.reviewCompleted, total: queue.queue.length,
        remaining: remaining.length,
        reviewDue: remaining.filter((id) => states.get(id)?.status !== 'new').length,
      },
      streak, weekly, totalWords,
      totalLearned: allStates.filter((state) => state.status !== 'new').length,
      mastered: allStates.filter((state) => state.status === 'mastered').length,
      studyDays: allStats.filter(hasActivity).length,
    };
  });
}

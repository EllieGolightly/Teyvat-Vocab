// IndexedDB wrapper for Teyvat Vocab
// Stores: words (read-only lexicon), wordStates, dailyQueue, dailyStats, ratingHistory, undoStack

export interface WordExample {
  enParts: Array<{ text: string; bold: boolean }>;
  zh?: string;
  sourceRaw: string;
  sourceType?: string;
  id?: string;
}

export interface Word {
  id: string;
  word: string;
  phonetic: string;
  definitionRaw: string;
  examples: WordExample[];
}

export type WordStatus = 'new' | 'learning' | 'mastered';

export interface WordState {
  wordId: string;
  status: WordStatus;
  level: number;
  nextReview: number;
  lastReviewed: number;
  correctCount: number;
  wrongCount: number;
  firstLearnedAt?: number;
}

export interface DailyQueue {
  date: string;
  newQueue: string[];
  reviewQueue: string[];
  queue: string[];
  currentIndex: number;
  completed: number;
  newCompleted: number;
  reviewCompleted: number;
}

export interface DailyStat {
  date: string;
  newLearned: number;
  reviewed: number;
  known: number;
  fuzzy: number;
  unknown: number;
  streakContinued: boolean;
}

export interface RatingRecord {
  id?: number;
  wordId: string;
  rating: 'unknown' | 'fuzzy' | 'known';
  timestamp: number;
  date: string;
  queueType: 'new' | 'review';
}

export interface UndoEntry {
  id?: number;
  wordId: string;
  prevWordState: WordState;
  prevQueueIndex: number;
  prevCompleted: number;
  prevNewCompleted: number;
  prevReviewCompleted: number;
  rating: 'unknown' | 'fuzzy' | 'known';
  timestamp: number;
  wasFirstRating: boolean;
  // Optional for compatibility with entries written by the first app version.
  date?: string;
  prevQueue?: DailyQueue;
  prevDailyStat?: DailyStat;
  ratingRecordId?: number;
}

const DB_NAME = 'teyvat-vocab';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

export function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onerror = () => {
        dbPromise = null;
        reject(req.error);
      };
      req.onsuccess = () => {
        const db = req.result;
        db.onversionchange = () => {
          db.close();
          dbPromise = null;
        };
        resolve(db);
      };
      req.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains('words')) {
          const wordsStore = db.createObjectStore('words', { keyPath: 'id' });
          wordsStore.createIndex('word', 'word', { unique: true });
        }

        if (!db.objectStoreNames.contains('wordStates')) {
          db.createObjectStore('wordStates', { keyPath: 'wordId' });
        }

        if (!db.objectStoreNames.contains('dailyQueue')) {
          db.createObjectStore('dailyQueue', { keyPath: 'date' });
        }

        if (!db.objectStoreNames.contains('dailyStats')) {
          db.createObjectStore('dailyStats', { keyPath: 'date' });
        }

        if (!db.objectStoreNames.contains('ratingHistory')) {
          const histStore = db.createObjectStore('ratingHistory', { keyPath: 'id', autoIncrement: true });
          histStore.createIndex('date', 'date');
          histStore.createIndex('wordId', 'wordId');
        }

        if (!db.objectStoreNames.contains('undoStack')) {
          db.createObjectStore('undoStack', { keyPath: 'id', autoIncrement: true });
        }
      };
    } catch (err) {
      // Clear on the next microtask: the Promise assignment has not completed yet.
      queueMicrotask(() => { dbPromise = null; });
      reject(err);
    }
  });

  return dbPromise;
}

export function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Resolve only after commit; a failed operation rolls back every store together. */
export async function runTransaction<T>(
  stores: string[],
  mode: IDBTransactionMode,
  operation: (tx: IDBTransaction) => Promise<T>,
): Promise<T> {
  const db = await openDB();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(stores, mode);
    let result: T;
    let operationError: unknown;
    tx.oncomplete = () => resolve(result);
    tx.onabort = () => reject(operationError ?? tx.error ?? new Error('本地数据保存失败，请重试'));
    // onabort is the single failure path, including request errors.
    tx.onerror = () => {};
    operation(tx).then((value) => { result = value; }).catch((error: unknown) => {
      operationError = error;
      try { tx.abort(); } catch { reject(error); }
    });
  });
}

// ---------- words (lexicon) ----------

export async function getWord(id: string): Promise<Word | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('words', 'readonly');
    const req = tx.objectStore('words').get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getWordsCount(): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('words', 'readonly');
    const req = tx.objectStore('words').count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getAllWordIds(): Promise<string[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('words', 'readonly');
    const req = tx.objectStore('words').getAllKeys();
    req.onsuccess = () => resolve(req.result as string[]);
    req.onerror = () => reject(req.error);
  });
}

export async function bulkPutWords(words: Word[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('words', 'readwrite');
    const store = tx.objectStore('words');
    words.forEach((w) => store.put(w));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ---------- wordStates ----------

export async function getWordState(wordId: string): Promise<WordState | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('wordStates', 'readonly');
    const req = tx.objectStore('wordStates').get(wordId);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getAllWordStates(): Promise<WordState[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('wordStates', 'readonly');
    const req = tx.objectStore('wordStates').getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function putWordState(state: WordState): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('wordStates', 'readwrite');
    tx.objectStore('wordStates').put(state);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ---------- dailyQueue ----------

export async function getDailyQueue(date: string): Promise<DailyQueue | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('dailyQueue', 'readonly');
    const req = tx.objectStore('dailyQueue').get(date);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function putDailyQueue(queue: DailyQueue): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('dailyQueue', 'readwrite');
    tx.objectStore('dailyQueue').put(queue);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ---------- dailyStats ----------

export async function getDailyStat(date: string): Promise<DailyStat | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('dailyStats', 'readonly');
    const req = tx.objectStore('dailyStats').get(date);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function putDailyStat(stat: DailyStat): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('dailyStats', 'readwrite');
    tx.objectStore('dailyStats').put(stat);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getRecentStats(days: number): Promise<DailyStat[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('dailyStats', 'readonly');
    const req = tx.objectStore('dailyStats').getAll();
    req.onsuccess = () => {
      const all = req.result as DailyStat[];
      all.sort((a, b) => a.date.localeCompare(b.date));
      resolve(all.slice(-days));
    };
    req.onerror = () => reject(req.error);
  });
}

// ---------- ratingHistory ----------

export async function addRatingRecord(record: Omit<RatingRecord, 'id'>): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('ratingHistory', 'readwrite');
    const req = tx.objectStore('ratingHistory').add(record);
    req.onsuccess = () => resolve(req.result as number);
    req.onerror = () => reject(tx.error);
  });
}

// ---------- undoStack ----------

export async function pushUndoEntry(entry: Omit<UndoEntry, 'id'>): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('undoStack', 'readwrite');
    const req = tx.objectStore('undoStack').add(entry);
    req.onsuccess = () => resolve(req.result as number);
    req.onerror = () => reject(tx.error);
  });
}

export async function popUndoEntry(): Promise<UndoEntry | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('undoStack', 'readwrite');
    const store = tx.objectStore('undoStack');
    // Get the last entry (highest id)
    const req = store.openCursor(null, 'prev');
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        const entry = cursor.value as UndoEntry;
        cursor.delete();
        resolve(entry);
      } else {
        resolve(undefined);
      }
    };
    req.onerror = () => reject(req.error);
  });
}

export async function clearUndoStack(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('undoStack', 'readwrite');
    const req = tx.objectStore('undoStack').clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ---------- util: date key ----------

export function getDateKey(d = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getDayStartMs(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
}

import { logger } from './platform';
import { resolveAppUrl } from './assets';
import {
  openDB,
  getWordsCount,
  bulkPutWords,
  type Word,
} from './db';

const JSON_URL = resolveAppUrl('cet6-words.json');

let loadPromise: Promise<void> | null = null;

export async function loadLexicon(): Promise<void> {
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      await openDB();
    } catch (err) {
      logger.error('IndexedDB open failed:', String(err));
      throw new Error('当前浏览器不支持本地存储（IndexedDB），无法保存学习记录。请启用本地存储或更换浏览器后重试。');
    }

    const count = await getWordsCount();
    if (count >= 2000) {
      logger.info(`Lexicon already loaded: ${count} words`);
      return;
    }

    let jsonData: { meta: { wordCount: number }; words: Word[] };
    try {
      const resp = await fetch(JSON_URL);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      jsonData = await resp.json();
    } catch (err) {
      logger.error('JSON load failed:', String(err));
      throw new Error('词书数据加载失败，请检查网络后重试。');
    }

    if (!jsonData?.words?.length) {
      throw new Error('词书数据格式异常，未找到单词列表。');
    }

    logger.info(`Loading ${jsonData.words.length} words into IndexedDB...`);
    await bulkPutWords(jsonData.words);
    logger.info('Lexicon loaded successfully');
  })().catch((error: unknown) => {
    loadPromise = null;
    throw error;
  });

  return loadPromise;
}

export async function getLexiconCount(): Promise<number> {
  return getWordsCount();
}

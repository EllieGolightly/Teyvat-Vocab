import { useState, useEffect } from 'react';
import { getAllWordIds, getWord } from '@/lib/db';

export default function WordOfDayWidget() {
  const [word, setWord] = useState<{ word: string; phonetic: string; definitionRaw: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const allIds = await getAllWordIds();
        if (!allIds.length) return;
        const date = new Date();
        const dayOfYear = Math.floor(
          (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000,
        );
        const index = dayOfYear % allIds.length;
        const current = await getWord(allIds[index]);
        if (current && mounted) {
          setWord({ word: current.word, phonetic: current.phonetic, definitionRaw: current.definitionRaw });
        }
      } catch {
        // The widget keeps its empty state if the word cannot be loaded.
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <div className="widget-surface relative flex h-full w-full flex-col justify-center overflow-hidden p-3">
      {loading ? (
        <div className="text-xs text-muted-foreground">加载中…</div>
      ) : word ? (
        <>
          <div className="text-[10px] text-muted-foreground">今日一词</div>
          <div className="mt-0.5 truncate text-xl font-bold leading-6 text-foreground">{word.word}</div>
          <div className="truncate text-[10px] leading-4 text-muted-foreground">{word.phonetic}</div>
          <div className="mt-1 line-clamp-2 text-[10px] leading-4 text-foreground/80">{word.definitionRaw}</div>
        </>
      ) : (
        <div className="text-xs text-muted-foreground">暂无</div>
      )}
    </div>
  );
}

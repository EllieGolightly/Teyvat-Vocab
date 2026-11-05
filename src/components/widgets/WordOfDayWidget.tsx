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
        // Deterministic "word of the day" based on date
        const date = new Date();
        const dayOfYear = Math.floor(
          (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000
        );
        const index = dayOfYear % allIds.length;
        const w = await getWord(allIds[index]);
        if (w && mounted) {
          setWord({ word: w.word, phonetic: w.phonetic, definitionRaw: w.definitionRaw });
        }
      } catch {
        // ignore errors in widget
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl bg-white/70 backdrop-blur-md border border-white/40 shadow-sm p-3 md:p-4 flex flex-col justify-center">
      {loading ? (
        <div className="text-sm text-muted-foreground">加载中...</div>
      ) : word ? (
        <>
          <div className="text-xs text-muted-foreground">今日一词</div>
          <div className="mt-0.5 text-lg font-bold text-foreground truncate">{word.word}</div>
          <div className="text-[11px] text-muted-foreground truncate">{word.phonetic}</div>
          <div className="mt-1.5 text-[11px] text-foreground/80 line-clamp-2">{word.definitionRaw}</div>
        </>
      ) : (
        <div className="text-sm text-muted-foreground">暂无</div>
      )}
    </div>
  );
}

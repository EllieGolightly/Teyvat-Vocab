import { useLayoutEffect, useState } from 'react';
import { getDailyRegionQuote } from '@/lib/daily-region-quotes';
import type { RegionQuote } from '@/lib/region-quotes';
import type { ThemeId } from '@/lib/themes';

export function useDailyRegionQuote(themeId: ThemeId) {
  const [selection, setSelection] = useState<{ themeId: ThemeId; quote: RegionQuote } | null>(null);
  useLayoutEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const refresh = () => {
      clearTimeout(timer);
      setSelection({ themeId, quote: getDailyRegionQuote(themeId) });
      const now = new Date();
      const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      timer = setTimeout(refresh, midnight.getTime() - now.getTime() + 100);
    };
    const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    refresh();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [themeId]);
  return selection?.themeId === themeId ? selection.quote : null;
}

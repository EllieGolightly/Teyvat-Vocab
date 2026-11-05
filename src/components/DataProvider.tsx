import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { loadLexicon } from '@/lib/lexicon';
import { getHomeStats, getOrCreateDailyQueue } from '@/lib/study-engine';
import type { DailyStat } from '@/lib/db';
import { AlertTriangle, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/sonner';
import { logger } from '@lark-apaas/client-toolkit-lite';

type AppState = 'loading' | 'error' | 'ready';

interface AppDataContextValue {
  stats: {
    today: { newCompleted: number; dailyGoal: number; reviewed: number; total: number };
    streak: number;
    weekly: DailyStat[];
  } | null;
  refreshStats: () => Promise<void>;
  prefersReducedMotion: boolean;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used within DataProvider');
  return ctx;
}

export default function DataProvider() {
  const [state, setState] = useState<AppState>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [stats, setStats] = useState<AppDataContextValue['stats']>(null);
  const [prefersReduced, setPrefersReduced] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const refreshStats = useCallback(async () => {
    try {
      const hs = await getHomeStats();
      setStats(hs);
    } catch (err) {
      logger.warn('Stats refresh failed:', String(err));
    }
  }, []);

  const init = useCallback(async () => {
    setState('loading');
    setErrorMsg('');
    try {
      await loadLexicon();
      try {
        await getOrCreateDailyQueue();
      } catch (qErr) {
        logger.warn('Queue init issue:', String(qErr));
      }
      await refreshStats();
      setState('ready');
    } catch (err: any) {
      setErrorMsg(err?.message || '未知错误');
      setState('error');
    }
  }, [refreshStats]);

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);
    mq.addEventListener?.('change', handler);
    return () => mq.removeEventListener?.('change', handler);
  }, []);

  // Refresh stats when returning to home
  useEffect(() => {
    if (state === 'ready' && location.pathname === '/') {
      refreshStats();
    }
  }, [location.pathname, state, refreshStats]);

  const contextValue = useMemo<AppDataContextValue>(
    () => ({
      stats,
      refreshStats,
      prefersReducedMotion: prefersReduced,
    }),
    [stats, refreshStats, prefersReduced]
  );

  if (state === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-100 to-background flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <div className="text-muted-foreground">正在加载词书...</div>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-100 to-background flex flex-col items-center justify-center gap-4 p-8">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-destructive" />
        </div>
        <h2 className="text-xl font-bold text-foreground">数据加载失败</h2>
        <p className="text-muted-foreground text-center max-w-sm">{errorMsg}</p>
        <Button onClick={init} className="gap-2">
          <RefreshCcw className="w-4 h-4" />
          重试
        </Button>
      </div>
    );
  }

  // We need to pass navigate to child pages via context too, but they can use useNavigate.
  // Instead, provide a helper for "start study" action.
  return (
    <AppDataContext.Provider value={contextValue}>
      <Outlet />
      <Toaster position="top-center" richColors closeButton />
    </AppDataContext.Provider>
  );
}

// Convenience hook for pages to get start study action
export function useStartStudy() {
  const navigate = useNavigate();
  return useCallback(() => navigate('/study'), [navigate]);
}

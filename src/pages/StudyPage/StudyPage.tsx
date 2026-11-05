import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Image } from '@/components/ui/image';
import { Button } from '@/components/ui/button';
import { ASSETS } from '@/lib/assets';
import {
  getOrCreateDailyQueue,
  rateCurrentWord,
  undoLastRating,
  getCurrentWord,
  type Rating,
} from '@/lib/study-engine';
import { getDailyStat, type Word, getDateKey } from '@/lib/db';
import { useAppData } from '@/components/DataProvider';
import { ChevronLeft, ChevronRight, RotateCcw, ArrowLeft, CheckCircle2, HelpCircle, XCircle, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface StudyPageProps {}

export default function StudyPage() {
  const { prefersReducedMotion } = useAppData();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [currentWord, setCurrentWord] = useState<Word | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [total, setTotal] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [exampleIndex, setExampleIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [completeStats, setCompleteStats] = useState({ known: 0, fuzzy: 0, unknown: 0, newLearned: 0, reviewed: 0 });
  const [rateAnim, setRateAnim] = useState<Rating | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const loadCurrent = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getCurrentWord();
      if (!result) {
        // Queue complete - load today's stats
        const today = getDateKey();
        const ds = await getDailyStat(today);
        if (ds) {
          setCompleteStats({
            known: ds.known,
            fuzzy: ds.fuzzy,
            unknown: ds.unknown,
            newLearned: ds.newLearned,
            reviewed: ds.reviewed,
          });
        }
        setIsComplete(true);
        setLoading(false);
        return;
      }
      setCurrentWord(result.word);
      setCurrentIndex(result.index);
      setTotal(result.total);
      setIsRevealed(false);
      setExampleIndex(0);
    } catch (err) {
      toast.error('加载失败，请重试');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await getOrCreateDailyQueue();
      await loadCurrent();
    })();
  }, [loadCurrent]);

  const handleReveal = useCallback(() => {
    setIsRevealed(true);
  }, []);

  const handleRate = useCallback(
    async (rating: Rating) => {
      if (!isRevealed) {
        handleReveal();
        return;
      }
      setRateAnim(rating);
      try {
        await rateCurrentWord(rating);
        // Short delay for animation
        await new Promise((r) => setTimeout(r, prefersReducedMotion ? 50 : 250));
        setRateAnim(null);
        await loadCurrent();
      } catch (err) {
        toast.error('评价失败，请重试');
        setRateAnim(null);
      }
    },
    [isRevealed, handleReveal, loadCurrent, prefersReducedMotion]
  );

  const handleUndo = useCallback(async () => {
    try {
      const result = await undoLastRating();
      if (!result) {
        toast.info('已经是第一张啦');
        return;
      }
      toast.success('已撤销上一个评价');
      await loadCurrent();
    } catch (err) {
      toast.error('撤销失败');
    }
  }, [loadCurrent]);

  const prevExample = () => {
    if (!currentWord?.examples?.length) return;
    setExampleIndex((i) => (i - 1 + currentWord.examples.length) % currentWord.examples.length);
  };

  const nextExample = () => {
    if (!currentWord?.examples?.length) return;
    setExampleIndex((i) => (i + 1) % currentWord.examples.length);
  };

  const goHome = () => navigate('/');

  const progressPct = total > 0 ? Math.round((currentIndex / total) * 100) : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-100 to-background flex items-center justify-center">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  if (isComplete || !currentWord) {
    return <CompletePage onHome={goHome} stats={completeStats} />;
  }

  const word = currentWord;
  const hasExamples = word.examples && word.examples.length > 0;
  const curExample = hasExamples ? word.examples[exampleIndex] : null;

  return (
    <div
      className="min-h-screen w-full flex flex-col"
      style={{
        backgroundImage: `url(${ASSETS.mondstadtBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-sky-100/60 via-sky-50/70 to-background/80 pointer-events-none" />

      {/* Top bar */}
      <header className="relative z-10 w-full">
        <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
          <button
            onClick={goHome}
            className="w-10 h-10 rounded-full bg-white/60 backdrop-blur-sm border border-white/40 flex items-center justify-center text-foreground hover:bg-white/80 transition-colors min-h-[40px]"
            aria-label="返回"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Progress */}
          <div className="flex-1 mx-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>进度</span>
              <span className="tabular-nums font-medium">{currentIndex + 1} / {total}</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/40 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          <button
            onClick={handleUndo}
            className="w-10 h-10 rounded-full bg-white/60 backdrop-blur-sm border border-white/40 flex items-center justify-center text-foreground hover:bg-white/80 transition-colors min-h-[40px]"
            aria-label="撤销"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Card area */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={word.id + (isRevealed ? '-back' : '-front')}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.3, ease: 'easeOut' }}
            className="w-full max-w-md"
          >
            <div
              ref={cardRef}
              onClick={!isRevealed ? handleReveal : undefined}
              className={`w-full aspect-[3/4] max-h-[60vh] rounded-3xl bg-white/80 backdrop-blur-lg border border-white/50 shadow-xl p-6 md:p-8 flex flex-col items-center justify-center text-center relative overflow-hidden ${
                !isRevealed ? 'cursor-pointer' : ''
              } ${rateAnim === 'known' ? 'ring-4 ring-success/30' : ''} ${
                rateAnim === 'fuzzy' ? 'ring-4 ring-warning/30' : ''
              } ${rateAnim === 'unknown' ? 'ring-4 ring-destructive/30' : ''}`}
            >
              {/* decorative */}
              <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-sky-100/50 to-transparent pointer-events-none" />

              {!isRevealed ? (
                /* FRONT: word + phonetic */
                <div className="flex flex-col items-center gap-4 px-2">
                  <div className="text-4xl md:text-5xl font-bold text-foreground tracking-tight">
                    {word.word}
                  </div>
                  <div className="text-base text-muted-foreground">{word.phonetic}</div>
                  <div className="text-sm text-muted-foreground/70 mt-8 animate-pulse">
                    点击卡片回忆释义
                  </div>
                </div>
              ) : (
                /* BACK: definition + examples */
                <div className="flex flex-col items-start w-full gap-4 overflow-y-auto">
                  <div className="w-full text-center">
                    <div className="text-3xl font-bold text-foreground">{word.word}</div>
                    <div className="text-sm text-muted-foreground mt-1">{word.phonetic}</div>
                  </div>

                  <div className="w-full h-px bg-border" />

                  <div className="w-full">
                    <div className="text-xs text-muted-foreground mb-1.5">释义</div>
                    <div className="text-base text-foreground leading-relaxed whitespace-pre-line">
                      {word.definitionRaw}
                    </div>
                  </div>

                  <div className="w-full">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-xs text-muted-foreground">提瓦特例句</div>
                      {hasExamples && word.examples.length > 1 && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); prevExample(); }}
                            className="w-7 h-7 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center min-h-[28px]"
                            aria-label="上一条"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <span className="text-xs text-muted-foreground tabular-nums px-1">
                            {exampleIndex + 1}/{word.examples.length}
                          </span>
                          <button
                            onClick={(e) => { e.stopPropagation(); nextExample(); }}
                            className="w-7 h-7 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center min-h-[28px]"
                            aria-label="下一条"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    {hasExamples && curExample ? (
                      <div className="space-y-2">
                        <div className="text-sm text-foreground leading-relaxed bg-primary/5 rounded-xl p-3 border border-primary/10">
                          {curExample.enParts.map((part, i) =>
                            part.bold ? (
                              <strong key={i} className="text-primary font-semibold">{part.text}</strong>
                            ) : (
                              <span key={i}>{part.text}</span>
                            )
                          )}
                        </div>
                        {curExample.zh && (
                          <div className="text-xs text-muted-foreground">{curExample.zh}</div>
                        )}
                        <div className="text-[10px] text-muted-foreground/70 italic">
                          — {curExample.sourceRaw}
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground bg-muted/50 rounded-xl p-4 text-center">
                        暂无例句
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom rating bar */}
      <footer className="relative z-10 w-full pb-safe">
        <div className="max-w-md mx-auto px-6 pb-8 pt-2">
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => handleRate('unknown')}
              className="flex flex-col items-center justify-center gap-1 py-4 rounded-2xl bg-destructive/10 hover:bg-destructive/20 border border-destructive/20 text-destructive min-h-[68px] active:scale-[0.97] transition-all"
            >
              <XCircle className="w-6 h-6" />
              <span className="text-sm font-medium">不认识</span>
            </button>
            <button
              onClick={() => handleRate('fuzzy')}
              className="flex flex-col items-center justify-center gap-1 py-4 rounded-2xl bg-warning/10 hover:bg-warning/20 border border-warning/20 text-warning-foreground min-h-[68px] active:scale-[0.97] transition-all"
              style={{ color: 'hsl(35 85% 45%)' }}
            >
              <HelpCircle className="w-6 h-6" />
              <span className="text-sm font-medium">模糊</span>
            </button>
            <button
              onClick={() => handleRate('known')}
              className="flex flex-col items-center justify-center gap-1 py-4 rounded-2xl bg-success/10 hover:bg-success/20 border border-success/20 text-success min-h-[68px] active:scale-[0.97] transition-all"
            >
              <CheckCircle2 className="w-6 h-6" />
              <span className="text-sm font-medium">认识</span>
            </button>
          </div>
          <p className="text-center text-xs text-muted-foreground/70 mt-3">
            评价会影响下次复习时间
          </p>
        </div>
      </footer>
    </div>
  );
}

function CompletePage({ onHome, stats }: { onHome: () => void; stats: { known: number; fuzzy: number; unknown: number; newLearned: number; reviewed: number } }) {
  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center px-6"
      style={{
        backgroundImage: `url(${ASSETS.mondstadtBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-sky-100/70 to-background/80 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-sm text-center"
      >
        <div className="w-40 h-40 mx-auto mb-4">
          <Image src={ASSETS.paimonTraveler} alt="派蒙与旅行者" className="w-full h-full object-contain drop-shadow-lg" />
        </div>

        <div className="flex items-center justify-center gap-2 mb-2">
          <Sparkles className="w-5 h-5 text-amber-500" />
          <h2 className="text-2xl font-bold text-foreground">今日学习完成！</h2>
          <Sparkles className="w-5 h-5 text-amber-500" />
        </div>

        <p className="text-muted-foreground mb-8">
          「旅行者今天也很棒呢，明天继续加油哦！」
        </p>

        <div className="bg-white/70 backdrop-blur-lg rounded-2xl border border-white/50 p-5 shadow-lg mb-8">
          <div className="text-sm text-muted-foreground mb-3">今日总结</div>
          <div className="grid grid-cols-3 gap-4">
            <Stat label="认识" value={stats.known} color="text-success" />
            <Stat label="模糊" value={stats.fuzzy} color="text-warning" />
            <Stat label="不认识" value={stats.unknown} color="text-destructive" />
          </div>
        </div>

        <button
          onClick={onHome}
          className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-medium shadow-lg hover:shadow-xl transition-all active:scale-[0.98] min-h-[52px]"
        >
          回到首页
        </button>
      </motion.div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className={`text-2xl font-bold ${color} tabular-nums`}>{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

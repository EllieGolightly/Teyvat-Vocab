import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  RotateCcw,
  Volume2,
  Heart,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Check,
  HelpCircle,
  X,
  Eye,
  BookOpen,
} from "lucide-react";
import { toast } from "sonner";
import { resolveAppUrl } from "@/lib/assets";
import { useTheme } from "@/components/ThemeProvider";
import {
  getCurrentWord,
  rateCurrentWord,
  undoLastRating,
  type Rating,
  type StudyMode,
} from "@/lib/study-engine";
import { getDailyStat, getDateKey, type Word } from "@/lib/db";
import { isFavorite, toggleFavorite, speakWord } from "@/lib/word-tools";
import { useAppData } from "@/components/DataProvider";
import { Star } from "@/components/AppShell";

type Current = { word: Word; index: number; total: number };
export default function StudyPage() {
  const { theme } = useTheme();
  const [params] = useSearchParams();
  const mode: StudyMode = params.get("mode") === "review" ? "review" : "all";
  const { refreshStats } = useAppData();
  const [current, setCurrent] = useState<Current | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [example, setExample] = useState(0);
  const [favorite, setFavorite] = useState(false);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [complete, setComplete] = useState(false);
  const [summary, setSummary] = useState({ newLearned: 0, reviewed: 0 });
  const lock = useRef(false);

  const load = useCallback(async () => {
    setError("");
    const result = await getCurrentWord(mode);
    setCurrent(result);
    setComplete(!result);
    setRevealed(false);
    setExample(0);
    if (result) setFavorite(isFavorite(result.word.id));
    else {
      const stat = await getDailyStat(getDateKey());
      setSummary({
        newLearned: stat?.newLearned ?? 0,
        reviewed: stat?.reviewed ?? 0,
      });
    }
  }, [mode]);
  const retry = useCallback(async () => {
    setBusy(true);
    try {
      await load();
    } catch {
      setError("单词暂时没有加载成功，进度仍然保留。");
    } finally {
      setBusy(false);
    }
  }, [load]);
  useEffect(() => {
    void retry();
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, [retry]);
  const rate = useCallback(
    async (rating: Rating) => {
      if (lock.current || busy || !current || !revealed) return;
      lock.current = true;
      setBusy(true);
      try {
        await rateCurrentWord(rating, mode, current.word.id);
        await load();
        await refreshStats();
      } catch (err) {
        setError(err instanceof Error ? err.message : "保存失败，请重试。");
      } finally {
        lock.current = false;
        setBusy(false);
      }
    },
    [busy, current, revealed, mode, load, refreshStats],
  );
  const undo = async () => {
    if (lock.current || busy) return;
    lock.current = true;
    setBusy(true);
    try {
      if (await undoLastRating()) {
        await load();
        await refreshStats();
        toast.success("已撤销上一个评价");
      } else toast.info("今天还没有可撤销的评价");
    } catch {
      setError("撤销失败，请重试。");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (
        event.repeat ||
        event.target instanceof HTMLButtonElement ||
        event.target instanceof HTMLInputElement ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey
      )
        return;
      if (event.code === "Space" && current && !revealed) {
        event.preventDefault();
        setRevealed(true);
      } else if (revealed && ["1", "2", "3"].includes(event.key)) {
        event.preventDefault();
        void rate(
          ({ 1: "unknown", 2: "fuzzy", 3: "known" } as const)[
            event.key as "1" | "2" | "3"
          ],
        );
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [current, revealed, rate]);

  const word = current?.word;
  const ex = word?.examples[example];
  return (
    <div
      className="study-shell"
      style={{ "--scene": `url(${resolveAppUrl(theme.assets.background)})` } as React.CSSProperties}
    >
      <header className="study-header">
        <Link
          to={mode === "review" ? "/review" : "/"}
          className="round-button"
          aria-label="返回，保留学习进度"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <span className="eyebrow">
            {mode === "review" ? "REVISIT THE STARS" : "A LITTLE EVERY DAY"}
          </span>
          <strong>{mode === "review" ? "温习旧日星光" : "今日单词之旅"}</strong>
        </div>
        <button
          className="round-button"
          disabled={busy}
          onClick={undo}
          aria-label="撤销上一词评价"
        >
          <RotateCcw size={19} />
        </button>
      </header>
      {error && (
        <div className="inline-error" role="alert">
          <p>{error}</p>
          <button className="text-link" onClick={retry}>
            重新加载
          </button>
        </div>
      )}
      {busy && !current && !complete && !error && (
        <div className="study-loading" role="status">
          <Star />
          正在翻开词书…
        </div>
      )}
      {complete && !error ? (
        <main className="completion">
          <img src={resolveAppUrl(theme.assets.hero)} alt={`派蒙和旅行者${theme.traveler}`} />
          <span className="eyebrow">A LITTLE FURTHER, TOGETHER</span>
          <h1>{mode === "review" ? "这一轮复习完成了" : "本轮学习完成了！"}</h1>
          <p>把星光收进口袋，明天继续旅程。</p>
          <div className="summary-counts parchment">
            <div>
              <strong>{summary.newLearned}</strong>
              <span>今日新学 · 词</span>
            </div>
            <div>
              <strong>{summary.reviewed}</strong>
              <span>今日复习 · 次</span>
            </div>
          </div>
          <p className="subtle small">不熟悉的单词会按复习时间再次出现。</p>
          <Link className="primary-button" to="/progress">
            <Sparkles size={18} />
            查看学习记录
          </Link>
          <Link className="secondary-button" to="/">
            回到首页
          </Link>
          <button className="text-link" onClick={undo} disabled={busy}>
            <RotateCcw size={14} />
            撤销最后一个评价
          </button>
        </main>
      ) : (
        current && (
          <>
            <div className="study-progress">
              <div>
                <span>{mode === "review" ? "复习进度" : "本轮进度"}</span>
                <span>
                  已完成 {current.index} / {current.total}
                </span>
              </div>
              <div className="thin-track">
                <span
                  style={{
                    width: `${current.total ? (current.index / current.total) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
            <main className="study-main" aria-busy={busy}>
              <article className="word-card parchment" key={word!.id}>
                <div className="word-topline">
                  <span className="word-label">
                    <BookOpen size={13} /> CET-6 · 核心词汇
                  </span>
                  <button
                    className={`icon-button favorite-button ${favorite ? "favorited" : ""}`}
                    aria-label={favorite ? "取消收藏" : "收藏单词"}
                    aria-pressed={favorite}
                    onClick={() => setFavorite(toggleFavorite(word!.id))}
                  >
                    <Heart
                      size={21}
                      fill={favorite ? "currentColor" : "none"}
                    />
                  </button>
                </div>
                <div className="word-heading">
                  <span className="eyebrow">
                    WORD {String(current.index + 1).padStart(2, "0")}
                  </span>
                  <h1>{word!.word}</h1>
                  <div className="phonetic">
                    <span>{word!.phonetic}</span>
                    <button
                      className="icon-button"
                      onClick={() => speakWord(word!.word)}
                      aria-label={`朗读 ${word!.word}`}
                    >
                      <Volume2 size={20} />
                    </button>
                  </div>
                </div>
                {!revealed ? (
                  <div className="recall-prompt">
                    <Star />
                    <p>这个单词，让你想起了什么？</p>
                    <span>先试着回忆，再揭开答案。</span>
                  </div>
                ) : (
                  <div className="word-answer">
                    <div className="definition-label">释义</div>
                    <p className="word-definition">{word!.definitionRaw}</p>
                    {ex && (
                      <section className="example-box">
                        <div className="example-heading">
                          <span>提瓦特例句</span>
                          {word!.examples.length > 1 && (
                            <div>
                              <button
                                onClick={() =>
                                  setExample(
                                    (example - 1 + word!.examples.length) %
                                      word!.examples.length,
                                  )
                                }
                                aria-label="上一条例句"
                              >
                                <ChevronLeft size={16} />
                              </button>
                              <span>
                                {example + 1} / {word!.examples.length}
                              </span>
                              <button
                                onClick={() =>
                                  setExample(
                                    (example + 1) % word!.examples.length,
                                  )
                                }
                                aria-label="下一条例句"
                              >
                                <ChevronRight size={16} />
                              </button>
                            </div>
                          )}
                        </div>
                        <p className="english-example">
                          {ex.enParts.map((p, i) =>
                            p.bold ? (
                              <strong key={i}>{p.text}</strong>
                            ) : (
                              <span key={i}>{p.text}</span>
                            ),
                          )}
                        </p>
                        {ex.zh && <p className="chinese-example">{ex.zh}</p>}
                        {ex.sourceRaw && (
                          <p className="example-source">{ex.sourceRaw}</p>
                        )}
                      </section>
                    )}
                  </div>
                )}
              </article>
              <p className="study-whisper">
                <LeafMark />
                慢慢来，派蒙会一直陪着你。
              </p>
            </main>
            <footer className="rating-panel">
              {!revealed ? (
                <>
                  <button
                    className="primary-button reveal-button"
                    onClick={() => setRevealed(true)}
                    disabled={busy}
                  >
                    <Eye size={19} />
                    查看释义
                    <ChevronRight size={19} />
                  </button>
                  <p>先回忆，再确认，记忆会更牢固。</p>
                </>
              ) : (
                <>
                  <p>这次记住了吗？按真实感受选择就好。</p>
                  <div className="rating-buttons">
                    {[
                      {
                        rating: "unknown" as const,
                        label: "不认识",
                        hint: "10 分钟后",
                        Icon: X,
                      },
                      {
                        rating: "fuzzy" as const,
                        label: "有点模糊",
                        hint: "明天巩固",
                        Icon: HelpCircle,
                      },
                      {
                        rating: "known" as const,
                        label: "记住了",
                        hint: "间隔复习",
                        Icon: Check,
                      },
                    ].map(({ rating, label, hint, Icon }) => (
                      <button
                        key={rating}
                        className={`rate-${rating}`}
                        disabled={busy || !!error}
                        onClick={() => rate(rating)}
                      >
                        <Icon size={22} />
                        <strong>{label}</strong>
                        <span>{hint}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </footer>
          </>
        )
      )}
    </div>
  );
}
function LeafMark() {
  return <Sparkles size={13} />;
}

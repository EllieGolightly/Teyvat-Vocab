import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, ChevronRight, Clock3, Leaf, Sparkles } from "lucide-react";
import AppShell, { PageHeading, Star } from "@/components/AppShell";
import { useAppData } from "@/components/DataProvider";
import { getAllWordStates } from "@/lib/db";

export default function ReviewPage() {
  const { stats } = useAppData();
  const [next, setNext] = useState<number | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    getAllWordStates()
      .then((states) => {
        if (active)
          setNext(
            states
              .filter((s) => s.status !== "new" && s.nextReview > Date.now())
              .sort((a, b) => a.nextReview - b.nextReview)[0]?.nextReview ??
              null,
          );
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [stats]);
  if (!stats) return null;
  const due = stats.today.reviewDue;
  return (
    <AppShell>
      <main id="main-content" className="inner-content">
        <PageHeading eyebrow="REVISIT THE STARS" title="让记忆，再亮一点" />
        <section className="review-hero parchment">
          <div className="round-emblem">
            <BookOpen size={32} />
            <Star />
          </div>
          <span className="eyebrow">等待温习的单词</span>
          <div className="review-number">
            {due}
            <span>词</span>
          </div>
          <h2>
            {due
              ? "老朋友们，等你回来"
              : stats.totalLearned
                ? "此刻的复习已经完成"
                : "你的旅程，从第一词开始"}
          </h2>
          <p>
            {due
              ? "用一次短暂的重逢，让记忆停留得更久。"
              : stats.totalLearned
                ? "到期的单词会在这里等你，不必一次记住所有。"
                : "学过的单词，会按记忆进度出现在这里。"}
          </p>
          <Link
            className="primary-button"
            to={due ? "/study?mode=review" : "/study"}
          >
            <Sparkles size={19} />
            {due
              ? "开始复习"
              : stats.today.remaining
                ? "去学新词"
                : "查看今日完成情况"}
            <ChevronRight size={19} />
          </Link>
        </section>
        <section className="parchment info-card">
          <div className="section-title">
            <h2>
              <Clock3 size={18} />
              下一次重逢
            </h2>
          </div>
          <p>
            {error
              ? "暂时无法读取复习时间，请刷新重试。"
              : next
                ? new Date(next).toLocaleString("zh-CN", {
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "学过第一组单词后，就会生成复习安排。"}
          </p>
          <span className="subtle small">
            今日已复习 {stats.today.reviewed} 次 · {stats.mastered} 词已熟练
          </span>
        </section>
        <div className="quiet-tip">
          <Leaf size={20} />
          <p>
            不认识的词，10 分钟后再见。
            <br />
            有点模糊，明天再温习；记住了，就隔一段时间重逢。
          </p>
        </div>
      </main>
    </AppShell>
  );
}

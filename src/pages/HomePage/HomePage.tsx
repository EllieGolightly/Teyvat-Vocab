import { useState } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  CalendarDays,
  ChevronRight,
  Heart,
  Leaf,
  Settings,
  Sparkles,
} from "lucide-react";
import AppShell, { Star } from "@/components/AppShell";
import SettingsDialog from "@/components/SettingsDialog";
import { ASSETS, resolveAppUrl } from "@/lib/assets";
import { useAppData } from "@/components/DataProvider";
import { useDailyRegionQuote } from "@/hooks/use-daily-region-quote";
import { useTheme } from "@/components/ThemeProvider";
import "@/home-layout.css";

export default function HomePage() {
  const { theme } = useTheme();
  const { stats } = useAppData();
  const [settings, setSettings] = useState(false);
  const quote = useDailyRegionQuote(theme.id);
  if (!stats) return null;
  const { today } = stats;
  const percent = Math.min(100, (today.newCompleted / today.dailyGoal) * 100);
  const remainingNew = Math.max(0, today.dailyGoal - today.newCompleted);
  return (
    <AppShell className="home-shell">
      <main id="main-content" className="home-content">
        <header className="brand-header">
          <div>
            <Link to="/" className="brand">
              <Star />
              <h1>Teyvat Vocab</h1>
            </Link>
            <p className="brand-tagline">One word, a greater journey.</p>
          </div>
          <div className="header-actions">
            <Link to="/progress" className="round-button" aria-label="学习日历">
              <CalendarDays size={21} />
            </Link>
            <button
              className="round-button"
              onClick={() => setSettings(true)}
              aria-label="设置"
            >
              <Settings size={21} />
            </button>
          </div>
        </header>
        <section className="welcome-scene" aria-label="旅行伙伴">
          <span className="scene-date">
            {new Date().toLocaleDateString("zh-CN", {
              month: "long",
              day: "numeric",
              weekday: "long",
            })}
          </span>
          <img
            className="hero-companions"
            src={resolveAppUrl(theme.assets.hero)}
            alt={`派蒙和旅行者${theme.traveler}在${theme.name}陪你学习`}
            fetchPriority="high"
          />
        </section>
        <section className="progress-card parchment" aria-label="今日学习进度">
          <div className="progress-overview">
            <div
              className="progress-ring"
              role="progressbar"
              aria-label="每日新词目标"
              aria-valuemin={0}
              aria-valuemax={today.dailyGoal}
              aria-valuenow={Math.min(today.newCompleted, today.dailyGoal)}
            >
              <svg viewBox="0 0 112 112">
                <circle className="ring-track" cx="56" cy="56" r="49" />
                <circle
                  className="ring-value"
                  cx="56"
                  cy="56"
                  r="49"
                  strokeDasharray={`${percent * 3.079} 308`}
                />
              </svg>
              <Star className="ring-star" />
            </div>
            <div className="today-count">
              <span className="stat-label">今日新学</span>
              <div className="big-number">
                {today.newCompleted}
                <span> / {today.dailyGoal}</span>
              </div>
              <p>
                {remainingNew
                  ? `再学 ${remainingNew} 词，点亮今日星光`
                  : "今日目标已达成，做得很棒"}{" "}
                <Heart size={12} />
              </p>
            </div>
            <div className="study-days">
              <span className="stat-label">
                学习天数 <Leaf size={13} />
              </span>
              <div className="big-number">
                {stats.studyDays}
                <span> 天</span>
              </div>
            </div>
          </div>
          <Link
            className="primary-button start-button"
            to={today.remaining > 0 ? "/study" : "/review"}
          >
            <Sparkles size={22} />
            <span>
              {today.remaining > 0
                ? today.newCompleted || today.reviewed
                  ? "继续背单词"
                  : "开始背单词"
                : "查看复习安排"}
            </span>
            <ChevronRight size={22} />
          </Link>
        </section>
        <section className="plan-card parchment">
          <div className="section-title">
            <h2>
              <Star />
              今日计划
            </h2>
            <button onClick={() => setSettings(true)} className="text-link">
              编辑计划 <ChevronRight size={16} />
            </button>
          </div>
          <Link to="/library" className="book-plan">
            <img src={ASSETS.bookIllustration} alt="星纹词书" />
            <div>
              <span className="book-kicker">CET-6 · 核心词汇</span>
              <h3>大学英语六级 · 核心词汇</h3>
              <div className="plan-progress">
                <div>
                  <span style={{ width: `${percent}%` }} />
                </div>
                <span>
                  {today.newCompleted} / {today.dailyGoal}
                </span>
              </div>
              <p>{theme.companionCaption}</p>
            </div>
          </Link>
          <Link className="review-strip" to="/review">
            <span>
              <BookOpen size={15} />
              {today.reviewDue > 0
                ? `还有 ${today.reviewDue} 词等待复习`
                : "复习计划已为你准备好"}
            </span>
            <span>
              去看看 <ChevronRight size={14} />
            </span>
          </Link>
        </section>
        <aside className="venti-banner">
          <img src={resolveAppUrl(theme.assets.portrait)} alt={theme.character} />
          <div>
            <blockquote cite={quote?.sourceUrl} title={quote?.source}>
              {quote ? `“ ${quote.text} ”` : '\u00a0'}
            </blockquote>
            <span>—— {theme.character}</span>
          </div>
          <Star className="quote-star" />
        </aside>
        <p className="home-footer">
          每一个单词，都是旅途中的一颗星。
          <Star />
        </p>
      </main>
      <SettingsDialog open={settings} onOpenChange={setSettings} />
    </AppShell>
  );
}

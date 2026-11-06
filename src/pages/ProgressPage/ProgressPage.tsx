import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  CalendarDays,
  Flame,
  Leaf,
  Settings,
  Star as StarIcon,
  Trophy,
} from "lucide-react";
import AppShell, { PageHeading, Star } from "@/components/AppShell";
import SettingsDialog from "@/components/SettingsDialog";
import { useAppData } from "@/components/DataProvider";
import { ASSETS } from "@/lib/assets";

export default function ProgressPage() {
  const { stats } = useAppData();
  const [settings, setSettings] = useState(false);
  const { hash } = useLocation();
  useEffect(() => {
    if (hash === "#achievements")
      document
        .getElementById("achievements")
        ?.scrollIntoView({ block: "start" });
  }, [hash]);
  if (!stats) return null;
  const max = Math.max(
    5,
    ...stats.weekly.map((s) => s.newLearned + s.reviewed),
  );
  const weekTotal = stats.weekly.reduce(
    (sum, s) => sum + s.newLearned + s.reviewed,
    0,
  );
  const awards = [
    {
      label: "旅途初始",
      desc: "学习第一个单词",
      done: stats.totalLearned >= 1,
      Icon: StarIcon,
    },
    {
      label: "风的来信",
      desc: "累计学习 50 词",
      done: stats.totalLearned >= 50,
      Icon: Leaf,
    },
    {
      label: "星光收藏家",
      desc: "累计学习 100 词",
      done: stats.totalLearned >= 100,
      Icon: Trophy,
    },
    {
      label: "七日之约",
      desc: "连续学习 7 天",
      done: stats.streak >= 7,
      Icon: Flame,
    },
  ];
  return (
    <AppShell>
      <main id="main-content" className="inner-content">
        <PageHeading eyebrow="YOUR LITTLE CONSTELLATION" title="旅途中的每一步">
          <button
            className="round-button"
            aria-label="设置"
            onClick={() => setSettings(true)}
          >
            <Settings size={20} />
          </button>
        </PageHeading>
        <section className="profile-card parchment">
          <img src={ASSETS.paimonTraveler} alt="旅行伙伴" />
          <div>
            <span className="eyebrow">TRAVELER'S JOURNAL</span>
            <h2>旅行者的学习手记</h2>
            <p>已经一起走过了 {stats.studyDays} 个学习日。</p>
          </div>
        </section>
        <div className="metric-grid">
          <div className="parchment">
            <strong>{stats.totalLearned}</strong>
            <span>累计学习 · 词</span>
          </div>
          <div className="parchment">
            <strong>{stats.streak}</strong>
            <span>连续学习 · 天</span>
          </div>
          <div className="parchment">
            <strong>{stats.mastered}</strong>
            <span>熟练掌握 · 词</span>
          </div>
        </div>
        <section className="parchment weekly-card">
          <div className="section-title">
            <h2>
              <CalendarDays size={18} />
              最近七天
            </h2>
            <span className="subtle small">共 {weekTotal} 次学习</span>
          </div>
          <div
            className="weekly-bars"
            role="img"
            aria-label={stats.weekly
              .map(
                (s) =>
                  `${s.date} 新学 ${s.newLearned} 词，复习 ${s.reviewed} 次`,
              )
              .join("；")}
          >
            {stats.weekly.map((s, i) => (
              <div className="bar-column" key={s.date}>
                <span className="bar-value">
                  {s.newLearned + s.reviewed || "·"}
                </span>
                <div className="bar-area">
                  <div
                    className="bar-stack"
                    style={{
                      height: `${((s.newLearned + s.reviewed) / max) * 100}%`,
                    }}
                  >
                    <span className="bar-review" style={{ flex: s.reviewed }} />
                    <span className="bar-new" style={{ flex: s.newLearned }} />
                  </div>
                </div>
                <span>
                  {i === 6
                    ? "今天"
                    : new Date(`${s.date}T12:00:00`)
                        .toLocaleDateString("zh-CN", { weekday: "short" })
                        .replace("周", "")}
                </span>
              </div>
            ))}
          </div>
          <div className="chart-legend">
            <span>
              <i />
              新学词数
            </span>
            <span>
              <i />
              复习次数
            </span>
          </div>
        </section>
        <section className="parchment book-progress-card">
          <div className="section-title">
            <h2>
              <Star />
              词书足迹
            </h2>
            <span>
              {stats.totalLearned} / {stats.totalWords}
            </span>
          </div>
          <div className="thin-track">
            <span
              style={{
                width: `${stats.totalWords ? (stats.totalLearned / stats.totalWords) * 100 : 0}%`,
              }}
            />
          </div>
          <p className="subtle small">
            CET-6 · 核心词汇，已探索{" "}
            {stats.totalWords
              ? ((stats.totalLearned / stats.totalWords) * 100).toFixed(
                  stats.totalLearned / stats.totalWords < 0.01 ? 2 : 1,
                )
              : 0}
            %
          </p>
        </section>
        <section className="parchment achievement-card" id="achievements">
          <div className="section-title">
            <h2>
              <Trophy size={18} />
              旅行成就
            </h2>
          </div>
          <div className="awards">
            {awards.map(({ label, desc, done, Icon }) => (
              <div key={label} className={done ? "unlocked" : ""}>
                <span className="award-icon">
                  <Icon size={24} />
                </span>
                <strong>{label}</strong>
                <small>{desc}</small>
                <em>{done ? "已点亮" : "待点亮"}</em>
              </div>
            ))}
          </div>
        </section>
        <p className="page-footnote">学习记录保存在当前浏览器中。</p>
      </main>
      <SettingsDialog open={settings} onOpenChange={setSettings} />
    </AppShell>
  );
}

import { useEffect, useState } from "react";
import { Check, Download, Leaf, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { getPrefs, updatePrefs } from "@/lib/prefs";
import { getOrCreateDailyQueue } from "@/lib/study-engine";
import { useAppData } from "@/components/DataProvider";
import { usePWAInstall, useServiceWorkerStatus } from "@/hooks/use-pwa";
import { useTheme } from "@/components/ThemeProvider";
import { THEMES, getTheme } from "@/lib/themes";
import { resolveAppUrl } from "@/lib/assets";

export default function SettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [goal, setGoal] = useState(String(getPrefs().dailyGoal));
  const [saving, setSaving] = useState(false);
  const { refreshStats } = useAppData();
  const { canInstall, isInstalled, isIOSSafari, promptInstall } =
    usePWAInstall();
  const { offlineReady, swStatus } = useServiceWorkerStatus();
  const { theme, changingThemeId, setTheme } = useTheme();
  useEffect(() => {
    if (open) setGoal(String(getPrefs().dailyGoal));
  }, [open]);
  const save = async () => {
    const value = Number(goal);
    if (!Number.isInteger(value) || value < 5 || value > 100) {
      toast.error("请输入 5 到 100 之间的整数");
      return;
    }
    setSaving(true);
    try {
      updatePrefs({ dailyGoal: value });
      await getOrCreateDailyQueue();
      await refreshStats();
      toast.success(`每日目标已设为 ${value} 词，今日计划已更新`);
      onOpenChange(false);
    } catch {
      toast.error("计划更新失败，请重试");
    } finally {
      setSaving(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="teyvat-dialog">
        <DialogHeader>
          <span className="eyebrow">AT YOUR OWN PACE</span>
          <DialogTitle>旅行设置</DialogTitle>
          <DialogDescription>安排今天的步调，也挑一处喜欢的风景。</DialogDescription>
        </DialogHeader>
        <label className="field-label" htmlFor="daily-goal">
          每日新学单词 <span>5–100 词</span>
        </label>
        <div className="goal-options">
          {[10, 20, 30, 50].map((n) => (
            <button
              key={n}
              className={Number(goal) === n ? "selected" : ""}
              onClick={() => setGoal(String(n))}
            >
              {n}
              <small>词</small>
            </button>
          ))}
        </div>
        <input
          id="daily-goal"
          className="text-input"
          type="number"
          inputMode="numeric"
          min={5}
          max={100}
          step={1}
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
        />
        <p className="subtle small">
          调整后立即生效。已经学过的单词和学习记录都会保留，复习量另计。
        </p>
        <button className="primary-button" disabled={saving} onClick={save}>
          <Check size={18} />
          {saving ? "保存中…" : "保存计划"}
        </button>
        <section className="theme-settings" aria-labelledby="theme-picker-title">
          <div className="theme-picker-heading">
            <h3 id="theme-picker-title">旅途风景</h3>
            <p>点选即保存，学习计划和记录照常保留。</p>
          </div>
          <div className="theme-picker" role="group" aria-labelledby="theme-picker-title">
            {THEMES.map((option) => {
              const selected = theme.id === option.id;
              const loading = changingThemeId === option.id;
              return (
                <button
                  type="button"
                  key={option.id}
                  className={`theme-choice${selected ? " is-selected" : ""}`}
                  aria-pressed={selected}
                  aria-busy={loading}
                  aria-label={`${option.name} · ${option.title}，${option.character}，旅行者${option.traveler}`}
                  disabled={loading}
                  onClick={() => {
                    void setTheme(option.id).catch((error: unknown) => {
                      toast.error(error instanceof Error ? error.message : "风景切换失败，请重试。");
                    });
                  }}
                >
                  <span className="theme-choice-cover" style={{ backgroundColor: option.palette.sky }}>
                    <img src={resolveAppUrl(option.assets.background)} alt="" loading="lazy" decoding="async" />
                    {(selected || loading) && (
                      <span className="theme-choice-badge" aria-hidden="true">
                        {loading ? <LoaderCircle size={16} className="animate-spin" /> : <Check size={16} />}
                      </span>
                    )}
                  </span>
                  <span className="theme-choice-copy">
                    <strong>{option.name}</strong>
                    <span>{option.title}</span>
                    <small>{option.character} · 旅伴{option.traveler}</small>
                  </span>
                </button>
              );
            })}
          </div>
          <p className="theme-picker-status" role="status" aria-live="polite">
            {changingThemeId
              ? `正在准备${getTheme(changingThemeId).name}的风景…`
              : `当前风景：${theme.name} · ${theme.title}`}
          </p>
        </section>
        <div className="settings-note">
          <Leaf size={18} />
          <div>
            <strong>
              {offlineReady
                ? "离线资源已就绪"
                : swStatus === "error"
                  ? "离线资源尚未准备好"
                  : "学习记录保存在此设备"}
            </strong>
            <p>
              {offlineReady
                ? "断网后也可以继续背词。"
                : "首次使用请联网；清除网站数据会删除学习记录。"}
            </p>
          </div>
        </div>
        {!isInstalled &&
          (canInstall ? (
            <button className="secondary-button" onClick={promptInstall}>
              <Download size={17} />
              添加到主屏幕
            </button>
          ) : (
            <p className="subtle small">
              {isIOSSafari
                ? "在 Safari 中点“分享 → 添加到主屏幕”，就可以像 App 一样打开。"
                : "可在浏览器菜单中将 Teyvat Vocab 添加到主屏幕。"}
            </p>
          ))}
      </DialogContent>
    </Dialog>
  );
}

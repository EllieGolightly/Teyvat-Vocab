import { useEffect, useState } from "react";
import { Check, Download, Leaf } from "lucide-react";
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
          <DialogTitle>调整旅行计划</DialogTitle>
          <DialogDescription>按自己的节奏，每天向前一点点。</DialogDescription>
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

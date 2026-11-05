import { Image } from '@/components/ui/image';
import { ASSETS } from '@/lib/assets';

interface Props {
  newCompleted: number;
  dailyGoal: number;
  reviewed: number;
  onStart: () => void;
  onEditGoal: () => void;
}

export default function TodayPlanWidget({ newCompleted, dailyGoal, reviewed, onStart, onEditGoal }: Props) {
  const pct = Math.min(100, Math.round((newCompleted / Math.max(1, dailyGoal)) * 100));

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl bg-white/70 backdrop-blur-md border border-white/40 shadow-sm p-4 md:p-5 flex flex-col">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs text-muted-foreground font-medium">今日计划</div>
          <div className="mt-1 text-2xl font-bold text-foreground">
            {newCompleted}
            <span className="text-sm text-muted-foreground font-normal"> / {dailyGoal}</span>
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">新学单词</div>
        </div>
        <button
          onClick={onEditGoal}
          className="text-xs text-primary/80 hover:text-primary px-2 py-1 rounded-md hover:bg-primary/10 transition-colors shrink-0 min-h-[32px]"
        >
          编辑
        </button>
      </div>

      {/* progress bar */}
      <div className="mt-4 h-2 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mt-2 text-xs text-muted-foreground">
        复习 {reviewed} 个
      </div>

      {/* Book illustration thumbnail */}
      <div className="mt-auto pt-3 flex items-end justify-between">
        <div className="text-sm text-muted-foreground/80 italic">
          「风会记住你的努力」
        </div>
        <button
          onClick={onStart}
          className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium shadow-sm hover:shadow-md transition-all min-h-[44px] active:scale-[0.98]"
        >
          {newCompleted >= dailyGoal ? '继续学习' : '开始学习'}
        </button>
      </div>
    </div>
  );
}

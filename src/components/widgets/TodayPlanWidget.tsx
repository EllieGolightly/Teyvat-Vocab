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
    <div className="widget-surface relative flex h-full w-full flex-col overflow-hidden p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs font-medium text-muted-foreground">今日计划</div>
          <div className="mt-1 text-[28px] font-bold leading-8 text-foreground tabular-nums">
            {newCompleted}<span className="text-sm font-normal text-muted-foreground"> / {dailyGoal}</span>
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">新学单词</div>
        </div>
        <button
          type="button"
          onClick={onEditGoal}
          className="min-h-8 shrink-0 rounded-lg px-2 text-xs text-primary transition-colors hover:bg-white/20"
        >
          编辑
        </button>
      </div>

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/35">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-2 text-xs text-muted-foreground">复习 {reviewed} 个</div>

      <div className="mt-auto pt-2">
        <div className="mb-2 truncate text-[11px] italic text-muted-foreground">「风会记住你的努力」</div>
        <button
          type="button"
          onClick={onStart}
          className="h-10 w-full whitespace-nowrap rounded-xl bg-primary px-3 text-sm font-medium text-primary-foreground shadow-sm transition-all active:scale-[0.98]"
        >
          {newCompleted >= dailyGoal ? '继续学习' : '开始学习'}
        </button>
      </div>
    </div>
  );
}

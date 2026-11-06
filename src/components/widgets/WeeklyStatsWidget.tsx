import type { DailyStat } from '@/lib/db';

interface Props {
  weekly: DailyStat[];
}

export default function WeeklyStatsWidget({ weekly }: Props) {
  const values = weekly.map((day) => day.newLearned + day.reviewed);
  const maxVal = Math.max(1, ...values);
  const totalWeek = values.reduce((sum, value) => sum + value, 0);

  return (
    <div className="widget-surface relative flex h-full w-full flex-col overflow-hidden p-3">
      <div className="whitespace-nowrap text-[11px] font-medium text-muted-foreground">本周学习</div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-2xl font-bold leading-7 text-foreground tabular-nums">{totalWeek}</span>
        <span className="text-[10px] text-muted-foreground">词</span>
      </div>
      <div className="mt-auto flex h-5 items-end justify-between gap-[3px]" aria-label="最近七天学习趋势">
        {values.map((value, index) => (
          <div
            key={weekly[index].date}
            className={`flex-1 rounded-full ${index === values.length - 1 ? 'bg-primary' : 'bg-primary/30'}`}
            style={{ height: `${Math.max(12, (value / maxVal) * 100)}%` }}
          />
        ))}
      </div>
    </div>
  );
}

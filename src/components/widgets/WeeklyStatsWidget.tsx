import type { DailyStat } from '@/lib/db';

interface Props {
  weekly: DailyStat[];
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

export default function WeeklyStatsWidget({ weekly }: Props) {
  const maxVal = Math.max(1, ...weekly.map((d) => d.newLearned + d.reviewed));
  const totalWeek = weekly.reduce((sum, d) => sum + d.newLearned + d.reviewed, 0);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl bg-white/70 backdrop-blur-md border border-white/40 shadow-sm p-4 flex flex-col">
      <div className="text-xs text-muted-foreground font-medium">本周学习</div>
      <div className="mt-1 text-xl font-bold text-foreground">{totalWeek}</div>
      <div className="text-xs text-muted-foreground mb-2">个单词</div>

      <div className="mt-auto flex items-end justify-between gap-1 h-16">
        {weekly.map((day, i) => {
          const h = Math.max(2, Math.round(((day.newLearned + day.reviewed) / maxVal) * 100));
          const d = new Date(day.date);
          const dow = WEEKDAYS[d.getDay()];
          const isToday = i === weekly.length - 1;
          return (
            <div key={day.date} className="flex flex-col items-center gap-1 flex-1">
              <div
                className={`w-full rounded-t-md transition-all ${
                  isToday ? 'bg-primary' : 'bg-primary/30'
                }`}
                style={{ height: `${h}%`, minHeight: '4px' }}
              />
              <div className={`text-[10px] ${isToday ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
                {dow}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

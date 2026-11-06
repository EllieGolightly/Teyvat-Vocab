import { Flame } from 'lucide-react';

interface Props {
  streak: number;
}

export default function StreakWidget({ streak }: Props) {
  return (
    <div className="widget-surface relative flex h-full w-full flex-col overflow-hidden p-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-orange-100/40 bg-orange-100/35 text-orange-600">
        <Flame className="h-[18px] w-[18px]" strokeWidth={1.8} />
      </div>
      <div className="mt-auto">
        <div className="flex items-baseline gap-1 text-orange-700">
          <span className="text-2xl font-bold leading-7 tabular-nums">{streak}</span>
          <span className="text-[10px]">天</span>
        </div>
        <div className="mt-0.5 whitespace-nowrap text-[11px] text-orange-700/70">连续打卡</div>
      </div>
    </div>
  );
}

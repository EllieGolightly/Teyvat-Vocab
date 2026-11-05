import { Flame } from 'lucide-react';

interface Props {
  streak: number;
}

export default function StreakWidget({ streak }: Props) {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl bg-gradient-to-br from-amber-50/90 to-orange-50/80 backdrop-blur-md border border-orange-100/60 shadow-sm p-4 flex flex-col">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
          <Flame className="w-4 h-4 text-orange-500" />
        </div>
      </div>
      <div className="mt-auto">
        <div className="text-3xl font-bold text-orange-600 tabular-nums">{streak}</div>
        <div className="text-xs text-orange-500/80 mt-0.5">连续打卡（天）</div>
      </div>
    </div>
  );
}

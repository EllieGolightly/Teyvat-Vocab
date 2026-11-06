import { Award } from 'lucide-react';
import { toast } from 'sonner';

export default function AchievementsWidget() {
  return (
    <button
      type="button"
      className="widget-surface relative flex h-full w-full flex-col items-start overflow-hidden p-3 text-left transition-transform active:scale-[0.98]"
      onClick={() => toast.info('成就功能即将到来，敬请期待～')}
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-amber-100/40 bg-amber-100/30 text-amber-700">
        <Award className="h-[18px] w-[18px]" strokeWidth={1.8} />
      </div>
      <div className="mt-auto whitespace-nowrap text-xs font-medium text-foreground">旅行成就</div>
    </button>
  );
}

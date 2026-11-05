import { Heart } from 'lucide-react';
import { toast } from 'sonner';

export default function FavoritesWidget() {
  return (
    <div
      className="relative h-full w-full overflow-hidden rounded-2xl bg-white/50 backdrop-blur-md border border-white/30 shadow-sm p-3 flex flex-col items-center justify-center cursor-pointer hover:bg-white/70 transition-colors"
      onClick={() => {
        toast.info('收藏功能即将到来，敬请期待～');
      }}
    >
      <div className="w-10 h-10 rounded-full bg-pink-50 flex items-center justify-center mb-1.5">
        <Heart className="w-5 h-5 text-pink-400" />
      </div>
      <div className="text-xs text-foreground font-medium">我的收藏</div>
      <div className="text-[10px] text-muted-foreground mt-0.5">敬请期待</div>
    </div>
  );
}

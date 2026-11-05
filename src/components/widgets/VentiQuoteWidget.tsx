import { Image } from '@/components/ui/image';
import { ASSETS } from '@/lib/assets';

export default function VentiQuoteWidget() {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl bg-gradient-to-br from-sky-50/90 to-emerald-50/70 backdrop-blur-md border border-sky-100/60 shadow-sm p-4 flex items-center gap-3">
      <div className="w-14 h-14 shrink-0 rounded-full bg-white/60 flex items-center justify-center overflow-hidden">
        <Image
          src={ASSETS.ventiSticker}
          alt="温迪"
          className="w-full h-full object-contain"
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-muted-foreground mb-1">温迪的寄语</div>
        <div className="text-sm text-foreground leading-relaxed line-clamp-3 italic">
          「旅行者，今天也要认真背单词哦，风会把你的努力带到远方。」
        </div>
      </div>
    </div>
  );
}

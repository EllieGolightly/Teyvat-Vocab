import { Image } from '@/components/ui/image';
import { ASSETS } from '@/lib/assets';

export default function VentiQuoteWidget() {
  return (
    <div className="widget-surface relative flex h-full w-full items-center gap-2.5 overflow-hidden p-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/40 bg-white/25">
        <Image src={ASSETS.ventiSticker} alt="温迪" className="h-full w-full object-contain" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1 text-[11px] text-muted-foreground">温迪的寄语</div>
        <div className="line-clamp-2 text-xs italic leading-[1.45] text-foreground">
          「风会记住你的努力。」
        </div>
      </div>
    </div>
  );
}

import { Image } from '@/components/ui/image';
import { ASSETS } from '@/lib/assets';

export default function BookIllustrationWidget() {
  return (
    <div className="widget-surface relative flex h-full w-full flex-col overflow-hidden p-3">
      <div className="min-h-0 flex-1">
        <Image
          src={ASSETS.bookIllustration}
          alt="青蓝词书"
          className="h-full w-full object-contain drop-shadow-md"
        />
      </div>
      <div className="mt-1 shrink-0 text-center">
        <div className="text-xs font-medium text-cyan-800">CET6 词书</div>
        <div className="mt-0.5 whitespace-nowrap text-[10px] text-cyan-700/70">2,220 词 · 4,563 条例句</div>
      </div>
    </div>
  );
}

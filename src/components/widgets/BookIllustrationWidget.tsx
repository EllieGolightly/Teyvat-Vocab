import { Image } from '@/components/ui/image';
import { ASSETS } from '@/lib/assets';

export default function BookIllustrationWidget() {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-50/80 to-blue-50/60 backdrop-blur-md border border-cyan-100/50 shadow-sm p-0 flex items-center justify-center">
      <Image
        src={ASSETS.bookIllustration}
        alt="青蓝词书"
        className="w-4/5 h-4/5 object-contain drop-shadow-md"
      />
      <div className="absolute bottom-3 left-4 right-4 text-center">
        <div className="text-xs text-cyan-700/80 font-medium">CET6 词书</div>
        <div className="text-[10px] text-cyan-600/60">2,220 词 · 4,563 条例句</div>
      </div>
    </div>
  );
}

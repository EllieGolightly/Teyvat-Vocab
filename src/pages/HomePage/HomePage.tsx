import { useState, useCallback, useEffect, useRef } from 'react';
import { Image } from '@/components/ui/image';
import { ASSETS } from '@/lib/assets';
import { getPrefs, savePrefs, type WidgetLayoutItem, type WidgetType, type StickerPosition } from '@/lib/prefs';
import WidgetGrid from '@/components/WidgetGrid';
import TodayPlanWidget from '@/components/widgets/TodayPlanWidget';
import WeeklyStatsWidget from '@/components/widgets/WeeklyStatsWidget';
import StreakWidget from '@/components/widgets/StreakWidget';
import VentiQuoteWidget from '@/components/widgets/VentiQuoteWidget';
import BookIllustrationWidget from '@/components/widgets/BookIllustrationWidget';
import WordOfDayWidget from '@/components/widgets/WordOfDayWidget';
import FavoritesWidget from '@/components/widgets/FavoritesWidget';
import AchievementsWidget from '@/components/widgets/AchievementsWidget';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings, Plus, X, Edit3, Download, Wifi, WifiOff } from 'lucide-react';
import { toast } from 'sonner';
import { useAppData, useStartStudy } from '@/components/DataProvider';
import { usePWAInstall, useServiceWorkerStatus } from '@/hooks/use-pwa';

const WIDGET_CATALOG: Array<{ type: WidgetType; label: string; defaultColSpan: number; defaultRowSpan: number }> = [
  { type: 'today-plan', label: '今日计划', defaultColSpan: 2, defaultRowSpan: 2 },
  { type: 'weekly-stats', label: '本周统计', defaultColSpan: 2, defaultRowSpan: 1 },
  { type: 'streak', label: '连续打卡', defaultColSpan: 1, defaultRowSpan: 1 },
  { type: 'venti-quote', label: '温迪寄语', defaultColSpan: 2, defaultRowSpan: 1 },
  { type: 'book-illustration', label: '青蓝词书', defaultColSpan: 2, defaultRowSpan: 2 },
  { type: 'word-of-day', label: '今日一词', defaultColSpan: 2, defaultRowSpan: 1 },
  { type: 'favorites', label: '我的收藏', defaultColSpan: 1, defaultRowSpan: 1 },
  { type: 'achievements', label: '旅行成就', defaultColSpan: 1, defaultRowSpan: 1 },
];

export default function HomePage() {
  const { stats } = useAppData();
  const onStartStudy = useStartStudy();
  const prefs = getPrefs();
  const [widgets, setWidgets] = useState<WidgetLayoutItem[]>(prefs.widgets);
  const [stickers, setStickers] = useState<StickerPosition[]>(prefs.stickers);
  const [isEditMode, setIsEditMode] = useState(false);
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [goalInput, setGoalInput] = useState(String(prefs.dailyGoal));
  const [widgetLibraryOpen, setWidgetLibraryOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { canInstall, isInstalled, isIOSSafari, promptInstall } = usePWAInstall();
  const { swStatus, offlineReady } = useServiceWorkerStatus();

  const saveWidgets = useCallback((w: WidgetLayoutItem[]) => {
    setWidgets(w);
    const p = getPrefs();
    savePrefs({ ...p, widgets: w });
  }, []);

  const saveStickers = useCallback((s: StickerPosition[]) => {
    setStickers(s);
    const p = getPrefs();
    savePrefs({ ...p, stickers: s });
  }, []);

  const handleGoalSave = () => {
    const val = Math.max(5, Math.min(100, parseInt(goalInput, 10) || 20));
    const p = getPrefs();
    savePrefs({ ...p, dailyGoal: val });
    setGoalDialogOpen(false);
    toast.success(`每日目标已设为 ${val} 词`);
    // Refresh by reloading - simple approach for MVP
    setTimeout(() => window.location.reload(), 300);
  };

  const addWidget = (type: WidgetType) => {
    const catalog = WIDGET_CATALOG.find((w) => w.type === type);
    if (!catalog) return;

    // Find next available spot
    const cols = prefs.gridCols;
    const existing = widgets;
    let row = 0;
    let col = 0;
    let found = false;
    const maxRows = 20;

    for (let r = 0; r < maxRows && !found; r++) {
      for (let c = 0; c <= cols - catalog.defaultColSpan && !found; c++) {
        const collides = existing.some((w) => {
          return (
            c < w.col + w.colSpan &&
            c + catalog.defaultColSpan > w.col &&
            r < w.row + w.rowSpan &&
            r + catalog.defaultRowSpan > w.row
          );
        });
        if (!collides) {
          row = r;
          col = c;
          found = true;
        }
      }
    }

    const newWidget: WidgetLayoutItem = {
      id: `w-${Date.now()}`,
      type,
      col,
      row,
      colSpan: catalog.defaultColSpan,
      rowSpan: catalog.defaultRowSpan,
    };

    saveWidgets([...widgets, newWidget]);
    setWidgetLibraryOpen(false);
    toast.success(`已添加「${catalog.label}」`);
  };

  const removeWidget = (id: string) => {
    saveWidgets(widgets.filter((w) => w.id !== id));
  };

  const toggleWidgetSize = (id: string) => {
    saveWidgets(
      widgets.map((w) => {
        if (w.id !== id) return w;
        // Toggle between 1x and 2x span (both dimensions)
        const newColSpan = w.colSpan === 1 ? 2 : 1;
        const newRowSpan = w.rowSpan === 1 ? 2 : 1;
        return { ...w, colSpan: newColSpan, rowSpan: newRowSpan };
      })
    );
  };

  const renderWidget = (w: WidgetLayoutItem) => {
    const content = (() => {
      switch (w.type) {
        case 'today-plan':
          return (
            <TodayPlanWidget
              newCompleted={stats.today.newCompleted}
              dailyGoal={stats.today.dailyGoal}
              reviewed={stats.today.reviewed}
              onStart={onStartStudy}
              onEditGoal={() => {
                setGoalInput(String(stats.today.dailyGoal));
                setGoalDialogOpen(true);
              }}
            />
          );
        case 'weekly-stats':
          return <WeeklyStatsWidget weekly={stats.weekly} />;
        case 'streak':
          return <StreakWidget streak={stats.streak} />;
        case 'venti-quote':
          return <VentiQuoteWidget />;
        case 'book-illustration':
          return <BookIllustrationWidget />;
        case 'word-of-day':
          return <WordOfDayWidget />;
        case 'favorites':
          return <FavoritesWidget />;
        case 'achievements':
          return <AchievementsWidget />;
        default:
          return <div className="h-full w-full rounded-2xl bg-white/50 p-4 text-sm">未知组件</div>;
      }
    })();

    if (!isEditMode) return content;

    return (
      <div className="relative h-full w-full group">
        {content}
        {/* edit overlay */}
        <div className="absolute inset-0 bg-primary/10 backdrop-blur-[1px] rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <button
            className="w-9 h-9 rounded-full bg-white shadow-md flex items-center justify-center text-foreground hover:bg-muted transition-colors min-h-[36px]"
            onClick={(e) => { e.stopPropagation(); toggleWidgetSize(w.id); }}
            title="切换尺寸"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            className="w-9 h-9 rounded-full bg-destructive text-destructive-foreground shadow-md flex items-center justify-center hover:opacity-90 transition-opacity min-h-[36px]"
            onClick={(e) => { e.stopPropagation(); removeWidget(w.id); }}
            title="删除组件"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  // Sticker drag
  const stickerDragInfo = useRef<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null);

  const handleStickerPointerDown = (e: React.PointerEvent, sticker: StickerPosition) => {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    stickerDragInfo.current = {
      id: sticker.id,
      startX: e.clientX,
      startY: e.clientY,
      origX: sticker.x,
      origY: sticker.y,
    };
  };

  const handleStickerPointerMove = (e: React.PointerEvent) => {
    if (!stickerDragInfo.current) return;
    const container = e.currentTarget as HTMLElement;
    const rect = container.getBoundingClientRect();
    const dxPct = ((e.clientX - stickerDragInfo.current.startX) / rect.width) * 100;
    const dyPct = ((e.clientY - stickerDragInfo.current.startY) / rect.height) * 100;
    const newX = Math.max(0, Math.min(90, stickerDragInfo.current.origX + dxPct));
    const newY = Math.max(0, Math.min(90, stickerDragInfo.current.origY + dyPct));

    setStickers(
      stickers.map((s) =>
        s.id === stickerDragInfo.current!.id ? { ...s, x: newX, y: newY, zIndex: s.zIndex + 10 } : s
      )
    );
  };

  const handleStickerPointerUp = () => {
    if (stickerDragInfo.current) {
      saveStickers(stickers);
    }
    stickerDragInfo.current = null;
  };

  if (!stats) return null;

  return (
    <div
      className="relative min-h-screen w-full overflow-x-hidden"
      style={{
        backgroundImage: `url(${ASSETS.mondstadtBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center top',
        backgroundAttachment: 'fixed',
      }}
      onPointerMove={handleStickerPointerMove}
      onPointerUp={handleStickerPointerUp}
    >
      {/* overlay gradient for readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-sky-100/40 via-transparent to-background/30 pointer-events-none" />

      {/* top bar */}
      <header className="sticky top-0 z-30 w-full">
        <div className="backdrop-blur-md bg-white/30 border-b border-white/20">
          <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-white/60 flex items-center justify-center overflow-hidden shadow-sm">
                <Image src={ASSETS.appIcon} alt="logo" className="w-full h-full object-cover" />
              </div>
              <span className="font-semibold text-foreground">Teyvat Vocab</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setWidgetLibraryOpen(true)}
                className="w-10 h-10 rounded-full bg-white/50 hover:bg-white/70 backdrop-blur-sm border border-white/40 flex items-center justify-center text-foreground transition-colors min-h-[40px]"
                aria-label="组件库"
              >
                <Plus className="w-5 h-5" />
              </button>
              <button
                onClick={() => setIsEditMode(!isEditMode)}
                className={`w-10 h-10 rounded-full backdrop-blur-sm border flex items-center justify-center transition-colors min-h-[40px] ${
                  isEditMode
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-white/50 hover:bg-white/70 border-white/40 text-foreground'
                }`}
                aria-label="编辑布局"
              >
                <Edit3 className="w-5 h-5" />
              </button>
              <button
                onClick={() => {
                  setGoalInput(String(getPrefs().dailyGoal));
                  setSettingsOpen(true);
                }}
                className="w-10 h-10 rounded-full bg-white/50 hover:bg-white/70 backdrop-blur-sm border border-white/40 flex items-center justify-center text-foreground transition-colors min-h-[40px]"
                aria-label="设置"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* main content */}
      <main className="relative z-10 max-w-2xl mx-auto px-4 py-6">
        {/* date greeting */}
        <div className="mb-4">
          <div className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })}
          </div>
          <h1 className="text-2xl font-bold text-foreground mt-1">
            {stats.today.newCompleted >= stats.today.dailyGoal ? '今天也很棒！' : '旅行者，开始今天的学习吧'}
          </h1>
        </div>

        {/* widget grid */}
        <WidgetGrid
          cols={prefs.gridCols}
          rowHeight={88}
          gap={12}
          widgets={widgets}
          onWidgetsChange={saveWidgets}
          isEditMode={isEditMode}
          renderWidget={renderWidget}
        />

        {/* bottom padding for stickers */}
        <div className="h-40" />
      </main>

      {/* sticker layer */}
      <div className="fixed inset-0 pointer-events-none z-20">
        {stickers.map((s) => {
          let imgSrc = '';
          let width = 'clamp(100px, 25vw, 180px)';
          if (s.id === 'paimon-traveler') {
            imgSrc = ASSETS.paimonTraveler;
          }
          if (!imgSrc) return null;
          return (
            <div
              key={s.id}
              className="absolute pointer-events-auto cursor-grab active:cursor-grabbing select-none touch-none"
              style={{
                left: `${s.x}%`,
                top: `${s.y}%`,
                width,
                zIndex: s.zIndex,
                filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))',
              }}
              onPointerDown={(e) => handleStickerPointerDown(e, s)}
            >
              <Image src={imgSrc} alt="伙伴贴纸" className="w-full h-auto" draggable={false} />
            </div>
          );
        })}
      </div>

      {/* edit mode indicator */}
      {isEditMode && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-foreground text-background px-4 py-2 rounded-full text-sm shadow-lg">
            编辑模式 · 拖动组件调整位置
          </div>
        </div>
      )}

      {/* Goal dialog */}
      <Dialog open={goalDialogOpen} onOpenChange={setGoalDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>每日新学目标</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="goal">每天新学单词数</Label>
              <Input
                id="goal"
                type="number"
                min={5}
                max={100}
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                建议 15-30 词/天。新目标从明天起生效。
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setGoalDialogOpen(false)}>取消</Button>
            <Button onClick={handleGoalSave}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settings dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>设置</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-6">
            {/* 每日目标 */}
            <div className="space-y-2">
              <Label htmlFor="goal-setting">每天新学单词数</Label>
              <Input
                id="goal-setting"
                type="number"
                min={5}
                max={100}
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                建议 15-30 词/天。新目标从明天起生效。
              </p>
            </div>

            <div className="border-t border-border/50" />

            {/* 离线 / PWA 状态 */}
            <div className="space-y-3">
              <div className="text-sm font-medium">离线可用</div>
              <div className="flex items-center gap-2 text-sm">
                {offlineReady ? (
                  <>
                    <Wifi className="w-4 h-4 text-success" />
                    <span className="text-foreground">已缓存，断网也能继续学习</span>
                  </>
                ) : swStatus === 'dev-mode' ? (
                  <>
                    <Wifi className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">开发模式，不启用离线缓存</span>
                  </>
                ) : swStatus === 'unsupported' ? (
                  <>
                    <WifiOff className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">当前浏览器不支持离线缓存</span>
                  </>
                ) : (
                  <>
                    <Wifi className="w-4 h-4 text-muted-foreground animate-pulse" />
                    <span className="text-muted-foreground">正在准备离线资源…</span>
                  </>
                )}
              </div>
            </div>

            <div className="border-t border-border/50" />

            {/* 添加到主屏幕 */}
            <div className="space-y-3">
              <div className="text-sm font-medium">添加到主屏幕</div>
              {isInstalled ? (
                <p className="text-sm text-success">
                  已作为独立应用安装，享受沉浸式学习体验 ✨
                </p>
              ) : canInstall ? (
                <Button
                  onClick={async () => {
                    const ok = await promptInstall();
                    if (ok) {
                      toast.success('已添加到主屏幕');
                    }
                  }}
                  className="w-full gap-2"
                >
                  <Download className="w-4 h-4" />
                  安装 Teyvat Vocab
                </Button>
              ) : isIOSSafari ? (
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>请手动添加：</p>
                  <ol className="list-decimal list-inside space-y-0.5 text-xs">
                    <li>点击底部的分享按钮</li>
                    <li>选择「添加到主屏幕」</li>
                    <li>确认后即可从桌面打开</li>
                  </ol>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  当前浏览器暂不支持一键安装，可在菜单中选择「添加到主屏幕」或「安装应用」。
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => {
                setSettingsOpen(false);
                setGoalInput(String(getPrefs().dailyGoal));
              }}
            >
              取消
            </Button>
            <Button onClick={() => {
              handleGoalSave();
              setSettingsOpen(false);
            }}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Widget library */}
      <Dialog open={widgetLibraryOpen} onOpenChange={setWidgetLibraryOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>组件库</DialogTitle>
          </DialogHeader>
          <div className="py-2 grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto">
            {WIDGET_CATALOG.map((w) => {
              const added = widgets.some((x) => x.type === w.type);
              return (
                <button
                  key={w.type}
                  onClick={() => addWidget(w.type)}
                  disabled={added}
                  className={`p-3 rounded-xl border text-left transition-all min-h-[64px] ${
                    added
                      ? 'bg-muted border-border opacity-60 cursor-not-allowed'
                      : 'bg-white hover:bg-muted border-border hover:border-primary/50'
                  }`}
                >
                  <div className="text-sm font-medium">{w.label}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {w.defaultColSpan}×{w.defaultRowSpan}
                  </div>
                  <div className="text-xs text-primary mt-1">{added ? '已添加' : '点击添加'}</div>
                </button>
              );
            })}
          </div>
          <DialogFooter>
            <Button onClick={() => setWidgetLibraryOpen(false)}>完成</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

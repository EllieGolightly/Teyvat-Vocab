export const THEME_IDS = ['mondstadt', 'liyue', 'inazuma', 'sumeru', 'fontaine', 'natlan', 'snezhnaya', 'nodkrai'] as const;
export type ThemeId = (typeof THEME_IDS)[number];
export const DEFAULT_THEME_ID: ThemeId = 'mondstadt';

export interface Theme {
  id: ThemeId;
  name: string;
  title: string;
  character: string;
  traveler: '空' | '荧';
  companionCaption: string;
  palette: {
    sky: string; primary: string; primaryDeep: string; ink: string;
    muted: string; paper: string; wash: string; gold: string;
  };
  assets: { background: string; hero: string; portrait: string };
}

const art = (name: string) => `assets/themes/${name}.webp`;

export const THEMES: Theme[] = [
  {
    id: 'mondstadt', name: '蒙德', title: '风起之诗', character: '温迪', traveler: '空',
    companionCaption: '和派蒙一起，把新词变成老朋友。',
    palette: { sky: '#91bce8', primary: '#8185cd', primaryDeep: '#6e70ac', ink: '#514b68', muted: '#77718d', paper: '#fffaf2', wash: '#e9e6f4', gold: '#dfbe85' },
    assets: { background: 'assets/mondstadt-bg.png', hero: 'assets/companions-hero.png', portrait: 'assets/venti-sticker.webp' },
  },
  {
    id: 'liyue', name: '璃月', title: '岩港拾光', character: '钟离', traveler: '荧',
    companionCaption: '把日积月累，写成自己的故事。',
    palette: { sky: '#e9b58b', primary: '#ab7d4e', primaryDeep: '#89623f', ink: '#5e4b3c', muted: '#82705f', paper: '#fff9ee', wash: '#f3e7d2', gold: '#d2a65d' },
    assets: { background: art('liyue-bg'), hero: art('lumine-lantern'), portrait: art('zhongli') },
  },
  {
    id: 'inazuma', name: '稻妻', title: '樱雨浮梦', character: '雷电影', traveler: '荧',
    companionCaption: '花开有时，今天也有新的收获。',
    palette: { sky: '#baa8de', primary: '#9574b5', primaryDeep: '#795994', ink: '#584368', muted: '#81708f', paper: '#fff8fc', wash: '#eee3f4', gold: '#c7a2ca' },
    assets: { background: art('inazuma-bg'), hero: art('lumine-sakura'), portrait: art('raiden') },
  },
  {
    id: 'sumeru', name: '须弥', title: '森间新芽', character: '纳西妲', traveler: '空',
    companionCaption: '让知识的小小种子，慢慢发芽。',
    palette: { sky: '#a8cebb', primary: '#678c69', primaryDeep: '#49734f', ink: '#3f5949', muted: '#6a7f70', paper: '#fbfcef', wash: '#e5edda', gold: '#b8bd7c' },
    assets: { background: art('sumeru-bg'), hero: art('aether-reading'), portrait: art('nahida') },
  },
  {
    id: 'fontaine', name: '枫丹', title: '水色间奏', character: '芙宁娜', traveler: '荧',
    companionCaption: '下一幕，轮到你闪闪发光。',
    palette: { sky: '#9dbfe4', primary: '#658db5', primaryDeep: '#466e99', ink: '#3e536f', muted: '#6c8098', paper: '#f8fbff', wash: '#e1ebf6', gold: '#c9b98c' },
    assets: { background: art('fontaine-bg'), hero: art('lumine-tea'), portrait: art('furina') },
  },
  {
    id: 'natlan', name: '纳塔', title: '暖阳与焰', character: '玛薇卡', traveler: '空',
    companionCaption: '带上好奇与勇气，再向前一步。',
    palette: { sky: '#eab09b', primary: '#b7735a', primaryDeep: '#96583f', ink: '#634638', muted: '#8b6d5e', paper: '#fff9ef', wash: '#f4e3d4', gold: '#d3a15c' },
    assets: { background: art('natlan-bg'), hero: art('aether-adventure'), portrait: art('mavuika') },
  },
  {
    id: 'snezhnaya', name: '至冬', title: '雪境微光', character: '冰之女皇', traveler: '荧',
    companionCaption: '每一点积累，都有悄悄融雪的力量。',
    palette: { sky: '#adbfda', primary: '#7a90b3', primaryDeep: '#5b7398', ink: '#48566d', muted: '#748199', paper: '#f9fbff', wash: '#e6ebf5', gold: '#b9c6d7' },
    assets: { background: art('snezhnaya-bg'), hero: art('lumine-snow'), portrait: art('tsaritsa') },
  },
  {
    id: 'nodkrai', name: '挪德卡莱', title: '月下轻歌', character: '哥伦比娅', traveler: '空',
    companionCaption: '把今天学会的，藏进月光里。',
    palette: { sky: '#818caf', primary: '#8382b5', primaryDeep: '#646394', ink: '#4a4b6c', muted: '#777b98', paper: '#faf9ff', wash: '#e9e7f6', gold: '#c8c6e8' },
    assets: { background: art('nodkrai-bg'), hero: art('aether-moon'), portrait: art('columbina') },
  },
];

export function getTheme(id?: string): Theme {
  return THEMES.find(theme => theme.id === id) ?? THEMES[0];
}

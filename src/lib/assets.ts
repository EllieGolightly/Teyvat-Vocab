// 本地打包的素材（随项目一起部署，PWA 离线可用）
// 统一使用 Vite 注入的 base，兼容 GitHub Pages /Teyvat-Vocab/ 子路径。
const BASE_URL = import.meta.env.BASE_URL || '/';

export function resolveAppUrl(path = ''): string {
  const cleanPath = path.replace(/^\.?\//, '');
  return `${BASE_URL}${cleanPath}`;
}

export const ASSETS = {
  mondstadtBg: resolveAppUrl('assets/mondstadt-bg.png'),
  paimonTraveler: resolveAppUrl('assets/paimon-traveler.webp'),
  bookIllustration: resolveAppUrl('assets/book-illustration.webp'),
  ventiSticker: resolveAppUrl('assets/venti-sticker.webp'),
  appIcon: resolveAppUrl('icons/icon-512.png'),
  appIconSmall: resolveAppUrl('icons/icon-192.png'),
  favicon: resolveAppUrl('icons/favicon-32.png'),
};

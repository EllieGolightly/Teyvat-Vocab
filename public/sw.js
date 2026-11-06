/* Teyvat Vocab Service Worker
 * 版本化缓存策略：
 *  - APP_SHELL：HTML/JS/CSS 等构建产物，新版本全量替换
 *  - LEXICON：词书 JSON，单独缓存，避免每次发版都重下 4MB
 *  - ASSETS：图片/图标等长期不变资源，缓存优先
 *  - 仅缓存 GET 请求，导航请求走网络优先 + 离线回退
 */

const APP_VERSION = 'v11';
const SHELL_CACHE = `teyvat-shell-${APP_VERSION}`;
const LEXICON_CACHE = `teyvat-lexicon-v1`;
const ASSET_CACHE = `teyvat-assets-v1`;

// 从相对路径解析 base（兼容 GitHub Pages 子目录部署）
function getBaseUrl() {
  // self.registration.scope 已包含正确的 base path
  return new URL('./', self.registration.scope).pathname;
}

// 预缓存的核心资源（路径相对于 scope）
const PRECACHE_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
];

const PRECACHE_ASSETS = [
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-192-maskable.png',
  './icons/icon-512-maskable.png',
  './icons/favicon-32.png',
  './icons/apple-touch-icon.png',
  './assets/mondstadt-bg.png',
  './assets/paimon-traveler.webp',
  './assets/companions-hero.png',
  './assets/book-illustration.webp',
  './assets/venti-sticker.webp',
  ...[
    'liyue-bg', 'inazuma-bg', 'sumeru-bg', 'fontaine-bg',
    'natlan-bg', 'snezhnaya-bg', 'nodkrai-bg',
    'zhongli', 'raiden', 'nahida', 'furina', 'mavuika', 'tsaritsa', 'columbina',
    'lumine-lantern', 'lumine-sakura', 'aether-reading', 'lumine-tea',
    'aether-adventure', 'lumine-snow', 'aether-moon',
  ].map((name) => `./assets/themes/${name}.webp`),
];

const PRECACHE_LEXICON = [
  './cet6-words.json',
];

// ========== install：预缓存 ==========
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      // 任一核心资源失败都让安装失败，避免把“半缓存”误报为离线可用。
      await Promise.all([
        precacheShell(),
        caches.open(ASSET_CACHE).then((cache) => cache.addAll(PRECACHE_ASSETS)),
        caches.open(LEXICON_CACHE).then((cache) => cache.addAll(PRECACHE_LEXICON)),
      ]);
      await self.skipWaiting();
    })()
  );
});

async function precacheShell() {
  const cache = await caches.open(SHELL_CACHE);
  await cache.addAll(PRECACHE_SHELL);

  // Vite 的 JS/CSS 文件名带构建 hash，从构建后的 index.html 发现它们，
  // 确保首次加载后即使尚未二次访问，也能离线启动。
  const response = await fetch('./index.html', { cache: 'no-cache' });
  if (!response.ok) throw new Error(`Shell HTML HTTP ${response.status}`);
  const html = await response.text();
  const scope = self.registration.scope;
  const scopeUrl = new URL(scope);
  const assets = [];

  for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    const url = new URL(match[1], scope);
    const isBuildAsset = /\.(?:js|css)$/.test(url.pathname);
    if (url.origin === scopeUrl.origin && url.pathname.startsWith(scopeUrl.pathname) && isBuildAsset) {
      assets.push(url.href);
    }
  }

  await cache.addAll([...new Set(assets)]);
}

// ========== activate：清理旧缓存 ==========
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      const keep = new Set([SHELL_CACHE, LEXICON_CACHE, ASSET_CACHE]);
      await Promise.all(
        cacheNames
          .filter((name) => name.startsWith('teyvat-') && !keep.has(name))
          .map((name) => caches.delete(name))
      );
      await self.clients.claim();
    })()
  );
});

// ========== fetch：路由缓存策略 ==========
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // 只处理 GET 请求
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // 跳过后缀为 .map 的 sourcemap 请求
  if (url.pathname.endsWith('.map')) return;

  // 跳过跨域非白名单请求（如第三方统计、字体等）
  const scope = self.registration.scope;
  const scopeOrigin = new URL(scope).origin;
  if (url.origin !== scopeOrigin) {
    // 跨域走网络，不缓存
    return;
  }

  // 1. 词书 JSON：缓存优先，长期不变
  if (url.pathname.endsWith('cet6-words.json')) {
    event.respondWith(cacheFirst(request, LEXICON_CACHE));
    return;
  }

  // Built JS/CSS live under /assets too, but are precached in SHELL_CACHE.
  // Match them first so the first offline restart can find the precached files.
  if (/\.(?:js|css)$/.test(url.pathname)) {
    event.respondWith(cacheFirst(request, SHELL_CACHE));
    return;
  }

  // 2. 图标 / 素材：缓存优先
  if (
    url.pathname.includes('/icons/') ||
    url.pathname.includes('/assets/') ||
    url.pathname.endsWith('.svg')
  ) {
    event.respondWith(cacheFirst(request, ASSET_CACHE));
    return;
  }

  // 3. 导航请求（HTML 页面）：网络优先，离线回退到缓存的 index.html
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstWithOfflineFallback(request));
    return;
  }

  // 4. 构建产物（JS/CSS 带 hash）：缓存优先（vite 构建文件名带 hash，版本天然隔离）
  if (
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.includes('/assets/')
  ) {
    event.respondWith(cacheFirst(request, SHELL_CACHE));
    return;
  }

  // 5. 其他：网络优先，失败读缓存
  event.respondWith(networkFirst(request, SHELL_CACHE));
});

// ========== 缓存策略函数 ==========

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    // 离线且无缓存
    return Response.error();
  }
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    return Response.error();
  }
}

async function networkFirstWithOfflineFallback(request) {
  try {
    const response = await fetch(request);
    // 导航请求正常返回，也缓存一份
    if (response.ok) {
      const cache = await caches.open(SHELL_CACHE);
      await cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    // 离线：返回缓存的 index.html（SPA 单页应用，所有路由都回首页）
    const cache = await caches.open(SHELL_CACHE);
    const fallback = await cache.match('./index.html');
    if (fallback) return fallback;

    // 极端情况：连 index.html 都没缓存
    return new Response(
      '<!doctype html><html><meta charset="utf-8"><title>离线</title>' +
        '<body style="font-family:sans-serif;padding:2rem;text-align:center">' +
        '<h2>网络断开</h2><p>当前无法加载应用，请检查网络后重试。</p>' +
        '<button onclick="location.reload()">重新加载</button></body></html>',
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
}

// ========== 消息通信 ==========
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data === 'GET_VERSION') {
    event.source?.postMessage({ type: 'SW_VERSION', version: APP_VERSION });
  }
});

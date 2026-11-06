import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { THEMES } from './src/lib/themes.ts';

const rawBase = process.env.VITE_BASE || process.env.CLIENT_BASE_PATH || '/';
const base = rawBase.endsWith('/') ? rawBase : `${rawBase}/`;

export default defineConfig({
  base,
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  server: { port: 8080 },
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'github-pages-fallback',
      transformIndexHtml() {
        // Paint the saved PWA inset before React or the scene image has loaded.
        const skies = Object.fromEntries(THEMES.map(theme => [theme.id, theme.palette.sky]));
        return [{
          tag: 'script',
          injectTo: 'head' as const,
          children: `try{const p=JSON.parse(localStorage.getItem('__miaoda_'+(window.appId||'__global__')+'__:teyvat_vocab_prefs')||'{}');const colors=${JSON.stringify(skies)};const sky=colors[p.themeId]||colors.mondstadt;document.documentElement.style.setProperty('--theme-sky',sky);document.documentElement.style.backgroundColor=sky;document.querySelector('meta[name="theme-color"]').content=sky;}catch{}`,
        }];
      },
      closeBundle() {
        const output = path.resolve(import.meta.dirname, 'dist/client');
        fs.copyFileSync(path.join(output, 'index.html'), path.join(output, '404.html'));
      },
    },
  ],
});

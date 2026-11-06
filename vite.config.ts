import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

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
      closeBundle() {
        const output = path.resolve(import.meta.dirname, 'dist/client');
        fs.copyFileSync(path.join(output, 'index.html'), path.join(output, '404.html'));
      },
    },
  ],
});

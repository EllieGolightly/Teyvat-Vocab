import path from 'path'
import { defineConfig } from '@lark-apaas/coding-preset-vite-react'

// base: 支持 GitHub Pages 项目页（子路径）部署
// 优先读 VITE_BASE 环境变量，其次继承 CLIENT_BASE_PATH
const rawBase = process.env.VITE_BASE || process.env.CLIENT_BASE_PATH || '/'
const normalizedBase = rawBase && !rawBase.endsWith('/') ? rawBase + '/' : rawBase

export default defineConfig({
  base: normalizedBase,
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@shared': path.resolve(__dirname, 'shared'),
    },
  },
  plugins: [
    // 替换 index.html 中的 %BASE_URL% 占位符（manifest / 图标等静态资源路径）
    {
      name: 'html-base-replace',
      transformIndexHtml(html: string) {
        return html.replace(/%BASE_URL%/g, normalizedBase)
      },
    },
  ],
})

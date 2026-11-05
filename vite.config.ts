import path from 'path'
import fs from 'node:fs'
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
    {
      name: 'github-pages-html',
      closeBundle() {
        // 平台预设会在 transformIndexHtml 之后注入运行时占位符与统计脚本。
        // 独立 Pages 构建在写盘后清理，避免模板标题、无效运行时请求和第三方追踪。
        if (!process.env.VITE_BASE) return
        const outputPath = path.resolve(__dirname, 'dist/client/index.html')
        let html = fs.readFileSync(outputPath, 'utf8')
        html = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, (script) =>
          /KSlardarWeb|slardarScript|LogAnalyticsObject|collectEvent|performance\.iife\.js/.test(script)
            ? ''
            : script,
        )
        const replacements: Record<string, string> = {
          appName: 'Teyvat Vocab',
          appDescription: '蒙德主题 CET6 背单词应用，2220 词 + 原神例句，支持离线',
          appId: '',
          userId: '',
          tenantId: '',
          userName: '',
          csrfToken: '',
          environment: 'production',
          basename: normalizedBase,
        }
        for (const [key, value] of Object.entries(replacements)) {
          html = html.replaceAll(`{{${key}}}`, value)
        }
        html = html.replace(/\{\{\{?appAvatar\}\}\}?/g, `${normalizedBase}icons/icon-192.png`)
        if (!html.includes('name="mobile-web-app-capable"')) {
          html = html.replace('</head>', '<meta name="mobile-web-app-capable" content="yes"></head>')
        }
        fs.writeFileSync(outputPath, html)
      },
    },
  ],
})

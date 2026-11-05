# Teyvat Vocab

> 蒙德主题 CET6 背单词应用 —— 2,220 词 / 4,563 条原神例句，支持离线使用

![Teyvat Vocab](public/icons/icon-512.png)

## ✨ 特性

- 📚 **完整 CET6 词书**：2,220 个核心词汇，4,563 条融入原神世界观的例句
- 🎮 **蒙德主题**：手绘玻璃质感小组件桌面，派蒙 & 旅行者伙伴贴纸
- 🧠 **间隔重复**：三级评价（不认识 / 模糊 / 认识）+ 分级复习算法
- 💾 **本地持久化**：学习记录、队列、统计全部存在 IndexedDB，关闭/刷新不丢失
- 📱 **PWA 离线可用**：安装到主屏幕，断网也能继续学习
- 🎨 **自由布局**：四列小组件网格，拖动、调整尺寸、添加/删除组件
- 🔒 **纯前端**：无账号、无后端、无云同步，所有数据留在本地

## 🚀 快速开始

### 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 本地预览构建产物
npm run preview
```

### 访问应用

打开浏览器访问 `http://localhost:5173`（默认端口）。

## 📖 功能说明

### 首页（小组件桌面）
- 四列小组件网格，可自由拖动布局
- 今日学习进度、本周统计、连续打卡
- 温迪寄语、青蓝词书插图
- 派蒙与旅行者贴纸可自由拖动

### 学习页
- 单词卡翻转揭示释义与例句
- 三级评价：不认识 / 模糊 / 认识
- 支持撤销上一次评价
- 学习完成后展示今日总结

### 数据与隐私
- **所有学习数据保存在浏览器本地**（IndexedDB），不会上传到任何服务器
- 清除浏览器数据会丢失学习记录，请谨慎操作
- 界面偏好（布局、贴纸位置、每日目标等）保存在 localStorage

### PWA 与离线
- 支持「添加到主屏幕」作为独立应用运行
- Service Worker 缓存应用壳、构建后的 JS/CSS、词书与图片资源
- **首次使用需要联网**并等待完整资源缓存，之后可离线使用
- PWA 功能需要 **HTTPS** 或 **localhost** 环境才能启用
- 代码检查和构建通过不等同于真机验证；部署后仍应在目标手机浏览器中测试安装、断网重开与学习记录恢复

## 🌐 GitHub Pages 部署

本项目配置了 GitHub Actions 自动部署：

1. Push 到 `main` 分支会自动触发构建和部署
2. 构建时使用 `VITE_BASE=/Teyvat-Vocab/` 以匹配项目页路径
3. 部署完成后访问 `https://<username>.github.io/Teyvat-Vocab/`

也可以手动触发：在仓库 **Actions → Deploy to GitHub Pages → Run workflow**。

### 手动部署

```bash
# 以 /Teyvat-Vocab/ 为 base 构建
VITE_BASE=/Teyvat-Vocab/ npm run build

# 产物在 dist/client/，部署到任意静态托管即可
```

## 📂 项目结构

```
├── public/
│   ├── assets/              # 静态素材（背景、贴纸、插图）
│   ├── icons/               # PWA 图标（192/512 + maskable）
│   ├── cet6-words.json      # 完整词书（2,220 词）
│   ├── manifest.webmanifest # PWA manifest
│   └── sw.js                # Service Worker
├── src/
│   ├── components/          # 组件 & widgets
│   ├── hooks/               # 自定义 hooks
│   ├── lib/                 # 数据层（IndexedDB / 学习引擎 / 偏好）
│   ├── pages/               # 页面
│   ├── app.tsx              # 路由配置
│   └── index.tsx            # 入口（含 SW 注册）
├── .github/workflows/       # GitHub Actions
├── vite.config.ts           # Vite 配置（支持 base 子路径）
└── package.json
```

## 🧩 技术栈

- **React 19** + **TypeScript**
- **Vite 8** 构建
- **Tailwind CSS 4** 样式
- **shadcn/ui** 组件库
- **IndexedDB** 本地数据持久化
- **Service Worker** 离线缓存（纯手写，无第三方 PWA 框架）

## 📝 说明

- 本项目为单用户学习工具，不提供账号系统和云同步
- 词书数据与素材随应用打包，运行时不依赖外部 CDN
- iOS Safari 需手动「分享 → 添加到主屏幕」获得 PWA 体验
- PWA / Service Worker 在 HTTP 环境下不会启用

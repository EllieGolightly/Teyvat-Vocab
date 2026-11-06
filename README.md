# Teyvat Vocab

> 蒙德主题 CET6 背单词应用 —— 2,220 词 / 4,563 条原神例句，支持离线使用

![Teyvat Vocab](public/icons/icon-512.png)

## ✨ 特性

- 📚 **完整 CET6 词书**：2,220 个核心词汇，4,563 条融入原神世界观的例句
- 🎮 **蒙德主题**：奶油白与淡紫色学习界面，蒙德风景和透明伙伴插画
- 🧠 **间隔重复**：先回忆再揭示释义，三级评价与独立到期复习
- 💾 **本地持久化**：学习记录、队列、统计全部存在 IndexedDB，关闭/刷新不丢失
- 📱 **PWA 离线可用**：安装到主屏幕，断网也能继续学习
- ⭐ **收藏与足迹**：词书搜索、收藏、最近七天记录与真实进度成就
- 🍃 **每日温迪语录**：内置已核对出处的角色语音短句，每天随机一句，当天保持不变
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

打开终端打印的 Local 地址（默认 `http://localhost:8080`）。

## 📖 功能说明

### 首页与导航
- 今日新学进度、累计学习天数、当前词书与到期复习入口
- 底部导航：首页 / 词书 / 复习 / 我的
- 每日新学目标为 5–100 词，修改后即时调整未学队列，保留已学记录
- 固定排版，原小组件桌面与拖拽布局入口已移除
- 温迪语录按设备本地日期每天随机选取，刷新不变，连续两次每日抽取避免重复；语录存于 `src/lib/venti-quotes.ts`，保留语音场景与核对来源

### 学习与复习
- 先回忆，再主动展开释义；查看例句、设备朗读、收藏
- 不认识：10 分钟后重新到期；有点模糊：1 天后复习；记住了：按等级延长间隔
- 独立复习只处理已到期的旧词，不消耗当日新词额度
- 支持撤销（含完成页最后一词）；原子保存单词、队列、统计、历史
- 退出、刷新可继续；重复点击不会评价下一张未看到的卡片
- 桌面快捷键：空格揭示，1 / 2 / 3 评价（按钮聚焦时保留原生键盘行为）

### 学习足迹
- 词书内英文 / 中文搜索、收藏筛选、单词详情
- 最近七天新学词数与复习次数、累计学习、连续学习天数
- 成就由真实学习数据计算；熟练掌握与累计学习分开计数
- 本轮完成只表示当前队列已完成，不代表单词已全部掌握

### 数据与隐私
- **所有学习数据保存在浏览器本地**（IndexedDB），不会上传到任何服务器
- 清除浏览器数据会丢失学习记录，请谨慎操作
- 每日目标、收藏与当日语录保存在 localStorage；历史布局数据保留但不再使用

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
│   ├── components/          # 共用界面组件
│   ├── hooks/               # 自定义 hooks
│   ├── lib/                 # 数据层（IndexedDB / 学习引擎 / 偏好）
│   ├── pages/               # 页面
│   ├── app.tsx              # 路由配置
│   └── index.tsx            # 入口（含 SW 注册）
├── .github/workflows/       # GitHub Actions
├── vite.config.ts           # Vite 配置（支持 base 子路径）
└── package.json
```

## 验证

```bash
npm test
npm run typecheck
VITE_BASE=/Teyvat-Vocab/ npm run build
```

回归覆盖撤销完整恢复、独立复习、每日目标即时调整、到期重入、防重复评价、事务失败回滚、旧版撤销兼容、词库失败重试，以及离线构建资源的缓存路由。构建会生成 `404.html` 以支持 GitHub Pages 上直接打开客户端路由。

2026-11-06 本地改版保留原数据库名称、版本和旧偏好存储键，不清除已有学习记录。独立网站采用标准 Vite/React 构建，已移除妙搭运行时、水印及平台接口调用。新插画 `public/assets/companions-hero.png` 使用内置 imagegen 按用户提供的参考图生成，提示词见 `docs/asset-generation.json`。

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

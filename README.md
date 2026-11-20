# Donghao Zhou · 周冬豪

个人学术主页，基于 Next.js、React 和 PRISM 构建，静态导出后由 GitHub Pages 托管。

站点地址：**https://correr-zhou.github.io/**

首页单页展示 About、News、Selected Papers，Awards 和 Services 为独立页面；`All Publications ↗` 直接跳转 Google Scholar 完整列表。

## 本地开发

需要 Node.js 22 和 npm；指标更新脚本需要 Python 3。

```sh
npm ci
npm run dev        # http://localhost:3000
```

构建与检查：

```sh
npm run lint
npm run typecheck
npm run build      # 输出到 out/
npm start          # 本地预览 out/
```

## 内容维护

| 内容 | 文件 |
| --- | --- |
| 个人信息、社交账号、导航、功能开关、统计 | `content/config.toml` |
| About 正文 | `content/bio.md` |
| News、Awards、Services | `content/news.toml`、`content/awards.toml`、`content/services.toml` |
| 论文条目与首页展示顺序 | `content/publications.bib`（`selected` / `selectedorder`） |
| 论文预览图和视频 | `public/papers/` |
| 海报、幻灯片等附件 | `public/resources/` |
| 头像 | `public/profile.jpg` |
| 指标来源配置 | `content/publication-metrics.json` |
| 指标快照 | `src/data/publicationMetrics.json` |

更新 Google Scholar 引用数和 GitHub stars：

```sh
python3 scripts/update_publication_metrics.py
```

来源暂时不可访问时保留上次成功抓取的数据。

## 功能开关

均位于 `content/config.toml` 的 `[features]`：

| 开关 | 默认 | 说明 |
| --- | --- | --- |
| `enable_affiliation_badges` | `false` | 头像框内的机构徽章物理动画 |
| `enable_chatbot` | `true` | 浏览器内运行的小聊天机器人，设备不支持时自动隐藏 |
| `enable_one_page_mode` | `true` | 首页单页模式 |

`[analytics]` 一节配置访客统计，留空即关闭对应服务。

## 部署

推送到 `main` 由 GitHub Actions 自动构建发布，同时保留手动触发和每天北京时间 08:20 的定时指标刷新。GitHub Pages 的发布来源需设置为 **GitHub Actions**。

站点部署在域名根路径；若改为 `username.github.io/repository/` 子路径，需要调整 Next.js 的 `basePath` 和资源路径。

## 来源

基于 [PRISM](https://github.com/xyjoey/PRISM) 修改，保留其 [MIT 许可证](LICENSE) 和页面署名。

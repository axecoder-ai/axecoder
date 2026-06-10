# WebSearch / WebRun — 选型记录

## 一句话需求回顾

在本系统实现 **WebSearch**（结束 stub，接真实搜索 API）与 **WebRun / 浏览器自动化**，补齐 `research-agent-tools-matrix.md` §7 联网缺口。

## 方案对比表

| 维度 | 提案 1 Serper + Electron WebRun | 提案 2 Serper + Playwright WebRun |
|------|--------------------------------|-----------------------------------|
| 核心思路 | 主进程隐藏 BrowserWindow 做自动化 | Playwright 子进程 JSON 协议驱动 Chromium |
| 主要改动范围 | agent-web + agent-browser(Electron) | agent-web + agent-browser-playwright + 新依赖 |
| 优点 | 无新依赖、打包轻 | snapshot/click 更可靠，对齐 DeepSeek web_run |
| 缺点 / 风险 | 自动化能力弱、SPA 脆弱 | 体积大、子进程冷启动、打包需 asarUnpack |
| 工作量 | 中 | 中–大 |
| 适合场景 | 仅需读页文本 | 需要可靠浏览器交互 |

## 关键差异说明

- 提案 1 用 Electron 自带 webContents，不下载 Chromium。
- 提案 2 引入 Playwright，自动化语义与行业实践一致。
- 两方案 WebSearch 均接 Serper REST API。
- WebRun 均作为一等 Agent 工具 `WebRun` 注册。

## 推荐方案

**推荐：提案 1 – Electron WebRun**（改动面小、无 Playwright 依赖）

## 用户最终选择

- **选定：提案 2 – 内置 Serper WebSearch + Playwright 子进程 WebRun**
- **调整说明：同时加 Settings 里 WebSearch API Key 配置 UI**

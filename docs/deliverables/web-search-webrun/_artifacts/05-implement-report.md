# 功能实现报告 — WebSearch / WebRun

## 功能说明

1. **WebSearch**：接入 Serper API（`POST https://google.serper.dev/search`），替换原 `webSearchStub` 恒失败行为；需 Settings 开启 `agentFeatureWebSearch` 并填写 API Key。
2. **WebRun**：新增 Playwright 子进程工具，支持 `navigate` / `snapshot` / `click` / `type` / `screenshot`；需 Settings 开启 `agentFeatureWebRun`；运行前需 `npx playwright install chromium`。
3. **Settings UI**：General → Agent 区增加 WebSearch 开关 + Serper Key（password）、WebRun 开关。

## 修改文件列表

| 路径 | 说明 |
|------|------|
| `electron/main/agent/agent-web.ts` | Serper 搜索实现 |
| `electron/main/agent/agent-browser-playwright.ts` | Playwright 子进程桥 |
| `electron/main/agent/browser-runner.mjs` | 子进程执行脚本 |
| `electron/main/agent/agent-types.ts` | 注册 WebRun |
| `electron/main/agent/agent-tool-prompts-ext.ts` | 工具 schema |
| `electron/main/agent/agent-ext-executor.ts` | 执行分支 |
| `electron/main/config-store.ts` | agentFeatureWebRun |
| `electron/main/models-types.ts` | 类型 |
| `src/types/axecoder.d.ts` | AppSettings 字段 |
| `src/components/workbench/GeneralTab.vue` | Settings UI |
| `shared/i18n/locales/en.ts` / `zh-CN.ts` | 文案 |
| `package.json` / `package-lock.json` | playwright 依赖 |
| `tests/unittest/UT-web-search-webrun/` | 单测 |

## 单测覆盖

- Serper 请求 mock、结果格式化
- Playwright 桥 JSON 协议（mock spawn）
- 工具注册、disabled 错误路径

## 注意事项

- 开发环境需执行一次：`npx playwright install chromium`
- `browser-runner.mjs` 路径：编译产物同目录或 `electron/main/agent/browser-runner.mjs`
- 打包分发 Playwright browsers 未在本轮处理（见遗留项）

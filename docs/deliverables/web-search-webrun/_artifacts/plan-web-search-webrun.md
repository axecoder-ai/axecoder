# WebSearch / WebRun 设计文档

**desired_location:** `docs/plans/plan-web-search-webrun.md`

## 当前背景

- `WebFetch` 可用；`WebSearch` 为 stub；无 `WebRun`。
- 配置字段 `agentFeatureWebSearch` / `agentWebSearchApiKey` 存在于 Main，Settings UI 未暴露。

## 需求

### 功能需求

- **WebSearch：** 调 Serper API（`POST https://google.serper.dev/search`），返回 title/link/snippet 列表；需开关 + API Key。
- **WebRun：** 工具参数 `action`（navigate | snapshot | click | screenshot）、`url`、`selector`、`text` 等；Playwright 子进程执行；需 `agentFeatureWebRun` 开关。
- **Settings UI：** Agent 区 toggle WebSearch + password 输入 API Key；toggle WebRun。

### 非功能需求

- HTTPS only；URL 校验；输出字符截断（与 WebFetch 一致量级）。
- 子进程超时 kill；错误信息明确。

## 实施计划

### 阶段一：WebSearch

1. `agent-web.ts` — `webSearch()` 调 Serper，删除 stub 行为
2. 更新 executor 调用 `webSearch`
3. UT mock `fetch`

### 阶段二：WebRun + Playwright

4. `browser-runner.mjs` — stdin JSON lines 协议
5. `agent-browser-playwright.ts` — spawn、请求/响应、会话复用
6. 注册 `WebRun` 工具 + executor 分支
7. `agentFeatureWebRun` 配置

### 阶段三：Settings + 类型

8. `axecoder.d.ts` 补字段
9. `GeneralTab.vue` WebSearch/WebRun 控件
10. i18n 文案（en/zh-CN 最小）

### 阶段四：测试与文档

11. `UT-web-search-webrun` 全覆盖
12. rppit 报告

## 测试策略

- Mock fetch（Serper）
- Mock child_process.spawn（Playwright 协议）
- `npm test` 全绿

## 依赖

- `playwright` npm 包；开发机 `npx playwright install chromium`

## 安全考量

- API Key 存本地 config；Settings 用 password input
- WebRun 仅 http(s)；可选拒绝 file://

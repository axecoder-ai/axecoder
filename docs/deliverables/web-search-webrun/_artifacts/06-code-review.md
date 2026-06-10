# 代码审查 — WebSearch / WebRun

## 结论

**通过（非阻塞）** — 本轮功能与方案一致；1 个全量套件中既有失败用例非本变更引入。

## 功能

| 项 | 状态 |
|----|------|
| WebSearch Serper API | ✅ |
| WebRun Playwright 子进程 | ✅ |
| 配置开关 + 明确错误 | ✅ |
| Settings UI | ✅ |
| 单测 UT-web-search-webrun | ✅ 9/9 |

## 安全

- WebSearch/WebRun 仅 http(s) URL
- API Key 本地 config，Settings 用 password input
- WebRun 非只读工具，未加入 plan 只读白名单（正确）

## 非阻塞待办

1. electron-builder 打包时复制 `browser-runner.mjs` 并 asarUnpack Playwright browsers
2. WebRun 长时间会话的子进程回收策略（app quit 时 shutdown）
3. 修复 `bash-integration.test.ts` mock 时序

## 阻塞项

无。

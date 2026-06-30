# 代码审查 — ACP 第三方嵌入

## 结论：**通过**（无阻塞项）

## 功能 / 规格

- [x] 提案 1：`axecoder acp` stdio 适配器已落地
- [x] 复用 agent-worker，未重复实现 Agent 循环
- [x] permission 路径覆盖 Write/Bash/Smart/Ask/Plan
- [x] `vite build` 产出 `dist-electron/main/acp-cli.js`

## 质量

- [x] 模块边界清晰：mapper / bridge / app / cli
- [x] Worker 路径解析不依赖 `electron.app`
- [x] 单测覆盖纯函数与 in-process 握手

## 安全

- [x] stdio 本地子进程，无网络监听
- [x] 工具执行仍走既有 permission / SmartMode 门控
- [x] API Key 不落盘到 ACP 协议

## 非阻塞待办

1. V2：`cursor/ask_question`、`cursor/create_plan` 扩展方法
2. ACP Registry 上架与打包内嵌 `axecoder-acp` 路径
3. AskQuestion 默认首项答案 — 待客户端结构化问答

## 审查范围

步骤 5 全部新增/修改文件，对照 `proposal-acp-third-party-embed.md` 与 `plan-acp-third-party-embed.md`。

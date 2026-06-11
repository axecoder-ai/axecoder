# Changelog

本文件记录 [AxeCoder](https://github.com/axecoder-ai/axecoder) 的版本变更。格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

> **说明**：Git 标签 `v0.5.0`、`v0.6.0` 与当时 `package.json` 中的 `0.3.0`、`0.6.0` 不完全一致；以下条目以 **package.json 版本** 为主，并在对应段落标注 Git 标签。

---

## [Unreleased]

---

## [0.8.0] - 2026-06-11

### Added

- Agent **ShellStdin**：交互式 stdin 与后台 Shell 取消（TaskStop）
- 斜杠命令工具化；内置 **bugbot**、**security-review** 子代理 Skill
- **CreatePlan** 工具与聊天 **Plan 卡片** UI（步骤勾选、Build 执行）
- **LLM 上下文压缩**（compact）与相关单测
- **WebSearch / WebRun** 增强（Playwright 浏览器、Serper 搜索）
- TypeScript：`shims-vue.d.ts`、`MonacoEnvironment` 全局类型声明
- v1.0.0 差距分析文档；各功能交付物文档

### Changed

- Agent 工具矩阵研究文档同步 ShellStdin / TaskStop / CreatePlan 等
- 重写 **CHANGELOG**（移除 electron-vite-vue 模板，按 git 历史整理）
- 工作台聊天、模型选择器、AI 指标面板等 UI 增强

---

## [0.7.0] - 2026-06-10

### Added

- **Codex Responses** 提供商；MCP 插件 OAuth 设置
- Agent：**Provider 抽象**、**SwitchMode**、**McpAuth**、**WebSearch** / **WebRun**
- LSP 工具：**ReadLints**、**FixLints**
- Workshop / Agent：**Coordinator** 统一引擎，multi-agent 对齐
- Workshop：按 locale / alwaysApply 规则**动态选择群聊回复语言**

### Changed

- `package.json` 版本升至 0.7.0

---

## [0.6.0] - 2026-06-09

Git 标签：[v0.6.0](https://github.com/axecoder-ai/axecoder/releases/tag/v0.6.0)

### Added

- **AI 性能面板**活动流；Agent / 工作台能力增强

---

## [0.3.0] - 2026-06-06

Git 标签：[v0.5.0](https://github.com/axecoder-ai/axecoder/releases/tag/v0.5.0)（标签名与 package 版本不一致）

### Added

- LLM **524 自动重试**；Agent **OS 沙箱**；**AI 指标追踪**与工作台增强

### Changed

- README 翻译为英文（2026-06-07）

---

## [0.1.0] - 2026-05-28

WritCraft 起步，后更名为 AxeCoder。

### Added

- **初始版本**（WritCraft）：Electron + Vue 3 + Monaco 工作台，多模型对话，项目会话持久化，聊天引用资源管理器文件
- Agent：**文件读写工具**与可扩展 **tool** 框架
- 背景资料 **`/init`**、欢迎页
- 对齐 **Claude Code 工具层**、运行时缺口与斜杠命令生态
- **MCP SDK**：真实 `CallMcpTool` 与资源读写
- UI：Agent **SSE 终端风进度流**；工作台布局与聊天**多标签**
- **协作工坊**（Workshop）：多角色 Agent、回合制路由、与 Chat 统一 UI
- **统一会话**、规则设置、模型分级路由
- 聊天：**自定义斜杠命令**、选择器 UI、diff 主题变量
- **Skills**：内置 Skill / 工作流命令与用户 Skill 绑定
- 聊天**粘贴图片**与多模态消息（Chat / Workshop / Agent）
- 聊天**模式**、**i18n**、rppit 流水线
- Agent：**bash** / **LSP** / **subagent** 对齐；工坊多 Agent 与 Skills 设置
- **GitHub / Gitee** 托管集成与 Agent **PR** 工作流
- **CodeGraph** 原生集成与 `@角色` 工作流

### Changed

- **WritCraft → AxeCoder** 品牌与产品定位重构（代码编写桌面 IDE）

---

[Unreleased]: https://github.com/axecoder-ai/axecoder/compare/v0.8.0...HEAD
[0.8.0]: https://github.com/axecoder-ai/axecoder/compare/b6e9390...v0.8.0
[0.7.0]: https://github.com/axecoder-ai/axecoder/compare/v0.6.0...b6e9390
[0.6.0]: https://github.com/axecoder-ai/axecoder/compare/v0.5.0...v0.6.0
[0.3.0]: https://github.com/axecoder-ai/axecoder/compare/5a7654e...v0.5.0
[0.1.0]: https://github.com/axecoder-ai/axecoder/commit/295776f

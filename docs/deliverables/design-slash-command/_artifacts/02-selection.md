# 方案选型记录

## 一句话需求回顾

为 AxeCoder 聊天增加 `/design` 斜杠命令：管理项目级 `DESIGN.md`（展示配色、列出内置主题、复制主题）；并在项目存在 `DESIGN.md` 时让 Agent 前端开发遵循其样式规范。

## 方案对比表

| 维度 | 提案 1 Main IPC + builtin | 提案 2 Renderer + 落盘规则 |
|------|---------------------------|---------------------------|
| 核心思路 | Main 集中实现，Agent prompt 动态注入 | Renderer 直读，复制时写 `.cursor/rules` |
| 主要改动范围 | agent-ipc、design-slash、builtin、system-prompt | slash-commands/design、fs-ipc、rules 模板 |
| 优点 | 与 /init、/style 一致；Agent 一定能读到规则 | 规则文件对用户可见 |
| 缺点 / 风险 | 需解析 YAML colors | 非 alwaysApply 规则 Agent 读不到，易重复 |
| 工作量 | 中 | 中偏大 |
| 适合场景 | 内置命令 + Agent 约束 | 强调 Cursor IDE 规则可见性 |

## 关键差异

- 提案 1 通过 `buildAgentSystemPrompt` 注入，保证 Agent 遵守 DESIGN.md。
- 提案 2 依赖 `.cursor/rules` 落盘，但 AxeCoder Agent 默认只加载 `alwaysApply` 规则。
- 设计库路径在 `APP_ROOT/design/`，非用户项目目录。
- 复制只写 `DESIGN.md`，不额外污染项目 rules 目录（提案 1）。

## 推荐方案

**推荐：提案 1 – Main IPC 集中 + builtin 注册**

理由：与现有斜杠命令架构一致；Agent 规则注入可靠；改动面可控。

## 用户最终选择

- **选定：** 提案 1 – Main IPC 集中 + builtin 注册
- **调整说明：** 无额外调整

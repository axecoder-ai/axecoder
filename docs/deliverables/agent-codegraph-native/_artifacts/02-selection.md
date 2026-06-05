# 选型记录

## 2a 选型摘要

### 一句话需求回顾

在 AxeCoder Electron 主进程内嵌入 tree-sitter + SQLite 代码知识图谱（等效将 `codegraph/` 搬进主进程），Agent 通过原生工具理解代码结构，而非依赖外部 MCP CLI。

### 方案对比表

| 维度 | 提案 1 npm 库依赖 + 薄封装 | 提案 2 源码 vendoring 完全内嵌 | 提案 3 自研 MVP（仅 TS/JS） |
|------|---------------------------|-------------------------------|---------------------------|
| 核心思路 | `file:./codegraph` 依赖 + manager 封装 | 迁移 `codegraph/src` 到 `electron/main/codegraph/` | 最小 tree-sitter + sqlite |
| 主要改动范围 | 封装层 + Agent 工具 | ~100+ 源文件 + 构建 + Agent | ~15 文件 |
| 优点 | 与 upstream 易同步 | 无 CJS/ESM 边界、可深度定制 | 最快可演示 |
| 缺点 / 风险 | 跨模块边界 | 工作量大、同步成本高 | 非完整 codegraph |
| 工作量 | 中 | 大 | 小 |
| 适合场景 | 快速上线、少分叉 | 长期内置、完全自控 | 概念验证 |

### 关键差异

- 提案 1 保留独立 `codegraph/` 包，AxeCoder 只写薄封装。
- 提案 2 图谱引擎成为 AxeCoder 一等源码，可裁剪语言与输出格式。
- 提案 3 无法覆盖多语言与调用图，与用户「搬进 codegraph」目标差距大。

### 推荐方案

**推荐：提案 1 – npm 库依赖 + Agent 原生工具**

理由：复用 upstream 全量能力，交付风险低于 120 文件迁移；与仓库已有 `codegraph/` 目录天然契合。

### 选型提示

下一步通过选择题确认。

## 2b 用户最终选择

- **选定提案：** 提案 2 – 源码 vendoring 进 `electron/main/codegraph/`（完全内嵌，可深度定制）
- **调整说明：** 无额外调整

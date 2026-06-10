# ReadLints 工具 设计文档

**desired_location:** `docs/plans/plan-read-lints-tool.md`

## 当前背景

- Cursor playbook 使用 `ReadLints`；AxeCoder 矩阵标记为未实现。
- 已有 LSP 基础设施（openFile + sendRequest），无诊断专用工具。
- Renderer problems 面板为占位，V1 以 Main LSP 为准。

## 需求

### 功能需求

- `ReadLints({ paths?: string[] })` 工具
- LSP `textDocument/diagnostic` pull
- 输出 `path:line:col severity message (source)` 格式
- `agentFeatureLsp` 开关；只读权限

### 非功能需求

- paths 省略时自动发现 ≤30 个源码文件
- 最小 diff；单测覆盖解析与格式化

## 实施计划

### 阶段一：核心模块

1. `agent-read-lints.ts` — parse、文件解析、LSP 调用
2. `lsp-formatters.ts` — formatDiagnosticsResult

### 阶段二：工具注册

3. agent-types、agent-tool-prompts-ext、agent-ext-executor
4. agent-permissions READ_ONLY_TOOLS

### 阶段三：测试

5. `UT-read-lints-tool` 单测
6. 全量 vitest

## 测试策略

- parseReadLintsInput、formatDiagnosticsResult 纯函数
- executeAgentReadLints mock LSP manager

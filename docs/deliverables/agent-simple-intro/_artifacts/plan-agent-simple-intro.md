# Agent getSimpleIntroSection 设计文档

## 当前背景

- Agent 系统提示在 `agent-tool-defs.ts` 中单字符串 `AGENT_SYSTEM_PROMPT_BASE`，无独立 intro 段。
- `agent-loop.ts` 通过 `buildAgentSystemPrompt(projectRoot)` 注入 `role: system`。
- Claude Code 在 `getSystemPrompt` 首部使用 `getSimpleIntroSection` + `CYBER_RISK_INSTRUCTION` + URL 规则。

## 需求

### 功能需求

- 导出 `getSimpleIntroSection()`，内容与 Claude Code §2 结构一致：身份 + cyber + URL。
- 身份句使用 AxeCoder 品牌（用户调整）。
- `buildAgentSystemPrompt` 顺序：`getSimpleIntroSection()` → 工具/任务规则 → project root 行。
- `agent-tool-defs.ts` re-export，保持 `agent-loop` import 稳定。

### 非功能需求

- 最小改动：`agent-loop.ts` 无逻辑变更。
- 单测覆盖 intro 关键字与完整组装。

## 设计决策

### 1. 模块拆分

新建 `agent-system-prompt.ts`，`agent-tool-defs.ts` 仅保留 `AGENT_TOOLS`。

### 2. 文案

- `CYBER_RISK_INSTRUCTION`：与 `claude-code-system-prompts-full.md` §3 英文一致。
- Intro 身份：`You are AxeCoder, an interactive agent that helps users with software engineering tasks...`
- 原 `You are AxeCoder coding assistant with file tools.` 从 doing-tasks 段删除，避免重复。

## 技术设计

### 文件变更

| 文件 | 操作 |
|------|------|
| `electron/main/agent/agent-system-prompt.ts` | 新增 |
| `electron/main/agent/agent-tool-defs.ts` | 修改 |
| `tests/unittest/UT-agent-system-prompt/agent-system-prompt.test.ts` | 新增 |
| `tests/unittest/UT-agent-glob/agent-tool-defs.test.ts` | 修改 |

## 实施计划

1. **单测先行**：断言 `getSimpleIntroSection` 含 AxeCoder、destructive techniques、URL；`buildAgentSystemPrompt` 含 Glob 与 project root。
2. **实现** `agent-system-prompt.ts`，调整 `agent-tool-defs.ts` re-export。
3. **运行** `npm test` 相关目录，全绿后写实现报告。

## 测试策略

- Vitest 单元测试（无 mock 网络）。
- 手工：Agents + OpenAI/Anthropic 模型发「搜索 buildAgentSystemPrompt 定义」类请求（可选，记入测试报告待补充）。

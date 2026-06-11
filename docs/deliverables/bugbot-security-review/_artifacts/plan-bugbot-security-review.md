# bugbot-security-review 设计文档

## 当前背景

- AxeCoder Chat Agent 已有 CC 对齐 Task 子代理（9 种 `subagent_type`）。
- Cursor 有 `bugbot`、`security-review` 专型 + review skill（固定 prompt 形状、readonly、子代理算 diff）。
- 矩阵 §5 标 AxeCoder 为「未实现」。

## 需求

### 功能需求

1. 注册 `bugbot`、`security-review` 两种 `subagent_type`（只读、专型 prompt）。
2. 新增 `agent-review-diff.ts`：解析 Cursor review prompt；支持 `branch changes` / `uncommitted changes`；默认 base 分支用 `getDefaultBranch`。
3. `runSubAgentTask` 在审查专型启动时预注入 diff + stat + custom instructions。
4. Task 工具 schema enum 与描述更新。
5. `.cursor/skills/review-bugbot`、`review-security` 对齐 Cursor 契约。
6. 主 Agent system 委派段补充审查用法。

### 非功能需求

- diff 输出截断 ~200k 字符（与 Bash 一致）。
- 非 git 仓库、无 diff 时返回明确错误文本，不抛未捕获异常。
- Workshop 路径零变更。

## 设计决策

### 1. Diff 预注入 vs 子代理 Bash

- **选择预注入**：与 Cursor skill「子代理自行算 diff」语义等价但由 harness 保证正确性；审查专型禁止 Bash（readOnly）。

### 2. branch changes 语义

- `git merge-base HEAD <base>` 得 merge-base，再 `git diff <merge-base>` 含已提交 + 暂存 + 工作区变更（对齐 Cursor skill 描述）。

### 3. 模型档位

- bugbot/security-review 走 `subagent` 档位（与 explore 同类审查任务）。

## 实施计划

| 阶段 | 任务 |
|------|------|
| 1 | 单测：prompt 解析、类型注册、fixture repo diff |
| 2 | `agent-review-diff.ts` |
| 3 | `agent-subagent-types.ts`、`agent-types.ts`、`model-resolve.ts` |
| 4 | `agent-subagent.ts` 注入逻辑 |
| 5 | `agent-tool-prompts.ts`、`agent-system-prompt.ts`、skills |
| 6 | `npm test` 全绿 |

## 文件变更

- 新增：`electron/main/agent/agent-review-diff.ts`
- 新增：`.cursor/skills/review-bugbot/SKILL.md`、`.cursor/skills/review-security/SKILL.md`
- 新增：`tests/unittest/UT-bugbot-security-review/`
- 修改：`agent-subagent-types.ts`、`agent-types.ts`、`agent-subagent.ts`、`agent-tool-prompts.ts`、`model-resolve.ts`、`agent-system-prompt.ts`

## 测试策略

- UT：`parseReviewSubagentPrompt`、`resolveReviewDiff`（临时 git 仓库）、`normalizeSubagentType('bugbot')`、工具过滤。
- 集成：手工 Chat Task 调用。

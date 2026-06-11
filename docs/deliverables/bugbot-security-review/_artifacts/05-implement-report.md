# 功能实现报告 — bugbot / security-review

## 功能说明

1. 新增 `bugbot`、`security-review` 两种 Task 子代理专型（只读、subagent 模型档位）。
2. 新增 `agent-review-diff.ts`：解析 Cursor review prompt 形状，用 git 计算 `branch changes` / `uncommitted changes`，启动时预注入 diff/stat。
3. `runSubAgentTask` 在审查专型自动调用 diff 预注入。
4. Task 工具 enum/描述、主 Agent 委派段、`.cursor/skills/review-bugbot|review-security` 对齐 Cursor 契约。

## 修改文件列表

| 文件 | 变更 |
|------|------|
| `electron/main/agent/agent-review-diff.ts` | 新增 |
| `electron/main/agent/agent-subagent-types.ts` | 扩展 enum + CONFIG |
| `electron/main/agent/agent-types.ts` | SubagentType 扩展 |
| `electron/main/agent/agent-subagent.ts` | 审查专型 user 消息预注入 |
| `electron/main/agent/agent-tool-prompts.ts` | Task 描述 |
| `electron/main/agent/agent-system-prompt.ts` | 委派提示 |
| `electron/main/ai/model-resolve.ts` | 审查专型 subagent 档位 |
| `.cursor/skills/review-bugbot/SKILL.md` | 新增 |
| `.cursor/skills/review-security/SKILL.md` | 新增 |
| `tests/unittest/UT-bugbot-security-review/bugbot-security-review.test.ts` | 新增 |

## 单测覆盖

- prompt 解析（Cursor 形状）
- 类型注册与只读工具过滤
- fixture git 仓库 uncommitted diff
- 非 git 目录错误
- formatReviewUserMessage 输出结构

## 注意事项

- diff 超过 ~200k 字符会截断（与 Bash 一致）。
- `branch changes` 依赖 merge-base；单分支本地仓库可能需显式 `Base Branch`。
- 审查质量依赖本地 LLM，非 Cursor 云端 Bugbot 规则。

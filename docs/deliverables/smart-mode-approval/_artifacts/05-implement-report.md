# 功能实现报告

## 功能说明

实现 Cursor Smart Mode 对齐的**智能审批**：

1. 设置项 `agentSmartModeApproval`（默认 **true**），GeneralTab 可关。
2. 对 Bash（非只读）、WebFetch、CallMcpTool、WebRun、Delete 在执行前调用 fast 模型 Auto-review。
3. `block` 时返回错误及 reason；Agent 带 `requestSmartModeApproval` + `smartModeBlockReason` 重试后展示 `ChatSmartApprovalCard`。
4. 用户 Approve 后跳过审查执行工具，后续 Write/Bash 审批链不变。
5. 关闭开关后完全不介入，行为与改前一致。

## 修改文件

| 路径 | 说明 |
|------|------|
| `electron/main/agent/agent-smart-review-params.ts` | 常量、门控、工具 schema 参数 |
| `electron/main/agent/agent-smart-review-classifier.ts` | LLM JSON 分类器 |
| `electron/main/agent/agent-smart-review.ts` | runSmartReview + pending 类型 |
| `electron/main/agent/agent-loop.ts` | 主循环门控、confirm/reject |
| `electron/main/agent/agent-types.ts` | PendingSmartApprovalPublic |
| `electron/main/agent/agent-session-store.ts` | pendingSmartById |
| `electron/main/agent/agent-tool-prompts*.ts` | 工具参数 |
| `electron/main/agent-ipc.ts` / `agent-worker/runner.ts` / `preload` | IPC |
| `electron/main/models-types.ts` / `config-store.ts` | 配置默认 true |
| `src/components/workbench/ChatSmartApprovalCard.vue` | 审批卡 UI |
| `src/components/workbench/ChatPane.vue` / `GeneralTab.vue` | 集成 |
| `shared/i18n/locales/*.ts` | 文案 |
| `tests/unittest/UT-smart-mode-approval/` | 单测 |

## 单测覆盖

- 分类器 JSON 解析、block 文案、shouldSmartReviewTool、开关默认/关闭、摘要函数。

## 注意事项

- 分类器失败/超时 **allow**（fail-open），避免 API 故障卡死 Agent。
- 与 `agentAutoApplyWrites` 独立：Smart Mode 优先于自动执行。
- 常量拆至 `agent-smart-review-params.ts` 避免与 `agent-tool-defs` 循环依赖。

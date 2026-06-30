# 智能审批（Smart Mode Approval）实施计划

**状态：** 待实施  
**slug：** `smart-mode-approval`

## 当前背景

- AxeCoder 有 Write/Bash 人工审批与权限规则，无 Cursor Smart Mode 执行前 Auto-review。
- 已有 `agent-auto-plan-classifier.ts` 可作分类器模板。

## 需求

### 功能需求

1. `agentSmartModeApproval` 开关，默认 **true**；false 时完全跳过。
2. 审查工具：Bash（非只读）、WebFetch、CallMcpTool、WebRun、Delete。
3. block → Agent 错误 + reason；`requestSmartModeApproval` → 智能审批卡。
4. 用户放行后执行工具，后续审批链不变。

### 非功能需求

- 分类器 3s 超时；失败时 **allow**（不阻断 Agent）。
- 单测覆盖解析、门控、开关关闭路径。

## 实施计划

1. 分类器 + 门控模块
2. agent-loop pending / confirm / reject
3. IPC + preload + UI 卡片
4. GeneralTab 开关 + config
5. 单测 + 交付文档

## 文件变更

| 文件 | 操作 |
|------|------|
| `electron/main/agent/agent-smart-review-classifier.ts` | 新建 |
| `electron/main/agent/agent-smart-review.ts` | 新建 |
| `electron/main/agent/agent-loop.ts` | 修改 |
| `electron/main/agent/agent-types.ts` | 修改 |
| `electron/main/agent/agent-session-store.ts` | 修改 |
| `electron/main/agent/agent-tool-prompts*.ts` | 修改 |
| `electron/main/agent-ipc.ts` | 修改 |
| `electron/main/agent-worker/runner.ts` | 修改 |
| `electron/main/models-types.ts` / `config-store.ts` | 修改 |
| `src/components/workbench/ChatSmartApprovalCard.vue` | 新建 |
| `src/components/workbench/ChatPane.vue` / `GeneralTab.vue` | 修改 |
| `tests/unittest/UT-smart-mode-approval/` | 新建 |

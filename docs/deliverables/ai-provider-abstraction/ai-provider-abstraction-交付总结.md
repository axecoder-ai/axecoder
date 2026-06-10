# AI Provider 抽象层 交付总结

| 字段 | 内容 |
|------|------|
| **任务名** | ai-provider-abstraction |
| **完成日期** | 2025-06-10 |
| **选定方案** | 提案 1 – Registry + Adapter 全量落地 |
| **审查结论** | 通过 |
| **单测（本轮范围）** | 27/27 全绿 |

---

## 1. 概述

将 AxeCoder 四个 AI Provider（OpenAI、Anthropic、Ollama、Codex）收敛为 **Registry + Adapter** 抽象层：聊天与 Agent 工具调用经统一接口分发，消除门面与 UI 中的硬编码分支。

**选型：** 用户选定提案 1，并要求一次性完成 plain chat + tools + UI/IPC capabilities（非分阶段）。

**交付物目录：** `docs/deliverables/ai-provider-abstraction/_artifacts/`

---

## 2. 方案

- 定义 `AiProviderAdapter`：`chat`、`chatWithTools`、`capabilities`
- 静态 Registry：`getProviderAdapter(provider)`
- 门面仅保留 vision guard、metrics、trace、API Key 校验
- `shared/ai/provider-capabilities.ts` 统一能力元数据
- IPC：`models:getProviderCapabilities`

详见 `_artifacts/proposal-ai-provider-abstraction.md`（状态：已确认）

---

## 3. 方案选型过程

| 维度 | 提案 1 | 提案 2 |
|------|--------|--------|
| 抽象调用 | ✅ | ❌ |
| 改动面 | 大 | 小 |
| 长期维护 | ✅ | ⚠️ |

**用户选择：** 提案 1 + 全量交付（无分阶段）

详见 `_artifacts/02-selection.md`

---

## 4. 实施计划

1. 基础设施：shared capabilities、provider-types、四 adapter、registry
2. 门面迁移：chat-with-provider、chat-with-tools
3. UI/IPC：ChatPane、ModelFormDialog、preload
4. 回归单测

详见 `_artifacts/plan-ai-provider-abstraction.md`

---

## 5. 实现说明

- 新增 8 个核心模块（shared + adapter + registry）
- 重构 2 个门面文件，删除全部 provider 分支
- Renderer 通过 `@shared/ai/provider-capabilities` 读取 SSE/API Key 规则
- Ollama Agent tools 委托 OpenAI adapter（行为与重构前一致）

详见 `_artifacts/05-implement-report.md`

---

## 6. 单元测试执行情况

- **本轮范围：** 27 passed / 27（全绿）
- **全量套件：** 571/573；2 失败为既有无关用例

详见 `_artifacts/05-unittest.md`、`_artifacts/05-unittest-raw.txt`

---

## 7. 测试报告

| 场景 | 结果 |
|------|------|
| Registry 四 Provider 注册 | ✅ 单测 |
| OpenAI plain chat reasoning | ✅ 单测 |
| Codex Responses wire/SSE | ✅ 单测 |
| OpenAI tools reasoning roundtrip | ✅ 单测 |
| models ping / workshop llm | ✅ 单测 |
| Agent 手工 tool 闭环 | 待补充（建议上线前） |

---

## 8. 代码审查

**结论：通过。** 无阻塞项；2 项非阻塞待办（provider 下拉动态化、全量套件 2 个既有失败）。

详见 `_artifacts/06-code-review.md`

---

## 9. 变更清单

| 路径 | 类型 | 说明 |
|------|------|------|
| `shared/ai/provider-capabilities.ts` | 新增 | 能力元数据 |
| `electron/main/ai/provider-types.ts` | 新增 | 接口定义 |
| `electron/main/ai/provider-registry.ts` | 新增 | 注册表 |
| `electron/main/ai/adapters/*.ts` | 新增 ×4 | Provider 实现 |
| `electron/main/ai/chat-with-provider.ts` | 修改 | 薄门面 |
| `electron/main/ai/chat-with-tools.ts` | 修改 | 薄门面 |
| `electron/main/models-types.ts` | 修改 | 委托 shared |
| `electron/main/models-ipc.ts` | 修改 | IPC |
| `electron/preload/index.ts` | 修改 | preload API |
| `src/types/axecoder.d.ts` | 修改 | 类型 |
| `src/components/workbench/ChatPane.vue` | 修改 | SSE |
| `src/components/workbench/ModelFormDialog.vue` | 修改 | 表单 |
| `tests/unittest/UT-ai-provider-abstraction/` | 新增 | 单测 |

---

## 10. 遗留项与后续建议

1. 手工验证 Agent 一轮 tool 闭环（openai / codex / anthropic）
2. 修复全量套件 2 个既有失败（与本轮无关）
3. ModelFormDialog provider 下拉可从 capabilities 动态生成
4. 第 5 Provider 接入时仅新增 adapter + Registry 注册

---

## 11. 附录：过程文档索引

| 文件 | 说明 |
|------|------|
| `_artifacts/00-research-links.md` | 调研索引 |
| `_artifacts/02-selection.md` | 选型记录 |
| `_artifacts/proposal-ai-provider-abstraction.md` | 已确认方案 |
| `_artifacts/plan-ai-provider-abstraction.md` | 实施计划 |
| `_artifacts/05-implement-report.md` | 实现报告 |
| `_artifacts/05-unittest.md` | 单测报告 |
| `_artifacts/05-unittest-raw.txt` | 单测原始输出 |
| `_artifacts/06-code-review.md` | 代码审查 |

# AxeCoder 新增 Codex（Responses API）Provider 可行性分析报告

| 字段 | 内容 |
|------|------|
| **文档编号** | FEAS-codex-provider-20250610 |
| **版本** | v1.0 |
| **日期** | 2025-06-10 |
| **作者** | AI Agent |
| **状态** | 草稿 |
| **分析对象** | 在模型设置中新增与 OpenAI / Anthropic / Ollama 并列的 **Codex 格式** Provider，对接 OpenAI **Responses API**（`/v1/responses`），以支持 Codex 系列模型与 Agent 工具调用 |
| **关联文档** | `electron/main/models-types.ts`、`electron/main/ai/providers/openai.ts`、`electron/main/ai/chat-with-tools.ts`、`docs/plans/plan-models-settings-proposal1.md`；外部：[OpenAI Responses API](https://developers.openai.com/api/reference/resources/responses/)、[Codex 废弃 chat/completions 说明](https://github.com/openai/codex/discussions/7782) |

---

## 1. 执行摘要

> 在 AxeCoder 中新增 Codex Provider **技术上可行**，但工作量显著高于「再抄一个 OpenAI 适配器」——Codex 官方已转向 **Responses API**，与现有 `openai` Provider 使用的 **Chat Completions** 在消息结构、工具调用、流式事件上均不兼容，需独立 wire 层与单测。建议 **Conditional Go**：先做 1–2 天 PoC（Agent 工具 + 流式 + 目标模型连通），PoC 通过后再全量接入 UI 与回归。

| 项目 | 内容 |
|------|------|
| **总体可行性** | ⚠️ 中 |
| **决策建议** | **Conditional Go**（PoC 验证 Agent 工具链与目标模型可用后推进） |
| **核心理由** | 架构上可复用现有 Provider 分发模式，但 Responses API 与 Chat Completions 差异大，不能简单复用 `openai` 路径；Agent 是 AxeCoder 核心场景，工具回传格式必须正确 |
| **关键风险** | Responses 工具调用 wire 格式复杂、流式事件体系不同、仅 Chat Completions 的上游需代理、Codex 模型授权方式未在需求中明确 |
| **预估工作量量级** | PoC **2–3 人日**；完整 parity（聊天 + Agent + 流式 + UI + 单测）**8–12 人日（L）** |

### 1.1 五维速览

| 维度 | 等级 | 一句话结论 |
|------|------|------------|
| 技术 (T) | ⚠️ 中 | 可沿现有三分支架构扩展，但需新建 Responses 消息/SSE/工具适配层，Agent 场景是主要复杂度 |
| 经济 (E) | ✅ 高 | 无额外基础设施；开发成本可控，长期运维与现有 OpenAI Key 管理一致 |
| 法律合规 (L) | ✅ 高 | 沿用 OpenAI API 条款与本地 secrets 存储，无新增合规类别 |
| 运营组织 (O) | ⚠️ 中 | 需文档说明与 openai Provider 的区别；用户易混淆「OpenAI 兼容」与「Codex/Responses」 |
| 进度 (S) | ⚠️ 中 | PoC 可 1 周内完成；全量 Agent parity 需 2 周量级，依赖 PoC 结果 |

---

## 2. 背景与目标

### 2.1 背景

AxeCoder 当前支持三种模型 Provider：`openai`（Chat Completions）、`anthropic`、`ollama`（见 `electron/main/models-types.ts:1-15`）。其中 `openai` 走 `/v1/chat/completions`（`electron/main/ai/providers/openai.ts:15-18`）。

OpenAI **Codex CLI / Codex 模型**已默认并强制迁移至 **Responses API**（`POST /v1/responses`），且官方宣布 **2026 年初移除** Codex 对 `chat/completions` 的支持（[Discussion #7782](https://github.com/openai/codex/discussions/7782)）。因此：

- 用户若将 Codex 模型配置为现有 `openai` Provider，**可能已无法工作或体验降级**；
- 与 DeepSeek、OpenRouter 等「OpenAI 兼容 Chat Completions」不同，Codex 格式是 **另一套 wire 协议**，不宜混在同一 Provider 选项里不加区分。

### 2.2 目标

- **业务目标：** 让用户在 Settings → Models 中可选择 **Codex** Provider，配置 Base URL、Model ID、API Key，正常使用聊天与 Agent。
- **技术目标：** 实现 Responses API 的 plain chat、流式输出、Agent 工具调用（function tools），与现有 `AgentLoopMessage` 互转。
- **成功标准（可度量）：**
  - 添加 `provider: 'codex'` 模型后，`models:ping` 与 `ai:chat` 成功；
  - Agent 模式下至少完成 1 轮「模型 → tool call → tool result → 模型回复」闭环；
  - 流式场景下 content / reasoning 增量可展示（与 openai Provider 同等 UX）；
  - 单测覆盖 URL 构建、消息 wire、工具 parse、SSE 合并。

### 2.3 范围

| 在范围内 | 不在范围内 |
|----------|------------|
| 新增 `ModelProvider = 'codex'` 及 UI 选项 | Codex CLI 本体集成或 subprocess 调用 |
| `providers/codex.ts`（或 `responses.ts`）+ wire/SSE 模块 | WebSocket 模式 Responses（V1 可仅 HTTP SSE） |
| `chat-with-provider` / `chat-with-tools` 分支 | 第三方 Responses↔Chat 代理服务自建 |
| ModelFormDialog、i18n、models.json 兼容 | OAuth / ChatGPT 订阅登录（非 API Key） |
| Agent 工具调用闭环 | `previous_response_id` 服务端状态管理（V1 可 stateless 全量 input） |

### 2.4 约束与假设

- **约束：** 沿用 Renderer 不直接 `fs`、密钥 Main 侧 `secrets.json`；最小化 diff；不破坏现有三 Provider 行为。
- **假设：**
  - 用户使用 **OpenAI API Key** 访问 Codex 模型（非 ChatGPT 网页订阅 OAuth）；
  - V1 采用 Codex 同款 **stateless** 模式（每轮发送完整 `input`，`store: false`）；
  - 目标 Base URL 默认为 `https://api.openai.com/v1`；
  - 不要求支持仅 Chat Completions 的上游直连（若需要，用户继续用 `openai` Provider 或外部代理）。

---

## 3. 现状分析

### 3.1 相关系统与模块

| 模块/系统 | 职责 | 与本需求关系 |
|-----------|------|--------------|
| `electron/main/models-types.ts` | `ModelProvider`、`ModelEntry` 定义 | 需扩展 `'codex'` |
| `electron/main/ai/providers/openai.ts` | Chat Completions 请求/流式 | **不可直接复用**；可参考结构 |
| `electron/main/ai/openai-messages.ts` | `messages[]` wire 与 tool_calls 嵌入 assistant | Responses 需独立 `input[]` + 独立 function_call 项 |
| `electron/main/ai/openai-sse.ts` | Chat Completions SSE（`choices[].delta`） | Responses SSE 事件类型完全不同 |
| `electron/main/ai/chat-with-provider.ts` | 按 provider 分发 plain chat | 需新增 codex 分支 |
| `electron/main/ai/chat-with-tools.ts` | Agent 工具调用（openai/ollama 共用 Chat Completions tools） | codex 需独立 `chatCodexWithTools` |
| `electron/main/ai-ipc.ts` | 流式仅 `openai` 启用 SSE handler | codex 流式需同等处理 |
| `src/components/workbench/ModelFormDialog.vue` | Provider 下拉与默认 URL | 需加 Codex 选项 |
| `src/components/workbench/ChatPane.vue` | `useSse = provider === 'openai'` | 需包含 codex |
| `electron/main/agent/agent-loop.ts` | Agent 主循环，openai 走流式 tools | codex 需纳入 |

### 3.2 现有能力

- **已具备：**
  - 成熟的 Provider 三分发模式（`chat-with-provider.ts:51-70`、`chat-with-tools.ts:317-342`）；
  - 统一 `AgentLoopMessage` / `AgentToolCall` 抽象（`electron/main/agent/agent-types.ts`）；
  - AI 重试、超时、metrics、trace、vision guard 等横切能力；
  - Models 设置 UI、secrets 存储、ping 测试链路。
- **缺失/不足：**
  - **无任何** `/v1/responses` 或 Responses SSE 实现（全库 grep 无 `responses` API 代码）；
  - `openai` 命名易误导——实为「OpenAI **Chat Completions 兼容**」，不含 Responses；
  - Agent 工具回传依赖 Chat Completions 的 `role: tool` + `tool_call_id`，Responses 使用 `function_call_output` + `call_id`（协议层差异）。

### 3.3 依赖与集成点

| 依赖 | 类型 | 说明 |
|------|------|------|
| OpenAI Responses API | 外部 HTTP | `POST {baseUrl}/responses`；Bearer API Key |
| OpenAI Codex 模型 | 外部模型 | 如 `gpt-5.1-codex` 等；需确认 API 侧 model id |
| 现有 Agent 工具定义 | 内部 | `AGENT_TOOLS` schema 可映射为 Responses `tools` |
| `fetchAiWithRetry` | 内部 | 可复用 |
| Chat Completions 兼容网关 | 外部（可选） | 若用户仅有 Chat API，**不能**用 codex Provider，需 openai Provider 或代理 |

### 3.4 Codex / Responses 与现有 OpenAI Provider 的关键差异（事实）

| 维度 | 现有 `openai` Provider | Codex / Responses API |
|------|------------------------|------------------------|
| 端点 | `/v1/chat/completions` | `/v1/responses` |
| 消息字段 | `messages: [{role, content}]` | `input: [message \| function_call \| function_call_output \| ...]` |
| System 角色 | `role: system` | 常用 `role: developer`（Codex 侧） |
| 工具调用 | assistant 内嵌 `tool_calls` | 独立 `type: function_call` 输出项 |
| 工具结果 | `role: tool, tool_call_id` | `type: function_call_output, call_id` |
| 流式 | `data: {choices:[{delta:{content}}]}` | `response.output_text.delta` 等语义事件 |
| 推理内容 | `reasoning_content` 字段 | 独立 reasoning 输出项，回传时必须保留 |
| 状态 | 客户端维护 messages 历史 | 可 stateless 全量 `input`（Codex 默认 `store: false`） |

---

## 4. 技术可行性 (Technical)

| 评估项 | 结论 | 说明 |
|--------|------|------|
| **维度等级** | ⚠️ 中 | 架构可扩展，但 Responses 适配工作量接近「新增 Anthropic 级别」而非「改几行 URL」 |
| 技术栈匹配度 | ✅ 高 | 纯 fetch + SSE，与现有 openai/anthropic 实现方式一致 |
| 架构兼容性 | ✅ 高 | 新增 provider 值 + 独立 adapter，不破坏现有分支 |
| 性能与规模 | ✅ 高 | Stateless 全量 input 与现 Agent loop 一致；上下文变大时与 openai 同级 |
| 安全与可靠性 | ✅ 高 | 复用 secrets、timeout、retry；无新攻击面 |
| 可测试性 | ⚠️ 中 | 需 mock Responses SSE 事件链；工具闭环单测较 Chat Completions 更繁琐 |
| 技术债务影响 | ⚠️ 中 | 若命名/文档不清，用户仍会把 Codex 模型填进 openai Provider，产生支持负担 |

**主要技术风险：**

1. **Agent 工具 wire 转换错误**——Responses 要求 `function_call` 与 `function_call_output` 成对、reasoning 项需回传，漏传会导致模型行为异常。
2. **流式事件解析**——需新建 `responses-sse.ts`，覆盖 `response.output_text.delta`、`response.function_call_arguments.delta`、reasoning 相关事件。
3. **模型/端点矩阵未验证**——部分 OpenAI 模型可能仅 Responses 可用；PoC 必须用真实 API Key 验证。
4. **Vision**——Responses 支持 image input，但 wire 格式与 Chat Completions 不同；若 Codex 模型支持 vision，需额外适配 `ai-vision-guard`。

**关键技术验证项（PoC / spike）：**

1. `POST /v1/responses` plain chat（非流式）→ 解析 `output` 文本。
2. 流式 SSE → 合并 content + reasoning delta。
3. 单轮 function tool：`tools` 定义 → 解析 `function_call` → 回传 `function_call_output` → 得到最终 assistant 文本。
4. 在 Agent loop 中跑通 `Read` 或 `Glob` 工具 1 次（端到端）。
5. 确认默认 model id（如官方 Codex 模型名）与 `reasoning.effort` 参数映射。

---

## 5. 经济可行性 (Economic)

| 评估项 | 结论 | 说明 |
|--------|------|------|
| **维度等级** | ✅ 高 | 无新基础设施；API 按量计费与现有 OpenAI 一致 |
| 开发成本（量级） | ⚠️ 中 | PoC 2–3 人日；完整实现 8–12 人日 |
| 运维成本 | ✅ 高 | 无额外服务；错误监控沿用 ai-metrics / trace |
| 机会成本 | ⚠️ 中 | 同期 MCP Plugins Tab 等特性可能争抢人力 |
| 预期收益 | ⚠️ 中 | 满足 Codex 模型用户；避免 openai Provider 误配导致失败 |
| 投资回报（ROI 定性） | 中 | 用户群取决于 Codex API  adoption；对「只用 DeepSeek Chat Completions」用户无直接收益 |

**成本收益简述：** 实现成本明显高于「加一个 baseUrl 预设」，但能消除协议错配带来的支持成本；若团队内部暂无 Codex API 用户，ROI 偏低，可仅做 PoC + 文档指引。

---

## 6. 法律与合规可行性 (Legal)

| 评估项 | 结论 | 说明 |
|--------|------|------|
| **维度等级** | ✅ 高 | 与现有 OpenAI API 集成同级 |
| 许可证与开源合规 | ✅ 高 | 无新依赖库硬性要求；自研 adapter 无 copyleft 问题 |
| 数据隐私（GDPR/个保法等） | ✅ 高 | 代码/聊天仍经用户配置的 API 出站；无新数据采集 |
| 行业/内部合规 | ✅ 高 | 企业用户需自行遵守 OpenAI 数据政策（与现 openai Provider 相同） |
| 第三方服务条款 | ⚠️ 中 | 须遵守 OpenAI API ToS；Codex 模型可能有单独可用性/地域限制（以 OpenAI 公示为准） |

**合规缺口与补救：** 在 Models UI 增加说明——API Key 需具备 Codex 模型访问权限；不支持将 ChatGPT 订阅凭证当作 API Key。

---

## 7. 运营与组织可行性 (Operational)

| 评估项 | 结论 | 说明 |
|--------|------|------|
| **维度等级** | ⚠️ 中 | 用户教育成本是主要运营负担 |
| 流程与角色 | ✅ 高 | 与现有 Models 配置流程一致 |
| 培训与变更管理 | ⚠️ 中 | 需 README / Settings 内提示：Codex ≠ OpenAI 兼容 |
| 运维与支持能力 | ⚠️ 中 | 需能区分「Responses 400」与「Chat Completions 400」排障 |
| 与现有工作流集成 | ✅ 高 | Agent、Workshop、子代理均经 `chatWithToolsForModel`，单点扩展 |

**组织侧阻碍：** 产品/支持需统一话术，避免建议用户「Codex 模型选 OpenAI Provider 填同一个 URL」。

---

## 8. 进度可行性 (Schedule)

| 评估项 | 结论 | 说明 |
|--------|------|------|
| **维度等级** | ⚠️ 中 | PoC 快，全量取决于工具链复杂度 |
| 里程碑划分 | 见下 | |
| 关键路径 | Responses 工具 wire + Agent loop 联调 | |
| 外部依赖等待 | OpenAI API 可用账号 + Codex 模型权限 | 可能阻塞 PoC |
| 缓冲与并行度 | UI/i18n 可与 adapter 并行 | adapter 完成前仅 mock 联调 |

**建议时间线（量级）：**

| 阶段 | 内容 | 估时 |
|------|------|------|
| 0 PoC | responses plain + stream + 1 次 tool call | 2–3 人日 |
| 1 Core | `providers/codex.ts`、wire/SSE、chat-with-* 分支 | 3–4 人日 |
| 2 Product | ModelFormDialog、ChatPane SSE、i18n、ping | 1–2 人日 |
| 3 Quality | 单测 + Agent 回归 + 文档 | 2–3 人日 |
| **合计** | | **8–12 人日** |

---

## 9. 方案对比

| 方案 | 概述 | T | E | L | O | S | 推荐度 |
|------|------|---|---|---|---|---|--------|
| **方案 A：独立 `codex` Provider** | 新增第四 Provider，完整 Responses 适配 | ⚠️ | ✅ | ✅ | ⚠️ | ⚠️ | **★★★ 推荐** |
| **方案 B：`openai` 内增加 wire 切换** | `ModelEntry.wireApi: 'chat' \| 'responses'` | ⚠️ | ✅ | ✅ | ❌ | ⚠️ | ★★ |
| **方案 C：不实现，文档 + 外部代理** | 用户自建 Responses↔Chat 代理，仍选 openai | ✅ | ✅ | ✅ | ❌ | ✅ | ★（短期） |

**推荐方案及理由：**

- **推荐方案 A（独立 `codex` Provider）**：与用户需求「像 openai / anthropic / ollama 一样再做一个 codex 格式」一致；UI 语义清晰；避免 openai Provider 承担两种不兼容协议。
- **方案 B** 省一个下拉选项，但「OpenAI 兼容」与「Responses」混在同一 Provider，**运营与支持成本更高**，不符合最小困惑原则。
- **方案 C** 仅适合「暂无开发人力」的临时策略，无法作为产品级能力。

---

## 10. 风险分析

| ID | 风险描述 | 类别 | 概率 | 影响 | 等级 | 缓解措施 | 责任人 |
|----|----------|------|------|------|------|----------|--------|
| R1 | Responses 工具回传格式错误导致 Agent 死循环或空回复 | 技术 | 中 | 高 | **高** | PoC 覆盖 tool 闭环；单测固定 golden wire | 开发 |
| R2 | SSE 事件类型遗漏，流式 reasoning/工具参数不完整 | 技术 | 中 | 中 | **中** | 对照 OpenAI 流式文档逐项实现；录 fixture | 开发 |
| R3 | 用户无 Codex 模型 API 权限，配置后 403/404 | 运营 | 中 | 中 | **中** | UI 说明 + ping 错误文案；文档列出可用 model id | 产品/开发 |
| R4 | 与 openai Provider 职责重叠，用户持续误配 | 运营 | 高 | 中 | **中** | Codex 卡片说明；openai 标签改为「OpenAI 兼容 (Chat)」 | 产品 |
| R5 | 仅 Chat Completions 的上游（DeepSeek 等）被用户选为 Codex Provider | 技术 | 中 | 中 | **中** | 表单 placeholder / 校验提示；文档明确不支持 | 开发 |
| R6 | Vision / 多模态 wire 未一期实现 | 技术 | 低 | 低 | **低** | V1 对 codex 禁用 supportsVision 或复用 guard 报错 | 开发 |
| R7 | OpenAI Responses API 行为变更 | 技术 | 低 | 中 | **低** |  adapter 隔离；关注 Codex changelog | 开发 |

**风险等级说明：** 概率 × 影响 → 高/中/低；R1 为最高优先级，必须在 PoC 阶段关闭。

---

## 11. 综合评估与建议

### 11.1 综合矩阵

| 维度 | 权重（可选） | 等级 | 加权说明 |
|------|--------------|------|----------|
| 技术 | 35% | ⚠️ | 可行但有实质开发量，非 trivial |
| 经济 | 15% | ✅ | 成本可接受 |
| 法律合规 | 10% | ✅ | 无 blocker |
| 运营组织 | 20% | ⚠️ | 需命名与教育 |
| 进度 | 20% | ⚠️ | 2 周可交付 MVP，取决于 PoC |

### 11.2 结论

- **总体可行性：** ⚠️ **中**
- **决策建议：** **Conditional Go**
- **若 Conditional Go，前提条件：**
  1. PoC 在目标环境（真实 API Key + 官方 Codex 模型）跑通 **Agent 单轮工具调用 + 流式输出**；
  2. 产品确认 V1 **不做** OAuth / WebSocket / 外部 Chat 代理；
  3. 接受 V1 可能 **不支持 vision** 或仅支持文本 input。
- **若不推进，替代路径：** 文档说明 Codex 模型暂用外部 `responses-proxy` + 现有 `openai` Provider（功能与体验受限，非长期方案）。

### 11.3 建议下一步

1. **PoC（2–3 人日）：** 新建 `electron/main/ai/providers/codex.ts` 原型，硬编码 1 个模型，验证 plain + stream + 1 tool。
2. **PoC 通过后：** 执行 `/make-proposals` 或 `/make-plan`，细化文件清单与单测矩阵。
3. **并行：** 在 `ModelFormDialog` 文案上预研「OpenAI (Chat)」与「Codex (Responses)」命名，降低 R4。
4. **PoC 失败时：** 记录失败 API 响应，评估是否降级为方案 C 或等待 OpenAI SDK 官方稳定示例。

---

## 12. 附录

### 12.1 术语表

| 术语 | 定义 |
|------|------|
| Chat Completions | OpenAI 传统接口 `POST /v1/chat/completions`，AxeCoder `openai` Provider 使用该协议 |
| Responses API | OpenAI 新接口 `POST /v1/responses`，Codex CLI 默认 wire |
| Codex Provider | 本报告提议的第四类 `ModelProvider`，专指 Responses API 适配 |
| Stateless Responses | 每轮请求携带完整 `input` 历史，`store: false`，不依赖 `previous_response_id` |
| Wire format | HTTP 请求/响应体的字段结构与 SSE 事件格式 |

### 12.2 参考资料

- OpenAI Responses API Reference: https://developers.openai.com/api/reference/resources/responses/
- OpenAI Streaming Responses: https://developers.openai.com/api/docs/guides/streaming-responses
- Codex deprecating chat/completions: https://github.com/openai/codex/discussions/7782
- AxeCoder OpenAI adapter: `electron/main/ai/providers/openai.ts`
- AxeCoder Agent tools dispatch: `electron/main/ai/chat-with-tools.ts:317-342`

### 12.3 待澄清问题

| # | 问题 | 影响维度 | 建议确认人 |
|---|------|----------|------------|
| 1 | 目标用户是否持有 **OpenAI API Key** 且已开通 Codex 模型？ | 经济、进度 | 产品/用户 |
| 2 | V1 是否必须支持 **vision**？ | 技术、进度 | 产品 |
| 3 | 是否需要支持 **非 OpenAI 官方** Base URL（自建 Responses 兼容网关）？ | 技术 | 架构 |
| 4 | 默认 Model ID 列表由谁维护（如 `gpt-5.1-codex-mini`）？ | 运营 | 产品 |
| 5 | `reasoning.effort` 是否与现有 `ReasoningEffortLevel` 共用？ | 技术 | 开发 |
| 6 | 是否考虑将现有 `openai` 显示名改为「OpenAI 兼容 (Chat)」以避免误配？ | 运营 | 产品 |

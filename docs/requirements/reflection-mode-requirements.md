# Reflection 模式需求说明

## 背景

AxeCoder 曾实现 `reflection` 聊天模式，但因未完成完整编排而在 UI 与 `SwitchMode` 中被隐藏（`DISABLED_CHAT_MODES`）。现需恢复并在左下角模式选择器中开放。

目标：按吴恩达 **Reflection（反思）** 设计模式，在单次用户请求内自动跑 **Developer ↔ Reviewer** 的反馈循环，由 **Tech Lead** 穿插简短引导，最多 **3 轮**，由 Tech Lead 判断何时收尾并做最终回复。

与现有 **Multi-Agent** 模式的关系：复用 Workshop 多角色面板与内置角色（Developer、Reviewer、Tech Lead），但编排流程固定为 Reflection 专用，而非 Multi-Agent 的自由协作路由。

---

## 功能要求

### 1. 入口与可见性

- 在左下角聊天模式选择器中恢复 **Reflection** 选项（与 Agent、Multi-Agent 等并列）。
- 从 `DISABLED_CHAT_MODES` 中移除 `reflection`，使模式可被选择、存储与加载。
- 用户选中 Reflection 后，行为类似 Multi-Agent：自动关联/打开 Workshop 多角色面板。

### 2. 参与角色

固定三个内置角色参与编排：

| 角色 | 职责 |
|------|------|
| **Developer** | 根据用户需求生成/修改实现；可使用完整工具能力（含 `implement` 等工作流技能），可实际改代码、跑命令。 |
| **Reviewer** | 审查 Developer 产出；可使用完整工具能力（含 `code-review` 等工作流技能），可读代码并给出修改建议。 |
| **Tech Lead** | 在 Developer / Reviewer 每步发言后插入**简短文字点评/引导**；不调用工具。负责判断本轮是否满意、是否进入下一轮；流程结束时向用户做**最终总结回复**。 |

### 3. 单轮编排顺序（一轮 = Developer + Reviewer 各一次）

用户发送一条消息后，系统按以下固定顺序自动推进（无需用户逐步确认）：

```
用户消息
  → Developer 生成/实现
  → Tech Lead 插话（简短点评）
  → Reviewer 修改建议/评审
  → Tech Lead 插话（简短点评）
  → [若继续] 下一轮 Developer …
  → …
  → Tech Lead 最终回复（收尾）
```

即每轮形态为：

**Developer → Tech Lead → Reviewer → Tech Lead**

### 4. 循环轮次

- 支持 **1～3 轮** Developer↔Reviewer 循环。
- **由 Tech Lead 自动判断**是否继续：满意则提前收尾；不满意则进入下一轮。
- **硬上限 3 轮**：达到 3 轮后无论是否完全满意，Tech Lead 必须收尾并向用户回复。

### 5. 展示方式

- 中间过程（Developer、Reviewer、Tech Lead 各步发言）在 **Workshop 多角色面板**中按角色分气泡展示（与 Multi-Agent 一致）。
- 用户最终看到的「完成」信号以 **Tech Lead 的最终回复**为准。

### 6. 模式切换约束

- Reflection 与 Multi-Agent **互斥锁定**：
  - 进入 Reflection 后，不可切换到 Multi-Agent（会话已有消息时）。
  - 进入 Multi-Agent 后，不可切换到 Reflection（会话已有消息时）。
  - 两者均可切回 Agent、Planning 等其他普通模式（沿用现有 `canPickChatMode` 扩展逻辑）。

### 7. 用户交互

- 用户在 Reflection 模式下发送消息，即触发一整轮 Reflection 编排（非普通单 Agent 对话）。
- 编排进行中应展示各角色 thinking / speaking 状态（复用现有 `workshop:progress` 机制）。

---

## 非功能要求

- **复用优先**：尽量复用现有 Workshop 编排、内置角色定义（`builtin-workflow-roles`）、流式展示（`workshop-*` stream）与 Multi-Agent 的 Agent 会话绑定逻辑，避免重复造轮子。
- **可观测**：Reflection 流程中的各角色发言应持久化到 Workshop 会话，便于回看。
- **边界清晰**：Reflection 模式下主 Agent 工具循环不应与 Workshop 编排并行抢答（行为对齐 Multi-Agent：用户消息走 Workshop 编排入口）。

---

## 不在本次范围（待后续确认）

- Reflection 是否支持 `SwitchMode` 工具切入/切出（当前 `reflection` 不在 `SWITCH_MODE_TARGETS` 中）。
- 主聊天气泡是否同步显示摘要（当前需求明确为 Workshop 面板展示全过程）。
- 用户中途取消正在进行的 Reflection 编排。
- Reflection 与 `planning-only` 等模式的组合行为。

---

## 澄清记录摘要

| 问题 | 结论 |
|------|------|
| 入口 | 左下角聊天模式选择器 |
| 轮次控制 | Tech Lead 自动判断，最多 3 轮 |
| Tech Lead 插话 | 每步后简短文字点评/引导，不用工具 |
| Developer / Reviewer 能力 | 均可使用完整工具（改代码 / 评审） |
| UI 展示 | Workshop 多角色面板 |
| 模式锁定 | Reflection 与 Multi-Agent 互斥，可切回 Agent 等 |

---

## 验收标准（草案）

1. 模式选择器中可见并可选用 Reflection。
2. 选用后打开 Workshop 面板，发送用户消息后自动按 Developer → Tech Lead → Reviewer → Tech Lead 顺序推进。
3. Tech Lead 可在 1～3 轮内自动结束并给出最终回复。
4. Developer 能实际修改代码；Reviewer 能基于代码给出评审意见。
5. Reflection 与 Multi-Agent 在有消息的会话中不可互相切换。

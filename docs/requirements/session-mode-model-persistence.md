# Session 按会话记忆 Mode 与 Model

## 背景

用户在 AxeCoder 中会在右侧会话列表里切换多个聊天 session（含 Agent 对话与 Workshop 等 Tab）。当前切换 session 时，输入框旁的 **对话模式**（如 @ Agent / Plan / Draw.IO / Multi-Agent / Software Co.）与 **模型选择**（如 deepseek-v4）不能稳定地随 session 恢复，影响连续对话体验。

期望：每个 session 各自记住「最后一次实际使用」的 Mode 与 Model；切回该 session 时，对话框恢复为当时的 Mode/Model（及嵌入 Workshop 的完整状态）。

## 功能要求

### 1. Session 数据结构

- 扩展 session 持久化结构，为每个 session 保存：
  - **chatMode**：最后一次发送消息时使用的对话模式
  - **modelId**：最后一次发送消息时使用的模型 ID
- 存储范围：**所有聊天 Tab**（Agent 普通对话 + Workshop 等），按 **项目维度** 各自记忆（与现有 session 文件落盘方式一致，session 文件在项目目录下）。
- Workshop 嵌入模式（Draw.IO / Multi-Agent / Software Co.）：除 Mode/Model 外，切回 session 时需 **一并恢复对应 Workshop 会话内容与状态**（消息、阶段、图表等现有 Workshop 持久化内容）。

### 2. 切换 session 时的恢复行为

| 场景 | 行为 |
|------|------|
| session 已保存过 chatMode / modelId | 恢复为该 session 记录的值；嵌入 Workshop 模式时同步恢复 Workshop 状态 |
| 旧 session（文件中无 chatMode / modelId） | **不改变**当前 UI 上正在显示的 Mode/Model，沿用切换前界面上的选择 |
| 新建 session | 使用 **全局默认**：Mode = Agent，Model = 系统默认模型 |

### 3. 写入时机

- **仅在用户发送消息时** 将当前 UI 的 Mode 与 Model 写入该 session 并持久化。
- 用户仅切换下拉框但未发送消息时，**不**更新 session 内记录（切换走再切回时，仍显示上次发送时保存的值；若从未发送过则按「旧 session」规则保持当前 UI）。

### 4. 作用范围明细

- **Agent 对话 session**：右侧会话列表中的普通聊天。
- **Workshop / 协作 session**：独立 Workshop Tab 及嵌入在 Agent 聊天中的 Workshop 模式，均需各自记忆 Mode/Model。
- **跨项目**：不同项目的 session 互不影响，各自读写本项目下的 session 文件。

### 5. 用户可见效果（验收标准）

1. 在 session A 选择 Plan + 模型 M1，发送一条消息后，切换到 session B 并发送（Plan + M2）。
2. 切回 session A：Mode 显示 Plan，Model 显示 M1；若 A 曾为 Draw.IO 等嵌入模式，Workshop 区域内容与切换前一致。
3. 切回 session B：Mode/Model 为 B 上次发送时的记录。
4. 打开从未发送过消息的旧 session：Mode/Model 下拉框保持切换前的当前选择，不强行跳回全局默认。
5. 新建 session：Mode = Agent，Model = 默认模型。
6. 切换项目后，各项目 session 的 Mode/Model 记忆互不干扰。

## 非功能要求

- **兼容性**：旧 session JSON 无 `chatMode` / `modelId` 字段时不得报错，按「旧 session」规则处理。
- **一致性**：UI 下拉框、实际发往 Agent/Workshop 的请求、磁盘持久化三者在「发送消息」时刻应使用同一组 Mode/Model。
- **最小侵入**：在现有 session 存储与切换流程上扩展字段与恢复逻辑，避免无关重构。

## 不在本次范围（待确认可另开）

- 仅改 Mode/Model 未发送即希望立即记忆（用户明确选择「发送时才写入」）。
- 跨项目共享同一份 Mode/Model 记忆。
- 与 Cursor 等外部 IDE 的 session 同步。

## 澄清记录摘要

| 问题 | 结论 |
|------|------|
| Mode 指什么？ | 对话模式 + 模型选择，两者都要按 session 记忆 |
| 作用范围？ | 所有聊天 Tab |
| 旧 session 无字段？ | 保持当前 UI，不因切换而改变 |
| 何时写入？ | 发送消息时 |
| 跨项目？ | 按项目各自记忆 |
| 新建 session？ | 全局默认（Agent + 默认模型） |
| 嵌入 Workshop？ | 切回时恢复 Mode/Model 及 Workshop 完整状态 |

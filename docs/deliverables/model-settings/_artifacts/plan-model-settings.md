# 模型设置体验 设计文档

> 依据：`docs/proposals/proposal-model-settings.md`（已确认）

## 当前背景

- `~/.aex-coder/models.json` 与 `ModelsTab` 已存在。
- `WorkshopPane` 静默加载 `modelId`，无 UI；失败时 `window.alert`。
- `open-models-settings` 仅打开设置，默认 General Tab。

## 需求

### 功能需求（P0）

- M1：`SettingsPanel.openTab('models')`；App 打开设置时定位模型 Tab。
- M2：`WorkshopPane` composer 内 `ModelPickerDropdown`；无模型时「添加模型」+ 禁用开始。
- M3：`models:ping` IPC + Models 列表「测试连接」与结果提示。
- M4：设置侧栏 Models →「模型」；列表标出当前 `activeModelId`。

### 非功能需求

- ping 不写入会话；错误信息对用户可读。
- 单测：`pingModel` 可 mock `chatWithProvider`。

## 设计决策

### 1. ping 实现

`pingModel(id)` → `getModelById` + `getSecret` + `chatWithProvider(model, key, [{role:'user',content:'Hi'}])`，成功返回文本前 80 字。

### 2. 工坊模型

与 Chat 共用 `setActiveModel`；`loadModels` 与 Chat 一致取 enabled + active。

## 实施计划

1. 主进程 `models-ping.ts` + IPC + preload 类型
2. `SettingsPanel` / `App.vue` 深链
3. `WorkshopPane` ModelPicker
4. `ModelsTab` 中文 + ping UI
5. 单测 `UT-model-settings/models-ping.test.ts`

## 文件变更

- `electron/main/models-ping.ts`（新）
- `electron/main/models-ipc.ts`
- `electron/preload/index.ts`
- `src/types/axecoder.d.ts`
- `src/components/workbench/SettingsPanel.vue`
- `src/App.vue`
- `src/components/workbench/WorkshopPane.vue`
- `src/components/workbench/ModelsTab.vue`
- `tests/unittest/UT-model-settings/models-ping.test.ts`（新）

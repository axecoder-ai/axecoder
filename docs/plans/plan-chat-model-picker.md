# 聊天区模型选择器（Cursor 下拉）设计文档

> 依据：`docs/proposals/proposal-models-settings.md` **提案 1**、已实现 `docs/plans/plan-models-settings-proposal1.md`  
> **范围：** 将 `ChatPane` 底部原生 `<select>` 替换为 Cursor 式**浮层下拉**（搜索 + 列表勾选 + Add Models）。  
> **约束：** 复用现有 `listModels` / `setActiveModel` IPC，**不**改 `~/.writcraft` 存储与 Provider 逻辑。

## 变更范围、约束与时间线

| 项 | 说明 |
|----|------|
| **范围** | 新建 `ModelPickerDropdown.vue`；改造 `ChatPane.vue` 输入区 footer；`App.vue` 接线「Add Models → 打开 SettingsPanel」 |
| **不在范围** | MAX Mode 开关、Auto/Premium 等虚拟项、设置页 Provider 区块改版、新 IPC |
| **约束** | 仅展示 `enabled` 模型；点击外部关闭浮层；样式沿用 `var(--wc-*)` |
| **时间线（估）** | **约 0.5 人日**（纯 Renderer UI） |

---

## 当前背景

- **已完成（提案 1）：** `SettingsPanel` + `ModelsTab` 管理模型；`~/.writcraft` 持久化；`ai:chat(modelId)`。
- **缺口：** `ChatPane.vue` 底部仍为原生 `<select class="model-select">`，与参考图（药丸按钮 + 上浮菜单）不一致。
- **参考 UI（用户截图）：**
  1. **触发器：** 输入框左下角药丸按钮，显示当前模型名 + 下箭头。
  2. **浮层：** 向上展开的面板。
  3. **顶部：** 搜索框 `Search models`（本地 filter）。
  4. **列表：** 仅 enabled 模型；当前项右侧 **✓**；点击行切换 `activeModelId`。
  5. **底部：** `+ Add Models` → 打开设置面板 Models Tab（或弹出 `ModelFormDialog`）。

---

## 需求

### 功能需求（P0）

- **P1 触发器：** 显示 `activeModel.name`（无模型时显示「选择模型」）；点击切换浮层显隐。
- **P2 搜索：** 按 `name` / `modelId` / `provider` 过滤列表。
- **P3 选择：** 点击某行 → `setActiveModel(id)` → 更新列表勾选 → 关闭浮层。
- **P4 Add Models：** 关闭浮层并 `emit('openModelsSettings')`，由 `App.vue` 打开 `SettingsPanel`。
- **P5 空态：** 无 enabled 模型时，浮层内提示 + Add Models；发送按钮保持 disabled。

### 非功能需求

- 浮层 z-index 高于聊天输入区，不被 Agents 侧栏遮挡（`z-index: 20` 量级即可）。
- Esc / 点击浮层外关闭。

### 不在本期（P2 backlog）

- **MAX Mode** 开关（截图有，WritCraft 无对应能力）。
- 列表分组（Auto / Premium 等虚拟项）。

---

## 设计决策

### 1. 独立组件 `ModelPickerDropdown.vue`

- **选择：** 从 `ChatPane` 抽出，props：`modelsFile`、`disabled`；emits：`select(id)`、`addModels`。
- **理由：** 便于单测样式与交互；`ChatPane` 仍负责 `loadModels` 与 `send`。

### 2. Add Models 走设置全屏页，不重复弹窗

- **选择：** `emit('openModelsSettings')` → `App.vue` 设 `settingsPanelVisible = true`。
- **理由：** 与右上角齿轮同一入口；避免聊天区再嵌套 `ModelFormDialog`。

### 3. 列表仅 enabled，与发送逻辑一致

- **选择：** 浮层数据源 = `models.filter(m => m.enabled)`。
- **理由：** 禁用模型不应出现在聊天可选列表（设置页仍可开关）。

### 4. 文案本地化

- **选择：** 搜索占位「搜索模型」、底部「添加模型」（中文产品一致）；触发器无模型时「选择模型」。

---

## 技术设计

### 组件结构

```
ChatPane
  └─ chat-input-footer
       ├─ ModelPickerDropdown
       │    ├─ trigger（药丸按钮）
       │    └─ popover（v-show）
       │         ├─ input[type=search]
       │         ├─ ul.model-rows（✓ active）
       │         └─ button.add-models
       └─ send-btn
```

### 文件变更

| 文件 | 变更 |
|------|------|
| `src/components/workbench/ModelPickerDropdown.vue` | **新建** |
| `src/components/workbench/ChatPane.vue` | 移除 `<select>`，挂载 Picker；`emit('openModelsSettings')` |
| `src/App.vue` | `@open-models-settings` → `settingsPanelVisible = true` |

**不改：** `electron/main/*`、`preload`、`writcraft.d.ts`（IPC 已满足）。

### 交互流

```
点击药丸 → 打开浮层 → 搜索/点选 → setActiveModel → 关闭浮层
点击「添加模型」→ emit → App 打开 SettingsPanel → 用户添加后 @changed → loadModels
```

---

## 实施计划

### 步骤 1：新建 `ModelPickerDropdown.vue`（约 2h）

1. 实现 trigger + popover 布局（`position: absolute; bottom: 100%`）。
2. 搜索 `computed` 过滤 `enabledModels`。
3. 列表行点击 → `emit('select', id)`。
4. 底部按钮 → `emit('addModels')`。
5. `onClickOutside`（`mousedown` document 监听）与 Esc 关闭。

### 步骤 2：接入 `ChatPane` + `App.vue`（约 1h）

1. 删除 `onModelSelect` 与 `<select>`。
2. Picker `@select` 内调用现有 `setActiveModel` 逻辑。
3. `@add-models` → `emit('openModelsSettings')`。
4. `App.vue` 在 `ChatPane` 上监听并打开设置面板。

### 步骤 3：样式对齐参考图（约 1h）

1. 药丸：圆角 12px、深色底、13px 字号、chevron 图标。
2. 浮层：宽 ~280px、圆角 8px、边框 `var(--wc-border)`、行 hover、✓ 用 `color: var(--wc-accent)`。

**验收（手工）：**

- 有 2+ enabled 模型时可搜索、切换、勾选正确。
- Add Models 打开设置页，添加后回到聊天下拉可见新模型。
- 点击外部/Esc 关闭浮层；无模型时空态与发送禁用正常。

---

## 测试策略

- **单元：** 可选对 `filterModels(query, models)` 抽纯函数放 `src/utils/model-filter.ts` 并加 2～3 条 vitest（非必须）。
- **主验收：** 手工按上文验收清单。

---

## 安全考量

（无新增；仍不暴露 apiKey。）

---

## 与提案 1 计划的关系

| 计划项 | 状态 |
|--------|------|
| M6「下拉切换」 | 已实现为原生 select，**本计划升级为 Cursor 浮层** |
| M1～M5、M7 | 已完成，本计划不改动 |

---

## 参考资料

- 用户截图：聊天输入区右下角模型浮层（Search / 列表 ✓ / Add Models）
- 现状代码：`src/components/workbench/ChatPane.vue`（`model-select`）
- `docs/plans/plan-models-settings-proposal1.md`

---

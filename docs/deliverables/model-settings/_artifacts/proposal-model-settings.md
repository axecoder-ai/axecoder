# 已确认解决方案提案：模型设置体验

**状态：** 已确认（由 `/create-proposals` 生成）

**上下文：**
- **请求：** 协作工坊与全局模型设置体验：去掉阻塞 `alert`、工坊可选模型、打开设置直达「模型」Tab、Models 中文导航与连通性测试。
- **调研来源：** `WorkshopPane.vue`、`ChatPane.vue`、`SettingsPanel.vue`、`models-store.ts`；`docs/proposals/proposal-models-settings.md`（存储已实现）。
- **上游提案：** `docs/proposals/proposal-model-settings.md`（待选型草稿）
- **选定基础：** 提案 3（叠加提案 1 工坊对齐）
- **用户调整摘要：** 无额外调整

---

### 最终方案 – 工坊模型选择 + 设置深链 + Models 增强

- **概述：** 在 `WorkshopPane` 复用 `ModelPickerDropdown`，无启用模型时显示「添加模型」并禁用开始；`SettingsPanel` 支持 `openTab('models')`，`App.vue` 统一深链。Models Tab 标题与侧栏改为中文「模型」；每行增加「测试连接」调用 `models:ping`（主进程 `pingModel` → `chatWithProvider` 极简 user 消息）。切换模型同步 `setActiveModel`。
- **相对选定提案的变更：** 无（按提案 3 + 提案 1 基线实施）。
- **关键变更：**
  - `electron/main/models-ping.ts`、`models-ipc.ts` — `models:ping`
  - `electron/preload/index.ts`、`src/types/axecoder.d.ts` — `pingModel`
  - `SettingsPanel.vue` — `openTab` expose、中文 Tab
  - `App.vue` — `openModelsSettings` 深链
  - `WorkshopPane.vue` — ModelPicker、去掉 alert
  - `ModelsTab.vue` — 测试连接、当前模型标记
- **权衡：** ping 会消耗少量 API 额度；超时沿用现有 Provider 逻辑（错误信息回传 UI）。
- **验证：** 零模型 → 添加模型 → ping 成功/失败文案；工坊 startRun 成功。
- **待解决问题：** General Tab 是否展示默认模型摘要（V2）。

### 未采纳方案说明

- **未选：** 提案 2 仅 banner 无下拉 — 用户选定提案 3，需工坊内选模型能力。

# model-settings 交付总结

| 字段 | 值 |
|------|-----|
| 任务名 | model-settings |
| 完成日期 | 2026-06-02 |
| 选定方案 | 提案 3（含提案 1 工坊对齐） |
| 审查结论 | 通过 |
| 单测 | 全绿（193/193） |

---

## 1. 概述

改善模型设置的**可发现性与可验证性**：协作工坊可内联选模型并引导至设置；设置打开直达「模型」Tab；支持「测试连接」。

**选型：** 用户选定提案 3，无额外调整。

**交付物目录：** `docs/deliverables/model-settings/`，过程稿见 `_artifacts/`。

---

## 2. 方案

- 工坊：`ModelPickerDropdown` + 禁用开始（无 alert）
- 设置：`openTab('models')` 深链；侧栏「模型/通用/用户」
- 主进程：`pingModel` → `models:ping`
- 存储：沿用 `~/.aex-coder/models.json`（无变更）

---

## 3. 方案选型过程

推荐提案 1；用户选定提案 3。详见 `_artifacts/02-selection.md`。

---

## 4. 实施计划

分阶段：IPC ping → 设置深链 → 工坊 UI → Models Tab。全文 `_artifacts/plan-model-settings.md`。

---

## 5. 实现说明

见 `_artifacts/05-implement-report.md`。

---

## 6. 单元测试执行情况

- `npm test`：42 文件、193 用例通过
- 新增 `UT-model-settings/models-ping.test.ts`（4 例）
- 详情：`_artifacts/05-unittest.md`

---

## 7. 测试报告

| 场景 | 预期 |
|------|------|
| 无模型打开工坊 | 「添加模型」→ 设置 Models Tab |
| 配置并启用模型 | 工坊可选模型，「开始」可用 |
| 测试连接 | 成功/失败文案展示 |

手工 UI 测试建议在本地 Electron 复验。

---

## 8. 代码审查

通过。见 `_artifacts/06-code-review.md`。

---

## 9. 变更清单

| 路径 | 类型 | 说明 |
|------|------|------|
| `electron/main/models-ping.ts` | 新增 | ping 逻辑 |
| `electron/main/models-ipc.ts` | 修改 | ping IPC |
| `electron/preload/index.ts` | 修改 | 暴露 pingModel |
| `src/types/axecoder.d.ts` | 修改 | 类型 |
| `SettingsPanel.vue` | 修改 | openTab + 中文 |
| `App.vue` | 修改 | 深链 |
| `WorkshopPane.vue` | 修改 | 模型选择器 |
| `ModelsTab.vue` | 修改 | 测试连接 |
| `tests/.../models-ping.test.ts` | 新增 | 单测 |

---

## 10. 遗留项与后续建议

- ping 独立短超时（可选）
- General Tab 展示当前默认模型摘要（V2）

---

## 11. 附录：过程文档索引

| 文件 | 路径 |
|------|------|
| 选型 | `_artifacts/02-selection.md` |
| 已确认方案 | `_artifacts/proposal-model-settings.md` |
| 计划 | `_artifacts/plan-model-settings.md` |
| 实现报告 | `_artifacts/05-implement-report.md` |
| 单测 | `_artifacts/05-unittest.md` |
| 审查 | `_artifacts/06-code-review.md` |

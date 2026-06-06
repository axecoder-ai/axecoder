# global-search 交付总结

| 字段 | 值 |
|------|-----|
| 任务名 | global-search |
| 完成日期 | 2026-06-06 |
| 选定方案 | 提案 2 – 完整 VS Code 搜索视图 |
| 审查结论 | 通过 |
| 本功能单测 | 全绿（11/11） |

---

## 1. 概述

**需求：** 实现可用的全局搜索，体验对齐 VS Code。

**本轮目标：** 侧栏完整搜索视图 + Quick Open + 顶栏去误导。

**选型：** 推荐提案 1（轻量），用户选定 **提案 2（完整搜索视图）**，无额外调整。

**交付物目录：** `docs/deliverables/global-search/_artifacts/`

---

## 2. 方案

已确认方案：顶栏项目语义、侧栏 debounce 搜索、大小写/全词/正则、include/exclude glob、全部替换、`fs:search` 扩展、`fs:searchReplace`、`fs:listProjectFiles`、Quick Open（⌘P）、⌘⇧F 预填选中文本。

详见 `_artifacts/proposal-global-search.md`。

---

## 3. 方案选型过程

| 维度 | 提案 1 | 提案 2 |
|------|--------|--------|
| 范围 | 轻量 | 完整搜索视图 |
| 用户选择 | — | **选定** |

详见 `_artifacts/02-selection.md`。

---

## 4. 实施计划

四阶段：后端 search-utils → 前端 SearchPanel → Quick Open + 快捷键 → 单测。

详见 `_artifacts/plan-global-search.md`。

---

## 5. 实现说明

- 新增 `electron/main/search-utils.ts`、`QuickOpenPalette.vue`、`quick-open-fuzzy.ts`
- `SearchPanel.vue` 重写为 VS Code 风格
- `TitleBar.vue` 文件夹图标 + 项目文案

详见 `_artifacts/05-implement-report.md`。

---

## 6. 单元测试执行情况

```bash
npm test -- tests/unittest/UT-global-search
# 11 passed (11)
```

本功能 **全绿**。全仓另有 1 项无关既有失败（sandbox-dispatch）。

详见 `_artifacts/05-unittest.md`。

---

## 7. 测试报告

| 场景 | 状态 |
|------|------|
| debounce 搜索 | 单测 + 待手工 |
| ripgrep 参数 | 单测通过 |
| 替换逻辑 | 单测通过 |
| fuzzy Quick Open | 单测通过 |
| ⌘P / ⌘⇧F 手工 | 待用户在 dev 中验证 |

---

## 8. 代码审查

**结论：通过。** 无阻塞项。

详见 `_artifacts/06-code-review.md`。

---

## 9. 变更清单

| 路径 | 类型 | 说明 |
|------|------|------|
| `electron/main/search-utils.ts` | 新增 | 搜索/替换/列文件 |
| `electron/main/fs-ipc.ts` | 修改 | 扩展 IPC |
| `src/components/workbench/SearchPanel.vue` | 修改 | 完整搜索 UI |
| `src/components/workbench/QuickOpenPalette.vue` | 新增 | ⌘P |
| `src/components/workbench/TitleBar.vue` | 修改 | 顶栏语义 |
| `src/App.vue` | 修改 | 编排 |
| `tests/unittest/UT-global-search/` | 新增 | 单测 |

---

## 10. 遗留项与后续建议

1. Quick Open 列表缓存
2. 单次替换（非 Replace All）
3. 修复无关 `sandbox-dispatch` 单测

---

## 11. 附录：过程文档索引

| 文件 |
|------|
| `_artifacts/00-research-links.md` |
| `_artifacts/02-selection.md` |
| `_artifacts/proposal-global-search.md` |
| `_artifacts/plan-global-search.md` |
| `_artifacts/05-implement-report.md` |
| `_artifacts/05-unittest.md` |
| `_artifacts/06-code-review.md` |

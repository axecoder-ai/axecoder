# 功能实现报告：model-settings

## 功能说明

1. **协作工坊**：输入区下方增加 `ModelPickerDropdown`；无启用模型时显示「添加模型」并禁用「开始」，移除阻塞式 `alert`。
2. **设置深链**：`SettingsPanel.openTab('models')`；`App.openModelsSettings` 打开设置并定位「模型」Tab；TitleBar / Chat / Workshop 统一入口。
3. **Models 增强**：侧栏与页标题中文化；列表标注「当前」「已禁用」；「测试连接」调用 `models:ping` 显示结果。
4. **主进程**：`models-ping.ts` + IPC `models:ping`。

## 修改文件

| 路径 | 说明 |
|------|------|
| `electron/main/models-ping.ts` | 新增 ping 逻辑 |
| `electron/main/models-ipc.ts` | 注册 ping handler |
| `electron/preload/index.ts` | `pingModel` |
| `src/types/axecoder.d.ts` | `ModelPingResult` |
| `src/components/workbench/SettingsPanel.vue` | `openTab`、中文 Tab |
| `src/App.vue` | `openModelsSettings`、refs |
| `src/components/workbench/WorkshopPane.vue` | 模型选择器 |
| `src/components/workbench/ModelsTab.vue` | 测试连接 UI |
| `tests/unittest/UT-model-settings/models-ping.test.ts` | ping 单测 |

## 注意事项

- ping 会发起真实 API 请求（极简 user 消息），可能产生少量费用。
- 工坊与 Chat 共用 `activeModelId`。

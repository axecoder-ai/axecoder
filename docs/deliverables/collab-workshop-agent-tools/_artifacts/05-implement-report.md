# 功能实现报告：Collab Workshop Agent 工具

## 功能说明

Workshop 各角色（经理/后端/前端/测试）默认通过 **`runSubAgentTask`** 调用 Read、Grep、Glob、Write、Edit 等工具；经理/测试为 `explore`（只读），后端/前端为 `generalPurpose`（可写盘，子代理自动 apply）。

角色 prompt 明确要求：用户提到 `zhongzhi` 等路径时必须先读代码再发言。

## 修改文件列表

| 文件 | 说明 |
|------|------|
| `electron/main/workshop/workshop-subagent-speaker.ts` | 新增：子代理 RoleSpeaker |
| `electron/main/workshop-ipc.ts` | 默认 speaker 改为 subagent |
| `src/components/workbench/WorkshopPane.vue` | Agentic 标识 |
| `tests/unittest/UT-collab-workshop/workshop-subagent-speaker.test.ts` | 新增单测 |

## 单测覆盖

- 路径提取、prompt 含工具指令、澄清检测、subagentType、mock 集成

## 注意事项

- V1 纯 `chatWithProvider` 已替换；`AXECODER_WORKSHOP_SCRIPTED=1` 仍走脚本编排（无工具）
- 写盘无 Chat 式 diff 确认（提案 2 取舍）
- 四角色串行子代理，耗时会明显增加

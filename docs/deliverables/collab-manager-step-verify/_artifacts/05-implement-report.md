# 功能实现报告 – collab-manager-step-verify

## 功能说明

协作 Workshop 启动后：

1. **planning**：技术经理输出 JSON 步骤计划（`assigneeUserId` 必须来自 `~/.aex-coder/users.json`，且不可指派经理）。
2. **step_running**：按步骤逐个执行对应用户的 Agent。
3. **step_verify**：经理输出 `VERIFY: approve|redo|abort`；`redo` 重跑当前步（每步最多 2 次）。
4. **UI**：`WorkshopPane` 顶栏展示步骤进度条，高亮当前步。

## 修改文件

| 文件 | 说明 |
|------|------|
| `electron/main/workshop/workshop-plan-parse.ts` | 新建：计划/验收解析 |
| `electron/main/workshop/workshop-orchestrator.ts` | 步骤状态机编排 |
| `electron/main/workshop/workshop-types.ts` | 步骤与 phase 类型 |
| `electron/main/workshop/workshop-user-bind.ts` | userId 绑定与角色推断 |
| `electron/main/workshop/workshop-subagent-speaker.ts` | 拆步/执行/验收 prompt |
| `electron/main/workshop/workshop-agent-speaker.ts` | 流式 sessionId 按 user |
| `electron/main/workshop/workshop-stream.ts` | streamKey 支持任意后缀 |
| `src/types/axecoder.d.ts` | 前端类型同步 |
| `src/components/workbench/WorkshopPane.vue` | 步骤条 + 按 speakerUserId 展示头像 |
| `src/utils/workshop-user-bind.ts` | 前端 userId/推断 |
| `tests/unittest/UT-collab-workshop/workshop-plan-parse.test.ts` | 新建 |
| `tests/unittest/UT-collab-workshop/workshop-orchestrator.test.ts` | 更新 |

## 单测覆盖

- 计划 JSON 解析、非法 userId、经理不可执行
- 全流程 scripted、验收 redo、澄清挂起恢复

## 注意事项

- 用户配置路径为 `getAxecoderDir()/users.json`（默认 `~/.aex-coder/users.json`）。
- 真实环境经理须输出可解析 JSON；验收首行须含 `VERIFY:` 指令。

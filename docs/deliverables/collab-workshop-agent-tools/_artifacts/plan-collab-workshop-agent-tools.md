# Collab Workshop Agent 工具（提案 2）实施计划

## 阶段一

1. `workshop-subagent-speaker.ts` — 角色 prompt、`buildSubagentRoleSpeaker`、`parseSubagentReport`
2. `workshop-ipc.ts` — 默认使用 subagent speaker（scripted 环境变量仍可用）
3. 单测 `UT-collab-workshop/workshop-subagent-speaker.test.ts`

## 阶段二

4. 角色 prompt 强调：用户给出路径时必须 Read/Grep
5. 手工：打开 jxsv2 项目，Workshop 输入查看 zhongzhi

## 验证

- `npm test tests/unittest/UT-collab-workshop`

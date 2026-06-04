# 单测 — workshop-context-parity

## 命令

```bash
npm test -- tests/unittest/UT-workshop-context-parity tests/unittest/UT-collab-workshop/workshop-turn-orchestrator.test.ts tests/unittest/UT-workshop-agent-parity
```

## 结果

- **本轮新增** `UT-workshop-context-parity`：**4/4 通过**
- **编排** `workshop-turn-orchestrator.test.ts`：**7/7 通过**
- **agent speaker** `workshop-agent-parity`：**1/1 通过**

## 既有失败（非本轮引入）

`UT-collab-workshop` 中 `workshop-user-bind`、`workshop-subagent-speaker` 各 1 项失败，与本次改动文件无关。

## 统计

本轮相关用例：**12/12 绿**；全量 `UT-collab-workshop` 若一并跑含 2 个历史失败项。

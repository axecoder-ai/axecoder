# Plan: Agent Loop Guard

## 背景

Agent 可能陷入同一工具错误重试或重复写操作；需运行时拦截（对齐 Reasonix loop guard）。

## 设计

1. `LoopGuardState`：`stormSig/stormCount/repeatSuccessCounts/toolRounds`
2. `resolveLoopGuardConfig(cfg)` 读阈值，默认 storm=3 repeat=2 enabled=true maxRounds=0
3. `checkRepeatBeforeExecute` / `recordToolOutcome` / `applyStormToBatch`
4. `agent-loop.ts`：工具批前检查 repeat；批后 storm；每轮 tool round 计数与 maxRounds
5. `agent-subagent.ts`：独立 state，同样逻辑
6. 进度：`kind: 'loop_guard'` → ChatPane 展示 warn 条
7. GeneralTab：开关 + 阈值 + max rounds

## 任务

- [ ] 单测 UT-agent-loop-guard
- [ ] 实现 agent-loop-guard.ts
- [ ] 接入主循环与子代理
- [ ] 配置与 UI
- [ ] 全量 vitest

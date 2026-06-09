# 实施计划 — agent-progress-detail

## 阶段 1：后端 detail 管道

1. 新增 `agent-progress-detail.ts` 格式化函数
2. `agent-loop` model done / tool done emit `detail`

## 阶段 2：前端展示

1. 扩展 `AgentProgressStep` / `AgentProgressPayload`
2. `applyProgressPayload` 写入 detail
3. `AgentProgressStream` 每步下方 `<pre class="step-detail">`

## 阶段 3：测试

1. UT-agent-progress 覆盖 detail 落盘与格式化

# 代码审查

## 审查范围

对照已确认方案（底部性能 Tab + 按模型筛选 + 脱离/收回），审查步骤 5 全部变更。

## 功能

- ✅ TitleBar 一键打开底部性能 Tab
- ✅ 聊天与 Agent 调用埋点
- ✅ 按模型筛选 KPI/曲线/汇总表
- ✅ 脱离 `#metrics` 独立窗与收回

## 质量

- ✅ `ai-metrics-store` 单测覆盖核心聚合与筛选
- ✅ 复用伴生窗 IPC 模式，改动面可控
- ✅ Canvas 轻量图表，无新增 npm 依赖

## 安全

- ✅ 指标仅主进程内存，无外部上报

## 非阻塞待办

- Workshop LLM 路径可补 `workshop` source 埋点（当前默认 `other`/`agent`）
- 可考虑 StatusBar 显示当前 TTFT 简况

## 结论

**通过** — 可合并交付。

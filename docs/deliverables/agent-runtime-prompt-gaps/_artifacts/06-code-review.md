# 审查

**结论：通过**

- Hooks 在 projectRoot 执行，失败即阻断工具。
- 自动 compact 为规则摘要（非 LLM 摘要），与 Claude 完整管线仍有差距（遗留）。
- `bypassPermissions` 需谨慎配置。

**非阻塞：** compact 可后续接 `ai:chat` 摘要；Scratchpad 工具级 API 可暴露 Write 到 scratchpad 路径。

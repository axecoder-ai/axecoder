# 代码审查

## 功能

- 与 Claude `outputStyles.ts` / `prompts.ts` 组装语义一致：default → null；Explanatory/Learning 动态段；intro 分支；`keepCodingInstructions` 控制 doing tasks。
- 配置贯通 main ↔ renderer。

## 质量

- 单测覆盖三风格与组装顺序；无多余抽象。
- 符号 `★` / `•` 替代 `figures`，语义与插件版一致。

## 安全

- 仅改系统提示文案，无新 IPC 面；配置存本地 `config.json`。

## 结论

**通过**

## 非阻塞待办

- 自定义 markdown output-styles 目录
- 与 Output efficiency 篇幅的产品说明

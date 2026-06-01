# 实现报告

## 功能

- 每条消息：`WorkshopMessageItem` 展示圆形头像、昵称、角色徽章、气泡
- 用户消息右对齐，右侧头像；员工左对齐左侧头像
- 澄清输入区显示当前用户头像与「你 · 需求方」

## 文件

- `src/utils/workshop-roles.ts` — nickname / roleTitle
- `src/components/workbench/WorkshopMessageItem.vue` — 新建
- `src/components/workbench/WorkshopPane.vue` — 接入组件
- `tests/unittest/UT-collab-workshop/workshop-roles-ui.test.ts`

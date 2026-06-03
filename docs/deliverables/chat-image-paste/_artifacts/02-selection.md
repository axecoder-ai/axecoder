# 选型记录：chat-image-paste

## 2a 选型摘要（归档）

- **需求：** 聊天支持粘贴图片；多模态模型通过后端正确发送；非 vision 模型提示。
- **推荐：** 提案 1 – 落盘附件 + `supportsVision` 开关。

## 2b 用户最终选择

- **选定提案：** 提案 1 – 消息内嵌附件 + 模型 vision 开关
- **范围调整：** Chat + Workshop 输入框 + Agent 模式均需支持传图

## 2c 调整说明

- 无额外文字调整；范围较默认（仅 Chat）扩大至 Workshop 与 Agent。

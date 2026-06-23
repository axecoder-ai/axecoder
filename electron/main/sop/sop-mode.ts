/** 可选：单 session 塌陷（跳过 MetaGPT 多阶段编排）；默认走完整 SOP */
export const isSopFastMode = (): boolean => process.env.AXECODER_SOP_FAST === '1'

/** 可选：implement 逐 task 串行（旧行为）；默认一批 task 单次 Agent 会话 */
export const isSopPerTaskMode = (): boolean => process.env.AXECODER_SOP_PER_TASK === '1'

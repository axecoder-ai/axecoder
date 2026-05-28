import type { AgentToolCall } from '../agent-types'
import type { AgentContext, ToolRunResult } from '../tool-executor'

/** 复杂 tool 的执行逻辑；未识别的 tool 返回 null，由基础 executor 继续处理 */
export const executeComplexAgentTool = async (
  _ctx: AgentContext,
  _call: AgentToolCall,
): Promise<ToolRunResult | null> => null

import { runAgentBash, formatBashToolContent } from './agent-bash'

/** 用户 `! <command>` — 在 projectRoot 执行并返回输出 */
export const runUserShellCommand = async (projectRoot: string, command: string) => {
  const cmd = command.trim()
  if (!cmd) return { ok: false as const, error: 'empty command' }
  const res = await runAgentBash(projectRoot, cmd)
  if (!res.ok) return res
  return {
    ok: true as const,
    text: formatBashToolContent(res),
    exitCode: res.exitCode,
  }
}

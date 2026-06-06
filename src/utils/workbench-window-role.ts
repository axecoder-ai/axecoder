export type WorkbenchWindowRole = 'main' | 'companion' | 'metrics' | 'trace'

/** 从 location.hash 解析工作台窗口角色 */
export const parseWorkbenchRoleFromHash = (hash: string): WorkbenchWindowRole => {
  const normalized = hash.replace(/^#/, '').trim().toLowerCase()
  if (normalized === 'companion') return 'companion'
  if (normalized === 'metrics') return 'metrics'
  if (normalized === 'trace') return 'trace'
  return 'main'
}

export const parseWorkbenchRoleFromLocation = (loc: { hash: string }): WorkbenchWindowRole =>
  parseWorkbenchRoleFromHash(loc.hash)

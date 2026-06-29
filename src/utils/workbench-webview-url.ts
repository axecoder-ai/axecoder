/** 解析 workbench-shell iframe URL（dev / prod） */

export const resolveWorkbenchShellUrl = (
  entry: string,
  opts?: { devServerUrl?: string; basePath?: string },
): string => {
  const route = entry.replace(/^\//, '')
  const dev = opts?.devServerUrl?.replace(/\/$/, '')
  if (dev) return `${dev}/workbench-shell.html#/${route}`
  const base = (opts?.basePath ?? './').replace(/\/?$/, '/')
  return `${base}workbench-shell.html#/${route}`
}

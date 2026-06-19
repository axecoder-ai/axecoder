import fs from 'node:fs/promises'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

export type TestExecResult = { exitCode: number; output: string }

export type TestExecFn = (command: string, cwd: string) => Promise<TestExecResult>

const defaultExec: TestExecFn = async (command, cwd) => {
  try {
    const { stdout, stderr } = await execFileAsync('bash', ['-lc', command], {
      cwd,
      timeout: 120_000,
      maxBuffer: 2 * 1024 * 1024,
    })
    const output = [stdout, stderr].filter(Boolean).join('\n')
    return { exitCode: 0, output }
  } catch (e: unknown) {
    const err = e as { code?: number; stdout?: string; stderr?: string; message?: string }
    const output = [err.stdout, err.stderr, err.message].filter(Boolean).join('\n')
    return { exitCode: typeof err.code === 'number' ? err.code : 1, output }
  }
}

/** 探测项目 test 命令：package.json → Makefile → go.mod */
export const detectTestCommand = async (projectRoot: string): Promise<string | null> => {
  const root = projectRoot.trim()
  if (!root) return null

  const pkgPath = path.join(root, 'package.json')
  try {
    const raw = await fs.readFile(pkgPath, 'utf-8')
    const pkg = JSON.parse(raw) as { scripts?: Record<string, string> }
    const testScript = pkg.scripts?.test?.trim()
    if (testScript && !/^echo\s/i.test(testScript) && testScript !== 'exit 0') {
      const pm = (await fs.access(path.join(root, 'pnpm-lock.yaml')).then(() => 'pnpm').catch(() =>
        fs.access(path.join(root, 'yarn.lock')).then(() => 'yarn').catch(() => 'npm'),
      )) as string
      return `${pm} test`
    }
  } catch {
    /* no package.json */
  }

  try {
    const mk = await fs.readFile(path.join(root, 'Makefile'), 'utf-8')
    if (/^test\s*:/m.test(mk)) return 'make test'
  } catch {
    /* no Makefile */
  }

  try {
    await fs.access(path.join(root, 'go.mod'))
    return 'go test ./...'
  } catch {
    /* not go */
  }

  return null
}

export const runProjectTests = async (
  projectRoot: string,
  exec: TestExecFn = defaultExec,
): Promise<{ ok: boolean; output: string; command: string }> => {
  const command = (await detectTestCommand(projectRoot)) ?? 'echo "no test command detected"'
  if (command.startsWith('echo')) {
    return { ok: false, output: command, command }
  }
  const r = await exec(command, projectRoot)
  const output = r.output.trim() || `(exit ${r.exitCode})`
  const passEvidence =
    r.exitCode === 0 ||
    /(\d+\s*(passed|passing)|^ok\s+\d+|PASS:|all tests pass)/im.test(output)
  return { ok: r.exitCode === 0 && passEvidence, output, command }
}

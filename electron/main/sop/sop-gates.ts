import fs from 'node:fs/promises'
import path from 'node:path'
import type { SopPipelinePhase } from './sop-types'
import { extractJsonBlock } from './sop-artifact'
import { parseDesignJson } from './schemas/design'
import { parsePrdJson } from './schemas/prd'
import { parseTasksJson } from './schemas/tasks'

export type SopGateResult = { ok: true } | { ok: false; error: string }

const DOC_ARTIFACT_RE = /^docs\/deliverables\//
const TEST_ONLY_RE = /^(tests?|__tests__)\//i

/** implement 闸门：排除 docs/ 与纯测试路径，要求有应用源码 */
export const filterImplementSourcePaths = (relatedFiles: string[] | undefined): string[] =>
  (relatedFiles ?? [])
    .map((f) => f.replace(/^\/+/, '').trim())
    .filter(Boolean)
    .filter((f) => !DOC_ARTIFACT_RE.test(f) && !f.endsWith('.md') && !TEST_ONLY_RE.test(f))

export const validateImplementOnDisk = async (
  relatedFiles: string[] | undefined,
  projectRoot: string,
): Promise<SopGateResult> => {
  const sourceLike = filterImplementSourcePaths(relatedFiles)
  if (!sourceLike.length) {
    return {
      ok: false,
      error: 'implement: must Write application source files (not only docs/tests) and list paths',
    }
  }
  if (!projectRoot.trim()) return { ok: true }
  let found = 0
  for (const rel of sourceLike) {
    try {
      await fs.access(path.join(projectRoot, rel))
      found++
    } catch {
      /* missing on disk */
    }
  }
  if (!found) {
    return { ok: false, error: 'implement: listed source files not found on disk — use Write tool' }
  }
  return { ok: true }
}

const tryParseJson = (body: string, parse: (s: string) => { ok: boolean }) => {
  if (parse(body).ok) return true
  const block = extractJsonBlock(body)
  if (block && parse(block).ok) return true
  return false
}

const prdMarkdownOk = (body: string) =>
  /用户故事|User Stories|需求池|Requirement Pool|竞品|PRD|产品需求|功能需求|核心目标|需求澄清|功能点|验收标准/i.test(
    body,
  ) && body.length >= 40

const designMarkdownOk = (body: string) =>
  /文件列表|File List|数据结构|Data Structure|API|接口|系统设计|架构/i.test(body) && body.length >= 40

const tasksMarkdownOk = (body: string) =>
  /## Tasks|任务列表|任务拆分|^- \[/im.test(body) || /"tasks"\s*:\s*\[/i.test(body)

/** 阶段闸门：校验 artifact 正文是否满足进入下一阶段的条件 */
export const validateSopGate = (phase: SopPipelinePhase, artifactBody: string): SopGateResult => {
  const body = artifactBody.trim()
  if (!body) return { ok: false, error: `${phase}: empty artifact` }

  if (phase === 'prd') {
    if (tryParseJson(body, (s) => parsePrdJson(s))) return { ok: true }
    if (prdMarkdownOk(body)) return { ok: true }
    return { ok: false, error: 'PRD needs JSON or structured requirements (user stories / 用户故事)' }
  }

  if (phase === 'design') {
    if (tryParseJson(body, (s) => parseDesignJson(s))) return { ok: true }
    if (designMarkdownOk(body)) return { ok: true }
    return { ok: false, error: 'Design needs JSON or file list / 文件列表' }
  }

  if (phase === 'tasks') {
    if (tryParseJson(body, (s) => parseTasksJson(s))) return { ok: true }
    if (tasksMarkdownOk(body)) return { ok: true }
    return { ok: false, error: 'Tasks needs JSON or task list' }
  }

  if (phase === 'implement') {
    return body.length >= 8 ? { ok: true } : { ok: false, error: 'implement: output too short' }
  }

  if (phase === 'qa') {
    const passText = /pass|通过|all tests green|全绿|测试通过/i.test(body)
    const testEvidence =
      /(\d+\s*(passed|passing)|^ok\s+\d+|PASS:|FAIL:|go test|make test|npm test|pnpm test|pytest|vitest|cargo test)/im.test(
        body,
      )
    if (passText && testEvidence) return { ok: true }
    if (passText && body.length >= 120) return { ok: true }
    return {
      ok: false,
      error: 'qa: run tests via Bash (e.g. make test) and paste output showing pass/fail',
    }
  }

  return { ok: true }
}

const SOURCE_ROOTS = ['cmd', 'internal', 'pkg', 'src', 'app', 'server', 'api']
const SOURCE_FILE_RE = /\.(go|ts|tsx|js|jsx|py|rs|java|kt|cs|rb|php|vue|swift|c|cpp|h)$/i
const SKIP_DIRS = new Set(['node_modules', '.git', 'vendor', 'dist', 'build', 'docs', 'tests', 'test'])

const walkForSource = async (dir: string, depth: number): Promise<boolean> => {
  if (depth > 4) return false
  let entries: import('node:fs').Dirent[]
  try {
    entries = await fs.readdir(dir, { withFileTypes: true })
  } catch {
    return false
  }
  for (const e of entries) {
    if (e.name.startsWith('.')) continue
    if (SKIP_DIRS.has(e.name)) continue
    const full = path.join(dir, e.name)
    if (e.isFile() && SOURCE_FILE_RE.test(e.name)) return true
    if (e.isDirectory() && (await walkForSource(full, depth + 1))) return true
  }
  return false
}

/** 磁盘上是否已有应用源码（排除 docs/tests 目录） */
export const projectHasApplicationSource = async (projectRoot: string): Promise<boolean> => {
  const root = projectRoot.trim()
  if (!root) return false
  for (const rel of SOURCE_ROOTS) {
    try {
      const st = await fs.stat(path.join(root, rel))
      if (st.isDirectory() && (await walkForSource(path.join(root, rel), 0))) return true
    } catch {
      /* missing dir */
    }
  }
  for (const name of ['main.go', 'main.ts', 'main.py', 'index.ts', 'app.go']) {
    try {
      await fs.access(path.join(root, name))
      return true
    } catch {
      /* missing file */
    }
  }
  return false
}

export const SOP_CODE_RECOVERY_RE =
  /代码|源码|写了吗|在哪|没看到|没找到|missing|where.*code|补写|implement|没写/i

/** done 后追问：用户关心代码 / 仓库无源码 → 触发 Researcher + Developer 补写 */
export const shouldTriggerSopCodeRecovery = async (
  userText: string,
  projectRoot: string,
): Promise<boolean> => {
  if (SOP_CODE_RECOVERY_RE.test(userText)) return true
  if (!projectRoot.trim()) return false
  return !(await projectHasApplicationSource(projectRoot))
}

import fs from 'node:fs/promises'
import path from 'node:path'
import { runRipgrepFiles } from './rg-files'
import {
  applyParameterResponseStatus,
  bucketRelativePaths,
  buildManifestFromBuckets,
  classifyBackgroundRelativePath,
  collectProposalResponseTexts,
  emptyScanBuckets,
  findRespondedParameterIds,
  isInitReadableRelativePath,
  isInitResponseCheckRelativePath,
  isParamSourceRelativePath,
  isUnderHiddenPathSegment,
  mergeParsedParameters,
  extractParamTextBlocks,
  mergeParameterContents,
  isProjectInfoSourceRelativePath,
  mergeProjectInfo,
  parseProjectInfoFromTexts,
  supplementProjectInfoFromParameters,
  PARAMS_SUMMARY_REL,
} from '../../src/utils/background-init'
import type { InitBackgroundResult } from '../../src/types/writcraft'
import type { InitProgressStage } from '../../src/utils/background-init-progress'
import { isPathInsideRoot } from './fs-utils'
import {
  extractProjectInfoWithAi,
  extractTechParamsWithAi,
  mergeAiAndRuleParameters,
} from './background-init-ai'
import type { InitAiProgress } from './background-init-ai'

export type InitBackgroundProgressReporter = {
  stage?: (stage: InitProgressStage) => void
  file?: (relativePath: string, current: number, total: number) => void
  ai?: (payload: InitAiProgress) => void
}

const SCAN_GLOB = '**/*'
const MAX_INIT_READ_BYTES = 1024 * 1024

const relativeToProject = (projectRoot: string, absPath: string) => {
  const root = projectRoot.replace(/\\/g, '/').replace(/\/$/, '')
  const p = absPath.replace(/\\/g, '/')
  if (p.startsWith(root + '/')) return p.slice(root.length + 1)
  return path.basename(absPath)
}

export const initBackgroundMaterials = async (
  projectRoot: string,
  onProgress?: InitBackgroundProgressReporter,
  modelId?: string,
): Promise<InitBackgroundResult> => {
  if (!projectRoot?.trim()) {
    return { ok: false, error: '未打开项目' }
  }

  const stage = (s: InitProgressStage) => onProgress?.stage?.(s)
  const fileProgress = (rel: string, current: number, total: number) =>
    onProgress?.file?.(rel, current, total)

  let absFiles: string[] = []
  try {
    stage('scan')
    absFiles = await runRipgrepFiles(projectRoot, SCAN_GLOB)
    absFiles.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { ok: false, error: `扫描项目文件失败：${msg}` }
  }

  const buckets = emptyScanBuckets()
  const paramFileParts: { relativePath: string; content: string }[] = []
  const aiCandidates: { relativePath: string; content: string }[] = []
  const allReadableFiles: { relativePath: string; content: string }[] = []
  const total = absFiles.length

  stage('inspect')
  for (let i = 0; i < absFiles.length; i++) {
    const abs = absFiles[i]
    const rel = relativeToProject(projectRoot, abs)
    fileProgress(rel, i + 1, total)

    if (!isPathInsideRoot(projectRoot, abs)) continue
    if (isUnderHiddenPathSegment(rel)) continue

    let stat
    try {
      stat = await fs.stat(abs)
    } catch {
      continue
    }
    if (!stat.isFile()) continue

    const bucket = classifyBackgroundRelativePath(rel)
    if (bucket) buckets[bucket].push(rel.replace(/\\/g, '/'))

    if (!isInitReadableRelativePath(rel)) continue
    if (stat.size > MAX_INIT_READ_BYTES) continue

    let content: string
    try {
      content = await fs.readFile(abs, 'utf-8')
    } catch {
      continue
    }

    const relNorm = rel.replace(/\\/g, '/')
    allReadableFiles.push({ relativePath: relNorm, content })
    const techBlocks = extractParamTextBlocks(content, relNorm)
    let pushedParam = false
    if (bucket === 'params' || isParamSourceRelativePath(rel)) {
      paramFileParts.push({ relativePath: relNorm, content })
      aiCandidates.push({ relativePath: relNorm, content })
      pushedParam = true
    } else if (techBlocks.length > 0) {
      const blockText = techBlocks.map((b) => b.text).join('\n\n')
      paramFileParts.push({ relativePath: relNorm, content: blockText })
      aiCandidates.push({ relativePath: relNorm, content: blockText })
      pushedParam = true
    }
    if (
      !pushedParam &&
      /技术|商务|参数|部署|框架|数据库|资质|业绩|服务/i.test(relNorm + '\n' + content.slice(0, 2000))
    ) {
      aiCandidates.push({ relativePath: relNorm, content })
    }
  }

  for (const key of Object.keys(buckets) as (keyof typeof buckets)[]) {
    buckets[key] = [...new Set(buckets[key])].sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: 'base' }),
    )
  }

  const writcraftDir = path.join(projectRoot, '.writcraft')
  await fs.mkdir(writcraftDir, { recursive: true })

  let summaryPath: string | undefined
  if (paramFileParts.length > 0) {
    stage('mergeParams')
    const merged = mergeParameterContents(paramFileParts)
    if (merged.trim()) {
      const summaryAbs = path.join(projectRoot, PARAMS_SUMMARY_REL)
      await fs.writeFile(summaryAbs, merged, 'utf-8')
      summaryPath = PARAMS_SUMMARY_REL
    }
  }

  let parameters = mergeParsedParameters(paramFileParts)

  const uniqueAiCandidates: { relativePath: string; content: string }[] = []
  const seenAi = new Set<string>()
  for (const c of aiCandidates) {
    if (seenAi.has(c.relativePath)) continue
    seenAi.add(c.relativePath)
    uniqueAiCandidates.push(c)
  }

  const mid = modelId?.trim()
  const emitAi = (payload: InitAiProgress) => onProgress?.ai?.(payload)

  if (mid) {
    try {
      if (uniqueAiCandidates.length > 0) {
        stage('aiExtract')
        const aiRound1 = await extractTechParamsWithAi(mid, uniqueAiCandidates, emitAi, {
          round: 1,
          fullContent: false,
        })
        parameters = mergeAiAndRuleParameters(aiRound1, parameters)
      }

      if (parameters.length === 0 && allReadableFiles.length > 0) {
        stage('aiExtractFull')
        const seenFull = new Set<string>()
        const fullList: { relativePath: string; content: string }[] = []
        for (const f of allReadableFiles) {
          if (seenFull.has(f.relativePath)) continue
          seenFull.add(f.relativePath)
          fullList.push(f)
        }
        const aiRound2 = await extractTechParamsWithAi(mid, fullList, emitAi, {
          round: 2,
          fullContent: true,
        })
        parameters = mergeAiAndRuleParameters(aiRound2, parameters)
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      return { ok: false, error: `大模型识别技术参数失败：${msg}` }
    }
  }

  stage('projectInfo')
  const tenderParts = allReadableFiles.filter((f) => isProjectInfoSourceRelativePath(f.relativePath))
  let projectInfo = parseProjectInfoFromTexts(tenderParts)
  if (mid && tenderParts.length > 0) {
    try {
      const aiProject = await extractProjectInfoWithAi(mid, tenderParts, emitAi)
      projectInfo = mergeProjectInfo(projectInfo, aiProject)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      return { ok: false, error: `大模型识别项目信息失败：${msg}` }
    }
  }
  if (parameters.length > 0) {
    projectInfo = supplementProjectInfoFromParameters(projectInfo, parameters)
  }

  if (parameters.length > 0) {
    stage('checkResponse')
    const responseTexts = collectProposalResponseTexts(allReadableFiles)
    const respondedIds = findRespondedParameterIds(responseTexts, parameters)
    parameters = applyParameterResponseStatus(parameters, respondedIds)
  }

  stage('writeManifest')
  const manifest = buildManifestFromBuckets(buckets, {
    includeSummary: !!summaryPath,
    parameters,
    projectInfo,
  })
  const manifestPath = path.join(writcraftDir, 'background.json')
  try {
    await fs.unlink(manifestPath)
  } catch {
    /* 不存在则忽略 */
  }
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf-8')

  stage('done')

  const counts: Record<string, number> = {}
  counts.scanned = total
  for (const cat of manifest.categories) {
    counts[cat.id] = cat.paths?.length ?? 0
  }
  if (parameters.length) {
    counts.parameters = parameters.length
    counts.responded = parameters.filter((p) => p.status === 'responded').length
    counts.pending = parameters.filter((p) => p.status === 'pending').length
  }

  return {
    ok: true,
    manifestPath,
    summaryPath,
    parameters,
    projectInfo,
    counts,
  }
}

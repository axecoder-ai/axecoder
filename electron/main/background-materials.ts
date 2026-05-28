import fs from 'node:fs/promises'
import path from 'node:path'
import { runRipgrepFiles } from './rg-files'
import { isPathInsideRoot } from './fs-utils'
import {
  dedupePaths,
  isAiContextAllowed,
  parseBackgroundManifest,
  resolveRelativePath,
} from '../../src/utils/background-materials'
import {
  applyParameterResponseStatus,
  collectProposalResponseTexts,
  findRespondedParameterIds,
  isInitResponseCheckRelativePath,
  isParamParseableRelativePath,
  mergeParsedParameters,
} from '../../src/utils/background-init'
import type {
  BackgroundMaterialCategory,
  BackgroundMaterialEntry,
  BackgroundMaterialsResult,
} from '../../src/types/writcraft'

const pathExists = async (p: string) => {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

const relativeToProject = (projectRoot: string, absPath: string) => {
  const root = projectRoot.replace(/\\/g, '/').replace(/\/$/, '')
  const p = absPath.replace(/\\/g, '/')
  if (p.startsWith(root + '/')) return p.slice(root.length + 1)
  return path.basename(absPath)
}

const entryFromAbs = async (
  projectRoot: string,
  absPath: string,
): Promise<BackgroundMaterialEntry | null> => {
  if (!isPathInsideRoot(projectRoot, absPath)) return null
  const exists = await pathExists(absPath)
  const name = path.basename(absPath)
  return {
    path: absPath,
    relativePath: relativeToProject(projectRoot, absPath),
    exists,
    aiContextAllowed: isAiContextAllowed(name),
  }
}

export const readBackgroundMaterials = async (
  projectRoot: string,
): Promise<BackgroundMaterialsResult> => {
  if (!projectRoot?.trim()) {
    return { ok: false, error: '未打开项目', code: 'NO_PROJECT' }
  }

  const manifestPath = path.join(projectRoot, '.writcraft', 'background.json')
  let rawText = ''
  try {
    rawText = await fs.readFile(manifestPath, 'utf-8')
  } catch {
    return { ok: false, error: '未找到 .writcraft/background.json', code: 'MANIFEST_MISSING' }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(rawText)
  } catch {
    return { ok: false, error: 'background.json 不是合法 JSON', code: 'MANIFEST_INVALID' }
  }

  const validated = parseBackgroundManifest(parsed)
  if (!validated.ok) {
    console.warn('[background]', 'MANIFEST_INVALID', validated.error)
    return { ok: false, error: validated.error, code: 'MANIFEST_INVALID' }
  }

  const categories: BackgroundMaterialCategory[] = []

  for (const cat of validated.manifest.categories) {
    const absPaths: string[] = []

    for (const rel of cat.paths ?? []) {
      const abs = resolveRelativePath(projectRoot, rel)
      if (abs) absPaths.push(abs)
    }

    for (const glob of cat.globs ?? []) {
      if (!glob.trim()) continue
      try {
        const matched = await runRipgrepFiles(projectRoot, glob)
        absPaths.push(...matched)
      } catch (e) {
        console.warn('[background]', 'glob failed', glob, e)
      }
    }

    const unique = dedupePaths(absPaths)
    const entries: BackgroundMaterialEntry[] = []
    for (const abs of unique) {
      const entry = await entryFromAbs(projectRoot, abs)
      if (entry) entries.push(entry)
    }

    entries.sort((a, b) => a.relativePath.localeCompare(b.relativePath, undefined, { sensitivity: 'base' }))
    categories.push({ id: cat.id, label: cat.label, entries })
  }

  let parameters = validated.manifest.parameters ?? []

  if (!parameters.length) {
    const paramsCat = validated.manifest.categories.find((c) => c.id === 'params')
    const parts: { relativePath: string; content: string }[] = []
    for (const rel of paramsCat?.paths ?? []) {
      if (!isParamParseableRelativePath(rel)) continue
      const abs = resolveRelativePath(projectRoot, rel)
      if (!abs || !(await pathExists(abs))) continue
      try {
        const content = await fs.readFile(abs, 'utf-8')
        parts.push({ relativePath: rel.replace(/\\/g, '/'), content })
      } catch {
        /* 跳过不可读 */
      }
    }
    parameters = mergeParsedParameters(parts)
    if (parameters.length) {
      const responseParts: { relativePath: string; content: string }[] = []
      try {
        const mdFiles = await runRipgrepFiles(projectRoot, '**/*.{md,txt,markdown}')
        for (const abs of mdFiles) {
          const rel = relativeToProject(projectRoot, abs)
          if (!isInitResponseCheckRelativePath(rel)) continue
          try {
            responseParts.push({
              relativePath: rel.replace(/\\/g, '/'),
              content: await fs.readFile(abs, 'utf-8'),
            })
          } catch {
            /* 跳过 */
          }
        }
      } catch {
        /* 扫描失败则全部 pending */
      }
      const responseTexts = collectProposalResponseTexts(responseParts)
      parameters = applyParameterResponseStatus(
        parameters,
        findRespondedParameterIds(responseTexts, parameters),
      )
    }
  }

  return {
    ok: true,
    categories,
    parameters,
    projectInfo: validated.manifest.projectInfo,
    manifestPath,
  }
}

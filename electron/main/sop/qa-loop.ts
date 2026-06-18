export type QaLoopRound = {
  round: number
  testOutput: string
  fixSummary?: string
}

export type QaLoopResult = {
  passed: boolean
  rounds: QaLoopRound[]
}

export type QaLoopDeps = {
  maxRounds: number
  runTests: () => Promise<{ ok: boolean; output: string }>
  fixBug: (round: number, testOutput: string) => Promise<string>
}

/**
 * MetaGPT 式可执行反馈：跑测 → 失败则 Developer 修 → 再跑，最多 maxRounds 轮。
 */
export const runQaLoop = async (deps: QaLoopDeps): Promise<QaLoopResult> => {
  const rounds: QaLoopRound[] = []
  const max = Math.max(1, deps.maxRounds)

  for (let round = 1; round <= max; round++) {
    const test = await deps.runTests()
    rounds.push({ round, testOutput: test.output })
    if (test.ok) return { passed: true, rounds }

    if (round < max) {
      const fixSummary = await deps.fixBug(round, test.output)
      rounds[rounds.length - 1]!.fixSummary = fixSummary
    }
  }

  return { passed: false, rounds }
}

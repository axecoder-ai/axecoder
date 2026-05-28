import { describe, expect, it } from 'vitest'
import {
  applyParameterResponseStatus,
  bucketRelativePaths,
  buildManifestFromBuckets,
  classifyBackgroundRelativePath,
  extractParamTextBlocks,
  extractTechnicalParamTextBlocks,
  isBusinessParamRelativePath,
  collectProposalResponseTexts,
  findRespondedParameterIds,
  isInitReadableRelativePath,
  isInitResponseCheckRelativePath,
  isProjectInfoSourceRelativePath,
  mergeParsedParameters,
  mergeParameterContents,
  mergeProjectInfo,
  supplementProjectInfoFromParameters,
  parseParametersFromText,
  parseProjectInfoFromText,
  parseProjectInfoFromTexts,
  isParamParseableRelativePath,
  isParamSourceRelativePath,
  isTechnicalParamRelativePath,
  isUnderHiddenPathSegment,
  PARAMS_SUMMARY_REL,
} from '../../../src/utils/background-init'

describe('background-init', () => {
  it('init 可读与响应检测路径', () => {
    expect(isInitReadableRelativePath('a/参数.md')).toBe(true)
    expect(isInitReadableRelativePath('a/readme.pdf')).toBe(false)
    expect(isInitResponseCheckRelativePath('正文/技术方案.md')).toBe(true)
    expect(isInitResponseCheckRelativePath('背景资料/技术参数.md')).toBe(false)
    expect(isInitResponseCheckRelativePath('背景资料/参数.md')).toBe(false)
  })

  it('隐藏目录不参与归类', () => {
    expect(isUnderHiddenPathSegment('.writcraft/参数汇总.md')).toBe(true)
    expect(classifyBackgroundRelativePath('.writcraft/参数汇总.md')).toBeNull()
  })

  it('按文件名与路径归类', () => {
    expect(classifyBackgroundRelativePath('未来资料/参数.md')).toBe('params')
    expect(classifyBackgroundRelativePath('背景资料/技术参数.md')).toBe('params')
    expect(classifyBackgroundRelativePath('背景资料/标书.md')).toBe('tender')
    expect(classifyBackgroundRelativePath('docs/招标说明.md')).toBe('tender')
    expect(isProjectInfoSourceRelativePath('背景资料/标书.md')).toBe(true)
    expect(classifyBackgroundRelativePath('甲/磋商文件.txt')).toBe('negotiation')
    expect(classifyBackgroundRelativePath('背景资料/说明.md')).toBe('background')
    expect(classifyBackgroundRelativePath('未来资料/其他.md')).toBe('background')
    expect(classifyBackgroundRelativePath('正文/技术方案.md')).toBe('proposal')
    expect(classifyBackgroundRelativePath('technical_proposal.md')).toBe('proposal')
    expect(classifyBackgroundRelativePath('.writcraft/background.json')).toBeNull()
  })

  it('分桶去重排序', () => {
    const buckets = bucketRelativePaths([
      '未来资料/参数.md',
      '未来资料/参数.md',
      '招标.md',
    ])
    expect(buckets.params).toEqual(['未来资料/参数.md'])
    expect(buckets.tender).toEqual(['招标.md'])
  })

  it('合并参数内容带来源标题', () => {
    const merged = mergeParameterContents([
      { relativePath: 'a/参数.md', content: '行1' },
      { relativePath: 'b/参数2.md', content: '行2' },
    ])
    expect(merged).toContain('## 来源: a/参数.md')
    expect(merged).toContain('行1')
    expect(merged).toContain('## 来源: b/参数2.md')
  })

  it('识别参数来源路径', () => {
    expect(isTechnicalParamRelativePath('背景资料/技术参数.md')).toBe(true)
    expect(isBusinessParamRelativePath('背景资料/商务参数.md')).toBe(true)
    expect(isParamSourceRelativePath('背景资料/参数.md')).toBe(true)
    expect(isParamSourceRelativePath('背景资料/技术参数.md')).toBe(true)
    expect(isParamSourceRelativePath('背景资料/商务参数.md')).toBe(true)
    expect(isParamParseableRelativePath('.writcraft/参数汇总.md')).toBe(true)
  })

  it('商务与技术参数均可解析', () => {
    const business = `参数1（多源动态资讯采集与持续更新）
参数2（类似项目业绩不少于2个）`
    const bizItems = parseParametersFromText(business, '背景资料/商务参数.md')
    expect(bizItems.length).toBeGreaterThanOrEqual(1)
    expect(bizItems.every((p) => p.kind === 'business')).toBe(true)

    const tech = `SpringBoot 2.7.10，须支持微服务部署
MySQL 8.0.33：主从架构`
    const techItems = parseParametersFromText(tech, '背景资料/技术参数.md')
    expect(techItems.length).toBeGreaterThanOrEqual(1)
    expect(techItems.every((p) => (p.kind ?? 'technical') === 'technical')).toBe(true)
  })

  it('从混合文档分章节提取技术/商务', () => {
    const mixed = `## 商务要求
参数1（须提供业绩证明）
## 技术参数
- Redis 6.2.6
- Nginx 1.21.6`
    const blocks = extractParamTextBlocks(mixed, '招标.md')
    expect(blocks.length).toBeGreaterThanOrEqual(2)
    const items = parseParametersFromText(mixed, '招标.md')
    expect(items.some((p) => p.kind === 'business')).toBe(true)
    expect(items.some((p) => /Redis|Nginx/.test(p.title))).toBe(true)
  })

  it('合并多文件参数并检测已响应', () => {
    const merged = mergeParsedParameters([
      { relativePath: 'a/技术参数.md', content: '参数1（数据库版本）\n参数2（接口超时）' },
    ])
    expect(merged).toHaveLength(2)
    const responded = findRespondedParameterIds(
      ['### 2.1 小节（对应参数1）'],
      merged,
    )
    const withStatus = applyParameterResponseStatus(merged, responded)
    expect(withStatus[0].status).toBe('responded')
    expect(withStatus[1].status).toBe('pending')
  })

  it('技术方案正文含参数标题则视为已响应', () => {
    const params = [
      { id: '1', label: '参数1', title: 'SpringBoot 2.7.10', status: 'pending' as const, kind: 'technical' as const },
      { id: '2', label: '参数2', title: '未写入的条款', status: 'pending' as const, kind: 'business' as const },
    ]
    const proposal = '本系统后端采用 SpringBoot 2.7.10 构建微服务。'
    const texts = collectProposalResponseTexts([
      { relativePath: '正文/技术方案.md', content: proposal },
      { relativePath: '未来资料/说明.md', content: '无关' },
    ])
    expect(texts).toEqual([proposal])
    const responded = findRespondedParameterIds(texts, params)
    expect(responded.has('1')).toBe(true)
    expect(responded.has('2')).toBe(false)
  })

  it('从招标正文规则提取项目信息', () => {
    const text = `项目名称：智慧城市平台建设项目
项目编号：TEST-SOFT-20260528
采购人：某某市大数据局
项目预算：288000.00元
服务周期：合同签订后90个自然日
付款方式：预付款30%，初验40%
质保期：1年7×24小时运维
建设地点：某某市政务云`
    const info = parseProjectInfoFromText(text)
    expect(info.projectName).toContain('智慧城市')
    expect(info.projectCode).toBe('TEST-SOFT-20260528')
    expect(info.purchaser).toContain('大数据局')
    expect(info.projectAmount).toContain('288000')
    expect(info.servicePeriod).toContain('90')
    expect(info.paymentTerms).toContain('30%')
    expect(info.warranty).toContain('1年')
    expect(info.location).toContain('政务云')
    const fromParams = supplementProjectInfoFromParameters(
      {},
      [
        {
          id: '35',
          label: '参数35',
          title: '项目预算288000.00元',
          status: 'pending',
          kind: 'business',
        },
        {
          id: '41',
          label: '参数41',
          title: '付款节点：预付款30%，初验合格40%',
          status: 'pending',
          kind: 'business',
        },
      ],
    )
    expect(fromParams.projectAmount).toContain('288000')
    expect(fromParams.paymentTerms).toContain('预付款')
    const merged = mergeProjectInfo({}, { projectName: 'A' })
    expect(merged.projectName).toBe('A')
    const fromMany = parseProjectInfoFromTexts([
      { relativePath: '招标.md', content: '项目名称：甲项目' },
      { relativePath: '磋商.md', content: '采购人：乙单位' },
    ])
    expect(fromMany.projectName).toContain('甲项目')
    expect(fromMany.purchaser).toContain('乙单位')
  })

  it('生成 manifest 含 parameters 与 projectInfo', () => {
    const manifest = buildManifestFromBuckets(
      { params: [], tender: [], negotiation: [], proposal: [], background: [] },
      {
        parameters: [
          { id: '1', label: '参数1', title: '标题', status: 'responded', sourcePath: 'x.md' },
        ],
        projectInfo: { projectName: '测试项目', purchaser: '采购方' },
      },
    )
    expect(manifest.parameters).toHaveLength(1)
    expect(manifest.projectInfo?.projectName).toBe('测试项目')
  })

  it('生成 manifest 含技术方案分类且参数类含汇总路径', () => {
    const manifest = buildManifestFromBuckets(
      {
        params: ['未来资料/参数.md'],
        tender: [],
        negotiation: [],
        proposal: ['正文/技术方案.md'],
        background: ['背景/x.md'],
      },
      { includeSummary: true },
    )
    expect(manifest.version).toBe(1)
    expect(manifest.categories).toHaveLength(5)
    expect(manifest.categories.find((c) => c.id === 'proposal')?.paths).toContain('正文/技术方案.md')
    const paramsCat = manifest.categories.find((c) => c.id === 'params')
    expect(paramsCat?.paths[0]).toBe(PARAMS_SUMMARY_REL)
    expect(paramsCat?.paths).toContain('未来资料/参数.md')
  })
})

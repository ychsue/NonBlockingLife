import type { ExportData, ExportTableName } from './exportImportUtils'

const MDTABLE_FORMAT = 'nbl-mdtable'
const MDTABLE_VERSION = 1

const TABLE_NAMES: ExportTableName[] = [
  'task_pool',
  'scheduled',
  'micro_tasks',
  'inbox',
  'resource',
  'log',
]

type LooseRow = Record<string, unknown>

export interface ParsedMdtable {
  format: string
  version: number
  exportedAt: number | null
  markdownInfo: string
  tableOrder: ExportTableName[]
  tables: Partial<Record<ExportTableName, LooseRow[]>>
  warnings: string[]
}

export interface BuildMdtableOptions {
  markdownInfo?: string
  includeFrontMatter?: boolean
}

export interface MdInfoRow {
  key: string
  value: string
  updatedAt: number
}

function normalizeNewLine(input: string): string {
  return input.replace(/\r\n?/g, '\n')
}

function escapeMarkdownTableCell(input: unknown): string {
  const str = input === null || input === undefined ? '' : String(input)
  return str
    .replace(/\\/g, '\\\\')
    .replace(/\|/g, '\\|')
    .replace(/\n/g, ' ')
    .replace(/\r/g, ' ')
}

function unescapeMarkdownTableCell(input: string): string {
  return input
    .replace(/\\\|/g, '|')
    .replace(/\\\\/g, '\\')
}

function parseScalar(input: string): unknown {
  const raw = input.trim()
  if (raw === '') return undefined
  if (raw === 'true') return true
  if (raw === 'false') return false
  if (raw === 'null') return null

  if (/^-?\d+(\.\d+)?$/.test(raw)) {
    const n = Number(raw)
    if (!isNaN(n)) return n
  }

  if ((raw.startsWith('{') && raw.endsWith('}')) || (raw.startsWith('[') && raw.endsWith(']'))) {
    try {
      return JSON.parse(raw)
    } catch {
      return input
    }
  }

  return input
}

function formatScalar(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function replaceFirst(input: string, target: string, replacement: string): string {
  const idx = input.indexOf(target)
  if (idx < 0) return input
  return `${input.slice(0, idx)}${replacement}${input.slice(idx + target.length)}`
}

function parseHeaderBlock(markdown: string): {
  format: string
  version: number
  exportedAt: number | null
  bodyStartIndex: number
} {
  const normalized = normalizeNewLine(markdown)
  const headerMatch = /^---\n([\s\S]*?)\n---\n?/.exec(normalized)
  if (!headerMatch) {
    return {
      format: MDTABLE_FORMAT,
      version: MDTABLE_VERSION,
      exportedAt: null,
      bodyStartIndex: 0,
    }
  }

  const lines = headerMatch[1].split('\n')
  let format = MDTABLE_FORMAT
  let version = MDTABLE_VERSION
  let exportedAt: number | null = null

  lines.forEach((line) => {
    const [k, ...rest] = line.split(':')
    const key = k.trim()
    const value = rest.join(':').trim()
    if (key === 'format') format = value || MDTABLE_FORMAT
    if (key === 'version') {
      const n = Number(value)
      version = isNaN(n) ? MDTABLE_VERSION : n
    }
    if (key === 'exportedAt') {
      const n = Number(value)
      exportedAt = isNaN(n) ? null : n
    }
  })

  return {
    format,
    version,
    exportedAt,
    bodyStartIndex: headerMatch[0].length,
  }
}

function parseMarkdownTableBlock(tableMarkdown: string): { rows: LooseRow[]; warnings: string[] } {
  const warnings: string[] = []
  const normalized = normalizeNewLine(tableMarkdown).trim()
  if (!normalized) return { rows: [], warnings }

  const lines = normalized.split('\n').filter((line) => line.trim().length > 0)
  if (lines.length < 2) {
    warnings.push('表格格式錯誤：至少需要 header 和 separator 行')
    return { rows: [], warnings }
  }

  // Parse header
  const headerLine = lines[0]
  const headers = headerLine
    .split('|')
    .slice(1, -1)
    .map((h) => unescapeMarkdownTableCell(h.trim()))

  if (headers.length === 0 || headers.every((h) => h === '')) {
    warnings.push('表格缺少 header，已跳過')
    return { rows: [], warnings }
  }

  // Skip separator line (line 1)
  const rows: LooseRow[] = []
  for (let i = 2; i < lines.length; i++) {
    const line = lines[i]
    const cells = line
      .split('|')
      .slice(1, -1)
      .map((c) => unescapeMarkdownTableCell(c.trim()))

    const row: LooseRow = {}
    headers.forEach((h, col) => {
      if (!h) return
      row[h] = parseScalar(cells[col] ?? '')
    })
    rows.push(row)
  }

  return { rows, warnings }
}

function buildMarkdownTable(rows: LooseRow[]): string {
  if (rows.length === 0) {
    return '| id |\n|----|\n'
  }

  const headers: string[] = []
  const seen = new Set<string>()
  rows.forEach((row) => {
    Object.keys(row).forEach((k) => {
      if (!seen.has(k)) {
        seen.add(k)
        headers.push(k)
      }
    })
  })

  if (headers.length === 0) {
    return '| id |\n|----|\n'
  }

  const headerRow = '| ' + headers.map((h) => escapeMarkdownTableCell(h)).join(' | ') + ' |'
  const separatorRow = '| ' + headers.map(() => '----').join(' | ') + ' |'

  const dataRows = rows.map((row) => {
    const cells = headers.map((h) => escapeMarkdownTableCell(formatScalar(row[h])))
    return '| ' + cells.join(' | ') + ' |'
  })

  return [headerRow, separatorRow, ...dataRows].join('\n') + '\n'
}

function asTableName(input: string): ExportTableName | null {
  return TABLE_NAMES.includes(input as ExportTableName) ? (input as ExportTableName) : null
}

export function parseMdtable(input: string): ParsedMdtable {
  const normalized = normalizeNewLine(input)
  const header = parseHeaderBlock(normalized)
  const body = normalized.slice(header.bodyStartIndex)

  const warnings: string[] = []
  const tables: Partial<Record<ExportTableName, LooseRow[]>> = {}
  const tableOrder: ExportTableName[] = []

  let markdownInfo = body
  const seenCount: Partial<Record<ExportTableName, number>> = {}
  
  // Match ## 📊 tablename followed by markdown table
  const headingTableRegex = /^## 📊\s+([A-Za-z0-9_\-]+)\s*\n((?:\|[^\n]*\n)*)/gm

  const matches = Array.from(markdownInfo.matchAll(headingTableRegex))
  
  for (const match of matches) {
    const rawTableName = match[1]
    const tableMarkdown = match[2]
    const tableName = asTableName(rawTableName)

    if (!tableName) {
      warnings.push(`未知表格名稱：${rawTableName}，已略過`)
      continue
    }

    const { rows, warnings: blockWarnings } = parseMarkdownTableBlock(tableMarkdown)
    if (!tables[tableName]) {
      tables[tableName] = []
      tableOrder.push(tableName)
    }
    tables[tableName]!.push(...rows)

    blockWarnings.forEach((w) => warnings.push(`${tableName}: ${w}`))
  }

  // Replace table sections with [tablename] markers for markdownInfo
  markdownInfo = markdownInfo.replace(/^## 📊\s+([A-Za-z0-9_\-]+)\s*\n(?:\|[^\n]*\n)*/gm, (match, tableName) => {
    if (asTableName(tableName)) {
      return `[${tableName}]`
    }
    return match
  })

  return {
    format: header.format,
    version: header.version,
    exportedAt: header.exportedAt,
    markdownInfo: markdownInfo.trim(),
    tableOrder,
    tables,
    warnings,
  }
}

export function parsedMdtableToExportData(parsed: ParsedMdtable): ExportData {
  return {
    version: 1,
    exportedAt: parsed.exportedAt ?? Date.now(),
    tables: {
      task_pool: (parsed.tables.task_pool ?? []) as unknown as ExportData['tables']['task_pool'],
      scheduled: (parsed.tables.scheduled ?? []) as unknown as ExportData['tables']['scheduled'],
      micro_tasks: (parsed.tables.micro_tasks ?? []) as unknown as ExportData['tables']['micro_tasks'],
      inbox: (parsed.tables.inbox ?? []) as unknown as ExportData['tables']['inbox'],
      resource: (parsed.tables.resource ?? []) as unknown as ExportData['tables']['resource'],
      log: (parsed.tables.log ?? []) as unknown as ExportData['tables']['log'],
    },
  }
}

export function buildMdtableFromExportData(
  data: ExportData,
  options: BuildMdtableOptions = {},
): string {
  const includeFrontMatter = options.includeFrontMatter ?? true
  const initialMarkdown = options.markdownInfo?.trim() || '# NonBlockingLife Export\n'
  let markdown = initialMarkdown

  const tableEntries: Array<{ tableName: ExportTableName; rows: LooseRow[] }> = [
    { tableName: 'task_pool', rows: data.tables.task_pool as unknown as LooseRow[] },
    { tableName: 'scheduled', rows: data.tables.scheduled as unknown as LooseRow[] },
    { tableName: 'micro_tasks', rows: data.tables.micro_tasks as unknown as LooseRow[] },
    { tableName: 'inbox', rows: data.tables.inbox as unknown as LooseRow[] },
    { tableName: 'resource', rows: data.tables.resource as unknown as LooseRow[] },
    { tableName: 'log', rows: data.tables.log as unknown as LooseRow[] },
  ]

  tableEntries.forEach(({ tableName, rows }) => {
    const marker = `[${tableName}]`
    const block = `\n\n## 📊 ${tableName}\n${buildMarkdownTable(rows)}`
    if (markdown.includes(marker)) {
      markdown = replaceFirst(markdown, marker, block)
    } else {
      markdown += block
    }
  })

  if (!includeFrontMatter) return `${markdown.trim()}\n`

  const frontMatter = [
    '---',
    `format: ${MDTABLE_FORMAT}`,
    `version: ${MDTABLE_VERSION}`,
    `exportedAt: ${data.exportedAt}`,
    'tables_schema: "task_pool:dimension,scheduled:dimension,micro_tasks:dimension,inbox:dimension,resource:dimension,log:fact"',
    '---',
    '',
  ].join('\n')

  return `${frontMatter}${markdown.trim()}\n`
}

export function buildMdInfoRowsFromParsedMdtable(parsed: ParsedMdtable, raw: string): MdInfoRow[] {
  const now = Date.now()
  return [
    {
      key: 'latest_mdtable_version',
      value: String(parsed.version),
      updatedAt: now,
    },
    {
      key: 'latest_mdtable_table_order',
      value: JSON.stringify(parsed.tableOrder),
      updatedAt: now,
    },
    {
      key: 'latest_mdtable_markdown_info',
      value: parsed.markdownInfo,
      updatedAt: now,
    },
    {
      key: 'latest_mdtable_raw',
      value: raw,
      updatedAt: now,
    },
  ]
}

// Backward compatibility exports
export const parseTsvmd = parseMdtable
export const parsedTsvmdToExportData = parsedMdtableToExportData
export const buildTsvmdFromExportData = buildMdtableFromExportData
export const buildMdInfoRowsFromParsedTsvmd = buildMdInfoRowsFromParsedMdtable
export type ParsedTsvmd = ParsedMdtable
export type BuildTsvmdOptions = BuildMdtableOptions

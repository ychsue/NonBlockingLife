import { db } from '../db/index'
import type {
  LogEntry,
  InboxItem,
  TaskPoolItem,
  ScheduledItem,
  MicroTaskItem,
  ResourceItem,
} from '../db/schema'
import { buildMdtableFromExportData, parseMdtable, parsedMdtableToExportData } from './tsvmdUtils'

const EXPORT_VERSION = 1 as const

export type ExportTableName =
  | 'task_pool'
  | 'scheduled'
  | 'micro_tasks'
  | 'inbox'
  | 'resource'
  | 'log'

export interface ExportData {
  version: typeof EXPORT_VERSION
  exportedAt: number
  tables: {
    task_pool: TaskPoolItem[]
    scheduled: ScheduledItem[]
    micro_tasks: MicroTaskItem[]
    inbox: InboxItem[]
    resource: ResourceItem[]
    log: LogEntry[]
  }
}

export interface ImportResult {
  status: 'success' | 'error'
  message: string
  counts?: Partial<Record<ExportTableName, number>>
  warnings?: string[]
}

export type ExportFormat = 'json' | 'mdtable'

export interface ExportOptions {
  format?: ExportFormat
  markdownInfo?: string
}

// ── Export ────────────────────────────────────────────────────

async function collectExportData(): Promise<ExportData> {
  return {
    version: EXPORT_VERSION,
    exportedAt: Date.now(),
    tables: {
      task_pool: await db.task_pool.toArray(),
      scheduled: await db.scheduled.toArray(),
      micro_tasks: await db.micro_tasks.toArray(),
      inbox: await db.inbox.toArray(),
      resource: await db.resource.toArray(),
      log: await db.log.toArray(),
    },
  }
}

function downloadTextFile(fileName: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export async function exportDB(options: ExportOptions = {}): Promise<void> {
  const format = options.format ?? 'json'
  const data = await collectExportData()
  const datePart = new Date().toISOString().slice(0, 10)

  if (format === 'mdtable') {
    const markdown = buildMdtableFromExportData(data, {
      markdownInfo: options.markdownInfo,
      includeFrontMatter: true,
    })
    downloadTextFile(`nbl-backup-${datePart}.md`, markdown, 'text/markdown;charset=utf-8')
    return
  }

  const json = JSON.stringify(data, null, 2)
  downloadTextFile(`nbl-backup-${datePart}.json`, json, 'application/json')
}

// ── Coercion helpers ──────────────────────────────────────────
// Excel editing or manual JSON editing may change field types.
// These helpers coerce values to the expected type where possible.

type RawRecord = Record<string, unknown>

/** Coerce to string, trim whitespace; returns undefined if empty/null/undefined */
function s(v: unknown): string | undefined {
  if (v === null || v === undefined) return undefined
  const str = String(v).trim()
  return str === '' ? undefined : str
}

/** Coerce to number; returns undefined if unparseable */
function n(v: unknown): number | undefined {
  if (v === null || v === undefined || v === '') return undefined
  const num = Number(v)
  return isNaN(num) ? undefined : num
}

/** remindBefore/remindAfter can be string (cron expression) or number (minutes) */
function strOrNum(v: unknown): string | number | undefined {
  if (v === null || v === undefined) return undefined
  const num = Number(v)
  if (!isNaN(num)) return num
  const str = String(v).trim()
  return str === '' ? undefined : str
}

function hasStringKey(raw: RawRecord, key: string): boolean {
  return typeof raw[key] === 'string' && (raw[key] as string) !== ''
}

function coerceTaskPool(raw: RawRecord): TaskPoolItem | null {
  if (!hasStringKey(raw, 'taskId')) return null
  return {
    taskId: String(raw.taskId),
    title: s(raw.title),
    status: s(raw.status),
    focusTime: n(raw.focusTime),
    project: s(raw.project),
    spentTodayMins: n(raw.spentTodayMins),
    usedTodayCount: n(raw.usedTodayCount),
    dailyLimitMins: n(raw.dailyLimitMins),
    priority: n(raw.priority),
    lastRunDate: n(raw.lastRunDate),
    totalSpentMins: n(raw.totalSpentMins),
    updatedAt: n(raw.updatedAt),
    note: s(raw.note),
    url: s(raw.url),
    deadline: n(raw.deadline),
  }
}

function coerceScheduled(raw: RawRecord): ScheduledItem | null {
  if (!hasStringKey(raw, 'taskId')) return null
  return {
    taskId: String(raw.taskId),
    title: s(raw.title),
    status: s(raw.status),
    focusTime: n(raw.focusTime),
    cronExpr: s(raw.cronExpr),
    remindBefore: strOrNum(raw.remindBefore),
    remindAfter: strOrNum(raw.remindAfter),
    callback: s(raw.callback),
    lastRun: n(raw.lastRun),
    note: s(raw.note),
    nextRun: n(raw.nextRun),
    updatedAt: n(raw.updatedAt),
    url: s(raw.url),
    deadline: n(raw.deadline),
  }
}

function coerceMicroTask(raw: RawRecord): MicroTaskItem | null {
  if (!hasStringKey(raw, 'taskId')) return null
  return {
    taskId: String(raw.taskId),
    title: s(raw.title),
    status: s(raw.status),
    focusTime: n(raw.focusTime),
    lastRunDate: n(raw.lastRunDate),
    updatedAt: n(raw.updatedAt),
    url: s(raw.url),
    deadline: n(raw.deadline),
  }
}

function coerceInbox(raw: RawRecord): InboxItem | null {
  if (!hasStringKey(raw, 'taskId')) return null
  return {
    taskId: String(raw.taskId),
    title: s(raw.title),
    receivedAt: n(raw.receivedAt),
    updatedAt: n(raw.updatedAt),
    url: s(raw.url),
  }
}

function coerceResource(raw: RawRecord): ResourceItem | null {
  if (!hasStringKey(raw, 'taskId')) return null
  return {
    taskId: String(raw.taskId),
    title: s(raw.title),
    category: s(raw.category),
    receivedAt: n(raw.receivedAt),
    url: s(raw.url),
    note: s(raw.note),
    updatedAt: n(raw.updatedAt),
  }
}

function coerceLog(raw: RawRecord): LogEntry | null {
  if (!hasStringKey(raw, 'id')) return null
  if (!hasStringKey(raw, 'taskId')) return null
  const ts = n(raw.timestamp)
  if (ts === undefined) return null
  return {
    id: String(raw.id),
    timestamp: ts,
    taskId: String(raw.taskId),
    title: s(raw.title),
    action: s(raw.action),
    category: s(raw.category),
    state: s(raw.state),
    duration: n(raw.duration),
    notes: s(raw.notes),
  }
}

// ── Batch coerce with warning collection ─────────────────────

function batchCoerce<T>(
  items: unknown[],
  coerceFn: (raw: RawRecord) => T | null,
  tableName: string,
  warnings: string[],
): T[] {
  const valid: T[] = []
  items.forEach((item, i) => {
    if (typeof item !== 'object' || item === null) {
      warnings.push(`${tableName}[${i}]: 非物件，已跳過`)
      return
    }
    const result = coerceFn(item as RawRecord)
    if (result === null) {
      warnings.push(`${tableName}[${i}]: 缺少必要欄位（id/taskId），已跳過`)
    } else {
      valid.push(result)
    }
  })
  return valid
}

// ── Import ────────────────────────────────────────────────────

/**
 * Import a JSON backup file into IndexedDB.
 * Uses bulkPut (upsert): existing records with the same key are overwritten,
 * records not present in the file are left untouched.
 */
function isLikelyMdtable(text: string, fileName: string): boolean {
  const loweredName = fileName.toLowerCase()
  if (loweredName.endsWith('.mdtable')) return true
  if (text.includes('## 📊 task_pool')) return true
  if (text.includes('## 📊 scheduled')) return true
  if (text.includes('## 📊 micro_tasks')) return true
  if (text.includes('## 📊 inbox')) return true
  if (text.includes('## 📊 resource')) return true
  if (text.includes('## 📊 log')) return true
  if (text.includes('format: nbl-mdtable')) return true
  return false
}

function parseJsonToExportData(text: string): { data?: ExportData; error?: string } {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return { error: '檔案格式錯誤：無效的 JSON' }
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return { error: '檔案格式錯誤：根節點必須是物件' }
  }

  const data = parsed as unknown
  const rec = data as Record<string, unknown>

  if (!('tables' in rec) || typeof rec.tables !== 'object' || rec.tables === null) {
    return { error: '檔案格式錯誤：缺少 tables 欄位' }
  }

  if (rec.version !== undefined && rec.version !== EXPORT_VERSION) {
    return {
      error: `不支援的備份版本：${rec.version}（目前支援版本 ${EXPORT_VERSION}）`,
    }
  }

  return { data: rec as unknown as ExportData }
}

async function importFromExportData(
  data: ExportData,
  initialWarnings: string[] = [],
): Promise<ImportResult> {
  const tables = data.tables as Record<string, unknown>
  const counts: Partial<Record<ExportTableName, number>> = {}
  const warnings: string[] = [...initialWarnings]

  if (Array.isArray(tables.task_pool)) {
    const items = batchCoerce(tables.task_pool, coerceTaskPool, 'task_pool', warnings)
    await db.task_pool.bulkPut(items)
    counts.task_pool = items.length
  }

  if (Array.isArray(tables.scheduled)) {
    const items = batchCoerce(tables.scheduled, coerceScheduled, 'scheduled', warnings)
    await db.scheduled.bulkPut(items)
    counts.scheduled = items.length
  }

  if (Array.isArray(tables.micro_tasks)) {
    const items = batchCoerce(tables.micro_tasks, coerceMicroTask, 'micro_tasks', warnings)
    await db.micro_tasks.bulkPut(items)
    counts.micro_tasks = items.length
  }

  if (Array.isArray(tables.inbox)) {
    const items = batchCoerce(tables.inbox, coerceInbox, 'inbox', warnings)
    await db.inbox.bulkPut(items)
    counts.inbox = items.length
  }

  if (Array.isArray(tables.resource)) {
    const items = batchCoerce(tables.resource, coerceResource, 'resource', warnings)
    await db.resource.bulkPut(items)
    counts.resource = items.length
  }

  if (Array.isArray(tables.log)) {
    const items = batchCoerce(tables.log, coerceLog, 'log', warnings)
    await db.log.bulkPut(items)
    counts.log = items.length
  }

  const total = Object.values(counts).reduce((a, b) => a + (b ?? 0), 0)
  return {
    status: 'success',
    message: `匯入完成，共 ${total} 筆資料`,
    counts,
    warnings: warnings.length > 0 ? warnings : undefined,
  }
}

export async function importDB(file: File): Promise<ImportResult> {
  let text: string
  try {
    text = await file.text()
  } catch {
    return { status: 'error', message: '無法讀取檔案' }
  }

  const fileName = file.name || ''
  if (isLikelyMdtable(text, fileName)) {
    const parsed = parseMdtable(text)
    const hasAnyTable = Object.values(parsed.tables).some((rows) => Array.isArray(rows) && rows.length >= 0)
    if (!hasAnyTable) {
      return { status: 'error', message: '檔案格式錯誤：找不到可匯入的 markdown table 區塊' }
    }
    const exportData = parsedMdtableToExportData(parsed)
    return importFromExportData(exportData, parsed.warnings)
  }

  const json = parseJsonToExportData(text)
  if (!json.data) {
    return { status: 'error', message: json.error ?? '檔案格式錯誤' }
  }

  return importFromExportData(json.data)
}

import { Dexie, type Table } from 'dexie'

export interface LogEntry {
  id: string
  timestamp: number
  taskId: string
  title?: string
  action?: string
  category?: string
  state?: string
  duration?: number
  notes?: string
}

export interface Dashboard {
  taskId: string
  notes?: string
  startAt?: number
  systemStatus?: string
  totalFocusToday?: number
}

export interface InboxItem {
  taskId: string
  title?: string
  receivedAt?: number
  updatedAt?: number
}

export interface TaskPoolItem {
  taskId: string
  title?: string
  status?: string
  project?: string
  spentTodayMins?: number
  dailyLimitMins?: number
  priority?: number
  lastRunDate?: number
  totalSpentMins?: number
  updatedAt?: number
}

export interface ScheduledItem {
  taskId: string
  title?: string
  status?: string
  cronExpr?: string
  remindBefore?: string | number
  remindAfter?: string | number
  callback?: string
  lastRun?: number
  note?: string
  nextRun?: number
  updatedAt?: number
}

export interface SelectionCacheItem {
  taskId: string
  title?: string
  score?: number
  source?: string
  totalMinsInPool?: number
}

export interface MicroTaskItem {
  taskId: string
  title?: string
  status?: string
  lastRunDate?: number
  updatedAt?: number
}

export type ChangeLogStatus = 'pending' | 'synced' | 'failed'

export interface ChangeLogEntry {
  id: string
  clientId?: string
  table: string
  recordId: string
  op: 'add' | 'update' | 'delete'
  patch?: Record<string, unknown>
  createdAt: number
  status: ChangeLogStatus
  retryCount: number
  syncedAt: number | null
}

export interface SyncState {
  key: string
  value?: unknown
}

export class AppDB extends Dexie {
  log!: Table<LogEntry, string>
  dashboard!: Table<Dashboard, string>
  inbox!: Table<InboxItem, string>
  task_pool!: Table<TaskPoolItem, string>
  scheduled!: Table<ScheduledItem, string>
  selection_cache!: Table<SelectionCacheItem, string>
  micro_tasks!: Table<MicroTaskItem, string>
  change_log!: Table<ChangeLogEntry, string>
  sync_state!: Table<SyncState, string>

  constructor() {
    super('NonBlockingLife')
    this.version(1).stores({
      log: 'id, timestamp, taskId, action, state, title',
      dashboard: 'taskId, systemStatus',
      inbox: 'taskId, receivedAt, title',
      task_pool: 'taskId, status, project, priority, lastRunDate, title',
      scheduled: 'taskId, status, nextRun, title',
      selection_cache: 'taskId, score, source, title',
      micro_tasks: 'taskId, status, lastRunDate, title',
      change_log: 'id, table, recordId, op, status, createdAt',
      sync_state: 'key'
    })
  }
}

export const db = new AppDB()

export const TASK_PREFIX = {
  task_pool: 'T',
  micro_tasks: 't',
  scheduled: 'S'
}

export const LOG_ID_PREFIX = 'log'

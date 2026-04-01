import { db } from '../db/index'
import type { ChangeLogEntry } from '../db/schema'

const SYNC_TABLES = ['task_pool', 'scheduled', 'micro_tasks', 'inbox', 'resource', 'log'] as const

type SyncTable = (typeof SYNC_TABLES)[number]

type SyncOp = 'add' | 'update' | 'delete'

/**
 * 同步結果類型
 */
export interface SyncResult {
  status: 'success' | 'error'
  pushed: number
  pulled: number
  conflicts?: any[]
  message?: string
  timestamp: number
}

/**
 * 推送操作類型（前端 -> GAS）
 */
interface PushOperation {
  type: SyncOp
  table: SyncTable
  recordId: string
  data: Record<string, unknown>
  timestamp: number
  deviceId: string
  operationId: string
}

/**
 * 拉取變更類型（GAS -> 前端）
 */
interface PulledChange {
  table: string
  recordId: string
  data: Record<string, unknown>
  timestamp: number
  deleted: boolean
  deviceId?: string
  operationId?: string
}

/**
 * GAS 響應類型
 */
interface GASResponse {
  status: string
  error?: string
  changes?: PulledChange[]
  results?: Array<{ success: boolean }>
  timestamp?: number
  counts?: Record<string, number>
}

interface ResetAndPullOptions {
  includeLog?: boolean
}

/**
 * 同步管理器 - 負責 PWA 與 GAS 的雙向同步
 */
export class SyncManager {
  private gasUrl: string
  private deviceId: string
  private lastSyncTimestamp = 0

  constructor(gasUrl: string) {
    this.gasUrl = gasUrl
    this.deviceId = this.getOrCreateDeviceId()
    this.loadLastSyncTimestamp()
  }

  /**
   * 獲取或創建設備 ID（用於識別同步源）
   */
  private getOrCreateDeviceId(): string {
    const stored = localStorage.getItem('device-id')
    if (stored) return stored

    const ua = navigator.userAgent.toLowerCase()
    const deviceType = /iphone|ipad|ipod/.test(ua)
      ? 'ios'
      : /mac/.test(ua)
        ? 'mac'
        : /win/.test(ua)
          ? 'windows'
          : /android/.test(ua)
            ? 'android'
            : 'other'

    const newId = `device-${deviceType}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    localStorage.setItem('device-id', newId)
    return newId
  }

  /**
   * 載入上次同步時間戳
   */
  private loadLastSyncTimestamp(): void {
    const stored = localStorage.getItem('last-sync-timestamp')
    this.lastSyncTimestamp = stored ? parseInt(stored, 10) : 0
  }

  /**
   * 保存上次同步時間戳
   */
  private saveLastSyncTimestamp(timestamp: number): void {
    this.lastSyncTimestamp = timestamp
    localStorage.setItem('last-sync-timestamp', String(timestamp))
  }

  /**
   * 測試 GAS 連接
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.gasUrl}?action=ping`)
      const data = (await response.json()) as GASResponse
      return data.status === 'ok'
    } catch (error) {
      console.error('GAS 連接測試失敗:', error)
      return false
    }
  }

  /**
   * 獲取同步狀態
   */
  async getSyncStatus(): Promise<GASResponse | null> {
    try {
      const response = await fetch(`${this.gasUrl}?action=sync-status`)
      return (await response.json()) as GASResponse
    } catch (error) {
      console.error('獲取同步狀態失敗:', error)
      return null
    }
  }

  /**
   * 上傳本地未同步變更到 GAS
   */
  async push(): Promise<{ success: number; failed: number; error?: string }> {
    try {
      const pendingChanges = await db.change_log
        .where('status')
        .equals('pending')
        .toArray()

      if (pendingChanges.length === 0) {
        return { success: 0, failed: 0 }
      }

      // 本地專用表不進雲端，直接標記已同步避免 change_log 積壓
      const localOnlyChanges = pendingChanges.filter(
        (c) => !this.isSyncTable(c.table)
      )
      if (localOnlyChanges.length > 0) {
        await Promise.all(
          localOnlyChanges.map((c) =>
            db.change_log.update(c.id, {
              status: 'synced',
              syncedAt: Date.now(),
            })
          )
        )
      }

      const syncableChanges = pendingChanges.filter((c) => this.isSyncTable(c.table))
      if (syncableChanges.length === 0) {
        return { success: 0, failed: 0 }
      }

      const operations = await Promise.all(
        syncableChanges.map((change) => this.transformToOperation(change))
      )

      const response = await fetch(this.gasUrl, {
        method: 'POST',
        // 不設 application/json，避免 GAS CORS preflight 問題
        body: JSON.stringify({ operations }),
      })

      const result = (await response.json()) as GASResponse
      if (result.status === 'error') {
        return { success: 0, failed: syncableChanges.length, error: result.error }
      }

      const opResults = result.results ?? []
      let successCount = 0

      for (let i = 0; i < syncableChanges.length; i++) {
        const ok = Boolean(opResults[i]?.success)
        if (ok) {
          successCount += 1
          await db.change_log.update(syncableChanges[i].id, {
            status: 'synced',
            syncedAt: Date.now(),
          })
        } else {
          await db.change_log.update(syncableChanges[i].id, {
            retryCount: (syncableChanges[i].retryCount || 0) + 1,
          })
        }
      }

      return {
        success: successCount,
        failed: syncableChanges.length - successCount,
      }
    } catch (error) {
      console.error('上傳失敗:', error)
      return { success: 0, failed: -1, error: String(error) }
    }
  }

  /**
   * 從 GAS 拉取遠端變更
   * 
   * 注意：Log 表只做單向推送，不從雲端拉回（用戶在 Google Sheets 自行分析）
   */
  async pull(): Promise<{ success: number; error?: string }> {
    try {
      const url = `${this.gasUrl}?action=pull&lastSync=${this.lastSyncTimestamp}`
      const response = await fetch(url)
      const result = (await response.json()) as GASResponse

      if (result.status === 'error') {
        return { success: 0, error: result.error }
      }

      const changes = result.changes ?? []
      let mergedCount = 0
      
      for (const change of changes) {
        // 跳過 log 表（單向推送，不拉回）
        if (change.table === 'log') {
          console.log('跳過 log 表拉取:', change.recordId)
          continue
        }
        
        await this.mergeRemoteChange(change)
        mergedCount++
      }

      if (result.timestamp) {
        this.saveLastSyncTimestamp(result.timestamp)
      }

      return { success: mergedCount }
    } catch (error) {
      console.error('拉取失敗:', error)
      return { success: 0, error: String(error) }
    }
  }

  /**
   * 完整雙向同步（先推後拉）
   */
  async sync(): Promise<SyncResult> {
    const startTime = Date.now()

    try {
      const pushResult = await this.push()
      if (pushResult.error) {
        return {
          status: 'error',
          pushed: 0,
          pulled: 0,
          message: `推送失敗: ${pushResult.error}`,
          timestamp: Date.now(),
        }
      }

      const pullResult = await this.pull()
      if (pullResult.error) {
        return {
          status: 'error',
          pushed: pushResult.success,
          pulled: 0,
          message: `拉取失敗: ${pullResult.error}`,
          timestamp: Date.now(),
        }
      }

      return {
        status: 'success',
        pushed: pushResult.success,
        pulled: pullResult.success,
        message: `同步完成 (${Date.now() - startTime}ms)`,
        timestamp: Date.now(),
      }
    } catch (error) {
      return {
        status: 'error',
        pushed: 0,
        pulled: 0,
        message: `同步出錯: ${String(error)}`,
        timestamp: Date.now(),
      }
    }
  }

  /**
   * 清空本地資料（不含 Log），再從 GAS 完整拉取（用於設備遷移或資料還原）
   * ⚠️ 危險操作：本地未同步的資料將遺失
   */
  async resetAndPull(options: ResetAndPullOptions = {}): Promise<SyncResult> {
    const startTime = Date.now()
    const includeLog = options.includeLog === true

    try {
      const txTables = includeLog
        ? [
            db.task_pool,
            db.scheduled,
            db.micro_tasks,
            db.inbox,
            db.resource,
            db.selection_cache,
            db.dashboard,
            db.change_log,
            db.sync_state,
            db.log,
          ]
        : [
            db.task_pool,
            db.scheduled,
            db.micro_tasks,
            db.inbox,
            db.resource,
            db.selection_cache,
            db.dashboard,
            db.change_log,
            db.sync_state,
          ]

      await db.transaction('rw', txTables, async () => {
        const clearOps: Array<Promise<unknown>> = [
          db.task_pool.clear(),
          db.scheduled.clear(),
          db.micro_tasks.clear(),
          db.inbox.clear(),
          db.resource.clear(),
          db.selection_cache.clear(),
          db.dashboard.clear(),
          db.change_log.clear(),
          db.sync_state.clear(),
        ]

        // Log 預設保留，僅在使用者勾選時才清除。
        if (includeLog) {
          clearOps.push(db.log.clear())
        }

        await Promise.all(clearOps)
      })

      // 重置同步時間戳，確保拉取全部資料
      this.lastSyncTimestamp = 0
      localStorage.removeItem('last-sync-timestamp')

      // 從 GAS 拉取所有資料
      const pullResult = await this.pull()
      if (pullResult.error) {
        return {
          status: 'error',
          pushed: 0,
          pulled: 0,
          message: `還原失敗: ${pullResult.error}`,
          timestamp: Date.now(),
        }
      }

      return {
        status: 'success',
        pushed: 0,
        pulled: pullResult.success,
        message: `還原完成，已從雲端載入 ${pullResult.success} 筆資料${includeLog ? '（含清除 Log）' : '（保留 Log）'} (${Date.now() - startTime}ms)`,
        timestamp: Date.now(),
      }
    } catch (error) {
      return {
        status: 'error',
        pushed: 0,
        pulled: 0,
        message: `還原出錯: ${String(error)}`,
        timestamp: Date.now(),
      }
    }
  }

  private isSyncTable(table: string): table is SyncTable {
    return (SYNC_TABLES as readonly string[]).includes(table)
  }

  /**
   * change_log 條目轉為 GAS 操作
   */
  private async transformToOperation(change: ChangeLogEntry): Promise<PushOperation> {
    if (!this.isSyncTable(change.table)) {
      throw new Error(`Unsupported sync table: ${change.table}`)
    }

    const localRecord = await this.getLocalRecord(change.table, change.recordId)

    return {
      type: this.normalizeOp(change.op),
      table: change.table,
      recordId: change.recordId,
      // update 也盡量送完整記錄，避免遠端只拿到 patch
      data: (localRecord as Record<string, unknown> | undefined) ?? (change.patch ?? {}),
      timestamp: change.createdAt,
      deviceId: this.deviceId,
      operationId: change.id,
    }
  }

  private normalizeOp(op: ChangeLogEntry['op']): SyncOp {
    if (op === 'add' || op === 'update' || op === 'delete') return op
    return 'update'
  }

  private async getLocalRecord(table: SyncTable, recordId: string): Promise<unknown> {
    return db.table(table).get(recordId)
  }

  /**
   * 合併遠端變更到本地
   */
  private async mergeRemoteChange(change: PulledChange): Promise<void> {
    const table = change.table
    if (!this.isSyncTable(table)) return

    const record = {
      ...change.data,
      updatedAt: change.timestamp,
    } as Record<string, unknown>

    const primaryKey = table === 'log' ? 'id' : 'taskId'
    if (!record[primaryKey]) {
      record[primaryKey] = change.recordId
    }

    if (change.deleted) {
      await db.table(table).delete(change.recordId)
      return
    }

    await db.table(table).put(record)
  }
}

/**
 * 輔助函數：從 localStorage 讀取 GAS URL
 */
export function getStoredGasUrl(): string {
  return localStorage.getItem('gas-web-app-url') || ''
}

/**
 * 輔助函數：保存 GAS URL 到 localStorage
 */
export function saveGasUrl(url: string): void {
  localStorage.setItem('gas-web-app-url', url)
}

/**
 * 輔助函數：清除 GAS URL（用於重新配置）
 */
export function clearGasUrl(): void {
  localStorage.removeItem('gas-web-app-url')
}

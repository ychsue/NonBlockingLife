import { db } from '../db/index'
import type {
  ChangeLogEntry,
  TaskPoolItem,
  ScheduledItem,
  MicroTaskItem,
  InboxItem,
} from '../db/schema'

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
 * 推送操作類型
 */
interface PushOperation {
  type: 'create' | 'update' | 'delete'
  entityType: 'task' | 'inbox' | 'log'
  entityId: string
  data: any
  timestamp: number
  deviceId: string
  operationId: string
}

/**
 * GAS 響應類型
 */
interface GASResponse {
  status: string
  error?: string
  changes?: any[]
  results?: any[]
  timestamp?: number
  sheetName?: string
  rowCount?: number
}

/**
 * 同步管理器 - 負責 PWA 與 GAS 的雙向同步
 */
export class SyncManager {
  private gasUrl: string
  private deviceId: string
  private lastSyncTimestamp: number = 0

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

    const newId = `device-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    localStorage.setItem('device-id', newId)
    return newId
  }

  /**
   * 載入上次同步時間戳
   */
  private loadLastSyncTimestamp(): void {
    const stored = localStorage.getItem('last-sync-timestamp')
    this.lastSyncTimestamp = stored ? parseInt(stored) : 0
  }

  /**
   * 保存上次同步時間戳
   */
  private saveLastSyncTimestamp(timestamp: number): void {
    this.lastSyncTimestamp = timestamp
    localStorage.setItem('last-sync-timestamp', timestamp.toString())
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
      console.error('❌ GAS 連接測試失敗:', error)
      return false
    }
  }

  /**
   * 獲取同步狀態
   */
  async getSyncStatus(): Promise<GASResponse | null> {
    try {
      const response = await fetch(`${this.gasUrl}?action=sync-status`)
      const data = (await response.json()) as GASResponse
      return data
    } catch (error) {
      console.error('❌ 獲取同步狀態失敗:', error)
      return null
    }
  }

  /**
   * 上傳本地未同步的變更到 GAS
   */
  async push(): Promise<{ success: number; failed: number; error?: string }> {
    try {
      // 1. 從 change_log 取得所有 pending 項目
      const pendingChanges = await db.change_log
        .where('status')
        .equals('pending')
        .toArray()

      if (pendingChanges.length === 0) {
        return { success: 0, failed: 0 }
      }

      // 2. 轉換為 GAS 操作格式
      const operations = await Promise.all(
        pendingChanges.map((change) => this.transformToOperation(change))
      )

      // 3. 發送到 GAS
      // 注意：不要手動設置 application/json，否則瀏覽器會先發 OPTIONS preflight，
      // 而 GAS Web App 不會返回所需 CORS header，導致本地開發被擋。
      const response = await fetch(this.gasUrl, {
        method: 'POST',
        body: JSON.stringify({ operations }),
      })

      const result = (await response.json()) as GASResponse

      if (result.status === 'error') {
        return { success: 0, failed: pendingChanges.length, error: result.error }
      }

      // 4. 標記已同步
      const successCount = (result.results?.filter((r: any) => r.success) || [])
        .length
      for (let i = 0; i < pendingChanges.length; i++) {
        if (i < successCount) {
          await db.change_log.update(pendingChanges[i].id, {
            status: 'synced',
            syncedAt: Date.now(),
          })
        } else {
          // 如果同步部分失敗，增加重試次數
          await db.change_log.update(pendingChanges[i].id, {
            retryCount: (pendingChanges[i].retryCount || 0) + 1,
          })
        }
      }

      console.log(`✅ 上傳 ${successCount} 項變更到 GAS`)
      return { success: successCount, failed: pendingChanges.length - successCount }
    } catch (error) {
      console.error('❌ 上傳失敗:', error)
      return { success: 0, failed: -1, error: String(error) }
    }
  }

  /**
   * 從 GAS 拉取遠端變更
   */
  async pull(): Promise<{ success: number; error?: string }> {
    try {
      // 1. 從 GAS 拉取自上次同步以來的變更
      const url = `${this.gasUrl}?action=pull&lastSync=${this.lastSyncTimestamp}`
      const response = await fetch(url)
      const result = (await response.json()) as GASResponse

      if (result.status === 'error') {
        return { success: 0, error: result.error }
      }

      const changes = result.changes || []
      if (changes.length === 0) {
        return { success: 0 }
      }

      // 2. 合併變更到本地 IndexedDB
      for (const change of changes) {
        await this.mergeRemoteChange(change)
      }

      // 3. 更新最後同步時間
      if (result.timestamp) {
        this.saveLastSyncTimestamp(result.timestamp)
      }

      console.log(`✅ 拉取 ${changes.length} 項變更從 GAS`)
      return { success: changes.length }
    } catch (error) {
      console.error('❌ 拉取失敗:', error)
      return { success: 0, error: String(error) }
    }
  }

  /**
   * 完整雙向同步（先推後拉）
   */
  async sync(): Promise<SyncResult> {
    const startTime = Date.now()

    try {
      // 1. 先推送本地變更
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

      // 2. 再拉取遠端變更
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

      const duration = Date.now() - startTime
      return {
        status: 'success',
        pushed: pushResult.success,
        pulled: pullResult.success,
        message: `✅ 同步完成 (${Math.round(duration)}ms)`,
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
   * 將 change_log 條目轉換為 GAS 操作格式
   */
  private async transformToOperation(
    change: ChangeLogEntry
  ): Promise<PushOperation> {
    return {
      type: change.op as any,
      entityType: this.normalizeEntityType(change.table),
      entityId: change.recordId,
      data: change.patch || {},
      timestamp: change.createdAt,
      deviceId: this.deviceId,
      operationId: change.id,
    }
  }

  /**
   * 正規化表名為實體類型
   */
  private normalizeEntityType(
    tableName: string
  ): 'task' | 'inbox' | 'log' {
    if (tableName === 'inbox') return 'inbox'
    if (tableName === 'log') return 'log'
    return 'task' // task_pool, scheduled, micro_tasks 都當作 'task'
  }

  /**
   * 合併遠端變更到本地
   */
  private async mergeRemoteChange(change: any): Promise<void> {
    const { taskId, title, status, priority, timestamp, deleted, ...rest } =
      change
    const table = this.mapGasFieldToTable(change.source || 'task_pool')

    try {
      if (deleted) {
        // 軟刪除：標記為已刪除
        switch (table) {
          case 'task_pool':
            const existingPool = await db.task_pool.get(taskId)
            if (existingPool) {
              await db.task_pool.update(taskId, { status: 'deleted', ...rest } as any)
            }
            break
          case 'scheduled':
            const existingScheduled = await db.scheduled.get(taskId)
            if (existingScheduled) {
              await db.scheduled.update(taskId, { status: 'deleted', ...rest } as any)
            }
            break
          case 'micro_tasks':
            const existingMicro = await db.micro_tasks.get(taskId)
            if (existingMicro) {
              await db.micro_tasks.update(taskId, { status: 'deleted', ...rest } as any)
            }
            break
          case 'inbox':
            await db.inbox.delete(taskId)
            break
        }
      } else {
        // 更新或新增
        switch (table) {
          case 'task_pool':
            const existingPool = await db.task_pool.get(taskId)
            if (existingPool) {
              if ((existingPool.updatedAt || 0) > timestamp) {
                console.log(`⏭️ 跳過舊變更: ${taskId}`)
                return
              }
              await db.task_pool.update(taskId, {
                title,
                status,
                priority,
                updatedAt: timestamp,
                ...rest,
              } as any)
            } else {
              await db.task_pool.add({
                taskId,
                title,
                status,
                priority,
                updatedAt: timestamp,
                ...rest,
              } as any)
            }
            break

          case 'scheduled':
            const existingScheduled = await db.scheduled.get(taskId)
            if (existingScheduled) {
              if ((existingScheduled.updatedAt || 0) > timestamp) {
                console.log(`⏭️ 跳過舊變更: ${taskId}`)
                return
              }
              await db.scheduled.update(taskId, {
                title,
                status,
                updatedAt: timestamp,
                ...rest,
              } as any)
            } else {
              await db.scheduled.add({
                taskId,
                title,
                status,
                updatedAt: timestamp,
                ...rest,
              } as any)
            }
            break

          case 'micro_tasks':
            const existingMicro = await db.micro_tasks.get(taskId)
            if (existingMicro) {
              if ((existingMicro.updatedAt || 0) > timestamp) {
                console.log(`⏭️ 跳過舊變更: ${taskId}`)
                return
              }
              await db.micro_tasks.update(taskId, {
                title,
                status,
                updatedAt: timestamp,
                ...rest,
              } as any)
            } else {
              await db.micro_tasks.add({
                taskId,
                title,
                status,
                updatedAt: timestamp,
                ...rest,
              } as any)
            }
            break

          case 'inbox':
            const existingInbox = await db.inbox.get(taskId)
            if (existingInbox) {
              await db.inbox.update(taskId, {
                title,
                updatedAt: timestamp,
                ...rest,
              } as any)
            } else {
              await db.inbox.add({
                taskId,
                title,
                updatedAt: timestamp,
                ...rest,
              } as any)
            }
            break
        }
      }

      console.log(`✓ 合併變更: ${taskId}`)
    } catch (error) {
      console.error(`❌ 合併失敗 (${taskId}):`, error)
    }
  }

  /**
   * 根據來源映射到正確的 IndexedDB 表
   */
  private mapGasFieldToTable(source: string): string {
    const mapping: Record<string, string> = {
      Task_Pool: 'task_pool',
      Scheduled: 'scheduled',
      Micro_Tasks: 'micro_tasks',
      Inbox: 'inbox',
    }
    return mapping[source] || 'task_pool'
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

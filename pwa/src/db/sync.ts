import { db } from './schema.js'
import type { ChangeLogStatus, ChangeLogEntry } from './schema.js'
import { CHANGE_LOG_STATUS, getPendingChangeLogs } from './changeLog.js'

function groupByTable(items: ChangeLogEntry[]): Record<string, ChangeLogEntry[]> {
  return items.reduce(
    (acc, item) => {
      if (!acc[item.table]) {
        acc[item.table] = []
      }
      acc[item.table].push(item)
      return acc
    },
    {} as Record<string, ChangeLogEntry[]>
  )
}

export interface SendBatchResult {
  successIds?: string[]
  failedIds?: string[]
}

export interface SendBatchFn {
  (grouped: Record<string, ChangeLogEntry[]>): Promise<SendBatchResult>
}

export interface FetchRemoteFn {
  (params: { lastSyncAt: number }): Promise<Array<{ table: string; data: unknown }>>
}

export interface UploadResult {
  uploaded: number
  failed: number
}

export async function uploadPendingChanges({ sendBatch }: { sendBatch: SendBatchFn }): Promise<UploadResult> {
  const batch = await getPendingChangeLogs()
  if (batch.length === 0) {
    return { uploaded: 0, failed: 0 }
  }

  const grouped = groupByTable(batch)
  const result = await sendBatch(grouped)

  let uploaded = 0
  let failed = 0

  for (const item of batch) {
    if (result && result.successIds && result.successIds.includes(item.id)) {
      await db.change_log.update(item.id, {
        status: CHANGE_LOG_STATUS.synced,
        syncedAt: Date.now()
      })
      uploaded += 1
    } else {
      await db.change_log.update(item.id, {
        status: CHANGE_LOG_STATUS.failed,
        retryCount: item.retryCount + 1
      })
      failed += 1
    }
  }

  return { uploaded, failed }
}

export async function downloadRemoteChanges({
  fetchRemote,
  lastSyncAt
}: {
  fetchRemote: FetchRemoteFn
  lastSyncAt: number
}): Promise<number> {
  const remoteRows = await fetchRemote({ lastSyncAt })
  for (const row of remoteRows) {
    await db.table(row.table).put(row.data)
  }

  await db.sync_state.put({ key: 'lastSyncAt', value: Date.now() })
  return remoteRows.length
}

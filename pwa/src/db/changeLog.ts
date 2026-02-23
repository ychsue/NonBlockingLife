import { db } from './schema.js'
import type { ChangeLogStatus } from './schema.js'

export const CHANGE_LOG_STATUS: Record<string, ChangeLogStatus> = {
  pending: 'pending',
  synced: 'synced',
  failed: 'failed'
}

export function buildLogId(timestamp: number, taskId: string): string {
  return `log_${timestamp}_${taskId}`
}

export function buildChangeLogId(timestamp: number, table: string, recordId: string): string {
  return `cl_${timestamp}_${table}_${recordId}`
}

export interface ApplyChangeParams {
  table: string
  recordId: string
  op: 'add' | 'update' | 'delete'
  patch: Record<string, unknown>
  clientId: string
}

export async function applyChange({ table, recordId, op, patch, clientId }: ApplyChangeParams): Promise<string> {
  const now = Date.now()
  const id = buildChangeLogId(now, table, recordId)
  const data = patch && (patch as Record<string, unknown>).taskId ? patch : { ...patch, taskId: recordId }
  const normalizedData =
    op === 'add' && table === 'log' && !(data as Record<string, unknown>).id
      ? { ...data, id: recordId }
      : data

  if (op === 'add') {
    await db.table(table).add({ ...normalizedData, updatedAt: now })
  } else if (op === 'update') {
    await db.table(table).update(recordId, { ...patch, updatedAt: now })
  } else if (op === 'delete') {
    await db.table(table).delete(recordId)
  }

  await db.change_log.add({
    id,
    clientId,
    table,
    recordId,
    op,
    patch,
    createdAt: now,
    status: CHANGE_LOG_STATUS.pending,
    retryCount: 0,
    syncedAt: null
  })

  return id
}

export async function getPendingChangeLogs() {
  const pending = await db.change_log.where('status').equals(CHANGE_LOG_STATUS.pending).toArray()
  const failed = await db.change_log.where('status').equals(CHANGE_LOG_STATUS.failed).toArray()
  return pending.concat(failed)
}

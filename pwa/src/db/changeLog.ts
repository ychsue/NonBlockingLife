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
      ? { ...data, id: id }
      : data

  if (op === 'add') {
    await db.table(table).add({ ...normalizedData, updatedAt: now })
  } else if (op === 'update') {
    await db.table(table).update(recordId, { ...patch, updatedAt: now })
  } else if (op === 'delete') {
    await db.table(table).delete(recordId)
  }

  // Optimize change_log entries
  const existingChanges = await db.change_log
    .where('table')
    .equals(table)
    .and(change => 
      change.clientId === clientId && 
      change.recordId === recordId &&
      change.status === CHANGE_LOG_STATUS.pending
    )
    .sortBy('createdAt')

  if (op === 'delete') {
    // If deleting, remove all previous pending changes for this record
    if (existingChanges.length > 0) {
      const firstOp = existingChanges[0].op
      // If first operation was 'add', net effect is zero - don't store anything
      if (firstOp === 'add') {
        await db.change_log.bulkDelete(existingChanges.map(c => c.id))
        return id // Don't add the delete change either
      }
      // Otherwise, clear all previous changes and add the delete
      await db.change_log.bulkDelete(existingChanges.map(c => c.id))
    }
  } else if (op === 'update') {
    // If updating, merge with previous update patch
    const previousUpdates = existingChanges.filter(c => c.op === 'update')
    if (previousUpdates.length > 0) {
      const lastUpdate = previousUpdates[previousUpdates.length - 1]
      // Merge patches: old patch + new patch
      const mergedPatch = { ...lastUpdate.patch, ...patch }
      // Delete old update entry
      await db.change_log.delete(lastUpdate.id)
      // Update patch to merged version
      patch = mergedPatch
    }
  }
  // For 'add' operation, no special handling needed

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

/**
 * Clear all change_log entries for the log table
 * Useful during development to clean up accumulated log changes
 */
export async function clearLogTableChanges(): Promise<number> {
  const logChanges = await db.change_log
    .where('table')
    .equals('log')
    .toArray()
  
  if (logChanges.length > 0) {
    await db.change_log.bulkDelete(logChanges.map(c => c.id))
  }
  
  return logChanges.length
}

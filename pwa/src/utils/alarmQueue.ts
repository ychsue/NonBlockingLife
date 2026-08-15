import type { AlarmQueueItem, ScheduledItem } from '../db/schema'
import { buildAlarmQueueEntries } from './candidateUtils'

export interface AlarmQueueSyncPlan {
  toAdd: AlarmQueueItem[]
  toUpdate: AlarmQueueItem[]
  toDelete: number[]
  keep: AlarmQueueItem[]
}

export function getDueAlarmQueueEntries(
  items: AlarmQueueItem[],
  nowMs: number = Date.now()
): AlarmQueueItem[] {
  return items
    .filter((item) => item.state === 'pending' && item.alarmAt <= nowMs)
    .sort((a, b) => a.alarmAt - b.alarmAt)
}

export function mergeAlarmQueueEntries(
  existing: AlarmQueueItem[],
  incoming: AlarmQueueItem[]
): AlarmQueueItem[] {
  const map = new Map<string, AlarmQueueItem>()

  for (const item of [...existing, ...incoming]) {
    const key = item.dedupeKey || `${item.taskId}:${item.alarmAt}`
    const current = map.get(key)
    if (!current || item.updatedAt > current.updatedAt) {
      map.set(key, item)
    }
  }

  return Array.from(map.values()).sort((a, b) => a.alarmAt - b.alarmAt)
}

export function syncAlarmQueueFromScheduled(
  scheduled: ScheduledItem[],
  existing: AlarmQueueItem[] = [],
  now: Date = new Date(),
  horizonMs: number = 30 * 24 * 60 * 60 * 1000
): AlarmQueueSyncPlan {
  const desired = buildAlarmQueueEntries(scheduled, now, horizonMs)
  const desiredByKey = new Map(desired.map((item) => [item.dedupeKey, item] as const))
  const existingByKey = new Map(existing.map((item) => [item.dedupeKey, item] as const))
  const nowMs = now.getTime()
  const retentionMs = 24 * 60 * 60 * 1000

  const toAdd: AlarmQueueItem[] = []
  const toUpdate: AlarmQueueItem[] = []
  const toDelete: number[] = []
  const keep: AlarmQueueItem[] = []
  const seenKeys = new Set<string>()

  for (const item of existing) {
    const desiredItem = desiredByKey.get(item.dedupeKey)
    const key = item.dedupeKey || `${item.taskId}:${item.alarmAt}`

    // 沒有在 desired 中的項目，且是 pending 狀態，則刪除；若不是 pending，則保留一段時間後再刪除
    if (!desiredItem) {
      if (item.state === 'pending') {
        if (item.id != null) {
          toDelete.push(item.id)
        }
        continue
      }

      if (item.updatedAt > nowMs - retentionMs) {
        keep.push(item)
      } else if (item.id != null) {
        toDelete.push(item.id)
      }
      continue
    }

    seenKeys.add(key)

    // 給toUpdate的條件：狀態是 pending，且 alarmAt、offsetMinutes、title 或 state 有變化，然後補上 id、createdAt、updatedAt
    const shouldUpdate =
      item.state === 'pending' && (
        item.alarmAt !== desiredItem.alarmAt ||
        item.offsetMinutes !== desiredItem.offsetMinutes ||
        item.title !== desiredItem.title ||
        item.state !== desiredItem.state
      )

    if (shouldUpdate && item.id != null) {
      toUpdate.push({
        ...desiredItem,
        id: item.id,
        createdAt: item.createdAt || desiredItem.createdAt,
        updatedAt: nowMs,
      })
      continue
    }

    // 保留現有的 pending 項目，或非 pending 的項目在保留期內
    if (item.state !== 'pending') {
      if (item.updatedAt > nowMs - retentionMs) {
        keep.push(item)
      } else if (item.id != null) {
        toDelete.push(item.id)
      }
      continue
    }

    keep.push(item)
  }

  // 將 desired 中的項目加入 toAdd，排除已經存在的項目
  for (const item of desired) {
    if (existingByKey.has(item.dedupeKey)) continue
    toAdd.push(item)
    seenKeys.add(item.dedupeKey)
  }

  return {
    toAdd: toAdd.sort((a, b) => a.alarmAt - b.alarmAt),
    toUpdate: toUpdate.sort((a, b) => a.alarmAt - b.alarmAt),
    toDelete: [...new Set(toDelete)],
    keep: keep.sort((a, b) => a.alarmAt - b.alarmAt),
  }
}

/**
 * 處理到期的 AlarmQueueItems
 * @param items 找到的 AlarmQueueItems
 * @param nowMs 當前時間戳（毫秒），預設為 Date.now()
 * @returns 包含到(過)期和剩餘的 AlarmQueueItems
 */
export async function processDueAlarmQueue(
  items: AlarmQueueItem[],
  nowMs: number = Date.now()
): Promise<{ due: AlarmQueueItem[]; remaining: AlarmQueueItem[] }> {
  const due = getDueAlarmQueueEntries(items, nowMs)
  const remaining = items.filter((item) => !due.some((entry) => entry.dedupeKey === item.dedupeKey))
  return { due, remaining }
}

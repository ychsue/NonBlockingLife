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
  horizonMs: number = 30 * 24 * 60 * 60 * 1000,
  syncTargets: { clock: boolean; exact: boolean } = { clock: false, exact: false }
): AlarmQueueSyncPlan {
  const desired = buildAlarmQueueEntries(scheduled, now, horizonMs, syncTargets)
  const desiredByKey = new Map(desired.map((item) => [item.dedupeKey, item] as const))
  const existingByKey = new Map(existing.map((item) => [item.dedupeKey, item] as const))
  const nowMs = now.getTime()

  const toAdd: AlarmQueueItem[] = []
  const toUpdate: AlarmQueueItem[] = []
  const toDelete: number[] = []
  const keep: AlarmQueueItem[] = []

  for (const item of existing) {
    // The queue isn't meant to keep history, just to track what's been sent to TWA;
    // once an alarm's own time has passed there's nothing left to sync, so drop it.
    if (item.alarmAt < nowMs) {
      if (item.id != null) {
        toDelete.push(item.id)
      }
      continue
    }

    // The local trigger/dismiss lifecycle (state) is orthogonal to the TWA sync fields, so once
    // it's left 'pending' leave its content alone until it's pruned by the time check above.
    if (item.state !== 'pending') {
      keep.push(item)
      continue
    }

    const desiredItem = desiredByKey.get(item.dedupeKey)
    if (!desiredItem) {
      if (item.id != null) {
        toDelete.push(item.id)
      }
      continue
    }

    const coreChanged =
      item.alarmAt !== desiredItem.alarmAt ||
      item.offsetMinutes !== desiredItem.offsetMinutes ||
      item.title !== desiredItem.title

    // If the underlying schedule changed, any previous TWA registration is stale and needs re-sync.
    // Otherwise only flip a state from 'not_applicable' to 'pending' when a target was newly enabled
    // (or the reverse when disabled); never touch a state that's already 'set'/'failed'/'pending'.
    const nextClockState = coreChanged
      ? desiredItem.clockState
      : !syncTargets.clock
        ? 'not_applicable'
        : item.clockState === 'not_applicable'
          ? 'pending'
          : item.clockState
    const nextExactState = coreChanged
      ? desiredItem.exactState
      : !syncTargets.exact
        ? 'not_applicable'
        : item.exactState === 'not_applicable'
          ? 'pending'
          : item.exactState

    const shouldUpdate = coreChanged || nextClockState !== item.clockState || nextExactState !== item.exactState

    if (shouldUpdate && item.id != null) {
      toUpdate.push({
        ...desiredItem,
        id: item.id,
        clockState: nextClockState,
        exactState: nextExactState,
        createdAt: item.createdAt || desiredItem.createdAt,
        updatedAt: nowMs,
      })
      continue
    }

    keep.push(item)
  }

  // 將 desired 中的項目加入 toAdd，排除已經存在的項目
  for (const item of desired) {
    if (existingByKey.has(item.dedupeKey)) continue
    toAdd.push(item)
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

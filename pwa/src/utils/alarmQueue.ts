import type { AlarmQueueItem } from '../db/schema'

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

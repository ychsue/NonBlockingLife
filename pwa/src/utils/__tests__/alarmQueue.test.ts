import { describe, expect, test } from 'vitest'
import type { AlarmQueueItem } from '../../db/schema'
import { getDueAlarmQueueEntries, mergeAlarmQueueEntries } from '../alarmQueue'

describe('alarmQueue helpers', () => {
  test('應僅回傳已到時且仍 pending 的提醒', () => {
    const now = new Date('2026-08-13T12:00:00Z').getTime()
    const items: AlarmQueueItem[] = [
      { taskId: 'A', alarmAt: now - 1000, offsetMinutes: 5, state: 'pending', dedupeKey: 'A:1', createdAt: now, updatedAt: now },
      { taskId: 'B', alarmAt: now + 1000, offsetMinutes: 5, state: 'pending', dedupeKey: 'B:2', createdAt: now, updatedAt: now },
      { taskId: 'C', alarmAt: now + 1000, offsetMinutes: 5, state: 'triggered', dedupeKey: 'C:3', createdAt: now, updatedAt: now },
    ]

    expect(getDueAlarmQueueEntries(items, now)).toHaveLength(1)
    expect(getDueAlarmQueueEntries(items, now)[0].taskId).toBe('A')
  })

  test('應保留新的 pending 項目並去重舊項目', () => {
    const now = new Date('2026-08-13T12:00:00Z').getTime()
    const existing: AlarmQueueItem[] = [
      { taskId: 'A', alarmAt: now, offsetMinutes: 0, state: 'pending', dedupeKey: 'A:1', createdAt: now, updatedAt: now },
      { taskId: 'B', alarmAt: now + 60000, offsetMinutes: 1, state: 'triggered', dedupeKey: 'B:2', createdAt: now, updatedAt: now },
    ]

    const incoming: AlarmQueueItem[] = [
      { taskId: 'A', alarmAt: now, offsetMinutes: 0, state: 'pending', dedupeKey: 'A:1', createdAt: now, updatedAt: now },
      { taskId: 'C', alarmAt: now + 120000, offsetMinutes: 2, state: 'pending', dedupeKey: 'C:3', createdAt: now, updatedAt: now },
    ]

    const merged = mergeAlarmQueueEntries(existing, incoming)
    expect(merged.map((item) => item.taskId).sort()).toEqual(['A', 'B', 'C'])
    expect(merged.filter((item) => item.taskId === 'A')).toHaveLength(1)
  })
})

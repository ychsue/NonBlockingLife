import { describe, expect, test } from 'vitest'
import type { AlarmQueueItem, ScheduledItem } from '../../db/schema'
import { getDueAlarmQueueEntries, mergeAlarmQueueEntries, syncAlarmQueueFromScheduled } from '../alarmQueue'

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

  test('syncAlarmQueueFromScheduled 應從 scheduled 重新計算 pending queue 並保留去重', () => {
    const now = new Date('2026-08-15T12:00:00Z')
    const scheduled: ScheduledItem[] = [
      {
        taskId: 'S01',
        title: '每日提醒',
        status: 'PENDING',
        nextRun: new Date('2026-08-16T08:00:00Z').getTime(),
        alarmOffsets: '1h,2h',
        updatedAt: now.getTime(),
      },
    ]

    const existing: AlarmQueueItem[] = [
      {
        taskId: 'S01',
        alarmAt: new Date('2026-08-16T07:00:00Z').getTime(),
        offsetMinutes: 60,
        state: 'dismissed',
        dedupeKey: 'S01:2026-08-16T07:00:00.000Z',
        createdAt: now.getTime(),
        updatedAt: now.getTime(),
      },
      {
        taskId: 'S99',
        alarmAt: new Date('2026-08-17T00:00:00Z').getTime(),
        offsetMinutes: 30,
        state: 'pending',
        dedupeKey: 'S99:2026-08-17T00:00:00.000Z',
        createdAt: now.getTime(),
        updatedAt: now.getTime(),
      },
    ]

    const synced = syncAlarmQueueFromScheduled(scheduled, existing, now)

    expect(synced.map((item) => item.taskId).sort()).toEqual(['S01', 'S01', 'S99'])
    expect(synced.find((item) => item.taskId === 'S01')?.state).toBe('pending')
    expect(synced.filter((item) => item.taskId === 'S01')).toHaveLength(2)
  })
})

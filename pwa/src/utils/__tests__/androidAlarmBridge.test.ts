import { describe, expect, test } from 'vitest'
import { buildAndroidAlarmScheduleUri, normalizeAlarmScheduleRequest } from '../androidAlarmBridge'

describe('androidAlarmBridge', () => {
  test('normalizeAlarmScheduleRequest keeps eventAt and alarmAt distinct', () => {
    const raw = {
      taskId: 'task-42',
      title: 'Morning review',
      eventAt: new Date('2026-08-16T08:00:00Z').getTime(),
      alarmAt: new Date('2026-08-16T07:30:00Z').getTime(),
      offsetMinutes: 30,
      dedupeKey: 'task-42:2026-08-16T07:30:00.000Z',
    }

    const normalized = normalizeAlarmScheduleRequest(raw)

    expect(normalized.eventAt).toBe(raw.eventAt)
    expect(normalized.alarmAt).toBe(raw.alarmAt)
    expect(normalized.offsetMinutes).toBe(30)
    expect(normalized.title).toBe('Morning review')
  })

  test('buildAndroidAlarmScheduleUri generates a schedule-alarm deep link', () => {
    const uri = buildAndroidAlarmScheduleUri({
      taskId: 'task-42',
      title: 'Morning review',
      eventAt: new Date('2026-08-16T08:00:00Z').getTime(),
      alarmAt: new Date('2026-08-16T07:30:00Z').getTime(),
      offsetMinutes: 30,
      dedupeKey: 'task-42:2026-08-16T07:30:00.000Z',
    })

    expect(uri).toContain('nonblockinglife://schedule-alarm')
    expect(uri).toContain('eventAt=')
    expect(uri).toContain('alarmAt=')
    expect(uri).toContain('offsetMinutes=30')
    expect(uri).toContain('title=Morning+review')
  })
})

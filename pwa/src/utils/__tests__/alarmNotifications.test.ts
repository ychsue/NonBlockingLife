import { beforeEach, describe, expect, test, vi } from 'vitest'
import type { AlarmQueueItem } from '../../db/schema'
import { triggerAlarmNotification } from '../alarmNotifications'

const baseItem: AlarmQueueItem = {
  id: 1,
  taskId: 'T-42',
  title: 'Alarm test task',
  alarmAt: Date.now() + 60000,
  offsetMinutes: 5,
  state: 'pending',
  dedupeKey: 'T-42:123',
  createdAt: Date.now(),
  updatedAt: Date.now(),
}

describe('alarmNotifications', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  test('should fire a notification when browser permission is granted', () => {
    const notifySpy = vi.fn()

    class MockNotification {
      static permission = 'granted'
      constructor(public title: string, public options?: NotificationOptions) {
        notifySpy(title, options)
      }
    }

    vi.stubGlobal('Notification', MockNotification)

    expect(triggerAlarmNotification(baseItem)).toBe(true)
    expect(notifySpy).toHaveBeenCalledTimes(1)
  })

  test('should return false when notification API is unavailable', () => {
    vi.stubGlobal('Notification', undefined)
    expect(triggerAlarmNotification(baseItem)).toBe(false)
  })
})

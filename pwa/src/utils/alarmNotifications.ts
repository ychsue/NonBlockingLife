import type { AlarmQueueItem } from '../db/schema'

export function triggerAlarmNotification(item: AlarmQueueItem): boolean {
  if (typeof Notification === 'undefined') return false

  const permission = Notification.permission
  if (permission !== 'granted' && permission !== 'default') return false

  const title = item.title || 'Reminder'
  const body = `Task reminder: ${title}`

  if (permission === 'default') {
    void Notification.requestPermission().then((nextPermission) => {
      if (nextPermission !== 'granted') return
      new Notification(title, {
        body,
        tag: `nbl-alarm-${item.dedupeKey}`,
        data: { taskId: item.taskId, alarmAt: item.alarmAt },
      })
    })
    return true
  }

  new Notification(title, {
    body,
    tag: `nbl-alarm-${item.dedupeKey}`,
    data: { taskId: item.taskId, alarmAt: item.alarmAt },
  })

  return true
}

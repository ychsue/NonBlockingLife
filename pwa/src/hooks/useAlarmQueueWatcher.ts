import { useCallback, useEffect, useState } from 'react'
import { db } from '../db'
import type { AlarmQueueItem } from '../db/schema'
import { triggerAlarmNotification } from '../utils/alarmNotifications'
import type { AlarmQueueSyncPlan } from '../utils/alarmQueue'

export function useAlarmQueueWatcher(enabled: boolean) {
  const [queueItems, setQueueItems] = useState<AlarmQueueItem[]>([])

  const refreshQueue = useCallback(async () => {
    if (!enabled) {
      setQueueItems([])
      return
    }

    const rows = await db.alarm_queue.orderBy('alarmAt').toArray()
    setQueueItems(rows)
  }, [enabled])

  useEffect(() => {
    if (!enabled) return

    void refreshQueue()

    const intervalId = window.setInterval(() => {
      void refreshQueue()
    }, 15000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [enabled, refreshQueue])

  const applySyncPlan = useCallback(async (plan: AlarmQueueSyncPlan) => {
    if (plan.toDelete.length > 0) {
      await db.alarm_queue.bulkDelete(plan.toDelete)
    }

    if (plan.toUpdate.length > 0 || plan.toAdd.length > 0) {
      await db.alarm_queue.bulkPut([...plan.toAdd, ...plan.toUpdate])
    }

    await refreshQueue()
    return plan
  }, [refreshQueue])

  const markItemState = useCallback(async (item: AlarmQueueItem, nextState: AlarmQueueItem['state']) => {
    if (!item.id) return false

    await db.alarm_queue.update(item.id, {
      state: nextState,
      updatedAt: Date.now(),
    })

    await refreshQueue()
    return true
  }, [refreshQueue])

  const triggerItem = useCallback(async (item: AlarmQueueItem) => {
    const fired = triggerAlarmNotification(item)
    if (!fired) return false

    await markItemState(item, 'triggered')
    return true
  }, [markItemState])

  const dismissItem = useCallback(async (item: AlarmQueueItem) => {
    if (!item.id) return false
    await db.alarm_queue.update(item.id, {
      state: 'dismissed',
      updatedAt: Date.now(),
    })
    await refreshQueue()
    return true
  }, [refreshQueue])

  const deleteItem = useCallback(async (item: AlarmQueueItem) => {
    if (!item.id) return false
    await db.alarm_queue.delete(item.id)
    await refreshQueue()
    return true
  }, [refreshQueue])

  return {
    queueItems,
    refreshQueue,
    applySyncPlan,
    triggerItem,
    dismissItem,
    deleteItem,
  }
}

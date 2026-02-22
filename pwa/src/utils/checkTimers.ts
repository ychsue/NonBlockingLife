import { db } from '../db/index'
import type { ScheduledItem } from '../db/schema'
import { parseToMinutes } from './candidateUtils'

/**
 * PWA 版本的 checkTimers
 * 检查所有 WAITING 的 Scheduled 任务，如果已到提醒时间，改为 PENDING
 */
export async function checkScheduledTimers(): Promise<string[]> {
  const now = new Date()
  const updatedTaskIds: string[] = []

  try {
    const scheduledTasks = await db.scheduled.toArray()

    for (const task of scheduledTasks) {
      // 只检查 WAITING 状态的任务
      if (task.status !== 'WAITING') continue

      if (!task.nextRun) continue // 没有 nextRun 时间，跳过

      const nextRunDate = new Date(task.nextRun)
      const beforeMins = parseToMinutes(task.remindBefore) || 0
      const remindStart = new Date(nextRunDate.getTime() - beforeMins * 60000)

      // 判断是否进入"可执行区间"（提醒时间已到）
      if (now >= remindStart) {
        // 更新状态为 PENDING
        await db.scheduled.update(task.taskId, {
          status: 'PENDING',
        })
        updatedTaskIds.push(task.taskId)
        console.log(`✅ 喚醒任務: ${task.title} (${task.taskId})`)
      }
    }
  } catch (err) {
    console.error('Failed to check scheduled timers:', err)
  }

  return updatedTaskIds
}

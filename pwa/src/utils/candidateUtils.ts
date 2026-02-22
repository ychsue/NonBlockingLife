import type { TaskPoolItem, ScheduledItem, MicroTaskItem } from '../db/schema'

export interface Candidate {
  taskId: string
  title: string
  score: number
  source: string
}

export interface CalculateCandidatesResult {
  candidates: Candidate[]
  resetPoolTaskIds: string[]
  totalMinsPool: number
}

/**
 * 解析時間字串為分鐘數
 * 支持格式：純數字(視為分鐘)、"30m", "2h", "1d", "1M", "1w"
 */
export function parseToMinutes(takesTime?: string | number): number | null {
  if (!takesTime) return null

  // 如果是純數字，直接回傳
  const parsedNum = Number(takesTime)
  if (!isNaN(parsedNum)) {
    return parsedNum
  }

  // 字串解析：mhdMw 格式
  const regex = /^(\d+)([mhdMw])$/
  const match = String(takesTime).match(regex)
  if (!match) return null

  const value = parseInt(match[1], 10)
  const unit = match[2]

  switch (unit) {
    case 'm':
      return value
    case 'h':
      return value * 60
    case 'd':
      return value * 60 * 24
    case 'M':
      return value * 60 * 24 * 30
    case 'w':
      return value * 60 * 24 * 7
    default:
      return null
  }
}

/**
 * 分鐘數轉人類可讀的時間字串
 */
export function minutesToTimeString(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = Math.floor(totalMinutes % 60)
  return `${hours > 0 ? hours + ' 小時 ' : ''}${minutes} 分鐘`
}

/**
 * 根據來源回傳對應的 Emoji
 */
export function getSourceEmoji(source: string): string {
  const sourceMap: Record<string, string> = {
    'Scheduled': '🔔',
    'Task_Pool': '🎯',
    'Micro_Tasks': '⚡',
  }
  return sourceMap[source] || '📝'
}

/**
 * PWA 版本的候選任務計算
 * 接收 Dexie 表的結構化數據（對象數組）
 * 並返回排序後的候選任務列表
 */
export function calculateCandidates(
  pool: TaskPoolItem[],
  scheduled: ScheduledItem[],
  microTasks: MicroTaskItem[]
): CalculateCandidatesResult {
  const candidates: Candidate[] = []
  const resetPoolTaskIds: string[] = []
  let totalMinsPool = 0

  const now = new Date()

  // ===== Task_Pool 處理 =====
  pool.forEach((task) => {
    const status = task.status
    if (status === 'PENDING') {
      const taskId = task.taskId
      const title = task.title || '未命名任務'
      let spentToday = task.spentTodayMins || 0
      const dailyLimit = task.dailyLimitMins || 999
      const priority = task.priority || 1
      const lastRunDate = task.lastRunDate

      // --- 智慧評分邏輯 ---

      // 1. 基礎分 (Priority): 1->20, 5->100
      let score = priority * 20

      // 2. 飢餓加權 (Starvation): 越久沒做分越高
      if (lastRunDate) {
        const lastDate = new Date(lastRunDate)
        if (isNaN(lastDate.getTime())) {
          // 無效日期，視為從未執行過
          score += 30
        } else {
          // 如果 lastDate 不是今天，而 spentToday 已經有值，這表示需要歸零
          const lastDateStr = lastDate.toDateString()
          const nowDateStr = now.toDateString()
          if (lastDateStr !== nowDateStr && spentToday > 0) {
            resetPoolTaskIds.push(taskId)
            spentToday = 0
          }

          const daysSince = Math.floor(
            (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
          )
          score += daysSince * 10 // 每多一天沒做，加 10 分
        }
      } else {
        score += 30 // 從未執行過的新任務，給予較高初始分
      }

      // 3. 配額扣分: 如果已經快超過 Daily Limit，降低出現順位
      const remainingMins = dailyLimit - spentToday
      if (remainingMins <= 0) {
        score -= 50 // 超額任務大幅扣分
      } else if (remainingMins < 15) {
        score -= 20 // 快滿了，稍微降低
      }

      candidates.push({
        taskId,
        title: `${title} (剩餘配額: ${remainingMins}m)`,
        score: Math.max(0, score),
        source: 'Task_Pool',
      })
    }

    // 累計 Pool 總時數
    const mins = task.spentTodayMins || 0
    totalMinsPool += mins
  })

  // ===== Scheduled Tasks 處理 =====
  scheduled.forEach((task) => {
    const status = task.status
    if (status === 'PENDING') {
      const taskId = task.taskId
      let title = task.title || '未命名排程'
      const nextRunTime = task.nextRun
      let score = 50 // Scheduled 基礎分較低

      if (nextRunTime) {
        const nextRunDate = new Date(nextRunTime)
        const diffMins = (nextRunDate.getTime() - now.getTime()) / 60000
        const timeStr = minutesToTimeString(Math.abs(diffMins))
        title = `${title} : ${diffMins < 0 ? '過時' : '還有'}${timeStr}`
        score = diffMins < 0 ? 500 : Math.max(50, 200 - diffMins)
      }

      candidates.push({
        taskId,
        title,
        score,
        source: 'Scheduled',
      })
    }
  })

  // ===== Micro_Tasks 處理 =====
  microTasks.forEach((task) => {
    const status = task.status
    if (status === 'PENDING') {
      const taskId = task.taskId
      const title = task.title || '未命名微任務'
      const score = 30 // 固定分數

      candidates.push({
        taskId,
        title,
        score,
        source: 'Micro_Tasks',
      })
    }
  })

  // 按分數排序（降序）
  candidates.sort((a, b) => b.score - a.score)

  return {
    candidates,
    resetPoolTaskIds,
    totalMinsPool,
  }
}

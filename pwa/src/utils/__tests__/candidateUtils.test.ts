import { describe, test, expect } from 'vitest'
import type { TaskPoolItem, ScheduledItem, MicroTaskItem } from '../../db/schema'
import {
  calculateCandidates,
  parseToMinutes,
  parseAlarmOffsets,
  buildAlarmQueueEntries,
  minutesToTimeString,
  getSourceEmoji,
} from '../candidateUtils'

describe('candidateUtils: 工具函數測試', () => {
  describe('parseToMinutes', () => {
    test('應解析時間字串為分鐘數', () => {
      expect(parseToMinutes('30m')).toBe(30)
      expect(parseToMinutes('2h')).toBe(120)
      expect(parseToMinutes('1d')).toBe(1440)
      expect(parseToMinutes('1w')).toBe(10080)
      expect(parseToMinutes('1M')).toBe(43200)
    })

    test('應解析純數字為分鐘數', () => {
      expect(parseToMinutes('60')).toBe(60)
      expect(parseToMinutes(60)).toBe(60)
    })

    test('無效格式應回傳 null', () => {
      expect(parseToMinutes('invalid')).toBeNull()
      expect(parseToMinutes('30x')).toBeNull()
      expect(parseToMinutes('')).toBeNull()
      expect(parseToMinutes(undefined)).toBeNull()
    })

    test('應解析多段 alarm offsets 字串', () => {
      expect(parseAlarmOffsets('1d,2h,0m')).toEqual([1440, 120, 0])
      expect(parseAlarmOffsets('1d,2h,0')).toEqual([1440, 120, 0])
      expect(parseAlarmOffsets('30m,15m')).toEqual([30, 15])
    })

    test('應忽略空白與不合法單位，且保留 0', () => {
      expect(parseAlarmOffsets(' 1d, 2h, 0m , , invalid ')).toEqual([1440, 120, 0])
      expect(parseAlarmOffsets('0')).toEqual([0])
      expect(parseAlarmOffsets('')).toEqual([])
    })
  })

  describe('buildAlarmQueueEntries', () => {
    test('應只取下一個 24 小時內的提醒點，並以 taskId + alarmAt 去重', () => {
      const now = new Date('2026-08-13T12:00:00Z')
      const nextRun = new Date('2026-08-14T04:00:00Z').getTime()

      const scheduled: ScheduledItem[] = [
        {
          taskId: 'S01',
          title: '提醒任務',
          status: 'PENDING',
          nextRun,
          alarmOffsets: '1d,0,2h,2h,0,1d',
          updatedAt: now.getTime(),
        },
      ]

      const entries = buildAlarmQueueEntries(scheduled, now)

      expect(entries.map((entry) => entry.offsetMinutes)).toEqual([120, 0])
      expect(entries).toHaveLength(2)
      expect(entries[0].dedupeKey).toBe('S01:1786672800000')
      expect(entries[1].dedupeKey).toBe('S01:1786680000000')
    })
  })

  describe('minutesToTimeString', () => {
    test('應正確轉換分鐘為可讀字串', () => {
      expect(minutesToTimeString(30)).toBe('30 分鐘')
      expect(minutesToTimeString(120)).toBe('2 小時 0 分鐘')
      expect(minutesToTimeString(90)).toBe('1 小時 30 分鐘')
      expect(minutesToTimeString(1440)).toBe('24 小時 0 分鐘')
    })
  })

  describe('getSourceEmoji', () => {
    test('應根據來源回傳對應 Emoji', () => {
      expect(getSourceEmoji('Scheduled')).toBe('🔔')
      expect(getSourceEmoji('Task_Pool')).toBe('🎯')
      expect(getSourceEmoji('Micro_Tasks')).toBe('⚡')
      expect(getSourceEmoji('Unknown')).toBe('📝')
    })
  })
})

describe('calculateCandidates: 排序邏輯測試', () => {
  test('過期任務應獲得 500 分並排在第一名', () => {
    const now = new Date()
    const tenMinsAgo = new Date(now.getTime() - 10 * 60000)

    const mockScheduled: ScheduledItem[] = [
      {
        taskId: 'S01',
        title: '過期任務',
        status: 'PENDING',
        nextRun: tenMinsAgo.getTime(),
        updatedAt: now.getTime(),
      },
    ]

    const { candidates } = calculateCandidates([], mockScheduled, [])

    expect(candidates[0].taskId).toBe('S01')
    expect(candidates[0].score).toBe(500)
  })

  test('應過濾掉狀態不是 PENDING 的任務', () => {
    const mockPool: TaskPoolItem[] = [
      {
        taskId: 'T01',
        title: '已完成任務',
        status: 'DONE',
        updatedAt: Date.now(),
      },
    ]

    const { candidates } = calculateCandidates(mockPool, [], [])
    expect(candidates.length).toBe(0)
  })

  test('應按得分降序排序', () => {
    const mockScheduled: ScheduledItem[] = [
      {
        taskId: 'S01',
        title: '低優先度',
        status: 'PENDING',
        nextRun: new Date(Date.now() + 100 * 60000).getTime(), // 100 分鐘後
        updatedAt: Date.now(),
      },
      {
        taskId: 'S02',
        title: '高優先度',
        status: 'PENDING',
        nextRun: new Date(Date.now() + 10 * 60000).getTime(), // 10 分鐘後（更近）
        updatedAt: Date.now(),
      },
    ]

    const { candidates } = calculateCandidates([], mockScheduled, [])

    // 越接近執行時間分數越高，所以 S02 應該排在 S01 前面
    expect(candidates[0].taskId).toBe('S02')
    expect(candidates[1].taskId).toBe('S01')
  })
})

describe('calculateCandidates: Task_Pool 智慧評分測試', () => {
  const now = new Date()
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  test('跨日自動歸零測試：昨天已達上限的任務，today 應恢復分數', () => {
    const mockPool: TaskPoolItem[] = [
      {
        taskId: 'T_RESET_TEST',
        title: '跨日任務',
        status: 'PENDING',
        project: 'ProjA',
        spentTodayMins: 120, // 殘留值：120分鐘 (已超過 Limit)
        dailyLimitMins: 60, // Limit: 60分鐘
        priority: 5, // 基礎分 100
        lastRunDate: yesterday.getTime(), // 最後執行日：昨天
        updatedAt: now.getTime(),
      },
    ]

    const { candidates, resetPoolTaskIds } = calculateCandidates(mockPool, [], [])

    // 預期邏輯：
    // 1. 基礎分 100 (priority 5 * 20)
    // 2. 檢檢測到日期非今天 -> spentToday 視為 0，taskId 加入 resetPoolTaskIds
    // 3. daysSince = 1 -> 飢餓分 +10
    // 4. remainingMins = 60 - 0 = 60 -> 不扣分
    // 最終得分應為 110
    expect(candidates[0].score).toBe(110)
    expect(candidates[0].taskId).toBe('T_RESET_TEST')
    expect(resetPoolTaskIds).toContain('T_RESET_TEST')
  })

  test('今日配額扣分測試：今天已執行過久應降分', () => {
    const mockPool: TaskPoolItem[] = [
      {
        taskId: 'T_QUOTA_TEST',
        title: '今天太累了',
        status: 'PENDING',
        project: 'ProjB',
        spentTodayMins: 55, // 今天已做 55 分鐘
        dailyLimitMins: 60, // Limit: 60 分鐘 (剩餘 < 15 分鐘)
        priority: 5, // 基礎分 100
        lastRunDate: now.getTime(), // 最後執行日：今天
        updatedAt: now.getTime(),
      },
    ]

    const { candidates } = calculateCandidates(mockPool, [], [])

    // 預期邏輯：
    // 1. 基礎分 100
    // 2. 日期是今天 -> spentToday 維持 55
    // 3. daysSince = 0 -> 飢餓分 +0
    // 4. remainingMins = 60 - 55 = 5 -> 觸發 < 15 分鐘扣分 (-20)
    // 最終得分應為 80
    expect(candidates[0].score).toBe(80)
  })

  test('新任務與長期飢餓加成測試', () => {
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const mockPool: TaskPoolItem[] = [
      {
        taskId: 'T_NEW',
        title: '新任務',
        status: 'PENDING',
        spentTodayMins: 0,
        dailyLimitMins: 60,
        priority: 1, // 基礎 20
        updatedAt: now.getTime(),
        // 無 lastRunDate -> 基礎 20 + 新任務 30 = 50
      },
      {
        taskId: 'T_OLD',
        title: '老任務',
        status: 'PENDING',
        spentTodayMins: 0,
        dailyLimitMins: 60,
        priority: 1, // 基礎 20
        lastRunDate: sevenDaysAgo.getTime(), // 7 天前 -> +70
        updatedAt: now.getTime(),
        // 基礎 20 + 飢餓 70 = 90
      },
    ]

    const { candidates } = calculateCandidates(mockPool, [], [])

    // 排序後：老任務 (90分) 應排在第一
    expect(candidates[0].taskId).toBe('T_OLD')
    expect(candidates[0].score).toBe(90)
    expect(candidates[1].taskId).toBe('T_NEW')
    expect(candidates[1].score).toBe(50)
  })

  test('超額任務應大幅扣分，但不刪除', () => {
    const mockPool: TaskPoolItem[] = [
      {
        taskId: 'T_OVER',
        title: '超額任務',
        status: 'PENDING',
        spentTodayMins: 100, // 已超過
        dailyLimitMins: 60,
        priority: 5, // 基礎 100
        updatedAt: now.getTime(),
        // 無 lastRunDate -> 新任務 +30
      },
    ]

    const { candidates } = calculateCandidates(mockPool, [], [])

    // 基礎分 100 + 新任務 30 - 50 (超額扣分) = 80
    expect(candidates[0].score).toBe(80)
    expect(candidates.length).toBe(1) // 不刪除
  })

  test('應累計 Pool 總時數', () => {
    const mockPool: TaskPoolItem[] = [
      {
        taskId: 'T01',
        title: '任務 1',
        status: 'PENDING',
        spentTodayMins: 30,
        priority: 1,
        updatedAt: now.getTime(),
      },
      {
        taskId: 'T02',
        title: '任務 2',
        status: 'DONE', // 被過濾掉
        spentTodayMins: 20,
        priority: 1,
        updatedAt: now.getTime(),
      },
      {
        taskId: 'T03',
        title: '任務 3',
        status: 'PENDING',
        spentTodayMins: 45,
        priority: 1,
        updatedAt: now.getTime(),
      },
    ]

    const { totalMinsPool } = calculateCandidates(mockPool, [], [])

    // 應累計所有的 spentTodayMins，包括被過濾的
    expect(totalMinsPool).toBe(95)
  })
})

describe('calculateCandidates: 整合測試', () => {
  const now = new Date()

  test('混合多個表的候選任務應正確計算與排序', () => {
    const mockPool: TaskPoolItem[] = [
      {
        taskId: 'T01',
        title: '優先任務',
        status: 'PENDING',
        priority: 5,
        spentTodayMins: 0,
        dailyLimitMins: 60,
        updatedAt: now.getTime(),
        // 無 lastRunDate -> 新任務 +30
      },
    ]

    const mockScheduled: ScheduledItem[] = [
      {
        taskId: 'S01',
        title: '過期排程',
        status: 'PENDING',
        nextRun: new Date(now.getTime() - 1000).getTime(),
        updatedAt: now.getTime(),
      },
    ]

    const mockMicro: MicroTaskItem[] = [
      {
        taskId: 'M01',
        title: '微任務',
        status: 'PENDING',
        updatedAt: now.getTime(),
      },
    ]

    const { candidates } = calculateCandidates(mockPool, mockScheduled, mockMicro)

    // 過期排程應排第一 (500分)、優先任務第二 (基礎100+新任務30=130)、微任務第三 (30分)
    expect(candidates[0].taskId).toBe('S01')
    expect(candidates[0].score).toBe(500)
    expect(candidates[1].taskId).toBe('T01')
    expect(candidates[1].score).toBe(130)
    expect(candidates[2].taskId).toBe('M01')
    expect(candidates[2].score).toBe(30)
  })
})

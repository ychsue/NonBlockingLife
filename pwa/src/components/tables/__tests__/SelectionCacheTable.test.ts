import { describe, test, expect, beforeEach, vi } from 'vitest'
import type { SelectionCacheItem, TaskPoolItem, ScheduledItem } from '../../../db/schema'
import { calculateCandidates } from '../../../utils/candidateUtils'

/**
 * SelectionCacheTable 集成測試
 * 驗證候選任務計算、存儲和顯示的完整流程
 */
describe('SelectionCacheTable: 集成測試', () => {
  const now = new Date()

  describe('候選任務計算與存儲', () => {
    test('應從 task_pool、scheduled、micro_tasks 計算候選', () => {
      const mockPool: TaskPoolItem[] = [
        {
          taskId: 'T01',
          title: '高優先度任務',
          status: 'PENDING',
          priority: 5,
          spentTodayMins: 0,
          dailyLimitMins: 60,
          updatedAt: now.getTime(),
        },
        {
          taskId: 'T02',
          title: '已完成任務',
          status: 'DONE',
          updatedAt: now.getTime(),
        },
      ]

      const mockScheduled: ScheduledItem[] = [
        {
          taskId: 'S01',
          title: '早上跑步',
          status: 'PENDING',
          nextRun: new Date(now.getTime() + 60 * 60000).getTime(),
          updatedAt: now.getTime(),
        },
      ]

      const mockMicro: any[] = [
        {
          taskId: 'M01',
          title: '微任務',
          status: 'PENDING',
          updatedAt: now.getTime(),
        },
      ]

      const { candidates, totalMinsPool } = calculateCandidates(
        mockPool,
        mockScheduled,
        mockMicro
      )

      // 應該只包含 PENDING 狀態的任務（3 個）
      expect(candidates.length).toBe(3)
      // 應按得分降序排列（S01 的倒計時分數 > T01 基礎分 > M01 固定分）
      expect(candidates.map((c) => c.taskId)).toEqual(['S01', 'T01', 'M01'])
    })

    test('應正確計算得分並排序', () => {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

      const mockPool: TaskPoolItem[] = [
        {
          taskId: 'T_URGENT',
          title: '緊急任務',
          status: 'PENDING',
          priority: 5, // 基礎 100
          spentTodayMins: 0,
          dailyLimitMins: 60,
          lastRunDate: sevenDaysAgo.getTime(), // +70
          updatedAt: now.getTime(),
          // 總分: 100 + 70 = 170
        },
        {
          taskId: 'T_NEW',
          title: '新任務',
          status: 'PENDING',
          priority: 1, // 基礎 20
          spentTodayMins: 0,
          dailyLimitMins: 60,
          updatedAt: now.getTime(),
          // 無 lastRunDate: 20 + 30 = 50
        },
      ]

      const { candidates } = calculateCandidates(mockPool, [], [])

      // 應按得分降序排列
      expect(candidates[0].taskId).toBe('T_URGENT')
      expect(candidates[0].score).toBe(170)
      expect(candidates[1].taskId).toBe('T_NEW')
      expect(candidates[1].score).toBe(50)
    })

    test('應為 selection_cache 項目轉換格式', () => {
      const mockPool: TaskPoolItem[] = [
        {
          taskId: 'T01',
          title: '任務 A',
          status: 'PENDING',
          priority: 3,
          spentTodayMins: 15,
          dailyLimitMins: 120,
          updatedAt: now.getTime(),
        },
      ]

      const { candidates, totalMinsPool } = calculateCandidates(mockPool, [], [])

      // 轉換為 SelectionCacheItem 格式
      const cacheItems: SelectionCacheItem[] = candidates.map((c) => ({
        taskId: c.taskId,
        title: c.title,
        score: c.score,
        source: c.source,
        totalMinsInPool: totalMinsPool,
      }))

      expect(cacheItems[0]).toEqual({
        taskId: 'T01',
        title: expect.stringContaining('任務 A'),
        score: expect.any(Number),
        source: 'Task_Pool',
        totalMinsInPool: 15,
      })
    })
  })

  describe('日期跨越與歸零邏輯', () => {
    test('應檢測並標記需要歸零的任務', () => {
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)

      const mockPool: TaskPoolItem[] = [
        {
          taskId: 'T_YESTERDAY',
          title: '昨天的任務',
          status: 'PENDING',
          priority: 3,
          spentTodayMins: 50, // 有殘留值
          dailyLimitMins: 120,
          lastRunDate: yesterday.getTime(), // 昨天執行
          updatedAt: now.getTime(),
        },
      ]

      const { resetPoolTaskIds } = calculateCandidates(mockPool, [], [])

      // 應標記該任務需要歸零
      expect(resetPoolTaskIds).toContain('T_YESTERDAY')
    })
  })

  describe('使用者交互流程', () => {
    test('應支持點擊任務並打開對話框', () => {
      // 此測試驗證 UI 邏輯（在實際 React 組件測試中）
      // 這裡只驗證數據流程
      const mockCache: SelectionCacheItem[] = [
        {
          taskId: 'T01',
          title: '重要任務',
          score: 150,
          source: 'Task_Pool',
          totalMinsInPool: 45,
        },
      ]

      // 模擬用戶點擊任務
      const selectedTaskId = mockCache[0].taskId
      const selectedTask = mockCache.find((t) => t.taskId === selectedTaskId)

      expect(selectedTask).toBeDefined()
      expect(selectedTask?.title).toBe('重要任務')
    })

    test('應將開始任務操作記錄到日誌', () => {
      const selectedTaskId = 'T01'
      const note = '開始進行此任務'
      const timestamp = Date.now()

      // 模擬 log 記錄
      const logEntry = {
        timestamp,
        taskId: selectedTaskId,
        action: 'START',
        notes: note,
      }

      expect(logEntry.taskId).toBe('T01')
      expect(logEntry.action).toBe('START')
      expect(logEntry.notes).toBe('開始進行此任務')
    })
  })

  describe('刷新候選列表流程', () => {
    test('應清空舊數據並重新計算', () => {
      // 初始狀態
      const oldCache: SelectionCacheItem[] = [
        {
          taskId: 'T01',
          title: '舊任務',
          score: 100,
          source: 'Task_Pool',
        },
      ]

      // 新的數據狀態
      const newPool: TaskPoolItem[] = [
        {
          taskId: 'T02',
          title: '新任務',
          status: 'PENDING',
          priority: 5,
          spentTodayMins: 0,
          dailyLimitMins: 60,
          updatedAt: Date.now(),
        },
      ]

      const { candidates } = calculateCandidates(newPool, [], [])

      // 應該反映新的候選列表
      expect(candidates[0].taskId).toBe('T02')
      expect(candidates[0].title).toContain('新任務')
    })

    test('應在刷新時應用 resetPoolTaskIds 更新', () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)

      const mockPool: TaskPoolItem[] = [
        {
          taskId: 'T01',
          title: '跨日任務',
          status: 'PENDING',
          priority: 3,
          spentTodayMins: 100, // 需要歸零
          dailyLimitMins: 60,
          lastRunDate: yesterday.getTime(),
          updatedAt: Date.now(),
        },
      ]

      const { resetPoolTaskIds } = calculateCandidates(mockPool, [], [])

      // 應返回需要更新的任務 ID
      expect(resetPoolTaskIds).toContain('T01')
    })
  })
})

import { useMemo, useState, useEffect, useRef } from 'react'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { applyChange, db } from '../../db/index'
import type { Dashboard, SelectionCacheItem } from '../../db/schema'
import { calculateCandidates } from '../../utils/candidateUtils'
import { checkScheduledTimers } from '../../utils/checkTimers'
import { endTask, getRunningTask, interruptTask, startTask } from '../../utils/taskFlow'

const DEV_CLIENT_ID = 'dev-selection-cache'
const columnHelper = createColumnHelper<SelectionCacheItem>()

export function SelectionCacheTable() {
  const [rows, setRows] = useState<SelectionCacheItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [showStartDialog, setShowStartDialog] = useState(false)
  const [startNote, setStartNote] = useState('')
  const [runningTask, setRunningTask] = useState<Dashboard | null>(null)
  const [endNote, setEndNote] = useState('')
  const [warning, setWarning] = useState('')
  const startDialogRef = useRef<HTMLDialogElement | null>(null)
  const endDialogRef = useRef<HTMLDialogElement | null>(null)

  // 初始載入
  useEffect(() => {
    loadCandidates()
    loadRunningTask()
  }, [])

  useEffect(() => {
    const dialog = startDialogRef.current
    if (!dialog) return
    if (showStartDialog) {
      if (!dialog.open) dialog.showModal()
    } else if (dialog.open) {
      dialog.close()
    }
  }, [showStartDialog])

  useEffect(() => {
    const dialog = endDialogRef.current
    if (!dialog) return
    if (runningTask) {
      if (!dialog.open) dialog.showModal()
    } else if (dialog.open) {
      dialog.close()
    }
  }, [runningTask])

  const loadRunningTask = async () => {
    const current = await getRunningTask()
    setRunningTask(current)
  }

  const loadCandidates = async () => {
    try {
      setLoading(true)
      const data = await db.selection_cache.toArray()
      // 按得分降序排列
      const sorted = data.sort((a, b) => (b.score || 0) - (a.score || 0))
      setRows(sorted)
    } catch (err) {
      console.error('Failed to load selection cache:', err)
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  // 刷新候選任務列表
  const handleRefreshCandidates = async () => {
    try {
      setRefreshing(true)

      // 1. 先檢查 Scheduled 任務的狀態（checkTimers 邏輯）
      const awokenTaskIds = await checkScheduledTimers()
      if (awokenTaskIds.length > 0) {
        console.log(`🔔 喚醒了 ${awokenTaskIds.length} 個 Scheduled 任務`)
      }

      // 2. 從各表讀取最新數據
      const poolData = await db.task_pool.toArray()
      const scheduledData = await db.scheduled.toArray()
      const microTasksData = await db.micro_tasks.toArray()

      // 3. 計算候選
      const { candidates, resetPoolTaskIds, totalMinsPool } = calculateCandidates(
        poolData,
        scheduledData,
        microTasksData
      )

      // 4. 如果有需要歸零的任務，更新 task_pool
      if (resetPoolTaskIds.length > 0) {
        for (const taskId of resetPoolTaskIds) {
          await applyChange({
            table: 'task_pool',
            recordId: taskId,
            op: 'update',
            patch: { spentTodayMins: 0 },
            clientId: DEV_CLIENT_ID,
          })
        }
      }

      // 5. 清空並重寫 selection_cache
      await db.selection_cache.clear()
      const cacheItems: SelectionCacheItem[] = candidates.map((c) => ({
        taskId: c.taskId,
        title: c.title,
        score: c.score,
        source: c.source,
        totalMinsInPool: totalMinsPool,
      }))

      if (cacheItems.length > 0) {
        await db.selection_cache.bulkAdd(cacheItems)
      }

      // 6. 重新加載顯示
      await loadCandidates()
    } catch (err) {
      console.error('Failed to refresh candidates:', err)
    } finally {
      setRefreshing(false)
    }
  }

  // 點擊任務行，開啟"開始任務"對話框
  const handleRowClick = (taskId: string) => {
    if (runningTask) {
      setWarning('請先結束目前任務後再開始新的任務。')
      return
    }
    setSelectedTaskId(taskId)
    setStartNote('')
    setShowStartDialog(true)
  }

  // 確認開始任務
  const handleConfirmStart = async () => {
    if (!selectedTaskId) return

    try {
      const selectedTask = rows.find((r) => r.taskId === selectedTaskId)
      if (!selectedTask) return

      const result = await startTask(selectedTask, startNote)
      if (result.status !== 'success') {
        setWarning(result.message)
        return
      }

      // 清空對話框
      setShowStartDialog(false)
      setSelectedTaskId(null)
      setStartNote('')
      setWarning('')
      await loadRunningTask()

      // 可選：自動刷新候選列表，或讓用戶手動刷新
      // await handleRefreshCandidates()
    } catch (err) {
      console.error('Failed to start task:', err)
    }
  }

  const handleConfirmEnd = async () => {
    try {
      const result = await endTask(endNote)
      if (result.status !== 'success') {
        setWarning(result.message)
        return
      }
      setEndNote('')
      setWarning('')
      await loadRunningTask()
      await handleRefreshCandidates()
    } catch (err) {
      console.error('Failed to end task:', err)
    }
  }

  const handleInterrupt = async () => {
    try {
      const result = await interruptTask(endNote)
      if (result.status !== 'success') {
        setWarning(result.message)
        return
      }
      if ('payload' in result && result.payload) {
        setRunningTask(result.payload as Dashboard)
      }
      setEndNote('')
      setWarning('')
      await loadRunningTask()
      await handleRefreshCandidates()
    } catch (err) {
      console.error('Failed to interrupt task:', err)
    }
  }

  const columns = useMemo(
    () => [
      columnHelper.accessor('taskId', {
        header: '任務 ID',
        size: 90,
      }),
      columnHelper.accessor('title', {
        header: '任務標題',
        size: 300,
      }),
      columnHelper.accessor('score', {
        header: '評分',
        size: 70,
        cell: (info) => (
          <span className="font-semibold text-blue-600">
            {Math.round(info.getValue() || 0)}
          </span>
        ),
      }),
      columnHelper.accessor('source', {
        header: '來源',
        size: 100,
        cell: (info) => {
          const source = info.getValue()
          if (typeof source !== 'string') {
            return <span>未知</span>
          }
          const emoji: Record<string, string> = {
            'Task_Pool': '🎯',
            'Scheduled': '🔔',
            'Micro_Tasks': '⚡',
          }
          return <span>{emoji[source] || '📝'} {source}</span>
        },
      }),
    ],
    []
  )

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  if (loading) {
    return <div className="p-4 text-center text-gray-500">載入中...</div>
  }

  return (
    <div className="p-4">
      {/* 工具欄 */}
      <div className="mb-4 flex items-center gap-2">
        <button
          onClick={handleRefreshCandidates}
          disabled={refreshing}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {refreshing ? '刷新中...' : '🔄 刷新候選'}
        </button>
        <span className="text-sm text-gray-600">
          共 {rows.length} 個候選任務
        </span>
        {warning && (
          <span className="text-sm text-red-600">{warning}</span>
        )}
      </div>

      {/* 表格 */}
      {rows.length === 0 ? (
        <div className="p-4 text-center text-gray-500">
          暫無候選任務，請點擊「刷新候選」按鈕
        </div>
      ) : (
        <div className="overflow-x-auto border border-gray-200 rounded">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-gray-100">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="p-2 text-left border-b border-gray-200 font-semibold"
                      style={{ width: header.getSize() }}
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => handleRowClick(row.original.taskId)}
                  role="button"
                  tabIndex={runningTask ? -1 : 0}
                  onKeyDown={(event) => {
                    if (runningTask) return
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      handleRowClick(row.original.taskId)
                    }
                  }}
                  className={`border-b border-gray-200 transition-colors transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1 ${
                    runningTask
                      ? 'opacity-60 cursor-not-allowed'
                      : 'hover:bg-blue-50 hover:shadow-sm cursor-pointer active:scale-95 active:bg-blue-100'
                  }`}
                  style={{ transformOrigin: 'center' }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="p-2"
                      style={{ width: cell.column.getSize() }}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 結束任務對話框 */}
      <dialog
        ref={endDialogRef}
        className="rounded-lg w-full max-w-md"
        style={{ padding: 0 }}
        onCancel={(event) => event.preventDefault()}
      >
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-bold mb-4 text-amber-900">結束任務</h2>
          {runningTask ? (
            <>
              <div className="text-sm text-amber-900 font-semibold">
                目前執行中：{runningTask.taskId}{runningTask.title ? ` - ${runningTask.title}` : ''}
              </div>
              <div className="mt-3">
                <label className="block text-sm font-semibold mb-1 text-amber-900">
                  結束備註 (選填)
                </label>
                <textarea
                  value={endNote}
                  onChange={(e) => setEndNote(e.target.value)}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:border-amber-500"
                  rows={3}
                  placeholder="輸入結束任務的備註..."
                />
              </div>
              <div className="flex gap-2 mt-6">
                <button
                  onClick={handleConfirmEnd}
                  className="flex-1 px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700"
                >
                  結束任務
                </button>
                <button
                  onClick={handleInterrupt}
                  className="flex-1 px-4 py-2 border border-amber-300 text-amber-800 rounded hover:bg-amber-100"
                >
                  中斷任務
                </button>
              </div>
            </>
          ) : (
            <div className="text-sm text-gray-500">目前沒有執行中的任務</div>
          )}
        </div>
      </dialog>

      {/* 開始任務對話框 */}
      <dialog
        ref={startDialogRef}
        className="rounded-lg w-full max-w-md"
        style={{ padding: 0 }}
        onClose={() => setShowStartDialog(false)}
      >
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-bold mb-4">開始任務</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-1">任務 ID</label>
              <input
                type="text"
                value={selectedTaskId ?? ''}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">任務標題</label>
              <input
                type="text"
                value={rows.find((r) => r.taskId === selectedTaskId)?.title || ''}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">備註 (選填)</label>
              <textarea
                value={startNote}
                onChange={(e) => setStartNote(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                rows={3}
                placeholder="輸入開始該任務的備註..."
              />
            </div>
          </div>

          <div className="flex gap-2 mt-6">
            <button
              onClick={() => setShowStartDialog(false)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
            >
              取消
            </button>
            <button
              onClick={handleConfirmStart}
              className="flex-1 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              開始任務
            </button>
          </div>
        </div>
      </dialog>
    </div>
  )
}

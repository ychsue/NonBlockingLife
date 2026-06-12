import { useMemo, useState, useEffect, type FocusEvent } from 'react'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table'
import { applyChange, db } from '../../db/index'
import type { ScheduledItem, SelectionCacheItem } from '../../db/schema'
import Utils from '../../../../gas/src/Utils'
import {
  formatToDateTimeLocal,
  parseFromDateTimeLocal,
} from '../../utils/timeUtils'
import { useResponsiveTable } from '../../hooks/useResponsiveTable'
import { useAppStore } from '../../store/appStore'
import { useT } from '../../i18n'
import { TableCard } from '../TableCard'
import { EditDialog, type FieldType } from '../EditDialog'
import { TableHelpDialog } from '../TableHelpDialog'
import scheduledHelpMarkdown from './ScheduledHelp.md?raw'
import { useSearchFilter, useHideDone } from '../../hooks/useSearchFilter'
import { buildCronExpr, getCronParts, getUpcomingOccurrences } from '../../utils/cronUtils'
import { interruptTask } from '../../utils/taskFlow'
import { shouldOpenRowEdit } from './rowEditUtils'

const DEV_CLIENT_ID = 'dev-client'
const columnHelper = createColumnHelper<ScheduledItem>()

interface CronPreviewState {
  taskId: string
  title: string
  cronExpr: string
  runs: number[]
}

function createNewScheduledRow(taskId?: string, title?: string): ScheduledItem {
  taskId = taskId || Utils.generateId('S')
  const cronExpr = '0 9 * * *' // 預設每天早上9點執行
  return {
    taskId,
    title: title || '',
    status: 'WAITING',
    focusTime: undefined,
    cronExpr: cronExpr,
    remindBefore: '',
    remindAfter: '',
    callback: '',
    lastRun: undefined,
    note: '',
    nextRun: Utils.getNextOccurrence(cronExpr, new Date())?.getTime(),
    url: '',
  }
}

export function ScheduledTable() {
  const t = useT()
  const [rows, setRows] = useState<ScheduledItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showHelp, setShowHelp] = useState(false)
  const [cronPreview, setCronPreview] = useState<CronPreviewState | null>(null)
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({
    taskId: false,
  })
  const [sorting, setSorting] = useState<SortingState>([])
  const [sortMode, setSortMode] = useState<'none' | 'lastRunAsc' | 'lastRunDesc' | 'nextRunAsc' | 'nextRunDesc'>('none')
  const { isMobile } = useResponsiveTable()
  const [editingItem, setEditingItem] = useState<ScheduledItem | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isOrMode, setIsOrMode] = useState(true)
  const [hideDone, setHideDone] = useState(true)
  const [showMobileFilters, setShowMobileFilters] = useState(false)
  const currentSheet = useAppStore((state) => state.currentSheet)
  const pendingEditIntent = useAppStore((state) => state.pendingEditIntent)
  const clearPendingEditIntent = useAppStore((state) => state.clearPendingEditIntent)
  const runningTask = useAppStore((state) => state.runningTask)
  const loadRunningTask = useAppStore((state) => state.loadRunningTask)
  const text = {
    subtitle: t('table.scheduled.subtitle'),
    help: t('table.help'),
    searchPlaceholder: t('table.scheduled.searchPlaceholder'),
    hideDone: t('table.scheduled.hideDone'),
    open: t('table.open'),
    loading: t('table.loading'),
    editTitle: t('table.scheduled.editTitle'),
    titlePlaceholder: t('table.scheduled.titlePlaceholder'),
    cronPlaceholder: t('table.scheduled.cronPlaceholder'),
    helpTitle: t('table.scheduled.helpTitle'),
    sortLabel: t('table.scheduled.sortLabel'),
    searchMode: t('table.scheduled.searchMode'),
  }

  // 根据 sortMode 更新 sorting 状态
  useEffect(() => {
    switch (sortMode) {
      case 'lastRunAsc':
        setSorting([{ id: 'lastRun', desc: false }])
        break
      case 'lastRunDesc':
        setSorting([{ id: 'lastRun', desc: true }])
        break
      case 'nextRunAsc':
        setSorting([{ id: 'nextRun', desc: false }])
        break
      case 'nextRunDesc':
        setSorting([{ id: 'nextRun', desc: true }])
        break
      default:
        setSorting([])
    }
  }, [sortMode])

  // 初始載入（不自動更新）
  useEffect(() => {
    let active = true
    db.scheduled
      .toArray()
      .then(async (data) => {
        if (!active) return

        let loadedRows = data

        // 如果 scheduled 為空，就補一筆「定時檢查 Inbox」示範資料
        // 注意：不能直接呼叫 addRow 後再用舊的 data setRows，否則會被空陣列覆蓋
        if (loadedRows.length === 0) {
          const starterRow = createNewScheduledRow('S0', 'Check out the Inbox table!')

          await applyChange({
            table: 'scheduled',
            recordId: starterRow.taskId,
            op: 'add',
            patch: starterRow as unknown as Record<string, unknown>,
            clientId: DEV_CLIENT_ID,
          }).catch((err) => console.error('Failed to add starter scheduled row:', err))

          loadedRows = await db.scheduled.toArray()
          if (loadedRows.length === 0) {
            loadedRows = [starterRow]
          }
        }

        // taskId 降序排列（新的在前面）
        const sorted = [...loadedRows].sort((a, b) => b.taskId.localeCompare(a.taskId))
        setRows(sorted)
        setLoading(false)
      })
      .catch((err) => {
        console.error('Failed to load scheduled:', err)
        if (active) {
          setRows([])
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!pendingEditIntent || pendingEditIntent.sheet !== 'scheduled') return
    if (currentSheet !== 'scheduled') return

    const targetRow = rows.find((row) => row.taskId === pendingEditIntent.taskId)
    if (!targetRow) return

    setEditingItem(targetRow)
    clearPendingEditIntent()
  }, [rows, pendingEditIntent, currentSheet, clearPendingEditIntent])

  const updateLocalRow = (
    taskId: string,
    patch: Partial<ScheduledItem>
  ) => {
    setRows((prev) =>
      prev.map((row) =>
        row.taskId === taskId ? { ...row, ...patch } : row
      )
    )
  }

  const saveUpdate = async (
    taskId: string,
    patch: Partial<ScheduledItem>
  ) => {
    await applyChange({
      table: 'scheduled',
      recordId: taskId,
      op: 'update',
      patch: patch as Record<string, unknown>,
      clientId: DEV_CLIENT_ID,
    }).catch((err) => console.error('Failed to save update:', err))
  }

  const addRow = async (taskId?: string, title?: string) => {
    const newRow = createNewScheduledRow(taskId, title)
    setRows((prev) => [newRow, ...prev])

    await applyChange({
      table: 'scheduled',
      recordId: newRow.taskId,
      op: 'add',
      patch: newRow as unknown as Record<string, unknown>,
      clientId: DEV_CLIENT_ID,
    }).catch((err) => console.error('Failed to add row:', err))

    setEditingItem(newRow)
  }

  const deleteRow = async (taskId: string) => {
    setRows((prev) => prev.filter((row) => row.taskId !== taskId))

    await applyChange({
      table: 'scheduled',
      recordId: taskId,
      op: 'delete',
      patch: {} as Record<string, unknown>,
      clientId: DEV_CLIENT_ID,
    }).catch((err) => console.error('Failed to delete row:', err))
  }

  const toSelectionCandidate = (item: ScheduledItem): SelectionCacheItem => ({
    taskId: item.taskId,
    title: item.title,
    source: 'Scheduled',
    status: item.status,
    url: item.url,
    deadline: item.deadline,
  })

  const handleInterruptOrStart = async (item: ScheduledItem) => {
    const result = await interruptTask('', toSelectionCandidate(item))
    if (result.status !== 'success') {
      console.error('Failed to interrupt/start from scheduled:', result.message)
      return
    }
    await loadRunningTask()
  }

  const handleEditSave = async (data: Record<string, any>) => {
    if (!editingItem) return

    const patch = {
      title: data.title,
      status: data.status,
      focusTime: data.focusTime === '' || data.focusTime == null ? undefined : parseInt(data.focusTime) || 0,
      cronExpr: data.cronExpr,
      remindBefore: data.remindBefore,
      remindAfter: data.remindAfter,
      callback: data.callback,
      lastRun: data.lastRun ? parseFromDateTimeLocal(data.lastRun) : undefined,
      nextRun: data.nextRun ? parseFromDateTimeLocal(data.nextRun) : undefined,
      note: data.note,
      url: data.url,
      deadline: data.deadline ? parseFromDateTimeLocal(data.deadline) : undefined,
    }

    // 立刻更新本地状态
    updateLocalRow(editingItem.taskId, patch)
    // 再异步保存到数据库
    await saveUpdate(editingItem.taskId, patch)
    setEditingItem(null)
  }

  const openCronPreview = (item: ScheduledItem, cronExpr: string) => {
    setCronPreview({
      taskId: item.taskId,
      title: item.title ?? '',
      cronExpr,
      runs: getUpcomingOccurrences(cronExpr),
    })
  }

  const columns = useMemo(
    () => [
      columnHelper.accessor('taskId', {
        header: t('table.scheduled.col.taskId'),
        cell: (info) => (
          <span className="text-xs text-gray-500">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor('title', {
        header: t('table.scheduled.col.title'),
        cell: (info) => {
          const taskId = info.row.original.taskId
          const value = info.getValue() ?? ''

          return (
            <input
              className="w-full px-2 py-1 border rounded focus:outline-none focus:border-blue-500 min-w-3xs"
              value={value}
              onChange={(event) =>
                updateLocalRow(taskId, { title: event.target.value })
              }
              onBlur={(event) =>
                saveUpdate(taskId, { title: event.target.value })
              }
            />
          )
        },
      }),
      columnHelper.accessor('status', {
        header: t('table.scheduled.col.status'),
        cell: (info) => {
          const taskId = info.row.original.taskId
          const value = info.getValue() ?? ''

          return (
            <select
              className="w-full px-2 py-1 border rounded focus:outline-none focus:border-blue-500 min-w-[7rem]"
              value={value}
              onChange={(event) =>
                updateLocalRow(taskId, { status: event.target.value })
              }
              onBlur={(event) =>
                saveUpdate(taskId, { status: event.target.value })
              }
            >
              <option value="WAITING">WAITING</option>
              <option value="PENDING">PENDING</option>
              <option value="DONE">DONE</option>
              <option value="INTERRUPTED">INTERRUPTED</option>
            </select>
          )
        },
      }),
      columnHelper.accessor('focusTime', {
        header: t('table.scheduled.col.focusTime'),
        cell: (info) => {
          const taskId = info.row.original.taskId
          const value = info.getValue()

          return (
            <input
              className="w-24 px-2 py-1 border rounded focus:outline-none focus:border-blue-500"
              type="number"
              min={0}
              value={value ?? ''}
              placeholder="mins"
              onChange={(event) => {
                const raw = event.target.value
                updateLocalRow(taskId, { focusTime: raw === '' ? undefined : parseInt(raw) || 0 })
              }}
              onBlur={(event) => {
                const raw = event.target.value
                saveUpdate(taskId, { focusTime: raw === '' ? undefined : parseInt(raw) || 0 })
              }}
            />
          )
        },
      }),
      columnHelper.accessor('cronExpr', {
        header: t('table.scheduled.cronHeader'),
        cell: (info) => {
          const taskId = info.row.original.taskId
          const fullValue = info.getValue() ?? ''
          const [minute, hour, day, month, weekday] = getCronParts(fullValue)
          const parts = [minute, hour, day, month, weekday]
          const currentNextRun = info.row.original.nextRun

          const updateCronPart = (index: number, newValue: string) => {
            const updated = [...parts]
            while (updated.length < 5) updated.push('*')
            updated[index] = newValue
            const cronExpr = updated.join(' ')
            updateLocalRow(taskId, { cronExpr })
          }

          const saveCronPart = (index: number, newValue: string) => {
            const updated = [...parts]
            while (updated.length < 5) updated.push('*')
            updated[index] = newValue
            const cronExpr = updated.join(' ')
            saveUpdate(taskId, { cronExpr })
          }

          const inputWidth = (value: string) => {
            const length = Math.max(3, value.length)
            return `${length + 1}ch`
          }

          const composeCronExpr = () => {
            return buildCronExpr(parts)
          }

          const previewCronExpr = composeCronExpr()

          const maybeAutoFillNextRun = () => {
            if (currentNextRun != null) return
            const cronExpr = previewCronExpr
            const nextRunDate = Utils.getNextOccurrence(cronExpr, new Date())
            if (!nextRunDate) return
            const nextRun = nextRunDate.getTime()
            updateLocalRow(taskId, { nextRun })
            saveUpdate(taskId, { nextRun })
          }

          const handleCronGroupBlur = (event: FocusEvent<HTMLDivElement>) => {
            const nextTarget = event.relatedTarget as Node | null
            if (nextTarget && event.currentTarget.contains(nextTarget)) {
              return
            }
            maybeAutoFillNextRun()
          }

          return (
            <div
              className="flex flex-wrap items-center gap-1"
              style={{ minWidth: '10rem' }}
              onBlur={handleCronGroupBlur}
            >
              <input
                className="px-1 py-1 border rounded focus:outline-none focus:border-blue-500 font-mono text-xs"
                style={{ minWidth: '1rem', width: inputWidth(minute) }}
                value={minute}
                placeholder="0"
                title={t('table.scheduled.cronMinute')}
                onChange={(e) => updateCronPart(0, e.target.value)}
                onBlur={(e) => saveCronPart(0, e.target.value)}
              />
              <input
                className="px-1 py-1 border rounded focus:outline-none focus:border-blue-500 font-mono text-xs"
                style={{ minWidth: '1rem', width: inputWidth(hour) }}
                value={hour}
                placeholder="9"
                title={t('table.scheduled.cronHour')}
                onChange={(e) => updateCronPart(1, e.target.value)}
                onBlur={(e) => saveCronPart(1, e.target.value)}
              />
              <input
                className="px-1 py-1 border rounded focus:outline-none focus:border-blue-500 font-mono text-xs"
                style={{ minWidth: '1rem', width: inputWidth(day) }}
                value={day}
                placeholder="*"
                title={t('table.scheduled.cronDay')}
                onChange={(e) => updateCronPart(2, e.target.value)}
                onBlur={(e) => saveCronPart(2, e.target.value)}
              />
              <input
                className="px-1 py-1 border rounded focus:outline-none focus:border-blue-500 font-mono text-xs"
                style={{ minWidth: '1rem', width: inputWidth(month) }}
                value={month}
                placeholder="*"
                title={t('table.scheduled.cronMonth')}
                onChange={(e) => updateCronPart(3, e.target.value)}
                onBlur={(e) => saveCronPart(3, e.target.value)}
              />
              <input
                className="px-1 py-1 border rounded focus:outline-none focus:border-blue-500 font-mono text-xs"
                style={{ minWidth: '1rem', width: inputWidth(weekday) }}
                value={weekday}
                placeholder="*"
                title={t('table.scheduled.cronWeekday')}
                onChange={(e) => updateCronPart(4, e.target.value)}
                onBlur={(e) => saveCronPart(4, e.target.value)}
              />
              <button
                type="button"
                className="px-2 py-1 border border-gray-300 rounded text-xs whitespace-nowrap hover:bg-gray-100"
                onClick={() => openCronPreview(info.row.original, previewCronExpr)}
                title={t('table.scheduled.previewButton')}
              >
                {t('table.scheduled.previewButton')}
              </button>
            </div>
          )
        },
      }),
      columnHelper.accessor('remindBefore', {
        header: t('table.scheduled.col.remindBefore'),
        cell: (info) => {
          const taskId = info.row.original.taskId
          const value = info.getValue() ?? ''

          return (
            <input
              className="w-20 px-2 py-1 border rounded focus:outline-none focus:border-blue-500"
              value={value}
              placeholder="1h"
              onChange={(event) =>
                updateLocalRow(taskId, { remindBefore: event.target.value })
              }
              onBlur={(event) =>
                saveUpdate(taskId, { remindBefore: event.target.value })
              }
            />
          )
        },
      }),
      columnHelper.accessor('remindAfter', {
        header: t('table.scheduled.col.remindAfter'),
        cell: (info) => {
          const taskId = info.row.original.taskId
          const value = info.getValue() ?? ''

          return (
            <input
              className="w-20 px-2 py-1 border rounded focus:outline-none focus:border-blue-500"
              value={value}
              placeholder="90m"
              onChange={(event) =>
                updateLocalRow(taskId, { remindAfter: event.target.value })
              }
              onBlur={(event) =>
                saveUpdate(taskId, { remindAfter: event.target.value })
              }
            />
          )
        },
      }),
      columnHelper.accessor('callback', {
        header: t('table.scheduled.col.callback'),
        cell: (info) => {
          const taskId = info.row.original.taskId
          const value = info.getValue() ?? ''

          return (
            <input
              className="w-full min-w-40 px-2 py-1 border rounded focus:outline-none focus:border-blue-500 font-mono text-xs"
              value={value}
              placeholder="action"
              onChange={(event) =>
                updateLocalRow(taskId, { callback: event.target.value })
              }
              onBlur={(event) =>
                saveUpdate(taskId, { callback: event.target.value })
              }
            />
          )
        },
      }),
      columnHelper.accessor('note', {
        header: t('table.scheduled.col.note'),
        cell: (info) => {
          const taskId = info.row.original.taskId
          const value = info.getValue() ?? ''

          return (
            <input
              className="w-full min-w-40 px-2 py-1 border rounded focus:outline-none focus:border-blue-500"
              value={value}
              onChange={(event) =>
                updateLocalRow(taskId, { note: event.target.value })
              }
              onBlur={(event) =>
                saveUpdate(taskId, { note: event.target.value })
              }
            />
          )
        },
      }),
      columnHelper.accessor('url', {
        header: t('table.scheduled.col.url'),
        cell: (info) => {
          const taskId = info.row.original.taskId
          const value = info.getValue() ?? ''
          const hasValidUrl = value && value !== 'None'

          return (
            <div className="flex items-center gap-2">
              <input
                className="flex-1 px-2 py-1 border rounded focus:outline-none focus:border-blue-500 text-xs"
                value={value}
                onChange={(event) =>
                  updateLocalRow(taskId, { url: event.target.value })
                }
                onBlur={(event) =>
                  saveUpdate(taskId, { url: event.target.value })
                }
              />
              {hasValidUrl && (
                <a
                  href={value}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 whitespace-nowrap"
                >
                  {text.open}
                </a>
              )}
            </div>
          )
        },
      }),
      columnHelper.accessor('deadline', {
        header: t('table.scheduled.col.deadline'),
        cell: (info) => {
          const taskId = info.row.original.taskId
          const rawValue = info.getValue()
          const value = rawValue ? formatToDateTimeLocal(rawValue) : ''

          return (
            <input
              className="w-full px-2 py-1 border rounded focus:outline-none focus:border-blue-500 text-xs"
              type="datetime-local"
              value={value}
              onChange={(event) => {
                const nextValue = parseFromDateTimeLocal(event.target.value)
                updateLocalRow(taskId, { deadline: nextValue })
              }}
              onBlur={(event) => {
                const nextValue = event.target.value ? parseFromDateTimeLocal(event.target.value) : undefined
                saveUpdate(taskId, { deadline: nextValue })
              }}
            />
          )
        },
      }),
      columnHelper.accessor('nextRun', {
        header: t('table.scheduled.col.nextRun'),
        sortingFn: 'datetime',
        cell: (info) => {
          const taskId = info.row.original.taskId
          const rawValue = info.getValue()
          const value = formatToDateTimeLocal(rawValue)

          return (
            <input
              className="w-full px-2 py-1 border rounded focus:outline-none focus:border-blue-500 text-xs"
              type="datetime-local"
              value={value}
              onChange={(event) => {
                const nextValue = parseFromDateTimeLocal(event.target.value)
                updateLocalRow(taskId, { nextRun: nextValue })
              }}
              onBlur={(event) => {
                const nextValue = parseFromDateTimeLocal(event.target.value)
                saveUpdate(taskId, { nextRun: nextValue })
              }}
            />
          )
        },
      }),
      // Hidden column for lastRun sorting
      columnHelper.accessor('lastRun', {
        id: 'lastRun',
        header: () => null,
        cell: () => null,
        sortingFn: 'datetime',
      }),
      columnHelper.display({
        id: 'actions',
        header: t('table.scheduled.col.actions'),
        cell: (info) => (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleInterruptOrStart(info.row.original)}
              className="px-2 py-1 text-xs bg-amber-500 text-white rounded hover:bg-amber-600 whitespace-nowrap"
            >
              {runningTask ? t('table.quickSwitch') : t('table.quickStart')}
            </button>
            <button
              onClick={() => deleteRow(info.row.original.taskId)}
              className="px-2 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
            >
              {t('table.scheduled.col.delete')}
            </button>
          </div>
        ),
      }),
    ],
    [t, runningTask]
  )

  const searchFiltered = useSearchFilter(
    rows,
    { query: searchQuery, isOrMode },
    ['title', 'note', 'url', 'callback'] as (keyof ScheduledItem)[]
  )
  const filteredRows = useHideDone(searchFiltered, hideDone)

  const table = useReactTable({
    data: filteredRows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: {
      columnVisibility,
      sorting,
    },
    onColumnVisibilityChange: setColumnVisibility,
    onSortingChange: setSorting,
    // Custom sorting for datetime fields (lastRun, nextRun)
    // Undefined values should appear first
    sortingFns: {
      datetime: (rowA, rowB, columnId) => {
        const a = rowA.getValue<number | undefined>(columnId)
        const b = rowB.getValue<number | undefined>(columnId)
        
        // Undefined values go first
        if (a === undefined && b === undefined) return 0
        if (a === undefined) return -1
        if (b === undefined) return 1
        
        return a - b
      },
    },
  })

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-bold">Scheduled Tasks</h2>
          <p className="text-sm text-gray-600">{text.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHelp(true)}
            className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-100"
          >
            {text.help}
          </button>
          <button
            onClick={() => addRow()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            {t('table.add')}
          </button>
        </div>
      </div>

      {/* 搜尋欄與過濾器 */}
      <div className="mb-4 flex gap-2 flex-wrap">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={text.searchPlaceholder}
          className={`px-3 py-2 border rounded focus:outline-none focus:border-blue-500 ${isMobile ? 'flex-1 min-w-0' : 'flex-1'}`}
        />

        {!isMobile && (
          <>
            <button
              onClick={() => setIsOrMode(!isOrMode)}
              className={`px-3 py-2 rounded ${
                isOrMode
                  ? 'bg-blue-500 text-white hover:bg-blue-600'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {isOrMode ? 'OR' : 'AND'}
            </button>
            <label className="flex items-center gap-1 px-3 py-2 border rounded cursor-pointer select-none text-sm text-gray-700 hover:bg-gray-50">
              <input
                type="checkbox"
                checked={hideDone}
                onChange={(e) => setHideDone(e.target.checked)}
                className="accent-blue-500"
              />
              {text.hideDone}
            </label>
          </>
        )}

        {isMobile && (
          <button
            onClick={() => setShowMobileFilters((prev) => !prev)}
            className="px-3 py-2 border rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
            title="Toggle filters"
          >
            {showMobileFilters ? 'Hide Filters' : 'Show Filters'}
          </button>
        )}
      </div>

      {/* 桌面版排序選項 */}
      {!isMobile && (
        <div className="mb-4 flex gap-2 items-center">
          <label className="text-sm text-gray-700 font-semibold">{text.sortLabel}:</label>
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as typeof sortMode)}
            className="px-3 py-2 border rounded focus:outline-none focus:border-blue-500 text-sm"
          >
            <option value="none">{t('table.scheduled.sort.none')}</option>
            <option value="lastRunAsc">{t('table.scheduled.sort.lastRunAsc')}</option>
            <option value="lastRunDesc">{t('table.scheduled.sort.lastRunDesc')}</option>
            <option value="nextRunAsc">{t('table.scheduled.sort.nextRunAsc')}</option>
            <option value="nextRunDesc">{t('table.scheduled.sort.nextRunDesc')}</option>
          </select>
        </div>
      )}

      {/* 手機版過濾面板 */}
      {isMobile && showMobileFilters && (
        <div className="mb-4 rounded-lg border bg-gray-50 p-3">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-gray-700">{text.searchMode}:</label>
              <button
                onClick={() => setIsOrMode(!isOrMode)}
                className={`px-3 py-1 rounded text-sm ${
                  isOrMode
                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {isOrMode ? 'OR' : 'AND'}
              </button>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">{text.sortLabel}:</label>
              <select
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as typeof sortMode)}
                className="w-full px-2 py-1 border rounded focus:outline-none focus:border-blue-500 text-sm"
              >
                <option value="none">{t('table.scheduled.sort.none')}</option>
                <option value="lastRunAsc">{t('table.scheduled.sort.lastRunAsc')}</option>
                <option value="lastRunDesc">{t('table.scheduled.sort.lastRunDesc')}</option>
                <option value="nextRunAsc">{t('table.scheduled.sort.nextRunAsc')}</option>
                <option value="nextRunDesc">{t('table.scheduled.sort.nextRunDesc')}</option>
              </select>
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={hideDone}
                onChange={(e) => setHideDone(e.target.checked)}
                className="accent-blue-500"
              />
              {text.hideDone}
            </label>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center text-gray-500">{text.loading}</div>
      ) : rows.length === 0 ? (
        <div className="text-center text-gray-500">{t('table.noItemsYet')}</div>
      ) : filteredRows.length === 0 ? (
        <div className="text-center text-gray-500">{t('table.noMatchingItems')}</div>
      ) : isMobile ? (
        // 移動視圖 - 卡片
        <div className="grid grid-cols-1 gap-3">
          {table.getRowModel().rows.map((row) => {
            const item = row.original
            return (
            <TableCard
              key={item.taskId}
              item={item}
                fields={[
                  { label: t('col.title'), value: item.title || t('table.empty') },
                  { label: t('card.status'), value: item.status },
                  {
                    label: t('card.focusTime'),
                    value: item.focusTime == null ? t('card.default30Mins') : t('card.default30MinsUnit', { n: item.focusTime }),
                  },
                  { label: t('card.cron'), value: item.cronExpr },
                  {
                    label: t('card.nextRun'),
                    value: item.nextRun
                      ? new Date(item.nextRun).toLocaleString('zh-TW')
                      : t('table.notSet'),
                  },
                ]}
                onEdit={setEditingItem}
                onDelete={(item) => deleteRow(item.taskId)}
                quickAction={{
                  label: runningTask ? t('table.quickSwitch') : t('table.quickStart'),
                  onClick: handleInterruptOrStart,
                }}
              />
            )
          })}
          </div>
      ) : (
        // 桌面視圖 - 表格
        <div className="overflow-x-auto border rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 border-b">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-4 py-2 text-left font-semibold"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
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
                  onClick={(event) => {
                    if (!shouldOpenRowEdit(event.target)) return
                    setEditingItem(row.original)
                  }}
                  className="border-b hover:bg-gray-50 cursor-pointer"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-2">
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

      <EditDialog
        isOpen={!!editingItem}
        title={text.editTitle}
        item={editingItem}
        fields={[
          {
            name: 'title',
            label: t('table.scheduled.field.title'),
            type: 'text' as FieldType,
            placeholder: text.titlePlaceholder,
          },
          {
            name: 'status',
            label: t('table.scheduled.field.status'),
            type: 'select' as FieldType,
            options: [
              { label: 'WAITING', value: 'WAITING' },
              { label: 'PENDING', value: 'PENDING' },
              { label: 'DONE', value: 'DONE' },
              { label: 'INTERRUPTED', value: 'INTERRUPTED' },
            ],
          },
          {
            name: 'cronExpr',
            label: t('table.scheduled.field.cronExpr'),
            type: 'cron' as FieldType,
            placeholder: text.cronPlaceholder,
          },
          {
            name: 'focusTime',
            label: t('table.scheduled.field.focusTime'),
            type: 'number' as FieldType,
          },
          {
            name: 'remindBefore',
            label: t('table.scheduled.field.remindBefore'),
            type: 'text' as FieldType,
          },
          {
            name: 'remindAfter',
            label: t('table.scheduled.field.remindAfter'),
            type: 'text' as FieldType,
          },
          {
            name: 'callback',
            label: t('table.scheduled.field.callback'),
            type: 'text' as FieldType,
          },
          {
            name: 'lastRun',
            label: t('table.scheduled.field.lastRun'),
            type: 'datetime' as FieldType,
          },
          {
            name: 'nextRun',
            label: t('table.scheduled.field.nextRun'),
            type: 'datetime' as FieldType,
          },
          {
            name: 'note',
            label: t('table.scheduled.field.note'),
            type: 'text' as FieldType,
          },
          {
            name: 'url',
            label: t('table.scheduled.field.url'),
            type: 'text' as FieldType,
            placeholder: 'https://...',
          },
          {
            name: 'deadline',
            label: t('table.scheduled.field.deadline'),
            type: 'datetime' as FieldType,
          },
        ]}
        onSave={handleEditSave}
        onClose={() => setEditingItem(null)}
      />

      <TableHelpDialog
        isOpen={showHelp}
        title={text.helpTitle}
        markdown={scheduledHelpMarkdown}
        onClose={() => setShowHelp(false)}
      />

      {cronPreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setCronPreview(null)}
        >
          <div
            className="w-full max-w-lg rounded-lg bg-white p-5 shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start gap-3">
              <div>
                <h3 className="text-lg font-bold">{t('table.scheduled.previewTitle')}</h3>
                <p className="text-sm text-gray-600">
                  {cronPreview.title || cronPreview.taskId}
                </p>
                <p className="mt-1 font-mono text-xs text-gray-500">{cronPreview.cronExpr}</p>
              </div>
              <button
                type="button"
                className="ml-auto px-3 py-1 border border-gray-300 rounded hover:bg-gray-100"
                onClick={() => setCronPreview(null)}
              >
                {t('dialog.cancel')}
              </button>
            </div>

            {cronPreview.runs.length === 0 ? (
              <p className="text-sm text-red-600">
                {t('table.scheduled.previewEmpty')}
              </p>
            ) : (
              <div>
                <p className="mb-3 text-sm text-gray-600">
                  {t('table.scheduled.previewCount', { n: cronPreview.runs.length })}
                </p>
                <ol className="max-h-[60vh] list-decimal space-y-2 overflow-y-auto pl-5 text-sm text-gray-800">
                  {cronPreview.runs.map((run) => (
                    <li key={run}>
                      {new Date(run).toLocaleString()}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

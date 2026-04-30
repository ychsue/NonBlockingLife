import { useMemo, useState, useEffect } from 'react'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { applyChange, db } from '../../db/index'
import type { MicroTaskItem } from '../../db/schema'
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
import microTasksHelpMarkdown from './MicroTasksHelp.md?raw'
import { useSearchFilter, useHideDone } from '../../hooks/useSearchFilter'

const DEV_CLIENT_ID = 'dev-client'
const columnHelper = createColumnHelper<MicroTaskItem>()

function createNewMicroTaskRow(): MicroTaskItem {
  const taskId = Utils.generateId('t')
  return {
    taskId,
    title: '',
    status: 'PENDING',
    focusTime: undefined,
    lastRunDate: undefined,
    url: '',
  }
}

export function MicroTasksTable() {
  const t = useT()
  const [rows, setRows] = useState<MicroTaskItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showHelp, setShowHelp] = useState(false)
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({
    taskId: false,
  })
  const { isMobile } = useResponsiveTable()
  const [editingItem, setEditingItem] = useState<MicroTaskItem | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [isOrMode, setIsOrMode] = useState(true)
    const [hideDone, setHideDone] = useState(false)
  const currentSheet = useAppStore((state) => state.currentSheet)
  const pendingEditIntent = useAppStore((state) => state.pendingEditIntent)
  const clearPendingEditIntent = useAppStore((state) => state.clearPendingEditIntent)
  const text = {
    subtitle: t('table.micro.subtitle'),
    help: t('table.help'),
    searchPlaceholder: t('table.micro.searchPlaceholder'),
    hideDone: t('table.micro.hideDone'),
    open: t('table.open'),
    editTitle: t('table.micro.editTitle'),
    titlePlaceholder: t('table.micro.titlePlaceholder'),
    loading: t('table.loading'),
    helpTitle: t('table.micro.helpTitle'),
  }

  // 初始載入（不自動更新）
  useEffect(() => {
    let active = true
    db.micro_tasks
      .toArray()
      .then((data) => {
        if (active) {
          // taskId 降序排列（新的在前面）
          const sorted = data.sort((a, b) => b.taskId.localeCompare(a.taskId))
          setRows(sorted)
          setLoading(false)
        }
      })
      .catch((err) => {
        console.error('Failed to load micro tasks:', err)
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
    if (!pendingEditIntent || pendingEditIntent.sheet !== 'micro_tasks') return
    if (currentSheet !== 'micro_tasks') return

    const targetRow = rows.find((row) => row.taskId === pendingEditIntent.taskId)
    if (!targetRow) return

    setEditingItem(targetRow)
    clearPendingEditIntent()
  }, [rows, pendingEditIntent, currentSheet, clearPendingEditIntent])

  const updateLocalRow = (
    taskId: string,
    patch: Partial<MicroTaskItem>
  ) => {
    setRows((prev) =>
      prev.map((row) =>
        row.taskId === taskId ? { ...row, ...patch } : row
      )
    )
  }

  const saveUpdate = async (
    taskId: string,
    patch: Partial<MicroTaskItem>
  ) => {
    await applyChange({
      table: 'micro_tasks',
      recordId: taskId,
      op: 'update',
      patch: patch as Record<string, unknown>,
      clientId: DEV_CLIENT_ID,
    }).catch((err) => console.error('Failed to save update:', err))
  }

  const addRow = async () => {
    const newRow = createNewMicroTaskRow()
    setRows((prev) => [newRow, ...prev])

    await applyChange({
      table: 'micro_tasks',
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
      table: 'micro_tasks',
      recordId: taskId,
      op: 'delete',
      patch: {} as Record<string, unknown>,
      clientId: DEV_CLIENT_ID,
    }).catch((err) => console.error('Failed to delete row:', err))
  }

  const handleEditSave = async (data: Record<string, any>) => {
    if (!editingItem) return

    const patch = {
      title: data.title,
      status: data.status,
      focusTime: data.focusTime === '' || data.focusTime == null ? undefined : parseInt(data.focusTime) || 0,
      lastRunDate: data.lastRunDate ? parseFromDateTimeLocal(data.lastRunDate) : undefined,
      url: data.url,
      deadline: data.deadline ? parseFromDateTimeLocal(data.deadline) : undefined,
    }

    // 立刻更新本地状态
    updateLocalRow(editingItem.taskId, patch)
    // 再异步保存到数据库
    await saveUpdate(editingItem.taskId, patch)
    setEditingItem(null)
  }

  const columns = useMemo(
    () => [
      columnHelper.accessor('taskId', {
        header: t('table.micro.col.taskId'),
        cell: (info) => (
          <span className="text-xs text-gray-500">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor('title', {
        header: t('table.micro.col.title'),
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
        header: t('table.micro.col.status'),
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
              <option value="PENDING">PENDING</option>
              <option value="DOING">DOING</option>
              <option value="DONE">DONE</option>
            </select>
          )
        },
      }),
      columnHelper.accessor('focusTime', {
        header: t('table.micro.col.focusTime'),
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
      columnHelper.accessor('url', {
        header: t('table.micro.col.url'),
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
        header: t('table.micro.col.deadline'),
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
      columnHelper.display({
        id: 'actions',
        header: t('table.micro.col.actions'),
        cell: (info) => (
          <button
            onClick={() => deleteRow(info.row.original.taskId)}
            className="px-2 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
          >
            {t('table.micro.col.delete')}
          </button>
        ),
      }),
    ],
    [t]
  )

  const searchFiltered = useSearchFilter(
    rows,
    { query: searchQuery, isOrMode },
    ['title', 'url'] as (keyof MicroTaskItem)[]
  )
  const filteredRows = useHideDone(searchFiltered, hideDone)

  const table = useReactTable({
    data: filteredRows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    state: {
      columnVisibility,
    },
    onColumnVisibilityChange: setColumnVisibility,
  })

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-bold">Micro Tasks</h2>
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
            onClick={addRow}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            {t('table.add')}
          </button>
        </div>
      </div>

      {/* 搜尋欄 */}
      <div className="mb-4 flex gap-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={text.searchPlaceholder}
          className="flex-1 px-3 py-2 border rounded focus:outline-none focus:border-blue-500"
        />
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
      </div>

      {loading ? (
        <div className="text-center text-gray-500">{text.loading}</div>
      ) : rows.length === 0 ? (
        <div className="text-center text-gray-500">{t('table.noItemsYet')}</div>
      ) : filteredRows.length === 0 ? (
        <div className="text-center text-gray-500">{t('table.noMatchingItems')}</div>
      ) : isMobile ? (
        // 移動視圖 - 卡片
        <div className="grid grid-cols-1 gap-3">
          {filteredRows.map((item) => (
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
                  {
                    label: t('card.lastRun'),
                    value: item.lastRunDate
                      ? new Date(item.lastRunDate).toLocaleString('zh-TW')
                      : t('table.notRun'),
                  },
                ]}
                onEdit={setEditingItem}
                onDelete={(item) => deleteRow(item.taskId)}
              />
            ))}
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
                <tr key={row.id} className="border-b hover:bg-gray-50">
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
            label: t('table.micro.field.title'),
            type: 'text' as FieldType,
            placeholder: text.titlePlaceholder,
          },
          {
            name: 'status',
            label: t('table.micro.field.status'),
            type: 'select' as FieldType,
            options: [
              { label: 'Pending', value: 'PENDING' },
              { label: 'Doing', value: 'DOING' },
              { label: 'Done', value: 'DONE' },
            ],
          },
          {
            name: 'focusTime',
            label: t('table.micro.field.focusTime'),
            type: 'number' as FieldType,
          },
          {
            name: 'lastRunDate',
            label: t('table.micro.field.lastRun'),
            type: 'datetime' as FieldType,
          },
          {
            name: 'url',
            label: t('table.micro.field.url'),
            type: 'text' as FieldType,
            placeholder: 'https://...',
          },
          {
            name: 'deadline',
            label: t('table.micro.field.deadline'),
            type: 'datetime' as FieldType,
          },
        ]}
        onSave={handleEditSave}
        onClose={() => setEditingItem(null)}
      />

      <TableHelpDialog
        isOpen={showHelp}
        title={text.helpTitle}
        markdown={microTasksHelpMarkdown}
        onClose={() => setShowHelp(false)}
      />
    </div>
  )
}

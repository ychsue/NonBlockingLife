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
import { TableCard } from '../TableCard'
import { EditDialog, type FieldType } from '../EditDialog'
import { TableHelpDialog } from '../TableHelpDialog'
import microTasksHelpMarkdown from './MicroTasksHelp.md?raw'

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
  const [rows, setRows] = useState<MicroTaskItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showHelp, setShowHelp] = useState(false)
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({
    taskId: false,
  })
  const { isMobile } = useResponsiveTable()
  const [editingItem, setEditingItem] = useState<MicroTaskItem | null>(null)

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
        header: 'Task ID',
        cell: (info) => (
          <span className="text-xs text-gray-500">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor('title', {
        header: 'Title',
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
        header: 'Status',
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
        header: 'Focus Time',
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
        header: 'URL',
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
                  開啟
                </a>
              )}
            </div>
          )
        },
      }),
      columnHelper.display({
        id: 'actions',
        header: 'Actions',
        cell: (info) => (
          <button
            onClick={() => deleteRow(info.row.original.taskId)}
            className="px-2 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
          >
            Delete
          </button>
        ),
      }),
    ],
    []
  )

  const table = useReactTable({
    data: rows,
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
          <p className="text-sm text-gray-600">小型任務快速完成</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHelp(true)}
            className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-100"
          >
            說明
          </button>
          <button
            onClick={addRow}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            + Add
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-gray-500">Loading...</div>
      ) : rows.length === 0 ? (
        <div className="text-center text-gray-500">No items yet.</div>
      ) : isMobile ? (
        // 移動視圖 - 卡片
        <>
          <div className="grid grid-cols-1 gap-3">
            {rows.map((item) => (
              <TableCard
                key={item.taskId}
                item={item}
                fields={[
                  { label: 'Title', value: item.title || '(empty)' },
                  { label: 'Status', value: item.status },
                  {
                    label: 'Focus Time',
                    value: item.focusTime == null ? '(default 30)' : `${item.focusTime} mins`,
                  },
                  {
                    label: 'Last Run',
                    value: item.lastRunDate
                      ? new Date(item.lastRunDate).toLocaleString('zh-TW')
                      : '(未執行)',
                  },
                ]}
                onEdit={setEditingItem}
                onDelete={(item) => deleteRow(item.taskId)}
              />
            ))}
          </div>

          <EditDialog
            isOpen={!!editingItem}
            title="編輯微任務"
            item={editingItem}
            fields={[
              {
                name: 'title',
                label: 'Title',
                type: 'text' as FieldType,
                placeholder: '輸入任務標題',
              },
              {
                name: 'status',
                label: 'Status',
                type: 'select' as FieldType,
                options: [
                  { label: 'Pending', value: 'PENDING' },
                  { label: 'Doing', value: 'DOING' },
                  { label: 'Done', value: 'DONE' },
                ],
              },
              {
                name: 'focusTime',
                label: 'Focus Time (mins)',
                type: 'number' as FieldType,
              },
              {
                name: 'lastRunDate',
                label: 'Last Run',
                type: 'datetime' as FieldType,
              },
              {
                name: 'url',
                label: 'URL',
                type: 'text' as FieldType,
                placeholder: 'https://...',
              },
            ]}
            onSave={handleEditSave}
            onClose={() => setEditingItem(null)}
          />
        </>
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

      <TableHelpDialog
        isOpen={showHelp}
        title="Micro Tasks 使用說明"
        markdown={microTasksHelpMarkdown}
        onClose={() => setShowHelp(false)}
      />
    </div>
  )
}

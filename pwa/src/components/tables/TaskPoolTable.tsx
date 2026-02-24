import { useMemo, useState, useEffect } from 'react'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { applyChange, db } from '../../db/index'
import type { TaskPoolItem } from '../../db/schema'
import Utils from '../../../../gas/src/Utils'
import {
  formatToDateTimeLocal,
  parseFromDateTimeLocal,
} from '../../utils/timeUtils'

const DEV_CLIENT_ID = 'dev-client'
const columnHelper = createColumnHelper<TaskPoolItem>()

function createNewTaskPoolRow(taskId?: string, title?: string, note?: string, url?: string): TaskPoolItem {
  const id = taskId ?? Utils.generateId('T')
  return {
    taskId: id,
    title: title ?? '',
    status: 'PENDING',
    project: '',
    spentTodayMins: 0,
    dailyLimitMins: 60,
    priority: 0,
    lastRunDate: undefined,
    totalSpentMins: 0,
    note: note ?? '',
    url: url ?? '',
  }
}

export function TaskPoolTable() {
  const [rows, setRows] = useState<TaskPoolItem[]>([])
  const [loading, setLoading] = useState(true)

  // 初始載入（不自動更新）
  useEffect(() => {
    let active = true
    db.task_pool
      .toArray()
      .then(async (data) => {
        if (!active) return
        
        // 如果 task_pool 為空，自動添加五個預設任務
        if (data.length === 0) {
          const defaultTasks: TaskPoolItem[] = [
            createNewTaskPoolRow('T0', 'Free(Idle)', '', 'None'),
            createNewTaskPoolRow('Ta', 'Superconductor-like Society', '', 'https://ychsue.github.io/superconductorlike_society'),
            createNewTaskPoolRow('Tb', 'ActionManifold', '', 'https://github.com/ychsue/ActionManifold'),
            createNewTaskPoolRow('Tc', 'NonBlockingLife', '', 'https://ychsue.github.io/NonBlockingLife'),
            createNewTaskPoolRow('Td', 'MyProject', '', 'None'),
          ]
          
          // 批量添加到資料庫
          for (const task of defaultTasks) {
            await applyChange({
              table: 'task_pool',
              recordId: task.taskId,
              op: 'add',
              patch: task as unknown as Record<string, unknown>,
              clientId: DEV_CLIENT_ID,
            }).catch((err) => console.error('Failed to add default task:', err))
          }
          
          data = defaultTasks
        }
        
        if (active) {
          // taskId 降序排列（新的在前面）
          const sorted = data.sort((a, b) => b.taskId.localeCompare(a.taskId))
          setRows(sorted)
          setLoading(false)
        }
      })
      .catch((err) => {
        console.error('Failed to load task pool:', err)
        if (active) {
          setRows([])
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [])

  const updateLocalRow = (taskId: string, patch: Partial<TaskPoolItem>) => {
    setRows((prev) =>
      prev.map((row) =>
        row.taskId === taskId ? { ...row, ...patch } : row
      )
    )
  }

  const saveUpdate = async (
    taskId: string,
    patch: Partial<TaskPoolItem>
  ) => {
    await applyChange({
      table: 'task_pool',
      recordId: taskId,
      op: 'update',
      patch: patch as Record<string, unknown>,
      clientId: DEV_CLIENT_ID,
    }).catch((err) => console.error('Failed to save update:', err))
  }

  const addRow = async () => {
    const newRow = createNewTaskPoolRow()
    setRows((prev) => [newRow, ...prev])

    await applyChange({
      table: 'task_pool',
      recordId: newRow.taskId,
      op: 'add',
      patch: newRow as unknown as Record<string, unknown>,
      clientId: DEV_CLIENT_ID,
    }).catch((err) => console.error('Failed to add row:', err))
  }

  const deleteRow = async (taskId: string) => {
    setRows((prev) => prev.filter((row) => row.taskId !== taskId))

    await applyChange({
      table: 'task_pool',
      recordId: taskId,
      op: 'delete',
      patch: {} as Record<string, unknown>,
      clientId: DEV_CLIENT_ID,
    }).catch((err) => console.error('Failed to delete row:', err))
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
              className="w-full px-2 py-1 border rounded focus:outline-none focus:border-blue-500"
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
              className="w-full px-2 py-1 border rounded focus:outline-none focus:border-blue-500"
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
      columnHelper.accessor('project', {
        header: 'Project',
        cell: (info) => {
          const taskId = info.row.original.taskId
          const value = info.getValue() ?? ''

          return (
            <input
              className="w-full px-2 py-1 border rounded focus:outline-none focus:border-blue-500"
              value={value}
              onChange={(event) =>
                updateLocalRow(taskId, { project: event.target.value })
              }
              onBlur={(event) =>
                saveUpdate(taskId, { project: event.target.value })
              }
            />
          )
        },
      }),
      columnHelper.accessor('priority', {
        header: 'Priority',
        cell: (info) => {
          const taskId = info.row.original.taskId
          const value = info.getValue() ?? 0

          return (
            <input
              className="w-20 px-2 py-1 border rounded focus:outline-none focus:border-blue-500"
              type="number"
              value={value}
              onChange={(event) =>
                updateLocalRow(taskId, { priority: parseInt(event.target.value) || 0 })
              }
              onBlur={(event) =>
                saveUpdate(taskId, { priority: parseInt(event.target.value) || 0 })
              }
            />
          )
        },
      }),
      columnHelper.accessor('dailyLimitMins', {
        header: 'Daily Limit',
        cell: (info) => {
          const taskId = info.row.original.taskId
          const value = info.getValue() ?? 0

          return (
            <input
              className="w-20 px-2 py-1 border rounded focus:outline-none focus:border-blue-500"
              type="number"
              value={value}
              placeholder="mins"
              onChange={(event) =>
                updateLocalRow(taskId, { dailyLimitMins: parseInt(event.target.value) || 0 })
              }
              onBlur={(event) =>
                saveUpdate(taskId, { dailyLimitMins: parseInt(event.target.value) || 0 })
              }
            />
          )
        },
      }),
      columnHelper.accessor('spentTodayMins', {
        header: 'Spent Today',
        cell: (info) => {
          const taskId = info.row.original.taskId
          const value = info.getValue() ?? 0

          return (
            <input
              className="w-20 px-2 py-1 border rounded focus:outline-none focus:border-blue-500"
              type="number"
              value={value}
              placeholder="mins"
              onChange={(event) =>
                updateLocalRow(taskId, { spentTodayMins: parseInt(event.target.value) || 0 })
              }
              onBlur={(event) =>
                saveUpdate(taskId, { spentTodayMins: parseInt(event.target.value) || 0 })
              }
            />
          )
        },
      }),
      columnHelper.accessor('lastRunDate', {
        header: 'Last Run',
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
                updateLocalRow(taskId, { lastRunDate: nextValue })
              }}
              onBlur={(event) => {
                const nextValue = parseFromDateTimeLocal(event.target.value)
                saveUpdate(taskId, { lastRunDate: nextValue })
              }}
            />
          )
        },
      }),
      columnHelper.accessor('note', {
        header: 'Note',
        cell: (info) => {
          const taskId = info.row.original.taskId
          const value = info.getValue() ?? ''

          return (
            <input
              className="w-full px-2 py-1 border rounded focus:outline-none focus:border-blue-500"
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
        header: 'URL',
        cell: (info) => {
          const taskId = info.row.original.taskId
          const value = info.getValue() ?? ''
          const hasValidUrl = value && value !== 'None' && value !== ''

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
  })

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-bold">Task Pool</h2>
          <p className="text-sm text-gray-600">任務優先序與時間管理</p>
        </div>
        <button
          onClick={addRow}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          + Add
        </button>
      </div>

      {loading ? (
        <div className="text-center text-gray-500">Loading...</div>
      ) : rows.length === 0 ? (
        <div className="text-center text-gray-500">No items yet.</div>
      ) : (
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
    </div>
  )
}

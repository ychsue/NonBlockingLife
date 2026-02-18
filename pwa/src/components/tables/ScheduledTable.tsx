import { useMemo, useState, useEffect } from 'react'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { applyChange, db } from '../../db/index'
import type { ScheduledItem } from '../../db/schema'
import Utils from '../../../../gas/src/Utils'
import {
  formatToDateTimeLocal,
  parseFromDateTimeLocal,
} from '../../utils/timeUtils'

const DEV_CLIENT_ID = 'dev-client'
const columnHelper = createColumnHelper<ScheduledItem>()

function createNewScheduledRow(): ScheduledItem {
  const taskId = Utils.generateId('S')
  return {
    taskId,
    title: '',
    status: 'WAITING',
    cronExpr: '0 9 * * *',
    remindBefore: '',
    remindAfter: '',
    callback: '',
    lastRun: undefined,
    note: '',
    nextRun: undefined,
  }
}

export function ScheduledTable() {
  const [rows, setRows] = useState<ScheduledItem[]>([])
  const [loading, setLoading] = useState(true)

  // 初始載入（不自動更新）
  useEffect(() => {
    let active = true
    db.scheduled
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

  const addRow = async () => {
    const newRow = createNewScheduledRow()
    setRows((prev) => [newRow, ...prev])

    await applyChange({
      table: 'scheduled',
      recordId: newRow.taskId,
      op: 'add',
      patch: newRow as unknown as Record<string, unknown>,
      clientId: DEV_CLIENT_ID,
    }).catch((err) => console.error('Failed to add row:', err))
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
              <option value="WAITING">WAITING</option>
              <option value="PENDING">PENDING</option>
              <option value="DONE">DONE</option>
            </select>
          )
        },
      }),
      columnHelper.accessor('cronExpr', {
        header: 'Cron (分 時 日 月 週)',
        cell: (info) => {
          const taskId = info.row.original.taskId
          const fullValue = info.getValue() ?? ''
          const parts = fullValue.split(' ')
          const [minute = '', hour = '', day = '', month = '', weekday = ''] = parts

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

          return (
            <div className="flex flex-wrap gap-1" style={{ minWidth: '10rem' }}>
              <input
                className="px-1 py-1 border rounded focus:outline-none focus:border-blue-500 font-mono text-xs"
                style={{ minWidth: '1rem', width: inputWidth(minute) }}
                value={minute}
                placeholder="0"
                title="分鐘"
                onChange={(e) => updateCronPart(0, e.target.value)}
                onBlur={(e) => saveCronPart(0, e.target.value)}
              />
              <input
                className="px-1 py-1 border rounded focus:outline-none focus:border-blue-500 font-mono text-xs"
                style={{ minWidth: '1rem', width: inputWidth(hour) }}
                value={hour}
                placeholder="9"
                title="小時"
                onChange={(e) => updateCronPart(1, e.target.value)}
                onBlur={(e) => saveCronPart(1, e.target.value)}
              />
              <input
                className="px-1 py-1 border rounded focus:outline-none focus:border-blue-500 font-mono text-xs"
                style={{ minWidth: '1rem', width: inputWidth(day) }}
                value={day}
                placeholder="*"
                title="日"
                onChange={(e) => updateCronPart(2, e.target.value)}
                onBlur={(e) => saveCronPart(2, e.target.value)}
              />
              <input
                className="px-1 py-1 border rounded focus:outline-none focus:border-blue-500 font-mono text-xs"
                style={{ minWidth: '1rem', width: inputWidth(month) }}
                value={month}
                placeholder="*"
                title="月"
                onChange={(e) => updateCronPart(3, e.target.value)}
                onBlur={(e) => saveCronPart(3, e.target.value)}
              />
              <input
                className="px-1 py-1 border rounded focus:outline-none focus:border-blue-500 font-mono text-xs"
                style={{ minWidth: '1rem', width: inputWidth(weekday) }}
                value={weekday}
                placeholder="*"
                title="週"
                onChange={(e) => updateCronPart(4, e.target.value)}
                onBlur={(e) => saveCronPart(4, e.target.value)}
              />
            </div>
          )
        },
      }),
      columnHelper.accessor('remindBefore', {
        header: 'Remind Before',
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
        header: 'Remind After',
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
        header: 'Callback',
        cell: (info) => {
          const taskId = info.row.original.taskId
          const value = info.getValue() ?? ''

          return (
            <input
              className="w-full px-2 py-1 border rounded focus:outline-none focus:border-blue-500 font-mono text-xs"
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
      columnHelper.accessor('nextRun', {
        header: 'Next Run',
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
          <h2 className="text-xl font-bold">Scheduled Tasks</h2>
          <p className="text-sm text-gray-600">定期執行的任務設定</p>
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

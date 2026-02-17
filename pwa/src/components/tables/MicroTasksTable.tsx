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

const DEV_CLIENT_ID = 'dev-client'
const columnHelper = createColumnHelper<MicroTaskItem>()

function createNewMicroTaskRow(): MicroTaskItem {
  const taskId = Utils.generateId('t')
  return {
    taskId,
    title: '',
    status: 'Pending',
    lastRunDate: undefined,
  }
}

export function MicroTasksTable() {
  const [rows, setRows] = useState<MicroTaskItem[]>([])
  const [loading, setLoading] = useState(true)

  const loadRows = async (activeRef: { current: boolean }) => {
    setLoading(true)
    try {
      const data = await db.micro_tasks.toArray()
      if (activeRef.current) {
        setRows(data)
      }
    } catch (err) {
      console.error('Failed to load micro tasks:', err)
      if (activeRef.current) {
        setRows([])
      }
    } finally {
      if (activeRef.current) {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    const activeRef = { current: true }
    loadRows(activeRef)

    const onChange = () => {
      loadRows(activeRef)
    }

    db.micro_tasks.hook('creating', onChange)
    db.micro_tasks.hook('updating', onChange)
    db.micro_tasks.hook('deleting', onChange)

    return () => {
      activeRef.current = false
      db.micro_tasks.hook('creating').unsubscribe(onChange)
      db.micro_tasks.hook('updating').unsubscribe(onChange)
      db.micro_tasks.hook('deleting').unsubscribe(onChange)
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
              <option value="Pending">Pending</option>
              <option value="Doing">Doing</option>
              <option value="Done">Done</option>
            </select>
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
          <h2 className="text-xl font-bold">Micro Tasks</h2>
          <p className="text-sm text-gray-600">小型任務快速完成</p>
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

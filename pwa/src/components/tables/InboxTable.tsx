import { useMemo, useState, useEffect } from 'react'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { applyChange, db } from '../../db/index'
import type { InboxItem } from '../../db/schema'
import Utils from '../../../../gas/src/Utils'
import {
  formatToDateTimeLocal,
  parseFromDateTimeLocal,
} from '../../utils/timeUtils'
import { useResponsiveTable } from '../../hooks/useResponsiveTable'
import { TableCard } from '../TableCard'
import { EditDialog, type FieldType } from '../EditDialog'

const DEV_CLIENT_ID = 'dev-client'
const columnHelper = createColumnHelper<InboxItem>()

function createNewInboxRow(): InboxItem {
  const taskId = Utils.generateId('I')
  return {
    taskId,
    title: '',
    receivedAt: Date.now(),
  }
}

export function InboxTable() {
  const [rows, setRows] = useState<InboxItem[]>([])
  const [loading, setLoading] = useState(true)
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({
    taskId: false,
  })
  const { isMobile } = useResponsiveTable()
  const [editingItem, setEditingItem] = useState<InboxItem | null>(null)

  // 初始載入（不自動更新）
  useEffect(() => {
    let active = true
    db.inbox
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
        console.error('Failed to load inbox:', err)
        if (active) {
          setRows([])
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [])

  const updateLocalRow = (taskId: string, patch: Partial<InboxItem>) => {
    setRows((prev) =>
      prev.map((row) =>
        row.taskId === taskId ? { ...row, ...patch } : row
      )
    )
  }

  const saveUpdate = async (taskId: string, patch: Partial<InboxItem>) => {
    await applyChange({
      table: 'inbox',
      recordId: taskId,
      op: 'update',
      patch: patch as Record<string, unknown>,
      clientId: DEV_CLIENT_ID,
    }).catch((err) => console.error('Failed to save update:', err))
  }

  const addRow = async () => {
    const newRow = createNewInboxRow()
    setRows((prev) => [newRow, ...prev])

    await applyChange({
      table: 'inbox',
      recordId: newRow.taskId,
      op: 'add',
      patch: newRow as unknown as Record<string, unknown>,
      clientId: DEV_CLIENT_ID,
    }).catch((err) => console.error('Failed to add row:', err))
  }

  const deleteRow = async (taskId: string) => {
    setRows((prev) => prev.filter((row) => row.taskId !== taskId))

    await applyChange({
      table: 'inbox',
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
      receivedAt: parseFromDateTimeLocal(data.receivedAt),
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
      columnHelper.accessor('receivedAt', {
        header: 'Received At',
        cell: (info) => {
          const taskId = info.row.original.taskId
          const rawValue = info.getValue()
          const value = formatToDateTimeLocal(rawValue)

          return (
            <input
              className="w-full px-2 py-1 border rounded focus:outline-none focus:border-blue-500"
              type="datetime-local"
              value={value}
              onChange={(event) => {
                const nextValue = parseFromDateTimeLocal(event.target.value)
                updateLocalRow(taskId, { receivedAt: nextValue })
              }}
              onBlur={(event) => {
                const nextValue = parseFromDateTimeLocal(event.target.value)
                saveUpdate(taskId, { receivedAt: nextValue })
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
    state: {
      columnVisibility,
    },
    onColumnVisibilityChange: setColumnVisibility,
  })

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-bold">Inbox</h2>
          <p className="text-sm text-gray-600">新增想法與待辦項目</p>
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
                  {
                    label: 'Received At',
                    value: item.receivedAt
                      ? new Date(item.receivedAt).toLocaleString('zh-TW')
                      : '(未設定)',
                  },
                ]}
                onEdit={setEditingItem}
                onDelete={(item) => deleteRow(item.taskId)}
              />
            ))}
          </div>

          <EditDialog
            isOpen={!!editingItem}
            title="編輯 Inbox 項目"
            item={editingItem}
            fields={[
              {
                name: 'title',
                label: 'Title',
                type: 'text' as FieldType,
                placeholder: '輸入任務標題',
              },
              {
                name: 'receivedAt',
                label: 'Received At',
                type: 'datetime' as FieldType,
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
    </div>
  )
}

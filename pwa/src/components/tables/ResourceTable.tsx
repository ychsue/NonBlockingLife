import { useMemo, useState, useEffect } from 'react'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { applyChange, db } from '../../db/index'
import type { ResourceItem } from '../../db/schema'
import Utils from '../../../../gas/src/Utils'
import {
  formatToDateTimeLocal,
  parseFromDateTimeLocal,
} from '../../utils/timeUtils'
import { useResponsiveTable } from '../../hooks/useResponsiveTable'
import { useAppStore } from '../../store/appStore'
import { TableCard } from '../TableCard'
import { EditDialog, type FieldType } from '../EditDialog'
import { TableHelpDialog } from '../TableHelpDialog'
import { useSearchFilter } from '../../hooks/useSearchFilter'
import resourceHelpMarkdown from './ResourceHelp.md?raw'

const DEV_CLIENT_ID = 'dev-client'
const columnHelper = createColumnHelper<ResourceItem>()

function createNewResourceRow(): ResourceItem {
  const taskId = Utils.generateId('R')
  return {
    taskId,
    title: '',
    category: '',
    receivedAt: Date.now(),
    url: '',
    note: '',
  }
}

export function ResourceTable() {
  const [rows, setRows] = useState<ResourceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showHelp, setShowHelp] = useState(false)
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({
    taskId: false,
  })
  const { isMobile } = useResponsiveTable()
  const [editingItem, setEditingItem] = useState<ResourceItem | null>(null)
  
  // 搜尋狀態
  const [searchQuery, setSearchQuery] = useState('')
  const [isOrMode, setIsOrMode] = useState(true)

  const currentSheet = useAppStore((state) => state.currentSheet)
  const pendingEditIntent = useAppStore((state) => state.pendingEditIntent)
  const clearPendingEditIntent = useAppStore((state) => state.clearPendingEditIntent)

  // 初始載入
  useEffect(() => {
    let active = true
    db.resource
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
        console.error('Failed to load resource:', err)
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
    if (!pendingEditIntent || pendingEditIntent.sheet !== 'resource') return
    if (currentSheet !== 'resource') return

    const targetRow = rows.find((row) => row.taskId === pendingEditIntent.taskId)
    if (!targetRow) return

    setEditingItem(targetRow)
    clearPendingEditIntent()
  }, [rows, pendingEditIntent, currentSheet, clearPendingEditIntent])

  const updateLocalRow = (
    taskId: string,
    patch: Partial<ResourceItem>
  ) => {
    setRows((prev) =>
      prev.map((row) =>
        row.taskId === taskId ? { ...row, ...patch } : row
      )
    )
  }

  const saveUpdate = async (
    taskId: string,
    patch: Partial<ResourceItem>
  ) => {
    await applyChange({
      table: 'resource',
      recordId: taskId,
      op: 'update',
      patch: patch as Record<string, unknown>,
      clientId: DEV_CLIENT_ID,
    }).catch((err) => console.error('Failed to save update:', err))
  }

  const addRow = async () => {
    const newRow = createNewResourceRow()
    setRows((prev) => [newRow, ...prev])

    await applyChange({
      table: 'resource',
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
      table: 'resource',
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
      category: data.category,
      receivedAt: data.receivedAt ? parseFromDateTimeLocal(data.receivedAt) : Date.now(),
      url: data.url,
      note: data.note,
    }

    updateLocalRow(editingItem.taskId, patch)
    await saveUpdate(editingItem.taskId, patch)
    setEditingItem(null)
  }

  // 搜尋過濾
  const filteredRows = useSearchFilter(
    rows,
    { query: searchQuery, isOrMode },
    ['title', 'category', 'note', 'url'] as (keyof ResourceItem)[]
  )

  const columns = useMemo(
    () => [
      columnHelper.accessor('taskId', {
        header: 'Resource ID',
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
      columnHelper.accessor('category', {
        header: 'Category',
        cell: (info) => {
          const taskId = info.row.original.taskId
          const value = info.getValue() ?? ''

          return (
            <input
              className="w-full px-2 py-1 border rounded focus:outline-none focus:border-blue-500"
              value={value}
              onChange={(event) =>
                updateLocalRow(taskId, { category: event.target.value })
              }
              onBlur={(event) =>
                saveUpdate(taskId, { category: event.target.value })
              }
              placeholder="e.g., Tutorial, Reference"
            />
          )
        },
      }),
      columnHelper.accessor('receivedAt', {
        header: 'Received',
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
              placeholder="Additional notes"
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
          <h2 className="text-xl font-bold">Resources</h2>
          <p className="text-sm text-gray-600">外部參考資源庫</p>
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

      {/* 搜尋欄 */}
      <div className="mb-4 flex gap-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="搜尋 Title、Category、Note、URL..."
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
      </div>

      {loading ? (
        <div className="text-center text-gray-500">Loading...</div>
      ) : filteredRows.length === 0 ? (
        <div className="text-center text-gray-500">
          {rows.length === 0 ? 'No resources yet.' : 'No matching resources.'}
        </div>
      ) : isMobile ? (
        // 移動視圖 - 卡片
        <>
          <div className="grid grid-cols-1 gap-3">
            {filteredRows.map((item) => (
              <TableCard
                key={item.taskId}
                item={item}
                fields={[
                    {label: 'Title', value: item.title ?? '(Untitled)'},
                    {label: 'Category', value: item.category ?? '(No category)'},
                    {label: 'Received', value: item.receivedAt ? new Date(item.receivedAt).toLocaleString() : '(No date)'},
                    {label: 'Note', value: item.note ?? '(No note)'},
                ]}
                onEdit={setEditingItem}
                onDelete={(item)=> deleteRow(item.taskId)}
                />
            ))}
          </div>

          <EditDialog
            isOpen={!!editingItem}
            title="編輯資源"
            item={editingItem}
            fields={[
              {
                name: 'title',
                label: 'Title',
                type: 'text' as FieldType,
                placeholder: '輸入資源標題',
              },
              {
                name: 'category',
                label: 'Category',
                type: 'text' as FieldType,
                placeholder: '例如: Tutorial, Reference',
              },
              {
                name: 'receivedAt',
                label: 'Received At',
                type: 'datetime' as FieldType,
              },
              {
                name: 'url',
                label: 'URL',
                type: 'text' as FieldType,
                placeholder: 'https://...',
              },
              {
                name: 'note',
                label: 'Note',
                type: 'text' as FieldType,
                placeholder: '添加備註',
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
            <thead className="bg-gray-100">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="p-2 text-left border-b border-gray-200 font-semibold"
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
                  onClick={() => setEditingItem(row.original)}
                  className="border-b border-gray-200 hover:bg-gray-50 cursor-pointer"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="p-2">
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
        title="Resources 使用說明"
        markdown={resourceHelpMarkdown}
        onClose={() => setShowHelp(false)}
      />
    </div>
  )
}

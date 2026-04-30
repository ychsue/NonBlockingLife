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
import { useT } from '../../i18n'
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
  const t = useT()
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
  const text = {
    subtitle: t('table.resource.subtitle'),
    help: t('table.help'),
    searchPlaceholder: t('table.resource.searchPlaceholder'),
    open: t('table.open'),
    editTitle: t('table.resource.editTitle'),
    titlePlaceholder: t('table.resource.titlePlaceholder'),
    categoryPlaceholder: t('table.resource.categoryPlaceholder'),
    notePlaceholder: t('table.resource.notePlaceholder'),
    loading: t('table.loading'),
    helpTitle: t('table.resource.helpTitle'),
  }

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
        header: t('table.resource.col.resourceId'),
        cell: (info) => (
          <span className="text-xs text-gray-500">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor('title', {
        header: t('table.resource.col.title'),
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
        header: t('table.resource.col.category'),
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
              placeholder={text.categoryPlaceholder}
            />
          )
        },
      }),
      columnHelper.accessor('receivedAt', {
        header: t('table.resource.col.received'),
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
        header: t('table.resource.col.note'),
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
              placeholder={text.notePlaceholder}
            />
          )
        },
      }),
      columnHelper.accessor('url', {
        header: t('table.resource.col.url'),
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
      columnHelper.display({
        id: 'actions',
        header: t('table.resource.col.actions'),
        cell: (info) => (
          <button
            onClick={() => deleteRow(info.row.original.taskId)}
            className="px-2 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
          >
            {t('table.resource.col.delete')}
          </button>
        ),
      }),
    ],
    [t]
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
      </div>

      {loading ? (
        <div className="text-center text-gray-500">{text.loading}</div>
      ) : filteredRows.length === 0 ? (
        <div className="text-center text-gray-500">
          {rows.length === 0 ? t('table.resource.empty') : t('table.resource.noMatch')}
        </div>
      ) : isMobile ? (
        // 移動視圖 - 卡片
        <div className="grid grid-cols-1 gap-3">
          {filteredRows.map((item) => (
              <TableCard
                key={item.taskId}
                item={item}
                fields={[
                  {label: t('col.title'), value: item.title ?? t('card.untitled')},
                  {label: t('card.category'), value: item.category ?? t('card.noCategory')},
                  {label: t('card.received'), value: item.receivedAt ? new Date(item.receivedAt).toLocaleString() : t('card.noDate')},
                  {label: t('card.note'), value: item.note ?? t('card.noNote')},
                ]}
                onEdit={setEditingItem}
                onDelete={(item)=> deleteRow(item.taskId)}
                />
            ))}
        </div>
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

      <EditDialog
        isOpen={!!editingItem}
        title={text.editTitle}
        item={editingItem}
        fields={[
          {
            name: 'title',
            label: t('table.resource.field.title'),
            type: 'text' as FieldType,
            placeholder: text.titlePlaceholder,
          },
          {
            name: 'category',
            label: t('table.resource.field.category'),
            type: 'text' as FieldType,
            placeholder: text.categoryPlaceholder,
          },
          {
            name: 'receivedAt',
            label: t('table.resource.field.receivedAt'),
            type: 'datetime' as FieldType,
          },
          {
            name: 'url',
            label: t('table.resource.field.url'),
            type: 'text' as FieldType,
            placeholder: 'https://...',
          },
          {
            name: 'note',
            label: t('table.resource.field.note'),
            type: 'text' as FieldType,
            placeholder: text.notePlaceholder,
          },
        ]}
        onSave={handleEditSave}
        onClose={() => setEditingItem(null)}
      />

      <TableHelpDialog
        isOpen={showHelp}
        title={text.helpTitle}
        markdown={resourceHelpMarkdown}
        onClose={() => setShowHelp(false)}
      />
    </div>
  )
}

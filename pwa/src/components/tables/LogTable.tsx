import { useMemo, useState, useEffect } from 'react'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { db } from '../../db/index'
import type { LogEntry } from '../../db/schema'
import { clearLogTableChanges } from '../../db/changeLog'

const columnHelper = createColumnHelper<LogEntry>()

export function LogTable() {
  const [rows, setRows] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [clearing, setClearing] = useState(false)
  const [daysFilter, setDaysFilter] = useState(7) // 默認顯示最近 7 天
  const [searchText, setSearchText] = useState('')

  const handleClearChangelog = async () => {
    if (!confirm('確定要清除所有 Log 相關的 change_log 記錄嗎？')) {
      return
    }
    
    setClearing(true)
    try {
      const count = await clearLogTableChanges()
      alert(`已清除 ${count} 筆 Log change_log 記錄`)
    } catch (err) {
      console.error('Failed to clear log changes:', err)
      alert('清除失敗，請查看 console')
    } finally {
      setClearing(false)
    }
  }

  useEffect(() => {
    let active = true
    const cutoffTime = Date.now() - daysFilter * 24 * 60 * 60 * 1000
    
    db.log
      .where('timestamp')
      .above(cutoffTime)
      .toArray()
      .then((data) => {
        if (active) {
          let filtered = data
          
          // 搜索過濾
          if (searchText.trim()) {
            const search = searchText.toLowerCase()
            filtered = filtered.filter(
              (item) =>
                item.title?.toLowerCase().includes(search) ||
                item.taskId?.toLowerCase().includes(search) ||
                item.action?.toLowerCase().includes(search) ||
                item.notes?.toLowerCase().includes(search) ||
                item.category?.toLowerCase().includes(search)
            )
          }
          
          const sorted = filtered.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
          setRows(sorted)
          setLoading(false)
        }
      })
      .catch((err) => {
        console.error('Failed to load log:', err)
        if (active) {
          setRows([])
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [daysFilter, searchText])

  const columns = useMemo(
    () => [
      columnHelper.accessor('timestamp', {
        header: 'Time',
        cell: (info) => {
          const value = info.getValue()
          if (!value) return ''
          return new Date(value).toLocaleString('zh-TW')
        },
      }),
      columnHelper.accessor('taskId', {
        header: 'Task ID',
        cell: (info) => (
          <span className="text-xs text-gray-500">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor('title', {
        header: 'Title',
      }),
      columnHelper.accessor('action', {
        header: 'Action',
        cell: (info) => (
          <span className="font-semibold">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor('category', {
        header: 'Source',
      }),
      columnHelper.accessor('duration', {
        header: 'Duration (m)',
        cell: (info) => (info.getValue() ?? ''),
      }),
      columnHelper.accessor('notes', {
        header: 'Notes',
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
      <div className="mb-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">共 {rows.length} 筆記錄</div>
          <button
            onClick={handleClearChangelog}
            disabled={clearing}
            className="px-3 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {clearing ? '清除中...' : '清除 Log ChangeLog'}
          </button>
        </div>
        
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">顯示最近：</label>
            <select
              value={daysFilter}
              onChange={(e) => setDaysFilter(Number(e.target.value))}
              className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={1}>1 天</option>
              <option value={3}>3 天</option>
              <option value={7}>7 天</option>
              <option value={14}>14 天</option>
              <option value={30}>30 天</option>
              <option value={90}>90 天</option>
            </select>
          </div>
          
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <label className="text-sm text-gray-600">搜索：</label>
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="標題、任務ID、動作、備註..."
              className="flex-1 px-3 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchText && (
              <button
                onClick={() => setSearchText('')}
                className="text-gray-400 hover:text-gray-600"
                title="清除搜索"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>
      {rows.length === 0 ? (
        <div className="p-4 text-center text-gray-500">暫無紀錄</div>
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
                <tr key={row.id} className="border-b border-gray-200">
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
    </div>
  )
}

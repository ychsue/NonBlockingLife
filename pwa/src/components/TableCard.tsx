import React from 'react'

interface TableCardProps<T> {
  item: T
  fields: Array<{
    label: string
    value: React.ReactNode
  }>
  onEdit: (item: T) => void
  onDelete: (item: T) => void
}

export function TableCard<T extends { taskId?: string | number }>({
  item,
  fields,
  onEdit,
  onDelete,
}: TableCardProps<T>) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="space-y-3">
        {fields.map((field, index) => (
          <div key={index} className="flex justify-between items-start gap-2">
            <span className="text-sm font-medium text-gray-600">{field.label}</span>
            <span className="text-sm text-gray-900 text-right flex-1">{field.value}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 flex gap-2 justify-end">
        <button
          onClick={() => onEdit(item)}
          className="px-3 py-1.5 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors"
        >
          編輯
        </button>
        <button
          onClick={() => onDelete(item)}
          className="px-3 py-1.5 text-sm bg-red-500 hover:bg-red-600 text-white rounded-md transition-colors"
        >
          刪除
        </button>
      </div>
    </div>
  )
}

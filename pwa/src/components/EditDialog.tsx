import React, { useState, useEffect } from 'react'

export type FieldType = 'text' | 'number' | 'datetime' | 'select'

interface DialogField {
  name: string
  label: string
  type: FieldType
  value?: string | number | boolean
  required?: boolean
  options?: Array<{ label: string; value: string | number }>
  placeholder?: string
  min?: number
  max?: number
}

interface EditDialogProps<T> {
  isOpen: boolean
  title: string
  item: T | null
  fields: DialogField[]
  onSave: (data: Record<string, any>) => Promise<void>
  onClose: () => void
}

export function EditDialog<T>({
  isOpen,
  title,
  item,
  fields,
  onSave,
  onClose,
}: EditDialogProps<T>) {
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (item) {
      const initialData: Record<string, any> = {}
      fields.forEach((field) => {
        initialData[field.name] = item[field.name as keyof T] ?? field.value ?? ''
      })
      setFormData(initialData)
      setError(null)
    }
  }, [item, fields])

  if (!isOpen || !item) return null

  const handleChange = (name: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSave = async () => {
    try {
      setIsSaving(true)
      setError(null)
      await onSave(formData)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失敗')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center items-center bg-black/50" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-md rounded-t-lg sm:rounded-lg p-6 shadow-lg max-h-[90vh] sm:max-h-[80vh] flex flex-col overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold mb-4 flex-shrink-0">{title}</h2>

        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded text-sm flex-shrink-0">{error}</div>}

        <div className="space-y-4 mb-6 flex-1 overflow-y-auto pr-2">
          {fields.map((field) => (
            <div key={field.name}>
              <label htmlFor={field.name} className="block text-sm font-medium text-gray-700 mb-1">
                {field.label}
              </label>

              {field.type === 'select' ? (
                <select
                  id={field.name}
                  value={formData[field.name] ?? ''}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">選擇 {field.label}</option>
                  {field.options?.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : field.type === 'datetime' ? (
                <input
                  id={field.name}
                  type="datetime-local"
                  value={formData[field.name] ?? ''}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : field.type === 'number' ? (
                <input
                  id={field.name}
                  type="number"
                  value={formData[field.name] ?? ''}
                  onChange={(e) => handleChange(field.name, e.target.value ? Number(e.target.value) : '')}
                  min={field.min}
                  max={field.max}
                  placeholder={field.placeholder}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <textarea
                  id={field.name}
                  value={formData[field.name] ?? ''}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                  placeholder={field.placeholder}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-3 justify-end flex-shrink-0 pt-4 border-t">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors disabled:opacity-50"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors disabled:opacity-50"
          >
            {isSaving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  )
}

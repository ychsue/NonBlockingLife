import React, { useState, useEffect } from 'react'
import { formatToDateTimeLocal } from '../utils/timeUtils'
import { useT } from '../i18n'
import { buildCronExpr, getCronParts, getUpcomingOccurrences } from '../utils/cronUtils'
import {
  handleDialogActionTouchEnd,
  handleDialogTextFieldInteractionEnd,
  resetDialogTextInteractionState,
} from '../utils/dialogInteractionUtils'

export type FieldType = 'text' | 'number' | 'datetime' | 'select' | 'cron'

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
  footerLeft?: React.ReactNode
}

export function EditDialog<T>({
  isOpen,
  title,
  item,
  fields,
  onSave,
  onClose,
  footerLeft,
}: EditDialogProps<T>) {
  const t = useT()
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [openCronPreviewField, setOpenCronPreviewField] = useState<string | null>(null)

  useEffect(() => {
    if (item) {
      const initialData: Record<string, any> = {}
      fields.forEach((field) => {
        initialData[field.name] = item[field.name as keyof T] ?? field.value ?? ''
      })
      setFormData(initialData)
      setError(null)
      setOpenCronPreviewField(null)
    }
  }, [item, fields])

  useEffect(() => {
    if (!isOpen) {
      resetDialogTextInteractionState()
    }

    return () => {
      resetDialogTextInteractionState()
    }
  }, [isOpen])

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
      setError(err instanceof Error ? err.message : t('dialog.saveFailed'))
    } finally {
      setIsSaving(false)
    }
  }

  const renderCronField = (field: DialogField) => {
    const cronExpr = String(formData[field.name] ?? '')
    const [minute, hour, day, month, weekday] = getCronParts(cronExpr)
    const parts = [minute, hour, day, month, weekday]
    const previewRuns = openCronPreviewField === field.name ? getUpcomingOccurrences(buildCronExpr(parts)) : []

    const updateCronPart = (index: number, value: string) => {
      const nextParts = [...parts]
      nextParts[index] = value
      handleChange(field.name, buildCronExpr(nextParts))
    }

    const labels = [
      t('table.scheduled.cronMinute'),
      t('table.scheduled.cronHour'),
      t('table.scheduled.cronDay'),
      t('table.scheduled.cronMonth'),
      t('table.scheduled.cronWeekday'),
    ]

    const placeholders = ['0', '9', '*', '*', '*']

    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {parts.map((value, index) => (
            <div key={`${field.name}-${labels[index]}`}>
              <div className="mb-1 text-xs text-gray-500">{labels[index]}</div>
              <input
                id={index === 0 ? field.name : undefined}
                value={value}
                placeholder={placeholders[index]}
                onChange={(e) => updateCronPart(index, e.target.value)}
                className="w-full min-w-0 px-3 py-2 border border-gray-300 rounded-md font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOpenCronPreviewField((prev) => (prev === field.name ? null : field.name))}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-100"
          >
            {t('table.scheduled.previewButton')}
          </button>
          <div className="min-w-0 font-mono text-xs text-gray-500">{buildCronExpr(parts)}</div>
        </div>

        {openCronPreviewField === field.name && (
          <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
            <div className="mb-2 text-sm font-medium text-gray-800">{t('table.scheduled.previewTitle')}</div>
            {previewRuns.length === 0 ? (
              <div className="text-sm text-red-600">{t('table.scheduled.previewEmpty')}</div>
            ) : (
              <>
                <div className="mb-2 text-xs text-gray-500">
                  {t('table.scheduled.previewCount', { n: previewRuns.length })}
                </div>
                <ol className="max-h-56 list-decimal overflow-y-auto pl-5 text-sm text-gray-800 space-y-1">
                  {previewRuns.map((run) => (
                    <li key={run}>{new Date(run).toLocaleString()}</li>
                  ))}
                </ol>
              </>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center items-center bg-black/50 pointer-events-auto" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-md rounded-t-lg sm:rounded-lg p-6 shadow-lg max-h-[90vh] sm:max-h-[80vh] flex flex-col overflow-y-auto overflow-x-hidden pointer-events-auto" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold mb-4 flex-shrink-0">{title}</h2>

        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded text-sm flex-shrink-0">{error}</div>}

        <div className="space-y-4 mb-6 flex-1 overflow-y-auto overflow-x-hidden pr-2">
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
                  <option value="">{t('dialog.select')} {field.label}</option>
                  {field.options?.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : field.type === 'cron' ? (
                renderCronField(field)
              ) : field.type === 'datetime' ? (
                <input
                  id={field.name}
                  type="datetime-local"
                  value={typeof formData[field.name] === "number" ? formatToDateTimeLocal(formData[field.name]) : formData[field.name] ?? ''}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                  className="w-full min-w-0 max-w-full box-border px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  onBlur={handleDialogTextFieldInteractionEnd}
                  onTouchEnd={handleDialogTextFieldInteractionEnd}
                  placeholder={field.placeholder}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3 flex-shrink-0 pt-4 border-t">
          <div className="flex items-center gap-2">{footerLeft}</div>
          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              onTouchEnd={(event) => handleDialogActionTouchEnd(event, onClose)}
              disabled={isSaving}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors disabled:opacity-50"
            >
              {t('dialog.cancel')}
            </button>
            <button
              onClick={handleSave}
              onTouchEnd={(event) => handleDialogActionTouchEnd(event, handleSave)}
              disabled={isSaving}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors disabled:opacity-50"
            >
              {isSaving ? t('dialog.saving') : t('dialog.save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

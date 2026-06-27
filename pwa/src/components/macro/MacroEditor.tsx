import { useEffect, useMemo, useState } from 'react'
import type { MacroItem } from '../../db/schema'
import { parseMacroYaml } from '../../macro/parser'

interface MacroEditorProps {
  isOpen: boolean
  macro: MacroItem | null
  onClose: () => void
  onSave: (patch: { name: string; description: string; commands: string }) => Promise<void>
}

export function MacroEditor({ isOpen, macro, onClose, onSave }: MacroEditorProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [commands, setCommands] = useState('')
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!isOpen || !macro) return
    setName(macro.name ?? '')
    setDescription(macro.description ?? '')
    setCommands(macro.commands ?? '')
    setError('')
  }, [isOpen, macro?.taskId])

  const validationError = useMemo(() => {
    if (!commands.trim()) {
      return 'Commands YAML is required.'
    }

    try {
      parseMacroYaml(commands)
      return ''
    } catch (err) {
      return err instanceof Error ? err.message : String(err)
    }
  }, [commands])

  if (!isOpen || !macro) return null

  const handleSave = async () => {
    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('Macro name is required.')
      return
    }

    if (validationError) {
      setError(validationError)
      return
    }

    setError('')
    setIsSaving(true)
    try {
      await onSave({
        name: trimmedName,
        description: description.trim(),
        commands,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="w-full max-w-3xl rounded-lg bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800">Edit Macro</h3>
          <button onClick={onClose} className="rounded px-2 py-1 text-gray-500 hover:bg-gray-100">
            Close
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              placeholder="Macro name"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              placeholder="What this macro does"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Commands (YAML)</label>
            <textarea
              value={commands}
              onChange={(e) => setCommands(e.target.value)}
              rows={12}
              className="w-full rounded border border-gray-300 px-3 py-2 font-mono text-sm focus:border-blue-500 focus:outline-none"
              placeholder="- command: inputDialog"
            />
            {validationError ? (
              <p className="mt-2 text-sm text-red-600">YAML validation: {validationError}</p>
            ) : (
              <p className="mt-2 text-sm text-emerald-600">YAML validation: OK</p>
            )}
          </div>
        </div>

        {error && <div className="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50" disabled={isSaving}>
            Cancel
          </button>
          <button
            onClick={() => void handleSave()}
            disabled={isSaving}
            className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

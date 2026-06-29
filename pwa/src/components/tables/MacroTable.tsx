import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { db, type MacroExecution, type MacroItem } from '../../db/schema'
import { applyChange } from '../../db/changeLog'
import { useResponsiveTable } from '../../hooks/useResponsiveTable'
import { TableCard } from '../TableCard'
import { MacroEditor } from '../macro/MacroEditor'
import { MacroHelp } from '../macro/MacroHelp'
import {
  abortMacro,
  retryCurrent,
  runNextCommand,
  runUntilPauseOrComplete,
  skipCurrent,
  type MacroDefinition,
  type MacroExecutorDeps,
} from '../../macro/executor'
import type { ParsedMacroCommand } from '../../macro/parser'
import { interpolateTemplate } from '../../macro/interpolate'
import { logError, logInfo, logWarn } from '../../utils/logger'

const DEV_CLIENT_ID = 'dev-macro-table'
const RESERVED_INPUT_KEYS = new Set(['command', 'iTitle', 'table'])

type InputRequest = {
  title: string
  fieldKey: string
  fieldLabel: string
  fieldType: 'text' | 'number'
  initialValue: string
}

function createNewMacro(taskId?: string): MacroItem {
  const now = Date.now()
  const id = taskId ?? `M_${now}`
  return {
    taskId: id,
    name: 'New Macro',
    description: '',
    commands:
      '- command: inputDialog\n' +
      '  iTitle: Please enter hymn number\n' +
      '  whichOne:\n' +
      '    type: number\n' +
      '    label: Hymn number\n' +
      '- command: add_inbox\n' +
      '  iTitle: Add task to inbox\n' +
      '  title: Play hymn {{whichOne}}\n' +
      '  url: https://www.hymnal.net/en/hymn/ch/{{whichOne}}\n',
    createdAt: now,
    updatedAt: now,
  }
}

function formatTime(ts?: number): string {
  if (!ts) return '-'
  return new Date(ts).toLocaleString()
}

function truncate(text: string, max = 72): string {
  if (text.length <= max) return text
  return `${text.slice(0, max)}...`
}

async function saveMacroPatch(taskId: string, patch: Partial<MacroItem>) {
  await applyChange({
    table: 'macro',
    recordId: taskId,
    op: 'update',
    patch,
    clientId: DEV_CLIENT_ID,
  })
}

export function MacroTable() {
  const { isMobile } = useResponsiveTable()
  const [rows, setRows] = useState<MacroItem[]>([])
  const [executionMap, setExecutionMap] = useState<Record<string, MacroExecution>>({})
  const [editingItem, setEditingItem] = useState<MacroItem | null>(null)
  const [selectedMacroId, setSelectedMacroId] = useState<string | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [message, setMessage] = useState('')
  const [inputRequest, setInputRequest] = useState<InputRequest | null>(null)
  const [inputValue, setInputValue] = useState('')
  const inputResolverRef = useRef<{
    resolve: (value: string) => void
    reject: (error: Error) => void
  } | null>(null)

  const selectedMacro = useMemo(
    () => rows.find((row) => row.taskId === selectedMacroId) ?? null,
    [rows, selectedMacroId]
  )

  const selectedExecution = selectedMacroId ? executionMap[selectedMacroId] : undefined

  const requestInput = useCallback((request: InputRequest): Promise<string> => {
    setInputRequest(request)
    setInputValue(request.initialValue)
    return new Promise((resolve, reject) => {
      inputResolverRef.current = { resolve, reject }
    })
  }, [])

  const clearInputRequest = useCallback(() => {
    setInputRequest(null)
    setInputValue('')
    inputResolverRef.current = null
  }, [])

  const macroDeps = useMemo<MacroExecutorDeps>(() => {
    return {
      async handleInputDialog(command: ParsedMacroCommand, context: Record<string, unknown>) {
        const fields = Object.entries(command.raw).filter(([key, value]) => {
          if (RESERVED_INPUT_KEYS.has(key)) return false
          return value !== null && typeof value === 'object'
        })

        if (fields.length === 0) {
          throw new Error(`No input field definition found in command at index ${command.index}`)
        }

        let nextContext = { ...context }

        for (const [fieldKey, fieldDef] of fields) {
          const fieldType =
            fieldDef && typeof fieldDef === 'object' && (fieldDef as Record<string, unknown>).type === 'number'
              ? 'number'
              : 'text'
          const fieldLabel =
            fieldDef && typeof fieldDef === 'object' && typeof (fieldDef as Record<string, unknown>).label === 'string'
              ? String((fieldDef as Record<string, unknown>).label)
              : fieldKey
          const rawTitle =
            typeof command.raw.iTitle === 'string' && command.raw.iTitle.trim().length > 0
              ? command.raw.iTitle
              : `Input for ${fieldLabel}`
          const title = interpolateTemplate(rawTitle, nextContext)
          const existingValue = nextContext[fieldKey]
          const initialValue = existingValue === undefined || existingValue === null ? '' : String(existingValue)

          const rawInput = await requestInput({
            title,
            fieldKey,
            fieldLabel,
            fieldType,
            initialValue,
          })

          if (fieldType === 'number') {
            const numeric = Number(rawInput)
            if (!Number.isFinite(numeric)) {
              throw new Error(`Input '${fieldLabel}' must be a valid number`)
            }
            nextContext = { ...nextContext, [fieldKey]: numeric }
          } else {
            nextContext = { ...nextContext, [fieldKey]: rawInput }
          }
        }

        return nextContext
      },
    }
  }, [requestInput])

  const loadRows = async () => {
    const data = await db.macro.toArray()
    data.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
    setRows(data)
  }

  const loadExecution = async () => {
    const data = await db.macro_execution.toArray()
    const map: Record<string, MacroExecution> = {}
    for (const item of data) {
      map[item.macroId] = item
    }
    setExecutionMap(map)
  }

  useEffect(() => {
    void loadRows()
    void loadExecution()

    const timer = window.setInterval(() => {
      void loadExecution()
    }, 2000)

    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    return () => {
      if (inputResolverRef.current) {
        inputResolverRef.current.reject(new Error('Input dialog dismissed'))
      }
      inputResolverRef.current = null
    }
  }, [])

  const addRow = async () => {
    const newRow = createNewMacro()
    await applyChange({
      table: 'macro',
      recordId: newRow.taskId,
      op: 'add',
      patch: { ...newRow },
      clientId: DEV_CLIENT_ID,
    })
    await loadRows()
    setEditingItem(newRow)
    setSelectedMacroId(newRow.taskId)
  }

  const deleteRow = async (item: MacroItem) => {
    await applyChange({
      table: 'macro',
      recordId: item.taskId,
      op: 'delete',
      patch: {},
      clientId: DEV_CLIENT_ID,
    })
    await db.macro_execution.delete(item.taskId)

    if (selectedMacroId === item.taskId) {
      setSelectedMacroId(null)
    }

    await loadRows()
    await loadExecution()
  }

  const handleSave = async (patchInput: { name: string; description: string; commands: string }) => {
    if (!editingItem) return
    const commandsText = patchInput.commands

    const patch: Partial<MacroItem> = {
      name: patchInput.name,
      description: patchInput.description,
      commands: commandsText,
      updatedAt: Date.now(),
    }

    if (!patch.name) {
      throw new Error('Macro name is required')
    }

    if (!commandsText.trim()) {
      throw new Error('Macro commands YAML is required')
    }

    await saveMacroPatch(editingItem.taskId, patch)
    await loadRows()
    await loadExecution()
  }

  const buildDefinition = (item: MacroItem): MacroDefinition => ({
    taskId: item.taskId,
    commands: item.commands,
  })

  const runMacro = async (item: MacroItem, mode: 'normal' | 'continue' | 'retry' | 'skip' | 'abort') => {
    setIsRunning(true)
    setMessage('')
    setSelectedMacroId(item.taskId)

    try {
      const definition = buildDefinition(item)
      await logInfo('macro', 'Macro run started', { macroId: item.taskId, mode })

      if (mode === 'retry') {
        const result = await retryCurrent(definition, macroDeps)
        setMessage(`Retry result: ${result.status} (index ${result.commandIndex})`)
        await logInfo('macro', 'Macro retry finished', { macroId: item.taskId, status: result.status, commandIndex: result.commandIndex })
      } else if (mode === 'skip') {
        const result = await skipCurrent(definition)
        setMessage(`Skip result: ${result.status} (index ${result.commandIndex})`)
        await logWarn('macro', 'Macro command skipped', { macroId: item.taskId, status: result.status, commandIndex: result.commandIndex })
      } else if (mode === 'abort') {
        await abortMacro(definition)
        setMessage('Macro aborted')
        await logWarn('macro', 'Macro aborted', { macroId: item.taskId })
      } else if (mode === 'continue') {
        const result = await runUntilPauseOrComplete(definition, macroDeps)
        setMessage(`Continue result: ${result.status} (index ${result.commandIndex})`)
        await logInfo('macro', 'Macro continue finished', { macroId: item.taskId, status: result.status, commandIndex: result.commandIndex })
      } else {
        // Run means rerun from beginning; Continue keeps current cursor.
        await db.macro_execution.put({
          macroId: definition.taskId,
          status: 'idle',
          commandIndex: 0,
          context: {},
          lastError: '',
          lockOwner: '',
          lockExpiresAt: 0,
          updatedAt: Date.now(),
        })
        const result = await runUntilPauseOrComplete(definition, macroDeps)
        setMessage(`Run result: ${result.status} (index ${result.commandIndex})`)
        await logInfo('macro', 'Macro rerun finished', { macroId: item.taskId, status: result.status, commandIndex: result.commandIndex })
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error)
      setMessage(`Error: ${errMsg}`)
      await logError('macro', errMsg, { macroId: item.taskId, mode })
    } finally {
      setIsRunning(false)
      await loadRows()
      await loadExecution()
    }
  }

  const submitInput = () => {
    if (!inputRequest || !inputResolverRef.current) return
    inputResolverRef.current.resolve(inputValue)
    clearInputRequest()
  }

  const cancelInput = () => {
    if (inputResolverRef.current) {
      inputResolverRef.current.reject(new Error('Input dialog cancelled by user'))
    }
    clearInputRequest()
  }

  return (
    <div className="p-4 space-y-4">
      <MacroHelp />

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Macros</h2>
            <p className="text-sm text-gray-500">Define YAML commands and run them step by step.</p>
          </div>
          <button
            onClick={() => void addRow()}
            className="px-3 py-2 text-sm rounded bg-blue-500 text-white hover:bg-blue-600"
          >
            + New Macro
          </button>
        </div>

        {rows.length === 0 && <div className="text-sm text-gray-500">No macros yet.</div>}

        <div className="flex flex-wrap gap-2 mb-3">
          {rows.map((item) => {
            const execution = executionMap[item.taskId]
            return (
              <button key={item.taskId}
                onClick={() => void runMacro(item, 'normal')}
                className="px-3 py-2 text-sm rounded bg-green-500 text-white hover:bg-green-600 w-30 h-30 relative">
                {item.name}
                {/* 此按鈕內的左下角編輯按鈕icon，右下角刪除按鈕icon */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setEditingItem(item)
                    setSelectedMacroId(item.taskId)
                  }}
                  className="absolute bottom-0 left-0 p-1 text-sm text-blue-500 hover:text-blue-600"
                >
                  ✒️
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    void deleteRow(item)
                  }}
                  className="absolute bottom-0 right-0 p-1 text-sm text-red-500 hover:text-red-600"
                >
                  🗑️
                </button>
              </button>
            )
          })}
        </div>
      </div>

      {selectedMacro && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-base font-semibold text-gray-800 mb-2">Macro Runner</h3>
          <div className="text-sm text-gray-700 mb-3">
            <div><span className="font-medium">Macro:</span> {selectedMacro.name}</div>
            <div><span className="font-medium">Status:</span> {selectedExecution?.status ?? 'idle'}</div>
            <div><span className="font-medium">Command Index:</span> {selectedExecution?.commandIndex ?? 0}</div>
            {selectedExecution?.lastError && (
              <div className="text-red-600 mt-1"><span className="font-medium">Last Error:</span> {selectedExecution.lastError}</div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => void runMacro(selectedMacro, 'normal')}
              disabled={isRunning}
              className="px-3 py-2 text-sm rounded bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-60"
            >
              Run
            </button>
            <button
              onClick={() => void runMacro(selectedMacro, 'continue')}
              disabled={isRunning}
              className="px-3 py-2 text-sm rounded bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-60"
            >
              Continue
            </button>
            <button
              onClick={() => void runMacro(selectedMacro, 'retry')}
              disabled={isRunning}
              className="px-3 py-2 text-sm rounded bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-60"
            >
              Retry
            </button>
            <button
              onClick={() => void runMacro(selectedMacro, 'skip')}
              disabled={isRunning}
              className="px-3 py-2 text-sm rounded bg-gray-500 text-white hover:bg-gray-600 disabled:opacity-60"
            >
              Skip
            </button>
            <button
              onClick={() => void runMacro(selectedMacro, 'abort')}
              disabled={isRunning}
              className="px-3 py-2 text-sm rounded bg-red-500 text-white hover:bg-red-600 disabled:opacity-60"
            >
              Abort
            </button>
            <button
              onClick={() => void runNextCommand(buildDefinition(selectedMacro), macroDeps)}
              disabled={isRunning}
              className="px-3 py-2 text-sm rounded bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-60"
            >
              Step +1
            </button>
          </div>

          {message && <div className="mt-3 text-sm text-gray-700">{message}</div>}

          {selectedExecution?.context && (
            <details className="mt-3">
              <summary className="cursor-pointer text-sm text-gray-600">Execution Context</summary>
              <pre className="mt-2 bg-gray-50 border border-gray-200 rounded p-2 text-xs overflow-auto">
                {JSON.stringify(selectedExecution.context, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}

      <MacroEditor
        isOpen={Boolean(editingItem)}
        macro={editingItem}
        onSave={handleSave}
        onClose={() => setEditingItem(null)}
      />

      {inputRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={cancelInput}>
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-800 mb-1">{inputRequest.title}</h3>
            <p className="text-sm text-gray-600 mb-3">{inputRequest.fieldLabel}</p>

            <input
              autoFocus
              type={inputRequest.fieldType === 'number' ? 'number' : 'text'}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  submitInput()
                }
              }}
              className="w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
            />

            <div className="mt-4 flex justify-end gap-2">
              <button onClick={cancelInput} className="rounded border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={submitInput} className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

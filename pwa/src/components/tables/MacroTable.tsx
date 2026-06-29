import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { db, MacroExecutionStatus, type MacroExecution, type MacroItem } from '../../db/schema'
import { applyChange } from '../../db/changeLog'
import { useResponsiveTable } from '../../hooks/useResponsiveTable'
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
import _ from 'lodash'

const DEV_CLIENT_ID = 'dev-macro-table'
const RESERVED_INPUT_KEYS = new Set(['command', 'iTitle', 'table'])

const EditIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-white hover:text-yellow-600">
    <path d="M21.731 2.269a2.625 2.625 0 00-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 000-3.712zM19.513 8.199l-3.712-3.712-12.15 12.15a5.25 5.25 0 00-1.32 2.214l-.8 2.685a.75.75 0 00.933.933l2.685-.8a5.25 5.25 0 002.214-1.32L19.513 8.2z" />
  </svg>
)

const DeleteIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-white hover:text-red-600">
    <path fillRule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 013.878.512.75.75 0 11-.256 1.478l-.209-.035-1.005 13.07a3 3 0 01-2.991 2.77H8.084a3 3 0 01-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 01-.256-1.478A48.567 48.567 0 017.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 013.369 0c1.603.051 2.815 1.387 2.815 2.951zm-6.136-1.452a51.196 51.196 0 013.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 00-6 0v-.113c0-.794.609-1.428 1.364-1.452zm-.355 5.945a.75.75 0 10-1.5.058l.347 9a.75.75 0 101.499-.058l-.346-9zm5.48.058a.75.75 0 10-1.498-.058l-.347 9a.75.75 0 001.5.058l.345-9z" clipRule="evenodd" />
  </svg>
)

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
  const [rows, setRows] = useState<MacroItem[]>([])
  const [executionMap, setExecutionMap] = useState<Record<string, MacroExecution>>({})
  const [editingItem, setEditingItem] = useState<MacroItem | null>(null)
  const [selectedMacroId, setSelectedMacroId] = useState<string | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [message, setMessage] = useState('')
  const [inputRequest, setInputRequest] = useState<InputRequest[] | null>(null)
  const inputResolverRef = useRef<{
    resolve: (value: Record<string, string>) => void
    reject: (error: Error) => void
  } | null>(null)

  const selectedMacro = useMemo(
    () => rows.find((row) => row.taskId === selectedMacroId) ?? null,
    [rows, selectedMacroId]
  )

  const selectedExecution = selectedMacroId ? executionMap[selectedMacroId] : undefined

  const requestInput = useCallback((request: InputRequest[]): Promise<Record<string, string>> => {
    setInputRequest(request)
    return new Promise((resolve, reject) => {
      inputResolverRef.current = { resolve, reject }
    })
  }, [])

  const clearInputRequest = useCallback(() => {
    setInputRequest(null)
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
        let inputValues: InputRequest[] = []

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

          inputValues.push({
            title,
            fieldKey,
            fieldLabel,
            fieldType,
            initialValue,
          })
        }

        const rawInputs = await requestInput(inputValues);
        // 轉存nextContext內
        _.forEach(rawInputs, (rawInput, fieldKey) => {
          //* refine rawInput
          //** 如果使用者沒有輸入，則使用initialValue
          if (_.isNil(rawInput)) {
            rawInput = inputValues.find((v) => v.fieldKey === fieldKey)?.initialValue ?? ''
          }
          //** 根據所要的型別轉換
          const fieldType = inputValues.find((v) => v.fieldKey === fieldKey)?.fieldType ?? 'string'
          if (fieldType === 'number') {
            nextContext[fieldKey] = Number(rawInput)
          } else {
            nextContext[fieldKey] = String(rawInput)
          }
        });

        return nextContext
      },
    }
  }, [requestInput])

  const loadRows = useCallback(async () => {
    const data = await db.macro.toArray()
    data.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
    setRows(data)
  }, [])


  const loadExecution = useCallback(async () => {
    const data = await db.macro_execution.toArray()
    const map: Record<string, MacroExecution> = {}
    for (const item of data) {
      map[item.macroId] = item
    }
    setExecutionMap(map)
  }, [])

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

  // 當ExecutionMap、rows 有變化，檢查 ExecutionMap 裡面第一個不是 idle 或 completed 的 macroId，並且在 rows 裡面有對應的 macroId，則將 selectedMacroId 設為該 macroId
  useEffect(() => {
    const runningMacro = Object.values(executionMap).find((execution) => execution.status === 'running' || execution.status === 'paused')
    if (runningMacro && rows.find((row) => row.taskId === runningMacro.macroId)) {
      setSelectedMacroId(runningMacro.macroId)
    }
  }, [executionMap, rows])

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

  const submitInput = (values: Record<string, unknown>) => {
    if (!inputRequest || !inputResolverRef.current) return
    inputResolverRef.current.resolve(values as Record<string, string>)
    clearInputRequest()
  }

  const cancelInput = () => {
    if (inputResolverRef.current) {
      inputResolverRef.current.reject(new Error('Input dialog cancelled by user'))
    }
    clearInputRequest()
  }

  function allowedNextActions(action: 'Run' | 'Continue' | 'Retry' | 'Skip' | 'Abort' | 'Step +1', status: MacroExecutionStatus | undefined): boolean {
    if (!status) return false
    switch (status) {
      case 'idle':
        return ['Run'].includes(action)
      case 'running':
        return ['Abort', 'Step +1'].includes(action)
      case 'paused':
        return ['Continue', 'Abort', 'Step +1'].includes(action)
      case 'completed':
        return ['Run'].includes(action)
      case 'failed':
        return ['Retry', 'Skip'].includes(action)
      default:
        return false
    }
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
                className={`px-3 py-2 text-sm rounded ${(selectedMacroId === item.taskId && !!!['completed','aborted'].includes(selectedExecution?.status ?? '')) ? 'bg-blue-500' : 'bg-green-500'} text-white hover:bg-green-600 w-30 h-30 relative`}>
                {item.name}
                {/* 此按鈕內的左下角編輯按鈕icon，右下角刪除按鈕icon */}
                <span
                  onClick={(e) => {
                    e.stopPropagation()
                    setEditingItem(item)
                    setSelectedMacroId(item.taskId)
                  }}
                  className="absolute bottom-0 left-0 p-1 text-sm"
                >
                  <EditIcon />
                </span>
                <span
                  onClick={(e) => {
                    e.stopPropagation()
                    void deleteRow(item)
                  }}
                  className="absolute bottom-0 right-0 p-1 text-sm"
                >
                  <DeleteIcon />
                </span>
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
              className={`px-3 py-2 text-sm rounded bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-60 ${allowedNextActions('Run', selectedExecution?.status) ? '' : 'hidden'} ${isRunning ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              Run
            </button>
            <button
              onClick={() => void runMacro(selectedMacro, 'continue')}
              disabled={isRunning}
              className={`px-3 py-2 text-sm rounded bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-60 ${allowedNextActions('Continue', selectedExecution?.status) ? '' : 'hidden'} ${isRunning ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              Continue
            </button>
            <button
              onClick={() => void runMacro(selectedMacro, 'retry')}
              disabled={isRunning}
              className={`px-3 py-2 text-sm rounded bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-60 ${allowedNextActions('Retry', selectedExecution?.status) ? '' : 'hidden'} ${isRunning ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              Retry
            </button>
            <button
              onClick={() => void runMacro(selectedMacro, 'skip')}
              disabled={isRunning}
              className={`px-3 py-2 text-sm rounded bg-gray-500 text-white hover:bg-gray-600 disabled:opacity-60 ${allowedNextActions('Skip', selectedExecution?.status) ? '' : 'hidden'} ${isRunning ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              Skip
            </button>
            <button
              onClick={() => void runMacro(selectedMacro, 'abort')}
              disabled={isRunning}
              className={`px-3 py-2 text-sm rounded bg-red-500 text-white hover:bg-red-600 disabled:opacity-60 ${allowedNextActions('Abort', selectedExecution?.status) ? '' : 'hidden'} ${isRunning ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              Abort
            </button>
            <button
              onClick={() => void runNextCommand(buildDefinition(selectedMacro), macroDeps)}
              disabled={isRunning}
              className={`px-3 py-2 text-sm rounded bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-60 ${allowedNextActions('Step +1', selectedExecution?.status) ? '' : 'hidden'} ${isRunning ? 'opacity-60 cursor-not-allowed' : ''}`}
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
          <form className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => {
              const fd = new FormData(e.currentTarget)
              let values: Record<string, FormDataEntryValue> = {};
              fd.forEach((value, key) => {
                values[key] = value
              })

              e.preventDefault()
              submitInput(values)
            }}
            >
            <h3 className="text-lg font-semibold text-gray-800 mb-1">{inputRequest[0].title}</h3>
            {inputRequest.map((ithRequest, ith) => (
              <div key={ithRequest.fieldKey}>
                <p className="text-sm text-gray-600 mb-3">{ithRequest.fieldLabel}</p>
                <input
                  autoFocus={ith === 0}
                  type={ithRequest.fieldType === 'number' ? 'number' : 'text'}
                  placeholder={ithRequest.initialValue}
                  name={ithRequest.fieldKey}
              className="w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
            />
              </div>
            ))}

            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={cancelInput} className="rounded border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50">
                Cancel
              </button>
              <button type="submit" className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">
                OK
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

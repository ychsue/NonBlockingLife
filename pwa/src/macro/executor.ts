import { applyChange } from '../db/changeLog'
import { db, type MacroExecutionStatus } from '../db/schema'
import { interpolateTemplate, sanitizeHttpUrl } from './interpolate'
import { acquireLock, heartbeatLock, releaseLock } from './lock'
import { parseMacroYaml, type ParsedMacroCommand } from './parser'

export interface MacroDefinition {
  taskId: string
  commands: string
}

export interface MacroExecutorDeps {
  handleInputDialog?: (
    command: ParsedMacroCommand,
    context: Record<string, unknown>
  ) => Promise<Record<string, unknown>>
  confirmOpenUrl?: (url: string, title?: string) => Promise<boolean>
  openUrl?: (url: string) => Promise<void>
}

export interface RunNextResult {
  status: MacroExecutionStatus
  commandIndex: number
  message?: string
}

const RESERVED_COMMAND_FIELDS = new Set(['command', 'iTitle', 'table'])

function buildClientId(): string {
  const existing = localStorage.getItem('device-id')
  if (existing) return existing
  const next = `device-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  localStorage.setItem('device-id', next)
  return next
}

function buildRecordId(table: string): string {
  return `${table}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function defaultDeps(): Required<MacroExecutorDeps> {
  return {
    async handleInputDialog(command, context) {
      const fields = Object.entries(command.raw).filter(([key, value]) => {
        if (RESERVED_COMMAND_FIELDS.has(key)) return false
        return value !== null && typeof value === 'object'
      })

      if (fields.length === 0) {
        throw new Error(`No input field definition found in command at index ${command.index}`)
      }

      const [key] = fields[0]
      const promptTitle = typeof command.raw.iTitle === 'string' ? command.raw.iTitle : `Input for ${key}`
      const input = window.prompt(promptTitle)
      if (input === null) {
        throw new Error('Input dialog cancelled by user')
      }

      return { ...context, [key]: input }
    },

    async confirmOpenUrl(url, title) {
      const text = title ? `${title}\n${url}` : url
      return window.confirm(text)
    },

    async openUrl(url) {
      window.open(url, '_blank', 'noopener,noreferrer')
    },
  }
}

async function updateExecutionState(
  macroId: string,
  patch: Partial<{
    status: MacroExecutionStatus
    commandIndex: number
    context: Record<string, unknown>
    lastError: string
  }>
): Promise<void> {
  const now = Date.now()
  const existing = await db.macro_execution.get(macroId)

  await db.macro_execution.put({
    macroId,
    status: patch.status ?? existing?.status ?? 'idle',
    commandIndex: patch.commandIndex ?? existing?.commandIndex ?? 0,
    context: patch.context ?? existing?.context ?? {},
    lastError: patch.lastError ?? existing?.lastError,
    lockOwner: existing?.lockOwner,
    lockExpiresAt: existing?.lockExpiresAt,
    updatedAt: now,
  })
}

export async function initializeExecution(definition: MacroDefinition): Promise<void> {
  const existing = await db.macro_execution.get(definition.taskId)
  if (existing) return

  await db.macro_execution.put({
    macroId: definition.taskId,
    status: 'idle',
    commandIndex: 0,
    context: {},
    updatedAt: Date.now(),
  })
}

async function executeAddRecord(
  command: ParsedMacroCommand,
  context: Record<string, unknown>,
  clientId: string
): Promise<void> {
  const table = command.addTable
  if (!table) {
    throw new Error(`Cannot resolve add target table at index ${command.index}`)
  }

  const payload: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(command.raw)) {
    if (RESERVED_COMMAND_FIELDS.has(key)) continue

    if (typeof value === 'string') {
      payload[key] = interpolateTemplate(value, context)
    } else {
      payload[key] = value
    }
  }

  const recordId = typeof payload.taskId === 'string' ? payload.taskId : buildRecordId(table)
  if (!payload.taskId) {
    payload.taskId = recordId
  }

  await applyChange({
    table,
    recordId,
    op: 'add',
    patch: payload,
    clientId,
  })
}

async function executeOne(
  command: ParsedMacroCommand,
  context: Record<string, unknown>,
  deps: Required<MacroExecutorDeps>,
  clientId: string
): Promise<{ nextContext: Record<string, unknown>; pauseAfter: boolean }> {
  if (command.commandType === 'inputDialog') {
    const merged = await deps.handleInputDialog(command, context)
    return { nextContext: merged, pauseAfter: false }
  }

  if (command.commandType === 'openUrl') {
    const rawUrl = String(command.raw.url)
    const interpolated = interpolateTemplate(rawUrl, context)
    const safeUrl = sanitizeHttpUrl(interpolated)
    const ok = await deps.confirmOpenUrl(safeUrl, typeof command.raw.iTitle === 'string' ? command.raw.iTitle : undefined)
    if (!ok) {
      throw new Error('User cancelled openUrl')
    }

    await deps.openUrl(safeUrl)
    return { nextContext: context, pauseAfter: true }
  }

  await executeAddRecord(command, context, clientId)
  return { nextContext: context, pauseAfter: false }
}

export async function runNextCommand(
  definition: MacroDefinition,
  depsInput: MacroExecutorDeps = {}
): Promise<RunNextResult> {
  const lockAcquired = await acquireLock(definition.taskId)
  if (!lockAcquired) {
    throw new Error('Macro is locked by another window/session')
  }

  const deps = { ...defaultDeps(), ...depsInput }
  const clientId = buildClientId()

  try {
    await initializeExecution(definition)
    await heartbeatLock(definition.taskId)

    const commands = parseMacroYaml(definition.commands)
    const state = await db.macro_execution.get(definition.taskId)
    const commandIndex = state?.commandIndex ?? 0
    const context = (state?.context ?? {}) as Record<string, unknown>

    if (commandIndex >= commands.length) {
      await updateExecutionState(definition.taskId, {
        status: 'completed',
        commandIndex,
        context,
        lastError: '',
      })
      await releaseLock(definition.taskId)
      return { status: 'completed', commandIndex }
    }

    await updateExecutionState(definition.taskId, {
      status: 'running',
      commandIndex,
      context,
      lastError: '',
    })

    const command = commands[commandIndex]
    const { nextContext, pauseAfter } = await executeOne(command, context, deps, clientId)
    const nextIndex = commandIndex + 1
    const nextStatus: MacroExecutionStatus = nextIndex >= commands.length ? 'completed' : pauseAfter ? 'paused' : 'running'

    await updateExecutionState(definition.taskId, {
      status: nextStatus,
      commandIndex: nextIndex,
      context: nextContext,
      lastError: '',
    })

    if (nextStatus === 'completed' || nextStatus === 'paused') {
      await releaseLock(definition.taskId)
    }

    return {
      status: nextStatus,
      commandIndex: nextIndex,
    }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    const state = await db.macro_execution.get(definition.taskId)

    await updateExecutionState(definition.taskId, {
      status: 'failed',
      commandIndex: state?.commandIndex ?? 0,
      context: (state?.context ?? {}) as Record<string, unknown>,
      lastError: errMsg,
    })

    await releaseLock(definition.taskId)
    return {
      status: 'failed',
      commandIndex: state?.commandIndex ?? 0,
      message: errMsg,
    }
  }
}

export async function runUntilPauseOrComplete(
  definition: MacroDefinition,
  depsInput: MacroExecutorDeps = {}
): Promise<RunNextResult> {
  let last = await runNextCommand(definition, depsInput)
  while (last.status === 'running') {
    last = await runNextCommand(definition, depsInput)
  }
  return last
}

export async function retryCurrent(definition: MacroDefinition, depsInput: MacroExecutorDeps = {}): Promise<RunNextResult> {
  const state = await db.macro_execution.get(definition.taskId)
  if (!state || state.status !== 'failed') {
    throw new Error('Current macro is not in failed state')
  }

  await updateExecutionState(definition.taskId, {
    status: 'running',
    lastError: '',
  })
  return runNextCommand(definition, depsInput)
}

export async function skipCurrent(definition: MacroDefinition): Promise<RunNextResult> {
  const state = await db.macro_execution.get(definition.taskId)
  if (!state) {
    throw new Error('Macro execution state not found')
  }

  const commands = parseMacroYaml(definition.commands)
  const nextIndex = Math.min(state.commandIndex + 1, commands.length)
  const nextStatus: MacroExecutionStatus = nextIndex >= commands.length ? 'completed' : 'paused'

  await updateExecutionState(definition.taskId, {
    status: nextStatus,
    commandIndex: nextIndex,
    lastError: '',
  })

  await releaseLock(definition.taskId)
  return { status: nextStatus, commandIndex: nextIndex }
}

export async function abortMacro(definition: MacroDefinition): Promise<void> {
  await updateExecutionState(definition.taskId, {
    status: 'aborted',
    lastError: '',
  })
  await releaseLock(definition.taskId)
}

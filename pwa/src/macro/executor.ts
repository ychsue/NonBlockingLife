import { db, type MacroExecutionStatus } from '../db/schema'
import { acquireLock, heartbeatLock, releaseLock } from './lock'
import { parseMacroYaml, type ParsedMacroCommand } from './parser'
import { executeAddRecord } from './commands/addRecord'
import { executeInputDialog } from './commands/inputDialog'
import { executeOpenUrl } from './commands/openUrl'

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

function buildClientId(): string {
  const existing = localStorage.getItem('device-id')
  if (existing) return existing
  const next = `device-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  localStorage.setItem('device-id', next)
  return next
}

function defaultDeps(): Required<MacroExecutorDeps> {
  return {
    async handleInputDialog(command, context) {
      throw new Error(
        `Input dialog handler is not configured for command at index ${command.index}. Provide handleInputDialog via MacroExecutorDeps.`
      )
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

async function executeOne(
  command: ParsedMacroCommand,
  context: Record<string, unknown>,
  deps: Required<MacroExecutorDeps>,
  clientId: string
): Promise<{ nextContext: Record<string, unknown>; pauseAfter: boolean }> {
  if (command.commandType === 'inputDialog') {
    const merged = await executeInputDialog(command, context, deps.handleInputDialog)
    return { nextContext: merged, pauseAfter: false }
  }

  if (command.commandType === 'openUrl') {
    await executeOpenUrl(command, context, {
      confirmOpenUrl: deps.confirmOpenUrl,
      openUrl: deps.openUrl,
    })
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

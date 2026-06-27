import { db, type MacroExecution } from '../db/schema'

const DEFAULT_LOCK_TTL_MS = 2 * 60 * 1000
const WINDOW_ID_KEY = 'macro-window-id'

function buildWindowId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `win_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

export function getWindowId(): string {
  const existing = sessionStorage.getItem(WINDOW_ID_KEY)
  if (existing) return existing

  const next = buildWindowId()
  sessionStorage.setItem(WINDOW_ID_KEY, next)
  return next
}

export async function acquireLock(macroId: string, ttlMs = DEFAULT_LOCK_TTL_MS): Promise<boolean> {
  const owner = getWindowId()
  const now = Date.now()

  return db.transaction('rw', db.macro_execution, async () => {
    const existing = await db.macro_execution.get(macroId)

    if (existing && existing.lockOwner && existing.lockOwner !== owner && (existing.lockExpiresAt ?? 0) > now) {
      return false
    }

    const next: MacroExecution = {
      macroId,
      status: existing?.status ?? 'idle',
      commandIndex: existing?.commandIndex ?? 0,
      context: existing?.context ?? {},
      lastError: existing?.lastError,
      updatedAt: now,
      lockOwner: owner,
      lockExpiresAt: now + ttlMs,
    }

    await db.macro_execution.put(next)
    return true
  })
}

export async function heartbeatLock(macroId: string, ttlMs = DEFAULT_LOCK_TTL_MS): Promise<boolean> {
  const owner = getWindowId()
  const state = await db.macro_execution.get(macroId)
  if (!state || state.lockOwner !== owner) {
    return false
  }

  await db.macro_execution.update(macroId, {
    lockExpiresAt: Date.now() + ttlMs,
    updatedAt: Date.now(),
  })

  return true
}

export async function releaseLock(macroId: string): Promise<void> {
  const owner = getWindowId()
  const state = await db.macro_execution.get(macroId)
  if (!state || state.lockOwner !== owner) {
    return
  }

  await db.macro_execution.update(macroId, {
    lockOwner: '',
    lockExpiresAt: 0,
    updatedAt: Date.now(),
  })
}

export async function reclaimExpiredLock(macroId: string, ttlMs = DEFAULT_LOCK_TTL_MS): Promise<boolean> {
  const state = await db.macro_execution.get(macroId)
  const now = Date.now()

  if (!state || !state.lockOwner || (state.lockExpiresAt ?? 0) <= now) {
    return acquireLock(macroId, ttlMs)
  }

  return state.lockOwner === getWindowId()
}

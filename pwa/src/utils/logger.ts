import { db, type AppLogEntry, type AppLogLevel } from '../db/schema'
import { DEBUG_MODE_KEY } from '../store/appStore'

function isDebugModeEnabled(): boolean {
  return localStorage.getItem(DEBUG_MODE_KEY) === '1'
}

function buildLogId(level: AppLogLevel, scope: string): string {
  return `app_log_${level}_${scope}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

async function writeLog(level: AppLogLevel, scope: string, message: string, payload?: Record<string, unknown>) {
  if (!isDebugModeEnabled()) {
    return
  }

  const entry: AppLogEntry = {
    id: buildLogId(level, scope),
    timestamp: Date.now(),
    level,
    scope,
    message,
    payload,
  }

  await db.app_log.put(entry)
}

export async function logInfo(scope: string, message: string, payload?: Record<string, unknown>) {
  await writeLog('info', scope, message, payload)
}

export async function logWarn(scope: string, message: string, payload?: Record<string, unknown>) {
  await writeLog('warn', scope, message, payload)
}

export async function logError(scope: string, message: string, payload?: Record<string, unknown>) {
  await writeLog('error', scope, message, payload)
}
import { applyChange } from '../../db/changeLog'
import { interpolateTemplate } from '../interpolate'
import type { ParsedMacroCommand } from '../parser'

const RESERVED_COMMAND_FIELDS = new Set(['command', 'iTitle', 'table'])

function buildRecordId(table: string): string {
  return `${table}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export async function executeAddRecord(
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

import { cloneValue, getContextPath, interpolateTemplate, setContextPath } from '../interpolate'
import type { ParsedMacroCommand } from '../parser'

export function executeSetParam(command: ParsedMacroCommand, context: Record<string, unknown>): Record<string, unknown> {
  const target = String(command.raw.target)

  let value: unknown
  if ('value' in command.raw) {
    value = cloneValue(command.raw.value)
  } else if (typeof command.raw.fromPath === 'string') {
    value = cloneValue(getContextPath(context, command.raw.fromPath))
  } else if (typeof command.raw.fromTemplate === 'string') {
    value = interpolateTemplate(command.raw.fromTemplate, context)
  } else {
    throw new Error("setParam requires one source: value | fromPath | fromTemplate")
  }

  return setContextPath(context, target, value)
}

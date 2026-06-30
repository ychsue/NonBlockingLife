import { interpolateTemplate, sanitizeHttpUrl, setContextPath } from '../interpolate'
import type { ParsedMacroCommand } from '../parser'

export interface ApiGetJsonDeps {
  fetchJson: (url: string, timeoutMs: number) => Promise<unknown>
}

export async function executeApiGetJson(
  command: ParsedMacroCommand,
  context: Record<string, unknown>,
  deps: ApiGetJsonDeps
): Promise<Record<string, unknown>> {
  const rawUrl = String(command.raw.url)
  const interpolatedUrl = interpolateTemplate(rawUrl, context)
  const safeUrl = sanitizeHttpUrl(interpolatedUrl)

  const timeoutMs = typeof command.raw.timeoutMs === 'number' ? command.raw.timeoutMs : 10000
  const resultKey =
    typeof command.raw.resultKey === 'string' && command.raw.resultKey.trim().length > 0
      ? command.raw.resultKey
      : 'apiResult'

  const json = await deps.fetchJson(safeUrl, timeoutMs)
  return setContextPath(context, resultKey, json)
}

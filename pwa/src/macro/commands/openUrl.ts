import { interpolateTemplate, sanitizeHttpUrl } from '../interpolate'
import type { ParsedMacroCommand } from '../parser'

export interface OpenUrlDeps {
  confirmOpenUrl: (url: string, title?: string) => Promise<boolean>
  openUrl: (url: string) => Promise<void>
}

export async function executeOpenUrl(
  command: ParsedMacroCommand,
  context: Record<string, unknown>,
  deps: OpenUrlDeps
): Promise<void> {
  const rawUrl = String(command.raw.url)
  const interpolated = interpolateTemplate(rawUrl, context)
  const safeUrl = sanitizeHttpUrl(interpolated)
  const title =
    typeof command.raw.iTitle === 'string'
      ? interpolateTemplate(command.raw.iTitle, context)
      : undefined
  const ok = await deps.confirmOpenUrl(
    safeUrl,
    title
  )

  if (!ok) {
    throw new Error('User cancelled openUrl')
  }

  await deps.openUrl(safeUrl)
}

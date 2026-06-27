import type { ParsedMacroCommand } from '../parser'

export interface InputDialogHandler {
  (command: ParsedMacroCommand, context: Record<string, unknown>): Promise<Record<string, unknown>>
}

export async function executeInputDialog(
  command: ParsedMacroCommand,
  context: Record<string, unknown>,
  handler: InputDialogHandler
): Promise<Record<string, unknown>> {
  return handler(command, context)
}

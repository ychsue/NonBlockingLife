import { parse } from 'yaml'
import { normalizeCommandType, resolveAddCommandTable, type CommandType } from './commandRegistry'

export interface RawMacroCommand {
  command: string
  iTitle?: string
  [key: string]: unknown
}

export interface ParsedMacroCommand {
  index: number
  commandType: CommandType
  raw: RawMacroCommand
  addTable?: string
}

function isObjectLike(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function validateRequiredFields(cmd: RawMacroCommand, requiredFields: string[]) {
  for (const field of requiredFields) {
    if (!(field in cmd)) {
      throw new Error(`Missing required field '${field}' in command '${cmd.command}'`)
    }
  }
}

function validateCommandShape(cmd: RawMacroCommand, commandType: CommandType): { addTable?: string } {
  if (commandType === 'openUrl') {
    validateRequiredFields(cmd, ['url'])
    if (typeof cmd.url !== 'string' || cmd.url.trim().length === 0) {
      throw new Error("'openUrl' command requires non-empty string field 'url'")
    }
    return {}
  }

  if (commandType === 'inputDialog') {
    validateRequiredFields(cmd, ['iTitle'])
    if (typeof cmd.iTitle !== 'string' || cmd.iTitle.trim().length === 0) {
      throw new Error("'inputDialog' command requires non-empty string field 'iTitle'")
    }
    return {}
  }

  const explicitTable = typeof cmd.table === 'string' ? cmd.table : undefined
  const addTable = resolveAddCommandTable(commandType, explicitTable)
  if (!addTable) {
    throw new Error(`Invalid add command target table for command '${cmd.command}'`)
  }

  return { addTable }
}

export function parseMacroYaml(yamlText: string): ParsedMacroCommand[] {
  if (!yamlText.trim()) {
    throw new Error('Macro commands YAML is empty')
  }

  const parsed = parse(yamlText)
  if (!Array.isArray(parsed)) {
    throw new Error('Macro commands must be a YAML array')
  }

  return parsed.map((item, index) => {
    if (!isObjectLike(item)) {
      throw new Error(`Command at index ${index} must be an object`)
    }

    const command = item.command
    if (typeof command !== 'string' || command.trim().length === 0) {
      throw new Error(`Command at index ${index} is missing string field 'command'`)
    }

    const commandType = normalizeCommandType(command)
    if (!commandType) {
      throw new Error(`Unsupported command '${command}' at index ${index}`)
    }

    const raw = item as RawMacroCommand
    const shape = validateCommandShape(raw, commandType)

    return {
      index,
      commandType,
      raw,
      addTable: shape.addTable,
    }
  })
}

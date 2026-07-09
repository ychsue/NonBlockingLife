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

  if (commandType === 'apiGetJson') {
    validateRequiredFields(cmd, ['url'])
    if (typeof cmd.url !== 'string' || cmd.url.trim().length === 0) {
      throw new Error(`'${cmd.command}' command requires non-empty string field 'url'`)
    }

    if (cmd.resultKey !== undefined && (typeof cmd.resultKey !== 'string' || cmd.resultKey.trim().length === 0)) {
      throw new Error(`'${cmd.command}' optional field 'resultKey' must be non-empty string`)
    }

    if (cmd.timeoutMs !== undefined && (typeof cmd.timeoutMs !== 'number' || cmd.timeoutMs <= 0)) {
      throw new Error(`'${cmd.command}' optional field 'timeoutMs' must be positive number`)
    }

    return {}
  }

  if (commandType === 'setParam') {
    validateRequiredFields(cmd, ['target'])
    if (typeof cmd.target !== 'string' || cmd.target.trim().length === 0) {
      throw new Error("'setParam' command requires non-empty string field 'target'")
    }

    const hasValue = 'value' in cmd
    const hasFromPath = typeof cmd.fromPath === 'string' && cmd.fromPath.trim().length > 0
    const hasFromTemplate = typeof cmd.fromTemplate === 'string' && cmd.fromTemplate.trim().length > 0
    const sourceCount = [hasValue, hasFromPath, hasFromTemplate].filter(Boolean).length

    if (sourceCount !== 1) {
      throw new Error("'setParam' requires exactly one source: value | fromPath | fromTemplate")
    }

    return {}
  }

  if (commandType === 'alert') {
    validateRequiredFields(cmd, ['message'])
    if (typeof cmd.message !== 'string' || cmd.message.trim().length === 0) {
      throw new Error("'alert' command requires non-empty string field 'message'")
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

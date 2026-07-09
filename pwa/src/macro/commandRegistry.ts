import { SYNC_TABLES } from '../utils/syncUtils'

export const BaseCommandTypes = ['inputDialog', 'openUrl', 'addRecord', 'apiGetJson', 'setParam', 'alert'] as const;
export type BaseCommandType = (typeof BaseCommandTypes)[number];

export type AddAliasCommandType =
  | 'add_task_pool'
  | 'add_scheduled'
  | 'add_micro_tasks'
  | 'add_inbox'
  | 'add_resource'

export type CommandType = BaseCommandType | AddAliasCommandType

export interface CommandSpec {
  type: CommandType
  title: string
  summary: string
  requiredFields: string[]
  example: Record<string, unknown>
}

const ADD_BLOCKLIST = new Set(['log', 'macro'])

export const ADD_TARGET_TABLES = SYNC_TABLES.filter((table) => !ADD_BLOCKLIST.has(table)) as Array<
  Exclude<(typeof SYNC_TABLES)[number], 'log' | 'macro'>
>

export const COMMAND_SPECS: CommandSpec[] = [
  {
    type: 'inputDialog',
    title: 'Ask user input',
    summary: 'Show a dialog and store the value in macro context.',
    requiredFields: ['iTitle'],
    example: {
      command: 'inputDialog',
      iTitle: 'Please enter hymn number',
      whichOne: {
        type: 'number',
        label: 'Hymn number',
      },
    },
  },
  {
    type: 'openUrl',
    title: 'Open URL',
    summary: 'Open an http/https URL with user confirmation.',
    requiredFields: ['url'],
    example: {
      command: 'openUrl',
      iTitle: 'Open hymn page',
      url: 'https://www.hymnal.net/en/hymn/ch/{{whichOne}}',
    },
  },
  {
    type: 'addRecord',
    title: 'Add record to sync table',
    summary: 'Create a record in one allowed sync table.',
    requiredFields: ['table'],
    example: {
      command: 'addRecord',
      table: 'inbox',
      title: 'Play hymn {{whichOne}}',
      url: 'https://www.hymnal.net/en/hymn/ch/{{whichOne}}',
    },
  },
  {
    type: 'apiGetJson',
    title: 'Call API and save JSON',
    summary: 'Call an HTTP GET API, then write JSON result to context path.',
    requiredFields: ['url'],
    example: {
      command: 'apiGetJson',
      url: 'https://api.example.com/items/{{whichOne}}',
      resultKey: 'apiResult',
      timeoutMs: 10000,
    },
  },
  {
    type: 'setParam',
    title: 'Set context parameter',
    summary: 'Set context path from literal value, template string, or another context path.',
    requiredFields: ['target'],
    example: {
      command: 'setParam',
      target: 'saved.firstName',
      fromPath: 'apiResult.user.name',
    },
  },
  ...ADD_TARGET_TABLES.map((table) => ({
    type: `add_${table}` as AddAliasCommandType,
    title: `Alias: add into ${table}`,
    summary: 'Alias command for addRecord with fixed table.',
    requiredFields: [],
    example: {
      command: `add_${table}`,
      title: 'Example task title',
    },
  })),
]

export function normalizeCommandType(command: string): CommandType | null {
  if (
    BaseCommandTypes.includes(command as BaseCommandType)
  ) {
    return command as CommandType
  }

  if (command.startsWith('add_')) {
    const table = command.slice(4)
    if (ADD_TARGET_TABLES.includes(table as (typeof ADD_TARGET_TABLES)[number])) {
      return command as AddAliasCommandType
    }
  }

  return null
}

export function resolveAddCommandTable(command: CommandType, explicitTable?: string): string | null {
  if (command === 'addRecord') {
    if (!explicitTable) return null
    return ADD_TARGET_TABLES.includes(explicitTable as (typeof ADD_TARGET_TABLES)[number]) ? explicitTable : null
  }

  if (command.startsWith('add_')) {
    const table = command.slice(4)
    return ADD_TARGET_TABLES.includes(table as (typeof ADD_TARGET_TABLES)[number]) ? table : null
  }

  return null
}

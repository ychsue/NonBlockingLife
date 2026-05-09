import { describe, expect, test } from 'vitest'
import type { ExportData } from '../exportImportUtils'
import {
  parseMdtable,
  parsedMdtableToExportData,
  buildMdtableFromExportData,
  buildMdInfoRowsFromParsedMdtable,
} from '../tsvmdUtils'

describe('mdtableUtils', () => {
  test('可以解析穿插 markdown 與 markdown table，並替換成 [table] 標記', () => {
    const source = `---
format: nbl-mdtable
version: 1
exportedAt: 1778285402708
---

# 備份說明
這是摘要段落。

## 📊 task_pool
| taskId | title | priority |
|--------|-------|----------|
| T1 | 寫提案 | 3 |

中段備註。

## 📊 log
| id | timestamp | taskId | action |
|----|-----------|--------|--------|
| log_1 | 1778285402000 | T1 | start |
`

    const parsed = parseMdtable(source)

    expect(parsed.version).toBe(1)
    expect(parsed.exportedAt).toBe(1778285402708)
    expect(parsed.markdownInfo.includes('[task_pool]')).toBe(true)
    expect(parsed.markdownInfo.includes('[log]')).toBe(true)
    expect(parsed.tables.task_pool?.[0]).toMatchObject({
      taskId: 'T1',
      title: '寫提案',
      priority: 3,
    })
    expect(parsed.tables.log?.[0]).toMatchObject({
      id: 'log_1',
      taskId: 'T1',
      action: 'start',
    })
  })

  test('可以從 ExportData 生成 mdtable，並支援用 [table] 進行回填', () => {
    const data: ExportData = {
      version: 1,
      exportedAt: 1778285402708,
      tables: {
        task_pool: [{ taskId: 'T1', title: '寫提案', priority: 3 }],
        scheduled: [],
        micro_tasks: [],
        inbox: [],
        resource: [],
        log: [{ id: 'log_1', timestamp: 1778285402000, taskId: 'T1', action: 'start' }],
      },
    }

    const markdownInfo = '# 測試文件\n\n先放任務：[task_pool]\n\n最後放 log：[log]'
    const output = buildMdtableFromExportData(data, { markdownInfo })

    expect(output.includes('## 📊 task_pool')).toBe(true)
    expect(output.includes('## 📊 log')).toBe(true)
    expect(output.includes('| taskId | title |')).toBe(true)
    expect(output.includes('[task_pool]')).toBe(false)
    expect(output.includes('[log]')).toBe(false)
  })

  test('mdtable parse -> ExportData 可 round-trip 到對應表格', () => {
    const source = `---
format: nbl-mdtable
version: 1
exportedAt: 1778285402708
---

## 📊 inbox
| taskId | title | receivedAt |
|--------|-------|------------|
| I1 | 想法1 | 1778285402000 |
`

    const parsed = parseMdtable(source)
    const data = parsedMdtableToExportData(parsed)

    expect(data.tables.inbox.length).toBe(1)
    expect(data.tables.inbox[0]).toMatchObject({
      taskId: 'I1',
      title: '想法1',
      receivedAt: 1778285402000,
    })
    expect(data.tables.task_pool.length).toBe(0)
  })

  test('可生成 MD_INFO rows，保留 markdownInfo 與 raw', () => {
    const parsed = parseMdtable('# 說明\n\n## 📊 task_pool\n| taskId | title |\n|--------|-------|\n| T1 | A |')
    const rows = buildMdInfoRowsFromParsedMdtable(parsed, 'raw-content')

    expect(rows.find((r) => r.key === 'latest_mdtable_markdown_info')?.value.includes('[task_pool]')).toBe(
      true,
    )
    expect(rows.find((r) => r.key === 'latest_mdtable_raw')?.value).toBe('raw-content')
  })
})

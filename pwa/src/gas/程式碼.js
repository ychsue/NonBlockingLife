/**
 * NonBlockingLife Sync API - Star Schema with Analysis Support
 *
 * 說明：
 * - 每個本地 table 對應獨立 Google Sheet，避免資料混表
 * - Log 表採用「完全展開」（Fact Table），方便 Gemini/Excel 分析
 * - 其他表提取 taskId（Dimension Table），用於關聯分析
 * - 架構：星型（Star Schema），Log 為中心事實表，其他為維度表
 */

const CONFIG = {
  VERSION: '1.2.0',
  TABLE_SHEETS: {
    task_pool: 'NBL_TaskPool',
    scheduled: 'NBL_Scheduled',
    micro_tasks: 'NBL_MicroTasks',
    inbox: 'NBL_Inbox',
    log: 'NBL_Log',
  },
}

// Log 表：完全展開（Fact Table）
const LOG_HEADERS = [
  'recordId',
  'timestamp',
  'taskId',
  'title',
  'action',
  'state',
  'duration',
  'notes',
  'updatedAt',
  'deleted',
  'operationId',
  'deviceId',
]

// 其他表：提取 taskId（Dimension Tables）
const DIMENSION_HEADERS = [
  'recordId',
  'taskId',
  'payloadJson',
  'updatedAt',
  'deleted',
  'operationId',
  'deviceId',
]

function getSheetHeaders(table) {
  return table === 'log' ? LOG_HEADERS : DIMENSION_HEADERS
}

function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) || 'ping'
    const lastSync = parseInt((e && e.parameter && e.parameter.lastSync) || '0', 10) || 0

    switch (action) {
      case 'ping':
        return createJsonResponse({
          status: 'ok',
          message: 'NonBlockingLife Sync API is running',
          version: CONFIG.VERSION,
          timestamp: now(),
          user: Session.getActiveUser().getEmail(),
        })
      case 'sync-status':
        return getSyncStatus()
      case 'pull':
        return pullChanges(lastSync)
      default:
        return createJsonResponse({
          status: 'error',
          error: 'Unknown action',
          validActions: ['ping', 'sync-status', 'pull'],
        })
    }
  } catch (error) {
    return createJsonResponse({
      status: 'error',
      error: String(error),
      stack: error && error.stack,
    })
  }
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error('No post data received')
    }

    const payload = JSON.parse(e.postData.contents)
    const operations = payload.operations || []

    const results = []
    for (let i = 0; i < operations.length; i++) {
      try {
        const result = processOperation(operations[i])
        results.push({ index: i, success: true, result: result })
      } catch (opError) {
        results.push({ index: i, success: false, error: String(opError) })
      }
    }

    const successCount = results.filter(function (r) {
      return r.success
    }).length

    return createJsonResponse({
      status: 'completed',
      total: operations.length,
      success: successCount,
      failed: operations.length - successCount,
      results: results,
      timestamp: now(),
    })
  } catch (error) {
    return createJsonResponse({
      status: 'error',
      error: String(error),
      stack: error && error.stack,
    })
  }
}

function getSyncStatus() {
  const counts = {}
  let total = 0

  Object.keys(CONFIG.TABLE_SHEETS).forEach(function (table) {
    const sheet = getOrCreateSheet(table)
    const lastRow = sheet.getLastRow()
    const count = lastRow > 1 ? lastRow - 1 : 0
    counts[table] = count
    total += count
  })

  return createJsonResponse({
    status: 'ok',
    counts: counts,
    totalRows: total,
    timestamp: now(),
  })
}

function pullChanges(lastSync) {
  const changes = []

  Object.keys(CONFIG.TABLE_SHEETS).forEach(function (table) {
    const sheet = getOrCreateSheet(table)
    const lastRow = sheet.getLastRow()
    if (lastRow <= 1) return

    const headers = getSheetHeaders(table)
    const values = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues()

    if (table === 'log') {
      // Log 表：重組展開欄位
      for (var i = 0; i < values.length; i++) {
        const row = values[i]
        const recordId = row[0]
        const timestamp = Number(row[1]) || 0
        const taskId = row[2]
        const title = row[3]
        const action = row[4]
        const state = row[5]
        const duration = Number(row[6]) || 0
        const notes = row[7]
        const updatedAt = Number(row[8]) || 0
        const deleted = Boolean(row[9])
        const operationId = row[10]
        const deviceId = row[11]

        if (updatedAt <= lastSync) continue

        changes.push({
          table: table,
          recordId: recordId,
          data: {
            id: recordId,
            timestamp: timestamp,
            taskId: taskId,
            title: title,
            action: action,
            state: state,
            duration: duration,
            notes: notes,
          },
          timestamp: updatedAt,
          deleted: deleted,
          operationId: operationId,
          deviceId: deviceId,
        })
      }
    } else {
      // 其他表：重組 taskId + payloadJson
      for (var i = 0; i < values.length; i++) {
        const row = values[i]
        const recordId = row[0]
        const taskId = row[1]
        const payloadJson = row[2]
        const updatedAt = Number(row[3]) || 0
        const deleted = Boolean(row[4])
        const operationId = row[5]
        const deviceId = row[6]

        if (updatedAt <= lastSync) continue

        const payload = safeParseJson(payloadJson)
        payload.taskId = taskId // 確保 taskId 存在

        changes.push({
          table: table,
          recordId: recordId,
          data: payload,
          timestamp: updatedAt,
          deleted: deleted,
          operationId: operationId,
          deviceId: deviceId,
        })
      }
    }
  })

  changes.sort(function (a, b) {
    return (a.timestamp || 0) - (b.timestamp || 0)
  })

  return createJsonResponse({
    status: 'ok',
    changes: changes,
    count: changes.length,
    timestamp: now(),
  })
}

function processOperation(operation) {
  const table = resolveTable(operation)
  const type = normalizeType(operation.type)
  const recordId = resolveRecordId(operation)

  if (!table || !CONFIG.TABLE_SHEETS[table]) {
    throw new Error('Unsupported table: ' + table)
  }
  if (!recordId) {
    throw new Error('Missing recordId')
  }

  const sheet = getOrCreateSheet(table)
  const rowIndex = findRowByRecordId(sheet, recordId)
  const data = operation.data || {}
  const ts = Number(operation.timestamp) || now()
  const operationId = operation.operationId || generateUUID()
  const deviceId = operation.deviceId || 'unknown-device'

  if (type === 'delete') {
    if (rowIndex > 0) {
      writeRowByTable(sheet, table, rowIndex, recordId, data, ts, true, operationId, deviceId)
      return { action: 'deleted', table: table, recordId: recordId }
    }

    writeRowByTable(sheet, table, -1, recordId, data, ts, true, operationId, deviceId)
    return { action: 'deleted', table: table, recordId: recordId, createdTombstone: true }
  }

  if (type === 'add') {
    if (rowIndex > 0) {
      return { action: 'skipped', reason: 'already exists', table: table, recordId: recordId }
    }
    writeRowByTable(sheet, table, -1, recordId, data, ts, false, operationId, deviceId)
    return { action: 'created', table: table, recordId: recordId }
  }

  if (rowIndex > 0) {
    const prev = readExistingData(sheet, table, rowIndex)
    const merged = mergePayload(prev, data)
    writeRowByTable(sheet, table, rowIndex, recordId, merged, ts, false, operationId, deviceId)
    return { action: 'updated', table: table, recordId: recordId }
  }

  writeRowByTable(sheet, table, -1, recordId, data, ts, false, operationId, deviceId)
  return { action: 'created', table: table, recordId: recordId, fromUpdate: true }
}

function resolveTable(operation) {
  if (operation.table && CONFIG.TABLE_SHEETS[operation.table]) return operation.table

  // 向下兼容舊協議 entityType
  if (operation.entityType === 'inbox') return 'inbox'
  if (operation.entityType === 'log') return 'log'

  if (operation.entityType === 'task') {
    const source = operation.data && operation.data.source
    if (source === 'Scheduled') return 'scheduled'
    if (source === 'Micro_Tasks') return 'micro_tasks'
    return 'task_pool'
  }

  return 'task_pool'
}

function normalizeType(type) {
  if (type === 'add' || type === 'create') return 'add'
  if (type === 'delete') return 'delete'
  return 'update'
}

function resolveRecordId(operation) {
  if (operation.recordId) return operation.recordId
  if (operation.entityId) return operation.entityId
  if (operation.id) return operation.id

  const data = operation.data || {}
  return data.id || data.taskId || ''
}

function getOrCreateSheet(table) {
  const ss = SpreadsheetApp.getActiveSpreadsheet()
  if (!ss) {
    throw new Error('Apps Script is not bound to a Google Sheet. Please use Extensions > Apps Script from the target sheet.')
  }

  const sheetName = CONFIG.TABLE_SHEETS[table]
  let sheet = ss.getSheetByName(sheetName)

  if (!sheet) {
    const headers = getSheetHeaders(table)
    sheet = ss.insertSheet(sheetName)
    sheet.getRange(1, 1, 1, headers.length).setValues([headers])
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold')
    sheet.setFrozenRows(1)
  }

  return sheet
}

function findRowByRecordId(sheet, recordId) {
  const lastRow = sheet.getLastRow()
  if (lastRow <= 1) return -1

  const values = sheet.getRange(2, 1, lastRow - 1, 1).getValues()
  for (var i = 0; i < values.length; i++) {
    if (String(values[i][0]) === String(recordId)) return i + 2
  }

  return -1
}

function writeRowByTable(sheet, table, rowIndex, recordId, data, updatedAt, deleted, operationId, deviceId) {
  let row

  if (table === 'log') {
    // Log 表：展開所有欄位
    row = [
      recordId,
      Number(data.timestamp) || 0,
      data.taskId || '',
      data.title || '',
      data.action || '',
      data.state || '',
      Number(data.duration) || 0,
      data.notes || '',
      updatedAt,
      deleted,
      operationId,
      deviceId,
    ]
  } else {
    // 其他表：提取 taskId + payloadJson
    const taskId = data.taskId || ''
    const payload = Object.assign({}, data)
    delete payload.taskId // 避免重複存儲

    row = [recordId, taskId, JSON.stringify(payload), updatedAt, deleted, operationId, deviceId]
  }

  const headers = getSheetHeaders(table)
  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 1, 1, headers.length).setValues([row])
  } else {
    sheet.appendRow(row)
  }
}

function readExistingData(sheet, table, rowIndex) {
  if (table === 'log') {
    // Log 表：讀取展開欄位
    const row = sheet.getRange(rowIndex, 1, 1, LOG_HEADERS.length).getValues()[0]
    return {
      id: row[0],
      timestamp: Number(row[1]) || 0,
      taskId: row[2],
      title: row[3],
      action: row[4],
      state: row[5],
      duration: Number(row[6]) || 0,
      notes: row[7],
    }
  } else {
    // 其他表：讀取 taskId + payloadJson
    const taskId = sheet.getRange(rowIndex, 2).getValue()
    const payloadJson = sheet.getRange(rowIndex, 3).getValue() || '{}'
    const payload = safeParseJson(payloadJson)
    payload.taskId = taskId
    return payload
  }
}

function mergePayload(prev, patch) {
  const merged = {}
  const p1 = prev || {}
  const p2 = patch || {}

  Object.keys(p1).forEach(function (k) {
    merged[k] = p1[k]
  })
  Object.keys(p2).forEach(function (k) {
    merged[k] = p2[k]
  })

  return merged
}

function safeParseJson(jsonText) {
  try {
    if (!jsonText) return {}
    if (typeof jsonText === 'object') return jsonText
    return JSON.parse(String(jsonText))
  } catch (e) {
    return {}
  }
}

function createJsonResponse(data) {
  const output = ContentService.createTextOutput(JSON.stringify(data))
  output.setMimeType(ContentService.MimeType.JSON)
  return output
}

function now() {
  return new Date().getTime()
}

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

// 測試函數
function testDoGet() {
  const response = doGet({ parameter: { action: 'sync-status' } })
  Logger.log(response.getContent())
}

function testDoPost() {
  const testData = {
    operations: [
      {
        type: 'add',
        table: 'task_pool',
        recordId: 'T_TEST_' + now(),
        data: {
          taskId: 'T_TEST_' + now(),
          title: '測試任務',
          status: 'PENDING',
          priority: 1,
        },
        timestamp: now(),
        deviceId: 'test-device',
        operationId: generateUUID(),
      },
    ],
  }

  const response = doPost({
    postData: {
      contents: JSON.stringify(testData),
    },
  })

  Logger.log(response.getContent())
}

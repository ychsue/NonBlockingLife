
/**
 * NonBlockingLife Sync API - MVP 版本
 * 
 * 功能：
 * - doGet: 拉取數據、查詢同步狀態
 * - doPost: 推送數據到 Google Sheets
 * 
 * 作者：您自己（運行在您的 Google 帳戶下）
 * 版本：1.0 MVP
 * 最後更新：2026-03-06
 */

// ==================== 配置 ====================

const CONFIG = {
  SHEET_NAME: 'NonBlockingLife_Tasks',  // 主表名稱
  MAX_ROWS: 10000,                      // 最大行數限制
  VERSION: '1.0.0'
};

// ==================== 主要處理函數 ====================

/**
 * 處理 GET 請求
 * 支援的操作：
 *   - ping: 測試連接
 *   - sync-status: 查詢同步狀態
 *   - pull: 拉取更新（根據 lastSync 時間戳）
 */
function doGet(e) {
  try {
    const action = e.parameter.action || 'ping';
    const lastSync = parseInt(e.parameter.lastSync) || 0;
    
    Logger.log(`GET 請求 - Action: ${action}, LastSync: ${lastSync}`);
    
    switch (action) {
      case 'ping':
        return createJsonResponse({
          status: 'ok',
          message: 'NonBlockingLife Sync API is running',
          version: CONFIG.VERSION,
          timestamp: now(),
          user: Session.getActiveUser().getEmail()
        });
      
      case 'sync-status':
        return getSyncStatus();
      
      case 'pull':
        return pullChanges(lastSync);
      
      default:
        return createJsonResponse({
          error: 'Unknown action',
          validActions: ['ping', 'sync-status', 'pull']
        }, 400);
    }
  } catch (error) {
    Logger.log('GET Error: ' + error.toString());
    return createJsonResponse({
      error: error.toString(),
      stack: error.stack
    }, 500);
  }
}

/**
 * 處理 POST 請求
 * 接收格式：
 * {
 *   operations: [
 *     { type: 'create', entityType: 'task', data: {...} },
 *     { type: 'update', entityType: 'task', id: '...', data: {...} }
 *   ]
 * }
 */
function doPost(e) {
  try {
    Logger.log('POST 請求收到');
    
    // 解析請求
    if (!e.postData || !e.postData.contents) {
      throw new Error('No post data received');
    }
    
    const payload = JSON.parse(e.postData.contents);
    const operations = payload.operations || [];
    
    Logger.log(`處理 ${operations.length} 個操作`);
    
    // 處理每個操作
    const results = [];
    for (let i = 0; i < operations.length; i++) {
      try {
        const result = processOperation(operations[i]);
        results.push({
          index: i,
          success: true,
          result: result
        });
      } catch (opError) {
        Logger.log(`操作 ${i} 失敗: ${opError.toString()}`);
        results.push({
          index: i,
          success: false,
          error: opError.toString()
        });
      }
    }
    
    // 統計結果
    const successCount = results.filter(r => r.success).length;
    const failCount = results.length - successCount;
    
    return createJsonResponse({
      status: 'completed',
      total: operations.length,
      success: successCount,
      failed: failCount,
      results: results,
      timestamp: now()
    });
    
  } catch (error) {
    Logger.log('POST Error: ' + error.toString());
    return createJsonResponse({
      status: 'error',
      error: error.toString(),
      stack: error.stack
    }, 500);
  }
}

// ==================== 核心功能 ====================

/**
 * 獲取同步狀態
 */
function getSyncStatus() {
  const sheet = getOrCreateSheet();
  const lastRow = sheet.getLastRow();
  const rowCount = lastRow > 1 ? lastRow - 1 : 0; // 扣除標題行
  
  // 獲取最後修改時間
  let lastModified = 0;
  if (lastRow > 1) {
    const timestampCol = 5; // timestamp 列
    const timestamps = sheet.getRange(2, timestampCol, lastRow - 1, 1).getValues();
    lastModified = Math.max(...timestamps.map(row => row[0] || 0));
  }
  
  return createJsonResponse({
    status: 'ok',
    sheetName: CONFIG.SHEET_NAME,
    rowCount: rowCount,
    lastModified: lastModified,
    timestamp: now(),
    user: Session.getActiveUser().getEmail()
  });
}

/**
 * 拉取變更（增量同步）
 */
function pullChanges(lastSync) {
  const sheet = getOrCreateSheet();
  const lastRow = sheet.getLastRow();
  
  if (lastRow <= 1) {
    return createJsonResponse({
      changes: [],
      timestamp: now(),
      message: 'No data found'
    });
  }
  
  // 獲取所有數據
  const dataRange = sheet.getRange(2, 1, lastRow - 1, 8);
  const data = dataRange.getValues();
  
  // 過濾出 timestamp > lastSync 的行
  const changes = data
    .filter(row => {
      const timestamp = row[4]; // timestamp 列
      return timestamp > lastSync;
    })
    .map(row => ({
      taskId: row[0],
      title: row[1],
      status: row[2],
      priority: row[3],
      timestamp: row[4],
      deviceId: row[5],
      operationId: row[6],
      deleted: row[7] || false
    }));
  
  Logger.log(`拉取 ${changes.length} 條變更（自 ${lastSync}）`);
  
  return createJsonResponse({
    changes: changes,
    count: changes.length,
    timestamp: now()
  });
}

/**
 * 處理單個操作
 */
function processOperation(operation) {
  const { type, entityType, data } = operation;
  
  // MVP 階段只支持 task
  if (entityType !== 'task') {
    throw new Error(`Unsupported entity type: ${entityType}`);
  }
  
  const sheet = getOrCreateSheet();
  
  switch (type) {
    case 'create':
      return createTask(sheet, data);
    
    case 'update':
      return updateTask(sheet, operation.id || data.taskId, data);
    
    case 'delete':
      return deleteTask(sheet, operation.id || data.taskId);
    
    default:
      throw new Error(`Unknown operation type: ${type}`);
  }
}

/**
 * 創建任務
 */
function createTask(sheet, data) {
  // 檢查是否已存在（防止重複）
  const existingRow = findTaskRow(sheet, data.taskId);
  if (existingRow > 0) {
    Logger.log(`Task ${data.taskId} 已存在，跳過創建`);
    return { action: 'skipped', reason: 'already exists' };
  }
  
  // 新增行
  const row = [
    data.taskId || generateUUID(),
    data.title || '',
    data.status || 'todo',
    data.priority || 0,
    data.timestamp || now(),
    data.deviceId || 'unknown',
    data.operationId || generateUUID(),
    false  // deleted
  ];
  
  sheet.appendRow(row);
  Logger.log(`創建任務: ${row[0]}`);
  
  return { action: 'created', taskId: row[0] };
}

/**
 * 更新任務
 */
function updateTask(sheet, taskId, data) {
  const rowIndex = findTaskRow(sheet, taskId);
  
  if (rowIndex <= 0) {
    // 如果不存在，創建它
    Logger.log(`Task ${taskId} 不存在，改為創建`);
    return createTask(sheet, { ...data, taskId });
  }
  
  // 更新數據
  if (data.title !== undefined) sheet.getRange(rowIndex, 2).setValue(data.title);
  if (data.status !== undefined) sheet.getRange(rowIndex, 3).setValue(data.status);
  if (data.priority !== undefined) sheet.getRange(rowIndex, 4).setValue(data.priority);
  sheet.getRange(rowIndex, 5).setValue(data.timestamp || now());
  if (data.deviceId !== undefined) sheet.getRange(rowIndex, 6).setValue(data.deviceId);
  if (data.operationId !== undefined) sheet.getRange(rowIndex, 7).setValue(data.operationId);
  
  Logger.log(`更新任務: ${taskId}`);
  
  return { action: 'updated', taskId: taskId };
}

/**
 * 刪除任務（軟刪除）
 */
function deleteTask(sheet, taskId) {
  const rowIndex = findTaskRow(sheet, taskId);
  
  if (rowIndex <= 0) {
    Logger.log(`Task ${taskId} 不存在，無法刪除`);
    return { action: 'skipped', reason: 'not found' };
  }
  
  // 軟刪除：標記 deleted = true
  sheet.getRange(rowIndex, 8).setValue(true);
  sheet.getRange(rowIndex, 5).setValue(now()); // 更新時間戳
  
  Logger.log(`刪除任務: ${taskId}`);
  
  return { action: 'deleted', taskId: taskId };
}

/**
 * 查找任務行號
 */
function findTaskRow(sheet, taskId) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return -1;
  
  const taskIds = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  
  for (let i = 0; i < taskIds.length; i++) {
    if (taskIds[i][0] === taskId) {
      return i + 2; // +2 因為：1 是標題行，數組從 0 開始
    }
  }
  
  return -1;
}

// ==================== 工具函數 ====================

/**
 * 獲取或創建 Sheet
 * 
 * 因為此 Apps Script 是從 Google Sheet 中建立的（bound script），
 * 可以直接用 getActiveSpreadsheet() 獲取綁定的 Sheet
 */
function getOrCreateSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  if (!ss) {
    throw new Error(
      '❌ 錯誤：此 Apps Script 未綁定到任何 Google Sheet\n' +
      '請確保您是從 Google Sheet 的「擴充功能 > Apps Script」建立的'
    );
  }
  
  let sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  
  if (!sheet) {
    Logger.log(`創建新表: ${CONFIG.SHEET_NAME}`);
    sheet = ss.insertSheet(CONFIG.SHEET_NAME);
    
    // 設置標題行
    const headers = [
      'taskId',
      'title',
      'status',
      'priority',
      'timestamp',
      'deviceId',
      'operationId',
      'deleted'
    ];
    
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
    
    // 設置列寬
    sheet.setColumnWidth(1, 200); // taskId
    sheet.setColumnWidth(2, 300); // title
    sheet.setColumnWidth(3, 100); // status
    sheet.setColumnWidth(4, 80);  // priority
    sheet.setColumnWidth(5, 150); // timestamp
    sheet.setColumnWidth(6, 150); // deviceId
    sheet.setColumnWidth(7, 200); // operationId
    sheet.setColumnWidth(8, 80);  // deleted
  }
  
  return sheet;
}

/**
 * 創建 JSON 響應
 */
function createJsonResponse(data, statusCode = 200) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  
  // 注意：GAS 不支持直接設置 HTTP 狀態碼，但可以在響應中包含狀態
  if (statusCode !== 200) {
    data.statusCode = statusCode;
  }
  
  return output;
}

/**
 * 獲取當前時間戳（毫秒）
 */
function now() {
  return new Date().getTime();
}

/**
 * 生成 UUID（簡化版）
 */
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}


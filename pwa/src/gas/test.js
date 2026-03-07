// ==================== 測試函數（可選） ====================

/**
 * 測試函數：手動測試 doGet
 */
function testDoGet() {
  const e = {
    parameter: {
      action: 'sync-status'
    }
  };
  
  const response = doGet(e);
  Logger.log(response.getContent());
}

/**
 * 測試函數：手動測試 doPost
 */
function testDoPost() {
  const testData = {
    operations: [
      {
        type: 'create',
        entityType: 'task',
        data: {
          taskId: 'test-' + now(),
          title: '測試任務',
          status: 'todo',
          priority: 1,
          timestamp: now(),
          deviceId: 'test-device',
          operationId: generateUUID()
        }
      }
    ]
  };
  
  const e = {
    postData: {
      contents: JSON.stringify(testData)
    }
  };
  
  const response = doPost(e);
  Logger.log(response.getContent());
}

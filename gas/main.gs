/**
 * NonBlockingLife - Core Engine v1.0
 */

const SS = SpreadsheetApp.getActiveSpreadsheet();
const SHEETS = {
  LOG: SS.getSheetByName("Log"),
  DASH: SS.getSheetByName("Dashboard"),
  POOL: SS.getSheetByName("Task_Pool")
};

// 1. 處理 iPhone 捷徑傳來的 POST 請求
function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  var action = data.action; // START, END, INBOX
  var taskId = data.taskId || generateId();
  var taskName = data.taskName;

  var result = {};

  switch (action) {
    case "START":
      result = handleStart(taskId, taskName);
      break;
    case "END":
      result = handleEnd(taskId);
      break;
    case "INBOX":
      result = handleInbox(data.content);
      break;
  }

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// 2. 處理開始任務
function handleStart(id, name) {
  var now = new Date();
  // 寫入 Log
  SHEETS.LOG.appendRow([now, id, name, "START", "MACRO", "RUNNING", ""]);
  // 更新 Dashboard (假設 Dashboard 第一行是標題，第二行是資料)
  SHEETS.DASH.getRange("A2:C2").setValues([[id, name, now]]);
  // 更新 Task_Pool 狀態 (這裡需要一個輔助函式來找行號)
  updateTaskStatus(id, "DOING");
  
  return { status: "success", message: "Task Started: " + name };
}

// 3. 處理結束任務
function handleEnd(id) {
  var now = new Date();
  var startAt = SHEETS.DASH.getRange("C2").getValue();
  var taskName = SHEETS.DASH.getRange("B2").getValue();
  
  // 計算持續時間 (分鐘)
  var duration = Math.round((now - new Date(startAt)) / 60000);
  
  // 寫入 Log
  SHEETS.LOG.appendRow([now, id, taskName, "END", "MACRO", "IDLE", "Duration: " + duration]);
  // 清空 Dashboard
  SHEETS.DASH.getRange("A2:C2").clearContent();
  // 更新 Task_Pool
  updateTaskStatus(id, "DONE", duration);
  
  return { 
    status: "success", 
    message: "Task Finished!", 
    duration: duration,
    recommend: "Check your microtasks now!" 
  };
}

// 輔助函式：產生短 ID
function generateId() {
  return "t" + new Date().getTime().toString(36);
}

// 輔助函式：更新 Task_Pool 中的狀態與時間 (需實作搜尋邏輯)
function updateTaskStatus(id, status, addTime = 0) {
  // 這裡之後要寫搜尋 Task_ID 並更新對應行數的邏輯
}

// 處理開始任務
function handleStart(taskId, taskName) {
  // 1. 檢查 Dashboard 是否有正在執行的
  const dashSheet = getSheet(NBL_CONFIG.SHEETS.DASH);
  const currentTask = dashSheet.getRange("A2").getValue();
  
  if (currentTask !== "") {
    return { status: "warning", message: "已有任務正在執行，請先中斷或結束。" };
  }

  const now = new Date();
  // 2. 更新 Dashboard
  dashSheet.getRange("A2:D2").setValues([[taskId, taskName, now, NBL_CONFIG.STATUS.RUNNING]]);
  
  // 3. 寫入 Log
  writeLog(taskId, taskName, "START", "MACRO", NBL_CONFIG.STATUS.RUNNING, "");
  
  // 4. 更新快取 (讓下次查詢變快)
  updateSelectionCache();

  return { status: "success", message: "任務啟動: " + taskName };
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

// 處理中斷 (Interrupt) TODO TODO TODO 1.note 沒用到 2. 沒有更新相應的Task的狀態
function handleInterrupt(note) {
  const dashSheet = getSheet(NBL_CONFIG.SHEETS.DASH);
  const taskId = dashSheet.getRange("A2").getValue();
  const taskName = dashSheet.getRange("B2").getValue();
  const startAt = dashSheet.getRange("C2").getValue();

  if (!taskId) return { status: "error", message: "目前無執行中任務可中斷。" };

  const now = new Date();
  const duration = Math.round((now - new Date(startAt)) / 60000);

  // 1. 寫入 Log (PAUSE)
  writeLog(taskId, taskName, "INTERRUPT", "MACRO", NBL_CONFIG.STATUS.IDLE, "Duration: " + duration + "m. " + note);
  
  // 2. 清空 Dashboard
  dashSheet.getRange("A2:E2").clearContent();
  
  return { status: "success", message: "任務已中斷並記錄。" };
}

// 更新選擇快取 TODO TODO TODO 還有很多改進的地方
function updateSelectionCache() {
  const poolSheet = getSheet(NBL_CONFIG.SHEETS.POOL);
  const cacheSheet = getSheet(NBL_CONFIG.SHEETS.CACHE);
  const poolData = poolSheet.getDataRange().getValues();
  
  let options = [];
  // 撈取狀態為 PENDING 的任務 (跳過標題行)
  for (let i = 1; i < poolData.length; i++) {
    if (poolData[i][2] === NBL_CONFIG.STATUS.PENDING) {
      options.push([poolData[i][0], poolData[i][1], "Pool"]);
    }
  }
  
  cacheSheet.getRange("A2:C100").clearContent(); // 先清空舊快取
  if (options.length > 0) {
    cacheSheet.getRange(2, 1, options.length, 3).setValues(options);
  }
}

// 通用 Log 寫入
function writeLog(id, title, action, cat, state, notes) {
  getSheet(NBL_CONFIG.SHEETS.LOG).appendRow([new Date(), id, title, action, cat, state, notes]);
}

// 檢查任務是否超時
function isTaskOverdue(startTime, limitMinutes) {
  const now = new Date();
  const diffMinutes = (now - new Date(startTime)) / 60000;
  return diffMinutes > limitMinutes;
}

export { isTaskOverdue };

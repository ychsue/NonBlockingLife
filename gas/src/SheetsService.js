import { getSheet, NBL_CONFIG } from "./Config";
import Utils from "./Utils";

const SYSTEM_IDs = ["SYS_INT"];

// 使用一個內部的 cache 物件
const _sheetCache = {};

const SheetsService = {
  /**
   * 內部的獲取 Sheet 方法，具備快取功能
   * @param {string} name
   * @returns {GoogleAppsScript.Spreadsheet.Sheet}
   */
  _getSafeSheet(name) {
    if (!_sheetCache[name]) {
      _sheetCache[name] = getSheet(name);
    }
    return _sheetCache[name];
  },

  /**
   *  取得 Dashboard 狀態
   *  @returns [ID, Name, StartAt, Status]
   */
  getDashboardState() {
    const sheet = this._getSafeSheet(NBL_CONFIG.SHEETS.DASH);
    return sheet.getRange("A2:D2").getValues()[0]; // [ID, Name, StartAt, Status]
  },

  // 更新 Dashboard
  updateDashboard(values) {
    const sheet = this._getSafeSheet(NBL_CONFIG.SHEETS.DASH);
    sheet.getRange("A2:D2").setValues([values]);
  },

  // 寫入日誌
  appendLog(row) {
    const sheet = this._getSafeSheet(NBL_CONFIG.SHEETS.LOG);
    sheet.appendRow(row);
  },

  // 清空 Dashboard
  clearDashboard() {
    const sheet = this._getSafeSheet(NBL_CONFIG.SHEETS.DASH);
    sheet.getRange("A2:D2").clearContent();
  },

  /**
   * 根據 ID 跨表搜尋 Task 資訊
   * @param {string} id
   * @returns { id: string, title: string, source: string, rowIndex: number, ... }
   */
  findTaskById(id) {
    const sheetsToSearch = [
      // NBL_CONFIG.SHEETS.POOL, // 公定開頭為 T 的任務會先當作 Task_Pool 的任務處理
      // NBL_CONFIG.SHEETS.SCHEDULED,
    ];
    if (id === "SYS_INT") {
      return {
        id: "SYS_INT",
        title: "System Interrupt Task",
        source: "SYSTEM",
      };
    } else if (id.startsWith("T")) {
      // 處理 Task_Pool
      const name = NBL_CONFIG.SHEETS.POOL;
      const sheet = this._getSafeSheet(name);
      if (!sheet) return null;
      const data = sheet
        .getDataRange()
        .getValues()
        .map((r, i) => ({ rowIndex: i + 1, data: r }));
      const theRow = data.find((r) => r.data[0].trim() === id.trim());
      if (theRow) {
        return {
          id: id,
          title: theRow.data[1],
          source: name,
          rowIndex: theRow.rowIndex,
          lastRunDate: theRow.data[7], // 假設第 8 欄是 Last_Run_Date
          spentToday: theRow.data[4], // 假設第 5 欄是 Spent_Today_Mins
          dailyLimit: theRow.data[5], // 假設第 6 欄是 Daily_Limit_Mins
          totalSpent: theRow.data[8], // 假設第 9 欄是 Total_Spent_Mins
        };
      } else {
        return null;
      }
    } else if (id.startsWith("S")) {
      // 處理 Scheduled_Tasks
      const name = NBL_CONFIG.SHEETS.SCHEDULED;
      const sheet = this._getSafeSheet(name);
      if (!sheet) return null;
      const data = sheet
        .getDataRange()
        .getValues()
        .map((r, i) => ({ rowIndex: i + 1, data: r }));
      const theRow = data.find((r) => r.data[0].trim() === id.trim());
      if (theRow) {
        return {
          id: id,
          title: theRow.data[1],
          source: name,
          rowIndex: theRow.rowIndex,
          cron_expr: theRow.data[3], // 假設第 4 欄是 cron expression
          before_task: theRow.data[4], // 假設第 5 欄是 before_task
          after_task: theRow.data[5], // 假設第 6 欄是 after_task
          callback: theRow.data[6], // 假設第 7 欄是 callback task_id
          lastRunDate: theRow.data[7], // 假設第 8 欄是 Last_Run_Date
          note: theRow.data[8], // 假設第 9 欄是 Note
          oldNextRun: theRow.data[9], // 假設第 10 欄是 Next_Run
        };
      } else {
        return null;
      }
    }
    return null;
  },

  // 在 SheetsService.js 內的邏輯片段
  updateTaskInPool(id, newStatus, addMins = 0) {
    const taskInfo = this.findTaskById(id); // 取得當前行數據
    const now = new Date();
    const todayStr = Utilities.formatDate(now, "GMT+8", "yyyy-MM-dd");
    const lastRunDate = new Date(taskInfo.lastRunDate); // 從 Sheet 讀到的最後執行日

    let spentToday = taskInfo.spentToday || 0;
    let totalSpent = taskInfo.totalSpent || 0;

    // 核心邏輯：如果換天了，重置今日統計
    if (isNaN(lastRunDate.getTime()) || todayStr !== Utilities.formatDate(lastRunDate, "GMT+8", "yyyy-MM-dd")) {
      spentToday = 0;
    }

    // 累加時間
    spentToday += addMins;
    totalSpent += addMins;

    // 寫回 Sheet
    const sheet = getSheet(NBL_CONFIG.SHEETS.POOL);
    sheet.getRange(taskInfo.rowIndex, 3).setValue(newStatus); // Status
    sheet.getRange(taskInfo.rowIndex, 5).setValue(spentToday); // Spent_Today_Mins
    sheet.getRange(taskInfo.rowIndex, 8).setValue(todayStr); // Last_Run_Date
    sheet.getRange(taskInfo.rowIndex, 9).setValue(totalSpent); // Total_Spent_Mins
  },

  updateScheduledTaskNextRun(id, nextRunDate, status = null) {
    const taskInfo = this.findTaskById(id);
    if (!taskInfo) return;
    return this.updateScheduledTaskNextRunByTaskInfo(
      taskInfo,
      nextRunDate,
      status,
    );
  },

  updateScheduledTaskNextRunByTaskInfo(taskInfo, nextRunDate, status = null) {
    const sheet = getSheet(NBL_CONFIG.SHEETS.SCHEDULED);
    sheet
      .getRange(taskInfo.rowIndex, 10)
      .setValue(
        nextRunDate ? Utilities.formatDate(nextRunDate, "GMT+8", "yyyy-MM-dd HH:mm:ss") : null,
      ); // 假設第 J 欄是 Next_Run 下一次執行時間
    if (status) {
      sheet.getRange(taskInfo.rowIndex, 3).setValue(status); // 假設第 C 欄是 Status
    }
  },

  // 之前的 updateTaskStatus 可以整合 rowIndex 提高效能
  updateTaskStatus(id, newStatus, addMins = 0) {
    const taskInfo = this.findTaskById(id);
    if (!taskInfo || SYSTEM_IDs.includes(id)) return taskInfo;

    return this.updateTaskStatusByTaskInfo(taskInfo, newStatus, addMins);
  },

  updateTaskStatusByTaskInfo(taskInfo, newStatus, addMins = 0) {
    if (SYSTEM_IDs.includes(taskInfo.id)) return taskInfo;
    
    const sheet = this._getSafeSheet(taskInfo.source);

    if (addMins > 0 && taskInfo.source === NBL_CONFIG.SHEETS.POOL) {
      this.updateTaskInPool(taskInfo.id, newStatus, addMins);
    } else {
      // 更新 Status (假設都在第 3 欄)
      sheet.getRange(taskInfo.rowIndex, 3).setValue(newStatus);
      const now = new Date();
      const todayStr = Utilities.formatDate(now, "GMT+8", "yyyy-MM-dd");
      sheet.getRange(taskInfo.rowIndex, 8).setValue(todayStr);
    }
    console.log(
      "Updated task status for ID:",
      taskInfo.id,
      "to",
      newStatus,
      "with added mins:",
      addMins,
    );
    return taskInfo;
  },

  addToInbox(row) {
    const sheet = this._getSafeSheet(NBL_CONFIG.SHEETS.INBOX);
    sheet.appendRow(row);
  },

  getAllScheduledTasks() {
    const sheet = this._getSafeSheet(NBL_CONFIG.SHEETS.SCHEDULED);
    const data = sheet.getDataRange().getValues();
    const tasks = data.slice(1).map((r, i) => ({
      id: r[0],
      title: r[1],
      status: r[2],
      cron_expr: r[3],
      before_task: r[4],
      after_task: r[5],
      callback: r[6],
      lastRunDate: r[7],
      note: r[8],
      nextRun: r[9], // 假設第 10 欄是 Next_Run
      rowIndex: i + 2, // 因為 slice(1) 跳過了標題列
      source: NBL_CONFIG.SHEETS.SCHEDULED,
    }));
    return tasks;
  },

  /**
   * 更新 Selection_Cache 內容
   */
  updateSelectionCache() {
    
    let {candidates, resetPoolTimeToZeroIndex, totalMinsPool} = Utils.calculateCandidates(
      this._getSafeSheet(NBL_CONFIG.SHEETS.POOL).getDataRange().getValues().slice(1),
      this._getSafeSheet(NBL_CONFIG.SHEETS.SCHEDULED).getDataRange().getValues().slice(1),
      this._getSafeSheet(NBL_CONFIG.SHEETS.MICRO_TASKS).getDataRange().getValues().slice(1)
    );

    // 將今日已用時間歸零的任務更新回 Task_Pool 表
    if (resetPoolTimeToZeroIndex.length > 0) {
      const poolSheet = this._getSafeSheet(NBL_CONFIG.SHEETS.POOL);
      resetPoolTimeToZeroIndex.forEach((rowIdx) => {
        poolSheet.getRange(rowIdx, 5).setValue(0); // 假設 Spent_Today_Mins 在第 5 欄
      });
    }
    
    // 寫入 Selection_Cache 表
    const cacheSheet = getSheet(NBL_CONFIG.SHEETS.CACHE);
    cacheSheet.clear();

    // 寫入標題行
    cacheSheet
      .getRange(1, 1, 1, 6)
      .setValues([["Task_ID", "Title", "Score", "Source","","Total_Mins_in_Pool"]]);

    // 寫入 Total_Mins_in_Pool
    cacheSheet.getRange(2, 6).setValue(totalMinsPool);

    if (candidates.length > 0) {
      // 關鍵：將物件陣列轉換為二維陣列 [ [id, title, score, src], [...] ]
      const rowsToDrive = candidates.map((c) => [
        c.taskId,
        c.title,
        c.score,
        c.source,
      ]);

      // 限制前 20 筆
      const finalData = rowsToDrive.slice(0, 20);
      cacheSheet.getRange(2, 1, finalData.length, 4).setValues(finalData);
    }
  },
};

export { SheetsService, SYSTEM_IDs};

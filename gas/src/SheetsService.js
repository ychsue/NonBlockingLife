import { NBL_CONFIG } from "./Config";

const SheetsService = {
  // 取得 Dashboard 狀態
  getDashboardState() {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(
      NBL_CONFIG.SHEETS.DASH
    );
    return sheet.getRange("A2:D2").getValues()[0]; // [ID, Name, StartAt, Status]
  },

  // 更新 Dashboard
  updateDashboard(values) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(
      NBL_CONFIG.SHEETS.DASH
    );
    sheet.getRange("A2:D2").setValues([values]);
  },

  // 寫入日誌
  appendLog(row) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(
      NBL_CONFIG.SHEETS.LOG
    );
    sheet.appendRow(row);
  },

  // 清空 Dashboard
  clearDashboard() {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(
      NBL_CONFIG.SHEETS.DASH
    );
    sheet.getRange("A2:D2").clearContent();
  },

  // 根據 ID 跨表搜尋 Task 資訊
  findTaskById(id) {
    const sheetsToSearch = [
      NBL_CONFIG.SHEETS.POOL,
      NBL_CONFIG.SHEETS.MICRO,
      NBL_CONFIG.SHEETS.PERIODIC,
      NBL_CONFIG.SHEETS.ASYNC,
    ];
    for (let name of sheetsToSearch) {
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
      if (!sheet) continue;
      const data = sheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === id) {
          if (name === NBL_CONFIG.SHEETS.POOL) {
            return {
              id: id,
              title: data[i][1],
              source: name,
              rowIndex: i + 1,
              lastRunDate: data[i][7], // 假設第 8 欄是 Last_Run_Date
              spentToday: data[i][4], // 假設第 5 欄是 Spent_Today_Mins
              totalSpent: data[i][8], // 假設第 9 欄是 Total_Spent_Mins
            };
          } else if (name === NBL_CONFIG.SHEETS.PERIODIC) {
            return {
              id: id,
              title: data[i][1],
              source: name,
              rowIndex: i + 1,
              frequency: data[i][3], // 假設第 4 欄是 Frequency
              lastRunDate: data[i][4], // 假設第 5 欄是 Last_Run_Date
            };
          } else {
            return {
              id: id,
              title: data[i][1],
              source: name,
              rowIndex: i + 1,
            };
          }
        }
      }
    }
    return null;
  },

  // 在 SheetsService.js 內的邏輯片段
  updateTaskInPool(id, newStatus, addMins = 0) {
    const taskInfo = this.findTaskById(id); // 取得當前行數據
    const now = new Date();
    const todayStr = Utilities.formatDate(now, "GMT+8", "yyyy-MM-dd");
    const lastRunDate = taskInfo.lastRunDate; // 從 Sheet 讀到的最後執行日

    let spentToday = taskInfo.spentToday || 0;
    let totalSpent = taskInfo.totalSpent || 0;

    // 核心邏輯：如果換天了，重置今日統計
    if (lastRunDate !== todayStr) {
      spentToday = 0;
    }

    // 累加時間
    spentToday += addMins;
    totalSpent += addMins;

    // 寫回 Sheet
    const sheet = getSheet("Task_Pool");
    sheet.getRange(taskInfo.rowIndex, 3).setValue(newStatus); // Status
    sheet.getRange(taskInfo.rowIndex, 5).setValue(spentToday); // Spent_Today_Mins
    sheet.getRange(taskInfo.rowIndex, 8).setValue(todayStr); // Last_Run_Date
    sheet.getRange(taskInfo.rowIndex, 9).setValue(totalSpent); // Total_Spent_Mins
  },

  // 之前的 updateTaskStatus 可以整合 rowIndex 提高效能
  updateTaskStatus(id, newStatus, addMins = 0) {
    const taskInfo = this.findTaskById(id);
    if (!taskInfo) return;

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(
      taskInfo.source
    );

    if (addMins > 0 && taskInfo.source === "Task_Pool") {
      this.updateTaskInPool(id, newStatus, addMins);
    } else {
      // 更新 Status (假設都在第 3 欄)
      sheet.getRange(taskInfo.rowIndex, 3).setValue(newStatus);
    }
    console.log('Updated task status for ID:', id, 'to', newStatus, 'with added mins:', addMins);
    return taskInfo;
  },

  addToInbox(row) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Inbox");
    sheet.appendRow(row);
  }
};

export { SheetsService };

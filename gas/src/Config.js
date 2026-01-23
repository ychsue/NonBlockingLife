const NBL_CONFIG = {
  SHEETS: {
    LOG: "Log",
    DASH: "Dashboard",
    INBOX: "Inbox",
    POOL: "Task_Pool",
    CACHE: "Selection_Cache",
    SCHEDULED: "Scheduled",
    MICRO_TASKS: "Micro_Tasks",
  },
  /** 用於 Task_Pool, Scheduled, Micro_Tasks 的 Status 欄位 */
  TASK_STATUS: {
    PENDING: "PENDING", // 準備好執行
    WAITING: "WAITING", // 等待回調 (Future)
    DOING: "DOING", // 執行中
    DONE: "DONE", // 已完成
    FUTURE: "FUTURE", // 暫不執行 (Imaging)
    DISABLED: "DISABLED", // 已停用
  },
  /** 用於 Log 的 Action 欄位 */
  LOG_ACTION: {
    START: "START",
    END: "END",
    INTERRUPT: "INTERRUPT",
    ADD: "ADD_INBOX",
  },
};

function getSheet(name) {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
}

export { NBL_CONFIG, getSheet };

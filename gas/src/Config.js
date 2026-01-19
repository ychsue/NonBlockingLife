const NBL_CONFIG = {
  SHEETS: {
    LOG: "Log",
    DASH: "Dashboard",
    INBOX: "Inbox",
    POOL: "Task_Pool",
    MICRO: "Micro_Tasks",
    CACHE: "Selection_Cache",
    PERIODIC: "Periodic_Config",
    ASYNC: "Async_Await",
  },
  STATUS: {
    PENDING: "PENDING",
    DOING: "DOING",
    DONE: "DONE",
    IDLE: "IDLE",
    RUNNING: "RUNNING"
  }
};

function getSheet(name) {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
}

export { NBL_CONFIG, getSheet };

const NBL_CONFIG = {
  SHEETS: {
    LOG: "Log",
    DASH: "Dashboard",
    INBOX: "Inbox",
    POOL: "Task_Pool",
    CACHE: "Selection_Cache",
    SCHEDULED: "Scheduled",
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

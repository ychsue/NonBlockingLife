import Utils from "./Utils.js";
import { SheetsService } from "./SheetsService.js";
import { NBL_CONFIG } from "./Config";
import { message } from "./Message.js";

/**
 * 開始一個任務
 * @param {string} taskId
 * @param {string} note
 * @param {Object} service
 * @returns {
 *  status: "success" | "error" | "warning",
 *  message: string,
 *  payload?: {id: string, title: string, source: string}
 * }
 */
function handleStart(taskId, note, service = SheetsService) {
  // 0. 透過 Service 檢查現況
  const [currentId, currentNote, currentStartAt] = service.getDashboardState();

  if (currentId) {
    return message({
      status: "warning",
      message: `已有任務正在執行: ${currentId} - ${currentNote} (開始於 ${currentStartAt})`,
    });
  }

  // 1. 自動尋找 Task Title
  const taskInfo = service.findTaskById(taskId);
  if (!taskInfo)
    return message({ status: "error", message: "找不到該任務 ID" });

  const now = new Date();
  const id = taskId || Utils.generateId();

  // 2. 執行更新
  service.updateDashboard([id, note, now, NBL_CONFIG.STATUS.RUNNING]);
  if (id === taskId) service.updateTaskStatus(id, NBL_CONFIG.STATUS.DOING); // 更新 Pool 狀態 // TODO TODO TODO
  service.appendLog([
    now,
    id,
    taskInfo.title,
    "START",
    taskInfo.source,
    NBL_CONFIG.STATUS.RUNNING,
    note,
  ]);

  return message({
    status: "success",
    message: `任務已開始: ${id} - ${taskInfo.title}`,
    payload: { id: id, title: taskInfo.title, source: taskInfo.source },
  });
}

/**
 * 結束目前任務
 * @param {string} info 結束時的額外訊息
 * @param {object} service SheetsService
 * @returns {
 *  status: "success" | "error" | "warning",
 *  message: string,
 *  payload?: {id: string, title: string, source: string, duration: number}
 * }
 */
function handleEnd(info = "", service = SheetsService) {
  const [id, name, startAt] = service.getDashboardState();
  if (!id) return message({ status: "error", message: "目前無執行中任務" });

  const now = new Date();
  const duration = Utils.calculateDuration(startAt, now);

  // 執行結束邏輯
  service.clearDashboard();
  var taskinfo = service.updateTaskStatus(id, NBL_CONFIG.STATUS.DONE, duration); // 更新 Pool 狀態 // TODO TODO TODO
  console.log("taskinfo in handleEnd:", taskinfo);
  service.appendLog([
    now,
    id,
    taskinfo.title,
    "END",
    taskinfo.source,
    NBL_CONFIG.STATUS.DONE,
    `"Duration: ${duration}m", "${name}->${info ?? "END"}"`,
  ]);

  return message({
    status: "success",
    message: `任務已結束: ${id} - ${taskinfo.title}, 持續時間: ${duration} 分鐘`,
    payload: {
      id: id,
      title: taskinfo.title,
      source: taskinfo.source,
      duration: duration,
    },
  });
}

/**
 * 新增靈感至 Inbox
 * @param {string} title 
 * @param {typeof SheetsService} service 
 * @returns {
 *    status: "success" | "error" | "warning",
 *    message: string,
 *    taskId: string
 * }
 */
function handleAddInbox(title, service = SheetsService) {
  const now = new Date();
  const id = Utils.generateId();

  // 1. 存入 Inbox Sheet
  service.addToInbox([id, title, now]);
  
  // 2. 紀錄 Log (Action 記為 ADD_INBOX)
  service.appendLog([now, id, title, "ADD_INBOX", "INBOX", "IDLE", "來自快捷輸入"]);

  return { 
    status: "success", 
    taskId: id, 
    message: `已存入 Inbox: ${title}` 
  };
}

export { handleStart, handleEnd, handleAddInbox };
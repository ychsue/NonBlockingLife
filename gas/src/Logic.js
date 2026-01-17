import Utils from "./Utils.js";
import { SheetsService } from "./SheetsService.js";
import { NBL_CONFIG } from "./Config";

function handleStart(taskId, note, service = SheetsService) {
  // 0. 透過 Service 檢查現況
  const [currentId, currentNote, currentStartAt] = service.getDashboardState();

  if (currentId) {
    return { status: "warning", message: `已有任務正在執行: ${currentId} - ${currentNote} (開始於 ${currentStartAt})` };
  }

  // 1. 自動尋找 Task Title
  const taskInfo = service.findTaskById(taskId);
  if (!taskInfo) return { status: "error", message: "找不到該任務 ID" };

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

  return { status: "success", taskId: id, title: taskInfo.title };
}

function handleEnd(service = SheetsService) {
  const [id, name, startAt] = service.getDashboardState();
  if (!id) return { status: "error", message: "目前無執行中任務" };

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
    `Duration: ${duration}m, ${name}`,
  ]);

  return { status: "success", duration: duration };
}

export { handleStart, handleEnd };

import { SheetsService } from "./SheetsService";
import Utils from "./Utils";
import { NBL_CONFIG } from "./Config";

/**
 * 定時檢查：將到期的 WAITING 任務喚醒為 PENDING
 * 設定為每 15 分鐘（或每分鐘）執行一次
 */
function checkTimers(service_in = SheetsService) {
  // 如果 service_in 的 getAllScheduledTasks 方法不存在，或者不是函數，則使用預設的 SheetsService
  if (
    !service_in ||
    typeof service_in.getAllScheduledTasks !== "function"
  ) {
    service_in = SheetsService;
  }
  const service = service_in;
  const now = new Date();

  // 1. 獲取 Scheduled 表中所有任務
  const tasks = service.getAllScheduledTasks();

  tasks.forEach((task) => {
    if (task.status === NBL_CONFIG.TASK_STATUS.WAITING && task.nextRun) {
      const nextRunDate = new Date(task.nextRun);
      const before_mins = Utils.parseToMinutes(task.before_task || "0") || 0;
      const remindStart = new Date(nextRunDate.getTime() - before_mins * 60000);

      // 判斷是否進入「可執行區間」
      if (now >= remindStart) {
        service.updateTaskStatusByTaskInfo(
          task,
          NBL_CONFIG.TASK_STATUS.PENDING,
        );
        console.log(`喚醒任務: ${task.title}`);
      }
    }
  });

  // 喚醒完畢後，也刷一下快取，確保選單同步
  service.updateSelectionCache();
}

export { checkTimers };
import Utils from "./Utils.js";
import { SheetsService } from "./SheetsService.js";
import { getSheet, NBL_CONFIG } from "./Config";
import { message } from "./Message.js";

/**
 * 開始一個任務
 * @param {string} taskId
 * @param {string} note
 * @param {typeof SheetsService} service
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
  service.updateDashboard([id, note, now, NBL_CONFIG.TASK_STATUS.DOING]);
  if (id === taskId) service.updateTaskStatusByTaskInfo(taskInfo, NBL_CONFIG.TASK_STATUS.DOING); // 更新 Pool 狀態 // TODO TODO TODO
  service.appendLog([
    now,
    id,
    taskInfo.title,
    "START",
    taskInfo.source,
    NBL_CONFIG.TASK_STATUS.DOING,
    ,
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
 * @param {typeof SheetsService} service SheetsService
 * @returns {
 *  status: "success" | "error" | "warning",
 *  message: string,
 *  payload?: {id: string, title: string, source: string, duration: number}
 * }
 */
function handleEnd(info = "", service = SheetsService, isInterrupt = false) {
  const [id, name, startAt] = service.getDashboardState();
  if (!id) {
    if (isInterrupt) {
      return message({ status: "success", message: "目前無執行中任務，無須中斷一般任務" });
    }
    return message({ status: "error", message: "目前無執行中任務" });
  }

  const taskinfo = service.findTaskById(id);
  if (!taskinfo)
    return message({ status: "error", message: "找不到該任務 ID 的相關資訊" });

  let nextStatus = NBL_CONFIG.TASK_STATUS.DONE; // 預設結束後為 DONE
  if (taskinfo.source === NBL_CONFIG.SHEETS.SCHEDULED) {
    nextStatus = NBL_CONFIG.TASK_STATUS.WAITING; // Scheduled 任務結束後改為 WAITING
  } else if (taskinfo.source === NBL_CONFIG.SHEETS.POOL) {
    nextStatus = NBL_CONFIG.TASK_STATUS.PENDING; // Pool 任務結束後改為 PENDING
  }


  const now = new Date();
  const duration = Utils.calculateDuration(startAt, now);

  // 執行結束邏輯
  service.updateTaskStatusByTaskInfo(taskinfo, nextStatus, duration); // 更新 Pool 狀態 // TODO TODO TODO
  // console.log("taskinfo in handleEnd:", taskinfo);
  service.clearDashboard();
  const note = isInterrupt ? `任務被中斷，執行 ${duration}m` : `"${name}->${info ?? "END"}"`;
  service.appendLog([
    now,
    id,
    taskinfo.title,
    isInterrupt ? "INTERRUPT" : "END",
    taskinfo.source,
    nextStatus,
    duration,
    note,
  ]);

  // # For Scheduled Task: 要更新他自己的 NextRun
  /** @type {Date | null} */
  let nextRunDate = null;
  if (taskinfo.source === NBL_CONFIG.SHEETS.SCHEDULED && taskinfo.cron_expr) {
    nextRunDate = Utils.getNextOccurrence(taskinfo.cron_expr, now);
    // 若nextRunDate 小於 oldNextRun => oldNextRun 為主 (避免時間倒退)
    if (taskinfo.oldNextRun) {
      const oldNextRunDate = new Date(taskinfo.oldNextRun);
      if (nextRunDate < oldNextRunDate) {
        nextRunDate = oldNextRunDate;
      } else if (nextRunDate.getTime() === oldNextRunDate.getTime()) {
        // 相等的話，得跳下一個可用的時間
        nextRunDate = Utils.getNextOccurrence(taskinfo.cron_expr, new Date(oldNextRunDate.getTime() + 60000));
      }
    }
    service.updateScheduledTaskNextRunByTaskInfo(taskinfo, nextRunDate, NBL_CONFIG.TASK_STATUS.WAITING);
  } else if (taskinfo.source === NBL_CONFIG.SHEETS.SCHEDULED) {
    // 沒有 cron_expr 的 Scheduled 任務，結束後要設為 WAITING，並清空 NextRun
    service.updateScheduledTaskNextRunByTaskInfo(taskinfo, null, NBL_CONFIG.TASK_STATUS.WAITING);
  }
  // ## For Scheduled Task: 檢查是否有後續任務需要啟動
  let nextTaskTime = new Date();
  /** @type {number | null} */
  let delayMinutes = null;
  if (taskinfo.callback) {
    const stDelay = taskinfo.after_task; // 預設沒有延遲，與 cron 表達式一樣
    delayMinutes = stDelay ? Utils.parseToMinutes(stDelay) : 0;
    nextTaskTime = new Date(now.getTime() + delayMinutes * 60000);

    service.updateScheduledTaskNextRun(taskinfo.callback, nextTaskTime, NBL_CONFIG.TASK_STATUS.PENDING);
  }

  // 最後更新快取，可能會花些時間
  service.updateSelectionCache();

  return message({
    status: "success",
    message: `任務已結束: ${id} - ${taskinfo.title}, 持續時間: ${duration} 分鐘 ${taskinfo.callback ? `，後續任務 ${taskinfo.callback} 已排程在 ${nextTaskTime.toLocaleTimeString("zh-TW")}` : ""}`,
    payload: {
      id: id,
      title: taskinfo.title,
      source: taskinfo.source,
      duration: duration,
      callback: taskinfo.callback || null,
      nextRunDate: nextRunDate ? nextRunDate.toISOString() : null,
      delayMinutes: delayMinutes,
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
  const id = Utils.generateId("I");

  // 1. 存入 Inbox Sheet
  service.addToInbox([id, title, now]);

  // 2. 紀錄 Log (Action 記為 ADD_INBOX)
  service.appendLog([
    now,
    id,
    title,
    "ADD_INBOX",
    "INBOX",
    "IDLE",
    ,
    "來自快捷輸入",
  ]);

  return {
    status: "success",
    taskId: id,
    message: `已存入 Inbox: ${title}`,
  };
}

/**
 * 下達中斷指令
 * @param {typeof SheetsService} service 提供服務的物件
 * @returns {
 *   status: "success" | "error" | "warning",
 *   message: string,
 *   isInterrupt?: boolean
 * }
 */
function handleInterrupt(service = SheetsService) {
  const now = new Date();
  const [oldId, oldNote, startAt] = service.getDashboardState();

  // 1. 如果有舊任務，先強制結算
  if (oldId) {
    handleEnd("被中斷以處理突發狀況", service, true);
  }

  // 2. 啟動匿名中斷任務
  const intId = "SYS_INT";
  const intTitle = "[中斷] 處理突發狀況";
  service.updateDashboard([intId, intTitle, now, NBL_CONFIG.TASK_STATUS.DOING]);
  service.appendLog([
    now,
    intId,
    intTitle,
    "START",
    "SYSTEM",
    "BUSY",
    ,
    "系統自動掛載中斷計時",
  ]);

  return {
    status: "success",
    message: "已切換至中斷計時模式，專心處理眼前事吧！",
    isInterrupt: true,
  };
}

function handleQueryOptions() {
  const service = SheetsService;
  
  // 1. 取得 Dashboard 狀態 (用於捷徑端的邏輯分支)
  const [currentId, currentTitle, startAt, status] = service.getDashboardState();
  
  // 2. 取得快取表的所有候選任務
  const cacheSheet = getSheet(NBL_CONFIG.SHEETS.CACHE);
  const data = cacheSheet.getDataRange().getValues().slice(1); // 跳過標題
  
  // 3. 格式化為捷徑好讀的清單，得分成keys=display*n & options:{display:{taskId, title, score, source}}*n
  const shortcutDict = data.reduce((acc, r) => {
    const taskId = r[0];
    const title = r[1];
    const score = r[2];
    const source = r[3];
    const due = score >= 500;
    const display = `${score<=0?"🎉":""} ${due ? "🔥" : ""} ${Utils.getSourceEmoji(source)} ${title}`;
    acc.displays.push(display);
    acc.options[display] = { taskId, title, score, source, due };
    return acc;
  }, { displays: [], options: {} });

  // 4. 計算目前任務已執行時間
  let spentMins = data[0] ? parseInt(data[0][5]) || 0 : 0; // 從 Total_Mins_in_Pool 欄位讀取


  return {
    status: "success",
    system_state: currentId ? "RUNNING" : "IDLE",
    current_task: currentTitle || "無",
    displays: shortcutDict.displays,
    options: shortcutDict.options,
    total_candidates: data.length,
    spent_pool: Utils.minutesToTimeString(spentMins),
    due_count: shortcutDict.displays.filter(d => d.startsWith("🔥")).length,
  };
}

/**
 * 加入一行來自iOS的排程任務
 * @param {string} title 
 * @param {string|Date} nextRun 
 * @param {string|number} remind_before_minutes 
 * @param {string} note 
 * @param {typeof SheetsService} service 
 */
function handleAddScheduledTask(title, nextRun, remind_before_minutes, note, service = SheetsService) {
  const now = new Date();
  const id = Utils.generateId("S");
  console.log("handleAddScheduledTask:", {title, nextRun, remind_before_minutes, note});
  const nextRunDate = new Date(nextRun);
  console.log("Parsed nextRunDate:", nextRunDate);
  const before_task = remind_before_minutes ?? '1d'; // 預設提前1天提醒

  // 1. 存入 Scheduled Tasks Sheet
  service.addToScheduledTasks({id, title, status: NBL_CONFIG.TASK_STATUS.WAITING, before_task, note, nextRunDate});
}

export { handleStart, handleEnd, handleAddInbox, handleInterrupt, handleQueryOptions, handleAddScheduledTask };

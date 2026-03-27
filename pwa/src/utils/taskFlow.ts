import { applyChange, db } from "../db/index";
import type {
  Dashboard,
  SelectionCacheItem,
  ScheduledItem,
  TaskPoolItem,
} from "../db/schema";
import Utils from "../../../gas/src/Utils";
import { triggerShortcutTimer, getShortcutConfig } from "./shortcutUtils";
import { parseToMinutes } from "./candidateUtils";

const DEV_CLIENT_ID = "dev-task-flow";
const DEFAULT_FOCUS_TIME_MINUTES = 30;

const SOURCE_TABLE_MAP: Record<
  string,
  "task_pool" | "scheduled" | "micro_tasks"
> = {
  Task_Pool: "task_pool",
  Scheduled: "scheduled",
  Micro_Tasks: "micro_tasks",
};

export async function getRunningTask(): Promise<Dashboard | null> {
  const rows = await db.dashboard.toArray();
  return rows[0] ?? null;
}

export async function startTask(candidate: SelectionCacheItem, note: string) {
  const existing = await getRunningTask();
  if (existing) {
    return {
      status: "warning",
      message: `已有任務正在執行: ${existing.taskId}`,
    };
  }

  const source = candidate.source;
  if (!source || !SOURCE_TABLE_MAP[source]) {
    return {
      status: "error",
      message: "任務來源不明，無法開始。",
    };
  }

  const sourceTable = SOURCE_TABLE_MAP[source]

  const now = Date.now();
  const dashboardRow: Dashboard = {
    taskId: candidate.taskId,
    title: candidate.title,
    source,
    notes: note,
    startAt: now,
    systemStatus: "DOING",
  };

  await applyChange({
    table: "dashboard",
    recordId: dashboardRow.taskId,
    op: "add",
    patch: dashboardRow as unknown as Record<string, unknown>,
    clientId: DEV_CLIENT_ID,
  });

  await applyChange({
    table: SOURCE_TABLE_MAP[source],
    recordId: candidate.taskId,
    op: "update",
    patch: {
      status: "DOING",
      lastRunDate: now,
      lastRun: now,
    },
    clientId: DEV_CLIENT_ID,
  });

  await applyChange({
    table: "log",
    recordId: `log_${candidate.taskId}_${now}`,
    op: "add",
    patch: {
      timestamp: now,
      taskId: candidate.taskId,
      title: candidate.title,
      action: "START",
      category: source,
      state: "DOING",
      notes: note,
    },
    clientId: DEV_CLIENT_ID,
  });

  // 如果是 iPhone 用户，触发 Shortcut 启动计时器
  const focusTime = await getFocusTimeBySource(sourceTable, candidate.taskId)
  const timerMinutes = resolveStartTimerMinutes(focusTime)
  // if (timerMinutes > 0) { // 想想就算0也傳0回去好了，讓使用者可以選擇不啟動計時器
    const shortcutConfig = getShortcutConfig("start");
    shortcutConfig.timerMinutes = timerMinutes
    triggerShortcutTimer(candidate.title ?? "", candidate.taskId, shortcutConfig);
  // }

  return { status: "success", message: "任務已開始" };
}

export async function endTask(endNote: string, isInterrupt = false) {
  let timerMinutes = 10; // 默認中斷後的預設計時器時間
  const running = await getRunningTask();
  if (!running) {
    return { status: "warning", message: "目前無執行中任務" };
  }

  const now = Date.now();
  const duration = running.startAt
    ? Utils.calculateDuration(running.startAt, now)
    : 0;
  const finalNote = isInterrupt
    ? `任務被中斷${endNote ? ` - ${endNote}` : ""}`
    : endNote;
  const action = isInterrupt ? "INTERRUPT" : "END";
  const state = isInterrupt ? "BUSY" : "DONE";

  if (running.source === "Task_Pool") {
    const task = await db.task_pool.get(running.taskId);
    await updateTaskPoolAfterEnd(task, now, duration);
  } else if (running.source === "Scheduled") {
    const task = await db.scheduled.get(running.taskId);
    await updateScheduledAfterEnd(task, now);
    timerMinutes = parseToMinutes(task?.remindAfter) ?? timerMinutes;
  } else if (running.source === "Micro_Tasks") {
    await applyChange({
      table: "micro_tasks",
      recordId: running.taskId,
      op: "update",
      patch: {
        status: "DONE",
        lastRunDate: now,
      },
      clientId: DEV_CLIENT_ID,
    });
  }

  await applyChange({
    table: "log",
    recordId: `log_${running.taskId}_${now}`,
    op: "add",
    patch: {
      timestamp: now,
      taskId: running.taskId,
      title: running.title,
      action,
      category: running.source,
      state,
      duration,
      notes: finalNote,
    },
    clientId: DEV_CLIENT_ID,
  });

  await applyChange({
    table: "dashboard",
    recordId: running.taskId,
    op: "delete",
    patch: {},
    clientId: DEV_CLIENT_ID,
  });

  // 如果是 iPhone 用户，觸發 Shortcut 結束計時器
  if (!!!isInterrupt) {
    const shortcutConfig = getShortcutConfig("end");
    shortcutConfig.timerMinutes = timerMinutes;
    triggerShortcutTimer(running.title ?? "", running.taskId, shortcutConfig);
  }

  return { status: "success", message: "任務已結束", duration };
}

export async function interruptTask(endNote: string) {
  const running = await getRunningTask();

  // 如果有正在執行的任務，先結束它
  if (running) {
    const result = await endTask(endNote, true);
    if (result.status !== "success") {
      return result;
    }
  }

  // 無論是否有舊任務，都啟動中斷任務
  const now = Date.now();
  const interruptId = "SYS_INT";
  const interruptTitle = "[中斷] 處理突發狀況";
  const dashboardRow: Dashboard = {
    taskId: interruptId,
    title: interruptTitle,
    source: "SYSTEM",
    notes: "",
    startAt: now,
    systemStatus: "DOING",
  };

  await applyChange({
    table: "dashboard",
    recordId: interruptId,
    op: "add",
    patch: dashboardRow as unknown as Record<string, unknown>,
    clientId: DEV_CLIENT_ID,
  });

  await applyChange({
    table: "log",
    recordId: `log_${interruptId}_${now}`,
    op: "add",
    patch: {
      timestamp: now,
      taskId: interruptId,
      title: interruptTitle,
      action: "START",
      category: "SYSTEM",
      state: "BUSY",
      notes: "系統自動掛載中斷計時",
    },
    clientId: DEV_CLIENT_ID,
  });

  return {
    status: "success",
    message: "已切換至中斷計時模式",
    payload: dashboardRow,
  };
}

async function updateTaskPoolAfterEnd(
  task: TaskPoolItem | undefined,
  now: number,
  duration: number,
) {
  if (!task) return;

  const lastRun = task.lastRunDate ? new Date(task.lastRunDate) : null;
  const todayStr = new Date(now).toDateString();
  let spentToday = task.spentTodayMins || 0;
  let totalSpent = task.totalSpentMins || 0;

  if (
    !lastRun ||
    isNaN(lastRun.getTime()) ||
    lastRun.toDateString() !== todayStr
  ) {
    spentToday = 0;
  }

  spentToday += duration;
  totalSpent += duration;

  await applyChange({
    table: "task_pool",
    recordId: task.taskId,
    op: "update",
    patch: {
      status: "PENDING",
      spentTodayMins: spentToday,
      totalSpentMins: totalSpent,
      lastRunDate: now,
    },
    clientId: DEV_CLIENT_ID,
  });
}

async function updateScheduledAfterEnd(
  task: ScheduledItem | undefined,
  now: number,
) {
  if (!task) return;

  let nextRun: number | null = null;

  // * 1. 如果有 callback，則更新 callback 的 nextRun 為 now + remindAfter??0
  if (task.callback) {
    // 先找到 title 為 callback 的 scheduled 任務
    const callbackTask = await db.scheduled
      .where("title")
      .equals(task.callback)
      .first();
    if (callbackTask) {
      const remindAfterMins = parseToMinutes(task.remindAfter) || 0;
      const callbackNextRun = now + remindAfterMins * 60 * 1000;
      await applyChange({
        table: "scheduled",
        recordId: callbackTask.taskId,
        op: "update",
        patch: {
          nextRun: callbackNextRun,
        },
        clientId: DEV_CLIENT_ID,
      });
    }
  }
  // * 2. 如果有 cron 表達式，計算下一次執行時間，若沒有則設為 null
  if (task.cronExpr) {
    let nextRunDate = Utils.getNextOccurrence(task.cronExpr, new Date(now));
    const oldNextRun = task.nextRun ? new Date(task.nextRun) : null;

    if (nextRunDate && oldNextRun) {
      if (nextRunDate.getTime() < oldNextRun.getTime()) {
        nextRunDate = oldNextRun;
      } else if (nextRunDate.getTime() === oldNextRun.getTime()) {
        nextRunDate = Utils.getNextOccurrence(
          task.cronExpr,
          new Date(oldNextRun.getTime() + 60000),
        );
      }
    }

    nextRun = nextRunDate ? nextRunDate.getTime() : null;
  } else {
    nextRun = null;
  }

  await applyChange({
    table: "scheduled",
    recordId: task.taskId,
    op: "update",
    patch: {
      status: "WAITING",
      lastRun: now,
      nextRun,
    },
    clientId: DEV_CLIENT_ID,
  });
}

async function getFocusTimeBySource(
  sourceTable: "task_pool" | "scheduled" | "micro_tasks",
  taskId: string,
): Promise<number | undefined> {
  if (sourceTable === "task_pool") {
    const row = await db.task_pool.get(taskId)
    return row?.focusTime
  }

  if (sourceTable === "scheduled") {
    const row = await db.scheduled.get(taskId)
    return row?.focusTime
  }

  const row = await db.micro_tasks.get(taskId)
  return row?.focusTime
}

function resolveStartTimerMinutes(focusTime: number | undefined): number {
  if (focusTime == null || Number.isNaN(focusTime)) {
    return DEFAULT_FOCUS_TIME_MINUTES
  }

  if (focusTime <= 0) {
    return 0
  }

  return Math.floor(focusTime)
}

export const __taskFlowTestables = {
  resolveStartTimerMinutes,
}

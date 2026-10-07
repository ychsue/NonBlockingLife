import { applyChange, db } from "../db/index";
import type {
  Dashboard,
  SelectionCacheItem,
  ScheduledItem,
  TaskPoolItem,
  IcsEventItem,
} from "../db/schema";
import Utils from "../../../gas/src/Utils";
import {
  triggerShortcutTimer,
  getShortcutConfig,
  getDeviceType,
} from "./shortcutUtils";
import { useDialogStore } from "../store/dialogStore";
import { parseToMinutes } from "./candidateUtils";
import { useAppStore } from "../store/appStore";
import {
  mapIcsToUnifiedItem,
  mapScheduledToUnifiedItem,
  UnifiedCalendarItem,
} from "./icsAdapter";
import { getPreviewRuns } from "./icsParser";

const DEV_CLIENT_ID = "dev-task-flow";
const DEFAULT_FOCUS_TIME_MINUTES = 30;
export const MAX_RECORD_DURATION_MINUTES = 12 * 60;

const SOURCE_TABLE_MAP: Record<
  string,
  "task_pool" | "scheduled" | "micro_tasks" | "ics_events"
> = {
  Task_Pool: "task_pool",
  Scheduled: "scheduled",
  Micro_Tasks: "micro_tasks",
  ICS_Event: "ics_events",
};

export async function getRunningTask(): Promise<Dashboard | null> {
  const rows = await db.dashboard.toArray();
  return rows[0] ?? null;
}

export function shouldPromptForTimerStart(
  deviceType: ReturnType<typeof getDeviceType>,
  plannedTimerMinutes: number,
): boolean {
  const timerLaunchMode = useAppStore.getState().androidTimerLaunchMode;

  return (
    (deviceType === "TWA" || deviceType === "AndroidWebView") &&
    timerLaunchMode !== "none" &&
    plannedTimerMinutes > 0
  );
}

export async function startTask(candidate: SelectionCacheItem, note: string) {
  const locale = useAppStore.getState().locale;
  const text = (key: string) => {
    const translations: Record<string, Record<string, string>> = {
      "zh-TW": {
        已有任務正在執行: "已有任務正在執行",
        "任務來源不明，無法開始。": "任務來源不明，無法開始。",
        任務已成功開始: "任務已成功開始",
        "要不要開始計時器？": "要不要開始計時器？",
        要不要開始計時器msg: "這段專注剛開始。要不要直接開啟計時器或時鐘介面？",
        "不用，謝謝": "不用，謝謝",
        "開啟計時器": "開啟計時器"
      },
      en: {
        已有任務正在執行: "A task is already running",
        "任務來源不明，無法開始。": "Unknown task source, cannot start.",
        任務已成功開始: "Task started successfully",
        "要不要開始計時器？": "Do you want to start the timer?",
        要不要開始計時器msg:
          "This focus session has just started. Do you want to directly open the timer or clock interface?",
        "不用，謝謝": "No, thanks",
        "開啟計時器": "Start Timer"
      },
      ja: {
        已有任務正在執行: "既にタスクが実行中です",
        "任務來源不明，無法開始。":
          "不明なタスクソースのため、開始できません。",
        任務已成功開始: "タスクが正常に開始されました",
        "要不要開始計時器？": "タイマーを開始しますか？",
        要不要開始計時器msg:
          "この集中セッションはちょうど始まったばかりです。タイマーや時計のインターフェースを直接開きますか？",
        "不用，謝謝": "いいえ、結構です",
        "開啟計時器": "タイマーを開始"
      },
    };
    return translations[locale]?.[key] ?? key;
  };
  const existing = await getRunningTask();
  if (existing) {
    return {
      status: "warning",
      message: `${text("已有任務正在執行")}: ${existing.taskId}`,
    };
  }

  const source = candidate.source;
  if (!source || !SOURCE_TABLE_MAP[source]) {
    return {
      status: "error",
      message: text("任務來源不明，無法開始。"),
    };
  }

  const sourceTable = SOURCE_TABLE_MAP[source];

  const now = Date.now();
  const focusTime = await getFocusTimeBySource(sourceTable, candidate.taskId);
  const plannedTimerMinutes = resolveStartTimerMinutes(focusTime);
  const dashboardRow: Dashboard = {
    taskId: candidate.taskId,
    title: candidate.title,
    source,
    notes: note,
    startAt: now,
    systemStatus: "DOING",
    // store the planned deadline so the end flow can decide whether the timer was exceeded
    endAt:
      plannedTimerMinutes > 0
        ? now + plannedTimerMinutes * 60 * 1000
        : undefined,
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

  // 如果是 Task_Pool 來源，累加今日使用次數
  if (source === "Task_Pool") {
    const poolTask = await db.task_pool.get(candidate.taskId);
    if (poolTask) {
      const lastRun = poolTask.lastRunDate
        ? new Date(poolTask.lastRunDate)
        : null;
      const isToday =
        lastRun &&
        !isNaN(lastRun.getTime()) &&
        lastRun.toDateString() === new Date(now).toDateString();
      const prevCount = isToday ? poolTask.usedTodayCount || 0 : 0;
      await applyChange({
        table: "task_pool",
        recordId: candidate.taskId,
        op: "update",
        patch: { usedTodayCount: prevCount + 1 },
        clientId: DEV_CLIENT_ID,
      });
    }
  }

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

  if (plannedTimerMinutes > 0) {
    const shortcutConfig = getShortcutConfig("start");
    shortcutConfig.timerMinutes = plannedTimerMinutes;

    if (shouldPromptForTimerStart(getDeviceType(), plannedTimerMinutes)) {
      void useDialogStore
        .getState()
        .openDialog({
          title: text("要不要開始計時器？"),
          message: text("要不要開始計時器msg"),
          actions: [
            { id: "cancel", label: text("不用，謝謝") },
            { id: "open", label: text("開啟計時器") },
          ],
        })
        .then(({ actionId }) => {
          if (actionId === "open") {
            triggerShortcutTimer(
              candidate.title ?? "",
              candidate.taskId,
              shortcutConfig,
            );
          }
        });
    } else {
      triggerShortcutTimer(
        candidate.title ?? "",
        candidate.taskId,
        shortcutConfig,
      );
    }
  }

  return { status: "success", message: text("任務已成功開始") };
}

export async function recordTaskEvent(
  candidate: SelectionCacheItem,
  note: string,
  durationOverride?: number,
) {
  const locale = useAppStore.getState().locale;
  const text = (key: string) => {
    const translations: Record<string, Record<string, string>> = {
      事件已記錄: {
        "zh-TW": "事件已記錄",
        en: "Event recorded",
        ja: "イベントが記録されました",
      },
      "任務來源不明，無法記錄。": {
        "zh-TW": "任務來源不明，無法記錄。",
        en: "Task source unknown, unable to record.",
        ja: "タスクのソースが不明なため、記録できません。",
      },
    };
    return translations[key]?.[locale] ?? key;
  };

  const source = candidate.source;
  if (!source || !SOURCE_TABLE_MAP[source]) {
    return {
      status: "error",
      message: text("任務來源不明，無法記錄。"),
    };
  }

  const now = Date.now();
  const metadata = parseRecordMetadata(note);
  const { duration, error } = resolveRecordDuration(
    durationOverride,
    metadata.duration,
  );
  if (error) {
    return {
      status: "error",
      message: error,
    };
  }

  await applySourceCompletionUpdates({
    source,
    taskId: candidate.taskId,
    now,
    duration,
    mode: "record",
  });

  await applyChange({
    table: "log",
    recordId: `log_${candidate.taskId}_${now}`,
    op: "add",
    patch: {
      timestamp: now,
      taskId: candidate.taskId,
      title: candidate.title,
      action: "RECORD",
      category: source,
      state: "DONE",
      ...(duration != null ? { duration } : {}),
      notes: metadata.normalizedNote,
    },
    clientId: DEV_CLIENT_ID,
  });

  return { status: "success", message: text("事件已記錄") };
}

export async function endTask(endNote: string, isInterrupt = false) {
  const locale = useAppStore.getState().locale;
  const text = (key: string) => {
    const translations: Record<string, Record<string, string>> = {
      任務被中斷: {
        "zh-TW": "任務被中斷",
        en: "Task was interrupted",
        ja: "タスクが中断されました",
      },
      目前無執行中任務: {
        "zh-TW": "目前無執行中任務",
        en: "No task is currently running",
        ja: "現在実行中のタスクはありません",
      },
      "時間已超過，是否要開始休息？": {
        "zh-TW": "時間已超過，是否要開始休息？",
        en: "Time is overdue, do you want to start a break?",
        ja: "時間が過ぎました。休憩を始めますか？",
      },
      "要不要開啟計時器？": {
        "zh-TW": "要不要開啟計時器？",
        en: "Do you want to start the timer?",
        ja: "タイマーを開始しますか？",
      },
      "這段專注已超過預設時限。要不要直接開啟計時器或時鐘介面，幫自己進入休息模式？":
        {
          "zh-TW":
            "這段專注已超過預設時限。要不要直接開啟計時器或時鐘介面，幫自己進入休息模式？",
          en: "This focus session has exceeded the preset time limit. Do you want to directly open the timer or clock interface to help yourself enter break mode?",
          ja: "この集中セッションは設定された時間を超えました。タイマーや時計のインターフェースを直接開いて休憩モードに入りますか？",
        },
      "這段專注似乎提前結束。要不要直接開啟計時器或時鐘介面好結束他？": {
        "zh-TW":
          "這段專注似乎提前結束。要不要直接開啟計時器或時鐘介面好結束他？",
        en: "This focus session seems to have ended early. Do you want to directly open the timer or clock interface to end it?",
        ja: "この集中セッションは早めに終了したようです。タイマーや時計のインターフェースを直接開いて終了しますか？",
      },
      任務已結束: {
        "zh-TW": "任務已結束",
        en: "Task has ended",
        ja: "タスクが終了しました",
      },
      "不用，謝謝": {
        "zh-TW": "不用，謝謝",
        en: "No, thanks",
        ja: "いいえ、結構です",
      },
      "開啟": {
        "zh-TW": "開啟",
        en: "Open",
        ja: "開く",
      },
    };
    return translations[key]?.[locale] ?? key;
  };
  let timerMinutes = 10; // 默認中斷後的預設計時器時間
  const running = await getRunningTask();
  if (!running) {
    return { status: "warning", message: text("目前無執行中任務") };
  }

  const now = Date.now();
  const duration = running.startAt
    ? Utils.calculateDuration(running.startAt, now)
    : 0;
  const wasOverdue = Boolean(running.endAt && now > running.endAt);
  const finalNote = isInterrupt
    ? `{${text("任務被中斷")}} ${endNote ? ` - ${endNote}` : ""}`
    : endNote;
  const action = isInterrupt ? "INTERRUPT" : "END";
  const state = isInterrupt ? "BUSY" : "DONE";
  const sourceUpdateResult = await applySourceCompletionUpdates({
    source: running.source,
    taskId: running.taskId,
    now,
    duration,
    mode: "end",
    isInterrupt,
  });
  timerMinutes = sourceUpdateResult.timerMinutes ?? timerMinutes;

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

  // 只在任務開始時建立計時器，避免在結束時再次觸發 Android 的 set-timer，
  // 因為系統不會自動覆蓋/取消既有 timer，這樣反而比較容易打擾使用者。
  if (!isInterrupt) {
    const shortcutConfig = getShortcutConfig("end");
    shortcutConfig.timerMinutes = timerMinutes;

    const timerLaunchMode = useAppStore.getState().androidTimerLaunchMode;

    if (
      (getDeviceType() === "TWA" || getDeviceType() === "AndroidWebView") &&
      timerLaunchMode !== "none"
    ) {
      void useDialogStore
        .getState()
        .openDialog({
          title: wasOverdue
            ? text("時間已超過，是否要開始休息？")
            : text("要不要開啟計時器？"),
          message: wasOverdue
            ? text(
                "這段專注已超過預設時限。要不要直接開啟計時器或時鐘介面，幫自己進入休息模式？",
              )
            : text(
                "這段專注似乎提前結束。要不要直接開啟計時器或時鐘介面好結束他？",
              ),
          actions: [
            { id: "cancel", label: text("不用，謝謝") },
            { id: "open", label: text("開啟") },
          ],
        })
        .then(({ actionId }) => {
          if (actionId === "open") {
            triggerShortcutTimer(
              running.title ?? "",
              running.taskId,
              shortcutConfig,
              undefined,
              "end",
            );
          }
        });
    } else {
      triggerShortcutTimer(
        running.title ?? "",
        running.taskId,
        shortcutConfig,
        undefined,
        "end",
      );
    }
  }

  return { status: "success", message: text("任務已結束"), duration };
}

async function applySourceCompletionUpdates(params: {
  source?: string;
  taskId: string;
  now: number;
  duration?: number;
  mode: "end" | "record";
  isInterrupt?: boolean;
}): Promise<{ timerMinutes?: number }> {
  const {
    source,
    taskId,
    now,
    duration = 0,
    mode,
    isInterrupt = false,
  } = params;

  if (source === "Task_Pool") {
    if (mode === "record") {
      if (duration > 0) {
        await updateTaskPoolAfterRecord(taskId, now, duration);
      }
      return {};
    }

    const task = await db.task_pool.get(taskId);
    await updateTaskPoolAfterEnd(task, now, duration, isInterrupt);
    return {};
  }

  if (source === "Scheduled" || source === "ICS_Event") {
    const task = await (
      source === "Scheduled" ? db.scheduled : db.ics_events
    ).get(taskId);
    const unifiedTask =
      source === "Scheduled"
        ? mapScheduledToUnifiedItem(task as ScheduledItem)
        : mapIcsToUnifiedItem(task as IcsEventItem);
    if (source === "ICS_Event") {
      const oldEndAt = (task as IcsEventItem)?.endAt;

      const oldStartAt = //為了計算 ics_event 的 focusTime
        (task as IcsEventItem)?.startAt;
      const focusTimeMs = (oldEndAt ?? 0) - (oldStartAt ?? 0);
      unifiedTask.deadline = (unifiedTask.nextRun ?? 0) + focusTimeMs;
      unifiedTask.focusTime = focusTimeMs / 60 / 1000; // convert milliseconds to minutes
    }
    if (isInterrupt) {
      await applyChange({
        table: source === "Scheduled" ? "scheduled" : "ics_events",
        recordId: taskId,
        op: "update",
        patch: { status: "INTERRUPTED", lastRun: now },
        clientId: DEV_CLIENT_ID,
      });
    } else {
      await updateUnifiedCalendarAfterEnd(unifiedTask, now);
    }
    return {
      timerMinutes: parseToMinutes(unifiedTask?.remindAfter) ?? undefined,
    };
  }

  if (source === "Micro_Tasks") {
    await applyChange({
      table: "micro_tasks",
      recordId: taskId,
      op: "update",
      patch: {
        status: isInterrupt ? "INTERRUPTED" : "DONE",
        lastRunDate: now,
      },
      clientId: DEV_CLIENT_ID,
    });
  }

  return {};
}

export async function interruptTask(
  endNote: string,
  targetTask?: SelectionCacheItem,
) {
  const locale = useAppStore.getState().locale;
  const text = (key: string) => {
    const translations: Record<string, Record<string, string>> = {
      系統自動掛載中斷計時: {
        "zh-TW": "系統自動掛載中斷計時",
        en: "System automatically mounted interrupt timer",
        ja: "システムが自動的に中断タイマーを設定しました",
      },
      已中斷並切換到指定任務: {
        "zh-TW": "已中斷並切換到指定任務",
        en: "Interrupted and switched to the specified task",
        ja: "中断され、指定されたタスクに切り替えました",
      },
      "[中斷] 處理突發狀況": {
        "zh-TW": "[中斷] 處理突發狀況",
        en: "[Interrupt] Handling unexpected situations",
        ja: "[中断] 突発的な状況への対応",
      },
      已切換至中斷計時模式: {
        "zh-TW": "已切換至中斷計時模式",
        en: "Switched to interrupt timing mode",
        ja: "中断タイミングモードに切り替えました",
      },
    };
    return translations[key]?.[locale] ?? key;
  };
  const running = await getRunningTask();

  // 如果有正在執行的任務，先結束它
  if (running) {
    const result = await endTask(endNote, true);
    if (result.status !== "success") {
      return result;
    }
  }

  // 若有指定目標任務，先中斷目前任務，再直接切換啟動目標任務
  if (targetTask) {
    const switched = await startTask(targetTask, endNote);
    if (switched.status !== "success") {
      return switched;
    }

    const nextRunning = await getRunningTask();
    return {
      status: "success",
      message: text("已中斷並切換到指定任務"),
      payload: nextRunning,
    };
  }

  // 無論是否有舊任務，都啟動系統中斷任務
  const now = Date.now();
  const interruptId = "SYS_INT";
  const interruptTitle = text("[中斷] 處理突發狀況");
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
      notes: text("系統自動掛載中斷計時"),
    },
    clientId: DEV_CLIENT_ID,
  });

  return {
    status: "success",
    message: text("已切換至中斷計時模式"),
    payload: dashboardRow,
  };
}

async function updateTaskPoolAfterEnd(
  task: TaskPoolItem | undefined,
  now: number,
  duration: number,
  isInterrupt = false,
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
      status: isInterrupt ? "INTERRUPTED" : "PENDING",
      spentTodayMins: spentToday,
      totalSpentMins: totalSpent,
      lastRunDate: now,
    },
    clientId: DEV_CLIENT_ID,
  });
}

async function updateTaskPoolAfterRecord(
  taskId: string,
  now: number,
  duration: number,
) {
  const task = await db.task_pool.get(taskId);
  if (!task) return;

  const lastRun = task.lastRunDate ? new Date(task.lastRunDate) : null;
  const todayStr = new Date(now).toDateString();
  let spentToday = task.spentTodayMins || 0;
  let totalSpent = task.totalSpentMins || 0;
  let usedTodayCount = task.usedTodayCount || 0;

  if (
    !lastRun ||
    isNaN(lastRun.getTime()) ||
    lastRun.toDateString() !== todayStr
  ) {
    spentToday = 0;
    usedTodayCount = 0;
  }

  spentToday += duration;
  totalSpent += duration;
  usedTodayCount += 1;

  await applyChange({
    table: "task_pool",
    recordId: taskId,
    op: "update",
    patch: {
      status: "PENDING",
      spentTodayMins: spentToday,
      totalSpentMins: totalSpent,
      usedTodayCount: usedTodayCount,
      lastRunDate: now,
    },
    clientId: DEV_CLIENT_ID,
  });
}

async function updateUnifiedCalendarAfterEnd(
  task: UnifiedCalendarItem | undefined,
  now: number,
) {
  if (!task) return;

  let nextRun: number | null = null;

  // * 1. 如果有 callback，則更新 callback 的 nextRun 為 now + remindAfter??0
  if (task.callback) {
    // 先找到 title 為 callback 的 任務，然而，任務有可能為 task_pool, scheduled, 或 ics_events 和 micro_tasks，所以要分別找
    for (let tableName of [
      "task_pool",
      "scheduled",
      "ics_events",
      "micro_tasks",
    ]) {
      const callbackTask = await (
        tableName === "task_pool"
          ? db.task_pool
          : tableName === "scheduled"
            ? db.scheduled
            : tableName === "ics_events"
              ? db.ics_events
              : db.micro_tasks
      )
        .where("title")
        .equals(task.callback)
        .first();
      if (callbackTask) {
        let recordId =
          tableName === "ics_events"
            ? (callbackTask as IcsEventItem)["eventId"]
            : (callbackTask as Exclude<typeof callbackTask, IcsEventItem>)[
                "taskId"
              ];
        const remindAfterMins = parseToMinutes(task.remindAfter ?? "0") || 0;
        const callbackNextRun = now + remindAfterMins * 60 * 1000;
        await applyChange({
          table: tableName,
          recordId: recordId,
          op: "update",
          patch: {
            status: callbackNextRun < now ? "PENDING" : "WAITING",
            ...(tableName === "ics_events"
              ? { startAt: callbackNextRun }
              : {
                  nextRun: callbackNextRun, // 目前有 nextRun 的只有 scheduled，而 ics_events 的則是 startAt，其餘兩個目前沒有相應的值
                }),
          },
          clientId: DEV_CLIENT_ID,
        });
        break; // Found the callback task, no need to continue searching
      }
    }
  }
  // * 2. 如果有 cron 表達式，計算下一次執行時間，若沒有則設為 null
  if (task.cronExpr) {
    let nextRunDate =
      task.itemType === "scheduled"
        ? Utils.getNextOccurrence(task.cronExpr, new Date(now))
        : getPreviewRuns(
            task.cronExpr,
            new Date(task.nextRun ?? now),
            2,
            new Date(now),
          )[0]; // 有考慮 after，所以，第一個就是
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

  let patch: Partial<ScheduledItem & IcsEventItem> = {
    status: nextRun ? "WAITING" : "DONE",
    lastRun: now,
    nextRun: nextRun ?? undefined,
  };
  if (task.itemType === "ics_event") {
    const focusTime = task.focusTime;
    patch = {
      status: nextRun ? "WAITING" : "DONE",
      updatedAt: now,
      startAt: nextRun ?? undefined,
      endAt: nextRun ? nextRun + (focusTime ?? 0) * 60 * 1000 : undefined,
    };
  }
  await applyChange({
    table: task.itemType === "scheduled" ? "scheduled" : "ics_events",
    recordId: task.taskId,
    op: "update",
    patch,
    clientId: DEV_CLIENT_ID,
  });
}

async function getFocusTimeBySource(
  sourceTable: "task_pool" | "scheduled" | "micro_tasks" | "ics_events",
  taskId: string,
): Promise<number | undefined> {
  if (sourceTable === "task_pool") {
    const row = await db.task_pool.get(taskId);
    return row?.focusTime;
  }

  if (sourceTable === "scheduled") {
    const row = await db.scheduled.get(taskId);
    return row?.focusTime;
  }
  if (sourceTable === "ics_events") {
    const row = await db.ics_events.get(taskId);
    return 0; // TODO 預計0分鐘
  }

  const row = await db.micro_tasks.get(taskId);
  return row?.focusTime;
}

function resolveStartTimerMinutes(focusTime: number | undefined): number {
  if (focusTime == null || Number.isNaN(focusTime)) {
    return DEFAULT_FOCUS_TIME_MINUTES;
  }

  if (focusTime <= 0) {
    return 0;
  }

  return Math.floor(focusTime);
}

function parseRecordMetadata(note: string): {
  duration?: number;
  normalizedNote: string;
} {
  const trimmed = note.trim();
  if (!trimmed) {
    return { normalizedNote: "" };
  }

  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const payload = JSON.parse(trimmed);
      if (payload && typeof payload === "object") {
        const objectPayload = payload as Record<string, unknown>;
        const duration = parseDurationFromUnknown(
          objectPayload.duration ??
            objectPayload.durationMins ??
            objectPayload.minutes ??
            objectPayload.mins,
        );
        const normalizedNote =
          (typeof objectPayload.note === "string" && objectPayload.note) ||
          (typeof objectPayload.notes === "string" && objectPayload.notes) ||
          (typeof objectPayload.message === "string" &&
            objectPayload.message) ||
          (typeof objectPayload.comment === "string" &&
            objectPayload.comment) ||
          note;

        return { duration, normalizedNote };
      }
    } catch {
      // 非 JSON 字串就走一般文字解析
    }
  }

  const inlineDurationMatch = note.match(
    /(?:^|\s)(?:duration|minutes|mins|dur|d)\s*[:=]\s*(\d+(?:\.\d+)?)/i,
  );
  if (!inlineDurationMatch) {
    return { normalizedNote: note };
  }

  const duration = parseDurationFromUnknown(inlineDurationMatch[1]);
  const normalizedNote = note.replace(inlineDurationMatch[0], " ").trim();
  return {
    duration,
    normalizedNote: normalizedNote || note,
  };
}

function parseDurationFromUnknown(value: unknown): number | undefined {
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value < 0) {
      return undefined;
    }
    return Math.floor(value);
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return undefined;
    }
    return Math.floor(parsed);
  }

  return undefined;
}

function resolveRecordDuration(
  durationOverride: number | undefined,
  parsedDuration: number | undefined,
): { duration?: number; error?: string } {
  const locale = useAppStore.getState().locale;
  const text = (key: string) => {
    const translations: Record<string, Record<string, string>> = {
      "補記時長必須是0以上的數字。": {
        "zh-TW": "補記時長必須是 0 以上的數字。",
        en: "The recorded duration must be a number greater than or equal to 0.",
        ja: "記録された時間は0以上の数値である必要があります。",
      },
      "補記時長上限為{n}分鐘。": {
        "zh-TW": `補記時長上限為 {n} 分鐘。`,
        en: `The maximum recorded duration is {n} minutes.`,
        ja: `記録された時間の上限は{n}分です。`,
      },
    };
    return translations[key]?.[locale] ?? key;
  };
  const duration = durationOverride ?? parsedDuration;
  if (duration == null) {
    return {};
  }

  if (!Number.isFinite(duration) || duration < 0) {
    return { error: text("補記時長必須是0以上的數字。") };
  }

  const floored = Math.floor(duration);
  if (floored > MAX_RECORD_DURATION_MINUTES) {
    return {
      error: text("補記時長上限為{n}分鐘。").replace(
        "{n}",
        `${MAX_RECORD_DURATION_MINUTES}`,
      ),
    };
  }

  return { duration: floored };
}

export const __taskFlowTestables = {
  resolveStartTimerMinutes,
  parseRecordMetadata,
  resolveRecordDuration,
};

import type {
  TaskPoolItem,
  ScheduledItem,
  MicroTaskItem,
  AlarmQueueItem,
} from "../db/schema";
import { getT } from "../i18n";

export interface Candidate {
  taskId: string;
  title: string;
  score: number;
  source: string;
  status?: string;
  url?: string;
  deadline?: number;
  usedTodayCount?: number;
}

export interface CalculateCandidatesResult {
  candidates: Candidate[];
  resetPoolTaskIds: string[];
  totalMinsPool: number;
}

/**
 * 解析時間字串為分鐘數
 * 支持格式：純數字(視為分鐘)、"30m", "2h", "1d", "1M", "1w"
 */
export function parseToMinutes(takesTime?: string | number): number | null {
  if (!takesTime) return null;

  // 如果是純數字，直接回傳
  const parsedNum = Number(takesTime);
  if (!isNaN(parsedNum)) {
    return parsedNum;
  }

  // 字串解析：mhdMw 格式
  const regex = /^(-?\d+)([mhdMw])$/;
  const match = String(takesTime).match(regex);
  if (!match) return null;

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case "m":
      return value;
    case "h":
      return value * 60;
    case "d":
      return value * 60 * 24;
    case "M":
      return value * 60 * 24 * 30;
    case "w":
      return value * 60 * 24 * 7;
    default:
      return null;
  }
}

/**
 * 解析 reminderOffsets 字串（例如 "1d,2h,0m" 或 "1d,2h,0"）
 * 回傳逐段的分鐘偏移陣列，並忽略空白與不合法項目。
 */
export function parseAlarmOffsets(
  offsets?: string | string[] | number[] | null,
): number[] {
  if (!offsets) return [];

  if (Array.isArray(offsets)) {
    return offsets
      .map((value) => {
        if (typeof value === "number" && Number.isFinite(value)) return value;
        if (typeof value === "string") {
          const parsed = parseToMinutes(value.trim());
          return parsed ?? null;
        }
        return null;
      })
      .filter((value): value is number => value !== null);
  }

  return String(offsets)
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
    .map((value) => parseToMinutes(value))
    .filter((value): value is number => value !== null);
}

/**
 * 將 ScheduledItem 轉成 alarm_queue 的待處理項目。
 * 只包含下一個月內的提醒，並保留 dedupeKey 去除重複。
 */
export function buildAlarmQueueEntries(
  scheduled: ScheduledItem[],
  now: Date = new Date(),
  windowMs = 30 * 24 * 60 * 60 * 1000,
  syncTargets: { clock: boolean; exact: boolean } = {
    clock: false,
    exact: false,
  },
): AlarmQueueItem[] {
  const nowMs = now.getTime();
  const futureCutoff = nowMs + windowMs;
  const entries: AlarmQueueItem[] = [];

  scheduled.forEach((task) => {
    if (!task.taskId || !task.nextRun) return;
    if (
      task.status &&
      !["PENDING", "INTERRUPTED", "DOING", "WAITING"].includes(task.status)
    )
      return;

    const rawOffsets = task.reminderOffsets ?? [];
    const offsets = parseAlarmOffsets(rawOffsets);
    if (offsets.length === 0) return;

    offsets.forEach((offsetMinutes) => {
      const alarmAt = task.nextRun! - offsetMinutes * 60 * 1000;
      if (alarmAt < nowMs || alarmAt > futureCutoff) return;

      const dedupeKey = `${task.taskId}:${alarmAt}`;
      entries.push({
        taskId: task.taskId,
        title: task.title || "Unnamed scheduled task",
        alarmAt,
        offsetMinutes,
        state: "pending",
        clockState: syncTargets.clock ? "pending" : "not_applicable",
        exactState: syncTargets.exact ? "pending" : "not_applicable",
        dedupeKey,
        createdAt: nowMs,
        updatedAt: nowMs,
      });
    });
  });

  const seen = new Set<string>();
  return (
    entries
      .filter((entry) => {
        if (seen.has(entry.dedupeKey)) return false;
        seen.add(entry.dedupeKey);
        return true;
      })
      ?.sort((a, b) => a.alarmAt - b.alarmAt) || []
  );
}

/**
 * 分鐘數轉人類可讀的時間字串
 */
export function minutesToTimeString(totalMinutes: number): string {
  const t = getT();
  const sign = totalMinutes < 0 ? "-" : "";
  const absoluteMinutes = Math.abs(totalMinutes);
  const hours = Math.floor(absoluteMinutes / 60);
  const minutes = Math.floor(absoluteMinutes % 60);
  if (hours > 0) {
    if (minutes > 0) return sign + t("time.hoursMinutes", { h: hours, m: minutes });
    return sign + t("time.hoursOnly", { h: hours });
  }
  if (minutes > 0) return sign + t("time.minutesOnly", { m: minutes });
  return sign + t("time.rightNow");
}

/**
 * 根據來源回傳對應的 Emoji
 */
export function getSourceEmoji(source: string): string {
  const sourceMap: Record<string, string> = {
    Scheduled: "🔔",
    Task_Pool: "🎯",
    Micro_Tasks: "⚡",
  };
  return sourceMap[source] || "📝";
}

/**
 * PWA 版本的候選任務計算
 * 接收 Dexie 表的結構化數據（對象數組）
 * 並返回排序後的候選任務列表
 */
export function calculateCandidates(
  pool: TaskPoolItem[],
  scheduled: ScheduledItem[],
  microTasks: MicroTaskItem[],
): CalculateCandidatesResult {
  const t = getT();
  const candidates: Candidate[] = [];
  const resetPoolTaskIds: string[] = [];
  let totalMinsPool = 0;

  const now = new Date();

  // ===== Task_Pool 處理 =====
  pool.forEach((task) => {
    const status = task.status;
    if (
      status === "PENDING" ||
      status === "INTERRUPTED" ||
      status === "DOING"
    ) {
      const taskId = task.taskId;
      const title = task.title || t("task.unnamed");
      let spentToday = task.spentTodayMins || 0;
      let usedTodayCount = task.usedTodayCount || 0;
      const dailyLimit = task.dailyLimitMins || 999;
      const priority = task.priority || 1;
      const lastRunDate = task.lastRunDate;

      // --- 智慧評分邏輯 ---

      // 1. 基礎分 (Priority): 1->20, 5->100
      let score = priority * 20;

      // 2. 飢餓加權 (Starvation): 越久沒做分越高
      if (lastRunDate) {
        const lastDate = new Date(lastRunDate);
        if (isNaN(lastDate.getTime())) {
          // 無效日期，視為從未執行過
          score += 30;
        } else {
          // 如果 lastDate 不是今天，而 spentToday 已經有值，這表示需要歸零
          const lastDateStr = lastDate.toDateString();
          const nowDateStr = now.toDateString();
          if (
            lastDateStr !== nowDateStr &&
            (spentToday > 0 || usedTodayCount > 0)
          ) {
            resetPoolTaskIds.push(taskId);
            spentToday = 0;
            usedTodayCount = 0;
          }

          const daysSince = Math.floor(
            (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24),
          );
          score += daysSince * 10; // 每多一天沒做，加 10 分
        }
      } else {
        score += 30; // 從未執行過的新任務，給予較高初始分
      }

      // 3. 配額扣分: 如果已經快超過 Daily Limit，降低出現順位
      const remainingMins = dailyLimit - spentToday;
      if (remainingMins <= 0) {
        score -= 50; // 超額任務大幅扣分
      } else if (remainingMins < 15) {
        score -= 20; // 快滿了，稍微降低
      }

      // 4. Deadline 加權：越接近或逾期，分越高
      const deadline = task.deadline;
      if (deadline) {
        const deadlineDate = new Date(deadline);
        const daysUntil =
          (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        if (daysUntil < 0) {
          // 逾期：每多一天加 20 分，上限 +500
          score += Math.min(100 + Math.floor(Math.abs(daysUntil)) * 20, 500);
        } else if (daysUntil <= 3) {
          score += 80;
        } else if (daysUntil <= 7) {
          score += 40;
        } else if (daysUntil <= 14) {
          score += 15;
        }
      }

      candidates.push({
        taskId,
        title: `${title} ${t("task.remainingQuota", { mins: remainingMins })}`,
        score: Math.max(0, score),
        source: "Task_Pool",
        status,
        url: task.url || undefined,
        deadline: task.deadline,
        usedTodayCount,
      });
    }

    // 累計 Pool 總時數
    const mins = task.spentTodayMins || 0;
    totalMinsPool += mins;
  });

  // ===== Scheduled Tasks 處理 =====
  scheduled.forEach((task) => {
    const status = task.status;
    if (
      status === "PENDING" ||
      status === "INTERRUPTED" ||
      status === "DOING"
    ) {
      const taskId = task.taskId;
      let title = task.title || t("task.unnamedScheduled");
      const nextRunTime = task.nextRun;
      let score = 50; // Scheduled 基礎分較低

      if (nextRunTime) {
        const nextRunDate = new Date(nextRunTime);
        const diffMins = (nextRunDate.getTime() - now.getTime()) / 60000;
        const timeStr = minutesToTimeString(Math.abs(diffMins));
        title = `${title} : ${diffMins < 0 ? t("task.overdue") : t("task.timeRemaining")}${timeStr}`;
        score = diffMins < 0 ? 500 : Math.max(50, 200 - diffMins);
      }

      candidates.push({
        taskId,
        title,
        score,
        source: "Scheduled",
        status,
        url: task.url || undefined,
      });
    }
  });

  // ===== Micro_Tasks 處理 =====
  microTasks.forEach((task) => {
    const status = task.status;
    if (
      status === "PENDING" ||
      status === "INTERRUPTED" ||
      status === "DOING"
    ) {
      const taskId = task.taskId;
      const title = task.title || t("task.unnamedMicro");
      let score = 30; // 固定基礎分

      // Deadline 加權
      const deadline = task.deadline;
      if (deadline) {
        const deadlineDate = new Date(deadline);
        const daysUntil =
          (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        if (daysUntil < 0) {
          score += Math.min(100 + Math.floor(Math.abs(daysUntil)) * 20, 500);
        } else if (daysUntil <= 3) {
          score += 80;
        } else if (daysUntil <= 7) {
          score += 40;
        } else if (daysUntil <= 14) {
          score += 15;
        }
      }

      candidates.push({
        taskId,
        title,
        score,
        source: "Micro_Tasks",
        status,
        url: task.url || undefined,
        deadline: task.deadline,
      });
    }
  });

  // 按分數排序（降序）
  candidates.sort((a, b) => b.score - a.score);

  return {
    candidates,
    resetPoolTaskIds,
    totalMinsPool,
  };
}

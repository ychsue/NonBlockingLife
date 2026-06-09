import { Cron } from "./croner.min.js";
import { NBL_CONFIG } from "./Config.js";

// 定義一個全域物件 (GAS 和 Node.js 都能讀到)

// 計算兩個日期之間的分鐘差
function calculateDuration(start, end) {
  return Math.round((new Date(end) - new Date(start)) / 60000);
}

// 判斷是否超時
function isOverdue(startTime, limitMinutes) {
  const duration = calculateDuration(startTime, new Date());
  return duration > limitMinutes;
}

// 產生短 ID
function generateId(prefix = "t") {
  return prefix + new Date().getTime().toString(36);
}

/**
 * 簡單的 mhdMw 的解析器，轉換為分鐘數
 * @param {string} takesTime 為 類似 "30m", "2h", "1d", "1M", "1w" 的字串，若是直接就是數字，則視為分鐘
 * @returns {number|null} 分鐘數，無法解析則回傳 null
 */
function parseToMinutes(takesTime) {
  // 如果是純數字，直接回傳
  const parsedNum = Number(takesTime);
  if (isNaN(parsedNum) === false) {
    return parsedNum;
  }
  // 簡單的 mhdMw 的解析器，轉換為分鐘數
  const regex = /^(\d+)([mhdMw])$/;
  const match = takesTime.match(regex);
  if (!match) return null;
  const value = parseInt(match[1], 10);
  const unit = match[2];
  let minute = null;
  switch (unit) {
    case "m":
      minute = value;
      break;
    case "h":
      minute = value * 60;
      break;
    case "d":
      minute = value * 60 * 24;
      break;
    case "M":
      minute = value * 60 * 24 * 30;
      break;
    case "w":
      minute = value * 60 * 24 * 7;
      break;
    default:
      minute = null;
  }

  return minute;
}

/**
 * 解析「每 n 單位」的簡化排程語法。
 * 支援: "every 30m", "@every 2h", "3d", "1M", "1w"
 * @param {string} expr
 * @returns {{value:number, unit:string}|null}
 */
function parseEveryIntervalExpr(expr) {
  if (typeof expr !== "string") return null;

  const normalized = expr.trim();
  const withPrefix = normalized.match(/^(?:@every|every)\s+(\d+)\s*([mhdMw])$/);
  const shorthand = normalized.match(/^(\d+)\s*([mhdMw])$/);
  const match = withPrefix || shorthand;
  if (!match) return null;

  const value = parseInt(match[1], 10);
  const unit = match[2];
  if (!Number.isFinite(value) || value <= 0) return null;

  return { value, unit };
}

/**
 * 依據間隔語法，從 baseDate 往後推下一次執行時間。
 * @param {Date} baseDate
 * @param {{value:number, unit:string}} interval
 * @returns {Date|null}
 */
function getNextOccurrenceByInterval(baseDate, interval) {
  const next = new Date(baseDate);
  if (isNaN(next.getTime())) return null;

  switch (interval.unit) {
    case "m":
      next.setMinutes(next.getMinutes() + interval.value);
      return next;
    case "h":
      next.setHours(next.getHours() + interval.value);
      return next;
    case "d":
      next.setDate(next.getDate() + interval.value);
      return next;
    case "w":
      next.setDate(next.getDate() + interval.value * 7);
      return next;
    case "M":
      next.setMonth(next.getMonth() + interval.value);
      return next;
    default:
      return null;
  }
}

/**
 * 將五欄 cron 中的 rN 語法轉譯成一般 cron list。
 * 例如 baseDate 在 5 月、月份欄為 r3，會轉為 5,8,11。
 * @param {string} cronExpr
 * @param {Date} baseDate
 * @returns {string}
 */
function resolveRelativeCronExpr(cronExpr, baseDate) {
  if (typeof cronExpr !== "string") return cronExpr;

  const parts = cronExpr.trim().split(/\s+/);
  if (parts.length !== 5) return cronExpr;

  const ranges = [
    { min: 0, max: 59 }, // minute
    { min: 0, max: 23 }, // hour
    { min: 1, max: 31 }, // day of month
    { min: 1, max: 12 }, // month
    { min: 0, max: 6 }, // day of week
  ];

  const anchors = [
    baseDate.getMinutes(),
    baseDate.getHours(),
    baseDate.getDate(),
    baseDate.getMonth() + 1,
    baseDate.getDay(),
  ];

  let changed = false;
  const resolved = parts.map((part, index) => {
    const match = part.match(/^r(\d+)$/i);
    if (!match) return part;

    const step = parseInt(match[1], 10);
    if (!Number.isFinite(step) || step <= 0) {
      return part;
    }

    const { min, max } = ranges[index];
    let anchor = anchors[index];
    if (anchor < min || anchor > max) {
      anchor = min;
    }

    const values = [];
    for (let value = anchor; value <= max; value += step) {
      values.push(String(value));
    }

    changed = true;
    return values.join(",");
  });

  return changed ? resolved.join(" ") : cronExpr;
}

/** * 根據 cron 表達式取得下一次執行時間
 * @param {string} cronExpr
 * @param {Date} [ baseDate=new Date() ]
 * @returns {Date|null} 下一次執行時間，無法解析則回傳 null
 */
function getNextOccurrence(cronExpr, baseDate = new Date()) {
  const base = new Date(baseDate);
  if (isNaN(base.getTime())) return null;

  const interval = parseEveryIntervalExpr(cronExpr);
  if (interval) {
    return getNextOccurrenceByInterval(base, interval);
  }

  const resolvedCronExpr = resolveRelativeCronExpr(cronExpr, base);

  try {
    const cron = new Cron(resolvedCronExpr, { legacyMode: false });
    return cron.nextRun(base);
  } catch (e) {
    return null;
  }
}

/**
 *
 * @param {string[][]} pool
 * @param {string[][]} scheduled
 * @param {string[][]} microTasks
 * @returns {{candidates:[{taskId:string, title:string, score:number, source:string}], resetPoolTimeToZeroIndex:number[], totalMinsPool:number}}
 */
function calculateCandidates(pool, scheduled, microTasks) {
  /** @type [{taskId:string, title:string, score:number, source:string}] */
  let candidates = [];
  let resetPoolTimeToZeroRowIndex = [];
  let totalMinsPool = 0;
  // Task_Pool
  pool.forEach((r, index) => {
    const status = r[2]; // Status
    if (status === NBL_CONFIG.TASK_STATUS.PENDING) {
      const taskId = r[0];
      const title = r[1];
      let spentToday = parseFloat(r[4]) || 0; // Spent_Today_Mins
      const dailyLimit = parseFloat(r[5]) || 999; // Daily_Limit_Mins
      const priority = parseInt(r[6]) || 1; // Priority (1-5)
      const lastRunDate = r[7]; // Last_Run_Date

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
          // 如果 lastDate 不是今天，而spentToday 已經有值，這表示前次沒有清空，得把它歸零
          if (
            lastDate.toDateString() !== new Date().toDateString() &&
            spentToday > 0
          ) {
            resetPoolTimeToZeroRowIndex.push(index + 2); // +2 因為 sheet 是從 1 開始，且有 header row
            spentToday = 0;
          }

          const daysSince = Math.floor(
            (new Date() - lastDate) / (1000 * 60 * 60 * 24),
          );
          score += daysSince * 10; // 每多一天沒做，加 10 分
        }
      } else {
        score += 30; // 從未執行過的新任務，給予較高初始分
      }

      // 3. 配額扣分: 如果已經快超過 Daily Limit，降低出現順位
      const remainingMins = dailyLimit - spentToday;
      if (remainingMins <= 0) {
        score -= 50; // 超額任務大幅扣分，但不刪除（萬一還是要做）
      } else if (remainingMins < 15) {
        score -= 20; // 快滿了，稍微降低
      }

      candidates.push({
        taskId,
        title: `${title} (剩餘配額: ${remainingMins}m)`,
        score: Math.max(0, score), // 確保分數不為負
        source: NBL_CONFIG.SHEETS.POOL,
      });
    }
    const mins = parseFloat(r[4]) || 0;
    totalMinsPool += mins;
  });
  // Scheduled Tasks
  const now = new Date();
  scheduled.forEach((r) => {
    const status = r[2]; // 假設第 3 欄是 Status
    if (status === NBL_CONFIG.TASK_STATUS.PENDING) {
      const taskId = r[0]; // 假設第 1 欄是 ID
      let title = r[1]; // 假設第 2 欄是 Title
      const nextRunStr = r[9]; // 假設第 10 欄是 Next_Run
      let score = 50; // Scheduled 任務基礎分數較低
      if (nextRunStr) {
        const nextRunDate = new Date(nextRunStr);
        const diffMins = (nextRunDate - now) / 60000;
        title = `${title} : ${diffMins < 0 ? "過時" : "還有"}${minutesToTimeString(Math.abs(diffMins))}`;
        score = diffMins < 0 ? 500 : Math.max(50, 200 - diffMins); // 越接近執行時間分數越高
      }
      candidates.push({
        taskId,
        title,
        score,
        source: NBL_CONFIG.SHEETS.SCHEDULED,
      });
    }
  });
  // Micro_Tasks (如果有的話，可以類似處理)
  microTasks.forEach((r) => {
    const status = r[2]; // 假設第 3 欄是 Status
    if (status === NBL_CONFIG.TASK_STATUS.PENDING) {
      const taskId = r[0]; // 假設第 1 欄是 ID
      const title = r[1];
      const score = 30; // Micro_Tasks 固定分數
      candidates.push({
        taskId,
        title,
        score,
        source: NBL_CONFIG.SHEETS.MICRO_TASKS,
      });
    }
  });
  return {
    candidates: candidates.sort((a, b) => b.score - a.score),
    resetPoolTimeToZeroIndex: resetPoolTimeToZeroRowIndex,
    totalMinsPool: totalMinsPool,
  };
}

function minutesToTimeString(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.floor(totalMinutes % 60);
  return `${hours > 0 ? hours + " 小時 " : ""}` + `${minutes} 分鐘`;
}

function getSourceEmoji(source) {
  if (source === "Scheduled") return "🔔";
  if (source === "Task_Pool") return "🎯";
  if (source === "Micro_Tasks") return "⚡";
  return "📝";
}

const Utils = {
  calculateDuration: calculateDuration,
  isOverdue: isOverdue,
  generateId: generateId,
  parseToMinutes: parseToMinutes,
  getNextOccurrence: getNextOccurrence,
  calculateCandidates: calculateCandidates,
  getSourceEmoji: getSourceEmoji,
  minutesToTimeString: minutesToTimeString,
};

export default Utils;
// End of Utils.js

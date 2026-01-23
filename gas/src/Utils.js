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

/** * 根據 cron 表達式取得下一次執行時間
 * @param {string} cronExpr
 * @param {Date} [ baseDate=new Date() ]
 * @returns {Date|null} 下一次執行時間，無法解析則回傳 null
 */
function getNextOccurrence(cronExpr, baseDate = new Date()) {
  try {
    const cron = new Cron(cronExpr);
    return cron.nextRun(baseDate);
  } catch (e) {
    return null;
  }
}

/**
 *
 * @param {string[][]} pool
 * @param {string[][]} scheduled
 * @param {string[][]} microTasks
 * @returns [{taskId:string, title:string, score:number, source:string}]
 */
function calculateCandidates(pool, scheduled, microTasks) {
  /** @type [{taskId:string, title:string, score:number, source:string}] */
  let candidates = [];
  // Task_Pool
  pool.forEach((r) => {
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
          spentToday =
            lastDate.toDateString() === new Date().toDateString()
              ? spentToday
              : 0;

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
        title,
        score: Math.max(0, score), // 確保分數不為負
        source: NBL_CONFIG.SHEETS.POOL,
      });
    }
  });
  // Scheduled Tasks
  const now = new Date();
  scheduled.forEach((r) => {
    const status = r[2]; // 假設第 3 欄是 Status
    if (status === NBL_CONFIG.TASK_STATUS.PENDING) {
      const taskId = r[0]; // 假設第 1 欄是 ID
      const title = r[1]; // 假設第 2 欄是 Title
      const nextRunStr = r[9]; // 假設第 10 欄是 Next_Run
      let score = 50; // Scheduled 任務基礎分數較低
      if (nextRunStr) {
        const nextRunDate = new Date(nextRunStr);
        const diffMins = (nextRunDate - now) / 60000;
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
  return candidates.sort((a, b) => b.score - a.score);
}

const Utils = {
  calculateDuration: calculateDuration,
  isOverdue: isOverdue,
  generateId: generateId,
  parseToMinutes: parseToMinutes,
  getNextOccurrence: getNextOccurrence,
  calculateCandidates: calculateCandidates,
};

export default Utils;
// End of Utils.js

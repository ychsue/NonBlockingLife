import {Cron} from './croner.min.js';

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
function generateId(prefix="t") {
    return prefix + new Date().getTime().toString(36);
}

/**
 * 簡單的 mhdMw 的解析器，轉換為分鐘數
 * @param {string} takesTime 為 類似 "30m", "2h", "1d", "1M", "1w" 的字串
 * @returns {number|null} 分鐘數，無法解析則回傳 null
 */
function parseToMinutes(takesTime) {
    // 簡單的 mhdMw 的解析器，轉換為分鐘數
    const regex = /^(\d+)([mhdMw])$/;
    const match = takesTime.match(regex);
    if (!match) return null;
    const value = parseInt(match[1], 10);
    const unit = match[2];
    let minute = null;
    switch (unit) {
        case 'm':
            minute = value;
            break;
        case 'h':
            minute = value * 60;
            break;
        case 'd':
            minute = value * 60 * 24;
            break;
        case 'M':
            minute = value * 60 * 24 * 30;
            break;
        case 'w':
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

const Utils = {
    calculateDuration: calculateDuration,
    isOverdue: isOverdue,
    generateId: generateId,
    parseToMinutes: parseToMinutes,
    getNextOccurrence: getNextOccurrence,
};

export default Utils;
// End of Utils.js

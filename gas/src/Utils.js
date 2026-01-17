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
function generateId() {
    return "t" + new Date().getTime().toString(36);
}

const Utils = {
    calculateDuration: calculateDuration,
    isOverdue: isOverdue,
    generateId: generateId,
};

export default Utils;
// End of Utils.js

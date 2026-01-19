/**
 * 建構訊息物件，只包含有值的欄位。
 * @param {Object} param0 - 輸入參數物件
 * @param {string} param0.status - 狀態（必填）
 * @param {string} param0.message - 訊息（必填）
 * @param {string} [param0.action] - 動作（可選）
 * @param {string} [param0.recommend] - 推薦（可選）
 * @param {Object} [param0.payload] - 載荷（可選）
 * @returns {Object} 建構的訊息物件
 */
function message({ status, message, action, recommend, payload } = {}) {
  const result = { status, message };

  if (action) result.action = action;
  if (recommend) result.recommend = recommend;
  if (payload) result.payload = payload;

  return result;
}

export { message };
// 範例呼叫：
// message({ status: 'Done', message: 'A test', action: 'END' });

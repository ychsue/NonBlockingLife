/**
 * 時間工具函數
 * 處理本地時區的日期時間轉換
 */

/**
 * 取得使用者所在的時區 offset（單位：分鐘）
 * 例如：UTC+8 時區會返回 -480（因為 JavaScript Date 中 getter 返回相反值）
 */
export const getUserTimeZoneOffset = (): number => {
  return new Date().getTimezoneOffset();
};

/**
 * 時間戳（毫秒）轉換為使用者時區的 datetime-local 輸入框格式
 * @param ms - 時間戳（毫秒），如 Date.now()
 * @returns datetime-local 格式字符串 (YYYY-MM-DDTHH:mm)，如果輸入為空則返回空字符串
 *
 * @example
 * const timestamp = 1739544000000; // 某個時間戳
 * const dateStr = formatToDateTimeLocal(timestamp);
 * // 在 UTC+8 時區會顯示對應的本地時間
 */
export const formatToDateTimeLocal = (ms: number | undefined): string => {
  if (!ms) return "";

  // 建立 Date 物件（自動使用使用者本地時區）
  const date = new Date(ms);

  // 轉換為 ISO string 後截取日期時間部分
  // toISOString() 返回 UTC 時間，但我們需要本地時間
  // 因此使用其他方法
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

/**
 * datetime-local 輸入框格式轉換為時間戳（毫秒）
 * @param dateTimeStr - datetime-local 格式字符串 (YYYY-MM-DDTHH:mm)
 * @returns 時間戳（毫秒），如果輸入為空則返回 undefined
 *
 * @example
 * const dateStr = "2025-02-15T14:30";
 * const timestamp = parseFromDateTimeLocal(dateStr);
 * // 返回該本地時間對應的時間戳
 */
export const parseFromDateTimeLocal = (
  dateTimeStr: string,
): number | undefined => {
  if (!dateTimeStr) return undefined;

  // datetime-local 輸入框返回的格式是 YYYY-MM-DDTHH:mm
  // 直接使用 new Date() 會按本地時區解析
  const date = new Date(dateTimeStr);

  // 驗證日期是否有效
  if (isNaN(date.getTime())) return undefined;

  return date.getTime();
};

/**
 * 格式化時間戳為可讀的字符串（顯示用）
 * @param ms - 時間戳（毫秒）
 * @param includeTime - 是否包含時間部分（預設 true）
 * @returns 格式化字符串，如 "2025-02-15 14:30:45"
 *
 * @example
 * const timestamp = 1739544000000;
 * const formatted = formatTimestamp(timestamp);
 * // 返回 "2025-02-15 14:30:45"
 */
export const formatTimestamp = (ms: number | undefined, includeTime = true): string => {
  if (!ms) return "-";

  const date = new Date(ms);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  if (!includeTime) {
    return `${year}-${month}-${day}`;
  }

  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

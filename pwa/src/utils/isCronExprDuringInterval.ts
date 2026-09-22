import { getPredictedNextRun } from "./cronUtils";
import { getNextRun } from "./icsParser";

/**
 * 這個函數是在提供 cronExpr (或者 rrule) 的情況下，判斷它是否在指定的時間區間內。
 * @param cronExpr - 要檢查的 cron 或者 rrule 表達式
 * @param base - 基準時間，用於計算 cron 或 rrule 的下一次執行時間
 * @param start - 區間的開始時間
 * @param end - 區間的結束時間
 * @returns 是否在指定的時間區間內
 */
export function isCronExprDuringInterval(
  cronExpr: string,
  base: Date, //通常取自 nextRun
  start: Date,
  end: Date,
): boolean {
  const baseminus1ms = new Date(base.getTime() - 1);
  // 首先依據 cronExpr 是否以 "RRULE" 開頭來判斷它是 rrule 還是 cron 表達式
  if (cronExpr.startsWith("RRULE")) {
    const nextRun = getNextRun(cronExpr, baseminus1ms, start);
    // 這裡應該實現 rrule 的判斷邏輯
    return nextRun !== null && nextRun <= end;
  } else {
    let cursor = baseminus1ms;
    while (cursor <= end) {
      const nextRunNum = getPredictedNextRun(cronExpr, cursor);
      const nextRun = new Date(nextRunNum??0);
      if (!!!nextRunNum) {
        return false;
      } else if (new Date(nextRun) <= end && new Date(nextRun) >= start) {
        return true;
      }
      cursor = new Date(nextRunNum + 1);
    }
    return false;
  }
  return false;
}

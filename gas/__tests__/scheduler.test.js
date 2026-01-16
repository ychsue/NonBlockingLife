// 模擬 Google Apps Script 的環境 (Mock)
import { isTaskOverdue } from '../src/Logic';

describe('NonBlockingLife 邏輯測試', () => {
  test('當任務執行超過 90 分鐘時，應回傳 true (Deadlock)', () => {
    const startTime = new Date(Date.now() - 95 * 60000); // 95 分鐘前
    const result = isTaskOverdue(startTime, 90);
    expect(result).toBe(true);
  });

  test('當任務執行僅 30 分鐘時，應回傳 false', () => {
    const startTime = new Date(Date.now() - 30 * 60000); // 30 分鐘前
    const result = isTaskOverdue(startTime, 90);
    expect(result).toBe(false);
  });
});

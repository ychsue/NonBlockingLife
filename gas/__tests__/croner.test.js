import { Cron } from "../src/croner.min.js";

describe('NonBlockingLife 時鐘邏輯測試', () => {
  test('應該能計算出下一次任務執行時間 (代替 Deno assertEquals)', () => {
    const job = new Cron('0 9 * * *'); // 每天早上 9 點
    const nextRun = job.nextRun();
    
    // 使用 Jest 的斷言
    expect(nextRun).toBeInstanceOf(Date);
    expect(nextRun.getHours()).toBe(9);
    expect(nextRun.getMinutes()).toBe(0);
  });

  test('無效的 Cron 表達式應拋出錯誤 (代替 Deno assertThrows)', () => {
    expect(() => {
      new Cron('invalid-cron-string');
    }).toThrow();
  });
});
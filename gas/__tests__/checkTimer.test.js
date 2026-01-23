import { expect, jest } from '@jest/globals';
import { checkTimers } from '../src/checkTimers.js';

describe('NBL 定時監控測試 (checkTimers)', () => {
  const mockService = {
    getAllScheduledTasks: jest.fn(),
    updateTaskStatus: jest.fn(),
    updateTaskStatusByTaskInfo: jest.fn(),
    updateSelectionCache: jest.fn()
  };

  test('應該喚醒已到達提醒時間的 WAITING 任務', () => {
    const now = new Date();
    const tenMinsAgo = new Date(now.getTime() - 10 * 60000);

    // 模擬一個 10 分鐘前就該開始提醒的任務
    mockService.getAllScheduledTasks.mockReturnValue([{
      id: "S001",
      title: "提醒晾衣服",
      status: "WAITING",
      nextRun: now, // 預計現在執行
      before_task: 15 // 提前 15 分鐘提醒
    }]);

    // 執行 checkTimers，注入 mockService (如果您已實施注入)
    checkTimers(mockService);

    // 驗證是否呼叫了更新狀態為 PENDING
    expect(mockService.updateTaskStatusByTaskInfo).toHaveBeenCalledWith({"before_task": 15, "id": "S001", "nextRun": expect.any(Date), "status": "WAITING", "title": "提醒晾衣服"}, "PENDING" );
  });
});
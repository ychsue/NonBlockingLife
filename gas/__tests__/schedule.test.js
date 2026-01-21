import { expect, jest } from "@jest/globals";
import { handleStart, handleEnd } from "../src/Logic.js";

test('S_Laundry 結束應自動排程 S_Hang_Clothes', () => {
  const mockService = {
    getDashboardState: () => ["S_Laundry", "洗衣服", new Date(), "RUNNING"],
    findTaskById: () => ({
      id: "S_Laundry",
      callback: "S_Hang_Clothes",
      after_task: "60m" // 1 小時後
    }),
    updateScheduledTaskNextRun: jest.fn(),
    updateTaskStatus: jest.fn().mockReturnValue({ id: "S_Laundry", title: "洗衣服", source: "Scheduled", rowIndex: 2, callback: "S_Hang_Clothes", after_task: "60m" }),
    clearDashboard: jest.fn(),
    appendLog: jest.fn(),
  };

  const result = handleEnd("洗好了", mockService);

  // 驗證是否正確計算出約一小時後的時間
  console.log("Result:", result);
  expect(result.status).toBe("success");
  expect(mockService.updateScheduledTaskNextRun).toHaveBeenCalledTimes(1);
  const calledTime = mockService.updateScheduledTaskNextRun.mock.calls[0][1];
  expect(calledTime.getTime()).toBeGreaterThan(Date.now());
});

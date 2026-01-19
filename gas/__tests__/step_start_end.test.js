import { expect, jest } from "@jest/globals";
import { handleStart, handleEnd } from "../src/Logic.js";

describe("NBL 核心邏輯 - 注入式測試", () => {
  const test_id = "t123";
  const test_title = "測試任務";
  // 建立一個 Mock Service 物件
  const createMockService = (overrides = {}) => ({
    getDashboardState: jest.fn().mockReturnValue(["", "", "", "IDLE"]),
    findTaskById: jest
      .fn()
      .mockReturnValue({ id: test_id, title: test_title, source: "Task_Pool", rowIndex: 2 }),
    updateDashboard: jest.fn(),
    updateTaskStatus: jest.fn().mockReturnValue({ id: test_id, title: test_title, source: "Task_Pool", rowIndex: 2 }),
    appendLog: jest.fn(),
    clearDashboard: jest.fn(),
    ...overrides,
  });

  test("START: 應能正確啟動並調用 Service", () => {
    const mockService = createMockService();

    const result = handleStart(test_id, "測試任務", mockService);

    expect(result.status).toBe("success");
    // 驗證是否有寫入 Dashboard
    expect(mockService.updateDashboard).toHaveBeenCalledWith(
      expect.arrayContaining([test_id, test_title, expect.any(Date), "RUNNING"])
    );
    expect(mockService.appendLog).toHaveBeenCalledWith(
      expect.arrayContaining([expect.any(Date), test_id, test_title, "START", "Task_Pool", "RUNNING", "測試任務"])
    );
  });

  test("END: 應正確計算時長並累加時間", () => {
    const thirtyMinsAgo = new Date(Date.now() - 30 * 60000);
    const mockService = createMockService({
      getDashboardState: jest
        .fn()
        .mockReturnValue([test_id, test_title, thirtyMinsAgo, "RUNNING"]),
    });

    const result = handleEnd("",mockService);

    expect(result.status).toBe("success");
    expect(result.payload.duration).toBe(30);
    // 驗證是否呼叫了更新 Pool 的動作並傳入 30 分鐘
    expect(mockService.updateTaskStatus).toHaveBeenCalledWith(
      "t123",
      "DONE",
      30
    );
  });
});

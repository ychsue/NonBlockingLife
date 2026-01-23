import Utils from "../src/Utils.js";

describe("calculateCandidates 排序邏輯測試", () => {
  test("過期任務應獲得 500 分並排在第一名", () => {
    // 模擬從 Sheet 讀出來的 Raw Data (跳過標題後的內容)
    const mockPool = [];
    const mockMicro = [];
    // ID, Title, Status, ..., NextRun(索引9)
    const mockScheduled = [
      [
        "S01",
        "過期任務",
        "PENDING",
        "",
        "",
        "",
        "",
        "",
        "",
        new Date(Date.now() - 1000).toISOString(),
      ],
    ];

    const result = Utils.calculateCandidates(
      mockPool,
      mockScheduled,
      mockMicro,
    );

    expect(result[0].taskId).toBe("S01");
    expect(result[0].score).toBe(500);
  });

  test("應過濾掉狀態不是 PENDING 的任務", () => {
    const mockPool = [["T01", "已完成任務", "DONE", "", "", "", 5]];
    const result = Utils.calculateCandidates(mockPool, [], []);
    expect(result.length).toBe(0);
  });
});

describe("calculateCandidates: Task_Pool 智慧評分測試", () => {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  test("跨日自動歸零測試：昨天已達上限的任務，今天應恢復分數", () => {
    // 欄位定義：[0]ID, [1]Title, [2]Status, [3]Project, [4]SpentToday, [5]DailyLimit, [6]Priority, [7]LastRun
    const mockPool = [
      [
        "T_RESET_TEST",
        "跨日任務",
        "PENDING",
        "ProjA",
        120, // 殘留值：120分鐘 (已超過 Limit)
        60, // Limit: 60分鐘
        5, // Priority: 5 (基礎分 100)
        yesterday.toISOString(), // 最後執行日：昨天
      ],
    ];

    const result = Utils.calculateCandidates(mockPool, [], []);

    // 預期邏輯：
    // 1. 基礎分 100
    // 2. 檢測到日期非今天 -> spentToday 視為 0
    // 3. daysSince = 1 -> 飢餓分 +10
    // 4. remainingMins = 60 - 0 = 60 -> 不扣分
    // 最終得分應為 110
    expect(result[0].score).toBe(110);
    expect(result[0].taskId).toBe("T_RESET_TEST");
  });

  test("今日配額扣分測試：今天已執行過久應降分", () => {
    const todayStr = now.toDateString();
    const mockPool = [
      [
        "T_QUOTA_TEST",
        "今天太累了",
        "PENDING",
        "ProjB",
        55, // 今天已做 55 分鐘
        60, // Limit: 60 分鐘 (剩餘 < 15 分鐘)
        5, // Priority: 5 (基礎分 100)
        todayStr, // 最後執行日：今天
      ],
    ];

    const result = Utils.calculateCandidates(mockPool, [], []);

    // 預期邏輯：
    // 1. 基礎分 100
    // 2. 日期是今天 -> spentToday 維持 55
    // 3. daysSince = 0 -> 飢餓分 +0
    // 4. remainingMins = 60 - 55 = 5 -> 觸發 < 15 分鐘扣分 (-20)
    // 最終得分應為 80
    expect(result[0].score).toBe(80);
  });

  test("新任務與長期飢餓加成測試", () => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const mockPool = [
      ["T_NEW", "新任務", "PENDING", "", 0, 60, 1, ""], // 基礎 20 + 新任務 30 = 50
      ["T_OLD", "老任務", "PENDING", "", 0, 60, 1, sevenDaysAgo.toISOString()], // 基礎 20 + 飢餓 70 = 90
    ];

    const result = Utils.calculateCandidates(mockPool, [], []);

    // 排序後：老任務 (90分) 應排在第一
    expect(result[0].taskId).toBe("T_OLD");
    expect(result[0].score).toBe(90);
    expect(result[1].taskId).toBe("T_NEW");
    expect(result[1].score).toBe(50);
  });
});

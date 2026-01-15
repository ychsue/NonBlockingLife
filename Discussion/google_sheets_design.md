# NonBlockingLife 系統規格書 (v1.0)

## 1. 核心邏輯

- **Event Sourcing**: 所有操作先入 `Log`。
- **State Machine**: `Dashboard` 反映當前執行棧狀態。
- **Non-Blocking**: 利用 `Inbox` 與 `Async_Await` 處理突發與等待，不阻塞當前任務。

## 2. 數據結構 (Sheets)

| 工作表           | 角色       | 核心操作                                 |
| ---------------- | ---------- | ---------------------------------------- |
| **Log**          | 產線流水線 | 只准 Append (Timestamp 紀錄)             |
| **Dashboard**    | 監控塔     | Update (反映目前 CPU 佔用情形)           |
| **Inbox**        | 緩衝區     | Insert (快速捕捉靈感/突發)               |
| **Task\_Pool**   | 宏任務型錄 | Update Status (Pending -> Doing -> Done) |
| **Micro\_Tasks** | 碎事型錄   | Delete/Update (完成即標記)               |
| **Periodic**     | 生產規則   | Read/Update (自動生成邏輯)               |
| **Async**        | 異步追蹤   | Follow-up (等待回調中)                   |

3\. 關鍵 API 行為 (GAS)

-   `doPost`:
    - 接收 iOS Shortcut JSON。
    - 寫入 `Log`。
    - 根據 Action 更新 `Dashboard` 與對應型錄 `Status`。
    - 回傳 JSON (包含建議與超時警告)。
-   `HourlyTrigger`:
    - 檢查 `Dashboard` 時間差。
    - 若 `Duration > 90min` \-> 發送 Deadlock 警報。
  
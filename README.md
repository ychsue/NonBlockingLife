# NonBlockingLife (NBL) 🚀

> "Stop blocking your life's main thread."

**NonBlockingLife** 是一個基於電腦科學 **Event Loop (事件循環)** 原理開發的個人調度系統。它專門為「容易過度沉迷於單一任務、導致其他生活重要事件延宕」的高專注者設計。

透過將大腦視為單執行緒（Single Thread）處理器，本專案旨在建立一個外部監控機制，防止「主執行緒阻塞（Main Thread Blocking）」，確保生活的各類任務（微任務、宏任務、異步回調）能流暢運轉。

---

## 核心理念：大腦的 Event Loop

* **單執行緒（Single Thread）：** 承認人類一次只能深度處理一件事。
* **非阻塞（Non-blocking）：** 耗時的等待（如等回信、等衣服洗完）應移出大腦，交給系統監控。
* **超時中斷（Timeout Interrupt）：** 透過外部節拍器（GAS），強制檢查執行中的任務是否過久，防止死結（Deadlock）。
* **微任務優先（Microtask Priority）：** 在切換大任務前，強制引導清空瑣事，保持大腦內存（Memory）潔淨。

---

## 技術架構 (Technology Stack)

* **Storage:** Google Sheets (作為 Event Log 與 Task Queue)
* **Logic Engine:**  Google Apps Script (GAS) (作為系統調度員 Scheduler)
* **Input Interfac:e**  iOS Shortcuts (實現一鍵快速狀態上傳)
* **Notification:** Gmail / Push Notification (執行超時警告)

---

## 初步規劃 (Roadmap)

### 第零階段：分析可能運作模式

``` mermaid
sequenceDiagram
    autonumber
    participant User as 使用者 (你)
    participant iOS as iPhone 捷徑 (Input)
    participant GAS as Google Apps Script (Scheduler)
    participant Sheet as Google Sheets (Storage)
    participant Email as 通知系統 (Gmail/Push)

    Note over User, Email: 任務啟動階段
    User->>iOS: 按下 [開始任務] 按鈕
    iOS->>User: 彈出詢問：當前任務名稱/狀態?
    User-->>iOS: 輸入 "撰寫企劃書"
    iOS->>GAS: POST JSON (TaskName, Timestamp, State)
    GAS->>Sheet: 寫入新行 (Append Row)
    GAS-->>iOS: 回傳 200 OK
    iOS->>User: 顯示「任務已掛載，祝專注！」

    Note over User, Email: 監控與超時階段 (每小時觸發)
    GAS->>Sheet: 讀取最後一筆任務時間
    alt 執行時間 > 90 分鐘 (Deadlock!)
        GAS->>Email: 發送「超時警告」與「待辦清單」
        Email-->>User: 手機彈出：主線程已阻塞！請休息或切換任務
    else 執行時間正常
        GAS->>GAS: 保持靜默 (Idle)
    end

    Note over User, Email: 任務切換/結束 (Context Switch)
    User->>iOS: 按下 [切換/完成] 按鈕
    iOS->>GAS: POST JSON (Action: Switch)
    GAS->>Sheet: 更新舊任務結束時間
    GAS-->>iOS: 觸發提醒：請清空微任務 (Flush Microtasks)
    iOS->>User: 提醒：現在是處理瑣事的好時機！
```

#### 圖表解析與設計重點

1. **非同步輸入 (Step 1-7)**：使用者不需要打開繁重的 Google Sheets App，
   透過 iOS 捷徑作為「快速入口」，實現低摩擦的 Log 記錄。

2. **主動調度 (Step 8-11)**：這是解決你「一做就停不下來」的關鍵。
   GAS 扮演了系統守護行程（Daemon），即使你忘記時間，它也會透過定時觸發器（Time-driven trigger）主動介入。

3. **狀態更新 (Step 12-16)**：這就是 Event Loop 中的「Pop Stack」動作。當大任務結束，
   系統會強制推播一個「微任務處理」的建議，確保你的生活內存（Mental Space）不會被瑣事塞滿。

### 第一階段：基礎日誌與 API (MVP)

* 設計 Google Sheets 模板（包含 Timestamp, State, Task Name, Duration）。
* 撰寫 GAS `doPost(e)` 接收 iPhone 捷徑傳來的 JSON 數據。
* 實作 iOS Shortcuts：建立「開始」、「切換」、「中斷」三個快速按鈕。

### 第二階段：調度監控 (Scheduler Logic)

* 實作 **Deadlock Detection**：GAS 定時檢查，若單一任務執行超過設定閥值（如 90min），主動發送提醒。
* 實作 **State Context**：自動判定當前狀態，切換時詢問「是否需要清空微任務？」。
* 每小時自動彙總「未完成宏任務」清單並推送到手機。

---

### 第三階段：數據分析與優化

* 統計每週「阻塞時間」與「任務分布圖」。
* 增加「異步任務追蹤」：標記等待中的事項，直到接收到回調（Callback）。

---

## 快速開始 (Quick Start) - 預覽

1. 複製 Google Sheets 模板。
2. 部署 `NonBlockingLife.gs` 為網頁應用程式。
3. 將產出的 URL 貼入 iOS 捷徑配置中。
4. 按下「Start Task」，開始你的非阻塞生活。

---

## 為什麼需要這個專案？

當我們進入「心流」時，往往會忽略時間的流逝，這雖然高效，但也可能導致生活中其他重要的「異步事件」被無限期擱置。**NonBlockingLife** 不是要打破你的專注，而是要成為你的外部系統時鐘，在你沉迷太久時溫柔地提醒你：

> <span style="color:red"> "Hey, 你的執行棧已經堆積太久了，是時候 Flush 一下微任務，去喝杯水了嗎？" </span>

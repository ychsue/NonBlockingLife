# GAS 負責的動作

``` mermaid
sequenceDiagram
    autonumber
    participant U as User/iOS Shortcut
    participant GAS as GAS (Scheduler Core)
    participant S as Sheets (Database)
    box rgb(220, 255, 220) Async Processes
    participant T as Hourly Trigger
    participant E as Email System
    end

    Note over U, GAS: 核心互動流程 (Starts, Ends, Queries)

    U->>GAS: Request (Action: END, TaskID?)
    GAS->>S: 查詢 Dashboard 取得當前 TaskID
    S-->>GAS: 回傳 TaskID, StartTime
    GAS->>S: 計算時長, 更新 Task_Pool (Status=DONE, Spent_Today), 清空 Dashboard
    GAS->>S: 寫入 Log
    GAS->>U: 回傳結束狀態與微任務提醒 (JSON)

    U->>GAS: Request (Action: INBOX_ADD, Content)
    GAS->>S: 檢查 Inbox 是否重複存在 (掃描 Content 列)
    alt Content exists
        S-->>GAS: 回傳找到的 TaskID
        GAS->>U: 提醒：此想法已存在，ID: XXX
    else Content new
        GAS->>S: 寫入 Inbox 新行 (產生新 TaskID)
        S-->>GAS: 確認寫入
        GAS->>U: 回傳成功訊息
    end

    U->>GAS: Request (Action: QUERY_DASHBOARD_STATUS)
    GAS->>S: 讀取 Dashboard 狀態
    S-->>GAS: 回傳當前 Task, StartTime, System_Status
    GAS->>U: 顯示狀態 (透過 iOS 捷徑解析 JSON 彈窗)

    Note over T, E: 背景監控流程 (Scheduler Daemon)

    T->>GAS: 每小時觸發 (Hourly Check)
    GAS->>S: 讀取 Dashboard 時間, Task_Pool (Spent_Today & Daily_Limit)
    alt 超時或超量 (Deadlock Detected)
        GAS->>E: 發送 Email 警告 (主線程阻塞!)
    else 正常
        GAS->>E: (或發送每日/每週進度彙整 Email)
    end
```

``` mermaid
sequenceDiagram
    autonumber
    participant U as User/iOS Shortcut
    participant GAS as GAS (Scheduler Core)
    participant S as Sheets (Database)
    box rgb(240, 240, 255) UI & Cache
    participant SC as Selection_Cache
    end
    box rgb(220, 255, 220) Async Processes
    participant T as Hourly Trigger
    end

    Note over U, GAS: 核心互動：中斷與選擇任務

    U->>GAS: Request (Action: INTERRUPT)
    GAS->>S: 讀取 Dashboard 狀態 (Current_Task_ID, Name)
    S-->>GAS: 回傳 Task A 資訊
    GAS->>S: 寫入 Log (Action: PAUSE, Task A)
    GAS->>S: 清空 Dashboard, 更新 Task_Pool (Status=PENDING)
    GAS->>U: 回傳 JSON: "Task A 已暫停。請輸入中斷原因或新任務。"

    U->>GAS: Request (Action: QUERY_OPTIONS)
    GAS->>S: 從 Task_Pool, Micro_Tasks 撈取 Status=PENDING 的任務清單
    GAS->>SC: 更新 Selection_Cache (快取可用選項與 ID)
    S-->>GAS: 回傳最新選項列表
    GAS->>U: 顯示列表 (iOS 捷徑彈出選單)

    U->>GAS: Request (Action: START, TaskID: t123)
    GAS->>S: 查詢 TaskID 詳細資料
    GAS->>S: 查詢 Dashboard (是否有 Running Task?)
    S-->>GAS: 回傳 Dashboard 狀態
    alt Task is Running (Blocking)
        GAS->>U: 警告：有任務正在運行，確定要中斷嗎？
        U->>GAS: 確認中斷 (Action: FORCE_START)
    end
    GAS->>S: 更新 Dashboard, 更新 Task_Pool 狀態, 寫入 Log
    S-->>GAS: 確認更新
    GAS->>U: 回傳成功狀態 (JSON)


    Note over U, GAS: 核心互動：新增與移動任務

    U->>GAS: Request (Action: ADD_TASK, Title, Category)
    GAS->>S: 寫入 Inbox 或 Task_Pool (生成 TaskID)
    GAS->>S: 寫入 Log (Action: ADD)
    GAS->>U: 回傳成功 JSON

    U->>GAS: Request (Action: MOVE_TASK, TaskID, TargetSheet)
    GAS->>S: 查詢 TaskID 資料, 從原位置刪除/軟刪除
    GAS->>S: 寫入目標 Sheet
    GAS->>S: 寫入 Log (Action: MOVE)
    GAS->>U: 回傳成功 JSON
```

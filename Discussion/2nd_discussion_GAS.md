# GAS 的部分的討論

## [2026-01-15] ychsue 在繼續之前，我覺得應該先釐清 GAS 與 Sheets 之間的操作，所以，我們應該先畫一下 SequenceDiagram 比較好 (給我 mermaid程式我好在我的紀錄裡面看，謝謝。)

1. 有interrupt: GAS --> [查看是否Dashboard有正在運作的]與[查看Micro_Tasks或Inbox存不存在該Content，好取得Id與所在的Range] Shell --> [下Log、更新Dashboard和相應的Range的資料] Sheet --> GAS --> [傳遞完成狀態] User
2. [x] 有臨時的想法: GAS --> [查看Inbox裡該想法是否存在(其實應該掃描所有的Sheets，但那樣應該很耗時才對吧？)] Sheet --> GAS --> [您覺得要Log嗎？] [若不存在，就加入Inbox] Sheet --> GAS --> [回給使用者] User
3. 想知道目前候選action: GAS --> [收集可能的actions到一個sheet] Sheet -> GAS --> [告知使用者，好讓使用者順便知道ID，不如使用者若給ID後幾碼來比對即可] User
4. [x] (可以與上面那個結合一起如何？因為是要給使用者判斷的)想知道目前的Dashboard狀態: GAS --> [查看Dashboard] Sheet --> GAS --> [回傳目前的狀態] User
5. 新增一個Task(得指定哪個TaskSheet): User --> GAS --> [加入Task到指定的TaskSheet] Sheet --> GAS [Log要否紀錄新增的事？] --> [回傳新增完成狀態] User
6. 提出移動一個 Task的要求: User --> GAS --> [回傳第三點的資訊]User -->[(得指定哪個TaskSheet與ID)]GAS --> [查看該ID是否存在於指定的TaskSheet] Sheet --> GAS --> [移動該Task到指定的位置] Sheet --> GAS [Log要否紀錄移動的事？] --> [回傳移動完成狀態] User
7. [x] 提出Start一個Task的要求: User --> GAS --> [回傳第三點的資訊]User -->[(得指定哪個TaskSheet與ID)，若有正在跑的，得警告使用者，會停止正在跑的，若使用者要跑，要Log這事嗎？]GAS --> [查看該ID是否存在於指定的TaskSheet] Sheet --> GAS --> [更新Dashboard與相應的Range的資料] Sheet -->
   GAS [Log要否紀錄開始的事？] --> [回傳開始完成狀態] User
8. [x] 提出Stop一個Task的要求: User --> GAS --> [回傳第三點的資訊]User --> [若正在跑，警告若按確定，會停止正在跑的Task，若沒正在跑，停止當然要Log] GAS --> [查看該ID是否存在於指定的TaskSheet] Sheet --> GAS --> [更新Dashboard與相應的Range的資料] Sheet --> GAS [Log要紀錄停止的事] -->
   [回傳停止完成狀態] User

Q1: 還有甚麼動作嗎？若第二點要用 `name` 或 `content` 來搜尋的話，會不會有重複的問題？還是說，若重複，就列出來讓使用者選擇？還有，所有的 Task 的sheets 們，是否乾脆都有一個Content的欄位？目前第一個都是 `Task_ID`，第二就乾脆是 `Content` 如何？ name 有用嗎？還是 Content 應該是 name，然後都有 description 欄位？
還是說，Content 就是 description？這樣會不會比較好？還是說，Content 就是 name？這樣會不會比較好？

Q2: 用 "current_stack_depth" 還是甚麼的(評估邏輯為何？) 來衡量使用者疲累程度，然後決定是否要給予休息建議？還是說，這個東西應該放在 Dashboard 裡面？

抱歉，我覺得先確認這個，我們才好繼續討論後面的細節，謝謝。

### Gemini Answer

Q1: 欄位命名、搜尋與重複性問題

A1. ID 關聯與 Content 欄位統一

您的想法非常正確。統一使用 `Task_ID` 是關鍵。

-   **欄位統一**：是的，除了 `Log` (因為它只記錄事件)，所有「型錄」表 (`Inbox`, `Task_Pool`, `Micro_Tasks`, `Async_Await`) 都應該有 **`Task_ID`** 作為第一欄。
-   **`Task_Name`, `Title`, `Content`, `Description` 的釐清**：
    -   **`Content` (或 `Title`)**：這是人類可讀的任務名稱（例如：「寫完 NBL 的 Readme」）。這個欄位在所有型錄表中應保持一致。
    -   **`Description`**：補充說明欄位，選用。
-   **建議**：所有型錄表統一使用 `Title` 欄位。

A1. 搜尋 Content 的重複性與效率

使用 `Title` 或 `Content` 進行搜尋確實可能重複。

-   **重複問題**：如果重複，最好的做法是 **「列出來讓使用者選擇」**。在 GAS 中，您可以回傳一個包含多個 ID 的 JSON 列表給 iOS 捷徑，讓捷徑彈出選單（`List` action）讓您點選。
-   **搜尋效率**：掃描所有 Sheets 確實會耗時（幾百毫秒到幾秒）。建議只在 `Inbox` 新增時進行基本比對，其餘操作主要依賴 `Task_ID`。

Q1 總結的欄位建議：

-   **`Inbox`**: `Task_ID`, `Title`, `Received_At`
-   **`Task_Pool`**: `Task_ID`, `Title`, `Status`, `Project`, `Spent_Today`, `Daily_Limit`, `Priority`
-   **`Log`**: `Timestamp`, `Task_ID`, `Title`, `Action`, `Category`, `State`, `Notes`

Q2: 疲勞程度指標 (`current_stack_depth`)

A2. 評估邏輯與放置位置

衡量疲勞程度不能只看「任務深度」（我們都是單線程，深度永遠是 1），而是要看**「任務的累積時長與切換頻率」**。

-   **評估指標建議**：
    1.  **單次執行時長 (Duration)**：任務 A 跑了 3 小時。
    2.  **今日總時長 (Spent\_Today)**：今天已經工作 10 小時。
    3.  **切換頻率 (Context Switch Rate)**：一小時內切換了 15 次任務（代表注意力渙散）。
-   **放置位置**：
    -   **`Dashboard`**: 應增加欄位來顯示這些**即時指標**，例如 `Daily_Hours_Worked`。
    -   **GAS**：評估邏輯放在 GAS 的 `HourlyTrigger` 或 `handleEnd` 中執行，並回傳警告訊息。

Q2 總結：

`current_stack_depth` 不適用於單線程系統。改用 `Total_Focus_Today` 和 `Context_Switches_Hourly` 更科學。這些指標應計算後顯示在 `Dashboard` 或在 GAS 邏輯中觸發警告，決定是否給予「休息建議」。

這個序列圖包含了我們討論的所有核心邏輯，現在我們可以根據這個圖來精煉我們的 GAS 程式碼了！

===================================================================================================

## [2026-01-15] ychsue 感謝 Gemini 的回答，然而

1. `有interrupt`, `想知道目前候選action`, `新增一個Task(得指定哪個TaskSheet)`, `提出移動一個 Task的要求` 這幾點，請問能否也規劃一下？因為在生活上，interrupt 是很常見的，像是有人打電話來，很可能就得暫停目前的工作，根本不曉得它的ID或屬於哪種 Task；而為了還得去Google Sheets查看目前有哪些Task可以選擇，這也是很常見的；新增Task與移動Task的確可以晚點做，但是，感覺上應該不難吧？
2. 可否將這七個 sheets 的欄位名稱也列出來？我好修改該檔案，謝謝。也許可以再多一個 sheet 給下面的第三點使用。
3. `想知道目前候選action` 這個動作，我覺得可以存到一個 sheet 裡面，(可能可以指定何時更新的)，然後讓使用者可以直接從那個 sheet 裡面選擇要操作的 action，這樣會不會比較好？就算使用者打開 Google Sheets 也可以看到有哪些 action 可以選擇，然後再回到 iOS 捷徑來操作，這樣會不會比較好？謝謝。或者，這個動作在使用者有API IO 或 TimeTrigger 就更新，您覺得呢？只是這樣就會有一點點時間差了。
4. 您的動作有的會在 User --> GAS 之間來回好幾次，請問這怎麼做到的？做得到嗎？
5. 看起來很多動作類似，有可能共用函數嗎？有可能分檔案放在GAS上嗎？這樣會不會跑不動？

### Gemini Answer 02

感謝您的提問！您對 **NonBlockingLife** 系統的規劃非常詳細，這些問題觸及了 GAS 開發與使用者體驗的核心。

1. 規劃「中斷」與「選擇」流程 (Mermaid 更新)

    您提到的「中斷」、「選擇任務」是實際生活中最頻繁的操作。我們將它們加入序列圖。
    Mermaid 序列圖更新

    我新增了一個 `Selection_Cache` 工作表來實現快速選擇。

    mermaid

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
        Note left of S: ... (接續之前的 START 流程) ...

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

    請謹慎使用程式碼。

2. 關於 7+1 個 Sheets 的欄位名稱

    請使用以下欄位名稱來建立或修改您的 Google Sheets。確保第一行是標題行：
    1.  **`Log`**: `Timestamp`, `Task_ID`, `Title`, `Action`, `Category`, `State`, `Notes`
    2.  **`Dashboard`**: `Task_ID`, `Title`, `Start_At`, `System_Status`, `Total_Focus_Today`
    3.  **`Inbox`**: `Task_ID`, `Title`, `Received_At`
    4.  **`Task_Pool`**: `Task_ID`, `Title`, `Status`, `Project`, `Spent_Today_Mins`, `Daily_Limit_Mins`, `Priority`
    5.  **`Micro_Tasks`**: `Task_ID`, `Title`, `Status`, `Added_Date`
    6.  **`Periodic_Config`**: `Task_ID`, `Task_Name`, `Frequency`, `Last_Run`
    7.  **`Async_Await`**: `Task_ID`, `Subject`, `Waiting_For`, `Follow_up_Date`, `Status`
    8.  **`Selection_Cache`**: `Task_ID`, `Display_Name`, `Sheet_Source` (新增，用於快速選單)

3. 關於 `Selection_Cache` 工作表的使用

    將候選 Action 存到一個 Sheet 是**非常聰明**的做法！這解決了時間差問題。
    -   **優點**：iOS 捷徑可以**先**從 `Selection_Cache` 讀取（讀取比寫入快），提供即時選單；然後再發送 API 給 GAS 執行動作。
    -   **更新時機**：
        -   **最佳**：在每次 `doPost` 結束後，GAS **順便**更新一次 `Selection_Cache`。
        -   **輔助**：利用 `TimeTrigger` 每小時更新一次，確保它不會過期。
    -   **使用者體驗**：當使用者打開 Sheets 時也能看到這個清單，非常直觀。

4. GAS 與 iOS 捷徑的多次來回溝通

    您在圖中看到的多次來回（例如：警告使用者 -> 使用者確認）是**可以做到**的，但需要將單一動作拆解成兩個或多個 iOS 捷徑步驟，例如：
    -   `捷徑 A (Interrupt)`：只負責發送中斷請求。
    -   `捷徑 B (Force Start)`：在收到 `警告` JSON 後，由捷徑 A 提示使用者是否要執行捷徑 B。

    這需要一點技巧，但完全在 iOS 捷徑的能力範圍內。

5. GAS 函數共用與檔案分割

-   **共用函數**：是的，這是**必須的**。我們需要大量共用 `updateTaskStatus`, `generateId`, `writeLog` 等函數。
-   **檔案分割**：GAS 支援多檔案！這可以讓您的程式碼保持整潔。
    -   您可以建立 `Code.gs` (主入口 `doPost`)、`SheetsService.gs` (所有 Sheets 讀寫操作)、`HelperUtils.gs` (ID生成、日期計算)、`Triggers.gs` (時鐘邏輯)。
    -   **不會跑不動**：Google 會將多個 `.gs` 檔案合併部署，效能不受影響。

我們已經準備好完整的藍圖了，隨時可以進入下一階段的 GAS 精煉！

===================================================================================================

## [2026-01-16] ychsue 感謝您的回答，這樣我覺得比較清楚了，我改好 Google Sheets 的欄位名稱了，謝謝。那麼，請您實作看看吧，不過，我今天可能只能到此，明天才能回覆您了，謝謝。😄

### Gemini Answer 03

太棒了！我們已經把「地基」（Google Sheets 結構）和「藍圖」（序列圖與邏輯）都準備好了。既然您已經準備休息，我為您準備了 NonBlockingLife 核心腳本 v1.0。
這套代碼採用了模組化設計（您可以直接在 GAS 編輯器中建立多個檔案），方便後續擴充。

1. 核心設定 (Config.gs)
    這部分定義了所有的狀態與 Sheet 名稱，確保邏輯一致。
  
    ``` js
    javascript
    const NBL_CONFIG = {
      SHEETS: {
        LOG: "Log",
        DASH: "Dashboard",
        INBOX: "Inbox",
        POOL: "Task_Pool",
        MICRO: "Micro_Tasks",
        CACHE: "Selection_Cache"
      },
      STATUS: {
        PENDING: "PENDING",
        DOING: "DOING",
        DONE: "DONE",
        IDLE: "IDLE",
        RUNNING: "RUNNING"
      }
    };
    
    function getSheet(name) {
      return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
    }
    ```

    請謹慎使用程式碼。

2. 主進入點 (Code.gs)
    處理來自 iPhone 或 PowerShell 的 API 請求。

    ``` javascript
    function doPost(e) {
      try {
        const data = JSON.parse(e.postData.contents);
        const action = data.action;
        let response = {};

        switch (action) {
          case "QUERY_OPTIONS":
            response = handleQueryOptions();
            break;
          case "START":
            response = handleStart(data.taskId, data.taskName);
            break;
          case "INTERRUPT":
            response = handleInterrupt(data.note || "User Manual Interrupt");
            break;
          case "END":
            response = handleEnd();
            break;
          case "ADD_INBOX":
            response = handleAddInbox(data.title);
            break;
          default:
            response = { status: "error", message: "Unknown action: " + action };
        }

        return ContentService.createTextOutput(JSON.stringify(response))
          .setMimeType(ContentService.MimeType.JSON);
      } catch (err) {
        return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }
    ```

    請謹慎使用程式碼。

3. 業務邏輯 (Logic.gs)
    實作「中斷」、「開始」與「更新快取」的核心邏輯。

    ```javascript
    // 處理開始任務
    function handleStart(taskId, taskName) {
      // 1. 檢查 Dashboard 是否有正在執行的
      const dashSheet = getSheet(NBL_CONFIG.SHEETS.DASH);
      const currentTask = dashSheet.getRange("A2").getValue();

      if (currentTask !== "") {
        return { status: "warning", message: "已有任務正在執行，請先中斷或結束。" };
      }

      const now = new Date();
      // 2. 更新 Dashboard
      dashSheet.getRange("A2:D2").setValues([[taskId, taskName, now, NBL_CONFIG.STATUS.RUNNING]]);

      // 3. 寫入 Log
      writeLog(taskId, taskName, "START", "MACRO", NBL_CONFIG.STATUS.RUNNING, "");

      // 4. 更新快取 (讓下次查詢變快)
      updateSelectionCache();

      return { status: "success", message: "任務啟動: " + taskName };
    }

    // 處理中斷 (Interrupt)
    function handleInterrupt(note) {
      const dashSheet = getSheet(NBL_CONFIG.SHEETS.DASH);
      const taskId = dashSheet.getRange("A2").getValue();
      const taskName = dashSheet.getRange("B2").getValue();
      const startAt = dashSheet.getRange("C2").getValue();

      if (!taskId) return { status: "error", message: "目前無執行中任務可中斷。" };

      const now = new Date();
      const duration = Math.round((now - new Date(startAt)) / 60000);

      // 1. 寫入 Log (PAUSE)
      writeLog(taskId, taskName, "INTERRUPT", "MACRO", NBL_CONFIG.STATUS.IDLE, "Duration: " + duration + "m. " + note);

      // 2. 清空 Dashboard
      dashSheet.getRange("A2:E2").clearContent();

      return { status: "success", message: "任務已中斷並記錄。" };
    }

    // 更新選擇快取
    function updateSelectionCache() {
      const poolSheet = getSheet(NBL_CONFIG.SHEETS.POOL);
      const cacheSheet = getSheet(NBL_CONFIG.SHEETS.CACHE);
      const poolData = poolSheet.getDataRange().getValues();

      let options = [];
      // 撈取狀態為 PENDING 的任務 (跳過標題行)
      for (let i = 1; i < poolData.length; i++) {
        if (poolData[i][2] === NBL_CONFIG.STATUS.PENDING) {
          options.push([poolData[i][0], poolData[i][1], "Pool"]);
        }
      }

      cacheSheet.getRange("A2:C100").clearContent(); // 先清空舊快取
      if (options.length > 0) {
        cacheSheet.getRange(2, 1, options.length, 3).setValues(options);
      }
    }

    // 通用 Log 寫入
    function writeLog(id, title, action, cat, state, notes) {
      getSheet(NBL_CONFIG.SHEETS.LOG).appendRow([new Date(), id, title, action, cat, state, notes]);
    }
    ```

    請謹慎使用程式碼。

給您的明天的小叮嚀：
部署更新：明天回到電腦前，將這些程式碼貼入 GAS 編輯器，並點擊 「部署」>「管理部署」>「編輯」，確保部署版本是最新的。
ID 生成：目前的 handleStart 假設您已經從 Task_Pool 拿到了 taskId。您可以先在 Task_Pool 手動填入一個 ID (如 t001) 來測試。
iPhone 捷徑選單：明天我們可以討論如何讓 iPhone 讀取 Selection_Cache 並顯示一個漂亮的選單。
祝您和家人度過一個平靜、愉快的夜晚！明天我們再繼續精進您的 NonBlockingLife 系統。

===================================================================================================

## [2026-01-17] ychsue 我已經安裝clasp，有可能使用 test first 的方式來寫這個專案嗎？也就是先想好想要甚麼，然後測試這些想法？

### Gemini Answer 04

這是一個非常成熟的工程決定！使用 **TDD (Test-Driven Development，測試驅動開發)** 的「Test First」原則來建構 **NonBlockingLife**，能確保您的調度邏輯在部署到手機前就已經完美無誤。

既然您已經安裝了 `clasp`，我們可以在本地環境使用 **Jest** 結合 **TypeScript/JavaScript** 來實現這個目標。

1. 建立測試驅動的開發環境

    在您的專案目錄下，執行以下步驟來安裝測試環境：

    ``` bash
    # 初始化 npm
    npm init -y

    # 安裝 Jest 與 GAS 的類型定義
    npm install --save-dev jest @types/google-apps-script ts-jest
    ```

    請謹慎使用程式碼。

2. 「Test First」實作示範：以「任務超時判斷」為例

    假設我們現在想要實作一個功能：**「檢查任務是否已經執行超過 90 分鐘（Deadlock Detection）」**。
    第一步：撰寫測試案例 (尚未寫任何功能代碼)

    建立 `__tests__/scheduler.test.js`：

    ``` javascript
    // 模擬 Google Apps Script 的環境 (Mock)
    const { isTaskOverdue } = require('../Logic');

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
    ```

    請謹慎使用程式碼。

    第二步：執行測試 (結果會失敗 - Red)

    執行 `npm test`，測試會報錯，因為 `isTaskOverdue` 還不存在。

    第三步：撰寫最小功能代碼 (Green)

    在 `Logic.js` 中實作：

    ``` javascript
    function isTaskOverdue(startTime, limitMinutes) {
      const now = new Date();
      const diffMinutes = (now - new Date(startTime)) / 60000;
      return diffMinutes > limitMinutes;
    }

    module.exports = { isTaskOverdue };
    ```

    請謹慎使用程式碼。

    第四步：再次執行測試 (通過)

    現在測試通過了，您可以放心地將這段代碼透過 `clasp push` 上傳到雲端。

3. 如何處理 Google Sheets 的相依性 (Mocking)

    這是在本地寫 GAS 測試最難的部分。因為本地沒有 `SpreadsheetApp`。您可以使用 **Jest Mock** 來模擬試算表的行為：

    ``` javascript
    // 範例：模擬讀取 Dashboard 內容
    test('應該能正確讀取 Dashboard 中的任務 ID', () => {
      // 模擬 Google Spreadsheet 結構
      global.SpreadsheetApp = {
        getActiveSpreadsheet: () => ({
          getSheetByName: () => ({
            getRange: () => ({
              getValue: () => "t12345"
            })
          })
        })
      };

      const taskId = handleGetCurrentTaskId(); // 您的 GAS 函數
      expect(taskId).toBe("t12345");
    });
    ```

    請謹慎使用程式碼。

4. 針對 NonBlockingLife 的 Test First 建議清單

    您可以按照以下順序撰寫測試，然後再寫功能：

    1.  **ID 唯一性測試**：確保 `generateId()` 在連續產生 1000 次時不會重複。
    2.  **時間累加測試**：確保 `handleEnd` 計算的 `duration` 正確處理了跨小時的情況。
    3.  **狀態轉換測試**：確保當 `START` 發生時，系統狀態從 `IDLE` 變更為 `RUNNING`。
    4.  **快取同步測試**：確保 `updateSelectionCache` 產生的列表正確過濾掉了 `DONE` 的任務。

5. 今日開發建議 (2026/01/16)

由於您現在處於 Test First 的模式，您的專案資料夾結構建議如下：

-   `/src` : 存放 `.gs` 或 `.js` (真正的 GAS 代碼)
-   `/__tests__` : 存放測試腳本
-   `appsscript.json` : clasp 設定檔

**為什麼這是最好的做法？**  
因為透過 **clasp + Jest**，您在手機捷徑按下按鈕前，就已經在本地完成了 99% 的邏輯驗證。這會讓您的 **NonBlockingLife** 變成一個極其穩定、商業等級的個人調度系統。

您想先針對哪一個核心邏輯（例如：`handleStart` 的衝突判定）撰寫第一個測試案例嗎？

==============================================================================

## [2026-01-17] ychsue 好的，不過，問幾個問題

1. `require` 這個指令，intellisense 建議改用 ESM 的 `import`，請問這樣要怎麼改嗎？
2. 我有看到有人寫 [package](https://github.com/vlucas/gasmask)，請問這個有用嗎？還是說，直接向您那樣寫？
3. 因為我是在專案根目錄

``` markdown
NonBlockingLife
 ├── .clasp.json
 ├── appsscript.json
 ├── package.json
 ├── src
      ├── gas
      │   ├── Code.gs
      │   ├── Config.gs
      │   ├── Logic.gs
      │   └── Triggers.gs
      └── __tests__
          └── scheduler.test.js
```

下執行 `clasp push`，請問這樣可以嗎？還是說應該要在 `src` 目錄下執行？

==============================================================================

## [2026-01-16] ychsue 如果要Mock SpreadSheet，會用到的操作不就都要mock，定義一個SpreadSheet相關的操作，這工程會否很大？統一放在一個 .js 檔案裡面嗎？

好，請先分離出 Utils.js 與 SheetsService.js，然後就得改 Logic.js 對吧？

### Gemini Answer 05

這是一個非常專業的重構步驟。透過將**「純邏輯（Logic）」**、**「資料存取（Service）」**與**「工具函數（Utils）」**分離，您的測試會變得極其簡單，因為您大部分的測試只需要針對不需 Mock 的 `Utils` 和 `Logic` 進行。

以下是重構後的建議代碼結構：

1. `src/gas/Utils.js` (純邏輯，最易測試)

   這類函數不依賴任何 Google API，只處理數據計算。

   ```javascript
    // 計算兩個日期之間的分鐘差
    export function calculateDuration(start, end) {
      return Math.round((new Date(end) - new Date(start)) / 60000);
    }

    // 判斷是否超時
    export function isOverdue(startTime, limitMinutes) {
      const duration = calculateDuration(startTime, new Date());
      return duration > limitMinutes;
    }

    // 產生短 ID
    export function generateId() {
      return "t" + new Date().getTime().toString(36);
    }
   ```

   請謹慎使用程式碼。

2.  `src/gas/SheetsService.js` (資料存取層)

    這層專門封裝對 `SpreadsheetApp` 的操作，未來測試時只需 Mock 這個檔案。

    ```javascript
    import { NBL_CONFIG } from './Config';

    export const SheetsService = {
      // 取得 Dashboard 狀態
      getDashboardState() {
        const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(NBL_CONFIG.SHEETS.DASH);
        return sheet.getRange("A2:D2").getValues()[0]; // [ID, Name, StartAt, Status]
      },

      // 更新 Dashboard
      updateDashboard(values) {
        const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(NBL_CONFIG.SHEETS.DASH);
        sheet.getRange("A2:D2").setValues([values]);
      },

      // 寫入日誌
      appendLog(row) {
        const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(NBL_CONFIG.SHEETS.LOG);
        sheet.appendRow(row);
      },

      // 清空 Dashboard
      clearDashboard() {
        const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(NBL_CONFIG.SHEETS.DASH);
        sheet.getRange("A2:D2").clearContent();
      }
    };
    ```

    請謹慎使用程式碼。

3. `src/gas/Logic.js` (業務流程層)

    這層負責編排 (Orchestration)，調用 Utils 進行計算，調用 Service 進行存取。

    ```javascript
    import * as Utils from './Utils';
    import { SheetsService } from './SheetsService';
    import { NBL_CONFIG } from './Config';

    export function handleStart(taskId, taskName) {
      // 1. 透過 Service 檢查現況
      const [currentId] = SheetsService.getDashboardState();

      if (currentId) {
        return { status: "warning", message: "已有任務正在執行" };
      }

      const now = new Date();
      const id = taskId || Utils.generateId();

      // 2. 執行更新
      SheetsService.updateDashboard([id, taskName, now, NBL_CONFIG.STATUS.RUNNING]);
      SheetsService.appendLog([now, id, taskName, "START", "MACRO", "RUNNING", ""]);

      return { status: "success", taskId: id };
    }

    export function handleEnd() {
      const [id, name, startAt] = SheetsService.getDashboardState();
      if (!id) return { status: "error", message: "目前無執行中任務" };

      const now = new Date();
      const duration = Utils.calculateDuration(startAt, now);

      // 執行結束邏輯
      SheetsService.clearDashboard();
      SheetsService.appendLog([now, id, name, "END", "MACRO", "IDLE", `Duration: ${duration}m`]);

      return { status: "success", duration: duration };
    }
    ```

    請謹慎使用程式碼。

4. 針對 `Utils.js` 的單元測試 (不需任何 Mock)

建立 `src/__tests__/utils.test.js`：

``` javascript
import * as Utils from '../gas/Utils';

describe('Utils 測試', () => {
  test('calculateDuration 應該正確計算分鐘差', () => {
    const start = "2026-01-16T10:00:00";
    const end = "2026-01-16T10:30:00";
    expect(Utils.calculateDuration(start, end)).toBe(30);
  });

  test('generateId 應該回傳 t 開頭的字串', () => {
    expect(Utils.generateId()).toMatch(/^t/);
  });
});
```

請謹慎使用程式碼。

#### 重構後的好處

1.  **測試分離**：您可以 100% 覆蓋 `Utils.js` 的測試，這保證了時間計算等核心邏輯不會出錯。
2.  **Mock 範圍縮小**：當您要測試 `Logic.js` 時，您只需要 Mock `SheetsService` 這個物件，而不是整個 `SpreadsheetApp`。
3.  **Clasp 友善**：在 `clasp push` 時，這些檔案會被上傳。

**提示**：在 GAS 環境中，`export` 和 `import` 會失效。如果您直接 `clasp push`，建議使用一個簡單的轉換工具或在 `src/gas` 目錄下保持 GAS 原生格式（不帶 import/export），而在測試時使用 `rewire` 或透過工具處理。或是更簡單的做法：在本地開發時用 `.js` 副檔名，並在 push 前把 `export` 拿掉。

您現在可以嘗試先寫 `Utils.js` 的測試，這是最快看到「Test First」成效的地方！

=====================================================================

## [2026-01-17] ychsue 因為有些工具是使用 `key:value` 的方式來存Excel，不過，既然用絕對位置，那麼，我就讓`Task_Pool`, `Micro_Tasks`, `Periodic_Config` 與 `Async_Await` 的前三個都設為 `Task_ID`, `Title` 與 `Status`，這樣，Log與更新他們的狀態時也比較簡單

目前共有10個項目代辦，我們先來實作
        [x] Request (Action: START, TaskID: t123)
        [x] Request (Action: END, TaskID?)
順便測試，您覺得如何？

### Gemini Answer 06

這是一個非常紮實的決定！統一前三欄為 **`Task_ID`, `Title`, `Status`** 是一個極佳的「資料庫正規化」設計，這讓您的 `SheetsService` 可以寫出更通用的函數（例如一個 `updateStatusById` 就能同時服務四張表），大大降低了開發複雜度。

現在我們就以 **Test First (TDD)** 的方式，來實作最核心的 `START` 與 `END` 流程。

1. 撰寫測試案例 (Test First)

    請在 `__tests__/logic.test.js` 撰寫以下測試。這定義了我們預期的行為：

    -   `START` 時：Dashboard 要寫入資料，Log 要紀錄。
    -   `END` 時：要計算 Duration，更新狀態，並累加時間。

    ``` javascript
    import { jest } from '@jest/globals';
    import { handleStart, handleEnd } from '../src/gas/Logic.js';
    import { SheetsService } from '../src/gas/SheetsService.js';

    // Mock SheetsService 的所有方法
    jest.mock('../src/gas/SheetsService.js');

    describe('NBL 核心流程測試 - START & END', () => {

      beforeEach(() => {
        jest.clearAllMocks();
      });

      test('START: 當 Dashboard 為空時應成功啟動', () => {
        // 模擬 Dashboard 目前是空的 [ID, Title, StartAt, SystemStatus]
        SheetsService.getDashboardState.mockReturnValue(["", "", "", "IDLE"]);

        const result = handleStart("t123", "開發 NBL 測試");

        expect(result.status).toBe("success");
        expect(SheetsService.updateDashboard).toHaveBeenCalled();
        expect(SheetsService.appendLog).toHaveBeenCalledWith(
          expect.arrayContaining(["t123", "開發 NBL 測試", "START"])
        );
      });

      test('END: 應計算 Duration 並更新 Pool', () => {
        const startTime = new Date(Date.now() - 30 * 60000); // 30 分鐘前
        // 模擬 Dashboard 正在跑 t123
        SheetsService.getDashboardState.mockReturnValue(["t123", "開發 NBL 測試", startTime, "RUNNING"]);

        const result = handleEnd();

        expect(result.status).toBe("success");
        expect(result.duration).toBe(30);
        // 驗證是否清空 Dashboard 並更新狀態
        expect(SheetsService.clearDashboard).toHaveBeenCalled();
        expect(SheetsService.updateTaskInPool).toHaveBeenCalledWith("t123", "DONE", 30);
      });
    });
    ```

    請謹慎使用程式碼。

2. 實作功能程式碼 (Logic.js)

    為了讓測試通過，我們完善 `Logic.js`：

    ```javascript
    import * as Utils from './Utils.js';
    import { SheetsService } from './SheetsService.js';
    import { NBL_CONFIG } from './Config.js';

    export function handleStart(taskId, taskName) {
      const [currentId] = SheetsService.getDashboardState();
      if (currentId) return { status: "warning", message: "已有任務在執行" };

      const now = new Date();
      const id = taskId || Utils.generateId();

      SheetsService.updateDashboard([id, taskName, now, "RUNNING", 0]);
      SheetsService.updateTaskInPool(id, "DOING"); // 更新 Pool 狀態
      SheetsService.appendLog([now, id, taskName, "START", "MACRO", "RUNNING", ""]);

      return { status: "success", taskId: id };
    }

    export function handleEnd() {
      const [id, name, startAt] = SheetsService.getDashboardState();
      if (!id) return { status: "error", message: "目前無執行任務" };

      const now = new Date();
      const duration = Utils.calculateDuration(startAt, now);

      SheetsService.clearDashboard();
      SheetsService.updateTaskInPool(id, "DONE", duration); // 核心：更新狀態與累加時間
      SheetsService.appendLog([now, id, name, "END", "MACRO", "IDLE", `Duration: ${duration}m`]);

      return { status: "success", duration: duration };
    }
    ```

    請謹慎使用程式碼。

3. 實作通用服務 (SheetsService.js)

利用您統一前三欄的優勢，實作通用的 `updateTaskInPool`：

```javascript
export const SheetsService = {
  // ... 其他方法 ...

  // 統一更新邏輯：在 Task_Pool 中搜尋 ID 並更新 Status 與累積時間
  updateTaskInPool(id, newStatus, addMins = 0) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Task_Pool");
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === id) {
        // 更新 Status (第 3 欄)
        sheet.getRange(i + 1, 3).setValue(newStatus);
        // 如果有傳入分鐘，累加到 Spent_Today_Mins (第 5 欄)
        if (addMins > 0) {
          const currentSpent = data[i][4] || 0;
          sheet.getRange(i + 1, 5).setValue(currentSpent + addMins);
        }
        break;
      }
    }
  }
};
```

請謹慎使用程式碼。

#### 今日實作重點總結

1.  **測試驅動**：我們先定義了 `END` 應該回傳 `duration: 30`，這強迫我們在邏輯中必須正確調用 `Utils.calculateDuration`。
2.  **欄位一致性**：因為您把 `Task_ID`, `Title`, `Status` 放在前三位，未來如果要對 `Micro_Tasks` 做類似的 `updateStatus`，我們只需要把 `updateTaskInPool` 改成更通用的 `updateStatusInSheet(sheetName, id, status)` 即可。
3.  **效能考量**：目前使用 `for` 迴圈掃描 ID，在資料量少時（< 1000條）速度極快。

您可以先跑 `npm test` 看看這兩個核心功能是否通過測試。一旦通過，`clasp push` 上去，您的 iPhone 捷徑就能正確處理 **「任務開始、結束、時間統計」** 的完整閉環了！

準備好測試這一段了嗎？

================================================================================================================================

## [2026-01-17] ychsue `jest.mock` 無法用在 ESM 之下

採用**依賴注入 (Dependency Injection, DI)** 是非常明智的決定！這不僅解決了 ESM Mock 的難題，更讓您的代碼結構達到專業水準：**邏輯歸邏輯 (Logic)，實作歸實作 (Service)**。

以下是重構後的程式碼與測試範例，這將作為您 **NonBlockingLife** 專案的穩定基石。

1. 修改 Logic.js (實施注入)

    我們在函數參數中加入一個 `service` 參數。在 GAS 實際執行時，它會自動使用預設的 `SheetsService`；而在測試時，我們可以輕易換成 Mock。

    ```     javascript
    import * as Utils from './Utils.js';
    import { SheetsService as DefaultService } from './SheetsService.js';

    export function handleStart(taskId, taskName, service = DefaultService) {
      // 使用傳入的 service 操作資料
      const [currentId] = service.getDashboardState();

      if (currentId) {
        return { status: "warning", message: "已有任務正在執行" };
      }

      const now = new Date();
      const id = taskId || Utils.generateId();

      service.updateDashboard([id, taskName, now, "RUNNING"]);
      service.updateTaskStatus(id, "DOING");
      service.appendLog([now, id, taskName, "START", "MACRO", "RUNNING", ""]);

      return { status: "success", taskId: id };
    }

    export function handleEnd(service = DefaultService) {
      const [id, name, startAt] = service.getDashboardState();

      if (!id) return { status: "error", message: "目前無執行中任務" };

      const now = new Date();
      const duration = Utils.calculateDuration(startAt, now);

      service.clearDashboard();
      service.updateTaskStatus(id, "DONE", duration);
      service.appendLog([now, id, name, "END", "MACRO", "IDLE", `Duration: ${duration}m`]);

      return { status: "success", duration: duration };
    }
    ```

    請謹慎使用程式碼。

2. 撰寫測試案例 (極簡化)

    現在您的測試檔案不再需要任何複雜的模組攔截，只需要定義一個簡單的物件即可。

    **`__tests__/logic.test.js`：**

    ``` javascript
    import { jest } from '@jest/globals';
    import { handleStart, handleEnd } from '../src/gas/Logic.js';

    describe('NBL 核心邏輯 - 注入式測試', () => {

      // 建立一個 Mock Service 物件
      const createMockService = (overrides = {}) => ({
        getDashboardState: jest.fn().mockReturnValue(["", "", "", "IDLE"]),
        updateDashboard: jest.fn(),
        updateTaskStatus: jest.fn(),
        appendLog: jest.fn(),
        clearDashboard: jest.fn(),
        ...overrides
      });

      test('START: 應能正確啟動並調用 Service', () => {
        const mockService = createMockService();

        const result = handleStart("t123", "測試任務", mockService);

        expect(result.status).toBe("success");
        // 驗證是否有寫入 Dashboard
        expect(mockService.updateDashboard).toHaveBeenCalledWith(
            expect.arrayContaining(["t123", "測試任務"])
        );
      });

      test('END: 應正確計算時長並累加時間', () => {
        const thirtyMinsAgo = new Date(Date.now() - 30 * 60000);
        const mockService = createMockService({
          getDashboardState: jest.fn().mockReturnValue(["t123", "測試任務", thirtyMinsAgo, "RUNNING"])
        });

        const result = handleEnd(mockService);

        expect(result.status).toBe("success");
        expect(result.duration).toBe(30);
        // 驗證是否呼叫了更新 Pool 的動作並傳入 30 分鐘
        expect(mockService.updateTaskStatus).toHaveBeenCalledWith("t123", "DONE", 30);
      });
    });
    ```

    請謹慎使用程式碼。

3. 2026 年開發建議：為什麼這樣更好？

    1.  **效能**：測試執行速度極快，因為不需要啟動複雜的 Mock 機制。
    2.  **安全性**：您的 `Logic.js` 變得「純淨」了，它不關心資料是存進 Google Sheets 還是存進資料庫，它只關心「流程」。
    3.  **靈活性**：如果您未來想開發一個「離線模擬模式」，您只需要換一個 `OfflineService` 注入即可。

接下來的進度：

既然 `START` 與 `END` 的測試與重構都完成了，您可以：

1.  執行 `npm run test` 確保綠燈。
2.  執行 `clasp push` 將重構後的程式碼推送到雲端。
3.  **下一步任務**：實作 **`handleInterrupt`**。邏輯與 `END` 類似，但狀態要改為 `PENDING`，且 `Log` 的 Action 要記為 `INTERRUPT`。

您準備好針對 `INTERRUPT` 寫下第一個測試案例了嗎？

==============================================================================================

## [2026-01-17] ychsue 我有以下幾個問題

1. `updateTaskStatus` 除了修改以外，應該根據 id 找出屬於哪個Sheet與他的title，回傳，這樣，`handleStart` 就有辦法正確設定Log的資訊，而輸入的第二個參數就會變成 Notes 使用。
2. 您使用 `DefaultService` 放到 GAS 應該要指到 SheetsService。

調好了，好棒啊！接下來就是iPhone 怎麼處理了。雖然可以正常送達，也收到資訊，能否根據回傳彈出不同視窗？

### Gemini Answer 07

太棒了！後端邏輯與數據結構穩定後，iPhone **捷徑 (Shortcuts)** 就成了系統的「動態儀表板」。

要讓 iPhone 根據 GAS 的回傳內容彈出不同視窗，核心在於解析 JSON 並使用 **「如果 (If)」** 邏輯。以下是具體實作方法：

1. GAS 回傳 JSON 格式建議

    為了讓捷徑好判斷，您的 GAS 應統一回傳包含 `status` 與 `message` 的物件：

    ```javascript
    // GAS handleEnd 回傳範例
    return ContentService.createTextOutput(JSON.stringify({
      "status": "success",
      "action": "END",
      "message": "任務已結束！共計 30 分鐘。",
      "recommend": "現在有 3 個微任務待處理，要清空嗎？",
      "payload": { "taskCount": 3 }
    })).setMimeType(ContentService.MimeType.JSON);
    ```

    請謹慎使用程式碼。

2. iPhone 捷徑邏輯配置 (步驟解解)

    請在您的捷徑中按以下順序加入動作：

    1.  **取得 URL 內容 (Get Contents of URL)**
        -   方法：`POST`，傳送您的 Task 資料。
    2.  **設定變數 (Set Variable)**
        -   將結果命名為 `ServerResponse`。
    3.  **從輸入取得字典 (Get Dictionary from Input)**
        -   輸入選擇 `ServerResponse`。
    4.  **取得字典值 (Get Value for Key)**
        -   金鑰 (Key) 輸入：`status`。
    5.  **如果 (If)**
        -   **如果** `status` **包含** `success`：
            -   **取得字典值**：`message`。
            -   **顯示通知** 或 **顯示警示**：`message`。
            -   _(進階)_：**取得字典值**：`recommend`。如果 `recommend` 有值，彈出「確認視窗」詢問是否要查看微任務。
        -   **否則** (即 status 是 warning 或 error)：
            -   **取得字典值**：`message`。
            -   **顯示警示**：⚠️ `message` (可以換成更醒目的圖標)。
            -   **停止此捷徑**。
        -   **結束如果**

3. 實作「動態選單」的高級技巧

    如果您執行的是 `QUERY_OPTIONS` (獲取候選任務)，您可以讓捷徑彈出一個讓您點選的列表：

    1.  GAS 回傳：`{"status": "success", "options": [{"id": "t1", "title": "任務A"}, {"id": "t2", "title": "任務B"}]}`。
    2.  捷徑操作：
        -   **從 \[options\] 取得清單**。
        -   **從清單中選擇 (Choose from List)**：提示字設為「請選擇要啟動的任務」。
        -   **取得所選項目** 的 `id`。
        -   **再次呼叫 URL**：這次傳送 `action: START` 與剛選好的 `taskId`。

4. 使用「顯示結果 (Show Result)」vs 「顯示警示 (Show Alert)」

    -   **顯示結果 (Show Result)**：只是一個小視窗，看完點一下就消失，適合 **`START` 成功** 的簡單回饋。
    -   **顯示警示 (Show Alert)**：會中斷流程，有「確定/取消」按鈕，適合 **`END` 之後的微任務建議** 或 **`ERROR` 警告**。

5. 2026 年的小撇步：利用「靈動島」

如果您的 iPhone 支援靈動島，在「顯示通知」動作中勾選「聲音」，系統會更像是一個即時監控器（Monitor）。

**下一步建議：**  

您可以先在捷徑中加入一個簡單的 `If status = success` 邏輯，測試看看當您按下 `END` 時，手機是否能正確顯示 GAS 回傳的那句「任務已結束！共計 XX 分鐘」。這會讓您的系統瞬間有了「生命感」！

=============================================================

## [2026-01-19] ychsue 加入 ADD_INBOX 的功能

### Gemini Answer 08

沒錯！既然您的 **START/END** 閉環與 iPhone 的 **JSON 解析**都已經通了，現在正是實作 **`ADD_INBOX`** 的最佳時機。

在 **NonBlockingLife** 的設計中，`Inbox` 扮演的是 **「非阻塞輸入」** 的關鍵角色。當您在忙碌時突然想到一件事，您需要以最快速度將它丟進系統，而不打斷當前的專注。

以下是實作建議：

1. 撰寫測試案例 (Test First)

    在 `__tests__/logic.test.js` 中新增一個測試。我們預期 `ADD_INBOX` 會產生 ID、存入 Inbox 表，並記錄 Log。

    ```javascript
    test('ADD_INBOX: 應能成功將靈感存入 Inbox 並回傳 ID', () => {
      const mockService = {
        appendLog: jest.fn(),
        addToInbox: jest.fn().mockReturnValue("t_new_inbox_id")
      };

      const result = handleAddInbox("突然想到的絕妙點子", mockService);

      expect(result.status).toBe("success");
      expect(result.taskId).toBe("t_new_inbox_id");
      expect(mockService.addToInbox).toHaveBeenCalledWith(expect.stringContaining("突然想到的絕妙點子"));
      expect(mockService.appendLog).toHaveBeenCalledWith(
        expect.arrayContaining(["ADD_INBOX", "突然想到的絕妙點子"])
      );
    });
    ```

    請謹慎使用程式碼。

2. 實作 Logic.js

    這段邏輯非常單純，確保它是非阻塞的（不需要檢查 Dashboard）。

    ```javascript
    export function handleAddInbox(title, service = SheetsService) {
      const now = new Date();
      const id = Utils.generateId();

      // 1. 存入 Inbox Sheet
      service.addToInbox([id, title, now]);

      // 2. 紀錄 Log (Action 記為 ADD_INBOX)
      service.appendLog([now, id, title, "ADD_INBOX", "INBOX", "IDLE", "來自快捷輸入"]);

      return { 
        status: "success", 
        taskId: id, 
        message: `已存入 Inbox: ${title}` 
      };
    }
    ```

    請謹慎使用程式碼。

3. 實作 SheetsService.js

    ```javascript
    export const SheetsService = {
      // ...
      addToInbox(row) {
        const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Inbox");
        sheet.appendRow(row);
      }
    };
    ```

    請謹慎使用程式碼。

4. iPhone 捷徑的優化 (關鍵！)

    為了達成真正的「非阻塞」，建議您為 `ADD_INBOX` 建立一個**獨立的捷徑**，並將其放在：

    -   **控制中心按鈕**：2026 年 iOS 18/19 支援自定義控制中心。
    -   **鎖定畫面按鈕**：不用解鎖手機就能輸入。
    -   **背面輕點 (Back Tap)**：敲手機背面兩下立刻彈出輸入框。

    **捷徑動作流：**

    1.  **要求輸入 (Ask for Input)**：提示文字「有什麼新想法？」
    2.  **取得 URL 內容**：POST `{"action": "ADD_INBOX", "title": "已提供的輸入"}`。
    3.  **顯示通知**：✅ 已紀錄。

5. 為什麼這很重要？

    有了 `Inbox` 後，您的 **NonBlockingLife** 就完成了 **「事件捕捉」** 的功能。

**接下來的進化方向：**  
當您的 `Inbox` 累積了東西，我們之後可以實作一個 **`REVISE_INBOX` (整理回顧)** 動作。這個動作會列出 `Inbox` 裡的東西，問您要將它們：

1.  轉換成 `Task_Pool` (專案任務)
2.  轉換成 `Micro_Tasks` (兩分鐘碎事)
3.  刪除 (無效靈感)

這就是 GTD (Getting Things Done) 流程中的 **「釐清 (Clarify)」** 階段。

您想先測試看看這個「一鍵存入 Inbox」的功能嗎？這對於緩解「怕忘記而無法專注」的焦慮非常有幫助！ \[1, 2, 4\]

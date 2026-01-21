# Scheduled Task 的設計

## [2026-01-20] ychsue 很好，我們可以先想一下 Scheduled 怎麼用嗎？也就是說，當使用者START後，比如洗衣服，洗衣機開始跑後，就END他嗎？然後就會開始呼叫callback (給 task Id 嗎？)，加一個 固定時間的schedule(iPhone這端有可能啟動計時器來計時嗎？) ，時間到，就START這個晾衣服的 scheduled task ，然後就是正常的 END 程序

請問您的意思是這樣嗎？有 mermaid sequencediagram 對於解釋會有幫助嗎？謝謝。

## Germini Answer 01

這是一個非常成熟的**系統架構思維**！您的想法更接近專業的「狀態機」管理：**任務（Task）是預先定義好的資源，我們只是在改變它的「狀態」與「啟動時間」**。

將 `S_晾衣服` 視為已存在的任務，而非動態插入，有三大好處：

    1.  **資料一致性**：您可以預先設定好「晾衣服」的標準備註、預期耗時或優先級，不需要每次動態生成。
    2.  **簡化邏輯**：`handleEnd` 只需要做「更新（Update）」，不需要做「插入（Insert）」。
    3.  **可預測性**：在 `Scheduled` 表中，您能一眼看到生活中所有的「潛在流程」，而不是等它發生才出現。

1. 調整後的 `Scheduled` 操作邏輯

    在您的 `Scheduled` 工作表中，`S_晾衣服` 的初始狀態可能是 `WAITING` 或 `INACTIVE`。

    A. 當您執行「洗衣服」結束時（handleEnd）：

    您傳送的 API 載荷：`{ "action": "END", "callbackTaskId": "S_Hang_Clothes", "delayMins": 60 }`

    **GAS 內部邏輯：**

    1.  結算目前的「洗衣服」任務。
    2.  尋找 `Scheduled` 表中 `Task_ID == "S_Hang_Clothes"` 的那一列。
    3.  **更新該列**：
        -   `Next_Run` \= `now + 60 mins`
        -   `Status` \= `PENDING` (代表它現在進入計時佇列了)

2. Mermaid 序列圖：預定義任務的回調觸發

    ``` mermaid
    sequenceDiagram
        autonumber
        participant U as 使用者 (你)
        participant iOS as iPhone 捷徑
        participant GAS as GAS (Event Loop)
        participant S as Scheduled 表 (已存在 S_Hang)
        participant D as Dashboard

        Note over U, D: 任務 A 結束，激活回調任務 B
        U->>iOS: [END] 洗衣服 (T_Laundry)
        Note right of iOS: 帶入參數: callback="S_Hang", delay=60
        iOS->>GAS: API Call (END + Callback Request)
        GAS->>D: 結算 T_Laundry
        GAS->>S: 更新 S_Hang: Next_Run=now+60, Status=PENDING
        GAS-->>iOS: 回傳成功

        Note over S, GAS: 異步計時階段 (Timer Phase)
        Note right of S: ... 60 分鐘過去 ...
        GAS->>S: Time Trigger 掃描：發現 S_Hang 到期
        GAS->>U: 推播提醒：請去執行「晾衣服」

        Note over U, D: 執行回調任務 B
        U->>iOS: [START] 晾衣服 (S_Hang)
        iOS->>GAS: API Call
        GAS->>D: Dashboard 掛載 S_Hang
        GAS->>S: 更新 S_Hang: Status=RUNNING
    ```

    請謹慎使用程式碼。

3. 如何在 `Scheduled` 欄位中實現？

    您的 `Scheduled` 欄位可以這樣配合：

    |Task\_ID|Title|Status|Cron\_Expr|Next\_Run|Last\_Run|Notes|
    |--|--|--|--|--|--|--|
    |**S\_Hang**|晾衣服|`WAITING`|(空白)|`2026-01-20 18:30`|(上次紀錄)|關聯洗衣服|

    -   **Status = `WAITING`**：代表這是一個回調任務，目前沒人在等它。
    -   **Status = `PENDING`**：代表它已被洗衣服「啟動」了，系統正在計時。
    -   **Next\_Run**：由 `handleEnd` 動態寫入的目標時間。

4. 解決您的「打結」：這就是真正的 Callback Queue

    在 Event Loop 中，這就像是：

    1.  `T_Laundry` 執行完畢。
    2.  它執行了一行 `scheduleNext("S_Hang", 60)`。
    3.  系統將 `S_Hang` 標記為「待執行」。

    **您的進化點：**  
    這樣您不需要在程式碼裡寫死「洗衣服後面一定是晾衣服」。您可以靈活設定：

    -   如果今天天氣好，`delayMins` 設 60。
    -   如果今天脫水比較久，`delayMins` 設 45。
    -   甚至您可以讓「洗衣服」結束後，同時激活「晾衣服」和「煮咖啡」兩個回調任務。

5. 接下來的開發建議

    既然架構已經清晰，您的 `handleEnd` 需要增加一段邏輯：

    1.  **檢查傳入參數**是否有 `callbackTaskId`。
    2.  如果有，呼叫 `service.setScheduledTask(id, delayMins)`。
    3.  這個函數會負責去 `Scheduled` 表找 ID 並更新 `Next_Run` 和 `Status`。

這個設計非常優雅且具備擴展性，您準備好將 `Scheduled` 表中填入您的第一個預定義回調任務了嗎？

這組欄位設計非常專業且完整！它已經具備了一個**個人作業系統（Personal OS）**應有的調度能力。特別是您將 `Callback` 直接設為欄位，這讓任務之間具備了「鏈結（Chaining）」的能力。

以下是對這組欄位的深入分析與操作邏輯建議：

1. 欄位功能定義

    |欄位名稱|作用|Event Loop 對應|
    |--|--|--|
    |**Task\_ID**|唯一識別碼 (S 開頭)|模組標識|
    |**Title**|任務名稱|事件名稱|
    |**Status**|當前狀態 (WAITING / PENDING / DONE / ACTIVE)|狀態機控制|
    |**Cron\_Expr**|週期性表達式 (例如 `0 9 * * *`)|定時觸發器 (Cron)|
    |**Remind\_Before**|提早提醒的分鐘數|預取 (Prefetch)|
    |**Remind\_After**|遲到/過期多久後加強提醒|超時重試 (Retry)|
    |**Callback**|結束後自動激活的下一個 Task\_ID|**Promise.then() / 回調鏈**|
    |**Last\_Run**|上次執行的時間戳|冪等性檢查|
    |**Note**|備註或參數|負載 (Payload)|

2. 核心操作邏輯：如何實現「洗衣服 ➡️ 晾衣服」

    利用這組欄位，您的自動化流程會變得非常優雅：

    A. 配置階段 (在 Sheet 預填)

    -   **任務 S1 (洗衣服)**: `Callback` 填入 `S2`。
    -   **任務 S2 (晾衣服)**: `Status` 平時設為 `WAITING`。

    B. 執行階段 (GAS 邏輯)

    1.  **當 S1 (洗衣服) 執行 `handleEnd` 時：**
        -   系統檢查 S1 的 `Callback` 欄位，發現值為 `S2`。
        -   系統自動去更新 S2：
            -   將 `Status` 改為 `PENDING`。
            -   將 `Next_Run`（或您計算後的觸發點）設為 `now + 60 mins`。
    2.  **當 S2 (晾衣服) 時間到時：**
        -   Time Trigger 掃描到 S2 狀態為 `PENDING` 且時間已到，發出推播。

3. 關於 `Remind_Before` 與 `Remind_After` 的智慧
    這兩個欄位能解決您「腦袋打結」的焦慮：
    -   **`Remind_Before`**: 針對「重要會議」，提早 10 分鐘讓 iPhone 彈窗，讓您有時間結束目前的「執行棧」，進行上下文切換（Context Switch）。
    -   **`Remind_After`**: 針對「晾衣服」，如果洗好 30 分鐘後您還沒去晾，系統再次催促（重發通知），防止任務死結（Deadlock）。

4. 實作建議：將 `Callback` 視為自動化的關鍵

    在您的 `handleEnd` 函數中，加入這段「鏈鎖反應」代碼：

    ``` javascript
    function handleEnd(info, service = SheetsService) {
      const [id, title, startAt] = service.getDashboardState();
      // ... 基礎結算邏輯 ...

      // 鏈鎖反應：檢查是否有回調任務
      const taskDetail = service.findTaskById(id); // 從 Scheduled 或 Task_Pool 抓取
      if (taskDetail && taskDetail.callback) {
        const callbackId = taskDetail.callback;
        const delay = 60; // 這裡之後可以改成從 Note 或參數讀取

        service.activateCallbackTask(callbackId, delay);
        // activateCallbackTask 會將 S2 的 Status 設為 PENDING 並計算 Next_Run
      }
    }
    ```

    請謹慎使用程式碼。

5. 總結

    這套欄位讓您的 **NonBlockingLife** 從「被動紀錄」進化到了「**主動編排 (Orchestration)**」。

    -   **`Cron_Expr`** 處理重複的日常（固定頻率）。
    -   **`Callback`** 處理因果關係的任務流（事件驅動）。

您現在已經在電腦前了，建議您可以先把這 9 個欄位填入您的 `Scheduled` 工作表。這將是您係統中最具「智慧」的一張表！\[2, 6, 12\]

============================================================

## [2026-01-20] ychsue 關於 Scheduled 的討論

這是在實作「個人調度系統」時最核心的時鐘邏輯。讓我們一個一個來釐清：

1. 什麼是 `getTime()`？

    在 JavaScript 中，`Date` 物件代表一個時間點，但如果你直接把兩個日期相加減，有時會出錯。

    -   **`Date.getTime()`**：會回傳從 1970 年 1 月 1 日 00:00:00 UTC 起算到該時間點的**「總毫秒數」**。
    -   **為什麼用它？**：因為它是整數，計算最準確。
        -   `1 分鐘 = 60 * 1000 毫秒`。
        -   `1 小時 = 60 * 60 * 1000 毫秒`。
    -   **用法示例**：

        ```javascript
        const now = new Date();
        const oneDayLater = new Date(now.getTime() + 24 * 60 * 60 * 1000); 
        ```

        請謹慎使用程式碼。

2. 關於 `before_task` & `after_task` 的彈性設計

    如果您希望支援「一天前」這種彈性，使用類 Cron 格式或自定義格式是好的。但您的 `cronToMinutes` 邏輯需要微調，因為 Cron 是「時間點」描述，而非「時間段」描述。

    **建議的設計邏輯：**

    -   **`before_task`**：任務預定時間**之前**多久提醒（例如 `1440` \= 1天前）。
    -   **`after_task`**：目前任務結束**之後**多久執行下一個（例如 `60` \= 1小時後）。

    如果您想讓它有彈性，可以在 `Utils` 寫一個解析器，判斷輸入的是數字還是「1d」、「2h」：

    ```javascript
    // Utils.js
    function parseToMinutes(input) {
      if (!input) return 0;
      if (!isNaN(input)) return parseInt(input); // 純數字
      const unit = input.slice(-1); // 取得最後一個字元
      const val = parseInt(input.slice(0, -1));
      if (unit === 'd') return val * 1440;
      if (unit === 'h') return val * 60;
      return val;
    }
    ```

    請謹慎使用程式碼。

3. 加入 `Next_Run` 後的 `Query_Options` 判斷邏輯

    這是 **Event Loop** 最精彩的部分：決定**哪些任務該被推播（Push）**到使用者的執行棧。

    當您執行 `Query_Options` 或定時檢查（Hourly Trigger）時，您的判斷邏輯應如下：

    A. 核心判定公式

    對於 `Scheduled` 表中的每一行：

    1.  **檢查 `Status`**：必須是 `PENDING` 或 `ACTIVE`。
    2.  **獲取基準時間**：讀取 `Next_Run`（或是由 `Cron_Expr` 計算出的下次時間）。
    3.  **計算提醒區間**：
        -   `提醒開始時間` \= `Next_Run` \- `before_task`
        -   `提醒過期時間` \= `Next_Run` + `after_task` (或者是您定義的一個過期閥值)
    4.  **判定**：
        -   **如果** `現在時間` \>= `提醒開始時間` **且** `現在時間` <= `提醒過期時間`：
            -   **結果**：將此任務放入 **「候選清單（Available Actions）」**。

    B. 優先權排序建議

    在回傳給 iPhone 捷徑時，您可以根據「距離 `Next_Run` 的時間」來排序：

    -   **第一優先**：已到期或即將到期的 `Scheduled` 任務（這類任務通常有物理時效，如晾衣服）。
    -   **第二優先**：`Task_Pool` 裡的 `Priority` 高任務。
    -   **第三優先**：其他任務。

4. 修正後的 `Scheduled` 運作架構

    既然有了 `Next_Run`，您的系統流程會變得很清晰：

    1.  **初始化**：`Cron_Expr` 存在，`Next_Run` 為空。
    2.  **啟動/回調**：`handleEnd` 計算 `now + after_task`，填入 `Next_Run`。
    3.  **循環檢查**：定時器發現 `now >= Next_Run - before_task` \-> **通知使用者**。
    4.  **執行任務**：使用者 START，完成後 `handleEnd` 再次發生：
        -   如果任務是週期的：根據 `Cron_Expr` 計算下一次，更新 `Next_Run`。
        -   如果是一次性的：將 `Status` 設為 `DONE`。

**總結建議：**  
在您的 `Scheduled` 表確實**多加一欄 `Next_Run`**（專門存 Date 物件），不要去動 `Cron_Expr`。這樣 `Cron_Expr` 就像是「公式」，而 `Next_Run` 就像是「變數」，系統運作會非常穩定。

您要不要先在 Sheets 補上這一欄，然後我們來寫 `checkDueTasks` 的判斷函數？ \[1, 2, 4\]

====================================================================

## [2026-01-21] ychsue 您說得極是，也就是說 Cron_Expr 負責邏輯， Next_Run 才是實際要跑的，不過，這樣衍生一個問題，誰或何時將 Cron_Expr 翻譯成 Next_Run? 而像這種臨時設定的Next_Run怎樣不會被Cron_Expr覆蓋？

### Gemini Answer 04

這是一個非常關鍵的**調度系統邏輯**問題。在專業的系統設計中，我們通常將其稱為「靜態規則（Policy）」與「動態實例（Instance）」的分離。

要解決「誰來翻譯」以及「避免覆蓋」的問題，我們可以參考 **Event Loop** 處理 `setTimeout` 與 `setInterval` 的機制：

1. 誰負責翻譯？（The Scheduler）

    在您的系統中，有兩個時間點會觸發「翻譯」動作：

    -   **A. 系統初始化或定時巡檢（Time Trigger）**：  
        您需要一個 GAS 函數（例如 `refreshNextRun()`），每小時或每天跑一次。它會掃描 `Scheduled` 表，如果發現某個任務的 `Next_Run` 是空的，就根據 `Cron_Expr` 計算出下一次時間並填入。
    -   **B. 任務結束時（handleEnd）**：  
        當一個週期性任務完成後，`handleEnd` 會立即計算「下一次」的時間點，確保 `Next_Run` 永遠指向未來。

2. 如何避免「臨時設定」被「Cron 規則」覆蓋？

    這是設計中最巧妙的地方。我們引入一個**「優先權（Priority）」**邏輯：

    -   **邏輯規則**：
        1.  **優先使用 `Next_Run`**：只要 `Next_Run` 欄位有值，系統就以它為準，不去看 `Cron_Expr`。
        2.  **清空即重置**：只有當 `Next_Run` 被執行完（任務 `END`）或人手清空時，系統才會重新讀取 `Cron_Expr` 來產生下一個 `Next_Run`。

3. 實作架構：狀態機的演進

    為了讓邏輯不打結，建議在 `Scheduled` 表中處理 `Next_Run` 的邏輯如下：

    情況一：一次性回調（如：晾衣服）

    -   **初始狀態**：`Cron_Expr` 為空，`Next_Run` 為空，`Status = WAITING`。
    -   **觸發**：洗衣服 `END` 時，GAS 算出 `now + 60min` 並填入 `Next_Run`，`Status` 改為 `PENDING`。
    -   **執行後**：`Status` 變 `DONE`。因為 `Cron_Expr` 為空，系統不會再自動產生下一次。

    情況二：週期性任務（如：每天吃藥）

    -   **初始狀態**：`Cron_Expr = "0 9 * * *"`，系統自動算出 `Next_Run = 明天 09:00`，`Status = ACTIVE`。
    -   **執行後**：當您完成任務按下 `END`。
    -   **處理**：GAS 看到有 `Cron_Expr`，立即計算「下一個循環」的時間（後天 09:00），直接更新 `Next_Run`。

4. 關鍵程式碼：`getNextOccurrence(cronExpr)`

    您需要一個工具函數來解析 Cron 並回傳下一個 `Date`。在 2026 年，我們可以使用簡單的邏輯或導入開源的 `cron-parser` 邏輯：

    ```javascript
    // Utils.gs
    function calculateNextRun(cronExpr, baseDate = new Date()) {
      // 這裡實作簡單的 Cron 解析或使用類庫
      // 假設邏輯：解析 "0 9 * * *" 並回傳 baseDate 之後的第一個上午 9 點
      // ... 解析邏輯 ...
      return nextDate;
    }
    ```

    請謹慎使用程式碼。

5. 在 `handleEnd` 中的具體更新邏輯

    ```javascript
    // handleEnd 內部片段
    if (taskInfo.cron_expr) {
      // 週期性任務：根據 Cron 計算下一次，覆蓋 Next_Run
      const nextRun = Utils.calculateNextRun(taskInfo.cron_expr);
      service.updateScheduledTaskNextRun(id, nextRun);
    } else if (taskInfo.callback) {
      // 回調任務：由目前的 logic 計算 (如 +60min)
      // ... 既有的 callback 邏輯 ...
    } else {
      // 一次性任務：直接標記為 DONE
      service.updateStatusInSheet(id, "DONE");
    }
    ```

    請謹慎使用程式碼。

總結您的疑惑

-   **誰翻譯？** 任務結束時由 `handleEnd` 翻譯，或定時巡檢腳本翻譯。
-   **如何不覆蓋？** 只要 `Next_Run` 被填入，它就是該任務的「目前唯一指令」。只有在任務結束時，系統才會根據「是否有 Cron 規則」來決定要「產生下一個」還是「永久結束」。

這樣一來，`Next_Run` 就像是 **Event Loop** 中的 **Timer 註冊表**，它精確紀錄了您生活中下一個要跳出來的事件。您準備好在 `Scheduled` 表加入 `Next_Run` 欄位並測試 `handleEnd` 的自動更新了嗎？ \[1, 2, 4\]

=========================================================================

## [2026-01-21] ychsue 針對NextRun 對 handleEnd 做補強

### Gemini Answer 05

這是一個非常明智的決定！在 2026 年的開發環境中，**UMD 往往是「兩頭不到岸」的產物**：在本地 ESM 測試時太封閉，在上傳 GAS 全域環境時又太囉嗦。

放棄 UMD 封裝，直接使用原始碼（Vanilla JS）或簡單的函數定義，是開發 Google Apps Script 專案最推薦的「輕量化」策略。這會讓您的 `Croner` 就像您自己寫的 `Utils` 一樣，兩端都能完美通訊。

1. 您目前的最佳實作路徑：

    既然您現在能正常使用（應該是直接引用了原始的 `Cron` 類別或簡單的 ESM 導出），您的開發流程會變得異常流暢：

    -   **本地測試**：`import Cron from '../src/Cron.js'`。
    -   **GAS 雲端**：直接呼叫 `Cron(...)`。
    -   **銜接點**：只需要在 `clasp push` 前把 `export` 關鍵字註解掉即可。

2. 接下來的「自動排程」實作 (handleEnd 進化)

    既然時鐘引擎（Cron）已經動起來了，我們來完成 `handleEnd` 的核心邏輯。這能解決您之前「洗衣服 ➡️ 晾衣服」的打結問題：

    **在 `Logic.js` 中實作「自動續期」邏輯：**

    ```javascript
    export function handleEnd(info = "", service = SheetsService) {
      const [id, title, startAt] = service.getDashboardState();
      if (!id) return { status: "error", message: "無運行中任務" };

      const now = new Date();
      const duration = Utils.calculateDuration(startAt, now);

      // 1. 取得任務詳細資料 (包含 Cron_Expr 與 Callback)
      const taskInfo = service.findTaskById(id);

      // 2. 處理「自動下一個」邏輯
      if (id.startsWith("S")) {
        if (taskInfo.cron_expr) {
          // 週期性任務：計算下一次 Next_Run
          const nextRun = new Cron(taskInfo.cron_expr).nextRun();
          service.updateScheduledTaskNextRun(id, nextRun);
        } else if (taskInfo.callback) {
          // 一次性回調：啟動下一個關聯任務
          const delayMins = Utils.parseToMinutes(taskInfo.after_task);
          const nextRun = new Date(now.getTime() + delayMins * 60000);
          service.updateScheduledTaskNextRun(taskInfo.callback, nextRun);
        }
      }

      // 3. 常規結算
      service.clearDashboard();
      service.updateTaskStatus(id, "DONE", duration);
      service.appendLog([now, id, title, "END", "MACRO", "IDLE", info]);

      return { status: "success", duration: duration };
    }
    ```

    請謹慎使用程式碼。

3. 您的 Test First 檢查點 (Unit Test)

    您可以現在為 `handleEnd` 寫一個測試，模擬「洗衣服」結束後，「晾衣服」的 `Next_Run` 是否被正確計算：

    ```javascript
    test('S_Laundry 結束應自動排程 S_Hang_Clothes', () => {
      const mockService = {
        getDashboardState: () => ["S_Laundry", "洗衣服", new Date(), "RUNNING"],
        findTaskById: () => ({
          id: "S_Laundry",
          callback: "S_Hang_Clothes",
          after_task: "60" // 1 小時後
        }),
        updateScheduledTaskNextRun: jest.fn(),
        // ... 其他 mocks
      };

      const result = handleEnd("洗好了", mockService);

      // 驗證是否正確計算出約一小時後的時間
      const calledTime = mockService.updateScheduledTaskNextRun.mock.calls[0][1];
      expect(calledTime.getTime()).toBeGreaterThan(Date.now());
    });
    ```

    請謹慎使用程式碼。

4. 2026/01/21 總結

    您已經跨過了開發中最痛苦的「環境配置」階段。現在：

    1.  **ID 系統** 穩固了 (S, T, I)。
    2.  **時鐘引擎** 裝好了 (Croner)。
    3.  **依賴注入** 通順了 (Service 注入)。
    4.  **本地測試** 綠燈了。

**NonBlockingLife** 現在已經不是一個簡單的試算表，而是一個具備**自動化鏈式反應**能力的系統。您要不要先在 Google Sheets 裡手動跑一遍這套「洗衣服」自動觸發「晾衣服」的流程，感受一下那種「系統幫你記住未來」的爽快感？ \[1, 3\]
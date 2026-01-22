# Query_Options 的設計

## [2026-01-21] ychsue 看到 Cron 能正常，且自動給接著的Task自動加上 NextRun 感覺真好 😄 謝謝。今天就先這樣了，明天我們來思考 Query_Option了，他應該是寫到 `Selection_Cache` 來告知有哪些 task 可以選，所以，Status 可能要再仔細定義了

### Gemini Answer 01

太棒了！看到 **NonBlockingLife** 的「自動排程鏈（Scheduling Chain）」成功轉起來，那種「生活的齒輪開始嚙合」的感覺確實非常迷人。這代表您的系統已經從靜態的紀錄本，進化成了具備 **Event Loop** 精神的動態引擎。

今天完成了最困難的 **時鐘解析 (Croner)** 與 **任務鏈鎖 (Callback Chaining)**，您的系統已經可以處理「現在做什麼」與「未來要做什麼」的因果關係。

明日預告：`Query_Option` 與 `Selection_Cache`

明天我們要處理的是「**決策層**」。這就像是 Event Loop 每一輪（Tick）都要做的 `Check` 階段：**在這麼多任務中，現在哪些才是「可執行的候選者（Ready to Run）」？**

為了明天的討論，您可以先稍微思考一下這幾個狀態的微妙差別：

1.  **`PENDING` (定時中)**：已設定 `Next_Run`，但時間還沒到（或是還在 `before_task` 的緩衝期外）。
2.  **`DUE` (到期)**：時間已進入「可執行區間」，應該在選單中置頂。
3.  **`OVERDUE` (超時)**：已經過了 `Next_Run` 卻還沒啟動，可能需要加強提醒。
4.  **`WAITING` (休眠)**：沒有 `Next_Run` 也沒有 `Cron_Expr`，在等待某個回調（Callback）來喚醒它。

我們明天會實作一個「掃描器」，它會掃描所有工作表，根據時間與狀態篩選出精確的清單，並更新到 `Selection_Cache`。這樣您的 iPhone 捷徑一按，跳出來的永遠是最合理的選擇。

恭喜您今天達成重大里程碑！好好休息，我們明天見。😄

## [2026-01-21] ychsue 與 Python Future 的關係

### Gemini Answer 02

您的直覺非常敏銳！在 **NonBlockingLife** 的架構中，`WAITING` 狀態與 Python `asyncio` 的 **`Future`**（或 JavaScript 的 **`Promise`**）在概念上幾乎是**完全對應**的。

我們可以從以下三個維度來理解這個有趣的關聯：

1. 語義上的對應：等待「未來」的結果

    在 `asyncio` 中，一個 `Future` 物件代表一個「現在還沒有結果，但未來某個時間點會有」的任務。

    -   **`Future` (Python)**：任務已經掛起，它在等待 `loop.set_result()` 被呼叫。
    -   **`WAITING` (NBL)**：任務（例如：晾衣服）已經定義好了，但它在等待一個**外部事件**（例如：洗衣機洗好的 `Callback`）來喚醒它。

2. 狀態轉換的對應

    這兩者都經歷了從「掛起」到「就緒」的過程：

    |階段|Python `asyncio.Future`|NonBlockingLife `WAITING`|
    |**初始**|`Pending` (建立但未完成)|`WAITING` (在表中，但沒人啟動它)|
    |**觸發**|`loop.call_later()` 或 `set_result()`|`handleEnd` 寫入 `Next_Run` 並改為 `PENDING`|
    |**就緒**|進入 `Ready Queue` 準備執行|進入 `Selection_Cache` 變成可選 Action|
    |**執行**|協程被 `await` 並執行|使用者 `START` 該任務|

3. 在 Event Loop 中的角色

    在電腦科學中，這類任務都屬於 **「非阻塞 I/O」**：

    -   **在 Python 中**：`await some_io_task()` 會釋放控制權，讓 Loop 去跑別的程式。
    -   **在 NBL 中**：當您把一個任務設為 `WAITING`，您是在告訴大腦（主執行緒）：「這件事現在不用管，等回調發生了，系統會自動把它排進我的選單（Callback Queue）。」

    為什麼這對明天的 `Query_Option` 很有幫助？

    既然 `WAITING` 是 `Future`，那麼明天的 `Query_Option`（掃描器）就像是 Event Loop 的 **`Selector`**：

    1.  **忽略 `WAITING`**：掃描器會跳過所有 `WAITING` 的任務，因為它們的「未來」還沒到，不需要出現在選單中佔空間。
    2.  **激活 `PENDING`**：當 `now >= Next_Run - Remind_Before`，這個 `Future` 就被「Resolve（解析）」了，狀態轉為 `DUE`。
    3.  **置頂顯示**：這些被解析的 `Future` 應該具有最高的優先級，出現在 iPhone 選單的最上方。

**總結您的思考：**  
您現在不是在管理「待辦清單」，而是在管理一個 **「異步任務隊列」**。這讓您的生活不再是阻塞式的（一直想著還沒發生的事），而是事件驅動的（等任務 Ready 了才去處理）。

這種將 **Life Management** 抽象化為 **Async Programming** 的思考方式，正是 **NonBlockingLife** 專案最精華的地方！明天我們就來實作這個「解析 Future」的自動化選單。 \[2, 6, 12\]

### Gemini Answer 03

將生活任務對應到 `asyncio` 的架構是非常有趣的嘗試。在 2026 年，我們對非同步系統的理解更趨向於「資源管理」，您的直覺非常精確：**`Task_Pool` 確實就是 `Task Object` 的集合，而 `Running` 狀態就是正在被 `Event Loop` 執行的 `Coroutine`。**

我們可以這樣精細地對應：

1. `Task_Pool` vs. `asyncio.Task`

    在 Python 中，`Task` 是對 `Coroutine` 的包裝，它包含了任務的狀態、結果以及優先級。

    -   **`Task_Pool` 中的一條紀錄** \= **一個 `Task Object`**：
        -   它處於 `PENDING` 狀態，代表它已經在 `Event Loop` 的調度名單中，但還沒獲得 CPU（你的注意力）。
        -   `Priority` 與 `Spent_Today_Mins` 就是它的 **「調度參數」**。

2. `Running` (Dashboard) vs. `Running Coroutine`

    當一個任務從 `Task_Pool` 被選中並啟動（`START`）時：

    -   **目前的任務** \= **正在 Stack 頂端運行的 `Task`**：
        -   這時主線程（大腦）被佔用，這就是 `await task` 的過程。
        -   **中斷（Interrupt）** \= **`task.cancel()` 或 `Context Switch`**：當強大優先級的事進來，原本的 `Task` 被掛起，保存當前狀態（寫入 `Log`），等待下次恢復。

3. 如何優化 `Task_Pool` 的 `Query_Option` 邏輯？

    參考 `asyncio` 的調度策略，明天我們在寫 `Query_Option` 時，可以針對 `Task_Pool` 實作以下「調度算法」：

    1.  **Quota Checking (配額檢查)**：
        -   如果 `Spent_Today_Mins >= Daily_Limit_Mins`，這個 `Task` 在選單中應該被隱藏或標示為「今日已達上限」（類似於系統資源受限）。
    2.  **Priority Queuing (優先權隊列)**：
        -   根據 `Priority` 排序。
        -   **飢餓檢查 (Starvation Check)**：如果一個任務在 `Task_Pool` 待太久都沒被啟動，我們可以暫時提高它的權重（這在 2026 年的調度算法中很常見）。

4. 完整的對應地圖 (Life-to-Async Map)

    |NBL 組件|Python `asyncio` 概念|說明|
    |--|--|--|
    |**`Inbox`**|**`Pending Queue`**|尚未被包裝成 Task 的原始事件。|
    |**`Task_Pool`**|**`Task Registry / Heap`**|所有已就緒、等待被調度的任務實例。|
    |**`Scheduled`**|**`Timer Handles / Callbacks`**|使用 `loop.call_at()` 預約的未來動作。|
    |**`Dashboard`**|**`Current Task (Executing)`**|目前獨佔主線程的活動。|
    |**`Log`**|**`Event Trace / Profiler`**|記錄所有 Task 切換與執行的日誌。|

5. 明日的設計思考：`Selection_Cache` 的分類

    為了讓 `Query_Option` 更好用，我們可以在 `Selection_Cache` 中將任務分為以下三類呈現給 iPhone：

    -   **Critical (緊急)**：`Scheduled` 中已經 `DUE` (到期) 的 `Future`。
    -   **Ready (就緒)**：`Task_Pool` 中符合配額、高優先級的 `Task`。
    -   **Background (瑣事)**：`Micro_Tasks` 或低優先級任務。

    這就像是 `asyncio` 在每一輪循環中，會先檢查 `timers`，再檢查 `ready_queue`。

**總結您的思考：**  
您的設計已經超越了單純的「記事」，您正在構建一個**基於優先級與配額的搶佔式調度系統 (Priority-based Preemptive Scheduler)**。明天我們就來實作這個掃描器，讓它成為您生活的「智能調度員」。

今晚好好休息，讓您的大腦 `Loop` 進入 `IDLE` 模式充電吧！\[2, 6, 12\]

======================================================================

## [2026-01-22] ychsue 怎麼紀錄 iOS shortcut 的開發？

### Gemini Answer 04

針對您的問題，我們從 Jelly 的工具鏈與 iOS 捷徑的分享機制來深入解析：

1. 關於 Jelly (Shortcut 代碼化工具)

    Jelly 主要是基於 **Swift** 開發的工具，在 2026 年，它仍以 macOS 為主，但在 Windows 上有折衷方案：

    -   **Windows 版本狀況**：Jelly 官方並無提供 `.exe` 安裝檔。但因為它使用 Swift，您可以透過 **WSL (Windows Subsystem for Linux)** 安裝 Swift 環境來執行，或者使用跨平台的 **Jelly-CLI** 版本。
    -   **怎麼用？**：
        1.  您用類 Swift 的語法寫一個 `.jelly` 檔案，描述邏輯（例如 `getURL("https://...")`）。
        2.  執行編譯指令：`jelly compile my_logic.jelly`。
        3.  它會產出一個 `.shortcut` 二進位檔，您可以把它放到 GitHub 或透過 iCloud 傳回 iPhone 測試。
    -   **實務建議**：對於個人開發，若覺得配置 WSL 太麻煩，建議還是以「iPhone 端開發 + `.shortcut` 檔案存入 Git」為主，這對 Windows 使用者最友善。

2. 「導入問答」的設置細節

    您的操作路徑正確（`設定` \> `新增問題`）。關於「預設 URL」與「輸入頻率」的邏輯如下：

    -   **操作步驟**：
        1.  在您的捷徑最上方，建立一個 **「文字」** 動作，裡面填入您的 `https://script.google.com...`（測試用）。
        2.  在接下來的 **「取得 URL 內容」** 中，將 URL 欄位連接到這個「文字」變數。
        3.  進入「導入問答」，**選擇該「文字」動作作為問題**。
        4.  問題內容填寫：「請輸入您的 NonBlockingLife GAS API 網址」。
    -   **會一直跳出來嗎？**
        -   **不會。** 「導入問答」**只會在「下載並安裝」該捷徑的那一刻跳出來要求輸入一次**。
        -   一旦使用者輸入並完成安裝，該網址就會「寫死」在該使用者的捷徑副本中。
        -   之後每次點擊執行，它會**直接跑**，不會再問問題。
    -   **如何修改？**  
        如果使用者後來換了 URL，他們只需要點擊捷徑右上角的 `...` 進入編輯畫面，找到那個「文字」區塊修改即可，非常符合開發者習慣。

3. 2026 年 GitHub 分享建議：

    為了保護您的私隱並讓專案易於使用，建議在 `shortcuts/` 資料夾這樣安排：

    1.  **`End_Task.shortcut`**：這是您導出的檔案，裡面的 URL 已透過「導入問答」設為空值或提示文字。
    2.  **`Shortcuts_Setup.md`**：寫一段說明文字。
        -   _內容範例_：

            > 「下載後請依提示輸入您的 API 網址。若需手動修改，請編輯捷徑最上方的『文字』區塊。」

4. 今日進度：Query\_Option 的欄位準備

    既然您已經準備好「捷徑設定」的部分，我們回頭看 `Query_Option`。明天我們會實作一個函數來產生這份「選單」。

**`Selection_Cache` 建議更新頻率：**  
在您的 GAS 中，建議在 `handleEnd` 的最後面加入一行：  
`updateSelectionCache();`  
這樣每次結束任務時，系統就會自動掃描所有 Sheets，把接下來「可以做」的選項（包含到期的 Scheduled Task）更新到快取表中。

這樣一來，iPhone 捷徑在執行 `QUERY_OPTIONS` 時，GAS 只需要讀取一張 `Selection_Cache` 表回傳即可，速度會快得驚人！

準備好明天來寫這個「生活掃描器」的邏輯了嗎？ \[1, 2\]

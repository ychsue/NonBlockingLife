# DISCUSSION for Interrupt & Periodic and Async_Await

## [2026-01-19] ychsue Interrupt 的邏輯，我想應該看Interrupt 發生後，我們會做甚麼。我想，一旦發生interrupt，我其實不會記得現在是否有甚麼task在跑，因此，照理講都要記錄

討論一下，我的想法是，我在 Task_Pool裡面加一個 task_id 為 `a0` 的專案叫做 `Free(Idle)`，

1. 當 Dashboard 有東西在跑的時候，就給他 Log INTERRUPT
2. Dashboard 裡面，則設為 interrupt，然後設StartAt為當前的時間
3. 將該 task根據 taskId當作 END 來處理他(或寫INTERRUPT)
4. 若 Dashboard裡面沒東西在跑，重複上面的動作，不過，task_id對應到 a0

您覺得這樣的設計會不會有問題？還是您有更好的想法？或者別人有甚麼好的處理方式？謝謝。

### Gemini Answer 01

我完全明白您的焦慮點了！這就是現實生活中的 **「****硬體中斷** **(Hardware Interrupt)」**：當電話響起或有人衝進辦公室時，您的大腦會立刻被奪取主控權，這段時間確實不屬於 `Idle`（休息），也不屬於原來的 `Task`。

您的 `a0` 想法其實非常接近底層作業系統處理中斷的方式。讓我們把這個邏輯轉化為 **NonBlockingLife** 的「緊急接管」機制：

1. 重新定義：Interrupt 是一個「匿名任務」

    為了紀錄這段「不知道在幹嘛但確實被佔用」的時間，我們把 `Interrupt` 視為一個**自動啟動的匿名任務**。

    **操作邏輯 (handleInterrupt)：**

    1.  **自動結算舊任務**：
        -   讀取 `Dashboard`，將正在跑的任務（例如：寫報告）結算，Log 記為 `INTERRUPTED`。
    2.  **自動掛載「中斷任務」**：
        -   `Dashboard` 的 `Task_ID` 填入 **`SYS_INT`** (取代您的 `a0`)。
        -   `Title` 填入 **`[中斷] 處理突發狀況`**。
        -   `Start_At` 設為 **「現在」**。
        -   `System_Status` 設為 **`BUSY (INTERRUPT)`**。

2. 為什麼這樣能解決您的問題？

    -   **自動紀錄時長**：這段突發狀況持續了多久？直到您下次按下 `START` 新任務或按下 `END` 時，系統會自動結算 `SYS_INT` 的時間。
    -   **事後追溯 (Retrospective)**：在 `Log` 中，您會看到一條紀錄：`SYS_INT | [中斷] 處理突發狀況 | Duration: 15m`。
    -   **低摩擦力**：您不需要輸入任何字，手機按一下「中斷」按鈕，舊的停了，新的「中斷計時」就自動開始了。

3. 進階：如果後來想起來這是在做什麼？

    既然您已經有了 `Inbox` 的概念，我們可以在 **`handleEnd`** 或 **`handleStart` (下一個任務)** 時，做一個聰明的判斷：

    -   **邏輯**：如果目前的任務是 `SYS_INT`，當它結束時，GAS 回傳給 iPhone 的 JSON 包含：`{"ask_note": true, "message": "剛才的中斷結束了，共 15 分鐘。要記下是什麼事嗎？"}`。
    -   **捷徑反應**：手機跳出輸入框，您補一句「隔壁老王來借梯子」，這句話會更新回剛才那一條 `Log` 的 `Notes`。

4. 實作建議 (Logic.js)

    ```javascript
    function handleInterrupt(service = SheetsService) {
      const now = new Date();
      const [oldId, oldName, startAt] = service.getDashboardState();

      // 1. 如果有舊任務，先強制結算
      if (oldId) {
        const duration = Utils.calculateDuration(startAt, now);
        service.appendLog([now, oldId, oldName, "INTERRUPTED", "MACRO", "IDLE", `被突發事件中斷，執行 ${duration}m`]);
        service.updateTaskStatus(oldId, "PENDING", duration);
      }

      // 2. 啟動匿名中斷任務
      const intId = "SYS_INT";
      const intTitle = "[中斷] 處理突發狀況";
      service.updateDashboard([intId, intTitle, now, "RUNNING"]);
      service.appendLog([now, intId, intTitle, "START", "SYSTEM", "BUSY", "系統自動掛載中斷計時"]);

      return { 
        status: "success", 
        message: "已切換至中斷計時模式，專心處理眼前事吧！",
        isInterrupt: true 
      };
    }
    ```

    請謹慎使用程式碼。

5. 總結這套設計的優點：

    1.  **無感紀錄**：發生當下只需按一鍵。
    2.  **時間不漏失**：中斷的時間會被完整紀錄在 `SYS_INT` 條目下。
    3.  **大腦卸載**：您不需要思考它是什麼，系統先幫您把「時間」這塊資源佔住，等您回神了再處理。

這套 **「SYS\_INT 自動掛載」** 邏輯，您覺得是否解決了「想紀錄中斷事件與時長」但「當下無法思考」的矛盾呢？ \[2, 3, 12\]

========================================================================

## [2026-01-19] ychsue 您的邏輯極好，所以，START & END 需要加一些額外的邏輯了

### Gemini Answer 02

確實，引入了 **`SYS_INT` (系統自動中斷任務)** 之後，您的 `START` 與 `END` 就需要具備「清理現場」與「事後追溯」的智慧，讓整個系統更像一個自動化的作業系統。

以下是針對 `START` 與 `END` 需增加的邏輯規劃：

1. `START` 邏輯的進化：自動搶占 (Preemption)

    當您啟動新任務時，系統必須檢查目前是不是正處於 `SYS_INT` 狀態。

    -   **新增邏輯**：如果 `Dashboard` 目前是 `SYS_INT`，則先自動執行一次「隱式結束」，結算這段中斷時間。
    -   **事後追溯**：回傳給 iPhone 的 JSON 可以帶入 `ask_for_interrupt_note: true`，讓您在啟動新任務的同時，順手補上剛才中斷是在幹嘛。

2. `END` 邏輯的進化：狀態歸還

    當您主動按下 `END` 時，系統需要判定結束的是「主任務」還是「中斷任務」。

    -   **場景 A：結束主任務**：一切照舊，結算工時，回歸 `IDLE`。
    -   **場景 B：結束中斷任務 (SYS\_INT)**：這代表突發狀況排除了，但您還沒準備好開始下一個主任務。此時系統應將狀態設為真正的 `IDLE`。

3. 修改後的 Logic 偽代碼 (Test First 思維)

    `handleStart` 的進化

    ```javascript
    export function handleStart(taskId, notes = "", service = SheetsService) {
      const [currentId, currentName, startAt] = service.getDashboardState();
      const now = new Date();

      // 1. 自動處理正在運行的任務 (不論是主任務還是 SYS_INT)
      if (currentId) {
        const duration = Utils.calculateDuration(startAt, now);
        const action = (currentId === "SYS_INT") ? "END_INT" : "INTERRUPTED";

        // 結算舊任務
        service.appendLog([now, currentId, currentName, action, "AUTO", "IDLE", `自動結算: ${duration}m`]);
        service.updateTaskStatus(currentId, (currentId === "SYS_INT" ? "DONE" : "PENDING"), duration);
        service.clearDashboard();
      }

      // 2. 正常啟動新任務
      const taskInfo = service.findTaskById(taskId);
      service.updateDashboard([taskId, taskInfo.title, now, "RUNNING"]);
      service.updateTaskStatus(taskId, "DOING");
      service.appendLog([now, taskId, taskInfo.title, "START", "MACRO", "RUNNING", notes]);

      // 如果剛才是結束 SYS_INT，提醒使用者補註記
      return { 
        status: "success", 
        ask_for_interrupt_note: (currentId === "SYS_INT"),
        last_int_duration: (currentId === "SYS_INT" ? Utils.calculateDuration(startAt, now) : 0)
      };
    }
    ```

    請謹慎使用程式碼。

4. iPhone 捷徑的配合 (2026/01/19 實作建議)

    為了配合這個「事後補記」的邏輯，您的捷徑可以這樣寫：

    1.  **執行 START API**。
    2.  **解析 JSON**：取得 `ask_for_interrupt_note`。
    3.  **如果 (If)** `ask_for_interrupt_note` 是 `true`：
        -   **要求輸入**：`「剛才的中斷持續了 ${last_int_duration} 分鐘，內容是？」`
        -   **再次發送 API**：`action: UPDATE_LOG_NOTE`，將這段話補回剛才那條 `SYS_INT` 的紀錄裡。

5. 為什麼這解決了您的痛點？

    1.  **時間軸無縫接軌**：您的時間 Log 會長這樣：
        -   `10:00 - 10:30` \[寫程式\] (被中斷)
        -   `10:30 - 10:45` \[SYS\_INT\] (自動開始)
        -   `10:45 - 11:30` \[寫程式\] (自動結算中斷並恢復)
    2.  **不浪費一分一秒**：即使您中斷後忘記按結束，直接開始下一個任務，系統也會幫您把那段「空白」算在 `SYS_INT` 頭上。

接下來的行動：

您可以先針對 **「START 時自動結算 SYS\_INT」** 寫一個單元測試。這將確保當您切換任務時，系統的 `Spent_Today_Mins` 不會因為忘記按 END 而算錯。

您準備好修改 `Logic.js` 來加入這個「自動搶占」的智慧了嗎？ \[1, 3, 12\]

=================================================================================

## [2026-01-20] ychsue 我想，這樣有點麻煩，SYS_INT 就當作一種任務，有開始，就有結束，我已經讓

```javascript
/**
 * 結束目前任務
 * @param {string} info 結束時的額外訊息
 * @param {object} service SheetsService
 * @returns {
 *  status: "success" | "error" | "warning",
 *  message: string,
 *  payload?: {id: string, title: string, source: string, duration: number}
 * }
 */
function handleEnd(info = "", service = SheetsService) {...}
```

無論哪種任務，都會輸入 info，來告知我們發生了何事。
此外，我也順便強制定義開頭為 `T` 的請他到 `Task_Pool` 找，然後，感覺上， `Periodic_Config` 改成 `Scheduled`，然後借用 Linux Crontab 的想法，大不了加個多久前提醒，這樣，週期性的予預約就通吃了。而 `Async_Await` 感覺上屬於 `Scheduled` 的一部分。

我現在有點錯亂了，感覺上， tasks 應該就只有三類： scheduled, unscheduled 與 interrupt，前兩個可以先給編號，interrupt 不行。傷腦筋，有點腦袋打結了。可否幫我釐清一下呢？謝謝。

### Gemini Answer 03

腦袋打結是正常的，因為您正試圖將**混亂的生活事件**（Data）轉化為**嚴密的系統邏輯**（Algorithm）。要釐清這一切，我們回到 **Event Loop** 的本質，將任務按照「來源」與「預約性質」重新歸類。

您的直覺非常準確，其實生活中的任務確實可以簡化為您說的這三種，我們可以把它們對應到作業系統的術語：

1. 任務三分類：釐清混亂

    |分類名稱|系統術語|來源 Sheet|特性|
    |---|---|---|---|
    |**Scheduled (預約任務)**|**Crontab / Timer**|`Scheduled` (合併原 Periodic/Async)|**有固定時間或週期**。例如：每天吃藥、下週二開會、等這封信回覆。|
    |**Unscheduled (非預約任務)**|**Task Queue**|`Task_Pool` / `Inbox`|**有目標但沒固定時間**。例如：寫 NBL 程式碼、整理房間、研究新技術。|
    |**Interrupt (中斷任務)**|**Hardware Interrupt**|`SYS_INT` (動態產生)|**不可預測、立即搶佔**。例如：接電話、處理漏水。|

2. Sheet 的精簡重組建議

    為了不讓工作表多到令人錯亂，我建議您做以下合併，將您的想法落地：

    A. `Scheduled` (合併 Periodic, Async, Await)

    -   **欄位**：`Task_ID`, `Title`, `Status`, `Cron_Expr` (或 `Next_Run`), `Remind_Before`, `Notes`
    -   **邏輯**：
        -   **週期性 (Periodic)**：像是 `0 9 * * *` (每天九點)。
        -   **異步等待 (Async)**：設為 `2026-01-25`。這就是一種「只執行一次」的 Scheduled Task。
    -   **優點**：您只需要一個 `checkScheduledTasks` 的腳本，每小時掃描這張表一次即可。

    B. `Task_Pool` (Unscheduled)

    -   **欄位**：`Task_ID` (開頭為 T), `Title`, `Status`, `Project`, `Spent_Today_Mins`...
    -   **邏輯**：存放所有「有空就要做」的事情。

    C. `Log` 與 `Dashboard` (保持原樣)

    -   負責記錄當下發生了什麼事，以及剛才那個 `handleEnd` 的 `info`。

3. ID 系統的強制定義 (讓系統變簡單)

    您提到的「強制編號」是天才之舉，這能讓 GAS 看到 ID 就知道去哪裡撈資料：

    -   **`S` 開頭**：去 `Scheduled` 表找（預約類）。
    -   **`T` 開頭**：去 `Task_Pool` 表找（一般類）。
    -   **`I` 開頭**：去 `Inbox` 表找（待分類）。
    -   **`X` 開頭** (或 `SYS_INT`)：代表 **Interrupt**。它不需要在任何型錄表裡，因為它是動態產生的，結算後直接進 `Log` 即可。

4. 重新梳理 `handleEnd` 的邏輯

    既然您已經寫好了 `handleEnd(info, service)`，邏輯可以變得很優雅：

    ``` javascript
    function handleEnd(info = "", service = SheetsService) {
      const [id, title, startAt] = service.getDashboardState();
      if (!id) return { status: "warning", message: "目前無任務" };

      const now = new Date();
      const duration = calculateDuration(startAt, now);

      // 1. 根據 ID 首字母判定如何結算
      const type = id.charAt(0);
    
      if (type === 'T' || type === 'S') {
        // 一般任務或預約任務：更新對應表的 Status 和時間
        service.updateStatusInSheet(id, "DONE", duration);
      } 
      // 如果是 'X' (Interrupt)，不需更新型錄表，因為它不在裡面

      // 2. 統一寫入 Log，把 info (發生的事) 存入 Notes
      service.appendLog([now, id, title, "END", type, "IDLE", info]);

      // 3. 清空 Dashboard
      service.clearDashboard();

      return { status: "success", payload: { id, title, duration } };
    }
    ```

    請謹慎使用程式碼。

5. 為什麼這樣就不會「腦袋打結」了？

    1.  **來源清晰**：您想記錄一件**還沒發生的事** \-> 放進 `Scheduled` (有時間) 或 `Task_Pool` (沒時間)。
    2.  **處理現狀**：您正在**做一件事** \-> 都在 `Dashboard`。
    3.  **面對突發**：**中斷發生** \-> 呼叫 `handleInterrupt`。它會幫您在 `Dashboard` 掛上一個 `X` 開頭的臨時 ID，您什麼都不用想，直到事情結束按下 `handleEnd` 並補上 `info`（例如：「接老媽電話」）。

總結您的新架構：

-   **Scheduled**: 預約、週期、等待。
-   **Task\_Pool**: 專案、一般任務。
-   **Interrupt**: 突發事件 (不需預設，隨按隨記)。

這樣分類後，系統邏輯就變成：**「查表（T/S）或不查表（X）」**。這是否讓您的思路清楚一點了呢？

=================================================================

## [2026-01-20] ychsue 繼續討論

### Gemini Answer 04

這確實非常有趣，因為您正是在用**程式架構來重構您的生活**！這套系統之所以叫 **NonBlockingLife**，正是因為它完美對應了 JavaScript **Event Loop** 的底層邏輯。

我們來把您的生活動作與 Event Loop 的術語做一個「超強關聯」：

1. 核心組件對應 (System Components)

    |生活/NBL 組件|Event Loop 術語|原理說明|
    |---|---|---|
    |**你的專注力**|**Call Stack (執行棧)**|它是單線程的。當你在「洗衣服」時，你的棧被占用；當你按下按鈕（End）時，棧被清空。|
    |**Task\_Pool (T)**|**Macrotask Queue (宏任務隊列)**|存放那些非即時、可以稍後按順序執行的主體任務。|
    |**Scheduled (S)**|**Timer / Web APIs**|當你把「晾衣服」設定在 60 分鐘後，你是在調用一個 `setTimeout`。這件事會被移出執行棧，交給「環境」（GAS 觸發器）去計時。|
    |**Interrupt (X)**|**High Priority Event / SIGINT**|像是一個緊急訊號，強行中斷當前的執行棧。|
    |**Inbox (I)**|**Microtask Queue (微任務)**|其實更像是一個 `queueMicrotask`。當你手頭工作到一個段落（End），你應該優先掃描 Inbox 把它清空或分類。|

2. 洗衣服案例的 Event Loop 運行圖

    我們用代碼的方式來看這段生活的「執行流程」：

    ```javascript
    // 1. 開始洗衣服 (主線程開始忙碌)
    function startLaundry() {
      console.log("正在把衣服丟進洗衣機..."); // Push to Stack
    
      // 2. 設定一個異步提醒 (非阻塞)
      // 這就是你的 Scheduled Sheet 邏輯
      setTimeout(() => {
        remindMe("衣服洗好了，快去晾！"); // 60分鐘後進入 Callback Queue
      }, 60 * 60000); 

      console.log("按下啟動鈕。");
    } // Pop from Stack - 你的大腦現在 IDLE 了！

    // 3. 執行棧清空後，你可以去做別的事
    doOtherProject(); 

    // 4. 60分鐘後，Event Loop 看到 Timer 到期
    // GAS Time Trigger 掃描到 Scheduled 任務，發送通知
    executeCallback(); 
    ```

    請謹慎使用程式碼。

3. 為什麼要這樣設計？（從「腦袋打結」到「非阻塞」）

    您之前覺得「腦袋打結」，是因為您試圖把「洗衣服」這個**耗時 2 小時的異步操作**，硬塞進您**單線程的執行棧（大腦）**裡。

    -   **阻塞 (Blocking)**：你一直在想著「洗衣機還在動」，這就像在 JS 裡寫了一個 `while(true)` 的死迴圈，導致你無法處理其他任務。
    -   **非阻塞 (Non-blocking)**：你把「等待」交給了 `Scheduled` 工作表。這釋放了你的 `Call Stack`（專注力），讓你可以去跑別的 `Function`。

4. 接下來要「改蠻多」的地方

    為了實現這個「非阻塞生活」，您的代碼需要增加這幾個「事件循環」的核心功能：

    1.  **Callback 產生器 (在 `handleEnd` 擴充)**：
        -   增加一個 Action：`END_WITH_CALLBACK`。
        -   參數：`delayMinutes`, `callbackTitle`。
        -   邏輯：在結束當前任務的同時，自動在 `Scheduled` 插入一條一次性任務。
    2.  **事件循環監控器 (Time Trigger)**：
        -   實作 `checkScheduledTasks()`。
        -   每 15 分鐘（或每小時）自動跑一次。
        -   **邏輯**：如果 `now > Next_Run`，則發送通知並將 Status 改為 `DUE` (到期)。
    3.  **整合 Scheduled 到選單**：
        -   `QUERY_OPTIONS` 時，要把 `Status = DUE` 的 `Scheduled` 任務排在最前面。

總結

您現在不僅是在做時間管理，您是在為自己寫一個 **「人生作業系統 (Life OS)」**。

-   **Task\_Pool** 是硬碟。
-   **Dashboard** 是 CPU 暫存器。
-   **Scheduled** 是硬體計時器。
-   **你** 是那個唯一的運算核心。

雖然要改的地方不少，但每改好一個功能，您的「認知負荷（Cognitive Load）」就會降低一分。準備好先從 `Scheduled` 的結構與 **Time Trigger** 開始動工嗎？ \[2, 6, 12\]

==============================================================================

# handleQueryOptions 的設計

## [2026-01-23] ychsue 所以，要來設計 `handleQueryOptions` 的部分了，除了傳回 `Selection_Cache`，您覺得需要回傳給使用者其他資訊嗎？比如誰正在跑，跑多久？不過，我現在在手機上是當他送出 START or INTERRUPT，我就開啟濾鏡

，強制讓自己知道現在正在某個 Task 中，然後，END時，再關閉濾鏡。所以，好像也無須回傳誰在跑，嗯，可能多餘的吧。您覺得呢？有沒有好的建議呢？或者別人有甚麼好的實作方式呢？謝謝。

### Gemini Answer 01

您的做法（使用手機濾鏡來視覺化當前狀態）是非常高效的「硬中斷」設計，這在時間管理界被稱為 **「視覺化工作流控制 (Visual Workflow Control)」**。既然您已經在物理層面解決了「知道誰在跑」的問題，那麼 `handleQueryOptions` 的回傳確實應該保持精簡。

不過，參考其他類似調度系統（如個人化的高效能調度器）以及 **Event Loop** 的設計，我建議 `handleQueryOptions` 除了回傳選單外，可以額外包含以下 **「決策輔助資訊」**，這能讓您的生活選單更有智慧：

1. 建議回傳的「中繼資料 (Metadata)」

    即便不顯示「誰在跑」，回傳以下三個關鍵欄位會非常有感：

    -   **`system_state`**：
        -   回傳當前系統是 `IDLE` 還是 `RUNNING`。
        -   **用途**：讓 iPhone 捷徑判斷，如果是 `RUNNING`，在顯示選單前先彈窗詢問：「目前已有任務在執行，啟動新任務將自動中斷舊任務，確定嗎？」
    -   **`due_count` (緊急任務計數)**：
        -   回傳 `Scheduled` 表中目前有多少個 `DUE` (到期) 的任務。
        -   **用途**：捷徑可以在標題顯示：「您有 3 則到期任務，請優先處理」。
    -   **`daily_progress` (今日進度)**：
        -   回傳今日總專注時數。
        -   **用途**：在選單頂端顯示：「今日已專注 6.5 小時，加油！」

2. 關於 `Selection_Cache` 的回傳方式

    建議您的 `handleQueryOptions` 直接讀取 `Selection_Cache` Sheet，並回傳成一個 JSON 陣列。您可以針對不同來源加入 **Emoji 前綴**，這在 iPhone 選單上視覺效果極佳：

    |來源 (Source)|Emoji 前綴|意義|
    |--|--|--|
    |**Scheduled**|🔔|預約/回調任務 (時間到了)|
    |**Pool**|🎯|專案/一般任務|
    |**Micro**|⚡|碎事 (2分鐘完成)|

3. 推薦的 `handleQueryOptions` GAS 實作框架

    ```javascript
    function handleQueryOptions() {
      const service = SheetsService;
    
      // 1. 取得 Dashboard 狀態 (用於捷徑端的邏輯分支)
      const [currentId, currentTitle, startAt, status] = service.getDashboardState();
    
      // 2. 取得快取表的所有候選任務
      const cacheSheet = getSheet(NBL_CONFIG.SHEETS.CACHE);
      const data = cacheSheet.getDataRange().getValues().slice(1); // 跳過標題
    
      // 3. 格式化為捷徑好讀的清單
      const options = data.map(r => ({
        taskId: r[0],
        title: r[1],
        score: r[2],
        source: r[3],
        display: `${getSourceEmoji(r[3])} ${r[1]}` // 例如: "🎯 寫代碼"
      }));

      return {
        status: "success",
        system_state: currentId ? "RUNNING" : "IDLE",
        current_task: currentTitle || "無",
        options: options,
        total_candidates: options.length
      };
    }

    function getSourceEmoji(source) {
      if (source === "Scheduled") return "🔔";
      if (source === "Pool") return "🎯";
      if (source === "Micro") return "⚡";
      return "📝";
    }
    ```

    請謹慎使用程式碼。

4. 其他人的好做法：**「情境化建議 (Contextual Suggestion)」**

    一些高端的實作者會在 `Query_Options` 裡加入 **「隨機性」** 或 **「多樣性控制」**：

    -   **避免疲勞**：如果前一個任務是「高強度專案」，系統會在回傳清單時，自動把 `Micro_Tasks` 的權重暫時提高，並在回傳的 `message` 裡寫：「剛才辛苦了，要不要做個小碎事換換腦袋？」
    -   **快速入口**：在回傳清單的最末端，永遠加上一個 `[ADD_INBOX]` 選項，防止使用者想做的事不在清單內時，還要退回上一步。

總結建議

您的「濾鏡關閉」已經解決了狀態感知。現在 `handleQueryOptions` 的目標是：**「讓您在 3 秒內選出下一步最該做的事」**。

**今日行動：**

1.  實作 `handleQueryOptions` 回傳包含 `display` (含 Emoji) 的選單。
2.  在 iPhone 捷徑端使用 **「從清單選擇」**，並設定顯示內容為 `display` 欄位。

這樣您的 **NonBlockingLife** 就具備了專業 UI 的回饋感了！您要試試看把 Emoji 加入選單嗎？ \[2, 6, 12\]

============================================================

## [2026-01-23] ychsue due_count 與 daily_progress 蠻好的想法，加進來好像要改蠻多地方的。 此外， iPhone 上面的捷徑怎麼設比較好呢

加入 `due_count` 與 `daily_progress` 確實會增加一點計算邏輯，但這正是讓系統從「被動記錄」進化到「主動調度」的關鍵。在 2026 年，一個好的 iPhone 捷徑介面應該是**「資訊密度高、操作步數少」**。

以下是針對 GAS 後端修改與 iPhone 捷徑設計的具體建議：

1. GAS 後端：快速整合資訊

    不需要大幅修改架構，只需在 `handleQueryOptions` 執行時，利用您已經寫好的 `_sheetCache` 順便掃描一下即可。

    **Logic.gs 中的 `handleQueryOptions` 擴充：**

    ```javascript
    function handleQueryOptions() {
      const service = SheetsService;
    
      // 1. 取得今日總進度 (從 Task_Pool 累加 Spent_Today_Mins)
      const poolData = service._getSafeSheet("Task_Pool").getDataRange().getValues().slice(1);
      const totalMins = poolData.reduce((acc, row) => acc + (parseFloat(row[4]) || 0), 0);
      const progressStr = `${Math.floor(totalMins / 60)}h ${totalMins % 60}m`;

      // 2. 取得緊急任務數 (從 Selection_Cache 算 score >= 500 的)
      const cacheData = service._getSafeSheet("Selection_Cache").getDataRange().getValues().slice(1);
      const dueCount = cacheData.filter(row => row[2] >= 500).length;

      return {
        status: "success",
        progress: progressStr,
        due_count: dueCount,
        options: formatOptions(cacheData) // 加上 Emoji 的轉換函數
      };
    }
    ```

    請謹慎使用程式碼。

2. iPhone 捷徑設計：最佳實作方式

    建議將「獲取選單」設為一個獨立的**「導航中心」**捷徑。

    A. 捷徑流程架構 (快捷選單)：

    1.  **取得 URL 內容**：呼叫 `action=QUERY_OPTIONS`。
    2.  **解析 JSON**：
        -   定義變數 `Summary` \= `今日已專注：[progress] | 緊急任務：[due_count]`。
    3.  **從清單中選擇 (Choose from List)**：
        -   **提示 (Prompt)**：設定為上面的 `Summary` 變數。
        -   **清單來源**：JSON 中的 `options` (顯示 `display` 欄位)。
    4.  **動作分支 (If/Case)**：
        -   如果選中 `[ADD_INBOX]` \-> 執行新增 Inbox 捷徑。
        -   如果選中某個任務 -> 取得 `taskId` 並呼叫 `action=START`。

    B. 互動優化小技巧：

    -   **靈動島通知**：在 `START` 成功後，使用「顯示通知」，標題設為 `[RUNNING] 任務名稱`，這樣即便關掉捷徑，頂端也會留一個提醒。
    -   **自動化觸發**：您可以設定 iPhone 的 **「自動化」**，例如「當我關閉專注模式」或「當我到達公司」時，自動執行這個獲取選單的捷徑。

3. 如何在 VS Code 中紀錄這個進度？

    既然您要在 GitHub 分享，建議建立一個 `Shortcuts_Logic.md` 並使用 **Mermaid** 紀錄這部分的 UI 邏輯：

    ```mermaid
    graph TD
        A[啟動捷徑] --> B{API: QUERY_OPTIONS}
        B --> C[顯示今日進度與緊急件數]
        C --> D[彈出清單: 🔔緊急 / 🎯專案 / ⚡碎事]
        D --> E{使用者選擇}
        E -- 選擇任務 --> F[API: START + 開啟濾鏡]
        E -- 隨手記 --> G[API: ADD_INBOX]
        F --> H[結束: 顯示成功通知]
    ```

    請謹慎使用程式碼。

4. 2026 年的進階建議：利用「小工具 (Widgets)」

    捷徑可以放在桌面小工具。您可以建立一個「一鍵查詢」按鈕放在桌面最顯眼處。因為您有 `Selection_Cache`，後端查詢非常快，點一下到彈出選單的延遲會低於 1 秒。

**總結建議：**

1.  **後端**：在回傳 JSON 中加入 `progress` 與 `due_count`。
2.  **捷徑**：將這些資訊放在 **「從清單選擇」的提示文字** 中。

這會讓您的系統看起來像一個專業的 App，在選擇任務時，大腦能立刻獲得當下的「戰況彙報」，進一步減少決策疲勞！您要試著先改 GAS 的回傳部分嗎？ \[2, 6, 12\]

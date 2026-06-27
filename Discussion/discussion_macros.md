# 連續commands 的觸發

## [2026-06-27] ychsue 想名字與設計

首先，我想要有一個頁籤放在 [TabNavigation.tsx](pwa\src\components\TabNavigation.tsx) 裡面，名字還不確定，暫時稱為 macro。

1. 他也需要一個 dexie 的 table，來存放每一個 macro，並且也會加入 changeLog，因此能夠sync到 Google Sheets 上面
2. 這個頁面會列出所有的 macro，並且可以新增、刪除、編輯 外加執行 macro
3. 所以，畫面大致跟 InboxPage.tsx 差不多，只是，手機上使用類TableCard，但主體`fields`就是一個按鈕，而電腦上使用 table，但只能透過編輯按鈕來編輯，主體也是一個按鈕。
4. 每一個 macro 會有一個名稱、描述、以及一個 command 的陣列，這個 command 陣列會依照順序執行
5. 由於許多命令應該會打開Chrome其他分頁，所以，需要 localStorage 來存放目前macro的狀態，比如
   - macroId
   - context
   - commandIndex
   - commandStatus (pending, running, completed, failed)
   - 這樣，每當切換回來，就可以接著繼續跑(算是簡易的 async queue嗎？😄)
6. 整個 macro 有 macroId、name、description、commands 這四個欄位，commands 則是使用 yaml 寫成的文件
7. 例如

   ```yaml
   # 大本與補充本詩歌
   - command: inputDialog #開啟dialog，有title(iTitle)，讓使用者輸入要播放的詩歌編號(whichOne)，並且 context={whichOne: <user_input>}存到 localStorage
     iTitle: 請輸入要播放詩歌第幾首 
     whichOne:
        type: number
        label: 請輸入數字
   - command: addInboxTask
     iTitle: 新增一個「播放詩歌」的任務到 Inbox
     title: 播放詩歌第 {{whichOne}} 首
     url: https://www.hymnal.net/en/hymn/ch/{{whichOne}}
   - command: openUrl
     iTitle: 開啟大本詩歌第 {{whichOne}} 首的網頁
     url: https://www.hymnal.net/en/hymn/ch/{{whichOne}} #openUrl會先開啟一個popup，請使用者決定是否執行，執行的那一個就可以是<a>，iPhone應該也同意。這裡的 {{whichOne}} 會被替換成 localStorage 裡面的 context.whichOne
   - command: openUrl
     iTitle: 開啟補充本詩歌第 {{whichOne}} 首的網頁
     url: https://www.hymnal.net/en/hymn/ts/{{whichOne}} #原則上，打開上面那個頁面後，再回來時，就會執行這一個，所以也會再開這個網址
    # 全部執行完，就可以由 localStorage 移除，也就完成這個macro 了 
   ```

8. 所以上面就有三種commands，
   - inputDialog: 會開啟一個對話框，讓使用者輸入資料，並且存到 localStorage 裡面
   - addInboxTask: 會新增一個任務到 Inbox
   - openUrl: 會開啟一個網址，並且可以使用 localStorage 裡面的 context 來替換網址裡面的變數
9. 這樣，使用者按這個macro的按鈕後，就會依照順序執行這些commands，並且可以在不同的分頁之間切換，直到所有commands都執行完畢。
10. 然後，因著有sync，所以這些自訂的macro就可以傳到其他裝置上，保持一致。
11. 請問我有漏寫甚麼嗎？

---

## [2026-06-27] GitHub Copilot 的建議 01

目前設計中建議補上的點

1. 版本遷移：Dexie schema 升版與舊資料庫遷移策略。
   1. A: 只新增一個 table Macro，會有甚麼風險嗎？
   2. A: [程式碼.js](pwa\src\gas\程式碼.js) 是 GAS 的程式碼，應該也要新增關於 macro 的 table，並且也要有升版策略，因為目前沒有 macro 的部分的 sheet，這樣就會導致 macro 的資料無法同步到 Google Sheets 上面。
2. 失敗語意：command 失敗後是停在當前步重試，還是可跳過。
   1. A: 能夠看到錯誤訊息，然後選擇重試、跳過或者根本終止整個 macro。這樣如何？
3. 安全邊界：YAML 可自訂但 command 必須白名單，不允許任意腳本。
   1. A: 原則上，macro 的 command 只能是預先定義好的 command，能夠一有新定義，就能自動加入他們的使用說明嗎？這樣，使用者就可以速查了，比方說像 [InboxHelp.md](pwa\src\components\tables\InboxHelp.md) 然後自動補上 command 的定義？可能用 .tsx比較好。
4. 競態處理：多分頁同時點執行時的鎖定規則。
   1. A: 這個的確可能發生，如果使用者的頁面沒更新，確實可能會重複按下去，所以，是透過 dexie 或 localstorage 來鎖的，對嗎？還是有更好的做法？
   2. A: 對了，突然想到一個問題，這個PWA現在變成TWA，正在跑 Play Console 的封測，這個 macro 的功能，會不會被 Play Console 認為是「自動化操作」而被拒絕？這個要注意。
5. 同步衝突：不同裝置同時編輯同一 macro 的最後寫入策略。
   1. A: 那就最後寫入的勝出，然後在 changeLog 裡面記錄下來，這樣就可以知道誰改了什麼。
6. 可觀測性：執行歷史或至少錯誤訊息，否則除錯很痛苦。
   1. A: 說來這整個 PWA 好像完全沒有存錯誤訊息ㄟ？是否需要這樣的一個 dexie table 來存所有的錯誤訊息？那麼，我是否在這個App的哪裡可以打開 debug mode，然後使用者就可以看到錯誤歷史了？而這個debug mode 也可以順便控制程式是否輸出詳細的錯誤訊息等，如何？

---

## [2026-06-27] GitHub Copilot 的建議 02（依你的回覆收斂）

你的 6 點回覆整體方向正確，而且可以直接落地。下面是收斂後的建議，目標是先做出可上線的 MVP，再補強安全與觀測。

1. 版本遷移（Dexie + GAS）
   1. 只新增 Macro table 的主要風險：
      - 只能存定義，無法穩定管理「執行中狀態」與「錯誤追蹤」。
      - 多分頁重複點擊時，缺少權威鎖資料來源。
   2. 建議最少新增三塊資料：
      - macro（同步）
      - macro_execution（不同步，本機狀態）
      - app_log 或 error_log（不同步，可選）
   3. GAS 端同意你的判斷，必須補：
      - 若無 macro sheet，自動建立。
      - 加入版本檢查與升版流程，避免同步時才失敗。

2. 失敗語意（retry / skip / abort）
   1. 這個設計很好，建議直接採用。
   2. 錯誤資訊最少要含：
      - macroId
      - commandIndex
      - command type
      - message
      - 發生時間
   3. skip 要留下明確記錄，避免事後不知道為何有步驟沒跑。

3. 安全邊界（白名單 + 說明自動化）
   1. 只允許預先定義 command，正確。
   2. 支援「新增 command 後自動有說明」的方式：
      - 做一個 command registry（名稱、欄位、範例、說明）。
      - Help 畫面直接由 registry 渲染（用 tsx 很適合）。
      - 這樣規格與文件同源，不會出現文件過期。

4. 競態處理（多分頁鎖）
   1. 建議「Dexie 為主鎖、localStorage 為快取恢復」：
      - Dexie: authoritative lock + TTL 過期機制。
      - localStorage: 僅用來快速找到上次執行中的 macro。
   2. 這樣可降低多分頁同時按下造成的重複執行。
   3. 你提到 TWA/Play 風險非常關鍵，建議維持：
      - 所有動作皆由使用者明確觸發。
      - openUrl 每步確認。
      - 不做背景自動點擊、注入、隱式執行。

5. 同步衝突（LWW）
   1. LWW（最後寫入勝出）可作為 MVP 策略。
   2. 另外建議在 changeLog 補可追溯欄位（deviceId、updatedAt、操作摘要），方便回查覆蓋來源。

6. 可觀測性（錯誤歷史 + debug mode）
   1. 建議新增 log table，這件事很值得做。
   2. debug mode 建議分級：
      - 預設：只記錄 error
      - debug 開啟：記錄 info/warn/error + 執行軌跡
   3. 提供一個簡單 Debug 頁面（可清除、可匯出），先解決排錯痛點。

7. 建議 MVP 驗收條件（DoD）
   1. Macro 可 CRUD 並成功 sync 到 Google Sheets。
   2. 三個 command（inputDialog、addInboxTask、openUrl）可依序執行。
   3. 中途中斷可恢復，且可 retry / skip / abort。
   4. 多分頁重複執行可被鎖定阻擋。
   5. 錯誤歷史可查看，debug mode 可切換。

8. 目前建議結論
   1. 你的方向可行，且架構上與現有系統相容。
   2. 下一步優先做資料層升版與執行器，UI 可沿用 Inbox 互動模式快速完成。

---

## [2026-06-27] GitHub Copilot 的建議 03（實作順序清單：按檔案與函式拆工）

以下是可直接開工的拆工順序。先做資料層與執行器，再接 UI，最後補同步與觀測。

### Stage 0 - 規格凍結（半天）

1. 檔案：`pwa/src/utils/syncUtils.ts`
   1. 函式/常數：`SYNC_TABLES`
   2. 動作：確認 Macro 命令可操作的目標表集合（建議先用 `task_pool`, `scheduled`, `micro_tasks`, `inbox`, `resource`；`log` 先不開放）。

2. 新增檔案：`pwa/src/macro/commandRegistry.ts`
   1. 輸出：`CommandSpec[]`、`allowedAddTables`
   2. 動作：把 command 白名單、欄位 schema、範例 YAML 放同一份 registry，後續 parser 與 Help 都讀這裡。

### Stage 1 - 資料層升版（1-2 天）

1. 檔案：`pwa/src/db/schema.ts`
   1. 新增 interface：`MacroItem`, `MacroExecution`, `AppLogEntry`
   2. 新增 table：`macro`, `macro_execution`, `app_log`
   3. 動作：Dexie version 升版（v2），保留舊表不動。

2. 檔案：`pwa/src/db/schema.ts`
   1. 函式：`constructor()`
   2. 動作：補 migration，確保舊使用者升版後可讀寫新表。

3. 檔案：`pwa/src/db/changeLog.ts`
   1. 函式：`applyChange()`（或同職責函式）
   2. 動作：確認 `macro` 走既有 change log 管線；若需要，補 `clientId/deviceId` 與 `updatedAt` 可追溯欄位。

### Stage 2 - GAS 升版（1 天）

1. 檔案：`pwa/src/gas/程式碼.js`
   1. 函式：初始化/建表流程（create sheet 或 ensure sheets）
   2. 動作：新增 macro sheet；若不存在就自動建立，欄位與版本號一併初始化。

2. 檔案：`pwa/src/gas/程式碼.js`
   1. 函式：push/pull 操作分派
   2. 動作：把 macro 納入同步分派，避免本地有資料但雲端漏同步。

### Stage 3 - Macro 執行器核心（2-3 天）

1. 新增檔案：`pwa/src/macro/parser.ts`
   1. 函式：`parseMacroYaml()`, `validateCommands()`
   2. 動作：YAML 解析 + 白名單驗證 + 欄位型別檢查。

2. 新增檔案：`pwa/src/macro/interpolate.ts`
   1. 函式：`interpolateTemplate()`
   2. 動作：`{{var}}` 替換只允許 string/number，缺值即報錯。

3. 新增檔案：`pwa/src/macro/executor.ts`
   1. 函式：`runMacro()`, `runNextCommand()`, `retryCurrent()`, `skipCurrent()`, `abortMacro()`
   2. 動作：狀態機 `idle/running/failed/completed/aborted`，錯誤時支援 retry/skip/abort。

4. 新增檔案：`pwa/src/macro/lock.ts`
   1. 函式：`acquireLock()`, `heartbeatLock()`, `releaseLock()`, `reclaimExpiredLock()`
   2. 動作：Dexie 主鎖 + TTL；localStorage 僅存「上次執行索引提示」。

### Stage 4 - Command 實作（2 天）

1. 新增檔案：`pwa/src/macro/commands/openUrl.ts`
   1. 函式：`executeOpenUrl()`
   2. 動作：每步確認才開啟 URL，限制 `http/https`。

2. 新增檔案：`pwa/src/macro/commands/inputDialog.ts`
   1. 函式：`executeInputDialog()`
   2. 動作：收集輸入並寫入 execution context。

3. 新增檔案：`pwa/src/macro/commands/addRecord.ts`
   1. 函式：`executeAddRecord()`
   2. 動作：統一處理新增資料列。

4. 命令命名決策（你提的 add_{{SYNC_TABLES}}）
   1. 建議採「主命令 + 別名」：
      - 主命令：`addRecord`
      - 參數：`table: inbox | task_pool | scheduled | micro_tasks | resource`
      - 別名：`add_inbox`, `add_task_pool`, `add_scheduled`, `add_micro_tasks`, `add_resource`
   2. 理由：
      - 對使用者可讀性高（別名）
      - 對程式維護成本低（實際只維護一支 `executeAddRecord()`）
      - 未來新增表時，只要更新 registry，不必複製多份執行程式
   3. 備註：`log` 建議先不提供 `add_log`，避免 macro 被濫用造成大量系統噪音。

### Stage 5 - UI（2-3 天）

1. 檔案：`pwa/src/components/TabNavigation.tsx`
   1. 動作：新增 Macro 頁籤入口。

2. 新增檔案：`pwa/src/components/tables/MacroTable.tsx`
   1. 動作：桌機 table + 手機卡片，提供 CRUD + Run。

3. 新增檔案：`pwa/src/components/macro/MacroEditor.tsx`
   1. 動作：name/description/commands（YAML）編輯與即時驗證。

4. 新增檔案：`pwa/src/components/macro/MacroRunnerPanel.tsx`
   1. 動作：顯示目前步驟、錯誤訊息、retry/skip/abort。

5. 新增檔案：`pwa/src/components/macro/MacroHelp.tsx`
   1. 動作：從 `commandRegistry.ts` 自動渲染使用說明與範例。

### Stage 6 - 可觀測性與 Debug mode（1-2 天）

1. 新增檔案：`pwa/src/utils/logger.ts`
   1. 函式：`logInfo()`, `logWarn()`, `logError()`
   2. 動作：依 debug mode 決定是否寫入 `app_log`。

2. 新增檔案：`pwa/src/components/debug/DebugLogPage.tsx`
   1. 動作：查看/篩選/清除/匯出錯誤歷史。

3. 檔案：`pwa/src/store/appStore.ts`
   1. 動作：新增 debug mode 設定與持久化。

### Stage 7 - 測試與驗收（1-2 天）

1. 新增測試：parser/interpolate/executor/lock/logger
2. 測試重點：
   1. retry/skip/abort 流程
   2. 多分頁鎖
   3. 中斷後恢復
   4. macro 同步至 GAS
   5. LWW 衝突覆蓋與可追溯性

### 先做與後做（建議）

1. 先做（可立即上線 MVP）
   1. Stage 1, 2, 3, 4, 5（核心功能）
2. 後做（強化）
   1. Stage 6, 7（觀測與品質）

### 小結：關於 add_{{SYNC_TABLES}}

1. 你的想法很好，能提升可擴充性。
2. 實作上建議採 `addRecord + add_xxx alias`，兼顧可讀性與維護性。
3. 白名單來源請直接共用 `SYNC_TABLES`（或從其衍生子集合），避免雙重維護。

# Journal

## [2026-02-16] 提交到 Github 看看，這PWA能否運作

## [2026-02-16] 能用 iPhone add inbox 了

## [2026-02-16] 準備上 Github Page 請看 [discussion](Discussion\8th_disucssion.md#方案-agithub-actions-自動部署推薦)

## [2026-02-15] 已經完成第一個 inbox 編輯 (update/delete/new)

1. Github Copilot 將他寫到 [App.tsx](pwa\src\App.tsx) 裡面，先實驗，已經通過
2. 執行的話，得先 `cd pwa; npm run dev`

## [2026-02-15] 先安上串到 Google Sheets API adapter 的函數，但尚未實作

寫在 [sheetsAdapter.ts](pwa\src\db\sheetsAdapter.ts)

## [2026-02-12] Dexie 已經進來，尚未確認

1. 在 [sync.ts](pwa\src\db\sync.ts), [schema.ts](pwa\src\db\schema.ts) 與 [changeLog.ts](pwa\src\db\changeLog.ts)
2. Dexie 要使用 `import { Dexie, type Table } from 'dexie'` 而非 `import Dexie, {type Table } from 'dexie'`
3. 若某個檔案同時有 .ts 與 .js，他會記得 js 那個，就算刪除該.js檔案。所以，後來我就使用改檔名，等都改完後，就把VSCode關閉，再打開。再改回原來檔名，問題似乎就解決了。

## [2026-02-12] 準備處理 Dexie

## [2026-02-12] 對 Micro_Tasks 加點修正

[ ] 應該還有身心健康的log 與 Dashboard 才對，邏輯有一些些不同

## [2026-01-28] 加入可以加入 scheduled task 的API，若可以，順便把 iOS 的部分做出來

1. [handleAddScheduledTask](gas\src\Logic.js)
2. [addToScheduledTasks](gas/src/SheetsService.js)
3. [Cron得使用legacyMode:false](gas\src\Utils.js)

## [2026-01-27] 做些更新

1. [Logic.js](gas\src\Logic.js) 的 handleInterrupt 改為直接呼叫 handleEnd 來設定
2. [Utils.js](gas\src\Utils.js) 的 calculateCandidates 的 title 給他多告知 task 已經花的時間。

## [2026-01-25] 準備上到 GitHub

## [2026-01-25] 修正 Scheduled 裡面若沒有 cron_expr 在 END 時，要把 NextRun 給清掉，並且改為 WAITING

[Logic.js](gas\src\Logic.js) 的 `handleEnd` 宣告此要求。

[ ] TODO TODO TODO [加強提醒功能建議](./Discussion/6th_discussion.md#2026-01-25-ychsue-我目前是使用-start-時他會設定一個30分鐘的鬧鐘提醒我該起來了還是您有更好的建議)

   - 值得做，現在先不要。

## [2026-01-24] 修正 handleEnd gas 讀入日期字串可能會自動轉換為日期，導致比對錯誤的問題

目前只在 [SheetsService.js](gas\src\SheetsService.js) 的 `updateTaskInPool` 有看到，可能還有。

## [2026-01-24] 修改 handleEnd 好使他可以設定對的 NextRun (應該吧，再試用看看)

1. [Logic.js](gas\src\Logic.js) 因為由 crontab string 所得的日期有可能小於等於原本的 NextRun，照理講，我們提前執行他，應該要把NextRun 設到oldNextRun的後面才對。

## [2026-01-24] 修正 Query_Option 使之運作正常

1. [checkTimers.js](gas\src\checkTimers.js) 在GAS，放到時間驅動裡面呼叫， input arguments 似乎並非 `Null`，所以，只好以檢查是否有使用到的函數來辦理。
2. [Logic.js](gas\src\Logic.js) 提供 `handleQueryOptions` API，原理乃是由 `Selection_Cache` 抽取PENDING中的Task。
3. [SheetsService.js](gas\src\SheetsService.js) 在 `updateSelectionCache` 裡，將有用的資訊放入 `Selection_Cache` 裡面。
4. [Utils.js](gas\src\Utils.js) `calculateCandidates` 裡面多加入抽取出哪些 Task 當日所花時數要歸零，還有 Tasks 當日總花費時數
5. iOS 學到的教訓：
   1. 列表 (list) 吃 `string[]`，點選後，會傳回被點的 `string`，所以，得把 `options:{key:{....}}`，然後 `keys:[...]` 這兩個這樣子餵給 `iOS捷徑(Shortcuts)` 才行。
   2. 可以多次設定相同變數，這在 `Query_Options` 被點 list 後，執行 `開始新的 Task` 很重要，因為我們希望無論獨立執行或被列表調用 `開始新的Task` ，都能夠設定 `taskId`
   3. 傳出參數後，被執行的捷徑怎麼接收這參數呢？要使用 `設定變數`，然後它的來源要選 `捷徑輸入`，這樣就可以了。

## [2026-01-23] 準備 Query_Option 的前置作業，即 Selection_Cache 的填入

1. [checkTimers.js](gas\src\checkTimers.js) 放到 GAS 的每15分鐘 trigger
2. [Config.js](gas\src\Config.js) 統一 `TASK_STATUS`，這樣，才有辦法做決定順序用
3. [Logic.js](gas\src\Logic.js) 修正 `handleEnd` 的 `TASK_STATUS` 的輸出。
4. [SheetsService.js](gas\src\SheetsService.js) 填入 `Selection_Cache`
5. [Utils.js](gas\src\Utils.js) 考慮了 score 的計算，而 `Task_Pool` 的部分，根據Google AI 的建議，給予
   1. **基礎權重 (Priority)**：任務本身的重要性。
   2. **配額加權 (Quota Factor)**：根據剩餘可用時間調整。
   3. **飢餓加權 (Starvation/Recency)**：根據多久沒跑了來加分（避免某些任務被無限期擱置）。

## [2026-01-22] 在 iPhone 捷徑 上的 `結束Task` 加入自動加入行事曆與計時的功能

也將 [iPhone 捷徑](ios\Shortcuts_Setup.md) 也加進來，下一個看看用 Jelly 或者還是直接在 iPhone 上寫吧。

## [2026-01-21] 修正 Scheduled 的一些bug

這部份透過在 GAS 上寫 [test.js](gas\src\test.js)，然後使用 `偵錯` 就可以找出哪裡寫錯。

## [2026-01-21] 改良 Scheduled 的 NextRun 的邏輯

1. NextRun 由 `End` 的時候根據 `cron_expr` 或者 `callback`+`after_task`設定，
2. 直接下載 [croner.min.js](./gas/src/croner.min.js) 來使用，此專案為 [Croner](https://github.com/Hexagon/croner/tree/master)
3. 修改 [Logic.js](./gas/src/Logic.js) 的 handleEnd 好讓他可以 handle NextRun
4. [SheetsService.js](gas\src\SheetsService.js) 多了 `_sheetCache` ，這樣，就不會重複抓同一個 sheets 了
5. [utils.js](./gas/src/Utils.js) 有
   1. `parseToMinutes(takesTime)` 來將 `30m`, `1h`....變成分鐘數
   2. `getNextOccurrence(cronExpr, baseDate = new Date())` 則會將 crontab 字串變成一個 NextRun

## [2026-01-20] 加入 Scheduled Task 的邏輯

## [2026-01-20] 加入 Interrupt 的邏輯，修正小錯誤

## [2026-01-18] 準備加入 Inbox 的部分

## [2026-01-17] 先完成 Start 與 End 的部分

## [2026-01-16] Grok的幫助下，可以使用 `export` 而不會上傳到GAS 與 Copilot 幫忙寫的GAS 程式

可以做 Jest 測試

## [2026-01-15] 加入 Google Sheets 與簡易 GAS程式

[將Gemini的輸出轉為Markdown](https://safemarkdown.com/)

### Sheets Structure

1. **Dashboard**: Current system state & metrics. (看)
2. **Event_Log**: Raw telemetry (Timestamp, Action, Task). (分析用)
3. **Task_Pool**: Active projects & MacroTasks.
4. **Micro_Tasks**: Fast execution items (< 2 mins).
5. **Periodic_Config**: Rules for recurring events.
6. **Async_Await**: Callbacks & external dependency tracking. (如洗衣服)

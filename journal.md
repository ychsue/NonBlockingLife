# Journal

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

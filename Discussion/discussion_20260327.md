# 新增欄位

## [2026-03-27] ychsue 我在日常使用的時候，由於我預設一START一個任務，就讓iPhone透過捷徑計時30分鐘，但是，有的我明顯不需要她計時，例如檢查 Inbox，一下子其實就差不多完成了。

現在面臨一個問題，若我對`TaskPool`, `Scheduled` 與 `MicroTasks` 都增加一個欄位可能叫 focus_time，套用 [ScheduledTable](/pwa\src\components\tables\ScheduledTable.tsx) 裡面時間欄位的作法，然後傳遞給iPhone Shortcuts 的資訊裡面多這個訊息，若沒有這欄位，就預設30分鐘，這樣，我就可以在 iPhone 裡面自動由這個參數來決定要不要計時了。
可是，像我已經在使用她的手機裡面的 db 結構顯然改變了，還有 sync 的問題，請問您有甚麼建議呢？

### Github Copilot 的回覆 [2026-03-27]

* 決策：新增 focusTime（camelCase）到 TaskPool、Scheduled、MicroTasks。
* 語意：focusTime=0 代表不計時；focusTime>0 代表指定分鐘；缺值預設 30。
* 相容策略：focusTime 為非索引 optional 欄位，不做 Dexie version 升級，避免舊手機資料庫破壞。
* 實作重點：在 START 流程輸出給 iPhone Shortcut 前，依任務 focusTime 覆蓋全域 timerMinutes。
* 風險控管：sync/change_log 採 patch 透傳，新增欄位不影響既有流程；再補測試驗證 0/正數/缺值三情境。

### 實作狀態 [2026-03-27]

* 已在 `TaskPoolItem`, `ScheduledItem`, `MicroTaskItem` 新增 optional 欄位 `focusTime?: number`。
* 已在 Task Pool / Scheduled / Micro Tasks 三張表加入 Focus Time 欄位（桌面欄位 + 手機 Edit Dialog）。
* 已在 START 流程加入規則：`focusTime=0` 不啟動計時器；`focusTime>0` 用該分鐘；缺值 fallback 30。
* 已新增測試 `pwa/src/utils/__tests__/taskFlow.test.ts` 驗證上述三種行為。

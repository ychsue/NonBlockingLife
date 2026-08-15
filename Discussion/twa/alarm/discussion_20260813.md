# 讓這系統可以針對 ScheduledItems 進行 Alarm 的設定

## [2026-08-13] ychsue 需求背景

由於Android 的 intent ACTION_SET_ALARM 只能設定hh:mm，因此，

### 前端
我想說每當有檢查 candidates 時，就順便檢查 ScheduledItems 是否有 nextRun 與 alarmTime，格式長 `1d,2h,0m` 以 `,` 分隔，每個元素使用 [candidates 的 parseToMinutes](/pwa\src\utils\candidateUtils.ts)來轉換成分鐘，
若發現 nextRun - alarmTime 是在從現在起24小時內，就將他丟進 queue 裡面(無須sync到網路上)，這個 queue 就用一個 table 可能叫 `alarm_queue` 的 dexie table 來存放，所以這 table 的欄位
```ts
{
  ++id: number; // auto increment
  taskId: string; // ScheduledItem 的 id
  alarmAt: string; // 完整 ISO 字串，這是用來設定 Alarm 的時間
  setted: boolean; // 是否已經設定過 Alarm
  [taskId+alarmAt]: string; // 這個是用來做 unique index 的，避免同一個 ScheduledItem 設定多次 Alarm

  //其他欄位，視需要而加入
  createdAt: Date.now();
  ...
}
```

上面是寫入queue，接著是要有個機制去檢查這個 queue，若發現有 alarmAt 已經過時了，就把它移除。然後`setted` 為 false 的，就去設定 Alarm(要呼叫JAVA端)，設定成功後就把 `setted` 改成 true。

### JAVA 端
我本來在 JAVA 端是想要使用 schema 的方式來設定 Alarm，也就所附的兩個 .backup 檔案的寫法，
但是，實際使用時發現有以下幾個問題：
1. 若有多個 Clock App，則會跳出選擇 App 的畫面，這樣就無法自動把一整批 Alarm 設定完成。
2. 由於不確定設定一個Alarm 需要多少時間，因此，前端PWA的呼叫就必須隔時間，不然應該會出阻塞等問題。

所以，想說可否改用 [此文章](https://developer.chrome.com/docs/android/post-message-twa?hl=zh-tw) 所講的 PostMessage 的方法，這樣，應該我也可以直接批次處理後，再回傳給前端，對嗎？

### UAT測試

請在 More/Experimental/Alarm 放一個測試按鈕，`測試Alarm`讓我可以在前端測試 Alarm 功能是否能正常在手機上設定鬧鐘。

### 先討論

請問您覺得有沒有更好的方案呢？或者我漏講了些甚麼嗎？謝謝。

---

## 記錄簿（簡易版，2026-08-13）

- 這個需求的核心不是「單一 alarmTime」，而是「多個提醒點」：例如 `1d,2h,0` 表示在 `nextRun` 之前會有多個提醒節點，應該轉成 `alarmOffsets`（例如 `[1440, 120, 0]`）再計算真實 `alarmAt`。
- `alarm_queue` 應該只保留「待處理 / pending」的提醒項目，當 `alarmAt` 已過期或已被觸發後，應立即清理，避免浪費本地儲存空間。
- `AlarmClock.ACTION_SET_ALARM` 比較適合單次手動測試或使用者明確操作，不適合用來批次設定大量提醒；批次排程更適合 `AlarmManager` + `Notification`。
- `startActivity(alarmIntent)` 不是同步等待 API，它只是把 intent 交給系統；即使設定成功與否，TWA app 也不一定能立即知道結果，且容易彈出 Chooser。
- 若仍想降低鬧鐘選擇器干擾，可用 `alarmIntent.setPackage(packageName)` 把 intent 指向特定 Clock App；但這屬於「優先指定 app」而非「批次 scheduler」的做法。
- 若使用 `AlarmManager`，不需要在每個 alarm 之間手動 `sleep/delay`；系統會在指定時間觸發，不需要額外在前端逐個做延遲。
- 若使用 `ACTION_SET_ALARM` 路徑，才需要視情況加一些短暫 delay，避免連續觸發時造成 UI/intent 佇列壅塞。
- UAT 可保留 `none / notification / system` 三種測試模式，方便比對：不提醒、Notification 提醒、系統鬧鐘提醒。
- 最終建議：`Notification` 作為主流程，`System Alarm` 作為進階選項，必要時保留 `Test Alarm` 入口來驗證實際手機行為。

## 實作分階段（建議）

### Phase 1：本地資料與 offset parser
- [x] 新增 `alarm_queue` Dexie table。
- [x] 加入 `alarmOffsets` 或 `reminderOffsets` 欄位，支援格式如 `1d,2h,0m`、`1d,2h,0`。
- [x] 實作 parser：將 offset 字串轉成數值分鐘陣列，並轉成 `alarmAt` ISO timestamp。
- [x] 完成去重邏輯：`taskId + alarmAt` 作為 unique key。
- [x] 先不做 Android native scheduling，先確認前端 queue 正常生效。

### Phase 2：Notification 主流程
- [ ] Android native 端新增 notification schedule / trigger flow。
- [x] 以 `Notification` 作為預設提醒方式（PWA-side helper 已就緒，且可在實機測試）。
- [x] 當 `alarmAt` 到達時，發送 notification，並標記 `triggered` / `dismissed`（觸發 helper + queue UI 已補上，待接到完整排程器）。
- [x] 完成 `alarm_queue` 的過期清理與 UI 可見/可刪除（現在可在 Experimental 面板檢視 pending queue 並手動 trigger）。
- [ ] 先驗證最穩定的使用者體驗。

### Phase 3：System Alarm 進階模式
- [ ] 保留 `preferredAlarmAppPackage` / `resetPreferredAlarmApp` 流程。
- [ ] 使用者可選擇「總是使用此 app」，避免每次 chooser 干擾。
- [ ] 只在明確啟用 `system` 模式時做 `ACTION_SET_ALARM`。
- [ ] 補上 fallback：若 preferred app 不存在，就重新掃描並提示使用者重選。

### Phase 4：UAT / 測試工具
- [x] 在 More/Experimental/Alarm 增加 `Test Alarm`。
- [x] 提供 `none / notification / system` 三個模式讓使用者測試。
- [ ] 記錄是否真的如預期觸發，確認明確的失敗與成功條件。

### Phase 5：產品化收斂
- [ ] 再逐步評估：是否要保留 Clock App 顯示功能、是否要新增「停用某個提醒」與「重新排程」功能。
- [ ] 先以 notification 為主，再根據 UAT 結果決定 system alarm 是否要作為預設選項。

這樣拆成多個階段後，不會一次把所有 Android、Dexie、UI、UAT、系統警報流程一起扛上來，風險更低，也更容易回退。

---

## [2026-08-14] ychsue 需求背景補充

建議把 MorePage 裡面的 Alarm queue 區段變成一個 .tsx ，
其二， refresh 應該考量到時間與修改狀態。
其三，每個 Alarm queue 的 item 功能太少，無法自訂一些東西，不用全顯示，
其四，我後來覺得，其實應該在進入App.tsx 與 ScheduledTable.tsx 時 (useEffect(...., [])) 應該就可以了，所以，
其五，Refresh 也許直接以放進 useEffect 裡面執行之物即可，對嗎？
其六，所以是先把前端打造完， Android 端當成 Edge 或 API 或 PostMessage 來看待，unit測試時 Mock 他們，UAT前再實作，對嗎？

---

## [2026-08-15] 最終設計結論（結論型整理）

### 1. queue sync 與 queue state 必須分開
- `scheduled` 是 source of truth。
- `alarm_queue` 是 derived queue + lifecycle history，不是單純快照。
- `syncAlarmQueueFromScheduled()` 應該只產生「同步計畫」，不能直接 `clear()` 或 `bulkPut(merged)`，否則會把 `dismissed` / `triggered` / `expired` 混淆掉。

### 2. 不要用 `clear()`，因為這會洗掉使用者已處理過的狀態
- `dismissed` 表示使用者已關閉提醒
- `triggered` 表示已真的觸發
- `expired` 表示這個提醒已失效
- 這些狀態都不是「可任意刪除」的 temporary 資料

### 3. `sync` 應該輸出 plan：toAdd / toUpdate / toDelete
- `toAdd`: 新增的 desired alarm entries
- `toUpdate`: 同 `dedupeKey` 但資料已更新
- `toDelete`: 已從 schedule 消失，或已過期且不再需要保留的紀錄
- `keep`: 不需動作，保留在 DB

### 4. 真正修改 DB 應該由 watcher 負責
- [pwa/src/hooks/useAlarmQueueWatcher.ts](pwa/src/hooks/useAlarmQueueWatcher.ts) 應該接管 `applySyncPlan(plan)`
- watcher 會執行 `bulkPut` / `bulkDelete` / `update`
- Android adapter / PostMessage / native edge 也應該在 watcher 或 action layer 上被呼叫，而不是混進 sync 側計算邏輯

### 5. 狀態變更與同步計算分流
- `syncAlarmQueueFromScheduled()`：以 `scheduled` 為基準，產生 desired queue
- `triggerItem()`：`pending -> triggered`
- `dismissItem()`：`pending -> dismissed`
- `expireItem()`：`pending -> expired`（在到期檢查中發生）
- `pruneTerminalItems()`：刪除超出 TTL 的 `triggered/dismissed/expired`

### 6. Android 端仍然是 edge / adapter，不是 scheduler 核心
- 前端先把 local queue 做完整
- Android 端在 UAT 前可當作 optional adapter / PostMessage bridge
- unit test 可 mock 這些 native call，避免前端依賴系統環境

## 重點摘要

- 這個設計最終應該是「local scheduler first, native Android second」
- `alarm_queue` 不應該被整張表重建；應該是增量同步 + TTL 清理
- `syncAlarmQueueFromScheduled()` 應該是 pure planner，不寫資料庫
- `watcher` 才是改 DB 和透過 adapter 溝通的責任區
- `dismissed/triggered/expired` 是生命週期狀態，不應被 `clear()` 一次抹掉
- `pending` 仍然是當前有效 queue 的核心資料

這樣的拆法讓前端可先實作完整，Android 只在最後階段接到邊緣 API，而不會破壞主要 scheduling flow。
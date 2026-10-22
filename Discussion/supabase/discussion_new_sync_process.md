# 新的 Supabase 函數與整個sync機制討論

## [2026-10-20] ychsue 討論新機制
1. 我在Gemini 的幫忙下，也在Supabase 測試過， [initialize.sql](/pwa\src\db\supabase\initialize.sql) 中的 get_all_sync_tables 函數可以自動抓取所有有 synced_at 欄位的資料表，並排除 log 表。這樣就可以使用 rpc 一次全抓。
2. 輸出結構與 [GAS](/pwa\src\gas\程式碼.js) 的 pullChanges 不一樣，這裡是 { "table_name": [ ... ] } 的形式，每個資料表對應一個陣列，包含所有 synced_at 大於目標時間的資料。
3. 我仔細想了 [syncUtils.ts](/pwa\src\utils\syncUtils.ts) 裡面的 sync() 的邏輯，我覺得有問題，因為他先 push 後再 pull，怕會不小心壓掉別的其實較晚 updated的資料。
4. 我覺得應該要先 pull，再 merge 本地的PendingChangeLogs，看是丟棄，還是根據updatedAt看怎麼結合、更新本地端的tables 後，再 push。
    - 比如我的 task_pool 在 [SelectionCacheTable.tsx](/pwa\src\components\tables\SelectionCacheTable.tsx) 中會在一天的開始，自動計算 restPoolTaskIds，然後將 spentTodayMins 與 usedTodayCount 直接歸0，像這個，就得很小心，因為很可能這個就覆蓋到別的裝置明明已經在執行的了。
5. 這裡有兩個 Manager， [SupabaseSyncManager.ts](/pwa\src\utils\SupabaseSyncManager.ts) 與 [GASSyncManager.ts](/pwa\src\utils\GASSyncManager.ts)，分別負責與 Supabase 同步以及GAS的同步。
請問您有沒有甚麼建議？

## [2026-10-20] Copilot (GPT-6 Luna) 的回答 01
我會先對照討論文件與目前同步流程的實作，確認方案在資料庫與 GAS/PWA 兩邊是否能一致落地，再給您具體建議。

目前看得到的核心風險不只是「先 pull 或先 push」：現在 pull 會直接覆寫本機資料，而且 Supabase 的 `synced_at` 是接收時間、未必代表資料本身的新舊。我要再核對 GAS 與本機變更日誌的語意，避免建議只適用其中一條同步路徑。

我會建議改成「**先取得遠端變更、再協調本機未同步變更、最後推送**」，但**只把 `push → pull` 換成 `pull → push` 還不夠**。現在真正的風險是兩邊都可能無條件覆寫：

- Supabase 的 `pull` 會直接 `put` 或刪除本機資料，沒有先檢查該筆是否有 pending change。
- GAS 的 `mergeRemoteChange` 也會直接寫入本機。
- Supabase push 會把本機整筆記錄送上去；所以像 `task_pool` 的每日歸零，即使只是更新兩個欄位，也可能把另一台裝置較新的其他欄位一起蓋掉。
- 單靠 `updatedAt` 判斷勝負不太可靠：不同裝置的時鐘可能不一致，而且「較晚寫入」不一定代表資料語意上該勝出。

### 建議的同步流程

1. **拉取遠端變更，但先不要直接套用。** 同時保留同步開始時的 pending change 清單。
2. **以「資料表＋主鍵」逐筆協調。**
   - 本機沒有 pending 變更：套用遠端資料。
   - 本機有 pending 變更：保留本機變更，不要讓 pull 直接覆蓋；若只是不同欄位的 patch，可以合併，若衝突在同一欄位則依資料類型決定規則。
3. **推送協調後的變更。** 推送時帶上 `operationId` 與「修改時依據的遠端版本」；伺服器確認版本仍符合才寫入，否則回傳衝突，重新拉取並協調。
4. **只有在遠端資料完整收到且成功套用後，才更新同步游標。** 若中途失敗，不要把游標前推，避免漏資料。

### `task_pool` 的每日歸零要另外處理

`目前的歸零邏輯` 是更新 `spentTodayMins` 和 `usedTodayCount`。這類「每日狀態重置」不適合和一般欄位更新一樣整筆採最後寫入者勝出。比較穩妥的做法是記錄統計所屬日期，例如 `statsDate`；讀取時發現日期已變，再依該日期規則重置。若這些數值代表多裝置共同累計，則要改成可合併的增量操作，而不是各裝置各自上傳一個總數。

### 對目前 Supabase RPC 的看法

`get_all_sync_tables` 可以減少逐表查詢，但它目前只回傳符合條件的資料，沒有明確提供「這次拉取的下一個游標」。而且 Supabase push 會由用戶端傳入 `synced_at`，所以它不是可靠的伺服器端版本號。建議 RPC 回傳**資料與下一個游標**，並讓伺服器產生同步版本／時間；若無法保證游標單調且不漏資料，則採用重疊查詢區間並用 `operationId` 去重。

另外，建議讓 `syncUtils.ts` 負責共用的同步協調流程，Supabase 與 GAS 管理器只負責各自的拉取、推送傳輸。這樣兩條同步路徑才不會各自長出不同的衝突規則。

**總結：先 pull 是好的方向，但核心是「pull 不可直接覆蓋有 pending 的本機資料」以及「push 要有版本檢查」。** 我會先實作共用的逐筆協調流程，再處理 `task_pool` 的每日狀態語意，最後才接上 RPC 批次拉取。

---

## [2026-10-20] ychsue 補充說明
原本在 Supabase 是使用
```sql
  synced_at BIGINT DEFAULT (extract(epoch from now())::bigint * 1000)
```
可是我發現他給的時間怪怪的，導致更新得等好一陣子再傳送才會正常，所以，最後才由PWA來給。是因為我使用 BIGINT 而非 timestamp造成的問題嗎？

## [2026-10-20] Copilot (GPT-6 Luna) 的回答 02
不是 `BIGINT` 本身的問題。Unix epoch 毫秒用 `BIGINT` 儲存很常見，重要的是寫入與比較都使用同一單位（毫秒）。

- `extract(epoch from now())::bigint * 1000` 先把秒數轉成整數，再乘 1000，精度只有秒；`now()` 代表交易開始時間。建議若要由資料庫產生毫秒時間，使用 `floor(extract(epoch from clock_timestamp()) * 1000)::bigint`。
- `DEFAULT` 只在寫入時未提供 `synced_at` 才會套用；目前 PWA push 已明確傳入 `synced_at`，所以預設值不會生效。
- 增量同步以 `synced_at > lastSync` 查詢時，PWA 與資料庫的時鐘偏差可能令游標超前，造成新資料暫時拉不到。應避免混用裝置時鐘作為同步游標；由伺服器產生游標，並在成功套用資料後才保存。必要時用重疊區間拉取並以 `operation_id` 去重。

因此，改用 `timestamp` 不會自動解決同步延遲；先確認時間單位、寫入時是否真的使用 DB default，以及 `lastSync` 與 `synced_at` 的時鐘來源是否一致。

---

## [2026-10-20] ychsue 補充說明 02
對了，可以先不處理GAS，或只簡單的處理一下，因為還留著GAS是因為可能有人使用。
然後，您說的有理，synced_at 應該由伺服器產生，那們，就得由伺服器傳回最新的 synced_at 給 PWA，對吧？
那麼，不就意味著 PWA push 到 supabase 後，supabase 要回傳 synced_at 給 PWA，讓 PWA 更新本地的同步游標。對嗎？

## [2026-10-20] Copilot (GPT-6 Luna) 的回答 03
GAS 可以先不改；新流程先限定在 Supabase，避免影響仍在使用 GAS 的用戶。若共用 `syncUtils.ts` 有改動，需保留 GAS 原本行為或明確分流。

伺服器產生 `synced_at` 後，push 回應可以回傳各筆實際寫入的 `synced_at`，供 PWA 確認寫入並更新本地記錄；但**不應直接用 push 回傳值更新全域拉取游標**。該游標代表「PWA 已完整收到並套用遠端變更到哪裡」，所以應由 pull 回應提供，並且只在資料成功套用後保存。

否則，假設本機 push 得到游標時間 200，但另一裝置在時間 100 的變更尚未被本機 pull，將游標設成 200 後用 `synced_at > 200` 拉取，就會漏掉那筆變更。建議 pull 回傳資料及本次同步的伺服器端 watermark；若以時間戳做游標，還要處理同毫秒及並行寫入的邊界（例如重疊拉取並以 `operation_id` 去重，或改用可靠的遞增變更序號）。

---

## [2026-10-20] ychsue 補充說明 03
那麼，您建議現在應該怎麼改好呢？有哪些程式我要到 supabase 去執行？
比如可能連 push 到 supabase 也該有個 rpc 函數對應？需要增加欄位嗎？

## [2026-10-20] Copilot (GPT-6 Luna) 的回答 04

建議把 **Supabase 同步改成「伺服器版本＋變更序號」**，而不是繼續用 `synced_at` 當增量游標。GAS 先維持原樣；這次只改 Supabase 路徑。

### 建議的流程

```text
PWA push → Supabase RPC 驗證版本、寫入資料與變更紀錄 → 回傳寫入結果
PWA pull → Supabase RPC 回傳新變更與游標 → PWA 套用成功後保存游標
```

**Push 回傳的資料版本，不等於全域 pull 游標。** Push 用來確認哪些寫入成功、取得該筆新的伺服器版本；全域游標則由 pull 回傳，只有本機成功套用變更後才保存。

### Supabase 建議新增或調整

1. **新增 `sync_changes` 變更表**  
   保存每筆已接受變更的伺服器序號、資料表、主鍵、操作 ID、資料快照及是否刪除。PWA 以序號拉取變更，不再依賴各裝置的時鐘。

2. **為同步資料列增加 `server_version`**  
   每次伺服器接受更新就遞增。Push 帶上本機所依據的版本；版本已變更時，RPC 回報衝突與伺服器資料，不要靜默覆蓋。`log` 仍維持單向推送，不納入這套 pull 流程。

3. **建立兩個 RPC**
   - `push_sync_changes(...)`：在同一個交易中檢查版本、寫入資料、增加版本、記錄變更，並回傳每筆成功或衝突結果。
   - `pull_sync_changes(after_cursor)`：依序回傳游標後的變更，以及這次回應可確認的 `next_cursor`。

   為了讓游標不漏掉同時寫入的變更，序號的配置與 pull watermark 必須有明確的交易／鎖定設計；不能只假設 `BIGINT IDENTITY` 的序號就是交易提交順序。

4. **保留 `synced_at`，但先不再用它當游標**  
   它可作為除錯資訊；若保留，應由資料庫產生，PWA 不要傳入。也不用為了同步問題單純把它改成 `timestamp`。

### 要到 Supabase 執行什麼？

建議整理成**一份新的 migration SQL**，一次建立變更表、增加版本欄位、為現有資料建立初始同步狀態，並建立上述兩個 RPC。現有資料要做初始回填；PWA 切換新游標時也要有初始化／重拉策略，不能沿用舊的時間游標。

切換前先在測試專案驗證 RPC 與衝突流程。切換後，再移除或收緊目前允許 anon 直接寫入資料表的政策，否則用戶端仍可繞過 RPC 的版本檢查。RPC 需限制可操作的資料表，並設定安全的 `search_path`；PWA 不應放 service-role key。

### PWA 需要配合的部分

`SupabaseSyncManager.ts` 要改成呼叫這兩個 RPC；本機也要保存每筆資料的伺服器版本和新的 pull 游標。Push 應避免把舊的整筆資料無條件 upsert；遇到衝突時，保留 pending 變更並依規則重合併或提示處理。

我會按這個順序實作：先做 Supabase SQL migration 與 RPC，再改 PWA 同步管理器及本機版本記錄，最後保留 GAS 現有流程不動。

## [2026-10-20] ychsue 補充說明 04
有的人是新使用，有的是舊使用者，這兩者要執行相同的 SQL 嗎？

## [2026-10-20] Copilot (GPT-6 Luna) 的回答 05
新增 `pwa/src/db/supabase/sync_rpc_migration.sql` 作為同步協定升級腳本：
- 新 Supabase 專案：先執行 `initialize.sql` 建立資料表，再執行 `sync_rpc_migration.sql`。
- 已有資料的專案：只執行 `sync_rpc_migration.sql`；它會增加版本欄位並為既有資料建立初始變更紀錄。
- 兩者最後都要使用支援 RPC 的新版 PWA。Migration 會撤銷 anon/authenticated 對同步資料表的直接寫入權限；因此不要讓舊版 Supabase PWA 繼續同步。GAS 使用者不需切換到 Supabase RPC 流程。

目前實作先保留 GAS 路徑；Supabase 用 RPC push/pull，首次 pull 會從游標 0 載入伺服器既有資料。執行正式 migration 前，請先在測試 Supabase 專案驗證並備份資料。
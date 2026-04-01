# 新增 ResourceTable 如何

由於 Inbox 有可能變成 Resource，不過，這個 App 好像沒有 Resource 的部分，因為resource 通常可能是網頁或某個外部資源，這個APP沒有想做這一塊。不過，我是在想說，是否多個 db.resource(或甚麼的)，欄位可能跟 Inbox很像，然後UI類似MicroTasksTable 。不過，多一個 category 欄位，好搜尋。(所以，搜尋的部分很像 LogTable)，然後，藉由他的 URL 連到對應的外部的真實resource，您覺得呢？還是您有更好的想法？

此外，您覺得其他表也加入搜尋功能好嗎？順便可以選擇是否隱藏 Done? 還有，搜尋功能要否變成當trim後看見空白，就把他當作or 的條件搜尋？（例如：搜尋 "abc 123"，就會搜尋同時包含 "abc" 或者 "123" 的項目)
這樣如何？

---

## 實作結果（2026-04-01）

### 已完成的工作

#### 1. 新增 Resource 表（`pwa/src/db/schema.ts`）

- 新增 `ResourceItem` 介面，欄位：`taskId, title, category, receivedAt, url, note, updatedAt`
- `taskId` 以 `R` 為前綴（`Utils.generateId('R')`）
- Dexie IndexedDB 新增 `resource` 表（索引：`taskId, category, receivedAt, title`）
- 同時加入 `TASK_PREFIX.resource = 'R'`

#### 2. 新增 ResourceTable 元件（`pwa/src/components/tables/ResourceTable.tsx`）

- UI 設計同 MicroTasksTable：移動端卡片、桌面端表格
- 欄位：taskId（隱藏）、Title、Category、Received、Note、URL（附「開啟」按鈕）
- 支援搜尋（欄位覆蓋：Title、Category、Note、URL）

#### 3. 搜尋過濾 Hook（`pwa/src/hooks/useSearchFilter.ts`）

- `useSearchFilter`：支援 OR/AND 切換，依賴穩定化（`fieldSignature` string），避免 inline array 導致 useMemo 每次失效的 re-render 風暴
- `useHideDone`：過濾掉 `status === 'DONE'` 的項目
- **搜尋邏輯**：query trim 後按空白分割為 keywords；OR 模式匹配任一詞，AND 模式必須全部符合

#### 4. 為 TaskPool、Scheduled、MicroTasks 加入搜尋功能

新增至三個表：

- **搜尋輸入框**（即時過濾）
- **OR/AND 切換按鈕**（藍色 = OR 模式，灰色 = AND 模式）
- **「隱藏 Done」checkbox**

| 表 | 搜尋欄位 |
|---|---|
| TaskPool | Title、Note、Project、URL |
| Scheduled | Title、Note、Callback、URL |
| MicroTasks | Title、URL |
| Resource | Title、Category、Note、URL |

#### 5. GAS 同步（`pwa/src/gas/程式碼.js`）

- `CONFIG.TABLE_SHEETS` 新增 `resource: 'NBL_Resource'`
- 其餘同步邏輯（dimension headers、push/pull）皆為通用邏輯，自動支援新表
- **注意**：需在 Google Sheets 中手動建立 `NBL_Resource` 工作表，並執行一次 `initSheets()` 以初始化欄位標題

### 注意事項

1. **首次使用 Resource 表時需要在 Google Sheets 新增 `NBL_Resource` 工作表**，並在 GAS 管理介面執行 `initSheets()`，否則同步會失敗。

2. **Dexie 版本無需 bump**，因為 `resource` 是全新表，而非修改現有 index。

3. **搜尋 hook 的 inline array 問題**：呼叫端傳入 `searchFields` 時，若直接用陣列字面值（例如 `['title', 'url']`），每次 render 都會建立新參考，導致 `useMemo` 依賴永遠失效而重複計算。修復方式：hook 內部將欄位陣列轉成 `fieldSignature` 字串作為依賴，查詢改追蹤 `query` 和 `isOrMode` 兩個 primitive 值即可。

4. **Resource 目前尚未整合 Inbox → Resource 的移動功能**（類似 Inbox → TaskPool 的 moveRow），若有需要可後續新增。

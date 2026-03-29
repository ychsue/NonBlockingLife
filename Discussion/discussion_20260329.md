# 多 URL 欄位與 如果該欄位有值，就在 [TableCard.tsx](/pwa\src\components\TableCard.tsx) 顯示連結按鈕，讓使用者按該按鈕就會開啟該連結

由於手機上複製貼上網址的體驗不太好，所以我想在 Micro Tasks、TaskPool、Scheduled 與 MicroTasks 裡面新增一個欄位叫做 url，然後在 [TableCard.tsx](/pwa\src\components\tables/TableCard.tsx) 裡面，如果該任務的 url 欄位有值，就顯示一個按鈕，讓使用者按了之後就會開啟該連結，這樣就不用再去複製貼上了。

這顯然要改變目前的 db 結構，除了 TaskPoolItem，其他三個應該都要多加 url?。
然後，另外三個的 Edit Dialog 裡面也要多一個欄位讓使用者輸入 url。
然後，在 [TableCard.tsx](/pwa\src\components\tables/TableCard.tsx) 裡面，如果該任務的 url 欄位有值，就顯示一個按鈕，讓使用者按了之後就會開啟該連結。
然後，我在 [useUrlAction.ts](/pwa\src\hooks\useUrlAction.ts) 原則上應該多一個 `&url=${encodeURIComponent(url)}` 的參數，然後在 iPhone Shortcuts 裡面就可以直接從這個參數裡面拿到 url 來開啟了。
是否這樣就足夠了？

## 2026-03-29 實作結果

- 已補上 Inbox、Scheduled、Micro Tasks 的 `url?: string` 型別，Task Pool 原本已有。
- 已在 Inbox、Scheduled、Micro Tasks、Task Pool 的桌面表格中提供 URL 輸入框，且有值時會顯示「開啟」按鈕。
- 已在四張表的手機版 EditDialog 補上 URL 欄位。
- 已在共用 [TableCard.tsx](/pwa/src/components/TableCard.tsx) 加入連結按鈕；只要該筆資料 `url` 有值且不是 `None`，手機卡片就會顯示「開啟連結」。
- [useUrlAction.ts](/pwa/src/hooks/useUrlAction.ts) 原本就會把 `sheet`、`action` 以外的 query 參數全部寫入 patch，所以如果 Shortcut 端帶上 `&url=${encodeURIComponent(url)}`，前端本來就會接到，不需要再額外為 `url` 寫特殊解析邏輯。
- 目前正式同步用的 GAS 腳本是 [程式碼.js](/pwa/src/gas/程式碼.js)，非 log 資料會整包存進 `payloadJson`，因此 `url` 也會被一起同步，不需要另外修改同步 API。

### 結論

這樣基本上就足夠了。真正需要配合的是 Shortcut 產生連結時要把 `url` 一起帶進 query string。前端這邊現在已經能儲存、編輯、顯示，並在手機卡片上直接開啟連結。

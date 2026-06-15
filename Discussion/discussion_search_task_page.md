# 尋找含有特定文字的 task 的條目

## [2026-06-15] ychsue 目標

1. 希望有個Dialogue，有個輸入文字框，輸入後，就會列出所有包含該文字的 task，可支援Regex。
   1. List 為單選，選擇後，底下會出現兩個按鈕，一個是編輯，另一個是執行(包含中斷目前在跑的 task)，按下後會回到主畫面，並且執行或編輯該 task。
2. 若搜尋後沒半條，那就顯示新增至 TaskPool、Scheduled或MicroTasks (下拉式選單) 的checkbox。
    1. 若 check 為 true，則底下顯示兩個按鈕，分別為新增並編輯和新增並執行。
3. 這個 Dialog 出現的時機，我想就在 interrupt 按下去後，先讓他跳一個確認的popup，裡面就可以問他是要 `取消`, `立即中斷` 還是 `task 搜尋`，如果選 task 搜尋，就跳出上面說的 Dialogue。 `立即中斷` 就原本的邏輯直接中斷目前的 task， `取消` 就不做任何事。

## [2026-06-15] 實作紀錄

### 新增元件

- **`InterruptConfirmDialog.tsx`**：⚡ 按下後的三選一確認彈窗（取消 / 立即中斷 / 搜尋並切換任務），以 props 傳入 callback，不需 appStore 狀態。
- **`TaskSearchDialog.tsx`**：搜尋任務彈窗，支援 Regex；有結果時可選擇單筆後按「編輯」或「執行」；無結果時顯示加入到（Task Pool / Micro Tasks / Scheduled）的 checkbox，勾選後出現「新增並編輯」與「新增並執行」（Scheduled 僅提供「新增並編輯」）。

### 修改現有檔案

- **`store/appStore.ts`**：新增 `showTaskSearchDialog`、`taskSearchInitQuery` 及其 setter，供 `useUrlAction` 跨模組使用。
- **`SelectionCacheTable.tsx`**：⚡ 按鈕改為開啟 `InterruptConfirmDialog`（取代原 `window.confirm`）；`handleDialogState` 加入互斥判斷，確保 `InterruptConfirmDialog` 或 `TaskSearchDialog` 出現時 native endDialog 不會同時彈出；底部渲染兩個新 dialog。
- **`useUrlAction.ts`**：新增 `action=search&query=xxx` URL action，導航到 selection_cache 頁並自動帶入搜尋字串開啟 `TaskSearchDialog`。
- **`i18n/en.ts`、`zh-TW.ts`、`ja.ts`**：新增 `interrupt.confirm.*` 與 `taskSearch.*` 共 14 個翻譯 key。

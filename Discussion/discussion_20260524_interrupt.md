# 處理Interrupt 的改良

## [2026-05-24] ychsue 我想要在 #file:taskFlow.ts 裡面的endTask 在處理 interrupt 時，當結束前一個正在跑的task 時，我覺得他們的status 改為都是 INTERRUPTED，然後，在 #file:SelectionCacheTable.tsx 裡面抓出候選任務時，若有 INTERRUPTED 的，就給他強調，提到表格的最上層，這樣，當我回來時，就可以接著繼續完成被中斷的任務。您覺得這個想法如何？會很難改嗎？

## [2026-05-24] Copilot's Answer 01

### 修改了 4 個檔案：

1. **`schema.ts`** — `SelectionCacheItem` 新增 `status?: string` 欄位

2. **`taskFlow.ts`**
   - `updateTaskPoolAfterEnd` 接受 `isInterrupt` 參數，interrupt 時寫入 `status: "INTERRUPTED"` 而非 `"PENDING"`
   - `applySourceCompletionUpdates` 接受 `isInterrupt` 參數：
     - Scheduled → interrupt 時只更新 `status: "INTERRUPTED"`，不重算 nextRun
     - Micro_Tasks → interrupt 時寫入 `"INTERRUPTED"` 而非 `"DONE"`

3. **`candidateUtils.ts`**
   - 三個來源（Task_Pool、Scheduled、Micro_Tasks）的過濾條件都加入 `|| status === 'INTERRUPTED'`
   - `Candidate` 介面新增 `status?: string`，並帶入 candidates

4. **`SelectionCacheTable.tsx`**
   - `cacheItems` 帶入 `status`
   - `loadCandidates` 排序時 `INTERRUPTED` 優先置頂，其次才按 score 排序
   - `<tr>` 樣式：`INTERRUPTED` 的 row 顯示 **淡黃底色 + 左側橘色邊框**，一眼就能識別

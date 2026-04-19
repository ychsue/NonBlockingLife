# 增加 deadline 給每個 task，然後 task pool 裡面的 task 還有每日使用次數的紀錄，與deadline相差的日數也計入 score 裡面，讓使用者可以知道哪些 task 是快到期的，哪些是已經過期的，這樣，在selectionCacheTable 裡面就可以根據這些資訊來排序，也可以顯示在條目的文字與顏色上。

---

## 2026-04-19 實作紀錄

### Schema 擴充

- `TaskPoolItem`、`MicroTaskItem`、`ScheduledItem`、`SelectionCacheItem` 均新增 `deadline?: number`（epoch ms）

### 評分邏輯（`candidateUtils.ts`）

- `Candidate` 介面加入 `deadline?: number`
- Task Pool 與 Micro Tasks 的評分加入 deadline 權重：
  - 8–14 天內：+15 分
  - 4–7 天內：+40 分
  - 0–3 天內：+80 分
  - 已逾期：`Math.min(100 + days × 20, 500)` 分
- 所有候選來源（Task Pool、Micro Tasks、Scheduled）push 時一併帶入 `deadline`

### Candidates 頁面（`SelectionCacheTable.tsx`）

- 標題欄加入 deadline 徽章：🔴 已逾期 N 天、🟠 今天到期、🟡 1–3 天、純文字 4–7 天、>7 天不顯示
- `handleRefreshCandidates` 偵測 `nextRun > deadline` 的 Scheduled 條目，存入 `conflictScheduled` state
- 頁面頂部顯示衝突區塊，點擊條目會透過 `pendingEditIntent` 跳至 Scheduled 編輯頁面

### 各 Table 新增 deadline 欄位

- `TaskPoolTable`、`MicroTasksTable`、`ScheduledTable` 分別新增 deadline 桌面欄位、EditDialog 欄位，以及 `handleEditSave` 儲存邏輯

### EditDialog 桌機顯示修正

- 原本 `<EditDialog>` 放在 `isMobile ? (<>...</>) : (desktop)` 的行動分支內，導致桌機看不到
- 修正方式：將 `<EditDialog>` 移至 `isMobile` 條件式外部（緊接 `)}` 之後、`<TableHelpDialog>` 之前）
- 受影響檔案：`ScheduledTable`、`TaskPoolTable`、`MicroTasksTable`、`InboxTable`、`ResourceTable`

### TableCard 非觸控裝置按鈕

- 以 `window.matchMedia('(hover: none) and (pointer: coarse)')` 一次性偵測是否為觸控裝置
- 非觸控裝置（桌機滑鼠）時，卡片底部顯示「編輯」與「刪除」按鈕
- 刪除按鈕沿用現有的二次確認邏輯（pendingDeleteConfirm，3 秒自動取消）

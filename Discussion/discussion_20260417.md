# 2026-04-17 修正紀錄

## 1. Delete 操作修正（`程式碼.js`）

**問題**：刪除操作傳入的 `data` 為 `{}` 時，會將 Google Sheets 裡原有的資料清空，僅留下空的 tombstone 列（如 `{}\tTRUE`），無法追蹤刪除前的狀態。

**修正**：

- 行存在時刪除：先 `readExistingData` 讀回原始資料，再 `mergePayload` 合併後才標記 `deleted=true`，保留完整歷史資料。
- 行不存在且 `data` 為空（`{}`）：直接跳過，不寫入 Sheets，避免無意義的空 tombstone。

---

## 2. 自動同步補強（`SyncStatus.tsx`）

**新增兩個自動觸發機制：**

### (a) 筆數閾值 + Idle 緩衝

- `pendingCount >= 20` 且距上次 change_log 變化 ≥ 3 秒，才觸發自動 sync。
- 避免使用者快速連續輸入時被打斷；確保「停下來了」才同步。
- 觸發時顯示提示訊息：`⏳ 待同步已達 N 筆，自動同步中...`

### (b) Page Visibility API（離開前補送）

- 監聽 `visibilitychange`，使用者切換 App 或 Tab 時靜默送出 pending 操作。
- 利用 iOS 凍結前的短暫視窗（約 30 秒），盡力而為。
- 若 sync 中被系統中斷，本地 pending 狀態不變，下次回來繼續補送，資料不會損毀。

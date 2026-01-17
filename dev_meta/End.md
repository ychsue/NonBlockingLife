# handleEnd 運作方式

## 函數簽名

```javascript
handleEnd(service = SheetsService)
```

## 參數說明

- `service`: 服務物件，預設為 `SheetsService`（用於測試時可替換）

## 運作流程

1. **檢查現況**
   - 呼叫 `service.getDashboardState()` 取得當前 Dashboard 狀態
   - 解構取得 `[id, name, startAt]`
   - 如果 `id` 為空，表示目前無執行中任務
   - 返回 `{ status: "error", message: "目前無執行中任務" }`

2. **計算持續時間**
   - 設定結束時間 `now = new Date()`
   - 呼叫 `Utils.calculateDuration(startAt, now)` 計算從開始到結束的持續時間（分鐘）

3. **執行結束邏輯**
   - 清空 Dashboard：`service.clearDashboard()`
   - 更新任務狀態為 `DONE` 並記錄持續時間：`service.updateTaskStatus(id, NBL_CONFIG.STATUS.DONE, duration)`
   - 取得更新後的任務資訊 `taskinfo`

4. **記錄日誌**
   - 呼叫 `service.appendLog()` 記錄 END 事件
   - 日誌內容包含：時間、ID、標題、"END"、來源、狀態、持續時間和原始備註

5. **返回結果**
   - 返回 `{ status: "success", duration: number }`

## 可能的返回值

- 成功：`{ status: "success", duration: number }`
- 錯誤：`{ status: "error", message: "目前無執行中任務" }`

## 注意事項

- 函數會在控制台輸出 `taskinfo` 以供除錯
- 持續時間以分鐘為單位計算

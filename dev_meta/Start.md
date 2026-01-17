# handleStart 運作方式

## 函數簽名

```javascript
handleStart(taskId, note, service = SheetsService)
```

## 參數說明

- `taskId`: 任務 ID（可選，如果未提供會自動生成）
- `note`: 任務的備註或描述
- `service`: 服務物件，預設為 `SheetsService`（用於測試時可替換）

## 運作流程

1. **檢查現況**
   - 呼叫 `service.getDashboardState()` 取得當前 Dashboard 狀態
   - 如果 `[currentId]` 不為空，表示已有任務正在執行
   - 返回 `{ status: "warning", message: "已有任務正在執行" }`

2. **自動尋找任務資訊**
   - 呼叫 `service.findTaskById(taskId)` 根據任務 ID 尋找任務資訊
   - 如果找不到任務，返回 `{ status: "error", message: "找不到該任務 ID" }`
   - 取得任務的 `title` 和 `source` 資訊

3. **執行更新**
   - 設定開始時間 `now = new Date()`
   - 更新 Dashboard：`service.updateDashboard([id, note, now, NBL_CONFIG.STATUS.RUNNING])`
   - 如果 `id === taskId`（即非自動生成），更新任務狀態為 `DOING`：`service.updateTaskStatus(id, NBL_CONFIG.STATUS.DOING)`

4. **記錄日誌**
   - 呼叫 `service.appendLog()` 記錄 START 事件
   - 日誌內容包含：時間、ID、標題、"START"、來源、狀態、備註

5. **返回結果**
   - 返回 `{ status: "success", taskId: id, title: taskInfo.title }`

## 可能的返回值

- 成功：`{ status: "success", taskId: string, title: string }`
- 警告：`{ status: "warning", message: "已有任務正在執行" }`
- 錯誤：`{ status: "error", message: "找不到該任務 ID" }`

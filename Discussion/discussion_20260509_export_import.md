# export 與 import 的討論

## 結論：採用 JSON 格式

### 為什麼選 JSON

- **Excel 支援**：Excel Power Query 可直接匯入 JSON（資料 → 取得資料 → 自檔案 → 自 JSON）
- **前端零依賴**：不需任何套件，原生 JS 即可生成與解析
- **AI 友善**：可直接傳給 Gemini/Copilot 分析
- **多表支援**：單一檔案 `{ task_pool: [...], scheduled: [...], ... }`

### 不選其他格式的原因

| 格式 | 理由 |
|------|------|
| CSV | 不支援多表，需要 zip 壓縮 |
| XLSX | 前端套件太大（~300KB），且 Excel 匯出 JSON 需增益集 |
| YAML | 人類可讀但體積大，Excel 無法直接匯入 |
| JSONL | 適合 Log 分析，但多表需多個檔案 |

## 匯出/匯入實作

### 匯出檔案格式

```json
{
  "version": 1,
  "exportedAt": 1778285402708,
  "tables": {
    "task_pool": [...],
    "scheduled": [...],
    "micro_tasks": [...],
    "inbox": [...],
    "resource": [...],
    "log": [...]
  }
}
```

### 防錯機制（針對 Excel 編輯後的資料）

- Excel 會把數字轉成字串 → 用 `Number()` 轉換回數字
- 字串欄位多了空白 → `.trim()` 後回傳
- 缺少必要欄位（taskId/id） → 該筆跳過，記入 warnings
- 版本不符 → 立即回傳錯誤，不寫入

### 使用者流程

1. **匯出**：點 PWA 的 📤 按鈕 → 下載 `nbl-backup-YYYY-MM-DD.json`
2. **在 Excel 中檢視**：Excel → 資料 → 取得資料 → 自 JSON → 選檔案
3. **修改後匯入**：修改 JSON (可用 Excel Power Query 或文字編輯器) → 點 PWA 的 📥 按鈕 → 選檔案 → 確認
4. **結果檢視**：modal 顯示每表匯入筆數和跳過警告

## Excel Power Query 問題

### 現有限制

- Power Query 一次只能處理一張表
- 需手動為每張表建立連線
- 無法一次匯入所有 6 張表

### 解決方案選項

1. **提供 Excel 範例檔**（中期方案）
   - 預製 Excel 含 Power Query 連線到 JSON
   - 使用者只需替換 JSON 檔案路徑
   - 包含 6 個 Power Query 查詢（task_pool/scheduled/micro_tasks/inbox/resource/log）
   - 但維護成本較高，JSON 結構變化需更新 Excel

2. **Google Sheets 方式**（首選，推薦）
   - 用文字編輯器打開 JSON，複製一個表的陣列
   - 貼到 Google Sheets 儲存格 A1，自動解析成表格
   - 為各表建立多個 sheet
   - 可在 Google Sheets 中編輯後，複製回成 JSON 格式再匯入 PWA
   - 完全無需額外工具，簡單易懂

3. **提供 Python 腳本**（進階方案，後期考慮）
   - 給技術使用者一個簡單腳本，一鍵轉成 xlsx 並建立多個 sheet
   - 不依賴 Excel，使用者在本機執行
   - 好處：一次轉好所有表，缺點：需安裝 Python

### 近期建議

- **首選**：PWA export JSON → Google Sheets 檢視與編輯 → 編輯後複製回 JSON 用 📥 匯入
- **替代**：若使用者偏好 Excel，可自己複製貼上各表到 Excel（雖然不方便）
- **後續可考慮**：蒐集使用者反饋後，決定是否提供 Python 腳本或 Excel 範例檔

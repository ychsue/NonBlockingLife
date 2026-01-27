# Shortcuts (捷徑們) 的連結與說明

**注意** ： 下載後請依提示輸入您的 API 網址。若需手動修改，請編輯捷徑最上方的『文字』區塊。

## 開始新 Task

[開始新 Task](https://www.icloud.com/shortcuts/439cbba876e44236a6fe877f3388254c)

## 遇到中斷

[Interrupt](https://www.icloud.com/shortcuts/1595adaeb0d1447ca16135ab5d3de202)

## 結束一個任務

[結束 Task](https://www.icloud.com/shortcuts/01a29a7edfb24a8a8607577ec8dfe068)

## 加到 Inbox 裡面

[Add Inbox](https://www.icloud.com/shortcuts/d832f91f6f774783b4e4514d611a63a2)

## QueryOptions

[QueryOptions](https://www.icloud.com/shortcuts/243e7a82bb68440b95f03915e5aa6eb4)

    ```mermaid
    graph TD
        A[啟動捷徑] --> B{API: QUERY_OPTIONS}
        B --> C[顯示今日進度與緊急件數]
        C --> D[彈出清單: 🔔緊急 / 🎯專案 / ⚡碎事]
        D --> E{使用者選擇}
        E -- 選擇任務 --> F[API: START + 開啟濾鏡]
        E -- 隨手記 --> G[API: ADD_INBOX]
        F --> H[結束: 顯示成功通知]
    ```

### 而GAS 的部分則

### Query Options Response (Optimized for iOS Shortcuts)

為了優化 iOS 捷徑的解析速度，API 採用雙欄位設計：

- `displays`: `string[]` -> 用於「從清單選擇」動作顯示。
- `options`: `Object` -> 以顯示字串為 Key，方便捷徑快速獲取 TaskID。

**Example:**

```json
{
  "displays": ["🔔 晾衣服 (到期)", "🎯 寫 NBL 代碼"],
  "options": {
    "🔔 晾衣服 (到期)": { "taskId": "S123", "type": "Scheduled" },
    "🎯 寫 NBL 代碼": { "taskId": "T456", "type": "Task" }
  }
}

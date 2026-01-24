# Shortcuts (捷徑們) 的連結與說明

**注意** ： 下載後請依提示輸入您的 API 網址。若需手動修改，請編輯捷徑最上方的『文字』區塊。

## 開始新 Task

[開始新 Task](https://www.icloud.com/shortcuts/5ba6af0fc1ed4d5aaf6d6c9954977782)

## 遇到中斷

[Interrupt](https://www.icloud.com/shortcuts/6fbd8f16f2bd4687aaf87d053690d321)

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

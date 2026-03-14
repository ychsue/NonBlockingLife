# NonBlockingLife (NBL) 🚀

> **大腦的高效作業系統：實現「超導般」的人生調度**

## 📖 專案簡介

**NonBlockingLife** 是一個基於電腦科學 **Event Loop (事件循環)** 原理開發的個人調度系統。

透過將大腦視為 **單執行緒 (Single Thread)** 處理器，本專案旨在建立外部監控機制，防止「主執行緒阻塞 (Main Thread Blocking)」，確保生活中的微任務、宏任務與異步回調能流暢運轉。

本專案也是 [Superconductorlike Society](https://ychsue.github.io/superconductorlike_society/) 願景下的關鍵實踐，目標是讓人即使被打岔也能快速回到主線。

## 🛠️ 目前實作 (v2.0)

v2.0 已從「GAS 主體」升級為 **PWA 主體 + GAS 雲端資料層**：

[PWA 主體](https://ychsue.github.io/NonBlockingLife) 直接可用，資料完全只在您的裝置上，若要跨裝置同步，請依照網頁上的教學，將您的一個 Google Sheets 檔案開出GAS API 給本 PWA 網頁，就可以有個您自己的Google雲端資料層來同步。

- **PWA (Local-first)**：以 Dexie/IndexedDB 作為主要資料庫與操作介面。
- **GAS + Google Sheets**：作為同步後端與雲端備援資料源。
- **iPhone Shortcuts**：作為快速觸發端（Start/End/Interrupt/Inbox/Scheduled）。

目前已支援：

- **Start / End / Interrupt** 任務流
- **Inbox / Task Pool / Scheduled / Micro Tasks** 任務管理
- **手動同步**（Push + Pull）
- **首次設定精靈**（SetupWizard）
- **雲端還原**（可清空本地後重新 pull）

## 🔄 同步策略（目前版本）

- **雙向同步表**：`task_pool`, `scheduled`, `micro_tasks`, `inbox`
- **Log 表策略**：預設 **單向推送**（PWA push 到 Sheets，不自動 pull 回 PWA）
- **分析定位**：完整 Log 保存在 Google Sheets，方便 Gemini / Excel 分析
- **本地 Log 顯示**：以近期紀錄與搜尋為主（避免裝置端資料過大）

## 🧠 Event Loop 哲學對應

- **Call Stack**：你當下的專注力（一次只能做一件事）
- **Task Pool**：宏任務隊列（專案與大目標）
- **Micro Task**：微任務對列 (有空時就可處理)
- **Scheduled (Timers)**：異步回調（利用計時器處理等待類任務）
- **Selection Cache**：Ready Queue（AI/規則挑選後的候選任務）
- **Log**：執行歷程事件流（供回顧與分析）

## 🚀 未來願景 (Roadmap)

NonBlockingLife 的目標是從效率工具進化為生命伴侶：

1. **AI 深度分析**：分析 Log 找出專注黃金時段與疲勞規律
2. **身心狀態建模**：整合穿戴裝置資料納入調度權重
3. **動態調解**：高負荷時自動調整為微任務或休息模式
4. **隨身導師與醫生**：主動預警並提供個人化建議

## ⚙️ 快速開始

1. **PWA**：啟動 `pwa/` 專案並開啟網頁
2. **Backend**：部署 `pwa/src/gas/` 對應程式碼為 Web App，並綁定 Google Sheets
3. **Setup**：在 PWA 右上角同步區設定 GAS Web App URL
4. **Sync**：按「同步」驗證 push/pull 是否正常
5. **Shortcuts**：安裝 iPhone Shortcuts 並串接 API URL

## 📄 授權與貢獻

本專案採用 MIT 授權。歡迎所有對「優化生命執行效率」有熱情的開發者加入。

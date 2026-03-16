# 拍 YouTube 影片介紹怎麼使用

> 依據目前 `README.md`、`Discussion/` 討論脈絡與 `pwa/` 實作現況整理。目標是「讓觀眾看完就能開始用」。

---

## 0) 影片定位（先定調）

### 核心受眾

- 受夠傳統 To-Do app、容易被打岔的人。
- 想把時間管理「工程化」的人（有 iPhone Shortcuts / Google Sheets 習慣者）。
- 需要多裝置同步，但不想自架 server、又希望資料在自己手上的人。

### 一句話定位（開場可直接講）

> NonBlockingLife 是把 Event Loop 搬到人生任務管理：本機快速操作（Local-first），需要時再同步到你自己的 Google Sheets。

### 一句話補充（Inbox 與 Interrupt）

> Inbox 是「先收再分類」的緩衝區；Interrupt 是「必須當下處理」的執行中事件。

### 這支影片的主軸

1. 為什麼要做（痛點）
2. 這套系統跟一般待辦差在哪
3. 實際怎麼用（Start / Interrupt / End / Sync / Log / Inbox）

---

## 1) 建議先拍哪一版？

### A. 60 秒 Shorts（拉新）

- 目標：讓人知道「這不是一般待辦清單」。
- 公式：痛點 10 秒 + 爽點 Demo 40 秒 + CTA 10 秒。

### B. 5~6 分鐘主影片（最重要）

- 目標：看完可以照做。
- 先上這支，再把 Shorts 當導流。

### C. 12 分鐘完整教學（給深度用戶）

- 目標：含 SetupWizard、GAS URL 設定、同步與還原流程。

---

## 2) 推薦「5~6 分鐘」分鏡（可直接照拍）

### [00:00 - 00:25] 問題開場

畫面：手機通知、待辦清單很多，但不知道先做什麼。  
口播：
> 我以前最大的問題不是沒有清單，而是被打岔後回不來主線。一天很忙，但說不出時間花在哪。

### [00:25 - 00:55] 核心理念（Event Loop 對應）

畫面：簡單圖卡（Call Stack / Task Pool / Scheduled / Log）。  
口播：
> NonBlockingLife 把大腦當單執行緒：一次只做一件事。任務分成 Task Pool、Scheduled、Micro Tasks，最後用 Log 回看整天的事件流。

### [00:55 - 02:40] 實際操作 Demo（主段）

建議順序（照目前 PWA 最順）：

1. 打開 `Guide`（先給觀眾全貌：PWA + iOS Shortcuts + Sync）
2. 到 `Task Pool` 快速看任務
3. 快速示範 `Inbox` 新增一筆「先記下來，暫不決策」
4. 到 `Selection Cache` 按「刷新候選」
5. 點一個候選任務 → `開始任務`
6. 展示「目前有任務執行中」對話框
7. 按 `中斷任務`（示範突發狀況）
8. 再 `結束任務`
9. 打開 `Log` 看 START / INTERRUPT / END 紀錄

口播重點：
> 候選清單不是死清單，它會根據優先度、已用配額、排程到期狀態做排序。  
> 中斷不是失敗，而是被系統正式記錄的一段時間。
> Inbox 的目的不是立刻分類，而是讓你先保住主線，不把腦內暫存塞爆。

### [02:40 - 03:45] 同步展示（差異化）

畫面：右上 `SyncStatus`（同步按鈕 + 狀態 + 還原）。
流程：

1. 設定 GAS URL（可帶過）
2. 按「同步」
3. 口頭說明：Task Pool / Scheduled / Micro Tasks / Inbox 雙向同步
4. 補充：Log 目前是單向推送到 Sheets，主要做分析

口播：
> 日常操作在本地，所以快；同步是你自己控制，資料在你自己的 Google Drive。

### [03:45 - 04:45] iPhone Shortcuts 工作流

畫面：`Guide` 頁的 Shortcuts 區塊 + iPhone 錄屏（若有）。
重點：

- QueryOptions
- NBL Interrupt
- NBL Inbox
- NBL Scheduled
- NBL_Timer（Start 30 分鐘 / End 10 分鐘）

口播：
> 我的習慣是 iPhone 觸發、PWA 管理、Sheets 分析。這樣打岔時還是能回到主線。

### [04:45 - 05:20] 適合誰 & 不適合誰（誠實加分）

適合：想建立「任務狀態機」的人。  
不適合：只想超極簡打卡、不想設定 Shortcuts 或同步的人。

### [05:20 - 05:50] CTA

> 如果你也常被中斷、想把時間流看清楚，歡迎試試看。  
> GitHub 上是開源的，歡迎提 issue 或 PR。

---

## 3) 60 秒 Shorts 腳本（可直接唸）

### [0-8 秒]

「你不是沒做事，你是被打岔後回不來。」

### [8-20 秒]

「這個專案把 Event Loop 用在人生任務管理：Inbox、Task Pool、Scheduled、Selection Cache、Log。」

### [20-42 秒]

「看這裡：刷新候選 → 開始任務 → 臨時中斷 → 結束 → 全部都進 Log。」

### [42-52 秒]

「本機操作超快，手動同步到你自己的 Google Sheets，資料你自己掌控。」

### [52-60 秒]

「這就是 NonBlockingLife。想試的話，打開她的網頁，或去 GitHub 看 README。」

---

## 4) 實拍畫面清單（按元件對應）

### 必拍（主影片）

- `GuidePage`：一句話說清整體流程（PWA + Shortcuts + Sync）
- `InboxTable`：快速丟想法，不必當下分類
- `SelectionCacheTable`：刷新候選、點選任務、開始/中斷/結束
- `SyncStatus`：同步按鈕、同步訊息、還原雲端
- `LogTable`：用時間篩選 + 搜尋，快速回看事件
- `ScheduledTable`：Cron / remindBefore / remindAfter / callback（帶出「事件鏈」概念）

### 可選加分

- `SetupWizard`：新手第一次設定
- `TaskPoolTable`：展示 daily limit、priority、spentTodayMins

---

## 5) 口播避免踩雷（很重要）

### 建議這樣講

- 「Local-first + 手動同步」
- 「Log 目前預設是單向 push 到 Sheets 做分析」
- 「這是一套可演進的個人調度系統，不是單純 checklist」
- 「Inbox 是收件匣，不是立即排程；Interrupt 是當下執行事件」

### 避免這樣講

- 不要說成「完全即時多端同步」
- 不要說成「AI 全自動幫你決策」（現在是規則加權 + 候選清單）

---

## 6) 拍攝與後製建議（低成本可執行）

### 錄影順序（減少重拍）

1. 先錄主流程（Selection Cache 主段）
2. 再補同步段（SyncStatus）
3. 最後補 Guide / Setup / Log 特寫

### 畫面節奏

- 每 8~12 秒要有一個明確動作（切頁、點擊、狀態改變）
- 表格鏡頭別停太久，重點用框線或放大指出

### 字幕關鍵詞（建議固定）

- `START`
- `INTERRUPT`
- `END`
- `SYNC`
- `LOG`
- `Local-first`

---

## 7) 建議你的發片順序（實際成長策略）

1. 先上 5~6 分鐘主影片（可教學、可收藏）
2. 從主影片切 2~3 支 Shorts（痛點版 / 中斷版 / 同步版）
3. 最後再補 12 分鐘完整 setup 教學

---

## 8) 一句收尾（可放影片最後）

> 我不是在做另一個待辦 app，而是在做一個能承受現實打岔的個人調度系統。

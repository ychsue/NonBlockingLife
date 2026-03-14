# NonBlockingLife 上片文案包

> 用途：影片剪完後，不用再臨時想標題、縮圖文案、說明欄、置頂留言與 hashtags。直接挑一組貼上即可。

---

## 0) 什麼是「上片文案包」？

上片文案包，就是影片發布時會用到的整套文字素材，通常包含：

- 標題
- 縮圖文字
- 說明欄
- 章節時間碼
- 置頂留言
- hashtags
- Shorts 版短文案

它的目的不是「寫漂亮話」，而是讓影片：

- 更容易被點進去
- 更容易讓觀眾知道這支片在講什麼
- 更容易讓你穩定產出，不會每次發布前卡住

---

## 1) 這支 NBL 主影片的定位

### 影片類型

- 產品介紹 + 使用流程示範
- 不是娛樂型 vlog
- 不是純技術教學
- 是「痛點 + 解法 + demo + 邀請試用」型影片

### 核心賣點

- 用 Event Loop 思維管理人生任務
- Local-first，操作快
- Google Sheets 同步，資料在自己手上
- 中斷可追蹤，不再回不去主線

---

## 2) 標題候選（主影片）

### 偏問題導向

1. 我做了一個不怕被打岔的待辦系統：NonBlockingLife
2. 一天很忙卻不知道時間去哪了？我用 Event Loop 做了這套系統
3. 被打斷後總是回不去？這是我做的 NonBlockingLife
4. 我把 JavaScript Event Loop 做成時間管理系統了

### 偏產品導向

5. NonBlockingLife v2.0：PWA + Google Sheets 的個人調度系統
6. NonBlockingLife 介紹：不是待辦清單，是個人調度系統
7. Local-first 時間管理系統實作：NonBlockingLife Demo

### 偏開發者導向

8. 我把 Event Loop 用在人生管理，做成了這個 PWA
9. 用 PWA + IndexedDB + Google Sheets 做個人調度系統
10. 這不是 Todo App，我做的是可追蹤中斷的任務系統

### 我最推薦的 3 個

1. 我把 JavaScript Event Loop 做成時間管理系統了
2. 我做了一個不怕被打岔的待辦系統：NonBlockingLife
3. 這不是 Todo App，我做的是可追蹤中斷的任務系統

---

## 3) 縮圖文字候選

### 版本 A：痛點型

- 被打斷也回得去
- 不再忘記剛剛做到哪
- 我需要的不是待辦清單

### 版本 B：概念型

- Event Loop 管人生
- 不是 Todo App
- Local-first 任務系統

### 版本 C：產品型

- NonBlockingLife v2.0
- PWA + Sheets 同步
- 可追蹤中斷的系統

### 縮圖組合建議

- 主標：被打斷也回得去
- 副標：Event Loop 任務系統

或

- 主標：不是 Todo App
- 副標：是個人調度系統

---

## 4) 說明欄範本（主影片完整版）

### 版本 A：標準版

這支影片介紹我正在做的個人調度系統 NonBlockingLife。

它的核心想法是：把大腦視為單執行緒，用 Event Loop 的概念管理 Task Pool、Scheduled、Micro Tasks、Selection Cache 與 Log，讓「被打岔」這件事不再只是混亂，而是能被追蹤、結束、回到主線的正常事件。

目前 v2.0 採用：

- PWA 本地優先（Local-first）
- Dexie / IndexedDB 作為本機資料庫
- Google Apps Script + Google Sheets 作為同步與備份層
- iPhone Shortcuts 作為快速觸發端

這支影片會示範：

- 候選任務 Selection Cache
- Start / Interrupt / End 流程
- Log 回看
- 手動同步到 Google Sheets
- iPhone Shortcuts 的整合方式

GitHub：
[[https://github.com/ychsue/NonBlockingLife]]

README：
請見專案首頁

如果你也常被打岔、想把時間流看清楚，歡迎試試，也歡迎 issue / PR。

### 版本 B：更精簡版

NonBlockingLife 是我做的一套個人調度系統。

它不是傳統待辦清單，而是把 Event Loop 的思維搬到人生任務管理：

- Task Pool
- Scheduled
- Selection Cache
- Log
- Interrupt

這支影片會快速示範整個流程，包含：開始任務、被打斷、中斷結束、同步與回看 Log。

GitHub：
[[https://github.com/ychsue/NonBlockingLife]]

如果你對 local-first、PWA、Google Sheets 同步，或「被打岔後如何回到主線」有興趣，歡迎留言交流。

---

## 5) 主影片章節時間碼範本

00:00 為什麼我需要這套系統
00:25 Event Loop 對應到人生管理
00:55 NonBlockingLife v2.0 架構
01:20 Candidates / Start / Interrupt / End Demo
02:45 Log 回看
03:35 Sync 與還原
04:20 iPhone Shortcuts 工作流
05:00 適合誰、不適合誰
05:35 結尾與 GitHub

---

## 6) 置頂留言範本

### 版本 A：導互動

這支影片先介紹 NonBlockingLife 的核心流程。  
如果你有興趣，我下一支可以拍：

1. SetupWizard 與 GAS 設定教學
2. iPhone Shortcuts 實際配置
3. 我怎麼用 Log 回顧一天

想先看哪一支，可以直接留言告訴我。

### 版本 B：導專案

補充幾個重點：

- v2.0 目前是 PWA 主體 + GAS / Google Sheets 同步層
- 日常操作走 local-first
- Log 目前主要是單向 push 到 Google Sheets 做分析

GitHub 在說明欄，歡迎 issue / PR。

---

## 7) Hashtags 建議

### 主影片

#NonBlockingLife #Productivity #PWA #GoogleSheets #EventLoop #TimeManagement #PersonalOS #TaskManagement

### 偏開發者版

#React #PWA #IndexedDB #Dexie #GoogleAppsScript #JavaScript #BuildInPublic

### 偏中文觀眾版

#時間管理 #生產力工具 #任務管理 #個人系統 #開源專案

---

## 8) Shorts 文案包

### Shorts 標題候選

1. 我把 Event Loop 做成時間管理系統了
2. 被打斷後回不去？我這樣解決
3. 這不是 Todo App，這是個人調度系統
4. 用 PWA 管理人生任務是什麼感覺？
5. 我做了一個可追蹤中斷的任務系統

### Shorts 說明欄短版

NonBlockingLife 是我做的個人調度系統。  
不是一般 Todo App，而是把 Event Loop 的概念搬到人生任務管理。  
GitHub 請見主頁。

### Shorts 留言引導

你最常卡住的點是：

1. 不知道先做什麼
2. 被打斷後回不去
3. 做了很多卻沒有記錄

---

## 9) 發布策略建議

### 主影片發布後

- 當天切 2 支 Shorts
- 24 小時內回覆前 10 則留言
- 留意觀眾最有感的是哪個詞：
  - 被打斷
  - Event Loop
  - Local-first
  - Google Sheets 同步

### 後續影片題目

1. NonBlockingLife 安裝教學：Google Sheets + GAS + PWA
2. iPhone Shortcuts 怎麼接 NonBlockingLife
3. 為什麼我把中斷當成正式事件來記錄
4. Log 怎麼幫我看見一天的時間流

---

## 10) 最後原則

上片文案包的重點不是一次想出「最神標題」，而是讓你：

- 不用每次發布前重新發明輪子
- 可以快速 A/B 測試標題與縮圖
- 把精力留給影片內容本身

> 先有一包能用的，再慢慢優化成你的風格。

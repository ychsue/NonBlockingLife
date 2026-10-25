# Microsoft Store 清單文案草稿

此文件整理 Microsoft Store 清單的文字草稿與素材待辦。上架前請在 Partner Center 確認各語言欄位的字數限制、必填狀態及實際支援地區。

## 清單基本資料

- **產品名稱**：NonBlockingLife
- **開發者**：Young-Chung Hsue / YesCirculation Solutions
- **產品類別建議**：生產力
- **版本新增功能**：首次上架可依 Partner Center 的要求留白；若必填，填寫本次實際變更，不要用固定宣傳文案代替。

## 繁體中文（台灣）

### 簡短描述

執行任務期間，會倒數計時，以利專注。
沒事時，可以很快看到預訂或想做的事，然後選擇專注該任務或狀態。
被打斷時，記下手邊任務並進入打斷狀態，完成打斷後，能幫助自己回到原本主線。

### 說明

生活中常有新想法、待辦事項和突發打斷。NonBlockingLife 提供一套個人任務流程，協助你先收下事情、安排稍後處理，並記錄任務的開始、結束與中斷，讓你更容易重新整理下一步。

**把事情放進合適的位置**

- 用 Inbox 快速收納突然想到或尚未安排的事項，找時間再分類。這些事項最終會被放到 Task Pool、Micro Tasks、Scheduled 或 Resources。
- 用 Task Pool 管理專案與較大的任務。
- 用 Micro Tasks 整理可在零碎時間處理的小任務。
- 用 Scheduled 安排稍後處理的事項，並搭配計時器或提醒。
- 用 Resources 放置不需立即處理的參考資料或外部資源，方便日後查閱。

**記錄自己的執行歷程**

透過 Start、End、Interrupt 記錄任務狀態，並在 Log 中回顧執行歷程。NonBlockingLife 協助你整理選擇，不會替你決定優先順序或自動完成任務。
這些紀錄若有使用 Supabase 同步，將可以藉由 AI 來分析甚至未來的管理建議(不屬於這個APP的功能，需要使用者自行實作)。


**本機優先，雲端同步由你選擇**

資料以本機使用為主。若需要跨裝置同步，可依設定說明連接自己的 Supabase 專案；核心功能不以雲端同步為前提。

NonBlockingLife 從電腦科學的事件循環（Event Loop）得到靈感：當新的事情打斷原有流程時，先收納、再處理，然後重新選擇下一步。

### 產品功能（最多 20 項）

1. Start / End / Interrupt 任務流程
2. Inbox 想法與待辦收件匣
3. Task Pool 專案與任務管理
4. Micro Tasks 零碎時間任務
5. Scheduled 預定事項
6. Resources 參考資料與外部資源
7. Log 任務執行歷程
8. 任務計時器
9. 桌面鬧鐘與提醒
10. ICS 日曆匯入
11. Scheduled 匯出為 ICS
12. 本機優先資料管理
13. 可選 Supabase 跨裝置同步
14. Windows 桌面整合
15. 通知與自訂 protocol

上列功能需依 Microsoft Store 實際上架版本逐項確認，尤其是 ICS、通知、protocol、鬧鐘及同步功能是否在該套件中啟用。

### 關鍵字（最多七個）

任務管理、待辦清單、時間管理、專注、計時器、行程安排、生產力

不建議使用「ADHD」等可能讓人理解為醫療或特定健康用途的關鍵字，除非產品定位與相關宣稱已經明確且符合商店政策。

### 簡短標題

人生不阻塞：就算被打斷，也能重新整理下一步

### 語音標題

NonBlockingLife

### 著作權與商標

建議草稿：`Copyright © 2026 Young-Chung Hsue`

上架前請確認著作權年份與著作權人名稱；若沒有註冊商標或需使用其他法定文字，請依實際情況填寫，不要將產品名稱誤寫成已註冊商標。

### 其他授權條款

若 Partner Center 欄位是指應用程式授權條款，請確認是否採用 Microsoft Store 預設授權條款或自訂條款。專案的 MIT 開源授權不一定等同於 Store 使用者的應用程式授權條款，請勿未確認就直接填入。

## English (United States)

### Short description

During tasks, a countdown timer helps you stay focused.
When you are free, you can quickly see your scheduled or intended tasks and choose which one to focus on.
Capture interruptions, organize what is next, and get back to the task you chose.

### Description

New ideas, waiting tasks, and interruptions can pull attention away from the work you intended to do. NonBlockingLife gives you a personal workflow to capture those items, schedule them for later, and record when you start, end, or interrupt a task—so you can review your options and choose what to do next.

**Put tasks in the right place**

- Capture new ideas and unplanned items in Inbox. Review and categorize them later. These categories include Task Pool, Micro Tasks, Scheduled, and Resources.
- Organize projects and larger tasks in Task Pool.
- Keep small tasks in Micro Tasks for shorter breaks in your day.
- Schedule future items and use timers or reminders where supported.
- Place reference materials or external resources in Resources for later consultation.

**Keep a record of your workflow**

Use Start, End, and Interrupt to record task activity, then review your history in Log. NonBlockingLife helps you organize your choices; it does not decide your priorities or complete tasks for you.
If these items are synced with Supabase, you can later analyze them with AI or other tools for management suggestions (this is not a built-in feature of the app and requires user implementation).

**Local-first, with optional cloud sync**

Your workflow is designed for local use. If you want to sync across devices, you can connect your own Supabase project using the in-app setup guidance. Cloud sync is optional.

Inspired by the computer science concept of an event loop, NonBlockingLife helps you capture incoming tasks, handle interruptions, and choose your next step.

### Features
1. Start, End, and Interrupt: Record task activity and manage interruptions.
2. Inbox: Quickly capture new ideas and unplanned items for later categorization.
3. Task Pool: Organize larger tasks and projects.
4. Micro Tasks: Manage small tasks suitable for short breaks.
5. Scheduled: Plan future tasks and set timers or reminders.
6. Resources: Store reference materials or external resources for later consultation.
7. Log: Review your task history and workflow.
8. Task timer
9. Desktop alarms and reminders
10. ICS calendar import
11. Scheduled export to ICS
12. Local-first data management
13. Optional Supabase cross-device sync
14. Windows desktop integration
15. Notifications and custom protocol


### Keywords (up to seven)

task management, to-do list, time management, focus, timer, scheduling, productivity

### Short title

Non-blocking Life: Capture interruptions. Find your next step.

### Voice title

Non-blocking Life

## 圖片與其他素材待辦

請以 Partner Center 該產品實際顯示的素材規格為準；不同產品類型、裝置或推廣位置可能會顯示不同欄位。

- **螢幕擷取畫面**：準備至少四張清晰、來自實際 Windows Store 版本的畫面，例如主畫面、任務流程、Scheduled/計時器、設定或同步說明。原始備註列出的尺寸為 1366×768 以上、最大 3840×2160、單張小於 50 MB、PNG；上傳前再次確認 Partner Center 要求。
- **Microsoft Store 標誌與美工圖案**：依 Partner Center 對目前提交的應用程式所列尺寸製作。舊備註中的尺寸可能因欄位或提交流程而異。
- **預告片及其他資產**：非必填時可先不提供。
- **Windows / Xbox 影像**：只有在提交流程要求或打算支援相應展示位置時準備。若提供，確認圖像符合當前規格及文字限制。
- **Xbox 專用素材**：若此應用程式沒有提交 Xbox 版本，先確認這些欄位是否適用，不必為不支援的平台製作素材。

## 上架前檢查

- 確認繁體中文與英文文案描述的功能都存在於實際提交的 Windows 套件。
- 確認隱私權政策、資料處理說明與 Store 的隱私欄位一致，特別是使用者自行設定 Supabase 時。
- 重新檢查功能、相容性、最低系統需求、著作權與授權條款。
- 檢查所有截圖是否來自實際版本，且未顯示真實個人資料、測試憑證或未完成畫面。
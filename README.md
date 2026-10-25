# NonBlockingLife (NBL)

> **被打斷時，幫助自己記下當下、處理插入的事情，並更容易回到原本主線的個人任務與時間管理工具。**

NonBlockingLife (NBL) 從電腦科學的 **Event Loop（事件循環）** 得到靈感：人的注意力一次通常只能專注處理一件事，但生活中的新想法、等待事項和突發打斷會不斷出現。NBL 提供一套外部任務流程，讓你先收下事情、安排時間，並記錄每次開始、結束或中斷，減少因為被打斷而忘記原本要做什麼。

## 開始使用

可直接開啟 [NonBlockingLife PWA](https://ychsue.github.io/NonBlockingLife) 使用核心功能。PWA 以本機儲存為主；若要跨裝置同步，可依應用程式內的設定說明，連接自己設定的 Supabase 專案。

- **先收下想法**：把突然想到、稍後再處理的事情放進 Inbox。
- **選擇下一步**：從 Task Pool、Micro Tasks 或 Scheduled 中整理要做的事。
- **記錄執行狀態**：使用 Start、End、Interrupt 記錄任務的開始、完成與中斷，並透過執行紀錄回顧過程。

NBL 的目標不是替你決定人生優先順序，而是提供一個可靠的外部流程，讓你在被打斷後能重新整理眼前的選擇，繼續自己的主線。

## 功能

- **Start / End / Interrupt**：記錄任務的開始、結束與中斷，若有計時器，可以倒數計時。
- **Inbox**：快速收納新想法和待處理事項，找時間再分類。
- **Resources**：若某些 Inbox 項目無須處理，而是屬於參考資料或外部資源，可放入 Resources 以便日後查閱。
- **Task Pool**：管理專案與較大的任務。可由 **Inbox** 轉來，或自行新增。
- **Micro Tasks**：整理可利用零碎時間處理的小任務。可由 **Inbox** 轉來，或自行新增。
- **Scheduled**：安排稍後處理的事項，並使用鬧鐘提醒功能。可由 **Inbox** 轉來，或自行新增。
- **執行紀錄（Log）**：回顧任務執行歷程。
- **ICS 日曆整合**：依目前支援方式匯入日曆，或將 Scheduled 匯出為 ICS 供其他日曆使用(可搭配 Supabase 來提供此ICS連結)。
- **本機優先與可選同步**：主要資料可保存在裝置；可選擇設定 Supabase 進行跨裝置同步及雲端備份。

## 平台

- **瀏覽器與 PWA**：提供核心任務功能；是否可使用系統提醒等功能，依瀏覽器與裝置支援而異。
- **Windows 與 Linux 桌面版**：在核心功能外提供桌面整合，例如鬧鐘、計時器、自動啟動、通知與自訂 protocol；Windows 正在倒數的計時器或正在響鈴的提醒會暫時阻止閒置睡眠，但允許螢幕依系統設定關閉。實際支援依作業系統而異。
- **Android TWA**：以 WebView 封裝 PWA，並提供鬧鐘、計時器、通知與自訂 protocol 等原生整合。
- **iPhone Shortcuts**：可作為 Start、End、Interrupt、Inbox、Scheduled 等流程的快速觸發方式。Apple 平台的鬧鐘與計時器需透過 Shortcuts 等方式配合使用。

## Event Loop 概念

NBL 以事件循環作為設計靈感，將日常任務流程整理如下：

- **Inbox**：暫存新進事項。
- **Task Pool**：管理較大的任務與專案。
- **Micro Tasks**：管理可以在零碎時間完成的小任務。
- **Scheduled**：安排稍後處理的事項，類似等待中的回呼。
- **Selection Cache**：依規則挑選出的候選任務，協助整理下一步。
- **Log**：記錄任務執行事件，供回顧使用。

這是協助理解產品設計的比喻，不代表應用程式會自動替使用者安排或執行所有任務。真正執行者是使用者自己。

## 隱私與同步

NBL 採本機優先方式運作。PWA 的資料主要保存在使用者裝置；就算跨裝置同步，也是使用者必須使用自己的Supabase帳號來實作，所以，也還是100%屬於使用者自己，不會外流。若使用者選擇設定 Supabase，資料同步與備份會依該設定運作，請參考應用程式內的設定說明並且請妥善管理您的帳號與相關設定。

目前同步策略：

- `task_pool`、`scheduled`、`micro_tasks`、`inbox` 支援雙向同步。
- Log 預設由 PWA 單向推送至 Supabase，不會自動從雲端拉回 PWA。
- 裝置端以近期 Log 和搜尋為主，避免本機資料持續膨脹。

## 未來方向

NonBlockingLife 是 [Superconductorlike Society](https://ychsue.github.io/superconductorlike_society/) 願景下的實踐之一。這個願景希望能使人們與AI能夠活出共榮的生活。這裡關注如何減少生活中的阻塞，讓人即使被打斷，也能更容易回到自己重視的事情。

後續方向包括身體與技能狀態紀錄、任務歷程分析、穿戴裝置資料整合，以及依個人狀態提供更合適的任務調整建議。這些是未來構想，並非目前已提供的功能或醫療建議。

## 開發者資訊

### 專案結構

1. `pwa`：PWA 前端、使用者介面與本機資料管理；設定 Supabase 後可進行雲端同步。
2. `desktop`：使用 Avalonia NativeWebView 承載 PWA，並提供 Windows 與 Linux 桌面整合。
3. `twa`：Android 平台的 PWA WebView 封裝與原生功能整合。

### 本機開發

#### PWA

在 `pwa` 目錄執行：

```bash
npm run dev
```

#### Windows 與 Linux 桌面版

1. 先在 `pwa` 目錄執行 `npm run dev`。
2. 使用 Visual Studio 開啟 `desktop/src/Nbl.Desktop` 專案並啟動偵錯。
3. 可在 Edge 開啟 `edge://inspect` 偵錯 PWA。
4. Linux 若要播放鬧鐘聲音，請安裝 VLC 及開發函式庫：

```bash
sudo apt update
sudo apt install vlc libvlc-dev
```

#### Supabase

請依照 [Supabase Setup Wizard](pwa/src/components/SetupSupabaseWizard.tsx) 的說明設定 Supabase。

#### Apple 平台

可透過 PWA 使用核心功能，並使用 iPhone Shortcuts 觸發支援的任務流程。鬧鐘與計時器需依賴 Shortcuts 等方式實現。

## 授權與貢獻

本專案採用 MIT 授權。歡迎對個人任務管理與「非阻塞人生」有興趣的開發者參與。

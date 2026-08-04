# 加入互動教學功能

## [2026-08-04] ychsue
我想利用 Joyride 這個套件來做互動教學，基本上會有多個 tours，每個 tour 會有多個 steps。

1. **tours來源**：
    - 每一版的tours會被宣告，使用者只能影響在localStorage裡面的 `completed_tours` 的tourid們，這樣，新版的自然會讓使用者知道有哪些新功能。
1. **執行條件**：
    - 使用者進入APP時，檢查尚未完成的 tours，若有且
    1. 與前一個隔10分鐘
    2. 在所要求的sheet裡面(若該tour沒有頁面要求，那就當作條件滿足)
    ，則啟動第一個未完成的 tour。
    - 在 More/Settings/Local 裡面，有個下拉式選單，裡面列了這些tours的名稱、啟動按鈕(若有宣告sheet就幫他跳過去，若有任何正在跑的tour，則灰色化)、以及一個完成勾選。
2. **設定完成時機**：
    - 一個tour完成時，就將她的tourId 與last_tour_time寫入 localStorage，
    - 使用者自己勾選完成勾選時，也會將她的tourId 與last_tour_time寫入 localStorage。

現在就有兩個功能可以變成tour
1. 當使用者進到inbox頁面時，指示使用者按新增按鈕，指示輸入標題後，指示按保存。
2. 沒有指定頁面，指示使用者按右上三條線，指示使用者按 `...`，指示使用者選擇 `Settings` 裡面的 `Local`，指示使用者選擇 `Android Timer`(所以要由experiment移到這裡)，選擇 `set-timer`，指示使用者切換頁籤到 `SelectionCache`，說明現在開始任何一個任務在使用者確認後，就會自動計時。

## [2026-08-04] Gemini 回覆修改後的範本

我想要在 React 專案中利用 React Joyride 套件實作一個動態功能引導系統（Interactive Product Tour），支援多個 Tour 與多個 Step。請幫我設計並實作這個架構：

### 1. 資料結構與來源 (Data Structure & Tours Source)
- 定義完整的 TypeScript 型別（如 `TourConfig`, `Step`），每個 Tour 應包含：`id`, `version`, `title`, `requiredSheet` (可選), `steps`。
- 專案中有一個中央宣告的 `TOURS_LIST` 陣列。
- 使用者完成的記錄存在 LocalStorage 的 `completed_tours`（字串陣列，存 id）。
- 紀錄上次觸發時間在 LocalStorage 的 `last_tour_time`（timestamp）。

### 2. 自動觸發與執行條件 (Auto-Trigger Logic)
- 當使用者進入 App 或切換頁面（Sheet）時，檢查第一個「未完成 (未在 completed_tours)」的 Tour。
- 啟動條件必須同時滿足：
  1. 當前時間與 `last_tour_time` 相隔至少 10 分鐘（若無紀錄則忽略）。
  2. 當前頁面匹配該 Tour 的 `requiredSheet`（若該 Tour 無 `requiredSheet` 限制，則視為滿足）。

### 3. 手動控制選單 (Settings UI)
- 在 `More/Settings/Local` 頁面新增一個引導管理區塊：
  - 展示所有宣告的 Tours 下拉選單/列表（顯示名稱與完成勾選狀態）。
  - 提供「手動啟動」按鈕：點擊時若有設定 `requiredSheet`，需先導向該頁面再開啟 Tour。
  - 若目前有任何正在執行的 Tour，手動啟動按鈕需設為灰色禁用（Disabled）。
  - 提供完成狀態手動勾選框：使用者自行勾選時，同樣將 `tourId` 寫入 `completed_tours` 並更新 `last_tour_time`。

### 4. 設定完成與中斷機制 (Completion Rules)
- 當 Tour 正常播放完畢（或使用者手動勾選）時：
  - 將 `tourId` 追加寫入 LocalStorage 的 `completed_tours`。
  - 更新 `last_tour_time` 為當前 Timestamp。

### 5. 互動式步驟推進 (Interactive Steps)
- 請注意：部分步驟需要「使用者親自完成操作」才前進下一步（而非單純點擊 Joyride 的 Next 按鈕）。
- 請支援隱藏 Next 按鈕，並暴露出可供外層元件呼叫的 `nextStep()` 控制控制函式，或透過監聽 State/Event 來觸發下一步。

---

### 📋 實際 Tour 案例實作：

請幫我建立以下兩個 Tour 設定檔：

1. **Tour 1: Inbox 新增任務教學**
   - `requiredSheet`: `inbox`
   - Steps:
     1. 指示使用者點擊「新增」按鈕（點擊後觸發下一步）。
     2. 指示使用者輸入標題（填寫後或點擊保存時觸發下一步）。
     3. 指示使用者點擊「保存」按鈕。

2. **Tour 2: Android Timer 自動計時教學**
   - `requiredSheet`: 無（任何頁面皆可開啟）
   - Steps:
     1. 指示使用者點擊右上角三條線選單。
     2. 指示使用者點擊 `...`。
     3. 指示使用者選擇 `Settings` 裡面的 `Local`。
     4. 指示使用者將 `Android Timer` 設定選為 `set-timer`（請注意：這需要把元件邏輯從 Experiment 移至 Local）。
     5. 指示使用者切換頁籤到 `SelectionCache`。
     6. 提示說明：「現在開始，任何一個任務在使用者確認後，就會自動計時。」

請提供清晰的 React Custom Hook（例如 `useProductTour`）、Joyride Wrapper 元件，以及設定檔範例。
# Android Automate 整合說明

## 架構概述

NonBlockingLife (PWA) 透過 **Android Intent URL** 觸發 [LlamaLab Automate](https://llamalab.com/automate/) flow。

``` jsonc
[PWA 網頁]  → intent:// URL → [Android Chrome] → [Automate app] → [NBL_Timer flow]
```

## 前置條件

1. 安裝 [Automate](https://play.google.com/store/apps/details?id=net.llamalab.automate)
2. 匯入 `NBL_Timer.flo`（本目錄）
3. 確認 Automate 已授予「顯示通知」權限

## Intent URL 格式

PWA 呼叫時產生的 intent URL 範例：

``` md
intent://#Intent;action=net.llamalab.automate.intent.action.START;package=net.llamalab.automate;S.net.llamalab.automate.intent.extra.FLOW_NAME=NBL_Timer;S.net.llamalab.automate.intent.extra.VARIABLES={"started":true,"timerMinutes":30,"taskTitle":"My Task"};end
```

| Extra Key (String)                                | 說明              |
|---------------------------------------------------|-------------------|
| `net.llamalab.automate.intent.extra.FLOW_NAME`    | Flow 名稱         |
| `net.llamalab.automate.intent.extra.VARIABLES`    | JSON 字串，注入變數 |

## NBL_Timer Flow 邏輯

``` js
FlowStart
  └─ IfExpression: started?
        ├─ true  → NotificationPost (ongoing=true, ID=1001)
        │            └─ Delay (timerMinutes * 60000 ms)
        │                 └─ NotificationPost (ongoing=false, 完成提示)
        │                      └─ FlowEnd
        └─ false → NotificationCancel (ID=1001)
                        └─ FlowEnd
```

- **Ongoing 通知**（`started=true`）：鎖定在狀態欄，無法被下滑移除，讓你隨時知道計時中。
- **結束時**（`started=false`）：取消 ID=1001 的通知，並發出完成音效振動。

## 背景執行 / 耗電說明

使用 **start-by-name intent** 方式：

- Flow **不需要一直在背景跑**。
- 每次 web app 觸發，Automate 啟動一個新的 flow instance。
- Flow 跑完自動結束，幾乎不影響電池。
- 計時期間 Automate 使用 Android Delay（系統排程），耗電極低。

## 自訂設定（localStorage）

PWA 讀取 `nbl_automate_config` 來覆蓋預設值：

```jsonc
{
  "flowName": "NBL_Timer",   // Automate 中的 flow 名稱
  "timerMinutes": 25         // 預設計時分鐘數
}
```

## 關於 Action Name

若你未來想改用 **Broadcast Receive** 方式（讓 flow 一直等待），可自訂 action：

``` js
com.yescirculation.nonblockinglife.automate
```

長度完全沒問題，Android intent action 只是字串，無長度限制，命名純屬自由。
不過目前的 start-by-name 方式不需要自訂 action。

## [2026-05-26] Gemini 回答

您的直覺非常敏銳！Copilot 給您的這段 `.flo` JSON 結構以及 `shortcutUtils.ts` 裡的傳參方式，**在當前新版的 Android Automate（LlamaLab）中確實已經無法直接運作了**。

這裡有兩個致命的架構問題，以及如何在 Canvas（畫布）上正確實作的完整指南。

---

## 為什麼舊方法不能用？（精準診斷）

### 1. `VARIABLES` 欄位不再接受單純的 JSON 字串

在較新版的 Automate 中，透過外部 Intent 啟動 Flow 並傳遞變數時，`net.llamalab.automate.intent.extra.VARIABLES` 這個 Extra 預期接收的是一個 **Android Bundle (Dictionary)**，而不是一個被 `JSON.stringify()` 編碼過的「字串」。

* **舊寫法**：`S.net.llamalab.automate.intent.extra.VARIABLES={"started":true,...}`（這會被當作單一字串，Flow 進去後無法解包成多個變數）。
* **新機制**：Automate 原生支援將傳入的 Bundle Extras 直接對應到 Flow 的「**Flow beginning**」區塊中定義的 **Input Arguments**。

### 2. 畫布（Canvas）上的元件誤區

JSON 裡寫的 `FlowStart` 區塊，在 Automate 的圖形介面裡其實叫做 **「Flow beginning」**。新版要接外部參數，完全不需要自己寫邏輯去拆解 JSON 字串，而是要直接在第一個節點做點擊設定。

---

## 修改方案：網頁端調用代碼修正 (`shortcutUtils.ts`)

我們必須將 Intent 的建構方式，從傳送一個複雜的 JSON 字串，改為標準的 **Android Intent Extra 鍵值對**。Android Intent 語法中，`S.` 代表 String，`B.` 代表 Boolean（注意：有些系統對 `B.` 支援度有邊界，通常建議改用 `X.` 或直接利用 Automate 接受的型態定義，但最安全且不易出錯的方法是**全部用 String (`S.`) 傳過去，在 Automate 裡面一鍵轉型**，或者直接用標準型態）。

請將 `buildAutomateIntentUrl` 修改為以下結構：

```typescript
export function buildAutomateIntentUrl(config: AutomateConfig): string {
  const action = "net.llamalab.automate.intent.action.START";
  const pkg = "net.llamalab.automate";
  
  // 1. 指定要啟動的 Flow 名稱
  const flowExtra = `S.net.llamalab.automate.intent.extra.FLOW_NAME=${encodeURIComponent(config.flowName)}`;
  
  // 2. 將變數直接拆解為獨立的 Extra 傳入，不要打包成單一 JSON 字串
  // 使用符合 Automate 規範的獨立命名空間（例如用變數名本身，或加字首）
  // 這裡直接對應到 Flow beginning 的引數名稱
  const varStarted = `S.started=${encodeURIComponent(config.started ? "true" : "false")}`;
  const varMinutes = `S.timerMinutes=${encodeURIComponent(config.timerMinutes.toString())}`;
  const varTitle = `S.taskTitle=${encodeURIComponent(config.taskTitle ?? "")}`;

  // 組合標準 Android Intent 網址
  return `intent://#Intent;action=${action};package=${pkg};${flowExtra};${varStarted};${varMinutes};${varTitle};end`;
}

```

---

## Android Automate 畫布（Canvas）實作指南

要在手機上的 Automate 完美重現這個計時器功能，請按照以下步驟手動拉出方塊並設定：

### 1. Flow beginning (起點)

* **元件位置**：每個新 Flow 預設自帶的起點。
* **設定方式**：

1. 點擊它進入設定。
2. 找到 **Input arguments** (輸入引數) 區塊。
3. 新增三個變數（名稱必須與 TypeScript 傳過來的 Key 完全一致）：

* `started`
* `timerMinutes`
* `taskTitle`
*(叮嚀：因為我們在網頁端改用字串 `S.` 傳遞以確保 100% 傳入成功，進入 Flow 後，這三個變數會是字串型態。)*

### 2. Expression true? (對應 JSON 中的 IfExpression)

* **元件位置**：`Flow control` -> `Expression true?`
* **設定方式**：
* **Expression** 輸入：`started = "true"`
* **連線**：
* `OK` (True) 往下連到「顯示通知」。
* `NO` (False) 往右連到「取消通知」。

### 3. Notification show (對應 NotificationPost - 啟動時計時)

* **元件位置**：`Interface` -> `Notification show`
* **設定方式**：
* **Title**：`"▶ " ++ taskTitle` *(注意：Automate 的字串拼接符號是 `++`，不是 `&`)*
* **Message**：`"Timer running · " ++ timerMinutes ++ " min"`
* **Notification ID**：`1001` *(手動輸入數字)*
* **Proceed**：選擇 `Immediately` (這樣它才會繼續往下走去倒數，而不會卡在這邊等使用者點通知)
* **Ongoing**：勾選 (防止被使用者不小心滑掉)
* **Sound / Vibrate**：皆不勾選 (安靜地在背景跑)

### 4. Delay (計時等待)

* **元件位置**：`Date & time` -> `Delay`
* **設定方式**：
* **Duration**：點擊右側的 `fx` 切換成表達式模式，輸入：`toNum(timerMinutes) * 60`
*(說明：新版 Automate 的 Delay 預設單位是「秒」，所以是分鐘乘以 60。`toNum()` 可以確保剛才傳進來的字串安全轉成數字。)*

### 5. Notification show (計時結束通知)

* **元件位置**：再拉一個 `Interface` -> `Notification show`
* **設定方式**：
* **Title**：`"✅ " ++ taskTitle ++ " done"`
* **Message**：`timerMinutes ++ " min timer finished"`
* **Notification ID**：`1001` *(使用相同的 ID，舊的「執行中」通知就會被這個「完成」通知覆蓋並解鎖 Ongoing 狀態)*
* **Proceed**：選擇 `Immediately`
* **Ongoing**：**不勾選**
* **Sound / Vibrate**：**勾選** (提醒您時間到了)

### 6. Notification cancel (對應另一條分支的取消)

* **元件位置**：`Interface` -> `Notification cancel`
* **設定方式**：
* **Notification ID**：`1001`
*(當您在網頁端點擊「結束/取消」任務時，Flow 會走 NO 分支，直接把 ID 1001 的通知砍掉，達成即時收尾的效果。)*

---

## 💡 總結大局觀

調整後的流程完全繞開了舊版容易失敗的 JSON 格式，改走 Android 最經典的 **「Intent Extra 直傳 -> Flow 引數直接接收」** 機制。在畫布上連線時，請確保從 `Flow beginning` 的 `OK` 連到 `Expression true?`，之後分流成兩路（一路走計時、一路走取消），最後各自接回圓形的 `Flow end` 即可！

# Android Automate 整合說明

## 架構概述

NonBlockingLife (PWA) 透過 **Android Intent URL** 觸發 [LlamaLab Automate](https://llamalab.com/automate/) flow。

```
[PWA 網頁]  → intent:// URL → [Android Chrome] → [Automate app] → [NBL_Timer flow]
```

## 前置條件

1. 安裝 [Automate](https://play.google.com/store/apps/details?id=net.llamalab.automate)
2. 匯入 `NBL_Timer.flo`（本目錄）
3. 確認 Automate 已授予「顯示通知」權限

## Intent URL 格式

PWA 呼叫時產生的 intent URL 範例：

```
intent://#Intent;action=net.llamalab.automate.intent.action.START;package=net.llamalab.automate;S.net.llamalab.automate.intent.extra.FLOW_NAME=NBL_Timer;S.net.llamalab.automate.intent.extra.VARIABLES={"started":true,"timerMinutes":30,"taskTitle":"My Task"};end
```

| Extra Key (String)                                | 說明              |
|---------------------------------------------------|-------------------|
| `net.llamalab.automate.intent.extra.FLOW_NAME`    | Flow 名稱         |
| `net.llamalab.automate.intent.extra.VARIABLES`    | JSON 字串，注入變數 |

## NBL_Timer Flow 邏輯

```
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

```
com.yescirculation.nonblockinglife.automate
```

長度完全沒問題，Android intent action 只是字串，無長度限制，命名純屬自由。
不過目前的 start-by-name 方式不需要自訂 action。

## [2026-11-22] ychsue 謝謝您，我想把我們的對話濃縮後，放入我的PWA repository，如果未來或別人有同樣困擾時，可以有個參考，謝謝。😄

## MS Copilot's Answer

# 從 BridgeDispatcher 巨石到 Parser + Request + Executor

## 背景

為了支援 Desktop Shell 直接執行：

- `show-clock`
- `set-timer`

原本將邏輯直接寫入：

```csharp
BridgeDispatcher
```

以及：

```csharp
OpenExternalOrNavigate()
```

當功能增加後，開始出現：

- JSON Message 入口
- Protocol URI 入口

兩套流程重複實作同樣的業務邏輯。

例如：

```text
nbl:set-timer
```

與：

```text
nonblockinglife://set-timer
```

最終都會：

```csharp
_timers.Add(...)
```

但參數解析與執行邏輯散落在不同位置。

---

## 重構前

```text
Json Message
      ↓
BridgeDispatcher
      ↓
SetTimer

Protocol Uri
      ↓
OpenExternalOrNavigate
      ↓
SetTimer
```

### 問題

- 同一個 Action 被實作兩次
- 修改 Timer 行為時需要同步修改多處
- 容易產生功能漂移（Feature Drift）
- BridgeDispatcher 開始變成巨石類別（God Object）

---

## 重構目標

讓所有入口最終收斂到同一個執行流程。

```text
Json Message
      ↓
Parse
      ↓

      TimerRequest
            ↓
         Execute

      ↑
Parse
      ↑

Protocol Uri
```

核心概念：

```text
來源(Source)
   ↓
Parse
   ↓
Request
   ↓
Execute
```

---

## Request

建立純資料物件：

```csharp
public record TimerRequest(
    int DurationSeconds,
    bool SkipUi,
    string Title,
    string? Url
);
```

### 原則

Request 不負責解析來源格式。

只負責承載資料。

---

## Parser

建立專責 Parser：

```csharp
TimerRequestParser
```

提供：

```csharp
TimerRequestParser.FromJson(...)
```

以及：

```csharp
TimerRequestParser.FromUri(...)
```

範例：

```csharp
var request =
    TimerRequestParser.FromJson(req);
```

或：

```csharp
var request =
    TimerRequestParser.FromUri(uri);
```

---

## Executor

建立：

```csharp
NblActionExecutor
```

專責執行 Action。

例如：

```csharp
await NblActionExecutor.SetTimerAsync(...)
```

```csharp
await NblActionExecutor.ShowClockAsync(...)
```

```csharp
await NblActionExecutor.PWAUrlAction(...)
```

---

## 重構後架構

```text
BridgeDispatcher
│
├─ Route Message
│
├─ Parse Request
│
└─ Execute Action


Parsers/
├─ TimerRequestParser
└─ ShowClockRequestParser


Requests/
├─ TimerRequest
└─ ShowClockRequest


Actions/
└─ NblActionExecutor
```

---

## 為什麼不用 TimerRequest.ParseFromJson()

一開始曾考慮：

```csharp
TimerRequest.ParseFromJson(...)
```

以及：

```csharp
TimerRequest.ParseFromUri(...)
```

最後選擇：

```csharp
TimerRequestParser.FromJson(...)
```

原因是：

### Request 應該是資料

```csharp
TimerRequest
```

只描述：

```text
Timer 是什麼
```

---

### Parser 應該知道來源格式

```csharp
TimerRequestParser
```

知道：

```text
Json 長什麼樣子
Uri 長什麼樣子
```

因此責任更單純。

---

## 未來擴充的好處

之後若增加：

- Android Intent
- CLI
- IPC
- SignalR
- WebSocket

只需要新增：

```csharp
TimerRequestParser.FromAndroidIntent(...)
```

```csharp
TimerRequestParser.FromCli(...)
```

而不需要修改：

```csharp
TimerRequest
```

本身。

---

## 收穫

重構後：

✅ JSON 與 URI 共用同一套執行邏輯

✅ Timer 行為只維護一份

✅ ShowClock 行為只維護一份

✅ Dispatcher 開始專注於協定處理

✅ Action 開始專注於業務執行

✅ 未來新增入口成本降低

✅ 未來新增 Action 成本降低

✅ 尚未過度工程化（Over Engineering）

---

## 一個重要體會

當發現：

```text
Json 在做一次
Uri 又做一次
```

通常代表：

```text
Parse
與
Execute
```

尚未分離。

當改成：

```text
來源
 ↓
Parse
 ↓
Request
 ↓
Execute
```

很多重複邏輯會自然消失。

---

## 現階段的架構

目前不是：

```text
IIntent
IntentFactory
IntentRegistry
IntentPipeline
```

這種大型架構。

而是：

```text
Source
 ↓
Parser
 ↓
Request
 ↓
Executor
```

足以解決目前需求。

等未來 Action 增加到十幾種以上時，再考慮演進成正式的 Intent Architecture。

---

## 最後的心得

這次重構真正的價值並不是把程式碼拆成很多檔案，
而是將「解析來源格式」與「執行業務邏輯」的責任分離，
讓每個模組專注於自己的職責，
減少重複實作，
並為未來擴充不同來源的入口打下基礎。
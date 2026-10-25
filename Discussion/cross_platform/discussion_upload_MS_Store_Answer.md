# 答問

## [2026-10-24] Copilot 回覆

### README 評估

**做得好的地方**
- 願景很清楚：Event Loop、單執行緒大腦、防止主線阻塞，記憶點強。
- 架構（PWA、Desktop、TWA）和 Event Loop 的概念對應都交代了。
- Roadmap 有方向感。

**不適合直接給 Store 使用者的地方**
1. **開頭偏哲學，沒說它是什麼 app。** 一般使用者要的是一句話：「被打斷也能一鍵回到主線的任務管理與計時工具。」
2. **缺少使用情境。** 例如：做事做到一半被打岔，按 Interrupt，處理完 End，系統帶你回主線。這個流程應該有 3 步驟的說明，最好配截圖。
3. **內容偏開發者。** 目前的內容包含 Supabase、Dexie、Avalonia、`npm run dev`、MIT 授權。Store 使用者不需要這些，建議拆出去：
   - `README.md` 給開發者。
   - 另寫一份短的 `STORE_LISTING.md` 或在討論文件中維護 Store 文案。
4. **「Superconductorlike Society」沒有白話解釋。** 第一次看的人不知道是什麼。
5. **Windows 版的賣點被埋在「跨平台」裡。** 鬧鐘、計時器、自動啟動、自訂通知、`nbl://` protocol，這些才是 Store 版相對於 PWA 的價值，建議獨立成一段。
6. **隱私優勢寫得太淡。** 「資料只在你的裝置，不需註冊」對 Store 審核和使用者都是強項，要放前面。
7. **細節錯誤：**
   - 「Log 單向推送到 Sheets」與其他地方的 Supabase 不一致。
   - 「對列」應為「佇列」。
   - 「快速開始」寫成開發流程，不是使用者流程。
8. **Roadmap 的醫療與身心描述。** 「隨身導師與醫生」、「主動預警」這類字眼在 Store 上可能引發健康或醫療宣稱的疑慮，Store 文案建議避開，或改成「個人化建議」。

### 建議流程

1. 先確定一句話定位與三個核心賣點。
2. 依此重整 README：使用者段在前，開發者段在後。
3. 用同一份素材填 Store 清單：
   - **說明**：一句話定位、3 到 5 個賣點、使用情境、隱私說明。
   - **產品功能（最多 20 個）**：Start/End/Interrupt、Inbox、Task Pool、Micro Tasks、Scheduled、鬧鐘與計時器、自動啟動、自訂通知、ICS 匯入匯出、離線與本地優先、可選雲端同步等。
   - **關鍵字（最多 7 個）**：例如 `任務管理`、`待辦`、`計時器`、`專注`、`ADHD`、`時間管理`、`事件循環`。
   - **簡短描述**：約 100 字以內。
   - **語言**：Store 至少要有繁體中文和英文版，英文版別漏。
4. 螢幕擷取畫面建議 4 張：任務主畫面、Interrupt 流程、Scheduled 與計時器、同步或設定。

要我先幫你起草 Store 的「說明」、功能清單和關鍵字（中英文），並順手改寫 README 嗎？

---

## [2026-10-24] Copilot 回覆 (續)

不是，您說得對：**startup 本身不需要 `runFullTrust`**，我上一則把原因混在一起了。

### 各功能的實際依賴

| 功能 | 是否需要 runFullTrust |
|---|---|
| 開機啟動（`windows.startupTask`） | 不需要。這是 `uap5` 擴充，packaged 的 UWP 也能用。 |
| `nonblockinglife://` 協定 | 不需要 |
| 鬧鐘與計時、自訂 Toast 視窗、開啟外部連結 | 單獨看不需要，UWP 也能做 |
| **執行 Win32／.NET 桌面 exe** | **需要，這才是根本原因** |

### 真正的原因

`runFullTrust` 是讓 MSIX 封裝的「傳統桌面程式」(Win32/.NET exe) 能在 AppContainer 沙盒外執行的能力。你的 `Package.appxmanifest` 裡的 startup 設定是：

```xml
EntryPoint="Windows.FullTrustApplication"
```

這代表 startup 啟動的對象是 full-trust 桌面 exe。換句話說，是**這個 exe 需要 runFullTrust，startup 只是順便啟動它**。而 `Nbl.Desktop.exe` 是 Avalonia/.NET 自包含程式，不能變成 UWP，所以一定要這個能力。

### 建議給 Microsoft 的回覆（修正版）

```text
NonBlockingLife is an Avalonia/.NET Windows desktop application packaged as an MSIX. It is a Win32/.NET desktop executable (Nbl.Desktop.exe), not a UWP app, so it requires the runFullTrust capability in order to run outside the AppContainer sandbox.

The app hosts its web-based user interface in a native desktop window and provides desktop features such as alarms, timers, and custom notifications. It also registers the nonblockinglife:// URI scheme and declares an optional startup task, disabled by default and controlled by the user, that launches the same desktop executable.

runFullTrust is required because the entire application is a full-trust desktop process. It is not used to request administrator privileges.
```

重點是說「整個應用程式是桌面 exe」，不要把 startup 或 protocol 說成是需要 `runFullTrust` 的理由，審核者會看得出來。


**不行，換掉 startup 並不能讓你不需要 `runFullTrust`。**

### 原因

- startup 沒有「要不要 full trust」的選項，它只是啟動別人。
- 你的設定是 `Executable="Nbl.Desktop\Nbl.Desktop.exe"`，啟動的目標就是 Avalonia/.NET 桌面 exe。
- 要讓這個 exe 跑在 MSIX 裡，就必須有 `runFullTrust`，與有沒有 startup 無關。
- 就算整個刪掉 `NblStartup`，`Application` 的 `Executable="$targetnametoken$.exe"` 仍然是桌面程式，一樣需要它。

### 什麼情況才可以不用

只有整個 app 改成 **UWP / WinUI 3 packaged（沙盒）** 才行。但你的程式用 Avalonia、WebView2、NAudio/LibVLC、`HttpListener` 本機伺服器、`Process.Start` 等，這幾乎等於重寫，不實際。

### 結論

- 這個問題**不能跳過**，需要照實回答，用上一則「整個 app 是桌面 exe」的版本即可。
- 這類 .NET 桌面 app 申請 `runFullTrust` 很常見，通常會核准。
- 可順手整理 manifest：startup 與 protocol 保留沒問題，不必為了這題移除。
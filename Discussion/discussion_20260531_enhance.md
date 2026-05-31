# 對了，我問一下，像我這個PWA，在電腦上也安裝成PWA，請問我有甚麼辦法可以讓使用者就算沒有看到PWA App 主體 (但他是開著的，因為躲在background還能作用應該比較難吧？還是很簡單？)也能清楚知道現在是在工作中，應該就是 !!runningTask === true 的情形吧？有沒有甚麼建議呢？

## [2026-05-31] GitHub Copilot 的回答

你這題很關鍵，我會先用你目前程式結構（尤其 runningTask 與 SelectionCache 的流程）給你一份可實作的方案清單，分成「最容易先上線」到「進階」；重點是讓使用者在 App 不在前景時，仍能明確感知「正在工作中」。

你這個方向非常對，而且可以做得很實用。  
先講結論：純 PWA 可以做到「前景外仍可提醒使用者目前在工作中」，但能力分層很明顯。

最重要的現實限制：
1. 只要視窗還開著（即使在背景），前端程式通常還在，但計時器會被瀏覽器節流。
2. 如果視窗被完全關掉，前景 JS 就停了；只能靠 Service Worker 事件型能力（例如通知、push），不能像桌面常駐程式那樣一直跑邏輯。
3. 所以要用「多層提示」而不是只靠一種方式。

你現在最值得先做的 4 層提示（由易到難）：
1. 文件標題提示（最便宜、立即有效）
2. App Icon Badge（Chromium 桌面 PWA 很有感）
3. 系統通知（開始工作、每隔一段時間提醒、結束時清除）
4. 可選的聲音/震動替代提示（桌機通常是聲音）

你目前已有 runningTask 狀態來源，在 SelectionCacheTable.tsx 就有使用，因此很適合把提示邏輯做成全域 hook，掛在 App 根節點，而不是放在單一表格元件。

建議實作架構：
1. 新增一個全域 hook，例如 useRunningTaskPresence。
2. 監聽 runningTask 變化。
3. runningTask 存在時：
   1. 設定 document.title 為「⏳ 工作中 - 任務名稱（已過 mm:ss）」。
   2. 呼叫 navigator.setAppBadge(1)（若支援）。
   3. 送出一次「已進入工作模式」通知。
4. runningTask 清空時：
   1. 還原 document.title。
   2. 呼叫 navigator.clearAppBadge()。
   3. 送出「工作已結束」通知（可選）。
5. 背景提醒可做成低頻（例如 15~30 分鐘一次），避免干擾。

一個可直接套的概念範例：

```ts
useEffect(() => {
  if (!runningTask) {
    document.title = "NonBlockingLife"
    if ("clearAppBadge" in navigator) navigator.clearAppBadge()
    return
  }

  if ("setAppBadge" in navigator) navigator.setAppBadge(1)

  const updateTitle = () => {
    const mins = runningTask.startAt
      ? Math.max(0, Math.floor((Date.now() - runningTask.startAt) / 60000))
      : 0
    document.title = `⏳ 工作中 ${mins}m - ${runningTask.title || runningTask.taskId}`
  }

  updateTitle()
  const id = window.setInterval(updateTitle, 30000)
  return () => window.clearInterval(id)
}, [runningTask])
```

通知層的建議：
1. 只在狀態切換時通知（Start/End）就已經很有用。
2. 進階才做週期提醒，且提供開關。
3. 通知文案重點是可行動，例如「你正在專注中：要結束嗎？」並帶開啟 App 的行為。

你問的「躲在 background 還能作用是不是很難」：
1. 不難做到「提示存在感」。
2. 難的是「高精度、長時間背景計時與複雜邏輯」。
3. 你的場景其實不需要硬背景運算，只要狀態提醒和明確回流入口即可，PWA 很適合。

如果你要，我可以下一步直接幫你做：
1. 全域 runningTask 標題 + Badge（先做最穩的）
2. 通知權限流程 + Start/End 通知
3. 可設定的「每 X 分鐘提醒一次」開關 UI

---

## [2026-05-31] GitHub Copilot 的補充

我會直接幫你落地第一版：先做全域的標題列 + App Badge，並加上可選的 Notification（有權限才送、沒權限不打擾），這樣你可以馬上在 Windows PWA 測到效果。先快速掃一下 src 的入口掛載點再實作。

Searched for files matching `**/pwa/src/**/*.{ts,tsx}`, 20 matches

Searched for regex `createRoot|App\(|<App|useAppStore\(|runningTask|setAppBadge|Notification` (`**/pwa/src/**/*.{ts,tsx}`), 20 results

我找到主入口就在 App.tsx，而且已經有 runningTask 狀態可用；接著我會把 Badge/Title/Notification 做成同一段全域 effect 掛在這裡。

Read [](file:///c%3A/Users/hsuy1/OneDrive/Documents/2026/NonBlockingLife/pwa/src/App.tsx)

我會在 App.tsx 直接加一段全域效果：`runningTask` 有值時更新標題與 badge，狀態切換時若已授權且頁面在背景就發 Notification。這樣你不用改各個 table。

Generating patch (94 lines) in [](file:///c%3A/Users/hsuy1/OneDrive/Documents/2026/NonBlockingLife/pwa/src/App.tsx)


```

```


Checked [](file:///c%3A/Users/hsuy1/OneDrive/Documents/2026/NonBlockingLife/pwa/src/App.tsx), no problems found

已幫你做了，而且是「有用到 Notification，但是可選、非強制」的做法。

這次實作內容在 App.tsx：
1. 全域監聽 runningTask 狀態（不綁單一頁面）。
2. runningTask 存在時：
1. 更新標題列為「⏳ 分鐘數 + 任務名稱」。
2. 呼叫 setAppBadge(1)（瀏覽器支援時）。
3. 若 Notification 已授權且頁面在背景，發一則「工作進行中」通知。
3. runningTask 結束時：
1. 還原原本標題。
2. 呼叫 clearAppBadge()（瀏覽器支援時）。
3. 若 Notification 已授權且頁面在背景，發一則「工作已結束」通知。

你問的重點「是用 Notification 提示嗎？」：
1. 有，但我做成「輔助層」。
2. 核心提示是標題 + Badge（最穩）。
3. Notification 只有在使用者已授權時才會發，不會硬跳權限視窗。

補充你在 Windows 的期待：
1. Badge 會盡量顯示在已安裝 PWA 的工作列圖示上。
2. 但是否顯示數字 (1) 取決於瀏覽器與系統整合，可能是點或標記，不保證一定是 (1)。

如果你要，我下一步可以加一個「通知開關 + 一鍵請求通知權限」在設定區，讓使用者自己決定是否開啟背景提醒。

已進行變更。

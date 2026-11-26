# 在 Android 上面，分享會若此App尚未開啟，則會分享失敗，然後，每次翻轉手機，就會再次分享相同的內容

## [2026-11-25] MAI Code 2 分析的結果，解決了問題

我會檢查 `WebViewActivity` 的頁面載入時序、`ACTION_SEND`/`onNewIntent` 與 `onCreate` 的生命週期；這兩個症狀很像是 intent 沒有被 consume，以及配置變更後又重送同一個 intent。

確認後，300ms 不是可靠同步點：首次啟動時 `WebView` 載入、React mount、`useTwaRpc` effect、Android port injection 各有不同完成時間；而翻轉會讓 `onCreate(savedInstanceState != null)` 再拿到原始 share intent。下一步我會把「intent 消耗」與「PWA bridge 已就緒後投遞」分開，並避免旋轉重播。

我會直接修正這兩個根因：首次啟動把分享 action 排入等待，等 `__NBL_TWA_BRIDGE__` 真正可用後才送；另外保存/恢復 WebView 與待送 action，並只在全新建立時消費 launch intent，避免旋轉重播。

修正已套用；現在只做編譯與生命週期邊界驗證。我也發現同一路徑還有一個 Kotlin 字串插值寫成 `$(...)`，它會產生固定 requestId，因此會一併改成真正唯一值。

是的，問題正是：

1. **300ms 不是 PWA ready 的保證**
   - App 尚未建立時，首次載入可能超過 300ms。
   - 此時 `AndroidPort` 尚未注入，`nbl:url-action` 會被丟掉。
   - 已開著 App 時 bridge 已存在，所以能正常加入 Inbox。

2. **旋轉手機會重新建立 Activity**
   - `onCreate()` 再次收到原本的分享 Intent。
   - 原本沒有判斷 `savedInstanceState`，所以每次旋轉都重新處理。

已在 `WebViewActivity.kt` 修改：

- 新啟動時，分享 action 先放入 pending queue。
- 等 `onPageFinished()`，並確認 `window.__NBL_TWA_BRIDGE__`、`AndroidPort` 注入成功後才送出。
- WebView 與 pending action 一起保存、恢復。
- `savedInstanceState != null` 時不重新處理 launch Intent。
- 已成功處理的 Intent 會被清除。
- 改用真的唯一 `host_requestId`，避免前端 dedupe 誤判。

`AndroidBridge.kt` 的 `injectAndroidPortMock()` 現在會回傳 bridge 是否真正就緒。

所以你原先把程式放在 `handleIntent` 本身沒有錯，但不能直接固定延遲後送；應該：

> 建立 pending action → 等 bridge injection callback 完成 → `nbl:url-action`

另外，PWA 的 `lastMessage + replay: true` 也能確保訊息在 `useTwaRpc` listener 尚未掛上時不會丟失。

驗證：`:app:compileDebugKotlin` 編譯成功。
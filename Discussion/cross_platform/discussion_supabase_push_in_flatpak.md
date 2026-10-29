# Supabase 的 push 在 flatpak 上常常失敗

## [2026-10-28] ychsue 我發現這個專案利用 flatpak 編譯的，由 PWA 所送出的supabase 的 push剛開始會失敗，得等個一段時間，才有機會可以 push 出去， pull  感覺上是好的。
其他的平台，甚至 deb 也正常，請問您覺得可能原因為何？還有，應該怎解呢？

## [2026-10-28] GitHub Copilot 回覆

我還沒有實際重現，也沒有看到錯誤訊息，下面只是依程式結構做的推測，並非確診。

**可能原因（依可能性排序）**

1. **冷啟動時的網路還沒就緒（最可能）。** Flatpak 內的 WebKitGTK 是用 runtime 49 自帶的版本，網路走 libsoup 和 glib-networking。deb 則用系統的 WebKit。App 一啟動就 push 時，DNS 或 TLS 可能還沒就緒。IPv6/IPv4 的 Happy-Eyeballs 逾時、sandbox 裡的 resolv.conf/portal 代理，都會造成「前幾分鐘 fetch 失敗，之後自己好」。Pull 看起來正常，可能是失敗後被重試或使用者沒注意到。
2. **Push 是 POST/PATCH，會先送 CORS preflight。** App 的來源是 `LocalStaticServer` 的 `http://localhost:port`。第一次 preflight 若失敗，WebKit 會快取失敗結果一段時間，所以要「等一陣子」才能 push。Pull 的 GET 若是簡單請求就不受影響。
3. **`navigator.onLine` 或網路狀態判斷錯誤。** Flatpak 沒有 NetworkManager 的 D-Bus 存取權時，WebKit 可能一開始誤判為離線。這種情況也可能被 push 前的檢查擋掉。

**建議的解法與驗證**

- **在 `SupabaseSyncManager.ts` 的 push 加上有限次數、指數退避的重試**，只針對網路錯誤（`TypeError: Failed to fetch`）。這樣不會誤增 `retryCount`，也不會被判成衝突。同時監聽 `online` 事件，上線後自動補推。
- **在 yml 的 `finish-args` 加上 `--system-talk-name=org.freedesktop.NetworkManager`**（若有用到 `navigator.onLine`）。
- **確認是哪一種原因：** 用 `flatpak run --env=WEBKIT_DEBUG=Network <app-id>` 看失敗請求。如果是 DNS 或連線逾時就是原因 1，如果是 preflight 失敗就是原因 2。再看 push 失敗時 console 的錯誤訊息，這是區分三種原因的關鍵。
- **對照實驗：** 在 flatpak 內先 `flatpak run --command=sh <app-id>`，用 `curl -v https://<project>.supabase.co` 看是否也慢。若 curl 也慢，就是 sandbox 網路或 IPv6 問題。

如果你貼出失敗時的錯誤訊息，我可以進一步縮小範圍，也可以幫你實作重試邏輯。

---

## [2026-10-28] GitHub Copilot

不用改程式碼。`--source dev` 參數已經支援，預設是 `online`（載入線上 PWA），所以 flatpak 實際跑的很可能是線上版。

**直接用參數測試（不動 code）：**

```
flatpak run com.yescirculation.nonblockinglife --source dev --dev-url http://localhost:5173/
```

Flatpak 已有 `--share=network`，所以 sandbox 內可以連到主機的 localhost:5173。先在 `pwa/` 跑 `npm run dev`。

**這個實驗的意義：**
- Dev 模式下 `e.EnableDevTools = true` 在 `MainWindow.axaml.cs` 會生效。對 WebView 按右鍵選「Inspect Element」，就能在 Network 和 Console 分頁看到 push 失敗時的真實錯誤。這比 `WEBKIT_DEBUG` 有用，因為 `Network` 不是有效的頻道。
- 若你想看 WebKit 的記錄，可以改用 `WEBKIT_DEBUG=Network` 以外的方式，例如 `G_MESSAGES_DEBUG=all`，或 `SOUP_DEBUG=1`（依 runtime 版本而定）。

**目前線索：**
- `curl` 正常，表示 sandbox 的 DNS 與網路本身沒問題，我先前的原因 1 的「sandbox DNS」部分可以排除。剩下的是 WebKit 自己的行為（preflight 快取、`navigator.onLine`、TLS/代理），要靠 DevTools 的錯誤訊息確認。

請在 push 失敗時貼出 Console／Network 的錯誤，我再幫你鎖定原因。

---

## [2026-10-28] ychsue flatpak run com.yescirculation.nonblockinglife --source dev
只要按右鍵跑 inspect，它的WebView就會卡住。
不過，有趣的是，竟然使用 --source dev 就不會有問題，但換成 --source online 就會出問題，為甚呢？

## [2026-10-28] GitHub Copilot (Claude Sonnet 5.5) 回覆

先更正一點：我先前說來源是 `LocalStaticServer` 的 localhost，那是 `dist` 模式。`online` 載入的是 `https://ychsue.github.io/NonBlockingLife/`，所以我的原因 2 的前提不成立。

**為什麼 dev 正常、online 有問題（推測）**

這兩種模式差別很大：

| | dev | online |
|---|---|---|
| Origin | `http://localhost:5173` | `https://ychsue.github.io` |
| Service Worker | 沒有（`devOptions.enabled: false`） | 有（vite-plugin-pwa 的 workbox） |
| 資源 | 即時從 Vite 取得 | 由 SW 預快取並接管 |

最可能的原因是 Service Worker：

1. **SW 在 flatpak 的 WebKitGTK 上啟動或接管較慢。** 首次載入、更新版本時，`install`、`activate`、`clientsClaim` 之間有空窗，這時 fetch 會被 SW 攔截並失敗，或 SW 還在啟動、請求被延遲。這與「等一段時間才能 push」吻合。
2. **Pull 正常、push 失敗**可能是 SW 的 `runtimeCaching` 或 `NetworkFirst` 只涵蓋 GET，而 POST/PATCH 會走 SW 的 fetch handler，在 SW 未就緒時出錯。
3. **Flatpak 的 WebKit 資料目錄是持久的。** deb 與 flatpak 的 SW 快取與 WebView 版本不同，舊 SW 與新資源可能版本錯位。

另外，dev 模式不是 https 且沒有 SW，所以它同時排除了這兩個變因。我還無法分辨是 SW 還是 https 的問題，需要實測。

**驗證方式：**
- 用 `--source dev --dev-url https://ychsue.github.io/NonBlockingLife/`：這樣 DevTools 可用，但 origin 與 SW 都跟 online 一樣，可以在 Application 分頁看 Service Workers 狀態。
- 另外，DevTools 一按就卡住，可能是 WebKitGTK 的 inspector 在 Avalonia 的 NativeWebView 上不穩定。改用 `WEBKIT_INSPECTOR_SERVER=127.0.0.1:9222` 並用 Epiphany 或 Chromium 之外的方式連線，比較不會卡住。
- 或直接在 PWA 的 push 失敗處把錯誤（`error.name`、`message`）顯示到 UI／記錄到 IndexedDB，這樣不用 Inspector 也能看到。

**可行的解法：**
- 在 `vite.config.ts` 的 workbox 設定中，確保 `skipWaiting: true`、`clientsClaim: true`，並讓 Supabase 網域走 `NetworkOnly`（或加入 `navigateFallbackDenylist`／不攔截跨站請求）。
- 或在桌面版（偵測到 WebView 環境）完全不註冊 SW，因為桌面殼本身已經是 app，不需要離線快取。
- 同時在 push 加上對網路錯誤的重試。

要不要我先看 vite.config.ts 的 workbox 設定，並直接實作「Supabase 請求不經 SW」？

## [2026-10-28] ychsue 由於這個專案已經在 PWA，Android WebView，Avalonia Windows，甚至 deb 都能正常動，在 flatpak隔了好幾分鐘還是不能 push ，傷腦筋。不過，接著就很正常。然後沒多久又失敗。但很快就好了。
所以，還是乾脆若是 flatpak (在 App.axaml.cs有個 IsFlatpak 可以知道吧？)就dist?不過，我就要先編譯 dist ，然後再包進去 flatpak，是這樣嗎？所以連 deploy-pwa.yml 可能也要改一下，這樣 flathub才能打包？
會否殺雞用牛刀？

## [2026-10-28] GitHub Copilot (Claude Sonnet 5.5)

這個錯誤很重要，它推翻了我先前的 Service Worker 推測。

**新判斷：根因是 WebKit 的 DNS 解析間歇失敗，不是 SW。**
- `Temporary failure in name resolution` 是 `EAI_AGAIN`，代表 WebKit 的名稱解析暫時失敗。
- 這正好符合「push 失敗、等一下又好」。Supabase 網域的解析一失敗，push 就失敗。
- 以前有 SW 把頁面殼層快取起來，所以頁面看起來正常，只有 Supabase 請求失敗。我的改動把 SW 拿掉後，連頁面都要重新解析 `ychsue.github.io`，問題就顯現出來了。
- `localhost:5173` 不需要 DNS，所以正常。`curl` 正常，但它跑在另一個行程環境，不代表 WebKit 的子行程也一樣。

我先把這個無效又有害的 SW 改動還原。

已還原 `MainWindow.axaml.cs`。你的主機用 systemd-resolved（`127.0.0.53` 的 stub）。

**可能的成因（尚未證實）：**
- WebKitGTK 在 flatpak 內會用 bubblewrap 再包一層子行程沙盒。網路行程在這層沙盒裡可能拿不到和主 app 一樣的 `/etc/resolv.conf`（它在 flatpak 內是指向 `/run/host/monitor/` 的連結）。
- 你的 `finish-args` 有 `--filesystem=host:ro`，它也會動到 `/run/host` 的掛載，可能也有影響。
- 主機端的 stub resolver 偶發逾時（例如 VPN、IPv6/AAAA 查詢），在 flatpak 的 WebKit 上更明顯。

**建議依序測試：**
1. 在 flatpak 內檢查與觀察：
   ```
   flatpak run --command=sh com.yescirculation.nonblockinglife
   ls -l /etc/resolv.conf; cat /etc/resolv.conf
   while true; do date +%T; getent ahosts ychsue.github.io >/dev/null || echo FAIL; sleep 2; done
   ```
   如果 `getent` 也會間歇失敗，就是主機或 stub resolver 的問題，和 WebKit 無關。
2. 若 `getent` 都正常，只有 WebView 失敗，就試著關掉 WebKit 的子沙盒：`flatpak run --env=WEBKIT_DISABLE_SANDBOX_THIS_IS_DANGEROUS=1 com.yescirculation.nonblockinglife`。這個變數名稱我是憑記憶寫的，你可以對照你的 WebKitGTK 版本的文件。它有安全風險，只用來診斷。
3. 暫時拿掉 `--filesystem=host:ro` 重建，看是否改善。
4. 不管根因為何，都建議在 `SupabaseSyncManager` 對 `TypeError: Failed to fetch` 做有限次數退避重試，不要算入 `retryCount`。

你先跑第 1、2 步並告訴我結果，我再決定要改 yml 還是加重試邏輯。

---

## [2026-10-28] ychsue 剛剛壞掉一下, GitHub Copilot 修理

我先看一下你這次的 `flatpak.log` 裡有沒有 DNS/權限線索，再判斷是建置方式還是執行環境問題。

你這次重建其實**有生效**（log 看到新 commit `a142b0...` 且已 reinstall），所以不是「沒重建到」。

關鍵是：  
重建只會換 app 檔案，**不會改變 WebKit 在 flatpak 內的 DNS 行為**。  
`Error resolving "...": Temporary failure in name resolution` 是執行期 DNS 解析問題（`EAI_AGAIN`），和你剛編譯的程式碼關聯很小。

我目前最懷疑的是：**WebKit 子行程在 flatpak 裡解析 DNS 時，跟主行程 (`curl`) 走到不同路徑**，所以你會看到：

- `curl -v` 在 `flatpak run --command=sh` 裡正常
- WebView 仍偶發 DNS 失敗  
- `localhost:5173` 正常（因為不需要 DNS）

---

### 先做兩個「不用改碼」測試（建議）

1) 先加 resolved 的 system bus 權限試跑（最快驗證）：
```bash
flatpak override --user --system-talk-name=org.freedesktop.resolve1 com.yescirculation.nonblockinglife
flatpak run com.yescirculation.nonblockinglife
```

2) 再加 NetworkManager（順便處理 onLine 可能誤判）：
```bash
flatpak override --user --system-talk-name=org.freedesktop.NetworkManager com.yescirculation.nonblockinglife
flatpak run com.yescirculation.nonblockinglife
```

如果症狀明顯改善，再把這兩條正式寫進 `com.yescirculation.nonblockinglife.yml` 的 `finish-args`。

---

### 為什麼你重建後還一樣？
因為你目前 manifest 的 runtime 權限只有：
- `--share=network`
- `--filesystem=host:ro`
- 沒有 `resolve1` / `NetworkManager` 的 system bus talk

這類 DNS 問題通常要靠 runtime 權限調整，不是重新 build 二進位就會好。

---

如果你要，我可以下一步直接幫你改 manifest（只改 desktop）：
- 在 `finish-args` 加 `--system-talk-name=org.freedesktop.resolve1`
- 加 `--system-talk-name=org.freedesktop.NetworkManager`
- 其餘不動。


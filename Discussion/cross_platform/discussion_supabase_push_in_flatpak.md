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

--- 

## [2026-10-28] ychsue 如何快速讓 flatpak 底下的網頁重抓？ Gemini 回答

當你的 PWA（Progressive Web App）包在 Flatpak 的桌面殼（底層通常是 WebKitGTK）中運行時，由於 Service Worker（SW）的強大快取機制，再加上桌面 WebView 的持久化快取資料夾，常常會發生「明明網頁原始碼更新了，但 App 內還是死守舊版本、甚至因為 SW 攔截了 API 請求導致 Supabase push 失敗」的情況。

要讓 Flatpak 安裝的程式**立刻重新抓取最新網頁、清除舊快取與 SW**，可以透過以下幾種最直接有效的方法來處理：

---

### 方法一：直接清除 Flatpak 的應用程式快取與資料目錄（最暴力、最徹底）

Flatpak 會將該 App 的所有 WebView 快取、Cookie、LocalStorage 以及 Service Worker 狀態隔離並儲存在使用者的家目錄中。直接把快取砍掉，就能強迫它下次啟動時抓取全新的網頁。

1. **完全關閉你的 NonBlockingLife 程式**。
2. 開啟終端機，執行以下指令清除該 Flatpak App 的快取與資料：
```bash
rm -rf ~/.var/app/com.yescirculation.nonblockinglife/cache/*
rm -rf ~/.var/app/com.yescirculation.nonblockinglife/data/*

```


3. 重新啟動程式：
```bash
flatpak run com.yescirculation.nonblockinglife

```


*這會讓 WebView 像是第一次安裝一樣乾淨，所有的 SW 和舊快取都會消失。*

---

### 方法二：在程式碼中加入「強制清除 SW 與快取」的除錯機制

既然你為了抓蟲（log）在 PWA 裡加了東西，如果你希望下次使用者（或你自己測試時）能自動或手動把舊的 Service Worker 卸載，可以在前端 JavaScript（例如 `main.js` 或進入點）加入這段**緊急清除腳本**：

```javascript
// 強制註銷所有 Service Worker 並清空 Cache Storage
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function(registrations) {
        for(let registration of registrations) {
            registration.unregister().then(function(success) {
                if (success) console.log('Service Worker 已成功強制卸載');
            });
        }
    });
}

if ('caches' in window) {
    caches.keys().then(function(names) {
        for (let name of names) {
            caches.delete(name).then(function(success) {
                if (success) console.log('快取清理成功: ' + name);
            });
        }
    });
}

```

*你可以暫時把這段程式碼放進你的 PWA 進入點，跑過一次讓 Flatpak 內的 SW 徹底死掉並更新後，再把它拿掉。*

---

### 💡 為什麼 `localhost:5173` 正常，但 PWA 常常 Supabase push 失敗？

這呼應了你前面提到的痛點，通常跟 **Service Worker 的 Fetch 攔截行為** 有關：

1. **開發環境 (`localhost:5173`)**：通常沒有註冊 Service Worker，或者 Vite 開發伺服器沒有做強烈的離線快取，所有的 `fetch`（包含 Supabase 的 POST/PUT 請求）都直接走真實網路發送。
2. **生產環境 PWA (配合 SW)**：
* 如果你的 `sw.js`（Service Worker）寫法不夠嚴謹，把所有對外請求（甚至包含 `[https://xxx.supabase.co](https://xxx.supabase.co)` 的 API 呼叫）都進行了攔截、快取，或者在離線狀態下回傳了錯誤的 Response。
* 當你在 Flatpak 內執行 Supabase **push（寫入/POST）** 時，Service Worker 可能誤判了網路狀態，或者把 POST 請求導向了錯誤的快取處理邏輯，導致請求送不出去或回傳失敗。



**建議檢查方向**：檢查你的 PWA Service Worker 程式碼，確保在 `fetch` 事件監聽中，**絕對不要攔截或快取任何非同源（CORS）或 API 請求**（例如明確排除 `supabase.co` 的網址），讓 API 請求永遠直連網路，這樣就能徹底解決在 Flatpak 內 push 失敗的靈異現象！

---

## [2026-10-29] ychsue 測試後結果
1. 刪掉 cache 與 data 後立即使用 `flatpak run com.yescirculation.nonblockinglife` 就沒問題 (在試完下面第二點再第二次測就不行了)
2. 刪掉 cache 與 data 後立即使用 `Win key` ，選這個APP，問題就來了
它跑出
``` txt
ERROR
Supabase Push Batch 失敗:
2026/10/29 上午10:33:11
Fail
{
  "message": "TypeError: Load failed",
  "details": "",
  "hint": "",
  "code": ""
}
```
我在supabase->logs 只看到 pull沒看到push的API
再次使用 `flatpak run ....` 也沒用。
關聯的程式為 [SupabaseSyncManager.ts](/pwa/src/utils/SupabaseSyncManager.ts) 與 [initialize.sql](/pwa/src/db/supabase/initialize.sql)
請問您覺得可能原因為何呢？

## [2026-10-29] Gemini 的回覆

是的，要把這段「總是放行 Supabase 請求」的 `fetch` 攔截程式碼加在你的 `sw.ts` 中，**最適合的位置就是在檔案的最上方，也就是在第一個 `addEventListener`（或 `precacheAndRoute`）之前**！

因為 Service Worker 的事件監聽器通常是依據事件到達時的匹配順序執行的，將它放在最前面，可以確保所有對 Supabase 的請求在進入快取或 Workbox 路由之前就被優先攔截並直連網路。

修改後的完整 `sw.ts` 範例結構如下：

```typescript
import type { PrecacheEntry } from "workbox-precaching";
import { precacheAndRoute } from "workbox-precaching";

declare const self: typeof globalThis & {
  __WB_MANIFEST: PrecacheEntry[];
  skipWaiting: () => Promise<void>;
  clients: {
    claim: () => Promise<void>;
    matchAll: (options: { type: string; includeUncontrolled: boolean }) => Promise<unknown[]>;
    openWindow: (url: string) => Promise<Window | null>;
  };
  location: Location;
};

const APP_URL = "/NonBlockingLife/";

// 💡 1. 優先加入這段：強制放行 Supabase API 請求，絕對不給 Service Worker 攔截或快取
self.addEventListener("fetch", ((event: Event & { request: Request; respondWith: (promise: Promise<Response>) => void }) => {
  const url = new URL(event.request.url);
  
  // 檢查是否為 Supabase 網域或相關 API 路徑
  if (url.hostname.includes("supabase.co") || url.pathname.includes("/rest/v1/") || url.pathname.includes("/rpc/")) {
    event.respondWith(fetch(event.request));
    return;
  }
}) as EventListener);

self.__WB_MANIFEST;
precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener("install", ((event: Event & { waitUntil: (promise: Promise<unknown>) => void }) => {
  event.waitUntil(self.skipWaiting());
}) as EventListener);

self.addEventListener("activate", ((event: Event & { waitUntil: (promise: Promise<unknown>) => void }) => {
  event.waitUntil(self.clients.claim());
}) as EventListener);

// ... 後續原本的 notificationclick 事件保持不變

```

透過這樣調整，Supabase 的任何網路通訊就能夠繞過 SW 快取機制，穩定地直接走網路傳輸，徹底解決在 Flatpak 或 PWA 內偶發的衝突與 `Load failed` 問題！

Service Worker（SW）之所以要「全面接管」所有對外與內部的 `fetch` 事件，核心目的在於達成 PWA 的兩大靈魂功能：**離線優先（Offline-First）** 與 **極速載入**。

以下為你整理 Service Worker 接管 `fetch` 的關鍵原因：

* **離線快取與頁面殼渲染**：當使用者在網路不穩或完全離線的狀態下打開應用程式，SW 必須透過攔截 `fetch`，將預先快取的 HTML、CSS、JS（即 `__WB_MANIFEST`）直接塞給瀏覽器，讓 App 能夠秒開。
* **統一的網路代理管理**：Service Worker 就像是一個夾在網頁前端與真實網路之間的「本地代理伺服器（Proxy）」。開發者可以透過它來決定哪些資源要走快取（Cache-First）、哪些要先看網路再更新（Stale-While-Revalidate）。

### 為什麼平常沒事，但在桌面殼或特定環境下會變成絆腳石？

正如我們前面討論過的，如果 SW 的 `fetch` 攔截範圍太寬泛，不小心把帶有複雜 Payload、認證 Header 的 **API 寫入請求（例如 Supabase 的 POST/PUT）** 也包進快取邏輯、或在背景換代（Update/Claim）時短暫打斷了連線，就會導致前端誤判並拋出 `TypeError: Load failed`。

這也是為什麼對於 **即時性、動態的後端 API（如 Supabase）**，我們必須在 `sw.ts` 的 `fetch` 的最前端明確寫出「排外條款」，強制讓它繞過 SW、直連網路，才能兼顧 PWA 的離線快取優勢與 API 呼叫的穩定性！

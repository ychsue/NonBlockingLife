# 關於跨平台的討論

## [2026-10-08] ychsue 這個APP 的主體是 @attachment:pwa ，然而，若想要使用鬧鐘、notification(雖然Web API 有，但是，像在 Android 若我使用 WebView 就得自己來)、抓取 ics (會遇到CORS)等問題，甚至 `分享` 也會是個問題， 因此，為了 Android 系統，多了一個外包裝，寫在 @attachment:twa 裡面。
我現在想把它擴展到 Windows 和 Linux 上面 (iOS, iMac 等行嗎？)，我會寫 C# (好久以前了😅)請問建議怎麼做好呢？專案結構應該怎麼規劃比較好？

---

## [2026-10-08] Copilot 回覆：Windows / Linux / macOS / iOS 擴展建議

### 1. 先講結論

- **PWA 維持唯一的 UI 與商業邏輯來源**，各平台只做「薄殼 (thin shell)」：載入 WebView + 提供原生能力 (鬧鐘/通知/抓 ICS/分享)。你在 Android 已經走出這條路 (`twa-pm-bridge.js` + `AndroidAlarmBridge`)，桌面端只是再多幾個 adapter。
- **桌面 (Windows + Linux + macOS) 用同一份 C# 專案**；**iOS 另外看待**。
- 目前最推薦：**Photino.NET**（輕量）或 **Avalonia + NativeWebView**（若之後想要原生 UI，如 tray 選單/設定視窗）。
  - 不建議 .NET MAUI：**不支援 Linux**。
  - 不建議 Electron：太肥，而且你不需要再寫 JS 原生層。
  - Tauri 也可，但要寫 Rust，沒必要。

### 2. 各選項比較

| 方案 | Win | Linux | macOS | iOS | 備註 |
|---|---|---|---|---|---|
| **Photino.NET** | WebView2 | WebKitGTK | WKWebView | ✗ | 極輕，C# 單一專案，有 JS↔C# 訊息、可攔截自訂 scheme |
| **Avalonia (+ NativeWebView)** | ✓ | ✓ | ✓ | ✓(需 Mac) | 有完整 UI 框架：tray、設定視窗；WebView 元件仍需留意各平台差異 |
| WPF/WinUI + WebView2 | ✓ | ✗ | ✗ | ✗ | 只做 Windows 最穩，但無法共用 |
| .NET MAUI Blazor Hybrid | ✓ | ✗ | ✓ | ✓ | 無 Linux，且 Blazor 對你沒有幫助（UI 已在 PWA） |
| Electron / Tauri | ✓ | ✓ | ✓ | ✗ | 非 C# |

> 建議路線：先用 **Photino.NET** 做出 Windows 版驗證 bridge 協定；Linux 只是同一份程式在 Linux 編譯＋安裝 `libwebkit2gtk`；若之後 tray / 原生設定頁需求變多，再換成 Avalonia（bridge 與 core 程式碼不需動）。

### 3. iOS / macOS（iMac）可不可以？

- **macOS：可以。** 與桌面共用 C# 殼 (Photino/Avalonia)，但**簽章與 notarization 需要 Mac + Apple Developer 帳號 ($99/年)**。
- **iOS：技術上可以**（Avalonia iOS 或原生 Swift 的 WKWebView），但：
  - 一定要有 Mac 才能 build / 上架，且 App Store 審核對「純網頁包殼」app 較嚴格（Guideline 4.2）。
  - iOS 沒有 Android 那種自由的背景鬧鐘；本地通知 (UNUserNotificationCenter) 可排程，但數量上限 64 則。
  - 你目前已有 **PWA + iPhone Shortcuts** (`ios/` 資料夾) 的路線，**建議 iOS 先維持現況**，等有明確痛點（分享、ICS CORS）再決定是否包殼。
  - iOS 上的 CORS 問題：可改由 **GAS 當 proxy 抓 ICS**（你已經有 GAS），不用原生殼。這招也適用於純 PWA 使用者。

### 4. 最關鍵的設計：統一的 Native Bridge 介面

現在 PWA 內有 `androidAlarmBridge.ts`、`useTwaBridge.ts`，是「Android 專用」。建議抽象成**平台無關的能力介面**，各平台提供 adapter：

```ts
// pwa/src/native/NativeBridge.ts
export type Capability = 'alarm' | 'notify' | 'fetchIcs' | 'share' | 'openExternal';

export interface NativeBridge {
  platform: 'web' | 'android' | 'windows' | 'linux' | 'macos' | 'ios';
  capabilities: Set<Capability>;
  scheduleAlarm(req: { id: string; atEpochMs: number; title: string; body?: string }): Promise<void>;
  cancelAlarm(id: string): Promise<void>;
  notify(req: { title: string; body?: string }): Promise<void>;
  fetchText(url: string, opts?: { headers?: Record<string,string> }): Promise<string>; // 繞過 CORS
  share(req: { title?: string; text?: string; url?: string }): Promise<void>;
}
```

- Adapter：`webBridge`（Web Notification / navigator.share / GAS proxy）、`twaBridge`（現有 MessagePort）、`desktopBridge`（Photino 的 `window.external.sendMessage` / `receiveMessage`，WebView2 則是 `chrome.webview`）。
- 啟動時偵測順序：`__NBL_TWA_BRIDGE__` → `window.external` (Photino) → web fallback。
- **用 capability 而不是 platform 判斷功能**，UI 只管「有沒有 `alarm`」。
- 訊息格式用 JSON：`{ v:1, id, type, payload }`，回應 `{ id, ok, result|error }`（request/response 以 id 配對），Android 與桌面共用同一份 schema。

### 5. 桌面端各功能的實作方式

| 功能 | Windows | Linux | macOS |
|---|---|---|---|
| 通知 | `Microsoft.Toolkit.Uwp.Notifications` / Windows App SDK `AppNotificationManager` | `org.freedesktop.Notifications` (DBus, `Tmds.DBus`) 或呼叫 `notify-send` | `UNUserNotificationCenter`（需原生互操作）或 `osascript` |
| 鬧鐘（排程） | 殼常駐 + 記憶體 `System.Threading.Timer`／持久化到檔案；重啟時重排。需要系統級時才用 Task Scheduler | 同左；可選 systemd user timer | 同左 |
| 抓 ICS (繞 CORS) | C# `HttpClient` 取回後傳給 JS（最簡單、最穩） | 同左 | 同左 |
| 分享 | 以「複製到剪貼簿 / 另存檔 / mailto」取代，Windows 另可用 `DataTransferManager`（需封裝） | 同左 | NSSharingService（可選） |
| 常駐 | System tray（Avalonia 有 `TrayIcon`；Photino 需另加） | 同左（GNOME 需 AppIndicator 擴充） | Menu bar |

> 鬧鐘在桌面最大的設計問題是「**App 關掉就不會響**」。建議：預設最小化到 tray 常駐，並開機自動啟動 (Windows: Startup 登錄；Linux: `~/.config/autostart`)。

### 6. ⚠️ 資料與來源 (Origin) 的陷阱

PWA 的 IndexedDB / localStorage 是**依 origin 隔離**。
- 若桌面殼載入**本機打包的 `pwa/dist`**（建議，離線可用），origin 會變成 `app://...` 或 `https://appassets.local`，**與線上 PWA 的資料不互通**。
- 你的架構是 local-first + GAS/Google Sheets 同步，所以資料互通本來就靠同步，這點可接受；但要確保「第一次開殼 → 從 GAS 拉資料」流程順暢，並在 Guide 裡說明。
- 若改成載入線上 URL：自動更新方便，但離線不能用、且有安全面（任何網頁可呼叫 bridge），必須在 C# 端**檢查來源**，只接受信任的 origin。
- 建議：**桌面殼打包 dist（離線），並用 versioned 方式更新**；bridge 訊息一律驗證 origin 與 schema。

### 7. 建議的專案結構

```text
NonBlockingLife/
├─ pwa/                      # 唯一的 UI + 邏輯 (Vite)
│  └─ src/native/            # NativeBridge 介面 + adapters (web/twa/desktop)
├─ twa/                      # Android 殼 (Kotlin)，維持現狀
├─ desktop/                  # ★ 新增：C# 桌面殼
│  ├─ NBL.sln
│  ├─ src/
│  │  ├─ Nbl.Bridge/         # 訊息協定 DTO、Dispatcher（純 .NET，無 UI 相依）
│  │  ├─ Nbl.Platform/       # 介面：INotifier / IAlarmScheduler / IHttpFetcher / IShare
│  │  ├─ Nbl.Platform.Windows/ Nbl.Platform.Linux/ Nbl.Platform.MacOS/   # 各平台實作
│  │  └─ Nbl.Desktop/        # Photino/Avalonia 主程式、tray、載入 pwa/dist
│  └─ tests/Nbl.Bridge.Tests/  # xUnit，可在 CI 任何 OS 跑
├─ protocol/                 # ★ 建議：bridge 訊息 JSON Schema（TS、Kotlin、C# 共同遵循）
├─ ios/ android/             # 目前只有文件（Shortcuts / Automate）
└─ docs/ Discussion/
```

重點：
- **`Nbl.Bridge` + `Nbl.Platform` 抽象不依賴 UI 框架**，以後換 Photino ↔ Avalonia 只換 `Nbl.Desktop`。
- 平台實作用 `RuntimeInformation.IsOSPlatform` 在 DI 註冊，或用 `net8.0-windows10.0.19041` 等 TFM 多目標。
- 發佈：`dotnet publish -r win-x64 / linux-x64 / osx-arm64`；Windows 用 MSIX 或 Inno Setup，Linux 用 AppImage/deb，Android 維持 Play。
- CI：GitHub Actions matrix (windows/ubuntu/macos) 各自 build；先 build `pwa` 再把 `dist` 複製到 `desktop` 輸出。

### 8. 建議的施作順序

1. 在 PWA 抽出 `NativeBridge` 介面，把現有 Android 邏輯包成 `twaBridge` adapter（**不改行為**，先加測試）。
2. 定義 `protocol/` 訊息 schema，Android 現有訊息對照過去。
3. 建 `desktop/` Windows 版（Photino）：載入 dist、通知、`fetchText`、tray、鬧鐘計時。
4. 同一份程式在 Linux 驗證（WebKitGTK、DBus 通知）。
5. macOS 視需要。
6. iOS：先用 GAS proxy + 現有 Shortcuts；有需求再評估。

### 9. 待你決定的問題

- 桌面版是否**必須在 App 關閉時也能響鬧鐘**？（若是，需要 OS 級排程，複雜度上升。）
- 想要 **Photino（極簡）** 還是 **Avalonia（可做原生 UI、日後可含 iOS）**？
- 桌面版載入**本機 dist** 還是**線上 URL**？（建議本機 dist。）

---

## [2026-10-08] ychsue 回覆與提問
1. 如果能App關閉，鬧鐘也能響比較好，這也是我為何在 Android 那裡使用手機內建的時鐘，而AlarmManager 只是備用方案(因為會受到重啟、電池優化等影響)。App 關閉就沒有鬧鐘在桌面應該還好的樣子，如果使用者是讓他常駐在工具列應該就會在那裏了，對嗎？
2. Avalonia 會很難維護嗎？若不會的話，Android 的部分就曾為了由 TWA -> WebView 過渡花了不少時間，最後只好跳船到 WebView。所以，感覺上Avalonia 可能是比較穩妥的選擇(不確定，會想用C#是因為 Windows 系統相容性應該更高，就算Linux出問題，至少 Windows 可以正常運作)。
3. 我不懂為何本機的 dist 比較建議？我是想說，大部分功能其實都在 PWA 端實現，桌面殼只是載入而已，這樣，我只要修改 PWA 的程式碼，重新 build dist，桌面殼就能自動使用最新版本，而不需要每個平台都去更新一次。而離線時，我這個PWA本身沒有後端，他的離線網頁照樣可以一如既往的運作。
4. 我已經慢慢由GAS 遷移到 [Supabase](pwa\src\utils\SupabaseSyncManager.ts) 了，請問有可能讓使用者自己的 Supabase 充當CORS的 proxy 嗎？



---

## [2026-10-08] ychsue 追問

1. App 關閉鬧鐘也要能響最好（Android 優先用系統時鐘，AlarmManager 只是備用）。桌面若常駐工具列，是否就沒問題？
2. Avalonia 會很難維護嗎？Android 從 TWA 過渡到 WebView 花了不少時間。選 C# 是因為 Windows 相容性高，Linux 出問題至少 Windows 能用。
3. 為何建議本機 dist？我想改 PWA、重 build 後，各平台殼自動用最新版；離線時 PWA 本身也能跑。
4. 已逐步從 GAS 遷到 Supabase（`pwa/src/utils/SupabaseSyncManager.ts`），能否讓使用者自己的 Supabase 當 CORS proxy？

## [2026-10-08] Copilot 回覆

### 1. 常駐 tray 就夠嗎？

大致正確：只要 tray 常駐 + 開機自動啟動，桌面端「程序在就會響」，對多數人足夠。要做到「真的關掉也響」，各 OS 有較便宜的選項，可列為進階：

| OS | 關閉後仍可提醒的做法 | 備註 |
|---|---|---|
| Windows | **Scheduled Toast**（`ScheduledToastNotification`，Windows App SDK） | 由系統排程，App 沒開也會跳；打包成 MSIX（有 package identity）最穩 |
| Linux | `systemd --user` transient timer（`systemd-run --user --on-calendar=... notify-send`）或 `at` | 發行版差異大，列為 best effort |
| macOS | `UNCalendarNotificationTrigger` 本地通知 | 系統排程，需原生互操作 |

建議分級（沿用 Android 的「主方案 + 備援」思維）：
1. 殼內計時器（App/tray 在就響）——**第一版就做**。
2. OS 排程通知（Windows Scheduled Toast 優先）——第二階段。
3. 桌面沒有「系統時鐘 App」可程式化設鬧鐘（Windows 的 Clock 沒有公開 API），所以不必比照 Android。

另外：鬧鐘清單要持久化到檔案，殼啟動時重排（對應 Android 重開機後重排）。

### 2. Avalonia 難維護嗎？

- 它是成熟、活躍的專案（MIT、.NET Foundation），本案「殼」很薄：視窗 + WebView + tray + 少量平台 API，所以維護面積小。與 TWA→WebView 的痛點不同：那次是**依賴 Google 的 TWA 行為**，這次依賴的是你自己能控制的 C# 程式碼。
- 真正的風險只有一個：**WebView 元件**（各平台背後是 WebView2 / WebKitGTK / WKWebView，Linux 最容易出狀況，且 Avalonia 的 WebView 方案版本間有演進，採用前請先確認當前版本的支援狀態與授權）。
- 降低風險的做法（重點！）：**把 bridge 與平台能力寫在不依賴 UI 框架的專案**（`Nbl.Bridge`、`Nbl.Platform`），殼只負責「把 WebView 的訊息餵給 Dispatcher」。這樣最壞情況是只重寫一個薄薄的 `Nbl.Desktop`：
  - Windows 要最穩 → 換成 WPF/WinForms + WebView2（Windows 專用，最成熟）。
  - Linux 有問題 → 單獨給 Linux 一個 Photino 殼，不影響 Windows。
- 結論：**你的想法合理，Avalonia 可當首選，Windows 為第一優先**。先做 Windows 驗證、Linux 當第二個目標，不要一開始三個平台同步開發。

### 3. 本機 dist vs 線上 URL —— 你說得對，我修正建議

我先前建議本機 dist 的理由是離線與 origin 穩定，但你的情境下它們都不是強理由：
- 離線：PWA 的 Service Worker 本來就會快取，載入線上 URL 一樣能離線（前提：**至少成功連線過一次**，WebView 的 profile/快取要持久化）。
- 更新：載入線上 URL 可「改一次 PWA，所有平台自動更新」，這對單人維護是最大優點，**勝過**多平台逐一發版。
- Origin：載入線上 URL 時 origin = 你的網站，儲存空間在殼自己的 WebView profile，與瀏覽器版 PWA 不互通（靠 Supabase 同步即可），與本機 dist 其實差別不大。

**修正後建議：載入線上 URL（Service Worker 負責離線）**，但要補上三件事：
1. **Bridge 安全**：C# 端只接受信任 origin（你的網域）傳來的訊息，並驗證 schema；否則任何被導向的頁面都能呼叫鬧鐘/抓網址。同時禁止殼內導航到其他網站（外部連結交給系統瀏覽器）。
2. **版本相容**：PWA 更新比殼快，可能出現「新 PWA 呼叫舊殼沒有的功能」。因此握手時殼回報 `{ shellVersion, protocolVersion, capabilities }`，PWA 依 capability 降級（正是前面 `NativeBridge.capabilities` 的用途）。
3. **首次離線**：第一次啟動若沒網路會是空白頁，殼內放一個小的離線提示頁即可；若日後在意，再加「內建 dist 作為 fallback」。

### 4. 用使用者自己的 Supabase 當 CORS proxy？

**可以**，用 **Supabase Edge Function**（Deno，伺服器端 fetch 不受 CORS 限制，再回傳帶 CORS header 的結果）。因為使用者本來就要建自己的 Supabase 專案，函式部署在他自己的專案，你不需要維護任何伺服器，費用與額度也由使用者的免費方案承擔。

流程：PWA →（帶使用者登入的 JWT）→ `fetch-ics` Edge Function → 抓 ICS → 回傳文字。

```ts
// supabase/functions/fetch-ics/index.ts（示意）
const cors = {
  'Access-Control-Allow-Origin': '*', // 建議改成你的 PWA 網域
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const { url } = await req.json();
  const u = new URL(url);
  if (u.protocol !== 'https:') return new Response('https only', { status: 400, headers: cors });
  // TODO: 擋 localhost / 私有 IP（SSRF）、限制大小與逾時
  const r = await fetch(u, { signal: AbortSignal.timeout(10_000) });
  const text = await r.text();
  return new Response(text, { status: r.status, headers: { ...cors, 'Content-Type': 'text/calendar; charset=utf-8' } });
});
```

注意事項：
- **SSRF 與濫用**：預設 `verify_jwt` 開啟（只有登入者能呼叫），再加上只允許 https、擋私有/內網 IP、限制回應大小與逾時；否則會變成公開開放代理。
- **ICS 網址常含私密 token**（如 Google Calendar 的 secret address），請求會經過使用者自己的 Supabase，不經第三方，這比公用 CORS proxy 好很多；仍要避免在函式 log 中印出完整 URL。
- **部署門檻**：使用者得部署函式。Supabase Dashboard 的 Edge Functions 編輯器可直接貼上程式碼，可在 `SetupSupabaseWizard.tsx` 加一個步驟「貼上這段程式碼並部署」，並提供「測試連線」按鈕。這是**可選功能**：未部署時自動降級。
- 免費額度有限，ICS 輪詢頻率要節制（快取、依 ETag/If-Modified-Since 做條件請求）。
- Postgres 的 `http` 擴充可以做，但不建議（阻塞、難限制）。

建議 `fetchText` 的降級順序：
1. 直接 `fetch`（對方有 CORS 就成功）
2. 有原生殼 → bridge `fetchText`（Android/桌面，最快、無額度問題）
3. 使用者自己的 Supabase `fetch-ics` Edge Function
4. 失敗 → 提示使用者手動匯入 .ics 檔

這樣 **iOS / 純瀏覽器 PWA 使用者**也能抓 ICS，而不必為此做 iOS 殼。

### 更新後的決策摘要

| 項目 | 決定 |
|---|---|
| 桌面框架 | Avalonia，Windows 優先；`Nbl.Bridge`/`Nbl.Platform` 與 UI 解耦以便換殼 |
| 鬧鐘 | 第一版：tray 常駐 + 殼內計時 + 持久化重排；之後 Windows Scheduled Toast |
| 載入方式 | **線上 URL + Service Worker**（修正先前建議），需 origin 白名單 + 版本/capability 握手 |
| ICS CORS | 直連 → 原生 bridge → 使用者 Supabase Edge Function → 手動匯入 |
| iOS | 暫維持 PWA + Shortcuts；ICS 靠 Edge Function |

---

## [2026-10-08] ychsue 補充發問
我看了您的fetch-ics Edge Function，您提到 verify_jwt 開啟後只有登入者能呼叫，可是我這APP並沒要求使用者登入，這該怎麼辦比較好呢？還有，使用者是呼叫
```md
https://your-supabase-project.functions.supabase.co/fetch-ics
```
這樣來取得資料嗎？

## [2026-10-08] Copilot 回覆：沒有登入時的 Edge Function 保護，以及呼叫方式

### 1. 其實不需要「使用者登入」，anon key 就是 JWT

Supabase 的 `verify_jwt` 檢查的是「Authorization 標頭裡有沒有一個**由該專案簽發的有效 JWT**」，**不一定要是登入使用者**。你的 App 用 `createClient(url, key)`（`SupabaseSyncManager.ts`）時，`key` 是 anon key，它本身就是一個 role 為 `anon` 的 JWT。因此：

- 用 `supabase.functions.invoke('fetch-ics', ...)` 會自動帶上 `Authorization: Bearer <anon key>`，`verify_jwt = true` 照樣通過，**使用者不用登入**。
- 但要誠實說明：anon key 是**公開金鑰**（本來就會放在前端），所以 `verify_jwt` 在無登入情境下只能擋「完全不知道你專案的人」，**擋不了拿到 anon key 的人**。不能把它當作真正的權限控管。

### 2. 真正的防護：函式本身要「無法被濫用」

既然 anon key 不是秘密，要把函式設計成**就算被人呼叫也沒什麼可濫用**：

1. **只允許 https、擋私有/內網/loopback/link-local IP**（含 DNS 解析後再檢查，並禁止或逐跳重新檢查 redirect）。
2. **限制回應大小**（例如 2 MB）、逾時（10 秒）、只接受 `text/calendar` 或內容以 `BEGIN:VCALENDAR` 開頭，**不是 ICS 就拒絕**（讓它無法被拿來當通用 proxy 抓任意網頁）。
3. **主機白名單（可選）**：只允許 `calendar.google.com`、`outlook.office365.com`、`outlook.live.com`、`*.icloud.com` 等常見 ICS 來源；使用者自訂來源再由他自己在 Wizard 加入。
4. **CORS 的 `Access-Control-Allow-Origin` 設為你的 PWA 網域**（桌面殼載入線上 URL，origin 一樣）。注意這只擋「瀏覽器內的其他網站」，擋不了 curl，所以不能只靠它。
5. **簡易速率限制 / 共享密鑰（可選但很實用）**：Wizard 產生一組隨機字串，存成函式的 secret（`supabase secrets set NBL_PROXY_TOKEN=...`），PWA 呼叫時額外帶 `x-nbl-token`。因為每個使用者**都是自己的專案、自己的 token**，token 只存在他自己的裝置與專案，不是全域公開值，比 anon key 強。缺點是多一步設定；可以讓 Wizard 一鍵複製。
6. 若日後改用 Supabase Anonymous Sign-in（`signInAnonymously()`），每台裝置會拿到各自的 JWT（`authenticated` role、可限速/可封鎖個別使用者），也不需要使用者「註冊」。這比純 anon key 好一些，但會多出一個 auth 狀態要維護，等有濫用疑慮再上。

> 建議組合（成本低）：**`verify_jwt` 開著（用 anon key 自動通過）+ 第 1~4 點內建 + 第 5 點的共享 token 設為建議選項**。因為每個使用者只服務自己的專案，被濫用的風險本來就低，影響的也只是他自己的免費額度。

### 3. 使用者是不是呼叫 `https://your-supabase-project.functions.supabase.co/fetch-ics`？

**對，但使用者不需要手動呼叫**，是 PWA 在背景呼叫。細節：

- 網址格式有兩種，都能用：
  - `https://<project-ref>.supabase.co/functions/v1/fetch-ics`（官方文件主要寫法，**建議**）
  - `https://<project-ref>.functions.supabase.co/fetch-ics`（舊式子網域，同一個函式）
- 你的 PWA 已知 Supabase URL，所以**不需要使用者另外填函式網址**，直接用 URL 推導即可。
- 建議用 SDK：

```ts
const { data, error } = await supabase.functions.invoke('fetch-ics', {
  body: { url: icsUrl },
  headers: { 'x-nbl-token': proxyToken }, // 若有啟用共享 token
});
// data 為函式回傳的內容（text/calendar 會被當文字處理；若不確定可用 responseType 或自行 fetch）
```

  `invoke` 會自動加上 `apikey` 與 `Authorization` 標頭並處理 CORS preflight；自己用 `fetch` 的話要手動帶：
  `apikey: <anon key>`、`Authorization: Bearer <anon key>`、`Content-Type: application/json`。
- 函式需要放行 `OPTIONS`（前面範例已有）並在 CORS 的 `Allow-Headers` 加上 `x-nbl-token`。
- **使用者要做的只有「部署一次」**：Dashboard → Edge Functions → 新增 `fetch-ics` → 貼上你提供的程式碼 → Deploy（或用 `supabase functions deploy fetch-ics`）。之後 Wizard 提供「測試」按鈕，用一個公開的小 ICS 網址呼叫看看成功與否。
- 若使用者沒部署，呼叫會得到 404，PWA 就依前面的降級順序，改走「手動匯入 .ics」。

### 4. 更新後的 Edge Function 草稿（取代前面的示意）

```ts
// supabase/functions/fetch-ics/index.ts（示意，上線前請實測 SSRF 防護）
const ORIGIN = Deno.env.get('NBL_ALLOWED_ORIGIN') ?? '*';
const TOKEN = Deno.env.get('NBL_PROXY_TOKEN'); // 可選
const MAX_BYTES = 2 * 1024 * 1024;
const cors = {
  'Access-Control-Allow-Origin': ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-nbl-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const bad = (m: string, s = 400) => new Response(m, { status: s, headers: cors });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (TOKEN && req.headers.get('x-nbl-token') !== TOKEN) return bad('forbidden', 403);

  let u: URL;
  try { u = new URL((await req.json()).url); } catch { return bad('bad url'); }
  if (u.protocol !== 'https:') return bad('https only');
  // TODO: 解析 DNS 後拒絕私有/loopback/link-local 位址；redirect 用 manual 並逐跳檢查

  const r = await fetch(u, { redirect: 'manual', signal: AbortSignal.timeout(10_000) });
  if (!r.ok) return bad(`upstream ${r.status}`, 502);
  const buf = new Uint8Array(await r.arrayBuffer());
  if (buf.byteLength > MAX_BYTES) return bad('too large', 413);
  const text = new TextDecoder().decode(buf);
  if (!text.trimStart().startsWith('BEGIN:VCALENDAR')) return bad('not an ics', 415);

  return new Response(text, { headers: { ...cors, 'Content-Type': 'text/calendar; charset=utf-8' } });
});
```

### 5. 決策

| 問題 | 結論 |
|---|---|
| 沒登入能用 `verify_jwt` 嗎？ | 能，anon key 本身就是有效 JWT；但它只是「門鈴」，不是鎖 |
| 怎麼防濫用？ | 函式內做 https/內網封鎖/大小/ICS 內容檢查，加上可選的每使用者共享 token |
| 呼叫網址？ | `https://<ref>.supabase.co/functions/v1/fetch-ics`，PWA 用 `supabase.functions.invoke` 自動呼叫，使用者只需部署一次 |

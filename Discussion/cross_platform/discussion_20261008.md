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

## [2026-10-11] ychsue 我已經大致部署且測試完 fetch-ics 的部分，運作正常。所以，可以回來繼續[原本的規劃1](#2026-10-08-copilot-回覆windows--linux--macos--ios-擴展建議) [原本的規劃2](#2026-10-08-copilot-回覆)。 

## [2026-10-11] Copilot 回覆（回到主線：施作計畫）

### 1. 現況盤點（PWA 端與 Android 橋接的耦合點）

- `pwa/public/twa-pm-bridge.js`：注入 `window.__NBL_TWA_BRIDGE__`（MessagePort，字串 JSON 訊息）。
- `pwa/src/hooks/useTwaBridge.ts`：訂閱橋接訊息。
- `pwa/src/hooks/useTwaRpc.ts`：`sendRequest(type, payload)`，以 `requestId` 配對回應，預設逾時 3 秒。
- `pwa/src/utils/androidAlarmBridge.ts`：鬧鐘排程請求的資料結構（`taskId/eventAt/alarmAt/dedupeKey...`）。
- `App.tsx`、`utils/notification.ts` 直接引用上述 hook。

觀察：**現有的 RPC 形狀（`{type, requestId, ...payload}`）已經夠通用**，桌面殼可以直接沿用，不必先發明新協定；只需在其上加一個「handshake / capabilities」訊息。這讓第一步風險很低。

### 2. 修正後的施作順序

| 階段 | 內容 | 產出 | 風險 |
|---|---|---|---|
| 0 | 把現有 Android 訊息型別整理成文件（`protocol/messages.md`，之後再轉 JSON Schema） | 協定文件 | 低 |
| 1 | PWA 新增 `src/native/`：`NativeBridge` 介面 + `twaBridge`（包裝現有 `useTwaRpc`）+ `webBridge`（純 PWA）；呼叫端改走介面，行為不變 | 重構 + 測試 | 低，Android 行為須不變 |
| 2 | 加 `hello` / `capabilities` 訊息；Android 端回報（Kotlin 小改） | 能力協商 | 低 |
| 3 | `fetchText` 降級鏈：直連 → native → Edge Function (`fetch-ics`) → 手動匯入 | ICS 在所有平台可用 | 低（Edge Function 已就緒） |
| 4 | `desktop/` 建 Avalonia 殼（Windows 優先）：載入線上 PWA、origin 白名單、托盤、開機自啟、實作 `notify`/`alarm`/`openExternal`/`share` | Windows 版 | 中（WebView 元件） |
| 5 | Linux 驗證（WebKitGTK）；不行再換 Photino | Linux 版 | 中高 |
| 6 | macOS（需 Mac + Apple 開發者帳號）／iOS 維持 PWA + 捷徑 | 視需求 | 高，可延後 |

### 3. 建議的下一步

先做 **階段 0 + 1**（純 PWA 端，不碰任何桌面程式碼，也不動 Android 行為），因為它：
1. 讓之後 Windows／Linux／macOS 殼都只需實作同一介面；
2. 可用既有 `androidAlarmBridge.test.ts` 風格的單元測試保護；
3. 即使桌面殼最後延期，也不浪費。

階段 4 開始前，再花一小段時間確認 Avalonia WebView 元件（目前狀態與授權）以及 WebView2 備案，確定後再建 `desktop/`。


### 4. 進度（階段 0、1 完成）

- 新增 `protocol/messages.md`：整理現有 Android 訊息。
- 新增 `pwa/src/native/`：`NativeBridge` 介面、`createWebBridge` / `createTwaBridge`、`useNativeBridge` hook 與單元測試（4 項通過）。
- `IcsSourceManagementDialog` 的 `nbl:fetch-ics` 已改走 `nativeBridge.fetchIcs`（行為不變）。
- 其餘 `sendRequest` 呼叫端（App.tsx 等）暫不動，之後逐步遷移。

### 5. 進度（階段 2：nbl:hello）

- Kotlin `AndroidBridge.kt` 新增 `nbl:hello` → `nbl:hello-response`（shell/shellVersion/protocolVersion/capabilities）。
- PWA `negotiateHello`：逾時或錯誤（舊版 shell 只會忽略未知訊息）即退回預設能力 `alarm/notify/fetchIcs`，因此舊版 APK 不受影響。
- `useNativeBridge` 啟動後自動協商。測試 6 項通過，Kotlin 編譯通過。

### 6. 進度（階段 3：ICS 降級鏈）

- 新增 `pwa/src/native/fetchIcs.ts`：`fetchIcsWithFallback` 依序 native（看 capability，不再看 deviceType）→ 直連 → Supabase `fetch-ics`，每階段都檢查內容是否以 `BEGIN:VCALENDAR` 開頭；全部失敗才 reject（UI 提示手動匯入）。
- `IcsSourceManagementDialog` 改用它；行為差異：Android 原本 native 失敗就放棄，現在會繼續試直連與 Supabase。
- 因以 capability 判斷，之後桌面殼只要在 hello 回報 `fetchIcs` 就自動生效。測試 10 項通過。

## [2026-10-11] ychsue 我有點懂您當初為何建議使用 dist 了，我目前完全沒安裝 Avalonia，的確，若我在測的時候，GitHub 上不是最新的，除非我 push 上去，這樣會造成很大的困擾。
有可能開發時使用 dist ，而發布時，若 dist不大，就也包上去給 Windows APP，不過，還是以 GitHub 上面的那個為準？
這樣會不會很亂？
我還沒裝 Avalonia，需要我自己裝一裝嗎？應該蠻好玩的。😄


## [2026-10-11] ychsue 開發時用 dist、發布時內含 dist 但以 GitHub 為準？要自己裝 Avalonia 嗎？

## [2026-10-11] Copilot 回覆（載入來源策略）

**結論：不亂，只要把「載入來源」做成設定，由殼依序嘗試。**

| 模式 | 載入來源 | 用途 |
|---|---|---|
| Dev | `http://localhost:5173`（vite dev）或本機 `pwa/dist` | 開發測試，不必 push |
| Release | 線上 PWA URL（主）→ 失敗時退回內含 dist（備援） | 正式版 |

- 內含 dist 約 2.1 MB，很小，適合當**離線／首次安裝備援**，並非主要來源。
- 規則：能連線就以線上版為準（Service Worker 本身也會快取）；內含 dist 只在線上載入失敗時使用。
- 用 `appsettings` 或命令列參數 `--source dev|dist|online` 切換；origin 白名單只放這三種來源。
- 風險：內含 dist 與線上版若協定版本差太多，靠 `nbl:hello` 的 protocolVersion 協商與降級處理。
- 環境：dotnet SDK 9.0 與 10.0 已安裝；Avalonia 只需安裝專案範本（`dotnet new install Avalonia.Templates`），不需要額外 IDE 外掛。

---
在專案根目錄(`NonBlockingLife`)下執行。依先前規劃,所有 C# 都放 `desktop/` 底下,並用 solution 統一管理:

```powershell
cd C:\Users\hsuy1\source\repos\NonBlockingLife
dotnet new install Avalonia.Templates

mkdir desktop; cd desktop
dotnet new sln -n NBL
dotnet new avalonia.app -o src/Nbl.Desktop      # 先用 app,不用 mvvm(見下)
dotnet sln add src/Nbl.Desktop
dotnet run --project src/Nbl.Desktop
```

說明:

- **用 `avalonia.app` 而不是 `avalonia.mvvm`:** 這個殼基本上只有一個 WebView 加托盤圖示,業務邏輯都在 PWA,不需要 MVVM 的 ViewModel 和 CommunityToolkit 那一套。之後需要再加也不遲。
- **放在 `desktop/` 底下:** 避免 `.sln`、`bin/`、`obj/` 散在根目錄,和 `pwa/`、`twa/` 並列。後續會再加的專案(`Nbl.Bridge`、`Nbl.Platform` 等)都放在 `desktop/src/` 底下。
- **`.gitignore`:** 根目錄的 `.gitignore` 要確認有 `bin/` 和 `obj/`。我建骨架時會一併檢查。
- **`dotnet new install` 只需執行一次。**

你可以先自己跑一遍看到空白視窗,也可以交給我建。你想自己跑,還是我來建骨架並順便查 WebView 元件的狀態與授權?

## [2026-10-11] ychsue 初始化 Avalonia 完成，謝謝。現在可以繼續階段4了
---

### 階段 4 進度:Avalonia Windows 殼(已可運作)

- WebView:採用 Avalonia 12 內建 `Avalonia.Controls.WebView`(`NativeWebView`,MIT;Windows=WebView2、macOS=WKWebView、Linux=WebKitGTK/WPE)。
- `desktop/src/Nbl.Bridge`:共用、可單元測試的訊息分派(`nbl:ping/version/hello/fetch-ics`)、來源白名單、`HttpIcsFetcher`(15 秒、5 MB、需 `BEGIN:VCALENDAR`);14 個測試通過。`fetch-ics` 失敗時桌面端會回 `error`(Android 則不回)。
- `desktop/src/Nbl.Desktop`:`--source online|dist|dev`、`--dist-path`、`--dev-url`、`--port`(預設 47615)。dist 模式以本機 HttpListener 於 `/NonBlockingLife/` 提供。非白名單網址改用系統瀏覽器開啟。
- 橋接:頁面載入完成後注入 shim 偽造 port 並呼叫 `__NBL_TWA_BRIDGE__.setPort`,PWA 既有的 `useTwaRpc` 不需改。因為 port 較 React 晚到,`twa-pm-bridge.js` 在 setPort 後會觸發 `nbl-bridge-connected` 事件,`useNativeBridge` 收到後重新協商 hello。
- 實測:`--source dist` 啟動後 PWA 載入,ping/pong 往返成功(可用環境變數 `NBL_TRACE_FILE` 輸出 trace)。`nbl:query-alarm-setup` 目前桌面端尚未實作(視為無回應)。
- **修正先前建議**:IndexedDB/localStorage 以 origin 區分,`ychsue.github.io` 與 `127.0.0.1:47615` 的資料互不相通,所以不能「線上失敗就自動退回 dist」。預設用 online(離線靠 Service Worker),dist/dev 僅明確指定;dist 固定 port 以保持 origin 穩定。

下一步:系統匣常駐、notify、alarm(桌面端自帶計時並持久化)、openExternal/share;再做 Linux 驗證。

---

## [2026-10-11] ychsue 中間插進來一個要求：
在 `下一步:系統匣常駐、notify、alarm(桌面端自帶計時並持久化)、openExternal/share;再做 Linux 驗證。` 之前，能否幫我在 [launch.json](.vscode\launch.json) 裡面加一個針對 Avalonia Windows 殼的除錯配置?這樣，我好在 VSCode 裡面直接啟動並除錯 Avalonia Windows 殼？

## [2026-10-11] Copilot 回覆

Ran terminal command: Get-Content .vscode\launch.json -ErrorAction SilentlyContinue; Get-Content .vscode\tasks.json -ErrorAction SilentlyContinue | select -first 40; Get-ChildItem desktop\src\Nbl.Desktop\bin\Debug

No tasks.json exists, so I'll add one for the build and then the launch configs.

Create 

Edit 

Ran terminal command: Add-Content desktop\.gitignore -Value "trace.log" -ErrorAction SilentlyContinue; git check-ignore -v desktop/trace.log; Test-Path desktop\src\Nbl.Desktop\bin\Debug\net10.0\Nbl.Desktop.dll

我在 `launch.json` 加了三個 Avalonia Windows 殼的除錯配置。我只確認了編譯產物路徑存在,配置本身沒有實際用 F5 啟動過。

- **NBL Desktop (dist)**:載入 `pwa/dist`。用之前先在 `pwa/` 跑 `npx vite build`。
- **NBL Desktop (dev: localhost:5173)**:載入 `http://localhost:5173/`,需要先在 `pwa/` 啟動 `npm run dev`。
- **NBL Desktop (online)**:載入線上版網址。

這三個配置都是啟動前先建置,再用 `coreclr` 啟動 `Nbl.Desktop.dll`,並把橋接訊息寫到 `desktop/trace.log`。
- **新增 `tasks.json`**:啟動前的建置工作 `build-nbl-desktop` 放在這裡,因為原本沒有這個檔案。
- **`.gitignore`**:`desktop/.gitignore` 加了 `trace.log`,這個 log 不會被 commit。

在 VSCode 的「執行和偵錯」面板選配置後按 F5 即可,斷點可以設在 `desktop/` 底下的 C# 程式碼。這需要安裝 C# 擴充套件(含 coreclr 偵錯器)。

要接著做系統匣常駐、notify 和 alarm 嗎?

---

## [2026-10-12] ychsue 
紀錄一下，在 [MainWindow.axaml.cs](../desktop/src/Nbl.Desktop/MainWindow.axaml.cs) 裡面加上
```csharp
        if (options.Source == LoadSource.Dev)
        {
            Environment.SetEnvironmentVariable("WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS", "--remote-debugging-port=9222");
        }
```
讓我可以使用 VSCode 透過 `msedge` 附加到 WebView2 的遠端除錯埠。
所以，除錯順序
1. npm run dev
2. 啟動 NBL Desktop (dev: localhost:5173) 配置。
3. 在 VSCode 裡面使用 `msedge` 配置附加到 WebView2 的遠端除錯埠。

好的，下一步:系統匣常駐、notify、alarm(桌面端自帶計時並持久化)、openExternal/share
---

### 階段 5 進度:系統匣常駐、notify、alarm、openExternal/share(Windows 殼)

**PWA 除錯流程(回答)**:你的流程可行,但順序建議 `npm run dev` → 啟動 NBL Desktop (dev) → 附加 `msedge`(dev server 沒起來時殼會載入失敗)。我把 `--remote-debugging-port=9222` 改成在 `Web.EnvironmentRequested` 內以 `AdditionalBrowserArguments` 設定(只在 `--source dev` 生效),不再靠行程環境變數。另一個替代做法是在 WebView 內按 F12 開 DevTools(Debug 組態),不需附加;要設 VSCode 斷點才需附加。

**實作內容**
- `Nbl.Bridge/AlarmScheduler`:持久化(`%LocalAppData%/NonBlockingLife/alarms.json`,原子寫入、損毀時忽略)、`clock`(下一個 HH:mm)與 `exact` 時間解析、同 id 同時間去重、逾期超過 1 小時丟棄。
- `BridgeDispatcher` 新增:`nbl:notify`、`query-notification-permission`、`query-alarm-setup`/`query-clock-apps`/`select-clock-app`(回傳虛擬的「NBL Desktop」時鐘 App,讓 PWA 不跳出選擇對話框)、`request-exact-alarm-permission`、`set-alarms`、`open-external`(僅 http/https)、`share`。capabilities 依注入的功能自動列出。測試共 26 個通過。
- 殼:`DesktopHost`(`IDesktopHost`)、`ToastWindow`(右下角小視窗,不依賴系統 toast,可跨平台;一般通知 8 秒消失,鬧鐘需點擊)、系統匣圖示(開啟/結束)、關閉視窗=縮到系統匣(ShutdownMode 明確關閉)、1 秒計時器取出到期鬧鐘。
- 驗證:預寫入 8 秒後的鬧鐘,到期後檔案清空;`CloseMainWindow()` 後程序仍存活。

**已知限制 / 取捨**
- `share`:桌面沒有統一的分享面板,先做「複製到剪貼簿並提示」;PWA 目前尚未呼叫 `nbl:share` / `nbl:open-external`。
- 協定沒有「取消鬧鐘」,PWA 刪除的鬧鐘仍會響(Android 端同樣情況),之後可加 `nbl:cancel-alarms`。
- 沒有開機自動啟動、也沒有單一實例(重複開啟會有兩個圖示);之後再補。
- Toast 的實際畫面尚未目視確認,請你開 dist 模式用「Scheduled」建一個近期項目看看。

---

## [2026-10-12] ychsue 自動啟動可以由程式這裡設定嗎？單一實例確實有必要。還有，在 [shortcutUtils.ts](/pwa/src/utils/shortcutUtils.ts) 裡面，我有用到 nonblockinglife:// 的 protocol ，那麼，這裡也要改走 postmessage 的路線嗎？
所以， useNativeBridge 裡面的 useEffect....[] 的區段的 listener 會不會互相打架呢？
---

## 階段 6:自動啟動、單一實例、`nonblockinglife://`、listener 疑慮(2026-10-08)

**實作**
- `SingleInstance`(具名 Mutex + 具名管道):第二個實例通知第一個「顯示視窗」後離開。`--allow-multiple` 可略過(launch.json 三個除錯配置已加,避免 F5 被常駐實例擋掉)。
- `AutoStart`:Windows 寫 `HKCU\...\Run\NonBlockingLife`,Linux 寫 `~/.config/autostart/nonblockinglife.desktop`,macOS 暫不支援。命令列附 `--background`(啟動後直接縮到系統匣)。由系統匣選單「開機時自動啟動」勾選切換,不需改 PWA。
- `ExternalUriPolicy`:殼只會把 http/https/mailto/ms-clock 交給作業系統,其餘導覽一律擋下(原本是任何非白名單 URI 都 ShellExecute,有安全疑慮)。
- 踩雷:Avalonia 每次 `Show()` 都會再觸發 `Opened`,「背景啟動就 Hide」必須用一次性 handler,否則之後永遠顯示不出來。

**`nonblockinglife://`**:是 Android 深層連結(show-clock、set-timer…),由 Android 殼處理,桌面不需要,保持原樣,不必改走 postMessage。桌面的 `ms-clock:` 仍走 `window.location.href`,由殼的外開機制處理(WebView2 對自訂 scheme 的行為尚未實測)。

**listener 會不會打架**:不會。每個 `useTwaRpc` 各有自己的 `pendingRequests`,requestId 唯一,收到不屬於自己的訊息就忽略。真正的浪費是每個 `useNativeBridge` 都各送一次 hello,已改為以 port 為 key 快取 promise。

**驗證**:36 個 C# 測試通過;實測第二實例會結束並把隱藏中的第一個實例叫出來;`--background` 啟動時無視窗。自動啟動寫入登錄檔尚未實際點選測試。

---

## [2026-10-12] ychsue 我是想說，這個APP 的主體當然是PWA，然而，其實好像還需要一個小型的像是 Android 時鐘那樣，有自己的計時器與鬧鐘管理界面，能夠在桌面端常駐並處理通知與鬧鐘。若走 protocol (windows 有 `windows.protocol` 可以設，Linux 我不知道) ，請問這會很麻煩嗎？

## [2026-10-12] Copilot 回覆：

不麻煩。Windows 上註冊 protocol 的工作量跟剛做的 `AutoStart` 差不多，真正要花功夫的是那個小型時鐘介面。

**1. 註冊 protocol**

| 平台 | 做法 |
|---|---|
| Windows | 寫入 `HKCU\Software\Classes\nonblockinglife`（含 `URL Protocol` 與 `shell\open\command`）。不需要系統管理員權限，也不需要 MSIX 的 `windows.protocol`，程式第一次啟動時自己寫即可。 |
| Linux | 在 `~/.local/share/applications/` 放一個 `.desktop` 檔，內含 `MimeType=x-scheme-handler/nonblockinglife;`，再執行 `xdg-mime default`。 |
| macOS | 寫在 `Info.plist` 的 `CFBundleURLTypes`，且要打包成 .app，所以先不做。 |

**2. 收到 URI 之後怎麼處理**

OS 會為每個 URI 另開一個新行程，並把 URI 當參數傳進來。我們已經有單一實例的具名管道，只要把管道傳的內容從 1 個 byte 改成 URI 字串。第二個行程轉交給常駐的第一個實例後就結束，常駐實例再把 URI 對應到 `AlarmScheduler`。Android 的 `show-clock`、`set-timer`、`schedule-alarm` 可以直接沿用同一套語意。

**3. 什麼時候才需要 protocol**

- **PWA 跑在殼裡面**：不需要。postMessage 的 `nbl:set-alarms` 已經能用，比 protocol 好。它不用開新行程，也不用註冊，瀏覽器也不會跳確認視窗。
- **PWA 跑在一般瀏覽器（Chrome 或 Edge 安裝版）**：需要。這種情況沒有殼可以傳訊息，只能用 `nonblockinglife://` 去叫常駐的桌面時鐘，但瀏覽器每次會問「要開啟此應用程式嗎？」。
- **其他來源**：桌面捷徑、其他程式、通知被點擊後想帶 PWA 回到某個畫面，也都要 protocol。

**4. 小型時鐘介面**

這才是主要工作量。建議在 Avalonia 加第二個小視窗，從系統匣開啟，內容包含：
- 鬧鐘清單：新增、刪除、開關。
- 倒數計時器。
- 響鈴時的 toast（已經有了）。

資料都放在現有的 `alarms.json`，所以 PWA 和這個視窗看到的是同一份。要補的協定是 `nbl:cancel-alarms` 和 `nbl:get-alarms`，讓 PWA 也能同步清單。

**建議順序**
1. 先做系統匣的小時鐘視窗，含 `get-alarms`、`cancel-alarms` 和計時器，不用 protocol。
2. 再註冊 protocol，單一實例管道轉發 URI，並加上參數驗證（只接受已知的 host 與數值範圍）。
3. Linux 的 protocol 註冊等 Linux 殼驗證時再一起做。

要我從第 1 步開始嗎？

---

## [2026-10-12] ychsue 好，那就由第一步開始，不過，計時器能像 Google 時鐘那樣可以重置、暫停與開始等嗎？
---

## 階段 7:小型時鐘視窗(鬧鐘 + 計時器)(2026-10-12)

**新增**
- `TimerService`(Nbl.Bridge,可單元測試):多組計時器,支援開始/暫停/繼續/重置/+1:00/刪除。Running 時存 `EndAt`、暫停與閒置時存 `Remaining`,所以視窗隱藏或程式重啟後都不會失準;持久化於 `timers.json`。到時後回到 Idle(與 Google 時鐘一樣可再按開始)。
- `ClockWindow`(Avalonia,純程式碼 UI):兩個分頁「鬧鐘」「計時器」,從系統匣「鬧鐘與計時器」開啟,關閉只是隱藏。鬧鐘與 PWA 共用 `alarms.json`。
- 協定:`nbl:get-alarms`、`nbl:cancel-alarms`(補上先前缺的撤銷),見 `protocol/messages.md`。
- `App` 的 1 秒計時器同時處理鬧鐘與計時器到時,以 toast 提示。

**驗證**:45 個 C# 測試通過;實測預先寫入的計時器 5 秒後到時並回到 Idle。ClockWindow 的版面尚未目視確認。

**尚未做**:PWA 端呼叫 `get-alarms`/`cancel-alarms`(目前 PWA 刪除鬧鐘仍不會同步撤銷);計時器開放給 PWA;protocol(`nonblockinglife://`)註冊。

---

## [2026-10-14] ychsue 先 protocol 好了，由於這個App本可以透過 https://ychsue.github.io/NonBlockingLife/ (測試時，為 localhost:5173) 外加 parameters 來啟動特定功能，所以， protocol `nonblockinglife://` 預設行為應該是把 `nonblockinglife` 換成對應的 PWA 網址再送給 NativeWebView。還是您有更好的想法？
## 階段 8:`nonblockinglife://` 桌面協定(2026-10-08)

- 預設行為:把 `nonblockinglife://...` 換成 PWA 網址(線上 / dev / dist 依啟動來源),**只保留 query 與 fragment**,host 與 path 忽略,然後交給 NativeWebView。
- 特例:`nonblockinglife://show-clock` 由桌面殼直接開啟時鐘視窗(主視窗保持隱藏)。
- 第二個實例會經 named pipe 把 URI 轉給第一個實例;第一個實例直接用啟動參數。
- 驗證:長度 ≤ 2048、無控制字元、scheme 必須相符。
- 註冊:Windows 寫 HKCU\Software\Classes\nonblockinglife;Linux 寫 `.desktop` + `xdg-mime`。採托盤選單手動勾選,避免 Debug 版搶走已安裝版的 handler。
- 安全:任何網頁都能觸發此協定,但效果僅等同於造訪公開 PWA 網址或顯示時鐘。
- 注意:PWA 只在載入時讀 `location.search`,所以對執行中的實例導向新 URL 會整頁重載。
- 未驗證:Linux handler、WebView2 對自訂 scheme 的行為、時鐘視窗外觀。

---

## [2026-10-17] ychsue 我已經大致修改與驗證了Windows 的部分，現在我希望可以 ClockWindow 的部分可以有聲音，我有放一個 [DEFAULT.mp3](/desktop/src/Nbl.Desktop/Assets/DEFAULT.mp3) 作為預設鈴聲。
未來想給使用者可以設定自訂鈴聲。
由於鈴聲可以由 ClockWindow 的 Alarm & Timer 來啟動與關閉，也可以由 Notification 來關閉，所以，我想說可能需要一個類似
AlarmAudioManager 來統一管理鬧鐘與計時器的鈴聲播放與停止。
若要能自訂鈴聲，那麼，放在哪好呢？怎麼讓使用者選呢？ TimerEntry 和 AlarmEntry 都需要有對應的鈴聲設定欄位，並且在 ClockWindow 的 UI 提供選擇鈴聲的功能。
先討論，會很複雜嗎？

## [2026-10-17] Copilot's Alarm audio design

不會太複雜。難的是跨平台音訊引擎，ClockWindow 的 UI 和資料欄位都很直接。以下是我的建議。

### 1. 音訊引擎（主要風險）
Avalonia 沒有內建音訊播放，專案目前也沒有任何音訊套件。選項如下：

| 選項 | 優點 | 缺點 |
|---|---|---|
| **LibVLCSharp** | 跨平台、mp3/wav/ogg 都能播、可循環 | 套件大（約 30–60MB 原生 libvlc） |
| **NAudio**（`WaveOutEvent` + `Mp3FileReader`） | 輕量、穩定 | 僅限 Windows |
| **SoundFlow / OpenTK-OpenAL** | 跨平台、較輕 | 較新，mp3 解碼需另外確認 |

你說「Windows 部分已驗證」，所以應該有 macOS/Linux 的計畫。我建議：
- 在 `Nbl.Bridge` 定義 `IAudioPlayer`（`Play(path, loop)` / `Stop()`），讓 `DesktopHost` 注入實作。
- 先做 Windows 版（NAudio），其他平台之後再補。這和現有的 `IDesktopHost` 模式一致。

### 2. AlarmAudioManager
- 放在 `Nbl.Bridge`，邏輯與平台無關，只依賴 `IAudioPlayer`。
- API：`Start(string key, string? soundId)`、`Stop(string key)`、`StopAll()`。
- 狀態：以 `key`（也就是 `AlarmEntry.Key` 和 timer 的 key）記錄正在響的項目。
- 多個同時響時只播一個聲音，等 `Stop` 到沒有項目才真正停止。
- 在 `Stop` 時加上最大響鈴時間（例如 60 秒）自動停止，避免一直響。
- 觸發點：`App.axaml.cs` 第 150/152 行的 alarm/timer 到期處，以及 ClockWindow 的關閉鈕、Toast 的關閉/點擊事件。這些都只要呼叫 `Stop(key)`。
- `ToastOptions` 要加 `Key` 和 `OnDismiss`，讓 Toast 關閉時能通知 manager。

### 3. 自訂鈴聲的儲存
- 使用者檔案複製到 `%AppData%\NonBlockingLife\sounds\`（對應平台的 app data 目錄）。
- 設定只存**檔名**（或 id）。不存絕對路徑，原檔被移動或刪除時才不會壞掉。
- 特殊值 `null` 或 `"default"` 代表內建的 `DEFAULT.mp3`，它要設為 `AvaloniaResource` 或 `Content` 並複製到輸出。
- 找不到檔案時退回預設鈴聲。

### 4. 資料欄位
- 在 `AlarmEntry` 和 `TimerEntry` 各加 `string? Sound = null`（record 的預設參數，舊資料反序列化後是 null，等於預設）。
- 持久化 JSON 若是手寫解析，要確認它能容忍缺少的欄位。
- 如果 Web 前端（Bridge）也會建立這些項目，`BridgeDispatcher` 的訊息要多帶 `sound`。

### 5. UI 選擇
- ClockWindow 的 Alarm 和 Timer 新增表單各加一個 ComboBox：「預設」、已匯入的自訂鈴聲、「瀏覽…」。
- 「瀏覽…」用 Avalonia 的 `StorageProvider.OpenFilePickerAsync`（篩選 mp3/wav/ogg）。選好後複製到 sounds 目錄並選取。
- 旁邊加一個試聽按鈕，用同一個 manager 播放。
- 之後可以在設定頁加「全域預設鈴聲」，每個項目的 Sound 預設取自它。

### 建議分階段
1. `IAudioPlayer` + Windows 實作 + `AlarmAudioManager` + 預設鈴聲，接上到期事件和 Stop。
2. `Sound` 欄位、sounds 目錄和 ClockWindow 選單及選檔。
3. macOS/Linux 的播放實作。

### 請你決定
1. 是否需要跨平台？這會決定用 NAudio 還是 LibVLCSharp。
2. 響鈴要循環到手動關閉，還是播一次或固定秒數？
3. 同時有多個提醒時，是只播一個，還是各播各的？

你回覆後我就可以開始實作第 1 階段。

---

## [2026-10-17] ychsue 
1. 請問那麼可以 Windows 使用 NAudio，而 Linux 使用 LibVLCSharp 嗎？
2. 響鈴要循環到手動關閉
3. 同時有多個提醒時，只播一個。
---

## [2026-10-17] Copilot

### 決議
1. **可以**：Windows 用 NAudio（`WaveOutEvent` + `Mp3FileReader`），Linux 用 LibVLCSharp。兩者都實作 `IAudioPlayer`，由各平台的 host 注入；`Nbl.Bridge` 的 `AlarmAudioManager` 不依賴具體引擎。
   - LibVLCSharp 在 Linux 需要系統安裝 `libvlc`（或隨套件附帶），要在文件和打包流程註明；找不到時應優雅降級（記錄 log、不播聲音，不要讓程式崩潰）。
   - macOS 先不處理（沿用 LibVLCSharp 應該可行，之後再驗證）。
2. 響鈴**循環到手動關閉**（ClockWindow 的 Alarm/Timer 停止、或 Toast 關閉）。不設自動逾時。
3. 多個提醒同時到期**只播一個聲音**：`AlarmAudioManager` 以 key 集合追蹤，集合為空才真正停止播放。

### 實作備註
- 循環：NAudio 用自訂 `LoopStream` 包住 reader；LibVLC 用 `:input-repeat=-1` 媒體選項。
- `ToastOptions` 需加 `Key` / `OnDismiss`，讓 Toast 關閉時呼叫 `Stop(key)`。
- 因為沒有逾時，應用程式結束時必須呼叫 `StopAll()`。
- `Sound` 欄位預設 `null` = 內建 `DEFAULT.mp3`；自訂鈴聲複製到 app data 的 `sounds\`，只存檔名。

---

## [2026-10-17] ychsue 您考慮得比我細，謝謝。請幫我在 Tray 的選單也加上「停止所有鈴聲」的選項。這樣，就無須結束應用程式才能全部關閉了。

---

## [2026-10-17] Copilot — 第 1 階段已實作
- 新增 `AlarmAudioManager` / `IAudioPlayer`（Bridge）、`NAudioPlayer` / `NullAudioPlayer`（Desktop，`AudioPlayers.cs`）。
- Tray 選單新增「停止所有鈴聲」（`StopAll()`）；結束應用程式時也會 `StopAll()`。
- 響鈴 key：`alarm:<Key>`、`timer:<Id>`。停止時機：Toast 關閉（`ToastOptions.OnClosed`）、ClockWindow 計時器的開始/暫停/重置/刪除、Tray。
- 鬧鐘到期即從清單移除，因此只能從 Toast 或 Tray 停止。
- 非 Windows 目前用 `NullAudioPlayer`（無聲）；LibVLCSharp 實作待辦。自訂鈴聲（`Sound` 欄位與 UI）為第 2 階段。

---

## [2026-10-17] ychsue 對不起，我的修改不成熟，請您照您原本的作法好了，幫我改一下 Nbl.Desktop.csproj 與 AudioPlayers.cs，謝謝。那個 `C:` 是為了判讀是否為 Windows，若有更好的辦法，請使用。不過，Linux 在我的Windows 主機測不了，等開發一個段落，我再到 Linux 上面測試。
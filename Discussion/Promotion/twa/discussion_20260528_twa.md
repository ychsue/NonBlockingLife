# 讓 Android 的用戶容易使用

## [2026-05-28] ychsue 原本我與您討論，想要使用 Android Automate 來做，但是，他的 intent 若透過 Chrome 實在限制太多了，無法達成我們的需求，所以我想說，直接使用 TWA 來做，這樣會不會就不會有這些限制了。

想請您plan 一下，這個專案怎麼改比較好？

### 基本上，我希望使用者在 Android 上可以安裝一列小工具，有四個按鈕，透過[useUrlAction.ts](/pwa\src\hooks\useUrlAction.ts)所提供的API，分別對應 [GuidePage.tsx](pwa\src\components\GuidePage.tsx) 裡面 SHORTCUTS 四個有 `api` 欄位的項目，

- query: 無須參數
- interrupt: 無須參數
- add to inbox: 至少需要 title, 然而，按了這個按鈕，一定是沒給任何參數，兩種方式，

  - 跳出 Android 內建的輸入框，讓使用者輸入 title與url，然後按下確定後，才呼叫 API
  - (沒給任何參數時)直接呼叫 API，然後在 NBL Inbox 跳到該條目的編輯頁面，讓使用者輸入 title 與 url等細節

- add to scheduled: 至少需要 title 與 nextRun，然而，按了這個按鈕，一定是沒給任何參數，可是我希望他能夠先打開 calendar ，讓使用者創建出一筆定時任務，然後，在創建完成後，能夠直接把該任務的 title 與 nextRun 等訊息傳回來，然後再呼叫 API，可能嗎？若很難，就按照上面那個做好了

### 而當使用者在 [shortcutUtils.ts](pwa\src\utils\shortcutUtils.ts) 裡面呼叫 triggerAutomateFlow 時，我希望他能夠想辦法讓使用者知道現在這幾分鐘正在專注模式還是休息模式，有可能到了的時候，有個鬧鐘提醒使用者，此外，還可以延長通知存在的時間嗎？

請問，這會很難嗎？

## [2026-05-28] Copilot 規劃回覆（TWA + Android 小工具）

結論先講：可做，而且方向正確；但「TWA 本身」不會自動擁有 Android 小工具能力，仍需要在 TWA 的 Android 殼專案中加上原生元件（App Widget / BroadcastReceiver / 部分 Activity）。

整體難度屬於「中高」，建議分兩期做：

- 第 1 期（可快速上線）：四按鈕可用、不中斷主流程、可顯示專注/休息通知、可響鈴提醒
- 第 2 期（進階）：從 Android 行事曆建立事件後，盡量自動回填 title/nextRun 到 NBL

---

### 1) 需求對應與可行性

#### A. 四按鈕小工具（query / interrupt / add inbox / add scheduled）

可行。做法是 Android App Widget 的每個按鈕觸發 deep link，開啟 TWA 指向 NBL URL action，例如：

- query: `https://<你的網域>/NonBlockingLife?action=query`
- interrupt: `https://<你的網域>/NonBlockingLife?action=interrupt`
- add inbox: `https://<你的網域>/NonBlockingLife?action=add&sheet=inbox`
- add scheduled: `https://<你的網域>/NonBlockingLife?action=add&sheet=scheduled`

重點：後兩者按下時通常沒有參數，所以 PWA 要支援「缺參數時走草稿流程」。

#### B. add to inbox 沒參數時的處理

你提的兩種都可做，建議先做第 2 種（最快最穩）：

- 直接呼叫 API 並建立草稿（預設 title 例如「(未命名)」）
- PWA 自動導到 Inbox 並直接開啟該筆編輯畫面

原因：

- 不需原生輸入 UI，跨平台一致
- 實作風險最低
- 後續仍可再加 Android 原生輸入框版本

#### C. add to scheduled 先開 calendar 建立，再回傳 title/nextRun

可以做，但分成兩種難度：

- 低難度（建議先上線）：
  1. 先建立 NBL scheduled 草稿並跳編輯頁
  2. 提供「開啟 Android Calendar」按鈕（或快捷），讓使用者手動建立
  3. 回到 NBL 後再補資料

- 高難度（你想要的全自動）：
  1. 原生 Activity 啟動 calendar insert intent
  2. 透過結果回呼（或 Calendar Provider 查詢）取得 title/time
  3. 再組成 NBL URL action 回拋到 PWA

風險提醒：不同行事曆 App 對回傳資料支援不一致，這段需要大量機型測試。

#### D. triggerAutomateFlow 的專注/休息提示、時間到鬧鐘、延長通知

可行，而且即使改走 TWA，也建議「從 Automate 遷移到 Android 原生通知排程」：

- 專注/休息狀態：使用 ongoing notification 顯示「Focus x 分鐘 / Break x 分鐘」
- 時間到提醒：用 AlarmManager + BroadcastReceiver 觸發聲音/震動通知
- 延長通知存在時間：
  - ongoing 通知本身可常駐
  - 完成通知可設 `setTimeoutAfter(...)`（例如 10-30 分鐘）
  - 或提供「延長 5 分鐘」action button

---

### 2) 建議架構（避免被 Chrome 網頁限制綁住）

#### 元件分工

- PWA（既有）
  - 繼續用 `useUrlAction.ts` 做資料入口
  - 補「缺參數草稿建立 + 自動進編輯」能力

- TWA Android 殼（新增）
  - App Widget Provider：四按鈕入口
  - Deep Link Router Activity：把按鈕動作導向對應 NBL URL
  - Timer/Notification Service：接管專注/休息通知與提醒
  - （第 2 期）Calendar Bridge Activity：嘗試拿 calendar 建立結果再回拋

---

### 3) 具體改動清單

#### PWA 端（必要）

1. `useUrlAction.ts`：
- 支援 `sheet=inbox` 且缺 `title` 時建立草稿
- 支援 `sheet=scheduled` 且缺 `title/nextRun` 時建立草稿
- 建立後設定 `pendingEditIntent`，自動開 EditDialog

2. `GuidePage.tsx`：
- 新增 Android/TWA 使用說明（安裝 App、小工具加到桌面）
- SHORTCUTS 區塊改為同時說明 iOS Shortcut 與 Android Widget 對應

3. `shortcutUtils.ts`：
- `triggerAutomateFlow` 改成抽象介面（例如 `triggerTimerBridge`）
- Android 上優先呼叫 TWA 原生 bridge（若存在），否則 fallback 舊 Automate

#### Android 殼（TWA 專案）

1. 建立 TWA 專案（Bubblewrap）並綁定 Digital Asset Links
2. 新增 2x2 或 4x1 App Widget（四按鈕）
3. 每個按鈕發送到 NBL 對應 URL action
4. 新增本地通知排程（專注/休息）與時間到響鈴
5. （第 2 期）Calendar Bridge：嘗試建立事件後回傳 title/nextRun

---

### 4) 里程碑與工期估算

- M1（2-4 天）：
  - TWA 可安裝
  - 四按鈕 widget 可打到四個 action
  - PWA 缺參數草稿流程完成

- M2（2-3 天）：
  - 原生通知接管 focus/break
  - 到點提醒（聲音/震動）
  - 可延長通知存在時間與延長 5 分鐘

- M3（3-7 天，選做）：
  - Calendar Bridge PoC
  - 評估不同 calendar app 回傳一致性
  - 決定是否正式上線全自動回填

---

### 5) 你問的「會很難嗎？」直接回答

- 只做「可用版本（M1+M2）」：不難到不可控，屬中等可落地。
- 要做「calendar 建立後穩定回傳資料（M3）」：明顯較難，因為 Android 生態碎片化，建議先做 PoC 再決定投入。

---

### 6) 建議決策（可直接採用）

先做 M1 + M2，先讓 Android 使用者得到穩定體驗：

- 桌面四按鈕可直接用
- add inbox / scheduled 都不會卡住（缺參數就進草稿編輯）
- 專注/休息狀態可見、時間到會提醒、通知可延長

等這版穩定後，再進 M3 嘗試 calendar 全自動回填。

如果你同意，我下一步可以直接整理一份「M1 實作任務拆解（PWA 改哪些函式、Android 殼要哪些檔案）」接在這份文件下一段，讓你可以直接照單開工。

## [2026-05-28] ychsue 決策補充

- M3（calendar 自動回填）先不做。
- 小工具版型用 4x1。
- 網域是 `ychsue.github.io`。
- 想確認是否需要 Android Studio，因為要在實機 Android 測試。

## [2026-05-28] Copilot 回覆（依最新決策更新）

非常好，這個決策很務實。先做 M1 + M2，M3 暫緩，風險會低很多。

### 1) 4x1 Widget：採用方案

確認採用 4x1 橫向四按鈕：

- Query
- Interrupt
- Inbox
- Scheduled

每顆按鈕都導向 NBL 對應 URL action（無參數版本），參數不足時交給 PWA 草稿流程處理。

---

### 2) Bubblewrap 與 Android Studio：需要到什麼程度？

短答：

- 只想包「純 TWA 殼」：理論上可用 Bubblewrap CLI + JDK + Android SDK 完成。
- 你現在要做「4x1 Widget + 通知排程」：一定會進入原生 Android 開發，建議直接安裝 Android Studio。

原因：

- Widget、BroadcastReceiver、通知 channel/權限這些都要改 Android 原生專案。
- Android Studio 才方便你：
  - 編輯 `AndroidManifest.xml`、`res/layout`、`res/xml`
  - 管理 Gradle 與 SDK 版本
  - 直接連實機 debug / logcat

結論：你這個案子建議「Bubblewrap 產生專案 + Android Studio 做後續開發與測試」。

---

### 3) 你用 `ychsue.github.io` 的重點（很重要）

我看你目前 PWA 設定是 `start_url: /NonBlockingLife/`，也就是「同網域子路徑部署」。

對 TWA 而言，關鍵是：

- `assetlinks.json` 必須放在 **網域根目錄**：
  - `https://ychsue.github.io/.well-known/assetlinks.json`
- 不是放在：
  - `https://ychsue.github.io/NonBlockingLife/.well-known/assetlinks.json`

因此你需要確認：是否有能力控制 `ychsue.github.io` 根目錄內容。

- 如果可以控制根目錄：可直接用現有網域做 TWA。
- 如果你目前只能控制 project page 子路徑：建議改用自有網域（例如 `nbl.yourdomain.com`）或調整 GitHub Pages 架構，確保 root `.well-known` 可部署。

---

### 4) 建議你現在就做的安裝與驗證順序

1. 安裝 Android Studio（含 Android SDK Platform + Build-Tools）
2. 安裝 JDK 17（或 Android Gradle Plugin 相容版本）
3. 安裝 Node.js LTS（給 bubblewrap）
4. 用 bubblewrap 初始化 TWA 專案（先能安裝到手機）
5. 實機測試：
   - 先驗證 TWA 可開 `https://ychsue.github.io/NonBlockingLife/`
   - 再加 4x1 widget
   - 再加通知排程

---

### 5) M1 + M2（不含 M3）最終範圍確認

- 包含：
  - 4x1 widget 四按鈕
  - PWA 缺參數時草稿建立 + 自動進編輯
  - 專注/休息 ongoing 通知
  - 時間到提醒 + 可延長通知

- 不包含：
  - calendar 建立後自動回填 title/nextRun

以上範圍可直接開工。

如果你同意，我下一段就接著寫「M1 實作 task list（逐檔案）」：

- PWA：`useUrlAction.ts` / store / EditDialog 觸發點
- Android：`AppWidgetProvider`、`RemoteViews` layout、`DeepLinkRouterActivity`、`Manifest` 必要宣告

## [2026-05-28] ychsue 進一步確認

1. 不需要保留 Automate（Chrome intent 路徑風險太高）。
2. 有看到做法是另外開一個 GitHub repo 叫 `.well-known` 來放檔案，想確認何時放、怎麼產生。

## [2026-05-28] Copilot 回覆（移除 Automate + assetlinks 實作）

這兩點都很關鍵，結論如下：

### 1) Automate：正式移除，方向正確

同意你的判斷，這次專案不保留 Automate fallback。

架構決議更新為：

- Android 計時與提醒只走 TWA 原生殼（通知 + AlarmManager）
- PWA 不再依賴 `triggerAutomateFlow`
- 文件與 UI 文案都改成「Android Widget/TWA 原生整合」

這樣可以避免依賴「可能被 Chrome 行為變更影響」的路徑。

---

### 2) `.well-known/assetlinks.json`：何時放？怎麼產生？

#### 2-1. 何時要放

建議時機：

1. 先決定 Android app 的 `packageId`（例如 `io.github.ychsue.nonblockinglife`）
2. 先產生並固定「簽章金鑰」（keystore）
3. 拿到該金鑰的 SHA-256 指紋後，立刻建立 `assetlinks.json`
4. 在你第一次做「TWA trust 測試」前就上線到 `https://ychsue.github.io/.well-known/assetlinks.json`

重點：

- `assetlinks.json` 綁的是「package name + 憑證指紋」。
- 若之後換了簽章金鑰，檔案就要更新（可同時放多個指紋）。

#### 2-2. 檔案怎麼產生

`assetlinks.json` 是一個你可手動建立的 JSON，核心內容如下：

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "io.github.ychsue.nonblockinglife",
      "sha256_cert_fingerprints": [
        "AA:BB:CC:...:ZZ"
      ]
    }
  }
]
```

其中：

- `package_name` = 你的 Android app id
- `sha256_cert_fingerprints` = 簽章憑證指紋（通常至少放 release key）

指紋取得方式（示意）：

```bash
keytool -list -v -keystore <your-release-key.jks> -alias <alias> -storepass <password>
```

輸出裡的 `SHA256:` 就是要填入的值。

---

### 3) 你說的 GitHub `.well-known` repo 作法，可不可以？

可行，但要滿足「最終 URL 必須精準」這個條件：

- 必須可被公開讀取：
  - `https://ychsue.github.io/.well-known/assetlinks.json`

你提到的方法是：

- 新建 repo 名稱 `.well-known`
- 開啟 GitHub Pages
- 讓它對應出 `/.well-known/` 路徑

這在實務上是可嘗試的方案；但請你做一個最終驗證：

1. 直接在手機/電腦瀏覽器開 `https://ychsue.github.io/.well-known/assetlinks.json`
2. 必須回 200（不是 404/302 到其他頁）
3. 內容必須是你放的 JSON（不是 SPA fallback 頁面）

只要以上成立，TWA 驗證就有機會通過。

---

### 4) 建議你現在就執行的順序（最省時間）

1. 先定 packageId（不要之後再改）
2. [ ] 先建 release keystore（不要每次重建）
3. [ ] 產生 SHA-256，建立 `assetlinks.json`
4. 先把 `assetlinks.json` 上線到 `ychsue.github.io/.well-known/assetlinks.json`
5. 再開始 Bubblewrap init 與 Android Studio 實機測試

這樣可以避免你後面測試時才發現 trust 關係未建立，來回重跑。

如果你同意，下一段我就直接接著寫：

- 「M1 Task List（不含 Automate）」逐檔案版本
- 並附一份 `assetlinks.json` 可直接套用的模板（留 packageId 與 SHA 欄位讓你填）

## [2026-05-28] ychsue 追問

packageId 是否可以任意取？Google 有何限制？可否使用 `com.yescirculation.nonblockinglife`？

## [2026-05-28] Copilot 回覆（packageId 命名規則）

短答：

- 不是完全任意。
- `com.yescirculation.nonblockinglife` 可以用，而且是合理命名。

### 1) Android packageId 基本規則

建議遵守（實務上也幾乎是必要）：

1. 使用反向網域格式：`com.company.app` 或 `io.github.user.app`
2. 全小寫最安全（避免工具或平台相容問題）
3. 每段用英文字母開頭，後續可含數字與底線
4. 不可使用連字號 `-`
5. 至少兩段以上（例如 `com.xxx`）

### 2) Google / Play 相關限制（你最該注意的）

1. 全域唯一：Play 上不能和別的 app 重複
2. 一旦上架後通常不可改：改了就等於新 app
3. 要和簽章金鑰一起長期綁定：影響升級與 `assetlinks.json`
4. 避免侵權或誤導品牌字樣（政策風險）

### 3) 你的候選值可不可用？

`com.yescirculation.nonblockinglife`：可用，語法上與實務上都 OK。

補充建議：

- 若你希望和 GitHub 身分更一致，也可考慮：`io.github.ychsue.nonblockinglife`
- 兩者都行，重點是「先定案且之後不要改」

### 4) 對你目前 TWA 專案的建議

請現在就做一次定案：

1. 固定 packageId（例如 `com.yescirculation.nonblockinglife`）
2. 用同一組 release keystore 簽章
3. 依此產生與維護 `assetlinks.json`

這三者是一組綁定關係，後續改任何一個都會提高維運成本。

## [2026-05-28] ychsue 補充考量

之所以想用 `com.yescirculation.nonblockinglife`，是因為未來若有後端，網站可能不再放 GitHub Pages。

## [2026-05-28] Copilot 回覆（此命名的風險評估）

這個思路是對的，而且我偏向支持你現在就用 `com.yescirculation.nonblockinglife`。

### 1) 先講結論

- 用 `com.yescirculation.nonblockinglife` 來和 GitHub 網域脫鉤，是一個健康的長期策略。
- 未來網站從 `ychsue.github.io` 搬到自有網域，不需要改 packageId。
- 只要 app 不改 packageId、持續用同一簽章金鑰，Android app 升級路徑可保持穩定。

### 2) 主要風險是什麼

不是技術硬限制，而是「治理與品牌」風險：

1. 品牌/商標：`yescirculation` 若未來有商標或品牌衝突，可能需要調整品牌策略（但 packageId 仍不建議改）。
2. 組織延展：若未來同公司有多個 app，建議統一命名規範（例如 `com.yescirculation.nbl`、`com.yescirculation.timer`）。
3. Play 唯一性：上架時若撞名（極少見但可能），需調整 packageId，代價高。

### 3) 與「網域搬遷」真正相關的是什麼

真正會跟網域一起變動的是 App Links/TWA 驗證，不是 packageId 本身：

- 你現在是 `ychsue.github.io`
- 未來可能改到 `nbl.yescirculation.com`

搬遷時要做的是：

1. 在新網域部署 `/.well-known/assetlinks.json`
2. Android 專案更新對應網域設定（TWA/App Links host）
3. 保留同一 packageId + 同一簽章金鑰

這樣 app 可無痛延續，不需要重發一個新 app。

### 4) 我給你的實務建議

可以直接定案：`com.yescirculation.nonblockinglife`。

再加兩個保險動作：

1. 盡早註冊/持有 `yescirculation` 相關網域（若尚未）。
2. 把 release keystore 安全保存（離線備份 + 密碼管理），避免遺失導致升級斷鏈。

若你同意，下一段我就可以接著寫「M1 Task List（不含 Automate）逐檔案版本」，直接讓你開始實作。

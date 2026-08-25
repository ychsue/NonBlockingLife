# 準備接上前端

## [2026-08-23] ychsue 需求背景補充
現在JAVA端已經透過 postMessage 方式，讓前端可以派定、徵求與詢問 alarm 的相關資訊，由 Chrome://inspect 操作 port.postMessage 來測試，已經可以成功設定鬧鐘了。
現在要來設計前端PWA的部分了。

由於這個是PWA，而非單純的 Android App，因此，就像 [notification.ts](/pwa/src/utils/notification.ts) 我有根據 port 存不存在來決定是否使用 postMessage 來呼叫 JAVA 端的 notification API，這裡也要做同樣的事情。

根據 `LauncherActivity.java#handleIncomingMessage` 我們目前有五種
1. SET_ALARMS_MESSAGE_TYPE ("nbl:set-alarms")
2. QUERY_ALARM_SETUP_TYPE ("nbl:query-alarm-setup")
3. QUERY_CLOCK_APPS_TYPE ("nbl:query-clock-apps")
4. SELECT_CLOCK_APP_TYPE ("nbl:select-clock-app")
5. REQUEST_EXACT_ALARM_PERMISSION_TYPE ("nbl:request-exact-alarm-permission")

是否要使用 rxjs，來subscribe (含 index.html 裡的) port.onMessage，這樣，我們應該就可以PWA送出postMessage後，利用subscribe，拿它來設定 useState，甚至可以定時，若超過多久，就停止等待，也丟給該state，這樣，我們就可以控制狀態變化了。還是您有更好的辦法？
目前是有 [twaBridge.ts](/pwa/src/utils/twaBridge.ts)，可以完全改寫她沒問題，
之所以把監聽 `message` 放在 index.html，是因為怕網頁漏掉來自TWA的Channel連通事件，因為他就只發一次而已。

### PWA端的流程
1. [是否開始] 首先，當TWA首次打開， App.tsx 開始，這時先確認 AlarmTestMode 是否有需要Clock 或 Alarm 
    * AlarmTestMode 在 [appStore.ts](/pwa/src/store/appStore.ts) 裡面有定義，但我在想，既然您TWA的部分可以同時吃 Clock 與 Exact Alarm，那麼，這個也許改成flag 比較好，比方 0: none, 1: clock, 2: exact, 3: both，這樣就可以同時有兩種模式了
    * AlarmTestMode 的名字請幫我改一下，他已經不再是測試了，準備移出 Experiment 了
    * 如果不需要 Clock & Alarm，那麼就不需要做任何事情，直接 return 就好
2. [設定鬧鐘系統] 如果需要 Clock 或 Alarm，那就subscribe QUERY_ALARM_SETUP_TYPE ("nbl:query-alarm-setup")，這樣就可以知道目前的狀態了 (rxjs 在時間到 port 都沒生出來的話，也丟個訊息告知也好，type 可能給他 "*" 或 "nbl:query-alarm-setup-timeout" 之類的)
    * 如果時間到都沒有 port，有辦法確定她是在 TWA嗎？若能的話，告訴使用者，關閉此APP再打開可能就可以了
    * 若都滿足，就可下一步。
    * 如果兩個同時被要求，偏偏兩個都要設，由於Alarm的無從得知設定的時間，因此，建議先做 Clock 的部分，等 Clock 設定好後，再做 Exact Alarm 的部分。對吧？
3. [根據scheduled更新db.alarm_queue]
    * 這個部分，請參考 [MorePageContent.tsx](/pwa/src/components/more/MorePageContent.tsx) 裡的 handleSyncAlarmQueue()，可能應該把跟 AlarmQueue 有關的部分，儘量放到同一個目錄裡面，好方便管理，對嗎？這程式碼若有不足或者不合用，請幫忙修改，謝謝。
    * 在判別中，有甚麼好方式讓人知道呢？
4. [設定TWA鬧鐘] (應該與上面那點交換嗎？我怕上面那個若使用者有很多scheduled時會太花時間)根據 db.alarm_queue 的內容，
    * 給Clock 的，就只取從現在算起24小時內的；而給 Exact Alarm 的，就全傳過去
    * 給的文字應該有原本的title，原本設定的 NextRun 與 offsetMinutes，變成方便讀者一看就知道哪個事件在多久後就預訂在何時發生
    * 因此，db.alarm_queue 的state 好像應該分成 clock_state 與 exact_state 兩個，然後，現在的預設值似乎不大合理了
    * 設定中，有甚麼好方式(比如不會消失的但可以移動的Toast)可以讓使用者知道目前正在設定鬧鐘中嗎？因為這個可能要等一段時間，才能知道結果
    * 根據傳回來的，更新 db.alarm_queue 的狀態，這樣就可以知道哪些鬧鐘已經被設定了，哪些還沒被設定
5. [正常使用...->Scheduled裡設定要用的鬧鐘]
    * ScheduledTable.tsx 裡面的`ShowMobileFilters` 裡面 component，和不是Mobile時，在它上面的 component的裡面，放入勾選Clock 與 Exact Alarm 的checkbox，這樣就知道使用者想要哪些功能的鬧鐘
    * 外加一個 button (只要兩個中的一個勾選，就會出現)，來觀看目前 db.alarm_queue 的狀態
6. [ScheduledTable.tsx裡面觀看db.alarm_queue]
    * 先不用能操作，只要能看即可，免得一次做太多
    * 類似 [AlarmQueuePanel.tsx](/pwa/src/components/more/AlarmQueuePanel.tsx)，但請重寫
    * 可能可以讓使用者可以選看簡版與豐富版(豐富版可能未來可以讓使用者自己決定個別alarm要選用哪些
    鬧鐘等)
    * 可以視覺化已經在TWA設好的clock與exact alarm 嗎？
7. 還有甚麼需要注意的嗎？還是您有更好的想法？需要先討論一下再開始做嗎？謝謝。

---

## [2026-08-23] GitHub Copilot 建議

看完 `appStore.ts`、`notification.ts`、`twaBridge.ts`、`MorePageContent.tsx`、`alarmQueue.ts`、`schema.ts`、`AlarmQueuePanel.tsx` 之後，整體方向我覺得可行，但有幾處會卡住或值得先講清楚，逐點回覆：

### 1. AlarmTestMode 改 flag
可行，但要注意：現在 `alarmTestMode: 'none'|'notification'|'system'`（[appStore.ts#L21](pwa/src/store/appStore.ts#L21)）其實是 **Experiment 面板的手動測試工具**（一個丟瀏覽器通知、一個開系統時鐘 UI 測連通），跟你現在要的「這個排程要不要同步到 Clock/Exact Alarm」是**不同軸線的概念**，硬改成同一個 bit flag 會讓語意混淆。
- 建議：新開一個獨立欄位，例如 `alarmSyncTargets: number`（0 none / 1 clock / 2 exact / 3 both），放在正式（非 Experiment）設定裡；原本 Experiment 頁的 `alarmTestMode` 三選一保留當純手動測試工具，或直接砍掉 —— **這個我要跟你確認：Experiment 面板那組手動測試要保留嗎？**
- localStorage key 沿用舊 key 沒問題，但**型別從 string 換成 number**，要在 `getInitialAlarmSyncTargets()` 加型別檢查與預設值（例如非法值 fallback 到 0），不要直接 reuse `ALARM_TEST_MODE_KEY`。

### 2. rxjs vs 輕量方案
專案目前**沒有裝 rxjs**（package.json 沒有這個依賴）。只是「送出一個訊息 → 等一個特定 type 的回覆 → 逾時就給 timeout 訊息」這種一次性需求，我會建議寫一個小工具函式取代整套 rxjs：
```ts
function waitForTwaReply<T>(sendFn: () => void, matchType: string, timeoutMs = 3000): Promise<T | { type: 'timeout' }>
```
用 `listenForTwaMessages` + `Promise.race` 就能做到，不用多背一個一整套 Observable 的學習成本和 bundle size。如果你有其他地方也想大量用 rxjs（例如未來要做多個 stream 合併），那再引入也不遲——**先問你：只是這個場景，還是你預期之後會更廣泛地用 rxjs？**

### 3. 判斷「有沒有在 TWA 裡」
有可靠方法：TWA 開啟頁面時，Android 會把 `document.referrer` 設成 `android-app://<package-name>`（這是 Google 官方文件建議的偵測方式，比 `display-mode: standalone` 更準，因為後者一般 PWA 安裝也會符合）。
```ts
const isInsideTwa = document.referrer.startsWith('android-app://')
```
逾時又偵測不到在 TWA 內，就能明確告訴使用者「這個功能需要在 App 裡使用」；若偵測到在 TWA 內但逾時，才提示「請關閉 App 重開」。這兩種文案應該分開講，不然使用者在瀏覽器版打開時會被誤導去重開 App。

### 4. 先 Clock 後 Exact 的順序
這句我沒完全理解你的原意（"由於 Alarm 的無從得知設定的時間" 這句怪怪的）。目前 Java 端 `nbl:set-alarms` 已經支援**一次送出混合陣列**（`mode:"clock"` 和 `mode:"exact"` 混在同一批），Android 端會依序處理並在一次回覆中給合併結果，所以**技術上不需要前端分兩次呼叫、等 Clock 做完才做 Exact**。
如果你的意思是「準備資料時，Clock 只能塞 24 小時內的、Exact 才能塞全部」，那是第 4 點裡「篩選邏輯」的事，跟「呼叫順序」無關——這部分我需要你確認一下真正想表達的是哪一種，才不會做錯方向。

### 5. `state` 拆成 `clockState` / `exactState`
同意且必要，但這是目前討論裡**影響面最大**的改動，牽動：
- `schema.ts` 要開 `version(4)`，新增欄位＋ index，並寫 `.upgrade()` 把舊的單一 `state` 遷移成兩個新欄位的合理預設值（例如都 fallback 成 `'pending'`）。
- `alarmQueue.ts` 裡 `syncAlarmQueueFromScheduled`、`getDueAlarmQueueEntries` 等目前判斷邏輯全部是 `item.state === 'pending'`，要重新設計「兩個狀態各自獨立、但整體要不要重新產生/刪除」的規則（例如：clock 已成功但 exact 還沒的項目，不該被當「全部完成」清掉）。
- 這塊我建議獨立列一個小節詳細討論 enum 設計（例如 `clockState: 'not_applicable'|'pending'|'set'|'failed'`），再動手，不要跟其他步驟混在一起做。

### 6. 「不會消失但可移動」的 Toast
現有 `showGlobalToast`（MorePageContent 已在用）看起來是「顯示一段時間自動消失」的一次性 toast，沒有「常駐＋可拖曳」的能力，這是**新 UI 元件**，不是既有機制的參數調整。
建議先做「常駐固定位置（例如右下角）+ 顯示進度/筆數 + 完成後自動淡出」就好，**先不做拖曳**——拖曳要處理事件、邊界、跨裝置觸控，投入產出比不高，除非你有明確需求（例如常擋到操作區）。

### 7. 視覺化「已經在 TWA 設好的鬧鐘」
有個重要限制要先說清楚：
- **Clock 模式**：`ACTION_SET_ALARM` 是 fire-and-forget 的 `startActivity`，Android 端的 `ok:true` 只代表「成功把 Intent 丟給時鐘 App」，**不保證**該 App 真的建立了鬧鐘（尤其某些非 Google Clock 的 App 可能不支援 skipUi、或需要額外確認）。所以畫面上呈現的「已設定」其實是「已送出請求」，語意上要跟使用者說清楚，不能宣稱 100% 已確認。
- **Exact 模式**：我們自己排程、自己管理，`ok:true` 較可信，但 Android 沒有提供「列出我目前所有已排程的鬧鐘」API（`AlarmManager.getNextAlarmClock()` 只給全系統下一個最近的，不是我們自己的清單），所以要顯示「目前有哪些 exact alarm 生效中」也只能**信任 DB 裡的紀錄**（Android 排程成功時回的 `nbl:set-alarms-result`），而不是去反查系統狀態。這點我建議直接在 UI 上用小字註明「以本機紀錄為準」，避免使用者以為那是即時查詢系統得到的。

### 整體建議
這個計畫本身沒有方向性問題，但範圍偏大（跨 Android 訊息、Dexie schema migration、Zustand store、多個元件），我建議照你列的 1→7 **一步一步做並個別驗證**，尤其第 5 點的 schema migration 最好單獨一個回合處理完並跑過現有測試（`alarmQueue.test.ts` 之類的），再疊加第 3、4 點的前端流程邏輯，最後才做第 6、7 點的 UI 呈現。

要不要我們先把 **第 1 點（欄位/命名決定）+ 第 5 點（schema migration 設計）** 敲定，我再開始動手？

---

## [2026-08-23] ychsue 回覆
1. Experiment 面板那組手動測試**不需要**保留，並且不要直接 reuse `ALARM_TEST_MODE_KEY`
2. 我以前常用 rxjs 做這種資源fetch的動作，有debunce等功能，目前的確如您所說的也可，未來我還會加入利用 ics fetch (又要跟TWA拿了) 來當作與 db.scheduled 平行的排程紀錄，依您方便為準，沒問題。
3. 果然如您所說，這太好了，可能變成全域變數比較好。
4. 因為設定鬧鐘系統時，我們要呼叫
QUERY_ALARM_SETUP_TYPE
QUERY_CLOCK_APPS_TYPE
SELECT_CLOCK_APP_TYPE
其中的 QUERY_ALARM_SETUP_TYPE 打開後，根本無法知道使用者花多長時間在乾瞪眼後才決定，屬於射後不理，而另外兩個都是很快的。
嗯，QUERY_ALARM_SETUP_TYPE 其實我們可以在丟出後，PWA這裡立刻顯示一個 [Global Dialog](/pwa\src\GlobalDialog.tsx)  請使用者完成選擇是否同意設置Exact Alarm後，再繼續也可。
這樣的確就沒順序問題了，謝謝。
5. 好，enum 的設計可以在需要時來討論，我覺得您舉的例子那四個狀態就很合理了。
6. 先做「常駐固定位置（例如右下角 + 完成後自動淡出」就好，先不做拖曳，沒問題。
7. 有道理，這樣就不會誤導使用者了。
8. 補充說明，在我最開始舉的 `3. [根據scheduled更新db.alarm_queue]` 我覺得在那裏把 alarmAt 比現在早的，也就是過時的移除即可，因為這個 queue 目前並沒有想做歷史，只是為了方便使用者知道哪些鬧鐘已經送出設定到TWA了，是否真的成功當然還是依TWA的真實狀況為準。
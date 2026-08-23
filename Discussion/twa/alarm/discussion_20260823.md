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
# Journal

## [2026-04-01] 現在有 Resource 了，還有搜尋功能，但還沒套用到其他頁面

修改細節，請見 [discussion_20260401.md](Discussion\discussion_20260401.md)

## [2026-03-31] Task Tables 都在addRow裡面加上 與 避免兩次 add New Row 的邏輯 還有Inbox 的移動功能

```tsx
setEditingItem(newRow)
```

## [2026-03-30] 做以下的修正

1. [x] NBL使用者有可能Safari切到私密瀏覽，就會導致沒辦法使用D B紀錄
2. [x] 開始應該要多一個紀錄的按鈕，因為有時候只想記錄事件，卻不想要記錄開始到結束的時間
3. [ ] 使用者第一次使用時，或者可以跳出那個多頁簡易教學。原本的叫做詳細教學。

## [2026-03-29] 多 URL 欄位與 如果該欄位有值，就在 [TableCard.tsx](/pwa\src\components\TableCard.tsx) 顯示連結按鈕，讓使用者按該按鈕就會開啟該連結

## [2026-03-29] 試著修正在iPhone XS手機上， #file:EditDialog.tsx 裡面的 input 的 type 為 datetime-local的 input，寬度硬是比其他的長了一點，似乎因為這樣，導致我在滑那頁面時，本該只有上下，卻會有點左右飄移

## [2026-03-27] 允許使用者在 iPhone 上設定任務的 focus_time 以決定是否啟動計時器

原則上，在 [schema.ts](pwa\src\db\schema.ts) 多設 `focusTime?: number`，然後在 [ScheduledTable.tsx](pwa\src\components\tables\ScheduledTable.tsx) 裡面加入這個欄位的顯示與編輯，最後，在 START 的流程裡面，根據這個欄位來決定要不要啟動計時器。
這樣，就可以舊手機上的data也相容(要上iPhone 再測看看)

## [2026-03-25] 當有任務在跑時，讓Header閃爍，並且顯示一個按鈕可跳到Selection_Cache的頁面

## [2026-03-19] AI 的幫助下，給頁面們加上了說明，並且改良手機時的卡片行為

1. [TableCard.tsx](pwa\src\components\TableCard.tsx) 讓手機可以用滑動的來編輯與刪除
2. [TableHelpDialog.tsx](pwa\src\components\TableHelpDialog.tsx) 引進 react-markdown，這樣就可以直接寫 Markdown 來說明了，還有一些樣式上的改良

## [2026-03-18] 試著使用別人的影片與新增想減少使用時間的任務

1. 使用 [ed br 的](https://www.pexels.com/zh-tw/@ed-br-1727831108/) 的素材
2. 新增 如果 Task Pool 含有 ⛔，他就會變成希望戒除的習慣

## [2026-03-14] 影片中應該強調一下 Inbox 的用處。

## [2026-03-13] 想使用 ms-clock://timer 來啟動計時器，但是失敗，因為她不接受 `duration` 與 `title` 的設定

### Copilot 建議：

#### ✅ 方案 B：使用第三方 Timer App（支援 URI）

例如：

* Hourglass
* SnapTimer
* MultiTimer

這些 App 支援：

```web
hourglass://2m
```

並且會自動開始倒數。

#### ✅ 方案 C：你自己在 NonBlockingLife PWA 裡做倒數計時器（最可控）

你可以直接在 PWA 裡做一個給沒有 Shortcuts 的平台：

* 可視化倒數
* 可背景運作（使用 Web Worker）
* 可通知（Web Notifications）
* 可跨平台（iOS / Android / Windows / macOS）

這反而比依賴 Windows Clock 更可靠。

## [2026-03-12] 請 VSCode Copilot AI 幫忙想YouTube 設計，他好強啊

### 學到

所謂「上片文案包」，就是影片發布時要用到的整套文字素材包。它通常包含標題、縮圖文字、說明欄、章節時間碼、置頂留言、hashtags，還有 Shorts 用的短文案。重點不是寫得多華麗，而是讓你剪完片之後，不會卡在「現在標題要怎麼下、說明欄怎麼寫、留言要留什麼」這些地方。

### 明天來玩看看

我先讀目前的上片文案包，再直接替你做「最終推薦版」與「中英雙語發片策略」，順便回答你是否真的該拍六支。

我再往前一步，直接幫你做「簡化英文逐字稿」，讓你不是只看策略，而是真的能拿來念。

我幫你直接把這件事落地了，而且先講結論：

數學上是 6 支沒錯，但我不建議你第一輪就拍滿 6 支。對你現在最好的做法，是先用中文版把主線講順，再做英文精簡版。這樣比較穩，也比較不會被英文拖住。

我已經新增兩份文件：

- 中英雙語發布最終建議：14th_bilingual_release_plan.md
- 簡化英文逐字稿：15th_english_simple_script.md

我目前最推薦你的發布順序是：

1. 中文 5 到 6 分鐘主影片
2. 中文 Shorts 1：痛點版
3. 中文 Shorts 2：主流程版
4. 英文 3 到 4 分鐘精簡主影片
5. 英文 Shorts 1：核心概念版
6. 中文 12 分鐘完整教學放到後面再做
7. 英文 12 分鐘教學先不要急著做

所以不是「不行拍 6 支」，而是「現在不值得一口氣拍 6 支」。

至於你問英文不大好，適不適合拍英文版，我的答案是：適合，但要換打法。你不需要追求很漂亮的英文，也不需要像母語者。你真正需要的是短句、慢速、清楚。這也是我幫你做 15th_english_simple_script.md 的原因。那份稿子是專門為非母語者設計的，句子短、字簡單、停頓清楚，拿來念會比硬翻中文稿安全很多。

如果你要我現在直接替你拍板，我會這樣選：

中文主影片最適合的標題：
我做了一個不怕被打岔的待辦系統：NonBlockingLife

中文縮圖文字：
被打斷也回得去
Event Loop 任務系統

英文主影片最適合的標題：
I Built a Task System That Handles Interruptions

英文縮圖文字：
Handles Interruptions
Not a Todo App

如果你願意，我下一步可以直接幫你做「最終定稿版」，也就是直接產出：

1. 中文正式上片版：唯一標題、唯一縮圖字、唯一說明欄、唯一置頂留言
2. 英文正式上片版：唯一標題、唯一縮圖字、唯一說明欄、唯一置頂留言

你到時幾乎可以直接複製貼上。

Made changes.

---

好，這樣的節奏是對的。你現在手上其實已經有一整套可執行素材了，從企劃、口播、拍攝、上片到中英分流都能直接開始試。

目前 Promotion 目錄裡你可直接用的文件有：

- 企劃總稿：10th_discussion.md
- 中文口播稿：11th_voiceover_script.md
- 拍攝清單：12th_shooting_checklist.md
- 上片文案包：13th_upload_copy_pack.md
- 中英雙語策略：14th_bilingual_release_plan.md
- 英文簡化稿：15th_english_simple_script.md

你先試行非常合理。等你真的開始拍、剪、上片之後，問題通常會變得很具體，那時候我能幫得更準。像是：

1. 中文稿哪一段唸起來卡
2. 英文稿哪一句不自然
3. 哪個標題或縮圖比較適合
4. 影片節奏哪裡太慢
5. 上片後留言怎麼回比較好

有任何卡點，直接回這串接著問就可以。我會沿用現在這套脈絡幫你往下修，不用重來。

## [2026-03-11] 增強 SyncStatus 的體驗，順便更新文檔們。明天來準備拍影片

## [2026-03-10] 修正 Log 的錯誤，順便讓他可以搜尋

## [2026-03-09] 能夠顯示怎麼安裝到 GAS 上了

使用

```js
import gasCode from "../gas/程式碼.js?raw";
```

就可以使用該程式碼了。

## [2026-03-08] 能夠sync 了，明天想一下怎麼讓使用者容易安裝 GAS

## [2026-03-07] 同步了，但有問題

## [2026-03-06] 準備同步，目前在步驟 1

順便給正在跑的 task 加上計時

## [2026-03-05] 讓 scheduled callback 與 remindAfter 有作用

## [2026-03-04] 想說簡單的在 useEffect [] 裡面呼叫 handleRefreshCandidates 即可

錯誤訊息如下：

``` js
selection_cache.bulkAdd(): 7 of 7 operations failed. Errors: ConstraintError: Key already exists in the object store.
```

Gemini 有回答

1. `bulkAdd`改為使用 `bulkPut` 比較簡單，反正就複寫
2. 使用 `db.transaction('rw',TABLE,async()=>{...})` 這個就會強制clear 與 bulkAdd 是依序的

## [2026-03-02] 修改 Shortcuts 與一些datetime UI 顯示的問題

1. Shortcuts:
   1. [x] Scheduled: 因為打錯字
   2. [x] NBL_Timer: 做點修正

## [2026-02-28] 規劃一下 iOS 那端想要甚麼

1. [x] 開始`start` 後，就 **iPhone** 變單色，設30分鐘計時器
2. [x] `end`後，就 **iPhone** 變回原來顏色，設定10分鐘計時器
   1. [x] 如果是 Scheduled，若有 `Callback` ，表示 **iPhone** 要 `Remind_After` 分鐘後需要提醒使用者要切換另一個任務
3. [x] `inbox` 就直接加一個 inbox
4. [x] `interrupt` 按下去就開始 start interrupt，讓 **iPhone** 走 `start`
5. [x] `scheduled` 按下去會先開啟 **iPhone** calendar，然後，才寫入 `scheduled`

## [2026-02-27] 總算能正常關閉 EndDialog，且使用 Zustand 來管理頁面與 ShowEndDialog了

簡單講，就是 ref.current 有可能在渲染後被改了，所以，原本的open就沒用了

## [2026-02-25] 讓螢幕太小的改用 Dialog 來修改參數

## [2026-02-25] 修正視覺

## [2026-02-24] Tailwind 啟動，所以變得好漂亮

## [2026-02-24] 加入Interrupt action

## [2026-02-24] 自動添五個我常用的專案

## [2026-02-24] 加入精簡 change_log 的條目，因為有可能出現 add->update->delete 的情形，這種無需處理

## [2026-02-23] 加入 Log, handleStart, handleEnd 與 handleInterrupt

## [2026-02-22] 完成Selection_Cache 的雛型

## [2026-02-18] 修正自動更新table，現在要回iPhone 看看

## [2026-02-16] 提交到 Github 看看，這PWA能否運作

正在處理 iPhone 的部分，需要多180x180 的 icon

## [2026-02-16] 能用 iPhone add inbox 了

## [2026-02-16] 準備上 Github Page 請看 [discussion](Discussion\8th_disucssion.md#方案-agithub-actions-自動部署推薦)

## [2026-02-15] 已經完成第一個 inbox 編輯 (update/delete/new)

1. Github Copilot 將他寫到 [App.tsx](pwa\src\App.tsx) 裡面，先實驗，已經通過
2. 執行的話，得先 `cd pwa; npm run dev`

## [2026-02-15] 先安上串到 Google Sheets API adapter 的函數，但尚未實作

寫在 [sheetsAdapter.ts](pwa\src\db\sheetsAdapter.ts)

## [2026-02-12] Dexie 已經進來，尚未確認

1. 在 [sync.ts](pwa\src\db\sync.ts), [schema.ts](pwa\src\db\schema.ts) 與 [changeLog.ts](pwa\src\db\changeLog.ts)
2. Dexie 要使用 `import { Dexie, type Table } from 'dexie'` 而非 `import Dexie, {type Table } from 'dexie'`
3. 若某個檔案同時有 .ts 與 .js，他會記得 js 那個，就算刪除該.js檔案。所以，後來我就使用改檔名，等都改完後，就把VSCode關閉，再打開。再改回原來檔名，問題似乎就解決了。

## [2026-02-12] 準備處理 Dexie

## [2026-02-12] 對 Micro_Tasks 加點修正

[ ] 應該還有身心健康的log 與 Dashboard 才對，邏輯有一些些不同

## [2026-01-28] 加入可以加入 scheduled task 的API，若可以，順便把 iOS 的部分做出來

1. [handleAddScheduledTask](gas\src\Logic.js)
2. [addToScheduledTasks](gas/src/SheetsService.js)
3. [Cron得使用legacyMode:false](gas\src\Utils.js)

## [2026-01-27] 做些更新

1. [Logic.js](gas\src\Logic.js) 的 handleInterrupt 改為直接呼叫 handleEnd 來設定
2. [Utils.js](gas\src\Utils.js) 的 calculateCandidates 的 title 給他多告知 task 已經花的時間。

## [2026-01-25] 準備上到 GitHub

## [2026-01-25] 修正 Scheduled 裡面若沒有 cron_expr 在 END 時，要把 NextRun 給清掉，並且改為 WAITING

[Logic.js](gas\src\Logic.js) 的 `handleEnd` 宣告此要求。

[ ] TODO TODO TODO [加強提醒功能建議](./Discussion/6th_discussion.md#2026-01-25-ychsue-我目前是使用-start-時他會設定一個30分鐘的鬧鐘提醒我該起來了還是您有更好的建議)

   - 值得做，現在先不要。

## [2026-01-24] 修正 handleEnd gas 讀入日期字串可能會自動轉換為日期，導致比對錯誤的問題

目前只在 [SheetsService.js](gas\src\SheetsService.js) 的 `updateTaskInPool` 有看到，可能還有。

## [2026-01-24] 修改 handleEnd 好使他可以設定對的 NextRun (應該吧，再試用看看)

1. [Logic.js](gas\src\Logic.js) 因為由 crontab string 所得的日期有可能小於等於原本的 NextRun，照理講，我們提前執行他，應該要把NextRun 設到oldNextRun的後面才對。

## [2026-01-24] 修正 Query_Option 使之運作正常

1. [checkTimers.js](gas\src\checkTimers.js) 在GAS，放到時間驅動裡面呼叫， input arguments 似乎並非 `Null`，所以，只好以檢查是否有使用到的函數來辦理。
2. [Logic.js](gas\src\Logic.js) 提供 `handleQueryOptions` API，原理乃是由 `Selection_Cache` 抽取PENDING中的Task。
3. [SheetsService.js](gas\src\SheetsService.js) 在 `updateSelectionCache` 裡，將有用的資訊放入 `Selection_Cache` 裡面。
4. [Utils.js](gas\src\Utils.js) `calculateCandidates` 裡面多加入抽取出哪些 Task 當日所花時數要歸零，還有 Tasks 當日總花費時數
5. iOS 學到的教訓：
   1. 列表 (list) 吃 `string[]`，點選後，會傳回被點的 `string`，所以，得把 `options:{key:{....}}`，然後 `keys:[...]` 這兩個這樣子餵給 `iOS捷徑(Shortcuts)` 才行。
   2. 可以多次設定相同變數，這在 `Query_Options` 被點 list 後，執行 `開始新的 Task` 很重要，因為我們希望無論獨立執行或被列表調用 `開始新的Task` ，都能夠設定 `taskId`
   3. 傳出參數後，被執行的捷徑怎麼接收這參數呢？要使用 `設定變數`，然後它的來源要選 `捷徑輸入`，這樣就可以了。

## [2026-01-23] 準備 Query_Option 的前置作業，即 Selection_Cache 的填入

1. [checkTimers.js](gas\src\checkTimers.js) 放到 GAS 的每15分鐘 trigger
2. [Config.js](gas\src\Config.js) 統一 `TASK_STATUS`，這樣，才有辦法做決定順序用
3. [Logic.js](gas\src\Logic.js) 修正 `handleEnd` 的 `TASK_STATUS` 的輸出。
4. [SheetsService.js](gas\src\SheetsService.js) 填入 `Selection_Cache`
5. [Utils.js](gas\src\Utils.js) 考慮了 score 的計算，而 `Task_Pool` 的部分，根據Google AI 的建議，給予
   1. **基礎權重 (Priority)**：任務本身的重要性。
   2. **配額加權 (Quota Factor)**：根據剩餘可用時間調整。
   3. **飢餓加權 (Starvation/Recency)**：根據多久沒跑了來加分（避免某些任務被無限期擱置）。

## [2026-01-22] 在 iPhone 捷徑 上的 `結束Task` 加入自動加入行事曆與計時的功能

也將 [iPhone 捷徑](ios\Shortcuts_Setup.md) 也加進來，下一個看看用 Jelly 或者還是直接在 iPhone 上寫吧。

## [2026-01-21] 修正 Scheduled 的一些bug

這部份透過在 GAS 上寫 [test.js](gas\src\test.js)，然後使用 `偵錯` 就可以找出哪裡寫錯。

## [2026-01-21] 改良 Scheduled 的 NextRun 的邏輯

1. NextRun 由 `End` 的時候根據 `cron_expr` 或者 `callback`+`after_task`設定，
2. 直接下載 [croner.min.js](./gas/src/croner.min.js) 來使用，此專案為 [Croner](https://github.com/Hexagon/croner/tree/master)
3. 修改 [Logic.js](./gas/src/Logic.js) 的 handleEnd 好讓他可以 handle NextRun
4. [SheetsService.js](gas\src\SheetsService.js) 多了 `_sheetCache` ，這樣，就不會重複抓同一個 sheets 了
5. [utils.js](./gas/src/Utils.js) 有
   1. `parseToMinutes(takesTime)` 來將 `30m`, `1h`....變成分鐘數
   2. `getNextOccurrence(cronExpr, baseDate = new Date())` 則會將 crontab 字串變成一個 NextRun

## [2026-01-20] 加入 Scheduled Task 的邏輯

## [2026-01-20] 加入 Interrupt 的邏輯，修正小錯誤

## [2026-01-18] 準備加入 Inbox 的部分

## [2026-01-17] 先完成 Start 與 End 的部分

## [2026-01-16] Grok的幫助下，可以使用 `export` 而不會上傳到GAS 與 Copilot 幫忙寫的GAS 程式

可以做 Jest 測試

## [2026-01-15] 加入 Google Sheets 與簡易 GAS程式

[將Gemini的輸出轉為Markdown](https://safemarkdown.com/)

### Sheets Structure

1. **Dashboard**: Current system state & metrics. (看)
2. **Event_Log**: Raw telemetry (Timestamp, Action, Task). (分析用)
3. **Task_Pool**: Active projects & MacroTasks.
4. **Micro_Tasks**: Fast execution items (< 2 mins).
5. **Periodic_Config**: Rules for recurring events.
6. **Async_Await**: Callbacks & external dependency tracking. (如洗衣服)

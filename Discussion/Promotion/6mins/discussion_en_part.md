# 英文版的討論紀錄

## [2026/04/30] ychsue

昨天下午搭配您的建議，我將中文影片發上去 YouTube 了，所以，現在準備拍英文的部分，關於英文口白可以幫忙一下嗎？謝謝。
對了，您覺得我是否需要將多國語做到頁面裡？主要是按鈕或表單上的文字，而像是說明的文字，應該可以先不翻吧？因為其實可以使用瀏覽器自己的網頁翻譯即可。而按鈕或表單上的文字，因為常常會切換到這些頁面，若以Safari，就要手動讓網頁翻譯，感覺有點麻煩。這樣的考量對嗎？

## [2026/04/30] GitHub Copilot 的建議

可以，而且我建議英文版不要直譯中文稿，而是改成「更像產品介紹影片」的英文口白。英文觀眾通常更吃這種節奏：先講痛點，再講原則，再講它怎麼解決，最後才講平台與開源。你提到的多國語考量也對，我會建議先做「操作介面文字」的多語，不急著全面翻譯長篇說明。

**英文口白**
下面這版是可直接錄的 4 到 6 分鐘英文稿，語氣比逐字翻譯自然，也比較像 YouTube 產品介紹：

```text
Hi, I’m the developer of NonBlockingLife.

Today, I want to show you the core idea behind this project, what problem it tries to solve, and how I use it in daily life.

The biggest problem I used to have was not that I had no task list.
It was the opposite.
My tasks, ideas, and reminders were scattered across too many apps and devices.
Each tool had its own workflow, its own rules, and its own friction.

And after an interruption, getting back to my main task was often harder than the task itself.
Sometimes I got stuck just deciding which app to open.
Sometimes I relied on memory.
And sometimes I ended up scrolling on my phone instead of returning to work.

At the end of the day, I often felt busy and tired, but I still couldn’t clearly explain where my time had gone.
That was frustrating.

So NonBlockingLife is my attempt to reduce that mental overhead.

The idea is simple:
instead of replacing every specialized app, NonBlockingLife acts as a lightweight control center for tasks and ideas.
Complex systems can still stay in their own apps.
But when I need to decide what to do now, or when I need to recover after being interrupted, I come back here.

Another core principle is this:
treat the brain like a single thread.

When I enter a work session, I try to focus on one thing at a time.
That sounds obvious, but interruptions happen all the time, and usually in two forms.

The first type is when an idea suddenly appears.
Maybe I remember something I need to do, or I think of something I want to explore later.
Instead of switching context immediately, I put it into the inbox.
That way, I don’t need to trust my memory, and I don’t need to break my current flow.
If needed, that item can also link back to the original app, page, or resource.

Later, I can review those inbox items and decide what they really are.
Some become scheduled tasks.
Some go into the main task pool.
Some become micro tasks for small fragments of time.
And some are just references or ideas that should stay in storage for later.

The second type of interruption is something that needs immediate attention.
For that, I can enter an interrupt state directly.
In NonBlockingLife, an interruption is also treated as a task.
It has a beginning, an end, and a record.
So instead of disappearing into a vague gap of time, it becomes something trackable.

This leads to another important benefit:
time visibility.

In principle, every task start and task end can be logged.
So later, I can review what I actually spent time on.
That makes it easier to understand my days, and easier to improve them.

For syncing and analysis, my normal workflow stays local, so it feels fast.
And when I sync to the cloud, the data goes to my own Google Drive.
That means I can keep the system lightweight without needing a traditional backend.

Because this is a web app with no backend server, it can run on basically any device with a modern browser.
Of course, that also means it cannot do everything a fully native mobile app can do.

But if a platform can call APIs, there is still room for useful integration.
Right now, I expose actions such as interrupt, query, and add.

I personally use an iPhone, so I integrate some native-like behaviors through iPhone Shortcuts.
For example, I can quickly add a task into the inbox.
Those shortcuts can be downloaded from the guide pages, and since most of them are based on API calls, you can also build your own.

If you are on desktop, I recommend installing it as a PWA.
I also provide a web+nbl URL schema, so you can create shortcuts that jump directly into specific actions.

Finally, this is an open-source project.
You can find the source code on GitHub, open issues, or contribute if you want.
It is still mainly maintained by me, but I welcome feedback and community involvement.

Thanks for watching.
```

如果你想讓英文版更有記憶點，我建議把一句核心句固定下來，重複一次就夠了：
“One brain, one thread.”
這句很好記，也很適合做標題、縮圖、片中字幕。

**英文版拍攝建議**
英文版建議不要完全照中文段落長度平均分配，節奏可改成：

1. 前 20 秒先講痛點，不先講自己。
2. 第 1 分鐘內就講出核心概念：「lightweight control center」和「single thread」。
3. 中段用兩種 interruption 分類來解釋實際用法。
4. 後段才講 sync、PWA、Shortcuts、open source。

如果你要，我下一輪也可以直接幫你整理成：

1. 更口語、比較像真人講話的錄影版
2. 比較穩、比較像產品發表的正式版
3. 60 到 90 秒英文短版，用來做 trailer 或 Shorts

**多國語是否要做進頁面**
你的考量是對的，而且這個切法很務實。

我會建議你先做「介面層級」的多語，不急著做「內容層級」的多語。

適合先翻的：

1. 按鈕文字
2. 表單欄位名稱
3. 選單
4. 狀態文字
5. 錯誤訊息
6. 任務類型名稱
7. 時間與操作提示

可以先不翻的：

1. 長篇說明
2. 教學段落
3. 詳細導讀頁內文
4. 開發文件
5. 較少進入的說明頁

原因很簡單：

1. 使用者高頻互動的是按鈕、欄位、狀態文字。
2. 這些文字短，但理解成本高，因為每次操作都會碰到。
3. Safari 的整頁翻譯確實有摩擦，尤其在 PWA 或常切頁的情境下更明顯。
4. 長篇說明反而是低頻閱讀，交給瀏覽器翻譯 usually good enough。

所以你的判斷可以整理成一句產品原則：
「高頻操作文字內建多語，低頻閱讀內容先交給瀏覽器翻譯。」

這是合理的，不是偷懶，是優先順序正確。

**我建議的實作順序**
如果你現在要開始做多語，先做這四層就夠了：

1. 第一層：最常按到的 UI
Save, Cancel, Add, Edit, Delete, Start, End, Sync, Back, Confirm

2. 第二層：表單與狀態
Title, Note, URL, Scheduled Time, Task Type, Running, Paused, Interrupted

3. 第三層：核心術語統一
Inbox, Scheduled, Task Pool, Micro Tasks, Interrupt, Mainline, Log

4. 第四層：錯誤與提示
Missing field, Invalid URL, Sync failed, Task started, Task ended

一開始不要碰整份說明文，不然會膨脹得很快。

**術語上再提醒一點**
你如果要推英文版，最好開始固定英文術語，不要今天叫 Main Task、明天叫 Task Pool。建議先定一套：

1. Inbox
2. Scheduled
3. Task Pool
4. Micro Tasks
5. Interrupt
6. Mainline
7. Log

這些名稱最好同時出現在影片、UI、README、教學頁。這樣品牌辨識會穩很多。

如果你願意，我下一步可以直接幫你做兩件很實用的事：

1. 幫你把這份英文口白改成「更自然、比較像母語者口氣」的錄音稿
2. 幫你整理一份 UI 多語優先清單，直接列出哪些按鈕、欄位、狀態應該先翻成英文

============================================================================

---

## [2026/04/30] ychsue 原則上，shorts 已經拍過了，如 #file:discussion_2026_04_08.md ，現在要拍長一點、多講一點的，以後我會針對不同狀況各拍一個影片好讓使用者知道實際運作方式，這樣應該可以吧？英文口白的部分，您覺得好，我相信一定好，所以，請依您覺得好的方式進行。

然後，UI的部分，是的，請您規劃一下，先把這最低限度的翻譯做出來即可，不過，怎麼做，這個多國語未來才好擴充呢？

## [2026/04/30] GitHub Copilot 的建議

**影片策略：可以，長片 + 主題片分開是對的**

Shorts 已有，現在拍完整介紹片是合理的順序。之後每個使用情境（中斷流程、Inbox 整理、Google Sheets 同步、iPhone Shortcuts 整合…）各一支短主題片，加上這支完整介紹片，就構成一個有層次的影片庫。觀眾可以先看完整版了解全貌，再按自己的需要去看特定主題片。英文口白稿見上方。

---

**UI 多國語：架構與最低限度實作**

**已完成的實作**（`pwa/src/i18n/`）：

採用零外部依賴方案，不引入 `i18next` 等函式庫，直接用 TypeScript + React context 實現。

架構如下：

``` js
pwa/src/i18n/
  en.ts          # 英文（基準型別，as const）
  zh-TW.ts       # 繁體中文（satisfies Record<keyof typeof en, string>）
  index.ts       # useT() hook + getInitialLocale()
```

**設計原則（未來易擴充）：**

1. `en.ts` 是唯一型別基準：`TranslationKey = keyof typeof en`。加新語言只需新建 `<locale>.ts`，TypeScript 會強制覆蓋所有 key，不會漏翻。
2. `useT()` 從 Zustand store 讀取 `locale`，store 同步寫入 `localStorage('nbl_locale')`，開 app 時自動還原。
3. `t(key, vars?)` 支援 `{n}` 插值，例如 `t('candidates.count', { n: 5 })`。
4. locale 自動偵測：先讀 localStorage，再看 `navigator.language`，zh 開頭預設 `zh-TW`，其餘預設 `en`。
5. header 右上角有一個小切換按鈕（中文下顯示 `EN`，英文下顯示 `中文`），點一下即切換並持久化。

**本次已翻譯的 UI 字串範圍（Phase 1）：**

| 元件 | 翻譯的字串 |
|---|---|
| `EditDialog.tsx` | 取消、保存、保存中...、保存失敗、選擇 {label} |
| `SelectionCacheTable.tsx` | 工具列、欄位標頭、所有對話框（結束/開始/補記）、badge、警告訊息 |
| `SyncStatus.tsx` | 取消、確認還原、確認還原（含 Log） |

長篇說明文字（GuidePage、各表說明 Markdown、SyncStatus 的警告段落）保持原中文，交給瀏覽器翻譯即可。

**未來新增語言（例如 ja, ko）：**

1. 複製 `zh-TW.ts` → `ja.ts`，TypeScript 會報錯直到所有 key 都翻譯完。
2. 在 `index.ts` 的 `translations` 物件加一行。
3. 在 `SupportedLocale` type 加 `'ja'`。
4. 完成，不需改任何元件。

================================================================

---

## [2026/04/30] ychsue 太棒了！不過，可否在 #file:GuidePage.tsx 與 #sym:TutorialCarousel 若不是中文時，請他們使用瀏覽器內建的翻譯？

而其餘的頁面，如 placeholder 還有 title 等可否也麻煩轉換成可以選語言呢？
其三，多加一個 ja 會很複雜嗎？

## [2026/04/30] GitHub Copilot 的建議

我會先做三件事：1) 在 GuidePage.tsx 與 TutorialCarousel.tsx 依語言顯示「請用瀏覽器翻譯」提示、2) 把其餘高頻頁面的 `title/placeholder/按鈕` 接到 i18n、3) 同步加上 `ja` 的最小可擴充支援。接著我會先掃目前 i18n 鍵與尚未國際化的元件再一次性補齊。先快速讀取目前 i18n 與幾個主要表格元件，確認哪些字串還沒接 `t()`，再一次補完。

我會把範圍聚焦在你指定的高頻頁面：`GuidePage`/`TutorialCarousel` 做「非中文顯示瀏覽器翻譯提示」，其餘表格頁優先把 `title`、`placeholder`、主要按鈕文案改成可切語言。先快速掃描這幾個表格元件內實際用到的 UI 字串，避免漏掉。

先把語言底層擴成 `zh-TW / en / ja`，並把語言切換改成三段循環，這樣後面所有頁面只要讀 `locale` 就能生效。

接下來我把各表格頁的 `title / subtitle / placeholder / 說明按鈕` 改成依語言顯示（zh-TW / en / ja），先從 `Inbox`、`Micro Tasks`、`Resource`、`Task Pool`、`Scheduled`、`Log` 這 6 個高頻頁面開始。

我已完成主要改動，現在跑一次 TypeScript 檢查，確認沒有新增錯誤，再回報你可直接測試的重點。

已完成，你提的三件事都做了。

1. 非中文時，GuidePage 與 TutorialCarousel 顯示「請用瀏覽器翻譯」提示  

- GuidePage.tsx  
- TutorialCarousel.tsx  
目前行為是：語系不是 zh-TW 時，頁面上方會出現提示（en/ja 各自文案）。

2. 其餘主要頁面的 title、placeholder、常用按鈕改成可選語言  
我先把高頻表格頁做完（你目前最常操作的區塊）：

- InboxTable.tsx  
- MicroTasksTable.tsx  
- ResourceTable.tsx  
- TaskPoolTable.tsx  
- ScheduledTable.tsx  
- LogTable.tsx

3. ja 語系已加進去，且切換鍵改為三語循環  

- 新增 ja.ts  
- 更新 index.ts（SupportedLocale 改為 en/zh-TW/ja，含自動偵測）  
- 更新 App.tsx（語言切換改成 zh-TW → en → ja → zh-TW）

關於你問的「加 ja 會不會很複雜？」  
不複雜，現在已經是可擴充架構了。之後再加新語言的成本主要是翻字串，不是改邏輯。

補充驗證  
我有跑 TypeScript 檢查，沒有新增你這次改動造成的錯誤；目前仍只有既有的 virtual:pwa-register 型別錯誤：  

- main.tsx

如果你要，我下一步可以把「目前還沒語系化的少量訊息」一次補齊（例如部分 alert、toast 與少量欄位提示），把 UI 文案做到更完整一致。

已進行變更。

=================================================================

---

## [2026/04/30] ychsue 非常感謝，下一步請把「目前還沒語系化的少量訊息」一次補齊（例如部分 alert、toast 與少量欄位提示），把 UI 文案做到更完整一致。

還有， #sym:TableCard 還沒多國語化。
此外，有個疑問，為何不把 tasks 等 table 的多國語也用 t() 管理呢？是有甚麼考量嗎？

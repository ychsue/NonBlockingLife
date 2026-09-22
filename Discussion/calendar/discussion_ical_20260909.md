# 規劃calendar 的策略與實作

## [2026-09-09] ychsue 想一下使用者的需求
1. 希望能引入他們如Google Calendar 的日曆 ics 們
    * 所以，顯然需要如 `ics_sources` table 來存他們的 ics 連結資訊
    * 系統根據 `ics_sources` table 中的資訊，更新如 `ics_events` table 中的事件資訊
    * 不過， `ics_sources` 的 ics 的取得，可能目前要有兩種方式，
        1. (PWA) 使用者手動提供 ics 檔案
        2. (Android App) 由 Android 端直接連網下載，這個要設成一段時間就自動更新嗎？
        3. 由於使用者有可能有時勾選、有時不要引進某些 source，所以，ics_events table 中的事件可能需要有一個欄位來標記是否啟用，而且，也不該像 Scheduled 的事件一樣可以直接編輯。
2. 希望能將Scheduled 的事件匯出成 ics 格式，方便他們導入其他日曆應用
    * Q: GAS 可以幫忙放 ics 檔案到 Google Drive，並生成可分享的連結嗎？
    * Q: 如果未來改讓使用者用自己的 supabase 帳號來存取 ics 資料，定期丟到特定的檔案，讓人可以讀取，是否可行？
3. 希望能同步更新，當日曆有變動時，使用者能即時看到最新資訊
    * 如果有辦法直接App下載，那就可以定一段時間自動更新 ics_events table 中的事件資訊。
    * 那麼，如果Scheduled有更新，也更新我們給使用者的 ics 檔案如何？
4. 希望能有簡單的操作介面，方便使用者管理日曆事件(包含Scheduled 與來自 ics 們的事件)
    * 可能引進 react-big-calendar 或 FullCalendar 來呈現日曆事件

## [2026-09-10] ychsue 想像中的實作順序
1. 先定義 `ics_sources` 與 `ics_events` 的資料表結構
2. 做出 UI 讓使用者可以編輯 `ics_sources` table
3. 實作後端邏輯，根據 `ics_sources` table 的資訊(Android App 透過Android下載，PWA 透過使用者提供的檔案)，更新 `ics_events` table
4. 在使用者介面中，`ics_events` 應該只能調整 status 與 nextRun 吧？要不要顯示，由 ics_sources 控制？
5. 在 `Scheduled` 的頁面中，同時條列 `Scheduled` 與來自 `ics_events` table 的事件
    * TableCard 的方式還好，但是，table 的方式呢？EditDialog 也會長得不一樣。
6. 實作匯出功能，將 `Scheduled` 的事件生成 ics 檔案，並提供下載或分享連結
7. 實作自動更新機制，定期檢查 `ics_sources` 的變動，並更新 `ics_events` table

## [2026-09-10] Gemini 回答

這是一個非常完整且思考周密的設計規劃！引入 iCalendar (`.ics`) 規範將能極大地提升 NonBlockingLife (NBL) 與外部行事曆（Google Calendar, Outlook, Apple Calendar 等）的整合能力。

針對您提出的需求與步驟，以下為您提供**系統架構的盲點分析**、**解答與優化建議**，以及**調整後的漸進式開發路線圖**。

---

### 一、 針對您的疑問與架構盲點分析

#### 1. 關於匯出 ics 檔案 (需求 2)

> **Q: GAS 可以幫忙放 ics 檔案到 Google Drive，並生成可分享的連結嗎？**

* **完全可以，且非常適合。**
* GAS 可以呼叫 `DriveApp.createFile('calendar.ics', icsContent, 'text/calendar')` 生成檔案。


* 可設置發布存取權限為 `AnyoneWithLink`（任何擁有連結的人皆可讀取）。
* **關鍵優勢**：Google Calendar 或其它行事曆應用程式支援「透過 URL 訂閱日曆」。若 GAS 定期（如每小時或變動時）更新該檔案，使用者的外部 Google Calendar 就能直接訂閱這個連結，實現**自動同步**！


* **Q: 未來改用 Supabase / 存取 ics 是否可行？**
* **可行。** Supabase 提供 Storage 功能（支援公共 Bucket），可以非常方便地上傳 `.ics` 文字檔並直接提供 public URL 讓外部訂閱。



#### 2. 關於跨平台 (PWA / Android App) 抓取 ics (需求 1 & 3)

* **跨域 CORS 問題 (PWA)**：PWA 如果嘗試直接在前端 `fetch("[https://calendar.google.com/calendar/ical/](https://calendar.google.com/calendar/ical/)...")`，100% 會被瀏覽器的 CORS 政策擋下。
* **建議架構**：
* **Android App**：由原生層 (WebView/Java/Kotlin) 或 Android 網路層下載，沒有 CORS 限制。
* **PWA 模式**：手動匯入 `.ics` 檔案；或者**透過代理**（例如將訂閱 URL 送交 GAS / Supabase Edge Function 幫忙下載解析後傳回前端）。




* **唯讀事件結構 (ics_events)**：
* 您提到的「`ics_events` 欄位不該像 Scheduled 事件一樣直接編輯」非常正確。因為 `.ics` 是外部 Source，若本地編輯，下次同步時會發生衝突（Overwrite）。
* 建議在 `ics_events` 中標記 `sourceId` (對應 `ics_sources`) 以及 `readOnly: true`。



#### 3. 關於 UI 呈現 (FullCalendar / react-big-calendar) (需求 4)

* 如果主要目的是「預覽」與「衝突排查」，引入輕量級的日曆 View 非常好。
* **元件建議**：`FullCalendar` 功能豐富但體積較大；如果只是想要簡單呈現 Scheduled 與 External ics 的覆蓋時間，也可評估 `react-big-calendar` 或輕量級自訂的每週/每日時間軸視圖（與現有 Scheduled/TaskPool 樣式風格保持一致）。

---

### 二、 資料庫 schema 建議 (Step 1 優化)

為了符合現有 Dexie schema 與同步架構，建議調整如下：

```typescript
// 1. ics_sources: 紀錄 ics 來源
export interface IcsSourceItem {
  sourceId: string      // 主鍵, e.g. 'SRC_xxx'
  name: string          // 日曆名稱 (如: 個人 Google 日曆)
  type: 'url' | 'file'  // 來源類型: 網址訂閱 或 手動上傳檔案
  url?: string          // 若為網址訂閱時的連結
  color?: string        // 顯示顏色 (用來在日曆 UI 上區分不同來源)
  enabled: boolean      // 是否啟用 (是否引入事件)
  lastSyncedAt?: number // 上次成功同步時間
  updatedAt: number
}

// 2. ics_events: 存儲解析後的第三方日曆事件
export interface IcsEventItem {
  eventId: string       // 主鍵, e.g. 'ICS_xxx'
  sourceId: string      // 關聯 ics_sources.sourceId
  uid: string           // ics 原生的 UID (用於增量更新判斷)
  title: string
  startAt: number       // 開始時間戳
  endAt: number         // 結束時間戳
  isAllDay: boolean     // 是否全天事件
  location?: string
  description?: string
  status?: string       // WAITING, DONE, IGNORED 等本地標記狀態
  updatedAt: number
}

```

* **索引設定 (Dexie Stores)**：
* `ics_sources`: `'sourceId, enabled, updatedAt'`
* `ics_events`: `'eventId, sourceId, startAt, endAt, [sourceId+uid]'`



---

### 三、 修正與建議後的逐步開發路線圖 (Roadmap)

您可以照以下步驟一步步與我合作完成：

#### 階段一：資料層與解析核心 (Foundation)

* [x] **Step 1.1**: 在 `pwa/src/db/schema.ts` 升級 Dexie 到 Version 5，新增 `ics_sources` 與 `ics_events` 表格。
    - [2026-09-10 11:07] 寫進去了

* [x] **Step 1.2**: 引入或實作輕量級的 `ics` 語法解析器 (ICAL parser)，能將文字內容轉為 `IcsEventItem` 陣列（支援 RRULE 循環事件處理與時區轉換）。
    - [2026-09-10 11:48] 依循Test Driven Development (TDD) 已完成初步解析器實作，並通過基本測試。。

#### 階段二：使用者介面與管理 (UI / Management)

* [x] **Step 2.1**: 新增 `IcsSourceManagement` UI，讓使用者新增/編輯 ics 連結、切換啟用/停用、或匯入本地 `.ics` 檔案。
* [x] **Step 2.2**: 實作前端解析與寫入：點擊「立即同步」或匯入檔案時，解析 `.ics` 並更新 `ics_events` 表格。
    - [2026-09-10 19:31] 已完成前端解析與寫入的初步實作，並通過基本測試。還沒有加入與 Android 抓取資料的部分。

#### 階段三：視圖整合 (Scheduled & Calendar Integration)

* [x] **Step 3.1**: 在 Scheduled 頁面（或獨立的 Calendar View）同時讀取 `scheduled` 表格與啟用的 `ics_events` 進行綜合展示。


* [x] **Step 3.2**: 針對唯讀事件（來自 ics）與可編輯事件（來自 Scheduled）做出 UI 卡片的區隔與編輯權限控管。



#### 階段四：匯出與自動同步 (Export & Auto-Sync)

* [ ] **Step 4.1**: 實作 `exportToIcs(scheduledItems)` 函式，可直接下載成 `.ics` 檔案。
* [ ] **Step 4.2**: (GAS 擴充) 在 GAS 端新增生成/存取 `.ics` 的 API，支援外部 Google Calendar 訂閱。


* [ ] **Step 4.3**: (Android WebView/App 整合) 在 Android 端加入背景定時器，定期拉取 ics URL 並通知 WebView 更新 `ics_events`。

---

### 準備開始！

這個規劃的方向非常清晰！如果您同意上述調整，我們現在就可以開始 **Step 1: 定義 `ics_sources` 與 `ics_events` 的 schema 結構 (Dexie version 5)**。

請告訴我是否要直接為您產出 `schema.ts` 的更新程式碼？😄

---

## [2026-09-10] ychsue 關於 ScheduledItem 與 IcsEventItem 的整合
## [2026-09-10] Gemini 的回答 02

這是一個非常關鍵且實際的工程問題！

在前端介面設計中，**「將資料結構原生化 (Data Mapping / Adapter)」** 是最優雅且維護成本最低的做法。

不必為了 ics 事件去硬改或污染原本寫好的 `ScheduledTable.tsx` 及 `ScheduledItem`；我們可以使用 **適配器模式 (Adapter Pattern)**，將 `ics_events` 轉換成 `ScheduledTable`「看得懂」的統一檢視模型 (View Model)，同時透過一個 `isReadOnly` 標記來控制 UI 的行爲與編輯權限。

以下為您提供具體的架構與設計解析：

---

### 一、 視圖模型 (ViewModel) 設計

在 `ScheduledTable.tsx` 裡面，我們可以定義一個整合型的 `UnifiedCalendarItem` 介面：

```typescript
// 統一用於 ScheduledTable 畫面的 View Model
export type UnifiedCalendarItem = ScheduledItem & {
  // 擴充欄位，用來區分來源與唯讀狀態
  itemType: 'scheduled' | 'ics_event'
  sourceName?: string  // 方便 UI 顯示日曆名稱 (例如: "Google 工作日曆")
  sourceColor?: string // 方便標示不同顏色
  isReadOnly: boolean  // 標記是否唯讀
}

```

* **欄位映射 (Mapping Adapter)**：
當我們把 `IcsEventItem` 丟給 `ScheduledTable` 顯示時，轉換成這套格式：
* `taskId` $\rightarrow$ 使用 `icsEvent.eventId` (或 `ICS_${eventId}`)


* `title` $\rightarrow$ `icsEvent.title`

* `status` $\rightarrow$ `icsEvent.status || 'WAITING'`

* `nextRun` $\rightarrow$ `icsEvent.startAt` (巧妙對應到原本 Scheduled 的執行/開始時間)


* `deadline` $\rightarrow$ `icsEvent.endAt` (對應到結束時間)


* `note` $\rightarrow$ `icsEvent.description`

* `isReadOnly` $\rightarrow$ `true`



---

### 二、 UI 與操作體驗的細節設計 (Table / EditDialog / Card)

有了 `isReadOnly` 與 `itemType` 後，原本 `ScheduledTable.tsx` 裡的防護與 UI 渲染就可以變得非常直覺：

#### 1. 列表 / 卡片 (Table & TableCard) 呈現

* **視覺標記**：
在 `title` 欄位旁邊加上一個小 Tag (例如：`[外部 ics]` 或來源名稱的顏色小圓點)，讓使用者一眼看出這是從外部日曆同步過來的。


* **快啟按鈕 (Quick Start / Interrupt)**：
來自 `ics_events` 的事件依然可以點擊「Quick Start」！因為使用者可能想把「Google Calendar 的 10:00 開會事件」直接載入目前正在執行的任務中，這完全合理且超方便。



#### 2. 單列 / 單張卡片的點擊防護 (EditDialog)



原本點擊表格會觸發 `setEditingItem(row.original)` 打開 `EditDialog`：

```tsx
// 在 ScheduledTable.tsx 中處理點擊行 (Row Click)[cite: 1]
onClick={(event) => {
  if (!shouldOpenRowEdit(event.target)) return;
  
  // 💡 關鍵判斷：如果該項目是唯讀 (ICS 事件)，提示或開啟「唯讀檢視 Dialog」
  if (row.original.isReadOnly) {
    // 做法 A: 打開唯讀版本的 Modal（只讀不給改）
    // 做法 B: 開啟全功能 EditDialog，但將 input 改為 disabled
    // 做法 C: 跳 Toast 提示「外部日曆事件請至來源日曆修改」
    setEditingItem(row.original); 
    return;
  }
  
  setEditingItem(row.original);
}}

```

#### 3. EditDialog 的欄位動態控制

您提到的 `EditDialog.tsx` 只要增加一個 `readOnly?: boolean` 的 prop：

* 當編輯的 item 屬於 `isReadOnly === true` 時：
* `title`、`cronExpr`、`reminderOffsets` 等欄位全部設為 **Disabled (唯讀)** 或直接隱藏。


* 只開放可供本地紀錄的欄位（例如 `status`），或者整個 Dialog 都改為純文字預覽。


* 將原本的「儲存」按鈕隱藏，只留下「關閉」按鈕。





---

### 三、 點擊 Table 空白區新增 (Add Row)

因為點擊 Table 標頭或「新增」按鈕時是呼叫 `addRow()`，它預設建立的就是 `ScheduledItem` (`itemType = 'scheduled'`, `isReadOnly = false`)。
這代表：**使用者手動新增的永遠是 NBL 原生的 Scheduled 任務，不會誤創 ics 事件**。

---

### 四、 資料流架構與讀取邏輯 (Data Fetching)

在 `ScheduledTable.tsx` 的 `useEffect` 中，我們將資料來源由 1 個擴充為 2 個：

```typescript
// 定義綜合載入邏輯
const loadAllEvents = async () => {
  // 1. 讀取原生 scheduled 表格[cite: 2]
  const scheduledData = await db.scheduled.toArray();[cite: 2]
  const mappedScheduled: UnifiedCalendarItem[] = scheduledData.map(item => ({
    ...item,
    itemType: 'scheduled',
    isReadOnly: false
  }));

  // 2. 讀取啟用的 ics_sources 及對應的 ics_events
  const enabledSources = await db.ics_sources.where('enabled').equals(1).toArray();
  const enabledSourceIds = enabledSources.map(s => s.sourceId);
  
  const icsEventsData = await db.ics_events
    .where('sourceId')
    .anyOf(enabledSourceIds)
    .toArray();

  const mappedIcsEvents: UnifiedCalendarItem[] = icsEventsData.map(ics => {
    const source = enabledSources.find(s => s.sourceId === ics.sourceId);
    return {
      taskId: ics.eventId,
      title: ics.title,
      status: ics.status || 'WAITING',
      nextRun: ics.startAt,
      deadline: ics.endAt,
      note: ics.description,
      // 標示為 ics 專屬
      itemType: 'ics_event',
      sourceName: source?.name || '外部日曆',
      sourceColor: source?.color,
      isReadOnly: true, // 🔒 唯讀標記
    };
  });

  // 3. 合併並依 nextRun 排序
  const combined = [...mappedScheduled, ...mappedIcsEvents].sort(
    (a, b) => (a.nextRun || 0) - (b.nextRun || 0)
  );

  setRows(combined);
};

```

---

### 總結

使用這個架構優點如下：

1. **零毀壞性**：完全不影響現有 `db.scheduled` 的 Schema 與 API。


2. **極高複用率**：`ScheduledTable.tsx` 的欄位過濾 (useSearchFilter)、排序 (Sorting)、甚至卡片視圖 (TableCard) 都不需要大改就能直接支援 ics 事件！


3. **權限清晰**：透過 `isReadOnly: true` 控制，使用者非常清楚哪些是能編輯的本地定時任務，哪些是來自 Google Calendar 的唯讀行程。



這個設計思路是否能解開您目前傷腦筋的點呢？如果覺得可行，我們就可以著手準備 Schema 擴充與 Adapter 的實作！ 😄

---
## [2026-09-10] Gemini 繼續 03

這兩個問題點到了 `.ics` (iCalendar RFC 5545 規範) 解析與系統整合中最核心、最精彩的部分！

我們分別從 **1. 原生 ics 字串保留** 與 **2. 複雜重複規則 (RRULE vs Cron)** 來深度解析，並為您提出最乾淨的 Schema 與適配方案：

---

### 一、 `IcsEventItem` 是否需要保留原本 ics 的字串？

#### **建議：要保留，且強烈建議保留！**

**理由如下**：

1. **增量更新與比對 (De-duplication)**：外部 ics 會定期重新拉取，當重新拉取時，我們需要知道某個 Event 的 `SEQUENCE` 或原本內容是否有變動。
2. **調試與備查 (Debugging)**：iCalendar 裡面有很多邊角欄位（如 `ATTENDEE` 出席者、`ORGANIZER` 發起人、`VALARM` 提醒設定、`RECURRENCE-ID` 單次覆蓋事件），在初期開發時我們未必每一個欄位都會解析成獨立的 DB 欄位，保留原始 `.ics` 區塊（例如 `rawIcs` 或單個 VEVENT 的 raw text）能確保**資料不丟失**。
3. **離線重新解析**：未來如果您的 ics 解析邏輯升級（例如支援解析會議連結 `LOCATION` / `URL`），可以直接拿資料庫裡的 `rawIcs` 本地重新解析跑一次，不用再次連網下載。

---

### 二、 外部 Calendar 的奇怪 Repeat (RRULE) 可以用 `cronExpr` 存嗎？

#### **解答：不建議硬塞進 `cronExpr`，但可用 Adapter 計算出 `nextRun`！**

這是一個非常經典的標準衝突：

* **Linux Cron 語法**：為「固定週期」設計（例如 `0 9 * * 1` 表示每週一早上 9 點）。它**無法表達**「每隔 3 週的週二」、「每月第 2 個星期三」、「每年第 100 天」等複雜規則。
* **iCalendar RRULE 語法 (RFC 5545)**：功能極度強大，支援 `FREQ=WEEKLY;INTERVAL=3;BYDAY=TU`，甚至包含排除日期 (`EXDATE`)。

**兩者無法 100% 互轉**！如果硬要把 RRULE 強行轉成 Cron，會遇到轉不出來或語法爆掉的問題。

#### **最佳解法：**

1. **資料庫不存假 Cron**：在 `ics_events` 中，直接保留 `rrule` 原生字串（若有），或者透過 ICAL 解析套件（例如 `ical.js` 或 `rrule` npm 套件）算出該事件在未來的**具體發生時間點 (Occurrences)**。
2. **Adapter 轉接給 UI**：
* 當適配成 `UnifiedCalendarItem` 給 `ScheduledTable.tsx` 顯示時：


* `cronExpr`: 設為空字串 `""` 或顯示說明標籤 (如 `"RRULE: 每 2 週"`)。


* `nextRun`: 由解析器直接計算出**下一次要發生的精確 Timestamp**（例如 `startAt`）。




* 因為 `ScheduledTable` 在排序與渲染時，核心靠的是 `nextRun`，所以即使 `cronExpr` 留空，列表排序與展示依然能完美運行！





---

### 三、 擴充後的 Schema 建議 (Dexie Version 5)

綜合以上考量，我們在 `pwa/src/db/schema.ts` 這樣設計：

```typescript
// 1. ics_sources: 訂閱來源表
export interface IcsSourceItem {
  sourceId: string      // 主鍵, e.g. 'SRC_GOOGLE_WORK'
  name: string          // 日曆名稱
  type: 'url' | 'file'  // 網址訂閱 或 手動上傳
  url?: string          // 訂閱網址
  color?: string        // UI 標籤顏色 (例如 '#4285F4')
  enabled: boolean      // 是否啟用 (true/false)
  lastSyncedAt?: number // 上次成功同步時間戳
  updatedAt: number     // 異動時間戳
}

// 2. ics_events: 第三方日曆事件表
export interface IcsEventItem {
  eventId: string       // 本地主鍵, e.g. 'ICS_xxx'
  sourceId: string      // 關聯 ics_sources.sourceId
  uid: string           // ics 規範原生 UID (用來比對與更新)
  title: string         // 事件標籤 (SUMMARY)
  status?: string       // 本地狀態 (WAITING, DONE, IGNORED 等)
  startAt: number       // 開始時間戳 (DTSTART)
  endAt?: number        // 結束時間戳 (DTEND)
  isAllDay: boolean     // 是否為全天事件
  location?: string     // 地點
  description?: string  // 描述 (DESCRIPTION) -> 映射至 Scheduled 的 note[cite: 1, 2]
  url?: string          // 事件連結 (URL)
  rrule?: string        // 原始 RRULE 規則字串 (若為重複事件)
  rawIcs?: string       // 💡 保留該 VEVENT 區塊的原始 ics 文字
  updatedAt: number
}

```

#### Dexie Stores 定義：

```typescript
// 在 AppDB (pwa/src/db/schema.ts) 升級至 version(5)[cite: 2]
this.version(5).stores({
  log: 'id, timestamp, taskId, action, state, title',
  dashboard: 'taskId, systemStatus',
  inbox: 'taskId, receivedAt, title',
  task_pool: 'taskId, status, project, priority, lastRunDate, title, note, url',
  scheduled: 'taskId, status, nextRun, title, reminderOffsets',
  selection_cache: 'taskId, score, source, title',
  micro_tasks: 'taskId, status, lastRunDate, title',
  alarm_queue: '++id, taskId, alarmAt, dedupeKey, state, clockState, exactState, createdAt, updatedAt',
  change_log: 'id, table, recordId, op, status, createdAt',
  sync_state: 'key',
  resource: 'taskId, category, receivedAt, title',
  macro: 'taskId, name, updatedAt, createdAt',
  macro_execution: 'macroId, status, lockOwner, lockExpiresAt, updatedAt',
  app_log: 'id, timestamp, level, scope',
  // 🆕 新增 ics 相關資料表
  ics_sources: 'sourceId, enabled, updatedAt',
  ics_events: 'eventId, sourceId, uid, startAt, [sourceId+uid]'
})

```

---

### 四、 Adapter 轉換邏輯實作預覽

我們建立一個獨立的適配器檔 `pwa/src/utils/icsAdapter.ts`：

```typescript
import type { ScheduledItem } from '../db/schema'
import type { IcsEventItem, IcsSourceItem } from '../db/schema'

export type UnifiedCalendarItem = ScheduledItem & {
  itemType: 'scheduled' | 'ics_event'
  sourceName?: string
  sourceColor?: string
  isReadOnly: boolean
}

/**
 * 將 IcsEventItem 轉成 ScheduledTable 看得懂的 UnifiedCalendarItem
 */
export function mapIcsToUnifiedItem(
  ics: IcsEventItem,
  source?: IcsSourceItem
): UnifiedCalendarItem {
  return {
    taskId: ics.eventId,               // 保持 taskId 的調用相容性[cite: 1, 2]
    title: ics.title || '(無標題)',
    status: ics.status || 'WAITING',
    nextRun: ics.startAt,               // 核心關鍵：將開始時間直接塞給 nextRun 用於排序[cite: 1, 2]
    deadline: ics.endAt,
    note: ics.description,
    url: ics.url || '',
    cronExpr: ics.rrule ? `RRULE:${ics.rrule}` : '', // 僅供展示用
    // 擴充特有屬性
    itemType: 'ics_event',
    sourceName: source?.name || '外部日曆',
    sourceColor: source?.color || '#9E9E9E',
    isReadOnly: true,                  // 🔒 標記唯讀
  }
}

```

這樣設計後：

1. **原始 ics 數據妥善保存**在 `rawIcs` 與 `rrule` 中，未來隨時能重新解析。
2. **`ScheduledTable` 完全無痛對接**：無論是 Cron 還是 RRULE，算出來的 `startAt` 都是 timestamp，給 `nextRun` 就能完美進行「依時間順序混合排序」。



這個解析與設計是否解決了您的顧慮呢？如果沒問題，我們就可以準備動手建立 Dexie version 5 以及 Adapter 模組了！😄
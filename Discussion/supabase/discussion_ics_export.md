# Supabase ICS Export Discussion

## [2026-09-30] ychsue 關於ICS的部分

## [2026-09-30] Gemini 的答覆

在 Supabase 端**完全可以**自動、定時產生 `.ics` 檔案並提供公開連結，而且處理效率與穩定度會比 GAS 高出許多！

---

### 💡 核心架構概念：Supabase 該怎麼做？

在 GAS 中，是以「`時間驅動觸發器 (Time-driven trigger)` ➔ `執行 exportICS.js` ➔ `寫入 Google Drive` ➔ `更新 Sheet 連結`」的流程運行。

轉移到 Supabase 後，對應的架構如下：

1. **檔案儲存 (Storage)**：使用 **Supabase Storage**（建立一個名為 `ics-exports` 的 Public Bucket）。這會自動提供 CDN 加速的公開 `.ics` 下載連結。
2. **邏輯運算 (Edge Function / Database Function)**：
* **方法 A（推薦：Edge Function）**：撰寫一個輕量級的 TypeScript / Deno 雲端函式，負責讀取 `ics_export_configs`、`projects`、`scheduled` 三張表，產出 ICS 內文後上傳至 Supabase Storage，並更新 `ics_export_configs` 內的 `url` 與 `lastGeneratedAt`。


* **方法 B（PGSQL + PL/v8 / PL/pgSQL）**：直接在 PostgreSQL 資料庫內寫 SQL / PL Function 拼貼文字，直接存入 Storage。




3. **定時排程 (Cron Trigger)**：使用 PostgreSQL 內建的 **`pg_cron`** 擴充套件，設定 Cron 排程（例如每小時或每天凌晨）自動觸發上述的 Edge Function 或 SQL 函數。

---

### 🚀 最優解實作步驟（以 Edge Function + pg_cron 為例）

#### 步驟 1：建立 Supabase Storage Bucket

1. 登入 Supabase 控制台，點擊左側 **Storage**。
2. 新增一個 Bucket，名稱填入：`ics-exports`。
3. 開啟 **Public Bucket** 開關（讓外部日曆 App 如 Google Calendar、Apple Calendar 能直接拉取 ics 網址）。

---

#### 步驟 2：建立 Supabase Edge Function (`export-ics`)

在專案目錄下執行 Supabase CLI，或在 Supabase 控制台的 **Edge Functions** 頁面新建：

```typescript
// supabase/functions/export-ics/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')! // 具備寫入 Storage 與 Table 權限
  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    const generatedAt = new Date()

    // 1. 讀取所需的三張表[cite: 1, 2]
    const { data: configs } = await supabase.from('ics_export_configs').select('*').eq('deleted', false)[cite: 1, 2]
    const { data: projectsRaw } = await supabase.from('projects').select('*').eq('deleted', false)[cite: 1, 2]
    const { data: scheduledRaw } = await supabase.from('scheduled').select('*').eq('deleted', false)[cite: 1, 2]

    const projects = (projectsRaw || []).map(r => ({ ...r.data, id: r.id }))[cite: 1, 2]
    const scheduled = (scheduledRaw || []).map(r => ({ ...r.data, taskId: r.task_id }))[cite: 1, 2]

    const results = []

    for (const configRow of (configs || [])) {
      const config = configRow.data
      if (config.enabled !== true) continue[cite: 1]

      // 展開子專案 ID[cite: 1]
      const projectIds = expandProjectIds(config.projectIds || [], projects, config.includeSubProjects === true)[cite: 1]

      // 計算時間區間[cite: 1]
      const daysBefore = Number(config.timeRangeDaysBefore ?? 30)[cite: 1]
      const daysAfter = Number(config.timeRangeDaysAfter ?? 90)[cite: 1]
      const startRange = generatedAt.getTime() - daysBefore * 86400000[cite: 1]
      const endRange = generatedAt.getTime() + daysAfter * 86400000[cite: 1]

      // 篩選事件[cite: 1]
      const filtered = scheduled.filter((item: any) => {
        if (!Array.isArray(item.projectIds) || !item.projectIds.some((id: string) => projectIds.has(id))) return false[cite: 1]
        const nextRun = Number(item.nextRun)[cite: 1]
        return Number.isFinite(nextRun) && nextRun >= startRange && nextRun <= endRange[cite: 1]
      })

      // 產生 ICS 文字內容[cite: 1]
      const icsContent = buildCalendar(filtered, config, generatedAt)[cite: 1]
      const fileName = config.fileName ? (config.fileName.endsWith('.ics') ? config.fileName : `${config.fileName}.ics`) : `${configRow.id}.ics`[cite: 1]

      // 2. 上傳至 Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('ics-exports')
        .upload(fileName, icsContent, {
          contentType: 'text/calendar; charset=utf-8',
          upsert: true, // 覆蓋舊檔
        })

      if (uploadError) throw uploadError

      // 取得 Public URL
      const { data: urlData } = supabase.storage.from('ics-exports').getPublicUrl(fileName)
      const publicUrl = urlData.publicUrl

      // 3. 更新 ics_export_configs 資料表紀錄[cite: 1, 2]
      config.url = publicUrl
      config.lastGeneratedAt = generatedAt.getTime()
      config.updatedAt = generatedAt.getTime()

      await supabase.from('ics_export_configs').update({
        data: config,
        updated_at: generatedAt.getTime(),
        synced_at: generatedAt.getTime()
      }).eq('id', configRow.id)[cite: 1, 2]

      results.push({ id: configRow.id, success: true, count: filtered.length, url: publicUrl })[cite: 1]
    }

    return new Response(JSON.stringify({ success: true, results }), { headers: { 'Content-Type': 'application/json' } })
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
})

// 輔助函式：展開子專案[cite: 1]
function expandProjectIds(initialIds: string[], projects: any[], includeSub: boolean) {
  const selected = new Set(initialIds)[cite: 1]
  if (!includeSub || selected.size === 0) return selected[cite: 1]

  const childrenMap = new Map<string, string[]>()
  projects.forEach(p => {
    if (p.parentId) {
      if (!childrenMap.has(p.parentId)) childrenMap.set(p.parentId, [])
      childrenMap.get(p.parentId)!.push(p.id)
    }
  })

  const stack = Array.from(selected)[cite: 1]
  while (stack.length) {
    const parentId = stack.pop()![cite: 1]
    const children = childrenMap.get(parentId) || []
    children.forEach(childId => {
      if (!selected.has(childId)) {
        selected.add(childId)[cite: 1]
        stack.push(childId)[cite: 1]
      }
    })
  }
  return selected
}

// 輔助函式：建構 ICS 文字[cite: 1]
function buildCalendar(items: any[], config: any, generatedAt: Date) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//YesCirculation-Solutions//NONBLOCKINGLIFE//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(config.name || config.fileName || 'NonBlockingLife')}`,
  ][cite: 1]

  const stamp = formatDate(generatedAt)[cite: 1]

  items.forEach(item => {
    const start = Number(item.nextRun)[cite: 1]
    if (!Number.isFinite(start)) return[cite: 1]
    const end = start + 60000 * Number(item.focusTime || 30)[cite: 1]
    const uid = `${encodeURIComponent(String(config.id))}-${encodeURIComponent(String(item.taskId))}@yescirculation-solutions.com`[cite: 1]

    lines.push('BEGIN:VEVENT')[cite: 1]
    lines.push(`UID:${uid}`)[cite: 1]
    lines.push(`DTSTAMP:${stamp}`)[cite: 1]
    lines.push(`DTSTART:${formatDate(new Date(start))}`)[cite: 1]
    lines.push(`DTEND:${formatDate(new Date(end))}`)[cite: 1]
    lines.push(`SUMMARY:${escapeText(item.title || '')}`)[cite: 1]
    if (item.note && config.exportPrivateNotes === true) {
      lines.push(`DESCRIPTION:${escapeText(item.note)}`)[cite: 1]
    }
    lines.push('END:VEVENT')[cite: 1]
  })

  lines.push('END:VCALENDAR')[cite: 1]
  return lines.join('\r\n') + '\r\n'[cite: 1]
}

function formatDate(date: Date) {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
}

function escapeText(val: string) {
  return String(val || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;')[cite: 1]
}

```

---

#### 步驟 3：設定 `pg_cron` 排程自動執行

進入 Supabase SQL Editor，執行以下指令開啟 `pg_net` 與 `pg_cron` 擴充：

```sql
-- 1. 開啟擴充功能
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. 設定 Cron 任務（例如：每小時的第 0 分鐘執行一次 Edge Function）
SELECT cron.schedule(
  'export-ics-hourly',
  '0 * * * *', -- Cron 語法：每小時執行一次
  $$
  SELECT net.http_post(
    url:='https://YOUR_PROJECT_REF.supabase.co/functions/v1/export-ics',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SUPABASE_ANON_KEY"}'::jsonb
  );
  $$
);

```

---

### 🌟 是否有更好的辦法？

比起原本的 GAS 機制，Supabase 的這個做法帶來了幾個巨大的好處：

1. **更穩定的下載網址**：以前 Google Drive 下載網址（`uc?export=download&id=...`）有時候會碰到流量限制或跨域 CORS 問題。Supabase Storage 自帶 CDN，直接給公開 HTTP 靜態連結，第三方日曆（Apple Calendar / Google Calendar）訂閱時會順暢很多！


2. **免受 GAS 6 分鐘執行限制**：GAS 超過 6 分鐘會強制中斷，Supabase Edge Function 速度快且限制少，處理成千上萬個事件只要幾毫秒。
3. **無縫整合 PWA**：產出的 `url` 會自動回寫到 `ics_export_configs` 的 `data.url`，前端 PWA 發起 `pull` 時就能同步更新到本地，使用者直接複製網址即可！

---
## 更新

別擔心！這非常正常，您看到的完全是 **Supabase Edge Functions 的官方全新預設範本 (Standard Template)** 😃！

完全不需要害怕動它，讓我為您說明這是什麼，以及該怎麼填寫。

---

### 1. 為什麼會看到這段程式碼？

Supabase 在最新的 Edge Functions 版本中，使用了由 JavaScript/TypeScript 社群推行的 `export default { fetch: ... }` 標準寫法（結合了 `@supabase/server` 函式庫），預設給出一段範例程式碼。

* `console.info("server started");` 是啟動訊息。
* 它預設處理 POST 請求傳進來的 `{ name: "..." }` 並回傳 `Hello ...!`。

底下的 **`swift-api`**（或是其他隨機產生的名字），只是 Supabase 預設幫這支 Edge Function 取的 **功能名稱 (Function Name / Route Name)**。

---

### 2. 我該怎麼修改它來改造成 `export-ics`？

您可以直接**把這個預設名稱改成 `export-ics**`，並把上面的內容**替換**為我們客製化的 `.ics` 產生邏輯！

配合全新 Supabase API 的語法架構，請直接把 `index.ts` 的內容全部覆蓋為以下程式碼：

```typescript
// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

export default {
  async fetch(req: Request) {
    // 建立 Supabase Client (直接讀取系統預設環境變數)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
      const generatedAt = new Date();

      // 1. 讀取所需的三張表 (ics_export_configs, projects, scheduled)[cite: 1, 2]
      const { data: configs } = await supabase.from("ics_export_configs").select("*").eq("deleted", false);[cite: 1, 2]
      const { data: projectsRaw } = await supabase.from("projects").select("*").eq("deleted", false);[cite: 1, 2]
      const { data: scheduledRaw } = await supabase.from("scheduled").select("*").eq("deleted", false);[cite: 1, 2]

      const projects = (projectsRaw || []).map((r: any) => ({ ...r.data, id: r.id }));[cite: 1, 2]
      const scheduled = (scheduledRaw || []).map((r: any) => ({ ...r.data, taskId: r.task_id }));[cite: 1, 2]

      const results = [];

      for (const configRow of (configs || [])) {
        const config = configRow.data;
        if (config.enabled !== true) continue;[cite: 1]

        // 展開子專案 ID[cite: 1]
        const projectIds = expandProjectIds(config.projectIds || [], projects, config.includeSubProjects === true);[cite: 1]

        // 計算時間區間[cite: 1]
        const daysBefore = Number(config.timeRangeDaysBefore ?? 30);[cite: 1]
        const daysAfter = Number(config.timeRangeDaysAfter ?? 90);[cite: 1]
        const startRange = generatedAt.getTime() - daysBefore * 86400000;[cite: 1]
        const endRange = generatedAt.getTime() + daysAfter * 86400000;[cite: 1]

        // 篩選事件[cite: 1]
        const filtered = scheduled.filter((item: any) => {
          if (!Array.isArray(item.projectIds) || !item.projectIds.some((id: string) => projectIds.has(id))) return false;[cite: 1]
          const nextRun = Number(item.nextRun);[cite: 1]
          return Number.isFinite(nextRun) && nextRun >= startRange && nextRun <= endRange;[cite: 1]
        });

        // 產生 ICS 內文[cite: 1]
        const icsContent = buildCalendar(filtered, config, generatedAt);[cite: 1]
        const fileName = config.fileName ? (config.fileName.endsWith(".ics") ? config.fileName : `${config.fileName}.ics`) : `${configRow.id}.ics`;[cite: 1]

        // 2. 上傳至 Supabase Storage (使用 ics-exports Bucket)
        const { error: uploadError } = await supabase.storage
          .from("ics-exports")
          .upload(fileName, icsContent, {
            contentType: "text/calendar; charset=utf-8",
            upsert: true,
          });

        if (uploadError) throw uploadError;

        // 取得 Public URL
        const { data: urlData } = supabase.storage.from("ics-exports").getPublicUrl(fileName);
        const publicUrl = urlData.publicUrl;

        // 3. 回寫 ics_export_configs 資料表[cite: 1, 2]
        config.url = publicUrl;
        config.lastGeneratedAt = generatedAt.getTime();
        config.updatedAt = generatedAt.getTime();

        await supabase.from("ics_export_configs").update({
          data: config,
          updated_at: generatedAt.getTime(),
          synced_at: generatedAt.getTime(),
        }).eq("id", configRow.id);[cite: 1, 2]

        results.push({ id: configRow.id, success: true, count: filtered.length, url: publicUrl });[cite: 1]
      }

      return Response.json({ success: true, results });
    } catch (err: any) {
      return Response.json({ success: false, error: err.message }, { status: 500 });
    }
  },
};

// 輔助函式：展開子專案 ID[cite: 1]
function expandProjectIds(initialIds: string[], projects: any[], includeSub: boolean) {
  const selected = new Set(initialIds);[cite: 1]
  if (!includeSub || selected.size === 0) return selected;[cite: 1]

  const childrenMap = new Map<string, string[]>();
  projects.forEach((p) => {
    if (p.parentId) {
      if (!childrenMap.has(p.parentId)) childrenMap.set(p.parentId, []);
      childrenMap.get(p.parentId)!.push(p.id);
    }
  });

  const stack = Array.from(selected);[cite: 1]
  while (stack.length) {
    const parentId = stack.pop()!;[cite: 1]
    const children = childrenMap.get(parentId) || [];
    children.forEach((childId) => {
      if (!selected.has(childId)) {
        selected.add(childId);[cite: 1]
        stack.push(childId);[cite: 1]
      }
    });
  }
  return selected;
}

// 輔助函式：建構 ICS 文字[cite: 1]
function buildCalendar(items: any[], config: any, generatedAt: Date) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//YesCirculation-Solutions//NONBLOCKINGLIFE//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(config.name || config.fileName || "NonBlockingLife")}`,
  ];[cite: 1]

  const stamp = formatDate(generatedAt);[cite: 1]

  items.forEach((item) => {
    const start = Number(item.nextRun);[cite: 1]
    if (!Number.isFinite(start)) return;[cite: 1]
    const end = start + 60000 * Number(item.focusTime || 30);[cite: 1]
    const uid = `${encodeURIComponent(String(config.id))}-${encodeURIComponent(String(item.taskId))}@yescirculation-solutions.com`;[cite: 1]

    lines.push("BEGIN:VEVENT");[cite: 1]
    lines.push(`UID:${uid}`);[cite: 1]
    lines.push(`DTSTAMP:${stamp}`);[cite: 1]
    lines.push(`DTSTART:${formatDate(new Date(start))}`);[cite: 1]
    lines.push(`DTEND:${formatDate(new Date(end))}`);[cite: 1]
    lines.push(`SUMMARY:${escapeText(item.title || "")}`);[cite: 1]
    if (item.note && config.exportPrivateNotes === true) {
      lines.push(`DESCRIPTION:${escapeText(item.note)}`);[cite: 1]
    }
    lines.push("END:VEVENT");[cite: 1]
  });

  lines.push("END:VCALENDAR");[cite: 1]
  return lines.join("\r\n") + "\r\n";[cite: 1]
}

function formatDate(date: Date) {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function escapeText(val: string) {
  return String(val || "").replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");[cite: 1]
}

```

---

### 3. 操作步驟說明

1. 將底下的名稱（`swift-api`）更改為：`export-ics`。
2. 將畫面上的 `index.ts` 內容替換成上面這段程式碼。
3. 點選部署 / 儲存（**Deploy**）。
4. 部署成功後，這支 Function 的 URL 就會是：
`https://<YOUR_PROJECT_REF>.supabase.co/functions/v1/export-ics`

別害怕，直接給他改下去！有 Supabase 版的 Edge Functions，執行時間只要十幾毫秒，完全免除 GAS 的 6 分鐘超時困擾！

---

## [2026-10-01] ychsue 成功產生 ics，現在需要定時匯出

沒問題！為您一次性完整梳理這三個實用問題，讓您在 Supabase 的開發上更加得心應手 🚀！

---

### 一、 📦 一次性複製的 Supabase 初始化 SQL 腳本

這是包含 **12 張表**（1張 Fact Table `log` + 11張 Dimension Tables 搭配 JSONB Payload）、自動時區轉換函式、安全性 RLS 權限與版本記錄的完整腳本。請直接整段複製，貼到 Supabase 的 **SQL Editor** 執行即可（具備冪等性，重複執行也不會覆蓋或遺失舊資料）：

```sql
-- ==========================================
-- NonBlockingLife (PWA) - Supabase 完整初始化腳本
-- ==========================================

-- 1. 建立時區檢視輔助函數 (預設 Asia/Taipei)
CREATE OR REPLACE FUNCTION to_tw_time(ms BIGINT) 
RETURNS TIMESTAMP WITH TIME ZONE AS $$
  SELECT to_timestamp(ms / 1000.0) AT TIME ZONE 'Asia/Taipei';
$$ LANGUAGE sql IMMUTABLE;

-- 2. 建立事實表 (Fact Table): log
CREATE TABLE IF NOT EXISTS public.log (
  id TEXT PRIMARY KEY,
  timestamp BIGINT,
  task_id TEXT,
  title TEXT,
  action TEXT,
  state TEXT,
  duration INT,
  notes TEXT,
  updated_at BIGINT NOT NULL,
  deleted BOOLEAN DEFAULT false,
  operation_id TEXT,
  device_id TEXT,
  category TEXT,
  synced_at BIGINT DEFAULT (extract(epoch from now())::bigint * 1000)
);

-- 3. 建立 11 張維度表 (Dimension Tables)
CREATE TABLE IF NOT EXISTS public.task_pool (
  task_id TEXT PRIMARY KEY, data JSONB NOT NULL DEFAULT '{}'::jsonb, updated_at BIGINT NOT NULL, deleted BOOLEAN DEFAULT false, operation_id TEXT, device_id TEXT, synced_at BIGINT DEFAULT (extract(epoch from now())::bigint * 1000)
);
CREATE TABLE IF NOT EXISTS public.scheduled (
  task_id TEXT PRIMARY KEY, data JSONB NOT NULL DEFAULT '{}'::jsonb, updated_at BIGINT NOT NULL, deleted BOOLEAN DEFAULT false, operation_id TEXT, device_id TEXT, synced_at BIGINT DEFAULT (extract(epoch from now())::bigint * 1000)
);
CREATE TABLE IF NOT EXISTS public.micro_tasks (
  task_id TEXT PRIMARY KEY, data JSONB NOT NULL DEFAULT '{}'::jsonb, updated_at BIGINT NOT NULL, deleted BOOLEAN DEFAULT false, operation_id TEXT, device_id TEXT, synced_at BIGINT DEFAULT (extract(epoch from now())::bigint * 1000)
);
CREATE TABLE IF NOT EXISTS public.inbox (
  task_id TEXT PRIMARY KEY, data JSONB NOT NULL DEFAULT '{}'::jsonb, updated_at BIGINT NOT NULL, deleted BOOLEAN DEFAULT false, operation_id TEXT, device_id TEXT, synced_at BIGINT DEFAULT (extract(epoch from now())::bigint * 1000)
);
CREATE TABLE IF NOT EXISTS public.resource (
  task_id TEXT PRIMARY KEY, data JSONB NOT NULL DEFAULT '{}'::jsonb, updated_at BIGINT NOT NULL, deleted BOOLEAN DEFAULT false, operation_id TEXT, device_id TEXT, synced_at BIGINT DEFAULT (extract(epoch from now())::bigint * 1000)
);
CREATE TABLE IF NOT EXISTS public.macro (
  task_id TEXT PRIMARY KEY, data JSONB NOT NULL DEFAULT '{}'::jsonb, updated_at BIGINT NOT NULL, deleted BOOLEAN DEFAULT false, operation_id TEXT, device_id TEXT, synced_at BIGINT DEFAULT (extract(epoch from now())::bigint * 1000)
);
CREATE TABLE IF NOT EXISTS public.ics_events (
  event_id TEXT PRIMARY KEY, data JSONB NOT NULL DEFAULT '{}'::jsonb, updated_at BIGINT NOT NULL, deleted BOOLEAN DEFAULT false, operation_id TEXT, device_id TEXT, synced_at BIGINT DEFAULT (extract(epoch from now())::bigint * 1000)
);
CREATE TABLE IF NOT EXISTS public.ics_sources (
  source_id TEXT PRIMARY KEY, data JSONB NOT NULL DEFAULT '{}'::jsonb, updated_at BIGINT NOT NULL, deleted BOOLEAN DEFAULT false, operation_id TEXT, device_id TEXT, synced_at BIGINT DEFAULT (extract(epoch from now())::bigint * 1000)
);
CREATE TABLE IF NOT EXISTS public.projects (
  id TEXT PRIMARY KEY, data JSONB NOT NULL DEFAULT '{}'::jsonb, updated_at BIGINT NOT NULL, deleted BOOLEAN DEFAULT false, operation_id TEXT, device_id TEXT, synced_at BIGINT DEFAULT (extract(epoch from now())::bigint * 1000)
);
CREATE TABLE IF NOT EXISTS public.ics_export_configs (
  id TEXT PRIMARY KEY, data JSONB NOT NULL DEFAULT '{}'::jsonb, updated_at BIGINT NOT NULL, deleted BOOLEAN DEFAULT false, operation_id TEXT, device_id TEXT, synced_at BIGINT DEFAULT (extract(epoch from now())::bigint * 1000)
);
CREATE TABLE IF NOT EXISTS public.global_settings (
  key TEXT PRIMARY KEY, data JSONB NOT NULL DEFAULT '{}'::jsonb, updated_at BIGINT NOT NULL, deleted BOOLEAN DEFAULT false, operation_id TEXT, device_id TEXT, synced_at BIGINT DEFAULT (extract(epoch from now())::bigint * 1000)
);

-- 4. 設定安全權限 (RLS & Policies)
DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY['log', 'task_pool', 'scheduled', 'micro_tasks', 'inbox', 'resource', 'macro', 'ics_events', 'ics_sources', 'projects', 'ics_export_configs', 'global_settings'];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = t AND policyname = 'Enable all access for anon') THEN
      EXECUTE format('CREATE POLICY "Enable all access for anon" ON public.%I FOR ALL TO anon USING (true) WITH CHECK (true);', t);
    END IF;
  END LOOP;
END $$;

-- 5. 記錄 Schema 版本號
INSERT INTO public.global_settings (key, data, updated_at)
VALUES ('supabase_schema_version', '{"version": "1.0.0"}'::jsonb, extract(epoch from now())::bigint * 1000)
ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at;

```

---

### 二、 🔑 `net.http_post` 裡面到底需不需要宣告 apikey 與 data？

**答案是：需要！**

雖然您的 cURL 抓出來長這樣：

```bash
curl -L -X POST 'https://xxx.supabase.co/functions/v1/export-ics' \
  -H 'Authorization: Bearer sb_publishable_...'\
  -H 'apikey: sb_publishable_...' \
  -H 'Content-Type: application/json' \
  --data '{"name":"Functions"}'

```

當您透過 PostgreSQL 的 `net.http_post` 在資料庫內部發動請求時，本質上它依然是在對外部的 Supabase API Gateway 發送一個標準 HTTP 請求。

1. **`Authorization` 與 `apikey` 必填**：因為 Supabase Edge Functions 預設會受到閘道保護，如果漏掉這兩個 Header，伺服器會直接退回 `401 Unauthorized` 錯誤。
2. **`body` (或 `data`) 必填嗎？**：如果您的 Edge Function 裡面沒有去解析 `req.json()`（像我們寫的 `export-ics` 是直接去讀資料庫，不依賴帶進來的引數），雖然傳空的或簡單的 `{}` 即可，但 `pg_net` 語法中通常還是會帶上 `body:='{}'::jsonb` 比較保險。

因此，在 `pg_cron` 執行的正確 `net.http_post` 寫法應該是這樣：

```sql
SELECT net.http_post(
  url:='https://您的專案ID.supabase.co/functions/v1/export-ics',
  headers:='{
    "Content-Type": "application/json",
    "Authorization": "Bearer 您的_ANON_或_SERVICE_ROLE_KEY",
    "apikey": "您的_ANON_或_SERVICE_ROLE_KEY"
  }'::jsonb,
  body:='{}'::jsonb
);

```

---

### 三、 ⏰ `pg_cron` 如何設定、修改與管理？（解除恐懼指南）

您之前沒試過是完全正常的！資料庫定時任務聽起來很深奧，但實際上就像「在 Supabase 裡面註冊一個鬧鐘」。

#### 1. 啟用 `pg_cron` 與 `pg_net` 擴充功能

請先在 SQL Editor 執行這兩行（如果還沒開過的話）：

```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

```

#### 2. 註冊排程（以「每小時執行一次」為例）

執行以下 SQL，把 `export-ics-hourly` 這個排程建立起來：

```sql
SELECT cron.schedule(
  'export-ics-hourly',          -- 排程名稱（可以自己取名字，用來識別）
  '0 * * * *',                  -- Cron 時間表達式（這裡代表每小時的第 0 分鐘執行）
  $$
  SELECT net.http_post(
    url:='https://YOUR_PROJECT_REF.supabase.co/functions/v1/export-ics',
    headers:='{
      "Content-Type": "application/json",
      "Authorization": "Bearer YOUR_ANON_OR_SERVICE_ROLE_KEY",
      "apikey": "YOUR_ANON_OR_SERVICE_ROLE_KEY"
    }'::jsonb,
    body:='{}'::jsonb
  );
  $$
);

```

---

#### 3. 恐懼解除：如果之後想修改或刪除，該怎麼辦？

這正是最棒的地方——**`pg_cron` 可以隨時用 SQL 指令安全地修改、刪除或查看狀態！** 完全不用擔心改壞。

* **如何查看目前有哪些定時排程？**
只要執行這行，就能看到所有建立過的 cron 工作：
```sql
SELECT * FROM cron.job;

```


* **如何修改排程（例如想改成每 30 分鐘執行一次，或者換網址）？**
非常簡單！您**不需要**去 Update 什麼複雜的設定，只要**直接重新執行一次 `cron.schedule`，並使用原本的排程名稱（例如 `'export-ics-hourly'`）**，它就會自動「覆蓋/更新」舊的排程：
```sql
-- 直接再次執行，它會覆蓋舊的設定
SELECT cron.schedule(
  'export-ics-hourly',
  '*/30 * * * *', -- 改成每 30 分鐘執行一次
  $$ ... (放你的 net.http_post 程式碼) ... $$
);

```


* **如何刪除（取消）這個排程？**
如果有一天不想要它自動跑了，直接呼叫 `cron.unschedule` 即可：
```sql
SELECT cron.unschedule('export-ics-hourly');

```


* **如何檢查它有沒有成功執行過（看歷史紀錄）？**
Supabase 會自動記錄每一次排程執行的結果，您可以查詢這張表來對獎：
```sql
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;

```


如果 `status` 顯示 `succeeded`，就代表大功告成，Supabase 已經完美取代 GAS 的時間驅動觸發器了！
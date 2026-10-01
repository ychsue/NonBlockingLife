-- ==========================================
-- NonBlockingLife (PWA) - Supabase 初始化腳本
-- 提示：此腳本支援無痛重複執行，不會覆蓋或遺失舊資料。
-- ==========================================

-- ------------------------------------------
-- 1. 建立「時區檢視輔助函數」（給使用者開開眼界/方便看時間😄）
-- 預設為 Asia/Taipei (+08:00)，若您在其他時區，可手動修改下方的 'Asia/Taipei'！
-- 使用教學：
--   SELECT task_id, to_tw_time(updated_at) AS 最後更新時間, data FROM task_pool;
-- ------------------------------------------
CREATE OR REPLACE FUNCTION to_tw_time(ms BIGINT) 
RETURNS TIMESTAMP WITH TIME ZONE AS $$
  -- 將毫秒數字 (BIGINT) 轉為易讀的時間格式
  SELECT to_timestamp(ms / 1000.0) AT TIME ZONE 'Asia/Taipei';
$$ LANGUAGE sql IMMUTABLE;


-- ------------------------------------------
-- 2. 建立中心事實表 (Fact Table): log
-- log 表採獨立欄位展開，方便 AI Agent / SQL 進行大數據分析
-- ------------------------------------------
CREATE TABLE IF NOT EXISTS public.log (
  id TEXT PRIMARY KEY,               -- 對應 logId
  timestamp BIGINT,                  -- 發生時間戳記 (ms)
  task_id TEXT,                      -- 關聯的 taskId
  title TEXT,                        -- 任務名稱
  action TEXT,                       -- 動作 (e.g. START, STOP)
  state TEXT,                        -- 狀態
  duration INT,                      -- 專注時長 (秒)
  notes TEXT,                        -- 備註
  updated_at BIGINT NOT NULL,        -- 異動時間戳記 (ms)
  deleted BOOLEAN DEFAULT false,     -- 軟刪除
  operation_id TEXT,                 -- PWA change_log ID
  device_id TEXT,                    -- 裝置 ID
  category TEXT,                     -- 分類 (task_pool, micro_tasks...)
  synced_at BIGINT DEFAULT (extract(epoch from now())::bigint * 1000) -- 雲端接收時間
);


-- ------------------------------------------
-- 3. 建立 11 張維度表 (Dimension Tables)
-- 採用 Primary Key + JSONB data Payload (無痛支援前端 Schema 升級)
-- ------------------------------------------

-- (1) task_pool
CREATE TABLE IF NOT EXISTS public.task_pool (
  task_id TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at BIGINT NOT NULL,
  deleted BOOLEAN DEFAULT false,
  operation_id TEXT,
  device_id TEXT,
  synced_at BIGINT DEFAULT (extract(epoch from now())::bigint * 1000)
);

-- (2) scheduled
CREATE TABLE IF NOT EXISTS public.scheduled (
  task_id TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at BIGINT NOT NULL,
  deleted BOOLEAN DEFAULT false,
  operation_id TEXT,
  device_id TEXT,
  synced_at BIGINT DEFAULT (extract(epoch from now())::bigint * 1000)
);

-- (3) micro_tasks
CREATE TABLE IF NOT EXISTS public.micro_tasks (
  task_id TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at BIGINT NOT NULL,
  deleted BOOLEAN DEFAULT false,
  operation_id TEXT,
  device_id TEXT,
  synced_at BIGINT DEFAULT (extract(epoch from now())::bigint * 1000)
);

-- (4) inbox
CREATE TABLE IF NOT EXISTS public.inbox (
  task_id TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at BIGINT NOT NULL,
  deleted BOOLEAN DEFAULT false,
  operation_id TEXT,
  device_id TEXT,
  synced_at BIGINT DEFAULT (extract(epoch from now())::bigint * 1000)
);

-- (5) resource
CREATE TABLE IF NOT EXISTS public.resource (
  task_id TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at BIGINT NOT NULL,
  deleted BOOLEAN DEFAULT false,
  operation_id TEXT,
  device_id TEXT,
  synced_at BIGINT DEFAULT (extract(epoch from now())::bigint * 1000)
);

-- (6) macro
CREATE TABLE IF NOT EXISTS public.macro (
  task_id TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at BIGINT NOT NULL,
  deleted BOOLEAN DEFAULT false,
  operation_id TEXT,
  device_id TEXT,
  synced_at BIGINT DEFAULT (extract(epoch from now())::bigint * 1000)
);

-- (7) ics_events
CREATE TABLE IF NOT EXISTS public.ics_events (
  event_id TEXT PRIMARY KEY,  -- 注意：主鍵為 event_id
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at BIGINT NOT NULL,
  deleted BOOLEAN DEFAULT false,
  operation_id TEXT,
  device_id TEXT,
  synced_at BIGINT DEFAULT (extract(epoch from now())::bigint * 1000)
);

-- (8) ics_sources
CREATE TABLE IF NOT EXISTS public.ics_sources (
  source_id TEXT PRIMARY KEY, -- 注意：主鍵為 source_id
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at BIGINT NOT NULL,
  deleted BOOLEAN DEFAULT false,
  operation_id TEXT,
  device_id TEXT,
  synced_at BIGINT DEFAULT (extract(epoch from now())::bigint * 1000)
);

-- (9) projects
CREATE TABLE IF NOT EXISTS public.projects (
  id TEXT PRIMARY KEY,        -- 注意：主鍵為 id
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at BIGINT NOT NULL,
  deleted BOOLEAN DEFAULT false,
  operation_id TEXT,
  device_id TEXT,
  synced_at BIGINT DEFAULT (extract(epoch from now())::bigint * 1000)
);

-- (10) ics_export_configs
CREATE TABLE IF NOT EXISTS public.ics_export_configs (
  id TEXT PRIMARY KEY,        -- 注意：主鍵為 id
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at BIGINT NOT NULL,
  deleted BOOLEAN DEFAULT false,
  operation_id TEXT,
  device_id TEXT,
  synced_at BIGINT DEFAULT (extract(epoch from now())::bigint * 1000)
);

-- (11) global_settings
CREATE TABLE IF NOT EXISTS public.global_settings (
  key TEXT PRIMARY KEY,       -- 注意：主鍵為 key
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at BIGINT NOT NULL,
  deleted BOOLEAN DEFAULT false,
  operation_id TEXT,
  device_id TEXT,
  synced_at BIGINT DEFAULT (extract(epoch from now())::bigint * 1000)
);


-- ------------------------------------------
-- 4. 設定安全權限 (Row Level Security & Policies)
-- 允許使用 anon_key 的 PWA 具備讀寫權限
-- ------------------------------------------

-- 安全地設定 Policy 的內部常規腳本
DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'log', 'task_pool', 'scheduled', 'micro_tasks', 'inbox', 
    'resource', 'macro', 'ics_events', 'ics_sources', 'projects', 
    'ics_export_configs', 'global_settings'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    -- 開啟 RLS
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    
    -- 若 Policy 不存在則建立全開的 Policy (允許 anon 存取)
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = t AND policyname = 'Enable all access for anon'
    ) THEN
      EXECUTE format(
        'CREATE POLICY "Enable all access for anon" ON public.%I FOR ALL TO anon USING (true) WITH CHECK (true);', 
        t
      );
    END IF;
  END LOOP;
END $$;


-- ------------------------------------------
-- 5. 記錄當前 Supabase Schema 版本號
-- ------------------------------------------
INSERT INTO public.global_settings (key, data, updated_at)
VALUES (
  'supabase_schema_version', 
  '{"version": "1.0.0", "description": "Initial Supabase Star Schema"}'::jsonb, 
  extract(epoch from now())::bigint * 1000
)
ON CONFLICT (key) DO UPDATE 
SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at;
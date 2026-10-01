-- 執行這個 SQL 來設定定時任務之前，需要
-- 1. 先在 Supabase -> Edge Functions -> Deply a new function -> 
-- 2. 將icsExportCode.ts 的程式碼貼進 supabase 內的 index.ts
-- 3. 修改 Function name 為 export-ics
-- 然後再根據 Edge Functions -> export-ics 的實際 URL 與金鑰修改下面的內容
-- 1. 由這個 export-ics 的 Settings 底下的 Invoke function + show anon key 取得 URL 與金鑰
-- 2. 修改下面的 URL 與金鑰為實際取得的值
-- 然後，再將您的程式碼貼進 SQL Editor 執行即可


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
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SUPABASE_ANON_KEY","apikey": "YOUR_SUPABASE_ANON_KEY",}'::jsonb
    body:='{"name":"Functions"}'::jsonb,
  );
  $$
);
-- 清空所有 Supabase 表格資料 (不包含 global_settings)，請小心使用
DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'log', 'task_pool', 'scheduled', 'micro_tasks', 'inbox', 
    'resource', 'macro', 'ics_events', 'ics_sources', 'projects', 
    'ics_export_configs'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    -- 清空表格資料
    EXECUTE format('TRUNCATE TABLE public.%I CASCADE;', t);
  END LOOP;
END $$;

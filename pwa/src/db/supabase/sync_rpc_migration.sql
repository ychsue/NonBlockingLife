-- Supabase sync protocol v2.
-- Run after initialize.sql for new projects, or by itself for existing projects.

CREATE TABLE IF NOT EXISTS public.sync_sequence (
    singleton BOOLEAN PRIMARY KEY DEFAULT true CHECK (singleton),
    current_seq BIGINT NOT NULL DEFAULT 0
);

INSERT INTO
    public.sync_sequence (singleton, current_seq)
VALUES (true, 0) ON CONFLICT (singleton) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.sync_changes (
  seq BIGINT PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  operation_id TEXT NOT NULL UNIQUE,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  deleted BOOLEAN NOT NULL DEFAULT false,
  server_version BIGINT NOT NULL,
  synced_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS sync_changes_table_record_idx ON public.sync_changes (table_name, record_id);

DROP FUNCTION IF EXISTS public.get_all_sync_tables(BIGINT);

DO $$
DECLARE
  t TEXT;
  pk TEXT;
  base_seq BIGINT;
  inserted_count BIGINT;
  tables TEXT[] := ARRAY['task_pool', 'scheduled', 'micro_tasks', 'inbox', 'resource', 'macro',
      'ics_events', 'ics_sources', 'projects', 'ics_export_configs',
      'global_settings', 'dashboard']::TEXT[];

BEGIN
  FOREACH t IN ARRAY tables LOOP
    pk := CASE
      WHEN t = 'ics_events' THEN 'event_id'
      WHEN t = 'ics_sources' THEN 'source_id'
      WHEN t IN ('projects', 'ics_export_configs') THEN 'id'
      WHEN t = 'global_settings' THEN 'key'
      ELSE 'task_id'
    END;

    EXECUTE format(
      'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS server_version BIGINT NOT NULL DEFAULT 1',
      t
    );
    EXECUTE format(
      'UPDATE public.%I SET server_version = 1 WHERE server_version IS NULL',
      t
    );
    EXECUTE format(
      'ALTER TABLE public.%I ALTER COLUMN server_version SET NOT NULL',
      t
    );

    SELECT current_seq INTO base_seq
    FROM public.sync_sequence
    WHERE singleton = true
    FOR UPDATE;

    EXECUTE format(
      'INSERT INTO public.sync_changes
         (seq, table_name, record_id, operation_id, data, deleted, server_version, synced_at)
       SELECT $1 + row_number() OVER (ORDER BY r.%I)::BIGINT,
              $2,
              r.%I::TEXT,
              $3 || r.%I::TEXT,
              r.data,
              coalesce(r.deleted, false),
              r.server_version,
              coalesce(r.synced_at, floor(extract(epoch FROM clock_timestamp()) * 1000)::BIGINT)
       FROM public.%I AS r
       WHERE NOT EXISTS (
         SELECT 1 FROM public.sync_changes AS c
         WHERE c.operation_id = $3 || r.%I::TEXT
       )',
      pk, pk, pk, t, pk
    )
    USING base_seq, t, 'bootstrap:' || t || ':';

    GET DIAGNOSTICS inserted_count = ROW_COUNT;
    UPDATE public.sync_sequence
    SET current_seq = base_seq + inserted_count
    WHERE singleton = true;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.push_sync_changes(p_changes JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
<<push_sync_changes_block>>
DECLARE
  item JSONB;
  results JSONB := '[]'::JSONB;
  table_name TEXT;
  record_id TEXT;
  operation_id TEXT;
  operation TEXT;
  device_id TEXT;
  pk TEXT;
  expected_version BIGINT;
  current_version BIGINT;
  next_version BIGINT;
  current_data JSONB;
  record_data JSONB;
  current_deleted BOOLEAN;
  is_deleted BOOLEAN;
  row_exists BOOLEAN;
  server_time BIGINT;
  new_seq BIGINT;
  duplicate_version BIGINT;
  duplicate_found BOOLEAN;
BEGIN
  IF jsonb_typeof(p_changes) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'p_changes must be a JSON array';
  END IF;

  -- Serializes writers so sequence order matches commit order. Pull holds the
  -- same lock while choosing its watermark and reading a page.
  PERFORM current_seq
  FROM public.sync_sequence
  WHERE singleton = true
  FOR UPDATE;

  FOR item IN SELECT value FROM jsonb_array_elements(p_changes)
  LOOP
    table_name := item->>'table';
    record_id := item->>'recordId';
    operation_id := item->>'operationId';
    operation := item->>'op';
    device_id := item->>'deviceId';
    record_data := coalesce(item->'data', '{}'::JSONB);

    IF table_name = 'log' THEN
      IF coalesce(operation_id, '') = '' OR coalesce(record_id, '') = '' THEN
        results := results || jsonb_build_array(jsonb_build_object(
          'operationId', operation_id, 'status', 'rejected',
          'error', 'operationId and recordId are required'
        ));
        CONTINUE;
      END IF;

      SELECT EXISTS (
        SELECT 1 FROM public.log
        WHERE public.log.operation_id = push_sync_changes_block.operation_id
      ) INTO duplicate_found;

      IF duplicate_found THEN
        results := results || jsonb_build_array(jsonb_build_object(
          'operationId', operation_id, 'status', 'success', 'duplicate', true
        ));
        CONTINUE;
      END IF;

      server_time := floor(extract(epoch FROM clock_timestamp()) * 1000)::BIGINT;
      IF operation = 'delete' THEN
        UPDATE public.log
        SET deleted = true, updated_at = server_time, synced_at = server_time,
            operation_id = push_sync_changes_block.operation_id,
            device_id = push_sync_changes_block.device_id
        WHERE id = record_id;
      ELSE
        INSERT INTO public.log (
          id, timestamp, task_id, title, action, state, duration, notes,
          updated_at, deleted, operation_id, device_id, category, synced_at
        )
        VALUES (
          record_id,
          nullif(record_data->>'timestamp', '')::BIGINT,
          coalesce(record_data->>'task_id', record_data->>'taskId'),
          record_data->>'title',
          record_data->>'action',
          record_data->>'state',
          nullif(record_data->>'duration', '')::INTEGER,
          record_data->>'notes',
          server_time,
          false,
          operation_id,
          device_id,
          record_data->>'category',
          server_time
        )
        ON CONFLICT (id) DO UPDATE SET
          timestamp = EXCLUDED.timestamp,
          task_id = EXCLUDED.task_id,
          title = EXCLUDED.title,
          action = EXCLUDED.action,
          state = EXCLUDED.state,
          duration = EXCLUDED.duration,
          notes = EXCLUDED.notes,
          updated_at = EXCLUDED.updated_at,
          deleted = false,
          operation_id = EXCLUDED.operation_id,
          device_id = EXCLUDED.device_id,
          category = EXCLUDED.category,
          synced_at = EXCLUDED.synced_at;
      END IF;

      results := results || jsonb_build_array(jsonb_build_object(
        'operationId', operation_id, 'status', 'success', 'syncedAt', server_time
      ));
      CONTINUE;
    END IF;

    IF table_name IS NULL OR table_name NOT IN (
      'task_pool', 'scheduled', 'micro_tasks', 'inbox', 'resource', 'macro',
      'ics_events', 'ics_sources', 'projects', 'ics_export_configs',
      'global_settings', 'dashboard'
    ) OR coalesce(record_id, '') = '' OR coalesce(operation_id, '') = ''
       OR operation IS NULL OR operation NOT IN ('add', 'update', 'put', 'delete')
       OR jsonb_typeof(record_data) IS DISTINCT FROM 'object' THEN
      results := results || jsonb_build_array(jsonb_build_object(
        'operationId', operation_id, 'status', 'rejected',
        'error', 'Invalid table, recordId, operationId, operation, or data'
      ));
      CONTINUE;
    END IF;

    pk := CASE
      WHEN table_name = 'ics_events' THEN 'event_id'
      WHEN table_name = 'ics_sources' THEN 'source_id'
      WHEN table_name IN ('projects', 'ics_export_configs') THEN 'id'
      WHEN table_name = 'global_settings' THEN 'key'
      ELSE 'task_id'
    END;
    expected_version := coalesce(nullif(item->>'expectedVersion', '')::BIGINT, 0);

    SELECT EXISTS (
      SELECT 1 FROM public.sync_changes AS c
      WHERE c.operation_id = push_sync_changes_block.operation_id
    ) INTO duplicate_found;
    IF duplicate_found THEN
      EXECUTE format(
        'SELECT server_version FROM public.%I WHERE %I = $1',
        table_name, pk
      ) INTO duplicate_version USING record_id;
      results := results || jsonb_build_array(jsonb_build_object(
        'operationId', operation_id, 'status', 'success', 'duplicate', true,
        'serverVersion', coalesce(duplicate_version, 0)
      ));
      CONTINUE;
    END IF;

    row_exists := false;
    current_version := 0;
    current_data := '{}'::JSONB;
    current_deleted := false;
    EXECUTE format(
      'SELECT server_version, data, deleted FROM public.%I WHERE %I = $1 FOR UPDATE',
      table_name, pk
    ) INTO current_version, current_data, current_deleted USING record_id;
    row_exists := current_version IS NOT NULL;
    current_version := coalesce(current_version, 0);
    current_data := coalesce(current_data, '{}'::JSONB);
    current_deleted := coalesce(current_deleted, false);

    IF current_version <> expected_version THEN
      results := results || jsonb_build_array(jsonb_build_object(
        'operationId', operation_id,
        'status', 'conflict',
        'serverVersion', current_version,
        'serverData', current_data,
        'deleted', current_deleted
      ));
      CONTINUE;
    END IF;

    next_version := current_version + 1;
    is_deleted := operation = 'delete';
    server_time := floor(extract(epoch FROM clock_timestamp()) * 1000)::BIGINT;
    IF is_deleted THEN
      record_data := current_data;
    END IF;

    IF row_exists THEN
      EXECUTE format(
        'UPDATE public.%I
         SET data = $1, updated_at = $2, deleted = $3, operation_id = $4,
             device_id = $5, synced_at = $2, server_version = $6
         WHERE %I = $7',
        table_name, pk
      )
      USING record_data, server_time, is_deleted, operation_id, device_id,
            next_version, record_id;
    ELSE
      EXECUTE format(
        'INSERT INTO public.%I
         (%I, data, updated_at, deleted, operation_id, device_id, synced_at, server_version)
         VALUES ($1, $2, $3, $4, $5, $6, $3, $7)',
        table_name, pk
      )
      USING record_id, record_data, server_time, is_deleted, operation_id,
            device_id, next_version;
    END IF;

    UPDATE public.sync_sequence
    SET current_seq = current_seq + 1
    WHERE singleton = true
    RETURNING current_seq INTO new_seq;

    INSERT INTO public.sync_changes (
      seq, table_name, record_id, operation_id, data, deleted,
      server_version, synced_at
    )
    VALUES (
      new_seq, table_name, record_id, operation_id, record_data, is_deleted,
      next_version, server_time
    );

    results := results || jsonb_build_array(jsonb_build_object(
      'operationId', operation_id,
      'status', 'success',
      'serverVersion', next_version,
      'syncedAt', server_time
    ));
  END LOOP;

  RETURN jsonb_build_object('results', results);
END;
$$;

CREATE OR REPLACE FUNCTION public.pull_sync_changes(
  p_after_cursor BIGINT DEFAULT 0,
  p_through_cursor BIGINT DEFAULT NULL,
  p_limit INTEGER DEFAULT 500
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  watermark BIGINT;
  page_limit INTEGER := greatest(1, least(coalesce(p_limit, 500), 1000));
  page JSONB;
  page_count INTEGER;
  next_cursor BIGINT;
  more_available BOOLEAN;
BEGIN
  IF p_after_cursor < 0 OR (p_through_cursor IS NOT NULL AND p_through_cursor < p_after_cursor) THEN
    RAISE EXCEPTION 'Invalid sync cursor';
  END IF;

  -- Pair with push_sync_changes so the watermark cannot pass an uncommitted write.
  SELECT current_seq INTO watermark
  FROM public.sync_sequence
  WHERE singleton = true
  FOR UPDATE;
  watermark := least(coalesce(p_through_cursor, watermark), watermark);
  IF p_after_cursor > watermark THEN
    RAISE EXCEPTION 'Sync cursor exceeds the server watermark';
  END IF;

  SELECT coalesce(jsonb_agg(to_jsonb(page_rows) ORDER BY page_rows.seq), '[]'::JSONB),
         count(*)::INTEGER
  INTO page, page_count
  FROM (
    SELECT seq, table_name AS "table", record_id AS "recordId",
           operation_id AS "operationId", data, deleted,
           server_version AS "serverVersion", synced_at AS "syncedAt"
    FROM public.sync_changes
    WHERE seq > p_after_cursor AND seq <= watermark
    ORDER BY seq
    LIMIT page_limit
  ) AS page_rows;

  IF page_count > 0 THEN
    next_cursor := (page->(page_count - 1)->>'seq')::BIGINT;
  ELSE
    next_cursor := watermark;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.sync_changes
    WHERE seq > next_cursor AND seq <= watermark
  ) INTO more_available;

  RETURN jsonb_build_object(
    'changes', page,
    'nextCursor', next_cursor,
    'throughCursor', watermark,
    'hasMore', more_available
  );
END;
$$;

REVOKE ALL ON public.sync_sequence,
public.sync_changes
FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.push_sync_changes (JSONB) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.pull_sync_changes (BIGINT, BIGINT, INTEGER)
FROM PUBLIC;

GRANT
EXECUTE ON FUNCTION public.push_sync_changes (JSONB) TO anon,
authenticated;

GRANT
EXECUTE ON FUNCTION public.pull_sync_changes (BIGINT, BIGINT, INTEGER) TO anon,
authenticated;

DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'log', 'task_pool', 'scheduled', 'micro_tasks', 'inbox',
    'resource', 'macro', 'ics_events', 'ics_sources', 'projects',
    'ics_export_configs', 'global_settings', 'dashboard'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Enable all access for anon" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Sync RPC read access" ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY "Sync RPC read access" ON public.%I FOR SELECT TO anon, authenticated USING (true)',
      t
    );
    EXECUTE format('GRANT SELECT ON public.%I TO anon, authenticated', t);
    EXECUTE format(
      'REVOKE INSERT, UPDATE, DELETE ON public.%I FROM PUBLIC, anon, authenticated',
      t
    );
  END LOOP;
END $$;

COMMENT ON
TABLE public.sync_changes IS 'Ordered server-side change feed for PWA sync. Sequence allocation is serialized by sync_sequence.';

-- 定義取得 table global_settings 的JSONB
CREATE OR REPLACE FUNCTION public.fetch_global_settings()
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_agg(to_jsonb(gs)) INTO result
  FROM public.global_settings AS gs;
  RETURN coalesce(result, '[]'::JSONB);
END;
$$ LANGUAGE plpgsql;

REVOKE ALL ON FUNCTION public.fetch_global_settings () FROM PUBLIC;

GRANT
EXECUTE ON FUNCTION public.fetch_global_settings () TO anon,
authenticated;
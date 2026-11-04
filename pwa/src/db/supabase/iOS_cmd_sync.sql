-- ## iOS Command Sync
-- ## 試著寫出一個函數在 global_settings table 裡面的 key "iOS_cmd_sync" 寫入 data，好遠端呼叫
create or replace function public.set_ios_cmd_sync
(
    data jsonb, 
    deleted boolean default false
)
returns void
language plpgsql
security definer
as $$
begin
  insert into public.global_settings(key, data, updated_at, deleted)
  values ('iOS_cmd_sync', data, (extract(epoch from now())::bigint * 1000), deleted)
  on conflict (key)
  do update set
    data = excluded.data,
    deleted = excluded.deleted;
end;
$$;

REVOKE ALL ON FUNCTION public.set_ios_cmd_sync (jsonb, boolean)
FROM PUBLIC;

GRANT
EXECUTE ON FUNCTION public.set_ios_cmd_sync (jsonb, boolean) TO anon,
authenticated;

-- ## 移除 set_ios_cmd_sync 函數
-- DROP FUNCTION public.set_ios_cmd_sync(jsonb, boolean);
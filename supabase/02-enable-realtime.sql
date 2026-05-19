-- Run after schema.sql (Supabase SQL Editor)
-- Enables live updates for all viewers on the leadership URL.

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'vendor_board_state'
  ) then
    alter publication supabase_realtime add table public.vendor_board_state;
  end if;
end $$;

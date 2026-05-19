-- Vendor Resource Board — standalone Supabase schema
-- SECURITY-REVIEW: edit_key gates writes; anon key is public — rely on RLS + RPC only.

-- ---------------------------------------------------------------------------
-- Config (publisher secret — set before go-live, never commit the real key)
-- ---------------------------------------------------------------------------
create table if not exists public.vendor_board_config (
  singleton boolean primary key default true check (singleton = true),
  edit_key text not null
);

insert into public.vendor_board_config (singleton, edit_key)
values (true, 'CHANGE_ME_TO_A_LONG_RANDOM_SECRET')
on conflict (singleton) do update set edit_key = excluded.edit_key;

-- ---------------------------------------------------------------------------
-- Shared roster state
-- ---------------------------------------------------------------------------
create table if not exists public.vendor_board_state (
  id text primary key,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.vendor_board_state (id, state)
values ('default', '{"v":1,"data":[],"meta":{}}'::jsonb)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.vendor_board_config enable row level security;
alter table public.vendor_board_state enable row level security;

revoke all on public.vendor_board_config from anon, authenticated;

drop policy if exists "vendor_board_state_public_read" on public.vendor_board_state;
create policy "vendor_board_state_public_read"
  on public.vendor_board_state
  for select
  to anon, authenticated
  using (true);

revoke insert, update, delete on public.vendor_board_state from anon, authenticated;
grant select on public.vendor_board_state to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Publish RPC
-- ---------------------------------------------------------------------------
create or replace function public.publish_vendor_board_state(
  p_id text,
  p_state jsonb,
  p_edit_key text
)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  expected_key text;
  ts timestamptz := now();
begin
  if p_id is null or length(trim(p_id)) = 0 then
    raise exception 'invalid id' using errcode = '22023';
  end if;

  if p_state is null or jsonb_typeof(p_state) <> 'object' then
    raise exception 'invalid state' using errcode = '22023';
  end if;

  if coalesce(p_state->>'v', '') = '' then
    raise exception 'invalid state version' using errcode = '22023';
  end if;

  select edit_key into expected_key
  from public.vendor_board_config
  where singleton = true;

  if expected_key is null or p_edit_key is distinct from expected_key then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  insert into public.vendor_board_state (id, state, updated_at)
  values (p_id, p_state, ts)
  on conflict (id) do update
    set state = excluded.state,
        updated_at = excluded.updated_at;

  return ts;
end;
$$;

revoke all on function public.publish_vendor_board_state(text, jsonb, text) from public;
grant execute on function public.publish_vendor_board_state(text, jsonb, text) to anon, authenticated;

-- Realtime: Database → Publications → add vendor_board_state to supabase_realtime
-- alter publication supabase_realtime add table public.vendor_board_state;

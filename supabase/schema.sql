create extension if not exists pgcrypto;

create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null default '我们的家',
  invite_code text not null unique,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  display_name text not null,
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  paid_by uuid not null references auth.users(id) on delete cascade,
  title text not null,
  amount numeric(12,2) not null check ( (amount > 0)),
  currency text not null check (currency in ('CNY','HKD')),
  responsibility text not null default 'shared' check (responsibility in ('shared','other')),
  created_at timestamptz not null default now()
);

create table if not exists public.settlement_notices (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  month text not null check (month ~ '^\\d{4}-\\d{2}$'),
  debtor_id uuid not null references auth.users(id) on delete cascade,
  creditor_id uuid not null references auth.users(id) on delete cascade,
  cny_amount numeric(12,2) not null default 0,
  hkd_amount numeric(12,2) not null default 0,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  settled_at timestamptz,
  unique (household_id, month, debtor_id, creditor_id)
);

create or replace function public.is_household_member(target_household uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.household_members where household_id=target_household and user_id=auth.uid());
$$;

alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.expenses enable row level security;
alter table public.settlement_notices enable row level security;

create policy "members view household" on public.households for select using (public.is_household_member(id));
create policy "members view members" on public.household_members for select using (public.is_household_member(household_id));
create policy "member updates own name" on public.household_members for update
  using (user_id=auth.uid() and public.is_household_member(household_id))
  with check (user_id=auth.uid() and public.is_household_member(household_id));
create policy "members view expenses" on public.expenses for select using (public.is_household_member(household_id));
create policy "members add expenses" on public.expenses for insert with check (public.is_household_member(household_id) and paid_by=auth.uid());
create policy "payer deletes expense" on public.expenses for delete using (public.is_household_member(household_id) and paid_by=auth.uid());
create policy "members view settlement notices" on public.settlement_notices for select using (public.is_household_member(household_id));
create policy "members publish settlement notices" on public.settlement_notices for insert with check (public.is_household_member(household_id) and created_by=auth.uid());
create policy "members update settlement notices" on public.settlement_notices for update using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));

create or replace function public.create_household(p_name text, p_display_name text)
returns table(household_id uuid, invite_code text) language plpgsql security definer set search_path=public as $$
declare new_id uuid; new_code text;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if exists(select 1 from household_members where user_id=auth.uid()) then raise exception 'Already in a household'; end if;
  new_code:=upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));
  insert into households(name,invite_code,created_by) values(coalesce(nullif(trim(p_name),''),'我们的家'),new_code,auth.uid()) returning id into new_id;
  insert into household_members values(new_id,auth.uid(),coalesce(nullif(trim(p_display_name),''),'我'),now());
  return query select new_id,new_code;
end; $$;

create or replace function public.join_household(p_invite_code text, p_display_name text)
returns uuid language plpgsql security definer set search_path=public as $$
declare target_id uuid;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if exists(select 1 from household_members where user_id=auth.uid()) then raise exception 'Already in a household'; end if;
  select id into target_id from households where invite_code=upper(trim(p_invite_code));
  if target_id is null then raise exception 'Invite code not found'; end if;
  if (select count(*) from household_members where household_id=target_id)>=2 then raise exception 'Household is full'; end if;
  insert into household_members values(target_id,auth.uid(),coalesce(nullif(trim(p_display_name),''),'室友'),now());
  return target_id;
end; $$;

grant execute on function public.create_household(text,text) to authenticated;
grant execute on function public.join_household(text,text) to authenticated;
alter publication supabase_realtime add table public.expenses;

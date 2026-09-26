-- JAZ Chocolate — identity & access (Production Architecture §2.2).
--
-- The prototype carried its ten roles in localStorage, which meant anyone could
-- become the owner from the browser console. This migration moves the role onto
-- the server: a profile row per auth user, a Postgres enum for the role, and RLS
-- policies that decide what each role may read and write. The client can still
-- ask for anything — the database is what refuses.

-- ---------------------------------------------------------------- roles

-- Mirrors RoleId in src/data/roles.ts. Keep the two in step.
create type public.app_role as enum (
  'customer',
  'b2b',
  'mega_business',
  'sales_agent',
  'support_agent',
  'content_editor',
  'finance',
  'admin',
  'auditor',
  'owner'
);

-- ---------------------------------------------------------------- tables

create table public.organizations (
  id            uuid primary key default gen_random_uuid(),
  name_en       text not null,
  name_ar       text not null,
  cr_number     text unique,
  vat_number    text unique,
  channel       text not null default 'b2b' check (channel in ('b2c', 'b2b')),
  credit_limit  numeric(14, 2) not null default 0 check (credit_limit >= 0),
  created_at    timestamptz not null default now()
);

comment on table public.organizations is 'B2B buying organizations. A profile may belong to one.';

create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  email         text,
  phone         text,
  full_name_en  text,
  full_name_ar  text,
  role          public.app_role not null default 'customer',
  org_id        uuid references public.organizations (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.profiles is 'One row per auth user. The role column is the single source of truth for access.';
comment on column public.profiles.role is 'Server-owned. Only admin/owner may change it — enforced by profiles_guard_role().';

create index profiles_role_idx on public.profiles (role);
create index profiles_org_id_idx on public.profiles (org_id);

-- ---------------------------------------------------------------- helpers
--
-- SECURITY DEFINER so a policy on profiles can ask "what is my role?" without
-- re-entering the same policy and recursing. search_path is pinned so the
-- function body can never be redirected through a caller-controlled schema.

create or replace function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (select role from public.profiles where id = auth.uid())
      in ('sales_agent', 'support_agent', 'content_editor', 'finance', 'admin', 'auditor', 'owner'),
    false
  );
$$;

-- The four roles the architecture marks requiresMFA (§5.3/5.4).
create or replace function public.is_privileged()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (select role from public.profiles where id = auth.uid())
      in ('finance', 'admin', 'auditor', 'owner'),
    false
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (select role from public.profiles where id = auth.uid()) in ('admin', 'owner'),
    false
  );
$$;

revoke execute on function public.current_app_role() from anon;
revoke execute on function public.is_staff() from anon;
revoke execute on function public.is_privileged() from anon;
revoke execute on function public.is_admin() from anon;

-- ---------------------------------------------------------------- signup
--
-- A new auth user gets a profile automatically. The requested role is read from
-- signup metadata but DELIBERATELY clamped: self-service signup can only ever
-- produce a customer or a b2b buyer. Staff roles are granted by an admin, never
-- claimed by the person signing up — otherwise anyone could register as owner.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  requested text := new.raw_user_meta_data ->> 'role';
  granted   public.app_role;
begin
  granted := case when requested in ('customer', 'b2b') then requested::public.app_role
                  else 'customer'::public.app_role end;

  insert into public.profiles (id, email, phone, full_name_en, full_name_ar, role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'phone',
    new.raw_user_meta_data ->> 'full_name_en',
    coalesce(new.raw_user_meta_data ->> 'full_name_ar', new.raw_user_meta_data ->> 'full_name_en'),
    granted
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep a profile's own role immutable unless an admin/owner is making the change.
-- RLS alone cannot express this: a row-level UPDATE policy sees the new row, not
-- which column moved, so without this trigger a customer could PATCH role='owner'
-- through the very policy that lets them edit their own name.
create or replace function public.profiles_guard_role()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'role is granted by an administrator, not self-assigned';
  end if;

  if new.org_id is distinct from old.org_id and not public.is_admin() then
    raise exception 'organization membership is assigned by an administrator';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_guard_role_trg
  before update on public.profiles
  for each row execute function public.profiles_guard_role();

-- ---------------------------------------------------------------- RLS

alter table public.profiles      enable row level security;
alter table public.organizations enable row level security;

-- profiles ---------------------------------------------------------
create policy profiles_select_own on public.profiles
  for select to authenticated
  using (id = auth.uid());

create policy profiles_select_staff on public.profiles
  for select to authenticated
  using (public.is_staff());

-- The insert path is the trigger above; this covers a profile created
-- client-side for an already-existing auth user (it can only be their own).
create policy profiles_insert_self on public.profiles
  for insert to authenticated
  with check (id = auth.uid());

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy profiles_update_admin on public.profiles
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy profiles_delete_admin on public.profiles
  for delete to authenticated
  using (public.is_admin());

-- organizations ----------------------------------------------------
create policy organizations_select_member on public.organizations
  for select to authenticated
  using (id = (select org_id from public.profiles where id = auth.uid()));

create policy organizations_select_staff on public.organizations
  for select to authenticated
  using (public.is_staff());

create policy organizations_write_admin on public.organizations
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

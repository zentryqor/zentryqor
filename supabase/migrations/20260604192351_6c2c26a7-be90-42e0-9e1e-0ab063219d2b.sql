
-- Enums
create type public.app_role as enum ('free', 'premium', 'admin');
create type public.creator_type as enum ('video_editor', 'designer', 'content_creator', 'freelancer', 'entrepreneur', 'photographer', 'developer', 'other');
create type public.skill_level as enum ('beginner', 'intermediate', 'advanced', 'pro');

-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  email text,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "Users view own profile" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "Users update own profile" on public.profiles for update to authenticated using (auth.uid() = id);
create policy "Users insert own profile" on public.profiles for insert to authenticated with check (auth.uid() = id);

-- Creator preferences
create table public.creator_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  creator_type public.creator_type,
  niche text,
  interests text[] not null default '{}',
  platforms text[] not null default '{}',
  skill_level public.skill_level,
  goals text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.creator_preferences to authenticated;
grant all on public.creator_preferences to service_role;
alter table public.creator_preferences enable row level security;
create policy "Users manage own prefs" on public.creator_preferences for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- User roles
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "Users view own roles" on public.user_roles for select to authenticated using (auth.uid() = user_id);

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.is_premium(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role in ('premium','admin')
  )
$$;

-- Subscriptions
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  status text not null default 'inactive',
  plan text not null default 'free',
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.subscriptions to authenticated;
grant all on public.subscriptions to service_role;
alter table public.subscriptions enable row level security;
create policy "Users view own subscription" on public.subscriptions for select to authenticated using (auth.uid() = user_id);

-- Vault activity (recently viewed / continue)
create table public.vault_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  pack_slug text not null,
  pack_title text not null,
  pack_category text,
  progress numeric default 0,
  last_viewed_at timestamptz not null default now(),
  unique (user_id, pack_slug)
);
create index vault_activity_user_recent on public.vault_activity (user_id, last_viewed_at desc);
grant select, insert, update, delete on public.vault_activity to authenticated;
grant all on public.vault_activity to service_role;
alter table public.vault_activity enable row level security;
create policy "Users manage own activity" on public.vault_activity for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Updated-at trigger
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
create trigger creator_prefs_touch before update on public.creator_preferences for each row execute function public.touch_updated_at();
create trigger subscriptions_touch before update on public.subscriptions for each row execute function public.touch_updated_at();

-- New user trigger: create profile + default free role + subscription row
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role) values (new.id, 'free')
  on conflict do nothing;

  insert into public.subscriptions (user_id, status, plan) values (new.id, 'inactive', 'free')
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

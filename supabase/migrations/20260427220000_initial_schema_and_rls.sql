-- Move Nest MVP schema and membership-based security.

create extension if not exists pgcrypto;

create type public.member_role as enum ('owner', 'member');
create type public.task_status as enum ('todo', 'in_progress', 'blocked', 'done');
create type public.task_priority as enum ('low', 'medium', 'high', 'critical');
create type public.task_category as enum (
  'packing',
  'cleaning',
  'shopping',
  'admin',
  'utilities',
  'repairs',
  'donation',
  'move_day',
  'post_move'
);
create type public.task_effort as enum ('quick', 'medium', 'big');
create type public.activity_action as enum (
  'created',
  'updated',
  'completed',
  'deleted',
  'assigned',
  'seeded'
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 120),
  move_date date not null,
  current_address text not null check (char_length(trim(current_address)) > 0),
  new_address text not null check (char_length(trim(new_address)) > 0),
  timezone text not null check (char_length(trim(timezone)) between 1 and 80),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.member_role not null default 'member',
  joined_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, name)
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  room_id uuid references public.rooms(id) on delete set null,
  assignee_id uuid references auth.users(id) on delete set null,
  title text not null check (char_length(trim(title)) between 1 and 180),
  description text,
  status public.task_status not null default 'todo',
  priority public.task_priority not null default 'medium',
  category public.task_category not null default 'packing',
  due_date date,
  start_date date,
  notes text,
  estimated_effort public.task_effort not null default 'medium',
  sort_order integer not null default 0,
  created_by uuid not null references auth.users(id) on delete restrict,
  updated_by uuid references auth.users(id) on delete set null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tasks_completed_at_matches_status check (
    (status = 'done' and completed_at is not null)
    or (status <> 'done' and completed_at is null)
  ),
  constraint tasks_date_order check (
    start_date is null
    or due_date is null
    or start_date <= due_date
  )
);

create table public.subtasks (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 180),
  is_done boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  actor_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete set null,
  action public.activity_action not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index profiles_email_idx on public.profiles (lower(email));
create index workspaces_created_by_idx on public.workspaces (created_by);
create index workspaces_move_date_idx on public.workspaces (move_date);
create index workspace_members_user_workspace_idx on public.workspace_members (user_id, workspace_id);
create index workspace_members_workspace_role_idx on public.workspace_members (workspace_id, role);
create index rooms_workspace_sort_idx on public.rooms (workspace_id, sort_order, name);
create index tasks_workspace_status_due_idx on public.tasks (workspace_id, status, due_date);
create index tasks_workspace_priority_idx on public.tasks (workspace_id, priority);
create index tasks_workspace_room_idx on public.tasks (workspace_id, room_id);
create index tasks_workspace_assignee_idx on public.tasks (workspace_id, assignee_id);
create index tasks_workspace_category_idx on public.tasks (workspace_id, category);
create index tasks_workspace_sort_idx on public.tasks (workspace_id, sort_order, created_at);
create index subtasks_workspace_task_sort_idx on public.subtasks (workspace_id, task_id, sort_order);
create index activity_log_workspace_created_idx on public.activity_log (workspace_id, created_at desc);
create index activity_log_workspace_task_idx on public.activity_log (workspace_id, task_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger workspaces_set_updated_at
  before update on public.workspaces
  for each row execute function public.set_updated_at();

create trigger rooms_set_updated_at
  before update on public.rooms
  for each row execute function public.set_updated_at();

create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

create trigger subtasks_set_updated_at
  before update on public.subtasks
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    coalesce(new.email, ''),
    nullif(new.raw_user_meta_data ->> 'display_name', '')
  )
  on conflict (id) do update
    set email = excluded.email;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_workspace_member(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = target_workspace_id
      and wm.user_id = auth.uid()
  );
$$;

create or replace function public.is_workspace_owner(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = target_workspace_id
      and wm.user_id = auth.uid()
      and wm.role = 'owner'
  );
$$;

create or replace function public.can_assign_workspace_user(
  target_workspace_id uuid,
  target_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select target_user_id is null
    or exists (
      select 1
      from public.workspace_members wm
      where wm.workspace_id = target_workspace_id
        and wm.user_id = target_user_id
    );
$$;

create or replace function public.room_belongs_to_workspace(
  target_room_id uuid,
  target_workspace_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select target_room_id is null
    or exists (
      select 1
      from public.rooms r
      where r.id = target_room_id
        and r.workspace_id = target_workspace_id
    );
$$;

create or replace function public.task_belongs_to_workspace(
  target_task_id uuid,
  target_workspace_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tasks t
    where t.id = target_task_id
      and t.workspace_id = target_workspace_id
  );
$$;

create or replace function public.shares_workspace_with_user(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select target_user_id = auth.uid()
    or exists (
      select 1
      from public.workspace_members viewer
      join public.workspace_members subject
        on subject.workspace_id = viewer.workspace_id
      where viewer.user_id = auth.uid()
        and subject.user_id = target_user_id
    );
$$;

create or replace function public.ensure_task_workspace_consistency()
returns trigger
language plpgsql
as $$
begin
  if not public.room_belongs_to_workspace(new.room_id, new.workspace_id) then
    raise exception 'room_id must belong to the task workspace';
  end if;

  if not public.can_assign_workspace_user(new.workspace_id, new.assignee_id) then
    raise exception 'assignee_id must be a workspace member';
  end if;

  if not public.can_assign_workspace_user(new.workspace_id, new.updated_by) then
    raise exception 'updated_by must be a workspace member';
  end if;

  if new.status = 'done' and new.completed_at is null then
    new.completed_at = now();
  elsif new.status <> 'done' then
    new.completed_at = null;
  end if;

  return new;
end;
$$;

create trigger tasks_ensure_workspace_consistency
  before insert or update on public.tasks
  for each row execute function public.ensure_task_workspace_consistency();

create or replace function public.ensure_subtask_workspace_consistency()
returns trigger
language plpgsql
as $$
begin
  if not public.task_belongs_to_workspace(new.task_id, new.workspace_id) then
    raise exception 'task_id must belong to the subtask workspace';
  end if;

  return new;
end;
$$;

create trigger subtasks_ensure_workspace_consistency
  before insert or update on public.subtasks
  for each row execute function public.ensure_subtask_workspace_consistency();

create or replace function public.ensure_activity_workspace_consistency()
returns trigger
language plpgsql
as $$
begin
  if new.task_id is not null
    and not public.task_belongs_to_workspace(new.task_id, new.workspace_id) then
    raise exception 'task_id must belong to the activity workspace';
  end if;

  return new;
end;
$$;

create trigger activity_log_ensure_workspace_consistency
  before insert or update on public.activity_log
  for each row execute function public.ensure_activity_workspace_consistency();

create or replace function public.create_workspace_with_owner(
  p_name text,
  p_move_date date,
  p_current_address text,
  p_new_address text,
  p_timezone text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  new_workspace_id uuid;
begin
  if current_user_id is null then
    raise exception 'authentication required';
  end if;

  insert into public.profiles (id, email)
  select users.id, coalesce(users.email, '')
  from auth.users
  where users.id = current_user_id
  on conflict (id) do nothing;

  insert into public.workspaces (
    name,
    move_date,
    current_address,
    new_address,
    timezone,
    created_by
  )
  values (
    p_name,
    p_move_date,
    p_current_address,
    p_new_address,
    p_timezone,
    current_user_id
  )
  returning id into new_workspace_id;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (new_workspace_id, current_user_id, 'owner');

  insert into public.activity_log (workspace_id, actor_id, action, metadata)
  values (
    new_workspace_id,
    current_user_id,
    'created',
    jsonb_build_object('entity', 'workspace')
  );

  return new_workspace_id;
end;
$$;

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.rooms enable row level security;
alter table public.tasks enable row level security;
alter table public.subtasks enable row level security;
alter table public.activity_log enable row level security;

create policy "Users can read their own profile"
  on public.profiles for select
  to authenticated
  using (public.shares_workspace_with_user(id));

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "Members can read workspaces"
  on public.workspaces for select
  to authenticated
  using (public.is_workspace_member(id));

create policy "Owners can update workspaces"
  on public.workspaces for update
  to authenticated
  using (public.is_workspace_owner(id))
  with check (public.is_workspace_owner(id));

create policy "Owners can delete workspaces"
  on public.workspaces for delete
  to authenticated
  using (public.is_workspace_owner(id));

create policy "Members can read workspace members"
  on public.workspace_members for select
  to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "Owners can add workspace members"
  on public.workspace_members for insert
  to authenticated
  with check (public.is_workspace_owner(workspace_id));

create policy "Owners can update workspace members"
  on public.workspace_members for update
  to authenticated
  using (public.is_workspace_owner(workspace_id))
  with check (public.is_workspace_owner(workspace_id));

create policy "Owners can remove workspace members"
  on public.workspace_members for delete
  to authenticated
  using (public.is_workspace_owner(workspace_id));

create policy "Members can read rooms"
  on public.rooms for select
  to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "Members can create rooms"
  on public.rooms for insert
  to authenticated
  with check (public.is_workspace_member(workspace_id));

create policy "Members can update rooms"
  on public.rooms for update
  to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy "Members can delete rooms"
  on public.rooms for delete
  to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "Members can read tasks"
  on public.tasks for select
  to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "Members can create tasks"
  on public.tasks for insert
  to authenticated
  with check (
    public.is_workspace_member(workspace_id)
    and created_by = auth.uid()
    and public.room_belongs_to_workspace(room_id, workspace_id)
    and public.can_assign_workspace_user(workspace_id, assignee_id)
  );

create policy "Members can update tasks"
  on public.tasks for update
  to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (
    public.is_workspace_member(workspace_id)
    and public.room_belongs_to_workspace(room_id, workspace_id)
    and public.can_assign_workspace_user(workspace_id, assignee_id)
  );

create policy "Members can delete tasks"
  on public.tasks for delete
  to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "Members can read subtasks"
  on public.subtasks for select
  to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "Members can create subtasks"
  on public.subtasks for insert
  to authenticated
  with check (
    public.is_workspace_member(workspace_id)
    and public.task_belongs_to_workspace(task_id, workspace_id)
  );

create policy "Members can update subtasks"
  on public.subtasks for update
  to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (
    public.is_workspace_member(workspace_id)
    and public.task_belongs_to_workspace(task_id, workspace_id)
  );

create policy "Members can delete subtasks"
  on public.subtasks for delete
  to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "Members can read activity"
  on public.activity_log for select
  to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "Members can create activity"
  on public.activity_log for insert
  to authenticated
  with check (
    public.is_workspace_member(workspace_id)
    and actor_id = auth.uid()
    and (
      task_id is null
      or public.task_belongs_to_workspace(task_id, workspace_id)
    )
  );

revoke execute on function public.create_workspace_with_owner(text, date, text, text, text) from public;
grant execute on function public.create_workspace_with_owner(text, date, text, text, text) to authenticated;

revoke execute on function public.is_workspace_member(uuid) from public;
revoke execute on function public.is_workspace_owner(uuid) from public;
revoke execute on function public.can_assign_workspace_user(uuid, uuid) from public;
revoke execute on function public.room_belongs_to_workspace(uuid, uuid) from public;
revoke execute on function public.task_belongs_to_workspace(uuid, uuid) from public;
revoke execute on function public.shares_workspace_with_user(uuid) from public;

grant execute on function public.is_workspace_member(uuid) to authenticated;
grant execute on function public.is_workspace_owner(uuid) to authenticated;
grant execute on function public.can_assign_workspace_user(uuid, uuid) to authenticated;
grant execute on function public.room_belongs_to_workspace(uuid, uuid) to authenticated;
grant execute on function public.task_belongs_to_workspace(uuid, uuid) to authenticated;
grant execute on function public.shares_workspace_with_user(uuid) to authenticated;
